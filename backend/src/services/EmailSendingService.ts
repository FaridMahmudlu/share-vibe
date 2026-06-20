import { brevoService } from "./BrevoService";
import { limitService } from "./LimitService";
import { emailQueue } from "../queue/emailQueue";
import { randomUUID } from "crypto";
import { logServerError } from "../utils/errors";
import { prisma } from "../config/prisma";

interface SendCampaignPayload {
  campaignId: string;
  cafeId: string;
  recipientEmails?: string[]; // If not provided, use all cafe customers
}

interface ScheduleCampaignPayload extends SendCampaignPayload {
  scheduledAt: Date;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class EmailSendingService {
  async validateCampaign(campaignId: string): Promise<ValidationResult> {
    const errors: string[] = [];

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      errors.push("Campaign not found");
      return { valid: false, errors };
    }

    if (!campaign.subject || !campaign.htmlContent || !campaign.textContent) {
      errors.push("Campaign missing required fields: subject, htmlContent, textContent");
    }

    if (campaign.subject.length > 200) {
      errors.push("Subject too long (max 200 chars)");
    }

    // Spam filter: check for suspicious patterns
    const suspiciousPatterns = ["viagra", "casino", "lottery", "http://"];
    const content = (campaign.subject + campaign.htmlContent).toLowerCase();
    for (const pattern of suspiciousPatterns) {
      if (content.includes(pattern)) {
        errors.push(`Content detected as potential spam (${pattern})`);
      }
    }

    // Check link density (prevent spam-like excessive links)
    const linkCount = (campaign.htmlContent.match(/<a\s/gi) || []).length;
    if (linkCount > 20) {
      errors.push("Too many links in content (max 20)");
    }

    return { valid: errors.length === 0, errors };
  }

  async filterUnsubscribed(
    cafeId: string,
    emails: string[]
  ): Promise<string[]> {
    const unsubscribed = await prisma.unsubscribedEmail.findMany({
      where: {
        cafeId,
        email: { in: emails },
      },
      select: { email: true },
    });

    const unsubscribedSet = new Set(unsubscribed.map((u) => u.email));
    return emails.filter((email) => !unsubscribedSet.has(email));
  }

  async filterDuplicates(
    campaignId: string,
    emails: string[]
  ): Promise<string[]> {
    const existing = await prisma.emailRecipient.findMany({
      where: {
        campaignId,
        email: { in: emails },
      },
      select: { email: true },
    });

    const existingSet = new Set(existing.map((e) => e.email));
    return emails.filter((email) => !existingSet.has(email));
  }

  async filterSubscribedCustomers(
    cafeId: string,
    emails: string[]
  ): Promise<string[]> {
    const subscribedCustomers = await prisma.customer.findMany({
      where: {
        cafeId,
        email: { in: emails },
        emailSubscribed: true,
      },
      select: { email: true },
    });

    const subscribedSet = new Set(
      subscribedCustomers.map((customer) => customer.email.trim().toLowerCase())
    );

    return emails.filter((email) => subscribedSet.has(email));
  }

  async sendCampaign(payload: SendCampaignPayload): Promise<{
    success: boolean;
    message: string;
    recipientCount?: number;
    errors?: string[];
  }> {
    const { campaignId, cafeId, recipientEmails } = payload;

    // 1. Validation
    const validationResult = await this.validateCampaign(campaignId);
    if (!validationResult.valid) {
      return {
        success: false,
        message: "Campaign validation failed",
        errors: validationResult.errors,
      };
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return {
        success: false,
        message: "Campaign not found",
      };
    }

    if (["completed", "sending", "archived"].includes(campaign.status)) {
      return {
        success: false,
        message: `Campaign cannot be sent while in ${campaign.status} status`,
      };
    }

    const existingPendingRecipients = await prisma.emailRecipient.findMany({
      where: {
        campaignId,
        status: "pending",
      },
      select: { email: true },
    });
    let shouldUseExistingRecipients =
      (!recipientEmails || recipientEmails.length === 0) &&
      existingPendingRecipients.length > 0;

    // Get recipients
    let emails: string[];

    if (shouldUseExistingRecipients) {
      emails = existingPendingRecipients.map((recipient) => recipient.email);
    } else if (recipientEmails && recipientEmails.length > 0) {
      emails = recipientEmails;
    } else {
      // Get all customers from cafe
      const customers = await prisma.customer.findMany({
        where: { cafeId, emailSubscribed: true },
        select: { email: true },
      });
      emails = customers.map((c) => c.email);
    }

    emails = Array.from(
      new Set(
        emails
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
      )
    );

    if (emails.length === 0) {
      return {
        success: false,
        message: "No recipients found",
      };
    }

    const emailsBeforeSubscriptionFilter = emails;
    emails = await this.filterSubscribedCustomers(cafeId, emails);
    const blockedSubscriptionEmails = emailsBeforeSubscriptionFilter.filter(
      (email) => !emails.includes(email)
    );

    if (blockedSubscriptionEmails.length > 0) {
      await prisma.emailRecipient.updateMany({
        where: {
          campaignId,
          email: { in: blockedSubscriptionEmails },
          status: "pending",
        },
        data: {
          status: "blocked",
          failureReason: "Not subscribed",
        },
      });
    }

    if (emails.length === 0) {
      return {
        success: false,
        message: "No subscribed recipients found",
      };
    }

    // 2. Filter unsubscribed
    emails = await this.filterUnsubscribed(cafeId, emails);
    if (emails.length === 0) {
      return {
        success: false,
        message: "All recipients are unsubscribed",
      };
    }

    // 3. Filter duplicates for new sends. Scheduled sends already have pending records.
    if (!shouldUseExistingRecipients) {
      const nonDuplicateEmails = await this.filterDuplicates(campaignId, emails);
      if (nonDuplicateEmails.length === 0 && existingPendingRecipients.length > 0) {
        shouldUseExistingRecipients = true;
        emails = existingPendingRecipients.map((recipient) => recipient.email);
      } else if (nonDuplicateEmails.length === 0) {
        return {
          success: false,
          message: "All recipients already have records in this campaign",
        };
      } else {
        emails = nonDuplicateEmails;
      }
    }

    // 4. Campaign limit check
    const campaignLimitCheck = await limitService.checkCampaignLimit(
      emails.length
    );
    if (!campaignLimitCheck.allowed) {
      return {
        success: false,
        message: campaignLimitCheck.reason || "Campaign limit exceeded",
      };
    }

    // 5. Global limit check
    const globalSent = await limitService.getGlobalSentToday();
    const globalCheck = await limitService.checkGlobalLimit(globalSent);
    if (!globalCheck.allowed || globalCheck.remaining < emails.length) {
      return {
        success: false,
        message: `Global daily limit reached (${this.globalDailyLimit}/day)`,
      };
    }

    // 6. Cafe limit check
    const cafeCheck = await limitService.checkCafeLimit(cafeId, emails.length);
    if (!cafeCheck.allowed) {
      return {
        success: false,
        message: `Cafe daily limit reached (${this.perCafeDailyLimit}/day)`,
      };
    }

    // 7. Create recipient records (all at once, atomic operation)
    try {
      let queuedEmails = emails;
      let recipientCount = emails.length;

      if (!shouldUseExistingRecipients) {
        const customers = await prisma.customer.findMany({
          where: { cafeId, email: { in: emails }, emailSubscribed: true },
          select: { id: true, email: true },
        });

        const customerMap = new Map(
          customers.map((c) => [c.email.trim().toLowerCase(), c.id])
        );

        const recipientData = emails
          .filter((email) => customerMap.has(email))
          .map((email) => ({
            id: randomUUID(),
            campaignId,
            customerId: customerMap.get(email)!,
            email,
            status: "pending" as const,
          }));

        if (recipientData.length === 0) {
          return {
            success: false,
            message: "No valid customers found for recipients",
          };
        }

        await prisma.emailRecipient.createMany({
          data: recipientData,
          skipDuplicates: true,
        });

        queuedEmails = recipientData.map((recipient) => recipient.email);
        recipientCount = recipientData.length;
      }

      // 8. Update campaign recipient count
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          recipientCount,
          sentCount: 0,
          failedCount: 0,
          status: "sending",
          sentAt: new Date(),
        },
      });

      await prisma.customer.updateMany({
        where: { cafeId, email: { in: queuedEmails } },
        data: {
          lastInteractionAt: new Date(),
          lastInteractionType: "campaign_sent",
        },
      });

      // 9. Queue emails for sending
      for (const email of queuedEmails) {
        await emailQueue.add(
          "send-email",
          {
            campaignId,
            cafeId,
            email,
          },
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 2000,
            },
            removeOnComplete: true,
          }
        );
      }

      // 10. Increment limits
      await limitService.incrementGlobalLimit(queuedEmails.length);
      await limitService.incrementCafeLimit(cafeId, queuedEmails.length);

      return {
        success: true,
        message: `Campaign queued successfully`,
        recipientCount: queuedEmails.length,
      };
    } catch (error: any) {
      logServerError("Error queuing campaign:", error);
      return {
        success: false,
        message: process.env.NODE_ENV === "production" ? "Failed to queue campaign" : "Failed to queue campaign: " + error.message,
      };
    }
  }

  async scheduleCampaign(payload: ScheduleCampaignPayload): Promise<{
    success: boolean;
    message: string;
    recipientCount?: number;
    scheduledAt?: string;
    errors?: string[];
  }> {
    const { campaignId, cafeId, recipientEmails, scheduledAt } = payload;

    if (scheduledAt.getTime() <= Date.now()) {
      return {
        success: false,
        message: "Scheduled time must be in the future",
      };
    }

    const validationResult = await this.validateCampaign(campaignId);
    if (!validationResult.valid) {
      return {
        success: false,
        message: "Campaign validation failed",
        errors: validationResult.errors,
      };
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return {
        success: false,
        message: "Campaign not found",
      };
    }

    if (!["draft", "scheduled"].includes(campaign.status)) {
      return {
        success: false,
        message: `Campaign cannot be scheduled while in ${campaign.status} status`,
      };
    }

    let emails: string[];

    if (recipientEmails && recipientEmails.length > 0) {
      emails = recipientEmails;
    } else {
      const customers = await prisma.customer.findMany({
        where: { cafeId, emailSubscribed: true },
        select: { email: true },
      });
      emails = customers.map((customer) => customer.email);
    }

    emails = Array.from(
      new Set(
        emails
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
      )
    );

    if (emails.length === 0) {
      return {
        success: false,
        message: "No recipients found",
      };
    }

    emails = await this.filterSubscribedCustomers(cafeId, emails);
    if (emails.length === 0) {
      return {
        success: false,
        message: "No subscribed recipients found",
      };
    }

    emails = await this.filterUnsubscribed(cafeId, emails);
    if (emails.length === 0) {
      return {
        success: false,
        message: "All recipients are unsubscribed",
      };
    }

    const campaignLimitCheck = await limitService.checkCampaignLimit(
      emails.length
    );
    if (!campaignLimitCheck.allowed) {
      return {
        success: false,
        message: campaignLimitCheck.reason || "Campaign limit exceeded",
      };
    }

    const customers = await prisma.customer.findMany({
      where: { cafeId, email: { in: emails }, emailSubscribed: true },
      select: { id: true, email: true },
    });
    const customerMap = new Map(
      customers.map((customer) => [
        customer.email.trim().toLowerCase(),
        customer.id,
      ])
    );

    const recipientData = emails
      .filter((email) => customerMap.has(email))
      .map((email) => ({
        id: randomUUID(),
        campaignId,
        customerId: customerMap.get(email)!,
        email,
        status: "pending" as const,
      }));

    if (recipientData.length === 0) {
      return {
        success: false,
        message: "No valid customers found for recipients",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.emailRecipient.deleteMany({
        where: {
          campaignId,
          status: "pending",
        },
      });

      await tx.emailRecipient.createMany({
        data: recipientData,
        skipDuplicates: true,
      });

      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          recipientCount: recipientData.length,
          sentCount: 0,
          failedCount: 0,
          status: "scheduled",
          scheduledAt,
          sentAt: null,
        },
      });
    });

    return {
      success: true,
      message: "Campaign scheduled successfully",
      recipientCount: recipientData.length,
      scheduledAt: scheduledAt.toISOString(),
    };
  }

  async processDueScheduledCampaigns(now = new Date()): Promise<{
    processed: number;
  }> {
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: "scheduled",
        scheduledAt: { lte: now },
        recipientCount: { gt: 0 },
      },
      select: {
        id: true,
        cafeId: true,
      },
      take: 20,
    });

    let processed = 0;

    for (const campaign of campaigns) {
      const result = await this.sendCampaign({
        campaignId: campaign.id,
        cafeId: campaign.cafeId,
      });

      if (result.success) {
        processed += 1;
      }
    }

    return { processed };
  }

  private globalDailyLimit = parseInt(process.env.GLOBAL_DAILY_LIMIT || "280");
  private perCafeDailyLimit = parseInt(process.env.PER_CAFE_DAILY_LIMIT || "50");
}

export const emailSendingService = new EmailSendingService();

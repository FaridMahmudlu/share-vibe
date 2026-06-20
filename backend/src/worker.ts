import { Worker, Job } from "bullmq";
import { brevoService } from "./services/BrevoService";
import { logServerError } from "./utils/errors";
import { prisma } from "./config/prisma";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new URL(redisUrl);
const redisConnection = {
  host: connection.hostname,
  port: parseInt(connection.port || "6379"),
  password: connection.password || undefined,
};

interface EmailJob {
  campaignId: string;
  cafeId: string;
  email: string;
}

const refreshCampaignStatus = async (campaignId: string) => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      recipientCount: true,
      sentAt: true,
    },
  });

  if (!campaign) {
    return;
  }

  const [sentCount, failedCount, blockedCount, processedCount] = await Promise.all([
    prisma.emailRecipient.count({ where: { campaignId, status: "sent" } }),
    prisma.emailRecipient.count({ where: { campaignId, status: "failed" } }),
    prisma.emailRecipient.count({ where: { campaignId, status: "blocked" } }),
    prisma.emailRecipient.count({
      where: {
        campaignId,
        status: { in: ["sent", "failed", "blocked"] },
      },
    }),
  ]);

  let nextStatus: string = "sending";
  if (campaign.recipientCount > 0 && processedCount >= campaign.recipientCount) {
    nextStatus = sentCount > 0 ? "completed" : "failed";
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: nextStatus,
      sentCount,
      failedCount: failedCount + blockedCount,
      ...(campaign.sentAt ? {} : { sentAt: new Date() }),
    },
  });
};

const worker = new Worker<EmailJob>(
  "email-sending",
  async (job: Job<EmailJob>) => {
    const { campaignId, cafeId, email } = job.data;

    try {
      // Fetch campaign and customer info
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      const cafe = await prisma.cafe.findUnique({
        where: { id: cafeId },
      });

      if (!cafe) {
        throw new Error("Cafe not found");
      }

      // Validate email
      const isValid = await brevoService.validateEmail(email);
      if (!isValid) {
        throw new Error("Invalid email format");
      }

      // Check if unsubscribed
      const unsubscribed = await prisma.unsubscribedEmail.findUnique({
        where: {
          cafeId_email: {
            cafeId,
            email,
          },
        },
      });

      if (unsubscribed) {
        // Mark as blocked instead of sending
        await prisma.emailRecipient.updateMany({
          where: {
            campaignId,
            email,
          },
          data: {
            status: "blocked",
            failureReason: "Unsubscribed",
          },
        });

        await refreshCampaignStatus(campaignId);

        return { skipped: true, reason: "unsubscribed" };
      }

      const subscribedCustomer = await prisma.customer.findUnique({
        where: {
          cafeId_email: {
            cafeId,
            email,
          },
        },
        select: { emailSubscribed: true },
      });

      if (!subscribedCustomer?.emailSubscribed) {
        await prisma.emailRecipient.updateMany({
          where: {
            campaignId,
            email,
          },
          data: {
            status: "blocked",
            failureReason: "Not subscribed",
          },
        });

        await refreshCampaignStatus(campaignId);

        return { skipped: true, reason: "not_subscribed" };
      }

      // Send email via Brevo
      const result = await brevoService.sendEmail(
        email,
        campaign.subject,
        campaign.htmlContent,
        campaign.textContent,
        cafe.supportEmail || undefined
      );

      // Update recipient status
      await prisma.emailRecipient.updateMany({
        where: {
          campaignId,
          email,
        },
        data: {
          status: "sent",
          brevoMessageId: result.messageId,
          sentAt: new Date(),
        },
      });

      // Log email send
      await prisma.emailLog.create({
        data: {
          campaignId,
          cafeId,
          email,
          status: "sent",
          brevoMessageId: result.messageId,
          brevoResponse: result,
        },
      });

      await refreshCampaignStatus(campaignId);

      return { sent: true, messageId: result.messageId };
    } catch (error: any) {
      const errorMessage = error.message || "Unknown error";

      // Update recipient status to failed
      await prisma.emailRecipient.updateMany({
        where: {
          campaignId,
          email: job.data.email,
        },
        data: {
          status: "failed",
          failureReason: errorMessage,
        },
      });

      // Log failure
      await prisma.emailLog.create({
        data: {
          campaignId,
          cafeId,
          email: job.data.email,
          status: "failed",
          brevoResponse: { error: errorMessage },
        },
      });

      await refreshCampaignStatus(campaignId);

      throw error;
    }
  },
  {
    connection: redisConnection as any,
    concurrency: 5, // Process 5 emails simultaneously
    limiter: {
      max: 1, // Max 1 email
      duration: 1000, // Per second (rate limiting)
    },
  }
);

worker.on("completed", (job) => {
  console.log(`вњ“ Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  logServerError(`Job ${job?.id} failed:`, err);
});

worker.on("error", (err) => {
  logServerError("Worker error:", err);
});

export { worker };

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Worker shutting down...");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

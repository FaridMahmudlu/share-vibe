import { Router, Response } from "express";
import {
  AuthRequest,
  authMiddleware,
  cafeAuthMiddleware,
  campaignOwnershipMiddleware,
} from "../middleware/auth";
import { decorateCampaignsWithStats } from "../services/CampaignStatsService";
import { emailSendingService } from "../services/EmailSendingService";
import { requireMailMarketingPlan } from "../utils/plans";
import { getPublicErrorMessage, logServerError } from "../utils/errors";
import { prisma } from "../config/prisma";

const router = Router();

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const plainTextToHtml = (value: string) =>
  value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p style="margin:0 0 16px;">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");

const parseOptionalDate = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildMarketingEmailContent = ({
  subject,
  description,
  imageUrl,
  textContent,
  sourceCampaignTitle,
  sourceCampaignUrl,
}: {
  subject: string;
  description: string;
  imageUrl: string;
  textContent: string;
  sourceCampaignTitle: string;
  sourceCampaignUrl: string;
}) => {
  const headline = sourceCampaignTitle || subject;
  const bodyText =
    textContent ||
    [
      "Merhaba,",
      description || `${headline} kampanyasını sizinle paylaşmak istiyoruz.`,
      sourceCampaignUrl ? `Kampanyayı incelemek için: ${sourceCampaignUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  const imageHtml = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="" style="width:100%;max-height:280px;object-fit:cover;border-radius:18px;display:block;margin:0 0 24px;" />`
    : "";
  const ctaHtml = sourceCampaignUrl
    ? `<a href="${escapeHtml(sourceCampaignUrl)}" style="display:inline-block;margin-top:8px;padding:14px 20px;border-radius:14px;background:#c67b4d;color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;">Kampanyayı İncele</a>`
    : "";

  return {
    htmlContent: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;background:#f4eee8;font-family:Arial,Helvetica,sans-serif;color:#241c17;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4eee8;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fffaf5;border:1px solid #ead8c8;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:26px 28px 30px;">
                <div style="font-size:28px;line-height:1.15;color:#211914;font-weight:900;margin-bottom:18px;">${escapeHtml(headline)}</div>
                ${imageHtml}
                <div style="font-size:15px;line-height:1.7;color:#4c4139;">${plainTextToHtml(bodyText)}</div>
                ${ctaHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    textContent: bodyText,
  };
};

const buildCampaignPayload = (body: any) => {
  const subject = normalizeString(body.subject);
  const description = normalizeString(body.description);
  const imageUrl = normalizeString(body.imageUrl);
  const sourceCampaignTitle = normalizeString(body.sourceCampaignTitle);
  const sourceCampaignUrl = normalizeString(body.sourceCampaignUrl);
  let htmlContent = normalizeString(body.htmlContent);
  let textContent = normalizeString(body.textContent);
  const scheduledAt = parseOptionalDate(body.scheduledAt);

  if ((!htmlContent || !textContent) && (sourceCampaignTitle || sourceCampaignUrl)) {
    const generated = buildMarketingEmailContent({
      subject,
      description,
      imageUrl,
      textContent,
      sourceCampaignTitle,
      sourceCampaignUrl,
    });

    htmlContent = htmlContent || generated.htmlContent;
    textContent = textContent || generated.textContent;
  }

  return {
    subject,
    description,
    imageUrl,
    htmlContent,
    textContent,
    scheduledAt,
  };
};

const validateCampaignPayload = ({
  subject,
  htmlContent,
  textContent,
  imageUrl,
}: {
  subject: string;
  description?: string;
  imageUrl?: string;
  htmlContent: string;
  textContent: string;
}) => {
  const errors: string[] = [];

  if (!subject) {
    errors.push("Subject is required");
  }

  if (!htmlContent) {
    errors.push("HTML content is required");
  }

  if (!textContent) {
    errors.push("Text content is required");
  }

  if (subject.length > 200) {
    errors.push("Subject must be 200 characters or less");
  }

  if (textContent.length > 6000) {
    errors.push("Text content must be 6000 characters or less");
  }

  if (imageUrl) {
    try {
      const parsed = new URL(imageUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        errors.push("Image URL must use http or https");
      }
    } catch {
      errors.push("Image URL is invalid");
    }
  }

  return errors;
};

// Create campaign
router.post(
  "/campaigns",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { subject, description, imageUrl, htmlContent, textContent, scheduledAt } =
        buildCampaignPayload(req.body);
      const cafeId = req.cafeId;
      const userId = req.userId;
      if (!(await requireMailMarketingPlan(prisma, cafeId, res))) {
        return;
      }
      const errors = validateCampaignPayload({
        subject,
        description,
        imageUrl,
        htmlContent,
        textContent,
      });

      if (errors.length > 0) {
        return res.status(400).json({
          error: errors.join("; "),
        });
      }

      const campaign = await prisma.campaign.create({
        data: {
          subject,
          description: description || null,
          imageUrl: imageUrl || null,
          htmlContent,
          textContent,
          status: scheduledAt ? "scheduled" : "draft",
          scheduledAt,
          cafeId: cafeId!,
          createdBy: userId!,
        },
      });

      const [decoratedCampaign] = await decorateCampaignsWithStats([campaign]);

      return res.status(201).json(decoratedCampaign);
    } catch (error: any) {
      logServerError("Error creating campaign:", error);
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to create campaign", error) });
    }
  }
);

// Get campaign
router.get(
  "/campaigns/:campaignId",
  authMiddleware,
  campaignOwnershipMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const campaignId = req.params.campaignId;
      if (!(await requireMailMarketingPlan(prisma, req.cafeId, res))) {
        return;
      }

      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          recipients: {
            select: {
              email: true,
              status: true,
              failureReason: true,
              sentAt: true,
            },
          },
        },
      });

      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      const [decoratedCampaign] = await decorateCampaignsWithStats([
        campaign as any,
      ], { persist: true });

      return res.json(decoratedCampaign);
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to fetch campaign", error) });
    }
  }
);

// List campaigns for cafe
router.get(
  "/cafes/:cafeId/campaigns",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId;
      if (!(await requireMailMarketingPlan(prisma, cafeId, res))) {
        return;
      }
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = parseInt(req.query.skip as string) || 0;

      const rawCampaigns = await prisma.campaign.findMany({
        where: { cafeId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          creator: { select: { name: true, email: true } },
          _count: { select: { recipients: true } },
        },
      });

      const campaigns = await decorateCampaignsWithStats(rawCampaigns, {
        persist: true,
      });

      const total = await prisma.campaign.count({
        where: { cafeId, status: { notIn: ["archived", "failed"] } },
      });

      return res.json({ campaigns, total });
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to fetch campaigns", error) });
    }
  }
);

// Send campaign
router.post(
  "/campaigns/:campaignId/send",
  authMiddleware,
  campaignOwnershipMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const campaignId = req.params.campaignId;
      const cafeId = req.cafeId;
      if (!(await requireMailMarketingPlan(prisma, cafeId, res))) {
        return;
      }
      const recipientEmails = Array.isArray(req.body?.recipientEmails)
        ? req.body.recipientEmails
        : [];
      const [campaign] = await decorateCampaignsWithStats(
        [
          await prisma.campaign.findUniqueOrThrow({
            where: { id: campaignId },
            include: { _count: { select: { recipients: true } } },
          }),
        ],
        { persist: true }
      );

      if (campaign.status === "completed") {
        return res.status(400).json({
          success: false,
          message: "Campaign has already been sent",
        });
      }

      if (campaign.status === "sending") {
        return res.status(400).json({
          success: false,
          message: "Campaign is already being sent",
        });
      }

      if (campaign.status === "archived") {
        return res.status(400).json({
          success: false,
          message: "Archived campaigns cannot be sent",
        });
      }

      const result = await emailSendingService.sendCampaign({
        campaignId,
        cafeId: cafeId!,
        recipientEmails,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (error: any) {
      logServerError("Error sending campaign:", error);
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to send campaign", error) });
    }
  }
);

router.post(
  "/campaigns/:campaignId/schedule",
  authMiddleware,
  campaignOwnershipMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const campaignId = req.params.campaignId;
      const cafeId = req.cafeId;
      if (!(await requireMailMarketingPlan(prisma, cafeId, res))) {
        return;
      }
      const recipientEmails = Array.isArray(req.body?.recipientEmails)
        ? req.body.recipientEmails
        : [];
      const scheduledAt = parseOptionalDate(req.body?.scheduledAt);

      if (!scheduledAt) {
        return res.status(400).json({
          success: false,
          message: "Valid scheduledAt is required",
        });
      }

      const result = await emailSendingService.scheduleCampaign({
        campaignId,
        cafeId: cafeId!,
        recipientEmails,
        scheduledAt,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (error: any) {
      logServerError("Error scheduling campaign:", error);
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to schedule campaign", error) });
    }
  }
);

// Update campaign (only draft campaigns)
router.patch(
  "/campaigns/:campaignId",
  authMiddleware,
  campaignOwnershipMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const campaignId = req.params.campaignId;
      if (!(await requireMailMarketingPlan(prisma, req.cafeId, res))) {
        return;
      }
      const payload = buildCampaignPayload(req.body);
      const errors = validateCampaignPayload(payload);

      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join("; ") });
      }

      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      if (!["draft", "scheduled"].includes(campaign.status)) {
        return res.status(400).json({
          error: "Only draft or scheduled campaigns can be edited",
        });
      }

      const updated = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          subject: payload.subject,
          description: payload.description || null,
          imageUrl: payload.imageUrl || null,
          htmlContent: payload.htmlContent,
          textContent: payload.textContent,
          scheduledAt: payload.scheduledAt,
          status: payload.scheduledAt ? "scheduled" : "draft",
        },
      });

      const [decoratedCampaign] = await decorateCampaignsWithStats([updated]);

      return res.json(decoratedCampaign);
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to update campaign", error) });
    }
  }
);

// Delete campaign
router.delete(
  "/campaigns/:campaignId",
  authMiddleware,
  campaignOwnershipMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const campaignId = req.params.campaignId;
      if (!(await requireMailMarketingPlan(prisma, req.cafeId, res))) {
        return;
      }

      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      await prisma.campaign.delete({ where: { id: campaignId } });

      return res.json({ message: "Campaign deleted" });
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to delete campaign", error) });
    }
  }
);

router.post(
  "/campaigns/:campaignId/archive",
  authMiddleware,
  campaignOwnershipMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const campaignId = req.params.campaignId;
      if (!(await requireMailMarketingPlan(prisma, req.cafeId, res))) {
        return;
      }

      const campaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "archived" },
        include: {
          creator: { select: { name: true, email: true } },
          _count: { select: { recipients: true } },
        },
      });

      const [decoratedCampaign] = await decorateCampaignsWithStats([campaign]);

      return res.json(decoratedCampaign);
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to archive campaign", error) });
    }
  }
);

router.post(
  "/campaigns/:campaignId/restore",
  authMiddleware,
  campaignOwnershipMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const campaignId = req.params.campaignId;
      if (!(await requireMailMarketingPlan(prisma, req.cafeId, res))) {
        return;
      }

      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      if (campaign.status !== "archived") {
        return res.status(400).json({
          error: "Only archived campaigns can be restored",
        });
      }

      const restored = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: "draft",
          scheduledAt: null,
        },
        include: {
          creator: { select: { name: true, email: true } },
          _count: { select: { recipients: true } },
        },
      });

      const [decoratedCampaign] = await decorateCampaignsWithStats([restored]);

      return res.json(decoratedCampaign);
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to restore campaign", error) });
    }
  }
);

export default router;

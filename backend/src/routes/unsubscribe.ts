import { Router, Response } from "express";
import { timingSafeEqual } from "crypto";
import { unsubscribeService } from "../services/UnsubscribeService";
import { logServerError } from "../utils/errors";
import { prisma } from "../config/prisma";

const router = Router();

const failureEvents = new Set([
  "bounce",
  "hardBounce",
  "hard_bounce",
  "softBounce",
  "soft_bounce",
  "blocked",
  "invalid",
  "spam",
  "complaint",
]);
const complaintEvents = new Set(["spam", "complaint"]);
const openEvents = new Set(["opened", "uniqueOpened", "unique_opened"]);
const clickEvents = new Set(["click", "clicked"]);

const normalizeWebhookEventName = (event: unknown) =>
  typeof event === "string" ? event.trim() : "";

const getWebhookMessageId = (event: Record<string, any>) =>
  String(
    event.messageId ??
      event["message-id"] ??
      event["Message-ID"] ??
      event.message_id ??
      event.message_id_header ??
      ""
  ).trim();

const normalizeMessageId = (value: unknown) =>
  String(value ?? "")
    .trim()
    .replace(/^<+/, "")
    .replace(/>+$/, "")
    .toLowerCase();

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isBrevoWebhookAuthorized = (req: any) => {
  const configuredToken = process.env.BREVO_WEBHOOK_TOKEN?.trim();

  if (!configuredToken) {
    return process.env.NODE_ENV !== "production";
  }

  const providedToken = String(
    req.headers["x-sharevibe-webhook-token"] || req.query.token || ""
  ).trim();

  const configured = Buffer.from(configuredToken);
  const provided = Buffer.from(providedToken);

  return configured.length === provided.length && timingSafeEqual(configured, provided);
};

const getMessageIdCandidates = (messageId: string) => {
  const normalized = normalizeMessageId(messageId);
  return Array.from(
    new Set(
      [messageId.trim(), normalized, normalized ? `<${normalized}>` : ""].filter(Boolean)
    )
  );
};

const getWebhookEmail = (event: Record<string, any>) =>
  String(event.email ?? event.recipient ?? "").trim().toLowerCase();

const getFailureReason = (eventName: string, event: Record<string, any>) =>
  `${eventName}: ${event.reason || event.details || "delivery issue"}`;

const findSourceLog = async ({
  email,
  messageId,
}: {
  email: string;
  messageId: string;
}) => {
  const candidates = getMessageIdCandidates(messageId);

  if (candidates.length > 0) {
    const exactLog = await prisma.emailLog.findFirst({
      where: { brevoMessageId: { in: candidates } },
      orderBy: { createdAt: "asc" },
    });

    if (exactLog) {
      return exactLog;
    }
  }

  if (!email) {
    return null;
  }

  const fallbackStart = new Date();
  fallbackStart.setDate(fallbackStart.getDate() - 45);

  return prisma.emailLog.findFirst({
    where: {
      email,
      status: "sent",
      createdAt: { gte: fallbackStart },
    },
    orderBy: { createdAt: "desc" },
  });
};

const recordEngagementEvent = async ({
  status,
  email,
  messageId,
  payload,
}: {
  status: "opened" | "clicked";
  email: string;
  messageId: string;
  payload: Record<string, any>;
}) => {
  if (!email) {
    return;
  }

  const sourceLog = await findSourceLog({ email, messageId });

  if (!sourceLog) {
    return;
  }

  const storedMessageId = sourceLog.brevoMessageId || messageId || null;
  const existingLog = await prisma.emailLog.findFirst({
    where: {
      campaignId: sourceLog.campaignId,
      email,
      status,
      ...(storedMessageId ? { brevoMessageId: storedMessageId } : {}),
    },
  });

  if (existingLog) {
    return;
  }

  await prisma.emailLog.create({
    data: {
      campaignId: sourceLog.campaignId,
      cafeId: sourceLog.cafeId,
      email,
      status,
      brevoMessageId: storedMessageId,
      brevoResponse: payload,
    },
  });

  await prisma.customer.updateMany({
    where: { cafeId: sourceLog.cafeId, email },
    data: {
      lastInteractionAt: new Date(),
      lastInteractionType: status === "opened" ? "email_open" : "email_click",
    },
  });
};

// Public unsubscribe endpoint
router.get(
  "/unsubscribe/:token",
  async (req: any, res: Response) => {
    try {
      const token = req.params.token;
      const email = req.query.email as string;

      if (!email) {
        return res.status(400).json({ error: "Email parameter required" });
      }

      const result = await unsubscribeService.verifyAndUnsubscribe(
        token,
        email
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Return simple HTML confirmation
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Unsubscribe Confirmed</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .container { max-width: 500px; margin: 0 auto; }
              h1 { color: #4CAF50; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✓ Unsubscribed Successfully</h1>
              <p>You have been unsubscribed from this mailing list.</p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                You will no longer receive emails to ${escapeHtml(email)}
              </p>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      return res.status(500).json({
        error: process.env.NODE_ENV === "production" ? "Unsubscribe failed" : "Unsubscribe failed: " + error.message,
      });
    }
  }
);

// Webhook for Brevo bounces/complaints
router.post(
  "/webhooks/brevo",
  async (req: any, res: Response) => {
    try {
      if (!isBrevoWebhookAuthorized(req)) {
        return res.status(401).json({ error: "Invalid webhook authentication" });
      }

      const events = Array.isArray(req.body) ? req.body : [req.body];

      if (events.length > 100) {
        return res.status(400).json({ error: "Too many webhook events" });
      }

      for (const rawEvent of events) {
        const event = (rawEvent ?? {}) as Record<string, any>;
        const eventName = normalizeWebhookEventName(event.event);
        const email = getWebhookEmail(event);
        const messageId = getWebhookMessageId(event);

        if (failureEvents.has(eventName)) {
          const log = await findSourceLog({ email, messageId });

          if (log) {
            await prisma.emailRecipient.updateMany({
              where: { campaignId: log.campaignId, email },
              data: {
                status: "failed",
                failureReason: getFailureReason(eventName, event),
              },
            });

            await prisma.customer.updateMany({
              where: { cafeId: log.cafeId, email },
              data: {
                lastInteractionAt: new Date(),
                lastInteractionType: complaintEvents.has(eventName) ? "email_click" : "campaign_sent",
              },
            });

            if (complaintEvents.has(eventName)) {
              const token = await unsubscribeService.generateUnsubscribeToken();
              await unsubscribeService.createUnsubscribe(
                log.cafeId,
                email,
                token
              );
            }
          }
        } else if (openEvents.has(eventName)) {
          await recordEngagementEvent({
            status: "opened",
            email,
            messageId,
            payload: event,
          });
        } else if (clickEvents.has(eventName)) {
          await recordEngagementEvent({
            status: "clicked",
            email,
            messageId,
            payload: event,
          });
        }
      }

      return res.json({ received: true, count: events.length });
    } catch (error: any) {
      logServerError("Webhook processing failed:", error);
      return res.status(500).json({
        error: process.env.NODE_ENV === "production" ? "Webhook processing failed" : error.message,
      });
    }
  }
);

export default router;

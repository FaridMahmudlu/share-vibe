import express from "express";
import cors from "cors";
import helmet from "helmet";
import campaignRoutes from "./routes/campaigns";
import customerRoutes from "./routes/customers";
import qrRoutes from "./routes/qr";
import unsubscribeRoutes from "./routes/unsubscribe";
import analyticsRoutes from "./routes/analytics";
import templateRoutes from "./routes/templates";
import settingsRoutes from "./routes/settings";
import accessPolicyRoutes from "./routes/accessPolicy";
import sessionRoutes from "./routes/session";
import securityRoutes from "./routes/security";
import { emailQueue } from "./queue/emailQueue";
import { emailSendingService } from "./services/EmailSendingService";
import { validateBackendEnv } from "./config/env";
import { createRateLimit } from "./middleware/rateLimit";
import { getPublicErrorMessage, logServerError } from "./utils/errors";

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === "production";
const allowedProductionOrigins = ["https://sharevibe.co", "https://www.sharevibe.co"];
const allowedDevelopmentOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];
const configuredCorsOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set(
  isProduction
    ? configuredCorsOrigins.length > 0
      ? configuredCorsOrigins
      : allowedProductionOrigins
    : [...allowedProductionOrigins, ...allowedDevelopmentOrigins, ...configuredCorsOrigins]
);

validateBackendEnv();

// Middleware
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({
  hsts: isProduction
    ? {
        maxAge: 31_536_000,
        includeSubDomains: true,
        preload: true,
      }
    : false,
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      "default-src": ["'self'"],
      "base-uri": ["'self'"],
      "frame-ancestors": ["'none'"],
      "object-src": ["'none'"],
      "script-src": ["'self'"],
      "style-src": ["'self'"],
      "img-src": ["'self'", "data:", "blob:", "https:"],
      "connect-src": ["'self'", "https://sharevibe.co", "https://www.sharevibe.co"],
      "form-action": ["'self'"],
    },
  },
  frameguard: { action: "deny" },
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginEmbedderPolicy: false,
}));
app.use((_req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=(), payment=()");
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS origin denied"));
  },
  credentials: false,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Authorization",
    "Content-Type",
    "X-Requested-With",
    "X-ShareVibe-Webhook-Token",
  ],
  maxAge: 600,
}));
app.use(express.json({ limit: "1mb", type: ["application/json", "application/csp-report"] }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));
app.use("/api/cafes/:cafeId/settings/password-reset", createRateLimit({ keyPrefix: "password-reset", windowMs: 15 * 60_000, max: 5 }));
app.use("/api/cafes/:cafeId/qr-stands", createRateLimit({ keyPrefix: "qr-stands", windowMs: 60_000, max: 60 }));
app.use("/api/cafes/:cafeId/qr-stand-requests", createRateLimit({ keyPrefix: "qr-stand-requests", windowMs: 60_000, max: 30 }));
app.use("/api/campaigns/:campaignId/send", createRateLimit({ keyPrefix: "campaign-send", windowMs: 60_000, max: 10 }));
app.use("/api/session/login", createRateLimit({ keyPrefix: "session-login", windowMs: 15 * 60_000, max: 15 }));
app.use("/api", createRateLimit({ keyPrefix: "api", windowMs: 15 * 60_000, max: 900 }));
app.use("/public", createRateLimit({ keyPrefix: "public", windowMs: 15 * 60_000, max: 300 }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api", campaignRoutes);
app.use("/api", customerRoutes);
app.use("/api", qrRoutes);
app.use("/api", analyticsRoutes);
app.use("/api", templateRoutes);
app.use("/api", settingsRoutes);
app.use("/api", accessPolicyRoutes);
app.use(express.json({ limit: "1mb" }));
app.use("/api", sessionRoutes);
app.use("/api", securityRoutes);
app.use("/api", unsubscribeRoutes);
app.use("/public", unsubscribeRoutes);

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  logServerError("Request failed:", err);
  res.status(err.status || 500).json({
    error: getPublicErrorMessage("Internal server error", err),
  });
});

// 404 handler
app.use((req: any, res: any) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Email API Server running on port ${PORT}`);
  console.log(`📧 Queue scheduler initialized`);
});

const runScheduledCampaignDispatch = async () => {
  try {
    const result = await emailSendingService.processDueScheduledCampaigns();
    if (result.processed > 0) {
      console.log(`Scheduled campaign dispatch queued ${result.processed} campaign(s)`);
    }
  } catch (error) {
    logServerError("Scheduled campaign dispatch failed:", error);
  }
};

void runScheduledCampaignDispatch();
const scheduledCampaignInterval = setInterval(runScheduledCampaignDispatch, 60_000);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  clearInterval(scheduledCampaignInterval);
  await emailQueue.close();
  process.exit(0);
});

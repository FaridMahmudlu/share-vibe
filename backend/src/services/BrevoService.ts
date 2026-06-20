import axios from "axios";
import { logServerError } from "../utils/errors";

interface BrevoEmailPayload {
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent: string;
  textContent: string;
  sender: { email: string; name: string };
  replyTo?: { email: string; name?: string };
  listUnsubscribe?: string;
  headers?: Record<string, string>;
}

interface BrevoResponse {
  messageId: string;
  [key: string]: any;
}

export class BrevoService {
  private apiKey: string;
  private baseUrl: string;
  private senderEmail: string;
  private senderName: string;
  private sandboxMode: string;

  constructor() {
    this.apiKey = this.getEnv("BREVO_API_KEY");
    this.baseUrl = this.getEnv("BREVO_BASE_URL", "https://api.brevo.com/v3");
    this.senderEmail = this.getEnv("EMAIL_SENDER", "no-reply@mail.sharevibe.co");
    this.senderName = this.getEnv("EMAIL_SENDER_NAME", "ShareVibe");
    this.sandboxMode = this.getEnv("BREVO_SANDBOX_MODE");

    if (!this.apiKey) {
      throw new Error("BREVO_API_KEY is not set");
    }

    if (!this.senderEmail || !(this.senderEmail.includes("@"))) {
      throw new Error("EMAIL_SENDER must be a valid sender email");
    }
  }

  private getEnv(key: string, fallback = ""): string {
    const value = process.env[key]?.trim();
    return value || fallback;
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent: string,
    replyTo?: string
  ): Promise<BrevoResponse> {
    const payload: BrevoEmailPayload = {
      to: [{ email: to }],
      subject,
      htmlContent,
      textContent,
      sender: {
        email: this.senderEmail,
        name: this.senderName,
      },
      ...(replyTo && { replyTo: { email: replyTo } }),
      listUnsubscribe: `<mailto:unsubscribe@mail.sharevibe.co?subject=${encodeURIComponent(
        subject
      )}>`,
      headers: {
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        ...(this.sandboxMode ? { "X-Sib-Sandbox": this.sandboxMode } : {}),
      },
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/smtp/email`,
        payload,
        {
          timeout: 10_000,
          headers: {
            "api-key": this.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || "Unknown error";
      const errorCode = error.response?.status || 500;
      logServerError(`Brevo API Error (${errorCode}). sandbox=${this.sandboxMode ? "on" : "off"}`, error);

      throw new Error(
        process.env.NODE_ENV === "production"
          ? `Failed to send email via Brevo: ${errorCode}`
          : `Failed to send email via Brevo: ${errorCode} - ${errorMessage}`
      );
    }
  }

  async validateEmail(email: string): Promise<boolean> {
    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async checkApiHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/account`, {
        timeout: 10_000,
        headers: {
          "api-key": this.apiKey,
        },
      });
      return response.status === 200;
    } catch (error) {
      logServerError("Brevo API health check failed:", error);
      return false;
    }
  }
}

export const brevoService = new BrevoService();

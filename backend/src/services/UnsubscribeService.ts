import { randomUUID } from "crypto";
import { prisma } from "../config/prisma";

export class UnsubscribeService {
  async generateUnsubscribeToken(): Promise<string> {
    return randomUUID();
  }

  async createUnsubscribe(
    cafeId: string,
    email: string,
    token: string
  ): Promise<void> {
    await prisma.unsubscribedEmail.upsert({
      where: {
        cafeId_email: {
          cafeId,
          email,
        },
      },
      create: {
        cafeId,
        email,
        token,
      },
      update: {
        token,
        unsubscribedAt: new Date(),
      },
    });
  }

  async verifyAndUnsubscribe(
    token: string,
    email: string
  ): Promise<{ success: boolean; message: string }> {
    const unsubscribe = await prisma.unsubscribedEmail.findUnique({
      where: { token },
    });

    if (!unsubscribe) {
      return {
        success: false,
        message: "Invalid unsubscribe token",
      };
    }

    if (unsubscribe.email !== email) {
      return {
        success: false,
        message: "Email mismatch",
      };
    }

    // Already unsubscribed, so just confirm
    return {
      success: true,
      message: "Successfully unsubscribed",
    };
  }

  async isUnsubscribed(cafeId: string, email: string): Promise<boolean> {
    const record = await prisma.unsubscribedEmail.findUnique({
      where: {
        cafeId_email: {
          cafeId,
          email,
        },
      },
    });

    return !!record;
  }

  async batchUnsubscribe(
    cafeId: string,
    emails: string[]
  ): Promise<{ unsubscribed: string[] }> {
    const unsubscribedEmails: string[] = [];

    for (const email of emails) {
      const token = await this.generateUnsubscribeToken();
      await this.createUnsubscribe(cafeId, email, token);
      unsubscribedEmails.push(email);
    }

    return { unsubscribed: unsubscribedEmails };
  }
}

export const unsubscribeService = new UnsubscribeService();

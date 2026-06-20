import { prisma } from "../config/prisma";

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

export class LimitService {
  private globalDailyLimit: number;
  private perCafeDailyLimit: number;
  private perCampaignLimit: number;

  constructor() {
    this.globalDailyLimit = parseInt(process.env.GLOBAL_DAILY_LIMIT || "280");
    this.perCafeDailyLimit = parseInt(process.env.PER_CAFE_DAILY_LIMIT || "50");
    this.perCampaignLimit = parseInt(process.env.PER_CAMPAIGN_LIMIT || "50");
  }

  private async ensureCafeDailyLimit(cafeId: string, today: Date) {
    try {
      return await prisma.dailyLimit.upsert({
        where: { cafeId },
        create: {
          cafeId,
          date: today,
          sentCount: 0,
        },
        update: {},
      });
    } catch (error: any) {
      if (error?.code === "P2002") {
        return prisma.dailyLimit.findUniqueOrThrow({
          where: { cafeId },
        });
      }

      throw error;
    }
  }

  async checkGlobalLimit(todayCount: number): Promise<{
    allowed: boolean;
    remaining: number;
  }> {
    const remaining = this.globalDailyLimit - todayCount;
    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
    };
  }

  async checkCafeLimit(cafeId: string, newCount: number): Promise<{
    allowed: boolean;
    remaining: number;
  }> {
    const today = startOfDay(new Date());

    let dailyLimit = await this.ensureCafeDailyLimit(cafeId, today);

    if (dailyLimit.date.getTime() !== today.getTime()) {
      dailyLimit = await prisma.dailyLimit.update({
        where: { cafeId },
        data: {
          date: today,
          sentCount: 0,
        },
      });
    }

    const remaining = this.perCafeDailyLimit - (dailyLimit.sentCount + newCount);

    return {
      allowed: remaining >= 0,
      remaining: Math.max(0, remaining),
    };
  }

  async checkCampaignLimit(campaignRecipients: number): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    if (campaignRecipients > this.perCampaignLimit) {
      return {
        allowed: false,
        reason: `Campaign exceeds limit of ${this.perCampaignLimit} recipients`,
      };
    }

    return { allowed: true };
  }

  async getGlobalSentToday(): Promise<number> {
    const today = startOfDay(new Date());

    const globalLimit = await prisma.globalLimit.findFirst({
      where: {
        date: today,
      },
    });

    return globalLimit?.sentCount || 0;
  }

  async incrementGlobalLimit(count: number): Promise<void> {
    const today = startOfDay(new Date());

    await prisma.globalLimit.upsert({
      where: { date: today },
      create: {
        date: today,
        sentCount: count,
      },
      update: {
        sentCount: {
          increment: count,
        },
      },
    });
  }

  async incrementCafeLimit(cafeId: string, count: number): Promise<void> {
    const today = startOfDay(new Date());
    const current = await this.ensureCafeDailyLimit(cafeId, today);

    if (current.date.getTime() !== today.getTime()) {
      await prisma.dailyLimit.update({
        where: { cafeId },
        data: {
          date: today,
          sentCount: count,
        },
      });
      return;
    }

    await prisma.dailyLimit.update({
      where: { cafeId },
      data: {
        sentCount: {
          increment: count,
        },
      },
    });
  }
}

export const limitService = new LimitService();

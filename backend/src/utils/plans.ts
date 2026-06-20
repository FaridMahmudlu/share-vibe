import { PrismaClient } from "@prisma/client";
import { Response } from "express";

export type BillingPlanKey = "standart_aylik" | "standart_yillik" | "mail_aylik" | "mail_yillik";

export const DEFAULT_BILLING_PLAN: BillingPlanKey = "standart_aylik";

export const normalizeBillingPlan = (value: unknown): BillingPlanKey => {
  switch (value) {
    case "mail_aylik":
    case "aylik":
      return "mail_aylik";
    case "mail_yillik":
    case "yillik":
      return "mail_yillik";
    case "standart_yillik":
      return "standart_yillik";
    case "standart_aylik":
      return "standart_aylik";
    default:
      return DEFAULT_BILLING_PLAN;
  }
};

export const isMailEnabledPlan = (value: unknown) =>
  normalizeBillingPlan(value).startsWith("mail_");

export const requireMailMarketingPlan = async (
  prisma: PrismaClient,
  cafeId: string | undefined,
  res: Response
) => {
  if (!cafeId) {
    res.status(400).json({ error: "Kafe bilgisi bulunamadı." });
    return false;
  }

  const settings = await prisma.cafeSettings.findUnique({
    where: { cafeId },
    select: { billingPlan: true },
  });

  if (!isMailEnabledPlan(settings?.billingPlan)) {
    res.status(403).json({
      error:
        "E-posta pazarlama bu planda kullanılamaz. Mail entegrasyonlu plana geçmek için ShareVibe ekibiyle iletişime geçin.",
      code: "MAIL_PLAN_REQUIRED",
    });
    return false;
  }

  return true;
};

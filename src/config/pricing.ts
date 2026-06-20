export type BillingCycle = 'aylik' | 'yillik';
export type PlanFamily = 'mail' | 'standart';
export type PricingPlanKey = 'standart_aylik' | 'standart_yillik' | 'mail_aylik' | 'mail_yillik';

export type PricingPlan = {
  key: PricingPlanKey;
  family: PlanFamily;
  cycle: BillingCycle;
  badge: string;
  title: string;
  shortTitle: string;
  description: string;
  price: string;
  billingLabel: string;
  oldPrice?: string;
  featured?: boolean;
  ctaLabel: string;
  footerNote: string;
  mailIncluded: boolean;
  setupNote: string;
  features: string[];
};

export type PricingQuote = {
  planKey: PricingPlanKey;
  tableCount: number;
  recurringAmount: number;
  recurringLabel: string;
  oldRecurringAmount?: number;
  oldRecurringLabel?: string;
  setupPrepaymentAmount: number;
  setupPrepaymentLabel: string;
  vatNote: string;
};

export const SHAREVIBE_WHATSAPP_NUMBER = '905550497360';

export const PLAN_TABLE_MIN = 1;
export const PLAN_TABLE_MAX = 300;
export const PLAN_TABLE_DEFAULT = 20;
export const SETUP_BASE_PRICE = 3500;
export const SETUP_PRICE_PER_TABLE = 100;
export const ANNUAL_BILLED_MONTHS = 10;
export const VAT_NOTE = 'Fiyatlara KDV dahil değildir.';

export const MONTHLY_PLAN_PRICES: Record<PlanFamily, number> = {
  standart: 3000,
  mail: 4500,
};

export const PLAN_KEYS: PricingPlanKey[] = [
  'standart_aylik',
  'standart_yillik',
  'mail_aylik',
  'mail_yillik',
];

export const formatTryPrice = (amount: number) =>
  `₺${Math.round(amount).toLocaleString('tr-TR')}`;

export const normalizePlanTableCount = (value: unknown, fallback = PLAN_TABLE_DEFAULT) => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  const safeValue = Number.isFinite(numericValue) ? numericValue : fallback;

  return Math.min(PLAN_TABLE_MAX, Math.max(PLAN_TABLE_MIN, Math.round(safeValue)));
};

export const calculateSetupPrepayment = (tableCount: unknown) =>
  SETUP_BASE_PRICE + normalizePlanTableCount(tableCount) * SETUP_PRICE_PER_TABLE;

const getRecurringAmount = (family: PlanFamily, cycle: BillingCycle) => {
  const monthlyAmount = MONTHLY_PLAN_PRICES[family];
  return cycle === 'yillik' ? monthlyAmount * ANNUAL_BILLED_MONTHS : monthlyAmount;
};

const getOldRecurringAmount = (family: PlanFamily, cycle: BillingCycle) =>
  cycle === 'yillik' ? MONTHLY_PLAN_PRICES[family] * 12 : undefined;

export const PRICING_FEATURES = [
  'Kafeye özel QR masa standı tasarımı',
  'Canlı fotoğraf galerisi ve kampanya akışı',
  'Yönetim paneli kurulumu ve ekip kullanımı',
  'Misafir verileri ve izinli iletişim takibi',
  'Performans raporları ve kampanya ölçümü',
  'Marka renkleri, logo ve tema uyarlaması',
  'Hafta içi teknik destek',
];

const STANDARD_FEATURES = [
  ...PRICING_FEATURES,
  'E-posta pazarlama modülü kapalı',
  'WhatsApp üzerinden kurulum ve destek takibi',
];

const MAIL_FEATURES = [
  ...PRICING_FEATURES,
  'E-posta kampanyaları ve hazır şablonlar',
  'Segment bazlı misafir iletişimi',
  'Gönderici alan adı kurulumu için teknik yönlendirme',
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    key: 'mail_aylik',
    family: 'mail',
    cycle: 'aylik',
    badge: 'Mail Dahil',
    title: 'Mail Entegrasyonlu Plan',
    shortTitle: 'Mail Planı',
    description:
      'QR deneyimi, canlı galeri, kampanyalar ve e-posta pazarlamasını tek panelden yönetmek isteyen kafeler için.',
    price: formatTryPrice(getRecurringAmount('mail', 'aylik')),
    billingLabel: '/ ay',
    featured: true,
    ctaLabel: 'Mail Planını Seç',
    footerNote: 'Mail pazarlama, izinli müşteri listeleri ve kampanya şablonları dahildir.',
    mailIncluded: true,
    setupNote: 'Mail modülü aktiftir; gönderici alan adı kurulumu teknik görüşmede planlanır.',
    features: MAIL_FEATURES,
  },
  {
    key: 'mail_yillik',
    family: 'mail',
    cycle: 'yillik',
    badge: 'Mail Dahil',
    title: 'Mail Entegrasyonlu Plan',
    shortTitle: 'Mail Planı',
    description:
      'Yıllık ödeme avantajıyla QR deneyimi, canlı galeri, kampanyalar ve e-posta pazarlamasını birlikte kullanın.',
    price: formatTryPrice(getRecurringAmount('mail', 'yillik')),
    billingLabel: '/ yıl',
    oldPrice: formatTryPrice(getOldRecurringAmount('mail', 'yillik') || 0),
    featured: true,
    ctaLabel: 'Mail Planını Seç',
    footerNote: 'Yıllık ödemede 12 ay yerine 10 ay ödenir.',
    mailIncluded: true,
    setupNote: 'Mail modülü aktiftir; gönderici alan adı kurulumu teknik görüşmede planlanır.',
    features: MAIL_FEATURES,
  },
  {
    key: 'standart_aylik',
    family: 'standart',
    cycle: 'aylik',
    badge: 'Mailsiz',
    title: 'Standart Plan',
    shortTitle: 'Standart',
    description:
      'QR paylaşım, canlı galeri, temel kampanya deneyimi ve raporlama isteyen kafeler için sade başlangıç.',
    price: formatTryPrice(getRecurringAmount('standart', 'aylik')),
    billingLabel: '/ ay',
    ctaLabel: 'Standart Planı Seç',
    footerNote: 'Mail pazarlaması bu planda kullanılmaz.',
    mailIncluded: false,
    setupNote: 'E-posta pazarlama kapalıdır; ihtiyaç olursa mail planına geçilebilir.',
    features: STANDARD_FEATURES,
  },
  {
    key: 'standart_yillik',
    family: 'standart',
    cycle: 'yillik',
    badge: 'Mailsiz',
    title: 'Standart Plan',
    shortTitle: 'Standart',
    description:
      'Yıllık ödeme avantajıyla QR paylaşım, canlı galeri ve temel kampanya akışını güvenle kullanın.',
    price: formatTryPrice(getRecurringAmount('standart', 'yillik')),
    billingLabel: '/ yıl',
    oldPrice: formatTryPrice(getOldRecurringAmount('standart', 'yillik') || 0),
    ctaLabel: 'Standart Planı Seç',
    footerNote: 'Yıllık ödemede 12 ay yerine 10 ay ödenir.',
    mailIncluded: false,
    setupNote: 'E-posta pazarlama kapalıdır; ihtiyaç olursa mail planına geçilebilir.',
    features: STANDARD_FEATURES,
  },
];

export const normalizePricingPlanKey = (value: unknown): PricingPlanKey => {
  switch (value) {
    case 'mail_aylik':
    case 'aylik':
      return 'mail_aylik';
    case 'mail_yillik':
    case 'yillik':
      return 'mail_yillik';
    case 'standart_yillik':
      return 'standart_yillik';
    case 'standart_aylik':
      return 'standart_aylik';
    default:
      return 'standart_aylik';
  }
};

export const getPricingPlanByKey = (key: unknown) => {
  const normalizedKey = normalizePricingPlanKey(key);
  return PRICING_PLANS.find((plan) => plan.key === normalizedKey) ?? PRICING_PLANS[2];
};

export const getPlansForCycle = (cycle: BillingCycle) =>
  PRICING_PLANS.filter((plan) => plan.cycle === cycle).sort((left, right) => {
    if (left.family === right.family) return 0;
    return left.family === 'mail' ? -1 : 1;
  });

export const isMailEnabledPlan = (key: unknown) => getPricingPlanByKey(key).mailIncluded;

export const getBillingCycleLabel = (cycle: BillingCycle) =>
  cycle === 'yillik' ? 'Yıllık ödeme' : 'Aylık ödeme';

export const getPricingQuote = (planKey: unknown, tableCount: unknown): PricingQuote => {
  const plan = getPricingPlanByKey(planKey);
  const normalizedTableCount = normalizePlanTableCount(tableCount);
  const recurringAmount = getRecurringAmount(plan.family, plan.cycle);
  const oldRecurringAmount = getOldRecurringAmount(plan.family, plan.cycle);
  const setupPrepaymentAmount = calculateSetupPrepayment(normalizedTableCount);

  return {
    planKey: plan.key,
    tableCount: normalizedTableCount,
    recurringAmount,
    recurringLabel: formatTryPrice(recurringAmount),
    oldRecurringAmount,
    oldRecurringLabel: oldRecurringAmount ? formatTryPrice(oldRecurringAmount) : undefined,
    setupPrepaymentAmount,
    setupPrepaymentLabel: formatTryPrice(setupPrepaymentAmount),
    vatNote: VAT_NOTE,
  };
};

export const buildPlanWhatsappMessage = ({
  planKey,
  cafeName,
  ownerEmail,
  workspaceSlug,
  source,
  tableCount,
}: {
  planKey: PricingPlanKey;
  cafeName?: string | null;
  ownerEmail?: string | null;
  workspaceSlug?: string | null;
  source: string;
  tableCount?: number | null;
}) => {
  const plan = getPricingPlanByKey(planKey);
  const quote = getPricingQuote(plan.key, tableCount ?? PLAN_TABLE_DEFAULT);

  return [
    'Merhaba, ShareVibe planı hakkında bilgi almak istiyorum.',
    `Kaynak: ${source}`,
    cafeName ? `Kafe: ${cafeName}` : null,
    workspaceSlug ? `Kafe kodu: ${workspaceSlug}` : null,
    ownerEmail ? `E-posta: ${ownerEmail}` : null,
    `Seçilen plan: ${plan.title}`,
    `Ödeme dönemi: ${getBillingCycleLabel(plan.cycle)}`,
    `Masa sayısı: ${quote.tableCount}`,
    `Aylık/yıllık plan bedeli: ${quote.recurringLabel} ${plan.billingLabel}`,
    `Ön ödeme: ${quote.setupPrepaymentLabel} (masa sayısı x 100 TL + 3.500 TL)`,
    `Mail entegrasyonu: ${plan.mailIncluded ? 'Dahil' : 'Dahil değil'}`,
    VAT_NOTE,
  ]
    .filter(Boolean)
    .join('\n');
};

export const buildPlanWhatsappUrl = (params: Parameters<typeof buildPlanWhatsappMessage>[0]) =>
  `https://wa.me/${SHAREVIBE_WHATSAPP_NUMBER}?text=${encodeURIComponent(buildPlanWhatsappMessage(params))}`;

import { useEffect, useId, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  Grid2X2,
  Headphones,
  Mail,
  Minus,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import {
  getBillingCycleLabel,
  getPlansForCycle,
  getPricingPlanByKey,
  getPricingQuote,
  normalizePlanTableCount,
  PLAN_TABLE_DEFAULT,
  PRICING_FEATURES,
  PRICING_PLANS,
  SETUP_BASE_PRICE,
  SETUP_PRICE_PER_TABLE,
  VAT_NOTE,
  type BillingCycle,
  type PricingPlan,
  type PricingPlanKey,
  type PricingQuote,
} from '../../config/pricing';

export { PRICING_FEATURES, PRICING_PLANS, type PricingPlanKey };

const trustItems = [
  { icon: Rocket, title: 'Ortalama 1 Haftada Kurulum', text: 'Kafeye özel tasarım ve QR hazırlığı' },
  { icon: TrendingUp, title: 'Veriyle İyileştirin', text: 'Paylaşım, izin ve kampanya performansını izleyin' },
  { icon: Mail, title: 'Mail Opsiyonel', text: 'İhtiyacınıza göre e-posta pazarlama ekleyin' },
  { icon: Headphones, title: 'Gerçek Destek', text: 'Kurulum ve kullanım sürecinde yanınızdayız' },
];

type PricingPlansProps = {
  id?: string;
  className?: string;
  variant?: 'section' | 'compact';
  showHeader?: boolean;
  showTrustBar?: boolean;
  showTableCalculator?: boolean;
  initialTableCount?: number;
  selectedKey?: PricingPlanKey | null;
  onTableCountChange?: (tableCount: number) => void;
  onSelect?: (key: PricingPlanKey, plan: PricingPlan, quote: PricingQuote) => void;
};

export default function PricingPlans({
  id,
  className = '',
  variant = 'section',
  showHeader = true,
  showTrustBar = true,
  showTableCalculator = true,
  initialTableCount = PLAN_TABLE_DEFAULT,
  selectedKey,
  onTableCountChange,
  onSelect,
}: PricingPlansProps) {
  const isCompact = variant === 'compact';
  const inputId = useId();
  const normalizedSelectedPlan = selectedKey ? getPricingPlanByKey(selectedKey) : null;
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(normalizedSelectedPlan?.cycle || 'aylik');
  const [tableCount, setTableCount] = useState(() => normalizePlanTableCount(initialTableCount));
  const visiblePlans = useMemo(() => getPlansForCycle(billingCycle), [billingCycle]);
  const setupQuote = useMemo(
    () => getPricingQuote(normalizedSelectedPlan?.key || visiblePlans[0]?.key || 'standart_aylik', tableCount),
    [normalizedSelectedPlan?.key, tableCount, visiblePlans],
  );

  useEffect(() => {
    const nextTableCount = normalizePlanTableCount(initialTableCount);
    setTableCount(nextTableCount);
  }, [initialTableCount]);

  const handleCycleChange = (cycle: BillingCycle) => {
    setBillingCycle(cycle);
  };

  const updateTableCount = (value: unknown) => {
    const nextTableCount = normalizePlanTableCount(value, tableCount);
    setTableCount(nextTableCount);
    onTableCountChange?.(nextTableCount);
  };

  return (
    <div id={id} className={`sv-pricing ${isCompact ? 'sv-pricing--compact' : ''} ${className}`.trim()}>
      {showHeader ? (
        <div className="sv-pricing-header">
          <h2>
            İşletmenize uygun planı seçin,
            <span> masa sayınıza göre net maliyeti görün.</span>
          </h2>
          <p>
            Aylık plan bedeli sabittir. Kurulum ön ödemesi masa sayısına göre otomatik hesaplanır:
            masa sayısı x {SETUP_PRICE_PER_TABLE} TL + {SETUP_BASE_PRICE.toLocaleString('tr-TR')} TL.
            {` ${VAT_NOTE}`}
          </p>

          <div className="sv-billing-switch" role="group" aria-label="Ödeme dönemi seçimi">
            {(['aylik', 'yillik'] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                type="button"
                className={billingCycle === cycle ? 'is-active' : ''}
                aria-pressed={billingCycle === cycle}
                onClick={() => handleCycleChange(cycle)}
              >
                {getBillingCycleLabel(cycle)}
              </button>
            ))}
            <em>{billingCycle === 'yillik' ? '2 ay avantajlı' : 'Esnek başlangıç'}</em>
          </div>
        </div>
      ) : (
        <div className="sv-compact-billing-switch" role="group" aria-label="Ödeme dönemi seçimi">
          {(['aylik', 'yillik'] as BillingCycle[]).map((cycle) => (
            <button
              key={cycle}
              type="button"
              className={billingCycle === cycle ? 'is-active' : ''}
              aria-pressed={billingCycle === cycle}
              onClick={() => handleCycleChange(cycle)}
            >
              {cycle === 'aylik' ? 'Aylık' : 'Yıllık'}
            </button>
          ))}
        </div>
      )}

      {showTableCalculator ? (
        <div className={`sv-table-calculator ${isCompact ? 'is-compact' : ''}`}>
          <label htmlFor={inputId}>Masa sayısı</label>
          <div className="sv-table-stepper">
            <button type="button" aria-label="Masa sayısını azalt" onClick={() => updateTableCount(tableCount - 1)}>
              <Minus className="h-4 w-4" />
            </button>
            <input
              id={inputId}
              type="number"
              min="1"
              inputMode="numeric"
              value={tableCount}
              onChange={(event) => updateTableCount(event.target.value)}
            />
            <button type="button" aria-label="Masa sayısını artır" onClick={() => updateTableCount(tableCount + 1)}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="sv-table-total">
            <span>Ön ödeme</span>
            <strong>{setupQuote.setupPrepaymentLabel}</strong>
            <small>{tableCount} masa x 100 TL + 3.500 TL</small>
          </div>
        </div>
      ) : null}

      <div className="sv-plan-wrap">
        {!isCompact && billingCycle === 'yillik' ? (
          <div className="sv-plan-note" aria-hidden="true">
            <svg viewBox="0 0 168 54" role="img">
              <path d="M5 41C36 8 76 3 116 12c14 3 27 9 44 4" />
              <path d="M142 5l20 11-19 9" />
            </svg>
            <span>Yıllık ödemede 12 ay yerine 10 ay ödenir</span>
          </div>
        ) : null}

        <div className="sv-plan-grid">
          {visiblePlans.map((plan, index) => {
            const isSelected = normalizedSelectedPlan?.key === plan.key;
            const isMailPlan = plan.mailIncluded;
            const quote = getPricingQuote(plan.key, tableCount);

            return (
              <motion.article
                key={plan.key}
                className={`sv-plan-card ${plan.featured ? 'is-featured' : ''} ${isSelected ? 'is-selected' : ''} ${isMailPlan ? 'is-mail-plan' : 'is-standard-plan'}`.trim()}
                initial={isCompact ? false : { opacity: 0, y: 24 }}
                whileInView={isCompact ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.22 }}
                transition={{ duration: 0.48, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -5, rotateX: isMailPlan ? 1.2 : 0.7 }}
              >
                <div className="sv-plan-topline">
                  <span className="sv-plan-badge">{plan.badge}</span>
                  {isMailPlan ? (
                    <span className="sv-plan-popular">
                      <Star className="h-3.5 w-3.5" /> Pazarlama dahil
                    </span>
                  ) : (
                    <span className="sv-plan-muted-badge">
                      <XCircle className="h-3.5 w-3.5" /> Mail kapalı
                    </span>
                  )}
                </div>

                <div className="sv-plan-intro">
                  <h3>{plan.title}</h3>
                  <p>{plan.description}</p>
                </div>

                <div className="sv-plan-divider" />

                <div className="sv-plan-stand">
                  <strong>Kurulum ön ödemesi</strong>
                  <span>
                    {quote.setupPrepaymentLabel} · {tableCount} masa için hesaplandı.
                  </span>
                  <div className="sv-plan-chips">
                    <span>
                      <Grid2X2 className="h-3.5 w-3.5" /> Masa başı 100 TL
                    </span>
                    <span>
                      <Users className="h-3.5 w-3.5" /> Sabit kurulum 3.500 TL
                    </span>
                  </div>
                </div>

                <ul className="sv-plan-features">
                  {plan.features.map((feature) => (
                    <li key={`${plan.key}-${feature}`}>
                      <Check className="h-4 w-4" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className={`sv-plan-price ${billingCycle === 'yillik' ? 'is-discounted' : ''}`}>
                  {billingCycle === 'yillik' ? (
                    <div className="sv-plan-saving">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Yıllık ödeme avantajı</span>
                      <em>2 ay avantajlı</em>
                    </div>
                  ) : null}
                  <strong>{plan.price}</strong>
                  <span>{plan.billingLabel}</span>
                  {plan.oldPrice ? <del>{plan.oldPrice}</del> : null}
                  <small>{VAT_NOTE} {plan.setupNote}</small>
                </div>

                <button
                  type="button"
                  className="sv-plan-cta"
                  aria-pressed={isSelected ? true : undefined}
                  onClick={() => onSelect?.(plan.key, plan, quote)}
                >
                  {plan.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>

                <p className="sv-plan-footnote">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {isSelected ? 'Seçili plan' : plan.footerNote}
                </p>
              </motion.article>
            );
          })}
        </div>
      </div>

      {showTrustBar && !isCompact ? (
        <div className="sv-plan-trustbar">
          {trustItems.map(({ icon: Icon, title, text }) => (
            <div key={title} className="sv-plan-trustitem">
              <Icon className="h-6 w-6" />
              <div>
                <strong>{title}</strong>
                <span>{text}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

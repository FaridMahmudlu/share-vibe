import { memo } from 'react';
import { BRAND_NAME, brandLogoSrc } from './brandAssets';

type BrandSignatureProps = {
  className?: string;
  compact?: boolean;
  subtitle?: string | null;
};

type BrandIconProps = {
  className?: string;
};

export const BrandIcon = memo(({ className = '' }: BrandIconProps) => {
  return (
    <span className={`brand-signature-mark ${className}`.trim()} aria-hidden="true">
      <img src={brandLogoSrc} alt="" className="h-full w-full object-contain" draggable={false} loading="eager" decoding="async" />
    </span>
  );
});
BrandIcon.displayName = 'BrandIcon';

export default memo(function BrandSignature({
  className = '',
  compact = false,
  subtitle = 'kahve içi paylaşım altyapısı',
}: BrandSignatureProps) {
  return (
    <span className={`brand-signature ${compact ? 'brand-signature--compact' : ''} ${className}`.trim()}>
      <BrandIcon />
      <span className="brand-signature-copy">
        <span className="brand-signature-word" aria-label={BRAND_NAME}>
          <span className="brand-signature-word-primary">Share</span>
          <span className="brand-signature-word-accent">Vibe</span>
        </span>
        {subtitle ? <span className="brand-signature-subtitle">{subtitle}</span> : null}
      </span>
    </span>
  );
});

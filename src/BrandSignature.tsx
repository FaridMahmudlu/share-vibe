import { BRAND_NAME } from './brandAssets';

type BrandSignatureProps = {
  className?: string;
  compact?: boolean;
  subtitle?: string | null;
};

type BrandIconProps = {
  className?: string;
};

export function BrandIcon({ className = '' }: BrandIconProps) {
  return (
    <span className={`brand-signature-mark ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M21 25.5H43C46.5899 25.5 49.5 28.4101 49.5 32V35.5C49.5 44.0604 42.5604 51 34 51H30C21.4396 51 14.5 44.0604 14.5 35.5V32C14.5 28.4101 17.4101 25.5 21 25.5Z"
          fill="#FFF9F3"
          stroke="#3A2216"
          strokeWidth="2.5"
        />
        <path
          d="M49.5 31H51.5C55.0899 31 58 33.9101 58 37.5C58 41.0899 55.0899 44 51.5 44H49.5"
          stroke="#D48F6B"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M20.5 25.5H43.5C42.2307 18.519 37.2064 14 32 14C26.7936 14 21.7693 18.519 20.5 25.5Z"
          fill="#EAC0A4"
          stroke="#D48F6B"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M24 12.5C24 10.0147 26.0147 8 28.5 8V8C30.9853 8 33 10.0147 33 12.5V14" stroke="#D48F6B" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M31 11C31 8.79086 32.7909 7 35 7V7C37.2091 7 39 8.79086 39 11V14" stroke="#B87352" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M25 37.5C27.4701 39.5398 29.8509 40.5 32 40.5C34.1491 40.5 36.5299 39.5398 39 37.5" stroke="#3A2216" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export default function BrandSignature({
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
}

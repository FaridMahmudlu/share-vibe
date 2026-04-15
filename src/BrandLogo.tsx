import { brandLogoSrc } from './brandAssets';

type BrandLogoProps = {
  alt?: string;
  className?: string;
  priority?: boolean;
};

export default function BrandLogo({
  alt = 'ShareVibe logosu',
  className = '',
  priority = false,
}: BrandLogoProps) {
  return (
    <img
      src={brandLogoSrc}
      alt={alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      draggable={false}
    />
  );
}

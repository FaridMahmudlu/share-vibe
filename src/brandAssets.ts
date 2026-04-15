export const BRAND_NAME = 'ShareVibe';
export const BRAND_TAGLINE = 'Topluluk Odaklı Kahve Deneyimi';
export const BRAND_TITLE = `${BRAND_NAME} | ${BRAND_TAGLINE}`;
export const brandLogoSrc = new URL('../image.png', import.meta.url).href;

export const applyBrandDocumentMeta = () => {
  if (typeof document === 'undefined') {
    return;
  }

  document.title = BRAND_TITLE;

  const ensureLink = (rel: string) => {
    let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }

    link.href = brandLogoSrc;
    link.type = 'image/png';
  };

  ensureLink('icon');
  ensureLink('apple-touch-icon');
};

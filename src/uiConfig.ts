export const THEME_COLORS = [
  { name: 'Rose Gold', value: '#c98a73' },
  { name: 'Champagne', value: '#d8b98f' },
  { name: 'Amber Bronze', value: '#b8794f' },
  { name: 'Terracotta Luxe', value: '#a8664a' },
  { name: 'Olive Silk', value: '#7f8a52' },
  { name: 'Sage Mist', value: '#8ea79a' },
  { name: 'Teal Velvet', value: '#3e7f7a' },
  { name: 'Navy Ink', value: '#38506b' },
  { name: 'Royal Plum', value: '#6e4f73' },
  { name: 'Burgundy Reserve', value: '#7a3f4a' },
  { name: 'Espresso Noir', value: '#4a3128' },
];

export const THEME_FONTS = [
  { name: 'Kalam', value: '"Kalam", cursive' },
  { name: 'Caveat', value: '"Caveat", cursive' },
  { name: 'Patrick Hand', value: '"Patrick Hand", cursive' },
  { name: 'Shantell Sans', value: '"Shantell Sans", cursive' },
  { name: 'Satisfy', value: '"Satisfy", cursive' },
  { name: 'Handlee', value: '"Handlee", cursive' },
  { name: 'Marck Script', value: '"Marck Script", cursive' },
  { name: 'Nothing You Could Do', value: '"Nothing You Could Do", cursive' },
];

export const THEME_PRESETS = [
  {
    name: 'Rose Gold Lounge',
    accentColor: '#c98a73',
    handwritingFont: '"Kalam", cursive',
    description: 'Sıcak ve rafine bir premium karşılama hissi oluşturur.',
  },
  {
    name: 'Champagne Atelier',
    accentColor: '#d8b98f',
    handwritingFont: '"Patrick Hand", cursive',
    description: 'Aydınlık, butik ve zarif bir masa deneyimi sunar.',
  },
  {
    name: 'Amber Signature',
    accentColor: '#b8794f',
    handwritingFont: '"Caveat", cursive',
    description: 'Dengeli sıcaklıkla çağrı butonlarını premium şekilde öne çıkarır.',
  },
  {
    name: 'Terracotta Gallery',
    accentColor: '#a8664a',
    handwritingFont: '"Shantell Sans", cursive',
    description: 'Galeri kartlarında tok ve prestijli bir ton dengesi sağlar.',
  },
  {
    name: 'Sage Reserve',
    accentColor: '#8ea79a',
    handwritingFont: '"Satisfy", cursive',
    description: 'Sakin, modern ve yüksek seviyeli bir atmosfer yaratır.',
  },
  {
    name: 'Teal Velvet',
    accentColor: '#3e7f7a',
    handwritingFont: '"Handlee", cursive',
    description: 'Canlılığı koruyarak premium görünümü bozmayan derin bir vurgu verir.',
  },
  {
    name: 'Royal Plum Bar',
    accentColor: '#6e4f73',
    handwritingFont: '"Marck Script", cursive',
    description: 'Akşam konseptli mekanlar için zarif ve farklı bir marka dili yaratır.',
  },
  {
    name: 'Espresso Noir',
    accentColor: '#4a3128',
    handwritingFont: '"Nothing You Could Do", cursive',
    description: 'Yüksek kontrastlı, klasik ve lüks bir final görünümü sağlar.',
  },
];

export const DEFAULT_ACCENT_COLOR = '#d48f6b';
export const DEFAULT_HANDWRITING_FONT = THEME_FONTS[0].value;
export const DEFAULT_CAFE_NAME = 'Lumina Kafe';
export const DEFAULT_CAFE_SLUG = 'ava-coffee';
export const DEFAULT_DEMO_TABLE = 'Masa 12';
export const DEFAULT_CAMPAIGN_TARGET = 4;
export const DEFAULT_CAMPAIGN_REWARD = 'ücretsiz bir kahve';
export const DEFAULT_MEDIA_CAPTION = 'İsimsiz anı ✨';

export type CafeSettings = {
  cafeSlug: string;
  cafeName: string;
  accentColor: string;
  handwritingFont: string;
  campaignTarget: number;
  campaignReward: string;
  ownerEmail?: string;
};

const LEGACY_TEXT_REPLACEMENTS: Array<[string, string]> = [
  ['İ', 'İ'],
  ['ı', 'ı'],
  ['ğ', 'ğ'],
  ['Ğ', 'Ğ'],
  ['ü', 'ü'],
  ['Ü', 'Ü'],
  ['ö', 'ö'],
  ['Ö', 'Ö'],
  ['ç', 'ç'],
  ['Ç', 'Ç'],
  ['ş', 'ş'],
  ['Ş', 'Ş'],
  ['✨', '✨'],
  ['🎉', '🎉'],
  ['✨', '✨'],
  ['°', '°'],
];

const SUPPORTED_HANDWRITING_FONTS = new Set(THEME_FONTS.map(({ value }) => value));

export const normalizeLegacyText = (value: unknown, fallback = '') => {
  if (typeof value !== 'string') {
    return fallback;
  }

  let normalized = value;

  for (const [source, target] of LEGACY_TEXT_REPLACEMENTS) {
    normalized = normalized.split(source).join(target);
  }

  normalized = normalized.replace(/\s+/g, ' ').trim();
  return normalized || fallback;
};

export const normalizeHandwritingFont = (value: unknown) =>
  typeof value === 'string' && SUPPORTED_HANDWRITING_FONTS.has(value)
    ? value
    : DEFAULT_HANDWRITING_FONT;

export const normalizeCafeSlug = (value: unknown, fallback = DEFAULT_CAFE_SLUG) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
};

export const normalizeOptionalCafeSlug = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }

  return normalizeCafeSlug(value, '');
};

export const normalizeTableLabel = (value: unknown, fallback = '') => {
  const normalized = normalizeLegacyText(value, '');
  if (!normalized) {
    return fallback;
  }

  if (/^\d+$/.test(normalized)) {
    return `Masa ${normalized}`;
  }

  if (/^(masa|table)\s*\d+$/i.test(normalized)) {
    const digits = normalized.match(/\d+/)?.[0];
    return digits ? `Masa ${digits}` : normalized;
  }

  return normalized;
};

export const buildCafePublicLink = ({
  origin,
  cafeSlug,
  tableLabel,
}: {
  origin: string;
  cafeSlug: string;
  tableLabel?: string;
}) => {
  const url = new URL(origin);
  url.searchParams.set('screen', 'app');
  url.searchParams.set('cafe', normalizeCafeSlug(cafeSlug));

  if (tableLabel) {
    url.searchParams.set('table', normalizeTableLabel(tableLabel));
  } else {
    url.searchParams.delete('table');
  }

  return url.toString();
};

export const THEME_COLORS = [
  { name: 'Bakır Latte', value: '#d48f6b' },
  { name: 'Tarçın', value: '#c97857' },
  { name: 'Karamel', value: '#b87352' },
  { name: 'Fındık', value: '#9d6a4c' },
  { name: 'Toffee', value: '#bb7658' },
  { name: 'Sütlü Kakao', value: '#a56f62' },
  { name: 'Şeftali Köpüğü', value: '#de9d7c' },
  { name: 'Kum Beji', value: '#c29a74' },
  { name: 'Mocha', value: '#7f4a36' },
  { name: 'Kızıl Kil', value: '#aa604e' },
  { name: 'Espresso', value: '#5d382a' },
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
    name: 'Bakır Karşılama',
    accentColor: '#d48f6b',
    handwritingFont: '"Kalam", cursive',
    description: 'Sıcak, rafine ve davetkar bir ilk izlenim oluşturur.',
  },
  {
    name: 'Tarçın Akışı',
    accentColor: '#c97857',
    handwritingFont: '"Patrick Hand", cursive',
    description: 'Dinamik ve samimi bir paylaşım alanı hissi verir.',
  },
  {
    name: 'Fındık Yumuşaklığı',
    accentColor: '#9d6a4c',
    handwritingFont: '"Caveat", cursive',
    description: 'Yumuşak tonlu ve uzun süre bakılması rahat bir görünüm sağlar.',
  },
  {
    name: 'Kum Işığı',
    accentColor: '#c29a74',
    handwritingFont: '"Shantell Sans", cursive',
    description: 'Butik, aydınlık ve premium bir masa deneyimi sunar.',
  },
  {
    name: 'Şeftali Dokunuşu',
    accentColor: '#de9d7c',
    handwritingFont: '"Satisfy", cursive',
    description: 'Daha canlı ama yine de marka bütünlüğünü koruyan sıcaklık katar.',
  },
  {
    name: 'Toffee Vurgusu',
    accentColor: '#bb7658',
    handwritingFont: '"Handlee", cursive',
    description: 'Paylaşım butonları ve kampanya kartlarında güçlü vurgu üretir.',
  },
  {
    name: 'Mocha İmzası',
    accentColor: '#7f4a36',
    handwritingFont: '"Marck Script", cursive',
    description: 'Daha karakterli, tok ve premium bir marka hissi bırakır.',
  },
  {
    name: 'Espresso Kontrastı',
    accentColor: '#5d382a',
    handwritingFont: '"Nothing You Could Do", cursive',
    description: 'Koyu vurgularla güçlü başlıklar ve net çağrılar üretir.',
  },
];

export const DEFAULT_ACCENT_COLOR = '#d48f6b';
export const DEFAULT_HANDWRITING_FONT = THEME_FONTS[0].value;
export const DEFAULT_CAFE_NAME = 'Lumina Coffee';
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

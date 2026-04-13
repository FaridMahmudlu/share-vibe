export const THEME_COLORS = [
  { name: 'Kehribar', value: '#c97a43' },
  { name: 'Adaçayı', value: '#5f8d6d' },
  { name: 'Gece Mavisi', value: '#355c7d' },
  { name: 'Gül Kurusu', value: '#b56576' },
  { name: 'Kiremit', value: '#c56a4b' },
];

export const THEME_FONTS = [
  { name: 'Kalam', value: '"Kalam", cursive' },
  { name: 'Caveat', value: '"Caveat", cursive' },
  { name: 'Patrick Hand', value: '"Patrick Hand", cursive' },
  { name: 'Shantell Sans', value: '"Shantell Sans", cursive' },
];

export const DEFAULT_ACCENT_COLOR = '#c97a43';
export const DEFAULT_HANDWRITING_FONT = THEME_FONTS[0].value;
export const DEFAULT_CAFE_NAME = 'Lumina Konsept Kafe';
export const DEFAULT_CAMPAIGN_TARGET = 5;
export const DEFAULT_CAMPAIGN_REWARD = 'ücretsiz bir kahve';
export const DEFAULT_MEDIA_CAPTION = 'İsimsiz anı ✨';

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

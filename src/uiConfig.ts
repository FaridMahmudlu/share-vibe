export const THEME_COLORS = [
  { name: 'Kehribar', value: '#c97a43' },
  { name: 'Adaçayı', value: '#5f8d6d' },
  { name: 'Gece Mavisi', value: '#355c7d' },
  { name: 'Gül Kurusu', value: '#b56576' },
  { name: 'Kiremit', value: '#c56a4b' },
  { name: 'Safran', value: '#d39b2a' },
  { name: 'Zeytin', value: '#687a4e' },
  { name: 'Mercan', value: '#d86f5b' },
  { name: 'Turkuaz', value: '#2f8f9d' },
  { name: 'Mürdüm', value: '#7c5c9e' },
  { name: 'Koyu Kiraz', value: '#8b3d52' },
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
    name: 'Sıcak Karşılama',
    accentColor: '#c97a43',
    handwritingFont: '"Kalam", cursive',
    description: 'Sıcak ve tanıdık bir kafe hissi verir.',
  },
  {
    name: 'Doğal Köşe',
    accentColor: '#5f8d6d',
    handwritingFont: '"Patrick Hand", cursive',
    description: 'Bitkili ve sakin konseptler için dengeli görünüm.',
  },
  {
    name: 'Gece Servisi',
    accentColor: '#355c7d',
    handwritingFont: '"Caveat", cursive',
    description: 'Akşam atmosferi ve modern bir vurgu için.',
  },
  {
    name: 'Romantik Masa',
    accentColor: '#b56576',
    handwritingFont: '"Shantell Sans", cursive',
    description: 'Daha yumuşak ve butik bir sunum sağlar.',
  },
  {
    name: 'Tatlı Molası',
    accentColor: '#d39b2a',
    handwritingFont: '"Satisfy", cursive',
    description: 'Daha enerjik ve dikkat çeken bir sıcaklık sunar.',
  },
  {
    name: 'Bahçe Defteri',
    accentColor: '#687a4e',
    handwritingFont: '"Handlee", cursive',
    description: 'Doğal ve rahat mekanlarda yumuşak bir his bırakır.',
  },
  {
    name: 'Kıyı Notları',
    accentColor: '#2f8f9d',
    handwritingFont: '"Marck Script", cursive',
    description: 'Ferah, açık ve biraz daha canlı görünümler için.',
  },
  {
    name: 'Şehir Gecesi',
    accentColor: '#7c5c9e',
    handwritingFont: '"Nothing You Could Do", cursive',
    description: 'Daha karakterli ve fark edilir bir gece teması verir.',
  },
];

export const DEFAULT_ACCENT_COLOR = '#c97a43';
export const DEFAULT_HANDWRITING_FONT = THEME_FONTS[0].value;
export const DEFAULT_CAFE_NAME = 'Lumina Konsept Kafe';
export const DEFAULT_CAMPAIGN_TARGET = 4;
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

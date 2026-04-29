import React, { useEffect, useMemo, useState, memo, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { db, auth, storage } from './firebase';
import {
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import {
  ArrowLeft,
  ArrowUpDown,
  Archive,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  Clock,
  Crown,
  Download,
  ExternalLink,
  Eye,
  Gift,
  Grid3X3,
  Heart,
  Home,
  ImageIcon,
  List,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Megaphone,
  MousePointer2,
  MoreVertical,
  Palette,
  Pencil,
  Plus,
  RotateCw,
  Save,
  ScanQrCode,
  Search,
  SlidersHorizontal,
  SendHorizontal,
  Share2,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trash2,
  X,
  QrCode,
  type LucideIcon,
  Users,
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { signInWithGoogle } from './googleAuth';
import { hasOwnerPortalAccess, hasSuperAdminAccess, normalizeAccessEmail } from './accessConfig';
import { deleteMediaRecord } from './mediaStorage';
import DropdownSelect, { type DropdownOption } from './DropdownSelect';
import {
  buildCafePublicLink,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_CAFE_NAME,
  DEFAULT_CAFE_SLUG,
  DEFAULT_CAMPAIGN_REWARD,
  DEFAULT_CAMPAIGN_TARGET,
  DEFAULT_DEMO_TABLE,
  DEFAULT_HANDWRITING_FONT,
  DEFAULT_MEDIA_CAPTION,
  THEME_COLORS,
  THEME_FONTS,
  THEME_PRESETS,
  normalizeCafeSlug,
  normalizeHandwritingFont,
  normalizeLegacyText,
  normalizeOptionalCafeSlug,
  normalizeTableLabel,
} from './uiConfig';
import { emailService, type EmailCampaign, type EmailCustomer } from './services/emailService';
import { qrService, type QrDashboardResponse, type QrStandRecord } from './services/qrService';

type AdminMediaItem = {
  id: string;
  url: string;
  caption: string;
  cafeSlug: string;
  tableNumber: string;
  date: string;
  likesCount: number;
  viewsCount: number;
  shareCount: number;
  qrInteractionCount: number;
  status: MediaStatus;
  createdAt: any;
};

type PortalMode = 'admin' | 'owner';
type CafePackageKey = 'aylik' | 'yillik';
type DateRangePreset = 'today' | 'last7' | 'last14' | 'last30' | 'custom';
type GalleryStatusFilter = 'all' | MediaStatus;
type GalleryViewMode = 'grid' | 'list';
type MediaStatus = 'published' | 'draft' | 'passive';
type CampaignTabKey = 'all' | 'published' | 'archived';
type CampaignDataFilter = 'all' | 'withImage' | 'withoutImage' | 'last7' | 'last30';
type QrStandStatusFilter = 'all' | 'active' | 'inactive' | 'pending';
type AdminView =
  | 'panel'
  | 'posts'
  | 'campaigns'
  | 'qr'
  | 'customers'
  | 'marketing'
  | 'templates'
  | 'stats'
  | 'settings';

const ADMIN_VIEWS: AdminView[] = [
  'panel',
  'posts',
  'campaigns',
  'qr',
  'customers',
  'marketing',
  'templates',
  'stats',
  'settings',
];
const ADMIN_VIEW_STORAGE_PREFIX = 'sharevibe-admin-active-view';

const isAdminView = (value: string | null): value is AdminView =>
  Boolean(value && ADMIN_VIEWS.includes(value as AdminView));

const getStoredAdminView = (portalMode: PortalMode, fallback: AdminView): AdminView => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const storedView = window.localStorage.getItem(`${ADMIN_VIEW_STORAGE_PREFIX}:${portalMode}`);
  return isAdminView(storedView) ? storedView : fallback;
};

type OwnedWorkspace = {
  slug: string;
  cafeName: string;
};

type EmailAudienceGroup = {
  key: string;
  label: string;
  description: string;
  customers: EmailCustomer[];
};

type EmailTemplatePreset = {
  key: string;
  title: string;
  subject: string;
  textContent: string;
};

type AdminCampaign = {
  id: string;
  subject: string;
  description?: string | null;
  imageUrl?: string | null;
  htmlContent?: string;
  textContent: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  tag?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  scheduledAt?: string | null;
  sentAt?: string | null;
  recipientCount?: number;
  sentCount?: number;
  failedCount?: number;
  openCount?: number;
  clickCount?: number;
  recipients?: Array<{
    email: string;
    status: string;
    failureReason?: string | null;
    sentAt?: string | null;
  }>;
  _count?: {
    recipients?: number;
  };
};

type AdminDateRange = {
  preset: DateRangePreset;
  start: string;
  end: string;
};

type NotificationTone = 'amber' | 'green' | 'violet' | 'neutral';

type AdminNotification = {
  id: string;
  title: string;
  description: string;
  meta: string;
  icon: LucideIcon;
  tone: NotificationTone;
};

type DashboardChartPoint = {
  date: Date;
  isoDate: string;
  label: string;
  shortLabel: string;
  photos: number;
  likes: number;
};

const EMAIL_TEMPLATES: EmailTemplatePreset[] = [
  {
    key: 'hosgeldiniz',
    title: '🎉 Hoş Geldiniz',
    subject: 'Hoş geldiniz, sizi ağırlamak güzeldi 💙',
    textContent:
      'Merhaba,\n\nKafemizi ziyaret ettiğiniz için çok teşekkür ederiz. Sizi ağırlamak ve güzel anlarınıza eşlik etmek bizim için değerliydi.\n\nKapımız size her zaman açık. Bir sonraki kahve molanızda sizi yeniden görmekten mutluluk duyarız.\n\nYakında görüşmek dileğiyle,\nShareVibe Ekibi 💙',
  },
  {
    key: 'haftalik-ozel',
    title: '☕ Haftalık Fırsat',
    subject: 'Bu hafta size özel küçük bir sürpriz var ⭐',
    textContent:
      'Merhaba,\n\nBu hafta kısa süreli bir fırsat hazırladık. Favori içeceğinizde veya tatlınızda %15 indirim sizi bekliyor. 🎁\n\nHafta bitmeden uğrayın, keyifli bir kahve molasıyla gününüze güzel bir ara verin.\n\nSizi bekliyoruz! ☕✨',
  },
  {
    key: 'yeni-acilis',
    title: '🌟 Menüde Yeni Lezzet',
    subject: 'Menümüze yeni lezzetler eklendi 😋',
    textContent:
      'Merhaba,\n\nMenümüzü yeniledik ve sizin için yeni tatlar ekledik. Soğuk kahveler, taze tatlılar ve özel içecekler artık menümüzde. 😋\n\nEski favorileriniz yine yerinde, ancak yeni lezzetleri de denemenizi çok isteriz.\n\nUğrayın, birlikte keşfedelim! 🌟☕',
  },
  {
    key: 'donen-misafir',
    title: '💫 Sizi Tekrar Görmek İstiyoruz',
    subject: 'Sizi yeniden ağırlamak isteriz 💙',
    textContent:
      'Merhaba,\n\nSizi bir süredir kafemizde göremedik ve tekrar ağırlamayı çok isteriz. Favori masanız, yeni menümüz ve sıcak atmosferimiz sizi bekliyor. 💙\n\nYakın zamanda uğrayın; hem yeni lezzetleri deneyin hem de güzel bir mola verin.\n\nSizi bekliyoruz! ☕😊',
  },
  {
    key: 'sosyal-davet',
    title: '👥 Arkadaşlarını Getir',
    subject: 'Arkadaşlarınızla gelin, birlikte kazanın 🎁',
    textContent:
      'Merhaba,\n\nArkadaşlarınızla birlikte gelmeniz için özel bir davet hazırladık. Grup olarak uğradığınızda hem size hem de arkadaşlarınıza küçük bir sürprizimiz olacak. 🎁\n\nBirlikte kahve içmek, fotoğraf paylaşmak ve güzel anılar biriktirmek için en doğru zaman.\n\nSizi ve arkadaşlarınızı bekliyoruz! 👥✨',
  },
  {
    key: 'dogum-gunu',
    title: '🎂 Doğum Gününe Özel',
    subject: 'Doğum gününüz için özel bir sürprizimiz var 🎉',
    textContent:
      'Merhaba,\n\nDoğum günü haftanız yaklaşıyorsa bu mesaj tam size göre. Sizin için özel bir kutlama fırsatı hazırladık. 🎂\n\nDoğum günü haftanızda kafemize uğrayın; size özel tatlı ikramımız ve arkadaşlarınızla paylaşabileceğiniz güzel bir anı köşemiz hazır olsun.\n\nTarihi bize söyleyin, sürprizi biz hazırlayalım! 🎉☕',
  },
];

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const convertPlainTextToHtml = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');

const buildCampaignHtmlContent = (text: string, description: string, imageUrl: string) => {
  const descriptionHtml = description ? `<p><strong>${escapeHtml(description)}</strong></p>` : '';
  const imageHtml = imageUrl
    ? `<p><img src="${escapeHtml(imageUrl)}" alt="" style="max-width:100%;border-radius:12px;display:block;" /></p>`
    : '';

  return `${imageHtml}${descriptionHtml}${convertPlainTextToHtml(text)}`;
};

const DEFAULT_ADMIN_SETTINGS = {
  cafeName: DEFAULT_CAFE_NAME,
  accentColor: DEFAULT_ACCENT_COLOR,
  handwritingFont: DEFAULT_HANDWRITING_FONT,
  campaignTarget: DEFAULT_CAMPAIGN_TARGET,
  campaignReward: DEFAULT_CAMPAIGN_REWARD,
  packageKey: 'aylik' as CafePackageKey,
};

const SORT_OPTIONS = [
  {
    value: 'newest',
    label: 'Sırala: En Yeni',
    hint: 'Son eklenen fotoğraflar üstte kalsın',
  },
  {
    value: 'likes',
    label: 'Sırala: Beğeni',
    hint: 'Etkileşimi yüksek olanları öne çıkar',
  },
];

const GALLERY_STATUS_OPTIONS: DropdownOption[] = [
  { value: 'all', label: 'Durum: Tümü', hint: 'Tüm fotoğraf durumları' },
  { value: 'published', label: 'Yayında', hint: 'Ziyaretçiler tarafından görünenler' },
  { value: 'draft', label: 'Taslak', hint: 'Henüz yayına alınmayanlar' },
  { value: 'passive', label: 'Pasif', hint: 'Medya dosyası eksik olanlar' },
];

const GALLERY_PAGE_SIZE_OPTIONS: DropdownOption[] = [
  { value: '8', label: '8' },
  { value: '12', label: '12' },
  { value: '24', label: '24' },
];

const CAMPAIGN_PAGE_SIZE_OPTIONS: DropdownOption[] = [
  { value: '6', label: '6' },
  { value: '10', label: '10' },
  { value: '20', label: '20' },
];

const CAMPAIGN_DATA_FILTERS: Array<{ key: CampaignDataFilter; label: string; hint: string }> = [
  { key: 'all', label: 'Tüm kampanyalar', hint: 'Seçili durum sekmesine göre göster' },
  { key: 'withImage', label: 'Görselli kampanyalar', hint: 'Görselle öne çıkanlar' },
  { key: 'withoutImage', label: 'Görselsiz kampanyalar', hint: 'Sadece metinle yayınlananlar' },
  { key: 'last7', label: 'Son 7 gün', hint: 'Son bir haftadaki kampanyalar' },
  { key: 'last30', label: 'Son 30 gün', hint: 'Son bir ay içindeki kampanyalar' },
];

const CAMPAIGN_TABS: Array<{ key: CampaignTabKey; label: string }> = [
  { key: 'all', label: 'Tümü' },
  { key: 'published', label: 'Yayındakiler' },
  { key: 'archived', label: 'Yayından kaldırılanlar' },
];

const CAMPAIGN_CATEGORY_OPTIONS: Array<{
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    value: 'promosyon',
    label: 'Promosyon',
    description: 'Genel fırsat ve kısa süreli kampanyalar',
    icon: Megaphone,
  },
  {
    value: 'indirim',
    label: 'İndirim',
    description: 'Fiyat avantajını net şekilde öne çıkarır',
    icon: Gift,
  },
  {
    value: 'ozel-teklif',
    label: 'Özel Teklif',
    description: 'Seçili misafirler için güçlü bir teklif',
    icon: Sparkles,
  },
  {
    value: 'haber',
    label: 'Haber',
    description: 'Yeni menü, etkinlik veya gelişme duyurusu',
    icon: Bell,
  },
  {
    value: 'duyuru',
    label: 'Duyuru',
    description: 'Kafe hakkında önemli bilgilendirmeler',
    icon: Palette,
  },
];

const getCampaignCategoryOption = (value?: string | null) =>
  CAMPAIGN_CATEGORY_OPTIONS.find((option) => option.value === value) ?? CAMPAIGN_CATEGORY_OPTIONS[0];

const normalizeCampaignCategoryValue = (value?: string | null) => getCampaignCategoryOption(value).value;

const getCampaignCategoryLabel = (value?: string | null) => getCampaignCategoryOption(value).label;

const SEND_TIME_OPTIONS: DropdownOption[] = [
  { value: 'now', label: 'Şimdi gönder', hint: 'Mesaj hemen kuyruğa alınır' },
  { value: 'tomorrow-morning', label: 'Yarın sabah 9:00', hint: 'Sabah saatlerinde görünürlük için' },
  { value: 'tomorrow-evening', label: 'Yarın akşam 18:00', hint: 'İş çıkışı yoğunluğu için' },
  { value: 'sunday-morning', label: 'Hafta sonu pazar 10:00', hint: 'Hafta sonu sakin trafikte' },
];

const REPEAT_OPTIONS: DropdownOption[] = [
  { value: 'once', label: 'Bir kez gönder', hint: 'Tek seferlik kampanya' },
  { value: 'weekly', label: 'Haftada bir', hint: 'Düzenli haftalık hatırlatma' },
  { value: 'monthly', label: 'Ayda bir', hint: 'Aylık sadakat kampanyası' },
];

const QR_IMAGE_BASE_URL = 'https://api.qrserver.com/v1/create-qr-code/';
const CHART_MOTION_TRANSITION = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1],
} as const;

const QR_DASHBOARD_STANDS = [
  {
    table: 'Bahçe Masalar',
    location: 'Bahçe alanı',
    badge: 'Ana Stand',
    scans: '2.845',
    scansTrend: '%22,4',
    shares: '2.105',
    sharesTrend: '%18,7',
    status: 'Aktif',
    date: '20 Mayıs 2024',
    photoTone: 'garden',
  },
  {
    table: 'Kasa Üstü',
    location: 'Kasa yanı',
    badge: null,
    scans: '2.312',
    scansTrend: '%15,8',
    shares: '1.678',
    sharesTrend: '%12,3',
    status: 'Aktif',
    date: '19 Mayıs 2024',
    photoTone: 'counter',
  },
  {
    table: 'Pencere Önü',
    location: 'Pencere kenarı',
    badge: null,
    scans: '1.987',
    scansTrend: '%14,6',
    shares: '1.432',
    sharesTrend: '%9,8',
    status: 'Aktif',
    date: '18 Mayıs 2024',
    photoTone: 'window',
  },
  {
    table: 'Bar Alanı',
    location: 'Bar tezgahı',
    badge: null,
    scans: '1.642',
    scansTrend: '%10,2',
    shares: '1.198',
    sharesTrend: '%8,6',
    status: 'Aktif',
    date: '17 Mayıs 2024',
    photoTone: 'bar',
  },
  {
    table: 'Üst Kat Masalar',
    location: 'Üst kat oturma',
    badge: null,
    scans: '1.256',
    scansTrend: '%8,7',
    shares: '892',
    sharesTrend: '%6,1',
    status: 'Aktif',
    date: '16 Mayıs 2024',
    photoTone: 'upper',
  },
  {
    table: 'Teras Girişi',
    location: 'Teras giriş alanı',
    badge: null,
    scans: '975',
    scansTrend: '%7,3',
    shares: '684',
    sharesTrend: '%5,4',
    status: 'Aktif',
    date: '15 Mayıs 2024',
    photoTone: 'terrace',
  },
  {
    table: 'Özel Salon',
    location: 'Özel etkinlik salonu',
    badge: null,
    scans: '842',
    scansTrend: '%6,1',
    shares: '573',
    sharesTrend: '%4,2',
    status: 'Pasif',
    date: '10 Mayıs 2024',
    photoTone: 'lounge',
  },
  {
    table: 'Rezervasyon Masası',
    location: 'Rezervasyon alanı',
    badge: null,
    scans: '591',
    scansTrend: '%5,2',
    shares: '402',
    sharesTrend: '%3,8',
    status: 'Aktif',
    date: '8 Mayıs 2024',
    photoTone: 'reservation',
  },
] as const;

const QR_SCAN_CHART_POINTS = [
  { label: '21 May', value: 900 },
  { label: '22 May', value: 880 },
  { label: '23 May', value: 1600 },
  { label: '24 May', value: 1020 },
  { label: '25 May', value: 1230 },
  { label: '26 May', value: 1190 },
  { label: '27 May', value: 1760 },
] as const;

const CAFE_PACKAGE_OPTIONS: Array<{
  key: CafePackageKey;
  title: string;
  description: string;
  badge: string;
}> = [
  {
    key: 'aylik',
    title: 'Aylık Plan',
    description: 'Esnek ödeme ve hızlı operasyon başlangıcı',
    badge: 'Esnek',
  },
  {
    key: 'yillik',
    title: 'Yıllık Plan',
    description: 'Daha uzun vadeli planlama ve sabit çalışma ritmi',
    badge: 'Tasarruflu',
  },
];

const DATE_RANGE_PRESETS: Array<{
  key: DateRangePreset;
  label: string;
  days: number;
}> = [
  { key: 'today', label: 'Bugün', days: 1 },
  { key: 'last7', label: 'Son 7 gün', days: 7 },
  { key: 'last14', label: 'Son 14 gün', days: 14 },
  { key: 'last30', label: 'Son 30 gün', days: 30 },
];

const formatCompactNumber = (value: number) => value.toLocaleString('tr-TR');

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
  });

const formatDateLabelWithYear = (date: Date) =>
  date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const toDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toStartOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

const toEndExclusive = (value: Date) => {
  const next = toStartOfDay(value);
  next.setDate(next.getDate() + 1);
  return next;
};

const getDateRangePresetByKey = (preset: DateRangePreset) =>
  DATE_RANGE_PRESETS.find((item) => item.key === preset) ?? null;

const createDateRange = (preset: DateRangePreset = 'last7') => {
  const endDate = toStartOfDay(new Date());
  const presetMeta = getDateRangePresetByKey(preset);
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - ((presetMeta?.days ?? 7) - 1));

  return {
    preset,
    start: toDateInputValue(startDate),
    end: toDateInputValue(endDate),
  } satisfies AdminDateRange;
};

const resolveDateInput = (value: string) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDateRangeBounds = (range: AdminDateRange) => {
  const fallback = createDateRange('last7');
  const start = resolveDateInput(range.start) ?? resolveDateInput(fallback.start)!;
  const end = resolveDateInput(range.end) ?? resolveDateInput(fallback.end)!;

  if (start <= end) {
    return {
      start,
      end,
      endExclusive: toEndExclusive(end),
    };
  }

  return {
    start: end,
    end: start,
    endExclusive: toEndExclusive(start),
  };
};

const getDateRangeDayCount = (range: AdminDateRange) => {
  const { start, end } = getDateRangeBounds(range);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diff / 86400000) + 1);
};

const formatDateRangeLabel = (range: AdminDateRange) => {
  const { start, end } = getDateRangeBounds(range);
  return `${formatDateLabel(start)} - ${formatDateLabel(end)}`;
};

const formatDateRangeButtonLabel = (range: AdminDateRange) => {
  const preset = getDateRangePresetByKey(range.preset);
  if (preset && range.preset !== 'custom') {
    return preset.label;
  }

  return formatDateRangeLabel(range);
};

const formatDateRangeMeta = (range: AdminDateRange) => {
  const { start, end } = getDateRangeBounds(range);
  return `${formatDateLabelWithYear(start)} - ${formatDateLabelWithYear(end)}`;
};

const isDateInsideRange = (value: Date | null, range: AdminDateRange) => {
  if (!value) {
    return false;
  }

  const { start, endExclusive } = getDateRangeBounds(range);
  return value >= start && value < endExclusive;
};

const normalizePackageKey = (value: unknown): CafePackageKey =>
  value === 'yillik' ? 'yillik' : 'aylik';

const getPackageMeta = (packageKey: CafePackageKey) =>
  CAFE_PACKAGE_OPTIONS.find((item) => item.key === packageKey) ?? CAFE_PACKAGE_OPTIONS[0];

const getNumericField = (data: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = data[key];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, value);
    }
  }

  return 0;
};

const normalizeMediaStatus = (value: unknown, hasMediaUrl: boolean): MediaStatus => {
  const normalized = normalizeLegacyText(value, '').toLocaleLowerCase('tr');

  if (['draft', 'taslak'].includes(normalized)) {
    return 'draft';
  }

  if (['passive', 'pasif', 'archived', 'gizli'].includes(normalized)) {
    return 'passive';
  }

  return hasMediaUrl ? 'published' : 'passive';
};

const getMediaStatusMeta = (status: MediaStatus) => {
  switch (status) {
    case 'draft':
      return { label: 'Taslak', className: 'is-draft' };
    case 'passive':
      return { label: 'Pasif', className: 'is-passive' };
    default:
      return { label: 'Yayında', className: 'is-published' };
  }
};

const getMetricTrendLabel = (currentValue: number, previousValue: number) => {
  if (currentValue <= 0) {
    return null;
  }

  if (previousValue <= 0) {
    return '↑ %100';
  }

  const percent = ((currentValue - previousValue) / previousValue) * 100;
  const prefix = percent >= 0 ? '↑' : '↓';
  return `${prefix} %${Math.abs(percent).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`;
};

const buildSmoothPath = (points: Array<{ x: number; y: number }>) => {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;
    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  return path;
};

const buildAreaPath = (points: Array<{ x: number; y: number }>, baseline: number) => {
  if (points.length === 0) {
    return '';
  }

  const first = points[0];
  const last = points[points.length - 1];
  return `${buildSmoothPath(points)} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
};

const formatCustomerDate = (value?: string) => {
  if (!value) {
    return 'Yeni kayıt';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Yeni kayıt';
  }

  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getCampaignStatusLabel = (status: string) => {
  switch (status) {
    case 'published':
      return 'Yayında';
    case 'completed':
      return 'Gönderildi';
    case 'sending':
      return 'Gönderiliyor';
    case 'scheduled':
      return 'Zamanlandı';
    case 'failed':
      return 'Başarısız';
    case 'archived':
      return 'Arşivlendi';
    default:
      return 'Taslak';
  }
};

const getCampaignStatusMeta = (status: string) => {
  switch (status) {
    case 'published':
      return { label: 'Yayında', className: 'is-draft' };
    case 'completed':
      return { label: 'Gönderildi', className: 'is-sent' };
    case 'sending':
      return { label: 'Gönderiliyor', className: 'is-scheduled' };
    case 'scheduled':
      return { label: 'Yayında', className: 'is-draft' };
    case 'failed':
      return { label: 'Başarısız', className: 'is-failed' };
    case 'archived':
      return { label: 'Arşivlendi', className: 'is-archived' };
    default:
      return { label: 'Taslak', className: 'is-draft' };
  }
};

const getCampaignTabKey = (status: string): CampaignTabKey => {
  if (status === 'failed' || status === 'archived') {
    return 'archived';
  }

  return 'published';
};

const getWebsiteCampaignStatusLabel = (status: string) =>
  status === 'archived' ? 'Yayından Kaldırıldı' : 'Yayında';

const getCampaignRecipientCount = (campaign: AdminCampaign) =>
  campaign.recipientCount ?? campaign._count?.recipients ?? 0;

const getCampaignOpenCount = (campaign: AdminCampaign) =>
  typeof campaign.openCount === 'number' && Number.isFinite(campaign.openCount)
    ? campaign.openCount
    : 0;

const getCampaignClickCount = (campaign: AdminCampaign) =>
  typeof campaign.clickCount === 'number' && Number.isFinite(campaign.clickCount)
    ? campaign.clickCount
    : 0;

const getPercent = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 1000) / 10 : 0;

const formatPercent = (value: number) =>
  `%${value.toLocaleString('tr-TR', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  })}`;

const formatCampaignDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const dateLabel = date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (isDateOnly) {
    return dateLabel;
  }

  const timeLabel = date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${dateLabel}\n${timeLabel}`;
};

const getCampaignTimelineValue = (campaign: AdminCampaign) => {
  if (campaign.status === 'completed' || campaign.status === 'sending' || campaign.status === 'failed') {
    return campaign.sentAt ?? campaign.createdAt ?? null;
  }

  if (campaign.status === 'scheduled') {
    return campaign.scheduledAt ?? null;
  }

  return null;
};

const getCampaignTimelineLabel = (campaign: AdminCampaign) => {
  if (campaign.status === 'published') {
    return 'Yayında';
  }

  if (campaign.status === 'completed') {
    return 'Gönderildi';
  }

  if (campaign.status === 'sending') {
    return 'Kuyrukta';
  }

  if (campaign.status === 'failed') {
    return 'Başarısız';
  }

  if (campaign.status === 'scheduled') {
    return 'Planlandı';
  }

  if (campaign.status === 'archived') {
    return 'Arşivde';
  }

  return 'Henüz gönderilmedi';
};

const getCampaignDescription = (campaign: AdminCampaign) => {
  const description = normalizeLegacyText(campaign.description ?? '', '');
  if (description) {
    return description;
  }

  const plain = normalizeLegacyText(campaign.textContent, '');
  if (!plain) {
    return 'Profesyonel kampanya içeriği';
  }

  const firstLine = plain.split(/[.!?\n]/)[0]?.trim();
  return firstLine || 'Profesyonel kampanya içeriği';
};

const resolveCampaignScheduleDate = (schedule: string) => {
  if (schedule === 'now') {
    return null;
  }

  const next = new Date();

  if (schedule === 'tomorrow-morning') {
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
    return next;
  }

  if (schedule === 'tomorrow-evening') {
    next.setDate(next.getDate() + 1);
    next.setHours(18, 0, 0, 0);
    return next;
  }

  if (schedule === 'sunday-morning') {
    const daysUntilSunday = (7 - next.getDay()) % 7 || 7;
    next.setDate(next.getDate() + daysUntilSunday);
    next.setHours(10, 0, 0, 0);
    return next;
  }

  return null;
};

const getFileNameFromUrl = (value: string) => {
  if (!value) {
    return '';
  }

  try {
    const url = new URL(value);
    const encodedPath = url.pathname.split('/o/')[1];
    if (!encodedPath) {
      return '';
    }

    const decodedPath = decodeURIComponent(encodedPath);
    const segments = decodedPath.split('/');
    return segments[segments.length - 1] ?? '';
  } catch {
    return '';
  }
};

const buildQrImageUrl = (targetUrl: string, size = 320) => {
  const dimension = `${size}x${size}`;
  return `${QR_IMAGE_BASE_URL}?size=${dimension}&margin=14&format=png&data=${encodeURIComponent(targetUrl)}`;
};

const isGoogleSyncedCustomer = (customer: EmailCustomer) => {
  const metadata = customer.metadata;

  return (
    metadata?.source === 'website-login' &&
    metadata?.authProvider === 'google.com' &&
    metadata?.emailVerified === true
  );
};

const getMediaDate = (value: AdminMediaItem['createdAt']) => {
  if (!value) {
    return null;
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getOptionalDate = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getCustomerCreatedDate = (customer: EmailCustomer) => getOptionalDate(customer.createdAt);

const getCampaignActivityDate = (campaign: AdminCampaign) =>
  getOptionalDate(campaign.sentAt) ?? getOptionalDate(campaign.updatedAt) ?? getOptionalDate(campaign.createdAt);

const normalizeFirestoreDate = (value: unknown) => {
  if (!value) {
    return null;
  }

  if (typeof (value as { toDate?: unknown })?.toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value === 'string') {
    return value;
  }

  return null;
};

const getErrorCode = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';

const buildWorkspaceDefaults = (slug: string) => ({
  ...DEFAULT_ADMIN_SETTINGS,
  cafeName:
    slug
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || DEFAULT_ADMIN_SETTINGS.cafeName,
});

export default function AdminPanel({
  cafeSlug,
  onCafeSlugChange,
  onBack,
  portalMode = 'admin',
  currentUserEmail = null,
  currentUserVerified = null,
  onOpenCafeEnvironment,
}: {
  cafeSlug: string;
  onCafeSlugChange: (slug: string) => void;
  onBack: () => void;
  portalMode?: PortalMode;
  currentUserEmail?: string | null;
  currentUserVerified?: boolean | null;
  onOpenCafeEnvironment?: (slug: string) => void;
}) {
  const isOwnerPortal = portalMode === 'owner';
  const isLocalDevelopmentHost =
    typeof window !== 'undefined' && ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<AdminMediaItem | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    // On localhost, initialize with test email
    if (isLocalDevelopmentHost) {
      console.log('[AdminPanel] Localhost: initializing with test email');
      return 'test-owner@localhost.local';
    }
    return null;
  });
  const [isEmailVerified, setIsEmailVerified] = useState(() => {
    // On localhost, mark email as verified so no verification gate appears
    if (isLocalDevelopmentHost) {
      console.log('[AdminPanel] Localhost: marking test email as verified');
      return true;
    }
    return false;
  });
  const [ownedWorkspaces, setOwnedWorkspaces] = useState<OwnedWorkspace[]>([]);
  const [mediaItems, setMediaItems] = useState<AdminMediaItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tableFilter, setTableFilter] = useState('all');
  const [sortMode, setSortMode] = useState<'newest' | 'likes'>('newest');
  const [galleryStatusFilter, setGalleryStatusFilter] = useState<GalleryStatusFilter>('all');
  const [galleryViewMode, setGalleryViewMode] = useState<GalleryViewMode>('grid');
  const [galleryPage, setGalleryPage] = useState(1);
  const [galleryPageSize, setGalleryPageSize] = useState(8);
  const [openMediaActionId, setOpenMediaActionId] = useState<string | null>(null);
  const [campaignTab, setCampaignTab] = useState<CampaignTabKey>('all');
  const [campaignSearchTerm, setCampaignSearchTerm] = useState('');
  const [campaignPage, setCampaignPage] = useState(1);
  const [campaignPageSize, setCampaignPageSize] = useState(6);
  const [openCampaignActionId, setOpenCampaignActionId] = useState<string | null>(null);
  const [isCampaignFilterOpen, setIsCampaignFilterOpen] = useState(false);
  const [campaignDataFilter, setCampaignDataFilter] = useState<CampaignDataFilter>('all');
  const [campaignComposerMode, setCampaignComposerMode] = useState<'closed' | 'create' | 'edit' | 'detail'>('closed');
  const [selectedCampaign, setSelectedCampaign] = useState<AdminCampaign | null>(null);
  const [activeView, setActiveView] = useState<AdminView>(() =>
    getStoredAdminView(portalMode, isOwnerPortal ? 'settings' : 'panel')
  );
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [dateRange, setDateRange] = useState<AdminDateRange>(() => createDateRange('last7'));
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [isChartDateRangeOpen, setIsChartDateRangeOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [hasSeenNotifications, setHasSeenNotifications] = useState(false);
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null);
  const [workspaceSlug, setWorkspaceSlug] = useState(() => normalizeCafeSlug(cafeSlug, DEFAULT_CAFE_SLUG));
  const [workspaceSlugDraft, setWorkspaceSlugDraft] = useState(() => normalizeCafeSlug(cafeSlug, DEFAULT_CAFE_SLUG));
  const [workspaceOwnerEmail, setWorkspaceOwnerEmail] = useState<string | null>(null);
  const [workspaceAdminEmails, setWorkspaceAdminEmails] = useState<string[]>([]);
  const [workspaceAccessError, setWorkspaceAccessError] = useState<string | null>(null);
  const [deletingWorkspaceSlug, setDeletingWorkspaceSlug] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{
    name: string;
    photoUrl: string | null;
    email: string | null;
  }>({
    name: '',
    photoUrl: null,
    email: null,
  });

  const [settings, setSettings] = useState(DEFAULT_ADMIN_SETTINGS);
  const [savedSettings, setSavedSettings] = useState(DEFAULT_ADMIN_SETTINGS);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailDashboard, setEmailDashboard] = useState<{
    sentToday: number;
    dailyLimitRemaining: number;
    totalCustomers: number;
    totalCampaigns: number;
  } | null>(null);
  const [websiteCampaigns, setWebsiteCampaigns] = useState<AdminCampaign[]>([]);
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>([]);
  const [emailCustomers, setEmailCustomers] = useState<EmailCustomer[]>([]);
  const [qrDashboard, setQrDashboard] = useState<QrDashboardResponse | null>(null);
  const [qrDashboardLoading, setQrDashboardLoading] = useState(false);
  const [qrDashboardError, setQrDashboardError] = useState<string | null>(null);
  const [qrStandSearchTerm, setQrStandSearchTerm] = useState('');
  const [qrStandStatusFilter, setQrStandStatusFilter] = useState<QrStandStatusFilter>('all');
  const [isQrRequestModalOpen, setIsQrRequestModalOpen] = useState(false);
  const [qrRequestSubmitting, setQrRequestSubmitting] = useState(false);
  const [qrRequestNotice, setQrRequestNotice] = useState<string | null>(null);
  const [qrRequestForm, setQrRequestForm] = useState({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    location: '',
    tableCount: '1',
    notes: '',
  });
  const [selectedAudienceKey, setSelectedAudienceKey] = useState('all');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(EMAIL_TEMPLATES[0].key);
  const [campaignSubjectInput, setCampaignSubjectInput] = useState(EMAIL_TEMPLATES[0].subject);
  const [campaignDescriptionInput, setCampaignDescriptionInput] = useState('');
  const [campaignImageUrlInput, setCampaignImageUrlInput] = useState('');
  const [campaignImageFileName, setCampaignImageFileName] = useState('');
  const [campaignImageUploadBusy, setCampaignImageUploadBusy] = useState(false);
  const [campaignTextInput, setCampaignTextInput] = useState(EMAIL_TEMPLATES[0].textContent);
  const [campaignStartDate, setCampaignStartDate] = useState('');
  const [campaignEndDate, setCampaignEndDate] = useState('');
  const [campaignTag, setCampaignTag] = useState('promosyon');
  const [campaignDiscountCode, setCampaignDiscountCode] = useState('');
  const [campaignLimit, setCampaignLimit] = useState('');
  const [campaignTerms, setCampaignTerms] = useState('');
  const [campaignTargetAudience, setCampaignTargetAudience] = useState('all');
  const [campaignSchedule, setCampaignSchedule] = useState(SEND_TIME_OPTIONS[0].value);
  const [campaignRepeat, setCampaignRepeat] = useState(REPEAT_OPTIONS[0].value);
  const [excludedAudienceEmails, setExcludedAudienceEmails] = useState<string[]>([]);
  const [emailActionBusy, setEmailActionBusy] = useState(false);
  const [emailAnalyticsSummary, setEmailAnalyticsSummary] = useState<{
    customersCreated: number;
    campaignsCreated: number;
    campaignsSent: number;
    recipientCount: number;
    sentCount: number;
    failedCount: number;
    deliveryRate: number;
    failureRate: number;
    latestCampaignSubject: string | null;
  } | null>(null);

  const dateRangePopoverRef = useRef<HTMLDivElement | null>(null);
  const chartDateRangePopoverRef = useRef<HTMLDivElement | null>(null);
  const notificationPopoverRef = useRef<HTMLDivElement | null>(null);
  const campaignImageFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (currentUserEmail) {
      console.log('[AdminPanel] Syncing email from props:', currentUserEmail);
      setUserEmail(currentUserEmail);
      setIsEmailVerified(Boolean(currentUserVerified));
      setIsLoading(false);
      return;
    }

    console.log('[AdminPanel] Props email is null, waiting for local auth');
    setIsEmailVerified(false);
    setIsLoading(false);
  }, [currentUserEmail, currentUserVerified]);

  useEffect(() => {
    setActiveView(getStoredAdminView(portalMode, isOwnerPortal ? 'settings' : 'panel'));
  }, [isOwnerPortal, portalMode]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 980px)');
    const syncViewport = (matches: boolean) => {
      setIsMobileViewport(matches);
      setIsMenuCollapsed(matches);
    };

    syncViewport(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      syncViewport(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!openMediaActionId) {
      return;
    }

    const closeMenu = () => setOpenMediaActionId(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMediaActionId]);

  useEffect(() => {
    if (!openCampaignActionId) {
      return;
    }

    const closeMenu = () => setOpenCampaignActionId(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openCampaignActionId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(`${ADMIN_VIEW_STORAGE_PREFIX}:${portalMode}`, activeView);
  }, [activeView, portalMode]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;

      if (dateRangePopoverRef.current && !dateRangePopoverRef.current.contains(target)) {
        setIsDateRangeOpen(false);
      }

      if (chartDateRangePopoverRef.current && !chartDateRangePopoverRef.current.contains(target)) {
        setIsChartDateRangeOpen(false);
      }

      if (notificationPopoverRef.current && !notificationPopoverRef.current.contains(target)) {
        setIsNotificationOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDateRangeOpen(false);
        setIsChartDateRangeOpen(false);
        setIsNotificationOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Always keep local auth listener active
  // It updates local state whenever Firebase auth changes
  useEffect(() => {
    console.log('[AdminPanel] Setting up persistent local auth listener');
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log('[AdminPanel] Firebase auth state changed:', user?.email || 'null');
      
      if (user) {
        console.log('[AdminPanel] Local listener: user logged in', user.email);
        setUserEmail(user.email ?? null);
        setIsEmailVerified(user.emailVerified);
        setUserProfile({
          name:
            user.displayName?.trim() ||
            user.email?.split('@')[0] ||
            DEFAULT_CAFE_NAME ||
            'Kullanıcı',
          photoUrl: user.photoURL ?? null,
          email: user.email ?? null,
        });
        if (!user.emailVerified) {
          console.warn('[ADMIN_PANEL] User email is not verified:', user.email);
        }
      } else {
        console.log('[AdminPanel] Local listener: user logged out');
        setUserEmail(null);
        setIsEmailVerified(false);
        setUserProfile({
          name: isLocalDevelopmentHost ? 'Test Hesabı' : '',
          photoUrl: null,
          email: null,
        });
      }

      setIsLoading(false);
    });

    return () => {
      console.log('[AdminPanel] Cleaning up auth listener');
      unsubscribeAuth();
    };
  }, [isLocalDevelopmentHost]);

  useEffect(() => {
    const nextSlug = normalizeCafeSlug(cafeSlug, DEFAULT_CAFE_SLUG);
    setWorkspaceSlug(nextSlug);
    setWorkspaceSlugDraft(nextSlug);
  }, [cafeSlug]);

  useEffect(() => {
    if (!userEmail || !isOwnerPortal) {
      setOwnedWorkspaces([]);
      return;
    }

    const normalizedEmail = normalizeAccessEmail(userEmail);
    if (!normalizedEmail) {
      setOwnedWorkspaces([]);
      return;
    }

    const unsubscribe = onSnapshot(
      query(collection(db, 'cafes'), where('ownerEmail', '==', normalizedEmail)),
      (snapshot) => {
        const nextWorkspaces = snapshot.docs
          .map((entry) => {
            const data = entry.data();
            return {
              slug: normalizeCafeSlug(data.cafeSlug ?? entry.id, entry.id),
              cafeName: normalizeLegacyText(data.cafeName, 'İsimsiz Kafe'),
            };
          })
          .sort((left, right) => left.cafeName.localeCompare(right.cafeName, 'tr'));

        setOwnedWorkspaces(nextWorkspaces);
      },
      (error) => {
        console.error('Owner workspace feed error:', error);
      }
    );

    return () => unsubscribe();
  }, [isOwnerPortal, userEmail]);

  useEffect(() => {
    if (!isOwnerPortal || ownedWorkspaces.length === 0) {
      return;
    }

    const workspaceExistsInOwnedList = ownedWorkspaces.some((workspace) => workspace.slug === workspaceSlug);
    if (workspaceExistsInOwnedList) {
      return;
    }

    const firstWorkspace = ownedWorkspaces[0];
    setWorkspaceSlug(firstWorkspace.slug);
    setWorkspaceSlugDraft(firstWorkspace.slug);
    onCafeSlugChange(firstWorkspace.slug);
  }, [isOwnerPortal, onCafeSlugChange, ownedWorkspaces, workspaceSlug]);

  useEffect(() => {
    if (!userEmail) {
      setMediaItems([]);
      setWebsiteCampaigns([]);
      setWorkspaceOwnerEmail(null);
      setWorkspaceAdminEmails([]);
      setWorkspaceAccessError(null);
      return;
    }

    const canBypassOwnerCheck = isLocalDevelopmentHost || hasSuperAdminAccess(userEmail);

    const unsubscribeSettings = onSnapshot(doc(db, 'cafes', workspaceSlug), (snapshot) => {
      if (!snapshot.exists()) {
        setWorkspaceOwnerEmail(null);
        setWorkspaceAdminEmails([]);
        setWorkspaceAccessError(null);
        const emptySettings = buildWorkspaceDefaults(workspaceSlug);
        setSettings(emptySettings);
        setSavedSettings(emptySettings);
        return;
      }

      const data = snapshot.data();
      const normalizedOwnerEmail = normalizeAccessEmail(data.ownerEmail);
      const normalizedAdmins = [
        ...(Array.isArray(data.adminEmails) ? data.adminEmails : []),
        ...(Array.isArray(data.admins) ? data.admins : []),
      ]
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => normalizeAccessEmail(entry))
        .filter(Boolean);

      setWorkspaceOwnerEmail(normalizedOwnerEmail);
      setWorkspaceAdminEmails(Array.from(new Set(normalizedAdmins)));

      if (
        isOwnerPortal &&
        normalizedOwnerEmail &&
        normalizedOwnerEmail !== normalizeAccessEmail(userEmail) &&
        !canBypassOwnerCheck
      ) {
        setWorkspaceAccessError('Bu kafe başka bir owner hesabına bağlı. Sadece kendi kafe alanlarını açabilirsin.');
        const emptySettings = buildWorkspaceDefaults(workspaceSlug);
        setSettings(emptySettings);
        setSavedSettings(emptySettings);
        return;
      }

      setWorkspaceAccessError(null);
      const nextSettings = {
        cafeName: normalizeLegacyText(data.cafeName, DEFAULT_ADMIN_SETTINGS.cafeName),
        accentColor:
          typeof data.accentColor === 'string' && data.accentColor
            ? data.accentColor
            : DEFAULT_ADMIN_SETTINGS.accentColor,
        handwritingFont: normalizeHandwritingFont(data.handwritingFont),
        campaignTarget:
          typeof data.campaignTarget === 'number' && Number.isFinite(data.campaignTarget)
            ? data.campaignTarget
            : DEFAULT_ADMIN_SETTINGS.campaignTarget,
        campaignReward: normalizeLegacyText(data.campaignReward, DEFAULT_ADMIN_SETTINGS.campaignReward),
        packageKey: normalizePackageKey(data.packageKey),
      };

      setSettings(nextSettings);
      setSavedSettings(nextSettings);
    });

    const unsubscribeMedia = onSnapshot(
      query(collection(db, 'media'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const nextItems: AdminMediaItem[] = [];

        snapshot.forEach((entry) => {
          const data = entry.data();
          if (data.type === 'video') {
            return;
          }
          const url = typeof data.url === 'string' ? data.url : '';

          nextItems.push({
            id: entry.id,
            url,
            caption: normalizeLegacyText(data.caption, DEFAULT_MEDIA_CAPTION),
            cafeSlug: normalizeCafeSlug(data.cafeSlug ?? DEFAULT_CAFE_SLUG),
            tableNumber: normalizeTableLabel(data.tableNumber, 'Masa'),
            date: normalizeLegacyText(data.date, '--:--'),
            likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
            viewsCount: getNumericField(data, ['viewsCount', 'viewCount', 'views', 'impressions']),
            shareCount: getNumericField(data, ['shareCount', 'sharesCount', 'shares']),
            qrInteractionCount: getNumericField(data, ['qrInteractionCount', 'qrScans', 'scanCount', 'qrClicks']),
            status: normalizeMediaStatus(data.status, Boolean(url)),
            createdAt: data.createdAt,
          });
        });

        setMediaItems(nextItems);
      },
      (error) => {
        console.error('Admin media feed error:', error);
      }
    );

    const unsubscribeWebsiteCampaigns = onSnapshot(
      query(collection(db, 'cafes', workspaceSlug, 'campaigns'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const nextCampaigns: AdminCampaign[] = [];

        snapshot.forEach((entry) => {
          const data = entry.data();
          const subject = normalizeLegacyText(data.subject, '').trim();
          const description = normalizeLegacyText(data.description, '').trim();
          const textContent = normalizeLegacyText(data.textContent, description);

          nextCampaigns.push({
            id: entry.id,
            subject: subject || 'Kampanya',
            description: description || null,
            imageUrl: typeof data.imageUrl === 'string' && data.imageUrl ? data.imageUrl : null,
            textContent: textContent || description || subject || 'Kampanya detayı',
            status: data.status === 'archived' ? 'archived' : 'published',
            startDate: null,
            endDate: null,
            tag: normalizeCampaignCategoryValue(typeof data.tag === 'string' ? data.tag : null),
            createdAt: normalizeFirestoreDate(data.createdAt),
            updatedAt: normalizeFirestoreDate(data.updatedAt),
            scheduledAt: null,
            sentAt: null,
            recipientCount: 0,
            sentCount: 0,
            failedCount: 0,
            openCount: 0,
            clickCount: 0,
          });
        });

        setWebsiteCampaigns(nextCampaigns);
      },
      (error) => {
        console.error('Website campaign feed error:', error);
        setWebsiteCampaigns([]);
      }
    );

    return () => {
      unsubscribeSettings();
      unsubscribeMedia();
      unsubscribeWebsiteCampaigns();
    };
  }, [isOwnerPortal, userEmail, workspaceSlug, isLocalDevelopmentHost]);

  const isSuperAdmin = hasSuperAdminAccess(userEmail);
  const normalizedUserEmail = normalizeAccessEmail(userEmail);
  const isWorkspaceAssignedToCurrentUser =
    Boolean(normalizedUserEmail) &&
    (normalizeAccessEmail(workspaceOwnerEmail) === normalizedUserEmail ||
      workspaceAdminEmails.some((email) => normalizeAccessEmail(email) === normalizedUserEmail));
  const hasPortalAccess = isLocalDevelopmentHost
    ? true
    : isOwnerPortal
      ? hasOwnerPortalAccess(userEmail) || isSuperAdmin || isWorkspaceAssignedToCurrentUser
      : isSuperAdmin || isWorkspaceAssignedToCurrentUser;
  const canViewActiveWorkspace =
    isLocalDevelopmentHost ||
    !isOwnerPortal ||
    isSuperAdmin ||
    !workspaceOwnerEmail ||
    normalizeAccessEmail(workspaceOwnerEmail) === normalizedUserEmail ||
    workspaceAdminEmails.some((email) => normalizeAccessEmail(email) === normalizedUserEmail);

  const workspaceMediaItems = useMemo(
    () => (canViewActiveWorkspace ? mediaItems.filter((item) => item.cafeSlug === workspaceSlug) : []),
    [canViewActiveWorkspace, mediaItems, workspaceSlug]
  );
  const selectedRangeMediaItems = useMemo(
    () =>
      workspaceMediaItems.filter((item) =>
        isDateInsideRange(getMediaDate(item.createdAt), dateRange)
      ),
    [dateRange, workspaceMediaItems]
  );
  const totalLikes = useMemo(
    () => selectedRangeMediaItems.reduce((sum, item) => sum + item.likesCount, 0),
    [selectedRangeMediaItems]
  );

  const todayUploadsCount = useMemo(() => {
    return selectedRangeMediaItems.length;
  }, [selectedRangeMediaItems]);
  const selectedRangeTableCount = useMemo(
    () =>
      new Set(
        selectedRangeMediaItems
          .map((item) => item.tableNumber)
          .filter((value) => value && value.trim().length > 0)
      ).size,
    [selectedRangeMediaItems]
  );

  const uniqueTables = useMemo(
    () =>
      Array.from(
        new Set<string>(
          workspaceMediaItems
            .map((item) => item.tableNumber)
            .filter((value) => value && value.trim().length > 0)
        )
      ).sort((left, right) => left.localeCompare(right, 'tr')),
    [workspaceMediaItems]
  );

  const topTable = useMemo(() => {
    if (selectedRangeMediaItems.length === 0) {
      return null;
    }

    const counters = new Map<string, number>();
    for (const item of selectedRangeMediaItems) {
      counters.set(item.tableNumber, (counters.get(item.tableNumber) ?? 0) + 1);
    }

    return Array.from(counters.entries()).sort((left, right) => right[1] - left[1])[0] ?? null;
  }, [selectedRangeMediaItems]);

  const tableActivity = useMemo(() => {
    const counters = new Map<string, number>();
    for (const item of selectedRangeMediaItems) {
      counters.set(item.tableNumber, (counters.get(item.tableNumber) ?? 0) + 1);
    }

    return Array.from(counters.entries())
      .map(([table, count]) => ({ table, count }))
      .sort((left, right) => right.count - left.count || left.table.localeCompare(right.table, 'tr'))
      .slice(0, 6);
  }, [selectedRangeMediaItems]);
  const averageLikesPerPostLabel = selectedRangeMediaItems.length > 0
    ? (totalLikes / selectedRangeMediaItems.length).toLocaleString('tr-TR', { maximumFractionDigits: 1 })
    : '0';
  const topTableSharePercent = topTable && selectedRangeMediaItems.length > 0
    ? Math.round((topTable[1] / selectedRangeMediaItems.length) * 100)
    : 0;
  const campaignProgressPercent = settings.campaignTarget > 0
    ? Math.min(100, Math.round((selectedRangeMediaItems.length / settings.campaignTarget) * 100))
    : 0;
  const emailSentToday = emailDashboard?.sentToday ?? 0;
  const emailRemainingToday = emailDashboard?.dailyLimitRemaining ?? 0;
  const emailLimitTotal = emailSentToday + emailRemainingToday;
  const emailLimitUsagePercent = emailLimitTotal > 0
    ? Math.round((emailSentToday / emailLimitTotal) * 100)
    : 0;

  const filteredMediaItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('tr');

    return [...workspaceMediaItems]
      .filter((item) => tableFilter === 'all' || item.tableNumber === tableFilter)
      .filter((item) => galleryStatusFilter === 'all' || item.status === galleryStatusFilter)
      .filter((item) => {
        if (!normalizedSearch) {
          return true;
        }

        const haystack = `${item.caption} ${item.tableNumber} ${item.date}`.toLocaleLowerCase('tr');
        return haystack.includes(normalizedSearch);
      })
      .sort((left, right) => {
        if (sortMode === 'likes') {
          return right.likesCount - left.likesCount;
        }

        const leftDate = getMediaDate(left.createdAt)?.getTime() ?? 0;
        const rightDate = getMediaDate(right.createdAt)?.getTime() ?? 0;
        return rightDate - leftDate;
      });
  }, [galleryStatusFilter, workspaceMediaItems, searchTerm, sortMode, tableFilter]);

  const currentMonthMediaItems = useMemo(() => {
    const now = new Date();
    return workspaceMediaItems.filter((item) => {
      const itemDate = getMediaDate(item.createdAt);
      return (
        itemDate &&
        itemDate.getFullYear() === now.getFullYear() &&
        itemDate.getMonth() === now.getMonth()
      );
    });
  }, [workspaceMediaItems]);

  const previousMonthMediaItems = useMemo(() => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    return workspaceMediaItems.filter((item) => {
      const itemDate = getMediaDate(item.createdAt);
      return (
        itemDate &&
        itemDate.getFullYear() === previousMonth.getFullYear() &&
        itemDate.getMonth() === previousMonth.getMonth()
      );
    });
  }, [workspaceMediaItems]);

  const galleryTotalViews = useMemo(
    () => workspaceMediaItems.reduce((sum, item) => sum + item.viewsCount, 0),
    [workspaceMediaItems]
  );
  const galleryTotalShares = useMemo(
    () => workspaceMediaItems.reduce((sum, item) => sum + item.shareCount, 0),
    [workspaceMediaItems]
  );
  const galleryQrInteractions = useMemo(
    () => workspaceMediaItems.reduce((sum, item) => sum + item.qrInteractionCount, 0),
    [workspaceMediaItems]
  );
  const galleryCurrentMonthViews = useMemo(
    () => currentMonthMediaItems.reduce((sum, item) => sum + item.viewsCount, 0),
    [currentMonthMediaItems]
  );
  const galleryPreviousMonthViews = useMemo(
    () => previousMonthMediaItems.reduce((sum, item) => sum + item.viewsCount, 0),
    [previousMonthMediaItems]
  );
  const galleryCurrentMonthLikes = useMemo(
    () => currentMonthMediaItems.reduce((sum, item) => sum + item.likesCount, 0),
    [currentMonthMediaItems]
  );
  const galleryPreviousMonthLikes = useMemo(
    () => previousMonthMediaItems.reduce((sum, item) => sum + item.likesCount, 0),
    [previousMonthMediaItems]
  );
  const galleryCurrentMonthShares = useMemo(
    () => currentMonthMediaItems.reduce((sum, item) => sum + item.shareCount, 0),
    [currentMonthMediaItems]
  );
  const galleryPreviousMonthShares = useMemo(
    () => previousMonthMediaItems.reduce((sum, item) => sum + item.shareCount, 0),
    [previousMonthMediaItems]
  );
  const galleryCurrentMonthQr = useMemo(
    () => currentMonthMediaItems.reduce((sum, item) => sum + item.qrInteractionCount, 0),
    [currentMonthMediaItems]
  );
  const galleryPreviousMonthQr = useMemo(
    () => previousMonthMediaItems.reduce((sum, item) => sum + item.qrInteractionCount, 0),
    [previousMonthMediaItems]
  );

  const galleryTotalPages = Math.max(1, Math.ceil(filteredMediaItems.length / galleryPageSize));
  const galleryVisibleItems = useMemo(() => {
    const startIndex = (galleryPage - 1) * galleryPageSize;
    return filteredMediaItems.slice(startIndex, startIndex + galleryPageSize);
  }, [filteredMediaItems, galleryPage, galleryPageSize]);
  const galleryPageNumbers = useMemo(() => {
    const pages = Array.from({ length: galleryTotalPages }, (_, index) => index + 1);
    if (pages.length <= 5) {
      return pages;
    }

    const middlePages = pages.filter((page) => Math.abs(page - galleryPage) <= 1);
    return Array.from(new Set([1, ...middlePages, galleryTotalPages])).sort((left, right) => left - right);
  }, [galleryPage, galleryTotalPages]);

  useEffect(() => {
    setGalleryPage(1);
  }, [galleryPageSize, galleryStatusFilter, searchTerm, sortMode, tableFilter, workspaceSlug]);

  useEffect(() => {
    setGalleryPage((current) => Math.min(current, galleryTotalPages));
  }, [galleryTotalPages]);

  const tableOptions = useMemo(
    () => [
      {
        value: 'all',
        label: 'Tüm QR Standlar',
        hint: 'Bütün standlardan gelen fotoğraflar',
      },
      ...uniqueTables.map((table) => ({
        value: table,
        label: table,
        hint: 'Yalnız bu standa ait fotoğraflar',
      })),
    ],
    [uniqueTables]
  );
  const galleryMetricCards: Array<{
    label: string;
    value: string;
    footer: string;
    trend?: string | null;
    action?: string;
    icon: LucideIcon;
  }> = [
    {
      label: 'Toplam Galeri',
      value: formatCompactNumber(workspaceMediaItems.length),
      footer: 'Tüm zamanlar',
      action: 'Tümünü Gör',
      icon: ImageIcon,
    },
    {
      label: 'Toplam Görüntülenme',
      value: formatCompactNumber(galleryTotalViews),
      footer: 'Bu ay',
      trend: getMetricTrendLabel(galleryCurrentMonthViews, galleryPreviousMonthViews),
      icon: Eye,
    },
    {
      label: 'Toplam Beğeni',
      value: formatCompactNumber(workspaceMediaItems.reduce((sum, item) => sum + item.likesCount, 0)),
      footer: 'Bu ay',
      trend: getMetricTrendLabel(galleryCurrentMonthLikes, galleryPreviousMonthLikes),
      icon: Heart,
    },
    {
      label: 'Toplam Paylaşım',
      value: formatCompactNumber(galleryTotalShares),
      footer: 'Bu ay',
      trend: getMetricTrendLabel(galleryCurrentMonthShares, galleryPreviousMonthShares),
      icon: Share2,
    },
    {
      label: 'QR Etkileşim',
      value: formatCompactNumber(galleryQrInteractions),
      footer: 'Bu ay',
      trend: getMetricTrendLabel(galleryCurrentMonthQr, galleryPreviousMonthQr),
      icon: QrCode,
    },
  ];

  const settingsDirty = useMemo(
    () =>
      settings.cafeName !== savedSettings.cafeName ||
      settings.accentColor !== savedSettings.accentColor ||
      settings.handwritingFont !== savedSettings.handwritingFont ||
      settings.campaignTarget !== savedSettings.campaignTarget ||
      settings.campaignReward !== savedSettings.campaignReward ||
      settings.packageKey !== savedSettings.packageKey,
    [savedSettings, settings]
  );
  const effectiveWorkspaceSlug = useMemo(
    () =>
      normalizeOptionalCafeSlug(workspaceSlugDraft) ||
      normalizeOptionalCafeSlug(settings.cafeName) ||
      workspaceSlug ||
      DEFAULT_CAFE_SLUG,
    [settings.cafeName, workspaceSlug, workspaceSlugDraft]
  );
  const workspaceDraftChanged = effectiveWorkspaceSlug !== workspaceSlug;
  const canManageActiveWorkspace =
    Boolean(userEmail) &&
    canViewActiveWorkspace;
  const canManageWorkspace = Boolean(userEmail) && (workspaceDraftChanged || canManageActiveWorkspace);
  const activeViewCopy: Record<AdminView, { title: string; kicker: string; description: string }> = {
    panel: {
      title: `Hoş geldin, ${settings.cafeName || DEFAULT_CAFE_NAME}!`,
      kicker: 'Genel Bakış',
      description: 'Seçili tarih aralığında neler oluyor bir göz atalım.',
    },
    posts: {
      title: 'Canlı Galeri',
      kicker: 'Galeri Yönetimi',
      description: 'Kafeye ait yüklenen fotoğrafları arayın, filtreleyin ve gerektiğinde kaldırın.',
    },
    campaigns: {
      title: 'Kampanyalar',
      kicker: 'Aktif Kampanya',
      description: 'Paylaşım hedefini, ödül metnini ve misafire gösterilecek kampanya deneyimini düzenleyin.',
    },
    qr: {
      title: 'QR Standlar',
      kicker: 'Masa Deneyimi',
      description: 'Standları, masa sayılarını ve kurulum taleplerini tek yerden yönetin.',
    },
    customers: {
      title: 'Müşteriler',
      kicker: 'Misafir Listesi',
      description: 'Google ile doğrulanmış misafirleri, kayıt durumlarını ve e-posta geçmişini takip edin.',
    },
    marketing: {
      title: 'E-posta Pazarlama',
      kicker: 'Misafir İletişimi',
      description: 'Misafir gruplarına hazır şablonlarla kampanya e-postası hazırlayın ve gönderin.',
    },
    templates: {
      title: 'Şablonlar',
      kicker: 'Hazır Metinler',
      description: 'Kampanya e-postaları için hazır Türkçe metinleri inceleyin ve seçin.',
    },
    stats: {
      title: 'İstatistikler',
      kicker: 'Performans',
      description: 'Paylaşım, beğeni, masa ve pazarlama sinyallerini okunur bir özetle takip edin.',
    },
    settings: {
      title: 'Ayarlar',
      kicker: 'Kafe ve Marka',
      description: 'Kafe kodunu, genel bağlantıları, marka adını, renkleri ve tema görünümünü buradan yönetin.',
    },
  };
  const currentPageCopy = activeViewCopy[activeView];
  const panelTitle = currentPageCopy.title;
  const panelPill = isOwnerPortal ? 'Kafe Sahibi Merkezi' : 'Yönetim Merkezi';
  const loginPill = isOwnerPortal ? 'Kafe Sahibi Erişimi' : 'Yönetim Erişimi';
  const loginTitle = isOwnerPortal ? 'Kafe Sahibi Girişi' : 'Yönetim Paneli';
  const publicGalleryLink = useMemo(
    () => buildCafePublicLink({ origin: window.location.origin, cafeSlug: effectiveWorkspaceSlug }),
    [effectiveWorkspaceSlug]
  );
  const publicQrExampleLink = useMemo(
    () =>
      buildCafePublicLink({
        origin: window.location.origin,
        cafeSlug: effectiveWorkspaceSlug,
        tableLabel: DEFAULT_DEMO_TABLE,
      }),
    [effectiveWorkspaceSlug]
  );

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Giriş hatası:', error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleSwitchAccount = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Hesap değiştirirken çıkış hatası:', error);
    }

    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Hesap değiştirirken giriş hatası:', error);
    }
  };

  const openAdminView = useCallback((nextView: AdminView) => {
    setActiveView(nextView);
    setIsDateRangeOpen(false);
    setIsChartDateRangeOpen(false);
    setIsNotificationOpen(false);

    if (isMobileViewport) {
      setIsMenuCollapsed(true);
    }
  }, [isMobileViewport]);

  const applyWorkspaceSlug = async () => {
    const nextSlug = effectiveWorkspaceSlug;

    if (!nextSlug) {
      return;
    }

    if (isOwnerPortal && !isLocalDevelopmentHost && !isSuperAdmin) {
      try {
        const targetSnapshot = await getDoc(doc(db, 'cafes', nextSlug));
        if (targetSnapshot.exists()) {
          const targetOwnerEmail = normalizeAccessEmail(targetSnapshot.data().ownerEmail);
          if (targetOwnerEmail && targetOwnerEmail !== normalizedUserEmail) {
            setWorkspaceAccessError('Bu kafe başka bir owner hesabına bağlı. Sadece kendi kafe alanlarını açabilirsin.');
            return;
          }
        }
      } catch (error) {
        console.error('Workspace ownership check failed:', error);
        setWorkspaceAccessError('Kafe alanı doğrulanırken bir hata oluştu. Lütfen tekrar deneyin.');
        return;
      }
    }

    setWorkspaceAccessError(null);
    setWorkspaceSlug(nextSlug);
    setWorkspaceSlugDraft(nextSlug);
    onCafeSlugChange(nextSlug);
  };

  const selectOwnedWorkspace = (slug: string) => {
    const nextSlug = normalizeCafeSlug(slug, DEFAULT_CAFE_SLUG);
    setWorkspaceAccessError(null);
    setWorkspaceSlug(nextSlug);
    setWorkspaceSlugDraft(nextSlug);
    onCafeSlugChange(nextSlug);
  };

  const handleDeleteOwnedWorkspace = async (slug: string) => {
    if (!userEmail || !isOwnerPortal) {
      return;
    }

    const normalizedSlug = normalizeCafeSlug(slug, DEFAULT_CAFE_SLUG);
    const workspaceInOwnerList = ownedWorkspaces.some((workspace) => workspace.slug === normalizedSlug);

    if (!workspaceInOwnerList && !isLocalDevelopmentHost && !isSuperAdmin) {
      alert('Bu kafe alanını silme yetkin bulunmuyor.');
      return;
    }

    const confirmation = window.confirm(
      'Bu kafe alanını silmek üzeresiniz. İlgili galeri paylaşımları da kalıcı olarak silinecek. Devam etmek istiyor musunuz?'
    );

    if (!confirmation) {
      return;
    }

    setDeletingWorkspaceSlug(normalizedSlug);

    try {
      const relatedMediaSnapshot = await getDocs(
        query(collection(db, 'media'), where('cafeSlug', '==', normalizedSlug))
      );

      for (const entry of relatedMediaSnapshot.docs) {
        const data = entry.data();
        await deleteMediaRecord(entry.id, typeof data.url === 'string' ? data.url : undefined);
      }

      await deleteDoc(doc(db, 'cafes', normalizedSlug));

      const remainingWorkspaces = ownedWorkspaces.filter((workspace) => workspace.slug !== normalizedSlug);
      if (workspaceSlug === normalizedSlug) {
        const fallbackSlug = remainingWorkspaces[0]?.slug ?? DEFAULT_CAFE_SLUG;
        setWorkspaceSlug(fallbackSlug);
        setWorkspaceSlugDraft(fallbackSlug);
        onCafeSlugChange(fallbackSlug);
      }

      alert('Kafe alanı silindi.');
    } catch (error) {
      console.error('Workspace delete failed:', error);
      alert('Kafe alanı silinirken bir hata oluştu.');
    } finally {
      setDeletingWorkspaceSlug(null);
    }
  };

  const openBrandView = () => {
    openAdminView('settings');
  };

  const openDashboardView = () => {
    openAdminView('panel');
  };

  const emailAudienceGroups = useMemo<EmailAudienceGroup[]>(() => {
    const allCustomers = emailCustomers;

    return [
      {
        key: 'all',
        label: 'Tüm misafirler',
        description: 'Kafeye kayıtlı bütün e-posta adresleri',
        customers: allCustomers,
      },
      {
        key: 'active',
        label: 'Çok aktif misafirler',
        description: 'En az 3 kez geri dönüş yapanlar',
        customers: allCustomers.filter((customer) => (customer._count?.recipients ?? 0) >= 3),
      },
      {
        key: 'regular',
        label: 'Düzenli misafirler',
        description: '1 veya 2 kez geri dönüş yapanlar',
        customers: allCustomers.filter((customer) => {
          const count = customer._count?.recipients ?? 0;
          return count >= 1 && count < 3;
        }),
      },
      {
        key: 'new',
        label: 'Yeni misafirler',
        description: 'Henüz mesaj gönderilmemiş olanlar',
        customers: allCustomers.filter((customer) => (customer._count?.recipients ?? 0) === 0),
      },
    ];
  }, [emailCustomers]);

  const selectedAudience = emailAudienceGroups.find((group) => group.key === selectedAudienceKey) ?? emailAudienceGroups[0];
  const selectedAudienceCustomers = selectedAudience?.customers ?? [];
  const excludedAudienceEmailSet = new Set(excludedAudienceEmails);
  const selectedAudienceEmails = selectedAudienceCustomers
    .map((customer) => customer.email)
    .filter((email) => !excludedAudienceEmailSet.has(email));
  const selectedAudienceCount = selectedAudienceEmails.length;
  const selectedTemplate = EMAIL_TEMPLATES.find((template) => template.key === selectedTemplateKey) ?? EMAIL_TEMPLATES[0];
  const emailCustomerTotal = emailDashboard?.totalCustomers ?? emailCustomers.length;
  const rangeCustomerRows = useMemo(
    () => emailCustomers.filter((customer) => isDateInsideRange(getCustomerCreatedDate(customer), dateRange)),
    [dateRange, emailCustomers]
  );
  const rangeCampaignRows = useMemo(
    () => emailCampaigns.filter((campaign) => isDateInsideRange(getCampaignActivityDate(campaign), dateRange)),
    [dateRange, emailCampaigns]
  );
  const recentMediaItems = useMemo(
    () =>
      [...selectedRangeMediaItems]
        .sort((left, right) => {
          const leftDate = getMediaDate(left.createdAt)?.getTime() ?? 0;
          const rightDate = getMediaDate(right.createdAt)?.getTime() ?? 0;
          return rightDate - leftDate;
        })
        .slice(0, 5),
    [selectedRangeMediaItems]
  );
  const recentCustomerRows = useMemo(() => rangeCustomerRows.slice(0, 4), [rangeCustomerRows]);
  const dashboardDateRangeLabel = useMemo(() => formatDateRangeLabel(dateRange), [dateRange]);
  const dashboardDateRangeMeta = useMemo(() => formatDateRangeMeta(dateRange), [dateRange]);
  const chartDateRangeButtonLabel = dashboardDateRangeLabel;
  const campaignDateRangeLabel = dashboardDateRangeLabel;
  const dashboardChartData = useMemo(() => {
    const { start } = getDateRangeBounds(dateRange);
    const dayCount = getDateRangeDayCount(dateRange);

    return Array.from({ length: dayCount }, (_, index) => {
      const dayStart = new Date(start);
      dayStart.setDate(start.getDate() + index);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      const dayItems = selectedRangeMediaItems.filter((item) => {
        const itemDate = getMediaDate(item.createdAt);
        return itemDate ? itemDate >= dayStart && itemDate < dayEnd : false;
      });

      return {
        date: dayStart,
        isoDate: toDateInputValue(dayStart),
        label: formatDateLabel(dayStart),
        shortLabel: dayStart.toLocaleDateString('tr-TR', { day: '2-digit' }),
        photos: dayItems.length,
        likes: dayItems.reduce((sum, item) => sum + item.likesCount, 0),
      };
    });
  }, [dateRange, selectedRangeMediaItems]);
  const chartMaxValue = Math.max(
    1,
    ...dashboardChartData.flatMap((point) => [point.photos, point.likes])
  );
  const chartGeometry = useMemo(() => {
    const width = 720;
    const height = 210;
    const paddingX = 34;
    const paddingY = 24;
    const innerWidth = width - paddingX * 2;
    const innerHeight = height - paddingY * 2;
    const denominator = Math.max(1, dashboardChartData.length - 1);
    const getX = (index: number) => paddingX + (index / denominator) * innerWidth;
    const getY = (value: number) => paddingY + innerHeight - (value / chartMaxValue) * innerHeight;
    const photoPoints = dashboardChartData.map((point, index) => ({
      x: getX(index),
      y: getY(point.photos),
    }));
    const likePoints = dashboardChartData.map((point, index) => ({
      x: getX(index),
      y: getY(point.likes),
    }));
    const baseline = paddingY + innerHeight;
    const labelStep = dashboardChartData.length > 8 ? Math.ceil(dashboardChartData.length / 7) : 1;

    return {
      width,
      height,
      baseline,
      photoPath: buildSmoothPath(photoPoints),
      likePath: buildSmoothPath(likePoints),
      areaPath: buildAreaPath(photoPoints, baseline),
      points: dashboardChartData.map((point, index) => ({
        ...point,
        x: getX(index),
        photoY: getY(point.photos),
        likeY: getY(point.likes),
      })),
      labelStep,
    };
  }, [chartMaxValue, dashboardChartData]);
  const activeChartIndex =
    hoveredChartIndex !== null && hoveredChartIndex >= 0 && hoveredChartIndex < chartGeometry.points.length
      ? hoveredChartIndex
      : null;
  const activeChartPoint = activeChartIndex !== null ? chartGeometry.points[activeChartIndex] : null;
  const emailRecipientTotal =
    emailAnalyticsSummary?.recipientCount ??
    rangeCampaignRows.reduce((sum, campaign) => sum + (campaign.recipientCount ?? 0), 0);
  const emailDeliveredTotal =
    emailAnalyticsSummary?.sentCount ??
    rangeCampaignRows.reduce((sum, campaign) => sum + (campaign.sentCount ?? 0), 0);
  const emailFailedTotal =
    emailAnalyticsSummary?.failedCount ??
    rangeCampaignRows.reduce((sum, campaign) => sum + (campaign.failedCount ?? 0), 0);
  const emailDeliveryRate =
    emailAnalyticsSummary?.deliveryRate ??
    (emailRecipientTotal > 0 ? Math.round((emailDeliveredTotal / emailRecipientTotal) * 100) : 0);
  const emailFailureRate =
    emailAnalyticsSummary?.failureRate ??
    (emailRecipientTotal > 0 ? Math.round((emailFailedTotal / emailRecipientTotal) * 100) : 0);
  const rangeCustomerCount = emailAnalyticsSummary?.customersCreated ?? rangeCustomerRows.length;
  const rangeCampaignCount = emailAnalyticsSummary?.campaignsCreated ?? rangeCampaignRows.length;
  const rangeSentCampaignCount =
    emailAnalyticsSummary?.campaignsSent ??
    rangeCampaignRows.filter((campaign) => Boolean(campaign.sentAt)).length;
  const remainingRewardCount = Math.max(0, settings.campaignTarget - selectedRangeMediaItems.length);
  const campaignParticipantCount = Math.min(selectedRangeMediaItems.length, settings.campaignTarget);
  const currentPackageMeta = getPackageMeta(settings.packageKey);
  const qrStandRows = useMemo(() => {
    const fallbackTables = ['Masa 1', 'Masa 2', DEFAULT_DEMO_TABLE].filter(Boolean);
    const sourceTables = uniqueTables.length > 0 ? uniqueTables : fallbackTables;

    return Array.from(new Set(sourceTables)).slice(0, 6).map((table) => {
      const shareCount = workspaceMediaItems.filter((item) => item.tableNumber === table).length;
      return {
        table,
        url: buildCafePublicLink({
          origin: window.location.origin,
          cafeSlug: effectiveWorkspaceSlug,
          tableLabel: table,
        }),
        shareCount,
      };
    });
  }, [effectiveWorkspaceSlug, uniqueTables, workspaceMediaItems]);
  const qrDashboardSummary = qrDashboard?.summary ?? {
    totalStands: 0,
    totalTables: 0,
    activeStands: 0,
    pendingRequests: 0,
    averageTablesPerStand: 0,
    largestStand: null,
    latestRequestAt: null,
  };
  const qrDashboardRows = qrDashboard?.stands ?? [];
  const qrDashboardMetrics: Array<{
    label: string;
    value: string;
    helper: string;
    icon: LucideIcon;
    tone: 'violet' | 'mint' | 'blue' | 'amber' | 'rose';
  }> = [
    {
      label: 'Toplam Stand',
      value: formatCompactNumber(qrDashboardSummary.totalStands),
      helper: 'Kayıtlı stand sayısı',
      icon: QrCode,
      tone: 'violet',
    },
    {
      label: 'Toplam Masa',
      value: formatCompactNumber(qrDashboardSummary.totalTables),
      helper: 'Standlara dağıtılmış masa sayısı',
      icon: Grid3X3,
      tone: 'mint',
    },
    {
      label: 'Aktif Stand',
      value: formatCompactNumber(qrDashboardSummary.activeStands),
      helper: 'Kullanıma hazır alanlar',
      icon: TrendingUp,
      tone: 'blue',
    },
    {
      label: 'Bekleyen Talep',
      value: formatCompactNumber(qrDashboardSummary.pendingRequests),
      helper: 'Kurulum için dönüş bekleyen talepler',
      icon: Bell,
      tone: 'amber',
    },
    {
      label: 'Ort. Masa / Stand',
      value: formatCompactNumber(qrDashboardSummary.averageTablesPerStand),
      helper: qrDashboardSummary.largestStand
        ? `${qrDashboardSummary.largestStand.name} en büyük stand`
        : 'Henüz kayıtlı stand yok',
      icon: BarChart3,
      tone: 'rose',
    },
  ];
  const packageStandLimit = Math.max(settings.packageKey === 'yillik' ? 20 : 5, qrStandRows.length, 1);
  const packageStandUsagePercent = Math.min(100, Math.round((qrStandRows.length / packageStandLimit) * 100));
  const dashboardMetricCards: Array<{
    label: string;
    value: string;
    trend: string;
    icon: LucideIcon;
    tone: 'amber' | 'rose' | 'violet' | 'green';
  }> = [
    {
      label: 'Toplam Fotoğraf',
      value: formatCompactNumber(selectedRangeMediaItems.length),
      trend: selectedRangeTableCount > 0 ? `${selectedRangeTableCount} aktif masa` : 'Bu aralıkta masa verisi yok',
      icon: ImageIcon,
      tone: 'amber',
    },
    {
      label: 'Toplam Beğeni',
      value: formatCompactNumber(totalLikes),
      trend: `Ortalama ${averageLikesPerPostLabel} beğeni`,
      icon: Heart,
      tone: 'rose',
    },
    {
      label: 'Yeni Müşteri',
      value: formatCompactNumber(rangeCustomerCount),
      trend: `${recentCustomerRows.length} son kayıt görünür`,
      icon: Users,
      tone: 'violet',
    },
    {
      label: 'Gönderilen E-posta',
      value: formatCompactNumber(emailDeliveredTotal),
      trend: `${rangeSentCampaignCount} kampanya gönderimi`,
      icon: Mail,
      tone: 'green',
    },
  ];
  const emailPerformanceCards = [
    {
      label: 'Gönderilen',
      value: formatCompactNumber(emailDeliveredTotal),
      detail: `${emailRecipientTotal} alıcı`,
      icon: SendHorizontal,
      tone: 'blue',
    },
    {
      label: 'Teslim Oranı',
      value: emailRecipientTotal > 0 ? `%${emailDeliveryRate}` : '%0',
      detail: `${rangeSentCampaignCount} gönderim`,
      icon: Mail,
      tone: 'green',
    },
    {
      label: 'Başarısız',
      value: formatCompactNumber(emailFailedTotal),
      detail: emailRecipientTotal > 0 ? `%${emailFailureRate} hata oranı` : 'Hata görünmüyor',
      icon: Megaphone,
      tone: 'purple',
    },
    {
      label: 'Yeni Alıcı',
      value: formatCompactNumber(rangeCustomerCount),
      detail: `${rangeCampaignCount} kampanya taslağı`,
      icon: Gift,
      tone: 'orange',
    },
  ];
  const campaignActiveRows = useMemo(
    () => websiteCampaigns.filter((campaign) => getCampaignTabKey(campaign.status) !== 'archived'),
    [websiteCampaigns]
  );
  const campaignPublishedCount = campaignActiveRows.filter((campaign) => getCampaignTabKey(campaign.status) === 'published').length;
  const campaignWithImageCount = campaignActiveRows.filter((campaign) => Boolean(campaign.imageUrl)).length;
  const campaignArchivedCount = websiteCampaigns.filter((campaign) => getCampaignTabKey(campaign.status) === 'archived').length;
  const campaignTotalCount = websiteCampaigns.length;
  const latestWebsiteCampaign = campaignActiveRows[0] ?? null;
  const campaignMetricCards: Array<{
    label: string;
    value: string;
    footer: string;
    trend?: string | null;
    action?: string;
    icon: LucideIcon;
  }> = [
    {
      label: 'Toplam Kampanya',
      value: formatCompactNumber(campaignTotalCount),
      footer: 'Yayın listesi',
      action: 'Tümünü Gör',
      icon: Megaphone,
    },
    {
      label: 'Yayında',
      value: formatCompactNumber(campaignPublishedCount),
      footer: 'Ziyaretçilere görünür',
      icon: Eye,
    },
    {
      label: 'Görselli',
      value: formatCompactNumber(campaignWithImageCount),
      footer: 'Görselle öne çıkan',
      icon: ImageIcon,
    },
    {
      label: 'Yayından Kaldırılan',
      value: formatCompactNumber(campaignArchivedCount),
      footer: 'Yayında değil',
      icon: Archive,
    },
  ];
  const campaignFilteredRows = useMemo(() => {
    const normalizedSearch = campaignSearchTerm.trim().toLocaleLowerCase('tr');

    const rowsForTab = campaignTab === 'all'
      ? websiteCampaigns
      : websiteCampaigns.filter((campaign) => getCampaignTabKey(campaign.status) === campaignTab);

    return rowsForTab
      .filter((campaign) => {
        if (campaignDataFilter === 'withImage') {
          return Boolean(campaign.imageUrl);
        }

        if (campaignDataFilter === 'withoutImage') {
          return !campaign.imageUrl;
        }

        if (campaignDataFilter === 'last7' || campaignDataFilter === 'last30') {
          const date = getCampaignActivityDate(campaign);
          if (!date) {
            return false;
          }

          const days = campaignDataFilter === 'last7' ? 7 : 30;
          const start = toStartOfDay(new Date());
          start.setDate(start.getDate() - (days - 1));
          return date >= start;
        }

        return true;
      })
      .filter((campaign) => {
        if (!normalizedSearch) {
          return true;
        }

        const haystack = `${campaign.subject} ${campaign.description ?? ''} ${campaign.textContent}`.toLocaleLowerCase('tr');
        return haystack.includes(normalizedSearch);
      });
  }, [campaignDataFilter, campaignSearchTerm, campaignTab, websiteCampaigns]);
  const campaignDataFilterLabel =
    CAMPAIGN_DATA_FILTERS.find((filter) => filter.key === campaignDataFilter)?.label ?? 'Tüm kampanyalar';
  const campaignTotalPages = Math.max(1, Math.ceil(campaignFilteredRows.length / campaignPageSize));
  const campaignVisibleRows = useMemo(() => {
    const startIndex = (campaignPage - 1) * campaignPageSize;
    return campaignFilteredRows.slice(startIndex, startIndex + campaignPageSize);
  }, [campaignFilteredRows, campaignPage, campaignPageSize]);
  const campaignPageNumbers = useMemo(() => {
    const pages = Array.from({ length: campaignTotalPages }, (_, index) => index + 1);
    if (pages.length <= 5) {
      return pages;
    }

    const middlePages = pages.filter((page) => Math.abs(page - campaignPage) <= 1);
    return Array.from(new Set([1, ...middlePages, campaignTotalPages])).sort((left, right) => left - right);
  }, [campaignPage, campaignTotalPages]);
  const campaignPreviewRows = useMemo(() => campaignActiveRows.slice(0, 3), [campaignActiveRows]);
  const campaignStatusCounts = useMemo(() => {
    const counts: Record<CampaignTabKey, number> = {
      all: websiteCampaigns.length,
      published: 0,
      archived: 0,
    };

    for (const campaign of websiteCampaigns) {
      counts[getCampaignTabKey(campaign.status)] += 1;
    }

    return counts;
  }, [websiteCampaigns]);

  useEffect(() => {
    setCampaignPage(1);
  }, [campaignDataFilter, campaignPageSize, campaignSearchTerm, campaignTab, workspaceSlug]);

  useEffect(() => {
    setCampaignPage((current) => Math.min(current, campaignTotalPages));
  }, [campaignTotalPages]);

  const adminNavItems: Array<{
    key: AdminView;
    label: string;
    description: string;
    value: string;
    icon: LucideIcon;
  }> = [
    {
      key: 'panel',
      label: 'Genel Bakış',
      description: 'Günlük özet',
      value: `${workspaceMediaItems.length}`,
      icon: Home,
    },
    {
      key: 'posts',
      label: 'Canlı Galeri',
      description: 'Fotoğraf akışı',
      value: `${filteredMediaItems.length}`,
      icon: ImageIcon,
    },
    {
      key: 'campaigns',
      label: 'Kampanyalar',
      description: 'Aktif ödül',
      value: `${settings.campaignTarget} foto`,
      icon: Megaphone,
    },
    {
      key: 'qr',
      label: 'QR Standlar',
      description: 'Masa kodları',
      value: `${qrStandRows.length}`,
      icon: QrCode,
    },
    {
      key: 'customers',
      label: 'Müşteriler',
      description: 'Misafir listesi',
      value: `${emailCustomerTotal}`,
      icon: Users,
    },
    {
      key: 'marketing',
      label: 'E-posta Pazarlama',
      description: 'Gönderimler',
      value: `${emailCampaigns.length}`,
      icon: Mail,
    },
    {
      key: 'templates',
      label: 'Şablonlar',
      description: 'Hazır metinler',
      value: `${EMAIL_TEMPLATES.length}`,
      icon: Palette,
    },
    {
      key: 'stats',
      label: 'İstatistikler',
      description: 'Performans',
      value: topTable?.[0] ?? `${uniqueTables.length} masa`,
      icon: BarChart3,
    },
    {
      key: 'settings',
      label: 'Ayarlar',
      description: 'Kafe ve marka',
      value: effectiveWorkspaceSlug,
      icon: SlidersHorizontal,
    },
  ];

  const notificationItems = useMemo<AdminNotification[]>(() => {
    const items: AdminNotification[] = [];

    if (settingsDirty || workspaceDraftChanged) {
      items.push({
        id: 'settings-draft',
        title: 'Kaydedilmeyi bekleyen değişiklikler var',
        description: 'Paket, kafe ayarları veya kampanya alanında güncellenen içerikler henüz kaydedilmedi.',
        meta: 'Aksiyon gerekli',
        icon: Save,
        tone: 'amber',
      });
    }

    if (selectedRangeMediaItems.length > 0) {
      items.push({
        id: 'media-activity',
        title: 'Fotoğraf akışı güncellendi',
        description: `${dashboardDateRangeMeta} aralığında ${selectedRangeMediaItems.length} yeni fotoğraf görünüyor.`,
        meta: `${totalLikes} toplam beğeni`,
        icon: ImageIcon,
        tone: 'amber',
      });
    }

    if (rangeCustomerCount > 0) {
      items.push({
        id: 'customer-growth',
        title: 'Yeni müşteri kaydı alındı',
        description: `Seçili aralıkta ${rangeCustomerCount} yeni müşteri e-posta listesine dahil oldu.`,
        meta: `${recentCustomerRows.length} kayıt özet listede`,
        icon: Users,
        tone: 'violet',
      });
    }

    if (emailFailedTotal > 0) {
      items.push({
        id: 'email-failure',
        title: 'E-posta teslim hataları oluştu',
        description: `Seçili aralıkta ${emailFailedTotal} gönderim başarısız görünüyor.`,
        meta: emailRecipientTotal > 0 ? `%${emailFailureRate} hata oranı` : 'Teslim raporu bekleniyor',
        icon: Megaphone,
        tone: 'violet',
      });
    } else if (emailDeliveredTotal > 0) {
      items.push({
        id: 'email-delivery',
        title: 'E-posta kampanyaları teslim edildi',
        description: `${emailDeliveredTotal} e-posta başarılı şekilde gönderildi.`,
        meta: `%${emailDeliveryRate} teslim oranı`,
        icon: Mail,
        tone: 'green',
      });
    }

    if (items.length === 0) {
      items.push({
        id: 'quiet',
        title: 'Şu an yeni bildirim yok',
        description: 'Seçili tarih aralığında öne çıkan yeni hareket bulunmuyor.',
        meta: dashboardDateRangeMeta,
        icon: Bell,
        tone: 'neutral',
      });
    }

    return items.slice(0, 5);
  }, [
    dashboardDateRangeMeta,
    emailDeliveredTotal,
    emailDeliveryRate,
    emailFailedTotal,
    emailFailureRate,
    emailRecipientTotal,
    rangeCustomerCount,
    recentCustomerRows.length,
    selectedRangeMediaItems.length,
    settingsDirty,
    totalLikes,
    workspaceDraftChanged,
  ]);

  const notificationSignature = useMemo(
    () => notificationItems.map((item) => `${item.id}:${item.meta}:${item.description}`).join('|'),
    [notificationItems]
  );
  const unreadNotificationCount = hasSeenNotifications ? 0 : notificationItems.length;

  const firebaseIdentity = auth.currentUser?.uid || '';

  const loadQrDashboard = useCallback(async () => {
    if (!firebaseIdentity || !workspaceSlug || !canManageActiveWorkspace) {
      setQrDashboard(null);
      setQrDashboardError(null);
      return;
    }

    setQrDashboardLoading(true);
    setQrDashboardError(null);

    try {
      const response = await qrService.getCafeQrDashboard(firebaseIdentity, workspaceSlug, {
        search: qrStandSearchTerm,
        status: qrStandStatusFilter === 'all' ? undefined : qrStandStatusFilter,
        sort: 'createdAt',
        order: 'desc',
      });

      setQrDashboard(response);
    } catch (error) {
      console.error('QR dashboard data load failed:', error);
      setQrDashboard(null);
      setQrDashboardError(error instanceof Error ? error.message : 'QR stand verileri yüklenemedi.');
    } finally {
      setQrDashboardLoading(false);
    }
  }, [canManageActiveWorkspace, firebaseIdentity, qrStandSearchTerm, qrStandStatusFilter, workspaceSlug]);

  const loadEmailData = useCallback(async () => {
    if (!firebaseIdentity || !workspaceSlug || !canManageActiveWorkspace) {
      setEmailDashboard(null);
      setEmailCampaigns([]);
      setEmailCustomers([]);
      setEmailAnalyticsSummary(null);
      setEmailNotice(null);
      return;
    }

    setEmailLoading(true);
    setEmailNotice(null);

    try {
      const [dashboardResponse, campaignsResponse, customersResponse, analyticsSummaryResponse] = await Promise.all([
        emailService.getCafeDashboard(firebaseIdentity, workspaceSlug),
        emailService.listCampaigns(firebaseIdentity, workspaceSlug, 100, 0),
        emailService.listCustomers(firebaseIdentity, workspaceSlug, 100, 0),
        emailService.getCafeAnalyticsSummary(firebaseIdentity, workspaceSlug, dateRange.start, dateRange.end),
      ]);

      const resolvedCustomers = (customersResponse.customers ?? []).filter(isGoogleSyncedCustomer);

      setEmailDashboard({
        sentToday: dashboardResponse.stats?.sentToday ?? 0,
        dailyLimitRemaining: dashboardResponse.stats?.dailyLimitRemaining ?? 0,
        totalCustomers: resolvedCustomers.length,
        totalCampaigns: dashboardResponse.stats?.totalCampaigns ?? campaignsResponse.campaigns?.length ?? 0,
      });
      setEmailCampaigns(campaignsResponse.campaigns ?? []);
      setEmailCustomers(resolvedCustomers);
      setEmailAnalyticsSummary({
        customersCreated: analyticsSummaryResponse.stats?.customersCreated ?? 0,
        campaignsCreated: analyticsSummaryResponse.stats?.campaignsCreated ?? 0,
        campaignsSent: analyticsSummaryResponse.stats?.campaignsSent ?? 0,
        recipientCount: analyticsSummaryResponse.stats?.recipientCount ?? 0,
        sentCount: analyticsSummaryResponse.stats?.sentCount ?? 0,
        failedCount: analyticsSummaryResponse.stats?.failedCount ?? 0,
        deliveryRate: analyticsSummaryResponse.stats?.deliveryRate ?? 0,
        failureRate: analyticsSummaryResponse.stats?.failureRate ?? 0,
        latestCampaignSubject: analyticsSummaryResponse.latestCampaign?.subject ?? null,
      });
    } catch (error) {
      console.error('Email panel data load failed:', error);
      setEmailDashboard(null);
      setEmailCampaigns([]);
      setEmailCustomers([]);
      setEmailAnalyticsSummary(null);
      setEmailNotice(error instanceof Error ? error.message : 'E-posta servisine ulaşılamadı.');
    } finally {
      setEmailLoading(false);
    }
  }, [canManageActiveWorkspace, dateRange.end, dateRange.start, firebaseIdentity, workspaceSlug]);

  useEffect(() => {
    if (activeView !== 'qr') {
      return;
    }

    void loadQrDashboard();
  }, [activeView, loadQrDashboard]);

  useEffect(() => {
    void loadEmailData();
  }, [loadEmailData]);

  useEffect(() => {
    setHasSeenNotifications(false);
  }, [notificationSignature]);

  useEffect(() => {
    const nextTemplate = EMAIL_TEMPLATES.find((template) => template.key === selectedTemplateKey) ?? EMAIL_TEMPLATES[0];
    setCampaignSubjectInput(nextTemplate.subject);
    setCampaignDescriptionInput(nextTemplate.title);
    setCampaignTextInput(nextTemplate.textContent);
  }, [selectedTemplateKey]);

  useEffect(() => {
    setExcludedAudienceEmails([]);
  }, [selectedAudienceKey]);

  const openQrRequestModal = useCallback(() => {
    setQrRequestNotice(null);
    setQrRequestForm({
      contactName: userProfile.name || userEmail || settings.cafeName || '',
      contactEmail: userProfile.email || userEmail || '',
      contactPhone: '',
      location: settings.cafeName || effectiveWorkspaceSlug,
      tableCount: String(Math.max(1, qrDashboard?.summary?.largestStand?.tableCount ?? 1)),
      notes: '',
    });
    setIsQrRequestModalOpen(true);
  }, [effectiveWorkspaceSlug, qrDashboard?.summary?.largestStand?.tableCount, settings.cafeName, userEmail, userProfile.email, userProfile.name]);

  const closeQrRequestModal = useCallback(() => {
    setIsQrRequestModalOpen(false);
  }, []);

  const handleQrRequestSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!firebaseIdentity || !workspaceSlug) {
      setQrRequestNotice('QR talebi gönderilemedi. Lütfen yeniden giriş yapın.');
      return;
    }

    setQrRequestSubmitting(true);
    setQrRequestNotice(null);

    try {
      await qrService.createQrStandRequest(firebaseIdentity, workspaceSlug, {
        contactName: qrRequestForm.contactName.trim(),
        contactEmail: qrRequestForm.contactEmail.trim(),
        contactPhone: qrRequestForm.contactPhone.trim(),
        location: qrRequestForm.location.trim(),
        tableCount: Number.parseInt(qrRequestForm.tableCount, 10) || 1,
        notes: qrRequestForm.notes.trim(),
      });

      setQrRequestNotice('Talebiniz iletildi. Ekibimiz sizinle iletişime geçecek.');
      setIsQrRequestModalOpen(false);
      await loadQrDashboard();
    } catch (error) {
      console.error('QR request submit failed:', error);
      setQrRequestNotice(error instanceof Error ? error.message : 'Talep gönderilemedi.');
    } finally {
      setQrRequestSubmitting(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!firebaseIdentity || !selectedAudienceEmails.length || !campaignSubjectInput.trim() || !campaignTextInput.trim()) {
      setEmailNotice('Lütfen önce bir misafir grubu seçin.');
      return;
    }

    setEmailActionBusy(true);
    setEmailNotice(null);

    try {
      const scheduledDate = resolveCampaignScheduleDate(campaignSchedule);
      const campaign = await emailService.createCampaign(firebaseIdentity, workspaceSlug, {
        subject: campaignSubjectInput.trim(),
        description: campaignDescriptionInput.trim() || null,
        imageUrl: campaignImageUrlInput.trim() || null,
        htmlContent: buildCampaignHtmlContent(
          campaignTextInput,
          campaignDescriptionInput.trim(),
          campaignImageUrlInput.trim()
        ),
        textContent: campaignTextInput.trim(),
        scheduledAt: scheduledDate ? scheduledDate.toISOString() : null,
      });

      if (scheduledDate) {
        await emailService.scheduleCampaign(
          firebaseIdentity,
          campaign.id,
          scheduledDate.toISOString(),
          selectedAudienceEmails
        );
        setEmailNotice(`${selectedAudienceCount} misafir için kampanya zamanlandı.`);
      } else {
        await emailService.sendCampaign(firebaseIdentity, campaign.id, selectedAudienceEmails);
        setEmailNotice(`${selectedAudienceCount} misafir için e-posta kuyruğa alındı.`);
      }

      await loadEmailData();
    } catch (error) {
      setEmailNotice(error instanceof Error ? error.message : 'E-posta gönderimi başlatılamadı.');
    } finally {
      setEmailActionBusy(false);
    }
  };

  const closeCampaignComposer = () => {
    setCampaignComposerMode('closed');
    setSelectedCampaign(null);
    setOpenCampaignActionId(null);
  };

  const openCreateCampaignComposer = () => {
    const defaultTemplate = EMAIL_TEMPLATES[0];
    setSelectedCampaign(null);
    setSelectedTemplateKey(defaultTemplate.key);
    setCampaignSubjectInput(defaultTemplate.subject);
    setCampaignDescriptionInput('');
    setCampaignImageUrlInput('');
    setCampaignImageFileName('');
    setCampaignTextInput(defaultTemplate.textContent);
    setCampaignStartDate('');
    setCampaignEndDate('');
    setCampaignTag('promosyon');
    setCampaignDiscountCode('');
    setCampaignLimit('');
    setCampaignTerms('');
    setCampaignSchedule(SEND_TIME_OPTIONS[0].value);
    setCampaignRepeat(REPEAT_OPTIONS[0].value);
    setSelectedAudienceKey('all');
    setExcludedAudienceEmails([]);
    setEmailNotice(null);
    setCampaignComposerMode('create');
  };

  const openCampaignDetail = async (campaign: AdminCampaign) => {
    setOpenCampaignActionId(null);
    setSelectedCampaign(campaign);
    setCampaignSubjectInput(campaign.subject);
    setCampaignDescriptionInput(campaign.description ?? '');
    setCampaignImageUrlInput(campaign.imageUrl ?? '');
    setCampaignImageFileName(getFileNameFromUrl(campaign.imageUrl ?? ''));
    setCampaignTextInput(campaign.textContent);
    setCampaignStartDate('');
    setCampaignEndDate('');
    setCampaignTag(normalizeCampaignCategoryValue(campaign.tag));
    setCampaignSchedule(campaign.scheduledAt ? 'tomorrow-morning' : SEND_TIME_OPTIONS[0].value);
    setCampaignComposerMode('detail');
  };

  const openCampaignEdit = (campaign: AdminCampaign) => {
    setOpenCampaignActionId(null);
    setSelectedCampaign(campaign);
    setCampaignSubjectInput(campaign.subject);
    setCampaignDescriptionInput(campaign.description ?? '');
    setCampaignImageUrlInput(campaign.imageUrl ?? '');
    setCampaignImageFileName(getFileNameFromUrl(campaign.imageUrl ?? ''));
    setCampaignTextInput(campaign.textContent);
    setCampaignStartDate('');
    setCampaignEndDate('');
    setCampaignTag(normalizeCampaignCategoryValue(campaign.tag));
    setCampaignSchedule(campaign.scheduledAt ? 'tomorrow-morning' : SEND_TIME_OPTIONS[0].value);
    setEmailNotice(null);
    setCampaignComposerMode('edit');
  };

  const getCampaignComposerPayload = (forceImmediate = false) => {
    const scheduledDate = forceImmediate ? null : resolveCampaignScheduleDate(campaignSchedule);

    return {
      subject: campaignSubjectInput.trim(),
      description: campaignDescriptionInput.trim() || null,
      imageUrl: campaignImageUrlInput.trim() || null,
      startDate: campaignStartDate,
      endDate: campaignEndDate,
      tag: normalizeCampaignCategoryValue(campaignTag),
      htmlContent: buildCampaignHtmlContent(
        campaignTextInput,
        campaignDescriptionInput.trim(),
        campaignImageUrlInput.trim()
      ),
      textContent: campaignTextInput.trim(),
      scheduledAt: scheduledDate ? scheduledDate.toISOString() : null,
    };
  };

  const handleSaveCampaignDraft = async () => {
    if (!firebaseIdentity || !campaignSubjectInput.trim() || !campaignDescriptionInput.trim()) {
      setEmailNotice('Kampanya adı ve açıklaması zorunludur.');
      return null;
    }

    setEmailActionBusy(true);
    setEmailNotice(null);

    try {
      const subject = campaignSubjectInput.trim();
      const description = campaignDescriptionInput.trim();
      const nowIso = new Date().toISOString();
      const campaignRef =
        (campaignComposerMode === 'edit' || campaignComposerMode === 'detail') && selectedCampaign
          ? doc(db, 'cafes', workspaceSlug, 'campaigns', selectedCampaign.id)
          : doc(collection(db, 'cafes', workspaceSlug, 'campaigns'));
      const payload = {
        cafeSlug: workspaceSlug,
        subject,
        description,
        imageUrl: campaignImageUrlInput.trim() || null,
        textContent: description,
        status: 'published',
        tag: normalizeCampaignCategoryValue(campaignTag),
        updatedAt: serverTimestamp(),
        createdBy: firebaseIdentity,
      };

      if ((campaignComposerMode === 'edit' || campaignComposerMode === 'detail') && selectedCampaign) {
        await updateDoc(campaignRef, {
          ...payload,
          startDate: deleteField(),
          endDate: deleteField(),
        });
      } else {
        await setDoc(campaignRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      const campaign: AdminCampaign = {
        id: campaignRef.id,
        ...payload,
        createdAt: selectedCampaign?.createdAt ?? nowIso,
        updatedAt: nowIso,
        scheduledAt: null,
        sentAt: null,
        recipientCount: 0,
        sentCount: 0,
        failedCount: 0,
        openCount: 0,
        clickCount: 0,
      };

      setEmailNotice(
        campaignComposerMode === 'create'
          ? 'Kampanya yayınlandı.'
          : 'Kampanya güncellendi.'
      );
      if (campaignComposerMode === 'create') {
        closeCampaignComposer();
      } else {
        setSelectedCampaign(campaign);
        setCampaignComposerMode('detail');
      }
      return campaign;
    } catch (error) {
      setEmailNotice(error instanceof Error ? error.message : 'Kampanya kaydedilemedi.');
      return null;
    } finally {
      setEmailActionBusy(false);
    }
  };

  const handleSaveCampaignAndOpenMarketing = async () => {
    const campaign = await handleSaveCampaignDraft();
    if (!campaign) {
      return;
    }

    setCampaignSubjectInput(campaign.subject);
    setCampaignDescriptionInput(campaign.description ?? '');
    setCampaignImageUrlInput(campaign.imageUrl ?? '');
    setCampaignImageFileName(getFileNameFromUrl(campaign.imageUrl ?? ''));
    setCampaignTextInput(campaign.textContent);
    closeCampaignComposer();
    openAdminView('marketing');
  };

  const handleShareCampaignFromComposer = async () => {
    const campaign = await handleSaveCampaignDraft();
    if (!campaign) {
      return;
    }

    setEmailNotice('Kampanya web sitesinde paylaşıldı.');
    closeCampaignComposer();
  };

  const handleSelectCampaignImageClick = () => {
    campaignImageFileInputRef.current?.click();
  };

  const handleCampaignImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setEmailNotice('Lütfen sadece görsel dosyası seçin.');
      event.target.value = '';
      return;
    }

    if (!firebaseIdentity) {
      setEmailNotice('Görsel yüklemek için giriş yapın.');
      event.target.value = '';
      return;
    }

    setCampaignImageUploadBusy(true);
    setEmailNotice(null);

    try {
      const safeName = file.name
        .toLocaleLowerCase('tr-TR')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9._-]/g, '');
      const finalName = safeName || `kampanya-${Date.now()}.jpg`;
      const filePath = `campaigns/${workspaceSlug}/${Date.now()}-${finalName}`;
      const fileRef = storageRef(storage, filePath);
      const uploadTask = uploadBytesResumable(fileRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          () => {
            // Upload progress intentionally ignored for minimalist UI.
          },
          reject,
          () => resolve()
        );
      });

      const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
      setCampaignImageUrlInput(downloadUrl);
      setCampaignImageFileName(file.name);
      setEmailNotice('Kampanya görseli yüklendi.');
    } catch (error) {
      setEmailNotice(error instanceof Error ? error.message : 'Görsel yüklenemedi.');
    } finally {
      setCampaignImageUploadBusy(false);
      event.target.value = '';
    }
  };

  const handleSendExistingCampaign = async (campaign: EmailCampaign) => {
    const existingRecipientCount = getCampaignRecipientCount(campaign);

    if (!firebaseIdentity || (!selectedAudienceEmails.length && existingRecipientCount === 0)) {
      setEmailNotice('Gönderim için en az bir gerçek misafir e-postası gerekir.');
      return;
    }

    setEmailActionBusy(true);
    setEmailNotice(null);

    try {
      await emailService.sendCampaign(firebaseIdentity, campaign.id, selectedAudienceEmails);
      setEmailNotice(`${selectedAudienceEmails.length || existingRecipientCount} misafir için kampanya kuyruğa alındı.`);
      await loadEmailData();
      closeCampaignComposer();
    } catch (error) {
      setEmailNotice(error instanceof Error ? error.message : 'Kampanya gönderimi başlatılamadı.');
    } finally {
      setEmailActionBusy(false);
    }
  };

  const handleSendCampaignFromComposer = async () => {
    if (!firebaseIdentity || !campaignSubjectInput.trim() || !campaignTextInput.trim()) {
      setEmailNotice('Konu ve mesaj metni zorunludur.');
      return;
    }

    const canUseExistingRecipients =
      campaignComposerMode === 'edit' &&
      selectedCampaign &&
      getCampaignRecipientCount(selectedCampaign) > 0;

    if (!selectedAudienceEmails.length && !canUseExistingRecipients) {
      setEmailNotice('Gönderim için en az bir gerçek misafir e-postası gerekir.');
      return;
    }

    setEmailActionBusy(true);
    setEmailNotice(null);

    try {
      const payload = getCampaignComposerPayload(true);
      const campaign =
        campaignComposerMode === 'edit' && selectedCampaign
          ? await emailService.updateCampaign(firebaseIdentity, selectedCampaign.id, payload)
          : await emailService.createCampaign(firebaseIdentity, workspaceSlug, payload);

      await emailService.sendCampaign(firebaseIdentity, campaign.id, selectedAudienceEmails);
      setEmailNotice(`${selectedAudienceEmails.length || getCampaignRecipientCount(campaign)} misafir için kampanya kuyruğa alındı.`);
      await loadEmailData();
      closeCampaignComposer();
    } catch (error) {
      setEmailNotice(error instanceof Error ? error.message : 'Kampanya gönderimi başlatılamadı.');
    } finally {
      setEmailActionBusy(false);
    }
  };

  const handleScheduleCampaignFromComposer = async () => {
    if (!firebaseIdentity || !campaignSubjectInput.trim() || !campaignTextInput.trim()) {
      setEmailNotice('Konu ve mesaj metni zorunludur.');
      return;
    }

    if (!selectedAudienceEmails.length) {
      setEmailNotice('Zamanlama için en az bir gerçek misafir e-postası gerekir.');
      return;
    }

    const scheduledDate = resolveCampaignScheduleDate(campaignSchedule);
    if (!scheduledDate) {
      setEmailNotice('Zamanlama için ileri tarihli bir gönderim zamanı seçin.');
      return;
    }

    setEmailActionBusy(true);
    setEmailNotice(null);

    try {
      const payload = getCampaignComposerPayload(false);
      const campaign =
        campaignComposerMode === 'edit' && selectedCampaign
          ? await emailService.updateCampaign(firebaseIdentity, selectedCampaign.id, payload)
          : await emailService.createCampaign(firebaseIdentity, workspaceSlug, payload);

      await emailService.scheduleCampaign(
        firebaseIdentity,
        campaign.id,
        scheduledDate.toISOString(),
        selectedAudienceEmails
      );
      setEmailNotice(`${selectedAudienceEmails.length} misafir için kampanya zamanlandı.`);
      await loadEmailData();
      closeCampaignComposer();
    } catch (error) {
      setEmailNotice(error instanceof Error ? error.message : 'Kampanya zamanlanamadı.');
    } finally {
      setEmailActionBusy(false);
    }
  };

  const handleDeleteCampaign = async (campaign: AdminCampaign) => {
    if (!firebaseIdentity) {
      return;
    }

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`"${campaign.subject}" kampanyasını kalıcı olarak silmek istiyor musunuz?`);
      if (!confirmed) {
        return;
      }
    }

    setEmailActionBusy(true);
    setEmailNotice(null);

    try {
      await deleteDoc(doc(db, 'cafes', workspaceSlug, 'campaigns', campaign.id));
      setEmailNotice('Kampanya kalıcı olarak silindi.');
      closeCampaignComposer();
    } catch (error) {
      setEmailNotice(error instanceof Error ? error.message : 'Kampanya silinemedi.');
    } finally {
      setEmailActionBusy(false);
    }
  };

  const handleArchiveCampaign = async (campaign: AdminCampaign) => {
    if (!firebaseIdentity) {
      return;
    }

    setEmailActionBusy(true);
    setEmailNotice(null);

    try {
      await updateDoc(doc(db, 'cafes', workspaceSlug, 'campaigns', campaign.id), {
        status: 'archived',
        updatedAt: serverTimestamp(),
      });
      setEmailNotice('Kampanya yayından kaldırıldı.');
      closeCampaignComposer();
    } catch (error) {
      setEmailNotice(error instanceof Error ? error.message : 'Kampanya yayından kaldırılamadı.');
    } finally {
      setEmailActionBusy(false);
    }
  };

  const handleRestoreCampaign = async (campaign: AdminCampaign) => {
    if (!firebaseIdentity) {
      return;
    }

    setEmailActionBusy(true);
    setEmailNotice(null);

    try {
      await updateDoc(doc(db, 'cafes', workspaceSlug, 'campaigns', campaign.id), {
        status: 'published',
        updatedAt: serverTimestamp(),
      });
      setEmailNotice('Kampanya yeniden yayınlandı.');
      closeCampaignComposer();
    } catch (error) {
      setEmailNotice(error instanceof Error ? error.message : 'Kampanya yayına alınamadı.');
    } finally {
      setEmailActionBusy(false);
    }
  };

  const handleDownloadQrCode = useCallback(
    (targetUrl = publicQrExampleLink, fileName = `${effectiveWorkspaceSlug}-qr-kod.png`) => {
      if (typeof document === 'undefined') {
        return;
      }

      const link = document.createElement('a');
      link.href = buildQrImageUrl(targetUrl, 720);
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
    [effectiveWorkspaceSlug, publicQrExampleLink]
  );

  const handleSave = async () => {
    if (!userEmail) {
      return null;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert('Google oturumu bulunamadı. Lütfen tekrar giriş yapın.');
      return null;
    }

    const nextWorkspaceSlug = effectiveWorkspaceSlug;
    let targetOwnerEmail = workspaceOwnerEmail;

    setIsSaving(true);

    try {
      const tokenResult = await currentUser.getIdTokenResult(true);
      const authenticatedEmail = normalizeAccessEmail(tokenResult.claims.email ?? currentUser.email ?? userEmail);

      if (!authenticatedEmail) {
        alert('Google hesabı doğrulanamadı. Lütfen tekrar giriş yapın.');
        return null;
      }

      if (tokenResult.claims.email_verified !== true) {
        alert('Google hesabınız doğrulanmış görünmüyor. Lütfen doğrulanmış hesapla tekrar giriş yapın.');
        return null;
      }

      if (nextWorkspaceSlug !== workspaceSlug) {
        const targetSnapshot = await getDoc(doc(db, 'cafes', nextWorkspaceSlug));
        targetOwnerEmail = targetSnapshot.exists()
          ? normalizeLegacyText(targetSnapshot.data().ownerEmail, '')
          : null;
      }

      if (
        targetOwnerEmail &&
        normalizeAccessEmail(targetOwnerEmail) !== authenticatedEmail &&
        !isLocalDevelopmentHost &&
        !isSuperAdmin
      ) {
        alert('Bu kafe alanı başka bir hesaba aittir.');
        return null;
      }

      await setDoc(doc(db, 'cafes', nextWorkspaceSlug), {
        ...settings,
        cafeSlug: nextWorkspaceSlug,
        cafeName: normalizeLegacyText(settings.cafeName, DEFAULT_CAFE_NAME),
        accentColor: settings.accentColor || DEFAULT_ACCENT_COLOR,
        handwritingFont: normalizeHandwritingFont(settings.handwritingFont),
        campaignTarget: Math.max(1, settings.campaignTarget),
        campaignReward: normalizeLegacyText(settings.campaignReward, DEFAULT_CAMPAIGN_REWARD),
        packageKey: normalizePackageKey(settings.packageKey),
        ownerEmail: normalizeAccessEmail(targetOwnerEmail || authenticatedEmail),
      });
      setWorkspaceSlug(nextWorkspaceSlug);
      setWorkspaceSlugDraft(nextWorkspaceSlug);
      onCafeSlugChange(nextWorkspaceSlug);
      setWorkspaceOwnerEmail(normalizeAccessEmail(targetOwnerEmail || authenticatedEmail));
      alert(isOwnerPortal ? 'Kafe ortamı başarıyla oluşturuldu.' : 'Ayarlar başarıyla kaydedildi.');
      return nextWorkspaceSlug;
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(
        getErrorCode(error) === 'permission-denied'
          ? 'Kaydetme izni reddedildi. Firestore kuralları kafe sahiplerinin `cafes` koleksiyonuna yazmasına izin vermelidir.'
          : 'Ayarlar kaydedilirken bir hata oluştu.'
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!mediaToDelete) {
      return;
    }

    if (!canManageActiveWorkspace) {
      alert('Yalnızca kendi kafe alanına ait içerikleri yönetebilirsin.');
      setMediaToDelete(null);
      return;
    }

    const target = mediaToDelete;
    setIsDeletingId(target.id);

    try {
      await deleteMediaRecord(target.id, target.url);
      setMediaToDelete(null);
    } catch (error) {
      console.error('Admin media delete failed:', error);
      alert('Anı silinirken bir hata oluştu.');
    } finally {
      setIsDeletingId(null);
    }
  };

  const applyDatePreset = useCallback((preset: DateRangePreset) => {
    setDateRange(createDateRange(preset));
    setHoveredChartIndex(null);
    setIsDateRangeOpen(false);
    setIsChartDateRangeOpen(false);
  }, []);

  const updateCustomDateRange = useCallback((field: 'start' | 'end', value: string) => {
    setDateRange((current) => ({
      ...current,
      preset: 'custom',
      [field]: value,
    }));
    setHoveredChartIndex(null);
  }, []);

  const renderDateRangePopover = () => (
    <div
      className="admin-date-range-popover"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="admin-date-range-head">
        <strong>Tarih Aralığı</strong>
        <span>{dashboardDateRangeMeta}</span>
      </div>
      <div className="admin-date-range-presets">
        {DATE_RANGE_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => applyDatePreset(preset.key)}
            className={dateRange.preset === preset.key ? 'is-active' : ''}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="admin-date-range-inputs">
        <label>
          <span>Başlangıç</span>
          <input
            type="date"
            value={dateRange.start}
            onChange={(event) => updateCustomDateRange('start', event.target.value)}
          />
        </label>
        <label>
          <span>Bitiş</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(event) => updateCustomDateRange('end', event.target.value)}
          />
        </label>
      </div>
      <div className="admin-date-range-footer">
        <button
          type="button"
          className="is-secondary"
          onClick={() => {
            setIsDateRangeOpen(false);
            setIsChartDateRangeOpen(false);
          }}
        >
          Kapat
        </button>
      </div>
    </div>
  );
  const userRoleLabel = isOwnerPortal ? 'Kafe Sahibi' : isSuperAdmin ? 'Süper Admin' : 'Kafe Yöneticisi';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-cafe-50">
        <div className="section-shell max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)]">
            <Settings className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold text-cafe-50">
            {isOwnerPortal ? 'Kafe sahibi alanı hazırlanıyor' : 'Yönetim paneli hazırlanıyor'}
          </h1>
          <p className="mt-3 text-sm leading-7 text-cafe-100/70">
            Yetki kontrolü ve yönetim verileri yükleniyor.
          </p>
        </div>
      </div>
    );
  }

  if (!userEmail && !isLocalDevelopmentHost) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-cafe-50">
        <div className="section-shell max-w-md w-full text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)]">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <span className="section-pill">{loginPill}</span>
          <h1 className="mt-4 text-3xl font-semibold text-cafe-50">{loginTitle}</h1>
          <p className="mt-3 text-sm leading-7 text-cafe-100/72">
            {isOwnerPortal
              ? 'Tanımlı Google hesabınızla giriş yapın. Ardından kendi kafe çalışma alanınızı oluşturup ad, renk, font ve kampanya ayarlarınızı belirleyebilirsiniz.'
              : 'Kafe ayarlarını kurmak için Google hesabınızla giriş yapın. Girişten sonra kendi kafe çalışma alanınızı oluşturabilir ve yönetebilirsiniz.'}
          </p>

          <button
            onClick={handleLogin}
            className="mt-6 w-full rounded-2xl bg-[color:var(--color-accent)] px-4 py-3 font-semibold text-white shadow-[0_20px_40px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-0.5"
          >
            {isOwnerPortal ? 'Google ile kafe sahibi girişi yap' : 'Google ile giriş yap'}
          </button>

          <button
            onClick={onBack}
            className="mt-6 inline-flex items-center gap-2 text-sm text-cafe-100/65 transition-colors hover:text-cafe-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Ana sayfaya dön
          </button>
        </div>
      </div>
    );
  }

  // ✅ Email Verification Check (before access check)
  if (userEmail && !isEmailVerified && !isLocalDevelopmentHost) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-cafe-50">
        <div className="section-shell max-w-md w-full text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-yellow-50 text-yellow-600">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <span className="section-pill">EMAİL DOĞRULMASI GEREKLİ</span>
          <h1 className="mt-4 text-3xl font-semibold text-cafe-50">E-posta doğrulaması gerekli</h1>
          <p className="mt-3 text-sm leading-7 text-cafe-100/72">
            Yönetim paneline erişim için e-postanızı doğrulamanız gerekiyor. Lütfen Gmail gelen kutusunda doğrulama e-postasını kontrol edin.
          </p>
          <div className="mt-5 rounded-2xl border border-cafe-700/75 bg-cafe-900/45 px-4 py-3 text-sm text-cafe-100/72">
            E-posta: <strong className="text-cafe-50">{userEmail}</strong>
          </div>
          <button
            onClick={handleLogout}
            className="mt-6 w-full rounded-2xl border border-cafe-700/80 bg-white/80 px-4 py-3 font-semibold text-cafe-50 transition-colors hover:border-accent/30"
          >
            Çıkış yap
          </button>
        </div>
      </div>
    );
  }

  if (!hasPortalAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-cafe-50">
        <div className="section-shell max-w-md w-full text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-red-50 text-red-500">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <span className="section-pill">{loginPill}</span>
          <h1 className="mt-4 text-3xl font-semibold text-cafe-50">Erişim izni bulunamadı</h1>
          <p className="mt-3 text-sm leading-7 text-cafe-100/72">
            {isOwnerPortal
              ? 'Bu Google hesabı kafe sahibi erişim listesinde yer almıyor. Yetkili hesapla giriş yapmanız gerekiyor.'
                : 'Bu kafe için yönetim izni bulunan owner/admin hesabı ile giriş yapmanız gerekiyor.'}
          </p>
          <div className="mt-5 rounded-2xl border border-cafe-700/75 bg-cafe-900/45 px-4 py-3 text-sm text-cafe-100/72">
            Giriş yapan hesap: <strong className="text-cafe-50">{userEmail}</strong>
          </div>
          <button
            onClick={handleSwitchAccount}
            className="mt-6 w-full rounded-2xl bg-[color:var(--color-accent)] px-4 py-3 font-semibold text-white shadow-[0_20px_40px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-0.5"
          >
            Farklı hesapla tekrar giriş yap
          </button>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-2xl border border-cafe-700/80 bg-white/80 px-4 py-3 font-semibold text-cafe-50 transition-colors hover:border-accent/30"
          >
            Sadece çıkış yap
          </button>
          <button
            onClick={onBack}
            className="mt-6 inline-flex items-center gap-2 text-sm text-cafe-100/65 transition-colors hover:text-cafe-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Ana sayfaya dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-root min-h-screen pb-16 text-cafe-50">
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <div className="admin-topbar-main">
          </div>

          <div className="admin-topbar-actions">
            {(settingsDirty || workspaceDraftChanged) && (
              <div className="admin-topbar-status is-dirty">
                <Sparkles className="w-4 h-4" />
                <span>Değişiklik var</span>
              </div>
            )}
            <div ref={dateRangePopoverRef} className="admin-topbar-popover-wrap">
              <button
                type="button"
                className="admin-topbar-date"
                onClick={() => {
                  setIsDateRangeOpen((current) => !current);
                  setIsChartDateRangeOpen(false);
                  setIsNotificationOpen(false);
                }}
                aria-expanded={isDateRangeOpen}
              >
                <span>{dashboardDateRangeLabel}</span>
                <CalendarDays className="h-4 w-4" />
              </button>
              <AnimatePresence>
                {isDateRangeOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={CHART_MOTION_TRANSITION}
                  >
                    {renderDateRangePopover()}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
            <div ref={notificationPopoverRef} className="admin-topbar-popover-wrap">
              <button
                type="button"
                className="admin-topbar-notification"
                aria-label="Bildirimler"
                aria-expanded={isNotificationOpen}
                onClick={() => {
                  setIsNotificationOpen((current) => !current);
                  setIsDateRangeOpen(false);
                  setIsChartDateRangeOpen(false);
                  setHasSeenNotifications(true);
                }}
              >
                <Bell className="h-5 w-5" />
                {unreadNotificationCount > 0 ? <span>{Math.min(unreadNotificationCount, 9)}</span> : null}
              </button>
              <AnimatePresence>
                {isNotificationOpen ? (
                  <motion.div
                    className="admin-notification-popover"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={CHART_MOTION_TRANSITION}
                  >
                    <div className="admin-notification-head">
                      <strong>Son Bildirimler</strong>
                      <small>{dashboardDateRangeMeta}</small>
                    </div>
                    <div className="admin-notification-list">
                      {notificationItems.map((item) => {
                        const Icon = item.icon;

                        return (
                          <article key={item.id} className={`admin-notification-item is-${item.tone}`}>
                            <span className="admin-notification-icon">
                              <Icon className="h-4 w-4" />
                            </span>
                            <div className="admin-notification-copy">
                              <strong>{item.title}</strong>
                              <p>{item.description}</p>
                              <small>{item.meta}</small>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
            <button
              onClick={() => {
                void handleSave();
              }}
              disabled={isSaving || (!settingsDirty && !workspaceDraftChanged) || !canManageWorkspace}
              className="admin-topbar-save"
            >
              <Save className="w-4 h-4" />
              <span className="sm:hidden">Kaydet</span>
              <span className="hidden sm:inline">{isSaving ? 'Kaydediliyor...' : isOwnerPortal ? 'Kafe ortamını kaydet' : 'Kaydet'}</span>
            </button>
          </div>
        </div>
      </header>

      {isMobileViewport && !isMenuCollapsed ? (
        <button
          type="button"
          className="admin-side-backdrop"
          aria-label="Menüyü kapat"
          onClick={() => setIsMenuCollapsed(true)}
        />
      ) : null}

      <main className={`admin-workspace-shell ${isMenuCollapsed ? 'is-menu-collapsed' : ''}`}>
        <aside className={`admin-side-panel ${isMenuCollapsed ? 'is-collapsed' : ''}`}>
          <div className="admin-side-top">
            <div className="admin-side-brand">
              <strong>ShareVibe</strong>
              <span>Admin</span>
            </div>
            <button
              type="button"
              className={`admin-menu-toggle ${isMenuCollapsed ? '' : 'is-open'}`}
              onClick={() => setIsMenuCollapsed((current) => !current)}
              aria-label={isMenuCollapsed ? 'Menüyü aç' : 'Menüyü kapat'}
              aria-expanded={!isMenuCollapsed}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div className="admin-side-cafe">
            <div className="admin-side-cafe-avatar">
              {recentMediaItems[0]?.url ? (
                <img
                  src={recentMediaItems[0].url}
                  alt={settings.cafeName}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{settings.cafeName.slice(0, 1).toLocaleUpperCase('tr')}</span>
              )}
            </div>
            <div>
              <strong>{settings.cafeName}</strong>
              <span>{effectiveWorkspaceSlug}</span>
            </div>
            <ChevronDown className="admin-side-cafe-chevron h-4 w-4" aria-hidden="true" />
          </div>

          <nav className="admin-side-nav" aria-label="Yönetim paneli sayfaları">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === activeView;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => openAdminView(item.key)}
                  className={`admin-side-link ${isActive ? 'is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="admin-side-link-icon">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="admin-side-link-copy">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                  <span className="admin-side-link-value">{item.value}</span>
                </button>
              );
            })}
          </nav>

          <div className="admin-side-pro">
            <div className="admin-side-pro-icon">
              <Crown className="h-5 w-5" />
            </div>
            <div className="admin-side-pro-copy">
              <strong>{currentPackageMeta.title}</strong>
              <span>Stand sayınız: {qrStandRows.length} / {packageStandLimit}</span>
            </div>
            <div className="admin-side-pro-track" aria-hidden="true">
              <span style={{ width: `${packageStandUsagePercent}%` }} />
            </div>
            <button type="button" onClick={() => openAdminView('settings')}>
              Paket Yükselt
            </button>
          </div>

          <div className="admin-side-user">
            <div className="admin-side-user-avatar">
              {userProfile.photoUrl ? (
                <img
                  src={userProfile.photoUrl}
                  alt={userProfile.name || 'Profil fotoğrafı'}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{(userProfile.name || userEmail || settings.cafeName).slice(0, 1).toLocaleUpperCase('tr')}</span>
              )}
            </div>
            <div className="admin-side-user-copy">
              <strong>{userProfile.name || (userEmail ? userEmail.split('@')[0] : 'Kullanıcı')}</strong>
              <span>{userRoleLabel}</span>
              <small>{userProfile.email || userEmail || 'Google hesabı bağlı değil'}</small>
            </div>
            <div className="admin-side-user-actions">
              <button type="button" onClick={handleSwitchAccount} aria-label="Hesabı değiştir">
                <ArrowUpDown className="h-4 w-4" />
              </button>
              <button type="button" onClick={handleLogout} aria-label="Çıkış yap">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        <section className="admin-page-stage">
          <div key={activeView} className={`admin-page-frame is-${activeView}-view`}>
            <div className="admin-page-hero">
              <div>
                <span className="section-pill">{currentPageCopy.kicker}</span>
                <h2>{currentPageCopy.title}</h2>
                <p>{currentPageCopy.description}</p>
              </div>
              <div className="admin-page-hero-badge">
                <span>Aktif kod</span>
                <strong>{effectiveWorkspaceSlug}</strong>
              </div>
            </div>

        <section className={`section-shell space-y-4 ${activeView === 'settings' ? '' : 'hidden'}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="section-pill">Kafe Ayarları</span>
              <h2 className="mt-3 text-2xl font-semibold text-cafe-50">Kafe kodunu seç ve devam et</h2>
              <p className="mt-2 text-sm leading-7 text-cafe-100/72">
                Kısa kodu güncellediğinizde bu kafe için galeri, masa bağlantıları ve yönetim ekranı otomatik açılır.
              </p>
            </div>
            <div className="rounded-2xl border border-cafe-700/80 bg-cafe-900/72 px-4 py-2 text-sm text-cafe-50/84">
              Aktif kod: <strong className="text-cafe-50">{effectiveWorkspaceSlug}</strong>
            </div>
          </div>

          <div className="glass-card space-y-4">
            {isOwnerPortal && ownedWorkspaces.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {ownedWorkspaces.map((workspace) => (
                  <button
                    key={workspace.slug}
                    type="button"
                    onClick={() => selectOwnedWorkspace(workspace.slug)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      workspace.slug === workspaceSlug
                        ? 'border-accent/40 bg-[color:var(--color-accent)]/12 text-cafe-50'
                        : 'border-cafe-700/80 bg-cafe-900/72 text-cafe-100/85 hover:border-accent/40'
                    }`}
                  >
                    {workspace.cafeName}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={workspaceSlugDraft}
                onChange={(event) => setWorkspaceSlugDraft(normalizeOptionalCafeSlug(event.target.value))}
                placeholder="Örn: lumina-kahve"
                className="w-full rounded-2xl border border-cafe-700/80 bg-cafe-900/72 px-4 py-3 text-cafe-50 outline-none transition-colors focus:border-accent/60"
              />
              <button
                type="button"
                onClick={() => void applyWorkspaceSlug()}
                className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--color-accent)] px-5 py-3 font-semibold text-white shadow-[0_18px_36px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-0.5"
              >
                Aç
              </button>
            </div>

            {!canManageActiveWorkspace && effectiveWorkspaceSlug === workspaceSlug && workspaceOwnerEmail && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                Bu alan <strong>{workspaceOwnerEmail}</strong> hesabına bağlı. Değişiklik yapma yetkiniz yok.
              </div>
            )}

            {workspaceAccessError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {workspaceAccessError}
              </div>
            )}

            {canViewActiveWorkspace && (
              <div className="rounded-2xl border border-cafe-700/70 bg-cafe-900/45 px-4 py-3 text-sm text-cafe-100/72 space-y-2">
                <p><strong>Genel bağlantı:</strong> {publicGalleryLink}</p>
                <p><strong>Masa örneği:</strong> {publicQrExampleLink}</p>
              </div>
            )}

            {onOpenCafeEnvironment && (
              <button
                type="button"
                onClick={async () => {
                  if (isOwnerPortal && !canViewActiveWorkspace) {
                    return;
                  }

                  const targetSlug =
                    settingsDirty || workspaceDraftChanged
                      ? await handleSave()
                      : effectiveWorkspaceSlug;

                  if (targetSlug) {
                    onOpenCafeEnvironment(targetSlug);
                  }
                }}
                disabled={isOwnerPortal && !canViewActiveWorkspace}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[color:var(--color-accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ExternalLink className="h-4 w-4" />
                Kafe ekranını aç
              </button>
            )}
          </div>
        </section>

        {activeView === 'settings' && (
          <section className="section-shell space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <span className="section-pill">Marka Kimliği</span>
                <h2 className="mt-3 text-3xl font-serif font-semibold text-cafe-50">Mekanın vitrini ve dili</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-cafe-100/72">
                  Kafe adı, el yazısı stili, vurgu rengi ve hazır kombinler galerinin tamamında kullanılır.
                </p>
              </div>

              <button
                type="button"
                onClick={openDashboardView}
                className="inline-flex items-center gap-2 self-start rounded-full border border-cafe-700/80 bg-cafe-900/72 px-4 py-2.5 text-sm font-medium text-cafe-50 transition-colors hover:border-accent/40"
              >
                <ArrowLeft className="h-4 w-4" />
                Panele dön
              </button>
            </div>

            <div className="glass-card">
              <label className="block text-sm font-medium text-cafe-100/70 mb-3">Aktif paket</label>
              <div className="grid gap-3 md:grid-cols-2">
                {CAFE_PACKAGE_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSettings({ ...settings, packageKey: option.key })}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      settings.packageKey === option.key
                        ? 'border-accent/40 bg-[color:var(--color-accent)]/12'
                        : 'border-cafe-700/80 bg-cafe-900/72 hover:border-accent/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm font-semibold text-cafe-50">{option.title}</strong>
                      <span className="rounded-full border border-cafe-700/70 bg-cafe-950/60 px-2.5 py-1 text-xs font-semibold text-cafe-100/84">
                        {option.badge}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-cafe-100/68">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="glass-card">
                <label className="block text-sm font-medium text-cafe-100/70 mb-2">Kafe adı</label>
                <input
                  type="text"
                  value={settings.cafeName}
                  onChange={(event) => setSettings({ ...settings, cafeName: event.target.value })}
                  className="w-full rounded-2xl border border-cafe-700/80 bg-cafe-900/72 px-4 py-3 text-cafe-50 outline-none transition-colors focus:border-accent/60"
                />
              </div>

              <div className="glass-card">
                <label className="block text-sm font-medium text-cafe-100/70 mb-3">El yazısı stili</label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {THEME_FONTS.map((font) => (
                    <button
                      key={font.value}
                      type="button"
                      onClick={() => setSettings({ ...settings, handwritingFont: font.value })}
                      className={`rounded-2xl border px-3 py-3 text-lg transition-colors ${
                        settings.handwritingFont === font.value
                          ? 'border-accent/30 bg-[color:var(--color-accent)]/10 text-[color:var(--color-accent)]'
                            : 'border-cafe-700/80 bg-cafe-900/72 text-cafe-50 hover:border-accent/30'
                      }`}
                      style={{ fontFamily: font.value }}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-card">
              <label className="block text-sm font-medium text-cafe-100/70 mb-3">Vurgu rengi</label>
              <div className="flex flex-wrap gap-3">
                {THEME_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSettings({ ...settings, accentColor: color.value })}
                    className={`h-12 w-12 rounded-full border-4 transition-transform ${
                      settings.accentColor === color.value
                        ? 'scale-110 border-white shadow-[0_0_0_4px_rgba(255,255,255,0.5)]'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                    aria-label={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="glass-card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="block text-sm font-medium text-cafe-100/70">Hazır tema kombinleri</label>
                  <p className="mt-1 text-sm text-cafe-100/68">Hızlıca dengeli bir görünüm seçebilirsiniz.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        accentColor: preset.accentColor,
                        handwritingFont: preset.handwritingFont,
                      })
                    }
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      settings.accentColor === preset.accentColor && settings.handwritingFont === preset.handwritingFont
                        ? 'border-accent/30 bg-[color:var(--color-accent)]/10'
                        : 'border-cafe-700/80 bg-cafe-900/72 hover:border-accent/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.accentColor }} />
                      <p className="text-sm font-semibold text-cafe-50">{preset.name}</p>
                    </div>
                    <p className="mt-3 text-lg text-cafe-50" style={{ fontFamily: preset.handwritingFont }}>
                      {DEFAULT_MEDIA_CAPTION}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-cafe-100/68">{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
        {activeView !== 'settings' && (
          <>
        <section className={`admin-dashboard ${activeView === 'panel' ? '' : 'hidden'}`}>
          <div className="admin-dashboard-kpis">
            {dashboardMetricCards.map((metric) => {
              const Icon = metric.icon;

              return (
                <article key={metric.label} className="admin-dashboard-kpi">
                  <div>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                    <small>{metric.trend}</small>
                  </div>
                  <div className={`admin-dashboard-kpi-icon is-${metric.tone}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </article>
              );
            })}
          </div>

          <div className="admin-dashboard-main-grid">
            <article className="admin-dashboard-card admin-chart-panel">
              <div className="admin-dashboard-card-head">
                <div>
                  <h3>Fotoğraf & Etkileşim Grafiği</h3>
                  <div className="admin-chart-legend">
                    <span><i className="is-photo" /> Fotoğraflar</span>
                    <span><i className="is-like" /> Beğeniler</span>
                  </div>
                </div>
                <div ref={chartDateRangePopoverRef} className="admin-chart-filter-wrap">
                  <button
                    type="button"
                    className="admin-card-filter"
                    onClick={() => {
                      setIsChartDateRangeOpen((current) => !current);
                      setIsDateRangeOpen(false);
                      setIsNotificationOpen(false);
                    }}
                  >
                    {chartDateRangeButtonLabel}
                  </button>
                  <AnimatePresence>
                    {isChartDateRangeOpen ? (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={CHART_MOTION_TRANSITION}
                      >
                        {renderDateRangePopover()}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>

              <div className="admin-chart-shell">
                <svg
                  viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
                  role="img"
                  aria-label={`${dashboardDateRangeLabel} aralığındaki fotoğraf ve beğeni grafiği`}
                  preserveAspectRatio="none"
                  onMouseLeave={() => setHoveredChartIndex(null)}
                  onMouseMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const relativeX = ((event.clientX - rect.left) / rect.width) * chartGeometry.width;

                    const nearestIndex = chartGeometry.points.reduce((closestIndex, point, index, allPoints) => {
                      if (closestIndex === 0 && index === 0) {
                        return 0;
                      }

                      const currentDistance = Math.abs(point.x - relativeX);
                      const closestDistance = Math.abs(allPoints[closestIndex].x - relativeX);
                      return currentDistance < closestDistance ? index : closestIndex;
                    }, 0);

                    setHoveredChartIndex(nearestIndex);
                  }}
                >
                  {[0, 1, 2, 3, 4].map((line) => {
                    const y = 24 + line * ((chartGeometry.baseline - 24) / 4);
                    return <line key={line} x1="34" x2="686" y1={y} y2={y} className="admin-chart-grid-line" />;
                  })}
                  <motion.path
                    d={chartGeometry.areaPath}
                    className="admin-chart-area"
                    initial={false}
                    animate={{ d: chartGeometry.areaPath }}
                    transition={CHART_MOTION_TRANSITION}
                  />
                  <motion.path
                    d={chartGeometry.photoPath}
                    className="admin-chart-line is-photo"
                    initial={false}
                    animate={{ d: chartGeometry.photoPath }}
                    transition={CHART_MOTION_TRANSITION}
                  />
                  <motion.path
                    d={chartGeometry.likePath}
                    className="admin-chart-line is-like"
                    initial={false}
                    animate={{ d: chartGeometry.likePath }}
                    transition={CHART_MOTION_TRANSITION}
                  />
                  {chartGeometry.points.map((point) => (
                    <g key={point.isoDate}>
                      <circle
                        cx={point.x}
                        cy={point.photoY}
                        r={activeChartPoint?.isoDate === point.isoDate ? 5.5 : 3.5}
                        className="admin-chart-dot is-photo"
                      />
                      <circle
                        cx={point.x}
                        cy={point.likeY}
                        r={activeChartPoint?.isoDate === point.isoDate ? 5.5 : 3.5}
                        className="admin-chart-dot is-like"
                      />
                    </g>
                  ))}
                  {activeChartPoint ? (
                    <g className="admin-chart-hover-layer">
                      <line
                        x1={activeChartPoint.x}
                        x2={activeChartPoint.x}
                        y1="24"
                        y2={chartGeometry.baseline}
                        className="admin-chart-hover-line"
                      />
                    </g>
                  ) : null}
                </svg>
                <AnimatePresence>
                  {activeChartPoint ? (
                    <motion.div
                      className="admin-chart-tooltip"
                      style={{ left: `${(activeChartPoint.x / chartGeometry.width) * 100}%` }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={CHART_MOTION_TRANSITION}
                    >
                      <strong>{formatDateLabelWithYear(activeChartPoint.date)}</strong>
                      <span>Fotoğraf: {activeChartPoint.photos}</span>
                      <span>Beğeni: {activeChartPoint.likes}</span>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <div
                  className="admin-chart-label-row"
                  style={{ gridTemplateColumns: `repeat(${dashboardChartData.length}, minmax(0, 1fr))` }}
                >
                  {dashboardChartData.map((point, index) => (
                    <span key={point.isoDate}>
                      {index % chartGeometry.labelStep === 0 || index === dashboardChartData.length - 1
                        ? point.label
                        : point.shortLabel}
                    </span>
                  ))}
                </div>
              </div>
            </article>

            <article className="admin-dashboard-card admin-active-campaign-card">
              <div className="admin-dashboard-card-head">
                <h3>Aktif Kampanya</h3>
                <button type="button" onClick={() => openAdminView('campaigns')} className="admin-card-filter">
                  Tümünü Gör
                </button>
              </div>

              <div className="admin-active-campaign-body">
                <div className="admin-campaign-collage">
                  {Array.from({ length: 4 }, (_, index) => {
                    const item = recentMediaItems[index];

                    return item?.url ? (
                      <article
                        key={item.id}
                        className="admin-campaign-collage-tile"
                      >
                        <img
                          src={item.url}
                          alt={item.caption}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                        />
                      </article>
                    ) : (
                      <span key={`campaign-empty-${index}`} className="admin-campaign-collage-placeholder">
                        <ImageIcon className="h-5 w-5" />
                      </span>
                    );
                  })}
                </div>

                <div className="admin-campaign-copy">
                  <span className="admin-campaign-state">Aktif</span>
                  <h3>{settings.campaignTarget} Fotoğraf Yükle<br />{settings.campaignReward} Kazan!</h3>
                  <p>Müşteriler {settings.campaignTarget} fotoğraf yüklesin, {settings.campaignReward} hediyesini kazansın.</p>
                  <ul>
                    <li><CalendarDays className="h-4 w-4" /> {campaignDateRangeLabel}</li>
                    <li><Users className="h-4 w-4" /> Katılım: {campaignParticipantCount}</li>
                    <li><Gift className="h-4 w-4" /> Kalan ödül: {remainingRewardCount}</li>
                  </ul>
                  <button type="button" onClick={() => openAdminView('campaigns')} className="admin-campaign-manage">
                    Kampanyayı Yönet
                  </button>
                </div>
              </div>
            </article>
          </div>

          <div className="admin-dashboard-bottom-grid">
            <article className="admin-dashboard-card admin-recent-photos-card">
              <div className="admin-dashboard-card-head">
                <h3>Son Yüklenen Fotoğraflar</h3>
                <button type="button" onClick={() => openAdminView('posts')} className="admin-card-filter">
                  Tümünü Gör
                </button>
              </div>
              <div className="admin-recent-photo-row">
                {recentMediaItems.length > 0 ? (
                  recentMediaItems.map((item) => (
                    <button key={item.id} type="button" onClick={() => openAdminView('posts')} className="admin-recent-photo">
                      <img src={item.url} alt={item.caption} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                      <span><Heart className="h-3.5 w-3.5" /> {item.likesCount}</span>
                    </button>
                  ))
                ) : (
                  <div className="admin-empty-inline">Seçili aralıkta fotoğraf görünmüyor.</div>
                )}
              </div>
            </article>

            <article className="admin-dashboard-card admin-email-performance-card">
              <div className="admin-dashboard-card-head">
                <h3>E-posta Kampanya Performansı</h3>
                <button type="button" onClick={() => openAdminView('marketing')} className="admin-card-filter">
                  Tüm Raporlar
                </button>
              </div>
              <div className="admin-email-performance-grid">
                {emailPerformanceCards.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className={`admin-email-performance-item is-${item.tone}`}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <small>{item.detail}</small>
                      <Icon className="h-5 w-5" />
                    </div>
                  );
                })}
              </div>
              <p className="admin-email-campaign-note">
                Son kampanya: {emailAnalyticsSummary?.latestCampaignSubject ?? emailCampaigns[0]?.subject ?? 'Henüz gönderim yok'}
              </p>
            </article>

            <article className="admin-dashboard-card admin-customer-table-card">
              <div className="admin-dashboard-card-head">
                <h3>Son Kayıt Olan Müşteriler</h3>
                <button type="button" onClick={() => openAdminView('customers')} className="admin-card-filter">
                  Tümünü Gör
                </button>
              </div>
              <div className="admin-customer-table">
                <div className="admin-customer-row is-head">
                  <span>Müşteri</span>
                  <span>Kayıt Tarihi</span>
                  <span>E-posta</span>
                </div>
                {recentCustomerRows.length > 0 ? (
                  recentCustomerRows.map((customer) => (
                    <div key={customer.id || customer.email} className="admin-customer-row">
                      <span className="admin-customer-primary">
                        <i>{(customer.name || customer.email).slice(0, 1).toLocaleUpperCase('tr')}</i>
                        <span className="admin-customer-copy">
                          <b>{customer.name || customer.email.split('@')[0]}</b>
                          <small>Müşteri kaydı</small>
                        </span>
                      </span>
                      <span>{formatCustomerDate(customer.createdAt)}</span>
                      <span className="admin-customer-email">
                        <Mail className="h-4 w-4" />
                        <small>{customer.email}</small>
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="admin-empty-inline">Seçili aralıkta yeni müşteri görünmüyor.</div>
                )}
              </div>
            </article>
          </div>
        </section>

        <section className="hidden">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="stat-card">
              <span className="stat-label">Toplam Paylaşım</span>
              <strong className="stat-value">{workspaceMediaItems.length}</strong>
              <p className="stat-note">Galeride yer alan tüm fotoğraflar</p>
            </div>
            <div className="stat-card">
              <span className="stat-label">Bugün</span>
              <strong className="stat-value">{todayUploadsCount}</strong>
              <p className="stat-note">Bugün eklenen yeni paylaşımlar</p>
            </div>
            <div className="stat-card">
              <span className="stat-label">Toplam Beğeni</span>
              <strong className="stat-value">{totalLikes}</strong>
              <p className="stat-note">Misafirlerin bıraktığı toplam etkileşim</p>
            </div>
            <div className="stat-card">
              <span className="stat-label">Aktif Masa</span>
              <strong className="stat-value">{uniqueTables.length}</strong>
              <p className="stat-note">Paylaşım gelen masa sayısı</p>
            </div>
          </div>

          <nav className="admin-overview-actions flex flex-wrap items-center gap-2 rounded-2xl border border-cafe-700/80 bg-cafe-900/60 px-3 py-3">
            <button
              type="button"
              onClick={openBrandView}
              className="inline-flex items-center gap-2 rounded-full border border-cafe-700/80 bg-cafe-900/72 px-3 py-2 text-xs font-semibold text-cafe-50 transition-colors hover:border-accent/40"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Ayarlar
            </button>
            <button type="button" onClick={() => openAdminView('campaigns')} className="inline-flex items-center gap-2 rounded-full border border-cafe-700/80 bg-cafe-900/72 px-3 py-2 text-xs font-semibold text-cafe-50 transition-colors hover:border-accent/40">
              <Gift className="w-3.5 h-3.5" />
              Kampanyalar
            </button>
            <button type="button" onClick={() => openAdminView('marketing')} className="inline-flex items-center gap-2 rounded-full border border-cafe-700/80 bg-cafe-900/72 px-3 py-2 text-xs font-semibold text-cafe-50 transition-colors hover:border-accent/40">
              <Megaphone className="w-3.5 h-3.5" />
              Pazarlama
            </button>
            <button type="button" onClick={() => openAdminView('posts')} className="inline-flex items-center gap-2 rounded-full border border-cafe-700/80 bg-cafe-900/72 px-3 py-2 text-xs font-semibold text-cafe-50 transition-colors hover:border-accent/40">
              <ImageIcon className="w-3.5 h-3.5" />
              Gönderiler
            </button>
            <button type="button" onClick={() => openAdminView('stats')} className="inline-flex items-center gap-2 rounded-full border border-cafe-700/80 bg-cafe-900/72 px-3 py-2 text-xs font-semibold text-cafe-50 transition-colors hover:border-accent/40">
              <BarChart3 className="w-3.5 h-3.5" />
              İstatistikler
            </button>
            <span className="ml-auto rounded-full bg-cafe-950/65 px-3 py-2 text-xs text-cafe-100/80">
              En aktif masa: {topTable ? topTable[0] : 'Henüz veri yok'}
            </span>
          </nav>
        </section>

        <section className={`section-shell space-y-5 ${activeView === 'stats' ? '' : 'hidden'}`}>
          <div className="admin-stats-dashboard">
            <div className="admin-stat-spotlight">
              <div>
                <span className="section-pill">Canlı performans</span>
                <h3>Seçili aralığın fotoğraf, masa ve etkileşim özeti</h3>
                <p>
                  Galerideki hareketi, kampanya ilerlemesini ve pazarlama limitlerini tek bakışta takip edin.
                </p>
              </div>

              <div className="admin-stat-rings">
                <div className="admin-radial-meter" style={{ '--progress': `${campaignProgressPercent}%` } as React.CSSProperties}>
                  <span>{campaignProgressPercent}%</span>
                </div>
                <div>
                  <strong>Kampanya ilerlemesi</strong>
                  <small>{selectedRangeMediaItems.length} / {settings.campaignTarget} paylaşım hedefi</small>
                </div>
              </div>
            </div>

            <div className="admin-stat-metric-grid">
              <div className="admin-stat-metric-card">
                <span className="admin-stat-card-icon"><ImageIcon className="h-4 w-4" /></span>
                <span className="stat-label">Seçili gönderi</span>
                <strong className="stat-value">{selectedRangeMediaItems.length}</strong>
                <p className="stat-note">{dashboardDateRangeLabel} aralığındaki galeri içerikleri</p>
              </div>
              <div className="admin-stat-metric-card">
                <span className="admin-stat-card-icon"><Clock className="h-4 w-4" /></span>
                <span className="stat-label">Tarih aralığı</span>
                <strong className="stat-value">{todayUploadsCount}</strong>
                <p className="stat-note">Seçili tarihte yüklenen yeni fotoğraf sayısı</p>
              </div>
              <div className="admin-stat-metric-card">
                <span className="admin-stat-card-icon"><Sparkles className="h-4 w-4" /></span>
                <span className="stat-label">Etkileşim</span>
                <strong className="stat-value">{totalLikes}</strong>
                <p className="stat-note">Gönderi başına ortalama {averageLikesPerPostLabel} beğeni</p>
              </div>
              <div className="admin-stat-metric-card">
                <span className="admin-stat-card-icon"><MapPin className="h-4 w-4" /></span>
                <span className="stat-label">Aktif masa</span>
                <strong className="stat-value">{selectedRangeTableCount}</strong>
                <p className="stat-note">
                  {topTable ? `${topTable[0]} toplamın %${topTableSharePercent}'ini oluşturuyor` : 'Masa verisi bekleniyor'}
                </p>
              </div>
            </div>

            <div className="admin-stat-analysis-grid">
              <div className="admin-chart-card">
                <div className="admin-card-heading">
                  <div>
                    <h3>Masa aktivitesi</h3>
                    <p>Paylaşım gelen masalar performansa göre sıralanır.</p>
                  </div>
                  <BarChart3 className="h-5 w-5 text-[color:var(--color-accent)]" />
                </div>

                <div className="admin-bar-list">
                  {tableActivity.length === 0 ? (
                    <p className="admin-empty-insight">Henüz masa aktivitesi oluşmadı.</p>
                  ) : (
                    tableActivity.map((entry, index) => {
                      const ratio = topTable
                        ? Math.max(8, Math.round((entry.count / topTable[1]) * 100))
                        : 0;

                      return (
                        <div key={entry.table} className="admin-bar-row">
                          <div className="admin-bar-row-copy">
                            <strong>{index + 1}. {entry.table}</strong>
                            <span>{entry.count} gönderi</span>
                          </div>
                          <div className="admin-bar-track" aria-hidden="true">
                            <span style={{ width: `${ratio}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="admin-chart-card">
                <div className="admin-card-heading">
                  <div>
                    <h3>Pazarlama nabzı</h3>
                    <p>E-posta havuzu, günlük limit ve kampanya hazırlığı.</p>
                  </div>
                  <Mail className="h-5 w-5 text-[color:var(--color-accent)]" />
                </div>

                <div className="admin-mini-metrics">
                  <div>
                    <span>Yeni misafir</span>
                    <strong>{rangeCustomerCount}</strong>
                  </div>
                  <div>
                    <span>Gönderilen</span>
                    <strong>{emailDeliveredTotal}</strong>
                  </div>
                  <div>
                    <span>Başarısız</span>
                    <strong>{emailFailedTotal}</strong>
                  </div>
                </div>

                <div className="admin-limit-card">
                  <div className="admin-radial-meter is-small" style={{ '--progress': `${emailLimitUsagePercent}%` } as React.CSSProperties}>
                    <span>{emailLimitUsagePercent}%</span>
                  </div>
                  <div>
                    <strong>Günlük gönderim kullanımı</strong>
                    <small>{emailLimitTotal > 0 ? `${emailSentToday} / ${emailLimitTotal} e-posta` : 'Limit bilgisi bekleniyor'}</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-insight-strip">
              <div>
                <span>En aktif masa</span>
                <strong>{topTable ? topTable[0] : 'Henüz yok'}</strong>
                <small>{topTable ? `${topTable[1]} gönderi ile öne çıkıyor` : 'Seçili aralıkta henüz masa hareketi yok'}</small>
              </div>
              <div>
                <span>Filtrelenen içerik</span>
                <strong>{filteredMediaItems.length}</strong>
                <small>Mevcut arama ve masa filtresine göre görünen gönderi</small>
              </div>
              <div>
                <span>Kampanya hedefi</span>
                <strong>{settings.campaignTarget} fotoğraf</strong>
                <small>{settings.campaignReward} ödülü için takip edilen hedef</small>
              </div>
            </div>
          </div>
        </section>

        <section id="admin-campaign" className={`admin-campaign-page scroll-mt-28 lg:scroll-mt-32 ${activeView === 'campaigns' ? '' : 'hidden'}`}>
          <div className="admin-campaign-page-head">
            <div>
              <h2>Kampanyalar</h2>
              <p>Kampanyaları oluşturun ve yayın durumunu yönetin.</p>
            </div>
            <button type="button" onClick={openCreateCampaignComposer} className="admin-campaign-create">
              <Plus className="h-4 w-4" />
              Yeni Kampanya Oluştur
            </button>
          </div>

          <div className="admin-campaign-metrics">
            {campaignMetricCards.map((metric) => {
              const Icon = metric.icon;

              return (
                <article key={metric.label} className="admin-campaign-metric-card">
                  <div className="admin-campaign-metric-head">
                    <span className="admin-campaign-metric-icon">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <small>{metric.label}</small>
                      <strong>{metric.value}</strong>
                    </div>
                  </div>
                  <div className="admin-campaign-metric-foot">
                    <span>{metric.footer}</span>
                    {metric.trend ? (
                      <em>{metric.trend}</em>
                    ) : metric.action ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCampaignSearchTerm('');
                          setCampaignTab('all');
                          setCampaignPage(1);
                        }}
                      >
                        {metric.action} →
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          {emailNotice ? (
            <div className="admin-campaign-notice">
              <Megaphone className="h-4 w-4" />
              <span>{emailNotice}</span>
            </div>
          ) : null}

          <AnimatePresence>
            {campaignComposerMode !== 'closed' ? (
              <motion.div
                className="admin-campaign-composer-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="admin-campaign-composer"
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 18, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <div className="admin-campaign-composer-head">
                    <div className="admin-campaign-composer-title">
                      <span className="admin-campaign-composer-badge">
                        <Megaphone className="h-4 w-4" />
                      </span>
                      <div className="admin-campaign-composer-copy">
                        <span>{campaignComposerMode === 'create' ? 'Kampanya Yönetimi' : 'Kampanya Merkezi'}</span>
                        <h3>
                          {campaignComposerMode === 'create'
                            ? 'Yeni Kampanya Oluştur'
                            : campaignComposerMode === 'edit'
                              ? 'Kampanyayı Düzenle'
                              : selectedCampaign?.subject ?? 'Kampanya Detayları'}
                        </h3>
                        {campaignComposerMode === 'create' ? (
                          <>
                            <p className="admin-campaign-create-note">
                              Kafenizin en etkili kampanyasını burada tasarlayın. Her detay müşteri deneyimini güzelleştirecektir.
                            </p>
                            <div className="admin-campaign-composer-highlights" aria-label="Kampanya oluşturma özellikleri">
                              <span>
                                <Sparkles className="h-3.5 w-3.5" />
                                3 adımda hazır
                              </span>
                              <span>
                                <ImageIcon className="h-3.5 w-3.5" />
                                Görselli yayın
                              </span>
                              <span>
                                <SendHorizontal className="h-3.5 w-3.5" />
                                Anında paylaşım
                              </span>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <button type="button" onClick={closeCampaignComposer} aria-label="Kampanya panelini kapat">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div
                    className={`admin-campaign-composer-grid ${
                      campaignComposerMode === 'detail' || campaignComposerMode === 'create' || campaignComposerMode === 'edit' ? 'is-single' : ''
                    } ${campaignComposerMode === 'create' ? 'is-create' : ''}`}
                  >
                    {campaignComposerMode === 'edit' ? (
                      <aside className="admin-campaign-audience-panel hidden">
                        <div className="admin-campaign-panel-title">
                          <Users className="h-4 w-4" />
                          <strong>Alıcılar</strong>
                        </div>
                        <div className="admin-campaign-audience-list">
                          {emailAudienceGroups.map((group) => (
                            <button
                              key={group.key}
                              type="button"
                              className={selectedAudienceKey === group.key ? 'is-selected' : ''}
                              onClick={() => setSelectedAudienceKey(group.key)}
                            >
                              <strong>{group.label}</strong>
                              <span>{group.description}</span>
                              <small>{group.customers.length} kişi</small>
                            </button>
                          ))}
                        </div>
                        <div className="admin-campaign-audience-summary">
                          <span>Seçili Hedef Kitle</span>
                          <strong>{selectedAudienceCount}</strong>
                          <small>{selectedAudience?.label ?? 'Alıcı grubu'} içinde gönderime hazır adres</small>
                        </div>
                        <div className="admin-campaign-recipient-list">
                          <span>E-Posta Adresleri</span>
                          {selectedAudienceCustomers.length > 0 ? (
                            <div>
                              {selectedAudienceCustomers.slice(0, 10).map((customer) => {
                                const email = customer.email;
                                const isExcluded = excludedAudienceEmailSet.has(email);

                                return (
                                  <button
                                    key={customer.id || email}
                                    type="button"
                                    className={isExcluded ? 'is-excluded' : ''}
                                    onClick={() =>
                                      setExcludedAudienceEmails((current) =>
                                        isExcluded
                                          ? current.filter((item) => item !== email)
                                          : current.includes(email)
                                            ? current
                                            : [...current, email]
                                      )
                                    }
                                  >
                                    <strong>{customer.name || email}</strong>
                                    <small>{customer.name ? email : isExcluded ? 'Çıkarıldı' : 'Seçili'}</small>
                                  </button>
                                );
                              })}
                              {selectedAudienceCustomers.length > 10 ? (
                                <p>+{selectedAudienceCustomers.length - 10} adres daha</p>
                              ) : null}
                            </div>
                          ) : (
                            <p>Bu grup için henüz e-posta bulunmuyor.</p>
                          )}
                        </div>
                      </aside>
                    ) : null}
                    <div className="admin-campaign-editor-panel">
                      {campaignComposerMode === 'detail' && selectedCampaign ? (
                        <div className="admin-campaign-detail-panel">
                          <div className="admin-campaign-detail-stats">
                            <div>
                              <span>Durum</span>
                              <strong>{getWebsiteCampaignStatusLabel(selectedCampaign.status)}</strong>
                            </div>
                            <div>
                              <span>Kategori</span>
                              <strong>{getCampaignCategoryLabel(selectedCampaign.tag)}</strong>
                            </div>
                            <div>
                              <span>Görsel</span>
                              <strong>{selectedCampaign.imageUrl ? 'Var' : 'Yok'}</strong>
                            </div>
                            <div>
                              <span>Kayıt</span>
                              <strong>{selectedCampaign.createdAt ? formatCampaignDateTime(selectedCampaign.createdAt) : '-'}</strong>
                            </div>
                          </div>
                          <div className="admin-campaign-message-preview">
                            {selectedCampaign.imageUrl ? (
                              <img src={selectedCampaign.imageUrl} alt={selectedCampaign.subject} loading="lazy" decoding="async" />
                            ) : null}
                            <span>Kampanya metni</span>
                            {selectedCampaign.description ? <strong>{selectedCampaign.description}</strong> : null}
                            <p>{selectedCampaign.textContent}</p>
                          </div>
                          <div className="admin-campaign-recipient-list">
                            <span>Yayın bilgisi</span>
                            <p>Kampanya yayındaki içerikler arasında listelenir.</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {campaignComposerMode === 'create' ? (
                            <div className="admin-campaign-create-banner">
                              <div className="admin-campaign-create-banner-icon">
                                <Sparkles className="h-5 w-5" />
                              </div>
                              <div className="admin-campaign-create-banner-content">
                                <strong>Kampanyanızı Tasarlayın</strong>
                                <p>Başlık, açıklama ve görselle kampanyanızı hazırlayın.</p>
                              </div>
                            </div>
                          ) : null}

                          <div className="admin-campaign-form-section">
                            <div className="admin-campaign-form-header">
                              <span className="admin-campaign-form-step">1</span>
                              <div>
                                <h4>Kampanya Bilgileri</h4>
                                <p>Kampanyanızın adı ve açıklamasını girin</p>
                              </div>
                            </div>

                            <label className="admin-campaign-field">
                              <span>Kampanya Adı</span>
                              <input
                                type="text"
                                value={campaignSubjectInput}
                                onChange={(event) => setCampaignSubjectInput(event.target.value)}
                                placeholder="Örn: Hafta Sonu İndirim Kampanyası"
                              />
                              <small className="admin-campaign-field-hint">{campaignSubjectInput.length}/50 karakter</small>
                            </label>

                            <label className="admin-campaign-field">
                              <span>Kampanya Açıklaması / Detayı</span>
                              <textarea
                                value={campaignDescriptionInput}
                                onChange={(event) => setCampaignDescriptionInput(event.target.value)}
                                placeholder="Örn: Hafta sonuna özel seçili menülerde indirim fırsatını kaçırmayın..."
                                rows={4}
                              />
                            </label>
                          </div>

                          <div className="admin-campaign-form-section">
                            <div className="admin-campaign-form-header">
                              <span className="admin-campaign-form-step">2</span>
                              <div>
                                <h4>Görsel ve İçerik</h4>
                                <p>Kampanyanızın görselini seçin</p>
                              </div>
                            </div>

                            <div className="admin-campaign-media-row">
                              <div className="admin-campaign-image-picker">
                                <span>Kampanya Görseli</span>
                                <input
                                  ref={campaignImageFileInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="admin-campaign-file-input"
                                  onChange={(event) => {
                                    void handleCampaignImageFileChange(event);
                                  }}
                                />
                                <button
                                  type="button"
                                  className="admin-campaign-upload-button"
                                  onClick={handleSelectCampaignImageClick}
                                  disabled={campaignImageUploadBusy || emailActionBusy}
                                >
                                  {campaignImageUploadBusy ? 'Yükleniyor...' : 'Görsel Seç'}
                                </button>
                                <small className="admin-campaign-field-hint">{campaignImageFileName || 'Henüz görsel seçilmedi • JPEG, PNG, WebP'}</small>
                              </div>
                              <div className="admin-campaign-image-preview">
                                {campaignImageUrlInput ? (
                                  <img src={campaignImageUrlInput} alt="Kampanya görseli" loading="lazy" decoding="async" />
                                ) : (
                                  <div className="admin-campaign-image-placeholder">
                                    <ImageIcon className="h-6 w-6" />
                                    <span>Görsel Önizlemesi</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="admin-campaign-form-section">
                            <div className="admin-campaign-form-header">
                              <span className="admin-campaign-form-step">3</span>
                              <div>
                                <h4>Kategori</h4>
                                <p>Kampanyanızı daha kolay ayırt etmek için kategori seçin</p>
                              </div>
                            </div>

                            <div className="admin-campaign-category-grid" role="radiogroup" aria-label="Kampanya kategorisi">
                              {CAMPAIGN_CATEGORY_OPTIONS.map((category) => {
                                const Icon = category.icon;
                                const isSelected = campaignTag === category.value;

                                return (
                                  <button
                                    key={category.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={isSelected}
                                    className={`admin-campaign-category-option ${isSelected ? 'is-selected' : ''}`}
                                    onClick={() => setCampaignTag(category.value)}
                                  >
                                    <span className="admin-campaign-category-icon">
                                      <Icon className="h-4 w-4" />
                                    </span>
                                    <span className="admin-campaign-category-copy">
                                      <strong>{category.label}</strong>
                                      <small>{category.description}</small>
                                    </span>
                                    <span className="admin-campaign-category-indicator" aria-hidden="true" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    

                      <div className="admin-campaign-composer-actions">
                        {campaignComposerMode === 'create' ? (
                          <button
                            type="button"
                            onClick={() => {
                              void handleSaveCampaignDraft();
                            }}
                            disabled={campaignImageUploadBusy || !campaignSubjectInput.trim() || !campaignDescriptionInput.trim()}
                          >
                            Kampanyayı Yayınla
                          </button>
                        ) : campaignComposerMode === 'detail' && selectedCampaign ? (
                          <>
                            {['published', 'draft', 'scheduled'].includes(selectedCampaign.status) ? (
                              <>
                                <button type="button" className="is-secondary" onClick={() => openCampaignEdit(selectedCampaign)}>
                                  Düzenle
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleSaveCampaignDraft();
                                  }}
                                  disabled={emailActionBusy}
                                >
                                  <Save className="h-4 w-4" />
                                  Kampanyayı Güncelle
                                </button>
                                <button
                                  type="button"
                                  className="is-danger"
                                  onClick={() => {
                                    void handleDeleteCampaign(selectedCampaign);
                                  }}
                                  disabled={emailActionBusy}
                                >
                                  Sil
                                </button>
                              </>
                            ) : (
                              <>
                                {getCampaignTabKey(selectedCampaign.status) === 'archived' ? (
                                  <button
                                    type="button"
                                    className="is-secondary"
                                    onClick={() => {
                                      void handleRestoreCampaign(selectedCampaign);
                                    }}
                                    disabled={emailActionBusy}
                                  >
                                    Geri al
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="is-secondary"
                                    onClick={() => {
                                      void handleArchiveCampaign(selectedCampaign);
                                    }}
                                    disabled={emailActionBusy}
                                  >
                                    Yayından Kaldır
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="is-danger"
                                  onClick={() => {
                                    void handleDeleteCampaign(selectedCampaign);
                                  }}
                                  disabled={emailActionBusy}
                                >
                                  Sil
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <button type="button" className="is-secondary" onClick={() => openCampaignEdit(selectedCampaign)}>
                              Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void handleSaveCampaignDraft();
                              }}
                              disabled={campaignImageUploadBusy || !campaignSubjectInput.trim() || !campaignDescriptionInput.trim()}
                            >
                              Kampanyayı Güncelle
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="admin-campaign-layout">
            <div className="admin-campaign-main">
              <div className="admin-campaign-controls">
                <div className="admin-campaign-tabs" role="tablist" aria-label="Kampanya durumları">
                  {CAMPAIGN_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={campaignTab === tab.key}
                      className={campaignTab === tab.key ? 'is-active' : ''}
                      onClick={() => setCampaignTab(tab.key)}
                    >
                      {tab.label}
                      <span>{campaignStatusCounts[tab.key]}</span>
                    </button>
                  ))}
                </div>

                <div className="admin-campaign-search-row">
                  <label className="admin-campaign-search">
                    <Search className="h-4 w-4" />
                    <input
                      type="text"
                      value={campaignSearchTerm}
                      onChange={(event) => setCampaignSearchTerm(event.target.value)}
                      placeholder="Kampanya ara..."
                    />
                  </label>
                  <button
                    type="button"
                    className={`admin-campaign-filter ${isCampaignFilterOpen ? 'is-active' : ''}`}
                    aria-expanded={isCampaignFilterOpen}
                    onClick={() => {
                      setIsCampaignFilterOpen((current) => !current);
                    }}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filtrele
                  </button>
                </div>

                {isCampaignFilterOpen ? (
                  <div className="admin-campaign-filter-panel">
                    <div>
                      <span>Aktif filtre</span>
                      <strong>{campaignDataFilterLabel}</strong>
                    </div>
                    <div className="admin-campaign-filter-options">
                      {CAMPAIGN_DATA_FILTERS.map((filter) => (
                        <button
                          key={filter.key}
                          type="button"
                          className={campaignDataFilter === filter.key ? 'is-selected' : ''}
                          onClick={() => {
                            setCampaignDataFilter(filter.key);
                            setIsCampaignFilterOpen(false);
                          }}
                        >
                          <strong>{filter.label}</strong>
                          <small>{filter.hint}</small>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="admin-campaign-filter-reset"
                      onClick={() => {
                        setCampaignSearchTerm('');
                        setCampaignTab('all');
                        setCampaignDataFilter('all');
                        setIsCampaignFilterOpen(false);
                      }}
                    >
                      Filtreleri temizle
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="admin-campaign-table">
                        <div className="admin-campaign-row is-head">
                          <span>Kampanya Adı</span>
                          <span>Durum</span>
                          <span>Kategori</span>
                          <span>İşlemler</span>
                        </div>

                        {campaignVisibleRows.length > 0 ? (
                          campaignVisibleRows.map((campaign, index) => {
                            const statusMeta = getCampaignStatusMeta(campaign.status);
                            const tagLabel = getCampaignCategoryLabel(campaign.tag);

                    return (
                      <motion.div
                        key={campaign.id}
                        className="admin-campaign-row"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...CHART_MOTION_TRANSITION, delay: Math.min(index * 0.025, 0.14) }}
                      >
                        <span className="admin-campaign-name-cell">
                          <i>
                            {campaign.imageUrl ? (
                              <img src={campaign.imageUrl} alt="" loading="lazy" decoding="async" />
                            ) : (
                              <Megaphone className="h-5 w-5" />
                            )}
                          </i>
                          <span>
                            <b>{campaign.subject}</b>
                            <small>{getCampaignDescription(campaign)}</small>
                          </span>
                        </span>
                        <span>
                          <em className={`admin-campaign-status ${statusMeta.className}`}>{getWebsiteCampaignStatusLabel(campaign.status)}</em>
                        </span>
                        <span className="admin-campaign-date-cell">
                          <em>{tagLabel}</em>
                        </span>
                        <span className="admin-campaign-actions" onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            aria-label={`${campaign.subject} işlemleri`}
                            aria-expanded={openCampaignActionId === campaign.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenCampaignActionId((current) => (current === campaign.id ? null : campaign.id));
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          <AnimatePresence>
                            {openCampaignActionId === campaign.id ? (
                              <motion.div
                                className="admin-campaign-action-menu"
                                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                                transition={{ duration: 0.16, ease: 'easeOut' }}
                              >
                                {['published', 'draft', 'scheduled'].includes(campaign.status) ? (
                                  <>
                                    <button type="button" onClick={() => openCampaignEdit(campaign)}>
                                      <Settings className="h-4 w-4" />
                                      Düzenle
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void handleArchiveCampaign(campaign);
                                      }}
                                      disabled={emailActionBusy}
                                    >
                                      <Archive className="h-4 w-4" />
                                      Yayından Kaldır
                                    </button>
                                    <button
                                      type="button"
                                      className="is-danger"
                                      onClick={() => {
                                        void handleDeleteCampaign(campaign);
                                      }}
                                      disabled={emailActionBusy}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Sil
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {getCampaignTabKey(campaign.status) === 'archived' ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          void handleRestoreCampaign(campaign);
                                        }}
                                        disabled={emailActionBusy}
                                      >
                                        <RotateCw className="h-4 w-4" />
                                        Yayına Geri Al
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          void handleArchiveCampaign(campaign);
                                        }}
                                        disabled={emailActionBusy}
                                      >
                                        <Archive className="h-4 w-4" />
                                        Yayından Kaldır
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="is-danger"
                                      onClick={() => {
                                        void handleDeleteCampaign(campaign);
                                      }}
                                      disabled={emailActionBusy}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Sil
                                    </button>
                                  </>
                                )}
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </span>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="admin-campaign-empty">
                    <Megaphone className="h-8 w-8" />
                    <h3>Filtreye uygun kampanya bulunamadı</h3>
                    <p>Arama terimini veya kampanya durum filtresini değiştirerek tekrar deneyin.</p>
                  </div>
                )}

                {campaignFilteredRows.length > 0 ? (
                  <div className="admin-campaign-table-footer">
                    <div className="admin-campaign-pagination">
                      <button
                        type="button"
                        disabled={campaignPage <= 1}
                        onClick={() => setCampaignPage((current) => Math.max(1, current - 1))}
                        aria-label="Önceki kampanya sayfası"
                      >
                        ‹
                      </button>
                      {campaignPageNumbers.map((page, index) => {
                        const previousPage = campaignPageNumbers[index - 1];
                        const showGap = previousPage && page - previousPage > 1;

                        return (
                          <React.Fragment key={page}>
                            {showGap ? <span>...</span> : null}
                            <button
                              type="button"
                              className={page === campaignPage ? 'is-active' : ''}
                              onClick={() => setCampaignPage(page)}
                              aria-label={`${page}. kampanya sayfası`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
                      <button
                        type="button"
                        disabled={campaignPage >= campaignTotalPages}
                        onClick={() => setCampaignPage((current) => Math.min(campaignTotalPages, current + 1))}
                        aria-label="Sonraki kampanya sayfası"
                      >
                        ›
                      </button>
                    </div>

                    <div className="admin-campaign-page-size">
                      <span>Göster:</span>
                      <DropdownSelect
                        value={`${campaignPageSize}`}
                        onChange={(value) => setCampaignPageSize(Number(value))}
                        options={CAMPAIGN_PAGE_SIZE_OPTIONS}
                        ariaLabel="Sayfa başına kampanya"
                        className="admin-campaign-size-select"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <aside className="admin-campaign-side">
              <article className="admin-campaign-side-card">
                <div className="admin-campaign-side-head">
                  <h3>Kafe Görünümü</h3>
                  <button type="button">{effectiveWorkspaceSlug}</button>
                </div>
                <strong>{formatCompactNumber(campaignActiveRows.length)}</strong>
                <p>Yayında görünen kampanya</p>
                <span>
                  {latestWebsiteCampaign
                    ? `Son kampanya: ${latestWebsiteCampaign.subject}`
                    : 'Henüz yayında kampanya yok'}
                </span>
              </article>

              <article className="admin-campaign-side-card">
                <h3>Yayındaki Kampanyalar</h3>
                <div className="admin-campaign-top-list">
                  {campaignPreviewRows.length > 0 ? (
                    campaignPreviewRows.map((campaign, index) => (
                      <button
                        key={campaign.id}
                        type="button"
                        onClick={() => {
                          void openCampaignDetail(campaign);
                        }}
                      >
                        <i>{index + 1}</i>
                        <span className="admin-campaign-top-thumb">
                          {campaign.imageUrl ? (
                            <img src={campaign.imageUrl} alt="" loading="lazy" decoding="async" />
                          ) : (
                            <Megaphone className="h-4 w-4" />
                          )}
                        </span>
                        <span>
                          <b>{campaign.subject}</b>
                          <small>{getCampaignDescription(campaign)}</small>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="admin-campaign-side-empty">Henüz yayınlanmış kampanya yok.</p>
                  )}
                </div>
              </article>

            </aside>
          </div>
        </section>

        <section className={`admin-qr-dashboard ${activeView === 'qr' ? '' : 'hidden'}`}>
          <div className="admin-qr-dashboard-head">
            <div>
              <h2>QR Standlar</h2>
              <p>Standlarınızı ve masa yerleşimlerini yönetin. Kurulum taleplerini ekibimize iletin.</p>
            </div>
            <div className="admin-qr-head-actions">
              <button type="button" className="admin-qr-ghost-button" onClick={() => void loadQrDashboard()} disabled={qrDashboardLoading}>
                <RotateCw className={`h-4 w-4 ${qrDashboardLoading ? 'animate-spin' : ''}`} />
                Yenile
              </button>
              <button type="button" className="admin-qr-primary-button" onClick={openQrRequestModal}>
                <Plus className="h-4 w-4" />
                Yeni QR Stand Talebi
              </button>
            </div>
          </div>

          {qrDashboardError ? <div className="admin-qr-alert">{qrDashboardError}</div> : null}
          {qrRequestNotice ? <div className="admin-qr-success">{qrRequestNotice}</div> : null}

          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 mb-8">
            {qrDashboardMetrics.map((metric) => {
              const Icon = metric.icon;
              const isTrend = metric.helper.startsWith('%');

              return (
                <div key={metric.label} className="stat-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5 text-cafe-200" />
                    <span className="stat-label mb-0">{metric.label}</span>
                  </div>
                  <strong className="stat-value text-2xl">{metric.value}</strong>
                  <p className="stat-note mt-1">
                    {isTrend ? '↑ ' : ''}
                    {metric.helper}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="admin-qr-stand-table-card">
            <div className="admin-qr-card-head">
              <h3>QR Standlarım</h3>
              <span className="admin-qr-card-summary">
                {formatCompactNumber(qrDashboardSummary.totalStands)} stand · {formatCompactNumber(qrDashboardSummary.totalTables)} masa
              </span>
            </div>
            <div className="admin-qr-table-toolbar">
              <label className="admin-qr-search">
                <Search className="h-4 w-4" />
                <input
                  type="search"
                  placeholder="Stand veya konum ara..."
                  aria-label="Stand veya konum ara"
                  value={qrStandSearchTerm}
                  onChange={(event) => setQrStandSearchTerm(event.target.value)}
                />
              </label>
              <div className="admin-qr-toolbar-meta">
                <span>{formatCompactNumber(qrDashboardSummary.activeStands)} aktif stand</span>
                <span>{formatCompactNumber(qrDashboardSummary.pendingRequests)} bekleyen talep</span>
              </div>
            </div>

            <div className="admin-qr-table">
              <div className="admin-qr-table-row is-head">
                <span>Stand Adı</span>
                <span>Masa Sayısı</span>
                <span>Talep Sayısı</span>
                <span>Konum</span>
                <span>Durum</span>
              </div>

              {qrDashboardLoading ? (
                <div className="admin-qr-empty-row">QR stand verileri yükleniyor...</div>
              ) : qrDashboardRows.length > 0 ? (
                qrDashboardRows.map((stand) => {
                  const statusLabel =
                    stand.status === 'active' ? 'Aktif' : stand.status === 'pending' ? 'Beklemede' : 'Pasif';

                  return (
                    <div key={stand.id} className="admin-qr-table-row">
                      <span className="admin-qr-stand-name">
                        <span className={`admin-qr-stand-thumb is-${stand.status === 'active' ? 'counter' : stand.status === 'pending' ? 'window' : 'bar'}`}>
                          <span className="admin-qr-mini-stand">
                            <QrCode className="h-3.5 w-3.5" />
                          </span>
                        </span>
                        <span>
                          <b>{stand.name}</b>
                          {stand.notes ? <small>{stand.notes}</small> : <small>{stand.location}</small>}
                        </span>
                      </span>
                      <span className="admin-qr-number-cell">
                        <strong>{formatCompactNumber(stand.tableCount)}</strong>
                        <small>Masa</small>
                      </span>
                      <span className="admin-qr-number-cell">
                        <strong>{formatCompactNumber(stand.requestCount ?? 0)}</strong>
                        <small>Talep</small>
                      </span>
                      <span className="admin-qr-stand-location">{stand.location}</span>
                      <span className={`admin-qr-status-cell ${stand.status !== 'active' ? 'is-passive' : ''} ${stand.status === 'pending' ? 'is-pending' : ''}`}>
                        <strong>{statusLabel}</strong>
                        <small>{stand.updatedAt ? formatDateLabelWithYear(new Date(stand.updatedAt)) : 'Güncel'}</small>
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="admin-qr-empty-state">
                  <strong>Henüz kayıtlı stand yok.</strong>
                  <p>İlk kurulum talebini oluşturun, ekibimiz sizinle iletişime geçsin.</p>
                  <button type="button" className="admin-qr-primary-button" onClick={openQrRequestModal}>
                    <Plus className="h-4 w-4" />
                    Yeni QR Stand Talebi
                  </button>
                </div>
              )}
            </div>

            <div className="admin-qr-table-footer">
              <span>{formatCompactNumber(qrDashboardRows.length)} stand listeleniyor</span>
              <span>
                Son talep: {qrDashboardSummary.latestRequestAt ? formatDateLabelWithYear(new Date(qrDashboardSummary.latestRequestAt)) : 'Yok'}
              </span>
            </div>
          </div>
        </section>

        <AnimatePresence>
          {isQrRequestModalOpen ? (
            <motion.div
              className="admin-qr-request-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeQrRequestModal}
            >
              <motion.div
                className="admin-qr-request-modal !max-w-md"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="admin-qr-request-head border-b-0 pb-0 relative">
                  <div className="text-center w-full mt-4">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-cafe-50">Hızlı Kurulum Talebi</h3>
                    <p className="mt-3 text-sm leading-relaxed text-cafe-200">
                      Yeni QR stand kurulumu veya mevcut standlarınızı güncellemek için ekibimizle WhatsApp üzerinden anında iletişime geçebilirsiniz.
                    </p>
                  </div>
                  <button type="button" onClick={closeQrRequestModal} aria-label="Talebi kapat" className="absolute top-4 right-4 text-cafe-300 hover:text-cafe-50">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="admin-qr-request-actions mt-8 flex-col gap-3 pb-2 border-t-0 pt-0">
                  <a 
                    href="https://wa.me/905550497360?text=Merhaba,%20ShareVibe%20QR%20Stand%20kurulumu%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum." 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#20bd5a] shadow-lg shadow-[#25D366]/20"
                    onClick={closeQrRequestModal}
                  >
                    WhatsApp ile İletişime Geç
                  </a>
                  <button type="button" className="admin-qr-ghost-button w-full justify-center text-cafe-300" onClick={closeQrRequestModal}>
                    Daha sonra
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <section className={`section-shell admin-customer-section space-y-5 ${activeView === 'customers' ? '' : 'hidden'}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="section-pill">Müşteriler</span>
              <h2 className="mt-3 text-3xl font-serif font-semibold text-cafe-50">Kayıtlı misafirler</h2>
              <p className="mt-2 text-sm leading-7 text-cafe-100/72">
                E-posta pazarlamasına dahil olan doğrulanmış Google misafirlerini ve gönderim temaslarını takip edin.
              </p>
            </div>
            <button type="button" onClick={() => void loadEmailData()} className="admin-secondary-action">
              <RotateCw className="h-4 w-4" />
              Listeyi yenile
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="stat-card">
              <span className="stat-label">Toplam müşteri</span>
              <strong className="stat-value">{emailCustomerTotal}</strong>
              <p className="stat-note">Doğrulanmış e-posta kaydı</p>
            </div>
            <div className="stat-card">
              <span className="stat-label">Aktif alıcı</span>
              <strong className="stat-value">{selectedAudienceCount}</strong>
              <p className="stat-note">Seçili segmentteki kişi sayısı</p>
            </div>
            <div className="stat-card">
              <span className="stat-label">Gönderim geçmişi</span>
              <strong className="stat-value">{emailCampaigns.length}</strong>
              <p className="stat-note">Hazırlanan kampanya sayısı</p>
            </div>
          </div>

          <div className="admin-table-card">
            <div className="admin-table-row is-head">
              <span>Müşteri</span>
              <span>Kayıt Tarihi</span>
              <span>Etkileşim</span>
              <span>Durum</span>
            </div>
            {emailCustomers.length > 0 ? (
              emailCustomers.map((customer) => (
                <div key={customer.id || customer.email} className="admin-table-row">
                  <span className="admin-customer-primary">
                    <i>{(customer.name || customer.email).slice(0, 1).toLocaleUpperCase('tr')}</i>
                    <span className="admin-customer-copy">
                      <b>{customer.name || customer.email.split('@')[0]}</b>
                      <small>{customer.email}</small>
                    </span>
                  </span>
                  <span>{formatCustomerDate(customer.createdAt)}</span>
                  <span>{customer._count?.recipients ?? 0} gönderim</span>
                  <span className="admin-customer-channel"><ShieldCheck className="h-4 w-4" /> Doğrulandı</span>
                </div>
              ))
            ) : (
              <div className="admin-empty-inline">Henüz müşteri kaydı bulunmuyor.</div>
            )}
          </div>
        </section>

        <section className={`section-shell admin-template-section space-y-5 ${activeView === 'templates' ? '' : 'hidden'}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="section-pill">Şablonlar</span>
              <h2 className="mt-3 text-3xl font-serif font-semibold text-cafe-50">Hazır Türkçe kampanya metinleri</h2>
              <p className="mt-2 text-sm leading-7 text-cafe-100/72">
                Gönderim ekranında kullanabileceğiniz profesyonel konu ve e-posta metinlerini buradan seçin.
              </p>
            </div>
            <button type="button" onClick={() => openAdminView('marketing')} className="admin-primary-action">
              <Mail className="h-4 w-4" />
              E-posta hazırlamaya geç
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {EMAIL_TEMPLATES.map((template) => (
              <button
                key={template.key}
                type="button"
                onClick={() => {
                  setSelectedTemplateKey(template.key);
                  openAdminView('marketing');
                }}
                className="admin-template-card"
              >
                <span>{template.title}</span>
                <strong>{template.subject}</strong>
                <small>{template.textContent.split('\n\n')[0]}</small>
              </button>
            ))}
          </div>
        </section>

        <section id="admin-email" className={`section-shell space-y-5 scroll-mt-28 lg:scroll-mt-32 ${activeView === 'marketing' ? '' : 'hidden'}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="section-pill">E-posta Gönderimi</span>
              <h2 className="mt-3 text-3xl font-serif font-semibold text-cafe-50">Misafir gruplarına e-posta gönder</h2>
              <p className="mt-2 text-sm leading-7 text-cafe-100/72">
                Hazır misafir gruplarından birini seçin, profesyonel Türkçe şablonlardan birini uygulayın ve gönderimi başlatın.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void loadEmailData();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-cafe-700/80 bg-cafe-900/72 px-4 py-2.5 text-sm font-medium text-cafe-50 transition-colors hover:border-accent/40"
            >
              <Settings className="h-4 w-4" />
              Yenile
            </button>
          </div>

          {emailNotice && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {emailNotice}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="stat-card">
              <span className="stat-label">Seçili aralıkta gönderilen</span>
              <strong className="stat-value">{emailDeliveredTotal}</strong>
              <p className="stat-note">{dashboardDateRangeLabel} aralığında teslim edilen e-postalar</p>
            </div>
            <div className="stat-card">
              <span className="stat-label">Teslim oranı</span>
              <strong className="stat-value">%{emailDeliveryRate}</strong>
              <p className="stat-note">{rangeSentCampaignCount} kampanyanın gerçek teslim performansı</p>
            </div>
            <div className="stat-card">
              <span className="stat-label">Yeni alıcı</span>
              <strong className="stat-value">{rangeCustomerCount}</strong>
              <p className="stat-note">Seçili aralıkta listeye eklenen doğrulanmış misafirler</p>
            </div>
            <div className="stat-card">
              <span className="stat-label">Kampanya sayısı</span>
              <strong className="stat-value">{rangeCampaignCount}</strong>
              <p className="stat-note">{dashboardDateRangeLabel} aralığında oluşturulan kampanyalar</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
            <div className="glass-card space-y-4">
              <div className="flex items-center gap-2 text-cafe-50">
                <Users className="h-4 w-4 text-[color:var(--color-accent)]" />
                <h3 className="text-lg font-semibold">Misafir grubu seç</h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {emailAudienceGroups.map((group) => {
                  const isSelected = group.key === selectedAudienceKey;

                  return (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => setSelectedAudienceKey(group.key)}
                      className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                        isSelected
                          ? 'border-accent/40 bg-[color:var(--color-accent)]/12'
                          : 'border-cafe-700/80 bg-cafe-900/72 hover:border-accent/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-cafe-50">{group.label}</p>
                          <p className="mt-1 text-xs leading-5 text-cafe-100/68">{group.description}</p>
                        </div>
                        <span className="rounded-full border border-cafe-700/70 bg-cafe-950/60 px-2.5 py-1 text-xs font-semibold text-cafe-50">
                          {group.customers.length}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-cafe-700/80 bg-cafe-900/72 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-cafe-50">Seçili grup</p>
                    <p className="mt-1 text-sm text-cafe-100/68">{selectedAudience?.label}</p>
                  </div>
                  <div className="rounded-full bg-[color:var(--color-accent)]/12 px-3 py-1 text-sm font-semibold text-[color:var(--color-accent)]">
                    {selectedAudienceCount} kişi
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedAudienceCustomers.length > 0 ? (
                    selectedAudienceCustomers.map((customer) => {
                      const email = customer.email;
                      const isExcluded = excludedAudienceEmailSet.has(email);

                      return (
                        <span
                          key={customer.id || email}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                            isExcluded
                              ? 'border-cafe-700/80 bg-cafe-950/35 text-cafe-100/45 line-through'
                              : 'border-cafe-700/80 bg-cafe-950/60 text-cafe-100/82'
                          }`}
                        >
                          <span>{customer.name ? `${customer.name} · ${email}` : email}</span>
                          {!isExcluded ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExcludedAudienceEmails((current) =>
                                  current.includes(email) ? current : [...current, email]
                                )
                              }
                              className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-cafe-700/60 bg-cafe-900/70 text-cafe-100/75 transition-colors hover:border-red-300 hover:text-red-200"
                              aria-label={`${email} adresini seçili listeden kaldır`}
                              title="Listeden kaldır"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          ) : null}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-sm text-cafe-100/68">Bu grup için henüz e-posta bulunmuyor.</span>
                  )}
                </div>

                {excludedAudienceEmails.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setExcludedAudienceEmails([])}
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-cafe-700/80 bg-cafe-900/72 px-3 py-1.5 text-xs font-semibold text-cafe-100/82 transition-colors hover:border-accent/40"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Çıkarılanları geri ekle
                  </button>
                ) : null}
              </div>
            </div>

            <div className="glass-card space-y-4">
              <div className="flex items-center gap-2 text-cafe-50">
                <Mail className="h-4 w-4 text-[color:var(--color-accent)]" />
                <h3 className="text-lg font-semibold">Hazır Türkçe şablonlar</h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {EMAIL_TEMPLATES.map((template) => {
                  const isSelected = template.key === selectedTemplateKey;

                  return (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() => setSelectedTemplateKey(template.key)}
                      className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                        isSelected
                          ? 'border-accent/40 bg-[color:var(--color-accent)]/12'
                          : 'border-cafe-700/80 bg-cafe-900/72 hover:border-accent/30'
                      }`}
                    >
                      <p className="text-sm font-semibold text-cafe-50">{template.title}</p>
                      <p className="mt-1 text-xs leading-5 text-cafe-100/68">{template.subject}</p>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-cafe-700/80 bg-cafe-950/50 px-4 py-4 text-sm text-cafe-100/78">
                <p className="font-semibold text-cafe-50">Seçili şablon: {selectedTemplate.title}</p>
                <p className="mt-1 leading-6">
                  Konu ve içerik bu şablona göre dolduruldu. Göndermeden önce düzenleyebilirsiniz.
                </p>
              </div>

              <div className="space-y-3 rounded-2xl border border-cafe-700/80 bg-cafe-900/72 p-4">
                <label className="block text-sm font-medium text-cafe-100/80">Konu satırı</label>
                <input
                  type="text"
                  value={campaignSubjectInput}
                  onChange={(event) => setCampaignSubjectInput(event.target.value)}
                  placeholder="Örn: Bu hafta sonu sizi tekrar görmek isteriz"
                  className="w-full rounded-2xl border border-cafe-700/80 bg-cafe-950/55 px-4 py-3 text-cafe-50 outline-none transition-colors focus:border-accent/60"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-cafe-100/80">Gönderim Zamanı</label>
                    <DropdownSelect
                      value={campaignSchedule}
                      onChange={setCampaignSchedule}
                      options={SEND_TIME_OPTIONS}
                      ariaLabel="Gönderim zamanı seçimi"
                      icon={Clock}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cafe-100/80">Tekrar</label>
                    <DropdownSelect
                      value={campaignRepeat}
                      onChange={setCampaignRepeat}
                      options={REPEAT_OPTIONS}
                      ariaLabel="Tekrar seçimi"
                      icon={RotateCw}
                    />
                  </div>
                </div>

                <label className="block text-sm font-medium text-cafe-100/80">E-posta metni</label>
                <textarea
                  value={campaignTextInput}
                  onChange={(event) => setCampaignTextInput(event.target.value)}
                  rows={8}
                  className="w-full rounded-2xl border border-cafe-700/80 bg-cafe-950/55 px-4 py-3 text-cafe-50 outline-none transition-colors focus:border-accent/60"
                />

                <button
                  type="button"
                  onClick={() => {
                    void handleCreateCampaign();
                  }}
                  disabled={emailActionBusy || !selectedAudienceCount || !campaignSubjectInput.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--color-accent)] px-4 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <SendHorizontal className="h-4 w-4" />
                  Gönderimi başlat
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-cafe-50">Gönderim geçmişi</h3>
              {emailLoading && <span className="text-xs text-cafe-100/70">Yükleniyor...</span>}
            </div>

            {emailCampaigns.length === 0 ? (
              <p className="text-sm text-cafe-100/70">Henüz kayıtlı gönderim yok.</p>
            ) : (
              <div className="space-y-2">
                {emailCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="rounded-2xl border border-cafe-700/80 bg-cafe-900/72 px-4 py-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-cafe-50">{campaign.subject}</p>
                        <p className="mt-1 text-xs text-cafe-100/70">
                          Durum: {campaign.status} • Alıcı: {campaign.recipientCount ?? 0}
                        </p>
                      </div>
                      <span className="inline-flex items-center rounded-full border border-cafe-700/70 bg-cafe-950/60 px-3 py-1 text-xs text-cafe-100/78">
                        {getCampaignStatusLabel(campaign.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="admin-media" className={`admin-gallery-page scroll-mt-28 lg:scroll-mt-32 ${activeView === 'posts' ? '' : 'hidden'}`}>
          <div className="admin-gallery-metrics">
            {galleryMetricCards.map((metric) => {
              const Icon = metric.icon;

              return (
                <article key={metric.label} className="admin-gallery-metric-card">
                  <div className="admin-gallery-metric-head">
                    <span className="admin-gallery-metric-icon">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <small>{metric.label}</small>
                      <strong>{metric.value}</strong>
                    </div>
                  </div>
                  <div className="admin-gallery-metric-foot">
                    <span>{metric.footer}</span>
                    {metric.trend ? (
                      <em>{metric.trend}</em>
                    ) : metric.action ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm('');
                          setTableFilter('all');
                          setGalleryStatusFilter('all');
                          setGalleryPage(1);
                        }}
                      >
                        {metric.action} →
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="admin-gallery-board">
            <div className="admin-gallery-toolbar">
              <label className="admin-gallery-search">
                <Search className="h-4 w-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Galeri ara..."
                />
              </label>

              <DropdownSelect
                value={tableFilter}
                onChange={setTableFilter}
                options={tableOptions}
                ariaLabel="QR stand filtresi"
                icon={QrCode}
                className="admin-gallery-select"
              />

              <DropdownSelect
                value={galleryStatusFilter}
                onChange={(value) => setGalleryStatusFilter(value as GalleryStatusFilter)}
                options={GALLERY_STATUS_OPTIONS}
                ariaLabel="Durum filtresi"
                icon={ShieldCheck}
                className="admin-gallery-select"
              />

              <DropdownSelect
                value={sortMode}
                onChange={(value) => setSortMode(value as 'newest' | 'likes')}
                options={SORT_OPTIONS}
                ariaLabel="Sıralama seçimi"
                icon={ArrowUpDown}
                className="admin-gallery-select"
              />

              <div className="admin-gallery-view-toggle" aria-label="Galeri görünümü">
                <button
                  type="button"
                  className={galleryViewMode === 'grid' ? 'is-active' : ''}
                  onClick={() => setGalleryViewMode('grid')}
                  aria-label="Kart görünümü"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={galleryViewMode === 'list' ? 'is-active' : ''}
                  onClick={() => setGalleryViewMode('list')}
                  aria-label="Liste görünümü"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            {filteredMediaItems.length === 0 ? (
              <div className="admin-gallery-empty">
                <ImageIcon className="h-8 w-8" />
                <h3>Filtreye uygun fotoğraf bulunamadı</h3>
                <p>Arama, QR stand veya durum filtresini değiştirerek galeri içeriğini yeniden kontrol edin.</p>
              </div>
            ) : (
              <>
                <motion.div layout className={`admin-gallery-grid is-${galleryViewMode}`}>
                  {galleryVisibleItems.map((item, index) => {
                    const statusMeta = getMediaStatusMeta(item.status);

                    return (
                      <motion.article
                        layout
                        key={item.id}
                        className="admin-gallery-card"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...CHART_MOTION_TRANSITION, delay: Math.min(index * 0.025, 0.16) }}
                      >
                        <div className="admin-gallery-card-media">
                          {item.url ? (
                            <img
                              src={item.url}
                              alt={item.caption}
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="admin-gallery-card-placeholder">
                              <ImageIcon className="h-7 w-7" />
                            </div>
                          )}
                          <span className={`admin-gallery-status ${statusMeta.className}`}>{statusMeta.label}</span>
                        </div>

                        <div className="admin-gallery-card-body">
                          <div className="admin-gallery-card-title-row">
                            <div className="admin-gallery-card-copy">
                              <h3>{item.caption}</h3>
                              <p>{item.tableNumber}</p>
                            </div>

                            <div className="admin-gallery-actions" onClick={(event) => event.stopPropagation()}>
                              <button
                                type="button"
                                aria-label={`${item.caption} için işlemler`}
                                aria-expanded={openMediaActionId === item.id}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenMediaActionId((current) => (current === item.id ? null : item.id));
                                }}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              <AnimatePresence>
                                {openMediaActionId === item.id ? (
                                  <motion.div
                                    className="admin-gallery-action-menu"
                                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                                    transition={{ duration: 0.16, ease: 'easeOut' }}
                                  >
                                    <button
                                      type="button"
                                      disabled={isDeletingId === item.id || !canManageActiveWorkspace}
                                      onClick={() => {
                                        setOpenMediaActionId(null);
                                        setMediaToDelete(item);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Fotoğrafı sil
                                    </button>
                                  </motion.div>
                                ) : null}
                              </AnimatePresence>
                            </div>
                          </div>

                          <div className="admin-gallery-card-stats">
                            <span><Eye className="h-3.5 w-3.5" /> {formatCompactNumber(item.viewsCount)}</span>
                            <span><Heart className="h-3.5 w-3.5" /> {formatCompactNumber(item.likesCount)}</span>
                            <span><Share2 className="h-3.5 w-3.5" /> {formatCompactNumber(item.shareCount)}</span>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </motion.div>

                <div className="admin-gallery-footer">
                  <div className="admin-gallery-pagination">
                    <button
                      type="button"
                      disabled={galleryPage <= 1}
                      onClick={() => setGalleryPage((current) => Math.max(1, current - 1))}
                      aria-label="Önceki sayfa"
                    >
                      ‹
                    </button>
                    {galleryPageNumbers.map((page, index) => {
                      const previousPage = galleryPageNumbers[index - 1];
                      const showGap = previousPage && page - previousPage > 1;

                      return (
                        <React.Fragment key={page}>
                          {showGap ? <span>...</span> : null}
                          <button
                            type="button"
                            className={page === galleryPage ? 'is-active' : ''}
                            onClick={() => setGalleryPage(page)}
                            aria-label={`${page}. sayfa`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}
                    <button
                      type="button"
                      disabled={galleryPage >= galleryTotalPages}
                      onClick={() => setGalleryPage((current) => Math.min(galleryTotalPages, current + 1))}
                      aria-label="Sonraki sayfa"
                    >
                      ›
                    </button>
                  </div>

                  <div className="admin-gallery-page-size">
                    <span>Göster:</span>
                    <DropdownSelect
                      value={`${galleryPageSize}`}
                      onChange={(value) => setGalleryPageSize(Number(value))}
                      options={GALLERY_PAGE_SIZE_OPTIONS}
                      ariaLabel="Sayfa başına gösterim"
                      className="admin-gallery-size-select"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
          </>
        )}
          </div>
        </section>
      </main>

      {mediaToDelete && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={() => setMediaToDelete(null)}
        >
          <div
            className="section-shell max-w-md w-full"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-center text-2xl font-semibold text-cafe-50">Anıyı sil</h3>
            <p className="mt-3 text-center text-sm leading-7 text-cafe-100/72">
              <strong className="font-semibold text-cafe-50">{mediaToDelete.caption}</strong> içeriğini kaldırmak üzeresiniz. Bu işlem geri alınamaz.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setMediaToDelete(null)}
                className="flex-1 rounded-2xl border border-cafe-700/80 bg-cafe-900/72 px-4 py-3 font-medium text-cafe-50 transition-colors hover:border-accent/30"
              >
                Vazgeç
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeletingId === mediaToDelete.id}
                className="flex-1 rounded-2xl bg-red-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeletingId === mediaToDelete.id ? 'Siliniyor...' : 'Evet, sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

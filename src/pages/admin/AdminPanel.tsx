import React, { useEffect, useMemo, useState, memo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { db, auth, storage } from '../../lib/firebase/client';
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
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Crown,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Gift,
  Globe2,
  Grid3X3,
  Heart,
  Home,
  ImageIcon,
  List,
  Link2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Megaphone,
  MousePointer2,
  MoreVertical,
  Palette,
  Pencil,
  Phone,
  Plus,
  RotateCw,
  Save,
  ScanQrCode,
  Search,
  SlidersHorizontal,
  SendHorizontal,
  Share2,
  Smartphone,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trash2,
  Upload,
  X,
  QrCode,
  type LucideIcon,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { signInWithGoogle } from '../../lib/auth/googleAuth';
import {
  getCafeAccessRole,
  getConfiguredAccessibleCafeSlugs,
  hasOwnerPortalAccess,
  hasSuperAdminAccess,
  normalizeAccessEmail,
  normalizeAccessSlug,
  SHAREVIBE_ACCESS_POLICY,
} from '../../config/access';
import { deleteMediaRecord } from '../../lib/storage/mediaStorage';
import DropdownSelect, { type DropdownOption } from '../../components/ui/DropdownSelect';
import BrandSignature from '../../components/brand/BrandSignature';
import SignedImage from '../../components/common/SignedImage';
import { invalidateSignedPhotoUrlCache } from '../../hooks/useSignedPhotoUrl';
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
} from '../../config/ui';
import { emailService, type CafeSettingsPayload, type CustomerOverviewResponse, type EmailCampaign, type EmailCustomer, type EmailTemplate, type StatsDashboardResponse, type StatsMediaSyncItem, type StatsTrendGranularity } from '../../services/api/emailService';
import { accessPolicyService, type AccessAssignment, type AccessPolicyPayload, type AccessRole } from '../../services/api/accessPolicyService';
import { qrService, type QrDashboardResponse, type QrStandRecord } from '../../services/api/qrService';
import PricingPlans from '../../components/pricing/PricingPlans';
import {
  buildPlanWhatsappUrl,
  getPricingQuote,
  isMailEnabledPlan,
  normalizePricingPlanKey,
  PRICING_PLANS,
  type PricingPlanKey,
} from '../../config/pricing';

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
type CafePackageKey = PricingPlanKey;
type DateRangePreset = 'today' | 'last7' | 'last14' | 'last30' | 'custom';
type GalleryStatusFilter = 'all' | MediaStatus;
type GalleryViewMode = 'grid' | 'list';
type MediaStatus = 'published' | 'draft' | 'passive';
type CampaignTabKey = 'all' | 'published' | 'archived';
type CampaignDataFilter = 'all' | 'withImage' | 'withoutImage' | 'last7' | 'last30';
type QrStandStatusFilter = 'all' | 'active' | 'inactive' | 'pending';
type SettingsTabKey =
  | 'general'
  | 'billing'
  | 'users';
type SettingsIntegrations = {
  googleAnalytics: boolean;
  whatsapp: boolean;
  instagram: boolean;
  metaPixel: boolean;
};
type SettingsSecurity = {
  twoFactor: boolean;
  loginAlerts: boolean;
  sessionTimeout: string;
};
type SettingsDomains = {
  customDomain: string;
  publicSlug: string;
};
type SettingsExtra = {
  templateApproval: boolean;
  galleryModeration: boolean;
};
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
  ownerEmail: string | null;
  adminEmails: string[];
};

type CafeOwnerAccessEntry = {
  email: string;
  active: boolean;
  createdBy: string | null;
  createdAt: any;
};

type CafeOwnerAccessRow = {
  email: string;
  isAllowed: boolean;
  ownedCafes: Array<{ slug: string; cafeName: string }>;
};

type ManagedAccessRole = Exclude<AccessRole, 'none'>;

type ManagedAccessForm = {
  role: ManagedAccessRole;
  email: string;
  cafeSlugs: string;
};

type FirebaseAccessClaims = {
  role: AccessRole;
  cafeIds: string[];
  ownerCafeIds: string[];
  managerCafeIds: string[];
  isSuperOwner: boolean;
};

const isValidAccessEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeAccessEmail(value));

const uniqueAccessEmails = (emails: string[]) =>
  Array.from(new Set(emails.map((email) => normalizeAccessEmail(email)).filter(isValidAccessEmail)));

const uniqueAccessSlugs = (slugs: string[]) =>
  Array.from(new Set(slugs.map((slug) => normalizeAccessSlug(slug)).filter(Boolean)));

const createEmptyFirebaseAccessClaims = (): FirebaseAccessClaims => ({
  role: 'none',
  cafeIds: [],
  ownerCafeIds: [],
  managerCafeIds: [],
  isSuperOwner: false,
});

const normalizeClaimRole = (value: unknown): AccessRole => {
  if (value === 'super_owner' || value === 'owner' || value === 'manager') {
    return value;
  }

  return 'none';
};

const normalizeClaimSlugList = (value: unknown) => {
  if (Array.isArray(value)) {
    return uniqueAccessSlugs(value.filter((entry): entry is string => typeof entry === 'string'));
  }

  if (typeof value === 'string') {
    return uniqueAccessSlugs(value.split(','));
  }

  return [];
};

const resolveFirebaseAccessClaims = (claims: Record<string, unknown> | undefined): FirebaseAccessClaims => {
  const rawRole = claims?.role;
  const role = normalizeClaimRole(rawRole);
  const ownerCafeIds = normalizeClaimSlugList(claims?.sharevibeOwnerCafes);
  const managerCafeIds = normalizeClaimSlugList(claims?.sharevibeManagerCafes);
  const cafeIds = uniqueAccessSlugs([
    ...normalizeClaimSlugList(claims?.cafeIds),
    ...ownerCafeIds,
    ...managerCafeIds,
  ]);
  const isSuperOwner =
    claims?.sharevibeSuperOwner === true ||
    claims?.admin === true ||
    rawRole === 'super_owner' ||
    rawRole === 'super_admin';

  return {
    role: isSuperOwner ? 'super_owner' : role,
    cafeIds: isSuperOwner ? [] : cafeIds,
    ownerCafeIds: isSuperOwner ? [] : ownerCafeIds,
    managerCafeIds: isSuperOwner ? [] : managerCafeIds,
    isSuperOwner,
  };
};

const createInitialAccessPolicy = (): AccessPolicyPayload => ({
  superOwnerEmails: uniqueAccessEmails([...SHAREVIBE_ACCESS_POLICY.superOwnerEmails]),
  cafeAccess: SHAREVIBE_ACCESS_POLICY.cafeAccess
    .map((rule) => ({
      cafeSlug: normalizeAccessSlug(rule.cafeSlug),
      ownerEmails: uniqueAccessEmails(rule.ownerEmails),
      managerEmails: uniqueAccessEmails(rule.managerEmails ? []),
    }))
    .filter((rule) => rule.cafeSlug),
});

const normalizeAccessPolicyPayload = (policy: AccessPolicyPayload): AccessPolicyPayload => ({
  superOwnerEmails: uniqueAccessEmails(policy.superOwnerEmails),
  cafeAccess: policy.cafeAccess
    .map((rule) => ({
      cafeSlug: normalizeAccessSlug(rule.cafeSlug),
      ownerEmails: uniqueAccessEmails(rule.ownerEmails),
      managerEmails: uniqueAccessEmails(rule.managerEmails ? []),
    }))
    .filter((rule) => rule.cafeSlug && (rule.ownerEmails.length > 0 || rule.managerEmails.length > 0))
    .sort((left, right) => left.cafeSlug.localeCompare(right.cafeSlug)),
});

const resolveAccessAssignments = (policy: AccessPolicyPayload): AccessAssignment[] => {
  const normalizedPolicy = normalizeAccessPolicyPayload(policy);
  const rows = new Map<string, AccessAssignment>();

  normalizedPolicy.superOwnerEmails.forEach((email) => {
    rows.set(email, {
      email,
      role: 'super_owner',
      cafeIds: [],
      ownerCafeIds: [],
      managerCafeIds: [],
    });
  });

  normalizedPolicy.cafeAccess.forEach((rule) => {
    rule.ownerEmails.forEach((email) => {
      if (rows.get(email)?.role === 'super_owner') {
        return;
      }

      const current = rows.get(email) ? {
        email,
        role: 'owner' as AccessRole,
        cafeIds: [],
        ownerCafeIds: [],
        managerCafeIds: [],
      };
      current.role = 'owner';
      current.ownerCafeIds = uniqueAccessSlugs([...current.ownerCafeIds, rule.cafeSlug]);
      current.cafeIds = uniqueAccessSlugs([...current.cafeIds, rule.cafeSlug]);
      rows.set(email, current);
    });

    rule.managerEmails.forEach((email) => {
      const existing = rows.get(email);
      if (existing?.role === 'super_owner' || existing?.role === 'owner') {
        if (existing.role === 'owner') {
          existing.managerCafeIds = uniqueAccessSlugs([...existing.managerCafeIds, rule.cafeSlug]);
          existing.cafeIds = uniqueAccessSlugs([...existing.cafeIds, rule.cafeSlug]);
        }
        return;
      }

      const current = existing ? {
        email,
        role: 'manager' as AccessRole,
        cafeIds: [],
        ownerCafeIds: [],
        managerCafeIds: [],
      };
      current.role = 'manager';
      current.managerCafeIds = uniqueAccessSlugs([...current.managerCafeIds, rule.cafeSlug]);
      current.cafeIds = uniqueAccessSlugs([...current.cafeIds, rule.cafeSlug]);
      rows.set(email, current);
    });
  });

  return Array.from(rows.values()).sort((left, right) => left.email.localeCompare(right.email));
};

const removeEmailFromAccessPolicy = (policy: AccessPolicyPayload, email: string): AccessPolicyPayload => {
  const normalizedEmail = normalizeAccessEmail(email);

  return normalizeAccessPolicyPayload({
    superOwnerEmails: policy.superOwnerEmails.filter((entry) => normalizeAccessEmail(entry) !== normalizedEmail),
    cafeAccess: policy.cafeAccess.map((rule) => ({
      cafeSlug: rule.cafeSlug,
      ownerEmails: rule.ownerEmails.filter((entry) => normalizeAccessEmail(entry) !== normalizedEmail),
      managerEmails: rule.managerEmails.filter((entry) => normalizeAccessEmail(entry) !== normalizedEmail),
    })),
  });
};

const applyAccessAssignment = (
  policy: AccessPolicyPayload,
  form: ManagedAccessForm
): AccessPolicyPayload => {
  const email = normalizeAccessEmail(form.email);
  const cafeSlugs = uniqueAccessSlugs(form.cafeSlugs.split(','));
  const withoutEmail = removeEmailFromAccessPolicy(policy, email);

  if (form.role === 'super_owner') {
    return normalizeAccessPolicyPayload({
      ...withoutEmail,
      superOwnerEmails: uniqueAccessEmails([...withoutEmail.superOwnerEmails, email]),
    });
  }

  const cafeAccess = [...withoutEmail.cafeAccess];
  cafeSlugs.forEach((cafeSlug) => {
    const index = cafeAccess.findIndex((rule) => rule.cafeSlug === cafeSlug);
    const current = index >= 0
 cafeAccess[index]
      : { cafeSlug, ownerEmails: [], managerEmails: [] };

    const nextRule = form.role === 'owner'
 ? { ...current, ownerEmails: uniqueAccessEmails([...current.ownerEmails, email]) }
      : { ...current, managerEmails: uniqueAccessEmails([...current.managerEmails, email]) };

    if (index >= 0) {
      cafeAccess[index] = nextRule;
    } else {
      cafeAccess.push(nextRule);
    }
  });

  return normalizeAccessPolicyPayload({
    ...withoutEmail,
    cafeAccess,
  });
};

type EmailAudienceGroup = {
  key: string;
  label: string;
  description: string;
  customers: EmailCustomer[];
};

type EmailTemplatePreset = {
  key: string;
  id?: string;
  slug?: string;
  title: string;
  subject: string;
  description?: string | null;
  category?: string;
  tone?: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  htmlContent?: string;
  textContent: string;
  isSystem?: boolean;
  usageCount?: number;
  lastUsedAt?: string | null;
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

type StatsTrendPoint = {
  date: Date;
  isoDate: string;
  label: string;
  shortLabel: string;
  value: number;
  photos: number;
  qrShares: number;
  galleryShares: number;
  storyShares: number;
  templateShares: number;
  emailShares: number;
  otherShares: number;
  customerAdds: number;
};

type StatsTrendBucket = StatsTrendPoint & {
  endExclusive: Date;
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

const TEMPLATE_CATEGORY_FILTERS = ['Tümü', 'Hoş Geldin', 'Kampanya', 'Duyuru', 'Özel Gün', 'Sadakat', 'Etkinlik', 'Diğer'];
const TEMPLATE_PAGE_SIZE = 10;
const TEMPLATE_CATEGORY_SELECT_OPTIONS: DropdownOption[] = TEMPLATE_CATEGORY_FILTERS
  .filter((category) => category !== 'Tümü')
  .map((category) => ({ value: category, label: category }));

const TEMPLATE_SORT_OPTIONS: DropdownOption[] = [
  { value: 'newest', label: 'Sırala: En Yeni', hint: 'Son eklenen ve öne alınan şablonlar' },
  { value: 'popular', label: 'Sırala: En Çok Kullanılan', hint: 'Kullanım sayısına göre sırala' },
  { value: 'title', label: 'Sırala: A-Z', hint: 'Şablon adına göre sırala' },
];

const mapEmailTemplateToPreset = (template: EmailTemplate): EmailTemplatePreset => ({
  key: template.id || template.slug,
  id: template.id,
  slug: template.slug,
  title: template.title,
  subject: template.subject,
  description: template.description,
  category: template.category,
  tone: template.tone,
  imageUrl: template.imageUrl,
  ctaLabel: template.ctaLabel,
  htmlContent: template.htmlContent,
  textContent: template.textContent,
  isSystem: template.isSystem,
  usageCount: template.usageCount,
  lastUsedAt: template.lastUsedAt,
});

const getTemplateCategoryClass = (category?: string | null) => {
  const normalized = (category ?? '').toLocaleLowerCase('tr');

  if (normalized.includes('hoş')) return 'is-welcome';
  if (normalized.includes('duyuru')) return 'is-announcement';
  if (normalized.includes('özel')) return 'is-special';
  if (normalized.includes('sadakat')) return 'is-loyalty';
  if (normalized.includes('etkinlik')) return 'is-event';
  if (normalized.includes('diğer')) return 'is-other';
  return 'is-campaign';
};

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

const buildCampaignHtmlContent = (
  text: string,
  description: string,
  imageUrl: string,
  options: {
    cafeName?: string;
    actionUrl?: string;
    actionLabel?: string;
    preheader?: string;
  } = {}
) => {
  const cafeName = options.cafeName?.trim() || 'ShareVibe';
  const actionUrl = options.actionUrl?.trim();
  const actionLabel = options.actionLabel?.trim() || 'Kampanyayı Aç';
  const preheader = options.preheader?.trim() || description || 'Kafenizden yeni bir kampanya var.';

  const fallbackTemplate: EmailTemplatePreset = {
    key: 'campaign-fallback',
    title: description || preheader || cafeName,
    subject: preheader,
    description,
    imageUrl,
    ctaLabel: actionLabel,
    textContent: text,
    tone: 'dark',
  };

  return buildTemplateMatchedEmailHtml(fallbackTemplate, {
    subject: preheader,
    description: description || preheader,
    imageUrl,
    textContent: text,
    actionUrl,
    cafeName,
  });

  const descriptionHtml = description
    ? `<p style="margin:0 0 18px;font-size:17px;line-height:1.55;color:#2b211b;font-weight:700;">${escapeHtml(description)}</p>`
    : '';
  const imageHtml = imageUrl
 `<img src="${escapeHtml(imageUrl)}" alt="" style="width:100%;max-height:280px;object-fit:cover;border-radius:18px;display:block;margin:0 0 24px;" />`
    : '';
  const actionHtml = actionUrl
 `<a href="${escapeHtml(actionUrl)}" style="display:inline-block;margin-top:8px;padding:14px 20px;border-radius:14px;background:#c67b4d;color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;">${escapeHtml(actionLabel)}</a>`
    : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(cafeName)}</title>
  </head>
  <body style="margin:0;background:#f4eee8;font-family:Arial,Helvetica,sans-serif;color:#241c17;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4eee8;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fffaf5;border:1px solid #ead8c8;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:26px 28px 10px;">
                <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#9a6544;font-weight:800;">${escapeHtml(cafeName)}</div>
                <div style="margin-top:8px;font-size:28px;line-height:1.15;color:#211914;font-weight:900;">Kafenizden yeni haber var</div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 30px;">
                ${imageHtml}
                ${descriptionHtml}
                <div style="font-size:15px;line-height:1.7;color:#4c4139;">
                  ${convertPlainTextToHtml(text)}
                </div>
                ${actionHtml}
              </td>
            </tr>
          </table>
          <p style="max-width:640px;margin:18px auto 0;color:#8b7b70;font-size:12px;line-height:1.5;">
            Bu e-posta, ${escapeHtml(cafeName)} e-posta listesine kayıtlı olduğunuz için gönderildi.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const getTemplateEmailTheme = (tone?: string | null) => {
  switch ((tone || '').toLowerCase()) {
    case 'light':
      return {
        pageBg: '#f4eee8',
        cardBg: '#efe4d8',
        text: '#241c17',
        muted: '#4b3c33',
        overlay: 'linear-gradient(90deg, rgba(248,238,226,.94), rgba(248,238,226,.34))',
      };
    case 'pink':
    case 'rose':
      return {
        pageBg: '#f7e6e4',
        cardBg: '#ead2cf',
        text: '#3b2022',
        muted: '#684449',
        overlay: 'linear-gradient(90deg, rgba(248,226,224,.92), rgba(248,226,224,.34))',
      };
    case 'green':
      return {
        pageBg: '#10231d',
        cardBg: '#142b23',
        text: '#fff8f1',
        muted: '#e9ddd3',
        overlay: 'linear-gradient(90deg, rgba(8,21,17,.78), rgba(8,21,17,.26))',
      };
    default:
      return {
        pageBg: '#0d0d0d',
        cardBg: '#151515',
        text: '#fff8f1',
        muted: '#e9ddd3',
        overlay: 'linear-gradient(90deg, rgba(0,0,0,.68), rgba(0,0,0,.24))',
      };
  }
};

const buildTemplateMatchedEmailHtml = (
  template: EmailTemplatePreset,
  options: {
    subject: string;
    description: string;
    imageUrl: string;
    textContent: string;
    actionUrl?: string;
    cafeName?: string;
  }
) => {
  const theme = getTemplateEmailTheme(template.tone);
  const title = options.description || template.title;
  const imageUrl = options.imageUrl || template.imageUrl || '';
  const buttonLabel = template.ctaLabel || 'Kullan';
  const actionUrl = options.actionUrl || '{{actionUrl}}';
  const bodyHtml = convertPlainTextToHtml(options.textContent || template.textContent);
  const imageLayer = imageUrl
 `<img src="${escapeHtml(imageUrl)}" alt="" width="640" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;border:0;opacity:.74;" />`
    : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(options.subject)}</title>
  </head>
  <body style="margin:0;background:${theme.pageBg};font-family:Arial,Helvetica,sans-serif;color:${theme.text};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${theme.pageBg};padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:${theme.cardBg};border:1px solid rgba(255,255,255,.10);border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:0;">
                <div style="position:relative;min-height:430px;background:${theme.cardBg};overflow:hidden;">
                  ${imageLayer}
                  <div style="position:absolute;inset:0;background:${theme.overlay};"></div>
                  <div style="position:relative;padding:48px 44px;max-width:430px;">
                    <div style="font-size:31px;line-height:1.1;color:${theme.text};font-weight:900;margin:0 0 24px;">${escapeHtml(title)}</div>
                    <div style="font-size:17px;line-height:1.72;color:${theme.muted};font-weight:700;margin:0 0 24px;">${bodyHtml}</div>
                    <a href="${escapeHtml(actionUrl)}" style="display:inline-block;min-width:136px;text-align:center;padding:14px 22px;border-radius:6px;background:#c47a43;color:#fff8f1;text-decoration:none;font-size:15px;font-weight:900;">${escapeHtml(buttonLabel)}</a>
                  </div>
                </div>
              </td>
            </tr>
          </table>
          <p style="max-width:640px;margin:14px auto 0;color:rgba(255,248,241,.58);font-size:12px;line-height:1.5;">
            ${escapeHtml(options.cafeName || 'ShareVibe')} e-posta listesinden gönderildi.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const DEFAULT_SETTINGS_INTEGRATIONS: SettingsIntegrations = {
  googleAnalytics: false,
  whatsapp: false,
  instagram: false,
  metaPixel: false,
};

const DEFAULT_SETTINGS_SECURITY: SettingsSecurity = {
  twoFactor: false,
  loginAlerts: true,
  sessionTimeout: '30',
};

const DEFAULT_SETTINGS_EXTRA: SettingsExtra = {
  templateApproval: true,
  galleryModeration: true,
};

const DEFAULT_ADMIN_SETTINGS = {
  cafeName: DEFAULT_CAFE_NAME,
  sector: 'Yiyecek & İçecek',
  description: 'Nitelikli kahve deneyimi ve lezzetli tatlarla misafirlerimize iyi bir deneyim sunuyoruz.',
  logoUrl: '',
  email: 'info@coffeehouse.com',
  phone: '+90 555 123 45 67',
  address: 'Kahve Sok. No:12, Kadıköy / İstanbul',
  website: 'https://coffeehouse.com',
  language: 'tr',
  timezone: 'Europe/Istanbul',
  dateFormat: 'DD.MM.YYYY',
  timeFormat: '24h',
  primaryColor: '#C98B5A',
  secondaryColor: '#3B2E24',
  darkMode: true,
  notifyNewQrStand: true,
  notifyNewCustomer: true,
  emailReports: true,
  weeklySummary: false,
  billingPlan: 'standart_aylik' as CafePackageKey,
  invoiceEmail: 'info@coffeehouse.com',
  adminEmails: [] as string[],
  integrations: DEFAULT_SETTINGS_INTEGRATIONS,
  domains: {
    customDomain: '',
    publicSlug: DEFAULT_CAFE_SLUG,
  } as SettingsDomains,
  security: DEFAULT_SETTINGS_SECURITY,
  extra: DEFAULT_SETTINGS_EXTRA,
  accentColor: DEFAULT_ACCENT_COLOR,
  handwritingFont: DEFAULT_HANDWRITING_FONT,
  campaignTarget: DEFAULT_CAMPAIGN_TARGET,
  campaignReward: DEFAULT_CAMPAIGN_REWARD,
  packageKey: 'standart_aylik' as CafePackageKey,
};
type AdminSettings = typeof DEFAULT_ADMIN_SETTINGS;

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

const CUSTOMER_SEGMENT_OPTIONS = [
  'Yeni Musteri',
  'Geri Donen Musteri',
  'Sadik Musteri',
  'Kampanya Adayi',
  'Pasif Musteri',
] as const;

const CUSTOMER_SEGMENT_META: Record<string, { label: string; className: string; color: string }> = {
  'Yeni Musteri': { label: 'Yeni Müşteri', className: 'is-new', color: '#4d8fcb' },
  'Geri Donen Musteri': { label: 'Geri Dönen Müşteri', className: 'is-returning', color: '#8f79d6' },
  'Sadik Musteri': { label: 'Sadık Müşteri', className: 'is-loyal', color: '#4f9a5f' },
  'Kampanya Adayi': { label: 'Kampanya Adayı', className: 'is-campaign-ready', color: '#df955f' },
  'Pasif Musteri': { label: 'Pasif Müşteri', className: 'is-passive-segment', color: '#8f8a83' },
};

const CUSTOMER_INTERACTION_META: Record<string, { label: string; className: string; color: string }> = {
  site_visit: { label: 'Siteye Giriş', className: 'is-site-visit', color: '#4d8fcb' },
  qr_scan: { label: 'QR Girişi', className: 'is-qr-scan', color: '#8f79d6' },
  photo_share: { label: 'Fotoğraf Paylaşımı', className: 'is-photo-share', color: '#e59f63' },
  campaign_sent: { label: 'Kampanya Gönderimi', className: 'is-campaign-sent', color: '#df955f' },
  email_open: { label: 'E-posta Açıldı', className: 'is-email-open', color: '#67a86f' },
  email_click: { label: 'E-posta Tıklandı', className: 'is-email-click', color: '#528bcc' },
  form_submit: { label: 'Form Gönderimi', className: 'is-form-submit', color: '#ddba71' },
};

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
  CAMPAIGN_CATEGORY_OPTIONS.find((option) => option.value === value) || CAMPAIGN_CATEGORY_OPTIONS[0];

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
const QR_REQUEST_WHATSAPP_NUMBER = '905550497360';
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
  price: string;
  limits: string;
  features: string[];
}> = PRICING_PLANS.map((plan) => ({
  key: plan.key,
  title: plan.title,
  description: plan.description,
  badge: plan.badge,
  price: `${plan.price} ${plan.billingLabel}`,
  limits: plan.mailIncluded
 'QR stand, canlı galeri, kampanya, raporlama ve mail pazarlama'
    : 'QR stand, canlı galeri, temel kampanya ve raporlama',
  features: plan.features.slice(0, 5),
}));

const STORY_TEMPLATES: Array<{
  key: string;
  name: string;
  description: string;
  url: string;
  style: string;
  bestFor: string;
  accent: string;
}> = [
  { key: 'template-1', name: 'Şablon 1', description: 'Marka yazısı üstte, güçlü slogan merkezde.', url: '/story-templates/template-1.jpg', style: 'Slogan', bestFor: 'Günlük kahve ve çalışma anları', accent: '#22c55e' },
  { key: 'template-2', name: 'Şablon 2', description: 'Üst başlık ve kompakt marka mesajı.', url: '/story-templates/template-2.jpg', style: 'Klasik', bestFor: 'Günün enerjisini öne çıkaran paylaşımlar', accent: '#16a34a' },
  { key: 'template-3', name: 'Şablon 3', description: 'Alt bölümde büyük tipografili güçlü vurgu.', url: '/story-templates/template-3.jpg', style: 'Vurgu', bestFor: 'Menü ve marka bilinirliği paylaşımları', accent: '#84cc16' },
  { key: 'template-4', name: 'Şablon 4', description: 'Üst yerleşimli net kampanya görünümü.', url: '/story-templates/template-4.jpg', style: 'Net', bestFor: 'Duyuru, kampanya ve özel gün paylaşımları', accent: '#14b8a6' },
  { key: 'template-5', name: 'Şablon 5', description: 'Katmanlı tipografiyle modern sosyal görünüm.', url: '/story-templates/template-5.jpg', style: 'Modern', bestFor: 'Genç ve dinamik kafe paylaşımları', accent: '#65a30d' },
  { key: 'template-6', name: 'Şablon 6', description: 'El yazısı etkili büyük merkez kompozisyon.', url: '/story-templates/template-6.jpg', style: 'El Yazısı', bestFor: 'Samimi marka dili ve özel müşteri anları', accent: '#4ade80' },
  { key: 'template-7', name: 'Şablon 7', description: 'Kalın konturlu mesajla dikkat çeken tasarım.', url: '/story-templates/template-7.jpg', style: 'Cesur', bestFor: 'Tatlı, kahve ve sosyal an paylaşımları', accent: '#94a3b8' },
];

const STORY_TEMPLATE_URLS = STORY_TEMPLATES.map((template) => template.url);
const STORY_TEMPLATE_LEGACY_URL_MAP: Record<string, string> = {
  '/story-templates/elegant.png': '/story-templates/template-1.jpg',
  '/story-templates/elegant.svg': '/story-templates/template-1.jpg',
  '/story-templates/modern.png': '/story-templates/template-2.jpg',
  '/story-templates/modern.svg': '/story-templates/template-2.jpg',
  '/story-templates/vintage.png': '/story-templates/template-3.jpg',
  '/story-templates/vintage.svg': '/story-templates/template-3.jpg',
  '/story-templates/neon.png': '/story-templates/template-4.jpg',
  '/story-templates/neon.svg': '/story-templates/template-4.jpg',
  '/story-templates/botanical.png': '/story-templates/template-5.jpg',
  '/story-templates/botanical.svg': '/story-templates/template-5.jpg',
  '/story-templates/marble.png': '/story-templates/template-6.jpg',
  '/story-templates/marble.svg': '/story-templates/template-6.jpg',
};

const normalizeStoryTemplateUrl = (value: string | null) =>
  value ? STORY_TEMPLATE_LEGACY_URL_MAP[value] ? value : null;

const isAllowedStoryTemplateUrl = (value: string | null) => {
  const normalizedValue = normalizeStoryTemplateUrl(value);
  return Boolean(normalizedValue && STORY_TEMPLATE_URLS.includes(normalizedValue));
};

const SETTINGS_TABS: Array<{ key: SettingsTabKey; label: string; icon: LucideIcon }> = [
  { key: 'general', label: 'Genel', icon: Settings },
  { key: 'users', label: 'Yöneticiler', icon: Users },
  { key: 'billing', label: 'Plan & Veri', icon: Crown },
];

const OWNER_ACCESS_COLLECTION = 'cafeOwnerAccess';
const isValidOwnerAccessEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const SECTOR_OPTIONS = ['Yiyecek & İçecek', 'Kahve', 'Restoran', 'Pastane', 'Etkinlik Alanı', 'Diğer'];
const LANGUAGE_OPTIONS = [
  { value: 'tr', label: 'Türkçe' },
  { value: 'az', label: 'Azərbaycanca' },
  { value: 'en', label: 'English' },
];
const TIMEZONE_OPTIONS = [
  { value: 'Europe/Istanbul', label: '(GMT+03:00) İstanbul' },
  { value: 'Asia/Baku', label: '(GMT+04:00) Bakı' },
  { value: 'Europe/Berlin', label: '(GMT+01:00) Berlin' },
  { value: 'UTC', label: '(GMT+00:00) UTC' },
];
const DATE_FORMAT_OPTIONS = [
  { value: 'DD.MM.YYYY', label: '31.12.2024' },
  { value: 'DD/MM/YYYY', label: '31/12/2024' },
  { value: 'YYYY-MM-DD', label: '2024-12-31' },
];
const TIME_FORMAT_OPTIONS = [
  { value: '24h', label: '24 Saat' },
  { value: '12h', label: '12 Saat' },
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

const STATS_TREND_OPTIONS: Array<{
  value: StatsTrendGranularity;
  label: string;
  hint: string;
}> = [
  { value: 'day', label: 'Günlük', hint: 'Her gün ayrı gösterilir' },
  { value: 'week', label: 'Haftalık', hint: '7 günlük gruplar halinde' },
  { value: 'month', label: 'Aylık', hint: 'Ay bazında karşılaştırma' },
];

const formatCompactNumber = (value: number) => value.toLocaleString('tr-TR');

const TURKISH_MONTH_NAMES = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

const formatDateLabel = (date: Date) =>
  `${date.getDate().toString().padStart(2, '0')} ${TURKISH_MONTH_NAMES[date.getMonth()]}`;

const formatDateLabelWithYear = (date: Date) => `${formatDateLabel(date)} ${date.getFullYear()}`;

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
  DATE_RANGE_PRESETS.find((item) => item.key === preset) || null;

const createDateRange = (preset: DateRangePreset = 'last7') => {
  const endDate = toStartOfDay(new Date());
  const presetMeta = getDateRangePresetByKey(preset);
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - ((presetMeta?.days || 7) - 1));

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

const getStatsTrendOption = (value: StatsTrendGranularity) =>
  STATS_TREND_OPTIONS.find((option) => option.value === value) || STATS_TREND_OPTIONS[0];

const addStatsTrendInterval = (value: Date, granularity: StatsTrendGranularity) => {
  const next = new Date(value);

  if (granularity === 'week') {
    next.setDate(next.getDate() + 7);
    return next;
  }

  if (granularity === 'month') {
    next.setMonth(next.getMonth() + 1);
    return next;
  }

  next.setDate(next.getDate() + 1);
  return next;
};

const formatStatsTrendBucketLabel = (start: Date, endExclusive: Date, granularity: StatsTrendGranularity) => {
  if (granularity === 'day') {
    return formatDateLabel(start);
  }

  if (granularity === 'month') {
    return `${TURKISH_MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
  }

  const end = new Date(endExclusive);
  end.setDate(end.getDate() - 1);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}-${end.getDate()} ${TURKISH_MONTH_NAMES[start.getMonth()]}`;
  }

  return `${formatDateLabel(start)} - ${formatDateLabel(end)}`;
};

const createStatsTrendBuckets = (range: AdminDateRange, granularity: StatsTrendGranularity): StatsTrendBucket[] => {
  const { start, endExclusive } = getDateRangeBounds(range);
  const buckets: StatsTrendBucket[] = [];
  let cursor = new Date(start);

  while (cursor < endExclusive) {
    const nextInterval = addStatsTrendInterval(cursor, granularity);
    const bucketEndExclusive = nextInterval < endExclusive ? nextInterval : endExclusive;

    ? buckets.push({
      date: new Date(cursor),
      endExclusive: new Date(bucketEndExclusive),
      isoDate: toDateInputValue(cursor),
      label: formatStatsTrendBucketLabel(cursor, bucketEndExclusive, granularity),
      shortLabel:
        granularity === 'day'
 formatDateLabel(cursor)
          : formatStatsTrendBucketLabel(cursor, bucketEndExclusive, granularity),
      value: 0,
      photos: 0,
      qrShares: 0,
      galleryShares: 0,
      storyShares: 0,
      templateShares: 0,
      emailShares: 0,
      otherShares: 0,
      customerAdds: 0,
    });

    cursor = bucketEndExclusive;
  }

  return buckets;
};

const findStatsTrendBucket = (buckets: StatsTrendBucket[], value: Date) =>
  buckets.find((bucket) => value >= bucket.date && value < bucket.endExclusive) || null;

const getStatsTrendChartMax = (values: number[]) => {
  const max = Math.max(0, ...values);
  if (max <= 0) return 10;

  const padded = max * 1.25;
  if (padded <= 10) return 10;
  if (padded <= 25) return Math.ceil(padded / 5) * 5;
  if (padded <= 100) return Math.ceil(padded / 10) * 10;

  return Math.ceil(padded / 25) * 25;
};

const normalizePackageKey = (value: unknown): CafePackageKey =>
  normalizePricingPlanKey(value);

const getPackageMeta = (packageKey: CafePackageKey) =>
  CAFE_PACKAGE_OPTIONS.find((item) => item.key === packageKey) || CAFE_PACKAGE_OPTIONS[0];

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

const formatStatsChangeLabel = (value: number) => {
  const prefix = value >= 0 ? '↑' : '↓';
  return `${prefix} %${Math.abs(value).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`;
};

const getPercentChangeValue = (currentValue: number, previousValue: number) => {
  if (previousValue <= 0) {
    return currentValue > 0 ? 100 : 0;
  }

  return ((currentValue - previousValue) / previousValue) * 100;
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

const getCustomerDisplayName = (customer: EmailCustomer) => customer.name || customer.email.split('@')[0] || 'Müşteri';

const getCustomerInitials = (customer: EmailCustomer) => {
  const displayName = getCustomerDisplayName(customer);
  const parts = displayName.split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : displayName.slice(0, 2);
  return initials.toLocaleUpperCase('tr');
};

const normalizeCustomerLookup = (value?: string | null) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .toLowerCase();

const normalizeCustomerSegmentKey = (segment?: string | null) => {
  const normalized = normalizeCustomerLookup(segment);

  if (normalized.includes('sadik') || normalized.includes('loyal')) {
    return 'Sadik Musteri';
  }
  if (normalized.includes('geri') || normalized.includes('return')) {
    return 'Geri Donen Musteri';
  }
  if (normalized.includes('kampanya') || normalized.includes('campaign')) {
    return 'Kampanya Adayi';
  }
  if (normalized.includes('pasif') || normalized.includes('passive') || normalized.includes('inactive')) {
    return 'Pasif Musteri';
  }

  return 'Yeni Musteri';
};

const getCustomerSegmentMeta = (segment?: string | null) =>
  CUSTOMER_SEGMENT_META[normalizeCustomerSegmentKey(segment)];

const getCustomerInteractionMeta = (interaction?: string | null) =>
  CUSTOMER_INTERACTION_META[interaction || ''] || CUSTOMER_INTERACTION_META.site_visit;

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
      return { label: 'Zamanlandı', className: 'is-scheduled' };
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
  campaign.recipientCount ?? campaign._count?.recipients || 0;

const getCampaignMetricCount = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const getCampaignOpenCount = (campaign: AdminCampaign) =>
  Math.max(getCampaignMetricCount(campaign.openCount), getCampaignMetricCount(campaign.clickCount));

const getCampaignClickCount = (campaign: AdminCampaign) =>
  getCampaignMetricCount(campaign.clickCount);

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

const formatCampaignDateTimeInline = (value?: string | null) =>
  formatCampaignDateTime(value).replace(/\n/g, ' • ');

const getCampaignTimelineValue = (campaign: AdminCampaign) => {
  if (campaign.status === 'completed' || campaign.status === 'sending' || campaign.status === 'failed') {
    return campaign.sentAt ?? campaign.createdAt || null;
  }

  if (campaign.status === 'scheduled') {
    return campaign.scheduledAt || null;
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
    return segments[segments.length - 1] || '';
  } catch {
    return '';
  }
};

const buildQrImageUrl = (targetUrl: string, size = 320) => {
  const dimension = `${size}x${size}`;
  return `${QR_IMAGE_BASE_URL}?size=${dimension}&margin=14&format=png&data=${encodeURIComponent(targetUrl)}`;
};

const buildQrStandRequestWhatsappMessage = ({
  cafeName,
  workspaceSlug,
  publicLink,
  contactName,
  contactEmail,
  contactPhone,
  standName,
  location,
  placement,
  tableCount,
  preferredDate,
  notes,
}: {
  cafeName: string;
  workspaceSlug: string;
  publicLink: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  standName: string;
  location: string;
  placement: string;
  tableCount: string;
  preferredDate: string;
  notes: string;
}) => {
  const requestedCount = Number.parseInt(tableCount, 10) || 1;
  const preferredDateLabel = preferredDate ? formatDateLabelWithYear(new Date(`${preferredDate}T00:00:00`)) : 'Ekibinizin uygun olduğu en yakın tarih';

  return [
    'Merhaba ShareVibe ekibi,',
    '',
    `${cafeName || workspaceSlug} için yeni QR stand kurulumu talep etmek istiyorum.`,
    '',
    `Kafe kodu: ${workspaceSlug}`,
    `Talep edilen stand: ${standName || 'Yeni masa QR standı'}`,
    `Stand adedi: ${requestedCount}`,
    `Konum: ${location || cafeName || workspaceSlug}`,
    `Yerleşim detayı: ${placement || 'Ekiple birlikte netleştirilebilir'}`,
    `Tercih edilen kurulum tarihi: ${preferredDateLabel}`,
    `Kafe linki: ${publicLink}`,
    '',
    'İletişim bilgileri:',
    `Ad Soyad: ${contactName}`,
    `E-posta: ${contactEmail}`,
    `Telefon: ${contactPhone || 'Belirtilmedi'}`,
    ...(notes ? [`Ek not: ${notes}`] : []),
    '',
    'Uygun olduğunuzda kurulum planını birlikte netleştirebilir miyiz? Teşekkürler.',
  ].join('\n');
};

const isMarketingListCustomer = (customer: EmailCustomer) =>
  Boolean(customer.email?.trim()) && customer.emailSubscribed !== false;

const hasCustomerEmail = (customer: EmailCustomer) =>
  Boolean(customer.email?.trim());

const getRecipientCampaignCount = (customer: EmailCustomer) =>
  customer._count?.recipients || 0;

const buildEmailAudienceGroups = (customers: EmailCustomer[]): EmailAudienceGroup[] => [
  {
    key: 'all',
    label: 'Tüm misafirler',
    description: 'Kafeye kayıtlı bütün e-posta adresleri',
    customers,
  },
  {
    key: 'active',
    label: 'Çok aktif misafirler',
    description: 'En az 3 kez geri dönüş yapanlar',
    customers: customers.filter((customer) => getRecipientCampaignCount(customer) >= 3),
  },
  {
    key: 'regular',
    label: 'Düzenli misafirler',
    description: '1 veya 2 kez geri dönüş yapanlar',
    customers: customers.filter((customer) => {
      const count = getRecipientCampaignCount(customer);
      return count >= 1 && count < 3;
    }),
  },
  {
    key: 'new',
    label: 'Yeni misafirler',
    description: 'Henüz mesaj gönderilmemiş olanlar',
    customers: customers.filter((customer) => getRecipientCampaignCount(customer) === 0),
  },
];

const getRecipientStatusLabel = (status?: string | null) => {
  switch ((status || '').toLowerCase()) {
    case 'sent':
      return 'Gönderildi';
    case 'failed':
      return 'Başarısız';
    case 'blocked':
      return 'Engellendi';
    case 'pending':
      return 'Beklemede';
    default:
      return 'Hazırlanıyor';
  }
};

const getFirstUrlFromText = (value?: string | null) =>
  value?.match(/https?:\/\/[^\s)]+/)?.[0]?.replace(/[.,;]+$/, '') || null;

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
  getOptionalDate(campaign.sentAt) || getOptionalDate(campaign.updatedAt) || getOptionalDate(campaign.createdAt);

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
 String(error.code)
    : '';

const getAdminFriendlyErrorMessage = (error: unknown, fallback: string) => {
  const code = getErrorCode(error);
  const rawMessage =
    error instanceof Error
 error.message
      : typeof error === 'string'
 error
        : '';
  const message = rawMessage.toLowerCase();

  if (code === 'permission-denied' || message.includes('permission') || message.includes('unauthorized')) {
    return 'Bu işlem için yetki doğrulanamadı. Lütfen oturumunuzu yenileyip tekrar deneyin.';
  }

  if (message.includes('failed to fetch') || message.includes('network') || message.includes('api request failed')) {
    return 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.';
  }

  if (message.includes('not found') || message.includes('bulunamad')) {
    return 'İstenen kayıt bulunamadı veya artık erişilebilir değil.';
  }

  if (message.includes('required') || message.includes('zorunlu')) {
    return 'Gerekli alanları kontrol edip tekrar deneyin.';
  }

  return fallback;
};

const isRecordValue = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const normalizeSettingsText = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value.trim() || fallback : fallback;

const normalizeSettingsBoolean = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;

const normalizeAdminSettings = (raw: Record<string, unknown> = {}, slug = DEFAULT_CAFE_SLUG): AdminSettings => {
  const integrationsRaw = isRecordValue(raw.integrations) ? raw.integrations : {};
  const domainsRaw = isRecordValue(raw.domains) ? raw.domains : {};
  const securityRaw = isRecordValue(raw.security) ? raw.security : {};
  const extraRaw = isRecordValue(raw.extra) ? raw.extra : {};
  const accentColor =
    typeof raw.accentColor === 'string' && raw.accentColor
 raw.accentColor
      : typeof raw.primaryColor === 'string' && raw.primaryColor
 raw.primaryColor
        : DEFAULT_ADMIN_SETTINGS.accentColor;
  const primaryColor =
    typeof raw.primaryColor === 'string' && raw.primaryColor
 raw.primaryColor
      : accentColor;
  const packageKey = normalizePackageKey(raw.packageKey ?? raw.billingPlan);
  const adminEmails = Array.isArray(raw.adminEmails)
 Array.from(
        new Set(
          raw.adminEmails
            .filter((entry): entry is string => typeof entry === 'string')
            .map((entry) => normalizeAccessEmail(entry))
            .filter(Boolean)
        )
      )
    : [];

  return {
    ...DEFAULT_ADMIN_SETTINGS,
    cafeName: normalizeSettingsText(raw.cafeName || raw.businessName, DEFAULT_ADMIN_SETTINGS.cafeName),
    sector: normalizeSettingsText(raw.sector, DEFAULT_ADMIN_SETTINGS.sector),
    description: normalizeSettingsText(raw.description, DEFAULT_ADMIN_SETTINGS.description),
    logoUrl: normalizeSettingsText(raw.logoUrl, ''),
    email: normalizeSettingsText(raw.email, DEFAULT_ADMIN_SETTINGS.email),
    phone: normalizeSettingsText(raw.phone, DEFAULT_ADMIN_SETTINGS.phone),
    address: normalizeSettingsText(raw.address, DEFAULT_ADMIN_SETTINGS.address),
    website: normalizeSettingsText(raw.website, DEFAULT_ADMIN_SETTINGS.website),
    language: normalizeSettingsText(raw.language, DEFAULT_ADMIN_SETTINGS.language),
    timezone: normalizeSettingsText(raw.timezone, DEFAULT_ADMIN_SETTINGS.timezone),
    dateFormat: normalizeSettingsText(raw.dateFormat, DEFAULT_ADMIN_SETTINGS.dateFormat),
    timeFormat: normalizeSettingsText(raw.timeFormat, DEFAULT_ADMIN_SETTINGS.timeFormat),
    primaryColor,
    secondaryColor: normalizeSettingsText(raw.secondaryColor, DEFAULT_ADMIN_SETTINGS.secondaryColor),
    darkMode: normalizeSettingsBoolean(raw.darkMode, DEFAULT_ADMIN_SETTINGS.darkMode),
    notifyNewQrStand: normalizeSettingsBoolean(raw.notifyNewQrStand, DEFAULT_ADMIN_SETTINGS.notifyNewQrStand),
    notifyNewCustomer: normalizeSettingsBoolean(raw.notifyNewCustomer, DEFAULT_ADMIN_SETTINGS.notifyNewCustomer),
    emailReports: normalizeSettingsBoolean(raw.emailReports, DEFAULT_ADMIN_SETTINGS.emailReports),
    weeklySummary: normalizeSettingsBoolean(raw.weeklySummary, DEFAULT_ADMIN_SETTINGS.weeklySummary),
    billingPlan: packageKey,
    invoiceEmail: normalizeSettingsText(raw.invoiceEmail || raw.email, DEFAULT_ADMIN_SETTINGS.invoiceEmail),
    adminEmails,
    integrations: {
      ...DEFAULT_SETTINGS_INTEGRATIONS,
      googleAnalytics: normalizeSettingsBoolean(integrationsRaw.googleAnalytics, DEFAULT_SETTINGS_INTEGRATIONS.googleAnalytics),
      whatsapp: normalizeSettingsBoolean(integrationsRaw.whatsapp, DEFAULT_SETTINGS_INTEGRATIONS.whatsapp),
      instagram: normalizeSettingsBoolean(integrationsRaw.instagram, DEFAULT_SETTINGS_INTEGRATIONS.instagram),
      metaPixel: normalizeSettingsBoolean(integrationsRaw.metaPixel, DEFAULT_SETTINGS_INTEGRATIONS.metaPixel),
    },
    domains: {
      customDomain: normalizeSettingsText(domainsRaw.customDomain, ''),
      publicSlug: normalizeCafeSlug(domainsRaw.publicSlug || slug),
    },
    security: {
      ...DEFAULT_SETTINGS_SECURITY,
      twoFactor: normalizeSettingsBoolean(securityRaw.twoFactor, DEFAULT_SETTINGS_SECURITY.twoFactor),
      loginAlerts: normalizeSettingsBoolean(securityRaw.loginAlerts, DEFAULT_SETTINGS_SECURITY.loginAlerts),
      sessionTimeout: normalizeSettingsText(securityRaw.sessionTimeout, DEFAULT_SETTINGS_SECURITY.sessionTimeout),
    },
    extra: {
      ...DEFAULT_SETTINGS_EXTRA,
      templateApproval: normalizeSettingsBoolean(extraRaw.templateApproval, DEFAULT_SETTINGS_EXTRA.templateApproval),
      galleryModeration: normalizeSettingsBoolean(extraRaw.galleryModeration, DEFAULT_SETTINGS_EXTRA.galleryModeration),
    },
    accentColor,
    handwritingFont: normalizeHandwritingFont(raw.handwritingFont),
    campaignTarget:
      typeof raw.campaignTarget === 'number' && Number.isFinite(raw.campaignTarget)
 raw.campaignTarget
        : DEFAULT_ADMIN_SETTINGS.campaignTarget,
    campaignReward: normalizeSettingsText(raw.campaignReward, DEFAULT_ADMIN_SETTINGS.campaignReward),
    packageKey,
  };
};

const buildCafeSettingsPayload = (settings: AdminSettings, publicSlug: string, adminEmails: string[]): CafeSettingsPayload => ({
  businessName: normalizeSettingsText(settings.cafeName, DEFAULT_CAFE_NAME),
  cafeName: normalizeSettingsText(settings.cafeName, DEFAULT_CAFE_NAME),
  sector: settings.sector,
  description: settings.description,
  logoUrl: settings.logoUrl || null,
  email: settings.email || null,
  phone: settings.phone || null,
  address: settings.address || null,
  website: settings.website || null,
  language: settings.language,
  timezone: settings.timezone,
  dateFormat: settings.dateFormat,
  timeFormat: settings.timeFormat,
  primaryColor: settings.primaryColor || settings.accentColor || DEFAULT_ACCENT_COLOR,
  secondaryColor: settings.secondaryColor,
  darkMode: settings.darkMode,
  notifyNewQrStand: settings.notifyNewQrStand,
  notifyNewCustomer: settings.notifyNewCustomer,
  emailReports: settings.emailReports,
  weeklySummary: settings.weeklySummary,
  billingPlan: settings.billingPlan,
  packageKey: settings.packageKey,
  invoiceEmail: settings.invoiceEmail || settings.email || null,
  adminEmails,
  integrations: settings.integrations,
  domains: {
    ...settings.domains,
    publicSlug,
  },
  security: settings.security,
  extra: settings.extra,
});

const buildWorkspaceDefaults = (slug: string) => ({
  ...normalizeAdminSettings(
    {
      cafeName:
        slug
          .split('-')
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ') || DEFAULT_ADMIN_SETTINGS.cafeName,
      domains: { publicSlug: slug },
    },
    slug
  ),
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
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
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
  const [firebaseAccessClaims, setFirebaseAccessClaims] = useState<FirebaseAccessClaims>(() => createEmptyFirebaseAccessClaims());
  const [isEmailVerified, setIsEmailVerified] = useState(() => {
    // On localhost, mark email as verified so no verification gate appears
    if (isLocalDevelopmentHost) {
      console.log('[AdminPanel] Localhost: marking test email as verified');
      return true;
    }
    return false;
  });
  const [ownedWorkspaces, setOwnedWorkspaces] = useState<OwnedWorkspace[]>([]);
  const [newWorkspaceNameDraft, setNewWorkspaceNameDraft] = useState('');
  const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState(false);
  const [ownerAccessEntries, setOwnerAccessEntries] = useState<CafeOwnerAccessEntry[]>([]);
  const [newOwnerAccessEmail, setNewOwnerAccessEmail] = useState('');
  const [ownerAccessActionBusy, setOwnerAccessActionBusy] = useState<string | null>(null);
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
  const [campaignActionMenuPosition, setCampaignActionMenuPosition] = useState<{
    top: number;
    left: number;
    placement: 'left' | 'right';
  } | null>(null);
  const [isCampaignFilterOpen, setIsCampaignFilterOpen] = useState(false);
  const [campaignDataFilter, setCampaignDataFilter] = useState<CampaignDataFilter>('all');
  const [campaignComposerMode, setCampaignComposerMode] = useState<'closed' | 'create' | 'edit' | 'detail'>('closed');
  const [campaignComposerPurpose, setCampaignComposerPurpose] = useState<'website' | 'email'>('website');
  const [selectedCampaign, setSelectedCampaign] = useState<AdminCampaign | null>(null);
  const [activeView, setActiveView] = useState<AdminView>(() =>
    getStoredAdminView(portalMode, isOwnerPortal ? 'settings' : 'panel')
  );
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [dateRange, setDateRange] = useState<AdminDateRange>(() => createDateRange('last7'));
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [isChartDateRangeOpen, setIsChartDateRangeOpen] = useState(false);
  const [isStatsDateRangeOpen, setIsStatsDateRangeOpen] = useState(false);
  const [isStatsTrendMenuOpen, setIsStatsTrendMenuOpen] = useState(false);
  const [statsTrendGranularity, setStatsTrendGranularity] = useState<StatsTrendGranularity>('day');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [hasSeenNotifications, setHasSeenNotifications] = useState(false);
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null);
  const [hoveredStatsTrendIndex, setHoveredStatsTrendIndex] = useState<number | null>(null);
  const [cspViolations, setCspViolations] = useState<any[]>([]);

  const hourlyCspChartData = useMemo(() => {
    const points = [];
    const now = Date.now();
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now - i * 60 * 60 * 1000);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      const count = cspViolations.filter(v => {
        const t = v.timestamp?.toDate ? v.timestamp.toDate().getTime() : 
                  v.timestamp?.seconds ? v.timestamp.seconds * 1000 : 0;
        return t >= hourStart.getTime() && t < hourEnd.getTime();
      }).length;
      points.push({
        label: `${hourStart.getHours()}:00`,
        value: count
      });
    }
    return points;
  }, [cspViolations]);

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

  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_ADMIN_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<AdminSettings>(DEFAULT_ADMIN_SETTINGS);
  const hasMailMarketingAccess = isMailEnabledPlan(settings.packageKey);
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTabKey>('general');
  const [isSettingsBackendLoading, setIsSettingsBackendLoading] = useState(false);
  const [isSettingsActionBusy, setIsSettingsActionBusy] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [newManagerEmail, setNewManagerEmail] = useState('');
  const [selectedPlanKey, setSelectedPlanKey] = useState<CafePackageKey | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; tone: 'success' | 'error' | 'info' } | null>(null);
  const [managedAccessPolicy, setManagedAccessPolicy] = useState<AccessPolicyPayload>(() => createInitialAccessPolicy());
  const [managedAccessForm, setManagedAccessForm] = useState<ManagedAccessForm>({
    role: 'owner',
    email: '',
    cafeSlugs: DEFAULT_CAFE_SLUG,
  });
  const [isAccessPolicyLoading, setIsAccessPolicyLoading] = useState(false);
  const [isAccessPolicySaving, setIsAccessPolicySaving] = useState(false);
  const [isAccessClaimsSyncing, setIsAccessClaimsSyncing] = useState(false);
  const [accessPolicyNotice, setAccessPolicyNotice] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailDashboard, setEmailDashboard] = useState<{
    sentToday: number;
    dailyLimitRemaining: number;
    totalCustomers: number;
    registeredEmails: number;
    totalCampaigns: number;
  } | null>(null);
  const [websiteCampaigns, setWebsiteCampaigns] = useState<AdminCampaign[]>([]);
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>([]);
  const [emailCustomers, setEmailCustomers] = useState<EmailCustomer[]>([]);
  const [customerOverview, setCustomerOverview] = useState<CustomerOverviewResponse | null>(null);
  const [customerRows, setCustomerRows] = useState<EmailCustomer[]>([]);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [customerPage, setCustomerPage] = useState(1);
  const [customerPageCount, setCustomerPageCount] = useState(1);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerExporting, setCustomerExporting] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSegmentFilter, setCustomerSegmentFilter] = useState('all');
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
    standName: '',
    location: '',
    placement: '',
    tableCount: '1',
    preferredDate: '',
    notes: '',
  });
  const [selectedAudienceKey, setSelectedAudienceKey] = useState('all');
  const [marketingCampaignFilter, setMarketingCampaignFilter] = useState('all');
  const [marketingCampaignPage, setMarketingCampaignPage] = useState(1);
  const [selectedMarketingSourceCampaignId, setSelectedMarketingSourceCampaignId] = useState('');
  const [templatesSubView, setTemplatesSubView] = useState<'email' | 'story'>('email');
  const [activeStoryTemplateUrl, setActiveStoryTemplateUrl] = useState<string | null>(null);
  const [storyTemplateSavingKey, setStoryTemplateSavingKey] = useState<string | null>(null);
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
  const [recipientManagerCategoryKey, setRecipientManagerCategoryKey] = useState('all');
  const [campaignSchedule, setCampaignSchedule] = useState(SEND_TIME_OPTIONS[0].value);
  const [campaignRepeat, setCampaignRepeat] = useState(REPEAT_OPTIONS[0].value);
  const [emailTemplateRows, setEmailTemplateRows] = useState<EmailTemplatePreset[]>(EMAIL_TEMPLATES);
  const [emailTemplateCategoryCounts, setEmailTemplateCategoryCounts] = useState<Array<{ name: string; count: number }>>([]);
  const [emailTemplateTotal, setEmailTemplateTotal] = useState(EMAIL_TEMPLATES.length);
  const [templatePage, setTemplatePage] = useState(1);
  const [templatePageCount, setTemplatePageCount] = useState(1);
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('Tümü');
  const [templateSort, setTemplateSort] = useState('newest');
  const [templateViewMode, setTemplateViewMode] = useState<'grid' | 'list'>('grid');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateActionBusy, setTemplateActionBusy] = useState<string | null>(null);
  const [openTemplateActionKey, setOpenTemplateActionKey] = useState<string | null>(null);
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplatePreset | null>(null);
  const [templateForm, setTemplateForm] = useState({
    title: '',
    subject: '',
    description: '',
    category: 'Kampanya',
    imageUrl: '',
    ctaLabel: 'Kullan',
    textContent: '',
    tone: 'dark',
  });
  const [excludedAudienceEmails, setExcludedAudienceEmails] = useState<string[]>([]);
  const [isRecipientManagerOpen, setIsRecipientManagerOpen] = useState(false);
  const [recipientSearchTerm, setRecipientSearchTerm] = useState('');
  const [recipientNameInput, setRecipientNameInput] = useState('');
  const [recipientEmailInput, setRecipientEmailInput] = useState('');
  const [recipientActionBusy, setRecipientActionBusy] = useState<string | null>(null);
  const [emailActionBusy, setEmailActionBusy] = useState(false);
  const [emailAnalyticsSummary, setEmailAnalyticsSummary] = useState<{
    totalCustomers: number;
    registeredEmails: number;
    customersCreated: number;
    campaignsCreated: number;
    campaignsSent: number;
    recipientCount: number;
    sentCount: number;
    failedCount: number;
    openCount: number;
    clickCount: number;
    deliveryRate: number;
    failureRate: number;
    openRate: number;
    clickRate: number;
    latestCampaignSubject: string | null;
  } | null>(null);
  const [statsDashboard, setStatsDashboard] = useState<StatsDashboardResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const dateRangePopoverRef = useRef<HTMLDivElement | null>(null);
  const chartDateRangePopoverRef = useRef<HTMLDivElement | null>(null);
  const statsDateRangePopoverRef = useRef<HTMLDivElement | null>(null);
  const statsTrendMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationPopoverRef = useRef<HTMLDivElement | null>(null);
  const sideCafeMenuRef = useRef<HTMLDivElement | null>(null);
  const syncedOwnerAccessEmailsRef = useRef<Set<string>>(new Set());
  const campaignImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const recipientManagerRef = useRef<HTMLElement | null>(null);
  const emailCustomersRef = useRef<EmailCustomer[]>([]);
  const emailLiveRefreshInFlightRef = useRef(false);

  const normalizedUserEmail = normalizeAccessEmail(userEmail);
  const claimAccessibleCafeSlugs = useMemo(
    () =>
      uniqueAccessSlugs([
        ...firebaseAccessClaims.cafeIds,
        ...firebaseAccessClaims.ownerCafeIds,
        ...firebaseAccessClaims.managerCafeIds,
      ]),
    [firebaseAccessClaims.cafeIds, firebaseAccessClaims.managerCafeIds, firebaseAccessClaims.ownerCafeIds]
  );

  const hasEffectiveSuperAdminAccess = useCallback(
    (email: unknown) => {
      const normalizedEmail = normalizeAccessEmail(email);

      return Boolean(
        normalizedEmail &&
          (hasSuperAdminAccess(normalizedEmail) ||
            (normalizedEmail === normalizedUserEmail && firebaseAccessClaims.isSuperOwner))
      );
    },
    [firebaseAccessClaims.isSuperOwner, normalizedUserEmail]
  );

  const getEffectiveCafeAccessRole = useCallback(
    (email: unknown, cafeSlugValue: unknown): AccessRole => {
      const normalizedEmail = normalizeAccessEmail(email);
      const normalizedSlug = normalizeAccessSlug(cafeSlugValue);

      if (!normalizedEmail) {
        return 'none';
      }

      if (hasSuperAdminAccess(normalizedEmail)) {
        return 'super_owner';
      }

      if (normalizedEmail === normalizedUserEmail) {
        if (firebaseAccessClaims.isSuperOwner) {
          return 'super_owner';
        }

        if (firebaseAccessClaims.ownerCafeIds.includes(normalizedSlug)) {
          return 'owner';
        }

        if (firebaseAccessClaims.managerCafeIds.includes(normalizedSlug)) {
          return 'manager';
        }

        if (firebaseAccessClaims.cafeIds.includes(normalizedSlug)) {
          return firebaseAccessClaims.role === 'owner' ? 'owner' : 'manager';
        }
      }

      return getCafeAccessRole(normalizedEmail, normalizedSlug);
    },
    [firebaseAccessClaims, normalizedUserEmail]
  );

  const canAccessCafeWorkspace = useCallback(
    (email: unknown, cafeSlugValue: unknown) => getEffectiveCafeAccessRole(email, cafeSlugValue) !== 'none',
    [getEffectiveCafeAccessRole]
  );

  const getEffectiveAccessibleCafeSlugs = useCallback(
    (email: unknown) => {
      const normalizedEmail = normalizeAccessEmail(email);
      const configuredSlugs = getConfiguredAccessibleCafeSlugs(normalizedEmail);

      if (normalizedEmail === normalizedUserEmail) {
        return uniqueAccessSlugs([...configuredSlugs, ...claimAccessibleCafeSlugs]);
      }

      return configuredSlugs;
    },
    [claimAccessibleCafeSlugs, normalizedUserEmail]
  );

  const hasEffectiveOwnerPortalAccess = useCallback(
    (email: unknown) => {
      const normalizedEmail = normalizeAccessEmail(email);

      return Boolean(
        normalizedEmail &&
          (hasOwnerPortalAccess(normalizedEmail) ||
            hasEffectiveSuperAdminAccess(normalizedEmail) ||
            (normalizedEmail === normalizedUserEmail && claimAccessibleCafeSlugs.length > 0))
      );
    },
    [claimAccessibleCafeSlugs.length, hasEffectiveSuperAdminAccess, normalizedUserEmail]
  );

  useEffect(() => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, 'security_events'),
      where('type', '==', 'csp_violation'),
      where('timestamp', '>=', oneDayAgo)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCspViolations(docs);
    }, (error) => {
      console.error('Failed to listen to CSP violations:', error);
    });

    return () => unsubscribe();
  }, []);

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

    const closeMenu = () => {
      setOpenCampaignActionId(null);
      setCampaignActionMenuPosition(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);

    return () => {
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [openCampaignActionId]);

  useEffect(() => {
    if (!openTemplateActionKey) {
      return;
    }

    const closeMenu = () => setOpenTemplateActionKey(null);
    document.addEventListener('click', closeMenu);

    return () => {
      document.removeEventListener('click', closeMenu);
    };
  }, [openTemplateActionKey]);

  useEffect(() => {
    if (!templateEditorOpen || typeof document === 'undefined') {
      return;
    }

    document.documentElement.classList.add('admin-template-modal-open');
    document.body.classList.add('admin-template-modal-open');

    return () => {
      document.documentElement.classList.remove('admin-template-modal-open');
      document.body.classList.remove('admin-template-modal-open');
    };
  }, [templateEditorOpen]);

  useEffect(() => {
    if (typeof document === 'undefined' || campaignComposerMode === 'closed') {
      return;
    }

    document.documentElement.classList.add('admin-campaign-modal-open');
    document.body.classList.add('admin-campaign-modal-open');

    return () => {
      document.documentElement.classList.remove('admin-campaign-modal-open');
      document.body.classList.remove('admin-campaign-modal-open');
    };
  }, [campaignComposerMode]);

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

      if (statsDateRangePopoverRef.current && !statsDateRangePopoverRef.current.contains(target)) {
        setIsStatsDateRangeOpen(false);
      }

      if (statsTrendMenuRef.current && !statsTrendMenuRef.current.contains(target)) {
        setIsStatsTrendMenuOpen(false);
      }

      if (notificationPopoverRef.current && !notificationPopoverRef.current.contains(target)) {
        setIsNotificationOpen(false);
      }

      if (sideCafeMenuRef.current && !sideCafeMenuRef.current.contains(target)) {
        setIsWorkspaceSwitcherOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDateRangeOpen(false);
        setIsChartDateRangeOpen(false);
        setIsStatsDateRangeOpen(false);
        setIsStatsTrendMenuOpen(false);
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
        setUserEmail(user.email || null);
        setIsEmailVerified(user.emailVerified);
        setFirebaseAccessClaims(createEmptyFirebaseAccessClaims());
        setUserProfile({
          name:
            user.displayName?.trim() ||
            user.email?.split('@')[0] ||
            DEFAULT_CAFE_NAME ||
            'Kullanıcı',
          photoUrl: user.photoURL || null,
          email: user.email || null,
        });
        if (!user.emailVerified) {
          console.warn('[ADMIN_PANEL] User email is not verified:', user.email);
        }
        void user.getIdTokenResult(true)
          .then((tokenResult) => {
            if (auth.currentUser?.uid === user.uid) {
              setFirebaseAccessClaims(resolveFirebaseAccessClaims(tokenResult.claims as Record<string, unknown>));
            }
          })
          .catch((error) => {
            console.error('Firebase access claims could not be read:', error);
            if (auth.currentUser?.uid === user.uid) {
              setFirebaseAccessClaims(createEmptyFirebaseAccessClaims());
            }
          });
      } else {
        console.log('[AdminPanel] Local listener: user logged out');
        setUserEmail(null);
        setFirebaseAccessClaims(createEmptyFirebaseAccessClaims());
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
    setNewWorkspaceNameDraft('');
    setIsWorkspaceSwitcherOpen(false);
  }, [cafeSlug]);

  useEffect(() => {
    const normalizedEmail = normalizeAccessEmail(userEmail);

    if (!normalizedEmail || isLocalDevelopmentHost) {
      setOwnerAccessEntries([]);
      return;
    }

    if (!hasEffectiveSuperAdminAccess(normalizedEmail)) {
      setOwnerAccessEntries([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, OWNER_ACCESS_COLLECTION),
      (snapshot) => {
        const entries = snapshot.docs
          .map((entry) => {
            const data = entry.data();
            const email = normalizeAccessEmail(data.email ?? entry.id);

            return {
              email,
              active: data.active !== false,
              createdBy: normalizeAccessEmail(data.createdBy) || null,
              createdAt: data.createdAt,
            };
          })
          .filter((entry) => entry.email)
          .sort((left, right) => left.email.localeCompare(right.email));

        setOwnerAccessEntries(entries);
      },
      (error) => {
        console.error('Cafe owner access feed error:', error);
        setOwnerAccessEntries([]);
      }
    );

    return () => unsubscribe();
  }, [hasEffectiveSuperAdminAccess, isLocalDevelopmentHost, userEmail]);

  useEffect(() => {
    const normalizedEmail = normalizeAccessEmail(userEmail);
    if (!normalizedEmail) {
      setOwnedWorkspaces([]);
      return;
    }

    const normalizeWorkspaceDoc = (entry: { id: string; data: () => Record<string, unknown> }): OwnedWorkspace => {
      const data = entry.data();
      const adminEmails = [
        ...(Array.isArray(data.adminEmails) ? data.adminEmails : []),
        ...(Array.isArray(data.admins) ? data.admins : []),
      ]
        .filter((item): item is string => typeof item === 'string')
        .map((item) => normalizeAccessEmail(item))
        .filter(Boolean);

      return {
        slug: normalizeCafeSlug(data.cafeSlug || entry.id, entry.id),
        cafeName: normalizeLegacyText(data.cafeName, 'İsimsiz Kafe'),
        ownerEmail: normalizeAccessEmail(data.ownerEmail) || null,
        adminEmails: Array.from(new Set(adminEmails)),
      };
    };

    const publishWorkspaces = (workspaces: OwnedWorkspace[]) => {
      const merged = new Map<string, OwnedWorkspace>();
      workspaces.forEach((workspace) => {
        merged.set(workspace.slug, workspace);
      });

      setOwnedWorkspaces(
        Array.from(merged.values()).sort((left, right) => left.cafeName.localeCompare(right.cafeName, 'tr'))
      );
    };

    const canListAllWorkspaces = isLocalDevelopmentHost || hasEffectiveSuperAdminAccess(userEmail);

    if (canListAllWorkspaces) {
      const unsubscribe = onSnapshot(
        query(collection(db, 'cafes')),
        (snapshot) => {
          publishWorkspaces(snapshot.docs.map((entry) => normalizeWorkspaceDoc(entry)));
        },
        (error) => {
          console.error('Workspace feed error:', error);
        }
      );

      return () => unsubscribe();
    }

    if (!hasEffectiveOwnerPortalAccess(normalizedEmail)) {
      setOwnedWorkspaces([]);
      return;
    }

    const configuredSlugs = getEffectiveAccessibleCafeSlugs(normalizedEmail);
    if (configuredSlugs.length === 0) {
      setOwnedWorkspaces([]);
      return;
    }

    const workspaceMap = new Map<string, OwnedWorkspace>();
    const publishConfiguredWorkspaces = () => {
      publishWorkspaces(
        configuredSlugs.map((slug) =>
          workspaceMap.get(slug) ? {
            slug,
            cafeName: slug,
            ownerEmail: null,
            adminEmails: [],
          }
        )
      );
    };

    const unsubscribes = configuredSlugs.map((slug) =>
      onSnapshot(
        doc(db, 'cafes', slug),
        (snapshot) => {
          if (snapshot.exists()) {
            workspaceMap.set(slug, normalizeWorkspaceDoc({ id: snapshot.id, data: () => snapshot.data() }));
          } else {
            workspaceMap.delete(slug);
          }

          publishConfiguredWorkspaces();
        },
        (error) => {
          console.error('Configured workspace feed error:', error);
          workspaceMap.delete(slug);
          publishConfiguredWorkspaces();
        }
      )
    );

    publishConfiguredWorkspaces();

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    getEffectiveAccessibleCafeSlugs,
    hasEffectiveOwnerPortalAccess,
    hasEffectiveSuperAdminAccess,
    isLocalDevelopmentHost,
    userEmail,
  ]);

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
    setNewWorkspaceNameDraft('');
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

    const canBypassOwnerCheck = isLocalDevelopmentHost || hasEffectiveSuperAdminAccess(userEmail);

    if (!canBypassOwnerCheck && !canAccessCafeWorkspace(userEmail, workspaceSlug)) {
      setMediaItems([]);
      setWebsiteCampaigns([]);
      setWorkspaceOwnerEmail(null);
      setWorkspaceAdminEmails([]);
      setWorkspaceAccessError('Bu kafe paneli bu Google hesabı için yetki listesinde tanımlı değil.');
      const emptySettings = buildWorkspaceDefaults(workspaceSlug);
      setSettings(emptySettings);
      setSavedSettings(emptySettings);
      return;
    }

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

      setWorkspaceAccessError(null);
      const nextSettings = normalizeAdminSettings(data, workspaceSlug);

      setSettings(nextSettings);
      setSavedSettings(nextSettings);
      setActiveStoryTemplateUrl(typeof data.activeStoryTemplateUrl === 'string' ? data.activeStoryTemplateUrl : null);
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
            cafeSlug: normalizeCafeSlug(data.cafeSlug || DEFAULT_CAFE_SLUG),
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
  }, [canAccessCafeWorkspace, hasEffectiveSuperAdminAccess, isOwnerPortal, userEmail, workspaceSlug, isLocalDevelopmentHost]);

  const isSuperAdmin = hasEffectiveSuperAdminAccess(userEmail);
  const configuredAccessibleCafeSlugs = useMemo(
    () => getEffectiveAccessibleCafeSlugs(normalizedUserEmail),
    [getEffectiveAccessibleCafeSlugs, normalizedUserEmail]
  );
  const configuredWorkspaceAccessRole = getEffectiveCafeAccessRole(normalizedUserEmail, workspaceSlug);
  const hasConfiguredPortalAccess = hasEffectiveOwnerPortalAccess(normalizedUserEmail);
  const isConfiguredWorkspaceOwner =
    configuredWorkspaceAccessRole === 'owner' || configuredWorkspaceAccessRole === 'super_owner';
  const isConfiguredWorkspaceManager = configuredWorkspaceAccessRole === 'manager';
  const canCreateCafeWorkspaces =
    Boolean(normalizedUserEmail) &&
    (isLocalDevelopmentHost || isSuperAdmin || configuredAccessibleCafeSlugs.length > 0);
  const canShowCafeWorkspaces = isOwnerPortal || isSuperAdmin || ownedWorkspaces.length > 0;
  const canShowOwnerAccessPanel = isSuperAdmin && workspaceSlug === DEFAULT_CAFE_SLUG;
  const managedAccessAssignments = useMemo(
    () => resolveAccessAssignments(managedAccessPolicy),
    [managedAccessPolicy]
  );
  const ownerAccessRows = useMemo<CafeOwnerAccessRow[]>(() => {
    const rows = new Map<string, CafeOwnerAccessRow>();

    ownerAccessEntries.forEach((entry) => {
      rows.set(entry.email, {
        email: entry.email,
        isAllowed: entry.active,
        ownedCafes: [],
      });
    });

    ownedWorkspaces.forEach((workspace) => {
      const ownerEmail = normalizeAccessEmail(workspace.ownerEmail);
      if (!ownerEmail) {
        return;
      }

      const row = rows.get(ownerEmail) ? {
        email: ownerEmail,
        isAllowed: false,
        ownedCafes: [],
      };

      if (!row.ownedCafes.some((cafe) => cafe.slug === workspace.slug)) {
        row.ownedCafes.push({ slug: workspace.slug, cafeName: workspace.cafeName });
      }

      rows.set(ownerEmail, row);
    });

    return Array.from(rows.values()).sort((left, right) => left.email.localeCompare(right.email));
  }, [ownedWorkspaces, ownerAccessEntries]);
  const isWorkspaceOwnerForCurrentUser =
    Boolean(normalizedUserEmail) && isConfiguredWorkspaceOwner;
  const isWorkspaceAssignedToCurrentUser =
    Boolean(normalizedUserEmail) && (isConfiguredWorkspaceOwner || isConfiguredWorkspaceManager);
  const hasPortalAccess = isLocalDevelopmentHost
 true
    : isOwnerPortal
 hasConfiguredPortalAccess
      : canAccessCafeWorkspace(normalizedUserEmail, workspaceSlug);
  const canViewActiveWorkspace =
    isLocalDevelopmentHost ||
    isSuperAdmin ||
    canAccessCafeWorkspace(normalizedUserEmail, workspaceSlug);

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
      counters.set(item.tableNumber, (counters.get(item.tableNumber) || 0) + 1);
    }

    return Array.from(counters.entries()).sort((left, right) => right[1] - left[1])[0] ?? null;
  }, [selectedRangeMediaItems]);

  const tableActivity = useMemo(() => {
    const counters = new Map<string, number>();
    for (const item of selectedRangeMediaItems) {
      counters.set(item.tableNumber, (counters.get(item.tableNumber) || 0) + 1);
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
 Math.round((topTable[1] / selectedRangeMediaItems.length) * 100)
    : 0;
  const campaignProgressPercent = settings.campaignTarget > 0
 Math.min(100, Math.round((selectedRangeMediaItems.length / settings.campaignTarget) * 100))
    : 0;
  const emailSentToday = emailDashboard?.sentToday || 0;
  const emailRemainingToday = emailDashboard?.dailyLimitRemaining || 0;
  const emailLimitTotal = emailSentToday + emailRemainingToday;
  const emailLimitUsagePercent = emailLimitTotal > 0
 Math.round((emailSentToday / emailLimitTotal) * 100)
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

        const leftDate = getMediaDate(left.createdAt)?.getTime() || 0;
        const rightDate = getMediaDate(right.createdAt)?.getTime() || 0;
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
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
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
  const canManageWorkspace = workspaceDraftChanged
 Boolean(userEmail) && (isLocalDevelopmentHost || canAccessCafeWorkspace(userEmail, effectiveWorkspaceSlug))
    : canManageActiveWorkspace;
  const canManageSettingsAdmins =
    Boolean(userEmail) &&
    (isLocalDevelopmentHost || isSuperAdmin || isConfiguredWorkspaceOwner);
  const canDeleteOwnedWorkspace = useCallback(
    (workspace: OwnedWorkspace | null | undefined) =>
      Boolean(
        workspace &&
          normalizedUserEmail &&
          (isLocalDevelopmentHost ||
            isSuperAdmin ||
            getEffectiveCafeAccessRole(normalizedUserEmail, workspace.slug) === 'owner')
      ),
    [getEffectiveCafeAccessRole, isLocalDevelopmentHost, isSuperAdmin, normalizedUserEmail]
  );

  useEffect(() => {
    if (!canShowOwnerAccessPanel || !normalizedUserEmail) {
      return;
    }

    const allowedEmails = new Set(ownerAccessEntries.filter((entry) => entry.active).map((entry) => entry.email));
    const currentOwnerEmails = Array.from(
      new Set(ownedWorkspaces.map((workspace) => normalizeAccessEmail(workspace.ownerEmail)).filter(Boolean))
    );
    const missingOwnerEmails = currentOwnerEmails.filter(
      (email) => !allowedEmails.has(email) && !syncedOwnerAccessEmailsRef.current.has(email)
    );

    if (missingOwnerEmails.length === 0) {
      return;
    }

    missingOwnerEmails.forEach((email) => {
      syncedOwnerAccessEmailsRef.current.add(email);
      void setDoc(
        doc(db, OWNER_ACCESS_COLLECTION, email),
        {
          email,
          active: true,
          createdAt: serverTimestamp(),
          createdBy: normalizedUserEmail,
          updatedAt: serverTimestamp(),
          updatedBy: normalizedUserEmail,
        },
        { merge: true }
      ).catch((error) => {
        syncedOwnerAccessEmailsRef.current.delete(email);
        console.error('Existing owner access sync failed:', error);
      });
    });
  }, [canShowOwnerAccessPanel, normalizedUserEmail, ownedWorkspaces, ownerAccessEntries]);

  const effectiveActiveStoryTemplateUrl = useMemo(
    () => normalizeStoryTemplateUrl(activeStoryTemplateUrl),
    [activeStoryTemplateUrl]
  );
  const selectedStoryTemplate = useMemo(
    () => STORY_TEMPLATES.find((template) => template.url === effectiveActiveStoryTemplateUrl) || null,
    [effectiveActiveStoryTemplateUrl]
  );
  const previewStoryTemplate = selectedStoryTemplate ?? STORY_TEMPLATES[0];
  const hasUnsupportedStoryTemplate = Boolean(activeStoryTemplateUrl && !isAllowedStoryTemplateUrl(activeStoryTemplateUrl));
  const activeViewCopy: Record<AdminView, { title: string; kicker: string; description: string }> = {
    panel: {
      title: `Hoş geldin, ${settings.cafeName || DEFAULT_CAFE_NAME}!`,
      kicker: 'Ana Sayfa',
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
      description: '',
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
  const isStoryTemplatesView = activeView === 'templates' && templatesSubView === 'story';
  const panelTitle = isStoryTemplatesView ? 'Story Şablonları' : currentPageCopy.title;
  const panelDescription = isStoryTemplatesView
 'Müşteri fotoğrafını seçili yeşil ekran alanına yerleştiren story şablonunu yönetin.'
    : currentPageCopy.description;
  const panelKicker = isStoryTemplatesView ? 'Story Akışı' : currentPageCopy.kicker;
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
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      await fetch(`${apiUrl}/api/session/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.warn('Session logout API failed:', err);
    }
    await signOut(auth);
  };

  const handleSwitchAccount = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      await fetch(`${apiUrl}/api/session/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.warn('Session logout API failed:', err);
    }
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
    setIsStatsDateRangeOpen(false);
    setIsNotificationOpen(false);

    if (isMobileViewport) {
      setIsMenuCollapsed(true);
    }
  }, [isMobileViewport]);

  const ensureMailMarketingAccess = useCallback((message = 'E-posta pazarlama yalnızca Mail Entegrasyonlu Plan ile kullanılabilir.') => {
    if (hasMailMarketingAccess) {
      return true;
    }

    setEmailNotice(message);
    setToastMessage({ text: message, tone: 'info' });
    setActiveView('settings');
    setActiveSettingsTab('billing');
    return false;
  }, [hasMailMarketingAccess]);

  const applyWorkspaceSlug = async () => {
    const nextSlug = effectiveWorkspaceSlug;

    if (!nextSlug) {
      return;
    }

    if (!isLocalDevelopmentHost && !isSuperAdmin && !canAccessCafeWorkspace(normalizedUserEmail, nextSlug)) {
      setWorkspaceAccessError('Bu kafe kodu bu hesap için yetki listesinde tanımlı değil.');
      return;
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
    setNewWorkspaceNameDraft('');
    setIsWorkspaceSwitcherOpen(false);
    onCafeSlugChange(nextSlug);
  };

  const handleDeleteOwnedWorkspace = async (slug: string) => {
    if (!userEmail) {
      return;
    }

    const normalizedSlug = normalizeCafeSlug(slug, DEFAULT_CAFE_SLUG);
    const workspaceToDelete = ownedWorkspaces.find((workspace) => workspace.slug === normalizedSlug);

    if (!workspaceToDelete) {
      showToast('Silinecek kafe ortamı bulunamadı.', 'error');
      return;
    }

    if (!canDeleteOwnedWorkspace(workspaceToDelete)) {
      showToast('Bu kafe alanını silme yetkin bulunmuyor.', 'error');
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const confirmation = window.prompt(
      `"${workspaceToDelete.cafeName}" kafe ortamı ve ilgili galeri kayıtları kalıcı olarak silinecek. Onaylamak için "${normalizedSlug}" yazın.`
    );

    if (confirmation?.trim() !== normalizedSlug) {
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
        invalidateSignedPhotoUrlCache(entry.id);
      }

      await deleteDoc(doc(db, 'cafes', normalizedSlug));

      const remainingWorkspaces = ownedWorkspaces.filter((workspace) => workspace.slug !== normalizedSlug);
      if (workspaceSlug === normalizedSlug) {
        const fallbackSlug = remainingWorkspaces[0]?.slug || DEFAULT_CAFE_SLUG;
        setWorkspaceSlug(fallbackSlug);
        setWorkspaceSlugDraft(fallbackSlug);
        setNewWorkspaceNameDraft('');
        setWorkspaceAccessError(null);
        onCafeSlugChange(fallbackSlug);
      }

      showToast('Kafe alanı silindi.', 'success');
    } catch (error) {
      console.error('Workspace delete failed:', error);
      showToast('Kafe alanı silinirken bir hata oluştu.', 'error');
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

  const allRecipientCustomers = useMemo(
    () => emailCustomers.filter(hasCustomerEmail),
    [emailCustomers]
  );
  const activeRecipientCustomers = useMemo(
    () => allRecipientCustomers.filter(isMarketingListCustomer),
    [allRecipientCustomers]
  );
  const inactiveRecipientCustomers = useMemo(
    () => allRecipientCustomers.filter((customer) => customer.emailSubscribed === false),
    [allRecipientCustomers]
  );
  const emailAudienceGroups = useMemo<EmailAudienceGroup[]>(
    () => buildEmailAudienceGroups(activeRecipientCustomers),
    [activeRecipientCustomers]
  );
  const recipientCategoryGroups = useMemo<EmailAudienceGroup[]>(
    () => buildEmailAudienceGroups(allRecipientCustomers),
    [allRecipientCustomers]
  );

  /*
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
        customers: allCustomers.filter((customer) => (customer._count?.recipients || 0) >= 3),
      },
      {
        key: 'regular',
        label: 'Düzenli misafirler',
        description: '1 veya 2 kez geri dönüş yapanlar',
        customers: allCustomers.filter((customer) => {
          const count = customer._count?.recipients || 0;
          return count >= 1 && count < 3;
        }),
      },
      {
        key: 'new',
        label: 'Yeni misafirler',
        description: 'Henüz mesaj gönderilmemiş olanlar',
        customers: allCustomers.filter((customer) => (customer._count?.recipients || 0) === 0),
      },
    ];
  }, [emailCustomers]); */

  const selectedAudience = emailAudienceGroups.find((group) => group.key === selectedAudienceKey) ?? emailAudienceGroups[0];
  const selectedAudienceCustomers = selectedAudience?.customers ? [];
  const selectedAudienceCategory = recipientCategoryGroups.find((group) => group.key === selectedAudienceKey) ?? recipientCategoryGroups[0];
  const selectedAudienceInactiveCustomers = selectedAudienceCategory?.customers.filter((customer) => customer.emailSubscribed === false) ? [];
  const selectedRecipientCategory = recipientCategoryGroups.find((group) => group.key === recipientManagerCategoryKey) ?? recipientCategoryGroups[0];
  const selectedRecipientCategoryActiveCustomers = selectedRecipientCategory?.customers.filter(isMarketingListCustomer) ? [];
  const selectedRecipientCategoryInactiveCustomers = selectedRecipientCategory?.customers.filter((customer) => customer.emailSubscribed === false) ? [];
  const excludedAudienceEmailSet = new Set(excludedAudienceEmails);
  const selectedAudienceEmails = Array.from(new Set(selectedAudienceCustomers
    .map((customer) => customer.email)
    .filter((email) => !excludedAudienceEmailSet.has(email))));
  const selectedAudienceCount = selectedAudienceEmails.length;
  const normalizedRecipientSearchTerm = recipientSearchTerm.trim().toLocaleLowerCase('tr');
  const filteredRecipientCustomers = normalizedRecipientSearchTerm
 allRecipientCustomers.filter((customer) => {
        const haystack = `${customer.name ?? ''} ${customer.email}`.toLocaleLowerCase('tr');
        return haystack.includes(normalizedRecipientSearchTerm);
      })
    : allRecipientCustomers;
  const visibleRecipientCustomers = filteredRecipientCustomers.slice(0, 12);
  const availableEmailTemplates = emailTemplateRows.length > 0 ? emailTemplateRows : EMAIL_TEMPLATES;
  const selectedTemplate = availableEmailTemplates.find((template) => template.key === selectedTemplateKey) ?? availableEmailTemplates[0] || EMAIL_TEMPLATES[0];
  const emailTemplateAllCount = emailTemplateCategoryCounts.reduce((sum, item) => sum + item.count, 0);
  const templateCategoryStats = TEMPLATE_CATEGORY_FILTERS.map((category) => ({
    category,
    count: category === 'Tümü'
 ? (!templateSearchTerm.trim() && emailTemplateAllCount > 0 ? emailTemplateAllCount : emailTemplateTotal)
      : emailTemplateCategoryCounts.find((item) => item.name === category)?.count || emailTemplateRows.filter((template) => template.category === category).length,
  }));
  const templatePaginationItems = useMemo<(number | 'ellipsis')[]>(() => {
    if (templatePageCount <= 7) {
      return Array.from({ length: templatePageCount }, (_, index) => index + 1);
    }

    const pages = new Set<number>([1, templatePageCount, templatePage - 1, templatePage, templatePage + 1]);
    const normalized = Array.from(pages)
      .filter((page) => page >= 1 && page <= templatePageCount)
      .sort((a, b) => a - b);

    return normalized.reduce<(number | 'ellipsis')[]>((items, page, index) => {
      if (index > 0 && page - normalized[index - 1] > 1) {
        items.push('ellipsis');
      }
      items.push(page);
      return items;
    }, []);
  }, [templatePage, templatePageCount]);
  const emailCustomerTotal = emailDashboard?.totalCustomers || emailCustomers.length;
  const customerStatsReady = customerOverview !== null;
  const customerStats = customerOverview?.stats ? {
    totalCustomers: customerTotal,
    newCustomers: 0,
    loyalCustomers: 0,
    emailSubscribers: 0,
    activeCustomers: 0,
    campaignReachedCustomers: 0,
    trends: {
      totalCustomers: 0,
      newCustomers: 0,
      loyalCustomers: 0,
      emailSubscribers: 0,
      activeCustomers: 0,
      campaignReachedCustomers: 0,
    },
  };
  const customerStatValue = (value: number) => (customerStatsReady ? formatCompactNumber(value) : '—');
  const customerTrendDetail = (value: number) => {
    if (!customerStatsReady) {
      return 'Veri bekleniyor';
    }

    if (value > 0) {
      return `↑ ${formatPercent(value)}`;
    }

    if (value < 0) {
      return `↓ ${formatPercent(Math.abs(value))}`;
    }

    return formatPercent(0);
  };
  const customerRatioDetail = (value: number, suffix: string) =>
    customerStatsReady ? `${formatPercent(value)} ${suffix}` : 'Veri bekleniyor';
  const customerSegments = customerOverview?.segments ? [];
  const customerInteractions = customerOverview?.interactions ? [];
  const customerTopRows = customerOverview?.topCustomers ? [];
  const customerSegmentSelectOptions: DropdownOption[] = useMemo(
    () => [
      { value: 'all', label: 'Tüm Segmentler' },
      ...Array.from(new Set([...CUSTOMER_SEGMENT_OPTIONS, ...customerSegments.map((segment) => normalizeCustomerSegmentKey(segment.key))])).map((segment) => ({
        value: segment,
        label: getCustomerSegmentMeta(segment).label,
      })),
    ],
    [customerSegments]
  );
  const customerSegmentGradient = useMemo(() => {
    if (customerSegments.length === 0 || customerSegments.every((segment) => segment.count <= 0)) {
      return 'conic-gradient(rgba(255,255,255,0.08) 0 100%)';
    }

    let cursor = 0;
    const slices = customerSegments.map((segment) => {
      const start = cursor;
      const end = cursor + segment.percent;
      cursor = end;
      return `${segment.color} ${start}% ${end}%`;
    });

    return `conic-gradient(${slices.join(', ')})`;
  }, [customerSegments]);
  const customerPageStart = customerTotal > 0 ? (customerPage - 1) * 10 + 1 : 0;
  const customerPageEnd = Math.min(customerPage * 10, customerTotal);
  const customerPaginationItems = useMemo(() => {
    const pages = new Set<number>([1, customerPage, customerPageCount]);
    for (let offset = -1; offset <= 1; offset += 1) {
      const page = customerPage + offset;
      if (page > 1 && page < customerPageCount) {
        pages.add(page);
      }
    }
    return Array.from(pages).sort((left, right) => left - right);
  }, [customerPage, customerPageCount]);
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
          const leftDate = getMediaDate(left.createdAt)?.getTime() || 0;
          const rightDate = getMediaDate(right.createdAt)?.getTime() || 0;
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
 hoveredChartIndex
      : null;
  const activeChartPoint = activeChartIndex !== null ? chartGeometry.points[activeChartIndex] : null;
  const emailRecipientTotal =
    emailAnalyticsSummary?.recipientCount ?
    rangeCampaignRows.reduce((sum, campaign) => sum + (campaign.recipientCount || 0), 0);
  const emailDeliveredTotal =
    emailAnalyticsSummary?.sentCount ?
    rangeCampaignRows.reduce((sum, campaign) => sum + (campaign.sentCount || 0), 0);
  const emailFailedTotal =
    emailAnalyticsSummary?.failedCount ?
    rangeCampaignRows.reduce((sum, campaign) => sum + (campaign.failedCount || 0), 0);
  const emailDeliveryRate =
    emailAnalyticsSummary?.deliveryRate ?
    (emailRecipientTotal > 0 ? Math.round((emailDeliveredTotal / emailRecipientTotal) * 100) : 0);
  const emailFailureRate =
    emailAnalyticsSummary?.failureRate ?
    (emailRecipientTotal > 0 ? Math.round((emailFailedTotal / emailRecipientTotal) * 100) : 0);
  const rangeCustomerCount = emailAnalyticsSummary?.customersCreated || rangeCustomerRows.length;
  const dashboardCustomerTotal = emailAnalyticsSummary?.totalCustomers ?? emailDashboard?.totalCustomers || emailCustomerTotal;
  const registeredEmailTotal = emailAnalyticsSummary?.registeredEmails ?? emailDashboard?.registeredEmails || emailCustomerTotal;
  const rangeCampaignCount = emailAnalyticsSummary?.campaignsCreated || rangeCampaignRows.length;
  const rangeSentCampaignCount =
    emailAnalyticsSummary?.campaignsSent ?
    rangeCampaignRows.filter((campaign) => Boolean(campaign.sentAt)).length;
  const remainingRewardCount = Math.max(0, settings.campaignTarget - selectedRangeMediaItems.length);
  const campaignParticipantCount = Math.min(selectedRangeMediaItems.length, settings.campaignTarget);
  const currentPackageMeta = getPackageMeta(settings.packageKey);
  const qrStandRows = useMemo(() => {
    const sourceTables = uniqueTables.filter(Boolean);

    if (sourceTables.length === 0) {
      return [];
    }

    return Array.from(new Set(sourceTables)).map((table) => {
      const tableMediaItems = workspaceMediaItems.filter((item) => item.tableNumber === table);
      const lastActivityAt = tableMediaItems
        .map((item) => getMediaDate(item.createdAt))
        .filter((date): date is Date => Boolean(date))
        .sort((left, right) => right.getTime() - left.getTime())[0] || null;

      return {
        table,
        url: buildCafePublicLink({
          origin: window.location.origin,
          cafeSlug: effectiveWorkspaceSlug,
          tableLabel: table,
        }),
        shareCount: tableMediaItems.length,
        lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
      };
    });
  }, [effectiveWorkspaceSlug, uniqueTables, workspaceMediaItems]);
  const qrDashboardSummary = qrDashboard?.summary ? {
    totalStands: 0,
    totalTables: 0,
    activeStands: 0,
    pendingStands: 0,
    inactiveStands: 0,
    pendingRequests: 0,
    totalQrPhotos: 0,
    photoActiveStands: 0,
    averagePhotosPerStand: 0,
    averageTablesPerStand: 0,
    activityRate: 0,
    topStand: null,
    largestStand: null,
    latestActivityAt: null,
    latestRequestAt: null,
  };
  const qrDashboardRows = qrDashboard?.stands ? [];
  const pricingTableCount = Math.max(1, qrDashboardSummary.totalStands || qrStandRows.length || 1);
  const currentPackageQuote = getPricingQuote(settings.packageKey, pricingTableCount);
  const qrDashboardMetrics: Array<{
    label: string;
    value: string;
    helper: string;
    icon: LucideIcon;
    tone: 'violet' | 'mint' | 'blue' | 'amber' | 'rose';
  }> = [
    {
      label: 'Toplam QR masa',
      value: formatCompactNumber(qrDashboardSummary.totalStands),
      helper: `${formatCompactNumber(qrDashboardSummary.activeStands)} aktif, ${formatCompactNumber(qrDashboardSummary.inactiveStands || 0)} pasif`,
      icon: QrCode,
      tone: 'violet',
    },
    {
      label: 'Fotoğraf sayısı',
      value: formatCompactNumber(qrDashboardSummary.totalQrPhotos || 0),
      helper: `${formatCompactNumber(qrDashboardSummary.photoActiveStands || 0)} masadan fotoğraf geldi`,
      icon: ImageIcon,
      tone: 'mint',
    },
    {
      label: 'Masa başına fotoğraf',
      value: formatCompactNumber(qrDashboardSummary.averagePhotosPerStand || 0),
      helper: 'Her masa için ortalama fotoğraf',
      icon: BarChart3,
      tone: 'blue',
    },
    {
      label: 'Aktif masa oranı',
      value: `%${formatCompactNumber(qrDashboardSummary.activityRate || 0)}`,
      helper: 'Fotoğraf gelen masaların oranı',
      icon: TrendingUp,
      tone: 'amber',
    },
    {
      label: 'En çok kullanılan masa',
      value: qrDashboardSummary.topStand?.name || '-',
      helper: qrDashboardSummary.topStand
 `${formatCompactNumber(qrDashboardSummary.topStand.photoCount)} fotoğraf yüklenmiş`
        : 'Henüz fotoğraf yok',
      icon: Crown,
      tone: 'rose',
    },
  ];
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
      label: 'Müşteriler',
      value: formatCompactNumber(dashboardCustomerTotal),
      trend: rangeCustomerCount > 0
 `${formatCompactNumber(rangeCustomerCount)} yeni kayıt bu aralıkta`
        : 'Toplam müşteri kaydı',
      icon: Users,
      tone: 'violet',
    },
    {
      label: 'Kayıtlı e-posta',
      value: formatCompactNumber(registeredEmailTotal),
      trend: 'E-posta listesinde kayıtlı',
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
  const emailClickTotal =
    emailAnalyticsSummary?.clickCount ?
    rangeCampaignRows.reduce((sum, campaign) => sum + getCampaignClickCount(campaign), 0);
  const emailOpenTotal = Math.max(
    emailAnalyticsSummary?.openCount ?
      rangeCampaignRows.reduce((sum, campaign) => sum + getCampaignOpenCount(campaign), 0),
    emailClickTotal
  );
  const emailOpenRate = getPercent(emailOpenTotal, emailDeliveredTotal);
  const emailClickRate = emailAnalyticsSummary?.clickRate || getPercent(emailClickTotal, emailDeliveredTotal);
  const emailPendingTotal = Math.max(0, emailRecipientTotal - emailDeliveredTotal - emailFailedTotal);
  const emailUnopenedTotal = Math.max(0, emailDeliveredTotal - emailOpenTotal);
  const previousRangeMediaItems = useMemo(() => {
    const { start } = getDateRangeBounds(dateRange);
    const dayCount = getDateRangeDayCount(dateRange);
    const previousEnd = new Date(start);
    previousEnd.setDate(previousEnd.getDate() - 1);
    previousEnd.setHours(23, 59, 59, 999);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - (dayCount - 1));
    previousStart.setHours(0, 0, 0, 0);

    return workspaceMediaItems.filter((item) => {
      const itemDate = getMediaDate(item.createdAt);
      return itemDate ? itemDate >= previousStart && itemDate <= previousEnd : false;
    });
  }, [dateRange, workspaceMediaItems]);
  const statsMetric = (key: string) => statsDashboard?.metrics?.[key] ? { value: 0, previousValue: 0, change: 0 };
  const statsTrendOption = getStatsTrendOption(statsTrendGranularity);
  const statsTrendSubtitle = `${statsTrendOption.label} paylaşım hareketi`;
  const statsTrendData = useMemo<StatsTrendPoint[]>(() => {
    if (statsDashboard?.trend?.length) {
      return statsDashboard.trend.map((point) => {
        const pointDate = resolveDateInput(point.date) ?? getOptionalDate(point.startDate) || new Date();
        const pointEndDate = getOptionalDate(point.endDate) ?? pointDate;
        const bucketEndExclusive = new Date(pointEndDate);
        bucketEndExclusive.setDate(bucketEndExclusive.getDate() + 1);
        const label = point.label || formatStatsTrendBucketLabel(pointDate, bucketEndExclusive, statsTrendGranularity);
        const storyShares = point.storyShares ?? point.templateShares || 0;

        return {
          date: pointDate,
          isoDate: point.date,
          label,
          shortLabel: label,
          value: point.value,
          photos: point.photos || 0,
          qrShares: point.qrShares ?? point.photos || 0,
          galleryShares: point.galleryShares || 0,
          storyShares,
          templateShares: storyShares,
          emailShares: point.emailShares || 0,
          otherShares: point.otherShares || 0,
          customerAdds: point.customerAdds || 0,
        };
      });
    }

    const buckets = createStatsTrendBuckets(dateRange, statsTrendGranularity);

    for (const item of selectedRangeMediaItems) {
      const itemDate = getMediaDate(item.createdAt);
      if (!itemDate) continue;

      const bucket = findStatsTrendBucket(buckets, itemDate);
      if (!bucket) continue;

      const itemShareValue = 1 + item.shareCount;
      bucket.photos += 1;
      if (item.tableNumber) {
        bucket.qrShares += itemShareValue;
      } else {
        bucket.galleryShares += itemShareValue;
      }
      bucket.value += itemShareValue;
    }

    return buckets.map(({ endExclusive, ...bucket }) => bucket);
  }, [dateRange, selectedRangeMediaItems, statsDashboard?.trend, statsTrendGranularity]);
  const statsTrendMax = getStatsTrendChartMax(statsTrendData.map((point) => point.value));
  const statsTrendGeometry = useMemo(() => {
    const width = 820;
    const height = 255;
    const paddingX = 34;
    const paddingY = 24;
    const innerWidth = width - paddingX * 2;
    const innerHeight = height - paddingY * 2;
    const denominator = Math.max(1, statsTrendData.length - 1);
    const getX = (index: number) => paddingX + (index / denominator) * innerWidth;
    const getY = (value: number) => paddingY + innerHeight - (value / statsTrendMax) * innerHeight;
    const points = statsTrendData.map((point, index) => ({
      ...point,
      x: getX(index),
      y: getY(point.value),
    }));
    const baseline = paddingY + innerHeight;
    const labelLimit = isMobileViewport ? 4 : 7;
    const labelStep = statsTrendData.length > labelLimit ? Math.ceil(statsTrendData.length / labelLimit) : 1;

    return {
      width,
      height,
      baseline,
      path: buildSmoothPath(points),
      areaPath: buildAreaPath(points, baseline),
      points,
      labelStep,
      guideValues: [0, 25, 50, 75, 100],
    };
  }, [isMobileViewport, statsTrendData, statsTrendMax]);
  const activeStatsTrendIndex =
    hoveredStatsTrendIndex !== null && hoveredStatsTrendIndex >= 0 && hoveredStatsTrendIndex < statsTrendGeometry.points.length
 hoveredStatsTrendIndex
      : null;
  const activeStatsTrendPoint = activeStatsTrendIndex !== null ? statsTrendGeometry.points[activeStatsTrendIndex] : null;
  const statsRangeLikes = totalLikes;
  const statsPreviousLikes = previousRangeMediaItems.reduce((sum, item) => sum + item.likesCount, 0);
  const statsRangeViews = selectedRangeMediaItems.reduce((sum, item) => sum + item.viewsCount, 0);
  const statsPreviousViews = previousRangeMediaItems.reduce((sum, item) => sum + item.viewsCount, 0);
  const statsSourceRows = useMemo(() => {
    const backendRows = statsDashboard?.sources ? [];
    const byKey = new Map(backendRows.map((row) => [row.key, row]));
    const getBackendValue = (...keys: string[]) => {
      for (const key of keys) {
        const value = byKey.get(key)?.value;
        if (typeof value === 'number') {
          return value;
        }
      }

      return 0;
    };
    const qrShareFallback = selectedRangeMediaItems.reduce(
      (sum, item) => sum + (item.tableNumber ? 1 + item.shareCount : 0),
      0
    );
    const galleryShareFallback = selectedRangeMediaItems.reduce(
      (sum, item) => sum + (!item.tableNumber ? 1 + item.shareCount : 0),
      0
    );
    const liveGalleryBackendValue = getBackendValue('gallery') + getBackendValue('qr');
    const liveGalleryFallback = qrShareFallback + galleryShareFallback;
    const rows = [
      {
        key: 'gallery',
        label: 'Canlı Galeri Paylaşımları',
        value: Math.max(liveGalleryBackendValue, liveGalleryFallback),
        color: '#df8b3f',
      },
      {
        key: 'email',
        label: 'E-posta Kampanyaları',
        value: Math.max(getBackendValue('email', 'campaigns'), emailDeliveredTotal),
        color: '#d96d86',
      },
      {
        key: 'story',
        label: 'Story Şablonları',
        value: getBackendValue('story', 'templates'),
        color: '#8156d5',
      },
    ];
    const otherValue = getBackendValue('other');
    if (otherValue > 0) {
      rows.push({
        key: 'other',
        label: 'Diğer',
        value: otherValue,
        color: '#6b7280',
      });
    }
    const total = Math.max(1, rows.reduce((sum, row) => sum + row.value, 0));

    return rows.map((row) => ({
      ...row,
      percent: Math.round((row.value / total) * 1000) / 10,
    }));
  }, [emailDeliveredTotal, selectedRangeMediaItems, statsDashboard?.sources]);
  const statsSourceTotal = statsSourceRows.reduce((sum, row) => sum + row.value, 0);
  const statsSourceGradient = statsSourceRows.reduce(
    (parts, row) => {
      const start = parts.offset;
      const end = start + row.percent;
      return {
        offset: end,
        values: [...parts.values, `${row.color} ${start}% ${end}%`],
      };
    },
    { offset: 0, values: [] as string[] }
  ).values.join(', ');
  const resolveStatsMetric = (key: string, fallbackValue: number, fallbackPreviousValue: number) => {
    const metric = statsMetric(key);
    const fallbackChange = getPercentChangeValue(fallbackValue, fallbackPreviousValue);

    if (metric.value > 0 || metric.previousValue > 0) {
      return {
        value: Math.max(metric.value, fallbackValue),
        change: metric.value >= fallbackValue ? metric.change : fallbackChange,
      };
    }

    return {
      value: fallbackValue,
      change: fallbackChange,
    };
  };
  const previousShareFallback = previousRangeMediaItems.reduce((sum, item) => sum + 1 + item.shareCount, 0);
  const totalShareMetric = resolveStatsMetric('totalShares', statsSourceTotal, previousShareFallback);
  const totalViewMetric = resolveStatsMetric('totalViews', statsRangeViews + emailOpenTotal, statsPreviousViews);
  const totalLikeMetric = resolveStatsMetric('totalLikes', statsRangeLikes, statsPreviousLikes);
  const storyTemplateMetric = resolveStatsMetric('storyTemplateShares', statsDashboard?.storyTemplates?.shareCount || 0, 0);
  const newCustomerMetric = resolveStatsMetric('newCustomers', rangeCustomerCount, 0);
  const statsKpiCards = [
    {
      key: 'shares',
      label: 'Paylaşımlar',
      value: totalShareMetric.value,
      change: totalShareMetric.change,
      icon: Users,
    },
    {
      key: 'views',
      label: 'Gösterimler',
      value: totalViewMetric.value,
      change: totalViewMetric.change,
      icon: Eye,
    },
    {
      key: 'likes',
      label: 'Beğeniler',
      value: totalLikeMetric.value,
      change: totalLikeMetric.change,
      icon: Heart,
    },
    {
      key: 'templates',
      label: 'Story Şablonları',
      value: storyTemplateMetric.value,
      change: storyTemplateMetric.change,
      icon: SendHorizontal,
    },
    {
      key: 'customers',
      label: 'Yeni Müşteriler',
      value: newCustomerMetric.value,
      change: newCustomerMetric.change,
      icon: UserPlus,
    },
  ];
  const statsTopTemplates = statsDashboard?.topStoryTemplates?.length
 statsDashboard.topStoryTemplates
    : [];
  const statsTopTemplateMax = Math.max(1, ...statsTopTemplates.map((template) => template.count));
  const statsImpactCards = [
    {
      key: 'reach',
      title: 'Erişim',
      value: statsDashboard?.impact?.reachIncrease || getPercentChangeValue(statsRangeViews + emailDeliveredTotal, statsPreviousViews),
      description: 'Gösterim, QR ve e-posta erişimindeki dönem farkı',
      icon: TrendingUp,
    },
    {
      key: 'engagement',
      title: 'Etkileşim',
      value: statsDashboard?.impact?.engagementIncrease || getPercentChangeValue(statsRangeLikes + emailOpenTotal + emailClickTotal, statsPreviousLikes),
      description: 'Beğeni, açılma ve tıklamalardan gelen toplam hareket',
      icon: Users,
    },
    {
      key: 'loyal',
      title: 'Sadık Müşteri',
      value: statsDashboard?.impact?.loyalCustomerIncrease || getPercentChangeValue(rangeCustomerCount, 0),
      description: 'Müşteri listesindeki sadık segment oranı',
      icon: UserPlus,
    },
  ];
  const marketingSourceCampaigns = useMemo(
    () => websiteCampaigns.filter((campaign) => getCampaignTabKey(campaign.status) !== 'archived'),
    [websiteCampaigns]
  );
  const selectedMarketingSourceCampaign =
    marketingSourceCampaigns.find((campaign) => campaign.id === selectedMarketingSourceCampaignId) ?
    marketingSourceCampaigns[0] ?
    null;
  const marketingSourceCampaignOptions: DropdownOption[] = marketingSourceCampaigns.length > 0
 marketingSourceCampaigns.map((campaign) => ({
        value: campaign.id,
        label: campaign.subject,
        hint: campaign.description || getCampaignCategoryLabel(campaign.tag),
      }))
    : [
        {
          value: 'none',
          label: 'Web kampanyası yok',
          hint: 'Önce Kampanyalar sayfasında bir kampanya yayınlayın',
        },
      ];
  const marketingCampaignFilterOptions: DropdownOption[] = [
    { value: 'all', label: 'Tümü' },
    { value: 'sent', label: 'Gönderildi' },
    { value: 'draft', label: 'Taslak' },
    { value: 'scheduled', label: 'Planlandı' },
  ];
  const marketingFilteredCampaigns = useMemo(
    () =>
      emailCampaigns.filter((campaign) => {
        if (marketingCampaignFilter === 'sent') {
          return campaign.status === 'completed' || campaign.status === 'sending';
        }

        if (marketingCampaignFilter === 'draft') {
          return campaign.status === 'draft';
        }

        if (marketingCampaignFilter === 'scheduled') {
          return campaign.status === 'scheduled';
        }

        return campaign.status !== 'archived';
      }),
    [emailCampaigns, marketingCampaignFilter]
  );
  const marketingCampaignPageSize = 5;
  const marketingCampaignTotalPages = Math.max(1, Math.ceil(Math.max(marketingFilteredCampaigns.length, 1) / marketingCampaignPageSize));
  const marketingCampaignRows = useMemo(() => {
    const startIndex = (marketingCampaignPage - 1) * marketingCampaignPageSize;
    return marketingFilteredCampaigns.slice(startIndex, startIndex + marketingCampaignPageSize);
  }, [marketingFilteredCampaigns, marketingCampaignPage]);

  useEffect(() => {
    setMarketingCampaignPage(1);
  }, [marketingCampaignFilter, workspaceSlug]);

  useEffect(() => {
    setMarketingCampaignPage((current) => Math.min(current, marketingCampaignTotalPages));
  }, [marketingCampaignTotalPages]);

  const topMarketingCampaign = useMemo(() => {
    if (emailCampaigns.length === 0) {
      return null;
    }

    return [...emailCampaigns].sort((left, right) => {
      const leftScore =
        getCampaignOpenCount(left) * 4 +
        getCampaignClickCount(left) * 6 +
        Math.max(0, left.sentCount || 0) +
        Math.max(0, left.recipientCount || 0) * 0.1;
      const rightScore =
        getCampaignOpenCount(right) * 4 +
        getCampaignClickCount(right) * 6 +
        Math.max(0, right.sentCount || 0) +
        Math.max(0, right.recipientCount || 0) * 0.1;

      return rightScore - leftScore;
    })[0];
  }, [emailCampaigns]);
  const marketingPerformanceSegments = [
    {
      key: 'clicked',
      label: 'Tıkladı',
      value: emailClickTotal,
      rate: getPercent(emailClickTotal, emailRecipientTotal),
      color: '#f0a35f',
    },
    {
      key: 'opened',
      label: 'Açtı',
      value: emailOpenTotal,
      rate: getPercent(emailOpenTotal, emailRecipientTotal),
      color: '#83baf6',
    },
    {
      key: 'unopened',
      label: 'Açmadı',
      value: emailUnopenedTotal,
      rate: getPercent(emailUnopenedTotal, emailRecipientTotal),
      color: '#95a0b6',
    },
    {
      key: 'failed',
      label: 'Başarısız',
      value: emailFailedTotal,
      rate: emailFailureRate,
      color: '#ff8291',
    },
    {
      key: 'pending',
      label: 'Beklemede',
      value: emailPendingTotal,
      rate: getPercent(emailPendingTotal, emailRecipientTotal),
      color: '#a77cf2',
    },
  ];
  const marketingPerformanceTotal = Math.max(
    1,
    marketingPerformanceSegments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0)
  );
  let marketingDonutStart = 0;
  const marketingDonutGradient = marketingPerformanceSegments
    .map((segment) => {
      const slice = (Math.max(0, segment.value) / marketingPerformanceTotal) * 100;
      const start = marketingDonutStart;
      const end = marketingDonutStart + slice;
      marketingDonutStart = end;
      return `${segment.color} ${start}% ${end}%`;
    })
    .join(', ');
  const marketingDonutBackground = marketingPerformanceSegments.some((segment) => segment.value > 0)
 `conic-gradient(${marketingDonutGradient})`
    : 'conic-gradient(rgba(149, 160, 182, 0.42) 0% 100%)';
  const marketingKpiCards: Array<{
    label: string;
    value: string;
    trend: string;
    icon: LucideIcon;
    tone: 'violet' | 'blue' | 'green' | 'amber' | 'rose';
  }> = [
    {
      label: 'Toplam Abone',
      value: formatCompactNumber(registeredEmailTotal),
      trend: rangeCustomerCount > 0 ? `+${formatCompactNumber(rangeCustomerCount)} bu aralık` : 'Liste güncel',
      icon: Users,
      tone: 'violet',
    },
    {
      label: 'Gönderilen E-posta',
      value: formatCompactNumber(emailDeliveredTotal),
      trend: `${formatCompactNumber(emailRecipientTotal)} alıcı`,
      icon: SendHorizontal,
      tone: 'blue',
    },
    {
      label: 'Açılma Oranı',
      value: formatPercent(emailOpenRate),
      trend: `${formatCompactNumber(emailOpenTotal)} gerçek açılma`,
      icon: Mail,
      tone: 'green',
    },
    {
      label: 'Tıklanma Oranı',
      value: formatPercent(emailClickRate),
      trend: `${formatCompactNumber(emailClickTotal)} gerçek tıklama`,
      icon: MousePointer2,
      tone: 'amber',
    },
    {
      label: 'Teslim Oranı',
      value: formatPercent(emailDeliveryRate),
      trend: `${formatCompactNumber(emailFailedTotal)} başarısız`,
      icon: ShieldCheck,
      tone: 'rose',
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
 websiteCampaigns
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
    CAMPAIGN_DATA_FILTERS.find((filter) => filter.key === campaignDataFilter)?.label || 'Tüm kampanyalar';
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
      label: 'Ana Sayfa',
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
      description: 'E-posta ve story',
      value: `${emailTemplateRows.length + STORY_TEMPLATES.length}`,
      icon: Sparkles,
    },
    {
      key: 'stats',
      label: 'İstatistikler',
      description: 'Performans',
      value: topTable?.[0] || `${uniqueTables.length} masa`,
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

  const updateSettings = useCallback((patch: Partial<AdminSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const showToast = useCallback((text: string, tone: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, tone });
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const loadManagedAccessPolicy = useCallback(async () => {
    if (!canShowOwnerAccessPanel || !auth.currentUser) {
      return;
    }

    setIsAccessPolicyLoading(true);
    setAccessPolicyNotice(null);

    try {
      const response = await accessPolicyService.getPolicy(DEFAULT_CAFE_SLUG);
      setManagedAccessPolicy(normalizeAccessPolicyPayload(response.policy));
      setAccessPolicyNotice('Yetki listesi sunucudan alındı.');
    } catch (error) {
      console.error('Access policy load failed:', error);
      setAccessPolicyNotice(getAdminFriendlyErrorMessage(error, 'Yetki listesi alınamadı. Statik policy gösteriliyor.'));
    } finally {
      setIsAccessPolicyLoading(false);
    }
  }, [canShowOwnerAccessPanel]);

  useEffect(() => {
    if (canShowOwnerAccessPanel) {
      void loadManagedAccessPolicy();
    }
  }, [canShowOwnerAccessPanel, loadManagedAccessPolicy]);

  const saveManagedAccessPolicy = useCallback(async (nextPolicy: AccessPolicyPayload, successMessage: string) => {
    if (!canShowOwnerAccessPanel) {
      showToast('Yetki yönetimini yalnızca Super Owner kullanabilir.', 'error');
      return;
    }

    const normalizedPolicy = normalizeAccessPolicyPayload(nextPolicy);
    setIsAccessPolicySaving(true);

    try {
      const response = await accessPolicyService.updatePolicy(normalizedPolicy, DEFAULT_CAFE_SLUG);
      setManagedAccessPolicy(normalizeAccessPolicyPayload(response.policy));
      setAccessPolicyNotice(response.message || successMessage);
      showToast(successMessage, 'success');
    } catch (error) {
      console.error('Access policy save failed:', error);
      showToast(getAdminFriendlyErrorMessage(error, 'Yetki politikası kaydedilemedi.'), 'error');
    } finally {
      setIsAccessPolicySaving(false);
    }
  }, [canShowOwnerAccessPanel, showToast]);

  const handleSaveAccessAssignment = useCallback(async () => {
    const normalizedEmail = normalizeAccessEmail(managedAccessForm.email);
    const cafeSlugs = uniqueAccessSlugs(managedAccessForm.cafeSlugs.split(','));

    if (!isValidAccessEmail(normalizedEmail)) {
      showToast('Geçerli bir e-posta adresi yazın.', 'error');
      return;
    }

    if (managedAccessForm.role !== 'super_owner' && cafeSlugs.length === 0) {
      showToast('Owner/Admin veya Manager için en az bir cafe kodu yazılmalıdır.', 'error');
      return;
    }

    const nextPolicy = applyAccessAssignment(managedAccessPolicy, managedAccessForm);
    await saveManagedAccessPolicy(nextPolicy, 'Yetki ataması kaydedildi.');
    setManagedAccessForm((current) => ({
      ...current,
      email: '',
      cafeSlugs: current.role === 'super_owner' ? workspaceSlug : current.cafeSlugs,
    }));
  }, [managedAccessForm, managedAccessPolicy, saveManagedAccessPolicy, showToast, workspaceSlug]);

  const handleRemoveAccessAssignment = useCallback(async (email: string) => {
    const normalizedEmail = normalizeAccessEmail(email);
    if (!normalizedEmail) {
      return;
    }

    await saveManagedAccessPolicy(
      removeEmailFromAccessPolicy(managedAccessPolicy, normalizedEmail),
      'Kullanıcının yönetim yetkisi kaldırıldı.'
    );
  }, [managedAccessPolicy, saveManagedAccessPolicy]);

  const handleSyncAccessClaims = useCallback(async (email?: string) => {
    if (!canShowOwnerAccessPanel) {
      showToast('Custom claims senkronizasyonunu yalnızca Super Owner çalıştırabilir.', 'error');
      return;
    }

    setIsAccessClaimsSyncing(true);

    try {
      const response = await accessPolicyService.syncClaims(email, DEFAULT_CAFE_SLUG);
      const missingCount = response.result.missingUsers.length;
      const message = missingCount > 0
 `${response.result.synced} kullanıcı güncellendi. ${missingCount} kullanıcı henüz Firebase Auth içinde bulunamadı.`
        : response.message || 'Firebase custom claims güncellendi.';
      setAccessPolicyNotice(message);
      showToast(message, missingCount > 0 ? 'info' : 'success');
    } catch (error) {
      console.error('Access claims sync failed:', error);
      showToast(getAdminFriendlyErrorMessage(error, 'Firebase custom claims senkronizasyonu tamamlanamadı.'), 'error');
    } finally {
      setIsAccessClaimsSyncing(false);
    }
  }, [canShowOwnerAccessPanel, showToast]);

  const handleAddManagerEmail = useCallback(() => {
    const normalizedEmail = normalizeAccessEmail(newManagerEmail);

    if (!normalizedEmail) {
      return;
    }

    setSettings((current) => ({
      ...current,
      adminEmails: Array.from(new Set([...current.adminEmails, normalizedEmail])),
    }));
    setNewManagerEmail('');
  }, [newManagerEmail]);

  const handleRemoveManagerEmail = useCallback((email: string) => {
    const normalizedEmail = normalizeAccessEmail(email);

    setSettings((current) => ({
      ...current,
      adminEmails: current.adminEmails.filter((entry) => normalizeAccessEmail(entry) !== normalizedEmail),
    }));
  }, []);

  const handleAddOwnerAccessEmail = useCallback(async () => {
    if (!isSuperAdmin) {
      showToast('Kafe sahibi yetkisini yalnızca Super Admin verebilir.', 'error');
      return;
    }

    const normalizedEmail = normalizeAccessEmail(newOwnerAccessEmail);

    if (!normalizedEmail || !isValidOwnerAccessEmail(normalizedEmail)) {
      showToast('Geçerli bir kafe sahibi e-postası yazın.', 'error');
      return;
    }

    setOwnerAccessActionBusy(normalizedEmail);

    try {
      await setDoc(
        doc(db, OWNER_ACCESS_COLLECTION, normalizedEmail),
        {
          email: normalizedEmail,
          active: true,
          createdAt: serverTimestamp(),
          createdBy: normalizedUserEmail || null,
          updatedAt: serverTimestamp(),
          updatedBy: normalizedUserEmail || null,
        },
        { merge: true }
      );
      setNewOwnerAccessEmail('');
      showToast(`${normalizedEmail} artık yeni kafe oluşturabilir.`, 'success');
    } catch (error) {
      console.error('Owner access add failed:', error);
      showToast(getAdminFriendlyErrorMessage(error, 'Kafe sahibi yetkisi eklenemedi.'), 'error');
    } finally {
      setOwnerAccessActionBusy(null);
    }
  }, [isSuperAdmin, newOwnerAccessEmail, normalizedUserEmail, showToast]);

  const handleRemoveOwnerAccessEmail = useCallback(async (email: string) => {
    if (!isSuperAdmin) {
      showToast('Kafe sahibi yetkisini yalnızca Super Admin kaldırabilir.', 'error');
      return;
    }

    const normalizedEmail = normalizeAccessEmail(email);
    if (!normalizedEmail) {
      return;
    }

    setOwnerAccessActionBusy(normalizedEmail);

    try {
      await deleteDoc(doc(db, OWNER_ACCESS_COLLECTION, normalizedEmail));
      showToast(`${normalizedEmail} için yeni kafe oluşturma yetkisi kaldırıldı.`, 'success');
    } catch (error) {
      console.error('Owner access remove failed:', error);
      showToast(getAdminFriendlyErrorMessage(error, 'Kafe sahibi yetkisi kaldırılamadı.'), 'error');
    } finally {
      setOwnerAccessActionBusy(null);
    }
  }, [isSuperAdmin, showToast]);

  const handlePlanContact = useCallback((plan: (typeof CAFE_PACKAGE_OPTIONS)[number]) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.open(
      buildPlanWhatsappUrl({
        planKey: plan.key,
        cafeName: settings.cafeName || DEFAULT_CAFE_NAME,
        ownerEmail: userEmail,
        workspaceSlug,
        source: 'Yönetim Paneli',
        tableCount: pricingTableCount,
      }),
      '_blank',
      'noopener,noreferrer'
    );
  }, [pricingTableCount, settings.cafeName, userEmail, workspaceSlug]);

  const updateSettingsIntegrations = useCallback((patch: Partial<SettingsIntegrations>) => {
    setSettings((current) => ({
      ...current,
      integrations: { ...current.integrations, ...patch },
    }));
  }, []);

  const updateSettingsSecurity = useCallback((patch: Partial<SettingsSecurity>) => {
    setSettings((current) => ({
      ...current,
      security: { ...current.security, ...patch },
    }));
  }, []);

  const updateSettingsExtra = useCallback((patch: Partial<SettingsExtra>) => {
    setSettings((current) => ({
      ...current,
      extra: { ...current.extra, ...patch },
    }));
  }, []);

  const updateSettingsDomains = useCallback((patch: Partial<SettingsDomains>) => {
    setSettings((current) => ({
      ...current,
      domains: { ...current.domains, ...patch },
    }));
  }, []);

  useEffect(() => {
    if (!firebaseIdentity || !workspaceSlug || !canManageActiveWorkspace) {
      return;
    }

    let isCancelled = false;
    setIsSettingsBackendLoading(true);

    emailService
      .getCafeSettings(firebaseIdentity, workspaceSlug)
      .then((response) => {
        if (isCancelled) {
          return;
        }

        const nextSettings = normalizeAdminSettings(
          {
            ...response.settings,
            cafeName: response.settings.businessName ?? response.settings.cafeName || response.cafe.name,
            packageKey: response.settings.packageKey || response.settings.billingPlan,
            accentColor: response.settings.primaryColor,
          },
          workspaceSlug
        );

        setSettings(nextSettings);
        setSavedSettings(nextSettings);
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error('Settings backend load failed:', error);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsSettingsBackendLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [canManageActiveWorkspace, firebaseIdentity, workspaceSlug]);

  const loadQrDashboard = useCallback(async () => {
    if (!firebaseIdentity || !workspaceSlug || !canManageActiveWorkspace) {
      setQrDashboard(null);
      setQrDashboardError(null);
      return;
    }

    setQrDashboardLoading(true);
    setQrDashboardError(null);

    try {
      await qrService.syncCafeQrStands(
        firebaseIdentity,
        workspaceSlug,
        qrStandRows.map((stand) => ({
          name: stand.table,
          table: stand.table,
          location: stand.table,
          tableCount: 1,
          shareCount: stand.shareCount,
          photoCount: stand.shareCount,
          publicUrl: stand.url,
          lastActivityAt: stand.lastActivityAt,
          status: 'active',
          notes:
            stand.shareCount > 0
 `${stand.shareCount} fotoğraf bu QR masasıyla eşleşiyor.`
              : 'Website QR masası hazır.',
        })),
        settings.cafeName
      );

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
      setQrDashboardError(getAdminFriendlyErrorMessage(error, 'QR stand verileri yüklenemedi.'));
    } finally {
      setQrDashboardLoading(false);
    }
  }, [canManageActiveWorkspace, firebaseIdentity, qrStandRows, qrStandSearchTerm, qrStandStatusFilter, settings.cafeName, workspaceSlug]);

  const loadStatsDashboard = useCallback(async (options: { silent?: boolean } = {}) => {
    const { silent = false } = options;

    if (!firebaseIdentity || !workspaceSlug || !canManageActiveWorkspace) {
      if (!silent) {
        setStatsDashboard(null);
        setStatsError(null);
      }
      return;
    }

    if (!silent) {
      setStatsLoading(true);
    }
    setStatsError(null);

    try {
      if (workspaceMediaItems.length > 0) {
        const mediaSnapshots: StatsMediaSyncItem[] = workspaceMediaItems.map((item) => {
          const itemDate = getMediaDate(item.createdAt);

          return {
            id: item.id,
            source: item.tableNumber ? 'qr' : 'gallery',
            tableNumber: item.tableNumber,
            status: item.status,
            createdAt: itemDate ? itemDate.toISOString() : undefined,
            viewsCount: item.viewsCount,
            likesCount: item.likesCount,
            shareCount: item.shareCount,
            qrInteractionCount: item.qrInteractionCount,
          };
        });

        await emailService.syncStatsMedia(firebaseIdentity, workspaceSlug, mediaSnapshots);
      }

      if (qrStandRows.length > 0) {
        await qrService.syncCafeQrStands(
          firebaseIdentity,
          workspaceSlug,
          qrStandRows.map((stand) => ({
            name: stand.table,
            table: stand.table,
            location: stand.table,
            tableCount: 1,
            shareCount: stand.shareCount,
            photoCount: stand.shareCount,
            publicUrl: stand.url,
            lastActivityAt: stand.lastActivityAt,
            status: 'active',
            notes:
              stand.shareCount > 0
 `${stand.shareCount} fotoğraf bu QR masasıyla eşleşiyor.`
                : 'Website QR masası hazır.',
          })),
          settings.cafeName
        );
      }

      const response = await emailService.getStatsDashboard(
        firebaseIdentity,
        workspaceSlug,
        dateRange.start,
        dateRange.end,
        statsTrendGranularity
      );
      setStatsDashboard(response);
    } catch (error) {
      console.error('Stats dashboard load failed:', error);
      setStatsDashboard(null);
      setStatsError(getAdminFriendlyErrorMessage(error, 'İstatistik verileri yüklenemedi.'));
    } finally {
      if (!silent) {
        setStatsLoading(false);
      }
    }
  }, [
    canManageActiveWorkspace,
    dateRange.end,
    dateRange.start,
    firebaseIdentity,
    qrStandRows,
    settings.cafeName,
    statsTrendGranularity,
    workspaceMediaItems,
    workspaceSlug,
  ]);

  const loadEmailData = useCallback(async (
    options: { silent?: boolean; includeCustomers?: boolean } = {}
  ) => {
    const { silent = false, includeCustomers = true } = options;

    if (!firebaseIdentity || !workspaceSlug || !canManageActiveWorkspace) {
      if (!silent) {
        setEmailDashboard(null);
        setEmailCampaigns([]);
        setEmailCustomers([]);
        emailCustomersRef.current = [];
        setEmailAnalyticsSummary(null);
        setEmailNotice(null);
      }
      return;
    }

    if (!hasMailMarketingAccess) {
      setEmailDashboard(null);
      setEmailCampaigns([]);
      setEmailAnalyticsSummary(null);
      if (!silent) {
        setEmailNotice('E-posta pazarlama yalnızca Mail Entegrasyonlu Plan ile kullanılabilir.');
      }
      return;
    }

    if (!silent) {
      setEmailLoading(true);
      setEmailNotice(null);
    }

    ? try {
      const [dashboardResponse, campaignsResponse, customersResponse, analyticsSummaryResponse] = await Promise.all([
        emailService.getCafeDashboard(firebaseIdentity, workspaceSlug),
        emailService.listCampaigns(firebaseIdentity, workspaceSlug, 100, 0),
        includeCustomers
 emailService.listCustomers(firebaseIdentity, workspaceSlug, 500, 0)
          : Promise.resolve({ customers: emailCustomersRef.current, total: emailCustomersRef.current.length }),
        emailService.getCafeAnalyticsSummary(firebaseIdentity, workspaceSlug, dateRange.start, dateRange.end),
      ]);

      const resolvedCustomers = (customersResponse.customers ? []).filter(hasCustomerEmail);
      const activeCustomerCount = resolvedCustomers.filter(isMarketingListCustomer).length;
      const customerFallbackCount = includeCustomers ? activeCustomerCount : emailCustomersRef.current.filter(isMarketingListCustomer).length;

      setEmailDashboard({
        sentToday: dashboardResponse.stats?.sentToday || 0,
        dailyLimitRemaining: dashboardResponse.stats?.dailyLimitRemaining || 0,
        totalCustomers: analyticsSummaryResponse.stats?.totalCustomers ?? dashboardResponse.stats?.totalCustomers || customerFallbackCount,
        registeredEmails: analyticsSummaryResponse.stats?.registeredEmails ?? dashboardResponse.stats?.registeredEmails || customerFallbackCount,
        totalCampaigns: dashboardResponse.stats?.totalCampaigns ?? campaignsResponse.campaigns?.length || 0,
      });
      setEmailCampaigns(campaignsResponse.campaigns ? []);
      if (includeCustomers) {
        emailCustomersRef.current = resolvedCustomers;
        setEmailCustomers(resolvedCustomers);
      }
      setEmailAnalyticsSummary({
        totalCustomers: analyticsSummaryResponse.stats?.totalCustomers ?? dashboardResponse.stats?.totalCustomers || customerFallbackCount,
        registeredEmails: analyticsSummaryResponse.stats?.registeredEmails ?? dashboardResponse.stats?.registeredEmails || customerFallbackCount,
        customersCreated: analyticsSummaryResponse.stats?.customersCreated || 0,
        campaignsCreated: analyticsSummaryResponse.stats?.campaignsCreated || 0,
        campaignsSent: analyticsSummaryResponse.stats?.campaignsSent || 0,
        recipientCount: analyticsSummaryResponse.stats?.recipientCount || 0,
        sentCount: analyticsSummaryResponse.stats?.sentCount || 0,
        failedCount: analyticsSummaryResponse.stats?.failedCount || 0,
        openCount: analyticsSummaryResponse.stats?.openCount || 0,
        clickCount: analyticsSummaryResponse.stats?.clickCount || 0,
        deliveryRate: analyticsSummaryResponse.stats?.deliveryRate || 0,
        failureRate: analyticsSummaryResponse.stats?.failureRate || 0,
        openRate: analyticsSummaryResponse.stats?.openRate || 0,
        clickRate: analyticsSummaryResponse.stats?.clickRate || 0,
        latestCampaignSubject: analyticsSummaryResponse.latestCampaign?.subject || null,
      });
    } catch (error) {
      console.error('Email panel data load failed:', error);
      if (!silent) {
        setEmailDashboard(null);
        setEmailCampaigns([]);
        setEmailCustomers([]);
        emailCustomersRef.current = [];
        setEmailAnalyticsSummary(null);
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'E-posta servisine ulaşılamadı.'));
      }
    } finally {
      if (!silent) {
        setEmailLoading(false);
      }
    }
  }, [canManageActiveWorkspace, dateRange.end, dateRange.start, firebaseIdentity, hasMailMarketingAccess, workspaceSlug]);

  const loadEmailTemplates = useCallback(async (options: { silent?: boolean } = {}) => {
    const { silent = false } = options;

    if (!firebaseIdentity || !workspaceSlug || !canManageActiveWorkspace) {
      if (!silent) {
        const normalizedSearch = templateSearchTerm.trim().toLocaleLowerCase('tr');
        const filteredTemplates = EMAIL_TEMPLATES.filter((template) => {
          const matchesCategory = templateCategoryFilter === 'Tümü' || template.category === templateCategoryFilter;
          const haystack = `${template.title} ${template.subject} ${template.description ?? ''} ${template.textContent}`.toLocaleLowerCase('tr');
          return matchesCategory && (!normalizedSearch || haystack.includes(normalizedSearch));
        });
        const pageCount = Math.max(1, Math.ceil(filteredTemplates.length / TEMPLATE_PAGE_SIZE));
        const safePage = Math.min(templatePage, pageCount);
        const pageStart = (safePage - 1) * TEMPLATE_PAGE_SIZE;

        setEmailTemplateRows(filteredTemplates.slice(pageStart, pageStart + TEMPLATE_PAGE_SIZE));
        setEmailTemplateCategoryCounts([]);
        setEmailTemplateTotal(filteredTemplates.length);
        setTemplatePageCount(pageCount);
      }
      return;
    }

    if (!hasMailMarketingAccess) {
      if (!silent) {
        setEmailTemplateRows([]);
        setEmailTemplateCategoryCounts([]);
        setEmailTemplateTotal(0);
        setTemplatePageCount(1);
        setEmailNotice('E-posta şablonları yalnızca Mail Entegrasyonlu Plan ile kullanılabilir.');
      }
      return;
    }

    if (!silent) {
      setTemplateLoading(true);
    }

    try {
      const response = await emailService.listEmailTemplates(firebaseIdentity, workspaceSlug, {
        search: templateSearchTerm,
        category: templateCategoryFilter,
        sort: templateSort,
        status: 'active',
        page: templatePage,
        limit: TEMPLATE_PAGE_SIZE,
      });
      const templates = response.templates.map(mapEmailTemplateToPreset);
      setEmailTemplateRows(templates);
      setEmailTemplateCategoryCounts(response.categories ? []);
      setEmailTemplateTotal(response.total || templates.length);
      setTemplatePageCount(Math.max(1, response.pageCount ?? Math.ceil((response.total || templates.length) / TEMPLATE_PAGE_SIZE)));
    } catch (error) {
      console.error('Email templates load failed:', error);
      setEmailTemplateRows(EMAIL_TEMPLATES);
      setEmailTemplateCategoryCounts([]);
      setEmailTemplateTotal(EMAIL_TEMPLATES.length);
      setTemplatePageCount(Math.max(1, Math.ceil(EMAIL_TEMPLATES.length / TEMPLATE_PAGE_SIZE)));
      if (!silent) {
        setEmailNotice(getAdminFriendlyErrorMessage(error, 'E-posta şablonları yüklenemedi.'));
      }
    } finally {
      if (!silent) {
        setTemplateLoading(false);
      }
    }
  }, [
    canManageActiveWorkspace,
    firebaseIdentity,
    hasMailMarketingAccess,
    templatePage,
    templateCategoryFilter,
    templateSearchTerm,
    templateSort,
    workspaceSlug,
  ]);

  const loadCustomerPanelData = useCallback(async () => {
    if (!firebaseIdentity || !workspaceSlug || !canManageActiveWorkspace) {
      setCustomerOverview(null);
      setCustomerRows([]);
      setCustomerTotal(0);
      setCustomerPageCount(1);
      return;
    }

    setCustomerLoading(true);
    setEmailNotice(null);

    try {
      const [overviewResponse, customersResponse] = await Promise.all([
        emailService.getCustomerOverview(firebaseIdentity, workspaceSlug),
        emailService.listCustomers(firebaseIdentity, workspaceSlug, 10, 0, {
          page: customerPage,
          search: customerSearchTerm,
          segment: customerSegmentFilter,
          sort: 'createdAt',
          order: 'desc',
        }),
      ]);

      setCustomerOverview(overviewResponse);
      setCustomerRows(customersResponse.customers ? []);
      setCustomerTotal(customersResponse.total || 0);
      setCustomerPageCount(customersResponse.pageCount || Math.max(1, Math.ceil((customersResponse.total || 0) / 10)));
    } catch (error) {
      console.error('Customer panel data load failed:', error);
      setCustomerOverview(null);
      setCustomerRows([]);
      setCustomerTotal(0);
      setCustomerPageCount(1);
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'Müşteri verileri yüklenemedi.'));
    } finally {
      setCustomerLoading(false);
    }
  }, [
    canManageActiveWorkspace,
    customerPage,
    customerSearchTerm,
    customerSegmentFilter,
    firebaseIdentity,
    workspaceSlug,
  ]);

  useEffect(() => {
    if (activeView !== 'qr') {
      return;
    }

    void loadQrDashboard();
  }, [activeView, loadQrDashboard]);

  useEffect(() => {
    if (activeView !== 'stats') {
      return;
    }

    void loadStatsDashboard();

    const interval = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }

      void loadStatsDashboard({ silent: true });
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [activeView, loadStatsDashboard]);

  useEffect(() => {
    void loadEmailData();
  }, [loadEmailData]);

  useEffect(() => {
    setTemplatePage(1);
  }, [templateSearchTerm, templateCategoryFilter, templateSort]);

  useEffect(() => {
    if (activeView !== 'templates' && activeView !== 'marketing') {
      return;
    }

    void loadEmailTemplates({ silent: activeView === 'marketing' });
  }, [activeView, loadEmailTemplates]);

  useEffect(() => {
    if (activeView !== 'marketing') {
      return;
    }

    const refreshLiveEmailStats = () => {
      if (emailLiveRefreshInFlightRef.current) {
        return;
      }

      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }

      emailLiveRefreshInFlightRef.current = true;
      void loadEmailData({ silent: true, includeCustomers: false }).finally(() => {
        emailLiveRefreshInFlightRef.current = false;
      });
    };

    refreshLiveEmailStats();
    const intervalId = window.setInterval(refreshLiveEmailStats, 10_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeView, loadEmailData]);

  useEffect(() => {
    if (activeView !== 'customers') {
      return;
    }

    void loadCustomerPanelData();
  }, [activeView, loadCustomerPanelData]);

  useEffect(() => {
    setCustomerPage(1);
  }, [customerSearchTerm, customerSegmentFilter]);

  useEffect(() => {
    setHasSeenNotifications(false);
  }, [notificationSignature]);

  useEffect(() => {
    const nextTemplate = availableEmailTemplates.find((template) => template.key === selectedTemplateKey) ?? availableEmailTemplates[0] || EMAIL_TEMPLATES[0];
    setCampaignSubjectInput(nextTemplate.subject);
    setCampaignDescriptionInput(nextTemplate.title);
    setCampaignTextInput(nextTemplate.textContent);
  }, [availableEmailTemplates, selectedTemplateKey]);

  useEffect(() => {
    if (marketingSourceCampaigns.length === 0) {
      setSelectedMarketingSourceCampaignId('');
      return;
    }

    if (!marketingSourceCampaigns.some((campaign) => campaign.id === selectedMarketingSourceCampaignId)) {
      setSelectedMarketingSourceCampaignId(marketingSourceCampaigns[0].id);
    }
  }, [marketingSourceCampaigns, selectedMarketingSourceCampaignId]);

  useEffect(() => {
    setExcludedAudienceEmails([]);
  }, [selectedAudienceKey]);

  const openQrRequestModal = useCallback(() => {
    setQrRequestNotice(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setQrRequestForm({
      contactName: userProfile.name || userEmail || settings.cafeName || '',
      contactEmail: userProfile.email || userEmail || '',
      contactPhone: '',
      standName: '',
      location: settings.cafeName || effectiveWorkspaceSlug,
      placement: '',
      tableCount: '1',
      preferredDate: toDateInputValue(tomorrow),
      notes: '',
    });
    setIsQrRequestModalOpen(true);
  }, [effectiveWorkspaceSlug, settings.cafeName, userEmail, userProfile.email, userProfile.name]);

  const closeQrRequestModal = useCallback(() => {
    setIsQrRequestModalOpen(false);
  }, []);

  const handleQrRequestSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!firebaseIdentity || !workspaceSlug) {
      setQrRequestNotice('QR talebi gönderilemedi. Lütfen yeniden giriş yapın.');
      return;
    }

    if (
      !qrRequestForm.contactName.trim() ||
      !qrRequestForm.contactEmail.trim() ||
      !qrRequestForm.contactPhone.trim() ||
      !qrRequestForm.location.trim()
    ) {
      setQrRequestNotice('Lütfen ad, e-posta, telefon ve konum alanlarını doldurun.');
      return;
    }

    setQrRequestSubmitting(true);
    setQrRequestNotice(null);
    const whatsappWindow = window.open('about:blank', '_blank');

    try {
      await qrService.createQrStandRequest(firebaseIdentity, workspaceSlug, {
        contactName: qrRequestForm.contactName.trim(),
        contactEmail: qrRequestForm.contactEmail.trim(),
        contactPhone: qrRequestForm.contactPhone.trim(),
        standName: qrRequestForm.standName.trim(),
        location: qrRequestForm.location.trim(),
        placement: qrRequestForm.placement.trim(),
        tableCount: Number.parseInt(qrRequestForm.tableCount, 10) || 1,
        preferredDate: qrRequestForm.preferredDate,
        notes: qrRequestForm.notes.trim(),
      });

      const whatsappMessage = buildQrStandRequestWhatsappMessage({
        cafeName: settings.cafeName,
        workspaceSlug,
        publicLink: publicQrExampleLink,
        contactName: qrRequestForm.contactName.trim(),
        contactEmail: qrRequestForm.contactEmail.trim(),
        contactPhone: qrRequestForm.contactPhone.trim(),
        standName: qrRequestForm.standName.trim(),
        location: qrRequestForm.location.trim(),
        placement: qrRequestForm.placement.trim(),
        tableCount: qrRequestForm.tableCount,
        preferredDate: qrRequestForm.preferredDate,
        notes: qrRequestForm.notes.trim(),
      });
      const whatsappUrl = `https://wa.me/${QR_REQUEST_WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

      if (whatsappWindow) {
        whatsappWindow.location.href = whatsappUrl;
      } else {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      }

      setQrRequestNotice('Talebiniz kaydedildi. WhatsApp mesajı bilgilerinizle hazırlandı.');
      setIsQrRequestModalOpen(false);
      await loadQrDashboard();
    } catch (error) {
      whatsappWindow?.close();
      console.error('QR request submit failed:', error);
      setQrRequestNotice(getAdminFriendlyErrorMessage(error, 'Talep gönderilemedi.'));
    } finally {
      setQrRequestSubmitting(false);
    }
  };

  const handleCustomerSegmentFilterChange = useCallback((segment: string) => {
    setCustomerSegmentFilter(segment);
    setCustomerPage(1);
  }, []);

  const handleExportCustomers = useCallback(async () => {
    const downloadReport = (reportBlob: Blob) => {
      const url = URL.createObjectURL(reportBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${workspaceSlug || 'sharevibe'}-musteri-raporu.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    };

    if (!firebaseIdentity || !workspaceSlug) {
      setEmailNotice('Müşteri listesini dışa aktarmak için tekrar giriş yapın.');
      return;
    }

    setCustomerExporting(true);
    try {
      const reportBlob = await emailService.exportCustomers(firebaseIdentity, workspaceSlug, {
        search: customerSearchTerm,
        segment: customerSegmentFilter,
        sort: 'createdAt',
        order: 'desc',
      });
      downloadReport(reportBlob);
      setEmailNotice('Müşteri listesi dışa aktarıldı.');
    } catch (error) {
      console.error('Customer export failed:', error);
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'Müşteri listesi dışa aktarılamadı.'));
    } finally {
      setCustomerExporting(false);
    }
  }, [
    customerSearchTerm,
    customerSegmentFilter,
    firebaseIdentity,
    workspaceSlug,
  ]);

  const openRecipientManager = useCallback(() => {
    setIsRecipientManagerOpen(true);

    window.requestAnimationFrame(() => {
      recipientManagerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

  const handleAddMarketingRecipient = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const email = recipientEmailInput.trim().toLowerCase();
    const name = recipientNameInput.trim();

    if (!firebaseIdentity || !workspaceSlug) {
      setEmailNotice('Alıcı eklemek için tekrar giriş yapın.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailNotice('Geçerli bir e-posta adresi yazın.');
      return;
    }

    setRecipientActionBusy('add');
    setEmailNotice(null);

    try {
      await emailService.createCustomer(firebaseIdentity, workspaceSlug, {
        email,
        name: name || undefined,
        segment: 'Kampanya Adayi',
        tags: ['Manuel'],
        emailSubscribed: true,
        lastInteractionAt: new Date().toISOString(),
        lastInteractionType: 'form_submit',
        metadata: {
          source: 'admin-marketing-list',
          addedFrom: 'email-marketing',
          emailVerified: false,
          addedAt: new Date().toISOString(),
        },
      });

      setRecipientNameInput('');
      setRecipientEmailInput('');
      setEmailNotice(`${email} e-posta listesine eklendi.`);
      await loadEmailData();
    } catch (error) {
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'Alıcı eklenemedi.'));
    } finally {
      setRecipientActionBusy(null);
    }
  };

  const handleRemoveMarketingRecipient = async (customer: EmailCustomer) => {
    if (!firebaseIdentity || !workspaceSlug) {
      setEmailNotice('Alıcıyı çıkarmak için tekrar giriş yapın.');
      return;
    }

    setRecipientActionBusy(customer.id);
    setEmailNotice(null);

    try {
      await emailService.updateCustomer(firebaseIdentity, workspaceSlug, customer.id, {
        emailSubscribed: false,
        lastInteractionAt: new Date().toISOString(),
        lastInteractionType: 'form_submit',
        metadata: {
          ...(customer.metadata ? {}),
          removedFrom: 'email-marketing',
          removedAt: new Date().toISOString(),
        },
      });

      setExcludedAudienceEmails((current) => current.filter((email) => email !== customer.email));
      setEmailNotice(`${customer.email} e-posta listesinden çıkarıldı.`);
      await loadEmailData();
    } catch (error) {
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'Alıcı listeden çıkarılamadı.'));
    } finally {
      setRecipientActionBusy(null);
    }
  };

  const handleRestoreMarketingRecipient = async (customer: EmailCustomer) => {
    if (!firebaseIdentity || !workspaceSlug) {
      setEmailNotice('Alıcıyı geri eklemek için tekrar giriş yapın.');
      return;
    }

    setRecipientActionBusy(customer.id);
    setEmailNotice(null);

    try {
      await emailService.updateCustomer(firebaseIdentity, workspaceSlug, customer.id, {
        emailSubscribed: true,
        lastInteractionAt: new Date().toISOString(),
        lastInteractionType: 'form_submit',
        metadata: {
          ...(customer.metadata ? {}),
          restoredFrom: 'email-marketing',
          restoredAt: new Date().toISOString(),
        },
      });

      setEmailNotice(`${customer.email} yeniden e-posta listesine eklendi.`);
      await loadEmailData();
    } catch (error) {
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'Alıcı geri eklenemedi.'));
    } finally {
      setRecipientActionBusy(null);
    }
  };

  const handleSetMarketingRecipientsSubscribed = async (
    customers: EmailCustomer[],
    emailSubscribed: boolean
  ) => {
    if (!firebaseIdentity || !workspaceSlug) {
      setEmailNotice('Alıcı listesini güncellemek için tekrar giriş yapın.');
      return;
    }

    const targetCustomers = customers.filter(
      (customer) => customer.id && customer.emailSubscribed !== emailSubscribed
    );

    if (targetCustomers.length === 0) {
      setEmailNotice(emailSubscribed ? 'Bu gruptaki alıcılar zaten listede aktif.' : 'Bu grupta çıkarılacak aktif alıcı yok.');
      return;
    }

    setRecipientActionBusy(emailSubscribed ? 'bulk-add' : 'bulk-remove');
    setEmailNotice(null);

    try {
      const result = await emailService.updateCustomerSubscriptions(
        firebaseIdentity,
        workspaceSlug,
        targetCustomers.map((customer) => customer.id),
        emailSubscribed
      );

      if (!emailSubscribed) {
        const removedEmailSet = new Set(targetCustomers.map((customer) => customer.email));
        setExcludedAudienceEmails((current) => current.filter((email) => !removedEmailSet.has(email)));
      }

      setEmailNotice(
        emailSubscribed
 `${result.updated} alıcı e-posta listesine eklendi.`
          : `${result.updated} alıcı e-posta listesinden çıkarıldı.`
      );
      await loadEmailData();
    } catch (error) {
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'Alıcı listesi güncellenemedi.'));
    } finally {
      setRecipientActionBusy(null);
    }
  };

  const handleCreateCampaign = async () => {
    if (!ensureMailMarketingAccess()) {
      return;
    }

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
        htmlContent: buildTemplateMatchedEmailHtml(selectedTemplate, {
          subject: campaignSubjectInput.trim(),
          description: campaignDescriptionInput.trim(),
          imageUrl: campaignImageUrlInput.trim(),
          textContent: campaignTextInput.trim(),
          actionUrl: publicGalleryLink,
          cafeName: settings.cafeName,
        }),
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
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'E-posta gönderimi başlatılamadı.'));
    } finally {
      setEmailActionBusy(false);
    }
  };

  const closeCampaignComposer = () => {
    setCampaignComposerMode('closed');
    setCampaignComposerPurpose('website');
    setSelectedCampaign(null);
    setOpenCampaignActionId(null);
    setCampaignActionMenuPosition(null);
  };

  const openCreateCampaignComposer = () => {
    const defaultTemplate = EMAIL_TEMPLATES[0];
    setOpenCampaignActionId(null);
    setCampaignActionMenuPosition(null);
    setCampaignComposerPurpose('website');
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

  const buildMarketingEmailDraft = (sourceCampaign?: AdminCampaign | null, template: EmailTemplatePreset = selectedTemplate) => {
    const cafeName = settings.cafeName || DEFAULT_CAFE_NAME;

    if (!sourceCampaign) {
      return {
        subject: template.subject,
        description: template.title,
        imageUrl: template.imageUrl || '',
        textContent: template.textContent,
      };
    }

    const sourceDescription = (sourceCampaign.description || sourceCampaign.textContent || '').trim();
    const shortDescription = sourceDescription || 'Kafemizdeki güncel kampanyayı sizinle paylaşmak istiyoruz.';
    const subject = `${sourceCampaign.subject} | ${cafeName}`;
    const textContent = [
      'Merhaba,',
      `${cafeName} olarak web sitemizdeki "${sourceCampaign.subject}" kampanyasını e-posta listemizle paylaşıyoruz.`,
      shortDescription,
      `Kampanyayı incelemek ve kafe sayfasına gitmek için: ${publicGalleryLink}`,
      'Görüşmek üzere,',
      cafeName,
    ].join('\n\n');

    return {
      subject,
      description: shortDescription,
      imageUrl: sourceCampaign.imageUrl || '',
      textContent: textContent || template.textContent,
    };
  };

  const openMarketingEmailComposer = (templateKey?: string) => {
    if (!ensureMailMarketingAccess()) {
      return;
    }

    const sourceCampaign = selectedMarketingSourceCampaign;

    const template = availableEmailTemplates.find((item) => item.key === templateKey) ?? selectedTemplate;
    const draft = buildMarketingEmailDraft(templateKey ? null : sourceCampaign, template);

    setOpenCampaignActionId(null);
    setCampaignActionMenuPosition(null);
    setCampaignComposerPurpose('email');
    setSelectedCampaign(null);
    setSelectedTemplateKey(template.key);
    setCampaignSubjectInput(draft.subject);
    setCampaignDescriptionInput(draft.description);
    setCampaignImageUrlInput(draft.imageUrl);
    setCampaignImageFileName(getFileNameFromUrl(draft.imageUrl));
    setCampaignTextInput(draft.textContent);
    setCampaignStartDate('');
    setCampaignEndDate('');
    setCampaignTag(normalizeCampaignCategoryValue(sourceCampaign?.tag));
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

  const openEmailTemplateEditor = (template?: EmailTemplatePreset) => {
    if (!ensureMailMarketingAccess()) {
      return;
    }

    setEditingTemplate(template || null);
    setTemplateForm({
      title: template?.title || '',
      subject: template?.subject || '',
      description: template?.description || '',
      category: template?.category || 'Kampanya',
      imageUrl: template?.imageUrl || '',
      ctaLabel: template?.ctaLabel || 'Kullan',
      textContent: template?.textContent || '',
      tone: template?.tone || 'dark',
    });
    setTemplateEditorOpen(true);
  };

  const handleSaveEmailTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ensureMailMarketingAccess()) {
      return;
    }

    if (!firebaseIdentity || !workspaceSlug) {
      setEmailNotice('Şablon kaydetmek için tekrar giriş yapın.');
      return;
    }

    if (!templateForm.title.trim() || !templateForm.subject.trim() || !templateForm.textContent.trim()) {
      setEmailNotice('Şablon adı, konu satırı ve mesaj metni zorunludur.');
      return;
    }

    const busyKey = editingTemplate?.id ? `save-${editingTemplate.id}` : 'create-template';
    setTemplateActionBusy(busyKey);
    setEmailNotice(null);

    try {
      if (editingTemplate?.id) {
        await emailService.updateEmailTemplate(firebaseIdentity, workspaceSlug, editingTemplate.id, templateForm);
        setEmailNotice('Şablon güncellendi.');
      } else {
        await emailService.createEmailTemplate(firebaseIdentity, workspaceSlug, templateForm);
        setEmailNotice('Yeni e-posta şablonu oluşturuldu.');
      }

      setTemplateEditorOpen(false);
      setEditingTemplate(null);
      await loadEmailTemplates();
    } catch (error) {
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'Şablon kaydedilemedi.'));
    } finally {
      setTemplateActionBusy(null);
    }
  };

  const handleUseEmailTemplate = async (template: EmailTemplatePreset) => {
    if (!ensureMailMarketingAccess()) {
      return;
    }

    setTemplateActionBusy(`use-${template.key}`);
    setEmailNotice(null);

    try {
      if (firebaseIdentity && workspaceSlug && template.id) {
        await emailService.useEmailTemplate(firebaseIdentity, workspaceSlug, template.id);
      }

      setSelectedTemplateKey(template.key);
      openAdminView('marketing');
      openMarketingEmailComposer(template.key);
    } catch (error) {
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'Şablon kullanılamadı.'));
    } finally {
      setTemplateActionBusy(null);
    }
  };

  const handleArchiveEmailTemplate = async (template: EmailTemplatePreset) => {
    if (!ensureMailMarketingAccess()) {
      return;
    }

    if (!firebaseIdentity || !workspaceSlug || !template.id) {
      setEmailNotice('Bu şablon henüz arşivlenemiyor.');
      return;
    }

    const confirmation = window.confirm(`${template.title} şablonunu arşivlemek istiyor musunuz?`);
    if (!confirmation) {
      return;
    }

    setTemplateActionBusy(`archive-${template.key}`);
    setEmailNotice(null);

    try {
      await emailService.archiveEmailTemplate(firebaseIdentity, workspaceSlug, template.id);
      setEmailNotice('Şablon arşivlendi.');
      if (emailTemplateRows.length <= 1 && templatePage > 1) {
        setTemplatePage((page) => Math.max(1, page - 1));
      } else {
        await loadEmailTemplates();
      }
    } catch (error) {
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'Şablon arşivlenemedi.'));
    } finally {
      setTemplateActionBusy(null);
    }
  };

  const openCampaignDetail = async (campaign: AdminCampaign) => {
    setOpenCampaignActionId(null);
    setCampaignActionMenuPosition(null);
    setCampaignComposerPurpose('website');
    setSelectedCampaign(campaign);
    setCampaignSubjectInput(campaign.subject);
    setCampaignDescriptionInput(campaign.description || '');
    setCampaignImageUrlInput(campaign.imageUrl || '');
    setCampaignImageFileName(getFileNameFromUrl(campaign.imageUrl || ''));
    setCampaignTextInput(campaign.textContent);
    setCampaignStartDate('');
    setCampaignEndDate('');
    setCampaignTag(normalizeCampaignCategoryValue(campaign.tag));
    setCampaignSchedule(campaign.scheduledAt ? 'tomorrow-morning' : SEND_TIME_OPTIONS[0].value);
    setCampaignComposerMode('detail');
  };

  const openCampaignEdit = (campaign: AdminCampaign) => {
    setOpenCampaignActionId(null);
    setCampaignActionMenuPosition(null);
    setCampaignComposerPurpose('website');
    setSelectedCampaign(campaign);
    setCampaignSubjectInput(campaign.subject);
    setCampaignDescriptionInput(campaign.description || '');
    setCampaignImageUrlInput(campaign.imageUrl || '');
    setCampaignImageFileName(getFileNameFromUrl(campaign.imageUrl || ''));
    setCampaignTextInput(campaign.textContent);
    setCampaignStartDate('');
    setCampaignEndDate('');
    setCampaignTag(normalizeCampaignCategoryValue(campaign.tag));
    setCampaignSchedule(campaign.scheduledAt ? 'tomorrow-morning' : SEND_TIME_OPTIONS[0].value);
    setEmailNotice(null);
    setCampaignComposerMode('edit');
  };

  const openEmailCampaignDetail = (campaign: EmailCampaign) => {
    if (!ensureMailMarketingAccess()) {
      return;
    }

    setOpenCampaignActionId(null);
    setCampaignActionMenuPosition(null);
    setCampaignComposerPurpose('email');
    setSelectedCampaign(campaign as AdminCampaign);
    setCampaignSubjectInput(campaign.subject);
    setCampaignDescriptionInput(campaign.description || '');
    setCampaignImageUrlInput(campaign.imageUrl || '');
    setCampaignImageFileName(getFileNameFromUrl(campaign.imageUrl || ''));
    setCampaignTextInput(campaign.textContent);
    setCampaignStartDate('');
    setCampaignEndDate('');
    setCampaignTag('promosyon');
    setCampaignSchedule(campaign.scheduledAt ? 'tomorrow-morning' : SEND_TIME_OPTIONS[0].value);
    setSelectedAudienceKey('all');
    setExcludedAudienceEmails([]);
    setEmailNotice(null);
    setCampaignComposerMode('detail');

    if (firebaseIdentity) {
      void emailService.getCampaign(firebaseIdentity, campaign.id)
        .then((campaignDetail) => {
          setSelectedCampaign((current) => (
            current?.id === campaign.id ? campaignDetail as AdminCampaign : current
          ));
        })
        .catch((error) => {
          console.error('Email campaign detail load failed:', error);
        });
    }
  };

  const openEmailCampaignEdit = (campaign: AdminCampaign) => {
    if (!ensureMailMarketingAccess()) {
      return;
    }

    setCampaignComposerPurpose('email');
    setSelectedCampaign(campaign);
    setCampaignSubjectInput(campaign.subject);
    setCampaignDescriptionInput(campaign.description || '');
    setCampaignImageUrlInput(campaign.imageUrl || '');
    setCampaignImageFileName(getFileNameFromUrl(campaign.imageUrl || ''));
    setCampaignTextInput(campaign.textContent);
    setCampaignSchedule(campaign.scheduledAt ? 'tomorrow-morning' : SEND_TIME_OPTIONS[0].value);
    setSelectedAudienceKey('all');
    setExcludedAudienceEmails([]);
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
      htmlContent: campaignComposerPurpose === 'email'
 buildTemplateMatchedEmailHtml(selectedTemplate, {
            subject: campaignSubjectInput.trim(),
            description: campaignDescriptionInput.trim(),
            imageUrl: campaignImageUrlInput.trim(),
            textContent: campaignTextInput.trim(),
            actionUrl: publicGalleryLink,
            cafeName: settings.cafeName,
          })
        : buildCampaignHtmlContent(
            campaignTextInput,
            campaignDescriptionInput.trim(),
            campaignImageUrlInput.trim(),
            {
              cafeName: settings.cafeName,
              actionUrl: undefined,
              actionLabel: 'Kampanyayı İncele',
              preheader: campaignDescriptionInput.trim() || campaignSubjectInput.trim(),
            }
          ),
      textContent: campaignTextInput.trim(),
      scheduledAt: scheduledDate ? scheduledDate.toISOString() : null,
      sourceCampaignId: campaignComposerPurpose === 'email' ? selectedMarketingSourceCampaign?.id ? null : null,
      sourceCampaignTitle: campaignComposerPurpose === 'email' ? selectedMarketingSourceCampaign?.subject ? null : null,
      sourceCampaignUrl: campaignComposerPurpose === 'email' ? publicGalleryLink : null,
      templateKey: campaignComposerPurpose === 'email' ? selectedTemplateKey : null,
    };
  };

  const handleSaveEmailCampaignDraft = async () => {
    if (!ensureMailMarketingAccess()) {
      return null;
    }

    if (!firebaseIdentity || !campaignSubjectInput.trim() || !campaignTextInput.trim()) {
      setEmailNotice('Konu ve mesaj metni zorunludur.');
      return null;
    }

    setEmailActionBusy(true);
    setEmailNotice(null);

    try {
      const payload = {
        ...getCampaignComposerPayload(true),
        scheduledAt: null,
      };
      const campaign =
        campaignComposerMode === 'edit' && selectedCampaign
 await emailService.updateCampaign(firebaseIdentity, selectedCampaign.id, payload)
          : await emailService.createCampaign(firebaseIdentity, workspaceSlug, payload);

      setEmailNotice('E-posta kampanyası taslak olarak kaydedildi.');
      await loadEmailData();
      closeCampaignComposer();
      return campaign;
    } catch (error) {
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'E-posta kampanyası kaydedilemedi.'));
      return null;
    } finally {
      setEmailActionBusy(false);
    }
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
 doc(db, 'cafes', workspaceSlug, 'campaigns', selectedCampaign.id)
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
        createdAt: selectedCampaign?.createdAt || nowIso,
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
 'Kampanya yayınlandı.'
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
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'Kampanya kaydedilemedi.'));
      return null;
    } finally {
      setEmailActionBusy(false);
    }
  };

  const handleSaveCampaignAndOpenMarketing = async () => {
    if (!ensureMailMarketingAccess()) {
      return;
    }

    const campaign = await handleSaveCampaignDraft();
    if (!campaign) {
      return;
    }

    setCampaignSubjectInput(campaign.subject);
    setCampaignDescriptionInput(campaign.description || '');
    setCampaignImageUrlInput(campaign.imageUrl || '');
    setCampaignImageFileName(getFileNameFromUrl(campaign.imageUrl || ''));
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
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'Görsel yüklenemedi.'));
    } finally {
      setCampaignImageUploadBusy(false);
      event.target.value = '';
    }
  };

  const handleSendExistingCampaign = async (campaign: AdminCampaign) => {
    if (!ensureMailMarketingAccess()) {
      return;
    }

    const existingRecipientCount = getCampaignRecipientCount(campaign);

    if (!firebaseIdentity ? (!selectedAudienceEmails.length && existingRecipientCount === 0)) {
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
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'Kampanya gönderimi başlatılamadı.'));
    } finally {
      setEmailActionBusy(false);
    }
  };

  const handleSendCampaignFromComposer = async () => {
    if (!ensureMailMarketingAccess()) {
      return;
    }

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
 await emailService.updateCampaign(firebaseIdentity, selectedCampaign.id, payload)
          : await emailService.createCampaign(firebaseIdentity, workspaceSlug, payload);

      await emailService.sendCampaign(firebaseIdentity, campaign.id, selectedAudienceEmails);
      setEmailNotice(`${selectedAudienceEmails.length || getCampaignRecipientCount(campaign)} misafir için kampanya kuyruğa alındı.`);
      await loadEmailData();
      closeCampaignComposer();
    } catch (error) {
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'Kampanya gönderimi başlatılamadı.'));
    } finally {
      setEmailActionBusy(false);
    }
  };

  const handleScheduleCampaignFromComposer = async () => {
    if (!ensureMailMarketingAccess()) {
      return;
    }

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
 await emailService.updateCampaign(firebaseIdentity, selectedCampaign.id, payload)
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
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'Kampanya zamanlanamadı.'));
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
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'Kampanya silinemedi.'));
    } finally {
      setEmailActionBusy(false);
    }
  };

  const handleDeleteEmailCampaign = async (campaign: AdminCampaign) => {
    if (!ensureMailMarketingAccess()) {
      return;
    }

    if (!firebaseIdentity) {
      return;
    }

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`"${campaign.subject}" e-posta kampanyasını silmek istiyor musunuz?`);
      if (!confirmed) {
        return;
      }
    }

    setEmailActionBusy(true);
    setEmailNotice(null);

    try {
      await emailService.deleteCampaign(firebaseIdentity, campaign.id);
      setEmailNotice('E-posta kampanyası silindi.');
      await loadEmailData();
      closeCampaignComposer();
    } catch (error) {
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'E-posta kampanyası silinemedi.'));
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
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'Kampanya yayından kaldırılamadı.'));
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
      setEmailNotice(getAdminFriendlyErrorMessage(error, 'Kampanya yayına alınamadı.'));
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

  const handleCreateCafeWorkspace = async () => {
    if (!canCreateCafeWorkspaces) {
      showToast('Bu hesap için yeni kafe oluşturma yetkisi yok. Super Admin kafe sahibi e-postasını yetki listesine eklemeli.', 'error');
      return null;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      showToast('Google oturumu bulunamadı. Lütfen tekrar giriş yapın.', 'error');
      return null;
    }

    const nextWorkspaceSlug =
      normalizeOptionalCafeSlug(workspaceSlugDraft) ||
      normalizeOptionalCafeSlug(settings.cafeName);

    if (!nextWorkspaceSlug) {
      showToast('Kafe kodu boş olamaz.', 'error');
      return null;
    }

    setIsCreatingWorkspace(true);

    try {
      const tokenResult = await currentUser.getIdTokenResult(true);
      const authenticatedEmail = normalizeAccessEmail(tokenResult.claims.email ?? currentUser.email || userEmail);

      if (!authenticatedEmail) {
        showToast('Google hesabı doğrulanamadı. Lütfen tekrar giriş yapın.', 'error');
        return null;
      }

      if (tokenResult.claims.email_verified !== true && !isLocalDevelopmentHost) {
        showToast('Google hesabınız doğrulanmış görünmüyor. Lütfen doğrulanmış hesapla tekrar giriş yapın.', 'error');
        return null;
      }

      if (!isLocalDevelopmentHost && !canAccessCafeWorkspace(authenticatedEmail, nextWorkspaceSlug)) {
        showToast('Bu kafe kodu bu hesap için yetki listesinde tanımlı değil.', 'error');
        return null;
      }

      const targetRef = doc(db, 'cafes', nextWorkspaceSlug);
      const targetSnapshot = await getDoc(targetRef);

      if (targetSnapshot.exists()) {
        selectOwnedWorkspace(nextWorkspaceSlug);
        setNewWorkspaceNameDraft('');
        showToast('Bu kafe ortamı zaten kayıtlı. Seçili hale getirildi.', 'info');
        return nextWorkspaceSlug;
      }

      const requestedCafeName = normalizeLegacyText(newWorkspaceNameDraft, '');

      if (!requestedCafeName) {
        showToast('Yeni kafe oluşturmak için kafe adını yazın.', 'error');
        return null;
      }

      const effectiveAdminEmails: string[] = [];
      const normalizedSettings = normalizeAdminSettings(
        {
          cafeName: requestedCafeName,
          primaryColor: settings.primaryColor || settings.accentColor || DEFAULT_ACCENT_COLOR,
          secondaryColor: settings.secondaryColor || DEFAULT_ADMIN_SETTINGS.secondaryColor,
          darkMode: settings.darkMode,
          accentColor: settings.primaryColor || settings.accentColor || DEFAULT_ACCENT_COLOR,
          handwritingFont: normalizeHandwritingFont(settings.handwritingFont),
          campaignTarget: Math.max(1, settings.campaignTarget || DEFAULT_CAMPAIGN_TARGET),
          campaignReward: normalizeLegacyText(settings.campaignReward, DEFAULT_CAMPAIGN_REWARD),
          packageKey: normalizePackageKey(settings.packageKey),
          billingPlan: normalizePackageKey(settings.billingPlan),
          adminEmails: effectiveAdminEmails,
          domains: { ...settings.domains, publicSlug: nextWorkspaceSlug },
        },
        nextWorkspaceSlug
      );
      const activeTemplateToSave = isAllowedStoryTemplateUrl(activeStoryTemplateUrl)
 normalizeStoryTemplateUrl(activeStoryTemplateUrl)
        : null;

      await setDoc(targetRef, {
        cafeSlug: nextWorkspaceSlug,
        cafeName: normalizedSettings.cafeName,
        accentColor: normalizedSettings.accentColor || DEFAULT_ACCENT_COLOR,
        handwritingFont: normalizeHandwritingFont(normalizedSettings.handwritingFont),
        campaignTarget: Math.max(1, normalizedSettings.campaignTarget),
        campaignReward: normalizeLegacyText(normalizedSettings.campaignReward, DEFAULT_CAMPAIGN_REWARD),
        ownerEmail: authenticatedEmail,
        packageKey: normalizePackageKey(normalizedSettings.packageKey),
        adminEmails: effectiveAdminEmails,
        ...(activeTemplateToSave ? { activeStoryTemplateUrl: activeTemplateToSave } : {}),
      });

      setWorkspaceSlug(nextWorkspaceSlug);
      setWorkspaceSlugDraft(nextWorkspaceSlug);
      onCafeSlugChange(nextWorkspaceSlug);
      setWorkspaceOwnerEmail(authenticatedEmail);
      setWorkspaceAdminEmails(effectiveAdminEmails);
      setSettings(normalizedSettings);
      setSavedSettings(normalizedSettings);
      setNewWorkspaceNameDraft('');
      showToast(`Kafe ortamı oluşturuldu: /cafe/${nextWorkspaceSlug}`, 'success');
      return nextWorkspaceSlug;
    } catch (error) {
      console.error('Cafe workspace create failed:', error);
      showToast(getAdminFriendlyErrorMessage(error, 'Kafe ortamı oluşturulamadı.'), 'error');
      return null;
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleSave = async (overrideTemplateUrl?: string) => {
    if (!userEmail) {
      return null;
    }

    if (!canManageWorkspace) {
      showToast('Bu kafe panelini kaydetme yetkiniz yok.', 'error');
      return null;
    }

    if (overrideTemplateUrl && !isAllowedStoryTemplateUrl(overrideTemplateUrl)) {
      showToast('Bu story şablonu onaylı liste içinde değil.', 'error');
      return null;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      showToast('Google oturumu bulunamadı. Lütfen tekrar giriş yapın.', 'error');
      return null;
    }

    const nextWorkspaceSlug = effectiveWorkspaceSlug;
    let targetOwnerEmail = workspaceOwnerEmail;

    if (workspaceDraftChanged) {
      return handleCreateCafeWorkspace();
    }

    setIsSaving(true);

    try {
      const tokenResult = await currentUser.getIdTokenResult(true);
      const authenticatedEmail = normalizeAccessEmail(tokenResult.claims.email ?? currentUser.email || userEmail);

      if (!authenticatedEmail) {
        showToast('Google hesabı doğrulanamadı. Lütfen tekrar giriş yapın.', 'error');
        return null;
      }

      if (tokenResult.claims.email_verified !== true) {
        showToast('Google hesabınız doğrulanmış görünmüyor. Lütfen doğrulanmış hesapla tekrar giriş yapın.', 'error');
        return null;
      }

      if (!isLocalDevelopmentHost && !canAccessCafeWorkspace(authenticatedEmail, nextWorkspaceSlug)) {
        showToast('Bu kafe panelini kaydetme yetkiniz yok.', 'error');
        return null;
      }

      if (nextWorkspaceSlug !== workspaceSlug) {
        const targetSnapshot = await getDoc(doc(db, 'cafes', nextWorkspaceSlug));
        if (targetSnapshot.exists()) {
          const targetData = targetSnapshot.data();
          targetOwnerEmail = normalizeLegacyText(targetData.ownerEmail, '');
        } else {
          targetOwnerEmail = null;
        }
      }

      const effectiveAdminEmails = Array.from(
        new Set(
          [...workspaceAdminEmails, ...(canManageSettingsAdmins ? settings.adminEmails : savedSettings.adminEmails)]
            .map((entry) => normalizeAccessEmail(entry))
            .filter(Boolean)
        )
      );
      const normalizedSettings = normalizeAdminSettings(
        {
          ...settings,
          cafeName: normalizeLegacyText(settings.cafeName, DEFAULT_CAFE_NAME),
          primaryColor: settings.primaryColor || settings.accentColor || DEFAULT_ACCENT_COLOR,
          accentColor: settings.primaryColor || settings.accentColor || DEFAULT_ACCENT_COLOR,
          packageKey: normalizePackageKey(settings.packageKey),
          billingPlan: normalizePackageKey(settings.billingPlan),
          adminEmails: effectiveAdminEmails,
          domains: { ...settings.domains, publicSlug: nextWorkspaceSlug },
        },
        nextWorkspaceSlug
      );
      const settingsPayload = buildCafeSettingsPayload(normalizedSettings, nextWorkspaceSlug, effectiveAdminEmails);

      await emailService.updateCafeSettings(currentUser.uid, nextWorkspaceSlug, settingsPayload);

      const requestedTemplateUrl = overrideTemplateUrl !== undefined
 overrideTemplateUrl
        : activeStoryTemplateUrl;
      const activeTemplateToSave = isAllowedStoryTemplateUrl(requestedTemplateUrl)
 normalizeStoryTemplateUrl(requestedTemplateUrl)
        : null;

      const publicCafeSettingsPayload = {
        cafeSlug: nextWorkspaceSlug,
        cafeName: normalizedSettings.cafeName,
        accentColor: normalizedSettings.accentColor || DEFAULT_ACCENT_COLOR,
        handwritingFont: normalizeHandwritingFont(normalizedSettings.handwritingFont),
        campaignTarget: Math.max(1, normalizedSettings.campaignTarget),
        campaignReward: normalizeLegacyText(normalizedSettings.campaignReward, DEFAULT_CAMPAIGN_REWARD),
        ownerEmail: normalizeAccessEmail(targetOwnerEmail || authenticatedEmail),
        packageKey: normalizePackageKey(normalizedSettings.packageKey),
        adminEmails: effectiveAdminEmails,
        ...(activeTemplateToSave ? { activeStoryTemplateUrl: activeTemplateToSave } : {})
      };

      await setDoc(doc(db, 'cafes', nextWorkspaceSlug), publicCafeSettingsPayload, { merge: true });
      setWorkspaceSlug(nextWorkspaceSlug);
      setWorkspaceSlugDraft(nextWorkspaceSlug);
      onCafeSlugChange(nextWorkspaceSlug);
      setWorkspaceOwnerEmail(normalizeAccessEmail(targetOwnerEmail || authenticatedEmail));
      setWorkspaceAdminEmails(effectiveAdminEmails);
      setSettings(normalizedSettings);
      setSavedSettings(normalizedSettings);
      showToast(isOwnerPortal ? 'Kafe ortamı başarıyla oluşturuldu.' : 'Ayarlar başarıyla kaydedildi.', 'success');
      return nextWorkspaceSlug;
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast(getAdminFriendlyErrorMessage(error, 'Ayarlar kaydedilirken bir hata oluştu.'), 'error');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectStoryTemplate = async (template: (typeof STORY_TEMPLATES)[number]) => {
    if (!canManageWorkspace) {
      showToast('Bu kafe alanında story şablonu değiştirme yetkiniz yok.', 'error');
      return;
    }

    if (activeStoryTemplateUrl === template.url) {
      return;
    }

    setStoryTemplateSavingKey(template.key);

    ? try {
      const targetSlug = settingsDirty || workspaceDraftChanged
 await handleSave(template.url)
        : effectiveWorkspaceSlug;

      if (!targetSlug) {
        return;
      }

      if (!settingsDirty && !workspaceDraftChanged) {
        await updateDoc(doc(db, 'cafes', targetSlug), {
          activeStoryTemplateUrl: template.url,
        });
      }

      setActiveStoryTemplateUrl(template.url);
      showToast(`${template.name} story şablonu aktif edildi.`, 'success');
    } catch (error) {
      console.error('Story template save error:', error);
      showToast(getAdminFriendlyErrorMessage(error, 'Story şablonu kaydedilemedi.'), 'error');
    } finally {
      setStoryTemplateSavingKey(null);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast('Logo için PNG, JPG veya WEBP formatında bir görsel seçin.', 'error');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      showToast('Logo dosyası 4MB üzerinde olmamalıdır.', 'error');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      showToast('Logo yüklemek için Google oturumu gereklidir.', 'error');
      return;
    }

    setIsLogoUploading(true);

    try {
      const safeName = file.name.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase();
      const targetRef = storageRef(storage, `cafes/${effectiveWorkspaceSlug}/settings/logo-${Date.now()}-${safeName}`);
      const task = uploadBytesResumable(targetRef, file, {
        contentType: file.type,
        customMetadata: {
          uploaderUid: currentUser.uid,
          uploadedAt: new Date().toISOString(),
          cafeSlug: effectiveWorkspaceSlug,
          purpose: 'cafe-logo',
        },
      });

      await new Promise<void>((resolve, reject) => {
        task.on('state_changed', undefined, reject, () => resolve());
      });

      const logoUrl = await getDownloadURL(task.snapshot.ref);
      updateSettings({ logoUrl });
    } catch (error) {
      console.error('Logo upload failed:', error);
      showToast(getAdminFriendlyErrorMessage(error, 'Logo yüklenemedi.'), 'error');
    } finally {
      setIsLogoUploading(false);
    }
  };

  const handleExportCafeData = async () => {
    if (!firebaseIdentity || !workspaceSlug) {
      return;
    }

    setIsSettingsActionBusy(true);

    try {
      const reportBlob = await emailService.exportCafeSettingsData(firebaseIdentity, workspaceSlug, 'xlsx');
      const url = URL.createObjectURL(reportBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${workspaceSlug}-sharevibe-veriler.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      showToast(getAdminFriendlyErrorMessage(error, 'Veriler dışa aktarılamadı.'), 'error');
    } finally {
      setIsSettingsActionBusy(false);
    }
  };

  const handlePasswordResetRequest = async () => {
    if (!firebaseIdentity || !workspaceSlug) {
      return;
    }

    setIsSettingsActionBusy(true);

    try {
      const response = await emailService.requestSettingsPasswordReset(firebaseIdentity, workspaceSlug);
      showToast(response.message || 'Şifre işlemi başlatıldı.', 'success');
    } catch (error) {
      showToast(getAdminFriendlyErrorMessage(error, 'Şifre işlemi başlatılamadı.'), 'error');
    } finally {
      setIsSettingsActionBusy(false);
    }
  };

  const handleDeleteCafeAccount = async () => {
    if (!firebaseIdentity || !workspaceSlug || typeof window === 'undefined') {
      return;
    }

    if (!canManageSettingsAdmins) {
      showToast('Bu işlem yalnızca kafe sahibi tarafından yapılabilir.', 'error');
      return;
    }

    const confirmation = window.prompt(`Bu kafe alanı kalıcı olarak silinecek. Onaylamak için "${workspaceSlug}" yazın.`);
    if (confirmation !== workspaceSlug) {
      return;
    }

    setIsSettingsActionBusy(true);

    try {
      await emailService.deleteCafeSettingsAccount(firebaseIdentity, workspaceSlug, confirmation);
      await deleteDoc(doc(db, 'cafes', workspaceSlug)).catch(() => undefined);
      showToast('Kafe hesabı silindi.', 'success');
      setActiveView('panel');
    } catch (error) {
      showToast(getAdminFriendlyErrorMessage(error, 'Hesap silinemedi.'), 'error');
    } finally {
      setIsSettingsActionBusy(false);
    }
  };

  const handleOpenCafePage = async () => {
    if (!onOpenCafeEnvironment ? (isOwnerPortal && !canViewActiveWorkspace)) {
      return;
    }

    const targetSlug =
      settingsDirty || workspaceDraftChanged
 await handleSave()
        : effectiveWorkspaceSlug;

    if (targetSlug) {
      onOpenCafeEnvironment(targetSlug);
    }
  };

  const confirmDelete = async () => {
    if (!mediaToDelete) {
      return;
    }

    if (!canManageActiveWorkspace) {
      showToast('Yalnızca kendi kafe alanına ait içerikleri yönetebilirsin.', 'error');
      setMediaToDelete(null);
      return;
    }

    const target = mediaToDelete;
    setIsDeletingId(target.id);

    try {
      await deleteMediaRecord(target.id, target.url);
      invalidateSignedPhotoUrlCache(target.id);
      setMediaToDelete(null);
    } catch (error) {
      console.error('Admin media delete failed:', error);
      showToast('Anı silinirken bir hata oluştu.', 'error');
    } finally {
      setIsDeletingId(null);
    }
  };

  const applyDatePreset = useCallback((preset: DateRangePreset) => {
    setDateRange(createDateRange(preset));
    setHoveredChartIndex(null);
    setIsDateRangeOpen(false);
    setIsChartDateRangeOpen(false);
    setIsStatsDateRangeOpen(false);
    setIsStatsTrendMenuOpen(false);
    setHoveredStatsTrendIndex(null);
  }, []);

  const updateCustomDateRange = useCallback((field: 'start' | 'end', value: string) => {
    setDateRange((current) => ({
      ...current,
      preset: 'custom',
      [field]: value,
    }));
    setHoveredChartIndex(null);
    setHoveredStatsTrendIndex(null);
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
            setIsStatsDateRangeOpen(false);
          }}
        >
          Kapat
        </button>
      </div>
    </div>
  );
  const userRoleLabel = isOwnerPortal ? 'Kafe Sahibi' : isSuperAdmin ? 'Süper Admin' : 'Kafe Yöneticisi';

  const renderEmailCampaignReport = (campaign: AdminCampaign) => {
    const recipientTotal = getCampaignRecipientCount(campaign);
    const deliveredCount = Math.max(0, campaign.sentCount ?? 0);
    const failedCount = Math.max(0, campaign.failedCount ?? 0);
    const pendingCount = Math.max(0, recipientTotal - deliveredCount - failedCount);
    const openCount = getCampaignOpenCount(campaign);
    const clickCount = getCampaignClickCount(campaign);
    const deliveryRate = getPercent(deliveredCount, recipientTotal);
    const openRate = getPercent(openCount, deliveredCount);
    const clickRate = getPercent(clickCount, deliveredCount);
    const clickToOpenRate = getPercent(clickCount, openCount);
    const campaignUrl = getFirstUrlFromText(campaign.textContent) || getFirstUrlFromText(campaign.htmlContent);
    const recipientRows = campaign.recipients ? [];
    const reportCards = [
      { label: 'Gönderildi', value: deliveredCount, icon: SendHorizontal, tone: 'sent' },
      { label: 'Açıldı', value: openCount, icon: Eye, tone: 'open' },
      { label: 'Tıklandı', value: clickCount, icon: MousePointer2, tone: 'click' },
      { label: 'Başarısız', value: failedCount, icon: ShieldCheck, tone: 'failed' },
    ];
    const progressRows = [
      { label: 'Teslim edilen e-posta', value: deliveredCount, total: recipientTotal, rate: deliveryRate },
      { label: 'Maili açan alıcı', value: openCount, total: deliveredCount, rate: openRate },
      { label: 'Link veya butona tıklayan alıcı', value: clickCount, total: deliveredCount, rate: clickRate },
      { label: 'Açtıktan sonra tıklayan alıcı', value: clickCount, total: openCount, rate: clickToOpenRate },
    ];

    return (
      <div className="admin-email-report">
        <div className="admin-email-report-hero">
          <div>
            <span>Kampanya raporu</span>
            <h4>{campaign.subject}</h4>
            <p>Bu rapor gerçek gönderim kayıtlarına göre hazırlanır. Açılma ve tıklama verileri Brevo etkinliklerinden canlı olarak okunur.</p>
          </div>
          <div className="admin-email-report-status">
            <strong>{getCampaignStatusLabel(campaign.status)}</strong>
            <small>{campaign.sentAt ? formatCampaignDateTime(campaign.sentAt) : campaign.scheduledAt ? formatCampaignDateTime(campaign.scheduledAt) : 'Henüz gönderilmedi'}</small>
          </div>
        </div>
        <div className="admin-email-report-kpis">
          {reportCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`is-${item.tone}`}>
                <i><Icon className="h-4 w-4" /></i>
                <span>{item.label}</span>
                <strong>{formatCompactNumber(item.value)}</strong>
              </div>
            );
          })}
        </div>
        <div className="admin-email-report-grid">
          <section className="admin-email-report-panel">
            <div className="admin-email-report-panel-head">
              <div>
                <span>Performans özeti</span>
                <h4>Alıcıların davranışı</h4>
              </div>
              <strong>{formatPercent(openRate)} açılma</strong>
            </div>
            <div className="admin-email-progress-list">
              {progressRows.map((row) => (
                <div key={row.label}>
                  <div>
                    <span>{row.label}</span>
                    <strong>{formatCompactNumber(row.value)} / {formatCompactNumber(row.total)}</strong>
                  </div>
                  <b><i style={{ width: `${Math.min(100, Math.max(0, row.rate))}%` }} /></b>
                  <small>{formatPercent(row.rate)}</small>
                </div>
              ))}
            </div>
            <p className="admin-email-report-insight">
              {clickCount > 0
 'Bu kampanyada tıklama yapan her alıcı aynı zamanda açılma istatistiğine dahil edilir.'
                : 'Henüz tıklama yok. İlk tıklama geldiğinde açılma oranı da birlikte güncellenir.'}
            </p>
          </section>
          <section className="admin-email-report-panel admin-email-report-content">
            <div className="admin-email-report-panel-head">
              <div>
                <span>E-posta içeriği</span>
                <h4>Gönderilen mesaj</h4>
              </div>
              {campaignUrl ? (
                <a href={campaignUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Linki aç
                </a>
              ) : null}
            </div>
            {campaign.imageUrl ? (
              <img src={campaign.imageUrl} alt={campaign.subject} loading="lazy" decoding="async" />
            ) : null}
            {campaign.description ? <strong>{campaign.description}</strong> : null}
            <p>{campaign.textContent}</p>
          </section>
        </div>
        <section className="admin-email-report-panel">
          <div className="admin-email-report-panel-head">
            <div>
              <span>Alıcı durumu</span>
              <h4>Gönderim kayıtları</h4>
            </div>
            <strong>{formatCompactNumber(recipientTotal)} alıcı</strong>
          </div>
          {recipientRows.length > 0 ? (
            <div className="admin-email-report-recipient-table">
              {recipientRows.slice(0, 12).map((recipient) => (
                <div key={`${recipient.email}-${recipient.status}`}>
                  <span>{recipient.email}</span>
                  <strong>{getRecipientStatusLabel(recipient.status)}</strong>
                  <small>{recipient.sentAt ? formatCampaignDateTime(recipient.sentAt) : recipient.failureReason || 'Kayıt bekleniyor'}</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-email-report-empty">
              <Mail className="h-5 w-5" />
              <span>Detaylı alıcı listesi yükleniyor. Özet rakamlar yukarıdaki gerçek gönderim kayıtlarından alınır.</span>
            </div>
          )}
          {pendingCount > 0 ? (
            <p className="admin-email-report-insight">{formatCompactNumber(pendingCount)} alıcı hâlâ gönderim kuyruğunda bekliyor.</p>
          ) : null}
        </section>
      </div>
    );
  };

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
 'Tanımlı Google hesabınızla giriş yapın. Ardından kendi kafe çalışma alanınızı oluşturup ad, renk, font ve kampanya ayarlarınızı belirleyebilirsiniz.'
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
 'Bu Google hesabı kafe sahibi erişim listesinde yer almıyor. Yetkili hesapla giriş yapmanız gerekiyor.'
                : 'Bu kafe için yönetim izni bulunan kafe sahibi/yönetici hesabı ile giriş yapmanız gerekiyor.'}
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
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className={`admin-toast is-${toastMessage.tone}`}
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => setToastMessage(null)}
          >
            {toastMessage.tone === 'success' ? <Check className="h-4 w-4" /> : toastMessage.tone === 'error' ? <X className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <div className="admin-topbar-main">
            <button
              type="button"
              className="admin-topbar-menu-toggle"
              onClick={() => setIsMenuCollapsed((prev) => !prev)}
              aria-label={isMenuCollapsed ? 'Menüyü aç' : 'Menüyü kapat'}
              title={isMenuCollapsed ? 'Menüyü aç' : 'Menüyü kapat'}
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="admin-topbar-brand admin-brand-home"
              onClick={onBack}
              aria-label="ShareVibe ana sayfasina don"
              title="ShareVibe ana sayfasina don"
            >
              <BrandSignature compact subtitle={null} />
            </button>
            <div className="admin-topbar-copy">
              <span>{panelPill}</span>
              <h1>{panelTitle}</h1>
              {panelDescription ? <p>{panelDescription}</p> : null}
            </div>
          </div>

          <div className="admin-topbar-actions">
            {(settingsDirty || workspaceDraftChanged) && (
              <div className="admin-topbar-status is-dirty">
                <Sparkles className="w-4 h-4" />
                <span>Değişiklik var</span>
              </div>
            )}
            {onOpenCafeEnvironment ? (
              <button
                type="button"
                className="admin-topbar-cafe-link"
                onClick={() => void handleOpenCafePage()}
                disabled={isOwnerPortal && !canViewActiveWorkspace}
              >
                <ExternalLink className="h-4 w-4" />
                <span>Kafeyi Aç</span>
              </button>
            ) : null}
            <div ref={dateRangePopoverRef} className="admin-topbar-popover-wrap">
              <button
                type="button"
                className="admin-topbar-date"
                onClick={() => {
                  setIsDateRangeOpen((current) => !current);
                  setIsChartDateRangeOpen(false);
                  setIsStatsDateRangeOpen(false);
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
                  setIsStatsDateRangeOpen(false);
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
              disabled={isSaving || isCreatingWorkspace ? (!settingsDirty && !workspaceDraftChanged) || !canManageWorkspace}
              className="admin-topbar-save"
            >
              <Save className="w-4 h-4" />
              <span className="sm:hidden">Kaydet</span>
              <span className="hidden sm:inline">{isSaving ? isCreatingWorkspace ? 'Kaydediliyor...' : workspaceDraftChanged ? 'Kafe ortamını kaydet' : isOwnerPortal ? 'Kafe ortamını kaydet' : 'Kaydet'}</span>
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
            <button
              type="button"
              className={`admin-menu-toggle ${isMenuCollapsed ? '' : 'is-open'}`}
              onClick={() => setIsMenuCollapsed((current) => !current)}
              aria-label={isMenuCollapsed ? 'Menüyü aç' : 'Menüyü kapat'}
              aria-expanded={!isMenuCollapsed}
              title={isMenuCollapsed ? 'Menüyü aç' : 'Menüyü kapat'}
            >
              <Menu className="h-5 w-5" />
              <span className="admin-menu-toggle-copy">{isMenuCollapsed ? 'Aç' : 'Kapat'}</span>
            </button>
            <button
              type="button"
              className="admin-side-brand admin-side-brand-button"
              onClick={onBack}
              aria-label="ShareVibe ana sayfasina don"
              title="ShareVibe ana sayfasina don"
            >
              <span className="admin-side-brand-mark" aria-hidden="true">SV</span>
              <span className="admin-side-brand-copy">
                <strong>ShareVibe</strong>
                <span>Admin</span>
              </span>
            </button>
          </div>

          <div ref={sideCafeMenuRef} className="admin-side-cafe-wrap">
            <button
              type="button"
              className="admin-side-cafe"
              onClick={() => setIsWorkspaceSwitcherOpen((current) => !current)}
              aria-label="Kafe paneli değiştir"
              aria-expanded={isWorkspaceSwitcherOpen}
            >
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
              <div className="admin-side-cafe-copy">
                <strong>{settings.cafeName}</strong>
                <span>{ownedWorkspaces.length > 1 ? `${ownedWorkspaces.length} kafe paneli` : 'Kafe paneli'}</span>
              </div>
              <ChevronDown className={`admin-side-cafe-chevron h-4 w-4 ${isWorkspaceSwitcherOpen ? 'is-open' : ''}`} aria-hidden="true" />
            </button>
            <AnimatePresence>
              {isWorkspaceSwitcherOpen ? (
                <motion.div
                  className="admin-side-cafe-menu"
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                >
                  {ownedWorkspaces.length > 0 ? (
                    ownedWorkspaces.map((workspace) => (
                      <button
                        key={workspace.slug}
                        type="button"
                        className={workspace.slug === workspaceSlug ? 'is-active' : ''}
                        onClick={() => selectOwnedWorkspace(workspace.slug)}
                      >
                        <span>{workspace.cafeName}</span>
                        <small>/{workspace.slug}</small>
                      </button>
                    ))
                  ) : (
                    <div className="admin-side-cafe-empty">Henüz bağlı kafe yok</div>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <nav className="admin-side-nav" aria-label="Yönetim paneli sayfaları">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === activeView;
              const isTemplatesItem = item.key === 'templates';

              return (
                <React.Fragment key={item.key}>
                  <button
                    type="button"
                    onClick={() => openAdminView(item.key)}
                    className={`admin-side-link ${isActive ? 'is-active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    aria-expanded={isTemplatesItem ? isActive : undefined}
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
                  {isTemplatesItem && isActive ? (
                    <motion.div
                      className="admin-side-subnav"
                      initial={{ opacity: 0, height: 0, y: -4 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      <button type="button" className={templatesSubView === 'email' ? 'is-active' : ''} onClick={() => { setTemplatesSubView('email'); openAdminView('templates'); }}>
                        E-posta şablonları
                      </button>
                      <button type="button" className={templatesSubView === 'story' ? 'is-active' : ''} onClick={() => { setTemplatesSubView('story'); openAdminView('templates'); }}>
                        Story Şablonları
                      </button>
                    </motion.div>
                  ) : null}
                </React.Fragment>
              );
            })}
          </nav>

          <div className="admin-side-pro">
            <div className="admin-side-pro-icon">
              <Crown className="h-5 w-5" />
            </div>
            <div className="admin-side-pro-copy">
              <strong>{currentPackageMeta.title}</strong>
              <span>{pricingTableCount} masa · Ön ödeme {currentPackageQuote.setupPrepaymentLabel}</span>
            </div>
            <div className="admin-side-pro-track" aria-hidden="true">
              <span style={{ width: '100%' }} />
            </div>
            <button type="button" onClick={() => openAdminView('settings')}>
              Planı Güncelle
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
              <strong>{userProfile.name ? (userEmail ? userEmail.split('@')[0] : 'Kullanıcı')}</strong>
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
            {activeView !== 'stats' && activeView !== 'settings' ? (
              <div className="admin-page-hero">
                <div>
                  <span className="section-pill">{panelKicker}</span>
                  <h2>{panelTitle}</h2>
                  {panelDescription ? <p>{panelDescription}</p> : null}
                </div>
              </div>
            ) : null}

        <section className={`admin-settings-unified ${activeView === 'settings' ? '' : 'hidden'}`}>
          {workspaceAccessError ? (
            <div className="admin-settings-alert">{workspaceAccessError}</div>
          ) : null}

          {isSettingsBackendLoading ? <div className="admin-settings-loading">Ayarlar backend ile eşitleniyor...</div> : null}

          <div className="admin-settings-unified-grid">
            <motion.article
              className="admin-settings-card admin-settings-section admin-settings-user-profile"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0 }}
            >
              <div className="admin-settings-section-head">
                <span className="admin-settings-section-icon"><User className="h-5 w-5" /></span>
                <div>
                  <h3>Aktif Kullanıcı Profili</h3>
                  <p>Oturum açmış Google hesabınızın bilgileri.</p>
                </div>
              </div>
              <div className="admin-settings-section-body p-4">
                <div className="flex items-center gap-4 bg-[#1b120d]/40 border border-white/5 rounded-2xl p-4">
                  <div className="relative h-16 w-16 shrink-0 rounded-full overflow-hidden border border-white/10 bg-cafe-850 flex items-center justify-center text-xl font-bold text-cafe-100">
                    {userProfile.photoUrl ? (
                      <img src={userProfile.photoUrl} alt="Google Profile" className="h-full w-full object-cover" />
                    ) : (
                      <span>{(userProfile.name || userEmail || 'G').slice(0, 1).toLocaleUpperCase('tr')}</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-semibold text-cafe-50">{userProfile.name || 'Google Kullanıcısı'}</h4>
                    <p className="text-xs text-cafe-100/60">{userProfile.email || userEmail}</p>
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-green-500/10 text-green-400 border border-green-500/20 mt-1">
                      Google Hesabı Bağlı
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3.5 bg-[#1b120d]/20 border border-white/5 rounded-xl text-xs text-cafe-100/70 space-y-1.5">
                  <p><strong>ℹ️ Google ile Giriş Hakkında Bilgi:</strong></p>
                  <p>Sistem güvenliği için kimlik doğrulama işlemleri tamamen Google altyapısı üzerinden gerçekleştirilir. Şifre değiştirme, e-posta güncelleme veya hesap güvenliği ayarlarınızı yönetmek için Google Hesabım (Google Account Security) panelini ziyaret etmelisiniz.</p>
                </div>
              </div>
            </motion.article>

            {canShowCafeWorkspaces ? (
              <motion.article
                className="admin-settings-card admin-settings-section admin-settings-workspace-setup"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0 }}
              >
                <div className="admin-settings-section-head">
                  <span className="admin-settings-section-icon"><Globe2 className="h-5 w-5" /></span>
                  <div>
                    <h3>Kafe Ortamları</h3>
                    <p>{canCreateCafeWorkspaces ? 'Yetkili kafe sahibi hesabıyla yeni kafe adı ve koduyla ayrı bir panel oluşturun.' : 'Sahibi veya yöneticisi olduğunuz kafe panelleri burada ayrı ayrı görünür.'}</p>
                  </div>
                </div>
                <div className="admin-settings-section-body">
                  {ownedWorkspaces.length > 0 ? (
                    <div className="admin-settings-workspaces" aria-label="Kafe ortamları">
                      {ownedWorkspaces.map((workspace) => {
                        const isSelectedWorkspace = workspace.slug === workspaceSlug;
                        const isWorkspaceOwner = normalizeAccessEmail(workspace.ownerEmail) === normalizedUserEmail;
                        const isWorkspaceManager = workspace.adminEmails.some((email) => normalizeAccessEmail(email) === normalizedUserEmail);
                        const workspaceCanDelete = canDeleteOwnedWorkspace(workspace);
                        const managerCount = workspace.adminEmails.length;
                        const accessLabel = isSuperAdmin
 'Süper Admin'
                          : isWorkspaceOwner
 'Kafe sahibi'
                            : isWorkspaceManager
 'Yönetici'
                              : 'Panel erişimi';

                        return (
                          <article
                            key={workspace.slug}
                            className={`admin-settings-workspace-card ${isSelectedWorkspace ? 'is-selected' : ''}`}
                          >
                            <button
                              type="button"
                              className="admin-settings-workspace-card-main"
                              onClick={() => selectOwnedWorkspace(workspace.slug)}
                              aria-current={isSelectedWorkspace ? 'true' : undefined}
                            >
                              <span className="admin-settings-workspace-card-top">
                                <span className="admin-settings-workspace-title">
                                  <strong>{workspace.cafeName}</strong>
                                  <small>/{workspace.slug}</small>
                                </span>
                                <span className={`admin-settings-workspace-badge ${isSelectedWorkspace ? 'is-active' : ''}`}>
                                  {isSelectedWorkspace ? 'Seçili panel' : accessLabel}
                                </span>
                              </span>
                              <span className="admin-settings-workspace-meta">
                                <span>
                                  <Crown className="h-4 w-4" />
                                  <span>
                                    <em>Kafe sahibi</em>
                                    <strong>{workspace.ownerEmail || 'Sahip atanmadı'}</strong>
                                  </span>
                                </span>
                                <span>
                                  <Users className="h-4 w-4" />
                                  <span>
                                    <em>Yöneticiler</em>
                                    <strong>{managerCount > 0 ? `${managerCount} yönetici` : 'Yönetici yok'}</strong>
                                  </span>
                                </span>
                              </span>
                            </button>
                            <div className="admin-settings-workspace-actions">
                              <button
                                type="button"
                                className="admin-settings-workspace-open"
                                onClick={() => selectOwnedWorkspace(workspace.slug)}
                              >
                                <ExternalLink className="h-4 w-4" />
                                Paneli Aç
                              </button>
                              {workspaceCanDelete ? (
                                <button
                                  type="button"
                                  className="admin-settings-workspace-delete"
                                  disabled={Boolean(deletingWorkspaceSlug)}
                                  onClick={() => {
                                    void handleDeleteOwnedWorkspace(workspace.slug);
                                  }}
                                  title="Kafe ortamını sil"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  {deletingWorkspaceSlug === workspace.slug ? 'Siliniyor...' : 'Sil'}
                                </button>
                              ) : (
                                <span className="admin-settings-workspace-locked" title="Kafe ortamını yalnızca sahibi veya Super Admin silebilir.">
                                  <Lock className="h-4 w-4" />
                                  Sahibi silebilir
                                </span>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="admin-settings-alert">{canCreateCafeWorkspaces ? 'Bu hesaba bağlı kayıtlı kafe ortamı bulunmuyor. Aşağıdan ilk kafenizi oluşturabilirsiniz.' : 'Bu hesaba bağlı kayıtlı kafe ortamı bulunmuyor.'}</div>
                  )}

                  {canCreateCafeWorkspaces ? (
                    <div className="admin-settings-workspace-form">
                      <label className="admin-settings-field">
                        <span>Yeni kafe adı</span>
                        <input
                          value={newWorkspaceNameDraft}
                          onChange={(event) => {
                            const nextName = event.target.value;
                            const suggestedSlug = normalizeOptionalCafeSlug(nextName);

                            setNewWorkspaceNameDraft(nextName);
                            if (suggestedSlug && (!workspaceDraftChanged || workspaceSlugDraft === workspaceSlug)) {
                              setWorkspaceSlugDraft(suggestedSlug);
                            }
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              if (workspaceDraftChanged) {
                                void handleCreateCafeWorkspace();
                              }
                            }
                          }}
                          placeholder="Örn. Monarch Coffee"
                        />
                      </label>
                      <label className="admin-settings-field">
                        <span>Kafe kodu</span>
                        <input
                          value={workspaceSlugDraft}
                          onChange={(event) => setWorkspaceSlugDraft(normalizeCafeSlug(event.target.value, ''))}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              if (workspaceDraftChanged) {
                                void handleCreateCafeWorkspace();
                              }
                            }
                          }}
                          placeholder="ornek-kafe"
                          inputMode="url"
                        />
                      </label>
                      <button
                        type="button"
                        className="admin-settings-workspace-suggest"
                        disabled={isCreatingWorkspace || isSaving}
                        onClick={() => {
                          if (workspaceDraftChanged) {
                            void handleCreateCafeWorkspace();
                            return;
                          }

                          const suggestedSlug =
                            normalizeOptionalCafeSlug(newWorkspaceNameDraft) ||
                            normalizeOptionalCafeSlug(settings.cafeName) ||
                            normalizeOptionalCafeSlug(workspaceSlugDraft) ||
                            DEFAULT_CAFE_SLUG;
                          setWorkspaceSlugDraft(suggestedSlug);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        {isCreatingWorkspace ? 'Oluşturuluyor...' : workspaceDraftChanged ? 'Kafe Oluştur' : 'Kod öner'}
                      </button>
                    </div>
                  ) : (
                    <div className="admin-settings-alert">Yeni kafe oluşturmak için bu e-posta Super Admin tarafından kafe sahibi yetki listesine eklenmelidir.</div>
                  )}

                  <div className="admin-settings-workspace-link">
                    <Link2 className="h-4 w-4" />
                    <span>/cafe/{effectiveWorkspaceSlug}</span>
                  </div>

                  {canCreateCafeWorkspaces && workspaceDraftChanged ? (
                    <div className="admin-settings-alert">
                      Sağdaki düğmeye bastığınızda yeni kafe adıyla ayrı bir panel oluşturulur ve sayfa /cafe/{effectiveWorkspaceSlug} adresinden açılır.
                    </div>
                  ) : null}
                </div>
              </motion.article>
            ) : null}

            {canShowOwnerAccessPanel ? (
              <motion.article
                className="admin-settings-card admin-settings-section"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0.04 }}
              >
                <div className="admin-settings-section-head">
                  <span className="admin-settings-section-icon"><ShieldCheck className="h-5 w-5" /></span>
                  <div>
                    <h3>Kafe Sahibi Yetkileri</h3>
                    <p>Yeni kafe ortamı yalnızca bu listede yetki verilen kafe sahibi e-postaları ile oluşturulabilir.</p>
                  </div>
                </div>
                <div className="admin-settings-section-body">
                  <div className="admin-manager-list">
                    {ownerAccessRows.length > 0 ? (
                      ownerAccessRows.map((entry) => (
                        <div key={entry.email} className="admin-manager-row admin-owner-access-row">
                          <span className="admin-manager-row-copy">
                            <UserPlus className="h-4 w-4" />
                            <span>
                              <strong>{entry.email}</strong>
                              <small>
                                {entry.ownedCafes.length > 0
                                  ? `Sahibi olduğu kafeler: ${entry.ownedCafes.map((cafe) => `${cafe.cafeName} /${cafe.slug}`).join(', ')}`
                                  : 'Henüz bir kafenin sahibi değil.'}
                              </small>
                              <small>{entry.isAllowed ? 'Yeni kafe oluşturma yetkisi aktif.' : 'Yeni kafe oluşturma yetkisi yok.'}</small>
                            </span>
                          </span>
                          {entry.isAllowed ? (
                            <button
                              type="button"
                              onClick={() => void handleRemoveOwnerAccessEmail(entry.email)}
                              disabled={ownerAccessActionBusy === entry.email}
                              aria-label={`${entry.email} kafe sahibi yetkisini kaldır`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="admin-settings-readonly">
                        <span>Kafe sahibi yetkisi verilmiş e-posta yok</span>
                        <strong>Super Adminler yeni kafe sahibi e-postasını aşağıdan ekleyebilir.</strong>
                      </div>
                    )}
                  </div>
                  <div className="admin-manager-add">
                    <label className="admin-settings-field">
                      <span>Yeni kafe sahibi e-postası</span>
                      <input
                        value={newOwnerAccessEmail}
                        placeholder="sahip@ornek.com"
                        onChange={(event) => setNewOwnerAccessEmail(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleAddOwnerAccessEmail();
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleAddOwnerAccessEmail()}
                      disabled={Boolean(ownerAccessActionBusy) || !isValidOwnerAccessEmail(normalizeAccessEmail(newOwnerAccessEmail))}
                    >
                      <Plus className="h-4 w-4" />
                      Yetki Ver
                    </button>
                  </div>
                </div>
              </motion.article>
            ) : null}

            {/* ─── Kafe Profili ─── */}
            {canShowOwnerAccessPanel ? (
              <motion.article
                className="admin-settings-card admin-settings-section"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
              >
                <div className="admin-settings-section-head">
                  <span className="admin-settings-section-icon"><ShieldCheck className="h-5 w-5" /></span>
                  <div>
                    <h3>Yetki Yönetimi</h3>
                    <p>Super Owner, Admin / Owner ve Manager e-postalarını kod yazmadan yönetin. Güvenlik kararı backend ve Firebase rules tarafından uygulanır.</p>
                  </div>
                </div>
                <div className="admin-settings-section-body">
                  {accessPolicyNotice ? (
                    <div className="admin-settings-alert">{accessPolicyNotice}</div>
                  ) : null}

                  <div className="admin-manager-list">
                    {managedAccessAssignments.length > 0 ? (
                      ? managedAccessAssignments.map((assignment) => {
                        const roleLabel = assignment.role === 'super_owner'
 'Super Owner'
                          : assignment.role === 'owner'
 'Admin / Owner'
                            : 'Manager';
                        const cafeLabel = assignment.role === 'super_owner'
 'Tüm kafeler'
                          : assignment.cafeIds.length > 0
 ? assignment.cafeIds.join(', ')
                            : 'Cafe atanmamış';

                        return (
                          <div key={assignment.email} className="admin-manager-row admin-owner-access-row">
                            <span className="admin-manager-row-copy">
                              {assignment.role === 'super_owner' ? <Crown className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                              <span>
                                <strong>{assignment.email}</strong>
                                <small>{roleLabel} · {cafeLabel}</small>
                              </span>
                            </span>
                            <span className="admin-side-user-actions">
                              <button
                                type="button"
                                onClick={() => void handleSyncAccessClaims(assignment.email)}
                                disabled={isAccessClaimsSyncing}
                                aria-label={`${assignment.email} custom claims senkronize et`}
                                title="Custom claims senkronize et"
                              >
                                <RotateCw className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleRemoveAccessAssignment(assignment.email)}
                                disabled={isAccessPolicySaving || assignment.email === normalizedUserEmail}
                                aria-label={`${assignment.email} yönetim yetkisini kaldır`}
                                title={assignment.email === normalizedUserEmail ? 'Kendi yetkinizi panelden kaldıramazsınız.' : 'Yetkiyi kaldır'}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="admin-settings-readonly">
                        <span>Yetkili kullanıcı yok</span>
                        <strong>İlk Super Owner için CLI bootstrap komutunu kullanın.</strong>
                      </div>
                    )}
                  </div>

                  <div className="admin-manager-add">
                    <label className="admin-settings-field">
                      <span>Rol</span>
                      <select
                        value={managedAccessForm.role}
                        onChange={(event) => {
                          const role = event.target.value as ManagedAccessRole;
                          setManagedAccessForm((current) => ({
                            ...current,
                            role,
                            cafeSlugs: role === 'super_owner' ? '' : current.cafeSlugs || workspaceSlug,
                          }));
                        }}
                        disabled={isAccessPolicySaving}
                      >
                        <option value="super_owner">Super Owner</option>
                        <option value="owner">Admin / Owner</option>
                        <option value="manager">Manager</option>
                      </select>
                    </label>
                    <label className="admin-settings-field">
                      <span>E-posta</span>
                      <input
                        value={managedAccessForm.email}
                        placeholder="yetkili@ornek.com"
                        onChange={(event) => setManagedAccessForm((current) => ({ ...current, email: event.target.value }))}
                        disabled={isAccessPolicySaving}
                      />
                    </label>
                    <label className="admin-settings-field">
                      <span>Cafe kodları</span>
                      <input
                        value={managedAccessForm.cafeSlugs}
                        placeholder="ornek-kafe, ikinci-kafe"
                        onChange={(event) => setManagedAccessForm((current) => ({ ...current, cafeSlugs: event.target.value }))}
                        disabled={isAccessPolicySaving || managedAccessForm.role === 'super_owner'}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleSaveAccessAssignment()}
                      disabled={isAccessPolicySaving || !normalizeAccessEmail(managedAccessForm.email)}
                    >
                      <Plus className="h-4 w-4" />
                      {isAccessPolicySaving ? 'Kaydediliyor...' : 'Yetki Kaydet'}
                    </button>
                  </div>

                  <div className="admin-manager-add">
                    <button
                      type="button"
                      onClick={() => void loadManagedAccessPolicy()}
                      disabled={isAccessPolicyLoading || isAccessPolicySaving}
                    >
                      <RotateCw className="h-4 w-4" />
                      {isAccessPolicyLoading ? 'Yükleniyor...' : 'Listeyi Yenile'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSyncAccessClaims()}
                      disabled={isAccessClaimsSyncing || managedAccessAssignments.length === 0}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {isAccessClaimsSyncing ? 'Senkronize ediliyor...' : 'Tüm Claims Senkronize Et'}
                    </button>
                  </div>

                  <div className="admin-settings-alert">
                    Değişiklikten sonra kullanıcıların yeniden giriş yapması veya token yenilemesi gerekebilir. Claims senkronizasyonu Firebase Auth kullanıcısı oluşmuş hesaplar için çalışır.
                  </div>
                </div>
              </motion.article>
            ) : null}

            <motion.article
              className="admin-settings-card admin-settings-section"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0 }}
            >
              <div className="admin-settings-section-head">
                <span className="admin-settings-section-icon"><Home className="h-5 w-5" /></span>
                <div>
                  <h3>Kafe Profili</h3>
                  <p>Sitenin üst bölümünde ve paylaşım ekranlarında görünen temel bilgiler.</p>
                </div>
              </div>
              <div className="admin-settings-section-body">
                <label className="admin-settings-field">
                  <span>Kafe Adı</span>
                  <input value={settings.cafeName} onChange={(event) => updateSettings({ cafeName: event.target.value })} placeholder="Kafenizin adı" />
                </label>
                <div className="admin-settings-logo-row">
                  <div className="admin-settings-logo">
                    {settings.logoUrl ? <img src={settings.logoUrl} alt="" /> : <span>{settings.cafeName.slice(0, 2).toUpperCase()}</span>}
                  </div>
                  <div>
                    <span>Logo</span>
                    <button type="button" onClick={() => logoInputRef.current?.click()} disabled={isLogoUploading || !canManageWorkspace}>
                      <Upload className="h-4 w-4" />
                      {isLogoUploading ? 'Yükleniyor...' : 'Logo Yükle'}
                    </button>
                    <small>Sitede ve admin panelinde kullanılır. PNG, JPG veya WEBP formatı (maks. 4MB).</small>
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={(event) => void handleLogoUpload(event)} hidden />
                  </div>
                </div>
              </div>
            </motion.article>

            {/* ─── Marka Görünümü ─── */}
            <motion.article
              className="admin-settings-card admin-settings-section"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
            >
              <div className="admin-settings-section-head">
                <span className="admin-settings-section-icon"><Palette className="h-5 w-5" /></span>
                <div>
                  <h3>Marka Görünümü</h3>
                  <p>Sitenizin galeri, kampanya ve paylaşım sayfalarında görünen renk ve yazı stili.</p>
                </div>
              </div>
              <div className="admin-settings-section-body">
                <div className="admin-brand-color-cards">
                  {/* Ana Renk Kartı */}
                  <div className="admin-brand-color-card">
                    <div className="admin-brand-color-preview" style={{ background: settings.primaryColor }}>
                      <input type="color" value={settings.primaryColor} onChange={(event) => updateSettings({ primaryColor: event.target.value, accentColor: event.target.value })} aria-label="Ana renk seç" />
                    </div>
                    <div className="admin-brand-color-info">
                      <span className="admin-brand-color-title">Ana Renk</span>
                      <input className="admin-brand-color-hex" value={settings.primaryColor} onChange={(event) => updateSettings({ primaryColor: event.target.value, accentColor: event.target.value })} maxLength={7} />
                    </div>
                    <div className="admin-brand-swatch-row">
                      {THEME_COLORS.map((color) => (
                        <button key={color.value} type="button" className={`admin-brand-swatch ${settings.primaryColor === color.value ? 'is-active' : ''}`} style={{ '--sw': color.value } as React.CSSProperties} onClick={() => updateSettings({ primaryColor: color.value, accentColor: color.value })} title={color.name} />
                      ))}
                    </div>
                  </div>
                  {/* İkinci Renk Kartı */}
                  <div className="admin-brand-color-card">
                    <div className="admin-brand-color-preview" style={{ background: settings.secondaryColor }}>
                      <input type="color" value={settings.secondaryColor} onChange={(event) => updateSettings({ secondaryColor: event.target.value })} aria-label="İkinci renk seç" />
                    </div>
                    <div className="admin-brand-color-info">
                      <span className="admin-brand-color-title">İkinci Renk</span>
                      <input className="admin-brand-color-hex" value={settings.secondaryColor} onChange={(event) => updateSettings({ secondaryColor: event.target.value })} maxLength={7} />
                    </div>
                    <div className="admin-brand-swatch-row">
                      {THEME_COLORS.map((color) => (
                        <button key={color.value} type="button" className={`admin-brand-swatch ${settings.secondaryColor === color.value ? 'is-active' : ''}`} style={{ '--sw': color.value } as React.CSSProperties} onClick={() => updateSettings({ secondaryColor: color.value })} title={color.name} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="admin-settings-palette-section">
                  <span className="admin-settings-palette-label">Yazı Stili</span>
                  <div className="admin-settings-fonts">
                    {THEME_FONTS.map((font) => (
                      <button
                        key={font.value}
                        type="button"
                        onClick={() => updateSettings({ handwritingFont: font.value })}
                        className={settings.handwritingFont === font.value ? 'is-selected' : ''}
                        style={{ fontFamily: font.value }}
                      >
                        {font.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.article>

            {/* ─── Yöneticiler ─── */}
            <motion.article
              className="admin-settings-card admin-settings-section"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
            >
              <div className="admin-settings-section-head">
                <span className="admin-settings-section-icon"><Users className="h-5 w-5" /></span>
                <div>
                  <h3>Yöneticiler</h3>
                  <p>Panele erişebilen kafe sahibi ve ek yöneticiler. Listeyi yalnızca kafe sahibi değiştirebilir.</p>
                </div>
              </div>
              <div className="admin-settings-section-body">
                <div className="admin-settings-readonly">
                  <span>Kafe Sahibi</span>
                  <strong>{workspaceOwnerEmail || userEmail || 'Kafe sahibi hesabı bulunamadı'}</strong>
                </div>
                <div className="admin-manager-list">
                  {settings.adminEmails.length > 0 ? (
                    settings.adminEmails.map((email) => (
                      <div key={email} className="admin-manager-row">
                        <span>
                          <UserPlus className="h-4 w-4" />
                          {email}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveManagerEmail(email)}
                          disabled={!canManageSettingsAdmins}
                          aria-label={`${email} yöneticisini kaldır`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="admin-settings-readonly">
                      <span>Ek yönetici yok</span>
                      <strong>Kafe sahibi hesabı panele tam erişime sahiptir.</strong>
                    </div>
                  )}
                </div>
                <div className="admin-manager-add">
                  <label className="admin-settings-field">
                    <span>Yeni yönetici e-postası</span>
                    <input
                      value={newManagerEmail}
                      placeholder="yonetici@ornek.com"
                      onChange={(event) => setNewManagerEmail(event.target.value)}
                      disabled={!canManageSettingsAdmins}
                    />
                  </label>
                  <button type="button" onClick={handleAddManagerEmail} disabled={!canManageSettingsAdmins || !normalizeAccessEmail(newManagerEmail)}>
                    <Plus className="h-4 w-4" />
                    Ekle
                  </button>
                </div>
                {!canManageSettingsAdmins ? (
                  <div className="admin-settings-alert">Yönetici listesini yalnızca kafe sahibi ve süper admin değiştirebilir.</div>
                ) : null}
              </div>
            </motion.article>

            {/* ─── Plan & İletişim ─── */}
            <motion.article
              className="admin-settings-card admin-settings-section"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
            >
              <div className="admin-settings-section-head">
                <span className="admin-settings-section-icon"><Crown className="h-5 w-5" /></span>
                <div>
                  <h3>Plan & İletişim</h3>
                  <p>İlgilendiğiniz planı seçin ve satış ekibiyle WhatsApp üzerinden iletişime geçin.</p>
                </div>
              </div>
              <div className="admin-settings-section-body">
                <PricingPlans
                  variant="compact"
                  showHeader={false}
                  showTrustBar={false}
                  initialTableCount={pricingTableCount}
                  selectedKey={selectedPlanKey || settings.packageKey}
                  onSelect={(key) => {
                    setSelectedPlanKey(key);
                    setSettings((current) => ({
                      ...current,
                      billingPlan: key,
                      packageKey: key,
                    }));
                  }}
                />
                <button type="button" className="admin-settings-action" onClick={() => void handlePlanContact(CAFE_PACKAGE_OPTIONS.find((option) => option.key === (selectedPlanKey || settings.packageKey)) || CAFE_PACKAGE_OPTIONS[0])}>
                  <span><ExternalLink className="h-5 w-5" /></span>
                  <div>
                    <strong>WhatsApp ile İletişime Geç</strong>
                    <small>Seçili plan hakkında detaylı bilgi almak için WhatsApp mesajı açılır.</small>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.article>

            {/* ─── Veri Dışa Aktarma ─── */}
            <motion.article
              className="admin-settings-card admin-settings-section"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0.24 }}
            >
              <div className="admin-settings-section-head">
                <span className="admin-settings-section-icon"><FileSpreadsheet className="h-5 w-5" /></span>
                <div>
                  <h3>Veri Dışa Aktarma</h3>
                  <p>Tüm kafe verilerinizi detaylı Excel dosyası olarak indirin.</p>
                </div>
              </div>
              <div className="admin-settings-section-body">
                <button type="button" className="admin-settings-action" onClick={() => void handleExportCafeData()} disabled={isSettingsActionBusy}>
                  <span><FileSpreadsheet className="h-5 w-5" /></span>
                  <div>
                    <strong>Excel Dosyası İndir</strong>
                    <small>Kafe bilgileri, müşteriler, kampanyalar, QR standları, galeri verileri ve istatistikler tek bir Excel dosyasında.</small>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.article>
          </div>

          {/* ─── Kaydet Butonu ─── */}
          <motion.div
            className="admin-settings-unified-footer"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          >
            <button
              type="button"
              className="admin-settings-save-main"
              onClick={() => void handleSave()}
              disabled={isSaving || isCreatingWorkspace || isLogoUploading || !canManageWorkspace}
            >
              <Save className="h-5 w-5" />
              {isSaving ? isCreatingWorkspace ? 'Kaydediliyor...' : canCreateCafeWorkspaces && workspaceDraftChanged ? 'Yeni Kafe Ortamını Oluştur' : 'Tüm Ayarları Kaydet'}
            </button>
            {settingsDirty || workspaceDraftChanged ? (
              <span className="admin-settings-dirty-hint">Kaydedilmemiş değişiklikler var</span>
            ) : null}
          </motion.div>
        </section>
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
                      setIsStatsDateRangeOpen(false);
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
                  ? className="admin-chart-label-row"
                  style={{ gridTemplateColumns: `repeat(${dashboardChartData.length}, minmax(0, 1fr))` }}
                >
                  {dashboardChartData.map((point, index) => (
                    <span key={point.isoDate}>
                      {index % chartGeometry.labelStep === 0 || index === dashboardChartData.length - 1
 point.label
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
                        <SignedImage
                          photoId={item.id}
                          fallbackUrl={item.url}
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
                      <SignedImage photoId={item.id} fallbackUrl={item.url} alt={item.caption} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
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
                Son kampanya: {emailAnalyticsSummary?.latestCampaignSubject || emailCampaigns[0]?.subject || 'Henüz gönderim yok'}
              </p>
            </article>

            <article className="admin-dashboard-card admin-customer-table-card">
              <div className="admin-dashboard-card-head">
                <h3>Son Kayıt Olan Müşteriler</h3>
                <span className="admin-card-summary-pill">{recentCustomerRows.length} kayıt</span>
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

        <section className={`admin-stats-pro ${activeView === 'stats' ? '' : 'hidden'}`}>
          <div className="admin-stats-pro-head">
            <div>
              <h2>İstatistikler</h2>
              <p>Paylaşımlar, gösterimler ve müşteri kazanımını tek ekranda takip edin.</p>
            </div>

            <div ref={statsDateRangePopoverRef} className="admin-stats-date-wrap">
              <button
                type="button"
                className="admin-stats-date-button"
                onClick={() => {
                  setIsStatsDateRangeOpen((current) => !current);
                  setIsDateRangeOpen(false);
                  setIsChartDateRangeOpen(false);
                  setIsNotificationOpen(false);
                }}
              >
                <CalendarDays className="h-4 w-4" />
                <span>{dashboardDateRangeLabel}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              <AnimatePresence>
                {isStatsDateRangeOpen ? (
                  <motion.div
                    className="admin-stats-date-popover"
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                  >
                    {renderDateRangePopover()}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          {statsError ? (
            <div className="admin-stats-live-alert">
              <ShieldCheck className="h-4 w-4" />
              <span>{statsError}</span>
            </div>
          ) : null}

          <div className="admin-stats-kpi-grid">
            {statsKpiCards.map((metric) => {
              const Icon = metric.icon;

              return (
                <article key={metric.key} className={`admin-stats-kpi-card is-${metric.key}`}>
                  <div className="admin-stats-kpi-top">
                    <span className="admin-stats-kpi-icon">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <span>{metric.label}</span>
                      <strong>{formatCompactNumber(metric.value)}</strong>
                    </div>
                  </div>
                  <em className={metric.change >= 0 ? 'is-positive' : 'is-negative'}>
                    {formatStatsChangeLabel(metric.change)}
                  </em>
                  <small>Önceki dönemle karşılaştırma</small>
                </article>
              );
            })}
          </div>

          <div className="admin-stats-main-grid">
            <article className="admin-stats-panel admin-stats-trend-panel">
              <div className="admin-stats-panel-head">
                <div>
                  <h3>Paylaşım Trendi</h3>
                  <p>{statsTrendSubtitle}</p>
                </div>
                <div ref={statsTrendMenuRef} className="admin-stats-select-wrap">
                  <button
                    type="button"
                    className="admin-stats-mini-select"
                    aria-expanded={isStatsTrendMenuOpen}
                    onClick={() => setIsStatsTrendMenuOpen((current) => !current)}
                  >
                    {statsTrendOption.label}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <AnimatePresence>
                    {isStatsTrendMenuOpen ? (
                      <motion.div
                        className="admin-stats-select-menu"
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                      >
                        {STATS_TREND_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={option.value === statsTrendGranularity ? 'is-active' : ''}
                            onClick={() => {
                              setStatsTrendGranularity(option.value);
                              setHoveredStatsTrendIndex(null);
                              setIsStatsTrendMenuOpen(false);
                            }}
                          >
                            <span>{option.label}</span>
                            <small>{option.hint}</small>
                          </button>
                        ))}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>

              <div className="admin-stats-line-chart">
                <svg
                  viewBox={`0 0 ${statsTrendGeometry.width} ${statsTrendGeometry.height}`}
                  role="img"
                  aria-label={`${dashboardDateRangeLabel} paylaşım trendi`}
                  preserveAspectRatio="none"
                  onMouseLeave={() => setHoveredStatsTrendIndex(null)}
                  onMouseMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const relativeX = ((event.clientX - rect.left) / rect.width) * statsTrendGeometry.width;

                    const nearestIndex = statsTrendGeometry.points.reduce((closestIndex, point, index, allPoints) => {
                      const currentDistance = Math.abs(point.x - relativeX);
                      const closestDistance = Math.abs(allPoints[closestIndex].x - relativeX);
                      return currentDistance < closestDistance ? index : closestIndex;
                    }, 0);

                    setHoveredStatsTrendIndex(nearestIndex);
                  }}
                >
                  {[0, 1, 2, 3, 4].map((line) => {
                    const y = 24 + line * ((statsTrendGeometry.baseline - 24) / 4);
                    const value = Math.round(statsTrendMax - (line * statsTrendMax) / 4);
                    return (
                      <g key={line}>
                        <text x="0" y={y + 4}>{value}</text>
                        <line x1="34" x2="790" y1={y} y2={y} />
                      </g>
                    );
                  })}
                  <motion.path
                    d={statsTrendGeometry.areaPath}
                    className="admin-stats-chart-area"
                    initial={false}
                    animate={{ d: statsTrendGeometry.areaPath }}
                    transition={CHART_MOTION_TRANSITION}
                  />
                  <motion.path
                    d={statsTrendGeometry.path}
                    className="admin-stats-chart-line"
                    initial={false}
                    animate={{ d: statsTrendGeometry.path }}
                    transition={CHART_MOTION_TRANSITION}
                  />
                  {statsTrendGeometry.points.map((point) => (
                    <circle
                      key={point.isoDate}
                      cx={point.x}
                      cy={point.y}
                      r={activeStatsTrendPoint?.isoDate === point.isoDate ? 5.5 : 3.5}
                      className="admin-stats-chart-dot"
                    />
                  ))}
                  {activeStatsTrendPoint ? (
                    <line
                      x1={activeStatsTrendPoint.x}
                      x2={activeStatsTrendPoint.x}
                      y1="24"
                      y2={statsTrendGeometry.baseline}
                      className="admin-stats-chart-hover-line"
                    />
                  ) : null}
                </svg>
                <AnimatePresence>
                  {activeStatsTrendPoint ? (
                    <motion.div
                      className="admin-stats-chart-tooltip"
                      style={{ left: `${(activeStatsTrendPoint.x / statsTrendGeometry.width) * 100}%` }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={CHART_MOTION_TRANSITION}
                    >
                      <strong>{activeStatsTrendPoint.label}</strong>
                      <span>Toplam: {formatCompactNumber(activeStatsTrendPoint.value)}</span>
                      <span>Canlı Galeri: {formatCompactNumber(activeStatsTrendPoint.qrShares + activeStatsTrendPoint.galleryShares)}</span>
                      <span>Story: {formatCompactNumber(activeStatsTrendPoint.storyShares)}</span>
                      <span>E-posta: {formatCompactNumber(activeStatsTrendPoint.emailShares)}</span>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <div
                  ? className="admin-stats-chart-labels"
                  style={{ gridTemplateColumns: `repeat(${statsTrendData.length}, minmax(0, 1fr))` }}
                >
                  {statsTrendData.map((point, index) => (
                    <span key={point.isoDate}>
                      {index % statsTrendGeometry.labelStep === 0 || index === statsTrendData.length - 1
 point.shortLabel
                        : ''}
                    </span>
                  ))}
                </div>
              </div>
            </article>

            <article className="admin-stats-panel admin-stats-source-panel">
              <div className="admin-stats-panel-head">
                <div>
                  <h3>Paylaşım Kaynakları</h3>
                  <p>Fotoğraf, e-posta ve story paylaşımlarının dağılımı</p>
                </div>
              </div>

              <div className="admin-stats-source-body">
                <div
                  ? className="admin-stats-donut"
                  style={{
                    background:
                      statsSourceTotal > 0
 `conic-gradient(${statsSourceGradient})`
                        : 'conic-gradient(#2a2a2a 0% 100%)',
                  }}
                >
                  <span>
                    <strong>{formatCompactNumber(statsSourceTotal)}</strong>
                    <small>Toplam</small>
                  </span>
                </div>

                <div className="admin-stats-source-list">
                  {statsSourceRows.map((source) => (
                    <div key={source.key}>
                      <span>
                        <i style={{ backgroundColor: source.color }} />
                        {source.label}
                      </span>
                      <strong>%{source.percent.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ({formatCompactNumber(source.value)})</strong>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>

          <div className="admin-stats-bottom-grid">
            <article className="admin-stats-panel admin-stats-ranking-panel">
              <div className="admin-stats-panel-head">
                <div>
                  <h3>Story Şablonları</h3>
                  <p>Story paylaşımı aktif olduğunda en çok kullanılan şablonlar burada görünür</p>
                </div>
              </div>

              <div className="admin-stats-ranking-list">
                {statsTopTemplates.length > 0 ? (
                  statsTopTemplates.map((template, index) => {
                    const ratio = Math.max(8, Math.round((template.count / statsTopTemplateMax) * 100));

                    return (
                      <div key={template.id || `${template.name}-${index}`} className="admin-stats-ranking-row">
                        <span>{template.rank || index + 1}</span>
                        <strong>{template.name}</strong>
                        <div className="admin-stats-ranking-track">
                          <i style={{ width: `${ratio}%` }} />
                        </div>
                        <em>{formatCompactNumber(template.count)}</em>
                      </div>
                    );
                  })
                ) : (
                  <p className="admin-stats-empty">
                    {statsDashboard?.storyTemplates?.message || 'Story şablonları henüz aktif değil; özellik açıldığında bu alan otomatik dolacak.'}
                  </p>
                )}
              </div>
            </article>

            <article className="admin-stats-panel admin-stats-impact-panel">
              <div className="admin-stats-panel-head">
                <div>
                  <h3>ShareVibe Etkisi</h3>
                  <p>Erişim, etkileşim ve sadakat değişimi</p>
                </div>
              </div>

              <div className="admin-stats-impact-grid">
                {statsImpactCards.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.key} className="admin-stats-impact-card">
                      <span>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <strong>{item.title}</strong>
                        <em>{formatStatsChangeLabel(item.value).replace('↑ ', '+').replace('↓ ', '-')}</em>
                        <small>{item.description}</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </div>

          {(() => {
            const maxCspCount = Math.max(1, ...hourlyCspChartData.map(p => p.value));
            const cspWidth = 600;
            const cspHeight = 150;
            const cspPadding = 20;
            const cspPoints = hourlyCspChartData.map((pt, idx) => {
              const x = cspPadding + (idx * (cspWidth - 2 * cspPadding)) / 23;
              const y = cspHeight - cspPadding - (pt.value * (cspHeight - 2 * cspPadding)) / maxCspCount;
              return { x, y, label: pt.label, value: pt.value };
            });
            const cspPathD = cspPoints.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');

            return (
              <div className="admin-stats-bottom-grid mt-6">
                <article className="admin-stats-panel admin-stats-csp-panel col-span-2">
                  <div className="admin-stats-panel-head">
                    <div>
                      <h3 className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-accent" />
                        CSP İhlal Raporları (Son 24 Saat)
                      </h3>
                      <p>Güvenlik Politikası (Content Security Policy) ihlallerinin saatlik trendi</p>
                    </div>
                    <span className="rounded-full bg-red-950/65 px-3 py-1.5 text-xs text-red-400 font-semibold border border-red-500/20">
                      Toplam İhlal: {cspViolations.length}
                    </span>
                  </div>

                  <div className="admin-stats-line-chart mt-4">
                    {cspViolations.length === 0 ? (
                      <div className="h-48 flex flex-col items-center justify-center text-cafe-100/40 text-sm">
                        <ShieldCheck className="w-8 h-8 text-green-400 mb-2 animate-pulse" />
                        Son 24 saat içinde herhangi bir CSP ihlali tespit edilmedi.
                      </div>
                    ) : (
                      <>
                        <svg
                          viewBox={`0 0 ${cspWidth} ${cspHeight}`}
                          role="img"
                          aria-label="CSP İhlalleri Grafiği"
                          preserveAspectRatio="none"
                          className="w-full h-48"
                        >
                          {/* Grid Lines */}
                          {[0, 1, 2, 3, 4].map((line) => {
                            const y = cspPadding + line * ((cspHeight - 2 * cspPadding) / 4);
                            const value = Math.round(maxCspCount - (line * maxCspCount) / 4);
                            return (
                              <g key={line} className="opacity-30">
                                <text x="5" y={y + 4} fill="#8c7a6e" fontSize="10">{value}</text>
                                <line x1="30" x2={cspWidth - 10} y1={y} y2={y} stroke="#3b2e24" strokeWidth="1" strokeDasharray="3 3" />
                              </g>
                            );
                          })}
                          
                          {/* Area under the line */}
                          <path
                            d={`${cspPathD} L ${cspPoints[cspPoints.length - 1].x} ${cspHeight - cspPadding} L ${cspPoints[0].x} ${cspHeight - cspPadding} Z`}
                            fill="url(#cspAreaGrad)"
                            className="opacity-20"
                          />
                          
                          {/* Line Path */}
                          <path
                            d={cspPathD}
                            fill="none"
                            stroke="var(--color-accent, #C98B5A)"
                            strokeWidth="2.5"
                          />

                          {/* Dots */}
                          {cspPoints.map((pt, idx) => (
                            <circle
                              key={idx}
                              cx={pt.x}
                              cy={pt.y}
                              r="4"
                              fill="var(--color-accent, #C98B5A)"
                              className="hover:r-6 transition-all cursor-pointer"
                            >
                              <title>{pt.label}: {pt.value} ihlal</title>
                            </circle>
                          ))}

                          {/* Gradients */}
                          <defs>
                            <linearGradient id="cspAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--color-accent, #C98B5A)" />
                              <stop offset="100%" stopColor="var(--color-accent, #C98B5A)" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                        </svg>

                        <div
                          className="admin-stats-chart-labels text-[10px] text-cafe-100/40 mt-2 flex justify-between px-6"
                        >
                          {hourlyCspChartData.map((point, index) => {
                            // Display label every 4 hours to avoid cluttering
                            if (index % 4 === 0 || index === hourlyCspChartData.length - 1) {
                              return <span key={index}>{point.label}</span>;
                            }
                            return null;
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </article>
              </div>
            );
          })()}

          <div className="admin-stats-live-foot">
            <span className={statsLoading ? 'is-loading' : ''} />
            <p>
              Veriler canlı güncellenir. Son güncelleme:{' '}
              {statsDashboard?.range?.updatedAt
 ? new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(statsDashboard.range.updatedAt))
                : 'şimdi'}
            </p>
          </div>
        </section>

        <section className="hidden">
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
                    ? tableActivity.map((entry, index) => {
                      const ratio = topTable
 Math.max(8, Math.round((entry.count / topTable[1]) * 100))
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

          {typeof document !== 'undefined' && campaignComposerMode !== 'closed' || createPortal(
            <div className="admin-root admin-campaign-portal-root">
              <AnimatePresence>
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
                        <span>{campaignComposerPurpose === 'email' ? 'E-posta Kampanyası' : campaignComposerMode === 'create' ? 'Kampanya Yönetimi' : 'Kampanya Merkezi'}</span>
                        <h3>
                          {campaignComposerMode === 'create'
 campaignComposerPurpose === 'email'
 'E-posta Kampanyası Hazırla'
                              : 'Yeni Kampanya Oluştur'
                            : campaignComposerMode === 'edit'
 campaignComposerPurpose === 'email'
 'E-posta Kampanyasını Düzenle'
                                : 'Kampanyayı Düzenle'
                              : selectedCampaign?.subject || 'Kampanya Detayları'}
                        </h3>
                        {campaignComposerMode === 'create' ? (
                          <>
                            <p className="admin-campaign-create-note">
                              {campaignComposerPurpose === 'email'
 'Web sitenizdeki kampanyayı Brevo üzerinden e-posta listesine uygun bir tasarımla gönderin.'
                                : 'Kafenizin en etkili kampanyasını burada tasarlayın. Her detay müşteri deneyimini güzelleştirecektir.'}
                            </p>
                            <div className="admin-campaign-composer-highlights" aria-label="Kampanya oluşturma özellikleri">
                              <span>
                                <Sparkles className="h-3.5 w-3.5" />
                                {campaignComposerPurpose === 'email' ? 'Brevo uyumlu' : '3 adımda hazır'}
                              </span>
                              <span>
                                <ImageIcon className="h-3.5 w-3.5" />
                                {campaignComposerPurpose === 'email' ? 'Hazır e-posta tasarımı' : 'Görselli yayın'}
                              </span>
                              <span>
                                <SendHorizontal className="h-3.5 w-3.5" />
                                {campaignComposerPurpose === 'email' ? 'Hemen gönder veya zamanla' : 'Anında paylaşım'}
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
                      campaignComposerMode === 'detail' ? campaignComposerMode === 'create' || campaignComposerMode === 'edit' ? 'is-single' : ''
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
                          <small>{selectedAudience?.label || 'Alıcı grubu'} içinde gönderime hazır adres</small>
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
 current.filter((item) => item !== email)
                                          : current.includes(email)
 current
                                            : [...current, email]
                                      )
                                    }
                                  >
                                    <strong>{customer.name || email}</strong>
                                    <small>{isExcluded ? `Çıkarıldı · ${email}` : customer.name ? email : 'Seçili'}</small>
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
                        campaignComposerPurpose === 'email' ? (
                          <>
                            {renderEmailCampaignReport(selectedCampaign)}
                            <div className="admin-campaign-detail-panel is-legacy-email-report" aria-hidden="true">
                            <div className="admin-campaign-detail-stats">
                              <div>
                                <span>Durum</span>
                                <strong>{getCampaignStatusLabel(selectedCampaign.status)}</strong>
                              </div>
                              <div>
                                <span>Alıcı</span>
                                <strong>{formatCompactNumber(getCampaignRecipientCount(selectedCampaign))}</strong>
                              </div>
                              <div>
                                <span>Açılma</span>
                                <strong>{formatPercent(getPercent(getCampaignOpenCount(selectedCampaign), selectedCampaign.sentCount || 0))}</strong>
                              </div>
                              <div>
                                <span>Tıklama</span>
                                <strong>{formatPercent(getPercent(getCampaignClickCount(selectedCampaign), selectedCampaign.sentCount || 0))}</strong>
                              </div>
                            </div>
                            <div className="admin-campaign-message-preview">
                              {selectedCampaign.imageUrl ? (
                                <img src={selectedCampaign.imageUrl} alt={selectedCampaign.subject} loading="lazy" decoding="async" />
                              ) : null}
                              <span>E-posta içeriği</span>
                              {selectedCampaign.description ? <strong>{selectedCampaign.description}</strong> : null}
                              <p>{selectedCampaign.textContent}</p>
                            </div>
                            <div className="admin-campaign-recipient-list">
                              <span>Gönderim bilgisi</span>
                              <p>Bu kayıt Brevo üzerinden gönderilen e-posta kampanyasıdır. Açılma ve tıklama verileri Brevo etkinliklerinden okunur.</p>
                            </div>
                            </div>
                          </>
                        ) : (
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
                        )
                      ) : (
                        <>
                          {campaignComposerMode === 'create' ? (
                            <div className="admin-campaign-create-banner">
                              <div className="admin-campaign-create-banner-icon">
                                <Sparkles className="h-5 w-5" />
                              </div>
                              <div className="admin-campaign-create-banner-content">
                                <strong>{campaignComposerPurpose === 'email' ? 'E-posta Tasarımı Hazır' : 'Kampanyanızı Tasarlayın'}</strong>
                                <p>
                                  {campaignComposerPurpose === 'email'
 'Seçili web kampanyası e-posta formatına dönüştürüldü. Metni kontrol edip gönderin.'
                                    : 'Başlık, açıklama ve görselle kampanyanızı hazırlayın.'}
                                </p>
                              </div>
                            </div>
                          ) : null}

                          <div className={`admin-campaign-form-section ${campaignComposerPurpose === 'email' ? 'is-email-subject-section' : ''}`}>
                            <div className="admin-campaign-form-header">
                              <span className="admin-campaign-form-step">1</span>
                              <div>
                                <h4>{campaignComposerPurpose === 'email' ? 'E-posta Bilgileri' : 'Kampanya Bilgileri'}</h4>
                                <p>
                                  {campaignComposerPurpose === 'email'
 'Konu satırını ve kısa açıklamayı düzenleyin'
                                    : 'Kampanyanızın adı ve açıklamasını girin'}
                                </p>
                              </div>
                            </div>

                            <label className="admin-campaign-field">
                              <span>{campaignComposerPurpose === 'email' ? 'Konu Satırı' : 'Kampanya Adı'}</span>
                              <input
                                type="text"
                                value={campaignSubjectInput}
                                onChange={(event) => setCampaignSubjectInput(event.target.value)}
                                placeholder={campaignComposerPurpose === 'email' ? 'Örn: Bu hafta size özel kampanya' : 'Örn: Hafta Sonu İndirim Kampanyası'}
                              />
                              <small className="admin-campaign-field-hint">{campaignSubjectInput.length}/50 karakter</small>
                            </label>

                            <label className="admin-campaign-field">
                              <span>{campaignComposerPurpose === 'email' ? 'Kısa Açıklama' : 'Kampanya Açıklaması / Detayı'}</span>
                              <textarea
                                value={campaignDescriptionInput}
                                onChange={(event) => setCampaignDescriptionInput(event.target.value)}
                                placeholder={campaignComposerPurpose === 'email' ? 'Örn: Web kampanyamızdaki fırsatı e-posta listenizle paylaşın...' : 'Örn: Hafta sonuna özel seçili menülerde indirim fırsatını kaçırmayın...'}
                                rows={4}
                              />
                            </label>
                          </div>

                          <div className="admin-campaign-form-section">
                            <div className="admin-campaign-form-header">
                              <span className="admin-campaign-form-step">2</span>
                              <div>
                                <h4>Görsel ve İçerik</h4>
                                <p>{campaignComposerPurpose === 'email' ? 'E-postada gösterilecek görseli kontrol edin' : 'Kampanyanızın görselini seçin'}</p>
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

                          {campaignComposerPurpose === 'email' ? (
                            <div className="admin-campaign-form-section admin-campaign-email-delivery">
                              <div className="admin-campaign-form-header">
                                <span className="admin-campaign-form-step">3</span>
                                <div>
                                  <h4>Alıcı ve Gönderim</h4>
                                  <p>Gerçek e-posta listesinden hedef kitle seçin</p>
                                </div>
                              </div>

                              <div className="admin-campaign-email-audience-grid">
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

                              <div className="admin-campaign-recipient-restore">
                                <div>
                                  <span>Liste durumu</span>
                                  <strong>{selectedAudienceInactiveCustomers.length} alıcı geri eklenebilir</strong>
                                  <small>{selectedAudience?.label || 'Seçili grup'} için aktif listeyi buradan güncelleyebilirsiniz.</small>
                                </div>
                                <div>
                                  <button
                                    type="button"
                                    className="is-restore"
                                    onClick={() => { void handleSetMarketingRecipientsSubscribed(selectedAudienceInactiveCustomers, true); }}
                                    disabled={recipientActionBusy === 'bulk-add' || selectedAudienceInactiveCustomers.length === 0}
                                  >
                                    <RotateCw className="h-3.5 w-3.5" />
                                    Geri ekle
                                  </button>
                                  <button
                                    type="button"
                                    className="is-remove"
                                    onClick={() => { void handleSetMarketingRecipientsSubscribed(selectedAudienceCustomers, false); }}
                                    disabled={recipientActionBusy === 'bulk-remove' || selectedAudienceCustomers.length === 0}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    Grubu çıkar
                                  </button>
                                </div>
                              </div>

                              <div className="admin-campaign-email-controls">
                                <label>
                                  <span>Gönderim Zamanı</span>
                                  <DropdownSelect
                                    value={campaignSchedule}
                                    onChange={setCampaignSchedule}
                                    options={SEND_TIME_OPTIONS}
                                    ariaLabel="Gönderim zamanı"
                                    icon={Clock}
                                  />
                                </label>
                                <label>
                                  <span>Seçili Alıcı</span>
                                  <strong>{selectedAudienceCount} kişi</strong>
                                </label>
                              </div>

                              <form className="admin-campaign-recipient-add" onSubmit={(event) => { void handleAddMarketingRecipient(event); }}>
                                <label>
                                  <span>Yeni alıcı</span>
                                  <input
                                    type="email"
                                    value={recipientEmailInput}
                                    onChange={(event) => setRecipientEmailInput(event.target.value)}
                                    placeholder="musteri@example.com"
                                  />
                                </label>
                                <label>
                                  <span>Ad</span>
                                  <input
                                    type="text"
                                    value={recipientNameInput}
                                    onChange={(event) => setRecipientNameInput(event.target.value)}
                                    placeholder="İsteğe bağlı"
                                  />
                                </label>
                                <button type="submit" disabled={recipientActionBusy === 'add'}>
                                  <UserPlus className="h-4 w-4" />
                                  Ekle
                                </button>
                              </form>

                              <div className="admin-campaign-recipient-list is-editable">
                                <span>Seçili alıcılar</span>
                                {selectedAudienceCustomers.length > 0 ? (
                                  <div>
                                    {selectedAudienceCustomers.slice(0, 12).map((customer) => {
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
 current.filter((item) => item !== email)
                                                : current.includes(email)
 current
                                                  : [...current, email]
                                            )
                                          }
                                        >
                                          <strong>{customer.name || email}</strong>
                                          <small>{isExcluded ? `Çıkarıldı · ${email}` : customer.name ? email : 'Seçili'}</small>
                                        </button>
                                      );
                                    })}
                                    {selectedAudienceCustomers.length > 12 ? (
                                      <p>+{selectedAudienceCustomers.length - 12} adres daha</p>
                                    ) : null}
                                  </div>
                                ) : (
                                  <p>Bu grup için henüz e-posta bulunmuyor.</p>
                                )}
                              </div>

                              <label className="admin-campaign-field">
                                <span>E-posta Metni</span>
                                <textarea
                                  value={campaignTextInput}
                                  onChange={(event) => setCampaignTextInput(event.target.value)}
                                  rows={7}
                                  placeholder="E-postada görünecek mesaj metni"
                                />
                              </label>
                            </div>
                          ) : null}

                          {campaignComposerPurpose !== 'email' ? (
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
                          ) : null}
                        </>
                      )}
                    

                      <div className="admin-campaign-composer-actions">
                        {campaignComposerPurpose === 'email' ? (
                          campaignComposerMode === 'detail' && selectedCampaign ? (
                            <>
                              {['draft', 'scheduled'].includes(selectedCampaign.status) ? (
                                <>
                                  <button type="button" className="is-secondary" onClick={() => openEmailCampaignEdit(selectedCampaign)}>
                                    Düzenle
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleSendExistingCampaign(selectedCampaign);
                                    }}
                                    disabled={emailActionBusy ? (!selectedAudienceCount && getCampaignRecipientCount(selectedCampaign) === 0)}
                                  >
                                    <SendHorizontal className="h-4 w-4" />
                                    Hemen Gönder
                                  </button>
                                </>
                              ) : null}
                              <button
                                type="button"
                                className="is-danger"
                                onClick={() => {
                                  void handleDeleteEmailCampaign(selectedCampaign);
                                }}
                                disabled={emailActionBusy}
                              >
                                Sil
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="is-secondary"
                                onClick={() => {
                                  void handleSaveEmailCampaignDraft();
                                }}
                                disabled={emailActionBusy || campaignImageUploadBusy || !campaignSubjectInput.trim() || !campaignTextInput.trim()}
                              >
                                <Save className="h-4 w-4" />
                                Taslak Kaydet
                              </button>
                              <button
                                type="button"
                                className="is-secondary"
                                onClick={() => {
                                  void handleScheduleCampaignFromComposer();
                                }}
                                disabled={
                                  emailActionBusy ||
                                  campaignImageUploadBusy ||
                                  campaignSchedule === 'now' ||
                                  !selectedAudienceCount ||
                                  !campaignSubjectInput.trim() ||
                                  !campaignTextInput.trim()
                                }
                              >
                                <Clock className="h-4 w-4" />
                                Zamanla
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void handleSendCampaignFromComposer();
                                }}
                                disabled={emailActionBusy || campaignImageUploadBusy || !selectedAudienceCount || !campaignSubjectInput.trim() || !campaignTextInput.trim()}
                              >
                                <SendHorizontal className="h-4 w-4" />
                                Hemen Gönder
                              </button>
                            </>
                          )
                        ) : campaignComposerMode === 'create' ? (
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
              </AnimatePresence>
            </div>,
            document.body
          ) : null}

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
                              if (openCampaignActionId === campaign.id) {
                                setOpenCampaignActionId(null);
                                setCampaignActionMenuPosition(null);
                                return;
                              }

                              const buttonRect = event.currentTarget.getBoundingClientRect();
                              const menuWidth = 188;
                              const menuHeight = ['published', 'draft', 'scheduled'].includes(campaign.status) ? 132 : 92;
                              const viewportGap = 12;
                              const sideGap = 10;
                              const hasRoomLeft = buttonRect.left >= menuWidth + viewportGap + sideGap;
                              const placement = hasRoomLeft ? 'left' : 'right';
                              const left = placement === 'left'
 buttonRect.left - menuWidth - sideGap
                                : Math.min(
                                    window.innerWidth - menuWidth - viewportGap,
                                    buttonRect.right + sideGap
                                  );
                              const preferredTop = buttonRect.top + buttonRect.height / 2 - menuHeight / 2;
                              const top = Math.min(
                                window.innerHeight - menuHeight - viewportGap,
                                Math.max(viewportGap, preferredTop)
                              );

                              setCampaignActionMenuPosition({
                                top,
                                left,
                                placement,
                              });
                              setOpenCampaignActionId(campaign.id);
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {typeof document !== 'undefined' || createPortal(
                            <AnimatePresence>
                              {openCampaignActionId === campaign.id ? (
                              <motion.div
                                ? className={`admin-campaign-action-menu ${
                                  campaignActionMenuPosition?.placement === 'left' ? 'is-left' : 'is-right'
                                }`}
                                style={
                                  campaignActionMenuPosition
 ? {
                                        top: campaignActionMenuPosition.top,
                                        left: campaignActionMenuPosition.left,
                                      }
                                    : undefined
                                }
                                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                                transition={{ duration: 0.16, ease: 'easeOut' }}
                                onClick={(event) => event.stopPropagation()}
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
                            </AnimatePresence>,
                            document.body
                          ) : null}
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
                {formatCompactNumber(qrDashboardSummary.totalStands)} QR masa · {formatCompactNumber(qrDashboardSummary.totalQrPhotos || 0)} fotoğraf
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
                <span>%{formatCompactNumber(qrDashboardSummary.activityRate || 0)} doluluk</span>
                <span>{formatCompactNumber(qrDashboardSummary.pendingRequests)} bekleyen talep</span>
              </div>
            </div>

            <div className="admin-qr-table">
              <div className="admin-qr-table-row is-head">
                <span>QR Masası</span>
                <span>Fotoğraf</span>
                <span>Son Aktivite</span>
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
                        <strong>{formatCompactNumber(stand.photoCount || 0)}</strong>
                        <small>Paylaşım</small>
                      </span>
                      <span className="admin-qr-number-cell">
                        <strong>{stand.lastActivityAt ? formatDateLabelWithYear(new Date(stand.lastActivityAt)) : '-'}</strong>
                        <small>{stand.lastActivityAt ? 'Güncel' : 'Bekliyor'}</small>
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
              <span>{formatCompactNumber(qrDashboardRows.length)} QR masa listeleniyor</span>
              <span>
                Son aktivite: {qrDashboardSummary.latestActivityAt ? formatDateLabelWithYear(new Date(qrDashboardSummary.latestActivityAt)) : 'Yok'}
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
                className="admin-qr-request-modal"
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
                  <button type="button" onClick={closeQrRequestModal} aria-label="Talebi kapat" className="admin-qr-request-close">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form className="admin-qr-request-form" onSubmit={handleQrRequestSubmit}>
                  <div className="admin-qr-request-grid">
                    <label>
                      <span>Yetkili kişi</span>
                      <input
                        type="text"
                        value={qrRequestForm.contactName}
                        onChange={(event) => setQrRequestForm((current) => ({ ...current, contactName: event.target.value }))}
                        placeholder="Ad soyad"
                        required
                      />
                    </label>
                    <label>
                      <span>E-posta</span>
                      <input
                        type="email"
                        value={qrRequestForm.contactEmail}
                        onChange={(event) => setQrRequestForm((current) => ({ ...current, contactEmail: event.target.value }))}
                        placeholder="ornek@kafe.com"
                        required
                      />
                    </label>
                    <label>
                      <span>Telefon</span>
                      <input
                        type="tel"
                        value={qrRequestForm.contactPhone}
                        onChange={(event) => setQrRequestForm((current) => ({ ...current, contactPhone: event.target.value }))}
                        placeholder="+90 ..."
                        required
                      />
                    </label>
                    <label>
                      <span>Stand adı</span>
                      <input
                        type="text"
                        value={qrRequestForm.standName}
                        onChange={(event) => setQrRequestForm((current) => ({ ...current, standName: event.target.value }))}
                        placeholder="Bahçe Masaları, Kasa Üstü..."
                      />
                    </label>
                    <label>
                      <span>Kurulum konumu</span>
                      <input
                        type="text"
                        value={qrRequestForm.location}
                        onChange={(event) => setQrRequestForm((current) => ({ ...current, location: event.target.value }))}
                        placeholder="Kafe içi, teras, üst kat..."
                        required
                      />
                    </label>
                    <label>
                      <span>Stand adedi</span>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={qrRequestForm.tableCount}
                        onChange={(event) => setQrRequestForm((current) => ({ ...current, tableCount: event.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      <span>Tercih edilen tarih</span>
                      <input
                        type="date"
                        value={qrRequestForm.preferredDate}
                        onChange={(event) => setQrRequestForm((current) => ({ ...current, preferredDate: event.target.value }))}
                      />
                    </label>
                    <label>
                      <span>Yerleşim detayı</span>
                      <input
                        type="text"
                        value={qrRequestForm.placement}
                        onChange={(event) => setQrRequestForm((current) => ({ ...current, placement: event.target.value }))}
                        placeholder="Masa üstü, duvar yanı, kasa önü..."
                      />
                    </label>
                    <label className="admin-qr-request-notes">
                      <span>Ek not</span>
                      <textarea
                        rows={3}
                        value={qrRequestForm.notes}
                        onChange={(event) => setQrRequestForm((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Ölçü, marka rengi, yoğun saat veya özel istek"
                      />
                    </label>
                  </div>

                  <div className="admin-qr-request-actions">
                    <button type="button" className="admin-qr-ghost-button" onClick={closeQrRequestModal}>
                      Vazgeç
                    </button>
                    <button type="submit" className="admin-qr-whatsapp-button" disabled={qrRequestSubmitting}>
                      <SendHorizontal className="h-4 w-4" />
                      {qrRequestSubmitting ? 'Hazırlanıyor...' : 'WhatsApp ile Gönder'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <section className={`admin-customers-dashboard ${activeView === 'customers' ? '' : 'hidden'}`}>
          <motion.div
            className="admin-customers-head"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="admin-customers-head-main">
              <div className="admin-customers-head-copy">
                <h2>Kayıtlar</h2>
                <span>{formatCompactNumber(customerTotal)} müşteri</span>
              </div>
              <div className="admin-customers-head-chips" aria-label="Müşteri özeti">
                <span><FileSpreadsheet className="h-3.5 w-3.5" /> Güncel rapor</span>
                <span><SlidersHorizontal className="h-3.5 w-3.5" /> Seçili filtreler</span>
              </div>
            </div>
            <div className="admin-customers-actions">
              <button type="button" className="admin-customers-ghost" onClick={handleExportCustomers} disabled={customerExporting}>
                <Download className="h-4 w-4" />
                {customerExporting ? 'Hazırlanıyor...' : 'Dışa Aktar'}
              </button>
            </div>
          </motion.div>

          {emailNotice && activeView === 'customers' ? <div className="admin-qr-success">{emailNotice}</div> : null}

          <div className="admin-customers-metrics">
            {[
              {
                label: 'Bu Ay Yeni Kayıt',
                value: customerStatValue(customerStats.newCustomers),
                footer: 'Google ile kayıt olanlar',
                detail: customerTrendDetail(customerStats.trends.newCustomers),
                tone: customerStats.trends.newCustomers < 0 ? 'is-down' : 'is-up',
                icon: UserPlus,
              },
              {
                label: 'Sadık Müşteriler',
                value: customerStatValue(customerStats.loyalCustomers),
                footer: 'Tekrar iletişim kurulanlar',
                detail: customerRatioDetail(customerStats.trends.loyalCustomers, 'toplam içinde'),
                tone: 'is-up',
                icon: Crown,
              },
              {
                label: 'E-posta İzni',
                value: customerStatValue(customerStats.emailSubscribers),
                footer: 'Kampanya alabilir',
                detail: customerRatioDetail(customerStats.trends.emailSubscribers, 'izin oranı'),
                tone: 'is-up',
                icon: Mail,
              },
              {
                label: 'Kampanya Erişimi',
                value: customerStatValue(customerStats.campaignReachedCustomers),
                footer: 'En az 1 gönderim alan',
                detail: customerRatioDetail(customerStats.trends.campaignReachedCustomers, 'ulaşıldı'),
                tone: 'is-up',
                icon: SendHorizontal,
              },
              {
                label: 'Son 7 Gün Aktif',
                value: customerStatValue(customerStats.activeCustomers),
                footer: 'Siteye dönen kayıtlar',
                detail: customerTrendDetail(customerStats.trends.activeCustomers),
                tone: customerStats.trends.activeCustomers < 0 ? 'is-down' : 'is-up',
                icon: MousePointer2,
              },
            ].map((metric, index) => {
              const Icon = metric.icon;

              return (
                <motion.article
                  key={metric.label}
                  className="admin-customers-metric-card"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: index * 0.04 }}
                  whileHover={{ y: -4 }}
                >
                  <span className="admin-customers-metric-icon">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="admin-customers-metric-label">{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <div>
                    <small>{metric.footer}</small>
                    <em className={metric.tone}>{metric.detail}</em>
                  </div>
                </motion.article>
              );
            })}
          </div>

          <div className="admin-customers-layout">
            <motion.div
              className="admin-customers-main"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.06 }}
            >
              <div className="admin-customers-filterbar">
                <label className="admin-customers-search">
                  <Search className="h-4 w-4" />
                  <input
                    type="search"
                    placeholder="Müşteri ara..."
                    value={customerSearchTerm}
                    onChange={(event) => setCustomerSearchTerm(event.target.value)}
                  />
                </label>
                <DropdownSelect
                  value={customerSegmentFilter}
                  options={customerSegmentSelectOptions}
                  onChange={handleCustomerSegmentFilterChange}
                  ariaLabel="Müşteri segmenti"
                  className="admin-customers-select"
                />
                <button type="button" className="admin-customers-filter-button" onClick={() => void loadCustomerPanelData()}>
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtrele
                </button>
                <div className="admin-customers-count">
                  <span>{formatCompactNumber(customerTotal)} müşteri</span>
                  <button type="button" disabled={customerPage <= 1} onClick={() => setCustomerPage((page) => Math.max(1, page - 1))}>
                    <ChevronDown className="h-4 w-4 rotate-90" />
                  </button>
                  <small>/ {customerPageCount}</small>
                  <button type="button" disabled={customerPage >= customerPageCount} onClick={() => setCustomerPage((page) => Math.min(customerPageCount, page + 1))}>
                    <ChevronDown className="h-4 w-4 -rotate-90" />
                  </button>
                </div>
              </div>

              <div className="admin-customers-table-card">
                <div className="admin-customers-row is-head">
                  <span>Müşteri</span>
                  <span>E-posta</span>
                  <span>Segment</span>
                  <span>Kayıt Tarihi</span>
                  <span>Son Aktivite</span>
                  <span>Kampanya</span>
                  <span>E-posta İzni</span>
                </div>

                {customerLoading ? (
                  <div className="admin-customers-empty">Müşteri verileri yükleniyor...</div>
                ) : customerRows.length > 0 ? (
                  customerRows.map((customer, index) => {
                    const segmentMeta = getCustomerSegmentMeta(customer.segment);
                    const interactionMeta = getCustomerInteractionMeta(customer.lastInteractionType);
                    const campaignCount = customer._count?.recipients || 0;

                    return (
                      <motion.div
                        key={customer.id || customer.email}
                        className="admin-customers-row"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.16) }}
                      >
                        <span className="admin-customers-person" data-label="Müşteri">
                          <i className={segmentMeta.className}>{getCustomerInitials(customer)}</i>
                          <span>
                            <b>{getCustomerDisplayName(customer)}</b>
                            <small>#{customer.id.slice(-5).toUpperCase()}</small>
                          </span>
                        </span>
                        <span className="admin-customers-muted admin-customers-email" data-label="E-posta">{customer.email}</span>
                        <span data-label="Segment">
                          <strong className={`admin-customers-segment ${segmentMeta.className}`}>
                            {segmentMeta.label}
                          </strong>
                        </span>
                        <span className="admin-customers-muted" data-label="Kayıt Tarihi">{formatCustomerDate(customer.createdAt)}</span>
                        <span className="admin-customers-interaction" data-label="Son Aktivite">
                          <b>{formatCustomerDate(customer.lastInteractionAt || customer.updatedAt)}</b>
                          <small className={interactionMeta.className}>{interactionMeta.label}</small>
                        </span>
                        <span className="admin-customers-campaigns" data-label="Kampanya">
                          <b>{formatCompactNumber(campaignCount)}</b>
                          <small>gönderim</small>
                        </span>
                        <span
                          className={`admin-customers-subscription ${customer.emailSubscribed === false ? 'is-passive' : 'is-active'}`}
                          data-label="E-posta İzni"
                        >
                          {customer.emailSubscribed === false ? 'Kapalı' : 'Aktif'}
                        </span>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="admin-customers-empty">Bu filtrelere uygun müşteri bulunmuyor.</div>
                )}

                <div className="admin-customers-footer">
                  <span>{customerPageStart} - {customerPageEnd} / {formatCompactNumber(customerTotal)}</span>
                  <div className="admin-customers-pagination">
                    <button type="button" disabled={customerPage <= 1} onClick={() => setCustomerPage((page) => Math.max(1, page - 1))}>
                      <ChevronDown className="h-4 w-4 rotate-90" />
                    </button>
                    {customerPaginationItems.map((page, index) => (
                      <React.Fragment key={page}>
                        {index > 0 && page - customerPaginationItems[index - 1] > 1 ? <span>...</span> : null}
                        <button
                          type="button"
                          className={page === customerPage ? 'is-active' : ''}
                          onClick={() => setCustomerPage(page)}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                    <button type="button" disabled={customerPage >= customerPageCount} onClick={() => setCustomerPage((page) => Math.min(customerPageCount, page + 1))}>
                      <ChevronDown className="h-4 w-4 -rotate-90" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.aside
              className="admin-customers-side"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.28, delay: 0.1 }}
            >
              <motion.article className="admin-customers-side-card" whileHover={{ y: -2 }}>
                <h3>Segmentlere Göre Dağılım</h3>
                <div className="admin-customers-donut-wrap">
                  <div className="admin-customers-donut" style={{ background: customerSegmentGradient }} />
                  <div className="admin-customers-legend">
                    {customerSegments.length > 0 ? (
                      customerSegments.map((segment) => (
                        <span key={segment.key}>
                          <i style={{ background: segment.color }} />
                          <b>{getCustomerSegmentMeta(segment.key).label}</b>
                          <small>{formatCompactNumber(segment.count)} (%{segment.percent.toLocaleString('tr-TR')})</small>
                        </span>
                      ))
                    ) : (
                      <p>Henüz segment verisi yok.</p>
                    )}
                  </div>
                </div>
              </motion.article>

              <motion.article className="admin-customers-side-card" whileHover={{ y: -2 }}>
                <h3>Etkileşim Durumu</h3>
                <div className="admin-customers-progress-list">
                  {customerInteractions.length > 0 ? (
                    customerInteractions.map((interaction) => {
                      const meta = getCustomerInteractionMeta(interaction.key);
                      return (
                        <span key={interaction.key}>
                          <b>{meta.label}</b>
                          <i><em style={{ width: `${Math.min(100, interaction.percent)}%`, background: interaction.color }} /></i>
                          <small>{formatCompactNumber(interaction.count)} (%{interaction.percent.toLocaleString('tr-TR')})</small>
                        </span>
                      );
                    })
                  ) : (
                    <p>Henüz etkileşim verisi yok.</p>
                  )}
                </div>
              </motion.article>

              <motion.article className="admin-customers-side-card admin-customers-top-card" whileHover={{ y: -2 }}>
                <div className="admin-customers-side-card-head">
                  <h3>En Aktif Müşteriler</h3>
                  <span>{customerTopRows.length > 0 ? `${customerTopRows.length} kayıt` : 'Veri yok'}</span>
                </div>
                <div className="admin-customers-top-list">
                  {customerTopRows.length > 0 ? (
                    customerTopRows.map((customer, index) => {
                      const segmentMeta = getCustomerSegmentMeta(customer.segment);
                      const campaignCount = customer._count?.recipients || 0;
                      return (
                        <span key={customer.id || customer.email}>
                          <i>{index + 1}</i>
                          <b className={segmentMeta.className}>{getCustomerInitials(customer)}</b>
                          <strong>{getCustomerDisplayName(customer)}</strong>
                          <small>{formatCompactNumber(campaignCount)} kampanya</small>
                        </span>
                      );
                    })
                  ) : (
                    <p>Henüz müşteri verisi yok.</p>
                  )}
                </div>
              </motion.article>
            </motion.aside>
          </div>
        </section>

        <section className={`admin-email-template-library ${activeView === 'templates' && templatesSubView === 'email' ? '' : 'hidden'}`}>
          <div className="admin-template-library-toolbar">
            <label className="admin-template-search">
              <Search className="h-4 w-4" />
              <input
                type="search"
                value={templateSearchTerm}
                onChange={(event) => setTemplateSearchTerm(event.target.value)}
                placeholder="Şablon ara..."
              />
            </label>

            <div className="admin-template-tabs" role="tablist" aria-label="E-posta şablonu kategorileri">
              {templateCategoryStats.map((item) => (
                <button
                  key={item.category}
                  type="button"
                  className={templateCategoryFilter === item.category ? 'is-active' : ''}
                  onClick={() => setTemplateCategoryFilter(item.category)}
                >
                  {item.category}
                  {item.category !== 'Tümü' && item.count > 0 ? <span>{item.count}</span> : null}
                </button>
              ))}
            </div>

            <div className="admin-template-toolbar-actions">
              <DropdownSelect
                value={templateSort}
                onChange={setTemplateSort}
                options={TEMPLATE_SORT_OPTIONS}
                ariaLabel="Şablon sıralaması"
                className="admin-template-sort"
                menuClassName="admin-email-filter-menu"
              />
              <button
                type="button"
                className={templateViewMode === 'grid' ? 'is-active' : ''}
                onClick={() => setTemplateViewMode('grid')}
                aria-label="Kart görünümü"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={templateViewMode === 'list' ? 'is-active' : ''}
                onClick={() => setTemplateViewMode('list')}
                aria-label="Liste görünümü"
              >
                <List className="h-4 w-4" />
              </button>
              <button type="button" className="is-create" onClick={() => openEmailTemplateEditor()}>
                <Plus className="h-4 w-4" />
                Yeni
              </button>
            </div>
          </div>

          {emailNotice && activeView === 'templates' ? (
            <div className="admin-template-notice">{emailNotice}</div>
          ) : null}

          {templateLoading ? (
            <div className="admin-template-loading">
              <Sparkles className="h-5 w-5" />
              Şablonlar yükleniyor...
            </div>
          ) : (
            <div className={`admin-template-grid is-${templateViewMode}`}>
              {emailTemplateRows.map((template, index) => {
                const category = template.category ?? 'Kampanya';
                const categoryClass = getTemplateCategoryClass(category);
                const previewText = template.description || template.textContent.split('\n\n')[0] || 'Hazır e-posta mesajı.';

                return (
                  <article key={template.key} className={`admin-template-mail-card ${template.tone ? `tone-${template.tone}` : ''}`}>
                    <div className="admin-template-preview" style={{ '--delay': `${Math.min(index * 0.025, 0.16)}s` } as React.CSSProperties}>
                      {template.imageUrl ? (
                        <img src={template.imageUrl} alt={template.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                      ) : null}
                      <div>
                        <h3>{template.title}</h3>
                        <p>{template.textContent.split('\n\n')[0]}</p>
                        <button type="button" tabIndex={-1}>{template.ctaLabel || 'Kullan'}</button>
                      </div>
                    </div>
                    <div className="admin-template-card-copy">
                      <div>
                        <strong>{template.title.replace(/[☕✨🎉🌙⭐📝♫🌷]/g, '').trim() || template.title}</strong>
                        <span className={categoryClass}>{category}</span>
                      </div>
                      <p>{previewText}</p>
                    </div>
                    <div className="admin-template-card-actions">
                      <button
                        type="button"
                        onClick={() => { void handleUseEmailTemplate(template); }}
                        disabled={templateActionBusy === `use-${template.key}`}
                      >
                        Kullan
                      </button>
                      <button type="button" aria-label="Şablonu düzenle" onClick={() => openEmailTemplateEditor(template)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <div className="admin-template-card-menu" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          aria-label="Şablon seçenekleri"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenTemplateActionKey((current) => current === template.key ? null : template.key);
                          }}
                          disabled={templateActionBusy === `archive-${template.key}`}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                        {openTemplateActionKey === template.key ? (
                          <div className="admin-template-action-menu">
                            <button type="button" onClick={() => openEmailTemplateEditor(template)}>
                              <Pencil className="h-3.5 w-3.5" />
                              Düzenle
                            </button>
                            <button
                              type="button"
                              className="is-danger"
                              onClick={() => {
                                setOpenTemplateActionKey(null);
                                void handleArchiveEmailTemplate(template);
                              }}
                            >
                              <Archive className="h-3.5 w-3.5" />
                              Arşivle
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!templateLoading && emailTemplateRows.length === 0 ? (
            <div className="admin-template-empty">
              <Mail className="h-5 w-5" />
              Bu filtrede e-posta şablonu bulunamadı.
            </div>
          ) : null}

          {!templateLoading && emailTemplateTotal > 0 ? (
            <div className="admin-template-pagination-wrap">
              <span>
                {formatCompactNumber(emailTemplateTotal)} şablon
                {templatePageCount > 1 ? ` · ${templatePage}/${templatePageCount}. sayfa` : ''}
              </span>
              {templatePageCount > 1 ? (
                <div className="admin-template-pagination" aria-label="Şablon sayfaları">
                  <button
                    type="button"
                    disabled={templatePage <= 1}
                    onClick={() => setTemplatePage((page) => Math.max(1, page - 1))}
                    aria-label="Önceki sayfa"
                  >
                    <ChevronDown className="h-4 w-4 rotate-90" />
                  </button>
                  {templatePaginationItems.map((item, index) => (
                    item === 'ellipsis' ? (
                      <span key={`ellipsis-${index}`}>...</span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        className={item === templatePage ? 'is-active' : ''}
                        onClick={() => setTemplatePage(item)}
                        aria-current={item === templatePage ? 'page' : undefined}
                      >
                        {item}
                      </button>
                    )
                  ))}
                  <button
                    type="button"
                    disabled={templatePage >= templatePageCount}
                    onClick={() => setTemplatePage((page) => Math.min(templatePageCount, page + 1))}
                    aria-label="Sonraki sayfa"
                  >
                    <ChevronDown className="h-4 w-4 -rotate-90" />
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {templateEditorOpen && typeof document !== 'undefined' || createPortal(
            <div className="admin-template-editor-portal">
              <AnimatePresence>
                {templateEditorOpen ? (
                  <motion.div
                    className="admin-template-editor-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.form
                      className="admin-template-editor"
                      onSubmit={(event) => { void handleSaveEmailTemplate(event); }}
                      initial={{ opacity: 0, y: 14, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      <div className="admin-template-editor-head">
                        <div>
                          <span>{editingTemplate ? 'Şablonu düzenle' : 'Yeni e-posta şablonu'}</span>
                          <h3>{editingTemplate?.title || 'Hazır tasarım oluştur'}</h3>
                        </div>
                        <button type="button" onClick={() => setTemplateEditorOpen(false)} aria-label="Pencereyi kapat">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="admin-template-editor-grid">
                        <label>
                          <span>Şablon adı</span>
                          <input
                            value={templateForm.title}
                            onChange={(event) => setTemplateForm((current) => ({ ...current, title: event.target.value }))}
                            placeholder="Örn: Hafta Sonu Kahve Keyfi"
                          />
                        </label>
                        <label className="admin-template-editor-select">
                          <span>Kategori</span>
                          <DropdownSelect
                            value={templateForm.category}
                            onChange={(category) => setTemplateForm((current) => ({ ...current, category }))}
                            options={TEMPLATE_CATEGORY_SELECT_OPTIONS}
                            ariaLabel="Şablon kategorisi"
                            className="admin-template-category-select"
                            menuClassName="admin-template-category-menu"
                          />
                        </label>
                        <label className="is-wide">
                          <span>Konu satırı</span>
                          <input
                            value={templateForm.subject}
                            onChange={(event) => setTemplateForm((current) => ({ ...current, subject: event.target.value }))}
                            placeholder="Müşterinin inbox'ta göreceği başlık"
                          />
                        </label>
                        <label className="is-wide">
                          <span>Kısa açıklama</span>
                          <input
                            value={templateForm.description}
                            onChange={(event) => setTemplateForm((current) => ({ ...current, description: event.target.value }))}
                            placeholder="Kart üzerinde görünen kısa açıklama"
                          />
                        </label>
                        <label>
                          <span>Görsel URL</span>
                          <input
                            value={templateForm.imageUrl}
                            onChange={(event) => setTemplateForm((current) => ({ ...current, imageUrl: event.target.value }))}
                            placeholder="https://..."
                          />
                        </label>
                        <label>
                          <span>Buton metni</span>
                          <input
                            value={templateForm.ctaLabel}
                            onChange={(event) => setTemplateForm((current) => ({ ...current, ctaLabel: event.target.value }))}
                            placeholder="Hemen Kullan"
                          />
                        </label>
                        <label className="is-wide">
                          <span>E-posta metni</span>
                          <textarea
                            value={templateForm.textContent}
                            onChange={(event) => setTemplateForm((current) => ({ ...current, textContent: event.target.value }))}
                            rows={7}
                            placeholder="Merhaba,..."
                          />
                        </label>
                      </div>

                      <div className="admin-template-editor-actions">
                        <button type="button" className="is-secondary" onClick={() => setTemplateEditorOpen(false)}>
                          Vazgeç
                        </button>
                        <button type="submit" disabled={Boolean(templateActionBusy)}>
                          <Save className="h-4 w-4" />
                          Kaydet
                        </button>
                      </div>
                    </motion.form>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>,
            document.body
          ) : null}
        </section>

        {/* ─── Story Şablonları ─── */}
        <section className={`admin-story-templates ${activeView === 'templates' && templatesSubView === 'story' ? '' : 'hidden'}`}>
          <div className="admin-story-templates-hero">
            <div className="admin-story-templates-copy">
              <span>Story Akışı</span>
              <h2>Story Şablonları</h2>
              <p>
                Müşteri paylaşım simgesine bastığında seçili şablon hazırlanır. Yeşil ekran alanı müşterinin fotoğrafıyla doldurulur, şablonun diğer detayları korunur.
              </p>
              <div className="admin-story-flow" aria-label="Story paylaşım akışı">
                <span><Share2 className="h-4 w-4" /> Paylaş</span>
                <i />
                <span><ImageIcon className="h-4 w-4" /> Şablon</span>
                <i />
                <span><Smartphone className="h-4 w-4" /> Story</span>
              </div>
            </div>

            <aside className="admin-story-active-panel" style={{ '--story-accent': previewStoryTemplate.accent } as React.CSSProperties}>
              <div className="admin-story-active-copy">
                <span>Aktif Şablon</span>
                <strong>{selectedStoryTemplate ? selectedStoryTemplate.name : 'Henüz seçilmedi'}</strong>
                <p>{selectedStoryTemplate ? selectedStoryTemplate.bestFor : 'Bir şablon seçildiğinde tüm yeni story paylaşımlarında otomatik uygulanır.'}</p>
              </div>
              <div className="admin-story-phone-preview">
                <img src={previewStoryTemplate.url} alt={previewStoryTemplate.name} loading="lazy" decoding="async" />
                <b>{selectedStoryTemplate ? 'Yayında' : 'Önizleme'}</b>
              </div>
            </aside>
          </div>

          {hasUnsupportedStoryTemplate ? (
            <div className="admin-story-template-warning">
              <ShieldCheck className="h-4 w-4" />
              <span>Kayıtlı story şablonu onaylı listede değil. Lütfen aşağıdaki güvenli şablonlardan birini seçin.</span>
            </div>
          ) : null}

          <div className="admin-story-template-toolbar">
            <div>
              <strong>{STORY_TEMPLATES.length} onaylı şablon</strong>
              <span>9:16 format, yeşil ekran maskeleme ve güvenli şablon seçimi</span>
            </div>
            <span className={selectedStoryTemplate ? 'is-ready' : 'is-pending'}>
              {selectedStoryTemplate ? 'Story akışı hazır' : 'Şablon seçimi bekleniyor'}
            </span>
          </div>

          <div className="admin-story-templates-grid">
            {STORY_TEMPLATES.map((template, index) => {
              const isActive = effectiveActiveStoryTemplateUrl === template.url;
              const isBusy = storyTemplateSavingKey === template.key ? (storyTemplateSavingKey !== null && !isActive);
              return (
                <motion.article
                  key={template.key}
                  className={`admin-story-template-card ${isActive ? 'is-active' : ''}`}
                  style={{ '--story-accent': template.accent, '--story-index': index } as React.CSSProperties}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.035, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -5 }}
                >
                  <div className="admin-story-template-preview">
                    <img src={template.url} alt={`${template.name} story şablonu`} loading="lazy" decoding="async" />
                    <div className="admin-story-template-preview-top">
                      <span>{template.style}</span>
                      {isActive ? (
                        <b><Check className="h-3.5 w-3.5" /> Aktif</b>
                      ) : null}
                    </div>
                    <div className="admin-story-green-note">Yeşil alan fotoğrafla dolar</div>
                  </div>
                  <div className="admin-story-template-info">
                    <div className="admin-story-template-title">
                      <strong>{template.name}</strong>
                      <span>9:16</span>
                    </div>
                    <p>{template.description}</p>
                    <small>{template.bestFor}</small>
                    <button
                      type="button"
                      className={`admin-story-template-btn ${isActive ? 'is-active' : ''}`}
                      disabled={isBusy || !canManageWorkspace}
                      onClick={() => void handleSelectStoryTemplate(template)}
                    >
                      {storyTemplateSavingKey === template.key ? (
                        <>
                          <span className="admin-story-spinner" />
                          Kaydediliyor
                        </>
                      ) : isActive ? (
                        <>
                          <Check className="h-4 w-4" />
                          Aktif Şablon
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Bu Şablonu Kullan
                        </>
                      )}
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>

        <section id="admin-email" className={`admin-email-marketing-page scroll-mt-28 lg:scroll-mt-32 ${activeView === 'marketing' ? '' : 'hidden'}`}>
          <div className="admin-email-marketing-head">
            <div>
              <h2>E-posta Pazarlama</h2>
              <p>Müşterilerinizle güçlü ilişkiler kurun, sadakati artırın.</p>
            </div>
            <div className="admin-email-marketing-actions">
              <button type="button" className="admin-email-secondary-action" onClick={openRecipientManager}>
                <Users className="h-4 w-4" />
                E-posta Listesini Yönet
              </button>
              <button type="button" className="admin-email-primary-action" onClick={() => openMarketingEmailComposer()}>
                <Plus className="h-4 w-4" />
                Yeni Kampanya
              </button>
            </div>
          </div>

          <div className="admin-email-kpi-grid">
            {marketingKpiCards.map((card, index) => {
              const Icon = card.icon;

              return (
                <motion.article
                  key={card.label}
                  className={`admin-email-kpi-card is-${card.tone}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...CHART_MOTION_TRANSITION, delay: Math.min(index * 0.035, 0.16) }}
                >
                  <div>
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                    <small>
                      <TrendingUp className="h-3.5 w-3.5" />
                      {card.trend}
                    </small>
                  </div>
                  <i>
                    <Icon className="h-6 w-6" />
                  </i>
                </motion.article>
              );
            })}
          </div>

          <AnimatePresence initial={false}>
            {isRecipientManagerOpen ? (
              <motion.section
                ref={recipientManagerRef}
                className="admin-email-recipient-manager"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <div className="admin-email-recipient-head">
                  <div>
                    <span>Alıcı listesi</span>
                    <h3>{formatCompactNumber(activeRecipientCustomers.length)} aktif e-posta</h3>
                    <p>{formatCompactNumber(inactiveRecipientCustomers.length)} alıcı listeden çıkarılmış, gerektiğinde geri eklenebilir.</p>
                  </div>
                  <button type="button" onClick={() => setIsRecipientManagerOpen(false)} aria-label="Alıcı listesini gizle">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form className="admin-email-recipient-form" onSubmit={(event) => { void handleAddMarketingRecipient(event); }}>
                  <label>
                    <span>Ad</span>
                    <input
                      type="text"
                      value={recipientNameInput}
                      onChange={(event) => setRecipientNameInput(event.target.value)}
                      placeholder="İsteğe bağlı"
                    />
                  </label>
                  <label>
                    <span>E-posta</span>
                    <input
                      type="email"
                      value={recipientEmailInput}
                      onChange={(event) => setRecipientEmailInput(event.target.value)}
                      placeholder="musteri@example.com"
                    />
                  </label>
                  <button type="submit" disabled={recipientActionBusy === 'add'}>
                    <UserPlus className="h-4 w-4" />
                    Ekle
                  </button>
                </form>

                <div className="admin-email-recipient-segments" role="radiogroup" aria-label="Alıcı kategorisi">
                  {recipientCategoryGroups.map((group) => {
                    const isSelected = group.key === recipientManagerCategoryKey;
                    const activeCount = group.customers.filter(isMarketingListCustomer).length;
                    const inactiveCount = group.customers.length - activeCount;

                    return (
                      <button
                        key={group.key}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={isSelected ? 'is-selected' : ''}
                        onClick={() => setRecipientManagerCategoryKey(group.key)}
                      >
                        <strong>{group.label}</strong>
                        <span>{activeCount} aktif · {inactiveCount} çıkarılmış</span>
                      </button>
                    );
                  })}
                </div>

                <div className="admin-email-recipient-bulk-panel">
                  <div>
                    <span>Kategori işlemleri</span>
                    <strong>{selectedRecipientCategory?.label || 'Alıcı listesi'}</strong>
                    <small>
                      {selectedRecipientCategoryActiveCustomers.length} aktif alıcı, {selectedRecipientCategoryInactiveCustomers.length} geri eklenebilir kayıt
                    </small>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="is-restore"
                      onClick={() => { void handleSetMarketingRecipientsSubscribed(selectedRecipientCategoryInactiveCustomers, true); }}
                      disabled={recipientActionBusy === 'bulk-add' || selectedRecipientCategoryInactiveCustomers.length === 0}
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      Geri ekle
                    </button>
                    <button
                      type="button"
                      className="is-remove"
                      onClick={() => { void handleSetMarketingRecipientsSubscribed(selectedRecipientCategoryActiveCustomers, false); }}
                      disabled={recipientActionBusy === 'bulk-remove' || selectedRecipientCategoryActiveCustomers.length === 0}
                    >
                      <X className="h-3.5 w-3.5" />
                      Listeden çıkar
                    </button>
                  </div>
                </div>

                <div className="admin-email-recipient-toolbar">
                  <label>
                    <Search className="h-4 w-4" />
                    <input
                      type="search"
                      value={recipientSearchTerm}
                      onChange={(event) => setRecipientSearchTerm(event.target.value)}
                      placeholder="Alıcı ara"
                    />
                  </label>
                  <span>
                    {filteredRecipientCustomers.length === allRecipientCustomers.length
 `${formatCompactNumber(allRecipientCustomers.length)} kişi`
                      : `${formatCompactNumber(filteredRecipientCustomers.length)} sonuç`}
                  </span>
                </div>

                <div className="admin-email-recipient-list">
                  {visibleRecipientCustomers.length > 0 ? (
                    visibleRecipientCustomers.map((customer) => {
                      const isInactive = customer.emailSubscribed === false;

                      return (
                        <div key={customer.id ? customer.email} className={`admin-email-recipient-row ${isInactive ? 'is-passive' : ''}`}>
                          <i>{getCustomerInitials(customer)}</i>
                          <div>
                            <strong>{getCustomerDisplayName(customer)}</strong>
                            <small>{customer.email} · {isInactive ? 'Listeden çıkarılmış' : 'Aktif'}</small>
                          </div>
                          <button
                            type="button"
                            className={isInactive ? 'is-restore' : undefined}
                            onClick={() => {
                              void (isInactive
 handleRestoreMarketingRecipient(customer)
                                : handleRemoveMarketingRecipient(customer));
                            }}
                            disabled={recipientActionBusy === customer.id}
                          >
                            {isInactive ? <RotateCw className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                            {isInactive ? 'Geri ekle' : 'Çıkar'}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="admin-email-recipient-empty">Bu aramada alıcı bulunmadı.</p>
                  )}
                </div>

                {filteredRecipientCustomers.length > visibleRecipientCustomers.length ? (
                  <p className="admin-email-recipient-more">
                    +{formatCompactNumber(filteredRecipientCustomers.length - visibleRecipientCustomers.length)} alıcı daha var. Arama ile daraltabilirsiniz.
                  </p>
                ) : null}
              </motion.section>
            ) : null}
          </AnimatePresence>

          {emailNotice ? (
            <motion.div
              ? className="admin-email-marketing-notice"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              role="status"
            >
              {emailNotice}
            </motion.div>
          ) : null}

          <div className="admin-email-marketing-layout">
            <section className="admin-email-campaign-panel">
              <div className="admin-email-campaign-panel-head">
                <div>
                  <h3>Kampanyalar</h3>
                  <span>
                    {marketingFilteredCampaigns.length > 0
 `${marketingFilteredCampaigns.length} kampanya`
                      : 'Kampanya yok'}
                  </span>
                </div>
                <DropdownSelect
                  value={marketingCampaignFilter}
                  onChange={setMarketingCampaignFilter}
                  options={marketingCampaignFilterOptions}
                  ariaLabel="Kampanya durum filtresi"
                  className="admin-email-filter-select"
                  menuClassName="admin-email-filter-menu"
                />
              </div>

              {emailLoading ? (
                <div className="admin-email-campaign-empty">
                  <Sparkles className="h-6 w-6" />
                  <strong>Kampanyalar yükleniyor</strong>
                  <p>Gerçek e-posta verileri hazırlanıyor.</p>
                </div>
              ) : marketingCampaignRows.length === 0 ? (
                <div className="admin-email-campaign-empty">
                  <Mail className="h-6 w-6" />
                  <strong>Henüz kampanya yok</strong>
                  <p>İlk e-posta kampanyanızı oluşturup müşterilerinize ulaşın.</p>
                  <button type="button" onClick={() => openMarketingEmailComposer()}>
                    <Plus className="h-4 w-4" />
                    Kampanya Oluştur
                  </button>
                </div>
              ) : (
                <div className="admin-email-campaign-list">
                  {marketingCampaignRows.map((campaign, index) => {
                    const statusMeta = getCampaignStatusMeta(campaign.status);
                    const recipientCount = getCampaignRecipientCount(campaign);
                    const deliveredCount = Math.max(0, campaign.sentCount ?? 0);
                    const campaignOpenRate = getPercent(getCampaignOpenCount(campaign), deliveredCount);
                    const campaignClickRate = getPercent(getCampaignClickCount(campaign), deliveredCount);
                    const activityDate = campaign.sentAt ?? campaign.scheduledAt || campaign.createdAt;

                    return (
                      <motion.article
                        key={campaign.id}
                        className="admin-email-campaign-row"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ ...CHART_MOTION_TRANSITION, delay: Math.min(index * 0.035, 0.18) }}
                      >
                        <button
                          type="button"
                          className="admin-email-campaign-thumb"
                          onClick={() => openEmailCampaignDetail(campaign)}
                          aria-label={`${campaign.subject} e-posta kampanyasını aç`}
                        >
                          {campaign.imageUrl ? (
                            <img src={campaign.imageUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                          ) : (
                            <span>
                              <Sparkles className="h-5 w-5" />
                              {campaign.subject.slice(0, 24)}
                            </span>
                          )}
                        </button>

                        <div className="admin-email-campaign-main">
                          <span className={`admin-email-status ${statusMeta.className}`}>{statusMeta.label}</span>
                          <button type="button" onClick={() => openEmailCampaignDetail(campaign)}>
                            {campaign.subject}
                          </button>
                          <p>{campaign.description || campaign.textContent || 'Kampanya içeriği hazır.'}</p>
                          <small>
                            {campaign.status === 'scheduled' ? 'Planlanan tarih' : campaign.sentAt ? 'Gönderim tarihi' : 'Oluşturulma tarihi'}:{' '}
                            {formatCampaignDateTime(activityDate)}
                          </small>
                        </div>

                        <div className="admin-email-campaign-stats">
                          <div>
                            <span>Alıcı</span>
                            <strong>{formatCompactNumber(recipientCount)}</strong>
                          </div>
                          <div>
                            <span>Açılma</span>
                            <strong>{formatPercent(campaignOpenRate)}</strong>
                          </div>
                          <div>
                            <span>Tıklama</span>
                            <strong>{formatPercent(campaignClickRate)}</strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="admin-email-row-action"
                          onClick={() => openEmailCampaignDetail(campaign)}
                          aria-label={`${campaign.subject} detaylarını aç`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </motion.article>
                    );
                  })}
                </div>
              )}

              <div className="admin-email-campaign-footer">
                <span>
                  {marketingFilteredCampaigns.length > 0
 `${marketingFilteredCampaigns.length} kampanyadan 1-${marketingCampaignRows.length} arası gösteriliyor`
                    : 'Gösterilecek kampanya bulunmuyor'}
                </span>
                <div>
                  <button type="button" disabled aria-label="Önceki sayfa">
                    <ChevronDown className="h-4 w-4 rotate-90" />
                  </button>
                  <button type="button" className="is-active">1</button>
                  <button type="button" disabled aria-label="Sonraki sayfa">
                    <ChevronDown className="h-4 w-4 -rotate-90" />
                  </button>
                  <small>/ {marketingCampaignTotalPages}</small>
                </div>
              </div>
            </section>

            <aside className="admin-email-side-rail">
              <section className="admin-email-side-card">
                <h3>Hızlı İşlemler</h3>
                <div className="admin-email-source-picker">
                  <span>Pazarlanacak web kampanyası</span>
                  <DropdownSelect
                    value={selectedMarketingSourceCampaign?.id || 'none'}
                    onChange={setSelectedMarketingSourceCampaignId}
                    options={marketingSourceCampaignOptions}
                    ariaLabel="Pazarlanacak web kampanyası"
                    icon={Megaphone}
                    className="admin-email-source-select"
                    menuClassName="admin-email-filter-menu"
                  />
                </div>
                <div className="admin-email-quick-list">
                  <button type="button" onClick={() => openMarketingEmailComposer()} disabled={!selectedMarketingSourceCampaign}>
                    <span><Plus className="h-4 w-4" /></span>
                    <strong>E-posta Kampanyası Oluştur</strong>
                    <small>Seçili web kampanyasını Brevo ile gönderin</small>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openAdminView('templates');
                    }}
                  >
                    <span><FileSpreadsheet className="h-4 w-4" /></span>
                    <strong>Şablonla Hazırla</strong>
                    <small>Hazır e-posta tasarımı uygula</small>
                  </button>
                  <button type="button" onClick={openRecipientManager}>
                    <span><Users className="h-4 w-4" /></span>
                    <strong>E-posta Listesini Yönet</strong>
                    <small>Aboneleri segmentlere ayırın</small>
                  </button>
                </div>
              </section>

              <section className="admin-email-side-card">
                <div className="admin-email-side-head">
                  <h3>Performans Özeti</h3>
                  <span>{dashboardDateRangeLabel}</span>
                </div>
                <div className="admin-email-performance">
                  <div className="admin-email-donut" style={{ background: marketingDonutBackground }}>
                    <span>
                      <strong>{formatCompactNumber(emailDeliveredTotal)}</strong>
                      Gönderim
                    </span>
                  </div>
                  <div className="admin-email-legend">
                    {marketingPerformanceSegments.map((segment) => (
                      <div key={segment.key}>
                        <i style={{ backgroundColor: segment.color }} />
                        <span>
                          <strong>{segment.label}</strong>
                          {formatCompactNumber(segment.value)} ({formatPercent(segment.rate)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="admin-email-side-card">
                <h3>En İyi Performans Gösteren Kampanya</h3>
                {topMarketingCampaign ? (
                  <div className="admin-email-best-campaign">
                    <div className="admin-email-best-thumb">
                      {topMarketingCampaign.imageUrl ? (
                        <img src={topMarketingCampaign.imageUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                      ) : (
                        <Sparkles className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <strong>{topMarketingCampaign.subject}</strong>
                      <span>{formatCampaignDateTime(topMarketingCampaign.sentAt || topMarketingCampaign.createdAt)}</span>
                    </div>
                    <dl>
                      <div>
                        <dt>Açılma</dt>
                        <dd>{formatPercent(getPercent(getCampaignOpenCount(topMarketingCampaign), topMarketingCampaign.sentCount || 0))}</dd>
                      </div>
                      <div>
                        <dt>Tıklama</dt>
                        <dd>{formatPercent(getPercent(getCampaignClickCount(topMarketingCampaign), topMarketingCampaign.sentCount || 0))}</dd>
                      </div>
                    </dl>
                    <button type="button" onClick={() => openEmailCampaignDetail(topMarketingCampaign)}>
                      Raporu Görüntüle
                    </button>
                  </div>
                ) : (
                  <p className="admin-email-side-empty">Performans için önce bir kampanya gönderin.</p>
                )}
              </section>
            </aside>
          </div>
        </section>

        <section id="admin-email-legacy" className="hidden" aria-hidden="true">
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-cafe-50">Liste durumu</p>
                    <p className="mt-1 text-xs leading-5 text-cafe-100/68">
                      {selectedAudienceInactiveCustomers.length} alıcı bu kategoriden çıkarılmış. İsterseniz tekrar aktif listeye ekleyebilirsiniz.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => { void handleSetMarketingRecipientsSubscribed(selectedAudienceInactiveCustomers, true); }}
                      disabled={recipientActionBusy === 'bulk-add' || selectedAudienceInactiveCustomers.length === 0}
                      className="inline-flex items-center gap-2 rounded-full border border-accent/35 bg-[color:var(--color-accent)]/12 px-3 py-1.5 text-xs font-semibold text-[color:var(--color-accent)] transition-colors hover:border-accent/55 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      Geri ekle
                    </button>
                    <button
                      type="button"
                      onClick={() => { void handleSetMarketingRecipientsSubscribed(selectedAudienceCustomers, false); }}
                      disabled={recipientActionBusy === 'bulk-remove' || selectedAudienceCustomers.length === 0}
                      className="inline-flex items-center gap-2 rounded-full border border-red-300/25 bg-red-400/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition-colors hover:border-red-300/45 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Grubu çıkar
                    </button>
                  </div>
                </div>
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
 'border-cafe-700/80 bg-cafe-950/35 text-cafe-100/45 line-through'
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
                {availableEmailTemplates.map((template) => {
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
                          Durum: {campaign.status} • Alıcı: {campaign.recipientCount || 0}
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
                            <SignedImage
                              photoId={item.id}
                              fallbackUrl={item.url}
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

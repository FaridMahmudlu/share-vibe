import React, { useEffect, useMemo, useState } from 'react';
import { db, auth } from './firebase';
import { collection, doc, getDoc, onSnapshot, orderBy, query, setDoc, where } from 'firebase/firestore';
import {
  ArrowLeft,
  ArrowUpDown,
  Clock,
  ExternalLink,
  Gift,
  ImageIcon,
  LogOut,
  MapPin,
  Palette,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { signInWithGoogle } from './googleAuth';
import { hasOwnerPortalAccess, hasSuperAdminAccess, normalizeAccessEmail } from './accessConfig';
import { deleteMediaRecord } from './mediaStorage';
import DropdownSelect from './DropdownSelect';
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

type AdminMediaItem = {
  id: string;
  url: string;
  caption: string;
  cafeSlug: string;
  tableNumber: string;
  date: string;
  likesCount: number;
  createdAt: any;
};

type PortalMode = 'admin' | 'owner';

type OwnedWorkspace = {
  slug: string;
  cafeName: string;
};

const DEFAULT_ADMIN_SETTINGS = {
  cafeName: DEFAULT_CAFE_NAME,
  accentColor: DEFAULT_ACCENT_COLOR,
  handwritingFont: DEFAULT_HANDWRITING_FONT,
  campaignTarget: DEFAULT_CAMPAIGN_TARGET,
  campaignReward: DEFAULT_CAMPAIGN_REWARD,
};

const SORT_OPTIONS = [
  {
    value: 'newest',
    label: 'En yeni',
    hint: 'Son eklenen fotoğraflar üstte kalsın',
  },
  {
    value: 'likes',
    label: 'En çok beğenilen',
    hint: 'Etkileşimi yüksek olanları öne çıkar',
  },
];

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

export default function AdminPanel({
  cafeSlug,
  onCafeSlugChange,
  onBack,
  portalMode = 'admin',
  onOpenCafeEnvironment,
}: {
  cafeSlug: string;
  onCafeSlugChange: (slug: string) => void;
  onBack: () => void;
  portalMode?: PortalMode;
  onOpenCafeEnvironment?: (slug: string) => void;
}) {
  const isOwnerPortal = portalMode === 'owner';
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<AdminMediaItem | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [ownedWorkspaces, setOwnedWorkspaces] = useState<OwnedWorkspace[]>([]);
  const [mediaItems, setMediaItems] = useState<AdminMediaItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tableFilter, setTableFilter] = useState('all');
  const [sortMode, setSortMode] = useState<'newest' | 'likes'>('newest');
  const [activeView, setActiveView] = useState<'dashboard' | 'brand'>(isOwnerPortal ? 'brand' : 'dashboard');
  const [workspaceSlug, setWorkspaceSlug] = useState(() => normalizeCafeSlug(cafeSlug, DEFAULT_CAFE_SLUG));
  const [workspaceSlugDraft, setWorkspaceSlugDraft] = useState(() => normalizeCafeSlug(cafeSlug, DEFAULT_CAFE_SLUG));
  const [workspaceOwnerEmail, setWorkspaceOwnerEmail] = useState<string | null>(null);

  const [settings, setSettings] = useState(DEFAULT_ADMIN_SETTINGS);
  const [savedSettings, setSavedSettings] = useState(DEFAULT_ADMIN_SETTINGS);

  useEffect(() => {
    setActiveView(isOwnerPortal ? 'brand' : 'dashboard');
  }, [isOwnerPortal]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email);
      } else {
        setUserEmail(null);
      }

      setIsLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

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
      setWorkspaceOwnerEmail(null);
      return;
    }

    const unsubscribeSettings = onSnapshot(doc(db, 'cafes', workspaceSlug), (snapshot) => {
      if (!snapshot.exists()) {
        setWorkspaceOwnerEmail(null);
        const emptySettings = {
          ...DEFAULT_ADMIN_SETTINGS,
          cafeName:
            workspaceSlug
              .split('-')
              .filter(Boolean)
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(' ') || DEFAULT_ADMIN_SETTINGS.cafeName,
        };
        setSettings(emptySettings);
        setSavedSettings(emptySettings);
        return;
      }

      const data = snapshot.data();
      setWorkspaceOwnerEmail(normalizeLegacyText(data.ownerEmail, ''));
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

          nextItems.push({
            id: entry.id,
            url: typeof data.url === 'string' ? data.url : '',
            caption: normalizeLegacyText(data.caption, DEFAULT_MEDIA_CAPTION),
            cafeSlug: normalizeCafeSlug(data.cafeSlug ?? DEFAULT_CAFE_SLUG),
            tableNumber: normalizeTableLabel(data.tableNumber, 'Masa'),
            date: normalizeLegacyText(data.date, '--:--'),
            likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
            createdAt: data.createdAt,
          });
        });

        setMediaItems(nextItems);
      },
      (error) => {
        console.error('Admin media feed error:', error);
      }
    );

    return () => {
      unsubscribeSettings();
      unsubscribeMedia();
    };
  }, [userEmail, workspaceSlug]);

  const workspaceMediaItems = useMemo(
    () => mediaItems.filter((item) => item.cafeSlug === workspaceSlug),
    [mediaItems, workspaceSlug]
  );
  const totalLikes = useMemo(
    () => workspaceMediaItems.reduce((sum, item) => sum + item.likesCount, 0),
    [workspaceMediaItems]
  );

  const todayUploadsCount = useMemo(() => {
    const today = new Date();

    return workspaceMediaItems.filter((item) => {
      const itemDate = getMediaDate(item.createdAt);
      return itemDate ? itemDate.toDateString() === today.toDateString() : false;
    }).length;
  }, [workspaceMediaItems]);

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
    if (workspaceMediaItems.length === 0) {
      return null;
    }

    const counters = new Map<string, number>();
    for (const item of workspaceMediaItems) {
      counters.set(item.tableNumber, (counters.get(item.tableNumber) ?? 0) + 1);
    }

    return Array.from(counters.entries()).sort((left, right) => right[1] - left[1])[0] ?? null;
  }, [workspaceMediaItems]);

  const filteredMediaItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('tr');

    return [...workspaceMediaItems]
      .filter((item) => tableFilter === 'all' || item.tableNumber === tableFilter)
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
  }, [workspaceMediaItems, searchTerm, sortMode, tableFilter]);

  const tableOptions = useMemo(
    () => [
      {
        value: 'all',
        label: 'Tüm masalar',
        hint: 'Bütün masalardaki fotoğrafları göster',
      },
      ...uniqueTables.map((table) => ({
        value: table,
        label: table,
        hint: 'Yalnız bu masaya ait paylaşımlar',
      })),
    ],
    [uniqueTables]
  );

  const settingsDirty = useMemo(
    () =>
      settings.cafeName !== savedSettings.cafeName ||
      settings.accentColor !== savedSettings.accentColor ||
      settings.handwritingFont !== savedSettings.handwritingFont ||
      settings.campaignTarget !== savedSettings.campaignTarget ||
      settings.campaignReward !== savedSettings.campaignReward,
    [savedSettings, settings]
  );
  const isBrandView = activeView === 'brand';
  const isSuperAdmin = hasSuperAdminAccess(userEmail);
  const hasPortalAccess = isOwnerPortal ? hasOwnerPortalAccess(userEmail) : isSuperAdmin;
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
    (!workspaceOwnerEmail || normalizeAccessEmail(workspaceOwnerEmail) === normalizeAccessEmail(userEmail) || isSuperAdmin);
  const canManageWorkspace = Boolean(userEmail) && (workspaceDraftChanged || canManageActiveWorkspace);
  const panelTitle = isBrandView
    ? (isOwnerPortal ? 'Kafe Kurulum Alanı' : 'Marka Ayarları')
    : (isOwnerPortal ? 'Kafe Sahibi Paneli' : 'Admin Paneli');
  const panelPill = isOwnerPortal ? 'Kafe Sahibi Merkezi' : 'Yönetim Merkezi';
  const loginPill = isOwnerPortal ? 'Kafe Sahibi Erişimi' : 'Yönetim Erişimi';
  const loginTitle = isOwnerPortal ? 'Kafe Sahibi Girişi' : 'Admin Paneli';
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
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const applyWorkspaceSlug = () => {
    const nextSlug = effectiveWorkspaceSlug;
    setWorkspaceSlug(nextSlug);
    setWorkspaceSlugDraft(nextSlug);
    onCafeSlugChange(nextSlug);
    setActiveView('brand');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectOwnedWorkspace = (slug: string) => {
    const nextSlug = normalizeCafeSlug(slug, DEFAULT_CAFE_SLUG);
    setWorkspaceSlug(nextSlug);
    setWorkspaceSlugDraft(nextSlug);
    onCafeSlugChange(nextSlug);
    setActiveView('brand');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openBrandView = () => {
    setActiveView('brand');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openDashboardView = () => {
    setActiveView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!userEmail) {
      return null;
    }

    const nextWorkspaceSlug = effectiveWorkspaceSlug;
    let targetOwnerEmail = workspaceOwnerEmail;

    setIsSaving(true);

    try {
      if (nextWorkspaceSlug !== workspaceSlug) {
        const targetSnapshot = await getDoc(doc(db, 'cafes', nextWorkspaceSlug));
        targetOwnerEmail = targetSnapshot.exists()
          ? normalizeLegacyText(targetSnapshot.data().ownerEmail, '')
          : null;
      }

      if (
        targetOwnerEmail &&
        normalizeAccessEmail(targetOwnerEmail) !== normalizeAccessEmail(userEmail) &&
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
        ownerEmail: normalizeAccessEmail(targetOwnerEmail || userEmail),
      });
      setWorkspaceSlug(nextWorkspaceSlug);
      setWorkspaceSlugDraft(nextWorkspaceSlug);
      onCafeSlugChange(nextWorkspaceSlug);
      setWorkspaceOwnerEmail(normalizeAccessEmail(targetOwnerEmail || userEmail));
      alert(isOwnerPortal ? 'Kafe ortamı başarıyla oluşturuldu.' : 'Ayarlar başarıyla kaydedildi.');
      return nextWorkspaceSlug;
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Ayarlar kaydedilirken bir hata oluştu.');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!mediaToDelete) {
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-cafe-50">
        <div className="section-shell max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)]">
            <Settings className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold text-cafe-50">
            {isOwnerPortal ? 'Kafe sahibi alanı hazırlanıyor' : 'Admin paneli hazırlanıyor'}
          </h1>
          <p className="mt-3 text-sm leading-7 text-cafe-100/70">
            Yetki kontrolü ve yönetim verileri yükleniyor.
          </p>
        </div>
      </div>
    );
  }

  if (!userEmail) {
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
            Bu Google hesabı kafe sahibi erişim listesinde yer almıyor. Yetkili hesapla giriş yapmanız gerekiyor.
          </p>
          <div className="mt-5 rounded-2xl border border-cafe-700/75 bg-cafe-900/45 px-4 py-3 text-sm text-cafe-100/72">
            Giriş yapan hesap: <strong className="text-cafe-50">{userEmail}</strong>
          </div>
          <button
            onClick={handleLogout}
            className="mt-6 w-full rounded-2xl bg-[color:var(--color-accent)] px-4 py-3 font-semibold text-white shadow-[0_20px_40px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-0.5"
          >
            Farklı hesapla tekrar giriş yap
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
    <div className="min-h-screen pb-16 text-cafe-50">
      <header className="sticky top-0 z-40 border-b border-white/45 bg-white/72 backdrop-blur-2xl shadow-[0_16px_50px_rgba(69,49,35,0.08)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="icon-button" aria-label="Ana sayfaya dön">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="section-pill">{panelPill}</span>
              <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-cafe-50">
                {panelTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-cafe-700/80 bg-white/75 px-4 py-2 text-sm text-cafe-100/70">
              <ShieldCheck className="w-4 h-4 text-[color:var(--color-accent)]" />
              <span>{userEmail}</span>
            </div>
            {(settingsDirty || workspaceDraftChanged) && (
              <div className="hidden xl:flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
                <Sparkles className="w-4 h-4" />
                <span>Kaydedilmemiş değişiklikler var</span>
              </div>
            )}
            <button onClick={handleLogout} className="icon-button" aria-label="Çıkış yap">
              <LogOut className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                void handleSave();
              }}
              disabled={isSaving || (!settingsDirty && !workspaceDraftChanged) || !canManageWorkspace}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Kaydediliyor...' : isOwnerPortal ? 'Kafe ortamını kaydet' : 'Kaydet'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 space-y-6">
        <section className="section-shell space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <span className="section-pill">Kafe Çalışma Alanı</span>
              <h2 className="mt-3 text-2xl font-semibold text-cafe-50">
                {isOwnerPortal ? 'Kendi kafe ortamını oluştur' : 'Birden fazla kafe için ayrı çalışma alanı'}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-cafe-100/72">
                {isOwnerPortal
                  ? 'Tanımlı hesabınızla giriş yaptıktan sonra kendi kafe adınızı, tasarımınızı ve kampanya ayarlarınızı kaydedin. Sistem aynı anda ayrı bir kafe ortamı üretir.'
                  : 'Her kafe kendi koduyla ayrılır. Genel galeri, QR bağlantıları, paylaşımlar ve tasarım ayarları bu koda göre ayrı çalışır.'}
              </p>
            </div>
            <div className="rounded-2xl border border-cafe-700/75 bg-white/78 px-4 py-3 text-sm text-cafe-100/70">
              {isOwnerPortal ? 'Hazırlanan kod' : 'Aktif kod'}:{' '}
              <strong className="text-cafe-50">{effectiveWorkspaceSlug}</strong>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),minmax(340px,0.9fr)]">
            <div className="glass-card space-y-4">
              {isOwnerPortal && ownedWorkspaces.length > 0 && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-cafe-50">Sana bağlı kafe ortamları</p>
                    <p className="mt-1 text-sm text-cafe-100/68">
                      Mevcut kafeler arasında geçiş yapabilir veya yeni bir tane oluşturabilirsin.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ownedWorkspaces.map((workspace) => (
                      <button
                        key={workspace.slug}
                        type="button"
                        onClick={() => selectOwnedWorkspace(workspace.slug)}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                          workspace.slug === workspaceSlug
                            ? 'border-accent/40 bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)]'
                            : 'border-cafe-700/75 bg-white/80 text-cafe-50 hover:border-accent/30'
                        }`}
                      >
                        {workspace.cafeName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-cafe-100/70 mb-2">
                  {isOwnerPortal ? 'Kafe bağlantı kodu' : 'Kafe kodu'}
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    value={workspaceSlugDraft}
                    onChange={(event) => setWorkspaceSlugDraft(normalizeOptionalCafeSlug(event.target.value))}
                    placeholder="örn: lumina-kahve"
                    className="w-full rounded-2xl border border-cafe-700/80 bg-white/80 px-4 py-3 text-cafe-50 outline-none transition-colors focus:border-accent/60"
                  />
                  <button
                    type="button"
                    onClick={applyWorkspaceSlug}
                    className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--color-accent)] px-5 py-3 font-semibold text-white shadow-[0_18px_36px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-0.5"
                  >
                    Aç
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-cafe-700/70 bg-cafe-900/45 px-4 py-3 text-sm text-cafe-100/68">
                {isOwnerPortal
                  ? 'Yeni bir kafe adı ve bağlantı kodu girip kaydettiğinde o kafe için ayrı galeri, QR akışı ve kampanya ayarları otomatik oluşur.'
                  : 'Bu kodu değiştirerek yeni bir kafe çalışma alanı açabilirsiniz. Aynı sistem içinde istediğiniz kadar kafe ayrı ayrı yönetilebilir.'}
              </div>

              {!canManageActiveWorkspace && effectiveWorkspaceSlug === workspaceSlug && workspaceOwnerEmail && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  Bu çalışma alanı <strong>{workspaceOwnerEmail}</strong> hesabına bağlıdır. Yalnız sahibi veya süper yönetici değişiklik yapabilir.
                </div>
              )}
            </div>

            <div className="glass-card space-y-3">
              <div>
                <p className="text-sm font-semibold text-cafe-50">Genel galeri bağlantısı</p>
                <p className="mt-1 break-all text-sm text-cafe-100/68">{publicGalleryLink}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-cafe-50">QR için örnek masa bağlantısı</p>
                <p className="mt-1 break-all text-sm text-cafe-100/68">{publicQrExampleLink}</p>
              </div>
              {onOpenCafeEnvironment && (
                <button
                  type="button"
                  onClick={async () => {
                    const targetSlug =
                      settingsDirty || workspaceDraftChanged
                        ? await handleSave()
                        : effectiveWorkspaceSlug;

                    if (targetSlug) {
                      onOpenCafeEnvironment(targetSlug);
                    }
                  }}
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-[color:var(--color-accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-0.5"
                >
                  <ExternalLink className="h-4 w-4" />
                  Kafe ortamını aç
                </button>
              )}
            </div>
          </div>
        </section>

        {isBrandView ? (
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
                className="inline-flex items-center gap-2 self-start rounded-full border border-cafe-700/80 bg-white/80 px-4 py-2.5 text-sm font-medium text-cafe-50 transition-colors hover:border-accent/40"
              >
                <ArrowLeft className="h-4 w-4" />
                Panele dön
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="glass-card">
                <label className="block text-sm font-medium text-cafe-100/70 mb-2">Kafe adı</label>
                <input
                  type="text"
                  value={settings.cafeName}
                  onChange={(event) => setSettings({ ...settings, cafeName: event.target.value })}
                  className="w-full rounded-2xl border border-cafe-700/80 bg-white/80 px-4 py-3 text-cafe-50 outline-none transition-colors focus:border-accent/60"
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
                          : 'border-cafe-700/80 bg-white/80 text-cafe-50 hover:border-accent/30'
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
                        : 'border-cafe-700/80 bg-white/80 hover:border-accent/30'
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
        ) : (
          <>
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr),360px]">
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

          <aside className="section-shell space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="section-pill">Hızlı Erişim</span>
                <h2 className="mt-3 text-2xl font-semibold text-cafe-50">Günün özeti</h2>
              </div>
              <div className="ambient-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)]">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <button
                type="button"
                onClick={openBrandView}
                className="compact-highlight-card text-left transition-transform hover:-translate-y-0.5"
              >
                <Palette className="mt-1 w-4 h-4 text-[color:var(--color-accent)]" />
                <div>
                  <p className="text-sm font-semibold text-cafe-50">Marka ayarları</p>
                  <p className="mt-1 text-sm leading-6 text-cafe-100/68">Kafe adı, renk ve font düzenleyin.</p>
                </div>
              </button>
              <a href="#admin-campaign" className="compact-highlight-card transition-transform hover:-translate-y-0.5">
                <Gift className="mt-1 w-4 h-4 text-[color:var(--color-accent)]" />
                <div>
                  <p className="text-sm font-semibold text-cafe-50">Kampanya alanı</p>
                  <p className="mt-1 text-sm leading-6 text-cafe-100/68">Ödül hedefini ve mesajını güncelleyin.</p>
                </div>
              </a>
              <a href="#admin-media" className="compact-highlight-card transition-transform hover:-translate-y-0.5">
                <ImageIcon className="mt-1 w-4 h-4 text-[color:var(--color-accent)]" />
                <div>
                  <p className="text-sm font-semibold text-cafe-50">Medya arşivi</p>
                  <p className="mt-1 text-sm leading-6 text-cafe-100/68">Paylaşımları filtreleyin ve yönetin.</p>
                </div>
              </a>
            </div>

            <div className="glass-card">
              <p className="text-sm font-semibold text-cafe-50">En aktif masa</p>
              <p className="mt-2 text-2xl font-semibold text-cafe-50">
                {topTable ? topTable[0] : 'Henüz veri yok'}
              </p>
              <p className="mt-2 text-sm leading-6 text-cafe-100/70">
                {topTable ? `${topTable[1]} paylaşım ile bugün öne çıkıyor.` : 'Paylaşım geldikçe burada öne çıkan masa görünür.'}
              </p>
            </div>
          </aside>
        </section>

        <section id="admin-campaign" className="grid gap-6 xl:grid-cols-[minmax(0,1fr),400px] scroll-mt-28 lg:scroll-mt-32">
          <div className="section-shell space-y-5">
            <div>
              <span className="section-pill">Kampanya Kurgusu</span>
              <h2 className="mt-3 text-2xl font-semibold text-cafe-50">Ödül akışını düzenle</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="glass-card">
                <label className="block text-sm font-medium text-cafe-100/70 mb-2">Hedef paylaşım sayısı</label>
                <input
                  type="number"
                  min="1"
                  value={settings.campaignTarget}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      campaignTarget: Math.max(1, Number(event.target.value) || 1),
                    })
                  }
                  className="w-full rounded-2xl border border-cafe-700/80 bg-white/80 px-4 py-3 text-cafe-50 outline-none transition-colors focus:border-accent/60"
                />
              </div>

              <div className="glass-card">
                <label className="block text-sm font-medium text-cafe-100/70 mb-2">Ödül metni</label>
                <input
                  type="text"
                  value={settings.campaignReward}
                  onChange={(event) => setSettings({ ...settings, campaignReward: event.target.value })}
                  placeholder="Örn: ücretsiz bir kahve"
                  className="w-full rounded-2xl border border-cafe-700/80 bg-white/80 px-4 py-3 text-cafe-50 outline-none transition-colors focus:border-accent/60"
                />
              </div>
            </div>

            <div className="reward-card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-cafe-100/55">Ödül Önizlemesi</p>
                  <h3 className="mt-2 text-2xl font-semibold text-cafe-50">Paylaşımı teşvik eden mesaj</h3>
                </div>
                <div className="rounded-2xl bg-[color:var(--color-accent)]/14 p-3 text-[color:var(--color-accent)]">
                  <Gift className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4 rounded-[1.6rem] border border-white/55 bg-white/80 p-5">
                <h4
                  className="text-3xl text-cafe-50"
                  style={{ fontFamily: settings.handwritingFont }}
                >
                  Tebrikler! 🎉
                </h4>
                <p className="mt-3 text-sm leading-7 text-cafe-100/72">
                  {settings.campaignTarget}. paylaşımınızı yaptınız ve bizden{' '}
                  <strong style={{ color: settings.accentColor }}>{settings.campaignReward}</strong>{' '}
                  kazandınız.
                </p>
              </div>
            </div>
          </div>

          <aside className="section-shell space-y-4">
            <span className="section-pill">Operasyon Özeti</span>
            <div className="glass-card">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[color:var(--color-accent)]/12 p-3 text-[color:var(--color-accent)]">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-cafe-50">Kaydetmeden yayınlanmaz</p>
                  <p className="text-sm text-cafe-100/70">Tema ve kampanya düzenlemeleri yalnızca kaydettiğinizde yayınlanır.</p>
                </div>
              </div>
            </div>
            <div className="glass-card">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[color:var(--color-accent)]/12 p-3 text-[color:var(--color-accent)]">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-cafe-50">Mevcut ödül hedefi</p>
                  <p className="text-sm text-cafe-100/70">
                    Misafirler {settings.campaignTarget}. paylaşımda {settings.campaignReward} kazanır.
                  </p>
                </div>
              </div>
            </div>
            <div className="glass-card">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[color:var(--color-accent)]/12 p-3 text-[color:var(--color-accent)]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-cafe-50">En aktif masa</p>
                  <p className="text-sm text-cafe-100/70">
                    {topTable ? `${topTable[0]} şu anda ${topTable[1]} paylaşım ile önde.` : 'Henüz yeterli paylaşım verisi oluşmadı.'}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section id="admin-media" className="section-shell section-shell--overflow-visible space-y-5 scroll-mt-28 lg:scroll-mt-32">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="section-pill">Medya Yönetimi</span>
              <h2 className="mt-3 text-3xl font-serif font-semibold text-cafe-50">Yüklenen tüm anılar</h2>
              <p className="mt-2 text-sm leading-7 text-cafe-100/72">
                Admin olarak tüm fotoğrafları burada görebilir, gerektiğinde tek tıkla kaldırabilirsiniz.
              </p>
            </div>
            <div className="inline-flex items-center rounded-full border border-cafe-700/80 bg-white/75 px-4 py-2 text-sm text-cafe-100/72">
              {filteredMediaItems.length} sonuç
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),220px,220px]">
            <label className="glass-card flex items-center gap-3">
              <Search className="w-4 h-4 text-cafe-100/60" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Başlık, masa ya da saat ara"
                className="w-full bg-transparent text-sm text-cafe-50 outline-none placeholder:text-cafe-100/50"
              />
            </label>

            <DropdownSelect
              value={tableFilter}
              onChange={setTableFilter}
              options={tableOptions}
              ariaLabel="Masa filtresi"
              icon={MapPin}
            />

            <DropdownSelect
              value={sortMode}
              onChange={(value) => setSortMode(value as 'newest' | 'likes')}
              options={SORT_OPTIONS}
              ariaLabel="Sıralama seçimi"
              icon={ArrowUpDown}
            />
          </div>

          {filteredMediaItems.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-cafe-700/70 bg-white/60 px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)]">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-cafe-50">Filtreye uygun içerik bulunamadı</h3>
              <p className="mt-3 text-sm leading-7 text-cafe-100/72">
                Arama veya filtreleri değiştirerek farklı sonuçları görebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {filteredMediaItems.map((item) => (
                <article key={item.id} className="glass-card overflow-hidden p-0">
                  <div className="relative aspect-[4/3] overflow-hidden bg-cafe-800">
                    {!item.url ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-cafe-100/60">
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-sm font-medium">Medya bulunamadı</span>
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt={item.caption}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[1.55rem] leading-tight text-cafe-50" style={{ fontFamily: settings.handwritingFont }}>
                        {item.caption}
                      </p>
                      <span className="rounded-full border border-cafe-700/80 bg-white/75 px-2.5 py-1 text-xs font-semibold text-cafe-100/70">
                        {item.likesCount} beğeni
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-cafe-100/72">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[color:var(--color-accent)]" />
                        <span>{item.tableNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{item.date}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setMediaToDelete(item)}
                      disabled={isDeletingId === item.id}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isDeletingId === item.id ? 'Siliniyor...' : 'Bu anıyı sil'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
          </>
        )}
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

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setMediaToDelete(null)}
                className="flex-1 rounded-2xl border border-cafe-700/80 bg-white/80 px-4 py-3 font-medium text-cafe-50 transition-colors hover:border-accent/30"
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

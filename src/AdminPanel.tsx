import React, { useEffect, useState } from 'react';
import { db, auth } from './firebase';
import { collection, doc, getDoc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  Clock,
  Coffee,
  Gift,
  ImageIcon,
  LogOut,
  MapPin,
  Palette,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Type,
  Video,
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { signInWithGoogle } from './googleAuth';
import { deleteMediaRecord } from './mediaStorage';
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_CAFE_NAME,
  DEFAULT_CAMPAIGN_REWARD,
  DEFAULT_CAMPAIGN_TARGET,
  DEFAULT_HANDWRITING_FONT,
  DEFAULT_MEDIA_CAPTION,
  THEME_COLORS,
  THEME_FONTS,
  normalizeHandwritingFont,
  normalizeLegacyText,
} from './uiConfig';

type AdminMediaItem = {
  id: string;
  url: string;
  type: 'image' | 'video';
  caption: string;
  tableNumber: string;
  date: string;
  likesCount: number;
};

const ADMIN_EMAILS = new Set([
  'fariddmahmudlu2008@gmail.com',
  'aslankerem182@gmail.com',
]);

export default function AdminPanel({ onBack }: { onBack: () => void }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<AdminMediaItem | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mediaItems, setMediaItems] = useState<AdminMediaItem[]>([]);

  const [settings, setSettings] = useState({
    cafeName: DEFAULT_CAFE_NAME,
    accentColor: DEFAULT_ACCENT_COLOR,
    handwritingFont: DEFAULT_HANDWRITING_FONT,
    campaignTarget: DEFAULT_CAMPAIGN_TARGET,
    campaignReward: DEFAULT_CAMPAIGN_REWARD,
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user && !user.isAnonymous) {
        setUserEmail(user.email);

        if (user.email && ADMIN_EMAILS.has(user.email)) {
          setIsAdmin(true);
          setIsLoading(false);
          return;
        }

        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const hasAdminRole = userDoc.exists() && userDoc.data().role === 'admin';
          setIsAdmin(hasAdminRole);
        } catch (error) {
          console.error('Admin role check failed:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
        setUserEmail(null);
      }

      setIsLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setMediaItems([]);
      return;
    }

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      const data = snapshot.data();
      setSettings((previous) => ({
        ...previous,
        ...data,
        accentColor:
          typeof data.accentColor === 'string' && data.accentColor
            ? data.accentColor
            : previous.accentColor,
        cafeName: normalizeLegacyText(data.cafeName, previous.cafeName),
        handwritingFont: normalizeHandwritingFont(data.handwritingFont),
        campaignTarget:
          typeof data.campaignTarget === 'number' && Number.isFinite(data.campaignTarget)
            ? data.campaignTarget
            : previous.campaignTarget,
        campaignReward: normalizeLegacyText(data.campaignReward, previous.campaignReward),
      }));
    });

    const unsubscribeMedia = onSnapshot(
      query(collection(db, 'media'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const nextItems: AdminMediaItem[] = [];

        snapshot.forEach((entry) => {
          const data = entry.data();
          nextItems.push({
            id: entry.id,
            url: typeof data.url === 'string' ? data.url : '',
            type: data.type === 'video' ? 'video' : 'image',
            caption: normalizeLegacyText(data.caption, DEFAULT_MEDIA_CAPTION),
            tableNumber: normalizeLegacyText(data.tableNumber, 'Masa'),
            date: normalizeLegacyText(data.date, '--:--'),
            likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
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
  }, [isAdmin]);

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

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await setDoc(doc(db, 'settings', 'global'), {
        ...settings,
        cafeName: normalizeLegacyText(settings.cafeName, DEFAULT_CAFE_NAME),
        accentColor: settings.accentColor || DEFAULT_ACCENT_COLOR,
        handwritingFont: normalizeHandwritingFont(settings.handwritingFont),
        campaignTarget: Math.max(1, settings.campaignTarget),
        campaignReward: normalizeLegacyText(settings.campaignReward, DEFAULT_CAMPAIGN_REWARD),
      });
      alert('Ayarlar başarıyla kaydedildi.');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Ayarlar kaydedilirken bir hata oluştu.');
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
          <h1 className="text-2xl font-semibold text-cafe-50">Admin paneli hazırlanıyor</h1>
          <p className="mt-3 text-sm leading-7 text-cafe-100/70">
            Yetki kontrolü ve yönetim verileri yükleniyor.
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-cafe-50">
        <div className="section-shell max-w-md w-full text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)]">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <span className="section-pill">Yönetim Erişimi</span>
          <h1 className="mt-4 text-3xl font-semibold text-cafe-50">Admin Paneli</h1>
          <p className="mt-3 text-sm leading-7 text-cafe-100/72">
            Bu alana yalnızca yetkili kafe yöneticileri erişebilir. Google hesabınızla giriş yaparak yetkiniz doğrulanır.
          </p>

          {userEmail ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <strong className="font-semibold">{userEmail}</strong> hesabının admin yetkisi bulunmuyor.
              </div>
              <button
                onClick={handleLogout}
                className="w-full rounded-2xl border border-cafe-700/80 bg-white/80 px-4 py-3 font-medium text-cafe-50 transition-colors hover:border-accent/40"
              >
                Farklı hesapla giriş yap
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="mt-6 w-full rounded-2xl bg-[color:var(--color-accent)] px-4 py-3 font-semibold text-white shadow-[0_20px_40px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-0.5"
            >
              Google ile giriş yap
            </button>
          )}

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
              <span className="section-pill">Yönetim Merkezi</span>
              <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-cafe-50">Admin Paneli</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-cafe-700/80 bg-white/75 px-4 py-2 text-sm text-cafe-100/70">
              <ShieldCheck className="w-4 h-4 text-[color:var(--color-accent)]" />
              <span>{userEmail}</span>
            </div>
            <button onClick={handleLogout} className="icon-button" aria-label="Çıkış yap">
              <LogOut className="w-5 h-5" />
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 space-y-6">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr),minmax(360px,0.9fr)]">
          <div className="section-shell space-y-6">
            <div>
              <span className="section-pill">Marka Kimliği</span>
              <h2 className="mt-3 text-3xl font-serif font-semibold text-cafe-50">Mekânın vitrini ve dili</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-cafe-100/72">
                Kafe adı, vurgu rengi ve el yazısı stili galerinin tüm görünümünü belirler. Bu alanı marka karakterinize göre düzenleyin.
              </p>
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
                <label className="block text-sm font-medium text-cafe-100/70 mb-2">El yazısı stili</label>
                <div className="grid grid-cols-2 gap-3">
                  {THEME_FONTS.map((font) => (
                    <button
                      key={font.value}
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
          </div>

          <aside className="section-shell">
            <span className="section-pill">Canlı Önizleme</span>
            <div className="mt-5 rounded-[2rem] border border-white/65 bg-white/85 p-5 shadow-[0_24px_60px_rgba(79,56,41,0.1)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-cafe-100/55">Kapak</p>
                  <h3 className="mt-2 text-3xl font-serif font-semibold text-cafe-50">{settings.cafeName}</h3>
                </div>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
                  style={{ backgroundColor: settings.accentColor }}
                >
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-6 rounded-[1.6rem] border border-cafe-700/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(247,240,229,0.88))] p-5">
                <p
                  className="text-[2rem] leading-tight text-cafe-50"
                  style={{ fontFamily: settings.handwritingFont }}
                >
                  {DEFAULT_MEDIA_CAPTION}
                </p>
                <div className="mt-5 flex items-center justify-between text-sm text-cafe-100/70">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Masa 7
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    19:45
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr),400px]">
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
            <span className="section-pill">Operasyon Notları</span>
            <div className="glass-card">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[color:var(--color-accent)]/12 p-3 text-[color:var(--color-accent)]">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-cafe-50">Tek merkezden yönetim</p>
                  <p className="text-sm text-cafe-100/70">Tema, kampanya ve medya akışı tek panelde toplandı.</p>
                </div>
              </div>
            </div>
            <div className="glass-card">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[color:var(--color-accent)]/12 p-3 text-[color:var(--color-accent)]">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-cafe-50">Admin silme yetkisi</p>
                  <p className="text-sm text-cafe-100/70">Alt bölümden tüm anıları doğrudan silebilirsiniz.</p>
                </div>
              </div>
            </div>
            <div className="glass-card">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[color:var(--color-accent)]/12 p-3 text-[color:var(--color-accent)]">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-cafe-50">Canlı galeri uyumu</p>
                  <p className="text-sm text-cafe-100/70">Yaptığınız değişiklikler ana galeride anlık olarak görünür.</p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="section-shell space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="section-pill">Medya Yönetimi</span>
              <h2 className="mt-3 text-3xl font-serif font-semibold text-cafe-50">Yüklenen tüm anılar</h2>
              <p className="mt-2 text-sm leading-7 text-cafe-100/72">
                Admin olarak tüm fotoğraf ve videoları burada görebilir, gerektiğinde tek tıkla kaldırabilirsiniz.
              </p>
            </div>
            <div className="inline-flex items-center rounded-full border border-cafe-700/80 bg-white/75 px-4 py-2 text-sm text-cafe-100/72">
              {mediaItems.length} kayıt
            </div>
          </div>

          {mediaItems.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-cafe-700/70 bg-white/60 px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)]">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-cafe-50">Henüz yönetilecek içerik yok</h3>
              <p className="mt-3 text-sm leading-7 text-cafe-100/72">
                Galeriye yeni medya eklendiğinde burada otomatik olarak listelenecek.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {mediaItems.map((item) => (
                <article key={item.id} className="glass-card overflow-hidden p-0">
                  <div className="relative aspect-[4/3] overflow-hidden bg-cafe-800">
                    {!item.url ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-cafe-100/60">
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-sm font-medium">Medya bulunamadı</span>
                      </div>
                    ) : item.type === 'video' ? (
                      <>
                        <video
                          src={item.url}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                        <div className="absolute right-3 top-3 rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                          Video
                        </div>
                      </>
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
                      <p className="text-[1.9rem] leading-tight text-cafe-50" style={{ fontFamily: settings.handwritingFont }}>
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

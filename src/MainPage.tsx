import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  Camera,
  Check,
  ImagePlus,
  LayoutDashboard,
  Link2,
  Palette,
  PlayCircle,
  QrCode,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react';
import BrandSignature, { BrandIcon } from './BrandSignature';

type MainPageProps = {
  onOpenDemo: () => void;
  onOpenOwnerPortal: () => void;
  onSwitchOwnerAccount: () => void;
  onHiddenAdminTrigger: () => void;
  ownerEmail: string | null;
  ownerAccessError: string | null;
  hasOwnerAccess: boolean;
  demoCafeName: string;
};

const NAV_LINKS = [
  { href: '#urun-akisi', label: 'Ürün Akışı' },
  { href: '#misafir-deneyimi', label: 'Misafir Deneyimi' },
  { href: '#owner-paneli', label: 'Owner Paneli' },
  { href: '#erisim-modeli', label: 'Erişim Modeli' },
];

const FLOW_ITEMS = [
  {
    icon: QrCode,
    title: 'QR ile doğru giriş',
    description: 'Misafir doğrudan ilgili masa ve kafe akışına iner.',
  },
  {
    icon: Camera,
    title: 'Fotoğraf paylaşımı',
    description: 'İçerik ekstra adım istemeden birkaç saniyede yüklenir.',
  },
  {
    icon: ImagePlus,
    title: 'Canlı galeri görünürlüğü',
    description: 'Paylaşım anında galeride görünür ve masa hareketlenir.',
  },
  {
    icon: Sparkles,
    title: 'Kampanya tetiklenir',
    description: 'İlerleme barı büyür, ödül kurgusu görünür hale gelir.',
  },
  {
    icon: LayoutDashboard,
    title: 'Owner paneli yönetir',
    description: 'Marka görünümü ve kafe bağlantıları tek panelden kontrol edilir.',
  },
];

const PLATFORM_CARDS = [
  {
    icon: Store,
    title: 'Her kafe ayrı çalışır',
    description: 'Slug, tema, galeri ve kampanya yapısı kafe bazında ayrışır.',
  },
  {
    icon: Palette,
    title: 'Marka tonu korunur',
    description: 'Renk, tipografi ve vurgu dili her kafe için ayrı ayarlanır.',
  },
  {
    icon: ShieldCheck,
    title: 'Yönetim görünürlüğü sınırlıdır',
    description: 'Kafe sahipleri yalnızca kendilerine bağlı alanları yönetir.',
  },
];

const revealUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export default function MainPage({
  onOpenDemo,
  onOpenOwnerPortal,
  onSwitchOwnerAccount,
  onHiddenAdminTrigger,
  ownerEmail,
  ownerAccessError,
  hasOwnerAccess,
  demoCafeName,
}: MainPageProps) {
  const [activeTrack, setActiveTrack] = useState<'guest' | 'owner'>('guest');

  const ownerButtonLabel = hasOwnerAccess
    ? 'Kafe sahibi paneline geç'
    : ownerEmail
      ? 'Yetkili hesabı doğrula'
      : 'Google ile owner girişi';

  const sceneProgress = activeTrack === 'guest' ? 78 : 92;

  return (
    <div className="min-h-screen text-cafe-50">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="landing-navbar-shell"
        >
          <button
            type="button"
            onClick={onHiddenAdminTrigger}
            className="brand-signature-button"
            aria-label="ShareVibe ana sayfa"
          >
            <BrandSignature />
          </button>

          <nav className="landing-navbar-links" aria-label="Ana gezinme">
            {NAV_LINKS.map((item) => (
              <a key={item.href} href={item.href} className="landing-navbar-link">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="landing-navbar-actions">
            <button type="button" onClick={onOpenDemo} className="landing-secondary-button">
              <PlayCircle className="h-4 w-4 text-[color:var(--color-accent)]" />
              {demoCafeName} demosu
            </button>
            <button type="button" onClick={onOpenOwnerPortal} className="landing-primary-button">
              <ShieldCheck className="h-4 w-4" />
              Owner paneli
            </button>
          </div>
        </motion.header>

        <main className="flex-1 space-y-6 pt-6 sm:space-y-8 sm:pt-8">
          <motion.section
            variants={stagger}
            initial="hidden"
            animate="show"
            className="section-shell landing-hero-panel"
          >
            <div className="landing-hero-aura landing-hero-aura-left" />
            <div className="landing-hero-aura landing-hero-aura-right" />

            <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.02fr),minmax(420px,0.98fr)] xl:items-center">
              <motion.div variants={revealUp} className="space-y-6">
                <div className="landing-kicker-row">
                  <span className="section-pill">Mekan içi paylaşım altyapısı</span>
                  <span className="landing-inline-note">
                    Masa yönlendirmesi, canlı galeri ve owner kontrolü tek akışta birleşir.
                  </span>
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-4xl text-4xl font-serif leading-[0.95] text-cafe-50 sm:text-5xl xl:text-[4.65rem]">
                    QR ile başlayan kafe deneyimini, galeriden kampanyaya kadar tek akışta yönetin.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-cafe-100/78 sm:text-lg">
                    ShareVibe, misafirin masa üzerinden paylaşım yapmasını kolaylaştırır; kafe sahibine ise marka
                    görünümünü, bağlantı yapısını ve kampanya kurulumunu tek panelden yönetme alanı sunar.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onOpenDemo}
                    className="landing-primary-button landing-primary-button-lg"
                  >
                    <PlayCircle className="h-4 w-4" />
                    {demoCafeName} demosunu aç
                  </button>
                  <button
                    type="button"
                    onClick={onOpenOwnerPortal}
                    className="landing-secondary-button landing-secondary-button-lg"
                  >
                    <LayoutDashboard className="h-4 w-4 text-[color:var(--color-accent)]" />
                    {ownerButtonLabel}
                  </button>
                </div>

                <div className="landing-switcher" aria-label="Gösterim modu">
                  <button
                    type="button"
                    onClick={() => setActiveTrack('guest')}
                    className={`landing-switcher-button ${activeTrack === 'guest' ? 'is-active' : ''}`}
                  >
                    Misafir akışı
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTrack('owner')}
                    className={`landing-switcher-button ${activeTrack === 'owner' ? 'is-active' : ''}`}
                  >
                    İşletme kontrolü
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="landing-metric-card">
                    <p className="landing-metric-label">Akış mantığı</p>
                    <p className="landing-metric-value">
                      {activeTrack === 'guest' ? 'QR > Paylaşım > Galeri' : 'Panel > Tema > Yayın'}
                    </p>
                  </div>
                  <div className="landing-metric-card">
                    <p className="landing-metric-label">Varsayılan açılış</p>
                    <p className="landing-metric-value">{demoCafeName}</p>
                  </div>
                  <div className="landing-metric-card">
                    <p className="landing-metric-label">Owner erişimi</p>
                    <p className="landing-metric-value">
                      {hasOwnerAccess ? 'Hesap hazır' : ownerEmail ? 'Doğrulama gerekli' : 'Google girişli'}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={revealUp} className="landing-scene-shell">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 6.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="landing-scene-panel"
                >
                  <div className="landing-scene-topbar">
                    <BrandSignature compact subtitle={activeTrack === 'guest' ? 'misafir görünümü' : 'owner cockpit'} />
                    <span className="landing-scene-badge">{demoCafeName}</span>
                  </div>

                  <div className="landing-scene-screen">
                    <div className="landing-scene-grid">
                      <div className="landing-scene-media landing-scene-media-main" />
                      <div className="landing-scene-media landing-scene-media-side" />
                      <div className="landing-scene-media landing-scene-media-side-alt" />
                    </div>

                    <div className="landing-scene-progress">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-cafe-50">
                          {activeTrack === 'guest' ? 'Canlı galeri görünürlüğü' : 'Kurulum tamamlama'}
                        </span>
                        <strong className="text-[color:var(--color-accent)]">%{sceneProgress}</strong>
                      </div>
                      <div className="landing-scene-progress-track">
                        <span style={{ width: `${sceneProgress}%` }} />
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                  className="landing-floating-card landing-floating-card-qr"
                >
                  <div className="landing-floating-icon">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="landing-floating-title">Masa bağlantısı hazır</p>
                    <p className="landing-floating-copy">QR okutulduğunda doğrudan ilgili masanın paylaşım akışı açılır.</p>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                  className="landing-floating-card landing-floating-card-owner"
                >
                  <div className="landing-floating-head">
                    <div className="landing-floating-icon">
                      <Palette className="h-5 w-5" />
                    </div>
                    <span className="landing-floating-pill">Owner alanı</span>
                  </div>
                  <div className="landing-palette-row">
                    <span style={{ backgroundColor: '#d48f6b' }} />
                    <span style={{ backgroundColor: '#bb7658' }} />
                    <span style={{ backgroundColor: '#7f4a36' }} />
                    <span style={{ backgroundColor: '#f3ebe2' }} />
                  </div>
                  <p className="landing-floating-title">Tema, slug ve kampanya aynı panelde</p>
                </motion.div>

                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }}
                  className="landing-floating-card landing-floating-card-stats"
                >
                  <div className="landing-floating-icon">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="landing-floating-title">Akış görünürlüğü</p>
                    <p className="landing-floating-copy">Paylaşım, kampanya ve panel adımları aynı yapıda birlikte çalışır.</p>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            id="urun-akisi"
            className="section-shell"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <span className="section-pill">Ürün akışı</span>
                <h2 className="mt-4 text-3xl font-serif font-semibold text-cafe-50 sm:text-4xl">
                  Kullanıcının gözüne sade görünür; arka planda ise güçlü bir kafe kurgusu çalışır.
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-cafe-100/72">
                ShareVibe deneyimi yalnızca bir landing sayfası değil; demo, owner paneli ve masa bazlı paylaşım
                akışını tek ürün mantığında birbirine bağlayan yapı olarak çalışır.
              </p>
            </div>

            <div className="landing-flow-grid">
              {FLOW_ITEMS.map(({ icon: Icon, title, description }, index) => (
                <article key={title} className="landing-flow-card">
                  <div className="landing-flow-index">{String(index + 1).padStart(2, '0')}</div>
                  <div className="landing-feature-icon mt-5">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-cafe-50">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-cafe-100/72">{description}</p>
                </article>
              ))}
            </div>
          </motion.section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr),minmax(360px,0.92fr)]">
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              id="misafir-deneyimi"
              className="section-shell"
            >
              <span className="section-pill">Misafir deneyimi</span>
              <h2 className="mt-4 text-3xl font-serif font-semibold text-cafe-50">
                Kullanıcıyı yormayan, paylaşmaya teşvik eden görünüm.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-cafe-100/72">
                Ana sayfa artık yalnızca metin değil; kullanıcıyı adım adım anlatan görsel akışlar, kart yapıları ve
                animasyonlu sahnelerle ürünün ne yaptığını birkaç saniyede anlatır.
              </p>

              <div className="landing-journey-rail">
                <div className="landing-journey-node">
                  <div className="landing-journey-node-icon">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="landing-journey-title">1. QR okutulur</p>
                    <p className="landing-journey-copy">Misafir doğru masa bağlantısına iner.</p>
                  </div>
                </div>
                <div className="landing-journey-line" />
                <div className="landing-journey-node">
                  <div className="landing-journey-node-icon">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="landing-journey-title">2. Fotoğraf yüklenir</p>
                    <p className="landing-journey-copy">Telefon kamerasıyla doğal, hızlı ve net paylaşım yapılır.</p>
                  </div>
                </div>
                <div className="landing-journey-line" />
                <div className="landing-journey-node">
                  <div className="landing-journey-node-icon">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="landing-journey-title">3. Galeri canlanır</p>
                    <p className="landing-journey-copy">Paylaşım görünür olur, kampanya akışı ilerler.</p>
                  </div>
                </div>
              </div>

              <div className="landing-console-stack">
                <div className="landing-console-item">
                  <Check className="h-4 w-4 text-[color:var(--color-accent)]" />
                  <span>CTA’lar yalnızca anlamlı noktalarda gösterilir; kullanıcı gereksiz yere yön kaybetmez.</span>
                </div>
                <div className="landing-console-item">
                  <Check className="h-4 w-4 text-[color:var(--color-accent)]" />
                  <span>Metin yoğunluğu azaltılır; anlatım kartlar, şemalar ve akış örnekleriyle desteklenir.</span>
                </div>
                <div className="landing-console-item">
                  <Check className="h-4 w-4 text-[color:var(--color-accent)]" />
                  <span>Demo butonu her zaman sabit demo ortamını açar; diğer kafeler landing üzerinden dağılmaz.</span>
                </div>
              </div>
            </motion.section>

            <motion.aside
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.04 }}
              id="owner-paneli"
              className="section-shell"
            >
              <span className="section-pill">Owner paneli</span>
              <h2 className="mt-4 text-3xl font-serif font-semibold text-cafe-50">
                Her owner yalnızca kendi kafe alanlarına ulaşır.
              </h2>
              <p className="mt-3 text-sm leading-7 text-cafe-100/72">
                Owner girişi genel bir yönetim kapısı gibi davranmaz. Hesap doğrulandıktan sonra yalnızca o hesaba
                bağlı kafe alanları açılır; başka owner’a ait çalışma alanları yönetilemez.
              </p>

              <div className="landing-owner-console">
                <div className="landing-owner-console-top">
                  <BrandIcon className="landing-owner-console-mark" />
                  <div>
                    <p className="landing-floating-title">Yetkili giriş durumu</p>
                    <p className="landing-floating-copy">
                      {ownerEmail
                        ? `Aktif hesap: ${ownerEmail}`
                        : 'Henüz giriş yapılmadı. Owner paneli Google hesabı ile açılır.'}
                    </p>
                  </div>
                </div>

                <div className="landing-console-stack">
                  <div className="landing-console-item">
                    <ShieldCheck className="h-4 w-4 text-[color:var(--color-accent)]" />
                    <span>{hasOwnerAccess ? 'Bu hesap owner paneli için hazır görünüyor.' : 'Panel erişimi hesap listesine göre doğrulanır.'}</span>
                  </div>
                  <div className="landing-console-item">
                    <Link2 className="h-4 w-4 text-[color:var(--color-accent)]" />
                    <span>Demo akışı ile owner erişimi birbirinden ayrıdır; demo herkese, yönetim yalnızca yetkili hesaba açılır.</span>
                  </div>
                </div>

                {ownerAccessError ? (
                  <div className="landing-inline-alert">{ownerAccessError}</div>
                ) : null}

                {ownerEmail && !hasOwnerAccess ? (
                  <button
                    type="button"
                    onClick={onSwitchOwnerAccount}
                    className="landing-secondary-button w-full justify-center"
                  >
                    Farklı hesapla tekrar dene
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={onOpenOwnerPortal}
                  className="landing-primary-button w-full justify-center"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {ownerButtonLabel}
                </button>
              </div>
            </motion.aside>
          </div>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            id="erisim-modeli"
            className="section-shell"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <span className="section-pill">Erişim modeli</span>
                <h2 className="mt-4 text-3xl font-serif font-semibold text-cafe-50 sm:text-4xl">
                  Demo, owner yönetimi ve çoklu kafe yapısı artık birbirinden net biçimde ayrılır.
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-cafe-100/72">
                Landing tarafında kullanıcıyı tek bir net akış karşılar. Çoklu kafe operasyonu ise yalnızca owner
                panelinde ve yetkili hesabın bağlandığı alanlar üzerinden ilerler.
              </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {PLATFORM_CARDS.map(({ icon: Icon, title, description }) => (
                <article key={title} className="landing-feature-card">
                  <div className="landing-feature-icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold text-cafe-50">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-cafe-100/72">{description}</p>
                </article>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="section-shell landing-demo-panel"
          >
            <div className="landing-demo-panel-copy">
              <span className="section-pill">Hızlı başlangıç</span>
              <h2 className="mt-4 text-3xl font-serif font-semibold text-cafe-50 sm:text-4xl">
                Önce sabit demo ortamını incele, ardından yalnızca sana ait owner panelini aç.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-cafe-100/72">
                Demo butonu doğrudan <strong>{demoCafeName}</strong> akışını açar. Diğer kafeler landing üzerinde
                dolaştırılmaz; owner panelinde yalnızca yetkili hesabın bağlı olduğu kafe alanları görünür.
              </p>
            </div>

            <div className="landing-demo-panel-actions">
              <button
                type="button"
                onClick={onOpenDemo}
                className="landing-primary-button landing-primary-button-lg"
              >
                <PlayCircle className="h-4 w-4" />
                {demoCafeName} demosunu aç
              </button>
              <button
                type="button"
                onClick={onOpenOwnerPortal}
                className="landing-secondary-button landing-secondary-button-lg"
              >
                <ArrowRight className="h-4 w-4 text-[color:var(--color-accent)]" />
                Owner paneline geç
              </button>
            </div>
          </motion.section>
        </main>
      </div>
    </div>
  );
}

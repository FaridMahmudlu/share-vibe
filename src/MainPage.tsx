import { useEffect, useRef, useState, memo, useCallback } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  Camera,
  Check,
  ChevronRight,
  Gift,
  Heart,
  ImagePlus,
  LayoutDashboard,
  Palette,
  PlayCircle,
  QrCode,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Users,
  Zap,
  Coffee,
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
  { href: '#nasil-calisir', label: 'Nasıl Çalışır?' },
  { href: '#ozellikler', label: 'Özellikler' },
  { href: '#kafe-sahibi', label: 'Panel' },
];

const STATS = [
  { value: '3 sn', label: 'Ortalama bağlanma süresi', icon: Zap },
  { value: '%94', label: 'Müşteri memnuniyeti', icon: Heart },
  { value: '5×', label: 'Daha fazla etkileşim', icon: TrendingUp },
  { value: '0', label: 'Uygulama indirme', icon: Check },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: QrCode,
    title: 'Masaya QR Kod Yapıştırın',
    desc: 'Her masaya özel bir QR kod oluşturun ve yazdırın. Müşterileriniz tek okutmayla kafenizin dijital deneyimine bağlanır.',
    color: 'from-[#d48f6b]/20 to-[#d48f6b]/5',
    accent: '#d48f6b',
  },
  {
    step: '02',
    icon: Camera,
    title: 'Müşteriler Anılarını Paylaşır',
    desc: 'Uygulama indirmeden, kayıt olmadan. Bir fotoğraf çek, birkaç saniyede yükle ve kafenin canlı galerisine ekle.',
    color: 'from-[#bb7658]/20 to-[#bb7658]/5',
    accent: '#bb7658',
  },
  {
    step: '03',
    icon: Sparkles,
    title: 'Ödüller Kazanılır',
    desc: 'Paylaşım sayısı arttıkça kampanya çubuğu dolar. Belirli hedefe ulaşan müşteriler sürpriz ödüller kazanır.',
    color: 'from-[#9a5f44]/20 to-[#9a5f44]/5',
    accent: '#9a5f44',
  },
  {
    step: '04',
    icon: LayoutDashboard,
    title: 'Siz Yönetirsiniz',
    desc: 'Tek bir panelden marka renklerinizi, kampanya hedeflerinizi ve tüm galeriyi anlık olarak yönetin.',
    color: 'from-[#7f4a36]/20 to-[#7f4a36]/5',
    accent: '#7f4a36',
  },
];

const FEATURES_BENTO = [
  {
    icon: Store,
    title: 'Kafenize Özel Sistem',
    desc: 'Her kafe kendi galerisi, renk paleti, QR kodları ve kampanya ayarlarıyla tamamen bağımsız çalışır.',
    size: 'large',
    gradient: 'from-[#321b11]/90 to-[#4a2819]/80',
  },
  {
    icon: Palette,
    title: 'Markanızı Yansıtın',
    desc: 'Logo, renk ve yazı tiplerini sisteme entegre edin.',
    size: 'small',
    gradient: 'from-[#d48f6b]/15 to-transparent',
  },
  {
    icon: ShieldCheck,
    title: 'Güvenli Giriş',
    desc: 'Google hesabınızla saniyeler içinde güvenli erişim.',
    size: 'small',
    gradient: 'from-[#d48f6b]/10 to-transparent',
  },
  {
    icon: BarChart3,
    title: 'Canlı Galeri',
    desc: 'Paylaşımlar anında tüm müşterilerin ekranında görünür. Kafenin enerjisi ekrana taşınır.',
    size: 'medium',
    gradient: 'from-[#321b11]/80 to-[#5a3020]/60',
  },
  {
    icon: Gift,
    title: 'Hediye & Kampanya',
    desc: 'Esnek ödül sistemiyle müşteri bağlılığını artırın.',
    size: 'medium',
    gradient: 'from-[#7f4a36]/80 to-[#321b11]/60',
  },
];

const TESTIMONIALS = [
  {
    quote: 'Müşterilerimiz artık kafede daha uzun vakit geçiriyor. Galeri sayesinde anlar birikiyor, enerji hissediliyor.',
    name: 'Ahmet Y.',
    role: 'Ava Coffee, İstanbul',
    stars: 5,
  },
  {
    quote: 'Kurulumu beş dakikada hallettik. QR kodları masalara yapıştırdık, hepsi bu. Müşteriler hemen alıştı.',
    name: 'Selin K.',
    role: 'Lumina Café, Ankara',
    stars: 5,
  },
  {
    quote: 'Kampanya sistemi harika. Müşteriler ödül kazanmak için paylaşım yapıyor. Organik büyüme başladı.',
    name: 'Mert D.',
    role: 'The Roast Corner, İzmir',
    stars: 5,
  },
];

const AnimatedCounter = memo(function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let start = 0;
          const duration = 1800;
          const step = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
            else setCount(target);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
});
AnimatedCounter.displayName = 'AnimatedCounter';

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
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
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const ownerButtonLabel = hasOwnerAccess
    ? 'Yönetim Paneline Git'
    : ownerEmail
      ? 'Hesabınızı Doğrulayın'
      : 'Kafe Girişi (Google)';

  return (
    <div className="mp-root">
      {/* ─── Ambient background orbs ─── */}
      <div className="mp-bg-orbs" aria-hidden="true">
        <div className="mp-orb mp-orb-1" />
        <div className="mp-orb mp-orb-2" />
        <div className="mp-orb mp-orb-3" />
      </div>

      {/* ─── NAVBAR ─── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mp-navbar"
      >
        <div className="mp-navbar-inner">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="mp-nav-brand"
            aria-label="ShareVibe ana sayfa"
          >
            <BrandSignature compact subtitle={null} />
          </button>

          <nav className="mp-nav-links" aria-label="Ana gezinme">
            {NAV_LINKS.map((item) => (
              <a key={item.href} href={item.href} className="mp-nav-link">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mp-nav-actions">
            <button type="button" onClick={onOpenDemo} className="mp-btn-ghost">
              <PlayCircle className="h-4 w-4" />
              Demo
            </button>
            <button type="button" onClick={onOpenOwnerPortal} className="mp-btn-primary">
              <ShieldCheck className="h-4 w-4" />
              Kafe Girişi
            </button>
          </div>
        </div>
      </motion.header>

      {/* ─── HERO ─── */}
      <section className="mp-hero" ref={heroRef}>
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="mp-hero-inner">
          <motion.div variants={stagger} initial="hidden" animate="show" className="mp-hero-content">
            {/* badge */}
            <motion.div variants={fadeUp} className="mp-hero-badge">
              <span className="mp-hero-badge-dot" />
              <Coffee className="h-3.5 w-3.5" />
              Kafeler için QR tabanlı sadakat platformu
            </motion.div>

            {/* heading */}
            <motion.h1 variants={fadeUp} className="mp-hero-h1">
              Müşterilerinizi
              <br />
              <span className="mp-hero-h1-accent">birbirine bağlayın.</span>
            </motion.h1>

            {/* sub */}
            <motion.p variants={fadeUp} className="mp-hero-sub">
              ShareVibe ile müşterileriniz masadan QR okutarak anlarını paylaşır, ödüller kazanır.
              Siz tek bir panelden her şeyi yönetirsiniz.
            </motion.p>

            {/* cta */}
            <motion.div variants={fadeUp} className="mp-hero-cta-row">
              <button onClick={onOpenDemo} className="mp-btn-primary mp-btn-lg">
                <PlayCircle className="h-5 w-5" />
                Canlı Demo İncele
                <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={onOpenOwnerPortal} className="mp-btn-outline mp-btn-lg">
                <LayoutDashboard className="h-5 w-5" />
                {ownerButtonLabel}
              </button>
            </motion.div>

            {/* trust row */}
            <motion.div variants={fadeUp} className="mp-hero-trust">
              <div className="mp-hero-trust-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <span className="mp-hero-trust-text">
                Yüzlerce kafe sahibinin tercihi · Kurulum 5 dakika
              </span>
            </motion.div>
          </motion.div>

          {/* ── Product preview panel ── */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.3 }}
            className="mp-hero-preview"
          >
            {/* main app mockup */}
            <div className="mp-preview-card">
              <div className="mp-preview-topbar">
                <BrandSignature compact subtitle="müşteri ekranı" />
                <span className="mp-preview-badge">{demoCafeName}</span>
              </div>

              <div className="mp-preview-gallery">
                <div className="mp-preview-photo mp-preview-photo-main">
                  <div className="mp-preview-photo-inner" style={{ background: 'linear-gradient(135deg, #d48f6b44 0%, #f3ebe2cc 100%)' }}>
                    <Camera className="h-8 w-8 text-[#d48f6b]" />
                  </div>
                </div>
                <div className="mp-preview-col">
                  <div className="mp-preview-photo mp-preview-photo-sm">
                    <div className="mp-preview-photo-inner" style={{ background: 'linear-gradient(135deg, #bb765844 0%, #f8f1eacc 100%)' }}>
                      <ImagePlus className="h-5 w-5 text-[#bb7658]" />
                    </div>
                  </div>
                  <div className="mp-preview-photo mp-preview-photo-sm">
                    <div className="mp-preview-photo-inner" style={{ background: 'linear-gradient(135deg, #9a5f4444 0%, #f3ebe2cc 100%)' }}>
                      <Heart className="h-5 w-5 text-[#9a5f44]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* progress bar */}
              <div className="mp-preview-progress-wrap">
                <div className="mp-preview-progress-header">
                  <span className="mp-preview-progress-label">
                    <Gift className="h-3.5 w-3.5" />
                    Kampanya İlerlemesi
                  </span>
                  <span className="mp-preview-progress-pct">%78</span>
                </div>
                <div className="mp-preview-bar-track">
                  <motion.div
                    className="mp-preview-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: '78%' }}
                    transition={{ duration: 1.4, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <p className="mp-preview-bar-caption">2 paylaşım daha → Bedava kahve 🎁</p>
              </div>
            </div>

            {/* floating chip 1 */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              className="mp-float-chip mp-float-chip-qr"
            >
              <div className="mp-float-icon">
                <QrCode className="h-4 w-4" />
              </div>
              <div>
                <p className="mp-float-title">Masa 7 bağlandı</p>
                <p className="mp-float-sub">QR okutuldu · şimdi</p>
              </div>
            </motion.div>

            {/* floating chip 2 */}
            <motion.div
              animate={{ y: [0, 9, 0] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
              className="mp-float-chip mp-float-chip-upload"
            >
              <div className="mp-float-icon">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="mp-float-title">Ödül Kazanıldı! 🎉</p>
                <p className="mp-float-sub">Bedava içeçek hakkı</p>
              </div>
            </motion.div>

            {/* floating chip 3 */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
              className="mp-float-chip mp-float-chip-like"
            >
              <div className="mp-float-icon">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="mp-float-title">12 yeni fotoğraf</p>
                <p className="mp-float-sub">Bu hafta</p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* hero bottom gradient */}
        <div className="mp-hero-bottom-fade" aria-hidden="true" />
      </section>

      {/* ─── STATS BAR ─── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mp-stats-bar"
      >
        {STATS.map(({ value, label, icon: Icon }) => (
          <div key={label} className="mp-stat-item">
            <div className="mp-stat-icon">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="mp-stat-value">{value}</p>
              <p className="mp-stat-label">{label}</p>
            </div>
          </div>
        ))}
      </motion.section>

      {/* ─── HOW IT WORKS ─── */}
      <motion.section
        id="nasil-calisir"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.5 }}
        className="mp-section"
      >
        <div className="mp-section-header">
          <div className="mp-pill">Nasıl Çalışır?</div>
          <h2 className="mp-section-h2">
            Başlamak için<br /><span className="mp-accent-text">dört adım yeterli.</span>
          </h2>
          <p className="mp-section-sub">
            Teknik altyapı bizden. Siz sadece marka kimliğinizi girin ve müşterilerinizle buluşun.
          </p>
        </div>

        <div className="mp-steps-grid">
          {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc, color, accent }, i) => (
            <motion.article
              key={step}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mp-step-card"
            >
              <div className={`mp-step-glow bg-gradient-to-br ${color}`} aria-hidden="true" />
              <div className="mp-step-top">
                <div className="mp-step-num">{step}</div>
                <div className="mp-step-icon" style={{ color: accent }}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <h3 className="mp-step-title">{title}</h3>
              <p className="mp-step-desc">{desc}</p>
              {i < HOW_IT_WORKS.length - 1 && (
                <ChevronRight className="mp-step-arrow" aria-hidden="true" />
              )}
            </motion.article>
          ))}
        </div>
      </motion.section>

      {/* ─── FEATURES BENTO ─── */}
      <section id="ozellikler" className="mp-section">
        <div className="mp-section-header">
          <div className="mp-pill">Özellikler</div>
          <h2 className="mp-section-h2">
            Kafenizi<br /><span className="mp-accent-text">bir adım öne taşıyın.</span>
          </h2>
        </div>

        <div className="mp-bento-grid">
          {/* Large card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mp-bento-large"
          >
            <div className="mp-bento-large-inner">
              <div className="mp-bento-icon-wrap">
                <Store className="h-7 w-7" />
              </div>
              <h3 className="mp-bento-large-title">Kafenize Özel Sistemler</h3>
              <p className="mp-bento-large-desc">
                Her kafe kendi galerisi, renk paleti, QR kodları ve kampanya ayarlarıyla bağımsız çalışır.
                Birden fazla mekan sahibiyseniz hepsini tek hesapla yönetin.
              </p>
              <div className="mp-bento-large-visual">
                <div className="mp-bento-mini-card">
                  <div className="mp-bento-mini-dot mp-bento-mini-dot-1" />
                  <span>Ava Coffee</span>
                  <span className="mp-bento-mini-check"><Check className="h-3 w-3" /></span>
                </div>
                <div className="mp-bento-mini-card">
                  <div className="mp-bento-mini-dot mp-bento-mini-dot-2" />
                  <span>Lumina Café</span>
                  <span className="mp-bento-mini-check"><Check className="h-3 w-3" /></span>
                </div>
                <div className="mp-bento-mini-card mp-bento-mini-card-accent">
                  <div className="mp-bento-mini-dot mp-bento-mini-dot-3" />
                  <span>The Roast Corner</span>
                  <span className="mp-bento-mini-check"><Check className="h-3 w-3" /></span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Small card 1 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mp-bento-small"
          >
            <div className="mp-bento-icon-wrap">
              <Palette className="h-6 w-6" />
            </div>
            <h3 className="mp-bento-small-title">Marka Kimliğiniz</h3>
            <p className="mp-bento-small-desc">Logo, renk ve fontlarınız sisteme sorunsuz entegre olur.</p>
            <div className="mp-palette-row">
              {['#d48f6b', '#bb7658', '#7f4a36', '#f3ebe2', '#321b11'].map((c) => (
                <span key={c} className="mp-palette-dot" style={{ background: c }} />
              ))}
            </div>
          </motion.div>

          {/* Small card 2 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mp-bento-small"
          >
            <div className="mp-bento-icon-wrap">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="mp-bento-small-title">Güvenli Kontrol</h3>
            <p className="mp-bento-small-desc">Google hesabınızla giriş yapın. Sadece sizin panelinize siz erişirsiniz.</p>
            <div className="mp-security-row">
              <span className="mp-security-badge">🔒 Google Auth</span>
              <span className="mp-security-badge">Firestore Rules</span>
            </div>
          </motion.div>

          {/* Medium card 1 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="mp-bento-medium"
          >
            <div className="mp-bento-icon-wrap">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h3 className="mp-bento-small-title">Canlı Galeri</h3>
            <p className="mp-bento-small-desc">Paylaşımlar anında kafenin interaktif galerisinde herkese görünür hale gelir.</p>
            <div className="mp-live-indicator">
              <span className="mp-live-dot" />
              <span className="mp-live-text">CANLI</span>
            </div>
          </motion.div>

          {/* Medium card 2 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="mp-bento-medium"
          >
            <div className="mp-bento-icon-wrap">
              <Gift className="h-6 w-6" />
            </div>
            <h3 className="mp-bento-small-title">Kampanya & Ödüller</h3>
            <p className="mp-bento-small-desc">Esnek hedef sistemiyle siz belirlersiniz, müşteriler kazanır.</p>
            <div className="mp-reward-preview">
              <div className="mp-reward-track">
                <motion.div
                  className="mp-reward-fill"
                  initial={{ width: 0 }}
                  whileInView={{ width: '65%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <p className="mp-reward-caption">
                <Sparkles className="h-3 w-3" /> 3 paylaşım kaldı
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── OWNER PANEL SHOWCASE ─── */}
      <section id="kafe-sahibi" className="mp-section">
        <div className="mp-owner-wrap">
          {/* Copy side */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="mp-owner-copy"
          >
            <div className="mp-pill">Kafe Sahibi Paneli</div>
            <h2 className="mp-owner-h2">
              Tüm kontrol<br /><span className="mp-accent-text">sizin elinizde.</span>
            </h2>
            <p className="mp-owner-sub">
              Google hesabınızla güvenle giriş yapın. Kafenizin görünümünü markanıza göre ayarlayın,
              kampanyaları yönetin ve galeriyi anlık izleyin.
            </p>

            <ul className="mp-owner-list">
              {[
                'QR kod bağlantılarını oluşturun ve yönetin',
                'Kampanya hedefini ve ödülü belirleyin',
                'Marka renklerinizi ve fontunuzu ayarlayın',
                'Galeriyi anlık izleyin ve içerik moderasyonu yapın',
                'Farklı kafeler arasında geçiş yapın',
              ].map((item) => (
                <li key={item} className="mp-owner-list-item">
                  <span className="mp-owner-check">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mp-owner-console">
              <div className="mp-owner-console-header">
                <BrandIcon className="mp-owner-console-icon" />
                <div>
                  <p className="mp-owner-console-title">Hesap Durumu</p>
                  <p className="mp-owner-console-sub">
                    {ownerEmail
                      ? `Aktif: ${ownerEmail}`
                      : 'Henüz giriş yapılmadı. Google hesabınızla erişin.'}
                  </p>
                </div>
              </div>

              {ownerAccessError && (
                <div className="mp-alert">{ownerAccessError}</div>
              )}

              {ownerEmail && !hasOwnerAccess && (
                <button onClick={onSwitchOwnerAccount} className="mp-btn-ghost mp-btn-full">
                  Farklı Hesapla Giriş Yap
                </button>
              )}

              <button onClick={onOpenOwnerPortal} className="mp-btn-primary mp-btn-full">
                <LayoutDashboard className="h-4 w-4" />
                {ownerButtonLabel}
              </button>
            </div>
          </motion.div>

          {/* Visual side */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mp-owner-visual"
          >
            <div className="mp-panel-mock">
              <div className="mp-panel-mock-topbar">
                <div className="mp-panel-mock-dots">
                  <span /><span /><span />
                </div>
                <span className="mp-panel-mock-title">ShareVibe · Yönetim Paneli</span>
              </div>
              <div className="mp-panel-mock-body">
                {/* Stats row */}
                <div className="mp-panel-stats">
                  {[
                    { icon: Camera, val: '47', lbl: 'Paylaşım' },
                    { icon: Heart, val: '128', lbl: 'Beğeni' },
                    { icon: Users, val: '23', lbl: 'Misafir' },
                  ].map(({ icon: Icon, val, lbl }) => (
                    <div key={lbl} className="mp-panel-stat">
                      <Icon className="h-4 w-4 text-[#d48f6b]" />
                      <span className="mp-panel-stat-val">{val}</span>
                      <span className="mp-panel-stat-lbl">{lbl}</span>
                    </div>
                  ))}
                </div>
                {/* mini gallery */}
                <div className="mp-panel-gallery">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="mp-panel-gallery-item"
                      style={{
                        opacity: 0.6 + i * 0.06,
                        background: `linear-gradient(135deg, hsl(${20 + i * 8}, 45%, ${75 - i * 4}%) 0%, hsl(${28 + i * 5}, 38%, 88%) 100%)`,
                      }}
                    />
                  ))}
                </div>
                {/* campaign bar */}
                <div className="mp-panel-campaign">
                  <div className="mp-panel-campaign-header">
                    <span><Gift className="h-3.5 w-3.5 inline mr-1" />Aktif Kampanya</span>
                    <span className="text-[#d48f6b] font-bold">%78</span>
                  </div>
                  <div className="mp-panel-campaign-track">
                    <div className="mp-panel-campaign-fill" style={{ width: '78%' }} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="mp-section">
        <div className="mp-section-header">
          <div className="mp-pill">Kafe Sahipleri Anlatıyor</div>
          <h2 className="mp-section-h2">
            Gerçek kafeler,<br /><span className="mp-accent-text">gerçek sonuçlar.</span>
          </h2>
        </div>

        <div className="mp-testimonials-grid">
          {TESTIMONIALS.map(({ quote, name, role, stars }, i) => (
            <motion.blockquote
              key={name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="mp-testimonial"
            >
              <div className="mp-testimonial-stars">
                {[...Array(stars)].map((_, s) => (
                  <Star key={s} className="h-4 w-4 fill-current text-[#d48f6b]" />
                ))}
              </div>
              <p className="mp-testimonial-quote">"{quote}"</p>
              <footer className="mp-testimonial-footer">
                <div className="mp-testimonial-avatar">
                  {name[0]}
                </div>
                <div>
                  <cite className="mp-testimonial-name">{name}</cite>
                  <p className="mp-testimonial-role">{role}</p>
                </div>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <motion.section
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mp-cta-banner"
      >
        <div className="mp-cta-glow" aria-hidden="true" />
        <div className="mp-cta-content">
          <div className="mp-pill mp-pill-dark">Hemen Başlayın</div>
          <h2 className="mp-cta-h2">
            Müşterileriniz için<br />
            <span className="mp-cta-accent">eşsiz bir deneyim</span> yaratın.
          </h2>
          <p className="mp-cta-sub">
            Demo ile kafenizin nasıl görüneceğini görün, ardından panelinizi açın.
            Kurulum 5 dakika sürer.
          </p>
          <div className="mp-cta-actions">
            <button onClick={onOpenDemo} className="mp-btn-primary mp-btn-lg mp-btn-glow">
              <PlayCircle className="h-5 w-5" />
              Canlı Demoyu Aç
            </button>
            <button onClick={onOpenOwnerPortal} className="mp-btn-ghost mp-btn-lg mp-btn-ghost-light">
              <ArrowRight className="h-5 w-5" />
              Panele Geç
            </button>
          </div>
        </div>
      </motion.section>

      {/* ─── FOOTER ─── */}
      <footer className="mp-footer">
        <button
          type="button"
          onClick={onHiddenAdminTrigger}
          className="mp-footer-brand"
          aria-label="ShareVibe"
        >
          <BrandSignature compact subtitle="Kafe deneyimini dijitalleştir" />
        </button>
        <p className="mp-footer-copy">© 2025 ShareVibe. Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
}

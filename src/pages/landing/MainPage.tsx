import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  Camera,
  ChevronDown,
  ChevronRight,
  Coffee,
  Gift,
  Heart,
  ImagePlus,
  LayoutDashboard,
  Mail,
  Megaphone,
  Menu,
  PlayCircle,
  QrCode,
  Send,
  ShieldCheck,
  Store,
  Users,
  X,
} from 'lucide-react';
import BrandSignature, { BrandIcon } from '../../components/brand/BrandSignature';
import PricingPlans from '../../components/pricing/PricingPlans';
import {
  SHAREVIBE_WHATSAPP_NUMBER,
  buildPlanWhatsappUrl,
  getPricingPlanByKey,
  type PricingPlan,
  type PricingPlanKey,
  type PricingQuote,
} from '../../config/pricing';

type MainPageProps = {
  onOpenDemo: () => void;
  onOpenOwnerPortal: () => void;
  onSwitchOwnerAccount: () => void;
  onHiddenAdminTrigger: () => void;
  ownerEmail: string | null;
  ownerAccessError: string | null;
  hasOwnerAccess: boolean;
  demoCafeName: string;
  initialRoutePath?: string;
  onOpenSecurityPolicy?: () => void;
};

const NAV_LINKS = [
  { href: '#nasil-calisir', label: 'Süreç' },
  { href: '#araclar', label: 'Araçlar' },
  { href: '#paketler', label: 'Planlar' },
  { href: '#faq', label: 'SSS' },
];

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=700&q=82',
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=700&q=82',
  'https://images.unsplash.com/photo-1523942839745-7848c839b661?auto=format&fit=crop&w=700&q=82',
];

const CAMPAIGN_IMAGES = [
  'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=700&q=82',
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=700&q=82',
  'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=700&q=82',
];

const heroStats = [
  { icon: Coffee, value: '5-7 iş günü', label: 'ortalama kurulum' },
  { icon: QrCode, value: 'Özel QR', label: 'masa düzenine uygun tasarım' },
  { icon: Camera, value: 'Canlı galeri', label: 'fotoğraflar tek bağlantıda' },
  { icon: Mail, value: 'Mail opsiyonel', label: 'ihtiyaca göre eklenir' },
];

const workflow = [
  {
    icon: Store,
    title: 'Keşif & Tasarım',
    text: 'Kafenizin marka dili, masa düzeni ve kampanya hedefi birlikte netleştirilir.',
  },
  {
    icon: QrCode,
    title: 'QR Stand Hazırlığı',
    text: 'Kafeye özel QR stand tasarımı ve canlı galeri bağlantısı hazırlanır.',
  },
  {
    icon: Camera,
    title: 'Misafir Paylaşır',
    text: 'Misafir QR kodu okutur, fotoğrafını yükler ve kampanya akışına katılır.',
  },
  {
    icon: BarChart3,
    title: 'Ölçüm & İyileştirme',
    text: 'Panelde paylaşım, izin ve kampanya performansı takip edilerek süreç geliştirilir.',
  },
];

const benefits = [
  {
    icon: Users,
    title: 'İzinli Misafir Verisi',
    text: 'Fotoğraf, doğum günü ve iletişim izinlerini tek panelde düzenli biçimde toplayın.',
  },
  {
    icon: Heart,
    title: 'Sadakat Akışı',
    text: 'Paylaşım yapan misafirleri ödül, indirim veya özel davetlerle tekrar ağırlayın.',
  },
  {
    icon: Megaphone,
    title: 'Organik Görünürlük',
    text: 'Misafir anılarını markanızla uyumlu bir galeri deneyimine dönüştürün.',
  },
  {
    icon: Mail,
    title: 'Opsiyonel Mail Pazarlama',
    text: 'Mail planında izinli müşterilere kampanya, özel gün ve geri kazanım e-postaları gönderin.',
  },
  {
    icon: ShieldCheck,
    title: 'Kontrollü Panel Erişimi',
    text: 'Kafe ekibiniz yalnızca gerekli alanlara erişir; kampanya ve galeri süreçleri düzenli şekilde yönetilir.',
  },
];

const tools = [
  {
    icon: LayoutDashboard,
    title: 'Yönetim Paneli',
    text: 'QR standlar, galeri, misafir izinleri ve kampanya performansı tek ekranda izlenir.',
    preview: 'dashboard',
  },
  {
    icon: Gift,
    title: 'Kampanya Yönetimi',
    text: 'Fotoğraf paylaşımı, doğum günü teklifi ve tekrar ziyaret akışlarını düzenleyin.',
    preview: 'campaigns',
  },
  {
    icon: Send,
    title: 'Mail Pazarlama',
    text: 'Yalnızca mail planında, izinli müşterilere segment bazlı e-posta kampanyaları gönderilir.',
    preview: 'emails',
  },
  {
    icon: ImagePlus,
    title: 'Markalı Şablonlar',
    text: 'Kampanya ve hikaye görünümleri kafenizin renkleriyle tutarlı hazırlanır.',
    preview: 'templates',
  },
  {
    icon: QrCode,
    title: 'QR Kod & Masa Standları',
    text: 'Masaya uygun, okunabilir ve markalı QR standlar ile paylaşım deneyimi başlar.',
    preview: 'qr',
  },
];

const campaigns = [
  {
    tag: 'Sadakat',
    title: '4 Fotoğraf Paylaş, Kahve Kazan',
    text: 'Paylaşımı teşvik eden, kafenin yoğunluğuna göre düzenlenebilen ödül akışı.',
    cta: 'Tekrar ziyareti destekler',
    image: CAMPAIGN_IMAGES[0],
  },
  {
    tag: 'Özel Gün',
    title: 'Doğum Gününe Özel Teklif',
    text: 'İzinli müşterilere özel gün yaklaşırken nazik ve kişisel bir teklif sunulur.',
    cta: 'Kişisel iletişim kurar',
    image: CAMPAIGN_IMAGES[1],
  },
  {
    tag: 'Geri Kazanım',
    title: 'Uzun Süredir Gelmeyen Misafir',
    text: 'Belirli süre uğramayan misafire uygun kanaldan geri dönüş teklifi hazırlanır.',
    cta: 'Bağlılığı artırır',
    image: CAMPAIGN_IMAGES[2],
  },
];

const faqs = [
  {
    question: 'ShareVibe tam olarak ne sağlar?',
    answer:
      'ShareVibe, kafenizdeki QR kodlarla fotoğraf paylaşımı, canlı galeri, kampanya takibi ve isteğe bağlı mail pazarlamasını tek panelde yönetmenizi sağlar.',
  },
  {
    question: 'Kurulum süreci nasıl ilerler?',
    answer:
      'Ön görüşmede kafe bilgileri, masa düzeni ve ihtiyaçlar netleşir. Ardından QR stand tasarımı, canlı galeri kurulumu ve panel hazırlığı ortalama 5-7 iş günü içinde tamamlanır.',
  },
  {
    question: 'Mail entegrasyonu zorunlu mu?',
    answer:
      'Hayır. Standart Plan ile QR paylaşım, canlı galeri, temel kampanya ve raporlama kullanılabilir. Mail kampanyaları yalnızca Mail Entegrasyonlu Plan’da açıktır.',
  },
  {
    question: 'Misafirler uygulama indirmek zorunda mı?',
    answer:
      'Hayır. Misafir masadaki QR kodu telefon kamerasıyla okutur, web sayfası üzerinden fotoğrafını paylaşır ve kampanya akışına katılır.',
  },
  {
    question: 'QR stand tasarımı kafe markasına uygun hazırlanır mı?',
    answer:
      'Evet. Logo, renkler, masa yerleşimi ve okunabilirlik birlikte değerlendirilir. Tasarım kafenin görünümüne uyacak şekilde hazırlanır.',
  },
  {
    question: 'Plan seçince ödeme hemen alınır mı?',
    answer:
      'Hayır. Plan seçimi WhatsApp üzerinden iletişim başlatır. Kafe bilgileri, masa sayısı, mail ihtiyacı ve kurulum kapsamı netleşmeden ödeme süreci başlatılmaz.',
  },
  {
    question: 'Destek ve güncellemeler nasıl sağlanır?',
    answer:
      'Kurulumdan sonra panel kullanımı için kısa bilgilendirme yapılır. İhtiyaç halinde WhatsApp üzerinden destek verilir ve ürün geliştirmeleri düzenli olarak panele yansıtılır.',
  },
];

const legalDocuments = [
  {
    id: 'gizlilik-politikasi',
    title: 'Gizlilik Politikası',
    intro:
      'Bu metin, ShareVibe web sitesi ve kafe paneli kullanılırken hangi bilgilerin hangi amaçlarla işlendiğini sade şekilde açıklar.',
    sections: [
      {
        title: 'Toplanan bilgiler',
        text: 'Kafe adı, yetkili iletişim bilgisi, panel kullanım kayıtları, kampanya tercihleri ve destek görüşmelerinde paylaşılan bilgiler işlenebilir.',
      },
      {
        title: 'Kullanım amacı',
        text: 'Bu bilgiler kurulum görüşmesi yapmak, kafe panelini çalıştırmak, destek sağlamak, güvenliği korumak ve hizmet kalitesini geliştirmek için kullanılır.',
      },
      {
        title: 'Paylaşım ve saklama',
        text: 'Bilgiler yalnızca hizmetin sunulması için gerekli sistemlerde saklanır. Yetkisiz üçüncü kişilerle satılmaz veya pazarlama amacıyla paylaşılmaz.',
      },
    ],
  },
  {
    id: 'cerez-politikasi',
    title: 'Çerez Politikası',
    intro:
      'ShareVibe, sitenin güvenli ve düzgün çalışması için gerekli çerezleri ve sınırlı performans ölçüm araçlarını kullanabilir.',
    sections: [
      {
        title: 'Zorunlu çerezler',
        text: 'Oturum güvenliği, tercihlerin hatırlanması ve temel site işlevlerinin çalışması için gerekli teknik çerezler kullanılabilir.',
      },
      {
        title: 'Performans ölçümü',
        text: 'Sayfanın hızlı yüklenmesi, hata takibi ve genel kullanım deneyiminin iyileştirilmesi için kimlik belirlemeyen teknik sinyaller değerlendirilebilir.',
      },
      {
        title: 'Tercih yönetimi',
        text: 'Tarayıcı ayarlarınızdan çerezleri silebilir veya sınırlandırabilirsiniz. Bazı teknik çerezlerin kapatılması site işlevlerini etkileyebilir.',
      },
    ],
  },
  {
    id: 'kullanim-kosullari',
    title: 'Kullanım Koşulları',
    intro:
      'ShareVibe kullanımı, kafe hesabının doğru bilgilerle oluşturulmasını ve platformun amacına uygun kullanılmasını gerektirir.',
    sections: [
      {
        title: 'Hesap ve panel kullanımı',
        text: 'Kafe hesabındaki yetkiler işletme sorumluluğundadır. Panel erişimi yalnızca yetkili ekip üyeleriyle paylaşılmalıdır.',
      },
      {
        title: 'İçerik sorumluluğu',
        text: 'Kafe paneline yüklenen görseller, kampanya metinleri ve marka içerikleri ilgili işletmenin kontrolünde yönetilir.',
      },
      {
        title: 'Hizmet kapsamı',
        text: 'Kurulum kapsamı, plan seçimi, mail ihtiyacı ve teknik gereksinimler ön görüşme sonrası netleştirilir.',
      },
    ],
  },
  {
    id: 'ticari-ileti-izni',
    title: 'Ticari İleti İzni',
    intro:
      'Mail kampanyaları yalnızca ilgili kafenin izinli müşteri listeleri üzerinden ve işletmenin belirlediği iletişim amacıyla yürütülür.',
    sections: [
      {
        title: 'İzinli gönderim',
        text: 'E-posta kampanyaları, mail entegrasyonlu plan kapsamında izinli alıcılara gönderilir. Standart planda bu modül kapalıdır.',
      },
      {
        title: 'Abonelikten çıkma',
        text: 'Alıcıların iletişimden ayrılma talepleri dikkate alınır ve kampanya listeleri buna göre güncellenir.',
      },
      {
        title: 'Kurulum gereksinimi',
        text: 'Resmi gönderici alan adı, teknik doğrulama ve mail altyapısı ihtiyacı işletmeye göre ayrıca değerlendirilir.',
      },
    ],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const transition = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };

function MetricChart() {
  return (
    <svg className="sv-chart" viewBox="0 0 440 132" role="img" aria-label="Örnek performans eğilimi">
      <path
        d="M8 114 C42 102 58 88 86 92 C120 97 128 61 164 68 C198 76 205 50 242 58 C284 68 294 35 333 42 C374 52 392 26 432 30 L432 132 L8 132 Z"
        fill="rgba(216, 137, 73, 0.18)"
      />
      <path
        d="M8 114 C42 102 58 88 86 92 C120 97 128 61 164 68 C198 76 205 50 242 58 C284 68 294 35 333 42 C374 52 392 26 432 30"
        fill="none"
        stroke="#f3a45f"
        strokeLinecap="round"
        strokeWidth="4"
      />
    </svg>
  );
}

function ToolPreview({ type }: { type: string }) {
  if (type === 'dashboard') {
    return (
      <div className="sv-tool-ui is-dashboard">
        <div className="sv-tool-tabs"><span>Bugün</span><span>Galeri</span><span>İzinler</span></div>
        <div className="sv-tool-kpis"><b>18</b><b>7</b><b>42</b></div>
        <div className="sv-tool-kpi-labels"><span>Paylaşım</span><span>Yeni izin</span><span>QR okuma</span></div>
        <MetricChart />
      </div>
    );
  }

  if (type === 'campaigns') {
    return (
      <div className="sv-tool-ui">
        {['4 fotoğraf paylaşım ödülü', 'Doğum günü teklifi', 'Geri dönüş daveti'].map((item) => (
          <div key={item} className="sv-tool-line">
            <span>{item}</span>
            <em>Hazır</em>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'emails') {
    return (
      <div className="sv-tool-ui is-mail">
        <div>
          <span>Mail planı</span>
          <strong>İzinli müşterilere kampanya</strong>
          <small>Segment, şablon ve gönderim takibi dahil.</small>
        </div>
        <Mail className="h-8 w-8" />
      </div>
    );
  }

  if (type === 'templates') {
    return (
      <div className="sv-tool-ui is-templates">
        {HERO_IMAGES.slice(1, 4).map((src, index) => (
          <img key={src} src={src} alt={`Markalı kampanya şablonu ${index + 1}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
        ))}
      </div>
    );
  }

  return (
    <div className="sv-tool-ui is-qr">
      <div className="sv-mini-qr" />
      <div>
        <strong>Masadaki QR ile anı paylaş</strong>
        <span>Okunabilir, markalı ve masa düzenine uygun.</span>
      </div>
    </div>
  );
}

export default function MainPage({
  onOpenDemo,
  onOpenOwnerPortal,
  onSwitchOwnerAccount,
  onHiddenAdminTrigger,
  ownerEmail,
  ownerAccessError,
  hasOwnerAccess,
  demoCafeName,
  initialRoutePath = '/',
  onOpenSecurityPolicy,
}: MainPageProps) {
  const [activeFaqIndex, setActiveFaqIndex] = useState(0);
  const [selectedPlanKey, setSelectedPlanKey] = useState<PricingPlanKey | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [activeLegalDocumentId, setActiveLegalDocumentId] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const selectedPlan = useMemo(() => (selectedPlanKey ? getPricingPlanByKey(selectedPlanKey) : null), [selectedPlanKey]);
  const activeLegalDocument = useMemo(
    () => legalDocuments.find((document) => document.id === activeLegalDocumentId) || null,
    [activeLegalDocumentId]
  );
  const contactWhatsappUrl = useMemo(
    () =>
      `https://wa.me/${SHAREVIBE_WHATSAPP_NUMBER}?text=${encodeURIComponent(
        'Merhaba, ShareVibe kurulumu hakkında bilgi almak istiyorum.'
      )}`,
    []
  );

  const ownerButtonLabel = hasOwnerAccess
 'Yönetim Paneline Git'
    : ownerEmail
 'Yetki Bekleniyor'
      : 'Kafe Girişi';

  const closeMobileNav = () => {
    setIsMobileNavOpen(false);
  };

  useEffect(() => {
    const routePath = initialRoutePath.replace(/\/+$/, '') || '/';
    const sectionByPath: Record<string, string> = {
      '/features': 'araclar',
      '/pricing': 'paketler',
      '/contact': 'iletisim',
    };
    const legalDocumentByPath: Record<string, string> = {
      '/privacy-policy': 'gizlilik-politikasi',
      '/terms-of-service': 'kullanim-kosullari',
    };

    const legalDocumentId = legalDocumentByPath[routePath];
    if (legalDocumentId) {
      setActiveLegalDocumentId(legalDocumentId);
      return;
    }

    const sectionId = sectionByPath[routePath];
    if (!sectionId || typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ block: 'start' });
    });
  }, [initialRoutePath]);

  const handlePlanSelect = (planKey: PricingPlanKey, _plan?: PricingPlan, quote?: PricingQuote) => {
    setSelectedPlanKey(planKey);

    if (typeof window === 'undefined') return;

    window.open(
      buildPlanWhatsappUrl({
        planKey,
        cafeName: demoCafeName,
        ownerEmail,
        source: 'Ana Sayfa',
        tableCount: quote?.tableCount,
      }),
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="sv-root">
      <header className="sv-nav">
        <div className="sv-nav-inner">
          <button type="button" className="sv-brand-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="ShareVibe ana sayfa">
            <BrandSignature compact subtitle={null} />
          </button>

          <nav aria-label="Ana gezinme" className="sv-nav-links">
            {NAV_LINKS.map((item) => (
              <a key={item.href} href={item.href} onClick={closeMobileNav}>{item.label}</a>
            ))}
          </nav>

          <div className="sv-nav-actions">
            <button
              type="button"
              className="sv-icon-btn"
              aria-label={isMobileNavOpen ? 'Menüyü kapat' : 'Menüyü aç'}
              aria-expanded={isMobileNavOpen}
              onClick={() => setIsMobileNavOpen((isOpen) => !isOpen)}
            >
              {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <button type="button" className="sv-ghost-btn" onClick={onOpenDemo}>
              <PlayCircle className="h-4 w-4" />
              Canlı Önizleme
            </button>
            <button type="button" className="sv-primary-btn" onClick={onOpenOwnerPortal}>
              {ownerButtonLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMobileNavOpen ? (
            <motion.div
              className="sv-mobile-nav"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {NAV_LINKS.map((item) => (
                <a key={item.href} href={item.href} onClick={closeMobileNav}>{item.label}</a>
              ))}
              <button type="button" onClick={() => { closeMobileNav(); onOpenDemo(); }}>
                Canlı Önizleme
              </button>
              <button type="button" onClick={() => { closeMobileNav(); onOpenOwnerPortal(); }}>
                {ownerButtonLabel}
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <main>
        <section className="sv-hero">
          <motion.div
            className="sv-hero-copy"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            initial="hidden"
            animate="show"
          >
            <motion.h1 variants={fadeUp} transition={transition}>
              Müşterilerinizin anılarını
              <span> büyümeye dönüştürün.</span>
            </motion.h1>
            <motion.p variants={fadeUp} transition={transition}>
              QR ile paylaşımı kolaylaştırın, canlı galeriyle etkileşimi artırın ve izinli müşteri verisini
              kampanya akışlarına dönüştürün.
            </motion.p>
            <motion.div className="sv-hero-actions" variants={fadeUp} transition={transition}>
              <button type="button" className="sv-primary-btn sv-large-btn" onClick={onOpenOwnerPortal}>
                Hemen Başla
                <ArrowRight className="h-5 w-5" />
              </button>
              <button type="button" className="sv-outline-btn sv-large-btn" onClick={onOpenDemo}>
                Canlı Önizleme
                <PlayCircle className="h-5 w-5" />
              </button>
            </motion.div>
            <motion.small className="sv-hero-note" variants={fadeUp} transition={transition}>
              Ortalama kurulum 5-7 iş günü, kafeye özel QR tasarım dahildir.
            </motion.small>
          </motion.div>

          <motion.div
            className="sv-hero-visual"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...transition, delay: 0.18 }}
          >
            <motion.div
              className="sv-hero-stage"
              animate={shouldReduceMotion ? undefined : { y: [0, -8, 0], rotateY: [-3, 2, -3] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="sv-phone">
                <div className="sv-phone-bar">
                  <span>{demoCafeName}</span>
                  <Heart className="h-3.5 w-3.5" />
                </div>
                <button type="button" className="sv-phone-cta">Anını Paylaş</button>
                <div className="sv-phone-grid">
                  {HERO_IMAGES.map((src, index) => (
                    <img
                      key={src}
                      src={src}
                      alt={`Canlı galeri örneği ${index + 1}`}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      fetchPriority={index === 0 ? 'high' : 'auto'}
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
              </div>

              <div className="sv-heart-bubble">
                <Heart className="h-5 w-5" />
                <span>Yeni anı</span>
              </div>

              <div className="sv-dashboard-card">
                <div className="sv-dashboard-head">
                  <span>Kurulum Takibi</span>
                  <small>5-7 iş günü</small>
                </div>
                <div className="sv-dashboard-kpis">
                  <div><strong>1</strong><span>Marka keşfi</span></div>
                  <div><strong>2</strong><span>QR tasarım</span></div>
                  <div><strong>3</strong><span>Panel eğitimi</span></div>
                </div>
                <MetricChart />
              </div>
            </motion.div>
          </motion.div>
        </section>

        <section className="sv-stat-strip" aria-label="ShareVibe kurulum bilgileri">
          {heroStats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="sv-stat-item">
              <Icon className="h-7 w-7" />
              <div>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            </div>
          ))}
        </section>

        <section id="nasil-calisir" className="sv-section sv-workflow">
          <div className="sv-section-title">
            <h2>Nasıl Çalışır?</h2>
          </div>
          <div className="sv-step-track" aria-hidden="true" />
          <div className="sv-step-grid">
            {workflow.map(({ icon: Icon, title, text }, index) => (
              <motion.article
                key={title}
                className="sv-step-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.28 }}
                transition={{ ...transition, delay: index * 0.06 }}
              >
                <span className="sv-step-number">{index + 1}</span>
                <div className="sv-step-icon"><Icon className="h-8 w-8" /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="faydalar" className="sv-section">
          <div className="sv-section-title">
            <h2>Kafe Sahipleri İçin Faydalar</h2>
          </div>
          <div className="sv-benefit-grid">
            {benefits.map(({ icon: Icon, title, text }, index) => (
              <motion.article
                key={title}
                className="sv-benefit-card"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.24 }}
                transition={{ ...transition, delay: index * 0.05 }}
              >
                <Icon className="h-7 w-7" />
                <h3>{title}</h3>
                <p>{text}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="araclar" className="sv-section">
          <div className="sv-section-title">
            <h2>Tüm Araçlarınız Tek Platformda</h2>
          </div>
          <div className="sv-tool-list">
            {tools.map(({ icon: Icon, title, text, preview }, index) => (
              <motion.article
                key={title}
                className="sv-tool-row"
                initial={{ opacity: 0, x: index % 2 === 0 ? -18 : 18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.24 }}
                transition={{ ...transition, delay: index * 0.04 }}
              >
                <div className="sv-tool-copy">
                  <span><Icon className="h-5 w-5" /></span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </div>
                <ToolPreview type={preview} />
                <ChevronRight className="sv-tool-arrow h-5 w-5" />
              </motion.article>
            ))}
          </div>

          <div className="sv-owner-access">
            <div>
              <span>Panel Durumu</span>
              <strong>{ownerEmail ? ownerEmail : 'Google hesabınızla güvenli giriş yapın.'}</strong>
              {ownerAccessError ? <p>{ownerAccessError}</p> : null}
            </div>
            <div className="sv-owner-actions">
              {ownerEmail && !hasOwnerAccess ? (
                <button type="button" className="sv-outline-btn" onClick={onSwitchOwnerAccount}>
                  Farklı Hesapla Giriş Yap
                </button>
              ) : null}
              <button type="button" className="sv-primary-btn" onClick={onOpenOwnerPortal}>
                <LayoutDashboard className="h-4 w-4" />
                {ownerButtonLabel}
              </button>
            </div>
          </div>
        </section>

        <section className="sv-section">
          <div className="sv-section-title">
            <h2>Kampanya Örnekleri</h2>
          </div>
          <div className="sv-campaign-grid">
            {campaigns.map((campaign, index) => (
              <motion.article
                key={campaign.title}
                className="sv-campaign-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ ...transition, delay: index * 0.07 }}
              >
                <img src={campaign.image} alt={campaign.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                <div>
                  <span>{campaign.tag}</span>
                  <h3>{campaign.title}</h3>
                  <p>{campaign.text}</p>
                  <strong>{campaign.cta}</strong>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <PricingPlans id="paketler" className="sv-section" selectedKey={selectedPlanKey} onSelect={handlePlanSelect} />

        <section id="faq" className="sv-section sv-faq">
          <div className="sv-section-title">
            <h2>Sık Sorulan Sorular</h2>
          </div>
          <div className="sv-faq-list">
            {faqs.map((faq, index) => {
              const isOpen = activeFaqIndex === index;
              return (
                <div key={faq.question} className={`sv-faq-item ${isOpen ? 'is-open' : ''}`}>
                  <button type="button" onClick={() => setActiveFaqIndex(isOpen ? -1 : index)} aria-expanded={isOpen}>
                    <span>{faq.question}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        className="sv-faq-answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: 'easeOut' }}
                      >
                        <p>{faq.answer}</p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        <section id="iletisim" className="sv-final-cta">
          <div>
            <h2>Kafenizin dijital anı deneyimini birlikte hazırlayalım.</h2>
            <p>
              QR stand, canlı galeri, kampanya kurgusu ve mail ihtiyacınızı birlikte değerlendirelim.
              Kurulum kapsamı netleşmeden ödeme süreci başlatılmaz.
            </p>
            <button type="button" className="sv-primary-btn sv-large-btn" onClick={onOpenOwnerPortal}>
              Kafe Paneline Geç
              <ArrowRight className="h-5 w-5" />
            </button>
            <small>Ortalama kurulum 5-7 iş günü, ön görüşme WhatsApp üzerinden yapılır.</small>
          </div>
          <img src={HERO_IMAGES[2]} alt="Kafe masasında latte fincanları" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
        </section>
      </main>

      <footer className="sv-footer">
        <div className="sv-footer-brand">
          <button type="button" onClick={onHiddenAdminTrigger} aria-label="ShareVibe yönetici erişimi">
            <BrandSignature compact subtitle={null} />
          </button>
          <p>Kafeler için QR fotoğraf paylaşımı, canlı galeri, kampanya ve isteğe bağlı mail pazarlama altyapısı.</p>
          {selectedPlan ? (
            <small>Son seçilen plan: {selectedPlan.title}, {selectedPlan.price} {selectedPlan.billingLabel}</small>
          ) : null}
        </div>
        <div>
          <strong>Platform</strong>
          <a href="#nasil-calisir">Kurulum Süreci</a>
          <a href="#araclar">Araçlar</a>
          <a href="#paketler">Planlar</a>
          <a href="#faq">Sık Sorulan Sorular</a>
        </div>
        <div>
          <strong>Kafe İşlemleri</strong>
          <button type="button" onClick={onOpenOwnerPortal}>Kafe Paneli</button>
          <button type="button" onClick={onOpenDemo}>Canlı Önizleme</button>
          <a href={contactWhatsappUrl} target="_blank" rel="noopener noreferrer">Kurulum Görüşmesi</a>
        </div>
        <div>
          <strong>Belgeler</strong>
          {legalDocuments.map((document) => (
            <button key={document.id} type="button" onClick={() => setActiveLegalDocumentId(document.id)}>
              {document.title}
            </button>
          ))}
          <button type="button" onClick={onOpenSecurityPolicy}>
            Güvenlik Politikası
          </button>
        </div>
        <p className="sv-copyright">© 2026 ShareVibe. Tüm hakları saklıdır. Kurulum görüşmeleri WhatsApp üzerinden yapılır.</p>
      </footer>

      <AnimatePresence>
        {activeLegalDocument ? (
          <motion.div
            className="sv-legal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sv-legal-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="sv-legal-backdrop"
              aria-label="Belgeyi kapat"
              onClick={() => setActiveLegalDocumentId(null)}
            />
            <motion.article
              className="sv-legal-sheet"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="sv-legal-sheet-head">
                <div>
                  <span>ShareVibe belgesi</span>
                  <h2 id="sv-legal-title">{activeLegalDocument.title}</h2>
                </div>
                <button type="button" className="sv-icon-btn" aria-label="Belgeyi kapat" onClick={() => setActiveLegalDocumentId(null)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p>{activeLegalDocument.intro}</p>
              <div className="sv-legal-document-list">
                {activeLegalDocument.sections.map((section) => (
                  <section key={section.title}>
                    <h3>{section.title}</h3>
                    <p>{section.text}</p>
                  </section>
                ))}
              </div>
              <small>
                Bu belge ShareVibe web sitesi ve kafe paneli kullanımını açıklamak için hazırlanmıştır. Kafenize özel sözleşme ve kurulum kapsamı ön görüşmede netleştirilir.
              </small>
            </motion.article>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <BrandIcon className="sv-hidden-brand-mark" />
    </div>
  );
}

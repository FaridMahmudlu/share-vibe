import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  staticFile,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { CSSProperties, ReactNode } from 'react';
import {
  BarChart3,
  Camera,
  Check,
  Coffee,
  Gift,
  Heart,
  ImagePlus,
  LayoutDashboard,
  Lock,
  Mail,
  Palette,
  QrCode,
  SendHorizontal,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from 'lucide-react';

const COLORS = {
  bg: '#110c09',
  panel: '#1d1511',
  panelSoft: '#261b16',
  panelLine: '#3a2a22',
  accent: '#d48f6b',
  accentDark: '#8f5a40',
  cream: '#f7eadb',
  muted: '#b8a99b',
  green: '#76d672',
  red: '#f06f86',
  blue: '#7aa2ff',
  violet: '#a37cff',
};

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

type SceneId =
  | 'opening'
  | 'qr'
  | 'gallery'
  | 'sharing'
  | 'reward'
  | 'admin'
  | 'email'
  | 'security'
  | 'final';

type SceneConfig = {
  id: SceneId;
  number: string;
  kicker: string;
  title: string;
  subtitle: string;
  voiceover: string;
  start: number;
  duration: number;
  render: () => ReactNode;
};

const SCENES: SceneConfig[] = [
  {
    id: 'opening',
    number: '01',
    kicker: 'Masa deneyimi',
    title: 'Masadaki deneyim, dijital sadakate dönüşsün.',
    subtitle: 'QR standdan başlayan etkileşim, ölçülebilir bir müşteri döngüsüne bağlanır.',
    voiceover:
      'ShareVibe, kafelerdeki anlık müşteri etkileşimini ölçülebilir bir sadakat döngüsüne dönüştürür.',
    start: 0,
    duration: 8,
    render: () => <OpeningVisual />,
  },
  {
    id: 'qr',
    number: '02',
    kicker: 'QR ile başlangıç',
    title: 'QR okut. Kafeye özel akışa gir.',
    subtitle: 'Kafe ve masa bilgisi otomatik çözülür; doğru galeri ve kampanya açılır.',
    voiceover:
      'Müşteri masadaki QR kodu okutur. Sistem kafe ve masa bilgisini otomatik tanır.',
    start: 8,
    duration: 9,
    render: () => <QrVisual />,
  },
  {
    id: 'gallery',
    number: '03',
    kicker: 'Fotoğraf paylaşımı',
    title: 'Fotoğraf paylaşılır. Galeri anında canlanır.',
    subtitle: 'Google giriş, açıklama, yükleme ve canlı galeri tek mobil akışta buluşur.',
    voiceover:
      'Müşteriler Google hesaplarıyla güvenli giriş yapar, fotoğraf paylaşır ve kafenin canlı galerisine katılır.',
    start: 17,
    duration: 13,
    render: () => <GalleryVisual />,
  },
  {
    id: 'sharing',
    number: '04',
    kicker: 'Etkileşim',
    title: 'Beğeni, paylaşım ve görünürlük tek akışta.',
    subtitle: 'Her fotoğraf sosyal paylaşıma ve kafenin dijital görünürlüğüne destek olur.',
    voiceover:
      'Paylaşımlar beğenilir, link olarak paylaşılır ve kafenin sosyal enerjisi dijital ortama taşınır.',
    start: 30,
    duration: 9,
    render: () => <SharingVisual />,
  },
  {
    id: 'reward',
    number: '05',
    kicker: 'Kampanya ve ödül',
    title: 'Kampanya ilerler. Ödül tetiklenir.',
    subtitle: 'Paylaşım hedefi tamamlanınca ödül ekranı açılır ve tekrar ziyaret motivasyonu oluşur.',
    voiceover:
      'Belirlenen paylaşım hedefi tamamlandığında ödül deneyimi otomatik gösterilir. Böylece paylaşım, tekrar ziyarete bağlanır.',
    start: 39,
    duration: 13,
    render: () => <RewardVisual />,
  },
  {
    id: 'admin',
    number: '06',
    kicker: 'Kafe sahibi paneli',
    title: 'Tek panelden tam kontrol.',
    subtitle: 'QR standlar, galeri, kampanyalar, müşteriler ve metrikler aynı operasyon ekranında.',
    voiceover:
      'Kafe sahibi; marka rengini, galeri akışını, QR bağlantılarını, kampanya hedeflerini ve performans metriklerini tek panelden yönetir.',
    start: 52,
    duration: 12,
    render: () => <AdminVisual />,
  },
  {
    id: 'email',
    number: '07',
    kicker: 'E-posta pazarlaması',
    title: 'Galeri etkileşimi, pazarlama verisine dönüşür.',
    subtitle: 'Müşteri listeleri, hazır Türkçe şablonlar ve kampanya raporları tek yerde takip edilir.',
    voiceover:
      'ShareVibe, ziyaretçileri müşteri listesine bağlar; kampanya e-postaları, hedef kitleler ve performans raporlarıyla geri dönüşü destekler.',
    start: 64,
    duration: 10,
    render: () => <EmailVisual />,
  },
  {
    id: 'security',
    number: '08',
    kicker: 'Güvenlik ve altyapı',
    title: 'Google giriş. Firebase güvenliği. Çoklu kafe yapısı.',
    subtitle: 'Her kafe kendi çalışma alanında izole edilir; yetki ve veri kuralları birlikte çalışır.',
    voiceover:
      'Her kafe kendi çalışma alanında izole çalışır. Yetkilendirme, veri kuralları ve güvenli depolama altyapının temelidir.',
    start: 74,
    duration: 6,
    render: () => <SecurityVisual />,
  },
  {
    id: 'final',
    number: '09',
    kicker: 'ShareVibe',
    title: 'Kafe deneyimini dijitalleştir.',
    subtitle: 'Sadakati ölçülebilir hale getir.',
    voiceover:
      'ShareVibe ile masadan başlayan deneyimi, galeriye, ödüle ve tekrar ziyarete bağlayın.',
    start: 80,
    duration: 5,
    render: () => <FinalVisual />,
  },
];

const ease = Easing.bezier(0.16, 1, 0.3, 1);

const clamp = (
  frame: number,
  input: [number, number],
  output: [number, number],
  easing = ease
) =>
  interpolate(frame, input, output, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

const secondsToFrames = (seconds: number) => Math.round(seconds * FPS);

const cardStyle: CSSProperties = {
  border: `1px solid ${COLORS.panelLine}`,
  background:
    'linear-gradient(145deg, rgba(40,28,22,0.96), rgba(23,16,13,0.96))',
  boxShadow: '0 34px 90px rgba(0,0,0,0.34)',
};

const useLocalProgress = (durationSeconds: number) => {
  const frame = useCurrentFrame();
  const duration = durationSeconds * FPS;
  return {
    frame,
    duration,
    progress: Math.min(1, Math.max(0, frame / duration)),
  };
};

const MasterBackground = () => {
  const frame = useCurrentFrame();
  const driftA = Math.sin(frame / 140) * 18;
  const driftB = Math.cos(frame / 170) * 24;

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 18% 18%, rgba(212,143,107,0.18), transparent 28%), radial-gradient(circle at 84% 14%, rgba(118,214,114,0.08), transparent 22%), linear-gradient(135deg, #0d0907 0%, #17100d 45%, #0b0807 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 80 + driftA,
          top: 80,
          width: 640,
          height: 640,
          borderRadius: 999,
          background: 'rgba(212,143,107,0.12)',
          filter: 'blur(95px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -140,
          bottom: 80 + driftB,
          width: 720,
          height: 720,
          borderRadius: 999,
          background: 'rgba(84,55,40,0.46)',
          filter: 'blur(120px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.16,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          transform: `translate3d(${-(frame % 64)}px, ${-(frame % 64)}px, 0)`,
        }}
      />
    </AbsoluteFill>
  );
};

const BrandHeader = ({ scene }: { scene: SceneConfig }) => (
  <div
    style={{
      position: 'absolute',
      top: 52,
      left: 72,
      right: 72,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 20,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          overflow: 'hidden',
          background: '#fff',
          boxShadow: '0 18px 45px rgba(0,0,0,0.28)',
        }}
      >
        <Img
          src={staticFile('sharevibe-logo.png')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <div>
        <div
          style={{
            color: COLORS.cream,
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: 0,
          }}
        >
          Share<span style={{ color: COLORS.accent }}>Vibe</span>
        </div>
        <div style={{ color: COLORS.muted, fontSize: 14, marginTop: 2 }}>
          Topluluk Odaklı Kahve Deneyimi
        </div>
      </div>
    </div>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        color: COLORS.muted,
        fontSize: 17,
        fontWeight: 700,
      }}
    >
      <span style={{ color: COLORS.accent }}>{scene.number}</span>
      <span>{scene.kicker}</span>
    </div>
  </div>
);

const SceneFrame = ({ scene }: { scene: SceneConfig }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = scene.duration * fps;
  const intro = clamp(frame, [0, 20], [0, 1]);
  const outro = clamp(frame, [duration - 24, duration], [1, 0], Easing.bezier(0.7, 0, 0.84, 0));
  const opacity = intro * outro;
  const y = clamp(frame, [0, 28], [24, 0]);
  const textDelay = clamp(frame, [10, 38], [0, 1]);

  return (
    <AbsoluteFill style={{ opacity }}>
      <BrandHeader scene={scene} />
      <div
        style={{
          position: 'absolute',
          left: 92,
          top: 184,
          width: 680,
          zIndex: 10,
          transform: `translateY(${y}px)`,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            borderRadius: 999,
            border: `1px solid rgba(212,143,107,0.35)`,
            background: 'rgba(212,143,107,0.12)',
            color: COLORS.accent,
            fontWeight: 800,
            fontSize: 16,
          }}
        >
          <Sparkles size={18} />
          {scene.kicker}
        </div>
        <h1
          style={{
            color: COLORS.cream,
            fontSize: scene.id === 'security' ? 66 : 74,
            lineHeight: 1.03,
            letterSpacing: 0,
            margin: '28px 0 0',
            fontWeight: 900,
            opacity: textDelay,
            transform: `translateY(${clamp(frame, [10, 38], [18, 0])}px)`,
          }}
        >
          {scene.title}
        </h1>
        <p
          style={{
            color: COLORS.muted,
            fontSize: 26,
            lineHeight: 1.42,
            margin: '28px 0 0',
            maxWidth: 650,
            opacity: clamp(frame, [28, 52], [0, 1]),
          }}
        >
          {scene.subtitle}
        </p>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 860,
          top: 160,
          width: 960,
          height: 760,
          zIndex: 8,
        }}
      >
        {scene.render()}
      </div>
      <NarrationBar text={scene.voiceover} />
    </AbsoluteFill>
  );
};

const NarrationBar = ({ text }: { text: string }) => {
  const frame = useCurrentFrame();
  const opacity = clamp(frame, [18, 46], [0, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        left: 92,
        right: 92,
        bottom: 58,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '20px 26px',
        borderRadius: 28,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(17,12,9,0.78)',
        backdropFilter: 'blur(14px)',
        color: COLORS.cream,
        opacity,
        zIndex: 22,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 15,
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(212,143,107,0.16)',
          color: COLORS.accent,
          flex: '0 0 auto',
        }}
      >
        <Coffee size={22} />
      </div>
      <div style={{ fontSize: 24, lineHeight: 1.35, fontWeight: 650 }}>{text}</div>
    </div>
  );
};

const ProgressFooter = () => {
  const frame = useCurrentFrame();
  const progress = clamp(frame, [0, 85 * FPS], [0, 1], Easing.linear);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: WIDTH,
        height: 8,
        background: 'rgba(255,255,255,0.05)',
        zIndex: 30,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress * 100}%`,
          background: `linear-gradient(90deg, ${COLORS.accentDark}, ${COLORS.accent}, #f1c08f)`,
        }}
      />
    </div>
  );
};

const PhoneShell = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) => (
  <div
    style={{
      width: 330,
      height: 670,
      borderRadius: 48,
      padding: 16,
      background: 'linear-gradient(145deg, #2d221d, #0c0908)',
      border: '2px solid rgba(255,255,255,0.13)',
      boxShadow: '0 44px 100px rgba(0,0,0,0.45)',
      ...style,
    }}
  >
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 36,
        overflow: 'hidden',
        background: '#130e0c',
        border: '1px solid rgba(255,255,255,0.08)',
        position: 'relative',
      }}
    >
      {children}
    </div>
  </div>
);

const QrPattern = ({ size = 180 }: { size?: number }) => {
  const cells = 15;
  const active = new Set([
    '0,0',
    '0,1',
    '0,2',
    '1,0',
    '2,0',
    '2,1',
    '2,2',
    '0,12',
    '0,13',
    '0,14',
    '1,14',
    '2,12',
    '2,13',
    '2,14',
    '12,0',
    '13,0',
    '14,0',
    '14,1',
    '12,2',
    '13,2',
    '14,2',
    '4,4',
    '4,6',
    '4,9',
    '5,5',
    '5,8',
    '5,12',
    '6,4',
    '6,7',
    '6,10',
    '7,6',
    '7,9',
    '7,13',
    '8,3',
    '8,5',
    '8,8',
    '8,11',
    '9,4',
    '9,7',
    '9,12',
    '10,5',
    '10,9',
    '10,13',
    '11,3',
    '11,8',
    '11,10',
    '12,6',
    '12,9',
    '13,4',
    '13,7',
    '13,11',
    '14,5',
    '14,8',
    '14,14',
  ]);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'grid',
        gridTemplateColumns: `repeat(${cells}, 1fr)`,
        gridTemplateRows: `repeat(${cells}, 1fr)`,
        gap: 3,
        padding: 14,
        borderRadius: 24,
        background: COLORS.cream,
        boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
      }}
    >
      {Array.from({ length: cells * cells }, (_, index) => {
        const row = Math.floor(index / cells);
        const col = index % cells;
        const isActive = active.has(`${row},${col}`);

        return (
          <span
            key={`${row}-${col}`}
            style={{
              borderRadius: 3,
              background: isActive ? COLORS.bg : 'transparent',
            }}
          />
        );
      })}
    </div>
  );
};

const PhotoTile = ({
  index,
  large = false,
  progress = 1,
}: {
  index: number;
  large?: boolean;
  progress?: number;
}) => {
  const gradients = [
    'linear-gradient(135deg, #6d4737, #d48f6b 48%, #f6d9be)',
    'linear-gradient(135deg, #2c201a, #805b46 54%, #d8b98f)',
    'linear-gradient(135deg, #3e2d25, #8ea79a 52%, #e8d8c2)',
    'linear-gradient(135deg, #251a16, #7a3f4a 50%, #d48f6b)',
    'linear-gradient(135deg, #4a3128, #b8794f 48%, #f7eadb)',
    'linear-gradient(135deg, #38506b, #3e7f7a 55%, #d8b98f)',
  ];

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: large ? 34 : 24,
        background: gradients[index % gradients.length],
        minHeight: large ? 420 : 180,
        opacity: progress,
        transform: `scale(${0.94 + progress * 0.06})`,
        boxShadow: large ? '0 30px 70px rgba(0,0,0,0.36)' : '0 18px 42px rgba(0,0,0,0.28)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 35% 28%, rgba(255,255,255,0.34), transparent 22%), linear-gradient(180deg, transparent, rgba(0,0,0,0.28))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: 18,
          color: 'white',
          fontSize: large ? 24 : 15,
          fontWeight: 800,
          textShadow: '0 2px 12px rgba(0,0,0,0.35)',
        }}
      >
        {large ? 'Harika bir akşam' : `Masa ${index + 4}`}
      </div>
    </div>
  );
};

const OpeningVisual = () => {
  const { frame } = useLocalProgress(8);
  const phoneX = clamp(frame, [20, 110], [320, 90]);
  const qrGlow = clamp(frame, [70, 150], [0, 1]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 360,
          width: 760,
          height: 260,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #2d2018, #6b4432)',
          boxShadow: '0 54px 130px rgba(0,0,0,0.5)',
          transform: 'rotate(-7deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 180,
          top: 180,
          width: 265,
          height: 370,
          borderRadius: 30,
          ...cardStyle,
          transform: 'rotate(-7deg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
        }}
      >
        <QrPattern size={178} />
        <div style={{ color: COLORS.cream, fontSize: 30, fontWeight: 850 }}>Lumina Kafe</div>
        <div style={{ color: COLORS.muted, fontSize: 18 }}>Masa 12</div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 474 + phoneX,
          top: 155,
          transform: 'rotate(7deg)',
        }}
      >
        <PhoneShell>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              background:
                'linear-gradient(180deg, rgba(212,143,107,0.13), transparent 38%), #130e0c',
            }}
          >
            <Smartphone size={62} color={COLORS.accent} />
            <div
              style={{
                position: 'absolute',
                top: 212,
                width: 160,
                height: 160,
                borderRadius: 999,
                border: `2px solid rgba(212,143,107,${0.18 + qrGlow * 0.56})`,
                transform: `scale(${1 + qrGlow * 0.24})`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 86,
                color: COLORS.cream,
                fontSize: 28,
                fontWeight: 850,
              }}
            >
              QR taranıyor
            </div>
          </div>
        </PhoneShell>
      </div>
      <FloatingMetric
        x={560}
        y={640}
        icon={<Users size={22} />}
        label="Müşteri döngüsü"
        value="QR + Galeri + Ödül"
      />
    </div>
  );
};

const QrVisual = () => {
  const frame = useCurrentFrame();
  const scanY = clamp(frame, [26, 148], [120, 384], Easing.linear);
  const pageReveal = clamp(frame, [100, 210], [0, 1]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        style={{
          position: 'absolute',
          left: 90,
          top: 70,
          width: 390,
          height: 520,
          borderRadius: 36,
          ...cardStyle,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
        }}
      >
        <QrPattern size={230} />
        <div style={{ color: COLORS.cream, fontSize: 42, fontWeight: 900 }}>Masa 12</div>
        <div style={{ color: COLORS.muted, fontSize: 22 }}>sharevibe.co/?cafe=lumina</div>
        <div
          style={{
            position: 'absolute',
            left: 70,
            right: 70,
            top: scanY,
            height: 5,
            borderRadius: 999,
            background: COLORS.accent,
            boxShadow: '0 0 38px rgba(212,143,107,0.9)',
          }}
        />
      </div>
      <PhoneShell style={{ position: 'absolute', left: 560, top: 22 }}>
        <div
          style={{
            height: '100%',
            padding: 22,
            background: '#120d0b',
            color: COLORS.cream,
          }}
        >
          <div
            style={{
              height: 165,
              borderRadius: 26,
              background:
                'linear-gradient(135deg, rgba(212,143,107,0.9), rgba(110,72,52,0.78))',
              display: 'flex',
              alignItems: 'flex-end',
              padding: 22,
              opacity: pageReveal,
            }}
          >
            <div>
              <div style={{ fontSize: 32, fontWeight: 900 }}>Lumina Kafe</div>
              <div style={{ fontSize: 17, opacity: 0.78 }}>Masa 12 akışı</div>
            </div>
          </div>
          <div style={{ marginTop: 22, display: 'grid', gap: 14 }}>
            {['Fotoğraf paylaş', 'Canlı galeri', '4 fotoğraf = ücretsiz kahve'].map((item, index) => (
              <div
                key={item}
                style={{
                  height: 82,
                  borderRadius: 22,
                  background: 'rgba(255,255,255,0.055)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '0 18px',
                  color: COLORS.cream,
                  fontSize: 20,
                  fontWeight: 800,
                  opacity: clamp(frame, [126 + index * 20, 166 + index * 20], [0, 1]),
                  transform: `translateX(${clamp(frame, [126 + index * 20, 166 + index * 20], [26, 0])}px)`,
                }}
              >
                <Check size={22} color={COLORS.accent} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </PhoneShell>
      <FloatingMetric
        x={180}
        y={630}
        icon={<QrCode size={22} />}
        label="Otomatik yönlendirme"
        value="cafe + masa"
      />
    </div>
  );
};

const GalleryVisual = () => {
  const frame = useCurrentFrame();
  const uploadProgress = clamp(frame, [88, 190], [0, 1], Easing.bezier(0.2, 0.9, 0.22, 1));

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <PhoneShell style={{ position: 'absolute', left: 35, top: 30 }}>
        <div style={{ height: '100%', padding: 22, color: COLORS.cream }}>
          <div
            style={{
              height: 240,
              borderRadius: 28,
              background:
                'linear-gradient(135deg, #614034, #d48f6b 52%, #f7eadb)',
              marginBottom: 20,
              display: 'grid',
              placeItems: 'center',
              color: 'white',
              fontSize: 50,
            }}
          >
            <Camera size={70} />
          </div>
          <div
            style={{
              height: 56,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.08)',
              color: COLORS.muted,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 16,
              fontSize: 18,
            }}
          >
            Harika bir akşamdı...
          </div>
          <div
            style={{
              marginTop: 20,
              height: 18,
              borderRadius: 99,
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${uploadProgress * 100}%`,
                borderRadius: 99,
                background: COLORS.accent,
              }}
            />
          </div>
          <div
            style={{
              marginTop: 20,
              height: 58,
              borderRadius: 18,
              background: COLORS.accent,
              color: COLORS.bg,
              display: 'grid',
              placeItems: 'center',
              fontSize: 20,
              fontWeight: 900,
            }}
          >
            Paylaş
          </div>
        </div>
      </PhoneShell>
      <div
        style={{
          position: 'absolute',
          left: 430,
          top: 10,
          width: 510,
          height: 700,
          borderRadius: 38,
          padding: 26,
          ...cardStyle,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: COLORS.cream, fontSize: 34, fontWeight: 900 }}>Canlı Galeri</div>
            <div style={{ color: COLORS.muted, fontSize: 18, marginTop: 6 }}>Lumina Kafe</div>
          </div>
          <div
            style={{
              borderRadius: 999,
              padding: '10px 16px',
              background: 'rgba(118,214,114,0.12)',
              color: COLORS.green,
              fontWeight: 800,
            }}
          >
            Canlı
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.35fr 1fr',
            gap: 16,
            marginTop: 28,
          }}
        >
          <PhotoTile index={0} large progress={clamp(frame, [22, 70], [0, 1])} />
          <div style={{ display: 'grid', gap: 16 }}>
            {[1, 2, 3].map((item) => (
              <PhotoTile
                key={item}
                index={item}
                progress={clamp(frame, [80 + item * 28, 128 + item * 28], [0, 1])}
              />
            ))}
          </div>
        </div>
      </div>
      <FloatingMetric
        x={160}
        y={650}
        icon={<ImagePlus size={22} />}
        label="Yükleme"
        value={`${Math.round(uploadProgress * 100)}%`}
      />
    </div>
  );
};

const SharingVisual = () => {
  const frame = useCurrentFrame();
  const likePulse = clamp(frame, [40, 88], [0, 1]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 75,
          width: 470,
          height: 570,
          borderRadius: 42,
          padding: 24,
          ...cardStyle,
        }}
      >
        <PhotoTile index={4} large progress={1} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 24,
            color: COLORS.cream,
          }}
        >
          <div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>Masa 8</div>
            <div style={{ color: COLORS.muted, fontSize: 18, marginTop: 6 }}>Kafenin canlı anısı</div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <IconBubble color={COLORS.red} scale={1 + likePulse * 0.18}>
              <Heart size={28} />
            </IconBubble>
            <IconBubble color={COLORS.blue}>
              <Share2 size={28} />
            </IconBubble>
          </div>
        </div>
      </div>
      {['WhatsApp', 'Instagram', 'Link kopyala'].map((label, index) => (
        <div
          key={label}
          style={{
            position: 'absolute',
            left: 665,
            top: 190 + index * 124,
            width: 250,
            height: 84,
            borderRadius: 24,
            border: '1px solid rgba(255,255,255,0.09)',
            background: 'rgba(255,255,255,0.065)',
            color: COLORS.cream,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: '0 22px',
            fontSize: 22,
            fontWeight: 850,
            opacity: clamp(frame, [50 + index * 20, 86 + index * 20], [0, 1]),
            transform: `translateX(${clamp(frame, [50 + index * 20, 86 + index * 20], [60, 0])}px)`,
          }}
        >
          <Share2 size={26} color={COLORS.accent} />
          {label}
        </div>
      ))}
      <FloatingMetric
        x={520}
        y={656}
        icon={<Heart size={22} />}
        label="Etkileşim"
        value="+128 beğeni"
      />
    </div>
  );
};

const RewardVisual = () => {
  const frame = useCurrentFrame();
  const progress = clamp(frame, [44, 184], [0, 1]);
  const modal = clamp(frame, [210, 290], [0, 1]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        style={{
          position: 'absolute',
          left: 85,
          top: 120,
          width: 785,
          height: 380,
          borderRadius: 42,
          padding: 34,
          ...cardStyle,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <IconBubble color={COLORS.accent}>
            <Gift size={28} />
          </IconBubble>
          <div>
            <div style={{ color: COLORS.cream, fontSize: 42, fontWeight: 920 }}>
              4 fotoğraf yükle
            </div>
            <div style={{ color: COLORS.muted, fontSize: 24, marginTop: 8 }}>
              ücretsiz bir kahve kazan
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 44,
            height: 22,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${COLORS.accentDark}, ${COLORS.accent}, #f7c391)`,
            }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 32 }}>
          {[0, 1, 2, 3].map((step) => {
            const filled = progress >= (step + 1) / 4;
            return (
              <div
                key={step}
                style={{
                  height: 88,
                  borderRadius: 22,
                  background: filled ? 'rgba(212,143,107,0.22)' : 'rgba(255,255,255,0.05)',
                  border: filled ? `1px solid rgba(212,143,107,0.45)` : '1px solid rgba(255,255,255,0.07)',
                  color: filled ? COLORS.accent : COLORS.muted,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 18,
                  fontWeight: 850,
                }}
              >
                {filled ? <Check size={28} /> : `${step + 1}. foto`}
              </div>
            );
          })}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 260,
          top: 520,
          width: 520,
          height: 220,
          borderRadius: 36,
          padding: 28,
          background:
            'linear-gradient(145deg, rgba(247,234,219,0.98), rgba(226,198,171,0.96))',
          color: COLORS.bg,
          boxShadow: '0 40px 100px rgba(0,0,0,0.42)',
          opacity: modal,
          transform: `translateY(${clamp(frame, [210, 290], [56, 0])}px) scale(${0.94 + modal * 0.06})`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 25,
              background: 'rgba(212,143,107,0.22)',
              display: 'grid',
              placeItems: 'center',
              color: COLORS.accentDark,
            }}
          >
            <Sparkles size={40} />
          </div>
          <div>
            <div style={{ fontSize: 40, fontWeight: 950 }}>Tebrikler!</div>
            <div style={{ fontSize: 22, color: '#6f4d3c', marginTop: 6 }}>
              ücretsiz bir kahve kazandın
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminVisual = () => {
  const frame = useCurrentFrame();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        style={{
          position: 'absolute',
          left: 10,
          top: 15,
          width: 910,
          height: 710,
          borderRadius: 36,
          overflow: 'hidden',
          ...cardStyle,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 210,
            background: 'rgba(10,8,7,0.55)',
            borderRight: '1px solid rgba(255,255,255,0.07)',
            padding: 24,
          }}
        >
          <div style={{ color: COLORS.cream, fontSize: 27, fontWeight: 920 }}>
            Share<span style={{ color: COLORS.accent }}>Vibe</span>
          </div>
          <div style={{ display: 'grid', gap: 16, marginTop: 42 }}>
            {[
              ['Genel Bakış', LayoutDashboard],
              ['Canlı Galeri', Camera],
              ['Kampanyalar', Gift],
              ['QR Standlar', QrCode],
              ['Müşteriler', Users],
              ['E-posta', Mail],
              ['İstatistikler', BarChart3],
            ].map(([label, Icon], index) => (
              <div
                key={String(label)}
                style={{
                  height: 52,
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '0 14px',
                  background: index === 0 ? 'rgba(212,143,107,0.16)' : 'transparent',
                  color: index === 0 ? COLORS.cream : COLORS.muted,
                  fontSize: 15,
                  fontWeight: 850,
                  opacity: clamp(frame, [index * 8, 36 + index * 8], [0, 1]),
                }}
              >
                <Icon size={18} color={index === 0 ? COLORS.accent : COLORS.muted} />
                {String(label)}
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginLeft: 210, padding: 34 }}>
          <div style={{ color: COLORS.cream, fontSize: 38, fontWeight: 950 }}>
            Hoş geldin, Lumina Kafe!
          </div>
          <div style={{ color: COLORS.muted, fontSize: 18, marginTop: 8 }}>
            Seçili tarih aralığında operasyon görünümü
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 28 }}>
            {[
              ['47', 'Fotoğraf', Camera, COLORS.accent],
              ['128', 'Beğeni', Heart, COLORS.red],
              ['23', 'Müşteri', Users, COLORS.violet],
              ['12', 'E-posta', Mail, COLORS.green],
            ].map(([value, label, Icon, color], index) => (
              <MetricCard
                key={String(label)}
                value={String(value)}
                label={String(label)}
                icon={<Icon size={24} />}
                color={String(color)}
                delay={index * 12}
              />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 18, marginTop: 22 }}>
            <ChartPanel />
            <div style={{ borderRadius: 28, padding: 22, background: 'rgba(255,255,255,0.045)' }}>
              <div style={{ color: COLORS.cream, fontSize: 22, fontWeight: 900 }}>Aktif Kampanya</div>
              <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {[0, 1, 2, 3].map((item) => (
                  <PhotoTile
                    key={item}
                    index={item}
                    progress={clamp(frame, [70 + item * 10, 112 + item * 10], [0, 1])}
                  />
                ))}
              </div>
              <div style={{ color: COLORS.cream, fontSize: 26, fontWeight: 940, marginTop: 20 }}>
                4 Fotoğraf Yükle
              </div>
              <div style={{ color: COLORS.accent, fontSize: 20, fontWeight: 850, marginTop: 6 }}>
                ücretsiz bir kahve kazan
              </div>
            </div>
          </div>
        </div>
      </div>
      <FloatingMetric
        x={630}
        y={664}
        icon={<Palette size={22} />}
        label="Marka ayarları"
        value="renk + font + kampanya"
      />
    </div>
  );
};

const EmailVisual = () => {
  const frame = useCurrentFrame();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        style={{
          position: 'absolute',
          left: 55,
          top: 35,
          width: 860,
          height: 690,
          borderRadius: 38,
          padding: 30,
          ...cardStyle,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: COLORS.cream, fontSize: 38, fontWeight: 950 }}>
              E-posta Pazarlaması
            </div>
            <div style={{ color: COLORS.muted, fontSize: 19, marginTop: 8 }}>
              Galeriden gelen ziyaretçiler hedef kitleye dönüşür
            </div>
          </div>
          <IconBubble color={COLORS.green}>
            <SendHorizontal size={26} />
          </IconBubble>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 22, marginTop: 30 }}>
          <div style={{ display: 'grid', gap: 14 }}>
            {[
              ['Yeni müşteriler', '23 kişi'],
              ['Sık gelenler', '8 kişi'],
              ['Son 30 gün', '41 kayıt'],
              ['Kampanya alıcıları', '32 seçili'],
            ].map(([label, value], index) => (
              <div
                key={label}
                style={{
                  height: 92,
                  borderRadius: 24,
                  padding: 18,
                  background: 'rgba(255,255,255,0.052)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  opacity: clamp(frame, [20 + index * 12, 58 + index * 12], [0, 1]),
                  transform: `translateX(${clamp(frame, [20 + index * 12, 58 + index * 12], [-32, 0])}px)`,
                }}
              >
                <div style={{ color: COLORS.cream, fontSize: 20, fontWeight: 850 }}>{label}</div>
                <div style={{ color: COLORS.green, fontSize: 16, marginTop: 10, fontWeight: 800 }}>{value}</div>
              </div>
            ))}
          </div>
          <div
            style={{
              borderRadius: 30,
              background: 'rgba(255,255,255,0.052)',
              border: '1px solid rgba(255,255,255,0.07)',
              padding: 24,
            }}
          >
            <div style={{ color: COLORS.cream, fontSize: 24, fontWeight: 940 }}>
              Hazır Türkçe Şablon
            </div>
            <div
              style={{
                marginTop: 18,
                height: 74,
                borderRadius: 20,
                background: 'rgba(212,143,107,0.14)',
                border: '1px solid rgba(212,143,107,0.28)',
                color: COLORS.cream,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '0 18px',
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              <Gift size={24} color={COLORS.accent} />
              Bu hafta size özel sürpriz var
            </div>
            <div style={{ marginTop: 22, display: 'grid', gap: 12 }}>
              {[0, 1, 2, 3].map((line) => (
                <div
                  key={line}
                  style={{
                    height: 16,
                    width: `${92 - line * 11}%`,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.12)',
                    opacity: clamp(frame, [70 + line * 8, 106 + line * 8], [0, 1]),
                  }}
                />
              ))}
            </div>
            <div
              style={{
                marginTop: 30,
                height: 66,
                borderRadius: 22,
                background: COLORS.accent,
                color: COLORS.bg,
                display: 'grid',
                placeItems: 'center',
                fontSize: 21,
                fontWeight: 950,
                opacity: clamp(frame, [126, 170], [0, 1]),
              }}
            >
              Gönderimi başlat
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 22 }}>
          {[
            ['Teslim oranı', '%96', COLORS.green],
            ['Açılma oranı', '%42', COLORS.accent],
            ['Tıklama oranı', '%18', COLORS.blue],
          ].map(([label, value, color], index) => (
            <div
              key={label}
              style={{
                borderRadius: 22,
                padding: 18,
                background: 'rgba(255,255,255,0.05)',
                color: COLORS.cream,
                opacity: clamp(frame, [152 + index * 10, 190 + index * 10], [0, 1]),
              }}
            >
              <div style={{ color: COLORS.muted, fontSize: 15 }}>{label}</div>
              <div style={{ color: String(color), fontSize: 34, fontWeight: 950, marginTop: 6 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SecurityVisual = () => {
  const frame = useCurrentFrame();
  const lines = clamp(frame, [40, 130], [0, 1], Easing.linear);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        style={{
          position: 'absolute',
          left: 115,
          top: 70,
          width: 720,
          height: 560,
          borderRadius: 40,
          padding: 42,
          ...cardStyle,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
          {[
            ['Google giriş', ShieldCheck, COLORS.blue],
            ['Firebase rules', Lock, COLORS.accent],
            ['Çoklu kafe', Coffee, COLORS.green],
          ].map(([label, Icon, color], index) => (
            <div
              key={String(label)}
              style={{
                height: 170,
                borderRadius: 28,
                background: 'rgba(255,255,255,0.052)',
                border: '1px solid rgba(255,255,255,0.07)',
                display: 'grid',
                placeItems: 'center',
                color: COLORS.cream,
                opacity: clamp(frame, [index * 18, 40 + index * 18], [0, 1]),
              }}
            >
              <Icon size={46} color={String(color)} />
              <div style={{ fontSize: 20, fontWeight: 900 }}>{String(label)}</div>
            </div>
          ))}
        </div>
        <svg
          width="640"
          height="190"
          viewBox="0 0 640 190"
          style={{ marginTop: 44, overflow: 'visible' }}
        >
          <path
            d="M 60 20 C 140 100, 240 100, 320 170 C 400 100, 500 100, 580 20"
            fill="none"
            stroke={COLORS.accent}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="850"
            strokeDashoffset={850 - 850 * lines}
            opacity="0.86"
          />
          {[60, 320, 580].map((x, index) => (
            <circle key={x} cx={x} cy={index === 1 ? 170 : 20} r="14" fill={COLORS.accent} />
          ))}
        </svg>
        <div style={{ color: COLORS.muted, fontSize: 22, lineHeight: 1.45, marginTop: 8 }}>
          Her kafe kendi verisi, medya akışı ve yönetici yetkileriyle izole çalışır.
        </div>
      </div>
    </div>
  );
};

const FinalVisual = () => {
  const frame = useCurrentFrame();
  const logoScale = clamp(frame, [0, 60], [0.9, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: '-160px 0 0 -860px',
        width: WIDTH,
        height: HEIGHT,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div
        style={{
          width: 390,
          height: 390,
          borderRadius: 70,
          overflow: 'hidden',
          background: '#fff',
          boxShadow: '0 45px 130px rgba(0,0,0,0.45)',
          transform: `scale(${logoScale})`,
        }}
      >
        <Img src={staticFile('sharevibe-logo.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div
        style={{
          marginTop: 34,
          color: COLORS.cream,
          fontSize: 72,
          fontWeight: 950,
          letterSpacing: 0,
          textAlign: 'center',
        }}
      >
        Share<span style={{ color: COLORS.accent }}>Vibe</span>
      </div>
      <div
        style={{
          marginTop: 18,
          color: COLORS.muted,
          fontSize: 30,
          fontWeight: 700,
          textAlign: 'center',
        }}
      >
        Kafe deneyimini dijitalleştir. Sadakati ölçülebilir hale getir.
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 40 }}>
        {['QR Stand', 'Canlı Galeri', 'Ödül', 'E-posta'].map((item, index) => (
          <div
            key={item}
            style={{
              padding: '14px 20px',
              borderRadius: 999,
              border: `1px solid rgba(212,143,107,${0.22 + index * 0.04})`,
              background: 'rgba(212,143,107,0.1)',
              color: COLORS.cream,
              fontSize: 18,
              fontWeight: 850,
              opacity: clamp(frame, [20 + index * 10, 52 + index * 10], [0, 1]),
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

const FloatingMetric = ({
  x,
  y,
  icon,
  label,
  value,
}: {
  x: number;
  y: number;
  icon: ReactNode;
  label: string;
  value: string;
}) => {
  const frame = useCurrentFrame();
  const appear = clamp(frame, [54, 96], [0, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 310,
        minHeight: 96,
        borderRadius: 28,
        padding: 20,
        background: 'rgba(20,14,11,0.74)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 24px 70px rgba(0,0,0,0.32)',
        color: COLORS.cream,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        opacity: appear,
        transform: `translateY(${clamp(frame, [54, 96], [28, 0])}px)`,
      }}
    >
      <IconBubble color={COLORS.accent}>{icon}</IconBubble>
      <div>
        <div style={{ color: COLORS.muted, fontSize: 15, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 920, marginTop: 5 }}>{value}</div>
      </div>
    </div>
  );
};

const IconBubble = ({
  children,
  color,
  scale = 1,
}: {
  children: ReactNode;
  color: string;
  scale?: number;
}) => (
  <div
    style={{
      width: 62,
      height: 62,
      borderRadius: 22,
      background: `${color}24`,
      color,
      display: 'grid',
      placeItems: 'center',
      transform: `scale(${scale})`,
      flex: '0 0 auto',
    }}
  >
    {children}
  </div>
);

const MetricCard = ({
  value,
  label,
  icon,
  color,
  delay,
}: {
  value: string;
  label: string;
  icon: ReactNode;
  color: string;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const appear = clamp(frame, [delay, delay + 36], [0, 1]);

  return (
    <div
      style={{
        height: 132,
        borderRadius: 24,
        padding: 18,
        background: 'rgba(255,255,255,0.052)',
        border: '1px solid rgba(255,255,255,0.07)',
        opacity: appear,
        transform: `translateY(${clamp(frame, [delay, delay + 36], [20, 0])}px)`,
      }}
    >
      <div style={{ color, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: COLORS.muted, fontSize: 14, fontWeight: 750 }}>{label}</span>
        {icon}
      </div>
      <div style={{ color: COLORS.cream, fontSize: 42, fontWeight: 950, marginTop: 18 }}>{value}</div>
    </div>
  );
};

const ChartPanel = () => {
  const frame = useCurrentFrame();
  const draw = clamp(frame, [70, 180], [0, 1], Easing.linear);

  return (
    <div
      style={{
        height: 358,
        borderRadius: 28,
        padding: 24,
        background: 'rgba(255,255,255,0.045)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ color: COLORS.cream, fontSize: 22, fontWeight: 900 }}>Fotoğraf & Etkileşim</div>
      <svg width="430" height="240" viewBox="0 0 430 240" style={{ marginTop: 26 }}>
        {[0, 1, 2, 3].map((line) => (
          <line
            key={line}
            x1="0"
            x2="430"
            y1={line * 58 + 18}
            y2={line * 58 + 18}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        ))}
        <path
          d="M 0 190 C 55 164, 96 172, 145 128 C 196 78, 240 110, 298 70 C 352 34, 390 58, 430 28"
          fill="none"
          stroke={COLORS.accent}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="620"
          strokeDashoffset={620 - 620 * draw}
        />
        <path
          d="M 0 208 C 60 198, 120 182, 180 166 C 242 146, 310 126, 430 96"
          fill="none"
          stroke={COLORS.muted}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="520"
          strokeDashoffset={520 - 520 * draw}
          opacity="0.72"
        />
      </svg>
    </div>
  );
};

export const ShareVibeExplainer = () => (
  <AbsoluteFill style={{ fontFamily: 'Inter, Arial, sans-serif', backgroundColor: COLORS.bg }}>
    <MasterBackground />
    {SCENES.map((scene) => (
      <Sequence
        key={scene.id}
        from={secondsToFrames(scene.start)}
        durationInFrames={secondsToFrames(scene.duration)}
        premountFor={scene.start === 0 ? 0 : FPS}
      >
        <SceneFrame scene={scene} />
      </Sequence>
    ))}
    <ProgressFooter />
  </AbsoluteFill>
);

import { ArrowRight, Camera, Coffee, Palette, QrCode, Sparkles, Store } from 'lucide-react';

type MainPageProps = {
  onOpenExperience: () => void;
  onHiddenAdminTrigger: () => void;
};

const FEATURE_ITEMS = [
  {
    icon: QrCode,
    title: 'QR ilə masa tanıma',
    description: 'Hər vizitkart fərqli QR kodla açılır və sistem masa nömrəsini avtomatik tanıyır.',
  },
  {
    icon: Camera,
    title: 'Telefonun öz kamerası',
    description: 'Müştəri şəkli cihazın orijinal kamerası ilə çəkir və daha keyfiyyətli paylaşır.',
  },
  {
    icon: Palette,
    title: 'Hər kafe üçün özəl görünüş',
    description: 'Kafe adı, rəng, font və kampaniya axını hər məkan üçün ayrıca qurulur.',
  },
];

const STEP_ITEMS = [
  'Kafe sahibi öz məkan kodunu və görünüşünü qurur.',
  'Hər masa üçün fərqli QR link çap olunur.',
  'Müştəri QR ilə açır, şəkil paylaşır və kampaniyada irəliləyir.',
];

export default function MainPage({ onOpenExperience, onHiddenAdminTrigger }: MainPageProps) {
  return (
    <div className="min-h-screen text-cafe-50">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 rounded-[2rem] border border-white/65 bg-white/78 px-5 py-4 shadow-[0_24px_54px_rgba(78,58,42,0.1)] backdrop-blur-2xl">
          <button
            type="button"
            onClick={onHiddenAdminTrigger}
            className="flex items-center gap-3 rounded-full"
            aria-label="Share Vibe logosu"
          >
            <div className="ambient-ring flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)] shadow-inner">
              <Coffee className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cafe-100/55">Share Vibe</p>
              <h1 className="text-2xl font-serif font-semibold text-cafe-50">Kafeler üçün anı sistemi</h1>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenExperience}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_20px_42px_rgba(0,0,0,0.14)] transition-transform hover:-translate-y-0.5"
          >
            Demo aç
            <ArrowRight className="h-4 w-4" />
          </button>
        </header>

        <main className="flex-1 space-y-8 pt-8 sm:space-y-10 sm:pt-10">
          <section className="section-shell overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top,rgba(201,122,67,0.2),transparent_55%)]" />
            <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.2fr),minmax(320px,0.8fr)] lg:items-center">
              <div className="space-y-5">
                <span className="section-pill">Main Page</span>
                <h2 className="max-w-4xl text-5xl font-serif leading-[0.92] text-cafe-50 sm:text-6xl xl:text-7xl">
                  Hər kafe üçün qurulan, QR ilə işləyən paylaşım divarı.
                </h2>
                <p className="max-w-2xl text-base leading-8 text-cafe-100/74 sm:text-lg">
                  Share Vibe müştərinin masa kartındakı QR kodu ilə açılır, masa nömrəsini avtomatik tanıyır,
                  şəkli qalereyaya göndərir və kampaniya irəliləyişini canlı göstərir.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onOpenExperience}
                    className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_20px_42px_rgba(0,0,0,0.14)] transition-transform hover:-translate-y-0.5"
                  >
                    Sistemi aç
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <a
                    href="#how-it-works"
                    className="inline-flex items-center gap-2 rounded-full border border-cafe-700/75 bg-white/80 px-6 py-3.5 text-sm font-semibold text-cafe-50 transition-colors hover:border-accent/45"
                  >
                    Necə işləyir
                  </a>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[2rem] border border-white/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.96),rgba(244,235,225,0.92))] p-5 shadow-[0_24px_54px_rgba(78,58,42,0.1)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)]">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cafe-100/55">SaaS axını</p>
                      <p className="mt-1 text-xl font-semibold text-cafe-50">Bir sistem, çoxlu kafe</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-cafe-100/72">
                    Hər məkan üçün ayrıca kafe kodu, ayrıca dizayn, ayrıca kampaniya və ayrıca paylaşım axını qurulur.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.75rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_40px_rgba(78,58,42,0.08)]">
                    <p className="text-sm font-semibold text-cafe-50">QR açılış</p>
                    <p className="mt-2 text-sm leading-7 text-cafe-100/72">
                      Müştəri birbaşa düzgün masa və düzgün kafe daxilində paylaşım edir.
                    </p>
                  </div>
                  <div className="rounded-[1.75rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_40px_rgba(78,58,42,0.08)]">
                    <p className="text-sm font-semibold text-cafe-50">Kampaniya motivasiyası</p>
                    <p className="mt-2 text-sm leading-7 text-cafe-100/72">
                      Foto sayı artdıqca kofe addımları dolur və mükafat bildirişi avtomatik açılır.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            {FEATURE_ITEMS.map(({ icon: Icon, title, description }) => (
              <article key={title} className="section-shell">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold text-cafe-50">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-cafe-100/72">{description}</p>
              </article>
            ))}
          </section>

          <section id="how-it-works" className="section-shell">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <span className="section-pill">Necə işləyir</span>
                <h2 className="mt-4 text-4xl font-serif font-semibold text-cafe-50">Qurulum və istifadə axını sadə qalır</h2>
              </div>
              <div className="rounded-[1.8rem] border border-cafe-700/65 bg-white/76 px-5 py-4 text-sm text-cafe-100/72">
                Məkan sahibləri dizaynı qurur, müştəri isə sadəcə QR açıb paylaşır.
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {STEP_ITEMS.map((step, index) => (
                <div key={step} className="rounded-[1.7rem] border border-white/70 bg-white/84 p-5 shadow-[0_18px_38px_rgba(78,58,42,0.08)]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--color-accent)] text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-cafe-100/74">{step}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="section-shell bg-[linear-gradient(160deg,rgba(255,255,255,0.94),rgba(242,232,220,0.92))]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <span className="section-pill">Canlı baxış</span>
                <h2 className="mt-4 text-4xl font-serif font-semibold text-cafe-50">İndiki sistemi elə indi aç və test et</h2>
                <p className="mt-3 text-sm leading-7 text-cafe-100/72">
                  Demo qalereya üzərindən QR axını, paylaşım modalı, kampaniya irəliləyişi və admin quruluşunu yoxlaya bilərsən.
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenExperience}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--color-accent)] px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_20px_42px_rgba(0,0,0,0.14)] transition-transform hover:-translate-y-0.5"
              >
                <Sparkles className="h-4 w-4" />
                Demo qalereyanı aç
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

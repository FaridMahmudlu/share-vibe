import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');
const distDir = join(repoRoot, 'dist');
const baseHtmlPath = join(distDir, 'index.html');
const domain = 'https://sharevibe.co';

const pages = [
  {
    path: '/',
    title: 'ShareVibe - Kafeler İçin QR Fotoğraf Paylaşım Platformu',
    description:
      'ShareVibe, kafelerin QR kod ile fotoğraf paylaşımı, canlı galeri, kampanya, müşteri ve yönetim süreçlerini tek panelde yönetmesine yardımcı olur.',
    heading: 'Kafeler için QR fotoğraf paylaşımı ve canlı galeri platformu',
    intro:
      'Müşteriler QR kodu okutarak fotoğraflarını paylaşır; kafe ekibi galeri, kampanya, müşteri izinleri, QR araçları ve raporlamayı tek yönetim panelinden takip eder.',
    sections: [
      ['Kimler için uygundur?', 'ShareVibe; kafe, kahve dükkanı ve misafir deneyimini dijitalleştirmek isteyen işletmeler için geliştirilmiştir.'],
      ['Nasıl çalışır?', 'Kafe için QR deneyimi hazırlanır, misafir fotoğrafını web üzerinden paylaşır, içerikler canlı galeriye ve yönetim paneline düşer.'],
      ['Güvenlik yaklaşımı', 'Yönetim alanları Firebase Auth, backend token doğrulaması, rol bazlı erişim ve Firebase kuralları ile korunacak şekilde tasarlanır.'],
    ],
  },
  {
    path: '/features',
    title: 'ShareVibe Özellikleri - QR Galeri, Kampanya ve Yönetim Paneli',
    description:
      'ShareVibe özellikleri: QR fotoğraf paylaşımı, canlı galeri, kampanya yönetimi, müşteri izinleri, QR araçları, şablonlar ve kafe yönetim paneli.',
    heading: 'ShareVibe özellikleri',
    intro:
      'Platform, kafe içi fotoğraf paylaşımını pazarlama ve müşteri ilişkileri süreçleriyle birleştiren üretim odaklı bir SaaS deneyimi sunar.',
    sections: [
      ['Canlı galeri', 'Misafirlerin paylaştığı fotoğraflar kafe deneyimine uygun bir galeride toplanır.'],
      ['Kampanya yönetimi', 'Fotoğraf paylaşımı, sadakat ve geri kazanım kampanyaları panel üzerinden takip edilir.'],
      ['QR araçları', 'Kafeye ve masa düzenine uygun QR bağlantıları ve stand süreçleri yönetilir.'],
      ['Rol bazlı panel', 'Süper sahip, kafe sahibi ve yönetici rolleri için erişim kapsamı ayrıştırılır.'],
    ],
  },
  {
    path: '/pricing',
    title: 'ShareVibe Planları - Kafeler İçin Kurulum ve Paketler',
    description:
      'ShareVibe planları; QR fotoğraf paylaşımı, canlı galeri, kampanya yönetimi ve isteğe bağlı e-posta pazarlama ihtiyaçlarına göre değerlendirilir.',
    heading: 'ShareVibe planları',
    intro:
      'Paket kapsamı; kafe bilgileri, masa sayısı, kampanya ihtiyacı, mail entegrasyonu ve kurulum gereksinimleri değerlendirildikten sonra netleştirilir.',
    sections: [
      ['Standart kullanım', 'QR paylaşım, canlı galeri, temel kampanya takibi ve kafe paneli için uygundur.'],
      ['Mail entegrasyonlu kullanım', 'İzinli müşteri listeleriyle kampanya e-postası göndermek isteyen kafeler için değerlendirilir.'],
      ['Ödeme yaklaşımı', 'Kurulum kapsamı netleşmeden ödeme süreci başlatılmaz.'],
    ],
  },
  {
    path: '/contact',
    title: 'ShareVibe İletişim - Kurulum Görüşmesi',
    description:
      'ShareVibe kurulum görüşmesi için kafe ihtiyaçları, QR deneyimi, panel kapsamı ve kampanya hedefleri birlikte değerlendirilir.',
    heading: 'ShareVibe iletişim ve kurulum görüşmesi',
    intro:
      'Kurulum öncesinde kafenin marka dili, masa düzeni, kampanya hedefi, panel ihtiyacı ve teknik gereksinimleri değerlendirilir.',
    sections: [
      ['Görüşme kapsamı', 'Kafe adı, masa sayısı, QR yerleşimi, galeri deneyimi ve kampanya beklentisi netleştirilir.'],
      ['Destek yaklaşımı', 'Kurulum sonrasında panel kullanımı ve operasyonel süreçler için yönlendirme sağlanır.'],
    ],
  },
  {
    path: '/privacy-policy',
    title: 'ShareVibe Gizlilik Politikası',
    description:
      'ShareVibe gizlilik politikası; kafe paneli, QR fotoğraf paylaşımı, müşteri izinleri ve destek süreçlerinde işlenen verileri açıklar.',
    heading: 'Gizlilik politikası',
    intro:
      'ShareVibe, hizmetin sunulması, güvenliğin sağlanması, destek süreçlerinin yürütülmesi ve panel deneyiminin iyileştirilmesi için gerekli verileri işler.',
    sections: [
      ['İşlenen bilgiler', 'Kafe adı, yetkili iletişim bilgileri, panel kullanım kayıtları, kampanya tercihleri ve destek görüşmelerinde paylaşılan bilgiler işlenebilir.'],
      ['Kullanım amacı', 'Veriler kurulum görüşmesi, panel hizmeti, güvenlik, destek ve hizmet kalitesinin iyileştirilmesi amacıyla kullanılır.'],
      ['Paylaşım ve saklama', 'Bilgiler yetkisiz üçüncü kişilerle satılmaz; hizmetin çalışması için gerekli sistemlerde saklanır.'],
    ],
  },
  {
    path: '/terms-of-service',
    title: 'ShareVibe Kullanım Koşulları',
    description:
      'ShareVibe kullanım koşulları; kafe hesabı, panel erişimi, içerik sorumluluğu, kampanya kullanımı ve hizmet kapsamını açıklar.',
    heading: 'Kullanım koşulları',
    intro:
      'ShareVibe kullanımı, kafe hesabının doğru bilgilerle oluşturulmasını, panel erişiminin yetkili kişilerle sınırlandırılmasını ve platformun amacına uygun kullanılmasını gerektirir.',
    sections: [
      ['Hesap ve panel kullanımı', 'Kafe hesabındaki erişim yetkileri işletme sorumluluğundadır ve yalnızca yetkili ekip üyeleriyle paylaşılmalıdır.'],
      ['İçerik sorumluluğu', 'Kafe panelindeki görseller, kampanya metinleri ve marka içerikleri ilgili işletmenin kontrolünde yönetilir.'],
      ['Hizmet kapsamı', 'Kurulum kapsamı, plan seçimi, mail ihtiyacı ve teknik gereksinimler ön görüşme sonrası netleştirilir.'],
    ],
  },
  {
    path: '/cafe/ava-coffee',
    title: 'AVA Coffee - ShareVibe Kafe Fotoğraf Galerisi',
    description: 'AVA Coffee misafirlerinin paylaştığı en güzel anlar ve fotoğraflar. Canlı galeri deneyimi.',
    heading: 'AVA Coffee Canlı Fotoğraf Galerisi',
    intro: 'Misafirlerimizin objektifinden en keyifli AVA Coffee anları. QR kod ile sen de fotoğrafını paylaş!',
    sections: [
      ['Fotoğrafını Paylaş', 'Masadaki QR kodu okutarak çektiğin fotoğrafları galeriye anında ekleyebilirsin.'],
      ['Kampanyaya Katıl', 'Paylaştığın her fotoğrafla sürpriz ödüller ve ikramlar kazanma şansı yakala.'],
      ['Güvenli Paylaşım', 'Tüm içerikler moderasyon süzgecinden geçerek kafe topluluğumuza sunulur.']
    ]
  },
  {
    path: '/cafe/lumina-kafe',
    title: 'Lumina Kafe - ShareVibe Kafe Fotoğraf Galerisi',
    description: 'Lumina Kafe misafirlerinin paylaştığı en güzel anlar ve fotoğraflar. Canlı galeri deneyimi.',
    heading: 'Lumina Kafe Canlı Fotoğraf Galerisi',
    intro: 'Misafirlerimizin objektifinden en keyifli Lumina Kafe anları. QR kod ile sen de fotoğrafını paylaş!',
    sections: [
      ['Fotoğrafını Paylaş', 'Masadaki QR kodu okutarak çektiğin fotoğrafları galeriye anında ekleyebilirsin.'],
      ['Kampanyaya Katıl', 'Paylaştığın her fotoğrafla sürpriz ödüller ve ikramlar kazanma şansı yakala.'],
      ['Güvenli Paylaşım', 'Tüm içerikler moderasyon süzgecinden geçerek kafe topluluğumuza sunulur.']
    ]
  },
];

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const setMeta = (html, page) => {
  const canonical = `${domain}${page.path === '/' ? '/' : page.path}`;
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeHtml(page.description)}" />`)
    .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeHtml(page.title)}" />`)
    .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapeHtml(page.description)}" />`)
    .replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`)
    .replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`);
};

const renderSeoContent = (page) => `
    <main class="static-seo-content" aria-label="${escapeHtml(page.heading)}">
      <section>
        <p>ShareVibe</p>
        <h1>${escapeHtml(page.heading)}</h1>
        <p>${escapeHtml(page.intro)}</p>
      </section>
      ${page.sections
        .map(
          ([title, text]) => `<section>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(text)}</p>
      </section>`
        )
        .join('\n      ')}
    </main>
  `;

const writePage = (baseHtml, page) => {
  const html = setMeta(baseHtml, page).replace('<div id="root"></div>', `<div id="root">${renderSeoContent(page)}</div>`);
  const targetDir = page.path === '/' ? distDir : join(distDir, page.path.replace(/^\//, ''));
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(join(targetDir, 'index.html'), html, 'utf8');
};

const baseHtml = readFileSync(baseHtmlPath, 'utf8');
for (const page of pages) {
  writePage(baseHtml, page);
}

console.log(`Generated ${pages.length} static public SEO pages.`);

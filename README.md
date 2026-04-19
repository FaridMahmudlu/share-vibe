# ShareVibe - Cafe Photo Sharing Platform

A modern React/TypeScript application for sharing photos at cafes with reward campaigns.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase account

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

## 🔧 Configuration

### Firebase Setup

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Copy your Firebase config to `firebase-applet-config.json`

### Google OAuth Configuration

**IMPORTANT**: Before deploying to production, you MUST add your domain to Google OAuth:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to Credentials → OAuth 2.0 Client IDs → Web application
3. Add these **Authorized redirect URIs**:
   - `http://localhost:3000/` (dev)
   - `https://your-domain.com/` (production)
   - `https://your-project.web.app/__/auth/handler` (Firebase Hosting)

4. Save changes

**Without this configuration, Google login will fail on production!**

## 📱 Responsive Design

Works perfectly on all devices:
- **Mobile** (360px - 480px): Small phones to regular phones
- **Tablet** (640px - 900px): Landscape & portrait
- **Desktop** (1024px+): Full experience

Uses CSS `clamp()` for fluid typography and responsive spacing.

## 📦 Build

```bash
npm run build
```

Output: `dist/` folder with production-ready assets

## 🚀 Deployment

### Option 1: Firebase Hosting (Recommended)

```bash
npm run build
npm run deploy:prod
```

### Option 2: Custom Server

```bash
npm run build
# Upload dist/ folder to your server
scp -r dist/ user@server:/var/www/app/
```

## 📂 Project Structure

```
src/
├── App.tsx              # Main application
├── AdminPanel.tsx       # Admin dashboard  
├── MainPage.tsx         # Landing page
├── firebase.ts          # Firebase config
├── googleAuth.ts        # Google OAuth setup
├── index.css            # Global styles
├── components/          # React components
├── utils/               # Helper functions
├── security/            # Security rules
└── seo/                 # SEO optimization
```

## 🛠️ Tech Stack

- React 19 + TypeScript
- Vite 6 (build tool)
- Tailwind CSS 4 (styling)
- Firebase (backend)
- Motion (animations)
- Lucide (icons)

## 🔐 Security

- Firestore Security Rules
- Firebase Storage Rules  
- CSRF Protection
- Input Sanitization
- Audit Logging

## 📝 Scripts

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run preview          # Preview build
npm run lint             # TypeScript check
npm run test             # Run tests
npm run deploy:prod      # Deploy to Firebase
```

## 🐛 Troubleshooting

**Google login fails?**
→ Add your domain to Google OAuth authorized URIs

**Images not loading?**
→ Check Firebase Storage rules and permissions

**Build errors?**
→ Run `npm run clean && npm install`

---

Built with ❤️ for cafes worldwide

Share Vibe, kafeler için tasarlanmış QR tabanlı bir paylaşım ve kampanya deneyimidir. Misafirler masa üzerindeki QR kodu okutarak doğrudan ilgili kafenin akışına girer, fotoğraf paylaşır, içerikleri beğenir ve kampanya akışına katılır. Kafe sahipleri ise kendi çalışma alanlarından marka görünümünü, kampanya kurgusunu ve medya akışını yönetir.

Proje React ve Vite üzerinde çalışır; kimlik doğrulama, veritabanı, depolama ve yetkilendirme katmanında Firebase kullanır. Uygulama çoklu kafe yapısına göre tasarlanmıştır; her kafe kendi `cafeSlug` değeri üzerinden ayrışır ve kendi galerisi, QR akışı, tema ayarları ile kampanya kurgusuna sahip olur.

## Öne Çıkan Yetenekler

- QR ile masa tanıma: Misafir bağlantıya masa ve kafe bilgisiyle girer, doğru akış otomatik açılır.
- Çoklu kafe desteği: Tek uygulama içinde birden fazla kafe için ayrı çalışma alanı oluşturulabilir.
- Kafe sahibi paneli: Kafe adı, vurgu rengi, el yazısı stili ve kampanya ayarları panel üzerinden yönetilir.
- Medya akışı: Fotoğraf yükleme, beğeni, paylaşım ve içerik yönetimi Firebase üzerinden çalışır.
- Kampanya kurgusu: Belirli paylaşım sayısına ulaşıldığında ödül deneyimi ve teşvik mesajı gösterilir.
- Google ile giriş: Yönetici ve kafe sahibi erişimi Google Authentication ile sınırlandırılmıştır.
- Güvenli Firestore kurgusu: Yazma izinleri Firestore Rules ile denetlenir; named Firestore database hedefi deploy sırasında otomatik seçilir.

## Kullanıcı Akışları

### Misafir Akışı

1. Misafir masa üzerindeki QR kodu açar.
2. Uygulama ilgili `cafe` ve `table` bilgisini URL üzerinden çözer.
3. Misafir fotoğraf yükler, açıklama ekler ve paylaşımını tamamlar.
4. Diğer içerikleri beğenebilir ve sosyal paylaşım bağlantılarını kullanabilir.
5. Kampanya hedefi tamamlandığında ödül akışı gösterilir.

### Kafe Sahibi Akışı

1. Tanımlı Google hesabı ile giriş yapılır.
2. Yeni bir kafe çalışma alanı oluşturulur veya mevcut çalışma alanı seçilir.
3. Kafe adı, renk, tipografi ve kampanya ayarları kaydedilir.
4. Uygulama ilgili `cafes/{cafeSlug}` kaydını oluşturarak bağımsız kafe ortamını hazırlar.
5. Genel galeri bağlantısı ve örnek masa QR bağlantısı panel üzerinden alınır.

### Yönetici Akışı

1. Yetkili hesap ile giriş yapılır.
2. Tüm medya akışı filtrelenir, sıralanır ve gerektiğinde silinir.
3. Marka ve kampanya ayarları merkezi olarak güncellenir.
4. Çoklu kafe yapısı içinde farklı çalışma alanları arasında geçiş yapılır.

## Teknoloji Yığını

- Arayüz: React 19, TypeScript, Vite
- Stil: Tailwind tabanlı yapı ve proje özel CSS katmanı
- Animasyon: Motion
- Kimlik doğrulama: Firebase Authentication
- Veritabanı: Cloud Firestore
- Dosya depolama: Firebase Storage
- İkonlar: Lucide React

## Proje Yapısı

Temel dosyalar ve sorumlulukları:

- [src/App.tsx](./src/App.tsx): Misafir deneyimi, galeri akışı, yükleme modalı, paylaşım ve kampanya görünümü.
- [src/MainPage.tsx](./src/MainPage.tsx): Ana sayfa ve ürün tanıtım akışı.
- [src/AdminPanel.tsx](./src/AdminPanel.tsx): Yönetici ve kafe sahibi paneli.
- [src/accessConfig.ts](./src/accessConfig.ts): Uygulama tarafındaki erişim kontrol yardımcıları.
- [access-emails.mjs](./access-emails.mjs): Kafe sahibi ve süper yönetici e-posta listelerinin tek kaynak dosyası.
- [src/googleAuth.ts](./src/googleAuth.ts): Google giriş akışı ve hata mesajları.
- [src/firebase.ts](./src/firebase.ts): Firebase başlatma ve servis bağlantıları.
- [firestore.rules.template](./firestore.rules.template): Firestore kurallarının şablonu.
- [scripts/generate-firestore-rules.mjs](./scripts/generate-firestore-rules.mjs): E-posta listelerinden güncel `firestore.rules` dosyasını üretir.
- [scripts/firebase-deploy.mjs](./scripts/firebase-deploy.mjs): Doğru Firestore database hedefini seçerek deploy komutunu çalıştırır.

## Yerel Geliştirme

### Gereksinimler

- Node.js 20+
- Firebase projesine erişim
- Google Authentication ve Firestore kuralları için yetkili proje yapılandırması

### Kurulum

1. Bağımlılıkları kurun:
   `npm install`
2. Geliştirme sunucusunu başlatın:
   `npm run dev`
3. Uygulamayı şu adreste açın:
   `http://localhost:3000`

### Kontrol Komutları

- Tip kontrolü:
  `npm run lint`
- Production build:
  `npm run build`
- Firestore kurallarını üretmek:
  `npm run generate:rules`

## NPM Scriptleri

- `npm run dev`: Yerel geliştirme sunucusunu `localhost:3000` üzerinde başlatır.
- `npm run build`: Production build üretir.
- `npm run preview`: Build çıktısını önizleme modunda açar.
- `npm run clean`: `dist` klasörünü temizler.
- `npm run lint`: TypeScript tip kontrolü yapar.
- `npm run generate:rules`: `access-emails.mjs` ve `firestore.rules.template` üzerinden güncel Firestore kural dosyasını üretir.
- `npm run deploy:hosting`: Sadece Firebase Hosting tarafını deploy eder.
- `npm run deploy:rules`: Named Firestore database için kurallar ve indeksleri deploy eder.
- `npm run deploy:prod`: Build alır, ardından hosting ve named Firestore deploy işlemini birlikte çalıştırır.

## Firebase Yapılandırması

Bu repo, Firebase web yapılandırmasını ayrı `.env` değişkenlerine taşımadan doğrudan dosya üzerinden kullanır:

- [firebase-applet-config.json](./firebase-applet-config.json)

Bu dosya aşağıdaki kritik bilgileri içerir:

- Firebase proje kimliği
- Web app yapılandırması
- Firestore database kimliği
- Storage bucket bilgisi

Projede named Firestore database kullanıldığı için deploy akışı özellikle önemlidir. Sadece `firestore:rules` komutunu çalıştırmak yeterli değildir. Deploy scripti hedef database kimliğini otomatik okuyarak `firestore:<databaseId>` biçiminde doğru release noktasına yayın yapar.

## Yetkilendirme ve Güvenlik

Uygulamada yetkilendirme iki katmanda ele alınır:

### Uygulama Katmanı

- Kafe sahibi erişimi ve süper yönetici erişimi [src/accessConfig.ts](./src/accessConfig.ts) içinde değerlendirilir.
- Erişim listeleri [access-emails.mjs](./access-emails.mjs) dosyasından beslenir.
- Google hesabı olmayan veya yetkili listede bulunmayan kullanıcılar yönetim ekranlarına erişemez.

### Firestore Katmanı

- Kurallar [firestore.rules](./firestore.rules) dosyasında tutulur.
- Asıl kaynak dosya [firestore.rules.template](./firestore.rules.template) dosyasıdır.
- Kurallar üretilirken owner ve süper admin listeleri tek kaynaktan enjekte edilir.
- `cafes` koleksiyonu için yazma yetkisi, doğrulanmış Google hesabı ve uygun owner e-posta eşleşmesi ile sınırlandırılmıştır.
- Böylece istemci tarafındaki kontrol ile veritabanı tarafındaki gerçek güvenlik modeli uyumlu kalır.

## Deploy Süreci

### İlk Hazırlık

1. Firebase CLI ile giriş yapın:
   `firebase login`
2. Gerekirse proje erişim izinlerinizi doğrulayın.

### Production Deploy

Tam deploy için:

`npm run deploy:prod`

Bu komut sırasıyla:

1. Production build üretir.
2. Firestore kural dosyasını günceller.
3. Hosting tarafını deploy eder.
4. Named Firestore database için kurallar ve indeksleri yayınlar.

### Sadece Firestore Kuralları

Yalnızca veritabanı tarafındaki kuralları ve indeksleri yayınlamak için:

`npm run deploy:rules`

## Operasyonel Notlar

- Uygulama anonim giriş kullanmaz; tüm yetkili işlemler Google hesabı ile yapılır.
- Geliştirme sırasında Google giriş akışı için uygulamayı `http://localhost:3000` üzerinden açmanız gerekir.
- Firestore rules deploy sürecinde named database hedefi yanlış seçilirse istemci tarafında `permission-denied` hataları görülebilir.
- Erişim listesi güncellenirse önce `access-emails.mjs`, ardından `npm run deploy:rules` çalıştırılmalıdır.

## VDS Deployment (Production Sunucusu)

ShareVibe uygulaması VDS (Virtual Dedicated Server) üzerinde barındırılır. Sunucu IP adresi: **185.34.101.235**

### Hızlı Deploy

Production build üretin:
```bash
npm run build
```

Deploy script-ini çalıştırın:

**Windows (PowerShell):**
```powershell
.\deploy.ps1
```

**macOS/Linux:**
```bash
bash deploy.sh
```

Script otomatik olarak:
1. Dosyaları sunucuya yükler
2. `/var/www/sharevibe/html/` klasörüne yerleştirir
3. Nginx yapılandırmasını deployer
4. Nginx reload eder

### Sunucu Yapılandırması

- **Web Root:** `/var/www/sharevibe/html`
- **Web Sunucusu:** Nginx
- **SSL:** Let's Encrypt (HTTPS)
- **Domain:** `sharevibe.co`
- **Deployment:** Nginx konfigürasyonu `nginx-sharevibe.conf` ile yönetilir

### Manuel Deploy

Adım-adım işlemler için bkz: [VDS_DEPLOYMENT.md](./VDS_DEPLOYMENT.md)

### Özellikler

- ✅ Otomatik SSL/TLS (HTTPS)
- ✅ Gzip sıkıştırması
- ✅ Statik dosya caching (1 yıl)
- ✅ Güvenlik başlıkları (X-Frame-Options, CSP, etc.)
- ✅ SPA yönlendirmesi (index.html fallback)
- ✅ Performans optimizasyonları

### Sorun Giderme

Bkz: [VDS_DEPLOYMENT.md](./VDS_DEPLOYMENT.md#troubleshooting) - Sorun Giderme bölümü

## Repository

GitHub deposu:

`https://github.com/FaridMahmudlu/share-vibe`

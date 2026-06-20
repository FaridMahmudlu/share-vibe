# ShareVibe Production Deployment Kurulumu

Production hedefi: `https://sharevibe.co`

## Deployment Modeli

- Frontend build çıktısı `dist/` klasöründen yayınlanır.
- Backend API `/api` altında Nginx üzerinden Express servisine proxy edilir.
- Firebase Auth, Firestore, Storage ve Functions mimarinin parçasıdır.
- VPS/Nginx deployment komutu, doğrulamalar geçmeden dosya yüklemez.

## Gerekli Runtime Değişkenleri

Gerçek değerler yalnızca runtime ortamında veya local ve ignored `.deploy.env` dosyasında tutulmalıdır. Repository içine gerçek credential yazılmamalıdır.

- `SHAREVIBE_DEPLOY_HOST`
- `SHAREVIBE_DEPLOY_PORT`
- `SHAREVIBE_DEPLOY_USER`
- `SHAREVIBE_DEPLOY_SSH_KEY_PATH`
- `SHAREVIBE_DEPLOY_PASSWORD`
- `SHAREVIBE_DEPLOY_PATH`
- `SHAREVIBE_DEPLOY_HEALTH_URL`

SSH key tabanlı, non-root deploy kullanıcısı önerilir. `SHAREVIBE_DEPLOY_PASSWORD` yalnızca geçici fallback olarak kullanılmalıdır.

## Root Bootstrap Notu

Normal üretim deployment root kullanıcı ile yapılmamalıdır. Eğer mevcut sunucuya erişimin tek yolu geçici root erişimi ise, yalnızca bir defalık bootstrap için:

```bash
SHAREVIBE_ALLOW_ROOT_BOOTSTRAP=1 npm run deploy:production
```

Bu işlemden sonra non-root deploy kullanıcısı ve SSH key tabanlı erişim oluşturulmalı, root/parola erişimi kapatılmalı veya sınırlandırılmalıdır.

## Pre-Deploy Kapısı

`npm run deploy:production` şu kontrolleri deploy başlamadan çalıştırır:

```bash
npm run generate:access-policy
npm run access:sync-claims:dry
npm run generate:rules
npm run generate:sitemaps
npm run lint
npm test -- --run
npm --prefix backend run build
npm --prefix functions test
npm --prefix functions run build --if-present
npm run build
npm audit --omit=dev --audit-level=high
npm --prefix backend audit --omit=dev --audit-level=high
```

Bu komutlardan biri başarısız olursa deployment durur.

## Güvenli Akış

1. `.deploy.env.example` dosyasını referans alarak local `.deploy.env` oluşturun.
2. Gerçek değerleri repository içine yazmayın.
3. `npm run deploy:check` çalıştırın.
4. `SHAREVIBE_DEPLOY_PATH` yoksa `npm run deploy:discover` çalıştırın.
5. Üretim yolu güvenle doğrulanırsa `npm run deploy:production` çalıştırın.
6. Deploy sonrası `npm run deploy:health` ile `https://sharevibe.co` yanıtını doğrulayın.

## Engelleyici Durumlar

- Deployment credential yoksa deploy çalıştırılmaz.
- Üretim path’i güvenle bulunamazsa deploy çalıştırılmaz.
- Build, test, lint, audit veya rules generation başarısızsa deploy çalıştırılmaz.
- Secret değerleri komut çıktısına veya dokümantasyona yazılmaz.

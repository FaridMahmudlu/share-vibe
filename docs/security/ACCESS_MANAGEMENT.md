# ShareVibe Yetki Yönetimi

Güncelleme tarihi: 2026-06-06

Bu doküman, ShareVibe yönetim rollerinin kod sözdizimi bilmeden nasıl yönetileceğini açıklar. Gerçek güvenlik kararı yalnızca frontend görünürlüğüne bırakılmaz; backend middleware, Firebase custom claims, Firestore rules ve Storage rules aynı merkezi yetki modelini kullanır.

## Roller

- `super_owner`: Tüm platforma ve tüm kafe panellerine erişebilir.
- `owner`: Yalnızca atanmış kafe panellerini yönetebilir. Arayüzde “Admin / Owner” olarak gösterilir.
- `manager`: Yalnızca atanmış kafe panellerinde sınırlı yönetim yapabilir.
- `none`: Yönetim paneli erişimi yoktur.

## Admin Panel Üzerinden Yetki Ekleme

1. Super Owner hesabı ile ShareVibe Admin Panel’e giriş yapın.
2. `Ayarlar` bölümünü açın.
3. `Yetki Yönetimi` kartında rol seçin.
4. E-posta adresini yazın.
5. `Admin / Owner` veya `Manager` için cafe kodlarını virgülle yazın. Örnek: `demo-cafe, ikinci-kafe`.
6. `Yetki Kaydet` düğmesine basın.
7. Ardından `Tüm Claims Senkronize Et` düğmesine basın.

Not: Firebase Auth içinde henüz kullanıcı oluşmadıysa claims senkronizasyonu o kullanıcıyı atlar. Kullanıcı Google ile ilk kez giriş yaptıktan sonra senkronizasyon tekrar çalıştırılmalıdır.

## CLI Wizard ile Yetki Ekleme

İnteraktif kurulum:

```bash
npm run access:setup
```

İlk Super Owner bootstrap:

```bash
npm run access:bootstrap -- --emails "super-owner@example.com"
```

Dry-run kontrolü:

```bash
npm run access:setup:dry
npm run access:sync-claims:dry
```

Firebase custom claims senkronizasyonu:

```bash
npm run access:sync-claims
```

## Firebase Admin Credential Gereksinimi

Custom claims senkronizasyonu için runtime ortamında aşağıdakilerden biri gerekir:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `FIREBASE_PROJECT_ID` ve uygun Application Default Credentials

Bu değerler hiçbir zaman repository içine yazılmamalıdır. `.env`, `.deploy.env`, service-account JSON dosyaları ve private key dosyaları commit edilmemelidir.

## Üretim Notu

Yetki listesi değiştirildikten sonra:

```bash
npm run generate:access-policy
npm run generate:rules
npm run access:sync-claims
```

komutları çalıştırılmalıdır. Kullanıcılar yeni claims değerlerini almak için yeniden giriş yapmalı veya token yenilemelidir.

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Kafe Anı

Firebase tabanlı React/Vite uygulamasıdır. Müşteriler fotoğraf paylaşabilir, içerikleri beğenebilir ve yöneticiler tema ile kampanya ayarlarını yönetebilir.

## Yerelde Çalıştırma

Gereksinimler:

- Node.js 20+
- Yapılandırılmış Firebase projesine internet erişimi

Adımlar:

1. Bağımlılıkları kurun:
   `npm install`
2. Geliştirme sunucusunu başlatın:
   `npm run dev`
3. Uygulamayı şu adresten açın:
   `http://localhost:3000`

## Kontroller

- Prod build:
  `npm run build`
- TypeScript kontrolü:
  `npm run lint`

## Notlar

- Firebase web yapılandırması [`firebase-applet-config.json`](./firebase-applet-config.json) içinde tutulur.
- Uygulama galeri erişimi için otomatik anonim Firebase oturumu açar.
- Admin yetkileri Firestore kuralları ve [`src/AdminPanel.tsx`](./src/AdminPanel.tsx) içinden kontrol edilir.

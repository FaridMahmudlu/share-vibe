# Kafe Ani

Firebase tabanli React/Vite uygulamasidir. Musteriler ani paylasabilir, icerikleri begenebilir ve yoneticiler tema ile kampanya ayarlarini yonetebilir.

## Yerelde Calistirma

Gereksinimler:

- Node.js 20+
- Yapilandirilmis Firebase projesine internet erisimi

Adimlar:

1. Bagimliliklari kurun:
   `npm install`
2. Gelistirme sunucusunu baslatin:
   `npm run dev`
3. Uygulamayi su adresten acin:
   `http://localhost:3000`

## Kontroller

- Prod build:
  `npm run build`
- TypeScript kontrolu:
  `npm run lint`

## Firebase Deploy

- Hosting ve Firestore deploy yapilandirmasi repo icinde tutulur:
  [`firebase.json`](./firebase.json)
  [`firestore.rules`](./firestore.rules)
  [`firestore.indexes.json`](./firestore.indexes.json)
  [`.firebaserc`](./.firebaserc)
- Canli deploy oncesi bir kez Firebase CLI login gerekir:
  `firebase login`
- Ardindan canli deploy:
  `npm run build`
  `firebase deploy --only "hosting,firestore:rules" --project gen-lang-client-0200945474`

## Notlar

- Firebase web yapilandirmasi [`firebase-applet-config.json`](./firebase-applet-config.json) icinde tutulur.
- Uygulama yalnizca Google ile giris kullanir; anonim giris kaldirilmistir.
- Admin yetkileri Firestore kurallari ve [`src/AdminPanel.tsx`](./src/AdminPanel.tsx) icinden kontrol edilir.

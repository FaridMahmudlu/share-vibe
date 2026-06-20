# ShareVibe Güvenlik TODO

Güncelleme tarihi: 2026-06-06

## Üretim Öncesi Zorunlu Kontroller

- `npm run access:sync-claims` komutu Firebase Admin credential bulunan güvenli runtime ortamında çalıştırılmalıdır.
- `npm run generate:access-policy` ve `npm run generate:rules` komutları access policy değişikliklerinden sonra tekrar çalıştırılmalıdır.
- Firebase Functions ve Firestore/Storage rules üretim ortamına deploy edilmeden önce staging veya emulator ortamında doğrulanmalıdır.
- Daha önce paylaşılmış veya repository içinde bulunmuş olabilecek tüm deployment parolaları, SSH anahtarları, service-account dosyaları ve API token kategorileri rotate edilmelidir.

## Yüksek Öncelik

- Medya yükleme akışı backend veya Cloud Function üzerinden doğrulanmalıdır. Bu katmanda magic-byte kontrolü, EXIF temizliği, güvenilir görsel yeniden kodlama ve güvenli Storage yazımı uygulanmalıdır.
- Backend auth reddi, kafe bazlı owner/manager erişimi, Super Owner erişimi ve yıkıcı admin işlemleri için entegrasyon testleri genişletilmelidir.
- Backend tarafındaki orta seviye transitive dependency uyarıları, kırıcı `npm audit fix --force` kullanılmadan güvenli paket güncellemeleriyle çözülmelidir.
- Firebase App Check üretimde etkinleştirilmeli ve Storage/Firestore erişimleri için zorlayıcı hale getirilmelidir.

## Orta Öncelik

- Ayrıcalıklı kullanıcılar için Google/Firebase Auth seviyesinde MFA politikası uygulanmalıdır.
- Production loglarında PII, e-posta gövdesi, auth header, token, Storage URL veya private metadata tutulmadığı düzenli olarak denetlenmelidir.
- Public SEO/social metadata içinde doğrulanamayan ödül, adres, telefon, sosyal profil veya istatistik bulunmadığı periyodik olarak kontrol edilmelidir.
- Liste endpoint’lerinde pagination ve dar projection yaklaşımı tamamlanmalıdır.

# ShareVibe Secret Rotation TODO

Bu dosyaya hiçbir gerçek secret değeri eklenmemelidir.

## Derhal Rotate Edilmesi Gereken Kategoriler

- Deployment erişim bilgileri: Önceki local/private deployment yardımcıları ve konuşma girdileri içinde sunucu erişim credential kategorisi bulunmuş olabilir. Etkilenen parola, SSH key veya erişim token’ları rotate edilmelidir.
- Root/parola SSH erişimi: Eğer üretime erişim root veya parola tabanlı yapıldıysa bu geçici risk kabul edilmeli, non-root deploy kullanıcısı ve SSH key tabanlı erişime geçilmelidir.
- Firebase service-account credential kategorisi: Daha önce local ortamda kullanıldıysa geçerliliği kontrol edilmeli ve gereksiz eski anahtarlar iptal edilmelidir.
- Üçüncü taraf API anahtarları: Brevo, analytics, webhook veya benzeri servis token’ları source control dışında tutulmalı; eski veya paylaşıldığı düşünülen anahtarlar rotate edilmelidir.

## Düzenli Kontrol

- `.env`, `.deploy.env`, service-account JSON, private key, log, dump, upload ve deploy archive dosyalarının git tarafından takip edilmediği doğrulanmalıdır.
- Admin/owner e-posta listeleri secret değildir; ancak gerçek yetkilendirme Firebase custom claims, backend middleware ve rules ile enforce edilmelidir.
- Secret değeri hiçbir raporda, terminal çıktısında veya dokümantasyonda gösterilmemelidir.

# ShareVibe — Business Requirements Document

## 1. Sənəd haqqında ümumi məlumat

| Sahə | Məlumat |
| --- | --- |
| Sənədin məqsədi | ShareVibe məhsulunun biznes tələblərini, istifadəçi axınlarını, funksional və qeyri-funksional gözləntilərini stakeholder-lər, product management, development və investor auditoriyası üçün vahid sənəd kimi təsvir etmək. |
| Əhatə dairəsi | QR əsaslı məkan giriş axını, müştəri foto/vibe paylaşımı, kafe/məkan səhifəsi, admin və owner paneli, məkan idarəetməsi, kontent moderasiyası, analytics, email/notification və gələcək subscription/payment imkanları. |
| Hədəf auditoriya | ShareVibe platform owner-ləri, investorlar, product manager-lər, business analyst-lər, software architect-lər, frontend/backend developer-lər, QA, marketing komandası və məkan sahibləri. |
| Versiya | v1.0 - Draft BRD |
| Hazırlanma tarixi | [YYYY-MM-DD] |
| Domen | `sharevibe.co` |
| Sənəd statusu | Kod bazası analizi əsasında hazırlanmış ilkin professional BRD. |

Bu BRD mövcud layihə strukturunun analizi əsasında hazırlanıb. Layihədə React/Vite frontend, Firebase Authentication/Firestore/Storage, ayrıca Express/Prisma/PostgreSQL backend, QR stand, email marketing, customer management, analytics və settings modulları müşahidə olunur. Kodda foto paylaşımı tam əsas axın kimi görünür; video paylaşımı isə konsept və requirement kimi qeyd edilir, lakin mövcud implementasiyada ayrıca video upload dəstəyi təsdiqlənmir.

## 2. Layihənin qısa xülasəsi

ShareVibe kafelər, restoranlar və oxşar fiziki məkanlar üçün sosial və marketinq yönümlü paylaşım platformasıdır. Məhsulun əsas ideyası müştərinin məkan daxilində QR kodu oxudaraq həmin məkana aid rəqəmsal paylaşım mühitinə daxil olması, foto və ya qısa “vibe” paylaşması, məkanın isə bu real müştəri kontentindən sosial sübut, marketinq kontenti və icma engagement-i kimi istifadə etməsidir.

Məhsul iki əsas tərəfi birləşdirir:

- Müştəri üçün sürətli, mobil-first, minimum friction-lu paylaşım təcrübəsi.
- Məkan sahibi üçün real müştəri kontentini toplamaq, nümayiş etdirmək, kampaniya qurmaq və müştəri loyallığını artırmaq üçün idarəetmə paneli.

ShareVibe-in əsas dəyər təklifi odur ki, məkanlar reklam materialı yaratmaq üçün yalnız professional çəkilişlərə və ya təsadüfi sosial media tag-lərinə güvənmədən, real müştəri anlarını strukturlaşdırılmış şəkildə toplaya və idarə edə bilirlər.

Əsas ideya:

- Kafe/məkan daxilində QR kod vasitəsilə paylaşım.
- Müştərinin real anını paylaşması.
- Məkanın bu kontentdən marketinq və sosial sübut kimi istifadə etməsi.
- Profil yaratma prosesinin mümkün qədər sadə saxlanması.
- Məkanlara daha çox engagement, görünürlük və loyallıq qazandırmaq.

Mövcud kodda aşağıdakı məhsul imkanları görünür:

- Public landing page və məkan təcrübəsi.
- `screen=app`, `cafe`, `table/masa` query parametrləri ilə məkan və masa kontekstinin açılması.
- Google Authentication ilə giriş.
- Firebase Storage-a foto yükləmə və Firestore `media` kolleksiyasında paylaşım metadata-sının saxlanması.
- Gallery, like, share link, Instagram story paylaşım axını.
- Owner/Admin panel, workspace/məkan idarəetməsi, kampaniya, QR stand, customer, email marketing, templates, analytics və settings bölmələri.
- Planlar: Standart və Mail inteqrasiyalı aylıq/illik paketlər, hazırda daha çox WhatsApp/contact yönümlü satış axını kimi görünür.

## 3. Biznes problemi və imkan

### 3.1 Kafelərin/məkanların hazırkı problemi

Kafe və restoranlar gündəlik olaraq çox sayda real müştəri təcrübəsi yaradır, lakin bu təcrübələrin böyük hissəsi strukturlaşdırılmış marketinq aktivinə çevrilmir. Müştərilər şəkil paylaşsa belə, paylaşımlar fərqli sosial platformalarda dağılır, məkanın rəsmi hesabına çatmır, kontent hüquqları və keyfiyyəti idarə olunmur, təkrar istifadə üçün arxivlənmir.

Əsas problemlər:

- Real müştəri kontenti məkana sistemli şəkildə daxil olmur.
- Müştərini paylaşım etməyə təşviq edən sadə, məkan daxilində başlayan axın yoxdur.
- Instagram/TikTok kimi platformalarda kontent məkanın nəzarətindən kənardadır.
- Kiçik və orta məkanların davamlı sosial kontent istehsalı üçün resursu məhduddur.
- Məkan sahibləri hansı masa, kampaniya və ya müştəri davranışının engagement yaratdığını ölçməkdə çətinlik çəkir.
- Loyalty və təkrar ziyarət mexanizmləri çox vaxt manual, parçalanmış və ölçülməsi çətin olur.

### 3.2 Müştərilərin paylaşım davranışı

Müştərilər kafedə estetik görüntü, yemək, içki, dostlarla an və məkan atmosferi paylaşmağa meyllidirlər. Lakin paylaşım üçün platforma dəyişmək, hesab tag etmək, caption yazmaq və ya ayrıca qeydiyyatdan keçmək əlavə friction yaradır. QR ilə açılan birbaşa məkan səhifəsi bu friction-u azaldır.

Mövcud kod axını göstərir ki, ShareVibe müştəridən yalnız zəruri halda Google giriş tələb edir, seçilmiş foto və caption-u saxlayır, pending upload mexanizmi ilə auth sonrası paylaşımın itməməsini təmin edir.

### 3.3 Real müştəri kontentinin dəyəri

Real müştəri kontenti aşağıdakı biznes dəyərləri yaradır:

- Sosial sübut: potensial müştərilər real insanların məkanı necə təcrübə etdiyini görür.
- Kontent istehsalı: məkanın gündəlik sosial media kontent ehtiyacı azalır.
- Community hissi: müştərilər öz paylaşımlarını məkan səhifəsində görərək daha çox bağlanır.
- Measurement: hansı masa, stand, kampaniya və ya periodun daha çox paylaşım yaratdığı ölçülə bilər.
- Loyalty: paylaşım hədəfləri və reward mexanizmləri təkrar engagement üçün motivasiya yaradır.

### 3.4 ShareVibe problemi necə həll edir

ShareVibe məkan daxilində fiziki QR touchpoint-i ilə başlayır və müştərini birbaşa həmin məkana aid rəqəmsal paylaşım səhifəsinə gətirir. Müştəri foto/vibe paylaşır, sistem həmin paylaşımı məkan, masa, istifadəçi və zaman metadata-sı ilə saxlayır. Məkan sahibi admin paneldə bu kontenti görür, idarə edir, kampaniya və email marketing məqsədləri üçün istifadə edir, analytics vasitəsilə performansı izləyir.

### 3.5 Bazar imkanı

ShareVibe-in bazar imkanı aşağıdakı seqmentlərdə görünür:

- Kafelər, restoranlar, dessert shop-lar, lounge və barlar.
- Co-working məkanları və event venue-lar.
- Hotel lobby/cafe və hospitality məkanları.
- Estetik interyerə sahib, sosial paylaşım potensialı yüksək lokal bizneslər.

SaaS modelinə keçid üçün əsas imkanlar:

- Məkan başına aylıq subscription.
- Masa/QR stand sayı əsasında setup və servis haqqı.
- Email marketing, analytics, campaign management kimi premium modullar.
- Multi-location brendlər üçün daha yüksək planlar.

## 4. Məhsulun məqsədləri

### 4.1 Business goals

- Məkanlara real müştəri paylaşımlarını toplamaq və marketinq aktivinə çevirmək imkanı vermək.
- Kafelər üçün təkrarlanan monthly subscription revenue modeli yaratmaq.
- QR stand və setup xidmətləri ilə onboarding prosesini monetizasiya etmək.
- Mail inteqrasiyası, analytics və campaign management kimi premium modullarla ARPU artırmaq.
- ShareVibe-i lokal məkanlar üçün sosial proof və customer engagement platforması kimi mövqeləndirmək.
- Gələcəkdə multi-location business account və agency/channel partnership modellərinə uyğun böyümək.

### 4.2 Product goals

- QR əsaslı sürətli paylaşım təcrübəsi yaratmaq.
- Profil yaratma friction-unu minimuma endirmək və giriş prosesini sadə saxlamaq.
- Foto/vibe paylaşımı, gallery və sosial paylaşım axınını stabil işlətmək.
- Admin/owner panel vasitəsilə kontent, məkan, kampaniya, QR stand, customer və analytics idarəetməsini sadələşdirmək.
- Kontent moderasiyası və data qorunması üçün əsas təhlükəsizlik qatlarını təmin etmək.
- SEO/GEO baxımından məkan səhifələrinin discoverability potensialını artırmaq.
- Subscription/payment modelinə uyğun genişlənə bilən arxitektura saxlamaq.

## 5. Stakeholder-lər

| Stakeholder | Rolu | Əsas marağı | Gözləntisi | Sistemdəki təsiri |
| --- | --- | --- | --- | --- |
| Platform owner / ShareVibe admin | Məhsulun sahibi və platforma administratoru | Məhsulun bazara çıxması, monetizasiya, təhlükəsiz əməliyyat | Bütün məkanları, kontenti, owner access-i və sistem parametrlərini idarə etmək | Ən yüksək qərar və icazə səviyyəsi |
| Kafe sahibi | Məkanın biznes sahibi | Daha çox visibility, real kontent, müştəri loyallığı və ölçülə bilən engagement | Öz məkanını yaratmaq, QR kod almaq, kontenti və kampaniyaları idarə etmək | Məkan məlumatları, plan seçimi, kampaniya və kontent qərarları |
| Kafe əməkdaşı / menecer | Gündəlik əməliyyat istifadəçisi | Kontentin yoxlanması, kampaniyaların izlənməsi, QR standların işlək qalması | Sadə panel, məhdud və təhlükəsiz icazələr, operativ moderasiya | Məkan daxilində gündəlik istifadə və müştəri dəstəyi |
| Müştəri / istifadəçi | QR oxudan və paylaşım edən şəxs | Tez paylaşım, sosial görünürlük, reward və əyləncəli təcrübə | Mobil telefonda asan giriş, foto/vibe paylaşımı, az data tələbi | Kontent yaradır, engagement və loyalty signal-ları verir |
| Developer team | Məhsulu implementasiya edən texniki komanda | Stabil, təhlükəsiz və genişlənə bilən sistem | Aydın requirements, data model, API və acceptance criteria | Texniki arxitektura, release keyfiyyəti və maintainability |
| Marketing team | ShareVibe və kafe kampaniyalarını idarə edən komanda | Lead generation, onboarding, campaign və email performance | Məkanlardan real kontent, customer segmentləri, email/campaign tools | Growth, retention və market positioning |
| Payment/Email/Hosting provider-lər | Xarici servis təminatçıları | Etibarlı servis istifadəsi və inteqrasiya | API-ların düzgün və təhlükəsiz istifadəsi | Email deliverability, hosting uptime, payment flow və data storage |

## 6. Hədəf istifadəçilər və personelar

### Persona 1: Kafe sahibi

| Sahə | Təsvir |
| --- | --- |
| Qısa təsvir | Lokal və ya boutique kafenin sahibi. Sosial mediada görünmək, real müştəri kontenti toplamaq və daha çox təkrar ziyarət yaratmaq istəyir. |
| Məqsədlər | Məkanı tanıtmaq, real paylaşımları toplamaq, kampaniyaları idarə etmək, QR standlardan fayda görmək, müştəri bazası yaratmaq. |
| Problemlər | Kontent istehsalına vaxt və büdcə çatışmır, müştəri paylaşımları dağınıq qalır, kampaniya performansı ölçülmür. |
| ShareVibe-dən gözləntisi | Bir paneldən məkan profilini, QR kodları, gallery, kampaniya və analytics-i idarə etmək. |
| Əsas istifadə ssenarisi | Kafe sahibi owner portal-a Google ilə daxil olur, məkan yaradır, QR linkini alır, paylaşılmış fotoları izləyir və kampaniya/reward ayarlarını dəyişir. |

### Persona 2: Kafe meneceri / əməkdaşı

| Sahə | Təsvir |
| --- | --- |
| Qısa təsvir | Gündəlik əməliyyatları idarə edən menecer və ya əməkdaş. Məkan sahibinin verdiyi icazə ilə paneldən istifadə edir. |
| Məqsədlər | Paylaşımları yoxlamaq, uyğunsuz kontenti silmək, QR standların aktivliyini izləmək, müştəri suallarını cavablandırmaq. |
| Problemlər | Çox texniki olmayan, sürətli istifadə edilən panelə ehtiyac var; səhv icazə ilə kritik ayarları dəyişmək risklidir. |
| ShareVibe-dən gözləntisi | Məhdud, aydın, mobil/desktop uyğun admin view və kontent idarəetmə alətləri. |
| Əsas istifadə ssenarisi | Menecer paneldə “Canlı Galeri” bölməsinə daxil olur, yeni paylaşımları görür, uyğunsuz olanı silir və QR stand performansını yoxlayır. |

### Persona 3: Kafeyə gələn müştəri

| Sahə | Təsvir |
| --- | --- |
| Qısa təsvir | Kafedə telefonla QR kodu oxudan, foto paylaşmağa meylli qonaq. |
| Məqsədlər | Tez paylaşım etmək, kafenin gallery-sində görünmək, bəlkə də reward/campaign qazanmaq. |
| Problemlər | Uzun qeydiyyat, çoxlu forma, ağır upload və anlaşılmayan privacy şərtləri paylaşım motivasiyasını azaldır. |
| ShareVibe-dən gözləntisi | QR-dan sonra birbaşa doğru məkan səhifəsi, sadə login, foto seçimi, qısa caption və problemsiz upload. |
| Əsas istifadə ssenarisi | Müştəri masadakı QR kodu oxudur, Google ilə giriş edir, foto seçir, vibe/caption yazır və paylaşımı göndərir. |

### Persona 4: ShareVibe platform admini

| Sahə | Təsvir |
| --- | --- |
| Qısa təsvir | Bütün platformanın işləkliyinə, məkanlara, owner access-lərə və kontent təhlükəsizliyinə cavabdeh şəxs. |
| Məqsədlər | Yeni məkanlara access vermək, problemli kontenti idarə etmək, planları və sistem ayarlarını nəzarətdə saxlamaq. |
| Problemlər | Multi-tenant sistemdə yanlış access, spam kontent, storage cost və manual support yükü risk yaradır. |
| ShareVibe-dən gözləntisi | Super admin səviyyəsində bütün məkanlara baxış, owner access idarəsi, audit və analytics. |
| Əsas istifadə ssenarisi | Platform admin admin panelə daxil olur, kafe sahibi email-i üçün access yaradır, problemli məkanı yoxlayır və kontenti moderasiya edir. |

## 7. Məhsulun əhatə dairəsi

### 7.1 MVP scope

MVP aşağıdakı imkanları əhatə etməlidir:

- QR kod vasitəsilə məkana giriş: hər məkan və masa/stand üçün unikal link.
- Müştəri login/giriş prosesi: Google Authentication və ya minimum identifikasiya.
- Foto paylaşımı: mövcud kodda əsas upload axını foto üzərində qurulub.
- Video paylaşımı: biznes requirement kimi nəzərdə tutulur, lakin mövcud kodda tam implementasiya görünmür. MVP daxilində saxlanılarsa ayrıca texniki task kimi planlaşdırılmalıdır.
- Vibe/caption əlavə etmə: qısa mətnlə müştəri anının təsviri.
- Məkan səhifəsi: kafe adı, tema rəngi, kampaniya/reward məlumatı, gallery və share CTA.
- Paylaşımların görüntülənməsi: real-time gallery, like, share link və social paylaşım.
- Admin panel: dashboard, gallery/posts, campaigns, QR stands, customers, marketing, templates, stats, settings.
- Kontent moderasiyası: admin/owner tərəfindən silmə, kampaniyaları archive/restore etmə; approval queue mövcud kodda tam ayrıca görünmür və requirement kimi qeyd olunur.
- Məkan idarəetməsi: kafe adı, slug, logo, rəng, campaign target/reward, admin email-lər, domain/settings.
- QR stand idarəetməsi: stand siyahısı, public URL, foto sayı, status, request form.
- Responsive UI: QR istifadəçiləri üçün mobile-first, admin üçün desktop və tablet uyğunluğu.
- Əsas təhlükəsizlik: Firebase rules, owner/admin access, input validation, storage file validation.
- SEO/GEO optimizasiya üçün əsas tələblər: metadata, OG tags, sitemap/robots, LocalBusiness schema potensialı.

### 7.2 Out of scope

Hazırkı mərhələyə daxil olmayan və ya tam kodda təsdiqlənməyən hissələr:

- Tam sosial şəbəkə funksiyaları: follow, personal feed, DM, friend graph.
- Kompleks mesajlaşma sistemi.
- Native iOS/Android mobil tətbiq.
- Geniş AI kontent redaktəsi və avtomatik video montaj.
- Loyalty marketplace və kupon sistemi; yalnız gələcək mərhələ kimi nəzərdə tutulur.
- Tam payment processor inteqrasiyası; mövcud kodda plan/contact və billing metadata var, lakin checkout/invoice flow təsdiqlənmir.
- Avtomatik AI/ML əsaslı kontent moderasiyası.
- Public user profile və creator analytics.

### 7.3 Future scope

Gələcək inkişaf imkanları:

- Subscription/payment plans: Stripe və ya lokal payment provider ilə checkout, invoice, trial, plan limitləri.
- Advanced analytics: QR scan funnel, conversion, cohort, retention, campaign ROI.
- Loyalty/reward sistemi: paylaşım sayına görə kupon, stamp card, promo code.
- Sosial media inteqrasiyaları: Instagram/TikTok/Facebook auto-export və UGC approval workflow.
- AI caption və kontent təklifi: kafe brend tonuna uyğun caption, email subject və story copy.
- Multi-location business account: bir brend altında bir neçə filial.
- Email automation: welcome, comeback, birthday, campaign drip.
- Campaign management: scheduled omnichannel campaigns, segmentlər, A/B testing.
- Report/abuse workflow və auto-moderation.
- Video upload və video optimization pipeline.

## 8. Əsas istifadəçi axınları

### 8.1 Müştəri paylaşım axını

1. Müştəri kafedə masa, kassayanı və ya stand üzərində QR kodu görür.
2. QR kodu telefon kamerası ilə oxudur.
3. ShareVibe linki açılır və sistem `cafe` və `table/masa` məlumatlarına əsasən doğru məkan səhifəsini göstərir.
4. Müştəri paylaşım etmək istədikdə giriş edir və ya sadə identifikasiya prosesindən keçir.
5. Sistem girişdən əvvəl seçilmiş fayl varsa, pending upload mexanizmi ilə məlumatın itməməsini təmin edir.
6. Müştəri foto seçir və ya desktop camera axınında kamera ilə çəkir.
7. Müştəri qısa vibe/caption əlavə edir.
8. Sistem fayl formatını, ölçüsünü, məkan slug-ını və caption-u validasiya edir.
9. Sistem media faylını storage-a yükləyir və metadata-nı database-də saxlayır.
10. Paylaşım moderasiya qaydasından asılı olaraq dərhal gallery-də görünür və ya təsdiq gözləyir.
11. Müştəri paylaşımı gallery-də görür, linki kopyalayır və social platformalarda paylaşa bilir.
12. Əgər campaign target tamamlanırsa, sistem reward/progress mesajı göstərir.

### 8.2 Kafe sahibi axını

1. Kafe sahibi ShareVibe owner portal-a daxil olur.
2. Google Authentication ilə hesabını təsdiqləyir.
3. Yeni məkan/workspace yaradır və ya mövcud məkanı seçir.
4. Məkan adı, slug, rəng, logo, address/contact, campaign target və reward məlumatlarını idarə edir.
5. QR public link və nümunə masa QR linkini əldə edir.
6. QR standlar üçün status, masa sayı və request məlumatlarını izləyir.
7. Gallery-də paylaşımları izləyir, lazım olduqda silir.
8. Campaign bölməsində public kampaniya yaradır və ya archive edir.
9. Stats bölməsində paylaşım, like, views, customer və email göstəricilərinə baxır.
10. Mail plan aktivdirsə, customer list, email templates və email campaigns istifadə edir.

### 8.3 Platform admin axını

1. Platform admin Google ilə admin panelə daxil olur.
2. Super admin access əsasında bütün məkanlara baxa və onları idarə edə bilir.
3. Owner access email-lərini yaradır və ya silir.
4. Bütün məkanların gallery və campaign kontentinə nəzarət edir.
5. Abuse və report halları üçün kontenti bloklayır, silir və ya audit edir.
6. Sistem parametrləri, planlar, settings və gələcək payment statuslarını izləyir.
7. Gələcəkdə subscription, invoice, trial və plan limitləri üzrə platforma nəzarəti həyata keçirir.

## 9. Funksional tələblər

### 9.1 QR və məkan yönləndirmə

| ID | Tələb | Təsvir | Prioritet | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| BRD-FR-001 | Unikal QR link | Sistem hər məkan və lazım olduqda masa/stand üçün unikal public link yaratmalıdır. | Must | GIVEN kafe sahibi məkan yaradır, WHEN sistem public link generasiya edir, THEN link yalnız həmin məkan slug-ına bağlı olmalıdır. |
| BRD-FR-002 | Doğru məkan yönləndirməsi | QR oxudulduqda istifadəçi doğru məkan səhifəsinə yönləndirilməlidir. | Must | GIVEN istifadəçi QR kodu oxudur, WHEN link açılır, THEN `cafe` və `table/masa` parametrlərinə uyğun səhifə görünməlidir. |
| BRD-FR-003 | Masa/stand konteksti | QR link masa və ya stand məlumatını daşımalıdır. | Must | GIVEN QR linkdə masa parametri var, WHEN istifadəçi paylaşım edir, THEN media record həmin masa/stand ilə saxlanmalıdır. |
| BRD-FR-004 | QR dashboard | Kafe sahibi QR standların statusunu, public URL-ni, foto sayını və aktivliyini görməlidir. | Should | GIVEN owner panel açılıb, WHEN QR bölməsi yüklənir, THEN stand siyahısı və summary göstəriciləri görünməlidir. |

### 9.2 İstifadəçi giriş prosesi

| ID | Tələb | Təsvir | Prioritet | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| BRD-FR-005 | Sadə login/giriş | Müştəri paylaşım üçün sadə və təhlükəsiz login prosesindən keçməlidir. Mövcud kod Google Auth istifadə edir. | Must | GIVEN istifadəçi paylaşım etmək istəyir, WHEN auth tələb olunur, THEN Google login axını açılmalıdır. |
| BRD-FR-006 | Minimum profil tələbi | Paylaşım üçün tam profil forması tələb olunmamalıdır. | Must | GIVEN istifadəçi Google ilə daxil olur, WHEN upload edir, THEN sistem UID/email kimi minimum identifikasiya ilə paylaşımı saxlamalıdır. |
| BRD-FR-007 | Pending upload qorunması | Login redirect zamanı seçilmiş fayl və caption itirilməməlidir. | Should | GIVEN istifadəçi fayl seçib login-ə yönləndirilir, WHEN login tamamlanır, THEN pending upload bərpa olunmalıdır. |
| BRD-FR-008 | Təhlükəsiz sessiya idarəsi | Auth state və token refresh təhlükəsiz idarə olunmalıdır. | Must | GIVEN istifadəçi upload edir, WHEN sistem storage/database yazır, THEN aktiv Firebase auth token istifadə edilməlidir. |

### 9.3 Kontent paylaşımı

| ID | Tələb | Təsvir | Prioritet | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| BRD-FR-009 | Foto yükləmə | Müştəri image formatında foto yükləyə bilməlidir. | Must | GIVEN istifadəçi doğru formatda foto seçir, WHEN upload edir, THEN foto storage-a yüklənməli və gallery record yaradılmalıdır. |
| BRD-FR-010 | Video yükləmə | Müştəri video paylaşa bilməlidir. Mövcud kod yalnız image axınını təsdiqləyir; video ayrıca implementasiya tələb edir. | Future/Should | GIVEN video dəstəyi aktivdir, WHEN istifadəçi icazəli video seçir, THEN video optimizasiya olunub saxlanmalıdır. |
| BRD-FR-011 | Caption/vibe əlavə etmə | İstifadəçi paylaşımına qısa vibe/caption əlavə edə bilməlidir. | Must | GIVEN caption daxil edilib, WHEN paylaşım saxlanır, THEN caption sanitizasiya olunmuş formada media record-da görünməlidir. |
| BRD-FR-012 | Fayl validasiyası | Sistem file type, file size və image dimension limitlərini yoxlamalıdır. | Must | GIVEN fayl limitləri aşır və ya format uyğunsuzdur, WHEN upload cəhdi edilir, THEN istifadəçiyə aydın error göstərilməlidir. |
| BRD-FR-013 | Upload progress və error handling | Upload zamanı progress, status və xəta mesajları göstərilməlidir. | Must | GIVEN upload başlayıb, WHEN fayl yüklənir, THEN progress faizi və status mesajı yenilənməlidir. |
| BRD-FR-014 | Gallery görünüşü | Paylaşımlar məkan gallery-sində ən yeni paylaşımlar əsasında görünməlidir. | Must | GIVEN media record yaradılıb, WHEN gallery yüklənir, THEN həmin məkan üçün paylaşım siyahıda görünməlidir. |
| BRD-FR-015 | Like/share funksiyaları | İstifadəçi paylaşımı bəyənə və paylaşım linkini kopyalaya bilməlidir. | Should | GIVEN istifadəçi paylaşımı açır, WHEN like və ya share edir, THEN müvafiq sayğac və link axını işləməlidir. |
| BRD-FR-016 | Həftəlik upload limiti | Sistem spam riskini azaltmaq üçün istifadəçi/məkan üzrə upload limitini tətbiq etməlidir. | Should | GIVEN istifadəçi limitə çatıb, WHEN yeni upload edir, THEN sistem paylaşımı bloklayıb limit mesajı göstərməlidir. |

### 9.4 Kontent moderasiyası

| ID | Tələb | Təsvir | Prioritet | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| BRD-FR-017 | Paylaşımın təsdiqlənməsi | Məkan owner/admin paylaşımı public göstərilmədən əvvəl təsdiqləyə bilməlidir. Mövcud kodda ayrıca approval queue tam görünmür. | Should | GIVEN moderation mode aktivdir, WHEN yeni paylaşım gəlir, THEN status `pending` olmalı və təsdiqdən sonra public görünməlidir. |
| BRD-FR-018 | Paylaşımın silinməsi | Owner/admin və paylaşım sahibi icazə daxilində paylaşımı silə bilməlidir. | Must | GIVEN istifadəçinin silmə icazəsi var, WHEN delete təsdiqlənir, THEN storage faylı və database record silinməlidir. |
| BRD-FR-019 | Uyğunsuz kontentin bloklanması | Uyğunsuz kontent silinə, bloklana və ya public gallery-dən gizlədilə bilməlidir. | Must | GIVEN admin kontenti uyğunsuz hesab edir, WHEN bloklama/silmə əməliyyatı edir, THEN kontent public view-dan çıxmalıdır. |
| BRD-FR-020 | Report mexanizmi | İstifadəçilər uyğunsuz kontenti report edə bilməlidir. Mövcud kodda ayrıca report modeli görünmür. | Future/Should | GIVEN istifadəçi report düyməsini seçir, WHEN səbəb göndərilir, THEN report record yaradılıb adminə görünməlidir. |

### 9.5 Məkan idarəetməsi

| ID | Tələb | Təsvir | Prioritet | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| BRD-FR-021 | Məkan yaratma | Owner və ya platform admin yeni məkan/workspace yarada bilməlidir. | Must | GIVEN istifadəçinin owner access-i var, WHEN məkan yaradır, THEN `cafes/{slug}` və backend cafe record-u yaradılmalıdır. |
| BRD-FR-022 | Məkan profil məlumatları | Sistem məkan adı, logo/cover image, ünvan, email, telefon, website və brend rənglərini saxlamalıdır. | Must | GIVEN owner settings-i yeniləyir, WHEN save edir, THEN public məkan səhifəsində və admin paneldə yeni məlumat görünməlidir. |
| BRD-FR-023 | Sosial linklər və integrations | Məkan sosial linklər və integration ayarlarını idarə edə bilməlidir. Mövcud kodda integrations flags var, sosial URL-lər açıq sualdır. | Should | GIVEN sosial linklər konfiqurasiya olunub, WHEN public səhifə açılır, THEN həmin linklər düzgün göstərilməlidir. |
| BRD-FR-024 | Açılış saatları | Məkan açılış saatlarını saxlaya bilməlidir. Mövcud kodda tam model görünmür. | Future/Should | GIVEN açılış saatları daxil edilib, WHEN məkan səhifəsi açılır, THEN saatlar istifadəçiyə görünməlidir. |
| BRD-FR-025 | QR kod | Owner public gallery link və masa QR linkini əldə edə bilməlidir. | Must | GIVEN owner QR bölməsinə daxil olur, WHEN link generasiya olunur, THEN QR image və target URL uyğun olmalıdır. |
| BRD-FR-026 | Məkan statusu | Məkan active/inactive statusu dəstəklənməlidir. | Should | GIVEN məkan inactive edilib, WHEN müştəri QR açır, THEN sistem uyğun unavailable mesajı göstərməlidir. |

### 9.6 Admin panel

| ID | Tələb | Təsvir | Prioritet | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| BRD-FR-027 | Məkanların idarəsi | Platform admin bütün məkanları, owner-ləri və admin email-ləri idarə edə bilməlidir. | Must | GIVEN super admin daxil olub, WHEN owner access panel açılır, THEN owner email əlavə/silmə mümkündür. |
| BRD-FR-028 | İstifadəçilərin idarəsi | İstifadəçi, owner və manager rolları idarə olunmalıdır. | Should | GIVEN admin istifadəçi rolunu dəyişir, WHEN dəyişiklik saxlanır, THEN yeni icazələr tətbiq olunmalıdır. |
| BRD-FR-029 | Paylaşımların idarəsi | Admin paneldə kontent search, filter, sort və delete əməliyyatları olmalıdır. | Must | GIVEN admin gallery açıb, WHEN filter tətbiq edir, THEN uyğun paylaşımlar görünməlidir. |
| BRD-FR-030 | Statistikalar | Admin/owner paylaşım, like, view, QR, email və customer metrikalarını görə bilməlidir. | Must | GIVEN stats bölməsi açılıb, WHEN tarix aralığı seçilir, THEN KPI və trend dataları yenilənməlidir. |
| BRD-FR-031 | Sistem parametrləri | Settings bölməsi məkan, billing, security, domain və integration ayarlarını saxlamalıdır. | Must | GIVEN owner settings dəyişir, WHEN save edir, THEN backend və Firestore ayarları sinxron qalmalıdır. |

### 9.7 Email və bildirişlər

| ID | Tələb | Təsvir | Prioritet | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| BRD-FR-032 | Giriş/təsdiq email-ləri | Auth və owner access üçün email doğrulama və ya Google verified email məntiqi dəstəklənməlidir. | Should | GIVEN email verified deyil, WHEN admin panel açılır, THEN sistem uyğun giriş məhdudiyyəti və mesaj göstərməlidir. |
| BRD-FR-033 | Kafe sahibinə yeni paylaşım bildirişi | Yeni paylaşım olduqda kafe sahibinə bildiriş göndərilə bilməlidir. Mövcud settings-də notification flags var, tam notification flow açıq sualdır. | Future/Should | GIVEN notification aktivdir, WHEN yeni paylaşım gəlir, THEN owner email və ya panel notification almalıdır. |
| BRD-FR-034 | Admin bildirişləri | Admin paneldə dəyişiklik, yeni customer, upload və campaign hadisələri notification kimi görünməlidir. | Should | GIVEN yeni hadisə baş verir, WHEN admin panel açılır, THEN notification list-də hadisə görünməlidir. |
| BRD-FR-035 | Email automation | Mail plan aktivdirsə, email campaign, template, audience və unsubscribe funksiyaları işləməlidir. | Should | GIVEN mail plan aktivdir, WHEN owner email campaign göndərir, THEN campaign recipient-lərə queue vasitəsilə göndərilməlidir. |

### 9.8 Subscription/payment

| ID | Tələb | Təsvir | Prioritet | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| BRD-FR-036 | Plan seçimi | Sistem Standart və Mail planlarını aylıq/illik cycle ilə göstərməlidir. | Must | GIVEN istifadəçi pricing açır, WHEN plan seçir, THEN plan adı, dövrü və qiymət məlumatı görünməlidir. |
| BRD-FR-037 | Ödəniş statusu | Payment provider inteqrasiyası ilə subscription statusu saxlanmalıdır. Mövcud kodda tam payment flow görünmür. | Future | GIVEN payment tamamlanır, WHEN webhook gəlir, THEN məkan subscription statusu aktivləşməlidir. |
| BRD-FR-038 | Plan limitləri | Planlara görə mail, analytics, QR stand və customer limitləri tətbiq edilməlidir. | Should | GIVEN məkan Standart plandadır, WHEN mail marketing açılır, THEN sistem Mail plan tələbini göstərməlidir. |
| BRD-FR-039 | Trial period | Gələcəkdə trial period dəstəklənməlidir. | Future | GIVEN trial aktivdir, WHEN trial bitir, THEN sistem plan seçimi və payment tələb etməlidir. |
| BRD-FR-040 | Invoice/receipt | Ödənişdən sonra invoice/receipt yaradılmalıdır. | Future | GIVEN ödəniş uğurludur, WHEN billing record yaradılır, THEN invoice/receipt istifadəçiyə göndərilməlidir. |

## 10. Qeyri-funksional tələblər

### 10.1 Təhlükəsizlik

- Authentication Firebase Google Authentication və backend header-based identity mapping ilə qorunmalıdır. Production üçün Firebase JWT validation və ya verified token middleware tələb olunur.
- Authorization role-based access control üzərində qurulmalıdır: Platform Admin, Business Owner, Cafe Staff, Customer/User, Guest Visitor.
- Kafe sahibi yalnız öz məkanına aid kontenti və ayarları idarə etməlidir.
- Super admin bütün məkanlara, kontentə və owner access-lərə nəzarət edə bilməlidir.
- Input validation bütün user-generated field-lər üçün tətbiq olunmalıdır: cafe slug, caption, email, URL, file name.
- File upload yalnız icazə verilən format və ölçüdə qəbul edilməlidir. Mövcud storage rules image üçün max 8MB və metadata validation göstərir.
- Upload metadata uploader UID, cafe slug və timestamp ilə saxlanmalıdır.
- XSS qorunması üçün caption və HTML input-lar sanitizasiya edilməlidir.
- CSRF və request signing yanaşmaları admin/backend əməliyyatları üçün nəzərdən keçirilməlidir.
- Rate limiting upload, like, QR scan və API endpoint-lərində tətbiq edilməlidir.
- Admin access email allowlist və custom claims ilə gücləndirilməlidir.
- Sensitive data localStorage-da saxlanmamalı, token və auth state provider tərəfindən idarə edilməlidir.

### 10.2 Məxfilik və data qorunması

- İstifadəçi məlumatları minimum səviyyədə toplanmalıdır: UID, email, display name, interaction metadata.
- Müştəri razılığı olmadan email marketing listinə əlavə edilməməlidir.
- Foto/video kontent public gallery-də görünə biləcəyi üçün upload öncəsi consent text göstərilməlidir.
- Paylaşım edən istifadəçi kontentin məkan tərəfindən marketing məqsədi ilə istifadə oluna biləcəyini başa düşməlidir.
- Data retention policy müəyyən edilməlidir. Mövcud `.env.example` 7 günlük media retention parametrini göstərir, lakin biznes qərarı dəqiqləşdirilməlidir.
- İstifadəçi silinmə tələbi verə bilməlidir.
- GDPR uyğunluğu üçün consent, data access, data deletion, unsubscribe və data processing basis sənədləşdirilməlidir.
- Email unsubscribe public endpoint və token modeli qorunmalıdır.

### 10.3 Performans

- Public məkan səhifəsi mobil şəbəkədə sürətli açılmalıdır.
- Məqsəd: kritik public səhifələr üçün LCP 2.5 saniyədən aşağı, gallery initial render 3 saniyədən aşağı.
- Image upload client-side resize/compression ilə optimizasiya edilməlidir.
- Gallery lazy loading, thumbnail və pagination/infinite scroll strategiyası ilə böyüməyə hazırlanmalıdır.
- Firestore query-ləri məkan slug-ı və `createdAt` üzrə index-lənməlidir.
- Backend API response time hədəfi sadə GET endpoint-lər üçün p95 < 500ms, ağır analytics üçün p95 < 1500ms olmalıdır.
- Static assets CDN/cache headers ilə servis olunmalıdır.

### 10.4 Scalability

- Sistem multi-tenant SaaS modelinə uyğun olmalıdır: hər məkan ayrı `cafeSlug` və ya `cafeId` ilə ayrılmalıdır.
- Storage path-ləri məkan üzrə ayrılmalıdır: `media/{cafeSlug}/{fileName}`.
- Çoxsaylı upload-lar üçün queue, retry və storage lifecycle policy nəzərdən keçirilməlidir.
- Email göndərişləri BullMQ/Redis queue ilə idarə olunmalıdır.
- Database böyüməsi üçün index-lər, pagination və archival policy tələb olunur.
- Multi-location business account modelinə keçid üçün `businessAccount -> venues` arxitekturası planlaşdırılmalıdır.

### 10.5 Responsive UI

- Public QR axını mobile-first olmalıdır, çünki əsas istifadəçi telefondan gələcək.
- Upload modal, kamera/file picker və caption input mobil ekranlarda rahat işləməlidir.
- Admin panel desktop və tablet üçün optimizasiya olunmalı, mobil istifadə üçün əsas əməliyyatları dəstəkləməlidir.
- Text və düymələr kiçik ekranlarda daşmamalı, touch target-lər əlçatan olmalıdır.

### 10.6 Accessibility

- Mətn və background arasında oxunaqlı kontrast olmalıdır.
- Bütün əsas əməliyyat düymələrində accessible label və keyboard focus state olmalıdır.
- Form error-ları aydın və input-a yaxın göstərilməlidir.
- Şəkillər üçün alt text və dekorativ media üçün boş alt strategiyası tətbiq edilməlidir.
- Modal və popover-lər keyboard ilə bağlana və idarə oluna bilməlidir.

### 10.7 SEO və GEO

- Məkan səhifələri axtarış sistemləri üçün optimizasiya edilməlidir.
- Hər məkan üçün title, description, canonical və Open Graph metadata dinamik qurulmalıdır.
- Public gallery və cafe pages sitemap-a daxil edilməlidir.
- Admin, owner və API path-ləri indexing-dən çıxarılmalıdır.
- Local discovery üçün `CafeOrCoffeeShop` və `LocalBusiness` JSON-LD schema imkanları istifadə edilməlidir.
- ShareVibe domain discoverability üçün organization, website və product schema saxlanmalıdır.
- GEO baxımından məkan ünvanı, telefon, website və şəhər metadata-sı strukturlaşdırılmalıdır.

## 11. Rollar və icazələr

| Rol | İcazələr |
| --- | --- |
| Platform Admin | Bütün məkanları görmək və idarə etmək; owner access yaratmaq/silmək; bütün kontenti silmək/bloklamaq; settings, plans, analytics və campaign-lərə baxmaq; gələcək payment və subscription statuslarını idarə etmək. |
| Business Owner | Öz məkanını yaratmaq və idarə etmək; QR linkləri almaq; öz məkanına aid kontenti silmək/moderasiya etmək; campaign və reward ayarlarını dəyişmək; customer və analytics məlumatlarına baxmaq; plan seçimi və billing məlumatlarını idarə etmək. |
| Cafe Staff | Owner tərəfindən verilən məkanlarda gallery-yə baxmaq; kontenti silmək və ya moderasiya etmək; QR stand və campaign-ləri izləmək; məhdud settings dəyişmək. Kritik owner access və billing əməliyyatları məhdudlaşdırılmalıdır. |
| Customer/User | QR ilə məkan səhifəsinə daxil olmaq; login etmək; foto/vibe paylaşmaq; öz paylaşımını icazə müddəti daxilində silmək; paylaşımları bəyənmək və link paylaşmaq; report etmək. |
| Guest Visitor | Public məkan səhifəsini və gallery-ni görmək; QR ilə doğru məkana daxil olmaq; login tələb etməyən public məlumatları oxumaq. Upload, like və report üçün auth tələb oluna bilər. |

## 12. Data tələbləri

| Data obyekti | Əsas field-lər | Məqsəd | Status |
| --- | --- | --- | --- |
| User | `id`, `firebaseId`, `email`, `name`, `role`, `createdAt`, `updatedAt` | Authenticated istifadəçini və rolunu saxlamaq. | Mövcud backend schema |
| Venue / Cafe | `id/slug`, `name`, `ownerId/ownerEmail`, `isActive`, `supportEmail`, `createdAt`, `updatedAt` | Hər fiziki məkan üçün tenant və public profil bazası. | Mövcud Firestore və backend schema |
| CafeSettings | `businessName`, `sector`, `description`, `logoUrl`, `email`, `phone`, `address`, `website`, `language`, `timezone`, `primaryColor`, `billingPlan`, `adminEmails`, `integrations`, `security`, `extra` | Məkan profil, brend, domain, notification, billing və security ayarları. | Mövcud backend schema |
| Post / Vibe | `id`, `caption`, `cafeSlug`, `tableNumber`, `authorUid`, `status`, `createdAt`, `likesCount`, `shareCount` | Müştəri paylaşımının logical record-u. | Foto üçün mövcud, status/moderation genişləndirilməlidir |
| Media | `url`, `type`, `storagePath`, `fileSize`, `contentType`, `width`, `height`, `duration`, `thumbnailUrl` | Foto/video faylını və media metadata-sını saxlamaq. | Foto mövcud, video future |
| QR Code / QrStand | `id`, `cafeId`, `name`, `location`, `tableCount`, `status`, `publicUrl`, `photoCount`, `lastActivityAt` | Fiziki QR stand, masa qr və performans məlumatları. | Mövcud backend schema |
| Subscription Plan | `key`, `family`, `cycle`, `price`, `features`, `limits`, `mailIncluded`, `setupFee` | Paket və monetizasiya modelini saxlamaq. | Pricing config mövcud, payment future |
| Payment | `id`, `cafeId`, `provider`, `amount`, `currency`, `status`, `invoiceUrl`, `paidAt`, `createdAt` | Ödəniş və invoice lifecycle. | Future |
| Notification | `id`, `cafeId`, `type`, `title`, `body`, `readAt`, `createdAt`, `targetRole` | Owner/admin və customer bildirişləri. | Qismən UI səviyyəsində, persistent model açıqdır |
| Report | `id`, `mediaId`, `cafeId`, `reportedBy`, `reason`, `status`, `resolvedBy`, `createdAt` | Uyğunsuz kontent və abuse idarəetməsi. | Future |
| Admin Action Log | `id`, `actorId`, `actorRole`, `action`, `entityType`, `entityId`, `metadata`, `createdAt` | Audit, compliance və problem araşdırması. | Audit logger izləri mövcuddur, tam model dəqiqləşməlidir |
| Customer | `id`, `cafeId`, `email`, `name`, `phone`, `segment`, `tags`, `emailSubscribed`, `lastInteractionAt`, `metadata` | Email marketing, segmentation və loyalty üçün müştəri bazası. | Mövcud backend schema |
| Campaign | `id`, `cafeId`, `subject`, `description`, `imageUrl`, `htmlContent`, `textContent`, `status`, `scheduledAt`, `sentAt`, `recipientCount` | Public və email kampaniyalarının idarəsi. | Mövcud Firestore/backend |

## 13. Use Case-lər

### UC-001: QR ilə məkana daxil olmaq

- Use Case ID: UC-001
- Ad: QR ilə məkana daxil olmaq
- Actor: Customer/User, Guest Visitor
- Məqsəd: Müştərini doğru məkan və masa kontekstinə yönləndirmək.
- Precondition: Məkan və QR link mövcuddur.
- Main Flow: Müştəri QR oxudur; link açılır; sistem cafe slug və masa parametrini oxuyur; public məkan səhifəsi açılır.
- Alternative Flow: Slug tapılmırsa default və ya error state göstərilir.
- Postcondition: İstifadəçi doğru məkan gallery-sinə daxil olur.

### UC-002: Foto paylaşmaq

- Use Case ID: UC-002
- Ad: Foto paylaşmaq
- Actor: Customer/User
- Məqsəd: Müştərinin məkandan real foto/vibe paylaşması.
- Precondition: İstifadəçi məkan səhifəsindədir və upload üçün login edə bilir.
- Main Flow: Upload açılır; istifadəçi foto seçir; caption yazır; sistem validasiya edir; media storage-a yüklənir; record database-də saxlanır; gallery yenilənir.
- Alternative Flow: Fayl formatı səhvdirsə və ya limit aşılırsa error göstərilir.
- Postcondition: Foto məkan gallery-sində görünür və analytics/customer signal yaranır.

### UC-003: Video paylaşmaq

- Use Case ID: UC-003
- Ad: Video paylaşmaq
- Actor: Customer/User
- Məqsəd: Müştərinin qısa video paylaşması.
- Precondition: Video upload feature aktivdir və video format/size limitləri müəyyən edilib.
- Main Flow: İstifadəçi video seçir; sistem format və ölçünü yoxlayır; video storage-a yüklənir; thumbnail yaradılır; post gallery-də video kimi görünür.
- Alternative Flow: Video dəstəyi aktiv deyilsə, sistem yalnız foto qəbul etdiyini bildirir.
- Postcondition: Video paylaşım record-u yaradılır.
- Qeyd: Mövcud kodda video record-lar filter olunur və upload image ilə məhdud görünür; bu use case future/extension-dır.

### UC-004: Paylaşımı təsdiqləmək

- Use Case ID: UC-004
- Ad: Paylaşımı təsdiqləmək
- Actor: Business Owner, Cafe Staff, Platform Admin
- Məqsəd: Moderasiya aktiv olduqda yeni kontenti public etmədən əvvəl yoxlamaq.
- Precondition: Gallery moderation aktivdir və paylaşım `pending` statusdadır.
- Main Flow: Admin pending listi açır; kontenti yoxlayır; approve edir; sistem statusu `published` edir.
- Alternative Flow: Kontent uyğunsuzdursa reject/block edilir.
- Postcondition: Təsdiqlənmiş paylaşım public gallery-də görünür.

### UC-005: Paylaşımı silmək

- Use Case ID: UC-005
- Ad: Paylaşımı silmək
- Actor: Customer/User, Business Owner, Cafe Staff, Platform Admin
- Məqsəd: Uyğunsuz və ya istənməyən kontenti sistemdən silmək.
- Precondition: Actor-un silmə icazəsi var.
- Main Flow: Paylaşım seçilir; delete təsdiqi verilir; sistem storage faylını və database record-u silir.
- Alternative Flow: Storage silinməsi uğursuz olsa, database silinməsi və error logging siyasəti tətbiq olunur.
- Postcondition: Paylaşım public view-dan çıxır.

### UC-006: Məkan yaratmaq

- Use Case ID: UC-006
- Ad: Məkan yaratmaq
- Actor: Business Owner, Platform Admin
- Məqsəd: Yeni kafe/workspace yaratmaq.
- Precondition: Owner access və ya super admin icazəsi var.
- Main Flow: İstifadəçi owner/admin panelə daxil olur; kafe adı və slug daxil edir; sistem default settings yaradır; owner email bağlanır.
- Alternative Flow: Slug artıq varsa, sistem başqa slug tələb edir və ya mövcud məkanı açır.
- Postcondition: Məkan public link və settings ilə hazırdır.

### UC-007: QR kod almaq

- Use Case ID: UC-007
- Ad: QR kod almaq
- Actor: Business Owner, Cafe Staff
- Məqsəd: Məkan və masa/stand üçün QR kod əldə etmək.
- Precondition: Məkan mövcuddur.
- Main Flow: Owner QR bölməsinə daxil olur; sistem public gallery link və masa linkini göstərir; QR image generasiya edilir; owner QR stand sifarişi və ya print üçün link alır.
- Alternative Flow: QR API əlçatan deyilsə, sistem target URL-ni göstərir.
- Postcondition: Məkan daxilində istifadə üçün QR materialı hazır olur.

### UC-008: Adminin kontenti moderasiya etməsi

- Use Case ID: UC-008
- Ad: Adminin kontenti moderasiya etməsi
- Actor: Platform Admin
- Məqsəd: Bütün platformada uyğunsuz kontenti idarə etmək.
- Precondition: Platform admin authenticated və authorized olmalıdır.
- Main Flow: Admin paneldə gallery-ni açır; məkan və ya status üzrə filter edir; problemli kontenti silir/bloklayır; audit log yaranır.
- Alternative Flow: Kontent haqqında əlavə araşdırma lazımdırsa report statusu `reviewing` saxlanır.
- Postcondition: Platforma kontent keyfiyyəti və təhlükəsizliyi qorunur.

### UC-009: Kafe sahibinin statistikalara baxması

- Use Case ID: UC-009
- Ad: Kafe sahibinin statistikaya baxması
- Actor: Business Owner
- Məqsəd: Paylaşım və engagement performansını ölçmək.
- Precondition: Məkan active və owner access mövcuddur.
- Main Flow: Owner stats bölməsini açır; tarix aralığı seçir; sistem shares, views, likes, QR, customer və email metrikalarını göstərir.
- Alternative Flow: Backend analytics unavailable olarsa, frontend fallback media datalarından summary göstərir.
- Postcondition: Owner kampaniya və operational qərar üçün data görür.

### UC-010: İstifadəçinin uyğunsuz kontenti report etməsi

- Use Case ID: UC-010
- Ad: Uyğunsuz kontenti report etmək
- Actor: Customer/User, Guest Visitor
- Məqsəd: İstifadəçilərə problemli kontenti bildirmək imkanı vermək.
- Precondition: Report feature aktivdir.
- Main Flow: İstifadəçi report düyməsini seçir; səbəb daxil edir; sistem report record yaradır; admin paneldə review item görünür.
- Alternative Flow: Auth tələb olunursa, istifadəçi login-ə yönləndirilir.
- Postcondition: Report moderasiya queue-suna düşür.

### UC-011: Email kampaniya göndərmək

- Use Case ID: UC-011
- Ad: Email kampaniya göndərmək
- Actor: Business Owner, Cafe Staff
- Məqsəd: Məkan customer listinə kampaniya email-i göndərmək.
- Precondition: Məkan Mail planındadır və customer list mövcuddur.
- Main Flow: Owner template seçir; subject və content hazırlayır; audience seçir; send və ya schedule edir; sistem queue vasitəsilə email göndərir.
- Alternative Flow: Plan Mail deyil, sistem plan upgrade mesajı göstərir.
- Postcondition: Campaign status və delivery analytics yenilənir.

### UC-012: Plan seçmək

- Use Case ID: UC-012
- Ad: Subscription plan seçmək
- Actor: Business Owner
- Məqsəd: Məkan üçün uyğun planı seçmək.
- Precondition: Pricing və plan məlumatları mövcuddur.
- Main Flow: Owner planları görür; masa sayını seçir; sistem recurring və setup məbləğini hesablayır; owner WhatsApp/contact və ya gələcək checkout-a yönləndirilir.
- Alternative Flow: Payment inteqrasiyası aktiv deyilsə, manual sales flow işləyir.
- Postcondition: Plan seçimi sales və ya billing prosesinə ötürülür.

## 14. Acceptance Criteria

### AC-001: QR yönləndirmə

GIVEN istifadəçi məkan QR kodunu oxudub,  
WHEN sistem linki açır,  
THEN istifadəçi həmin məkana aid ShareVibe səhifəsinə yönləndirilməlidir.

### AC-002: Masa konteksti

GIVEN QR linkdə `table` və ya `masa` parametri var,  
WHEN istifadəçi foto paylaşır,  
THEN paylaşım record-u həmin masa/stand məlumatı ilə saxlanmalıdır.

### AC-003: Login

GIVEN istifadəçi paylaşım etmək istəyir və authenticated deyil,  
WHEN upload submit edir,  
THEN sistem onu login prosesinə yönləndirməli və login sonrası paylaşımı davam etdirməlidir.

### AC-004: Foto upload

GIVEN istifadəçi icazəli image formatında fayl seçib,  
WHEN upload tamamlanır,  
THEN fayl storage-da saxlanmalı, media record yaradılmalı və gallery yenilənməlidir.

### AC-005: File validation

GIVEN istifadəçi limitdən böyük və ya icazəsiz formatda fayl seçib,  
WHEN sistem faylı yoxlayır,  
THEN upload dayandırılmalı və aydın xəta mesajı göstərilməlidir.

### AC-006: Caption sanitization

GIVEN istifadəçi caption sahəsinə HTML və ya script xarakterli input daxil edib,  
WHEN paylaşım saxlanır,  
THEN sistem caption-u sanitizasiya etməli və zərərli markup saxlamamalıdır.

### AC-007: Gallery display

GIVEN məkan üçün yeni media record yaradılıb,  
WHEN istifadəçi həmin məkan gallery-sini açır,  
THEN paylaşım ən yeni kontent siyahısında görünməlidir.

### AC-008: Like

GIVEN authenticated istifadəçi paylaşımı görür,  
WHEN like düyməsinə basır,  
THEN `likedBy` və `likesCount` atomik şəkildə yenilənməlidir.

### AC-009: Share link

GIVEN istifadəçi paylaşım linkini kopyalamaq istəyir,  
WHEN share/copy action seçilir,  
THEN sistem media ID-li public link yaratmalı və clipboard-a yazmalıdır.

### AC-010: Kontent silmə

GIVEN owner/admin və ya paylaşım sahibi silmə icazəsinə malikdir,  
WHEN delete əməliyyatını təsdiqləyir,  
THEN media storage asset və database record silinməlidir.

### AC-011: Owner workspace

GIVEN verified owner access-ə malik istifadəçi owner portal-a daxil olur,  
WHEN yeni məkan yaradır,  
THEN məkan slug-ı, owner email-i və default settings saxlanmalıdır.

### AC-012: Settings update

GIVEN owner settings-də kafe adı, rəng və reward məlumatını dəyişir,  
WHEN save edir,  
THEN public məkan səhifəsi yenilənmiş məlumatı göstərməlidir.

### AC-013: QR dashboard

GIVEN owner QR bölməsini açır,  
WHEN QR stand data yüklənir,  
THEN total stands, total tables, active stands və public URL-lər görünməlidir.

### AC-014: Campaign

GIVEN owner campaign formunu doldurub,  
WHEN publish edir,  
THEN campaign public məkan səhifəsində aktiv kampaniya kimi görünməlidir.

### AC-015: Email plan guard

GIVEN məkan Standart plandadır,  
WHEN owner email marketing bölməsini açır,  
THEN sistem Mail plan tələbini göstərməli və email göndərişini bloklamalıdır.

### AC-016: Email campaign send

GIVEN məkan Mail plandadır və customer list mövcuddur,  
WHEN owner email campaign göndərir,  
THEN sistem recipient-ləri queue-ya əlavə etməli və statusları yeniləməlidir.

### AC-017: Analytics

GIVEN owner tarix aralığı seçir,  
WHEN stats dashboard yenilənir,  
THEN shares, likes, views, QR və customer metrikaları həmin aralığa görə hesablanmalıdır.

### AC-018: Report

GIVEN report funksiyası aktivdir,  
WHEN istifadəçi uyğunsuz kontenti report edir,  
THEN report admin review queue-da görünməlidir.

### AC-019: Payment future

GIVEN payment provider inteqrasiyası aktivdir,  
WHEN owner plan ödənişini tamamlayır,  
THEN subscription statusu aktiv olmalı və invoice record yaradılmalıdır.

## 15. Biznes qaydaları

- Hər QR kod yalnız bir məkan və lazım olduqda bir masa/stand kontekstinə bağlı olmalıdır.
- Müştəri yalnız icazə verilən media formatlarında paylaşım edə bilər.
- Mövcud implementasiyada foto formatları əsasdır; video üçün ayrıca limit, processing və storage policy müəyyən edilməlidir.
- Hər paylaşım mütləq `cafeSlug`, `authorUid`, `createdAt`, `caption` və media URL ilə saxlanmalıdır.
- Kafe sahibi yalnız öz məkanına aid kontenti və settings-i idarə edə bilər.
- Cafe Staff yalnız owner tərəfindən icazə verilən məkanlarda əməliyyat edə bilər.
- Platform Admin bütün məkan və kontentləri idarə edə bilər.
- Uyğunsuz kontent silinə, bloklana və ya public gallery-dən gizlədilə bilər.
- Müştərinin paylaşımı marketing məqsədi ilə istifadə olunacaqsa consent mətnində bu açıq bildirilməlidir.
- Upload limitləri spam və storage cost riskini azaltmaq üçün tətbiq olunmalıdır.
- Subscription planı olmayan və ya aşağı planlı məkan üçün bəzi funksiyalar limitli ola bilər.
- Mail marketing yalnız Mail inteqrasiyalı plan üçün aktiv olmalıdır.
- Email alıcıları unsubscribe olduqda onlara kampaniya email-i göndərilməməlidir.
- Admin əməliyyatları audit log-a yazılmalıdır.
- Public venue pages SEO üçün indexlənə bilər, admin/owner/API route-ları indexlənməməlidir.

## 16. Success Metrics / KPI-lar

| KPI | Təsvir | Məqsəd nümunəsi |
| --- | --- | --- |
| Aktiv məkan sayı | Platformada aktiv istifadə olunan məkanların sayı | Monthly active venues artımı |
| QR scan sayı | QR kodlardan gələn ziyarətlərin sayı | Məkan başına scan artımı |
| Upload sayı | Müştərilər tərəfindən yüklənən media sayı | Məkan başına aylıq kontent |
| Təsdiqlənmiş paylaşım sayı | Public görünən və ya approved statuslu paylaşım sayı | Moderasiya keyfiyyətini ölçmək |
| Müştəri engagement rate | Upload, like, share və campaign participation nisbəti | QR scan-dan upload-a conversion |
| Kafe başına aylıq kontent sayı | Hər məkan üzrə monthly media volume | Subscription value göstəricisi |
| Subscription conversion rate | Trial/contact lead-dən ödənişli plana keçid | Monetizasiya effektivliyi |
| Retention rate | Məkanların aylıq/illik qalma nisbəti | SaaS dayanıqlılığı |
| Page load time | Public məkan səhifəsinin yüklənmə müddəti | LCP və initial load hədəfi |
| Error rate | Upload, auth və API xətalarının nisbəti | Məhsul stabilitesi |
| Email delivery rate | Campaign email-lərinin uğurlu çatdırılma nisbəti | Mail plan keyfiyyəti |
| QR-to-upload conversion | QR scan edənlərdən paylaşım edənlərin faizi | Müştəri friction göstəricisi |
| Moderation response time | Report/pending kontentə cavab müddəti | Safety və brand protection |

## 17. Risklər və mitigasiya

| Risk | Təsir | Ehtimal | Mitigasiya |
| --- | --- | --- | --- |
| Uyğunsuz kontent paylaşılması | Brend reputasiyası və hüquqi risk | Orta | Moderasiya queue, report mexanizmi, admin delete/block, consent və community guidelines. |
| Böyük faylların performansa təsiri | Slow upload, storage cost və zəif UX | Yüksək | File size limit, image compression, video processing, lazy loading və CDN. |
| Məxfilik/GDPR problemləri | Hüquqi və reputasiya riski | Orta | Consent, privacy policy, data deletion, retention policy, unsubscribe və minimum data collection. |
| Spam upload | Storage cost və gallery keyfiyyəti azalır | Orta | Auth requirement, weekly limit, rate limiting, abuse detection və CAPTCHA lazım olduqda. |
| Kafe sahiblərinin sistemi aktiv istifadə etməməsi | Retention və revenue azalır | Orta | Onboarding, QR stand setup, email reminders, dashboard insights, campaign templates. |
| QR istifadəsində istifadəçi friction | QR scan-dan upload-a conversion aşağı düşür | Yüksək | Mobile-first UI, minimum login, pending upload, aydın CTA və sürətli page load. |
| Storage cost artımı | Marja azalır | Orta | Media optimization, retention policy, plan limitləri, archival və lifecycle rules. |
| Security zəiflikləri | Unauthorized access və data breach | Orta | Firebase rules, JWT validation, RBAC, audit log, security tests, secrets management. |
| Email deliverability problemi | Mail plan dəyəri azalır | Orta | Brevo/domain setup, unsubscribe compliance, bounce handling, rate limits. |
| Payment inteqrasiyasının gecikməsi | Monetizasiya manual qalır | Orta | İlk mərhələdə WhatsApp/manual sales, sonra Stripe/local provider roadmap. |
| Multi-tenant data leakage | Kritik etibar itkisi | Aşağı-Orta | Tenant scoping, automated tests, backend middleware, Firestore rules review. |

## 18. Fərziyyələr

- ShareVibe SaaS modelinə çevrilə bilər.
- Məkanlar QR kodu fiziki olaraq masa, stend, kassayanı və ya giriş sahəsində göstərəcək.
- Müştərilər əsasən mobil cihazdan istifadə edəcək.
- Kontent əvvəlcə sadə moderasiya prosesi ilə idarə olunacaq; avtomatik AI moderasiya gələcək mərhələdir.
- Payment/subscription gələcək mərhələdə genişləndirilə bilər.
- Foto paylaşımı MVP-nin əsas media formatıdır; video dəstəyi ayrıca texniki mərhələ tələb edir.
- Mail marketing premium modul kimi saxlanılacaq.
- Owner access Google verified email və ya platform admin allowlist əsasında veriləcək.
- QR stand setup ShareVibe tərəfindən manual və ya assisted onboarding kimi aparıla bilər.
- Public venue pages SEO üçün açıq olacaq, lakin bu qərar privacy və biznes strategiyasına görə dəqiqləşdirilməlidir.

## 19. Asılılıqlar

| Asılılıq | Təsvir |
| --- | --- |
| Hosting/deployment platforması | Mövcud sənədlərdə Firebase Hosting və VDS/Nginx deployment izləri var. Production strategiyası yekunlaşdırılmalıdır. |
| Database | Frontend real-time data üçün Firestore, backend CRM/email/analytics üçün PostgreSQL/Prisma. |
| Storage provider | Firebase Storage media faylları üçün istifadə olunur. Video üçün əlavə processing/CDN lazım ola bilər. |
| Email service | Brevo API, sender domain, unsubscribe və queue mexanizmi. |
| Payment provider | Stripe və ya lokal provider gələcək subscription/payment üçün seçilməlidir. |
| Domain/DNS | `sharevibe.co`, SSL, Cloudflare/DNS, canonical və sitemap setup. |
| Authentication sistemi | Firebase Auth, Google OAuth, future custom claims/JWT validation. |
| Media optimization tools | Client-side image compression, future video transcoding və thumbnail generation. |
| Redis/BullMQ | Email queue və scheduled campaign dispatch. |
| QR generation service | Mövcud kodda `api.qrserver.com` ilə QR image generasiya görünür; production üçün fallback strategiyası lazımdır. |
| Analytics tooling | Firebase/GA4, backend analytics dashboard və Core Web Vitals tracking. |

## 20. Açıq suallar

- İstifadəçi login prosesi tam olaraq hansı metodla olacaq: yalnız Google, magic link, phone OTP, yoxsa guest upload?
- Foto/video üçün maksimum fayl ölçüsü nədir? Foto üçün mövcud limit 8MB görünür; video üçün limit açıqdır.
- Paylaşımlar dərhal görünəcək, yoxsa əvvəlcə təsdiqlənəcək?
- Gallery moderation default olaraq aktiv olacaqmı?
- Kafe sahibi üçün hansı planlar olacaq və plan limitləri nədir?
- Ödəniş provider-i hansıdır?
- Trial period olacaqmı və müddəti neçə gün olacaq?
- GDPR consent necə göstəriləcək və harada saxlanacaq?
- Kontent nə qədər müddət saxlanacaq?
- İstifadəçi öz datasının silinməsini necə tələb edəcək?
- Public venue pages indexlənəcəkmi, yoxsa bəzi məkanlar private olacaq?
- Hər məkan üçün analytics hansı səviyyədə olacaq: basic KPI, campaign ROI, funnel, cohort?
- Video paylaşımı MVP-yə daxildir, yoxsa Phase 5-də əlavə olunacaq?
- Report/abuse workflow-da SLA və escalation qaydası necə olacaq?
- QR scan hadisəsi upload olmadan ayrıca track ediləcəkmi?
- Kafe işçiləri üçün granular permissions necə olacaq?
- Multi-location brendlər üçün data modeli necə qurulacaq?
- Email marketing üçün consent mənbəyi və double opt-in tələb olunacaqmı?

## 21. MVP roadmap

| Phase | Məqsəd | Əsas tasklar | Nəticə |
| --- | --- | --- | --- |
| Phase 1: Core QR + venue + upload flow | Müştərinin QR ilə məkan səhifəsinə daxil olub foto/vibe paylaşmasını stabil etmək. | Venue slug və table parametrləri; public gallery; Google login; foto upload; caption sanitization; storage/firestore rules; responsive mobile flow. | Əsas ShareVibe müştəri təcrübəsi işlək olur. |
| Phase 2: Admin panel + moderation | Məkan sahiblərinə kontent və məkan idarəetməsi vermək. | Owner/admin access; workspace yaratma; settings; gallery search/filter/delete; moderation status/approval queue; QR public linklər. | Məkan sahibi gündəlik kontent və profil idarə edə bilir. |
| Phase 3: Analytics + email notifications | Məkanlara ölçülə bilən dəyər və customer engagement qatını vermək. | Stats dashboard; QR stand dashboard; customer sync; email notification flags; basic email templates; campaign analytics. | Owner paylaşım və customer performance görə bilir. |
| Phase 4: Subscription/payment | SaaS monetizasiyanı tamamlamaq. | Plan limits; checkout; webhook; subscription status; invoice/receipt; trial; billing admin view. | Manual sales-dən self-service subscription modelinə keçid. |
| Phase 5: Advanced marketing tools | ShareVibe-i tam marketinq platformasına genişləndirmək. | Loyalty/reward engine; AI caption; social integrations; video upload; campaign automation; multi-location accounts; advanced reports. | Məhsul marketinq və loyalty platformasına çevrilir. |

## 22. Nəticə

ShareVibe fiziki məkanlarda yaranan real müştəri anlarını strukturlaşdırılmış, ölçülə bilən və marketinq məqsədi ilə istifadə edilə bilən rəqəmsal aktivə çevirən platformadır. Məhsulun əsas gücü QR ilə başlayan aşağı friction-lu paylaşım axını, məkanlara aid public gallery, owner/admin idarəetməsi, kampaniya/reward mexanizmi və gələcək SaaS monetizasiya potensialıdır.

Bu BRD development komandası üçün scope, funksional tələblər, data obyektləri, acceptance criteria və roadmap baxımından əsas istinad sənədi kimi istifadə olunmalıdır. Kod bazasında artıq mövcud olan foto upload, Firebase data modeli, admin panel, QR stand, email marketing və analytics hissələri məhsulun əsas istiqamətini təsdiqləyir. Video upload, payment, report workflow, consent management və advanced moderation kimi hissələr ayrıca planlaşdırılmalı və açıq suallar cavablandırıldıqdan sonra PRD/technical specification səviyyəsində detallandırılmalıdır.

## Changelog

| Tarix | Dəyişiklik | Fayl |
| --- | --- | --- |
| [YYYY-MM-DD] | ShareVibe üçün ilk tam Business Requirements Document yaradıldı. Sənədə məhsul xülasəsi, biznes problem, stakeholder/persona analizi, MVP/future scope, istifadəçi axınları, funksional və qeyri-funksional tələblər, rol/icazələr, data tələbləri, use case-lər, acceptance criteria, biznes qaydaları, KPI-lar, risklər, fərziyyələr, asılılıqlar, açıq suallar və MVP roadmap əlavə edildi. | `docs/BRD.md` |

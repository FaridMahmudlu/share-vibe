# Domain və Cloudflare Setup - Addım-Addım Rehberi

---

## 1️⃣ Domain Satın Alması

### Harada?
- **GoDaddy** (https://godaddy.com) - Başlanğıc, populyar
- **Namecheap** (https://namecheap.com) - Ucuz, yaxşı support
- **Reg.ru** (https://reg.ru) - CIS ölkələri üçün
- **Local Registry** - Azərbaycandan (.az domain)

### Qiymət?
- `.com` domain: $10-15/il
- `.az` domain: 30-50 AZN/il
- Whois Privacy: +$3-5/il (TOPSİYƏ)

### Mərhələlər?

**1. Domain Adını Seç**
```
sharevibe.com
şarevibe.az (əgər istəsən)
```

**2. Kart Əlavə Et & Satın Al**
```
Visa/Mastercard
PayPal (əgər mövcuddursa)
```

**3. Qeydiyyat Email-ə Bax**
```
Confirmation link-ə klik et
Hesab aktiv et
```

**4. Domain Provayderinə Daxil Ol**
```
https://godaddy.com (məsələn)
Hesabıma Daxil Ol → Domenlerim
```

---

## 2️⃣ Domain Nameservers Dəyişməsi

### DNS nədir?
DNS = Domain Name System (internetin "telefon kitabçası")
Domenin IP ünvanına işarət etməlidir.

### Nameservers Kim Təyin Edir?

| Seni | Nameservers | İstifadə olunur |
|------|------------|-----------------|
| **VDS Provayderiniz** | Ərəfəli (ns1.vds.com) | Əgər öz DNS-ə sahib olmaq istəsən |
| **Cloudflare** | ns1.cloudflare.com, ns2.cloudflare.com | **ƏN YAXŞ** (tövsiyyə) |
| **Domain Provayderiniz** | ns1.godaddy.com | Simbəl amma sürətli deyil |

### Adım-Adım: Cloudflare Nameservers Qur

**Mərhələ 1: Cloudflare-ə Qeydiyyat Yap**
1. https://cloudflare.com açın
2. **Sign Up** kliklə
3. Email və parol ilə qeydiyyat yap
4. Emailə doğrulama linki klik et

**Mərhələ 2: Domain Əlavə Et**
1. Cloudflare Panelində **Add a Site** kliklə
2. Domain adını yaz: `sharevibe.com`
3. **Free** planı seçin
4. **Next** kliklə
5. Nameservers-i kopyala:
```
ns1.cloudflare.com
ns2.cloudflare.com
```

**Mərhələ 3: Domain Provayderində Nameservers Dəyiş**

*GoDaddy üçün:*
1. godaddy.com-ə daxil ol
2. **My Products** → **Domains**
3. Domain adına kliklə
4. **DNS** kliklə
5. Nameservers bölməsində **Change**
6. Cloudflare nameservers-i yapışdır:
```
ns1.cloudflare.com
ns2.cloudflare.com
```
7. **Save** kliklə

*Namecheap üçün:*
1. namecheap.com-ə daxil ol
2. **Manage Domains**
3. Domain adı kliklə
4. **Nameservers** sekmə
5. "Custom" seçin
6. Cloudflare nameservers-i yapışdır
7. **Save** kliklə

**Mərhələ 4: Gözlə**
⏳ Nameservers yayılması: 24-48 saat

---

## 3️⃣ Cloudflare DNS Qurğusu

### DNS Records Əlavə Et

**Cloudflare Panelində:**
1. Domain adına kliklə
2. **DNS** sekmə
3. **Add Record** kliklə

**A Record (URL-i IP-ə bağla):**
```
Type: A
Name: sharevibe.com
IPv4 Address: YOUR_VDS_IP_ADDRESS (məs: 45.123.45.123)
TTL: Auto
Proxy: Proxied (Cloudflare arxası)
```

**Alternative - www üçün:**
```
Type: A
Name: www
IPv4 Address: YOUR_VDS_IP_ADDRESS
```

**Email üçün (MX Record - Opsional):**
```
Type: MX
Priority: 10
Mail Server: mail.sharevibe.com
```

---

## 4️⃣ Cloudflare SSL Qurğusu

### SSL Sertifikası Nədir?
SSL = Secure Socket Layer (HTTPS üçün)
Trafiqi şifrələyir, saytı təhlükəli göstərir.

### Cloudflare Automatic SSL

**Cloudflare ilə avtomatik:**
1. **SSL/TLS** sekmə kliklə
2. **Overview**
3. **Encryption mode:** "Full (Strict)" seçin

Cloudflare avtomatik sertifikat verəcəkdir ✅

### VDS-də SSL (əlavə təhlükəsizlik)

*Ubuntu/Nginx-də:*
```bash
apt install -y certbot python3-certbot-nginx
certbot certonly --nginx -d sharevibe.com -d www.sharevibe.com
```

---

## 5️⃣ Cloudflare Əlavə Ayarları

### Caching (Sürətləndir)

1. **Caching** sekmə
2. **Cache Level:** "Cache Everything"
3. **Browser Cache TTL:** 1 saat
4. **Rocket Loader:** Enabled

### Security (Hücumlara Qarşı)

1. **Security** sekmə
2. **Security Level:** "Medium"
3. **DDoS Protection:** Enabled
4. **WAF (Web Application Firewall):** Enabled
5. **Bot Management:** Enabled (Free plan-da məhdud)

### Performance (Performans)

1. **Speed** sekmə
2. **Optimization:**
   - Auto Minify: ✅ JavaScript, CSS, HTML
   - Brotli Compression: ✅
   - Early Hints: ✅

### Analytics (Statistika)

1. **Analytics** sekmə
2. Trafikini gör:
   - Requests sayı
   - Bandwidthi
   - Cache hit rate
   - Bot requests

---

## 6️⃣ Nameservers Yayılmasını Kontrol Et

### Online Tool ilə Yoxla:
https://whatsmydns.net

**Prosedur:**
1. whatsmydns.net açın
2. Domain adını yaz: `sharevibe.com`
3. Record type: "Nameservers"
4. "Search" kliklə
5. Haritada Cloudflare nameservers-i görməlisin

**Nəticə:**
```
✅ Hər yerdə ns1.cloudflare.com və ns2.cloudflare.com
```

---

## 7️⃣ Domneni VDS IP-ə Bağla - Yoxlama

### SSH ilə VDS-ə Bağlan:
```bash
ssh root@YOUR_VDS_IP
```

### Nginx Qurğusunda Domain Əlavə Et:
```bash
nano /etc/nginx/sites-available/sharevibe
```

Bu sətirləri tapdığından əmin ol:
```nginx
server_name sharevibe.com www.sharevibe.com;
```

### DNS Çözümlənməsini Test Et:
```bash
# Lokal maşındada:
nslookup sharevibe.com
# Nəticə: YOUR_VDS_IP olmalıdır

dig sharevibe.com
# Nəticə: ANSWER SECTION-də IP var
```

---

## 8️⃣ Yoxlama Siyahısı

- [ ] Domain satın alındı
- [ ] Cloudflare hesabı yaradıldı
- [ ] Domain Cloudflare-ə əlavə olundu
- [ ] Nameservers dəyişildi (Domain Provayderində)
- [ ] 24-48 saat gözlədi
- [ ] whatsmydns.net-də Cloudflare nameservers göründü
- [ ] A Record yaradıldı (Domain → VDS IP)
- [ ] SSL Mode "Full (Strict)" seçildi
- [ ] Nginx Server name dəyişildi
- [ ] `nslookup sharevibe.com` → VDS IP

---

## 🔟 Son Addım: Brauzer-də Test Et

```
https://sharevibe.com açın
```

**Görmə lazım olan şeylər:**
- ✅ Sayt yüklənir
- ✅ **URL** yeşil kilit ilə başlayır: 🔒
- ✅ Browser "Təhlükəsiz" deyir
- ✅ Saytın HTML yüklənir (Firebug → Network)

---

## 🆘 Problemlər

### Sayt açılmır / 404 hatası

**Səbəb 1:** DNS hələ yayılmamışdır
```bash
# Gözlə 24-48 saat
# whatsmydns.net-də yoxla
```

**Səbəb 2:** Nginx qurğusu yoxdur
```bash
# VDS-ə bağlan
ssh root@YOUR_VDS_IP

# Nginx status
systemctl status nginx

# Logs
tail -f /var/log/nginx/error.log
```

**Səbəy 3:** Nginx qurilması sıfırla
```bash
# /etc/nginx/sites-available/sharevibe yenidən yarat
# Bax: docs/VDS_SETUP_SCRIPTS.md (Nginx bölməsi)
```

### HTTPS işləmir / SSL Qırmızı Hatası

**Səbəb 1:** Cloudflare SSL Mode yanlış
```
Cloudflare → SSL/TLS → "Full (Strict)"
```

**Səbəb 2:** VDS-də sertifikat yoxdur
```bash
# Let's Encrypt-dən al
certbot certonly --nginx -d sharevibe.com
```

### Nameservers yayılmamışdır

```bash
# Domain provayderində yenidən yaz
# Gözlə 24-48 saat
# whatsmydns.net-də izlə
```

---

## 📞 Kömək Lazım Varsa

**Bir screenshot ver:**
1. Cloudflare DNS paneli (Records)
2. Domain Provayderiniz (Nameservers)
3. Browser konsolu (F12 → Console tab)
4. VDS error logs

Sonra kömək edərəm! ✅

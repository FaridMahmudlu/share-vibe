# ShareVibe Deployment Checklist - Həqiqi Deployment Sırası

Bu siyahı tam deployment prosesini təsvir edir. Sıra ilə edin!

---

## FAZA 1: HAZIRLIK (1-2 gün)

### ✅ Mərhələ 1: Domain Satın Al
- [ ] GoDaddy / Namecheap / Reg.ru-ya daxil ol
- [ ] Domain adını ara: `sharevibe.com` (yaxud alternativ)
- [ ] Satın al
- [ ] Confirmation email-ə bak
- [ ] Domain Provayderinin hesabına daxil ol

**Vaxt:** 30 dəqiqə  
**Qiymət:** $10-15

---

### ✅ Mərhələ 2: VDS Satın Al
- [ ] DigitalOcean / Linode / Vultr-a daxil ol
- [ ] Ubuntu 22.04 LTS seç
- [ ] Minimum qurğu: 2GB RAM, 2 CPU, 50GB SSD
- [ ] Satın al
- [ ] SSH credentials (IP, password/SSH key) kopyala

**Vaxt:** 15 dəqiqə  
**Qiymət:** $5-10/ay

---

### ✅ Mərhələ 3: Cloudflare Qurğusu
- [ ] Cloudflare.com-ə qeydiyyat yap
- [ ] Domain əlavə et
- [ ] Nameservers kopyala
- [ ] Domain Provayderində Nameservers dəyiş
- [ ] **48 SAAT GÖZLƏ** (DNS propagation)

**Vaxt:** 20 dəqiqə (+ 48 saat gözləmə)

---

## FAZA 2: VDS SETUP (2-3 saat)

### ✅ Adım 1: VDS-ə SSH Qoşul
```bash
ssh root@YOUR_VDS_IP_ADDRESS
# Parol daxil et
```

Nəticə: VDS terminal açılmalı

---

### ✅ Adım 2: Sistem Paketlərini Yükləyin
```bash
apt update && apt upgrade -y
apt install -y curl wget git nodejs npm nginx certbot python3-certbot-nginx ufw
```

Gözlə: 5-10 dəqiqə

---

### ✅ Adım 3: Firewall Qur
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

Nəticə: "Status: active" yazmalı

---

### ✅ Adım 4: ShareVibe Kodu Yüklə

**A) GitHub-dan (əgər kod GitHub-da varsa):**
```bash
cd /var/www
git clone https://github.com/yourusername/sharevibe.git
cd sharevibe
```

**B) Lokal Fayldan (lokal maşındada əmr ver):**
```bash
scp -r /path/to/sharevibe/* root@YOUR_VDS_IP:/var/www/sharevibe/
```

Nəticə: Kodlar /var/www/sharevibe/ -də olmalı

---

### ✅ Adım 5: `.env` Faylı Yaradın

VDS-ə bağlı vəziyyətdə:
```bash
cd /var/www/sharevibe

cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
VITE_FIREBASE_API_KEY=YOUR_API_KEY_HERE
VITE_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
EOF
```

**ÖNEMLİ:** Firebase dəyərləri `firebase-applet-config.json`-dən al!

---

### ✅ Adım 6: Asılılıqlar Yükləyin
```bash
npm install --production
```

Gözlə: 3-5 dəqiqə

---

### ✅ Adım 7: Production Build
```bash
npm run build
```

Nəticə: `dist/` qovluğu yaranmalı

---

### ✅ Adım 8: PM2 Qur

```bash
# PM2 yükləyin
npm install -g pm2

# Ecosystem config yaradın
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'sharevibe',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Başlat
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Kontrol:
```bash
pm2 status
```

Nəticə: `sharevibe` "online" olmalı

---

### ✅ Adım 9: Nginx Qur

```bash
cat > /etc/nginx/sites-available/sharevibe << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name sharevibe.com www.sharevibe.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Aktiv et
ln -s /etc/nginx/sites-available/sharevibe /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test et
nginx -t

# Başlat
systemctl restart nginx
```

---

## FAZA 3: SSL VƏ DOMAIN (30 dəqiqə)

### ✅ Adım 1: DNS Yayılmasını Yoxla

https://whatsmydns.net-ə daxil ol:
- Domain: `sharevibe.com`
- Record Type: "Nameservers"
- "Search" kliklə

**Axtarılan nəticə:**
```
✅ ns1.cloudflare.com
✅ ns2.cloudflare.com
```

**Əgər hələ göstərilmirsə:** 24 saat daha gözlə!

---

### ✅ Adım 2: DNS A Record Yaradın

Cloudflare Panelində:
1. **DNS** sekmə
2. **Add Record**
```
Type: A
Name: sharevibe.com
IPv4 Address: YOUR_VDS_IP
TTL: Auto
Proxy: Proxied
```
3. **Save**

---

### ✅ Adım 3: SSL Sertifikası Al

VDS-ə bağlı vəziyyətdə:
```bash
certbot certonly --nginx -d sharevibe.com -d www.sharevibe.com
```

Əməkdaşlıq et (E əmri ilə):
- Email əlavə et
- Şərtləri qəbul et
- "No redirect" seçin

---

### ✅ Adım 4: Nginx SSL ilə Qur

```bash
cat > /etc/nginx/sites-available/sharevibe << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name sharevibe.com www.sharevibe.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sharevibe.com www.sharevibe.com;

    ssl_certificate /etc/letsencrypt/live/sharevibe.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sharevibe.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Test et
nginx -t

# Başlat
systemctl restart nginx
```

---

### ✅ Adım 5: Cloudflare SSL Mode Qur

Cloudflare Panelində:
1. **SSL/TLS** sekmə
2. **Overview**
3. **Encryption Mode:** "Full (Strict)" seçin

---

## FAZA 4: TESTS (15 dəqiqə)

### ✅ Test 1: Domain Açılmaqda
```
https://sharevibe.com
```

Görmə lazım olan:
- ✅ Sayt yüklənir
- ✅ 🔒 Yeşil kilit (SSL çalışır)
- ✅ "Təhlükəsiz" yazısı

---

### ✅ Test 2: VDS Serveri Yoxla
```bash
pm2 status
curl http://localhost:3000
```

Nəticə: Saytın HTML code-u görməli

---

### ✅ Test 3: Browser Konsolu Yoxla

https://sharevibe.com açın:
1. F12 kliklə
2. **Console** sekmə
3. **Qırmızı xətalar yoxdur** olmalı

---

### ✅ Test 4: Google Speed Test
```
https://pagespeed.web.dev/
```

URL: sharevibe.com  
Axtarılan nəticə: 80+ (Desktop)

---

## FAZA 5: SETUP SETUP SONRASI (1 gün)

### ✅ Google Search Console
1. https://search.google.com/search-console
2. Domain əlavə et: sharevibe.com
3. Sitemap əlavə et: /sitemap.xml
4. Robots.txt yoxla

---

### ✅ Google Analytics 4
1. https://analytics.google.com
2. Yeni property yarat
3. Measurement ID kopyala
4. index.html-də əlavə et:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX"></script>
```

---

### ✅ Monitoring Qur

```bash
# Daily backup
0 2 * * * tar -czf /backups/sharevibe-$(date +\%Y-\%m-\%d).tar.gz /var/www/sharevibe

# Disk yerdə izlə
df -h

# Trafikə bax
vnstat -m

# CPU/RAM
htop
```

---

## ✅ FINAL CHECKLIST

- [ ] Domain satın alındı
- [ ] VDS satın alındı
- [ ] Cloudflare hesabı yaradıldı
- [ ] Nameservers dəyişildi
- [ ] DNS yayıldı (whatsmydns.net)
- [ ] SSH qoşulma işlədi
- [ ] Sistem paketləri yüklü
- [ ] ShareVibe kodu /var/www/-ə yüklü
- [ ] `.env` faylı Firebase dəyərləri ilə
- [ ] npm install tamamlandı
- [ ] npm run build uğurlu
- [ ] PM2 serveri "online"
- [ ] Nginx qurğu ilə
- [ ] SSL sertifikası mövcud
- [ ] Firewall açıq (22, 80, 443)
- [ ] https://sharevibe.com açılır ✅
- [ ] Browser-də hata yoxdur ✅
- [ ] Google Speed Test 80+
- [ ] Google Search Console qurğu
- [ ] Google Analytics 4 qurğu

---

## 🎉 DEPLOYMENT TAMAMLANDI!

Maraqlı tərəflər:
1. Fotoğraf yüklə
2. Sosial media-da paylaş
3. Saytın performansını izlə

**İlk 2 həftə:** SEO monitoring, xətaları düzəlt, traffic izlə
**1-2 aydan sonra:** Ranking artacaq, backlinks əlavə et

---

## 🆘 EMERGENCIES

**Sayt yoxdur:**
```bash
ssh root@YOUR_VDS_IP
pm2 status
pm2 logs sharevibe
systemctl status nginx
```

**Yavaş sayt:**
```bash
pm2 monit
top
free -h
```

**Error Logu:**
```bash
tail -f /var/log/nginx/error.log
pm2 logs sharevibe --lines 100
```

---

Sualı var? Screenshot + xəta mesajı göndər! 📸

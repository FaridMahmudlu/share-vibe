# VDS Setup Skriptləri - ShareVibe Deployment

Bu faylda bütün VDS setup əmrləri hazırlanmışdır. Sırasında kopyala-yapışdır!

---

## 1️⃣ İlkin VDS Setup (Ubuntu 22.04)

### Adım 1: SSH-ə Bağlan
```bash
ssh root@YOUR_VDS_IP_ADDRESS
# Parol və ya SSH key daxil et
```

### Adım 2: Sistem Yenilə
```bash
apt update && apt upgrade -y
```

### Adım 3: Lazım Paketlər Yükləyin
```bash
apt install -y curl wget git nodejs npm nginx certbot python3-certbot-nginx ufw
```

### Adım 4: Node.js Versiyasını Yoxla
```bash
node -v
npm -v
```

**Nəticə:** v18+ olmalıdır. Əgər daha eski versiyada:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
```

---

## 2️⃣ Firewall Qurğusu

```bash
# SSH, HTTP, HTTPS açın
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Firewall aktiv edin
ufw enable
ufw status
```

---

## 3️⃣ ShareVibe Kodu VDS-ə Deploy Et

### Adım 1: Qovluq Yaradın
```bash
mkdir -p /var/www/sharevibe
cd /var/www/sharevibe
```

### Adım 2: Kodu Yüklə (GitHub-dan)
```bash
# Əgər GitHub-da var:
git clone https://github.com/yourusername/sharevibe.git .

# YOXSA lokal maşından SCP ilə:
# (Lokal terminaldən əmr ver):
# scp -r /path/to/sharevibe/* root@YOUR_VDS_IP:/var/www/sharevibe/
```

### Adım 3: Asılılıqlar Yükləyin
```bash
cd /var/www/sharevibe
npm install --production
```

### Adım 4: `.env` Faylı Yaradın
```bash
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
EOF
```

**⚠️ ÖNEMLİ:** Firebase dəyərləri `firebase-applet-config.json`-dən kopyala!

### Adım 5: Production Build Et
```bash
npm run build
```

---

## 4️⃣ PM2 ilə Serveri Qoş

### Adım 1: PM2 Yükləyin
```bash
npm install -g pm2
```

### Adım 2: Ecosystem Config Yaradın
```bash
cat > /var/www/sharevibe/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'sharevibe',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/sharevibe-error.log',
    out_file: '/var/log/sharevibe-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF
```

### Adım 3: PM2-ni Başlat
```bash
cd /var/www/sharevibe
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Adım 4: Serverin İşləyib-işləmədiyini Yoxla
```bash
pm2 status
pm2 logs sharevibe --lines 20
```

---

## 5️⃣ Nginx Reverse Proxy Qurğusu

### Adım 1: Nginx Config Yaradın
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
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 50M;
}
EOF
```

### Adım 2: Qurğuyu Aktiv Et
```bash
ln -s /etc/nginx/sites-available/sharevibe /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

---

## 6️⃣ SSL Sertifikası (Let's Encrypt)

### Adım 1: DNS Əvvəl Məvcud Olmalıdır!
⚠️ **ÖNEMLİ:** Domeiniz DNS-ə bağlı olmalı və YOUR_VDS_IP-ə işarət etməlidir!

### Adım 2: SSL Sertifikası Al
```bash
certbot certonly --nginx -d sharevibe.com -d www.sharevibe.com
```

### Adım 3: Nginx Config Yenilə (SSL ilə)
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
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 50M;
}
EOF
```

### Adım 4: Nginx Yenidən Başlat
```bash
nginx -t
systemctl restart nginx
```

### Adım 5: SSL Renewal Otomatik Et
```bash
certbot renew --dry-run
```

---

## 7️⃣ Cloudflare Qurğusu (Opsional lakin tövsiyyə olunur)

### Adım 1: Cloudflare-ə Daxil Ol
1. https://cloudflare.com → Sign Up
2. Domain əlavə et: `sharevibe.com`

### Adım 2: Nameservers Dəyiş
**Domain Provayderinə daxil olun** (GoDaddy, Namecheap, vb):
```
ns1.cloudflare.com
ns2.cloudflare.com
```

### Adım 3: Cloudflare Ayarları
- **DNS:** A Record → `sharevibe.com` → `YOUR_VDS_IP`
- **SSL/TLS:** "Full (Strict)" seçin
- **Caching:** Rules → HTML cache 1 saat
- **Security:** DDoS protection aktiv

---

## 8️⃣ Monitoring və Logs

### Status Yoxla
```bash
# PM2 serveri
pm2 status

# Nginx
systemctl status nginx

# Logs
pm2 logs sharevibe --lines 50
tail -f /var/log/nginx/error.log
```

### Restart (Lazım olarsa)
```bash
pm2 restart sharevibe
systemctl restart nginx
```

---

## 9️⃣ Database Backup (Əgər Local DB var)

```bash
# Hər gün backup al
0 2 * * * /usr/local/bin/backup-sharevibe.sh

# Backup script:
cat > /usr/local/bin/backup-sharevibe.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/backups/sharevibe"
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/sharevibe-$DATE.tar.gz /var/www/sharevibe
find $BACKUP_DIR -type f -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-sharevibe.sh
```

---

## 🔟 Yoxlama Siyahısı

- [ ] SSH qoşulma işləyir
- [ ] Node.js v18+ yüklü
- [ ] Firewall açıq (22, 80, 443)
- [ ] ShareVibe kodu VDS-ə yüklü
- [ ] `.env` faylı Firebase dəyərləri ilə
- [ ] `npm install` tamamlandı
- [ ] `npm run build` uğurlu oldu
- [ ] PM2 serveri işləyir
- [ ] Nginx konfigurə edildi
- [ ] SSL sertifikası quruldu
- [ ] Domain DNS-ə bağlı
- [ ] https://sharevibe.com açılır ✅

---

## 🆘 Sık Problêmlər

**Problêm:** 502 Bad Gateway
```bash
pm2 logs sharevibe
# Xəta nədir kontrol et
pm2 restart sharevibe
```

**Problêm:** SSL sertifikası yoxdur
```bash
certbot renew --force-renewal
systemctl restart nginx
```

**Problêm:** Sayt yavaş
```bash
# Nginx caching yoxla
# PM2 qalxanları yoxla
pm2 monit
```

**Problêm:** Node modulu tapılmır
```bash
npm install --production
npm run build
pm2 restart sharevibe
```

---

## 📞 Kömək Lazım Varsa

Her problemin üçün screenshot + error message göndər!

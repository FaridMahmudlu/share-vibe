# Kod Dəyişikliyi Sonrası Deploy

## 3 Addım - Sadə və Qısa

### 1️⃣ Kodu dəyiş
Hər hansı faylda dəyişiklik et və sax.

### 2️⃣ Deploy script çalıştır

**Windows:**
```powershell
AUTOMATIC_DEPLOY.bat
```

**macOS/Linux:**
```bash
npm run build && bash deploy.sh
```

### 3️⃣ Şifrə daxil et
```
root@185.34.101.235's password: [ŞİFRƏ]
```

---

## Avtomatik olaraq baş verən işlər
✅ Kod compile edilir  
✅ Serverə yüklənir  
✅ Nginx restart olur  
✅ Site live olur  

**Vaxt:** ~30 saniyə

---

## Nəticə
https://sharevibe.co update olur

---

**Hər dəfə bu 3 addımı təkrar et.**

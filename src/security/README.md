# Security Protections - SQL Injection, XSS, CSRF

## ✅ Hazır Olan Əsas 3 Qoruma

### 1️⃣ **XSS (Cross-site Scripting) Qoruması** ✅

**Fayllar:**
- `src/security/browser.ts` → `XSSProtection` class
- `src/security/validation.ts` → Sanitization functions

**Istifadə:**

```typescript
import { XSSProtection } from '@/security/browser';
import { sanitizeHTML, escapeHtml } from '@/security/validation';

// Option 1: HTML-i təmizlə (təxlikəli tagları sil)
const cleanCaption = sanitizeHTML(userInput);

// Option 2: HTML-i escapelədi (< → &lt; kimi)
const safeName = escapeHtml(userInputName);

// Option 3: Təhlükəli olub-olmadığını yoxla
if (XSSProtection.isSafeHtml(userContent)) {
  // Təhlükəsiz, istifadə et
}
```

**Nə qoruyur:**
```html
<!-- ❌ TƏHLÜKƏLI: Script inject edilə bilər -->
<input value=""><script>alert('Hacked!')</script>

<!-- ✅ TƏHLÜKƏSİZ: Script siliər -->
After XSSProtection → value is sanitized, no script runs
```

---

### 2️⃣ **SQL Injection Qoruması** ✅

**Fayllar:**
- `src/security/validation.ts` → `Validator` class
- `src/security/browser.ts` → `InputValidation` helpers

**Istifadə:**

```typescript
import { Validator, validateAndSanitizeCafeSlug } from '@/security/validation';

// Option 1: Firestore sorğu üçün təmizlə
const cafeSlug = validateAndSanitizeCafeSlug(userInput);
// "'; DROP TABLE media; --" → null (təhlükəli rədd edilir)

// Option 2: Validator ilə pattern yoxla
const validator = new Validator();
validator.validateField('email', userEmail, 'email');
if (validator.isValid()) {
  // Email düzgündür
}

// Option 3: Batch validation
const result = validateBatch(userData, {
  cafeSlug: 'cafeSlug',
  tableName: 'tableNumber',
  email: 'email'
});
```

**Nə qoruyur:**
```javascript
// ❌ TƏHLÜKƏLI: Firestore injection
const cafeSlug = "'; DROP TABLE media; --";
query(collection(db, 'media'), where('slug', '==', cafeSlug))
// Bütün media silinə bilər!

// ✅ TƏHLÜKƏSİZ: Validator rədd edir
const cleanSlug = validateAndSanitizeCafeSlug(cafeSlug);
// Returns: null (təhlükəli olduğu üçün)
```

---

### 3️⃣ **CSRF (Cross-Site Request Forgery) Qoruması** ✅

**Fayllar:**
- `src/security/browser.ts` → `CSRFProtection` class
- `src/security/requestSigning.ts` → Token validation

**Istifadə:**

```typescript
import { CSRFProtection } from '@/security/browser';

// CSRF token yaratıcı
const csrf = new CSRFProtection();

// Token əldə et
const token = csrf.getToken();

// Token ilə fetch et (avtomatik header əlavə edir)
const response = await csrf.addTokenToFetch({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mediaId: '123' })
});

// Yaxud direct:
const headers = csrf.addTokenToFetch();
// Returns: { headers: { 'X-CSRF-Token': 'abc123...' } }
```

**Nə qoruyur:**
```html
<!-- ❌ CSRF ATTACK: Şər məqsədli sayt sənin əməlini yerinə yetirir -->
<img src="https://app.com/delete?mediaId=123">
<!-- Sən login olmussan, media silinir! -->

<!-- ✅ TƏHLÜKƏSİZ: CSRF token lazımdır -->
X-CSRF-Token header-ı olmadığı üçün sorğu rədd edilir
```

---

## 🔧 React Komponentin Daxilində İstifadə

### Formu Qorumaq:

```typescript
import React, { useState } from 'react';
import { validateAndSanitizeCaption, XSSProtection } from '@/security/browser';
import { CSRFProtection } from '@/security/browser';

export function UploadForm() {
  const [caption, setCaption] = useState('');
  const csrf = new CSRFProtection();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. XSS qoruması: Caprioni təmizlə
    const cleanCaption = sanitizeHTML(caption);

    // 2. Input validation: Boş deyil mi?
    if (!cleanCaption.trim()) {
      alert('Caption boş ola bilməz');
      return;
    }

    // 3. CSRF qoruması: Token ilə göndər
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf.getToken(), // CSRF token
        },
        body: JSON.stringify({
          caption: cleanCaption, // XSS-dən təmizlənmiş
        }),
      });

      const data = await response.json();
      console.log('Uğurla yükləndi:', data);
    } catch (error) {
      console.error('Xəta:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption yaz..."
      />
      <button type="submit">Yükləyin</button>
    </form>
  );
}
```

---

## 📋 Qoruma Matriksi

| Təhlükə | Modulu | Funksiya | Status |
|---------|--------|----------|--------|
| **XSS** | `browser.ts` | `XSSProtection.sanitizeText()` | ✅ |
| **XSS** | `validation.ts` | `sanitizeHTML()` | ✅ |
| **XSS** | `browser.ts` | `setupCSPMetaTag()` | ✅ |
| **SQL Injection** | `validation.ts` | `Validator.validate()` | ✅ |
| **SQL Injection** | `validation.ts` | `validateAndSanitizeCafeSlug()` | ✅ |
| **Firestore Injection** | `validation.ts` | Input sanitization | ✅ |
| **CSRF** | `browser.ts` | `CSRFProtection` | ✅ |
| **CSRF** | `requestSigning.ts` | Request signing | ✅ |

---

## 🚀 Tətbiq (Implementation) Qaydası

### Adım 1: Browser Security-ni Başlat (`src/main.tsx`)
```typescript
import { initializeBrowserSecurity } from '@/security/browser';

initializeBrowserSecurity(); // Uygulamada başlat
```

### Adım 2: Form Komponentlərində İstifadə Et
```typescript
import { validateAndSanitizeCaption } from '@/security/validation';
import { CSRFProtection } from '@/security/browser';

// Formada:
const cleanInput = validateAndSanitizeCaption(userInput);
const csrf = new CSRFProtection();
```

### Adım 3: API Çağrılarında Token Göndər
```typescript
fetch('/api/delete', {
  method: 'DELETE',
  headers: {
    'X-CSRF-Token': csrf.getToken(),
    'X-Signature': signature, // İstəkləmə imzası
  },
  body: JSON.stringify({ mediaId: '123' })
});
```

---

## 🧪 Test Etmə

### XSS-i Test Et:
```typescript
import { XSSProtection } from '@/security/browser';

// Bu təhlükəli olmalıdır
const dangerous = "<script>alert('XSS')</script>";
console.log(XSSProtection.sanitizeText(dangerous)); 
// Output: "" (script silinir)
```

### SQL Injection-i Test Et:
```typescript
import { validateAndSanitizeCafeSlug } from '@/security/validation';

// Bu rədd edilməlidir
const injection = "'; DROP TABLE --";
const result = validateAndSanitizeCafeSlug(injection);
console.log(result); // null (təhlükəli rədd edilir)
```

### CSRF-i Test Et:
```typescript
import { CSRFProtection } from '@/security/browser';

const csrf = new CSRFProtection();
const token1 = csrf.getToken();
const token2 = csrf.getToken();
console.log(token1 === token2); // true (eyni token)
```

---

## 📚 Əlavə Məlumat

Bütün kodlar burada:
- `src/security/validation.ts` - Validation & sanitization
- `src/security/browser.ts` - XSS, CSRF, Rate limiting
- `src/security/configuration.ts` - CSP setup
- `docs/SECURITY_IMPLEMENTATION.md` - Dərin ətraflı sənəd

Başqa suallarınız olsa, soruşun! 🚀

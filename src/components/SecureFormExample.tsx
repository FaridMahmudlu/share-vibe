/**
 * Secure Form Component Example
 * XSS + SQL Injection + CSRF Qoruması
 */

import React, { useState } from 'react';
import {
  validateAndSanitizeCaption,
  validateAndSanitizeCafeSlug,
} from '../security/validation';
import { XSSProtection, CSRFProtection } from '../security/browser';

interface SecureFormProps {
  onSubmit?: (data: { cafeSlug: string; caption: string }) => void;
  isLoading?: boolean;
}

export const SecureFormExample: React.FC<SecureFormProps> = ({
  onSubmit,
  isLoading = false,
}) => {
  const [cafeSlug, setCafeSlug] = useState('');
  const [caption, setCaption] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');

  // CSRF token manager
  const csrf = new CSRFProtection();

  /**
   * Form validation və sanitization
   * ✅ XSS Qoruması: HTML tagları silirik
   * ✅ SQL Injection Qoruması: Pattern validation ilə
   * ✅ CSRF Qoruması: Token kontrol edirik
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');

    // 1️⃣ XSS QORUMASI - Caption-u təmizlə
    // "<script>alert('hack')</script>" → "" (script silinir)
    const cleanCaption = validateAndSanitizeCaption(caption);
    if (!cleanCaption) {
      setErrors((prev) => ({
        ...prev,
        caption: 'Caption həm boş, həm də təhlükəli olur',
      }));
      return;
    }

    // 2️⃣ SQL INJECTION QORUMASI - Cafe slug-u validate et
    // "'; DROP TABLE media; --" → null (rədd edilir)
    const cleanCafeSlug = validateAndSanitizeCafeSlug(cafeSlug);
    if (!cleanCafeSlug) {
      setErrors((prev) => ({
        ...prev,
        cafeSlug: 'Cafe slug yalnız hərflər, rəqəmlər, tire ilə olmalıdır',
      }));
      return;
    }

    try {
      // 3️⃣ CSRF QORUMASI - Token ilə sorğu yolla
      // Server token olmadan sorğu rədd edir
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf.getToken(), // ← CSRF Token
        },
        body: JSON.stringify({
          cafeSlug: cleanCafeSlug, // ← Sanitized
          caption: cleanCaption, // ← Sanitized
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      setSuccess('✅ Məlumatlar təhlükəli şəkildə yükləndi!');

      // Forma sıfırla
      setCafeSlug('');
      setCaption('');

      if (onSubmit) {
        onSubmit({ cafeSlug: cleanCafeSlug, caption: cleanCaption });
      }
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        submit: error instanceof Error ? error.message : 'Xəta baş verdi',
      }));
    }
  };

  /**
   * Real-time XSS Detection
   * Təhlükəli input yazdıqca xəbər ver
   */
  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCaption(value);

    // Təhlükəli olub-olmadığını kontrol et
    if (!XSSProtection.isSafeHtml(value)) {
      console.warn('⚠️ XSS Risk Detected:', value);
    }
  };

  /**
   * Real-time SQL Injection Detection
   */
  const handleCafeSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCafeSlug(value);

    // Təhlükəli pattern-i araştır
    if (/[;'"\\]/.test(value)) {
      console.warn('⚠️ SQL Injection Risk Detected:', value);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto' }}>
      <h2>🔒 Təhlükəsiz Form</h2>
      <p style={{ color: '#666', fontSize: '14px' }}>
        XSS + SQL Injection + CSRF qoruması aktivdir
      </p>

      {success && (
        <div
          style={{
            padding: '12px',
            marginBottom: '12px',
            backgroundColor: '#d4edda',
            color: '#155724',
            borderRadius: '4px',
          }}
        >
          {success}
        </div>
      )}

      {errors.submit && (
        <div
          style={{
            padding: '12px',
            marginBottom: '12px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
          }}
        >
          ❌ {errors.submit}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Cafe Slug - SQL Injection Qoruması */}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="cafeSlug" style={{ display: 'block', marginBottom: '4px' }}>
            Cafe Slug (SQL Injection Qoruması):
          </label>
          <input
            id="cafeSlug"
            type="text"
            value={cafeSlug}
            onChange={handleCafeSlugChange}
            placeholder="my-awesome-cafe"
            style={{
              width: '100%',
              padding: '8px',
              border: errors.cafeSlug ? '2px solid red' : '1px solid #ccc',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
          />
          {errors.cafeSlug && (
            <small style={{ color: 'red' }}>{errors.cafeSlug}</small>
          )}
          <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
            ✅ Yalnız: hərflər (a-z), rəqəmlər (0-9), tire (-)
          </small>
        </div>

        {/* Caption - XSS Qoruması */}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="caption" style={{ display: 'block', marginBottom: '4px' }}>
            Caption (XSS Qoruması):
          </label>
          <textarea
            id="caption"
            value={caption}
            onChange={handleCaptionChange}
            placeholder="Foto haqqında comment yaz... (Script-lər siliəcək)"
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '8px',
              border: errors.caption ? '2px solid red' : '1px solid #ccc',
              borderRadius: '4px',
              boxSizing: 'border-box',
              fontFamily: 'Arial, sans-serif',
            }}
          />
          {errors.caption && (
            <small style={{ color: 'red' }}>{errors.caption}</small>
          )}
          <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
            ✅ HTML tagları avtomatik silinir
          </small>
        </div>

        {/* CSRF Token Indicator */}
        <div
          style={{
            padding: '8px',
            marginBottom: '16px',
            backgroundColor: '#e7f3ff',
            border: '1px solid #b3d9ff',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#004085',
          }}
        >
          🔐 CSRF Token: {csrf.getToken().substring(0, 16)}...
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: isLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {isLoading ? '⏳ Yüklənir...' : '✅ Təhlükəli Şəkildə Göndər'}
        </button>
      </form>

      {/* Security Info */}
      <div
        style={{
          marginTop: '24px',
          padding: '12px',
          backgroundColor: '#f9f9f9',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#666',
        }}
      >
        <strong>🛡️ Qoruma Qatları:</strong>
        <ul>
          <li>
            <strong>XSS:</strong> Caption-dəki script-lər silinir
          </li>
          <li>
            <strong>SQL Injection:</strong> Cafe slug pattern-ə uyğun yoxlanılır
          </li>
          <li>
            <strong>CSRF:</strong> X-CSRF-Token header-ı olmadan sorğu rədd edilir
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SecureFormExample;

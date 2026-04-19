/**
 * Browser-Safe Security Utilities
 * Client-side security implementations that work in React
 */

/**
 * CSP Meta Tag Setup
 */
export function setupCSPMetaTag(): void {
  if (typeof document === 'undefined') return;

  const cspContent = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    "font-src 'self' fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https: wss:",
    "frame-src 'none'",
    "object-src 'none'",
  ].join('; ');

  let metaTag = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (!metaTag) {
    metaTag = document.createElement('meta');
    metaTag.setAttribute('http-equiv', 'Content-Security-Policy');
    document.head.appendChild(metaTag);
  }
  metaTag.setAttribute('content', cspContent);
}

/**
 * Client-side Rate Limiter
 */
export class ClientRateLimiter {
  private limits: Map<string, number[]> = new Map();
  private readonly windowMs = 60 * 1000; // 1 minute

  isAllowed(key: string, maxRequests: number = 100): boolean {
    const now = Date.now();
    const timestamps = this.limits.get(key) || [];

    // Remove old timestamps outside window
    const recent = timestamps.filter((t) => now - t < this.windowMs);

    if (recent.length >= maxRequests) {
      console.warn(`Rate limit exceeded for ${key}`);
      return false;
    }

    // Add new timestamp
    recent.push(now);
    this.limits.set(key, recent);

    return true;
  }

  reset(key: string): void {
    this.limits.delete(key);
  }
}

/**
 * CSRF Token Management
 */
export class CSRFProtection {
  private token: string | null = null;

  generateToken(): string {
    if (!this.token) {
      const array = new Uint8Array(32);
      if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(array);
      }
      this.token = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    return this.token;
  }

  addTokenToFetch(init: RequestInit = {}): RequestInit {
    return {
      ...init,
      headers: {
        ...init.headers,
        'X-CSRF-Token': this.generateToken(),
      },
    };
  }

  getToken(): string {
    return this.generateToken();
  }
}

/**
 * Secure Cookie Manager
 */
export class SecureCookieManager {
  setSecureCookie(
    name: string,
    value: string,
    options: {
      maxAge?: number; // seconds
      secure?: boolean;
      httpOnly?: boolean; // Note: Not enforced in JS
      sameSite?: 'Strict' | 'Lax' | 'None';
    } = {}
  ): void {
    if (typeof document === 'undefined') return;

    const { maxAge = 86400, secure = true, sameSite = 'Strict' } = options;

    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    if (maxAge) {
      const date = new Date();
      date.setTime(date.getTime() + maxAge * 1000);
      cookieString += `; expires=${date.toUTCString()}`;
    }

    if (secure && window.location.protocol === 'https:') {
      cookieString += '; Secure';
    }

    cookieString += `; SameSite=${sameSite}`;
    cookieString += '; Path=/';

    document.cookie = cookieString;
  }

  getSecureCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;

    const nameEQ = `${encodeURIComponent(name)}=`;
    const cookies = document.cookie.split(';');

    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      if (trimmed.startsWith(nameEQ)) {
        return decodeURIComponent(trimmed.substring(nameEQ.length));
      }
    }

    return null;
  }

  deleteSecureCookie(name: string): void {
    this.setSecureCookie(name, '', { maxAge: 0 });
  }
}

/**
 * Input Validation Helpers
 */
export const InputValidation = {
  isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  isValidFileSize(sizeBytes: number, maxSizeMb: number = 8): boolean {
    return sizeBytes <= maxSizeMb * 1024 * 1024;
  },

  isValidFileName(fileName: string): boolean {
    // Prevent path traversal
    return !fileName.includes('..') && !fileName.includes('/') && !fileName.includes('\\');
  },

  isSafeString(str: string, maxLength: number = 1000): boolean {
    if (typeof str !== 'string' || str.length > maxLength) return false;
    // Check for common injection patterns
    const dangerous = ['<script', 'javascript:', 'onerror=', 'onclick='];
    return !dangerous.some((pattern) => str.toLowerCase().includes(pattern));
  },
};

/**
 * Security Event Logging
 */
export class SecurityEventLogger {
  private events: Array<{ timestamp: Date; type: string; data: any }> = [];
  private readonly maxEvents = 100;

  logEvent(type: string, data: any): void {
    const event = {
      timestamp: new Date(),
      type,
      data,
    };

    this.events.push(event);

    // Limit stored events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    console.log('[SECURITY]', type, data);
  }

  getEvents(type?: string): Array<{ timestamp: Date; type: string; data: any }> {
    if (!type) return [...this.events];
    return this.events.filter((e) => e.type === type);
  }

  clear(): void {
    this.events = [];
  }
}

/**
 * XSS Protection Helpers
 */
export const XSSProtection = {
  escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  },

  sanitizeText(text: string): string {
    // Basic HTML stripping for user content
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, ''); // Remove all HTML tags
  },

  isSafeHtml(html: string): boolean {
    // Check for dangerous tags
    const dangerous = [
      '<script',
      'javascript:',
      'onerror=',
      'onclick=',
      'onload=',
      'iframe',
    ];
    const lower = html.toLowerCase();
    return !dangerous.some((pattern) => lower.includes(pattern));
  },
};

/**
 * HTTPS Enforcement
 */
export function enforceHTTPS(): void {
  if (typeof window === 'undefined') return;

  if (
    window.location.protocol !== 'https:' &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1')
  ) {
    window.location.protocol = 'https:';
  }
}

/**
 * Sensitive Data Redaction
 */
export function redactSensitiveData(obj: any): any {
  const sensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'secret',
    'uid',
    'email',
    'phone',
    'ssn',
    'creditCard',
  ];

  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const redacted = { ...obj };

  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  }

  return redacted;
}

/**
 * Initialize all browser security features
 */
export function initializeBrowserSecurity(): void {
  setupCSPMetaTag();
  enforceHTTPS();
  console.log('[SECURITY] Browser security initialized');
}

export default {
  setupCSPMetaTag,
  ClientRateLimiter,
  CSRFProtection,
  SecureCookieManager,
  InputValidation,
  SecurityEventLogger,
  XSSProtection,
  enforceHTTPS,
  redactSensitiveData,
  initializeBrowserSecurity,
};

/**
 * Input Validation & Sanitization Module
 * Protects against: XSS, SQL Injection, Command Injection, Path Traversal
 */

/**
 * Basic error logger for validation failures
 */
function logError(message: string, error?: Error, context?: Record<string, any>): void {
  console.error('[VALIDATION_ERROR]', message, { error: error?.message, ...context });
}

// Note: DOMPurify not available in this environment
// Using fallback HTML escaping instead

/**
 * Validation Rules
 */
export const VALIDATION_RULES = {
  cafeSlug: {
    pattern: /^[a-z0-9-]{3,50}$/,
    maxLength: 50,
    minLength: 3,
    description: 'Only lowercase letters, numbers, and hyphens',
  },
  tableNumber: {
    pattern: /^[a-zA-Z0-9\-]{1,20}$/,
    maxLength: 20,
    minLength: 1,
    description: 'Alphanumeric and hyphens only',
  },
  cafeName: {
    pattern: /^[a-zA-Z0-9\s\-\']{1,100}$/,
    maxLength: 100,
    minLength: 1,
    description: 'Letters, numbers, spaces, hyphens, apostrophes',
  },
  caption: {
    maxLength: 500,
    minLength: 0,
    description: 'Max 500 characters',
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 254,
    description: 'Valid email format',
  },
  url: {
    pattern: /^https?:\/\/.+/,
    description: 'Valid HTTP(S) URL',
  },
  fileSize: {
    max: 8_000_000, // 8MB
    description: 'Max 8MB',
  },
  fileName: {
    pattern: /^[a-zA-Z0-9._-]{1,255}$/,
    description: 'Alphanumeric, dots, hyphens, underscores',
  },
};

/**
 * Validator Class
 */
export class Validator {
  private errors: Map<string, string[]> = new Map();

  /**
   * Validate single field
   */
  static validate(value: unknown, rule: keyof typeof VALIDATION_RULES): boolean {
    const ruleDef = VALIDATION_RULES[rule];

    // Type checks
    if (value === null || value === undefined) {
      if (rule === 'caption') return true; // Optional
      return false;
    }

    const strValue = String(value);

    // Length checks
    if ('minLength' in ruleDef && strValue.length < ruleDef.minLength) {
      return false;
    }

    if ('maxLength' in ruleDef && strValue.length > ruleDef.maxLength) {
      return false;
    }

    // Pattern checks
    if ('pattern' in ruleDef && !ruleDef.pattern.test(strValue)) {
      return false;
    }

    return true;
  }

  /**
   * Validate and add error
   */
  validateField(
    fieldName: string,
    value: unknown,
    rule: keyof typeof VALIDATION_RULES
  ): boolean {
    const isValid = Validator.validate(value, rule);

    if (!isValid) {
      const ruleDef = VALIDATION_RULES[rule];
      const errorMsg = `${fieldName}: ${ruleDef.description}`;

      if (!this.errors.has(fieldName)) {
        this.errors.set(fieldName, []);
      }
      this.errors.get(fieldName)!.push(errorMsg);
    }

    return isValid;
  }

  /**
   * Get all errors
   */
  getErrors(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    this.errors.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Check if valid
   */
  isValid(): boolean {
    return this.errors.size === 0;
  }

  /**
   * Clear errors
   */
  clear(): void {
    this.errors.clear();
  }
}

/**
 * Sanitization Functions
 */

/**
 * Sanitize HTML content (prevent XSS)
 * Removes all HTML tags and escapes special characters
 */
export function sanitizeHTML(dirty: string): string {
  // Remove all HTML tags
  let cleaned = dirty.replace(/<[^>]*>/g, '');
  // Escape remaining special characters
  return escapeHtml(cleaned);
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Sanitize file name (prevent path traversal)
 */
export function sanitizeFileName(fileName: string): string {
  // Remove any path components
  let cleaned = fileName.split(/[\\/]/).pop() || 'file';

  // Remove potentially dangerous characters
  cleaned = cleaned.replace(/[^\w\-._]/g, '_');

  // Prevent double extensions (e.g., .php.jpg)
  cleaned = cleaned.replace(/\.(?=.*\.)/g, '_');

  // Limit length
  if (cleaned.length > 255) {
    const ext = cleaned.split('.').pop();
    cleaned = cleaned.substring(0, 250) + (ext ? `.${ext}` : '');
  }

  return cleaned;
}

/**
 * Sanitize URL parameters (prevent injection)
 */
export function sanitizeUrlParam(param: string): string {
  // Remove dangerous characters
  return param.replace(/[^a-zA-Z0-9\-_.]/g, '');
}

/**
 * Sanitize cafe slug (lowercase, remove special chars)
 */
export function sanitizeCafeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^\w-]/g, '') // Remove non-word chars except hyphen
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, '') // Trim hyphens
    .slice(0, 50); // Max 50 chars
}

/**
 * Validate and sanitize cafeSlug
 */
export function validateAndSanitizeCafeSlug(slug: unknown): string | null {
  if (typeof slug !== 'string') return null;

  const sanitized = sanitizeCafeSlug(slug);

  if (!Validator.validate(sanitized, 'cafeSlug')) {
    logError('Invalid cafe slug after sanitization', new Error('Validation failed'), {
      action: 'validate_cafe_slug',
      additionalInfo: { original: slug, sanitized },
    });
    return null;
  }

  return sanitized;
}

/**
 * Validate and sanitize email
 */
export function validateAndSanitizeEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null;

  const trimmed = email.trim().toLowerCase();

  if (!Validator.validate(trimmed, 'email')) {
    return null;
  }

  return trimmed;
}

/**
 * Validate and sanitize caption (user-generated content)
 */
export function validateAndSanitizeCaption(caption: unknown): string | null {
  if (caption === null || caption === undefined) return null;

  if (typeof caption !== 'string') return null;

  const trimmed = caption.trim();

  if (!Validator.validate(trimmed, 'caption')) {
    return null;
  }

  // Sanitize HTML
  return sanitizeHTML(trimmed);
}

/**
 * Content Security Policy Header
 */
export const CSP_HEADER = {
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline' fonts.googleapis.com;
    font-src 'self' fonts.gstatic.com;
    img-src 'self' data: https:;
    connect-src 'self' https: wss:;
    frame-src 'none';
    object-src 'none';
    upgrade-insecure-requests;
  `.replace(/\s+/g, ' '),
};

/**
 * Additional Security Headers
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

/**
 * Middleware to add security headers
 */
export function securityHeadersMiddleware(req: any, res: any, next: any): void {
  Object.entries({ ...CSP_HEADER, ...SECURITY_HEADERS }).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  next();
}

/**
 * Batch validation helper
 */
export function validateBatch(data: Record<string, any>, rules: Record<string, keyof typeof VALIDATION_RULES>): Validator {
  const validator = new Validator();

  Object.entries(rules).forEach(([field, rule]) => {
    validator.validateField(field, data[field], rule);
  });

  return validator;
}

export default {
  Validator,
  VALIDATION_RULES,
  sanitizeHTML,
  escapeHtml,
  sanitizeFileName,
  sanitizeUrlParam,
  sanitizeCafeSlug,
  validateAndSanitizeCafeSlug,
  validateAndSanitizeEmail,
  validateAndSanitizeCaption,
  CSP_HEADER,
  SECURITY_HEADERS,
  securityHeadersMiddleware,
  validateBatch,
};

import { describe, expect, it } from 'vitest';
import {
  canAccessCafeAdmin,
  getCafeAccessRole,
  hasOwnerPortalAccess,
  hasSuperAdminAccess,
  normalizeAccessEmail,
} from '@/config/access';
import {
  validateAndSanitizeCafeSlug,
  validateAndSanitizeCaption,
} from '@/security/validation';

describe('ShareVibe access policy defaults', () => {
  it('normalizes access emails consistently', () => {
    expect(normalizeAccessEmail('  OWNER@Example.COM  ')).toBe('owner@example.com');
  });

  it('fails closed for users that are not in the central access policy', () => {
    expect(hasSuperAdminAccess('customer@example.com')).toBe(false);
    expect(hasOwnerPortalAccess('customer@example.com')).toBe(false);
    expect(getCafeAccessRole('customer@example.com', 'demo-cafe')).toBe('none');
    expect(canAccessCafeAdmin('customer@example.com', 'demo-cafe')).toBe(false);
  });
});

describe('ShareVibe public input validation', () => {
  it('normalizes cafe slugs for route and storage usage', () => {
    expect(validateAndSanitizeCafeSlug('Demo-Cafe-TR')).toBe('demo-cafe-tr');
  });

  it('rejects unusable cafe slugs', () => {
    expect(validateAndSanitizeCafeSlug('../')).toBeNull();
  });

  it('sanitizes captions without accepting executable markup', () => {
    const result = validateAndSanitizeCaption('Merhaba <script>alert(1)</script> kafe');
    expect(result).not.toContain('<script>');
    expect(result).toContain('Merhaba');
  });
});

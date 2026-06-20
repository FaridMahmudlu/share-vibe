import { z } from 'zod';

/**
 * [SV-11] Zod Validation Schemas
 * 
 * Centralized input validation schemas for all user-generated content.
 * Used on the client side before Firestore writes and on the backend for API payloads.
 */

// ─── Caption ───────────────────────────────────────────────────────
/** Media caption: 1-100 chars, trimmed, no control characters. */
export const captionSchema = z
  .string()
  .trim()
  .min(1, 'Açıklama boş olamaz.')
  .max(100, 'Açıklama en fazla 100 karakter olabilir.')
  .regex(/^[^\x00-\x08\x0B\x0C\x0E-\x1F]*$/, 'Geçersiz karakter bulundu.')
  .transform((val) => val.replace(/<[^>]*>/g, '')); // Strip any HTML tags

// ─── Filename ──────────────────────────────────────────────────────
/** Safe filename: alphanumeric, hyphens, underscores, dots. Max 255 chars. */
export const filenameSchema = z
  .string()
  .trim()
  .min(1, 'Dosya adı boş olamaz.')
  .max(255, 'Dosya adı çok uzun.')
  .regex(
    /^[a-zA-Z0-9._\-\s]+$/,
    'Dosya adı yalnızca harfler, rakamlar, tire, alt çizgi ve nokta içerebilir.'
  );

// ─── Description ───────────────────────────────────────────────────
/** Campaign or content description: 0-500 chars, trimmed. */
export const descriptionSchema = z
  .string()
  .trim()
  .max(500, 'Açıklama en fazla 500 karakter olabilir.')
  .transform((val) => val.replace(/<script[\s\S]*?<\/script>/gi, ''))
  .optional()
  .default('');

// ─── Email ─────────────────────────────────────────────────────────
/** Normalized email: lowercase, trimmed, valid format. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Geçerli bir e-posta adresi giriniz.')
  .max(160, 'E-posta adresi çok uzun.');

// ─── Cafe Slug ─────────────────────────────────────────────────────
/** URL-safe cafe slug: lowercase letters, digits, hyphens. */
export const cafeSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Kafe slug boş olamaz.')
  .max(80, 'Kafe slug çok uzun.')
  .regex(/^[a-z0-9-]+$/, 'Kafe slug yalnızca küçük harf, rakam ve tire içerebilir.');

// ─── Table Label ───────────────────────────────────────────────────
/** Table number / label identifier. */
export const tableLabelSchema = z
  .string()
  .trim()
  .min(1)
  .max(40, 'Masa numarası çok uzun.')
  .regex(/^[^\x00-\x1F<>]*$/, 'Geçersiz karakter.');

// ─── Campaign Subject ──────────────────────────────────────────────
/** Campaign email subject: 1-80 chars, no HTML. */
export const campaignSubjectSchema = z
  .string()
  .trim()
  .min(1, 'Konu boş olamaz.')
  .max(80, 'Konu en fazla 80 karakter olabilir.')
  .transform((val) => val.replace(/<[^>]*>/g, ''));

// ─── Campaign Text Content ─────────────────────────────────────────
/** Campaign body text: 1-800 chars. */
export const campaignTextContentSchema = z
  .string()
  .trim()
  .min(1, 'İçerik boş olamaz.')
  .max(800, 'İçerik en fazla 800 karakter olabilir.');

// ─── URL ───────────────────────────────────────────────────────────
/** Validated HTTPS URL. */
export const httpsUrlSchema = z
  .string()
  .trim()
  .url('Geçerli bir URL giriniz.')
  .refine((url) => url.startsWith('https://'), {
    message: 'URL https:// ile başlamalıdır.',
  });

// ─── Contact Name ──────────────────────────────────────────────────
/** Contact / person name: 1-120 chars. */
export const contactNameSchema = z
  .string()
  .trim()
  .min(1, 'İsim boş olamaz.')
  .max(120, 'İsim çok uzun.')
  .regex(/^[^\x00-\x1F<>]*$/, 'Geçersiz karakter.');

// ─── Phone ─────────────────────────────────────────────────────────
/** Optional phone number. */
export const phoneSchema = z
  .string()
  .trim()
  .max(60, 'Telefon numarası çok uzun.')
  .regex(/^[+0-9()\s-]*$/, 'Geçersiz telefon formatı.')
  .optional();

// ─── Composite Schemas ─────────────────────────────────────────────

/** Full media upload payload validation. */
export const mediaUploadSchema = z.object({
  caption: captionSchema,
  cafeSlug: cafeSlugSchema,
  tableNumber: tableLabelSchema,
});

/** QR stand request payload validation. */
export const qrStandRequestSchema = z.object({
  contactName: contactNameSchema,
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  standName: z.string().trim().max(120).optional(),
  location: z.string().trim().max(180).optional(),
  placement: z.string().trim().max(180).optional(),
  tableCount: z.number().int().min(1).max(500),
  preferredDate: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(600).optional(),
});

/** Campaign create/update payload validation. */
export const campaignSchema = z.object({
  subject: campaignSubjectSchema,
  description: descriptionSchema,
  textContent: campaignTextContentSchema,
  imageUrl: httpsUrlSchema.optional().nullable(),
  tag: z.string().trim().max(60).optional().nullable(),
  status: z.enum(['published', 'archived']),
});

// ─── Utility helpers ───────────────────────────────────────────────

/**
 * Validate and sanitize a caption string, returning null if invalid.
 */
export const validateCaption = (input: unknown): string | null => {
  const result = captionSchema.safeParse(input);
  return result.success ? result.data : null;
};

/**
 * Validate and sanitize an email string, returning null if invalid.
 */
export const validateEmail = (input: unknown): string | null => {
  const result = emailSchema.safeParse(input);
  return result.success ? result.data : null;
};

/**
 * Validate a cafe slug, returning null if invalid.
 */
export const validateCafeSlug = (input: unknown): string | null => {
  const result = cafeSlugSchema.safeParse(input);
  return result.success ? result.data : null;
};

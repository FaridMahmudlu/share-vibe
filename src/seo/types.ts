/**
 * SEO TypeScript Type Definitions
 * Type-safe utilities for SEO implementation
 */

// ============================================
// Meta Tags & Page Data
// ============================================

export interface PageMetaData {
  /** Page title (50-60 characters optimal) */
  title: string;

  /** Page description (150-160 characters optimal) */
  description: string;

  /** OG image URL (1200x630px optimal) */
  image?: string;

  /** Full page URL including domain */
  url: string;

  /** Page type for Open Graph */
  type?: 'website' | 'article' | 'product' | 'profile';

  /** SEO keywords for this page */
  keywords?: string[];

  /** Article/content author */
  author?: string;

  /** Article publication date (ISO format) */
  publishedDate?: string;

  /** Article last modified date (ISO format) */
  modifiedDate?: string;

  /** Canonical URL (if different from url) */
  canonical?: string;
}

// ============================================
// Breadcrumb Schema
// ============================================

export interface BreadcrumbItem {
  /** Display name */
  name: string;

  /** Full URL */
  url: string;
}

// ============================================
// Local Business Schema
// ============================================

export interface LocalBusinessData {
  /** Cafe name */
  name: string;

  /** URL slug (for cafe pages) */
  slug: string;

  /** Physical address */
  address?: string;

  /** Phone number */
  phone?: string;

  /** Featured image URL */
  image?: string;

  /** Short description */
  description?: string;

  /** Price range: '$' | '$$' | '$$$' | '$$$$' */
  priceRange?: string;

  /** Average rating (1-5) */
  rating?: number;

  /** Number of reviews/ratings */
  ratingCount?: number;
}

// ============================================
// Article Schema
// ============================================

export interface ArticleData {
  /** Blog post title */
  title: string;

  /** Blog post description/excerpt */
  description: string;

  /** Featured image URL */
  image: string;

  /** Author name */
  author: string;

  /** Publication date (ISO format) */
  datePublished: string;

  /** Last modified date (ISO format) */
  dateModified?: string;

  /** Full article URL */
  url: string;
}

// ============================================
// FAQ Schema
// ============================================

export interface FAQItem {
  /** Question text */
  question: string;

  /** Answer text */
  answer: string;
}

// ============================================
// Product Schema
// ============================================

export interface ProductData {
  /** Product name */
  name: string;

  /** Product description */
  description: string;

  /** Product image URL */
  image: string;

  /** Product price */
  price: number;

  /** Currency code: 'TRY', 'USD', etc */
  priceCurrency: string;

  /** Stock availability */
  availability: 'InStock' | 'OutOfStock' | 'PreOrder';
}

// ============================================
// Image Schema
// ============================================

export interface ImageData {
  /** Image URL */
  url: string;

  /** Image name/title */
  name: string;

  /** Image description/caption */
  description: string;

  /** Upload date (ISO format) */
  uploadDate: string;

  /** Uploader/author name */
  author: string;
}

// ============================================
// Video Schema
// ============================================

export interface VideoData {
  /** Video URL */
  url: string;

  /** Video title */
  name: string;

  /** Video description */
  description: string;

  /** Upload date (ISO format) */
  uploadDate: string;

  /** Thumbnail image URL */
  thumbnailUrl: string;

  /** Duration in ISO 8601 format (PT1M30S) */
  duration: string;
}

// ============================================
// JSON-LD Schema Base
// ============================================

export interface SchemaOrgData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

// ============================================
// Tracking Events
// ============================================

export type ConversionType = 'signup' | 'upload' | 'share' | 'follow';
export type ContentType = 'media' | 'article' | 'cafe';
export type EventAction =
  | 'cta_click'
  | 'cafe_click'
  | 'search'
  | 'filter'
  | 'sort'
  | 'like'
  | 'unlike'
  | 'share'
  | 'download'
  | 'video_play'
  | 'form_submit';

export interface TrackingEvent {
  /** Event name */
  eventName: string;

  /** Event metadata */
  eventData?: Record<string, any>;

  /** Event timestamp */
  timestamp: string;
}

// ============================================
// Performance Metrics
// ============================================

export interface WebVital {
  /** Metric name: LCP, FID, CLS, INP */
  metric_name: string;

  /** Metric value in milliseconds */
  metric_value: number;
}

// ============================================
// SEO Report
// ============================================

export interface SEOPerformanceReport {
  timestamp: string;
  url: string;
  title: string;
  metaTags: {
    description: string | null;
    keywords: string | null;
    author: string | null;
  };
  openGraph: {
    title: string | null;
    description: string | null;
    image: string | null;
    url: string | null;
  };
  canonical: string | null;
  headings: {
    h1Count: number;
    h2Count: number;
    h3Count: number;
    headingTexts: (string | null)[];
  };
  images: {
    withoutAlt: number;
    totalImages: number;
  };
  links: {
    internal: number;
    external: number;
    withoutTitle: number;
  };
  performance: {
    documentReady: number;
    pageLoadTime: number;
  };
}

// ============================================
// Hook: usePageMeta
// ============================================

export interface UsePageMetaOptions {
  /** Page metadata */
  meta: PageMetaData;

  /** Current page path (e.g., '/cafe/my-cafe') */
  path: string;
}

// ============================================
// Hook: useBreadcrumbs
// ============================================

export interface UseBreadcrumbsOptions {
  /** Breadcrumb items */
  breadcrumbs: BreadcrumbItem[];
}

// ============================================
// Component Props
// ============================================

export interface SEOHeadProps {
  /** Page metadata */
  meta: PageMetaData;

  /** JSON-LD schema to inject */
  schema?: SchemaOrgData;
}

// ============================================
// Function Signatures
// ============================================

export interface SEOUtilities {
  updatePageMeta: (meta: PageMetaData) => void;
  updateBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  trackPageView: (path: string, title: string, type?: 'page' | 'article' | 'product') => void;
  trackEvent: (eventName: string, eventData?: Record<string, any>) => void;
  trackUserInteraction: (action: EventAction, details?: any) => void;
  trackContentView: (contentType: ContentType, contentId: string, contentTitle: string) => void;
  trackConversion: (conversionType: ConversionType, value?: number) => void;
  initCoreWebVitalsTracking: () => void;
  generateSEOPerformanceReport: () => SEOPerformanceReport;
  logSEOReport: () => void;
}

export interface SchemaGenerators {
  injectSchema: (schema: SchemaOrgData, id?: string) => void;
  createOrganizationSchema: () => SchemaOrgData;
  createLocalBusinessSchema: (cafeData: LocalBusinessData) => SchemaOrgData;
  createBreadcrumbSchema: (breadcrumbs: BreadcrumbItem[]) => SchemaOrgData;
  createArticleSchema: (article: ArticleData) => SchemaOrgData;
  createFAQSchema: (faqs: FAQItem[]) => SchemaOrgData;
  createProductSchema: (product: ProductData) => SchemaOrgData;
  createImageSchema: (image: ImageData) => SchemaOrgData;
  createVideoSchema: (video: VideoData) => SchemaOrgData;
  createSocialProfileSchema: () => SchemaOrgData;
  createWebsiteSchema: () => SchemaOrgData;
}

// ============================================
// Extended Window Interface
// ============================================

declare global {
  interface Window {
    /** Google Analytics 4 global site tag */
    gtag?: (...args: any[]) => void;

    /** Debug SEO on page */
    debugSEO?: () => SEOPerformanceReport;
  }
}

export default {};

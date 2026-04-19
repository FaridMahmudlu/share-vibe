/**
 * SEO: JSON-LD Schema Injection
 * Generates structured data for Google, Bing, and other search engines
 * Helps with rich snippets and SERP visibility
 */

interface SchemaOrgData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

/**
 * Inject JSON-LD schema into document head
 */
export function injectSchema(schema: SchemaOrgData, id: string = 'schema-org'): void {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = id;
  script.textContent = JSON.stringify(schema);
  
  // Remove existing schema if present
  const existing = document.getElementById(id);
  if (existing) {
    existing.remove();
  }
  
  document.head.appendChild(script);
}

/**
 * Organization Schema
 */
export function createOrganizationSchema(): SchemaOrgData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ShareVibe',
    url: 'https://sharevibe.co',
    logo: 'https://sharevibe.co/logo-600x600.png',
    description: 'Topluluk odaklı kafe paylaşım platformu. QR kod ile fotoğraf paylaş.',
    sameAs: [
      'https://twitter.com/ShareVibe',
      'https://instagram.com/ShareVibe',
      'https://facebook.com/ShareVibe',
      'https://linkedin.com/company/ShareVibe',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'info@sharevibe.co',
      contactType: 'Customer Service',
      telephone: '+90-XXX-XXX-XXXX',
    },
    founder: {
      '@type': 'Person',
      name: 'ShareVibe Team',
    },
    foundingDate: '2026',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'İstanbul, Turkey',
      addressLocality: 'İstanbul',
      addressCountry: 'TR',
    },
  };
}

/**
 * LocalBusiness Schema (per cafe)
 */
export function createLocalBusinessSchema(cafeData: {
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  image?: string;
  description?: string;
  priceRange?: string; // '$' | '$$' | '$$$' | '$$$$'
  rating?: number; // 1-5
  ratingCount?: number;
}): SchemaOrgData {
  return {
    '@context': 'https://schema.org',
    '@type': 'CafeOrCoffeeShop',
    name: cafeData.name,
    url: `https://sharevibe.co/cafe/${cafeData.slug}`,
    image: cafeData.image || 'https://sharevibe.co/default-cafe.jpg',
    description: cafeData.description || `${cafeData.name} - ShareVibe'da`,
    ...(cafeData.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: cafeData.address,
        addressLocality: 'İstanbul',
        addressCountry: 'TR',
      },
    }),
    ...(cafeData.phone && { telephone: cafeData.phone }),
    ...(cafeData.priceRange && { priceRange: cafeData.priceRange }),
    ...(cafeData.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: cafeData.rating,
        ratingCount: cafeData.ratingCount || 1,
      },
    }),
    servesCuisine: ['Coffee', 'Dessert'],
    acceptsReservations: 'No',
  };
}

/**
 * BreadcrumbList Schema
 */
export function createBreadcrumbSchema(breadcrumbs: {
  name: string;
  url: string;
}[]): SchemaOrgData {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((breadcrumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: breadcrumb.name,
      item: breadcrumb.url,
    })),
  };
}

/**
 * Article/BlogPost Schema
 */
export function createArticleSchema(article: {
  title: string;
  description: string;
  image: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  url: string;
}): SchemaOrgData {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.description,
    image: article.image,
    author: {
      '@type': 'Person',
      name: article.author,
    },
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    url: article.url,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url,
    },
  };
}

/**
 * FAQ Schema
 */
export function createFAQSchema(faqs: {
  question: string;
  answer: string;
}[]): SchemaOrgData {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Product Schema (for premium plans)
 */
export function createProductSchema(product: {
  name: string;
  description: string;
  image: string;
  price: number;
  priceCurrency: string; // 'TRY', 'USD', etc
  availability: 'InStock' | 'OutOfStock' | 'PreOrder';
}): SchemaOrgData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    offers: {
      '@type': 'Offer',
      url: 'https://sharevibe.co/pricing',
      price: product.price,
      priceCurrency: product.priceCurrency,
      availability: `https://schema.org/${product.availability}`,
    },
  };
}

/**
 * ImageObject Schema (for gallery images)
 */
export function createImageSchema(image: {
  url: string;
  name: string;
  description: string;
  uploadDate: string;
  author: string;
}): SchemaOrgData {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    url: image.url,
    name: image.name,
    description: image.description,
    uploadDate: image.uploadDate,
    author: {
      '@type': 'Person',
      name: image.author,
    },
  };
}

/**
 * VideoObject Schema
 */
export function createVideoSchema(video: {
  url: string;
  name: string;
  description: string;
  uploadDate: string;
  thumbnailUrl: string;
  duration: string; // 'PT1M30S' format
}): SchemaOrgData {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.name,
    description: video.description,
    uploadDate: video.uploadDate,
    duration: video.duration,
    contentUrl: video.url,
    thumbnailUrl: video.thumbnailUrl,
  };
}

/**
 * SocialMediaProfile Links
 */
export function createSocialProfileSchema(): SchemaOrgData {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    dateCreated: '2026-01-01',
    dateModified: new Date().toISOString(),
  };
}

/**
 * Website Schema (Main schema for homepage)
 */
export function createWebsiteSchema(): SchemaOrgData {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ShareVibe',
    url: 'https://sharevibe.co',
    description: 'Topluluk odaklı kafe paylaşım platformu',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://sharevibe.co/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export default {
  injectSchema,
  createOrganizationSchema,
  createLocalBusinessSchema,
  createBreadcrumbSchema,
  createArticleSchema,
  createFAQSchema,
  createProductSchema,
  createImageSchema,
  createVideoSchema,
  createSocialProfileSchema,
  createWebsiteSchema,
};

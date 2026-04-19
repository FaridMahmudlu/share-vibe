/**
 * SEO Utilities: Dynamic Meta Tags, Analytics, Performance Tracking
 */

interface PageMetaData {
  title: string;
  description: string;
  image?: string;
  url: string;
  type?: 'website' | 'article' | 'product' | 'profile';
  keywords?: string[];
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
  canonical?: string;
}

/**
 * Update page meta tags dynamically (for React Router)
 */
export function updatePageMeta(meta: PageMetaData): void {
  // Update title
  document.title = meta.title;

  // Update description
  updateMetaTag('description', meta.description);

  // Update Open Graph tags
  updateMetaTag('property', 'og:title', meta.title, 'og:');
  updateMetaTag('property', 'og:description', meta.description, 'og:');
  if (meta.image) {
    updateMetaTag('property', 'og:image', meta.image, 'og:');
  }
  updateMetaTag('property', 'og:url', meta.url, 'og:');
  updateMetaTag('property', 'og:type', meta.type || 'website', 'og:');

  // Update Twitter Card tags
  updateMetaTag('name', 'twitter:title', meta.title, 'twitter:');
  updateMetaTag('name', 'twitter:description', meta.description, 'twitter:');
  if (meta.image) {
    updateMetaTag('name', 'twitter:image', meta.image, 'twitter:');
  }

  // Update keywords
  if (meta.keywords && meta.keywords.length > 0) {
    updateMetaTag('name', 'keywords', meta.keywords.join(', '));
  }

  // Update author
  if (meta.author) {
    updateMetaTag('name', 'author', meta.author);
  }

  // Update canonical
  updateCanonical(meta.canonical || meta.url);

  // Update published/modified dates
  if (meta.publishedDate) {
    updateMetaTag('property', 'article:published_time', meta.publishedDate);
  }
  if (meta.modifiedDate) {
    updateMetaTag('property', 'article:modified_time', meta.modifiedDate);
  }
}

/**
 * Update individual meta tag
 */
function updateMetaTag(
  attrName: string,
  attrValue: string,
  content: string,
  prefix?: string
): void {
  const selector = prefix
    ? `meta[${attrName}="${prefix}${attrValue}"]`
    : `meta[${attrName}="${attrValue}"]`;

  let element = document.querySelector(selector) as HTMLMetaElement;

  if (!element) {
    element = document.createElement('meta');
    if (prefix) {
      element.setAttribute(attrName, `${prefix}${attrValue}`);
    } else {
      element.setAttribute(attrName, attrValue);
    }
    document.head.appendChild(element);
  }

  element.content = content;
}

/**
 * Update canonical link
 */
function updateCanonical(url: string): void {
  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;

  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }

  canonical.href = url;
}

/**
 * SEO Breadcrumb Tracking
 */
export function updateBreadcrumbs(
  breadcrumbs: { name: string; url: string }[]
): void {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  let script = document.getElementById('schema-breadcrumb') as HTMLScriptElement;

  if (!script) {
    script = document.createElement('script');
    script.id = 'schema-breadcrumb';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(schema);
}

/**
 * Track page view (Google Analytics compatible)
 */
export function trackPageView(
  path: string,
  title: string,
  type?: 'page' | 'article' | 'product'
): void {
  // Google Analytics (gtag)
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('pageview', {
      page_path: path,
      page_title: title,
      page_location: window.location.href,
    });
  }

  // Track custom event
  trackEvent('page_view', {
    page: path,
    title: title,
    type: type || 'page',
  });
}

/**
 * Track custom events
 */
export function trackEvent(
  eventName: string,
  eventData?: Record<string, any>
): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventData);
  }

  // Console logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 Event: ${eventName}`, eventData);
  }
}

/**
 * Track user interactions for SEO
 */
export function trackUserInteraction(action: string, details?: any): void {
  trackEvent('user_interaction', {
    action,
    ...details,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track media/content viewing
 */
export function trackContentView(
  contentType: 'media' | 'article' | 'cafe',
  contentId: string,
  contentTitle: string
): void {
  trackEvent('content_view', {
    content_type: contentType,
    content_id: contentId,
    content_title: contentTitle,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track conversions
 */
export function trackConversion(
  conversionType: 'signup' | 'upload' | 'share' | 'follow',
  value?: number
): void {
  trackEvent('conversion', {
    conversion_type: conversionType,
    value: value,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Monitor Core Web Vitals
 */
export function initCoreWebVitalsTracking(): void {
  if ('web-vital' in window) {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            trackEvent('web_vital', {
              metric_name: 'LCP',
              metric_value: entry.duration,
            });
          }
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {
        console.warn('LCP tracking not available');
      }
    }

    // First Input Delay (FID) / Interaction to Next Paint (INP)
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            trackEvent('web_vital', {
              metric_name: entry.name === 'first-input' ? 'FID' : 'INP',
              metric_value: entry.duration,
            });
          }
        });
        observer.observe({
          type: 'first-input',
          buffered: true,
        });
      } catch (e) {
        console.warn('FID/INP tracking not available');
      }
    }

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
              trackEvent('web_vital', {
                metric_name: 'CLS',
                metric_value: clsValue,
              });
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {
        console.warn('CLS tracking not available');
      }
    }
  }
}

/**
 * SEO Performance Report
 */
export function generateSEOPerformanceReport(): Record<string, any> {
  const report: Record<string, any> = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    title: document.title,
    metaTags: {
      description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
      keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content'),
      author: document.querySelector('meta[name="author"]')?.getAttribute('content'),
    },
    openGraph: {
      title: document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
      description: document.querySelector('meta[property="og:description"]')?.getAttribute('content'),
      image: document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
      url: document.querySelector('meta[property="og:url"]')?.getAttribute('content'),
    },
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    headings: {
      h1Count: document.querySelectorAll('h1').length,
      h2Count: document.querySelectorAll('h2').length,
      h3Count: document.querySelectorAll('h3').length,
      headingTexts: Array.from(document.querySelectorAll('h1, h2, h3')).map((el) => el.textContent),
    },
    images: {
      withoutAlt: document.querySelectorAll('img:not([alt])').length,
      totalImages: document.querySelectorAll('img').length,
    },
    links: {
      internal: document.querySelectorAll(`a[href^="/"]`).length,
      external: document.querySelectorAll(`a[href^="http"]`).length,
      withoutTitle: document.querySelectorAll(`a:not([title])`).length,
    },
    performance: {
      documentReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      pageLoadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
    },
  };

  return report;
}

/**
 * Log SEO performance report
 */
export function logSEOReport(): void {
  const report = generateSEOPerformanceReport();
  console.group('📊 SEO Performance Report');
  console.table(report);
  console.groupEnd();
}

/**
 * Global type augmentation for gtag
 */
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export default {
  updatePageMeta,
  updateBreadcrumbs,
  trackPageView,
  trackEvent,
  trackUserInteraction,
  trackContentView,
  trackConversion,
  initCoreWebVitalsTracking,
  generateSEOPerformanceReport,
  logSEOReport,
};

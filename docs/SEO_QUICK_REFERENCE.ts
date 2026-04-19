/**
 * SEO QUICK REFERENCE CARD
 * Copy-paste ready code snippets for common tasks
 */

// ============================================
// 1. BASIC SETUP IN main.tsx
// ============================================
export const SETUP_MAIN_TSX = `
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Import SEO utilities
import { initCoreWebVitalsTracking } from './seo/utils'
import { injectSchema, createOrganizationSchema, createWebsiteSchema } from './seo/schemas'

// Initialize SEO
initCoreWebVitalsTracking()
injectSchema(createOrganizationSchema())
injectSchema(createWebsiteSchema())

// Mount app
createRoot(document.getElementById('root')!).render(<App />)
`;

// ============================================
// 2. CREATE usePageMeta HOOK
// ============================================
export const USEPAGEMET_HOOK = `
import { useEffect } from 'react'
import { updatePageMeta, trackPageView } from '../seo/utils'
import type { PageMetaData } from '../seo/types'

export function usePageMeta(meta: PageMetaData, path: string) {
  useEffect(() => {
    updatePageMeta({
      ...meta,
      url: \`https://sharevibe.com\${path}\`,
      canonical: \`https://sharevibe.com\${path}\`,
    })

    trackPageView(path, meta.title, meta.type as any)
  }, [meta, path])
}
`;

// ============================================
// 3. USE IN HOMEPAGE
// ============================================
export const HOMEPAGE_EXAMPLE = `
import { usePageMeta } from '../hooks/usePageMeta'

export function MainPage() {
  usePageMeta(
    {
      title: 'ShareVibe - Kafe Paylaşım Platformu',
      description: 'Kafe fotoğraflarını paylaş, keşfet, beğen...',
      keywords: ['kafe', 'fotoğraf', 'paylaşım', 'QR kod'],
      type: 'website',
      image: 'https://sharevibe.com/og-image.jpg',
    },
    '/'
  )

  return (
    <main>
      <h1>ShareVibe - Topluluk Odaklı Kafe Deneyimi</h1>
      {/* Content */}
    </main>
  )
}
`;

// ============================================
// 4. USE IN CAFE PAGE WITH SCHEMA
// ============================================
export const CAFE_PAGE_EXAMPLE = `
import { useEffect } from 'react'
import { usePageMeta } from '../hooks/usePageMeta'
import { injectSchema, createLocalBusinessSchema, createBreadcrumbSchema } from '../seo/schemas'
import { trackContentView } from '../seo/utils'

export function CafePage({ cafeId, cafeData }) {
  usePageMeta(
    {
      title: \`\${cafeData.name} - ShareVibe | Kafe Galerisi\`,
      description: \`\${cafeData.description}. Kafe fotoğraflarını paylaş...\`,
      image: cafeData.images?.[0]?.url,
      type: 'product',
      breadcrumbs: [
        { name: 'Ana Sayfa', url: '/' },
        { name: 'Kafeler', url: '/cafes' },
        { name: cafeData.name, url: \`/cafe/\${cafeData.slug}\` },
      ],
    },
    \`/cafe/\${cafeData.slug}\`
  )

  useEffect(() => {
    // Inject LocalBusiness schema
    injectSchema(createLocalBusinessSchema({
      name: cafeData.name,
      slug: cafeData.slug,
      address: cafeData.address,
      rating: cafeData.rating,
    }))

    // Track view
    trackContentView('cafe', cafeId, cafeData.name)
  }, [cafeId, cafeData])

  return (
    <article>
      <h1>{cafeData.name}</h1>
      {/* Content */}
    </article>
  )
}
`;

// ============================================
// 5. TRACK CONVERSIONS
// ============================================
export const TRACK_CONVERSIONS = `
import { trackConversion, trackEvent } from '../seo/utils'

// Track upload
const handleUpload = async () => {
  // ... upload logic
  await uploadMedia(file)
  trackConversion('upload', 1) // 1 media uploaded
}

// Track follow/subscription
const handleFollowCafe = () => {
  // ... follow logic
  trackConversion('follow', 1)
}

// Track shares
const handleShare = () => {
  trackConversion('share', 1)
}

// Track custom events
const handleSearch = (query) => {
  trackEvent('search', {
    search_term: query,
    search_type: 'cafe'
  })
}
`;

// ============================================
// 6. MONITOR PERFORMANCE
// ============================================
export const MONITOR_PERFORMANCE = `
import { useEffect } from 'react'
import { logSEOReport } from '../seo/utils'

export function App() {
  useEffect(() => {
    // Log SEO report after 3 seconds (page stabilized)
    const timer = setTimeout(() => {
      if (process.env.NODE_ENV === 'development') {
        logSEOReport() // Logs to console
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  return (
    // ... JSX
  )
}
`;

// ============================================
// 7. COMMON SCHEMA INJECTIONS
// ============================================
export const SCHEMA_EXAMPLES = `
// Organization (Homepage)
import { injectSchema, createOrganizationSchema } from '@/seo/schemas'
injectSchema(createOrganizationSchema())

// LocalBusiness (Cafe page)
injectSchema(createLocalBusinessSchema({
  name: 'Espresso Bar',
  slug: 'espresso-bar',
  address: 'Istanbul, Turkey',
  rating: 4.8,
  ratingCount: 120,
}))

// Breadcrumbs (Navigation schema)
injectSchema(createBreadcrumbSchema([
  { name: 'Home', url: 'https://sharevibe.com' },
  { name: 'Cafes', url: 'https://sharevibe.com/cafes' },
  { name: 'My Cafe', url: 'https://sharevibe.com/cafe/my-cafe' },
]))

// Article (Blog post)
injectSchema(createArticleSchema({
  title: 'Top Coffee Photography Tips',
  description: 'Learn how to photograph coffee like a pro...',
  image: 'https://sharevibe.com/blog/coffee-tips.jpg',
  author: 'Sarah Chen',
  datePublished: '2024-01-15',
  url: 'https://sharevibe.com/blog/coffee-tips',
}))

// FAQ (FAQ page)
injectSchema(createFAQSchema([
  {
    question: 'How do I upload photos?',
    answer: 'Use the upload button and follow the steps...'
  },
  {
    question: 'Is sharing free?',
    answer: 'Yes, basic sharing is completely free...'
  },
]))
`;

// ============================================
// 8. ANALYTICS IN GOOGLE ANALYTICS
// ============================================
export const GOOGLE_ANALYTICS_SETUP = `
// Update index.html (in <head>):

<!-- Google Tag Manager -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX', {
    'page_path': window.location.pathname,
    'page_title': document.title,
  });
</script>

// Replace G-XXXXXXXXXX with your actual GA4 Measurement ID
// Get it from: Google Analytics > Admin > Property > Data Streams > Web > Measurement ID
`;

// ============================================
// 9. TESTING CHECKLIST
// ============================================
export const TESTING_CHECKLIST = `
// In browser console, test:

// 1. Check meta tags
document.querySelector('meta[name="description"]').content
document.querySelector('meta[property="og:title"]').content
document.querySelector('meta[property="og:image"]').content

// 2. Check JSON-LD
JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)

// 3. Check canonical
document.querySelector('link[rel="canonical"]').href

// 4. Check robots
document.querySelector('meta[name="robots"]').content

// 5. Check title
document.title

// 6. Check all schemas
document.querySelectorAll('script[type="application/ld+json"]').forEach((el, i) => {
  console.log(\`Schema \${i}:\`, JSON.parse(el.textContent))
})
`;

// ============================================
// 10. COMMON PATTERNS
// ============================================
export const COMMON_PATTERNS = `
// Pattern 1: Dynamic page title
const getPageTitle = (pageName, brandName = 'ShareVibe') => {
  return \`\${pageName} | \${brandName}\`
}

// Pattern 2: Generate description
const generateDescription = (content, maxLength = 160) => {
  return content.substring(0, maxLength - 3) + '...'
}

// Pattern 3: Format keywords
const formatKeywords = (keywords) => {
  return keywords.join(', ')
}

// Pattern 4: Build canonical URL
const getCanonical = (path) => {
  return \`https://sharevibe.com\${path}\`
}

// Pattern 5: Track internal link click
const trackLinkClick = (url, text) => {
  trackEvent('internal_link_click', {
    link_url: url,
    link_text: text,
  })
}
`;

// ============================================
// 11. VALIDATION TOOLS
// ============================================
export const VALIDATION_TOOLS = `
// Google Rich Results Test
https://search.google.com/test/rich-results

// Structured Data Test Tool
https://www.google.com/webmasters/tools/richsnippets

// Facebook Sharing Debugger
https://developers.facebook.com/tools/debug/

// Twitter Card Validator
https://cards-dev.twitter.com/validator

// Page Speed Insights
https://pagespeed.web.dev/

// Mobile-Friendly Test
https://search.google.com/test/mobile-friendly
`;

// ============================================
// 12. KEY FILES TO REMEMBER
// ============================================
export const KEY_FILES = {
  coreModules: [
    'src/seo/schemas.ts - Schema generators',
    'src/seo/utils.ts - Meta & analytics utilities',
    'src/seo/types.ts - Type definitions',
  ],
  hooks: [
    'src/hooks/usePageMeta.ts - (To create in Phase 2)',
  ],
  config: [
    'index.html - Meta tags (enhanced)',
    'public/manifest.json - PWA config',
    'public/.htaccess - Server config',
    'public/robots.txt - Crawler rules',
  ],
  scripts: [
    'scripts/generate-sitemaps.ts - Sitemap generator',
  ],
  docs: [
    'docs/SEO_IMPLEMENTATION_ROADMAP.ts - Roadmap',
    'docs/REACT_SEO_INTEGRATION.md - Integration guide',
    'docs/SEO_AUDIT.ts - Audit findings',
    'docs/PHASE_1_COMPLETION.md - This phase summary',
  ],
};

export default {
  SETUP_MAIN_TSX,
  USEPAGEMET_HOOK,
  HOMEPAGE_EXAMPLE,
  CAFE_PAGE_EXAMPLE,
  TRACK_CONVERSIONS,
  MONITOR_PERFORMANCE,
  SCHEMA_EXAMPLES,
  GOOGLE_ANALYTICS_SETUP,
  TESTING_CHECKLIST,
  COMMON_PATTERNS,
  VALIDATION_TOOLS,
  KEY_FILES,
};

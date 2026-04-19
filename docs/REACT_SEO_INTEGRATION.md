/**
 * SEO: React Integration Guide
 * How to use SEO utilities in your React components
 */

export const REACT_SEO_INTEGRATION_GUIDE = `
# 🚀 React SEO Integration Guide

## Quick Start

### 1. Update main.tsx

\`\`\`tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { initCoreWebVitalsTracking } from './seo/utils'
import { injectSchema, createOrganizationSchema, createWebsiteSchema } from './seo/schemas'
import './index.css'

// Initialize SEO on app start
initCoreWebVitalsTracking()
injectSchema(createOrganizationSchema())
injectSchema(createWebsiteSchema())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
\`\`\`

---

## 2. Create usePageMeta Hook

Create a new file: \`src/hooks/usePageMeta.ts\`

\`\`\`tsx
import { useEffect } from 'react'
import { updatePageMeta, updateBreadcrumbs, trackPageView } from '../seo/utils'

interface PageMeta {
  title: string
  description: string
  keywords?: string[]
  image?: string
  type?: 'website' | 'article' | 'product'
  author?: string
  breadcrumbs?: { name: string; url: string }[]
}

export function usePageMeta(meta: PageMeta, path: string) {
  useEffect(() => {
    // Update meta tags
    updatePageMeta({
      title: meta.title,
      description: meta.description,
      keywords: meta.keywords,
      image: meta.image,
      type: meta.type || 'website',
      author: meta.author,
      url: \`https://sharevibe.com\${path}\`,
      canonical: \`https://sharevibe.com\${path}\`,
    })

    // Update breadcrumbs if provided
    if (meta.breadcrumbs) {
      updateBreadcrumbs(meta.breadcrumbs)
    }

    // Track page view
    trackPageView(path, meta.title, meta.type as 'page' | 'article' | 'product' | undefined)
  }, [meta, path])
}
\`\`\`

---

## 3. Use in MainPage Component

\`\`\`tsx
import { usePageMeta } from '../hooks/usePageMeta'
import { injectSchema, createBreadcrumbSchema } from '../seo/schemas'
import { trackUserInteraction } from '../seo/utils'

export function MainPage() {
  usePageMeta(
    {
      title: 'ShareVibe - Kafe Paylaşım Platformu | QR Kod ile Fotoğraf Paylaş',
      description: 'Kafe deneyimini fotoğraflarla paylaş. QR kod taraması ile güvenli paylaşım. Cafe sahiplerine marka kontrolü.',
      keywords: ['kafe paylaşım', 'fotoğraf paylaş', 'QR kod kafe', 'topluluk platformu'],
      type: 'website',
      image: 'https://sharevibe.com/og-image.jpg',
    },
    '/'
  )

  return (
    <main>
      <h1>ShareVibe - Topluluk Odaklı Kafe Deneyimi</h1>
      
      <section>
        <h2>Kafe Fotoğraflarını Paylaş</h2>
        <p>QR kod taraması ile güvenli ve kolay paylaşım yapın...</p>
        <button onClick={() => trackUserInteraction('cta_click', { cta: 'upload' })}>
          Fotoğraf Paylaş
        </button>
      </section>

      <section>
        <h2>Nasıl Çalışır?</h2>
        {/* ... */}
      </section>
    </main>
  )
}
\`\`\`

---

## 4. Use in Cafe Page Component

\`\`\`tsx
import { useEffect } from 'react'
import { usePageMeta } from '../hooks/usePageMeta'
import { injectSchema, createLocalBusinessSchema, createBreadcrumbSchema, createImageSchema } from '../seo/schemas'
import { trackContentView } from '../seo/utils'

export function CafePage({ cafeSlug, cafeData }: any) {
  usePageMeta(
    {
      title: \`\${cafeData.name} - ShareVibe Kafe Galerisi | Fotoğraf Paylaşım\`,
      description: \`\${cafeData.description}. ShareVibe'da kafe fotoğraflarını keşfedin ve paylaşın.\`,
      keywords: [\`\${cafeData.name} fotoğraf\`, 'kafe galeri', cafeData.slug],
      image: cafeData.images?.[0]?.url || 'https://sharevibe.com/cafe-default.jpg',
      type: 'product',
      breadcrumbs: [
        { name: 'Ana Sayfa', url: '/' },
        { name: 'Kafeler', url: '/cafes' },
        { name: cafeData.name, url: \`/cafe/\${cafeSlug}\` },
      ],
    },
    \`/cafe/\${cafeSlug}\`
  )

  useEffect(() => {
    // Inject LocalBusiness schema
    injectSchema(createLocalBusinessSchema({
      name: cafeData.name,
      slug: cafeSlug,
      address: cafeData.address,
      phone: cafeData.phone,
      image: cafeData.images?.[0]?.url,
      description: cafeData.description,
      rating: cafeData.rating,
      ratingCount: cafeData.reviewCount,
    }))

    // Inject Breadcrumb schema
    injectSchema(createBreadcrumbSchema([
      { name: 'Ana Sayfa', url: 'https://sharevibe.com/' },
      { name: 'Kafeler', url: 'https://sharevibe.com/cafes' },
      { name: cafeData.name, url: \`https://sharevibe.com/cafe/\${cafeSlug}\` },
    ]))

    // Track content view
    trackContentView('cafe', cafeData.id, cafeData.name)
  }, [cafeSlug, cafeData])

  return (
    <article>
      <header>
        <h1>\${cafeData.name}</h1>
        <p>\${cafeData.description}</p>
      </header>

      <section>
        <h2>Galeri</h2>
        {cafeData.images?.map((image: any) => (
          <figure key={image.id}>
            <img
              src={image.url}
              alt={image.caption || cafeData.name}
              title={image.caption}
            />
            {image.caption && <figcaption>{image.caption}</figcaption>}
          </figure>
        ))}
      </section>
    </article>
  )
}
\`\`\`

---

## 5. Use in Blog Post Component

\`\`\`tsx
import { useEffect } from 'react'
import { usePageMeta } from '../hooks/usePageMeta'
import { injectSchema, createArticleSchema } from '../seo/schemas'

export function BlogPost({ article }: any) {
  usePageMeta(
    {
      title: \`\${article.title} | ShareVibe Blog | Kafe Rehberi\`,
      description: article.excerpt || article.description,
      keywords: article.keywords || [],
      image: article.featured_image,
      type: 'article',
      author: article.author,
      publishedDate: article.published_date,
      breadcrumbs: [
        { name: 'Ana Sayfa', url: '/' },
        { name: 'Blog', url: '/blog' },
        { name: article.title, url: \`/blog/\${article.slug}\` },
      ],
    },
    \`/blog/\${article.slug}\`
  )

  useEffect(() => {
    // Inject Article schema
    injectSchema(createArticleSchema({
      title: article.title,
      description: article.description,
      image: article.featured_image,
      author: article.author,
      datePublished: article.published_date,
      dateModified: article.updated_date,
      url: \`https://sharevibe.com/blog/\${article.slug}\`,
    }))
  }, [article])

  return (
    <article>
      <header>
        <h1>{article.title}</h1>
        <p className="meta">
          Yazar: {article.author} | Tarih: {new Date(article.published_date).toLocaleDateString('tr-TR')}
        </p>
      </header>

      <img src={article.featured_image} alt={article.title} />

      <section dangerouslySetInnerHTML={{ __html: article.content }} />

      <footer>
        <p>Etiketler: {article.keywords?.join(', ')}</p>
      </footer>
    </article>
  )
}
\`\`\`

---

## 6. Google Analytics Integration

Add GA4 tracking to form submissions, clicks, etc:

\`\`\`tsx
import { trackEvent, trackConversion } from '../seo/utils'

// Track form submission
function handleUpload() {
  // ... upload logic
  trackConversion('upload', 1) // value: 1 media uploaded
}

// Track clicks
function handleCafeClick(cafeId: string) {
  trackEvent('cafe_click', { cafe_id: cafeId })
}

// Track searches
function handleSearch(query: string) {
  trackEvent('search', { search_term: query })
}

// Track likes
function handleLike(mediaId: string) {
  trackConversion('like', 1)
}
\`\`\`

---

## 7. Performance Monitoring

Monitor Core Web Vitals in production:

\`\`\`tsx
import { logSEOReport } from '../seo/utils'

// On page mount, log performance report
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    const timer = setTimeout(() => {
      logSEOReport()
    }, 3000)
    return () => clearTimeout(timer)
  }
}, [])
\`\`\`

---

## 8. Testing

### Test meta tags in browser
\`\`\`javascript
// In browser console:
document.querySelector('meta[name="description"]').content
document.querySelector('meta[property="og:title"]').content
document.title
\`\`\`

### Test JSON-LD schema
\`\`\`javascript
// In browser console:
JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)
\`\`\`

### Test with SEO validators
- Google Rich Results Test: https://search.google.com/test/rich-results
- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- Twitter Card Validator: https://cards-dev.twitter.com/validator

---

## 9. Best Practices

✅ **DO:**
- Use unique titles for each page (50-60 characters)
- Write compelling descriptions (150-160 characters)
- Include primary keyword in title & description
- Add H1 once per page
- Use proper heading hierarchy (H1 → H2 → H3)
- Add alt text to all images
- Use semantic HTML (<article>, <section>, etc.)
- Optimize images (compress, responsive sizes)
- Create internal links to relevant pages
- Monitor Google Search Console regularly

❌ **DON'T:**
- Duplicate meta descriptions
- Keyword stuffing
- Hide text or links (cloaking)
- Create doorway pages
- Use auto-redirects on homepage
- Copy content from other sites
- Ignore mobile optimization
- Ignore page speed
- Mix HTTP and HTTPS URLs
- Use noindex on important pages

---

## 10. Checklist Before Launch

- [ ] All pages have unique title tags
- [ ] All pages have meta descriptions
- [ ] H1 tag present on all pages
- [ ] Heading hierarchy is correct
- [ ] Images have alt text
- [ ] Internal links point to important content
- [ ] robots.txt is correct
- [ ] sitemap.xml is generated and linked
- [ ] Canonical tags are proper
- [ ] OG tags are present
- [ ] Twitter Cards are present
- [ ] JSON-LD schemas are valid
- [ ] Mobile version is optimized
- [ ] Page speed is acceptable
- [ ] No broken links
- [ ] Redirects are 301 (permanent)
- [ ] HTTPS is enabled
- [ ] Search Console property is added

---

## 11. Next Steps

1. ✅ Complete Phase 1 setup (done)
2. ⏳ Integrate utilities into components (now)
3. ⏳ Setup Google Analytics
4. ⏳ Generate sitemaps
5. ⏳ Create content (blog, guides)
6. ⏳ Submit to Search Console
7. ⏳ Monitor performance
8. ⏳ Optimize further based on data
`;

export default REACT_SEO_INTEGRATION_GUIDE;

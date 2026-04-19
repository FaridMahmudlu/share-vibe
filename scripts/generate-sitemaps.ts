/**
 * Sitemap Generator for ShareVibe
 * Generates XML sitemaps for SEO
 * Run: npm run generate:sitemaps
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

interface SitemapImage {
  loc: string;
  title: string;
  caption?: string;
}

interface SitemapPage extends SitemapEntry {
  images?: SitemapImage[];
}

// ============================================
// Sitemap URLs
// ============================================

const DOMAIN = 'https://sharevibe.co';
const TODAY = new Date().toISOString().split('T')[0];

// Static pages (high priority)
const staticPages: SitemapEntry[] = [
  {
    url: `${DOMAIN}/`,
    lastmod: TODAY,
    changefreq: 'daily',
    priority: 1.0,
  },
  {
    url: `${DOMAIN}/about`,
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.8,
  },
  {
    url: `${DOMAIN}/features`,
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.8,
  },
  {
    url: `${DOMAIN}/pricing`,
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.7,
  },
  {
    url: `${DOMAIN}/blog`,
    lastmod: TODAY,
    changefreq: 'daily',
    priority: 0.9,
  },
  {
    url: `${DOMAIN}/contact`,
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.5,
  },
  {
    url: `${DOMAIN}/privacy-policy`,
    lastmod: TODAY,
    changefreq: 'yearly',
    priority: 0.3,
  },
  {
    url: `${DOMAIN}/terms-of-service`,
    lastmod: TODAY,
    changefreq: 'yearly',
    priority: 0.3,
  },
];

// Example cafe pages (these would be dynamic in production)
const cafePages: SitemapEntry[] = [
  {
    url: `${DOMAIN}/cafe/my-coffee-shop`,
    lastmod: TODAY,
    changefreq: 'daily',
    priority: 0.9,
  },
  {
    url: `${DOMAIN}/cafe/espresso-bar`,
    lastmod: TODAY,
    changefreq: 'daily',
    priority: 0.9,
  },
  {
    url: `${DOMAIN}/cafe/filter-coffee-house`,
    lastmod: TODAY,
    changefreq: 'daily',
    priority: 0.9,
  },
];

// Blog posts (these would be dynamic in production)
const blogPages: SitemapEntry[] = [
  {
    url: `${DOMAIN}/blog/kafe-fotografciligi-ipuclari`,
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.8,
  },
  {
    url: `${DOMAIN}/blog/en-iyi-kahve-cesitleri`,
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.8,
  },
  {
    url: `${DOMAIN}/blog/kafe-isletmeciligi-rehberi`,
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.8,
  },
];

// ============================================
// Sitemap XML Generation
// ============================================

function generateSitemapXML(entries: SitemapEntry[]): string {
  const urlElements = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.url)}</loc>
    ${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}
    ${entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : ''}
    ${entry.priority !== undefined ? `<priority>${entry.priority}</priority>` : ''}
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0">
${urlElements}
</urlset>`;
}

// ============================================
// Image Sitemap (for gallery images)
// ============================================

function generateImageSitemapXML(pages: SitemapPage[]): string {
  const urlElements = pages
    .filter((page) => page.images && page.images.length > 0)
    .map((page) => {
      const imageElements = page.images!
        .map(
          (img) => `    <image:image>
      <image:loc>${escapeXml(img.loc)}</image:loc>
      <image:title>${escapeXml(img.title)}</image:title>
      ${img.caption ? `<image:caption>${escapeXml(img.caption)}</image:caption>` : ''}
    </image:image>`
        )
        .join('\n');

      return `  <url>
    <loc>${escapeXml(page.url)}</loc>
${imageElements}
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlElements}
</urlset>`;
}

// ============================================
// Sitemap Index (for large sitemaps)
// ============================================

function generateSitemapIndex(
  sitemaps: { loc: string; lastmod?: string }[]
): string {
  const sitemapElements = sitemaps
    .map(
      (sitemap) => `  <sitemap>
    <loc>${escapeXml(sitemap.loc)}</loc>
    ${sitemap.lastmod ? `<lastmod>${sitemap.lastmod}</lastmod>` : ''}
  </sitemap>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapElements}
</sitemapindex>`;
}

// ============================================
// Utility Functions
// ============================================

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================
// Main Generation Function
// ============================================

export function generateSitemaps(): void {
  try {
    // Ensure public directory exists
    mkdirSync(join(process.cwd(), 'public'), { recursive: true });

    // 1. Generate Main Sitemap
    const mainSitemap = generateSitemapXML([...staticPages, ...cafePages, ...blogPages]);
    writeFileSync(join(process.cwd(), 'public', 'sitemap.xml'), mainSitemap);
    console.log('✅ Generated: public/sitemap.xml');

    // 2. Generate Cafe Sitemap
    const cafeSitemap = generateSitemapXML(cafePages);
    writeFileSync(join(process.cwd(), 'public', 'sitemap-cafes.xml'), cafeSitemap);
    console.log('✅ Generated: public/sitemap-cafes.xml');

    // 3. Generate Blog Sitemap
    const blogSitemap = generateSitemapXML(blogPages);
    writeFileSync(join(process.cwd(), 'public', 'sitemap-blog.xml'), blogSitemap);
    console.log('✅ Generated: public/sitemap-blog.xml');

    // 4. Generate Image Sitemap (example)
    const imagePages: SitemapPage[] = [
      {
        url: `${DOMAIN}/cafe/my-coffee-shop`,
        lastmod: TODAY,
        changefreq: 'daily',
        priority: 0.9,
        images: [
          {
            loc: `${DOMAIN}/images/cafe-interior-1.jpg`,
            title: 'My Coffee Shop Interior',
            caption: 'Modern coffee shop with comfortable seating',
          },
          {
            loc: `${DOMAIN}/images/cafe-coffee-1.jpg`,
            title: 'Freshly Brewed Coffee',
            caption: 'Specialty coffee served fresh',
          },
        ],
      },
    ];
    const imageSitemap = generateImageSitemapXML(imagePages);
    writeFileSync(join(process.cwd(), 'public', 'sitemap-images.xml'), imageSitemap);
    console.log('✅ Generated: public/sitemap-images.xml');

    // 5. Generate Sitemap Index
    const sitemapIndex = generateSitemapIndex([
      { loc: `${DOMAIN}/sitemap.xml`, lastmod: TODAY },
      { loc: `${DOMAIN}/sitemap-cafes.xml`, lastmod: TODAY },
      { loc: `${DOMAIN}/sitemap-blog.xml`, lastmod: TODAY },
      { loc: `${DOMAIN}/sitemap-images.xml`, lastmod: TODAY },
    ]);
    writeFileSync(join(process.cwd(), 'public', 'sitemap-index.xml'), sitemapIndex);
    console.log('✅ Generated: public/sitemap-index.xml');

    console.log('\n📊 Sitemap generation complete!');
    console.log(`📍 ${cafePages.length} cafe pages`);
    console.log(`📍 ${blogPages.length} blog pages`);
    console.log(`📍 ${staticPages.length} static pages`);
  } catch (error) {
    console.error('❌ Error generating sitemaps:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSitemaps();
}

export default generateSitemaps;

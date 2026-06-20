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

const staticPages: SitemapEntry[] = [
  {
    url: `${DOMAIN}/`,
    lastmod: TODAY,
    changefreq: 'daily',
    priority: 1.0,
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

const cafePages: SitemapEntry[] = [];
const blogPages: SitemapEntry[] = [];

const brandImages: SitemapImage[] = [
  {
    loc: `${DOMAIN}/sharevibe-logo.png`,
    title: 'ShareVibe logo',
    caption: 'ShareVibe marka logosu',
  },
  {
    loc: `${DOMAIN}/sharevibe-icon.png`,
    title: 'ShareVibe uygulama ikonu',
    caption: 'ShareVibe PWA ve favicon ikonu',
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
    const mainSitemap = generateSitemapXML(staticPages);
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

    // 4. Generate Image Sitemap with real public brand assets.
    const imagePages: SitemapPage[] = staticPages.map((page) => ({
      ...page,
      images: brandImages,
    }));
    const imageSitemap = generateImageSitemapXML(imagePages);
    writeFileSync(join(process.cwd(), 'public', 'sitemap-images.xml'), imageSitemap);
    console.log('✅ Generated: public/sitemap-images.xml');

    // 5. Generate Sitemap Index
    const sitemapIndex = generateSitemapIndex([
      { loc: `${DOMAIN}/sitemap.xml`, lastmod: TODAY },
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

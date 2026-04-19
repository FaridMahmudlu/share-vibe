/**
 * Sitemap Generator for ShareVibe
 * Generates XML sitemaps for SEO
 * Run: npm run generate:sitemaps
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// Sitemap URLs
// ============================================

const DOMAIN = 'https://sharevibe.co';
const TODAY = new Date().toISOString().split('T')[0];

// Static pages (high priority)
const staticPages = [
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
    changefreq: 'monthly',
    priority: 0.7,
  },
  {
    url: `${DOMAIN}/blog`,
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.8,
  },
  {
    url: `${DOMAIN}/contact`,
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.6,
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

// Cafe pages (medium priority - these are examples, in production fetch from database)
const cafePages = [
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

// Blog pages (medium-low priority)
const blogPages = [
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

// Gallery images (for image sitemap)
const images = [
  {
    loc: `${DOMAIN}/images/coffee-1.jpg`,
    title: 'Coffee Photography 1',
    caption: 'Beautiful coffee shot',
  },
  {
    loc: `${DOMAIN}/images/coffee-2.jpg`,
    title: 'Coffee Photography 2',
    caption: 'Latte art showcase',
  },
  {
    loc: `${DOMAIN}/images/cafe-interior.jpg`,
    title: 'Cafe Interior',
    caption: 'Modern cafe design',
  },
];

// ============================================
// XML Generation Functions
// ============================================

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateSitemapXML(entries) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  entries.forEach((entry) => {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(entry.url)}</loc>\n`;
    if (entry.lastmod) {
      xml += `    <lastmod>${entry.lastmod}</lastmod>\n`;
    }
    if (entry.changefreq) {
      xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
    }
    if (entry.priority !== undefined) {
      xml += `    <priority>${entry.priority}</priority>\n`;
    }
    xml += '  </url>\n';
  });

  xml += '</urlset>';
  return xml;
}

function generateImageSitemapXML(pages, images) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '             xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

  pages.forEach((page) => {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(page.url)}</loc>\n`;
    if (page.lastmod) {
      xml += `    <lastmod>${page.lastmod}</lastmod>\n`;
    }

    // Add images
    images.forEach((image) => {
      xml += '    <image:image>\n';
      xml += `      <image:loc>${escapeXml(image.loc)}</image:loc>\n`;
      if (image.title) {
        xml += `      <image:title>${escapeXml(image.title)}</image:title>\n`;
      }
      if (image.caption) {
        xml += `      <image:caption>${escapeXml(image.caption)}</image:caption>\n`;
      }
      xml += '    </image:image>\n';
    });

    xml += '  </url>\n';
  });

  xml += '</urlset>';
  return xml;
}

function generateSitemapIndex(sitemaps) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  sitemaps.forEach((sitemap) => {
    xml += '  <sitemap>\n';
    xml += `    <loc>${escapeXml(sitemap.url)}</loc>\n`;
    if (sitemap.lastmod) {
      xml += `    <lastmod>${sitemap.lastmod}</lastmod>\n`;
    }
    xml += '  </sitemap>\n';
  });

  xml += '</sitemapindex>';
  return xml;
}

// ============================================
// Generate Sitemaps
// ============================================

function generateSitemaps() {
  // Ensure public directory exists
  const publicDir = join(__dirname, '../public');
  mkdirSync(publicDir, { recursive: true });

  // 1. Main sitemap (all pages)
  const allPages = [...staticPages, ...cafePages, ...blogPages];
  const mainSitemap = generateSitemapXML(allPages);
  writeFileSync(join(publicDir, 'sitemap.xml'), mainSitemap);
  console.log('✅ Generated: public/sitemap.xml');

  // 2. Cafe sitemap
  const cafeSitemap = generateSitemapXML(cafePages);
  writeFileSync(join(publicDir, 'sitemap-cafes.xml'), cafeSitemap);
  console.log('✅ Generated: public/sitemap-cafes.xml');

  // 3. Blog sitemap
  const blogSitemap = generateSitemapXML(blogPages);
  writeFileSync(join(publicDir, 'sitemap-blog.xml'), blogSitemap);
  console.log('✅ Generated: public/sitemap-blog.xml');

  // 4. Image sitemap
  const imageSitemap = generateImageSitemapXML(allPages, images);
  writeFileSync(join(publicDir, 'sitemap-images.xml'), imageSitemap);
  console.log('✅ Generated: public/sitemap-images.xml');

  // 5. Sitemap index
  const sitemapIndex = generateSitemapIndex([
    { url: `${DOMAIN}/sitemap.xml`, lastmod: TODAY },
    { url: `${DOMAIN}/sitemap-cafes.xml`, lastmod: TODAY },
    { url: `${DOMAIN}/sitemap-blog.xml`, lastmod: TODAY },
    { url: `${DOMAIN}/sitemap-images.xml`, lastmod: TODAY },
  ]);
  writeFileSync(join(publicDir, 'sitemap-index.xml'), sitemapIndex);
  console.log('✅ Generated: public/sitemap-index.xml');

  console.log('\n✨ All sitemaps generated successfully!');
  console.log('📁 Location: public/');
  console.log('\n📋 Sitemaps created:');
  console.log('   - sitemap.xml (all pages)');
  console.log('   - sitemap-cafes.xml (cafe pages)');
  console.log('   - sitemap-blog.xml (blog posts)');
  console.log('   - sitemap-images.xml (images)');
  console.log('   - sitemap-index.xml (index)');
}

// Run generator
generateSitemaps();

/**
 * IMAGE OPTIMIZATION STRATEGY & GUIDE
 * Complete image SEO and performance optimization
 */

export const IMAGE_OPTIMIZATION_GUIDE = {
  // ============================================
  // WHY IMAGE OPTIMIZATION MATTERS
  // ============================================
  importance: {
    seo: 'Images are 3rd ranking factor (behind content & links)',
    performance: 'Images = 50-80% of page load time',
    conversions: 'Optimized images improve user experience 30-40%',
    accessibility: 'Alt text improves accessibility for screen readers',
  },

  // ============================================
  // IMAGE SEO FUNDAMENTALS
  // ============================================
  seoFundamentals: {
    // ============================================
    // 1. IMAGE FILENAMES
    // ============================================
    filenames: {
      title: '1. Image Filenames (Affects SEO)',
      badExamples: [
        'IMG_2024.jpg ❌ (generic)',
        'photo123.jpg ❌ (meaningless)',
        'DSC_0001.jpg ❌ (camera default)',
      ],
      goodExamples: [
        'espresso-shot-dark-roast.jpg ✓',
        'latte-art-heart-design.jpg ✓',
        'cafe-interior-istanbul.jpg ✓',
        'coffee-beans-premium-blend.jpg ✓',
      ],
      guidelines: [
        'Use descriptive, keyword-rich filenames',
        'Use hyphens (not underscores) to separate words',
        'Keep filename under 75 characters',
        'Include main keyword if relevant',
        'Be specific about content',
      ],
    },

    // ============================================
    // 2. ALT TEXT
    // ============================================
    altText: {
      title: '2. Alt Text (Image Description)',
      importance: 'Critical for SEO and accessibility',
      badExamples: [
        'alt="image" ❌ (not descriptive)',
        'alt="photo" ❌ (generic)',
        'alt="" ❌ (empty)',
        'alt="DSC_0001" ❌ (filename, not description)',
      ],
      goodExamples: [
        'alt="Dark roast espresso shot with crema foam" ✓',
        'alt="Latte art heart design in white cup" ✓',
        'alt="Cozy cafe interior in Istanbul with wooden tables" ✓',
        'alt="Premium single-origin coffee beans from Ethiopia" ✓',
      ],
      guidelines: [
        'Describe what the image shows (125 chars max)',
        'Include relevant keywords naturally',
        'Be specific and descriptive',
        'No need to say "image of" or "picture of"',
        'For decorative images: use alt="" or role="presentation"',
        'Don\'t keyword stuff',
      ],
      formula: '[Subject] + [Action/Characteristic] + [Context]',
      example: {
        subject: 'Cappuccino',
        action: 'with 3D latte art design',
        context: 'in ceramic cup at modern Istanbul cafe',
        result: 'Cappuccino with 3D latte art design in ceramic cup at modern Istanbul cafe',
      },
    },

    // ============================================
    // 3. IMAGE TITLE ATTRIBUTE
    // ============================================
    imageTitle: {
      title: '3. Image Title Attribute (HTML)',
      code: '<img src="espresso.jpg" alt="Dark espresso shot" title="Professional espresso extraction" />',
      purpose: 'Shows tooltip on hover (not major SEO impact, but good UX)',
      format: 'Similar to alt text but can be more descriptive',
    },

    // ============================================
    // 4. SURROUNDING TEXT (CONTEXT)
    // ============================================
    surroundingText: {
      title: '4. Surrounding Text (Content Context)',
      importance: 'Google reads text around images to understand context',
      example: {
        good: `
The espresso machine pumps water at 9 bars of pressure, 
extracting a shot of [IMAGE: espresso-shot.jpg] dark roast coffee. 
This pressure extraction method is standard in professional cafes.
        `,
        bad: `
Here's a picture [IMAGE: photo.jpg]
        `,
      },
      guidelines: [
        'Use keywords in surrounding paragraphs',
        'Place caption near image with keywords',
        'Link to related pages near image',
        'Use proper heading structure nearby',
      ],
    },
  },

  // ============================================
  // IMAGE TECHNICAL OPTIMIZATION
  // ============================================
  technicalOptimization: {
    // ============================================
    // 1. FILE FORMAT & COMPRESSION
    // ============================================
    fileFormat: {
      title: '1. Image Format Selection',
      formats: [
        {
          format: 'JPEG',
          pros: 'Small file size, universal support',
          cons: 'Lossy quality, not great for sharp text',
          bestFor: 'Photos, coffee cup shots, cafe scenes',
          quality: 'Use 75-85% quality setting',
        },
        {
          format: 'PNG',
          pros: 'Lossless quality, supports transparency',
          cons: 'Larger file size (2-3x JPEG)',
          bestFor: 'Logos, graphics, images with text',
          quality: 'Use 8-bit if possible (smaller)',
        },
        {
          format: 'WebP (Recommended)',
          pros: '25-35% smaller than JPEG, better quality',
          cons: 'Not supported in older browsers',
          bestFor: 'All images with JPEG fallback',
          support: 'Use with <picture> tag for compatibility',
        },
        {
          format: 'AVIF (Future-proof)',
          pros: '50-80% smaller than JPEG, superior quality',
          cons: 'Limited browser support (newer only)',
          bestFor: 'Hero images, high-quality shots',
          support: 'Use with fallback chain: AVIF → WebP → JPEG',
        },
      ],
    },

    // ============================================
    // 2. IMAGE COMPRESSION
    // ============================================
    compression: {
      title: '2. Image Compression Tools',
      tools: [
        {
          name: 'TinyPNG/TinyJPG (Recommended for beginners)',
          url: 'https://tinypng.com',
          compression: 'Lossy, 50-70% reduction',
          speed: 'Very fast',
          cost: 'Free for 20 files/month',
        },
        {
          name: 'ImageOptim (Mac)',
          url: 'https://imageoptim.com',
          compression: 'Lossless, 30-40% reduction',
          speed: 'Fast batch processing',
          cost: 'Free',
        },
        {
          name: 'ImageMagick (Command-line)',
          command: 'convert input.jpg -quality 80 -strip output.jpg',
          compression: 'Lossy, customizable',
          speed: 'Very fast with scripts',
          cost: 'Free',
        },
        {
          name: 'FFmpeg (Advanced)',
          command: 'ffmpeg -i input.jpg -q:v 5 output.webp',
          compression: 'Multiple formats',
          cost: 'Free',
        },
      ],
      guidelines: [
        'Compress BEFORE uploading to website',
        'Test quality after compression',
        'Aim for < 100KB per image',
        'Aim for < 50KB for thumbnails',
      ],
    },

    // ============================================
    // 3. IMAGE DIMENSIONS & SIZING
    // ============================================
    sizing: {
      title: '3. Image Sizing & Responsive Images',
      responsive_images: {
        description: 'Serve different image sizes for different devices',
        html: `
<picture>
  <!-- AVIF format (best quality) -->
  <source srcset="image.avif" type="image/avif">
  
  <!-- WebP format (better than JPEG) -->
  <source srcset="image.webp" type="image/webp">
  
  <!-- JPEG fallback (all browsers) -->
  <img src="image.jpg" alt="Coffee cup">
</picture>

<!-- OR with srcset for responsiveness -->
<img 
  src="coffee-400.jpg"
  srcset="
    coffee-400.jpg 400w,
    coffee-800.jpg 800w,
    coffee-1200.jpg 1200w,
    coffee-1600.jpg 1600w
  "
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 50vw"
  alt="Coffee cup"
/>
        `,
        sizes: {
          mobile: '400px (up to 640px screens)',
          tablet: '800px (640px to 1024px)',
          desktop: '1200px (1024px to 1440px)',
          'large-desktop': '1600px (1440px+)',
        },
      },
      dimensions: [
        '✓ Hero images: 1920x1080px (max 100KB after compression)',
        '✓ Article images: 1200x800px (max 80KB)',
        '✓ Thumbnails: 400x300px (max 30KB)',
        '✓ Social media: 1200x630px (OG image)',
      ],
    },

    // ============================================
    // 4. LAZY LOADING
    // ============================================
    lazyLoading: {
      title: '4. Lazy Loading (Performance)',
      importance: 'Load images only when user scrolls to them',
      html: '<img src="coffee.jpg" alt="Coffee" loading="lazy">',
      guidelines: [
        'Add loading="lazy" attribute to all <img> tags',
        'Prioritize above-the-fold images (loading="eager")',
        'Use placeholder images while loading',
        'Improves page speed by 20-40%',
      ],
    },

    // ============================================
    // 5. CDN & IMAGE SERVING
    // ============================================
    cdn: {
      title: '5. Use CDN for Image Serving',
      benefits: [
        'Images served from nearest server (faster)',
        'Automatic compression & optimization',
        'Multiple format conversion',
        'Better cache headers',
      ],
      options: [
        {
          service: 'Cloudflare Image Optimization',
          note: 'Included with Cloudflare',
          features: 'Auto WebP, auto AVIF, adaptive sizing',
        },
        {
          service: 'Firebase Storage',
          note: 'Already using Firebase',
          features: 'Global CDN, image serving, 7-day URL expiration',
        },
        {
          service: 'ImageKit.io',
          cost: 'Free tier: 25GB/month',
          features: 'Real-time optimization, responsive images',
        },
        {
          service: 'Imgix',
          cost: 'Paid',
          features: 'Advanced optimization, URL-based transformations',
        },
      ],
    },
  },

  // ============================================
  // IMAGE SITEMAPS
  // ============================================
  imageSitemaps: {
    title: 'Image Sitemaps (Already Generated)',
    purpose: 'Tells Google about all images on your site',
    file: 'public/sitemap-images.xml',
    includes: [
      'Image URLs',
      'Image alt text (as caption)',
      'Image title',
      'Image upload date',
      'Image author',
    ],
    automation: 'Generate via: npm run generate:sitemaps',
  },

  // ============================================
  // SCHEMA MARKUP FOR IMAGES
  // ============================================
  schemaMarkup: {
    title: 'Image Schema Markup',
    description: 'Tells search engines about your images',
    example: {
      code: `
{
  "@context": "https://schema.org",
  "@type": "ImageObject",
  "url": "https://sharevibe.com/images/espresso.jpg",
  "name": "Espresso shot with crema",
  "description": "Dark roast espresso with rich crema foam",
  "uploadDate": "2024-01-15",
  "author": {
    "@type": "Person",
    "name": "ShareVibe"
  }
}
      `,
    },
    benefits: 'Can appear in image search results with rich snippets',
  },

  // ============================================
  // IMAGE OPTIMIZATION CHECKLIST
  // ============================================
  checklist: [
    '✓ Filename is descriptive and keyword-rich',
    '✓ Alt text is 80-125 characters, descriptive',
    '✓ Image is compressed (JPEG <100KB, PNG <150KB)',
    '✓ Image format is optimized (WebP or JPEG)',
    '✓ Image has proper dimensions (not stretched)',
    '✓ Responsive images with srcset (if relevant)',
    '✓ Lazy loading enabled (loading="lazy")',
    '✓ Surrounding text contains keywords',
    '✓ Image included in sitemap',
    '✓ Image schema markup added (optional)',
    '✓ Image cached properly (cache headers set)',
  ],

  // ============================================
  // BATCH OPTIMIZATION SCRIPT
  // ============================================
  batchOptimization: {
    title: 'Batch Image Optimization Workflow',
    steps: [
      {
        step: '1. Export from Camera/Phone',
        note: 'Original images (usually 2-5 MB each)',
      },
      {
        step: '2. Bulk Compression',
        tool: 'TinyPNG or ImageMagick',
        reduction: 'Reduce to ~200-300KB each',
      },
      {
        step: '3. Rename with Keywords',
        example: 'latte-art-flower-design-cafe.jpg',
      },
      {
        step: '4. Resize for Web',
        sizes: '1200px width, 800px height for article images',
      },
      {
        step: '5. Create Alt Text',
        guidelines: 'Descriptive, include keywords',
      },
      {
        step: '6. Create WebP Version',
        tool: 'FFmpeg or TinyPNG',
        command: 'ffmpeg -i image.jpg image.webp',
      },
      {
        step: '7. Upload to Website',
        location: 'Firebase Storage or public/ folder',
      },
      {
        step: '8. Add to Sitemap',
        auto: 'npm run generate:sitemaps',
      },
    ],
  },

  // ============================================
  // CORE WEB VITALS & IMAGES
  // ============================================
  coreWebVitals: {
    title: 'Impact on Core Web Vitals',
    lcp: {
      metric: 'LCP (Largest Contentful Paint)',
      target: '< 2.5 seconds',
      improvement: 'Optimize hero images (compress, lazy-load deferral)',
    },
    fid: {
      metric: 'FID (First Input Delay)',
      target: '< 100ms',
      improvement: 'Not directly affected by images (more JS-related)',
    },
    cls: {
      metric: 'CLS (Cumulative Layout Shift)',
      target: '< 0.1',
      improvement: 'Set image dimensions to prevent layout shifts',
    },
  },

  // ============================================
  // IMAGE SEOAUDIT
  // ============================================
  auditTools: {
    title: 'Tools to Audit Image SEO',
    tools: [
      {
        tool: 'Google Lighthouse',
        includes: 'Image optimization recommendations',
      },
      {
        tool: 'PageSpeed Insights',
        includes: 'Image format recommendations (WebP/AVIF)',
      },
      {
        tool: 'Google Search Console',
        shows: 'Indexed images, image search impressions',
      },
      {
        tool: 'Screaming Frog',
        shows: 'All images, missing alt text, large files',
      },
    ],
  },

  // ============================================
  // COMMON MISTAKES TO AVOID
  // ============================================
  commonMistakes: [
    {
      mistake: 'Using generic filenames (photo1.jpg)',
      solution: 'Use descriptive, keyword-rich names',
    },
    {
      mistake: 'Missing alt text or keyword-stuffing alt text',
      solution: 'Write natural, descriptive alt text',
    },
    {
      mistake: 'Uploading huge images (5+ MB)',
      solution: 'Compress to 50-200KB before uploading',
    },
    {
      mistake: 'Using only JPEG (not WebP/AVIF)',
      solution: 'Offer WebP with JPEG fallback',
    },
    {
      mistake: 'Not using responsive images',
      solution: 'Use srcset for different screen sizes',
    },
    {
      mistake: 'Not enabling lazy loading',
      solution: 'Add loading="lazy" to all images',
    },
    {
      mistake: 'Ignoring surrounding text context',
      solution: 'Use keywords in captions and nearby text',
    },
  ],
};

export default IMAGE_OPTIMIZATION_GUIDE;

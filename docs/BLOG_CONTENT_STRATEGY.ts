/**
 * BLOG CONTENT STRATEGY & TEMPLATES
 * Content plan for organic SEO growth
 */

export const BLOG_CONTENT_STRATEGY = {
  // ============================================
  // CONTENT PILLARS
  // ============================================
  contentPillars: {
    pillar1: {
      name: 'Kafe Fotografçılığı (Coffee Photography)',
      description: 'Photography tips, techniques, equipment',
      keywords: [
        'kafe fotoğrafçılığı',
        'kahve fotoğrafçılığı',
        'latte art fotoğrafçılığı',
        'profesyonel kafe fotoğrafı',
        'kamera ayarları kahve',
      ],
      articlesPlanned: 5,
    },
    pillar2: {
      name: 'Kahve Kültürü (Coffee Culture)',
      description: 'Coffee types, origin, brewing methods, culture',
      keywords: [
        'en iyi kahve çeşitleri',
        'kahve kültürü Türkiye',
        'specialty coffee',
        'espresso vs americano',
        'kahve demleme yöntemleri',
      ],
      articlesPlanned: 4,
    },
    pillar3: {
      name: 'Kafe İşletmeciliği (Cafe Management)',
      description: 'Running a cafe, marketing, customer service',
      keywords: [
        'kafe işletmeciliği',
        'kafe pazarlama stratejisi',
        'müşteri hizmetleri',
        'kafe sosyal medya',
        'kafe branding',
      ],
      articlesPlanned: 3,
    },
    pillar4: {
      name: 'ShareVibe Rehberleri (ShareVibe Guides)',
      description: 'How to use ShareVibe, features, best practices',
      keywords: [
        'ShareVibe nasıl kullanılır',
        'kafe QR kodu',
        'fotoğraf paylaşma',
        'kafe galerisi',
      ],
      articlesPlanned: 3,
    },
  },

  // ============================================
  // BLOG POST TEMPLATES
  // ============================================
  templates: {
    // ============================================
    // TEMPLATE 1: How-to Guide
    // ============================================
    howToGuide: {
      title: 'How-To Guide Template',
      structure: [
        {
          section: 'Title (H1)',
          example: 'Profesyonel Kafe Fotoğrafı Çekmek İçin 10 İpucu',
          seoTips: 'Include main keyword, use power words (10, Profesyonel, İpucu)',
        },
        {
          section: 'Meta Description (160 chars)',
          example: 'Kafe fotoğrafı çekmek için profesyonel ipuçları. Işık ayarları, açı, kamera ayarları ve daha fazla...',
        },
        {
          section: 'Introduction (H2)',
          guidelines: [
            'Hook: Start with a question or interesting fact',
            'Problem: Explain what readers struggle with',
            'Solution: Hint at what they\'ll learn',
            'Length: 100-150 words',
          ],
        },
        {
          section: 'Table of Contents',
          guidelines: 'Add TOC with links to jump to sections (improves UX & SEO)',
        },
        {
          section: 'Main Content (10 Tips)',
          guidelines: [
            'Use H2 for each tip',
            'Each tip: 150-200 words with practical details',
            'Include images/screenshots for visual clarity',
            'Add actionable steps/checklists',
            'Include relevant long-tail keywords naturally',
          ],
        },
        {
          section: 'Conclusion (H2)',
          guidelines: [
            'Summarize main takeaways',
            'Include CTA (Call-to-Action)',
            'Link to related content internally',
            'Encourage social sharing',
          ],
        },
      ],
      wordCount: '2000-3000 words optimal',
    },

    // ============================================
    // TEMPLATE 2: List Article
    // ============================================
    listArticle: {
      title: 'List Article Template (Listicle)',
      structure: [
        {
          section: 'Title (H1)',
          example: 'En İyi 7 Kahve Çeşidi: Türkiye\'de Kahve Sevenler İçin Rehber',
          seoTips: 'Number in title improves CTR by 36%',
        },
        {
          section: 'Intro',
          guidelines: 'Explain why this list matters (3-4 sentences)',
        },
        {
          section: 'List Items',
          guidelines: [
            'One H2 for each item',
            'Item structure:',
            '  - Title (with keyword)',
            '  - Description (100-150 words)',
            '  - Key characteristics',
            '  - When to choose it',
            '  - Image or visual',
          ],
        },
        {
          section: 'Conclusion',
          guidelines: 'Summarize, add CTA, link to related posts',
        },
      ],
    },

    // ============================================
    // TEMPLATE 3: Comparison Article
    // ============================================
    comparisonArticle: {
      title: 'Comparison Article Template',
      structure: [
        {
          section: 'Title (H1)',
          example: 'Espresso vs Americano: Fark Nedir? Hangi Birini Seçmelisiz?',
        },
        {
          section: 'Introduction',
          guidelines: 'Explain why the comparison matters',
        },
        {
          section: 'Comparison Table',
          guidelines: 'Side-by-side comparison (very SEO friendly)',
        },
        {
          section: 'Detailed Comparison (H2s)',
          subsections: [
            'Origins & History',
            'Preparation Method',
            'Taste Profile',
            'Caffeine Content',
            'Price',
            'Best Time to Drink',
          ],
        },
        {
          section: 'Conclusion',
          guidelines: 'Which is better (depends on personal preference)',
        },
      ],
    },

    // ============================================
    // TEMPLATE 4: Case Study / Success Story
    // ============================================
    caseStudy: {
      title: 'Case Study Template',
      structure: [
        {
          section: 'Title (H1)',
          example: 'Kase Çalışması: Başarısız Bir Kafe Nasıl Popüler Hale Geldi',
        },
        {
          section: 'Background',
          guidelines: 'Introduce the subject, problem they faced',
        },
        {
          section: 'Challenge',
          guidelines: 'Describe the specific challenge (H2)',
        },
        {
          section: 'Solution',
          guidelines: 'Explain how they solved it (H2)',
        },
        {
          section: 'Results',
          guidelines: 'Share metrics, improvements (H2)',
        },
        {
          section: 'Key Takeaways',
          guidelines: 'Extract lessons for readers (H2)',
        },
      ],
    },

    // ============================================
    // TEMPLATE 5: FAQ Article
    // ============================================
    faqArticle: {
      title: 'FAQ Article Template',
      structure: [
        {
          section: 'Title (H1)',
          example: 'Kafe QR Kod Paylaşımı: Sık Sorulan Sorular (SSS)',
        },
        {
          section: 'Introduction',
          guidelines: 'Brief intro about the topic',
        },
        {
          section: 'FAQ Items',
          guidelines: [
            'Use H2 for each question',
            'Make Q&A format clear',
            'Answer must be 100+ words',
            'Include related keywords naturally',
            'Add schema markup (FAQ schema)',
          ],
        },
      ],
      seoBonus: 'FAQ schema can create rich snippets in Google SERP',
    },
  },

  // ============================================
  // ARTICLE IDEAS (16 Articles)
  // ============================================
  articleIdeas: [
    // Pillar 1: Coffee Photography (5 articles)
    {
      category: 'Kafe Fotoğrafçılığı',
      title: 'Kafe Fotoğrafında Mükemmel Işık Ayarı: Profesyonel Rehber',
      keywords: ['kafe fotoğraf ışık', 'profesyonel ışık ayarı'],
      template: 'How-To Guide',
      targetAudience: 'Photography enthusiasts, cafe owners',
      wordCount: '2500 words',
    },
    {
      category: 'Kafe Fotoğrafçılığı',
      title: 'Latte Art Fotoğrafçılığı: 7 İpucu ve Teknik',
      keywords: ['latte art fotoğrafı', 'kahve sanatı'],
      template: 'List Article',
      targetAudience: 'Coffee lovers, social media enthusiasts',
      wordCount: '2000 words',
    },
    {
      category: 'Kafe Fotoğrafçılığı',
      title: 'Kamera Ayarları: Kafe Fotoğrafı İçin ISO, Hızluluk, Açıklık',
      keywords: ['kamera ayarları', 'ISO hızlılık açıklık'],
      template: 'How-To Guide',
      targetAudience: 'Photography enthusiasts',
      wordCount: '2000 words',
    },
    {
      category: 'Kafe Fotoğrafçılığı',
      title: 'Telefonla Profesyonel Kafe Fotoğrafı Çekmek Mümkün mü?',
      keywords: ['telefon kamera', 'mobil fotoğrafçılık'],
      template: 'Comparison Article',
      targetAudience: 'Mobile users, casual photographers',
      wordCount: '1800 words',
    },
    {
      category: 'Kafe Fotoğrafçılığı',
      title: '10 Kafe Fotoğrafçılığı Hatası ve Nasıl Düzeltilir?',
      keywords: ['fotoğrafçılık hatası', 'sık hatalar'],
      template: 'How-To Guide',
      targetAudience: 'Beginner photographers',
      wordCount: '2200 words',
    },

    // Pillar 2: Coffee Culture (4 articles)
    {
      category: 'Kahve Kültürü',
      title: 'En İyi 7 Kahve Çeşidi: Lezzet ve Hazırlanışları',
      keywords: ['kahve çeşitleri', 'kahve türleri'],
      template: 'List Article',
      targetAudience: 'Coffee enthusiasts, cafe owners',
      wordCount: '2200 words',
    },
    {
      category: 'Kahve Kültürü',
      title: 'Türkiye\'de Kahve Kültürü: Tarih, Gelenek, Modern Trend',
      keywords: ['türk kahvesi', 'kahve kültürü'],
      template: 'How-To Guide',
      targetAudience: 'Tourists, culture enthusiasts',
      wordCount: '2500 words',
    },
    {
      category: 'Kahve Kültürü',
      title: 'Espresso vs Americano vs Cappuccino: Hangisini Seçmelisiz?',
      keywords: ['espresso americano cappuccino karşılaştırma'],
      template: 'Comparison Article',
      targetAudience: 'Coffee beginners, casual drinkers',
      wordCount: '2000 words',
    },
    {
      category: 'Kahve Kültürü',
      title: 'Specialty Coffee Nedir? Kaliteli Kahve Seçme Rehberi',
      keywords: ['specialty coffee', 'kaliteli kahve'],
      template: 'How-To Guide',
      targetAudience: 'Coffee enthusiasts',
      wordCount: '1800 words',
    },

    // Pillar 3: Cafe Management (3 articles)
    {
      category: 'Kafe İşletmeciliği',
      title: 'Kafe Pazarlama Stratejisi: Sosyal Medyada Başarılı Olmak',
      keywords: ['kafe pazarlama', 'sosyal medya'],
      template: 'How-To Guide',
      targetAudience: 'Cafe owners, marketing professionals',
      wordCount: '2400 words',
    },
    {
      category: 'Kafe İşletmeciliği',
      title: 'Başarısız Bir Kafe Nasıl Popüler Hale Geldi: Gerçek Örnek',
      keywords: ['kafe başarı hikayesi', 'case study'],
      template: 'Case Study',
      targetAudience: 'Cafe owners, entrepreneurs',
      wordCount: '1900 words',
    },
    {
      category: 'Kafe İşletmeciliği',
      title: 'Müşteri Hizmetlerinde Mükemmellik: 8 Temel İlke',
      keywords: ['müşteri hizmetleri', 'kafe hizmet'],
      template: 'List Article',
      targetAudience: 'Cafe staff, managers',
      wordCount: '2000 words',
    },

    // Pillar 4: ShareVibe Guides (3 articles)
    {
      category: 'ShareVibe Rehberleri',
      title: 'ShareVibe Nasıl Kullanılır? Başından Sonuna Rehber',
      keywords: ['ShareVibe nasıl', 'kullanım kılavuzu'],
      template: 'How-To Guide',
      targetAudience: 'New users, cafe visitors',
      wordCount: '2000 words',
    },
    {
      category: 'ShareVibe Rehberleri',
      title: 'Kafe Sahibi: ShareVibe QR Kod Sistemi Nasıl Çalışır?',
      keywords: ['QR kod', 'kafe yönetimi'],
      template: 'How-To Guide',
      targetAudience: 'Cafe owners, managers',
      wordCount: '1800 words',
    },
    {
      category: 'ShareVibe Rehberleri',
      title: 'ShareVibe Sıkça Sorulan Sorular (SSS)',
      keywords: ['ShareVibe SSS', 'soru cevap'],
      template: 'FAQ Article',
      targetAudience: 'All users',
      wordCount: '1500 words',
    },
  ],

  // ============================================
  // CONTENT CREATION WORKFLOW
  // ============================================
  workflow: {
    step1_keywordResearch: {
      title: 'Step 1: Keyword Research (1-2 hours)',
      tools: 'Google Search Console, Google Trends, Ubersuggest',
      tasks: [
        'Find 5-10 primary keywords per article',
        'Check search volume and competition',
        'Identify long-tail keywords',
        'Note related keywords for internal linking',
      ],
    },
    step2_outline: {
      title: 'Step 2: Create Outline (30-45 min)',
      tasks: [
        'Plan article structure (H1, H2, H3)',
        'List main points',
        'Decide on visual elements',
        'Plan internal links',
      ],
    },
    step3_firstDraft: {
      title: 'Step 3: Write First Draft (2-3 hours)',
      guidelines: [
        'Write naturally, don\'t force keywords',
        'Use H2s for sections',
        'Use bold for key points',
        'Include images/videos',
        'Add internal links (3-5 per article)',
      ],
    },
    step4_seoOptimization: {
      title: 'Step 4: SEO Optimization (30-45 min)',
      checklist: [
        'Primary keyword in H1 ✓',
        'Primary keyword in first 100 words ✓',
        'Meta description with keyword ✓',
        'Image alt text with keywords ✓',
        'Internal links (3-5 relevant) ✓',
        'External links (2-3 authoritative) ✓',
      ],
    },
    step5_review: {
      title: 'Step 5: Review & Edit (1-2 hours)',
      tasks: [
        'Proofread for grammar/spelling',
        'Check readability (short paragraphs, bullets)',
        'Verify all links work',
        'Check formatting consistency',
        'Test on mobile',
      ],
    },
    step6_publish: {
      title: 'Step 6: Publish (30 min)',
      tasks: [
        'Add to blog (CMS or Markdown)',
        'Create slug/URL',
        'Set publishing date',
        'Generate sitemaps (npm run generate:sitemaps)',
        'Submit to Google Search Console',
      ],
    },
    step7_promote: {
      title: 'Step 7: Promote (ongoing)',
      tasks: [
        'Share on social media',
        'Share in email newsletter',
        'Link from related pages',
        'Reach out to influencers',
        'Monitor performance',
      ],
    },
  },

  // ============================================
  // SEO CHECKLIST FOR EACH ARTICLE
  // ============================================
  seoChecklist: [
    '✓ Title (50-60 chars with primary keyword)',
    '✓ Meta description (150-160 chars with keyword)',
    '✓ H1 (one per page with primary keyword)',
    '✓ H2 headers (natural, keyword-rich)',
    '✓ First 100 words contain primary keyword',
    '✓ Images with descriptive alt text',
    '✓ Internal links (3-5 relevant articles)',
    '✓ External links (2-3 authoritative sources)',
    '✓ Word count (1500+ words for best ranking)',
    '✓ Mobile-friendly formatting',
    '✓ Schema markup (if applicable)',
    '✓ Reading time estimate',
    '✓ Table of contents (if > 2000 words)',
  ],

  // ============================================
  // PUBLISHING SCHEDULE
  // ============================================
  publishingSchedule: {
    month1: 'Articles 1-4 (1 per week)',
    month2: 'Articles 5-8 (1 per week)',
    month3: 'Articles 9-12 (1 per week)',
    month4: 'Articles 13-16 (1 per week)',
    ongoing: 'Update existing articles, add seasonal content',
  },
};

export default BLOG_CONTENT_STRATEGY;

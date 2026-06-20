/**
 * GOOGLE SEARCH CONSOLE SETUP GUIDE
 * Complete instructions for GSC verification and sitemap submission
 */

export const GSC_SETUP_GUIDE = {
  // ============================================
  // STEP 1: ADD PROPERTY
  // ============================================
  step1_addProperty: {
    title: 'Step 1: Add Property to Google Search Console',
    url: 'https://search.google.com/search-console',
    instructions: [
      '1. Go to Google Search Console',
      '2. Click "+ Add property"',
      '3. Choose "URL prefix" option',
      '4. Enter: https://sharevibe.com',
      '5. Click "Continue"',
      '6. You need to verify ownership ✅ (see Step 2)',
    ],
  },

  // ============================================
  // STEP 2: VERIFY PROPERTY OWNERSHIP
  // ============================================
  step2_verifyOwnership: {
    title: 'Step 2: Verify Property Ownership',
    methods: [
      {
        method: 'Option A: HTML File Upload (Recommended)',
        steps: [
          '1. Google gives you an HTML file (e.g., googleabcd1234.html)',
          '2. Upload this file to: public/googleabcd1234.html',
          '3. Verify file is accessible at:',
          '   https://sharevibe.com/googleabcd1234.html',
          '4. Click "Verify" in GSC',
          '5. Ownership verified! ✅',
        ],
      },
      {
        method: 'Option B: DNS TXT Record',
        steps: [
          '1. Google gives you a TXT record',
          '2. Add it to your domain\'s DNS settings (via Cloudflare)',
          '3. Go to Cloudflare > DNS > Add Record',
          '4. Type: TXT',
          '5. Name: @ (for root domain)',
          '6. Content: [paste TXT record from Google]',
          '7. Click "Save"',
          '8. Wait 10-30 minutes for propagation',
          '9. Click "Verify" in GSC',
          '10. Ownership verified! ✅',
        ],
      },
      {
        method: 'Option C: Meta Tag',
        steps: [
          '1. Google gives you a meta tag',
          '2. Add it to index.html <head>',
          '3. Example: <meta name="google-site-verification" content="xxx">',
          '4. Redeploy the site',
          '5. Click "Verify" in GSC',
          '6. Ownership verified! ✅',
        ],
      },
    ],
  },

  // ============================================
  // STEP 3: SUBMIT SITEMAPS
  // ============================================
  step3_submitSitemaps: {
    title: 'Step 3: Submit Sitemaps',
    instructions: [
      '1. After property verification, go to GSC dashboard',
      '2. Left sidebar > "Sitemaps"',
      '3. Enter sitemap URL: https://sharevibe.com/sitemap.xml',
      '4. Click "Submit"',
      '5. Status: "Submitted" ✅',
      '',
      'Submit additional sitemaps:',
      '6. https://sharevibe.com/sitemap-index.xml',
      '7. https://sharevibe.com/sitemap-cafes.xml',
      '8. https://sharevibe.com/sitemap-blog.xml',
      '9. https://sharevibe.com/sitemap-images.xml',
    ],
  },

  // ============================================
  // STEP 4: REQUEST INDEXING
  // ============================================
  step4_requestIndexing: {
    title: 'Step 4: Request Homepage Indexing',
    instructions: [
      '1. In GSC, click the URL Inspection box (top)',
      '2. Enter: https://sharevibe.com',
      '3. Click "Test live URL"',
      '4. Wait for inspection to complete',
      '5. If indexed: "URL is on Google" ✅',
      '6. If not indexed: Click "Request indexing"',
      '7. Google will crawl and index homepage within hours',
    ],
  },

  // ============================================
  // STEP 5: MONITOR COVERAGE
  // ============================================
  step5_monitorCoverage: {
    title: 'Step 5: Monitor Indexation Coverage',
    instructions: [
      '1. In GSC, go to "Coverage" report',
      '2. Check indexation status:',
      '   - Green "Indexed": Successfully indexed pages',
      '   - Yellow "Excluded": Temporarily not indexed',
      '   - Red "Error": Pages with errors',
      '3. Monitor over next few days',
      '4. Fix any errors that appear',
      '5. Aim for: 100% or close to 100% indexed pages',
    ],
  },

  // ============================================
  // STEP 6: CHECK INDEXING STATS
  // ============================================
  step6_indexingStats: {
    title: 'Step 6: Check Indexing Statistics',
    instructions: [
      '1. In GSC, go to "Indexing stats" (top right)',
      '2. Shows total indexed pages from your site',
      '3. Provides indexing breakdown by type',
      '4. Shows crawl statistics',
      '',
      'Expected growth:',
      '- Day 1-2: Homepage only (1 page)',
      '- Day 2-3: Cafe pages start appearing',
      '- Day 3-7: Blog pages and galleries',
      '- Week 1+: Full indexation complete',
    ],
  },

  // ============================================
  // STEP 7: TEST STRUCTURED DATA
  // ============================================
  step7_testStructuredData: {
    title: 'Step 7: Test Structured Data (Schema)',
    instructions: [
      '1. Go to: https://search.google.com/test/rich-results',
      '2. Select "URL prefix"',
      '3. Enter: https://sharevibe.com',
      '4. Click "Test URL"',
      '5. Results should show:',
      '   ✓ Organization schema',
      '   ✓ Website schema',
      '   ✓ No errors',
      '',
      'For cafe pages, test:',
      '6. Enter cafe URL: https://sharevibe.com/cafe/my-coffee-shop',
      '7. Results should show:',
      '   ✓ LocalBusiness schema',
      '   ✓ Breadcrumb schema',
      '   ✓ No errors',
    ],
  },

  // ============================================
  // STEP 8: MOBILE-FRIENDLY TEST
  // ============================================
  step8_mobileFriendlyTest: {
    title: 'Step 8: Mobile-Friendly Test',
    instructions: [
      '1. Go to: https://search.google.com/test/mobile-friendly',
      '2. Enter: https://sharevibe.com',
      '3. Click "Test URL"',
      '4. Results should show:',
      '   ✓ Page is mobile-friendly',
      '   ✓ No errors',
      '',
      'If errors appear:',
      '5. Fix viewport meta tag (should be in index.html)',
      '6. Fix tap targets (buttons, links)',
      '7. Fix font sizes (should be readable)',
      '8. Retest after fixes',
    ],
  },

  // ============================================
  // STEP 9: CORE WEB VITALS MONITORING
  // ============================================
  step9_coreWebVitals: {
    title: 'Step 9: Monitor Core Web Vitals',
    instructions: [
      '1. In GSC, go to "Core Web Vitals"',
      '2. Monitor three metrics:',
      '   - LCP (Largest Contentful Paint): < 2.5s (good)',
      '   - FID (First Input Delay): < 100ms (good)',
      '   - CLS (Cumulative Layout Shift): < 0.1 (good)',
      '',
      '3. Check "Mobile" tab first (most important)',
      '4. If any metric is orange/red:',
      '   - Go to PageSpeed Insights',
      '   - Fix recommended issues',
      '   - Retest after deployment',
    ],
  },

  // ============================================
  // STEP 10: SETUP ALERTS
  // ============================================
  step10_setupAlerts: {
    title: 'Step 10: Setup GSC Alerts',
    instructions: [
      '1. In GSC, go to Settings (gear icon)',
      '2. Select "Email notifications"',
      '3. Enable notifications for:',
      '   ✓ Critical issues',
      '   ✓ Coverage issues',
      '   ✓ Indexing status',
      '   ✓ Mobile usability',
      '   ✓ Security issues',
      '4. Save preferences',
      '5. You\'ll get email alerts for any problems',
    ],
  },

  // ============================================
  // USEFUL GSC REPORTS
  // ============================================
  usefulReports: [
    {
      report: 'Performance Report',
      shows: 'Clicks, impressions, average position, CTR from search results',
      update: 'Updated with 3-day delay',
    },
    {
      report: 'Coverage Report',
      shows: 'Indexed, excluded, error pages',
      update: 'Updated every few days',
    },
    {
      report: 'Sitemaps Report',
      shows: 'Status of submitted sitemaps',
      update: 'Updated periodically',
    },
    {
      report: 'URL Inspection',
      shows: 'Individual page indexation status',
      update: 'Real-time',
    },
    {
      report: 'Mobile Usability',
      shows: 'Mobile-specific issues',
      update: 'Updated periodically',
    },
    {
      report: 'Core Web Vitals',
      shows: 'Performance metrics from real users',
      update: 'Updated daily',
    },
  ],

  // ============================================
  // TROUBLESHOOTING
  // ============================================
  troubleshooting: {
    pagesNotIndexed: [
      '1. Check robots.txt (should not block pages)',
      '2. Check meta robots tag (should not be noindex)',
      '3. Verify page is accessible (no 404 errors)',
      '4. Check crawl budget (robots.txt crawl-delay)',
      '5. Request indexing via URL Inspection',
      '6. Wait 1-2 weeks for full indexation',
    ],
    verificationFails: [
      '1. For DNS method: Check DNS propagation (wait 30 min)',
      '2. For HTML file: Verify file path is exact',
      '3. For meta tag: Check index.html has the tag',
      '4. Try different verification method',
      '5. Contact Google Support if still failing',
    ],
    errorsInCoverage: [
      '1. Click on error to see details',
      '2. Fix the issue (e.g., canonical tag, robots.txt)',
      '3. Redeploy site',
      '4. Click "Request indexing" on affected pages',
      '5. Monitor coverage again in 1-2 weeks',
    ],
  },

  // ============================================
  // NEXT STEPS
  // ============================================
  nextSteps: [
    '✅ Bing Webmaster Tools setup (similar to GSC)',
    '✅ Yandex Webmaster setup (for Turkish/Russian traffic)',
    '✅ Monitor search rankings (weekly)',
    '✅ Analyze search queries (in GSC Performance)',
    '✅ Optimize for top queries (improve rankings)',
  ],
};

export default GSC_SETUP_GUIDE;

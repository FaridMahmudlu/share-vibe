/**
 * SEO & PERFORMANCE TROUBLESHOOTING GUIDE
 * Quick fixes for common issues
 */

export const TROUBLESHOOTING_GUIDE = {
  // ============================================
  // ORGANIC TRAFFIC NOT GROWING
  // ============================================
  lowOrganicTraffic: {
    problem: 'Organic traffic isn\'t growing or dropped suddenly',
    diagnosis: [
      {
        step: '1. Check GSC Coverage',
        url: 'https://search.google.com/search-console',
        what: 'Go to Coverage report',
        check: 'Are pages indexed? Any errors?',
      },
      {
        step: '2. Check for Crawl Errors',
        what: 'Look for 404, 500 errors in Coverage',
        solution: 'Fix errors preventing crawling',
      },
      {
        step: '3. Check Robots.txt',
        what: 'Verify robots.txt isn\'t blocking good pages',
        check: 'Visit https://sharevibe.com/robots.txt',
      },
      {
        step: '4. Check Meta Robots Tag',
        what: 'View page source, search "robots"',
        should: 'Be "index, follow" not "noindex"',
      },
    ],
    fixes: [
      {
        issue: 'Pages not indexed at all',
        fix: [
          '1. Check robots.txt - should allow the page',
          '2. Check meta robots tag - should be "index, follow"',
          '3. Check canonical - should point to correct URL',
          '4. Use GSC URL Inspection → Request Indexing',
          '5. Wait 1-2 weeks for Google to re-crawl',
        ],
      },
      {
        issue: 'Pages excluded from index',
        fix: [
          '1. Check Coverage report for reason',
          '2. Common reasons: robots.txt blocked, noindex, duplicate',
          '3. Fix the issue',
          '4. Request indexing in GSC URL Inspection',
        ],
      },
      {
        issue: 'No impressions in search results',
        fix: [
          '1. Site may be too new (< 2 weeks)',
          '2. Check keyword targeting - are you targeting search terms?',
          '3. Check SERP - is site shown for keywords you\'re targeting?',
          '4. May need to build backlinks to rank',
          '5. May need to improve content quality',
        ],
      },
      {
        issue: 'Traffic dropped 50%+',
        fix: [
          '1. Check GA4 - confirm it\'s accurate (not tracking issue)',
          '2. Check GSC - did impressions drop too?',
          '3. Check GSC for manual actions/penalties',
          '4. Check for negative SEO (bad backlinks)',
          '5. Check if competitors ranked higher for your keywords',
          '6. Recent algorithm update? Check Google Search Status',
        ],
      },
    ],
  },

  // ============================================
  // LOW RANKINGS FOR TARGET KEYWORDS
  // ============================================
  lowRankings: {
    problem: 'Page not ranking for target keywords or ranking position 20+',
    diagnosis: [
      '1. Check if page is indexed (GSC URL Inspection)',
      '2. Check keyword in page (Ctrl+F for keyword)',
      '3. Analyze top-ranking pages for that keyword',
      '4. Compare your content vs competing content',
    ],
    fixes: [
      {
        issue: 'Page not indexed',
        solution: 'See "low organic traffic" section above',
      },
      {
        issue: 'Keyword not in page',
        fix: [
          '1. Add keyword to title (most important)',
          '2. Add keyword to meta description',
          '3. Add keyword to H1 heading',
          '4. Add keyword in first 100 words',
          '5. Add keyword naturally throughout (2-3% keyword density)',
        ],
      },
      {
        issue: 'Content quality lower than competitors',
        fix: [
          '1. Analyze top 3 ranking pages',
          '2. Note their word count, structure, examples',
          '3. Create more comprehensive content',
          '4. Add unique insights/data not in competitors',
          '5. Better formatting (more subheadings, bullets)',
          '6. Add images, videos, interactive elements',
          '7. Improve readability and user experience',
        ],
      },
      {
        issue: 'Not enough backlinks',
        fix: [
          '1. Check backlinks for top-ranking pages (Ahrefs/Semrush)',
          '2. Note common backlink sources',
          '3. Build backlinks from similar sources',
          '4. See Link Building Strategy (docs/LINK_BUILDING_STRATEGY.ts)',
        ],
      },
      {
        issue: 'Page speed too slow',
        fix: [
          '1. Run PageSpeed Insights',
          '2. Optimize images (compress, use WebP)',
          '3. Reduce JavaScript',
          '4. Enable caching',
          '5. Use CDN (Cloudflare)',
          '6. See Core Web Vitals section below',
        ],
      },
    ],
  },

  // ============================================
  // LOW CLICK-THROUGH RATE (CTR) FROM SEARCH
  // ============================================
  lowCTR: {
    problem: 'Page appears in search results but few clicks (CTR < 2%)',
    diagnosis: [
      'Go to GSC Performance report',
      'Filter by your page or keywords',
      'Check CTR - should be 3%+',
    ],
    fixes: [
      {
        issue: 'Title tag too generic or boring',
        fix: [
          'Current: "Coffee Guide"',
          'Better: "Ultimate Guide to Coffee: 20 Types + Brewing Methods"',
          'Use power words: Ultimate, Complete, Expert, Professional',
          'Include number if applicable: "10 Ways", "5 Mistakes"',
        ],
      },
      {
        issue: 'Meta description doesn\'t entice',
        fix: [
          'Current: "A guide about coffee"',
          'Better: "Learn how to brew perfect coffee at home. Expert tips, common mistakes, and 10 brewing methods explained."',
          'Include benefit or curiosity hook',
          'Match search intent',
          'Include target keyword naturally',
        ],
      },
      {
        issue: 'Competing snippet steals clicks',
        fix: [
          '1. Check what\'s in position 0 (featured snippet)',
          '2. If competitor has it, create better structured data',
          '3. Use schema markup (FAQ, table, list)',
          '4. Target different keywords (long-tail)',
        ],
      },
      {
        issue: 'Page not relevant to search query',
        fix: [
          '1. Check query in GSC Performance',
          '2. Verify page is relevant to query',
          '3. If not relevant, exclude query (mark as "not relevant")',
          '4. Optimize page for more relevant queries',
        ],
      },
    ],
  },

  // ============================================
  // CORE WEB VITALS PROBLEMS
  // ============================================
  coreWebVitals: {
    title: 'Core Web Vitals Issues',
    problems: [
      {
        metric: 'LCP (Largest Contentful Paint) > 2.5s (NEEDS IMPROVEMENT)',
        causes: [
          'Large unoptimized images',
          'Render-blocking JavaScript',
          'Render-blocking CSS',
          'Server response time too slow (TTFB)',
        ],
        fixes: [
          {
            fix: 'Optimize images',
            steps: [
              '1. Compress images (TinyPNG, ImageOptim)',
              '2. Use WebP format (not just JPEG)',
              '3. Serve responsive images (srcset)',
              '4. Lazy load images (loading="lazy")',
            ],
          },
          {
            fix: 'Defer non-critical JavaScript',
            steps: [
              '1. Use async for GA4 script',
              '2. Defer non-critical third-party scripts',
              '3. Minimize JavaScript bundle size',
              '4. Code split (already doing in Vite)',
            ],
          },
          {
            fix: 'Improve server response time (TTFB)',
            steps: [
              '1. Use CDN (Cloudflare)',
              '2. Use fast hosting (SSD-based)',
              '3. Optimize database queries',
              '4. Enable caching',
            ],
          },
        ],
      },
      {
        metric: 'FID (First Input Delay) > 100ms (NEEDS IMPROVEMENT)',
        causes: [
          'Too much JavaScript blocking main thread',
          'Long tasks preventing user input',
        ],
        fixes: [
          '1. Break up long JavaScript tasks (Web Workers)',
          '2. Use setTimeout to defer non-critical work',
          '3. Minimize third-party script impact',
          '4. Use React.memo, useMemo for optimization',
        ],
      },
      {
        metric: 'CLS (Cumulative Layout Shift) > 0.1 (NEEDS IMPROVEMENT)',
        causes: [
          'Images without dimensions causing layout shift',
          'Ads loading after content',
          'Web fonts causing FOUT/FOIT',
        ],
        fixes: [
          '1. Set width/height on all images',
          '2. Ensure font-display: swap for web fonts',
          '3. Avoid ads pushing content',
          '4. Use aspect-ratio CSS property',
        ],
      },
    ],
  },

  // ============================================
  // GOOGLE MANUAL ACTION / PENALTY
  // ============================================
  manualAction: {
    problem: 'Received manual action notice in GSC (site penalty)',
    howToCheck: [
      '1. Go to Google Search Console',
      '2. Left sidebar → Security & Manual Actions',
      '3. Check for any messages',
    ],
    commonPenalties: [
      {
        penalty: 'Unnatural Links',
        cause: 'Bad backlinks or link buying detected',
        fix: [
          '1. Identify bad links (Ahrefs, GSC)',
          '2. Contact site owners to remove links',
          '3. Disavow remaining bad links (link disavow tool)',
          '4. Request reconsideration in GSC',
          '5. Wait 1-2 weeks for response',
        ],
      },
      {
        penalty: 'Thin Content',
        cause: 'Pages lack substance or unique content',
        fix: [
          '1. Identify thin pages (GSC Coverage report)',
          '2. Delete or merge thin pages',
          '3. Create comprehensive content (1500+ words)',
          '4. Add unique insights, data, examples',
          '5. Re-index pages',
        ],
      },
      {
        penalty: 'Cloaking',
        cause: 'Different content shown to Google vs users',
        fix: [
          '1. Ensure all users see same content',
          '2. Fix CSS hiding/JavaScript injection',
          '3. Verify in GSC URL Inspection',
        ],
      },
      {
        penalty: 'Pure Spam',
        cause: 'Site detected as spam/malware',
        fix: [
          '1. Check site for malware (check all files)',
          '2. Remove malicious code',
          '3. Request review in GSC',
          '4. Monitor for re-infection',
        ],
      },
    ],
  },

  // ============================================
  // INDEXATION PROBLEMS
  // ============================================
  indexationProblems: {
    title: 'Indexation Problems',
    issues: [
      {
        issue: 'Pages not indexed (Coverage report)',
        solutions: [
          {
            solution: 'Check robots.txt',
            steps: [
              '1. Visit robots.txt file',
              '2. Ensure page is not blocked by Disallow',
              '3. Check Crawl-delay (shouldn\'t be too high)',
            ],
          },
          {
            solution: 'Check meta robots tag',
            steps: [
              '1. View page source (Ctrl+U)',
              '2. Search for <meta name="robots"',
              '3. Should be "index, follow"',
            ],
          },
          {
            solution: 'Check canonical tag',
            steps: [
              '1. View page source',
              '2. Check <link rel="canonical"',
              '3. Should point to correct URL',
            ],
          },
          {
            solution: 'Request indexing in GSC',
            steps: [
              '1. Go to URL Inspection tool in GSC',
              '2. Enter page URL',
              '3. Click "Request indexing"',
              '4. Wait 1-2 weeks',
            ],
          },
        ],
      },
      {
        issue: 'Pages indexed but not ranking',
        solutions: [
          '1. Content may need improvement',
          '2. May not have backlinks',
          '3. May not be targeting right keywords',
          '4. May have high Page Authority competitors',
        ],
      },
      {
        issue: 'Indexed URL count dropping',
        solutions: [
          '1. Check Coverage report for new errors',
          '2. Check if pages were deleted (301 redirects?)',
          '3. Check robots.txt changes',
          '4. Check for duplicate content issues',
        ],
      },
    ],
  },

  // ============================================
  // STRUCTURED DATA ISSUES
  // ============================================
  structuredDataIssues: {
    title: 'Structured Data / Schema Problems',
    issues: [
      {
        issue: 'Schema not showing rich results',
        check: [
          '1. Go to Google Rich Results Test',
          '2. Enter page URL',
          '3. Check if schemas are detected',
        ],
        solutions: [
          {
            problem: 'Schema not detected at all',
            fix: [
              '1. Verify schema is in page source (Ctrl+U)',
              '2. Use valid JSON-LD format',
              '3. Validate with schema.org validator',
              '4. Check for JSON syntax errors',
              '5. Re-test after fix',
            ],
          },
          {
            problem: 'Schema detected but errors shown',
            fix: [
              '1. Note the error from Rich Results Test',
              '2. Common errors: missing required field, wrong format',
              '3. Fix the field (see schema documentation)',
              '4. Re-test in Rich Results Test',
            ],
          },
        ],
      },
      {
        issue: 'Rich results not showing in Google',
        note: 'Can take 1-2 weeks after fixing schema',
        steps: [
          '1. Fix schema errors (see above)',
          '2. Request indexing of page in GSC',
          '3. Wait for Google to re-crawl',
          '4. Check in GSC Coverage report',
        ],
      },
    ],
  },

  // ============================================
  // MOBILE & RESPONSIVENESS ISSUES
  // ============================================
  mobileIssues: {
    title: 'Mobile & Responsiveness Problems',
    issues: [
      {
        issue: 'Mobile-Friendly Test fails',
        check: 'Go to Google Mobile-Friendly Test',
        commonErrors: [
          {
            error: 'Viewport meta tag missing or incorrect',
            fix: '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
          },
          {
            error: 'Text too small to read',
            fix: 'Increase font size (minimum 16px for body text)',
          },
          {
            error: 'Links/buttons too small',
            fix: 'Make touch targets 48x48px minimum',
          },
          {
            error: 'Content wider than viewport',
            fix: 'Check CSS overflow, use max-width: 100%',
          },
        ],
      },
      {
        issue: 'Layout breaks on small screens',
        solutions: [
          '1. Test on real mobile devices',
          '2. Use Chrome DevTools mobile view (F12)',
          '3. Check CSS media queries',
          '4. Ensure responsive design patterns',
        ],
      },
    ],
  },

  // ============================================
  // SECURITY ISSUES
  // ============================================
  securityIssues: {
    title: 'Security Problems',
    issues: [
      {
        issue: 'SSL certificate error (HTTPS)',
        symptoms: 'Red warning, "Not Secure" in browser',
        fixes: [
          '1. Check SSL certificate validity (expires?)',
          '2. Renew certificate before expiration',
          '3. Verify certificate chain is complete',
          '4. Check HSTS header (may cache old cert)',
        ],
      },
      {
        issue: 'Malware detected by Google',
        alert: 'GSC warns about malware',
        fixes: [
          '1. Scan server for backdoors/malware',
          '2. Review file changes (check git log)',
          '3. Remove malicious code',
          '4. Change all passwords',
          '5. Update all software/frameworks',
          '6. Request review in GSC Security Issues',
        ],
      },
      {
        issue: 'Security headers missing (F grade)',
        tool: 'securityheaders.com',
        fixes: [
          '1. Add HSTS header',
          '2. Add X-Frame-Options header',
          '3. Add X-Content-Type-Options header',
          '4. Add CSP (Content-Security-Policy)',
          '5. Already configured in .htaccess',
        ],
      },
    ],
  },

  // ============================================
  // DATABASE / FIREBASE ISSUES
  // ============================================
  firebaseIssues: {
    title: 'Firebase & Backend Issues',
    issues: [
      {
        issue: 'Firebase authentication not working',
        check: 'Console shows auth errors',
        solutions: [
          '1. Verify Firebase credentials in config',
          '2. Check OAuth redirect URIs (must include domain)',
          '3. Verify Google OAuth app created',
          '4. Check browser console for specific error',
        ],
      },
      {
        issue: 'Firestore queries slow',
        solutions: [
          '1. Check if proper indexes created',
          '2. Avoid querying entire collection',
          '3. Add where() clauses to filter',
          '4. Check query performance in Firebase console',
        ],
      },
      {
        issue: 'Storage uploads failing',
        solutions: [
          '1. Check storage rules allow uploads',
          '2. Check CORS configuration',
          '3. Verify file size not exceeding limit',
          '4. Check user has proper authentication',
        ],
      },
    ],
  },

  // ============================================
  // ANALYTICS ISSUES
  // ============================================
  analyticsIssues: {
    title: 'Google Analytics Issues',
    issues: [
      {
        issue: 'GA4 not tracking any data',
        check: 'Google Analytics shows no active users',
        solutions: [
          '1. Verify GA4 script in index.html',
          '2. Check Measurement ID is correct (G-...)',
          '3. Check browser console for errors',
          '4. Use GA4 DebugView to see events',
          '5. Wait 24 hours for initial data',
        ],
      },
      {
        issue: 'Custom events not firing',
        solutions: [
          '1. Check event names in code',
          '2. Verify window.gtag is available',
          '3. Check browser console for errors',
          '4. Use GA4 DebugView to see if event sent',
        ],
      },
      {
        issue: 'Conversion tracking not working',
        solutions: [
          '1. Create conversion in GA4 (mark event as conversion)',
          '2. Verify event name matches code',
          '3. Check event parameters are correct',
          '4. Wait 24 hours for conversion data',
        ],
      },
    ],
  },

  // ============================================
  // QUICK FIXES CHECKLIST
  // ============================================
  quickFixesChecklist: [
    '✓ Can\'t rank any keywords? → Build backlinks',
    '✓ Site too slow? → Compress images, enable caching',
    '✓ Not indexed? → Check robots.txt and meta robots',
    '✓ No GA4 data? → Check Measurement ID is correct',
    '✓ Low CTR? → Improve title and description',
    '✓ Traffic dropped? → Check GSC for manual actions',
    '✓ CLS too high? → Set image dimensions',
    '✓ LCP too slow? → Optimize hero image',
    '✓ Mobile fails? → Add viewport meta tag',
    '✓ Rich results not showing? → Fix schema markup',
  ],
};

export default TROUBLESHOOTING_GUIDE;

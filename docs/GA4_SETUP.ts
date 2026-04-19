/**
 * GOOGLE ANALYTICS 4 SETUP GUIDE
 * Complete instructions for GA4 integration
 */

export const GA4_SETUP_GUIDE = {
  // ============================================
  // STEP 1: CREATE GA4 PROPERTY
  // ============================================
  step1_createProperty: {
    title: 'Step 1: Create GA4 Property',
    url: 'https://analytics.google.com/',
    instructions: [
      '1. Go to Google Analytics (analytics.google.com)',
      '2. Click "Create" in the left sidebar',
      '3. Select "Property"',
      '4. Enter Property Name: "ShareVibe"',
      '5. Set Reporting Time Zone: "Europe/Istanbul" (UTC+3)',
      '6. Set Currency: "Turkish Lira (₺)"',
      '7. Click "Continue"',
      '8. Select "Business Type": "Other"',
      '9. Select "Business Size": "Small"',
      '10. Click "Create"',
      '11. Accept the terms',
      '12. Property created! ✅',
    ],
  },

  // ============================================
  // STEP 2: CREATE WEB DATA STREAM
  // ============================================
  step2_createWebStream: {
    title: 'Step 2: Create Web Data Stream',
    instructions: [
      '1. In GA4 property, go to "Admin" (gear icon)',
      '2. Click "Data Streams" in the left sidebar',
      '3. Click "Add Stream"',
      '4. Select "Web"',
      '5. Enter Website URL: "https://sharevibe.com"',
      '6. Enter Stream Name: "ShareVibe Web"',
      '7. Click "Create Stream"',
      '8. Web stream created! ✅',
    ],
  },

  // ============================================
  // STEP 3: GET MEASUREMENT ID
  // ============================================
  step3_getMeasurementId: {
    title: 'Step 3: Get Measurement ID',
    instructions: [
      '1. After creating stream, you see the Measurement ID',
      '2. Copy the ID (format: G-XXXXXXXXXX)',
      '3. Save this ID - you\'ll need it for index.html',
      '4. Example: G-ABC123DEF45',
    ],
    example: 'G-ABC123DEF45',
  },

  // ============================================
  // STEP 4: UPDATE INDEX.HTML
  // ============================================
  step4_updateIndexHtml: {
    title: 'Step 4: Update index.html with GA Script',
    file: 'index.html (in <head>)',
    code: `<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX', {
    'page_path': window.location.pathname,
    'page_title': document.title,
    'anonymize_ip': true,
  });
</script>`,
    instructions: [
      '1. Open index.html',
      '2. Find the <head> section',
      '3. Add the GA4 script (replace G-XXXXXXXXXX with your Measurement ID)',
      '4. Save the file',
      '5. Redeploy the application',
    ],
  },

  // ============================================
  // STEP 5: VERIFY GA IS WORKING
  // ============================================
  step5_verify: {
    title: 'Step 5: Verify GA4 is Working',
    instructions: [
      '1. Deploy the updated code',
      '2. Go to https://sharevibe.com',
      '3. Go back to Google Analytics dashboard',
      '4. Go to "Real-time" report',
      '5. You should see a page view within seconds',
      '6. Check for Active Users: should show 1',
      '7. GA4 is working! ✅',
    ],
  },

  // ============================================
  // CUSTOM EVENTS TO TRACK
  // ============================================
  customEvents: {
    title: 'Custom Events to Track',
    events: [
      {
        event: 'user_signup',
        description: 'User creates account',
        parameters: { account_type: 'free' | 'premium' },
      },
      {
        event: 'media_upload',
        description: 'User uploads photo',
        parameters: { cafe_id: 'string', media_type: 'image' },
      },
      {
        event: 'cafe_view',
        description: 'User views cafe gallery',
        parameters: { cafe_id: 'string', cafe_name: 'string' },
      },
      {
        event: 'media_like',
        description: 'User likes media',
        parameters: { media_id: 'string', cafe_id: 'string' },
      },
      {
        event: 'search',
        description: 'User performs search',
        parameters: { search_term: 'string' },
      },
      {
        event: 'share',
        description: 'User shares cafe',
        parameters: { cafe_id: 'string', share_method: 'facebook' | 'twitter' | 'link' },
      },
    ],
  },

  // ============================================
  // GOOGLE ANALYTICS DASHBOARD SETUP
  // ============================================
  dashboardSetup: {
    title: 'Setup GA4 Dashboard',
    steps: [
      '1. Go to Admin > Custom definitions',
      '2. Create custom dimensions for: cafe_id, user_type, subscription_level',
      '3. Create custom metrics for: upload_count, like_count',
      '4. Go to Reports > Engagement',
      '5. Add "Engagement Overview" report',
      '6. Go to Reports > Events',
      '7. Create report for custom events',
    ],
  },

  // ============================================
  // USEFUL METRICS TO MONITOR
  // ============================================
  metricsToMonitor: [
    'Users (daily, monthly)',
    'Sessions per user',
    'Average session duration',
    'Bounce rate',
    'Pages per session',
    'Upload events',
    'Like events',
    'Share events',
    'Top cafes by views',
    'Top content by engagement',
    'User demographics (if available)',
    'Device & OS breakdown',
    'Traffic sources',
    'Conversion rate',
  ],

  // ============================================
  // TROUBLESHOOTING
  // ============================================
  troubleshooting: {
    noDataAppears: [
      '1. Check Measurement ID is correct (format: G-XXXXXXXXXX)',
      '2. Verify GA script is in <head> section',
      '3. Check browser console for errors (F12)',
      '4. Check if ad blockers are blocking GA',
      '5. Wait 24-48 hours for data to appear fully',
      '6. Check domain matches in GA4 settings',
    ],
    lowTraffic: [
      '1. Check if GA is firing at all (Real-time report)',
      '2. Verify page views are being recorded',
      '3. Check if traffic is mostly from blocked IPs',
      '4. Check bot filtering is not too aggressive',
    ],
  },

  // ============================================
  // NEXT: GOOGLE SEARCH CONSOLE
  // ============================================
  nextStep: 'Setup Google Search Console (see next document)',
};

export default GA4_SETUP_GUIDE;

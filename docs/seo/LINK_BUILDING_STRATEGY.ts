/**
 * LINK BUILDING STRATEGY
 * Off-page SEO and backlink acquisition plan
 */

export const LINK_BUILDING_STRATEGY = {
  // ============================================
  // LINK BUILDING OVERVIEW
  // ============================================
  overview: {
    importance: 'Backlinks are the #2 SEO ranking factor after content quality',
    goal: 'Acquire 20-30 high-quality backlinks in first 6 months',
    targetQuality: 'DA (Domain Authority) 30+',
    strategy: 'Focus on relevance over quantity',
  },

  // ============================================
  // STRATEGY 1: CONTENT-BASED LINKBUILDING
  // ============================================
  strategy1_contentBased: {
    title: 'Strategy 1: Create Linkable Content',
    description: 'Create content so good that others want to link to it',
    tactics: [
      {
        tactic: 'Comprehensive Guides',
        example: 'Ultimate Coffee Photography Guide (5000+ words)',
        linkPotential: 'High - often linked by photography blogs',
        effort: '20-40 hours',
        expectedLinks: '5-10 in 3 months',
      },
      {
        tactic: 'Original Research/Data',
        example: 'Survey: What features do coffee lovers want?',
        linkPotential: 'Very High - journalists love original data',
        effort: '40-60 hours',
        expectedLinks: '10-20 in 6 months',
      },
      {
        tactic: 'Tools/Calculators',
        example: 'Coffee Brew Time Calculator',
        linkPotential: 'High - useful tools get linked frequently',
        effort: '30-50 hours (requires development)',
        expectedLinks: '8-15 in 6 months',
      },
      {
        tactic: 'Infographics',
        example: 'Coffee Types Around the World (visual)',
        linkPotential: 'High - visual content gets shared',
        effort: '10-20 hours (design)',
        expectedLinks: '5-10 in 3 months',
      },
      {
        tactic: 'Case Studies',
        example: 'How Cafe X Increased Sales 150%',
        linkPotential: 'Medium-High - businesses link to results',
        effort: '20-30 hours',
        expectedLinks: '3-8 in 3 months',
      },
    ],
  },

  // ============================================
  // STRATEGY 2: PARTNERSHIP-BASED
  // ============================================
  strategy2_partnerships: {
    title: 'Strategy 2: Build Partnerships',
    description: 'Partner with relevant businesses and websites',
    tactics: [
      {
        tactic: 'Cafe Partnerships',
        description: 'Partner with popular cafes for mutual linking',
        howTo: [
          '1. Identify 20-30 popular cafes in Turkey',
          '2. Reach out with value proposition',
          '3. Offer to create joint content',
          '4. Provide shareable graphics/content',
          '5. Link to their cafe on ShareVibe',
          '6. Ask for backlink from their website',
        ],
        expectedLinks: '10-20 (if 50% acceptance)',
        timeframe: '2-3 months',
      },
      {
        tactic: 'Tourism Websites',
        description: 'Get listed on Turkish tourism/travel sites',
        targets: [
          'TripAdvisor (cafe reviews)',
          'Google My Business (all cafes)',
          'Turkish travel blogs',
          'Istanbul tourism guides',
          'Food/beverage directories',
        ],
        expectedLinks: '5-10',
      },
      {
        tactic: 'Photography Communities',
        description: 'Link from photography blogs and sites',
        howTo: [
          'Create photography tips content',
          'Reach out to photography blogs',
          'Offer guest post',
          'Ask for backlink in bio',
        ],
        expectedLinks: '5-8',
      },
      {
        tactic: 'Food & Beverage Influencers',
        description: 'Partner with food bloggers and influencers',
        howTo: [
          'Identify food/beverage influencers',
          'Send them ShareVibe access',
          'Ask them to create content',
          'Request link to ShareVibe in bio/post',
        ],
        expectedLinks: '8-15 (from social + blogs)',
      },
    ],
  },

  // ============================================
  // STRATEGY 3: OUTREACH-BASED
  // ============================================
  strategy3_outreach: {
    title: 'Strategy 3: Direct Outreach',
    description: 'Reach out to relevant websites and ask for links',
    tactics: [
      {
        tactic: 'Broken Link Building',
        description: 'Find broken links, offer replacement content',
        process: [
          '1. Use Ahrefs or Semrush to find broken links on competitor sites',
          '2. Create similar/better content',
          '3. Contact site owner: "Found broken link, have alternative"',
          '4. Point them to your content',
          '5. Ask for backlink',
        ],
        expectedLinks: '3-10',
        effort: '20-30 hours',
      },
      {
        tactic: 'Unlinked Brand Mentions',
        description: 'Find mentions of ShareVibe without links, request link',
        process: [
          '1. Use Google Alerts for "ShareVibe" mentions',
          '2. Check which mentions lack backlinks',
          '3. Contact author: "Great mention! Would you mind linking?"',
          '4. Make it easy for them',
        ],
        expectedLinks: '2-5',
      },
      {
        tactic: 'Resource Page Outreach',
        description: 'Find "Resources" pages and ask for inclusion',
        targets: [
          'Coffee resources pages',
          'Photography resources',
          'Travel guides',
          'Business resources',
          'Social media pages',
        ],
        process: [
          '1. Identify resource pages in niche',
          '2. Reach out to owner/editor',
          '3. Pitch ShareVibe as valuable resource',
          '4. Offer to reciprocate',
        ],
        expectedLinks: '8-15',
      },
      {
        tactic: 'Local SEO Outreach',
        description: 'Get mentioned in local business directories',
        targets: [
          'Turkish business directories',
          'Istanbul business listings',
          'Local chamber of commerce',
          'Industry associations',
        ],
        expectedLinks: '5-10',
      },
    ],
  },

  // ============================================
  // STRATEGY 4: PR & MEDIA
  // ============================================
  strategy4_pr: {
    title: 'Strategy 4: PR and Media Coverage',
    description: 'Get press coverage which naturally generates backlinks',
    tactics: [
      {
        tactic: 'Press Release',
        description: 'Send press release about ShareVibe launch',
        distribution: [
          'Turkish tech news sites',
          'Startup news',
          'Business publications',
          'Local media',
        ],
        expectedLinks: '8-15',
        cost: 'Free - $200 (if paid distribution)',
      },
      {
        tactic: 'Media Pitching',
        description: 'Pitch story ideas to journalists',
        pitchIdeas: [
          '"How a new app is changing cafe culture"',
          '"Young entrepreneur launches photo-sharing platform"',
          '"Turkish startup solves cafe customer engagement"',
        ],
        expectedLinks: '10-20',
        effort: '30-50 hours',
      },
      {
        tactic: 'Interview/Podcast',
        description: 'Get interviewed on podcasts/shows',
        expectedLinks: '5-10',
        each: '1 backlink per appearance',
      },
    ],
  },

  // ============================================
  // STRATEGY 5: LOCAL & NICHE
  // ============================================
  strategy5_localNiche: {
    title: 'Strategy 5: Local & Niche Communities',
    tactics: [
      {
        tactic: 'Local Business Listing',
        steps: [
          '✓ Google My Business (all cafe profiles)',
          '✓ Facebook Business Pages',
          '✓ LinkedIn Company Page',
          '✓ Turkish business registries',
          '✓ Chamber of Commerce listings',
        ],
      },
      {
        tactic: 'Niche Communities',
        targets: [
          'Coffee enthusiast forums',
          'Photography communities (Reddit, Discord)',
          'Turkish startup communities',
          'Cafe owner groups',
        ],
        note: 'Participate genuinely, not for links only',
      },
      {
        tactic: 'Industry Associations',
        options: [
          'Turkish Coffee Association',
          'Photography societies',
          'Hospitality/service associations',
        ],
      },
    ],
  },

  // ============================================
  // LINK OUTREACH EMAIL TEMPLATE
  // ============================================
  emailTemplate: {
    title: 'Link Outreach Email Template',
    subject: 'Great Content on [Topic] + Our Relevant Resource',
    body: `
Hi [Name/Editor],

I came across your article on [specific article title]. Great insights on [specific point]!

I thought you might find our [ShareVibe/guide/resource] valuable to add to your article. 
It [specific benefit - e.g., "provides 10 more practical tips for cafe photography"].

Link: [your URL]
Anchor text suggestion: [suggested anchor]

No pressure at all. Just thought it could be helpful for your readers.

Best regards,
[Your Name]
ShareVibe Team
    `,
    tips: [
      'Personalize with recipient\'s name',
      'Reference specific article/content they created',
      'Explain WHY your link adds value',
      'Make it easy (provide anchor text suggestion)',
      'Keep it short (under 100 words)',
      'Include your website URL in signature',
    ],
  },

  // ============================================
  // LINK QUALITY METRICS
  // ============================================
  qualityMetrics: {
    goodLink: {
      damainAuthority: '30+',
      relevance: 'High (coffee, photography, or cafe-related)',
      anchor: 'Branded or relevant keywords',
      placement: 'Within main content (not footer)',
      context: 'Relevant context around the link',
      nofollowStatus: 'Followed (not nofollow)',
    },
    avoidPoorLinks: {
      sources: [
        'Low-quality directories',
        'Link farms',
        'Private blog networks (PBN)',
        'Paid links (against Google ToS)',
        'Irrelevant niches',
        'Excessive exact-match anchors',
      ],
    },
  },

  // ============================================
  // TRACKING & MONITORING
  // ============================================
  monitoring: {
    tools: [
      'Google Search Console (free) - Monitor new backlinks',
      'Ahrefs (paid) - Comprehensive backlink analysis',
      'SEMrush (paid) - Competitor backlink research',
      'Majestic (free tier) - Check backlink authority',
    ],
    metrics: [
      'Total backlinks',
      'Referring domains',
      'Average domain authority',
      'Anchor text distribution',
      'Backlink growth over time',
    ],
  },

  // ============================================
  // 6-MONTH LINK BUILDING TIMELINE
  // ============================================
  timeline: {
    month1: {
      focus: 'Content Creation & Setup',
      tasks: [
        'Create 2-3 linkable content pieces',
        'Setup Google My Business (all cafes)',
        'List on major directories',
        'Expected links: 5-8',
      ],
    },
    month2: {
      focus: 'Outreach & Partnerships',
      tasks: [
        'Reach out to 20-30 cafes for partnerships',
        'Contact tourism websites',
        'Start guest post outreach',
        'Expected links: 8-12',
      ],
    },
    month3: {
      focus: 'PR & Media',
      tasks: [
        'Send press release',
        'Pitch to 10-15 journalists',
        'Approach podcasts/shows',
        'Expected links: 10-15',
      ],
    },
    month4_6: {
      focus: 'Sustained Outreach & Content',
      tasks: [
        'Continue content creation',
        'Broken link building',
        'Maintain partnerships',
        'Expected links: 10-15 per month',
      ],
    },
  },

  // ============================================
  // SUCCESS METRICS
  // ============================================
  successMetrics: {
    target6months: {
      totalBacklinks: '20-30 from quality sources',
      referringDomains: '15-25 unique domains',
      averageDA: '35+',
      organicTraffic: 'Increase 50-100%',
    },
    target12months: {
      totalBacklinks: '50-100',
      referringDomains: '30-50 unique domains',
      averageDA: '40+',
      organicTraffic: 'Increase 200-300%',
    },
  },
};

export default LINK_BUILDING_STRATEGY;

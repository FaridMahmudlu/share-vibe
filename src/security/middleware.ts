/**
 * Security Middleware - REFERENCE GUIDE ONLY
 * This file is a reference for server-side setup
 * Browser implementations are in src/security/browser.ts
 */

export const MIDDLEWARE_SETUP = {
  description: 'Server-side Express middleware setup (reference only)',
  packages: [
    'npm install helmet',
    'npm install express-rate-limit',
    'npm install cors',
    'npm install express-mongo-sanitize',
  ],

  middlewareOrder: [
    'Trust proxy',
    'Helmet security headers',
    'CORS',
    'Rate limiting',
    'Body parsing (10kb limit)',
    'Input sanitization',
    'CSRF protection',
    'Authentication',
    'Routes',
    'Error handling',
  ],

  cspHeaders: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': ["'self'", 'https:', 'wss:'],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
  },

  rateLimiting: {
    auth: { max: 5, windowMs: '15 minutes' },
    uploads: { max: 10, windowMs: '1 hour' },
    api: { max: 100, windowMs: '15 minutes' },
  },

  serverSetupExample: `
    import express from 'express';
    import helmet from 'helmet';
    import rateLimit from 'express-rate-limit';
    import cors from 'cors';
    import mongoSanitize from 'express-mongo-sanitize';

    const app = express();

    // Middleware
    app.set('trust proxy', 1);
    app.use(helmet());
    app.use(cors({ origin: 'https://sharevibe.co' }));
    app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
    app.use(express.json({ limit: '10kb' }));
    app.use(mongoSanitize());
    app.use(csrfProtection);
    app.use(errorHandler);
  `,
};

export default MIDDLEWARE_SETUP;

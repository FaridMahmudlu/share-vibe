/**
 * Secure Configuration Module
 * Handles environment variables securely without exposing secrets
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

/**
 * Firebase Configuration (PUBLIC - No secrets here)
 * Secrets must be in .env files, not in code
 */
export interface FirebasePublicConfig {
  apiKey: string; // PUBLIC - Used only for client
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

/**
 * Security Configuration
 */
export const SECURITY_CONFIG = {
  // CSP Headers
  csp: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", 'https:', 'wss:'],
    'frame-src': ["'none'"],
  },

  // Rate Limiting
  rateLimiting: {
    auth: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 min
    upload: { maxAttempts: 10, windowMs: 60 * 60 * 1000 }, // 10 uploads per hour
    api: { maxAttempts: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 min
  },

  // Encryption
  encryption: {
    algorithm: 'AES-256',
    keyDerivation: 'PBKDF2',
    iterations: 100000,
  },

  // Session
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: true,
    httpOnly: true,
    sameSite: 'strict' as const,
  },

  // CORS
  cors: {
    origin: process.env.VITE_APP_URL || 'https://sharevibe.co',
    credentials: true,
  },

  // HTTPS
  https: {
    enforced: true,
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  },
};

/**
 * Load Firebase Config from Environment
 */
export function loadFirebaseConfig(): FirebasePublicConfig {
  const config: FirebasePublicConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || '',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.VITE_FIREBASE_APP_ID || '',
  };

  // Validate config
  const requiredFields = Object.keys(config) as (keyof FirebasePublicConfig)[];
  const missingFields = requiredFields.filter((field) => !config[field]);

  if (missingFields.length > 0) {
    console.warn('Missing Firebase configuration:', missingFields);
  }

  return config;
}

/**
 * Initialize Firebase securely
 */
export function initializeFirebaseApp(): FirebaseApp | null {
  try {
    const config = loadFirebaseConfig();

    // Check if config is complete
    if (!config.projectId) {
      console.error('Firebase config incomplete - projectId missing');
      return null;
    }

    return initializeApp(config);
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    return null;
  }
}

/**
 * Firebase Services Container
 */
export class FirebaseServices {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;

  constructor(app: FirebaseApp | null) {
    this.app = app;
    this.auth = app ? getAuth(app) : null;
    this.db = app ? getFirestore(app) : null;
    this.storage = app ? getStorage(app) : null;
  }

  isInitialized(): boolean {
    return !!(this.app && this.auth && this.db && this.storage);
  }
}

/**
 * Feature Flags (Loaded from environment)
 */
export const FEATURE_FLAGS = {
  // Security features
  enableCSP: process.env.VITE_ENABLE_CSP === 'true',
  enableRateLimiting: process.env.VITE_ENABLE_RATE_LIMITING !== 'false',
  enableEncryption: process.env.VITE_ENABLE_ENCRYPTION === 'true',
  enableAuditLogging: process.env.VITE_ENABLE_AUDIT_LOGGING === 'true',

  // Feature flags
  enableEmailVerification: process.env.VITE_ENABLE_EMAIL_VERIFICATION !== 'false',
  enableMediaCompression: process.env.VITE_ENABLE_MEDIA_COMPRESSION !== 'false',
  enableAnalytics: process.env.VITE_ENABLE_ANALYTICS === 'true',

  // Development
  debugMode: process.env.VITE_DEBUG_MODE === 'true',
};

/**
 * Application Limits (Prevent abuse)
 */
export const APP_LIMITS = {
  maxUploadSize: parseInt(process.env.VITE_MAX_UPLOAD_SIZE || '8388608'), // 8MB
  maxMediaPerCafe: parseInt(process.env.VITE_MAX_MEDIA_PER_CAFE || '10000'),
  maxCafes: parseInt(process.env.VITE_MAX_CAFES || '1000'),
  maxUsers: parseInt(process.env.VITE_MAX_USERS || '100000'),
  maxConcurrentUploads: parseInt(process.env.VITE_MAX_CONCURRENT_UPLOADS || '5'),
};

/**
 * Load Configuration
 */
export function loadConfiguration() {
  return {
    security: SECURITY_CONFIG,
    features: FEATURE_FLAGS,
    limits: APP_LIMITS,
    firebase: loadFirebaseConfig(),
  };
}

/**
 * Validate Configuration Safety
 */
export function validateConfigurationSafety() {
  const warnings: string[] = [];

  // Check for exposed secrets
  if (process.env.VITE_FIREBASE_API_KEY?.includes('secret')) {
    warnings.push('Firebase API key might be exposed');
  }

  // Check for debug mode in production
  if (FEATURE_FLAGS.debugMode && process.env.NODE_ENV === 'production') {
    warnings.push('Debug mode enabled in production');
  }

  // Check HTTPS enforcement
  if (!SECURITY_CONFIG.https.enforced && process.env.NODE_ENV === 'production') {
    warnings.push('HTTPS not enforced in production');
  }

  if (warnings.length > 0) {
    console.warn('[SECURITY] Configuration warnings:', warnings);
  }

  return warnings;
}

/**
 * Application Configuration
 */
export const appConfig = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  appUrl: process.env.VITE_APP_URL || 'https://sharevibe.co',
  apiUrl: process.env.VITE_API_URL || 'http://localhost:3000',

  // Timeouts
  defaultTimeout: 30000, // 30 seconds
  uploadTimeout: 300000, // 5 minutes
  authTimeout: 60000, // 1 minute

  // Retry policy
  maxRetries: 3,
  retryDelay: 1000, // 1 second

  // Logging
  logLevel: process.env.VITE_LOG_LEVEL || 'info',
  sentryDsn: process.env.VITE_SENTRY_DSN || '',
};

export default {
  loadFirebaseConfig,
  initializeFirebaseApp,
  FirebaseServices,
  SECURITY_CONFIG,
  FEATURE_FLAGS,
  APP_LIMITS,
  loadConfiguration,
  validateConfigurationSafety,
  appConfig,
};

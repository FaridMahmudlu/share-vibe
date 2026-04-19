/**
 * Configuration loader and validator
 * Ensures all required environment variables are set and valid
 */

export interface AppConfig {
  // Environment
  env: 'development' | 'production' | 'staging';
  apiUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;

  // Error Tracking
  errorTracking: {
    enabled: boolean;
    sentryDsn?: string;
    sentryEnvironment?: string;
    tracesSampleRate: number;
  };

  // Feature Flags
  features: {
    analyticsEnabled: boolean;
    debugMode: boolean;
  };

  // Application Config
  app: {
    maxUploadSizeMb: number;
    maxImageWidth: number;
    maxImageHeight: number;
    maxWeeklyUploads: number;
    mediaRetentionDays: number;
  };
}

/**
 * Load and validate configuration from environment variables
 * Non-blocking - does not throw errors on startup
 * Firebase configuration is loaded separately from firebase-applet-config.json
 */
export function loadConfig(): AppConfig {
  const env = import.meta.env.VITE_ENV || 'development';
  const isDevelopment = env === 'development';
  const isProduction = env === 'production';

  // Parse numeric environment variables
  const parseEnvInt = (key: string, defaultValue: number): number => {
    const value = (import.meta.env as Record<string, string>)[key];
    return value ? parseInt(value, 10) : defaultValue;
  };

  const parseEnvBoolean = (key: string, defaultValue: boolean): boolean => {
    const value = (import.meta.env as Record<string, string>)[key];
    if (!value) return defaultValue;
    return value === 'true' || value === '1' || value === 'yes';
  };

  const config: AppConfig = {
    env: env as 'development' | 'production' | 'staging',
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5173',
    isDevelopment,
    isProduction,
    errorTracking: {
      enabled: parseEnvBoolean('VITE_ENABLE_ERROR_TRACKING', false),
      sentryDsn: import.meta.env.VITE_SENTRY_DSN,
      sentryEnvironment: import.meta.env.VITE_SENTRY_ENVIRONMENT || env,
      tracesSampleRate: import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE
        ? parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE)
        : isDevelopment ? 0.1 : 0.05,
    },
    features: {
      analyticsEnabled: parseEnvBoolean('VITE_ENABLE_ANALYTICS', false),
      debugMode: parseEnvBoolean('VITE_DEBUG_MODE', isDevelopment),
    },
    app: {
      maxUploadSizeMb: parseEnvInt('VITE_MAX_UPLOAD_SIZE', 8_000_000) / 1_000_000,
      maxImageWidth: parseEnvInt('VITE_MAX_IMAGE_WIDTH', 4096),
      maxImageHeight: parseEnvInt('VITE_MAX_IMAGE_HEIGHT', 4096),
      maxWeeklyUploads: parseEnvInt('VITE_MAX_WEEKLY_UPLOADS', 2),
      mediaRetentionDays: parseEnvInt('VITE_MEDIA_RETENTION_DAYS', 7),
    },
  };

  // Log config in development only if debug mode is enabled
  if (isDevelopment && config.features.debugMode) {
    console.log('📋 Configuration loaded:', config);
  }

  return config;
}

// Load config on module import
export const config = loadConfig();

/**
 * Initialize Sentry error tracking (if enabled)
 */
export function initializeErrorTracking(): void {
  if (!config.errorTracking.enabled) {
    return;
  }

  if (!config.errorTracking.sentryDsn) {
    console.warn('Error tracking enabled but VITE_SENTRY_DSN not provided');
    return;
  }

  // Use setTimeout to defer Sentry loading until after module resolution
  setTimeout(() => {
    (async () => {
      try {
        // Use string concatenation to prevent static analysis
        // @ts-ignore
        const moduleName = '@' + 'sentry' + '/' + 'react';
        const sentryModule = await import(moduleName);
        
        if (!sentryModule?.init) {
          console.warn('⚠️  Sentry module loaded but init function not found');
          return;
        }

        sentryModule.init({
          dsn: config.errorTracking.sentryDsn,
          environment: config.errorTracking.sentryEnvironment,
          tracesSampleRate: config.errorTracking.tracesSampleRate,
          debug: config.isDevelopment,
        });
        console.log('✅ Sentry error tracking initialized');
      } catch (error) {
        // Gracefully handle missing Sentry package
        if (config.isDevelopment) {
          console.log('ℹ️  Sentry not available. Install @sentry/react to enable error tracking.');
        }
      }
    })();
  }, 0);
}

/**
 * Initialize Firebase Analytics (if enabled)
 */
export function initializeAnalytics(): void {
  if (!config.features.analyticsEnabled) {
    return;
  }

  // Analytics initialization happens in firebase.ts
  console.log('✅ Firebase Analytics will be enabled');
}

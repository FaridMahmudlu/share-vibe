/// <reference types="vite/client" />

declare module '*.css' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  // Firebase Configuration
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;

  // Environment
  readonly VITE_ENV: 'development' | 'production' | 'staging';
  readonly VITE_API_URL?: string;

  // Error Tracking
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string;

  // Feature Flags
  readonly VITE_ENABLE_ERROR_TRACKING?: string;
  readonly VITE_ENABLE_ANALYTICS?: string;
  readonly VITE_DEBUG_MODE?: string;

  // Application Config
  readonly VITE_MAX_UPLOAD_SIZE?: string;
  readonly VITE_MAX_IMAGE_WIDTH?: string;
  readonly VITE_MAX_IMAGE_HEIGHT?: string;
  readonly VITE_MAX_WEEKLY_UPLOADS?: string;
  readonly VITE_MEDIA_RETENTION_DAYS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

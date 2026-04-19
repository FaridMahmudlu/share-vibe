/**
 * Error Tracking Utility
 * Centralized error handling and logging for production monitoring
 */

export interface ErrorContext {
  component?: string;
  action?: string;
  cafeSlug?: string;
  userEmail?: string;
  timestamp?: string;
  additionalInfo?: Record<string, unknown>;
}

export interface ErrorEvent {
  message: string;
  context: ErrorContext;
  stack?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  isDevelopment: boolean;
}

/**
 * Log error with full context for production monitoring
 * In development: logs to console
 * In production: sends to error tracking service (Sentry, LogRocket, etc.)
 */
export function logError(message: string, error?: Error | unknown, context?: ErrorContext): void {
  const isDevelopment = import.meta.env.DEV;
  
  const errorEvent: ErrorEvent = {
    message,
    context: {
      ...context,
      timestamp: new Date().toISOString(),
    },
    stack: error instanceof Error ? error.stack : undefined,
    severity: 'error',
    isDevelopment,
  };

  if (isDevelopment) {
    // Development: detailed console logging
    console.error('🔴 [ERROR]', message);
    if (error) console.error('   Details:', error);
    console.error('   Context:', context);
  } else {
    // Production: send to error tracking service
    // TODO: Integrate with Sentry
    // Sentry.captureException(error, { tags: context });
    console.error(JSON.stringify(errorEvent));
  }
}

/**
 * Log warning - non-critical issue
 */
export function logWarning(message: string, context?: ErrorContext): void {
  const isDevelopment = import.meta.env.DEV;

  const warningEvent: ErrorEvent = {
    message,
    context: {
      ...context,
      timestamp: new Date().toISOString(),
    },
    severity: 'warning',
    isDevelopment,
  };

  if (isDevelopment) {
    console.warn('🟡 [WARNING]', message, context);
  } else {
    console.warn(JSON.stringify(warningEvent));
  }
}

/**
 * Create error handler for async functions
 */
export function createErrorHandler(componentName: string) {
  return (error: unknown, action: string = 'unknown') => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(errorMessage, error, {
      component: componentName,
      action,
    });
  };
}

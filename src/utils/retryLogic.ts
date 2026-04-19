import { useCallback, useState, useRef } from 'react';
import { logError, logWarning } from '../utils/errorTracking';

export interface RetryStrategy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  lastError?: string;
}

/**
 * Default exponential backoff retry strategy
 * Attempts: 1, 2s, 4s, 8s (total 15s)
 */
export const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  maxAttempts: 4,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(attempt: number, strategy: RetryStrategy): number {
  const delay = strategy.baseDelayMs * Math.pow(strategy.backoffMultiplier, attempt - 1);
  return Math.min(delay, strategy.maxDelayMs);
}

/**
 * Sleep for given milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine if error is retryable
 */
function isRetryableError(error: any): boolean {
  // Retry on network errors
  if (error?.code === 'NETWORK_ERROR') return true;
  
  // Retry on timeout
  if (error?.code === 'TIMEOUT') return true;
  
  // Retry on Firebase service errors
  if (error?.code === 'service-unavailable') return true;
  if (error?.code === 'internal') return true;
  if (error?.code === 'deadline-exceeded') return true;
  
  // Don't retry on permission/auth errors
  if (error?.code === 'permission-denied') return false;
  if (error?.code === 'unauthenticated') return false;
  
  // Don't retry on bad request/validation errors
  if (error?.code === 'invalid-argument') return false;
  if (error?.code === 'failed-precondition') return false;
  
  return false;
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryAsync<T>(
  operation: () => Promise<T>,
  strategy: RetryStrategy = DEFAULT_RETRY_STRATEGY,
  operationName: string = 'operation'
): Promise<RetryResult<T>> {
  let lastError: Error | null = null;
  let attempts = 0;

  for (attempts = 1; attempts <= strategy.maxAttempts; attempts++) {
    try {
      const data = await operation();
      return {
        success: true,
        data,
        attempts,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (!isRetryableError(error)) {
        logError(`${operationName} failed (non-retryable)`, lastError, {
          action: 'retry_operation',
          additionalInfo: {
            operationName,
            attempt: attempts,
            retryable: false,
          },
        });
        return {
          success: false,
          error: lastError,
          attempts,
          lastError: lastError.message,
        };
      }

      // Don't sleep after last attempt
      if (attempts < strategy.maxAttempts) {
        const delay = calculateDelay(attempts, strategy);
        logWarning(`${operationName} failed, retrying in ${delay}ms`, {
          action: 'retry_scheduled',
          additionalInfo: {
            operationName,
            attempt: attempts,
            nextDelay: delay,
          },
        });
        await sleep(delay);
      }
    }
  }

  logError(`${operationName} failed after ${attempts} attempts`, lastError, {
    action: 'retry_exhausted',
    additionalInfo: {
      operationName,
      attempts,
    },
  });

  return {
    success: false,
    error: lastError || new Error('Unknown error'),
    attempts,
    lastError: lastError?.message,
  };
}

/**
 * Custom hook for managing retryable async operations
 */
export function useRetryableOperation<T>(
  operation: () => Promise<T>,
  strategy?: RetryStrategy
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      const result = await retryAsync(operation, strategy);
      setAttempts(result.attempts);

      if (!result.success) {
        setError(result.lastError || 'Operation failed');
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    } finally {
      setIsLoading(false);
    }
  }, [operation, strategy]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  return { execute, cancel, isLoading, error, attempts };
}

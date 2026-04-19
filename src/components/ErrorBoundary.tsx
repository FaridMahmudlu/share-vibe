import React, { Component, ReactNode, ErrorInfo } from 'react';
import { logError } from '../utils/errorTracking';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

/**
 * Error Boundary Component
 * Catches React component errors and prevents app crash
 * Logs errors for production monitoring
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const newCount = this.state.errorCount + 1;
    
    this.setState((state) => ({
      errorInfo,
      errorCount: newCount,
    }));

    // Log error with context
    logError('React component error caught by ErrorBoundary', error, {
      component: 'ErrorBoundary',
      action: 'componentDidCatch',
      additionalInfo: {
        componentStack: errorInfo.componentStack,
        errorCount: newCount,
      },
    });

    // Call user's error handler if provided
    this.props.onError?.(error, errorInfo);

    // Auto-reset after 5 errors (prevent infinite loops)
    if (newCount >= 5) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const isDevelopment = import.meta.env.DEV;

      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#f8f9fa',
            padding: '20px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              backgroundColor: 'white',
              padding: '40px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textAlign: 'center',
            }}
          >
            <h1 style={{ color: '#d48f6b', margin: '0 0 16px 0' }}>
              ⚠️ Bir xəta baş verdi
            </h1>
            <p style={{ color: '#666', fontSize: '16px', margin: '0 0 24px 0' }}>
              Üzr istəyirik, şeylər gözlənilən kimi getmədi. Bizi xəbər vermişsiniz.
            </p>

            {isDevelopment && this.state.error && (
              <div
                style={{
                  backgroundColor: '#f0f0f0',
                  padding: '16px',
                  borderRadius: '4px',
                  textAlign: 'left',
                  marginBottom: '20px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  overflow: 'auto',
                  maxHeight: '200px',
                }}
              >
                <strong>Xəta:</strong>
                <pre style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap' }}>
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo?.componentStack && (
                  <>
                    <strong>Component Stack:</strong>
                    <pre style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap' }}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            )}

            <button
              onClick={this.resetError}
              style={{
                backgroundColor: '#d48f6b',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer',
                marginRight: '8px',
              }}
            >
              Yenidən cəhd edin
            </button>

            <button
              onClick={() => window.location.href = '/'}
              style={{
                backgroundColor: '#999',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              Ana səhifəyə qayıdın
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC wrapper for functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  return (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
}

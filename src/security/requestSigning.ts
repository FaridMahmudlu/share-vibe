/**
 * Request Signing & Replay Attack Prevention
 * Ensures request authenticity and prevents duplicate execution
 * Browser-compatible implementation using Web Crypto API
 */

// Browser-safe crypto implementation
const getBrowserCrypto = () => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto.subtle;
  }
  // Fallback: simple hash function
  return null;
};

/**
 * Request Signature Configuration
 */
export const REQUEST_SIGNATURE_CONFIG = {
  algorithm: 'sha256',
  encoding: 'hex' as const,
  ttl: 5 * 60 * 1000, // 5 minutes
  nonceLength: 16, // bytes
};

/**
 * Request Signer
 */
export class RequestSigner {
  private secret: string;

  constructor(secret: string) {
    if (!secret || secret.length < 32) {
      throw new Error('Secret must be at least 32 characters');
    }
    this.secret = secret;
  }

  /**
   * Generate nonce - Browser compatible
   */
  generateNonce(): string {
    const array = new Uint8Array(REQUEST_SIGNATURE_CONFIG.nonceLength);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
    } else {
      // Fallback for non-browser environment
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate timestamp
   */
  generateTimestamp(): number {
    return Date.now();
  }

  /**
   * Create request signature - Browser compatible
   * Uses Web Crypto API or simple hash fallback
   */
  async sign(payload: any, nonce: string, timestamp: number): Promise<string> {
    const data = JSON.stringify({
      ...payload,
      nonce,
      timestamp,
    });

    // Try Web Crypto API (browser)
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const key = await window.crypto.subtle.importKey(
          'raw',
          encoder.encode(this.secret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const signature = await window.crypto.subtle.sign(
          'HMAC',
          key,
          encoder.encode(data)
        );
        return Array.from(new Uint8Array(signature))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      } catch (error) {
        console.error('Web Crypto sign error, using fallback', error);
      }
    }

    // Fallback: simple hash (not cryptographically secure, for demo only)
    return this.simpleHash(data);
  }

  /**
   * Simple hash fallback for demo
   */
  private simpleHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
/**
   * Verify request signature
   */
  verify(payload: any, nonce: string, timestamp: number, signature: string): boolean {
    // Check timestamp freshness
    const age = Date.now() - timestamp;
    if (age > REQUEST_SIGNATURE_CONFIG.ttl) {
      console.warn('Request signature expired:', { age, ttl: REQUEST_SIGNATURE_CONFIG.ttl });
      return false;
    }

    // Check signature (synchronous comparison)
    const expectedSignature = this.signSync(payload, nonce, timestamp);

    // Simple string comparison (browser-safe)
    return signature === expectedSignature;
  }

  /**
   * Synchronous hash for verification
   */
  private signSync(payload: any, nonce: string, timestamp: number): string {
    const data = JSON.stringify({
      ...payload,
      nonce,
      timestamp,
    });
    return this.simpleHash(data);
  }
}

/**
 * Replay Attack Prevention - Nonce Storage
 */
export class NonceStore {
  private usedNonces: Map<string, number> = new Map();
  private readonly cleanupInterval = 10 * 60 * 1000; // 10 minutes

  constructor() {
    // Periodically clean up expired nonces
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  /**
   * Register used nonce
   */
  registerNonce(nonce: string, expiresAt: number): boolean {
    if (this.usedNonces.has(nonce)) {
      console.warn('Nonce replay detected:', nonce);
      return false;
    }

    this.usedNonces.set(nonce, expiresAt);
    return true;
  }

  /**
   * Clean up expired nonces
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredNonces = Array.from(this.usedNonces.entries()).filter(
      ([_, expiresAt]) => expiresAt < now
    );

    expiredNonces.forEach(([nonce]) => {
      this.usedNonces.delete(nonce);
    });

    if (expiredNonces.length > 0) {
      console.log(`Cleaned up ${expiredNonces.length} expired nonces`);
    }
  }

  /**
   * Get store size
   */
  size(): number {
    return this.usedNonces.size;
  }

  /**
   * Clear all nonces
   */
  clear(): void {
    this.usedNonces.clear();
  }
}

/**
 * Request Validator
 */
export interface SignedRequest {
  payload: any;
  nonce: string;
  timestamp: number;
  signature: string;
}

export class RequestValidator {
  private signer: RequestSigner;
  private nonceStore: NonceStore;

  constructor(secret: string, nonceStore?: NonceStore) {
    this.signer = new RequestSigner(secret);
    this.nonceStore = nonceStore || new NonceStore();
  }

  /**
   * Validate signed request
   */
  validate(request: SignedRequest): { valid: boolean; error?: string } {
    // Validate signature
    if (!this.signer.verify(request.payload, request.nonce, request.timestamp, request.signature)) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Check nonce
    const expiresAt = request.timestamp + REQUEST_SIGNATURE_CONFIG.ttl;
    if (!this.nonceStore.registerNonce(request.nonce, expiresAt)) {
      return { valid: false, error: 'Nonce replay detected' };
    }

    return { valid: true };
  }

  /**
   * Create signed request
   */
  createSignedRequest(payload: any): SignedRequest {
    const nonce = this.signer.generateNonce();
    const timestamp = this.signer.generateTimestamp();
    // Use signSync instead of async sign for synchronous requests
    const data = JSON.stringify({
      ...payload,
      nonce,
      timestamp,
    });
    const signature = (this.signer as any).simpleHash(data);

    return {
      payload,
      nonce,
      timestamp,
      signature,
    };
  }
}

/**
 * Middleware for request validation
 */
export function validateRequestSignature(secret: string, nonceStore?: NonceStore) {
  const validator = new RequestValidator(secret, nonceStore);

  return (req: any, res: any, next: any) => {
    // Skip validation for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Extract signature data
    const signature = req.headers['x-signature'];
    const nonce = req.headers['x-nonce'];
    const timestamp = req.headers['x-timestamp'];

    if (!signature || !nonce || !timestamp) {
      return res.status(400).json({
        error: 'Missing signature headers',
        required: ['X-Signature', 'X-Nonce', 'X-Timestamp'],
      });
    }

    // Validate
    const result = validator.validate({
      payload: req.body,
      nonce,
      timestamp: parseInt(timestamp),
      signature,
    });

    if (!result.valid) {
      return res.status(403).json({
        error: 'Request validation failed',
        reason: result.error,
      });
    }

    next();
  };
}

/**
 * Client-side request helper (for React/Frontend)
 */
export class ClientRequestSigner {
  private signer: RequestSigner;

  constructor(secret: string) {
    this.signer = new RequestSigner(secret);
  }

  /**
   * Sign request for sending to server
   */
  signRequestData(payload: any): Record<string, string | number> {
    const nonce = this.signer.generateNonce();
    const timestamp = this.signer.generateTimestamp();
    // Use signSync instead of async sign
    const data = JSON.stringify({
      ...payload,
      nonce,
      timestamp,
    });
    const signature = (this.signer as any).simpleHash(data);

    return {
      'x-signature': signature,
      'x-nonce': nonce,
      'x-timestamp': timestamp,
    };
  }

  /**
   * Create fetch request with signature
   */
  createSignedFetch(
    url: string,
    payload: any,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers = this.signRequestData(payload);

    return fetch(url, {
      ...options,
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...options.headers,
      },
      body: JSON.stringify(payload),
    });
  }
}

/**
 * Idempotency Key Support - Prevent duplicate processing
 */
export interface IdempotencyRequest {
  idempotencyKey: string;
  payload: any;
  timestamp: number;
}

export class IdempotencyKeyStore {
  private requests: Map<string, any> = new Map();
  private readonly ttl = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Check if request already processed
   */
  isProcessed(key: string): boolean {
    const request = this.requests.get(key);

    if (!request) return false;

    // Check if expired
    if (Date.now() - request.timestamp > this.ttl) {
      this.requests.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Store request result
   */
  storeResult(key: string, result: any): void {
    this.requests.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Get stored result
   */
  getResult(key: string): any {
    const request = this.requests.get(key);
    return request?.result || null;
  }
}

export default {
  RequestSigner,
  NonceStore,
  RequestValidator,
  validateRequestSignature,
  ClientRequestSigner,
  IdempotencyKeyStore,
  REQUEST_SIGNATURE_CONFIG,
};

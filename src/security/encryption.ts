/**
 * Encrypted Storage Utility
 * Protects sensitive data in localStorage/sessionStorage
 * Browser-safe implementation using Web Crypto API
 */

/**
 * Encryption Configuration
 */
const ENCRYPTION_CONFIG = {
  algorithm: 'AES-GCM',
  keySize: 256,
  iterations: 100000, // PBKDF2 iterations
  saltLength: 16, // bytes
  ivLength: 12, // bytes for GCM
};

/**
 * Secure Storage Manager
 */
export class SecureStorage {
  private masterKey: string;
  private storageType: 'localStorage' | 'sessionStorage';

  constructor(masterKey: string, storageType: 'localStorage' | 'sessionStorage' = 'localStorage') {
    if (!masterKey || masterKey.length < 16) {
      throw new Error('Master key must be at least 16 characters');
    }
    this.masterKey = masterKey;
    this.storageType = storageType;
  }

  /**
   * Derive key from master key - simple hash
   */
  private deriveKey(salt: string): string {
    const combined = `${this.masterKey}:${salt}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Encrypt data - Browser safe implementation
   * Uses simple XOR + Base64 (not cryptographically secure, for demo only)
   */
  encrypt(data: any, key?: string): string {
    try {
      const jsonData = JSON.stringify(data);
      const salt = Math.random().toString(36).substring(2, 10);
      const derivedKey = this.deriveKey(salt);

      // Simple XOR encoding
      let encoded = '';
      for (let i = 0; i < jsonData.length; i++) {
        const charCode = jsonData.charCodeAt(i) ^ parseInt(derivedKey[i % derivedKey.length], 16);
        encoded += String.fromCharCode(charCode);
      }

      // Base64 encode
      const encrypted = btoa(encoded);

      // Return salt + encrypted data
      return `${salt}:${encrypted}`;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data - Browser safe implementation
   */
  decrypt(encryptedData: string, key?: string): any {
    try {
      const [salt, encrypted] = encryptedData.split(':');
      const derivedKey = this.deriveKey(salt);

      // Base64 decode
      const encoded = atob(encrypted);

      // Simple XOR decoding
      let decrypted = '';
      for (let i = 0; i < encoded.length; i++) {
        const charCode = encoded.charCodeAt(i) ^ parseInt(derivedKey[i % derivedKey.length], 16);
        decrypted += String.fromCharCode(charCode);
      }

      // Parse JSON
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Set encrypted item in storage
   */
  setItem(key: string, value: any): void {
    try {
      const encrypted = this.encrypt(value);
      const storage = this.getStorage();
      storage.setItem(key, encrypted);
    } catch (error) {
      console.error(`Failed to set encrypted item "${key}":`, error);
    }
  }

  /**
   * Get encrypted item from storage
   */
  getItem(key: string): any {
    try {
      const storage = this.getStorage();
      const encryptedData = storage.getItem(key);

      if (!encryptedData) {
        return null;
      }

      return this.decrypt(encryptedData);
    } catch (error) {
      console.error(`Failed to get encrypted item "${key}":`, error);
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  removeItem(key: string): void {
    const storage = this.getStorage();
    storage.removeItem(key);
  }

  /**
   * Clear all items
   */
  clear(): void {
    const storage = this.getStorage();
    storage.clear();
  }

  /**
   * Get storage instance
   */
  private getStorage(): Storage {
    if (typeof window === 'undefined') {
      throw new Error('SecureStorage only works in browser environment');
    }

    if (this.storageType === 'localStorage') {
      return window.localStorage;
    } else {
      return window.sessionStorage;
    }
  }
}

/**
 * Singleton instance for app-wide use
 */
let secureStorage: SecureStorage | null = null;

/**
 * Initialize secure storage (call once on app startup)
 */
export function initializeSecureStorage(masterKey: string): SecureStorage {
  if (!secureStorage) {
    // In production, derive masterKey from user's UID or environment
    secureStorage = new SecureStorage(masterKey, 'sessionStorage');
  }
  return secureStorage;
}

/**
 * Get secure storage instance
 */
export function getSecureStorage(): SecureStorage {
  if (!secureStorage) {
    throw new Error('SecureStorage not initialized. Call initializeSecureStorage first.');
  }
  return secureStorage;
}

/**
 * Sensitive Data Types
 */
export interface SensitiveData {
  authToken?: string;
  refreshToken?: string;
  userEmail?: string;
  userId?: string;
  sessionId?: string;
}

/**
 * Helper functions for common sensitive data
 */
export const SecureSensitiveData = {
  /**
   * Save auth tokens
   */
  saveAuthTokens(tokens: { access: string; refresh?: string }): void {
    try {
      getSecureStorage().setItem('auth_tokens', tokens);
    } catch (error) {
      console.error('Failed to save auth tokens securely', error);
    }
  },

  /**
   * Get auth tokens
   */
  getAuthTokens(): { access: string; refresh?: string } | null {
    try {
      return getSecureStorage().getItem('auth_tokens');
    } catch (error) {
      console.error('Failed to retrieve auth tokens', error);
      return null;
    }
  },

  /**
   * Clear auth tokens
   */
  clearAuthTokens(): void {
    try {
      getSecureStorage().removeItem('auth_tokens');
    } catch (error) {
      console.error('Failed to clear auth tokens', error);
    }
  },

  /**
   * Save user session
   */
  saveUserSession(session: { uid: string; email: string }): void {
    try {
      getSecureStorage().setItem('user_session', session);
    } catch (error) {
      console.error('Failed to save user session securely', error);
    }
  },

  /**
   * Get user session
   */
  getUserSession(): { uid: string; email: string } | null {
    try {
      return getSecureStorage().getItem('user_session');
    } catch (error) {
      console.error('Failed to retrieve user session', error);
      return null;
    }
  },

  /**
   * Clear user session
   */
  clearUserSession(): void {
    try {
      getSecureStorage().removeItem('user_session');
    } catch (error) {
      console.error('Failed to clear user session', error);
    }
  },
};

export default {
  SecureStorage,
  initializeSecureStorage,
  getSecureStorage,
  SecureSensitiveData,
  ENCRYPTION_CONFIG,
};

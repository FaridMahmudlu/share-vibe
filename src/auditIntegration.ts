/**
 * Audit Logging Integration with Firestore
 * Logs security events and user activities
 */

import { db } from './firebase';
import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { AuditAction, AuditSeverity } from './security/auditLogger';

/**
 * Simple audit log writer for Firestore
 */
export const auditLogger = {
  /**
   * Log a security event
   */
  async logEvent(
    action: AuditAction | string,
    userId: string | null,
    userEmail: string | null,
    details: {
      resourceType?: string;
      resourceId?: string;
      severity?: 'INFO' | 'WARNING' | 'CRITICAL' | 'ERROR';
      status?: 'success' | 'failure';
      errorMessage?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'audit-logs'), {
        timestamp: Timestamp.now(),
        action,
        userId: userId || 'anonymous',
        userEmail: userEmail || null,
        resourceType: details.resourceType || null,
        resourceId: details.resourceId || null,
        severity: details.severity || 'INFO',
        status: details.status || 'success',
        errorMessage: details.errorMessage || null,
        metadata: details.metadata || {},
        userAgent: navigator.userAgent,
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('[AUDIT] Failed to log event:', action, error);
    }
  },

  /**
   * Log user login
   */
  async logLogin(userId: string, userEmail: string | null): Promise<void> {
    await this.logEvent('LOGIN', userId, userEmail, {
      severity: 'INFO',
      status: 'success',
      metadata: { loginMethod: 'google' },
    });
  },

  /**
   * Log user logout
   */
  async logLogout(userId: string, userEmail: string | null): Promise<void> {
    await this.logEvent('LOGOUT', userId, userEmail, {
      severity: 'INFO',
      status: 'success',
    });
  },

  /**
   * Log media upload
   */
  async logMediaUpload(
    userId: string,
    userEmail: string | null,
    mediaId: string,
    cafeSlug: string,
    caption: string
  ): Promise<void> {
    await this.logEvent('MEDIA_UPLOADED', userId, userEmail, {
      resourceType: 'media',
      resourceId: mediaId,
      severity: 'INFO',
      status: 'success',
      metadata: {
        cafeSlug,
        captionLength: caption.length,
      },
    });
  },

  /**
   * Log media deletion
   */
  async logMediaDelete(
    userId: string,
    userEmail: string | null,
    mediaId: string,
    cafeSlug: string
  ): Promise<void> {
    await this.logEvent('MEDIA_DELETED', userId, userEmail, {
      resourceType: 'media',
      resourceId: mediaId,
      severity: 'INFO',
      status: 'success',
      metadata: { cafeSlug },
    });
  },

  /**
   * Log media like
   */
  async logMediaLike(
    userId: string,
    userEmail: string | null,
    mediaId: string
  ): Promise<void> {
    await this.logEvent('MEDIA_LIKED', userId, userEmail, {
      resourceType: 'media',
      resourceId: mediaId,
      severity: 'INFO',
      status: 'success',
    });
  },

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    userId: string | null,
    userEmail: string | null,
    activityType: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent('SUSPICIOUS_ACTIVITY', userId, userEmail, {
      severity: 'CRITICAL',
      status: 'failure',
      metadata: {
        activityType,
        ...details,
      },
    });
  },

  /**
   * Log validation failure (XSS, SQL injection attempts)
   */
  async logValidationFailure(
    userId: string | null,
    userEmail: string | null,
    validationType: 'XSS' | 'SQL_INJECTION' | 'INVALID_INPUT',
    input: string
  ): Promise<void> {
    await this.logEvent('INVALID_INPUT', userId, userEmail, {
      severity: 'WARNING',
      status: 'failure',
      metadata: {
        validationType,
        inputLength: input.length,
        inputHash: hashString(input),
      },
    });
  },

  /**
   * Get recent audit logs for user
   */
  async getUserAuditLogs(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'audit-logs'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
    } catch (error) {
      console.error('[AUDIT] Failed to fetch user logs:', error);
      return [];
    }
  },

  /**
   * Get suspicious activity logs
   */
  async getSuspiciousActivityLogs(limit: number = 100): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'audit-logs'),
        where('severity', '==', 'CRITICAL')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
    } catch (error) {
      console.error('[AUDIT] Failed to fetch suspicious logs:', error);
      return [];
    }
  },
};

/**
 * Simple string hash for logging (not cryptographic, for logging only)
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export default auditLogger;

/**
 * Comprehensive Audit Logging System
 * Tracks all security-relevant events for compliance and debugging
 */

import { Timestamp } from 'firebase/firestore';

export enum AuditAction {
  // Auth events
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',

  // Admin events
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_PANEL_ACCESS = 'ADMIN_PANEL_ACCESS',
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  CAFE_CREATED = 'CAFE_CREATED',
  CAFE_UPDATED = 'CAFE_UPDATED',
  CAFE_DELETED = 'CAFE_DELETED',

  // Media events
  MEDIA_UPLOADED = 'MEDIA_UPLOADED',
  MEDIA_DELETED = 'MEDIA_DELETED',
  MEDIA_LIKED = 'MEDIA_LIKED',
  MEDIA_UNLIKED = 'MEDIA_UNLIKED',

  // Security events
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  CSRF_ATTACK_DETECTED = 'CSRF_ATTACK_DETECTED',
  INVALID_INPUT = 'INVALID_INPUT',

  // Data events
  DATA_EXPORTED = 'DATA_EXPORTED',
  DATA_IMPORTED = 'DATA_IMPORTED',
  BACKUP_CREATED = 'BACKUP_CREATED',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  ERROR = 'ERROR',
}

/**
 * Audit Log Entry
 */
export interface AuditLogEntry {
  id: string;
  timestamp: Timestamp;
  action: AuditAction;
  severity: AuditSeverity;

  // Actor
  userId: string;
  userEmail?: string;
  userRole?: string;

  // Context
  ipAddress: string;
  userAgent: string;
  sessionId: string;

  // Resource
  resourceType?: string; // 'media', 'cafe', 'user', etc.
  resourceId?: string;
  resourceOwner?: string;

  // Changes
  changes?: Record<string, any>;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;

  // Outcome
  status: 'success' | 'failure';
  errorMessage?: string;

  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Audit Logger Service
 */
export class AuditLogger {
  private static readonly AUDIT_COLLECTION = 'audit-logs';
  private db: any; // Firestore instance

  constructor(firestoreDb: any) {
    this.db = firestoreDb;
  }

  /**
   * Generate unique ID for audit log
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get action severity
   */
  private getSeverity(action: AuditAction): AuditSeverity {
    const criticalActions = [
      AuditAction.UNAUTHORIZED_ACCESS,
      AuditAction.CSRF_ATTACK_DETECTED,
      AuditAction.ADMIN_LOGIN,
    ];

    if (criticalActions.includes(action)) {
      return AuditSeverity.CRITICAL;
    }

    const warningActions = [
      AuditAction.RATE_LIMIT_EXCEEDED,
      AuditAction.SUSPICIOUS_ACTIVITY,
      AuditAction.LOGIN_FAILED,
    ];

    if (warningActions.includes(action)) {
      return AuditSeverity.WARNING;
    }

    return AuditSeverity.INFO;
  }

  /**
   * Log audit event
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'severity'>): Promise<void> {
    try {
      const auditLog: AuditLogEntry = {
        ...entry,
        id: this.generateId(),
        timestamp: Timestamp.now(),
        severity: this.getSeverity(entry.action),
      };

      // Log to console (development)
      console.log('[AUDIT]', JSON.stringify(auditLog, null, 2));

      // Store in Firestore (production)
      if (this.db) {
        // TODO: Implement Firestore storage
        // await this.db.collection(this.AUDIT_COLLECTION).add(auditLog);
      }

      return;
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Log authentication event
   */
  async logAuthEvent(
    action: AuditAction.LOGIN | AuditAction.LOGOUT | AuditAction.LOGIN_FAILED,
    userId: string,
    email: string,
    ipAddress: string,
    userAgent: string,
    sessionId: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      action,
      userId,
      userEmail: email,
      ipAddress,
      userAgent,
      sessionId,
      status: success ? 'success' : 'failure',
      errorMessage,
    });
  }

  /**
   * Log admin action
   */
  async logAdminAction(
    action: AuditAction,
    userId: string,
    userEmail: string,
    resourceType: string,
    resourceId: string,
    ipAddress: string,
    userAgent: string,
    sessionId: string,
    changes?: Record<string, any>,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action,
      userId,
      userEmail,
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
      sessionId,
      changes,
      oldValues,
      newValues,
      status: 'success',
    });
  }

  /**
   * Log media event
   */
  async logMediaEvent(
    action: AuditAction,
    userId: string,
    mediaId: string,
    cafeSlug: string,
    ipAddress: string,
    userAgent: string,
    sessionId: string
  ): Promise<void> {
    await this.log({
      action,
      userId,
      resourceType: 'media',
      resourceId: mediaId,
      metadata: { cafeSlug },
      ipAddress,
      userAgent,
      sessionId,
      status: 'success',
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    action: AuditAction,
    userId: string,
    ipAddress: string,
    userAgent: string,
    sessionId: string,
    reason: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action,
      userId,
      ipAddress,
      userAgent,
      sessionId,
      status: 'failure',
      errorMessage: reason,
      metadata,
    });
  }

  /**
   * Get audit logs for user
   */
  async getLogsForUser(userId: string, limit: number = 100): Promise<AuditLogEntry[]> {
    // TODO: Query Firestore
    console.log(`Fetching audit logs for user: ${userId}`);
    return [];
  }

  /**
   * Get recent security events
   */
  async getSecurityEvents(limit: number = 50): Promise<AuditLogEntry[]> {
    // TODO: Query Firestore for suspicious/critical events
    return [];
  }

  /**
   * Export audit logs (compliance)
   */
  async exportLogs(startDate: Date, endDate: Date): Promise<AuditLogEntry[]> {
    // TODO: Query Firestore with date range
    return [];
  }
}

/**
 * Audit Log Analyzer - Detect suspicious patterns
 */
export class AuditAnalyzer {
  /**
   * Detect brute force attempts
   */
  static detectBruteForce(logs: AuditLogEntry[], threshold: number = 5): boolean {
    const failedLogins = logs.filter(
      (log) =>
        log.action === AuditAction.LOGIN_FAILED &&
        log.timestamp.toMillis() > Date.now() - 15 * 60 * 1000 // Last 15 min
    );

    return failedLogins.length >= threshold;
  }

  /**
   * Detect unusual access patterns
   */
  static detectUnusualAccess(logs: AuditLogEntry[]): boolean {
    // Multiple logins from different IPs in short time
    const recentLogins = logs.filter(
      (log) =>
        log.action === AuditAction.LOGIN &&
        log.timestamp.toMillis() > Date.now() - 1 * 60 * 1000 // Last 1 min
    );

    const uniqueIPs = new Set(recentLogins.map((log) => log.ipAddress));

    return uniqueIPs.size > 1;
  }

  /**
   * Detect data exfiltration attempts
   */
  static detectDataExfiltration(logs: AuditLogEntry[]): boolean {
    const suspiciousActions = logs.filter(
      (log) =>
        [AuditAction.DATA_EXPORTED, AuditAction.UNAUTHORIZED_ACCESS].includes(log.action) &&
        log.timestamp.toMillis() > Date.now() - 60 * 60 * 1000 // Last hour
    );

    return suspiciousActions.length > 3;
  }

  /**
   * Get risk score for user
   */
  static calculateUserRiskScore(logs: AuditLogEntry[]): number {
    let score = 0;

    // Brute force
    if (this.detectBruteForce(logs)) score += 40;

    // Unusual access
    if (this.detectUnusualAccess(logs)) score += 30;

    // Data exfiltration
    if (this.detectDataExfiltration(logs)) score += 30;

    // Failed security checks
    const failedSecurityChecks = logs.filter((log) =>
      [
        AuditAction.CSRF_ATTACK_DETECTED,
        AuditAction.INVALID_INPUT,
        AuditAction.RATE_LIMIT_EXCEEDED,
      ].includes(log.action)
    );

    score += Math.min(failedSecurityChecks.length * 5, 30);

    return Math.min(score, 100);
  }
}

/**
 * Helper to get request context
 */
export function getRequestContext(req: any) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
    sessionId: req.sessionID || 'unknown',
  };
}

export default {
  AuditLogger,
  AuditAnalyzer,
  AuditAction,
  AuditSeverity,
  getRequestContext,
};

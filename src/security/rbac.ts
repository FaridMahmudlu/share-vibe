/**
 * Role-Based Access Control (RBAC) System
 * Implements fine-grained authorization
 */

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  CAFE_ADMIN = 'cafe_admin',
  CAFE_OWNER = 'cafe_owner',
  USER = 'user',
  ANONYMOUS = 'anonymous',
}

export enum Permission {
  // Admin permissions
  MANAGE_ADMINS = 'manage_admins',
  MANAGE_CAFES = 'manage_cafes',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_SETTINGS = 'manage_settings',

  // Cafe owner permissions
  MANAGE_OWN_CAFE = 'manage_own_cafe',
  VIEW_OWN_ANALYTICS = 'view_own_analytics',
  MANAGE_MEDIA = 'manage_media',

  // User permissions
  UPLOAD_MEDIA = 'upload_media',
  LIKE_MEDIA = 'like_media',
  VIEW_MEDIA = 'view_media',
  SHARE_MEDIA = 'share_media',

  // Public permissions
  VIEW_PUBLIC_GALLERY = 'view_public_gallery',
}

/**
 * Role-Permission Mapping
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    // Full access
    Permission.MANAGE_ADMINS,
    Permission.MANAGE_CAFES,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_SETTINGS,
    Permission.MANAGE_OWN_CAFE,
    Permission.VIEW_OWN_ANALYTICS,
    Permission.MANAGE_MEDIA,
    Permission.UPLOAD_MEDIA,
    Permission.LIKE_MEDIA,
    Permission.VIEW_MEDIA,
    Permission.SHARE_MEDIA,
    Permission.VIEW_PUBLIC_GALLERY,
  ],

  [UserRole.CAFE_ADMIN]: [
    // Admin access for all cafes
    Permission.MANAGE_CAFES,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_MEDIA,
    Permission.MANAGE_OWN_CAFE,
    Permission.VIEW_OWN_ANALYTICS,
    Permission.UPLOAD_MEDIA,
    Permission.LIKE_MEDIA,
    Permission.VIEW_MEDIA,
    Permission.SHARE_MEDIA,
    Permission.VIEW_PUBLIC_GALLERY,
  ],

  [UserRole.CAFE_OWNER]: [
    // Access only to own cafe
    Permission.MANAGE_OWN_CAFE,
    Permission.VIEW_OWN_ANALYTICS,
    Permission.MANAGE_MEDIA,
    Permission.UPLOAD_MEDIA,
    Permission.LIKE_MEDIA,
    Permission.VIEW_MEDIA,
    Permission.SHARE_MEDIA,
    Permission.VIEW_PUBLIC_GALLERY,
  ],

  [UserRole.USER]: [
    // Regular user permissions
    Permission.UPLOAD_MEDIA,
    Permission.LIKE_MEDIA,
    Permission.VIEW_MEDIA,
    Permission.SHARE_MEDIA,
    Permission.VIEW_PUBLIC_GALLERY,
  ],

  [UserRole.ANONYMOUS]: [
    // Public access only
    Permission.VIEW_PUBLIC_GALLERY,
  ],
};

/**
 * User Context
 */
export interface UserContext {
  uid: string;
  email: string;
  role: UserRole;
  cafeSlug?: string; // For cafe-specific access
  customClaims?: Record<string, any>;
}

/**
 * Access Control Service
 */
export class AccessControl {
  /**
   * Check if user has permission
   */
  static hasPermission(user: UserContext, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.includes(permission);
  }

  /**
   * Check if user has any of the permissions
   */
  static hasAnyPermission(user: UserContext, permissions: Permission[]): boolean {
    return permissions.some((perm) => this.hasPermission(user, perm));
  }

  /**
   * Check if user has all permissions
   */
  static hasAllPermissions(user: UserContext, permissions: Permission[]): boolean {
    return permissions.every((perm) => this.hasPermission(user, perm));
  }

  /**
   * Check cafe ownership
   */
  static canAccessCafe(user: UserContext, cafeSlug: string): boolean {
    if (!user.cafeSlug) return false;

    // Super admin and cafe admin can access all cafes
    if ([UserRole.SUPER_ADMIN, UserRole.CAFE_ADMIN].includes(user.role)) {
      return true;
    }

    // Cafe owner can access only their cafe
    if (user.role === UserRole.CAFE_OWNER) {
      return user.cafeSlug === cafeSlug;
    }

    return false;
  }

  /**
   * Check if user can modify resource
   */
  static canModifyResource(
    user: UserContext,
    resourceOwnerUid: string,
    resourceCafeSlug: string
  ): boolean {
    // Admin can modify any resource
    if ([UserRole.SUPER_ADMIN, UserRole.CAFE_ADMIN].includes(user.role)) {
      return true;
    }

    // Cafe owner can modify resources in their cafe
    if (user.role === UserRole.CAFE_OWNER) {
      return user.cafeSlug === resourceCafeSlug;
    }

    // User can only modify their own resources
    return user.uid === resourceOwnerUid;
  }

  /**
   * Get user role
   */
  static getUserRole(claims: any): UserRole {
    if (claims?.admin === true) {
      return UserRole.SUPER_ADMIN;
    }

    if (claims?.cafeAdmin === true) {
      return UserRole.CAFE_ADMIN;
    }

    if (claims?.cafeOwner === true) {
      return UserRole.CAFE_OWNER;
    }

    return UserRole.USER;
  }

  /**
   * Enforce permission
   */
  static enforcePermission(user: UserContext, permission: Permission): void {
    if (!this.hasPermission(user, permission)) {
      throw new Error(`User does not have permission: ${permission}`);
    }
  }

  /**
   * Enforce cafe access
   */
  static enforceCafeAccess(user: UserContext, cafeSlug: string): void {
    if (!this.canAccessCafe(user, cafeSlug)) {
      throw new Error(`User does not have access to cafe: ${cafeSlug}`);
    }
  }

  /**
   * Get permissions for role
   */
  static getPermissionsForRole(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Check if role is admin
   */
  static isAdmin(user: UserContext): boolean {
    return [UserRole.SUPER_ADMIN, UserRole.CAFE_ADMIN].includes(user.role);
  }

  /**
   * Check if role is owner
   */
  static isOwner(user: UserContext): boolean {
    return user.role === UserRole.CAFE_OWNER;
  }
}

/**
 * Authorization Middleware (for Express/API routes)
 */
export function authorize(requiredPermissions: Permission | Permission[]) {
  return (req: any, res: any, next: any) => {
    const user = req.user as UserContext;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const perms = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    if (!AccessControl.hasAllPermissions(user, perms)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

/**
 * Audit Trail for access control
 */
export interface AccessAudit {
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  allowed: boolean;
  reason?: string;
}

export function logAccessDecision(
  user: UserContext,
  action: string,
  resource: string,
  allowed: boolean,
  reason?: string
): AccessAudit {
  const audit: AccessAudit = {
    timestamp: new Date(),
    userId: user.uid,
    action,
    resource,
    allowed,
    reason,
  };

  console.log('[ACCESS_AUDIT]', JSON.stringify(audit));

  // TODO: Store in audit collection
  return audit;
}

export default {
  UserRole,
  Permission,
  AccessControl,
  authorize,
  logAccessDecision,
  ROLE_PERMISSIONS,
};

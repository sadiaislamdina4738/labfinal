import type { UserRole } from '@/types';

/**
 * Check if a user has a specific role
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole | UserRole[]): boolean {
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole);
  }
  return userRole === requiredRole;
}

/**
 * Check if a user is an organizer
 */
export function isOrganizer(userRole: UserRole): boolean {
  return userRole === 'organizer' || userRole === 'admin';
}

/**
 * Check if a user is an admin
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === 'admin';
}

/**
 * Check if a user is an attendee
 */
export function isAttendee(userRole: UserRole): boolean {
  return userRole === 'attendee' || userRole === 'organizer' || userRole === 'admin';
}

/**
 * Get role hierarchy level (higher = more permissions)
 */
export function getRoleLevel(role: UserRole): number {
  const levels: Record<UserRole, number> = {
    attendee: 1,
    vendor: 2,
    organizer: 3,
    admin: 4,
  };
  return levels[role] || 0;
}

/**
 * Check if user has higher or equal role
 */
export function hasRoleOrHigher(userRole: UserRole, minRole: UserRole): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(minRole);
}

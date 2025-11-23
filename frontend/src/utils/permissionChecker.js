// Permission checking utility functions
import { userApi } from './users';

// Cache for user permissions to avoid repeated API calls
let userPermissionsCache = null;
let currentUserId = null;

/**
 * Get current user's permissions from cache or API
 * @param {string} userId - The user ID to get permissions for
 * @returns {Promise<Array>} Array of permission objects
 */
export const getCurrentUserPermissions = async (userId) => {
  // Return cached permissions if for the same user
  if (userPermissionsCache && currentUserId === userId) {
    return userPermissionsCache;
  }

  try {
    const permissions = await userApi.getUserPermissions(userId);
    userPermissionsCache = permissions;
    currentUserId = userId;
    return permissions;
  } catch (error) {
    console.error('Failed to fetch user permissions:', error);
    return [];
  }
};

/**
 * Check if user has a specific permission
 * @param {Array} userPermissions - Array of user's permissions
 * @param {string} permissionName - Name of the permission to check
 * @returns {boolean} True if user has the permission
 */
export const hasPermission = (userPermissions, permissionName) => {
  if (!Array.isArray(userPermissions) || !permissionName) {
    return false;
  }

  return userPermissions.some(permission =>
    permission.name === permissionName ||
    permission.name === `user_roles.${permissionName}` ||
    permission.name === `${permissionName}.access`
  );
};

/**
 * Check if user has any of the specified permissions
 * @param {Array} userPermissions - Array of user's permissions
 * @param {Array} permissionNames - Array of permission names to check
 * @returns {boolean} True if user has any of the permissions
 */
export const hasAnyPermission = (userPermissions, permissionNames) => {
  if (!Array.isArray(userPermissions) || !Array.isArray(permissionNames)) {
    return false;
  }

  return permissionNames.some(permissionName => hasPermission(userPermissions, permissionName));
};

/**
 * Check if user has all of the specified permissions
 * @param {Array} userPermissions - Array of user's permissions
 * @param {Array} permissionNames - Array of permission names to check
 * @returns {boolean} True if user has all of the permissions
 */
export const hasAllPermissions = (userPermissions, permissionNames) => {
  if (!Array.isArray(userPermissions) || !Array.isArray(permissionNames)) {
    return false;
  }

  return permissionNames.every(permissionName => hasPermission(userPermissions, permissionName));
};

/**
 * Filter sidebar sections based on user permissions
 * @param {Array} sidebarSections - Array of sidebar sections with items
 * @param {Array} userPermissions - Array of user's permissions
 * @returns {Array} Filtered sidebar sections
 */
export const filterSidebarByPermissions = (sidebarSections, userPermissions) => {
  if (!Array.isArray(sidebarSections) || !Array.isArray(userPermissions)) {
    return [];
  }

  return sidebarSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        // If item has requiredPermissions array, check if user has any of them
        if (item.requiredPermissions && Array.isArray(item.requiredPermissions)) {
          return hasAnyPermission(userPermissions, item.requiredPermissions);
        }

        // If item has requiredPermission string, check if user has it
        if (item.requiredPermission && typeof item.requiredPermission === 'string') {
          return hasPermission(userPermissions, item.requiredPermission);
        }

        // If no permission requirements specified, show the item (for backward compatibility)
        return true;
      })
    }))
    .filter(section => section.items.length > 0); // Remove empty sections
};

/**
 * Clear the permissions cache (useful when user logs out or switches)
 */
export const clearPermissionsCache = () => {
  userPermissionsCache = null;
  currentUserId = null;
};

/**
 * Get permission names as a simple array
 * @param {Array} userPermissions - Array of permission objects
 * @returns {Array} Array of permission names
 */
export const getPermissionNames = (userPermissions) => {
  if (!Array.isArray(userPermissions)) {
    return [];
  }

  return userPermissions.map(permission => permission.name);
};
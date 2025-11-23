// User API utility functions
const API_BASE_URL = 'http://localhost:8094';

export const userApi = {
  // Get all users
  getAllUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authorization header later
        // 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    const data = await response.json();
    return data.users || [];
  },

  // Get user by ID
  getUserById: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authorization header later
        // 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch user');
    }

    const data = await response.json();
    return data.user;
  },

  // Get roles assigned to a user
  getUserRoles: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/roles`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authorization header later
        // 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch user roles');
    }

    const data = await response.json();
    return data.roles || [];
  },

  // Get role assignment history for a user
  getUserRoleHistory: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/roles/history`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authorization header later
        // 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch user role history');
    }

    const data = await response.json();
    return data.history || [];
  },

  // Get permissions for a user
  getUserPermissions: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/permissions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authorization header later
        // 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch user permissions');
    }

    const data = await response.json();
    return data.permissions || [];
  },

  // Assign role to user
  assignRoleToUser: async (userId, roleId) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/roles/${roleId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authorization header later
        // 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to assign role to user');
    }

    return await response.json();
  },

  // Revoke role from user
  revokeRoleFromUser: async (userId, roleId) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/roles/${roleId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authorization header later
        // 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to revoke role from user');
    }

    return await response.json();
  },
};
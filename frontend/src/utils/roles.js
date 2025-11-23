// Role API utility functions
const API_BASE_URL = 'http://localhost:8094';

export const roleApi = {
  // Get all roles with their permissions
  getAllRoles: async () => {
    const response = await fetch(`${API_BASE_URL}/roles`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authorization header later
        // 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch roles');
    }

    const data = await response.json();
    return data.roles || [];
  },

  // Get role by ID with permissions
  getRoleById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/roles/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authorization header later
        // 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch role');
    }

    const data = await response.json();
    return data.role;
  },

  // Create a new role with permissions
  createRole: async (roleData) => {
    const response = await fetch(`${API_BASE_URL}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authorization header later
        // 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
      body: JSON.stringify(roleData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create role');
    }

    return await response.json();
  },

  // Update an existing role with permissions
  updateRole: async (id, roleData) => {
    const response = await fetch(`${API_BASE_URL}/roles/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authorization header later
        // 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
      body: JSON.stringify(roleData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update role');
    }

    return await response.json();
  },

  // Delete a role
  deleteRole: async (id) => {
    const response = await fetch(`${API_BASE_URL}/roles/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authorization header later
        // 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete role');
    }

    return await response.json();
  },

  // Assign permission to role
  assignPermissionToRole: async (roleId, permissionId) => {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}/permissions/${permissionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authorization header later
        // 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to assign permission');
    }

    return await response.json();
  },

  // Revoke permission from role
  revokePermissionFromRole: async (roleId, permissionId) => {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}/permissions/${permissionId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authorization header later
        // 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to revoke permission');
    }

    return await response.json();
  },

  // Get permissions for a specific role
  getRolePermissions: async (roleId) => {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}/permissions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authorization header later
        // 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch role permissions');
    }

    const data = await response.json();
    return data.permissions || [];
  },
};
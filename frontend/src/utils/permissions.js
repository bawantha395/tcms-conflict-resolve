// Permission API utility functions
const API_BASE_URL = 'http://localhost:8094';

export const permissionApi = {
  // Get all permissions
  getAllPermissions: async () => {
    const response = await fetch(`${API_BASE_URL}/permissions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authorization header later
        // 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch permissions');
    }

    const data = await response.json();
    console.log('Fetched permissions:', data);
    return data.permissions || [];
  },

  // Create a new permission
  createPermission: async (permissionData) => {
    const response = await fetch(`${API_BASE_URL}/permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authorization header later
        // 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
      body: JSON.stringify(permissionData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create permission');
    }

    return await response.json();
  },

  // Update an existing permission
  updatePermission: async (id, permissionData) => {
    const response = await fetch(`${API_BASE_URL}/permissions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authorization header later
        // 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
      body: JSON.stringify(permissionData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update permission');
    }

    return await response.json();
  },

  // Delete a permission
  deletePermission: async (id) => {
    const response = await fetch(`${API_BASE_URL}/permissions/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authorization header later
        // 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete permission');
    }

    return await response.json();
  },
};
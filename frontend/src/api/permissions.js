import { apiGet, apiPost } from './apiUtils';

// Permission Management API functions
export const createPermission = async (permissionData) => {
  try {
    // Use RBAC backend URL
    const response = await fetch('http://localhost:8094/permissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
      },
      body: JSON.stringify(permissionData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create permission');
    }

    return await response.json();
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to create permission');
  }
};

export const getAllPermissions = async () => {
  try {
    // Use RBAC backend URL
    const response = await fetch('http://localhost:8094/permissions', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch permissions');
    }

    return await response.json();
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch permissions');
  }
};

export const getPermissionById = async (id) => {
  try {
    // Use RBAC backend URL
    const response = await fetch(`http://localhost:8094/permissions/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch permission');
    }

    return await response.json();
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch permission');
  }
};
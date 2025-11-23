import { apiPost, apiGet, apiPut, handleApiError } from './apiUtils';
import { getStaffById } from './teachers';

export const login = async (credentials) => {
  try {
    // Check if the userid looks like a Teacher ID (starts with 'T' followed by numbers)
    const isTeacherId = /^T\d+$/.test(credentials.userid);
    
    if (isTeacherId) {
      // Use teacher login endpoint
      const { teacherLoginWithId } = await import('./teachers');
      return await teacherLoginWithId(credentials.userid, credentials.password);
    } else {
      // Use regular login endpoint (for students/admins/cashiers and staff)
      const data = await apiPost('/routes.php/login', credentials);

      // If this user is a teacher_staff, fetch their permissions from teacher backend and merge
      try {
        if (data && data.success && data.user && data.user.role === 'teacher_staff') {
          const staffId = data.user.userid;
          if (staffId) {
            const staffResp = await getStaffById(staffId);
            if (staffResp && staffResp.success && staffResp.data) {
              data.user.permissions = staffResp.data.permissions ?? null;
              data.user.teacherId = staffResp.data.teacherId ?? data.user.teacherId;
            }
          }
        }
      } catch (e) {
        console.warn('Could not merge staff permissions after login:', e.message || e);
      }

      return data;
    }
  } catch (error) {
    throw new Error(handleApiError(error, 'Login failed'));
  }
};

export const register = async (userData) => {
  try {
    return await apiPost('/routes.php/user', userData);
  } catch (error) {
    throw new Error(handleApiError(error, 'Registration failed'));
  }
};

export const validateToken = async (token) => {
  try {
    return await apiPost('/routes.php/validate_token', { token });
  } catch (error) {
    throw new Error(handleApiError(error, 'Token validation failed'));
  }
};

export const forgotPasswordRequestOtp = async (userid) => {
  try {
    return await apiPost('/routes.php/forgot_password_request_otp', { userid });
  } catch (error) {
    throw new Error(handleApiError(error, 'OTP request failed'));
  }
};

export const resetPassword = async (userid, otp, newPassword) => {
  try {
    return await apiPost('/routes.php/reset_password', { 
      userid, 
      otp, 
      new_password: newPassword 
    });
  } catch (error) {
    throw new Error(handleApiError(error, 'Password reset failed'));
  }
};

export const refreshToken = async (refreshToken) => {
  try {
    return await apiPost('/routes.php/refresh', { refreshToken });
  } catch (error) {
    throw new Error(handleApiError(error, 'Token refresh failed'));
  }
};

export const logout = async (refreshToken) => {
  try {
    return await apiPost('/routes.php/logout', { refreshToken });
  } catch (error) {
    throw new Error(handleApiError(error, 'Logout failed'));
  }
};

// Barcode API functions
export const saveBarcode = async (userid, barcodeData, studentName) => {
  try {
    return await apiPost('/routes.php/barcode/save', { 
      userid, 
      barcodeData, 
      studentName 
    });
  } catch (error) {
    throw new Error(handleApiError(error, 'Barcode save failed'));
  }
};

export const getBarcode = async (userid) => {
  try {
    return await apiGet(`/routes.php/barcode/${userid}`);
  } catch (error) {
    throw new Error(handleApiError(error, 'Barcode retrieval failed'));
  }
};

export const getAllBarcodes = async () => {
  try {
    return await apiGet('/routes.php/barcodes');
  } catch (error) {
    throw new Error(handleApiError(error, 'Barcodes retrieval failed'));
  }
};

export const getAllStudents = async () => {
  try {
    return await apiGet('/routes.php/students');
  } catch (error) {
    throw new Error(handleApiError(error, 'Students retrieval failed'));
  }
};

// Forgot Password API functions
export const sendOtp = async (mobile) => {
  try {
    return await apiPost('/routes.php/forgot-password/send-otp', { mobile });
  } catch (error) {
    throw new Error(handleApiError(error, 'OTP send failed'));
  }
};

export const forgotPasswordReset = async (mobile, otp, newPassword) => {
  try {
    return await apiPost('/routes.php/forgot-password/reset', { 
      mobile, 
      otp, 
      newPassword 
    });
  } catch (error) {
    throw new Error(handleApiError(error, 'Password reset failed'));
  }
}; 

// Update student profile
export const updateStudentProfile = async (userid, profileData) => {
  try {
    // Call student backend directly for profile updates
    const response = await fetch(`http://localhost:8086/routes.php/update-student/${userid}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update profile');
    }
    
    return data;
  } catch (error) {
    throw new Error(error.message || 'Failed to update profile');
  }
};

// Change password
export const changePassword = async (userid, currentPassword, newPassword) => {
  try {
    const response = await apiPost('/routes.php/change-password', {
      userid,
      currentPassword,
      newPassword
    });
    return response;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Forgot password - Send OTP 
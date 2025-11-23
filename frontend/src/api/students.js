import { apiGet, apiPost, apiPut, apiDelete, handleApiError } from './apiUtils';

// =====================================================
// STUDENT MANAGEMENT API FUNCTIONS
// =====================================================

// Get all students with optional filters
export const getAllStudents = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        queryParams.append(key, filters[key]);
      }
    });
    
    // Call student backend directly
    const studentBackendUrl = 'http://localhost:8086';
    const endpoint = `/routes.php/getAllStudents${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(`${studentBackendUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to fetch students'));
  }
};

// Get student by ID
export const getStudentById = async (studentId) => {
  try {
    const studentBackendUrl = 'http://localhost:8086';
    const response = await fetch(`${studentBackendUrl}/routes.php/get_with_id/${studentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform snake_case to camelCase for consistency
    const transformedData = {
      id: data.user_id,
      studentId: data.user_id,
      firstName: data.first_name,
      lastName: data.last_name,
      nic: data.nic,
      mobile: data.mobile_number,
      phone: data.mobile_number,
      dateOfBirth: data.date_of_birth,
      age: data.age,
      gender: data.gender,
      email: data.email,
      school: data.school,
      stream: data.stream,
      address: data.address,
      district: data.district,
      parentName: data.parent_name,
      parentMobile: data.parent_mobile_number,
      barcodeData: data.barcode_data,
      barcodeGeneratedAt: data.barcode_generated_at,
      createdAt: data.created_at,
      enrolledClasses: data.enrolledClasses || []
    };
    
    return transformedData;
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to fetch student details'));
  }
};

// Get student by mobile number
export const getStudentByMobile = async (mobile) => {
  try {
    const studentBackendUrl = 'http://localhost:8086';
    const response = await fetch(`${studentBackendUrl}/routes.php/students/mobile/${mobile}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to fetch student by mobile'));
  }
};

// Get students by stream
export const getStudentsByStream = async (stream) => {
  try {
    const studentBackendUrl = 'http://localhost:8086';
    const response = await fetch(`${studentBackendUrl}/routes.php/getAllStudents?stream=${stream}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to fetch students by stream'));
  }
};

// Get active students
export const getActiveStudents = async () => {
  try {
    const studentBackendUrl = 'http://localhost:8086';
    const response = await fetch(`${studentBackendUrl}/routes.php/getAllStudents?status=active`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to fetch active students'));
  }
};

// Create new student
export const createStudent = async (studentData) => {
  try {
    return await apiPost('/routes.php/students', studentData);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to create student'));
  }
};

// Update student
export const updateStudent = async (studentId, studentData) => {
  try {
    const studentBackendUrl = 'http://localhost:8086';
    const response = await fetch(`${studentBackendUrl}/routes.php/update-student/${studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to update student'));
  }
};

// Delete student (uses student backend delete endpoint)
export const deleteStudent = async (studentId) => {
  try {
    const studentBackendUrl = 'http://localhost:8086';
    const response = await fetch(`${studentBackendUrl}/routes.php/delete-student/${studentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to delete student'));
  }
};

// Update student profile
export const updateStudentProfile = async (studentId, profileData) => {
  try {
    return await apiPut(`/routes.php/students/${studentId}/profile`, profileData);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to update student profile'));
  }
};

// =====================================================
// STUDENT ENROLLMENT API FUNCTIONS
// =====================================================

// Get student enrollments
export const getStudentEnrollments = async (studentId) => {
  try {
    return await apiGet(`/routes.php/students/${studentId}/enrollments`);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to fetch student enrollments'));
  }
};

// Get active enrollments for student
export const getStudentActiveEnrollments = async (studentId) => {
  try {
    return await apiGet(`/routes.php/students/${studentId}/enrollments?status=active`);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to fetch active enrollments'));
  }
};

// Enroll student in class
export const enrollStudentInClass = async (studentId, classId, enrollmentData = {}) => {
  try {
    return await apiPost('/routes.php/enrollments', {
      studentId,
      classId,
      ...enrollmentData
    });
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to enroll student'));
  }
};

// Drop enrollment
export const dropEnrollment = async (enrollmentId) => {
  try {
    return await apiPut(`/routes.php/enrollments/${enrollmentId}/drop`);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to drop enrollment'));
  }
};

// =====================================================
// STUDENT ATTENDANCE API FUNCTIONS
// =====================================================

// Get student attendance
export const getStudentAttendance = async (studentId, filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        queryParams.append(key, filters[key]);
      }
    });
    
    const endpoint = `/routes.php/students/${studentId}/attendance${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await apiGet(endpoint);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to fetch student attendance'));
  }
};

// Get attendance by date range
export const getStudentAttendanceByDateRange = async (studentId, startDate, endDate, classId = null) => {
  try {
    const params = new URLSearchParams({ startDate, endDate });
    if (classId) params.append('classId', classId);
    
    return await apiGet(`/routes.php/students/${studentId}/attendance?${params.toString()}`);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to fetch attendance by date range'));
  }
};

// Mark student attendance
export const markStudentAttendance = async (attendanceData) => {
  try {
    return await apiPost('/routes.php/attendance', attendanceData);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to mark attendance'));
  }
};

// Update student attendance
export const updateStudentAttendance = async (attendanceId, attendanceData) => {
  try {
    return await apiPut(`/routes.php/attendance/${attendanceId}`, attendanceData);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to update attendance'));
  }
};

// =====================================================
// STUDENT PAYMENT API FUNCTIONS
// =====================================================

// Get student payments
export const getStudentPayments = async (studentId) => {
  try {
    return await apiGet(`/routes.php/students/${studentId}/payments`);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to fetch student payments'));
  }
};

// Get payment history for student
export const getStudentPaymentHistory = async (studentId, filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        queryParams.append(key, filters[key]);
      }
    });
    
    const endpoint = `/routes.php/students/${studentId}/payment-history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await apiGet(endpoint);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to fetch payment history'));
  }
};

// Record student payment
export const recordStudentPayment = async (paymentData) => {
  try {
    return await apiPost('/routes.php/payments', paymentData);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to record payment'));
  }
};

// Get outstanding payments for student
export const getStudentOutstandingPayments = async (studentId) => {
  try {
    return await apiGet(`/routes.php/students/${studentId}/outstanding-payments`);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to fetch outstanding payments'));
  }
};

// =====================================================
// STUDENT CARD MANAGEMENT API FUNCTIONS
// =====================================================

// Get student cards
export const getStudentCards = async (studentId) => {
  try {
    return await apiGet(`/routes.php/students/${studentId}/cards`);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to fetch student cards'));
  }
};

// Create student card
export const createStudentCard = async (studentId, cardData) => {
  try {
    return await apiPost(`/routes.php/students/${studentId}/cards`, cardData);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to create student card'));
  }
};

// Update student card
export const updateStudentCard = async (cardId, cardData) => {
  try {
    return await apiPut(`/routes.php/student-cards/${cardId}`, cardData);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to update student card'));
  }
};

// Delete student card
export const deleteStudentCard = async (cardId) => {
  try {
    return await apiDelete(`/routes.php/student-cards/${cardId}`);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to delete student card'));
  }
};

// Request forget card
export const requestForgetCard = async (studentId, classId, requestData) => {
  try {
    return await apiPost(`/routes.php/students/${studentId}/forget-card-request`, {
      classId,
      ...requestData
    });
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to request forget card'));
  }
};

// =====================================================
// STUDENT NOTIFICATIONS API FUNCTIONS
// =====================================================

// Get student notifications
export const getStudentNotifications = async (studentId) => {
  try {
    return await apiGet(`/routes.php/students/${studentId}/notifications`);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to fetch notifications'));
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    return await apiPut(`/routes.php/notifications/${notificationId}/read`);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to mark notification as read'));
  }
};

// Send notification to student
export const sendNotificationToStudent = async (studentId, notificationData) => {
  try {
    return await apiPost(`/routes.php/students/${studentId}/notifications`, notificationData);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to send notification'));
  }
};

// =====================================================
// STUDENT REPORTS API FUNCTIONS
// =====================================================

// Get student performance report
export const getStudentPerformanceReport = async (studentId, startDate, endDate) => {
  try {
    return await apiGet(`/routes.php/students/${studentId}/performance-report?startDate=${startDate}&endDate=${endDate}`);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to fetch performance report'));
  }
};

// Get student attendance report
export const getStudentAttendanceReport = async (studentId, startDate, endDate) => {
  try {
    return await apiGet(`/routes.php/students/${studentId}/attendance-report?startDate=${startDate}&endDate=${endDate}`);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to fetch attendance report'));
  }
};

// Get student payment report
export const getStudentPaymentReport = async (studentId, startDate, endDate) => {
  try {
    return await apiGet(`/routes.php/students/${studentId}/payment-report?startDate=${startDate}&endDate=${endDate}`);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to fetch payment report'));
  }
};

// Export student data
export const exportStudentData = async (studentId, format = 'pdf') => {
  try {
    return await apiGet(`/routes.php/students/${studentId}/export?format=${format}`);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to export student data'));
  }
};

// =====================================================
// STUDENT UTILITY API FUNCTIONS
// =====================================================

// Search students
export const searchStudents = async (searchTerm, filters = {}) => {
  try {
    const queryParams = new URLSearchParams({ search: searchTerm, ...filters });
    return await apiGet(`/routes.php/students/search?${queryParams.toString()}`);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to search students'));
  }
};

// Get student statistics
export const getStudentStatistics = async (studentId) => {
  try {
    return await apiGet(`/routes.php/students/${studentId}/statistics`);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to fetch student statistics'));
  }
};

// Get next student ID
export const getNextStudentId = async () => {
  try {
    return await apiGet('/routes.php/students/next-id');
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to get next student ID'));
  }
};

// Bulk operations
export const bulkUpdateStudents = async (studentIds, updateData) => {
  try {
    return await apiPut('/routes.php/students/bulk-update', {
      studentIds,
      updateData
    });
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to bulk update students'));
  }
};

// Import students
export const importStudents = async (importData) => {
  try {
    return await apiPost('/routes.php/students/import', importData);
  } catch (error) {
    throw new Error(handleApiError(error, 'Failed to import students'));
  }
}; 
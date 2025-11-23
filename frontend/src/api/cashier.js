import axios from './axiosConfig';
import { apiGet, apiPost, apiPut } from './apiUtils';

// Base URL for cashier session API
// Port 8083 (when using main docker-compose.yml)
// Port 8093 (when using backend/cashier/docker-compose.yml standalone)
const CASHIER_SESSION_API_BASE = 'http://localhost:8083/api/session';

// Cashier management functions
export const getNextCashierId = async () => {
  return await apiGet('/routes.php/next-cashier-id');
};

export const createCashier = async (cashierData) => {
  // Use the user creation endpoint with role: "cashier" for automatic RBAC role assignment
  const userData = {
    role: 'cashier',
    password: cashierData.password,
    firstName: cashierData.name,
    lastName: '', // Empty lastName for cashiers
    email: cashierData.email,
    phone: cashierData.phone
  };
  return await apiPost('/routes.php/user', userData);
};

export const getAllCashiers = async () => {
  return await apiGet('/routes.php/cashiers');
};

export const getCashierById = async (cashierId) => {
  return await apiGet(`/routes.php/cashier/${cashierId}`);
};

export const updateCashier = async (cashierId, cashierData) => {
  return await apiPut(`/routes.php/cashier/${cashierId}`, cashierData);
};

export const deleteCashier = async (cashierId) => {
  return await apiPost(`/routes.php/cashier/${cashierId}/delete`);
};

// Cashier API endpoints
const CASHIER_API = {
  // Payment operations
  PROCESS_PAYMENT: '/cashier/payments/process',
  GET_PAYMENT_HISTORY: '/cashier/payments/history',
  GET_PAYMENT_DETAILS: '/cashier/payments/:id',
  UPDATE_PAYMENT_STATUS: '/cashier/payments/:id/status',
  
  // Student operations
  GET_STUDENTS: '/cashier/students',
  GET_STUDENT_DETAILS: '/cashier/students/:id',
  SEARCH_STUDENTS: '/cashier/students/search',
  GET_STUDENT_PAYMENTS: '/cashier/students/:id/payments',
  
  // Financial reports
  GET_DAILY_REPORT: '/cashier/reports/daily',
  GET_WEEKLY_REPORT: '/cashier/reports/weekly',
  GET_MONTHLY_REPORT: '/cashier/reports/monthly',
  GET_CUSTOM_REPORT: '/cashier/reports/custom',
  EXPORT_REPORT: '/cashier/reports/export',
  
  // Receipt operations
  GENERATE_RECEIPT: '/cashier/receipts/generate',
  DOWNLOAD_RECEIPT: '/cashier/receipts/:id/download',
  PRINT_RECEIPT: '/cashier/receipts/:id/print',
};

// Payment API functions
export const paymentAPI = {
  // Process a new payment
  processPayment: async (paymentData) => {
    try {
      const response = await axios.post(CASHIER_API.PROCESS_PAYMENT, paymentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get payment history with filters
  getPaymentHistory: async (filters = {}) => {
    try {
      const response = await axios.get(CASHIER_API.GET_PAYMENT_HISTORY, { params: filters });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get specific payment details
  getPaymentDetails: async (paymentId) => {
    try {
      const response = await axios.get(CASHIER_API.GET_PAYMENT_DETAILS.replace(':id', paymentId));
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update payment status
  updatePaymentStatus: async (paymentId, status) => {
    try {
      const response = await axios.patch(
        CASHIER_API.UPDATE_PAYMENT_STATUS.replace(':id', paymentId),
        { status }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Student API functions
export const studentAPI = {
  // Get all students with optional filters
  getStudents: async (filters = {}) => {
    try {
      const response = await axios.get(CASHIER_API.GET_STUDENTS, { params: filters });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get specific student details
  getStudentDetails: async (studentId) => {
    try {
      const response = await axios.get(CASHIER_API.GET_STUDENT_DETAILS.replace(':id', studentId));
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Search students
  searchStudents: async (searchQuery) => {
    try {
      const response = await axios.get(CASHIER_API.SEARCH_STUDENTS, {
        params: { q: searchQuery }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get student payment history
  getStudentPayments: async (studentId, filters = {}) => {
    try {
      const response = await axios.get(
        CASHIER_API.GET_STUDENT_PAYMENTS.replace(':id', studentId),
        { params: filters }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Financial Reports API functions
export const reportsAPI = {
  // Get daily report
  getDailyReport: async (date, filters = {}) => {
    try {
      const response = await axios.get(CASHIER_API.GET_DAILY_REPORT, {
        params: { date, ...filters }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get weekly report
  getWeeklyReport: async (startDate, endDate, filters = {}) => {
    try {
      const response = await axios.get(CASHIER_API.GET_WEEKLY_REPORT, {
        params: { startDate, endDate, ...filters }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get monthly report
  getMonthlyReport: async (year, month, filters = {}) => {
    try {
      const response = await axios.get(CASHIER_API.GET_MONTHLY_REPORT, {
        params: { year, month, ...filters }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get custom date range report
  getCustomReport: async (startDate, endDate, filters = {}) => {
    try {
      const response = await axios.get(CASHIER_API.GET_CUSTOM_REPORT, {
        params: { startDate, endDate, ...filters }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Export report
  exportReport: async (reportType, format, filters = {}) => {
    try {
      const response = await axios.post(CASHIER_API.EXPORT_REPORT, {
        reportType,
        format,
        filters
      }, {
        responseType: 'blob' // For file downloads
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Receipt API functions
export const receiptAPI = {
  // Generate receipt
  generateReceipt: async (paymentId) => {
    try {
      const response = await axios.post(CASHIER_API.GENERATE_RECEIPT, { paymentId });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Download receipt
  downloadReceipt: async (receiptId, format = 'pdf') => {
    try {
      const response = await axios.get(
        CASHIER_API.DOWNLOAD_RECEIPT.replace(':id', receiptId),
        {
          params: { format },
          responseType: 'blob'
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Print receipt
  printReceipt: async (receiptId) => {
    try {
      const response = await axios.get(CASHIER_API.PRINT_RECEIPT.replace(':id', receiptId));
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Dashboard statistics API functions
export const dashboardAPI = {
  // Get cashier dashboard statistics
  getDashboardStats: async () => {
    try {
      const response = await axios.get('/cashier/dashboard/stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get recent transactions
  getRecentTransactions: async (limit = 10) => {
    try {
      const response = await axios.get('/cashier/dashboard/recent-transactions', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get pending payments
  getPendingPayments: async () => {
    try {
      const response = await axios.get('/cashier/dashboard/pending-payments');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Cashier Session Management API functions (NEW - for persistent session data)
export const sessionAPI = {
  // Start or resume a cashier session
  startSession: async (cashierId, openingBalance = 0) => {
    try {
      const response = await axios.post(`${CASHIER_SESSION_API_BASE}/start`, {
        cashier_id: cashierId,
        opening_balance: openingBalance,
      });
      return response.data;
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    }
  },

  // Get current active session
  getCurrentSession: async (cashierId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(`${CASHIER_SESSION_API_BASE}/current`, {
        params: { 
          cashier_id: cashierId,
          date: today 
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting current session:', error);
      throw error;
    }
  },

  // Update session KPIs (call after payments, late notes, etc.)
  updateKPIs: async (sessionId, kpiData) => {
    try {
      const response = await axios.post(`${CASHIER_SESSION_API_BASE}/update-kpis`, {
        session_id: sessionId,
        total_collections: kpiData.totalCollections,
        receipts_generated: kpiData.receiptsGenerated,
        pending_payments: kpiData.pendingPayments,
        cash_drawer_balance: kpiData.cashDrawerBalance,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating KPIs:', error);
      throw error;
    }
  },

  // Log an activity (for audit trail)
  logActivity: async (sessionId, activityType, description, metadata = {}) => {
    try {
      const response = await axios.post(`${CASHIER_SESSION_API_BASE}/activity`, {
        session_id: sessionId,
        activity_type: activityType,
        description: description,
        metadata: JSON.stringify(metadata),
      });
      return response.data;
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  },

  // Close day and generate report
  closeDay: async (sessionId, closingBalance, notes = '') => {
    try {
      const response = await axios.post(`${CASHIER_SESSION_API_BASE}/close-day`, {
        session_id: sessionId,
        closing_balance: closingBalance,
        notes: notes,
      });
      return response.data;
    } catch (error) {
      console.error('Error closing day:', error);
      throw error;
    }
  },

  // Lock session (when navigating away temporarily)
  lockSession: async (sessionId) => {
    try {
      const response = await axios.post(`${CASHIER_SESSION_API_BASE}/lock`, {
        session_id: sessionId,
      });
      return response.data;
    } catch (error) {
      console.error('Error locking session:', error);
      throw error;
    }
  },

  // Unlock session (when returning)
  unlockSession: async (sessionId) => {
    try {
      const response = await axios.post(`${CASHIER_SESSION_API_BASE}/unlock`, {
        session_id: sessionId,
      });
      return response.data;
    } catch (error) {
      console.error('Error unlocking session:', error);
      throw error;
    }
  },
};

// Utility functions for cashier operations
export const cashierUtils = {
  // Format currency
  formatCurrency: (amount, currency = 'LKR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  },

  // Format date
  formatDate: (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },

  // Format date and time
  formatDateTime: (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  // Generate receipt ID
  generateReceiptId: () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `RCP${timestamp}${random}`;
  },

  // Validate payment data
  validatePaymentData: (paymentData) => {
    const errors = [];
    
    if (!paymentData.studentId) errors.push('Student ID is required');
    if (!paymentData.amount || paymentData.amount <= 0) errors.push('Valid amount is required');
    if (!paymentData.paymentType) errors.push('Payment type is required');
    if (!paymentData.paymentMethod) errors.push('Payment method is required');
    if (!paymentData.date) errors.push('Payment date is required');
    
    return errors;
  },

  // Get payment status color
  getStatusColor: (status) => {
    const statusColors = {
      'completed': 'text-green-600 bg-green-100',
      'pending': 'text-yellow-600 bg-yellow-100',
      'failed': 'text-red-600 bg-red-100',
      'cancelled': 'text-gray-600 bg-gray-100',
    };
    return statusColors[status] || 'text-gray-600 bg-gray-100';
  },

  // Get payment method label
  getPaymentMethodLabel: (method) => {
    const methodLabels = {
      'cash': 'Cash',
      'card': 'Card',
      'bank_transfer': 'Bank Transfer',
      'check': 'Check',
      'online': 'Online Payment',
    };
    return methodLabels[method] || method;
  },

  // Get payment type label
  getPaymentTypeLabel: (type) => {
    const typeLabels = {
      'class_payment': 'Class Payment',
      'study_pack': 'Study Pack',
      'registration_fee': 'Registration Fee',
      'late_fee': 'Late Fee',
      'other': 'Other',
    };
    return typeLabels[type] || type;
  },
};

export default {
  paymentAPI,
  studentAPI,
  reportsAPI,
  receiptAPI,
  dashboardAPI,
  sessionAPI,
  cashierUtils,
}; 
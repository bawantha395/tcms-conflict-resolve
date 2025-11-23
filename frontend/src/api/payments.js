import { handleApiError } from './apiUtils';
import axios from 'axios';

const paymentApi = axios.create({
  baseURL: process.env.REACT_APP_PAYMENT_API_BASE_URL || 'http://localhost:8090',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
});

// Payment API functions
export const createPayment = async (paymentData) => {
  try {
    console.log('🔧 Creating payment with data:', paymentData);
    const response = await paymentApi.post('/routes.php/create_payment', paymentData);
    console.log('🔧 Raw response:', response);
    console.log('🔧 Response data type:', typeof response.data);
    console.log('🔧 Response data:', response.data);
    
    // Handle case where response might include PHP code before JSON
    let responseData = response.data;
    
    // If response is a string and contains JSON, try to extract it
    if (typeof responseData === 'string') {
      console.log('🔧 Response is string, extracting JSON...');
      
      // Try to find the complete JSON response (should start with {"success":)
      const successIndex = responseData.indexOf('{"success":');
      if (successIndex !== -1) {
        // Find the complete JSON object
        let braceCount = 0;
        let startIndex = -1;
        let endIndex = -1;
        
        for (let i = successIndex; i < responseData.length; i++) {
          if (responseData[i] === '{') {
            if (startIndex === -1) startIndex = i;
            braceCount++;
          } else if (responseData[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              endIndex = i;
              break;
            }
          }
        }
        
        if (startIndex !== -1 && endIndex !== -1) {
          const jsonString = responseData.substring(startIndex, endIndex + 1);
          console.log('🔧 Extracted complete JSON string:', jsonString);
          try {
            responseData = JSON.parse(jsonString);
            console.log('🔧 Parsed complete JSON:', responseData);
          } catch (parseError) {
            console.error('Failed to parse complete JSON from response:', parseError);
            throw new Error('Invalid response format from server');
          }
        }
      } else {
        // Fallback: try to find any JSON object
        const lastBraceIndex = responseData.lastIndexOf('}');
        const firstBraceIndex = responseData.lastIndexOf('{', lastBraceIndex);
        
        if (firstBraceIndex !== -1 && lastBraceIndex !== -1) {
          const jsonString = responseData.substring(firstBraceIndex, lastBraceIndex + 1);
          console.log('🔧 Extracted fallback JSON string:', jsonString);
          try {
            responseData = JSON.parse(jsonString);
            console.log('🔧 Parsed fallback JSON:', responseData);
          } catch (parseError) {
            console.error('Failed to parse fallback JSON from response:', parseError);
            throw new Error('Invalid response format from server');
          }
        }
      }
    }
    
    console.log('🔧 Final response data:', responseData);
    return responseData;
  } catch (error) {
    console.error('🔧 Payment creation error:', error);
    throw handleApiError(error);
  }
};

export const processPayment = async (transactionId, paymentData = {}) => {
  try {
    const response = await paymentApi.post('/routes.php/process_payment', {
      transactionId,
      ...paymentData
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getPaymentByTransactionId = async (transactionId) => {
  try {
    const response = await paymentApi.get(`/routes.php/get_payment_by_transaction?transactionId=${transactionId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getStudentPayments = async (studentId) => {
  try {
    // Add cache-busting parameter to prevent browser caching
    const timestamp = Date.now();
    const response = await paymentApi.get(`/routes.php/get_student_payments?studentId=${studentId}&_t=${timestamp}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const generateInvoice = async (transactionId) => {
  try {
    const response = await paymentApi.get(`/routes.php/generate_invoice?transactionId=${transactionId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getPaymentStats = async (studentId) => {
  try {
    const response = await paymentApi.get(`/routes.php/get_payment_stats?studentId=${studentId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getCashierStats = async (cashierId, period = 'today', sessionId = null) => {
  try {
    // Add cache-busting parameter to prevent browser caching
    const timestamp = Date.now();
    let url = `/routes.php/get_cashier_stats?cashierId=${cashierId}&period=${period}&_t=${timestamp}`;
    
    // CRITICAL: If sessionId is provided, include it to filter stats by active session ONLY
    if (sessionId) {
      url += `&sessionId=${sessionId}`;
    }
    
    const response = await paymentApi.get(url);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Payment utility functions
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2
  }).format(amount);
};

export const generateTransactionId = () => {
  return 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9);
};

export const validatePaymentData = (paymentData) => {
  const errors = [];
  
  if (!paymentData.studentId) {
    errors.push('Student ID is required');
  }
  
  if (!paymentData.classId) {
    errors.push('Class ID is required');
  }
  
  if (!paymentData.amount || paymentData.amount <= 0) {
    errors.push('Valid amount is required');
  }
  
  if (!paymentData.paymentMethod) {
    errors.push('Payment method is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}; 
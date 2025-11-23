import axios from 'axios';

// Create a specific API instance for payment backend (PayHere)
const paymentApi = axios.create({
  baseURL: 'http://localhost:8090/routes.php',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create PayHere payment
export const createPayHerePayment = async (paymentData) => {
  try {
    const response = await paymentApi.post('/create_payhere_payment', paymentData);
    return response.data;
  } catch (error) {
    console.error('PayHere payment creation error:', error);
    throw new Error(error.response?.data?.message || 'Failed to create PayHere payment');
  }
};

// Get payment status
export const getPayHerePaymentStatus = async (orderId) => {
  try {
    const response = await paymentApi.get(`/get_payment_status?order_id=${orderId}`);
    return response.data;
  } catch (error) {
    console.error('PayHere payment status error:', error);
    throw new Error(error.response?.data?.message || 'Failed to get payment status');
  }
};

// Handle PayHere notification (for backend)
export const handlePayHereNotification = async (notificationData) => {
  try {
    const response = await paymentApi.post('/payhere_notify', notificationData);
    return response.data;
  } catch (error) {
    console.error('PayHere notification error:', error);
    throw new Error(error.response?.data?.message || 'Failed to handle notification');
  }
}; 
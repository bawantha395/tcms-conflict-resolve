import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const DevPaymentHelper = () => {
  const [searchParams] = useSearchParams();
  const [isCompleting, setIsCompleting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const orderId = searchParams.get('order_id');
    
    if (orderId && process.env.NODE_ENV === 'development') {
      // Auto-complete payment in development mode
      autoCompletePayment(orderId);
    }
  }, [searchParams]);

  const autoCompletePayment = async (orderId) => {
    try {
      setIsCompleting(true);
      setMessage('Auto-completing payment for development...');
      
      const response = await axios.get(`http://localhost:8090/routes.php/dev/auto_complete_payment?order_id=${orderId}`);
      
      if (response.data.success) {
        setMessage('Payment auto-completed! Refreshing page...');
        // Refresh the page after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage('Failed to auto-complete payment: ' + response.data.message);
      }
    } catch (error) {
      setMessage('Error auto-completing payment: ' + error.message);
    } finally {
      setIsCompleting(false);
    }
  };

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded z-50">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">
            {isCompleting ? '🔄 Development Mode' : '⚡ Development Mode'}
          </p>
          <p className="text-sm">{message || 'Auto-completing payments for sandbox testing'}</p>
        </div>
      </div>
    </div>
  );
};

export default DevPaymentHelper; 
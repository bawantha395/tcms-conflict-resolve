import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import studentSidebarSections from './StudentDashboardSidebar';
import Receipt from '../../../components/Receipt';
import { FaCheckCircle, FaPrint, FaDownload, FaHome, FaList, FaMapMarkerAlt } from 'react-icons/fa';
import { getUserData } from '../../../api/apiUtils';

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showReceipt, setShowReceipt] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();

  const getPayHerePaymentStatus = async (orderId) => {
    try {
      const response = await fetch(`http://localhost:8090/routes.php/get_payment_status?order_id=${orderId}`);
      return await response.json();
    } catch (e) {
      console.error('Error fetching PayHere payment status:', e);
      return { success: false, message: 'Failed to fetch payment status' };
    }
  };

  const getClassDetails = async (classId) => {
    try {
      const response = await fetch(`http://localhost:8087/routes.php/get_class_by_id?id=${classId}`);
      const result = await response.json();
      return result.success ? result.data : null;
    } catch (e) {
      console.error('Error fetching class details:', e);
      return null;
    }
  };



  useEffect(() => {
    const initializePaymentData = async () => {
      try {
        const orderId = searchParams.get('order_id');
        const paymentId = searchParams.get('payment_id');
        const statusCode = searchParams.get('status_code');

        console.log('🔍 PaymentSuccess - URL Parameters:', { orderId, paymentId, statusCode });

        // Always attempt to verify with backend if orderId is present
        if (orderId) {
          console.log('🎉 PayHere payment successful! Verifying with backend...');
          
          try {
            const paymentStatusResponse = await getPayHerePaymentStatus(orderId);
            console.log('📊 Payment status from backend:', paymentStatusResponse);

            if (paymentStatusResponse.success && paymentStatusResponse.data) {
              const backendPaymentData = paymentStatusResponse.data;
              
              // Check if payment is pending and we're in development mode
              if (backendPaymentData.status === 'pending' && process.env.NODE_ENV === 'development') {
                console.log('🔄 Development mode: Auto-completing pending payment...');
                
                // Auto-complete the payment
                try {
                  const autoCompleteResponse = await fetch(`http://localhost:8090/routes.php/dev/auto_complete_payment`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ order_id: orderId })
                  });
                  const autoCompleteData = await autoCompleteResponse.json();
                  
                  if (autoCompleteData.success) {
                    console.log('✅ Payment auto-completed for development');
                    // Refresh the payment status
                    const refreshedResponse = await getPayHerePaymentStatus(orderId);
                    if (refreshedResponse.success && refreshedResponse.data) {
                      backendPaymentData.status = refreshedResponse.data.status;
                    }
                  }
                } catch (autoCompleteError) {
                  console.error('❌ Error auto-completing payment:', autoCompleteError);
                }
              }
              
              if (backendPaymentData.status === 'paid' || backendPaymentData.status === 'completed') {
                const userData = getUserData();
                
                // Fetch actual student details from student backend
                let studentDetails = null;
                try {
                  console.log('🔍 Fetching student details for user ID:', userData.userid);
                  const studentResponse = await fetch(`http://localhost:8086/routes.php/get_with_id/${userData.userid}`);
                  const studentResult = await studentResponse.json();
                  console.log('🔍 Student API response:', studentResult);
                  if (studentResult && studentResult.user_id) {
                    studentDetails = studentResult;
                    console.log('✅ Student details fetched successfully:', studentDetails);
                  } else {
                    console.warn('⚠️ Student details not found or invalid response');
                  }
                } catch (e) {
                  console.error('❌ Error fetching student details:', e);
                }
                
                // Fetch actual class details
                let classDetails = null;
                if (backendPaymentData.class_id) {
                  classDetails = await getClassDetails(backendPaymentData.class_id);
                }
                
                // Parse discount information from notes
                let promoDiscount = 0;
                let theoryDiscount = 0;
                let speedPostFee = 0;
                let isSpeedPost = false;
                
                if (backendPaymentData.notes) {
                  const notes = backendPaymentData.notes;
                  const promoMatch = notes.match(/Promo: (\d+)/);
                  const theoryMatch = notes.match(/Theory Discount: (\d+)/);
                  const speedPostMatch = notes.match(/Speed Post: (\d+)/);
                  
                  promoDiscount = promoMatch ? parseFloat(promoMatch[1]) : 0;
                  theoryDiscount = theoryMatch ? parseFloat(theoryMatch[1]) : 0;
                  speedPostFee = speedPostMatch ? parseFloat(speedPostMatch[1]) : 0;
                  isSpeedPost = speedPostFee > 0;
                }
                
                const basePrice = classDetails?.fee || parseFloat(backendPaymentData.amount) || 0;
                const totalDiscount = promoDiscount + theoryDiscount;
                
                                 const payHerePaymentData = {
                   transactionId: orderId,
                   paymentId: paymentId,
                   status: backendPaymentData.status,
                   paymentMethod: backendPaymentData.payment_method || 'PayHere',
                   date: new Date(backendPaymentData.created_at).toLocaleDateString(),
                   className: backendPaymentData.class_name || 'Class Payment',
                   subject: classDetails?.subject || 'Course',
                   teacher: classDetails?.teacher || 'Instructor',
                   stream: classDetails?.stream || 'General',
                   courseType: classDetails?.courseType || 'Regular',
                   amount: parseFloat(backendPaymentData.amount) || 0,
                   basePrice: basePrice,
                   discount: totalDiscount,
                   speedPostFee: speedPostFee,
                   isSpeedPost: isSpeedPost,
                   currency: backendPaymentData.currency || 'LKR',
                   // Use actual student details from student backend
                   firstName: studentDetails?.first_name || userData?.firstName || backendPaymentData.first_name,
                   lastName: studentDetails?.last_name || userData?.lastName || backendPaymentData.last_name,
                   email: studentDetails?.email || userData?.email || backendPaymentData.email,
                                        phone: studentDetails?.mobile_number || userData?.mobile || backendPaymentData.phone,
                   address: studentDetails?.address || userData?.address || backendPaymentData.address,
                   city: studentDetails?.district || userData?.district || backendPaymentData.city,
                   country: backendPaymentData.country || 'Sri Lanka',
                 };

                                 setPaymentData(payHerePaymentData);
                 console.log('✅ Payment data set successfully:', payHerePaymentData);
                 console.log('🔍 Student Name:', `${payHerePaymentData.firstName} ${payHerePaymentData.lastName}`);
                 console.log('🔍 Mobile:', payHerePaymentData.phone);
                 console.log('🔍 Email:', payHerePaymentData.email);
                 console.log('🔍 Address:', payHerePaymentData.address);
                 console.log('🔍 City:', payHerePaymentData.city);
                 console.log('🔍 Student Details Source:', {
                   studentDetails: studentDetails ? 'API' : 'None',
                   userData: userData ? 'Local' : 'None',
                   backendPaymentData: backendPaymentData ? 'Backend' : 'None'
                 });
                 
                 // GUARANTEED ENROLLMENT: Ensure enrollment is created automatically
                 try {
                   console.log('🔄 Ensuring enrollment is created for transaction:', orderId);
                   
                   const enrollmentResponse = await fetch(`http://localhost:8090/routes.php/process_payment`, {
                     method: 'POST',
                     headers: {
                       'Content-Type': 'application/json',
                     },
                     body: JSON.stringify({
                       transactionId: orderId,
                       status: 'paid',
                       paymentMethod: backendPaymentData.payment_method || 'online',
                       referenceNumber: orderId,
                       notes: 'Auto-enrollment from payment success page'
                     })
                   });
                   
                   const enrollmentResult = await enrollmentResponse.json();
                   console.log('✅ Auto-enrollment result:', enrollmentResult);
                   
                   if (enrollmentResult.success) {
                     console.log('✅ Enrollment guaranteed! Class will appear in My Classes.');
                   } else {
                     console.warn('⚠️ Auto-enrollment failed, but payment is confirmed:', enrollmentResult.message);
                   }
                 } catch (enrollmentError) {
                   console.error('❌ Error in auto-enrollment:', enrollmentError);
                   // Don't fail the page, just log the error
                 }
                 
                 window.dispatchEvent(new CustomEvent('refreshMyClasses'));
                
                             } else {
                 console.log('⚠️ Payment not yet completed:', backendPaymentData.status);
                 setError('Payment is being processed. Please wait a moment and refresh the page.');
                 
                 // Auto-refresh after 3 seconds for pending payments
                 setTimeout(() => {
                   console.log('🔄 Auto-refreshing page after 3 seconds...');
                   window.location.reload();
                 }, 3000);
               }
              
            } else {
              console.error('❌ Payment not found in database:', paymentStatusResponse);
              
              // In development mode, try to auto-complete any pending payment
              if (process.env.NODE_ENV === 'development' && orderId) {
                console.log('🔄 Development mode: Trying to auto-complete payment...');
                try {
                  const autoCompleteResponse = await fetch(`http://localhost:8090/routes.php/dev/auto_complete_payment?order_id=${orderId}`);
                  const autoCompleteData = await autoCompleteResponse.json();
                  
                  if (autoCompleteData.success) {
                    console.log('✅ Payment auto-completed! Refreshing page...');
                    // Refresh the page to show success
                    setTimeout(() => {
                      window.location.reload();
                    }, 1000);
                    return;
                  }
                } catch (autoCompleteError) {
                  console.error('❌ Error auto-completing payment:', autoCompleteError);
                }
              }
              
              setError('Payment not found. Please contact support if you believe this is an error.');
            }
            
          } catch (verifyError) {
            console.error('❌ Error verifying payment:', verifyError);
            
            // In development mode, try to auto-complete any pending payment
            if (process.env.NODE_ENV === 'development' && orderId) {
              console.log('🔄 Development mode: Trying to auto-complete payment after error...');
              try {
                const autoCompleteResponse = await fetch(`http://localhost:8090/routes.php/dev/auto_complete_payment?order_id=${orderId}`);
                const autoCompleteData = await autoCompleteResponse.json();
                
                if (autoCompleteData.success) {
                  console.log('✅ Payment auto-completed! Refreshing page...');
                  // Refresh the page to show success
                  setTimeout(() => {
                    window.location.reload();
                  }, 1000);
                  return;
                }
              } catch (autoCompleteError) {
                console.error('❌ Error auto-completing payment:', autoCompleteError);
              }
            }
            
            setError('Unable to verify payment. Please contact support.');
          }
          
        } else if (location.state) {
          console.log('📊 Using location state payment data:', location.state);
          setPaymentData(location.state);
        } else {
          console.log('❌ No payment data found in URL or location state');
          setError('No payment data found. Please complete a payment first.');
        }
      } catch (error) {
        console.error('❌ Error initializing payment data:', error);
        setError('Error loading payment details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    initializePaymentData();
  }, [location.state, searchParams]);

  if (loading) {
    return (
      <DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
        <div className="p-8 text-center text-gray-500">
          Loading payment details...
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
        <div className="p-8 text-center text-red-500">
          {error}
        </div>
      </DashboardLayout>
    );
  }

  if (!paymentData) {
    return (
      <DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
        <div className="p-8 text-center text-gray-500">
          No payment data found. Please complete a payment first.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <FaCheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600">
            Your payment has been processed successfully. You can now access your class.
          </p>
        </div>

        {/* Payment Summary Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Payment Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Transaction Details</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Transaction ID:</span> {paymentData.transactionId || paymentData.invoiceId}</div>
                <div><span className="font-medium">Date:</span> {paymentData.date}</div>
                <div><span className="font-medium">Payment Method:</span> {paymentData.paymentMethod || 'Online'}</div>
                <div><span className="font-medium">Status:</span> <span className="text-green-600 font-semibold">Paid</span></div>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Class Details</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Class:</span> {paymentData.className}</div>
                <div><span className="font-medium">Subject:</span> {paymentData.subject}</div>
                <div><span className="font-medium">Teacher:</span> {paymentData.teacher}</div>
                <div><span className="font-medium">Amount:</span> LKR {paymentData.amount?.toLocaleString()}</div>
                {paymentData.isSpeedPost && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-800">
                      <FaMapMarkerAlt className="text-blue-600" />
                      <span className="font-medium">Speed Post Delivery</span>
                    </div>
                    <div className="text-sm text-blue-700 mt-1">
                      <div>Fee: LKR {paymentData.speedPostFee?.toLocaleString()}</div>
                      {paymentData.address && (
                        <div className="mt-1">Address: {paymentData.address}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <button
            onClick={() => setShowReceipt(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaPrint />
            View Receipt
          </button>
          <button
            onClick={() => {
              // Enrollment is already guaranteed, just navigate
              console.log('🚀 Navigating to My Classes - enrollment already guaranteed');
              window.dispatchEvent(new CustomEvent('refreshMyClasses'));
              navigate('/student/my-classes');
            }}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FaList />
            View in My Classes
          </button>
          <button
            onClick={() => navigate('/studentdashboard')}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <FaHome />
            Back to Dashboard
          </button>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">What's Next?</h3>
          <div className="space-y-2 text-blue-800">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <p>Your class has been added to "My Classes" section</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <p>You can now access class materials and attend sessions</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <p>Check your email for class schedule and zoom links</p>
            </div>
            {paymentData.isSpeedPost ? (
              <>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-orange-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p><strong>Speed Post Delivery:</strong> Your study materials will be delivered to your address within 2-3 business days</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-orange-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p>You will receive a tracking number via SMS/email once the package is dispatched</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-orange-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Please ensure someone is available to receive the package at the delivery address</p>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <p>Collect your study materials during physical class sessions</p>
              </div>
            )}
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <p>Download your receipt for your records</p>
            </div>
          </div>
        </div>

        {/* Receipt Modal */}
        {showReceipt && (
          <Receipt
            paymentData={paymentData}
            onClose={() => setShowReceipt(false)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default PaymentSuccess; 
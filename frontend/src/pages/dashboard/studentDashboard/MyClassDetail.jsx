import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import studentSidebarSections from './StudentDashboardSidebar';
import CustomButton from '../../../components/CustomButton';
import SecureZoomMeeting from '../../../components/SecureZoomMeeting';
import { FaCalendar, FaClock, FaMoneyBill, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaEye, FaCreditCard, FaMapMarkerAlt, FaVideo, FaUsers, FaFileAlt, FaDownload, FaPlay, FaHistory, FaBook, FaGraduationCap, FaUserClock, FaExclamationCircle, FaInfoCircle, FaStar, FaCalendarAlt, FaUserGraduate, FaChartLine, FaShieldAlt, FaQrcode, FaBell, FaArrowLeft, FaEdit, FaTrash, FaPrint, FaShare, FaBookmark, FaHeart, FaThumbsUp, FaComment, FaEnvelope, FaPhone, FaGlobe, FaMapPin, FaCar, FaBus, FaTrain, FaPlane, FaShip, FaBicycle, FaWalking, FaCog } from 'react-icons/fa';

const MyClassDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForgetCardModal, setShowForgetCardModal] = useState(false);
  const [showLatePaymentModal, setShowLatePaymentModal] = useState(false);
  const [showSecureZoomModal, setShowSecureZoomModal] = useState(false);

  // Handle back navigation
  const handleBackNavigation = () => {
    // Close any open modals before navigating
    setShowSecureZoomModal(false);
    setShowForgetCardModal(false);
    setShowLatePaymentModal(false);
    navigate('/student/my-classes');
  };

  // Get image based on subject
  const getClassImage = (subject) => {
    if (!subject) return '/assets/nfts/Nft1.png';
    const imageMap = {
      'Physics': '/assets/nfts/Nft1.png',
      'Chemistry': '/assets/nfts/Nft2.png',
      'Mathematics': '/assets/nfts/Nft3.png',
      'Biology': '/assets/nfts/Nft4.png',
      'English': '/assets/nfts/Nft5.png',
      'ICT': '/assets/nfts/Nft6.png'
    };
    return imageMap[subject] || '/assets/nfts/Nft1.png';
  };

  useEffect(() => {
    try {
      if (location.state && location.state.class) {
        // Validate and normalize class data
        const validatedClass = validateAndNormalizeClass(location.state.class);
        setClassData(validatedClass);
      } else {
        // Load from localStorage if not passed via state
        const myClasses = JSON.parse(localStorage.getItem('myClasses') || '[]');
        const foundClass = myClasses.find(c => c.id === parseInt(id, 10));
        if (foundClass) {
          const validatedClass = validateAndNormalizeClass(foundClass);
          setClassData(validatedClass);
        } else {
          setError('Class not found');
        }
      }
    } catch (err) {
      console.error('Error loading class:', err);
      setError('Failed to load class details');
    } finally {
      setLoading(false);
    }
  }, [id, location.state]);

  // Handle navigation when modals are closed
  useEffect(() => {
    // This ensures that if any modal is open, the back button will still work
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowSecureZoomModal(false);
        setShowForgetCardModal(false);
        setShowLatePaymentModal(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Validate and normalize class data
  const validateAndNormalizeClass = (cls) => {
    return {
      ...cls,
      schedule: cls.schedule || { day: '', startTime: '', endTime: '', frequency: 'weekly' },
      fee: cls.fee || 0,
      maxStudents: cls.maxStudents || 50,
      status: cls.status || 'active',
      currentStudents: cls.currentStudents || 0,
      className: cls.className || 'Unnamed Class',
      subject: cls.subject || 'Unknown Subject',
      teacher: cls.teacher || 'Unknown Teacher',
      stream: cls.stream || 'Unknown Stream',
      deliveryMethod: cls.deliveryMethod || 'online',
      courseType: cls.courseType || 'theory',
      paymentStatus: cls.paymentStatus || 'pending',
      // Handle new payment tracking structure
      paymentTracking: cls.paymentTracking || { enabled: false },
      paymentTrackingFreeDays: cls.paymentTrackingFreeDays || 7,
      // Ensure payment tracking is properly structured
      ...(cls.paymentTracking && typeof cls.paymentTracking === 'object' ? {} : {
        paymentTracking: {
          enabled: cls.paymentTracking || false,
          freeDays: cls.paymentTrackingFreeDays || 7,
          active: cls.paymentTracking || false
        }
      }),
      // Add missing fields with defaults
      attendance: cls.attendance || [],
      paymentHistory: cls.paymentHistory || [],
      hasExams: cls.hasExams || false,
      hasTutes: cls.hasTutes || false,
      forgetCardRequested: cls.forgetCardRequested || false,
      latePaymentRequested: cls.latePaymentRequested || false,
      purchaseDate: cls.purchaseDate || new Date().toISOString(),
      nextPaymentDate: cls.nextPaymentDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
      startDate: cls.startDate || new Date().toISOString(),
      endDate: cls.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      description: cls.description || 'No description available',
      zoomLink: cls.zoomLink || '',
      image: cls.image || getClassImage(cls.subject)
    };
  };

  if (loading) {
    return (
      <DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading class details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !classData) {
    return (
      <DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
        <div className="p-6 text-center">
          <div className="text-red-600 mb-4">
            <FaExclamationCircle className="text-4xl mx-auto mb-2" />
            <p>{error || 'Class not found'}</p>
          </div>
          <CustomButton 
            onClick={() => navigate('/student/my-classes')} 
            className="bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700"
          >
            <FaArrowLeft className="mr-2" /> Back to My Classes
          </CustomButton>
        </div>
      </DashboardLayout>
    );
  }

  // Format time for display
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
    const [hour, minute] = timeStr.split(':');
    let h = parseInt(hour, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minute} ${ampm}`;
    } catch (err) {
      return timeStr;
    }
  };

  // Format day for display
  const formatDay = (day) => {
    if (!day) return '';
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  // Get payment status info with enhanced details
  const getPaymentStatusInfo = (status, nextPaymentDate) => {
    const nextPayment = new Date(nextPaymentDate);
    const today = new Date();
    const daysUntilPayment = Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24));
    
    switch (status) {
      case 'paid':
        return { 
          color: 'text-green-600', 
          icon: <FaCheckCircle />, 
          text: 'Paid',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'pending':
        return { 
          color: 'text-yellow-600', 
          icon: <FaExclamationTriangle />, 
          text: daysUntilPayment > 0 ? `Due in ${daysUntilPayment} days` : 'Due Today',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'overdue':
        return { 
          color: 'text-red-600', 
          icon: <FaTimesCircle />, 
          text: `Overdue by ${Math.abs(daysUntilPayment)} days`,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'late_payment':
        return { 
          color: 'text-orange-600', 
          icon: <FaUserClock />, 
          text: 'Late Payment Approved',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      default:
        return { 
          color: 'text-gray-600', 
          icon: <FaClock />, 
          text: 'Unknown',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  // Get delivery method info
  const getDeliveryMethodInfo = (method) => {
    switch (method) {
      case 'online':
        return { color: 'text-purple-600', icon: <FaVideo />, text: 'Online' };
      case 'physical':
        return { color: 'text-orange-600', icon: <FaMapMarkerAlt />, text: 'Physical' };
      case 'hybrid':
        return { color: 'text-indigo-600', icon: <FaUsers />, text: 'Hybrid' };
      default:
        return { color: 'text-gray-600', icon: <FaUsers />, text: method || 'Unknown' };
    }
  };

  // Get course type info
  const getCourseTypeInfo = (type) => {
    switch (type) {
      case 'theory':
        return { color: 'text-blue-600', icon: <FaBook />, text: 'Theory' };
      case 'revision':
        return { color: 'text-green-600', icon: <FaGraduationCap />, text: 'Revision' };
      case 'both':
        return { color: 'text-purple-600', icon: <FaBook />, text: 'Theory + Revision' };
      default:
        return { color: 'text-gray-600', icon: <FaBook />, text: type || 'Unknown' };
    }
  };

  // Get class status info
  const getClassStatusInfo = (status) => {
    switch (status) {
      case 'active':
        return { color: 'text-green-600', icon: <FaCheckCircle />, text: 'Active', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
      case 'inactive':
        return { color: 'text-red-600', icon: <FaTimesCircle />, text: 'Inactive', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
      default:
        return { color: 'text-gray-600', icon: <FaClock />, text: 'Unknown', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
    }
  };

  // Get class priority/urgency
  const getClassPriority = () => {
    // If class is inactive, it should be high priority
    if (classData.status === 'inactive') return { priority: 'high', text: 'Inactive', color: 'text-red-600', bgColor: 'bg-red-50' };
    
    const nextPayment = new Date(classData.nextPaymentDate);
    const today = new Date();
    const daysUntilPayment = Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24));
    
    if (classData.paymentStatus === 'overdue') return { priority: 'high', text: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-50' };
    if (classData.paymentStatus === 'pending' && daysUntilPayment <= 3) return { priority: 'medium', text: 'Due Soon', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    if (classData.paymentStatus === 'paid') return { priority: 'low', text: 'Active', color: 'text-green-600', bgColor: 'bg-green-50' };
    return { priority: 'normal', text: 'Normal', color: 'text-gray-600', bgColor: 'bg-gray-50' };
  };

  // Handle make payment
  const handleMakePayment = () => {
    navigate(`/student/checkout/${classData.id}`, { state: { type: 'renewal' } });
  };

  // Handle join class
  const handleJoinClass = () => {
    if (classData.deliveryMethod === 'online' || classData.deliveryMethod === 'hybrid') {
      if (classData.zoomLink) {
        // Use secure zoom meeting modal instead of opening link directly
        setShowSecureZoomModal(true);
      } else {
        alert('Zoom link not available for this class.');
      }
    } else {
      alert('This is a physical class. Please attend at the specified location.');
    }
  };

  // Handle forget card request
  const handleForgetCardRequest = () => {
    setShowForgetCardModal(true);
  };

  // Submit forget card request
  const submitForgetCardRequest = () => {
    const myClasses = JSON.parse(localStorage.getItem('myClasses') || '[]');
    const updatedClasses = myClasses.map(c => {
      if (c.id === classData.id) {
        return {
          ...c,
          forgetCardRequested: true,
          forgetCardRequestDate: new Date().toISOString()
        };
      }
      return c;
    });
    
    localStorage.setItem('myClasses', JSON.stringify(updatedClasses));
    setClassData({ ...classData, forgetCardRequested: true, forgetCardRequestDate: new Date().toISOString() });
    setShowForgetCardModal(false);
    alert('Forget card request submitted successfully!');
  };

  // Handle late payment request
  const handleLatePaymentRequest = () => {
    setShowLatePaymentModal(true);
  };

  // Submit late payment request
  const submitLatePaymentRequest = () => {
    const myClasses = JSON.parse(localStorage.getItem('myClasses') || '[]');
    const updatedClasses = myClasses.map(c => {
      if (c.id === classData.id) {
        return {
          ...c,
          paymentStatus: 'late_payment',
          latePaymentRequested: true,
          latePaymentRequestDate: new Date().toISOString()
        };
      }
      return c;
    });
    
    localStorage.setItem('myClasses', JSON.stringify(updatedClasses));
    setClassData({ ...classData, paymentStatus: 'late_payment', latePaymentRequested: true, latePaymentRequestDate: new Date().toISOString() });
    setShowLatePaymentModal(false);
    alert('Late payment request submitted successfully! You can attend today\'s class.');
  };

  const nextPaymentDate = new Date(classData.nextPaymentDate);
  const today = new Date();
  const isPaymentDue = nextPaymentDate <= today && classData.paymentStatus !== 'paid';
  const paymentStatus = getPaymentStatusInfo(classData.paymentStatus, classData.nextPaymentDate);
  const classStatus = getClassStatusInfo(classData.status);
  const deliveryInfo = getDeliveryMethodInfo(classData.deliveryMethod);
  const courseTypeInfo = getCourseTypeInfo(classData.courseType);
  const priority = getClassPriority();
  const isInactive = classData.status === 'inactive';
  
  const scheduleText = classData.schedule ? 
    `${formatDay(classData.schedule.day)} ${formatTime(classData.schedule.startTime)}-${formatTime(classData.schedule.endTime)}` : 
    'Schedule not set';

  const tabOptions = [
    { key: 'overview', label: 'Overview', icon: <FaEye /> },
    { key: 'payments', label: 'Payments', icon: <FaMoneyBill /> },
    { key: 'attendance', label: 'Attendance', icon: <FaCalendar /> },
    { key: 'materials', label: 'Materials', icon: <FaFileAlt /> },
    { key: 'schedule', label: 'Schedule', icon: <FaClock /> },
    { key: 'actions', label: 'Actions', icon: <FaCog /> }
  ];

  return (
    <DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
      <div className="p-6 max-w-6xl mx-auto" style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <img 
            src={getClassImage(classData.subject)} 
            alt={classData.className} 
            className="w-32 h-32 object-cover rounded-xl border shadow-lg"
          />
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold mb-1">{classData.className}</h1>
            <div className="text-gray-600 mb-2">By {classData.teacher}</div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm ${priority.bgColor} ${priority.color} border ${priority.borderColor}`}>
                {priority.text}
              </div>
            </div>
            <div className="text-gray-700 mb-4 line-clamp-2">{classData.description}</div>
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <span className="text-cyan-700 font-bold text-lg">LKR {parseInt(classData.fee).toLocaleString()}</span>
              <span className={`flex items-center gap-1 ${paymentStatus.color}`}>
                {paymentStatus.icon} {paymentStatus.text}
              </span>
              <span className={`flex items-center gap-1 ${classStatus.color}`}>
                {classStatus.icon} {classStatus.text}
              </span>
              <span className={`flex items-center gap-1 ${deliveryInfo.color}`}>
                {deliveryInfo.icon} {deliveryInfo.text}
              </span>
              <span className={`flex items-center gap-1 ${courseTypeInfo.color}`}>
                {courseTypeInfo.icon} {courseTypeInfo.text}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <CustomButton 
                onClick={handleBackNavigation} 
                className="bg-gray-600 hover:bg-gray-700"
                style={{ zIndex: 10000 }}
              >
                <FaArrowLeft className="mr-2" /> Back
              </CustomButton>
              {isPaymentDue && !isInactive && (
                <CustomButton onClick={handleMakePayment} className="bg-red-600 hover:bg-red-700">
                  <FaCreditCard className="mr-2" /> Make Payment
                </CustomButton>
              )}
                              <CustomButton 
                  onClick={handleJoinClass} 
                  className={`${isInactive ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                  disabled={isInactive}
                >
                  <FaPlay className="mr-2" /> {isInactive ? 'Class Inactive' : 'Join Secure Meeting'}
                </CustomButton>
              {!classData.forgetCardRequested && !isInactive && (
                <CustomButton onClick={handleForgetCardRequest} className="bg-orange-600 hover:bg-orange-700">
                  <FaQrcode className="mr-2" /> Request Forget Card
                </CustomButton>
              )}
              {classData.paymentStatus === 'overdue' && !classData.latePaymentRequested && !isInactive && (
                <CustomButton onClick={handleLatePaymentRequest} className="bg-red-600 hover:bg-red-700">
                  <FaExclamationCircle className="mr-2" /> Request Late Payment
              </CustomButton>
              )}
            </div>
          </div>
        </div>

        {/* Inactive Class Warning */}
        {isInactive && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <FaTimesCircle className="text-xl" />
              <div>
                <h3 className="font-semibold">Class Deactivated</h3>
                <p className="text-sm">This class has been deactivated by the administrator. You cannot join classes or access materials until it is reactivated.</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-lg font-bold text-blue-600">{classData.currentStudents || 0}</div>
            <div className="text-sm text-blue-700">Current Students</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-lg font-bold text-green-600">
              {classData.attendance ? classData.attendance.filter(a => a.status === 'present').length : 0}
            </div>
            <div className="text-sm text-green-700">Attendance</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <div className="text-lg font-bold text-purple-600">
              {classData.paymentHistory ? classData.paymentHistory.length : 0}
            </div>
            <div className="text-sm text-purple-700">Payments</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg text-center">
            <div className="text-lg font-bold text-yellow-600">
              {classData.hasExams ? 'Yes' : 'No'}
            </div>
            <div className="text-sm text-yellow-700">Exams Available</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b overflow-x-auto">
          {tabOptions.map(tab => (
            <button
              key={tab.key}
              className={`px-4 py-2 font-semibold rounded-t flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.key 
                  ? 'bg-cyan-700 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FaInfoCircle className="text-cyan-600" />
                  Class Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-semibold">Subject:</span>
                    <span>{classData.subject}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Stream:</span>
                    <span>{classData.stream}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Schedule:</span>
                    <span>{scheduleText}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Frequency:</span>
                    <span>{classData.schedule?.frequency || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Start Date:</span>
                    <span>{new Date(classData.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">End Date:</span>
                    <span>{new Date(classData.endDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Students:</span>
                    <span>{classData.currentStudents || 0}/{classData.maxStudents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Purchase Date:</span>
                    <span>{new Date(classData.purchaseDate).toLocaleDateString()}</span>
                  </div>
                  {classData.zoomLink && (classData.deliveryMethod === 'online' || classData.deliveryMethod === 'hybrid') && (
                    <div className="flex justify-between">
                      <span className="font-semibold">Zoom Link:</span>
                      <a href={classData.zoomLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Join Meeting</a>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FaMoneyBill className="text-green-600" />
                  Payment Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-semibold">Payment Status:</span>
                    <span className={`flex items-center gap-1 ${paymentStatus.color}`}>
                      {paymentStatus.icon} {paymentStatus.text}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Payment Method:</span>
                    <span>{classData.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Next Payment:</span>
                    <span>{nextPaymentDate.toLocaleDateString()}</span>
                  </div>
                  {isPaymentDue && (
                    <div className="text-red-600 font-semibold bg-red-50 p-2 rounded border border-red-200">⚠️ Payment is due!</div>
                  )}
                  {(classData.paymentTracking && (classData.paymentTracking.enabled || classData.paymentTracking === true)) && (
                    <div className="text-green-600 font-semibold bg-green-50 p-2 rounded border border-green-200">
                      ✓ Payment Tracking Enabled
                      {classData.paymentTracking.enabled && classData.paymentTracking.freeDays && (
                        <span> ({classData.paymentTracking.freeDays} days free)</span>
                      )}
                      {classData.paymentTracking === true && (
                        <span> (7 days free)</span>
                      )}
                    </div>
                  )}
                  {classData.theoryRevisionDiscount && classData.courseType === 'both' && (
                    <div className="text-purple-600 font-semibold bg-purple-50 p-2 rounded border border-purple-200">✓ Theory + Revision Discount Applied</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FaHistory className="text-blue-600" />
                Payment History
              </h3>
              {classData.paymentHistory && classData.paymentHistory.length > 0 ? (
                <div className="space-y-4">
                  {classData.paymentHistory.map((payment, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold">Payment #{index + 1}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(payment.date).toLocaleDateString()} - {payment.method}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">LKR {payment.amount.toLocaleString()}</div>
                          <div className={`text-sm ${payment.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {payment.status}
                          </div>
                        </div>
                      </div>
                      {payment.invoiceId && (
                        <div className="text-xs text-gray-500 mt-2">Invoice: {payment.invoiceId}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  <FaHistory className="text-4xl mx-auto mb-2 text-gray-300" />
                  <p>No payment history available.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FaCalendar className="text-green-600" />
                Attendance Record
              </h3>
              {classData.attendance && classData.attendance.length > 0 ? (
                <div className="space-y-3">
                  {classData.attendance.map((record, index) => (
                    <div key={index} className="flex justify-between items-center border rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div>
                        <div className="font-semibold">{new Date(record.date).toLocaleDateString()}</div>
                        <div className="text-sm text-gray-600">{new Date(record.timestamp).toLocaleTimeString()}</div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm ${
                        record.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {record.status}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  <FaCalendar className="text-4xl mx-auto mb-2 text-gray-300" />
                  <p>No attendance records available.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'materials' && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FaFileAlt className="text-purple-600" />
                Course Materials
              </h3>
              <div className="space-y-4">
                {classData.hasExams && (
                  <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <FaGraduationCap className="text-blue-600" />
                      <span className="font-semibold">Exams</span>
                    </div>
                    <p className="text-gray-600 mb-3">Access your course exams and assessments.</p>
                    <CustomButton className="bg-blue-600 hover:bg-blue-700">
                      <FaDownload className="mr-2" /> Access Exams
                    </CustomButton>
                  </div>
                )}
                
                {classData.hasTutes && (
                  <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <FaBook className="text-green-600" />
                      <span className="font-semibold">Tutes & Materials</span>
                    </div>
                    <p className="text-gray-600 mb-3">Download course materials, tutes, and study resources.</p>
                    <CustomButton className="bg-green-600 hover:bg-green-700">
                      <FaDownload className="mr-2" /> Download Materials
                    </CustomButton>
                  </div>
                )}
                
                {!classData.hasExams && !classData.hasTutes && (
                  <div className="text-gray-500 text-center py-8">
                    <FaFileAlt className="text-4xl mx-auto mb-2 text-gray-300" />
                    <p>No materials available yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FaClock className="text-orange-600" />
                Class Schedule
              </h3>
              <div className="space-y-4">
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="font-semibold mb-2">Regular Schedule</div>
                      <div className="space-y-2">
                        <div><strong>Day:</strong> {classData.schedule ? formatDay(classData.schedule.day) : 'Not set'}</div>
                        <div><strong>Time:</strong> {classData.schedule ? `${formatTime(classData.schedule.startTime)} - ${formatTime(classData.schedule.endTime)}` : 'Not set'}</div>
                        <div><strong>Frequency:</strong> {classData.schedule?.frequency || 'Not set'}</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold mb-2">Class Period</div>
                      <div className="space-y-2">
                        <div><strong>Start Date:</strong> {new Date(classData.startDate).toLocaleDateString()}</div>
                        <div><strong>End Date:</strong> {new Date(classData.endDate).toLocaleDateString()}</div>
                        <div><strong>Duration:</strong> {classData.schedule?.frequency || 'Not specified'}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {classData.deliveryMethod === 'hybrid' && (
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="font-semibold mb-2 text-blue-800">Hybrid Class Information</div>
                    <p className="text-blue-700 text-sm">This class alternates between online and physical sessions. Check with your teacher for the current week's format.</p>
                  </div>
                )}
                

              </div>
                  </div>
        )}

          {activeTab === 'actions' && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FaCog className="text-gray-600" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <CustomButton onClick={handleJoinClass} className="bg-blue-600 hover:bg-blue-700">
                  <FaPlay className="mr-2" /> Join Class
                </CustomButton>
                {isPaymentDue && (
                  <CustomButton onClick={handleMakePayment} className="bg-red-600 hover:bg-red-700">
                    <FaCreditCard className="mr-2" /> Make Payment
                  </CustomButton>
                )}
                {!classData.forgetCardRequested && (
                  <CustomButton onClick={handleForgetCardRequest} className="bg-orange-600 hover:bg-orange-700">
                    <FaQrcode className="mr-2" /> Request Forget Card
                  </CustomButton>
                )}
                {classData.paymentStatus === 'overdue' && !classData.latePaymentRequested && (
                  <CustomButton onClick={handleLatePaymentRequest} className="bg-red-600 hover:bg-red-700">
                    <FaExclamationCircle className="mr-2" /> Request Late Payment
                  </CustomButton>
                )}
                <CustomButton className="bg-purple-600 hover:bg-purple-700">
                  <FaPrint className="mr-2" /> Print Details
                </CustomButton>
                <CustomButton className="bg-green-600 hover:bg-green-700">
                  <FaShare className="mr-2" /> Share Class
                </CustomButton>
                <CustomButton className="bg-yellow-600 hover:bg-yellow-700">
                  <FaBookmark className="mr-2" /> Bookmark
                </CustomButton>
                <CustomButton className="bg-pink-600 hover:bg-pink-700">
                  <FaHeart className="mr-2" /> Favorite
                </CustomButton>
                <CustomButton className="bg-indigo-600 hover:bg-indigo-700">
                  <FaEnvelope className="mr-2" /> Contact Teacher
                </CustomButton>
              </div>
            </div>
          )}
        </div>

        {/* Forget Card Modal */}
        {showForgetCardModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Request Forget Card</h3>
              <p className="text-gray-600 mb-4">
                You are requesting a forget card for: <strong>{classData.className}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-4">
                This will allow you to attend the class even if you forgot your ID card.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={submitForgetCardRequest}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Submit Request
                </button>
                <button
                  onClick={() => setShowForgetCardModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Late Payment Modal */}
        {showLatePaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Request Late Payment</h3>
              <p className="text-gray-600 mb-4">
                You are requesting late payment for: <strong>{classData.className}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-4">
                This will allow you to attend today's class without immediate payment.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={submitLatePaymentRequest}
                  className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
                >
                  Submit Request
                </button>
                <button
                  onClick={() => setShowLatePaymentModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Secure Zoom Meeting Modal */}
        {showSecureZoomModal && classData && (
          <SecureZoomMeeting
            zoomLink={classData.zoomLink}
            className={classData.className}
            onClose={() => setShowSecureZoomModal(false)}
            isOpen={showSecureZoomModal}
            classData={classData}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyClassDetail; 
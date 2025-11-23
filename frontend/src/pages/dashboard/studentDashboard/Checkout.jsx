import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import studentSidebarSections from './StudentDashboardSidebar';
import BasicCard from '../../../components/BasicCard';
import studyPacks from './PurchaseStudyPackData';
import BasicForm from '../../../components/BasicForm';
import CustomTextField from '../../../components/CustomTextField';
import CustomSelectField from '../../../components/CustomSelectField';
import * as Yup from 'yup';
import { FaCreditCard, FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaBook, FaCalendar, FaClock, FaVideo, FaUsers, FaGraduationCap, FaCheckCircle, FaMoneyBill } from 'react-icons/fa';
import CustomButton from '../../../components/CustomButton';
import { getClassById } from '../../../api/classes';
import { getUserData } from '../../../api/apiUtils';
import { getStudentEnrollments, convertEnrollmentToMyClass } from '../../../api/enrollments';
import axios from 'axios';

// Remove dummyStudent - we'll get real data from getUserData()

// Function to fetch complete student profile from backend
const fetchStudentProfile = async (userid) => {
  try {
    console.log('Fetching student profile for checkout:', userid);
    const response = await axios.get(`http://localhost:8086/routes.php/get_with_id/${userid}`, {
      timeout: 5000
    });
    
    console.log('Student profile response for checkout:', response.data);
    
    if (response.data && !response.data.error) {
      return response.data;
    } else {
      console.error('Error fetching student profile for checkout:', response.data);
      return null;
    }
  } catch (error) {
    console.error('Error fetching student profile for checkout:', error);
    return null;
  }
};

// Function to get student data from logged-in user
const getStudentData = async (cls) => {
  const userData = getUserData();
  if (userData && userData.userid) {
    // Fetch complete student profile from backend
    const studentProfile = await fetchStudentProfile(userData.userid);
    
    if (studentProfile) {
    return {
    studentId: studentProfile.user_id || userData.userid || '',
        firstName: studentProfile.first_name || userData.firstName || '',
        lastName: studentProfile.last_name || userData.lastName || '',
        mobile: studentProfile.mobile_number || userData.mobile || '',
        otherMobile: studentProfile.parent_mobile_number || userData.parentMobile || '',
        email: studentProfile.email || userData.email || '',
        medium: cls?.classMedium === 'Both' ? 'Sinhala' : (cls?.classMedium || 'Sinhala'), // Default to Sinhala if class medium is 'Both'
        address: studentProfile.address || userData.address || '',
        tuteType: cls?.enableTuteCollection ? getDefaultTuteType(cls) : '', // Only set if tute collection is enabled
      paymentNote: ''
    };
  }
  }
  
  // Fallback if no user data or profile fetch failed
  return {
  studentId: userData?.userid || '',
    firstName: userData?.firstName || '',
    lastName: userData?.lastName || '',
    mobile: userData?.mobile || '',
    otherMobile: userData?.parentMobile || '',
    email: userData?.email || '',
    medium: cls?.classMedium === 'Both' ? 'Sinhala' : (cls?.classMedium || 'Sinhala'),
    address: userData?.address || '',
    tuteType: cls?.enableTuteCollection ? getDefaultTuteType(cls) : '',
  paymentNote: ''
  };
};



const mediumOptions = [
  { value: 'Sinhala', label: 'Sinhala' },
  { value: 'English', label: 'English' },
];

// Dynamic tute type options based on class settings
const getTuteTypeOptions = (cls) => {
  if (!cls || !cls.enableTuteCollection) {
    return [];
  }
  
  const options = [];
  
  if (cls.tuteCollectionType === 'speed_post' || cls.tuteCollectionType === 'both') {
    options.push({ value: 'Speed Post', label: 'Speed Post' });
  }
  
  if (cls.tuteCollectionType === 'physical_class' || cls.tuteCollectionType === 'both') {
    options.push({ value: 'Physical Class', label: 'Physical Class' });
  }
  
  return options;
};

// Get default tute type based on class settings
const getDefaultTuteType = (cls) => {
  if (!cls || !cls.enableTuteCollection) {
    return '';
  }
  
  // If only one option is available, use that as default
  if (cls.tuteCollectionType === 'speed_post') {
    return 'Speed Post';
  }
  if (cls.tuteCollectionType === 'physical_class') {
    return 'Physical Class';
  }
  
  // If both options are available, default to Speed Post
  if (cls.tuteCollectionType === 'both') {
    return 'Speed Post';
  }
  
  return '';
};

// Check if tute type field should be read-only
const isTuteTypeReadOnly = (cls) => {
  if (!cls || !cls.enableTuteCollection) {
    return true;
  }
  
  // If only one option is available, make it read-only
  return cls.tuteCollectionType === 'speed_post' || cls.tuteCollectionType === 'physical_class';
};

const getValidationSchema = (isStudyPack, cls) =>
  Yup.object().shape({
    firstName: Yup.string().required('Required'),
    lastName: Yup.string().required('Required'),
    mobile: Yup.string().required('Required').matches(/^0[1-9][0-9]{8}$/, 'Invalid mobile number'),
    email: Yup.string().email('Invalid email').required('Required'),
    medium: Yup.string().required('Required'),
    ...(isStudyPack ? {} : {
      tuteType: Yup.string().when('$enableTuteCollection', {
        is: true,
        then: (schema) => schema.required('Required'),
        otherwise: (schema) => schema.notRequired(),
      }),
      address: Yup.string().when('tuteType', {
          is: 'Speed Post',
        then: (schema) => schema.required('Address is required for Speed Post'),
        otherwise: (schema) => schema.notRequired(),
      }),
        }),
  });

const paymentMethods = [
  { key: 'online', label: 'Online', sinhala: 'අන්තර්ජාලයෙන්', icon: <FaCreditCard className="text-2xl text-green-600 mb-2" /> },
];

// Get image based on subject
const getClassImage = (subject) => {
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

// Format time for display
const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [hour, minute] = timeStr.split(':');
  let h = parseInt(hour, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${minute} ${ampm}`;
};

// Format day for display
const formatDay = (day) => {
  return day.charAt(0).toUpperCase() + day.slice(1);
};

// Get delivery method info
const getDeliveryMethodInfo = (method) => {
  switch (method) {
    case 'online':
      return { color: 'text-blue-600', icon: <FaVideo />, text: 'Online Only' };
    case 'physical':
      return { color: 'text-orange-600', icon: <FaMapMarkerAlt />, text: 'Physical Only' };
    case 'hybrid1':
      return { color: 'text-indigo-600', icon: <FaUsers />, text: 'Hybrid (Physical + Online)' };
    case 'hybrid2':
      return { color: 'text-green-600', icon: <FaVideo />, text: 'Hybrid (Physical + Recorded)' };
    case 'hybrid3':
      return { color: 'text-blue-600', icon: <FaVideo />, text: 'Hybrid (Online + Recorded)' };
    case 'hybrid4':
      return { color: 'text-teal-600', icon: <FaUsers />, text: 'Hybrid (Physical + Online + Recorded)' };
    case 'hybrid':
      return { color: 'text-indigo-600', icon: <FaUsers />, text: 'Hybrid' };
    default:
      return { color: 'text-gray-600', icon: <FaUsers />, text: method };
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
      return { color: 'text-gray-600', icon: <FaBook />, text: type };
  }
};

// Calculate next payment date based on schedule frequency
const calculateNextPaymentDate = (schedule) => {
  const now = new Date();
  if (!schedule || !schedule.frequency) {
    return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(); // 1st of next month
  }
  
  switch (schedule.frequency) {
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'bi-weekly':
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(); // 1st of next month
    default:
      return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(); // 1st of next month
  }
};

const Checkout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isStudyPack = location.state && location.state.type === 'studyPack';
  const isRenewal = location.state && location.state.type === 'renewal';
  const [classes, setClasses] = useState([]);
  const [myClasses, setMyClasses] = useState([]);
  const [cls, setCls] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [promo, setPromo] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [theoryStudentDiscount, setTheoryStudentDiscount] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [studentDataLoading, setStudentDataLoading] = useState(true);

  // Load student data after class data is loaded
  useEffect(() => {
    const loadStudentData = async () => {
      if (!cls) return; // Wait for class data to be loaded
      
      try {
        setStudentDataLoading(true);
        const data = await getStudentData(cls);
        setStudentData(data);
        console.log('Loaded student data for checkout:', data);
      } catch (error) {
        console.error('Error loading student data:', error);
        setStudentData(null);
      } finally {
        setStudentDataLoading(false);
      }
    };

    loadStudentData();
  }, [cls]); // Depend on cls state

  // Load class data from backend API
  useEffect(() => {
    const loadClassData = async () => {
      try {
        if (isRenewal) {
          // For renewal payments, load the class from student's enrollments
          const userData = getUserData();
          if (!userData || !userData.userid) {
            alert('No logged-in user found. Please login again.');
            navigate('/student/login');
            return;
          }
          
          const enrollmentsResponse = await getStudentEnrollments(userData.userid);
          if (enrollmentsResponse.success) {
            const myClasses = enrollmentsResponse.data.map(convertEnrollmentToMyClass);
            const renewalClass = myClasses.find(c => c.id === parseInt(id));
            if (renewalClass) {
              setCls(renewalClass);
            } else {
              alert('Class not found in your enrollments.');
              navigate('/student/dashboard');
            }
          } else {
            alert('Failed to load your enrollments.');
            navigate('/student/dashboard');
          }
        } else if (!isStudyPack) {
          // Load class from backend API
          const response = await getClassById(id);
          if (response.success) {
            setCls(response.data);
          } else {
            console.error('Failed to load class:', response.message);
      }
    } else {
      // For study packs, use the static data
      const foundStudyPack = studyPacks[parseInt(id, 10)];
      setCls(foundStudyPack);
    }

        // Load student's purchased classes from localStorage (for now)
    const loadMyClasses = async () => {
      try {
        const userData = getUserData();
        if (!userData || !userData.userid) {
          console.error('No logged-in user found');
          setMyClasses([]);
          return;
        }
        
        const response = await getStudentEnrollments(userData.userid);
        if (response.success) {
          const convertedClasses = response.data.map(convertEnrollmentToMyClass);
          setMyClasses(convertedClasses);
          console.log('Loaded enrollments:', convertedClasses);
        } else {
          console.error('Failed to load student enrollments:', response.message);
          setMyClasses([]);
        }
      } catch (error) {
        console.error('Error loading student enrollments:', error);
        setMyClasses([]);
      }
    };
    loadMyClasses();
      } catch (error) {
        console.error('Error loading class data:', error);
    }
    };

    loadClassData();
  }, [id, isStudyPack]);

  // Check if student owns the related theory class for a revision class
  const checkRelatedTheoryOwnership = (revisionClass) => {
    console.log('Checking related theory ownership:', {
      revisionClass: revisionClass,
      courseType: revisionClass?.courseType,
      relatedTheoryId: revisionClass?.relatedTheoryId,
      myClasses: myClasses
    });
    
    if (revisionClass.courseType !== 'revision' || !revisionClass.relatedTheoryId) {
      console.log('Not a revision class or no related theory ID');
      return false;
    }
    
    const ownsRelatedTheory = myClasses.some(myClass => myClass.id === revisionClass.relatedTheoryId);
    console.log('Owns related theory result:', ownsRelatedTheory);
    return ownsRelatedTheory;
  };

  // Calculate theory student discount
  useEffect(() => {
    console.log('Discount calculation triggered:', {
      cls: cls,
      isStudyPack: isStudyPack,
      myClasses: myClasses,
      courseType: cls?.courseType,
      revisionDiscountPrice: cls?.revisionDiscountPrice,
      relatedTheoryId: cls?.relatedTheoryId
    });
    
    if (cls && !isStudyPack && cls.courseType === 'revision' && cls.revisionDiscountPrice) {
      const ownsRelatedTheory = checkRelatedTheoryOwnership(cls);
      console.log('Owns related theory:', ownsRelatedTheory);
      
      if (ownsRelatedTheory) {
        const discount = Number(cls.revisionDiscountPrice) || 0;
        setTheoryStudentDiscount(discount);
        setDiscountReason('Theory Student Discount');
        console.log('Discount applied:', discount);
      } else {
        setTheoryStudentDiscount(0);
        setDiscountReason('');
        console.log('No discount applied - does not own related theory');
      }
    } else {
      setTheoryStudentDiscount(0);
      setDiscountReason('');
      console.log('No discount conditions met');
    }
  }, [cls, myClasses, isStudyPack]);

  if (!cls) {
    return (
      <DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
        <div className="p-6 max-w-2xl mx-auto text-center text-gray-500">
          {isStudyPack ? 'Study Pack not found.' : 'Class not found.'}
        </div>
      </DashboardLayout>
    );
  }

  if (studentDataLoading) {
    return (
      <DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
        <div className="p-6 max-w-2xl mx-auto text-center text-gray-500">
          Loading student information...
        </div>
      </DashboardLayout>
    );
  }

  const handleApplyPromo = () => {
    if (promo.trim() === '') {
      alert('Please enter a promo code');
      return;
    }
    // Simulate promo code validation
    if (promo.toLowerCase() === 'welcome10') {
      setAppliedPromo(10);
      alert('Promo code applied! 10% discount');
    } else {
      alert('Invalid promo code');
    }
  };

  return (
    <DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
      <div className="p-4 max-w-6xl mx-auto">
        {/* Renewal Payment Header */}
        {isRenewal && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <FaMoneyBill className="text-orange-600 text-xl" />
              <div>
                <div className="font-semibold text-orange-700 text-lg">Payment Required</div>
                <div className="text-orange-600">
                  {location.state?.gracePeriodExpired 
                    ? 'Your grace period has expired. Please make payment to restore access to this class.'
                    : location.state?.daysRemaining <= 3
                    ? 'Your grace period is ending soon. You can make an early payment to extend your access.'
                    : 'Next payment is due. You can make a payment to renew your class for the next month.'
                  }
                </div>
              </div>
            </div>
          </div>
        )}
        <BasicForm 
          initialValues={studentData || {}} 
          validationSchema={getValidationSchema(isStudyPack, cls)}
          context={{ enableTuteCollection: cls?.enableTuteCollection }}
          onSubmit={async values => {
          try {
            setLoading(true);
            
          const isSpeedPost = values.tuteType === 'Speed Post';
          // Only apply speed post fee if student selected Speed Post AND class allows it
          const speedPostFee = (isSpeedPost && (cls.tuteCollectionType === 'speed_post' || cls.tuteCollectionType === 'both')) ? (cls.speedPostFee || 300) : 0;
          const basePrice = isStudyPack ? parseInt(cls.price.replace(/\D/g, '')) : parseInt(cls.fee);
          const promoDiscount = appliedPromo || 0;
          const totalDiscount = promoDiscount + theoryStudentDiscount;
          const amount = basePrice - totalDiscount + speedPostFee;
            
            // Get logged-in user data
            const userData = getUserData();
            if (!userData || !userData.userid) {
              alert('No logged-in user found. Please login again.');
              setLoading(false);
              return;
            }
            const actualStudentId = userData.userid;
            
            if (!isStudyPack) {
              // Prepare payment data for Invoice page (don't create payment yet)
              const paymentData = {
                studentId: actualStudentId,
                classId: cls.id,
                amount: amount,
                discount: totalDiscount,
                paymentMethod: paymentMethod,
                notes: `${isRenewal ? (
                  location.state?.gracePeriodExpired 
                    ? 'Renewal Payment - ' 
                    : location.state?.daysRemaining <= 3 
                    ? 'Early Payment - ' 
                    : 'Next Month Renewal - '
                ) : ''}Promo: ${promoDiscount}, Theory Discount: ${theoryStudentDiscount}, Speed Post: ${speedPostFee}`
              };

          const fullName = `${values.firstName} ${values.lastName}`;
          const orderData = {
            ...values,
            fullName,
                className: cls.className,
            basePrice,
            discount: totalDiscount,
            promoDiscount,
            theoryStudentDiscount,
            speedPostFee,
            amount,
                paymentData: paymentData, // Pass payment data to Invoice
            date: new Date().toLocaleDateString(),
            // Add class data for My Classes
                isStudyPack: false,
                isRenewal: isRenewal, // Add renewal flag
            classId: cls.id,
            subject: cls.subject,
            teacher: cls.teacher,
            stream: cls.stream,
            deliveryMethod: cls.deliveryMethod,
            courseType: cls.courseType,
            schedule: cls.schedule,
                nextPaymentDate: calculateNextPaymentDate(cls.schedule),
                    image: cls.image,
        description: cls.description,
        zoomLink: cls.zoomLink || '',
            paymentTracking: cls.paymentTracking,
            paymentTrackingFreeDays: cls.paymentTrackingFreeDays,
            maxStudents: cls.maxStudents || 50,
          };

              console.log('📤 Navigating to invoice with orderData:', orderData);
              console.log('📤 Payment data being passed:', paymentData);
              navigate('/student/invoice', { state: orderData });
            } else {
              // For study packs, pass through flags so invoice/payment can create study-pack payment
              const invoiceId = `INV${Date.now()}`;
              const fullName = `${values.firstName} ${values.lastName}`;
              const orderData = {
                ...values,
                fullName,
                className: cls.title,
                basePrice,
                discount: totalDiscount,
                promoDiscount,
                theoryStudentDiscount,
                speedPostFee,
                amount,
                invoiceId,
                date: new Date().toLocaleDateString(),
                isStudyPack: true,
                classId: cls.id,
                studyPackId: cls.id,
                image: cls.image,
                description: cls.description,
              };

              navigate('/student/invoice', { state: orderData });
            }
          } catch (error) {
            console.error('Error creating payment:', error);
            alert('Failed to create payment. Please try again.');
          } finally {
            setLoading(false);
          }
        }}>
          {({ errors, touched, handleChange, values }) => {
            const isSpeedPost = values.tuteType === 'Speed Post';
            // Only apply speed post fee if student selected Speed Post AND class allows it
            const speedPostFee = (isSpeedPost && (cls.tuteCollectionType === 'speed_post' || cls.tuteCollectionType === 'both')) ? (cls.speedPostFee || 300) : 0;
            const price = isStudyPack ? parseInt(cls.price.replace(/\D/g, '')) : parseInt(cls.fee);
            const promoDiscount = appliedPromo || 0;
            const totalDiscount = promoDiscount + theoryStudentDiscount;
            const amount = price - totalDiscount + speedPostFee;
            
            // Get class info for display
            const deliveryInfo = !isStudyPack ? getDeliveryMethodInfo(cls.deliveryMethod) : null;
            const courseTypeInfo = !isStudyPack ? getCourseTypeInfo(cls.courseType) : null;
            const scheduleText = !isStudyPack && cls.schedule ? 
              `${formatDay(cls.schedule.day)} ${formatTime(cls.schedule.startTime)}-${formatTime(cls.schedule.endTime)}` : 
              'Schedule not set';

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Card */}
                <div className="md:col-span-2">
                  <div className="bg-white rounded-xl shadow p-6 mb-6 border">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <img src={isStudyPack ? cls.image : getClassImage(cls.subject)} alt={isStudyPack ? cls.title : cls.className} className="w-20 h-20 rounded-lg object-cover border" />
                        <div>
                          <div className="font-semibold text-base">
                            {isStudyPack ? cls.title : cls.className} 
                            <span className="text-xs text-gray-400 font-normal">- {isStudyPack ? 'Study Pack Details' : 'Course Details'}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{cls.teacher}</div>
                          {!isStudyPack && (
                            <div className="text-xs text-gray-500 mt-1">
                              <div className="flex items-center gap-1">
                                <FaBook className="text-gray-400" />
                                {cls.subject} - {cls.stream}
                              </div>
                              <div className="flex items-center gap-1">
                                <FaCalendar className="text-gray-400" />
                                {scheduleText}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={deliveryInfo?.color}>{deliveryInfo?.icon}</span>
                                {deliveryInfo?.text}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={courseTypeInfo?.color}>{courseTypeInfo?.icon}</span>
                                {courseTypeInfo?.text}
                              </div>
                              {/* Show theory student discount info */}
                              {theoryStudentDiscount > 0 && (
                                <div className="flex items-center gap-1 text-blue-600 mt-1">
                                  <FaCheckCircle />
                                  <span className="text-xs font-semibold">{discountReason} Applied</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right mt-4 md:mt-0">
                        <div className="text-2xl font-bold text-gray-900">LKR {amount.toLocaleString()}</div>
                        {totalDiscount > 0 && (
                          <div className="text-sm text-green-600">
                            You save LKR {totalDiscount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    <div className="border-t pt-4 mb-6">
                      <h4 className="font-semibold mb-2">Price Breakdown</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Base Price:</span>
                          <span>LKR {price.toLocaleString()}</span>
                        </div>
                        {promoDiscount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Promo Discount:</span>
                            <span>-LKR {promoDiscount.toLocaleString()}</span>
                          </div>
                        )}
                        {theoryStudentDiscount > 0 && (
                          <div className="flex justify-between text-blue-600">
                            <span>Theory Student Discount:</span>
                            <span>-LKR {theoryStudentDiscount.toLocaleString()}</span>
                          </div>
                        )}
                        {speedPostFee > 0 && (
                          <div className="flex justify-between">
                            <span>Speed Post Fee:</span>
                            <span>LKR {speedPostFee.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="border-t pt-1 flex justify-between font-semibold">
                          <span>Total:</span>
                          <span>LKR {amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Student Information Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CustomTextField
                        id="studentId"
                        name="studentId"
                        type="text"
                        label="Student ID"
                        value={values.studentId}
                        onChange={() => {}}
                        error={undefined}
                        touched={false}
                        icon={FaUser}
                        readOnly
                      />
                      <CustomTextField
                        id="firstName"
                        name="firstName"
                        type="text"
                        label="First Name *"
                        value={values.firstName}
                        onChange={handleChange}
                        error={errors.firstName}
                        touched={touched.firstName}
                        icon={FaUser}
                      />
                      <CustomTextField
                        id="lastName"
                        name="lastName"
                        type="text"
                        label="Last Name *"
                        value={values.lastName}
                        onChange={handleChange}
                        error={errors.lastName}
                        touched={touched.lastName}
                        icon={FaUser}
                      />
                      <CustomTextField
                        id="mobile"
                        name="mobile"
                        type="tel"
                        label="Mobile Number *"
                        value={values.mobile}
                        onChange={handleChange}
                        error={errors.mobile}
                        touched={touched.mobile}
                        icon={FaPhone}
                      />
                      <CustomTextField
                        id="email"
                        name="email"
                        type="email"
                        label="Email Address *"
                        value={values.email}
                        onChange={handleChange}
                        error={errors.email}
                        touched={touched.email}
                        icon={FaEnvelope}
                      />

                      <CustomSelectField
                        id="medium"
                        name="medium"
                        label={cls?.classMedium === 'Both' ? "Choose Your Medium *" : "Class Medium *"}
                        value={cls?.classMedium === 'Both' ? values.medium : (cls?.classMedium || 'Sinhala')}
                        onChange={cls?.classMedium === 'Both' ? handleChange : () => {}} // Editable only if class medium is 'Both'
                        options={cls?.classMedium === 'Both' ? [
                          { value: 'Sinhala', label: 'Sinhala' },
                          { value: 'English', label: 'English' }
                        ] : mediumOptions}
                        error={errors.medium}
                        touched={touched.medium}
                        required
                        disabled={cls?.classMedium !== 'Both'}
                      />
                      {!isStudyPack && cls.enableTuteCollection && (
                        <>
                          <CustomSelectField
                            id="tuteType"
                            name="tuteType"
                            label={isTuteTypeReadOnly(cls) ? "Tute Collection Method *" : "Choose Tute Collection Method *"}
                            value={values.tuteType}
                            onChange={isTuteTypeReadOnly(cls) ? () => {} : handleChange}
                            options={getTuteTypeOptions(cls)}
                            error={errors.tuteType}
                            touched={touched.tuteType}
                            required
                            disabled={isTuteTypeReadOnly(cls)}
                          />
                          {(values.tuteType === 'Speed Post' || cls.tuteCollectionType === 'speed_post' || cls.tuteCollectionType === 'both') && (
                            <CustomTextField
                              id="address"
                              name="address"
                              type="text"
                              label="Address *"
                              value={values.address}
                              onChange={handleChange}
                              error={errors.address}
                              touched={touched.address}
                              icon={FaMapMarkerAlt}
                            />
                          )}
                        </>
                      )}
                    </div>

                    {/* Payment Method Selection */}
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">Payment Method</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {paymentMethods.map(method => (
                          <label
                            key={method.key}
                            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                              paymentMethod === method.key
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            <input
                              type="radio"
                              name="paymentMethod"
                              value={method.key}
                              checked={paymentMethod === method.key}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              className="mr-3"
                            />
                            <div className="flex items-center gap-3">
                              {method.icon}
                              <div>
                                <div className="font-medium">{method.label}</div>
                                <div className="text-sm text-gray-500">{method.sinhala}</div>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Promo Code Section */}
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">Promo Code (Optional)</h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter promo code"
                          value={promo}
                          onChange={(e) => setPromo(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleApplyPromo}
                          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                      {appliedPromo > 0 && (
                        <div className="mt-2 text-sm text-green-600">
                          Promo code applied! You save LKR {appliedPromo.toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="mt-6">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-6 bg-[#1a365d] text-white rounded-lg hover:bg-[#13294b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                      >
                        {loading ? 'Processing...' : isRenewal ? (
                          location.state?.gracePeriodExpired 
                            ? 'Renew Payment' 
                            : location.state?.daysRemaining <= 3 
                            ? 'Pay Early' 
                            : 'Renew for Next Month'
                        ) : 'Proceed to Payment'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Summary Card */}
                <div className="md:col-span-1">
                  <div className="bg-white rounded-xl shadow p-6 border sticky top-4">
                    <h3 className="text-lg font-semibold mb-4">
                      {isRenewal ? (
                        location.state?.gracePeriodExpired 
                          ? 'Renewal Summary' 
                          : location.state?.daysRemaining <= 3 
                          ? 'Early Payment Summary' 
                          : 'Next Month Renewal Summary'
                      ) : 'Order Summary'}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Class:</span>
                        <span className="font-medium">{isStudyPack ? cls.title : cls.className}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Subject:</span>
                        <span>{cls.subject}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Teacher:</span>
                        <span>{cls.teacher}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span>{isStudyPack ? 'Study Pack' : scheduleText}</span>
                      </div>
                      <div className="border-t pt-3">
                        <div className="flex justify-between font-semibold">
                          <span>Total Amount:</span>
                          <span className="text-lg">LKR {amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }}
        </BasicForm>
      </div>
    </DashboardLayout>
  );
};

export default Checkout; 
import React, { useState, useEffect } from 'react';
import { FaSpinner } from 'react-icons/fa';
import { MdPayment, MdReceipt, MdPersonAdd, MdClass, MdAttachMoney, MdDateRange, MdReceiptLong, MdEdit, MdDelete, MdCheckCircle, MdWarning, MdInfo, MdError, MdSuccess, MdPending, MdClose, MdSearch, MdRefresh, MdSchool, MdPerson, MdGroup, MdToday, MdArrowBack, MdPhone, MdEmail, MdLocationOn, MdBadge, MdTouchApp, MdList, MdQrCode, MdPrint, MdDownload } from 'react-icons/md';
import * as Yup from 'yup';
import Receipt from '../../../components/Receipt';
import BasicTable from '../../../components/BasicTable';
import StudentsPurchasedClasses from './StudentsPurchasedClasses';
import { getAllStudents } from '../../../api/auth';
import { getActiveClasses } from '../../../api/classes';

// Validation Schema
const validationSchema = Yup.object().shape({
  studentId: Yup.string().required('Student ID is required'),
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  email: Yup.string().email('Invalid email format').required('Email is required'),
  phone: Yup.string().required('Phone number is required'),
  classId: Yup.string().required('Class is required'),
  paymentMethod: Yup.string().required('Payment method is required'),
  amount: Yup.number().positive('Amount must be positive').required('Amount is required'),
  discount: Yup.number().min(0, 'Discount cannot be negative').max(100, 'Discount cannot exceed 100%'),
  speedPostFee: Yup.number().min(0, 'Speed post fee cannot be negative')
});

const PhysicalEnrollmentQuickAccess = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [quickStats, setQuickStats] = useState({
    totalEnrollments: 0,
    todayEnrollments: 0,
    pendingPayments: 0,
    totalRevenue: 0,
    totalStudents: 0,
    totalClasses: 0
  });

  // Enrollment System States
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [studentDetails, setStudentDetails] = useState(null);
  const [showStudentSearch, setShowStudentSearch] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [speedPostFee, setSpeedPostFee] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [currentPaymentData, setCurrentPaymentData] = useState(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadQuickStats();
    loadDataFromDatabase();
  }, []);

  // Filter students based on search term
  useEffect(() => {
    if (studentSearchTerm.trim() === '') {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(student =>
        student.studentId?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.firstName?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.lastName?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.phone?.includes(studentSearchTerm)
      );
      setFilteredStudents(filtered);
    }
  }, [studentSearchTerm, students]);

  const loadDataFromDatabase = async () => {
    try {
      // Load students from database
      const studentsResponse = await getAllStudents();
      if (studentsResponse.success) {
        const studentData = studentsResponse.students?.map(student => ({
          studentId: student.userid,
          firstName: student.firstName || '',
          lastName: student.lastName || '',
          email: student.email || '',
          phone: student.mobile || '',
          nic: student.nic || '',
          gender: student.gender || '',
          age: student.age || '',
          parentName: student.parentName || '',
          parentPhone: student.parentMobile || '',
          stream: student.stream || '',
          dateOfBirth: student.dateOfBirth || '',
          school: student.school || '',
          address: student.address || '',
          district: student.district || '',
          dateJoined: student.dateJoined || student.barcodeCreatedAt?.split(' ')[0] || '',
          barcodeData: student.barcodeData || '',
          created_at: student.barcodeCreatedAt || '',
          enrolledClasses: []
        })) || [];
        setStudents(studentData);
      }

      // Load classes from database
      const classesResponse = await getActiveClasses();
      if (classesResponse.success) {
        setAvailableClasses(classesResponse.data || []);
      }
    } catch (error) {
      console.error('Error loading data from database:', error);
    }
  };

  const loadQuickStats = async () => {
    try {
      setIsLoading(true);
      
      // Load students from database
      const studentsResponse = await getAllStudents();
      const totalStudents = studentsResponse.success ? (studentsResponse.students || []).length : 0;
      
      // Load classes from database
      const classesResponse = await getActiveClasses();
      const totalClasses = classesResponse.success ? (classesResponse.data || []).length : 0;
      
      // Load enrollment data from database
      const enrollmentsData = await fetchEnrollmentsFromDatabase();
      
      const today = new Date().toISOString().split('T')[0];
      
      const todayEnrollments = enrollmentsData.filter(enrollment => 
        enrollment.enrollment_date === today
      ).length;
      
      const pendingPayments = enrollmentsData.filter(enrollment => 
        enrollment.payment_status === 'pending'
      ).length;
      
      const totalRevenue = enrollmentsData.reduce((sum, enrollment) => 
        sum + (parseFloat(enrollment.amount_paid) || 0), 0
      );

      setQuickStats({
        totalEnrollments: enrollmentsData.length,
        todayEnrollments,
        pendingPayments,
        totalRevenue,
        totalStudents,
        totalClasses
      });
    } catch (error) {
      console.error('Error loading quick stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch enrollments from database
  const fetchEnrollmentsFromDatabase = async () => {
    try {
      // Get all students first
      const studentsResponse = await getAllStudents();
      const students = studentsResponse.success ? studentsResponse.students || [] : [];
      
      // Get all enrollments from database
      const enrollmentsResponse = await fetch('http://localhost:8087/routes.php/get_all_enrollments');
      if (enrollmentsResponse.ok) {
        const enrollmentsData = await enrollmentsResponse.json();
        return enrollmentsData.data || [];
      }
      
      // Fallback: fetch enrollments for each student
      const allEnrollments = [];
      for (const student of students) {
        try {
          const response = await fetch(`http://localhost:8087/routes.php/get_enrollments_by_student?studentId=${student.userid}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              allEnrollments.push(...result.data);
            }
          }
        } catch (error) {
          console.error(`Error fetching enrollments for student ${student.userid}:`, error);
        }
      }
      
      return allEnrollments;
    } catch (error) {
      console.error('Error fetching enrollments from database:', error);
      return [];
    }
  };

  // Handle student search input change
  const handleStudentSearchChange = (e) => {
    const value = e.target.value;
    setStudentSearchTerm(value);
    
    // If it looks like a student ID (exact match), search for it
    if (value.length >= 3) {
      const student = students.find(s => s.studentId === value);
      if (student) {
        setStudentDetails(student);
        setSelectedStudent(student);
        setShowStudentSearch(false);
      } else {
        setStudentDetails(null);
        setShowStudentSearch(true);
      }
    } else {
      setStudentDetails(null);
      setShowStudentSearch(false);
    }
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setStudentDetails(student);
    setShowStudentSearch(false);
  };

  const handleClassSelect = (cls) => {
    setSelectedClass(cls);
    setPaymentAmount(cls.fee || 0);
    setDiscount(0);
    setSpeedPostFee(0);
  };

  const calculateTotal = () => {
    const baseAmount = paymentAmount || 0;
    const discountAmount = (baseAmount * (discount || 0)) / 100;
    const finalAmount = baseAmount - discountAmount + (speedPostFee || 0);
    return Math.max(0, finalAmount);
  };

  const handleQuickEnrollment = () => {
    setSelectedStudent(null);
    setSelectedClass(null);
    setPaymentAmount(0);
    setDiscount(0);
    setSpeedPostFee(0);
    setPaymentMethod('cash');
    setStudentDetails(null);
    setStudentSearchTerm('');
    setShowEnrollmentModal(true);
  };

  const handleProceedToPayment = () => {
    if (!selectedStudent || !selectedClass) {
      alert('Please select both student and class');
      return;
    }
    setShowEnrollmentModal(false);
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async () => {
    setProcessingPayment(true);
    
    try {
      const totalAmount = calculateTotal();
      const transactionId = `TXN${Date.now()}`;
      const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Step 1: Create payment record in the database
      const paymentResponse = await fetch('http://localhost:8090/routes.php/create_payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: selectedStudent.studentId,
          classId: selectedClass.id,
          amount: totalAmount,
          paymentMethod: paymentMethod,
          transactionId: transactionId
        })
      });

      if (!paymentResponse.ok) {
        throw new Error('Failed to create payment record');
      }

      const paymentResult = await paymentResponse.json();
      console.log('Payment created:', paymentResult);

      // Step 2: Create enrollment record in the database
      const enrollmentResponse = await fetch('http://localhost:8087/routes.php/create_enrollment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          class_id: selectedClass.id,
          student_id: selectedStudent.studentId,
          student_name: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
          enrollment_date: (() => {
            const now = new Date();
            // Use local date instead of UTC date
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`; // Current local date in YYYY-MM-DD format
          })(),
          status: 'enrolled',
          payment_status: 'paid',
          payment_method: paymentMethod,
          amount_paid: totalAmount,
          next_payment_date: (() => {
            const now = new Date();
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            // Use local date instead of UTC date
            const year = nextMonth.getFullYear();
            const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
            const day = String(nextMonth.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`; // 1st of next month in local time
          })()
        })
      });

      if (!enrollmentResponse.ok) {
        throw new Error('Failed to create enrollment record');
      }

      const enrollmentResult = await enrollmentResponse.json();
      console.log('Enrollment created:', enrollmentResult);

      // Step 3: Verify the enrollment was saved correctly
      const verifyResponse = await fetch(`http://localhost:8087/routes.php/get_enrollments_by_student?studentId=${selectedStudent.studentId}`);
      if (verifyResponse.ok) {
        const verifyResult = await verifyResponse.json();
        console.log('Verification - Student enrollments:', verifyResult);
      }

      // Step 4: Update localStorage for frontend display (optional)
      const existingPurchasedClasses = JSON.parse(localStorage.getItem('purchasedClasses') || '[]');
      const newEnrollment = {
        id: Date.now(),
        studentId: selectedStudent.studentId,
        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        classId: selectedClass.id,
        className: selectedClass.className,
        subject: selectedClass.subject,
        teacher: selectedClass.teacher,
        stream: selectedClass.stream,
        courseType: selectedClass.courseType,
        amount: totalAmount,
        paymentMethod: paymentMethod,
        paymentStatus: 'Paid',
        purchaseDate: new Date().toISOString().split('T')[0],
        transactionId: transactionId,
        receiptNumber: receiptNumber
      };
      
      existingPurchasedClasses.push(newEnrollment);
      localStorage.setItem('purchasedClasses', JSON.stringify(existingPurchasedClasses));
      
      // Create payment data for receipt
      const paymentData = {
        transactionId: transactionId,
        invoiceId: transactionId,
        date: new Date().toLocaleDateString(),
        paymentMethod: paymentMethod,
        firstName: selectedStudent.firstName,
        lastName: selectedStudent.lastName,
        email: selectedStudent.email,
        phone: selectedStudent.phone,
        className: selectedClass.className,
        subject: selectedClass.subject,
        teacher: selectedClass.teacher,
        stream: selectedClass.stream,
        courseType: selectedClass.courseType,
        basePrice: paymentAmount,
        discount: discount,
        speedPostFee: speedPostFee,
        amount: totalAmount
      };
      
      setCurrentPaymentData(paymentData);
      setShowPaymentModal(false);
      setShowReceiptModal(true);
      
      // Show success message with details about where data is saved
      setSuccessMessage(`✅ Enrollment successful! 

📊 Data saved to:
• Database: Payment & enrollment records
• Local storage: Frontend display data
• Receipt: Generated for printing

👤 Student: ${selectedStudent.firstName} ${selectedStudent.lastName} (${selectedStudent.studentId})
📚 Class: ${selectedClass.className} - ${selectedClass.subject}
💰 Amount: LKR ${totalAmount.toLocaleString()}
💳 Payment: ${paymentMethod.toUpperCase()}
🆔 Transaction: ${transactionId}

You can view this enrollment in the "View All Enrollments" section.`);
      setShowSuccessAlert(true);
      
      // Refresh quick stats
      loadQuickStats();
      
    } catch (error) {
      console.error('Payment processing error:', error);
      alert(`Payment processing failed: ${error.message}. Please try again.`);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleViewEnrollments = () => {
    setCurrentView('enrollments');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  if (currentView === 'enrollment') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBackToDashboard}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <MdArrowBack />
                  Back to Dashboard
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <h1 className="text-xl font-semibold text-gray-900">Physical Enrollment System</h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date().toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
        <StudentsPurchasedClasses />
      </div>
    );
  }

  if (currentView === 'enrollments') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBackToDashboard}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <MdArrowBack />
                  Back to Dashboard
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <h1 className="text-xl font-semibold text-gray-900">Enrollment Management</h1>
              </div>
            </div>
          </div>
        </div>
        <StudentsPurchasedClasses />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <MdSchool className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Class Management System</h1>
                <p className="text-gray-600">Physical Location - Quick Access</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-sm text-gray-500">Current Time</div>
                <div className="text-lg font-semibold text-gray-900">
                  {new Date().toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Today's Date</div>
                <div className="text-lg font-semibold text-gray-900">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-3xl font-bold text-blue-600">{quickStats.totalStudents}</p>
              </div>
              <div className="p-4 bg-blue-100 rounded-xl">
                <MdPerson className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Classes</p>
                <p className="text-3xl font-bold text-green-600">{quickStats.totalClasses}</p>
              </div>
              <div className="p-4 bg-green-100 rounded-xl">
                <MdClass className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Enrollments</p>
                <p className="text-3xl font-bold text-purple-600">{quickStats.totalEnrollments}</p>
              </div>
              <div className="p-4 bg-purple-100 rounded-xl">
                <MdGroup className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Enrollments</p>
                <p className="text-3xl font-bold text-orange-600">{quickStats.todayEnrollments}</p>
              </div>
              <div className="p-4 bg-orange-100 rounded-xl">
                <MdToday className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                <p className="text-3xl font-bold text-yellow-600">{quickStats.pendingPayments}</p>
              </div>
              <div className="p-4 bg-yellow-100 rounded-xl">
                <MdPending className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-red-600">
                  LKR {quickStats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-red-100 rounded-xl">
                <MdAttachMoney className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Enrollment */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                  <MdPersonAdd className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Quick Enrollment</h2>
                  <p className="text-blue-100">Enroll new students with payment processing</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <MdCheckCircle className="w-5 h-5 text-green-500" />
                  <span>Student registration & verification</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <MdCheckCircle className="w-5 h-5 text-green-500" />
                  <span>Class selection & scheduling</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <MdCheckCircle className="w-5 h-5 text-green-500" />
                  <span>Payment processing & receipt generation</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <MdCheckCircle className="w-5 h-5 text-green-500" />
                  <span>Instant enrollment confirmation</span>
                </div>
              </div>
              <button
                onClick={handleQuickEnrollment}
                className="w-full mt-6 bg-blue-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-3"
              >
                <MdTouchApp className="w-6 h-6" />
                Start Quick Enrollment
              </button>
            </div>
          </div>

          {/* Enrollment Management */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                  <MdList className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Enrollment Management</h2>
                  <p className="text-green-100">View and manage all student enrollments</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <MdCheckCircle className="w-5 h-5 text-green-500" />
                  <span>View all enrollment records</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <MdCheckCircle className="w-5 h-5 text-green-500" />
                  <span>Edit enrollment details</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <MdCheckCircle className="w-5 h-5 text-green-500" />
                  <span>Generate receipts & reports</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <MdCheckCircle className="w-5 h-5 text-green-500" />
                  <span>Payment status tracking</span>
                </div>
              </div>
              <button
                onClick={handleViewEnrollments}
                className="w-full mt-6 bg-green-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-3"
              >
                <MdList className="w-6 h-6" />
                View All Enrollments
              </button>
            </div>
          </div>
        </div>

        {/* Additional Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <MdQrCode className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">QR Code Scanner</h3>
                <p className="text-sm text-gray-600">Quick student identification</p>
              </div>
            </div>
            <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
              Scan QR Code
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <MdReceipt className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Print Receipt</h3>
                <p className="text-sm text-gray-600">Generate payment receipts</p>
              </div>
            </div>
            <button className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors">
              Print Receipt
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <MdRefresh className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Refresh Data</h3>
                <p className="text-sm text-gray-600">Update system data</p>
              </div>
            </div>
            <button 
              onClick={loadQuickStats}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
            >
              Refresh Now
            </button>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MdInfo className="w-5 h-5 text-blue-600" />
            System Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Database: Online</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Payment Gateway: Active</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Printer: Connected</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Network: Stable</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enrollment Modal */}
      {showEnrollmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">
                  New Student Enrollment
                </h2>
                <button
                  onClick={() => setShowEnrollmentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <MdClose className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Student Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <MdPerson />
                    Student Information
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search Student by ID
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Enter Student ID (e.g., S020)..."
                          value={studentSearchTerm}
                          onChange={handleStudentSearchChange}
                          onFocus={() => setShowStudentSearch(true)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <MdSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      </div>
                      
                      {showStudentSearch && filteredStudents.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredStudents.map((student) => (
                            <div
                              key={student.studentId}
                              onClick={() => handleStudentSelect(student)}
                              className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium">{student.firstName} {student.lastName}</div>
                              <div className="text-sm text-gray-500">
                                {student.studentId} • {student.email} • {student.phone}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Student Details Display */}
                    {studentDetails && (
                      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                              <MdPerson className="w-5 h-5" />
                              Personal Information
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <MdBadge className="text-blue-600" />
                                <span className="font-medium">ID:</span>
                                <span>{studentDetails.studentId}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MdPerson className="text-blue-600" />
                                <span className="font-medium">Name:</span>
                                <span>{studentDetails.firstName} {studentDetails.lastName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MdEmail className="text-blue-600" />
                                <span className="font-medium">Email:</span>
                                <span>{studentDetails.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MdPhone className="text-blue-600" />
                                <span className="font-medium">Phone:</span>
                                <span>{studentDetails.phone}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MdLocationOn className="text-blue-600" />
                                <span className="font-medium">Date of Birth:</span>
                                <span>{studentDetails.dateOfBirth}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Gender:</span>
                                <span>{studentDetails.gender}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                              <MdSchool className="w-5 h-5" />
                              Academic Information
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <MdSchool className="text-blue-600" />
                                <span className="font-medium">School:</span>
                                <span>{studentDetails.school}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Stream:</span>
                                <span>{studentDetails.stream}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MdLocationOn className="text-blue-600" />
                                <span className="font-medium">District:</span>
                                <span>{studentDetails.district}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Address:</span>
                                <span>{studentDetails.address}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MdLocationOn className="text-blue-600" />
                                <span className="font-medium">Date Joined:</span>
                                <span>{studentDetails.dateJoined}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Class Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <MdClass />
                    Class Selection
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Available Classes
                      </label>
                      <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg">
                        {availableClasses.map((cls) => (
                          <div
                            key={cls.id}
                            onClick={() => handleClassSelect(cls)}
                            className={`p-4 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                              selectedClass?.id === cls.id ? 'bg-blue-50 border-blue-200' : ''
                            }`}
                          >
                            <div className="font-medium">{cls.className}</div>
                            <div className="text-sm text-gray-600">
                              {cls.subject} • {cls.teacher}
                            </div>
                            <div className="text-sm text-gray-500">
                              {cls.stream} • {cls.courseType}
                            </div>
                            <div className="text-sm font-medium text-green-600">
                              LKR {cls.fee?.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedClass && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="flex items-center gap-3">
                          <MdClass className="w-8 h-8 text-green-600" />
                          <div>
                            <div className="font-medium text-green-900">
                              {selectedClass.className}
                            </div>
                            <div className="text-sm text-green-700">
                              {selectedClass.subject} • {selectedClass.teacher}
                            </div>
                            <div className="text-sm text-green-600">
                              {selectedClass.stream} • {selectedClass.courseType}
                            </div>
                            <div className="text-lg font-bold text-green-800">
                              LKR {selectedClass.fee?.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
                <button
                  onClick={() => setShowEnrollmentModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProceedToPayment}
                  disabled={!selectedStudent || !selectedClass}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Proceed to Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <MdPayment />
                Payment Processing
              </h2>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Student and Class Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Student</h4>
                    <p className="text-blue-700">{selectedStudent?.firstName} {selectedStudent?.lastName}</p>
                    <p className="text-sm text-blue-600">{selectedStudent?.studentId}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Class</h4>
                    <p className="text-green-700">{selectedClass?.className}</p>
                    <p className="text-sm text-green-600">{selectedClass?.subject}</p>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base Amount
                    </label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Discount (%)
                      </label>
                      <input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Speed Post Fee
                      </label>
                      <input
                        type="number"
                        value={speedPostFee}
                        onChange={(e) => setSpeedPostFee(parseFloat(e.target.value) || 0)}
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Credit/Debit Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="online">Online Payment</option>
                    </select>
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Payment Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Base Amount:</span>
                      <span>LKR {paymentAmount?.toLocaleString()}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({discount}%):</span>
                        <span>- LKR {((paymentAmount * discount) / 100).toLocaleString()}</span>
                      </div>
                    )}
                    {speedPostFee > 0 && (
                      <div className="flex justify-between">
                        <span>Speed Post Fee:</span>
                        <span>LKR {speedPostFee?.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total Amount:</span>
                        <span>LKR {calculateTotal().toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProcessPayment}
                  disabled={processingPayment || calculateTotal() <= 0}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {processingPayment ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <MdPayment />
                      Process Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && currentPaymentData && (
        <Receipt
          paymentData={currentPaymentData}
          onClose={() => setShowReceiptModal(false)}
        />
      )}

      {/* Success Alert */}
      {showSuccessAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <MdCheckCircle className="w-8 h-8 text-green-600" />
              <h3 className="text-xl font-semibold text-gray-900">Enrollment Successful!</h3>
            </div>
            
            <div className="space-y-4 text-sm">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-900 mb-2">📊 Data Saved Successfully</h4>
                <div className="space-y-2 text-green-800">
                  <div className="flex items-center gap-2">
                    <MdCheckCircle className="w-4 h-4" />
                    <span>Database: Payment & enrollment records</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MdCheckCircle className="w-4 h-4" />
                    <span>Local storage: Frontend display data</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MdCheckCircle className="w-4 h-4" />
                    <span>Receipt: Generated for printing</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">👤 Student Information</h4>
                <div className="grid grid-cols-2 gap-2 text-blue-800">
                  <div><strong>Name:</strong> {selectedStudent?.firstName} {selectedStudent?.lastName}</div>
                  <div><strong>ID:</strong> {selectedStudent?.studentId}</div>
                  <div><strong>Email:</strong> {selectedStudent?.email}</div>
                  <div><strong>Phone:</strong> {selectedStudent?.phone}</div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-2">📚 Class Information</h4>
                <div className="grid grid-cols-2 gap-2 text-purple-800">
                  <div><strong>Class:</strong> {selectedClass?.className}</div>
                  <div><strong>Subject:</strong> {selectedClass?.subject}</div>
                  <div><strong>Teacher:</strong> {selectedClass?.teacher}</div>
                  <div><strong>Stream:</strong> {selectedClass?.stream}</div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h4 className="font-semibold text-orange-900 mb-2">💰 Payment Details</h4>
                <div className="grid grid-cols-2 gap-2 text-orange-800">
                  <div><strong>Amount:</strong> LKR {currentPaymentData?.amount?.toLocaleString()}</div>
                  <div><strong>Method:</strong> {currentPaymentData?.paymentMethod?.toUpperCase()}</div>
                  <div><strong>Transaction ID:</strong> {currentPaymentData?.transactionId}</div>
                  <div><strong>Date:</strong> {currentPaymentData?.date}</div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">📍 Where to Find This Data</h4>
                <div className="space-y-2 text-gray-700">
                  <div className="flex items-center gap-2">
                    <MdList className="w-4 h-4" />
                    <span>View All Enrollments: See in enrollment management</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MdReceipt className="w-4 h-4" />
                    <span>Receipt: Print/download from receipt modal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MdRefresh className="w-4 h-4" />
                    <span>Dashboard: Stats updated automatically</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowSuccessAlert(false);
                  setShowEnrollmentModal(false);
                  setSelectedStudent(null);
                  setSelectedClass(null);
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Close & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhysicalEnrollmentQuickAccess; 
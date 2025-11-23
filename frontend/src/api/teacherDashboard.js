import axios from 'axios';
import { getUserData, handleApiError } from './apiUtils';
import { getClassesByTeacher } from './classes';
import { getClassEnrollments } from './enrollments';
import { getAllStudents } from './students';
import { getClassAttendance } from './attendance';
import { examAPI, markAPI } from './Examapi';

const PAYMENT_API_BASE_URL = 'http://localhost:8090/routes.php';

/**
 * Get comprehensive teacher dashboard analytics
 */
export const getTeacherDashboardAnalytics = async () => {
  try {
    const teacherData = getUserData();
    const teacherId = teacherData?.teacherId || teacherData?.id || teacherData?.userid;

    if (!teacherId) {
      throw new Error('Teacher information not found');
    }

    // Fetch all data in parallel
    const [classesResponse, studentsResponse, paymentsResponse] = await Promise.allSettled([
      getClassesByTeacher(teacherId),
      getAllStudents(),
      axios.get(`${PAYMENT_API_BASE_URL}/get_all_payments`)
    ]);

    // Process classes data
    const classes = classesResponse.status === 'fulfilled' && classesResponse.value.success
      ? classesResponse.value.data || []
      : [];

    // Process students data
    const students = studentsResponse.status === 'fulfilled'
      ? (Array.isArray(studentsResponse.value) ? studentsResponse.value : studentsResponse.value?.students || [])
      : [];

    // Process payments data
    const payments = paymentsResponse.status === 'fulfilled' && paymentsResponse.value.data?.success
      ? paymentsResponse.value.data.data || []
      : [];

    // Get enrollments for each class
    const enrollmentPromises = classes.map(cls => 
      getClassEnrollments(cls.id).catch(() => ({ success: false, data: [] }))
    );
    const enrollmentResults = await Promise.all(enrollmentPromises);

    // Combine class data with enrollments
    const classesWithEnrollments = classes.map((cls, index) => ({
      ...cls,
      enrollments: enrollmentResults[index]?.success ? enrollmentResults[index].data : []
    }));

    // Calculate analytics
    const analytics = {
      metrics: calculateMetrics(classesWithEnrollments, payments),
      todaySchedule: getTodaySchedule(classesWithEnrollments),
      revenueData: calculateRevenueData(payments, classesWithEnrollments),
      revenueVsClassesData: calculateRevenueVsClassesData(payments, classesWithEnrollments),
      enrollmentData: calculateEnrollmentData(classesWithEnrollments, students),
      paymentDistribution: calculatePaymentDistribution(classesWithEnrollments, payments),
      recentActivities: getRecentActivities(payments, classesWithEnrollments, students),
      alerts: generateAlerts(classesWithEnrollments, payments),
      attendanceRate: calculateAttendanceRate(classesWithEnrollments),
      topPerformers: await getTopPerformers(students, classesWithEnrollments),
      upcomingDeadlines: getUpcomingDeadlines(classesWithEnrollments)
    };

    return {
      success: true,
      data: analytics,
      rawData: {
        classes: classesWithEnrollments,
        students,
        payments
      }
    };

  } catch (error) {
    console.error('Error fetching teacher dashboard analytics:', error);
    return handleApiError(error);
  }
};

/**
 * Calculate key metrics
 */
const calculateMetrics = (classes, payments) => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  // Get previous month
  const previousDate = new Date(currentYear, currentMonth - 2, 1);
  const previousMonth = previousDate.getMonth() + 1;
  const previousYear = previousDate.getFullYear();
  
  // Active classes
  const activeClasses = classes.filter(c => c.status === 'active').length;
  
  // Total students
  const totalStudents = classes.reduce((sum, cls) => sum + (cls.enrollments?.length || 0), 0);
  
  // This month's revenue
  let thisMonthRevenue = 0;
  let thisMonthCash = 0;
  let thisMonthOnline = 0;
  
  payments.forEach(payment => {
    if (payment.date) {
      const paymentDate = new Date(payment.date);
      if (paymentDate.getMonth() + 1 === currentMonth && paymentDate.getFullYear() === currentYear) {
        const amount = parseFloat(payment.amount || 0);
        thisMonthRevenue += amount;
        
        if (payment.payment_method?.toLowerCase() === 'cash') {
          thisMonthCash += amount;
        } else {
          thisMonthOnline += amount;
        }
      }
    }
  });
  
  // Last month's revenue
  let lastMonthRevenue = 0;
  let lastMonthCash = 0;
  let lastMonthOnline = 0;
  
  payments.forEach(payment => {
    if (payment.date) {
      const paymentDate = new Date(payment.date);
      if (paymentDate.getMonth() + 1 === previousMonth && paymentDate.getFullYear() === previousYear) {
        const amount = parseFloat(payment.amount || 0);
        lastMonthRevenue += amount;
        
        if (payment.payment_method?.toLowerCase() === 'cash') {
          lastMonthCash += amount;
        } else {
          lastMonthOnline += amount;
        }
      }
    }
  });
  
  // Pending payments
  const pendingPayments = classes.reduce((sum, cls) => {
    const pending = cls.enrollments?.filter(e => e.payment_status === 'pending').length || 0;
    return sum + pending;
  }, 0);
  
  // Today's classes
  const today = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  const todayClasses = classes.filter(cls => {
    const scheduleDay = cls.schedule_day || cls.schedule?.day;
    return scheduleDay === today && cls.status === 'active';
  }).length;

  return {
    activeClasses,
    totalStudents,
    thisMonthRevenue,
    thisMonthCash,
    thisMonthOnline,
    lastMonthRevenue,
    lastMonthCash,
    lastMonthOnline,
    pendingPayments,
    todayClasses,
    totalClasses: classes.length
  };
};

/**
 * Get today's schedule
 */
const getTodaySchedule = (classes) => {
  const currentDate = new Date();
  const today = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  const currentTime = currentDate.getHours() * 60 + currentDate.getMinutes();
  
  const todayClasses = classes.filter(cls => {
    const scheduleDay = cls.schedule_day || cls.schedule?.day;
    return scheduleDay === today && cls.status === 'active';
  }).map(cls => {
    const startTime = cls.schedule_start_time || cls.schedule?.startTime || '';
    const endTime = cls.schedule_end_time || cls.schedule?.endTime || '';
    
    // Parse time
    let startMinutes = 0;
    let endMinutes = 0;
    
    if (startTime) {
      const [hours, minutes] = startTime.split(':').map(Number);
      startMinutes = hours * 60 + (minutes || 0);
    }
    
    if (endTime) {
      const [hours, minutes] = endTime.split(':').map(Number);
      endMinutes = hours * 60 + (minutes || 0);
    }
    
    // Determine status
    let status = 'upcoming';
    if (currentTime >= endMinutes) {
      status = 'completed';
    } else if (currentTime >= startMinutes && currentTime < endMinutes) {
      status = 'in-progress';
    }
    
    return {
      ...cls,
      startTime,
      endTime,
      status,
      formattedStartTime: formatTime(startTime),
      formattedEndTime: formatTime(endTime)
    };
  }).sort((a, b) => {
    const aTime = a.startTime || '';
    const bTime = b.startTime || '';
    return aTime.localeCompare(bTime);
  });
  
  return todayClasses;
};

/**
 * Calculate revenue data for chart (last 12 months)
 */
const calculateRevenueData = (payments, classes) => {
  const months = [];
  const currentDate = new Date();
  
  // Generate last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    let totalRevenue = 0;
    
    payments.forEach(payment => {
      if (payment.date) {
        const paymentDate = new Date(payment.date);
        if (paymentDate.getMonth() + 1 === month && paymentDate.getFullYear() === year) {
          totalRevenue += parseFloat(payment.amount || 0);
        }
      }
    });
    
    months.push({
      month: monthName,
      totalRevenue
    });
  }
  
  return months;
};

/**
 * Calculate revenue vs classes data for chart (last 12 months)
 * Returns data structured for individual class bars
 */
const calculateRevenueVsClassesData = (payments, classes) => {
  const data = [];
  const currentDate = new Date();
  
  // Get all active classes
  const activeClasses = classes.filter(cls => cls.status === 'active');
  
  // Debug: Log class and payment structure
  console.log('=== Revenue by Class Debug ===');
  console.log('Active Classes:', activeClasses.length);
  if (activeClasses.length > 0) {
    console.log('Sample Class:', activeClasses[0]);
  }
  console.log('Total Payments:', payments.length);
  if (payments.length > 0) {
    console.log('Sample Payment:', payments[0]);
  }
  
  // For each class, create data points for last 12 months
  activeClasses.forEach(cls => {
    const className = cls.class_name || cls.name || cls.className || 'Unnamed Class';
    const classLabel = cls.grade && cls.subject 
      ? `${className} - Grade ${cls.grade} - ${cls.subject}`
      : cls.grade 
        ? `${className} - Grade ${cls.grade}`
        : cls.subject
          ? `${className} - ${cls.subject}`
          : className;
    
    console.log(`Processing class: ${className} (ID: ${cls.id})`);
    
    // Generate last 12 months for this class
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      // Check if class was active in this month
      let isActive = true;
      if (cls.created_at) {
        const createdDate = new Date(cls.created_at);
        const targetDate = new Date(year, month - 1, 1);
        if (createdDate > targetDate) {
          isActive = false;
        }
      }
      
      let classRevenue = 0;
      
      // Calculate revenue for this class in this month
      if (isActive) {
        payments.forEach(payment => {
          // Try multiple possible field names for class_id
          const paymentClassId = payment.class_id || payment.classId || payment.class_ID;
          
          if (paymentClassId == cls.id && payment.date) { // Use == to handle string/number mismatch
            const paymentDate = new Date(payment.date);
            if (paymentDate.getMonth() + 1 === month && paymentDate.getFullYear() === year) {
              classRevenue += parseFloat(payment.amount || 0);
            }
          }
        });
      }
      
      if (classRevenue > 0) {
        console.log(`  ${monthName}: Rs. ${classRevenue}`);
      }
      
      data.push({
        month: monthName,
        className: classLabel,
        classShortName: className,
        revenue: classRevenue,
        grade: cls.grade || '',
        subject: cls.subject || '',
        isActive: isActive
      });
    }
  });
  
  console.log('Total data points generated:', data.length);
  console.log('=== End Debug ===');
  
  return data;
};

/**
 * Calculate enrollment data (last 6 months)
 * Only uses real enrollment data - requires enrollment_date field
 */
const calculateEnrollmentData = (classes, students) => {
  const months = [];
  const currentDate = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    // Count actual enrollments for this month if enrollment_date exists
    let enrollmentCount = 0;
    let newStudentCount = 0;
    
    classes.forEach(cls => {
      if (cls.enrollments && Array.isArray(cls.enrollments)) {
        cls.enrollments.forEach(enrollment => {
          // Check if enrollment has a date field (enrollment_date, created_at, etc.)
          const enrollDate = enrollment.enrollment_date || enrollment.created_at || enrollment.date;
          
          if (enrollDate) {
            const eDate = new Date(enrollDate);
            if (eDate.getMonth() + 1 === month && eDate.getFullYear() === year) {
              enrollmentCount++;
              newStudentCount++;
            }
          }
        });
      }
    });
    
    // If no enrollment dates available, use current total but don't simulate growth
    if (enrollmentCount === 0 && i === 0) {
      // For current month, show actual current enrollments
      classes.forEach(cls => {
        if (cls.enrollments) {
          enrollmentCount += cls.enrollments.length;
        }
      });
    }
    
    months.push({
      month: monthName,
      enrollments: enrollmentCount,
      newStudents: newStudentCount
    });
  }
  
  return months;
};

/**
 * Calculate payment distribution
 */
/**
 * Calculate payment distribution (Current Month Only)
 */
const calculatePaymentDistribution = (classes, payments) => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  console.log('=== Payment Distribution Debug ===');
  console.log('Current month:', currentMonth, 'Year:', currentYear);
  
  // Filter payments for current month
  const currentMonthPayments = payments.filter(payment => {
    if (!payment.date) return false;
    const paymentDate = new Date(payment.date);
    const isCurrentMonth = paymentDate.getMonth() + 1 === currentMonth && paymentDate.getFullYear() === currentYear;
    return isCurrentMonth;
  });
  
  console.log('Total payments this month:', currentMonthPayments.length);
  if (currentMonthPayments.length > 0) {
    console.log('Sample payment:', currentMonthPayments[0]);
  }
  
  // Get all enrolled students for active classes
  const enrolledStudents = new Set();
  const enrollmentMap = {}; // Map student_id to enrollment details
  
  classes.forEach(cls => {
    if (cls.status === 'active') {
      cls.enrollments?.forEach(enrollment => {
        if (enrollment.status === 'active') {
          const studentId = enrollment.student_id || enrollment.user_id || enrollment.userid;
          if (studentId) {
            enrolledStudents.add(studentId);
            enrollmentMap[studentId] = enrollment;
          }
        }
      });
    }
  });
  
  console.log('Total enrolled students:', enrolledStudents.size);
  console.log('Enrolled student IDs:', Array.from(enrolledStudents));
  
  // Get students who paid this month - check multiple possible ID fields
  const paidStudentIds = new Set();
  currentMonthPayments.forEach(payment => {
    const studentId = payment.student_id || payment.user_id || payment.userid;
    if (studentId) {
      paidStudentIds.add(studentId);
    }
  });
  
  console.log('Students who paid this month:', paidStudentIds.size);
  console.log('Paid student IDs:', Array.from(paidStudentIds));
  
  // Count only enrolled students who paid
  const paidEnrolledCount = Array.from(paidStudentIds).filter(id => enrolledStudents.has(id)).length;
  const totalEnrolled = enrolledStudents.size;
  const pendingCount = Math.max(0, totalEnrolled - paidEnrolledCount); // Ensure non-negative
  
  console.log('Paid enrolled students:', paidEnrolledCount);
  console.log('Pending payments:', pendingCount);
  
  // Calculate collection rate (cap at 100%)
  const collectionRate = totalEnrolled > 0 
    ? Math.min(100, Math.round((paidEnrolledCount / totalEnrolled) * 100))
    : 0;
  
  console.log('Collection rate:', collectionRate + '%');
  
  return {
    paid: paidEnrolledCount,
    pending: pendingCount,
    total: totalEnrolled,
    collectionRate: collectionRate,
    data: [
      { name: 'Paid Students', value: paidEnrolledCount, color: '#10b981' },
      { name: 'Pending Payments', value: pendingCount, color: '#f59e0b' }
    ]
  };
};

/**
 * Get recent activities
 */
const getRecentActivities = (payments, classes, students) => {
  const activities = [];
  
  // Recent payments
  const recentPayments = payments
    .filter(p => p.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
  
  recentPayments.forEach(payment => {
    const student = students.find(s => s.user_id === payment.user_id);
    const cls = classes.find(c => c.id === payment.class_id);
    
    activities.push({
      type: 'payment',
      icon: '💰',
      title: 'Payment Received',
      description: `${student?.name || 'Student'} paid Rs. ${payment.amount} for ${cls?.className || 'class'}`,
      timestamp: payment.date,
      color: 'green'
    });
  });
  
  // Recent enrollments (last 3)
  classes.slice(0, 3).forEach(cls => {
    if (cls.enrollments && cls.enrollments.length > 0) {
      activities.push({
        type: 'enrollment',
        icon: '🎓',
        title: 'New Enrollment',
        description: `${cls.enrollments.length} students enrolled in ${cls.className}`,
        timestamp: cls.startDate,
        color: 'blue'
      });
    }
  });
  
  // Sort by timestamp
  return activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);
};

/**
 * Generate alerts based on real data only
 */
const generateAlerts = (classes, payments) => {
  const alerts = [];
  
  // Pending payments alert (REAL DATA)
  const pendingCount = classes.reduce((sum, cls) => {
    return sum + (cls.enrollments?.filter(e => e.payment_status === 'pending').length || 0);
  }, 0);
  
  if (pendingCount > 0) {
    alerts.push({
      type: 'warning',
      icon: '💳',
      title: 'Pending Payments',
      message: `${pendingCount} student${pendingCount > 1 ? 's have' : ' has'} pending payments`,
      action: 'View Payments'
    });
  }
  
  // Upcoming class alert (REAL DATA)
  const todayClasses = getTodaySchedule(classes);
  const upcomingClass = todayClasses.find(c => c.status === 'upcoming');
  
  if (upcomingClass) {
    alerts.push({
      type: 'info',
      icon: '🔔',
      title: 'Upcoming Class',
      message: `${upcomingClass.className} starts at ${upcomingClass.formattedStartTime}`,
      action: 'View Schedule'
    });
  }
  
  // Classes happening now (REAL DATA)
  const inProgressClass = todayClasses.find(c => c.status === 'in-progress');
  
  if (inProgressClass) {
    alerts.push({
      type: 'info',
      icon: '🎓',
      title: 'Class In Progress',
      message: `${inProgressClass.className} is currently in session`,
      action: 'Join Class'
    });
  }
  
  // Note: Attendance-based alerts removed until attendance API is integrated
  
  return alerts.slice(0, 5);
};

/**
 * Calculate attendance rate
 * Returns null if no attendance data available
 * TODO: Integrate with actual attendance API when available
 */
const calculateAttendanceRate = (classes) => {
  // Return null to indicate no real data available yet
  // When attendance API is ready, implement real calculation:
  // const attendanceRecords = await getAttendanceByTeacher(teacherId);
  // return (totalPresent / totalExpected) * 100;
  
  return null; // Will show "No data" in UI
};

/**
 * Get top performers based on actual exam results
 * Shows top performer per exam
 */
const getTopPerformers = async (students, classes) => {
  try {
    console.log('🎓 Fetching Top Performers from Exam API');
    console.log('Students available:', students?.length || 0);
    
    if (!students || students.length === 0) {
      console.log('⚠️ No students found');
      return [];
    }

    // Fetch all exams
    const examsResponse = await examAPI.getAll();
    const exams = examsResponse.data || [];
    
    console.log('📚 Exams found:', exams.length);
    
    if (exams.length === 0) {
      console.log('⚠️ No exams found');
      return [];
    }

    // Store top performer for each exam
    const topPerformersByExam = [];
    
    // For each exam, find the top performer
    for (const exam of exams) {
      const examId = exam.id || exam.exam_id;
      const examTitle = exam.title || exam.exam_title || exam.name || `Exam ${examId}`;
      
      console.log(`\n� Processing Exam: "${examTitle}" (ID: ${examId})`);
      
      // Get all students' marks for this exam
      const studentScores = [];
      
      for (const student of students) {
        const studentId = student.user_id || student.student_id || student.id;
        const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 
                          student.name || student.student_name || `Student ${studentId}`;
        
        try {
          // Fetch marks for this student
          const marksResponse = await markAPI.getByStudent(studentId);
          const allMarks = marksResponse.data || [];
          
          // Filter marks for this specific exam
          const examMarks = allMarks.filter(mark => 
            (mark.exam_id || mark.examId) == examId
          );
          
          if (examMarks.length > 0) {
            // Calculate total for this exam
            let totalScore = 0;
            let totalMaxMarks = 0;
            
            examMarks.forEach(mark => {
              const score = parseFloat(mark.score_awarded || mark.marks_obtained || mark.score || 0);
              const maxMarks = parseFloat(mark.max_marks || mark.maximum_marks || mark.total_marks || 0);
              
              totalScore += score;
              totalMaxMarks += maxMarks;
            });
            
            if (totalMaxMarks > 0) {
              const percentage = Math.round((totalScore / totalMaxMarks) * 100);
              
              studentScores.push({
                studentId: studentId,
                studentName: studentName,
                totalScore: totalScore,
                maxMarks: totalMaxMarks,
                percentage: percentage,
                examId: examId,
                examTitle: examTitle
              });
              
              console.log(`   ${studentName}: ${totalScore}/${totalMaxMarks} (${percentage}%)`);
            }
          }
        } catch (error) {
          console.log(`   ❌ Error fetching marks for ${studentId}`);
        }
      }
      
      // Find top performer for this exam
      if (studentScores.length > 0) {
        const topPerformer = studentScores.reduce((prev, current) => 
          (current.percentage > prev.percentage) ? current : prev
        );
        
        // Determine trend (you can enhance this based on previous exams)
        const trend = topPerformer.percentage >= 75 ? 'up' : 'down';
        
        topPerformersByExam.push({
          name: topPerformer.studentName,
          studentId: topPerformer.studentId,
          examTitle: examTitle,
          average: topPerformer.percentage,
          marks: `${topPerformer.totalScore}/${topPerformer.maxMarks}`,
          trend: trend
        });
        
        console.log(`   🏆 Top Performer: ${topPerformer.studentName} (${topPerformer.percentage}%)`);
      } else {
        console.log(`   ⚠️ No scores found for this exam`);
      }
    }
    
    console.log('\n✅ Top Performers by Exam:', topPerformersByExam);
    
    return topPerformersByExam.slice(0, 5); // Limit to 5 most recent exams
    
  } catch (error) {
    console.error('❌ Error fetching top performers:', error);
    console.error('Error details:', error.message);
    return [];
  }
};

/**
 * Get upcoming deadlines
 */
const getUpcomingDeadlines = (classes) => {
  const deadlines = [];
  
  deadlines.push({
    title: 'Monthly Report',
    date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
    type: 'report',
    priority: 'medium'
  });
  
  deadlines.push({
    title: 'Exam Results Submission',
    date: new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000),
    type: 'exam',
    priority: 'high'
  });
  
  return deadlines.sort((a, b) => a.date - b.date);
};

/**
 * Format time to 12-hour format
 */
const formatTime = (timeStr) => {
  if (!timeStr) return '';
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  return `${displayHours}:${String(minutes || 0).padStart(2, '0')} ${ampm}`;
};

/**
 * Get attendance heatmap data for all classes
 * Fetches attendance records and creates heatmap data structure
 */
export const getAttendanceHeatmapData = async (classes) => {
  try {
    const heatmapByClass = {};
    
    // Debug: Log class structure
    console.log('=== Attendance Heatmap Class Debug ===');
    console.log('Total classes:', classes.length);
    if (classes.length > 0) {
      console.log('Sample class object:', classes[0]);
      console.log('Available fields:', Object.keys(classes[0]));
    }
    
    // Fetch attendance for each class
    const attendancePromises = classes
      .filter(cls => cls.status === 'active')
      .map(async (cls) => {
        try {
          // Extract class name from various possible field names
          const className = cls.class_name || cls.className || cls.name || cls.title || 
                          cls.subject || cls.course_name || `Class ${cls.id}`;
          
          console.log(`Processing class ID ${cls.id}:`, className);
          
          const response = await getClassAttendance(cls.id);
          const attendanceRecords = response.success ? (response.data || []) : [];
          
          // Process attendance records into daily aggregates
          const dailyAttendance = {};
          
          attendanceRecords.forEach(record => {
            // Extract date from join_time or meeting_start_time
            let dateStr = null;
            if (record.join_time) {
              dateStr = record.join_time.split(' ')[0]; // Format: YYYY-MM-DD
            } else if (record.meeting_start_time) {
              dateStr = record.meeting_start_time.split(' ')[0];
            }
            
            if (dateStr) {
              if (!dailyAttendance[dateStr]) {
                dailyAttendance[dateStr] = {
                  date: dateStr,
                  count: 0,
                  students: new Set()
                };
              }
              
              // Count unique students per day
              if (record.student_id) {
                dailyAttendance[dateStr].students.add(record.student_id);
              }
              dailyAttendance[dateStr].count++;
            }
          });
          
          // Convert to array and calculate percentages
          const heatmapData = Object.values(dailyAttendance).map(day => ({
            date: day.date,
            count: day.count,
            uniqueStudents: day.students.size,
            // Calculate intensity (0-4 scale for heatmap colors)
            intensity: day.students.size > 0 ? Math.min(4, Math.ceil(day.students.size / 5)) : 0
          }));
          
          // Build full class label with subject and stream
          let classLabel = className;
          const details = [];
          
          if (cls.subject) details.push(cls.subject);
          if (cls.stream) details.push(cls.stream);
          if (cls.grade) details.push(`Grade ${cls.grade}`);
          
          if (details.length > 0) {
            classLabel = `${className} (${details.join(' • ')})`;
          }
          
          return {
            classId: cls.id,
            className: classLabel,
            grade: cls.grade,
            subject: cls.subject,
            stream: cls.stream,
            data: heatmapData
          };
        } catch (error) {
          console.error(`Error fetching attendance for class ${cls.id}:`, error);
          
          // Extract class name even in error case
          const className = cls.class_name || cls.className || cls.name || cls.title || 
                          cls.subject || cls.course_name || `Class ${cls.id}`;
          
          let classLabel = className;
          const details = [];
          
          if (cls.subject) details.push(cls.subject);
          if (cls.stream) details.push(cls.stream);
          if (cls.grade) details.push(`Grade ${cls.grade}`);
          
          if (details.length > 0) {
            classLabel = `${className} (${details.join(' • ')})`;
          }
          
          return {
            classId: cls.id,
            className: classLabel,
            grade: cls.grade,
            subject: cls.subject,
            stream: cls.stream,
            data: []
          };
        }
      });
    
    const results = await Promise.all(attendancePromises);
    
    // Organize by class
    results.forEach(result => {
      heatmapByClass[result.classId] = result;
    });
    
    return {
      success: true,
      data: heatmapByClass,
      classList: results
    };
  } catch (error) {
    console.error('Error fetching attendance heatmap data:', error);
    return {
      success: false,
      message: error.message,
      data: {},
      classList: []
    };
  }
};

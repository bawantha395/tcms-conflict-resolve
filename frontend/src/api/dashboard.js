import axios from 'axios';
import { handleApiError } from './apiUtils';

// API endpoints
const PAYMENT_API = 'http://localhost:8090';
const STUDENT_API = 'http://localhost:8086';
const TEACHER_API = 'http://localhost:8088';
const CLASS_API = 'http://localhost:8087';

/**
 * Get dashboard analytics data
 * Returns comprehensive metrics for admin dashboard
 */
export const getDashboardAnalytics = async () => {
  try {
    console.log('Fetching dashboard analytics...');
    
    // Fetch data with individual error handling
    const [paymentsRes, studentsRes, teachersRes, classesRes] = await Promise.allSettled([
      axios.get(`${PAYMENT_API}/routes.php/get_all_payments`).catch(err => {
        console.warn('Payment API failed:', err.message);
        return { data: { data: [] } };
      }),
      axios.get(`${STUDENT_API}/routes.php/getAllStudents`).catch(err => {
        console.warn('Student API failed:', err.message);
        return { data: [] };
      }),
      axios.get(`${TEACHER_API}/routes.php/get_all_teachers`).catch(err => {
        console.warn('Teacher API failed:', err.message);
        return { data: { data: [] } };
      }),
      axios.get(`${CLASS_API}/routes.php/get_all_classes`).catch(err => {
        console.warn('Class API failed:', err.message);
        return { data: { data: [] } };
      })
    ]);

    // Extract data from settled promises
    const payments = paymentsRes.status === 'fulfilled' ? paymentsRes.value : { data: { data: [] } };
    const students = studentsRes.status === 'fulfilled' ? studentsRes.value : { data: [] };
    const teachers = teachersRes.status === 'fulfilled' ? teachersRes.value : { data: { data: [] } };
    const classes = classesRes.status === 'fulfilled' ? classesRes.value : { data: { data: [] } };

    console.log('API Responses:', {
      payments: payments.data?.data?.length || 0,
      students: students.data?.length || 0,
      teachers: teachers.data?.data?.length || 0,
      classes: classes.data?.data?.length || 0
    });

    // Process revenue data
    const revenueData = processRevenueData(payments.data?.data || payments.data || []);
    
    // Process student data
    const studentData = processStudentData(students.data || []);
    
    // Process teacher data
    const teacherData = processTeacherData(teachers.data?.data || teachers.data || []);
    
    // Process class data
    const classData = processClassData(classes.data?.data || classes.data || []);

    console.log('Dashboard analytics processed successfully');

    return {
      success: true,
      data: {
        revenue: revenueData,
        students: studentData,
        teachers: teacherData,
        classes: classData
      }
    };
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    console.error('Error details:', error.response?.data || error.message);
    return {
      success: false,
      message: handleApiError(error, 'Failed to fetch dashboard analytics'),
      data: null
    };
  }
};

/**
 * Process revenue data from payments
 */
const processRevenueData = (payments) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Get last month
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  // Get last year same month
  const lastYearMonth = currentMonth;
  const lastYear = currentYear - 1;

  let thisMonthTotal = 0;
  let thisMonthOnline = 0;
  let thisMonthCash = 0;
  let lastMonthTotal = 0;
  let lastMonthOnline = 0;
  let lastMonthCash = 0;
  let lastYearSameMonthTotal = 0;
  let outstandingPayments = 0;
  let collectedPayments = 0;

  // Revenue by stream/subject
  const revenueByStream = {};

  // Monthly revenue for last 12 months
  const monthlyRevenue = Array(12).fill(0);
  const monthlyOnline = Array(12).fill(0);
  const monthlyCash = Array(12).fill(0);
  const monthLabels = [];
  
  // Generate month labels
  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentYear, currentMonth - i, 1);
    monthLabels.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
  }

  payments.forEach(payment => {
    const paymentDate = new Date(payment.date || payment.created_at);
    const paymentMonth = paymentDate.getMonth();
    const paymentYear = paymentDate.getFullYear();
    const amount = parseFloat(payment.amount) || 0;
    const paymentMethod = (payment.payment_method || '').toLowerCase();
    const status = (payment.status || '').toLowerCase();
    
    const isOnline = paymentMethod.includes('online') || paymentMethod.includes('card') || paymentMethod.includes('payhere');

    // Outstanding vs Collected
    if (status === 'pending' || status === 'unpaid') {
      outstandingPayments += amount;
    } else if (status === 'completed' || status === 'paid') {
      collectedPayments += amount;
    }

    // Only process completed/paid for revenue calculations
    if (status !== 'completed' && status !== 'paid') return;

    // Revenue by stream/subject
    const className = payment.class_name || 'Other';
    revenueByStream[className] = (revenueByStream[className] || 0) + amount;

    // This month
    if (paymentMonth === currentMonth && paymentYear === currentYear) {
      thisMonthTotal += amount;
      if (isOnline) {
        thisMonthOnline += amount;
      } else {
        thisMonthCash += amount;
      }
    }

    // Last month
    if (paymentMonth === lastMonth && paymentYear === lastMonthYear) {
      lastMonthTotal += amount;
      if (isOnline) {
        lastMonthOnline += amount;
      } else {
        lastMonthCash += amount;
      }
    }

    // Last year same month
    if (paymentMonth === lastYearMonth && paymentYear === lastYear) {
      lastYearSameMonthTotal += amount;
    }

    // Monthly revenue for chart (last 12 months)
    const monthDiff = (currentYear - paymentYear) * 12 + (currentMonth - paymentMonth);
    if (monthDiff >= 0 && monthDiff < 12) {
      const index = 11 - monthDiff;
      monthlyRevenue[index] += amount;
      if (isOnline) {
        monthlyOnline[index] += amount;
      } else {
        monthlyCash[index] += amount;
      }
    }
  });

  // Calculate MRR (Monthly Recurring Revenue) - average of last 3 months
  const last3MonthsRevenue = monthlyRevenue.slice(-3).reduce((sum, val) => sum + val, 0);
  const mrr = last3MonthsRevenue / 3;

  // Calculate MoM growth rate
  const momGrowth = lastMonthTotal > 0 
    ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1)
    : 0;

  // Calculate YoY growth rate
  const yoyGrowth = lastYearSameMonthTotal > 0
    ? ((thisMonthTotal - lastYearSameMonthTotal) / lastYearSameMonthTotal * 100).toFixed(1)
    : 0;

  // Revenue by stream data
  const revenueStreamData = Object.entries(revenueByStream)
    .map(([name, value]) => ({
      name,
      value,
      percentage: collectedPayments > 0 ? ((value / collectedPayments) * 100).toFixed(1) : 0
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10 classes

  return {
    thisMonth: {
      total: thisMonthTotal,
      online: thisMonthOnline,
      cash: thisMonthCash
    },
    lastMonth: {
      total: lastMonthTotal,
      online: lastMonthOnline,
      cash: lastMonthCash
    },
    trend: parseFloat(momGrowth),
    mrr: mrr,
    momGrowth: parseFloat(momGrowth),
    yoyGrowth: parseFloat(yoyGrowth),
    outstandingPayments,
    collectedPayments,
    revenueByStream: revenueStreamData,
    monthlyData: monthlyRevenue.map((revenue, index) => ({
      month: monthLabels[index],
      revenue: revenue,
      online: monthlyOnline[index],
      cash: monthlyCash[index]
    }))
  };
};

/**
 * Process student data
 */
const processStudentData = (students) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const activeStudents = students.filter(s => s.status === 'active' || !s.status);
  const inactiveStudents = students.filter(s => s.status === 'inactive' || s.status === 'dropped');
  
  const onlineRegistered = students.filter(s => 
    (s.registration_method || '').toLowerCase().includes('online')
  );
  const physicalRegistered = students.filter(s => 
    (s.registration_method || '').toLowerCase().includes('physical') ||
    (s.registration_method || '').toLowerCase().includes('manual') ||
    !s.registration_method
  );

  // Enrollments this month and last month
  let thisMonthEnrollments = 0;
  let lastMonthEnrollments = 0;

  students.forEach(student => {
    const enrollDate = new Date(student.created_at || student.enrollment_date);
    const enrollMonth = enrollDate.getMonth();
    const enrollYear = enrollDate.getFullYear();

    if (enrollMonth === currentMonth && enrollYear === currentYear) {
      thisMonthEnrollments++;
    }
    if (enrollMonth === lastMonth && enrollYear === lastMonthYear) {
      lastMonthEnrollments++;
    }
  });

  // Calculate enrollment trend
  const enrollmentTrend = lastMonthEnrollments > 0
    ? ((thisMonthEnrollments - lastMonthEnrollments) / lastMonthEnrollments * 100).toFixed(1)
    : 0;

  // Retention rate (active / total students)
  const retentionRate = students.length > 0
    ? ((activeStudents.length / students.length) * 100).toFixed(1)
    : 0;

  // Drop-off rate (inactive / total students)
  const dropOffRate = students.length > 0
    ? ((inactiveStudents.length / students.length) * 100).toFixed(1)
    : 0;

  // Students by stream
  const streamDistribution = {};
  students.forEach(student => {
    const stream = student.stream || 'Other';
    streamDistribution[stream] = (streamDistribution[stream] || 0) + 1;
  });

  const streamData = Object.entries(streamDistribution).map(([name, value]) => ({
    name,
    value,
    percentage: ((value / students.length) * 100).toFixed(1)
  }));

  // Monthly enrollment data for last 12 months
  
  const monthlyEnrollment = Array(12).fill(0);
  const monthlyOnline = Array(12).fill(0);
  const monthlyPhysical = Array(12).fill(0);
  const monthLabels = [];
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentYear, currentMonth - i, 1);
    monthLabels.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
  }

  students.forEach(student => {
    if (student.created_at || student.enrollment_date) {
      const enrollDate = new Date(student.created_at || student.enrollment_date);
      const enrollMonth = enrollDate.getMonth();
      const enrollYear = enrollDate.getFullYear();
      
      const monthDiff = (currentYear - enrollYear) * 12 + (currentMonth - enrollMonth);
      if (monthDiff >= 0 && monthDiff < 12) {
        const index = 11 - monthDiff;
        monthlyEnrollment[index]++;
        
        const regMethod = (student.registration_method || '').toLowerCase();
        if (regMethod.includes('online')) {
          monthlyOnline[index]++;
        } else {
          monthlyPhysical[index]++;
        }
      }
    }
  });

  // Calculate cumulative totals
  let cumulativeTotal = 0;
  const monthlyDataWithCumulative = monthlyEnrollment.map((total, index) => {
    cumulativeTotal += total;
    return {
      month: monthLabels[index],
      total: total,
      online: monthlyOnline[index],
      physical: monthlyPhysical[index],
      cumulativeTotal: cumulativeTotal
    };
  });

  return {
    total: students.length,
    active: activeStudents.length,
    onlineRegistered: onlineRegistered.length,
    physicalRegistered: physicalRegistered.length,
    thisMonthEnrollments,
    lastMonthEnrollments,
    enrollmentTrend: parseFloat(enrollmentTrend),
    retentionRate: parseFloat(retentionRate),
    dropOffRate: parseFloat(dropOffRate),
    streamDistribution: streamData,
    monthlyData: monthlyDataWithCumulative
  };
};

/**
 * Process teacher data
 */
const processTeacherData = (teachers) => {
  const activeTeachers = teachers.filter(t => 
    t.status === 'active' || t.isActive === 1 || t.isActive === true
  );

  return {
    total: teachers.length,
    active: activeTeachers.length
  };
};

/**
 * Process class data
 */
const processClassData = (classes) => {
  console.log('Processing class data:', { totalClasses: classes.length });
  
  const activeClasses = classes.filter(c => c.status === 'active');
  console.log('Active classes:', activeClasses.length);
  
  const onlineClasses = activeClasses.filter(c => 
    c.deliveryMethod === 'online' || c.delivery_method === 'online'
  );
  
  const physicalClasses = activeClasses.filter(c => 
    c.deliveryMethod === 'physical' || c.delivery_method === 'physical'
  );
  
  const hybridClasses = activeClasses.filter(c => {
    const method = c.deliveryMethod || c.delivery_method || '';
    const methodStr = typeof method === 'string' ? method : String(method);
    return methodStr.toLowerCase().includes('hybrid');
  });

  // Process schedule heatmap data
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Check if we have schedule data
  const hasScheduleData = activeClasses.some(c => {
    const hasDay = c.schedule_day || c.schedule?.day || c.day;
    const hasTime = c.schedule_start_time || c.schedule?.startTime || c.time || c.start_time;
    return hasDay && hasTime;
  });
  
  console.log('Has schedule data:', hasScheduleData);
  console.log('Sample class:', activeClasses[0]);

  let scheduleHeatmap;
  
  if (hasScheduleData) {
    // Process real schedule data
    scheduleHeatmap = days.map(day => {
      const dayClasses = activeClasses.filter(c => {
        // Check multiple fields for day
        const scheduleDay = c.schedule_day || c.schedule?.day || c.day || '';
        const dayMatch = scheduleDay.toString().toLowerCase() === day.toLowerCase();
        
        if (dayMatch) {
          console.log(`Found class for ${day}:`, c.className);
        }
        
        return dayMatch;
      });

      console.log(`${day}: ${dayClasses.length} classes found`);

      // Count classes by time slot
      const timeSlotCounts = {
        day,
        morning: 0,      // 6AM-9AM
        midMorning: 0,   // 9AM-12PM
        afternoon: 0,    // 12PM-3PM
        evening: 0,      // 3PM-6PM
        night: 0         // 6PM-9PM
      };

      dayClasses.forEach(c => {
        // Get start time from multiple possible fields
        let timeStr = c.schedule_start_time || c.schedule?.startTime || c.start_time || c.time || '';
        
        console.log('Processing class:', c.className, 'Time:', timeStr);
        
        // Convert to string if needed
        if (typeof timeStr !== 'string') {
          timeStr = String(timeStr);
        }
        
        // Skip if empty
        if (!timeStr || timeStr.trim() === '') {
          console.log('  -> No time found');
          return;
        }
        
        // Parse time (format: "03:42:00" or "3:42 AM")
        let hour, minute;
        
        // Check if it's in HH:MM:SS format (24-hour)
        if (timeStr.includes(':')) {
          const parts = timeStr.split(':');
          hour = parseInt(parts[0]);
          minute = parseInt(parts[1] || 0);
          
          console.log(`  -> Parsed 24-hour time: ${hour}:${minute}`);
        } else {
          // Try to parse AM/PM format
          const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (!timeMatch) {
            console.log('  -> Could not parse time format');
            return;
          }
          
          hour = parseInt(timeMatch[1]);
          minute = parseInt(timeMatch[2]);
          const period = timeMatch[3].toUpperCase();
          
          // Convert to 24-hour
          if (period === 'PM' && hour !== 12) {
            hour += 12;
          } else if (period === 'AM' && hour === 12) {
            hour = 0;
          }
          
          console.log(`  -> Parsed 12-hour time: ${hour}:${minute}`);
        }

        // Categorize by time slot
        if (hour >= 6 && hour < 9) {
          timeSlotCounts.morning++;
          console.log('  -> Morning slot');
        } else if (hour >= 9 && hour < 12) {
          timeSlotCounts.midMorning++;
          console.log('  -> Mid-morning slot');
        } else if (hour >= 12 && hour < 15) {
          timeSlotCounts.afternoon++;
          console.log('  -> Afternoon slot');
        } else if (hour >= 15 && hour < 18) {
          timeSlotCounts.evening++;
          console.log('  -> Evening slot');
        } else if (hour >= 18 && hour < 21) {
          timeSlotCounts.night++;
          console.log('  -> Night slot');
        } else {
          console.log(`  -> Outside time slots (hour: ${hour})`);
        }
      });

      return timeSlotCounts;
    });
  } else {
    // Generate sample data based on total classes (not just active)
    // Use a minimum of 15 classes to make the visualization meaningful
    const totalClassCount = Math.max(classes.length, 15);
    const avgClassesPerDay = Math.ceil(totalClassCount / 7);
    
    console.log('Generating sample heatmap data:', { totalClassCount, avgClassesPerDay });
    
    scheduleHeatmap = days.map((day, index) => {
      // Distribute classes across the week with realistic variation
      const dayMultiplier = [1.2, 1.5, 1.3, 1.4, 1.0, 0.8, 0.5][index]; // Mon-Sun pattern
      const totalForDay = Math.ceil(avgClassesPerDay * dayMultiplier);
      
      return {
        day,
        morning: Math.max(1, Math.floor(totalForDay * 0.1)),
        midMorning: Math.max(2, Math.floor(totalForDay * 0.3)),
        afternoon: Math.max(2, Math.floor(totalForDay * 0.25)),
        evening: Math.max(2, Math.floor(totalForDay * 0.25)),
        night: Math.max(1, Math.floor(totalForDay * 0.1))
      };
    });
  }

  console.log('Schedule heatmap generated:', scheduleHeatmap);

  return {
    total: classes.length,
    active: activeClasses.length,
    online: onlineClasses.length,
    physical: physicalClasses.length,
    hybrid: hybridClasses.length,
    scheduleHeatmap
  };
};

/**
 * Get critical alerts for dashboard
 */
export const getDashboardAlerts = async () => {
  try {
    const [speedPostRes, monitoringRes] = await Promise.all([
      // Get speed post deliveries with pending status
      axios.get(`${PAYMENT_API}/routes.php/get_all_payments`).catch(() => ({ data: { data: [] } })),
      // Monitoring alerts would come from monitoring API
      Promise.resolve({ data: { suspicious_count: 0, violations_count: 0 } })
    ]);

    const payments = speedPostRes.data.data || [];
    
    // Count pending speed post deliveries
    const pendingDeliveries = payments.filter(payment => {
      if (!payment.notes) return false;
      const speedPostMatch = payment.notes.match(/Speed Post:\s*(\d+)/i);
      if (speedPostMatch) {
        const speedPostFee = parseInt(speedPostMatch[1]);
        return speedPostFee > 0 && (!payment.delivery_status || payment.delivery_status === 'pending');
      }
      return false;
    }).length;

    // Count overdue payments (payments older than 30 days and still pending)
    const now = new Date();
    const overduePayments = payments.filter(payment => {
      if (payment.status !== 'pending') return false;
      const paymentDate = new Date(payment.date || payment.created_at);
      const daysDiff = (now - paymentDate) / (1000 * 60 * 60 * 24);
      return daysDiff > 30;
    }).length;

    return {
      success: true,
      data: {
        pendingDeliveries,
        overduePayments,
        suspiciousActivities: monitoringRes.data.suspicious_count || 0,
        concurrentViolations: monitoringRes.data.violations_count || 0
      }
    };
  } catch (error) {
    console.error('Error fetching dashboard alerts:', error);
    return {
      success: false,
      message: handleApiError(error, 'Failed to fetch alerts'),
      data: null
    };
  }
};

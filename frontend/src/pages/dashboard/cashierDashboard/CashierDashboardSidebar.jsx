import React from 'react';
import { 
  FaChartBar, 
  FaMoneyBill, 
  FaFileInvoice, 
  FaHistory, 
  FaGraduationCap,
  FaBook,
  FaClipboardList,
  FaExclamationTriangle,
  FaIdCard,
  FaPlusSquare,
  FaUsers,
  FaTruck,
  FaSdCard
} from 'react-icons/fa';

// Sidebar sections for the cashier dashboard
const cashierSidebarSections = [
  {
    section: 'Dashboard Overview',
    items: [
      { name: 'Cashier Dashboard', path: '/cashierdashboard', icon: <FaChartBar className="h-5 w-5" /> },
    ]
  },
  {
    section: 'Student Tracking',
    items: [
      { name: 'Late Payments', path: '/cashier/late-payments', icon: <FaExclamationTriangle className="h-5 w-5" /> },
      { name: 'Forget ID Card Students', path: '/cashier/forget-id-card', icon: <FaIdCard className="h-5 w-5" /> },
      { name: 'Free and Half Cards' , path: '/cashier/free-and-half-cards', icon: <FaSdCard className="h-5 w-5" /> },
    ]
  },
  {
    section: 'Reports & History',
    items: [
      { name: 'Session End Report History', path: '/cashier/session-report-history', icon: <FaHistory className="h-5 w-5" /> },
      { name: 'Day End Report History', path: '/cashier/day-end-report-history', icon: <FaFileInvoice className="h-5 w-5" /> },
    ]
  },
  {
    section: 'High Level Admin  Tasks',
    items: [  
      { name: 'Student Enrollment', path: '/cashier/students/enrollment', icon: <FaGraduationCap className="h-5 w-5" />, requiredPermissions: ['student_management.student_enrollment'] },
      { name: 'Purchased Classes', path: '/cashier/students/purchased-classes', icon: <FaBook className="h-5 w-5" />, requiredPermissions: ['student_management.purchased_classes'] },
      { name: 'Create Class', path: '/cashier/classes/create', icon: <FaPlusSquare className="h-5 w-5" />, requiredPermissions: ['class_and_schedule.create_class'] },
      { name: 'All Classes', path: '/cashier/classes/all', icon: <FaClipboardList className="h-5 w-5" />, requiredPermissions: ['class_and_schedule.all_classes'] },
      { name: 'Class Enrollments', path: '/cashier/classes/enrollments', icon: <FaUsers className="h-5 w-5" />, requiredPermissions: ['class_and_schedule.class_enrollments'] },
      { name: 'Class Halls', path: '/cashier/class-halls', icon: <FaBook className="h-5 w-5" />, requiredPermissions: ['class_and_schedule.class_halls'] },
      { name: 'Class Payments', path: '/cashier/classes/payments', icon: <FaMoneyBill className="h-5 w-5" />, requiredPermissions: ['class_and_schedule.class_payments'] },
      { name: 'Attendance ', path: '/cashier/attendance-management', icon: <FaClipboardList className="h-5 w-5" />, requiredPermissions: ['student_management.attendance_management'] },
      { name: 'Speed Post Delivery', path: '/cashier/speed-post-deliveries', icon: <FaTruck className="h-5 w-5" />, requiredPermissions: ['delivery_management.speed_post_deliveries'] },
 ]
  },

];

export default cashierSidebarSections;

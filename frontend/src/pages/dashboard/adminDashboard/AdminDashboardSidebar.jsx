import React from 'react';
import { FaUsers, FaUserSlash, FaGraduationCap, FaBook, FaChartBar, FaCog, FaCalendar, FaUserPlus, FaFileAlt, FaUsersCog, FaUserShield, FaDatabase, FaBell, FaSync, FaPlusSquare, FaClipboardList, FaTicketAlt, FaShieldAlt, FaMoneyBill, FaVideo, FaQrcode, FaTruck, FaKey, FaUserCheck, FaEye, FaLock } from 'react-icons/fa';
import { filterSidebarByPermissions } from '../../../utils/permissionChecker';

// Sidebar sections for the admin dashboard
const adminSidebarSections = [
  // permission is section in simple and underscore dot item name in simple with space replaced by underscore
  {
    section: 'Dashboard Overview',
    items: [
      { name: 'Admin Dashboard', path: '/admindashboard', icon: <FaChartBar className="h-5 w-5" />, requiredPermissions: ['dashboard_overview.dashboard_overview'] },
    ]
  },
  {
    section: 'Core Admin Management',
    items: [
      { name: 'Create Core Admin', path: '/admin/core-admins/create', icon: <FaUserPlus className="h-5 w-5" />, requiredPermissions: ['core_admin_management.create_core_admin'] },
      { name: 'Core Admin Info', path: '/admin/core-admins/info', icon: <FaUsers className="h-5 w-5" />, requiredPermissions: ['core_admin_management.core_admin_info'] },
    ]
  },
  {
    section: 'Cashier Management',
    items: [
      { name: 'Create Cashier', path: '/admin/cashiers/create', icon: <FaUserPlus className="h-5 w-5" />, requiredPermissions: ['cashier_management.create_cashier'] },
      { name: 'Cashier Info', path: '/admin/cashiers/info', icon: <FaUsers className="h-5 w-5" />, requiredPermissions: ['cashier_management.cashier_info'] },
      // { name: 'Cashier Dashboard', path: '/admin/cashiers/cashierdashboard', icon: <FaUserSlash className="h-5 w-5" />, requiredPermissions: ['cashier_management.cashier_dashboard'] },
    ]
  },
  {
    section: 'Teacher Management',
    items: [
      { name: 'Create Teacher', path: '/admin/teachers/create', icon: <FaUserPlus className="h-5 w-5" />, requiredPermissions: ['teacher_management.create_teacher'] },
      { name: 'Teacher Info', path: '/admin/teachers/info', icon: <FaUsers className="h-5 w-5" />, requiredPermissions: ['teacher_management.teacher_info'] },
    ]
  },
  {
    section: 'Student Management',
    items: [
      { name: 'Student Enrollment', path: '/admin/students/enrollment', icon: <FaGraduationCap className="h-5 w-5" />, requiredPermissions: ['student_management.student_enrollment'] },
      // { name: 'Student Cards', path: '/admin/students/cards', icon: <FaTicketAlt className="h-5 w-5" />, requiredPermissions: ['student_management.student_cards'] },
      // { name: 'Attendance Management', path: '/admin/attendance-management', icon: <FaClipboardList className="h-5 w-5" />, requiredPermissions: ['student_management.attendance_management'] },
      { name: 'Purchased Classes', path: '/admin/students/purchased-classes', icon: <FaBook className="h-5 w-5" />, requiredPermissions: ['student_management.purchased_classes'] }
    ]
  },
  {
    section: 'Class Management',
    items: [
      { name: 'Create Class', path: '/admin/classes/create', icon: <FaPlusSquare className="h-5 w-5" />, requiredPermissions: ['class_and_schedule.create_class'] },
      { name: 'All Classes', path: '/admin/classes/all', icon: <FaClipboardList className="h-5 w-5" />, requiredPermissions: ['class_and_schedule.all_classes'] },
      { name: 'Class Enrollments', path: '/admin/classes/enrollments', icon: <FaUsers className="h-5 w-5" />, requiredPermissions: ['class_and_schedule.class_enrollments'] },
      // { name: 'Class Halls', path: '/admin/class-halls', icon: <FaBook className="h-5 w-5" />, requiredPermissions: ['class_and_schedule.class_halls'] },
    ]
  },
   {
    section: 'Class Hall Management',
    items: [
      { name: 'Class Halls', path: '/admin/class-halls', icon: <FaBook className="h-5 w-5" />, requiredPermissions: ['class_and_schedule.class_halls'] },
    ]
  },
  
  {
    section: 'Payment Management',
    items: [
      { name: 'Class Payments', path: '/admin/classes/payments', icon: <FaMoneyBill className="h-5 w-5" />, requiredPermissions: ['class_and_schedule.class_payments'] },
      // { name: 'Financial Records', path: '/admin/financial', icon: <FaChartBar className="h-5 w-5" />, requiredPermissions: ['finance_and_reports.financial_records'] },
      // { name: 'Generate Reports', path: '/admin/reports', icon: <FaFileAlt className="h-5 w-5" />, requiredPermissions: ['finance_and_reports.generate_reports'] },
      // { name: 'Student All Payments', path: '/admin/students-payments', icon: <FaUserShield className="h-5 w-5" />, requiredPermissions: ['finance_and_reports.student_all_payments'] },
    ]
  },
  {
    section: 'Attendance Management',
    items: [
      // { name: 'Student Enrollment', path: '/admin/students/enrollment', icon: <FaGraduationCap className="h-5 w-5" />, requiredPermissions: ['student_management.student_enrollment'] },
      // { name: 'Student Cards', path: '/admin/students/cards', icon: <FaTicketAlt className="h-5 w-5" />, requiredPermissions: ['student_management.student_cards'] },
      { name: 'Attendance ', path: '/admin/attendance-management', icon: <FaClipboardList className="h-5 w-5" />, requiredPermissions: ['student_management.attendance_management'] },
      // { name: 'Purchased Classes', path: '/admin/students/purchased-classes', icon: <FaBook className="h-5 w-5" />, requiredPermissions: ['student_management.purchased_classes'] }
    ]
  },
  {
    section: 'Delivery Management',
    items: [
      { name: 'Speed Post Delivery', path: '/admin/speed-post-deliveries', icon: <FaTruck className="h-5 w-5" />, requiredPermissions: ['delivery_management.speed_post_deliveries'] },
      // { name: 'Access All Data', path: '/admin/data', icon: <FaDatabase className="h-5 w-5" />, requiredPermissions: ['system_management.access_all_data'] },
      // { name: 'Notifications', path: '/admin/notifications', icon: <FaBell className="h-5 w-5" />, requiredPermissions: ['system_management.notifications'] },
      // { name: 'Backup and Restore', path: '/admin/backup', icon: <FaSync className="h-5 w-5" />, requiredPermissions: ['system_management.backup_and_restore'] },
    ]
  },
  {
    section: 'User Roles & Permissions',
    items: [
      // { name: 'All Roles', path: '/admin/roles', icon: <FaShieldAlt className="h-5 w-5" />, requiredPermissions: ['user_roles.all_roles'] },
      { name: 'Permission Management', path: '/admin/permissions', icon: <FaKey className="h-5 w-5" />, requiredPermissions: ['user_roles.permission_management'] },
      { name: 'Role Management', path: '/admin/roles/manage', icon: <FaUserShield className="h-5 w-5" />, requiredPermissions: ['user_roles.manage_roles'] },
      { name: 'Assign Roles to Users', path: '/admin/roles/assign', icon: <FaUserCheck className="h-5 w-5" />, requiredPermissions: ['user_roles.assign_roles'] },
    ]
  },
  // {
  //   section: 'Communication',
  //   items: [
  //     { name: 'Announcements', path: '/admin/announcements', icon: <FaBell className="h-5 w-5" />, requiredPermissions: ['communication.announcements'] },
  //     { name: 'Messages', path: '/admin/messages', icon: <FaUsers className="h-5 w-5" />, requiredPermissions: ['communication.messages'] },
  //   ]
  // },
  {
    section: 'Security & Monitoring',
    items: [
      { name: 'Student Monitoring', path: '/admin/monitoring', icon: <FaShieldAlt className="h-5 w-5" />, requiredPermissions: ['security_and_monitoring.student_monitoring'] },
    ]
  }
  
];

const AdminDashboardSidebar = (permissions = []) => {
  // Filter sidebar sections based on user permissions
  const filteredSections = filterSidebarByPermissions(adminSidebarSections, permissions);
  return filteredSections;
};

export default AdminDashboardSidebar; 

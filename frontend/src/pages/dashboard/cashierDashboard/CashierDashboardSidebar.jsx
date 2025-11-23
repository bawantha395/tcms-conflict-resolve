import React from 'react';
import { 
  FaChartBar, 
  FaMoneyBill, 
  FaFileInvoice, 
  FaClock, 
  FaHistory, 
  FaPrint, 
  FaUser,
  FaCog,
  FaBell,
  FaExclamationTriangle,
  FaIdCard,
  FaCalendar
} from 'react-icons/fa';
import { filterSidebarByPermissions } from '../../../utils/permissionChecker';

const CashierDashboardSidebar = (permissions = []) => {
  // Define all possible sidebar sections with permission requirements
  const allSidebarSections = [
    {
      section: 'Dashboard Overview',
      items: [
        { 
          name: 'Cashier Dashboard', 
          path: '/cashierdashboard', 
          icon: <FaChartBar className="h-5 w-5" />,
          requiredPermissions: ['dashboard_overview.dashboard_overview']
        },
      ]
    },
    {
      section: 'Payment Processing',
      items: [
        { 
          name: 'Process Payment', 
          path: '/cashier/process-payment', 
          icon: <FaMoneyBill className="h-5 w-5" />,
          requiredPermissions: ['payment_processing.process_payment']
        },
        { 
          name: 'Payment History', 
          path: '/cashier/payment-history', 
          icon: <FaHistory className="h-5 w-5" />,
          requiredPermissions: ['payment_processing.payment_history']
        },
        { 
          name: 'Print Receipts', 
          path: '/cashier/print-receipts', 
          icon: <FaPrint className="h-5 w-5" />,
          requiredPermissions: ['reports_and_analytics.print_receipts']
        },
      ]
    },
    {
      section: 'Student Management',
      items: [
        { 
          name: 'Student Records', 
          path: '/cashier/student-records', 
          icon: <FaUser className="h-5 w-5" />,
          requiredPermissions: ['student_management.student_records']
        },
        { 
          name: 'Student Payments', 
          path: '/cashier/student-payments', 
          icon: <FaMoneyBill className="h-5 w-5" />,
          requiredPermissions: ['student_management.student_payments']
        },
      ]
    },
    {
      section: 'Student Tracking',
      items: [
        { 
          name: 'Late Payments', 
          path: '/cashier/late-payments', 
          icon: <FaExclamationTriangle className="h-5 w-5" />,
          requiredPermissions: ['schedule_and_calendar.due_dates']
        },
        { 
          name: 'Forget ID Card Students', 
          path: '/cashier/forget-id-card', 
          icon: <FaIdCard className="h-5 w-5" />,
          requiredPermissions: ['schedule_and_calendar.due_dates']
        },
      ]
    },
    {
      section: 'Financial Records',
      items: [
        { 
          name: 'Daily Transactions', 
          path: '/cashier/daily-transactions', 
          icon: <FaFileInvoice className="h-5 w-5" />,
          requiredPermissions: ['financial_records.daily_transactions']
        },
        { 
          name: 'Monthly Reports', 
          path: '/cashier/monthly-reports', 
          icon: <FaChartBar className="h-5 w-5" />,
          requiredPermissions: ['financial_records.monthly_reports']
        },
        { 
          name: 'Revenue Summary', 
          path: '/cashier/revenue-summary', 
          icon: <FaMoneyBill className="h-5 w-5" />,
          requiredPermissions: ['financial_records.revenue_summary']
        },
      ]
    },
    {
      section: 'Reports & Analytics',
      items: [
        { 
          name: 'Financial Reports', 
          path: '/cashier/financial-reports', 
          icon: <FaFileInvoice className="h-5 w-5" />,
          requiredPermissions: ['reports_and_analytics.financial_reports']
        },
        { 
          name: 'Payment Analytics', 
          path: '/cashier/payment-analytics', 
          icon: <FaChartBar className="h-5 w-5" />,
          requiredPermissions: ['reports_and_analytics.payment_analytics']
        },
      ]
    },
    {
      section: 'Schedule & Calendar',
      items: [
        { 
          name: 'Payment Schedule', 
          path: '/cashier/payment-schedule', 
          icon: <FaClock className="h-5 w-5" />,
          requiredPermissions: ['schedule_and_calendar.payment_schedule']
        },
        { 
          name: 'Due Dates', 
          path: '/cashier/due-dates', 
          icon: <FaCalendar className="h-5 w-5" />,
          requiredPermissions: ['schedule_and_calendar.due_dates']
        },
      ]
    },
    {
      section: 'Settings & Profile',
      items: [
        { 
          name: 'My Profile', 
          path: '/cashier/profile', 
          icon: <FaUser className="h-5 w-5" />,
          requiredPermissions: ['settings_and_profile.my_profile']
        },
        { 
          name: 'Settings', 
          path: '/cashier/settings', 
          icon: <FaCog className="h-5 w-5" />,
          requiredPermissions: ['settings_and_profile.settings']
        },
        { 
          name: 'Notifications', 
          path: '/cashier/notifications', 
          icon: <FaBell className="h-5 w-5" />,
          requiredPermissions: ['settings_and_profile.notifications']
        },
      ]
    },
  ];

  // Filter sidebar sections based on user permissions
  const filteredSections = filterSidebarByPermissions(allSidebarSections, permissions);

  return filteredSections;
};

export default CashierDashboardSidebar;

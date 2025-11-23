import CashierDashboard from '../../pages/dashboard/cashierDashboard/CashierDashboard';
import StudentTracking from '../../pages/dashboard/cashierDashboard/StudentTracking';
import SessionEndReportHistory from '../../pages/dashboard/cashierDashboard/SessionEndReportHistory';
import DayEndReportHistory from '../../pages/dashboard/cashierDashboard/DayEndReportHistory';
import StudentEnrollment from '../../pages/dashboard/adminDashboard/StudentEnrollment';
import StudentsPurchasedClasses from '../../pages/dashboard/adminDashboard/StudentsPurchasedClasses';
import CreateClass from '../../pages/dashboard/adminDashboard/CreateClass';
import AllClasses from '../../pages/dashboard/adminDashboard/AllClasses'; 
import ClassEnrollments from '../../pages/dashboard/adminDashboard/ClassEnrollments';
import ClassHalls from '../../pages/dashboard/adminDashboard/ClassHalls';
import ClassPayments from '../../pages/dashboard/adminDashboard/ClassPayments';
import AttendanceManagement from '../../pages/dashboard/adminDashboard/AttendanceManagement';
import SpeedPostDeliveries from '../../pages/dashboard/adminDashboard/SpeedPostDeliveries';
import ClassTabsPage from '../../pages/dashboard/adminDashboard/ClassTabsPage';
import PhysicalStudentRegisterTab from '../../pages/dashboard/adminDashboard/PhysicalStudentRegisterTab';
import StudentTabsPage from '../../pages/dashboard/adminDashboard/StudentTabsPage';
import FreeHalfCards from '../../pages/dashboard/cashierDashboard/FreeHalfCards';

export const cashierRoutes = [
  {
    path: '/cashierdashboard',
    element: <CashierDashboard />,
  },
  {
    path: '/cashier/late-payments',
    element: <StudentTracking />,
  },{
    path: '/cashier/free-and-half-cards',
    element: <FreeHalfCards />,
  },
  {
    path: '/cashier/forget-id-card',
    element: <StudentTracking />,
  },
  {
    path: '/cashier/session-report-history',
    element: <SessionEndReportHistory />,
  }
  ,
  {
    path: '/cashier/day-end-report-history',
    element: <DayEndReportHistory />,
  },
  {
    path: '/cashier/students/',
    element: <StudentTabsPage/>,
    children: [
      { index: true, element: <StudentEnrollment /> },
      { path: "enrollment", element: <StudentEnrollment /> },
      { path: "physical", element: <PhysicalStudentRegisterTab /> },
      { path: "purchased-classes", element: <StudentsPurchasedClasses /> },
    ]
  },
  { 
    path: '/cashier/classes',
    element: <ClassTabsPage />,
     children: [
      { index: true, element: <CreateClass /> },
      { path: "create", element: <CreateClass /> },
    ]  
  },
  {
    path: '/cashier/classes/all',
    element: <AllClasses />, 
  },
  {
    path: '/cashier/classes/enrollments',
    element: <ClassEnrollments />,
  },
  {
    path: '/cashier/class-halls',
    element: <ClassHalls />,
  },
  {
    path: '/cashier/classes/payments',
    element: <ClassPayments />,
  },
  {
    path: '/cashier/attendance-management',
    element: <AttendanceManagement />,
  },
  {
    path: '/cashier/speed-post-deliveries', 
    element: <SpeedPostDeliveries />, 
  }

];

export default cashierRoutes;

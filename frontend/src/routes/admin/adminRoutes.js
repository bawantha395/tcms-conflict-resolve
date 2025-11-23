import ClassTabsPage from '../../pages/dashboard/adminDashboard/ClassTabsPage';
import CreateClass from '../../pages/dashboard/adminDashboard/CreateClass';
import ClassScheduling from '../../pages/dashboard/adminDashboard/ClassScheduling';
import StudentTabsPage from '../../pages/dashboard/adminDashboard/StudentTabsPage';
import StudentEnrollment from '../../pages/dashboard/adminDashboard/StudentEnrollment';
import PhysicalStudentRegisterTab from '../../pages/dashboard/adminDashboard/PhysicalStudentRegisterTab';
import StudentsPurchasedClasses from '../../pages/dashboard/adminDashboard/StudentsPurchasedClasses';
import PhysicalEnrollmentQuickAccess from '../../pages/dashboard/adminDashboard/PhysicalEnrollmentQuickAccess';
import StudentCardManagement from '../../pages/dashboard/adminDashboard/StudentCardManagement';
import TeacherTabsPage from '../../pages/dashboard/adminDashboard/TeacherTabsPage';
import TeacherInfo from '../../pages/dashboard/adminDashboard/TeacherInfo';
import CreateTeacherLogin from '../../pages/dashboard/adminDashboard/CreateTeacherLogin';
import CoreAdminInfo from '../../pages/dashboard/adminDashboard/CoreAdminInfo';
import CreateCoreAdminLogin from '../../pages/dashboard/adminDashboard/CreateCoreAdminLogin';
import CoreAdminTabsPage from '../../pages/dashboard/adminDashboard/CoreAdminTabsPage';
import CashiersTabsPage from '../../pages/dashboard/adminDashboard/CashiersTabsPage';
import CashiersInfo from '../../pages/dashboard/adminDashboard/CashiersInfo';
import CreateCashierLogin from '../../pages/dashboard/adminDashboard/CreateCashierLogin';
import StudentMonitoringDashboard from '../../pages/dashboard/adminDashboard/StudentMonitoringDashboard';

export const adminRoutes = [
  {
    path: "/admin/classes",
    element: <ClassTabsPage/>,
    children: [
      { path: "create", element: <CreateClass /> },
      { path: "schedule", element: <ClassScheduling /> },
      { index: true, element: <CreateClass /> }
    ]
  },
  {
    path: "/admin/students",
    element: <StudentTabsPage/>,
    children: [
      { index: true, element: <StudentEnrollment /> },
      { path: "enrollment", element: <StudentEnrollment /> },
      { path: "physical", element: <PhysicalStudentRegisterTab /> },
      { path: "purchased-classes", element: <StudentsPurchasedClasses /> }
    ]
  },
  {
    path: "/admin/students/cards",
    element: <StudentCardManagement />
  },
  {
    path: "/admin/physical-enrollment",
    element: <PhysicalEnrollmentQuickAccess />
  },
  {
    path: "/admin/teachers/",
    element: <TeacherTabsPage/>,
    children: [
      { index: true, element: <TeacherInfo /> },
      { path: "info", element: <TeacherInfo /> },
      { path: "create", element: <CreateTeacherLogin /> }
    ]
  },
  {
    path: "/admin/core-admins/",
    element: <CoreAdminTabsPage />, 
    children: [
      { index: true, element: <CoreAdminInfo /> },  
      { path: "info", element: <CoreAdminInfo /> },
      { path: "create", element: <CreateCoreAdminLogin /> }
    ]
  },
  {
    path: "/admin/cashiers",
    element: <CashiersTabsPage />,
    children: [
      { index: true, element: <CashiersInfo /> },
      { path: "info", element: <CashiersInfo /> },
      { path: "create", element: <CreateCashierLogin /> }
    ]  
  },
  {
    path: "/admin/monitoring",
    element: <StudentMonitoringDashboard />
  }
]; 
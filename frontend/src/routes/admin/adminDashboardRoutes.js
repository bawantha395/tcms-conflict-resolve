import AdminDashboard from '../../pages/dashboard/adminDashboard/AdminDashboard';
import ClassHalls from '../../pages/dashboard/adminDashboard/ClassHalls';
import ClassScheduling from '../../pages/dashboard/adminDashboard/ClassScheduling';
import TeacherInfo from '../../pages/dashboard/adminDashboard/TeacherInfo';
import StudentEnrollment from '../../pages/dashboard/adminDashboard/StudentEnrollment';
import FinancialRecordsOverview from '../../pages/dashboard/adminDashboard/FinancialRecordsOverview';
import Reports from '../../pages/dashboard/adminDashboard/Reports';
import AttendanceOverview from '../../pages/dashboard/adminDashboard/AttendanceOverview';
import ClassAttendanceDetail from '../../pages/dashboard/adminDashboard/ClassAttendanceDetail';
import AttendanceManagement from '../../pages/dashboard/adminDashboard/AttendanceManagement';
import CoreAdminInfo from '../../pages/dashboard/adminDashboard/CoreAdminInfo';
import StudentAllPayments from '../../pages/dashboard/adminDashboard/StudentAllPayments';
import StudentClassPayments from '../../pages/dashboard/adminDashboard/StudentClassPayments';
import AllClasses from '../../pages/dashboard/adminDashboard/AllClasses';
import ClassPayments from '../../pages/dashboard/adminDashboard/ClassPayments';
import ClassEnrollments from '../../pages/dashboard/adminDashboard/ClassEnrollments';
import ClassStudents from '../../pages/dashboard/adminDashboard/ClassStudents';
import AllRoles from '../../pages/dashboard/adminDashboard/AllRoles';
import RolesWithPermission from '../../pages/dashboard/adminDashboard/RolesWithPermission';
import SpeedPostDeliveries from '../../pages/dashboard/adminDashboard/SpeedPostDeliveries';
import PermissionManagement from '../../pages/dashboard/adminDashboard/PermissionManagement';
import RoleManagement from '../../pages/dashboard/adminDashboard/RoleManagement';
import UserRoleAssignment from '../../pages/dashboard/adminDashboard/UserRoleAssignment';

export const adminDashboardRoutes = [
  { path: "/admindashboard", element: <AdminDashboard/> },
  { path: "/admin/class-halls", element: <ClassHalls/> },
  { path: "/admin/schedule", element: <ClassScheduling/> },
  { path: "/admin/core-admins",element: <CoreAdminInfo/> },
  { path: "/admin/teachers", element: <TeacherInfo/> },
  { path: "/admin/students", element: <StudentEnrollment/> },
  { path: "/admin/financial", element: <FinancialRecordsOverview /> },
  { path: "/admin/reports", element: <Reports /> },
  { path: "/admin/attendance", element: <AttendanceOverview /> },
  { path: "/admin/attendance/:classId", element: <ClassAttendanceDetail /> },
  { path: "/admin/attendance-management", element: <AttendanceManagement /> },
  { path: "/admin/students-payments", element: <StudentAllPayments /> },
  { path: "/admin/students-payments/:classId", element: <StudentClassPayments /> },
  { path: "/admin/classes/all", element: <AllClasses /> },
  { path: "/admin/classes/payments", element: <ClassPayments /> },
  { path: "/admin/classes/enrollments", element: <ClassEnrollments /> },
  { path: "/admin/classes/all/:classId", element: <ClassStudents /> },
  { path: "/admin/roles", element: <AllRoles /> },
  { path: "/admin/roles/permissions", element: <RolesWithPermission /> },
  { path: "/admin/speed-post-deliveries", element: <SpeedPostDeliveries /> },
  { path: "/admin/permissions", element: <PermissionManagement /> },
  { path: "/admin/roles/manage", element: <RoleManagement /> },
  { path: "/admin/roles/assign", element: <UserRoleAssignment /> },
];
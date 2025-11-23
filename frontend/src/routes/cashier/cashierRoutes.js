import CashierDashboard from '../../pages/dashboard/cashierDashboard/CashierDashboard';
import StudentTracking from '../../pages/dashboard/cashierDashboard/StudentTracking';

export const cashierRoutes = [
  {
    path: '/cashierdashboard',
    element: <CashierDashboard />,
  },
  {
    path: '/cashier/late-payments',
    element: <StudentTracking />,
  },
  {
    path: '/cashier/forget-id-card',
    element: <StudentTracking />,
  }
];

export default cashierRoutes;

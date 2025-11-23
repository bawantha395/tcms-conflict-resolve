import { NavLink, Outlet } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import adminSidebarSections from './AdminDashboardSidebar';
import cashierSidebarSections from '../cashierDashboard/CashierDashboardSidebar';
import { getUserData, logout as authLogout } from '../../../api/apiUtils';
import React, { useState, useEffect } from 'react';

const ClassTabsPage = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getUserData());
  }, []);

  const handleLogout = async () => {
    try {
      await authLogout();
      window.location.href = '/login';
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  const layoutProps = user?.role === 'cashier'
    ? { userRole: 'Cashier', sidebarItems: cashierSidebarSections, onLogout: handleLogout, customTitle: 'TCMS', customSubtitle: `Cashier Dashboard - ${user?.name || 'Cashier'}` }
    : { userRole: 'Administrator', sidebarItems: adminSidebarSections };

  const base = user?.role === 'cashier' ? '/cashier' : '/admin';

  return (
    <DashboardLayout {...layoutProps}>
      <div className="w-full max-w-25xl bg-white rounded-lg shadow p-4 mx-auto">
        <div className="flex gap-4 mb-6 border-b">
          <NavLink
            to={`${base}/classes/create`}
            className={({ isActive }) =>
              `px-4 py-2 font-bold text-base focus:outline-none border-b-2 transition-colors ${
                isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600'
              }`
            }
          >
            Create Class
          </NavLink>
          {/* <NavLink
            to="/admin/classes/schedule"
            className={({ isActive }) =>
              `px-4 py-2 font-bold text-base focus:outline-none border-b-2 transition-colors ${
                isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600'
              }`
            }
          >
            Class Session Scheduling
          </NavLink> */}
        </div>
        <div>
          <Outlet />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClassTabsPage; 
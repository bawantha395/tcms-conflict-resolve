import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import DashboardLayout from '../../../components/layout/DashboardLayout';
import adminSidebarSections from '../../dashboard/adminDashboard/AdminDashboardSidebar';
import cashierSidebarSections from '../cashierDashboard/CashierDashboardSidebar';
import { getUserData, logout as authLogout } from '../../../api/apiUtils';

const StudentTabsPage = () => {
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
    <DashboardLayout {...layoutProps} >
      <div className="w-full max-w-25xl bg-white rounded-lg shadow p-4 mx-auto">
        <div className="flex gap-4 mb-6 border-b">
          <NavLink
           to={`${base}/students/enrollment`}
            className={({ isActive }) => 
              `px-4 py-2 font-bold text-base focus:outline-none border-b-2 transition-colors ${
                isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600'
              }`
            }
          >
            Student Enrollment
          </NavLink>
           <NavLink
                      to={`${base}/students/purchased-classes`}
            className={({ isActive }) => 
              `px-4 py-2 font-bold text-base focus:outline-none border-b-2 transition-colors ${
                isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600'
              }`
            }
          >
            Purchased Classes
          </NavLink>
        </div>
        <div>
          <Outlet />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentTabsPage;

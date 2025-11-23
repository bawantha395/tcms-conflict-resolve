import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import adminSidebarSections from './AdminDashboardSidebar';

const CashiersTabsPage = () => {
  return (
    <DashboardLayout userRole="Administrator" sidebarItems={adminSidebarSections} >
      <div className="w-full max-w-25xl bg-white rounded-lg shadow p-4 mx-auto">
        <div className="flex gap-4 mb-6 border-b">
          <NavLink
            to="/admin/cashiers/info"
            className={({ isActive }) => 
              `px-4 py-2 font-bold text-base focus:outline-none border-b-2 transition-colors ${
                isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600'
              }`
            }
          >
            Cashiers Info
          </NavLink>
          <NavLink
            to="/admin/cashiers/create"
            className={({ isActive }) => 
              `px-4 py-2 font-bold text-base focus:outline-none border-b-2 transition-colors ${
                isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600'
              }`
            }
          >
            Create Cashier Login
          </NavLink>
        </div>
        <div>
          <Outlet />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CashiersTabsPage;

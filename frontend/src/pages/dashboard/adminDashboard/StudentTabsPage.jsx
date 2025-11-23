import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import DashboardLayout from '../../../components/layout/DashboardLayout';
import adminSidebarSections from '../../dashboard/adminDashboard/AdminDashboardSidebar';

const StudentTabsPage = () => {
  return (
    <DashboardLayout userRole="Administrator" sidebarItems={adminSidebarSections} >
      <div className="w-full max-w-25xl bg-white rounded-lg shadow p-4 mx-auto">
        <div className="flex gap-4 mb-6 border-b">
          <NavLink
            to="/admin/students/enrollment"
            className={({ isActive }) => 
              `px-4 py-2 font-bold text-base focus:outline-none border-b-2 transition-colors ${
                isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600'
              }`
            }
          >
            Student Enrollment
          </NavLink>
          <NavLink
            to="/admin/students/physical"
            className={({ isActive }) => 
              `px-4 py-2 font-bold text-base focus:outline-none border-b-2 transition-colors ${
                isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600'
              }`
            }
          >
            Physical Student Registration
          </NavLink>
          <NavLink
            to="/admin/students/purchased-classes"
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

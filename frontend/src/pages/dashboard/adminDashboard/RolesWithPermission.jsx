import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import adminSidebarSections from './AdminDashboardSidebar';
import BasicForm from '../../../components/BasicForm';
import CustomTextField from '../../../components/CustomTextField';
import CustomButton from '../../../components/CustomButton';
import BasicCard from '../../../components/BasicCard';
import BasicCheckbox from '../../../components/BasicCheckbox';
import BasicAlertBox from '../../../components/BasicAlertBox';

const mockPermissions = [
  'View Dashboard',
  'Manage Users',
  'Edit Classes',
  'View Finance',
  'Send Announcements',
  'Access Reports',
];

const PERMISSIONS_STORAGE_KEY = 'role_permissions_data';

const RolesWithPermission = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const roleData = location.state?.role || {};
  // Load permissions for this role from localStorage if available
  const storedPermissions = (() => {
    const all = JSON.parse(localStorage.getItem(PERMISSIONS_STORAGE_KEY) || '{}');
    return all[roleData.id] || [];
  })();
  const [checked, setChecked] = useState(storedPermissions);
  const [alertOpen, setAlertOpen] = useState(false);

  const handleCheck = (perm) => {
    setChecked(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleSave = (values) => {
    setAlertOpen(true);
  };

  const confirmSave = () => {
    const all = JSON.parse(localStorage.getItem(PERMISSIONS_STORAGE_KEY) || '{}');
    all[roleData.id] = checked;
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(all));
    setAlertOpen(false);
    navigate('/admin/roles');
  };

  return (
    <DashboardLayout sidebarItems={adminSidebarSections}>
      <div className="w-full max-w-25xl mx-auto bg-white p-8 rounded-lg shadow mt-10">
        <h1 className="text-2xl font-bold mb-4">Roles with Permissions</h1>
          <BasicForm
            initialValues={{
              roleId: roleData.id || '',
              roleName: roleData.name || '',
              description: roleData.description || '',
            }}
            validationSchema={null}
            onSubmit={handleSave}
          >
            {({ values, handleChange, errors, touched }) => (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <CustomTextField
                    id="roleId"
                    name="roleId"
                    label="Role Id"
                    value={values.roleId}
                    onChange={handleChange}
                    disabled
                  />
                  <CustomTextField
                    id="roleName"
                    name="roleName"
                    label="Role Name"
                    value={values.roleName}
                    onChange={handleChange}
                    disabled
                  />
                  <CustomTextField
                    id="description"
                    name="description"
                    label="Description"
                    value={values.description}
                    onChange={handleChange}
                    as="textarea"
                    disabled
                  />
                </div>
                <div className="mb-4 mt-6">
                  <label className="block font-semibold mb-2">Assign Permissions</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {mockPermissions.map((perm, idx) => (
                      <BasicCheckbox
                        key={perm}
                        id={`perm_${idx}`}
                        name="permissions"
                        checked={checked.includes(perm)}
                        onChange={() => handleCheck(perm)}
                        label={perm}
                      />
                    ))}
                  </div>
                </div>
                <hr className="my-6 border-t border-gray-300" />
                <div className="flex flex-row gap-4 mt-0 mb-2">
                  <CustomButton className="w-1/2 py-2.5 px-4 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 shadow-md hover:shadow-xl"
                  type="button" onClick={() => window.history.back()}>
                    Back
                  </CustomButton>
                  <CustomButton type="submit"
                  className="w-1/2 py-2.5 px-4 bg-[#1a365d] text-white text-xs font-bold rounded-lg hover:bg-[#13294b] active:bg-[#0f2038] focus:outline-none focus:ring-2 focus:ring-[#1a365d] focus:ring-opacity-50 shadow-md hover:shadow-xl"
                  >
                    Save 
                  </CustomButton>
                </div>
                <BasicAlertBox
                  open={alertOpen}
                  message="Are you sure you want to save these permissions?"
                  onConfirm={confirmSave}
                  onCancel={() => setAlertOpen(false)}
                  confirmText="Save"
                  cancelText="Cancel"
                  type="success"
                />
              </>
            )}
          </BasicForm>
      </div>
    </DashboardLayout>
  );
};

export default RolesWithPermission;

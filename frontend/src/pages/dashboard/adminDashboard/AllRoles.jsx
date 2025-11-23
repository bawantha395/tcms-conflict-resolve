import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import AdminDashboardSidebar from './AdminDashboardSidebar';
import BasicTable from '../../../components/BasicTable';
import { FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import CustomButton from '../../../components/CustomButton';
import BasicAlertBox from '../../../components/BasicAlertBox';
import BasicForm from '../../../components/BasicForm';
import CustomTextField from '../../../components/CustomTextField';
import BasicButton from '../../../components/CustomButton';
import { useNavigate } from 'react-router-dom';
import { roleApi } from '../../../utils/roles';
import { getCurrentUserPermissions } from '../../../utils/permissionChecker';
import { getUserData } from '../../../api/apiUtils';

const columns = [
  { key: 'id', label: 'Role Id' },
  { key: 'name', label: 'Role Name' },
  { key: 'description', label: 'Description' },
];

const roleTypes = [
  { value: 'core admin', label: 'Core Admin' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'student', label: 'Student' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'teacher_staff', label: 'Teacher Staff' },
];

const AllRoles = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [updateAlertOpen, setUpdateAlertOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  // Fetch roles and user permissions on component mount
  useEffect(() => {
    fetchRoles();
    fetchUserPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const rolesData = await roleApi.getAllRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPermissions = async () => {
    try {
      setPermissionsLoading(true);
      const user = getUserData();
      if (user?.userid) {
        const perms = await getCurrentUserPermissions(user.userid);
        setUserPermissions(perms);
      }
    } catch (error) {
      console.error('Failed to fetch user permissions:', error);
    } finally {
      setPermissionsLoading(false);
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setAlertOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await roleApi.deleteRole(deleteId);
      setRoles(prev => prev.filter(role => role.id !== deleteId));
      setAlertOpen(false);
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting role:', error);
      // Show error alert
      setAlertOpen(false);
      // You might want to add error handling here
    }
  };

  const handleAddNew = () => {
    setEditRole(null);
    setFormOpen(true);
  };

  const handleEdit = (role) => {
    setEditRole(role);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values, { resetForm }) => {
    try {
      if (editRole) {
        // Show alert before updating
        setPendingUpdate({ values, resetForm });
        setUpdateAlertOpen(true);
      } else {
        await roleApi.createRole({ name: values.name, description: values.description, permission_ids: [] });
        setFormOpen(false);
        setEditRole(null);
        resetForm && resetForm();
        // Refresh roles
        fetchRoles();
      }
    } catch (error) {
      console.error('Error creating role:', error);
      // Handle error
    }
  };

  const confirmUpdate = async () => {
    if (pendingUpdate && editRole) {
      try {
        await roleApi.updateRole(editRole.id, { name: pendingUpdate.values.name, description: pendingUpdate.values.description, permission_ids: [] });
        setFormOpen(false);
        setEditRole(null);
        pendingUpdate.resetForm && pendingUpdate.resetForm();
        // Refresh roles
        fetchRoles();
      } catch (error) {
        console.error('Error updating role:', error);
      }
    }
    setUpdateAlertOpen(false);
    setPendingUpdate(null);
  };

  return (
    <DashboardLayout sidebarItems={AdminDashboardSidebar(userPermissions)}>
      <div className="w-full max-w-25xl bg-white rounded-lg shadow p-4 mx-auto">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold">All Roles</h1>
          <CustomButton style={{ maxWidth: 180 }} onClick={handleAddNew}>Add New Role</CustomButton>
        </div>
        <BasicTable
          columns={columns}
          data={roles}
          actions={row => (
            <div className="flex gap-2">
              <button
                className="text-blue-600 hover:text-blue-800 p-2 rounded-full"
                title="Edit"
                onClick={() => handleEdit(row)}
              >
                <FaEdit />
              </button>
              <button
                className="text-red-600 hover:text-red-800 p-2 rounded-full"
                title="Delete"
                onClick={() => handleDelete(row.id)}
              >
                <FaTrash />
              </button>
              <button
                className="text-green-600 hover:text-green-800 p-2 rounded-full"
                title="Permissions"
                onClick={() => navigate('/admin/roles/permissions', { state: { role: row } })}
              >
                <span className="font-bold">P</span>
              </button>
            </div>
          )}
        />
        <BasicAlertBox
          open={alertOpen}
          message="Are you sure you want to delete this role?"
          onConfirm={confirmDelete}
          onCancel={() => setAlertOpen(false)}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
        {/* Alert for update confirmation */}
        <BasicAlertBox
          open={updateAlertOpen}
          message="Are you sure you want to update this role?"
          onConfirm={confirmUpdate}
          onCancel={() => { setUpdateAlertOpen(false); setPendingUpdate(null); }}
          confirmText="Update"
          cancelText="Cancel"
          type="success"
        />

        {/* Popup Form for Add/Edit Role */}
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
              <button
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
                onClick={() => { setFormOpen(false); setEditRole(null); }}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className="text-xl font-bold mb-4">{editRole ? 'Edit Role' : 'Add New Role'}</h2>
              <BasicForm
                initialValues={{
                  name: editRole ? editRole.name : '',
                  description: editRole ? editRole.description : '',
                }}
                validationSchema={null}
                onSubmit={handleFormSubmit}
              >
                {({ values, handleChange }) => (
                  <>
                    {editRole && (
                      <CustomTextField
                        id="id"
                        name="id"
                        label="Role Id"
                        value={editRole.id}
                        onChange={() => {}}
                        disabled
                      />
                    )}
                    <CustomTextField
                      id="name"
                      name="name"
                      label="Role Name"
                      value={values.name}
                      onChange={handleChange}
                    />
                    <CustomTextField
                      id="description"
                      name="description"
                      label="Description"
                      value={values.description}
                      onChange={handleChange}
                    />
                    <BasicButton type="submit" style={{ marginTop: 16 }}>
                      {editRole ? 'Update Role' : 'Create Role'}
                    </BasicButton>
                  </>
                )}
              </BasicForm>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AllRoles;

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import AdminDashboardSidebar from './AdminDashboardSidebar';
import BasicTable from '../../../components/BasicTable';
import { FaPlus, FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import CustomButton from '../../../components/CustomButton';
import BasicAlertBox from '../../../components/BasicAlertBox';
import BasicForm from '../../../components/BasicForm';
import CustomTextField from '../../../components/CustomTextField';
import CustomSelectField from '../../../components/CustomSelectField';
import BasicButton from '../../../components/CustomButton';
import { permissionApi } from '../../../utils/permissions';
import { getCurrentUserPermissions } from '../../../utils/permissionChecker';
import { getUserData } from '../../../api/apiUtils';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Permission Name' },
  { key: 'target_user_role', label: 'Target User Role' },
  { key: 'description', label: 'Description' },
  { key: 'created_at', label: 'Created At' },
];

const targetUserRoles = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'admin', label: 'Admin' },
  { value: 'cashier', label: 'Cashier' },
];

const PermissionManagement = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [permissionToDelete, setPermissionToDelete] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  // Fetch permissions on component mount
  useEffect(() => {
    fetchPermissions();
    fetchUserPermissions();
  }, []);

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

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const permissions = await permissionApi.getAllPermissions();
      setPermissions(permissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setAlertMessage('Failed to load permissions. Please try again.');
      setAlertType('error');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setIsEditMode(false);
    setSelectedPermission(null);
    setFormOpen(true);
  };

  const handleEditPermission = (permission) => {
    setIsEditMode(true);
    setSelectedPermission(permission);
    setFormOpen(true);
  };

  const handleDeletePermission = (permission) => {
    setPermissionToDelete(permission);
    setDeleteConfirmOpen(true);
  };

  const confirmDeletePermission = async () => {
    if (!permissionToDelete) return;

    try {
      setSubmitting(true);

      await permissionApi.deletePermission(permissionToDelete.id);

      setAlertMessage('Permission deleted successfully!');
      setAlertType('success');
      setAlertOpen(true);
      setDeleteConfirmOpen(false);
      setPermissionToDelete(null);

      // Refresh permissions list
      fetchPermissions();

    } catch (error) {
      console.error('Error deleting permission:', error);
      setAlertMessage(error.message || 'Failed to delete permission. Please try again.');
      setAlertType('error');
      setAlertOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = async (values, { resetForm }) => {
    try {
      setSubmitting(true);

      const permissionData = {
        name: values.name,
        target_user_role: values.target_user_role,
        description: values.description,
      };

      if (isEditMode) {
        await permissionApi.updatePermission(selectedPermission.id, permissionData);
        setAlertMessage('Permission updated successfully!');
      } else {
        await permissionApi.createPermission(permissionData);
        setAlertMessage('Permission created successfully!');
      }

      setAlertType('success');
      setAlertOpen(true);
      setFormOpen(false);
      setIsEditMode(false);
      setSelectedPermission(null);
      resetForm && resetForm();

      // Refresh permissions list
      fetchPermissions();

    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} permission:`, error);
      setAlertMessage(error.message || `Failed to ${isEditMode ? 'update' : 'create'} permission. Please try again.`);
      setAlertType('error');
      setAlertOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout sidebarItems={AdminDashboardSidebar(userPermissions)}>
      <div className="w-full max-w-25xl bg-white rounded-lg shadow p-4 mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Permission Management</h1>
            <p className="text-gray-600 mt-1">Create and manage system permissions</p>
          </div>
          <CustomButton
            style={{ maxWidth: 200 }}
            onClick={handleAddNew}
            className="flex items-center gap-2"
          >
            <FaPlus className="h-4 w-4" />
            Create Permission
          </CustomButton>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading permissions...</span>
          </div>
        ) : (
          <BasicTable
            columns={columns}
            data={permissions.map(permission => ({
              ...permission,
              target_user_role: permission.target_userrole || permission.target_user_role,
              created_at: formatDate(permission.created_at),
            }))}
            actions={row => (
              <div className="flex gap-2">
                <button
                  className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50"
                  title="View Details"
                  onClick={() => {
                    // For now, just show an alert with details
                    alert(`Permission Details:\n\nID: ${row.id}\nName: ${row.name}\nTarget Role: ${row.target_user_role}\nDescription: ${row.description}\nCreated: ${row.created_at}`);
                  }}
                >
                  <FaEye />
                </button>
                <button
                  className="text-green-600 hover:text-green-800 p-2 rounded-full hover:bg-green-50"
                  title="Edit Permission"
                  onClick={() => handleEditPermission(row)}
                >
                  <FaEdit />
                </button>
                <button
                  className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50"
                  title="Delete Permission"
                  onClick={() => handleDeletePermission(row)}
                >
                  <FaTrash />
                </button>
              </div>
            )}
          />
        )}

        {/* Success/Error Alert */}
        <BasicAlertBox
          open={alertOpen}
          message={alertMessage}
          onConfirm={() => setAlertOpen(false)}
          onCancel={() => setAlertOpen(false)}
          confirmText="OK"
          cancelText="OK"
          type={alertType}
        />

        {/* Create/Edit Permission Form Modal */}
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl font-bold"
                onClick={() => {
                  setFormOpen(false);
                  setIsEditMode(false);
                  setSelectedPermission(null);
                }}
                aria-label="Close"
              >
                ×
              </button>

              <h2 className="text-xl font-bold mb-4 text-gray-800">
                {isEditMode ? 'Edit Permission' : 'Create New Permission'}
              </h2>

              <BasicForm
                initialValues={{
                  name: isEditMode ? selectedPermission?.name || '' : '',
                  target_user_role: isEditMode ? selectedPermission?.target_user_role || '' : '',
                  description: isEditMode ? selectedPermission?.description || '' : '',
                }}
                validationSchema={null}
                onSubmit={handleFormSubmit}
              >
                {({ values, handleChange }) => (
                  <div className="space-y-4">
                    <CustomTextField
                      id="name"
                      name="name"
                      label="Permission Name"
                      value={values.name}
                      onChange={handleChange}
                      placeholder="e.g., manage_users"
                      required
                    />

                    <CustomSelectField
                      id="target_user_role"
                      name="target_user_role"
                      label="Target User Role"
                      value={values.target_user_role}
                      onChange={handleChange}
                      options={targetUserRoles}
                      placeholder="Select target user role"
                      required
                    />

                    <CustomTextField
                      id="description"
                      name="description"
                      label="Description"
                      value={values.description}
                      onChange={handleChange}
                      placeholder="Describe what this permission allows"
                      multiline
                      rows={3}
                      required
                    />

                    <div className="flex gap-3 pt-4">
                      <BasicButton
                        type="button"
                        onClick={() => {
                          setFormOpen(false);
                          setIsEditMode(false);
                          setSelectedPermission(null);
                        }}
                        style={{
                          backgroundColor: '#6b7280',
                          borderColor: '#6b7280',
                          flex: 1
                        }}
                      >
                        Cancel
                      </BasicButton>

                      <BasicButton
                        type="submit"
                        disabled={submitting}
                        style={{
                          backgroundColor: '#2563eb',
                          borderColor: '#2563eb',
                          flex: 1
                        }}
                      >
                        {submitting ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {isEditMode ? 'Updating...' : 'Creating...'}
                          </div>
                        ) : (
                          isEditMode ? 'Update Permission' : 'Create Permission'
                        )}
                      </BasicButton>
                    </div>
                  </div>
                )}
              </BasicForm>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirmOpen && permissionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Confirm Delete</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the permission <strong>"{permissionToDelete.name}"</strong>?
                This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <BasicButton
                  type="button"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setPermissionToDelete(null);
                  }}
                  style={{
                    backgroundColor: '#6b7280',
                    borderColor: '#6b7280',
                    flex: 1
                  }}
                >
                  Cancel
                </BasicButton>

                <BasicButton
                  type="button"
                  onClick={confirmDeletePermission}
                  disabled={submitting}
                  style={{
                    backgroundColor: '#dc2626',
                    borderColor: '#dc2626',
                    flex: 1
                  }}
                >
                  {submitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </div>
                  ) : (
                    'Delete Permission'
                  )}
                </BasicButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PermissionManagement;
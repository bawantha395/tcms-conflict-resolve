import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import AdminDashboardSidebar from './AdminDashboardSidebar';
import BasicTable from '../../../components/BasicTable';
import { FaPlus, FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import CustomButton from '../../../components/CustomButton';
import BasicAlertBox from '../../../components/BasicAlertBox';
import BasicForm from '../../../components/BasicForm';
import CustomTextField from '../../../components/CustomTextField';
//import CustomSelectField from '../../../components/CustomSelectField';
import BasicButton from '../../../components/CustomButton';
import BasicCheckbox from '../../../components/BasicCheckbox';
import { roleApi } from '../../../utils/roles';
import { permissionApi } from '../../../utils/permissions';
import { getCurrentUserPermissions } from '../../../utils/permissionChecker';
import { getUserData } from '../../../api/apiUtils';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Role Name' },
  { key: 'description', label: 'Description' },
  { key: 'permissions_count', label: 'Permissions' },
  { key: 'created_at', label: 'Created At' },
];

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  // Fetch roles, permissions, and user permissions on component mount
  useEffect(() => {
    fetchRoles();
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

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const roles = await roleApi.getAllRoles();
      setRoles(roles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setAlertMessage('Failed to load roles. Please try again.');
      setAlertType('error');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const permissions = await permissionApi.getAllPermissions();
      setPermissions(permissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const handleAddNew = () => {
    // Ensure permissions are loaded before opening form
    if (permissions.length === 0) {
      fetchPermissions().then(() => {
        setIsEditMode(false);
        setSelectedRole(null);
        setSelectedPermissions([]);
        setFormOpen(true);
      });
    } else {
      setIsEditMode(false);
      setSelectedRole(null);
      setSelectedPermissions([]);
      setFormOpen(true);
    }
  };

  const handleEditRole = (role) => {
    // Ensure permissions are loaded before opening form
    if (permissions.length === 0) {
      fetchPermissions().then(() => {
        setSelectedRole(role);
        setIsEditMode(true);
        
        // Set permissions immediately - ensure IDs are numbers
        const permissionIds = role.permissions?.map(p => Number(p.id)) || [];
        setSelectedPermissions(permissionIds);
        
        // Open form after state is set
        setTimeout(() => setFormOpen(true), 0);
      });
    } else {
      setSelectedRole(role);
      setIsEditMode(true);
      
      // Set permissions immediately - ensure IDs are numbers
      const permissionIds = role.permissions?.map(p => Number(p.id)) || [];
      setSelectedPermissions(permissionIds);
      
      // Open form after state is set
      setTimeout(() => setFormOpen(true), 0);
    }
  };

  const handleDeleteRole = (role) => {
    setRoleToDelete(role);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
      setSubmitting(true);

      await roleApi.deleteRole(roleToDelete.id);

      setAlertMessage('Role deleted successfully!');
      setAlertType('success');
      setAlertOpen(true);
      setDeleteConfirmOpen(false);
      setRoleToDelete(null);

      // Refresh roles list
      fetchRoles();

    } catch (error) {
      console.error('Error deleting role:', error);
      setAlertMessage(error.message || 'Failed to delete role. Please try again.');
      setAlertType('error');
      setAlertOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = async (values, { resetForm }) => {
    try {
      setSubmitting(true);

      const roleData = {
        name: values.name,
        description: values.description,
        permission_ids: selectedPermissions,
      };

      if (isEditMode) {
        await roleApi.updateRole(selectedRole.id, roleData);
        setAlertMessage('Role updated successfully!');
      } else {
        await roleApi.createRole(roleData);
        setAlertMessage('Role created successfully!');
      }

      setAlertType('success');
      setAlertOpen(true);
      setFormOpen(false);
      setIsEditMode(false);
      setSelectedRole(null);
      setSelectedPermissions([]);
      resetForm && resetForm();

      // Refresh roles list
      fetchRoles();

    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} role:`, error);
      setAlertMessage(error.message || `Failed to ${isEditMode ? 'update' : 'create'} role. Please try again.`);
      setAlertType('error');
      setAlertOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePermissionToggle = (permissionId) => {
    const id = Number(permissionId);
    setSelectedPermissions(prev =>
      prev.includes(id)
        ? prev.filter(permId => permId !== id)
        : [...prev, id]
    );
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
            <h1 className="text-2xl font-bold text-gray-800">Role Management</h1>
            <p className="text-gray-600 mt-1">Create and manage system roles with permissions</p>
          </div>
          <CustomButton
            style={{ maxWidth: 200 }}
            onClick={handleAddNew}
            className="flex items-center gap-2"
          >
            <FaPlus className="h-4 w-4" />
            Create Role
          </CustomButton>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading roles...</span>
          </div>
        ) : (
          <BasicTable
            columns={columns}
            data={roles.map(role => ({
              ...role,
              permissions_count: role.permissions?.length || 0,
              created_at: formatDate(role.created_at),
            }))}
            actions={row => (
              <div className="flex gap-2">
                <button
                  className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50"
                  title="View Details"
                  onClick={() => {
                    const permissionsList = row.permissions?.map(p => p.name).join(', ') || 'None';
                    alert(`Role Details:\n\nID: ${row.id}\nName: ${row.name}\nDescription: ${row.description}\nPermissions (${row.permissions?.length || 0}): ${permissionsList}\nCreated: ${row.created_at}`);
                  }}
                >
                  <FaEye />
                </button>
                <button
                  className="text-green-600 hover:text-green-800 p-2 rounded-full hover:bg-green-50"
                  title="Edit Role"
                  onClick={() => handleEditRole(row)}
                >
                  <FaEdit />
                </button>
                <button
                  className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50"
                  title="Delete Role"
                  onClick={() => handleDeleteRole(row)}
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

        {/* Create/Edit Role Form Modal */}
        {formOpen && (
          <div key={`form-${selectedPermissions.join(',')}`} className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl font-bold"
                onClick={() => {
                  setFormOpen(false);
                  setIsEditMode(false);
                  setSelectedRole(null);
                  setSelectedPermissions([]);
                }}
                aria-label="Close"
              >
                ×
              </button>

              <h2 className="text-xl font-bold mb-4 text-gray-800">
                {isEditMode ? 'Edit Role' : 'Create New Role'}
              </h2>

              <BasicForm
                initialValues={{
                  name: isEditMode ? selectedRole?.name || '' : '',
                  description: isEditMode ? selectedRole?.description || '' : '',
                }}
                validationSchema={null}
                onSubmit={handleFormSubmit}
              >
                {({ values, handleChange }) => (
                  <div className="space-y-4">
                    <CustomTextField
                      id="name"
                      name="name"
                      label="Role Name"
                      value={values.name}
                      onChange={handleChange}
                      placeholder="e.g., content_manager"
                      required
                    />

                    <CustomTextField
                      id="description"
                      name="description"
                      label="Description"
                      value={values.description}
                      onChange={handleChange}
                      placeholder="Describe what this role can do"
                      multiline
                      rows={3}
                      required
                    />

                    <div className="border-t pt-4">
                      <h3 className="text-lg font-semibold mb-3 text-gray-800">Assign Permissions</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {permissions
                          .filter(permission => {
                            // Filter permissions based on target user role
                            if (!isEditMode || !selectedRole) return true; // Show all for new roles
                            
                            const roleName = selectedRole.name.toLowerCase();
                            const targetRole = permission.target_userrole || permission.target_user_role;
                            
                            // Admin can see all permissions
                            if (roleName === 'admin') return true;
                            
                            // Otherwise, show only permissions for the matching target user role
                            return targetRole && targetRole.toLowerCase() === roleName;
                          })
                          .map(permission => (
                          <div key={permission.id} className="flex items-start space-x-2">
                            <BasicCheckbox
                              id={`permission-${permission.id}`}
                              checked={selectedPermissions.includes(Number(permission.id))}
                              onChange={() => handlePermissionToggle(permission.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <label
                                htmlFor={`permission-${permission.id}`}
                                className="text-sm font-medium text-gray-700 cursor-pointer block"
                              >
                                {permission.name}
                              </label>
                              <p className="text-xs text-gray-500">{permission.description}</p>
                              <p className="text-xs text-gray-400">Target: {permission.target_userrole || permission.target_user_role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {permissions.filter(permission => {
                        if (!isEditMode || !selectedRole) return true;
                        const roleName = selectedRole.name.toLowerCase();
                        const targetRole = permission.target_userrole || permission.target_user_role;
                        if (roleName === 'admin') return true;
                        return targetRole && targetRole.toLowerCase() === roleName;
                      }).length === 0 && (
                        <p className="text-gray-500 text-sm">No permissions available for this role type. Create permissions first.</p>
                      )}
                    </div>

                    <div className="flex gap-3 pt-4">
                      <BasicButton
                        type="button"
                        onClick={() => {
                          setFormOpen(false);
                          setIsEditMode(false);
                          setSelectedRole(null);
                          setSelectedPermissions([]);
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
                          isEditMode ? 'Update Role' : 'Create Role'
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
        {deleteConfirmOpen && roleToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Confirm Delete</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the role <strong>"{roleToDelete.name}"</strong>?
                This will also remove all permission assignments for this role. This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <BasicButton
                  type="button"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setRoleToDelete(null);
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
                  onClick={confirmDeleteRole}
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
                    'Delete Role'
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

export default RoleManagement;
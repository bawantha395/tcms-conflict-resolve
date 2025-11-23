import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import AdminDashboardSidebar from './AdminDashboardSidebar';
import BasicAlertBox from '../../../components/BasicAlertBox';
import BasicButton from '../../../components/CustomButton';
import BasicCheckbox from '../../../components/BasicCheckbox';
import { userApi } from '../../../utils/users';
import { roleApi } from '../../../utils/roles';
import { getCurrentUserPermissions } from '../../../utils/permissionChecker';
import { getUserData } from '../../../api/apiUtils';
import { FaUserMinus } from 'react-icons/fa';

const UserRoleAssignment = () => {
  const [roles, setRoles] = useState([]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [selectedRolesToAssign, setSelectedRolesToAssign] = useState([]);
  const [searchUserId, setSearchUserId] = useState('');
  const [searchingUser, setSearchingUser] = useState(false);
  const [userPermissions, setUserPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  // Fetch roles on component mount
  useEffect(() => {
    fetchRoles();
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
      const roles = await roleApi.getAllRoles();
      setRoles(roles);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const searchUser = async () => {
    if (!searchUserId.trim()) {
      setAlertMessage('Please enter a User ID');
      setAlertType('error');
      setAlertOpen(true);
      return;
    }

    try {
      setSearchingUser(true);
      const user = await userApi.getUserById(searchUserId.trim());
      setSelectedUser(user);
      setUserFormOpen(true);

      // Fetch user's current roles
      const userRoles = await userApi.getUserRoles(searchUserId.trim());
      setUserRoles(userRoles);

      // Determine available roles (not already assigned as RBAC roles)
      const assignedRbacRoles = userRoles.filter(role => !role.is_inherent);
      const assignedRoleIds = assignedRbacRoles.map(role => role.role_id);
      const available = roles.filter(role => !assignedRoleIds.includes(role.id));
      setAvailableRoles(available);
      setSelectedRolesToAssign([]);

    } catch (error) {
      console.error('Error searching user:', error);
      setAlertMessage(error.message || 'User not found. Please check the User ID.');
      setAlertType('error');
      setAlertOpen(true);
    } finally {
      setSearchingUser(false);
    }
  };

  const handleAssignRoles = async () => {
    if (!selectedUser || selectedRolesToAssign.length === 0) return;

    try {
      setSubmitting(true);

      // Assign each selected role
      for (const roleId of selectedRolesToAssign) {
        await userApi.assignRoleToUser(selectedUser.userid, roleId);
      }

      setAlertMessage(`Successfully assigned ${selectedRolesToAssign.length} role(s) to ${selectedUser.firstName} ${selectedUser.lastName}!`);
      setAlertType('success');
      setAlertOpen(true);

      // Refresh user roles
      const updatedRoles = await userApi.getUserRoles(selectedUser.userid);
      setUserRoles(updatedRoles);

      // Update available roles (exclude already assigned RBAC roles)
      const assignedRbacRoles = updatedRoles.filter(role => !role.is_inherent);
      const assignedRoleIds = assignedRbacRoles.map(role => role.role_id);
      const available = roles.filter(role => !assignedRoleIds.includes(role.id));
      setAvailableRoles(available);
      setSelectedRolesToAssign([]);

    } catch (error) {
      console.error('Error assigning roles:', error);
      setAlertMessage(error.message || 'Failed to assign roles. Please try again.');
      setAlertType('error');
      setAlertOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeRole = async (roleId) => {
    if (!selectedUser) return;

    try {
      setSubmitting(true);

      await userApi.revokeRoleFromUser(selectedUser.userid, roleId);

      setAlertMessage('Role revoked successfully!');
      setAlertType('success');
      setAlertOpen(true);

      // Refresh user roles
      const updatedRoles = await userApi.getUserRoles(selectedUser.userid);
      setUserRoles(updatedRoles);

      // Update available roles (exclude already assigned RBAC roles)
      const assignedRbacRoles = updatedRoles.filter(role => !role.is_inherent);
      const assignedRoleIds = assignedRbacRoles.map(role => role.role_id);
      const available = roles.filter(role => !assignedRoleIds.includes(role.id));
      setAvailableRoles(available);

    } catch (error) {
      console.error('Error revoking role:', error);
      setAlertMessage(error.message || 'Failed to revoke role. Please try again.');
      setAlertType('error');
      setAlertOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleToggle = (roleId) => {
    const id = Number(roleId);
    setSelectedRolesToAssign(prev =>
      prev.includes(id)
        ? prev.filter(roleId => roleId !== id)
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
      <div className="w-full max-w-4xl bg-white rounded-lg shadow p-6 mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">User Role Assignment</h1>
          <p className="text-gray-600 mt-1">Search for a user by ID and manage their roles</p>
        </div>

        {/* User Search Section */}
        <div className="bg-gray-50 rounded-lg p-8 mb-6">
          <div className="flex flex-col gap-6">
            <div className="w-full">
              <label htmlFor="userId" className="block text-base font-medium text-gray-700 mb-3">
                User ID
              </label>
              <input
                type="text"
                id="userId"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
                placeholder="Enter User ID (e.g., STUD001, TEACH001)"
                className="w-full px-6 py-4 text-xl border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
                onKeyPress={(e) => e.key === 'Enter' && searchUser()}
                autoFocus
              />
            </div>
            <div className="flex justify-center">
              <BasicButton
                type="button"
                onClick={searchUser}
                disabled={searchingUser}
                style={{
                  backgroundColor: '#2563eb',
                  borderColor: '#2563eb',
                  padding: '1rem 3rem',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  borderRadius: '0.5rem'
                }}
              >
                {searchingUser ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Searching...
                  </div>
                ) : (
                  'Search User'
                )}
              </BasicButton>
            </div>
          </div>
        </div>

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

        {/* Manage User Roles Modal */}
        {userFormOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl relative max-h-[90vh] overflow-y-auto">
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl font-bold"
                onClick={() => {
                  setUserFormOpen(false);
                  setSelectedUser(null);
                  setUserRoles([]);
                  setAvailableRoles([]);
                  setSelectedRolesToAssign([]);
                }}
                aria-label="Close"
              >
                ×
              </button>

              {/* User Info Header */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  Manage Roles for {selectedUser.firstName} {selectedUser.lastName}
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">User ID:</span> {selectedUser.userid}
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Email:</span> {selectedUser.email}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current Roles */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">Current Roles</h3>
                  {userRoles.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {userRoles.map(role => (
                        <div key={role.id || role.role_name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-800">{role.role_name || role.name}</p>
                            <p className="text-sm text-gray-600">{role.role_description || role.description}</p>
                            <p className="text-xs text-gray-500">
                              {role.is_inherent ? 'System Role' : `Assigned: ${formatDate(role.assigned_at)}`}
                            </p>
                          </div>
                          {!role.is_inherent && (
                            <button
                              className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50"
                              title="Revoke Role"
                              onClick={() => handleRevokeRole(role.role_id)}
                              disabled={submitting}
                            >
                              <FaUserMinus />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No roles assigned to this user.</p>
                  )}
                </div>

                {/* Assign New Roles */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Assign New Roles</h3>
                    {selectedRolesToAssign.length > 0 && (
                      <BasicButton
                        type="button"
                        onClick={handleAssignRoles}
                        disabled={submitting}
                        style={{
                          backgroundColor: '#2563eb',
                          borderColor: '#2563eb',
                          padding: '0.5rem 1rem',
                          fontSize: '0.875rem'
                        }}
                      >
                        {submitting ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                            Assigning...
                          </div>
                        ) : (
                          `Assign ${selectedRolesToAssign.length} Role(s)`
                        )}
                      </BasicButton>
                    )}
                  </div>
                  {availableRoles.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {availableRoles.map(role => (
                        <div key={role.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                          <BasicCheckbox
                            id={`role-${role.id}`}
                            checked={selectedRolesToAssign.includes(Number(role.id))}
                            onChange={() => handleRoleToggle(role.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={`role-${role.id}`}
                              className="text-sm font-medium text-gray-700 cursor-pointer block"
                            >
                              {role.name}
                            </label>
                            <p className="text-xs text-gray-500">{role.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">All available roles are already assigned to this user.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <BasicButton
                  type="button"
                  onClick={() => {
                    setUserFormOpen(false);
                    setSelectedUser(null);
                    setUserRoles([]);
                    setAvailableRoles([]);
                    setSelectedRolesToAssign([]);
                  }}
                  style={{
                    backgroundColor: '#6b7280',
                    borderColor: '#6b7280',
                  }}
                >
                  Close
                </BasicButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UserRoleAssignment;
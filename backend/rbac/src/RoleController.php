<?php
// Set timezone for all date/time operations
date_default_timezone_set('Asia/Colombo');

require_once __DIR__ . '/RoleModel.php';

require_once __DIR__ . '/vendor/autoload.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class RoleController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    // Validate JWT token and check if user is admin
    private function validateAdminToken($token) {
        $secretKey = 'your_secret_key_here'; // Use the same key as in auth backend
        try {
            $decoded = JWT::decode($token, new Key($secretKey, 'HS256'));

            // Check if user has admin role
            if (!isset($decoded->role) || $decoded->role !== 'admin') {
                return [
                    'success' => false,
                    'message' => 'Access denied. Admin privileges required.'
                ];
            }

            return [
                'success' => true,
                'data' => (array)$decoded
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Invalid or expired token',
                'error' => $e->getMessage()
            ];
        }
    }

    // Create a new role
    public function createRole($data, $authHeader = null) {
        // Validate required fields
        if (!isset($data['name']) || !isset($data['description'])) {
            http_response_code(400);
            return json_encode([
                'success' => false,
                'message' => 'Missing required fields: name, description'
            ]);
        }

        // TODO: Add admin token validation later
        // For now, allow role creation without authentication

        $roleModel = new RoleModel($this->db);

        // Check if role name already exists
        if ($roleModel->roleExists($data['name'])) {
            http_response_code(409);
            return json_encode([
                'success' => false,
                'message' => 'Role with this name already exists'
            ]);
        }

        // Get permission IDs if provided
        $permissionIds = isset($data['permission_ids']) ? $data['permission_ids'] : [];

        // Validate permission IDs if provided
        if (!empty($permissionIds)) {
            $permissionModel = new PermissionModel($this->db);
            foreach ($permissionIds as $permissionId) {
                $permission = $permissionModel->getPermissionById($permissionId);
                if (!$permission) {
                    http_response_code(400);
                    return json_encode([
                        'success' => false,
                        'message' => "Invalid permission ID: {$permissionId}"
                    ]);
                }
            }
        }

        // Create the role
        $roleId = $roleModel->createRole(
            trim($data['name']),
            trim($data['description']),
            $permissionIds
        );

        if ($roleId) {
            // Get the created role with permissions
            $role = $roleModel->getRoleById($roleId);

            http_response_code(201);
            return json_encode([
                'success' => true,
                'message' => 'Role created successfully',
                'role' => $role
            ]);
        } else {
            http_response_code(500);
            return json_encode([
                'success' => false,
                'message' => 'Failed to create role'
            ]);
        }
    }

    // Get all roles
    public function getAllRoles() {
        $roleModel = new RoleModel($this->db);
        $roles = $roleModel->getAllRoles();

        return json_encode([
            'success' => true,
            'roles' => $roles
        ]);
    }

    // Get role by ID
    public function getRoleById($id) {
        $roleModel = new RoleModel($this->db);
        $role = $roleModel->getRoleById($id);

        if ($role) {
            return json_encode([
                'success' => true,
                'role' => $role
            ]);
        } else {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'Role not found'
            ]);
        }
    }

    // Update an existing role
    public function updateRole($id, $data, $authHeader = null) {
        // Validate required fields
        if (!isset($data['name']) || !isset($data['description'])) {
            http_response_code(400);
            return json_encode([
                'success' => false,
                'message' => 'Missing required fields: name, description'
            ]);
        }

        // TODO: Add admin token validation later
        // For now, allow role update without authentication

        $roleModel = new RoleModel($this->db);

        // Check if role exists
        $existingRole = $roleModel->getRoleById($id);
        if (!$existingRole) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'Role not found'
            ]);
        }

        // Check if role name already exists (but allow if it's the same role)
        if ($roleModel->roleExists($data['name']) && $existingRole['name'] !== $data['name']) {
            http_response_code(409);
            return json_encode([
                'success' => false,
                'message' => 'Role with this name already exists'
            ]);
        }

        // Get permission IDs if provided
        $permissionIds = isset($data['permission_ids']) ? $data['permission_ids'] : [];

        // Validate permission IDs if provided
        if (!empty($permissionIds)) {
            $permissionModel = new PermissionModel($this->db);
            foreach ($permissionIds as $permissionId) {
                $permission = $permissionModel->getPermissionById($permissionId);
                if (!$permission) {
                    http_response_code(400);
                    return json_encode([
                        'success' => false,
                        'message' => "Invalid permission ID: {$permissionId}"
                    ]);
                }
            }
        }

        // Update the role
        $updated = $roleModel->updateRole(
            $id,
            trim($data['name']),
            trim($data['description']),
            $permissionIds
        );

        if ($updated) {
            // Get the updated role with permissions
            $role = $roleModel->getRoleById($id);

            http_response_code(200);
            return json_encode([
                'success' => true,
                'message' => 'Role updated successfully',
                'role' => $role
            ]);
        } else {
            http_response_code(500);
            return json_encode([
                'success' => false,
                'message' => 'Failed to update role'
            ]);
        }
    }

    // Delete a role
    public function deleteRole($id, $authHeader = null) {
        // TODO: Add admin token validation later
        // For now, allow role deletion without authentication

        $roleModel = new RoleModel($this->db);

        // Check if role exists
        $existingRole = $roleModel->getRoleById($id);
        if (!$existingRole) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'Role not found'
            ]);
        }

        // Delete the role
        $deleted = $roleModel->deleteRole($id);

        if ($deleted) {
            http_response_code(200);
            return json_encode([
                'success' => true,
                'message' => 'Role deleted successfully'
            ]);
        } else {
            http_response_code(500);
            return json_encode([
                'success' => false,
                'message' => 'Failed to delete role'
            ]);
        }
    }

    // Assign permission to role
    public function assignPermissionToRole($roleId, $permissionId, $authHeader = null) {
        // TODO: Add admin token validation later
        // For now, allow permission assignment without authentication

        $roleModel = new RoleModel($this->db);
        $permissionModel = new PermissionModel($this->db);

        // Check if role exists
        $role = $roleModel->getRoleById($roleId);
        if (!$role) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'Role not found'
            ]);
        }

        // Check if permission exists
        $permission = $permissionModel->getPermissionById($permissionId);
        if (!$permission) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'Permission not found'
            ]);
        }

        // Assign permission to role
        $assigned = $roleModel->assignPermissionToRole($roleId, $permissionId);

        if ($assigned) {
            http_response_code(200);
            return json_encode([
                'success' => true,
                'message' => 'Permission assigned to role successfully'
            ]);
        } else {
            http_response_code(409);
            return json_encode([
                'success' => false,
                'message' => 'Permission is already assigned to this role'
            ]);
        }
    }

    // Revoke permission from role
    public function revokePermissionFromRole($roleId, $permissionId, $authHeader = null) {
        // TODO: Add admin token validation later
        // For now, allow permission revocation without authentication

        $roleModel = new RoleModel($this->db);
        $permissionModel = new PermissionModel($this->db);

        // Check if role exists
        $role = $roleModel->getRoleById($roleId);
        if (!$role) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'Role not found'
            ]);
        }

        // Check if permission exists
        $permission = $permissionModel->getPermissionById($permissionId);
        if (!$permission) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'Permission not found'
            ]);
        }

        // Revoke permission from role
        $revoked = $roleModel->revokePermissionFromRole($roleId, $permissionId);

        if ($revoked) {
            http_response_code(200);
            return json_encode([
                'success' => true,
                'message' => 'Permission revoked from role successfully'
            ]);
        } else {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'Permission is not assigned to this role'
            ]);
        }
    }

    // Get role permissions
    public function getRolePermissions($roleId) {
        $roleModel = new RoleModel($this->db);

        // Check if role exists
        $role = $roleModel->getRoleById($roleId);
        if (!$role) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'Role not found'
            ]);
        }

        $permissions = $roleModel->getRolePermissions($roleId);

        return json_encode([
            'success' => true,
            'permissions' => $permissions
        ]);
    }

    // Get permissions for target role by name
    public function getRolePermissionsByName($roleName) {
        $roleModel = new RoleModel($this->db);

        // Get role by name
        $role = $roleModel->getRoleByName($roleName);
        if (!$role) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'Role not found'
            ]);
        }

        $permissions = $roleModel->getRolePermissions($role['id']);

        return json_encode([
            'success' => true,
            'role' => $role,
            'permissions' => $permissions
        ]);
    }
}
<?php
// Set timezone for all date/time operations
date_default_timezone_set('Asia/Colombo');

require_once __DIR__ . '/PermissionModel.php';

require_once __DIR__ . '/vendor/autoload.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class PermissionController {
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

    // Create a new permission
    public function createPermission($data, $authHeader = null) {
        // Validate required fields
        if (!isset($data['name']) || !isset($data['target_user_role']) || !isset($data['description'])) {
            http_response_code(400);
            return json_encode([
                'success' => false,
                'message' => 'Missing required fields: name, target_user_role, description'
            ]);
        }

        // Validate target user role
        $validRoles = ['student', 'teacher', 'admin', 'cashier'];
        if (!in_array($data['target_user_role'], $validRoles)) {
            http_response_code(400);
            return json_encode([
                'success' => false,
                'message' => 'Invalid target_user_role. Must be one of: ' . implode(', ', $validRoles)
            ]);
        }

        // TODO: Add admin token validation later
        // For now, allow permission creation without authentication

        // Check if permission name already exists
        $permissionModel = new PermissionModel($this->db);
        if ($permissionModel->permissionExists($data['name'])) {
            http_response_code(409);
            return json_encode([
                'success' => false,
                'message' => 'Permission with this name already exists'
            ]);
        }

        // Create the permission
        $permissionId = $permissionModel->createPermission(
            trim($data['name']),
            $data['target_user_role'],
            trim($data['description'])
        );

        if ($permissionId) {
            // Get the created permission
            $permission = $permissionModel->getPermissionById($permissionId);

            http_response_code(201);
            return json_encode([
                'success' => true,
                'message' => 'Permission created successfully',
                'permission' => [
                    'id' => $permission['id'],
                    'name' => $permission['name'],
                    'target_user_role' => $permission['target_userrole'],
                    'description' => $permission['description'],
                    'created_at' => $permission['created_at']
                ]
            ]);
        } else {
            http_response_code(500);
            return json_encode([
                'success' => false,
                'message' => 'Failed to create permission'
            ]);
        }
    }

    // Get all permissions
    public function getAllPermissions() {
        $permissionModel = new PermissionModel($this->db);
        $permissions = $permissionModel->getAllPermissions();

        return json_encode([
            'success' => true,
            'permissions' => array_map(function($permission) {
                return [
                    'id' => $permission['id'],
                    'name' => $permission['name'],
                    'target_user_role' => $permission['target_userrole'],
                    'description' => $permission['description'],
                    'created_at' => $permission['created_at']
                ];
            }, $permissions)
        ]);
    }

    // Get permission by ID
    public function getPermissionById($id) {
        $permissionModel = new PermissionModel($this->db);
        $permission = $permissionModel->getPermissionById($id);

        if ($permission) {
            return json_encode([
                'success' => true,
                'permission' => [
                    'id' => $permission['id'],
                    'name' => $permission['name'],
                    'target_user_role' => $permission['target_userrole'],
                    'description' => $permission['description'],
                    'created_at' => $permission['created_at']
                ]
            ]);
        } else {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'Permission not found'
            ]);
        }
    }

    // Update an existing permission
    public function updatePermission($id, $data, $authHeader = null) {
        // Validate required fields
        if (!isset($data['name']) || !isset($data['target_user_role']) || !isset($data['description'])) {
            http_response_code(400);
            return json_encode([
                'success' => false,
                'message' => 'Missing required fields: name, target_user_role, description'
            ]);
        }

        // Validate target user role
        $validRoles = ['student', 'teacher', 'admin', 'cashier'];
        if (!in_array($data['target_user_role'], $validRoles)) {
            http_response_code(400);
            return json_encode([
                'success' => false,
                'message' => 'Invalid target_user_role. Must be one of: ' . implode(', ', $validRoles)
            ]);
        }

        // TODO: Add admin token validation later
        // For now, allow permission update without authentication

        $permissionModel = new PermissionModel($this->db);

        // Check if permission exists
        $existingPermission = $permissionModel->getPermissionById($id);
        if (!$existingPermission) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'Permission not found'
            ]);
        }

        // Check if permission name already exists (but allow if it's the same permission)
        if ($permissionModel->permissionExists($data['name']) && $existingPermission['name'] !== $data['name']) {
            http_response_code(409);
            return json_encode([
                'success' => false,
                'message' => 'Permission with this name already exists'
            ]);
        }

        // Update the permission
        $updated = $permissionModel->updatePermission(
            $id,
            trim($data['name']),
            $data['target_user_role'],
            trim($data['description'])
        );

        if ($updated) {
            // Get the updated permission
            $permission = $permissionModel->getPermissionById($id);

            http_response_code(200);
            return json_encode([
                'success' => true,
                'message' => 'Permission updated successfully',
                'permission' => [
                    'id' => $permission['id'],
                    'name' => $permission['name'],
                    'target_user_role' => $permission['target_userrole'],
                    'description' => $permission['description'],
                    'created_at' => $permission['created_at']
                ]
            ]);
        } else {
            http_response_code(500);
            return json_encode([
                'success' => false,
                'message' => 'Failed to update permission'
            ]);
        }
    }

    // Delete a permission
    public function deletePermission($id, $authHeader = null) {
        // TODO: Add admin token validation later
        // For now, allow permission deletion without authentication

        $permissionModel = new PermissionModel($this->db);

        // Check if permission exists
        $existingPermission = $permissionModel->getPermissionById($id);
        if (!$existingPermission) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'Permission not found'
            ]);
        }

        // Delete the permission
        $deleted = $permissionModel->deletePermission($id);

        if ($deleted) {
            http_response_code(200);
            return json_encode([
                'success' => true,
                'message' => 'Permission deleted successfully'
            ]);
        } else {
            http_response_code(500);
            return json_encode([
                'success' => false,
                'message' => 'Failed to delete permission'
            ]);
        }
    }
}
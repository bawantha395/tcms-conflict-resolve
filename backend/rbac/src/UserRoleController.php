<?php
// Set timezone for all date/time operations
date_default_timezone_set('Asia/Colombo');

require_once __DIR__ . '/UserRoleModel.php';
require_once __DIR__ . '/RoleModel.php';

require_once __DIR__ . '/vendor/autoload.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class UserRoleController {
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

    // Get all users
    public function getAllUsers() {
        $userRoleModel = new UserRoleModel($this->db);
        $users = $userRoleModel->getAllUsers();

        // Format the response
        $formattedUsers = array_map(function($user) {
            return [
                'userid' => $user['userid'],
                'firstName' => $user['firstName'],
                'lastName' => $user['lastName'],
                'email' => $user['email'],
                'mobile' => $user['mobile'] ?? '',
                'current_roles' => $user['current_roles']
            ];
        }, $users);

        return json_encode([
            'success' => true,
            'users' => $formattedUsers
        ]);
    }

    // Get user by ID
    public function getUserById($userId) {
        $userRoleModel = new UserRoleModel($this->db);
        $user = $userRoleModel->getUserById($userId);

        if ($user) {
            return json_encode([
                'success' => true,
                'user' => [
                    'userid' => $user['userid'],
                    'firstName' => $user['firstName'],
                    'lastName' => $user['lastName'],
                    'email' => $user['email'],
                    'mobile' => $user['mobile'] ?? '',
                    'current_roles' => $user['current_roles']
                ]
            ]);
        } else {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'User not found'
            ]);
        }
    }

    // Get roles assigned to a user
    public function getUserRoles($userId) {
        $userRoleModel = new UserRoleModel($this->db);
        $roles = $userRoleModel->getUserRoles($userId);

        return json_encode([
            'success' => true,
            'roles' => $roles
        ]);
    }

    // Get role assignment history for a user
    public function getUserRoleHistory($userId) {
        $userRoleModel = new UserRoleModel($this->db);
        $history = $userRoleModel->getUserRoleHistory($userId);

        return json_encode([
            'success' => true,
            'history' => $history
        ]);
    }

    // Get permissions for a user
    public function getUserPermissions($userId) {
        $userRoleModel = new UserRoleModel($this->db);
        $permissions = $userRoleModel->getUserPermissions($userId);

        return json_encode([
            'success' => true,
            'permissions' => $permissions
        ]);
    }

    // Assign role to user
    public function assignRoleToUser($userId, $roleId, $authHeader = null) {
        // TODO: Add admin token validation later
        // For now, allow role assignment without authentication

        $userRoleModel = new UserRoleModel($this->db);
        $roleModel = new RoleModel($this->db);

        // Check if user exists
        $user = $userRoleModel->getUserById($userId);
        if (!$user) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'User not found'
            ]);
        }

        // Check if role exists
        $role = $roleModel->getRoleById($roleId);
        if (!$role) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'Role not found'
            ]);
        }

        // Check if user already has this role
        if ($userRoleModel->userHasRole($userId, $roleId)) {
            http_response_code(409);
            return json_encode([
                'success' => false,
                'message' => 'User already has this role assigned'
            ]);
        }

        // Assign role to user
        $assignmentId = $userRoleModel->assignRoleToUser($userId, $roleId);

        if ($assignmentId) {
            http_response_code(201);
            return json_encode([
                'success' => true,
                'message' => 'Role assigned to user successfully',
                'assignment_id' => $assignmentId
            ]);
        } else {
            http_response_code(500);
            return json_encode([
                'success' => false,
                'message' => 'Failed to assign role to user'
            ]);
        }
    }

    // Revoke role from user
    public function revokeRoleFromUser($userId, $roleId, $authHeader = null) {
        // TODO: Add admin token validation later
        // For now, allow role revocation without authentication

        $userRoleModel = new UserRoleModel($this->db);
        $roleModel = new RoleModel($this->db);

        // Check if user exists
        $user = $userRoleModel->getUserById($userId);
        if (!$user) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'User not found'
            ]);
        }

        // Check if role exists
        $role = $roleModel->getRoleById($roleId);
        if (!$role) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'Role not found'
            ]);
        }

        // Check if user has this role
        if (!$userRoleModel->userHasRole($userId, $roleId)) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'User does not have this role assigned'
            ]);
        }

        // Revoke role from user
        $revoked = $userRoleModel->revokeRoleFromUser($userId, $roleId);

        if ($revoked) {
            http_response_code(200);
            return json_encode([
                'success' => true,
                'message' => 'Role revoked from user successfully'
            ]);
        } else {
            http_response_code(500);
            return json_encode([
                'success' => false,
                'message' => 'Failed to revoke role from user'
            ]);
        }
    }

    // Get users who have a specific role
    public function getUsersByRole($roleId) {
        $userRoleModel = new UserRoleModel($this->db);
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

        $users = $userRoleModel->getUsersByRole($roleId);

        return json_encode([
            'success' => true,
            'role' => $role,
            'users' => $users
        ]);
    }
}
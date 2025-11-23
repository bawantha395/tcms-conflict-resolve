<?php
// Set timezone for all date/time operations
date_default_timezone_set('Asia/Colombo');

require_once __DIR__ . '/UserModel.php';

class UserController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    // Create a new user in RBAC system (called by auth backend)
    public function createUser($data) {
        // Validate required fields
        if (!isset($data['userid']) || !isset($data['firstName']) || !isset($data['lastName']) || !isset($data['email']) || !isset($data['role'])) {
            http_response_code(400);
            return json_encode([
                'success' => false,
                'message' => 'Missing required fields: userid, firstName, lastName, email, role'
            ]);
        }

        // Validate role
        $validRoles = ['student', 'teacher', 'admin', 'cashier'];
        if (!in_array($data['role'], $validRoles)) {
            http_response_code(400);
            return json_encode([
                'success' => false,
                'message' => 'Invalid role. Must be one of: ' . implode(', ', $validRoles)
            ]);
        }

        $userModel = new UserModel($this->db);

        // Check if user already exists
        if ($userModel->userExists($data['userid'])) {
            http_response_code(409);
            return json_encode([
                'success' => false,
                'message' => 'User with this userid already exists in RBAC system'
            ]);
        }

        // Create the user
        $userId = $userModel->createUser(
            trim($data['userid']),
            trim($data['firstName']),
            trim($data['lastName']),
            trim($data['email']),
            $data['role']
        );

        if ($userId) {
            http_response_code(201);
            return json_encode([
                'success' => true,
                'message' => 'User created successfully',
                'user' => [
                    'userid' => $userId,
                    'firstName' => $data['firstName'],
                    'lastName' => $data['lastName'],
                    'email' => $data['email'],
                    'role' => $data['role']
                ]
            ]);
        } else {
            http_response_code(500);
            return json_encode([
                'success' => false,
                'message' => 'Failed to create user in RBAC system'
            ]);
        }
    }

    // Get all users
    public function getAllUsers() {
        $userModel = new UserModel($this->db);
        $users = $userModel->getAllUsers();

        return json_encode([
            'success' => true,
            'users' => array_map(function($user) {
                return [
                    'userid' => $user['userid'],
                    'firstName' => $user['firstName'],
                    'lastName' => $user['lastName'],
                    'email' => $user['email'],
                    'mobile' => $user['mobile'] ?? '',
                    'current_roles' => $user['current_roles'] ?? []
                ];
            }, $users)
        ]);
    }

    // Get user by ID
    public function getUserById($userId) {
        $userModel = new UserModel($this->db);
        $user = $userModel->getUserById($userId);

        if ($user) {
            return json_encode([
                'success' => true,
                'user' => [
                    'userid' => $user['userid'],
                    'firstName' => $user['firstName'],
                    'lastName' => $user['lastName'],
                    'email' => $user['email'],
                    'mobile' => $user['mobile'] ?? '',
                    'current_roles' => $user['current_roles'] ?? []
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

    // Get user roles
    public function getUserRoles($userId) {
        $userModel = new UserModel($this->db);
        $roles = $userModel->getUserRoles($userId);

        return json_encode([
            'success' => true,
            'roles' => array_map(function($role) {
                return [
                    'id' => $role['id'],
                    'name' => $role['name'],
                    'description' => $role['description'],
                    'assigned_at' => $role['assigned_at']
                ];
            }, $roles)
        ]);
    }

    // Get user permissions (combines user role permissions and assigned RBAC role permissions)
    public function getUserPermissions($userId) {
        $userModel = new UserModel($this->db);
        $permissions = $userModel->getUserPermissions($userId);

        return json_encode([
            'success' => true,
            'permissions' => array_map(function($permission) {
                return [
                    'id' => $permission['id'],
                    'name' => $permission['name'],
                    'target_userrole' => $permission['target_userrole'],
                    'description' => $permission['description']
                ];
            }, $permissions)
        ]);
    }

    // Assign role to user
    public function assignRoleToUser($userId, $roleId, $assignedBy = null) {
        $userModel = new UserModel($this->db);

        // Check if user exists
        if (!$userModel->userExists($userId)) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'User not found'
            ]);
        }

        // Check if role exists
        if (!$userModel->roleExists($roleId)) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'Role not found'
            ]);
        }

        // Check if user already has this role
        if ($userModel->userHasRole($userId, $roleId)) {
            http_response_code(409);
            return json_encode([
                'success' => false,
                'message' => 'User already has this role assigned'
            ]);
        }

        $assignmentId = $userModel->assignRoleToUser($userId, $roleId, $assignedBy);

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
    public function revokeRoleFromUser($userId, $roleId, $revokedBy = null) {
        $userModel = new UserModel($this->db);

        // Check if user exists
        if (!$userModel->userExists($userId)) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'User not found'
            ]);
        }

        // Check if role exists
        if (!$userModel->roleExists($roleId)) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'Role not found'
            ]);
        }

        // Check if user has this role
        if (!$userModel->userHasRole($userId, $roleId)) {
            http_response_code(404);
            return json_encode([
                'success' => false,
                'message' => 'User does not have this role assigned'
            ]);
        }

        $result = $userModel->revokeRoleFromUser($userId, $roleId, $revokedBy);

        if ($result) {
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

    // Get user role assignment history
    public function getUserRoleHistory($userId) {
        $userModel = new UserModel($this->db);
        $history = $userModel->getUserRoleHistory($userId);

        return json_encode([
            'success' => true,
            'history' => array_map(function($record) {
                return [
                    'id' => $record['id'],
                    'role_id' => $record['role_id'],
                    'role_name' => $record['role_name'],
                    'assigned_by' => $record['assigned_by'],
                    'assigned_at' => $record['assigned_at'],
                    'revoked_by' => $record['revoked_by'],
                    'revoked_at' => $record['revoked_at'],
                    'is_active' => $record['is_active']
                ];
            }, $history)
        ]);
    }
}
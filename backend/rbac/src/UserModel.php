<?php
class UserModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    // Create a new user
    public function createUser($userid, $firstName, $lastName, $email, $role) {
        $stmt = $this->db->prepare("
            INSERT INTO users (userid, firstName, lastName, email, role)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("sssss", $userid, $firstName, $lastName, $email, $role);

        if ($stmt->execute()) {
            return $userid;
        }

        return false;
    }

    // Check if user exists
    public function userExists($userid) {
        $stmt = $this->db->prepare("SELECT userid FROM users WHERE userid = ?");
        $stmt->bind_param("s", $userid);
        $stmt->execute();
        $result = $stmt->get_result();

        return $result->num_rows > 0;
    }

    // Get user by ID
    public function getUserById($userid) {
        $stmt = $this->db->prepare("
            SELECT u.*, GROUP_CONCAT(r.name) as current_roles
            FROM users u
            LEFT JOIN user_roles ur ON u.userid = ur.user_id AND ur.is_active = TRUE
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.userid = ?
            GROUP BY u.userid
        ");
        $stmt->bind_param("s", $userid);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 1) {
            $user = $result->fetch_assoc();
            $user['current_roles'] = $user['current_roles'] ? explode(',', $user['current_roles']) : [];
            return $user;
        }

        return false;
    }

    // Get all users
    public function getAllUsers() {
        $stmt = $this->db->prepare("
            SELECT u.*, GROUP_CONCAT(r.name) as current_roles
            FROM users u
            LEFT JOIN user_roles ur ON u.userid = ur.user_id AND ur.is_active = TRUE
            LEFT JOIN roles r ON ur.role_id = r.id
            GROUP BY u.userid
            ORDER BY u.created_at DESC
        ");
        $stmt->execute();
        $result = $stmt->get_result();

        $users = [];
        while ($row = $result->fetch_assoc()) {
            $row['current_roles'] = $row['current_roles'] ? explode(',', $row['current_roles']) : [];
            $users[] = $row;
        }

        return $users;
    }

    // Get user roles
    public function getUserRoles($userid) {
        $stmt = $this->db->prepare("
            SELECT r.id, r.name, r.description, ur.assigned_at
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = ? AND ur.is_active = TRUE
            ORDER BY ur.assigned_at DESC
        ");
        $stmt->bind_param("s", $userid);
        $stmt->execute();
        $result = $stmt->get_result();

        $roles = [];
        while ($row = $result->fetch_assoc()) {
            $roles[] = $row;
        }

        return $roles;
    }

    // Get user permissions (combines user role permissions and assigned RBAC role permissions)
    public function getUserPermissions($userid) {
        $stmt = $this->db->prepare("
            SELECT DISTINCT p.id, p.name, p.target_userrole, p.description
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = ? AND ur.is_active = TRUE
            ORDER BY p.name
        ");
        $stmt->bind_param("s", $userid);
        $stmt->execute();
        $result = $stmt->get_result();

        $permissions = [];
        while ($row = $result->fetch_assoc()) {
            $permissions[] = $row;
        }

        return $permissions;
    }

    // Get role ID by name
    public function getRoleIdByName($roleName) {
        $stmt = $this->db->prepare("SELECT id FROM roles WHERE name = ?");
        $stmt->bind_param("s", $roleName);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 1) {
            $row = $result->fetch_assoc();
            return $row['id'];
        }

        return false;
    }

    // Check if role exists
    public function roleExists($roleId) {
        $stmt = $this->db->prepare("SELECT id FROM roles WHERE id = ?");
        $stmt->bind_param("i", $roleId);
        $stmt->execute();
        $result = $stmt->get_result();

        return $result->num_rows > 0;
    }

    // Check if user has role
    public function userHasRole($userId, $roleId) {
        $stmt = $this->db->prepare("
            SELECT id FROM user_roles
            WHERE user_id = ? AND role_id = ? AND is_active = TRUE
        ");
        $stmt->bind_param("si", $userId, $roleId);
        $stmt->execute();
        $result = $stmt->get_result();

        return $result->num_rows > 0;
    }

    // Assign role to user
    public function assignRoleToUser($userId, $roleId, $assignedBy = null) {
        $stmt = $this->db->prepare("
            INSERT INTO user_roles (user_id, role_id, assigned_by)
            VALUES (?, ?, ?)
        ");
        $stmt->bind_param("sis", $userId, $roleId, $assignedBy);

        if ($stmt->execute()) {
            return $this->db->insert_id;
        }

        return false;
    }

    // Revoke role from user
    public function revokeRoleFromUser($userId, $roleId, $revokedBy = null) {
        $stmt = $this->db->prepare("
            UPDATE user_roles
            SET is_active = FALSE, revoked_by = ?, revoked_at = NOW()
            WHERE user_id = ? AND role_id = ? AND is_active = TRUE
        ");
        $stmt->bind_param("ssi", $revokedBy, $userId, $roleId);

        return $stmt->execute();
    }

    // Get user role assignment history
    public function getUserRoleHistory($userId) {
        $stmt = $this->db->prepare("
            SELECT ur.id, ur.role_id, r.name as role_name, ur.assigned_by, ur.assigned_at,
                   ur.revoked_by, ur.revoked_at, ur.is_active
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = ?
            ORDER BY ur.assigned_at DESC
        ");
        $stmt->bind_param("s", $userId);
        $stmt->execute();
        $result = $stmt->get_result();

        $history = [];
        while ($row = $result->fetch_assoc()) {
            $history[] = $row;
        }

        return $history;
    }
}
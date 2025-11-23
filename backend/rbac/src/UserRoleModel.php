<?php

class UserRoleModel {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function assignRoleToUser($userId, $roleId, $assignedBy = null) {
        // Check if the assignment already exists and is active
        $stmt = $this->conn->prepare("
            SELECT id FROM user_roles
            WHERE user_id = ? AND role_id = ? AND is_active = TRUE
        ");
        $stmt->bind_param("si", $userId, $roleId);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            return false; // Already assigned
        }

        // Insert new assignment
        $stmt = $this->conn->prepare("
            INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at, is_active)
            VALUES (?, ?, ?, NOW(), TRUE)
        ");
        $stmt->bind_param("sis", $userId, $roleId, $assignedBy);

        if ($stmt->execute()) {
            return $this->conn->insert_id;
        }
        return false;
    }

    public function revokeRoleFromUser($userId, $roleId, $revokedBy = null) {
        // Delete the active assignment (instead of updating to keep history)
        $stmt = $this->conn->prepare("
            DELETE FROM user_roles
            WHERE user_id = ? AND role_id = ? AND is_active = TRUE
        ");
        $stmt->bind_param("si", $userId, $roleId);

        if ($stmt->execute()) {
            return $stmt->affected_rows > 0;
        }
        return false;
    }

    public function getUserRoles($userId) {
        // Only get explicitly assigned RBAC roles (no inherent roles)
        $stmt = $this->conn->prepare("
            SELECT ur.id, ur.user_id, ur.role_id, ur.assigned_by, ur.assigned_at,
                   r.name as role_name, r.description as role_description,
                   u1.firstName as assigned_by_first_name, u1.lastName as assigned_by_last_name
            FROM user_roles ur
            INNER JOIN roles r ON ur.role_id = r.id
            LEFT JOIN users u1 ON ur.assigned_by = u1.userid
            WHERE ur.user_id = ? AND ur.is_active = TRUE
            ORDER BY ur.assigned_at DESC
        ");
        $stmt->bind_param("s", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        $roles = $result->fetch_all(MYSQLI_ASSOC);

        return $roles;
    }

    public function getUserRoleHistory($userId) {
        // Since we delete revoked records, return current active roles as "history"
        // In a real system, you'd want a separate audit table for proper history
        return $this->getUserRoles($userId);
    }

    public function getAllUsers() {
        // Get all users with their assigned RBAC roles only (no inherent roles)
        $result = $this->conn->query("
            SELECT u.userid, u.firstName, u.lastName, u.email,
                   GROUP_CONCAT(DISTINCT r.name) as assigned_rbac_roles
            FROM users u
            LEFT JOIN user_roles ur ON u.userid = ur.user_id AND ur.is_active = TRUE
            LEFT JOIN roles r ON ur.role_id = r.id
            GROUP BY u.userid, u.firstName, u.lastName, u.email
            ORDER BY u.firstName, u.lastName
        ");

        $users = [];
        while ($row = $result->fetch_assoc()) {
            // Only include manually assigned RBAC roles
            $allRoles = [];
            if ($row['assigned_rbac_roles']) {
                $rbacRoles = explode(',', $row['assigned_rbac_roles']);
                $allRoles = array_merge($allRoles, $rbacRoles);
            }

            $users[] = [
                'userid' => $row['userid'],
                'firstName' => $row['firstName'],
                'lastName' => $row['lastName'],
                'email' => $row['email'],
                'mobile' => '', // Not available in users table
                'current_roles' => array_unique($allRoles)
            ];
        }

        return $users;
    }

    public function getUserById($userId) {
        $stmt = $this->conn->prepare("
            SELECT u.userid, u.firstName, u.lastName, u.email,
                   GROUP_CONCAT(DISTINCT r.name) as assigned_rbac_roles
            FROM users u
            LEFT JOIN user_roles ur ON u.userid = ur.user_id AND ur.is_active = TRUE
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.userid = ?
            GROUP BY u.userid, u.firstName, u.lastName, u.email
        ");
        $stmt->bind_param("s", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();

        if (!$row) {
            return null;
        }

        // Only include manually assigned RBAC roles
        $allRoles = [];
        if ($row['assigned_rbac_roles']) {
            $rbacRoles = explode(',', $row['assigned_rbac_roles']);
            $allRoles = array_merge($allRoles, $rbacRoles);
        }

        return [
            'userid' => $row['userid'],
            'firstName' => $row['firstName'],
            'lastName' => $row['lastName'],
            'email' => $row['email'],
            'mobile' => '', // Not available in users table
            'current_roles' => array_unique($allRoles)
        ];
    }

    public function userHasRole($userId, $roleId) {
        $stmt = $this->conn->prepare("
            SELECT id FROM user_roles
            WHERE user_id = ? AND role_id = ? AND is_active = TRUE
        ");
        $stmt->bind_param("si", $userId, $roleId);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->num_rows > 0;
    }

    public function getUsersByRole($roleId) {
        $stmt = $this->conn->prepare("
            SELECT u.userid, u.firstName, u.lastName, u.email, u.role,
                   ur.assigned_at, ur.assigned_by
            FROM user_roles ur
            INNER JOIN users u ON ur.user_id = u.userid
            WHERE ur.role_id = ? AND ur.is_active = TRUE
            ORDER BY ur.assigned_at DESC
        ");
        $stmt->bind_param("i", $roleId);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function getUserPermissions($userId) {
        // Only get permissions for assigned RBAC roles (no inherent permissions)
        $stmt = $this->conn->prepare("
            SELECT DISTINCT p.id, p.name, p.target_userrole, p.description
            FROM user_roles ur
            INNER JOIN roles r ON ur.role_id = r.id
            INNER JOIN role_permissions rp ON r.id = rp.role_id
            INNER JOIN permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = ? AND ur.is_active = TRUE
        ");
        $stmt->bind_param("s", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        $permissions = $result->fetch_all(MYSQLI_ASSOC);

        return $permissions;
    }
}
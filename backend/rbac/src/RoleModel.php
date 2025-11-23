<?php

class RoleModel {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function createRole($name, $description, $permissionIds = []) {
        // Start transaction
        $this->conn->begin_transaction();

        try {
            // Insert role
            $stmt = $this->conn->prepare("INSERT INTO roles (name, description) VALUES (?, ?)");
            $stmt->bind_param("ss", $name, $description);

            if (!$stmt->execute()) {
                throw new Exception("Failed to create role");
            }

            $roleId = $this->conn->insert_id;

            // Assign permissions if provided
            if (!empty($permissionIds)) {
                foreach ($permissionIds as $permissionId) {
                    $stmt = $this->conn->prepare("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)");
                    $stmt->bind_param("ii", $roleId, $permissionId);

                    if (!$stmt->execute()) {
                        throw new Exception("Failed to assign permission");
                    }
                }
            }

            // Commit transaction
            $this->conn->commit();
            return $roleId;

        } catch (Exception $e) {
            // Rollback transaction on error
            $this->conn->rollback();
            return false;
        }
    }

    public function getRoleById($id) {
        $stmt = $this->conn->prepare("
            SELECT r.id, r.name, r.description, r.created_at,
                   GROUP_CONCAT(p.id) as permission_ids,
                   GROUP_CONCAT(p.name) as permission_names
            FROM roles r
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
            LEFT JOIN permissions p ON rp.permission_id = p.id
            WHERE r.id = ?
            GROUP BY r.id
        ");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $role = $result->fetch_assoc();

        if ($role) {
            // Format permissions array
            $role['permissions'] = [];
            if ($role['permission_ids']) {
                $permissionIds = explode(',', $role['permission_ids']);
                $permissionNames = explode(',', $role['permission_names']);

                for ($i = 0; $i < count($permissionIds); $i++) {
                    $role['permissions'][] = [
                        'id' => (int)$permissionIds[$i],
                        'name' => $permissionNames[$i]
                    ];
                }
            }

            // Remove temporary fields
            unset($role['permission_ids'], $role['permission_names']);
        }

        return $role;
    }

    public function getRoleByName($name) {
        $stmt = $this->conn->prepare("
            SELECT r.id, r.name, r.description, r.created_at,
                   GROUP_CONCAT(p.id) as permission_ids,
                   GROUP_CONCAT(p.name) as permission_names
            FROM roles r
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
            LEFT JOIN permissions p ON rp.permission_id = p.id
            WHERE r.name = ?
            GROUP BY r.id
        ");
        $stmt->bind_param("s", $name);
        $stmt->execute();
        $result = $stmt->get_result();
        $role = $result->fetch_assoc();

        if ($role) {
            // Format permissions array
            $role['permissions'] = [];
            if ($role['permission_ids']) {
                $permissionIds = explode(',', $role['permission_ids']);
                $permissionNames = explode(',', $role['permission_names']);

                for ($i = 0; $i < count($permissionIds); $i++) {
                    $role['permissions'][] = [
                        'id' => (int)$permissionIds[$i],
                        'name' => $permissionNames[$i]
                    ];
                }
            }

            // Remove temporary fields
            unset($role['permission_ids'], $role['permission_names']);
        }

        return $role;
    }

    public function getAllRoles() {
        $result = $this->conn->query("
            SELECT r.id, r.name, r.description, r.created_at,
                   GROUP_CONCAT(p.id) as permission_ids,
                   GROUP_CONCAT(p.name) as permission_names
            FROM roles r
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
            LEFT JOIN permissions p ON rp.permission_id = p.id
            GROUP BY r.id
            ORDER BY r.created_at DESC
        ");

        $roles = [];
        while ($row = $result->fetch_assoc()) {
            // Format permissions array
            $row['permissions'] = [];
            if ($row['permission_ids']) {
                $permissionIds = explode(',', $row['permission_ids']);
                $permissionNames = explode(',', $row['permission_names']);

                for ($i = 0; $i < count($permissionIds); $i++) {
                    $row['permissions'][] = [
                        'id' => (int)$permissionIds[$i],
                        'name' => $permissionNames[$i]
                    ];
                }
            }

            // Remove temporary fields
            unset($row['permission_ids'], $row['permission_names']);
            $roles[] = $row;
        }

        return $roles;
    }

    public function roleExists($name) {
        $stmt = $this->conn->prepare("SELECT id FROM roles WHERE name = ?");
        $stmt->bind_param("s", $name);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->num_rows > 0;
    }

    public function updateRole($id, $name, $description, $permissionIds = []) {
        // Start transaction
        $this->conn->begin_transaction();

        try {
            // Update role
            $stmt = $this->conn->prepare("UPDATE roles SET name = ?, description = ? WHERE id = ?");
            $stmt->bind_param("ssi", $name, $description, $id);

            if (!$stmt->execute()) {
                throw new Exception("Failed to update role");
            }

            // Remove existing permissions
            $stmt = $this->conn->prepare("DELETE FROM role_permissions WHERE role_id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();

            // Assign new permissions if provided
            if (!empty($permissionIds)) {
                foreach ($permissionIds as $permissionId) {
                    $stmt = $this->conn->prepare("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)");
                    $stmt->bind_param("ii", $id, $permissionId);

                    if (!$stmt->execute()) {
                        throw new Exception("Failed to assign permission");
                    }
                }
            }

            // Commit transaction
            $this->conn->commit();
            return true;

        } catch (Exception $e) {
            // Rollback transaction on error
            $this->conn->rollback();
            return false;
        }
    }

    public function deleteRole($id) {
        // Role permissions will be automatically deleted due to CASCADE constraint
        $stmt = $this->conn->prepare("DELETE FROM roles WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            return $stmt->affected_rows > 0;
        }
        return false;
    }

    public function assignPermissionToRole($roleId, $permissionId) {
        $stmt = $this->conn->prepare("INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)");
        $stmt->bind_param("ii", $roleId, $permissionId);

        if ($stmt->execute()) {
            return $stmt->affected_rows > 0;
        }
        return false;
    }

    public function revokePermissionFromRole($roleId, $permissionId) {
        $stmt = $this->conn->prepare("DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?");
        $stmt->bind_param("ii", $roleId, $permissionId);

        if ($stmt->execute()) {
            return $stmt->affected_rows > 0;
        }
        return false;
    }

    public function getRolePermissions($roleId) {
        $stmt = $this->conn->prepare("
            SELECT p.id, p.name, p.target_userrole, p.description, rp.assigned_at
            FROM permissions p
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ?
            ORDER BY rp.assigned_at DESC
        ");
        $stmt->bind_param("i", $roleId);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_all(MYSQLI_ASSOC);
    }
}
<?php

class PermissionModel {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function createPermission($name, $targetUserRole, $description) {
        $stmt = $this->conn->prepare("INSERT INTO permissions (name, target_userrole, description) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $name, $targetUserRole, $description);

        if ($stmt->execute()) {
            return $this->conn->insert_id;
        }
        return false;
    }

    public function getPermissionById($id) {
        $stmt = $this->conn->prepare("SELECT id, name, target_userrole, description, created_at FROM permissions WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }

    public function getAllPermissions() {
        $result = $this->conn->query("SELECT id, name, target_userrole, description, created_at FROM permissions ORDER BY created_at DESC");
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function permissionExists($name) {
        $stmt = $this->conn->prepare("SELECT id FROM permissions WHERE name = ?");
        $stmt->bind_param("s", $name);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->num_rows > 0;
    }

    public function updatePermission($id, $name, $targetUserRole, $description) {
        $stmt = $this->conn->prepare("UPDATE permissions SET name = ?, target_userrole = ?, description = ? WHERE id = ?");
        $stmt->bind_param("sssi", $name, $targetUserRole, $description, $id);

        if ($stmt->execute()) {
            return $stmt->affected_rows > 0;
        }
        return false;
    }

    public function deletePermission($id) {
        $stmt = $this->conn->prepare("DELETE FROM permissions WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            return $stmt->affected_rows > 0;
        }
        return false;
    }
}
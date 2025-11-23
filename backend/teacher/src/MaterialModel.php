<?php
/**
 * Material Model
 * Database operations for materials management
 */

class MaterialModel {
    private $conn;

    public function __construct($dbConnection) {
        $this->conn = $dbConnection;
    }

    /**
     * Create a new material record
     */
    public function create($data) {
        $sql = "INSERT INTO materials (
            class_id, teacher_id, teacher_name, title, description,
            file_type, file_name, file_path, file_size, original_file_path,
            is_password_protected, category
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param(
            "isssssssisis",
            $data['class_id'],
            $data['teacher_id'],
            $data['teacher_name'],
            $data['title'],
            $data['description'],
            $data['file_type'],
            $data['file_name'],
            $data['file_path'],
            $data['file_size'],
            $data['original_file_path'],
            $data['is_password_protected'],
            $data['category']
        );

        if ($stmt->execute()) {
            return $this->conn->insert_id;
        }
        return false;
    }

    /**
     * Get materials by class ID
     */
    public function getByClassId($classId, $status = 'active') {
        $sql = "SELECT * FROM materials 
                WHERE class_id = ? AND status = ? 
                ORDER BY upload_date DESC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("is", $classId, $status);
        $stmt->execute();
        
        $result = $stmt->get_result();
        $materials = [];
        
        while ($row = $result->fetch_assoc()) {
            $materials[] = $row;
        }
        
        return $materials;
    }

    /**
     * Get single material by ID
     */
    public function getById($id) {
        $sql = "SELECT * FROM materials WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }

    /**
     * Get materials by teacher ID
     */
    public function getByTeacherId($teacherId) {
        $sql = "SELECT m.*, c.class_name 
                FROM materials m
                LEFT JOIN classes c ON m.class_id = c.id
                WHERE m.teacher_id = ? AND m.status = 'active'
                ORDER BY m.upload_date DESC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("s", $teacherId);
        $stmt->execute();
        
        $result = $stmt->get_result();
        $materials = [];
        
        while ($row = $result->fetch_assoc()) {
            $materials[] = $row;
        }
        
        return $materials;
    }

    /**
     * Update material
     */
    public function update($id, $data) {
        $sql = "UPDATE materials SET 
                title = ?, description = ?, category = ?
                WHERE id = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param(
            "sssi",
            $data['title'],
            $data['description'],
            $data['category'],
            $id
        );
        
        return $stmt->execute();
    }

    /**
     * Delete material (soft delete)
     */
    public function delete($id) {
        $sql = "UPDATE materials SET status = 'deleted' WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $id);
        return $stmt->execute();
    }

    /**
     * Hard delete material
     */
    public function hardDelete($id) {
        $sql = "DELETE FROM materials WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $id);
        return $stmt->execute();
    }

    /**
     * Increment download count
     */
    public function incrementDownloadCount($id) {
        $sql = "UPDATE materials SET download_count = download_count + 1 WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $id);
        return $stmt->execute();
    }

    /**
     * Log material access
     */
    public function logAccess($data) {
        $sql = "INSERT INTO material_access_log (
            material_id, student_id, student_name, access_type,
            ip_address, user_agent, watermark_applied
        ) VALUES (?, ?, ?, ?, ?, ?, ?)";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param(
            "isssssi",
            $data['material_id'],
            $data['student_id'],
            $data['student_name'],
            $data['access_type'],
            $data['ip_address'],
            $data['user_agent'],
            $data['watermark_applied']
        );

        return $stmt->execute();
    }

    /**
     * Get access log for a material
     */
    public function getAccessLog($materialId) {
        $sql = "SELECT * FROM material_access_log 
                WHERE material_id = ? 
                ORDER BY access_timestamp DESC 
                LIMIT 100";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $materialId);
        $stmt->execute();
        
        $result = $stmt->get_result();
        $logs = [];
        
        while ($row = $result->fetch_assoc()) {
            $logs[] = $row;
        }
        
        return $logs;
    }

    /**
     * Get student's access history
     */
    public function getStudentAccessHistory($studentId, $limit = 50) {
        $sql = "SELECT mal.*, m.title, m.file_type, m.category
                FROM material_access_log mal
                JOIN materials m ON mal.material_id = m.id
                WHERE mal.student_id = ?
                ORDER BY mal.access_timestamp DESC
                LIMIT ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("si", $studentId, $limit);
        $stmt->execute();
        
        $result = $stmt->get_result();
        $history = [];
        
        while ($row = $result->fetch_assoc()) {
            $history[] = $row;
        }
        
        return $history;
    }

    /**
     * Check if student has accessed a material
     */
    public function hasStudentAccessed($materialId, $studentId) {
        $sql = "SELECT COUNT(*) as count FROM material_access_log 
                WHERE material_id = ? AND student_id = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("is", $materialId, $studentId);
        $stmt->execute();
        
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        return $row['count'] > 0;
    }
}

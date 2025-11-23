<?php

class TeacherModel {
    private $conn;
    
    public function __construct($db) {
        $this->conn = $db;
    }
    
    // Create a new teacher
    public function createTeacher($data) {
        $sql = "INSERT INTO teachers (teacherId, designation, name, stream, email, phone, password, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }
        
        $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
        $status = $data['status'] ?? 'active';
        
        $stmt->bind_param("ssssssss", 
            $data['teacherId'],
            $data['designation'],
            $data['name'],
            $data['stream'],
            $data['email'],
            $data['phone'],
            $hashedPassword,
            $status
        );
        
        if ($stmt->execute()) {
            return [
                'success' => true,
                'message' => 'Teacher created successfully',
                'teacherId' => $data['teacherId']
            ];
        } else {
            throw new Exception("Execute failed: " . $stmt->error);
        }
    }
    
    // Get all teachers
    public function getAllTeachers() {
        $sql = "SELECT id, teacherId, designation, name, stream, email, phone, status, created_at 
                FROM teachers 
                ORDER BY name ASC";
        
        $result = $this->conn->query($sql);
        
        if (!$result) {
            throw new Exception("Query failed: " . $this->conn->error);
        }
        
        $teachers = [];
        while ($row = $result->fetch_assoc()) {
            $teachers[] = $row;
        }
        
        return $teachers;
    }
    
    // Get active teachers only
    public function getActiveTeachers() {
        $sql = "SELECT id, teacherId, designation, name, stream, email, phone, status, created_at 
                FROM teachers 
                WHERE status = 'active'
                ORDER BY name ASC";
        
        $result = $this->conn->query($sql);
        
        if (!$result) {
            throw new Exception("Query failed: " . $this->conn->error);
        }
        
        $teachers = [];
        while ($row = $result->fetch_assoc()) {
            $teachers[] = $row;
        }
        
        return $teachers;
    }
    
    // Get teacher by ID
    public function getTeacherById($teacherId) {
        $sql = "SELECT id, teacherId, designation, name, stream, email, phone, status, created_at 
                FROM teachers 
                WHERE teacherId = ?";
        
        $stmt = $this->conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }
        
        $stmt->bind_param("s", $teacherId);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }
    
    // Get teacher by ID with password for editing (admin only)
    public function getTeacherByIdForEdit($teacherId) {
        $sql = "SELECT id, teacherId, designation, name, stream, email, phone, password, status, created_at 
                FROM teachers 
                WHERE teacherId = ?";
        
        $stmt = $this->conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }
        
        $stmt->bind_param("s", $teacherId);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        $teacher = $result->fetch_assoc();
        
        // For security, we don't return the actual password hash
        // Instead, we return a placeholder that indicates the password exists
        if ($teacher) {
            $teacher['password'] = '********'; // Placeholder for existing password
        }
        
        return $teacher;
    }
    
    // Get teacher by ID with password for login
    public function getTeacherByIdWithPassword($teacherId) {
        $sql = "SELECT id, teacherId, designation, name, stream, email, phone, password, status, created_at 
                FROM teachers 
                WHERE teacherId = ?";
        
        $stmt = $this->conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }
        
        $stmt->bind_param("s", $teacherId);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }
    
    // Get teacher by email (for login)
    public function getTeacherByEmail($email) {
        $sql = "SELECT id, teacherId, designation, name, stream, email, phone, password, status 
                FROM teachers 
                WHERE email = ?";
        
        $stmt = $this->conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }
        
        $stmt->bind_param("s", $email);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }
    
    // Update teacher
    public function updateTeacher($teacherId, $data) {
        // Check if password is being updated
        $updatePassword = !empty($data['password']);
        
        if ($updatePassword) {
            // Update including password
            $sql = "UPDATE teachers 
                    SET designation = ?, name = ?, stream = ?, email = ?, phone = ?, password = ?, status = ? 
                    WHERE teacherId = ?";
            
            $stmt = $this->conn->prepare($sql);
            
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $this->conn->error);
            }
            
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
            $status = $data['status'] ?? 'active';
            
            $stmt->bind_param("ssssssss", 
                $data['designation'],
                $data['name'],
                $data['stream'],
                $data['email'],
                $data['phone'],
                $hashedPassword,
                $status,
                $teacherId
            );
        } else {
            // Update without password
            $sql = "UPDATE teachers 
                    SET designation = ?, name = ?, stream = ?, email = ?, phone = ?, status = ? 
                    WHERE teacherId = ?";
            
            $stmt = $this->conn->prepare($sql);
            
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $this->conn->error);
            }
            
            $status = $data['status'] ?? 'active';
            
            $stmt->bind_param("sssssss", 
                $data['designation'],
                $data['name'],
                $data['stream'],
                $data['email'],
                $data['phone'],
                $status,
                $teacherId
            );
        }
        
        if ($stmt->execute()) {
            $message = 'Teacher updated successfully';
            if ($updatePassword) {
                $message .= ' (including password)';
            }
            return [
                'success' => true,
                'message' => $message
            ];
        } else {
            throw new Exception("Execute failed: " . $stmt->error);
        }
    }
    
    // Delete teacher
    public function deleteTeacher($teacherId) {
        $sql = "DELETE FROM teachers WHERE teacherId = ?";
        
        $stmt = $this->conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }
        
        $stmt->bind_param("s", $teacherId);
        
        if ($stmt->execute()) {
            return [
                'success' => true,
                'message' => 'Teacher deleted successfully'
            ];
        } else {
            throw new Exception("Execute failed: " . $stmt->error);
        }
    }
    
    // Change teacher password
    public function changePassword($teacherId, $newPassword) {
        $sql = "UPDATE teachers SET password = ? WHERE teacherId = ?";
        
        $stmt = $this->conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }
        
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt->bind_param("ss", $hashedPassword, $teacherId);
        
        if ($stmt->execute()) {
            return [
                'success' => true,
                'message' => 'Password changed successfully'
            ];
        } else {
            throw new Exception("Execute failed: " . $stmt->error);
        }
    }
    
    // Get teachers by stream
    public function getTeachersByStream($stream) {
        $sql = "SELECT id, teacherId, designation, name, stream, email, phone, status 
                FROM teachers 
                WHERE stream = ? AND status = 'active'
                ORDER BY name ASC";
        
        $stmt = $this->conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }
        
        $stmt->bind_param("s", $stream);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        $teachers = [];
        while ($row = $result->fetch_assoc()) {
            $teachers[] = $row;
        }
        
        return $teachers;
    }
    
    // Check if email exists
    public function emailExists($email, $excludeTeacherId = null) {
        $sql = "SELECT teacherId FROM teachers WHERE email = ?";
        $params = [$email];
        $types = "s";
        
        if ($excludeTeacherId) {
            $sql .= " AND teacherId != ?";
            $params[] = $excludeTeacherId;
            $types .= "s";
        }
        
        $stmt = $this->conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }
        
        $stmt->bind_param($types, ...$params);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        return $result->num_rows > 0;
    }
    
    // Check if phone number exists
    public function phoneExists($phone, $excludeTeacherId = null) {
        $sql = "SELECT teacherId FROM teachers WHERE phone = ?";
        $params = [$phone];
        $types = "s";
        
        if ($excludeTeacherId) {
            $sql .= " AND teacherId != ?";
            $params[] = $excludeTeacherId;
            $types .= "s";
        }
        
        $stmt = $this->conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }
        
        $stmt->bind_param($types, ...$params);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        return $result->num_rows > 0;
    }
    
    // Check if teacherId exists
    public function teacherIdExists($teacherId) {
        $sql = "SELECT teacherId FROM teachers WHERE teacherId = ?";
        
        $stmt = $this->conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }
        
        $stmt->bind_param("s", $teacherId);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        return $result->num_rows > 0;
    }

    // ==========================
    // Teacher staff related methods
    // ==========================

    // Generate unique staffId for a teacher staff: TS + 5 digits
    public function generateStaffId() {
        do {
            $random = str_pad(rand(0, 99999), 5, '0', STR_PAD_LEFT);
            $staffId = 'TS' . $random;
            $stmt = $this->conn->prepare("SELECT staffId FROM teacher_staff WHERE staffId = ?");
            $stmt->bind_param("s", $staffId);
            $stmt->execute();
            $res = $stmt->get_result();
        } while ($res && $res->num_rows > 0);

        return $staffId;
    }

    // Create a staff record linked to a teacher
    public function createStaff($teacherId, $data) {
        $staffId = $this->generateStaffId();
        $sql = "INSERT INTO teacher_staff (staffId, teacherId, name, email, phone, password, permissions, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }

        $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
        $permissions = isset($data['permissions']) ? json_encode($data['permissions']) : null;
        $status = $data['status'] ?? 'active';

        $stmt->bind_param("ssssssss",
            $staffId,
            $teacherId,
            $data['name'],
            $data['email'],
            $data['phone'],
            $hashedPassword,
            $permissions,
            $status
        );

        if ($stmt->execute()) {
            return [
                'success' => true,
                'message' => 'Staff created successfully',
                'staffId' => $staffId
            ];
        } else {
            throw new Exception("Execute failed: " . $stmt->error);
        }
    }

    // Create a staff record with a pre-generated staffId (used for atomic provisioning)
    public function createStaffWithId($staffId, $teacherId, $data) {
        $sql = "INSERT INTO teacher_staff (staffId, teacherId, name, email, phone, password, permissions, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }

        $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
        $permissions = isset($data['permissions']) ? json_encode($data['permissions']) : null;
        $status = $data['status'] ?? 'active';

        $stmt->bind_param("ssssssss",
            $staffId,
            $teacherId,
            $data['name'],
            $data['email'],
            $data['phone'],
            $hashedPassword,
            $permissions,
            $status
        );

        if ($stmt->execute()) {
            return [
                'success' => true,
                'message' => 'Staff created successfully',
                'staffId' => $staffId
            ];
        } else {
            throw new Exception("Execute failed: " . $stmt->error);
        }
    }

    // Get all staff for a given teacher
    public function getStaffByTeacher($teacherId) {
        $sql = "SELECT id, staffId, teacherId, name, email, phone, permissions, status, created_at FROM teacher_staff WHERE teacherId = ? ORDER BY name ASC";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }
        $stmt->bind_param("s", $teacherId);
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        $result = $stmt->get_result();
        $rows = [];
        while ($r = $result->fetch_assoc()) {
            if (isset($r['permissions']) && $r['permissions'] !== null) {
                $r['permissions'] = json_decode($r['permissions'], true);
            }
            $rows[] = $r;
        }
        return $rows;
    }

    // Get staff by staffId
    public function getStaffById($staffId) {
        $sql = "SELECT id, staffId, teacherId, name, email, phone, password, permissions, status, created_at FROM teacher_staff WHERE staffId = ?";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }
        $stmt->bind_param("s", $staffId);
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }

    // Update a staff record by staffId
    public function updateStaff($staffId, $data) {
        // Fetch existing staff to preserve fields if not provided
        $existing = $this->getStaffById($staffId);
        if (!$existing) throw new Exception('Staff not found');

        $name = $data['name'] ?? $existing['name'];
        $email = array_key_exists('email', $data) ? $data['email'] : $existing['email'];
        $phone = array_key_exists('phone', $data) ? $data['phone'] : $existing['phone'];
        $status = $data['status'] ?? $existing['status'];
        $permissions = isset($data['permissions']) ? json_encode($data['permissions']) : $existing['permissions'];

        // Build SQL depending on whether password is being updated
        if (!empty($data['password'])) {
            $sql = "UPDATE teacher_staff SET name = ?, email = ?, phone = ?, password = ?, permissions = ?, status = ? WHERE staffId = ?";
            $stmt = $this->conn->prepare($sql);
            if (!$stmt) throw new Exception("Prepare failed: " . $this->conn->error);
            $hashed = password_hash($data['password'], PASSWORD_DEFAULT);
            $stmt->bind_param("sssssss", $name, $email, $phone, $hashed, $permissions, $status, $staffId);
        } else {
            $sql = "UPDATE teacher_staff SET name = ?, email = ?, phone = ?, permissions = ?, status = ? WHERE staffId = ?";
            $stmt = $this->conn->prepare($sql);
            if (!$stmt) throw new Exception("Prepare failed: " . $this->conn->error);
            $stmt->bind_param("ssssss", $name, $email, $phone, $permissions, $status, $staffId);
        }

        if ($stmt->execute()) {
            return ['success' => true, 'message' => 'Staff updated successfully', 'staffId' => $staffId];
        } else {
            throw new Exception("Execute failed: " . $stmt->error);
        }
    }

    // Delete a staff record by staffId
    public function deleteStaff($staffId) {
        $sql = "DELETE FROM teacher_staff WHERE staffId = ?";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) throw new Exception("Prepare failed: " . $this->conn->error);
        $stmt->bind_param("s", $staffId);
        if ($stmt->execute()) {
            return ['success' => true, 'message' => 'Staff deleted successfully', 'staffId' => $staffId];
        } else {
            throw new Exception("Execute failed: " . $stmt->error);
        }
    }

    // Check if staffId exists
    public function staffIdExists($staffId) {
        $sql = "SELECT staffId FROM teacher_staff WHERE staffId = ?";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }
        $stmt->bind_param("s", $staffId);
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        $result = $stmt->get_result();
        return $result->num_rows > 0;
    }

    // Check if email exists among staff for a teacher (optional exclude)
    public function staffEmailExists($email, $teacherId = null) {
        $sql = "SELECT staffId FROM teacher_staff WHERE email = ?";
        $params = [$email];
        $types = "s";
        if ($teacherId) {
            $sql .= " AND teacherId = ?";
            $params[] = $teacherId;
            $types .= "s";
        }
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }
        $stmt->bind_param($types, ...$params);
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        $result = $stmt->get_result();
        return $result->num_rows > 0;
    }

    // Check if phone exists among staff for a teacher
    public function staffPhoneExists($phone, $teacherId = null) {
        $sql = "SELECT staffId FROM teacher_staff WHERE phone = ?";
        $params = [$phone];
        $types = "s";
        if ($teacherId) {
            $sql .= " AND teacherId = ?";
            $params[] = $teacherId;
            $types .= "s";
        }
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }
        $stmt->bind_param($types, ...$params);
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        $result = $stmt->get_result();
        return $result->num_rows > 0;
    }
    
    // Generate next teacher ID
    public function generateNextTeacherId() {
        $sql = "SELECT teacherId FROM teachers ORDER BY CAST(SUBSTRING(teacherId, 2) AS UNSIGNED) DESC LIMIT 1";
        
        $result = $this->conn->query($sql);
        
        if (!$result) {
            throw new Exception("Query failed: " . $this->conn->error);
        }
        
        if ($result->num_rows === 0) {
            return 'T001';
        }
        
        $row = $result->fetch_assoc();
        $lastId = $row['teacherId'];
        
        // Extract the number part and increment
        $number = intval(substr($lastId, 1));
        $nextNumber = $number + 1;
        
        // Format with leading zeros (T001, T002, etc.)
        return 'T' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
    }
} 
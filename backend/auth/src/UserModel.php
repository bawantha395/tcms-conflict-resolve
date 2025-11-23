<?php
class UserModel {
    private $conn;
    public $userid;
    public $password;
    public $role;
    public $otp;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function generateUserId($role) {
        if ($role === 'student') {
            // Generate S0 + 4 random digits for students
            do {
                $randomDigits = str_pad(rand(1000, 9999), 4, '0', STR_PAD_LEFT);
                $userid = 'S0' . $randomDigits;
                
                // Check if this ID already exists
                $stmt = $this->conn->prepare("SELECT userid FROM users WHERE userid = ?");
                $stmt->bind_param("s", $userid);
                $stmt->execute();
                $result = $stmt->get_result();
            } while ($result->num_rows > 0); // Keep generating until we get a unique ID
            
            return $userid;
        } else {
            // Original logic for other roles (admin, teacher, etc.)
            $prefix = strtoupper(substr($role, 0, 1));
            $stmt = $this->conn->prepare("SELECT userid FROM users WHERE userid LIKE ? ORDER BY userid DESC LIMIT 1");
            $like = $prefix . '%';
            $stmt->bind_param("s", $like);
            $stmt->execute();
            $result = $stmt->get_result()->fetch_assoc();

            $lastId = $result ? (int)substr($result['userid'], 1) : 0;
            return $prefix . str_pad($lastId + 1, 3, "0", STR_PAD_LEFT);
        }
    }

    public function createUser($role, $password, $otp = null) {
        $this->userid = $this->generateUserId($role);
        $this->role = $role;
        $this->password = password_hash($password, PASSWORD_BCRYPT);
        $this->otp = $otp;

        $stmt = $this->conn->prepare("INSERT INTO users (userid, password, role, otp) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssss", $this->userid, $this->password, $this->role, $this->otp);

        return $stmt->execute();
    }

    // Create teacher user with all fields
    public function createTeacherUser($userid, $password, $name, $email, $phone) {
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $role = 'teacher';
        
        $stmt = $this->conn->prepare("INSERT INTO users (userid, password, role, name, email, phone) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssss", $userid, $hashedPassword, $role, $name, $email, $phone);
        
        return $stmt->execute();
    }

    // Create a generic user record with provided userid and role
    public function createUserWithId($userid, $role, $password, $name = null, $email = null, $phone = null) {
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $this->conn->prepare("INSERT INTO users (userid, password, role, name, email, phone) VALUES (?, ?, ?, ?, ?, ?)");
        if (!$stmt) {
            throw new Exception('Prepare failed: ' . $this->conn->error);
        }
        $stmt->bind_param("ssssss", $userid, $hashedPassword, $role, $name, $email, $phone);
        return $stmt->execute();
    }
    // Get user by ID
    public function getUserById($userid) {
        $stmt = $this->conn->prepare("SELECT userid, password, role, name, email, phone, otp FROM users WHERE userid = ?");
        $stmt->bind_param("s", $userid);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }

    // Update user by ID
    public function updateUser($userid, $role = null, $password = null, $otp = null) {
        $fields = [];
        $params = [];
        $types = "";
        if ($role !== null) {
            $fields[] = "role = ?";
            $params[] = $role;
            $types .= "s";
        }
        if ($password !== null) {
            $fields[] = "password = ?";
            $params[] = password_hash($password, PASSWORD_BCRYPT);
            $types .= "s";
        }
        if ($otp !== null) {
            $fields[] = "otp = ?";
            $params[] = $otp;
            $types .= "s";
        }
        if (empty($fields)) return false;
        $params[] = $userid;
        $types .= "s";
        $sql = "UPDATE users SET ".implode(", ", $fields)." WHERE userid = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        return $stmt->execute();
    }

    // Delete user by ID
    public function deleteUser($userid) {
        $stmt = $this->conn->prepare("DELETE FROM users WHERE userid = ?");
        $stmt->bind_param("s", $userid);
        return $stmt->execute();
    }

    // Get all users
    public function getAllUsers() {
        $result = $this->conn->query("SELECT userid, role, otp FROM users");
        if ($result) {
            return $result->fetch_all(MYSQLI_ASSOC);
        }
        return false;
    }
    
    // =====================================================
    // TEACHER METHODS
    // =====================================================

    // Get all teachers
    public function getAllTeachers() {
        try {
            $stmt = $this->conn->prepare("SELECT userid, name, email, phone, created_at FROM users WHERE role = 'teacher' ORDER BY created_at DESC");
            $stmt->execute();
            $result = $stmt->get_result();
            
            $teachers = [];
            while ($row = $result->fetch_assoc()) {
                $teachers[] = $row;
            }
            
            return $teachers;
        } catch (Exception $e) {
            error_log("Error getting all teachers: " . $e->getMessage());
            return false;
        }
    }

    // Update teacher
    public function updateTeacher($teacherId, $data) {
        try {
            $updateFields = [];
            $types = '';
            $values = [];
            
            if (isset($data['name'])) {
                $updateFields[] = 'name = ?';
                $types .= 's';
                $values[] = $data['name'];
            }
            
            if (isset($data['email'])) {
                $updateFields[] = 'email = ?';
                $types .= 's';
                $values[] = $data['email'];
            }
            
            if (isset($data['phone'])) {
                $updateFields[] = 'phone = ?';
                $types .= 's';
                $values[] = $data['phone'];
            }
            
            if (isset($data['password'])) {
                $updateFields[] = 'password = ?';
                $types .= 's';
                $values[] = $data['password'];
            }
            
            if (empty($updateFields)) {
                return false;
            }
            
            $values[] = $teacherId;
            $types .= 's';
            
            $sql = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE userid = ? AND role = 'teacher'";
            $stmt = $this->conn->prepare($sql);
            $stmt->bind_param($types, ...$values);
            
            return $stmt->execute();
        } catch (Exception $e) {
            error_log("Error updating teacher: " . $e->getMessage());
            return false;
        }
    }

    // Get teacher by email
    public function getTeacherByEmail($email) {
        try {
            $stmt = $this->conn->prepare("SELECT * FROM users WHERE email = ? AND role = 'teacher'");
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $result = $stmt->get_result();
            
            return $result->fetch_assoc();
        } catch (Exception $e) {
            error_log("Error getting teacher by email: " . $e->getMessage());
            return false;
        }
    }

    // Check if email exists
    public function emailExists($email) {
        try {
            $stmt = $this->conn->prepare("SELECT COUNT(*) as count FROM users WHERE email = ?");
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            
            return $row['count'] > 0;
        } catch (Exception $e) {
            error_log("Error checking email existence: " . $e->getMessage());
            return false;
        }
    }
}

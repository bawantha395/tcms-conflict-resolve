<?php
class StudentModel {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Check if student with same NIC exists
    public function checkNicExists($nic) {
        if (empty($nic)) return false;
        
        $stmt = $this->conn->prepare("SELECT user_id FROM students WHERE nic = ?");
        $stmt->bind_param("s", $nic);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->num_rows > 0;
    }

    // Check if student with same mobile number exists
    public function checkMobileExists($mobile) {
        $stmt = $this->conn->prepare("SELECT user_id FROM students WHERE mobile_number = ?");
        $stmt->bind_param("s", $mobile);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->num_rows > 0;
    }

    // Check if student with same email exists
    public function checkEmailExists($email) {
        if (empty($email)) return false;
        
        $stmt = $this->conn->prepare("SELECT user_id FROM students WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->num_rows > 0;
    }

    // Validate student data for duplicates
    public function validateStudentData($studentData) {
        $errors = [];
        
        // Check NIC
        if (!empty($studentData['nic']) && $this->checkNicExists($studentData['nic'])) {
            $errors[] = 'A student with this NIC number already exists';
        }
        
        // Check mobile
        if ($this->checkMobileExists($studentData['mobile'])) {
            $errors[] = 'A student with this mobile number already exists';
        }
        
        // Check email
        if (!empty($studentData['email']) && $this->checkEmailExists($studentData['email'])) {
            $errors[] = 'A student with this email address already exists';
        }
        
        return $errors;
    }

    public function createStudent($userid, $studentData) {
        // Validate for duplicates before creating
        $validationErrors = $this->validateStudentData($studentData);
        if (!empty($validationErrors)) {
            return ['success' => false, 'errors' => $validationErrors];
        }

        // Provide default values for empty fields
        $firstName = $studentData['firstName'] ?? '';
        $lastName = $studentData['lastName'] ?? '';
        $nic = $studentData['nic'] ?? '';
        $gender = !empty($studentData['gender']) ? $studentData['gender'] : 'Male';
        $age = !empty($studentData['age']) ? $studentData['age'] : '0';
        $email = $studentData['email'] ?? '';
        $mobile = $studentData['mobile'] ?? '';
        $parentName = $studentData['parentName'] ?? '';
        $parentMobile = $studentData['parentMobile'] ?? '';
        $stream = $studentData['stream'] ?? '';
        $dateOfBirth = !empty($studentData['dateOfBirth']) ? $studentData['dateOfBirth'] : '1900-01-01';
        $school = $studentData['school'] ?? '';
        $address = $studentData['address'] ?? '';
        $district = $studentData['district'] ?? '';

        // Auto-generate barcode data using student ID
        $barcodeData = $userid;
        $barcodeGeneratedAt = date('Y-m-d H:i:s');
        
        // Set registration method (default to 'Physical' for backward compatibility)
        $registrationMethod = $studentData['registration_method'] ?? 'Physical';

        // $stmt = $this->conn->prepare("
        //     INSERT INTO students (
        //         user_id, first_name, last_name, nic, gender, age, email, mobile_number, 
        //         parent_name, parent_mobile_number, stream, date_of_birth, school, address, district,
        //         barcode_data, barcode_generated_at, registration_method
        //     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        // ");
        
        // Ensure empty NIC is stored as NULL to avoid UNIQUE '' collisions
        $stmt = $this->conn->prepare("
            INSERT INTO students (
                user_id, first_name, last_name, nic, gender, age, email, mobile_number, 
                parent_name, parent_mobile_number, stream, date_of_birth, school, address, district,
                barcode_data, barcode_generated_at, registration_method
            ) VALUES (?, ?, ?, NULLIF(?, ''), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->bind_param("ssssssssssssssssss", 
            $userid,
            $firstName,
            $lastName,
            $nic,
            $gender,
            $age,
            $email,
            $mobile,
            $parentName,
            $parentMobile,
            $stream,
            $dateOfBirth,
            $school,
            $address,
            $district,
            $barcodeData,
            $barcodeGeneratedAt,
            $registrationMethod
        );

        $result = $stmt->execute();
        
        // If student creation successful, sync barcode to auth database
        if ($result) {
            $this->syncBarcodeToAuthDB($userid, $barcodeData, "$firstName $lastName");
            return ['success' => true];
        } else {
            return ['success' => false, 'errors' => ['Database error occurred']];
        }
    }
    
    /**
     * Sync barcode data to auth database for attendance system
     */
    private function syncBarcodeToAuthDB($userid, $barcodeData, $studentName) {
        try {
            // Connect to auth database
            $authConn = new mysqli(
                'auth-mysql-server',  // Use docker service name
                'root',
                'root',
                'auth-db'
            );
            
            if ($authConn->connect_error) {
                error_log("Failed to connect to auth database for barcode sync: " . $authConn->connect_error);
                return false;
            }
            
            // Check if barcode already exists
            $checkStmt = $authConn->prepare("SELECT userid FROM barcodes WHERE userid = ?");
            $checkStmt->bind_param("s", $userid);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows > 0) {
                // Update existing barcode
                $updateStmt = $authConn->prepare("
                    UPDATE barcodes 
                    SET barcode_data = ?, student_name = ?, updated_at = NOW() 
                    WHERE userid = ?
                ");
                $updateStmt->bind_param("sss", $barcodeData, $studentName, $userid);
                $updateStmt->execute();
                $updateStmt->close();
            } else {
                // Insert new barcode
                $insertStmt = $authConn->prepare("
                    INSERT INTO barcodes (userid, barcode_data, student_name, created_at, updated_at) 
                    VALUES (?, ?, ?, NOW(), NOW())
                ");
                $insertStmt->bind_param("sss", $userid, $barcodeData, $studentName);
                $insertStmt->execute();
                $insertStmt->close();
            }
            
            $checkStmt->close();
            $authConn->close();
            return true;
            
        } catch (Exception $e) {
            error_log("Error syncing barcode to auth database: " . $e->getMessage());
            return false;
        }
    }

    public function getStudentByUserId($userid) {
        $stmt = $this->conn->prepare("
            SELECT * FROM students WHERE user_id = ?
        ");
        $stmt->bind_param("s", $userid);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }

    public function getAllStudents() {
        $result = $this->conn->query("SELECT * FROM students");
        if ($result) {
            return $result->fetch_all(MYSQLI_ASSOC);
        }
        return false;
    }

    public function updateStudent($userid, $studentData) {
        // First get the existing student data
        $existingStudent = $this->getStudentByUserId($userid);
        if (!$existingStudent) {
            return false;
        }

        // Merge with existing data, only update provided fields
        $firstName = $studentData['firstName'] ?? $existingStudent['first_name'];
        $lastName = $studentData['lastName'] ?? $existingStudent['last_name'];
        $nic = $studentData['nic'] ?? $existingStudent['nic'];
        $gender = $studentData['gender'] ?? $existingStudent['gender'];
        $age = $studentData['age'] ?? $existingStudent['age'];
        $email = $studentData['email'] ?? $existingStudent['email'];
        $mobile = $studentData['mobile'] ?? $existingStudent['mobile_number'];
        $parentName = $studentData['parentName'] ?? $existingStudent['parent_name'];
        $parentMobile = $studentData['parentMobile'] ?? $existingStudent['parent_mobile_number'];
        $stream = $studentData['stream'] ?? $existingStudent['stream'];
        $dateOfBirth = $studentData['dateOfBirth'] ?? $existingStudent['date_of_birth'];
        $school = $studentData['school'] ?? $existingStudent['school'];
        $address = $studentData['address'] ?? $existingStudent['address'];
        $district = $studentData['district'] ?? $existingStudent['district'];
        $barcodeData = $studentData['barcodeData'] ?? $existingStudent['barcode_data'];
        $barcodeGeneratedAt = $studentData['barcodeGeneratedAt'] ?? $existingStudent['barcode_generated_at'];

        $stmt = $this->conn->prepare("
            UPDATE students SET 
                first_name = ?, last_name = ?, nic = NULLIF(?, ''), gender = ?, age = ?, 
                email = ?, mobile_number = ?, parent_name = ?, parent_mobile_number = ?, 
                stream = ?, date_of_birth = ?, school = ?, address = ?, district = ?,
                barcode_data = ?, barcode_generated_at = ?
            WHERE user_id = ?
        ");
        
        $stmt->bind_param("sssssssssssssssss", 
            $firstName,
            $lastName,
            $nic,
            $gender,
            $age,
            $email,
            $mobile,
            $parentName,
            $parentMobile,
            $stream,
            $dateOfBirth,
            $school,
            $address,
            $district,
            $barcodeData,
            $barcodeGeneratedAt,
            $userid
        );

        $result = $stmt->execute();
        
        // If update successful and barcode data changed, sync to auth database
        if ($result && isset($studentData['barcodeData'])) {
            $this->syncBarcodeToAuthDB($userid, $barcodeData, "$firstName $lastName");
        }
        
        return $result;
    }

    public function generateBarcodeForStudent($userid) {
        // Check if student exists
        $existingStudent = $this->getStudentByUserId($userid);
        if (!$existingStudent) {
            return false;
        }

        // Generate barcode data using student ID
        $barcodeData = $userid;
        $barcodeGeneratedAt = date('Y-m-d H:i:s');

        $stmt = $this->conn->prepare("
            UPDATE students SET 
                barcode_data = ?, barcode_generated_at = ?
            WHERE user_id = ?
        ");
        
        $stmt->bind_param("sss", $barcodeData, $barcodeGeneratedAt, $userid);
        $result = $stmt->execute();
        
        // If barcode generation successful, sync to auth database
        if ($result) {
            $studentName = $existingStudent['first_name'] . ' ' . $existingStudent['last_name'];
            $this->syncBarcodeToAuthDB($userid, $barcodeData, $studentName);
        }
        
        return $result;
    }

    public function generateBarcodesForAllStudents() {
        // Get all students without barcodes
        $stmt = $this->conn->prepare("
            SELECT user_id FROM students 
            WHERE barcode_data IS NULL OR barcode_data = ''
        ");
        $stmt->execute();
        $result = $stmt->get_result();
        $students = $result->fetch_all(MYSQLI_ASSOC);

        $successCount = 0;
        foreach ($students as $student) {
            if ($this->generateBarcodeForStudent($student['user_id'])) {
                $successCount++;
            }
        }

        return $successCount;
    }

    public function deleteStudent($userid) {
        $stmt = $this->conn->prepare("DELETE FROM students WHERE user_id = ?");
        $stmt->bind_param("s", $userid);
        return $stmt->execute();
    }
} 
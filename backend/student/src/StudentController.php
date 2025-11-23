<?php
// Set timezone for all date/time operations
date_default_timezone_set('Asia/Colombo');

// src/StudentController.php
require_once 'config.php';
require_once 'StudentModel.php';

class StudentController {
    private $model;

    public function __construct($db) {
        $this->model = new StudentModel($db);
    }

    public function createStudent($data) {
        // Extract password and send to auth API to get user id
        if (empty($data['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'password is required']);
            exit;
        }
        $password = $data['password'];
        // Call auth API using localhost endpoint
        $userApiUrl = 'http://host.docker.internal:8081/routes.php/user';
        $userPayload = json_encode(['role' => 'student', 'password' => $password]);
        $ch = curl_init($userApiUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $userPayload);
        $userApiResponse = curl_exec($ch);
        $userApiStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $userApiData = json_decode($userApiResponse, true);
        if ($userApiStatus !== 200 || empty($userApiData['success']) || empty($userApiData['userid'])) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to get user ID from auth API', 'details' => $userApiData]);
            exit;
        }
        $data['user_id'] = $userApiData['userid'];
        // Remove password before saving student
        unset($data['password']);
        if ($this->model->createStudent($data)) {
            echo json_encode(['success' => true, 'user_id' => $data['user_id']]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Create failed']);
        }
    }
    public function getAllStudents() {
        $students = $this->model->getAllStudents();
        if ($students) {
            return json_encode($students);
        } else {
            http_response_code(404);
            return json_encode(['error' => 'No students found']);
        }
    }
   public function getStudentById($user_id) {
        $student = $this->model->getStudentByUserId($user_id);
        if ($student) {
            return $student; // ✅ Return as array
        } else {
            http_response_code(404);
            return ['error' => 'Student not found'];
        }
    }

    public function updateStudent($user_id, $data) {
        // Check if student exists
        $existingStudent = $this->model->getStudentByUserId($user_id);
        if (!$existingStudent) {
            return ['success' => false, 'message' => 'Student not found'];
        }

        // Update student data
        $result = $this->model->updateStudent($user_id, $data);
        if ($result) {
            return ['success' => true, 'message' => 'Student updated successfully'];
        } else {
            return ['success' => false, 'message' => 'Failed to update student'];
        }
    }

    public function generateBarcodeForStudent($user_id) {
        $result = $this->model->generateBarcodeForStudent($user_id);
        if ($result) {
            return ['success' => true, 'message' => 'Barcode generated successfully'];
        } else {
            return ['success' => false, 'message' => 'Failed to generate barcode'];
        }
    }

    public function generateBarcodesForAllStudents() {
        $count = $this->model->generateBarcodesForAllStudents();
        return ['success' => true, 'message' => "Generated barcodes for {$count} students"];
    }

}
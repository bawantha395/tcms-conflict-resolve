<?php

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: false');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'ClassController.php';
require_once 'EnrollmentController.php';

$method = $_SERVER['REQUEST_METHOD'];

// Normalize path
$scriptName = $_SERVER['SCRIPT_NAME']; // e.g., /routes.php
$path = str_replace($scriptName, '', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// DB connection
$mysqli = new mysqli(
    getenv('DB_HOST'),
    getenv('DB_USER'),
    getenv('DB_PASSWORD'),
    getenv('DB_NAME')
);

if ($mysqli->connect_errno) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

$controller = new ClassController($mysqli);
$enrollmentController = new EnrollmentController($mysqli);

// Test endpoint
if ($method === 'GET' && $path === '/test') {
    echo json_encode([
        'success' => true,
        'message' => 'Class API is working!'
    ]);
    exit;
}

switch ($method) {
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        
        if ($path === '/create_class') {
            $result = $controller->createClass($input);
            echo json_encode($result);
        } elseif ($path === '/update_class') {
            $id = $input['id'];
            unset($input['id']); // Remove id from data array
            $result = $controller->updateClass($id, $input);
            echo json_encode(['success' => $result]);
        } elseif ($path === '/create_enrollment') {
            $result = $enrollmentController->createEnrollment($input);
            echo json_encode($result);
        } elseif ($path === '/update_enrollment') {
            $enrollmentId = $input['id'];
            unset($input['id']); // Remove id from data array
            $result = $enrollmentController->updateEnrollment($enrollmentId, $input);
            echo json_encode($result);
        } elseif ($path === '/delete_enrollment') {
            $enrollmentId = $input['id'];
            $result = $enrollmentController->deleteEnrollment($enrollmentId);
            echo json_encode($result);
        } elseif ($path === '/delete_student_enrollments') {
            $studentId = $input['studentId'];
            $result = $enrollmentController->deleteStudentEnrollments($studentId);
            echo json_encode($result);
        } elseif ($path === '/mark_attendance') {
            $classId = $input['classId'];
            $studentId = $input['studentId'];
            $attendanceData = $input['attendanceData'];
            $result = $enrollmentController->markAttendance($classId, $studentId, $attendanceData);
            echo json_encode($result);
        } elseif ($path === '/request_forget_card') {
            $classId = $input['classId'];
            $studentId = $input['studentId'];
            $result = $enrollmentController->requestForgetCard($classId, $studentId);
            echo json_encode($result);
        } elseif ($path === '/request_late_payment') {
            $classId = $input['classId'];
            $studentId = $input['studentId'];
            $result = $enrollmentController->requestLatePayment($classId, $studentId);
            echo json_encode($result);
        } elseif ($path === '/synchronize_payment_status') {
            $result = $enrollmentController->synchronizeAllPaymentStatuses();
            echo json_encode($result);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
        }
        break;
        
    case 'GET':
        if ($path === '/get_all_classes') {
            $result = $controller->getAllClasses();
            echo json_encode($result);
        } elseif ($path === '/get_active_classes') {
            $result = $controller->getActiveClasses();
            echo json_encode($result);
        } elseif ($path === '/get_class_by_id' && isset($_GET['id'])) {
            $id = $_GET['id'];
            $result = $controller->getClassById($id);
            echo json_encode($result);
        } elseif ($path === '/get_classes_by_teacher' && isset($_GET['teacherId'])) {
            $teacherId = $_GET['teacherId'];
            $result = $controller->getClassesByTeacher($teacherId);
            echo json_encode($result);
        } elseif ($path === '/get_classes_by_stream' && isset($_GET['stream'])) {
            $stream = $_GET['stream'];
            $result = $controller->getClassesByStream($stream);
            echo json_encode($result);
        } elseif ($path === '/get_all_enrollments') {
            $result = $enrollmentController->getAllEnrollments();
            echo json_encode($result);
        } elseif ($path === '/get_enrollments_by_student' && isset($_GET['studentId'])) {
            $studentId = $_GET['studentId'];
            $result = $enrollmentController->getEnrollmentsByStudent($studentId);
            echo json_encode($result);
        } elseif ($path === '/get_enrollments_by_class' && isset($_GET['classId'])) {
            $classId = $_GET['classId'];
            $result = $enrollmentController->getEnrollmentsByClass($classId);
            echo json_encode($result);
        } elseif ($path === '/get_enrollment_by_id' && isset($_GET['id'])) {
            $id = $_GET['id'];
            $result = $enrollmentController->getEnrollmentById($id);
            echo json_encode($result);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
        }
        break;
        
    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (preg_match('/^\/update_class\/(\d+)$/', $path, $matches)) {
            $id = $matches[1];
            $result = $controller->updateClass($id, $input);
            echo json_encode(['success' => $result]);
        } elseif (preg_match('/^\/update_enrollment\/(\d+)$/', $path, $matches)) {
            $enrollmentId = $matches[1];
            $result = $enrollmentController->updateEnrollment($enrollmentId, $input);
            echo json_encode($result);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
        }
        break;
        
    case 'DELETE':
        if (preg_match('/^\/delete_class\/(\d+)$/', $path, $matches)) {
            $id = $matches[1];
            $result = $controller->deleteClass($id);
            echo json_encode(['success' => $result]);
        } elseif (preg_match('/^\/delete_enrollment\/(\d+)$/', $path, $matches)) {
            $enrollmentId = $matches[1];
            $result = $enrollmentController->deleteEnrollment($enrollmentId);
            echo json_encode($result);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}
?>

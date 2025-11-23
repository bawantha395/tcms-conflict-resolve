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
require_once 'LatePayController.php';
require_once 'EntryPermitController.php';

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
$latePayController = new LatePayController($mysqli);
$entryPermitController = new EntryPermitController($mysqli);

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
        } elseif ($path === '/update_enrollment_payment') {
            // Update enrollment payment with new array-based signature
            $result = $enrollmentController->updateEnrollmentPayment($input);
            echo json_encode($result);
        } elseif ($path === '/late_pay/issue') {
            // Issue late pay permission
            $result = $latePayController->issuePermission($input);
            echo json_encode($result);
        } elseif ($path === '/late_pay/cleanup') {
            // Clean up old late pay permissions
            $result = $latePayController->cleanupOldPermissions();
            echo json_encode($result);
        } elseif ($path === '/late_pay/expire') {
            // Expire yesterday's late pay permissions
            $result = $latePayController->expireYesterdayPermissions();
            echo json_encode($result);
        } elseif ($path === '/entry_permit/issue') {
            // Issue entry permit for student who forgot ID card
            $entryPermitController->issuePermit();
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
        }
        break;
        
    case 'GET':
        if ($path === '/get_class_name_list') {
            $result = $controller->getClassNameList();
            echo json_encode(['success' => true, 'data' => $result]);
        } elseif ($path === '/get_all_classes') {
            $result = $controller->getAllClasses();
            echo json_encode(['success' => true, 'data' => $result]);
        } elseif ($path === '/get_active_classes') {
            $result = $controller->getActiveClasses();
            echo json_encode(['success' => true, 'data' => $result]);
        } elseif ($path === '/get_class_by_id' && isset($_GET['id'])) {
            $id = $_GET['id'];
            $result = $controller->getClassById($id);
            if ($result) {
                echo json_encode(['success' => true, 'data' => $result]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Class not found']);
            }
        } elseif ($path === '/get_classes_by_teacher' && isset($_GET['teacherId'])) {
            $teacherId = $_GET['teacherId'];
            $result = $controller->getClassesByTeacher($teacherId);
            echo json_encode(['success' => true, 'data' => $result]);
        } elseif ($path === '/get_classes_by_stream' && isset($_GET['stream'])) {
            $stream = $_GET['stream'];
            $result = $controller->getClassesByStream($stream);
            echo json_encode(['success' => true, 'data' => $result]);
        } elseif ($path === '/get_all_enrollments') {
            $result = $enrollmentController->getAllEnrollments();
            echo json_encode($result);
        } elseif ($path === '/get_enrollments_by_student' && isset($_GET['studentId'])) {
            $studentId = $_GET['studentId'];
            $result = $enrollmentController->getStudentEnrollments($studentId);
            echo json_encode($result);
        } elseif ($path === '/get_enrollments_by_class' && isset($_GET['classId'])) {
            $classId = $_GET['classId'];
            $result = $enrollmentController->getClassEnrollments($classId);
            echo json_encode($result);
        } elseif ($path === '/get_enrollment_by_id' && isset($_GET['id'])) {
            $id = $_GET['id'];
            $result = $enrollmentController->getEnrollmentById($id);
            echo json_encode(['success' => true, 'data' => $result]);
        } elseif ($path === '/late_pay/check' && isset($_GET['student_id']) && isset($_GET['class_id'])) {
            // Check late pay permission
            $studentId = $_GET['student_id'];
            $classId = $_GET['class_id'];
            $date = $_GET['date'] ?? null;
            $result = $latePayController->checkPermission($studentId, $classId, $date);
            echo json_encode($result);
        } elseif (preg_match('/^\/late_pay\/student\/(.+)$/', $path, $matches)) {
            // Get student permissions
            $studentId = $matches[1];
            $result = $latePayController->getStudentPermissions($studentId);
            echo json_encode($result);
        } elseif (preg_match('/^\/late_pay\/cashier\/(.+)$/', $path, $matches)) {
            // Get cashier permissions for today
            $cashierId = $matches[1];
            $date = $_GET['date'] ?? null;
            $result = $latePayController->getCashierPermissions($cashierId, $date);
            echo json_encode($result);
        } elseif ($path === '/late_pay/all_active') {
            // Get all active late pay permissions for today
            $date = $_GET['date'] ?? null;
            $result = $latePayController->getAllActivePermissions($date);
            echo json_encode($result);
        } elseif ($path === '/late_pay/all_history') {
            // Get all late pay permissions history
            $limit = $_GET['limit'] ?? 100;
            $result = $latePayController->getAllPermissionsHistory($limit);
            echo json_encode($result);
        } elseif ($path === '/entry_permit/check' && isset($_GET['student_id']) && isset($_GET['class_id'])) {
            // Check entry permit
            $entryPermitController->checkPermit();
        } elseif ($path === '/entry_permit/today') {
            // Get all entry permits for today
            $entryPermitController->getTodayPermits();
        } elseif ($path === '/entry_permit/history') {
            // Get all entry permit history
            $entryPermitController->getPermitHistory();
        } elseif ($path === '/entry_permit/student_count' && isset($_GET['student_id'])) {
            // Get entry permit count for student
            $entryPermitController->getStudentPermitCount();
        } elseif ($path === '/entry_permit/by_date') {
            // Get entry permits by date range
            $entryPermitController->getPermitsByDateRange();
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
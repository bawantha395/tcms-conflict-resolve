<?php
// Ensure no output before headers
ob_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Zoom-Signature, X-Zoom-Signature-Timestamp');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database connections - using environment variables like class backend
$mysqli = new mysqli(
    getenv('DB_HOST'),
    getenv('DB_USER'),
    getenv('DB_PASSWORD'),
    getenv('DB_NAME')
);

if ($mysqli->connect_errno) {
    http_response_code(500);
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    echo json_encode(['error' => 'Attendance database connection failed']);
    exit;
}

// Connect to class database for class data (optional)
$classConn = null;
try {
    $classConn = new mysqli(
        'class-mysql-server',
        'classuser',
        'classpass',
        'class_db'
    );
    
    if ($classConn->connect_errno) {
        error_log('Class database connection failed: ' . $classConn->connect_error);
        $classConn = null;
    }
} catch (Exception $e) {
    error_log('Class database connection error: ' . $e->getMessage());
    $classConn = null;
}

// Connect to auth database for student data (optional)
$authConn = null;
try {
    $authConn = new mysqli(
        'auth-mysql-server',
        'devuser',
        'devpass',
        'auth-db'
    );
    
    if ($authConn->connect_errno) {
        error_log('Auth database connection failed: ' . $authConn->connect_error);
        $authConn = null;
    }
} catch (Exception $e) {
    error_log('Auth database connection error: ' . $e->getMessage());
    $authConn = null;
}

// Controllers
require_once __DIR__ . '/ZoomWebhookController.php';
require_once __DIR__ . '/AttendanceController.php';

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Remove base path if needed
$path = str_replace('/attendance-backend', '', $path);

// Initialize controllers
$zoomWebhookController = new ZoomWebhookController($mysqli, $classConn, $authConn);
$attendanceController = new AttendanceController($mysqli, $classConn, $authConn);

// Route handling
try {
    // Zoom Webhook Endpoint
    if ($method === 'POST' && $path === '/zoom-webhook') {
        $rawPayload = file_get_contents('php://input');
        $input = json_decode($rawPayload, true);
        
        if (!$input) {
            http_response_code(400);
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization');
            echo json_encode(['success' => false, 'message' => 'Invalid JSON payload']);
            exit();
        }
        
        $result = $zoomWebhookController->handleWebhook($input, $rawPayload);
        echo json_encode($result);
        exit();
    }
    
    // Get attendance for a class
    if ($method === 'GET' && preg_match('/^\/attendance\/(\d+)$/', $path, $matches)) {
        $classId = $matches[1];
        $result = $attendanceController->getClassAttendance($classId);
        echo json_encode($result);
        exit();
    }

    // Get student details and enrolled classes by barcode ID
    if ($method === 'GET' && preg_match('/^\/student-details\/([^\/]+)$/', $path, $matches)) {
        $studentId = $matches[1];
        $result = $attendanceController->getStudentDetailsAndEnrollments($studentId);
        echo json_encode($result);
        exit();
    }

    // Check if student is enrolled in a class
    if ($method === 'GET' && preg_match('/^\/is-enrolled\/([^\/]+)\/([^\/]+)$/', $path, $matches)) {
        $studentId = $matches[1];
        $classId = $matches[2];
        $result = $attendanceController->isStudentEnrolledInClass($studentId, $classId);
        echo json_encode($result);
        exit();
    }
    
    // Get attendance for a student
    if ($method === 'GET' && preg_match('/^\/student-attendance\/([^\/]+)$/', $path, $matches)) {
        $studentId = $matches[1];
        $result = $attendanceController->getStudentAttendance($studentId);
        echo json_encode($result);
        exit();
    }
    
    // Get attendance analytics
    if ($method === 'GET' && $path === '/attendance-analytics') {
        $classId = $_GET['class_id'] ?? null;
        $startDate = $_GET['start_date'] ?? null;
        $endDate = $_GET['end_date'] ?? null;
        
        $result = $attendanceController->getAttendanceAnalytics($classId, $startDate, $endDate);
        echo json_encode($result);
        exit();
    }
    
    // Get Zoom meeting sessions
    if ($method === 'GET' && preg_match('/^\/zoom-sessions\/(\d+)$/', $path, $matches)) {
        $classId = $matches[1];
        $result = $attendanceController->getZoomSessions($classId);
        echo json_encode($result);
        exit();
    }
    
    // Get meeting participants
    if ($method === 'GET' && preg_match('/^\/meeting-participants\/([^\/]+)$/', $path, $matches)) {
        $meetingId = $matches[1];
        $result = $attendanceController->getMeetingParticipants($meetingId);
        echo json_encode($result);
        exit();
    }
    
    // Manual attendance marking (fallback)
    if ($method === 'POST' && $path === '/mark-attendance') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['classId']) || !isset($input['studentId'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required parameters']);
            exit();
        }
        
        $result = $attendanceController->markManualAttendance(
            $input['classId'],
            $input['studentId'],
            $input['attendanceData'] ?? []
        );
        echo json_encode($result);
        exit();
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization');
    }
    
    // Update attendance status
    if ($method === 'PUT' && preg_match('/^\/attendance\/(\d+)$/', $path, $matches)) {
        $attendanceId = $matches[1];
        $input = json_decode(file_get_contents('php://input'), true);
        
        $result = $attendanceController->updateAttendanceStatus($attendanceId, $input);
        echo json_encode($result);
        exit();
    }

    // Update attendance settings
    if ($method === 'PUT' && $path === '/settings') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !is_array($input)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid settings payload']);
            exit();
        }

        $result = $attendanceController->updateSettings($input);
        echo json_encode($result);
        exit();
    }

    // Session persistence API (simple server-backed session blobs)
    if ($method === 'POST' && $path === '/session') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !isset($input['sessionId'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'sessionId is required']);
            exit();
        }
        $result = $attendanceController->saveSession($input['sessionId'], $input['data'] ?? []);
        echo json_encode($result);
        exit();
    }

    if ($method === 'GET' && preg_match('/^\/session\/([^\/]+)$/', $path, $matches)) {
        $sessionId = $matches[1];
        $result = $attendanceController->loadSession($sessionId);
        echo json_encode($result);
        exit();
    }

    if ($method === 'DELETE' && preg_match('/^\/session\/([^\/]+)$/', $path, $matches)) {
        $sessionId = $matches[1];
        $result = $attendanceController->deleteSession($sessionId);
        echo json_encode($result);
        exit();
    }

    // Get attendance settings
    if ($method === 'GET' && $path === '/settings') {
        $result = $attendanceController->getSettings();
        echo json_encode($result);
        exit();
    }
    
    // Delete attendance record
    if ($method === 'DELETE' && preg_match('/^\/attendance\/(\d+)$/', $path, $matches)) {
        $attendanceId = $matches[1];
        $result = $attendanceController->deleteAttendance($attendanceId);
        echo json_encode($result);
        exit();
    }
    
    // Monthly attendance summary
    if ($method === 'GET' && $path === '/monthly-attendance') {
        $classId = $_GET['class_id'] ?? null;
        $year = $_GET['year'] ?? date('Y');
        $month = $_GET['month'] ?? date('m');
        
        if (!$classId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'class_id is required']);
            exit();
        }
        
        $result = $attendanceController->getMonthlyAttendancePattern($classId, $year, $month);
        echo json_encode($result);
        exit();
    }
    
    // Track join button click
    if ($method === 'POST' && $path === '/track-join-click') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['classId']) || !isset($input['studentId'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'classId and studentId are required']);
            exit();
        }
        
        $result = $attendanceController->trackJoinButtonClick(
            $input['classId'],
            $input['studentId'],
            $input['clickData'] ?? []
        );
        echo json_encode($result);
        exit();
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization');
    }
    
    // Get join button clicks history
    if ($method === 'GET' && $path === '/join-clicks') {
        $classId = $_GET['class_id'] ?? null;
        $studentId = $_GET['student_id'] ?? null;
        $startDate = $_GET['start_date'] ?? null;
        $endDate = $_GET['end_date'] ?? null;
        
        $result = $attendanceController->getJoinButtonClicks($classId, $studentId, $startDate, $endDate);
        echo json_encode($result);
        exit();
    }

    // Export attendance report
    if ($method === 'GET' && $path === '/export-attendance') {
        $classId = $_GET['class_id'] ?? null;
        $format = $_GET['format'] ?? 'json'; // json, csv, pdf
        $startDate = $_GET['start_date'] ?? null;
        $endDate = $_GET['end_date'] ?? null;
        
        $result = $attendanceController->exportAttendanceReport($classId, $format, $startDate, $endDate);
        
        if ($format === 'csv') {
            header('Content-Type: text/csv');
            header('Content-Disposition: attachment; filename="attendance_report.csv"');
            echo $result;
        } elseif ($format === 'pdf') {
            header('Content-Type: application/pdf');
            header('Content-Disposition: attachment; filename="attendance_report.pdf"');
            echo $result;
        } else {
            echo json_encode($result);
        }
        exit();
    }

    // Get real-time attendance for a class (for live updates)
    if ($method === 'GET' && preg_match('/^\/real-time-attendance\/(\d+)$/', $path, $matches)) {
        $classId = $matches[1];
        $date = $_GET['date'] ?? date('Y-m-d');
        
        $result = $attendanceController->getRealTimeAttendance($classId, $date);
        echo json_encode($result);
        exit();
    }

    // Get attendance summary for dashboard
    if ($method === 'GET' && $path === '/attendance-summary') {
        $classId = $_GET['class_id'] ?? null;
        $date = $_GET['date'] ?? date('Y-m-d');
        
        $result = $attendanceController->getAttendanceSummary($classId, $date);
        echo json_encode($result);
        exit();
    }

    // Record video attendance tracking
    if ($method === 'POST' && $path === '/record-video-attendance') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['classId']) || !isset($input['studentId'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields']);
            exit();
        }
        
        $result = $attendanceController->recordVideoAttendance(
            $input['classId'],
            $input['studentId'],
            $input['videoData'] ?? []
        );
        echo json_encode($result);
        exit();
    }
    
    // Health check endpoint
    if ($method === 'GET' && $path === '/health') {
        echo json_encode([
            'success' => true,
            'message' => 'Attendance backend is running',
            'timestamp' => date('Y-m-d H:i:s'),
            'version' => '1.0.0'
        ]);
        exit();
    }
    
    // Route not found
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'message' => 'Route not found',
        'path' => $path,
        'method' => $method
    ]);
    
} catch (Exception $e) {
    error_log('Attendance Backend Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error',
        'error' => $e->getMessage()
    ]);
}
?>

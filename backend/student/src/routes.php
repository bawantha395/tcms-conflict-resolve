<?php
// CORS headers to allow cross-origin requests from frontend
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/StudentController.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

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

$controller = new StudentController($mysqli);

// Router test
if ($method === 'GET' && $path === '/routes.php/test') {
    echo json_encode([
        'success' => true,
        'message' => 'Test route works!'
    ]);
    exit;
}

// CREATE student
if ($method === 'POST' && $path === '/routes.php/student') {
    $data = json_decode(file_get_contents('php://input'), true);
    $controller->createStudent($data);
    exit;
}

// REGISTER student (with validation)
if ($method === 'POST' && $path === '/routes.php/register-student') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['password']) || !isset($data['studentData'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing password or student data']);
        exit;
    }
    
    require_once __DIR__ . '/StudentModel.php';
    $studentModel = new StudentModel($mysqli);
    
    // Validate student data
    $validationErrors = $studentModel->validateStudentData($data['studentData']);
    if (!empty($validationErrors)) {
        echo json_encode([
            'success' => false, 
            'message' => implode(', ', $validationErrors)
        ]);
        exit;
    }
    
    // Create student
    $result = $studentModel->createStudent($data['userid'], $data['studentData']);
    if ($result['success']) {
        echo json_encode([
            'success' => true,
            'userid' => $data['userid'],
            'message' => 'Student registered successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false, 
            'message' => implode(', ', $result['errors'])
        ]);
    }
    exit;
}
// Get all students
if ($method === 'GET' && $path === '/routes.php/getAllStudents') {
    $students = $controller->getAllStudents();
    echo $students;
    exit;
}
// Get student by ID
if ($method === 'GET' && preg_match('#^\/routes.php\/get_with_id\/([A-Za-z0-9]+)$#', $path, $matches)) {
    $user_id = $matches[1];
    // echo json_encode(["user_id" => $user_id]);
    $student = $controller->getStudentById($user_id);
    if ($student) {
        echo json_encode($student);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Student not found', 'user_id' => $user_id]);
    }
    exit;
}

// Update student
if ($method === 'PUT' && preg_match('#^\/routes.php\/update-student\/([A-Za-z0-9]+)$#', $path, $matches)) {
    $user_id = $matches[1];
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
        exit;
    }
    
    $result = $controller->updateStudent($user_id, $data);
    echo json_encode($result);
    exit;
}

// Generate barcode for individual student
if ($method === 'POST' && preg_match('#^\/routes.php\/generate-barcode\/([A-Za-z0-9]+)$#', $path, $matches)) {
    $user_id = $matches[1];
    $result = $controller->generateBarcodeForStudent($user_id);
    echo json_encode($result);
    exit;
}

// Generate barcodes for all students
if ($method === 'POST' && $path === '/routes.php/generate-all-barcodes') {
    $result = $controller->generateBarcodesForAllStudents();
    echo json_encode($result);
    exit;
}

// =====================================================
// STUDENT MONITORING ROUTES
// =====================================================

require_once __DIR__ . '/StudentMonitoringController.php';
$monitoringController = new StudentMonitoringController($mysqli);

// Track student login activity
if ($method === 'POST' && $path === '/routes.php/track-student-login') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['studentId']) || !isset($data['sessionId'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing studentId or sessionId']);
        exit;
    }
    echo json_encode($monitoringController->trackStudentLogin($data['studentId'], $data['sessionId']));
    exit;
}

// Track concurrent session
if ($method === 'POST' && $path === '/routes.php/track-concurrent-session') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['studentId']) || !isset($data['sessionId']) || !isset($data['classId'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing studentId, sessionId, or classId']);
        exit;
    }
    echo json_encode($monitoringController->trackConcurrentSession($data['studentId'], $data['sessionId'], $data['classId']));
    exit;
}

// End concurrent session
if ($method === 'POST' && $path === '/routes.php/end-concurrent-session') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['sessionId'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing sessionId']);
        exit;
    }
    echo json_encode($monitoringController->endConcurrentSession($data['sessionId']));
    exit;
}

// Get student monitoring data
if ($method === 'GET' && preg_match('#^/routes.php/student-monitoring/([A-Za-z0-9]+)$#', $path, $matches)) {
    $studentId = $matches[1];
    $limit = $_GET['limit'] ?? 50;
    echo json_encode($monitoringController->getStudentMonitoringData($studentId, $limit));
    exit;
}

// Get suspicious activities
if ($method === 'GET' && $path === '/routes.php/suspicious-activities') {
    $limit = $_GET['limit'] ?? 100;
    echo json_encode($monitoringController->getSuspiciousActivities($limit));
    exit;
}

// Get concurrent session violations
if ($method === 'GET' && $path === '/routes.php/concurrent-violations') {
    $limit = $_GET['limit'] ?? 100;
    echo json_encode($monitoringController->getConcurrentSessionViolations($limit));
    exit;
}

// Block student
if ($method === 'POST' && $path === '/routes.php/block-student') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['studentId']) || !isset($data['reason']) || !isset($data['blockedBy'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing studentId, reason, or blockedBy']);
        exit;
    }
    $blockDuration = $data['blockDuration'] ?? 24;
    echo json_encode($monitoringController->blockStudent($data['studentId'], $data['reason'], $data['blockedBy'], $blockDuration));
    exit;
}

// Unblock student
if ($method === 'POST' && $path === '/routes.php/unblock-student') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['studentId'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing studentId']);
        exit;
    }
    echo json_encode($monitoringController->unblockStudent($data['studentId']));
    exit;
}

// Check if student is blocked
if ($method === 'GET' && preg_match('#^/routes.php/student-blocked/([A-Za-z0-9]+)$#', $path, $matches)) {
    $studentId = $matches[1];
    echo json_encode($monitoringController->isStudentBlocked($studentId));
    exit;
}

// Get student block history
if ($method === 'GET' && preg_match('#^/routes.php/student-block-history/([A-Za-z0-9]+)$#', $path, $matches)) {
    $studentId = $matches[1];
    echo json_encode($monitoringController->getStudentBlockHistory($studentId));
    exit;
}

// Get monitoring statistics
if ($method === 'GET' && $path === '/routes.php/monitoring-statistics') {
    echo json_encode($monitoringController->getMonitoringStatistics());
    exit;
}

// Detect cheating
if ($method === 'POST' && $path === '/routes.php/detect-cheating') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['studentId']) || !isset($data['classId']) || !isset($data['sessionId'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing studentId, classId, or sessionId']);
        exit;
    }
    echo json_encode($monitoringController->detectCheating($data['studentId'], $data['classId'], $data['sessionId']));
    exit;
}

// Get detailed monitoring report
if ($method === 'GET' && $path === '/routes.php/monitoring-report') {
    $studentId = $_GET['studentId'] ?? null;
    $dateFrom = $_GET['dateFrom'] ?? null;
    $dateTo = $_GET['dateTo'] ?? null;
    echo json_encode($monitoringController->getDetailedMonitoringReport($studentId, $dateFrom, $dateTo));
    exit;
}

// Check for concurrent logins
if ($method === 'GET' && preg_match('#^/routes.php/check-concurrent-logins/([A-Za-z0-9]+)$#', $path, $matches)) {
    $studentId = $matches[1];
    echo json_encode($monitoringController->checkConcurrentLogins($studentId));
    exit;
}

// Get student devices
if ($method === 'GET' && preg_match('#^/routes.php/student-devices/([A-Za-z0-9]+)$#', $path, $matches)) {
    $studentId = $matches[1];
    echo json_encode($monitoringController->getStudentDevices($studentId));
    exit;
}

// Detect multiple device login
if ($method === 'POST' && $path === '/routes.php/detect-multiple-device-login') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['studentId']) || !isset($data['deviceFingerprint'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing studentId or deviceFingerprint']);
        exit;
    }
    echo json_encode($monitoringController->detectMultipleDeviceLogin($data['studentId'], $data['deviceFingerprint']));
    exit;
}

// Check if session is valid (for real-time session validation)
if ($method === 'GET' && preg_match('#^/routes.php/session-valid/([A-Za-z0-9]+)$#', $path, $matches)) {
    $studentId = $matches[1];
    echo json_encode($monitoringController->isSessionValid($studentId));
    exit;
}

// Delete student
if ($method === 'DELETE' && preg_match('#^/routes.php/delete-student/([A-Za-z0-9]+)$#', $path, $matches)) {
    $userid = $matches[1];
    require_once __DIR__ . '/StudentModel.php';
    $studentModel = new StudentModel($mysqli);
    $result = $studentModel->deleteStudent($userid);
    if ($result) {
        echo json_encode(['success' => true, 'message' => 'Student deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to delete student']);
    }
    exit;
}

// ----------------------------
// Student Cards routes
// ----------------------------

// Get cards for a student
if ($method === 'GET' && preg_match('#^/routes.php/students/([A-Za-z0-9]+)/cards$#', $path, $matches)) {
    $studentId = $matches[1];
    $cards = $controller->getStudentCards($studentId);
    echo json_encode($cards);
    exit;
}

// Create a card for a student
if ($method === 'POST' && preg_match('#^/routes.php/students/([A-Za-z0-9]+)/cards$#', $path, $matches)) {
    $studentId = $matches[1];
    $data = json_decode(file_get_contents('php://input'), true);
    $result = $controller->createStudentCard($studentId, $data);
    echo json_encode($result);
    exit;
}

// Update a student card
if ($method === 'PUT' && preg_match('#^/routes.php/student-cards/([0-9]+)$#', $path, $matches)) {
    $cardId = intval($matches[1]);
    $data = json_decode(file_get_contents('php://input'), true);
    $result = $controller->updateStudentCard($cardId, $data);
    echo json_encode($result);
    exit;
}

// Delete a student card
if ($method === 'DELETE' && preg_match('#^/routes.php/student-cards/([0-9]+)$#', $path, $matches)) {
    $cardId = intval($matches[1]);
    $result = $controller->deleteStudentCard($cardId);
    echo json_encode($result);
    exit;
}
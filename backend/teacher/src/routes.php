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

require_once 'TeacherController.php';

// Set content type to JSON
header('Content-Type: application/json');

try {
    $controller = new TeacherController();
    
    // Get request method and path
    $method = $_SERVER['REQUEST_METHOD'];
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $path = str_replace('/routes.php', '', $path);
    
    // Route handling
    switch ($method) {
        case 'GET':
                if ($path === '/get_all_teachers' || $path === '/') {
                $response = $controller->getAllTeachers();
                }
                // Get staff by staffId (single staff)
                elseif (preg_match('#^/staff/([A-Za-z0-9_\-]+)$#', $path, $matches)) {
                    $staffId = $matches[1];
                    $response = $controller->getStaffById($staffId);
                }
                elseif (preg_match('#^/teacher/([A-Za-z0-9_\-]+)/staff$#', $path, $matches)) {
                $teacherId = $matches[1];
                $response = $controller->getStaffForTeacher($teacherId);
            } elseif (preg_match('#^/teacher/([A-Za-z0-9_\-]+)/staff/([A-Za-z0-9_\-]+)$#', $path, $matches)) {
                // GET single staff (not implemented separately yet) - reuse getStaffForTeacher
                $teacherId = $matches[1];
                $response = $controller->getStaffForTeacher($teacherId);
            } elseif ($path === '/get_active_teachers') {
                $response = $controller->getActiveTeachers();
            } elseif ($path === '/get_next_teacher_id') {
                $response = $controller->getNextTeacherId();
            } elseif (preg_match('/^\/get_teacher_by_id\?teacherId=(.+)$/', $path, $matches)) {
                $teacherId = $matches[1];
                $response = $controller->getTeacherById($teacherId);
            } elseif (preg_match('/^\/get_teacher_for_edit\?teacherId=(.+)$/', $path, $matches)) {
                $teacherId = $matches[1];
                $response = $controller->getTeacherByIdForEdit($teacherId);
            } elseif (preg_match('/^\/get_teachers_by_stream\?stream=(.+)$/', $path, $matches)) {
                $stream = $matches[1];
                $response = $controller->getTeachersByStream($stream);
            } elseif (preg_match('/^\/check_phone_exists/', $path)) {
                $phone = $_GET['phone'] ?? '';
                $response = $controller->checkPhoneExists($phone);
            } else {
                $response = [
                    'success' => false,
                    'message' => 'Endpoint not found'
                ];
                http_response_code(404);
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if ($path === '/create_teacher' || $path === '/') {
                $response = $controller->createTeacher($input);
            } elseif (preg_match('#^/teacher/([A-Za-z0-9_\-]+)/staff$#', $path, $matches) && $_SERVER['REQUEST_METHOD'] === 'POST') {
                $teacherId = $matches[1];
                $response = $controller->createStaff($teacherId, $input);
            } elseif ($path === '/teacher/staff/login') {
                $staffId = $input['staffId'] ?? '';
                $password = $input['password'] ?? '';
                $response = $controller->loginStaffWithId($staffId, $password);
            } elseif ($path === '/login') {
                $email = $input['email'] ?? '';
                $password = $input['password'] ?? '';
                $response = $controller->login($email, $password);
            } elseif ($path === '/login_with_teacher_id') {
                $teacherId = $input['teacherId'] ?? '';
                $password = $input['password'] ?? '';
                $response = $controller->loginWithTeacherId($teacherId, $password);
            } elseif ($path === '/change_password') {
                $teacherId = $input['teacherId'] ?? '';
                $currentPassword = $input['currentPassword'] ?? '';
                $newPassword = $input['newPassword'] ?? '';
                $response = $controller->changePassword($teacherId, $currentPassword, $newPassword);
            } else {
                $response = [
                    'success' => false,
                    'message' => 'Endpoint not found'
                ];
                http_response_code(404);
            }
            break;
            
        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (preg_match('/^\/update_teacher\/(.+)$/', $path, $matches)) {
                $teacherId = $matches[1];
                $response = $controller->updateTeacher($teacherId, $input);
            } elseif (preg_match('#^/teacher/staff/([A-Za-z0-9_\-]+)$#', $path, $matches)) {
                $staffId = $matches[1];
                $response = $controller->updateStaff($staffId, $input);
            } else {
                $response = [
                    'success' => false,
                    'message' => 'Endpoint not found'
                ];
                http_response_code(404);
            }
            break;
            
        case 'DELETE':
            if (preg_match('/^\/delete_teacher\/(.+)$/', $path, $matches)) {
                $teacherId = $matches[1];
                $response = $controller->deleteTeacher($teacherId);
            } elseif (preg_match('#^/teacher/staff/([A-Za-z0-9_\-]+)$#', $path, $matches)) {
                $staffId = $matches[1];
                $response = $controller->deleteStaff($staffId);
            } else {
                $response = [
                    'success' => false,
                    'message' => 'Endpoint not found'
                ];
                http_response_code(404);
            }
            break;
            
        default:
            $response = [
                'success' => false,
                'message' => 'Method not allowed'
            ];
            http_response_code(405);
            break;
    }
    
} catch (Exception $e) {
    $response = [
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ];
    http_response_code(500);
}

// Return JSON response
echo json_encode($response); 
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
require_once __DIR__ . '/controllers/StudyPackController.php';

// Detect raw file download endpoint BEFORE forcing JSON header
$requestUriPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$rawPath = str_replace('/routes.php', '', $requestUriPath);

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $rawPath === '/study_pack_download_document') {
    try {
        $studyPackController = new StudyPackController();
        $docId = isset($_GET['document_id']) ? intval($_GET['document_id']) : 0;
        $studentId = $_GET['student_id'] ?? 'UNKNOWN';
        $studentName = $_GET['student_name'] ?? '';
        if ($docId <= 0) {
            header('Content-Type: application/json');
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid document_id']);
            exit;
        }
        // The controller itself outputs the file (or JSON error)
        $studyPackController->downloadDocument($docId, $studentId, $studentName);
    } catch (Exception $e) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Download handler error: ' . $e->getMessage()]);
    }
    exit;
}

// Set content type to JSON for standard API responses
header('Content-Type: application/json');

try {
    $controller = new TeacherController();
    $studyPackController = new StudyPackController();
    
    // Get request method and path
    $method = $_SERVER['REQUEST_METHOD'];
    $path = $rawPath;
    
    // Route handling
    switch ($method) {
        case 'GET':
            if ($path === '/get_all_teachers' || $path === '/') {
                $response = $controller->getAllTeachers();
            } elseif ($path === '/study_packs') {
                $response = $controller->getAllStudyPacks();
            } elseif (preg_match('/^\/study_packs_by_teacher/', $path)) {
                $teacherId = $_GET['teacherId'] ?? null;
                $response = $controller->getStudyPacksByTeacher($teacherId);
            } elseif (preg_match('/^\/study_pack$/', $path)) {
                $id = $_GET['id'] ?? null;
                $response = $controller->getStudyPackById($id);
            } elseif (preg_match('#^/staff/([A-Za-z0-9_\-]+)$#', $path, $matches)) {
                // Get staff by staffId (single staff)
                $staffId = $matches[1];
                $response = $controller->getStaffById($staffId);
            } elseif (preg_match('#^/teacher/([A-Za-z0-9_\-]+)/staff$#', $path, $matches)) {
                // Get staff list for a teacher
                $teacherId = $matches[1];
                $response = $controller->getStaffForTeacher($teacherId);
            } elseif (preg_match('#^/teacher/([A-Za-z0-9_\-]+)/staff/([A-Za-z0-9_\-]+)$#', $path, $matches)) {
                // Get single staff under a teacher (reuse getStaffForTeacher or implement separately)
                $teacherId = $matches[1];
                $response = $controller->getStaffForTeacher($teacherId);
            } elseif ($path === '/get_active_teachers') {
                $response = $controller->getActiveTeachers();
            } elseif ($path === '/get_next_teacher_id') {
                $response = $controller->getNextTeacherId();
            } elseif ($path === '/get_teacher_by_id') {
                $teacherId = $_GET['teacherId'] ?? null;
                $response = $controller->getTeacherById($teacherId);
            } elseif ($path === '/get_teacher_for_edit') {
                $teacherId = $_GET['teacherId'] ?? null;
                $response = $controller->getTeacherByIdForEdit($teacherId);
            } elseif ($path === '/get_teachers_by_stream') {
                $stream = $_GET['stream'] ?? null;
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
            // For file uploads, don't parse JSON body
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            $isMultipart = stripos($contentType, 'multipart/form-data') !== false;
            $input = $isMultipart ? [] : json_decode(file_get_contents('php://input'), true);

            if ($path === '/create_teacher' || $path === '/') {
                $response = $controller->createTeacher($input);
            } elseif ($path === '/create_study_pack') {
                $response = $controller->createStudyPack($input);
            } elseif ($path === '/study_pack_add_link') {
                $studyPackId = $input['study_pack_id'] ?? null;
                $response = $controller->addStudyPackLink($studyPackId, $input);
            } elseif ($path === '/study_pack_upload_video') {
                $response = $studyPackController->uploadVideo($_POST, $_FILES);
            } elseif ($path === '/study_pack_upload_document') {
                $response = $studyPackController->uploadDocument($_POST, $_FILES);
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
            } elseif (preg_match('/^\/update_study_pack\/(\d+)$/', $path, $matches)) {
                $packId = (int)$matches[1];
                $response = $controller->updateStudyPack($packId, $input);
            } elseif (preg_match('/^\/study_pack_video\/(\d+)$/', $path, $matches)) {
                $videoId = (int)$matches[1];
                $response = $studyPackController->updateVideo($videoId, $input);
            } elseif (preg_match('/^\/study_pack_document\/(\d+)$/', $path, $matches)) {
                $docId = (int)$matches[1];
                $response = $studyPackController->updateDocument($docId, $input);
            } elseif (preg_match('/^\/study_pack_link\/(\d+)$/', $path, $matches)) {
                $linkId = (int)$matches[1];
                $response = $studyPackController->updateLink($linkId, $input);
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
            } elseif (preg_match('/^\/study_pack_video\/(\d+)$/', $path, $matches)) {
                $videoId = (int)$matches[1];
                $response = $studyPackController->deleteVideo($videoId);
            } elseif (preg_match('/^\/study_pack_document\/(\d+)$/', $path, $matches)) {
                $docId = (int)$matches[1];
                $response = $studyPackController->deleteDocument($docId);
            } elseif (preg_match('/^\/study_pack_link\/(\d+)$/', $path, $matches)) {
                $linkId = (int)$matches[1];
                $response = $studyPackController->deleteLink($linkId);
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
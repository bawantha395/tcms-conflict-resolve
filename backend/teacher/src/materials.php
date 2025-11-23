<?php
/**
 * Materials API Endpoint
 * Handles all material-related requests
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/MaterialController.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$controller = new MaterialController($conn);

// GET Requests
if ($method === 'GET') {
    
    // List materials by class
    if (isset($_GET['class_id'])) {
        $classId = intval($_GET['class_id']);
        $materials = $controller->getMaterialsByClass($classId);
        echo json_encode(['success' => true, 'materials' => $materials]);
        exit;
    }
    
    // List materials by teacher
    if (isset($_GET['teacher_id'])) {
        $teacherId = $_GET['teacher_id'];
        $materials = $controller->getMaterialsByTeacher($teacherId);
        echo json_encode(['success' => true, 'materials' => $materials]);
        exit;
    }
    
    // Download material (with watermark and password protection)
    if (isset($_GET['download']) && isset($_GET['student_id'])) {
        $materialId = intval($_GET['download']);
        $studentId = $_GET['student_id'];
        $studentName = $_GET['student_name'] ?? 'Student';
        
        $result = $controller->generateProtectedDownload($materialId, $studentId, $studentName);
        
        if ($result['success']) {
            // Stream the file
            $filePath = $result['file_path'];
            $fileName = $result['file_name'];
            
            header('Content-Type: application/pdf');
            header('Content-Disposition: attachment; filename="' . $fileName . '"');
            header('Content-Length: ' . filesize($filePath));
            header('Cache-Control: no-cache, must-revalidate');
            header('Pragma: no-cache');
            
            readfile($filePath);
            
            // Clean up temp file after download
            if (file_exists($filePath)) {
                unlink($filePath);
            }
            
            exit;
        } else {
            http_response_code(400);
            echo json_encode($result);
            exit;
        }
    }
    
    // Get material statistics
    if (isset($_GET['stats']) && isset($_GET['material_id'])) {
        $materialId = intval($_GET['material_id']);
        $stats = $controller->getMaterialStats($materialId);
        echo json_encode(['success' => true, 'stats' => $stats]);
        exit;
    }
    
    // Cleanup temp files (maintenance endpoint)
    if (isset($_GET['cleanup'])) {
        $deleted = $controller->cleanupTempFiles();
        echo json_encode(['success' => true, 'message' => "$deleted files deleted"]);
        exit;
    }
    
    echo json_encode(['success' => false, 'message' => 'Invalid GET request']);
    exit;
}

// POST Requests - Upload material
if ($method === 'POST') {
    
    // Log incoming request for debugging
    error_log("POST Request - FILES: " . json_encode($_FILES));
    error_log("POST Request - POST: " . json_encode($_POST));
    
    // Check if file was uploaded
    if (!isset($_FILES['file'])) {
        $error = ['success' => false, 'message' => 'No file uploaded', 'debug' => ['files' => $_FILES, 'post' => $_POST]];
        error_log("Error: " . json_encode($error));
        echo json_encode($error);
        exit;
    }
    
    // Get POST data
    $postData = [
        'class_id' => $_POST['class_id'] ?? null,
        'teacher_id' => $_POST['teacher_id'] ?? null,
        'teacher_name' => $_POST['teacher_name'] ?? null,
        'title' => $_POST['title'] ?? null,
        'description' => $_POST['description'] ?? '',
        'category' => $_POST['category'] ?? 'notes'
    ];
    
    // Validate required fields
    if (!$postData['class_id'] || !$postData['teacher_id'] || !$postData['title']) {
        $error = ['success' => false, 'message' => 'Missing required fields', 'debug' => $postData];
        error_log("Validation Error: " . json_encode($error));
        echo json_encode($error);
        exit;
    }
    
    // Upload and process
    $result = $controller->uploadMaterial($_FILES['file'], $postData);
    error_log("Upload Result: " . json_encode($result));
    echo json_encode($result);
    exit;
}

// PUT Requests - Update material
if ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['id']) || !isset($data['teacher_id'])) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit;
    }
    
    $materialId = intval($data['id']);
    $teacherId = $data['teacher_id'];
    
    $updateData = [
        'title' => $data['title'] ?? null,
        'description' => $data['description'] ?? '',
        'category' => $data['category'] ?? 'notes'
    ];
    
    $result = $controller->updateMaterial($materialId, $updateData, $teacherId);
    echo json_encode($result);
    exit;
}

// DELETE Requests
if ($method === 'DELETE') {
    
    // Get DELETE parameters
    $materialId = $_GET['id'] ?? null;
    $teacherId = $_GET['teacher_id'] ?? null;
    
    if (!$materialId || !$teacherId) {
        echo json_encode(['success' => false, 'message' => 'Missing required parameters']);
        exit;
    }
    
    $result = $controller->deleteMaterial(intval($materialId), $teacherId);
    echo json_encode($result);
    exit;
}

// Invalid method
echo json_encode(['success' => false, 'message' => 'Invalid request method']);
http_response_code(405);

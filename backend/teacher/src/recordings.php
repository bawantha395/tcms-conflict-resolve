<?php
/**
 * Recordings API Endpoint
 * Handles all recording-related HTTP requests
 */

// Set CORS headers first, before any output
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, Range, Authorization');
header('Access-Control-Max-Age: 86400'); // Cache preflight for 24 hours

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header('Content-Type: application/json');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/RecordingController.php';

$method = $_SERVER['REQUEST_METHOD'];
$controller = new RecordingController($conn);

// GET Requests
if ($method === 'GET') {
    
    // List recordings by class
    if (isset($_GET['class_id'])) {
        $classId = intval($_GET['class_id']);
        $recordings = $controller->getRecordingsByClass($classId);
        echo json_encode(['success' => true, 'recordings' => $recordings]);
        exit;
    }
    
    // List recordings by teacher
    if (isset($_GET['teacher_id'])) {
        $teacherId = $_GET['teacher_id'];
        $recordings = $controller->getRecordingsByTeacher($teacherId);
        echo json_encode(['success' => true, 'recordings' => $recordings]);
        exit;
    }
    
    // Stream recording (for video player)
    if (isset($_GET['stream']) && isset($_GET['student_id'])) {
        $recordingId = intval($_GET['stream']);
        $studentId = $_GET['student_id'];
        $studentName = $_GET['student_name'] ?? 'Student';
        
        $result = $controller->streamRecording($recordingId, $studentId, $studentName);
        
        if ($result['success']) {
            $filePath = $result['file_path'];
            $fileSize = $result['file_size'];
            $mimeType = $result['mime_type'];
            
            // Support for video streaming with range requests
            $stream = fopen($filePath, 'rb');
            $start = 0;
            $end = $fileSize - 1;
            
            // Handle range request for video seeking
            if (isset($_SERVER['HTTP_RANGE'])) {
                $range = $_SERVER['HTTP_RANGE'];
                $range = str_replace('bytes=', '', $range);
                $range = explode('-', $range);
                $start = intval($range[0]);
                $end = $range[1] ? intval($range[1]) : $end;
                
                http_response_code(206); // Partial Content
                header("Content-Range: bytes $start-$end/$fileSize");
            } else {
                http_response_code(200);
            }
            
            header("Content-Type: $mimeType");
            header("Accept-Ranges: bytes");
            header("Content-Length: " . ($end - $start + 1));
            header("Cache-Control: public, max-age=3600");
            
            fseek($stream, $start);
            $buffer = 8192; // 8KB chunks
            $bytesRemaining = $end - $start + 1;
            
            while ($bytesRemaining > 0 && !feof($stream)) {
                $bytesToRead = min($buffer, $bytesRemaining);
                echo fread($stream, $bytesToRead);
                $bytesRemaining -= $bytesToRead;
                flush();
            }
            
            fclose($stream);
            exit;
        } else {
            http_response_code(404);
            echo json_encode($result);
            exit;
        }
    }
    
    // Download recording
    if (isset($_GET['download']) && isset($_GET['student_id'])) {
        $recordingId = intval($_GET['download']);
        $studentId = $_GET['student_id'];
        $studentName = $_GET['student_name'] ?? 'Student';
        
        $result = $controller->downloadRecording($recordingId, $studentId, $studentName);
        
        if ($result['success']) {
            $filePath = $result['file_path'];
            $fileName = $result['file_name'];
            
            // Serve the file directly (watermarks visible in watch mode)
            header('Content-Type: video/mp4');
            header('Content-Disposition: attachment; filename="' . $fileName . '"');
            header('Content-Length: ' . filesize($filePath));
            header('Cache-Control: no-cache, must-revalidate');
            header('Pragma: no-cache');
            
            readfile($filePath);
            exit;
        } else {
            http_response_code(404);
            echo json_encode($result);
            exit;
        }
    }
    
    // Get watch progress
    if (isset($_GET['progress']) && isset($_GET['student_id'])) {
        $recordingId = intval($_GET['progress']);
        $studentId = $_GET['student_id'];
        
        $progress = $controller->getWatchProgress($recordingId, $studentId);
        echo json_encode(['success' => true, 'progress' => $progress]);
        exit;
    }
    
    // Get recording statistics
    if (isset($_GET['stats']) && isset($_GET['recording_id'])) {
        $recordingId = intval($_GET['recording_id']);
        $stats = $controller->getRecordingStats($recordingId);
        echo json_encode(['success' => true, 'stats' => $stats]);
        exit;
    }
    
    // Check watermark status
    if (isset($_GET['watermark_status']) && isset($_GET['recording_id']) && isset($_GET['student_id'])) {
        $recordingId = intval($_GET['watermark_status']);
        $studentId = $_GET['student_id'];
        $status = $controller->checkWatermarkStatus($recordingId, $studentId);
        echo json_encode($status);
        exit;
    }
    
    echo json_encode(['success' => false, 'message' => 'Invalid GET request']);
    exit;
}

// POST Requests - Upload recording or update progress
if ($method === 'POST') {
    
    // Upload recording
    if (isset($_FILES['file'])) {
        // Get POST data
        $postData = [
            'class_id' => $_POST['class_id'] ?? null,
            'teacher_id' => $_POST['teacher_id'] ?? null,
            'teacher_name' => $_POST['teacher_name'] ?? null,
            'title' => $_POST['title'] ?? null,
            'description' => $_POST['description'] ?? '',
            'category' => $_POST['category'] ?? 'lecture',
            'recording_type' => $_POST['recording_type'] ?? 'video'
        ];
        
        // Validate required fields
        if (!$postData['class_id'] || !$postData['teacher_id'] || !$postData['title']) {
            echo json_encode(['success' => false, 'message' => 'Missing required fields']);
            exit;
        }
        
        // Upload and process
        $result = $controller->uploadRecording($_FILES['file'], $postData);
        echo json_encode($result);
        exit;
    }
    
    // Update watch progress
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (isset($data['recording_id']) && isset($data['student_id']) && isset($data['position'])) {
        $result = $controller->updateWatchProgress(
            $data['recording_id'],
            $data['student_id'],
            $data['position']
        );
        echo json_encode(['success' => $result]);
        exit;
    }
    
    echo json_encode(['success' => false, 'message' => 'Invalid POST request']);
    exit;
}

// PUT Requests - Update recording
if ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['id']) || !isset($data['teacher_id'])) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit;
    }
    
    $recordingId = intval($data['id']);
    $teacherId = $data['teacher_id'];
    
    $updateData = [
        'title' => $data['title'] ?? null,
        'description' => $data['description'] ?? null,
        'category' => $data['category'] ?? null,
        'status' => $data['status'] ?? null
    ];
    
    // Remove null values
    $updateData = array_filter($updateData, function($value) {
        return $value !== null;
    });
    
    $result = $controller->updateRecording($recordingId, $updateData, $teacherId);
    echo json_encode(['success' => $result]);
    exit;
}

// DELETE Requests
if ($method === 'DELETE') {
    
    // Get DELETE parameters
    $recordingId = $_GET['id'] ?? null;
    $teacherId = $_GET['teacher_id'] ?? null;
    
    if (!$recordingId || !$teacherId) {
        echo json_encode(['success' => false, 'message' => 'Missing required parameters']);
        exit;
    }
    
    $result = $controller->deleteRecording(intval($recordingId), $teacherId);
    echo json_encode(['success' => $result]);
    exit;
}

// Invalid method
echo json_encode(['success' => false, 'message' => 'Invalid request method']);
http_response_code(405);

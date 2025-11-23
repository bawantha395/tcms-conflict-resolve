<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/controllers/ExamController.php';
require_once __DIR__ . '/controllers/QuestionController.php';
require_once __DIR__ . '/controllers/MarkController.php';

$request = $_SERVER['REQUEST_URI'];

$method = $_SERVER['REQUEST_METHOD'];

// Get path part only and normalize if the script name appears in the URI (handles /exam.php/...)
$requestPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$scriptName = $_SERVER['SCRIPT_NAME']; // e.g. /exam.php or /folder/exam.php
$scriptDir  = dirname($scriptName);

// Remove script name or script dir from path if present
if (strpos($requestPath, $scriptName) === 0) {
    $request = substr($requestPath, strlen($scriptName));
} elseif ($scriptDir !== '/' && strpos($requestPath, $scriptDir) === 0) {
    $request = substr($requestPath, strlen($scriptDir));
} else {
    $request = $requestPath;
}

$request = '/' . ltrim($request, '/');
$request = str_replace('/backend', '', $request); // keep existing adjustment if needed

if (strpos($request, '/api/marks') === 0 && $method === 'GET') {
    $markController = new MarkController();
    // Support both /api/marks and /api/marks/student/{id}
    $parts = explode('/', trim($request, '/'));
    array_shift($parts); // remove 'api'
    array_shift($parts); // remove 'marks'
    if (count($parts) === 0) {
        // GET /api/marks -> list all marks
        $markController->getAll();
    } elseif (count($parts) === 2 && $parts[0] === 'student') {
        // GET /api/marks/student/{identifier}
        $student_identifier = $parts[1];
        $markController->getByStudent($student_identifier);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
    }
} elseif (strpos($request, '/api/exams') === 0) {
    $examController = new ExamController();
    $questionController = new QuestionController();
    $markController = new MarkController();
    
    $parts = explode('/', trim($request, '/'));
    array_shift($parts); // remove 'api'
    array_shift($parts); // remove 'exams'

    if (count($parts) == 0) {
        if ($method == 'GET') {
            $examController->getAll();
        } elseif ($method == 'POST') {
            $examController->create();
        }
    } elseif (count($parts) == 1) {
        $exam_id = $parts[0];
        if ($method == 'GET') {
            $examController->getById($exam_id);
        } elseif ($method == 'DELETE') {
            $examController->delete($exam_id);
        }
    } elseif (count($parts) >= 2) {
        $exam_id = $parts[0];
        $endpoint = $parts[1];
        
        if ($endpoint == 'questions') {
            if (count($parts) == 2) {
                if ($method == 'GET') {
                    $questionController->getByExamId($exam_id);
                } elseif ($method == 'POST') {
                    $questionController->create($exam_id);
                }
            } elseif (count($parts) == 3) {
                $part_id = $parts[2];
                if ($method == 'PUT') {
                    $questionController->update($exam_id, $part_id);
                } elseif ($method == 'DELETE') {
                    $questionController->delete($exam_id, $part_id);
                }
            }
        } elseif ($endpoint == 'marks') {
            if ($method == 'GET') {
                $markController->getResults($exam_id);
            } elseif ($method == 'POST') {
                $markController->saveMarks($exam_id);
            } elseif ($method == 'DELETE') {
                // DELETE /api/exams/{exam_id}/marks?student_id={student_identifier}
                $student_identifier = $_GET['student_id'] ?? null;
                if ($student_identifier) {
                    $markController->deleteByStudent($exam_id, $student_identifier);
                } else {
                    http_response_code(400);
                    echo json_encode(['error' => 'student_id parameter required']);
                }
            }
        } elseif ($endpoint == 'results') {
           if ($method == 'GET') {
                $markController->getResults($exam_id);
            }
        }
    }
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint not found']);
}
?>
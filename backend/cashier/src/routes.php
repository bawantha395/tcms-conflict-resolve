<?php

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: false');
header('Content-Type: application/json');

// Ensure PHP does not emit HTML error pages to clients. Convert uncaught errors
// and fatal crashes into clean JSON responses so the frontend can parse them.
ini_set('display_errors', '0');
error_reporting(E_ALL);

set_exception_handler(function($e) {
    error_log("Uncaught exception: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    if (ob_get_length()) ob_clean();
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Internal server error', 'details' => $e->getMessage()]);
    exit();
});

register_shutdown_function(function() {
    $err = error_get_last();
    if ($err && ($err['type'] & (E_ERROR | E_PARSE | E_CORE_ERROR | E_COMPILE_ERROR))) {
        error_log("Fatal error: " . print_r($err, true));
        if (ob_get_length()) ob_clean();
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Fatal server error', 'details' => $err['message']]);
        exit();
    }
});

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';
require_once 'CashierSessionController.php';
require_once 'DayEndReportController.php';

$method = $_SERVER['REQUEST_METHOD'];

// Normalize path
$scriptName = $_SERVER['SCRIPT_NAME']; // e.g., /routes.php or /index.php
$path = str_replace($scriptName, '', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$path = str_replace('/index.php', '', $path);

// Initialize controllers
$sessionController = new CashierSessionController();
$dayEndReportController = new DayEndReportController();

// Test endpoint
if ($method === 'GET' && $path === '/test') {
    echo json_encode([
        'success' => true,
        'message' => 'Cashier Backend API is working!',
        'version' => '1.0.0'
    ]);
    exit;
}

// Root endpoint - API documentation
if ($method === 'GET' && ($path === '' || $path === '/')) {
    echo json_encode([
        'success' => true,
        'message' => 'Cashier Backend API',
        'version' => '1.0.0',
        'timestamp' => date('Y-m-d H:i:s'),
        'endpoints' => [
            'POST /api/session/start' => 'Start or resume cashier session',
            'GET /api/session/current' => 'Get current session data',
            'POST /api/session/update-kpis' => 'Update session KPIs',
            'POST /api/session/activity' => 'Log session activity',
            'POST /api/session/close-day' => 'Close day end session',
            'POST /api/session/cash-out' => 'Record cash-out (no close)',
            'POST /api/session/lock' => 'Lock session',
            'POST /api/session/unlock' => 'Unlock session',
            'POST /api/reports/save-session-report' => 'Save session end report to database',
            'GET /api/reports/session-history' => 'Get session report history',
            'GET /api/reports/session-report/{id}' => 'Get single session report by ID',
            'POST /api/reports/day-end/generate' => 'Generate day end report for specific date',
            'GET /api/reports/day-end/history' => 'Get day end report history with filters'
        ]
    ]);
    exit;
}

switch ($method) {
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Session routes
        if ($path === '/api/session/start') {
            $sessionController->startSession();
        } elseif ($path === '/api/session/update-kpis') {
            $sessionController->updateKPIs();
        } elseif ($path === '/api/session/activity') {
            $sessionController->logActivity();
        } elseif ($path === '/api/session/close-day') {
            $sessionController->closeDay();
        } elseif ($path === '/api/session/cash-out') {
            $sessionController->recordCashOut();
        } elseif ($path === '/api/session/lock') {
            $sessionController->lockSession();
        } elseif ($path === '/api/session/unlock') {
            $sessionController->unlockSession();
        }
        // Session End Report routes
        elseif ($path === '/api/reports/save-session-report') {
            $sessionController->saveSessionReport();
        }
        // Day End Report routes
        elseif ($path === '/api/reports/day-end/generate') {
            $dayEndReportController->generateDayEndReport();
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
        }
        break;
        
    case 'GET':
        // Session routes
        if ($path === '/api/session/current') {
            $sessionController->getCurrentSession();
        } elseif ($path === '/api/session/active') {
            // New explicit endpoint to return any active/locked session for a cashier
            $sessionController->getActiveSession();
        }
        // Session End Report routes
        elseif ($path === '/api/reports/session-history') {
            $sessionController->getSessionReportHistory();
        } elseif (preg_match('#^/api/reports/session-report/(\d+)$#', $path, $matches)) {
            $sessionController->getSessionReport($matches[1]);
        }
        // Day End Report routes
        elseif ($path === '/api/reports/day-end/history') {
            $dayEndReportController->getDayEndReportHistory();
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

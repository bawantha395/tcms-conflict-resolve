<?php
require_once __DIR__ . '/config.php';

// Route handling
$request_uri = $_SERVER['REQUEST_URI'];
$request_method = $_SERVER['REQUEST_METHOD'];

// Remove query string and get path
$path = parse_url($request_uri, PHP_URL_PATH);
$path = str_replace('/index.php', '', $path);

// API Routes
if (strpos($path, '/api/session') === 0) {
    require_once __DIR__ . '/CashierSessionController.php';
    $controller = new CashierSessionController();
    
    // Route matching
    if ($path === '/api/session/start' && $request_method === 'POST') {
        $controller->startSession();
    } elseif ($path === '/api/session/current' && $request_method === 'GET') {
        $controller->getCurrentSession();
    } elseif ($path === '/api/session/update-kpis' && $request_method === 'POST') {
        $controller->updateKPIs();
    } elseif ($path === '/api/session/activity' && $request_method === 'POST') {
        $controller->logActivity();
    } elseif ($path === '/api/session/close-day' && $request_method === 'POST') {
        $controller->closeDay();
    } elseif ($path === '/api/session/lock' && $request_method === 'POST') {
        $controller->lockSession();
    } elseif ($path === '/api/session/unlock' && $request_method === 'POST') {
        $controller->unlockSession();
    } else {
        handleError('Route not found', 404);
    }
} else {
    // Default response
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
            'POST /api/session/lock' => 'Lock session',
            'POST /api/session/unlock' => 'Unlock session'
        ]
    ]);
}

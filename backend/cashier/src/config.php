<?php
// Database configuration for Cashier Backend

// Cashier database (for session management)
define('DB_HOST', getenv('DB_HOST') ?: 'cashier-mysql');
define('DB_NAME', getenv('DB_NAME') ?: 'cashier_db');
define('DB_USER', getenv('DB_USER') ?: 'cashieruser');
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: 'cashierpass');
define('DB_CHARSET', 'utf8mb4');

// Auth database (for user verification - read-only)
define('AUTH_DB_HOST', getenv('AUTH_DB_HOST') ?: 'auth-mysql-server');
define('AUTH_DB_NAME', getenv('AUTH_DB_NAME') ?: 'auth-db');
define('AUTH_DB_USER', getenv('AUTH_DB_USER') ?: 'devuser');
define('AUTH_DB_PASSWORD', getenv('AUTH_DB_PASSWORD') ?: 'devpass');

// Timezone
date_default_timezone_set('Asia/Colombo');

// CORS Configuration
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database connection function (Cashier DB)
function getDBConnection() {
    static $conn = null;
    
    if ($conn === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $conn = new PDO($dsn, DB_USER, DB_PASSWORD);
            $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed'
            ]);
            exit();
        }
    }
    
    return $conn;
}

// Auth database connection function (for user verification)
function getAuthDBConnection() {
    static $authConn = null;
    
    if ($authConn === null) {
        try {
            $dsn = "mysql:host=" . AUTH_DB_HOST . ";dbname=" . AUTH_DB_NAME . ";charset=" . DB_CHARSET;
            $authConn = new PDO($dsn, AUTH_DB_USER, AUTH_DB_PASSWORD);
            $authConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $authConn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Auth DB connection failed: " . $e->getMessage());
            // Not critical - cashier can work without user verification
            return null;
        }
    }
    
    return $authConn;
}

// Verify if cashier user exists in auth database
function verifyCashierUser($cashierId) {
    $authConn = getAuthDBConnection();
    
    if ($authConn === null) {
        // Auth DB not available - skip verification
        return true;
    }
    
    try {
        $stmt = $authConn->prepare("
            SELECT userid, name, role 
            FROM users 
            WHERE userid = :cashier_id AND role = 'cashier'
        ");
        $stmt->execute(['cashier_id' => $cashierId]);
        $user = $stmt->fetch();
        
        return $user !== false;
    } catch (PDOException $e) {
        error_log("User verification failed: " . $e->getMessage());
        return true; // Allow operation if verification fails
    }
}

// Get cashier name from auth database
function getCashierName($cashierId) {
    $authConn = getAuthDBConnection();
    
    if ($authConn === null) {
        return 'Unknown Cashier';
    }
    
    try {
        $stmt = $authConn->prepare("
            SELECT name 
            FROM users 
            WHERE userid = :cashier_id AND role = 'cashier'
        ");
        $stmt->execute(['cashier_id' => $cashierId]);
        $user = $stmt->fetch();
        
        return $user ? $user['name'] : 'Cashier ' . $cashierId;
    } catch (PDOException $e) {
        error_log("Failed to get cashier name: " . $e->getMessage());
        return 'Cashier ' . $cashierId;
    }
}

// Error handler
function handleError($message, $code = 500) {
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $message
    ]);
    exit();
}

// Success response
function sendSuccess($data = [], $message = 'Success') {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => $message,
        'data' => $data
    ]);
    exit();
}

// Get JSON input
function getJsonInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true);
}

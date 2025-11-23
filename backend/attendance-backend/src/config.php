<?php
// src/config.php for attendance backend

// Set timezone to Asia/Colombo (Sri Lanka)
date_default_timezone_set('Asia/Colombo');

// Attendance database (main database for this backend)
$attendanceHost = getenv('DB_HOST') ?: 'attendance-db';
$attendanceUser = getenv('DB_USER') ?: 'root';
$attendancePass = getenv('DB_PASSWORD') ?: 'secret';
$attendanceDB = getenv('DB_NAME') ?: 'attendance';

// Class database (for class and enrollment data)
$classHost = getenv('CLASS_DB_HOST') ?: 'host.docker.internal';
$classUser = getenv('CLASS_DB_USER') ?: 'classuser';
$classPass = getenv('CLASS_DB_PASSWORD') ?: 'classpass';
$classDB = getenv('CLASS_DB_NAME') ?: 'class_db';

// Auth database (for student data)
$authHost = getenv('AUTH_DB_HOST') ?: 'host.docker.internal';
$authUser = getenv('AUTH_DB_USER') ?: 'devuser';
$authPass = getenv('AUTH_DB_PASSWORD') ?: 'devpass';
$authDB = getenv('AUTH_DB_NAME') ?: 'auth-db';

try {
    // Connect to attendance database (main)
    $mysqli = new mysqli($attendanceHost, $attendanceUser, $attendancePass, $attendanceDB);
    
    if ($mysqli->connect_error) {
        throw new Exception("Attendance database connection failed: " . $mysqli->connect_error);
    }
    
    // Set charset
    $mysqli->set_charset("utf8mb4");
    
    // Connect to class database
    $classConn = new mysqli($classHost, $classUser, $classPass, $classDB);
    
    if ($classConn->connect_error) {
        throw new Exception("Class database connection failed: " . $classConn->connect_error);
    }
    
    $classConn->set_charset("utf8mb4");
    
    // Connect to auth database
    $authConn = new mysqli($authHost, $authUser, $authPass, $authDB);
    
    if ($authConn->connect_error) {
        throw new Exception("Auth database connection failed: " . $authConn->connect_error);
    }
    
    $authConn->set_charset("utf8mb4");
    
} catch (Exception $e) {
    error_log("Database connection error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed',
        'error' => $e->getMessage()
    ]);
    exit();
}

// Helper function to get database connection by name
function getDBConnection($dbName) {
    global $mysqli, $classConn, $authConn;
    
    switch ($dbName) {
        case 'attendance':
            return $mysqli;
        case 'class':
            return $classConn;
        case 'auth':
            return $authConn;
        default:
            return $mysqli; // Default to attendance database
    }
}

// Helper function to close all database connections
function closeDBConnections() {
    global $mysqli, $classConn, $authConn;
    
    if ($mysqli) {
        $mysqli->close();
    }
    if ($classConn) {
        $classConn->close();
    }
    if ($authConn) {
        $authConn->close();
    }
}

// Register shutdown function to close connections
register_shutdown_function('closeDBConnections');
?>


<?php
// src/config.php
$host = getenv('DB_HOST') ?: 'localhost';
$db   = getenv('DB_NAME') ?: 'student_db';
$user = getenv('DB_USER') ?: 'studentuser';
$pass = getenv('DB_PASSWORD') ?: 'studentpass';

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die('Connection failed: ' . $conn->connect_error);
}
?>

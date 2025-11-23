<?php
// src/config.php

// Set timezone to Asia/Colombo (Sri Lanka)
date_default_timezone_set('Asia/Colombo');

$host = getenv('DB_HOST') ?: 'localhost';
$db   = getenv('DB_NAME') ?: 'class_db';
$user = getenv('DB_USER') ?: 'classuser';
$pass = getenv('DB_PASSWORD') ?: 'classpass';

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die('Connection failed: ' . $conn->connect_error);
}
?>

<?php
// src/config.php

// Set timezone to Asia/Colombo (Sri Lanka)
date_default_timezone_set('Asia/Colombo');

// Database configuration - connection will be created in routes.php
$host = getenv('DB_HOST') ?: 'localhost';
$db   = getenv('DB_NAME') ?: 'payment_db';
$user = getenv('DB_USER') ?: 'paymentuser';
$pass = getenv('DB_PASSWORD') ?: 'paymentpass';
?>

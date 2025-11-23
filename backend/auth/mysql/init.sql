-- Create users table
CREATE TABLE IF NOT EXISTS users (
    userid VARCHAR(10) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'teacher', 'admin', 'cashier', 'teacher_staff') NOT NULL,
    name VARCHAR(255) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(15) DEFAULT NULL,
    otp VARCHAR(6) DEFAULT NULL,
    otp_created_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userid VARCHAR(10) NOT NULL,
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100) NOT NULL,
    nic VARCHAR(20),
    gender ENUM('Male', 'Female'),
    age INT,
    email VARCHAR(255),
    mobile VARCHAR(15) NOT NULL,
    parentName VARCHAR(200),
    parentMobile VARCHAR(15),
    stream VARCHAR(50),
    dateOfBirth DATE,
    school VARCHAR(200),
    address TEXT,
    district VARCHAR(100),
    dateJoined TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE
);



-- Create refresh_tokens table for secure token management
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userid VARCHAR(10) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
);

-- Create login_attempts table for rate limiting and security
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userid VARCHAR(10) NOT NULL,
    attempt_type ENUM('SUCCESS','BLOCKED_MULTIPLE_DEVICE','BLOCKED_ALREADY_LOGGED_IN','FAILED_PASSWORD','INVALID_USER') NOT NULL DEFAULT 'FAILED_PASSWORD',
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    device_info TEXT,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details TEXT,
    FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE,
    INDEX idx_userid_time (userid, attempt_time),
    INDEX idx_ip_time (ip_address, attempt_time),
    INDEX idx_attempt_type (attempt_type)
);

-- Create barcodes table for storing barcode information
CREATE TABLE IF NOT EXISTS barcodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userid VARCHAR(10) NOT NULL UNIQUE,
    barcode_data VARCHAR(255) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE,
    INDEX idx_userid (userid),
    INDEX idx_created_at (created_at)
);

-- Student Monitoring Tables
CREATE TABLE IF NOT EXISTS student_login_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    session_id VARCHAR(255) NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    device_fingerprint VARCHAR(255),
    location_data JSON,
    is_suspicious BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(userid) ON DELETE CASCADE,
    INDEX idx_student_id (student_id),
    INDEX idx_ip_address (ip_address),
    INDEX idx_login_time (login_time),
    INDEX idx_suspicious (is_suspicious)
);

CREATE TABLE IF NOT EXISTS concurrent_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    class_id INT,
    ip_address VARCHAR(45) NOT NULL,
    device_info TEXT,
    session_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end_time TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_suspicious BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(userid) ON DELETE CASCADE,
    INDEX idx_student_id (student_id),
    INDEX idx_session_id (session_id),
    INDEX idx_class_id (class_id),
    INDEX idx_suspicious (is_suspicious)
);

CREATE TABLE IF NOT EXISTS student_blocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    reason TEXT NOT NULL,
    blocked_by VARCHAR(50) NOT NULL,
    block_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    block_end_time TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(userid) ON DELETE CASCADE,
    INDEX idx_student_id (student_id),
    INDEX idx_block_end_time (block_end_time),
    INDEX idx_is_active (is_active)
);

CREATE TABLE IF NOT EXISTS cheating_incidents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    incident_type ENUM('concurrent_session', 'multiple_ips', 'suspicious_activity', 'other') NOT NULL,
    description TEXT NOT NULL,
    evidence_data JSON,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    status ENUM('pending', 'investigating', 'resolved', 'false_positive') DEFAULT 'pending',
    action_taken VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(userid) ON DELETE CASCADE,
    INDEX idx_student_id (student_id),
    INDEX idx_incident_type (incident_type),
    INDEX idx_status (status),
    INDEX idx_detected_at (detected_at)
);

-- Create OTP codes table for mobile verification
CREATE TABLE IF NOT EXISTS otp_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mobile VARCHAR(15) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose ENUM('registration', 'login', 'password_reset') NOT NULL DEFAULT 'registration',
    expires_at DATETIME NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mobile (mobile),
    INDEX idx_mobile_purpose (mobile, purpose),
    INDEX idx_expires_at (expires_at),
    INDEX idx_verified (verified)
);

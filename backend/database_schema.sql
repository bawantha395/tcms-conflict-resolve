
-- Complete Database Schema for Class Management System
-- This combines all microservices into a unified schema

-- =====================================================
-- AUTH SERVICE TABLES
-- =====================================================

-- Users table (core authentication)
CREATE TABLE IF NOT EXISTS users (
    userid VARCHAR(10) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'teacher', 'admin', 'cashier', 'core_admin') NOT NULL,
    otp VARCHAR(6) DEFAULT NULL,
    otp_created_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Students table
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
    barcode_data VARCHAR(255),
    dateJoined TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE
);

-- Refresh tokens table
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

-- Login attempts table for rate limiting
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userid VARCHAR(10) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT 0,
    ip_address VARCHAR(45) NOT NULL,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE,
    INDEX idx_userid_time (userid, attempt_time),
    INDEX idx_ip_time (ip_address, attempt_time)
);

-- Barcodes table
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

-- =====================================================
-- TEACHER SERVICE TABLES
-- =====================================================

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacherId VARCHAR(10) UNIQUE NOT NULL,
    designation VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    stream VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(15) NOT NULL,
    password VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Teacher schedules table
CREATE TABLE IF NOT EXISTS teacher_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacherId VARCHAR(10) NOT NULL,
    classId INT,
    day VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    frequency ENUM('weekly', 'bi-weekly', 'monthly') DEFAULT 'weekly',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacherId) REFERENCES teachers(teacherId) ON DELETE CASCADE
);

-- Teacher hall assignments table
CREATE TABLE IF NOT EXISTS teacher_halls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacherId VARCHAR(10) NOT NULL,
    hallId VARCHAR(10) NOT NULL,
    hall_name VARCHAR(100) NOT NULL,
    capacity INT,
    assigned_date DATE NOT NULL,
    status ENUM('assigned', 'available', 'maintenance') DEFAULT 'assigned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacherId) REFERENCES teachers(teacherId) ON DELETE CASCADE
);

-- =====================================================
-- CLASS SERVICE TABLES
-- =====================================================

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_name VARCHAR(100) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    teacher VARCHAR(100) NOT NULL,
    teacher_id VARCHAR(50),
    stream VARCHAR(50) NOT NULL,
    delivery_method ENUM('online', 'physical', 'hybrid', 'other') NOT NULL,
    delivery_other VARCHAR(100),
    schedule_day VARCHAR(20) NOT NULL,
    schedule_start_time TIME NOT NULL,
    schedule_end_time TIME NOT NULL,
    schedule_frequency ENUM('weekly', 'bi-weekly', 'monthly') NOT NULL DEFAULT 'weekly',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    max_students INT NOT NULL DEFAULT 50,
    fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_tracking JSON,
    payment_tracking_free_days INT DEFAULT 7,
    zoom_link TEXT,
    description TEXT,
    course_type ENUM('theory', 'revision') NOT NULL DEFAULT 'theory',
    revision_discount_price DECIMAL(10,2) DEFAULT 0.00,
    related_theory_id INT,
    status ENUM('active', 'inactive', 'archived') NOT NULL DEFAULT 'active',
    current_students INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_course_type (course_type),
    INDEX idx_delivery_method (delivery_method),
    INDEX idx_stream (stream),
    INDEX idx_teacher (teacher),
    FOREIGN KEY (related_theory_id) REFERENCES classes(id) ON DELETE SET NULL
);

-- =====================================================
-- ENROLLMENT & ATTENDANCE TABLES
-- =====================================================

-- Student enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    class_id INT NOT NULL,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'completed', 'dropped', 'suspended') DEFAULT 'active',
    payment_status ENUM('pending', 'paid', 'partial', 'overdue') DEFAULT 'pending',
    total_fee DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    next_payment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(userid) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (student_id, class_id),
    INDEX idx_student (student_id),
    INDEX idx_class (class_id),
    INDEX idx_payment_status (payment_status)
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    class_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('present', 'absent', 'late', 'excused') NOT NULL,
    marked_by VARCHAR(10),
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (student_id) REFERENCES students(userid) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES users(userid) ON DELETE SET NULL,
    UNIQUE KEY unique_attendance (student_id, class_id, attendance_date),
    INDEX idx_student_date (student_id, attendance_date),
    INDEX idx_class_date (class_id, attendance_date)
);

-- =====================================================
-- FINANCIAL TABLES
-- =====================================================

-- Financial records table
CREATE TABLE IF NOT EXISTS financial_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(20) UNIQUE NOT NULL,
    date DATE NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    category VARCHAR(100) NOT NULL,
    payment_type ENUM('class_payment', 'admission_fee') DEFAULT 'class_payment',
    person_name VARCHAR(200),
    user_id VARCHAR(10),
    person_role VARCHAR(50),
    class_name VARCHAR(100),
    class_id INT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'paid', 'cancelled', 'refunded') DEFAULT 'pending',
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    notes TEXT,
    created_by VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(userid) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(userid) ON DELETE SET NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    INDEX idx_date (date),
    INDEX idx_type (type),
    INDEX idx_category (category),
    INDEX idx_payment_type (payment_type),
    INDEX idx_status (status),
    INDEX idx_user (user_id),
    INDEX idx_class (class_id)
);

-- Payment history table
CREATE TABLE IF NOT EXISTS payment_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
    INDEX idx_enrollment (enrollment_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_status (status)
);

-- =====================================================
-- STUDY MATERIALS & EXAMS TABLES
-- =====================================================

-- Study materials table
CREATE TABLE IF NOT EXISTS study_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_path VARCHAR(500),
    file_type VARCHAR(50),
    file_size INT,
    uploaded_by VARCHAR(10),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'inactive') DEFAULT 'active',
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(userid) ON DELETE SET NULL,
    INDEX idx_class (class_id),
    INDEX idx_status (status)
);

-- Exams table
CREATE TABLE IF NOT EXISTS exams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    exam_date DATE,
    duration_minutes INT,
    total_marks INT,
    passing_marks INT,
    status ENUM('draft', 'published', 'completed', 'archived') DEFAULT 'draft',
    created_by VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(userid) ON DELETE SET NULL,
    INDEX idx_class (class_id),
    INDEX idx_status (status),
    INDEX idx_exam_date (exam_date)
);

-- =====================================================
-- NOTIFICATIONS & MESSAGING TABLES
-- =====================================================

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(10) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(userid) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_read_status (read_status),
    INDEX idx_created_at (created_at)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id VARCHAR(10) NOT NULL,
    receiver_id VARCHAR(10) NOT NULL,
    subject VARCHAR(200),
    message TEXT NOT NULL,
    read_status BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(userid) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(userid) ON DELETE CASCADE,
    INDEX idx_sender (sender_id),
    INDEX idx_receiver (receiver_id),
    INDEX idx_read_status (read_status),
    INDEX idx_sent_at (sent_at)
);

-- =====================================================
-- STUDENT MONITORING TABLES
-- =====================================================

-- Student login activity tracking
CREATE TABLE IF NOT EXISTS student_login_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    session_id VARCHAR(255),
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location_data JSON,
    is_suspicious BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(userid) ON DELETE CASCADE,
    INDEX idx_student (student_id),
    INDEX idx_login_time (login_time),
    INDEX idx_suspicious (is_suspicious),
    INDEX idx_session (session_id)
);

-- Student blocks table
CREATE TABLE IF NOT EXISTS student_blocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    reason TEXT NOT NULL,
    blocked_by VARCHAR(10) NOT NULL,
    block_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    block_end_time TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(userid) ON DELETE CASCADE,
    FOREIGN KEY (blocked_by) REFERENCES users(userid) ON DELETE SET NULL,
    INDEX idx_student (student_id),
    INDEX idx_active (is_active),
    INDEX idx_end_time (block_end_time)
);

-- Concurrent sessions tracking
CREATE TABLE IF NOT EXISTS concurrent_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    class_id INT,
    ip_address VARCHAR(45) NOT NULL,
    device_info JSON,
    session_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end_time TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(userid) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    INDEX idx_student (student_id),
    INDEX idx_session (session_id),
    INDEX idx_active (is_active),
    INDEX idx_start_time (session_start_time)
);

-- =====================================================
-- SYSTEM CONFIGURATION TABLES
-- =====================================================

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(10),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id VARCHAR(50),
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(userid) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_table (table_name),
    INDEX idx_created_at (created_at)
);

-- Hall Requests table (for teacher hall requests)
CREATE TABLE IF NOT EXISTS hall_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id VARCHAR(10) NOT NULL,
    subject VARCHAR(255),
    class_name VARCHAR(255),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacherId) ON DELETE CASCADE
);



-- Exams table
CREATE TABLE exams (
    exam_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    creator_user_id INT NOT NULL
);

-- QuestionParts table
CREATE TABLE question_parts (
    part_id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    parent_part_id INT NULL,
    label VARCHAR(50) NOT NULL,
    max_marks INT NOT NULL,
    display_order INT NOT NULL,
    FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_part_id) REFERENCES question_parts(part_id) ON DELETE CASCADE
);

-- Marks table
CREATE TABLE marks (
    mark_id INT AUTO_INCREMENT PRIMARY KEY,
    student_identifier VARCHAR(50) NOT NULL,
    question_part_id INT NOT NULL,
    score_awarded DECIMAL(5,2) NOT NULL,
    FOREIGN KEY (question_part_id) REFERENCES question_parts(part_id) ON DELETE CASCADE,
    UNIQUE KEY unique_mark (student_identifier, question_part_id)
);

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Insert default admin user
INSERT INTO users (userid, password, role) VALUES 
('ADMIN001', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Insert system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('payment_tracking_enabled', 'true', 'Enable payment tracking for all classes'),
('default_payment_free_days', '7', 'Default free days for payment tracking'),
('max_login_attempts', '5', 'Maximum login attempts before lockout'),
('session_timeout_minutes', '15', 'Session timeout in minutes'),
('otp_expiry_minutes', '15', 'OTP expiry time in minutes')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP; 

-- =====================================================
-- Student Cards (Free/Half/Full) table
-- =====================================================
CREATE TABLE IF NOT EXISTS student_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_id VARCHAR(50) UNIQUE,
    student_id VARCHAR(10) NOT NULL,
    class_id INT DEFAULT NULL,
    card_type ENUM('full','half','free') NOT NULL DEFAULT 'half',
    reason TEXT,
    valid_from DATE DEFAULT NULL,
    valid_until DATE DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(userid) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    INDEX idx_student_cards_student (student_id),
    INDEX idx_student_cards_class (class_id)
);

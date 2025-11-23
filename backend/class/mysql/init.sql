-- Class Backend Database Initialization (Clean Version)
-- This contains only class and enrollment-related tables

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_name VARCHAR(100) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    teacher VARCHAR(100) NOT NULL,
    teacher_id VARCHAR(50),
    stream VARCHAR(50) NOT NULL,
    delivery_method ENUM('online', 'physical', 'hybrid1', 'hybrid2', 'hybrid3', 'hybrid4') NOT NULL,
    delivery_other VARCHAR(100),
    schedule_day VARCHAR(20),
    schedule_start_time TIME,
    schedule_end_time TIME,
    schedule_frequency ENUM('weekly', 'bi-weekly', 'monthly', 'no-schedule') NOT NULL DEFAULT 'weekly',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    max_students INT NOT NULL DEFAULT 50,
    fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_tracking JSON,
    payment_tracking_free_days INT DEFAULT 7,
    zoom_link TEXT,
    video_url TEXT,
    description TEXT,
    course_type ENUM('theory', 'revision') NOT NULL DEFAULT 'theory',
    revision_discount_price DECIMAL(10,2) DEFAULT 0.00,
    related_theory_id INT,
    status ENUM('active', 'inactive', 'archived') NOT NULL DEFAULT 'active',
    current_students INT DEFAULT 0,
    enable_tute_collection BOOLEAN DEFAULT FALSE,
    tute_collection_type ENUM('speed_post', 'physical_class', 'both') DEFAULT 'speed_post',
    speed_post_fee DECIMAL(10,2) DEFAULT 300.00,
    class_medium ENUM('Sinhala', 'English', 'Both') DEFAULT 'Sinhala',
    enable_new_window_join BOOLEAN DEFAULT TRUE,
    enable_overlay_join BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_course_type (course_type),
    INDEX idx_delivery_method (delivery_method),
    INDEX idx_stream (stream),
    INDEX idx_teacher (teacher),
    INDEX idx_tute_collection (enable_tute_collection),
    INDEX idx_tute_collection_type (tute_collection_type),
    INDEX idx_class_medium (class_medium),
    FOREIGN KEY (related_theory_id) REFERENCES classes(id) ON DELETE SET NULL
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    class_id INT NOT NULL,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'completed', 'dropped', 'suspended') DEFAULT 'active',
    payment_status ENUM('pending', 'paid', 'partial', 'overdue', 'late_pay') DEFAULT 'pending',
    total_fee DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    next_payment_date DATE,
    card_type VARCHAR(20) DEFAULT 'none',
    card_valid_from DATE DEFAULT NULL,
    card_valid_to DATE DEFAULT NULL,
    card_notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (student_id, class_id),
    INDEX idx_student (student_id),
    INDEX idx_class (class_id),
    INDEX idx_payment_status (payment_status)
) COMMENT = 'Student enrollments in classes with payment tracking';

-- Late Pay Permissions table
CREATE TABLE IF NOT EXISTS late_pay_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    class_id INT NOT NULL,
    permission_date DATE NOT NULL COMMENT 'The date this permission is valid for',
    enrollment_id INT NOT NULL,
    cashier_id VARCHAR(10) NOT NULL COMMENT 'The cashier who issued this permission',
    reason VARCHAR(500) DEFAULT 'Allowed late payment for today only',
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
    UNIQUE KEY unique_permission (student_id, class_id, permission_date),
    INDEX idx_student_date (student_id, permission_date),
    INDEX idx_class_date (class_id, permission_date),
    INDEX idx_enrollment (enrollment_id),
    INDEX idx_permission_date (permission_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Tracks late payment permissions for students to attend class on specific dates';

-- Entry Permit History table
CREATE TABLE IF NOT EXISTS entry_permit_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    class_id INT NOT NULL,
    permit_date DATE NOT NULL COMMENT 'The date this permit was issued for',
    cashier_id VARCHAR(10) NOT NULL COMMENT 'The cashier who issued this permit',
    reason VARCHAR(500) DEFAULT 'Student forgot ID card - Entry permit issued',
    notes TEXT DEFAULT NULL COMMENT 'Additional notes or observations',
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    INDEX idx_student_date (student_id, permit_date),
    INDEX idx_class_date (class_id, permit_date),
    INDEX idx_permit_date (permit_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Tracks all entry permits issued to students who forgot their ID cards';

-- Active Late Pay Permissions View
CREATE OR REPLACE VIEW active_late_pay_permissions AS
SELECT 
    lpp.id,
    lpp.student_id,
    lpp.class_id,
    lpp.permission_date,
    lpp.enrollment_id,
    lpp.cashier_id,
    lpp.reason,
    lpp.issued_at,
    e.payment_status,
    c.class_name,
    c.subject
FROM late_pay_permissions lpp
JOIN enrollments e ON lpp.enrollment_id = e.id
JOIN classes c ON lpp.class_id = c.id
WHERE lpp.permission_date = CURDATE();

-- Today's Entry Permits View
CREATE OR REPLACE VIEW todays_entry_permits AS
SELECT 
    eph.id,
    eph.student_id,
    eph.class_id,
    eph.permit_date,
    eph.cashier_id,
    eph.reason,
    eph.notes,
    eph.issued_at,
    c.class_name,
    c.subject
FROM entry_permit_history eph
JOIN classes c ON eph.class_id = c.id
WHERE eph.permit_date = CURDATE();







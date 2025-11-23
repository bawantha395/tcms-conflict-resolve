-- Migration: Add late pay permissions tracking
-- This allows students to attend class on a specific day even when payment status is unpaid

USE class_db;

-- Create late pay permissions table
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
    INDEX idx_enrollment (enrollment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add late_pay to payment_status ENUM in enrollments table
ALTER TABLE enrollments 
MODIFY COLUMN payment_status ENUM('pending', 'paid', 'partial', 'overdue', 'late_pay') DEFAULT 'pending';

-- Add comments
ALTER TABLE enrollments 
MODIFY COLUMN payment_status ENUM('pending', 'paid', 'partial', 'overdue', 'late_pay') DEFAULT 'pending' 
COMMENT 'pending=not paid, paid=fully paid, partial=partially paid, overdue=payment overdue, late_pay=permission given for today';

-- Create view for easy checking of active late pay permissions
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

-- Add index for performance
CREATE INDEX idx_permission_date ON late_pay_permissions(permission_date);

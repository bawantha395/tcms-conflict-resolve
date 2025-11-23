-- Migration: Add entry permit (forget ID card) history tracking
-- This allows tracking when students attend class without their ID card

USE class_db;

-- Create entry permit history table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create view for today's entry permits
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

-- Add comment to table
ALTER TABLE entry_permit_history 
COMMENT = 'Tracks all entry permits issued to students who forgot their ID cards';

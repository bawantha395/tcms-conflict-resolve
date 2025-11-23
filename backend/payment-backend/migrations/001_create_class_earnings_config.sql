-- Create class_earnings_config table for storing per-class earnings configuration
-- This replaces localStorage implementation with proper database storage

CREATE TABLE IF NOT EXISTS class_earnings_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    class_id INT NOT NULL,
    show_detailed_view BOOLEAN DEFAULT FALSE,
    earnings_mode BOOLEAN DEFAULT FALSE,
    enable_teacher_dashboard BOOLEAN DEFAULT FALSE,
    hall_rent_percentage DECIMAL(5,2) DEFAULT 30.00,
    payhere_percentage DECIMAL(5,2) DEFAULT 3.00,
    other_expenses JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_class (class_id),
    INDEX idx_class_id (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add some helpful comments
ALTER TABLE class_earnings_config 
    COMMENT = 'Stores per-class earnings configuration including teacher dashboard access and revenue split settings';

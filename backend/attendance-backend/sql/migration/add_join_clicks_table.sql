-- Add join button click tracking table
-- This table will store every join button click, separate from attendance records

USE attendance;

-- Create join_button_clicks table to track all clicks
CREATE TABLE IF NOT EXISTS join_button_clicks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    student_name VARCHAR(255),
    click_time DATETIME NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    session_info JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_class_id (class_id),
    INDEX idx_student_id (student_id),
    INDEX idx_click_time (click_time),
    INDEX idx_class_student_date (class_id, student_id, click_time)
);

-- Add some sample data if needed for testing
-- INSERT INTO join_button_clicks (class_id, student_id, student_name, click_time) 
-- VALUES (40, 'S02244', 'Ba Rathnayake', '2025-09-24 08:52:00');

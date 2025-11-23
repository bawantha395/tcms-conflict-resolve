-- Attendance System Database Schema
-- This script creates all necessary tables for the attendance management system
-- This will run automatically when the MySQL container starts for the first time

-- Use the attendance database (created by docker-compose)
-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS attendance;
USE attendance;

-- Drop existing tables if they exist (for clean initialization)
DROP TABLE IF EXISTS attendance_logs;
DROP TABLE IF EXISTS attendance_settings;
DROP TABLE IF EXISTS attendance_summary;
DROP TABLE IF EXISTS zoom_meetings;
DROP TABLE IF EXISTS join_button_clicks;
DROP TABLE IF EXISTS attendance_records;

-- Create attendance_records table
CREATE TABLE attendance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    student_name VARCHAR(255),
    meeting_id VARCHAR(100),
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    attendance_status ENUM('present', 'late', 'absent') NOT NULL DEFAULT 'present',
    join_time DATETIME,
    leave_time DATETIME,
    duration_minutes INT DEFAULT 0,
    attendance_date DATE GENERATED ALWAYS AS (DATE(join_time)) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_class_id (class_id),
    INDEX idx_student_id (student_id),
    INDEX idx_meeting_id (meeting_id),
    INDEX idx_join_time (join_time),
    INDEX idx_source (source),
    INDEX idx_status (attendance_status),
    UNIQUE INDEX unique_student_class_date (class_id, student_id, attendance_date)
);

-- Create zoom_meetings table
CREATE TABLE zoom_meetings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id VARCHAR(100) UNIQUE NOT NULL,
    class_id INT NOT NULL,
    topic VARCHAR(255),
    start_time DATETIME,
    end_time DATETIME,
    status ENUM('started', 'ended', 'cancelled') DEFAULT 'started',
    participant_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_meeting_id (meeting_id),
    INDEX idx_class_id (class_id),
    INDEX idx_start_time (start_time)
);

-- Create join_button_clicks table to track all join button clicks
CREATE TABLE join_button_clicks (
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

-- Create attendance_summary table for analytics
CREATE TABLE attendance_summary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    date DATE NOT NULL,
    total_students INT DEFAULT 0,
    present_count INT DEFAULT 0,
    late_count INT DEFAULT 0,
    absent_count INT DEFAULT 0,
    zoom_attendance INT DEFAULT 0,
    recorded_video_attendance INT DEFAULT 0,
    barcode_attendance INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_class_date (class_id, date),
    INDEX idx_class_id (class_id),
    INDEX idx_date (date)
);

-- Create attendance_settings table
CREATE TABLE attendance_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create attendance_logs table for debugging
CREATE TABLE attendance_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    log_level ENUM('INFO', 'WARNING', 'ERROR', 'DEBUG') DEFAULT 'INFO',
    message TEXT NOT NULL,
    context JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_log_level (log_level),
    INDEX idx_created_at (created_at)
);

-- Insert default settings
INSERT INTO attendance_settings (setting_key, setting_value, description) VALUES
('late_threshold_minutes', '15', 'Minutes after class start time to mark as late'),
('attendance_methods', 'zoom_webhook,zoom_manual,recorded_video,barcode', 'Available attendance tracking methods'),
('auto_calculate_duration', 'true', 'Automatically calculate attendance duration'),
('webhook_secret', 'your_zoom_webhook_secret_here', 'Secret key for webhook verification'),
('default_attendance_status', 'present', 'Default status when marking attendance'),
('max_attendance_duration_hours', '4', 'Maximum attendance duration in hours'),
('real_time_updates', 'true', 'Enable real-time attendance updates'),
('recorded_video_completion_threshold', '80', 'Percentage of video to watch for attendance');

-- Create sample data for testing (only if no data exists)
INSERT INTO attendance_records (class_id, student_id, student_name, source, attendance_status, join_time, leave_time, duration_minutes) 
SELECT 1, 'STU001', 'John Doe', 'zoom_webhook', 'present', NOW() - INTERVAL 2 HOUR, NOW() - INTERVAL 1 HOUR, 60
WHERE NOT EXISTS (SELECT 1 FROM attendance_records WHERE student_id = 'STU001');

INSERT INTO attendance_records (class_id, student_id, student_name, source, attendance_status, join_time, leave_time, duration_minutes) 
SELECT 1, 'STU002', 'Jane Smith', 'zoom_webhook', 'late', NOW() - INTERVAL 1 HOUR + INTERVAL 20 MINUTE, NOW() - INTERVAL 30 MINUTE, 50
WHERE NOT EXISTS (SELECT 1 FROM attendance_records WHERE student_id = 'STU002');

INSERT INTO attendance_records (class_id, student_id, student_name, source, attendance_status, join_time, leave_time, duration_minutes) 
SELECT 2, 'STU003', 'Mike Johnson', 'barcode', 'present', NOW() - INTERVAL 3 HOUR, NOW() - INTERVAL 2 HOUR, 60
WHERE NOT EXISTS (SELECT 1 FROM attendance_records WHERE student_id = 'STU003');

INSERT INTO attendance_records (class_id, student_id, student_name, source, attendance_status, join_time, leave_time, duration_minutes) 
SELECT 3, 'STU004', 'Sarah Wilson', 'recorded_video', 'present', NOW() - INTERVAL 4 HOUR, NOW() - INTERVAL 3 HOUR, 60
WHERE NOT EXISTS (SELECT 1 FROM attendance_records WHERE student_id = 'STU004');

-- Create sample zoom meetings (only if no data exists)
INSERT INTO zoom_meetings (meeting_id, class_id, topic, start_time, end_time, status, participant_count) 
SELECT '123456789', 1, 'Class ID: 1 - Physics Lecture', NOW() - INTERVAL 2 HOUR, NOW() - INTERVAL 1 HOUR, 'ended', 2
WHERE NOT EXISTS (SELECT 1 FROM zoom_meetings WHERE meeting_id = '123456789');

INSERT INTO zoom_meetings (meeting_id, class_id, topic, start_time, end_time, status, participant_count) 
SELECT '987654321', 2, 'Class ID: 2 - Chemistry Lab', NOW() - INTERVAL 3 HOUR, NOW() - INTERVAL 2 HOUR, 'ended', 1
WHERE NOT EXISTS (SELECT 1 FROM zoom_meetings WHERE meeting_id = '987654321');

-- Create sample attendance summary (only if no data exists)
INSERT INTO attendance_summary (class_id, date, total_students, present_count, late_count, absent_count, zoom_attendance, recorded_video_attendance, barcode_attendance) 
SELECT 1, CURDATE(), 2, 1, 1, 0, 2, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM attendance_summary WHERE class_id = 1 AND date = CURDATE());

INSERT INTO attendance_summary (class_id, date, total_students, present_count, late_count, absent_count, zoom_attendance, recorded_video_attendance, barcode_attendance) 
SELECT 2, CURDATE(), 1, 1, 0, 0, 0, 0, 1
WHERE NOT EXISTS (SELECT 1 FROM attendance_summary WHERE class_id = 2 AND date = CURDATE());

INSERT INTO attendance_summary (class_id, date, total_students, present_count, late_count, absent_count, zoom_attendance, recorded_video_attendance, barcode_attendance) 
SELECT 3, CURDATE(), 1, 1, 0, 0, 0, 1, 0
WHERE NOT EXISTS (SELECT 1 FROM attendance_summary WHERE class_id = 3 AND date = CURDATE());

-- Log successful initialization
INSERT INTO attendance_logs (log_level, message, context) VALUES
('INFO', 'Attendance system database initialized successfully', '{"tables_created": 6, "sample_data_inserted": true}');

-- Create a view for easy attendance reporting
CREATE OR REPLACE VIEW attendance_report AS
SELECT 
    ar.id,
    ar.class_id,
    ar.student_id,
    ar.student_name,
    ar.attendance_status,
    ar.source,
    ar.join_time,
    ar.leave_time,
    ar.duration_minutes,
    DATE(ar.created_at) as attendance_date,
    ar.created_at
FROM attendance_records ar
ORDER BY ar.created_at DESC;

-- Create a view for daily attendance summary
CREATE OR REPLACE VIEW daily_attendance_summary AS
SELECT 
    DATE(created_at) as date,
    class_id,
    COUNT(*) as total_records,
    SUM(CASE WHEN attendance_status = 'present' THEN 1 ELSE 0 END) as present_count,
    SUM(CASE WHEN attendance_status = 'late' THEN 1 ELSE 0 END) as late_count,
    SUM(CASE WHEN attendance_status = 'absent' THEN 1 ELSE 0 END) as absent_count,
    SUM(CASE WHEN source = 'zoom_webhook' THEN 1 ELSE 0 END) as zoom_count,
    SUM(CASE WHEN source = 'recorded_video' THEN 1 ELSE 0 END) as recorded_video_count,
    SUM(CASE WHEN source = 'barcode' THEN 1 ELSE 0 END) as barcode_count
FROM attendance_records
GROUP BY DATE(created_at), class_id
ORDER BY date DESC, class_id;

-- Show tables created
SHOW TABLES;

-- Show sample data counts
SELECT 'attendance_records' as table_name, COUNT(*) as record_count FROM attendance_records
UNION ALL
SELECT 'zoom_meetings' as table_name, COUNT(*) as record_count FROM zoom_meetings
UNION ALL
SELECT 'join_button_clicks' as table_name, COUNT(*) as record_count FROM join_button_clicks
UNION ALL
SELECT 'attendance_summary' as table_name, COUNT(*) as record_count FROM attendance_summary
UNION ALL
SELECT 'attendance_settings' as table_name, COUNT(*) as record_count FROM attendance_settings
UNION ALL
SELECT 'attendance_logs' as table_name, COUNT(*) as record_count FROM attendance_logs;

-- Display initialization completion message
SELECT 'Attendance System Database Initialization Complete!' as status;

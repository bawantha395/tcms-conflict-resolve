-- Recordings Management System Migration
-- Industry-level video/audio recording management for class lectures
-- Run this migration to add recordings functionality

USE teacher_db;

-- Recordings table (main table for all recordings)
CREATE TABLE IF NOT EXISTS recordings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  teacher_id VARCHAR(10) NOT NULL,
  teacher_name VARCHAR(200) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  recording_type ENUM('video', 'audio') DEFAULT 'video',
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT COMMENT 'File size in bytes',
  duration INT COMMENT 'Duration in seconds',
  thumbnail_path VARCHAR(500) COMMENT 'Path to video thumbnail',
  video_quality VARCHAR(20) DEFAULT 'HD' COMMENT '4K, HD, SD, etc',
  mime_type VARCHAR(100) COMMENT 'video/mp4, audio/mpeg, etc',
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('processing', 'ready', 'failed', 'archived', 'deleted') DEFAULT 'ready',
  is_public BOOLEAN DEFAULT FALSE COMMENT 'Public access without enrollment',
  category VARCHAR(50) DEFAULT 'lecture' COMMENT 'lecture, tutorial, lab, review, other',
  view_count INT DEFAULT 0,
  download_count INT DEFAULT 0,
  INDEX idx_class (class_id),
  INDEX idx_teacher (teacher_id),
  INDEX idx_status (status),
  INDEX idx_upload_date (upload_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recording access log (track all student views/downloads)
CREATE TABLE IF NOT EXISTS recording_access_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recording_id INT NOT NULL,
  student_id VARCHAR(10) NOT NULL,
  student_name VARCHAR(200),
  access_type ENUM('view', 'download', 'stream') NOT NULL DEFAULT 'view',
  watch_duration INT DEFAULT 0 COMMENT 'How many seconds watched',
  access_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_type VARCHAR(50) COMMENT 'mobile, desktop, tablet',
  FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
  INDEX idx_recording (recording_id),
  INDEX idx_student (student_id),
  INDEX idx_timestamp (access_timestamp),
  INDEX idx_access_type (access_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recording chapters/timestamps (optional - for marking important parts)
CREATE TABLE IF NOT EXISTS recording_chapters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recording_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  timestamp INT NOT NULL COMMENT 'Timestamp in seconds',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
  INDEX idx_recording (recording_id),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recording comments/notes (students can add notes at specific timestamps)
CREATE TABLE IF NOT EXISTS recording_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recording_id INT NOT NULL,
  student_id VARCHAR(10) NOT NULL,
  timestamp INT NOT NULL COMMENT 'Timestamp in seconds where note was added',
  note TEXT NOT NULL,
  is_private BOOLEAN DEFAULT TRUE COMMENT 'Private notes vs shared with class',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
  INDEX idx_recording (recording_id),
  INDEX idx_student (student_id),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recording watch progress (track where each student stopped watching)
CREATE TABLE IF NOT EXISTS recording_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recording_id INT NOT NULL,
  student_id VARCHAR(10) NOT NULL,
  last_position INT DEFAULT 0 COMMENT 'Last watched position in seconds',
  completion_percentage DECIMAL(5,2) DEFAULT 0.00,
  is_completed BOOLEAN DEFAULT FALSE,
  last_watched TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_recording (recording_id, student_id),
  FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
  INDEX idx_recording (recording_id),
  INDEX idx_student (student_id),
  INDEX idx_completion (completion_percentage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add some sample data for testing (optional)
-- INSERT INTO recordings (class_id, teacher_id, teacher_name, title, description, recording_type, file_name, file_path, file_size, duration, category)
-- VALUES 
-- (42, 'T001', 'Mr. Bawantha', 'Introduction to Physics', 'First lecture covering basics of motion and forces', 'video', 'lecture_01.mp4', '/var/www/html/uploads/recordings/class_42/lecture_01.mp4', 157286400, 3600, 'lecture'),
-- (42, 'T001', 'Mr. Bawantha', 'Problem Solving Session', 'Solving problems from Chapter 1', 'video', 'tutorial_01.mp4', '/var/www/html/uploads/recordings/class_42/tutorial_01.mp4', 104857600, 2400, 'tutorial');

-- Create indexes for better performance
CREATE INDEX idx_recording_class_status ON recordings(class_id, status);
CREATE INDEX idx_recording_teacher_status ON recordings(teacher_id, status);
CREATE INDEX idx_access_log_student_recording ON recording_access_log(student_id, recording_id);

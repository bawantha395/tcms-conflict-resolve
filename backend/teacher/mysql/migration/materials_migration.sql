-- Materials Management System Migration
-- Run this migration to add materials handling functionality

USE teacher_db;

-- Materials table (core table for all materials)
CREATE TABLE IF NOT EXISTS materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  teacher_id VARCHAR(10) NOT NULL,
  teacher_name VARCHAR(200) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_type ENUM('pdf', 'video', 'document', 'link') DEFAULT 'pdf',
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  original_file_path VARCHAR(500) COMMENT 'Store original before processing',
  is_password_protected BOOLEAN DEFAULT TRUE,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
  is_free BOOLEAN DEFAULT FALSE COMMENT 'Free access without enrollment',
  category VARCHAR(50) DEFAULT 'notes' COMMENT 'notes, assignment, past_paper, video, other',
  download_count INT DEFAULT 0,
  INDEX idx_class (class_id),
  INDEX idx_teacher (teacher_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Material access log (track all student downloads/views)
CREATE TABLE IF NOT EXISTS material_access_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  material_id INT NOT NULL,
  student_id VARCHAR(10) NOT NULL,
  student_name VARCHAR(200),
  access_type ENUM('view', 'download') NOT NULL DEFAULT 'download',
  access_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  watermark_applied BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
  INDEX idx_material (material_id),
  INDEX idx_student (student_id),
  INDEX idx_timestamp (access_timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Material folders (optional organization)
CREATE TABLE IF NOT EXISTS material_folders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  folder_name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_folder_id INT NULL COMMENT 'For nested folders',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_class (class_id),
  FOREIGN KEY (parent_folder_id) REFERENCES material_folders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Link materials to folders (many-to-many)
CREATE TABLE IF NOT EXISTS material_folder_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  material_id INT NOT NULL,
  folder_id INT NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
  FOREIGN KEY (folder_id) REFERENCES material_folders(id) ON DELETE CASCADE,
  UNIQUE KEY unique_material_folder (material_id, folder_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data (optional - for testing)
-- INSERT INTO materials (class_id, teacher_id, teacher_name, title, description, file_name, file_path, category)
-- VALUES (1, 'T001', 'John Doe', 'Introduction to Chemistry', 'Basic chemistry concepts', 'intro_chemistry.pdf', '/uploads/materials/class_1/intro_chemistry.pdf', 'notes');

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON teacher_db.materials TO 'teacheruser'@'%';
-- GRANT SELECT, INSERT ON teacher_db.material_access_log TO 'teacheruser'@'%';

SELECT 'Materials tables created successfully!' AS status;

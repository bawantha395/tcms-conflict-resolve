-- Study Pack Documents Security Enhancement Migration
-- Adds download tracking and access logging for study pack documents

USE teacher_db;

-- Add download tracking columns to study_pack_documents table (check if not exists)
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE table_schema=DATABASE() AND table_name='study_pack_documents' AND column_name='download_count') > 0,
  "SELECT 'download_count already exists' AS message",
  "ALTER TABLE study_pack_documents ADD COLUMN download_count INT DEFAULT 0"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE table_schema=DATABASE() AND table_name='study_pack_documents' AND column_name='is_password_protected') > 0,
  "SELECT 'is_password_protected already exists' AS message",
  "ALTER TABLE study_pack_documents ADD COLUMN is_password_protected BOOLEAN DEFAULT TRUE"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index for better query performance (ignore if exists)
ALTER TABLE study_pack_documents ADD INDEX idx_study_pack (study_pack_id);

-- Create access log table for study pack documents
CREATE TABLE IF NOT EXISTS study_pack_document_access_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  student_id VARCHAR(10) NOT NULL,
  student_name VARCHAR(200),
  access_type ENUM('download') DEFAULT 'download',
  access_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  watermark_applied BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (document_id) REFERENCES study_pack_documents(id) ON DELETE CASCADE,
  INDEX idx_document (document_id),
  INDEX idx_student (student_id),
  INDEX idx_timestamp (access_timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Study Pack Documents Security tables created/updated successfully!' AS status;

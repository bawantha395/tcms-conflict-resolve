-- Add barcode column to students table
USE student_db;

ALTER TABLE students 
ADD COLUMN barcode_data VARCHAR(255) NULL,
ADD COLUMN barcode_generated_at TIMESTAMP NULL;

-- Add index for better performance
CREATE INDEX idx_barcode_data ON students(barcode_data);

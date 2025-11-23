-- Add registration_method column to students table to track how student was registered
-- This allows proper distinction between Online and Physical registration

USE student_db;

-- Add registration_method column
ALTER TABLE students 
ADD COLUMN registration_method ENUM('Online', 'Physical') DEFAULT 'Physical' 
AFTER barcode_generated_at;

-- Add index for filtering
ALTER TABLE students 
ADD INDEX idx_registration_method (registration_method);

-- Update existing students to 'Physical' (default for backward compatibility)
UPDATE students 
SET registration_method = 'Physical' 
WHERE registration_method IS NULL;

-- Comment explaining the field
ALTER TABLE students 
MODIFY COLUMN registration_method ENUM('Online', 'Physical') DEFAULT 'Physical' 
COMMENT 'Method used to register student: Online (web form) or Physical (admin entry)';

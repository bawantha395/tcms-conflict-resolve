-- Add unique constraint to prevent duplicate attendance per student per day per class
-- This migration script adds a unique index to ensure one attendance record per student per day

USE attendance;

-- First, let's clean up existing duplicates by keeping only the latest record for each student per day
-- Create a temporary table with the IDs of records to keep
CREATE TEMPORARY TABLE records_to_keep AS
SELECT MAX(id) as keep_id
FROM attendance_records
GROUP BY class_id, student_id, DATE(join_time);

-- Delete duplicate records, keeping only the latest ones
DELETE FROM attendance_records 
WHERE id NOT IN (SELECT keep_id FROM records_to_keep);

-- Add a computed column for date and create unique constraint
ALTER TABLE attendance_records 
ADD COLUMN attendance_date DATE GENERATED ALWAYS AS (DATE(join_time)) STORED;

-- Now add the unique constraint using the computed date column
ALTER TABLE attendance_records 
ADD UNIQUE INDEX unique_student_class_date (class_id, student_id, attendance_date);

-- This ensures only one attendance record per student per class per day

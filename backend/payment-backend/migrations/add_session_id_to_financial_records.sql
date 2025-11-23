-- Add session_id column to financial_records table to track cashier sessions
-- This ensures Session Collections KPI shows only data from the active session, not the entire day

ALTER TABLE financial_records 
ADD COLUMN session_id INT NULL AFTER created_by,
ADD INDEX idx_session_id (session_id);

-- Add foreign key if cashier_sessions table exists
-- Note: This will fail if cashier_sessions is in a different database
-- In that case, just add the column without the foreign key constraint
-- ALTER TABLE financial_records 
-- ADD FOREIGN KEY (session_id) REFERENCES cashier_sessions(session_id) ON DELETE SET NULL;

-- Add delivery_status column to financial_records table for speed post delivery tracking
-- Run this migration to add delivery status tracking

ALTER TABLE financial_records 
ADD COLUMN delivery_status ENUM('pending', 'processing', 'delivered') DEFAULT 'pending' AFTER notes;

-- Add index for faster filtering by delivery status
CREATE INDEX idx_delivery_status ON financial_records(delivery_status);

-- Update existing records with speed post to have pending status
UPDATE financial_records 
SET delivery_status = 'pending' 
WHERE notes LIKE '%Speed Post:%' 
  AND notes NOT LIKE '%Speed Post: 0%'
  AND delivery_status IS NULL;

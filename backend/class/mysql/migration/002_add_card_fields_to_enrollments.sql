-- Migration: add card fields to enrollments
-- Adds card_type, card_valid_from, card_valid_to, card_notes if they do not already exist

ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS card_type VARCHAR(20) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS card_valid_from DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS card_valid_to DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS card_notes TEXT DEFAULT NULL;

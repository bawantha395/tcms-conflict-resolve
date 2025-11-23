-- Add Tute and Paper Collection fields to classes table
-- Run this script to update existing database

-- Add enable_tute_collection column
ALTER TABLE classes ADD COLUMN enable_tute_collection BOOLEAN DEFAULT FALSE;

-- Add tute_collection_type column
ALTER TABLE classes ADD COLUMN tute_collection_type ENUM('speed_post', 'physical_class', 'both') DEFAULT 'speed_post';

-- Add speed_post_fee column
ALTER TABLE classes ADD COLUMN speed_post_fee DECIMAL(10,2) DEFAULT 300.00;

-- Add indexes for better performance
ALTER TABLE classes ADD INDEX idx_tute_collection (enable_tute_collection);
ALTER TABLE classes ADD INDEX idx_tute_collection_type (tute_collection_type);

-- Run this script to update existing database

-- Add enable_tute_collection column
ALTER TABLE classes ADD COLUMN enable_tute_collection BOOLEAN DEFAULT FALSE;

-- Add tute_collection_type column
ALTER TABLE classes ADD COLUMN tute_collection_type ENUM('speed_post', 'physical_class', 'both') DEFAULT 'speed_post';

-- Add speed_post_fee column
ALTER TABLE classes ADD COLUMN speed_post_fee DECIMAL(10,2) DEFAULT 300.00;

-- Add indexes for better performance
ALTER TABLE classes ADD INDEX idx_tute_collection (enable_tute_collection);
ALTER TABLE classes ADD INDEX idx_tute_collection_type (tute_collection_type);

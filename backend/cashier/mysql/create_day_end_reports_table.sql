-- Day End Reports Table
-- This table stores daily reports that aggregate all sessions for a specific date

CREATE TABLE IF NOT EXISTS day_end_reports (
    report_id INT PRIMARY KEY AUTO_INCREMENT,
    report_date DATE NOT NULL,
    report_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    report_type ENUM('summary', 'full') DEFAULT 'full',
    cashier_id VARCHAR(20) NOT NULL,
    cashier_name VARCHAR(100),
    
    -- Financial data aggregated from all sessions on this date
    opening_balance DECIMAL(10,2) DEFAULT 0,
    total_collections DECIMAL(10,2) DEFAULT 0,
    total_cash_out DECIMAL(10,2) DEFAULT 0,
    expected_closing DECIMAL(10,2) DEFAULT 0,
    actual_closing DECIMAL(10,2) DEFAULT 0,
    variance DECIMAL(10,2) DEFAULT 0,
    
    -- Transaction counts
    total_receipts INT DEFAULT 0,
    full_cards_issued INT DEFAULT 0,
    half_cards_issued INT DEFAULT 0,
    free_cards_issued INT DEFAULT 0,
    
    -- Detailed breakdown by session and class
    report_data JSON COMMENT 'Contains: {sessions: [], per_class: [], card_summary: {}}',
    
    -- Session references (array of session IDs included in this day)
    session_ids JSON COMMENT 'Array of session_ids included in this report',
    
    is_final BOOLEAN DEFAULT 0,
    notes TEXT,
    created_by VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_report_date (report_date),
    INDEX idx_cashier (cashier_id),
    INDEX idx_final (is_final),
    UNIQUE KEY unique_date_cashier_type (report_date, cashier_id, report_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

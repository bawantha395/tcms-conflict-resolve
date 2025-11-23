-- =====================================================
-- CASHIER SESSION MANAGEMENT TABLES
-- =====================================================
-- Date: October 18, 2025
-- Purpose: Persist cashier session data across page refreshes and throughout the day

-- 1. CASHIER SESSIONS TABLE
-- Tracks daily cashier sessions with all KPIs
CREATE TABLE IF NOT EXISTS cashier_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    cashier_id VARCHAR(10) NOT NULL,
    cashier_name VARCHAR(200) NOT NULL,
    session_date DATE NOT NULL,
    
    -- Session timing
    first_login_time DATETIME NOT NULL,
    last_activity_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    day_end_time DATETIME NULL,
    
    -- KPIs (continuously updated throughout the day)
    total_collections DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Total cash collected today',
    receipts_issued INT DEFAULT 0 COMMENT 'Number of payment receipts issued',
    pending_payments INT DEFAULT 0 COMMENT 'Number of late payment notes issued',
    
    -- Cash drawer management
    opening_balance DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Starting cash in drawer',
    cash_drawer_balance DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Current cash in drawer',
    closing_balance DECIMAL(10,2) NULL COMMENT 'Final cash count at day end',
    
    -- Session status
    session_status ENUM('active', 'locked', 'closed') DEFAULT 'active' COMMENT 'Current session state',
    is_day_ended BOOLEAN DEFAULT FALSE COMMENT 'Whether day end report was generated',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_cashier_date (cashier_id, session_date),
    INDEX idx_date (session_date),
    INDEX idx_status (session_status),
    INDEX idx_last_activity (last_activity_time)
    
    -- Note: Removed unique constraint - multiple sessions per day allowed (session-based, not day-based)
    
    -- Note: Foreign key to users table removed - cashier_db is independent
    -- Foreign key would reference users(userid) in the auth database
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Daily cashier sessions with persistent KPIs';
-- Note: Removed unique constraint - multiple sessions per day allowed (session-based, not day-based)

-- 2. SESSION ACTIVITIES TABLE
-- Detailed log of all session activities for audit trail
CREATE TABLE IF NOT EXISTS session_activities (
    activity_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    
    -- Activity type
    activity_type ENUM(
        'login',
        'logout', 
        'lock',
        'unlock',
        'payment_collected',
        'receipt_issued',
        'late_note_issued',
        'cash_drawer_opened',
        'cash_drawer_closed',
        'day_end_report',
        'student_registered',
        'class_enrolled'
    ) NOT NULL COMMENT 'Type of activity performed',
    
    activity_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Activity details (JSON for flexibility)
    activity_data JSON NULL COMMENT 'Detailed activity information',
    
    -- Quick reference fields (denormalized for fast queries)
    amount DECIMAL(10,2) NULL COMMENT 'Transaction amount if applicable',
    student_id VARCHAR(10) NULL COMMENT 'Related student ID',
    transaction_id VARCHAR(50) NULL COMMENT 'Related transaction ID',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_session (session_id),
    INDEX idx_type_time (activity_type, activity_time),
    INDEX idx_student (student_id),
    INDEX idx_transaction (transaction_id),
    INDEX idx_time (activity_time),
    
    -- Foreign key
    FOREIGN KEY (session_id) REFERENCES cashier_sessions(session_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Audit trail of all cashier activities';

-- 3. CASH DRAWER TRANSACTIONS TABLE
-- Track all cash movements for accountability
CREATE TABLE IF NOT EXISTS cash_drawer_transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    
    -- Transaction type
    transaction_type ENUM(
        'opening_balance',
        'payment_in',
        'cash_out',
        'adjustment',
        'closing_balance'
    ) NOT NULL COMMENT 'Type of cash movement',
    
    -- Transaction details
    amount DECIMAL(10,2) NOT NULL COMMENT 'Transaction amount',
    balance_after DECIMAL(10,2) NOT NULL COMMENT 'Drawer balance after transaction',
    
    notes TEXT NULL COMMENT 'Transaction notes',
    payment_id INT NULL COMMENT 'Related payment record ID',
    
    transaction_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(10) NOT NULL,
    
    -- Indexes for performance
    INDEX idx_session (session_id),
    INDEX idx_type (transaction_type),
    INDEX idx_time (transaction_time),
    INDEX idx_created_by (created_by),
    
    -- Foreign keys
    FOREIGN KEY (session_id) REFERENCES cashier_sessions(session_id) ON DELETE CASCADE
    -- Note: Foreign key to users table removed - cashier_db is independent
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Cash drawer transaction log';

-- 4. SESSION END REPORTS TABLE
-- Store generated session end reports for history and auditing
CREATE TABLE IF NOT EXISTS session_end_reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    
    -- Report metadata
    report_date DATE NOT NULL COMMENT 'Date when report was generated',
    report_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Exact time report was generated',
    report_type ENUM('summary', 'full') NOT NULL DEFAULT 'full' COMMENT 'Type of report generated',
    
    -- Session information (denormalized for quick access)
    cashier_id VARCHAR(10) NOT NULL,
    cashier_name VARCHAR(200) NOT NULL,
    session_date DATE NOT NULL,
    session_start_time DATETIME NOT NULL,
    session_end_time DATETIME NULL,
    
    -- Financial summary (denormalized for quick queries)
    opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_collections DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cash_out_amount DECIMAL(10,2) NULL COMMENT 'Physical cash counted during cash-out',
    expected_closing DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    variance DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Difference between expected and actual',
    
    -- Transaction summary
    total_receipts INT DEFAULT 0,
    full_cards_issued INT DEFAULT 0,
    half_cards_issued INT DEFAULT 0,
    free_cards_issued INT DEFAULT 0,
    
    -- Report data (full JSON for recreating report)
    report_data JSON NOT NULL COMMENT 'Complete report data including transactions and per-class breakdown',
    
    -- Status
    is_final BOOLEAN DEFAULT FALSE COMMENT 'Whether this is the final report (after cash-out)',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(10) NOT NULL,
    
    -- Indexes for performance
    INDEX idx_session (session_id),
    INDEX idx_cashier_date (cashier_id, report_date),
    INDEX idx_report_date (report_date),
    INDEX idx_report_time (report_time),
    INDEX idx_is_final (is_final),
    
    -- Foreign key
    FOREIGN KEY (session_id) REFERENCES cashier_sessions(session_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Session End Report history for auditing and review';

-- =====================================================
-- END OF TABLE DEFINITIONS
-- =====================================================
-- Note: No sample data included - production ready
-- To test: Create cashier users in auth database (role='cashier')

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- 4. SAMPLE DATA (for testing)
-- Note: Sample user insert removed - users table is in auth database
-- To test, ensure a cashier user exists in the main auth database

-- Create a sample session for today (for testing)
INSERT INTO cashier_sessions (
    cashier_id, 
    cashier_name, 
    session_date, 
    first_login_time,
    opening_balance,
    cash_drawer_balance,
    session_status
) VALUES (
    'C00001',
    'Test Cashier',
    CURDATE(),
    CONCAT(CURDATE(), ' 08:00:00'),
    5000.00,
    5000.00,
    'active'
) ON DUPLICATE KEY UPDATE 
    last_activity_time = CURRENT_TIMESTAMP;

-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- View: Active sessions today
CREATE OR REPLACE VIEW v_active_sessions AS
SELECT 
    s.session_id,
    s.cashier_id,
    s.cashier_name,
    s.session_date,
    s.first_login_time,
    s.last_activity_time,
    s.total_collections,
    s.receipts_issued,
    s.pending_payments,
    s.cash_drawer_balance,
    s.session_status,
    TIMESTAMPDIFF(HOUR, s.first_login_time, COALESCE(s.day_end_time, NOW())) as hours_active
FROM 
    cashier_sessions s
WHERE 
    s.session_date = CURDATE()
    AND s.session_status IN ('active', 'locked');

-- View: Session summary
CREATE OR REPLACE VIEW v_session_summary AS
SELECT 
    s.session_id,
    s.cashier_name,
    s.session_date,
    s.total_collections,
    s.receipts_issued,
    s.pending_payments,
    s.opening_balance,
    s.closing_balance,
    (s.closing_balance - s.opening_balance) as net_collections,
    (s.closing_balance - s.opening_balance - s.total_collections) as discrepancy,
    COUNT(a.activity_id) as total_activities
FROM 
    cashier_sessions s
LEFT JOIN 
    session_activities a ON s.session_id = a.session_id
GROUP BY 
    s.session_id;

-- =====================================================
-- STORED PROCEDURES
-- =====================================================

-- Procedure: Get or create session for today
DELIMITER //
CREATE PROCEDURE sp_get_or_create_session(
    IN p_cashier_id VARCHAR(10),
    IN p_cashier_name VARCHAR(200),
    IN p_opening_balance DECIMAL(10,2)
)
BEGIN
    DECLARE v_session_id INT;
    DECLARE v_session_exists BOOLEAN DEFAULT FALSE;
    
    -- Check if session exists for today
    SELECT 
        session_id INTO v_session_id
    FROM 
        cashier_sessions
    WHERE 
        cashier_id = p_cashier_id
        AND session_date = CURDATE()
    LIMIT 1;
    
    IF v_session_id IS NOT NULL THEN
        -- Session exists, update last activity
        UPDATE cashier_sessions 
        SET last_activity_time = NOW()
        WHERE session_id = v_session_id;
        
        SET v_session_exists = TRUE;
    ELSE
        -- Create new session
        INSERT INTO cashier_sessions (
            cashier_id,
            cashier_name,
            session_date,
            first_login_time,
            opening_balance,
            cash_drawer_balance
        ) VALUES (
            p_cashier_id,
            p_cashier_name,
            CURDATE(),
            NOW(),
            p_opening_balance,
            p_opening_balance
        );
        
        SET v_session_id = LAST_INSERT_ID();
        
        -- Log opening balance
        INSERT INTO cash_drawer_transactions (
            session_id,
            transaction_type,
            amount,
            balance_after,
            notes,
            created_by
        ) VALUES (
            v_session_id,
            'opening_balance',
            p_opening_balance,
            p_opening_balance,
            'Initial cash drawer opening balance',
            p_cashier_id
        );
        
        -- Log login activity
        INSERT INTO session_activities (
            session_id,
            activity_type,
            activity_data
        ) VALUES (
            v_session_id,
            'login',
            JSON_OBJECT('cashier_name', p_cashier_name, 'login_time', NOW())
        );
    END IF;
    
    -- Return session details
    SELECT 
        session_id,
        cashier_id,
        cashier_name,
        session_date,
        first_login_time,
        last_activity_time,
        total_collections,
        receipts_issued,
        pending_payments,
        opening_balance,
        cash_drawer_balance,
        session_status,
        is_day_ended,
        v_session_exists as is_resumed
    FROM 
        cashier_sessions
    WHERE 
        session_id = v_session_id;
END//
DELIMITER ;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Already created inline with table definitions above

-- =====================================================
-- GRANTS (if using separate cashier database user)
-- =====================================================

-- GRANT SELECT, INSERT, UPDATE ON cashier_sessions TO 'cashier_backend'@'%';
-- GRANT SELECT, INSERT, UPDATE ON session_activities TO 'cashier_backend'@'%';
-- GRANT SELECT, INSERT, UPDATE ON cash_drawer_transactions TO 'cashier_backend'@'%';
-- GRANT EXECUTE ON PROCEDURE sp_get_or_create_session TO 'cashier_backend'@'%';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if tables were created
SELECT 
    TABLE_NAME, 
    TABLE_ROWS, 
    CREATE_TIME 
FROM 
    INFORMATION_SCHEMA.TABLES 
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN ('cashier_sessions', 'session_activities', 'cash_drawer_transactions');

-- Check today's sessions
SELECT * FROM v_active_sessions;

-- Check session summary
SELECT * FROM v_session_summary WHERE session_date = CURDATE();

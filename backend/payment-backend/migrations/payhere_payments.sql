-- PayHere Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'LKR',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'Sri Lanka',
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    payment_method VARCHAR(50) DEFAULT 'payhere',
    payhere_payment_id VARCHAR(100) NULL,
    payhere_status_code VARCHAR(10) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order_id (order_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Add PayHere specific columns to existing financial_records table if needed
ALTER TABLE financial_records 
ADD COLUMN IF NOT EXISTS payhere_order_id VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS payhere_payment_id VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS payhere_status VARCHAR(20) NULL;

-- Add indexes for better performance
ALTER TABLE financial_records 
ADD INDEX IF NOT EXISTS idx_payhere_order_id (payhere_order_id),
ADD INDEX IF NOT EXISTS idx_payhere_payment_id (payhere_payment_id); 
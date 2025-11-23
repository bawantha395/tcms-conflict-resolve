-- Payment Backend Database Initialization
-- This contains only payment-related tables

-- PayHere Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'LKR',
    status ENUM('pending', 'paid', 'cancelled', 'failed') DEFAULT 'pending',
    payment_method VARCHAR(50) DEFAULT 'payhere',
    payhere_payment_id VARCHAR(100) NULL,
    student_id VARCHAR(50) NOT NULL,
    class_id INT NOT NULL,
    enrollment_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order_id (order_id),
    INDEX idx_student_id (student_id),
    INDEX idx_class_id (class_id),
    INDEX idx_status (status)
);

-- Payment history table
CREATE TABLE IF NOT EXISTS payment_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    class_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(50),
    status ENUM('success', 'failed', 'pending') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_student_id (student_id),
    INDEX idx_payment_date (payment_date)
);

-- Financial records table (updated to match PaymentController expectations)
CashierDashboard.jsx:9343 Starting cash drawer session with user: {userid: 'C001', role: 'cashier', name: 'Bawantha', email: 'bawantharathnayake25@gmail.com', phone: '0710901846', …}
CashierDashboard.jsx:9344 User ID: C001
CashierDashboard.jsx:9345 User Name: Bawantha
CashierDashboard.jsx:9346 User Role: cashier
CashierDashboard.jsx:9356 Request body: {cashier_id: 'C001', cashier_name: 'Bawantha', opening_balance: 120}
cashierdashboard:1 Access to fetch at 'http://localhost:8083/api/session/start' from origin 'http://localhost:3000' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
CashierDashboard.jsx:9358  POST http://localhost:8083/api/session/start net::ERR_FAILED
startCashDrawerSession @ CashierDashboard.jsx:9358
handleSubmit @ CashierDashboard.jsx:4675
executeDispatch @ react-dom-client.development.js:16368
runWithFiberInDEV @ react-dom-client.development.js:1518
processDispatchQueue @ react-dom-client.development.js:16417
(anonymous) @ react-dom-client.development.js:17016
batchedUpdates$1 @ react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ react-dom-client.development.js:16572
dispatchEvent @ react-dom-client.development.js:20657
dispatchDiscreteEvent @ react-dom-client.development.js:20625
CashierDashboard.jsx:9401 Error starting cash drawer session: TypeError: Failed to fetch
    at startCashDrawerSession (CashierDashboard.jsx:9358:1)
    at handleSubmit (CashierDashboard.jsx:4675:1)
    at executeDispatch (react-dom-client.development.js:16368:1)
    at runWithFiberInDEV (react-dom-client.development.js:1518:1)
    at processDispatchQueue (react-dom-client.development.js:16417:1)
    at react-dom-client.development.js:17016:1
    at batchedUpdates$1 (react-dom-client.development.js:3262:1)
    at dispatchEventForPluginEventSystem (react-dom-client.development.js:16572:1)
    at dispatchEvent (react-dom-client.development.js:20657:1)
    at dispatchDiscreteEvent (react-dom-client.development.js:20625:1)
startCashDrawerSession @ CashierDashboard.jsx:9401
await in startCashDrawerSession
handleSubmit @ CashierDashboard.jsx:4675
executeDispatch @ react-dom-client.development.js:16368
runWithFiberInDEV @ react-dom-client.development.js:1518
processDispatchQueue @ react-dom-client.development.js:16417
(anonymous) @ react-dom-client.development.js:17016
batchedUpdates$1 @ react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ react-dom-client.development.js:16572
dispatchEvent @ react-dom-client.development.js:20657
dispatchDiscreteEvent @ react-dom-client.development.js:20625
CashierDashboard.jsx:8092 💰 Cash Drawer Calculation:
CashierDashboard.jsx:8093   - Starting Float: 0
CashierDashboard.jsx:8094   - Cash Collected Today: 1000
CashierDashboard.jsx:8095   - Total Drawer Balance: 1000
CashierDashboard.jsx:8096   - Cash Drawer Session: null
CREATE TABLE IF NOT EXISTS financial_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    date DATE NOT NULL,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    person_name VARCHAR(100) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    person_role VARCHAR(50) NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    class_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'paid', 'cancelled', 'failed') DEFAULT 'pending',
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    notes TEXT,
    created_by VARCHAR(50),
    session_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_user_id (user_id),
    INDEX idx_class_id (class_id),
    INDEX idx_status (status),
    INDEX idx_session_id (session_id)
);

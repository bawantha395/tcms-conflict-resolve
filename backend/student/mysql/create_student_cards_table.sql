-- Create student_cards table (migration)
CREATE TABLE IF NOT EXISTS student_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_id VARCHAR(50) UNIQUE,
    student_id VARCHAR(20) NOT NULL,
    class_id INT DEFAULT NULL,
    card_type ENUM('full','half','free') NOT NULL DEFAULT 'half',
    reason TEXT,
    valid_from DATE DEFAULT NULL,
    valid_until DATE DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(user_id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);

<?php

class RateLimiter {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    // Check if user is locked out
    public function isLockedOut($userid) {
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as failed_attempts, MAX(attempt_time) as last_attempt 
            FROM login_attempts 
            WHERE userid = ? AND attempt_type IN ('FAILED_PASSWORD', 'INVALID_USER') 
            AND attempt_time > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
        ");
        $stmt->bind_param("s", $userid);
        $stmt->execute();
        $result = $stmt->get_result();
        $data = $result->fetch_assoc();
        
        // Lock out after 5 failed attempts in 15 minutes
        return $data['failed_attempts'] >= 5;
    }
    
    // Record login attempt
    public function recordAttempt($userid, $success, $ip = null) {
        if (!$ip) {
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        }
        
        $attemptType = $success ? 'SUCCESS' : 'FAILED_PASSWORD';
        
        // Avoid inserting attempts for unknown users because login_attempts
        // has a foreign key to users(userid) which will cause a fatal error
        // if the userid does not exist. Check existence first and skip
        // recording for unknown users.
        $check = $this->db->prepare("SELECT 1 FROM users WHERE userid = ? LIMIT 1");
        if ($check) {
            $check->bind_param("s", $userid);
            $check->execute();
            $res = $check->get_result();
            $exists = ($res && $res->num_rows > 0);
            $check->close();
        } else {
            // If the check couldn't be prepared for some reason, fall back
            // to skipping the insert to avoid crashing the whole request.
            $exists = false;
        }

        if (!$exists) {
            // Unknown user: do not record attempt to avoid FK constraint errors.
            return;
        }

        $stmt = $this->db->prepare("
            INSERT INTO login_attempts (userid, attempt_type, ip_address, attempt_time) 
            VALUES (?, ?, ?, NOW())
        ");
        $stmt->bind_param("sss", $userid, $attemptType, $ip);
        $stmt->execute();
    }
    
    // Get remaining attempts before lockout
    public function getRemainingAttempts($userid) {
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as failed_attempts 
            FROM login_attempts 
            WHERE userid = ? AND attempt_type IN ('FAILED_PASSWORD', 'INVALID_USER') 
            AND attempt_time > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
        ");
        $stmt->bind_param("s", $userid);
        $stmt->execute();
        $result = $stmt->get_result();
        $data = $result->fetch_assoc();
        
        return max(0, 5 - $data['failed_attempts']);
    }
    
    // Clean old attempts (older than 15 minutes)
    public function cleanOldAttempts() {
        $stmt = $this->db->prepare("
            DELETE FROM login_attempts 
            WHERE attempt_time < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
        ");
        $stmt->execute();
    }
} 
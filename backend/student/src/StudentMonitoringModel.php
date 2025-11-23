<?php
class StudentMonitoringModel {
    private $conn;
    private $authConn;

    public function __construct($db) {
        $this->conn = $db; // Student database connection
        
        // Connect to auth database for monitoring operations
        $this->authConn = new mysqli(
            getenv('AUTH_DB_HOST') ?: 'auth-mysql-server',
            getenv('AUTH_DB_USER') ?: 'devuser',
            getenv('AUTH_DB_PASSWORD') ?: 'devpass',
            getenv('AUTH_DB_NAME') ?: 'auth-db'
        );
        
        if ($this->authConn->connect_errno) {
            error_log("Failed to connect to auth database: " . $this->authConn->connect_error);
        }
    }

    // Track student login activity
    public function trackLoginActivity($studentId, $ipAddress, $userAgent, $sessionId, $loginTime) {
        // First, ensure the student exists in the auth database students table
        $this->ensureStudentExistsInAuthDB($studentId);
        
        $stmt = $this->authConn->prepare("
            INSERT INTO student_login_activity (
                student_id, ip_address, user_agent, session_id, login_time, 
                device_fingerprint, location_data, is_suspicious
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $deviceFingerprint = $this->generateDeviceFingerprint($userAgent, $ipAddress);
        $locationData = $this->getLocationData($ipAddress);
        $isSuspicious = $this->detectSuspiciousActivity($studentId, $ipAddress, $loginTime, $deviceFingerprint);

        $stmt->bind_param("sssssssi", 
            $studentId, $ipAddress, $userAgent, $sessionId, $loginTime, 
            $deviceFingerprint, $locationData, $isSuspicious
        );

        return $stmt->execute();
    }

    // Track concurrent sessions
    public function trackConcurrentSession($studentId, $sessionId, $classId, $ipAddress, $deviceInfo) {
        $stmt = $this->authConn->prepare("
            INSERT INTO concurrent_sessions (
                student_id, session_id, class_id, ip_address, device_info, 
                session_start_time, is_active, is_suspicious
            ) VALUES (?, ?, ?, ?, ?, NOW(), 1, ?)
        ");

        $isSuspicious = $this->detectConcurrentSessionCheating($studentId, $classId, $ipAddress);
        
        $stmt->bind_param("sssssi", 
            $studentId, $sessionId, $classId, $ipAddress, $deviceInfo, $isSuspicious
        );

        return $stmt->execute();
    }

    // End concurrent session
    public function endConcurrentSession($sessionId) {
        $stmt = $this->authConn->prepare("
            UPDATE concurrent_sessions 
            SET is_active = 0, session_end_time = NOW() 
            WHERE session_id = ?
        ");
        
        $stmt->bind_param("s", $sessionId);
        return $stmt->execute();
    }

    // Detect suspicious activity
    private function detectSuspiciousActivity($studentId, $ipAddress, $loginTime, $deviceFingerprint = null) {
        // Check for multiple logins from different IPs within short time
        $stmt = $this->authConn->prepare("
            SELECT COUNT(DISTINCT ip_address) as ip_count 
            FROM student_login_activity 
            WHERE student_id = ? 
            AND login_time > DATE_SUB(?, INTERVAL 1 HOUR)
        ");
        
        $stmt->bind_param("ss", $studentId, $loginTime);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        
        // Check for multiple device fingerprints within short time (more sensitive)
        $deviceSuspicious = false;
        if ($deviceFingerprint) {
            $stmt2 = $this->authConn->prepare("
                SELECT COUNT(DISTINCT device_fingerprint) as device_count 
                FROM student_login_activity 
                WHERE student_id = ? 
                AND login_time > DATE_SUB(?, INTERVAL 30 MINUTE)
                AND device_fingerprint != ?
            ");
            
            $stmt2->bind_param("sss", $studentId, $loginTime, $deviceFingerprint);
            $stmt2->execute();
            $result2 = $stmt2->get_result()->fetch_assoc();
            
            // Suspicious if more than 1 different device in 30 minutes
            $deviceSuspicious = $result2['device_count'] > 1;
        }
        
        // More realistic threshold: suspicious if more than 5 different IPs in 1 hour
        // OR if multiple devices detected in 30 minutes
        $ipSuspicious = $result['ip_count'] > 5;
        
        return $ipSuspicious || $deviceSuspicious;
    }

    // Detect concurrent session cheating
    private function detectConcurrentSessionCheating($studentId, $classId, $ipAddress) {
        // Check if same student is already in this class from different IP
        $stmt = $this->authConn->prepare("
            SELECT COUNT(*) as concurrent_count 
            FROM concurrent_sessions 
            WHERE student_id = ? 
            AND class_id = ? 
            AND ip_address != ? 
            AND is_active = 1
        ");
        
        $stmt->bind_param("sss", $studentId, $classId, $ipAddress);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        
        return $result['concurrent_count'] > 0;
    }

    // Generate device fingerprint
    private function generateDeviceFingerprint($userAgent, $ipAddress) {
        return hash('sha256', $userAgent . $ipAddress . time());
    }

    // Get location data from IP (simplified)
    private function getLocationData($ipAddress) {
        // In production, you would use a geolocation service
        return json_encode([
            'ip' => $ipAddress,
            'country' => 'Sri Lanka',
            'city' => 'Colombo',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }

    // Get student monitoring data
    public function getStudentMonitoringData($studentId, $limit = 50) {
        $stmt = $this->authConn->prepare("
            SELECT 
                sla.*,
                cs.class_id,
                cs.session_id as concurrent_session_id,
                cs.is_suspicious as concurrent_suspicious
            FROM student_login_activity sla
            LEFT JOIN concurrent_sessions cs ON sla.session_id = cs.session_id
            WHERE sla.student_id = ?
            ORDER BY sla.login_time DESC
            LIMIT ?
        ");
        
        $stmt->bind_param("si", $studentId, $limit);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        
        return $data;
    }

    // Get all suspicious activities (last 24 hours only)
    public function getSuspiciousActivities($limit = 100) {
        $stmt = $this->authConn->prepare("
            SELECT 
                sla.*,
                s.firstName,
                s.lastName,
                s.userid as student_id
            FROM student_login_activity sla
            JOIN students s ON sla.student_id = s.userid
            WHERE sla.login_time > DATE_SUB(NOW(), INTERVAL 24 HOUR)
            ORDER BY sla.login_time DESC
            LIMIT ?
        ");
        
        $stmt->bind_param("i", $limit);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        
        return $data;
    }

    // Get concurrent session violations (last 24 hours only)
    public function getConcurrentSessionViolations($limit = 100) {
        $stmt = $this->authConn->prepare("
            SELECT 
                cs.*,
                s.firstName,
                s.lastName,
                s.userid as student_id
            FROM concurrent_sessions cs
            JOIN students s ON cs.student_id = s.userid
            WHERE cs.is_suspicious = 1 AND cs.session_start_time > DATE_SUB(NOW(), INTERVAL 24 HOUR)
            ORDER BY cs.session_start_time DESC
            LIMIT ?
        ");
        
        $stmt->bind_param("i", $limit);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        
        return $data;
    }

    // Block student for suspicious activity
    public function blockStudent($studentId, $reason, $blockedBy, $blockDuration = 24) {
        try {
            // First, ensure the student exists in the auth database students table
            $this->ensureStudentExistsInAuthDB($studentId);
            
            // Insert block record
            $stmt = $this->authConn->prepare("
                INSERT INTO student_blocks (
                    student_id, reason, blocked_by, block_start_time, 
                    block_end_time, is_active
                ) VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? HOUR), 1)
            ");
            
            $stmt->bind_param("sssi", $studentId, $reason, $blockedBy, $blockDuration);
            $result = $stmt->execute();
            
            if ($result) {
                // Invalidate all active sessions for this student
                $stmt2 = $this->authConn->prepare("
                    UPDATE concurrent_sessions 
                    SET is_active = 0, session_end_time = NOW() 
                    WHERE student_id = ? AND is_active = 1
                ");
                
                $stmt2->bind_param("s", $studentId);
                $stmt2->execute();
                
                // Invalidate all refresh tokens for this student
                $stmt3 = $this->authConn->prepare("
                    DELETE FROM refresh_tokens 
                    WHERE userid = ?
                ");
                
                $stmt3->bind_param("s", $studentId);
                $stmt3->execute();
            }
            
            return $result;
            
        } catch (Exception $e) {
            error_log("Error blocking student: " . $e->getMessage());
            return false;
        }
    }

    // Ensure student exists in auth database
    private function ensureStudentExistsInAuthDB($studentId) {
        // Check if student exists in auth database students table
        $stmt = $this->authConn->prepare("
            SELECT userid FROM students WHERE userid = ?
        ");
        
        $stmt->bind_param("s", $studentId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            // Student doesn't exist in auth database, create a basic record
            $stmt2 = $this->authConn->prepare("
                INSERT INTO students (userid, firstName, lastName, mobile) 
                VALUES (?, ?, ?, ?)
            ");
            
            $firstName = "Student";
            $lastName = $studentId;
            $mobile = "N/A";
            
            $stmt2->bind_param("ssss", $studentId, $firstName, $lastName, $mobile);
            $stmt2->execute();
        }
    }

    // Unblock student
    public function unblockStudent($studentId) {
        $stmt = $this->authConn->prepare("
            UPDATE student_blocks 
            SET is_active = 0, block_end_time = NOW() 
            WHERE student_id = ? AND is_active = 1
        ");
        
        $stmt->bind_param("s", $studentId);
        return $stmt->execute();
    }

    // Check if student is blocked
    public function isStudentBlocked($studentId) {
        $stmt = $this->authConn->prepare("
            SELECT * FROM student_blocks 
            WHERE student_id = ? AND is_active = 1 
            AND block_end_time > NOW()
        ");
        
        $stmt->bind_param("s", $studentId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        return $result->num_rows > 0;
    }

    // Check if session is valid (student not blocked)
    public function isSessionValid($studentId) {
        return !$this->isStudentBlocked($studentId);
    }

    // Get student block history
    public function getStudentBlockHistory($studentId) {
        $stmt = $this->authConn->prepare("
            SELECT * FROM student_blocks 
            WHERE student_id = ? 
            ORDER BY block_start_time DESC
        ");
        
        $stmt->bind_param("s", $studentId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        
        return $data;
    }

    // Get monitoring statistics
    public function getMonitoringStatistics() {
        $stats = [];
        
        // Total suspicious activities (last 24 hours only)
        $stmt = $this->authConn->prepare("
            SELECT COUNT(*) as count FROM student_login_activity 
            WHERE is_suspicious = 1 AND login_time > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ");
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        $stats['total_suspicious'] = $result['count'];
        
        // Total concurrent violations (last 24 hours only)
        $stmt = $this->authConn->prepare("
            SELECT COUNT(*) as count FROM concurrent_sessions 
            WHERE is_suspicious = 1 AND session_start_time > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ");
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        $stats['total_concurrent_violations'] = $result['count'];
        
        // Currently blocked students
        $stmt = $this->authConn->prepare("
            SELECT COUNT(*) as count FROM student_blocks 
            WHERE is_active = 1 AND block_end_time > NOW()
        ");
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        $stats['currently_blocked'] = $result['count'];
        
        // Today's login activities
        $stmt = $this->authConn->prepare("
            SELECT COUNT(*) as count FROM student_login_activity 
            WHERE DATE(login_time) = CURDATE()
        ");
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        $stats['today_logins'] = $result['count'];
        
        return $stats;
    }

    // Get concurrent logins for a student
    public function getConcurrentLogins($studentId) {
        $stmt = $this->authConn->prepare("
            SELECT sla.*, s.firstName, s.lastName
            FROM student_login_activity sla
            JOIN students s ON sla.student_id = s.userid
            WHERE sla.student_id = ?
            AND sla.login_time > DATE_SUB(NOW(), INTERVAL 1 HOUR)
            ORDER BY sla.login_time DESC
        ");
        
        $stmt->bind_param("s", $studentId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        
        return $data;
    }

    // Get student devices
    public function getStudentDevices($studentId) {
        $stmt = $this->authConn->prepare("
            SELECT 
                sla.ip_address,
                sla.user_agent,
                sla.device_fingerprint,
                sla.login_time,
                sla.session_id,
                (SELECT COUNT(*) FROM student_login_activity WHERE student_id = ? AND device_fingerprint = sla.device_fingerprint) as login_count
            FROM student_login_activity sla
            WHERE sla.student_id = ?
            AND sla.login_time = (
                SELECT MAX(login_time) 
                FROM student_login_activity 
                WHERE student_id = ? AND device_fingerprint = sla.device_fingerprint
            )
            ORDER BY sla.login_time DESC
        ");
        
        $stmt->bind_param("sss", $studentId, $studentId, $studentId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        
        return $data;
    }

    // Detect multiple device login
    public function detectMultipleDeviceLogin($studentId, $deviceFingerprint) {
        // Check for different device fingerprints in the last hour
        $stmt = $this->authConn->prepare("
            SELECT COUNT(DISTINCT device_fingerprint) as device_count
            FROM student_login_activity
            WHERE student_id = ?
            AND login_time > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ");
        
        $stmt->bind_param("s", $studentId);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        
        $deviceCount = $result['device_count'];
        $multipleDevices = $deviceCount > 1;
        
        // Get device details
        $stmt = $this->authConn->prepare("
            SELECT 
                ip_address,
                user_agent,
                device_fingerprint,
                login_time
            FROM student_login_activity
            WHERE student_id = ?
            AND login_time > DATE_SUB(NOW(), INTERVAL 1 HOUR)
            ORDER BY login_time DESC
        ");
        
        $stmt->bind_param("s", $studentId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $devices = [];
        while ($row = $result->fetch_assoc()) {
            $devices[] = $row;
        }
        
        return [
            'multiple_devices' => $multipleDevices,
            'device_count' => $deviceCount,
            'devices' => $devices
        ];
    }

    // Detect cheating
    public function detectCheating($studentId, $classId, $sessionId) {
        // Check for multiple devices in the same class session
        $stmt = $this->authConn->prepare("
            SELECT COUNT(DISTINCT device_fingerprint) as device_count
            FROM student_login_activity
            WHERE student_id = ?
            AND session_id = ?
            AND login_time > DATE_SUB(NOW(), INTERVAL 2 HOUR)
        ");
        
        $stmt->bind_param("ss", $studentId, $sessionId);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        
        $deviceCount = $result['device_count'];
        $cheatingDetected = $deviceCount > 1;
        
        // Get detailed activity for this session
        $stmt = $this->authConn->prepare("
            SELECT 
                ip_address,
                user_agent,
                device_fingerprint,
                login_time,
                session_id
            FROM student_login_activity
            WHERE student_id = ?
            AND session_id = ?
            AND login_time > DATE_SUB(NOW(), INTERVAL 2 HOUR)
            ORDER BY login_time DESC
        ");
        
        $stmt->bind_param("ss", $studentId, $sessionId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $activities = [];
        while ($row = $result->fetch_assoc()) {
            $activities[] = $row;
        }
        
        return [
            'cheating_detected' => $cheatingDetected,
            'device_count' => $deviceCount,
            'class_id' => $classId,
            'session_id' => $sessionId,
            'activities' => $activities,
            'risk_level' => $cheatingDetected ? 'HIGH' : 'LOW'
        ];
    }

    // Check for concurrent logins
    public function checkConcurrentLogins($studentId) {
        // Check for multiple active sessions in the last 30 minutes
        $stmt = $this->authConn->prepare("
            SELECT COUNT(DISTINCT session_id) as session_count
            FROM student_login_activity
            WHERE student_id = ?
            AND login_time > DATE_SUB(NOW(), INTERVAL 30 MINUTE)
        ");
        
        $stmt->bind_param("s", $studentId);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        
        $sessionCount = $result['session_count'];
        $concurrentLogins = $sessionCount > 1;
        
        // Get active sessions
        $stmt = $this->authConn->prepare("
            SELECT 
                session_id,
                ip_address,
                user_agent,
                device_fingerprint,
                login_time
            FROM student_login_activity
            WHERE student_id = ?
            AND login_time > DATE_SUB(NOW(), INTERVAL 30 MINUTE)
            ORDER BY login_time DESC
        ");
        
        $stmt->bind_param("s", $studentId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $sessions = [];
        while ($row = $result->fetch_assoc()) {
            $sessions[] = $row;
        }
        
        return [
            'concurrent_logins' => $concurrentLogins,
            'session_count' => $sessionCount,
            'sessions' => $sessions,
            'violation' => $concurrentLogins
        ];
    }
}
?>

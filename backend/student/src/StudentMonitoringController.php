<?php
require_once __DIR__ . '/StudentMonitoringModel.php';

class StudentMonitoringController {
    private $model;

    public function __construct($db) {
        $this->model = new StudentMonitoringModel($db);
    }

    // Track student login
    public function trackStudentLogin($studentId, $sessionId) {
        // Check if student is blocked before tracking
        if ($this->model->isStudentBlocked($studentId)) {
            return [
                'success' => false,
                'message' => 'Cannot track login activity for blocked student'
            ];
        }

        $ipAddress = $this->getClientIP();
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $loginTime = date('Y-m-d H:i:s');

        $result = $this->model->trackLoginActivity($studentId, $ipAddress, $userAgent, $sessionId, $loginTime);
        
        if ($result) {
            return [
                'success' => true,
                'message' => 'Login activity tracked successfully',
                'data' => [
                    'ip_address' => $ipAddress,
                    'login_time' => $loginTime,
                    'session_id' => $sessionId
                ]
            ];
        } else {
            return [
                'success' => false,
                'message' => 'Failed to track login activity'
            ];
        }
    }

    // Track concurrent session
    public function trackConcurrentSession($studentId, $sessionId, $classId) {
        $ipAddress = $this->getClientIP();
        $deviceInfo = json_encode([
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'screen_resolution' => $_POST['screen_resolution'] ?? '',
            'timezone' => $_POST['timezone'] ?? '',
            'language' => $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? ''
        ]);

        $result = $this->model->trackConcurrentSession($studentId, $sessionId, $classId, $ipAddress, $deviceInfo);
        
        if ($result) {
            return [
                'success' => true,
                'message' => 'Concurrent session tracked successfully',
                'data' => [
                    'session_id' => $sessionId,
                    'class_id' => $classId,
                    'ip_address' => $ipAddress
                ]
            ];
        } else {
            return [
                'success' => false,
                'message' => 'Failed to track concurrent session'
            ];
        }
    }

    // End concurrent session
    public function endConcurrentSession($sessionId) {
        $result = $this->model->endConcurrentSession($sessionId);
        
        if ($result) {
            return [
                'success' => true,
                'message' => 'Session ended successfully'
            ];
        } else {
            return [
                'success' => false,
                'message' => 'Failed to end session'
            ];
        }
    }

    // Get student monitoring data
    public function getStudentMonitoringData($studentId, $limit = 50) {
        $data = $this->model->getStudentMonitoringData($studentId, $limit);
        
        return [
            'success' => true,
            'data' => $data,
            'count' => count($data)
        ];
    }

    // Get suspicious activities
    public function getSuspiciousActivities($limit = 100) {
        $data = $this->model->getSuspiciousActivities($limit);
        
        return [
            'success' => true,
            'data' => $data,
            'count' => count($data)
        ];
    }

    // Get concurrent session violations
    public function getConcurrentSessionViolations($limit = 100) {
        $data = $this->model->getConcurrentSessionViolations($limit);
        
        return [
            'success' => true,
            'data' => $data,
            'count' => count($data)
        ];
    }

    // Block student
    public function blockStudent($studentId, $reason, $blockedBy, $blockDuration = 24) {
        $result = $this->model->blockStudent($studentId, $reason, $blockedBy, $blockDuration);
        
        if ($result) {
            return [
                'success' => true,
                'message' => 'Student blocked successfully',
                'data' => [
                    'student_id' => $studentId,
                    'reason' => $reason,
                    'block_duration' => $blockDuration,
                    'blocked_by' => $blockedBy
                ]
            ];
        } else {
            return [
                'success' => false,
                'message' => 'Failed to block student'
            ];
        }
    }

    // Unblock student
    public function unblockStudent($studentId) {
        $result = $this->model->unblockStudent($studentId);
        
        if ($result) {
            return [
                'success' => true,
                'message' => 'Student unblocked successfully'
            ];
        } else {
            return [
                'success' => false,
                'message' => 'Failed to unblock student'
            ];
        }
    }

    // Check if student is blocked
    public function isStudentBlocked($studentId) {
        $isBlocked = $this->model->isStudentBlocked($studentId);
        
        return [
            'success' => true,
            'is_blocked' => $isBlocked
        ];
    }

    // Get student block history
    public function getStudentBlockHistory($studentId) {
        $data = $this->model->getStudentBlockHistory($studentId);
        
        return [
            'success' => true,
            'data' => $data,
            'count' => count($data)
        ];
    }

    // Get monitoring statistics
    public function getMonitoringStatistics() {
        $stats = $this->model->getMonitoringStatistics();
        
        return [
            'success' => true,
            'data' => $stats
        ];
    }

    // Detect cheating in real-time
    public function detectCheating($studentId, $classId, $sessionId) {
        $ipAddress = $this->getClientIP();
        
        // Check for concurrent sessions
        $concurrentViolations = $this->model->getConcurrentSessionViolations(100);
        $studentViolations = array_filter($concurrentViolations, function($violation) use ($studentId, $classId) {
            return $violation['student_id'] === $studentId && $violation['class_id'] == $classId;
        });

        if (!empty($studentViolations)) {
            // Create cheating incident record
            $incidentData = [
                'student_id' => $studentId,
                'incident_type' => 'concurrent_session',
                'description' => 'Multiple devices detected for same class session',
                'evidence_data' => json_encode([
                    'current_ip' => $ipAddress,
                    'session_id' => $sessionId,
                    'class_id' => $classId,
                    'violations' => $studentViolations
                ]),
                'detected_at' => date('Y-m-d H:i:s'),
                'status' => 'pending'
            ];

            return [
                'success' => true,
                'cheating_detected' => true,
                'incident_data' => $incidentData,
                'message' => 'Potential cheating detected: Multiple devices accessing same class'
            ];
        }

        return [
            'success' => true,
            'cheating_detected' => false,
            'message' => 'No cheating detected'
        ];
    }

    // Get client IP address
        private function getClientIP() {
        $ipKeys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
        
        foreach ($ipKeys as $key) {
            if (array_key_exists($key, $_SERVER) === true) {
                foreach (explode(',', $_SERVER[$key]) as $ip) {
                    $ip = trim($ip);
                    // Return any valid IP address, including Docker internal IPs
                    if (filter_var($ip, FILTER_VALIDATE_IP) !== false) {
                        return $ip;
                    }
                }
            }
        }
        
        // If no IP found, return a placeholder
        return 'Unknown IP';
    }

    // Get detailed monitoring report
    public function getDetailedMonitoringReport($studentId = null, $dateFrom = null, $dateTo = null) {
        $report = [];
        
        if ($studentId) {
            // Individual student report
            $report['student_data'] = $this->model->getStudentMonitoringData($studentId, 100);
            $report['block_history'] = $this->model->getStudentBlockHistory($studentId);
            $report['is_blocked'] = $this->model->isStudentBlocked($studentId);
        } else {
            // System-wide report
            $report['suspicious_activities'] = $this->model->getSuspiciousActivities(100);
            $report['concurrent_violations'] = $this->model->getConcurrentSessionViolations(100);
            $report['statistics'] = $this->model->getMonitoringStatistics();
        }
        
        return [
            'success' => true,
            'data' => $report,
            'generated_at' => date('Y-m-d H:i:s')
        ];
    }

    // Check for concurrent logins
    public function checkConcurrentLogins($studentId) {
        $concurrentLogins = $this->model->getConcurrentLogins($studentId);
        
        return [
            'success' => true,
            'data' => $concurrentLogins,
            'count' => count($concurrentLogins),
            'has_concurrent' => count($concurrentLogins) > 1
        ];
    }

    // Get student devices
    public function getStudentDevices($studentId) {
        $devices = $this->model->getStudentDevices($studentId);
        
        return [
            'success' => true,
            'data' => $devices,
            'count' => count($devices)
        ];
    }

    // Detect multiple device login
    public function detectMultipleDeviceLogin($studentId, $deviceFingerprint) {
        $result = $this->model->detectMultipleDeviceLogin($studentId, $deviceFingerprint);
        
        return [
            'success' => true,
            'data' => $result,
            'multiple_devices' => $result['multiple_devices'] ?? false,
            'device_count' => $result['device_count'] ?? 0
        ];
    }

    // Check if session is valid (student not blocked)
    public function isSessionValid($studentId) {
        $isValid = $this->model->isSessionValid($studentId);
        
        return [
            'success' => true,
            'session_valid' => $isValid,
            'is_blocked' => !$isValid
        ];
    }
}
?>

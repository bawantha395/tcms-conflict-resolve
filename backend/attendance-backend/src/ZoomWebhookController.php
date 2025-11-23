<?php

class ZoomWebhookController {
    private $mysqli;
    private $classConn;
    private $authConn;
    private $webhookSecret;

    public function __construct($mysqli, $classConn, $authConn) {
        $this->mysqli = $mysqli;
        $this->classConn = $classConn;
        $this->authConn = $authConn;
        
        // Get webhook secret from settings table
        $this->webhookSecret = $this->getWebhookSecret();
    }

    /**
     * Get webhook secret from database settings
     */
    private function getWebhookSecret() {
        try {
            $stmt = $this->mysqli->prepare("SELECT setting_value FROM attendance_settings WHERE setting_key = 'webhook_secret'");
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            
            return $row['setting_value'] ?? getenv('ZOOM_WEBHOOK_SECRET') ?? '';
        } catch (Exception $e) {
            error_log('Error getting webhook secret: ' . $e->getMessage());
            return getenv('ZOOM_WEBHOOK_SECRET') ?? '';
        }
    }

    /**
     * Verify Zoom webhook signature
     */
    private function verifyWebhookSignature($rawPayload) {
        if (empty($this->webhookSecret)) {
            error_log('Webhook secret not configured - skipping signature verification');
            return true; // Allow through if no secret configured for development
        }

        $headers = getallheaders();
        $signature = $headers['X-Zoom-Signature'] ?? $headers['x-zoom-signature'] ?? '';
        $timestamp = $headers['X-Zoom-Signature-Timestamp'] ?? $headers['x-zoom-signature-timestamp'] ?? '';

        if (empty($signature) || empty($timestamp)) {
            error_log('Missing Zoom signature headers');
            return false;
        }

        // Check timestamp (should be within 5 minutes)
        $currentTime = time();
        if (abs($currentTime - intval($timestamp)) > 300) {
            error_log('Webhook timestamp too old: ' . $timestamp);
            return false;
        }

        // Calculate expected signature
        $message = 'v0:' . $timestamp . ':' . $rawPayload;
        $expectedSignature = 'v0=' . hash_hmac('sha256', $message, $this->webhookSecret);

        // Compare signatures
        if (!hash_equals($expectedSignature, $signature)) {
            error_log('Webhook signature verification failed');
            return false;
        }

        return true;
    }

    /**
     * Handle Zoom webhook events with signature verification
     */
    public function handleWebhook($data, $rawPayload = null) {
        // Verify webhook signature if raw payload is provided
        if ($rawPayload !== null && !$this->verifyWebhookSignature($rawPayload)) {
            return [
                'success' => false,
                'message' => 'Webhook signature verification failed',
                'code' => 'INVALID_SIGNATURE'
            ];
        }
        try {
            $event = $data['event'] ?? '';
            $payload = $data['payload'] ?? [];
            
            switch ($event) {
                case 'meeting.started':
                    return $this->handleMeetingStarted($payload);
                case 'meeting.ended':
                    return $this->handleMeetingEnded($payload);
                case 'meeting.participant_joined':
                    return $this->handleParticipantJoined($payload);
                case 'meeting.participant_left':
                    return $this->handleParticipantLeft($payload);
                default:
                    return [
                        'success' => false,
                        'message' => 'Unsupported event type: ' . $event
                    ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error handling webhook: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Handle meeting started event
     */
    private function handleMeetingStarted($payload) {
        try {
            $meetingId = $payload['object']['id'] ?? '';
            $startTime = $payload['object']['start_time'] ?? date('Y-m-d H:i:s');
            $topic = $payload['object']['topic'] ?? '';
            
            // Extract class ID from meeting topic (assuming format: "Class ID: 123 - Topic")
            $classId = $this->extractClassIdFromTopic($topic);
            
            if (!$classId) {
                return [
                    'success' => false,
                    'message' => 'Could not extract class ID from meeting topic'
                ];
            }
            
            // Log meeting start
            $query = "INSERT INTO zoom_meetings (meeting_id, class_id, topic, start_time, status) 
                     VALUES (?, ?, ?, ?, 'started') 
                     ON DUPLICATE KEY UPDATE start_time = VALUES(start_time), status = 'started'";
            
            $stmt = $this->mysqli->prepare($query);
            $stmt->bind_param("siss", $meetingId, $classId, $topic, $startTime);
            $stmt->execute();
            
            return [
                'success' => true,
                'message' => 'Meeting started logged successfully',
                'meeting_id' => $meetingId,
                'class_id' => $classId
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error handling meeting started: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Handle meeting ended event
     */
    private function handleMeetingEnded($payload) {
        try {
            $meetingId = $payload['object']['id'] ?? '';
            $endTime = $payload['object']['end_time'] ?? date('Y-m-d H:i:s');
            
            // Update meeting status
            $query = "UPDATE zoom_meetings SET end_time = ?, status = 'ended' WHERE meeting_id = ?";
            $stmt = $this->mysqli->prepare($query);
            $stmt->bind_param("ss", $endTime, $meetingId);
            $stmt->execute();
            
            // Calculate attendance for all participants
            $this->calculateMeetingAttendance($meetingId);
            
            return [
                'success' => true,
                'message' => 'Meeting ended logged successfully',
                'meeting_id' => $meetingId
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error handling meeting ended: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Handle participant joined event
     */
    private function handleParticipantJoined($payload) {
        try {
            $meetingId = $payload['object']['id'] ?? '';
            $participant = $payload['object']['participant'] ?? [];
            $joinTime = $payload['object']['join_time'] ?? date('Y-m-d H:i:s');
            
            $userId = $participant['user_id'] ?? '';
            $userName = $participant['user_name'] ?? '';
            $email = $participant['email'] ?? '';
            
            // Find student by participant info
            $studentId = $this->findStudentByParticipantInfo($userId, $email, $userName);
            
            if (!$studentId) {
                // Log for debugging but don't fail completely
                $this->logAttendanceEvent('WARNING', 'Could not identify student', [
                    'meeting_id' => $meetingId,
                    'user_id' => $userId,
                    'user_name' => $userName,
                    'email' => $email
                ]);
                return [
                    'success' => false,
                    'message' => 'Could not identify student for participant: ' . $userName
                ];
            }
            
            // Get class ID from meeting
            $classId = $this->getClassIdFromMeeting($meetingId);
            
            if (!$classId) {
                return [
                    'success' => false,
                    'message' => 'Could not find class for meeting: ' . $meetingId
                ];
            }
            
            // Determine attendance status based on join time
            $attendanceStatus = $this->calculateAttendanceStatus($classId, $joinTime);
            
            // Record participant join with real-time status calculation
            $query = "INSERT INTO attendance_records 
                     (class_id, student_id, student_name, meeting_id, source, attendance_status, join_time) 
                     VALUES (?, ?, ?, ?, 'zoom_webhook', ?, ?) 
                     ON DUPLICATE KEY UPDATE 
                     join_time = CASE WHEN join_time IS NULL OR VALUES(join_time) < join_time 
                                     THEN VALUES(join_time) ELSE join_time END,
                     attendance_status = CASE WHEN VALUES(attendance_status) = 'present' 
                                             THEN 'present' ELSE attendance_status END";
            
            $stmt = $this->mysqli->prepare($query);
            $stmt->bind_param("isssss", $classId, $studentId, $userName, $meetingId, $attendanceStatus, $joinTime);
            $stmt->execute();
            
            // Update real-time attendance summary
            $this->updateRealTimeAttendanceSummary($classId, date('Y-m-d', strtotime($joinTime)));
            
            // Log successful attendance recording
            $this->logAttendanceEvent('INFO', 'Real-time attendance recorded', [
                'class_id' => $classId,
                'student_id' => $studentId,
                'meeting_id' => $meetingId,
                'status' => $attendanceStatus,
                'join_time' => $joinTime
            ]);
            
            return [
                'success' => true,
                'message' => 'Participant join recorded successfully',
                'student_id' => $studentId,
                'meeting_id' => $meetingId,
                'attendance_status' => $attendanceStatus
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error handling participant joined: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Handle participant left event
     */
    private function handleParticipantLeft($payload) {
        try {
            $meetingId = $payload['object']['id'] ?? '';
            $participant = $payload['object']['participant'] ?? [];
            $leaveTime = $payload['object']['leave_time'] ?? date('Y-m-d H:i:s');
            
            $userId = $participant['user_id'] ?? '';
            $userName = $participant['user_name'] ?? '';
            $email = $participant['email'] ?? '';
            
            // Find student by participant info
            $studentId = $this->findStudentByParticipantInfo($userId, $email, $userName);
            
            if (!$studentId) {
                return [
                    'success' => false,
                    'message' => 'Could not identify student for participant: ' . $userName
                ];
            }
            
            // Update attendance record with leave time and calculate duration
            $query = "UPDATE attendance_records 
                     SET leave_time = ?, duration_minutes = TIMESTAMPDIFF(MINUTE, join_time, ?) 
                     WHERE meeting_id = ? AND student_id = ? AND leave_time IS NULL";
            
            $stmt = $this->mysqli->prepare($query);
            $stmt->bind_param("ssss", $leaveTime, $leaveTime, $meetingId, $studentId);
            $stmt->execute();
            
            return [
                'success' => true,
                'message' => 'Participant leave recorded successfully',
                'student_id' => $studentId,
                'meeting_id' => $meetingId
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error handling participant left: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Extract class ID from meeting topic
     */
    private function extractClassIdFromTopic($topic) {
        // Look for patterns like "Class ID: 123" or "Class 123" in the topic
        if (preg_match('/class\s*id\s*:\s*(\d+)/i', $topic, $matches)) {
            return $matches[1];
        }
        
        if (preg_match('/class\s*(\d+)/i', $topic, $matches)) {
            return $matches[1];
        }
        
        return null;
    }

    /**
     * Find student by participant information
     */
    private function findStudentByParticipantInfo($userId, $email, $userName) {
        // Check if auth connection is available
        if (!$this->authConn) {
            // If no auth connection, try to extract student ID from username
            if ($userName && preg_match('/(S\d+)/i', $userName, $matches)) {
                return $matches[1]; // Return the student ID found in username
            }
            return $userId; // Return user ID as fallback
        }
        
        // Try to find student by user_id first
        if ($userId) {
            $query = "SELECT userid FROM users WHERE userid = ?";
            $stmt = $this->authConn->prepare($query);
            $stmt->bind_param("s", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($row = $result->fetch_assoc()) {
                return $row['userid'];
            }
        }
        
        // Try to find by email
        if ($email) {
            $query = "SELECT userid FROM users WHERE email = ?";
            $stmt = $this->authConn->prepare($query);
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($row = $result->fetch_assoc()) {
                return $row['userid'];
            }
        }
        
        // Try to find by user_name (assuming it might contain student ID)
        if ($userName) {
            // Look for student ID pattern in username
            if (preg_match('/(S\d+)/i', $userName, $matches)) {
                $studentId = $matches[1];
                
                $query = "SELECT userid FROM users WHERE userid = ?";
                $stmt = $this->authConn->prepare($query);
                $stmt->bind_param("s", $studentId);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($row = $result->fetch_assoc()) {
                    return $row['userid'];
                }
            }
        }
        
        return $userId; // Return user ID as fallback
    }

    /**
     * Get class ID from meeting
     */
    private function getClassIdFromMeeting($meetingId) {
        $query = "SELECT class_id FROM zoom_meetings WHERE meeting_id = ?";
        $stmt = $this->mysqli->prepare($query);
        $stmt->bind_param("s", $meetingId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($row = $result->fetch_assoc()) {
            return $row['class_id'];
        }
        
        return null;
    }

    /**
     * Calculate attendance for meeting participants
     */
    private function calculateMeetingAttendance($meetingId) {
        try {
            // Get meeting details
            $meetingQuery = "SELECT class_id, start_time, end_time FROM zoom_meetings WHERE meeting_id = ?";
            $stmt = $this->mysqli->prepare($meetingQuery);
            $stmt->bind_param("s", $meetingId);
            $stmt->execute();
            $meeting = $stmt->get_result()->fetch_assoc();
            
            if (!$meeting) {
                return;
            }
            
            $classId = $meeting['class_id'];
            $startTime = $meeting['start_time'];
            $endTime = $meeting['end_time'];
            
                        // Use configured thresholds for present/late/absent
                        $lateThreshold = (int)$this->getSettingValue('late_threshold_minutes', 15);
                        $absentThreshold = (int)$this->getSettingValue('absent_threshold_minutes', 30);

                        // First mark participants who joined within lateThreshold as present
                        $presentSql = "UPDATE attendance_records SET attendance_status = 'present' 
                                                     WHERE meeting_id = ? AND join_time <= DATE_ADD(?, INTERVAL {$lateThreshold} MINUTE)";
                        $stmt = $this->mysqli->prepare($presentSql);
                        $stmt->bind_param("ss", $meetingId, $startTime);
                        $stmt->execute();

                        // Mark those who joined after lateThreshold but within absentThreshold as late
                        $lateSql = "UPDATE attendance_records SET attendance_status = 'late' 
                                                WHERE meeting_id = ? AND join_time > DATE_ADD(?, INTERVAL {$lateThreshold} MINUTE) 
                                                    AND join_time <= DATE_ADD(?, INTERVAL {$absentThreshold} MINUTE)";
                        $stmt = $this->mysqli->prepare($lateSql);
                        $stmt->bind_param("sss", $meetingId, $startTime, $startTime);
                        $stmt->execute();

                        // Mark those who joined after absentThreshold as absent
                        $absentSql = "UPDATE attendance_records SET attendance_status = 'absent' 
                                                    WHERE meeting_id = ? AND join_time > DATE_ADD(?, INTERVAL {$absentThreshold} MINUTE)";
                        $stmt = $this->mysqli->prepare($absentSql);
                        $stmt->bind_param("ss", $meetingId, $startTime);
                        $stmt->execute();
            
        } catch (Exception $e) {
            error_log('Error calculating meeting attendance: ' . $e->getMessage());
        }
    }

    /**
     * Calculate attendance status based on join time
     */
    private function calculateAttendanceStatus($classId, $joinTime) {
        try {
            // Get thresholds from settings
            $lateThreshold = (int)$this->getSettingValue('late_threshold_minutes', 15);
            $absentThreshold = (int)$this->getSettingValue('absent_threshold_minutes', 30);

            // Get class start time (you'll need to implement this based on your class schedule)
            $classStartTime = $this->getClassStartTime($classId);

            if (!$classStartTime) {
                return 'present'; // Default if no class start time found
            }

            $joinTimestamp = strtotime($joinTime);
            $startTimestamp = strtotime($classStartTime);
            $minutesLate = ($joinTimestamp - $startTimestamp) / 60;

            if ($minutesLate <= 0) {
                return 'present';
            }

            // Interpret thresholds as: within lateThreshold -> present, between lateThreshold and absentThreshold -> late, after absentThreshold -> absent
            if ($minutesLate <= $lateThreshold) {
                return 'present';
            } elseif ($minutesLate <= $absentThreshold) {
                return 'late';
            } else {
                return 'absent';
            }
        } catch (Exception $e) {
            error_log('Error calculating attendance status: ' . $e->getMessage());
            return 'present'; // Default fallback
        }
    }

    /**
     * Get setting value from database
     */
    private function getSettingValue($key, $default = null) {
        try {
            $stmt = $this->mysqli->prepare("SELECT setting_value FROM attendance_settings WHERE setting_key = ?");
            $stmt->bind_param("s", $key);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            
            return $row ? $row['setting_value'] : $default;
        } catch (Exception $e) {
            return $default;
        }
    }

    /**
     * Get class start time from class backend
     */
    private function getClassStartTime($classId) {
        // If class connection is available, get the actual class schedule
        if ($this->classConn) {
            try {
                $stmt = $this->classConn->prepare("SELECT schedule_start_time FROM classes WHERE id = ?");
                $stmt->bind_param("i", $classId);
                $stmt->execute();
                $result = $stmt->get_result();
                $row = $result->fetch_assoc();
                
                if ($row) {
                    return date('Y-m-d') . ' ' . $row['schedule_start_time'];
                }
            } catch (Exception $e) {
                error_log('Error getting class start time: ' . $e->getMessage());
            }
        }
        
        // Fallback: use current date with a default time
        return date('Y-m-d H:i:s');
    }

    /**
     * Update real-time attendance summary
     */
    private function updateRealTimeAttendanceSummary($classId, $date) {
        try {
            // Count attendance by status for this class and date
            $query = "SELECT 
                        attendance_status,
                        COUNT(*) as count,
                        SUM(CASE WHEN source LIKE '%zoom%' THEN 1 ELSE 0 END) as zoom_count,
                        SUM(CASE WHEN source = 'barcode' THEN 1 ELSE 0 END) as barcode_count,
                        SUM(CASE WHEN source = 'recorded_video' THEN 1 ELSE 0 END) as recorded_count
                      FROM attendance_records 
                      WHERE class_id = ? AND DATE(join_time) = ?
                      GROUP BY attendance_status";
            
            $stmt = $this->mysqli->prepare($query);
            $stmt->bind_param("is", $classId, $date);
            $stmt->execute();
            $results = $stmt->get_result();
            
            $present = 0; $late = 0; $absent = 0;
            $zoomTotal = 0; $barcodeTotal = 0; $recordedTotal = 0;
            
            while ($row = $results->fetch_assoc()) {
                switch ($row['attendance_status']) {
                    case 'present':
                        $present = $row['count'];
                        break;
                    case 'late':
                        $late = $row['count'];
                        break;
                    case 'absent':
                        $absent = $row['count'];
                        break;
                }
                $zoomTotal += $row['zoom_count'];
                $barcodeTotal += $row['barcode_count'];
                $recordedTotal += $row['recorded_count'];
            }
            
            // Insert or update summary
            $summaryQuery = "INSERT INTO attendance_summary 
                           (class_id, date, total_students, present_count, late_count, absent_count, 
                            zoom_attendance, barcode_attendance, recorded_video_attendance)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                           ON DUPLICATE KEY UPDATE
                           total_students = VALUES(total_students),
                           present_count = VALUES(present_count),
                           late_count = VALUES(late_count),
                           absent_count = VALUES(absent_count),
                           zoom_attendance = VALUES(zoom_attendance),
                           barcode_attendance = VALUES(barcode_attendance),
                           recorded_video_attendance = VALUES(recorded_video_attendance)";
            
            $totalStudents = $present + $late + $absent;
            $stmt = $this->mysqli->prepare($summaryQuery);
            $stmt->bind_param("isiiiiiiii", $classId, $date, $totalStudents, $present, $late, $absent, 
                             $zoomTotal, $barcodeTotal, $recordedTotal);
            $stmt->execute();
            
        } catch (Exception $e) {
            error_log('Error updating real-time attendance summary: ' . $e->getMessage());
        }
    }

    /**
     * Log attendance events for debugging
     */
    private function logAttendanceEvent($level, $message, $context = []) {
        try {
            $stmt = $this->mysqli->prepare("INSERT INTO attendance_logs (log_level, message, context) VALUES (?, ?, ?)");
            $contextJson = json_encode($context);
            $stmt->bind_param("sss", $level, $message, $contextJson);
            $stmt->execute();
        } catch (Exception $e) {
            error_log('Error logging attendance event: ' . $e->getMessage());
        }
    }
}
?>

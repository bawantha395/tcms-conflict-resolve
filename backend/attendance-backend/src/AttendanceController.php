<?php

class AttendanceController {
    private $mysqli;
    private $classConn;
    private $authConn;

    public function __construct($mysqli, $classConn, $authConn) {
        $this->mysqli = $mysqli;
        $this->classConn = $classConn;
        $this->authConn = $authConn;
    }

    /**
     * Check if student has late pay permission for today
     * @param string $studentId
     * @param int $classId
     * @param string $date (optional, defaults to today)
     * @return bool
     */
    private function hasLatePayPermission($studentId, $classId, $date = null) {
        if (!$this->classConn) {
            return false;
        }

        $checkDate = $date ?? date('Y-m-d');

        $query = "SELECT id FROM late_pay_permissions 
                  WHERE student_id = ? AND class_id = ? AND permission_date = ?
                  LIMIT 1";
        
        $stmt = $this->classConn->prepare($query);
        if (!$stmt) {
            return false;
        }

        $stmt->bind_param('sis', $studentId, $classId, $checkDate);
        $stmt->execute();
        $result = $stmt->get_result();
        
        return $result->num_rows > 0;
    }

    /**
     * Get attendance for a specific class
     */
    public function getClassAttendance($classId) {
        try {
            $query = "SELECT * FROM attendance_records WHERE class_id = ? ORDER BY join_time DESC";
            $stmt = $this->mysqli->prepare($query);
            $stmt->bind_param("i", $classId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $attendance = [];
            while ($row = $result->fetch_assoc()) {
                $attendance[] = $row;
            }
            
            return [
                'success' => true,
                'data' => $attendance,
                'count' => count($attendance)
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error fetching class attendance: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get attendance for a specific student
     */
    public function getStudentAttendance($studentId) {
        try {
            $query = "SELECT * FROM attendance_records WHERE student_id = ? ORDER BY join_time DESC";
            $stmt = $this->mysqli->prepare($query);
            $stmt->bind_param("s", $studentId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $attendance = [];
            while ($row = $result->fetch_assoc()) {
                $attendance[] = $row;
            }
            
            return [
                'success' => true,
                'data' => $attendance,
                'count' => count($attendance)
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error fetching student attendance: ' . $e->getMessage()
            ];
        }
    }

    // --- API: Get student details and enrolled classes by barcode ID ---
    public function getStudentDetailsAndEnrollments($studentId) {
        $result = ["success" => false];
        try {
            $decoded = $studentId;

            // Try resolving barcode -> userid from auth DB barcodes table
            $resolvedUserId = null;
            $studentInfo = null;

            if ($this->authConn) {
                $qry = "SELECT userid, student_name, barcode_data FROM barcodes WHERE barcode_data = ? LIMIT 1";
                if ($stmt = $this->authConn->prepare($qry)) {
                    $stmt->bind_param('s', $decoded);
                    $stmt->execute();
                    $row = $stmt->get_result()->fetch_assoc();
                    if ($row) {
                        $resolvedUserId = $row['userid'];
                        // Try to fetch student profile from auth students table
                        $sQry = "SELECT userid, CONCAT(firstName, ' ', lastName) AS name, email, mobile AS phone FROM students WHERE userid = ? LIMIT 1";
                        if ($sStmt = $this->authConn->prepare($sQry)) {
                            $sStmt->bind_param('s', $resolvedUserId);
                            $sStmt->execute();
                            $studentInfo = $sStmt->get_result()->fetch_assoc();
                        }
                    }
                }
            }

            // Fallback: if not found via barcode/auth, try attendance DB student lookup by student_id
            if (!$studentInfo) {
                $aQry = "SELECT student_id AS userid, student_name AS name, NULL AS email, NULL AS phone FROM attendance_records WHERE student_id = ? LIMIT 1";
                if ($stmt = $this->mysqli->prepare($aQry)) {
                    $stmt->bind_param('s', $decoded);
                    $stmt->execute();
                    $studentInfo = $stmt->get_result()->fetch_assoc();
                    if ($studentInfo) {
                        $resolvedUserId = $studentInfo['userid'];
                    }
                }
            }

            if (!$studentInfo) {
                $result['message'] = 'Student not found';
                return $result;
            }

            // Find enrolled classes from class DB (enrollments table)
            $enrolledClasses = [];
            if ($this->classConn && $resolvedUserId) {
                $eQry = "SELECT c.id, c.class_name AS className, c.subject, c.teacher FROM enrollments e JOIN classes c ON e.class_id = c.id WHERE e.student_id = ?";
                if ($eStmt = $this->classConn->prepare($eQry)) {
                    $eStmt->bind_param('s', $resolvedUserId);
                    $eStmt->execute();
                    $enrolledClasses = $eStmt->get_result()->fetch_all(MYSQLI_ASSOC);
                }
            }

            $result['success'] = true;
            $result['student'] = $studentInfo;
            $result['enrolledClasses'] = $enrolledClasses;
            return $result;
        } catch (Exception $e) {
            $result['message'] = $e->getMessage();
            return $result;
        }
    }

    // --- API: Check if student is enrolled in a class ---
    public function isStudentEnrolledInClass($studentId, $classId) {
        try {
            $decoded = $studentId;
            $resolvedUserId = null;

            // If auth DB available, try to resolve barcode to userid
            if ($this->authConn) {
                $qry = "SELECT userid FROM barcodes WHERE barcode_data = ? LIMIT 1";
                if ($stmt = $this->authConn->prepare($qry)) {
                    $stmt->bind_param('s', $decoded);
                    $stmt->execute();
                    $row = $stmt->get_result()->fetch_assoc();
                    if ($row) $resolvedUserId = $row['userid'];
                }
            }

            // If not resolved, assume the passed value is the userid/student id
            if (!$resolvedUserId) {
                $resolvedUserId = $decoded;
            }

            // Check enrollments in class DB with enhanced payment logic
            if ($this->classConn) {
                // Get enrollment and class data
                $q = "SELECT e.payment_status, e.paid_amount, e.total_fee, e.next_payment_date, 
                             c.payment_tracking, c.payment_tracking_free_days
                      FROM enrollments e
                      JOIN classes c ON e.class_id = c.id
                      WHERE e.student_id = ? AND e.class_id = ? LIMIT 1";
                if ($s = $this->classConn->prepare($q)) {
                    $s->bind_param('si', $resolvedUserId, $classId);
                    $s->execute();
                    $result = $s->get_result()->fetch_assoc();
                    
                    if (!$result) {
                        return ['success' => true, 'enrolled' => false, 'reason' => 'not_enrolled'];
                    }
                    
                    $paymentStatus = $result['payment_status'];
                    $paidAmount = floatval($result['paid_amount']);
                    $totalFee = floatval($result['total_fee']);
                    $nextPaymentDate = $result['next_payment_date'];
                    $paymentTracking = $result['payment_tracking'];
                    $freeDays = intval($result['payment_tracking_free_days'] ?? 7);
                    
                    // SPECIAL CASE 0: Late Pay Permission - Allow attendance for TODAY only
                    if ($paymentStatus === 'late_pay' || $this->hasLatePayPermission($resolvedUserId, $classId)) {
                        return [
                            'success' => true, 
                            'enrolled' => true,
                            'payment_status' => 'late_pay',
                            'reason' => 'late_pay_permission',
                            'message' => 'Late pay permission granted for today - Student can attend'
                        ];
                    }
                    
                    // SPECIAL CASE 1: Free Card (overdue) - Always allow access
                    if ($paymentStatus === 'overdue') {
                        return [
                            'success' => true, 
                            'enrolled' => true,
                            'payment_status' => 'overdue',
                            'reason' => 'free_card',
                            'message' => 'Free Card - No payment required'
                        ];
                    }
                    
                    // SPECIAL CASE 2: Half Card (partial) - Check if 50% is paid
                    if ($paymentStatus === 'partial') {
                        $halfFee = $totalFee / 2;
                        $hasPaidHalf = $paidAmount >= $halfFee;
                        return [
                            'success' => true, 
                            'enrolled' => $hasPaidHalf,
                            'payment_status' => 'partial',
                            'reason' => $hasPaidHalf ? 'half_card_paid' : 'half_payment_required',
                            'message' => $hasPaidHalf ? 'Half Card - 50% paid' : 'Half Card - 50% payment required',
                            'paid_amount' => $paidAmount,
                            'required_amount' => $halfFee
                        ];
                    }
                    
                    // STANDARD CASE: Check payment status with grace period
                    if ($paymentStatus === 'paid') {
                        // Check if within grace period
                        $today = new DateTime();
                        $nextPayment = $nextPaymentDate ? new DateTime($nextPaymentDate) : null;
                        
                        if ($nextPayment) {
                            // Parse payment tracking
                            $hasPaymentTracking = false;
                            if (is_string($paymentTracking)) {
                                $trackingData = json_decode($paymentTracking, true);
                                $hasPaymentTracking = isset($trackingData['enabled']) ? $trackingData['enabled'] : false;
                            } else if (is_array($paymentTracking)) {
                                $hasPaymentTracking = isset($paymentTracking['enabled']) ? $paymentTracking['enabled'] : false;
                            }
                            
                            // Calculate grace period end date
                            $gracePeriodEnd = clone $nextPayment;
                            if ($hasPaymentTracking) {
                                // Payment tracking enabled: add free days
                                $gracePeriodEnd->modify("+{$freeDays} days");
                            }
                            
                            // Check if within grace period
                            if ($today <= $gracePeriodEnd) {
                                return [
                                    'success' => true, 
                                    'enrolled' => true,
                                    'payment_status' => 'paid',
                                    'reason' => 'within_grace_period',
                                    'grace_period_end' => $gracePeriodEnd->format('Y-m-d'),
                                    'days_remaining' => $today->diff($gracePeriodEnd)->days
                                ];
                            } else {
                                // Grace period expired - Check for late pay permission
                                if ($this->hasLatePayPermission($resolvedUserId, $classId)) {
                                    return [
                                        'success' => true, 
                                        'enrolled' => true,
                                        'payment_status' => 'late_pay',
                                        'reason' => 'late_pay_permission',
                                        'message' => 'Late pay permission granted for today - Student can attend'
                                    ];
                                }
                                
                                // Grace period expired and no late pay permission
                                return [
                                    'success' => true, 
                                    'enrolled' => false,
                                    'payment_status' => 'paid',
                                    'reason' => 'grace_period_expired',
                                    'message' => 'Payment required - grace period expired'
                                ];
                            }
                        }
                        
                        // No next payment date, allow access
                        return [
                            'success' => true, 
                            'enrolled' => true,
                            'payment_status' => 'paid',
                            'reason' => 'paid_no_expiry'
                        ];
                    }
                    
                    // PENDING/OTHER: Check for late pay permission before blocking
                    if ($this->hasLatePayPermission($resolvedUserId, $classId)) {
                        return [
                            'success' => true, 
                            'enrolled' => true,
                            'payment_status' => 'late_pay',
                            'reason' => 'late_pay_permission',
                            'message' => 'Late pay permission granted for today - Student can attend'
                        ];
                    }
                    
                    // No payment and no permission: Block access
                    return [
                        'success' => true, 
                        'enrolled' => false,
                        'payment_status' => $paymentStatus,
                        'reason' => 'payment_required',
                        'message' => 'Payment required'
                    ];
                }
            }

            // Fallback: no class DB available, return not enrolled
            return ['success' => false, 'message' => 'Class DB not available'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    // --- Session persistence (simple blob storage) ---
    public function saveSession($sessionId, $data) {
        try {
            $json = json_encode($data);
            // ensure table exists
            $this->mysqli->query("CREATE TABLE IF NOT EXISTS ui_sessions (session_id VARCHAR(191) PRIMARY KEY, data JSON, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)");
            $q = "REPLACE INTO ui_sessions (session_id, data) VALUES (?, ?)";
            if ($stmt = $this->mysqli->prepare($q)) {
                $stmt->bind_param('ss', $sessionId, $json);
                $stmt->execute();
                return ['success' => true];
            }
            return ['success' => false, 'message' => 'DB prepare failed'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    public function loadSession($sessionId) {
        try {
            $q = "SELECT data FROM ui_sessions WHERE session_id = ? LIMIT 1";
            if ($stmt = $this->mysqli->prepare($q)) {
                $stmt->bind_param('s', $sessionId);
                $stmt->execute();
                $row = $stmt->get_result()->fetch_assoc();
                if ($row && isset($row['data'])) {
                    $decoded = json_decode($row['data'], true);
                    return ['success' => true, 'data' => $decoded];
                }
                return ['success' => true, 'data' => null];
            }
            return ['success' => false, 'message' => 'DB prepare failed'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    public function deleteSession($sessionId) {
        try {
            $q = "DELETE FROM ui_sessions WHERE session_id = ?";
            if ($stmt = $this->mysqli->prepare($q)) {
                $stmt->bind_param('s', $sessionId);
                $stmt->execute();
                return ['success' => true];
            }
            return ['success' => false, 'message' => 'DB prepare failed'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Get attendance analytics with filters
     */
    public function getAttendanceAnalytics($classId = null, $startDate = null, $endDate = null) {
        try {
            $whereConditions = [];
            $params = [];
            $types = "";

            if ($classId) {
                $whereConditions[] = "class_id = ?";
                $params[] = $classId;
                $types .= "i";
            }

            if ($startDate) {
                $whereConditions[] = "DATE(join_time) >= ?";
                $params[] = $startDate;
                $types .= "s";
            }

            if ($endDate) {
                $whereConditions[] = "DATE(join_time) <= ?";
                $params[] = $endDate;
                $types .= "s";
            }

            $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";

            // Get overall statistics
            $statsQuery = "SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN attendance_status = 'present' THEN 1 END) as present_count,
                COUNT(CASE WHEN attendance_status = 'late' THEN 1 END) as late_count,
                COUNT(CASE WHEN attendance_status = 'absent' THEN 1 END) as absent_count,
                COUNT(CASE WHEN source LIKE '%zoom%' THEN 1 END) as zoom_count,
                COUNT(CASE WHEN source = 'recorded_video' THEN 1 END) as recorded_video_count,
                COUNT(CASE WHEN source = 'barcode' THEN 1 END) as barcode_count
                FROM attendance_records $whereClause";

            $stmt = $this->mysqli->prepare($statsQuery);
            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }
            $stmt->execute();
            $stats = $stmt->get_result()->fetch_assoc();

            // Get student attendance details
            $detailsQuery = "SELECT * FROM attendance_records $whereClause ORDER BY join_time DESC LIMIT 100";
            $stmt = $this->mysqli->prepare($detailsQuery);
            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }
            $stmt->execute();
            $result = $stmt->get_result();
            
            $studentAttendance = [];
            while ($row = $result->fetch_assoc()) {
                $studentAttendance[] = $row;
            }

            return [
                'success' => true,
                'analytics' => [
                    'overall_stats' => $stats,
                    'student_attendance' => $studentAttendance
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error fetching analytics: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get monthly attendance pattern (one record per student per day)
     */
    public function getMonthlyAttendancePattern($classId, $year, $month) {
        try {
            // Get date range for the month
            $startDate = "$year-" . str_pad($month, 2, '0', STR_PAD_LEFT) . "-01";
            $endDate = date("Y-m-t", strtotime($startDate)); // Last day of month
            
            // Get attendance records for the month (one per student per day)
            $query = "SELECT 
                        student_id,
                        student_name,
                        DATE(join_time) as attendance_date,
                        attendance_status,
                        source,
                        join_time,
                        duration_minutes,
                        DAYOFWEEK(DATE(join_time)) as day_of_week,
                        WEEK(DATE(join_time)) - WEEK(DATE(DATE_SUB(DATE(join_time), INTERVAL DAYOFMONTH(DATE(join_time))-1 DAY))) + 1 AS week_of_month
                      FROM attendance_records 
                      WHERE class_id = ? 
                        AND DATE(join_time) BETWEEN ? AND ?
                      ORDER BY attendance_date ASC, student_id ASC";
            
            $stmt = $this->mysqli->prepare($query);
            $stmt->bind_param("iss", $classId, $startDate, $endDate);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $attendanceData = [];
            $studentSummary = [];
            $dailySummary = [];
            $weeklySummary = [];
            
            while ($row = $result->fetch_assoc()) {
                $attendanceData[] = $row;
                
                // Student summary
                $studentId = $row['student_id'];
                if (!isset($studentSummary[$studentId])) {
                    $studentSummary[$studentId] = [
                        'student_name' => $row['student_name'],
                        'total_days' => 0,
                        'present_days' => 0,
                        'late_days' => 0,
                        'absent_days' => 0,
                        'attendance_percentage' => 0
                    ];
                }
                
                $studentSummary[$studentId]['total_days']++;
                if ($row['attendance_status'] === 'present') {
                    $studentSummary[$studentId]['present_days']++;
                } elseif ($row['attendance_status'] === 'late') {
                    $studentSummary[$studentId]['late_days']++;
                } else {
                    $studentSummary[$studentId]['absent_days']++;
                }
                
                // Daily summary
                $date = $row['attendance_date'];
                if (!isset($dailySummary[$date])) {
                    $dailySummary[$date] = [
                        'date' => $date,
                        'day_of_week' => $row['day_of_week'],
                        'total_students' => 0,
                        'present' => 0,
                        'late' => 0,
                        'absent' => 0
                    ];
                }
                
                $dailySummary[$date]['total_students']++;
                $dailySummary[$date][$row['attendance_status']]++;
                
                // Weekly summary
                $weekNum = $row['week_of_month'];
                if (!isset($weeklySummary[$weekNum])) {
                    $weeklySummary[$weekNum] = [
                        'week' => $weekNum,
                        'days_with_classes' => 0,
                        'total_attendances' => 0,
                        'present' => 0,
                        'late' => 0,
                        'absent' => 0
                    ];
                }
                
                $weeklySummary[$weekNum]['total_attendances']++;
                $weeklySummary[$weekNum][$row['attendance_status']]++;
            }
            
            // Calculate attendance percentages
            foreach ($studentSummary as $studentId => &$summary) {
                if ($summary['total_days'] > 0) {
                    $summary['attendance_percentage'] = round(
                        (($summary['present_days'] + $summary['late_days']) / $summary['total_days']) * 100, 2
                    );
                }
            }
            
            // Count unique days with classes
            foreach ($weeklySummary as &$week) {
                $week['days_with_classes'] = count(array_filter($dailySummary, function($day) use ($week) {
                    $dayWeek = date('W', strtotime($day['date'])) - date('W', strtotime(date('Y-m-01', strtotime($day['date'])))) + 1;
                    return $dayWeek == $week['week'];
                }));
            }
            
            return [
                'success' => true,
                'month_year' => date('F Y', strtotime($startDate)),
                'date_range' => ['start' => $startDate, 'end' => $endDate],
                'summary' => [
                    'total_class_days' => count($dailySummary),
                    'total_student_attendances' => count($attendanceData),
                    'unique_students' => count($studentSummary)
                ],
                'daily_attendance' => array_values($dailySummary),
                'weekly_summary' => array_values($weeklySummary),
                'student_summary' => $studentSummary,
                'detailed_records' => $attendanceData
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error fetching monthly attendance: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Track join button clicks (separate from attendance records)
     */
    public function trackJoinButtonClick($classId, $studentId, $clickData = []) {
        try {
            $studentName = $clickData['studentName'] ?? '';
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? 'unknown';
            $sessionInfo = json_encode([
                'timestamp' => date('Y-m-d H:i:s'),
                'browser_info' => $userAgent,
                'additional_data' => $clickData
            ]);
            
            $query = "INSERT INTO join_button_clicks 
                     (class_id, student_id, student_name, click_time, user_agent, ip_address, session_info) 
                     VALUES (?, ?, ?, NOW(), ?, ?, ?)";
            
            $stmt = $this->mysqli->prepare($query);
            $stmt->bind_param("isssss", $classId, $studentId, $studentName, $userAgent, $ipAddress, $sessionInfo);
            $stmt->execute();
            
            return [
                'success' => true,
                'message' => 'Join button click tracked successfully',
                'click_id' => $this->mysqli->insert_id,
                'click_time' => date('Y-m-d H:i:s')
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error tracking join button click: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get join button click history for a student/class
     */
    public function getJoinButtonClicks($classId = null, $studentId = null, $startDate = null, $endDate = null) {
        try {
            $whereConditions = [];
            $params = [];
            $types = '';
            
            if ($classId) {
                $whereConditions[] = "class_id = ?";
                $params[] = $classId;
                $types .= 'i';
            }
            
            if ($studentId) {
                $whereConditions[] = "student_id = ?";
                $params[] = $studentId;
                $types .= 's';
            }
            
            if ($startDate) {
                $whereConditions[] = "DATE(click_time) >= ?";
                $params[] = $startDate;
                $types .= 's';
            }
            
            if ($endDate) {
                $whereConditions[] = "DATE(click_time) <= ?";
                $params[] = $endDate;
                $types .= 's';
            }
            
            $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
            
            // Get detailed clicks
            $query = "SELECT * FROM join_button_clicks $whereClause ORDER BY click_time DESC";
            $stmt = $this->mysqli->prepare($query);
            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }
            $stmt->execute();
            $result = $stmt->get_result();
            
            $clicks = [];
            while ($row = $result->fetch_assoc()) {
                $clicks[] = $row;
            }
            
            // Get summary statistics
            $summaryQuery = "SELECT 
                               COUNT(*) as total_clicks,
                               COUNT(DISTINCT student_id) as unique_students,
                               COUNT(DISTINCT DATE(click_time)) as days_with_clicks,
                               MIN(click_time) as first_click,
                               MAX(click_time) as latest_click
                             FROM join_button_clicks $whereClause";
            
            $summaryStmt = $this->mysqli->prepare($summaryQuery);
            if (!empty($params)) {
                $summaryStmt->bind_param($types, ...$params);
            }
            $summaryStmt->execute();
            $summary = $summaryStmt->get_result()->fetch_assoc();
            
            // Get per-student summary
            $studentSummaryQuery = "SELECT 
                                      student_id,
                                      student_name,
                                      COUNT(*) as click_count,
                                      COUNT(DISTINCT DATE(click_time)) as days_clicked,
                                      MIN(click_time) as first_click,
                                      MAX(click_time) as latest_click
                                    FROM join_button_clicks $whereClause
                                    GROUP BY student_id, student_name
                                    ORDER BY click_count DESC, latest_click DESC";
            
            $studentStmt = $this->mysqli->prepare($studentSummaryQuery);
            if (!empty($params)) {
                $studentStmt->bind_param($types, ...$params);
            }
            $studentStmt->execute();
            $studentResult = $studentStmt->get_result();
            
            $studentSummary = [];
            while ($row = $studentResult->fetch_assoc()) {
                $studentSummary[] = $row;
            }
            
            return [
                'success' => true,
                'summary' => $summary,
                'student_summary' => $studentSummary,
                'detailed_clicks' => $clicks,
                'filters_applied' => [
                    'class_id' => $classId,
                    'student_id' => $studentId,
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ]
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error fetching join button clicks: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get Zoom meeting sessions for a class
     */
    public function getZoomSessions($classId) {
        try {
            $query = "SELECT zm.*, 
                     (SELECT COUNT(*) FROM attendance_records ar WHERE ar.meeting_id = zm.meeting_id) as participant_count
                     FROM zoom_meetings zm 
                     WHERE zm.class_id = ? 
                     ORDER BY zm.start_time DESC";
            
            $stmt = $this->mysqli->prepare($query);
            $stmt->bind_param("i", $classId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $sessions = [];
            while ($row = $result->fetch_assoc()) {
                $sessions[] = $row;
            }
            
            return [
                'success' => true,
                'data' => $sessions
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error fetching Zoom sessions: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get meeting participants
     */
    public function getMeetingParticipants($meetingId) {
        try {
            $query = "SELECT * FROM attendance_records WHERE meeting_id = ? ORDER BY join_time";
            $stmt = $this->mysqli->prepare($query);
            $stmt->bind_param("s", $meetingId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $participants = [];
            while ($row = $result->fetch_assoc()) {
                $participants[] = $row;
            }
            
            return [
                'success' => true,
                'data' => $participants
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error fetching participants: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Mark manual attendance (with duplicate prevention)
     */
    public function markManualAttendance($classId, $studentId, $attendanceData) {
        try {
            $studentName = $attendanceData['studentName'] ?? '';
            // Prefer explicit source, fall back to method if provided
            $source = $attendanceData['source'] ?? ($attendanceData['method'] ?? 'manual');
            $status = $attendanceData['status'] ?? 'present';
            $joinTime = $attendanceData['join_time'] ?? date('Y-m-d H:i:s');
            $leaveTime = $attendanceData['leave_time'] ?? null;
            $duration = $attendanceData['duration_minutes'] ?? 0;

            // Normalize known source/method values to canonical source strings
            $normalized = strtolower((string)$source);
            if (in_array($normalized, ['image', 'photo', 'camera', 'image_upload'])) {
                $source = 'barcode';
            } elseif (in_array($normalized, ['barcode', 'scan', 'scanner', 'qrcode'])) {
                $source = 'barcode';
            } elseif (strpos($normalized, 'zoom') !== false || $normalized === 'zoom_webhook') {
                $source = 'zoom';
            } elseif (strpos($normalized, 'record') !== false || $normalized === 'recorded_video') {
                $source = 'recorded_video';
            } else {
                // keep the normalized string for storage
                $source = $normalized;
            }
            
            // Get the date part for duplicate checking
            $attendanceDate = date('Y-m-d', strtotime($joinTime));
            
            // Check if attendance already exists for this student on this date for this class
            $checkQuery = "SELECT id, attendance_status, join_time FROM attendance_records 
                          WHERE class_id = ? AND student_id = ? AND DATE(join_time) = ?
                          ORDER BY join_time DESC LIMIT 1";
            
            $checkStmt = $this->mysqli->prepare($checkQuery);
            $checkStmt->bind_param("iss", $classId, $studentId, $attendanceDate);
            $checkStmt->execute();
            $existingRecord = $checkStmt->get_result()->fetch_assoc();
            
                if ($existingRecord) {
                    // Reject duplicate attendance for this student/class/date
                    return [
                        'success' => false,
                        'message' => 'Attendance already marked for this student in this class today. Only one attendance allowed per day.',
                        'action' => 'duplicate',
                        'id' => $existingRecord['id'],
                        'existing_status' => $existingRecord['attendance_status'],
                        'existing_join_time' => $existingRecord['join_time']
                    ];
                } else {
                // Insert new record
                $query = "INSERT INTO attendance_records 
                         (class_id, student_id, student_name, source, attendance_status, join_time, leave_time, duration_minutes) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                
                $stmt = $this->mysqli->prepare($query);
                $stmt->bind_param("issssssi", $classId, $studentId, $studentName, $source, $status, $joinTime, $leaveTime, $duration);
                $stmt->execute();
                
                return [
                    'success' => true,
                    'message' => 'Attendance marked successfully',
                    'action' => 'created',
                    'id' => $this->mysqli->insert_id
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error marking attendance: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Update attendance status
     */
    public function updateAttendanceStatus($attendanceId, $data) {
        try {
            $query = "UPDATE attendance_records SET 
                     attendance_status = ?, 
                     join_time = ?, 
                     leave_time = ?, 
                     duration_minutes = ? 
                     WHERE id = ?";
            
            $stmt = $this->mysqli->prepare($query);
            $status = $data['attendance_status'] ?? 'present';
            $joinTime = $data['join_time'] ?? date('Y-m-d H:i:s');
            $leaveTime = $data['leave_time'] ?? null;
            $duration = $data['duration_minutes'] ?? 0;
            
            $stmt->bind_param("sssii", $status, $joinTime, $leaveTime, $duration, $attendanceId);
            $stmt->execute();
            
            return [
                'success' => true,
                'message' => 'Attendance updated successfully'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error updating attendance: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Delete attendance record
     */
    public function deleteAttendance($attendanceId) {
        try {
            $query = "DELETE FROM attendance_records WHERE id = ?";
            $stmt = $this->mysqli->prepare($query);
            $stmt->bind_param("i", $attendanceId);
            $stmt->execute();
            
            return [
                'success' => true,
                'message' => 'Attendance record deleted successfully'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error deleting attendance: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Export attendance report
     */
    public function exportAttendanceReport($classId = null, $format = 'json', $startDate = null, $endDate = null) {
        try {
            $whereConditions = [];
            $params = [];
            $types = "";

            if ($classId) {
                $whereConditions[] = "class_id = ?";
                $params[] = $classId;
                $types .= "i";
            }

            if ($startDate) {
                $whereConditions[] = "DATE(join_time) >= ?";
                $params[] = $startDate;
                $types .= "s";
            }

            if ($endDate) {
                $whereConditions[] = "DATE(join_time) <= ?";
                $params[] = $endDate;
                $types .= "s";
            }

            $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
            $query = "SELECT * FROM attendance_records $whereClause ORDER BY join_time DESC";

            $stmt = $this->mysqli->prepare($query);
            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }
            $stmt->execute();
            $result = $stmt->get_result();
            
            $data = [];
            while ($row = $result->fetch_assoc()) {
                $data[] = $row;
            }

            // Get class information if classId is provided
            $classInfo = null;
            if ($classId) {
                error_log("Calling getClassInfo for classId: $classId");
                $classInfo = $this->getClassInfo($classId);
                error_log("Class info result: " . json_encode($classInfo));
            }

            if ($format === 'csv') {
                return $this->generateCSV($data, $classInfo);
            } elseif ($format === 'pdf') {
                return $this->generatePDF($data, $classInfo);
            } else {
                return [
                    'success' => true,
                    'data' => $data,
                    'count' => count($data),
                    'class_info' => $classInfo
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error exporting report: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get class information from class database or fallback
     */
    private function getClassInfo($classId) {
        try {
            if (!$this->classConn) {
                // Fallback: return basic class info based on class ID
                return $this->getFallbackClassInfo($classId);
            }
            
            $query = "SELECT className, subject, teacher, stream, deliveryMethod FROM classes WHERE id = ?";
            $stmt = $this->classConn->prepare($query);
            $stmt->bind_param("i", $classId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($row = $result->fetch_assoc()) {
                return $row;
            }
            
            // Fallback if no data found
            return $this->getFallbackClassInfo($classId);
        } catch (Exception $e) {
            error_log('Error getting class info: ' . $e->getMessage());
            // Fallback on error
            return $this->getFallbackClassInfo($classId);
        }
    }

    /**
     * Fallback class information when class database is not available
     */
    private function getFallbackClassInfo($classId) {
        // Create a mapping of known class IDs to their information
        $classMapping = [
            33 => [
                'className' => 'A/L-Science English Medium Biology',
                'subject' => 'Biology',
                'teacher' => 'Mr. Bawantha',
                'stream' => 'A/L-Science',
                'deliveryMethod' => 'Hybrid'
            ],
            // Add more class mappings as needed
        ];
        
        if (isset($classMapping[$classId])) {
            return $classMapping[$classId];
        }
        
        // Default fallback
        return [
            'className' => "Class ID: $classId",
            'subject' => 'N/A',
            'teacher' => 'N/A',
            'stream' => 'N/A',
            'deliveryMethod' => 'N/A'
        ];
    }

    private function generateCSV($data, $classInfo = null) {
        if (empty($data)) {
            return "No data to export";
        }

        $output = fopen('php://temp', 'r+');
        
        // Add class information header if available
        if ($classInfo) {
            fputcsv($output, ['Class Information']);
            fputcsv($output, ['Class Name', $classInfo['className'] ?? 'N/A']);
            fputcsv($output, ['Subject', $classInfo['subject'] ?? 'N/A']);
            fputcsv($output, ['Teacher', $classInfo['teacher'] ?? 'N/A']);
            fputcsv($output, ['Stream', $classInfo['stream'] ?? 'N/A']);
            fputcsv($output, ['Delivery Method', $classInfo['deliveryMethod'] ?? 'N/A']);
            fputcsv($output, []); // Empty row for spacing
        }
        
        // Define headers for better readability
        $headers = [
            'Student ID',
            'Student Name', 
            'Class ID',
            'Class Name',
            'Attendance Status',
            'Source',
            'Join Time',
            'Leave Time',
            'Duration (Minutes)',
            'Meeting ID',
            'Created Date'
        ];
        
        fputcsv($output, $headers);
        
        // Add data with formatted values
        foreach ($data as $row) {
            $csvRow = [
                $row['student_id'],
                $row['student_name'],
                $row['class_id'],
                $classInfo ? ($classInfo['className'] ?? 'N/A') : 'N/A',
                ucfirst($row['attendance_status']),
                ucfirst(str_replace('_', ' ', $row['source'])),
                $row['join_time'] ? date('Y-m-d H:i:s', strtotime($row['join_time'])) : 'N/A',
                $row['leave_time'] ? date('Y-m-d H:i:s', strtotime($row['leave_time'])) : 'N/A',
                $row['duration_minutes'] ?: 'N/A',
                $row['meeting_id'] ?: 'N/A',
                date('Y-m-d H:i:s', strtotime($row['created_at']))
            ];
            fputcsv($output, $csvRow);
        }
        
        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);
        
        return $csv;
    }

    private function generatePDF($data, $classInfo = null) {
        require_once __DIR__ . '/vendor/autoload.php';
        
        // Create new PDF document
        $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);
        
        // Set document information
        $pdf->SetCreator('TCMS Attendance System');
        $pdf->SetAuthor('TCMS Admin');
        $pdf->SetTitle('Attendance Report');
        $pdf->SetSubject('Class Attendance Report');
        
        // Set default header data
        $pdf->SetHeaderData('', 0, 'TCMS Attendance Report', 'Generated on ' . date('Y-m-d H:i:s'));
        
        // Set header and footer fonts
        $pdf->setHeaderFont(Array(PDF_FONT_NAME_MAIN, '', PDF_FONT_SIZE_MAIN));
        $pdf->setFooterFont(Array(PDF_FONT_NAME_DATA, '', PDF_FONT_SIZE_DATA));
        
        // Set default monospaced font
        $pdf->SetDefaultMonospacedFont(PDF_FONT_MONOSPACED);
        
        // Set margins
        $pdf->SetMargins(PDF_MARGIN_LEFT, PDF_MARGIN_TOP, PDF_MARGIN_RIGHT);
        $pdf->SetHeaderMargin(PDF_MARGIN_HEADER);
        $pdf->SetFooterMargin(PDF_MARGIN_FOOTER);
        
        // Set auto page breaks
        $pdf->SetAutoPageBreak(TRUE, PDF_MARGIN_BOTTOM);
        
        // Set image scale factor
        $pdf->setImageScale(PDF_IMAGE_SCALE_RATIO);
        
        // Add a page
        $pdf->AddPage();
        
        // Set font
        $pdf->SetFont('helvetica', '', 10);
        
        // Add class information if available
        if ($classInfo) {
            $pdf->SetFont('helvetica', 'B', 14);
            $pdf->Cell(0, 10, 'Class Information', 0, 1, 'C');
            $pdf->SetFont('helvetica', '', 10);
            
            $classData = [
                ['Class Name', $classInfo['className'] ?? 'N/A'],
                ['Subject', $classInfo['subject'] ?? 'N/A'],
                ['Teacher', $classInfo['teacher'] ?? 'N/A'],
                ['Stream', $classInfo['stream'] ?? 'N/A'],
                ['Delivery Method', $classInfo['deliveryMethod'] ?? 'N/A']
            ];
            
            foreach ($classData as $row) {
                $pdf->Cell(60, 7, $row[0], 1);
                $pdf->Cell(100, 7, $row[1], 1);
                $pdf->Ln();
            }
            
            $pdf->Ln(10);
        }
        
        // Create summary table
        $summaryData = [
            ['Total Records', count($data)],
            ['Present', count(array_filter($data, function($row) { return $row['attendance_status'] === 'present'; }))],
            ['Late', count(array_filter($data, function($row) { return $row['attendance_status'] === 'late'; }))],
            ['Absent', count(array_filter($data, function($row) { return $row['attendance_status'] === 'absent'; }))],
            ['Zoom Attendance', count(array_filter($data, function($row) { return strpos($row['source'], 'zoom') !== false; }))],
            ['Manual Attendance', count(array_filter($data, function($row) { return $row['source'] === 'manual'; }))]
        ];
        
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->Cell(0, 10, 'Attendance Summary', 0, 1, 'C');
        $pdf->SetFont('helvetica', '', 10);
        
        foreach ($summaryData as $row) {
            $pdf->Cell(60, 7, $row[0], 1);
            $pdf->Cell(30, 7, $row[1], 1);
            $pdf->Ln();
        }
        
        $pdf->Ln(10);
        
        // Create detailed attendance table
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->Cell(0, 10, 'Detailed Attendance Records', 0, 1, 'C');
        $pdf->SetFont('helvetica', '', 8);
        
        // Table headers
        $headers = ['Student ID', 'Student Name', 'Status', 'Source', 'Join Time', 'Duration'];
        $widths = [25, 35, 20, 25, 35, 20];
        
        foreach ($headers as $i => $header) {
            $pdf->Cell($widths[$i], 7, $header, 1, 0, 'C');
        }
        $pdf->Ln();
        
        // Table data
        foreach ($data as $row) {
            $pdf->Cell($widths[0], 6, $row['student_id'], 1);
            $pdf->Cell($widths[1], 6, substr($row['student_name'], 0, 15), 1);
            $pdf->Cell($widths[2], 6, ucfirst($row['attendance_status']), 1);
            $pdf->Cell($widths[3], 6, ucfirst(str_replace('_', ' ', $row['source'])), 1);
            $pdf->Cell($widths[4], 6, $row['join_time'] ? date('H:i', strtotime($row['join_time'])) : 'N/A', 1);
            $pdf->Cell($widths[5], 6, $row['duration_minutes'] ? $row['duration_minutes'] . 'm' : 'N/A', 1);
            $pdf->Ln();
        }
        
        // Output PDF
        return $pdf->Output('attendance_report.pdf', 'S');
    }

    /**
     * Get real-time attendance for a class
     */
    public function getRealTimeAttendance($classId, $date = null) {
        try {
            $date = $date ?: date('Y-m-d');
            
            $query = "SELECT ar.*, 
                     CASE 
                         WHEN ar.leave_time IS NULL AND ar.join_time IS NOT NULL 
                         THEN 'active' 
                         ELSE 'completed' 
                     END as session_status
                     FROM attendance_records ar 
                     WHERE ar.class_id = ? AND DATE(ar.join_time) = ?
                     ORDER BY ar.join_time DESC";
            
            $stmt = $this->mysqli->prepare($query);
            $stmt->bind_param("is", $classId, $date);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $attendance = [];
            while ($row = $result->fetch_assoc()) {
                $attendance[] = $row;
            }
            
            return [
                'success' => true,
                'data' => $attendance,
                'class_id' => $classId,
                'date' => $date,
                'last_updated' => date('Y-m-d H:i:s')
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error fetching real-time attendance: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get attendance summary for dashboard
     */
    public function getAttendanceSummary($classId = null, $date = null) {
        try {
            $date = $date ?: date('Y-m-d');
            
            $whereConditions = ['DATE(join_time) = ?'];
            $params = [$date];
            $types = "s";
            
            if ($classId) {
                $whereConditions[] = "class_id = ?";
                $params[] = $classId;
                $types .= "i";
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            $query = "SELECT 
                        COUNT(*) as total_records,
                        COUNT(CASE WHEN attendance_status = 'present' THEN 1 END) as present_count,
                        COUNT(CASE WHEN attendance_status = 'late' THEN 1 END) as late_count,
                        COUNT(CASE WHEN attendance_status = 'absent' THEN 1 END) as absent_count,
                        COUNT(CASE WHEN source LIKE '%zoom%' THEN 1 END) as zoom_count,
                        COUNT(CASE WHEN source = 'recorded_video' THEN 1 END) as recorded_video_count,
                        COUNT(CASE WHEN source = 'manual' THEN 1 END) as manual_count,
                        COUNT(CASE WHEN source = 'barcode' THEN 1 END) as barcode_count,
                        AVG(duration_minutes) as avg_duration
                      FROM attendance_records $whereClause";
            
            $stmt = $this->mysqli->prepare($query);
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $summary = $stmt->get_result()->fetch_assoc();
            
            return [
                'success' => true,
                'data' => $summary,
                'date' => $date,
                'class_id' => $classId
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error fetching attendance summary: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Record video attendance tracking
     */
    public function recordVideoAttendance($classId, $studentId, $videoData) {
        try {
            // Get settings for video completion threshold
            $completionThreshold = $this->getSettingValue('recorded_video_completion_threshold', 80);
            
            $videoUrl = $videoData['video_url'] ?? '';
            $videoDuration = $videoData['video_duration'] ?? 0; // in seconds
            $watchTime = $videoData['watch_time'] ?? 0; // in seconds
            $watchPercentage = $videoDuration > 0 ? ($watchTime / $videoDuration) * 100 : 0;
            $studentName = $videoData['student_name'] ?? '';
            
            // Determine attendance status based on watch percentage
            $attendanceStatus = 'absent';
            if ($watchPercentage >= $completionThreshold) {
                $attendanceStatus = 'present';
            } elseif ($watchPercentage >= 50) {
                $attendanceStatus = 'late'; // Partial completion
            }
            
            // Calculate duration in minutes
            $durationMinutes = round($watchTime / 60);
            
            // Record the video attendance
            $query = "INSERT INTO attendance_records 
                     (class_id, student_id, student_name, source, attendance_status, 
                      join_time, leave_time, duration_minutes, meeting_id) 
                     VALUES (?, ?, ?, 'recorded_video', ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                     duration_minutes = GREATEST(duration_minutes, VALUES(duration_minutes)),
                     attendance_status = CASE 
                         WHEN VALUES(attendance_status) = 'present' THEN 'present'
                         WHEN attendance_status = 'present' THEN 'present'
                         ELSE VALUES(attendance_status)
                     END,
                     leave_time = VALUES(leave_time)";
            
            $joinTime = date('Y-m-d H:i:s', strtotime('-' . $durationMinutes . ' minutes'));
            $leaveTime = date('Y-m-d H:i:s');
            $meetingId = 'video_' . md5($videoUrl . $classId); // Create unique ID for video session
            
            $stmt = $this->mysqli->prepare($query);
            $stmt->bind_param("issssssi", $classId, $studentId, $studentName, $attendanceStatus, 
                             $joinTime, $leaveTime, $durationMinutes, $meetingId);
            $stmt->execute();
            
            // Store video tracking details in a separate table (create if needed)
            $this->recordVideoTrackingDetails($classId, $studentId, $videoData, $watchPercentage);
            
            // Update real-time summary
            $this->updateRealTimeAttendanceSummary($classId, date('Y-m-d'));
            
            return [
                'success' => true,
                'message' => 'Video attendance recorded successfully',
                'attendance_status' => $attendanceStatus,
                'watch_percentage' => round($watchPercentage, 2),
                'completion_threshold' => $completionThreshold,
                'duration_minutes' => $durationMinutes
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error recording video attendance: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Record detailed video tracking information
     */
    private function recordVideoTrackingDetails($classId, $studentId, $videoData, $watchPercentage) {
        try {
            // Create video tracking table if it doesn't exist
            $createTableQuery = "CREATE TABLE IF NOT EXISTS video_tracking (
                id INT AUTO_INCREMENT PRIMARY KEY,
                class_id INT NOT NULL,
                student_id VARCHAR(50) NOT NULL,
                video_url VARCHAR(500),
                video_title VARCHAR(255),
                video_duration INT DEFAULT 0,
                watch_time INT DEFAULT 0,
                watch_percentage DECIMAL(5,2) DEFAULT 0,
                watch_sessions JSON,
                completion_status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
                first_watch_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_watch_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_class_student (class_id, student_id),
                INDEX idx_video_url (video_url(100))
            )";
            
            $this->mysqli->query($createTableQuery);
            
            // Insert or update video tracking record
            $query = "INSERT INTO video_tracking 
                     (class_id, student_id, video_url, video_title, video_duration, 
                      watch_time, watch_percentage, watch_sessions, completion_status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                     watch_time = GREATEST(watch_time, VALUES(watch_time)),
                     watch_percentage = GREATEST(watch_percentage, VALUES(watch_percentage)),
                     watch_sessions = JSON_MERGE_PATCH(COALESCE(watch_sessions, '{}'), VALUES(watch_sessions)),
                     completion_status = CASE 
                         WHEN VALUES(watch_percentage) >= 80 THEN 'completed'
                         WHEN VALUES(watch_percentage) > 0 THEN 'in_progress'
                         ELSE 'not_started'
                     END,
                     last_watch_time = CURRENT_TIMESTAMP";
            
            $videoUrl = $videoData['video_url'] ?? '';
            $videoTitle = $videoData['video_title'] ?? 'Recorded Class Video';
            $videoDuration = $videoData['video_duration'] ?? 0;
            $watchTime = $videoData['watch_time'] ?? 0;
            $watchSessions = json_encode([
                'session_' . time() => [
                    'watch_time' => $watchTime,
                    'timestamp' => date('Y-m-d H:i:s'),
                    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
                    'ip_address' => $_SERVER['REMOTE_ADDR'] ?? ''
                ]
            ]);
            
            $completionStatus = $watchPercentage >= 80 ? 'completed' : ($watchPercentage > 0 ? 'in_progress' : 'not_started');
            
            $stmt = $this->mysqli->prepare($query);
            $stmt->bind_param("isssiiiss", $classId, $studentId, $videoUrl, $videoTitle, 
                             $videoDuration, $watchTime, $watchPercentage, $watchSessions, $completionStatus);
            $stmt->execute();
            
        } catch (Exception $e) {
            error_log('Error recording video tracking details: ' . $e->getMessage());
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
     * Update attendance settings (key/value pairs)
     */
    public function updateSettings($settings = []) {
        try {
            if (!is_array($settings) || empty($settings)) {
                return ['success' => false, 'message' => 'No settings provided'];
            }

            $this->mysqli->begin_transaction();

            $stmt = $this->mysqli->prepare("INSERT INTO attendance_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            foreach ($settings as $key => $value) {
                $k = (string)$key;
                $v = (string)$value;
                $stmt->bind_param('ss', $k, $v);
                $stmt->execute();
            }

            $this->mysqli->commit();

            return ['success' => true, 'message' => 'Settings updated successfully'];
        } catch (Exception $e) {
            $this->mysqli->rollback();
            return ['success' => false, 'message' => 'Error updating settings: ' . $e->getMessage()];
        }
    }

    /**
     * Get attendance settings. If $keys provided (array), return only those keys.
     */
    public function getSettings($keys = null) {
        try {
            $query = "SELECT setting_key, setting_value FROM attendance_settings";
            $stmt = $this->mysqli->prepare($query);
            $stmt->execute();
            $result = $stmt->get_result();

            $settings = [];
            while ($row = $result->fetch_assoc()) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }

            // If specific keys requested, filter
            if (is_array($keys) && !empty($keys)) {
                $filtered = [];
                foreach ($keys as $k) {
                    if (isset($settings[$k])) $filtered[$k] = $settings[$k];
                }
                return ['success' => true, 'settings' => $filtered];
            }

            return ['success' => true, 'settings' => $settings];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error fetching settings: ' . $e->getMessage()];
        }
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
                        SUM(CASE WHEN source = 'recorded_video' THEN 1 ELSE 0 END) as recorded_count,
                        SUM(CASE WHEN source = 'manual' THEN 1 ELSE 0 END) as manual_count
                      FROM attendance_records 
                      WHERE class_id = ? AND DATE(join_time) = ?
                      GROUP BY attendance_status";
            
            $stmt = $this->mysqli->prepare($query);
            $stmt->bind_param("is", $classId, $date);
            $stmt->execute();
            $results = $stmt->get_result();
            
            $present = 0; $late = 0; $absent = 0;
            $zoomTotal = 0; $barcodeTotal = 0; $recordedTotal = 0; $manualTotal = 0;
            
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
                $manualTotal += $row['manual_count'];
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
            $stmt->bind_param("isiiiiiii", $classId, $date, $totalStudents, $present, $late, $absent, 
                             $zoomTotal, $barcodeTotal, $recordedTotal);
            $stmt->execute();
            
        } catch (Exception $e) {
            error_log('Error updating real-time attendance summary: ' . $e->getMessage());
        }
    }
}
?>

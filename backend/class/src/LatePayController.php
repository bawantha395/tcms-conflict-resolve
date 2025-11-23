<?php
/**
 * Late Pay Permission Controller
 * Handles late payment permissions for students to attend class on a specific day
 */

class LatePayController {
    private $db;

    public function __construct($mysqli) {
        $this->db = $mysqli;
    }

    /**
     * Issue a late pay permission for a student for today
     * This allows the student to attend the specific class TODAY even without payment
     * 
     * POST /late_pay/issue
     * Body: {
     *   "student_id": "STU001",
     *   "class_id": 123,
     *   "enrollment_id": 456,
     *   "cashier_id": "CASH001",
     *   "reason": "Allowed late payment for today only"
     * }
     */
    public function issuePermission($data) {
        try {
            $studentId = $data['student_id'] ?? null;
            $classId = $data['class_id'] ?? null;
            $enrollmentId = $data['enrollment_id'] ?? null;
            $cashierId = $data['cashier_id'] ?? null;
            $reason = $data['reason'] ?? 'Allowed late payment for today only';

            // Validate required fields
            if (!$studentId || !$classId || !$enrollmentId || !$cashierId) {
                http_response_code(400);
                return [
                    'success' => false,
                    'message' => 'Missing required fields: student_id, class_id, enrollment_id, cashier_id'
                ];
            }

            // Check if enrollment exists
            $enrollStmt = $this->db->prepare("SELECT id, payment_status FROM enrollments WHERE id = ? AND student_id = ? AND class_id = ?");
            $enrollStmt->bind_param("isi", $enrollmentId, $studentId, $classId);
            $enrollStmt->execute();
            $enrollResult = $enrollStmt->get_result();

            if ($enrollResult->num_rows === 0) {
                http_response_code(404);
                return [
                    'success' => false,
                    'message' => 'Enrollment not found'
                ];
            }

            $enrollment = $enrollResult->fetch_assoc();

            // Check if already has permission for today
            $today = date('Y-m-d');
            $checkStmt = $this->db->prepare("
                SELECT id FROM late_pay_permissions 
                WHERE student_id = ? AND class_id = ? AND permission_date = ?
            ");
            $checkStmt->bind_param("sis", $studentId, $classId, $today);
            $checkStmt->execute();
            $existingPermission = $checkStmt->get_result();

            if ($existingPermission->num_rows > 0) {
                return [
                    'success' => true,
                    'message' => 'Late pay permission already issued for today',
                    'already_exists' => true
                ];
            }

            // Insert late pay permission
            $insertStmt = $this->db->prepare("
                INSERT INTO late_pay_permissions 
                (student_id, class_id, enrollment_id, permission_date, cashier_id, reason) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $insertStmt->bind_param("siisss", $studentId, $classId, $enrollmentId, $today, $cashierId, $reason);

            if (!$insertStmt->execute()) {
                throw new Exception("Failed to insert late pay permission: " . $insertStmt->error);
            }

            $permissionId = $this->db->insert_id;

            // Update enrollment payment_status to 'late_pay'
            $updateStmt = $this->db->prepare("
                UPDATE enrollments 
                SET payment_status = 'late_pay'
                WHERE id = ?
            ");
            $updateStmt->bind_param("i", $enrollmentId);
            $updateStmt->execute();

            return [
                'success' => true,
                'message' => 'Late pay permission issued successfully',
                'permission_id' => $permissionId,
                'permission_date' => $today,
                'student_id' => $studentId,
                'class_id' => $classId
            ];

        } catch (Exception $e) {
            error_log("Late Pay Permission Error: " . $e->getMessage());
            http_response_code(500);
            return [
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Check if a student has late pay permission for a specific class today
     * 
     * GET /late_pay/check?student_id=STU001&class_id=123
     */
    public function checkPermission($studentId, $classId, $date = null) {
        try {
            if (!$studentId || !$classId) {
                http_response_code(400);
                return [
                    'success' => false,
                    'message' => 'Missing required parameters: student_id, class_id'
                ];
            }

            $checkDate = $date ?? date('Y-m-d');

            $stmt = $this->db->prepare("
                SELECT 
                    lpp.*,
                    c.class_name,
                    c.subject
                FROM late_pay_permissions lpp
                JOIN classes c ON lpp.class_id = c.id
                WHERE lpp.student_id = ? 
                AND lpp.class_id = ? 
                AND lpp.permission_date = ?
            ");
            $stmt->bind_param("sis", $studentId, $classId, $checkDate);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result->num_rows > 0) {
                $permission = $result->fetch_assoc();
                return [
                    'success' => true,
                    'has_permission' => true,
                    'permission' => $permission,
                    'permission_date' => $permission['permission_date'],
                    'issued_at' => $permission['issued_at'],
                    'message' => 'Student has late pay permission for today'
                ];
            }

            return [
                'success' => true,
                'has_permission' => false,
                'message' => 'No late pay permission found for today'
            ];

        } catch (Exception $e) {
            error_log("Check Permission Error: " . $e->getMessage());
            http_response_code(500);
            return [
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get all late pay permissions for a student
     * 
     * GET /late_pay/student/{student_id}
     */
    public function getStudentPermissions($studentId) {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    lpp.*,
                    c.class_name,
                    c.subject,
                    e.payment_status
                FROM late_pay_permissions lpp
                JOIN classes c ON lpp.class_id = c.id
                JOIN enrollments e ON lpp.enrollment_id = e.id
                WHERE lpp.student_id = ?
                ORDER BY lpp.permission_date DESC
            ");
            $stmt->bind_param("s", $studentId);
            $stmt->execute();
            $result = $stmt->get_result();

            $permissions = [];
            while ($row = $result->fetch_assoc()) {
                $permissions[] = $row;
            }

            return [
                'success' => true,
                'permissions' => $permissions,
                'count' => count($permissions)
            ];

        } catch (Exception $e) {
            error_log("Get Student Permissions Error: " . $e->getMessage());
            http_response_code(500);
            return [
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get all late pay permissions issued by a cashier today
     * Used to track "Pending Payments" KPI
     * 
     * GET /late_pay/cashier/{cashier_id}?date=2024-01-15
     */
    public function getCashierPermissions($cashierId, $date = null) {
        try {
            $checkDate = $date ?? date('Y-m-d');

            $stmt = $this->db->prepare("
                SELECT 
                    lpp.*,
                    c.class_name,
                    c.subject
                FROM late_pay_permissions lpp
                JOIN classes c ON lpp.class_id = c.id
                WHERE lpp.cashier_id = ? AND lpp.permission_date = ?
                ORDER BY lpp.issued_at DESC
            ");
            $stmt->bind_param("ss", $cashierId, $checkDate);
            $stmt->execute();
            $result = $stmt->get_result();

            $permissions = [];
            while ($row = $result->fetch_assoc()) {
                $permissions[] = $row;
            }

            return [
                'success' => true,
                'permissions' => $permissions,
                'count' => count($permissions),
                'date' => $checkDate
            ];

        } catch (Exception $e) {
            error_log("Get Cashier Permissions Error: " . $e->getMessage());
            http_response_code(500);
            return [
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get all active late pay permissions for today
     * Used for Student Tracking page
     * 
     * GET /late_pay/all_active?date=2025-11-10
     */
    public function getAllActivePermissions($date = null) {
        try {
            $checkDate = $date ?? date('Y-m-d');

            $stmt = $this->db->prepare("
                SELECT 
                    lpp.*,
                    c.class_name,
                    c.subject,
                    e.payment_status
                FROM late_pay_permissions lpp
                JOIN classes c ON lpp.class_id = c.id
                JOIN enrollments e ON lpp.enrollment_id = e.id
                WHERE lpp.permission_date = ?
                ORDER BY lpp.issued_at DESC
            ");
            $stmt->bind_param("s", $checkDate);
            $stmt->execute();
            $result = $stmt->get_result();

            $permissions = [];
            while ($row = $result->fetch_assoc()) {
                $permissions[] = $row;
            }

            return [
                'success' => true,
                'permissions' => $permissions,
                'count' => count($permissions),
                'date' => $checkDate
            ];

        } catch (Exception $e) {
            error_log("Get All Active Permissions Error: " . $e->getMessage());
            http_response_code(500);
            return [
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get all late pay permissions history (not just today)
     * Used for Student Tracking page to show full history
     * 
     * GET /late_pay/all_history?limit=100
     */
    public function getAllPermissionsHistory($limit = 100) {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    lpp.*,
                    c.class_name,
                    c.subject,
                    e.payment_status,
                    lpp.cashier_id as cashier_id,
                    lpp.issued_at as issued_time
                FROM late_pay_permissions lpp
                JOIN classes c ON lpp.class_id = c.id
                JOIN enrollments e ON lpp.enrollment_id = e.id
                ORDER BY lpp.permission_date DESC, lpp.issued_at DESC
                LIMIT ?
            ");
            $stmt->bind_param("i", $limit);
            $stmt->execute();
            $result = $stmt->get_result();

            $permissions = [];
            while ($row = $result->fetch_assoc()) {
                $permissions[] = $row;
            }

            return [
                'success' => true,
                'permissions' => $permissions,
                'count' => count($permissions)
            ];

        } catch (Exception $e) {
            error_log("Get All Permissions History Error: " . $e->getMessage());
            http_response_code(500);
            return [
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Clean up old late pay permissions (older than 30 days)
     * This should be run as a cron job or manually
     * 
     * POST /late_pay/cleanup
     */
    public function cleanupOldPermissions() {
        try {
            $thirtyDaysAgo = date('Y-m-d', strtotime('-30 days'));

            $stmt = $this->db->prepare("
                DELETE FROM late_pay_permissions 
                WHERE permission_date < ?
            ");
            $stmt->bind_param("s", $thirtyDaysAgo);
            $stmt->execute();

            $deletedCount = $stmt->affected_rows;

            return [
                'success' => true,
                'message' => "Cleaned up $deletedCount old late pay permissions",
                'deleted_count' => $deletedCount
            ];

        } catch (Exception $e) {
            error_log("Cleanup Error: " . $e->getMessage());
            http_response_code(500);
            return [
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Expire late pay permissions for yesterday
     * This resets payment_status from 'late_pay' back to 'overdue'
     * Should be called automatically or via cron at end of day
     * 
     * POST /late_pay/expire
     */
    public function expireYesterdayPermissions() {
        try {
            $today = date('Y-m-d');
            
            // Find all enrollments with late_pay status from yesterday or older
            $stmt = $this->db->prepare("
                SELECT DISTINCT e.id, e.student_id, e.class_id, e.payment_status, lpp.permission_date
                FROM enrollments e
                JOIN late_pay_permissions lpp ON e.id = lpp.enrollment_id
                WHERE e.payment_status = 'late_pay' 
                AND lpp.permission_date < ?
            ");
            $stmt->bind_param("s", $today);
            $stmt->execute();
            $result = $stmt->get_result();

            $expiredCount = 0;
            $enrollmentsToUpdate = [];

            while ($row = $result->fetch_assoc()) {
                $enrollmentsToUpdate[] = $row['id'];
                $expiredCount++;
            }

            // Reset payment_status back to 'overdue' for expired permissions
            // Using 'overdue' since the payment is still pending and now past the grace period
            if (count($enrollmentsToUpdate) > 0) {
                $placeholders = implode(',', array_fill(0, count($enrollmentsToUpdate), '?'));
                $updateStmt = $this->db->prepare("
                    UPDATE enrollments 
                    SET payment_status = 'overdue'
                    WHERE id IN ($placeholders) AND payment_status = 'late_pay'
                ");
                
                // Bind all enrollment IDs
                $types = str_repeat('i', count($enrollmentsToUpdate));
                $updateStmt->bind_param($types, ...$enrollmentsToUpdate);
                $updateStmt->execute();
                
                $actualUpdated = $updateStmt->affected_rows;

                return [
                    'success' => true,
                    'message' => "Expired $actualUpdated late pay permissions - status changed to overdue",
                    'expired_count' => $actualUpdated,
                    'checked_enrollments' => $expiredCount
                ];
            }

            return [
                'success' => true,
                'message' => 'No late pay permissions to expire',
                'expired_count' => 0
            ];

        } catch (Exception $e) {
            error_log("Expire Permissions Error: " . $e->getMessage());
            http_response_code(500);
            return [
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ];
        }
    }
}

// Note: Routing is handled in routes.php

<?php
// Set timezone for all date/time operations
date_default_timezone_set('Asia/Colombo');

require_once __DIR__ . '/config.php';

class EnrollmentController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    // Get all enrollments for a student
    public function getStudentEnrollments($studentId) {
        try {
            // MICROSERVICES FIX: Only query class-backend tables, no financial_records join
            // Payment history should be fetched from payment-backend service separately
            $stmt = $this->db->prepare("
                SELECT 
                    e.*,
                    c.class_name,
                    c.subject,
                    c.teacher,
                    c.stream,
                    c.delivery_method,
                    c.course_type,
                    c.fee,
                    c.max_students,
                    c.status as class_status,
                    c.zoom_link,
                    c.video_url,
                    c.description,
                    c.schedule_day,
                    c.schedule_start_time,
                    c.schedule_end_time,
                    c.schedule_frequency,
                    c.start_date,
                    c.end_date,
                    c.current_students,
                    c.payment_tracking,
                    c.payment_tracking_free_days,
                    c.enable_new_window_join,
                    c.enable_overlay_join
                FROM enrollments e
                LEFT JOIN classes c ON e.class_id = c.id
                WHERE e.student_id = ?
                ORDER BY e.enrollment_date DESC
            ");
            
            $stmt->bind_param("s", $studentId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $enrollments = [];
            while ($row = $result->fetch_assoc()) {
                // Create schedule object from individual columns
                $row['schedule'] = [
                    'day' => $row['schedule_day'],
                    'startTime' => $row['schedule_start_time'],
                    'endTime' => $row['schedule_end_time'],
                    'frequency' => $row['schedule_frequency']
                ];
                
                $enrollments[] = $row;
            }
            
            return [
                'success' => true,
                'data' => $enrollments
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error retrieving enrollments: ' . $e->getMessage()
            ];
        }
    }

    // Get all enrollments for a specific class
    public function getClassEnrollments($classId) {
        try {
            // MICROSERVICES FIX: Only query class-backend tables, no financial_records join
            // Payment history should be fetched from payment-backend service separately
            $stmt = $this->db->prepare("
                SELECT 
                    e.*,
                    c.class_name,
                    c.subject,
                    c.teacher,
                    c.stream,
                    c.delivery_method,
                    c.course_type,
                    c.fee,
                    c.max_students,
                    c.status as class_status,
                    c.zoom_link,
                    c.description,
                    c.schedule_day,
                    c.schedule_start_time,
                    c.schedule_end_time,
                    c.schedule_frequency,
                    c.start_date,
                    c.end_date,
                    c.current_students,
                    c.payment_tracking,
                    c.payment_tracking_free_days,
                    c.enable_new_window_join,
                    c.enable_overlay_join
                FROM enrollments e
                LEFT JOIN classes c ON e.class_id = c.id
                WHERE e.class_id = ?
                ORDER BY e.enrollment_date DESC
            ");
            
            $stmt->bind_param("i", $classId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $enrollments = [];
            while ($row = $result->fetch_assoc()) {
                // Create schedule object from individual columns
                $row['schedule'] = [
                    'day' => $row['schedule_day'],
                    'startTime' => $row['schedule_start_time'],
                    'endTime' => $row['schedule_end_time'],
                    'frequency' => $row['schedule_frequency']
                ];
                
                $enrollments[] = $row;
            }
            
            return [
                'success' => true,
                'data' => $enrollments
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error retrieving class enrollments: ' . $e->getMessage()
            ];
        }
    }

    // Get all enrollments in the system
    public function getAllEnrollments() {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    e.*,
                    c.class_name,
                    c.subject,
                    c.teacher,
                    c.stream,
                    c.delivery_method,
                    c.course_type,
                    c.fee,
                    c.max_students,
                    c.status as class_status,
                    c.zoom_link,
                    c.video_url,
                    c.description,
                    c.schedule_day,
                    c.schedule_start_time,
                    c.schedule_end_time,
                    c.schedule_frequency,
                    c.start_date,
                    c.end_date,
                    c.current_students,
                    c.payment_tracking,
                    c.payment_tracking_free_days,
                    c.enable_new_window_join,
                    c.enable_overlay_join
                FROM enrollments e
                LEFT JOIN classes c ON e.class_id = c.id
                ORDER BY e.created_at DESC
            ");
            
            $stmt->execute();
            $result = $stmt->get_result();
            
            $enrollments = [];
            while ($row = $result->fetch_assoc()) {
                // Create schedule object from individual columns
                $row['schedule'] = [
                    'day' => $row['schedule_day'],
                    'startTime' => $row['schedule_start_time'],
                    'endTime' => $row['schedule_end_time'],
                    'frequency' => $row['schedule_frequency']
                ];
                
                $enrollments[] = $row;
            }
            
            return [
                'success' => true,
                'data' => $enrollments
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error retrieving all enrollments: ' . $e->getMessage()
            ];
        }
    }

    // Create a new enrollment
    public function createEnrollment($enrollmentData) {
        try {
            // Start transaction
            $this->db->begin_transaction();
            
            // Always use frontend date when provided (frontend knows the correct local date)
            $enrollmentDate = $enrollmentData['enrollment_date'] ?? date('Y-m-d');
            
            // Ensure next_payment_date is always the 1st of next month
            $nextPaymentDate = $enrollmentData['next_payment_date'] ?? null;
            if (!$nextPaymentDate) {
                // Calculate 1st of next month if not provided
                $nextPaymentDate = date('Y-m-01', strtotime('first day of next month'));
            }
            
            $stmt = $this->db->prepare("
                INSERT INTO enrollments (
                    class_id, student_id, enrollment_date, 
                    status, payment_status, total_fee, paid_amount,
                    next_payment_date, card_type, card_valid_from, card_valid_to, card_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $cardType = $enrollmentData['card_type'] ?? 'none';
            $cardValidFrom = $enrollmentData['card_valid_from'] ?? null;
            $cardValidTo = $enrollmentData['card_valid_to'] ?? null;
            $cardNotes = $enrollmentData['card_notes'] ?? null;
            
            $stmt->bind_param("issssdssssss", 
                $enrollmentData['class_id'],
                $enrollmentData['student_id'],
                $enrollmentDate,
                $enrollmentData['status'],
                $enrollmentData['payment_status'],
                $enrollmentData['total_fee'],
                $enrollmentData['paid_amount'],
                $nextPaymentDate,
                $cardType,
                $cardValidFrom,
                $cardValidTo,
                $cardNotes
            );
            
            if ($stmt->execute()) {
                $enrollmentId = $stmt->insert_id;
                
                // Update the current_students count in the classes table
                $this->updateClassStudentCount($enrollmentData['class_id']);
                
                // Synchronize payment status with financial records
                if (isset($enrollmentData['payment_status'])) {
                    $this->synchronizePaymentStatus($enrollmentId, $enrollmentData['payment_status']);
                }
                
                // Commit transaction
                $this->db->commit();
                
                return [
                    'success' => true,
                    'message' => 'Enrollment created successfully',
                    'data' => ['id' => $enrollmentId]
                ];
            } else {
                // Rollback transaction
                $this->db->rollback();
                return [
                    'success' => false,
                    'message' => 'Failed to create enrollment'
                ];
            }
        } catch (Exception $e) {
            // Rollback transaction on error
            $this->db->rollback();
            return [
                'success' => false,
                'message' => 'Error creating enrollment: ' . $e->getMessage()
            ];
        }
    }

    // Update enrollment
    public function updateEnrollment($enrollmentId, $updateData) {
        try {
            // Start transaction
            $this->db->begin_transaction();
            
            $stmt = $this->db->prepare("
                UPDATE enrollments SET
                    enrollment_date = ?,
                    status = ?,
                    payment_status = ?,
                    next_payment_date = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            
            $enrollmentDate = $updateData['enrollment_date'] ?? null;
            $nextPaymentDate = $updateData['next_payment_date'] ?? null;
            $stmt->bind_param("ssssi", 
                $enrollmentDate,
                $updateData['status'],
                $updateData['payment_status'],
                $nextPaymentDate,
                $enrollmentId
            );
            
            if ($stmt->execute()) {
                // Synchronize payment status with financial records
                if (isset($updateData['payment_status'])) {
                    $this->synchronizePaymentStatus($enrollmentId, $updateData['payment_status']);
                }
                
                // Commit transaction
                $this->db->commit();
                
                return [
                    'success' => true,
                    'message' => 'Enrollment updated successfully'
                ];
            } else {
                // Rollback transaction
                $this->db->rollback();
                return [
                    'success' => false,
                    'message' => 'Failed to update enrollment'
                ];
            }
        } catch (Exception $e) {
            // Rollback transaction on error
            $this->db->rollback();
            return [
                'success' => false,
                'message' => 'Error updating enrollment: ' . $e->getMessage()
            ];
        }
    }
    
    // Helper method to synchronize payment status between enrollments and financial records
    private function synchronizePaymentStatus($enrollmentId, $paymentStatus) {
        try {
            // Get the student_id and class_id from enrollment
            $stmt = $this->db->prepare("
                SELECT student_id, class_id 
                FROM enrollments 
                WHERE id = ?
            ");
            $stmt->bind_param("i", $enrollmentId);
            $stmt->execute();
            $result = $stmt->get_result();
            $enrollment = $result->fetch_assoc();
            
            if ($enrollment) {
                // Update financial records for this student and class
                $stmt = $this->db->prepare("
                    UPDATE financial_records 
                    SET status = ? 
                    WHERE user_id = ? AND class_id = ?
                ");
                $stmt->bind_param("ssi", 
                    $paymentStatus, 
                    $enrollment['student_id'], 
                    $enrollment['class_id']
                );
                $stmt->execute();
            }
        } catch (Exception $e) {
            error_log("Error synchronizing payment status: " . $e->getMessage());
        }
    }
    
    // Public method to synchronize all payment statuses
    public function synchronizeAllPaymentStatuses() {
        try {
            $updatedCount = 0;
            
            // Get all enrollments with their payment status
            $stmt = $this->db->prepare("
                SELECT id, student_id, class_id, payment_status 
                FROM enrollments 
                WHERE payment_status IS NOT NULL
            ");
            $stmt->execute();
            $result = $stmt->get_result();
            
            while ($enrollment = $result->fetch_assoc()) {
                // Update corresponding financial records
                $updateStmt = $this->db->prepare("
                    UPDATE financial_records 
                    SET status = ? 
                    WHERE user_id = ? AND class_id = ?
                ");
                $updateStmt->bind_param("ssi", 
                    $enrollment['payment_status'], 
                    $enrollment['student_id'], 
                    $enrollment['class_id']
                );
                $updateStmt->execute();
                $updatedCount += $updateStmt->affected_rows;
            }
            
            return [
                'success' => true,
                'message' => "Synchronized payment status for {$updatedCount} financial records"
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error synchronizing payment statuses: ' . $e->getMessage()
            ];
        }
    }

    // Delete enrollment
    public function deleteEnrollment($enrollmentId) {
        try {
            // First check if enrollment exists and get class_id
            $stmt = $this->db->prepare("SELECT class_id FROM enrollments WHERE id = ?");
            $stmt->bind_param("i", $enrollmentId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                return [
                    'success' => false,
                    'message' => 'Enrollment not found'
                ];
            }
            
            $enrollment = $result->fetch_assoc();
            $classId = $enrollment['class_id'];
            
            // Delete the enrollment
            $stmt = $this->db->prepare("DELETE FROM enrollments WHERE id = ?");
            $stmt->bind_param("i", $enrollmentId);
            
            if ($stmt->execute()) {
                // Update the current_students count in the classes table
                $this->updateClassStudentCount($classId);
                
                return [
                    'success' => true,
                    'message' => 'Enrollment deleted successfully'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Failed to delete enrollment'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error deleting enrollment: ' . $e->getMessage()
            ];
        }
    }

    // Delete all enrollments for a student
    public function deleteStudentEnrollments($studentId) {
        try {
            // Start transaction
            $this->db->begin_transaction();
            
            // Get all class IDs that will be affected
            $stmt = $this->db->prepare("SELECT DISTINCT class_id FROM enrollments WHERE student_id = ?");
            $stmt->bind_param("s", $studentId);
            $stmt->execute();
            $result = $stmt->get_result();
            $affectedClasses = [];
            while ($row = $result->fetch_assoc()) {
                $affectedClasses[] = $row['class_id'];
            }
            
            // Delete all enrollments for the student
            $stmt = $this->db->prepare("DELETE FROM enrollments WHERE student_id = ?");
            $stmt->bind_param("s", $studentId);
            
            if ($stmt->execute()) {
                $deletedCount = $stmt->affected_rows;
                
                // Delete all financial records for the student
                $stmt = $this->db->prepare("DELETE FROM financial_records WHERE user_id = ?");
                $stmt->bind_param("s", $studentId);
                $stmt->execute();
                $financialRecordsDeleted = $stmt->affected_rows;
                
                // Delete all payment history records for the student
                $stmt = $this->db->prepare("
                    DELETE ph FROM payment_history ph 
                    JOIN enrollments e ON ph.enrollment_id = e.id 
                    WHERE e.student_id = ?
                ");
                $stmt->bind_param("s", $studentId);
                $stmt->execute();
                $paymentHistoryDeleted = $stmt->affected_rows;
                
                // Note: Payments table cleanup would require cross-database access
                // This is handled separately if needed
                $paymentsDeleted = 0;
                
                // Update the current_students count for all affected classes
                foreach ($affectedClasses as $classId) {
                    $this->updateClassStudentCount($classId);
                }
                
                // Commit transaction
                $this->db->commit();
                
                return [
                    'success' => true,
                    'message' => "Deleted {$deletedCount} enrollment(s), {$financialRecordsDeleted} financial record(s), and {$paymentHistoryDeleted} payment history record(s) for student {$studentId}"
                ];
            } else {
                // Rollback transaction
                $this->db->rollback();
                return [
                    'success' => false,
                    'message' => 'Failed to delete student enrollments'
                ];
            }
        } catch (Exception $e) {
            // Rollback transaction on error
            $this->db->rollback();
            return [
                'success' => false,
                'message' => 'Error deleting student enrollments: ' . $e->getMessage()
            ];
        }
    }

    // Mark attendance for a class
    public function markAttendance($classId, $studentId, $attendanceData) {
        try {
            // Get current enrollment
            $stmt = $this->db->prepare("
                SELECT * FROM enrollments 
                WHERE class_id = ? AND student_id = ?
            ");
            $stmt->bind_param("ss", $classId, $studentId);
            $stmt->execute();
            $result = $stmt->get_result();
            $enrollment = $result->fetch_assoc();
            
            if (!$enrollment) {
                return [
                    'success' => false,
                    'message' => 'Enrollment not found'
                ];
            }
            
            // Parse existing attendance data
            $currentAttendance = json_decode($enrollment['attendance_data'] ?: '[]', true);
            
            // Check if attendance already marked for today
            $today = date('Y-m-d');
            $existingRecord = array_filter($currentAttendance, function($record) use ($today) {
                return $record['date'] === $today;
            });
            
            if (!empty($existingRecord)) {
                return [
                    'success' => false,
                    'message' => 'Attendance already marked for today'
                ];
            }
            
            // Add new attendance record
            $currentAttendance[] = $attendanceData;
            
            // Update enrollment
            $updateData = [
                'payment_status' => $enrollment['payment_status'],
                'next_payment_date' => $enrollment['next_payment_date'],
                'attendance_data' => json_encode($currentAttendance),
                'payment_history' => $enrollment['payment_history'],
                'forget_card_requested' => $enrollment['forget_card_requested'],
                'late_payment_requested' => $enrollment['late_payment_requested']
            ];
            
            return $this->updateEnrollment($enrollment['id'], $updateData);
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error marking attendance: ' . $e->getMessage()
            ];
        }
    }

    // Request forget card
    public function requestForgetCard($classId, $studentId) {
        try {
            $stmt = $this->db->prepare("
                UPDATE enrollments SET
                    forget_card_requested = '1',
                    forget_card_request_date = NOW(),
                    updated_at = NOW()
                WHERE class_id = ? AND student_id = ?
            ");
            
            $stmt->bind_param("ss", $classId, $studentId);
            
            if ($stmt->execute()) {
                return [
                    'success' => true,
                    'message' => 'Forget card request submitted successfully'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Failed to submit forget card request'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error submitting forget card request: ' . $e->getMessage()
            ];
        }
    }

    // Request late payment
    public function requestLatePayment($classId, $studentId) {
        try {
            $stmt = $this->db->prepare("
                UPDATE enrollments SET
                    payment_status = 'late_payment',
                    late_payment_requested = '1',
                    late_payment_request_date = NOW(),
                    updated_at = NOW()
                WHERE class_id = ? AND student_id = ?
            ");
            
            $stmt->bind_param("ss", $classId, $studentId);
            
            if ($stmt->execute()) {
                return [
                    'success' => true,
                    'message' => 'Late payment request submitted successfully'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Failed to submit late payment request'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error submitting late payment request: ' . $e->getMessage()
            ];
        }
    }
    
    // Helper method to update the current_students count for a class
    public function updateClassStudentCount($classId) {
        try {
            // Count active enrollments for the class
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as student_count 
                FROM enrollments 
                WHERE class_id = ? AND status = 'active'
            ");
            $stmt->bind_param("i", $classId);
            $stmt->execute();
            $result = $stmt->get_result();
            $count = $result->fetch_assoc()['student_count'];
            
            // Update the classes table
            $stmt = $this->db->prepare("
                UPDATE classes 
                SET current_students = ? 
                WHERE id = ?
            ");
            $stmt->bind_param("ii", $count, $classId);
            $stmt->execute();
            
        } catch (Exception $e) {
            error_log("Error updating class student count for class {$classId}: " . $e->getMessage());
        }
    }
    
    // CRITICAL FIX: Update enrollment payment status for renewal payments
    public function updateEnrollmentPayment($data) {
        try {
            $enrollmentId = $data['enrollment_id'] ?? null;
            $studentId = $data['student_id'] ?? null;
            $classId = $data['class_id'] ?? null;
            $paymentStatus = $data['payment_status'] ?? 'paid';
            $paidAmount = $data['paid_amount'] ?? 0;
            $nextPaymentDate = $data['next_payment_date'] ?? null;
            $status = $data['status'] ?? 'active';
            
            // Find enrollment by student_id and class_id if enrollment_id not provided
            if (!$enrollmentId && $studentId && $classId) {
                $stmt = $this->db->prepare("
                    SELECT id FROM enrollments 
                    WHERE student_id = ? AND class_id = ? 
                    LIMIT 1
                ");
                $stmt->bind_param("si", $studentId, $classId);
                $stmt->execute();
                $result = $stmt->get_result();
                if ($row = $result->fetch_assoc()) {
                    $enrollmentId = $row['id'];
                } else {
                    return [
                        'success' => false,
                        'message' => 'Enrollment not found'
                    ];
                }
            }
            
            if (!$enrollmentId) {
                return [
                    'success' => false,
                    'message' => 'Enrollment ID is required'
                ];
            }
            
            // Update enrollment with payment information
            $stmt = $this->db->prepare("
                UPDATE enrollments SET
                    payment_status = ?,
                    paid_amount = paid_amount + ?,
                    next_payment_date = ?,
                    status = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            
            $stmt->bind_param("sdssi", 
                $paymentStatus,
                $paidAmount,
                $nextPaymentDate,
                $status,
                $enrollmentId
            );
            
            if ($stmt->execute()) {
                error_log("ENROLLMENT_PAYMENT_UPDATE: Enrollment $enrollmentId updated successfully for renewal payment");
                
                return [
                    'success' => true,
                    'message' => 'Enrollment payment updated successfully',
                    'enrollmentId' => $enrollmentId
                ];
            } else {
                error_log("ENROLLMENT_PAYMENT_UPDATE_ERROR: Failed to update enrollment $enrollmentId - " . $stmt->error);
                
                return [
                    'success' => false,
                    'message' => 'Failed to update enrollment payment'
                ];
            }
        } catch (Exception $e) {
            error_log("ENROLLMENT_PAYMENT_UPDATE_EXCEPTION: " . $e->getMessage());
            
            return [
                'success' => false,
                'message' => 'Error updating enrollment payment: ' . $e->getMessage()
            ];
        }
    }
}

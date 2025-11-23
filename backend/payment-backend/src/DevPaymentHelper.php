<?php

class DevPaymentHelper {
    private $mysqli;
    
    public function __construct($mysqli) {
        $this->mysqli = $mysqli;
    }
    
    public function autoCompletePayment($orderId) {
        try {
            // Auto-complete payment for development/testing
            $stmt = $this->mysqli->prepare("UPDATE financial_records SET status = 'paid' WHERE transaction_id = ?");
            $stmt->bind_param("s", $orderId);
            $stmt->execute();
            
            // Create enrollment in class backend
            $this->createEnrollmentInClassBackend($orderId);
            
            return [
                'success' => true,
                'message' => 'Payment auto-completed successfully'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to auto-complete payment: ' . $e->getMessage()
            ];
        }
    }
    
    public function completeAllPendingPayments() {
        try {
            // Update financial_records table (where payments are actually stored)
            $stmt = $this->mysqli->prepare("UPDATE financial_records SET status = 'paid' WHERE status = 'pending'");
            $stmt->execute();
            
            // Also update payments table for backward compatibility
            $stmt2 = $this->mysqli->prepare("UPDATE payments SET payment_status = 'paid', updated_at = NOW() WHERE payment_status = 'pending'");
            $stmt2->execute();
            
            return [
                'success' => true,
                'message' => 'All pending payments completed'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to complete payments: ' . $e->getMessage()
            ];
        }
    }
    
    public function clearAllPayments() {
        try {
            $stmt = $this->mysqli->prepare("DELETE FROM payments");
            $stmt->execute();
            
            return [
                'success' => true,
                'message' => 'All payments cleared'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to clear payments: ' . $e->getMessage()
            ];
        }
    }
    
    public function clearStudentPayments($studentId) {
        try {
            // Clear financial_records for the specific student
            $stmt = $this->mysqli->prepare("DELETE FROM financial_records WHERE user_id = ?");
            $stmt->bind_param("s", $studentId);
            $stmt->execute();
            
            $deletedCount = $stmt->affected_rows;
            
            return [
                'success' => true,
                'message' => "Cleared $deletedCount payment records for student $studentId"
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to clear student payments: ' . $e->getMessage()
            ];
        }
    }
    
    public function getPendingPayments() {
        try {
            $stmt = $this->mysqli->prepare("SELECT * FROM payments WHERE payment_status = 'pending'");
            $stmt->execute();
            $result = $stmt->get_result();
            
            $payments = [];
            while ($row = $result->fetch_assoc()) {
                $payments[] = $row;
            }
            
            return [
                'success' => true,
                'data' => $payments
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to get pending payments: ' . $e->getMessage()
            ];
        }
    }
    
    public function recoverFailedEnrollments() {
        try {
            // Get failed payments and try to create enrollments
            $stmt = $this->mysqli->prepare("SELECT * FROM payments WHERE payment_status = 'failed'");
            $stmt->execute();
            $result = $stmt->get_result();
            
            $recovered = 0;
            while ($row = $result->fetch_assoc()) {
                if ($this->createEnrollmentInClassBackend($row['order_id'])) {
                    $recovered++;
                }
            }
            
            return [
                'success' => true,
                'message' => "Recovered $recovered failed enrollments"
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to recover enrollments: ' . $e->getMessage()
            ];
        }
    }
    
    public function processPendingEnrollments() {
        try {
            // Process pending enrollments
            $stmt = $this->mysqli->prepare("SELECT * FROM payments WHERE payment_status = 'paid'");
            $stmt->execute();
            $result = $stmt->get_result();
            
            $processed = 0;
            while ($row = $result->fetch_assoc()) {
                if ($this->createEnrollmentInClassBackend($row['order_id'])) {
                    $processed++;
                }
            }
            
            return [
                'success' => true,
                'message' => "Processed $processed enrollments"
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to process enrollments: ' . $e->getMessage()
            ];
        }
    }
    
    public function simulatePayHereConfirmation($orderId) {
        try {
            // Simulate PayHere confirmation - update financial_records table
            $stmt = $this->mysqli->prepare("UPDATE financial_records SET status = 'paid' WHERE transaction_id = ?");
            $stmt->bind_param("s", $orderId);
            $stmt->execute();
            
            // Also update payments table for backward compatibility
            $stmt2 = $this->mysqli->prepare("UPDATE payments SET payment_status = 'paid', updated_at = NOW() WHERE order_id = ?");
            $stmt2->bind_param("s", $orderId);
            $stmt2->execute();
            
            // Create enrollment
            $this->createEnrollmentInClassBackend($orderId);
            
            return [
                'success' => true,
                'message' => 'PayHere confirmation simulated successfully'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to simulate confirmation: ' . $e->getMessage()
            ];
        }
    }
    
    public function debugEnrollment($studentId, $classId) {
        try {
            // Debug enrollment status
            $url = "http://class-backend/routes.php/get_enrollments_by_student?studentId=" . $studentId;
            $response = file_get_contents($url);
            
            if ($response === FALSE) {
                return [
                    'success' => false,
                    'message' => 'Failed to fetch enrollments from class backend'
                ];
            }
            
            $enrollmentData = json_decode($response, true);
            
            return [
                'success' => true,
                'data' => [
                    'studentId' => $studentId,
                    'classId' => $classId,
                    'enrollments' => $enrollmentData
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Debug failed: ' . $e->getMessage()
            ];
        }
    }
    
    private function createEnrollmentInClassBackend($orderId) {
        try {
            // Get payment details
            $stmt = $this->mysqli->prepare("SELECT * FROM payments WHERE order_id = ?");
            $stmt->bind_param("s", $orderId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($payment = $result->fetch_assoc()) {
                // Create enrollment in class backend
                $enrollmentData = [
                    'student_id' => $payment['student_id'],
                    'class_id' => $payment['class_id'],
                    'payment_status' => 'paid',
                    'total_fee' => $payment['amount'],
                    'paid_amount' => $payment['amount']
                ];
                
                $url = "http://class-backend/routes.php/create_enrollment";
                $options = [
                    'http' => [
                        'header' => "Content-type: application/json\r\n",
                        'method' => 'POST',
                        'content' => json_encode($enrollmentData)
                    ]
                ];
                
                $context = stream_context_create($options);
                $response = file_get_contents($url, false, $context);
                
                return $response !== FALSE;
            }
            
            return false;
        } catch (Exception $e) {
            error_log("Failed to create enrollment: " . $e->getMessage());
            return false;
        }
    }
}

?>

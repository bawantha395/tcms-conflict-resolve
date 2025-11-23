<?php

class PayHereController {
    private $mysqli;
    private $merchantId = "1231482"; // Your PayHere merchant ID
    private $merchantSecret = "MTE3MTY5MDMwNjMzMzMyMDgwNDYzNzAxOTQxNDA5MTI1NTA3OTgwOA=="; // Your PayHere merchant secret

    public function __construct($mysqli) {
        $this->mysqli = $mysqli;
    }

    public function createPayHerePayment($data) {
        try {
            // Basic PayHere payment creation
            $orderId = $data['order_id'] ?? 'ORDER_' . time();
            $amount = $data['amount'] ?? 0;
            $currency = $data['currency'] ?? 'LKR';
            // Determine payment type: study pack vs others
            $isStudyPack = false;
            if (isset($data['is_study_pack'])) {
                $isStudyPack = (bool)$data['is_study_pack'];
            } elseif (isset($data['category'])) {
                $isStudyPack = strtolower((string)$data['category']) === 'study_pack';
            } elseif (isset($data['items'])) {
                $isStudyPack = stripos((string)$data['items'], 'study pack') !== false;
            }
            
            // Generate PayHere hash using the working method from your other project
                $hash = strtoupper(
                    md5(
                        $this->merchantId . 
                    $orderId . 
                    number_format($amount, 2, '.', '') . 
                    $currency . 
                        strtoupper(md5($this->merchantSecret))
                )
            );


            // Choose appropriate return/cancel URLs
            $returnUrl = $isStudyPack
                ? 'http://localhost:3000/student/studypack-payment-success'
                : 'http://localhost:3000/student/payment-success';
            $cancelUrl = $isStudyPack
                ? 'http://localhost:3000/student/studypack-payment-cancel'
                : 'http://localhost:3000/student/payment-cancel';

            return [
                'success' => true,
                'data' => [
                    'merchant_id' => $this->merchantId,
                    'return_url' => $returnUrl,
                    'cancel_url' => $cancelUrl,
                    'notify_url' => 'http://localhost:8090/routes.php/payhere_notify',
                    'order_id' => $orderId,
                    'items' => $data['items'] ?? 'Class Payment',
                    'currency' => $currency,
                    'amount' => number_format($amount, 2, '.', ''),
                    'first_name' => $data['first_name'] ?? 'Student',
                    'last_name' => $data['last_name'] ?? 'User',
                    'email' => $data['email'] ?? 'student@example.com',
                    'phone' => $data['phone'] ?? '+94123456789',
                    'address' => $data['address'] ?? 'Student Address',
                    'city' => $data['city'] ?? 'Colombo',
                    'country' => $data['country'] ?? 'Sri Lanka',
                    // Custom fields for tracking
                    'custom_1' => $data['student_id'] ?? '',
                    'custom_2' => $data['class_id'] ?? '',
                    // Required fields for PayHere
                    'recurrence' => '',
                    'duration' => '',
                    'startup_fee' => '',
                    'platform' => 'WEB',
                    // PayHere hash
                    'hash' => $hash
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to create PayHere payment: ' . $e->getMessage()
            ];
        }
    }
    

    
    private function simulatePaymentSuccess($orderId, $data) {
        try {
            // Update payment status to paid
            $stmt = $this->mysqli->prepare("UPDATE financial_records SET status = 'paid' WHERE transaction_id = ?");
            $stmt->bind_param("s", $orderId);
            $stmt->execute();
            
            // Create enrollment in class backend
            $this->createEnrollmentInClassBackend($orderId, $data);
            
        } catch (Exception $e) {
            error_log("Failed to simulate payment success: " . $e->getMessage());
        }
    }
    
    private function createEnrollmentInClassBackend($orderId, $data) {
        try {
            $studentId = $data['student_id'] ?? '';
            $classId = $data['class_id'] ?? '';
            
            if ($studentId && $classId) {
                $enrollmentData = [
                    'student_id' => $studentId,
                    'class_id' => $classId,
                    'payment_status' => 'paid',
                    'total_fee' => $data['amount'] ?? 0,
                    'paid_amount' => $data['amount'] ?? 0
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
                
                if ($response !== FALSE) {
                    error_log("Enrollment created successfully for order: " . $orderId);
                } else {
                    error_log("Failed to create enrollment for order: " . $orderId);
                }
            }
        } catch (Exception $e) {
            error_log("Error creating enrollment: " . $e->getMessage());
        }
    }
    
    public function handlePayHereNotification($postData) {
        try {
            // Verify the payment using the working method from your other project
            $localHash = strtoupper(
                md5(
                    $postData['merchant_id'] .
                    $postData['order_id'] .
                    $postData['payhere_amount'] .
                    $postData['payhere_currency'] .
                    $postData['status_code'] .
                    strtoupper(md5($this->merchantSecret))
                )
            );

            if($localHash != $postData['md5sig']) {
                return ['status' => 'error', 'message' => 'Invalid hash'];
            }

            // Update payment status in database
            $orderId = $postData['order_id'] ?? '';
            $statusCode = $postData['status_code'] ?? '';
            
            if ($statusCode === '2') { // Payment successful
                $this->updatePaymentStatus($orderId, 'paid');
                return ['status' => 'success', 'message' => 'Payment processed successfully'];
            } else {
                $this->updatePaymentStatus($orderId, 'failed');
                return ['status' => 'error', 'message' => 'Payment failed'];
            }
        } catch (Exception $e) {
            return ['status' => 'error', 'message' => 'Notification processing failed: ' . $e->getMessage()];
        }
    }

    public function getPaymentStatus($orderId) {
        try {
            // FIRST: Check if this is a study pack purchase (NEW SINGLE-TABLE SYSTEM)
            $studyPackStmt = $this->mysqli->prepare("
                SELECT 
                    transaction_id as order_id,
                    amount,
                    payment_status as status,
                    'online' as payment_method,
                    transaction_id as reference_number,
                    notes,
                    purchase_date as created_at,
                    person_name,
                    class_name,
                    study_pack_id as class_id,
                    'study_pack' as category
                FROM student_purchases 
                WHERE transaction_id = ?
            ");
            $studyPackStmt->bind_param("s", $orderId);
            $studyPackStmt->execute();
            $studyPackResult = $studyPackStmt->get_result();
            
            if ($studyPackRow = $studyPackResult->fetch_assoc()) {
                // This is a study pack purchase - return data from student_purchases table
                // Parse person_name to get first_name and last_name
                $nameParts = explode(' ', $studyPackRow['person_name'], 2);
                $firstName = $nameParts[0] ?? '';
                $lastName = $nameParts[1] ?? '';
                
                // Parse student details from notes
                $email = '';
                $mobile = '';
                $address = '';
                $district = '';
                
                if ($studyPackRow['notes']) {
                    $notes = $studyPackRow['notes'];
                    // Extract student details from notes
                    if (preg_match('/Email:\s*([^\s,|]+)/', $notes, $emailMatch)) {
                        $email = $emailMatch[1];
                    }
                    if (preg_match('/Mobile:\s*([^\s,|]+)/', $notes, $mobileMatch)) {
                        $mobile = $mobileMatch[1];
                    }
                    if (preg_match('/Address:\s*([^,|]+)/', $notes, $addressMatch)) {
                        $address = trim($addressMatch[1]);
                    }
                    if (preg_match('/District:\s*([^\s,|]+)/', $notes, $districtMatch)) {
                        $district = $districtMatch[1];
                    }
                }
                
                return [
                    'order_id' => $studyPackRow['order_id'],
                    'amount' => $studyPackRow['amount'],
                    'status' => $studyPackRow['status'],
                    'payment_method' => $studyPackRow['payment_method'],
                    'reference_number' => $studyPackRow['reference_number'],
                    'notes' => $studyPackRow['notes'],
                    'created_at' => $studyPackRow['created_at'],
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'email' => $email,
                    'phone' => $mobile,
                    'address' => $address,
                    'city' => $district,
                    'class_name' => $studyPackRow['class_name'],
                    'class_id' => $studyPackRow['class_id'],
                    'category' => 'study_pack'
                ];
            }
            
            // SECOND: Check financial_records for class enrollments
            $stmt = $this->mysqli->prepare("
                SELECT 
                    transaction_id as order_id,
                    amount,
                    status,
                    payment_method,
                    reference_number,
                    notes,
                    date as created_at,
                    person_name,
                    class_name,
                    class_id,
                    category
                FROM financial_records 
                WHERE transaction_id = ?
            ");
            $stmt->bind_param("s", $orderId);
            $stmt->execute();
            $result = $stmt->get_result();
            
                            if ($row = $result->fetch_assoc()) {
                    // Parse person_name to get first_name and last_name
                    $nameParts = explode(' ', $row['person_name'], 2);
                    $firstName = $nameParts[0] ?? '';
                    $lastName = $nameParts[1] ?? '';
                    
                    // Parse student details from notes
                    $email = '';
                    $mobile = '';
                    $address = '';
                    $district = '';
                    
                    if ($row['notes']) {
                        $notes = $row['notes'];
                        // Extract student details from notes
                        if (preg_match('/Email: ([^,|]+)/', $notes, $matches)) {
                            $email = trim($matches[1]);
                        }
                        if (preg_match('/Mobile: ([^,|]+)/', $notes, $matches)) {
                            $mobile = trim($matches[1]);
                        }
                        if (preg_match('/Address: ([^,|]+)/', $notes, $matches)) {
                            $address = trim($matches[1]);
                        }
                        if (preg_match('/District: ([^,|]+)/', $notes, $matches)) {
                            $district = trim($matches[1]);
                        }
                        // Override with actual student details if available
                        if (preg_match('/First Name: ([^,|]+)/', $notes, $matches)) {
                            $firstName = trim($matches[1]);
                        }
                        if (preg_match('/Last Name: ([^,|]+)/', $notes, $matches)) {
                            $lastName = trim($matches[1]);
                        }
                    }
                    
                    return [
                        'order_id' => $row['order_id'],
                        'amount' => $row['amount'],
                        'status' => $row['status'],
                        'payment_method' => $row['payment_method'],
                        'reference_number' => $row['reference_number'],
                        'notes' => $row['notes'],
                        'created_at' => $row['created_at'],
                        'first_name' => $firstName,
                        'last_name' => $lastName,
                        'email' => $email,
                        'phone' => $mobile,
                        'address' => $address,
                        'city' => $district,
                        'class_name' => $row['class_name'],
                        'class_id' => $row['class_id'],
                        'currency' => 'LKR'
                    ];
                }
            
            return 'not_found';
        } catch (Exception $e) {
            error_log("Error getting payment status: " . $e->getMessage());
            return 'error';
        }
    }
    
    private function updatePaymentStatus($orderId, $status) {
        try {
            // Update financial_records table (where payments are actually stored)
            $stmt = $this->mysqli->prepare("UPDATE financial_records SET status = ?, updated_at = NOW() WHERE transaction_id = ?");
            $stmt->bind_param("ss", $status, $orderId);
            $stmt->execute();
            
            // Also update payments table if it exists (for backward compatibility)
            $stmt2 = $this->mysqli->prepare("UPDATE payments SET payment_status = ?, updated_at = NOW() WHERE order_id = ?");
            $stmt2->bind_param("ss", $status, $orderId);
            $stmt2->execute();
            
            error_log("Payment status updated to '$status' for order: $orderId");
        } catch (Exception $e) {
            error_log("Failed to update payment status: " . $e->getMessage());
        }
    }
}

?> 

<?php
/**
 * WhatsApp Notification Helper
 * Sends payment confirmation messages to students via WhatsApp
 */

class WhatsAppNotificationHelper {
    private $apiUrl = 'https://down-south-front-end.onrender.com/send_otp';

    /**
     * Format phone number for WhatsApp API
     */
    private function formatPhoneNumber($phone) {
        // Remove any spaces or special characters
        $phone = preg_replace('/[^0-9]/', '', $phone);
        
        // Convert to international format (94xxxxxxxxx)
        if (strlen($phone) === 10 && substr($phone, 0, 1) === '0') {
            return '94' . substr($phone, 1);
        } elseif (strlen($phone) === 9) {
            return '94' . $phone;
        } elseif (strlen($phone) === 11 && substr($phone, 0, 2) === '94') {
            return $phone;
        } elseif (strlen($phone) === 10 && substr($phone, 0, 1) === '7') {
            return '94' . $phone;
        }
        
        return $phone;
    }

    /**
     * Send WhatsApp message
     */
    private function sendMessage($phoneNumber, $message) {
        try {
            $formattedPhone = $this->formatPhoneNumber($phoneNumber);
            
            $postData = json_encode([
                'phoneNumber' => $formattedPhone,
                'otp' => $message // Using 'otp' field for the message content
            ]);

            $ch = curl_init($this->apiUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($postData)
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10); // 10 seconds timeout

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

            if (curl_errno($ch)) {
                error_log('WhatsApp cURL Error: ' . curl_error($ch));
                curl_close($ch);
                return false;
            }

            curl_close($ch);

            $result = json_decode($response, true);
            return ($httpCode === 200 && isset($result['success']) && $result['success']);

        } catch (Exception $e) {
            error_log('WhatsApp Exception: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Send Monthly Fee Payment Confirmation
     */
    public function sendMonthlyFeeConfirmation($studentData, $paymentData, $classData) {
        $message = "💰 Payment Received - TCMS\n\n";
        $message .= "Dear {$studentData['firstName']} {$studentData['lastName']},\n\n";
        $message .= "Your monthly fee payment has been successfully received.\n\n";
        $message .= "📋 Payment Details:\n";
        $message .= "━━━━━━━━━━━━━━━━\n";
        $message .= "Receipt No: {$paymentData['transactionId']}\n";
        $message .= "Date: " . date('d M Y, h:i A') . "\n";
        $message .= "Class: {$classData['class_name']}\n";
        $message .= "Subject: {$classData['subject']}\n";
        $message .= "Amount Paid: LKR " . number_format($paymentData['amount'], 2) . "\n";
        $message .= "Payment Method: " . ucfirst($paymentData['paymentMethod']) . "\n";
        
        if (isset($paymentData['discount']) && $paymentData['discount'] > 0) {
            $message .= "Discount: LKR " . number_format($paymentData['discount'], 2) . "\n";
        }
        
        $message .= "\n✅ Payment Status: Confirmed\n";
        $message .= "📱 Student ID: {$studentData['studentId']}\n\n";
        $message .= "Thank you for your payment!\n";
        $message .= "- TCMS Management";

        return $this->sendMessage($studentData['mobile'], $message);
    }

    /**
     * Send Admission Fee Payment Confirmation
     */
    public function sendAdmissionFeeConfirmation($studentData, $paymentData) {
        $message = "🎉 Admission Fee Paid - TCMS\n\n";
        $message .= "Dear {$studentData['firstName']} {$studentData['lastName']},\n\n";
        $message .= "Congratulations! Your admission fee has been successfully paid.\n\n";
        $message .= "📋 Payment Details:\n";
        $message .= "━━━━━━━━━━━━━━━━\n";
        $message .= "Receipt No: {$paymentData['transactionId']}\n";
        $message .= "Date: " . date('d M Y, h:i A') . "\n";
        $message .= "Payment Type: Admission Fee\n";
        $message .= "Amount Paid: LKR " . number_format($paymentData['amount'], 2) . "\n";
        $message .= "Payment Method: " . ucfirst($paymentData['paymentMethod']) . "\n";
        $message .= "\n✅ Admission Confirmed\n";
        $message .= "📱 Student ID: {$studentData['studentId']}\n\n";
        $message .= "You can now enroll in classes!\n";
        $message .= "- TCMS Management";

        return $this->sendMessage($studentData['mobile'], $message);
    }

    /**
     * Send New Enrollment Payment Confirmation (with first month + admission fee)
     */
    public function sendEnrollmentPaymentConfirmation($studentData, $paymentData, $classData, $admissionFeePaid = false) {
        $message = "🎓 Enrollment Confirmed - TCMS\n\n";
        $message .= "Dear {$studentData['firstName']} {$studentData['lastName']},\n\n";
        $message .= "You have been successfully enrolled!\n\n";
        $message .= "📋 Payment Details:\n";
        $message .= "━━━━━━━━━━━━━━━━\n";
        $message .= "Receipt No: {$paymentData['transactionId']}\n";
        $message .= "Date: " . date('d M Y, h:i A') . "\n";
        $message .= "Class: {$classData['class_name']}\n";
        $message .= "Subject: {$classData['subject']}\n";
        
        if ($admissionFeePaid) {
            $message .= "\n💵 Payment Breakdown:\n";
            $message .= "• First Month Fee: LKR " . number_format($paymentData['monthlyFee'], 2) . "\n";
            $message .= "• Admission Fee: LKR " . number_format($paymentData['admissionFee'], 2) . "\n";
            $message .= "━━━━━━━━━━━━━━━━\n";
        }
        
        $message .= "Total Amount Paid: LKR " . number_format($paymentData['amount'], 2) . "\n";
        $message .= "Payment Method: " . ucfirst($paymentData['paymentMethod']) . "\n";
        
        if (isset($paymentData['discount']) && $paymentData['discount'] > 0) {
            $message .= "Discount Applied: LKR " . number_format($paymentData['discount'], 2) . "\n";
        }
        
        $message .= "\n✅ Enrollment Status: Active\n";
        $message .= "📱 Student ID: {$studentData['studentId']}\n\n";
        $message .= "Welcome to the class!\n";
        $message .= "- TCMS Management";

        return $this->sendMessage($studentData['mobile'], $message);
    }

    /**
     * Send Payment Receipt (Generic)
     */
    public function sendPaymentReceipt($studentData, $paymentData, $additionalInfo = '') {
        $message = "💰 Payment Receipt - TCMS\n\n";
        $message .= "Dear {$studentData['firstName']} {$studentData['lastName']},\n\n";
        $message .= "Payment received successfully.\n\n";
        $message .= "📋 Receipt Details:\n";
        $message .= "━━━━━━━━━━━━━━━━\n";
        $message .= "Receipt No: {$paymentData['transactionId']}\n";
        $message .= "Date: " . date('d M Y, h:i A') . "\n";
        $message .= "Amount: LKR " . number_format($paymentData['amount'], 2) . "\n";
        $message .= "Method: " . ucfirst($paymentData['paymentMethod']) . "\n";
        
        if ($additionalInfo) {
            $message .= "\n" . $additionalInfo . "\n";
        }
        
        $message .= "\n✅ Status: Confirmed\n";
        $message .= "📱 Student ID: {$studentData['studentId']}\n\n";
        $message .= "Thank you!\n";
        $message .= "- TCMS Management";

        return $this->sendMessage($studentData['mobile'], $message);
    }

    /**
     * Send Partial Payment Confirmation
     */
    public function sendPartialPaymentConfirmation($studentData, $paymentData, $classData, $remainingBalance) {
        $message = "💵 Partial Payment Received - TCMS\n\n";
        $message .= "Dear {$studentData['firstName']} {$studentData['lastName']},\n\n";
        $message .= "Your partial payment has been recorded.\n\n";
        $message .= "📋 Payment Details:\n";
        $message .= "━━━━━━━━━━━━━━━━\n";
        $message .= "Receipt No: {$paymentData['transactionId']}\n";
        $message .= "Date: " . date('d M Y, h:i A') . "\n";
        $message .= "Class: {$classData['class_name']}\n";
        $message .= "Amount Paid: LKR " . number_format($paymentData['amount'], 2) . "\n";
        $message .= "Remaining Balance: LKR " . number_format($remainingBalance, 2) . "\n";
        $message .= "Payment Method: " . ucfirst($paymentData['paymentMethod']) . "\n";
        $message .= "\n⚠️ Please pay the remaining balance soon.\n";
        $message .= "📱 Student ID: {$studentData['studentId']}\n\n";
        $message .= "Thank you!\n";
        $message .= "- TCMS Management";

        return $this->sendMessage($studentData['mobile'], $message);
    }
}

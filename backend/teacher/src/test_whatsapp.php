<?php

require_once 'WhatsAppService.php';

// Test WhatsApp service
try {
    $whatsappService = new WhatsAppService();
    
    // Test data
    $testPhone = '0712345678'; // Replace with your test phone number
    $testTeacherId = 'T001';
    $testTeacherName = 'John Doe';
    $testPassword = 'TestPass123!';
    
    echo "Testing WhatsApp service...\n";
    echo "Phone: $testPhone\n";
    echo "Teacher ID: $testTeacherId\n";
    echo "Teacher Name: $testTeacherName\n";
    echo "Password: $testPassword\n\n";
    
    $result = $whatsappService->sendTeacherCredentials(
        $testPhone,
        $testTeacherId,
        $testTeacherName,
        $testPassword
    );
    
    echo "Result:\n";
    echo "Success: " . ($result['success'] ? 'Yes' : 'No') . "\n";
    echo "Message: " . $result['message'] . "\n";
    
    if (isset($result['message_sid'])) {
        echo "Message SID: " . $result['message_sid'] . "\n";
    }
    
    if (isset($result['http_code'])) {
        echo "HTTP Code: " . $result['http_code'] . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

?> 
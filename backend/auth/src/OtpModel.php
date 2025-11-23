<?php
class OtpModel {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Generate and store OTP
    public function createOtp($mobile, $purpose = 'registration') {
        // Clean up expired OTPs first
        $this->cleanupExpiredOtps();
        
        // Check if there's already an unexpired OTP for this mobile
        $existingOtp = $this->getActiveOtp($mobile, $purpose);
        if ($existingOtp) {
            // Update existing OTP instead of creating new one
            $otp = rand(100000, 999999);
            $expiresAt = date('Y-m-d H:i:s', time() + 300); // 5 minutes
            
            $stmt = $this->conn->prepare("
                UPDATE otp_codes 
                SET otp_code = ?, expires_at = ?, attempts = 0, verified = FALSE, updated_at = NOW()
                WHERE mobile = ? AND purpose = ? AND expires_at > NOW()
            ");
            $stmt->bind_param("ssss", $otp, $expiresAt, $mobile, $purpose);
            
            if ($stmt->execute()) {
                return $otp;
            }
            return false;
        }
        
        // Create new OTP
        $otp = rand(100000, 999999);
        $expiresAt = date('Y-m-d H:i:s', time() + 300); // 5 minutes
        
        $stmt = $this->conn->prepare("
            INSERT INTO otp_codes (mobile, otp_code, purpose, expires_at) 
            VALUES (?, ?, ?, ?)
        ");
        $stmt->bind_param("ssss", $mobile, $otp, $purpose, $expiresAt);
        
        if ($stmt->execute()) {
            return $otp;
        }
        return false;
    }

    // Get active OTP for mobile and purpose
    public function getActiveOtp($mobile, $purpose = 'registration') {
        $stmt = $this->conn->prepare("
            SELECT * FROM otp_codes 
            WHERE mobile = ? AND purpose = ? AND expires_at > NOW() AND verified = FALSE
            ORDER BY created_at DESC 
            LIMIT 1
        ");
        $stmt->bind_param("ss", $mobile, $purpose);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }

    // Verify OTP
    public function verifyOtp($mobile, $otp, $purpose = 'registration') {
        $otpData = $this->getActiveOtp($mobile, $purpose);
        
        if (!$otpData) {
            return [
                'success' => false,
                'message' => 'OTP not found or expired. Please request a new OTP.'
            ];
        }
        
        // Check if max attempts reached
        if ($otpData['attempts'] >= $otpData['max_attempts']) {
            return [
                'success' => false,
                'message' => 'Too many failed attempts. Please request a new OTP.'
            ];
        }
        
        // Check if OTP matches
        if ($otpData['otp_code'] === $otp) {
            // Mark as verified
            $stmt = $this->conn->prepare("
                UPDATE otp_codes 
                SET verified = TRUE, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->bind_param("i", $otpData['id']);
            $stmt->execute();
            
            return [
                'success' => true,
                'message' => 'OTP verified successfully!'
            ];
        } else {
            // Increment attempts
            $stmt = $this->conn->prepare("
                UPDATE otp_codes 
                SET attempts = attempts + 1, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->bind_param("i", $otpData['id']);
            $stmt->execute();
            
            $remainingAttempts = $otpData['max_attempts'] - ($otpData['attempts'] + 1);
            
            return [
                'success' => false,
                'message' => 'Invalid OTP code. ' . $remainingAttempts . ' attempts remaining.'
            ];
        }
    }

    // Check if mobile is verified
    public function isMobileVerified($mobile, $purpose = 'registration') {
        $stmt = $this->conn->prepare("
            SELECT COUNT(*) as count FROM otp_codes 
            WHERE mobile = ? AND purpose = ? AND verified = TRUE
        ");
        $stmt->bind_param("ss", $mobile, $purpose);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        return $row['count'] > 0;
    }

    // Clean up expired OTPs
    public function cleanupExpiredOtps() {
        $stmt = $this->conn->prepare("
            DELETE FROM otp_codes 
            WHERE expires_at <= NOW()
        ");
        return $stmt->execute();
    }

    // Get OTP statistics
    public function getOtpStats($mobile) {
        $stmt = $this->conn->prepare("
            SELECT 
                COUNT(*) as total_otps,
                COUNT(CASE WHEN verified = TRUE THEN 1 END) as verified_otps,
                COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_otps,
                MAX(created_at) as last_otp_time
            FROM otp_codes 
            WHERE mobile = ?
        ");
        $stmt->bind_param("s", $mobile);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }
}

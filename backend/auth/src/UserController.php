
<?php
// Set timezone for all date/time operations
date_default_timezone_set('Asia/Colombo');

require_once __DIR__ . '/UserModel.php';
require_once __DIR__ . '/RateLimiter.php';

require_once __DIR__ . '/vendor/autoload.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class UserController {
    private $db;
    private $rateLimiter;

    public function __construct($db) {
        $this->db = $db;
        $this->rateLimiter = new RateLimiter($db);
    }

    public function register($role, $password, $studentData = null) {
        $user = new UserModel($this->db);
        if ($user->createUser($role, $password)) {
            $userid = $user->userid;
            
            // Sync user to RBAC system (non-blocking)
            $rbacSyncData = [
                'userid' => $userid,
                'role' => $role,
                'firstName' => $role === 'admin' ? 'Admin User ' . $userid : $userid, // Use more descriptive name for admin users
                'lastName' => '', // Empty lastName for admin users
                'email' => '' // Admin users may not have email in basic registration
            ];
            
            // Call RBAC backend to create user (don't block on failure)
            $rbacResponse = @file_get_contents('http://rbac-backend:80/users', false, stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => 'Content-Type: application/json',
                    'content' => json_encode($rbacSyncData)
                ]
            ]));
            
            $rbacSyncSuccess = false;
            if ($rbacResponse !== false) {
                $rbacResult = json_decode($rbacResponse, true);
                $rbacSyncSuccess = isset($rbacResult['success']) && $rbacResult['success'];
            }
            
            // Enhanced response for better user experience
            $response = [
                'success' => true,
                'userid' => $userid,
                'role' => $user->role,
                'message' => 'Account created successfully in TCMS',
                'system' => 'TCMS (Tuition Class Management System)',
                'timestamp' => date('Y-m-d H:i:s'),
                'status' => 'active'
            ];
            
            // Add student-specific information if available
            if ($studentData && isset($studentData['firstName']) && isset($studentData['lastName'])) {
                $response['studentName'] = $studentData['firstName'] . ' ' . $studentData['lastName'];
                $response['welcomeMessage'] = "Welcome {$studentData['firstName']}! Your account has been successfully created.";
            }
            
            return json_encode($response);
        } else {
            return json_encode(['success' => false, 'message' => 'User creation failed']);
        }
    }

    // Send welcome WhatsApp message after successful registration
    public function sendWelcomeWhatsAppMessage($userid, $studentData) {
        try {
            // Create a welcome message in the specified format
            $welcomeMessage = "🎉 Registration Successful!\n" .
                "Welcome to TCMS (Tuition Class Management System)\n\n" .
                "Student ID: " . $userid . "\n" .
                "Full Name: " . $studentData['firstName'] . " " . $studentData['lastName'] . "\n\n" .
                
                "Next Steps:\n" .
                "• Your account has been successfully created in TCMS\n" .
                "• If Online registered student, You can now login using your Student ID and password\n" .
                "• If Physical registered student, For security, please reset your password using 'Forgot Password'\n\n" .
                "Account Status:\n" .
                "✅ Account Created | ✅ Mobile Verified | ✅ Ready for Login";

            // Format phone number for external service
            $mobile = $studentData['mobile'];
            $formatted_phone = $mobile;
            if (strlen($mobile) === 10 && substr($mobile, 0, 1) === '0') {
                $formatted_phone = '94' . substr($mobile, 1);
            } elseif (strlen($mobile) === 9 && substr($mobile, 0, 1) === '0') {
                $formatted_phone = '94' . substr($mobile, 1);
            } elseif (strlen($mobile) === 11 && substr($mobile, 0, 2) === '94') {
                $formatted_phone = $mobile;
            } elseif (strlen($mobile) === 10 && substr($mobile, 0, 1) === '7') {
                $formatted_phone = '94' . $mobile;
            }

            // Send the welcome message using the message as OTP field (like teacher creation)
            $postData = json_encode([
                'phoneNumber' => $formatted_phone,
                'otp' => $welcomeMessage // Using the message as OTP field for welcome message
            ]);

            $ch = curl_init('https://down-south-front-end.onrender.com/send_otp');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($postData)
            ]);

            $response = curl_exec($ch);

            if (curl_errno($ch)) {
                    return json_encode([
                        'success' => false, 
                    'message' => 'cURL Error: ' . curl_error($ch)
                    ]);
            }
            
            $result = json_decode($response, true);
            
            if ($result && isset($result['success']) && $result['success']) {
            return json_encode([
                'success' => true,
                    'message' => 'Welcome WhatsApp message sent successfully'
            ]);
        } else {
                return json_encode([
                    'success' => false,
                    'message' => 'Failed to send welcome WhatsApp message: ' . ($result['message'] ?? 'Unknown error')
                ]);
            }
        } catch (Exception $e) {
            return json_encode([
                'success' => false,
                'message' => 'Error sending welcome WhatsApp message: ' . $e->getMessage()
            ]);
        }
    }


    

    // Read user by ID
    public function getUser($userid) {
        $user = new UserModel($this->db);
        $userData = $user->getUserById($userid);
        if ($userData) {
            return json_encode(['success' => true, 'user' => $userData]);
        } else {
            return json_encode(['success' => false, 'message' => 'User not found']);
        }
    }

    // Update user by ID
    public function updateUser($userid, $role = null, $password = null, $otp = null) {
        $user = new UserModel($this->db);
        $result = $user->updateUser($userid, $role, $password, $otp);
        if ($result) {
            return json_encode(['success' => true, 'message' => 'User updated successfully']);
        } else {
            return json_encode(['success' => false, 'message' => 'User update failed']);
        }
    }

    // Delete user by ID
    public function deleteUser($userid) {
        try {
            // Start transaction
            $this->db->begin_transaction();
            
            // Delete from users table (for all users)
        $user = new UserModel($this->db);
        $result = $user->deleteUser($userid);
            
        if ($result) {
                // Commit transaction
                $this->db->commit();
            return json_encode(['success' => true, 'message' => 'User deleted successfully']);
        } else {
                // Rollback transaction
                $this->db->rollback();
            return json_encode(['success' => false, 'message' => 'User deletion failed']);
        }
        } catch (Exception $e) {
            // Rollback transaction on error
            $this->db->rollback();
            return json_encode(['success' => false, 'message' => 'Failed to delete user: ' . $e->getMessage()]);
    }
    }
    



    // Get all users
    public function getAllUsers() {
        $user = new UserModel($this->db);
        $users = $user->getAllUsers();
        if ($users !== false) {
            return json_encode(['success' => true, 'users' => $users]);
        } else {
            return json_encode(['success' => false, 'message' => 'Failed to fetch users']);
        }
    }
    // Login user
    public function login($userid, $password) {
        // Check if user is locked out
        if ($this->rateLimiter->isLockedOut($userid)) {
            $this->rateLimiter->recordAttempt($userid, 0);
            return json_encode([
                'success' => false, 
                'message' => 'Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.'
            ]);
        }

        // Check if student is blocked - do this BEFORE any other processing
        if ($userid && $userid[0] === 'S') { // Check if it's a student
            // Call student backend to check if student is blocked
            $url = "http://student-backend/routes.php/student-blocked/$userid";
            $response = file_get_contents($url);
            if ($response !== FALSE) {
                $blockedData = json_decode($response, true);
                if (isset($blockedData['blocked']) && $blockedData['blocked']) {
                    // Record failed login attempt for blocked student
                    $this->rateLimiter->recordAttempt($userid, 0);
                return json_encode([
                    'success' => false,
                    'message' => 'Your account has been blocked by the administrator. Please contact support for assistance.'
                ]);
                }
            }
        }
        
        $user = new UserModel($this->db);
        $userData = $user->getUserById($userid);
        if ($userData && password_verify($password, $userData['password'])) {
            // Remove password from response
            unset($userData['password']);
            
            // If user is a student, get complete student data
            if ($userData['role'] === 'student') {
                $stmt = $this->db->prepare("
                    SELECT 
                        u.userid,
                        u.role,
                        COALESCE(s.firstName, '') as firstName,
                        COALESCE(s.lastName, '') as lastName,
                        COALESCE(s.email, '') as email,
                        COALESCE(s.mobile, '') as mobile,
                        COALESCE(s.nic, '') as nic,
                        COALESCE(s.gender, '') as gender,
                        COALESCE(s.age, '') as age,
                        COALESCE(s.parentName, '') as parentName,
                        COALESCE(s.parentMobile, '') as parentMobile,
                        COALESCE(s.stream, '') as stream,
                        COALESCE(s.dateOfBirth, '') as dateOfBirth,
                        COALESCE(s.school, '') as school,
                        COALESCE(s.address, '') as address,
                        COALESCE(s.district, '') as district,
                        COALESCE(s.dateJoined, '') as dateJoined,
                        COALESCE(b.barcode_data, '') as barcodeData,
                        COALESCE(b.created_at, '') as barcodeCreatedAt
                    FROM users u
                    LEFT JOIN students s ON u.userid = s.userid
                    LEFT JOIN barcodes b ON u.userid = b.userid
                    WHERE u.userid = ?
                ");
                $stmt->bind_param("s", $userid);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result->num_rows === 1) {
                    $userData = $result->fetch_assoc();
                }
            }
            

            
            // Generate access token (short-lived: 15 minutes)
            $secretKey = 'your_secret_key_here';
            $accessPayload = [
                'userid' => $userData['userid'],
                'role' => $userData['role'],
                'iat' => time(),
                'exp' => time() + (15 * 60) // 15 minutes expiry
            ];
            $accessToken = JWT::encode($accessPayload, $secretKey, 'HS256');
            
            // Generate refresh token (long-lived: 7 days)
            $refreshToken = $this->generateRefreshToken();
            
            // Store refresh token in database
            $this->storeRefreshToken($userData['userid'], $refreshToken);
            
            // Record successful login attempt
            $this->rateLimiter->recordAttempt($userData['userid'], 1);
            
            // Track student login activity for monitoring
            if ($userData['role'] === 'student') {
                $sessionId = uniqid('session_', true);
                $ipAddress = $this->getClientIP();
                $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
                $loginTime = date('Y-m-d H:i:s');
                
                // Call student backend to track login activity
                $trackingData = [
                    'studentId' => $userData['userid'],
                    'ipAddress' => $ipAddress,
                    'userAgent' => $userAgent,
                    'sessionId' => $sessionId,
                    'loginTime' => $loginTime
                ];
                
                $url = "http://student-backend/routes.php/track-student-login";
                
                // Pass through the original User-Agent header
                $headers = ['Content-Type: application/json'];
                if (isset($_SERVER['HTTP_USER_AGENT'])) {
                    $headers[] = 'User-Agent: ' . $_SERVER['HTTP_USER_AGENT'];
                }
                
                file_get_contents($url, false, stream_context_create([
                    'http' => [
                        'method' => 'POST',
                        'header' => implode("\r\n", $headers),
                        'content' => json_encode($trackingData)
                    ]
                ]));
            }
            
            return json_encode([
                'success' => true,
                'user' => $userData,
                'accessToken' => $accessToken,
                'refreshToken' => $refreshToken,
                'sessionId' => $sessionId ?? null
            ]);
        } else {
            // Record failed login attempt
            $this->rateLimiter->recordAttempt($userid, 0);
            $remainingAttempts = $this->rateLimiter->getRemainingAttempts($userid);
            
            $message = 'Invalid userid or password';
            if ($remainingAttempts <= 2) {
                $message .= ". {$remainingAttempts} attempts remaining before account lockout.";
            }
            
            return json_encode(['success' => false, 'message' => $message]);
        }
    }
    
    // Refresh access token
    public function refreshToken($refreshToken) {
        // Validate refresh token
        $stmt = $this->db->prepare("SELECT userid, role FROM refresh_tokens WHERE token = ? AND expires_at > NOW()");
        $stmt->bind_param("s", $refreshToken);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 1) {
            $tokenData = $result->fetch_assoc();
            
            // Generate new access token
            $secretKey = 'your_secret_key_here';
            $accessPayload = [
                'userid' => $tokenData['userid'],
                'role' => $tokenData['role'],
                'iat' => time(),
                'exp' => time() + (15 * 60) // 15 minutes expiry
            ];
            $newAccessToken = JWT::encode($accessPayload, $secretKey, 'HS256');
            
            return json_encode([
                'success' => true,
                'accessToken' => $newAccessToken,
                'user' => [
                    'userid' => $tokenData['userid'],
                    'role' => $tokenData['role']
                ]
            ]);
        }
        
        return json_encode(['success' => false, 'message' => 'Invalid or expired refresh token']);
    }
    
    // Logout user (invalidate refresh token)
    public function logout($refreshToken) {
        // Remove refresh token from database
        $stmt = $this->db->prepare("DELETE FROM refresh_tokens WHERE token = ?");
        $stmt->bind_param("s", $refreshToken);
        $stmt->execute();
        
        return json_encode(['success' => true, 'message' => 'Logged out successfully']);
        }
    
    private function generateRefreshToken() {
        return bin2hex(random_bytes(32));
    }
    
    private function storeRefreshToken($userid, $refreshToken) {
        // Remove any existing refresh tokens for this user
        $stmt = $this->db->prepare("DELETE FROM refresh_tokens WHERE userid = ?");
        $stmt->bind_param("s", $userid);
        $stmt->execute();
        
        // Store new refresh token (expires in 7 days)
        $expiresAt = date('Y-m-d H:i:s', time() + (7 * 24 * 60 * 60));
        $stmt = $this->db->prepare("INSERT INTO refresh_tokens (userid, token, expires_at) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $userid, $refreshToken, $expiresAt);
        $stmt->execute();
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
    // Validate JWT token
    public function validateToken($token) {
        $secretKey = 'your_secret_key_here'; // Use the same key as in login
        try {
            $decoded = JWT::decode($token, new Key($secretKey, 'HS256'));
            
            // Check if user is blocked (for students)
            if (isset($decoded->role) && $decoded->role === 'student') {
                $monitoring = new StudentMonitoringModel($this->db);
                if ($monitoring->isStudentBlocked($decoded->userid)) {
                    return json_encode([
                        'success' => false,
                        'message' => 'Your account has been blocked by the administrator. Please contact support for assistance.',
                        'blocked' => true
                    ]);
                }
            }
            
            return json_encode([
                'success' => true,
                'data' => (array)$decoded
            ]);
        } catch (\Exception $e) {
            return json_encode([
                'success' => false,
                'message' => 'Invalid or expired token',
                'error' => $e->getMessage()
            ]);
        }
    }
    // OTP request for forgot password
    public function forgotPasswordRequestOtp($userid) {
        // Check if this is a teacher ID (starts with 'T' followed by numbers)
        $isTeacherId = preg_match('/^T\d+$/', $userid);
        // Check if this is a teacher staff ID (starts with 'TS' followed by numbers)
        $isStaffId = preg_match('/^TS\d+$/', $userid);
        
        if ($isTeacherId) {
            // Handle teacher forgot password
            return $this->teacherForgotPasswordRequestOtp($userid);
        }

        if ($isStaffId) {
            // Handle teacher_staff forgot password
            return $this->staffForgotPasswordRequestOtp($userid);
        }
        
        // Handle student forgot password (existing logic)
    // Step 1: Call internal student API to get details by user_id
    $url = "http://host.docker.internal:8086/routes.php/get_with_id/$userid"; // Adjust if in Docker
    
    $response = file_get_contents($url);

    if ($response === FALSE) {
        return json_encode([
            'success' => false,
            'message' => "Failed to fetch student data for user ID: $userid"
        ]);
    }

    

    $userData = json_decode($response, true);

    // Step 2: Check if student data and mobile number exists
    if (!isset($userData['mobile_number'])) {
        return json_encode([
            'success' => false,
            'message' => "Mobile number not found for user ID: $userid"
        ]);
    }

    $phone_number = $userData['mobile_number'];

        // Format phone number for external service (remove leading 0 and add 94)
        $formatted_phone = $phone_number;
        if (strlen($phone_number) === 10 && substr($phone_number, 0, 1) === '0') {
            $formatted_phone = '94' . substr($phone_number, 1);
        } elseif (strlen($phone_number) === 9 && substr($phone_number, 0, 1) === '0') {
            $formatted_phone = '94' . substr($phone_number, 1);
        } elseif (strlen($phone_number) === 11 && substr($phone_number, 0, 2) === '94') {
            $formatted_phone = $phone_number;
        } elseif (strlen($phone_number) === 10 && substr($phone_number, 0, 1) === '7') {
            $formatted_phone = '94' . $phone_number;
        }

    // Step 3: Generate OTP
    $otp = rand(100000, 999999);

    // Step 4: Update OTP in your local database
    $user = new UserModel($this->db);
    $user->updateUser($userid, null, null, $otp);

    // Step 5: Send OTP to frontend endpoint
    $sendOtpUrl = 'https://down-south-front-end.onrender.com/send_otp';

    $postData = json_encode([
            'phoneNumber' => $formatted_phone,
        'otp' => (string)$otp
    ]);

    $ch = curl_init($sendOtpUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($postData)
    ]);

    $otpResponse = curl_exec($ch);

    if (curl_errno($ch)) {
        return json_encode([
            'success' => false,
            'message' => 'cURL Error: ' . curl_error($ch)
        ]);
    }

    $otpResponseData = json_decode($otpResponse, true);

    if ($otpResponseData === null) {
        return json_encode([
            'success' => false,
            'message' => 'Invalid JSON response from OTP service',
            'raw' => $otpResponse
        ]);
    }

        // Check if the external service was successful
        if (isset($otpResponseData['success']) && $otpResponseData['success'] === false) {
            return json_encode([
                'success' => false,
                'message' => 'OTP service error: ' . ($otpResponseData['message'] ?? 'Unknown error'),
                'service_response' => $otpResponseData,
                'otp' => $otp // Show OTP for testing purposes
        ]);
    }

    // Step 6: Return success
    return json_encode([
        'success' => true,
            'message' => 'OTP sent to ' . $phone_number,
            'otp' => $otp, // Show OTP for testing purposes
            'service_response' => $otpResponseData // Show service response for debugging
        ]);
    }

    // Teacher forgot password OTP request
    public function teacherForgotPasswordRequestOtp($userid) {
        try {
            // Step 1: Get teacher data from auth database
            $user = new UserModel($this->db);
            $teacherData = $user->getUserById($userid);
            
            if (!$teacherData || $teacherData['role'] !== 'teacher') {
                return json_encode([
                    'success' => false,
                    'message' => 'Teacher not found'
                ]);
            }
            
            if (empty($teacherData['phone'])) {
                return json_encode([
                    'success' => false,
                    'message' => 'Mobile number not found for teacher'
                ]);
            }
            
            $phone_number = $teacherData['phone'];
            
            // Step 2: Format phone number for external service
            $formatted_phone = $phone_number;
            if (strlen($phone_number) === 10 && substr($phone_number, 0, 1) === '0') {
                $formatted_phone = '94' . substr($phone_number, 1);
            } elseif (strlen($phone_number) === 9 && substr($phone_number, 0, 1) === '0') {
                $formatted_phone = '94' . substr($phone_number, 1);
            } elseif (strlen($phone_number) === 11 && substr($phone_number, 0, 2) === '94') {
                $formatted_phone = $phone_number;
            } elseif (strlen($phone_number) === 10 && substr($phone_number, 0, 1) === '7') {
                $formatted_phone = '94' . $phone_number;
            }
            
            // Step 3: Generate OTP
            $otp = rand(100000, 999999);
            
            // Step 4: Update OTP in auth database
            $user->updateUser($userid, null, null, $otp);
            
            // Step 5: Send OTP via external service
            $sendOtpUrl = 'https://down-south-front-end.onrender.com/send_otp';
            
            $postData = json_encode([
                'phoneNumber' => $formatted_phone,
                'otp' => (string)$otp
            ]);
            
            $ch = curl_init($sendOtpUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($postData)
            ]);
            
            $otpResponse = curl_exec($ch);
            
            if (curl_errno($ch)) {
                return json_encode([
                    'success' => true,
                    'message' => 'OTP generated successfully (External service failed: ' . curl_error($ch) . ')',
                    'otp' => $otp // Show OTP for testing since external service failed
                ]);
            }
            
            $otpResponseData = json_decode($otpResponse, true);
            
            if ($otpResponseData === null) {
                return json_encode([
                    'success' => true,
                    'message' => 'OTP generated successfully (Invalid response from external service)',
                    'otp' => $otp // Show OTP for testing
                ]);
            }
            
            // Check if external service failed
            if (isset($otpResponseData['success']) && !$otpResponseData['success']) {
                return json_encode([
                    'success' => true,
                    'message' => 'OTP generated successfully (External service failed: ' . ($otpResponseData['message'] ?? 'Unknown error') . ')',
                    'otp' => $otp // Show OTP for testing since external service failed
                ]);
            }
            
            // Step 6: Return success
            return json_encode([
                'success' => true,
                'message' => 'OTP sent to ' . $phone_number,
                'otp' => $otp // Show OTP for testing
            ]);
            
        } catch (Exception $e) {
            return json_encode([
                'success' => false,
                'message' => 'Error processing teacher forgot password request: ' . $e->getMessage()
            ]);
        }
    }

    // Staff (teacher_staff) forgot password OTP request
    public function staffForgotPasswordRequestOtp($staffId) {
        try {
            // Try multiple candidate URLs to fetch staff details from teacher backend
            $candidates = [];
            $envUrl = getenv('TEACHER_SERVICE_URL');
            if ($envUrl) $candidates[] = rtrim($envUrl, '/') . '/routes.php/staff/' . $staffId;
            $candidates[] = 'http://teacher-backend/routes.php/staff/' . $staffId;
            $candidates[] = 'http://host.docker.internal:8088/routes.php/staff/' . $staffId;
            $candidates[] = 'http://localhost:8088/routes.php/staff/' . $staffId;

            $staffResp = null;
            foreach ($candidates as $url) {
                try {
                    $resp = @file_get_contents($url);
                    if ($resp === false) continue;
                    $decoded = json_decode($resp, true);
                    if ($decoded && isset($decoded['success']) && $decoded['success'] && isset($decoded['data'])) {
                        $staffResp = $decoded['data'];
                        break;
                    }
                    // Some teacher backend endpoints may return the staff object directly
                    if ($decoded && isset($decoded['staffId'])) {
                        $staffResp = $decoded;
                        break;
                    }
                } catch (Exception $e) {
                    continue;
                }
            }

            if (!$staffResp) {
                return json_encode([
                    'success' => false,
                    'message' => 'Failed to fetch staff data for ID: ' . $staffId
                ]);
            }

            // Determine phone field (try common keys)
            $phone_number = $staffResp['phone'] ?? $staffResp['mobile'] ?? $staffResp['phone_number'] ?? '';
            if (empty($phone_number)) {
                return json_encode([
                    'success' => false,
                    'message' => 'Mobile number not found for staff ID: ' . $staffId
                ]);
            }

            // Format phone
            $formatted_phone = $phone_number;
            if (strlen($phone_number) === 10 && substr($phone_number, 0, 1) === '0') {
                $formatted_phone = '94' . substr($phone_number, 1);
            } elseif (strlen($phone_number) === 9 && substr($phone_number, 0, 1) === '0') {
                $formatted_phone = '94' . substr($phone_number, 1);
            } elseif (strlen($phone_number) === 11 && substr($phone_number, 0, 2) === '94') {
                $formatted_phone = $phone_number;
            } elseif (strlen($phone_number) === 10 && substr($phone_number, 0, 1) === '7') {
                $formatted_phone = '94' . $phone_number;
            }

            // Generate OTP
            $otp = rand(100000, 999999);

            // Update OTP in auth database for this staff user
            $user = new UserModel($this->db);
            $user->updateUser($staffId, null, null, $otp);

            // Send OTP via external service
            $sendOtpUrl = 'https://down-south-front-end.onrender.com/send_otp';
            $postData = json_encode([
                'phoneNumber' => $formatted_phone,
                'otp' => (string)$otp
            ]);

            $ch = curl_init($sendOtpUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($postData)
            ]);

            $otpResponse = curl_exec($ch);
            if (curl_errno($ch)) {
                return json_encode([
                    'success' => true,
                    'message' => 'OTP generated successfully (External service failed: ' . curl_error($ch) . ')',
                    'otp' => $otp
                ]);
            }

            $otpResponseData = json_decode($otpResponse, true);
            if ($otpResponseData === null) {
                return json_encode([
                    'success' => true,
                    'message' => 'OTP generated successfully (Invalid response from external service)',
                    'otp' => $otp
                ]);
            }

            if (isset($otpResponseData['success']) && !$otpResponseData['success']) {
                return json_encode([
                    'success' => true,
                    'message' => 'OTP generated successfully (External service failed: ' . ($otpResponseData['message'] ?? 'Unknown error') . ')',
                    'otp' => $otp
                ]);
            }

            return json_encode([
                'success' => true,
                'message' => 'OTP sent to ' . $phone_number,
                'otp' => $otp,
                'service_response' => $otpResponseData
            ]);
        } catch (Exception $e) {
            return json_encode([
                'success' => false,
                'message' => 'Error processing staff forgot password request: ' . $e->getMessage()
            ]);
        }
    }

    // OTP request for registration verification
    public function registrationOtpRequest($mobile) {
        // Step 1: Validate mobile number format
        if (!preg_match('/^0\d{9}$/', $mobile)) {
            return json_encode([
                'success' => false,
                'message' => 'Invalid mobile number format. Must be 10 digits starting with 0.'
            ]);
        }

        // Step 2: Check if mobile number already exists in database
        // Note: For registration, we'll skip this check since the student doesn't exist yet
        // The actual duplicate check will be done during registration

        // Step 3: Format phone number for external service (same as forgot password)
        $formatted_phone = $mobile;
        if (strlen($mobile) === 10 && substr($mobile, 0, 1) === '0') {
            $formatted_phone = '94' . substr($mobile, 1);
        } elseif (strlen($mobile) === 9 && substr($mobile, 0, 1) === '0') {
            $formatted_phone = '94' . substr($mobile, 1);
        } elseif (strlen($mobile) === 11 && substr($mobile, 0, 2) === '94') {
            $formatted_phone = $mobile;
        } elseif (strlen($mobile) === 10 && substr($mobile, 0, 1) === '7') {
            $formatted_phone = '94' . $mobile;
        }

        // Step 4: Generate and store OTP using OtpModel
        require_once __DIR__ . '/OtpModel.php';
        $otpModel = new OtpModel($this->db);
        $otp = $otpModel->createOtp($mobile, 'registration');

        if (!$otp) {
            return json_encode([
                'success' => false,
                'message' => 'Failed to generate OTP. Please try again.'
            ]);
        }

        // Step 5: Send OTP to external service
        $sendOtpUrl = 'https://down-south-front-end.onrender.com/send_otp';

        $postData = json_encode([
            'phoneNumber' => $formatted_phone,
            'otp' => (string)$otp
        ]);

        $ch = curl_init($sendOtpUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($postData)
        ]);

        $otpResponse = curl_exec($ch);

        if (curl_errno($ch)) {
            return json_encode([
                'success' => false,
                'message' => 'cURL Error: ' . curl_error($ch)
            ]);
        }

        $otpResponseData = json_decode($otpResponse, true);

        if ($otpResponseData === null) {
            return json_encode([
                'success' => false,
                'message' => 'Invalid JSON response from OTP service',
                'raw' => $otpResponse
            ]);
        }

        // Check if the external service was successful
        if (isset($otpResponseData['success']) && $otpResponseData['success'] === false) {
            return json_encode([
                'success' => false,
                'message' => 'OTP service error: ' . ($otpResponseData['message'] ?? 'Unknown error'),
                'service_response' => $otpResponseData,
                'otp' => $otp // Show OTP for testing purposes
            ]);
        }

        // Step 6: Return success
        return json_encode([
            'success' => true,
            'message' => 'OTP sent to ' . $mobile,
            'otp' => $otp, // Show OTP for testing purposes
            'service_response' => $otpResponseData // Show service response for debugging
        ]);
    }

    // Verify registration OTP
    public function verifyRegistrationOtp($mobile, $otp) {
        // Use OtpModel for proper OTP verification
        require_once __DIR__ . '/OtpModel.php';
        $otpModel = new OtpModel($this->db);
        
        $result = $otpModel->verifyOtp($mobile, $otp, 'registration');
        
        return json_encode($result);
    }



// Reset password using OTP
public function resetPassword($userid, $otp, $newPassword) {
        $user = new UserModel($this->db);
        $userData = $user->getUserById($userid);
        if ($userData) {
            if (isset($userData['otp']) && $userData['otp'] == $otp) {
                // Update password and clear OTP (set to empty string)
                $user->updateUser($userid, null, $newPassword, '');
                return json_encode([
                    'success' => true,
                    'message' => 'Password reset successfully'
                ]);
            } else {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid OTP'
                ]);
            }
        } else {
            return json_encode([
                'success' => false,
                'message' => 'User not found'
            ]);
        }
    }

    // Send OTP for forgot password (using mobile number)
    public function sendOtpForForgotPassword($mobile) {
        // Step 1: Call student backend to find user by mobile number
        $url = "http://host.docker.internal:8086/routes.php/getAllStudents";
        
        $response = file_get_contents($url);
        if ($response === FALSE) {
            return json_encode([
                'success' => false,
                'message' => 'Failed to fetch student data'
            ]);
        }
        
        $students = json_decode($response, true);
        if (!$students || !is_array($students)) {
            return json_encode([
                'success' => false,
                'message' => 'Invalid response from student service'
            ]);
        }
        
        // Find student by mobile number
        $foundStudent = null;
        foreach ($students as $student) {
            if ($student['mobile_number'] === $mobile) {
                $foundStudent = $student;
                break;
            }
        }
        
        if (!$foundStudent) {
            return json_encode([
                'success' => false,
                'message' => 'No student found with this mobile number'
            ]);
        }
        
        $userid = $foundStudent['user_id'];
        
        // Step 2: Check if user exists in auth database
        $stmt = $this->db->prepare("SELECT userid FROM users WHERE userid = ? AND role = 'student'");
        $stmt->bind_param("s", $userid);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            return json_encode([
                'success' => false,
                'message' => 'User account not found'
            ]);
        }
        
        // Step 3: Generate OTP (6 digits)
        $otp = sprintf("%06d", mt_rand(0, 999999));
        
        // Step 4: Store OTP in auth database with timestamp
        $stmt = $this->db->prepare("
            UPDATE users 
            SET otp = ?, otp_created_at = NOW() 
            WHERE userid = ?
        ");
        $stmt->bind_param("ss", $otp, $userid);
        
        if ($stmt->execute()) {
            // Step 5: Send OTP via WhatsApp
            $formatted_phone = $mobile;
            if (strlen($mobile) === 10 && substr($mobile, 0, 1) === '0') {
                $formatted_phone = '94' . substr($mobile, 1);
            }
            
            $sendOtpUrl = 'https://down-south-front-end.onrender.com/send_otp';
            $postData = json_encode([
                'phoneNumber' => $formatted_phone,
                'otp' => (string)$otp
            ]);
            
            $ch = curl_init($sendOtpUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($postData)
            ]);
            
            $otpResponse = curl_exec($ch);
            $otpResponseData = json_decode($otpResponse, true);
            
                return json_encode([
                    'success' => true,
                'message' => 'OTP sent successfully',
                    'otp' => $otp, // Remove this in production
                'userid' => $userid,
                'service_response' => $otpResponseData
                ]);
        } else {
            return json_encode([
                'success' => false,
                'message' => 'Failed to send OTP'
            ]);
        }
    }



    // Reset password using OTP (using mobile number)
    public function resetPasswordWithOtp($mobile, $otp, $newPassword) {
        // First, find the user by mobile number
        $stmt = $this->db->prepare("
            SELECT u.userid, u.otp, u.otp_created_at
            FROM users u 
            LEFT JOIN students s ON u.userid = s.userid 
            WHERE s.mobile = ? AND u.role = 'student'
        ");
        $stmt->bind_param("s", $mobile);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            return json_encode([
                'success' => false,
                'message' => 'No student found with this mobile number'
            ]);
        }
        
        $user = $result->fetch_assoc();
        
        // Check if OTP matches
        if ($user['otp'] !== $otp) {
            return json_encode([
                'success' => false,
                'message' => 'Invalid OTP'
            ]);
        }
        
        // Check if OTP is expired (15 minutes)
        if ($user['otp_created_at']) {
            $otpCreatedAt = new DateTime($user['otp_created_at']);
            $now = new DateTime();
            $diff = $now->diff($otpCreatedAt);
            
            if ($diff->i > 15) {
                return json_encode([
                    'success' => false,
                    'message' => 'OTP has expired'
                ]);
            }
        }
        
        // Hash new password
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        
        // Update password and clear OTP
        $stmt = $this->db->prepare("
            UPDATE users 
            SET password = ?, otp = NULL, otp_created_at = NULL 
            WHERE userid = ?
        ");
        $stmt->bind_param("ss", $hashedPassword, $user['userid']);
        
        if ($stmt->execute()) {
            return json_encode([
                'success' => true,
                'message' => 'Password reset successfully'
            ]);
        } else {
            return json_encode([
                'success' => false,
                'message' => 'Failed to reset password'
            ]);
        }
    }

    // Update student profile information
    public function updateStudentProfile($userid, $profileData) {
        // First, verify the user exists and is a student
        $stmt = $this->db->prepare("SELECT role FROM users WHERE userid = ?");
        $stmt->bind_param("s", $userid);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            return json_encode([
                'success' => false,
                'message' => 'User not found'
            ]);
        }
        
        $user = $result->fetch_assoc();
        if ($user['role'] !== 'student') {
            return json_encode([
                'success' => false,
                'message' => 'User is not a student'
            ]);
        }
        
        // Update student information in the students table
        $stmt = $this->db->prepare("
            UPDATE students SET 
                firstName = ?,
                lastName = ?,
                email = ?,
                mobile = ?,
                nic = ?,
                gender = ?,
                age = ?,
                parentName = ?,
                parentMobile = ?,
                stream = ?,
                dateOfBirth = ?,
                school = ?,
                address = ?,
                district = ?
            WHERE userid = ?
        ");
        
        $stmt->bind_param("sssssssssssssss", 
            $profileData['firstName'],
            $profileData['lastName'],
            $profileData['email'],
            $profileData['mobile'],
            $profileData['nic'],
            $profileData['gender'],
            $profileData['age'],
            $profileData['parentName'],
            $profileData['parentMobile'],
            $profileData['stream'],
            $profileData['dateOfBirth'],
            $profileData['school'],
            $profileData['address'],
            $profileData['district'],
            $userid
        );
        
        if ($stmt->execute()) {
            return json_encode([
                'success' => true,
                'message' => 'Profile updated successfully'
            ]);
        } else {
            return json_encode([
                'success' => false,
                'message' => 'Failed to update profile'
            ]);
        }
    }

    // Change password for authenticated user
    public function changePassword($userid, $currentPassword, $newPassword) {
        // First, verify the current password
        $user = new UserModel($this->db);
        $userData = $user->getUserById($userid);
        
        if (!$userData) {
            return json_encode([
                'success' => false,
                'message' => 'User not found'
            ]);
        }
        
        // Verify current password
        if (!password_verify($currentPassword, $userData['password'])) {
            return json_encode([
                'success' => false,
                'message' => 'Current password is incorrect'
            ]);
        }
        
        // Hash the new password
        $hashedNewPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        
        // Update the password in the database
        $stmt = $this->db->prepare("UPDATE users SET password = ? WHERE userid = ?");
        $stmt->bind_param("ss", $hashedNewPassword, $userid);
        
        if ($stmt->execute()) {
            return json_encode([
                'success' => true,
                'message' => 'Password changed successfully'
            ]);
        } else {
            return json_encode([
                'success' => false,
                'message' => 'Failed to change password'
            ]);
        }
    }

    // Get student by ID
    public function getStudentById($studentId) {
        $stmt = $this->db->prepare("
            SELECT 
                u.userid,
                u.role,
                COALESCE(s.firstName, '') as firstName,
                COALESCE(s.lastName, '') as lastName,
                COALESCE(s.email, '') as email,
                COALESCE(s.mobile, '') as mobile,
                COALESCE(s.nic, '') as nic,
                COALESCE(s.gender, '') as gender,
                COALESCE(s.age, '') as age,
                COALESCE(s.parentName, '') as parentName,
                COALESCE(s.parentMobile, '') as parentMobile,
                COALESCE(s.stream, '') as stream,
                COALESCE(s.dateOfBirth, '') as dateOfBirth,
                COALESCE(s.school, '') as school,
                COALESCE(s.address, '') as address,
                COALESCE(s.district, '') as district,
                COALESCE(s.dateJoined, '') as dateJoined
            FROM users u
            LEFT JOIN students s ON u.userid = s.userid
            WHERE u.role = 'student' AND u.userid = ?
        ");
        $stmt->bind_param("s", $studentId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($row = $result->fetch_assoc()) {
            return json_encode([
                'success' => true,
                'data' => $row
            ]);
        } else {
            return json_encode([
                'success' => false,
                'message' => 'Student not found'
            ]);
        }
    }



    // Get all barcodes
    public function getAllBarcodes() {
        $stmt = $this->db->prepare("
            SELECT userid, barcode_data, student_name, created_at 
            FROM barcodes 
            ORDER BY created_at DESC
        ");
        $stmt->execute();
        $result = $stmt->get_result();
        
        $barcodes = [];
        while ($row = $result->fetch_assoc()) {
            $barcodes[] = $row;
        }
        
        return json_encode([
            'success' => true,
            'barcodes' => $barcodes
        ]);
    }

    // Get next cashier ID
    public function getNextCashierId() {
        $stmt = $this->db->prepare("
            SELECT MAX(CAST(SUBSTRING(userid, 2) AS UNSIGNED)) as max_id 
            FROM users 
            WHERE userid LIKE 'C%'
        ");
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        $nextId = 1;
        if ($row && $row['max_id']) {
            $nextId = $row['max_id'] + 1;
        }
        
        return json_encode([
            'success' => true,
            'data' => 'C' . str_pad($nextId, 3, '0', STR_PAD_LEFT)
        ]);
    }

    // Create cashier
    public function createCashier($data) {
        $name = $data['name'];
        $password = $data['password'];
        $phone = $data['phone'];
        $email = $data['email'] ?? '';

        // Get next cashier ID
        $stmt = $this->db->prepare("
            SELECT MAX(CAST(SUBSTRING(userid, 2) AS UNSIGNED)) as max_id 
            FROM users 
            WHERE userid LIKE 'C%'
        ");
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        $nextId = 1;
        if ($row && $row['max_id']) {
            $nextId = $row['max_id'] + 1;
        }
        
        $cashierId = 'C' . str_pad($nextId, 3, '0', STR_PAD_LEFT);
        
        // Hash the password
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        // Create the cashier user
        $stmt = $this->db->prepare("
            INSERT INTO users (userid, password, role, name, email, phone) 
            VALUES (?, ?, 'cashier', ?, ?, ?)
        ");
        $stmt->bind_param("sssss", $cashierId, $hashedPassword, $name, $email, $phone);
        
        if ($stmt->execute()) {
            // Sync user to RBAC system (non-blocking)
            $rbacSyncData = [
                'userid' => $cashierId,
                'role' => 'cashier',
                'firstName' => $name,
                'lastName' => '', // Empty lastName for cashiers
                'email' => $email
            ];
            
            // Call RBAC backend to create user (don't block on failure)
            $rbacResponse = @file_get_contents('http://rbac-backend:80/users', false, stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => 'Content-Type: application/json',
                    'content' => json_encode($rbacSyncData)
                ]
            ]));
            
            $rbacSyncSuccess = false;
            if ($rbacResponse !== false) {
                $rbacResult = json_decode($rbacResponse, true);
                $rbacSyncSuccess = isset($rbacResult['success']) && $rbacResult['success'];
            }
            
            // Format phone number for external service
            $formatted_phone = $phone;
            if (strlen($phone) === 10 && substr($phone, 0, 1) === '0') {
                $formatted_phone = '94' . substr($phone, 1);
            } elseif (strlen($phone) === 9 && substr($phone, 0, 1) === '0') {
                $formatted_phone = '94' . substr($phone, 1);
            } elseif (strlen($phone) === 11 && substr($phone, 0, 2) === '94') {
                $formatted_phone = $phone;
            } elseif (strlen($phone) === 10 && substr($phone, 0, 1) === '7') {
                $formatted_phone = '94' . $phone;
            }

            // Send credentials via external service
            $sendOtpUrl = 'https://down-south-front-end.onrender.com/send_otp';
            $message = "Hello $name! Your cashier account has been created.\n\nLogin Details:\nUser ID: $cashierId\nPassword: $password\n\nPlease change your password after first login.";
            
            $postData = json_encode([
                'phoneNumber' => $formatted_phone,
                'otp' => $message // Using the message as OTP field for credentials
            ]);

            $ch = curl_init($sendOtpUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($postData)
            ]);

            $otpResponse = curl_exec($ch);
            $externalServiceSuccess = false;
            $externalServiceMessage = '';

            if (curl_errno($ch)) {
                $externalServiceMessage = 'cURL Error: ' . curl_error($ch);
            } else {
                $otpResponseData = json_decode($otpResponse, true);
                if ($otpResponseData && isset($otpResponseData['success'])) {
                    $externalServiceSuccess = $otpResponseData['success'];
                    $externalServiceMessage = $otpResponseData['message'] ?? 'No message returned';
                } else {
                    $externalServiceMessage = 'Invalid response from external service';
                }
            }
            curl_close($ch);
            
            return json_encode([
                'success' => true,
                'message' => 'Cashier account created successfully',
                'cashier_id' => $cashierId,
                'credentials_sent' => $externalServiceSuccess,
                'credentials_message' => $externalServiceMessage
            ]);
        } else {
            return json_encode([
                'success' => false,
                'message' => 'Failed to create cashier account'
            ]);
        }
    }

    // Get all cashiers
    public function getAllCashiers() {
        $stmt = $this->db->prepare("
            SELECT userid, role, name, email, phone, created_at 
            FROM users 
            WHERE role = 'cashier'
            ORDER BY created_at DESC
        ");
        $stmt->execute();
        $result = $stmt->get_result();
        
        $cashiers = [];
        while ($row = $result->fetch_assoc()) {
            $cashiers[] = $row;
        }
        
        return json_encode([
            'success' => true,
            'cashiers' => $cashiers
        ]);
    }

    // Update cashier
    public function updateCashier($cashierId, $data) {
        // First, verify the user exists and is a cashier
        $stmt = $this->db->prepare("SELECT role FROM users WHERE userid = ?");
        $stmt->bind_param("s", $cashierId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            return json_encode([
                'success' => false,
                'message' => 'Cashier not found'
            ]);
        }
        
        $user = $result->fetch_assoc();
        if ($user['role'] !== 'cashier') {
            return json_encode([
                'success' => false,
                'message' => 'User is not a cashier'
            ]);
        }
        
        // Build the update query dynamically based on provided fields
        $updateFields = [];
        $updateValues = [];
        $types = '';
        
        if (isset($data['name'])) {
            $updateFields[] = 'name = ?';
            $updateValues[] = $data['name'];
            $types .= 's';
        }
        
        if (isset($data['email'])) {
            $updateFields[] = 'email = ?';
            $updateValues[] = $data['email'];
            $types .= 's';
        }
        
        if (isset($data['phone'])) {
            $updateFields[] = 'phone = ?';
            $updateValues[] = $data['phone'];
            $types .= 's';
        }
        
        if (isset($data['password']) && !empty($data['password'])) {
            $updateFields[] = 'password = ?';
            $updateValues[] = password_hash($data['password'], PASSWORD_DEFAULT);
            $types .= 's';
        }
        
        if (empty($updateFields)) {
            return json_encode([
                'success' => false,
                'message' => 'No fields to update'
            ]);
        }
        
        // Add the cashier ID to the values array for the WHERE clause
        $updateValues[] = $cashierId;
        $types .= 's';
        
        $sql = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE userid = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param($types, ...$updateValues);
        
        if ($stmt->execute()) {
            return json_encode([
                'success' => true,
                'message' => 'Cashier updated successfully'
            ]);
        } else {
            return json_encode([
                'success' => false,
                'message' => 'Failed to update cashier'
            ]);
        }
    }

    // Delete cashier
    public function deleteCashier($cashierId) {
        // First, verify the user exists and is a cashier
        $stmt = $this->db->prepare("SELECT role FROM users WHERE userid = ?");
        $stmt->bind_param("s", $cashierId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            return json_encode([
                'success' => false,
                'message' => 'Cashier not found'
            ]);
        }
        
        $user = $result->fetch_assoc();
        if ($user['role'] !== 'cashier') {
            return json_encode([
                'success' => false,
                'message' => 'User is not a cashier'
            ]);
        }
        
        // Delete the cashier
        $stmt = $this->db->prepare("DELETE FROM users WHERE userid = ?");
        $stmt->bind_param("s", $cashierId);
        
        if ($stmt->execute()) {
            return json_encode([
                'success' => true,
                'message' => 'Cashier deleted successfully'
            ]);
        } else {
            return json_encode([
                'success' => false,
                'message' => 'Failed to delete cashier'
            ]);
        }
    }

    // =====================================================
    // TEACHER METHODS (CENTRALIZED AUTHENTICATION)
    // =====================================================

    // Create a new teacher
    public function createTeacher($data) {
        try {
            $user = new UserModel($this->db);
            
            // Generate teacher ID if not provided
            $teacherId = $data['teacherId'] ?? $user->generateUserId('teacher');
            
            // Check if teacher ID already exists
            if ($user->getUserById($teacherId)) {
                return json_encode(['success' => false, 'message' => 'Teacher ID already exists']);
            }
            
            // Check if email already exists
            if ($user->emailExists($data['email'])) {
                return json_encode(['success' => false, 'message' => 'Email already exists']);
            }
            
            // Create teacher in auth database
            $teacherData = [
                'userid' => $teacherId,
                'password' => password_hash($data['password'], PASSWORD_DEFAULT),
                'role' => 'teacher',
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone']
            ];
            
            $result = $user->createTeacherUser($teacherData['userid'], $data['password'], $teacherData['name'], $teacherData['email'], $teacherData['phone']);
            
            if ($result) {
                // Send welcome message via WhatsApp
                $whatsappResult = $this->sendTeacherWelcomeMessage($teacherId, $data['name'], $data['phone'], $data['password']);
                
                return json_encode([
                    'success' => true, 
                    'message' => 'Teacher created successfully',
                    'teacherId' => $teacherId,
                    'whatsapp_sent' => $whatsappResult,
                    'whatsapp_message' => $whatsappResult ? 'Welcome message sent successfully' : 'WhatsApp service unavailable'
                ]);
            } else {
                return json_encode(['success' => false, 'message' => 'Failed to create teacher']);
            }
        } catch (Exception $e) {
            return json_encode(['success' => false, 'message' => 'Error creating teacher: ' . $e->getMessage()]);
        }
    }

    // Get all teachers
    public function getAllTeachers() {
        try {
            $user = new UserModel($this->db);
            $teachers = $user->getAllTeachers();
            
            if ($teachers !== false) {
                return json_encode(['success' => true, 'teachers' => $teachers]);
            } else {
                return json_encode(['success' => false, 'message' => 'Failed to fetch teachers']);
            }
        } catch (Exception $e) {
            return json_encode(['success' => false, 'message' => 'Error fetching teachers: ' . $e->getMessage()]);
        }
    }

    // Get teacher by ID
    public function getTeacher($teacherId) {
        try {
            $user = new UserModel($this->db);
            $teacherData = $user->getUserById($teacherId);
            
            if ($teacherData && $teacherData['role'] === 'teacher') {
                // Remove password from response
                unset($teacherData['password']);
                return json_encode(['success' => true, 'teacher' => $teacherData]);
            } else {
                return json_encode(['success' => false, 'message' => 'Teacher not found']);
            }
        } catch (Exception $e) {
            return json_encode(['success' => false, 'message' => 'Error fetching teacher: ' . $e->getMessage()]);
        }
    }

    // Update teacher
    public function updateTeacher($teacherId, $data) {
        try {
            $user = new UserModel($this->db);
            $existingTeacher = $user->getUserById($teacherId);
            
            if (!$existingTeacher || $existingTeacher['role'] !== 'teacher') {
                return json_encode(['success' => false, 'message' => 'Teacher not found']);
            }
            
            // Prepare update data
            $updateData = [];
            if (isset($data['name'])) $updateData['name'] = $data['name'];
            if (isset($data['email'])) $updateData['email'] = $data['email'];
            if (isset($data['phone'])) $updateData['phone'] = $data['phone'];
            if (isset($data['password'])) $updateData['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
            
            $result = $user->updateTeacher($teacherId, $updateData);
            
            if ($result) {
                return json_encode(['success' => true, 'message' => 'Teacher updated successfully']);
            } else {
                return json_encode(['success' => false, 'message' => 'Failed to update teacher']);
            }
        } catch (Exception $e) {
            return json_encode(['success' => false, 'message' => 'Error updating teacher: ' . $e->getMessage()]);
        }
    }

    // Delete teacher
    public function deleteTeacher($teacherId) {
        try {
            $user = new UserModel($this->db);
            $existingTeacher = $user->getUserById($teacherId);
            
            if (!$existingTeacher || $existingTeacher['role'] !== 'teacher') {
                return json_encode(['success' => false, 'message' => 'Teacher not found']);
            }
            
            $result = $user->deleteUser($teacherId);
            
            if ($result) {
                return json_encode(['success' => true, 'message' => 'Teacher deleted successfully']);
            } else {
                return json_encode(['success' => false, 'message' => 'Failed to delete teacher']);
            }
        } catch (Exception $e) {
            return json_encode(['success' => false, 'message' => 'Error deleting teacher: ' . $e->getMessage()]);
        }
    }

    // Teacher login with Teacher ID
    public function teacherLogin($teacherId, $password) {
        try {
            $user = new UserModel($this->db);
            $teacherData = $user->getUserById($teacherId);
            
            // Allow both 'teacher' and 'teacher_staff' roles to authenticate
            if ($teacherData && in_array($teacherData['role'], ['teacher', 'teacher_staff']) && password_verify($password, $teacherData['password'])) {
                // Remove password from response
                unset($teacherData['password']);
                
                // Generate access token (short-lived: 15 minutes)
                $secretKey = 'your_secret_key_here';
                $accessPayload = [
                    'userid' => $teacherData['userid'],
                    'role' => $teacherData['role'],
                    'iat' => time(),
                    'exp' => time() + (15 * 60) // 15 minutes expiry
                ];
                $accessToken = JWT::encode($accessPayload, $secretKey, 'HS256');
                
                // Generate refresh token (long-lived: 7 days)
                $refreshToken = $this->generateRefreshToken();
                
                // Store refresh token in database
                $this->storeRefreshToken($teacherData['userid'], $refreshToken);
                
                return json_encode([
                    'success' => true,
                    'message' => 'Login successful',
                    'teacher' => $teacherData,
                    'accessToken' => $accessToken,
                    'refreshToken' => $refreshToken
                ]);
            } else {
                return json_encode(['success' => false, 'message' => 'Invalid Teacher ID or password']);
            }
        } catch (Exception $e) {
            return json_encode(['success' => false, 'message' => 'Error during login: ' . $e->getMessage()]);
        }
    }

    // Teacher login with email
    public function teacherLoginWithEmail($email, $password) {
        try {
            $user = new UserModel($this->db);
            $teacherData = $user->getTeacherByEmail($email);
            
            // Allow both 'teacher' and 'teacher_staff' when logging in with email
            if ($teacherData && in_array($teacherData['role'], ['teacher', 'teacher_staff']) && password_verify($password, $teacherData['password'])) {
                // Remove password from response
                unset($teacherData['password']);
                
                // Generate access token (short-lived: 15 minutes)
                $secretKey = 'your_secret_key_here';
                $accessPayload = [
                    'userid' => $teacherData['userid'],
                    'role' => $teacherData['role'],
                    'iat' => time(),
                    'exp' => time() + (15 * 60) // 15 minutes expiry
                ];
                $accessToken = JWT::encode($accessPayload, $secretKey, 'HS256');
                
                // Generate refresh token (long-lived: 7 days)
                $refreshToken = $this->generateRefreshToken();
                
                // Store refresh token in database
                $this->storeRefreshToken($teacherData['userid'], $refreshToken);
                
                return json_encode([
                    'success' => true,
                    'message' => 'Login successful',
                    'teacher' => $teacherData,
                    'accessToken' => $accessToken,
                    'refreshToken' => $refreshToken
                ]);
            } else {
                return json_encode(['success' => false, 'message' => 'Invalid email or password']);
            }
        } catch (Exception $e) {
            return json_encode(['success' => false, 'message' => 'Error during login: ' . $e->getMessage()]);
        }
    }

    // Send welcome message to teacher
    public function sendTeacherWelcomeMessage($teacherId, $name, $phone, $password) {
        try {
            $message = "🎓 Welcome to TCMS!\n\n";
            $message .= "Teacher ID: {$teacherId}\n";
            $message .= "Name: {$name}\n\n";
            $message .= "Your account has been successfully created.\n";
            $message .= "You can now login using:\n";
            $message .= "• Teacher ID: {$teacherId}\n";
            $message .= "• Password: {$password}\n\n";
            $message .= "Account Status: ✅ Active | ✅ Ready for Login";

            // Format phone number for external service
            $formatted_phone = $phone;
            if (strlen($phone) === 10 && substr($phone, 0, 1) === '0') {
                $formatted_phone = '94' . substr($phone, 1);
            }

            $payload = [
                'phoneNumber' => $formatted_phone,
                'otp' => $message // Using otp field for the message content
            ];

            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => 'Content-Type: application/json',
                    'content' => json_encode($payload)
                ]
            ]);

            $response = @file_get_contents('https://down-south-front-end.onrender.com/send_otp', false, $context);
            
            if ($response === FALSE) {
                error_log("❌ TEACHER WELCOME WHATSAPP FAILED: " . json_encode([
                    'phone' => $phone,
                    'teacherId' => $teacherId,
                    'timestamp' => date('d/m/Y, H:i:s'),
                    'error' => 'Failed to send welcome WhatsApp message'
                ]));
                return false;
            } else {
                error_log("✅ TEACHER WELCOME WHATSAPP SENT: " . json_encode([
                    'phone' => $phone,
                    'teacherId' => $teacherId,
                    'timestamp' => date('d/m/Y, H:i:s'),
                    'message' => 'Welcome message sent successfully'
                ]));
                return true;
            }
        } catch (Exception $e) {
            error_log("❌ TEACHER WELCOME WHATSAPP ERROR: " . json_encode([
                'phone' => $phone,
                'teacherId' => $teacherId,
                'timestamp' => date('d/m/Y, H:i:s'),
                'error' => $e->getMessage()
            ]));
            return false;
        }
    }

    // Send welcome message specifically for teacher staff (teacher_staff)
    public function sendStaffWelcomeMessage($staffId, $name, $phone, $password) {
        try {
            $message = "👋 Welcome to TCMS Team!\n\n";
            $message .= "Staff ID: {$staffId}\n";
            $message .= "Name: {$name}\n\n";
            $message .= "Your staff account has been created by your teacher.\n";
            $message .= "You can login using:\n";
            $message .= "• Staff ID: {$staffId}\n";
            $message .= "• Password: {$password}\n\n";
            $message .= "For security, you can change your password using the 'Forgot Password' flow at any time.\n";
            $message .= "If you have any issues, contact your teacher or system administrator.\n\n";
            $message .= "Account Status: ✅ Active | ✅ Ready for Login";

            // Format phone for external service
            $formatted_phone = $phone;
            if (strlen($phone) === 10 && substr($phone, 0, 1) === '0') {
                $formatted_phone = '94' . substr($phone, 1);
            }

            $payload = [
                'phoneNumber' => $formatted_phone,
                'otp' => $message // Using otp field for message content
            ];

            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => 'Content-Type: application/json',
                    'content' => json_encode($payload)
                ]
            ]);

            $response = @file_get_contents('https://down-south-front-end.onrender.com/send_otp', false, $context);

            if ($response === FALSE) {
                error_log("❌ STAFF WELCOME WHATSAPP FAILED: " . json_encode([
                    'phone' => $phone,
                    'staffId' => $staffId,
                    'timestamp' => date('d/m/Y, H:i:s'),
                    'error' => 'Failed to send staff welcome WhatsApp message'
                ]));
                return false;
            } else {
                error_log("✅ STAFF WELCOME WHATSAPP SENT: " . json_encode([
                    'phone' => $phone,
                    'staffId' => $staffId,
                    'timestamp' => date('d/m/Y, H:i:s'),
                    'message' => 'Staff welcome message sent successfully'
                ]));
                return true;
            }
        } catch (Exception $e) {
            error_log("❌ STAFF WELCOME WHATSAPP ERROR: " . json_encode([
                'phone' => $phone,
                'staffId' => $staffId,
                'timestamp' => date('d/m/Y, H:i:s'),
                'error' => $e->getMessage()
            ]));
            return false;
        }
    }
}


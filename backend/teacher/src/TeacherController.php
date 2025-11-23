<?php
// Set timezone for all date/time operations
date_default_timezone_set('Asia/Colombo');

require_once 'TeacherModel.php';
require_once 'config.php';


class TeacherController {
    private $model;
    private $conn;
    
    public function __construct() {
        $this->conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        if ($this->conn->connect_error) {
            throw new Exception("Connection failed: " . $this->conn->connect_error);
        }
        
        $this->model = new TeacherModel($this->conn);
    }
    
    // Create a new teacher
    public function createTeacher($data) {
        try {
            // Auto-generate teacher ID if not provided
            if (empty($data['teacherId'])) {
                $data['teacherId'] = $this->model->generateNextTeacherId();
            }
            
            // Validate required fields
            $requiredFields = ['designation', 'name', 'stream', 'email', 'phone', 'password'];
            foreach ($requiredFields as $field) {
                if (empty($data[$field])) {
                    return [
                        'success' => false,
                        'message' => ucfirst($field) . ' is required'
                    ];
                }
            }
            
            // Validate email format
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                return [
                    'success' => false,
                    'message' => 'Invalid email format'
                ];
            }
            
            // Check if teacherId already exists
            if ($this->model->teacherIdExists($data['teacherId'])) {
                return [
                    'success' => false,
                    'message' => 'Teacher ID already exists'
                ];
            }
            
            // Check if email already exists
            if ($this->model->emailExists($data['email'])) {
                return [
                    'success' => false,
                    'message' => 'Email already exists'
                ];
            }
            
            // Check if phone number already exists
            if ($this->model->phoneExists($data['phone'])) {
                return [
                    'success' => false,
                    'message' => 'Phone number already exists'
                ];
            }
            
            // Validate phone number (Sri Lankan format)
            if (!preg_match('/^0\d{9}$/', $data['phone'])) {
                return [
                    'success' => false,
                    'message' => 'Invalid phone number format (should be 10 digits, start with 0)'
                ];
            }
            
            // Validate password strength
            if (strlen($data['password']) < 8) {
                return [
                    'success' => false,
                    'message' => 'Password must be at least 8 characters long'
                ];
            }
            
            $result = $this->model->createTeacher($data);
            
            // If teacher creation was successful, send credentials via external service
            if ($result['success']) {
                try {
                    // Format phone number for external service
                    $phone = $data['phone'];
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
                    $message = "Hello {$data['name']}! Your teacher account has been created.\n\nLogin Details:\nUser ID: {$data['teacherId']}\nPassword: {$data['password']}\n\nPlease change your password after first login.";
                    
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
                    
                    // Add external service result to the response
                    $result['credentials_sent'] = $externalServiceSuccess;
                    $result['credentials_message'] = $externalServiceMessage;

                // Attempt to provision user in central auth service so auth and teacher backends stay in sync
                try {
                    $authCandidates = [];
                    $envAuth = getenv('AUTH_SERVICE_URL');
                    if ($envAuth) $authCandidates[] = rtrim($envAuth, '/') . '/routes.php/create_user';
                    $authCandidates[] = 'http://auth-backend/routes.php/create_user';
                    $authCandidates[] = 'http://host.docker.internal:8081/routes.php/create_user';
                    $authCandidates[] = 'http://localhost:8081/routes.php/create_user';

                    $postData = json_encode([
                        'userid' => $data['teacherId'],
                        'role' => 'teacher',
                        'password' => $data['password'],
                        'name' => $data['name'] ?? null,
                        'email' => $data['email'] ?? null,
                        'phone' => $data['phone'] ?? null
                    ]);

                    $provisioned = false;
                    $authResponse = null;
                    foreach ($authCandidates as $authUrl) {
                        try {
                            $ch = curl_init($authUrl);
                            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                            curl_setopt($ch, CURLOPT_POST, true);
                            curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
                            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                                'Content-Type: application/json',
                                'Content-Length: ' . strlen($postData)
                            ]);
                            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
                            curl_setopt($ch, CURLOPT_TIMEOUT, 10);

                            $authResp = curl_exec($ch);
                            $curlErr = curl_errno($ch) ? curl_error($ch) : null;
                            curl_close($ch);

                            if ($curlErr) {
                                $authResponse = ['success' => false, 'error' => 'cURL error: ' . $curlErr, 'url' => $authUrl];
                                continue;
                            }

                            $decoded = json_decode($authResp, true);
                            $authResponse = $decoded ?: ['success' => false, 'raw' => $authResp, 'url' => $authUrl];
                            if (isset($authResponse['success']) && $authResponse['success']) {
                                $provisioned = true;
                                break;
                            }
                        } catch (Exception $e) {
                            $authResponse = ['success' => false, 'error' => $e->getMessage(), 'url' => $authUrl];
                            continue;
                        }
                    }

                    $result['auth_provisioned'] = $provisioned;
                    $result['auth_response'] = $authResponse;
                    if (!$provisioned) {
                        // Include warning in the result but do not roll back teacher creation
                        $result['warning'] = 'Failed to provision user in auth service';
                    }
                } catch (Exception $e) {
                    $result['auth_provisioned'] = false;
                    $result['auth_response'] = ['success' => false, 'error' => $e->getMessage()];
                    $result['warning'] = 'Failed to provision user in auth service: ' . $e->getMessage();
                }
                    
                } catch (Exception $e) {
                    // External service sending failed, but teacher was created successfully
                    $result['credentials_sent'] = false;
                    $result['credentials_message'] = 'Failed to send credentials: ' . $e->getMessage();
                }
            }
            
            return $result;
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error creating teacher: ' . $e->getMessage()
            ];
        }
    }
    
    // Get all teachers
    public function getAllTeachers() {
        try {
            $teachers = $this->model->getAllTeachers();
            return [
                'success' => true,
                'data' => $teachers,
                'message' => 'Teachers retrieved successfully'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error retrieving teachers: ' . $e->getMessage()
            ];
        }
    }
    
    // Get active teachers only
    public function getActiveTeachers() {
        try {
            $teachers = $this->model->getActiveTeachers();
            return [
                'success' => true,
                'data' => $teachers,
                'message' => 'Active teachers retrieved successfully'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error retrieving active teachers: ' . $e->getMessage()
            ];
        }
    }
    
    // Get teacher by ID
    public function getTeacherById($teacherId) {
        try {
            if (empty($teacherId)) {
                return [
                    'success' => false,
                    'message' => 'Teacher ID is required'
                ];
            }
            
            $teacher = $this->model->getTeacherById($teacherId);
            
            if (!$teacher) {
                return [
                    'success' => false,
                    'message' => 'Teacher not found'
                ];
            }
            
            return [
                'success' => true,
                'data' => $teacher,
                'message' => 'Teacher retrieved successfully'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error retrieving teacher: ' . $e->getMessage()
            ];
        }
    }
    
    // Get teacher by ID for editing (includes password placeholder)
    public function getTeacherByIdForEdit($teacherId) {
        try {
            if (empty($teacherId)) {
                return [
                    'success' => false,
                    'message' => 'Teacher ID is required'
                ];
            }
            
            $teacher = $this->model->getTeacherByIdForEdit($teacherId);
            
            if (!$teacher) {
                return [
                    'success' => false,
                    'message' => 'Teacher not found'
                ];
            }
            
            return [
                'success' => true,
                'data' => $teacher,
                'message' => 'Teacher retrieved successfully for editing'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error retrieving teacher: ' . $e->getMessage()
            ];
        }
    }
    
    // Teacher login with email
    public function login($email, $password) {
        try {
            if (empty($email) || empty($password)) {
                return [
                    'success' => false,
                    'message' => 'Email and password are required'
                ];
            }
            
            $teacher = $this->model->getTeacherByEmail($email);
            
            if (!$teacher) {
                return [
                    'success' => false,
                    'message' => 'Invalid email or password'
                ];
            }
            
            if ($teacher['status'] !== 'active') {
                return [
                    'success' => false,
                    'message' => 'Account is inactive'
                ];
            }
            
            if (!password_verify($password, $teacher['password'])) {
                return [
                    'success' => false,
                    'message' => 'Invalid email or password'
                ];
            }
            
            // Remove password from response
            unset($teacher['password']);
            
            return [
                'success' => true,
                'data' => $teacher,
                'message' => 'Login successful'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error during login: ' . $e->getMessage()
            ];
        }
    }
    
    // Teacher login with Teacher ID
    public function loginWithTeacherId($teacherId, $password) {
        try {
            if (empty($teacherId) || empty($password)) {
                return [
                    'success' => false,
                    'message' => 'Teacher ID and password are required'
                ];
            }
            
            $teacher = $this->model->getTeacherByIdWithPassword($teacherId);
            
            if (!$teacher) {
                return [
                    'success' => false,
                    'message' => 'Invalid Teacher ID or password'
                ];
            }
            
            if ($teacher['status'] !== 'active') {
                return [
                    'success' => false,
                    'message' => 'Account is inactive'
                ];
            }
            
            if (!password_verify($password, $teacher['password'])) {
                return [
                    'success' => false,
                    'message' => 'Invalid Teacher ID or password'
                ];
            }
            
            // Remove password from response
            unset($teacher['password']);
            
            // Generate simple tokens for frontend compatibility
            $accessToken = bin2hex(random_bytes(32));
            $refreshToken = bin2hex(random_bytes(32));
            
            // Add role and tokens to response
            $teacher['role'] = 'teacher';
            
            return [
                'success' => true,
                'accessToken' => $accessToken,
                'refreshToken' => $refreshToken,
                'user' => $teacher,
                'message' => 'Login successful'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error during login: ' . $e->getMessage()
            ];
        }
    }
    
    // Update teacher
    public function updateTeacher($teacherId, $data) {
        try {
            if (empty($teacherId)) {
                return [
                    'success' => false,
                    'message' => 'Teacher ID is required'
                ];
            }
            
            // Check if teacher exists
            $existingTeacher = $this->model->getTeacherById($teacherId);
            if (!$existingTeacher) {
                return [
                    'success' => false,
                    'message' => 'Teacher not found'
                ];
            }
            
            // Validate email if provided
            if (!empty($data['email'])) {
                if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                    return [
                        'success' => false,
                        'message' => 'Invalid email format'
                    ];
                }
                
                // Check if email exists (excluding current teacher)
                if ($this->model->emailExists($data['email'], $teacherId)) {
                    return [
                        'success' => false,
                        'message' => 'Email already exists'
                    ];
                }
            }
            
            // Validate phone number if provided
            if (!empty($data['phone'])) {
                if (!preg_match('/^0\d{9}$/', $data['phone'])) {
                    return [
                        'success' => false,
                        'message' => 'Invalid phone number format (should be 10 digits starting with 0)'
                    ];
                }
            }
            
            // Validate password if provided
            if (!empty($data['password'])) {
                if (strlen($data['password']) < 8) {
                    return [
                        'success' => false,
                        'message' => 'Password must be at least 8 characters long'
                    ];
                }
            }
            
            $result = $this->model->updateTeacher($teacherId, $data);
            // If update succeeded in teacher backend, attempt to sync to auth backend
            if ($result && isset($result['success']) && $result['success']) {
                try {
                    $authCandidates = [];
                    $envAuth = getenv('AUTH_SERVICE_URL');
                    if ($envAuth) $authCandidates[] = rtrim($envAuth, '/') . '/routes.php/teacher/' . urlencode($teacherId);
                    $authCandidates[] = 'http://auth-backend/routes.php/teacher/' . urlencode($teacherId);
                    $authCandidates[] = 'http://host.docker.internal:8081/routes.php/teacher/' . urlencode($teacherId);
                    $authCandidates[] = 'http://localhost:8081/routes.php/teacher/' . urlencode($teacherId);

                    $postData = json_encode($data);
                    $synced = false;
                    $syncResp = null;
                    foreach ($authCandidates as $authUrl) {
                        try {
                            $ch = curl_init($authUrl);
                            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
                            curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
                            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                                'Content-Type: application/json',
                                'Content-Length: ' . strlen($postData)
                            ]);
                            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
                            curl_setopt($ch, CURLOPT_TIMEOUT, 10);

                            $resp = curl_exec($ch);
                            $curlErr = curl_errno($ch) ? curl_error($ch) : null;
                            curl_close($ch);

                            if ($curlErr) {
                                $syncResp = ['success' => false, 'error' => 'cURL error: ' . $curlErr, 'url' => $authUrl];
                                continue;
                            }

                            $decoded = json_decode($resp, true);
                            $syncResp = $decoded ?: ['success' => false, 'raw' => $resp, 'url' => $authUrl];
                            if (isset($syncResp['success']) && $syncResp['success']) {
                                $synced = true;
                                break;
                            }
                        } catch (Exception $e) {
                            $syncResp = ['success' => false, 'error' => $e->getMessage(), 'url' => $authUrl];
                            continue;
                        }
                    }

                    $result['auth_synced'] = $synced;
                    $result['auth_sync_response'] = $syncResp;
                    if (!$synced) {
                        $result['warning'] = 'Teacher updated but failed to sync to auth service';
                    }
                } catch (Exception $e) {
                    $result['auth_synced'] = false;
                    $result['auth_sync_response'] = ['success' => false, 'error' => $e->getMessage()];
                    $result['warning'] = 'Teacher updated but failed to sync to auth service: ' . $e->getMessage();
                }
            }

            return $result;
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error updating teacher: ' . $e->getMessage()
            ];
        }
    }
    
    // Delete teacher
    public function deleteTeacher($teacherId) {
        try {
            if (empty($teacherId)) {
                return [
                    'success' => false,
                    'message' => 'Teacher ID is required'
                ];
            }
            
            // Check if teacher exists
            $existingTeacher = $this->model->getTeacherById($teacherId);
            if (!$existingTeacher) {
                return [
                    'success' => false,
                    'message' => 'Teacher not found'
                ];
            }
            
            $result = $this->model->deleteTeacher($teacherId);

            // If local delete succeeded, attempt to delete from auth service as well
            if ($result && isset($result['success']) && $result['success']) {
                try {
                    $authCandidates = [];
                    $envAuth = getenv('AUTH_SERVICE_URL');
                    if ($envAuth) $authCandidates[] = rtrim($envAuth, '/') . '/routes.php/user/' . urlencode($teacherId);
                    $authCandidates[] = 'http://auth-backend/routes.php/user/' . urlencode($teacherId);
                    $authCandidates[] = 'http://host.docker.internal:8081/routes.php/user/' . urlencode($teacherId);
                    $authCandidates[] = 'http://localhost:8081/routes.php/user/' . urlencode($teacherId);

                    $deletedFromAuth = false;
                    $deleteResp = null;
                    foreach ($authCandidates as $authUrl) {
                        try {
                            $ch = curl_init($authUrl);
                            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
                            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
                            curl_setopt($ch, CURLOPT_TIMEOUT, 10);

                            $resp = curl_exec($ch);
                            $curlErr = curl_errno($ch) ? curl_error($ch) : null;
                            curl_close($ch);

                            if ($curlErr) {
                                $deleteResp = ['success' => false, 'error' => 'cURL error: ' . $curlErr, 'url' => $authUrl];
                                continue;
                            }

                            $decoded = json_decode($resp, true);
                            $deleteResp = $decoded ?: ['success' => false, 'raw' => $resp, 'url' => $authUrl];
                            if (isset($deleteResp['success']) && $deleteResp['success']) {
                                $deletedFromAuth = true;
                                break;
                            }
                        } catch (Exception $e) {
                            $deleteResp = ['success' => false, 'error' => $e->getMessage(), 'url' => $authUrl];
                            continue;
                        }
                    }

                    $result['auth_deleted'] = $deletedFromAuth;
                    $result['auth_delete_response'] = $deleteResp;
                    if (!$deletedFromAuth) {
                        $result['warning'] = 'Teacher deleted locally but failed to delete in auth service';
                    }
                } catch (Exception $e) {
                    $result['auth_deleted'] = false;
                    $result['auth_delete_response'] = ['success' => false, 'error' => $e->getMessage()];
                    $result['warning'] = 'Teacher deleted locally but failed to delete in auth service: ' . $e->getMessage();
                }
            }

            return $result;
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error deleting teacher: ' . $e->getMessage()
            ];
        }
    }
    
    // Change teacher password
    public function changePassword($teacherId, $currentPassword, $newPassword) {
        try {
            if (empty($teacherId) || empty($currentPassword) || empty($newPassword)) {
                return [
                    'success' => false,
                    'message' => 'Teacher ID, current password, and new password are required'
                ];
            }
            
            // Get teacher with password
            $teacher = $this->model->getTeacherByEmail($teacherId); // Assuming teacherId is email for login
            
            if (!$teacher) {
                return [
                    'success' => false,
                    'message' => 'Teacher not found'
                ];
            }
            
            // Verify current password
            if (!password_verify($currentPassword, $teacher['password'])) {
                return [
                    'success' => false,
                    'message' => 'Current password is incorrect'
                ];
            }
            
            // Validate new password strength
            if (strlen($newPassword) < 8) {
                return [
                    'success' => false,
                    'message' => 'New password must be at least 8 characters long'
                ];
            }
            
            $result = $this->model->changePassword($teacher['teacherId'], $newPassword);
            return $result;
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error changing password: ' . $e->getMessage()
            ];
        }
    }

    // Create study pack
    public function createStudyPack($data) {
        try {
            if (empty($data['teacher_id']) || empty($data['title'])) {
                return ['success' => false, 'message' => 'teacher_id and title are required'];
            }
            $result = $this->model->createStudyPack($data);
            return $result;
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error creating study pack: ' . $e->getMessage()];
        }
    }

    // Add link to study pack
    public function addStudyPackLink($studyPackId, $data) {
        try {
            if (empty($studyPackId) || empty($data['link_url'])) {
                return ['success' => false, 'message' => 'studyPackId and link_url are required'];
            }
            $linkTitle = $data['link_title'] ?? '';
            $result = $this->model->addStudyPackLink($studyPackId, $data['link_url'], $linkTitle);
            return $result;
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error adding link: ' . $e->getMessage()];
        }
    }

    // List study packs for a teacher
    public function getStudyPacksByTeacher($teacherId) {
        try {
            if (empty($teacherId)) return ['success' => false, 'message' => 'teacher id required'];
            $packs = $this->model->getStudyPacksByTeacher($teacherId);
            return ['success' => true, 'data' => $packs];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error fetching packs: ' . $e->getMessage()];
        }
    }

    // Get study pack details
    public function getStudyPackById($id) {
        try {
            if (empty($id)) return ['success' => false, 'message' => 'id required'];
            $pack = $this->model->getStudyPackById($id);
            if (!$pack) return ['success' => false, 'message' => 'Not found'];
            return ['success' => true, 'data' => $pack];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error fetching pack: ' . $e->getMessage()];
        }
    }

    // Get all study packs (student view)
    public function getAllStudyPacks() {
        try {
            $packs = $this->model->getAllStudyPacks();
            return ['success' => true, 'data' => $packs];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error fetching packs: ' . $e->getMessage()];
        }
    }

    // Update study pack (title, description, price)
    public function updateStudyPack($id, $data) {
        try {
            if (empty($id)) return ['success' => false, 'message' => 'id required'];
            $allowed = ['title', 'description', 'price'];
            $update = [];
            foreach ($allowed as $k) {
                if (array_key_exists($k, $data)) {
                    $update[$k] = $data[$k];
                }
            }
            if (empty($update)) {
                return ['success' => false, 'message' => 'No fields to update'];
            }
            $result = $this->model->updateStudyPack($id, $update);
            return $result;
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error updating study pack: ' . $e->getMessage()];
        }
    }
    
    // Get teachers by stream
    public function getTeachersByStream($stream) {
        try {
            if (empty($stream)) {
                return [
                    'success' => false,
                    'message' => 'Stream is required'
                ];
            }
            
            $teachers = $this->model->getTeachersByStream($stream);
            return [
                'success' => true,
                'data' => $teachers,
                'message' => 'Teachers retrieved successfully'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error retrieving teachers: ' . $e->getMessage()
            ];
        }
    }
    
    // Get next teacher ID
    public function getNextTeacherId() {
        try {
            $nextId = $this->model->generateNextTeacherId();
            return [
                'success' => true,
                'data' => $nextId,
                'message' => 'Next teacher ID generated successfully'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error generating teacher ID: ' . $e->getMessage()
            ];
        }
    }

    // ==========================
    // Teacher staff endpoints
    // ==========================

    // Create staff for a teacher
    public function createStaff($teacherId, $data) {
        try {
            if (empty($teacherId)) {
                return ['success' => false, 'message' => 'Teacher ID is required'];
            }

            // Ensure teacher exists
            $teacher = $this->model->getTeacherById($teacherId);
            if (!$teacher) {
                return ['success' => false, 'message' => 'Teacher not found'];
            }

            // Validate required fields
            $required = ['name', 'password'];
            foreach ($required as $f) {
                if (empty($data[$f])) {
                    return ['success' => false, 'message' => ucfirst($f) . ' is required'];
                }
            }

            if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                return ['success' => false, 'message' => 'Invalid email format'];
            }

            if (!empty($data['phone']) && !preg_match('/^0\d{9}$/', $data['phone'])) {
                return ['success' => false, 'message' => 'Invalid phone format'];
            }

            // Check duplicates
            if (!empty($data['email']) && $this->model->staffEmailExists($data['email'], $teacherId)) {
                return ['success' => false, 'message' => 'Email already exists for this teacher'];
            }
            if (!empty($data['phone']) && $this->model->staffPhoneExists($data['phone'], $teacherId)) {
                return ['success' => false, 'message' => 'Phone already exists for this teacher'];
            }

            // Generate staffId first so we can provision centrally before local insert
            $staffId = $this->model->generateStaffId();

            // Prepare auth provisioning payload and candidate URLs. We try
            // environment-configured URL first, then common container/host fallbacks.
            $postData = json_encode([
                'userid' => $staffId,
                'role' => 'teacher_staff',
                'password' => $data['password'],
                'name' => $data['name'] ?? null,
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'] ?? null
            ]);

            // Try provisioning to central auth with a few retries. We attempt
            // multiple candidate URLs so this works both in Docker network and
            // when running services locally.
            $authCandidates = [];
            $envUrl = getenv('AUTH_SERVICE_URL');
            if ($envUrl) $authCandidates[] = $envUrl;
            $authCandidates[] = 'http://auth-backend/routes.php/create_user';
            $authCandidates[] = 'http://host.docker.internal:8081/routes.php/create_user';

            $maxAttempts = 3;
            $provisioned = false;
            $authResponse = null;

            for ($attempt = 1; $attempt <= $maxAttempts && !$provisioned; $attempt++) {
                foreach ($authCandidates as $authUrlCandidate) {
                    try {
                        $ch = curl_init($authUrlCandidate);
                        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                        curl_setopt($ch, CURLOPT_POST, true);
                        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
                        curl_setopt($ch, CURLOPT_HTTPHEADER, [
                            'Content-Type: application/json',
                            'Content-Length: ' . strlen($postData)
                        ]);
                        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
                        curl_setopt($ch, CURLOPT_TIMEOUT, 10);

                        $authResp = curl_exec($ch);
                        $curlErr = curl_errno($ch) ? curl_error($ch) : null;
                        curl_close($ch);

                        if ($curlErr) {
                            $authResponse = ['success' => false, 'error' => 'cURL error: ' . $curlErr, 'url' => $authUrlCandidate];
                            continue; // try next candidate
                        }

                        $decoded = json_decode($authResp, true);
                        $authResponse = $decoded ?: ['success' => false, 'raw' => $authResp, 'url' => $authUrlCandidate];
                        if (isset($authResponse['success']) && $authResponse['success']) {
                            $provisioned = true;
                            break 2; // success — break both loops
                        }
                    } catch (Exception $e) {
                        $authResponse = ['success' => false, 'error' => $e->getMessage(), 'url' => $authUrlCandidate];
                        continue;
                    }
                }

                // Exponential backoff before retrying
                if ($attempt < $maxAttempts) {
                    usleep(500000 * $attempt); // 0.5s, 1s, ...
                }
            }

            if (!$provisioned) {
                // Return an error so teacher knows provisioning failed and local staff wasn't created
                return [
                    'success' => false,
                    'message' => 'Failed to provision user to central auth',
                    'auth_response' => $authResponse
                ];
            }

            // Provisioned in auth successfully — now create local staff with the same staffId
            try {
                $result = $this->model->createStaffWithId($staffId, $teacherId, $data);
                $result['auth_provisioned'] = true;
                $result['auth_response'] = $authResponse;
                return $result;
            } catch (Exception $e) {
                // Compensating action: try to delete the user from central auth to avoid orphaned auth users
                try {
                    $deleteData = json_encode(['userid' => $staffId]);
                    $delCh = curl_init(str_replace('/create_user', '/user/' . $staffId, $authUrl));
                    curl_setopt($delCh, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($delCh, CURLOPT_CUSTOMREQUEST, 'DELETE');
                    curl_setopt($delCh, CURLOPT_POSTFIELDS, $deleteData);
                    curl_setopt($delCh, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
                    curl_exec($delCh);
                    curl_close($delCh);
                } catch (Exception $ignored) {
                    // ignore cleanup errors
                }

                return ['success' => false, 'message' => 'Failed to create local staff after provisioning: ' . $e->getMessage(), 'auth_response' => $authResponse];
            }
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error creating staff: ' . $e->getMessage()];
        }
    }

    // Get all staff for a teacher
    public function getStaffForTeacher($teacherId) {
        try {
            if (empty($teacherId)) return ['success' => false, 'message' => 'Teacher ID required'];
            $rows = $this->model->getStaffByTeacher($teacherId);
            return ['success' => true, 'data' => $rows];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error retrieving staff: ' . $e->getMessage()];
        }
    }

    // Staff login using staffId
    public function loginStaffWithId($staffId, $password) {
        try {
            if (empty($staffId) || empty($password)) {
                return ['success' => false, 'message' => 'Staff ID and password are required'];
            }
            $staff = $this->model->getStaffById($staffId);
            if (!$staff) return ['success' => false, 'message' => 'Invalid Staff ID or password'];
            if ($staff['status'] !== 'active') return ['success' => false, 'message' => 'Account is inactive'];
            if (!password_verify($password, $staff['password'])) {
                return ['success' => false, 'message' => 'Invalid Staff ID or password'];
            }

            // Remove password from response
            unset($staff['password']);

            // Create simple access tokens (compatibility with frontend teacher login)
            $accessToken = bin2hex(random_bytes(32));
            $refreshToken = bin2hex(random_bytes(32));

            // Attach role as 'teacher' so frontend AuthGuard treats staff as allowed to teacher dashboard
            $user = [
                'staffId' => $staff['staffId'],
                'name' => $staff['name'],
                'email' => $staff['email'],
                'phone' => $staff['phone'],
                'teacherId' => $staff['teacherId'],
                'role' => 'teacher',
                'permissions' => isset($staff['permissions']) ? json_decode($staff['permissions'], true) : null
            ];

            return [
                'success' => true,
                'accessToken' => $accessToken,
                'refreshToken' => $refreshToken,
                'user' => $user,
                'message' => 'Login successful'
            ];

        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error during staff login: ' . $e->getMessage()];
        }
    }

    // Get staff by staffId
    public function getStaffById($staffId) {
        try {
            if (empty($staffId)) return ['success' => false, 'message' => 'Staff ID required'];
            $staff = $this->model->getStaffById($staffId);
            if (!$staff) return ['success' => false, 'message' => 'Staff not found'];
            // Decode permissions before returning
            if (isset($staff['permissions']) && $staff['permissions'] !== null) {
                $staff['permissions'] = json_decode($staff['permissions'], true);
            }
            // Remove password if present
            if (isset($staff['password'])) unset($staff['password']);
            return ['success' => true, 'data' => $staff, 'message' => 'Staff retrieved successfully'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error retrieving staff: ' . $e->getMessage()];
        }
    }

    // Update staff permissions / details
    public function updateStaff($staffId, $data) {
        try {
            if (empty($staffId)) return ['success' => false, 'message' => 'Staff ID required'];

            $existing = $this->model->getStaffById($staffId);
            if (!$existing) return ['success' => false, 'message' => 'Staff not found'];

            $teacherId = $existing['teacherId'] ?? null;

            // Validate email if provided and not same as existing
            if (!empty($data['email']) && $data['email'] !== $existing['email']) {
                if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                    return ['success' => false, 'message' => 'Invalid email format'];
                }
                if ($this->model->staffEmailExists($data['email'], $teacherId)) {
                    return ['success' => false, 'message' => 'Email already exists for this teacher'];
                }
            }

            // Validate phone if provided and not same as existing
            if (!empty($data['phone']) && $data['phone'] !== $existing['phone']) {
                if (!preg_match('/^0\\d{9}$/', $data['phone'])) {
                    return ['success' => false, 'message' => 'Invalid phone format'];
                }
                if ($this->model->staffPhoneExists($data['phone'], $teacherId)) {
                    return ['success' => false, 'message' => 'Phone already exists for this teacher'];
                }
            }

            // If permissions provided, ensure it's an array
            if (isset($data['permissions']) && !is_array($data['permissions'])) {
                return ['success' => false, 'message' => 'Permissions must be an object/array'];
            }

            // Delegate to model
            $result = $this->model->updateStaff($staffId, $data);
            return $result;

        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error updating staff: ' . $e->getMessage()];
        }
    }

    // Delete a staff (local + try to remove from central auth)
    public function deleteStaff($staffId) {
        try {
            if (empty($staffId)) return ['success' => false, 'message' => 'Staff ID required'];

            $existing = $this->model->getStaffById($staffId);
            if (!$existing) return ['success' => false, 'message' => 'Staff not found'];

            // Attempt to delete from central auth (best-effort)
            $authCandidates = [];
            $envUrl = getenv('AUTH_SERVICE_URL');
            if ($envUrl) $authCandidates[] = rtrim($envUrl, '/') . '/user/' . $staffId;
            $authCandidates[] = 'http://auth-backend/routes.php/user/' . $staffId;
            $authCandidates[] = 'http://host.docker.internal:8081/routes.php/user/' . $staffId;

            $authResponses = [];
            foreach ($authCandidates as $url) {
                try {
                    $ch = curl_init($url);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
                    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
                    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 6);
                    $resp = curl_exec($ch);
                    $err = curl_errno($ch) ? curl_error($ch) : null;
                    curl_close($ch);
                    $authResponses[] = ['url' => $url, 'response' => $resp, 'error' => $err];
                } catch (Exception $e) {
                    $authResponses[] = ['url' => $url, 'error' => $e->getMessage()];
                }
            }

            // Delete local staff record
            $result = $this->model->deleteStaff($staffId);
            $result['auth_responses'] = $authResponses;
            return $result;

        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error deleting staff: ' . $e->getMessage()];
        }
    }
    
    // Check if phone number exists
    public function checkPhoneExists($phone) {
        try {
            if (empty($phone)) {
                return [
                    'success' => false,
                    'message' => 'Phone number is required'
                ];
            }
            
            $exists = $this->model->phoneExists($phone);
            return [
                'success' => true,
                'exists' => $exists,
                'message' => $exists ? 'Phone number already exists' : 'Phone number is available'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error checking phone number: ' . $e->getMessage()
            ];
        }
    }
    
    public function __destruct() {
        if ($this->conn) {
            $this->conn->close();
        }
    }
} 
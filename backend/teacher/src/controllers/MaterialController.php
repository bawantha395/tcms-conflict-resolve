<?php
/**
 * Material Controller
 * Business logic for materials management
 */

require_once __DIR__ . '/../models/MaterialModel.php';
require_once __DIR__ . '/../utils/PDFWatermark.php';
require_once __DIR__ . '/../utils/PDFPasswordProtector.php';

class MaterialController {
    private $model;
    private $uploadDir;
    private $tempDir;

    public function __construct($dbConnection) {
        $this->model = new MaterialModel($dbConnection);
        
        // Use absolute paths from the document root
        // MaterialController.php is in /var/www/html/ when deployed
        $documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? '/var/www/html';
        
        $this->uploadDir = $documentRoot . '/uploads/materials/';
        $this->tempDir = $documentRoot . '/uploads/temp/';
        
        // Create directories if they don't exist
        $this->ensureDirectoriesExist();
    }

    private function ensureDirectoriesExist() {
        if (!file_exists($this->uploadDir)) {
            mkdir($this->uploadDir, 0777, true);
        }
        if (!file_exists($this->tempDir)) {
            mkdir($this->tempDir, 0777, true);
        }
    }

    /**
     * Upload and process material
     */
    public function uploadMaterial($fileData, $postData) {
        try {
            // Validate file
            $validation = $this->validateFile($fileData);
            if (!$validation['valid']) {
                return ['success' => false, 'message' => $validation['message']];
            }

            $classId = $postData['class_id'];
            $teacherId = $postData['teacher_id'];
            $teacherName = $postData['teacher_name'];
            $title = $postData['title'];
            $description = $postData['description'] ?? '';
            $category = $postData['category'] ?? 'notes';

            // Create class directory
            $classDir = $this->uploadDir . "class_$classId/";
            if (!file_exists($classDir)) {
                mkdir($classDir, 0777, true);
                chmod($classDir, 0777);
            }

            // Generate unique filename
            $fileExt = pathinfo($fileData['name'], PATHINFO_EXTENSION);
            $uniqueName = 'material_' . time() . '_' . uniqid() . '.' . $fileExt;
            $filePath = $classDir . $uniqueName;

            // Move uploaded file
            if (!move_uploaded_file($fileData['tmp_name'], $filePath)) {
                return ['success' => false, 'message' => 'Failed to save file'];
            }

            // Store in database
            $materialData = [
                'class_id' => $classId,
                'teacher_id' => $teacherId,
                'teacher_name' => $teacherName,
                'title' => $title,
                'description' => $description,
                'file_type' => 'pdf',
                'file_name' => $fileData['name'],
                'file_path' => $filePath,
                'file_size' => $fileData['size'],
                'original_file_path' => $filePath,
                'is_password_protected' => true,
                'category' => $category
            ];

            $materialId = $this->model->create($materialData);

            if ($materialId) {
                return [
                    'success' => true,
                    'message' => 'Material uploaded successfully',
                    'material_id' => $materialId,
                    'file_path' => $filePath
                ];
            } else {
                // Clean up file if database insert failed
                unlink($filePath);
                return ['success' => false, 'message' => 'Failed to save material to database'];
            }

        } catch (Exception $e) {
            error_log("Material upload error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Upload failed: ' . $e->getMessage()];
        }
    }

    /**
     * Validate uploaded file
     */
    private function validateFile($fileData) {
        // Check for upload errors
        if ($fileData['error'] !== UPLOAD_ERR_OK) {
            return ['valid' => false, 'message' => 'File upload error'];
        }

        // Check file size (max 50MB)
        $maxSize = 50 * 1024 * 1024;
        if ($fileData['size'] > $maxSize) {
            return ['valid' => false, 'message' => 'File size exceeds 50MB limit'];
        }

        // Check file type (PDF only)
        $allowedTypes = ['application/pdf'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $fileData['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, $allowedTypes)) {
            return ['valid' => false, 'message' => 'Only PDF files are allowed'];
        }

        return ['valid' => true];
    }

    /**
     * Generate download with watermark and password protection
     */
    public function generateProtectedDownload($materialId, $studentId, $studentName) {
        try {
            // Get material details
            $material = $this->model->getById($materialId);
            if (!$material) {
                return ['success' => false, 'message' => 'Material not found'];
            }

            // Check if original file exists
            if (!file_exists($material['original_file_path'])) {
                return ['success' => false, 'message' => 'Material file not found on server'];
            }

            // Generate temporary files
            $tempId = uniqid();
            $watermarkedFile = $this->tempDir . "watermarked_{$studentId}_{$materialId}_{$tempId}.pdf";
            $protectedFile = $this->tempDir . "protected_{$studentId}_{$materialId}_{$tempId}.pdf";

            // Apply watermark
            $watermarkSuccess = PDFWatermark::create(
                $material['original_file_path'],
                $watermarkedFile,
                $studentId,
                $studentName,
                $material['teacher_name'],
                ''
            );

            if (!$watermarkSuccess) {
                // If watermarking fails (e.g., encrypted PDF), provide original file
                error_log("Warning: Watermarking failed for material {$materialId}. Providing original file.");
                
                // Log access
                $this->model->logAccess([
                    'material_id' => $materialId,
                    'student_id' => $studentId,
                    'student_name' => $studentName,
                    'access_type' => 'download',
                    'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '',
                    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
                    'watermark_applied' => 0
                ]);

                // Increment download count
                $this->model->incrementDownloadCount($materialId);

                // Return original file
                return [
                    'success' => true,
                    'file_path' => $material['original_file_path'],
                    'file_name' => $material['title'] . '.pdf',
                    'password' => null,
                    'password_protected' => false,
                    'watermarked' => false,
                    'warning' => 'This PDF could not be watermarked (may be encrypted by teacher)'
                ];
            }

            // Check if PDFtk is available for password protection
            $pdftkAvailable = PDFPasswordProtector::isAvailable();
            $password = $studentId; // Use student ID as password
            $finalFile = $watermarkedFile; // Default to watermarked file
            
            if ($pdftkAvailable) {
                // Apply password protection if PDFtk is available
                $protectSuccess = PDFPasswordProtector::protect(
                    $watermarkedFile,
                    $protectedFile,
                    $password
                );

                if ($protectSuccess) {
                    $finalFile = $protectedFile;
                    // Clean up watermarked file (we don't need it anymore)
                    if (file_exists($watermarkedFile)) unlink($watermarkedFile);
                } else {
                    // Password protection failed, but still provide watermarked PDF
                    error_log("Warning: Password protection failed, providing watermarked PDF without password");
                }
            } else {
                // PDFtk not available, log warning
                error_log("Warning: PDFtk not installed. PDF will be watermarked but not password protected.");
            }

            // Log access
            $this->model->logAccess([
                'material_id' => $materialId,
                'student_id' => $studentId,
                'student_name' => $studentName,
                'access_type' => 'download',
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '',
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
                'watermark_applied' => 1
            ]);

            // Increment download count
            $this->model->incrementDownloadCount($materialId);

            return [
                'success' => true,
                'file_path' => $finalFile,
                'file_name' => $material['title'] . '.pdf',
                'password' => $password,
                'password_protected' => $pdftkAvailable && file_exists($protectedFile)
            ];

        } catch (Exception $e) {
            error_log("Download generation error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to generate download: ' . $e->getMessage()];
        }
    }

    /**
     * Get materials for a class
     */
    public function getMaterialsByClass($classId) {
        return $this->model->getByClassId($classId);
    }

    /**
     * Get materials by teacher
     */
    public function getMaterialsByTeacher($teacherId) {
        return $this->model->getByTeacherId($teacherId);
    }

    /**
     * Delete material
     */
    public function deleteMaterial($materialId, $teacherId) {
        // Get material to verify ownership
        $material = $this->model->getById($materialId);
        if (!$material) {
            return ['success' => false, 'message' => 'Material not found'];
        }

        // Verify teacher owns this material
        if ($material['teacher_id'] !== $teacherId) {
            return ['success' => false, 'message' => 'Unauthorized'];
        }

        // Soft delete
        if ($this->model->delete($materialId)) {
            return ['success' => true, 'message' => 'Material deleted successfully'];
        }

        return ['success' => false, 'message' => 'Failed to delete material'];
    }

    /**
     * Update material details
     */
    public function updateMaterial($materialId, $data, $teacherId) {
        // Verify ownership
        $material = $this->model->getById($materialId);
        if (!$material || $material['teacher_id'] !== $teacherId) {
            return ['success' => false, 'message' => 'Unauthorized'];
        }

        if ($this->model->update($materialId, $data)) {
            return ['success' => true, 'message' => 'Material updated successfully'];
        }

        return ['success' => false, 'message' => 'Failed to update material'];
    }

    /**
     * Clean up old temporary files (should be called periodically)
     */
    public function cleanupTempFiles($olderThanMinutes = 30) {
        $files = glob($this->tempDir . '*');
        $now = time();
        $deleted = 0;

        foreach ($files as $file) {
            if (is_file($file)) {
                if ($now - filemtime($file) >= $olderThanMinutes * 60) {
                    unlink($file);
                    $deleted++;
                }
            }
        }

        return $deleted;
    }

    /**
     * Get access statistics for a material
     */
    public function getMaterialStats($materialId) {
        $material = $this->model->getById($materialId);
        $accessLog = $this->model->getAccessLog($materialId);

        return [
            'material' => $material,
            'total_downloads' => $material['download_count'] ?? 0,
            'recent_access' => $accessLog,
            'unique_students' => count(array_unique(array_column($accessLog, 'student_id')))
        ];
    }
}

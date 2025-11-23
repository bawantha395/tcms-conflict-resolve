<?php
/**
 * Recording Controller
 * Handles business logic for recording uploads, streaming, and downloads
 */

require_once __DIR__ . '/RecordingModel.php';

class RecordingController {
    private $model;
    private $uploadDir;
    private $maxFileSize;
    
    public function __construct($dbConnection) {
        $this->model = new RecordingModel($dbConnection);
        $this->uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/recordings/';
        $this->maxFileSize = 500 * 1024 * 1024; // 500MB max file size
        $this->ensureDirectoriesExist();
    }
    
    private function ensureDirectoriesExist() {
        if (!file_exists($this->uploadDir)) {
            mkdir($this->uploadDir, 0777, true);
        }
    }

    /**
     * Create generic watermarked template (runs in background)
     */
    private function createGenericWatermarkedTemplate($originalPath, $watermarkedDir, $fileName) {
        try {
            // Create command to run in background
            $basename = pathinfo($fileName, PATHINFO_FILENAME);
            $extension = pathinfo($fileName, PATHINFO_EXTENSION);
            $templateFile = $watermarkedDir . 'template_' . $basename . '.' . $extension;
            
            // Skip if template already exists
            if (file_exists($templateFile)) {
                return true;
            }
            
            // Build FFmpeg command with basic TCMS watermark
            $filterComplex = 
                "drawtext=text='STUDENT_ID':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:" .
                "fontsize=120:fontcolor=white@0.2:x=(w-text_w)/2:y=(h-text_h)/2-60," .
                "drawtext=text='TCMS PROTECTED':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:" .
                "fontsize=40:fontcolor=white@0.15:x=(w-text_w)/2:y=(h-text_h)/2+60";
            
            $ffmpegCmd = sprintf(
                'nohup ffmpeg -i %s -vf "%s" -c:v libx264 -preset medium -crf 23 -c:a copy -y %s > /dev/null 2>&1 &',
                escapeshellarg($originalPath),
                $filterComplex,
                escapeshellarg($templateFile)
            );
            
            // Run in background
            exec($ffmpegCmd);
            
            error_log("Started background watermarking for: " . $fileName);
            return true;
            
        } catch (Exception $e) {
            error_log("Background watermarking error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Create student-specific watermarked version from original
     */
    private function createStudentWatermarkedVersion($originalPath, $outputPath, $studentId) {
        try {
            // Build FFmpeg command with student ID watermark
            $filterComplex = 
                "drawtext=text='$studentId':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:" .
                "fontsize=120:fontcolor=white@0.2:x=(w-text_w)/2:y=(h-text_h)/2-60," .
                "drawtext=text='TCMS PROTECTED':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:" .
                "fontsize=40:fontcolor=white@0.15:x=(w-text_w)/2:y=(h-text_h)/2+60";
            
            $ffmpegCmd = sprintf(
                'ffmpeg -i %s -vf "%s" -c:v libx264 -preset ultrafast -crf 23 -c:a copy -movflags +faststart -y %s 2>&1',
                escapeshellarg($originalPath),
                $filterComplex,
                escapeshellarg($outputPath)
            );
            
            exec($ffmpegCmd, $output, $returnCode);
            
            return ($returnCode === 0 && file_exists($outputPath));
            
        } catch (Exception $e) {
            error_log("Student watermarking error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Upload and process recording
     */
    public function uploadRecording($fileData, $postData) {
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
            $category = $postData['category'] ?? 'lecture';
            $recordingType = $postData['recording_type'] ?? 'video';

            // Create class directory
            $classDir = $this->uploadDir . "class_$classId/";
            if (!file_exists($classDir)) {
                mkdir($classDir, 0777, true);
                chmod($classDir, 0777);
            }

            // Generate unique filename
            $fileExt = pathinfo($fileData['name'], PATHINFO_EXTENSION);
            $uniqueName = 'recording_' . time() . '_' . uniqid() . '.' . $fileExt;
            $filePath = $classDir . $uniqueName;

            // Move uploaded file
            if (!move_uploaded_file($fileData['tmp_name'], $filePath)) {
                return ['success' => false, 'message' => 'Failed to save file'];
            }

            // Get file info
            $fileSize = filesize($filePath);
            $mimeType = mime_content_type($filePath);
            
            // Get video duration (if ffmpeg is available)
            $duration = $this->getVideoDuration($filePath);
            
            // Generate thumbnail (if ffmpeg is available)
            $thumbnailPath = $this->generateThumbnail($filePath, $classDir, $uniqueName);

            // Store in database
            $recordingData = [
                'class_id' => $classId,
                'teacher_id' => $teacherId,
                'teacher_name' => $teacherName,
                'title' => $title,
                'description' => $description,
                'recording_type' => $recordingType,
                'file_name' => $fileData['name'],
                'file_path' => $filePath,
                'file_size' => $fileSize,
                'duration' => $duration,
                'thumbnail_path' => $thumbnailPath,
                'video_quality' => 'HD', // Can be detected from resolution
                'mime_type' => $mimeType,
                'category' => $category,
                'status' => 'ready'
            ];

            $recordingId = $this->model->create($recordingData);

            if ($recordingId) {
                return [
                    'success' => true,
                    'message' => 'Recording uploaded successfully',
                    'recording_id' => $recordingId,
                    'file_path' => $filePath,
                    'duration' => $duration,
                    'thumbnail' => $thumbnailPath
                ];
            } else {
                // Clean up file if database insert failed
                unlink($filePath);
                if ($thumbnailPath && file_exists($thumbnailPath)) {
                    unlink($thumbnailPath);
                }
                return ['success' => false, 'message' => 'Failed to save recording to database'];
            }

        } catch (Exception $e) {
            error_log("Recording upload error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Upload failed: ' . $e->getMessage()];
        }
    }

    /**
     * Validate uploaded file
     */
    private function validateFile($fileData) {
        // Check for upload errors
        if ($fileData['error'] !== UPLOAD_ERR_OK) {
            return ['valid' => false, 'message' => 'File upload error: ' . $this->getUploadErrorMessage($fileData['error'])];
        }

        // Check file size
        if ($fileData['size'] > $this->maxFileSize) {
            return ['valid' => false, 'message' => 'File size exceeds 500MB limit'];
        }

        // Check file type (video and audio files)
        $allowedTypes = [
            'video/mp4',
            'video/mpeg',
            'video/quicktime',
            'video/x-msvideo',
            'video/webm',
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            'audio/mp4'
        ];
        
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $fileData['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, $allowedTypes)) {
            return ['valid' => false, 'message' => 'Only video and audio files are allowed'];
        }

        return ['valid' => true];
    }

    /**
     * Get upload error message
     */
    private function getUploadErrorMessage($errorCode) {
        $errors = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE',
            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            UPLOAD_ERR_EXTENSION => 'Upload stopped by extension'
        ];
        
        return $errors[$errorCode] ?? 'Unknown upload error';
    }

    /**
     * Get video duration using ffmpeg (if available)
     */
    private function getVideoDuration($filePath) {
        // Check if ffmpeg is installed
        exec('which ffmpeg', $output, $returnCode);
        if ($returnCode !== 0) {
            return null;
        }

        $escapedPath = escapeshellarg($filePath);
        $command = "ffmpeg -i $escapedPath 2>&1 | grep 'Duration' | cut -d ' ' -f 4 | sed s/,//";
        
        exec($command, $output, $returnCode);
        
        if ($returnCode === 0 && !empty($output[0])) {
            // Parse duration from HH:MM:SS.ms format
            $parts = explode(':', $output[0]);
            if (count($parts) === 3) {
                $hours = (int)$parts[0];
                $minutes = (int)$parts[1];
                $seconds = (float)$parts[2];
                return ($hours * 3600) + ($minutes * 60) + $seconds;
            }
        }
        
        return null;
    }

    /**
     * Generate thumbnail from video using ffmpeg (if available)
     */
    private function generateThumbnail($videoPath, $outputDir, $videoName) {
        // Check if ffmpeg is installed
        exec('which ffmpeg', $output, $returnCode);
        if ($returnCode !== 0) {
            return null;
        }

        $thumbnailName = 'thumb_' . pathinfo($videoName, PATHINFO_FILENAME) . '.jpg';
        $thumbnailPath = $outputDir . $thumbnailName;
        
        $escapedVideo = escapeshellarg($videoPath);
        $escapedThumb = escapeshellarg($thumbnailPath);
        
        // Generate thumbnail at 5 seconds into the video
        $command = "ffmpeg -i $escapedVideo -ss 00:00:05 -vframes 1 -vf scale=320:-1 $escapedThumb 2>&1";
        
        exec($command, $output, $returnCode);
        
        if ($returnCode === 0 && file_exists($thumbnailPath)) {
            return $thumbnailPath;
        }
        
        return null;
    }

    /**
     * Stream recording for viewing
     */
    public function streamRecording($recordingId, $studentId, $studentName) {
        try {
            // Get recording details
            $recording = $this->model->getById($recordingId);
            if (!$recording) {
                return ['success' => false, 'message' => 'Recording not found'];
            }

            // Check if file exists
            if (!file_exists($recording['file_path'])) {
                return ['success' => false, 'message' => 'Recording file not found on server'];
            }

            // Increment view count
            $this->model->incrementViewCount($recordingId);

            // Log access
            $this->model->logAccess([
                'recording_id' => $recordingId,
                'student_id' => $studentId,
                'student_name' => $studentName,
                'access_type' => 'stream',
                'watch_duration' => 0,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                'device_type' => $this->detectDeviceType()
            ]);

            return [
                'success' => true,
                'file_path' => $recording['file_path'],
                'mime_type' => $recording['mime_type'],
                'file_name' => $recording['file_name'],
                'file_size' => $recording['file_size']
            ];

        } catch (Exception $e) {
            error_log("Recording stream error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to stream recording'];
        }
    }

    /**
     * Start background watermarking process
     */
    private function startBackgroundWatermarking($originalPath, $studentId, $studentName, $watermarkedDir) {
        try {
            // Create watermarked directory if needed
            if (!file_exists($watermarkedDir)) {
                mkdir($watermarkedDir, 0777, true);
                chmod($watermarkedDir, 0777);
            }

            // Generate output filename
            $basename = pathinfo($originalPath, PATHINFO_FILENAME);
            $extension = pathinfo($originalPath, PATHINFO_EXTENSION);
            $watermarkedFile = $watermarkedDir . $basename . '_' . $studentId . '_' . time() . '.' . $extension;

            // Get video info for scaling decision
            $fileSize = filesize($originalPath);
            $scalingFilter = '';
            
            // For large files (>100MB), scale down to 1080p
            if ($fileSize > 100 * 1024 * 1024) {
                $scalingFilter = 'scale=w=1920:h=1080:force_original_aspect_ratio=decrease,';
            }

            // Build watermark filter
            $filterComplex = 
                "drawtext=text='$studentId':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:" .
                "fontsize=120:fontcolor=white@0.2:x=(w-text_w)/2:y=(h-text_h)/2-60," .
                "drawtext=text='TCMS PROTECTED':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:" .
                "fontsize=40:fontcolor=white@0.15:x=(w-text_w)/2:y=(h-text_h)/2+60";

            // Build FFmpeg command for background processing
            $ffmpegCmd = sprintf(
                'nohup ffmpeg -i %s -vf "%s%s" -c:v libx264 -preset veryfast -crf 28 -maxrate 2M -bufsize 4M -c:a aac -b:a 128k -movflags +faststart -y %s > /dev/null 2>&1 &',
                escapeshellarg($originalPath),
                $scalingFilter,
                $filterComplex,
                escapeshellarg($watermarkedFile)
            );

            // Execute in background
            exec($ffmpegCmd);
            
            error_log("Background watermarking started: $watermarkedFile (PID: $!)");
            return true;

        } catch (Exception $e) {
            error_log("Background watermarking start error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Create watermarked video for download
     */
    private function createWatermarkedVideo($originalPath, $studentId, $studentName) {
        try {
            // Create watermarked directory if it doesn't exist
            $watermarkedDir = dirname($originalPath) . '/watermarked/';
            if (!file_exists($watermarkedDir)) {
                mkdir($watermarkedDir, 0777, true);
                chmod($watermarkedDir, 0777);
            }

            // Generate unique filename for watermarked version
            $basename = pathinfo($originalPath, PATHINFO_FILENAME);
            $extension = pathinfo($originalPath, PATHINFO_EXTENSION);
            $watermarkedFile = $watermarkedDir . $basename . '_' . $studentId . '_' . time() . '.' . $extension;

            // Check if recent watermarked version already exists (cache for 24 hours)
            $existingFiles = glob($watermarkedDir . $basename . '_' . $studentId . '_*.' . $extension);
            if (!empty($existingFiles)) {
                usort($existingFiles, function($a, $b) {
                    return filemtime($b) - filemtime($a);
                });
                $latestFile = $existingFiles[0];
                if ((time() - filemtime($latestFile)) < 86400) {
                    error_log("Reusing existing watermarked file: $latestFile");
                    return $latestFile;
                }
            }

            // Prepare watermark text with multiple layers
            // Escape colons in date/time to prevent FFmpeg filter parsing errors
            $currentDate = str_replace(':', '\\:', date('Y-m-d H:i'));
            
            // Create FFmpeg filter complex - Only center diagonal watermarks
            $filterComplex = 
                // Center: Large diagonal Student ID watermark
                "drawtext=text='$studentId':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:" .
                "fontsize=120:fontcolor=white@0.2:x=(w-text_w)/2:y=(h-text_h)/2-60," .
                
                // Center: TCMS text below student ID
                "drawtext=text='TCMS PROTECTED':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:" .
                "fontsize=40:fontcolor=white@0.15:x=(w-text_w)/2:y=(h-text_h)/2+60";

            // Get video info to determine if we need to scale down
            $fileSize = filesize($originalPath);
            $scalingFilter = '';
            
            // For very large files (>100MB), scale down to 1080p to speed up processing
            if ($fileSize > 100 * 1024 * 1024) {
                error_log("Large file detected ($fileSize bytes), scaling to 1080p for faster watermarking");
                $scalingFilter = 'scale=w=1920:h=1080:force_original_aspect_ratio=decrease,';
            }
            
            // Build FFmpeg command with aggressive optimization for large files
            $ffmpegCmd = sprintf(
                'ffmpeg -i %s -vf "%s%s" -c:v libx264 -preset veryfast -crf 28 -maxrate 2M -bufsize 4M -c:a aac -b:a 128k -movflags +faststart -y %s 2>&1',
                escapeshellarg($originalPath),
                $scalingFilter,
                $filterComplex,
                escapeshellarg($watermarkedFile)
            );

            error_log("Starting FFmpeg watermarking: " . basename($watermarkedFile));
            
            // Execute FFmpeg command
            exec($ffmpegCmd, $output, $returnCode);

            if ($returnCode !== 0 || !file_exists($watermarkedFile)) {
                error_log("FFmpeg watermarking failed: " . implode("\n", $output));
                // Return original file if watermarking fails
                return $originalPath;
            }

            // Clean up old watermarked files (older than 1 hour)
            $this->cleanupOldWatermarkedFiles($watermarkedDir);

            return $watermarkedFile;

        } catch (Exception $e) {
            error_log("Watermarking error: " . $e->getMessage());
            // Return original file if watermarking fails
            return $originalPath;
        }
    }

    /**
     * Clean up old watermarked files to save disk space
     */
    private function cleanupOldWatermarkedFiles($directory) {
        try {
            $files = glob($directory . '*');
            $now = time();
            foreach ($files as $file) {
                if (is_file($file) && ($now - filemtime($file)) > 86400) { // 24 hours
                    unlink($file);
                }
            }
        } catch (Exception $e) {
            error_log("Cleanup error: " . $e->getMessage());
        }
    }

    /**
     * Handle recording download with watermarking
     */
    public function downloadRecording($recordingId, $studentId, $studentName) {
        try {
            // Get recording details
            $recording = $this->model->getById($recordingId);
            if (!$recording) {
                return ['success' => false, 'message' => 'Recording not found'];
            }

            // Check if file exists
            if (!file_exists($recording['file_path'])) {
                return ['success' => false, 'message' => 'Recording file not found on server'];
            }

            // Check if cached watermarked version exists (less than 24 hours old)
            $watermarkedDir = dirname($recording['file_path']) . '/watermarked/';
            $basename = pathinfo($recording['file_path'], PATHINFO_FILENAME);
            $extension = pathinfo($recording['file_path'], PATHINFO_EXTENSION);
            
            // Look for existing watermarked file for this student
            $cachedFiles = glob($watermarkedDir . $basename . '_' . $studentId . '_*.' . $extension);
            $watermarkedPath = null;
            
            if (!empty($cachedFiles)) {
                // Sort by modification time, get newest
                usort($cachedFiles, function($a, $b) {
                    return filemtime($b) - filemtime($a);
                });
                
                $newestFile = $cachedFiles[0];
                // Use cache if less than 24 hours old and file is complete
                if ((time() - filemtime($newestFile)) < 86400 && filesize($newestFile) > 1000) {
                    $watermarkedPath = $newestFile;
                    error_log("Using cached watermarked file: $newestFile");
                }
            }
            
            // If no valid cache, start background watermarking and return original file
            if (!$watermarkedPath) {
                $fileSize = filesize($recording['file_path']);
                $fileSizeMB = round($fileSize / (1024 * 1024), 2);
                error_log("No cached watermarked version. Starting background process for student $studentId, recording $recordingId (Size: {$fileSizeMB}MB)");
                
                // Start background watermarking process
                $this->startBackgroundWatermarking(
                    $recording['file_path'],
                    $studentId,
                    $studentName,
                    $watermarkedDir
                );
                
                // Return original file immediately for instant download
                $watermarkedPath = $recording['file_path'];
                error_log("Serving original file while watermarking in background");
            }

            // Increment download count
            $this->model->incrementDownloadCount($recordingId);

            // Log access
            $this->model->logAccess([
                'recording_id' => $recordingId,
                'student_id' => $studentId,
                'student_name' => $studentName,
                'access_type' => 'download',
                'watch_duration' => 0,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                'device_type' => $this->detectDeviceType()
            ]);

            return [
                'success' => true,
                'file_path' => $watermarkedPath,
                'file_name' => 'TCMS_' . $studentId . '_' . $recording['file_name']
            ];

        } catch (Exception $e) {
            error_log("Recording download error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to download recording'];
        }
    }

    /**
     * Check if watermarked version is ready
     */
    public function checkWatermarkStatus($recordingId, $studentId) {
        try {
            // Get recording details
            $recording = $this->model->getById($recordingId);
            if (!$recording) {
                return ['success' => false, 'ready' => false, 'message' => 'Recording not found'];
            }

            // Check if watermarked version exists
            $watermarkedDir = dirname($recording['file_path']) . '/watermarked/';
            $basename = pathinfo($recording['file_path'], PATHINFO_FILENAME);
            $extension = pathinfo($recording['file_path'], PATHINFO_EXTENSION);
            
            // Look for existing watermarked file for this student
            $cachedFiles = glob($watermarkedDir . $basename . '_' . $studentId . '_*.' . $extension);
            
            if (!empty($cachedFiles)) {
                // Sort by modification time, get newest
                usort($cachedFiles, function($a, $b) {
                    return filemtime($b) - filemtime($a);
                });
                
                $newestFile = $cachedFiles[0];
                $fileSize = filesize($newestFile);
                $age = time() - filemtime($newestFile);
                
                // Check if file is complete (>1KB) and not too old (24 hours)
                if ($fileSize > 1000 && $age < 86400) {
                    return [
                        'success' => true,
                        'ready' => true,
                        'file_path' => $newestFile,
                        'file_size' => $fileSize,
                        'age_seconds' => $age,
                        'processing' => false
                    ];
                }
            }
            
            // Check if background process might still be running
            // Look for recently modified incomplete files
            $allFiles = glob($watermarkedDir . $basename . '_' . $studentId . '_*.' . $extension);
            foreach ($allFiles as $file) {
                $mtime = filemtime($file);
                // If file was modified in last 10 minutes, assume still processing
                if ((time() - $mtime) < 600) {
                    return [
                        'success' => true,
                        'ready' => false,
                        'processing' => true,
                        'message' => 'Watermarking in progress'
                    ];
                }
            }
            
            return [
                'success' => true,
                'ready' => false,
                'processing' => false,
                'message' => 'Watermarked version not available'
            ];

        } catch (Exception $e) {
            error_log("Watermark status check error: " . $e->getMessage());
            return ['success' => false, 'ready' => false, 'message' => 'Failed to check watermark status'];
        }
    }

    /**
     * Update recording metadata
     */
    public function updateRecording($recordingId, $updateData, $teacherId) {
        return $this->model->update($recordingId, $updateData, $teacherId);
    }

    /**
     * Delete recording
     */
    public function deleteRecording($recordingId, $teacherId) {
        return $this->model->delete($recordingId, $teacherId);
    }

    /**
     * Stream watermarked video download using FFmpeg on-the-fly
     */
    public function streamWatermarkedDownload($filePath, $fileName, $studentId, $studentName) {
        try {
            // Build FFmpeg filter for watermarks
            $filterComplex = 
                // Center: Large diagonal Student ID watermark
                "drawtext=text='$studentId':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:" .
                "fontsize=120:fontcolor=white@0.2:x=(w-text_w)/2:y=(h-text_h)/2-60," .
                
                // Center: TCMS text below student ID
                "drawtext=text='TCMS PROTECTED':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:" .
                "fontsize=40:fontcolor=white@0.15:x=(w-text_w)/2:y=(h-text_h)/2+60";

            // Build FFmpeg command to pipe output directly
            $ffmpegCmd = sprintf(
                'ffmpeg -i %s -vf "%s" -c:v libx264 -preset ultrafast -crf 23 -c:a copy -movflags +faststart -f mp4 pipe:1 2>/dev/null',
                escapeshellarg($filePath),
                $filterComplex
            );

            // Set headers for download
            header('Content-Type: video/mp4');
            header('Content-Disposition: attachment; filename="' . $fileName . '"');
            header('Cache-Control: no-cache, must-revalidate');
            header('Pragma: no-cache');
            
            // Flush headers
            flush();

            // Open FFmpeg process and pipe output directly to browser
            $process = popen($ffmpegCmd, 'r');
            if ($process) {
                while (!feof($process)) {
                    echo fread($process, 8192);
                    flush();
                }
                pclose($process);
            } else {
                throw new Exception("Failed to start FFmpeg process");
            }

        } catch (Exception $e) {
            error_log("Stream watermarked download error: " . $e->getMessage());
            // Fallback: serve original file
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="' . $fileName . '"');
            header('Content-Length: ' . filesize($filePath));
            readfile($filePath);
        }
    }

    /**
     * Get recordings by class
     */
    public function getRecordingsByClass($classId) {
        return $this->model->getByClassId($classId);
    }

    /**
     * Get recordings by teacher
     */
    public function getRecordingsByTeacher($teacherId) {
        return $this->model->getByTeacherId($teacherId);
    }

    /**
     * Update watch progress
     */
    public function updateWatchProgress($recordingId, $studentId, $position) {
        $recording = $this->model->getById($recordingId);
        if (!$recording || !$recording['duration']) {
            return false;
        }
        
        return $this->model->updateProgress(
            $recordingId,
            $studentId,
            $position,
            $recording['duration']
        );
    }

    /**
     * Get watch progress
     */
    public function getWatchProgress($recordingId, $studentId) {
        return $this->model->getProgress($recordingId, $studentId);
    }

    /**
     * Get recording statistics
     */
    public function getRecordingStats($recordingId) {
        return $this->model->getStats($recordingId);
    }

    /**
     * Detect device type from user agent
     */
    private function detectDeviceType() {
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        
        if (preg_match('/(tablet|ipad|playbook)|(android(?!.*(mobi|opera mini)))/i', $userAgent)) {
            return 'tablet';
        }
        
        if (preg_match('/(up.browser|up.link|mmp|symbian|smartphone|midp|wap|phone|android|iemobile)/i', $userAgent)) {
            return 'mobile';
        }
        
        return 'desktop';
    }
}

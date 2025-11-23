<?php

class StudyPackController {
    private $conn;

    public function __construct() {
        require_once __DIR__ . '/../config.php';
        // Use the global connection created in config.php; require_once may no-op here
        // so we must explicitly reference the global variable.
        if (!isset($conn)) {
            global $conn;
        }
        if (!isset($conn) || !$conn) {
            throw new Exception('Database connection not initialized');
        }
        $this->conn = $conn; // from config.php
    }

    private function ensureUploadsDir($subdir) {
        $base = __DIR__ . '/../uploads/study_packs/' . trim($subdir, '/');
        if (!is_dir($base)) {
            mkdir($base, 0775, true);
        }
        return realpath($base) ?: $base;
    }

    private function saveFile($file, $destDir) {
        if (!isset($file) || $file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('File upload error');
        }
        if (!is_dir($destDir)) {
            throw new Exception('Upload directory missing');
        }
        if (!is_writable($destDir)) {
            throw new Exception('Upload directory is not writable');
        }
        $safeName = time() . '_' . preg_replace('/[^A-Za-z0-9._-]/', '_', $file['name']);
        $destination = rtrim($destDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $safeName;
        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new Exception('Failed to move uploaded file');
        }
        // Return path relative to web root for serving
        $publicPath = '/uploads/study_packs/' . basename($destDir) . '/' . $safeName;
        return [$destination, $publicPath];
    }

    public function uploadVideo($post, $files) {
        try {
            $studyPackId = isset($post['study_pack_id']) ? intval($post['study_pack_id']) : 0;
            $title = $post['title'] ?? '';
            if ($studyPackId <= 0 || !isset($files['file'])) {
                return ['success' => false, 'message' => 'study_pack_id and file are required'];
            }

            // Ensure pack exists
            $stmt = $this->conn->prepare('SELECT id FROM study_packs WHERE id = ?');
            if (!$stmt) {
                return ['success' => false, 'message' => 'DB prepare failed: ' . $this->conn->error];
            }
            $stmt->bind_param('i', $studyPackId);
            if (!$stmt->execute()) {
                return ['success' => false, 'message' => 'DB execute failed: ' . $stmt->error];
            }
            // Use store_result to avoid mysqlnd dependency
            $stmt->store_result();
            if ($stmt->num_rows === 0) {
                return ['success' => false, 'message' => 'Study pack not found'];
            }

            $dir = $this->ensureUploadsDir('videos');
            list($abs, $public) = $this->saveFile($files['file'], $dir);

            $ins = $this->conn->prepare('INSERT INTO study_pack_videos (study_pack_id, file_path, title) VALUES (?, ?, ?)');
            if (!$ins) {
                return ['success' => false, 'message' => 'DB prepare failed: ' . $this->conn->error];
            }
            $ins->bind_param('iss', $studyPackId, $public, $title);
            if (!$ins->execute()) {
                return ['success' => false, 'message' => 'DB insert failed: ' . $ins->error];
            }

            return ['success' => true, 'message' => 'Video uploaded', 'data' => [
                'id' => $ins->insert_id,
                'file_path' => $public,
                'title' => $title
            ]];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error uploading video: ' . $e->getMessage()];
        }
    }

    public function uploadDocument($post, $files) {
        try {
            $studyPackId = isset($post['study_pack_id']) ? intval($post['study_pack_id']) : 0;
            $title = $post['title'] ?? '';
            if ($studyPackId <= 0 || !isset($files['file'])) {
                return ['success' => false, 'message' => 'study_pack_id and file are required'];
            }

            // Ensure pack exists
            $stmt = $this->conn->prepare('SELECT id FROM study_packs WHERE id = ?');
            if (!$stmt) {
                return ['success' => false, 'message' => 'DB prepare failed: ' . $this->conn->error];
            }
            $stmt->bind_param('i', $studyPackId);
            if (!$stmt->execute()) {
                return ['success' => false, 'message' => 'DB execute failed: ' . $stmt->error];
            }
            // Use store_result to avoid mysqlnd dependency
            $stmt->store_result();
            if ($stmt->num_rows === 0) {
                return ['success' => false, 'message' => 'Study pack not found'];
            }

            $dir = $this->ensureUploadsDir('documents');
            list($abs, $public) = $this->saveFile($files['file'], $dir);

            $ins = $this->conn->prepare('INSERT INTO study_pack_documents (study_pack_id, file_path, title) VALUES (?, ?, ?)');
            if (!$ins) {
                return ['success' => false, 'message' => 'DB prepare failed: ' . $this->conn->error];
            }
            $ins->bind_param('iss', $studyPackId, $public, $title);
            if (!$ins->execute()) {
                return ['success' => false, 'message' => 'DB insert failed: ' . $ins->error];
            }

            return ['success' => true, 'message' => 'Document uploaded', 'data' => [
                'id' => $ins->insert_id,
                'file_path' => $public,
                'title' => $title
            ]];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error uploading document: ' . $e->getMessage()];
        }
    }

    public function updateVideo($videoId, $input) {
        try {
            $title = $input['title'] ?? null;
            if ($title === null) return ['success' => false, 'message' => 'title required'];
            $stmt = $this->conn->prepare('UPDATE study_pack_videos SET title = ? WHERE id = ?');
            if (!$stmt) return ['success' => false, 'message' => 'DB prepare failed: ' . $this->conn->error];
            $stmt->bind_param('si', $title, $videoId);
            if (!$stmt->execute()) return ['success' => false, 'message' => 'DB update failed: ' . $stmt->error];
            if ($stmt->affected_rows === 0) return ['success' => false, 'message' => 'Video not found'];
            return ['success' => true, 'message' => 'Video updated'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error updating video: ' . $e->getMessage()];
        }
    }

    public function deleteVideo($videoId) {
        try {
            // First get path to optionally delete file from disk
            $q = $this->conn->prepare('SELECT file_path FROM study_pack_videos WHERE id = ?');
            $q->bind_param('i', $videoId);
            $q->execute();
            $res = $q->get_result();
            $row = $res->fetch_assoc();
            $stmt = $this->conn->prepare('DELETE FROM study_pack_videos WHERE id = ?');
            $stmt->bind_param('i', $videoId);
            if (!$stmt->execute()) return ['success' => false, 'message' => 'DB delete failed: ' . $stmt->error];
            if ($stmt->affected_rows === 0) return ['success' => false, 'message' => 'Video not found'];
            // Try remove file (optional)
            if ($row && !empty($row['file_path'])) {
                $abs = realpath(__DIR__ . '/..' . $row['file_path']);
                if ($abs && is_file($abs)) @unlink($abs);
            }
            return ['success' => true, 'message' => 'Video deleted'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error deleting video: ' . $e->getMessage()];
        }
    }

    public function updateDocument($docId, $input) {
        try {
            $title = $input['title'] ?? null;
            if ($title === null) return ['success' => false, 'message' => 'title required'];
            $stmt = $this->conn->prepare('UPDATE study_pack_documents SET title = ? WHERE id = ?');
            if (!$stmt) return ['success' => false, 'message' => 'DB prepare failed: ' . $this->conn->error];
            $stmt->bind_param('si', $title, $docId);
            if (!$stmt->execute()) return ['success' => false, 'message' => 'DB update failed: ' . $stmt->error];
            if ($stmt->affected_rows === 0) return ['success' => false, 'message' => 'Document not found'];
            return ['success' => true, 'message' => 'Document updated'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error updating document: ' . $e->getMessage()];
        }
    }

    public function deleteDocument($docId) {
        try {
            $q = $this->conn->prepare('SELECT file_path FROM study_pack_documents WHERE id = ?');
            $q->bind_param('i', $docId);
            $q->execute();
            $res = $q->get_result();
            $row = $res->fetch_assoc();
            $stmt = $this->conn->prepare('DELETE FROM study_pack_documents WHERE id = ?');
            $stmt->bind_param('i', $docId);
            if (!$stmt->execute()) return ['success' => false, 'message' => 'DB delete failed: ' . $stmt->error];
            if ($stmt->affected_rows === 0) return ['success' => false, 'message' => 'Document not found'];
            if ($row && !empty($row['file_path'])) {
                $abs = realpath(__DIR__ . '/..' . $row['file_path']);
                if ($abs && is_file($abs)) @unlink($abs);
            }
            return ['success' => true, 'message' => 'Document deleted'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error deleting document: ' . $e->getMessage()];
        }
    }

    /**
     * Serve a study pack document with watermark and password protection
     * Applies same security as MyClasses materials
     */
    public function downloadDocument($docId, $studentId, $studentName) {
        try {
            // Load required utilities
            require_once __DIR__ . '/../utils/PDFWatermark.php';
            require_once __DIR__ . '/../utils/PDFPasswordProtector.php';
            require_once __DIR__ . '/../models/StudyPackDocumentModel.php';
            
            // Initialize model
            $model = new StudyPackDocumentModel($this->conn);
            
            // Get document details
            $stmt = $this->conn->prepare('SELECT file_path, title FROM study_pack_documents WHERE id = ?');
            if (!$stmt) throw new Exception('DB prepare failed: ' . $this->conn->error);
            $stmt->bind_param('i', $docId);
            if (!$stmt->execute()) throw new Exception('DB execute failed: ' . $stmt->error);
            $res = $stmt->get_result();
            $row = $res->fetch_assoc();
            
            if (!$row) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Document not found']);
                return;
            }
            
            // Get original file path
            $originalFile = realpath(__DIR__ . '/..' . $row['file_path']);
            if (!$originalFile || !is_file($originalFile)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'File missing on server']);
                return;
            }
            
            // Setup temp directory
            $documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? __DIR__ . '/..';
            $tempDir = $documentRoot . '/uploads/temp/';
            if (!file_exists($tempDir)) {
                mkdir($tempDir, 0777, true);
            }
            
            // Generate unique temp file names
            $tempId = uniqid();
            $watermarkedFile = $tempDir . "watermarked_{$studentId}_{$docId}_{$tempId}.pdf";
            $protectedFile = $tempDir . "protected_{$studentId}_{$docId}_{$tempId}.pdf";
            
            // Apply watermark
            $watermarkSuccess = PDFWatermark::create(
                $originalFile,
                $watermarkedFile,
                $studentId,
                $studentName,
                'Study Pack',
                ''
            );
            
            $finalFile = $originalFile; // fallback to original
            $passwordProtected = false;
            $watermarked = false;
            
            if (!$watermarkSuccess) {
                // Watermarking failed (e.g., encrypted PDF)
                error_log("Warning: Watermarking failed for study pack document {$docId}. Providing original file.");
            } else {
                $watermarked = true;
                $finalFile = $watermarkedFile;
                
                // Apply password protection if PDFtk is available
                if (PDFPasswordProtector::isAvailable()) {
                    $protectSuccess = PDFPasswordProtector::protect(
                        $watermarkedFile,
                        $protectedFile,
                        $studentId // password = student ID
                    );
                    
                    if ($protectSuccess) {
                        $finalFile = $protectedFile;
                        $passwordProtected = true;
                        // Clean up watermarked file (we don't need it anymore)
                        if (file_exists($watermarkedFile)) unlink($watermarkedFile);
                    } else {
                        error_log("Warning: Password protection failed for study pack document {$docId}, providing watermarked PDF without password");
                    }
                } else {
                    error_log("Warning: PDFtk not installed. PDF will be watermarked but not password protected.");
                }
            }
            
            // Log access
            $model->logAccess([
                'document_id' => $docId,
                'student_id' => $studentId,
                'student_name' => $studentName,
                'access_type' => 'download',
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '',
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
                'watermark_applied' => $watermarked ? 1 : 0
            ]);
            
            // Increment download count
            $model->incrementDownloadCount($docId);
            
            // Stream file to browser
            header('Access-Control-Allow-Origin: *');
            header('Content-Type: application/pdf');
            $baseName = ($row['title'] ?: 'document') . '.pdf';
            header('Content-Disposition: attachment; filename="' . $baseName . '"');
            header('Content-Length: ' . filesize($finalFile));
            header('Cache-Control: no-cache, must-revalidate');
            header('Pragma: no-cache');
            
            readfile($finalFile);
            
            // Clean up temp files after download
            if ($finalFile !== $originalFile && file_exists($finalFile)) {
                unlink($finalFile);
            }
            
        } catch (Exception $e) {
            error_log("Study pack download error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Download error: ' . $e->getMessage()]);
        }
    }

    // Update a study pack link (title and/or url)
    public function updateLink($linkId, $input) {
        try {
            $fields = [];
            $params = [];
            $types = '';

            if (array_key_exists('link_title', $input)) {
                $fields[] = 'link_title = ?';
                $params[] = $input['link_title'];
                $types .= 's';
            }
            if (array_key_exists('link_url', $input)) {
                $fields[] = 'link_url = ?';
                $params[] = $input['link_url'];
                $types .= 's';
            }

            if (empty($fields)) {
                return ['success' => false, 'message' => 'No fields to update'];
            }

            $sql = 'UPDATE study_pack_links SET ' . implode(', ', $fields) . ' WHERE id = ?';
            $params[] = (int)$linkId;
            $types .= 'i';

            $stmt = $this->conn->prepare($sql);
            if (!$stmt) return ['success' => false, 'message' => 'DB prepare failed: ' . $this->conn->error];
            $stmt->bind_param($types, ...$params);
            if (!$stmt->execute()) return ['success' => false, 'message' => 'DB update failed: ' . $stmt->error];
            if ($stmt->affected_rows === 0) {
                // check if link exists
                $chk = $this->conn->prepare('SELECT id FROM study_pack_links WHERE id = ?');
                $chk->bind_param('i', $linkId);
                $chk->execute();
                $chk->store_result();
                if ($chk->num_rows === 0) return ['success' => false, 'message' => 'Link not found'];
            }
            return ['success' => true, 'message' => 'Link updated'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error updating link: ' . $e->getMessage()];
        }
    }

    // Delete a study pack link
    public function deleteLink($linkId) {
        try {
            $stmt = $this->conn->prepare('DELETE FROM study_pack_links WHERE id = ?');
            if (!$stmt) return ['success' => false, 'message' => 'DB prepare failed: ' . $this->conn->error];
            $stmt->bind_param('i', $linkId);
            if (!$stmt->execute()) return ['success' => false, 'message' => 'DB delete failed: ' . $stmt->error];
            if ($stmt->affected_rows === 0) return ['success' => false, 'message' => 'Link not found'];
            return ['success' => true, 'message' => 'Link deleted'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error deleting link: ' . $e->getMessage()];
        }
    }
}

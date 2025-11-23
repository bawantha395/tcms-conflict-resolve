<?php
/**
 * Recording Model
 * Handles all database operations for recordings
 */

class RecordingModel {
    private $conn;
    
    public function __construct($dbConnection) {
        $this->conn = $dbConnection;
    }

    /**
     * Create new recording entry
     */
    public function create($data) {
        $sql = "INSERT INTO recordings 
                (class_id, teacher_id, teacher_name, title, description, 
                 recording_type, file_name, file_path, file_size, duration, 
                 thumbnail_path, video_quality, mime_type, category, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param(
            "isssssssissssss",
            $data['class_id'],
            $data['teacher_id'],
            $data['teacher_name'],
            $data['title'],
            $data['description'],
            $data['recording_type'],
            $data['file_name'],
            $data['file_path'],
            $data['file_size'],
            $data['duration'],
            $data['thumbnail_path'],
            $data['video_quality'],
            $data['mime_type'],
            $data['category'],
            $data['status']
        );

        if ($stmt->execute()) {
            return $this->conn->insert_id;
        }
        return false;
    }

    /**
     * Get recordings by class ID
     */
    public function getByClassId($classId, $status = 'ready') {
        $sql = "SELECT * FROM recordings 
                WHERE class_id = ? AND status = ? 
                ORDER BY upload_date DESC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("is", $classId, $status);
        $stmt->execute();
        
        $result = $stmt->get_result();
        $recordings = [];
        
        while ($row = $result->fetch_assoc()) {
            $recordings[] = $row;
        }
        
        return $recordings;
    }

    /**
     * Get single recording by ID
     */
    public function getById($id) {
        $sql = "SELECT * FROM recordings WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }

    /**
     * Get recordings by teacher
     */
    public function getByTeacherId($teacherId) {
        $sql = "SELECT r.*, COUNT(DISTINCT ral.student_id) as unique_viewers 
                FROM recordings r 
                LEFT JOIN recording_access_log ral ON r.id = ral.recording_id 
                WHERE r.teacher_id = ? AND r.status != 'deleted' 
                GROUP BY r.id 
                ORDER BY r.upload_date DESC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("s", $teacherId);
        $stmt->execute();
        
        $result = $stmt->get_result();
        $recordings = [];
        
        while ($row = $result->fetch_assoc()) {
            $recordings[] = $row;
        }
        
        return $recordings;
    }

    /**
     * Update recording
     */
    public function update($id, $data, $teacherId) {
        // Build dynamic update query
        $fields = [];
        $values = [];
        $types = '';
        
        if (isset($data['title'])) {
            $fields[] = "title = ?";
            $values[] = $data['title'];
            $types .= 's';
        }
        if (isset($data['description'])) {
            $fields[] = "description = ?";
            $values[] = $data['description'];
            $types .= 's';
        }
        if (isset($data['category'])) {
            $fields[] = "category = ?";
            $values[] = $data['category'];
            $types .= 's';
        }
        if (isset($data['status'])) {
            $fields[] = "status = ?";
            $values[] = $data['status'];
            $types .= 's';
        }
        
        if (empty($fields)) {
            return false;
        }
        
        $values[] = $id;
        $types .= 'i';
        $values[] = $teacherId;
        $types .= 's';
        
        $sql = "UPDATE recordings SET " . implode(", ", $fields) . " 
                WHERE id = ? AND teacher_id = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param($types, ...$values);
        
        return $stmt->execute();
    }

    /**
     * Delete recording (soft delete)
     */
    public function delete($id, $teacherId) {
        $sql = "UPDATE recordings SET status = 'deleted' 
                WHERE id = ? AND teacher_id = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("is", $id, $teacherId);
        
        return $stmt->execute();
    }

    /**
     * Increment view count
     */
    public function incrementViewCount($id) {
        $sql = "UPDATE recordings SET view_count = view_count + 1 WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $id);
        return $stmt->execute();
    }

    /**
     * Increment download count
     */
    public function incrementDownloadCount($id) {
        $sql = "UPDATE recordings SET download_count = download_count + 1 WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $id);
        return $stmt->execute();
    }

    /**
     * Log recording access
     */
    public function logAccess($data) {
        $sql = "INSERT INTO recording_access_log 
                (recording_id, student_id, student_name, access_type, 
                 watch_duration, ip_address, user_agent, device_type) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param(
            "isssisss",
            $data['recording_id'],
            $data['student_id'],
            $data['student_name'],
            $data['access_type'],
            $data['watch_duration'],
            $data['ip_address'],
            $data['user_agent'],
            $data['device_type']
        );
        
        return $stmt->execute();
    }

    /**
     * Get or create watch progress
     */
    public function getProgress($recordingId, $studentId) {
        $sql = "SELECT * FROM recording_progress 
                WHERE recording_id = ? AND student_id = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("is", $recordingId, $studentId);
        $stmt->execute();
        
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }

    /**
     * Update watch progress
     */
    public function updateProgress($recordingId, $studentId, $position, $duration) {
        $completionPercentage = $duration > 0 ? ($position / $duration) * 100 : 0;
        $isCompleted = $completionPercentage >= 90; // Consider 90%+ as completed
        
        $sql = "INSERT INTO recording_progress 
                (recording_id, student_id, last_position, completion_percentage, is_completed) 
                VALUES (?, ?, ?, ?, ?) 
                ON DUPLICATE KEY UPDATE 
                last_position = ?, 
                completion_percentage = ?, 
                is_completed = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param(
            "isidbidb",
            $recordingId,
            $studentId,
            $position,
            $completionPercentage,
            $isCompleted,
            $position,
            $completionPercentage,
            $isCompleted
        );
        
        return $stmt->execute();
    }

    /**
     * Get recording statistics
     */
    public function getStats($recordingId) {
        $sql = "SELECT 
                    r.view_count,
                    r.download_count,
                    COUNT(DISTINCT ral.student_id) as unique_viewers,
                    AVG(ral.watch_duration) as avg_watch_duration,
                    COUNT(DISTINCT CASE WHEN rp.is_completed = 1 THEN rp.student_id END) as completed_count
                FROM recordings r
                LEFT JOIN recording_access_log ral ON r.id = ral.recording_id
                LEFT JOIN recording_progress rp ON r.id = rp.recording_id
                WHERE r.id = ?
                GROUP BY r.id";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $recordingId);
        $stmt->execute();
        
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }

    /**
     * Get chapters for a recording
     */
    public function getChapters($recordingId) {
        $sql = "SELECT * FROM recording_chapters 
                WHERE recording_id = ? 
                ORDER BY timestamp ASC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $recordingId);
        $stmt->execute();
        
        $result = $stmt->get_result();
        $chapters = [];
        
        while ($row = $result->fetch_assoc()) {
            $chapters[] = $row;
        }
        
        return $chapters;
    }

    /**
     * Add chapter to recording
     */
    public function addChapter($recordingId, $title, $timestamp, $description = '') {
        $sql = "INSERT INTO recording_chapters 
                (recording_id, title, timestamp, description) 
                VALUES (?, ?, ?, ?)";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("isis", $recordingId, $title, $timestamp, $description);
        
        return $stmt->execute();
    }
}

<?php
/**
 * Study Pack Document Model
 * Database operations for study pack document tracking and logging
 */

class StudyPackDocumentModel {
    private $conn;

    public function __construct($dbConnection) {
        $this->conn = $dbConnection;
    }

    /**
     * Get document by ID
     */
    public function getById($docId) {
        $sql = "SELECT * FROM study_pack_documents WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $docId);
        $stmt->execute();
        
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }

    /**
     * Increment download count
     */
    public function incrementDownloadCount($docId) {
        $sql = "UPDATE study_pack_documents SET download_count = download_count + 1 WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $docId);
        return $stmt->execute();
    }

    /**
     * Log document access
     */
    public function logAccess($data) {
        $sql = "INSERT INTO study_pack_document_access_log (
            document_id, student_id, student_name, access_type,
            ip_address, user_agent, watermark_applied
        ) VALUES (?, ?, ?, ?, ?, ?, ?)";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param(
            "isssssi",
            $data['document_id'],
            $data['student_id'],
            $data['student_name'],
            $data['access_type'],
            $data['ip_address'],
            $data['user_agent'],
            $data['watermark_applied']
        );

        return $stmt->execute();
    }

    /**
     * Get access log for a document
     */
    public function getAccessLog($docId, $limit = 100) {
        $sql = "SELECT * FROM study_pack_document_access_log 
                WHERE document_id = ? 
                ORDER BY access_timestamp DESC 
                LIMIT ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("ii", $docId, $limit);
        $stmt->execute();
        
        $result = $stmt->get_result();
        $logs = [];
        
        while ($row = $result->fetch_assoc()) {
            $logs[] = $row;
        }
        
        return $logs;
    }

    /**
     * Get student's access history
     */
    public function getStudentAccessHistory($studentId, $limit = 50) {
        $sql = "SELECT dal.*, spd.title
                FROM study_pack_document_access_log dal
                JOIN study_pack_documents spd ON dal.document_id = spd.id
                WHERE dal.student_id = ?
                ORDER BY dal.access_timestamp DESC
                LIMIT ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("si", $studentId, $limit);
        $stmt->execute();
        
        $result = $stmt->get_result();
        $history = [];
        
        while ($row = $result->fetch_assoc()) {
            $history[] = $row;
        }
        
        return $history;
    }

    /**
     * Check if student has accessed a document
     */
    public function hasStudentAccessed($docId, $studentId) {
        $sql = "SELECT COUNT(*) as count FROM study_pack_document_access_log 
                WHERE document_id = ? AND student_id = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("is", $docId, $studentId);
        $stmt->execute();
        
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        return $row['count'] > 0;
    }

    /**
     * Get document statistics
     */
    public function getDocumentStats($docId) {
        $document = $this->getById($docId);
        $accessLog = $this->getAccessLog($docId);

        return [
            'document' => $document,
            'total_downloads' => $document['download_count'] ?? 0,
            'recent_access' => $accessLog,
            'unique_students' => count(array_unique(array_column($accessLog, 'student_id')))
        ];
    }
}

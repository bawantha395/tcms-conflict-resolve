<?php
require_once __DIR__ . '/../Database.php';

class Exam {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getAll() {
        $stmt = $this->db->query("SELECT * FROM exams");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getById($id) {
        $stmt = $this->db->prepare("SELECT * FROM exams WHERE exam_id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function create($title, $date, $creator_user_id, $teacher_id = null) {
        // Detect if teacher_id column exists (cache result in static var to avoid repeated queries)
        static $hasTeacherCol = null;
        if ($hasTeacherCol === null) {
            try {
                $cols = $this->db->query("SHOW COLUMNS FROM exams LIKE 'teacher_id'")->fetchAll(PDO::FETCH_ASSOC);
                $hasTeacherCol = count($cols) > 0;
            } catch (Exception $e) {
                $hasTeacherCol = false; // fail safe
            }
        }
        if ($hasTeacherCol) {
            $stmt = $this->db->prepare("INSERT INTO exams (title, date, creator_user_id, teacher_id) VALUES (?, ?, ?, ?)");
            $stmt->execute([$title, $date, $creator_user_id, $teacher_id]);
        } else {
            // Fallback for older schema (without teacher_id column)
            $stmt = $this->db->prepare("INSERT INTO exams (title, date, creator_user_id) VALUES (?, ?, ?)");
            $stmt->execute([$title, $date, $creator_user_id]);
            // (Optional) could log missing teacher column here
        }
        return $this->db->lastInsertId();
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM exams WHERE exam_id = ?");
        return $stmt->execute([$id]);
    }
}
?>
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

    public function create($title, $date, $creator_user_id) {
        $stmt = $this->db->prepare("INSERT INTO exams (title, date, creator_user_id) VALUES (?, ?, ?)");
        $stmt->execute([$title, $date, $creator_user_id]);
        return $this->db->lastInsertId();
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM exams WHERE exam_id = ?");
        return $stmt->execute([$id]);
    }
}
?>
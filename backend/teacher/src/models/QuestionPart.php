<?php
require_once __DIR__ . '/../Database.php';

class QuestionPart {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getByExamId($exam_id) {
        $stmt = $this->db->prepare("SELECT * FROM question_parts WHERE exam_id = ? ORDER BY display_order");
        $stmt->execute([$exam_id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function create($exam_id, $parent_part_id, $label, $max_marks, $display_order) {
        $stmt = $this->db->prepare("INSERT INTO question_parts (exam_id, parent_part_id, label, max_marks, display_order) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$exam_id, $parent_part_id, $label, $max_marks, $display_order]);
        return $this->db->lastInsertId();
    }

    public function update($part_id, $label, $max_marks) {
        $stmt = $this->db->prepare("UPDATE question_parts SET label = ?, max_marks = ? WHERE part_id = ?");
        return $stmt->execute([$label, $max_marks, $part_id]);
    }

    public function delete($part_id) {
        // Delete recursively
        $this->deleteChildren($part_id);
        $stmt = $this->db->prepare("DELETE FROM question_parts WHERE part_id = ?");
        return $stmt->execute([$part_id]);
    }

    private function deleteChildren($parent_id) {
        $stmt = $this->db->prepare("SELECT part_id FROM question_parts WHERE parent_part_id = ?");
        $stmt->execute([$parent_id]);
        $children = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($children as $child) {
            $this->deleteChildren($child['part_id']);
            $stmt = $this->db->prepare("DELETE FROM question_parts WHERE part_id = ?");
            $stmt->execute([$child['part_id']]);
        }
    }
}
?>
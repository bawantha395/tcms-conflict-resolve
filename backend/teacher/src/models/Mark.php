<?php
require_once __DIR__ . '/../Database.php';

class Mark {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getByExamId($exam_id) {
        $stmt = $this->db->prepare("
            SELECT m.*, qp.label, qp.max_marks
            FROM marks m
            JOIN question_parts qp ON m.question_part_id = qp.part_id
            WHERE qp.exam_id = ?
        ");
            $stmt = $this->db->prepare("
                SELECT m.*,
                       qp.label, qp.max_marks, qp.exam_id, qp.parent_part_id, qp.display_order,
                       parent.label AS parent_label, parent.display_order AS parent_display_order,
                       e.title AS exam_title
                FROM marks m
                JOIN question_parts qp ON m.question_part_id = qp.part_id
                LEFT JOIN question_parts parent ON qp.parent_part_id = parent.part_id
                JOIN exams e ON qp.exam_id = e.exam_id
                WHERE qp.exam_id = ?
            ");
        $stmt->execute([$exam_id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function saveBulk($exam_id, $marks) {
        $this->db->beginTransaction();
        try {
            foreach ($marks as $mark) {
                $stmt = $this->db->prepare("
                    INSERT INTO marks (student_identifier, question_part_id, score_awarded)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE score_awarded = VALUES(score_awarded)
                ");
                $stmt->execute([$mark['student_identifier'], $mark['question_part_id'], $mark['score_awarded']]);
            }
            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            return false;
        }
    }

    public function getAll() {
        $sql = "
            SELECT m.*, qp.label, qp.max_marks, qp.exam_id
            FROM marks m
            JOIN question_parts qp ON m.question_part_id = qp.part_id
            ORDER BY qp.exam_id, m.student_identifier, m.question_part_id
        ";
            $sql = "
                SELECT m.*,
                       qp.label, qp.max_marks, qp.exam_id, qp.parent_part_id, qp.display_order,
                       parent.label AS parent_label, parent.display_order AS parent_display_order,
                       e.title AS exam_title
                FROM marks m
                JOIN question_parts qp ON m.question_part_id = qp.part_id
                LEFT JOIN question_parts parent ON qp.parent_part_id = parent.part_id
                JOIN exams e ON qp.exam_id = e.exam_id
                ORDER BY qp.exam_id, parent.display_order IS NULL, parent.display_order, qp.display_order, m.student_identifier
            ";
        $stmt = $this->db->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getByStudentIdentifier($student_identifier) {
        $stmt = $this->db->prepare("\n            SELECT m.*, qp.label, qp.max_marks, qp.exam_id\n            FROM marks m\n            JOIN question_parts qp ON m.question_part_id = qp.part_id\n            WHERE m.student_identifier = ?\n            ORDER BY qp.exam_id, m.question_part_id\n        ");
        $stmt = $this->db->prepare("\n            SELECT m.*,\n                   qp.label, qp.max_marks, qp.exam_id, qp.parent_part_id, qp.display_order,\n                   parent.label AS parent_label, parent.display_order AS parent_display_order,\n                   e.title AS exam_title\n            FROM marks m\n            JOIN question_parts qp ON m.question_part_id = qp.part_id\n            LEFT JOIN question_parts parent ON qp.parent_part_id = parent.part_id\n            JOIN exams e ON qp.exam_id = e.exam_id\n            WHERE m.student_identifier = ?\n            ORDER BY qp.exam_id, parent.display_order IS NULL, parent.display_order, qp.display_order\n        ");
        $stmt->execute([$student_identifier]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>
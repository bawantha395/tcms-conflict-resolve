<?php
require_once __DIR__ . '/../models/Mark.php';
require_once __DIR__ . '/../config.php';

class MarkController {
    private $markModel;

    public function __construct() {
        $this->markModel = new Mark();
    }

    public function getResults($exam_id) {
        $marks = $this->markModel->getByExamId($exam_id);
        echo json_encode($marks);
    }

    public function saveMarks($exam_id) {
        $data = json_decode(file_get_contents('php://input'), true);
        if (isset($data['marks']) && is_array($data['marks'])) {
            if ($this->markModel->saveBulk($exam_id, $data['marks'])) {
                echo json_encode(['success' => true]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to save marks']);
            }
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid data']);
        }
    }

    public function getAll() {
        $marks = $this->markModel->getAll();
        echo json_encode($marks);
    }

    public function getByStudent($student_identifier) {
        $marks = $this->markModel->getByStudentIdentifier($student_identifier);
        echo json_encode($marks);
    }
}
?>
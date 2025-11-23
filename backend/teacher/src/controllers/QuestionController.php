<?php
require_once __DIR__ . '/../models/QuestionPart.php';
require_once __DIR__ . '/../config.php';

class QuestionController {
    private $questionModel;

    public function __construct() {
        $this->questionModel = new QuestionPart();
    }

    public function getByExamId($exam_id) {
        $questions = $this->questionModel->getByExamId($exam_id);
        echo json_encode($questions);
    }

    public function create($exam_id) {
        $data = json_decode(file_get_contents('php://input'), true);
        if (isset($data['label'], $data['max_marks'], $data['display_order']) && 
            array_key_exists('parent_part_id', $data)) {
            $id = $this->questionModel->create($exam_id, $data['parent_part_id'], $data['label'], $data['max_marks'], $data['display_order']);
            echo json_encode(['part_id' => $id]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid data']);
        }
    }

    public function update($exam_id, $part_id) {
        $data = json_decode(file_get_contents('php://input'), true);
        if (isset($data['label'], $data['max_marks'])) {
            if ($this->questionModel->update($part_id, $data['label'], $data['max_marks'])) {
                echo json_encode(['success' => true]);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Question part not found']);
            }
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid data']);
        }
    }

    public function delete($exam_id, $part_id) {
        if ($this->questionModel->delete($part_id)) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Question part not found']);
        }
    }
}
?>
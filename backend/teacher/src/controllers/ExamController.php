<?php
require_once __DIR__ . '/../models/Exam.php';
require_once __DIR__ . '/../config.php';

class ExamController {
    private $examModel;

    public function __construct() {
        $this->examModel = new Exam();
    }

    public function getAll() {
        $exams = $this->examModel->getAll();
        echo json_encode($exams);
    }

    public function getById($id) {
        $exam = $this->examModel->getById($id);
        if ($exam) {
            echo json_encode($exam);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Exam not found']);
        }
    }

    public function create() {
        $data = json_decode(file_get_contents('php://input'), true);
        if (isset($data['title'], $data['date'], $data['creator_user_id'])) {
            $id = $this->examModel->create($data['title'], $data['date'], $data['creator_user_id']);
            echo json_encode(['exam_id' => $id]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid data']);
        }
    }

    public function delete($id) {
        if ($this->examModel->delete($id)) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Exam not found']);
        }
    }
}
?>
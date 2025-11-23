<?php
require_once __DIR__ . '/../models/Exam.php';
require_once __DIR__ . '/../config.php';

class ExamController {
    private $examModel;

    public function __construct() {
        $this->examModel = new Exam();
    }

    public function getAll() {
        // Optional filtering by teacher_id (code like T001) or numeric creator id via ?teacher_id=
        $teacherFilter = isset($_GET['teacher_id']) ? trim($_GET['teacher_id']) : null;
        if ($teacherFilter !== null && $teacherFilter !== '') {
            try {
                $db = Database::getInstance()->getConnection();
                if (ctype_digit($teacherFilter)) {
                    // Numeric: match creator_user_id OR teacher_id (in case teacher_id stored as code only)
                    $stmt = $db->prepare('SELECT * FROM exams WHERE creator_user_id = ? OR teacher_id = ? ORDER BY exam_id DESC');
                    $stmt->execute([$teacherFilter, $teacherFilter]);
                } else {
                    // Alphanumeric teacher code (e.g., T001)
                    $stmt = $db->prepare('SELECT * FROM exams WHERE teacher_id = ? ORDER BY exam_id DESC');
                    $stmt->execute([$teacherFilter]);
                }
                $exams = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode($exams);
                return;
            } catch (Throwable $t) {
                http_response_code(500);
                echo json_encode(['error' => 'Filter error', 'detail' => $t->getMessage()]);
                return;
            }
        }
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
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            if (isset($data['title'], $data['date'], $data['creator_user_id'])) {
                $teacherId = $data['teacher_id'] ?? null; // teacherId code (e.g. T001)
                $numericCreator = $data['creator_user_id'];
                // If creator_user_id is not purely digits, treat it as teacherId code and resolve numeric id
                if (!ctype_digit((string)$numericCreator)) {
                    $lookupId = $this->resolveTeacherNumericId($numericCreator);
                    if ($lookupId === null) {
                        http_response_code(400);
                        echo json_encode(['error' => 'Unknown teacher code for creator_user_id']);
                        return;
                    }
                    $numericCreator = $lookupId;
                    // If teacher_id not provided, set from original code
                    if (!$teacherId) $teacherId = $data['creator_user_id'];
                }
                $id = $this->examModel->create($data['title'], $data['date'], (int)$numericCreator, $teacherId);
                echo json_encode(['exam_id' => $id]);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid data']);
            }
        } catch (Throwable $t) {
            http_response_code(500);
            echo json_encode(['error' => 'Create exam failed', 'detail' => $t->getMessage()]);
        }
    }

    private function resolveTeacherNumericId($teacherCode) {
        if (!$teacherCode) return null;
        try {
            $db = Database::getInstance()->getConnection();
            $stmt = $db->prepare('SELECT id FROM teachers WHERE teacherId = ? LIMIT 1');
            $stmt->execute([$teacherCode]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row ? (int)$row['id'] : null;
        } catch (Exception $e) {
            return null; // silent failure, caller handles
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
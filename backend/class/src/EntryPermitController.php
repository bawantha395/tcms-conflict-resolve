<?php
/**
 * Entry Permit Controller
 * Handles entry permits for students who forgot their ID cards
 */

class EntryPermitController {
    private $db;

    public function __construct($mysqli) {
        $this->db = $mysqli;
    }

    /**
     * Issue entry permit for student who forgot ID card
     * POST /entry_permit/issue
     * Body: { student_id, class_id, cashier_id, reason?, notes? }
     */
    public function issuePermit() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['student_id']) || !isset($data['class_id']) || !isset($data['cashier_id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Missing required fields']);
                return;
            }

            $student_id = $data['student_id'];
            $class_id = $data['class_id'];
            $cashier_id = $data['cashier_id'];
            $reason = $data['reason'] ?? 'Student forgot ID card - Entry permit issued';
            $notes = $data['notes'] ?? null;
            $permit_date = date('Y-m-d'); // Today's date

            // Check if permit already issued today for this student and class
            $checkStmt = $this->db->prepare(
                "SELECT id FROM entry_permit_history 
                 WHERE student_id = ? AND class_id = ? AND permit_date = ?"
            );
            $checkStmt->bind_param('sis', $student_id, $class_id, $permit_date);
            $checkStmt->execute();
            $existingPermit = $checkStmt->get_result()->fetch_assoc();
            $checkStmt->close();

            if ($existingPermit) {
                echo json_encode([
                    'success' => true, 
                    'message' => 'Entry permit already issued for today',
                    'permit_id' => $existingPermit['id'],
                    'is_reprint' => true
                ]);
                return;
            }

            // Insert new entry permit
            $stmt = $this->db->prepare(
                "INSERT INTO entry_permit_history 
                 (student_id, class_id, permit_date, cashier_id, reason, notes) 
                 VALUES (?, ?, ?, ?, ?, ?)"
            );
            $stmt->bind_param('sissss', $student_id, $class_id, $permit_date, $cashier_id, $reason, $notes);
            
            if ($stmt->execute()) {
                $permit_id = $stmt->insert_id;
                $stmt->close();

                echo json_encode([
                    'success' => true,
                    'message' => 'Entry permit issued successfully',
                    'permit_id' => $permit_id,
                    'permit_date' => $permit_date,
                    'is_reprint' => false
                ]);
            } else {
                throw new Exception('Failed to issue entry permit: ' . $stmt->error);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * Check if student has entry permit for specific date
     * GET /entry_permit/check?student_id=...&class_id=...&date=YYYY-MM-DD
     */
    public function checkPermit() {
        try {
            $student_id = $_GET['student_id'] ?? null;
            $class_id = $_GET['class_id'] ?? null;
            $date = $_GET['date'] ?? date('Y-m-d');

            if (!$student_id || !$class_id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Missing student_id or class_id']);
                return;
            }

            $stmt = $this->db->prepare(
                "SELECT eph.*, c.class_name, c.subject 
                 FROM entry_permit_history eph
                 JOIN classes c ON eph.class_id = c.id
                 WHERE eph.student_id = ? AND eph.class_id = ? AND eph.permit_date = ?"
            );
            $stmt->bind_param('sis', $student_id, $class_id, $date);
            $stmt->execute();
            $result = $stmt->get_result();
            $permit = $result->fetch_assoc();
            $stmt->close();

            if ($permit) {
                echo json_encode([
                    'success' => true,
                    'has_permit' => true,
                    'permit' => $permit,
                    'permit_date' => $permit['permit_date'],
                    'issued_at' => $permit['issued_at']
                ]);
            } else {
                echo json_encode([
                    'success' => true,
                    'has_permit' => false
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * Get all entry permits for today
     * GET /entry_permit/today
     */
    public function getTodayPermits() {
        try {
            $stmt = $this->db->prepare(
                "SELECT * FROM todays_entry_permits ORDER BY issued_at DESC"
            );
            $stmt->execute();
            $result = $stmt->get_result();
            $permits = [];
            
            while ($row = $result->fetch_assoc()) {
                $permits[] = $row;
            }
            $stmt->close();

            echo json_encode([
                'success' => true,
                'permits' => $permits,
                'count' => count($permits)
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * Get all entry permit history (with optional limit)
     * GET /entry_permit/history?limit=100
     */
    public function getPermitHistory() {
        try {
            $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
            
            $stmt = $this->db->prepare(
                "SELECT 
                    eph.*, 
                    c.class_name, 
                    c.subject,
                    eph.cashier_id as cashier_id,
                    eph.issued_at as issued_time
                 FROM entry_permit_history eph
                 JOIN classes c ON eph.class_id = c.id
                 ORDER BY eph.permit_date DESC, eph.issued_at DESC
                 LIMIT ?"
            );
            $stmt->bind_param('i', $limit);
            $stmt->execute();
            $result = $stmt->get_result();
            $permits = [];
            
            while ($row = $result->fetch_assoc()) {
                $permits[] = $row;
            }
            $stmt->close();

            echo json_encode([
                'success' => true,
                'permits' => $permits,
                'count' => count($permits)
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * Get entry permit count for a student
     * GET /entry_permit/student_count?student_id=...
     */
    public function getStudentPermitCount() {
        try {
            $student_id = $_GET['student_id'] ?? null;

            if (!$student_id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Missing student_id']);
                return;
            }

            $stmt = $this->db->prepare(
                "SELECT COUNT(*) as total_count,
                        COUNT(CASE WHEN permit_date = CURDATE() THEN 1 END) as today_count
                 FROM entry_permit_history 
                 WHERE student_id = ?"
            );
            $stmt->bind_param('s', $student_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $counts = $result->fetch_assoc();
            $stmt->close();

            echo json_encode([
                'success' => true,
                'student_id' => $student_id,
                'total_permits' => $counts['total_count'],
                'today_permits' => $counts['today_count']
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * Get entry permits by date range
     * GET /entry_permit/by_date?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
     */
    public function getPermitsByDateRange() {
        try {
            $start_date = $_GET['start_date'] ?? date('Y-m-01'); // First day of current month
            $end_date = $_GET['end_date'] ?? date('Y-m-d'); // Today

            $stmt = $this->db->prepare(
                "SELECT eph.*, c.class_name, c.subject 
                 FROM entry_permit_history eph
                 JOIN classes c ON eph.class_id = c.id
                 WHERE eph.permit_date BETWEEN ? AND ?
                 ORDER BY eph.permit_date DESC, eph.issued_at DESC"
            );
            $stmt->bind_param('ss', $start_date, $end_date);
            $stmt->execute();
            $result = $stmt->get_result();
            $permits = [];
            
            while ($row = $result->fetch_assoc()) {
                $permits[] = $row;
            }
            $stmt->close();

            echo json_encode([
                'success' => true,
                'permits' => $permits,
                'count' => count($permits),
                'start_date' => $start_date,
                'end_date' => $end_date
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

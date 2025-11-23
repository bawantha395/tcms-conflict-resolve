<?php
require_once __DIR__ . '/config.php';


header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}


$method = $_SERVER['REQUEST_METHOD'];


if ($method === 'GET' && isset($_GET['list'])) {
    // Return all hall bookings for the table
    $sql = "SELECT hb.*, t.name AS teacher_name FROM hall_bookings hb LEFT JOIN teachers t ON hb.teacherId = t.teacherId ORDER BY hb.date DESC, hb.start_time ASC";
    $result = $conn->query($sql);
    $halls = [];

    // Connect to classes database
    $classes_conn = new mysqli(
    'class-mysql-server',
    'classuser',
    'classpass',
    'class_db',
    3306
);
    if ($classes_conn->connect_error) {
        echo json_encode(['success' => false, 'message' => 'Error connecting to classes database: ' . $classes_conn->connect_error]);
    exit;
    }

    while ($row = $result->fetch_assoc()) {
        // If you have class_id in hall_bookings
        if (isset($row['class_id'])) {
            $class_id = $row['class_id'];
            $class_result = $classes_conn->query("SELECT class_name FROM classes WHERE id = $class_id");
            $class_row = $class_result ? $class_result->fetch_assoc() : null;
            $row['class_name'] = $class_row ? $class_row['class_name'] : null;
        }
        $halls[] = $row;
    }
    $classes_conn->close();

    echo json_encode(['success' => true, 'halls' => $halls]);
    exit;
}


// if ($method === 'GET' && isset($_GET['list'])) {
//     // Return all hall bookings for the table
//     $sql = "SELECT hb.*, t.name AS teacher_name FROM hall_bookings hb LEFT JOIN teachers t ON hb.teacherId = t.teacherId ORDER BY hb.date DESC, hb.start_time ASC";
//     $result = $conn->query($sql);
//     $halls = [];
//     while ($row = $result->fetch_assoc()) {
//         $halls[] = $row;
//     }
//     echo json_encode(['success' => true, 'halls' => $halls]);
//     exit;
// }

elseif ($method === 'GET') {
    // Fetch bookings for a date/time range, including teacher name
    $date = $_GET['date'] ?? null;
    $start_time = $_GET['start_time'] ?? null;
    $end_time = $_GET['end_time'] ?? null;

    if (!$date || !$start_time || !$end_time) {
        echo json_encode(['success' => false, 'message' => 'date, start_time and end_time are required']);
        exit;
    }

    try {
        $sql = "SELECT hb.*, t.name AS teacher_name
                FROM hall_bookings hb
                JOIN teachers t ON hb.teacherId = t.teacherId
                WHERE hb.date = ?
                  AND (
                      (hb.start_time < ? AND hb.end_time > ?) OR
                      (hb.start_time < ? AND hb.end_time > ?) OR
                      (hb.start_time >= ? AND hb.end_time <= ?)
                  )";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sssssss", $date, $end_time, $start_time, $end_time, $start_time, $start_time, $end_time);
        $stmt->execute();
        $result = $stmt->get_result();

        $conflicts = [];
        while ($row = $result->fetch_assoc()) {
            $conflicts[] = $row;
        }

        if (count($conflicts) > 0) {
            echo json_encode(['success' => true, 'available' => false, 'conflicts' => $conflicts]);
        } else {
            echo json_encode(['success' => true, 'available' => true, 'message' => 'Time slot is available']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error checking availability', 'error' => $e->getMessage()]);
    }

}elseif ($method === 'POST') {
    // Book hall
    $data = json_decode(file_get_contents("php://input"), true);
    $hall_name = $data['hall_name'] ?? null;
    $status = $data['status'] ?? 'booked';
    $subject = $data['subject'] ?? '';
    $class_id = isset($data['class_id']) ? (int)$data['class_id'] : null;
    $teacherId = $data['teacherId'] ?? null;
    $date = $data['date'] ?? null;
    $start_time = $data['start_time'] ?? null;
    $end_time = $data['end_time'] ?? null;

    if (!$hall_name || !$teacherId || !$date || !$start_time || !$end_time) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit;
    }

    // Validate teacherId exists in teachers table; set to NULL if not found
    if ($teacherId) {
        $tstmt = $conn->prepare("SELECT COUNT(*) AS cnt FROM teachers WHERE teacherId = ?");
        if ($tstmt) {
            $tstmt->bind_param("s", $teacherId);
            $tstmt->execute();
            $tres = $tstmt->get_result()->fetch_assoc();
            if (!$tres || (int)$tres['cnt'] === 0) {
                $teacherId = null;
            }
            $tstmt->close();
        }
    }

    // Prevent time overlap
    $sql = "SELECT COUNT(*) AS conflict FROM hall_bookings 
            WHERE hall_name = ? AND date = ?
            AND NOT (end_time <= ? OR start_time >= ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssss", $hall_name, $date, $start_time, $end_time);
    $stmt->execute();
    $conflict = $stmt->get_result()->fetch_assoc()['conflict'];

    if ($conflict > 0) {
        echo json_encode(['success' => false, 'message' => 'Time slot already booked']);
        exit;
    }

    // Insert booking with class_id (INT column)
    $insert = "INSERT INTO hall_bookings (hall_name, status, subject, class_id, teacherId, date, start_time, end_time)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($insert);
    $stmt->bind_param("sssissss", $hall_name, $status, $subject, $class_id, $teacherId, $date, $start_time, $end_time);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Hall booked successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error booking hall', 'error' => $stmt->error]);
    }

} elseif ($method === 'PUT') {
    // Edit (update) a hall booking
    $data = json_decode(file_get_contents("php://input"), true);
    $booking_id = $data['id'] ?? null;
    $hall_name = $data['hall_name'] ?? null;
    $status = $data['status'] ?? 'booked';
    $subject = $data['subject'] ?? '';
    $class_id = isset($data['class_id']) ? (int)$data['class_id'] : null;
    $teacherId = $data['teacherId'] ?? null;
    $date = $data['date'] ?? null;
    $start_time = $data['start_time'] ?? null;
    $end_time = $data['end_time'] ?? null;

    if (!$booking_id || !$hall_name || !$teacherId || !$date || !$start_time || !$end_time) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit;
    }

    // Validate teacherId exists in teachers table; set to NULL if not found
    if ($teacherId) {
        $tstmt = $conn->prepare("SELECT COUNT(*) AS cnt FROM teachers WHERE teacherId = ?");
        if ($tstmt) {
            $tstmt->bind_param("s", $teacherId);
            $tstmt->execute();
            $tres = $tstmt->get_result()->fetch_assoc();
            if (!$tres || (int)$tres['cnt'] === 0) {
                $teacherId = null;
            }
            $tstmt->close();
        }
    }

    // Prevent time overlap (excluding current booking)
    $sql = "SELECT COUNT(*) AS conflict FROM hall_bookings 
            WHERE hall_name = ? AND date = ? AND id != ?
            AND NOT (end_time <= ? OR start_time >= ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssiss", $hall_name, $date, $booking_id, $start_time, $end_time);
    $stmt->execute();
    $conflict = $stmt->get_result()->fetch_assoc()['conflict'];

    if ($conflict > 0) {
        echo json_encode(['success' => false, 'message' => 'Time slot already booked']);
        exit;
    }

    // Update booking with class_id (INT column)
    $update = "UPDATE hall_bookings SET hall_name = ?, status = ?, subject = ?, class_id = ?, teacherId = ?, date = ?, start_time = ?, end_time = ? WHERE id = ?";
    $stmt = $conn->prepare($update);
    $stmt->bind_param("sssissssi", $hall_name, $status, $subject, $class_id, $teacherId, $date, $start_time, $end_time, $booking_id);

    if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Booking updated successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'No rows updated. Check booking ID or data.']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Error updating booking', 'error' => $stmt->error]);
}

} elseif ($method === 'DELETE') {
    // Delete a hall booking
    parse_str(file_get_contents("php://input"), $data);
    $booking_id = $data['id'] ?? ($_GET['id'] ?? null);

    if (!$booking_id) {
        echo json_encode(['success' => false, 'message' => 'Booking ID is required']);
        exit;
    }

    $delete = "DELETE FROM hall_bookings WHERE id = ?";
    $stmt = $conn->prepare($delete);
    $stmt->bind_param("i", $booking_id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Booking deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error deleting booking']);
    }

} else {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
}
?>
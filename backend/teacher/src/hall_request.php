<?php
require_once __DIR__ . '/config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
	http_response_code(200);
	exit();
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
	// Create a new hall request
	$data = json_decode(file_get_contents('php://input'), true);
	$teacher_id = $data['teacher_id'] ?? null;
	$subject = $data['subject'] ?? '';
	$class_name = $data['class_name'] ?? '';
	$date = $data['date'] ?? null;
	$start_time = $data['start_time'] ?? null;
	$end_time = $data['end_time'] ?? null;
	$status = 'pending';

	if (!$teacher_id || !$date || !$start_time || !$end_time) {
		echo json_encode(['success' => false, 'message' => 'Missing required fields']);
		exit;
	}

	$sql = "INSERT INTO hall_requests (teacher_id, subject, class_name, date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)";
	$stmt = $conn->prepare($sql);
	$stmt->bind_param("sssssss", $teacher_id, $subject, $class_name, $date, $start_time, $end_time, $status);
	if ($stmt->execute()) {
		echo json_encode(['success' => true, 'message' => 'Request submitted successfully']);
	} else {
		echo json_encode(['success' => false, 'message' => 'Error submitting request']);
	}
	exit;

}

if ($method === 'PUT') {
	// Admin approve/reject a hall request
	$data = json_decode(file_get_contents('php://input'), true);
	$id = $data['id'] ?? null;
	$status = $data['status'] ?? null;
	if (!$id || !in_array($status, ['approved', 'rejected'])) {
		echo json_encode(['success' => false, 'message' => 'Missing or invalid id/status']);
		exit;
	}
	$sql = "UPDATE hall_requests SET status = ? WHERE id = ?";
	$stmt = $conn->prepare($sql);
	$stmt->bind_param("si", $status, $id);
	if ($stmt->execute()) {
		echo json_encode(['success' => true, 'message' => 'Request status updated']);
	} else {
		echo json_encode(['success' => false, 'message' => 'Failed to update request']);
	}
	exit;
}

if ($method === 'GET') {
	// If teacher_id is provided, get only that teacher's requests. Otherwise, get all requests (admin)
	$teacher_id = $_GET['teacher_id'] ?? null;
	if ($teacher_id) {
		$sql = "SELECT * FROM hall_requests WHERE teacher_id = ? ORDER BY date DESC, start_time DESC";
		$stmt = $conn->prepare($sql);
		$stmt->bind_param("s", $teacher_id);
		$stmt->execute();
		$result = $stmt->get_result();
	} else {
		$sql = "SELECT * FROM hall_requests ORDER BY date DESC, start_time DESC";
		$result = $conn->query($sql);
	}
	$requests = [];
	while ($row = $result->fetch_assoc()) {
		$requests[] = $row;
	}
	echo json_encode(['success' => true, 'requests' => $requests]);
	exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid request method']);
exit;

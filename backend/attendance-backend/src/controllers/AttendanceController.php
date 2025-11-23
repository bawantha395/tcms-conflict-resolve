<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Attendance.php';

$database = new Database();
$db = $database->getConnection();

$attendance = new Attendance($db);

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        // Mark attendance
        $data = json_decode(file_get_contents("php://input"));
        // echo json_encode("db_name: " . $database->getDbName());
        if (!empty($data->user_id) && !empty($data->class_id)) {
            $attendance->user_id = $data->user_id;
            $attendance->class_id = $data->class_id;
            $attendance->time_stamp = date('Y-m-d H:i:s');
            
            if ($attendance->mark()) {
                http_response_code(201);
                echo json_encode(array("message" => "Attendance marked."));
            } else {
                http_response_code(503);
                echo json_encode(array("message" => "Unable to mark attendance."));
            }
        } else {
            http_response_code(400);
            echo json_encode(array("message" => "Incomplete data."));
        }
        break;
        
    case 'DELETE':
        // Delete old records
        $days = isset($_GET['days']) ? $_GET['days'] : 30;
        
        if ($attendance->deleteOld($days)) {
            http_response_code(200);
            echo json_encode(array("message" => "Old records deleted."));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "Unable to delete old records."));
        }
        break;
        
    case 'GET':
        if (isset($_GET['user_id']) && isset($_GET['class_id'])) {
            // Get attendance for specific user in class
            $attendance->user_id = $_GET['user_id'];
            $attendance->class_id = $_GET['class_id'];
            
            $stmt = $attendance->getByUserAndClass();
            $num = $stmt->rowCount();
            
            if ($num > 0) {
                $attendance_arr = array();
                $attendance_arr["records"] = array();
                
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    extract($row);
                    $attendance_item = array(
                        "user_id" => $user_id,
                        "class_id" => $class_id,
                        "time_stamp" => $time_stamp
                    );
                    array_push($attendance_arr["records"], $attendance_item);
                }
                
                http_response_code(200);
                echo json_encode($attendance_arr);
            } else {
                http_response_code(404);
                echo json_encode(array("message" => "No attendance found."));
            }
        } elseif (isset($_GET['class_id'])) {
            // Get all attendance for a class
            $attendance->class_id = $_GET['class_id'];
            
            $stmt = $attendance->getByClass();
            $num = $stmt->rowCount();
            
            if ($num > 0) {
                $attendance_arr = array();
                $attendance_arr["records"] = array();
                
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    extract($row);
                    $attendance_item = array(
                        "user_id" => $user_id,
                        "class_id" => $class_id,
                        "time_stamp" => $time_stamp
                    );
                    array_push($attendance_arr["records"], $attendance_item);
                }
                
                http_response_code(200);
                echo json_encode($attendance_arr);
            } else {
                http_response_code(404);
                echo json_encode(array("message" => "No attendance found for this class."));
            }
        } else {
            http_response_code(400);
            echo json_encode(array("message" => "Missing parameters."));
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(array("message" => "Method not allowed."));
        break;
}
?>
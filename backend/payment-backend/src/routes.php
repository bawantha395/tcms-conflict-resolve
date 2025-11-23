<?php

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: false');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'PaymentController.php';
require_once 'PayHereController.php';
require_once 'DevPaymentHelper.php';
require_once 'EarningsConfigController.php';

$method = $_SERVER['REQUEST_METHOD'];

// Normalize path
$scriptName = $_SERVER['SCRIPT_NAME']; // e.g., /routes.php
$path = str_replace($scriptName, '', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// DB connection
$mysqli = new mysqli(
    getenv('DB_HOST'),
    getenv('DB_USER'),
    getenv('DB_PASSWORD'),
    getenv('DB_NAME')
);

if ($mysqli->connect_errno) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

$paymentController = new PaymentController($mysqli);
$payHereController = new PayHereController($mysqli);
$devPaymentHelper = new DevPaymentHelper($mysqli);
$earningsConfigController = new EarningsConfigController($mysqli);

// Test endpoint
if ($method === 'GET' && $path === '/test') {
    echo json_encode([
        'success' => true,
        'message' => 'Payment API is working!'
    ]);
    exit;
}

switch ($method) {
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        
        if ($path === '/create_payhere_payment') {
            $result = $payHereController->createPayHerePayment($input);
            echo json_encode($result);
        } elseif ($path === '/create_student_purchase') {
            $studentId = $input['student_id'] ?? null;
            $studyPackId = $input['study_pack_id'] ?? null;
            $transactionId = $input['transaction_id'] ?? null;
            $status = $input['status'] ?? 'completed';
            $result = $paymentController->createStudentPurchase($studentId, $studyPackId, $transactionId, $status);
            echo json_encode($result);
        } elseif ($path === '/payhere_notify') {
            $result = $payHereController->handlePayHereNotification($_POST);
            if ($result['status'] === 'success') {
                http_response_code(200);
                echo "OK";
            } else {
                http_response_code(400);
                echo $result['message'];
            }
        } elseif ($path === '/create_payment') {
            $result = $paymentController->createPayment($input);
            echo json_encode($result);
        } elseif ($path === '/process_payment') {
            $transactionId = $input['transactionId'];
            $result = $paymentController->processPayment($transactionId, $input);
            echo json_encode($result);
        } elseif ($path === '/delete_student_payments') {
            $email = $input['email'];
            $result = $paymentController->deleteStudentPayments($email);
            echo json_encode($result);
        } elseif ($path === '/dev/auto_complete_payment') {
            $orderId = $input['order_id'] ?? '';
            $result = $devPaymentHelper->autoCompletePayment($orderId);
            echo json_encode($result);
        } elseif ($path === '/dev/complete_all_pending_payments') {
            $result = $devPaymentHelper->completeAllPendingPayments();
            echo json_encode($result);
        } elseif ($path === '/dev/clear_all_payments') {
            $result = $devPaymentHelper->clearAllPayments();
            echo json_encode($result);
        } elseif ($path === '/dev/clear_student_payments') {
            $studentId = $input['studentId'] ?? '';
            $result = $devPaymentHelper->clearStudentPayments($studentId);
            echo json_encode($result);
        } elseif ($path === '/dev/recover_failed_enrollments') {
            $result = $devPaymentHelper->recoverFailedEnrollments();
            echo json_encode($result);
        } elseif ($path === '/dev/process_pending_enrollments') {
            $result = $devPaymentHelper->processPendingEnrollments();
            echo json_encode($result);
        } elseif ($path === '/dev/simulate_payhere_confirmation') {
            $orderId = $input['order_id'] ?? '';
            $result = $devPaymentHelper->simulatePayHereConfirmation($orderId);
            echo json_encode($result);
        } elseif ($path === '/update_delivery_status') {
            $transactionId = $input['transaction_id'] ?? '';
            $deliveryStatus = $input['delivery_status'] ?? '';
            $result = $paymentController->updateDeliveryStatus($transactionId, $deliveryStatus);
            echo json_encode($result);
        } elseif (preg_match('#^/earnings-config/(\d+)$#', $path, $matches)) {
            // POST /earnings-config/{classId} - Save/Update earnings config
            $classId = (int)$matches[1];
            $result = $earningsConfigController->saveClassConfig($classId, $input);
            echo json_encode($result);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
        }
        break;
        
    case 'GET':
        if ($path === '/get_payment_status' && isset($_GET['order_id'])) {
            $orderId = $_GET['order_id'];
            $result = $payHereController->getPaymentStatus($orderId);
            
            if (is_string($result) && ($result === 'not_found' || $result === 'error')) {
                echo json_encode(['success' => false, 'message' => $result]);
            } else {
                echo json_encode(['success' => true, 'data' => $result]);
            }
        } elseif ($path === '/get_student_payments' && isset($_GET['studentId'])) {
            $studentId = $_GET['studentId'];
            $result = $paymentController->getStudentPayments($studentId);
            echo json_encode($result);
        } elseif ($path === '/get_payment_by_transaction' && isset($_GET['transactionId'])) {
            $transactionId = $_GET['transactionId'];
            $result = $paymentController->getPaymentByTransactionId($transactionId);
            echo json_encode($result);
        } elseif ($path === '/health/studypack') {
            // Health check for study pack purchase flow
            $result = $paymentController->getStudyPackPurchaseHealth();
            echo json_encode($result);
        } elseif ($path === '/get_all_payments') {
            $result = $paymentController->getAllPayments();
            echo json_encode($result);
        } elseif ($path === '/get_student_purchases' && isset($_GET['studentId'])) {
            // Accept alphanumeric student IDs (e.g., S09231)
            $studentId = $_GET['studentId'];
            $result = $paymentController->getStudentPurchasedStudyPacks($studentId);
            echo json_encode($result);
        } elseif ($path === '/get_teacher_study_pack_purchases' && isset($_GET['teacherId'])) {
            $teacherId = $_GET['teacherId'];
            $result = $paymentController->getTeacherStudyPackPurchases($teacherId);
            echo json_encode($result);
        } elseif ($path === '/get_payment_stats') {
            $result = $paymentController->getPaymentStats();
            echo json_encode($result);
        } elseif ($path === '/get_cashier_stats' && isset($_GET['cashierId'])) {
            $cashierId = $_GET['cashierId'];
            $period = $_GET['period'] ?? 'today'; // today, month, all, or specific date YYYY-MM-DD
            $result = $paymentController->getCashierStats($cashierId, $period);
            echo json_encode($result);
        } elseif ($path === '/generate_invoice' && isset($_GET['transactionId'])) {
            $transactionId = $_GET['transactionId'];
            $result = $paymentController->generateInvoice($transactionId);
            echo json_encode($result);
        } elseif ($path === '/dev/get_pending_payments') {
            $result = $devPaymentHelper->getPendingPayments();
            echo json_encode($result);
        } elseif ($path === '/dev/debug_enrollment' && isset($_GET['studentId']) && isset($_GET['classId'])) {
            $studentId = $_GET['studentId'];
            $classId = $_GET['classId'];
            $result = $devPaymentHelper->debugEnrollment($studentId, $classId);
            echo json_encode($result);
        } elseif ($path === '/earnings-config') {
            // GET /earnings-config - Get all earnings configs
            $result = $earningsConfigController->getAllConfigs();
            echo json_encode($result);
        } elseif (preg_match('#^/earnings-config/(\d+)$#', $path, $matches)) {
            // GET /earnings-config/{classId} - Get specific class config
            $classId = (int)$matches[1];
            $result = $earningsConfigController->getClassConfig($classId);
            echo json_encode($result);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}
?>

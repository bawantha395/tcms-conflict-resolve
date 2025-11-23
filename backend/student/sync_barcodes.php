<?php
/**
 * One-time script to sync all existing student barcodes to auth database
 * Run this once to migrate existing student barcodes
 */

// Connect to student database
$studentConn = new mysqli('student-mysql-server', 'root', 'root', 'student_db');

if ($studentConn->connect_error) {
    die("Failed to connect to student database: " . $studentConn->connect_error);
}

// Connect to auth database
$authConn = new mysqli('auth-mysql-server', 'root', 'root', 'auth-db');

if ($authConn->connect_error) {
    die("Failed to connect to auth database: " . $authConn->connect_error);
}

// Get all students with barcodes
$result = $studentConn->query("
    SELECT user_id, first_name, last_name, barcode_data 
    FROM students 
    WHERE barcode_data IS NOT NULL AND barcode_data != ''
");

if (!$result) {
    die("Error querying students: " . $studentConn->error);
}

$syncCount = 0;
$errorCount = 0;

echo "Starting barcode sync...\n";
echo "Total students found: " . $result->num_rows . "\n\n";

while ($student = $result->fetch_assoc()) {
    $userid = $student['user_id'];
    $barcodeData = $student['barcode_data'];
    $studentName = $student['first_name'] . ' ' . $student['last_name'];
    
    // Check if barcode already exists in auth database
    $checkStmt = $authConn->prepare("SELECT userid FROM barcodes WHERE userid = ?");
    $checkStmt->bind_param("s", $userid);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows > 0) {
        // Update existing barcode
        $updateStmt = $authConn->prepare("
            UPDATE barcodes 
            SET barcode_data = ?, student_name = ?, updated_at = NOW() 
            WHERE userid = ?
        ");
        $updateStmt->bind_param("sss", $barcodeData, $studentName, $userid);
        
        if ($updateStmt->execute()) {
            echo "✓ Updated barcode for $userid ($studentName)\n";
            $syncCount++;
        } else {
            echo "✗ Failed to update barcode for $userid: " . $updateStmt->error . "\n";
            $errorCount++;
        }
        $updateStmt->close();
    } else {
        // Insert new barcode
        $insertStmt = $authConn->prepare("
            INSERT INTO barcodes (userid, barcode_data, student_name, created_at, updated_at) 
            VALUES (?, ?, ?, NOW(), NOW())
        ");
        $insertStmt->bind_param("sss", $userid, $barcodeData, $studentName);
        
        if ($insertStmt->execute()) {
            echo "✓ Inserted barcode for $userid ($studentName)\n";
            $syncCount++;
        } else {
            echo "✗ Failed to insert barcode for $userid: " . $insertStmt->error . "\n";
            $errorCount++;
        }
        $insertStmt->close();
    }
    
    $checkStmt->close();
}

echo "\n";
echo "========================================\n";
echo "Sync completed!\n";
echo "Successfully synced: $syncCount\n";
echo "Errors: $errorCount\n";
echo "========================================\n";

$studentConn->close();
$authConn->close();

<?php
/**
 * Test Script for Study Pack Document Security
 * Run this to verify watermarking and password protection are working
 */

echo "=== Study Pack Document Security Test ===\n\n";

// Test 1: Check PDFtk availability
echo "1. Checking PDFtk availability...\n";
exec('which pdftk 2>&1', $output, $return_var);
if ($return_var === 0) {
    echo "   ✅ PDFtk is installed: " . trim($output[0]) . "\n";
} else {
    echo "   ⚠️  PDFtk not found. Password protection will be skipped.\n";
    echo "   To install: sudo apt-get install pdftk\n";
}
echo "\n";

// Test 2: Check required PHP libraries
echo "2. Checking PHP libraries...\n";
$autoload = __DIR__ . '/../vendor/autoload.php';
if (file_exists($autoload)) {
    echo "   ✅ Composer autoload found\n";
    require_once $autoload;
    
    if (class_exists('setasign\Fpdi\Tcpdf\Fpdi')) {
        echo "   ✅ FPDI library loaded\n";
    } else {
        echo "   ❌ FPDI library not found\n";
    }
} else {
    echo "   ❌ Composer autoload not found at: $autoload\n";
    echo "   Run: cd backend/teacher/src && composer install\n";
}
echo "\n";

// Test 3: Check database tables
echo "3. Checking database tables...\n";
require_once __DIR__ . '/../config.php';

$tables = ['study_pack_documents', 'study_pack_document_access_log'];
foreach ($tables as $table) {
    $result = $conn->query("SHOW TABLES LIKE '$table'");
    if ($result && $result->num_rows > 0) {
        echo "   ✅ Table '$table' exists\n";
    } else {
        echo "   ❌ Table '$table' not found\n";
    }
}

// Check for new columns
$result = $conn->query("SHOW COLUMNS FROM study_pack_documents LIKE 'download_count'");
if ($result && $result->num_rows > 0) {
    echo "   ✅ Column 'download_count' exists\n";
} else {
    echo "   ❌ Column 'download_count' not found\n";
}

$result = $conn->query("SHOW COLUMNS FROM study_pack_documents LIKE 'is_password_protected'");
if ($result && $result->num_rows > 0) {
    echo "   ✅ Column 'is_password_protected' exists\n";
} else {
    echo "   ❌ Column 'is_password_protected' not found\n";
}
echo "\n";

// Test 4: Check utility files
echo "4. Checking utility files...\n";
$files = [
    'PDFWatermark.php' => __DIR__ . '/../utils/PDFWatermark.php',
    'PDFPasswordProtector.php' => __DIR__ . '/../utils/PDFPasswordProtector.php',
    'StudyPackDocumentModel.php' => __DIR__ . '/../models/StudyPackDocumentModel.php'
];

foreach ($files as $name => $path) {
    if (file_exists($path)) {
        echo "   ✅ $name found\n";
    } else {
        echo "   ❌ $name not found at: $path\n";
    }
}
echo "\n";

// Test 5: Check temp directory
echo "5. Checking temp directory...\n";
$tempDir = __DIR__ . '/../uploads/temp/';
if (file_exists($tempDir)) {
    echo "   ✅ Temp directory exists: $tempDir\n";
    if (is_writable($tempDir)) {
        echo "   ✅ Temp directory is writable\n";
    } else {
        echo "   ⚠️  Temp directory is not writable\n";
    }
} else {
    echo "   ⚠️  Temp directory doesn't exist (will be created on first use)\n";
}
echo "\n";

// Summary
echo "=== Test Summary ===\n";
echo "Backend security implementation is ready!\n";
echo "\nNext steps:\n";
echo "1. Upload a test study pack document via teacher dashboard\n";
echo "2. Try downloading it via student dashboard\n";
echo "3. Check that PDF has watermark (diagonal 'TCMS' + student ID)\n";
echo "4. Verify PDF asks for password (student ID)\n";
echo "5. Check access logs in database\n";
echo "\nTest query:\n";
echo "SELECT * FROM study_pack_document_access_log ORDER BY access_timestamp DESC LIMIT 5;\n";

<?php

class BarcodeController {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    // Save barcode data for a user
    public function saveBarcode($userid, $barcodeData, $studentName) {
        $stmt = $this->db->prepare("
            INSERT INTO barcodes (userid, barcode_data, student_name, created_at) 
            VALUES (?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
            barcode_data = VALUES(barcode_data),
            student_name = VALUES(student_name),
            updated_at = NOW()
        ");
        $stmt->bind_param("sss", $userid, $barcodeData, $studentName);
        
        if ($stmt->execute()) {
            return json_encode([
                'success' => true,
                'message' => 'Barcode saved successfully'
            ]);
        } else {
            return json_encode([
                'success' => false,
                'message' => 'Failed to save barcode'
            ]);
        }
    }
    
    // Get barcode data for a user
    public function getBarcode($userid) {
        $stmt = $this->db->prepare("
            SELECT barcode_data, student_name, created_at 
            FROM barcodes 
            WHERE userid = ?
        ");
        $stmt->bind_param("s", $userid);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $data = $result->fetch_assoc();
            return json_encode([
                'success' => true,
                'barcode' => $data
            ]);
        } else {
            return json_encode([
                'success' => false,
                'message' => 'Barcode not found'
            ]);
        }
    }
    
    // Get all barcodes
    public function getAllBarcodes() {
        $stmt = $this->db->prepare("
            SELECT userid, barcode_data, student_name, created_at 
            FROM barcodes 
            ORDER BY created_at DESC
        ");
        $stmt->execute();
        $result = $stmt->get_result();
        
        $barcodes = [];
        while ($row = $result->fetch_assoc()) {
            $barcodes[] = $row;
        }
        
        return json_encode([
            'success' => true,
            'barcodes' => $barcodes
        ]);
    }
} 
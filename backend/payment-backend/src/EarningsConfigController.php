<?php
// src/EarningsConfigController.php

class EarningsConfigController {
    private $mysqli;
    
    public function __construct($mysqli) {
        $this->mysqli = $mysqli;
    }
    
    /**
     * Normalize config keys from camelCase to snake_case (for incoming data)
     */
    private function normalizeConfigKeys($config) {
        $normalized = [];
        $keyMap = [
            'showDetailedView' => 'show_detailed_view',
            'earningsMode' => 'earnings_mode',
            'enableTeacherDashboard' => 'enable_teacher_dashboard',
            'hallRentPercentage' => 'hall_rent_percentage',
            'payherePercentage' => 'payhere_percentage',
            'otherExpenses' => 'other_expenses'
        ];
        
        foreach ($config as $key => $value) {
            $normalizedKey = $keyMap[$key] ?? $key;
            $normalized[$normalizedKey] = $value;
        }
        
        return $normalized;
    }
    
    /**
     * Convert snake_case keys to camelCase (for outgoing data)
     */
    private function convertToCamelCase($data) {
        $converted = [];
        $keyMap = [
            'show_detailed_view' => 'showDetailedView',
            'earnings_mode' => 'earningsMode',
            'enable_teacher_dashboard' => 'enableTeacherDashboard',
            'hall_rent_percentage' => 'hallRentPercentage',
            'payhere_percentage' => 'payherePercentage',
            'other_expenses' => 'otherExpenses',
            'class_id' => 'classId',
            'created_at' => 'createdAt',
            'updated_at' => 'updatedAt'
        ];
        
        foreach ($data as $key => $value) {
            $camelKey = $keyMap[$key] ?? $key;
            $converted[$camelKey] = $value;
        }
        
        return $converted;
    }
    
    /**
     * Get earnings configuration for a specific class
     */
    public function getClassConfig($classId) {
        try {
            $stmt = $this->mysqli->prepare("
                SELECT 
                    id,
                    class_id,
                    show_detailed_view,
                    earnings_mode,
                    enable_teacher_dashboard,
                    hall_rent_percentage,
                    payhere_percentage,
                    other_expenses,
                    created_at,
                    updated_at
                FROM class_earnings_config 
                WHERE class_id = ?
            ");
            
            $stmt->bind_param("i", $classId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($row = $result->fetch_assoc()) {
                // Decode JSON for other_expenses
                if ($row['other_expenses']) {
                    $row['other_expenses'] = json_decode($row['other_expenses'], true);
                } else {
                    $row['other_expenses'] = [];
                }
                
                // Convert boolean fields
                $row['show_detailed_view'] = (bool)$row['show_detailed_view'];
                $row['earnings_mode'] = (bool)$row['earnings_mode'];
                $row['enable_teacher_dashboard'] = (bool)$row['enable_teacher_dashboard'];
                
                // Convert numeric fields
                $row['hall_rent_percentage'] = (float)$row['hall_rent_percentage'];
                $row['payhere_percentage'] = (float)$row['payhere_percentage'];
                $row['class_id'] = (int)$row['class_id'];
                
                // Convert to camelCase for frontend
                $row = $this->convertToCamelCase($row);
                
                return [
                    'success' => true,
                    'data' => $row
                ];
            } else {
                // Return default config if not found
                $defaultConfig = [
                    'class_id' => (int)$classId,
                    'show_detailed_view' => false,
                    'earnings_mode' => false,
                    'enable_teacher_dashboard' => false,
                    'hall_rent_percentage' => 30.0,
                    'payhere_percentage' => 3.0,
                    'other_expenses' => []
                ];
                
                // Convert to camelCase for frontend
                return [
                    'success' => true,
                    'data' => $this->convertToCamelCase($defaultConfig)
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to retrieve earnings configuration: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Get all earnings configurations
     */
    public function getAllConfigs() {
        try {
            $result = $this->mysqli->query("
                SELECT 
                    id,
                    class_id,
                    show_detailed_view,
                    earnings_mode,
                    enable_teacher_dashboard,
                    hall_rent_percentage,
                    payhere_percentage,
                    other_expenses,
                    created_at,
                    updated_at
                FROM class_earnings_config
                ORDER BY class_id
            ");
            
            $configs = [];
            while ($row = $result->fetch_assoc()) {
                // Decode JSON for other_expenses
                if ($row['other_expenses']) {
                    $row['other_expenses'] = json_decode($row['other_expenses'], true);
                } else {
                    $row['other_expenses'] = [];
                }
                
                // Convert boolean fields
                $row['show_detailed_view'] = (bool)$row['show_detailed_view'];
                $row['earnings_mode'] = (bool)$row['earnings_mode'];
                $row['enable_teacher_dashboard'] = (bool)$row['enable_teacher_dashboard'];
                
                // Convert numeric fields
                $row['hall_rent_percentage'] = (float)$row['hall_rent_percentage'];
                $row['payhere_percentage'] = (float)$row['payhere_percentage'];
                $row['class_id'] = (int)$row['class_id'];
                
                // Convert to camelCase for frontend
                $configs[(int)$row['class_id']] = $this->convertToCamelCase($row);
            }
            
            return [
                'success' => true,
                'data' => $configs
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to retrieve earnings configurations: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Save or update earnings configuration for a class
     */
    public function saveClassConfig($classId, $config) {
        try {
            // Convert camelCase to snake_case for consistency
            $normalizedConfig = $this->normalizeConfigKeys($config);
            
            // Encode other_expenses as JSON
            $otherExpensesJson = json_encode($normalizedConfig['other_expenses'] ?? []);
            
            // Check if config exists
            $stmt = $this->mysqli->prepare("SELECT id FROM class_earnings_config WHERE class_id = ?");
            $stmt->bind_param("i", $classId);
            $stmt->execute();
            $result = $stmt->get_result();
            $exists = $result->num_rows > 0;
            
            if ($exists) {
                // Update existing config
                $stmt = $this->mysqli->prepare("
                    UPDATE class_earnings_config 
                    SET 
                        show_detailed_view = ?,
                        earnings_mode = ?,
                        enable_teacher_dashboard = ?,
                        hall_rent_percentage = ?,
                        payhere_percentage = ?,
                        other_expenses = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE class_id = ?
                ");
                
                $showDetailedView = $normalizedConfig['show_detailed_view'] ?? false;
                $earningsMode = $normalizedConfig['earnings_mode'] ?? false;
                $enableTeacherDashboard = $normalizedConfig['enable_teacher_dashboard'] ?? false;
                $hallRentPercentage = $normalizedConfig['hall_rent_percentage'] ?? 30.0;
                $payherePercentage = $normalizedConfig['payhere_percentage'] ?? 3.0;
                
                $stmt->bind_param(
                    "iiiddsi",
                    $showDetailedView,
                    $earningsMode,
                    $enableTeacherDashboard,
                    $hallRentPercentage,
                    $payherePercentage,
                    $otherExpensesJson,
                    $classId
                );
            } else {
                // Insert new config
                $stmt = $this->mysqli->prepare("
                    INSERT INTO class_earnings_config 
                    (class_id, show_detailed_view, earnings_mode, enable_teacher_dashboard, 
                     hall_rent_percentage, payhere_percentage, other_expenses)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                
                $showDetailedView = $normalizedConfig['show_detailed_view'] ?? false;
                $earningsMode = $normalizedConfig['earnings_mode'] ?? false;
                $enableTeacherDashboard = $normalizedConfig['enable_teacher_dashboard'] ?? false;
                $hallRentPercentage = $normalizedConfig['hall_rent_percentage'] ?? 30.0;
                $payherePercentage = $normalizedConfig['payhere_percentage'] ?? 3.0;
                
                $stmt->bind_param(
                    "iiiddds",
                    $classId,
                    $showDetailedView,
                    $earningsMode,
                    $enableTeacherDashboard,
                    $hallRentPercentage,
                    $payherePercentage,
                    $otherExpensesJson
                );
            }
            
            if ($stmt->execute()) {
                return [
                    'success' => true,
                    'message' => 'Earnings configuration saved successfully',
                    'data' => $this->getClassConfig($classId)['data']
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'Failed to save configuration: ' . $stmt->error
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to save earnings configuration: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Delete earnings configuration for a class
     */
    public function deleteClassConfig($classId) {
        try {
            $stmt = $this->mysqli->prepare("DELETE FROM class_earnings_config WHERE class_id = ?");
            $stmt->bind_param("i", $classId);
            
            if ($stmt->execute()) {
                return [
                    'success' => true,
                    'message' => 'Earnings configuration deleted successfully'
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'Failed to delete configuration: ' . $stmt->error
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to delete earnings configuration: ' . $e->getMessage()
            ];
        }
    }
}
?>

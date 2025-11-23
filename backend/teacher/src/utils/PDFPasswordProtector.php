<?php
/**
 * PDF Password Protection Utility
 * Applies password protection to PDF files using student ID as password
 */

require_once __DIR__ . '/../vendor/autoload.php';

use mikehaertl\pdftk\Pdf;

class PDFPasswordProtector {
    
    /**
     * Apply password protection to PDF
     * @param string $inputFile Path to input PDF
     * @param string $outputFile Path to save protected PDF
     * @param string $password Password (student ID)
     * @return bool Success status
     */
    public static function protect($inputFile, $outputFile, $password) {
        try {
            if (!file_exists($inputFile)) {
                throw new Exception("Input PDF file not found: $inputFile");
            }

            // Use command line pdftk directly
            $escapedInput = escapeshellarg($inputFile);
            $escapedOutput = escapeshellarg($outputFile);
            $escapedPassword = escapeshellarg($password);
            
            // Build pdftk command
            $command = "pdftk $escapedInput output $escapedOutput user_pw $escapedPassword allow printing";
            
            // Execute command
            exec($command . " 2>&1", $output, $returnCode);
            
            if ($returnCode !== 0) {
                $errorMsg = implode("\n", $output);
                throw new Exception("PDFtk command failed: $errorMsg");
            }
            
            if (!file_exists($outputFile)) {
                throw new Exception("Output file was not created");
            }
            
            return true;

        } catch (Exception $e) {
            error_log("PDF Password Protection Error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Apply password protection without restricting permissions
     * @param string $inputFile Path to input PDF
     * @param string $outputFile Path to save protected PDF
     * @param string $password Password (student ID)
     * @return bool Success status
     */
    public static function protectSimple($inputFile, $outputFile, $password) {
        try {
            if (!file_exists($inputFile)) {
                throw new Exception("Input PDF file not found: $inputFile");
            }

            // Use command line pdftk directly
            $escapedInput = escapeshellarg($inputFile);
            $escapedOutput = escapeshellarg($outputFile);
            $escapedPassword = escapeshellarg($password);
            
            // Build pdftk command
            $command = "pdftk $escapedInput output $escapedOutput user_pw $escapedPassword";
            
            // Execute command
            exec($command . " 2>&1", $output, $returnCode);
            
            if ($returnCode !== 0) {
                $errorMsg = implode("\n", $output);
                throw new Exception("PDFtk command failed: $errorMsg");
            }
            
            if (!file_exists($outputFile)) {
                throw new Exception("Output file was not created");
            }
            
            return true;

        } catch (Exception $e) {
            error_log("PDF Password Protection Error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Check if PDFtk is installed and available
     * @return bool
     */
    public static function isAvailable() {
        try {
            // Check if pdftk command exists
            $output = [];
            $return_var = 0;
            exec('which pdftk 2>&1', $output, $return_var);
            return $return_var === 0;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Get PDFtk version
     * @return string|false
     */
    public static function getVersion() {
        try {
            $pdf = new Pdf();
            return $pdf->getVersion();
        } catch (Exception $e) {
            return false;
        }
    }
}

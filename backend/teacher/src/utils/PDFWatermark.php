<?php
/**
 * PDF Watermarking Utility
 * Applies dynamic watermarks to PDF files with student information
 */

require_once __DIR__ . '/../vendor/autoload.php';

use setasign\Fpdi\Tcpdf\Fpdi;

class PDFWatermark {
    private $studentId;
    private $studentName;
    private $teacherName;
    private $className;
    private $timestamp;

    public function __construct($studentId, $studentName, $teacherName, $className = '') {
        $this->studentId = $studentId;
        $this->studentName = $studentName;
        $this->teacherName = $teacherName;
        $this->className = $className;
        
        // Set timezone to Asia/Colombo (Sri Lanka)
        date_default_timezone_set('Asia/Colombo');
        $this->timestamp = date('Y-m-d H:i:s');
    }

    /**
     * Apply watermark to PDF file
     * @param string $inputFile Path to input PDF
     * @param string $outputFile Path to save watermarked PDF
     * @return bool Success status
     */
    public function applyWatermark($inputFile, $outputFile) {
        try {
            if (!file_exists($inputFile)) {
                throw new Exception("Input PDF file not found: $inputFile");
            }

            // Create new PDF document
            $pdf = new Fpdi();
            $pdf->SetAutoPageBreak(false);
            
            // Get page count
            $pageCount = $pdf->setSourceFile($inputFile);

            // Process each page
            for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
                // Import page
                $templateId = $pdf->importPage($pageNo);
                $size = $pdf->getTemplateSize($templateId);
                
                // Add a page with the same size
                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                
                // Use the imported page
                $pdf->useTemplate($templateId);

                // Add watermark text
                $this->addWatermarkToPage($pdf, $size);
            }

            // Output to file
            $pdf->Output($outputFile, 'F');
            
            return true;

        } catch (Exception $e) {
            $errorMessage = $e->getMessage();
            error_log("PDF Watermark Error: " . $errorMessage);
            
            // Check for encrypted PDF error
            if (strpos($errorMessage, 'encrypted') !== false) {
                error_log("PDF is encrypted and cannot be processed");
            }
            
            return false;
        }
    }

    /**
     * Add watermark text to current page
     */
    private function addWatermarkToPage($pdf, $size) {
        // Large diagonal "TCMS" watermark with student ID
        $pdf->SetFont('helvetica', 'B', 80);
        $pdf->SetTextColor(200, 200, 200); // Light gray color
        $pdf->SetAlpha(0.15); // Very transparent

        // Diagonal TCMS watermark across page
        $pdf->StartTransform();
        $pdf->Rotate(45, $size['width']/2, $size['height']/2);
        $pdf->SetXY($size['width']/2 - 80, $size['height']/2 - 40);
        $pdf->Cell(160, 40, "TCMS", 0, 0, 'C');
        
        // Add student ID below TCMS
        $pdf->SetFont('helvetica', 'B', 40);
        $pdf->SetXY($size['width']/2 - 80, $size['height']/2 + 10);
        $pdf->Cell(160, 20, $this->studentId, 0, 0, 'C');
        $pdf->StopTransform();

        // Bottom watermark with student details
        $pdf->SetAlpha(0.8);
        $pdf->SetFont('helvetica', '', 8);
        $pdf->SetTextColor(80, 80, 80);
        
        // Bottom center - Student info
        $pdf->SetXY(10, $size['height'] - 10);
        $watermarkText = "Student: {$this->studentName} | ID: {$this->studentId}";
        $pdf->Cell(0, 5, $watermarkText, 0, 0, 'C');

        // Bottom center
        $pdf->SetXY(0, $size['height'] - 5);
        $pdf->Cell($size['width'], 3, "Downloaded: {$this->timestamp}", 0, 0, 'C');

        // Reset alpha
        $pdf->SetAlpha(1);
    }

    /**
     * Quick watermark method - create and apply in one call
     */
    public static function create($inputFile, $outputFile, $studentId, $studentName, $teacherName, $className = '') {
        $watermarker = new self($studentId, $studentName, $teacherName, $className);
        return $watermarker->applyWatermark($inputFile, $outputFile);
    }
}

import React, { useState, useEffect } from 'react';
import { FaPrint, FaDownload, FaTimes, FaCheckCircle, FaBuilding, FaPhone, FaEnvelope, FaGlobe, FaFileInvoice, FaCreditCard, FaShieldAlt } from 'react-icons/fa';
import { MdReceipt, MdPayment, MdAccessTime } from 'react-icons/md';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Receipt = ({ paymentData, onClose }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');

  useEffect(() => {
    // Generate a professional receipt number
    const generateReceiptNumber = () => {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      return `RCP-${timestamp}-${random}`;
    };
    setReceiptNumber(generateReceiptNumber());
  }, []);

  // Check if payment data is available
  if (!paymentData || !paymentData.transactionId) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <FaTimes className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payment Data</h3>
            <p className="text-gray-600 mb-6">Payment information is not available. Please complete a payment first.</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const generatePDF = async () => {
    setIsDownloading(true);
    try {
      const doc = new jsPDF();
      
      // Company Header - More compact
      doc.setFillColor(42, 157, 143);
      doc.rect(0, 0, 210, 25, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('CLASS MANAGEMENT SYSTEM', 105, 12, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('123 Education Street, Colombo, Sri Lanka | Phone: +94 11 234 5678', 105, 20, { align: 'center' });
      
      // Receipt Header - Compact
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT RECEIPT', 105, 35, { align: 'center' });
      
      // Receipt Details - Compact layout
      const receiptData = [
        ['Receipt No:', receiptNumber],
        ['Transaction ID:', paymentData.transactionId || paymentData.invoiceId],
        ['Date:', paymentData.date],
        ['Status:', 'PAID'],
        ['Method:', paymentData.paymentMethod || 'Online Payment'],
      ];
      
      autoTable(doc, {
        startY: 42,
        head: [],
        body: receiptData,
        theme: 'plain',
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 35, fillColor: [245, 245, 245] },
          1: { cellWidth: 60 }
        }
      });
      
      // Student Details - Compact
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Student Information', 20, doc.lastAutoTable.finalY + 8);
      
      const studentData = [
        ['Name:', `${paymentData.firstName || ''} ${paymentData.lastName || ''}`.trim() || paymentData.fullName || 'N/A'],
        ['Email:', paymentData.email || 'N/A'],
        ['Mobile:', paymentData.phone || paymentData.mobile || 'N/A'],
        ['Address:', paymentData.address || 'N/A'],
        ['City:', paymentData.city || 'N/A'],
      ];
      
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 12,
        head: [],
        body: studentData,
        theme: 'plain',
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 25, fillColor: [245, 245, 245] },
          1: { cellWidth: 70 }
        }
      });
      
      // Class Details - Compact
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Class Information', 20, doc.lastAutoTable.finalY + 8);
      
      const classData = [
        ['Class:', paymentData.className || 'N/A'],
        ['Subject:', paymentData.subject || 'N/A'],
        ['Teacher:', paymentData.teacher || 'N/A'],
        ['Stream:', paymentData.stream || 'N/A'],
        ['Type:', paymentData.courseType || 'N/A'],
      ];
      
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 12,
        head: [],
        body: classData,
        theme: 'plain',
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 25, fillColor: [245, 245, 245] },
          1: { cellWidth: 70 }
        }
      });
      
      // Payment Details - Compact
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Breakdown', 20, doc.lastAutoTable.finalY + 8);
      
      const paymentDetails = [
        ['Base Price:', `LKR ${(paymentData.basePrice || paymentData.amount || 0).toLocaleString()}`],
        ['Discount:', `LKR ${(paymentData.discount || 0).toLocaleString()}`],
        ['Speed Post:', `LKR ${(paymentData.speedPostFee || 0).toLocaleString()}`],
        ['Total:', `LKR ${(paymentData.amount || 0).toLocaleString()}`],
      ];
      
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 12,
        head: [],
        body: paymentDetails,
        theme: 'plain',
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 35, fillColor: [245, 245, 245] },
          1: { cellWidth: 60 }
        }
      });
      
      // Footer - Compact
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Thank you for choosing Class Management System!', 105, doc.lastAutoTable.finalY + 15, { align: 'center' });
      doc.text('Computer generated receipt. Support: info@cms.lk', 105, doc.lastAutoTable.finalY + 20, { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleString()}`, 105, doc.lastAutoTable.finalY + 25, { align: 'center' });
      
      // Save the PDF
      doc.save(`receipt-${receiptNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const printReceipt = () => {
    setIsPrinting(true);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt - ${receiptNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Inter', sans-serif; 
              background: white; 
              color: #1e293b;
              line-height: 1.4;
              font-size: 12px;
            }
            .receipt-container {
              max-width: 800px;
              margin: 10px auto;
              background: white;
              border: 1px solid #e2e8f0;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #2a9d8f 0%, #264653 100%);
              color: white;
              padding: 15px;
              text-align: center;
              margin: -20px -20px 15px -20px;
            }
            .company-logo {
              font-size: 20px;
              font-weight: 700;
              margin-bottom: 5px;
            }
            .company-info {
              font-size: 11px;
              opacity: 0.9;
            }
            .receipt-title {
              background: #f1f5f9;
              padding: 10px 15px;
              margin: 0 -20px 15px -20px;
              border-bottom: 1px solid #e2e8f0;
            }
            .receipt-number {
              font-size: 14px;
              font-weight: 600;
              color: #2a9d8f;
            }
            .content {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .section {
              margin-bottom: 15px;
            }
            .section-title {
              font-size: 13px;
              font-weight: 600;
              color: #2a9d8f;
              margin-bottom: 8px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 3px;
            }
            .info-item {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              font-size: 11px;
            }
            .info-label {
              font-weight: 500;
              color: #64748b;
            }
            .info-value {
              font-weight: 600;
              color: #1e293b;
            }
            .payment-breakdown {
              background: #f8fafc;
              border-radius: 4px;
              padding: 10px;
              margin-top: 10px;
            }
            .total-row {
              border-top: 2px solid #2a9d8f;
              margin-top: 8px;
              padding-top: 8px;
              font-size: 14px;
              font-weight: 700;
              color: #2a9d8f;
            }
            .footer {
              background: #f1f5f9;
              padding: 10px 15px;
              text-align: center;
              color: #64748b;
              font-size: 10px;
              margin: 15px -20px -20px -20px;
            }
            .status-badge {
              background: #10b981;
              color: white;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 600;
            }
            @media print {
              body { background: white; margin: 0; }
              .receipt-container { box-shadow: none; border: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <div class="company-logo">CLASS MANAGEMENT SYSTEM</div>
              <div class="company-info">
                123 Education Street, Colombo, Sri Lanka | Phone: +94 11 234 5678
              </div>
            </div>
            
            <div class="receipt-title">
              <div class="receipt-number">PAYMENT RECEIPT - ${receiptNumber}</div>
            </div>
            
            <div class="content">
              <div>
                <div class="section">
                  <div class="section-title">Receipt Information</div>
                  <div class="info-item">
                    <span class="info-label">Receipt Number:</span>
                    <span class="info-value">${receiptNumber}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Transaction ID:</span>
                    <span class="info-value">${paymentData.transactionId || paymentData.invoiceId}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Date:</span>
                    <span class="info-value">${paymentData.date}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Status:</span>
                    <span class="status-badge">PAID</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Payment Method:</span>
                    <span class="info-value">${paymentData.paymentMethod || 'Online Payment'}</span>
                  </div>
                </div>
                
                <div class="section">
                  <div class="section-title">Student Information</div>
                  <div class="info-item">
                    <span class="info-label">Full Name:</span>
                    <span class="info-value">${`${paymentData.firstName || ''} ${paymentData.lastName || ''}`.trim() || paymentData.fullName || 'N/A'}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${paymentData.email || 'N/A'}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Mobile:</span>
                    <span class="info-value">${paymentData.phone || paymentData.mobile || 'N/A'}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Address:</span>
                    <span class="info-value">${paymentData.address || 'N/A'}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">City:</span>
                    <span class="info-value">${paymentData.city || 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <div class="section">
                  <div class="section-title">Class Information</div>
                  <div class="info-item">
                    <span class="info-label">Class Name:</span>
                    <span class="info-value">${paymentData.className || 'N/A'}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Subject:</span>
                    <span class="info-value">${paymentData.subject || 'N/A'}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Teacher:</span>
                    <span class="info-value">${paymentData.teacher || 'N/A'}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Stream:</span>
                    <span class="info-value">${paymentData.stream || 'N/A'}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Course Type:</span>
                    <span class="info-value">${paymentData.courseType || 'N/A'}</span>
                  </div>
                </div>
                
                <div class="section">
                  <div class="section-title">Payment Breakdown</div>
                  <div class="payment-breakdown">
                    <div class="info-item">
                      <span class="info-label">Base Price:</span>
                      <span class="info-value">LKR ${(paymentData.basePrice || paymentData.amount || 0).toLocaleString()}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Discount:</span>
                      <span class="info-value">LKR ${(paymentData.discount || 0).toLocaleString()}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Speed Post Fee:</span>
                      <span class="info-value">LKR ${(paymentData.speedPostFee || 0).toLocaleString()}</span>
                    </div>
                    <div class="info-item total-row">
                      <span class="info-label">Total Amount:</span>
                      <span class="info-value">LKR ${(paymentData.amount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <div style="margin-bottom: 5px;">
                Thank you for choosing Class Management System!
              </div>
              <div>Computer generated receipt. For support, contact info@cms.lk</div>
              <div style="margin-top: 5px;">
                Generated on: ${new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
    setIsPrinting(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-800 text-white p-4 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">PAYMENT RECEIPT</h2>
              <p className="text-teal-100 text-sm mt-1">Class Management System</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-teal-200 transition-colors"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Number */}
        <div className="bg-gray-50 px-4 py-3 border-b">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm text-gray-600">Receipt Number:</span>
              <span className="ml-2 font-semibold text-teal-600">{receiptNumber}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                <FaCheckCircle className="inline mr-1" />
                PAID
              </span>
            </div>
          </div>
        </div>

        {/* Content - Compact Layout */}
        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Receipt Information */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <MdReceipt className="text-teal-600" />
                  Receipt Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-medium">{paymentData.transactionId || paymentData.invoiceId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{paymentData.date}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium">{paymentData.paymentMethod || 'Online Payment'}</span>
                  </div>
                </div>
              </div>

              {/* Student Information */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <FaBuilding className="text-teal-600" />
                  Student Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Full Name:</span>
                    <span className="font-medium">{`${paymentData.firstName || ''} ${paymentData.lastName || ''}`.trim() || paymentData.fullName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{paymentData.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Mobile:</span>
                    <span className="font-medium">{paymentData.phone || paymentData.mobile || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Address:</span>
                    <span className="font-medium">{paymentData.address || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">City:</span>
                    <span className="font-medium">{paymentData.city || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Class Information */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <FaFileInvoice className="text-teal-600" />
                  Class Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Class Name:</span>
                    <span className="font-medium">{paymentData.className || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subject:</span>
                    <span className="font-medium">{paymentData.subject || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Teacher:</span>
                    <span className="font-medium">{paymentData.teacher || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Stream:</span>
                    <span className="font-medium">{paymentData.stream || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Course Type:</span>
                    <span className="font-medium">{paymentData.courseType || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <FaCreditCard className="text-teal-600" />
                  Payment Breakdown
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Base Price:</span>
                    <span className="font-medium">LKR {(paymentData.basePrice || paymentData.amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-medium text-green-600">- LKR {(paymentData.discount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Speed Post Fee:</span>
                    <span className="font-medium">LKR {(paymentData.speedPostFee || 0).toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-base font-bold text-teal-600">
                      <span>Total Amount:</span>
                      <span>LKR {(paymentData.amount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-3 rounded-b-xl border-t">
          <div className="text-center text-gray-600 text-xs mb-3">
            <div className="flex items-center justify-center gap-2 mb-1">
              <FaShieldAlt className="text-teal-600" />
              Thank you for choosing Class Management System!
            </div>
            <p>Computer generated receipt. For support, contact info@cms.lk</p>
            <p className="mt-1">Generated on: {new Date().toLocaleString()}</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-center gap-3">
            <button
              onClick={printReceipt}
              disabled={isPrinting}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm"
            >
              <FaPrint />
              {isPrinting ? 'Printing...' : 'Print Receipt'}
            </button>
            <button
              onClick={generatePDF}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
            >
              <FaDownload />
              {isDownloading ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Receipt; 
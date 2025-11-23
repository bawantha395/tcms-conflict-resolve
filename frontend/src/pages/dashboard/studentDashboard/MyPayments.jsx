import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import studentSidebarSections from './StudentDashboardSidebar';
import BasicTable from '../../../components/BasicTable';
import { getStudentPayments } from '../../../api/payments';
import { getUserData } from '../../../api/apiUtils';
import { FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const columns = [
  { key: 'date', label: 'Date' },
  { key: 'className', label: 'Class' },
  { key: 'amount', label: 'Amount' },
  { key: 'method', label: 'Payment Method' },
  { key: 'status', label: 'Status' },
  { key: 'invoiceId', label: 'Transaction ID' },
];

const MyPayments = ({ onLogout }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingReceipt, setDownloadingReceipt] = useState(null);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get logged-in student data from authentication system
      const userData = getUserData();
      if (!userData || !userData.userid) {
        setError('No logged-in user found. Please login again.');
        setPayments([]);
        return;
      }
      
      const studentId = userData.userid;
      
      const response = await getStudentPayments(studentId);
      
      if (response.success && response.data) {
        // Map the data to ensure all fields are present
        const mappedPayments = response.data.map((p, index) => {
          const paymentType = p.payment_type || p.paymentType || 'class_payment';
          const isAdmissionFee = paymentType === 'admission_fee';
          
          // Build display label for class name
          let displayClassName = '';
          if (isAdmissionFee) {
            // For admission fee, show "Admission Fee" or "Admission Fee - Class Name"
            const baseName = p.class_name || p.className || '';
            displayClassName = baseName ? `Admission Fee - ${baseName}` : 'Admission Fee';
          } else {
            // For regular class payment, show class name
            displayClassName = p.class_name || p.className || (p.subject ? `${p.class_name || p.className} - ${p.subject}` : '');
          }
          
          return {
            date: p.date ? new Date(p.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }) : '',
            userId: p.user_id || p.userId || p.student_id || studentId || '', // Use user_id from backend
            className: displayClassName,
            amount: `LKR ${parseFloat(p.amount || 0).toLocaleString()}`,
            method: (p.payment_method || p.method || 'Online').charAt(0).toUpperCase() + (p.payment_method || p.method || 'Online').slice(1),
            status: (p.status || 'Paid').charAt(0).toUpperCase() + (p.status || 'Paid').slice(1),
            invoiceId: p.transaction_id || p.invoiceId || p.id || '',
          };
        });
        
        setPayments(mappedPayments);
      } else {
        setError(response.message || 'Failed to load payments');
        setPayments([]);
      }
    } catch (error) {
      setError(error.message || 'Failed to load payments');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  // Load payments on component mount
  useEffect(() => {
    loadPayments();
  }, []);

  const handleRefresh = () => {
    loadPayments();
  };

  const generateReceiptPDF = async (payment) => {
    setDownloadingReceipt(payment.invoiceId);
    try {
      // Fetch actual student details from backend
      const userData = getUserData();
      let studentDetails = null;
      
      if (userData?.userid) {
        try {
          const studentResponse = await fetch(`http://localhost:8086/routes.php/get_with_id/${userData.userid}`);
          const studentResult = await studentResponse.json();
          if (studentResult && studentResult.user_id) {
            studentDetails = studentResult;
          }
        } catch (e) {
          console.error('Error fetching student details:', e);
        }
      }

      const doc = new jsPDF();
      
      // Company Header
      doc.setFillColor(42, 157, 143);
      doc.rect(0, 0, 210, 25, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('CLASS MANAGEMENT SYSTEM', 105, 12, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('123 Education Street, Colombo, Sri Lanka | Phone: +94 11 234 5678', 105, 20, { align: 'center' });
      
      // Receipt Header
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT RECEIPT', 105, 35, { align: 'center' });
      
      // Receipt Details
      const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const receiptData = [
        ['Receipt No:', receiptNumber],
        ['Transaction ID:', payment.invoiceId],
        ['Date:', payment.date],
        ['Status:', payment.status],
        ['Method:', payment.method],
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
      
      // Student Details
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Student Information', 20, doc.lastAutoTable.finalY + 8);
      
      const studentData = [
        ['Name:', studentDetails ? `${studentDetails.first_name || ''} ${studentDetails.last_name || ''}`.trim() : (userData?.name || userData?.firstName + ' ' + userData?.lastName || 'N/A')],
        ['Email:', studentDetails?.email || userData?.email || 'N/A'],
        ['Mobile:', studentDetails?.mobile_number || userData?.mobile || 'N/A'],
        ['Address:', studentDetails?.address || userData?.address || 'N/A'],
        ['City:', studentDetails?.district || userData?.district || 'N/A'],
      ];
      
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [],
        body: studentData,
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
      
      // Class Information
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Class Information', 20, doc.lastAutoTable.finalY + 8);
      
      const classData = [
        ['Class Name:', payment.className],
        ['Amount:', payment.amount],
        ['Payment Status:', payment.status],
      ];
      
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [],
        body: classData,
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
      
      // Footer
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Thank you for choosing Class Management System!', 105, doc.lastAutoTable.finalY + 15, { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, doc.lastAutoTable.finalY + 20, { align: 'center' });
      
      // Save the PDF
      doc.save(`receipt_${payment.invoiceId}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate receipt PDF. Please try again.');
    } finally {
      setDownloadingReceipt(null);
    }
  };

  const renderActions = (payment) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => generateReceiptPDF(payment)}
        disabled={downloadingReceipt === payment.invoiceId}
        className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Download Receipt"
      >
        <FaDownload className="w-3 h-3" />
        {downloadingReceipt === payment.invoiceId ? 'Generating...' : 'Download'}
      </button>
    </div>
  );

  return (
    <DashboardLayout
      userRole="Student"
      sidebarItems={studentSidebarSections}
      onLogout={onLogout}
    >
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">My Payments</h1>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh Data'}
          </button>
        </div>
        
        {loading ? (
          <div className="text-gray-500 text-center py-12">Loading payments from database...</div>
        ) : error ? (
          <div className="text-red-500 text-center py-12">Error: {error}</div>
        ) : payments.length === 0 ? (
          <div className="text-gray-500 text-center py-12">No payment history found in database.</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-0 sm:p-4 my-6">
            <BasicTable columns={columns} data={payments} actions={renderActions} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyPayments; 
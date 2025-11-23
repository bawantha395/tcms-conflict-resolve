import React, { useState, useEffect } from 'react';
import { getStudentPurchasedStudyPacks } from '../../../../api/payments';
import { getUserData } from '../../../../api/apiUtils';
import BasicTable from '../../../../components/BasicTable';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import studentSidebarSections from '../StudentDashboardSidebar';
import { FaFileInvoice, FaDownload, FaSync, FaCheckCircle, FaClock, FaTimesCircle, FaBook, FaDollarSign, FaShoppingCart } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MyStudyPackPayments = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'purchase_date', direction: 'desc' });
  const [downloadingReceipt, setDownloadingReceipt] = useState(null);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    setLoading(true);
    setError(null);
    try {
      const userData = getUserData();
      if (!userData || !userData.userid) {
        setError('User not logged in');
        setLoading(false);
        return;
      }

      console.log('Fetching purchases for student:', userData.userid);
      const response = await getStudentPurchasedStudyPacks(userData.userid);
      
      console.log('Response:', response);
      
      if (response.success && Array.isArray(response.data)) {
        // Fetch study pack details for each purchase
        const purchasesWithDetails = await Promise.all(
          response.data.map(async (purchase) => {
            try {
              // Fetch study pack details from teacher backend
              const packResponse = await fetch(
                `http://localhost:8088/api/study-packs/${purchase.study_pack_id}`
              );
              
              if (packResponse.ok) {
                const packData = await packResponse.json();
                
                return {
                  ...purchase,
                  pack_name: packData.data?.name || purchase.class_name || 'Unknown Pack',
                  pack_title: packData.data?.title || packData.data?.name || purchase.class_name || 'Unknown Title',
                  // pack_subject: packData.data?.subject || 'N/A',
                  pack_price: purchase.amount || packData.data?.price || 0,
                  // teacher_name: packData.data?.teacher_name || 'Unknown Teacher',
                  // description: packData.data?.description || purchase.notes || ''
                };
              } else {
                // Use data from student_purchases table if pack details not available
                return {
                  ...purchase,
                  pack_name: purchase.class_name || `Study Pack #${purchase.study_pack_id}`,
                  pack_title: purchase.class_name || `Study Pack #${purchase.study_pack_id}`,
                  // pack_subject: 'N/A',
                  pack_price: purchase.amount || 0,
                  // teacher_name: 'Unknown Teacher',
                  // description: purchase.notes || ''
                };
              }
            } catch (err) {
              console.error('Error fetching pack details:', err);
              // Use data from student_purchases table as fallback
              return {
                ...purchase,
                pack_name: purchase.class_name || `Study Pack #${purchase.study_pack_id}`,
                pack_title: purchase.class_name || `Study Pack #${purchase.study_pack_id}`,
                // pack_subject: 'N/A',
                pack_price: purchase.amount || 0,
                // teacher_name: 'Unknown Teacher',
                // description: purchase.notes || ''
              };
            }
          })
        );
        
        setPurchases(purchasesWithDetails);
      } else {
        setError(response.message || 'Failed to load purchases');
        setPurchases([]);
      }
    } catch (err) {
      console.error('Error fetching purchases:', err);
      setError('An error occurred while loading your purchases');
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FaCheckCircle className="text-green-600" />;
      case 'pending':
        return <FaClock className="text-yellow-600" />;
      case 'failed':
        return <FaTimesCircle className="text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: 'bg-green-100 text-green-800 border-green-300',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      failed: 'bg-red-100 text-red-800 border-red-300'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-2 border ${badges[status] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  

  const handleDownloadReceipt = async (purchase) => {
    setDownloadingReceipt(purchase.transaction_id);
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
      doc.text('STUDY PACK PAYMENT RECEIPT', 105, 35, { align: 'center' });
      
      // Receipt Details
      const receiptNumber = `RCP-SP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const purchaseDate = new Date(purchase.purchase_date);
      const receiptData = [
        ['Receipt No:', receiptNumber],
        ['Transaction ID:', purchase.transaction_id],
        ['Date:', purchaseDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })],
        ['Time:', purchaseDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })],
        ['Status:', purchase.payment_status.charAt(0).toUpperCase() + purchase.payment_status.slice(1)],
        ['Payment Method:', 'Online Payment'],
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
        ['Student ID:', userData?.userid || purchase.student_id || 'N/A'],
        ['Email:', studentDetails?.email || userData?.email || 'N/A'],
        ['Mobile:', studentDetails?.mobile_number || userData?.mobile || 'N/A'],
        ['Address:', studentDetails?.address || userData?.address || 'N/A'],
        ['District:', studentDetails?.district || userData?.district || 'N/A'],
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
      
      // Study Pack Information
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Study Pack Details', 20, doc.lastAutoTable.finalY + 8);
      
      const packData = [
        ['Pack Name:', purchase.pack_title || purchase.pack_name || 'N/A'],
        // ['Subject:', purchase.pack_subject || 'N/A'],
        // ['Teacher:', purchase.teacher_name || 'Unknown Teacher'],
        ['Pack ID:', `#${purchase.study_pack_id}`],
        ['Amount:', `LKR ${parseFloat(purchase.pack_price || 0).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`],
        ['Payment Status:', purchase.payment_status.charAt(0).toUpperCase() + purchase.payment_status.slice(1)],
      ];
      
      if (purchase.description) {
        packData.push(['Description:', purchase.description]);
      }
      
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [],
        body: packData,
        theme: 'plain',
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 35, fillColor: [245, 245, 245] },
          1: { cellWidth: 140 }
        }
      });
      
      // Payment Summary Box
      doc.setFillColor(240, 240, 240);
      doc.rect(20, doc.lastAutoTable.finalY + 10, 170, 20, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Total Amount Paid:', 25, doc.lastAutoTable.finalY + 20);
      
      doc.setFontSize(14);
      doc.setTextColor(42, 157, 143);
      doc.text(
        `LKR ${parseFloat(purchase.pack_price || 0).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`,
        185,
        doc.lastAutoTable.finalY + 20,
        { align: 'right' }
      );
      
      // Footer
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Thank you for choosing Class Management System!', 105, doc.lastAutoTable.finalY + 40, { align: 'center' });
      doc.text('This is a computer-generated receipt and does not require a signature.', 105, doc.lastAutoTable.finalY + 45, { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, doc.lastAutoTable.finalY + 50, { align: 'center' });
      
      // Add border around entire receipt
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(10, 30, 190, doc.lastAutoTable.finalY + 25);
      
      // Save the PDF
      doc.save(`study_pack_receipt_${purchase.transaction_id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate receipt PDF. Please try again.');
    } finally {
      setDownloadingReceipt(null);
    }
  };

  const columns = [
    {
      key: 'purchase_date',
      label: 'Purchase Date',
      sortable: true,
      render: (row) => {
        const date = new Date(row.purchase_date);
        return (
          <div className="text-sm">
            <div className="font-semibold text-gray-900">
              {date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </div>
            <div className="text-xs text-gray-500">
              {date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        );
      }
    },
    {
      key: 'pack_name',
      label: 'Study Pack',
      sortable: true,
      render: (row) => (
        <div className="max-w-xs">
          <div className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-1">
            <FaBook className="text-cyan-600" />
            {row.pack_title || row.pack_name}
          </div>
          {row.pack_name && row.pack_title !== row.pack_name && (
            <div className="text-xs text-gray-600 font-medium mt-0.5">
              {row.pack_name}
            </div>
          )}
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <span className="bg-gray-100 px-2 py-0.5 rounded">{row.pack_subject}</span>
          </div>
          {row.description && (
            <div className="text-xs text-gray-400 mt-2 line-clamp-2">
              {row.description}
            </div>
          )}
        </div>
      )
    },
    
    {
      key: 'pack_price',
      label: 'Amount',
      sortable: true,
      render: (row) => (
        <div className="text-sm">
          <span className="font-bold text-gray-900">
            LKR {parseFloat(row.pack_price || 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </span>
        </div>
      )
    },
    {
      key: 'payment_status',
      label: 'Status',
      sortable: true,
      render: (row) => getStatusBadge(row.payment_status)
    },
    {
      key: 'transaction_id',
      label: 'Transaction ID',
      sortable: true,
      render: (row) => (
        <div className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
          {row.transaction_id || 'N/A'}
        </div>
      )
    }
  ];

  const actions = (row) => (
    <div className="flex gap-2">
      {row.payment_status === 'completed' && row.transaction_id && (
        <>
          
          <button
            onClick={() => handleDownloadReceipt(row)}
            disabled={downloadingReceipt === row.transaction_id}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download Receipt"
          >
            <FaDownload />
            {downloadingReceipt === row.transaction_id ? 'Generating...' : 'Receipt'}
          </button>
        </>
      )}
      {row.payment_status === 'pending' && (
        <span className="text-xs text-gray-500 italic">Processing...</span>
      )}
      {row.payment_status === 'failed' && (
        <span className="text-xs text-red-600 italic">Payment Failed</span>
      )}
    </div>
  );

  // Sort data
  const sortedData = [...purchases].sort((a, b) => {
    if (sortConfig.key) {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle date sorting
      if (sortConfig.key === 'purchase_date') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      // Handle numeric sorting
      if (sortConfig.key === 'pack_price') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      // Handle string sorting
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
    }
    return 0;
  });

  // Calculate statistics
  const stats = {
    total: purchases.length,
    completed: purchases.filter(p => p.payment_status === 'completed').length,
    pending: purchases.filter(p => p.payment_status === 'pending').length,
    failed: purchases.filter(p => p.payment_status === 'failed').length,
    totalSpent: purchases
      .filter(p => p.payment_status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.pack_price || 0), 0)
  };

  return (
    <DashboardLayout sidebarSections={studentSidebarSections}>
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FaShoppingCart className="text-cyan-600" />
              My Study Pack Payments
            </h1>
            <p className="text-gray-600 mt-2">View your study pack purchase history and manage receipts</p>
          </div>
          <button
            onClick={fetchPurchases}
            disabled={loading}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaSync className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Purchases</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="bg-cyan-100 p-4 rounded-full">
                <FaShoppingCart className="text-cyan-600 text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Completed</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.completed}</p>
              </div>
              <div className="bg-green-100 p-4 rounded-full">
                <FaCheckCircle className="text-green-600 text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
              </div>
              <div className="bg-yellow-100 p-4 rounded-full">
                <FaClock className="text-yellow-600 text-2xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Spent</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  LKR {stats.totalSpent.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div className="bg-blue-100 p-4 rounded-full">
                <FaDollarSign className="text-blue-600 text-2xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 shadow-sm">
            <div className="flex items-center gap-2">
              <FaTimesCircle className="text-red-500" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Payments Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <BasicTable
            columns={columns}
            data={sortedData}
            actions={actions}
            onSort={handleSort}
            sortConfig={sortConfig}
            loading={loading}
            emptyMessage={
              <div className="text-center py-12">
                <FaBook className="text-gray-400 text-5xl mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium">No study pack purchases found</p>
                <p className="text-gray-500 text-sm mt-2">Start learning by purchasing study packs!</p>
              </div>
            }
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MyStudyPackPayments;

import React, { useState, useEffect } from 'react';
import { getTeacherStudyPackPurchases } from '../../../../api/payments';
import { getUserData } from '../../../../api/apiUtils';
import BasicTable from '../../../../components/BasicTable';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import teacherSidebarSections from '../TeacherDashboardSidebar';
import { FaFileInvoice, FaDownload, FaSync, FaCheckCircle, FaClock, FaTimesCircle, FaBook, FaDollarSign, FaShoppingCart } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TeacherStudyPackPayments = () => {
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
      const user = getUserData();
      const teacherId = user?.teacherId || user?.userid;
      if (!teacherId) {
        setError('Teacher not logged in');
        setLoading(false);
        return;
      }

      const res = await getTeacherStudyPackPurchases(teacherId);
      if (res.success && Array.isArray(res.data)) {
        // enrich purchases similar to student view (use fallback values if pack meta not available)
        const purchasesWithDetails = await Promise.all(
          res.data.map(async (purchase) => {
            try {
              // attempt to fetch study pack details from teacher backend for richer titles (best-effort)
              const teacherApiBase = process.env.REACT_APP_TEACHER_API_BASE_URL || 'http://localhost:8088';
              const packResponse = await fetch(`${teacherApiBase}/api/study-packs/${purchase.study_pack_id}`);
              if (packResponse.ok) {
                const packData = await packResponse.json();
                return {
                  ...purchase,
                  pack_name: packData.data?.name || purchase.class_name || `Study Pack #${purchase.study_pack_id}`,
                  pack_title: packData.data?.title || packData.data?.name || purchase.class_name || `Study Pack #${purchase.study_pack_id}`,
                  pack_price: purchase.amount || packData.data?.price || 0
                };
              }
            } catch (e) {
              // ignore - use fallback
            }

            return {
              ...purchase,
              pack_name: purchase.class_name || `Study Pack #${purchase.study_pack_id}`,
              pack_title: purchase.class_name || `Study Pack #${purchase.study_pack_id}`,
              pack_price: purchase.amount || 0
            };
          })
        );

        setPurchases(purchasesWithDetails);
      } else {
        setError(res.message || 'Failed to load purchases');
        setPurchases([]);
      }
    } catch (e) {
      console.error(e);
      setError('Error loading purchases');
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
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
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'N/A'}
      </span>
    );
  };

  const handleDownloadReceipt = async (purchase) => {
    setDownloadingReceipt(purchase.transaction_id || purchase.transactionId || purchase.id);
    try {
      // Attempt to fetch student details for better receipt info
      const userData = getUserData();
      let studentDetails = null;
      try {
        if (purchase.student_id) {
          const studentResp = await fetch(`http://student-backend/routes.php/get_with_id/${purchase.student_id}`);
          if (studentResp.ok) studentDetails = await studentResp.json();
        }
      } catch (e) {
        // ignore
      }

      const doc = new jsPDF();

      // Header
      doc.setFillColor(42, 157, 143);
      doc.rect(0, 0, 210, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('CLASS MANAGEMENT SYSTEM', 105, 12, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('STUDY PACK PURCHASE RECEIPT', 105, 35, { align: 'center' });

      const receiptNumber = `INV-SP-${Date.now()}`;
      const purchaseDate = new Date(purchase.purchase_date || purchase.created_at || Date.now());
      const receiptData = [
        ['Receipt No:', receiptNumber],
        ['Transaction ID:', purchase.transaction_id || 'N/A'],
        ['Date:', purchaseDate.toLocaleDateString()],
        ['Time:', purchaseDate.toLocaleTimeString()],
        ['Status:', (purchase.payment_status || '').charAt(0).toUpperCase() + (purchase.payment_status || '').slice(1)],
      ];

      autoTable(doc, {
        startY: 42,
        head: [],
        body: receiptData,
        theme: 'plain',
        styles: { fontSize: 9 }
      });

      // Student Info
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Student Information', 20, doc.lastAutoTable.finalY + 8);
      const studentData = [
        ['Name:', purchase.person_name || (studentDetails && (studentDetails.first_name + ' ' + (studentDetails.last_name || ''))) || userData?.name || 'N/A'],
        ['Student ID:', purchase.student_id || purchase.user_id || 'N/A'],
        ['Email:', (studentDetails && studentDetails.email) || 'N/A']
      ];

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [],
        body: studentData,
        theme: 'plain',
        styles: { fontSize: 9 }
      });

      // Pack Info
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Study Pack Details', 20, doc.lastAutoTable.finalY + 8);
      const packData = [
        ['Pack Name:', purchase.pack_title || purchase.pack_name || purchase.class_name || `#${purchase.study_pack_id}`],
        ['Pack ID:', purchase.study_pack_id || 'N/A'],
        ['Amount:', `LKR ${parseFloat(purchase.pack_price || purchase.amount || 0).toLocaleString()}`],
      ];

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [],
        body: packData,
        theme: 'plain',
        styles: { fontSize: 9 }
      });

      doc.setFontSize(9);
      doc.text('This is a computer generated receipt.', 105, doc.lastAutoTable.finalY + 30, { align: 'center' });

      doc.save(`teacher_study_pack_receipt_${purchase.transaction_id || purchase.id}.pdf`);
    } catch (err) {
      console.error('Error generating receipt', err);
      alert('Failed to generate receipt.');
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
        const date = new Date(row.purchase_date || row.created_at || Date.now());
        return (
          <div className="text-sm">
            <div className="font-semibold text-gray-900">{date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
            <div className="text-xs text-gray-500">{date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        );
      }
    },
    {
      key: 'person_name',
      label: 'Student',
      sortable: true,
      render: (row) => (
        <div className="max-w-xs">
          <div className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-1">
            <FaBook className="text-cyan-600" />
            <div className="flex items-baseline gap-2">
              <span>{row.person_name || 'N/A'}</span>
              { (row.user_id || row.student_id) && (
                <span className="font-mono text-xs text-gray-500">{row.user_id || row.student_id}</span>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'pack',
      label: 'Study Pack',
      sortable: true,
      render: (row) => (
        <div className="max-w-xs">
          <div className="font-bold text-gray-900 text-sm">{row.pack_title || row.class_name || `#${row.study_pack_id}`}</div>
          {row.pack_name && row.pack_title !== row.pack_name && <div className="text-xs text-gray-600 mt-0.5">{row.pack_name}</div>}
        </div>
      )
    },
    {
      key: 'pack_price',
      label: 'Amount',
      sortable: true,
      render: (row) => (
        <div className="text-sm font-bold">LKR {parseFloat(row.pack_price || row.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
      render: (row) => <div className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">{row.transaction_id || 'N/A'}</div>
    }
  ];

  const actions = (row) => (
    <div className="flex gap-2">
      {row.payment_status === 'completed' && row.transaction_id && (
        <button
          onClick={() => handleDownloadReceipt(row)}
          disabled={downloadingReceipt === row.transaction_id}
          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          title="Download Receipt"
        >
          <FaDownload />
          {downloadingReceipt === row.transaction_id ? 'Generating...' : 'Receipt'}
        </button>
      )}
      {row.payment_status === 'pending' && <span className="text-xs text-gray-500 italic">Processing...</span>}
      {row.payment_status === 'failed' && <span className="text-xs text-red-600 italic">Payment Failed</span>}
    </div>
  );

  // Sort data
  const sortedData = [...purchases].sort((a, b) => {
    if (sortConfig.key) {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'purchase_date') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortConfig.key === 'pack_price') {
        aVal = parseFloat(a.pack_price || a.amount || 0) || 0;
        bVal = parseFloat(b.pack_price || b.amount || 0) || 0;
      }

      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Stats
  const stats = {
    total: purchases.length,
    completed: purchases.filter(p => p.payment_status === 'completed').length,
    pending: purchases.filter(p => p.payment_status === 'pending').length,
    failed: purchases.filter(p => p.payment_status === 'failed').length,
    totalEarned: purchases.filter(p => p.payment_status === 'completed').reduce((s, p) => s + parseFloat(p.pack_price || p.amount || 0), 0)
  };

  return (
    <DashboardLayout sidebarSections={teacherSidebarSections}>
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FaShoppingCart className="text-cyan-600" />
              Study Pack Purchases
            </h1>
            <p className="text-gray-600 mt-2">Payments made by students for study packs you created</p>
          </div>
          <button onClick={fetchPurchases} disabled={loading} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            <FaSync className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Purchases</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="bg-cyan-100 p-4 rounded-full"><FaShoppingCart className="text-cyan-600 text-2xl" /></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Completed</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.completed}</p>
              </div>
              <div className="bg-green-100 p-4 rounded-full"><FaCheckCircle className="text-green-600 text-2xl" /></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
              </div>
              <div className="bg-yellow-100 p-4 rounded-full"><FaClock className="text-yellow-600 text-2xl" /></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Earned</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">LKR {stats.totalEarned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-blue-100 p-4 rounded-full"><FaDollarSign className="text-blue-600 text-2xl" /></div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 shadow-sm">
            <div className="flex items-center gap-2"><FaTimesCircle className="text-red-500" /><p className="font-medium">{error}</p></div>
          </div>
        )}

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
                <p className="text-gray-500 text-sm mt-2">Purchases will appear here when students buy your study packs.</p>
              </div>
            }
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherStudyPackPayments;

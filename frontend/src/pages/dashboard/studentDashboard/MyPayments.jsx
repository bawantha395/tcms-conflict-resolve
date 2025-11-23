import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import studentSidebarSections from './StudentDashboardSidebar';
import BasicTable from '../../../components/BasicTable';
import { getStudentPayments } from '../../../api/payments';
import { getUserData } from '../../../api/apiUtils';
import { FaFileInvoice, FaDownload, FaSync, FaCheckCircle, FaClock, FaTimesCircle, FaChalkboardTeacher, FaDollarSign } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MyPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [downloadingReceipt, setDownloadingReceipt] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const userData = getUserData();
      if (!userData || !userData.userid) {
        setError('User not logged in');
        setLoading(false);
        return;
      }
      const studentId = userData.userid;

      const response = await getStudentPayments(studentId);

      // Normalize and merge different backend shapes into a single UI-friendly format
      if (response && response.success && Array.isArray(response.data)) {
        const mapped = response.data.map((p) => {
          const paymentType = p.payment_type || p.paymentType || 'class_payment';
          const isAdmissionFee = paymentType === 'admission_fee';

          let displayClassName = '';
          if (isAdmissionFee) {
            const baseName = p.class_name || p.className || '';
            displayClassName = baseName ? `Admission Fee - ${baseName}` : 'Admission Fee';
          } else {
            // prefer class_name/className, append subject if present
            const base = p.class_name || p.className || '';
            displayClassName = base || (p.subject ? `${base} - ${p.subject}` : 'N/A');
          }

          const rawDate = p.date || p.purchase_date || p.created_at || null;
          const dateIso = rawDate ? new Date(rawDate).toISOString() : null;

          const amountNum = parseFloat(p.amount || p.paid_amount || p.fee || 0) || 0;
          const methodRaw = p.payment_method || p.method || 'online';
          const statusRaw = (p.status || p.payment_status || 'paid').toString();

          return {
            date: dateIso,
            userId: p.user_id || p.userId || p.student_id || studentId || '',
            className: displayClassName,
            amount: amountNum,
            method: methodRaw,
            status: statusRaw.toLowerCase(),
            transaction_id: p.transaction_id || p.invoiceId || p.id || '',
            raw: p
          };
        });

        setPayments(mapped);
      } else {
        setError((response && response.message) || 'Failed to load payments');
        setPayments([]);
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading your payments');
      setPayments([]);
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
    switch ((status || '').toLowerCase()) {
      case 'completed':
      case 'paid':
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
    const s = (status || '').toLowerCase();
    const badges = {
      completed: 'bg-green-100 text-green-800 border-green-300',
      paid: 'bg-green-100 text-green-800 border-green-300',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      failed: 'bg-red-100 text-red-800 border-red-300'
    };
    const label = (status || '').toString();
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-2 border ${badges[s] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
        {getStatusIcon(s)}
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </span>
    );
  };

  const generateReceiptPDF = async (payment) => {
    setDownloadingReceipt(payment.transaction_id);
    try {
      const userData = getUserData();
      let studentDetails = null;
      if (userData?.userid) {
        try {
          const studentResponse = await fetch(`http://localhost:8086/routes.php/get_with_id/${userData.userid}`);
          const studentResult = await studentResponse.json();
          if (studentResult && studentResult.user_id) studentDetails = studentResult;
        } catch (e) {
          console.error('Error fetching student details:', e);
        }
      }

      const doc = new jsPDF();
      doc.setFillColor(42, 157, 143);
      doc.rect(0, 0, 210, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('CLASS MANAGEMENT SYSTEM', 105, 12, { align: 'center' });
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('PAYMENT RECEIPT', 105, 35, { align: 'center' });

      const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const paymentDate = payment.date ? new Date(payment.date) : new Date();
      const receiptData = [
        ['Receipt No:', receiptNumber],
        ['Transaction ID:', payment.transaction_id],
        ['Date:', paymentDate.toLocaleDateString()],
        ['Status:', (payment.status || '').toString()],
        ['Method:', (payment.method || 'Online')]
      ];

      autoTable(doc, { startY: 42, head: [], body: receiptData, theme: 'plain', styles: { fontSize: 8 } });

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Student Information', 20, doc.lastAutoTable.finalY + 8);

      const studentData = [
        ['Name:', studentDetails ? `${studentDetails.first_name || ''} ${studentDetails.last_name || ''}`.trim() : (userData?.name || 'N/A')],
        ['Email:', studentDetails?.email || userData?.email || 'N/A'],
        ['Mobile:', studentDetails?.mobile_number || userData?.mobile || 'N/A']
      ];

      autoTable(doc, { startY: doc.lastAutoTable.finalY + 10, head: [], body: studentData, theme: 'plain', styles: { fontSize: 8 } });

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Details', 20, doc.lastAutoTable.finalY + 8);

      const classData = [
        ['Class / Item:', payment.className || 'N/A'],
        ['Amount:', `LKR ${payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Status:', payment.status]
      ];

      autoTable(doc, { startY: doc.lastAutoTable.finalY + 10, head: [], body: classData, theme: 'plain', styles: { fontSize: 8 } });

      doc.text('Thank you for using Class Management System', 105, doc.lastAutoTable.finalY + 25, { align: 'center' });
      doc.save(`receipt_${payment.transaction_id}.pdf`);
    } catch (err) {
      console.error('Error generating PDF', err);
      alert('Failed to generate receipt');
    } finally {
      setDownloadingReceipt(null);
    }
  };

  const columns = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (row) => {
        const d = row.date ? new Date(row.date) : null;
        return d ? (
          <div>
            <div className="font-semibold">{d.toLocaleDateString()}</div>
            <div className="text-xs text-gray-500">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        ) : 'N/A';
      }
    },
    {
      key: 'className',
      label: 'Class / Item',
      sortable: true,
      render: (row) => (
        <div className="max-w-xs">
          <div className="font-bold text-sm flex items-center gap-2">
            <FaChalkboardTeacher className="text-cyan-600" />
            {row.className}
          </div>
        </div>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (row) => (
        <div className="font-semibold">LKR {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => getStatusBadge(row.status)
    },
    {
      key: 'transaction_id',
      label: 'Transaction ID',
      sortable: true,
      render: (row) => <div className="font-mono text-xs bg-gray-50 px-2 py-1 rounded">{row.transaction_id}</div>
    }
  ];

  const actions = (row) => (
    <div className="flex gap-2">
      {row.status && (row.status.toLowerCase() === 'completed' || row.status.toLowerCase() === 'paid') && (
        <button
          onClick={() => generateReceiptPDF(row)}
          disabled={downloadingReceipt === row.transaction_id}
          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaDownload />
          {downloadingReceipt === row.transaction_id ? 'Generating...' : 'Receipt'}
        </button>
      )}
      {row.status && row.status.toLowerCase() === 'pending' && (
        <span className="text-xs text-gray-500 italic">Processing...</span>
      )}
    </div>
  );

  // Sort data
  const sortedData = [...payments].sort((a, b) => {
    if (sortConfig.key) {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === 'date') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const stats = {
    total: payments.length,
    completed: payments.filter(p => (p.status || '').toLowerCase() === 'completed' || (p.status || '').toLowerCase() === 'paid').length,
    pending: payments.filter(p => (p.status || '').toLowerCase() === 'pending').length,
    failed: payments.filter(p => (p.status || '').toLowerCase() === 'failed').length,
    totalSpent: payments.filter(p => (p.status || '').toLowerCase() === 'completed' || (p.status || '').toLowerCase() === 'paid').reduce((s, p) => s + (p.amount || 0), 0)
  };

  return (
    <DashboardLayout sidebarSections={studentSidebarSections}>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FaFileInvoice className="text-cyan-600" />
              My Payments
            </h1>
            <p className="text-gray-600 mt-2">View your payment history and download receipts</p>
          </div>
          <button
            onClick={fetchPayments}
            disabled={loading}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaSync className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Payments</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="bg-cyan-100 p-4 rounded-full">
                <FaFileInvoice className="text-cyan-600 text-2xl" />
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
                <p className="text-2xl font-bold text-blue-600 mt-1">LKR {stats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-blue-100 p-4 rounded-full">
                <FaDollarSign className="text-blue-600 text-2xl" />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 shadow-sm">
            <div className="flex items-center gap-2">
              <FaTimesCircle className="text-red-500" />
              <p className="font-medium">{error}</p>
            </div>
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
                <FaFileInvoice className="text-gray-400 text-5xl mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium">No payments found</p>
                <p className="text-gray-500 text-sm mt-2">Make a payment to see history here.</p>
              </div>
            }
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MyPayments;
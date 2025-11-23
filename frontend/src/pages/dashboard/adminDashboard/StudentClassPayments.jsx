import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import adminSidebarSections from './AdminDashboardSidebar';
import BasicTable from '../../../components/BasicTable';
import CustomButton from '../../../components/CustomButton';


const paymentStatusColor = {
  Paid: 'text-green-700 font-bold',
  Pending: 'text-yellow-700 font-bold',
  Failed: 'text-red-700 font-bold',
};

const StudentClassPayments = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Get payments from localStorage
  const payments = (() => {
    try {
      const stored = localStorage.getItem('payments');
      if (!stored) return [];
      const allPayments = JSON.parse(stored);
      // Filter by classId
      return allPayments.filter(p => String(p.classId) === String(classId));
    } catch {
      return [];
    }
  })();

  // Prefer className from route state, fallback to localStorage
  let className = location.state && location.state.className;
  if (!className) {
    try {
      const stored = localStorage.getItem('classes');
      if (stored) {
        const classes = JSON.parse(stored);
        const found = classes.find(c => c.id === classId);
        if (found && found.className) className = found.className;
      }
    } catch {}
  }

  // Payment summary
  const paidCount = payments.filter(p => p.status === 'Paid').length;
  const pendingCount = payments.filter(p => p.status === 'Pending').length;
  const failedCount = payments.filter(p => p.status === 'Failed').length;
  const total = payments.length;
  const paidPercent = total ? ((paidCount / total) * 100).toFixed(1) : 0;
  const pendingPercent = total ? ((pendingCount / total) * 100).toFixed(1) : 0;
  const failedPercent = total ? ((failedCount / total) * 100).toFixed(1) : 0;
  const totalReceived = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + (p.amount || 0), 0);

  // Payment status filter
  const [statusFilter, setStatusFilter] = useState('');
  const filteredPayments = statusFilter ? payments.filter(p => p.status === statusFilter) : payments;

  return (
    <DashboardLayout userRole="Administrator" sidebarItems={adminSidebarSections}>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left summary/details panel */}
        <div className="md:w-1/4 w-full bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold mb-2">{className}</h2>
          <div className="mb-2 text-gray-700">Total Received: <span className="font-semibold text-green-700">LKR {totalReceived.toLocaleString()} </span></div>
          <div className="mb-4">
            <div className="font-semibold mb-1">Summary</div>
            <div className="text-sm mb-1">Paid: <span className="text-green-700 font-bold">{paidCount}</span> ({paidPercent}%)</div>
            <div className="text-sm mb-1">Pending: <span className="text-yellow-700 font-bold">{pendingCount}</span> ({pendingPercent}%)</div>
            <div className="text-sm mb-1">Failed: <span className="text-red-700 font-bold">{failedCount}</span> ({failedPercent}%)</div>
            <div className="text-sm mt-2">Total: <span className="font-bold">{total}</span></div>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="font-semibold">Filter by Status</div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border rounded px-2 py-1 mt-1 w-full"
            >
              <option value="">All</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
          <div className="mt-6">
            <CustomButton onClick={() => navigate('/admin/students-payments')} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-700 w-full">Back</CustomButton>
          </div>
        </div>
        {/* Right payments table */}
        <div className="md:w-3/4 w-full bg-white rounded-lg shadow p-4">
          <h1 className="text-2xl font-bold mb-4">Payments</h1>
          <BasicTable
            columns={[
              { key: 'invoiceId', label: 'Invoice ID' },
              { key: 'student', label: 'Student' },
              { key: 'method', label: 'Payment Method' },
              { key: 'category', label: 'Category' },
              { key: 'date', label: 'Date' },
              { key: 'time', label: 'Time' },
              { key: 'status', label: 'Status', render: row => (
                  <span className={paymentStatusColor[row.status] || ''}>{row.status}</span>
                ) },
              { key: 'amount', label: 'Amount (LKR)', render: row => (
                  <span className="font-semibold text-green-700">{(row.amount ? row.amount : 0).toLocaleString()}</span>
                ) },
            ]}
            data={filteredPayments.map(p => ({
              invoiceId: p.invoiceId || p.id || '',
              student: p.student || p.studentName || '',
              method: p.method || 'Online',
              category: p.category || '',
              date: p.date || '',
              time: p.time || '',
              status: p.status || 'Paid',
              amount: p.amount || p.total || 0,
            }))}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentClassPayments;

import React, { useState } from 'react';
import BasicTable from '../../../components/BasicTable';
import CustomButton from '../../../components/CustomButton';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import dayjs from 'dayjs';
// import { initialStudentPayments } from './studentPaymentsDummyData'; // You can create this file similar to financialDummyData
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];



const StudentPaymentReport = () => {
  const [records] = useState(() => {
    const stored = localStorage.getItem('payments');
    return stored ? JSON.parse(stored) : [];
  });
  const [reportType, setReportType] = useState('daily'); // 'daily' or 'monthly'
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  // Filter records by selected day or month
  const filteredRecords = records.filter(rec => {
    if (reportType === 'daily') {
      if (!selectedDate) return true; // Show all if no date selected
      return rec.date === selectedDate;
    } else {
      if (!selectedMonth) return true; // Show all if no month selected
      return rec.month === selectedMonth;
    }
  });

  // Paid, Pending, Failed
  const paidRecords = filteredRecords.filter(r => r.status === 'Paid');
  const pendingRecords = filteredRecords.filter(r => r.status === 'Pending');
  const failedRecords = filteredRecords.filter(r => r.status === 'Failed');
  const totalPaid = paidRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalPending = pendingRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalFailed = failedRecords.reduce((sum, r) => sum + r.amount, 0);

  // Pie chart data
  const pieData = [
    { name: 'Paid', value: totalPaid, color: '#00C49F' },
    { name: 'Pending', value: totalPending, color: '#FF8042' },
    { name: 'Failed', value: totalFailed, color: '#FF0000' }
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold">{`${payload[0].name}: Rs. ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Student Payment Report', 14, 18);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    let summaryY = 28;
    doc.text(`Report Type: ${reportType === 'daily' ? 'Daily' : 'Monthly'}`, 14, summaryY);
    if (reportType === 'daily') {
      doc.text(`Date: ${selectedDate}`, 80, summaryY);
    } else {
      doc.text(`Month: ${selectedMonth}`, 80, summaryY);
    }
    summaryY += 8;
    doc.text(`Total Paid: Rs. ${totalPaid}`, 14, summaryY);
    doc.text(`Total Pending: Rs. ${totalPending}`, 80, summaryY);
    // Table headers and rows
    const headers = [
      'Invoice ID', 'Date', 'Student', 'Class', 'Course Type', 'Amount', 'Status', 'Method'
    ];
    const rows = filteredRecords.map(row => [
      row.invoiceId || row.id || '',
      row.date || '',
      row.student || row.studentName || '',
      row.className || '',
      row.courseType || '',
      row.amount || 0,
      row.status || 'Paid',
      row.method || 'Online'
    ]);
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: summaryY + 10,
      styles: {
        fontSize: 9,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 10, right: 10 }
    });
    doc.save('student_payment_report.pdf');
  };

  // Export Excel (CSV)
  const handleExportExcel = () => {
    const headers = [
      'Invoice ID', 'Date', 'Student', 'Class', 'Course Type', 'Amount', 'Status', 'Method'
    ];
    const rows = filteredRecords.map(row => [
      row.invoiceId || row.id || '',
      row.date || '',
      row.student || row.studentName || '',
      row.className || '',
      row.courseType || '',
      row.amount || 0,
      row.status || 'Paid',
      row.method || 'Online'
    ]);
    let csvContent = '';
    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(val => '"' + String(val).replace(/"/g, '""') + '"').join(',') + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'student_payment_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">Student Payment Report</h1>
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <label className="font-semibold">Report Type:</label>
        <select value={reportType} onChange={e => setReportType(e.target.value)} className="border rounded px-2 py-1">
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
        </select>
        {reportType === 'daily' ? (
        <>
            <label className="font-semibold ml-4">Date:</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="border rounded px-2 py-1" />
        </>
        ) : (
          <>
            <label className="font-semibold ml-4">Month:</label>
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="border rounded px-2 py-1" />
          </>
        )}
        <CustomButton className="ml-auto" onClick={handleExportPDF}>Export PDF</CustomButton>
        <CustomButton onClick={handleExportExcel}>Export Excel</CustomButton>
      </div>
      <div className="flex flex-wrap gap-6 mb-6">
        <div className="bg-green-100 text-green-800 rounded-lg px-6 py-4 font-bold text-lg">
          Total Paid: Rs. {totalPaid}
        </div>
        <div className="bg-yellow-100 text-yellow-800 rounded-lg px-6 py-4 font-bold text-lg">
          Total Pending: Rs. {totalPending}
        </div>
        <div className="bg-red-100 text-red-800 rounded-lg px-6 py-4 font-bold text-lg">
          Total Failed: Rs. {totalFailed}
        </div>
      </div>
      <div className="w-full max-w-lg mb-8">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <BasicTable
        columns={[
          { key: 'invoiceId', label: 'Invoice ID' },
          { key: 'date', label: 'Date' },
          { key: 'student', label: 'Student' },
          { key: 'className', label: 'Class' },
          { key: 'courseType', label: 'Course Type' },
          { key: 'amount', label: 'Amount' },
          { key: 'status', label: 'Status' },
          { key: 'method', label: 'Method' },
        ]}
        data={filteredRecords.map(row => ({
          ...row,
          invoiceId: row.invoiceId || row.id || '',
          student: row.student || row.studentName || '',
          courseType: row.courseType || '',
          amount: row.amount || 0,
          status: row.status || 'Paid',
          method: row.method || 'Online',
        }))}
      />
    </div>
  );
};

export default StudentPaymentReport;

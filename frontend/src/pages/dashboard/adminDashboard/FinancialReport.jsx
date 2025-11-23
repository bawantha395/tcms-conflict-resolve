import React, { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import adminSidebarSections from './AdminDashboardSidebar';
import BasicTable from '../../../components/BasicTable';
import CustomButton from '../../../components/CustomButton';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import dayjs from 'dayjs';
import { initialRecords } from './financialDummyData';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const FinancialReport = () => {
  const [records] = useState(() => {
    const stored = localStorage.getItem('financialRecords');
    return stored ? JSON.parse(stored) : initialRecords;
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
      return rec.date.startsWith(selectedMonth);
    }
  });

  // Only include Paid and Refunded
  const paidOrRefunded = filteredRecords.filter(r => r.status === 'Paid' || r.status === 'Refunded');
  const totalIncome = paidOrRefunded.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
  const totalOutcome = paidOrRefunded.filter(r => r.type === 'outcome').reduce((sum, r) => sum + r.amount, 0);
  const profit = totalIncome - totalOutcome;

  // Pie chart data
  const pieData = [
    { name: 'Income', value: totalIncome, color: '#00C49F' },
    { name: 'Outcome', value: totalOutcome, color: '#FF8042' },
    { name: 'Profit', value: profit, color: profit >= 0 ? '#0088FE' : '#FF0000' }
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

    // Title
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Financial Report', 14, 18);

    // Summary section
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
    doc.text(`Total Income: Rs. ${totalIncome}`, 14, summaryY);
    doc.text(`Total Outcome: Rs. ${totalOutcome}`, 80, summaryY);
    doc.text(`Profit: Rs. ${profit}`, 150, summaryY);

    // Table headers and rows (from filteredRecords)
    const headers = [
      'Transaction ID', 'Date', 'Type', 'Category', 'Person', 'Role', 'Class', 'Amount', 'Status'
    ];
    const rows = filteredRecords.map(row => [
      row.id,
      row.date,
      row.type,
      row.category,
      row.person,
      row.role,
      row.className,
      row.amount,
      row.status
    ]);

    // Add table below summary
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

    doc.save('financial_report.pdf');
  };


  // Export Excel (CSV)
  const handleExportExcel = () => {
    const headers = [
      'Transaction ID', 'Date', 'Type', 'Category', 'Person', 'Role', 'Class', 'Amount', 'Status'
    ];
    const rows = filteredRecords.map(row => [
      row.id, row.date, row.type, row.category, row.person, row.role, row.className, row.amount, row.status
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
    link.setAttribute('download', 'financial_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    // <DashboardLayout userRole="Administrator" sidebarItems={adminSidebarSections}>
      <div className="p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Full Financial Report</h1>
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
            Total Income: Rs. {totalIncome}
          </div>
          <div className="bg-red-100 text-red-800 rounded-lg px-6 py-4 font-bold text-lg">
            Total Outcome: Rs. {totalOutcome}
          </div>
          <div className={`rounded-lg px-6 py-4 font-bold text-lg ${profit >= 0 ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
            Profit: Rs. {profit}
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
            { key: 'id', label: 'Transaction ID' },
            { key: 'date', label: 'Date' },
            { key: 'type', label: 'Type' },
            { key: 'category', label: 'Category' },
            { key: 'person', label: 'Person' },
            { key: 'role', label: 'Role' },
            { key: 'className', label: 'Class' },
            { key: 'amount', label: 'Amount' },
            { key: 'status', label: 'Status' },
          ]}
          data={filteredRecords}
        />
      </div>
    // </DashboardLayout>
  );
};

export default FinancialReport; 
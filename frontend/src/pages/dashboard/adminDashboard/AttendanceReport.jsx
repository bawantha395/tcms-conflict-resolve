import React, { useState } from 'react';
import BasicTable from '../../../components/BasicTable';
import CustomButton from '../../../components/CustomButton';
import dayjs from 'dayjs';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to get attendance data from localStorage
const getAttendanceData = () => {
  try {
    const stored = localStorage.getItem('myClasses');
    if (!stored) return [];
    const classes = JSON.parse(stored);
    
    // Get enrollments to match student information
    const enrollments = JSON.parse(localStorage.getItem('enrollments') || '[]');
    
    // Extract attendance records from myClasses
    const attendanceRecords = [];
    classes.forEach(cls => {
      if (cls.attendance && Array.isArray(cls.attendance)) {
        cls.attendance.forEach((record, index) => {
          // Find student information from enrollments
          const studentEnrollment = enrollments.find(e => 
            e.classId === cls.id && e.studentId === record.studentId
          );
          
          attendanceRecords.push({
            id: `${cls.id}_${index}`,
            studentId: record.studentId || studentEnrollment?.studentId || 'STUDENT_001',
            name: record.studentName || studentEnrollment?.studentName || 'Unknown Student',
            className: cls.className || 'Unknown Class',
            date: record.date,
            status: record.status,
            in: record.timestamp || record.time || new Date().toISOString(),
            out: record.outTime || '-',
            month: record.date ? record.date.substring(0, 7) : '', // Extract YYYY-MM for monthly reports
            classId: cls.id,
            subject: cls.subject,
            teacher: cls.teacher
          });
        });
      }
    });
    
    return attendanceRecords;
  } catch {
    return [];
  }
};

const AttendanceReport = () => {
  const [records] = useState(() => getAttendanceData());
  const [reportType, setReportType] = useState('daily'); // 'daily' or 'monthly'
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  // Filter records by selected day or month
  const filteredRecords = records.filter(rec => {
    if (reportType === 'daily') {
      if (!selectedDate) return true;
      return rec.date === selectedDate;
    } else {
      if (!selectedMonth) return true;
      // For monthly reports, compare YYYY-MM format
      const recordMonth = rec.date ? rec.date.substring(0, 7) : '';
      return recordMonth === selectedMonth;
    }
  });

  // Summary counts
  const presentCount = filteredRecords.filter(r => r.status === 'present').length;
  const absentCount = filteredRecords.filter(r => r.status === 'absent').length;
  const lateCount = filteredRecords.filter(r => r.status === 'late').length;
  const total = filteredRecords.length;

  // Pie chart data
  const pieData = [
    { name: 'Present', value: presentCount, color: '#00C49F' },
    { name: 'Absent', value: absentCount, color: '#FF8042' },
    { name: 'Late', value: lateCount, color: '#FFBB28' }
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold">{`${payload[0].name}: ${payload[0].value}`}</p>
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
    doc.text('Attendance Report', 14, 18);
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
    doc.text(`Present: ${presentCount}`, 14, summaryY);
    doc.text(`Absent: ${absentCount}`, 80, summaryY);
    doc.text(`Late: ${lateCount}`, 150, summaryY);
    doc.text(`Total: ${total}`, 14, summaryY + 8);
    // Table headers and rows
    const headers = [
      'Student ID', 'Name', 'Class', 'Subject', 'Teacher', 'Date', 'Status', 'In', 'Out'
    ];
    const rows = filteredRecords.map(row => [
      row.studentId,
      row.name,
      row.className,
      row.subject || 'N/A',
      row.teacher || 'N/A',
      row.date,
      row.status,
      new Date(row.in).toLocaleString(),
      row.out
    ]);
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: summaryY + 18,
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
    doc.save('attendance_report.pdf');
  };

  // Export Excel (CSV)
  const handleExportExcel = () => {
    const headers = [
      'Student ID', 'Name', 'Class', 'Subject', 'Teacher', 'Date', 'Status', 'In', 'Out'
    ];
    const rows = filteredRecords.map(row => [
      row.studentId, 
      row.name, 
      row.className, 
      row.subject || 'N/A',
      row.teacher || 'N/A',
      row.date, 
      row.status, 
      new Date(row.in).toLocaleString(), 
      row.out
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
    link.setAttribute('download', 'attendance_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">Attendance Report</h1>
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
          Present: {presentCount}
        </div>
        <div className="bg-red-100 text-red-800 rounded-lg px-6 py-4 font-bold text-lg">
          Absent: {absentCount}
        </div>
        <div className="bg-yellow-100 text-yellow-800 rounded-lg px-6 py-4 font-bold text-lg">
          Late: {lateCount}
        </div>
        <div className="rounded-lg px-6 py-4 font-bold text-lg bg-gray-100 text-gray-800">
          Total: {total}
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
          { key: 'studentId', label: 'Student ID' },
          { key: 'name', label: 'Name' },
          { key: 'className', label: 'Class' },
          { key: 'subject', label: 'Subject' },
          { key: 'teacher', label: 'Teacher' },
          { key: 'date', label: 'Date' },
          { key: 'status', label: 'Status', render: row => {
              const status = row.status;
              if (status === 'present') return <span className="px-2 py-1 rounded bg-green-100 text-green-800 font-semibold">Present</span>;
              if (status === 'absent') return <span className="px-2 py-1 rounded bg-red-100 text-red-800 font-semibold">Absent</span>;
              if (status === 'late') return <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 font-semibold">Late</span>;
              return <span className="px-2 py-1 rounded bg-gray-100 text-gray-800 font-semibold">{status}</span>;
            } },
          { key: 'in', label: 'In', render: row => new Date(row.in).toLocaleString() },
          { key: 'out', label: 'Out', render: row => row.out === '-' ? '-' : new Date(row.out).toLocaleString() },
        ]}
        data={filteredRecords}
      />
    </div>
  );
};

export default AttendanceReport;

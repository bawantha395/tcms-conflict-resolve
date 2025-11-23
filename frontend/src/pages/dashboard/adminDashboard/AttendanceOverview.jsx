import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import adminSidebarSections from './AdminDashboardSidebar';
import BasicTable from '../../../components/BasicTable';
import CustomButton from '../../../components/CustomButton';
import { FaQrcode, FaBarcode, FaVideo, FaMapMarkerAlt, FaUsers, FaCalendar, FaClock, FaEye, FaEdit, FaDownload } from 'react-icons/fa';

import BarcodeScanner from '../../../components/BarcodeScanner';

// Get all classes from localStorage
const getClassList = () => {
  try {
    const stored = localStorage.getItem('classes');
    if (!stored) {
      return [];
    }
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

// Get enrollments from localStorage
const getEnrollments = () => {
  try {
    const stored = localStorage.getItem('enrollments');
    if (!stored) {
      return [];
    }
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

// Get attendance records from localStorage
const getAttendanceRecords = () => {
  try {
    const stored = localStorage.getItem('myClasses');
    if (!stored) return [];
    const classes = JSON.parse(stored);
    
    // Extract attendance records from myClasses
    const attendanceRecords = [];
    classes.forEach(cls => {
      if (cls.attendance && Array.isArray(cls.attendance)) {
        cls.attendance.forEach(record => {
          attendanceRecords.push({
            id: Date.now() + Math.random(),
            classId: cls.id,
            studentId: record.studentId || 'STUDENT_001', // Default student ID
            studentName: record.studentName || 'Unknown Student',
            date: record.date,
            time: record.timestamp || new Date().toISOString(),
            status: record.status,
            method: record.method || 'manual',
            deliveryMethod: cls.deliveryMethod || 'physical'
          });
        });
      }
    });
    
    return attendanceRecords;
  } catch {
    return [];
  }
};

// Get myClasses data for student attendance
const getMyClassesData = () => {
  try {
    const stored = localStorage.getItem('myClasses');
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

const AttendanceOverview = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState('');
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  
  const [selectedClass, setSelectedClass] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanningStatus, setScanningStatus] = useState('');

  const classList = getClassList();
  const enrollments = getEnrollments();
  const attendanceRecords = getAttendanceRecords();
  const myClassesData = getMyClassesData();

  // Calculate studentsPresent and totalStudents for each class
  const classesWithAttendance = classList.map(cls => {
    // Get students enrolled in this class
    const enrolledStudents = enrollments.filter(e => e.classId === cls.id);
    
    // Get today's attendance for this class
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendanceRecords.filter(record => 
      record.classId === cls.id && record.date === today
    );
    
    // Count present students
    const presentStudents = todayAttendance.filter(record => record.status === 'present').length;
    
    // Get delivery method info
    const deliveryMethod = cls.deliveryMethod || 'physical';
    
    return {
      ...cls,
      studentsPresent: presentStudents,
      totalStudents: enrolledStudents.length,
      date: cls.startDate || today,
      from: cls.schedule?.startTime || '',
      to: cls.schedule?.endTime || '',
      status: cls.status || 'Not Started',
      deliveryMethod: deliveryMethod,
      attendanceRate: enrolledStudents.length > 0 ? Math.round((presentStudents / enrolledStudents.length) * 100) : 0
    };
  });

  // Filter classes by selected date if selectedDate is set, else show all
  const filteredClasses = selectedDate
    ? classesWithAttendance.filter(cls => cls.date === selectedDate)
    : classesWithAttendance;

  // Handle barcode scanning
  const handleBarcodeScan = (classId) => {
    setSelectedClass(classList.find(cls => cls.id === classId));
    setShowBarcodeModal(true);
    setBarcodeInput('');
    setScanningStatus('');
  };

  // Process barcode input
  const processBarcode = (barcodeData) => {
    if (!barcodeData || !barcodeData.trim()) {
      setScanningStatus('Please enter a barcode');
      return;
    }

    // Simulate barcode processing
    setScanningStatus('Processing barcode...');
    
    setTimeout(() => {
      // Extract student ID from barcode (format: classId_STUDENT_XXX_timestamp_random)
      const data = barcodeData.trim();
      console.log('Processing barcode:', data);
      
      let studentId;
      
      // Try to parse the barcode format
      if (data.includes('_')) {
        const parts = data.split('_');
        if (parts.length >= 2) {
          // Extract student ID from barcode (e.g., "STUDENT_001" from "classId_STUDENT_001_timestamp_random")
          studentId = parts[1] + '_' + parts[2]; // Combine STUDENT and XXX
        } else {
          studentId = data; // Fallback to original input
        }
      } else {
        studentId = data; // Fallback to original input
      }
      
      console.log('Extracted student ID:', studentId);
      
      // Find student in enrollments
      const student = enrollments.find(e => e.studentId === studentId && e.classId === selectedClass.id);
      
      if (!student) {
        console.log('Available enrollments:', enrollments.filter(e => e.classId === selectedClass.id));
        setScanningStatus(`Student not found or not enrolled in this class. Student ID: ${studentId}`);
        return;
      }

      // Check if attendance already marked for today
      const today = new Date().toISOString().split('T')[0];
      const existingRecord = attendanceRecords.find(record => 
        record.classId === selectedClass.id && 
        record.studentId === studentId && 
        record.date === today
      );

      if (existingRecord) {
        setScanningStatus('Attendance already marked for this student today');
        return;
      }

      // Mark attendance
      const newAttendanceRecord = {
        id: Date.now(),
        classId: selectedClass.id,
        studentId: studentId,
        studentName: student.studentName || 'Unknown Student',
        date: today,
        time: new Date().toISOString(),
        status: 'present',
        method: 'barcode',
        deliveryMethod: selectedClass.deliveryMethod || 'physical'
      };

      // Save to myClasses localStorage
      const storedClasses = localStorage.getItem('myClasses');
      if (storedClasses) {
        const classes = JSON.parse(storedClasses);
        const updatedClasses = classes.map(cls => {
          if (cls.id === selectedClass.id) {
            const attendance = cls.attendance || [];
            attendance.push({
              date: today,
              status: 'present',
              timestamp: new Date().toISOString(),
              studentId: studentId,
              studentName: student.studentName || 'Unknown Student',
              method: 'barcode'
            });
            return { ...cls, attendance };
          }
          return cls;
        });
        localStorage.setItem('myClasses', JSON.stringify(updatedClasses));
      }

      setScanningStatus(`Attendance marked successfully for ${student.studentName || studentId}`);
      setBarcodeInput('');
      
      // Refresh the page data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }, 1000);
  };

  // Handle online attendance marking
  const handleOnlineAttendance = (classId) => {
    const today = new Date().toISOString().split('T')[0];
    const classStudents = enrollments.filter(e => e.classId === classId);
    
    // For online classes, mark all enrolled students as present (simplified)
    const newRecords = classStudents.map(student => ({
      id: Date.now() + Math.random(),
      classId: classId,
      studentId: student.studentId,
      studentName: student.studentName || 'Unknown Student',
      date: today,
      time: new Date().toISOString(),
      status: 'present',
      method: 'online',
      deliveryMethod: 'online'
    }));

    // Save to myClasses localStorage
    const storedClasses = localStorage.getItem('myClasses');
    if (storedClasses) {
      const classes = JSON.parse(storedClasses);
      const updatedClasses = classes.map(cls => {
        if (cls.id === classId) {
          const attendance = cls.attendance || [];
          classStudents.forEach(student => {
            attendance.push({
              date: today,
              status: 'present',
              timestamp: new Date().toISOString(),
              studentId: student.studentId,
              studentName: student.studentName || 'Unknown Student',
              method: 'online'
            });
          });
          return { ...cls, attendance };
        }
        return cls;
      });
      localStorage.setItem('myClasses', JSON.stringify(updatedClasses));
    }

    alert('Online attendance marked for all enrolled students');
    window.location.reload();
  };

  // Generate barcode for a class
  const generateClassBarcode = (classId) => {
    // Simple barcode generation (in real app, use a proper barcode library)
    const barcodeData = `CLASS_${classId}_${Date.now()}`;
    return barcodeData;
  };

  // Download attendance report
  const downloadAttendanceReport = (classId) => {
    const classData = classList.find(cls => cls.id === classId);
    const storedClasses = localStorage.getItem('myClasses');
    if (!storedClasses) {
      alert('No class data found');
      return;
    }
    
    const classes = JSON.parse(storedClasses);
    const classDataFromStorage = classes.find(cls => cls.id === classId);
    const classAttendance = classDataFromStorage?.attendance || [];
    
    if (classAttendance.length === 0) {
      alert('No attendance records found for this class');
      return;
    }

    // Create CSV content
    const csvContent = [
      ['Date', 'Student ID', 'Student Name', 'Status', 'Method', 'Time'],
      ...classAttendance.map(record => [
        record.date,
        record.studentId || 'Unknown',
        record.studentName || 'Unknown Student',
        record.status,
        record.method || 'manual',
        new Date(record.timestamp || record.time || new Date()).toLocaleString()
      ])
    ].map(row => row.join(',')).join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${classData.className}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout userRole="Administrator" sidebarItems={adminSidebarSections}>
      <div className="p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Attendance Tracking</h1>
        
        {/* Date Filter */}
        <div className="flex items-center gap-4 mb-6">
          <label className="font-semibold">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="border rounded px-3 py-2"
            placeholder="Select date (optional)"
          />
          {selectedDate && (
            <button
              type="button"
              className="ml-2 text-sm text-gray-600 underline hover:text-blue-700"
              onClick={() => setSelectedDate('')}
            >
              Clear
            </button>
          )}
        </div>

        {/* Attendance Table */}
        <BasicTable
          columns={[
            { key: 'className', label: 'Class Name' },
            { key: 'subject', label: 'Subject' },
            { key: 'teacher', label: 'Teacher' },
            { key: 'stream', label: 'Stream' },
            { key: 'date', label: 'Date' },
            { key: 'from', label: 'From' },
            { key: 'to', label: 'To' },
            { key: 'deliveryMethod', label: 'Mode', render: row => {
                const method = row.deliveryMethod || 'physical';
                if (method === 'online') return <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 font-semibold flex items-center gap-1"><FaVideo /> Online</span>;
                if (method === 'hybrid') return <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 font-semibold flex items-center gap-1"><FaMapMarkerAlt /> Hybrid</span>;
                return <span className="px-2 py-1 rounded bg-green-100 text-green-800 font-semibold flex items-center gap-1"><FaMapMarkerAlt /> Physical</span>;
              } },
            { key: 'status', label: 'Status', render: row => {
                if (row.status === 'active') return <span className="px-2 py-1 rounded bg-green-100 text-green-800 font-semibold">Active</span>;
                if (row.status === 'inactive') return <span className="px-2 py-1 rounded bg-red-100 text-red-800 font-semibold">Inactive</span>;
                if (row.status === 'archived') return <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 font-semibold">Archived</span>;
                return row.status;
              } },
            { key: 'studentsPresent', label: 'Attendance', render: row => (
                <div className="text-center">
                  <div className="font-semibold text-blue-700">{row.studentsPresent}/{row.totalStudents}</div>
                  <div className="text-xs text-gray-500">{row.attendanceRate}%</div>
                </div>
              ) },
            { key: 'actions', label: 'Actions', render: row => (
                <div className="flex gap-2">
                  <CustomButton
                    onClick={() => navigate(`/admin/attendance/${row.id}`)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    title="View Details"
                  >
                    <FaEye />
                  </CustomButton>

                  {/* Barcode scanning for physical and hybrid classes */}
                  {(row.deliveryMethod === 'physical' || row.deliveryMethod === 'hybrid') && (
                    <>
                      <CustomButton
                        onClick={() => handleBarcodeScan(row.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        title="Scan Barcode (Physical/Hybrid)"
                      >
                        <FaBarcode />
                      </CustomButton>
                      
                    </>
                  )}

                  {/* Online attendance for online and hybrid classes */}
                  {(row.deliveryMethod === 'online' || row.deliveryMethod === 'hybrid') && (
                    <CustomButton
                      onClick={() => handleOnlineAttendance(row.id)}
                      className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                      title="Mark Online Attendance (Online/Hybrid)"
                    >
                      <FaVideo />
                    </CustomButton>
                  )}

                  <CustomButton
                    onClick={() => downloadAttendanceReport(row.id)}
                    className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                    title="Download Report"
                  >
                    <FaDownload />
                  </CustomButton>
                </div>
              ) },
          ]}
          data={filteredClasses}
        />

        {/* Barcode Scanner Modal */}
        {showBarcodeModal && selectedClass && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <BarcodeScanner
              onScan={processBarcode}
              onClose={() => setShowBarcodeModal(false)}
              className={selectedClass.className}
              classId={selectedClass.id}
            />
          </div>
        )}

        
      </div>
    </DashboardLayout>
  );
};

export default AttendanceOverview; 

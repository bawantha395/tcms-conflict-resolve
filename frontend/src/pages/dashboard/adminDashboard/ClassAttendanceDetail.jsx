import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import adminSidebarSections from './AdminDashboardSidebar';
import BasicTable from '../../../components/BasicTable';
import CustomButton from '../../../components/CustomButton';
import { FaQrcode, FaBarcode, FaVideo, FaMapMarkerAlt, FaUsers, FaCalendar, FaClock, FaEye, FaEdit, FaDownload, FaCheckCircle, FaTimesCircle, FaUser, FaArrowLeft, FaChartBar } from 'react-icons/fa';

// Get attendance records from localStorage
const getAttendanceRecords = () => {
  try {
    const stored = localStorage.getItem('myClasses');
    if (!stored) return [];
    const classes = JSON.parse(stored);
    
    // Get enrollments to match student information
    const enrollments = getEnrollments();
    
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
            id: `${cls.id}_${index}`, // Use consistent ID
            classId: cls.id,
            studentId: record.studentId || studentEnrollment?.studentId || 'STUDENT_001',
            studentName: record.studentName || studentEnrollment?.studentName || 'Unknown Student',
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

// Get class details from localStorage
const getClassDetails = (classId) => {
  try {
    const stored = localStorage.getItem('classes');
    if (!stored) return null;
    const classes = JSON.parse(stored);
    // Fix: Compare both as strings to avoid type mismatch
    return classes.find(cls => String(cls.id) === String(classId));
  } catch {
    return null;
  }
};

const ClassAttendanceDetail = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [classDetails, setClassDetails] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanningStatus, setScanningStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClassData();
  }, [classId, selectedDate]);

  const loadClassData = () => {
    setLoading(true);
    
    // Load class details
    const classData = getClassDetails(classId);
    setClassDetails(classData);

    // Load enrollments for this class
    const allEnrollments = getEnrollments();
    const classEnrollments = allEnrollments.filter(e => e.classId === classId);
    setEnrolledStudents(classEnrollments);

    // Load attendance records for this class and date
    const allAttendanceRecords = getAttendanceRecords();
    console.log('All attendance records:', allAttendanceRecords);
    console.log('Looking for classId:', classId, 'and date:', selectedDate);
    
    const classAttendance = allAttendanceRecords.filter(record => {
      console.log('Checking record:', record);
      console.log('Record classId:', record.classId, 'Record date:', record.date);
      console.log('Match classId:', String(record.classId) === String(classId));
      console.log('Match date:', record.date === selectedDate);
      
      // Normalize date formats for comparison
      const recordDate = record.date;
      const selectedDateNormalized = selectedDate;
      
      console.log('Date comparison:', recordDate, '===', selectedDateNormalized);
      
      return String(record.classId) === String(classId) && recordDate === selectedDateNormalized;
    });
    
    console.log('Filtered class attendance:', classAttendance);
    setAttendanceRecords(classAttendance);

    setLoading(false);
  };

  // Process barcode input
  const processBarcode = () => {
    if (!barcodeInput.trim()) {
      setScanningStatus('Please enter a barcode');
      return;
    }

    setScanningStatus('Processing barcode...');
    
    setTimeout(() => {
      // Extract student ID from barcode (format: classId_STUDENT_XXX_timestamp_random)
      const barcodeData = barcodeInput.trim();
      console.log('Processing barcode:', barcodeData);
      
      let studentId;
      
      // Try to parse the barcode format
      if (barcodeData.includes('_')) {
        const parts = barcodeData.split('_');
        if (parts.length >= 2) {
          // Extract student ID from barcode (e.g., "STUDENT_001" from "classId_STUDENT_001_timestamp_random")
          studentId = parts[1] + '_' + parts[2]; // Combine STUDENT and XXX
        } else {
          studentId = barcodeData; // Fallback to original input
        }
      } else {
        studentId = barcodeInput; // Fallback to original input
      }
      
      console.log('Extracted student ID:', studentId);
      
      // Find student in enrollments
      const student = enrolledStudents.find(e => e.studentId === studentId);
      
      if (!student) {
        console.log('Available students:', enrolledStudents);
        setScanningStatus(`Student not found or not enrolled in this class. Student ID: ${studentId}`);
        return;
      }

      // Check if attendance already marked for today
      const existingRecord = attendanceRecords.find(record => 
        record.studentId === studentId && record.date === selectedDate
      );

      if (existingRecord) {
        setScanningStatus('Attendance already marked for this student today');
        return;
      }

      // Mark attendance
      const newAttendanceRecord = {
        id: Date.now(),
        classId: classId,
        studentId: studentId,
        studentName: student.studentName || 'Unknown Student',
        date: selectedDate,
        time: new Date().toISOString(),
        status: 'present',
        method: 'barcode',
        deliveryMethod: classDetails?.deliveryMethod || 'physical'
      };

      // Save to myClasses localStorage
      const storedClasses = localStorage.getItem('myClasses');
      if (storedClasses) {
        const classes = JSON.parse(storedClasses);
        const updatedClasses = classes.map(cls => {
          if (cls.id === classId) {
            const attendance = cls.attendance || [];
            attendance.push({
              date: selectedDate,
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
      
      // Refresh data
      setTimeout(() => {
        loadClassData();
      }, 1000);
    }, 1000);
  };

  // Mark attendance manually
  const markAttendance = (studentId, status) => {
    const student = enrolledStudents.find(e => e.studentId === studentId);
    if (!student) return;

    // Check if attendance already marked
    const existingRecord = attendanceRecords.find(record => 
      record.studentId === studentId && record.date === selectedDate
    );

    if (existingRecord) {
      // Update existing record in myClasses
      const storedClasses = localStorage.getItem('myClasses');
      if (storedClasses) {
        const classes = JSON.parse(storedClasses);
        const updatedClasses = classes.map(cls => {
          if (cls.id === classId) {
            const attendance = cls.attendance || [];
            const updatedAttendance = attendance.map(record => 
              record.date === selectedDate && record.studentId === studentId
                ? { ...record, status: status, timestamp: new Date().toISOString() }
                : record
            );
            return { ...cls, attendance: updatedAttendance };
          }
          return cls;
        });
        localStorage.setItem('myClasses', JSON.stringify(updatedClasses));
      }
    } else {
      // Create new record
      const newRecord = {
        id: Date.now(),
        classId: classId,
        studentId: studentId,
        studentName: student.studentName || 'Unknown Student',
        date: selectedDate,
        time: new Date().toISOString(),
        status: status,
        method: 'manual',
        deliveryMethod: classDetails?.deliveryMethod || 'physical'
      };

      // Save to myClasses localStorage
      const storedClasses = localStorage.getItem('myClasses');
      if (storedClasses) {
        const classes = JSON.parse(storedClasses);
        const updatedClasses = classes.map(cls => {
          if (cls.id === classId) {
            const attendance = cls.attendance || [];
            attendance.push({
              date: selectedDate,
              status: status,
              timestamp: new Date().toISOString(),
              studentId: studentId,
              studentName: student.studentName || 'Unknown Student',
              method: 'manual'
            });
            return { ...cls, attendance };
          }
          return cls;
        });
        localStorage.setItem('myClasses', JSON.stringify(updatedClasses));
      }
    }

    loadClassData();
  };

  // Mark all students present (for online classes)
  const markAllPresent = () => {
    // Save to myClasses localStorage
    const storedClasses = localStorage.getItem('myClasses');
    if (storedClasses) {
      const classes = JSON.parse(storedClasses);
      const updatedClasses = classes.map(cls => {
        if (cls.id === classId) {
          const attendance = cls.attendance || [];
          enrolledStudents.forEach(student => {
            attendance.push({
              date: selectedDate,
              status: 'present',
              timestamp: new Date().toISOString(),
              studentId: student.studentId,
              studentName: student.studentName || 'Unknown Student',
              method: 'bulk'
            });
          });
          return { ...cls, attendance };
        }
        return cls;
      });
      localStorage.setItem('myClasses', JSON.stringify(updatedClasses));
    }
    loadClassData();
  };

  // Download attendance report
  const downloadReport = () => {
    const storedClasses = localStorage.getItem('myClasses');
    if (!storedClasses) {
      alert('No class data found');
      return;
    }
    
    const classes = JSON.parse(storedClasses);
    const classData = classes.find(cls => cls.id === classId);
    const classAttendance = classData?.attendance || [];
    
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
    a.download = `attendance_${classDetails?.className || 'class'}_${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <DashboardLayout userRole="Administrator" sidebarItems={adminSidebarSections}>
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="text-center">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!classDetails) {
    return (
      <DashboardLayout userRole="Administrator" sidebarItems={adminSidebarSections}>
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="text-center text-red-600">Class not found</div>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate attendance statistics
  const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
  const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
  const totalEnrolled = enrolledStudents.length > 0 ? enrolledStudents.length : attendanceRecords.length;
  const attendanceRate = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;

  // Create student attendance data for table
  let studentAttendanceData = [];
  
  console.log('Enrolled students:', enrolledStudents);
  console.log('Attendance records:', attendanceRecords);
  
  if (enrolledStudents.length > 0) {
    // If we have enrolled students, show them with their attendance
    studentAttendanceData = enrolledStudents.map(student => {
      const attendanceRecord = attendanceRecords.find(r => r.studentId === student.studentId);
      return {
        ...student,
        attendanceStatus: attendanceRecord?.status || 'not_marked',
        attendanceTime: attendanceRecord?.time || null,
        attendanceMethod: attendanceRecord?.method || null
      };
    });
  } else {
    // If no enrolled students, show attendance records directly
    studentAttendanceData = attendanceRecords.map(record => ({
      studentId: record.studentId,
      studentName: record.studentName,
      attendanceStatus: record.status,
      attendanceTime: record.time,
      attendanceMethod: record.method
    }));
  }
  
  console.log('Final student attendance data:', studentAttendanceData);

  return (
    <DashboardLayout userRole="Administrator" sidebarItems={adminSidebarSections}>
      <div className="p-6 bg-white rounded-lg shadow">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <CustomButton
              onClick={() => navigate('/admin/attendance')}
              className="p-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              <FaArrowLeft />
            </CustomButton>
            <div>
              <h1 className="text-2xl font-bold">{classDetails.className}</h1>
              <p className="text-gray-600">{classDetails.subject} • {classDetails.teacher}</p>
          </div>
          </div>
          
          <div className="flex gap-2">
            <CustomButton
              onClick={downloadReport}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <FaDownload className="mr-2" />
              Download Report
            </CustomButton>
          </div>
        </div>

        {/* Class Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <FaUsers className="text-blue-600" />
              <span className="font-semibold">Total Students</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{totalEnrolled}</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <FaCheckCircle className="text-green-600" />
              <span className="font-semibold">Present</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{presentCount}</div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <FaTimesCircle className="text-red-600" />
              <span className="font-semibold">Absent</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{absentCount}</div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <FaChartBar className="text-purple-600" />
              <span className="font-semibold">Attendance Rate</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{attendanceRate}%</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="font-semibold">Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
          
          {classDetails.deliveryMethod === 'physical' && (
            <CustomButton
              onClick={() => setShowBarcodeModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <FaBarcode className="mr-2" />
              Scan Barcode
            </CustomButton>
          )}
          
          {(classDetails.deliveryMethod === 'online' || classDetails.deliveryMethod === 'hybrid') && (
            <CustomButton
              onClick={markAllPresent}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              <FaVideo className="mr-2" />
              Mark All Present (Online)
            </CustomButton>
          )}
        </div>

        {/* Student Attendance Table */}
        <BasicTable
          columns={[
            { key: 'studentName', label: 'Student Name' },
            { key: 'studentId', label: 'Student ID' },
            { key: 'attendanceStatus', label: 'Status', render: row => {
                const status = row.attendanceStatus;
                if (status === 'present') return <span className="px-2 py-1 rounded bg-green-100 text-green-800 font-semibold">Present</span>;
                if (status === 'absent') return <span className="px-2 py-1 rounded bg-red-100 text-red-800 font-semibold">Absent</span>;
                return <span className="px-2 py-1 rounded bg-gray-100 text-gray-800 font-semibold">Not Marked</span>;
              } },
            { key: 'attendanceTime', label: 'Time', render: row => 
                row.attendanceTime ? new Date(row.attendanceTime).toLocaleTimeString() : '-'
              },
            { key: 'attendanceMethod', label: 'Method', render: row => {
                const method = row.attendanceMethod;
                if (method === 'barcode') return <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-sm">Barcode</span>;
                if (method === 'manual') return <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-sm">Manual</span>;
                if (method === 'bulk') return <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 text-sm">Bulk</span>;
                return '-';
              } },
            { key: 'actions', label: 'Actions', render: row => (
                <div className="flex gap-2">
                  <CustomButton
                    onClick={() => markAttendance(row.studentId, 'present')}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    disabled={row.attendanceStatus === 'present'}
                  >
                    Present
                  </CustomButton>
                  <CustomButton
                    onClick={() => markAttendance(row.studentId, 'absent')}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    disabled={row.attendanceStatus === 'absent'}
                  >
                    Absent
                  </CustomButton>
                </div>
              ) },
            ]}
          data={studentAttendanceData}
        />

        {/* Barcode Scanner Modal */}
        {showBarcodeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold mb-4">Barcode Attendance Scanner</h3>
              <p className="text-sm text-gray-600 mb-4">
                Class: <strong>{classDetails.className}</strong><br/>
                Date: <strong>{selectedDate}</strong><br/>
                Scan or enter student barcode:
              </p>
              
              <div className="mb-4">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Enter barcode or student ID"
                  className="w-full border rounded px-3 py-2"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && processBarcode()}
          />
        </div>
              
              {scanningStatus && (
                <div className={`p-3 rounded mb-4 ${
                  scanningStatus.includes('successfully') 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {scanningStatus}
                </div>
              )}
              
              <div className="flex gap-2">
                <CustomButton
                  onClick={processBarcode}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Mark Attendance
                </CustomButton>
                <CustomButton
                  onClick={() => setShowBarcodeModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Close
                </CustomButton>
              </div>
              
              <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
                <strong>Test Barcodes:</strong><br/>
                • STUDENT_001<br/>
                • STUDENT_002<br/>
                • STUDENT_003
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClassAttendanceDetail; 
import React, { useState, useEffect } from 'react';
import BasicAlertBox from '../../../components/BasicAlertBox';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import adminSidebarSections from './AdminDashboardSidebar';
import CustomButton from '../../../components/CustomButton';
import CustomButton2 from '../../../components/CustomButton2';
import BasicTable from '../../../components/BasicTable';
import BasicForm from '../../../components/BasicForm';
import { FieldArray } from 'formik';
import CustomTextField from '../../../components/CustomTextField';
import { FaEdit, FaTrash, FaUser, FaEnvelope, FaPhone, FaIdCard, FaUserGraduate, FaBook, FaCalendar, FaBarcode, FaDownload, FaPrint, FaQrcode, FaSync, FaFileExport, FaChartBar,FaEye } from 'react-icons/fa';
import * as Yup from 'yup';
import CustomSelectField from '../../../components/CustomSelectField';
import JsBarcode from 'jsbarcode';
import { getAllBarcodes, getBarcode } from '../../../api/auth';
import { getAllStudents, deleteStudent, updateStudent } from '../../../api/students';

// Helper to parse NIC (Sri Lankan)
function parseNIC(nic) {
  let year, month, day, gender;
  let nicStr = nic.toString().toUpperCase();
  if (/^\d{9}[VX]$/.test(nicStr)) {
    year = '19' + nicStr.substring(0, 2);
    let days = parseInt(nicStr.substring(2, 5), 10);
    gender = days > 500 ? 'Female' : 'Male';
    if (days > 500) days -= 500;
    const months = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let m = 0;
    while (days > months[m]) {
      days -= months[m];
      m++;
    }
    month = (m + 1).toString().padStart(2, '0');
    day = days.toString().padStart(2, '0');
  } else if (/^\d{12}$/.test(nicStr)) {
    year = nicStr.substring(0, 4);
    let days = parseInt(nicStr.substring(4, 7), 10);
    gender = days > 500 ? 'Female' : 'Male';
    if (days > 500) days -= 500;
    const months = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let m = 0;
    while (days > months[m]) {
      days -= months[m];
      m++;
    }
    month = (m + 1).toString().padStart(2, '0');
    day = days.toString().padStart(2, '0');
  } else {
    return null;
  }
  
  const dob = `${year}-${month}-${day}`;

  // Calculate age
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const mm = today.getMonth() - birthDate.getMonth();
  if (mm < 0 || (mm === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return { dob, gender, age };
}




const streamOptions = [
  'O/L',
  'A/L-Art',
  'A/L-Maths',
  'A/L-Science',
  'A/L-Commerce',
  'A/L-Technology',
  'Primary',
];

const genderOptions = [
    'Male',
    'Female',
];

const validationSchema = Yup.object().shape({
  studentId: Yup.string().required('Student ID is required'),
  firstName: Yup.string().min(2, 'First name must be at least 2 characters').required('First name is required'),
  lastName: Yup.string().min(2, 'Last name must be at least 2 characters').required('Last name is required'),

  stream: Yup.string().oneOf(streamOptions, 'Invalid stream').required('Stream is required'),
  dateOfBirth: Yup.string().required('Date of Birth is required'),
  gender: Yup.string().oneOf(genderOptions, 'Invalid gender').required('Gender is required'),
  school: Yup.string().required('School is required'),
  address: Yup.string().required('Address is required'),
  district: Yup.string().required('District is required'),
  phone: Yup.string().required('Mobile is required'),
  parentName: Yup.string().required('Parent name is required'),
  parentPhone: Yup.string().required('Parent mobile number is required'),
  enrolledClasses: Yup.array().of(
    Yup.object().shape({
      subject: Yup.string().required('Subject is required'),
      teacher: Yup.string().required('Teacher is required'),
      schedule: Yup.string(),
      hall: Yup.string(),
    })
  ),
});



const StudentEnrollment = () => {
  // Load students from backend database
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editValues, setEditValues] = useState({});
  
  // Barcode modal state
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [barcodeGenerated, setBarcodeGenerated] = useState(false);

  // Filter state
  const [registrationFilter, setRegistrationFilter] = useState('all'); // 'all', 'online', 'physical'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    key: 'dateJoined',
    direction: 'desc'
  });
  
  // Additional filters
  const [streamFilter, setStreamFilter] = useState('all');
  
  // Date range filters
  const [dateRangeFilter, setDateRangeFilter] = useState({
    startDate: '',
    endDate: ''
  });
  
  // Delete confirmation modal
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    studentId: null,
    studentName: ''
  });
  
  // Selected students for bulk operations
  const [selectedStudents, setSelectedStudents] = useState([]);

  // Fetch students from backend
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await getAllStudents();
      console.log('Raw response from getAllStudents:', response);
      
      // Handle both array response and object with students property
      const studentsArray = Array.isArray(response) ? response : (response.students || []);
      
      if (studentsArray.length >= 0) {
        // Transform student data to match the expected format
        const studentData = studentsArray.map(student => ({
          studentId: student.user_id || student.userid,
          firstName: student.first_name || student.firstName || '',
          lastName: student.last_name || student.lastName || '',
          email: student.email || '',
          phone: student.mobile_number || student.mobile || '', // Using mobile_number as phone
          nic: student.nic || '',
          gender: student.gender || '',
          age: student.age || '',
          parentName: student.parent_name || student.parentName || '',
          parentPhone: student.parent_mobile_number || student.parentMobile || '',
          stream: student.stream || '',
          dateOfBirth: student.date_of_birth || student.dateOfBirth || '',
          school: student.school || '',
          address: student.address || '',
          district: student.district || '',
          dateJoined: student.created_at?.split(' ')[0] || student.dateJoined || '',
          barcodeData: student.barcode_data || student.barcodeData || '',
          created_at: student.created_at || '',
          // Registration type determination
          // Since both Online and Physical registration now use the same ID format (S0 + 4 digits),
          // we need to rely on database field 'registration_method' if available
          // For backward compatibility, default to 'Physical'
          registrationType: student.registration_method || 
                           student.registrationMethod || 
                           'Physical', // Default to Physical when field doesn't exist
          enrolledClasses: []
        }));
        setStudents(studentData);
        console.log('Students loaded from backend:', studentData);
      } else {
        console.error('Failed to fetch students: No data received');
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Load students on component mount
  useEffect(() => {
    fetchStudents();
  }, []);

  // Refresh students data from backend
  const refreshStudents = () => {
    fetchStudents();
  };

  // Filter students based on registration type and search term
  const filteredStudents = students.filter(student => {
    const matchesRegistrationType = registrationFilter === 'all' || 
                                   student.registrationType?.toLowerCase() === registrationFilter.toLowerCase();
    
    const matchesSearch = !searchTerm || 
                         student.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.school?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStream = streamFilter === 'all' || student.stream === streamFilter;
    
    // Date range filtering
    const matchesDateRange = !dateRangeFilter.startDate && !dateRangeFilter.endDate || 
                            (() => {
                              const studentDate = new Date(student.dateJoined || student.created_at);
                              const startDate = dateRangeFilter.startDate ? new Date(dateRangeFilter.startDate) : null;
                              const endDate = dateRangeFilter.endDate ? new Date(dateRangeFilter.endDate) : null;
                              
                              if (startDate && endDate) {
                                return studentDate >= startDate && studentDate <= endDate;
                              } else if (startDate) {
                                return studentDate >= startDate;
                              } else if (endDate) {
                                return studentDate <= endDate;
                              }
                              return true;
                            })();
    
    return matchesRegistrationType && matchesSearch && matchesStream && matchesDateRange;
  });

  // Sort students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (!a[sortConfig.key] && !b[sortConfig.key]) return 0;
    if (!a[sortConfig.key]) return 1;
    if (!b[sortConfig.key]) return -1;
    
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    // Handle date sorting
    if (sortConfig.key === 'dateJoined' || sortConfig.key === 'dateOfBirth') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }
    
    // Handle string sorting
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Calculate statistics
  const statistics = {
    total: students.length,
    online: students.filter(s => s.registrationType === 'Online').length,
    physical: students.filter(s => s.registrationType === 'Physical').length,
  };

  // Export functionality
  const exportToCSV = () => {
    const headers = ['Student ID', 'First Name', 'Last Name', 'Date of Birth', 'School', 'District', 'Date Joined', 'Stream', 'Registration Type', 'Barcode Status'];
    const csvContent = [
      headers.join(','),
      ...sortedStudents.map(student => [
        student.studentId,
        student.firstName || '',
        student.lastName || '',
        student.dateOfBirth || '',
        student.school || '',
        student.district || '',
        student.dateJoined || '',
        student.stream || '',
        student.registrationType || '',
        student.barcodeData ? 'Active' : 'Pending'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `students_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate barcodes for all students
  const generateAllBarcodes = async () => {
    try {
      const studentBackendUrl = 'http://localhost:8086';
      const response = await fetch(`${studentBackendUrl}/routes.php/generate-all-barcodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setSaveAlert({
          open: true,
          message: result.message,
          onConfirm: () => {
            setSaveAlert(a => ({ ...a, open: false }));
            refreshStudents(); // Refresh data to show updated barcode status
          },
          confirmText: 'OK',
          type: 'success',
        });
      } else {
        throw new Error(result.message || 'Failed to generate barcodes');
      }
    } catch (error) {
      console.error('Error generating barcodes:', error);
      setSaveAlert({
        open: true,
        message: 'Failed to generate barcodes: ' + error.message,
        onConfirm: () => setSaveAlert(a => ({ ...a, open: false })),
        confirmText: 'OK',
        type: 'danger',
      });
    }
  };

  // Print bulk ID cards for all students
  const printBulkIDCards = () => {
    if (sortedStudents.length === 0) {
      setSaveAlert({
        open: true,
        message: 'No students available to print ID cards.',
        onConfirm: () => setSaveAlert(a => ({ ...a, open: false })),
        confirmText: 'OK',
        type: 'warning',
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Bulk ID Cards - TCMS</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background: #f5f5f5;
            }
            .id-cards-container {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
              gap: 20px;
              max-width: 1200px;
              margin: 0 auto;
            }
            .id-card-container {
              width: 336px;
              height: 212px;
              background: linear-gradient(135deg, #1a365d 0%, #3da58a 100%);
              border-radius: 10px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              padding: 12px 15px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              color: white;
              position: relative;
              page-break-inside: avoid;
            }
            .id-header {
              text-align: center;
              border-bottom: 1px solid rgba(255, 255, 255, 0.3);
              padding-bottom: 4px;
            }
            .id-header h1 {
              font-size: 13px;
              color: #ffffff;
              margin: 0;
              font-weight: bold;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .id-header p {
              font-size: 8px;
              margin: 3px 0 0 0;
              color: #e0e0e0;
            }
            .id-content {
              margin-top: 10px;
              font-size: 11px;
              line-height: 1.6;
            }
            .id-content p {
              margin: 6px 0;
              font-weight: 500;
            }
            .barcode-section {
              background: #ffffff;
              padding: 5px;
              border-radius: 6px;
              display: flex;
              flex-direction: column;
              align-items: center;
              border-top: 1px solid #ddd;
              color: #000;
            }
            .barcode-container svg {
              width: 100%;
              max-height: 40px;
            }
            .barcode-text {
              font-size: 8px;
              font-family: monospace;
              margin-top: 3px;
              text-align: center;
              color: #333;
              font-weight: bold;
              word-break: break-all;
              line-height: 1.1;
            }
            .id-footer {
              font-size: 9px;
              text-align: right;
              color: #f0f0f0;
              opacity: 0.8;
              margin-top: 5px;
            }
            .print-button {
              position: fixed;
              top: 20px;
              right: 20px;
              background: #3da58a;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 5px;
              cursor: pointer;
              font-weight: bold;
              z-index: 1000;
            }
            .print-button:hover {
              background: #2d8a6f;
            }
            .bulk-header {
              text-align: center;
              margin-bottom: 20px;
              padding: 20px;
              background: white;
              border-radius: 10px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .bulk-header h1 {
              color: #1a365d;
              margin: 0 0 10px 0;
              font-size: 24px;
            }
            .bulk-header p {
              color: #666;
              margin: 0;
              font-size: 14px;
            }
            @media print {
              .print-button {
                display: none;
              }
              body {
                background: white;
                padding: 0;
              }
              .id-card-container {
                box-shadow: none;
                margin: 0;
              }
              .bulk-header {
                box-shadow: none;
                border: 1px solid #ddd;
              }
            }
          </style>
        </head>
        <body>
          <button class="print-button" onclick="window.print()">Print All ID Cards</button>
          
          <div class="bulk-header">
            <h1>TCMS Student ID Cards</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>Total Students: ${sortedStudents.length}</p>
          </div>
          
          <div class="id-cards-container">
            ${sortedStudents.map((student, index) => `
              <div class="id-card-container">
                <div class="id-header">
                  <h1>TCMS STUDENT ID</h1>
                  <p>Tuition Class Management System</p>
                </div>
                <div class="id-content">
                  <p><strong>Name:</strong> ${student.firstName} ${student.lastName}</p>
                  <p><strong>ID No:</strong> ${student.studentId}</p>
                  <p><strong>Stream:</strong> ${student.stream || 'Not Specified'}</p>
                  <p><strong>Registered On:</strong> ${student.dateJoined || new Date().toLocaleDateString()}</p>
                </div>
                <div class="barcode-section">
                  <div class="barcode-container">
                    <svg id="barcode-${index}"></svg>
                  </div>
                  <div class="barcode-text">${student.studentId}</div>
                </div>
                <div class="id-footer">
                  <p>Powered by TCMS | Valid for attendance</p>
                </div>
              </div>
            `).join('')}
          </div>

          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            setTimeout(() => {
              ${sortedStudents.map((student, index) => `
                try {
                  JsBarcode("#barcode-${index}", "${student.studentId}", {
                    format: "CODE128",
                    width: 1.2,
                    height: 30,
                    displayValue: false,
                    margin: 0,
                    background: "#ffffff",
                    lineColor: "#000000"
                  });
                } catch (error) {
                  console.error('Error generating barcode for ${student.studentId}:', error);
                }
              `).join('')}
            }, 200);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Print ID cards for filtered students only
  const printFilteredIDCards = () => {
    if (sortedStudents.length === 0) {
      setSaveAlert({
        open: true,
        message: 'No students available to print ID cards.',
        onConfirm: () => setSaveAlert(a => ({ ...a, open: false })),
        confirmText: 'OK',
        type: 'warning',
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Filtered ID Cards - TCMS</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background: #f5f5f5;
            }
            .id-cards-container {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
              gap: 20px;
              max-width: 1200px;
              margin: 0 auto;
            }
            .id-card-container {
              width: 336px;
              height: 212px;
              background: linear-gradient(135deg, #1a365d 0%, #3da58a 100%);
              border-radius: 10px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              padding: 12px 15px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              color: white;
              position: relative;
              page-break-inside: avoid;
            }
            .id-header {
              text-align: center;
              border-bottom: 1px solid rgba(255, 255, 255, 0.3);
              padding-bottom: 4px;
            }
            .id-header h1 {
              font-size: 13px;
              color: #ffffff;
              margin: 0;
              font-weight: bold;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .id-header p {
              font-size: 8px;
              margin: 3px 0 0 0;
              color: #e0e0e0;
            }
            .id-content {
              margin-top: 10px;
              font-size: 11px;
              line-height: 1.6;
            }
            .id-content p {
              margin: 6px 0;
              font-weight: 500;
            }
            .barcode-section {
              background: #ffffff;
              padding: 5px;
              border-radius: 6px;
              display: flex;
              flex-direction: column;
              align-items: center;
              border-top: 1px solid #ddd;
              color: #000;
            }
            .barcode-container svg {
              width: 100%;
              max-height: 40px;
            }
            .barcode-text {
              font-size: 8px;
              font-family: monospace;
              margin-top: 3px;
              text-align: center;
              color: #333;
              font-weight: bold;
              word-break: break-all;
              line-height: 1.1;
            }
            .id-footer {
              font-size: 9px;
              text-align: right;
              color: #f0f0f0;
              opacity: 0.8;
              margin-top: 5px;
            }
            .print-button {
              position: fixed;
              top: 20px;
              right: 20px;
              background: #3da58a;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 5px;
              cursor: pointer;
              font-weight: bold;
              z-index: 1000;
            }
            .print-button:hover {
              background: #2d8a6f;
            }
            .bulk-header {
              text-align: center;
              margin-bottom: 20px;
              padding: 20px;
              background: white;
              border-radius: 10px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .bulk-header h1 {
              color: #1a365d;
              margin: 0 0 10px 0;
              font-size: 24px;
            }
            .bulk-header p {
              color: #666;
              margin: 0;
              font-size: 14px;
            }
            .filter-info {
              background: #e3f2fd;
              border: 1px solid #2196f3;
              border-radius: 5px;
              padding: 10px;
              margin-bottom: 20px;
              text-align: center;
            }
            .filter-info h3 {
              color: #1976d2;
              margin: 0 0 5px 0;
              font-size: 16px;
            }
            .filter-info p {
              color: #424242;
              margin: 0;
              font-size: 12px;
            }
            @media print {
              .print-button {
                display: none;
              }
              body {
                background: white;
                padding: 0;
              }
              .id-card-container {
                box-shadow: none;
                margin: 0;
              }
              .bulk-header, .filter-info {
                box-shadow: none;
                border: 1px solid #ddd;
              }
            }
          </style>
        </head>
        <body>
          <button class="print-button" onclick="window.print()">Print Filtered ID Cards</button>
          
          <div class="bulk-header">
            <h1>TCMS Student ID Cards</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>Filtered Students: ${sortedStudents.length} of ${students.length} total</p>
          </div>

          <div class="filter-info">
            <h3>Filter Information</h3>
            <p>
              Registration Type: ${registrationFilter === 'all' ? 'All' : registrationFilter.charAt(0).toUpperCase() + registrationFilter.slice(1)} | 
              Stream: ${streamFilter === 'all' ? 'All' : streamFilter} | 
              Search: ${searchTerm || 'None'} | 
              Date Range: ${dateRangeFilter.startDate ? new Date(dateRangeFilter.startDate).toLocaleDateString() : 'Any'} → ${dateRangeFilter.endDate ? new Date(dateRangeFilter.endDate).toLocaleDateString() : 'Any'} | 
              Sort: ${sortConfig.key} (${sortConfig.direction === 'asc' ? 'A-Z' : 'Z-A'})
            </p>
          </div>
          
          <div class="id-cards-container">
            ${sortedStudents.map((student, index) => `
              <div class="id-card-container">
                <div class="id-header">
                  <h1>TCMS STUDENT ID</h1>
                  <p>Tuition Class Management System</p>
                </div>
                <div class="id-content">
                  <p><strong>Name:</strong> ${student.firstName} ${student.lastName}</p>
                  <p><strong>ID No:</strong> ${student.studentId}</p>
                  <p><strong>Stream:</strong> ${student.stream || 'Not Specified'}</p>
                  <p><strong>Registered On:</strong> ${student.dateJoined || new Date().toLocaleDateString()}</p>
                </div>
                <div class="barcode-section">
                  <div class="barcode-container">
                    <svg id="barcode-${index}"></svg>
                  </div>
                  <div class="barcode-text">${student.studentId}</div>
                </div>
                <div class="id-footer">
                  <p>Powered by TCMS | Valid for attendance</p>
                </div>
              </div>
            `).join('')}
          </div>

          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            setTimeout(() => {
              ${sortedStudents.map((student, index) => `
                try {
                  JsBarcode("#barcode-${index}", "${student.studentId}", {
                    format: "CODE128",
                    width: 1.2,
                    height: 30,
                    displayValue: false,
                    margin: 0,
                    background: "#ffffff",
                    lineColor: "#000000"
                  });
                } catch (error) {
                  console.error('Error generating barcode for ${student.studentId}:', error);
                }
              `).join('')}
            }, 200);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Generate barcode on canvas
  const generateBarcodeOnCanvas = (barcodeData, canvasId) => {
    try {
      const canvas = document.getElementById(canvasId);
        if (canvas) {
        JsBarcode(`#${canvasId}`, barcodeData, {
              format: 'CODE128',
              width: 2,
          height: 100,
              displayValue: true,
          fontSize: 16,
          margin: 10
            });
      }
          } catch (error) {
      console.error('Error generating barcode on canvas:', error);
          }
  };

  // Download barcode as PNG
  const downloadBarcode = (student) => {
    console.log('downloadBarcode called with student:', student);
    const canvas = document.getElementById('student-barcode-display');
    console.log('Canvas element found:', canvas);
    if (canvas) {
      const link = document.createElement('a');
      link.download = `barcode_${student.firstName}_${student.lastName}.png`;
      link.href = canvas.toDataURL();
      console.log('Download link created:', link.href);
      link.click();
    } else {
      console.error('Canvas element not found for barcode download');
    }
  };

  // Show barcode modal for a student
  const showBarcode = (student) => {
    console.log('showBarcode called with student:', student);
    setSelectedStudent(student);
    setShowBarcodeModal(true);
    setBarcodeGenerated(false);
    
    // Generate barcode after modal is shown
    setTimeout(() => {
      const barcodeData = student.studentId || student.barcodeData;
      console.log('Generating barcode with data:', barcodeData);
      generateBarcodeOnCanvas(barcodeData, 'student-barcode-display');
      setBarcodeGenerated(true);
    }, 100);
  };

  // Generate barcode for student
  const handleGenerateBarcode = () => {
    if (!selectedStudent) return;
    
    // Generate barcode data
    const barcodeData = selectedStudent.studentId || selectedStudent.barcodeData;
    const barcode = {
      id: barcodeData,
      barcodeData: barcodeData,
      studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
      generatedAt: new Date().toISOString()
    };
    
    // Update student with barcode info
    const updatedStudent = {
      ...selectedStudent,
      studentId: barcode.id,
      barcodeData: barcode.barcodeData,
      barcodeGeneratedAt: barcode.generatedAt
    };
    
    // Update students list
    setStudents(students.map(s => 
      s.studentId === selectedStudent.studentId ? updatedStudent : s
    ));
    
    setSelectedStudent(updatedStudent);
    setBarcodeGenerated(true);
    
    // Generate barcode on canvas
    setTimeout(() => {
      const canvas = document.getElementById('student-barcode-display');
      if (canvas) {
        try {
          JsBarcode('#student-barcode-display', barcode.barcodeData, {
            format: 'CODE128',
            width: 2,
            height: 50,
            displayValue: true,
            fontSize: 12,
            margin: 5,
            background: '#ffffff',
            lineColor: '#000000'
          });
        } catch (error) {
          console.error('Error generating barcode:', error);
        }
      }
    }, 200);
  };

  // Generate ID Card
  const generateIDCard = () => {
    if (!selectedStudent?.barcodeData) {
      alert('Please generate a barcode for this student first!');
      return;
    }
  
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>ID Card - ${selectedStudent.firstName} ${selectedStudent.lastName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background: #f5f5f5;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .id-card-container {
              width: 336px; /* 3.375 in */
              height: 212px; /* 2.125 in */
              background: linear-gradient(135deg, #1a365d 0%, #3da58a 100%);
              border-radius: 10px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              padding: 12px 15px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              color: white;
              position: relative;
            }
            .id-header {
              text-align: center;
              border-bottom: 1px solid rgba(255, 255, 255, 0.3);
              padding-bottom: 4px;
            }
                          .id-header h1 {
                font-size: 13px;
                color: #ffffff;
                margin: 0;
                font-weight: bold;
                letter-spacing: 0.5px;
                text-transform: uppercase;
              }
              .id-header p {
                font-size: 8px;
                margin: 3px 0 0 0;
                color: #e0e0e0;
              }
                          .id-content {
                margin-top: 10px;
                font-size: 11px;
                line-height: 1.6;
              }
              .id-content p {
                margin: 6px 0;
                font-weight: 500;
              }
            .barcode-section {
              background: #ffffff;
              padding: 5px;
              border-radius: 6px;
              display: flex;
              flex-direction: column;
              align-items: center;
              border-top: 1px solid #ddd;
              color: #000;
            }
            .barcode-container svg {
              width: 100%;
              max-height: 40px;
            }
                          .barcode-text {
                font-size: 8px;
                font-family: monospace;
                margin-top: 3px;
                text-align: center;
                color: #333;
                font-weight: bold;
                word-break: break-all;
                line-height: 1.1;
              }
            .id-footer {
              font-size: 9px;
              text-align: right;
              color: #f0f0f0;
              opacity: 0.8;
              margin-top: 5px;
            }
            .print-button {
              position: fixed;
              top: 20px;
              right: 20px;
              background: #3da58a;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 5px;
              cursor: pointer;
              font-weight: bold;
              z-index: 1000;
            }
            .print-button:hover {
              background: #2d8a6f;
            }
            @media print {
              .print-button {
                display: none;
              }
              body {
                background: white;
                padding: 0;
              }
              .id-card-container {
                box-shadow: none;
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <button class="print-button" onclick="window.print()">Print ID Card</button>
          <div class="id-card-container">
            <div class="id-header">
              <h1>TCMS STUDENT ID</h1>
              <p>Tuition Class Management System</p>
            </div>
                          <div class="id-content">
                <p><strong>Name:</strong> ${selectedStudent.firstName} ${selectedStudent.lastName}</p>
                <p><strong>ID No:</strong> ${selectedStudent.studentId}</p>
                <p><strong>Generated On:</strong> ${selectedStudent.barcodeGeneratedAt ? new Date(selectedStudent.barcodeGeneratedAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
              </div>
            <div class="barcode-section">
              <div class="barcode-container">
                <svg id="id-card-barcode"></svg>
              </div>
              
            </div>
            <div class="id-footer">
              <p>Powered by TCMS | Valid for attendance</p>
            </div>
          </div>
  
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            setTimeout(() => {
              try {
                JsBarcode("#id-card-barcode", "${selectedStudent.barcodeData}", {
                  format: "CODE128",
                  width: 1.2,
                  height: 30,
                  displayValue: false,
                  margin: 0,
                  background: "#ffffff",
                  lineColor: "#000000"
                });
              } catch (error) {
                console.error('Error generating barcode:', error);
              }
            }, 200);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  

  // Print barcode
  const printBarcode = () => {
    if (!selectedStudent?.barcodeData) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Student Barcode - ${selectedStudent.firstName} ${selectedStudent.lastName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
            .barcode-container { 
              border: 2px solid #333; 
              padding: 20px; 
              max-width: 400px; 
              margin: 0 auto;
              page-break-inside: avoid;
            }
            .student-info { margin-bottom: 15px; }
            .barcode-image { margin: 15px 0; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            <div class="student-info">
              <h2>${selectedStudent.firstName} ${selectedStudent.lastName}</h2>
              <p><strong>Student ID:</strong> ${selectedStudent.studentId}</p>
              
               <p><strong>Generated On:</strong> ${selectedStudent.barcodeGeneratedAt ? new Date(selectedStudent.barcodeGeneratedAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
            </div>
            <div class="barcode-image">
              <canvas id="print-barcode"></canvas>
            </div>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            JsBarcode("#print-barcode", "${selectedStudent.barcodeData}", {
              format: "CODE128",
              width: 2,
              height: 50,
              displayValue: true,
              fontSize: 12,
              margin: 5,
              background: "#ffffff",
              lineColor: "#000000"
            });
            window.print();
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Stylish alert state
  const [alertBox, setAlertBox] = useState({ open: false, message: '', onConfirm: null, onCancel: null, confirmText: 'OK', cancelText: 'Cancel', type: 'info' });
  const [saveAlert, setSaveAlert] = useState({ open: false, message: '', onConfirm: null, confirmText: 'OK', type: 'success' });

  const openAlert = (message, onConfirm, options = {}) => {
    setAlertBox({
      open: true,
      message,
      onConfirm: onConfirm || (() => setAlertBox(a => ({ ...a, open: false }))),
      onCancel: options.onCancel || (() => setAlertBox(a => ({ ...a, open: false }))),
      confirmText: options.confirmText || 'OK',
      cancelText: options.cancelText || 'Cancel',
      type: options.type || 'info',
    });
  };

  const handleEdit = (student) => {
    setEditingStudent(student.studentId);
    setEditValues({
      ...student,
      enrolledClasses: Array.isArray(student.enrolledClasses)
        ? student.enrolledClasses.map(c => ({ ...c }))
        : [],
    });
    setShowEditModal(true);
  };

  // --- ALERT HANDLERS ---
  // Show delete alert
  const showDeleteAlert = (studentId) => {
    const student = students.find(s => s.studentId === studentId);
    setDeleteModal({
      show: true,
      studentId,
      studentName: student ? `${student.firstName} ${student.lastName}` : studentId
    });
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteModal.studentId) return;
    
    try {
      await deleteStudent(deleteModal.studentId);
      setDeleteModal({ show: false, studentId: null, studentName: '' });
      refreshStudents();
      setSaveAlert({
        open: true,
        message: 'Student deleted successfully!',
        onConfirm: () => setSaveAlert(a => ({ ...a, open: false })),
        confirmText: 'OK',
        type: 'success',
      });
    } catch (error) {
      console.error('Error deleting student:', error);
      setSaveAlert({
        open: true,
        message: 'Failed to delete student: ' + error.message,
        onConfirm: () => setSaveAlert(a => ({ ...a, open: false })),
        confirmText: 'OK',
        type: 'danger',
      });
    }
  };

  // Handle delete cancellation
  const handleDeleteCancel = () => {
    setDeleteModal({ show: false, studentId: null, studentName: '' });
  };

  const showRemoveClassAlert = (remove, idx) => {
    openAlert(
      'Are you sure you want to remove this class from the student?',
      () => {
        setAlertBox(a => ({ ...a, open: false }));
        remove(idx);
      },
      { confirmText: 'Remove', cancelText: 'Cancel', type: 'danger' }
    );
  };

  const handleEditSubmit = async (values) => {
    try {
      // Call backend API to update student
      const result = await updateStudent(values.studentId, {
        firstName: values.firstName,
        lastName: values.lastName,
        nic: values.nic || '',
        gender: values.gender || 'Male',
        age: values.age || '0',
        email: values.email || '',
        mobile: values.phone,
        parentName: values.parentName || '',
        parentMobile: values.parentPhone || '',
        stream: values.stream,
        dateOfBirth: values.dateOfBirth || '1900-01-01',
        school: values.school || '',
        address: values.address || '',
        district: values.district,
      });

      if (result.success) {
    setShowEditModal(false);
    setSaveAlert({
      open: true,
          message: 'Student details updated successfully!',
          onConfirm: () => {
            setSaveAlert(a => ({ ...a, open: false }));
            refreshStudents(); // Refresh data from backend
          },
      confirmText: 'OK',
      type: 'success',
    });
      } else {
        throw new Error(result.message || 'Failed to update student');
      }
    } catch (error) {
      console.error('Error updating student:', error);
      setSaveAlert({
        open: true,
        message: 'Failed to update student: ' + error.message,
        onConfirm: () => setSaveAlert(a => ({ ...a, open: false })),
        confirmText: 'OK',
        type: 'danger',
      });
    }
  };

  const handleCancel = () => {
    setShowEditModal(false);
    setEditValues({});
  };

  // Handle student selection
  const handleStudentSelection = (studentId, isSelected) => {
    if (isSelected) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  // Select all students
  const selectAllStudents = () => {
    setSelectedStudents(sortedStudents.map(student => student.studentId));
  };

  // Deselect all students
  const deselectAllStudents = () => {
    setSelectedStudents([]);
  };

  // Print ID cards for selected students only
  const printSelectedIDCards = () => {
    if (selectedStudents.length === 0) {
      setSaveAlert({
        open: true,
        message: 'Please select students to print ID cards.',
        onConfirm: () => setSaveAlert(a => ({ ...a, open: false })),
        confirmText: 'OK',
        type: 'warning',
      });
      return;
    }

    const selectedStudentData = sortedStudents.filter(student => 
      selectedStudents.includes(student.studentId)
    );

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Selected ID Cards - TCMS</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background: #f5f5f5;
            }
            .id-cards-container {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
              gap: 20px;
              max-width: 1200px;
              margin: 0 auto;
            }
            .id-card-container {
              width: 336px;
              height: 212px;
              background: linear-gradient(135deg, #1a365d 0%, #3da58a 100%);
              border-radius: 10px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              padding: 12px 15px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              color: white;
              position: relative;
              page-break-inside: avoid;
            }
            .id-header {
              text-align: center;
              border-bottom: 1px solid rgba(255, 255, 255, 0.3);
              padding-bottom: 4px;
            }
            .id-header h1 {
              font-size: 13px;
              color: #ffffff;
              margin: 0;
              font-weight: bold;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .id-header p {
              font-size: 8px;
              margin: 3px 0 0 0;
              color: #e0e0e0;
            }
            .id-content {
              margin-top: 10px;
              font-size: 11px;
              line-height: 1.6;
            }
            .id-content p {
              margin: 6px 0;
              font-weight: 500;
            }
            .barcode-section {
              background: #ffffff;
              padding: 5px;
              border-radius: 6px;
              display: flex;
              flex-direction: column;
              align-items: center;
              border-top: 1px solid #ddd;
              color: #000;
            }
            .barcode-container svg {
              width: 100%;
              max-height: 40px;
            }
            .barcode-text {
              font-size: 8px;
              font-family: monospace;
              margin-top: 3px;
              text-align: center;
              color: #333;
              font-weight: bold;
              word-break: break-all;
              line-height: 1.1;
            }
            .id-footer {
              font-size: 9px;
              text-align: right;
              color: #f0f0f0;
              opacity: 0.8;
              margin-top: 5px;
            }
            .print-button {
              position: fixed;
              top: 20px;
              right: 20px;
              background: #3da58a;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 5px;
              cursor: pointer;
              font-weight: bold;
              z-index: 1000;
            }
            .print-button:hover {
              background: #2d8a6f;
            }
            .bulk-header {
              text-align: center;
              margin-bottom: 20px;
              padding: 20px;
              background: white;
              border-radius: 10px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .bulk-header h1 {
              color: #1a365d;
              margin: 0 0 10px 0;
              font-size: 24px;
            }
            .bulk-header p {
              color: #666;
              margin: 0;
              font-size: 14px;
            }
            .selection-info {
              background: #fff3e0;
              border: 1px solid #ff9800;
              border-radius: 5px;
              padding: 10px;
              margin-bottom: 20px;
              text-align: center;
            }
            .selection-info h3 {
              color: #e65100;
              margin: 0 0 5px 0;
              font-size: 16px;
            }
            .selection-info p {
              color: #424242;
              margin: 0;
              font-size: 12px;
            }
            @media print {
              .print-button {
                display: none;
              }
              body {
                background: white;
                padding: 0;
              }
              .id-card-container {
                box-shadow: none;
                margin: 0;
              }
              .bulk-header, .selection-info {
                box-shadow: none;
                border: 1px solid #ddd;
              }
            }
          </style>
        </head>
        <body>
          <button class="print-button" onclick="window.print()">Print Selected ID Cards</button>
          
          <div class="bulk-header">
            <h1>TCMS Student ID Cards</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>Selected Students: ${selectedStudentData.length} of ${students.length} total</p>
          </div>

          <div class="selection-info">
            <h3>Selection Information</h3>
            <p>Selected Student IDs: ${selectedStudentData.map(s => s.studentId).join(', ')}</p>
          </div>
          
          <div class="id-cards-container">
            ${selectedStudentData.map((student, index) => `
              <div class="id-card-container">
                <div class="id-header">
                  <h1>TCMS STUDENT ID</h1>
                  <p>Tuition Class Management System</p>
                </div>
                <div class="id-content">
                  <p><strong>Name:</strong> ${student.firstName} ${student.lastName}</p>
                  <p><strong>ID No:</strong> ${student.studentId}</p>
                  <p><strong>Stream:</strong> ${student.stream || 'Not Specified'}</p>
                  <p><strong>Registered On:</strong> ${student.dateJoined || new Date().toLocaleDateString()}</p>
                </div>
                <div class="barcode-section">
                  <div class="barcode-container">
                    <svg id="barcode-${index}"></svg>
                  </div>
                  <div class="barcode-text">${student.studentId}</div>
                </div>
                <div class="id-footer">
                  <p>Powered by TCMS | Valid for attendance</p>
                </div>
              </div>
            `).join('')}
          </div>

          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            setTimeout(() => {
              ${selectedStudentData.map((student, index) => `
                try {
                  JsBarcode("#barcode-${index}", "${student.studentId}", {
                    format: "CODE128",
                    width: 1.2,
                    height: 30,
                    displayValue: false,
                    margin: 0,
                    background: "#ffffff",
                    lineColor: "#000000"
                  });
                } catch (error) {
                  console.error('Error generating barcode for ${student.studentId}:', error);
                }
              `).join('')}
            }, 200);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    // <DashboardLayout userRole="Administrator" sidebarItems={adminSidebarSections}>
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">Student Enrollment</h1>
            <p className="text-gray-700">
              {loading ? 'Loading students from database...' : `View, edit and remove registered students. (${sortedStudents.length} of ${students.length} students)`}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={printFilteredIDCards}
              disabled={loading || sortedStudents.length === 0}
              className={`px-4 py-2 text-white rounded transition-colors flex items-center gap-2 ${
                loading || sortedStudents.length === 0
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <FaIdCard />
              Print Filtered ID Cards
            </button>
            <button
              onClick={printSelectedIDCards}
              disabled={loading || selectedStudents.length === 0}
              className={`px-4 py-2 text-white rounded transition-colors flex items-center gap-2 ${
                loading || selectedStudents.length === 0
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <FaIdCard />
              Print Selected ID Cards ({selectedStudents.length})
            </button>
            <button
              onClick={exportToCSV}
              disabled={loading || sortedStudents.length === 0}
              className={`px-4 py-2 text-white rounded transition-colors flex items-center gap-2 ${
                loading || sortedStudents.length === 0
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              <FaFileExport />
              Export CSV
            </button>
            <button
              onClick={refreshStudents}
              disabled={loading}
              className={`px-4 py-2 text-white rounded transition-colors flex items-center gap-2 ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <FaSync className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading...' : 'Refresh Data'}
            </button>
            
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <FaUser className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Online</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.online}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <FaUser className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Physical</p>
                <p className="text-2xl font-bold text-green-600">{statistics.physical}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <FaUser className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filter Section */}
        <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Filters & Search</h3>
            <button
              onClick={() => {
                setRegistrationFilter('all');
                setSearchTerm('');
                setStreamFilter('all');
                setSortConfig({ key: 'dateJoined', direction: 'desc' });
              }}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Registration Type Filter */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Registration Type</label>
              <select
                value={registrationFilter}
                onChange={(e) => setRegistrationFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Registrations</option>
                <option value="online">Online Registrations</option>
                <option value="physical">Physical Registrations</option>
              </select>
        </div>
            
            {/* Stream Filter */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Stream</label>
              <select
                value={streamFilter}
                onChange={(e) => setStreamFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Streams</option>
                <option value="A/L-Maths">A/L-Maths</option>
                <option value="A/L-Science">A/L-Science</option>
                <option value="A/L-Art">A/L-Art</option>
                <option value="A/L-Technology">A/L-Technology</option>
                <option value="A/L-Commerce">A/L-Commerce</option>
                <option value="O/L">O/L</option>
                <option value="Primary">Primary</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            {/* Search */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search by name, ID, or school..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRangeFilter.startDate}
                onChange={(e) => setDateRangeFilter(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRangeFilter.endDate}
                onChange={(e) => setDateRangeFilter(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <div>
              Showing <span className="font-semibold">{sortedStudents.length}</span> of <span className="font-semibold">{students.length}</span> students
            </div>
            <div className="flex items-center gap-4">
              {/* Selection Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllStudents}
                  disabled={sortedStudents.length === 0}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    sortedStudents.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllStudents}
                  disabled={selectedStudents.length === 0}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedStudents.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  Deselect All
                </button>
                {selectedStudents.length > 0 && (
                  <span className="text-xs font-medium text-indigo-600">
                    {selectedStudents.length} selected
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <span>Sort by:</span>
                <span className="font-medium">{sortConfig.key === 'dateJoined' ? 'Date Joined' : 
                  sortConfig.key === 'firstName' ? 'First Name' :
                  sortConfig.key === 'lastName' ? 'Last Name' :
                  sortConfig.key === 'school' ? 'School' :
                  sortConfig.key === 'stream' ? 'Stream' :
                  sortConfig.key === 'dateOfBirth' ? 'Date of Birth' :
                  sortConfig.key}</span>
                <span className="text-gray-400">({sortConfig.direction === 'asc' ? 'A-Z' : 'Z-A'})</span>
              </div>

              {/* Date Range Info */}
              {(dateRangeFilter.startDate || dateRangeFilter.endDate) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Date Range:</span>
                  <span className="text-xs font-medium text-gray-700">
                    {dateRangeFilter.startDate ? new Date(dateRangeFilter.startDate).toLocaleDateString() : 'Any'} 
                    {' → '} 
                    {dateRangeFilter.endDate ? new Date(dateRangeFilter.endDate).toLocaleDateString() : 'Any'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <BasicTable
          columns={[
            { 
              key: 'select', 
              label: '',
              render: row => (
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(row.studentId)}
                  onChange={(e) => handleStudentSelection(row.studentId, e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
              )
            },
            { 
              key: 'studentId', 
              label: 'Student ID',
              sortable: true,
              render: row => (
                <span className="font-mono text-sm font-semibold text-gray-800">
                  {row.studentId}
                </span>
              )
            },
            { 
              key: 'firstName', 
              label: 'First Name',
              sortable: true,
              render: row => (
                <span className="font-medium text-gray-900">
                  {row.firstName || '-'}
                </span>
              )
            },
            { 
              key: 'lastName', 
              label: 'Last Name',
              sortable: true,
              render: row => (
                <span className="font-medium text-gray-900">
                  {row.lastName || '-'}
                </span>
              )
            },
            { 
              key: 'dateOfBirth', 
              label: 'Date of Birth',
              sortable: true,
              render: row => (
                <span className="text-sm text-gray-600">
                  {row.dateOfBirth ? new Date(row.dateOfBirth).toLocaleDateString('en-GB') : '-'}
                </span>
              )
            },
            { 
              key: 'school', 
              label: 'School',
              sortable: true,
              render: row => (
                <span className="text-sm text-gray-700 max-w-xs truncate" title={row.school}>
                  {row.school || '-'}
                </span>
              )
            },
            { 
              key: 'district', 
              label: 'District',
              sortable: true,
              render: row => (
                <span className="text-sm text-gray-600">
                  {row.district || '-'}
                </span>
              )
            },
            { 
              key: 'dateJoined', 
              label: 'Date Joined',
              sortable: true,
              render: row => (
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">
                    {row.dateJoined ? new Date(row.dateJoined).toLocaleDateString('en-GB') : '-'}
                  </span>
                  {row.created_at && (
                    <span className="text-xs text-gray-500">
                      {new Date(row.created_at).toLocaleTimeString('en-GB', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  )}
                </div>
              )
            },
            { 
              key: 'stream', 
              label: 'Stream',
              sortable: true,
              render: row => (
                <span className="text-sm text-gray-700">
                  {row.stream || '-'}
                </span>
              )
            },
            { 
              key: 'registrationType', 
              label: 'Registration Type',
              sortable: true,
              render: row => (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  row.registrationType === 'Online' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    row.registrationType === 'Online' ? 'bg-blue-500' : 'bg-green-500'
                  }`}></div>
                  {row.registrationType || 'Unknown'}
                </span>
              )
            },
            { 
              key: 'barcode', 
              label: 'Barcode Status', 
              sortable: true,
              render: row => (
                <div className="flex items-center gap-2">
                  {row.barcodeData ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></div>
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1.5"></div>
                      Pending
                    </span>
                  )}
                </div>
              )
            },
          ]}
          data={loading ? [] : sortedStudents}
          onSort={handleSort}
          sortConfig={sortConfig}
          actions={row => (
            <div className="flex items-center gap-1">
              
              {/* Barcode Button */}
              <button 
                className="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors" 
                onClick={() => showBarcode(row)} 
                title="Manage Barcode"
              >
                <FaBarcode className="w-4 h-4" />
              </button>
              
              {/* Edit Button */}
              <button 
                className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors" 
                onClick={() => handleEdit(row)} 
                title="Edit Student"
              >
                <FaEdit className="w-4 h-4" />
              </button>
              
              {/* Delete Button */}
              <button 
                className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" 
                onClick={() => showDeleteAlert(row.studentId)} 
                title="Delete Student"
              >
                <FaTrash className="w-4 h-4" />
              </button>
            </div>
          )}
          className="mb-6"
          loading={loading}
          emptyMessage={loading ? "Loading students from database..." : "No students found matching your filters."}
        />

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-2xl p-0 w-full max-w-5xl max-h-[96vh] flex flex-col pointer-events-auto ml-64">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-xl font-bold">Edit Student</h2>
                <button
                  className="text-gray-500 hover:text-gray-800 text-2xl focus:outline-none"
                  onClick={handleCancel}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-4 flex-1">
                <BasicForm
                  initialValues={editValues}
                  validationSchema={validationSchema}
                  onSubmit={handleEditSubmit}
                >
                  {(formikProps) => {
                    const { values, handleChange, errors, touched, setFieldValue } = formikProps;
                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <CustomTextField
                            id="dateJoined"
                            name="dateJoined"
                            type="date"
                            label="Joined Date *"
                            value={values.dateJoined || ''}
                            onChange={handleChange}
                            error={errors.dateJoined}
                            touched={touched.dateJoined}
                            icon={FaCalendar}
                          />
                          <CustomTextField
                            id="studentId"
                            name="studentId"
                            type="text"
                            label="Student ID *"
                            value={values.studentId}
                            onChange={handleChange}
                            error={errors.studentId}
                            touched={touched.studentId}
                            disabled
                            icon={FaIdCard}
                          />
                          <CustomTextField
                            id="nic"
                            name="nic"
                            type="text"
                            label="NIC (optional)"
                            value={values.nic || ''}
                            onChange={e => {
                              const { setFieldValue, handleChange } = formikProps;
                              handleChange(e);
                              const val = e.target.value;
                              const parsed = parseNIC(val);
                              if (parsed && typeof setFieldValue === 'function') {
                                setFieldValue('dateOfBirth', parsed.dob);
                                setFieldValue('age', parsed.age);
                                setFieldValue('gender', parsed.gender);
                              }
                            }}
                            error={errors.nic}
                            touched={touched.nic}
                            icon={FaIdCard}
                          />
                          <CustomTextField
                            id="firstName"
                            name="firstName"
                            type="text"
                            label="First Name *"
                            value={values.firstName || ''}
                            onChange={handleChange}
                            error={errors.firstName}
                            touched={touched.firstName}
                            icon={FaUser}
                          />
                          <CustomTextField
                            id="lastName"
                            name="lastName"
                            type="text"
                            label="Last Name *"
                            value={values.lastName || ''}
                            onChange={handleChange}
                            error={errors.lastName}
                            touched={touched.lastName}
                            icon={FaUser}
                          />
                          <CustomTextField
                            id="dateOfBirth"
                            name="dateOfBirth"
                            type="date"
                            label="Date of Birth *"
                            value={values.dateOfBirth}
                            onChange={handleChange}
                            error={errors.dateOfBirth}
                            touched={touched.dateOfBirth}
                            icon={FaCalendar}
                          />
                          <CustomTextField
                            id="age"
                            name="age"
                            type="number"
                            label="Age"
                            value={values.age || ''}
                            onChange={handleChange}
                            error={errors.age}
                            touched={touched.age}
                            icon={FaCalendar}
                            disabled
                          />
                          <CustomSelectField
                            id="gender"
                            name="gender"
                            label="Gender"
                            value={values.gender}
                            onChange={handleChange}
                            options={[
                              { value: '', label: 'Select Gender' },
                              ...genderOptions.map(s => ({ value: s, label: s }))
                            ]}
                            error={errors.gender}
                            touched={touched.gender}
                            required
                            icon={FaBook}
                          />
                          <CustomTextField
                            id="email"
                            name="email"
                            type="email"
                            label="Email (optional)"
                            value={values.email}
                            onChange={handleChange}
                            error={errors.email}
                            touched={touched.email}
                            icon={FaEnvelope}
                          />
                          <CustomTextField
                            id="school"
                            name="school"
                            type="text"
                            label="School"
                            value={values.school}
                            onChange={handleChange}
                            error={errors.school}
                            touched={touched.school}
                            icon={FaBook}
                          />
                          <CustomTextField
                            id="address"
                            name="address"
                            type="text"
                            label="Address"
                            value={values.address || ''}
                            onChange={handleChange}
                            error={errors.address}
                            touched={touched.address}
                            icon={FaBook}
                          />
                          <CustomTextField
                            id="district"
                            name="district"
                            type="text"
                            label="District *"
                            value={values.district}
                            onChange={handleChange}
                            error={errors.district}
                            touched={touched.district}
                            icon={FaBook}
                          />
                          
                          <CustomTextField
                            id="phone"
                            name="phone"
                            type="text"
                            label="Mobile"
                            value={values.phone}
                            onChange={handleChange}
                            error={errors.phone}
                            touched={touched.phone}
                            icon={FaPhone}
                          />
                          <CustomSelectField
                            id="stream"
                            name="stream"
                            label="Stream"
                            value={values.stream}
                            onChange={handleChange}
                            options={[
                              { value: '', label: 'Select Stream' },
                              ...streamOptions.map(s => ({ value: s, label: s }))
                            ]}
                            error={errors.stream}
                            touched={touched.stream}
                            required
                            icon={FaBook}
                          />
                          <CustomTextField
                            id="parentName"
                            name="parentName"
                            type="text"
                            label="Parent Name"
                            value={values.parentName || ''}
                            onChange={handleChange}
                            error={errors.parentName}
                            touched={touched.parentName}
                            icon={FaUser}
                          />
                          <CustomTextField
                            id="parentPhone"
                            name="parentPhone"
                            type="text"
                            label="Parent Mobile Number"
                            value={values.parentPhone || ''}
                            onChange={handleChange}
                            error={errors.parentPhone}
                            touched={touched.parentPhone}
                            icon={FaPhone}
                          />

                        </div>

                        

                        <div className="flex flex-row gap-4 mt-8 mb-2">
                          <CustomButton
                            type="button"
                            onClick={handleCancel}
                            className="w-1/2 py-3 px-4 bg-gray-200 text-gray-700 text-base font-bold rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 shadow-md hover:shadow-xl"
                          >
                            Cancel
                          </CustomButton>
                          <CustomButton
                            type="submit"
                            className="w-1/2 py-3 px-4 bg-[#1a365d] text-white text-base font-bold rounded-lg hover:bg-[#13294b] active:bg-[#0f2038] focus:outline-none focus:ring-2 focus:ring-[#1a365d] focus:ring-opacity-50 shadow-md hover:shadow-xl"
                          >
                            Save
                          </CustomButton>
                        </div>
                      </>
                    );
                  }}
                </BasicForm>
              </div>
            </div>
          </div>
        )}

        {/* Alert Boxes */}
        <BasicAlertBox
          open={alertBox.open}
          message={alertBox.message}
          onConfirm={alertBox.onConfirm}
          onCancel={alertBox.onCancel}
          confirmText={alertBox.confirmText}
          cancelText={alertBox.cancelText}
          type={alertBox.type}
        />

        <BasicAlertBox
          open={saveAlert.open}
          message={saveAlert.message}
          onConfirm={saveAlert.onConfirm}
          confirmText={saveAlert.confirmText}
          type={saveAlert.type}
        />

        {/* Modern Barcode Modal */}
        {showBarcodeModal && selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-[#1a365d] flex items-center gap-3">
                  <FaBarcode className="text-[#3da58a] text-2xl" />
                  Student Barcode Management
                </h3>
                <button
                  onClick={() => setShowBarcodeModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Student Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-lg text-[#1a365d] mb-3 flex items-center gap-2">
                    <FaUser className="text-[#3da58a]" />
                    Student Information
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Name:</span>
                      <span className="text-[#1a365d]">{selectedStudent.firstName} {selectedStudent.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Student ID:</span>
                      <span className="text-[#1a365d]">{selectedStudent.studentId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">School:</span>
                      <span className="text-[#1a365d]">{selectedStudent.school}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Stream:</span>
                      <span className="text-[#1a365d]">{selectedStudent.stream}</span>
                    </div>
                    {selectedStudent.barcodeGeneratedAt && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Barcode Generated:</span>
                        <span className="text-[#1a365d]">{new Date(selectedStudent.barcodeGeneratedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Barcode Status */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-lg text-[#1a365d] mb-3 flex items-center gap-2">
                    <FaBarcode className="text-[#3da58a]" />
                    Barcode Status
                  </h4>
                  <div className="space-y-3">
                    {selectedStudent.barcodeData ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                          <div className="flex items-center gap-3 text-emerald-800">
                    <span className="font-semibold text-xs">Barcode Active</span>
                  </div>
                        <p className="text-xs text-emerald-700 mt-2">
                          This student has an active barcode for attendance tracking.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 text-amber-800">
                          <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                          <span className="font-semibold text-lg">Barcode Pending</span>
                        </div>
                        <p className="text-sm text-amber-700 mt-2">
                          Generate a barcode for this student to enable attendance tracking.
                        </p>
                      </div>
                    )}
                    
                    {!selectedStudent.barcodeData && (
                      <CustomButton2
                        onClick={handleGenerateBarcode}
                        className="flex items-center justify-center gap-2"
                      >
                        <FaBarcode />
                        Generate Barcode
                      </CustomButton2>
                    )}
                  </div>
                </div>
              </div>

              {/* Barcode Display */}
              {selectedStudent.barcodeData && (
                <div className="bg-white border-2 border-gray-200 rounded-lg p-6 text-center">
                  <h4 className="font-semibold text-lg text-[#1a365d] mb-4 flex items-center justify-center gap-2">
                    <FaBarcode className="text-[#3da58a]" />
                    Attendance Barcode
                  </h4>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 min-h-[80px] flex items-center justify-center">
                    <canvas 
                      id="student-barcode-display" 
                      className="mx-auto"
                      style={{ minHeight: '60px' }}
                    ></canvas>
                  </div>
                  

                  
                  <div className="flex gap-3 justify-center">
                    <CustomButton2
                      onClick={() => downloadBarcode(selectedStudent)}
                      className="flex items-center justify-center gap-2 text-center"
                    >
                      <FaDownload />
                      Download PNG
                    </CustomButton2>
                    <CustomButton2
                      onClick={printBarcode}
                      className="flex items-center justify-center gap-2 text-center"
                    >
                      <FaPrint />
                      Print Barcode
                    </CustomButton2>
                    <CustomButton2
                      onClick={generateIDCard}
                      className="flex items-center justify-center gap-2 text-center"
                    >
                      <FaIdCard />
                      Generate ID Card
                    </CustomButton2>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <FaEye className="text-blue-600" />
                  How to Use
                </h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Download or print the barcode for physical attendance tracking</li>
                  <li>• Use the barcode scanner in the Attendance Overview to mark attendance</li>
                  <li>• Each barcode is unique to the student and cannot be duplicated</li>
                  <li>• Barcode contains the student's unique ID for secure tracking</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-red-600">Confirm Deletion</h2>
                <button
                  className="text-gray-500 hover:text-gray-800 text-2xl focus:outline-none"
                  onClick={handleDeleteCancel}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-2">
                  Are you sure you want to delete this student?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-800">
                    Student ID: <span className="font-mono">{deleteModal.studentId}</span>
                  </p>
                  <p className="text-sm text-red-700">
                    Name: {deleteModal.studentName}
                  </p>
                </div>
                <p className="text-sm text-red-600 mt-3">
                  ⚠️ This action cannot be undone. All student data will be permanently deleted.
                </p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Delete Student
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    /* </DashboardLayout> */
  );
};

export default StudentEnrollment;

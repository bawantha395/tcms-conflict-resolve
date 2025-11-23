// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import DashboardLayout from '../../../components/layout/DashboardLayout';
// import teacherSidebarSections from './TeacherDashboardSidebar';
// import BasicTable from '../../../components/BasicTable';
// import CustomButton from '../../../components/CustomButton';
// import { FaUsers, FaCalendar, FaClock, FaCheckCircle, FaTimesCircle, FaChartBar, FaArrowLeft } from 'react-icons/fa';
// import { getClassById } from '../../../api/classes';
// import { getUserData } from '../../../api/apiUtils';

// const TeacherClassAttendanceDetail = () => {
//   const { classId } = useParams();
//   const navigate = useNavigate();
//   const [classDetails, setClassDetails] = useState(null);
//   const [attendanceRecords, setAttendanceRecords] = useState([]);
//   const [enrolledStudents, setEnrolledStudents] = useState([]);
//   const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // Get current teacher data
//   const currentTeacher = getUserData();

//   useEffect(() => {
//     loadClassData();
//   }, [classId, selectedDate]);

//   const loadClassData = async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       if (!currentTeacher || !(currentTeacher.teacherId || currentTeacher.id || currentTeacher.userid)) {
//         setError('Teacher information not found');
//         setLoading(false);
//         return;
//       }

//       // Load class details
//       const classResponse = await getClassById(classId);
      
//       if (classResponse.success && classResponse.data) {
//         const classData = classResponse.data;
        
//         // Verify this class belongs to the current teacher
//         const teacherId = currentTeacher.teacherId || currentTeacher.id || currentTeacher.userid;
//         if (classData.teacherId !== teacherId) {
//           setError('You do not have access to this class');
//           setLoading(false);
//           return;
//         }
        
//         setClassDetails(classData);
//       } else {
//         setError('Class not found');
//         setLoading(false);
//         return;
//       }

//       // For now, we'll use placeholder data for enrollments and attendance
//       // In a real implementation, you'd fetch actual data from the backend
//       const mockEnrollments = [
//         { studentId: 'STUDENT_001', studentName: 'John Doe' },
//         { studentId: 'STUDENT_002', studentName: 'Jane Smith' },
//         { studentId: 'STUDENT_003', studentName: 'Bob Johnson' },
//       ];
      
//       const mockAttendanceRecords = [
//         {
//           id: 1,
//           studentId: 'STUDENT_001',
//           studentName: 'John Doe',
//           date: selectedDate,
//           time: new Date().toISOString(),
//           status: 'present',
//           method: 'manual'
//         },
//         {
//           id: 2,
//           studentId: 'STUDENT_002',
//           studentName: 'Jane Smith',
//           date: selectedDate,
//           time: new Date().toISOString(),
//           status: 'absent',
//           method: 'manual'
//         }
//       ];

//       setEnrolledStudents(mockEnrollments);
//       setAttendanceRecords(mockAttendanceRecords);

//     } catch (err) {
//       console.error('Error loading class data:', err);
//       setError('Failed to load class data');
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading) {
//     return (
//       <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
//         <div className="p-6 bg-white rounded-lg shadow">
//           <div className="text-center">Loading...</div>
//         </div>
//       </DashboardLayout>
//     );
//   }

//   if (error) {
//     return (
//       <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
//         <div className="p-6 bg-white rounded-lg shadow">
//           <div className="text-center text-red-600">{error}</div>
//         </div>
//       </DashboardLayout>
//     );
//   }

//   if (!classDetails) {
//     return (
//       <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
//         <div className="p-6 bg-white rounded-lg shadow">
//           <div className="text-center text-red-600">Class not found</div>
//         </div>
//       </DashboardLayout>
//     );
//   }

//   // Calculate attendance statistics
//   const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
//   const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
//   const totalEnrolled = enrolledStudents.length > 0 ? enrolledStudents.length : attendanceRecords.length;
//   const attendanceRate = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;

//   // Create student attendance data for table
//   let studentAttendanceData = [];
  
//   if (enrolledStudents.length > 0) {
//     // If we have enrolled students, show them with their attendance
//     studentAttendanceData = enrolledStudents.map(student => {
//       const attendanceRecord = attendanceRecords.find(r => r.studentId === student.studentId);
//       return {
//         ...student,
//         attendanceStatus: attendanceRecord?.status || 'not_marked',
//         attendanceTime: attendanceRecord?.time || null,
//         attendanceMethod: attendanceRecord?.method || null
//       };
//     });
//   } else {
//     // If no enrolled students, show attendance records directly
//     studentAttendanceData = attendanceRecords.map(record => ({
//       studentId: record.studentId,
//       studentName: record.studentName,
//       attendanceStatus: record.status,
//       attendanceTime: record.time,
//       attendanceMethod: record.method
//     }));
//   }

//   return (
//     <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
//       <div className="p-6 bg-white rounded-lg shadow">
//         {/* Header */}
//         <div className="flex items-center justify-between mb-6">
//           <div className="flex items-center gap-4">
//             <CustomButton
//               onClick={() => navigate('/teacher/attendance')}
//               className="p-2 bg-gray-600 text-white rounded hover:bg-gray-700"
//             >
//               <FaArrowLeft />
//             </CustomButton>
//             <div>
//               <h1 className="text-2xl font-bold">{classDetails.className}</h1>
//               <p className="text-gray-600">{classDetails.subject} • {classDetails.teacher}</p>
//             </div>
//           </div>
//         </div>

//         {/* Class Info */}
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
//           <div className="bg-blue-50 p-4 rounded-lg">
//             <div className="flex items-center gap-2">
//               <FaUsers className="text-blue-600" />
//               <span className="font-semibold">Total Students</span>
//             </div>
//             <div className="text-2xl font-bold text-blue-600">{totalEnrolled}</div>
//           </div>
          
//           <div className="bg-green-50 p-4 rounded-lg">
//             <div className="flex items-center gap-2">
//               <FaCheckCircle className="text-green-600" />
//               <span className="font-semibold">Present</span>
//             </div>
//             <div className="text-2xl font-bold text-green-600">{presentCount}</div>
//           </div>
          
//           <div className="bg-red-50 p-4 rounded-lg">
//             <div className="flex items-center gap-2">
//               <FaTimesCircle className="text-red-600" />
//               <span className="font-semibold">Absent</span>
//             </div>
//             <div className="text-2xl font-bold text-red-600">{absentCount}</div>
//           </div>
          
//           <div className="bg-purple-50 p-4 rounded-lg">
//             <div className="flex items-center gap-2">
//               <FaChartBar className="text-purple-600" />
//               <span className="font-semibold">Attendance Rate</span>
//             </div>
//             <div className="text-2xl font-bold text-purple-600">{attendanceRate}%</div>
//           </div>
//         </div>

//         {/* Date Filter */}
//         <div className="flex items-center gap-4 mb-6">
//           <div className="flex items-center gap-2">
//             <label className="font-semibold">Date:</label>
//             <input
//               type="date"
//               value={selectedDate}
//               onChange={(e) => setSelectedDate(e.target.value)}
//               className="border rounded px-3 py-2"
//             />
//           </div>
//         </div>

//         {/* Student Attendance Table */}
//         <BasicTable
//           columns={[
//             { key: 'studentName', label: 'Student Name' },
//             { key: 'studentId', label: 'Student ID' },
//             { key: 'attendanceStatus', label: 'Status', render: row => {
//                 const status = row.attendanceStatus;
//                 if (status === 'present') return <span className="px-2 py-1 rounded bg-green-100 text-green-800 font-semibold">Present</span>;
//                 if (status === 'absent') return <span className="px-2 py-1 rounded bg-red-100 text-red-800 font-semibold">Absent</span>;
//                 return <span className="px-2 py-1 rounded bg-gray-100 text-gray-800 font-semibold">Not Marked</span>;
//               } },
//             { key: 'attendanceTime', label: 'Time', render: row => 
//                 row.attendanceTime ? new Date(row.attendanceTime).toLocaleTimeString() : '-'
//               },
//             { key: 'attendanceMethod', label: 'Method', render: row => {
//                 const method = row.attendanceMethod;
//                 if (method === 'barcode') return <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-sm">Barcode</span>;
//                 if (method === 'manual') return <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-sm">Manual</span>;
//                 if (method === 'bulk') return <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 text-sm">Bulk</span>;
//                 return '-';
//               } },
//           ]}
//           data={studentAttendanceData}
//         />

//         {studentAttendanceData.length === 0 && (
//           <div className="text-center py-8 text-gray-500">
//             No attendance records found for the selected date.
//           </div>
//         )}
//       </div>
//     </DashboardLayout>
//   );
// };

// export default TeacherClassAttendanceDetail; 
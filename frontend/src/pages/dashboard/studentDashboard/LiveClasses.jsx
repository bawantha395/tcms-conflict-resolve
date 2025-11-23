// import React, { useState, useEffect } from 'react';
// import DashboardLayout from '../../../components/layout/DashboardLayout';
// import studentSidebarSections from './StudentDashboardSidebar';
// import BasicCard from '../../../components/BasicCard';
// import CustomButton from '../../../components/CustomButton';
// import { FaVideo, FaMapMarkerAlt, FaClock, FaUsers, FaCalendar, FaPlay, FaPause, FaEye, FaDownload, FaQrcode, FaBarcode, FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';

// const LiveClasses = () => {
//   const [selectedFilter, setSelectedFilter] = useState('all');
//   const [searchTerm, setSearchTerm] = useState('');
//   const [currentTime, setCurrentTime] = useState(new Date());

//   // Update current time every minute
//   useEffect(() => {
//     const timer = setInterval(() => {
//       setCurrentTime(new Date());
//     }, 60000);
//     return () => clearInterval(timer);
//   }, []);

//   // Dummy data for live classes
//   const liveClasses = [
//     {
//       id: 1,
//       title: 'Advanced Level Physics - Theory',
//       teacher: 'Mr. Perera',
//       subject: 'Physics',
//       type: 'online', // online, physical, hybrid
//       status: 'live', // upcoming, live, completed, cancelled
//       startTime: '14:00',
//       endTime: '16:00',
//       date: '2024-01-15',
//       zoomLink: 'https://zoom.us/j/123456789',
//       meetingId: '123-456-789',
//       password: 'Physics2024',
//       location: null,
//       roomNumber: null,
//       maxStudents: 50,
//       currentStudents: 32,
//       recordingUrl: 'https://drive.google.com/file/d/abc123',
//       attendance: 'present', // present, absent, late, not-marked
//       description: 'Advanced level physics theory covering mechanics and thermodynamics.',
//       tags: ['A/L', 'Theory', 'Core Subject'],
//       image: '/assets/nfts/Nft1.png'
//     },
//     {
//       id: 2,
//       title: 'Chemistry Practical Session',
//       teacher: 'Ms. Silva',
//       subject: 'Chemistry',
//       type: 'physical',
//       status: 'upcoming',
//       startTime: '09:00',
//       endTime: '11:00',
//       date: '2024-01-16',
//       zoomLink: null,
//       meetingId: null,
//       password: null,
//       location: 'Main Campus - Building A',
//       roomNumber: 'Lab 3',
//       maxStudents: 25,
//       currentStudents: 18,
//       recordingUrl: null,
//       attendance: 'not-marked',
//       description: 'Hands-on chemistry practical session in the laboratory.',
//       tags: ['A/L', 'Practical', 'Lab Session'],
//       image: '/assets/nfts/Nft2.png'
//     },
//     {
//       id: 3,
//       title: 'Mathematics Revision Class',
//       teacher: 'Mr. Fernando',
//       subject: 'Mathematics',
//       type: 'hybrid',
//       status: 'live',
//       startTime: '10:00',
//       endTime: '12:00',
//       date: '2024-01-15',
//       zoomLink: 'https://zoom.us/j/987654321',
//       meetingId: '987-654-321',
//       password: 'Math2024',
//       location: 'Main Campus - Building B',
//       roomNumber: 'Room 205',
//       maxStudents: 40,
//       currentStudents: 35,
//       recordingUrl: 'https://drive.google.com/file/d/xyz789',
//       attendance: 'present',
//       description: 'Comprehensive mathematics revision for final exams.',
//       tags: ['A/L', 'Revision', 'Exam Prep'],
//       image: '/assets/nfts/Nft3.png'
//     },
//     {
//       id: 4,
//       title: 'Biology Theory - Cell Biology',
//       teacher: 'Ms. Jayasinghe',
//       subject: 'Biology',
//       type: 'online',
//       status: 'completed',
//       startTime: '08:00',
//       endTime: '10:00',
//       date: '2024-01-14',
//       zoomLink: 'https://zoom.us/j/456789123',
//       meetingId: '456-789-123',
//       password: 'Bio2024',
//       location: null,
//       roomNumber: null,
//       maxStudents: 45,
//       currentStudents: 38,
//       recordingUrl: 'https://drive.google.com/file/d/def456',
//       attendance: 'present',
//       description: 'In-depth study of cell biology and molecular processes.',
//       tags: ['A/L', 'Theory', 'Core Subject'],
//       image: '/assets/nfts/Nft4.png'
//     },
//     {
//       id: 5,
//       title: 'English Literature Discussion',
//       teacher: 'Mr. Wijesinghe',
//       subject: 'English',
//       type: 'physical',
//       status: 'upcoming',
//       startTime: '15:00',
//       endTime: '17:00',
//       date: '2024-01-17',
//       zoomLink: null,
//       meetingId: null,
//       password: null,
//       location: 'Main Campus - Building C',
//       roomNumber: 'Room 301',
//       maxStudents: 30,
//       currentStudents: 22,
//       recordingUrl: null,
//       attendance: 'not-marked',
//       description: 'Interactive discussion on English literature texts.',
//       tags: ['A/L', 'Discussion', 'Literature'],
//       image: '/assets/nfts/Nft5.png'
//     },
//     {
//       id: 6,
//       title: 'ICT Programming Workshop',
//       teacher: 'Ms. Rajapakse',
//       subject: 'ICT',
//       type: 'hybrid',
//       status: 'cancelled',
//       startTime: '13:00',
//       endTime: '15:00',
//       date: '2024-01-15',
//       zoomLink: 'https://zoom.us/j/789123456',
//       meetingId: '789-123-456',
//       password: 'ICT2024',
//       location: 'Main Campus - Computer Lab',
//       roomNumber: 'Lab 1',
//       maxStudents: 20,
//       currentStudents: 15,
//       recordingUrl: null,
//       attendance: 'not-marked',
//       description: 'Hands-on programming workshop with practical exercises.',
//       tags: ['A/L', 'Workshop', 'Programming'],
//       image: '/assets/nfts/Nft6.png'
//     }
//   ];

//   const tabOptions = [
//     { key: 'all', label: 'All Classes' },
//     { key: 'online', label: 'Online' },
//     { key: 'physical', label: 'Physical' },
//     { key: 'hybrid', label: 'Hybrid' },
//   ];
//   const [activeTab, setActiveTab] = useState('all');

//   // Filter classes based on tab and search
//   const filteredClasses = liveClasses.filter(cls => {
//     const matchesTab = activeTab === 'all' || cls.type === activeTab;
//     const matchesSearch = cls.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                          cls.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                          cls.subject.toLowerCase().includes(searchTerm.toLowerCase());
//     return matchesTab && matchesSearch;
//   });

//   // Get status color and icon
//   const getStatusInfo = (status) => {
//     switch (status) {
//       case 'live':
//         return { color: 'text-red-600', bgColor: 'bg-red-100', icon: <FaPlay className="text-red-600" />, text: 'Live Now' };
//       case 'upcoming':
//         return { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: <FaClock className="text-blue-600" />, text: 'Upcoming' };
//       case 'completed':
//         return { color: 'text-green-600', bgColor: 'bg-green-100', icon: <FaCheckCircle className="text-green-600" />, text: 'Completed' };
//       case 'cancelled':
//         return { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: <FaTimesCircle className="text-gray-600" />, text: 'Cancelled' };
//       default:
//         return { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: <FaClock className="text-gray-600" />, text: 'Unknown' };
//     }
//   };

//   // Get attendance status
//   const getAttendanceStatus = (attendance) => {
//     switch (attendance) {
//       case 'present':
//         return { color: 'text-green-600', icon: <FaCheckCircle />, text: 'Present' };
//       case 'absent':
//         return { color: 'text-red-600', icon: <FaTimesCircle />, text: 'Absent' };
//       case 'late':
//         return { color: 'text-yellow-600', icon: <FaExclamationTriangle />, text: 'Late' };
//       default:
//         return { color: 'text-gray-600', icon: <FaClock />, text: 'Not Marked' };
//     }
//   };

//   // Get class type info
//   const getClassTypeInfo = (type) => {
//     switch (type) {
//       case 'online':
//         return { color: 'text-purple-600', bgColor: 'bg-purple-100', icon: <FaVideo />, text: 'Online' };
//       case 'physical':
//         return { color: 'text-orange-600', bgColor: 'bg-orange-100', icon: <FaMapMarkerAlt />, text: 'Physical' };
//       case 'hybrid':
//         return { color: 'text-indigo-600', bgColor: 'bg-indigo-100', icon: <FaUsers />, text: 'Hybrid' };
//       default:
//         return { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: <FaUsers />, text: 'Unknown' };
//     }
//   };

//   // Check if class is currently live
//   const isClassLive = (cls) => {
//     if (cls.status !== 'live') return false;
//     const now = currentTime;
//     const classDate = new Date(cls.date);
//     const [startHour, startMin] = cls.startTime.split(':').map(Number);
//     const [endHour, endMin] = cls.endTime.split(':').map(Number);
    
//     const startTime = new Date(classDate);
//     startTime.setHours(startHour, startMin, 0);
    
//     const endTime = new Date(classDate);
//     endTime.setHours(endHour, endMin, 0);
    
//     return now >= startTime && now <= endTime;
//   };

//   // Handle join class
//   const handleJoinClass = (cls) => {
//     if (cls.type === 'online' || cls.type === 'hybrid') {
//       if (cls.zoomLink) {
//         window.open(cls.zoomLink, '_blank');
//       } else {
//         alert('Zoom link not available for this class.');
//       }
//     } else {
//       alert('This is a physical class. Please attend at the specified location.');
//     }
//   };

//   // Handle view recording
//   const handleViewRecording = (cls) => {
//     if (cls.recordingUrl) {
//       window.open(cls.recordingUrl, '_blank');
//     } else {
//       alert('Recording not available for this class.');
//     }
//   };

//   return (
//     <DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
//       <div className="p-2 sm:p-4 md:p-6">
//         <h1 className="text-2xl font-bold text-center mb-4">Live Classes</h1>
//         {/* Tab Bar */}
//         <div className="flex justify-center gap-2 mb-6 flex-wrap">
//           {tabOptions.map(tab => (
//             <button
//               key={tab.key}
//               className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-150 border-2
//                 ${activeTab === tab.key
//                   ? 'bg-cyan-600 text-white border-cyan-600 shadow-md'
//                   : 'bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50'}
//               `}
//               onClick={() => setActiveTab(tab.key)}
//             >
//               {tab.label}
//             </button>
//           ))}
//         </div>
//         {/* Search Bar inside tab panel */}
//         <div className="flex justify-center mb-6">
//           <input
//             type="text"
//             placeholder="Search classes, teachers, or subjects..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="border border-gray-300 rounded px-4 py-2 w-full max-w-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
//           />
//         </div>
//         {/* Classes Grid using BasicCard */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 gap-y-8">
//           {filteredClasses.map((cls) => {
//             const statusInfo = getStatusInfo(cls.status);
//             const attendanceInfo = getAttendanceStatus(cls.attendance);
//             const typeInfo = getClassTypeInfo(cls.type);
//             const isLive = isClassLive(cls);
//             return (
//               <BasicCard
//                 key={cls.id}
//                 title={<div className="flex flex-col"><span className="text-sm font-bold">{cls.title}</span><span className="text-xs text-gray-500 mt-1">{cls.teacher}</span></div>}
//                 price={<span className="text-xs font-semibold text-cyan-700">{cls.subject}</span>}
//                 image={cls.image}
//                 description={<>
//                   <div className="flex items-center gap-2 mb-1">
//                     <FaCalendar className="text-gray-500 text-xs" />
//                     <span className="text-xs text-gray-600">{new Date(cls.date).toLocaleDateString()} • {cls.startTime} - {cls.endTime}</span>
//                   </div>
//                   {cls.type === 'physical' && (
//                     <div className="flex items-center gap-2 mb-1">
//                       <FaMapMarkerAlt className="text-gray-500 text-xs" />
//                       <span className="text-xs text-gray-600">{cls.location} • Room {cls.roomNumber}</span>
//                     </div>
//                   )}
//                   {cls.type === 'online' && (
//                     <div className="flex items-center gap-2 mb-1">
//                       <FaVideo className="text-gray-500 text-xs" />
//                       <span className="text-xs text-gray-600">Zoom ID: {cls.meetingId}</span>
//                     </div>
//                   )}
//                   {cls.type === 'hybrid' && (
//                     <div className="flex items-center gap-2 mb-1">
//                       <FaUsers className="text-gray-500 text-xs" />
//                       <span className="text-xs text-gray-600">{cls.location} • Room {cls.roomNumber} + Zoom</span>
//                     </div>
//                   )}
//                   <div className="flex items-center gap-2 mb-1">
//                     <span className={`text-xs ${attendanceInfo.color}`}>{attendanceInfo.icon} {attendanceInfo.text}</span>
//                   </div>
//                   <div className="flex items-center gap-2 mb-1">
//                     <FaUsers className="text-gray-500 text-xs" />
//                     <span className="text-xs text-gray-600">{cls.currentStudents}/{cls.maxStudents} students</span>
//                   </div>
//                   <div className="flex flex-wrap gap-1 mb-1">
//                     {cls.tags.map((tag, index) => (
//                       <span key={index} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">{tag}</span>
//                     ))}
//                   </div>
//                   <div className="flex items-center gap-2 mt-2">
//                     <span className={`font-semibold text-xs ${statusInfo.color}`}>{statusInfo.icon} {isLive ? 'LIVE NOW' : statusInfo.text}</span>
//                     <span className={`text-xs font-medium ${typeInfo.color}`}>{typeInfo.icon} {typeInfo.text}</span>
//                   </div>
//                 </>}
//                 buttonText={cls.status === 'live' && (cls.type === 'online' || cls.type === 'hybrid') ? 'Join Live' :
//                   cls.status === 'upcoming' ? 'Join' :
//                   cls.status === 'completed' && cls.recordingUrl ? 'View Recording' :
//                   cls.status === 'cancelled' ? 'Cancelled' : ''}
//                 onButtonClick={() => {
//                   if (cls.status === 'live' && (cls.type === 'online' || cls.type === 'hybrid')) handleJoinClass(cls);
//                   else if (cls.status === 'upcoming') handleJoinClass(cls);
//                   else if (cls.status === 'completed' && cls.recordingUrl) handleViewRecording(cls);
//                 }}
//               />
//             );
//           })}
//         </div>
//         {filteredClasses.length === 0 && (
//           <div className="text-center text-gray-500 mt-8">No classes found matching your criteria.</div>
//         )}
//       </div>
//     </DashboardLayout>
//   );
// };

// export default LiveClasses; 
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import teacherSidebarSections from './TeacherDashboardSidebar';
import BasicCard from '../../../components/BasicCard';
import { getClassesByTeacher } from '../../../api/classes';
import { getUserData } from '../../../api/apiUtils';
import { getMaterialsByClass, uploadMaterial, deleteMaterial } from '../../../api/materials';
import { getRecordingsByClass, uploadRecording, deleteRecording } from '../../../api/recordings';
import { FaCalendar, FaClock, FaUser, FaBook, FaVideo, FaMapMarkerAlt, FaUsers, FaGraduationCap, FaEye, FaTimesCircle, FaInfoCircle, FaFileAlt, FaGraduationCap as FaExam, FaTasks, FaPlay, FaTrash, FaUpload } from 'react-icons/fa';

const TeacherAllClasses = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedClassForDetails, setSelectedClassForDetails] = useState(null);
  const [detailsActiveTab, setDetailsActiveTab] = useState('overview');
  
  // Materials state
  const [materials, setMaterials] = useState([]);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [newMaterial, setNewMaterial] = useState({ title: '', category: 'notes', description: '', file: null });
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Recordings state
  const [recordings, setRecordings] = useState([]);
  const [showAddRecording, setShowAddRecording] = useState(false);
  const [newRecording, setNewRecording] = useState({ title: '', category: 'lecture', description: '', file: null });
  const [selectedRecordingFile, setSelectedRecordingFile] = useState(null);
  const [recordingFileError, setRecordingFileError] = useState('');
  const [recordingUploadProgress, setRecordingUploadProgress] = useState(0);
  const [isUploadingRecording, setIsUploadingRecording] = useState(false);
  
  // Exams state
  const [exams, setExams] = useState([]);
  const [showAddExam, setShowAddExam] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [newExam, setNewExam] = useState({ title: '', date: '', time: '', description: '', duration: '' });
  
  // Assignments state
  const [assignments, setAssignments] = useState([]);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [newAssignment, setNewAssignment] = useState({ title: '', dueDate: '', description: '', points: '' });

  // Fetch teacher's classes from API
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        // Get teacher data from storage
        const teacherData = getUserData();
        console.log('Teacher data:', teacherData); // Debug log
        
        // Check if we have teacher data with teacherId
        const teacherId = teacherData?.teacherId || teacherData?.id || teacherData?.userid || null;
        console.log('Extracted teacherId:', teacherId); // Debug log
        
        if (teacherId) {
          const response = await getClassesByTeacher(teacherId);
          if (response.success) {
            setClasses(response.data || []);
          } else {
            setError(response.message || 'Failed to load classes');
          }
        } else {
          setError('Teacher information not found. Please log in again.');
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        setError('Failed to load classes. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  // router helpers (declare before any useEffect that may reference `location`)
  const navigate = useNavigate();
  const location = useLocation();

  // If URL contains classId & tab params, open the modal to that class/tab (linkable)
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const classId = params.get('classId');
      const tab = params.get('tab') || 'overview';
      if (classId && classes && classes.length > 0) {
        const cls = classes.find(c => String(c.id) === String(classId) || String(c.classId) === String(classId));
        if (cls) {
          // open the modal to the requested tab
          setSelectedClassForDetails(cls);
          setDetailsActiveTab(tab);
          setShowDetailsModal(true);
          loadClassData(cls.id);
        }
      }
    } catch (e) {
      // ignore
    }
  }, [location.search, classes]);

  // Handle view details

  const openDetailsWithTab = (cls, tab = 'overview') => {
    setSelectedClassForDetails(cls);
    setDetailsActiveTab(tab);
    setShowDetailsModal(true);
    // Load class-specific data
    loadClassData(cls.id);
    // Push query params so the view is linkable
    try {
      const params = new URLSearchParams();
      params.set('classId', cls.id);
      params.set('tab', tab);
      navigate(`/teacher/my-classes?${params.toString()}`, { replace: true });
    } catch (e) {
      // ignore navigation errors
    }
  };

  const handleViewDetails = (cls) => openDetailsWithTab(cls, 'overview');

  // Load class-specific data
  const loadClassData = async (classId) => {
    // Load materials from API using materials.js
    try {
      const data = await getMaterialsByClass(classId);
      if (data.success) {
        setMaterials(data.materials || []);
      }
    } catch (error) {
      console.error('Error loading materials:', error);
      setMaterials([]);
    }
    
    // Load recordings from API using recordings.js
    try {
      const data = await getRecordingsByClass(classId);
      if (data.success) {
        setRecordings(data.recordings || []);
      }
    } catch (error) {
      console.error('Error loading recordings:', error);
      setRecordings([]);
    }
    
    // Load exams and assignments (still using localStorage for now)
    const storedExams = JSON.parse(localStorage.getItem(`exams_${classId}`) || '[]');
    const storedAssignments = JSON.parse(localStorage.getItem(`assignments_${classId}`) || '[]');
    
    setExams(storedExams);
    setAssignments(storedAssignments);
  };

  // File handling functions
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setFileError('');
    
    if (file) {
      // Check file size (max 50MB for PDFs)
      if (file.size > 50 * 1024 * 1024) {
        setFileError('File size must be less than 50MB');
        setSelectedFile(null);
        return;
      }
      
      // Check file type - PDF only
      const allowedTypes = ['application/pdf'];
      
      if (!allowedTypes.includes(file.type)) {
        setFileError('Only PDF files are allowed. Please upload a PDF file.');
        setSelectedFile(null);
        return;
      }
      
      setSelectedFile(file);
      setNewMaterial({...newMaterial, file: file.name});
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setNewMaterial({...newMaterial, file: null});
    setFileError('');
  };

  // Get file icon based on file type
  const getFileIcon = (fileType) => {
    if (!fileType) return <FaFileAlt />;
    
    if (fileType.includes('pdf')) return <FaFileAlt className="text-red-500" />;
    if (fileType.includes('word') || fileType.includes('document')) return <FaFileAlt className="text-blue-500" />;
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return <FaFileAlt className="text-orange-500" />;
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FaFileAlt className="text-green-500" />;
    if (fileType.includes('zip') || fileType.includes('compressed')) return <FaFileAlt className="text-purple-500" />;
    if (fileType.includes('image')) return <FaFileAlt className="text-pink-500" />;
    if (fileType.includes('text')) return <FaFileAlt className="text-gray-500" />;
    
    return <FaFileAlt className="text-gray-400" />;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Materials handlers
  const handleAddMaterial = async () => {
    if (!newMaterial.title.trim() || !selectedFile) {
      setFileError('Please enter a title and select a PDF file');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const teacherData = getUserData();
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('class_id', selectedClassForDetails.id);
      formData.append('teacher_id', teacherData.teacherId || teacherData.userid);
      formData.append('teacher_name', teacherData.name || 'Teacher');
      formData.append('title', newMaterial.title);
      formData.append('description', newMaterial.description || '');
      formData.append('category', newMaterial.category || 'notes');
      
      // Use materials API
      const data = await uploadMaterial(formData);
      
      if (data.success) {
        // Reload materials list
        await loadClassData(selectedClassForDetails.id);
        
        setNewMaterial({ title: '', category: 'notes', description: '', file: null });
        setSelectedFile(null);
        setFileError('');
        setShowAddMaterial(false);
        alert('Material uploaded successfully! Students will need to enter their ID to download.');
      } else {
        setFileError(data.message || 'Failed to upload material');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setFileError(error.message || 'Failed to upload material. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEditMaterial = (material) => {
    setEditingMaterial(material);
    setNewMaterial({ ...material });
    setSelectedFile(null); // Reset file selection when editing
    setFileError('');
    setShowAddMaterial(true);
  };

  const handleUpdateMaterial = () => {
    if (!newMaterial.title.trim()) return;
    
    const updatedMaterial = {
      ...newMaterial,
      id: editingMaterial.id,
      createdAt: editingMaterial.createdAt,
      classId: editingMaterial.classId
    };
    
    // If a new file is selected, update file information
    if (selectedFile) {
      updatedMaterial.fileName = selectedFile.name;
      updatedMaterial.fileSize = selectedFile.size;
      updatedMaterial.fileType = selectedFile.type;
    }
    
    const updatedMaterials = materials.map(m => 
      m.id === editingMaterial.id ? updatedMaterial : m
    );
    
    setMaterials(updatedMaterials);
    localStorage.setItem(`materials_${selectedClassForDetails.id}`, JSON.stringify(updatedMaterials));
    
    setNewMaterial({ title: '', type: 'tute', description: '', file: null });
    setSelectedFile(null);
    setFileError('');
    setEditingMaterial(null);
    setShowAddMaterial(false);
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    
    try {
      const teacherData = getUserData();
      // Use materials API
      const data = await deleteMaterial(materialId, teacherData.teacherId || teacherData.userid);
      
      if (data.success) {
        // Reload materials list
        await loadClassData(selectedClassForDetails.id);
        alert('Material deleted successfully');
      } else {
        alert(data.message || 'Failed to delete material');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(error.message || 'Failed to delete material. Please try again.');
    }
  };

  // Recording handlers
  const handleRecordingFileSelect = (event) => {
    const file = event.target.files[0];
    setRecordingFileError('');
    
    if (!file) return;
    
    // Validate file type (video or audio)
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    const validAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
    const allValidTypes = [...validVideoTypes, ...validAudioTypes];
    
    if (!allValidTypes.includes(file.type)) {
      setRecordingFileError('Please select a valid video (MP4, WebM, OGG, MOV) or audio (MP3, WAV, OGG) file');
      event.target.value = '';
      return;
    }
    
    // Validate file size (max 500MB for videos)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      setRecordingFileError('File size must not exceed 500MB');
      event.target.value = '';
      return;
    }
    
    setSelectedRecordingFile(file);
    setNewRecording({ ...newRecording, file });
  };

  const handleAddRecording = async () => {
    if (!newRecording.title.trim() || !selectedRecordingFile) {
      setRecordingFileError('Please enter a title and select a video/audio file');
      return;
    }
    
    setIsUploadingRecording(true);
    setRecordingUploadProgress(0);
    
    try {
      const teacherData = getUserData();
      const formData = new FormData();
      formData.append('file', selectedRecordingFile);
      formData.append('class_id', selectedClassForDetails.id);
      formData.append('teacher_id', teacherData.teacherId || teacherData.userid);
      formData.append('teacher_name', teacherData.name || 'Teacher');
      formData.append('title', newRecording.title);
      formData.append('description', newRecording.description || '');
      formData.append('category', newRecording.category || 'lecture');
      
      // Use recordings API with progress tracking
      const data = await uploadRecording(formData, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setRecordingUploadProgress(percentCompleted);
      });
      
      if (data.success) {
        // Reload recordings list
        await loadClassData(selectedClassForDetails.id);
        
        setNewRecording({ title: '', category: 'lecture', description: '', file: null });
        setSelectedRecordingFile(null);
        setRecordingFileError('');
        setShowAddRecording(false);
        alert('Recording uploaded successfully!');
      } else {
        setRecordingFileError(data.message || 'Failed to upload recording');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setRecordingFileError(error.message || 'Failed to upload recording. Please try again.');
    } finally {
      setIsUploadingRecording(false);
      setRecordingUploadProgress(0);
    }
  };

  const handleDeleteRecording = async (recordingId) => {
    if (!window.confirm('Are you sure you want to delete this recording?')) return;
    
    try {
      const teacherData = getUserData();
      const data = await deleteRecording(recordingId, teacherData.teacherId || teacherData.userid);
      
      if (data.success) {
        // Reload recordings list
        await loadClassData(selectedClassForDetails.id);
        alert('Recording deleted successfully');
      } else {
        alert(data.message || 'Failed to delete recording');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(error.message || 'Failed to delete recording. Please try again.');
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Exams handlers
  const handleAddExam = () => {
    if (!newExam.title.trim() || !newExam.date) return;
    
    const exam = {
      id: Date.now(),
      ...newExam,
      createdAt: new Date().toISOString(),
      classId: selectedClassForDetails.id
    };
    
    const updatedExams = [...exams, exam];
    setExams(updatedExams);
    localStorage.setItem(`exams_${selectedClassForDetails.id}`, JSON.stringify(updatedExams));
    
    setNewExam({ title: '', date: '', time: '', description: '', duration: '' });
    setShowAddExam(false);
  };

  const handleEditExam = (exam) => {
    setEditingExam(exam);
    setNewExam({ ...exam });
    setShowAddExam(true);
  };

  const handleUpdateExam = () => {
    if (!newExam.title.trim() || !newExam.date) return;
    
    const updatedExams = exams.map(e => 
      e.id === editingExam.id ? { ...newExam, id: e.id, createdAt: e.createdAt, classId: e.classId } : e
    );
    
    setExams(updatedExams);
    localStorage.setItem(`exams_${selectedClassForDetails.id}`, JSON.stringify(updatedExams));
    
    setNewExam({ title: '', date: '', time: '', description: '', duration: '' });
    setEditingExam(null);
    setShowAddExam(false);
  };

  const handleDeleteExam = (examId) => {
    const updatedExams = exams.filter(e => e.id !== examId);
    setExams(updatedExams);
    localStorage.setItem(`exams_${selectedClassForDetails.id}`, JSON.stringify(updatedExams));
  };

  // Assignments handlers
  const handleAddAssignment = () => {
    if (!newAssignment.title.trim() || !newAssignment.dueDate) return;
    
    const assignment = {
      id: Date.now(),
      ...newAssignment,
      createdAt: new Date().toISOString(),
      classId: selectedClassForDetails.id
    };
    
    const updatedAssignments = [...assignments, assignment];
    setAssignments(updatedAssignments);
    localStorage.setItem(`assignments_${selectedClassForDetails.id}`, JSON.stringify(updatedAssignments));
    
    setNewAssignment({ title: '', dueDate: '', description: '', points: '' });
    setShowAddAssignment(false);
  };

  const handleEditAssignment = (assignment) => {
    setEditingAssignment(assignment);
    setNewAssignment({ ...assignment });
    setShowAddAssignment(true);
  };

  const handleUpdateAssignment = () => {
    if (!newAssignment.title.trim() || !newAssignment.dueDate) return;
    
    const updatedAssignments = assignments.map(a => 
      a.id === editingAssignment.id ? { ...newAssignment, id: a.id, createdAt: a.createdAt, classId: a.classId } : a
    );
    
    setAssignments(updatedAssignments);
    localStorage.setItem(`assignments_${selectedClassForDetails.id}`, JSON.stringify(updatedAssignments));
    
    setNewAssignment({ title: '', dueDate: '', description: '', points: '' });
    setEditingAssignment(null);
    setShowAddAssignment(false);
  };

  const handleDeleteAssignment = (assignmentId) => {
    const updatedAssignments = assignments.filter(a => a.id !== assignmentId);
    setAssignments(updatedAssignments);
    localStorage.setItem(`assignments_${selectedClassForDetails.id}`, JSON.stringify(updatedAssignments));
  };

  // Get image based on subject with fallback
  const getClassImage = (subject) => {
    if (!subject) return '/assets/nfts/Nft1.png';
    
    const imageMap = {
      'Physics': '/assets/nfts/Nft1.png',
      'Chemistry': '/assets/nfts/Nft2.png',
      'Mathematics': '/assets/nfts/Nft3.png',
      'Biology': '/assets/nfts/Nft4.png',
      'English': '/assets/nfts/Nft5.png',
      'ICT': '/assets/nfts/Nft6.png'
    };
    return imageMap[subject] || '/assets/nfts/Nft1.png';
  };

  // Format time for display with null checks
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const [hour, minute] = timeStr.split(':');
      let h = parseInt(hour, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${minute} ${ampm}`;
    } catch (err) {
      console.error('Error formatting time:', timeStr, err);
      return timeStr || '';
    }
  };

  // Format day for display with null checks
  const formatDay = (day) => {
    if (!day) return '';
    try {
      return day.charAt(0).toUpperCase() + day.slice(1);
    } catch (err) {
      console.error('Error formatting day:', day, err);
      return day || '';
    }
  };

  // Get delivery method info with fallbacks
  const getDeliveryMethodInfo = (method) => {
    if (!method) {
      return { color: 'text-gray-600', icon: <FaUsers />, text: 'Unknown' };
    }
    
    switch (method) {
      case 'online':
        return { color: 'text-purple-600', icon: <FaVideo />, text: 'Online' };
      case 'physical':
        return { color: 'text-orange-600', icon: <FaMapMarkerAlt />, text: 'Physical' };
      case 'hybrid':
        return { color: 'text-indigo-600', icon: <FaUsers />, text: 'Hybrid' };
      case 'other':
        return { color: 'text-gray-600', icon: <FaUsers />, text: 'Other' };
      default:
        return { color: 'text-gray-600', icon: <FaUsers />, text: method };
    }
  };

  // Get course type info with fallbacks
  const getCourseTypeInfo = (type) => {
    if (!type) {
      return { color: 'text-gray-600', icon: <FaBook />, text: 'Unknown' };
    }
    
    switch (type) {
      case 'theory':
        return { color: 'text-blue-600', icon: <FaBook />, text: 'Theory' };
      case 'revision':
        return { color: 'text-green-600', icon: <FaGraduationCap />, text: 'Revision' };
      default:
        return { color: 'text-gray-600', icon: <FaBook />, text: type };
    }
  };

  const tabOptions = [
    { key: 'all', label: 'All Classes' },
    { key: 'online', label: 'Online' },
    { key: 'physical', label: 'Physical' },
    { key: 'hybrid', label: 'Hybrid' },
    { key: 'theory', label: 'Theory' },
    { key: 'revision', label: 'Revision' }
  ];

  // Filter classes based on tab and search
  const filteredClasses = classes.filter(cls => {
    try {
      const matchesTab = selectedTab === 'all' || 
                        (selectedTab === 'online' && cls.deliveryMethod === 'online') ||
                        (selectedTab === 'physical' && cls.deliveryMethod === 'physical') ||
                        (selectedTab === 'hybrid' && cls.deliveryMethod === 'hybrid') ||
                        (selectedTab === 'theory' && cls.courseType === 'theory') ||
                        (selectedTab === 'revision' && cls.courseType === 'revision');
      
      const searchTerm = search.toLowerCase();
      const matchesSearch = 
        (cls.className || '').toLowerCase().includes(searchTerm) ||
        (cls.teacher || '').toLowerCase().includes(searchTerm) ||
        (cls.subject || '').toLowerCase().includes(searchTerm) ||
        (cls.stream || '').toLowerCase().includes(searchTerm);
      
      return matchesTab && matchesSearch;
    } catch (err) {
      console.error('Error filtering class:', cls, err);
      return false;
    }
  });

  if (loading) {
    return (
      <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3da58a]"></div>
            <span className="ml-2 text-gray-600">Loading your classes...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="text-center text-red-600">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
      <div className="p-2 sm:p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-lg font-bold">My Classes</h1>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {tabOptions.map(tab => (
            <button
              key={tab.key}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-150 border-2
                ${selectedTab === tab.key
                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-md'
                  : 'bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50'}
              `}
              onClick={() => setSelectedTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex justify-center mb-6">
          <input
            type="text"
            placeholder="Search by class name, teacher, subject, or stream..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 w-full max-w-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 gap-y-8">
          {filteredClasses.length > 0 ? (
            filteredClasses.map((cls) => {
              try {
                const deliveryInfo = getDeliveryMethodInfo(cls.deliveryMethod);
                const courseTypeInfo = getCourseTypeInfo(cls.courseType);
                const scheduleText = cls.schedule ? 
                  `${formatDay(cls.schedule.day)} ${formatTime(cls.schedule.startTime)}-${formatTime(cls.schedule.endTime)}` : 
                  'Schedule not set';

                return (
                  <BasicCard
                    key={cls.id}
                    title={
                      <div>
                        <span className="text-sm font-semibold">{cls.className || 'Unnamed Class'}</span>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <FaUser className="text-gray-400" />
                          {cls.teacher || 'Unknown Teacher'}
                        </div>
                      </div>
                    }
                    price={
                      <div className="text-xs font-semibold text-green-600">
                        <div>LKR {Number(cls.fee || 0).toLocaleString()}</div>
                      </div>
                    }
                    image={getClassImage(cls.subject)}
                    description={
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center gap-1">
                          <FaBook className="text-gray-400" />
                          <strong>Subject:</strong> {cls.subject || 'Unknown Subject'}
                        </div>
                        <div className="flex items-center gap-1">
                          <FaGraduationCap className="text-gray-400" />
                          <strong>Stream:</strong> {cls.stream || 'Unknown Stream'}
                        </div>
                        <div className="flex items-center gap-1">
                          <FaCalendar className="text-gray-400" />
                          <strong>Schedule:</strong> {scheduleText}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={deliveryInfo.color}>{deliveryInfo.icon}</span>
                          <strong>Delivery:</strong> {deliveryInfo.text}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={courseTypeInfo.color}>{courseTypeInfo.icon}</span>
                          <strong>Course Type:</strong> {courseTypeInfo.text}
                        </div>
                        <div className="flex items-center gap-1">
                          <FaUsers className="text-gray-400" />
                          <strong>Students:</strong> {cls.currentStudents || 0}/{cls.maxStudents || 50}
                        </div>
                        {cls.zoomLink && (cls.deliveryMethod === 'online' || cls.deliveryMethod === 'hybrid') && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <FaVideo />
                            <span className="text-xs">Zoom Available</span>
                          </div>
                        )}
                        {cls.description && (
                          <div className="text-xs text-gray-500 mt-2 italic">
                            "{cls.description}"
                          </div>
                        )}
                        {/* Quick action links to open class details directly to a specific tab */}
                        <div className="mt-3 flex items-center gap-2">
                          {(() => {
                            const user = getUserData();
                            // For teacher_staff users, check permissions before showing quick buttons
                            const perms = user && user.permissions ? user.permissions : {};

                            const showSchedule = !(user && user.role && user.role.toLowerCase() === 'teacher_staff') || Boolean(perms['schedules']);
                            const showMaterials = !(user && user.role && user.role.toLowerCase() === 'teacher_staff') || Boolean(perms['materials']);
                            const showRecordings = !(user && user.role && user.role.toLowerCase() === 'teacher_staff') || Boolean(perms['recordings']);

                            return (
                              <>
                                {showSchedule && (
                                  <button onClick={() => openDetailsWithTab(cls, 'schedule')} className="text-sm px-2 py-1 bg-white border rounded text-cyan-700 hover:bg-cyan-50">Schedule</button>
                                )}
                                {showMaterials && (
                                  <button onClick={() => openDetailsWithTab(cls, 'materials')} className="text-sm px-2 py-1 bg-white border rounded text-cyan-700 hover:bg-cyan-50">Materials</button>
                                )}
                                {showRecordings && (
                                  <button onClick={() => openDetailsWithTab(cls, 'recordings')} className="text-sm px-2 py-1 bg-white border rounded text-cyan-700 hover:bg-cyan-50">Recordings</button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    }
                    buttonText="View Details"
                    onButtonClick={() => handleViewDetails(cls)}
                    buttonClassName="bg-[#1a365d] hover:bg-[#13294b]"
                  />
                );
              } catch (err) {
                console.error('Error rendering class card:', cls, err);
                return null; // Skip this class if there's an error
              }
            })
          ) : (
            <div className="col-span-full text-center py-8 text-gray-500">
              {selectedTab === 'all' ? 'No classes found.' : `No ${selectedTab} classes found.`}
            </div>
          )}
        </div>

        {/* Class Details Modal */}
        {showDetailsModal && selectedClassForDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img 
                      src={getClassImage(selectedClassForDetails.subject)} 
                      alt={selectedClassForDetails.subject}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div>
                      <h2 className="text-2xl font-bold">{selectedClassForDetails.className}</h2>
                      <p className="text-blue-100">{selectedClassForDetails.subject} • {selectedClassForDetails.teacher}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      // clear query params
                      try { navigate('/teacher/my-classes', { replace: true }); } catch (e) {}
                    }}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <FaTimesCircle size={24} />
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <div className="flex space-x-8 px-6 overflow-x-auto">
                    {(() => {
                      const user = getUserData();
                      const allTabs = [
                        { id: 'overview', label: 'Overview', icon: <FaInfoCircle /> },
                        { id: 'schedule', label: 'Schedule', icon: <FaCalendar /> },
                        { id: 'materials', label: 'Materials', icon: <FaFileAlt /> },
                        { id: 'recordings', label: 'Recordings', icon: <FaVideo /> },
                        
                        
                      ];

                      // Map tab id -> permission key for teacher_staff users
                      const tabPermissionMap = {
                        overview: 'overview',
                        schedule: 'schedules',
                        materials: 'materials',
                        // recordings should be gated by the recordings permission (not materials)
                        recordings: 'recordings',
                        exams: 'exams',
                        assignments: 'materials'
                      };

                      const visibleTabs = allTabs.filter(t => {
                        if (user && user.role && user.role.toLowerCase() === 'teacher_staff') {
                          const perm = tabPermissionMap[t.id];
                          // If a permission is mapped, require it; otherwise allow by default
                          if (!perm) return true;
                          const perms = user.permissions || {};
                          return Boolean(perms[perm]);
                        }
                        return true;
                      });

                      return visibleTabs.map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setDetailsActiveTab(tab.id)}
                          className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-colors ${
                            detailsActiveTab === tab.id
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {tab.icon} {tab.label}
                        </button>
                      ));
                    })()}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {detailsActiveTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FaUsers className="text-blue-600" />
                          <span className="font-semibold">Total Students</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">{selectedClassForDetails.currentStudents || 0}</div>
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FaCalendar className="text-green-600" />
                          <span className="font-semibold">Status</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {selectedClassForDetails.status === 'active' ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FaBook className="text-purple-600" />
                          <span className="font-semibold">Course Type</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-600">
                          {selectedClassForDetails.courseType === 'theory' ? 'Theory' : 'Revision'}
                        </div>
                      </div>
                    </div>

                    {/* Class Information */}
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FaInfoCircle /> Class Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><strong>Stream:</strong> {selectedClassForDetails.stream}</div>
                        <div><strong>Delivery Method:</strong> {selectedClassForDetails.deliveryMethod}</div>
                        <div><strong>Fee:</strong> LKR {Number(selectedClassForDetails.fee || 0).toLocaleString()}</div>
                        <div><strong>Max Students:</strong> {selectedClassForDetails.maxStudents || 50}</div>
                      </div>
                    </div>
                  </div>
                )}

                {detailsActiveTab === 'schedule' && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FaCalendar /> Class Schedule
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div><strong>Day:</strong> {formatDay(selectedClassForDetails.schedule?.day)}</div>
                        <div><strong>Time:</strong> {formatTime(selectedClassForDetails.schedule?.startTime)} - {formatTime(selectedClassForDetails.schedule?.endTime)}</div>
                        <div><strong>Frequency:</strong> {selectedClassForDetails.schedule?.frequency}</div>
                        <div><strong>Status:</strong> {selectedClassForDetails.status}</div>
                      </div>
                      
                      {/* Zoom Link Section for Online/Hybrid Classes */}
                      {(selectedClassForDetails.deliveryMethod === 'online' || selectedClassForDetails.deliveryMethod === 'hybrid') && selectedClassForDetails.zoomLink && (
                        <div className="bg-white p-4 rounded-lg border border-blue-200">
                          <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-blue-700">
                            <FaVideo /> Zoom Meeting Link
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <div className="text-sm text-gray-600 mb-1">Meeting URL:</div>
                                <div className="text-sm font-medium text-blue-600 break-all">
                                  {selectedClassForDetails.zoomLink}
                                </div>
                              </div>
                              <button
                                onClick={() => window.open(selectedClassForDetails.zoomLink, '_blank')}
                                className="ml-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                              >
                                <FaVideo /> Join Meeting
                              </button>
                            </div>
                            <div className="text-xs text-gray-500">
                              <strong>Note:</strong> Click "Join Meeting" to open the zoom link in a new tab. Make sure you have Zoom installed or use the web version.
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* No Zoom Link Warning for Online/Hybrid Classes */}
                      {(selectedClassForDetails.deliveryMethod === 'online' || selectedClassForDetails.deliveryMethod === 'hybrid') && !selectedClassForDetails.zoomLink && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                          <h4 className="text-md font-semibold mb-2 flex items-center gap-2 text-yellow-700">
                            <FaVideo /> Zoom Link Missing
                          </h4>
                          <p className="text-sm text-yellow-600">
                            This {selectedClassForDetails.deliveryMethod} class doesn't have a zoom link configured. 
                            Please contact the administrator to add a zoom link for this class.
                          </p>
                        </div>
                      )}
                      
                      {/* Physical Class Info */}
                      {selectedClassForDetails.deliveryMethod === 'physical' && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <h4 className="text-md font-semibold mb-2 flex items-center gap-2 text-green-700">
                            <FaMapMarkerAlt /> Physical Class
                          </h4>
                          <p className="text-sm text-green-600">
                            This is a physical class. Students will attend in person at the designated location.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {detailsActiveTab === 'materials' && (
                  <div className="space-y-6">
                    <div className="bg-green-50 p-6 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <FaFileAlt /> Class Materials
                        </h3>
                        {(() => {
                          const user = getUserData();
                          const canAddMaterials = !(user && user.role && user.role.toLowerCase() === 'teacher_staff') || Boolean((user.permissions || {}).materials);
                          return canAddMaterials ? (
                            <button
                              onClick={() => setShowAddMaterial(true)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                            >
                              <FaFileAlt /> Add Material
                            </button>
                          ) : null;
                        })()}
                      </div>
                      
                      {materials.length > 0 ? (
                        <div className="space-y-3">
                          {materials.map((material) => (
                            <div key={material.id} className="bg-white p-4 rounded-lg border">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-semibold">{material.title}</span>
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      material.category === 'notes' ? 'bg-purple-100 text-purple-700' :
                                      material.category === 'assignment' ? 'bg-orange-100 text-orange-700' :
                                      material.category === 'past_paper' ? 'bg-green-100 text-green-700' :
                                      material.category === 'video' ? 'bg-red-100 text-red-700' :
                                      'bg-blue-100 text-blue-700'
                                    }`}>
                                      {material.category ? material.category.replace('_', ' ').charAt(0).toUpperCase() + material.category.replace('_', ' ').slice(1) : 'Notes'}
                                    </span>
                                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                                      🔒 Password Protected
                                    </span>
                                  </div>
                                  {material.description && (
                                    <p className="text-sm text-gray-600 mb-2">{material.description}</p>
                                  )}
                                  {material.file_name && (
                                    <div className="flex items-center gap-2 mb-2">
                                      <FaFileAlt className="text-red-500" />
                                      <span className="text-sm text-blue-600 font-medium">{material.file_name}</span>
                                      {material.file_size && (
                                        <span className="text-xs text-gray-500">({formatFileSize(material.file_size)})</span>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span>Uploaded: {new Date(material.upload_date).toLocaleDateString()}</span>
                                    {material.download_count > 0 && (
                                      <span className="text-blue-600">📥 {material.download_count} downloads</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {(() => {
                                    const user = getUserData();
                                    const canManageMaterials = !(user && user.role && user.role.toLowerCase() === 'teacher_staff') || Boolean((user.permissions || {}).materials);
                                    return canManageMaterials ? (
                                      <button
                                        onClick={() => handleDeleteMaterial(material.id)}
                                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                      >
                                        🗑️ Delete
                                      </button>
                                    ) : null;
                                  })()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FaFileAlt className="text-4xl mx-auto mb-4 text-gray-300" />
                          <p>No materials uploaded yet.</p>
                          <p className="text-sm text-gray-400 mt-2">Click "Add Material" to upload tutes, papers, and other materials.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {detailsActiveTab === 'recordings' && (
                  <div className="space-y-6">
                    <div className="bg-purple-50 p-6 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <FaVideo /> Class Recordings
                        </h3>
                        <button
                          onClick={() => setShowAddRecording(true)}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
                        >
                          <FaUpload /> Upload Recording
                        </button>
                      </div>
                      
                      {recordings.length > 0 ? (
                        <div className="space-y-3">
                          {recordings.map((recording) => (
                            <div key={recording.id} className="bg-white p-4 rounded-lg border">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FaPlay className="text-purple-500" />
                                    <span className="font-semibold">{recording.title}</span>
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      recording.category === 'lecture' ? 'bg-blue-100 text-blue-700' :
                                      recording.category === 'tutorial' ? 'bg-green-100 text-green-700' :
                                      recording.category === 'lab' ? 'bg-orange-100 text-orange-700' :
                                      recording.category === 'review' ? 'bg-purple-100 text-purple-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {recording.category ? recording.category.charAt(0).toUpperCase() + recording.category.slice(1) : 'Lecture'}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      recording.recording_type === 'video' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'
                                    }`}>
                                      {recording.recording_type === 'video' ? '🎥 Video' : '🎵 Audio'}
                                    </span>
                                  </div>
                                  {recording.description && (
                                    <p className="text-sm text-gray-600 mb-2">{recording.description}</p>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                                    {recording.file_name && (
                                      <span className="text-blue-600 font-medium">{recording.file_name}</span>
                                    )}
                                    {recording.duration && (
                                      <span>⏱️ {formatDuration(recording.duration)}</span>
                                    )}
                                    {recording.file_size && (
                                      <span>📁 {formatFileSize(recording.file_size)}</span>
                                    )}
                                    <span>📅 {new Date(recording.upload_date).toLocaleDateString()}</span>
                                    {recording.view_count > 0 && (
                                      <span className="text-green-600">👁️ {recording.view_count} views</span>
                                    )}
                                    {recording.download_count > 0 && (
                                      <span className="text-blue-600">📥 {recording.download_count} downloads</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleDeleteRecording(recording.id)}
                                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center gap-1"
                                  >
                                    <FaTrash /> Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FaVideo className="text-4xl mx-auto mb-4 text-gray-300" />
                          <p>No recordings uploaded yet.</p>
                          <p className="text-sm text-gray-400 mt-2">Click "Upload Recording" to add lecture videos and audio.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {detailsActiveTab === 'exams' && (
                  <div className="space-y-6">
                    <div className="bg-purple-50 p-6 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <FaExam /> Class Exams
                        </h3>
                        <button
                          onClick={() => setShowAddExam(true)}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
                        >
                          <FaExam /> Schedule Exam
                        </button>
                      </div>
                      
                      {exams.length > 0 ? (
                        <div className="space-y-3">
                          {exams.map((exam) => (
                            <div key={exam.id} className="bg-white p-4 rounded-lg border">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-semibold mb-2">{exam.title}</div>
                                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                                    <div><strong>Date:</strong> {new Date(exam.date).toLocaleDateString()}</div>
                                    <div><strong>Time:</strong> {exam.time || 'Not specified'}</div>
                                    <div><strong>Duration:</strong> {exam.duration || 'Not specified'}</div>
                                    <div><strong>Created:</strong> {new Date(exam.createdAt).toLocaleDateString()}</div>
                                  </div>
                                  {exam.description && (
                                    <p className="text-sm text-gray-600 mb-2">{exam.description}</p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditExam(exam)}
                                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteExam(exam.id)}
                                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FaExam className="text-4xl mx-auto mb-4 text-gray-300" />
                          <p>No exams scheduled yet.</p>
                          <p className="text-sm text-gray-400 mt-2">Click "Schedule Exam" to create new exams.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {detailsActiveTab === 'assignments' && (
                  <div className="space-y-6">
                    <div className="bg-orange-50 p-6 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <FaTasks /> Class Assignments
                        </h3>
                        <button
                          onClick={() => setShowAddAssignment(true)}
                          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2"
                        >
                          <FaTasks /> Create Assignment
                        </button>
                      </div>
                      
                      {assignments.length > 0 ? (
                        <div className="space-y-3">
                          {assignments.map((assignment) => (
                            <div key={assignment.id} className="bg-white p-4 rounded-lg border">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-semibold mb-2">{assignment.title}</div>
                                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                                    <div><strong>Due Date:</strong> {new Date(assignment.dueDate).toLocaleDateString()}</div>
                                    <div><strong>Points:</strong> {assignment.points || 'Not specified'}</div>
                                    <div><strong>Created:</strong> {new Date(assignment.createdAt).toLocaleDateString()}</div>
                                  </div>
                                  {assignment.description && (
                                    <p className="text-sm text-gray-600 mb-2">{assignment.description}</p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditAssignment(assignment)}
                                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAssignment(assignment.id)}
                                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FaTasks className="text-4xl mx-auto mb-4 text-gray-300" />
                          <p>No assignments posted yet.</p>
                          <p className="text-sm text-gray-400 mt-2">Click "Create Assignment" to post new assignments.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Material Modal */}
        {showAddMaterial && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FaFileAlt /> Upload Material (PDF)
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800 flex items-center gap-2">
                  🔒 <strong>Auto-Protection:</strong> PDF will be password-protected with student ID and watermarked
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input
                    type="text"
                    value={newMaterial.title}
                    onChange={(e) => setNewMaterial({...newMaterial, title: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g., Chapter 1 - Introduction to Chemistry"
                    required
                    disabled={isUploading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={newMaterial.category}
                    onChange={(e) => setNewMaterial({...newMaterial, category: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    disabled={isUploading}
                  >
                    <option value="notes">📝 Notes</option>
                    <option value="assignment">📋 Assignment</option>
                    <option value="past_paper">📄 Past Paper</option>
                    <option value="video">🎥 Video Link</option>
                    <option value="other">📁 Other</option>
                  </select>
                </div>
                <div>
                   <label className="block text-sm font-medium mb-1">Description</label>
                   <textarea
                     value={newMaterial.description}
                     onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
                     className="w-full border rounded px-3 py-2"
                     rows="3"
                     placeholder="Brief description of the material..."
                     disabled={isUploading}
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Upload PDF File *</label>
                   <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                     {selectedFile ? (
                       <div className="space-y-2">
                         <div className="flex items-center justify-center gap-2">
                           <FaFileAlt className="text-red-500 text-2xl" />
                           <div className="text-left">
                             <div className="text-sm font-medium">{selectedFile.name}</div>
                             <div className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</div>
                           </div>
                         </div>
                         {!isUploading && (
                           <button
                             type="button"
                             onClick={removeSelectedFile}
                             className="text-red-600 text-sm hover:text-red-800"
                           >
                             Remove File
                           </button>
                         )}
                       </div>
                     ) : (
                       <div>
                         <input
                           type="file"
                           onChange={handleFileSelect}
                           accept=".pdf,application/pdf"
                           className="hidden"
                           id="file-upload"
                           disabled={isUploading}
                         />
                         <label
                           htmlFor="file-upload"
                           className={`cursor-pointer text-blue-600 hover:text-blue-800 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                         >
                           <div className="flex flex-col items-center">
                             <FaFileAlt className="text-3xl mb-2" />
                             <span className="text-sm font-medium">Click to upload PDF</span>
                             <span className="text-xs text-gray-500 mt-1">
                               PDF files only (max 50MB)
                             </span>
                           </div>
                         </label>
                       </div>
                     )}
                   </div>
                   {fileError && (
                     <p className="text-red-600 text-xs mt-1">{fileError}</p>
                   )}
                   {isUploading && (
                     <div className="mt-3">
                       <div className="w-full bg-gray-200 rounded-full h-2">
                         <div 
                           className="bg-green-600 h-2 rounded-full transition-all duration-300"
                           style={{ width: `${uploadProgress}%` }}
                         />
                       </div>
                       <p className="text-sm text-gray-600 text-center mt-2">
                         Uploading and securing PDF... {uploadProgress}%
                       </p>
                     </div>
                   )}
                 </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddMaterial}
                    className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isUploading || !newMaterial.title.trim() || !selectedFile}
                  >
                    {isUploading ? 'Uploading...' : '🔒 Upload & Secure'}
                  </button>
                  <button
                     onClick={() => {
                       setShowAddMaterial(false);
                       setEditingMaterial(null);
                       setNewMaterial({ title: '', category: 'notes', description: '', file: null });
                       setSelectedFile(null);
                       setFileError('');
                     }}
                     className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                     disabled={isUploading}
                   >
                     Cancel
                   </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Recording Modal */}
        {showAddRecording && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FaVideo /> Upload Recording
              </h3>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-purple-800 flex items-center gap-2">
                  🎥 Upload lecture videos or audio recordings for students to view/download
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input
                    type="text"
                    value={newRecording.title}
                    onChange={(e) => setNewRecording({...newRecording, title: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g., Lecture 5 - Thermodynamics"
                    required
                    disabled={isUploadingRecording}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={newRecording.category}
                    onChange={(e) => setNewRecording({...newRecording, category: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    disabled={isUploadingRecording}
                  >
                    <option value="lecture">🎓 Lecture</option>
                    <option value="tutorial">📚 Tutorial</option>
                    <option value="lab">🔬 Lab Session</option>
                    <option value="review">🔄 Review Session</option>
                    <option value="other">📁 Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={newRecording.description}
                    onChange={(e) => setNewRecording({...newRecording, description: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    rows="3"
                    placeholder="Brief description of the recording..."
                    disabled={isUploadingRecording}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Upload Video/Audio *</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    {selectedRecordingFile ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <FaVideo className="text-purple-500 text-2xl" />
                          <div className="text-left">
                            <div className="text-sm font-medium">{selectedRecordingFile.name}</div>
                            <div className="text-xs text-gray-500">{formatFileSize(selectedRecordingFile.size)}</div>
                          </div>
                        </div>
                        {!isUploadingRecording && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecordingFile(null);
                              setNewRecording({...newRecording, file: null});
                              document.getElementById('recording-upload').value = '';
                            }}
                            className="text-red-600 text-sm hover:text-red-800"
                          >
                            Remove File
                          </button>
                        )}
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          onChange={handleRecordingFileSelect}
                          accept="video/*,audio/*"
                          className="hidden"
                          id="recording-upload"
                          disabled={isUploadingRecording}
                        />
                        <label
                          htmlFor="recording-upload"
                          className={`cursor-pointer text-purple-600 hover:text-purple-800 ${isUploadingRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex flex-col items-center">
                            <FaVideo className="text-3xl mb-2" />
                            <span className="text-sm font-medium">Click to upload video/audio</span>
                            <span className="text-xs text-gray-500 mt-1">
                              MP4, WebM, OGG, MOV, MP3, WAV (max 500MB)
                            </span>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                  {recordingFileError && (
                    <p className="text-red-600 text-xs mt-1">{recordingFileError}</p>
                  )}
                  {isUploadingRecording && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${recordingUploadProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 text-center mt-2">
                        Uploading recording... {recordingUploadProgress}%
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddRecording}
                    className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    disabled={isUploadingRecording || !newRecording.title.trim() || !selectedRecordingFile}
                  >
                    {isUploadingRecording ? 'Uploading...' : <><FaUpload /> Upload Recording</>}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddRecording(false);
                      setNewRecording({ title: '', category: 'lecture', description: '', file: null });
                      setSelectedRecordingFile(null);
                      setRecordingFileError('');
                    }}
                    className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isUploadingRecording}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Exam Modal */}
        {showAddExam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-4">
                {editingExam ? 'Edit Exam' : 'Schedule Exam'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    value={newExam.title}
                    onChange={(e) => setNewExam({...newExam, title: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Exam title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={newExam.date}
                    onChange={(e) => setNewExam({...newExam, date: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time</label>
                  <input
                    type="time"
                    value={newExam.time}
                    onChange={(e) => setNewExam({...newExam, time: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration</label>
                  <input
                    type="text"
                    value={newExam.duration}
                    onChange={(e) => setNewExam({...newExam, duration: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g., 2 hours"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={newExam.description}
                    onChange={(e) => setNewExam({...newExam, description: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    rows="3"
                    placeholder="Exam description"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={editingExam ? handleUpdateExam : handleAddExam}
                    className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
                  >
                    {editingExam ? 'Update' : 'Schedule'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddExam(false);
                      setEditingExam(null);
                      setNewExam({ title: '', date: '', time: '', description: '', duration: '' });
                    }}
                    className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Assignment Modal */}
        {showAddAssignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-4">
                {editingAssignment ? 'Edit Assignment' : 'Create Assignment'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Assignment title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newAssignment.dueDate}
                    onChange={(e) => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Points</label>
                  <input
                    type="number"
                    value={newAssignment.points}
                    onChange={(e) => setNewAssignment({...newAssignment, points: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g., 100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    rows="3"
                    placeholder="Assignment description"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={editingAssignment ? handleUpdateAssignment : handleAddAssignment}
                    className="flex-1 bg-orange-600 text-white py-2 rounded hover:bg-orange-700"
                  >
                    {editingAssignment ? 'Update' : 'Create'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddAssignment(false);
                      setEditingAssignment(null);
                      setNewAssignment({ title: '', dueDate: '', description: '', points: '' });
                    }}
                    className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherAllClasses; 
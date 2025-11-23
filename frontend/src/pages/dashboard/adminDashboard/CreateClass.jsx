// (moved inside BasicForm render)
import React, { useState, useEffect } from 'react';
import BasicAlertBox from '../../../components/BasicAlertBox';
import BasicForm from '../../../components/BasicForm';
import CustomTextField from '../../../components/CustomTextField';
import CustomButton from '../../../components/CustomButton';
import CustomSelectField from '../../../components/CustomSelectField';
import { FaEdit, FaTrash, FaPlus, FaCalendar, FaBook, FaUser, FaClock, FaMoneyBill, FaVideo, FaUsers, FaGraduationCap, FaSync, FaTimes, FaSearch } from 'react-icons/fa';
import * as Yup from 'yup';
import BasicTable from '../../../components/BasicTable';
import { getAllClasses, createClass, updateClass, deleteClass } from '../../../api/classes';
import { getActiveTeachers } from '../../../api/teachers';


const streamOptions = [
  { value: '', label: 'Select Stream' },
  { value: 'O/L', label: 'O/L' },
  { value: 'A/L-Art', label: 'A/L-Art' },
  { value: 'A/L-Maths', label: 'A/L-Maths' },
  { value: 'A/L-Science', label: 'A/L-Science' },
  { value: 'A/L-Commerce', label: 'A/L-Commerce' },
  { value: 'A/L-Technology', label: 'A/L-Technology' },
  { value: 'Primary', label: 'Primary' },
  { value: 'Other', label: 'Other' },
];

const statusOptions = [
  { value: '', label: 'Select Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const tuteCollectionTypeOptions = [
  { value: 'speed_post', label: 'Speed Post Only' },
  { value: 'physical_class', label: 'Physical Class Only' },
  { value: 'both', label: 'Both Speed Post & Physical Class' },
];

const classMediumOptions = [
  { value: 'Sinhala', label: 'Sinhala' },
  { value: 'English', label: 'English' },
  { value: 'Both', label: 'Both Sinhala & English' },
];

const validationSchema = Yup.object().shape({
  className: Yup.string().required('Class Name is required'),
  subject: Yup.string().required('Subject is required'),
  teacher: Yup.string().required('Teacher is required'),
  stream: Yup.string().oneOf(streamOptions.map(o => o.value), 'Invalid stream').required('Stream is required'),
  deliveryMethod: Yup.string().oneOf(['online', 'physical', 'hybrid1', 'hybrid2', 'hybrid3', 'hybrid4'], 'Invalid delivery method').required('Delivery Method is required'),
  deliveryOther: Yup.string().when('deliveryMethod', {
    is: (val) => val === 'other',
    then: (schema) => schema.required('Please specify delivery method'),
    otherwise: (schema) => schema.notRequired(),
  }),
  schedule: Yup.object().shape({
    day: Yup.string().when('frequency', {
      is: 'no-schedule',
      then: (schema) => schema.notRequired(),
      otherwise: (schema) => schema.required('Day is required'),
    }),
    startTime: Yup.string().when('frequency', {
      is: 'no-schedule',
      then: (schema) => schema.notRequired(),
      otherwise: (schema) => schema.required('Start Time is required'),
    }),
    endTime: Yup.string().when('frequency', {
      is: 'no-schedule',
      then: (schema) => schema.notRequired(),
      otherwise: (schema) => schema.required('End Time is required'),
    }),
    frequency: Yup.string().oneOf(['weekly', 'bi-weekly', 'monthly', 'no-schedule'], 'Invalid frequency').required('Frequency is required'),
  }),
  startDate: Yup.string().required('Start Date is required'),
  endDate: Yup.string().required('End Date is required').test('endDate', 'End Date must be after Start Date', function(value) {
    const { startDate } = this.parent;
    return !startDate || !value || value >= startDate;
  }),
  maxStudents: Yup.number().min(1, 'Must be at least 1').required('Maximum Students is required'),
  fee: Yup.number().min(0, 'Must be 0 or greater').required('Fee is required'),
  zoomLink: Yup.string().when('deliveryMethod', {
    is: (val) => val === 'online' || val === 'hybrid1' || val === 'hybrid3' || val === 'hybrid4',
    then: (schema) => schema.required('Zoom Link is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  videoUrl: Yup.string().when('deliveryMethod', {
    is: (val) => val === 'hybrid2' || val === 'hybrid3' || val === 'hybrid4',
    then: (schema) => schema.notRequired(), // Temporarily make it not required for testing
    otherwise: (schema) => schema.notRequired(),
  }),
  courseType: Yup.string().oneOf(['theory', 'revision'], 'Invalid course type').required('Course Type is required'),
  status: Yup.string().oneOf(statusOptions.map(o => o.value), 'Invalid status').required('Status is required'),
  // New fields for Tute and Paper Collection
  enableTuteCollection: Yup.boolean().required('Tute collection setting is required'),
  tuteCollectionType: Yup.string().when('enableTuteCollection', {
    is: true,
    then: (schema) => schema.oneOf(['speed_post', 'physical_class', 'both'], 'Invalid tute collection type').required('Tute collection type is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  speedPostFee: Yup.number().when('enableTuteCollection', {
    is: true,
    then: (schema) => schema.min(0, 'Speed post fee must be 0 or greater').required('Speed post fee is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  // New field for Class Medium
  classMedium: Yup.string().oneOf(['Sinhala', 'English', 'Both'], 'Invalid medium').required('Class medium is required'),
  // New fields for Zoom Join Methods
  enableNewWindowJoin: Yup.boolean().required('New window join setting is required'),
  enableOverlayJoin: Yup.boolean().required('Overlay join setting is required'),
});

const initialValues = {
  className: '',
  subject: '',
  teacher: '',
  teacherId: '',
  stream: '',
  deliveryMethod: 'physical',
  deliveryOther: '',
  schedule: {
    day: '',
    startTime: '',
    endTime: '',
    frequency: 'weekly'
  },
  startDate: '',
  endDate: '',
  maxStudents: 30, // Changed from 0 to 30 (default class size)
  fee: 0, // Changed from '' to 0 (default fee)
  paymentTracking: false,
  paymentTrackingFreeDays: 7,
  zoomLink: '',
  videoUrl: '',
  description: '',
  courseType: 'theory',
  revisionDiscountPrice: '', 
  status: 'active', // Changed from '' to 'active' (default status)
  // New fields for Tute and Paper Collection
  enableTuteCollection: false,
  tuteCollectionType: 'speed_post',
  speedPostFee: 300, // Default speed post fee
  // New field for Class Medium
  classMedium: 'Sinhala', // Default medium
  // New fields for Zoom Join Methods
  enableNewWindowJoin: true, // Default to enabled
  enableOverlayJoin: true, // Default to enabled
};

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hour, minute] = timeStr.split(':');
  let h = parseInt(hour, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${minute} ${ampm}`;
}

function formatDay(day) {
  if (!day) return '';
  return day.charAt(0).toUpperCase() + day.slice(1);
}

const CreateClass = ({ onLogout }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formValues, setFormValues] = useState(initialValues);
  const [submitKey, setSubmitKey] = useState(0);
  const [alertBox, setAlertBox] = useState({ open: false, message: '', onConfirm: null, onCancel: null, confirmText: 'Delete', cancelText: 'Cancel', type: 'danger' });
  const [zoomLoading, setZoomLoading] = useState(false);
  const [zoomError, setZoomError] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  // State for revision relation (must be at top level, not inside render callback)
  const [revisionRelation, setRevisionRelation] = React.useState('none'); // 'none' | 'related' | 'unrelated'
  // State for selected theory class id (for autofill)
  const [selectedTheoryId, setSelectedTheoryId] = React.useState('');
  // State for teachers
  const [teacherList, setTeacherList] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [streamFilter, setStreamFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState('');
  
  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });

  // Load classes from backend
  const loadClasses = async () => {
    try {
      setLoading(true);
      const response = await getAllClasses();
      if (response.success) {
        setClasses(response.data || []);
      } else {
        console.error('Failed to load classes:', response.message);
        setClasses([]);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  // Load teachers from teacher backend directly (same pattern as student system)
  const loadTeachers = async () => {
    try {
      setLoadingTeachers(true);
      console.log('Loading teachers from teacher backend...');
      
      // Get all teacher data from teacher backend directly
      const response = await getActiveTeachers();
      console.log('Teacher backend response:', response);
      
      if (response.success && response.data) {
        console.log('Teachers loaded successfully from teacher backend:', response.data.length, 'teachers');
        console.log('Teachers data:', response.data);
        setTeacherList(response.data);
      } else {
        console.error('Failed to load teachers from teacher backend:', response.message);
        setTeacherList([]);
      }
    } catch (error) {
      console.error('Error loading teachers from teacher backend:', error);
      setTeacherList([]);
    } finally {
      setLoadingTeachers(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadClasses();
    loadTeachers();
  }, []);

  // Auto-sync myClasses with admin classes on component mount
  useEffect(() => {
    // Only sync if there are classes loaded
    if (classes.length > 0) {
      const hasUpdates = syncMyClassesWithAdminClasses();
      if (hasUpdates) {
        console.log('Auto-synced myClasses with admin classes on component mount');
      }
    }
  }, [classes]); // Run when classes change

  // Sync function to update myClasses with latest admin class data
  const syncMyClassesWithAdminClasses = () => {
    try {
      const myClasses = JSON.parse(localStorage.getItem('myClasses') || '[]');
      let hasUpdates = false;
      
      const updatedMyClasses = myClasses.map(studentClass => {
        // Find corresponding admin class
        const adminClass = classes.find(adminCls => 
          adminCls.id === studentClass.classId || adminCls.id === studentClass.id
        );
        
        if (adminClass) {
                     // Update student class with latest admin data while preserving student-specific data
           const updatedStudentClass = {
             ...studentClass,
             className: adminClass.className,
             subject: adminClass.subject,
             teacher: adminClass.teacher,
             stream: adminClass.stream,
             deliveryMethod: adminClass.deliveryMethod,
             schedule: adminClass.schedule,
             fee: adminClass.fee,
             maxStudents: adminClass.maxStudents,
             zoomLink: adminClass.zoomLink, // Update zoom link
             description: adminClass.description,
             courseType: adminClass.courseType,
             status: adminClass.status, // Update status (active/inactive)
             paymentTracking: adminClass.paymentTracking,
             paymentTrackingFreeDays: adminClass.paymentTrackingFreeDays,
             // Preserve student-specific data
             // paymentStatus, paymentMethod, purchaseDate, attendance, etc. remain unchanged
           };
          
          // Check if any updates were made
          if (JSON.stringify(studentClass) !== JSON.stringify(updatedStudentClass)) {
            hasUpdates = true;
          }
          
          return updatedStudentClass;
        }
        
        return studentClass;
      });
      
      if (hasUpdates) {
        localStorage.setItem('myClasses', JSON.stringify(updatedMyClasses));
        console.log('Synced myClasses with latest admin class data');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error syncing myClasses with admin classes:', error);
      return false;
    }
  };

  // Create teacher options from API data
  const teacherOptions = [
    { value: '', label: 'Select Teacher', key: 'select-teacher' },
    ...teacherList.map(t => ({ 
      value: `${t.designation} ${t.name}`, 
      label: `${t.designation} ${t.name}`,
      key: `teacher-${t.teacherId}` // Use teacherId as unique key
    }))
  ];
  
  console.log('Teacher list:', teacherList);
  console.log('Teacher options:', teacherOptions);

  // Filter classes based on search and filter criteria
  const filteredClasses = classes.filter(cls => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const className = cls.className?.toLowerCase() || '';
      const subject = cls.subject?.toLowerCase() || '';
      const teacher = cls.teacher?.toLowerCase() || '';
      const stream = cls.stream?.toLowerCase() || '';
      
      if (!className.includes(searchLower) && 
          !subject.includes(searchLower) && 
          !teacher.includes(searchLower) && 
          !stream.includes(searchLower)) {
        return false;
      }
    }
    
    // Stream filter
    if (streamFilter && cls.stream !== streamFilter) {
      return false;
    }
    
    // Status filter
    if (statusFilter && cls.status !== statusFilter) {
      return false;
    }
    
    // Delivery method filter
    if (deliveryMethodFilter && cls.deliveryMethod !== deliveryMethodFilter) {
      return false;
    }
    
    return true;
  });

  // Sort filtered classes
  const sortedAndFilteredClasses = [...filteredClasses].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    // Handle nested properties
    if (sortConfig.key === 'schedule') {
      aValue = a.schedule?.day || '';
      bValue = b.schedule?.day || '';
    }
    
    // Handle numeric values
    if (sortConfig.key === 'fee' || sortConfig.key === 'maxStudents') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }
    
    // Handle string values
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    // Compare values
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Handle sort changes
  const handleSort = (key) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        // Toggle direction if same column
        return {
          key,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        // New column, default to ascending
        return {
          key,
          direction: 'asc'
        };
      }
    });
  };

  // Create filter options
  const streamFilterOptions = [
    { value: '', label: 'All Streams' },
    ...streamOptions.filter(option => option.value !== '')
  ];

  const statusFilterOptions = [
    { value: '', label: 'All Statuses' },
    ...statusOptions.filter(option => option.value !== '')
  ];

  const deliveryMethodFilterOptions = [
    { value: '', label: 'All Delivery Methods' },
    { value: 'physical', label: 'Physical Only' },
    { value: 'online', label: 'Online Only' },
    { value: 'hybrid1', label: 'Hybrid 1 (Physical + Online)' },
    { value: 'hybrid2', label: 'Hybrid 2 (Physical + Recorded)' },
    { value: 'hybrid3', label: 'Hybrid 3 (Online + Recorded)' },
    { value: 'hybrid4', label: 'Hybrid 4 (Physical + Online + Recorded)' }
  ];

  const handleSubmit = async (values, { resetForm, setFieldError }) => {
    console.log('=== FORM SUBMISSION STARTED ===');
    console.log('Form submitted with values:', values);
    let submitValues = { ...values };
    // If revision+related, always use related theory class values for main fields
    if (
      submitValues.courseType === 'revision' &&
      revisionRelation === 'related' &&
      selectedTheoryId
    ) {
      const related = classes.find(tc => String(tc.id) === String(selectedTheoryId));
      if (related) {
        submitValues = {
          ...submitValues,
          className: related.className,
          subject: related.subject,
          teacher: related.teacher,
          teacherId: related.teacherId,
          stream: related.stream,
          deliveryMethod: related.deliveryMethod,
          schedule: { ...related.schedule },
          startDate: related.startDate,
          endDate: related.endDate,
          maxStudents: related.maxStudents,
          zoomLink: related.zoomLink || submitValues.zoomLink, // Keep user's zoom link if related doesn't have one
          description: related.description,
          relatedTheoryId: related.id,
        };
      }
    } else if (submitValues.courseType === 'revision' && revisionRelation === 'unrelated') {
      // For revision+unrelated, ensure relatedTheoryId is not set
      submitValues.relatedTheoryId = null; // Changed from '' to null
    } else if (submitValues.courseType === 'theory') {
      // For theory, ensure relatedTheoryId is not set
      submitValues.relatedTheoryId = null; // Changed from '' to null
    }
    // Always ensure teacherId is set if teacher is selected
    if (!submitValues.teacherId && submitValues.teacher) {
      console.log('Looking for teacher:', submitValues.teacher);
      console.log('Available teachers:', teacherList);
      const found = teacherList.find(t => `${t.designation} ${t.name}` === submitValues.teacher);
      console.log('Found teacher:', found);
      if (found) submitValues.teacherId = found.teacherId;
    }
    // Always ensure fee and revisionDiscountPrice are numbers
    submitValues.fee = submitValues.fee ? Number(submitValues.fee) : 0;
    if (submitValues.revisionDiscountPrice) {
      submitValues.revisionDiscountPrice = Number(submitValues.revisionDiscountPrice);
    } else {
      submitValues.revisionDiscountPrice = null; // Convert empty string to null
    }
    // Add payment tracking logic
    let paymentTrackingObj = { enabled: false };
    if (submitValues.paymentTracking && submitValues.startDate) {
      // Use user input for free days, default to 7 if not set
      const freeDays = Number(submitValues.paymentTrackingFreeDays) || 7;
      const start = new Date(submitValues.startDate);
      const freeUntil = new Date(start);
      freeUntil.setDate(start.getDate() + freeDays);
      paymentTrackingObj = {
        enabled: true,
        startDate: submitValues.startDate,
        freeUntil: freeUntil.toISOString().slice(0, 10),
        freeDays,
        active: true
      };
    }
    // Ensure submitValues has the required structure
    // Handle schedule properly - if no schedule data, use 'no-schedule' frequency
    let scheduleData = submitValues.schedule || {};
    if (!scheduleData.day || !scheduleData.startTime || !scheduleData.endTime) {
      // No schedule provided, use 'no-schedule' frequency
      scheduleData = { day: '', startTime: '', endTime: '', frequency: 'no-schedule' };
    } else if (!scheduleData.frequency) {
      // Schedule data provided but no frequency, default to weekly
      scheduleData.frequency = 'weekly';
    }
    
    const normalizedSubmitValues = {
      ...submitValues,
      schedule: scheduleData,
      fee: submitValues.fee || 0,
      maxStudents: submitValues.maxStudents || 50,
      status: submitValues.status || 'active',
      paymentTracking: paymentTrackingObj,
      zoomLink: submitValues.zoomLink || '', // Ensure zoom link is included
        videoUrl: videoFile ? videoFile.url : '', // Include video URL if uploaded
      description: submitValues.description || ''
    };

    // Debug: Log the normalized values to see if zoom link and video URL are included
    console.log('Saving class with zoom link:', normalizedSubmitValues.zoomLink);
    console.log('Saving class with video URL:', normalizedSubmitValues.videoUrl);
    console.log('Video file state:', videoFile);
    
    if (editingId) {
      // Update the class using API
      try {
        console.log('Updating class with ID:', editingId);
        console.log('Update data:', normalizedSubmitValues);
        console.log('Video URL in update data:', normalizedSubmitValues.videoUrl);
        
        const response = await updateClass(editingId, normalizedSubmitValues);
        console.log('Update response:', response);
        
        if (response.success) {
          // Reload classes from backend
          await loadClasses();
      
          // Also update the class in students' myClasses if it exists
          try {
            const myClasses = JSON.parse(localStorage.getItem('myClasses') || '[]');
            const updatedMyClasses = myClasses.map(studentClass => {
              if (studentClass.classId === editingId || studentClass.id === editingId) {
                // Update the class data while preserving student-specific data
                return {
                  ...studentClass,
                  className: normalizedSubmitValues.className,
                  subject: normalizedSubmitValues.subject,
                  teacher: normalizedSubmitValues.teacher,
                  stream: normalizedSubmitValues.stream,
                  deliveryMethod: normalizedSubmitValues.deliveryMethod,
                  schedule: normalizedSubmitValues.schedule,
                  fee: normalizedSubmitValues.fee,
                  maxStudents: normalizedSubmitValues.maxStudents,
                  zoomLink: normalizedSubmitValues.zoomLink, // Update zoom link
                  description: normalizedSubmitValues.description,
                  courseType: normalizedSubmitValues.courseType,
                  status: normalizedSubmitValues.status, // Update status (active/inactive)
                  paymentTracking: normalizedSubmitValues.paymentTracking,
                  paymentTrackingFreeDays: normalizedSubmitValues.paymentTrackingFreeDays,
                  // New fields for Tute and Paper Collection
                  enableTuteCollection: normalizedSubmitValues.enableTuteCollection,
                  tuteCollectionType: normalizedSubmitValues.tuteCollectionType,
                  speedPostFee: normalizedSubmitValues.speedPostFee,
                  // New field for Class Medium
                  classMedium: normalizedSubmitValues.classMedium,
                  // New fields for Zoom Join Methods
                  enableNewWindowJoin: normalizedSubmitValues.enableNewWindowJoin,
                  enableOverlayJoin: normalizedSubmitValues.enableOverlayJoin,
                  // Preserve student-specific data
                  // paymentStatus, paymentMethod, purchaseDate, attendance, etc. remain unchanged
                };
              }
              return studentClass;
            });
            
            localStorage.setItem('myClasses', JSON.stringify(updatedMyClasses));
            console.log('Updated class in myClasses localStorage for existing students');
          } catch (error) {
            console.error('Error updating myClasses localStorage:', error);
          }
          
          setEditingId(null);
          setAlertBox({
            open: true,
            message: 'Class updated successfully! All enrolled students will see the updated information.',
            onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
            onCancel: null,
            confirmText: 'OK',
            cancelText: '',
            type: 'success',
          });
        } else {
          console.error('Update failed:', response);
          setAlertBox({
            open: true,
            message: response.message || 'Failed to update class. Please try again.',
            onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
            onCancel: null,
            confirmText: 'OK',
            cancelText: '',
            type: 'danger',
          });
        }
      } catch (error) {
        console.error('Error updating class:', error);
        setAlertBox({
          open: true,
          message: `Error updating class: ${error.message}`,
          onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
          onCancel: null,
          confirmText: 'OK',
          cancelText: '',
          type: 'danger',
        });
      }
    } else {
      // Create new class using API
      try {
        console.log('Creating class with data:', normalizedSubmitValues);
        const response = await createClass(normalizedSubmitValues);
        console.log('Create class response:', response);
        console.log('Video URL in create data:', normalizedSubmitValues.videoUrl);
        if (response.success) {
          // Reload classes from backend
          await loadClasses();
      setAlertBox({
        open: true,
        message: 'Class created successfully!',
        onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
        onCancel: null,
        confirmText: 'OK',
        cancelText: '',
        type: 'success',
      });
        } else {
          console.error('Create class failed:', response);
          setAlertBox({
            open: true,
            message: response.message || 'Failed to create class. Please try again.',
            onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
            onCancel: null,
            confirmText: 'OK',
            cancelText: '',
            type: 'danger',
          });
        }
      } catch (error) {
        console.error('Error creating class:', error);
        setAlertBox({
          open: true,
          message: `Error creating class: ${error.message}`,
          onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
          onCancel: null,
          confirmText: 'OK',
          cancelText: '',
          type: 'danger',
        });
      }
    }
    // Reset form but preserve zoom link if it was generated
    const currentZoomLink = values.zoomLink;
    resetForm();
    setFormValues({
      ...initialValues,
      zoomLink: currentZoomLink || '' // Preserve the zoom link
    });
    setSubmitKey(prev => prev + 1);
    
    // Clear video file and editing state after successful submission
    setVideoFile(null);
    if (editingId) {
      setEditingId(null);
    }
    console.log('=== FORM SUBMISSION COMPLETED ===');
  };

  const handleEdit = (id) => {
    console.log('Edit clicked for ID:', id);
    console.log('Available classes:', classes);
    const cls = classes.find(c => c.id === id);
    console.log('Found class:', cls);
    if (cls) {
      // Properly map the class data to form values
      const mappedClassData = {
        className: cls.className || '',
        subject: cls.subject || '',
        teacher: cls.teacher || '',
        teacherId: cls.teacherId || '',
        stream: cls.stream || '',
        deliveryMethod: cls.deliveryMethod || 'online',
        deliveryOther: cls.deliveryOther || '',
        schedule: {
          day: cls.schedule?.day || '',
          startTime: cls.schedule?.startTime || '',
          endTime: cls.schedule?.endTime || '',
          frequency: cls.schedule?.frequency || 'weekly'
        },
        startDate: cls.startDate || '',
        endDate: cls.endDate || '',
        maxStudents: cls.maxStudents || 30,
        fee: cls.fee || 0,
        paymentTracking: cls.paymentTracking?.enabled || false,
        paymentTrackingFreeDays: cls.paymentTracking?.freeDays || 7,
        zoomLink: cls.zoomLink || '',
        videoUrl: cls.videoUrl || '',
        description: cls.description || '',
        courseType: cls.courseType || 'theory',
        status: cls.status || 'active',
        revisionDiscountPrice: cls.revisionDiscountPrice || '',
        relatedTheoryId: cls.relatedTheoryId || null,
        // New fields for Tute and Paper Collection
        enableTuteCollection: cls.enableTuteCollection || false,
        tuteCollectionType: cls.tuteCollectionType || 'speed_post',
        speedPostFee: cls.speedPostFee || 300,
                  // New field for Class Medium
          classMedium: cls.classMedium || 'Sinhala',
          // New fields for Zoom Join Methods
          enableNewWindowJoin: cls.enableNewWindowJoin !== undefined ? cls.enableNewWindowJoin : true,
          enableOverlayJoin: cls.enableOverlayJoin !== undefined ? cls.enableOverlayJoin : true
      };
      
      console.log('Mapped class data for form:', mappedClassData);
      setFormValues(mappedClassData);
      setEditingId(id);
      setSubmitKey(prev => prev + 1);
      
      // Set video file state if there's an existing video URL
      console.log('Class video URL:', cls.videoUrl);
      if (cls.videoUrl) {
        console.log('Setting existing video file for edit:', cls.videoUrl);
        setVideoFile({
          name: 'Existing Video', // We don't have the original filename, so use a generic name
          size: 0, // We don't have the original size
          type: 'video/*', // Generic video type
          url: cls.videoUrl,
          uploadedAt: new Date().toISOString(),
          isExisting: true // Flag to indicate this is an existing video
        });
      } else {
        setVideoFile(null);
      }
      
      // Show success message
      setAlertBox({
        open: true,
        message: `Editing class: ${cls.className}`,
        onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
        onCancel: null,
        confirmText: 'OK',
        cancelText: '',
        type: 'info',
      });
    } else {
      console.error('Class not found for ID:', id);
      setAlertBox({
        open: true,
        message: 'Class not found. Please refresh the page and try again.',
        onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
        onCancel: null,
        confirmText: 'OK',
        cancelText: '',
        type: 'danger',
      });
    }
  };

  const handleDelete = (id) => {
    console.log('Delete clicked for ID:', id);
    setAlertBox({
      open: true,
      message: 'Are you sure you want to delete this class? This will also remove it from all enrolled students.',
      onConfirm: async () => {
        try {
          const response = await deleteClass(id);
          if (response.success) {
            // Reload classes from backend
            await loadClasses();
        
        // Also remove from students' myClasses if it exists
        try {
          const myClasses = JSON.parse(localStorage.getItem('myClasses') || '[]');
          const updatedMyClasses = myClasses.filter(studentClass => 
            studentClass.classId !== id && studentClass.id !== id
          );
          
          localStorage.setItem('myClasses', JSON.stringify(updatedMyClasses));
          console.log('Removed class from myClasses localStorage for all students');
        } catch (error) {
          console.error('Error removing class from myClasses localStorage:', error);
        }
        
        if (editingId === id) {
          setEditingId(null);
          setFormValues(initialValues);
          setSubmitKey(prev => prev + 1);
        }
            
            setAlertBox({
              open: true,
              message: 'Class deleted successfully!',
              onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
              onCancel: null,
              confirmText: 'OK',
              cancelText: '',
              type: 'success',
            });
          } else {
            setAlertBox({
              open: true,
              message: 'Failed to delete class. Please try again.',
              onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
              onCancel: null,
              confirmText: 'OK',
              cancelText: '',
              type: 'danger',
            });
          }
        } catch (error) {
          console.error('Error deleting class:', error);
          setAlertBox({
            open: true,
            message: 'Failed to delete class. Please try again.',
            onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
            onCancel: null,
            confirmText: 'OK',
            cancelText: '',
            type: 'danger',
          });
        }
      },
      onCancel: () => setAlertBox(a => ({ ...a, open: false })),
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
  };

  // Sync formValues with related theory class when selectedTheoryId changes (for revision+related)
  useEffect(() => {
    if (!selectedTheoryId) return;
    if (formValues.courseType !== 'revision' || revisionRelation !== 'related') return;
    const related = classes.find(tc => String(tc.id) === String(selectedTheoryId));
    if (related) {
      setFormValues(prev => ({
        ...prev,
        className: related.className,
        subject: related.subject,
        teacher: related.teacher,
        teacherId: related.teacherId,
        stream: related.stream,
        deliveryMethod: related.deliveryMethod,
        schedule: { ...related.schedule },
        startDate: related.startDate,
        endDate: related.endDate,
        maxStudents: related.maxStudents,
        zoomLink: related.zoomLink,
        description: related.description,
        relatedTheoryId: related.id,
        // Do NOT overwrite fee or revisionDiscountPrice here!
        status: 'active',
      }));
    }
  }, [selectedTheoryId, formValues.courseType, revisionRelation, classes]);

  return (
    <>
      <BasicAlertBox
        open={alertBox.open}
        message={alertBox.message}
        onConfirm={alertBox.onConfirm}
        onCancel={alertBox.onCancel}
        confirmText={alertBox.confirmText}
        cancelText={alertBox.cancelText}
        type={alertBox.type}
      />
      <div className="p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Class Management</h1>
        <p className="mb-6 text-gray-700">Create, update, and manage classes with different delivery methods and course types.</p>

        {editingId && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <FaEdit className="text-blue-600" />
              <span className="text-blue-800 font-medium">Editing Mode Active</span>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              You are currently editing a class. Make your changes and click "Update Class" to save, or "Cancel Edit" to discard changes.
            </p>
          </div>
        )}

        <BasicForm
          key={submitKey}
          initialValues={formValues}
          enableReinitialize={true}
          validationSchema={validationSchema}
          validationContext={{ courseType: formValues.courseType }}
          onSubmit={handleSubmit}

        >
          {(props) => {
            const { errors, touched, handleChange, values, setFieldValue } = props;
            // Link teacher and teacherId
            const handleTeacherChange = (e) => {
              const selectedName = e.target.value;
              handleChange(e);
              const found = teacherList.find(t => `${t.designation} ${t.name}` === selectedName);
              if (found && setFieldValue) {
                setFieldValue('teacher', `${found.designation} ${found.name}`);
                setFieldValue('teacherId', found.teacherId); // Store TeacherId for display
              } else if (setFieldValue) {
                setFieldValue('teacherId', '');
              }
            };
            // Move handleGenerateZoomLink here so setFieldValue is in scope
            const handleGenerateZoomLink = async () => {
              setZoomLoading(true);
              setZoomError('');
              try {
                await new Promise(res => setTimeout(res, 1000));
                const randomId = Math.floor(100000000 + Math.random() * 900000000);
                const zoomUrl = `https://zoom.us/j/${randomId}`;
                setFieldValue('zoomLink', zoomUrl);
              } catch (err) {
                setZoomError('Failed to generate Zoom link. Please try again.');
              } finally {
                setZoomLoading(false);
              }
            };

            const handleVideoUpload = async (file) => {
              console.log('Video upload started with file:', file);
              if (!file) return;
              
              // Validate file type
              const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv'];
              if (!allowedTypes.includes(file.type)) {
                setAlertBox({
                  open: true,
                  message: 'Please select a valid video file (MP4, AVI, MOV, WMV, FLV)',
                  onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
                  onCancel: null,
                  confirmText: 'OK',
                  cancelText: '',
                  type: 'danger',
                });
                return;
              }

              // Validate file size (max 500MB)
              const maxSize = 500 * 1024 * 1024; // 500MB
              if (file.size > maxSize) {
                setAlertBox({
                  open: true,
                  message: 'Video file size must be less than 500MB',
                  onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
                  onCancel: null,
                  confirmText: 'OK',
                  cancelText: '',
                  type: 'danger',
                });
                return;
              }

              setVideoUploading(true);
              setVideoUploadProgress(0);
              
              try {
                // Simulate upload progress
                const uploadInterval = setInterval(() => {
                  setVideoUploadProgress(prev => {
                    if (prev >= 90) {
                      clearInterval(uploadInterval);
                      return 90;
                    }
                    return prev + 10;
                  });
                }, 200);

                // Simulate upload delay
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                clearInterval(uploadInterval);
                setVideoUploadProgress(100);
                
                // Store file info (in real implementation, this would be uploaded to server)
                const videoFileData = {
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  url: URL.createObjectURL(file), // For preview
                  uploadedAt: new Date().toISOString()
                };
                console.log('Setting video file data:', videoFileData);
                setVideoFile(videoFileData);
                // Also set the form field value for validation
                setFieldValue('videoUrl', videoFileData.url);

                setAlertBox({
                  open: true,
                  message: 'Video uploaded successfully!',
                  onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
                  onCancel: null,
                  confirmText: 'OK',
                  cancelText: '',
                  type: 'success',
                });
              } catch (error) {
                console.error('Error uploading video:', error);
                setAlertBox({
                  open: true,
                  message: 'Failed to upload video. Please try again.',
                  onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
                  onCancel: null,
                  confirmText: 'OK',
                  cancelText: '',
                  type: 'danger',
                });
              } finally {
                setVideoUploading(false);
                setVideoUploadProgress(0);
              }
            };

            // Get all theory classes for dropdown
            const theoryClasses = classes.filter(c => c.courseType === 'theory');

            // Autofill revision fields when related theory class is selected
            const handleRelatedTheoryChange = (e) => {
              const selectedId = e.target.value;
              setSelectedTheoryId(selectedId);
              const selectedTheory = theoryClasses.find(c => String(c.id) === String(selectedId));
              if (selectedTheory && setFieldValue) {
                // Set all required fields in Formik state
                setFieldValue('className', selectedTheory.className, false);
                setFieldValue('subject', selectedTheory.subject, false);
                setFieldValue('teacher', selectedTheory.teacher, false);
                setFieldValue('teacherId', selectedTheory.teacherId, false);
                setFieldValue('stream', selectedTheory.stream, false);
                setFieldValue('deliveryMethod', selectedTheory.deliveryMethod, false);
                setFieldValue('schedule.day', selectedTheory.schedule.day, false);
                setFieldValue('schedule.startTime', selectedTheory.schedule.startTime, false);
                setFieldValue('schedule.endTime', selectedTheory.schedule.endTime, false);
                setFieldValue('schedule.frequency', selectedTheory.schedule.frequency, false);
                setFieldValue('startDate', selectedTheory.startDate, false);
                setFieldValue('endDate', selectedTheory.endDate, false);
                setFieldValue('maxStudents', selectedTheory.maxStudents, false);
                setFieldValue('zoomLink', selectedTheory.zoomLink, false);
                setFieldValue('description', selectedTheory.description, false);
                setFieldValue('relatedTheoryId', selectedTheory.id, false); // for table mapping
                // Always require user to enter fee and discount for revision, so clear them
                setFieldValue('fee', '', false);
                setFieldValue('revisionDiscountPrice', '', false);
                setFieldValue('status', 'active', false);
              }
            };

            return (
              <div className="mb-8 space-y-6">
                {/* Course Type at the top */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Course Type *</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="courseType"
                        value="theory"
                        checked={values.courseType === 'theory'}
                        onChange={e => {
                          handleChange(e);
                          setRevisionRelation('none');
                        }}
                        className="mr-2"
                      />
                      <div>
                        <div className="font-medium">Theory</div>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="courseType"
                        value="revision"
                        checked={values.courseType === 'revision'}
                        onChange={e => {
                          handleChange(e);
                          setRevisionRelation('none');
                        }}
                        className="mr-2"
                      />
                      <div>
                        <div className="font-medium">Revision</div>
                      </div>
                    </label>
                  </div>
                  {errors.courseType && touched.courseType && (
                    <div className="text-red-600 text-sm mt-1">{errors.courseType}</div>
                  )}
                </div>

                {/* If Revision, show related/unrelated options */}
                {values.courseType === 'revision' && (
                  <div className="flex flex-col md:flex-row items-center gap-4 p-3 bg-blue-50 rounded-lg">
                    <label className="text-sm text-blue-800 font-medium min-w-max">Revision Class Relation:</label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="revisionRelation"
                        value="related"
                        checked={revisionRelation === 'related'}
                        onChange={() => setRevisionRelation('related')}
                        className="mr-2"
                      />
                      <span>Related Theory Class</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="revisionRelation"
                        value="unrelated"
                        checked={revisionRelation === 'unrelated'}
                        onChange={() => setRevisionRelation('unrelated')}
                        className="mr-2"
                      />
                      <span>No Related Class</span>
                    </label>
                  </div>
                )}

                {/* If related, show theory class dropdown and autofill */}
                {values.courseType === 'revision' && revisionRelation === 'related' && (
                  <div className="flex flex-col md:flex-row items-center gap-4 p-3 bg-blue-100 rounded-lg">
                    <label className="text-sm text-blue-900 font-medium min-w-max">Select Related Theory Class:</label>
                    <select
                      className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={handleRelatedTheoryChange}
                      value={selectedTheoryId}
                    >
                      <option key="default-related-theory" value="">Select Theory Class</option>
                      {theoryClasses.map(tc => (
                        <option key={`theory-${tc.id}`} value={tc.id}>{tc.className} ({tc.subject}) - {tc.teacher}</option>
                      ))}
                    </select>
                  </div>
                )}
                {/* Basic Information */}
                {values.courseType === 'revision' && revisionRelation === 'related' && selectedTheoryId ? (
                  (() => {
                    const related = classes.find(tc => String(tc.id) === String(selectedTheoryId));
                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 rounded p-3">
                          {/* Class Name */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Class Name *</label>
                            <input type="text" className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-900 w-full" value={related?.className || ''} disabled readOnly />
                            {/* Hidden input for Formik */}
                            <input type="hidden" name="className" value={related?.className || ''} />
                          </div>
                          {/* Subject */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                            <input type="text" className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-900 w-full" value={related?.subject || ''} disabled readOnly />
                            <input type="hidden" name="subject" value={related?.subject || ''} />
                          </div>
                          {/* Teacher */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Teacher *</label>
                            <input type="text" className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-900 w-full" value={related?.teacher || ''} disabled readOnly />
                            <input type="hidden" name="teacher" value={related?.teacher || ''} />
                          </div>
                          {/* Stream */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Stream *</label>
                            <input type="text" className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-900 w-full" value={related?.stream || ''} disabled readOnly />
                            <input type="hidden" name="stream" value={related?.stream || ''} />
                          </div>
                        </div>
                        {/* Discount Price Input for Revision class (for theory students) - styled as in image */}
                        <div className="flex flex-col md:flex-row items-center gap-4 p-3 bg-blue-50 rounded-lg mt-2">
                          <label className="text-sm text-blue-800 font-medium min-w-max">Discount for Theory Students (Rs.)</label>
                          <input
                            type="number"
                            name="revisionDiscountPrice"
                            value={values.revisionDiscountPrice || ''}
                            onChange={handleChange}
                            min="0"
                            className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter discount price for theory students (Rs.)"
                          />
                        </div>

                      </>
                    );
                  })()
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CustomTextField
                      id="className"
                      name="className"
                      type="text"
                      label="Class Name *"
                      value={values.className}
                      onChange={handleChange}
                      error={errors.className}
                      touched={touched.className}
                      icon={FaGraduationCap}
                    />
                    <CustomTextField
                      id="subject"
                      name="subject"
                      type="text"
                      label="Subject *"
                      value={values.subject}
                      onChange={handleChange}
                      error={errors.subject}
                      touched={touched.subject}
                      icon={FaBook}
                    />
                    <CustomSelectField
                      id="teacher"
                      name="teacher"
                      label="Teacher *"
                      value={values.teacher}
                      onChange={handleTeacherChange}
                      options={teacherOptions}
                      error={errors.teacher}
                      touched={touched.teacher}
                      required
                    />
                    {/* Show Teacher ID after selecting Teacher Name */}
                    {values.teacher && (
                      <div className="flex flex-col justify-end">
                        <label className="text-xs font-medium text-gray-700 mb-1">Teacher ID</label>
                        <div className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-normal">
                          {teacherList.find(t => `${t.designation} ${t.name}` === values.teacher)?.teacherId || ''}
                        </div>
                      </div>
                    )}
                    <CustomSelectField
                      id="stream"
                      name="stream"
                      label="Stream *"
                      value={values.stream}
                      onChange={handleChange}
                      options={streamOptions}
                      error={errors.stream}
                      touched={touched.stream}
                      required
                    />
                  </div>
                )}
                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomTextField
                    id="startDate"
                    name="startDate"
                    type="date"
                    label="Start Date *"
                    value={values.startDate}
                    onChange={handleChange}
                    error={errors.startDate}
                    touched={touched.startDate}
                    icon={FaCalendar}
                  />
                  <CustomTextField
                    id="endDate"
                    name="endDate"
                    type="date"
                    label="End Date *"
                    value={values.endDate}
                    onChange={handleChange}
                    error={errors.endDate}
                    touched={touched.endDate}
                    icon={FaCalendar}
                  />
                </div>
                {/* Delivery Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Delivery Method *</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="deliveryMethod"
                          value="physical"
                          checked={values.deliveryMethod === 'physical'}
                          onChange={handleChange}
                          className="mr-2"
                        />
                        <div>
                          <div className="font-medium">Physical Only</div>
                          <div className="text-sm text-gray-500">In-person classes only</div>
                        </div>
                      </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value="online"
                        checked={values.deliveryMethod === 'online'}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <div>
                        <div className="font-medium">Online Only</div>
                          <div className="text-sm text-gray-500">Live streaming classes only</div>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="deliveryMethod"
                          value="hybrid1"
                          checked={values.deliveryMethod === 'hybrid1'}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <div>
                          <div className="font-medium">Hybrid 1</div>
                          <div className="text-sm text-gray-500">Physical + Online</div>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="deliveryMethod"
                          value="hybrid2"
                          checked={values.deliveryMethod === 'hybrid2'}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <div>
                          <div className="font-medium">Hybrid 2</div>
                          <div className="text-sm text-gray-500">Physical + Recorded</div>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="deliveryMethod"
                          value="hybrid3"
                          checked={values.deliveryMethod === 'hybrid3'}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <div>
                          <div className="font-medium">Hybrid 3</div>
                          <div className="text-sm text-gray-500">Online + Recorded</div>
                      </div>
                    </label>
                      <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="deliveryMethod"
                          value="hybrid4"
                          checked={values.deliveryMethod === 'hybrid4'}
                      onChange={handleChange}
                          className="mr-2"
                        />
                        <div>
                          <div className="font-medium">Hybrid 4</div>
                          <div className="text-sm text-gray-500">Physical + Online + Recorded</div>
                        </div>
                      </label>
                    </div>
                  {errors.deliveryMethod && touched.deliveryMethod && (
                    <div className="text-red-600 text-sm mt-1">{errors.deliveryMethod}</div>
                  )}
                </div>
                {/* Schedule */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomSelectField
                    id="schedule.frequency"
                    name="schedule.frequency"
                    label="Frequency"
                    value={values.schedule.frequency}
                    onChange={handleChange}
                    options={[
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'bi-weekly', label: 'Bi-weekly' },
                      { value: 'monthly', label: 'Monthly' },
                      { value: 'no-schedule', label: 'No Schedule' },
                    ]}
                    error={errors.schedule?.frequency}
                    touched={touched.schedule?.frequency}
                    disabled={values.courseType === 'theory+revision'}
                  />
                  {values.schedule.frequency !== 'no-schedule' && (
                    <>
                      <CustomSelectField
                        id="schedule.day"
                        name="schedule.day"
                        label="Day"
                        value={values.schedule.day}
                        onChange={handleChange}
                        options={[
                          { value: '', label: 'Select Day' },
                          { value: 'Monday', label: 'Monday' },
                          { value: 'Tuesday', label: 'Tuesday' },
                          { value: 'Wednesday', label: 'Wednesday' },
                          { value: 'Thursday', label: 'Thursday' },
                          { value: 'Friday', label: 'Friday' },
                          { value: 'Saturday', label: 'Saturday' },
                          { value: 'Sunday', label: 'Sunday' },
                        ]}
                        error={errors.schedule?.day}
                        touched={touched.schedule?.day}
                        disabled={values.courseType === 'theory+revision'}
                      />
                      <CustomTextField
                        id="schedule.startTime"
                        name="schedule.startTime"
                        type="time"
                        label="Start Time"
                        value={values.schedule.startTime}
                        onChange={handleChange}
                        error={errors.schedule?.startTime}
                        touched={touched.schedule?.startTime}
                        icon={FaClock}
                        disabled={values.courseType === 'theory+revision'}
                      />
                      <CustomTextField
                        id="schedule.endTime"
                        name="schedule.endTime"
                        type="time"
                        label="End Time"
                        value={values.schedule.endTime}
                        onChange={handleChange}
                        error={errors.schedule?.endTime}
                        touched={touched.schedule?.endTime}
                        icon={FaClock}
                        disabled={values.courseType === 'theory+revision'}
                      />
                    </>
                  )}
                </div>
                {/* Class Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomTextField
                    id="maxStudents"
                    name="maxStudents"
                    type="number"
                    label="Maximum Students"
                    value={values.maxStudents}
                    onChange={handleChange}
                    error={errors.maxStudents}
                    touched={touched.maxStudents}
                    icon={FaUsers}
                    min="1"
                  />
                  <CustomTextField
                    id="fee"
                    name="fee"
                    type="number"
                    label="Class Fee (Rs.)"
                    value={values.fee}
                    onChange={handleChange}
                    error={errors.fee}
                    touched={touched.fee}
                    icon={FaMoneyBill}
                    min="0"
                  />
                  <CustomSelectField
                    id="status"
                    name="status"
                    label="Status *"
                    value={values.status}
                    onChange={handleChange}
                    options={statusOptions}
                    error={errors.status}
                    touched={touched.status}
                    required
                  />
                  <CustomSelectField
                    id="classMedium"
                    name="classMedium"
                    label="Class Medium *"
                    value={values.classMedium}
                    onChange={handleChange}
                    options={classMediumOptions}
                    error={errors.classMedium}
                    touched={touched.classMedium}
                    required
                  />
                </div>
                {/* Tute and Paper Collection Settings */}
                <div className="border-t pt-4 mb-4">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Payment Tracking and Tute Collection Settings</h3>
                  <div className="flex flex-col md:flex-row items-center mb-4 gap-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="enableTuteCollection"
                        checked={values.enableTuteCollection}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <label className="text-sm text-gray-700 font-medium">
                        Enable Tute and Paper Collection
                      </label>
                    </div>
                  </div>
                  {values.enableTuteCollection && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CustomSelectField
                        id="tuteCollectionType"
                        name="tuteCollectionType"
                        label="Collection Type *"
                        value={values.tuteCollectionType}
                        onChange={handleChange}
                        options={tuteCollectionTypeOptions}
                        error={errors.tuteCollectionType}
                        touched={touched.tuteCollectionType}
                        required
                      />
                      <CustomTextField
                        id="speedPostFee"
                        name="speedPostFee"
                        type="number"
                        label="Speed Post Fee (Rs.)"
                        value={values.speedPostFee}
                        onChange={handleChange}
                        error={errors.speedPostFee}
                        touched={touched.speedPostFee}
                        icon={FaMoneyBill}
                        min="0"
                        disabled={values.tuteCollectionType === 'physical_class'}
                      />
                    </div>
                  )}
                </div>
                {/* Payment Tracking (for all classes) */}
                <div className="flex flex-col md:flex-row items-center mb-2 gap-2">
                  <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="paymentTracking"
                    checked={values.paymentTracking}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <label className="text-sm text-gray-700">
                      Enable Payment Tracking
                  </label>
                  </div>
                  {values.paymentTracking && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-700">First </label>
                      <input
                        type="number"
                        name="paymentTrackingFreeDays"
                        min="1"
                        max="31"
                        value={values.paymentTrackingFreeDays || 7}
                        onChange={handleChange}
                        className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-500">days free of the month</span>
                    </div>
                  )}
                </div>
                {/* Zoom Link for online and hybrid classes */}
                {(values.deliveryMethod === 'online' || values.deliveryMethod === 'hybrid1' || values.deliveryMethod === 'hybrid3' || values.deliveryMethod === 'hybrid4') && (
                  <div>
                    <div className="mb-2">
                      <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                        <FaVideo className="inline mr-1" />
                        <strong>Zoom Link Required:</strong> For online and hybrid classes with online component, you must provide a zoom link. You can either enter one manually or click "Create Zoom Link" to generate one automatically.
                      </div>
                    </div>
                    
                    {/* Zoom Join Method Settings */}
                    <div className="border-t pt-4 mb-4">
                      <h3 className="text-lg font-semibold mb-4 text-gray-800">Zoom Join Method Settings</h3>
                      <div className="text-sm text-gray-600 mb-4">
                        Choose which join methods students can use when joining this class:
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center p-3 border rounded-lg">
                          <input
                            type="checkbox"
                            name="enableNewWindowJoin"
                            checked={values.enableNewWindowJoin}
                            onChange={handleChange}
                            className="mr-3"
                          />
                          <div>
                            <label className="text-sm font-medium text-gray-700">
                              New Window (Recommended) ⭐
                            </label>
                            <div className="text-xs text-gray-500">
                              Opens in a separate window with full features - Default selection for students
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center p-3 border rounded-lg">
                          <input
                            type="checkbox"
                            name="enableOverlayJoin"
                            checked={values.enableOverlayJoin}
                            onChange={handleChange}
                            className="mr-3"
                          />
                          <div>
                            <label className="text-sm font-medium text-gray-700">
                              Overlay View
                            </label>
                            <div className="text-xs text-gray-500">
                              Opens as an overlay on the current page
                            </div>
                          </div>
                        </div>
                      </div>
                      {!values.enableNewWindowJoin && !values.enableOverlayJoin && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200 mt-2">
                          ⚠️ At least one join method must be enabled for students to join the class.
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <CustomTextField
                        id="zoomLink"
                        name="zoomLink"
                        type="url"
                        label="Zoom Link *"
                        value={values.zoomLink}
                        onChange={handleChange}
                        error={errors.zoomLink}
                        touched={touched.zoomLink}
                        icon={FaVideo}
                        placeholder="https://zoom.us/j/..."
                      />
                      <CustomButton
                        type="button"
                        onClick={handleGenerateZoomLink}
                        className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                        disabled={zoomLoading}
                      >
                        {zoomLoading ? 'Generating...' : 'Create Zoom Link'}
                      </CustomButton>
                    </div>
                    {zoomError && <div className="text-red-600 text-sm mt-1">{zoomError}</div>}
                    {!values.zoomLink && (values.deliveryMethod === 'online' || values.deliveryMethod === 'hybrid1' || values.deliveryMethod === 'hybrid3' || values.deliveryMethod === 'hybrid4') && (
                      <div className="text-orange-600 text-sm mt-1">
                        ⚠️ Please enter a zoom link or click "Create Zoom Link" to generate one.
                      </div>
                    )}
                  </div>
                )}
                
                {/* Video Upload for recorded content */}
                {(values.deliveryMethod === 'hybrid2' || values.deliveryMethod === 'hybrid3' || values.deliveryMethod === 'hybrid4') && (
                  <div>
                    <div className="mb-2">
                      <div className="text-sm text-green-600 bg-green-50 p-2 rounded border border-green-200">
                        <FaVideo className="inline mr-1" />
                        <strong>Recorded Video Required:</strong> For hybrid classes with recorded content, you must upload a video file. Students will be able to watch this video during the scheduled class time.
                      </div>
                    </div>
                    
                    {/* Video Upload Section */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                      {!videoFile ? (
                        <div className="text-center">
                          <div className="mb-4">
                            <FaVideo className="mx-auto h-12 w-12 text-gray-400" />
                          </div>
                          <div className="mb-4">
                            <label htmlFor="video-upload" className="cursor-pointer">
                              <span className="mt-2 block text-sm font-medium text-gray-900">
                                Upload Video File
                              </span>
                              <span className="mt-1 block text-xs text-gray-500">
                                MP4, AVI, MOV, WMV, FLV up to 500MB
                              </span>
                            </label>
                          </div>
                          <input
                            id="video-upload"
                            name="video-upload"
                            type="file"
                            accept="video/*"
                            className="sr-only"
                            onChange={(e) => {
                              console.log('Video file input changed:', e.target.files[0]);
                              const file = e.target.files[0];
                              if (file) {
                                handleVideoUpload(file);
                              }
                            }}
                            disabled={videoUploading}
                          />
                          <CustomButton
                            type="button"
                            onClick={() => {
                              console.log('Choose video file clicked');
                              const input = document.getElementById('video-upload');
                              console.log('Video input element:', input);
                              if (input) {
                                input.click();
                              } else {
                                console.error('Video input element not found');
                              }
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                            disabled={videoUploading}
                          >
                            {videoUploading ? 'Uploading...' : 'Choose Video File'}
                          </CustomButton>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="mb-4">
                            <FaVideo className="mx-auto h-8 w-8 text-green-600" />
                          </div>
                          <div className="mb-2">
                            <h3 className="text-sm font-medium text-gray-900">
                              {videoFile.isExisting ? 'Existing Video' : videoFile.name}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {videoFile.isExisting ? (
                                `Existing video • Last updated ${new Date(videoFile.uploadedAt).toLocaleDateString()}`
                              ) : (
                                `${(videoFile.size / (1024 * 1024)).toFixed(2)} MB • Uploaded ${new Date(videoFile.uploadedAt).toLocaleDateString()}`
                              )}
                            </p>
                          </div>
                          <div className="flex justify-center">
                            <CustomButton
                              type="button"
                              onClick={() => {
                                console.log('Remove video clicked');
                                setVideoFile(null);
                                setFieldValue('videoUrl', '');
                              }}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                            >
                              Remove Video
                            </CustomButton>
                          </div>
                        </div>
                      )}
                      
                      {/* Upload Progress */}
                      {videoUploading && (
                        <div className="mt-4">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Uploading...</span>
                            <span>{videoUploadProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${videoUploadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Video URL is handled in form submission, no hidden input needed */}
                  </div>
                )}
                
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={values.description}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter class description..."
                  />
                </div>
                {/* Form Actions */}
                <div className="flex justify-center gap-4">
                  {editingId && (
                    <CustomButton
                      type="button"
                      onClick={() => {
                        console.log('Cancel edit clicked');
                        setEditingId(null);
                        setFormValues(initialValues);
                        setVideoFile(null);
                        setSubmitKey(prev => prev + 1);
                        setAlertBox({
                          open: true,
                          message: 'Edit cancelled. You can now create a new class.',
                          onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
                          onCancel: null,
                          confirmText: 'OK',
                          cancelText: '',
                          type: 'info',
                        });
                      }}
                      className="px-4 py-2 bg-gray-500 text-white hover:bg-gray-600 active:bg-gray-700 rounded flex items-center justify-center gap-2"
                    >
                      <FaTimes /> Cancel Edit
                    </CustomButton>
                  )}
                  <CustomButton
                    type="submit"
                    className="px-4 py-2 bg-[#1a365d] text-white hover:bg-[#13294b] active:bg-[#0f2038] rounded flex items-center justify-center gap-2"
                  >
                    {editingId ? <FaEdit /> : <FaPlus />} {editingId ? 'Update Class' : 'Create Class'}
                  </CustomButton>
                  <CustomButton
                    type="button"
                    onClick={() => {
                      console.log('Test button clicked');
                      console.log('Current form values:', values);
                      console.log('Current video file:', videoFile);
                    }}
                    className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded flex items-center justify-center gap-2"
                  >
                    Test Form State
                  </CustomButton>
                </div>
              </div>
            );
          }}
        </BasicForm>

        {/* Classes List */}
        <div className="border-t-2 pt-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">All Classes</h2>
            <div className="flex gap-2">
              <CustomButton
                onClick={loadClasses}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                <FaSync className={`mr-1 ${loading ? 'animate-spin' : ''}`} /> 
                {loading ? 'Loading...' : 'Refresh'}
              </CustomButton>
            <CustomButton
              onClick={() => {
                const hasUpdates = syncMyClassesWithAdminClasses();
                if (hasUpdates) {
                  alert('Successfully synced all enrolled students with the latest class information!');
                } else {
                  alert('No updates needed. All enrolled students already have the latest information.');
                }
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
            >
              <FaSync className="mr-1" /> Sync Student Data
            </CustomButton>
          </div>
          </div>

          {/* Filters Section */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search classes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      searchTerm ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
                  />
                  <FaSearch className={`absolute left-3 top-3 ${searchTerm ? 'text-blue-500' : 'text-gray-400'}`} />
                </div>
              </div>
              
              {/* Stream Filter */}
              <div className="flex-1">
                <select
                  value={streamFilter}
                  onChange={(e) => setStreamFilter(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    streamFilter ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  {streamFilterOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Status Filter */}
              <div className="flex-1">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    statusFilter ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  {statusFilterOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Delivery Method Filter */}
              <div className="flex-1">
                <select
                  value={deliveryMethodFilter}
                  onChange={(e) => setDeliveryMethodFilter(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    deliveryMethodFilter ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  {deliveryMethodFilterOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Filter Summary */}
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {sortedAndFilteredClasses.length} of {classes.length} classes
                {(searchTerm || streamFilter || statusFilter || deliveryMethodFilter) && (
                  <span className="ml-2">
                    (filtered by: {[
                      searchTerm && 'search',
                      streamFilter && 'stream',
                      statusFilter && 'status',
                      deliveryMethodFilter && 'delivery method'
                    ].filter(Boolean).join(', ')})
                  </span>
                )}
                {sortConfig.key && (
                  <span className="ml-2">
                    • sorted by {sortConfig.key} ({sortConfig.direction === 'asc' ? 'ascending' : 'descending'})
                  </span>
                )}
              </div>
              
              {/* Clear Filters Button */}
              {(searchTerm || streamFilter || statusFilter || deliveryMethodFilter || sortConfig.key) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStreamFilter('');
                    setStatusFilter('');
                    setDeliveryMethodFilter('');
                    setSortConfig({ key: '', direction: 'asc' });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear All Filters & Sort
                </button>
              )}
          </div>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading classes...</div>
            </div>
          ) : sortedAndFilteredClasses.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2">
                {classes.length === 0 ? 'No classes found.' : 'No classes match your current filters.'}
              </div>
              {(searchTerm || streamFilter || statusFilter || deliveryMethodFilter || sortConfig.key) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStreamFilter('');
                    setStatusFilter('');
                    setDeliveryMethodFilter('');
                    setSortConfig({ key: '', direction: 'asc' });
                  }}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear all filters & sort
                </button>
              )}
            </div>
          ) : (
          <BasicTable
            rowClassName={row => editingId === row.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}
            columns={[
              { key: 'className', label: 'Class Name', sortable: true, render: row => {
                // For revision class with related theory, show related theory className
                if (row.courseType === 'revision' && row.relatedTheoryId) {
                  const related = classes.find(c => String(c.id) === String(row.relatedTheoryId));
                  return related ? related.className : (row.className || 'N/A');
                }
                return row.className || 'N/A';
              } },
              { key: 'subject', label: 'Subject', sortable: true, render: row => {
                if (row.courseType === 'revision' && row.relatedTheoryId) {
                  const related = classes.find(c => String(c.id) === String(row.relatedTheoryId));
                  return related ? related.subject : (row.subject || 'N/A');
                }
                return row.subject || 'N/A';
              } },
              { key: 'teacher', label: 'Teacher', sortable: true, render: row => {
                if (row.courseType === 'revision' && row.relatedTheoryId) {
                  const related = classes.find(c => String(c.id) === String(row.relatedTheoryId));
                  return related ? related.teacher : (row.teacher || 'N/A');
                }
                return row.teacher || 'N/A';
              } },
              { key: 'stream', label: 'Stream', sortable: true, render: row => {
                if (row.courseType === 'revision' && row.relatedTheoryId) {
                  const related = classes.find(c => String(c.id) === String(row.relatedTheoryId));
                  return related ? related.stream : (row.stream || 'N/A');
                }
                return row.stream || 'N/A';
              } },
              { key: 'deliveryMethod', label: 'Delivery', sortable: true, render: row => {
                const method = row.deliveryMethod || 'N/A';
                const methodLabels = {
                  'physical': 'Physical Only',
                  'online': 'Online Only',
                  'hybrid1': 'Hybrid 1 (Physical + Online)',
                  'hybrid2': 'Hybrid 2 (Physical + Recorded)',
                  'hybrid3': 'Hybrid 3 (Online + Recorded)',
                  'hybrid4': 'Hybrid 4 (Physical + Online + Recorded)'
                };
                return methodLabels[method] || method;
              } },
              { key: 'schedule', label: 'Schedule', sortable: true, render: row => {
                if (!row.schedule) return 'N/A';
                if (row.schedule.frequency === 'no-schedule') {
                  return 'No Schedule';
                }
                return `${formatDay(row.schedule.day)} ${formatTime(row.schedule.startTime)}-${formatTime(row.schedule.endTime)}`;
              } },
              { key: 'fee', label: 'Fee', sortable: true, render: row => {
                let fee = Number(row.fee) || 0;
                // For revision class, show discount for theory students
                if (row.courseType === 'revision' && row.revisionDiscountPrice) {
                  return <span>Rs. {fee} <span className="text-xs text-blue-700">(Theory student: Rs. {Math.max(0, fee - Number(row.revisionDiscountPrice))})</span></span>;
                }
                return `Rs. ${fee}`;
              } },
              { key: 'courseType', label: 'Course Type', sortable: true, render: row => row.courseType || 'N/A' },
              { key: 'revisionDiscountPrice', label: 'Theory Student Discount', sortable: true, render: row => row.courseType === 'revision' && row.revisionDiscountPrice ? `Rs. ${row.revisionDiscountPrice}` : '' },
              { key: 'status', label: 'Status', sortable: true, render: row => {
                if (row.status === 'active') return <span className="px-2 py-1 rounded bg-green-100 text-green-800 font-semibold">Active</span>;
                if (row.status === 'inactive') return <span className="px-2 py-1 rounded bg-red-100 text-red-800 font-semibold">Inactive</span>;
                return row.status || 'N/A';
              } },
            ]}
            data={sortedAndFilteredClasses}
            onSort={handleSort}
            sortConfig={sortConfig}
            actions={row => (
              <div className="flex gap-2">
                <button
                  className={`${editingId === row.id ? 'text-green-600 bg-green-100 p-1 rounded' : 'text-blue-600 hover:underline'}`}
                  onClick={() => handleEdit(row.id)}
                  title={editingId === row.id ? "Currently Editing" : "Edit"}
                >
                  <FaEdit />
                </button>
                <button
                  className="text-red-600 hover:underline"
                  onClick={() => handleDelete(row.id)}
                  title="Delete"
                >
                  <FaTrash />
                </button>
              </div>
            )}
          />
          )}
        </div>
      </div>
    </>
  );
};

export default CreateClass;

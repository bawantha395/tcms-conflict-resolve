import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import BasicAlertBox from '../../../components/BasicAlertBox';
import teacherSidebarSections from './TeacherDashboardSidebar';
import BasicForm from '../../../components/BasicForm';
import CustomTextField from '../../../components/CustomTextField';
import CustomButton from '../../../components/CustomButton';
import CustomSelectField from '../../../components/CustomSelectField';
import { FaEdit, FaTrash, FaPlus, FaCalendar, FaBook, FaUser, FaClock, FaDoorOpen, FaVideo } from 'react-icons/fa';
import * as Yup from 'yup';
import BasicTable from '../../../components/BasicTable';
import { getClassesByTeacher, getSessionSchedulesByTeacher, createSessionSchedule, updateSessionSchedule, deleteSessionSchedule } from '../../../api/classes';
import { getUserData } from '../../../api/apiUtils';

const deliveryMethodOptions = [
  { value: 'online', label: 'Online' },
  { value: 'physical', label: 'Physical' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'other', label: 'Other' },
];

const validationSchema = Yup.object().shape({
  className: Yup.string().required('Class Name is required'),
  subject: Yup.string().required('Subject is required'),
  teacher: Yup.string().required('Teacher is required'),
  teacherId: Yup.string().required('Teacher ID is required'),
  date: Yup.string().required('Date is required'),
  startTime: Yup.string().required('Start Time is required'),
  endTime: Yup.string().required('End Time is required'),
  deliveryMethod: Yup.string().oneOf(['online', 'physical', 'hybrid', 'other'], 'Invalid delivery method').required('Delivery Method is required'),
  deliveryOther: Yup.string().when('deliveryMethod', {
    is: (val) => val === 'other',
    then: (schema) => schema.required('Please specify delivery method'),
    otherwise: (schema) => schema.notRequired(),
  }),
  zoomLink: Yup.string().when('deliveryMethod', {
    is: (val) => val === 'online' || val === 'hybrid',
    then: (schema) => schema.required('Zoom Link is required'),
    otherwise: (schema) => schema.notRequired(), // Optional for 'other' and 'physical'
  }),

  status: Yup.string().oneOf(['active', 'inactive'], 'Invalid status').required('Status is required'),
  description: Yup.string(),
});

const initialValues = {
  className: '',
  subject: '',
  teacher: '',
  teacherId: '',
  date: '',
  startTime: '',
  endTime: '',
  deliveryMethod: 'online',
  deliveryOther: '',
  zoomLink: '',

  status: 'active',
  description: '',
};

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hour, minute] = timeStr.split(':');
  let h = parseInt(hour, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${minute} ${ampm}`;
}

function ManageClassSchedules() {
  const [classes, setClasses] = useState([]); // For teacher's classes
  const [schedules, setSchedules] = useState([]); // For session schedules
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formValues, setFormValues] = useState(initialValues);
  const [submitKey, setSubmitKey] = useState(0);
  const [alertBox, setAlertBox] = useState({ open: false, message: '', onConfirm: null, onCancel: null, confirmText: 'Delete', cancelText: 'Cancel', type: 'danger' });
  const [zoomLoading, setZoomLoading] = useState(false);
  const [zoomError, setZoomError] = useState('');



  // Fetch teacher's classes and session schedules from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Get teacher data from storage
        const teacherData = getUserData();
        
        // Check if we have teacher data with teacherId
        const teacherId = teacherData?.teacherId || teacherData?.id || teacherData?.userid || null;
        
        if (teacherId) {
          // Fetch teacher's classes (for dropdown options)
          const classesResponse = await getClassesByTeacher(teacherId);
          if (classesResponse.success) {
            setClasses(classesResponse.data || []);
          }
          
          // Fetch teacher's session schedules
          const schedulesResponse = await getSessionSchedulesByTeacher(teacherId);
          if (schedulesResponse.success) {
            setSchedules(schedulesResponse.data || []);
          } else {
            setError(schedulesResponse.message || 'Failed to load session schedules');
          }
        } else {
          setError('Teacher information not found. Please log in again.');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array to run only once

  // Get class options from teacher's classes
  const classOptions = [
    { value: '', label: 'Select Class', key: 'select-class' },
    ...classes.map(c => ({ 
      value: c.className, 
      label: c.className,
      key: `class-${c.id}`,
      subject: c.subject,
      teacher: c.teacher,
      teacherId: c.teacherId
    }))
  ];

  // Get unique subjects from teacher's classes
  const subjectOptions = [
    { value: '', label: 'Select Subject', key: 'select-subject' },
    ...Array.from(new Set(classes.map(c => c.subject))).map(subject => ({ 
      value: subject, 
      label: subject,
      key: `subject-${subject}`
    }))
  ];

  // Get teacher options from teacher's classes
  const teacherOptions = [
    { value: '', label: 'Select Teacher', key: 'select-teacher' },
    ...classes.map(t => ({ 
      value: `${t.designation || ''} ${t.teacher}`, 
      label: `${t.designation || ''} ${t.teacher}`,
      key: `teacher-${t.teacherId}` // Use teacherId as unique key
    }))
  ];

  const handleSubmit = async (values, { resetForm }) => {
    try {
      console.log('Form submitted with values:', values);
              const teacherData = getUserData();
        const teacherId = teacherData?.teacherId || teacherData?.id || teacherData?.userid;
        console.log('Teacher ID:', teacherId);
      
      // Always ensure teacherId is set if teacher is selected
      let submitValues = { ...values };
      if (!submitValues.teacherId && submitValues.teacher) {
        const found = classes.find(t => `${t.designation || ''} ${t.teacher}` === submitValues.teacher);
        if (found) submitValues.teacherId = found.teacherId;
      }
      console.log('Final submit values:', submitValues);
      
      if (editingId) {
        // Update existing session schedule
        const response = await updateSessionSchedule(editingId, { ...submitValues, teacherId });
        if (response.success) {
          // Refresh schedules
          const schedulesResponse = await getSessionSchedulesByTeacher(teacherId);
          if (schedulesResponse.success) {
            setSchedules(schedulesResponse.data || []);
          }
          setEditingId(null);
          setAlertBox({
            open: true,
            message: 'Session schedule updated successfully!',
            onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
            onCancel: null,
            confirmText: 'OK',
            cancelText: '',
            type: 'success',
          });
        }
      } else {
        // Create new session schedule
        const response = await createSessionSchedule({ ...submitValues, teacherId });
        if (response.success) {
          // Refresh schedules
          const schedulesResponse = await getSessionSchedulesByTeacher(teacherId);
          if (schedulesResponse.success) {
            setSchedules(schedulesResponse.data || []);
          }
          setAlertBox({
            open: true,
            message: 'Session schedule created successfully!',
            onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
            onCancel: null,
            confirmText: 'OK',
            cancelText: '',
            type: 'success',
          });
        }
      }
      resetForm();
      setFormValues(initialValues);
      setSubmitKey(prev => prev + 1);
    } catch (error) {
      console.error('Error saving session schedule:', error);
      setAlertBox({
        open: true,
        message: 'Failed to save session schedule. Please try again.',
        onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
        onCancel: null,
        confirmText: 'OK',
        cancelText: '',
        type: 'danger',
      });
    }
  };

  const handleEdit = (id) => {
    const schedule = schedules.find(s => s.id === id);
    if (schedule) {
      setFormValues(schedule);
      setEditingId(id);
      setSubmitKey(prev => prev + 1);
    }
  };

  const handleDelete = async (id) => {
    setAlertBox({
      open: true,
      message: 'Are you sure you want to delete this session schedule?',
      onConfirm: async () => {
        try {
          const response = await deleteSessionSchedule(id);
          if (response.success) {
            // Refresh schedules
                    const teacherData = getUserData();
        const teacherId = teacherData?.teacherId || teacherData?.id || teacherData?.userid;
        const schedulesResponse = await getSessionSchedulesByTeacher(teacherId);
            if (schedulesResponse.success) {
              setSchedules(schedulesResponse.data || []);
            }
            if (editingId === id) {
              setEditingId(null);
              setFormValues(initialValues);
              setSubmitKey(prev => prev + 1);
            }
            setAlertBox({
              open: true,
              message: 'Session schedule deleted successfully!',
              onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
              onCancel: null,
              confirmText: 'OK',
              cancelText: '',
              type: 'success',
            });
          }
        } catch (error) {
          console.error('Error deleting session schedule:', error);
          setAlertBox({
            open: true,
            message: 'Failed to delete session schedule. Please try again.',
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
        <div className="w-full max-w-25xl bg-white rounded-lg shadow p-4 mx-auto">
          <div className="p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Class Session Schedules</h1>
        <p className="mb-6 text-gray-700">Create, update, and delete class schedules for your classes.</p>

        <BasicForm
          key={submitKey}
          initialValues={formValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {(props) => {
            const { errors, touched, handleChange, values, setFieldValue } = props;
            
            // Link teacher and teacherId
            const handleTeacherChange = (e) => {
              const selectedName = e.target.value;
              handleChange(e);
              const found = classes.find(t => `${t.designation || ''} ${t.teacher}` === selectedName);
              if (found && setFieldValue) {
                setFieldValue('teacher', `${found.designation || ''} ${found.teacher}`);
                setFieldValue('teacherId', found.teacherId); // Store TeacherId for display
              } else if (setFieldValue) {
                setFieldValue('teacherId', '');
              }
            };

            // Auto-fill class details when class is selected
            const handleClassChange = (e) => {
              const selectedClassName = e.target.value;
              handleChange(e);
              const found = classes.find(c => c.className === selectedClassName);
              if (found && setFieldValue) {
                setFieldValue('className', found.className);
                setFieldValue('subject', found.subject);
                setFieldValue('teacher', `${found.designation || ''} ${found.teacher}`);
                setFieldValue('teacherId', found.teacherId);
              }
            };
            
            // Generate Zoom Link
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

            return (
              <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomSelectField
                  id="className"
                  name="className"
                  label="Class Name *"
                  value={values.className}
                  onChange={handleClassChange}
                  options={classOptions}
                  error={errors.className}
                  touched={touched.className}
                  required
                />
                <CustomSelectField
                  id="subject"
                  name="subject"
                  label="Subject *"
                  value={values.subject}
                  onChange={handleChange}
                  options={subjectOptions}
                  error={errors.subject}
                  touched={touched.subject}
                  required
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
                      {classes.find(t => `${t.designation || ''} ${t.teacher}` === values.teacher)?.teacherId || ''}
                    </div>
                  </div>
                )}

                <CustomTextField
                  id="date"
                  name="date"
                  type="date"
                  label="Date *"
                  value={values.date}
                  onChange={handleChange}
                  error={errors.date}
                  touched={touched.date}
                  icon={FaCalendar}
                />
                <CustomTextField
                  id="startTime"
                  name="startTime"
                  type="time"
                  label="Start Time *"
                  value={values.startTime}
                  onChange={handleChange}
                  error={errors.startTime}
                  touched={touched.startTime}
                  icon={FaClock}
                />
                <CustomTextField
                  id="endTime"
                  name="endTime"
                  type="time"
                  label="End Time *"
                  value={values.endTime}
                  onChange={handleChange}
                  error={errors.endTime}
                  touched={touched.endTime}
                  icon={FaClock}
                />
                {/* Delivery Method */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Delivery Method *</label>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                        <div className="text-sm text-gray-500">Live streaming classes</div>
                      </div>
                    </label>
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
                        <div className="text-sm text-gray-500">In-person classes</div>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value="hybrid"
                        checked={values.deliveryMethod === 'hybrid'}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <div>
                        <div className="font-medium">Hybrid</div>
                        <div className="text-sm text-gray-500">Alternating weeks</div>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value="other"
                        checked={values.deliveryMethod === 'other'}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <div>
                        <div className="font-medium">Other</div>
                        <div className="text-sm text-gray-500">Custom (describe below)</div>
                      </div>
                    </label>
                  </div>
                  {values.deliveryMethod === 'other' && (
                    <CustomTextField
                      id="deliveryOther"
                      name="deliveryOther"
                      type="text"
                      label="Describe Delivery Method *"
                      value={values.deliveryOther}
                      onChange={handleChange}
                      error={errors.deliveryOther}
                      touched={touched.deliveryOther}
                    />
                  )}
                  {errors.deliveryMethod && touched.deliveryMethod && (
                    <div className="text-red-600 text-sm mt-1">{errors.deliveryMethod}</div>
                  )}
                </div>
                {/* Zoom Link for online, hybrid, and other */}
                {(values.deliveryMethod === 'online' || values.deliveryMethod === 'hybrid' || values.deliveryMethod === 'other') && (
                  <div className="col-span-2">
                    <div className="mb-2">
                      <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                        <FaVideo className="inline mr-1" />
                        <strong>Zoom Link Required:</strong> For online and hybrid classes, you must provide a zoom link. You can either enter one manually or click "Create Zoom Link" to generate one automatically.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CustomTextField
                        id="zoomLink"
                        name="zoomLink"
                        type="url"
                        label={values.deliveryMethod === 'other' ? "Zoom Link (Optional)" : "Zoom Link *"}
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
                    {!values.zoomLink && (values.deliveryMethod === 'online' || values.deliveryMethod === 'hybrid') && (
                      <div className="text-orange-600 text-sm mt-1">
                        ⚠️ Please enter a zoom link or click "Create Zoom Link" to generate one.
                      </div>
                    )}
                  </div>
                )}
                

                <CustomSelectField
                  id="status"
                  name="status"
                  label="Status *"
                  value={values.status}
                  onChange={handleChange}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                  error={errors.status}
                  touched={touched.status}
                  required
                />
                
                {/* Description */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={values.description}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter session description..."
                  />
                </div>
                <div className="col-span-1 md:col-span-2 flex justify-center">
                  <CustomButton
                    type="submit"
                    className="w-2/3 max-w-xs py-2 px-4 bg-[#1a365d] text-white hover:bg-[#13294b] active:bg-[#0f2038]  rounded flex items-center justify-center gap-2"
                  >
                    {editingId ? <FaEdit /> : <FaPlus />} {editingId ? 'Update Schedule' : 'Add Schedule'}
                  </CustomButton>
                </div>
              </div>
            );
          }}
        </BasicForm>

        {/* Schedule List */}
        <div className="border-t-2 pt-4">
          <h2 className="text-lg font-semibold mb-2">Your Class Session Schedules</h2>
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>No session schedules found. Create your first session schedule to get started.</p>
            </div>
          ) : (
            <BasicTable
              columns={[
                { key: 'className', label: 'Class' },
                { key: 'subject', label: 'Subject' },
                { key: 'teacher', label: 'Teacher' },
                { key: 'date', label: 'Date' },
                { key: 'startTime', label: 'Start Time', render: row => formatTime(row.startTime) },
                { key: 'endTime', label: 'End Time', render: row => formatTime(row.endTime) },
                { key: 'deliveryMethod', label: 'Type' },

                { key: 'description', label: 'Description', render: row => row.description ? (row.description.length > 50 ? row.description.substring(0, 50) + '...' : row.description) : '-' },
                { key: 'status', label: 'Status', render: row => {
                    if (row.status === 'active') return <span className="px-2 py-1 rounded bg-green-100 text-green-800 font-semibold">Active</span>;
                    if (row.status === 'inactive') return <span className="px-2 py-1 rounded bg-red-100 text-red-800 font-semibold">Inactive</span>;
                    return row.status;
                  } },
              ]}
              data={schedules}
              actions={row => (
                <div className="flex gap-2">
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => handleEdit(row.id)}
                    title="Edit"
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
        </div>
        </>
    </DashboardLayout>
  );
}

export default ManageClassSchedules;

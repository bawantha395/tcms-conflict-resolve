import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import teacherSidebarSections from './TeacherDashboardSidebar';
import BasicTable from '../../../components/BasicTable';
import CustomButton from '../../../components/CustomButton';
import { FaVideo, FaMapMarkerAlt, FaUsers, FaCalendar, FaClock, FaEye } from 'react-icons/fa';
import { getClassesByTeacher } from '../../../api/classes';
import { getUserData } from '../../../api/apiUtils';

const TeacherAttendanceOverview = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState('');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get current teacher data
  const currentTeacher = getUserData();

  useEffect(() => {
    loadTeacherClasses();
  }, []);

  const loadTeacherClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!currentTeacher || !(currentTeacher.teacherId || currentTeacher.id || currentTeacher.userid)) {
        setError('Teacher information not found');
        setLoading(false);
        return;
      }

              const teacherId = currentTeacher.teacherId || currentTeacher.id || currentTeacher.userid;
        const response = await getClassesByTeacher(teacherId);
      
      if (response.success && response.data) {
        // Transform the data to match the expected format
        const transformedClasses = response.data.map(cls => ({
          id: cls.id,
          className: cls.className,
          subject: cls.subject,
          teacher: cls.teacher,
          stream: cls.stream,
          startDate: cls.startDate,
          schedule: cls.schedule,
          status: cls.status,
          deliveryMethod: cls.deliveryMethod,
          // For now, we'll use placeholder attendance data
          // In a real implementation, you'd fetch actual attendance data
          studentsPresent: 0,
          totalStudents: 0,
          attendanceRate: 0
        }));
        
        setClasses(transformedClasses);
      } else {
        setError('Failed to load classes');
      }
    } catch (err) {
      console.error('Error loading teacher classes:', err);
      setError('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  // Filter classes by selected date if selectedDate is set, else show all
  const filteredClasses = selectedDate
    ? classes.filter(cls => cls.startDate === selectedDate)
    : classes;

  if (loading) {
    return (
      <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="text-center">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="text-center text-red-600">{error}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
      <div className="p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Student Attendance Overview</h1>
        
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
            { key: 'startDate', label: 'Date' },
            { key: 'schedule', label: 'Schedule', render: row => {
                const schedule = row.schedule;
                if (schedule && schedule.startTime && schedule.endTime) {
                  return (
                    <div className="text-sm">
                      <div className="flex items-center gap-1">
                        <FaClock className="text-gray-500" />
                        {schedule.startTime} - {schedule.endTime}
                      </div>
                    </div>
                  );
                }
                return '-';
              } },
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
                    onClick={() => navigate(`/teacher/attendance/${row.id}`)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    title="View Details"
                  >
                    <FaEye />
                  </CustomButton>
                </div>
              ) },
          ]}
          data={filteredClasses}
        />

        {filteredClasses.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No classes found for the selected criteria.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherAttendanceOverview; 
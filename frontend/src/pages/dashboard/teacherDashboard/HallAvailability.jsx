import React, { useState, useEffect } from 'react';
import BasicAlertBox from '../../../components/BasicAlertBox';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import teacherSidebarSections from './TeacherDashboardSidebar';
import CustomButton from '../../../components/CustomButton';
import BasicForm from '../../../components/BasicForm';
import CustomTextField from '../../../components/CustomTextField';
import CustomSelectField from '../../../components/CustomSelectField';
import { FaBook, FaUserGraduate, FaCalendarAlt, FaClock } from 'react-icons/fa';
import BasicTable from '../../../components/BasicTable';


// API endpoint for all hall bookings
const HALLBOOK_API = 'http://localhost:8088/hallbook.php?list=1';
const HALL_AVAILABILITY_API = 'http://localhost:8088/hallbook.php';
const TEACHER_REQUESTS_API = 'http://localhost:8088/hall_request.php?teacher_id=';
const TEACHER_HANDLE_REQUEST_API = 'http://localhost:8088/hall_request.php';


const HallAvailability = () => {
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState(null);
  // Teacher info (replace with real context in production)
  const teacher = { id: 'T001', name: 'Mr. Silva' };
  // State for check hall availability form
  const [checkForm, setCheckForm] = useState({ date: '', startTime: '', endTime: '' });
  // State for request hall form
  const [requestForm, setRequestForm] = useState({ subject: '', class_name: '', date: '', start_time: '', end_time: '' });
  const [requestStatus, setRequestStatus] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [alertBox, setAlertBox] = useState({ open: false, message: '', onConfirm: null, onCancel: null, confirmText: 'OK', cancelText: '', type: 'success' });

  // Fetch teacher's own requests
  const fetchMyRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await fetch(`${TEACHER_REQUESTS_API}${teacher.id}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.requests)) {
        setMyRequests(data.requests);
      } else {
        setMyRequests([]);
      }
    } catch (e) {
      setMyRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => { fetchMyRequests(); }, []);

  // Auto-clear availability result after 10 seconds
  useEffect(() => {
    if (requestStatus) {
      const timer = setTimeout(() => setAvailabilityResult(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [requestStatus]);

  useEffect(() => {
    if (availabilityResult) {
      const timer = setTimeout(() => setAvailabilityResult(null), 10000); 
      return () => clearTimeout(timer);
    }
  }, [availabilityResult]);

  const handleCheckFormChange = (e) => {
    setCheckForm({ ...checkForm, [e.target.name]: e.target.value });
  };

  const handleCheckFormSubmit = async (e) => {
    e.preventDefault();
    setAvailabilityResult(null);
    try {
      const url = `${HALL_AVAILABILITY_API}?date=${checkForm.date}&start_time=${checkForm.startTime}&end_time=${checkForm.endTime}`;
      const res = await fetch(url);
      const data = await res.json();
      setAvailabilityResult(data);
      setCheckForm({ date: '', startTime: '', endTime: '' });
    } catch (err) {
      setAvailabilityResult({ success: false, message: "Network error" });
      setCheckForm({ date: '', startTime: '', endTime: '' });
    }
  };

  // Handle request hall form change
  const handleRequestFormChange = (e) => {
    setRequestForm({ ...requestForm, [e.target.name]: e.target.value });
  };

  // Handle request hall form submit
  const handleRequestFormSubmit = async (e) => {
    e.preventDefault();
    setRequestStatus(null);
    try {
      const res = await fetch(TEACHER_HANDLE_REQUEST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: teacher.id,
          subject: requestForm.subject,
          class_name: requestForm.class_name,
          date: requestForm.date,
          start_time: requestForm.start_time,
          end_time: requestForm.end_time
        })
      });
      const data = await res.json();
      setRequestStatus(data);
      setRequestForm({ subject: '', class_name: '', date: '', start_time: '', end_time: '' });
      fetchMyRequests(); // Refresh requests list
    } catch (err) {
      setRequestStatus({ success: false, message: 'Network error' });
    }
  };
  // Fetch all halls from backend
  useEffect(() => {
    const fetchHalls = async () => {
      setLoading(true);
      try {
        const res = await fetch(HALLBOOK_API);
        const data = await res.json();
        if (data.success && Array.isArray(data.halls)) {
          // Map backend data to table format
          const mapped = data.halls.map(h => ({
            id: h.id,
            name: h.hall_name,
            subject: h.subject,
            className: h.class_name,
            teacher: h.teacher_name,
            date: h.date,
            time: `${h.start_time} - ${h.end_time}`,
          }));
          setHalls(mapped);
        } else {
          setHalls([]);
        }
      } catch (e) {
        setHalls([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHalls();
  }, []);




  return (
    <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
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
  <h1 className="text-2xl font-bold mb-4">All Booked Halls</h1>
  <p className="mb-6 text-gray-700">Below is a list of all currently booked halls from the system.</p>
  {loading && <div className="mb-4 text-blue-600">Loading halls...</div>}
        {/* Teacher info is automatically used for requests */}
        <BasicTable
          columns={[
            { key: 'name', label: 'Hall Name' },
            { key: 'subject', label: 'Subject' },
            { key: 'className', label: 'Class Name' },
            { key: 'teacher', label: 'Teacher' },
            { key: 'date', label: 'Date' },
            { key: 'time', label: 'Time Period' },
          ]}
          data={halls}
        />
        <div className="my-8"></div>
        <h2 className="text-2xl font-bold mb-4">Check Hall Availability</h2>
        <form onSubmit={handleCheckFormSubmit} className="flex flex-col gap-4">
          <CustomTextField type="date" name="date" value={checkForm.date} onChange={handleCheckFormChange} required icon={FaCalendarAlt} />
          <CustomTextField type="time" name="startTime" value={checkForm.startTime} onChange={handleCheckFormChange} required icon={FaClock} />
          <CustomTextField type="time" name="endTime" value={checkForm.endTime} onChange={handleCheckFormChange} required icon={FaClock} />
          <div className="md:col-span-2 flex justify-center items-center">
                    <CustomButton type="submit" className="w-2/3 max-w-xs py-2 px-4 bg-[#1a365d] text-white rounded hover:bg-[#13294b] active:bg-[#0f2038]">
                      Check Availability
                    </CustomButton>
                  </div>
        </form>
        {availabilityResult && (
          <div className={`mt-4 p-4 rounded font-semibold shadow
            ${availabilityResult.success && availabilityResult.available
             ? 'bg-green-100 text-green-800 border border-green-400 '
             : 'bg-red-100 text-red-800 border border-red-400'
            }`
                          }
          style={{ maxWidth: 400 }}>
            {availabilityResult.success
              ? (availabilityResult.available ? "Hall is available!" : "Hall is NOT available!")
              : availabilityResult.message}
          </div>
        )}

        {/* Request Hall Modal/Form */}
        <div className="my-8"></div>
        <h1 className="text-2xl font-bold mb-4">Request Hall</h1>
        <form onSubmit={handleRequestFormSubmit} className="flex flex-col gap-4 max-w-md mx-auto">
          <CustomTextField
            type="text"
            name="subject"
            label="Subject *"
            value={requestForm.subject}
            onChange={handleRequestFormChange}
            required
            icon={FaBook}
          />
          <CustomTextField
            type="text"
            name="class_name"
            label="Class Name *"
            value={requestForm.class_name}
            onChange={handleRequestFormChange}
            required
            icon={FaUserGraduate}
          />
          <CustomTextField
            type="date"
            name="date"
            label="Date *"
            value={requestForm.date}
            onChange={handleRequestFormChange}
            required
            icon={FaCalendarAlt}
          />
          <div className="flex gap-2 items-end">
            <CustomTextField
              type="time"
              name="start_time"
              label="Start Time *"
              value={requestForm.start_time}
              onChange={handleRequestFormChange}
              required
              style={{ minWidth: '180px', width: '195px' }}
              icon={FaClock}
            />
            <CustomTextField
              type="time"
              name="end_time"
              label="End Time *"
              value={requestForm.end_time}
              onChange={handleRequestFormChange}
              required
              style={{ minWidth: '180px', width: '195px' }}
              icon={FaClock}
            />
          </div>
          <div className="flex justify-center items-center">
            <CustomButton type="submit" className="w-2/3 max-w-xs py-2 px-4 bg-[#1a365d] text-white rounded hover:bg-[#13294b] active:bg-[#0f2038]">
              Send Request
            </CustomButton>
          </div>
        </form>
        {requestStatus && (
          <div className={`mt-4 p-4 rounded font-semibold shadow ${requestStatus.success ? 'bg-green-100 text-green-800 border border-green-400' : 'bg-red-100 text-red-800 border border-red-400'}`} style={{ maxWidth: 400 }}>
            {requestStatus.message}
          </div>
        )}

        {/* My Requests Section */}
        <div className="my-8"></div>
        <h2 className="text-2xl font-bold mb-4">My Hall Requests</h2>
        {requestsLoading ? (
          <div className="mb-4 text-blue-600">Loading your requests...</div>
        ) : (
          <BasicTable
            columns={[
              { key: 'subject', label: 'Subject' },
              { key: 'class_name', label: 'Class Name' },
              { key: 'date', label: 'Date' },
              { key: 'start_time', label: 'Start Time' },
              { key: 'end_time', label: 'End Time' },
              { key: 'status', label: 'Status', render: row => {
                if (row.status === 'pending') return <span className="text-yellow-700">Not approved / Not booked yet</span>;
                if (row.status === 'approved') return <span className="text-green-700">Approved</span>;
                if (row.status === 'rejected') return <span className="text-red-700">Rejected</span>;
                return row.status;
              } },
            ]}
            data={myRequests}
          />
        )}
        {/* bookingStatus alert replaced by BasicAlertBox */}
      </div>
    </DashboardLayout>
  );
};

export default HallAvailability;

import React, { useState, useEffect } from 'react';
import BasicAlertBox from '../../../components/BasicAlertBox';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import adminSidebarSections from './AdminDashboardSidebar';
import CustomButton from '../../../components/CustomButton';
import {
  FaTrash, FaEdit, FaChalkboardTeacher, FaBook, FaUserGraduate, FaCalendarAlt, FaClock
} from 'react-icons/fa';
import BasicForm from '../../../components/BasicForm';
import CustomTextField from '../../../components/CustomTextField';
import CustomSelectField from '../../../components/CustomSelectField';
import BasicTable from '../../../components/BasicTable';

const HALLBOOK_API = "http://localhost:8088/hallbook.php";
const TEACHERS_API = "http://localhost:8088/routes.php/get_all_teachers";
const HALL_REQUESTS_API = "http://localhost:8088/hall_request.php";
const CLASSES_API = "http://localhost:8087/routes.php/get_class_name_list";

const ClassHalls = () => {
  const [halls, setHalls] = useState([]);
  const [requests, setRequests] = useState([]);
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [alertBox, setAlertBox] = useState({ open: false, message: '', onConfirm: null, onCancel: null, confirmText: '', cancelText: '', type: '' });
  const [editingHall, setEditingHall] = useState(null);
  const [availabilityResult, setAvailabilityResult] = useState(null);
  const [classOptions, setClassOptions] = useState([]);

  // Fetch halls and teachers on mount
  useEffect(() => {
    fetchHalls();
    fetchTeachers();
    fetchClasses();
    fetchRequests();
  }, []);

useEffect(() => {
  if (availabilityResult) {
    const timer = setTimeout(() => setAvailabilityResult(null), 10000); 
    return () => clearTimeout(timer);
  }
}, [availabilityResult]);


const fetchClasses = async () => {
  try {
    const res = await fetch(CLASSES_API);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      setClassOptions([{ label: 'Select Class', value: '' }, ...data.data]);
    }
  } catch (err) {
    console.error("Error fetching classes:", err);
  }
};

const fetchHalls = async () => {
  try {
    const res = await fetch(`${HALLBOOK_API}?list=1`);
    const data = await res.json();
    if (data.success) {
      // Build classId to name map
      const classIdToName = {};
      classOptions.forEach(opt => {
        if (opt.value) classIdToName[opt.value] = opt.label;
      });

      setHalls(
        data.halls.map(h => ({
          ...h,
          time: h.start_time && h.end_time ? `${h.start_time} - ${h.end_time}` : '',
          class_name: classIdToName[h.class_name] || h.class_name // Map ID to name
        }))
      );
    }
  } catch (err) {
    console.error("Error fetching halls:", err);
  }
};

//   const fetchHalls = async () => {
//   try {
//     const res = await fetch(`${API_URL}?list=1`);
//     const data = await res.json();
//     if (data.success) {
//       setHalls(
//         data.halls.map(h => ({
//           ...h,
//           time: h.start_time && h.end_time ? `${h.start_time} - ${h.end_time}` : ''
//         }))
//       );
//     }
//   } catch (err) {
//     console.error("Error fetching halls:", err);
//   }
// };

  const fetchTeachers = async () => {
  try {
    const res = await fetch(TEACHERS_API);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      setTeacherOptions(data.data.map(t => ({
        label: t.name,
        value: t.teacherId
      })));
    }
  } catch (err) {
    console.error("Error fetching teachers:", err);
  }
};

  const fetchRequests = async () => {
    try {
      const res = await fetch(HALL_REQUESTS_API);
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error("Error fetching requests:", err);
    }
  };

  const handleAddHall = async (values, { resetForm }) => {
    try {

      const checkUrl = `${HALLBOOK_API}?date=${values.date}&start_time=${values.startTime}&end_time=${values.endTime}`;
    const checkRes = await fetch(checkUrl);
    const checkData = await checkRes.json();

    if (checkData.success && checkData.available === false) {
      alert("Time slot is already booked! Please choose another time.");
      return;
    }

      const payload = {
        hall_name: values.name,
        status: values.status.toLowerCase(),
        subject: values.subject,
        class_id: values.className ? parseInt(values.className) : null,
        teacherId: values.teacher,
        date: values.date,
        start_time: values.startTime,
        end_time: values.endTime
      };
      const res = await fetch(HALLBOOK_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        fetchHalls();
        alert("Hall added successfully");
        resetForm();
      } else {
        alert(data.message || "Failed to add hall");
      }
    } catch (err) {
      console.error("Error adding hall:", err);
      alert("Network error adding hall");
    }
  };

  const handleDeleteHall = (id) => {
    openAlert(
      'Are you sure you want to delete this hall booking?',
      async () => {
        try {
          const res = await fetch(`${HALLBOOK_API}?id=${id}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (data.success) {
            fetchHalls();
            alert("Hall deleted successfully");
          } else {
            alert(data.message);
          }
        } catch (err) {
          console.error("Error deleting hall:", err);
        }
      },
      { confirmText: 'Delete', cancelText: 'Cancel', type: 'danger' }
    );
  };

  const handleEditHall = (hall) => {
    setEditingHall(hall);
  };

  const handleEditHallSubmit = async (values) => {
  try {
    const payload = {
      id: editingHall.id,
      hall_name: values.name,
      status: values.status.toLowerCase(),
      subject: values.subject,
      class_id: values.className ? parseInt(values.className) : null,
      teacherId: values.teacher,
      date: values.date,
      start_time: values.startTime,
      end_time: values.endTime
    };
    const res = await fetch(HALLBOOK_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      fetchHalls();
      setEditingHall(null);
      alert("Hall updated successfully");
    } else {
      // Show alert with backend message
      alert(data.message || "Failed to update hall");
    }
  } catch (err) {
    console.error("Error editing hall:", err);
    alert("Network error updating hall");
  }
};

  const [checkForm, setCheckForm] = useState({ date: '', startTime: '', endTime: '' });

  const handleCheckFormChange = (e) => {
    setCheckForm({ ...checkForm, [e.target.name]: e.target.value });
  };

  const handleCheckFormSubmit = async (e) => {
    e.preventDefault();
    setAvailabilityResult(null);
    try {
      const url = `${HALLBOOK_API}?date=${checkForm.date}&start_time=${checkForm.startTime}&end_time=${checkForm.endTime}`;
      const res = await fetch(url);
      const data = await res.json();
      setAvailabilityResult(data);
      
        setCheckForm({ date: '', startTime: '', endTime: '' });
      
    } catch (err) {
      setAvailabilityResult({ success: false, message: "Network error" });
      setCheckForm({ date: '', startTime: '', endTime: '' });
    }
  };

  const openAlert = (message, onConfirm, { confirmText, cancelText, type }) => {
    setAlertBox({
      open: true,
      message,
      onConfirm: () => { onConfirm(); setAlertBox({ ...alertBox, open: false }); },
      onCancel: () => setAlertBox({ ...alertBox, open: false }),
      confirmText,
      cancelText,
      type
    });
  };
  // Admin approve/reject hall request
  const handleRespondRequest = async (id, status) => {
    try {
      const res = await fetch(HALL_REQUESTS_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      if (data.success) {
        fetchRequests();
        setAlertBox({
          open: true,
          message: `Request ${status === 'approved' ? 'approved' : 'rejected'} successfully!`,
          onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
          confirmText: 'OK',
          type: 'success'
        });
      } else {
        setAlertBox({
          open: true,
          message: data.message || 'Failed to update request',
          onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
          confirmText: 'OK',
          type: 'error'
        });
      }
    } catch (err) {
      setAlertBox({
        open: true,
        message: 'Network error',
        onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
        confirmText: 'OK',
        type: 'error'
      });
    }
  };

  return (
    <DashboardLayout userRole="Administrator" sidebarItems={adminSidebarSections}>

      <div className="p-6 bg-white rounded-lg shadow">
        <BasicAlertBox {...alertBox} />

        <div className="mb-4">
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
      </div>



        <h1 className="text-2xl font-bold mb-4">Class Halls Management</h1>
        <p className="mb-6 text-gray-700">Create, delete, and manage hall availability. Respond to hall requests from teachers.</p>

        {/* Add Hall */}
        <div className="mb-8 max-w-5xl mx-auto">
          <div className="w-full flex flex-col items-center">
            <BasicForm
              initialValues={{ name: '', status: 'Select Status', subject: '', className: '', teacher: '', date: '', startTime: '', endTime: '' }}
              validationSchema={null}
              onSubmit={handleAddHall}
            >
              {({ values, handleChange }) => (
                <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <CustomTextField id="name" name="name" label="Hall Name *" value={values.name} onChange={handleChange} required icon={FaChalkboardTeacher} />
                  <div className="flex flex-col mb-2">
                    <label htmlFor="status" className="text-xs font-medium text-gray-700 mb-1">Status *</label>
                    <select id="status" name="status" value={values.status} onChange={handleChange} className="border rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" style={{ borderColor: '#1a365d', borderWidth: '2px' }} required>
                      <option value="Select Status">Select Status</option>
                      {/* <option value="Free">Free</option> */}
                      <option value="Booked">Booked</option>
                    </select>
                  </div>
                  <>
                      <CustomTextField id="subject" name="subject" label="Subject" value={values.subject} onChange={handleChange} icon={FaBook} />
                      {/* <CustomTextField id="className" name="className" label="Class Name" value={values.className} onChange={handleChange} icon={FaUserGraduate} /> */}
                      {/* <CustomSelectField id="teacher" name="teacher" label="Teacher Name" value={values.teacher} onChange={handleChange} options={teacherOptions} required /> */}
                      <CustomSelectField
                        id="className"
                        name="className"
                        label="Class Name"
                        value={values.className}
                        onChange={handleChange}
                        options={[{ label: 'Select Class', value: '' }, ...classOptions]}
                        icon={FaUserGraduate}
                      />
                      <CustomSelectField
                        id="teacher"
                        name="teacher"
                        label="Teacher Name"
                        value={values.teacher}
                        onChange={handleChange}
                        options={[{ label: 'Select Teacher', value: '' }, ...teacherOptions]}
                        required
                      />
                      <CustomTextField id="date" name="date" type="date" label="Date" value={values.date} onChange={handleChange} required icon={FaCalendarAlt} />
                      <div className="flex mt-3 mb-3 gap-4 items-end ">
                        <CustomTextField id="startTime" name="startTime" type="time" label="Start Time" value={values.startTime} onChange={handleChange} required style={{ minWidth: '180px', width: '505px' }} icon={FaClock} />
                        <CustomTextField id="endTime" name="endTime" type="time" label="End Time" value={values.endTime} onChange={handleChange} required style={{ minWidth: '180px', width: '505px' }} icon={FaClock} />
                      </div>
                    </>
                  <div className="md:col-span-2 flex justify-center items-center">
                    <CustomButton type="submit" className="w-2/3 max-w-xs py-2 px-4 bg-[#1a365d] text-white rounded hover:bg-[#13294b] active:bg-[#0f2038]">
                      Add Hall
                    </CustomButton>
                  </div>
                </div>
              )}
            </BasicForm>
          </div>
        </div>

        {/* Halls List */}
        <div className="border-t-2 pt-4">
          <h2 className="text-lg font-semibold mb-2">Hall List</h2>
          <BasicTable
            columns={[
              { key: 'hall_name', label: 'Hall Name' },
              { key: 'status', label: 'Status' },
              { key: 'subject', label: 'Subject' },
              { key: 'class_name', label: 'Class Name' },
              { key: 'teacher_name', label: 'Teacher' },
              { key: 'date', label: 'Date' },
              { key: 'time', label: 'Time Period' }
            ]}
            data={halls}
            actions={row => (
              <div className="flex gap-2">
                <button onClick={() => handleEditHall(row)} title="Edit"><FaEdit /></button>
                <button onClick={() => handleDeleteHall(row.id)} title="Delete"><FaTrash /></button>
              </div>
            )}
          />
        </div>

        {/* Edit Hall Modal */}
        {editingHall && (
          <div className="fixed inset-0 flex  items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
              <button onClick={() => setEditingHall(null)} className="absolute top-2 right-2">&times;</button>
              <h2>Edit Hall 
                </h2>
              <BasicForm
                initialValues={{
                  name: editingHall.hall_name,
                  status: editingHall.status,
                  subject: editingHall.subject,
                  className: editingHall.class_name,
                  teacher: editingHall.teacherId,
                  date: editingHall.date,
                  startTime: editingHall.start_time,
                  endTime: editingHall.end_time
                }}
                validationSchema={null}
                onSubmit={handleEditHallSubmit}
              >
                {({ values, handleChange }) => (
                  <>
                    <CustomTextField id="name" name="name" label="Hall Name" value={values.name} onChange={handleChange} />
                    {/* <select id="status" name="status" value={values.status} onChange={handleChange}>
                      <option value="Free">Free</option>
                      <option value="Booked">Booked</option>
                    </select> */}
                    <CustomTextField id="subject" name="subject" label="Subject" value={values.subject} onChange={handleChange} />
                    <CustomSelectField id="className" name="className" label="Class Name" value={values.className} onChange={handleChange} options={classOptions} />
                    <CustomSelectField id="teacher" name="teacher" label="Teacher Name" value={values.teacher} onChange={handleChange} options={teacherOptions} />
                    <CustomTextField id="startTime" name="startTime" type="time" label="Start Time" value={values.startTime} onChange={handleChange} />
                    <CustomTextField id="endTime" name="endTime" type="time" label="End Time" value={values.endTime} onChange={handleChange} />
                    {values.status === 'Booked' && (
                      <>
                        <CustomTextField id="subject" name="subject" label="Subject" value={values.subject} onChange={handleChange} />
                        <CustomSelectField id="className" name="className"  value={values.className} onChange={handleChange} options={classOptions} />
                        <CustomSelectField id="teacher" name="teacher" value={values.teacher} onChange={handleChange} options={teacherOptions} />
                        <CustomTextField id="date" name="date" type="date" value={values.date} onChange={handleChange} />
                        <CustomTextField id="startTime" name="startTime" type="time" value={values.startTime} onChange={handleChange} />
                        <CustomTextField id="endTime" name="endTime" type="time" value={values.endTime} onChange={handleChange} />
                      </>
                    )}
                    <CustomButton type="submit">Save</CustomButton>
                  </>
                )}
              </BasicForm>
            </div>
          </div>
        )}

        {/* Hall Requests */}
        <div className="border-t-2 pt-4 mt-16">
          <h2 className="text-lg font-semibold mb-2">Hall Requests</h2>

          


          {requests.length === 0 ? (
            <p>No hall requests at the moment.</p>
          ) : (
            <BasicTable
              columns={[
                { key: 'id', label: 'ID' },
                { key: 'date', label: 'Date' },
                { key: 'teacher_id', label: 'Teacher' },
                { key: 'subject', label: 'Subject' },
                { key: 'class_name', label: 'Class Name' },
                { key: 'start_time', label: 'Start Time' },
                { key: 'end_time', label: 'End Time' },
                { key: 'status', label: 'Status' }
              ]}
              data={requests}
              actions={row => (
                <>
                  {row.status === 'pending' && (
                    <div className="flex gap-2">
                      <CustomButton
                        onClick={() => handleRespondRequest(row.id, 'approved')}
                        className="px-2 py-1 text-xs hover:bg-green-400 rounded bg-green-100 text-black-800 border border-green-400"
                        style={{ minWidth: '60px' }}
                      >
                        Approve
                      </CustomButton>
                      <CustomButton
                        onClick={() => handleRespondRequest(row.id, 'rejected')}
                        className="px-2 py-1 text-xs hover:bg-red-400 rounded bg-red-100 text-black-800 border border-red-400"

                        // className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded"
                        style={{ minWidth: '60px' }}
                      >
                        Reject
                      </CustomButton>
                    </div>
                  )}
                </>
              )}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClassHalls;

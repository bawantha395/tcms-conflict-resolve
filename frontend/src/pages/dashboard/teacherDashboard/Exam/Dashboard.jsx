import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { examAPI } from '../../../../api/Examapi';
import { getUserData } from '../../../../api/apiUtils';
import teacherSidebarSections from '../TeacherDashboardSidebar';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import CustomTextField from '../../../../components/CustomTextField';
import { FaFileAlt, FaCalendarAlt } from 'react-icons/fa';

const Dashboard = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExam, setNewExam] = useState({ title: '', date: '' });

  useEffect(() => {
    fetchExams();
    // eslint-disable-next-line
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      // Read logged-in teacher identity and fetch only relevant exams
      const user = getUserData();
      const teacherCode = user?.teacherId || (typeof user?.userid === 'string' ? user.userid : null);
      const teacherFilter = teacherCode || (user?.id ?? null);
      const response = teacherFilter
        ? await api.get('/exams', { params: { teacher_id: teacherFilter } })
        : await examAPI.getAll();
      // support both axios response shape and raw data
      const data = response?.data ?? response ?? [];
      setExams(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching exams:', error);
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = () => {
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setNewExam({ title: '', date: '' });
  };

  const handleSubmitExam = async (e) => {
    e.preventDefault();
    const { title, date } = newExam;
    
    if (!title || !date) {
      alert('Please fill in all fields');
      return;
    }

    const user = getUserData();
    console.log('User data:', user); // Debug log
    
    // Extract teacher information
    // For teachers, userid is usually the teacher code (T001)
    const teacherId = user?.teacherId || user?.userid || null;
    
    // Use a numeric ID - since teachers table might be empty, use a simple approach
    // Extract number from teacher code (T001 -> 1) or use 1 as default
    let creatorUserId = 1; // Default
    
    if (teacherId && typeof teacherId === 'string' && teacherId.match(/T(\d+)/)) {
      const match = teacherId.match(/T(\d+)/);
      creatorUserId = parseInt(match[1], 10);
    } else if (user?.id && typeof user.id === 'number') {
      creatorUserId = user.id;
    }
    
    console.log('Creator User ID:', creatorUserId); // Debug log
    console.log('Teacher ID:', teacherId); // Debug log

    const payload = { 
      title, 
      date, 
      creator_user_id: creatorUserId, 
      teacher_id: teacherId 
    };
    
    console.log('Sending payload:', payload); // Debug log

    try {
      const response = await examAPI.create(payload);
      console.log('Response:', response); // Debug log
      fetchExams();
      handleCloseModal();
    } catch (error) {
      console.error('Error creating exam:', error);
      console.error('Error response:', error.response?.data); // Debug log
      alert(`Failed to create exam: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewExam(prev => ({ ...prev, [name]: value }));
  };

  const handleDeleteExam = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) return;

    try {
      await examAPI.delete(id);
      fetchExams();
    } catch (error) {
      console.error('Error deleting exam:', error);
      alert('Failed to delete exam');
    }
  };

  return (
    <DashboardLayout sidebarSections={Array.isArray(teacherSidebarSections) ? teacherSidebarSections : []}>
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        
          <h1 className="text-lg font-bold">Exam Marking Management</h1>
          <button
              onClick={handleCreateExam}
              className="px-4 py-2 bg-green-200 text-green-800 border border-green-400 rounded-lg hover:bg-green-200 transition-colors"
              aria-label="Create new exam"
            >
              + Create New Exam
            </button>
        </div>

        {loading ? (
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3da58a]"></div>
              <span className="ml-2 text-gray-600">Loading exams...</span>
            </div>
          </div>
          
          // <p>Loading exams...</p>
        ) : exams.length === 0 ? (
          <div style={{ padding: 20, border: '1px dashed #ddd', borderRadius: 6 }}>
            <p style={{ margin: 0 }}>No exams found.</p>
            <button
              onClick={handleCreateExam}
              style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, cursor: 'pointer' }}
            >
              Create first exam , Click the "Create New Exam" Button
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {exams.map((exam) => (
              <div key={exam.exam_id} style={{ border: '1px solid #818181ff', padding: 15, borderRadius: 6, background: '#fff' }}>
                <h3 style={{ marginTop: 0 }}>{exam.title}</h3>
                <p style={{ margin: '6px 0', color: '#555' }}>Date: {exam.date}</p>
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link to={`/exam/${exam.exam_id}/design`} className="link-btn">
                    Design
                  </Link>
                  <Link to={`/exam/${exam.exam_id}/mark`} className="link-btn">
                    Enter Marks
                  </Link>
                  <Link to={`/exam/${exam.exam_id}/results`} className="link-btn">
                    View Results
                  </Link>
                  <button
                    onClick={() => handleDeleteExam(exam.exam_id)}
                    className="ml-auto px-3 py-2 bg-red-100 text-red-800 border border-red-400 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-6 text-gray-800">Create New Exam</h2>
            
            <form onSubmit={handleSubmitExam}>
              <div className="space-y-4">
                <CustomTextField
                  id="exam-title"
                  name="title"
                  type="text"
                  value={newExam.title}
                  onChange={handleInputChange}
                  label="Exam Title"
                  icon={FaFileAlt}
                  required
                />

                <CustomTextField
                  id="exam-date"
                  name="date"
                  type="date"
                  value={newExam.date}
                  onChange={handleInputChange}
                  label="Exam Date"
                  icon={FaCalendarAlt}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1a365d] text-white rounded-lg hover:bg-[#13294b] transition-colors"
                >
                  Create Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      <style>{`
        .qd-root { font-family: Inter, Arial, sans-serif; color: #222; height: 100%; display: flex; flex-direction: column; }
        .qd-header { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid #eee; background:#fafafa; }
        .qd-header h1 { margin:0; font-size:18px; }
        .qd-header-actions .btn + .btn { margin-left:8px; }

        .qd-main { display:flex; flex:1; min-height:0; }
        .qd-left { width:420px; max-width:45%; padding:20px; border-right:1px solid #eee; overflow:auto; background:#fff; }
        .qd-right { flex:1; padding:20px; overflow:auto; background:#fafafa; }

        .qd-tree { margin-top:10px; }
        .qd-node { margin-bottom:6px; }
        .qd-node-row { display:flex; justify-content:space-between; align-items:center; padding:8px; border-radius:6px; transition:background 0.12s; }
        .qd-node-row:hover { background:#f7f7f7; }
        .qd-node-row.selected { background:#e7f3ff; }
        .qd-node-label { display:flex; flex-direction:column; }
        .qd-node-meta { font-size:12px; color:#666; margin-top:4px; }

        .qd-node-actions .btn { margin-left:6px; }

        .btn { padding:6px 10px; border-radius:6px; border:1px solid #cbd5e1; background:#fff; cursor:pointer; }
        .btn.small { padding:4px 8px; font-size:13px; }
        .btn.secondary { background:#f3f4f6; }
        .btn.danger, .btn.small.danger { background:#fee2e2; border-color:#fca5a5; color:#b91c1c; }

        .qd-empty { text-align:center; padding:20px; color:#666; }

        .qd-editor p { margin:8px 0; }
        .qd-placeholder { color:#666; }

        .qd-modal { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.35); z-index:60; }
        .qd-modal-card { background:#fff; padding:18px; border-radius:8px; width:320px; box-shadow:0 6px 24px rgba(0,0,0,0.12); }
        .qd-modal-card h4 { margin-top:0; }
        .qd-modal-card label { display:block; margin-top:10px; font-size:13px; color:#333; }
        .qd-modal-card input { width:100%; padding:8px; margin-top:6px; border:1px solid #e5e7eb; border-radius:6px; }
        .qd-modal-actions { margin-top:12px; display:flex; justify-content:flex-end; gap:8px; }

        .qd-loading { padding:40px; text-align:center; color:#666; }


        .link-btn {
          display: inline-block;
          padding: 6px 10px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          color: #1e88e5;
          background: #fff;
          text-decoration: none;
          transition: background .12s, box-shadow .12s;
        }
        .link-btn:hover {
          background: #f3f6fb;
          box-shadow: 0 1px 3px rgba(30,136,229,0.08);
        }



        @media (max-width:800px) {
          .qd-left { display:none; }
          .qd-right { width:100%; }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Dashboard;

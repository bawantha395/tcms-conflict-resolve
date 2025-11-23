import { useState, useEffect } from 'react';
import { useParams , useNavigate } from 'react-router-dom';
import { questionAPI } from '../../../../api/Examapi';
import teacherSidebarSections from '../TeacherDashboardSidebar';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import CustomTextField from '../../../../components/CustomTextField';
import { FaBars, FaTimes, FaGraduationCap, FaSearch, FaStar, FaSync, FaQuestionCircle, FaHashtag } from 'react-icons/fa';


const ExamDesigner = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [modalParentId, setModalParentId] = useState(null);
  const [formData, setFormData] = useState({ label: '', max_marks: '' });

  

  useEffect(() => {
    fetchQuestions();
  }, [id]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await questionAPI.getByExamId(id);
      setQuestions(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const buildHierarchy = (questions) => {
    if (!Array.isArray(questions)) return [];
    const map = {};
    const roots = [];

    questions.forEach(q => {
      map[q.part_id] = { ...q, children: [] };
    });

    questions.forEach(q => {
      if (q.parent_part_id && map[q.parent_part_id]) {
        map[q.parent_part_id].children.push(map[q.part_id]);
      } else {
        roots.push(map[q.part_id]);
      }
    });

    return roots;
  };

  const renderTree = (nodes, level = 0) => {
    return nodes.map(node => (
      <div key={node.part_id} style={{ marginBottom: 6, marginLeft: `${level * 20}px` }}>
        <div
          onClick={() => setSelectedQuestion(node)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 8,
            borderRadius: 6,
            transition: 'background 0.12s',
            cursor: 'pointer',
            background: selectedQuestion?.part_id === node.part_id ? '#e7f3ff' : 'transparent'
          }}
          onMouseEnter={(e) => {
            if (selectedQuestion?.part_id !== node.part_id) {
              e.currentTarget.style.background = '#f7f7f7';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedQuestion?.part_id !== node.part_id) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {node.label}
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Max: {node.max_marks}</div>
          </div>
        </div>
        {node.children && renderTree(node.children, level + 1)}
      </div>
    ));
  };

  const handleAddQuestion = async (parentId = null) => {
    setModalParentId(parentId);
    setFormData({ label: '', max_marks: '' });
    setShowAddModal(true);
  };

  const handleUpdateQuestion = async () => {
    if (selectedQuestion) {
      setFormData({
        label: selectedQuestion.label || '',
        max_marks: selectedQuestion.max_marks || ''
      });
      setShowUpdateModal(true);
    }
  };

  const handleCloseModals = () => {
    setShowAddModal(false);
    setShowUpdateModal(false);
    setFormData({ label: '', max_marks: '' });
    setModalParentId(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    const { label, max_marks } = formData;
    
    if (!label || !max_marks) {
      alert('Please fill in all fields');
      return;
    }

    const maxMarks = parseInt(max_marks, 10);
    if (!Number.isFinite(maxMarks) || maxMarks <= 0) {
      alert('Please enter a valid positive number for max marks');
      return;
    }

    try {
      const displayOrder = questions.length + 1;
      await questionAPI.create(id, {
        parent_part_id: modalParentId,
        label,
        max_marks: maxMarks,
        display_order: displayOrder
      });
      fetchQuestions();
      handleCloseModals();
    } catch (error) {
      console.error('Error adding question:', error);
      alert('Failed to add question');
    }
  };

  const handleSubmitUpdate = async (e) => {
    e.preventDefault();
    if (!selectedQuestion) return;

    const { label, max_marks } = formData;
    
    if (!label || !max_marks) {
      alert('Please fill in all fields');
      return;
    }

    const maxMarks = parseInt(max_marks, 10);
    if (!Number.isFinite(maxMarks) || maxMarks <= 0) {
      alert('Please enter a valid positive number for max marks');
      return;
    }

    try {
      await questionAPI.update(id, selectedQuestion.part_id, { label, max_marks: maxMarks });
      fetchQuestions();
      handleCloseModals();
    } catch (error) {
      console.error('Error updating question:', error);
      alert('Failed to update question');
    }
  };

  const handleDeleteQuestion = async () => {
    if (selectedQuestion && window.confirm('Are you sure you want to delete this question part?')) {
      try {
        await questionAPI.delete(id, selectedQuestion.part_id);
        fetchQuestions();
        setSelectedQuestion(null);
      } catch (error) {
        console.error('Error deleting question:', error);
        alert('Failed to delete question');
      }
    }
  };

  const hierarchy = buildHierarchy(questions);

  const styles = {
    btn: {
      padding: '6px 10px',
      borderRadius: 6,
      border: '1px solid #cbd5e1',
      background: '#fff',
      cursor: 'pointer',
      marginLeft: 8
    },
    btnDanger: {
      padding: '6px 10px',
      borderRadius: 6,
      border: '1px solid #fca5a5',
      background: '#fee2e2',
      color: '#b91c1c',
      cursor: 'pointer',
      marginLeft: 8
    },
    backBtn: {
      padding: '6px 10px',
      borderRadius: 6,
      border: '1px solid #e2e8f0',
      background: '#fff',
      cursor: 'pointer',
      marginRight: 12
    }
  };

  if (loading) {
    return (
      <DashboardLayout sidebarSections={Array.isArray(teacherSidebarSections) ? teacherSidebarSections : []}>
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3da58a]"></div>
            <span className="ml-2 text-gray-600">Loading exams...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarSections={Array.isArray(teacherSidebarSections) ? teacherSidebarSections : []}>
      <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: '#222', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #eee', background: '#fafafa' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
             <button
                onClick={() => navigate('/teacher/exams/dashboard')}
                className="px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-150 border-2 bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50"
                aria-label="Back to dashboard"
                >
                ← Back
                </button>
          <h1 className="text-lg font-bold">Question Hierarchy</h1>
            
    
          </div>
          <div className="flex items-center gap-3 flex-nowrap" style={{ overflowX: 'auto' }}>
            <button
              onClick={() => handleAddQuestion()}
              className="px-4 py-2 bg-green-200 text-green-800 border border-green-400 rounded-lg hover:bg-green-200 transition-colors"
            >
              Add Top-Level Question
            </button>

            <button
              onClick={fetchQuestions}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <FaSync className="text-sm" />
              Refresh
            </button>

            {selectedQuestion && (
              <>
                <button
                  onClick={() => handleAddQuestion(selectedQuestion.part_id)}
                  className="px-4 py-2 bg-cyan-600 text-white border border-cyan-600 shadow-md rounded-lg hover:bg-cyan-700 transition-colors"
                >
                  Add Sub-Part
                </button>

                <button
                  onClick={handleUpdateQuestion}
                  className="px-4 py-2 bg-cyan-600 text-white border border-cyan-600 shadow-md rounded-lg hover:bg-cyan-700 transition-colors"
                >
                  Update
                </button>

                <button
                  onClick={handleDeleteQuestion}
                  className="px-4 py-2 bg-red-600 text-white border border-red-600 shadow-md rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ width: 420, maxWidth: '45%', padding: 20, borderRight: '1px solid #eee', overflow: 'auto', background: '#fff' }}>
            {hierarchy.length > 0 ? (
              <div style={{ marginTop: 10 }}>{renderTree(hierarchy)}</div>
            ) : (
              <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>
                <p>No questions yet. Add a top-level question.</p>
                <button onClick={() => handleAddQuestion()} style={styles.btn}>Create First Question</button>
              </div>
            )}
          </div>

          <div style={{ flex: 1, padding: 20, overflow: 'auto', background: '#fafafa' }}>
            <h2 style={{ marginTop: 0 }}>Question Editor</h2>
            {selectedQuestion ? (
              <div style={{ background: '#fff', padding: 12, borderRadius: 6, border: '1px solid #eee' }}>
                <p style={{ margin: '8px 0' }}><strong>Label:</strong> {selectedQuestion.label}</p>
                <p style={{ margin: '8px 0' }}><strong>Max Marks:</strong> {selectedQuestion.max_marks}</p>
                <p style={{ margin: '8px 0' }}><strong>Display order:</strong> {selectedQuestion.display_order}</p>
              </div>
            ) : (
              <div style={{ color: '#666' }}><p>Select a question part to edit</p></div>
            )}
          </div>
        </div>
      </div>

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                {modalParentId ? 'Add Sub-Part' : 'Add Top-Level Question'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmitAdd} className="p-6">
              <div className="space-y-4">
                <CustomTextField
                  id="question-label"
                  name="label"
                  type="text"
                  value={formData.label}
                  onChange={handleInputChange}
                  label="Question Label"
                  icon={FaQuestionCircle}
                  required
                />

                <CustomTextField
                  id="question-marks"
                  name="max_marks"
                  type="number"
                  value={formData.max_marks}
                  onChange={handleInputChange}
                  label="Maximum Marks"
                  icon={FaHashtag}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModals}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1a365d] text-white rounded-lg hover:bg-[#13294b] transition-colors"
                >
                  Add Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Question Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Update Question</h2>
            </div>
            
            <form onSubmit={handleSubmitUpdate} className="p-6">
              <div className="space-y-4">
                <CustomTextField
                  id="update-label"
                  name="label"
                  type="text"
                  value={formData.label}
                  onChange={handleInputChange}
                  label="Question Label"
                  icon={FaQuestionCircle}
                  required
                />

                <CustomTextField
                  id="update-marks"
                  name="max_marks"
                  type="number"
                  value={formData.max_marks}
                  onChange={handleInputChange}
                  label="Maximum Marks"
                  icon={FaHashtag}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModals}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1a365d] text-white rounded-lg hover:bg-[#13294b] transition-colors"
                >
                  Update Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ExamDesigner;
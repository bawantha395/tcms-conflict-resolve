import { useState, useEffect } from 'react';
import { useParams,useNavigate } from 'react-router-dom';
import { questionAPI, markAPI } from '../../../../api/Examapi';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import teacherSidebarSections from '../TeacherDashboardSidebar';
import { FaBars, FaTimes, FaGraduationCap, FaSearch, FaStar, FaSync } from 'react-icons/fa';

const MarkingView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [students, setStudents] = useState(['']); 
  const [marks, setMarks] = useState({});

  useEffect(() => {
    fetchQuestions();
  }, [id]);

  // keep only one '0' student entry if multiple zeros exist
  const normalizeStudents = (arr) => {
    if (!Array.isArray(arr)) return [''];
    const cleaned = arr.map(s => (s === null || s === undefined) ? '' : String(s).trim());
    const nonZeros = cleaned.filter(s => s !== '0');
    const zeroCount = cleaned.filter(s => s === '0').length;
    // keep a single '0' entry if any zeros existed, otherwise keep non-zero entries
    if (zeroCount > 0) {
      // if there are no other entries, return single '0'
      if (nonZeros.length === 0) return ['0'];
      // otherwise keep non-zero entries and a single '0' at the end
      return [...nonZeros, '0'];
    }
    // if no zeros, ensure at least one row exists
    return nonZeros.length > 0 ? nonZeros : [''];
  };

  const fetchQuestions = async () => {
    try {
      const response = await questionAPI.getByExamId(id);
      setQuestions(response?.data ?? response ?? []);
      // normalize students after loading questions
      setStudents(prev => {
        const normalized = normalizeStudents(prev);
        return normalized;
      });
    } catch (error) {
      console.error('Error fetching questions:', error);
      setQuestions([]);
      // still normalize students on error
      setStudents(prev => normalizeStudents(prev));
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

  const handleStudentChange = (index, value) => {
    const newStudents = [...students];
    newStudents[index] = value;
    // normalize on change to avoid multiple '0' entries being introduced
    setStudents(normalizeStudents(newStudents));
  };

  const handleMarkChange = (studentIndex, questionId, value) => {
    const key = `${studentIndex}-${questionId}`;
    setMarks(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const addStudentRow = () => {
    setStudents(prev => {
      const next = [...prev, ''];
      return normalizeStudents(next);
    });
  };

  const calculateTotal = (studentIndex) => {
    return questions.reduce((total, q) => {
      const key = `${studentIndex}-${q.part_id}`;
      return total + (marks[key] || 0);
    }, 0);
  };

  const renderQuestionHierarchy = (nodes, studentIndex, level = 0) => {
    return nodes.map(node => (
      <div key={node.part_id} style={{ marginLeft: `${level * 20}px`, marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: '10px', minWidth: '100px' }}>
            {node.label} ({node.max_marks} marks):
          </span>
          <input
            type="number"
            min="0"
            max={node.max_marks}
            value={marks[`${studentIndex}-${node.part_id}`] ?? ''}
            onChange={(e) => handleMarkChange(studentIndex, node.part_id, e.target.value)}
            style={{ width: '60px' }}
          />
        </div>
        {node.children && node.children.length > 0 && renderQuestionHierarchy(node.children, studentIndex, level + 1)}
      </div>
    ));
  };

  const handleSaveMarks = async () => {
    const marksData = [];
    students.forEach((student, studentIndex) => {
      if (student && student.trim()) {
        questions.forEach(q => {
          const key = `${studentIndex}-${q.part_id}`;
          const score = marks[key] || 0;
          marksData.push({
            student_identifier: student,
            question_part_id: q.part_id,
            score_awarded: score
          });
        });
      }
    });

    try {
      await markAPI.saveMarks(id, { marks: marksData });
      alert('Marks saved successfully!');
      // Clear all fields after successful save
      setStudents(['']);
      setMarks({});
    } catch (error) {
      console.error('Error saving marks:', error);
      alert('Error saving marks');
    }
  };

  const hierarchy = buildHierarchy(questions);

  return (
    <DashboardLayout sidebarSections={Array.isArray(teacherSidebarSections) ? teacherSidebarSections : []}>
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
                onClick={() => navigate('/teacher/exams/dashboard')}
                className="px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-150 border-2 bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50"
                aria-label="Back to dashboard"
                >
                ← Back
                </button>
            <h1 className="text-lg font-bold">Marking View</h1>
            
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'nowrap', marginTop: 8 }}>
            <button
              onClick={addStudentRow}
              className="px-4 py-2 bg-green-200 text-green-800 border border-green-400 rounded-lg hover:bg-green-200 transition-colors"
              aria-label="Create new exam"
            >
              + Add Student Row
            </button>

            <button
              onClick={handleSaveMarks}
              style={{ padding: '8px 10px', backgroundColor: '#47b64aef', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            >
              Save Marks
            </button>

            <button
              onClick={fetchQuestions}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <FaSync className="text-sm" />
              Refresh
            </button>
          </div>
        </div>

        {students.map((student, index) => (
          <div key={index} style={{ border: '1px solid #777777ff', padding: '15px', marginBottom: '20px', borderRadius: '5px', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
              <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Student ID:</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                <input
                type="text"
                value={student}
                onChange={(e) => handleStudentChange(index, e.target.value)}
                placeholder="Enter student ID"
                className="w-full pl-10 pr-4 py-2 text-sm text-gray-800 placeholder-gray-500 rounded-xl transition-all duration-200"
                style={{
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(20px) saturate(200%) contrast(120%)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 4px 15px rgba(172, 170, 170, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                                          }}
                                        />
                                      </div>
              <span style={{ fontWeight: 'bold' }}>Total Score: {calculateTotal(index)}</span>
            </div>
            <div style={{ borderTop: '1px solid #b6b6b6ff', paddingTop: '15px' }}>
              {hierarchy.length > 0 ? renderQuestionHierarchy(hierarchy, index) : <p>No questions available</p>}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default MarkingView;
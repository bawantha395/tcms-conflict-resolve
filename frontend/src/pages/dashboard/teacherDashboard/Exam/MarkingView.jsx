import { useState, useEffect } from 'react';
import { useParams,useNavigate } from 'react-router-dom';
import { questionAPI, markAPI } from '../../../../api/Examapi';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import teacherSidebarSections from '../TeacherDashboardSidebar';
import CustomTextField from '../../../../components/CustomTextField';
import BasicAlertBox from '../../../../components/BasicAlertBox';
import { FaBars, FaTimes, FaGraduationCap, FaSearch, FaStar, FaSync, FaHashtag } from 'react-icons/fa';

const MarkingView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [students, setStudents] = useState(['']); 
  const [marks, setMarks] = useState({});
  const [invalidInputs, setInvalidInputs] = useState({}); // key -> current invalid string value
  const [saveError, setSaveError] = useState('');
  
  // Alert box states
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    message: '',
    title: '',
    type: 'info',
    confirmText: 'OK',
  });

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
    // Allow empty -> clear
    if (value === '') {
      setMarks(prev => { 
        const cp = { ...prev }; 
        delete cp[key]; 
        // Recalculate parent marks after clearing
        updateParentMarks(studentIndex, cp);
        return cp; 
      });
      setInvalidInputs(prev => { const cp = { ...prev }; delete cp[key]; return cp; });
      return;
    }
    const num = parseFloat(value);
    // Find max for this question
    const q = questions.find(q => q.part_id === questionId);
    const max = q ? Number(q.max_marks) : Infinity;
    if (isNaN(num) || num < 0 || num > max) {
      // Mark invalid, do NOT store in marks (so it won't count in totals)
      setInvalidInputs(prev => ({ ...prev, [key]: value }));
      return;
    }
    // Valid value: store and clear invalid state
    setMarks(prev => {
      const newMarks = { ...prev, [key]: num };
      // Update parent marks automatically
      updateParentMarks(studentIndex, newMarks);
      return newMarks;
    });
    setInvalidInputs(prev => { const cp = { ...prev }; delete cp[key]; return cp; });
  };

  // Helper function to update parent marks based on children's marks
  const updateParentMarks = (studentIndex, currentMarks) => {
    // Find all questions that have children
    const parentsWithChildren = questions.filter(q => 
      questions.some(child => child.parent_part_id === q.part_id)
    );

    // Sort parents by hierarchy level (deepest first) to calculate bottom-up
    const sortedParents = parentsWithChildren.sort((a, b) => {
      const aDepth = getQuestionDepth(a.part_id);
      const bDepth = getQuestionDepth(b.part_id);
      return bDepth - aDepth; // Deepest first
    });

    sortedParents.forEach(parent => {
      // Find all direct children of this parent
      const children = questions.filter(q => q.parent_part_id === parent.part_id);
      
      // Calculate sum of children's marks
      let sum = 0;
      let hasAnyChildMark = false;
      
      children.forEach(child => {
        const childKey = `${studentIndex}-${child.part_id}`;
        if (currentMarks[childKey] !== undefined && currentMarks[childKey] !== null) {
          sum += Number(currentMarks[childKey]);
          hasAnyChildMark = true;
        }
      });

      // Set parent mark to sum of children (only if at least one child has a mark)
      const parentKey = `${studentIndex}-${parent.part_id}`;
      if (hasAnyChildMark) {
        currentMarks[parentKey] = sum;
      } else {
        // If no children have marks, clear the parent mark
        delete currentMarks[parentKey];
      }
    });
  };

  // Helper function to calculate the depth of a question in the hierarchy
  const getQuestionDepth = (partId) => {
    let depth = 0;
    let currentPart = questions.find(q => q.part_id === partId);
    
    while (currentPart && currentPart.parent_part_id) {
      depth++;
      currentPart = questions.find(q => q.part_id === currentPart.parent_part_id);
    }
    
    return depth;
  };

  const addStudentRow = () => {
    setStudents(prev => {
      const next = [...prev, ''];
      return normalizeStudents(next);
    });
  };

  const calculateTotal = (studentIndex) => {
    // Only sum marks from top-level questions (questions without parent_part_id)
    return questions
      .filter(q => !q.parent_part_id) // Only top-level questions
      .reduce((total, q) => {
        const key = `${studentIndex}-${q.part_id}`;
        return total + (marks[key] || 0);
      }, 0);
  };

  const renderQuestionHierarchy = (nodes, studentIndex, level = 0) => {
    return nodes.map(node => {
      // Check if this node has children
      const hasChildren = node.children && node.children.length > 0;
      // If it has children, make it read-only (calculated automatically)
      const isReadOnly = hasChildren;
      
      return (
        <div key={node.part_id} style={{ marginLeft: `${level * 20}px`, marginBottom: '10px', paddingTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ minWidth: '150px', fontSize: '14px' }}>
              {node.label} ({node.max_marks} marks):
            </span>
            <div style={{ width: '100px' }}>
              <CustomTextField
                id={`mark-${studentIndex}-${node.part_id}`}
                name={`mark-${studentIndex}-${node.part_id}`}
                type="number"
                value={invalidInputs[`${studentIndex}-${node.part_id}`] ?? (marks[`${studentIndex}-${node.part_id}`] ?? '')}
                onChange={(e) => handleMarkChange(studentIndex, node.part_id, e.target.value)}
                label={isReadOnly ? "Auto" : "Marks"}
                icon={FaHashtag}
                error={invalidInputs[`${studentIndex}-${node.part_id}`] ? `Max ${node.max_marks}` : ''}
                min="0"
                max={node.max_marks}
                disabled={isReadOnly}
              />
            </div>
            {isReadOnly && (
              <span style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                (Sum of sub-parts)
              </span>
            )}
          </div>
          {hasChildren && renderQuestionHierarchy(node.children, studentIndex, level + 1)}
        </div>
      );
    });
  };

  const handleSaveMarks = async () => {
    // Block save if any invalid inputs remain
    if (Object.keys(invalidInputs).length > 0) {
      setSaveError('Please correct highlighted marks (exceeding max or invalid) before saving.');
      setTimeout(() => {
        setSaveError('');
      }, 10000);
      return;
    }

    // Validation: Check if all students have IDs and all questions have marks entered
    const validationErrors = [];
    
    // Filter out empty student rows
    const validStudents = students.filter((student, index) => {
      const studentId = student?.trim();
      if (!studentId) return false;
      
      // Check if this student has marks for all questions
      const missingMarks = questions.filter(q => {
        const key = `${index}-${q.part_id}`;
        const mark = marks[key];
        return mark === undefined || mark === null || mark === '';
      });

      if (missingMarks.length > 0) {
        validationErrors.push(`Student "${studentId}" is missing marks for: ${missingMarks.map(q => q.label).join(', ')}`);
      }

      return true;
    });

    // Check if there are any valid students to save
    if (validStudents.length === 0) {
      setSaveError('Please Enter student ID before saving.');
      setTimeout(() => {
        setSaveError('');
      }, 10000);
      return;
    }

    // If there are validation errors, show them
    if (validationErrors.length > 0) {
      setSaveError(validationErrors.join(' | '));
      setTimeout(() => {
        setSaveError('');
      }, 10000);
      return;
    }

    setSaveError('');
    const marksData = [];
    
    students.forEach((student, studentIndex) => {
      const studentId = student?.trim();
      if (studentId) {
        questions.forEach(q => {
          const key = `${studentIndex}-${q.part_id}`;
          const score = marks[key] || 0;
          marksData.push({
            student_identifier: studentId,
            question_part_id: q.part_id,
            score_awarded: score
          });
        });
      }
    });

    try {
      await markAPI.saveMarks(id, { marks: marksData });
      setAlertConfig({
        message: 'All marks have been saved successfully!',
        title: 'Success',
        type: 'success',
        confirmText: 'OK',
      });
      setAlertOpen(true);
      // Clear all fields after successful save
      setStudents(['']);
      setMarks({});
    } catch (error) {
      console.error('Error saving marks:', error);
      setSaveError('Error saving marks to server. Please try again.');
      setTimeout(() => {
        setSaveError('');
      }, 2000);
    }
  };

  const hierarchy = buildHierarchy(questions);

  return (
    <DashboardLayout sidebarSections={Array.isArray(teacherSidebarSections) ? teacherSidebarSections : []}>
      <div style={{ padding: '20px' }}>
        {saveError && (
          <div style={{
            background:'#fee2e2',
            border:'1px solid #fca5a5',
            color:'#b91c1c',
            padding:'10px 14px',
            borderRadius:'6px',
            marginBottom:'16px',
            fontSize:'14px',
            display:'flex',
            alignItems:'center',
            gap:'8px'
          }}>
            <span style={{fontWeight:'600'}}>Cannot save.</span>
            <span>{saveError}</span>
            <button onClick={()=>setSaveError('')} style={{marginLeft:'auto',background:'transparent',border:'none',color:'#b91c1c',cursor:'pointer',fontWeight:'600'}}>×</button>
          </div>
        )}
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

      {/* Alert Box */}
      <BasicAlertBox
        open={alertOpen}
        message={alertConfig.message}
        title={alertConfig.title}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        onConfirm={() => setAlertOpen(false)}
        showCloseButton={true}
      />
    </DashboardLayout>
  );
};

export default MarkingView;
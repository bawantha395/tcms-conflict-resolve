import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { markAPI } from '../../../../api/Examapi';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import teacherSidebarSections from '../TeacherDashboardSidebar';
import BasicTable from '../../../../components/BasicTable';
import { FaBars, FaTimes, FaGraduationCap, FaSearch, FaStar, FaSync } from 'react-icons/fa';



const ResultsView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterStudent, setFilterStudent] = useState('');
  const [filterQuestion, setFilterQuestion] = useState('');
  const [filterMinScore, setFilterMinScore] = useState('');
  const [filterMaxScore, setFilterMaxScore] = useState('');
  // Modal state for per-student breakdown
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentHierarchy, setStudentHierarchy] = useState([]);

  useEffect(() => {
    fetchResults();
  }, [id]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, filterStudent, filterQuestion, filterMinScore, filterMaxScore]);

  const fetchResults = async () => {
    try {
      const response = await markAPI.getResults(id);
      // support axios response shape and raw data
      const data = response?.data ?? response ?? [];
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching results:', error);
      setResults([]);
    }
  };

  const applyFilters = () => {
    let filtered = results;

    if (filterStudent) {
      filtered = filtered.filter(r => (r.student_identifier || '').toLowerCase().includes(filterStudent.toLowerCase()));
    }

    if (filterQuestion) {
      filtered = filtered.filter(r => (r.label || '').toLowerCase().includes(filterQuestion.toLowerCase()));
    }

    if (filterMinScore !== '') {
      const min = parseFloat(filterMinScore);
      if (!Number.isNaN(min)) filtered = filtered.filter(r => r.score_awarded >= min);
    }

    if (filterMaxScore !== '') {
      const max = parseFloat(filterMaxScore);
      if (!Number.isNaN(max)) filtered = filtered.filter(r => r.score_awarded <= max);
    }

    setFilteredResults(filtered);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sorted = [...filteredResults].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredResults(sorted);
  };

  const calculateStudentTotals = () => {
    const totals = {};
    results.forEach(r => {
      const idKey = r.student_identifier ?? 'unknown';
      if (!totals[idKey]) totals[idKey] = 0;
      totals[idKey] += Number(r.score_awarded) || 0;
    });
    return totals;
  };

  // Build hierarchy tree for a student's results using parent/child fields
  const buildHierarchyFromStudentResults = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const toNumberOrNull = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const toNumberOrZero = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const byId = new Map();
    const ensureNode = (partId, data, overrides = {}) => {
      if (!partId) return null;
      if (!byId.has(partId)) {
        byId.set(partId, {
          id: partId,
          label: data?.label ?? overrides.label ?? `Part ${partId}`,
          max_marks: toNumberOrNull(data?.max_marks ?? overrides.max_marks),
          // rawScore is the direct score on this part (leaf in most cases)
          rawScore: Number(data?.score_awarded) || 0,
          // score will later be aggregated from children if any
          score: Number(data?.score_awarded) || 0,
          parentId: data?.parent_part_id ?? overrides.parentId ?? data?.parent_id ?? null,
          order: toNumberOrZero(data?.display_order ?? overrides.order),
          children: []
        });
      } else if (data) {
        // If duplicate rows for same part, accumulate raw score
        const n = byId.get(partId);
        const add = Number(data?.score_awarded) || 0;
        n.rawScore += add;
        n.score += add;
        if (n.max_marks == null) {
          n.max_marks = toNumberOrNull(data?.max_marks ?? overrides.max_marks);
        }
        if (n.parentId == null && (data?.parent_part_id ?? overrides.parentId)) {
          n.parentId = data?.parent_part_id ?? overrides.parentId;
        }
        if (!n.label && (data?.label || overrides.label)) {
          n.label = data?.label ?? overrides.label;
        }
      }
      return byId.get(partId);
    };

    // Create nodes for each row
    rows.forEach(r => {
      const partId = r.part_id ?? r.question_part_id ?? r.id ?? `${r.label ?? 'part'}-${r.max_marks ?? ''}-${r.display_order ?? ''}`;
      ensureNode(partId, r);
    });

    // Ensure synthetic parent nodes exist if rows only contain children
    rows.forEach(r => {
      const parentId = r.parent_part_id ?? r.parent_id;
      if (parentId && !byId.has(parentId)) {
        ensureNode(parentId, null, {
          label: r.parent_label ?? `Q ${parentId}`,
          max_marks: r.parent_max_marks,
          parentId: null,
          order: toNumberOrZero(r.parent_display_order)
        });
      }
    });

    // Link children to parents and collect roots
    const roots = [];
    byId.forEach(node => {
      const parentId = node.parentId;
      if (parentId && byId.has(parentId)) {
        byId.get(parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Aggregate: if a node has children, its score/max_marks become the sum of children's
    const aggregateNode = (node) => {
      if (node.children && node.children.length) {
        node.children.forEach(aggregateNode);
        node.score = node.children.reduce((sum, c) => sum + (Number(c.score) || 0), 0);
        const childMax = node.children
          .map(c => c.max_marks)
          .filter(v => typeof v === 'number' && !Number.isNaN(v));
        if (childMax.length > 0) {
          node.max_marks = childMax.reduce((a, b) => a + b, 0);
        }
      } else {
        // Leaf: keep its own raw score
        node.score = Number(node.rawScore) || 0;
      }
      return node;
    };

    roots.forEach(aggregateNode);

    // Sort by display order then label
    const sortNodes = (arr) => {
      arr.sort((a, b) => (a.order - b.order) || String(a.label).localeCompare(String(b.label)));
      arr.forEach(n => {
        if (n.children && n.children.length) sortNodes(n.children);
      });
      return arr;
    };

    return sortNodes(roots);
  };

  const openStudentModal = (studentId) => {
    const rows = results.filter(r => (r.student_identifier ?? '') === studentId);
    const tree = buildHierarchyFromStudentResults(rows);
    setSelectedStudent(studentId);
    setStudentHierarchy(tree);
    setShowStudentModal(true);
  };

  const closeStudentModal = () => {
    setShowStudentModal(false);
    setSelectedStudent(null);
    setStudentHierarchy([]);
  };

  const renderHierarchy = (nodes, level = 0) => {
    if (!nodes || nodes.length === 0) return null;
    return nodes.map(n => (
      <div key={n.id} style={{ marginLeft: level * 16, padding: '6px 8px', borderRadius: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>{n.label}</strong>
            {typeof n.max_marks === 'number' && (
              <span style={{ color: '#666', marginLeft: 6 }}>({n.max_marks} marks)</span>
            )}
          </div>
          <div style={{ fontWeight: 600 }}>
            {Number.isFinite(n.score) ? n.score : 0}
            {typeof n.max_marks === 'number' ? ` / ${n.max_marks}` : ''}
          </div>
        </div>
        {n.children && n.children.length > 0 && renderHierarchy(n.children, level + 1)}
      </div>
    ));
  };

  const studentTotals = calculateStudentTotals();

  // Totals for the selected student (based on aggregated roots to avoid double counting)
  const selectedStudentTotals = (() => {
    const roots = Array.isArray(studentHierarchy) ? studentHierarchy : [];
    const totalScore = roots.reduce((sum, n) => sum + (Number(n.score) || 0), 0);
    const totalMax = roots.reduce((sum, n) => sum + (Number.isFinite(n.max_marks) ? Number(n.max_marks) : 0), 0);
    const percent = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
    return { totalScore, totalMax, percent };
  })();

  // Apply the student-id filter to the totals list only by student id text
  const filteredStudentTotalsEntries = Object.entries(studentTotals).filter(([student, total]) => {
    const needle = (filterStudent || '').trim().toLowerCase();
    const matchesStudent = needle ? String(student).toLowerCase().includes(needle) : true;

    // Apply min/max on the aggregated total per student
    const min = filterMinScore !== '' ? parseFloat(filterMinScore) : null;
    const max = filterMaxScore !== '' ? parseFloat(filterMaxScore) : null;
    const numericTotal = Number(total) || 0;

    const meetsMin = (min === null || Number.isNaN(min)) ? true : numericTotal >= min;
    const meetsMax = (max === null || Number.isNaN(max)) ? true : numericTotal <= max;

    return matchesStudent && meetsMin && meetsMax;
  });

  return (
    <DashboardLayout sidebarSections={Array.isArray(teacherSidebarSections) ? teacherSidebarSections : []}>
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
                onClick={() => navigate('/teacher/exams/dashboard')}
                className="px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-150 border-2 bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50"
                aria-label="Back to dashboard"
                >
                ← Back
            </button>
            <h1 className="text-lg font-bold">Results & Analysis</h1>

          </div>
        </div>

        <div style={{
                  marginBottom: '10px',
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'nowrap',        
                  alignItems: 'center',
                  overflowX: 'auto',         
                  paddingBottom: 6
                  }}>
          <div className="relative">
                          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                          <input
                            type="text"
                            placeholder="Filter by student ID"
                            value={filterStudent}
                            onChange={(e) => setFilterStudent(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm text-gray-800 placeholder-gray-500 rounded-xl transition-all duration-200"
                            style={{
                              background: 'rgba(255, 255, 255, 0.12)',
                              backdropFilter: 'blur(20px) saturate(200%) contrast(120%)',
                              border: '1px solid rgba(255, 255, 255, 0.25)',
                              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                            }}
                          />
                        </div>
         
          <div className="relative">
                          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                          <input
                            type="number"
                          placeholder="Min score"
                        value={filterMinScore}
                          onChange={(e) => setFilterMinScore(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm text-gray-800 placeholder-gray-500 rounded-xl transition-all duration-200"
                            style={{
                              background: 'rgba(255, 255, 255, 0.12)',
                              backdropFilter: 'blur(20px) saturate(200%) contrast(120%)',
                              border: '1px solid rgba(255, 255, 255, 0.25)',
                              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                            }}
                          />
                        </div>
                        <div className="relative">
                          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                          <input
                            type="number"
                             placeholder="Max score"
                            value={filterMaxScore}
                             onChange={(e) => setFilterMaxScore(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm text-gray-800 placeholder-gray-500 rounded-xl transition-all duration-200"
                            style={{
                              background: 'rgba(255, 255, 255, 0.12)',
                              backdropFilter: 'blur(20px) saturate(200%) contrast(120%)',
                              border: '1px solid rgba(255, 255, 255, 0.25)',
                              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                            }}
                          />
                        </div>
         <div className="flex-shrink-0">
                       <button
                         onClick={fetchResults}
                         className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                       >
                         <FaSync className="text-sm" />
                         Refresh
                       </button>
                     </div>
          
        </div>

        

        <div style={{ overflowX: 'auto' }}>
        </div>

         <div style={{ overflowX: 'auto' }}>
          {/* Replace inline table with BasicTable to apply shared BasicTable styles */}
          {/* <BasicTable
            columns={[
              { key: 'student_identifier', label: 'Student ID', sortable: true },
              { key: 'label', label: 'Question', sortable: true },
              { key: 'score_awarded', label: 'Score Awarded', sortable: true },
              { key: 'max_marks', label: 'Max Marks', sortable: true },
            ]}
            data={filteredResults}
            onSort={handleSort}
            sortConfig={sortConfig}
            loading={false}
            emptyMessage="No results found."
            className="my-results-table"
          /> */}
        </div>

        
  <h3 className="text-lg font-bold" style={{ marginTop: '30px', marginBottom: '30px' ,margin: '50px'}}>Student Totals</h3>
          <div style={{ margin: '100px' , marginTop: '20px' }}>
          <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px', listStyle: 'none', padding: 0, margin: 0 }}>
          {filteredStudentTotalsEntries.length === 0 ? (
            <li style={{ color: '#666' }}>No students match the filter.</li>
          ) : (
            filteredStudentTotalsEntries.map(([student, total]) => (
              <li key={student}>
                <button
                style={{ display: 'block', width: '100%', textAlign: 'left', border: '1px solid #b3d1ff', borderRadius: 8, padding: '12px 16px', background: '#e6f2ff' }}
                  onClick={() => openStudentModal(student)}
                  className="text-cyan-700 hover:underline"
                  aria-label={`View breakdown for ${student}`}
                >
                  {student}: {total}
                </button>
              </li>
            ))
          )}
          </ul>
        </div>
      </div>
      {/* Student breakdown modal */}
      {showStudentModal && (
        <div
          className="fixed inset-0"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-modal="true"
          role="dialog"
        >
          <div
            style={{
              width: 'min(900px, 92vw)',
              maxHeight: '80vh',
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderBottom: '1px solid #eee'
            }}>
              <h2 className="text-base font-bold">
                Student — {selectedStudent}
                {selectedStudentTotals.totalMax > 0 && (
                  <> — {selectedStudentTotals.totalScore} / {selectedStudentTotals.totalMax} ({selectedStudentTotals.percent.toFixed(1)}%)</>
                )}
              </h2>
              <button
                onClick={closeStudentModal}
                className="px-2 py-1 text-gray-600 hover:text-gray-800"
                aria-label="Close"
                title="Close"
              >
                <FaTimes />
              </button>
            </div>
            <div style={{ padding: 16, overflowY: 'auto' }}>
              {studentHierarchy && studentHierarchy.length > 0 ? (
                <div>
                  {renderHierarchy(studentHierarchy)}
                </div>
              ) : (
                <div style={{ color: '#666' }}>No hierarchical data available for this student.</div>
              )}
            </div>
            <div style={{ padding: 12, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={closeStudentModal}
                className="px-4 py-2 rounded-md bg-cyan-600 text-white hover:bg-cyan-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ResultsView;
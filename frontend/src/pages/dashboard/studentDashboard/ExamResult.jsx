import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { markAPI, examAPI } from '../../../api/Examapi';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import studentSidebarSections from './StudentDashboardSidebar';
import { getUserData } from '../../../api/apiUtils';

const ExamResult = () => {
	const { id } = useParams();
	const navigate = useNavigate();

	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
		const [examTitle, setExamTitle] = useState('');

	// Modal state for per-exam hierarchy view
	const [showHierarchyModal, setShowHierarchyModal] = useState(false);
	const [selectedExam, setSelectedExam] = useState({ id: null, title: '' });
	const [hierarchyNodes, setHierarchyNodes] = useState([]);

	const getLoggedStudentId = () => {
		try {
			const user = getUserData();
			if (user) {
				return (
					user.userid || user.studentId || user.student_id || user.username || user.id || user.userId || null
				);
			}
		} catch {}
		const keys = ['studentId', 'student_id', 'userid', 'userId', 'username', 'id', 'userData'];
		for (const k of keys) {
			const raw = localStorage.getItem(k) || sessionStorage.getItem(k);
			if (!raw) continue;
			try {
				const parsed = JSON.parse(raw);
				const val = parsed.userid || parsed.studentId || parsed.student_id || parsed.username || parsed.id || parsed.userId;
				if (val) return String(val);
			} catch {
				return String(raw);
			}
		}
		return null;
	};

	const studentIdentifier = getLoggedStudentId();

	useEffect(() => {
		// Remember current exam id for sidebar deep-links when available
		try { if (id) sessionStorage.setItem('currentExamId', String(id)); } catch {}

		const load = async () => {
			setLoading(true);
			setError('');
			try {
				if (!studentIdentifier) {
					setRows([]);
					setError('Logged student id not found. Please sign in.');
					return;
				}
				// Fetch results for the logged-in student using the provided API
				const resp = await markAPI.getByStudent(studentIdentifier);
				const data = resp?.data ?? resp ?? [];
				let arr = Array.isArray(data) ? data : [];
				// If an exam id is present in URL, filter for that exam only
				if (id) {
					arr = arr.filter(r => String(r.exam_id ?? r.examId ?? r.exam) === String(id));
				}
				setRows(arr);
			} catch (e) {
				console.error('Failed to load results', e);
				setError('Failed to load results');
				setRows([]);
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [id, studentIdentifier]);

		// Fetch exam title if an exam id is present
		useEffect(() => {
			const fetchTitle = async () => {
				if (!id) { setExamTitle(''); return; }
				try {
					const resp = await examAPI.getById(id);
					const data = resp?.data ?? resp;
					const title = data?.title || data?.exam_title || '';
					setExamTitle(title || '');
				} catch {
					setExamTitle('');
				}
			};
			fetchTitle();
		}, [id]);

	// Quick stats
	const stats = useMemo(() => {
		const uniqueStudents = new Set();
		rows.forEach(r => {
			const sid = r.student_identifier || r.student_id || r.userid || r.user_id || r.reg_no || r.registration_no || r.username;
			if (sid) uniqueStudents.add(String(sid));
		});
		return { studentCount: uniqueStudents.size, rowCount: rows.length };
	}, [rows]);

	// Unique exams from rows for quick selection
	const exams = useMemo(() => {
		const map = new Map();
		rows.forEach(r => {
			const eId = String(r.exam_id ?? r.examId ?? r.exam ?? '');
			if (!eId) return;
			if (!map.has(eId)) {
				map.set(eId, {
					id: eId,
					title: examTitle || r.exam_title || r.title || r.exam || eId
				});
			}
		});
		return Array.from(map.values());
	}, [rows, examTitle]);

	// Build hierarchy tree from result rows (same student), using parent/child fields
	const buildHierarchyFromRows = (rowsForExam) => {
		if (!Array.isArray(rowsForExam) || rowsForExam.length === 0) return [];

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
					rawScore: Number(data?.score_awarded) || 0,
					score: Number(data?.score_awarded) || 0,
					parentId: data?.parent_part_id ?? overrides.parentId ?? data?.parent_id ?? null,
					order: toNumberOrZero(data?.display_order ?? overrides.order),
					children: []
				});
			} else if (data) {
				const n = byId.get(partId);
				const add = Number(data?.score_awarded) || 0;
				n.rawScore += add;
				n.score += add;
				if (n.max_marks == null) n.max_marks = toNumberOrNull(data?.max_marks ?? overrides.max_marks);
				if (n.parentId == null && (data?.parent_part_id ?? overrides.parentId)) n.parentId = data?.parent_part_id ?? overrides.parentId;
				if (!n.label && (data?.label || overrides.label)) n.label = data?.label ?? overrides.label;
			}
			return byId.get(partId);
		};

		// Create nodes for each row
		rowsForExam.forEach(r => {
			const partId = r.part_id ?? r.question_part_id ?? r.id ?? `${r.label ?? 'part'}-${r.max_marks ?? ''}-${r.display_order ?? ''}`;
			ensureNode(partId, r);
		});

		// Ensure parent nodes exist
		rowsForExam.forEach(r => {
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

		// Link and collect roots
		const roots = [];
		byId.forEach(node => {
			const parentId = node.parentId;
			if (parentId && byId.has(parentId)) byId.get(parentId).children.push(node);
			else roots.push(node);
		});

		const aggregateNode = (node) => {
			if (node.children && node.children.length) {
				node.children.forEach(aggregateNode);
				node.score = node.children.reduce((sum, c) => sum + (Number(c.score) || 0), 0);
				const childMax = node.children.map(c => c.max_marks).filter(v => typeof v === 'number' && !Number.isNaN(v));
				if (childMax.length > 0) node.max_marks = childMax.reduce((a, b) => a + b, 0);
			} else {
				node.score = Number(node.rawScore) || 0;
			}
			return node;
		};
		roots.forEach(aggregateNode);

		const sortNodes = (arr) => {
			arr.sort((a, b) => (a.order - b.order) || String(a.label).localeCompare(String(b.label)));
			arr.forEach(n => n.children && n.children.length && sortNodes(n.children));
			return arr;
		};

		return sortNodes(roots);
	};

	const openExamHierarchy = (examId, title) => {
		if (!examId) return;
		const subset = rows.filter(r => String(r.exam_id ?? r.examId ?? r.exam) === String(examId));
		const tree = buildHierarchyFromRows(subset);
		setSelectedExam({ id: examId, title });
		setHierarchyNodes(tree);
		setShowHierarchyModal(true);
	};

	const closeExamHierarchy = () => {
		setShowHierarchyModal(false);
		setSelectedExam({ id: null, title: '' });
		setHierarchyNodes([]);
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

	return (
		<DashboardLayout sidebarSections={Array.isArray(studentSidebarSections) ? studentSidebarSections : []}>
			<div style={{ padding: 20 }}>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-150 border-2 bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50"
                aria-label="Back to dashboard"
                >
                ← Back
                </button> */}
          <h1 className="text-lg font-bold" style={{ marginBottom: 20 }}>My Exam Results</h1>

					</div>
					{/* <div style={{ color: '#444', fontWeight: 600 }}>
						{stats.studentCount} students • {stats.rowCount} rows
					</div> */}
				</div>

				{!id && !studentIdentifier && (
					<div style={{ color: '#666' }}>No exam selected and no logged student. Sign in or visit <code>/student/exam/&lt;examId&gt;/results</code></div>
				)}

				{error && (
					<div style={{ color: 'red', marginBottom: 8 }}>{error}</div>
				)}
				{!error && (
					<div>
						{loading ? (
							<div>Loading...</div>
						) : exams.length === 0 ? (
							<div>No results found.</div>
						) : (
							<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 15 }}>
								{exams.map(ex => {
									const subset = rows.filter(r => String(r.exam_id ?? r.examId ?? r.exam) === String(ex.id));
									const tree = buildHierarchyFromRows(subset);
									const totalScore = tree.reduce((sum, n) => sum + (Number(n.score) || 0), 0);
									const totalMax = tree.reduce((sum, n) => sum + (Number.isFinite(n.max_marks) ? Number(n.max_marks) : 0), 0);
									const percent = totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(1) + '%' : '';
									const label = percent ? `${ex.title} — ${percent}` : ex.title;
									return (
										<button
											key={ex.id}
											onClick={() => openExamHierarchy(ex.id, ex.title)}
											className="text-cyan-700 hover:underline"
											style={{
												textAlign: 'left', border: '1px solid #b3d1ff', borderRadius: 8,
												padding: '10px 12px', background: '#e6f2ff'
											}}
											aria-label={`View hierarchy for ${ex.title}`}
										>
											{label}
										</button>
									);
								})}
							</div>
						)}
					</div>
				)}

				{/* Hierarchy modal for selected exam */}
				{showHierarchyModal && (
					<div
						style={{
							position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000,
							display: 'flex', alignItems: 'center', justifyContent: 'center'
						}}
						aria-modal="true"
						role="dialog"
					>
						<div style={{ width: 'min(860px, 92vw)', maxHeight: '80vh', background: '#fff', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #eee' }}>
								<h2 className="text-base font-bold">{selectedExam.title || 'Exam'}</h2>
								
							</div>
							<div style={{ padding: 16, overflowY: 'auto' }}>
								{hierarchyNodes && hierarchyNodes.length > 0 ? (
									<div>{renderHierarchy(hierarchyNodes)}</div>
								) : (
									<div style={{ color: '#666' }}>No hierarchical data available for this exam.</div>
								)}
							</div>
							<div style={{ padding: 12, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end' }}>
								<button onClick={closeExamHierarchy} className="px-4 py-2 rounded-md bg-cyan-600 text-white hover:bg-cyan-700">Close</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</DashboardLayout>
	);
};

export default ExamResult;


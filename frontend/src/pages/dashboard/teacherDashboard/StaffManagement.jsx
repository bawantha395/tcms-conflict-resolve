import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getUserData } from '../../../api/apiUtils';
import { apiPost } from '../../../api/apiUtils';
import { getStaffForTeacher, createStaffForTeacher, updateStaffForTeacher, deleteStaffForTeacher } from '../../../api/teachers';
import CustomTextField from '../../../components/CustomTextField';
import CustomButton from '../../../components/CustomButton';
import BasicAlertBox from '../../../components/BasicAlertBox';
import BasicTable from '../../../components/BasicTable';
import CustomButton2 from '../../../components/CustomButton2';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import teacherSidebarSections from './TeacherDashboardSidebar';	

export default function StaffManagement() {
	const [staffList, setStaffList] = useState([]);
	const [loading, setLoading] = useState(false);
	// default permissions: keep previous default (exams:true) and add explicit class-related keys
	const [form, setForm] = useState({
		name: '',
		email: '',
		phone: '',
		password: '',
		permissions: {
			exams: true,
			// overview permission for class overview tab
			// parent key for classes grouping
			classes: false,
			// children of classes
			schedules: false,
			materials: false,
			recordings: false,
			
			// other permissions
			attendance: false,
			enrollments: false,
			payments: false,
			staff_management: false
		}
	});

	// Available permission keys for teacher staff (used for rendering non-class permissions)
	const availablePermissions = [
		{ key: 'attendance', label: 'Attendance' },
		// 'classes' is rendered separately as a parent with nested children
		{ key: 'exams', label: 'Exams' },
		{ key: 'enrollments', label: 'Enrollments' },
		{ key: 'payments', label: 'Payments' },
		{ key: 'staff_management', label: 'Staff Management' }
	];

	// children keys for the 'My Classes' parent
	const classesChildren = [
		{ key: 'schedules', label: 'Schedules' },
		{ key: 'materials', label: 'Materials' },
		{ key: 'recordings', label: 'Recordings' },
		{ key: 'overview', label: 'Overview' }
	];
	const [message, setMessage] = useState(null);
	const [alertType, setAlertType] = useState('info');

	// Editing state
	const [editingStaffId, setEditingStaffId] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [sortConfig, setSortConfig] = useState({ key: 'staffId', direction: 'asc' });

	// Delete confirmation state
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState(null); // staffId


	const user = getUserData();
	const teacherId = user?.teacherId || user?.userid || null;

	const fetchStaff = useCallback(async () => {
		if (!teacherId) return;
		setLoading(true);
		try {
			const res = await getStaffForTeacher(teacherId);
			if (res.success) setStaffList(res.data || []);
			else { setMessage(res.message || 'Failed to fetch staff'); setAlertType('danger'); }
		} catch (err) {
			setMessage(err.message || 'Error fetching staff');
			setAlertType('danger');
		} finally {
			setLoading(false);
		}
	}, [teacherId]);

	useEffect(() => { fetchStaff(); }, [fetchStaff]);

	// Derived list: filtered and sorted
	const displayedStaff = useMemo(() => {
		let list = Array.isArray(staffList) ? [...staffList] : [];

		// Filter by name or staffId (case-insensitive)
		if (searchTerm && searchTerm.toString().trim() !== '') {
			const q = searchTerm.toString().trim().toLowerCase();
			list = list.filter(r => {
				const name = (r.name || '').toString().toLowerCase();
				const id = (r.staffId || r.id || '').toString().toLowerCase();
				return name.includes(q) || id.includes(q);
			});
		}

		// Sort
		if (sortConfig && sortConfig.key) {
			const { key, direction } = sortConfig;
			list.sort((a, b) => {
				const va = (a[key] !== undefined && a[key] !== null) ? a[key] : '';
				const vb = (b[key] !== undefined && b[key] !== null) ? b[key] : '';
				// Compare as strings by default
				const sa = va.toString().toLowerCase();
				const sb = vb.toString().toLowerCase();
				if (sa < sb) return direction === 'asc' ? -1 : 1;
				if (sa > sb) return direction === 'asc' ? 1 : -1;
				return 0;
			});
		}

		return list;
	}, [staffList, searchTerm, sortConfig]);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setForm(prev => ({ ...prev, [name]: value }));
	};

	const handlePermissionToggle = (permKey) => {
		// Special handling for the classes parent / children behavior
		if (permKey === 'classes') {
			setForm(prev => {
				const parentNew = !prev.permissions.classes;
				const newPermissions = { ...prev.permissions, classes: parentNew };
				// when turning parent on, enable all children; when turning off, clear children
				classesChildren.forEach(c => {
					newPermissions[c.key] = parentNew;
				});
				return { ...prev, permissions: newPermissions };
			});
			return;
		}

		// If the toggled key is a child of classes, flip it and update parent accordingly
		if (classesChildren.some(c => c.key === permKey)) {
			setForm(prev => {
				const newPermissions = { ...prev.permissions, [permKey]: !prev.permissions[permKey] };
				// determine if any child is true
				const anyChildTrue = classesChildren.some(c => c.key === permKey ? !prev.permissions[permKey] : newPermissions[c.key]);
				newPermissions.classes = anyChildTrue;
				return { ...prev, permissions: newPermissions };
			});
			return;
		}

		// Default single-permission toggle
		setForm(prev => ({
			...prev,
			permissions: {
				...prev.permissions,
				[permKey]: !prev.permissions[permKey]
			}
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setMessage(null);
		if (!teacherId) { setMessage('Teacher ID missing'); setAlertType('danger'); return; }
		try {
			const payload = { ...form };
			// If editing, password change is optional. If left blank, don't send password in update payload.
			if (editingStaffId && (!payload.password || payload.password.toString().trim() === '')) {
				delete payload.password;
			}
			if (editingStaffId) {
				// Update existing staff
				const res = await updateStaffForTeacher(editingStaffId, payload);
				if (res.success) {
					setMessage('Staff updated: ' + (res.staffId || ''));
					setAlertType('success');
					setEditingStaffId(null);
					// reset form
					setForm({ name: '', email: '', phone: '', password: '', permissions: { exams: true, overview: false, classes: false, schedules: false, materials: false, recordings: false, attendance: false, enrollments: false, payments: false, staff_management: false } });
					fetchStaff();
				} else {
					setMessage(res.message || 'Failed to update staff');
					setAlertType('danger');
				}
			} else {
				// Create new staff
				const res = await createStaffForTeacher(teacherId, payload);
				if (res.success) {
					setMessage('Staff created: ' + (res.staffId || '') + '. Staff can change password via Forgot Password.');
					setAlertType('success');
					// Attempt to send welcome WhatsApp message via central auth backend (best-effort)
					try {
						const staffId = res.staffId || (res.data && res.data.staffId) || null;
						if (staffId) {
							// Send a staff-specific welcome message (includes name, phone, and password)
							const fullName = payload.name || '';
							const teacherData = { name: fullName, phone: payload.phone || payload.phoneNumber || '', password: payload.password || '' };
							await apiPost('/routes.php/send-staff-welcome-whatsapp', { userid: staffId, teacherData });
							setMessage(prev => prev + ' — Welcome WhatsApp (staff) sent');
						}
					} catch (wpErr) {
						console.warn('Failed to send welcome WhatsApp for staff:', wpErr);
						// non-fatal: show a warning but don't block create
						setMessage(prev => prev + ' — Failed to send WhatsApp');
					}
					setAlertType('success');
					setForm({ name: '', email: '', phone: '', password: '', permissions: { exams: true, overview: false, classes: false, schedules: false, materials: false, recordings: false, attendance: false, enrollments: false, payments: false, staff_management: false } });
					fetchStaff();
				} else {
					setMessage(res.message || 'Failed to create staff');
					setAlertType('danger');
				}
			}
		} catch (err) {
			setMessage(err.message || 'Error creating staff');
			setAlertType('danger');
		}
	};

	const handleEditClick = (staff) => {
		setEditingStaffId(staff.staffId);
		setForm({
			name: staff.name || '',
			email: staff.email || '',
			phone: staff.phone || '',
			password: '', // leave empty unless user wants to change
			permissions: staff.permissions || { exams: true }
		});
		// use window.scrollTo safely (avoid referencing the global `scrollTo` identifier which ESLint may restrict)
		if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	};

	const handleCancelEdit = () => {
		setEditingStaffId(null);
		setForm({ name: '', email: '', phone: '', password: '', permissions: { exams: true, overview: false, classes: false, schedules: false, materials: false, recordings: false, attendance: false, enrollments: false, payments: false, staff_management: false } });
	};

	const handleDeleteClick = (staffId) => {
		// open confirmation modal first
	 	setDeleteTarget(staffId);
	 	setDeleteConfirmOpen(true);
	};

	// Sorting handler for table
	const handleSort = (key) => {
		setSortConfig(prev => {
			if (!prev || prev.key !== key) return { key, direction: 'asc' };
			// toggle direction
			return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
		});
	};

	const performDelete = async (staffId) => {
	 	setDeleteConfirmOpen(false);
	 	if (!staffId) return;
	 	try {
	 		const res = await deleteStaffForTeacher(staffId);
	 		if (res.success) {
	 			setMessage('Staff deleted: ' + staffId);
	 			setAlertType('success');
	 			// if we were editing this staff, cancel edit
	 			if (editingStaffId === staffId) handleCancelEdit();
	 			fetchStaff();
	 		} else {
	 			setMessage(res.message || 'Failed to delete staff');
	 			setAlertType('danger');
	 		}
	 	} catch (err) {
	 		setMessage(err.message || 'Error deleting staff');
	 		setAlertType('danger');
	 	}
	};

	 <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
			<div className="p-6 bg-white rounded-lg shadow">
			  <div className="flex items-center justify-center h-32">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3da58a]"></div>
				<span className="ml-2 text-gray-600">Loading your classes...</span>
			  </div>
			</div>
	</DashboardLayout>



	return (
		<DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
		<div className="p-6">
			<h2 className="text-2xl font-semibold mb-4">Teacher Staff Management</h2>
			<BasicAlertBox
				open={!!message}
				message={message || ''}
				title={alertType === 'success' ? 'Success' : alertType === 'danger' ? 'Error' : ''}
				type={alertType}
				onConfirm={() => setMessage(null)}
				onCancel={() => setMessage(null)}
				confirmText="OK"
				autoClose={false}
			/>

			{/* Delete confirmation modal */}
			<BasicAlertBox
				open={deleteConfirmOpen}
				message={'Are you sure you want to delete this staff member? This action cannot be undone.'}
				title={'Confirm Delete'}
				type={'danger'}
				onConfirm={() => performDelete(deleteTarget)}
				onCancel={() => { setDeleteConfirmOpen(false); setDeleteTarget(null); }}
				confirmText={'Delete'}
				cancelText={'Cancel'}
			/>

			<div className="mb-6">
				<form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<CustomTextField label="Name" name="name" value={form.name} onChange={handleChange} required />
					<CustomTextField label="Email" name="email" value={form.email} onChange={handleChange} />
					<CustomTextField label="Phone" name="phone" value={form.phone} onChange={handleChange} />
					<CustomTextField label="Password" name="password" value={form.password} onChange={handleChange} required={!editingStaffId} placeholder={editingStaffId ? 'Leave blank to keep current password' : ''} type="password" />
					{/* Permissions checkboxes (grouped: My Classes with nested children) */}
					<div className="col-span-2 p-4 bg-gray-50 rounded">
						<h4 className="font-semibold mb-2">Permissions</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* My Classes group */}
							<div>
								<label className="inline-flex items-center gap-2">
									<input type="checkbox" checked={!!form.permissions['classes']} onChange={() => handlePermissionToggle('classes')} />
									<span className="text-sm font-medium">My Classes</span>
								</label>
								<div className="pl-6 mt-2 grid grid-cols-1 gap-2">
									{classesChildren.map(c => (
										<label key={c.key} className="inline-flex items-center gap-2">
											<input type="checkbox" checked={!!form.permissions[c.key]} onChange={() => handlePermissionToggle(c.key)} />
											<span className="text-sm">{c.label}</span>
										</label>
									))}
								</div>
							</div>

							{/* Other permissions */}
							<div>
								<div className="grid grid-cols-2 md:grid-cols-1 gap-2">
									{availablePermissions.map(p => (
										<label key={p.key} className="inline-flex items-center gap-2">
											<input type="checkbox" checked={!!form.permissions[p.key]} onChange={() => handlePermissionToggle(p.key)} />
											<span className="text-sm">{p.label}</span>
										</label>
									))}
								</div>
							</div>
						</div>
					</div>
					<div className="col-span-2">
						{editingStaffId ? (
							<div className="flex gap-2">
								<CustomButton type="submit">Save Changes</CustomButton>
								<CustomButton type="button" onClick={handleCancelEdit} className="px-4 py-2 bg-gray-600 text-white rounded">Cancel</CustomButton>
							</div>
						) : (
							<CustomButton type="submit">Create Staff</CustomButton>
						)}
					</div>
				</form>
			</div>

			<div>
				<h3 className="text-xl font-medium mb-2">Existing Staff</h3>
				<div className="flex items-center justify-between mb-3">
					<div className="flex items-center gap-2">
						<input
							type="text"
							placeholder="Search by name or ID"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="border border-gray-300 rounded px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-indigo-200"
						/>
						{searchTerm && (
							<button onClick={() => setSearchTerm('')} className="text-sm text-gray-600 ml-2">Clear</button>
						)}
					</div>
					<div className="text-sm text-gray-500">{displayedStaff.length} results</div>
				</div>
				<BasicTable
					columns={[
						{ key: 'staffId', label: 'Staff ID', sortable: true },
						{ key: 'name', label: 'Name', sortable: true },
						{ key: 'email', label: 'Email' },
						{ key: 'phone', label: 'Phone' },
						{ key: 'permissions', label: 'Permissions', render: (row) => (
							<div className="text-sm">
								{/* render each permission on its own line for readability */}
								{[...classesChildren.map(c=>c), ...availablePermissions.map(p=>({ key: p.key, label: p.label }))].map(p => (
									<div key={p.key} className="flex items-center gap-2">
										<span className={`inline-block w-2 h-2 rounded-full ${row.permissions && row.permissions[p.key] ? 'bg-green-500' : 'bg-gray-300'}`} />
										<span>{p.label}</span>
									</div>
								))}
							</div>
						) }
					]}
					data={displayedStaff}
					loading={loading}
					onSort={handleSort}
					sortConfig={sortConfig}
					emptyMessage="No staff members"
					actions={(row) => (
						<div className="flex gap-2">
							<CustomButton2 className="w-auto px-3" color="mint" onClick={() => handleEditClick(row)}>Edit</CustomButton2>
							<CustomButton2 className="w-auto px-3" color="danger" onClick={() => handleDeleteClick(row.staffId)}>Delete</CustomButton2>
						</div>
					)}
				/>
			</div>
			
		</div>
		</DashboardLayout>
	);
}

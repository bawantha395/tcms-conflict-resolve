import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import * as Yup from 'yup';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import studentSidebarSections from '../StudentDashboardSidebar';
import BasicForm from '../../../../components/BasicForm';
import CustomTextField from '../../../../components/CustomTextField';
import { FaCreditCard, FaUser, FaPhone, FaEnvelope } from 'react-icons/fa';
import { getUserData } from '../../../../api/apiUtils';



const TEACHER_API = process.env.REACT_APP_TEACHER_API_BASE_URL || 'http://localhost:8088';

// Fetch full student profile
const fetchStudentProfile = async (userid) => {
	try {
		const { data } = await axios.get(`http://localhost:8086/routes.php/get_with_id/${userid}`, { timeout: 5000 });
		if (data && !data.error) return data;
	} catch (_) {}
	return null;
};

// Build initial student form values
const buildStudentInitials = async () => {
	const user = getUserData();
	if (!user?.userid) return null;
	const profile = await fetchStudentProfile(user.userid);
	// sanitize 'N/A' values (especially for mobile)
	const cleanNA = (v) => (typeof v === 'string' && v.trim().toUpperCase() === 'N/A' ? '' : (v || ''));
	return {
		studentId: profile?.user_id || user.userid || '',
		firstName: profile?.first_name || user.firstName || '',
		lastName: profile?.last_name || user.lastName || '',
		mobile: cleanNA(profile?.mobile_number ?? user.mobile),
		email: profile?.email || user.email || '',
	};
};

const validationSchema = Yup.object().shape({
	firstName: Yup.string().required('Required'),
	lastName: Yup.string().required('Required'),
	mobile: Yup.string().required('Required').matches(/^0[1-9][0-9]{8}$/, 'Invalid mobile number'),
	email: Yup.string().email('Invalid email').required('Required'),
});

const paymentMethods = [
	{ key: 'online', label: 'Online', icon: <FaCreditCard className="text-xl text-green-600" /> },
];

const fileUrl = (relativePath) => {
    if (!relativePath) return '#';
    return `${TEACHER_API}${relativePath}`;
  };


const StudyPackCheckOut = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const passedPack = location.state?.pack;
	const [pack, setPack] = useState(passedPack || null);
	const [loading, setLoading] = useState(!passedPack);
	const [status, setStatus] = useState('');
	const [initials, setInitials] = useState(null);
	const [paymentMethod, setPaymentMethod] = useState('online');
    const [packs, setPacks] = useState([]);
      const user = getUserData();
    

	// Ensure we have full study pack details (with videos/documents/links)
	useEffect(() => {
		const run = async () => {
			if (!id) return;
			const needsFetch = !pack || !Array.isArray(pack?.videos) || !Array.isArray(pack?.documents) || !Array.isArray(pack?.links);
			if (!needsFetch) return;
			try {
				setLoading(true);
				const { data } = await axios.get(`${TEACHER_API}/routes.php/study_pack`, { params: { id } });
				if (data?.success) setPack(data.data); else setStatus(data?.message || 'Failed to load study pack');
			} catch (e) {
				setStatus(e?.response?.data?.message || e?.message || 'Error fetching study pack');
			} finally {
				setLoading(false);
			}
		};
		run();
	}, [id, pack]);

	// Load student info
	useEffect(() => {
		const run = async () => {
			const vals = await buildStudentInitials();
			setInitials(vals || { studentId: '', firstName: '', lastName: '', mobile: '', email: '' });
		};
		run();
	}, []);

    

	if (loading || !initials) {
		return (
			<DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
				<div className="p-6 max-w-3xl mx-auto text-center text-gray-500">Loading checkout…</div>
			</DashboardLayout>
		);
	}

	if (status) {
		return (
			<DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
				<div className="p-6 max-w-3xl mx-auto text-center text-red-600">{status}</div>
			</DashboardLayout>
		);
	}

	if (!pack) {
		return (
			<DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
				<div className="p-6 max-w-3xl mx-auto text-center text-gray-500">Study pack not found.</div>
			</DashboardLayout>
		);
	}

	const price = Number(pack.price || 0);

	return (
		<DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
			<div className="p-4 max-w-6xl mx-auto">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{/* Main card */}
					<div className="md:col-span-2">
						<div className="bg-white rounded-xl shadow p-6 border">
							<div className="flex items-center gap-4 mb-4">
								<img src={pack.image || '/assets/nfts/Nft3.png'} alt={pack.title} className="w-20 h-20 rounded-lg object-cover border" />
								<div>
									<div className="font-semibold">{pack.title}</div>
									<div className="text-xs text-gray-500 mt-1">{pack.teacher_name || pack.teacher_id}</div>
								</div>
								<div className="ml-auto text-right">
									<div className="text-2xl font-bold">LKR {price.toLocaleString()}</div>
								</div>
							</div>

							<BasicForm
								initialValues={initials}
								validationSchema={validationSchema}
								onSubmit={async (values, { setSubmitting }) => {
									try {
										const fullName = `${values.firstName} ${values.lastName}`;
										const orderData = {
											...values,
											fullName,
											className: pack.title,
											subject: pack.subject || 'Study Pack',
											basePrice: price,
											discount: 0,
											amount: price,
											date: new Date().toLocaleDateString(),
											isStudyPack: true,
											classId: pack.id,
											studyPackId: pack.id,
											image: pack.image,
											description: pack.description,
											paymentMethod,
											paymentData: { classId: pack.id, notes: 'Study Pack purchase' },
										};
										navigate('/student/studypack/invoice', { state: orderData });
									} finally {
										setSubmitting(false);
									}
								}}
							>
								{({ errors, touched, handleChange, values, isSubmitting }) => (
									<>
										{/* Study pack description */}
										<div className="mb-6">
											<h4 className="font-semibold mb-2">Description</h4>
											<p className="text-sm text-gray-600 whitespace-pre-line">
												{pack.description ? pack.description : 'No description provided.'}
											</p>
                                            
                                            
                                           
											{/* Counts of content types (normalized) */}
											{(() => {
												const normalize = (val) => {
													if (Array.isArray(val)) return val;
													if (!val) return [];
													if (typeof val === 'string') {
														const trimmed = val.trim();
														if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
															try {
																const parsed = JSON.parse(trimmed);
																return Array.isArray(parsed) ? parsed : [];
															} catch { return []; }
														}
													}
													return [];
												};
												const videos = normalize(pack.videos);
												const docs = normalize(pack.documents);
												const links = normalize(pack.links);
												return (
													<div className="flex flex-wrap gap-2 mt-4 text-xs">
														<span className="px-3 py-1 rounded border bg-indigo-50 border-indigo-200">Videos: {videos.length}</span>
														<span className="px-3 py-1 rounded border bg-green-50 border-green-200">Documents: {docs.length}</span>
														<span className="px-3 py-1 rounded border bg-yellow-50 border-yellow-200">Links: {links.length}</span>
													</div>
												);
											})()}
										</div>
										{/* Student info */}
										<h4 className="font-semibold mb-3">Student Information</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
											<CustomTextField id="studentId" name="studentId" type="text" label="Student ID" value={values.studentId} onChange={() => {}} readOnly icon={FaUser} />
											<CustomTextField id="firstName" name="firstName" type="text" label="First Name *" value={values.firstName} onChange={handleChange} error={errors.firstName} touched={touched.firstName} icon={FaUser} />
											<CustomTextField id="lastName" name="lastName" type="text" label="Last Name *" value={values.lastName} onChange={handleChange} error={errors.lastName} touched={touched.lastName} icon={FaUser} />
											<CustomTextField id="mobile" name="mobile" type="tel" label="Mobile Number *" value={values.mobile} onChange={handleChange} error={errors.mobile} touched={touched.mobile} icon={FaPhone} />
											<CustomTextField id="email" name="email" type="email" label="Email Address *" value={values.email} onChange={handleChange} error={errors.email} touched={touched.email} icon={FaEnvelope} />
										</div>

										{/* Payment method */}
										<h4 className="font-semibold mb-3">Payment Method</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
											{paymentMethods.map((m) => (
												<label key={m.key} className={`flex items-center p-4 border rounded-lg cursor-pointer ${paymentMethod === m.key ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}>
													<input type="radio" name="paymentMethod" value={m.key} checked={paymentMethod === m.key} onChange={(e) => setPaymentMethod(e.target.value)} className="mr-3" />
													<div className="flex items-center gap-3">{m.icon}<span className="font-medium">{m.label}</span></div>
												</label>
											))}
										</div>

										<button type="submit" disabled={isSubmitting} className="w-full py-3 px-6 bg-[#1a365d] text-white rounded-lg hover:bg-[#13294b] disabled:opacity-50">
											{isSubmitting ? 'Processing…' : 'Proceed to Payment'}
										</button>
									</>
								)}
							</BasicForm>
						</div>
					</div>

					{/* Summary */}
					<div className="md:col-span-1">
						<div className="bg-white rounded-xl shadow p-6 border sticky top-4">
							<h3 className="text-lg font-semibold mb-4">Order Summary</h3>
							<div className="space-y-3 text-sm">
								<div className="flex justify-between"><span>Item:</span><span className="font-medium">{pack.title}</span></div>
								<div className="flex justify-between"><span>Category:</span><span>Study Pack</span></div>
								<div className="border-t pt-3 flex justify-between font-semibold"><span>Total:</span><span className="text-lg">LKR {price.toLocaleString()}</span></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</DashboardLayout>
	);
};

export default StudyPackCheckOut;

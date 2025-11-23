import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import studentSidebarSections from '../StudentDashboardSidebar';

const PAYMENT_API = process.env.REACT_APP_PAYMENT_API_BASE_URL || 'http://localhost:8090';
const TEACHER_API = process.env.REACT_APP_TEACHER_API_BASE_URL || 'http://localhost:8088';

const StudentStudyPackCancel = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [orderId, setOrderId] = useState('');
	const [paymentInfo, setPaymentInfo] = useState(null);
	const [pack, setPack] = useState(null);

	useEffect(() => {
		const run = async () => {
			try {
				const qs = new URLSearchParams(location.search);
				const oid = qs.get('order_id') || qs.get('transactionId') || qs.get('orderId') || '';
				const packIdFromQuery = qs.get('studyPackId') || qs.get('pack_id') || qs.get('packId');
				setOrderId(oid);

				// Try to fetch payment status for additional context
				let foundPackId = packIdFromQuery || null;
				if (oid) {
					try {
						const resp = await axios.get(`${PAYMENT_API}/routes.php/get_payment_status`, { params: { order_id: oid } });
						if (resp.data?.data) {
							setPaymentInfo(resp.data.data);
							const maybeId = resp.data.data.study_pack_id || resp.data.data.class_id;
							if (!foundPackId && resp.data.data?.category === 'study_pack' && maybeId) {
								foundPackId = maybeId;
							}
						}
					} catch (_) {
						// ignore
					}
				}

				// Fetch pack details if we know the id
				if (foundPackId) {
					try {
						const packRes = await axios.get(`${TEACHER_API}/routes.php/study_pack`, { params: { id: foundPackId } });
						if (packRes.data?.success) setPack(packRes.data.data);
					} catch (_) {}
				}
			} catch (e) {
				setError('Could not retrieve payment information.');
			} finally {
				setLoading(false);
			}
		};
		run();
	}, [location.search]);

	const retryPurchase = () => {
		// Relaunch PayHere directly from cancel page
		(async () => {
			try {
				setLoading(true);
				const qs = new URLSearchParams(location.search);
				const packId = qs.get('studyPackId') || qs.get('pack_id') || qs.get('packId') || paymentInfo?.study_pack_id || paymentInfo?.class_id || '';
				const amount = Number(paymentInfo?.amount || 0);
				const items = (pack?.title || paymentInfo?.class_name || 'Study Pack') + ' - Study Pack';
				const order_id = orderId || `ORDER_${Date.now()}`;

				if (!amount || amount <= 0) {
					// Not enough data to re-open PayHere; fallback to checkout
					if (packId) navigate(`/student/studypack/checkout/${packId}`);
					else navigate('/student/purchasestudypack01');
					return;
				}

				const payload = {
					order_id,
					amount,
					currency: 'LKR',
					items,
					is_study_pack: true,
					category: 'study_pack',
					student_id: '',
					class_id: packId || ''
				};

				const resp = await axios.post(`${PAYMENT_API}/routes.php/create_payhere_payment`, payload);
				if (resp?.data?.success && resp.data.data) {
					const paymentData = resp.data.data;
					// Submit a form POST to PayHere
					const form = document.createElement('form');
					form.method = 'POST';
					form.action = 'https://sandbox.payhere.lk/pay/checkout';
					Object.entries(paymentData).forEach(([key, value]) => {
						const input = document.createElement('input');
						input.type = 'hidden';
						input.name = key;
						input.value = value ?? '';
						form.appendChild(input);
					});
					document.body.appendChild(form);
					form.submit();
					return; // Navigation leaves the page
				}

				// Fallback if API failed
				if (packId) navigate(`/student/studypack/checkout/${packId}`);
				else navigate('/student/purchasestudypack01');
			} catch (e) {
				// Fallback on error
				const qs = new URLSearchParams(location.search);
				const packId = qs.get('studyPackId') || qs.get('pack_id') || qs.get('packId') || paymentInfo?.study_pack_id || paymentInfo?.class_id;
				if (packId) navigate(`/student/studypack/checkout/${packId}`);
				else navigate('/student/purchasestudypack01');
			} finally {
				setLoading(false);
			}
		})();
	};

	return (
		<DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
			<div className="p-6 max-w-3xl mx-auto">
				<div className="bg-white rounded-xl shadow p-8 text-center border">
					<h1 className="text-2xl font-semibold text-red-600 mb-2">Payment Cancelled</h1>
					<p className="text-gray-600 mb-6">Your study pack payment was not completed.</p>

					{loading ? (
						<div className="text-gray-500">Checking payment status...</div>
					) : (
						<>
							{orderId && (
								<div className="mb-3 text-sm text-gray-600">
									<span className="font-medium">Order / Transaction ID:</span> {orderId}
								</div>
							)}
							{paymentInfo?.status && (
								<div className="mb-4 text-sm text-gray-600">
									<span className="font-medium">Status:</span> {paymentInfo.status}
									{paymentInfo.message ? ` — ${paymentInfo.message}` : ''}
								</div>
							)}
							{pack && (
								<div className="flex items-center gap-4 justify-center my-4">
									<img
										src={pack.image || '/assets/nfts/Nft3.png'}
										alt={pack.title || 'Study Pack'}
										className="w-20 h-20 rounded object-cover border"
									/>
									<div className="text-left">
										<div className="font-semibold">{pack.title || 'Study Pack'}</div>
										<div className="text-sm text-gray-500">LKR {Number(pack.price || 0).toLocaleString()}</div>
									</div>
								</div>
							)}
							{error && <div className="text-sm text-red-600 mb-4">{error}</div>}

							<div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
								<button onClick={retryPurchase} className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Try Again</button>
								<button onClick={() => navigate('/student/studypacks')} className="px-5 py-2 bg-green-600 text-white rounded hover:bg-black">My Study Packs</button>
								{/* <button onClick={() => navigate('/student/studypack/invoice')} className="px-5 py-2 bg-white border rounded hover:bg-gray-50">Browse Study Packs</button> */}
								<button onClick={() => navigate('/studentdashboard')} className="px-5 py-2 bg-white border rounded hover:bg-gray-50">Back to Dashboard</button>
							</div>
						</>
					)}
				</div>
			</div>
		</DashboardLayout>
	);
};

export default StudentStudyPackCancel;





// import React, { useState } from 'react';
// import { XCircle, RefreshCw, Package, Home, ShoppingBag } from 'lucide-react';

// const StudentStudyPackCancel = () => {
// 	const [loading, setLoading] = useState(false);
	
// 	// Sample data for demonstration
// 	const orderId = 'ORD-2024-12345';
// 	const paymentInfo = {
// 		status: 'Cancelled',
// 		message: 'Payment was cancelled by user'
// 	};
// 	const pack = {
// 		title: 'Advanced Mathematics Study Pack',
// 		price: 5000,
// 		image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&h=400&fit=crop'
// 	};
// 	const error = '';

// 	const retryPurchase = () => {
// 		alert('Redirecting to checkout...');
// 	};

// 	const navigateTo = (path) => {
// 		alert(`Navigating to: ${path}`);
// 	};

// 	return (
// 		<div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 py-12 px-4 sm:px-6 lg:px-8">
// 			<div className="max-w-3xl mx-auto">
// 				<div className="bg-white rounded-2xl shadow-xl overflow-hidden">
// 					<div className="bg-gradient-to-r from-red-500 to-orange-500 px-8 py-6">
// 						<div className="flex items-center justify-center">
// 							<div className="bg-white rounded-full p-3 shadow-lg">
// 								<XCircle className="w-12 h-12 text-red-500" />
// 							</div>
// 						</div>
// 					</div>

// 					<div className="px-8 py-10">
// 						<div className="text-center mb-8">
// 							<h1 className="text-3xl font-bold text-gray-900 mb-3">
// 								Payment Cancelled
// 							</h1>
// 							<p className="text-lg text-gray-600">
// 								Your study pack payment was not completed. Don't worry, you can try again anytime.
// 							</p>
// 						</div>

// 						{loading ? (
// 							<div className="flex flex-col items-center justify-center py-8">
// 								<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
// 								<p className="text-gray-500">Checking payment status...</p>
// 							</div>
// 						) : (
// 							<>
// 								{(orderId || paymentInfo) && (
// 									<div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
// 										<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
// 											Transaction Details
// 										</h3>
// 										<div className="space-y-3">
// 											{orderId && (
// 												<div className="flex justify-between items-center">
// 													<span className="text-gray-600">Order ID:</span>
// 													<span className="font-mono text-sm font-medium text-gray-900 bg-white px-3 py-1 rounded border">
// 														{orderId}
// 													</span>
// 												</div>
// 											)}
// 											{paymentInfo?.status && (
// 												<div className="flex justify-between items-center">
// 													<span className="text-gray-600">Status:</span>
// 													<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
// 														{paymentInfo.status}
// 													</span>
// 												</div>
// 											)}
// 											{paymentInfo?.message && (
// 												<div className="pt-2 border-t border-gray-200">
// 													<p className="text-sm text-gray-600">
// 														<span className="font-medium">Note:</span> {paymentInfo.message}
// 													</p>
// 												</div>
// 											)}
// 										</div>
// 									</div>
// 								)}

// 								{pack && (
// 									<div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-200">
// 										<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
// 											Study Pack
// 										</h3>
// 										<div className="flex items-center gap-5">
// 											<img
// 												src={pack.image || '/assets/nfts/Nft3.png'}
// 												alt={pack.title || 'Study Pack'}
// 												className="w-24 h-24 rounded-lg object-cover border-2 border-white shadow-md flex-shrink-0"
// 											/>
// 											<div className="flex-1">
// 												<h4 className="text-lg font-bold text-gray-900 mb-1">
// 													{pack.title || 'Study Pack'}
// 												</h4>
// 												<p className="text-2xl font-bold text-blue-600">
// 													LKR {Number(pack.price || 0).toLocaleString()}
// 												</p>
// 											</div>
// 										</div>
// 									</div>
// 								)}

// 								{error && (
// 									<div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
// 										<p className="text-red-700 text-sm">{error}</p>
// 									</div>
// 								)}

// 								<div className="space-y-3">
// 									<button
// 										onClick={retryPurchase}
// 										className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all shadow-lg hover:shadow-xl"
// 									>
// 										<RefreshCw className="w-5 h-5" />
// 										Try Again
// 									</button>

// 									<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
// 										<button
// 											onClick={() => navigateTo('/student/studypacks')}
// 											className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-colors"
// 										>
// 											<Package className="w-4 h-4" />
// 											<span className="hidden sm:inline">My Study Packs</span>
// 											<span className="sm:hidden">My Packs</span>
// 										</button>

// 										<button
// 											onClick={() => navigateTo('/student/purchasestudypack')}
// 											className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
// 										>
// 											<ShoppingBag className="w-4 h-4" />
// 											<span className="hidden sm:inline">Browse Packs</span>
// 											<span className="sm:hidden">Browse</span>
// 										</button>

// 										<button
// 											onClick={() => navigateTo('/studentdashboard')}
// 											className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
// 										>
// 											<Home className="w-4 h-4" />
// 											<span className="hidden sm:inline">Dashboard</span>
// 											<span className="sm:hidden">Home</span>
// 										</button>
// 									</div>
// 								</div>

// 								<div className="mt-8 pt-6 border-t border-gray-200 text-center">
// 									<p className="text-sm text-gray-500">
// 										Need help? Contact our support team for assistance with your purchase.
// 									</p>
// 								</div>
// 							</>
// 						)}
// 					</div>
// 				</div>
// 			</div>
// 		</div>
// 	);
// };

// export default StudentStudyPackCancel;

import React, { useState, useEffect } from 'react';
import { 
    getMonitoringStatistics, 
    getSuspiciousActivities, 
    getConcurrentSessionViolations,
    blockStudent,
    unblockStudent,
    isStudentBlocked as checkStudentBlocked
} from '../../../api/monitoring';
import { getAllStudents } from '../../../api/students';
import BasicTable from '../../../components/BasicTable';
import BasicAlertBox from '../../../components/BasicAlertBox';
import { 
    FaShieldAlt, FaExclamationTriangle, FaUsers, FaChartLine, 
    FaEye, FaBan, FaUnlock, FaDownload, FaPrint, FaSearch,
    FaFilter, FaSync, FaMapMarkerAlt, FaClock, FaDesktop,
    FaMobile, FaLaptop, FaTablet, FaNetworkWired, FaWifi,
    FaGlobe, FaUserSecret, FaUserCheck, FaUserTimes, FaHistory,
    FaChartBar, FaCalendarAlt, FaFlag, FaCheckCircle, FaTimesCircle, FaTimes,
    FaFingerprint
} from 'react-icons/fa';
import adminSidebarSections from './AdminDashboardSidebar';
import DashboardLayout from '../../../components/layout/DashboardLayout';

const StudentMonitoringDashboard = ({ onLogout }) => {
    const [statistics, setStatistics] = useState({});
    const [suspiciousActivities, setSuspiciousActivities] = useState([]);
    const [concurrentViolations, setConcurrentViolations] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [showUnblockModal, setShowUnblockModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedStudentDetails, setSelectedStudentDetails] = useState(null);
    const [blockReason, setBlockReason] = useState('');
    const [blockDuration, setBlockDuration] = useState(24);
    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [alertConfig, setAlertConfig] = useState({ show: false, message: '', type: 'success' });
    const [blockedStudents, setBlockedStudents] = useState(new Set());

    // Load monitoring data
    const loadMonitoringData = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('Loading monitoring data...');

            const [statsRes, suspiciousRes, violationsRes, studentsRes] = await Promise.all([
                getMonitoringStatistics(),
                getSuspiciousActivities(100),
                getConcurrentSessionViolations(100),
                getAllStudents()
            ]);

            console.log('API Responses:', {
                stats: statsRes,
                suspicious: suspiciousRes,
                violations: violationsRes,
                students: studentsRes
            });

            if (statsRes.success) setStatistics(statsRes.data);
            if (suspiciousRes.success) setSuspiciousActivities(suspiciousRes.data);
            if (violationsRes.success) setConcurrentViolations(violationsRes.data);
            if (studentsRes && Array.isArray(studentsRes)) setStudents(studentsRes);

            // Load blocked students list
            if (studentsRes && Array.isArray(studentsRes)) {
                const blockedSet = new Set();
                for (const student of studentsRes) {
                    try {
                        const blockStatus = await checkStudentBlocked(student.user_id);
                        if (blockStatus.success && blockStatus.is_blocked) {
                            blockedSet.add(student.user_id);
                        }
                    } catch (error) {
                        console.error(`Error checking block status for ${student.user_id}:`, error);
                    }
                }
                setBlockedStudents(blockedSet);
            }

        } catch (error) {
            console.error('Error loading monitoring data:', error);
            setError('Failed to load monitoring data');
        } finally {
            setLoading(false);
        }
    };

    // Check if student is blocked (local state check)
    const isStudentBlockedLocal = (studentId) => {
        return blockedStudents.has(studentId);
    };

    // Get risk assessment details
    const getRiskAssessmentDetails = (row) => {
        if (!row.is_suspicious) {
            return {
                level: 'Normal',
                reason: 'Standard login pattern',
                color: 'text-green-600',
                icon: <FaCheckCircle className="inline mr-1" />
            };
        }

        // Check for multiple devices (most common case)
        const recentActivities = suspiciousActivities.filter(activity => 
            activity.student_id === row.student_id && 
            activity.is_suspicious
        );

        if (recentActivities.length > 0) {
            return {
                level: 'High Risk',
                reason: 'Multiple devices detected',
                color: 'text-red-600',
                icon: <FaExclamationTriangle className="inline mr-1" />
            };
        }

        // Fallback
        return {
            level: 'High Risk',
            reason: 'Suspicious activity detected',
            color: 'text-red-600',
            icon: <FaExclamationTriangle className="inline mr-1" />
        };
    };

    // Parse location data
    const parseLocationData = (locationData) => {
        try {
            if (locationData) {
                const parsed = JSON.parse(locationData);
                return {
                    city: parsed.city || 'Unknown',
                    country: parsed.country || 'Unknown',
                    ip: parsed.ip || 'Unknown'
                };
            }
        } catch (error) {
            console.error('Error parsing location data:', error);
        }
        return { city: 'Unknown', country: 'Unknown', ip: 'Unknown' };
    };

    // Handle viewing student details
    const handleViewDetails = (student) => {
        setSelectedStudentDetails(student);
        setShowDetailsModal(true);
    };

    useEffect(() => {
        console.log('StudentMonitoringDashboard component mounted');
        loadMonitoringData();
        const interval = setInterval(loadMonitoringData, 30000);
        return () => clearInterval(interval);
    }, []);

    // Block student
    const handleBlockStudent = async (studentId) => {
        if (!blockReason.trim()) {
            setAlertConfig({
                show: true,
                message: 'Please provide a reason for blocking the student',
                type: 'warning'
            });
            return;
        }

        try {
            const response = await blockStudent(studentId, blockReason, 'admin', blockDuration);
            if (response.success) {
                setAlertConfig({
                    show: true,
                    message: `Student ${studentId} blocked successfully for ${blockDuration} hours`,
                    type: 'success'
                });
                setShowBlockModal(false);
                setBlockReason('');
                // Update blocked students list
                setBlockedStudents(prev => new Set([...prev, studentId]));
                loadMonitoringData();
            } else {
                setAlertConfig({
                    show: true,
                    message: response.message || 'Failed to block student',
                    type: 'danger'
                });
            }
        } catch (error) {
            setAlertConfig({
                show: true,
                message: 'Error blocking student',
                type: 'danger'
            });
        }
    };

    // Unblock student
    const handleUnblockStudent = async (studentId) => {
        try {
            const response = await unblockStudent(studentId);
            if (response.success) {
                setAlertConfig({
                    show: true,
                    message: `Student ${studentId} unblocked successfully`,
                    type: 'success'
                });
                setShowUnblockModal(false);
                // Update blocked students list
                setBlockedStudents(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(studentId);
                    return newSet;
                });
                loadMonitoringData();
            } else {
                setAlertConfig({
                    show: true,
                    message: response.message || 'Failed to unblock student',
                    type: 'danger'
                });
            }
        } catch (error) {
            setAlertConfig({
                show: true,
                message: 'Error unblocking student',
                type: 'danger'
            });
        }
    };

    // Get device icon and name
    const getDeviceInfo = (userAgent) => {
        const agent = userAgent?.toLowerCase() || '';
        
        // Handle empty or invalid user agent
        if (!userAgent || userAgent.trim() === '') {
            return {
                icon: <FaDesktop className="text-gray-400" />,
                deviceType: 'Unknown Device',
                browser: 'Unknown Browser',
                os: 'Unknown OS',
                fullInfo: 'Unknown Device - Unknown Browser on Unknown OS'
            };
        }
        
        // Device type detection
        let deviceType = 'Desktop';
        let deviceIcon = <FaDesktop className="text-gray-500" />;
        
        if (agent.includes('mobile') || agent.includes('android') || agent.includes('iphone')) {
            deviceType = 'Mobile';
            deviceIcon = <FaMobile className="text-blue-500" />;
        } else if (agent.includes('tablet') || agent.includes('ipad')) {
            deviceType = 'Tablet';
            deviceIcon = <FaTablet className="text-green-500" />;
        } else if (agent.includes('laptop')) {
            deviceType = 'Laptop';
            deviceIcon = <FaLaptop className="text-purple-500" />;
        }
        
        // Enhanced browser detection with fallback
        let browser = detectBrowser(agent);
        
        // OS detection
        let os = 'Unknown OS';
        if (agent.includes('windows')) {
            os = 'Windows';
        } else if (agent.includes('macintosh') || agent.includes('mac os')) {
            os = 'macOS';
        } else if (agent.includes('linux')) {
            os = 'Linux';
        } else if (agent.includes('android')) {
            os = 'Android';
        } else if (agent.includes('iphone') || agent.includes('ipad')) {
            os = 'iOS';
        }
        
        return {
            icon: deviceIcon,
            deviceType,
            browser,
            os,
            fullInfo: `${deviceType} - ${browser} on ${os}`
        };
    };

    // Backward compatibility function
    const getDeviceIcon = (userAgent) => {
        return getDeviceInfo(userAgent).icon;
    };

    // Comprehensive browser detection function
    const detectBrowser = (userAgent) => {
        const agent = userAgent?.toLowerCase() || '';
        
        // Handle empty user agent
        if (!userAgent || userAgent.trim() === '') {
            return 'Unknown Browser';
        }
        
        // Browser detection patterns (order matters - most specific first)
        const browserPatterns = [
            // Modern browsers with specific identifiers
            { pattern: /brave/i, name: 'Brave' },
            { pattern: /opr\//i, name: 'Opera' },
            { pattern: /edg\//i, name: 'Edge' },
            { pattern: /firefox/i, name: 'Firefox' },
            { pattern: /chrome/i, name: 'Chrome' },
            { pattern: /safari/i, name: 'Safari' },
            
            // API and testing tools
            { pattern: /curl/i, name: 'cURL' },
            { pattern: /postman/i, name: 'Postman' },
            { pattern: /insomnia/i, name: 'Insomnia' },
            { pattern: /thunder client/i, name: 'Thunder Client' },
            
            // Mobile browsers
            { pattern: /mobile safari/i, name: 'Mobile Safari' },
            { pattern: /chrome mobile/i, name: 'Chrome Mobile' },
            { pattern: /firefox mobile/i, name: 'Firefox Mobile' },
            
            // Legacy browsers
            { pattern: /msie|trident/i, name: 'Internet Explorer' },
            { pattern: /netscape/i, name: 'Netscape' },
            
            // Development tools
            { pattern: /puppeteer/i, name: 'Puppeteer' },
            { pattern: /selenium/i, name: 'Selenium' },
            { pattern: /playwright/i, name: 'Playwright' },
            
            // Other tools
            { pattern: /wget/i, name: 'wget' },
            { pattern: /python/i, name: 'Python' },
            { pattern: /node/i, name: 'Node.js' },
            { pattern: /java/i, name: 'Java' },
            { pattern: /go-http-client/i, name: 'Go HTTP Client' },
            { pattern: /okhttp/i, name: 'OkHttp' },
            { pattern: /axios/i, name: 'Axios' },
            { pattern: /fetch/i, name: 'Fetch API' },
            { pattern: /xhr/i, name: 'XMLHttpRequest' }
        ];
        
        // Check each pattern
        for (const { pattern, name } of browserPatterns) {
            if (pattern.test(agent)) {
                return name;
            }
        }
        
        // Fallback: Try to extract browser name from User-Agent
        const fallbackPatterns = [
            /([a-zA-Z]+)\//i,  // Extract browser name before slash
            /([a-zA-Z]+)\s/i,  // Extract browser name before space
        ];
        
        for (const pattern of fallbackPatterns) {
            const match = agent.match(pattern);
            if (match && match[1]) {
                const browserName = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
                // Filter out common non-browser strings
                const excludeList = ['mozilla', 'applewebkit', 'khtml', 'gecko', 'webkit', 'version'];
                if (!excludeList.includes(browserName.toLowerCase())) {
                    return browserName;
                }
            }
        }
        
        // Final fallback
        return 'Unknown Browser';
    };

    // Format timestamp
    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString('en-LK');
    };

    // Filter data
    const filteredSuspiciousActivities = suspiciousActivities.filter(activity => {
        const matchesSearch = searchTerm === '' || 
            activity.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            activity.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            activity.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            activity.ip_address?.includes(searchTerm);
        
        const matchesFilter = filterType === 'all' || 
            (filterType === 'suspicious' && activity.is_suspicious) ||
            (filterType === 'normal' && !activity.is_suspicious);
        
        return matchesSearch && matchesFilter;
    });

    // Statistics cards
    const StatCard = ({ title, value, icon, color, subtitle }) => (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
                <div className={`p-3 rounded-lg ${color}`}>
                    {icon}
                </div>
                <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
                </div>
            </div>
        </div>
    );

    // Table columns
    const suspiciousActivityColumns = [
        {
            key: 'studentInfo',
            label: 'Student Information',
            render: (row) => (
                <div className="space-y-1">
                    <div className="font-semibold text-blue-600">
                        {row.first_name} {row.last_name}
                    </div>
                    <div className="text-sm text-gray-600">ID: {row.student_id}</div>
                    <div className="text-xs text-gray-500">
                        <FaMapMarkerAlt className="inline mr-1" />
                        {row.ip_address}
                    </div>
                </div>
            )
        },
        {
            key: 'activityDetails',
            label: 'Activity Details',
            render: (row) => {
                const location = parseLocationData(row.location_data);
                return (
                    <div className="space-y-2">
                        <div className="text-sm font-medium">
                            <FaClock className="inline mr-1 text-gray-400" />
                            {formatTimestamp(row.login_time)}
                        </div>
                        <div className="text-xs text-gray-600">
                            {(() => {
                                const deviceInfo = getDeviceInfo(row.user_agent);
                                return (
                                    <>
                                        {deviceInfo.icon}
                                        <span className="font-medium">Device:</span> {deviceInfo.fullInfo}
                                    </>
                                );
                            })()}
                        </div>
                        <div className="text-xs text-gray-600">
                            <FaNetworkWired className="inline mr-1" />
                            <span className="font-medium">Session:</span> {row.session_id?.substring(0, 20)}...
                        </div>
                        <div className="text-xs text-gray-600">
                            <FaFingerprint className="inline mr-1" />
                            <span className="font-medium">Fingerprint:</span> {row.device_fingerprint?.substring(0, 20)}...
                        </div>
                        <div className="text-xs text-gray-600">
                            <FaGlobe className="inline mr-1" />
                            <span className="font-medium">Location:</span> {location.city}, {location.country}
                        </div>
                        <div className="text-xs text-gray-600">
                            <FaMapMarkerAlt className="inline mr-1" />
                            <span className="font-medium">IP:</span> {location.ip}
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'riskAssessment',
            label: 'Risk Assessment',
            render: (row) => {
                const riskDetails = getRiskAssessmentDetails(row);
                return (
                <div className="space-y-2">
                        <div className={`text-sm font-semibold ${riskDetails.color}`}>
                            {riskDetails.icon}
                            {riskDetails.level}
                    </div>
                    <div className="text-xs text-gray-500">
                            {riskDetails.reason}
                    </div>
                </div>
                );
            }
        },
        {
            key: 'blockStatus',
            label: 'Block Status',
            render: (row) => {
                const blocked = isStudentBlockedLocal(row.student_id);
                return (
                    <div className="space-y-1">
                        <div className={`text-sm font-semibold ${blocked ? 'text-red-600' : 'text-green-600'}`}>
                            {blocked ? (
                                <>
                                    <FaBan className="inline mr-1" />
                                    BLOCKED
                                </>
                            ) : (
                                <>
                                    <FaCheckCircle className="inline mr-1" />
                                    Active
                                </>
                            )}
                        </div>
                        {blocked && (
                            <div className="text-xs text-red-500 font-medium">
                                ⚠️ Cannot login - Account suspended
                            </div>
                        )}
                        {!blocked && (
                            <div className="text-xs text-green-500">
                                ✅ Can login normally
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (row) => {
                const blocked = isStudentBlockedLocal(row.student_id);
                return (
                    <div className="space-y-2">
                        {!blocked ? (
                            <button
                                className="w-full px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                                onClick={() => {
                                    setSelectedStudent(row);
                                    setShowBlockModal(true);
                                }}
                            >
                                <FaBan />
                                Block Student
                            </button>
                        ) : (
                            <button
                                className="w-full px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                                onClick={() => {
                                    setSelectedStudent(row);
                                    setShowUnblockModal(true);
                                }}
                            >
                                <FaUnlock />
                                Unblock Student
                            </button>
                        )}
                        <button
                            className="w-full px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                            onClick={() => handleViewDetails(row)}
                        >
                            <FaEye />
                            View Details
                        </button>
                    </div>
                );
            }
        }
    ];

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading monitoring data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <FaExclamationTriangle className="text-red-500 text-4xl mx-auto mb-4" />
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={loadMonitoringData}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <DashboardLayout userRole="Administrator" sidebarItems={adminSidebarSections} >
      <div className="w-full max-w-25xl bg-white rounded-lg shadow p-4 mx-auto">
        <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Student Monitoring Dashboard</h1>
                <p className="text-gray-600">Real-time monitoring and security management for student activities</p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Suspicious Activities"
                    value={statistics.total_suspicious || 0}
                    icon={<FaExclamationTriangle className="text-red-600 text-xl" />}
                    color="bg-red-100"
                    subtitle="High risk activities detected"
                />
                <StatCard
                    title="Concurrent Violations"
                    value={statistics.total_concurrent_violations || 0}
                    icon={<FaUsers className="text-orange-600 text-xl" />}
                    color="bg-orange-100"
                    subtitle="Multiple device violations"
                />
                <StatCard
                    title="Currently Blocked"
                    value={statistics.currently_blocked || 0}
                    icon={<FaBan className="text-red-600 text-xl" />}
                    color="bg-red-100"
                    subtitle="Students under restriction"
                />
                <StatCard
                    title="Today's Logins"
                    value={statistics.today_logins || 0}
                    icon={<FaChartLine className="text-green-600 text-xl" />}
                    color="bg-green-100"
                    subtitle="Total login activities today"
                />
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Activities</option>
                        <option value="suspicious">Suspicious Only</option>
                        <option value="normal">Normal Only</option>
                    </select>
                    <button
                        onClick={loadMonitoringData}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <FaSync />
                        Refresh
                    </button>
                    <button
                        onClick={() => {
                            console.log('Export monitoring report');
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <FaDownload />
                        Export Report
                    </button>
                </div>
            </div>

            {/* Suspicious Activities Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                
                <BasicTable
                    columns={suspiciousActivityColumns}
                    data={filteredSuspiciousActivities}
                    className="w-full"
                />
            </div>

            {/* Block Student Modal */}
            {showBlockModal && selectedStudent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h2 className="text-xl font-bold text-gray-800">Block Student</h2>
                            <button
                                onClick={() => setShowBlockModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <FaTimes className="text-xl" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <p className="text-gray-700 mb-2">
                                    Blocking: <strong>{selectedStudent.first_name} {selectedStudent.last_name}</strong> ({selectedStudent.student_id})
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Reason for Blocking *
                                    </label>
                                    <textarea
                                        value={blockReason}
                                        onChange={(e) => setBlockReason(e.target.value)}
                                        rows="3"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter reason for blocking this student..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Block Duration (hours)
                                    </label>
                                    <input
                                        type="number"
                                        value={blockDuration}
                                        onChange={(e) => setBlockDuration(parseInt(e.target.value))}
                                        min="1"
                                        max="168"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setShowBlockModal(false)}
                                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleBlockStudent(selectedStudent.student_id)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
                                >
                                    <FaBan />
                                    Block Student
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Unblock Student Modal */}
            {showUnblockModal && selectedStudent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h2 className="text-xl font-bold text-gray-800">Unblock Student</h2>
                            <button
                                onClick={() => setShowUnblockModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <FaTimes className="text-xl" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <p className="text-gray-700">
                                    Are you sure you want to unblock <strong>{selectedStudent.first_name} {selectedStudent.last_name}</strong> ({selectedStudent.student_id})?
                                </p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowUnblockModal(false)}
                                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleUnblockStudent(selectedStudent.student_id)}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
                                >
                                    <FaUnlock />
                                    Unblock Student
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Student Details Modal */}
            {showDetailsModal && selectedStudentDetails && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h2 className="text-xl font-bold text-gray-800">
                                Student Details - {selectedStudentDetails.first_name} {selectedStudentDetails.last_name}
                            </h2>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <FaTimes className="text-xl" />
                            </button>
                        </div>
                        <div className="p-6">
                            {/* Student Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <FaUserCheck />
                                        Student Information
                                    </h3>
                                    <div className="space-y-2">
                                        <div><strong>Student ID:</strong> {selectedStudentDetails.student_id}</div>
                                        <div><strong>Name:</strong> {selectedStudentDetails.first_name} {selectedStudentDetails.last_name}</div>
                                        <div><strong>Email:</strong> {selectedStudentDetails.email}</div>
                                        <div><strong>Mobile:</strong> {selectedStudentDetails.mobile_number}</div>
                                        <div><strong>NIC:</strong> {selectedStudentDetails.nic}</div>
                                        <div><strong>Gender:</strong> {selectedStudentDetails.gender}</div>
                                        <div><strong>Age:</strong> {selectedStudentDetails.age}</div>
                                        <div><strong>Stream:</strong> {selectedStudentDetails.stream}</div>
                                        <div><strong>School:</strong> {selectedStudentDetails.school}</div>
                                        <div><strong>District:</strong> {selectedStudentDetails.district}</div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <FaShieldAlt />
                                        Security Status
                                    </h3>
                                    <div className="space-y-2">
                                        <div>
                                            <strong>Block Status:</strong> 
                                            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                                                isStudentBlockedLocal(selectedStudentDetails.student_id) 
                                                    ? 'bg-red-100 text-red-800' 
                                                    : 'bg-green-100 text-green-800'
                                            }`}>
                                                {isStudentBlockedLocal(selectedStudentDetails.student_id) ? 'BLOCKED' : 'ACTIVE'}
                                            </span>
                                        </div>
                                        <div>
                                            <strong>Risk Level:</strong> 
                                            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                                                selectedStudentDetails.is_suspicious 
                                                    ? 'bg-red-100 text-red-800' 
                                                    : 'bg-green-100 text-green-800'
                                            }`}>
                                                {selectedStudentDetails.is_suspicious ? 'HIGH RISK' : 'NORMAL'}
                                            </span>
                                        </div>
                                        <div><strong>Login Time:</strong> {formatTimestamp(selectedStudentDetails.login_time)}</div>
                                        <div><strong>Session ID:</strong> {selectedStudentDetails.session_id}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Activity Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <FaDesktop />
                                        Device Information
                                    </h3>
                                    <div className="space-y-2">
                                        <div><strong>Device:</strong> {(() => {
                                            const deviceInfo = getDeviceInfo(selectedStudentDetails.user_agent);
                                            return (
                                                <>
                                                    {deviceInfo.icon} {deviceInfo.fullInfo}
                                                </>
                                            );
                                        })()}</div>
                                        <div><strong>IP Address:</strong> {selectedStudentDetails.ip_address}</div>
                                        <div><strong>Device Fingerprint:</strong> {selectedStudentDetails.device_fingerprint}</div>
                                        <div><strong>Location:</strong> {parseLocationData(selectedStudentDetails.location_data).city}, {parseLocationData(selectedStudentDetails.location_data).country}</div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <FaHistory />
                                        Activity History
                                    </h3>
                                    <div className="space-y-2">
                                        <div><strong>Created At:</strong> {formatTimestamp(selectedStudentDetails.created_at)}</div>
                                        <div><strong>Last Activity:</strong> {formatTimestamp(selectedStudentDetails.login_time)}</div>
                                        <div><strong>Activity Count:</strong> {suspiciousActivities.filter(a => a.student_id === selectedStudentDetails.student_id).length} activities</div>
                                        <div><strong>Suspicious Count:</strong> {suspiciousActivities.filter(a => a.student_id === selectedStudentDetails.student_id && a.is_suspicious).length} suspicious</div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                                >
                                    Close
                                </button>
                                {!isStudentBlockedLocal(selectedStudentDetails.student_id) ? (
                                    <button
                                        onClick={() => {
                                            setSelectedStudent(selectedStudentDetails);
                                            setShowDetailsModal(false);
                                            setShowBlockModal(true);
                                        }}
                                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
                                    >
                                        <FaBan />
                                        Block Student
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setSelectedStudent(selectedStudentDetails);
                                            setShowDetailsModal(false);
                                            setShowUnblockModal(true);
                                        }}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
                                    >
                                        <FaUnlock />
                                        Unblock Student
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Alert Box */}
            {alertConfig.show && (
                <BasicAlertBox
                    open={alertConfig.show}
                    message={alertConfig.message}
                    type={alertConfig.type}
                    onConfirm={() => setAlertConfig({ show: false, message: '', type: 'success' })}
                    confirmText="OK"
                />
            )}
        </div>
        </div>
        
        </DashboardLayout>
    );
};

export default StudentMonitoringDashboard;

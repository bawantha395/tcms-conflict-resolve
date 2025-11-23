import api from './axiosConfig';

// Track student login activity
export const trackStudentLogin = async (studentId, sessionId) => {
    try {
        const response = await api.post('/routes.php/track-student-login', {
            studentId,
            sessionId
        });
        return response.data;
    } catch (error) {
        console.error('Error tracking student login:', error);
        return { success: false, message: 'Failed to track login activity' };
    }
};

// Track concurrent session
export const trackConcurrentSession = async (studentId, sessionId, classId) => {
    try {
        const response = await api.post('/routes.php/track-concurrent-session', {
            studentId,
            sessionId,
            classId
        });
        return response.data;
    } catch (error) {
        console.error('Error tracking concurrent session:', error);
        return { success: false, message: 'Failed to track concurrent session' };
    }
};

// End concurrent session
export const endConcurrentSession = async (sessionId) => {
    try {
        const response = await api.post('/routes.php/end-concurrent-session', {
            sessionId
        });
        return response.data;
    } catch (error) {
        console.error('Error ending concurrent session:', error);
        return { success: false, message: 'Failed to end session' };
    }
};

// Get student monitoring data
export const getStudentMonitoringData = async (studentId, limit = 50) => {
    try {
        const response = await api.get(`/routes.php/student-monitoring/${studentId}?limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error('Error getting student monitoring data:', error);
        return { success: false, message: 'Failed to get monitoring data' };
    }
};

// Get suspicious activities
export const getSuspiciousActivities = async (limit = 100) => {
    try {
        const response = await api.get(`/routes.php/suspicious-activities?limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error('Error getting suspicious activities:', error);
        return { success: false, message: 'Failed to get suspicious activities' };
    }
};

// Get concurrent session violations
export const getConcurrentSessionViolations = async (limit = 100) => {
    try {
        const response = await api.get(`/routes.php/concurrent-violations?limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error('Error getting concurrent violations:', error);
        return { success: false, message: 'Failed to get concurrent violations' };
    }
};

// Block student
export const blockStudent = async (studentId, reason, blockedBy, blockDuration = 24) => {
    try {
        const response = await api.post('/routes.php/block-student', {
            studentId,
            reason,
            blockedBy,
            blockDuration
        });
        return response.data;
    } catch (error) {
        console.error('Error blocking student:', error);
        return { success: false, message: 'Failed to block student' };
    }
};

// Unblock student
export const unblockStudent = async (studentId) => {
    try {
        const response = await api.post('/routes.php/unblock-student', {
            studentId
        });
        return response.data;
    } catch (error) {
        console.error('Error unblocking student:', error);
        return { success: false, message: 'Failed to unblock student' };
    }
};

// Check if student is blocked
export const isStudentBlocked = async (studentId) => {
    try {
        const response = await api.get(`/routes.php/student-blocked/${studentId}`);
        return response.data;
    } catch (error) {
        console.error('Error checking student block status:', error);
        return { success: false, message: 'Failed to check block status' };
    }
};

// Get student block history
export const getStudentBlockHistory = async (studentId) => {
    try {
        const response = await api.get(`/routes.php/student-block-history/${studentId}`);
        return response.data;
    } catch (error) {
        console.error('Error getting student block history:', error);
        return { success: false, message: 'Failed to get block history' };
    }
};

// Get monitoring statistics
export const getMonitoringStatistics = async () => {
    try {
        const response = await api.get('/routes.php/monitoring-statistics');
        return response.data;
    } catch (error) {
        console.error('Error getting monitoring statistics:', error);
        return { success: false, message: 'Failed to get monitoring statistics' };
    }
};

// Detect cheating
export const detectCheating = async (studentId, classId, sessionId) => {
    try {
        const response = await api.post('/routes.php/detect-cheating', {
            studentId,
            classId,
            sessionId
        });
        return response.data;
    } catch (error) {
        console.error('Error detecting cheating:', error);
        return { success: false, message: 'Failed to detect cheating' };
    }
};

// Get detailed monitoring report
export const getDetailedMonitoringReport = async (studentId = null, dateFrom = null, dateTo = null) => {
    try {
        const params = new URLSearchParams();
        if (studentId) params.append('studentId', studentId);
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);
        
        const response = await api.get(`/routes.php/monitoring-report?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Error getting monitoring report:', error);
        return { success: false, message: 'Failed to get monitoring report' };
    }
};

// Generate device fingerprint
export const generateDeviceFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    
    // Enhanced fingerprint with more unique identifiers
    const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        canvasFingerprint: canvas.toDataURL(),
        colorDepth: window.screen.colorDepth,
        pixelDepth: window.screen.pixelDepth,
        availableHeight: window.screen.availHeight,
        availableWidth: window.screen.availWidth,
        // Additional unique identifiers
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
        deviceMemory: navigator.deviceMemory || 'unknown',
        maxTouchPoints: navigator.maxTouchPoints || 0,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        // Browser-specific features
        webdriver: navigator.webdriver,
        // Connection info
        connectionType: navigator.connection ? navigator.connection.effectiveType : 'unknown',
        // Additional screen info
        devicePixelRatio: window.devicePixelRatio || 1,
        // Generate a unique session ID
        sessionId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    };
    
    return btoa(JSON.stringify(fingerprint));
};

// Check for concurrent logins
export const checkConcurrentLogins = async (studentId) => {
    try {
        const response = await api.get(`/routes.php/check-concurrent-logins/${studentId}`);
        return response.data;
    } catch (error) {
        console.error('Error checking concurrent logins:', error);
        return { success: false, message: 'Failed to check concurrent logins' };
    }
};

// Get device details for a student
export const getStudentDevices = async (studentId) => {
    try {
        const response = await api.get(`/routes.php/student-devices/${studentId}`);
        return response.data;
    } catch (error) {
        console.error('Error getting student devices:', error);
        return { success: false, message: 'Failed to get student devices' };
    }
};

// Track page activity
export const trackPageActivity = async (studentId, page, action) => {
    try {
        const deviceInfo = generateDeviceFingerprint();
        const response = await api.post('/routes.php/track-page-activity', {
            studentId,
            page,
            action,
            deviceInfo,
            timestamp: new Date().toISOString()
        });
        return response.data;
    } catch (error) {
        console.error('Error tracking page activity:', error);
        return { success: false, message: 'Failed to track page activity' };
    }
};

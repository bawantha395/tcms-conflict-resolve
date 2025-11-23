import api from './axiosConfig';

// Base URL for attendance backend
const ATTENDANCE_BASE_URL = process.env.REACT_APP_ATTENDANCE_BACKEND_URL || 'http://localhost:8092';

/**
 * Get attendance for a specific class
 * @param {string} classId - The class ID
 * @returns {Promise<Object>} Attendance data
 */
export const getClassAttendance = async (classId) => {
  try {
    const response = await api.get(`${ATTENDANCE_BASE_URL}/attendance/${classId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching class attendance:', error);
    throw error;
  }
};

/**
 * Get attendance for a specific student
 * @param {string} studentId - The student ID
 * @returns {Promise<Object>} Student attendance data
 */
export const getStudentAttendance = async (studentId) => {
  try {
    const response = await api.get(`${ATTENDANCE_BASE_URL}/student-attendance/${studentId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    throw error;
  }
};

/**
 * Get attendance analytics with optional filters
 * @param {string} classId - Optional class ID filter
 * @param {string} startDate - Optional start date (YYYY-MM-DD)
 * @param {string} endDate - Optional end date (YYYY-MM-DD)
 * @returns {Promise<Object>} Analytics data
 */
export const getAttendanceAnalytics = async (classId = null, startDate = null, endDate = null) => {
  try {
    const params = new URLSearchParams();
    if (classId) params.append('class_id', classId);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await api.get(`${ATTENDANCE_BASE_URL}/attendance-analytics?${params}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching attendance analytics:', error);
    throw error;
  }
};

/**
 * Get Zoom meeting sessions for a class
 * @param {string} classId - The class ID
 * @returns {Promise<Object>} Zoom sessions data
 */
export const getZoomSessions = async (classId) => {
  try {
    const response = await api.get(`${ATTENDANCE_BASE_URL}/zoom-sessions/${classId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching Zoom sessions:', error);
    throw error;
  }
};

/**
 * Get meeting participants
 * @param {string} meetingId - The Zoom meeting ID
 * @returns {Promise<Object>} Participants data
 */
export const getMeetingParticipants = async (meetingId) => {
  try {
    const response = await api.get(`${ATTENDANCE_BASE_URL}/meeting-participants/${meetingId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching meeting participants:', error);
    throw error;
  }
};

/**
 * Mark manual attendance (fallback method)
 * @param {string} classId - The class ID
 * @param {string} studentId - The student ID
 * @param {Object} attendanceData - Attendance data
 * @returns {Promise<Object>} Response data
 */
export const markManualAttendance = async (classId, studentId, attendanceData) => {
  try {
    const response = await api.post(`${ATTENDANCE_BASE_URL}/mark-attendance`, {
      classId,
      studentId,
      attendanceData
    });
    return response.data;
  } catch (error) {
    console.error('Error marking manual attendance:', error);
    throw error;
  }
};

/**
 * Update attendance status
 * @param {number} attendanceId - The attendance record ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Response data
 */
export const updateAttendanceStatus = async (attendanceId, data) => {
  try {
    const response = await api.put(`${ATTENDANCE_BASE_URL}/attendance/${attendanceId}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating attendance status:', error);
    throw error;
  }
};

/**
 * Delete attendance record
 * @param {number} attendanceId - The attendance record ID
 * @returns {Promise<Object>} Response data
 */
export const deleteAttendance = async (attendanceId) => {
  try {
    const response = await api.delete(`${ATTENDANCE_BASE_URL}/attendance/${attendanceId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    throw error;
  }
};

/**
 * Export attendance report
 * @param {string} classId - Optional class ID filter
 * @param {string} format - Export format (json, csv, pdf)
 * @param {string} startDate - Optional start date (YYYY-MM-DD)
 * @param {string} endDate - Optional end date (YYYY-MM-DD)
 * @returns {Promise<Object>} Export data or file
 */
export const exportAttendanceReport = async (classId = null, format = 'json', startDate = null, endDate = null) => {
  try {
    const params = new URLSearchParams();
    if (classId) params.append('class_id', classId);
    params.append('format', format);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await api.get(`${ATTENDANCE_BASE_URL}/export-attendance?${params}`, {
      responseType: format === 'json' ? 'json' : 'blob'
    });
    
    if (format === 'json') {
      return response.data;
    } else {
      // Handle file download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance_report_${classId || 'all'}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'Report downloaded successfully' };
    }
  } catch (error) {
    console.error('Error exporting attendance report:', error);
    throw error;
  }
};

/**
 * Check attendance backend health
 * @returns {Promise<Object>} Health status
 */
export const checkAttendanceBackendHealth = async () => {
  try {
    const response = await api.get(`${ATTENDANCE_BASE_URL}/health`);
    return response.data;
  } catch (error) {
    console.error('Error checking attendance backend health:', error);
    throw error;
  }
};

/**
 * Track attendance when student joins Zoom meeting
 * @param {Object} classData - Class information
 * @param {string} studentId - Student ID
 * @param {string} meetingId - Zoom meeting ID
 * @returns {Promise<Object>} Response data
 */
export const trackZoomAttendance = async (userData, classData) => {
  try {
    console.log('Tracking attendance:', { userData, classData });
    
    // Determine method based on userData.method or default to zoom_manual
    const method = userData?.method || 'zoom_manual';
    
    const attendanceData = {
      classId: classData.id,
      studentId: userData?.userid || userData?.id,
      attendanceData: {
        studentName: userData?.username || userData?.name || userData?.studentName || 
                    `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() ||
                    userData?.fullName || `Student ${userData?.id || userData?.userid}`,
        method: method,
        status: 'present',
        join_time: new Date().toLocaleString('sv-SE', { 
          timeZone: 'Asia/Colombo', 
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).replace('T', ' ')
      }
    };

    console.log('Sending attendance data:', attendanceData);
    
    const response = await fetch(`${ATTENDANCE_BASE_URL}/mark-attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(attendanceData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Attendance tracking response:', result);
    return result;
  } catch (error) {
    console.error('Error tracking Zoom attendance:', error);
    throw error;
  }
};

export const getMonthlyAttendance = async (classId, year, month) => {
  try {
    const url = `${ATTENDANCE_BASE_URL}/monthly-attendance?class_id=${classId}&year=${year}&month=${month}`;
    console.log('Making request to:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Response received:', data);
    return data;
  } catch (error) {
    console.error('Error fetching monthly attendance:', error);
    throw error;
  }
};

export const trackJoinButtonClick = async (classId, studentId, clickData = {}) => {
  try {
    const url = `${ATTENDANCE_BASE_URL}/track-join-click`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        classId,
        studentId,
        clickData
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error tracking join button click:', error);
    throw error;
  }
};

export const getJoinButtonClicks = async (classId, studentId, startDate, endDate) => {
  try {
    const params = new URLSearchParams();
    if (classId) params.append('class_id', classId);
    if (studentId) params.append('student_id', studentId);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const url = `${ATTENDANCE_BASE_URL}/join-clicks?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching join button clicks:', error);
    throw error;
  }
};

/**
 * Get attendance summary for dashboard
 * @param {string} classId - Optional class ID
 * @param {string} period - Time period (today, week, month)
 * @returns {Promise<Object>} Summary data
 */
export const getAttendanceSummary = async (classId = null, period = 'today') => {
  try {
    const endDate = new Date().toISOString().split('T')[0];
    let startDate;
    
    switch (period) {
      case 'today':
        startDate = endDate;
        break;
      case 'week':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString().split('T')[0];
        break;
      default:
        startDate = endDate;
    }
    
    return await getAttendanceAnalytics(classId, startDate, endDate);
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    throw error;
  }
};

/**
 * Get real-time attendance for current class
 * @param {string} classId - The class ID
 * @returns {Promise<Object>} Current attendance data
 */
export const getCurrentClassAttendance = async (classId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const analytics = await getAttendanceAnalytics(classId, today, today);
    
    return {
      success: true,
      data: analytics.analytics?.overall_stats || {},
      currentAttendance: analytics.analytics?.student_attendance || []
    };
  } catch (error) {
    console.error('Error fetching current class attendance:', error);
    throw error;
  }
};

/**
 * Get real-time attendance updates for a class
 * @param {string} classId - The class ID
 * @param {string} date - The date (YYYY-MM-DD), defaults to today
 * @returns {Promise<Object>} Real-time attendance data
 */
export const getRealTimeAttendance = async (classId, date = null) => {
  try {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    
    const response = await api.get(`${ATTENDANCE_BASE_URL}/real-time-attendance/${classId}?${params}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching real-time attendance:', error);
    throw error;
  }
};

/**
 * Get attendance summary for dashboard
 * @param {string} classId - Optional class ID filter
 * @param {string} date - The date (YYYY-MM-DD), defaults to today
 * @returns {Promise<Object>} Attendance summary
 */
export const getAttendanceDashboardSummary = async (classId = null, date = null) => {
  try {
    const params = new URLSearchParams();
    if (classId) params.append('class_id', classId);
    if (date) params.append('date', date);
    
    const response = await api.get(`${ATTENDANCE_BASE_URL}/attendance-summary?${params}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    throw error;
  }
};

/**
 * Record video attendance tracking
 * @param {string} classId - The class ID
 * @param {string} studentId - The student ID
 * @param {Object} videoData - Video tracking data
 * @returns {Promise<Object>} Response data
 */
export const recordVideoAttendance = async (classId, studentId, videoData) => {
  try {
    const response = await api.post(`${ATTENDANCE_BASE_URL}/record-video-attendance`, {
      classId,
      studentId,
      videoData
    });
    return response.data;
  } catch (error) {
    console.error('Error recording video attendance:', error);
    throw error;
  }
};

/**
 * Update attendance settings
 * @param {Object} settings - Key/value pairs to persist
 * @returns {Promise<Object>} Response data
 */
export const updateAttendanceSettings = async (settings = {}) => {
  try {
    const response = await api.put(`${ATTENDANCE_BASE_URL}/settings`, settings);
    return response.data;
  } catch (error) {
    console.error('Error updating attendance settings:', error);
    throw error;
  }
};

export const getAttendanceSettings = async () => {
  try {
    const response = await api.get(`${ATTENDANCE_BASE_URL}/settings`);
    return response.data;
  } catch (error) {
    console.error('Error fetching attendance settings:', error);
    throw error;
  }
};

/**
 * Track video watch progress for attendance
 * @param {Object} trackingData - Video tracking information
 * @returns {Promise<Object>} Response data
 */
export const trackVideoProgress = async (trackingData) => {
  try {
    const {
      classId,
      studentId,
      videoUrl,
      videoTitle,
      videoDuration,
      watchTime,
      studentName
    } = trackingData;

    return await recordVideoAttendance(classId, studentId, {
      video_url: videoUrl,
      video_title: videoTitle,
      video_duration: videoDuration,
      watch_time: watchTime,
      student_name: studentName
    });
  } catch (error) {
    console.error('Error tracking video progress:', error);
    throw error;
  }
};

/**
 * Initialize video attendance tracking for a video element
 * @param {HTMLVideoElement} videoElement - The video element to track
 * @param {Object} trackingConfig - Configuration for tracking
 * @returns {Object} Tracking object with methods to start/stop tracking
 */
export const initializeVideoTracking = (videoElement, trackingConfig) => {
  const {
    classId,
    studentId,
    videoUrl,
    videoTitle,
    studentName,
    updateInterval = 30000 // Update every 30 seconds
  } = trackingConfig;

  let trackingInterval = null;
  let totalWatchTime = 0;
  let lastUpdateTime = Date.now();

  const updateWatchTime = () => {
    const currentTime = Date.now();
    const timeDelta = currentTime - lastUpdateTime;
    
    if (!videoElement.paused && !videoElement.ended) {
      totalWatchTime += timeDelta;
    }
    
    lastUpdateTime = currentTime;
  };

  const sendTrackingUpdate = async () => {
    try {
      await trackVideoProgress({
        classId,
        studentId,
        videoUrl,
        videoTitle,
        videoDuration: Math.floor(videoElement.duration),
        watchTime: Math.floor(totalWatchTime / 1000),
        studentName
      });
    } catch (error) {
      console.error('Error sending tracking update:', error);
    }
  };

  const startTracking = () => {
    lastUpdateTime = Date.now();
    
    // Update watch time periodically
    trackingInterval = setInterval(() => {
      updateWatchTime();
      sendTrackingUpdate();
    }, updateInterval);

    // Listen for video events
    videoElement.addEventListener('timeupdate', updateWatchTime);
    videoElement.addEventListener('pause', updateWatchTime);
    videoElement.addEventListener('ended', () => {
      updateWatchTime();
      sendTrackingUpdate();
    });
  };

  const stopTracking = () => {
    if (trackingInterval) {
      clearInterval(trackingInterval);
      trackingInterval = null;
    }
    
    updateWatchTime();
    sendTrackingUpdate();
  };

  return {
    startTracking,
    stopTracking,
    getTotalWatchTime: () => Math.floor(totalWatchTime / 1000),
    getWatchPercentage: () => {
      if (videoElement.duration > 0) {
        return (totalWatchTime / 1000 / videoElement.duration) * 100;
      }
      return 0;
    }
  };
};

export default {
  getClassAttendance,
  getStudentAttendance,
  getAttendanceAnalytics,
  getZoomSessions,
  getMeetingParticipants,
  markManualAttendance,
  updateAttendanceStatus,
  deleteAttendance,
  exportAttendanceReport,
  checkAttendanceBackendHealth,
  trackZoomAttendance,
  getMonthlyAttendance,
  trackJoinButtonClick,
  getJoinButtonClicks,
  getAttendanceSummary,
  getCurrentClassAttendance,
  getRealTimeAttendance,
  getAttendanceDashboardSummary,
  recordVideoAttendance,
  trackVideoProgress,
  initializeVideoTracking
  ,
  updateAttendanceSettings
};

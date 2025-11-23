import { handleApiError } from './apiUtils';
import axios from 'axios';

// Create axios instance for recordings API (teacher backend)
const recordingsApi = axios.create({
  baseURL: process.env.REACT_APP_TEACHER_API_BASE_URL || 'http://localhost:8088',
  timeout: 60000, // 60 seconds for large file uploads
  headers: {
    'Accept': 'application/json',
  },
  withCredentials: false,
});

// Generic GET request
const recordingsApiGet = async (endpoint) => {
  try {
    const response = await recordingsApi.get(endpoint);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Generic POST request for multipart/form-data
const recordingsApiPost = async (endpoint, data, isFormData = false, onUploadProgress = null) => {
  try {
    const config = {
      headers: isFormData ? {
        'Content-Type': 'multipart/form-data',
      } : {},
      ...(onUploadProgress && { onUploadProgress }),
    };
    const response = await recordingsApi.post(endpoint, data, config);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Generic PUT request
const recordingsApiPut = async (endpoint, data) => {
  try {
    const response = await recordingsApi.put(endpoint, data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Generic DELETE request
const recordingsApiDelete = async (endpoint) => {
  try {
    const response = await recordingsApi.delete(endpoint);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Get all recordings for a specific class
 * @param {number} classId - The class ID
 * @returns {Promise} - Promise with recordings data
 */
export const getRecordingsByClass = async (classId) => {
  return await recordingsApiGet(`/recordings.php?class_id=${classId}`);
};

/**
 * Get all recordings by a teacher
 * @param {string} teacherId - The teacher ID
 * @returns {Promise} - Promise with recordings data
 */
export const getRecordingsByTeacher = async (teacherId) => {
  return await recordingsApiGet(`/recordings.php?teacher_id=${teacherId}`);
};

/**
 * Upload a new recording
 * @param {FormData} formData - Form data containing file and metadata
 * @param {Function} onUploadProgress - Progress callback function
 * @returns {Promise} - Promise with upload result
 */
export const uploadRecording = async (formData, onUploadProgress = null) => {
  return await recordingsApiPost('/recordings.php', formData, true, onUploadProgress);
};

/**
 * Update recording metadata
 * @param {number} recordingId - The recording ID
 * @param {string} teacherId - The teacher ID
 * @param {Object} updateData - Data to update
 * @returns {Promise} - Promise with update result
 */
export const updateRecording = async (recordingId, teacherId, updateData) => {
  const data = {
    id: recordingId,
    teacher_id: teacherId,
    ...updateData
  };
  return await recordingsApiPut('/recordings.php', data);
};

/**
 * Delete a recording
 * @param {number} recordingId - The recording ID to delete
 * @param {string} teacherId - The teacher ID (for authorization)
 * @returns {Promise} - Promise with deletion result
 */
export const deleteRecording = async (recordingId, teacherId) => {
  return await recordingsApiDelete(`/recordings.php?id=${recordingId}&teacher_id=${teacherId}`);
};

/**
 * Get streaming URL for a recording
 * @param {number} recordingId - The recording ID
 * @param {string} studentId - The student ID
 * @param {string} studentName - The student name
 * @returns {string} - Streaming URL
 */
export const getStreamingUrl = (recordingId, studentId, studentName) => {
  const baseUrl = process.env.REACT_APP_TEACHER_API_BASE_URL || 'http://localhost:8088';
  return `${baseUrl}/recordings.php?stream=${recordingId}&student_id=${studentId}&student_name=${encodeURIComponent(studentName)}`;
};

/**
 * Download a recording
 * @param {number} recordingId - The recording ID
 * @param {string} studentId - The student ID
 * @param {string} studentName - The student name
 * @returns {Promise<Blob>} - Promise with blob data
 */
export const downloadRecording = async (recordingId, studentId, studentName) => {
  try {
    const baseUrl = process.env.REACT_APP_TEACHER_API_BASE_URL || 'http://localhost:8088';
    const url = `${baseUrl}/recordings.php?download=${recordingId}&student_id=${studentId}&student_name=${encodeURIComponent(studentName)}`;
    
    const response = await axios.get(url, {
      responseType: 'blob',
      timeout: 600000, // 10 minutes for watermarking + download
    });
    
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Update watch progress
 * @param {number} recordingId - The recording ID
 * @param {string} studentId - The student ID
 * @param {number} position - Current position in seconds
 * @returns {Promise} - Promise with update result
 */
export const updateWatchProgress = async (recordingId, studentId, position) => {
  const data = {
    recording_id: recordingId,
    student_id: studentId,
    position: Math.floor(position)
  };
  return await recordingsApiPost('/recordings.php', data, false);
};

/**
 * Get watch progress for a recording
 * @param {number} recordingId - The recording ID
 * @param {string} studentId - The student ID
 * @returns {Promise} - Promise with progress data
 */
export const getWatchProgress = async (recordingId, studentId) => {
  return await recordingsApiGet(`/recordings.php?progress=${recordingId}&student_id=${studentId}`);
};

/**
 * Get recording statistics
 * @param {number} recordingId - The recording ID
 * @returns {Promise} - Promise with stats data
 */
export const getRecordingStats = async (recordingId) => {
  return await recordingsApiGet(`/recordings.php?stats=1&recording_id=${recordingId}`);
};

/**
 * Format duration from seconds to HH:MM:SS
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format file size from bytes
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
};

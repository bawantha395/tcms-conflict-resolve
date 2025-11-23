import { handleApiError } from './apiUtils';
import axios from 'axios';

// Create axios instance for materials API (teacher backend)
const materialsApi = axios.create({
  baseURL: process.env.REACT_APP_TEACHER_API_BASE_URL || 'http://localhost:8088',
  timeout: 30000, // 30 seconds for large file uploads
  headers: {
    'Accept': 'application/json',
  },
  withCredentials: false,
});

// Generic GET request
const materialsApiGet = async (endpoint) => {
  try {
    const response = await materialsApi.get(endpoint);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Generic POST request for multipart/form-data
const materialsApiPost = async (endpoint, data, isFormData = false) => {
  try {
    const config = isFormData ? {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    } : {};
    const response = await materialsApi.post(endpoint, data, config);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Generic DELETE request
const materialsApiDelete = async (endpoint) => {
  try {
    const response = await materialsApi.delete(endpoint);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Get all materials for a specific class
 * @param {number} classId - The class ID
 * @returns {Promise} - Promise with materials data
 */
export const getMaterialsByClass = async (classId) => {
  return await materialsApiGet(`/materials.php?class_id=${classId}`);
};

/**
 * Upload a new material
 * @param {FormData} formData - Form data containing file and metadata
 * @returns {Promise} - Promise with upload result
 */
export const uploadMaterial = async (formData) => {
  return await materialsApiPost('/materials.php', formData, true);
};

/**
 * Delete a material
 * @param {number} materialId - The material ID to delete
 * @param {string} teacherId - The teacher ID (for authorization)
 * @returns {Promise} - Promise with deletion result
 */
export const deleteMaterial = async (materialId, teacherId) => {
  return await materialsApiDelete(`/materials.php?id=${materialId}&teacher_id=${teacherId}`);
};

/**
 * Download a material with watermark
 * @param {number} materialId - The material ID
 * @param {string} studentId - The student ID (for password protection)
 * @param {string} studentName - The student name (for watermark)
 * @returns {Promise} - Promise with blob data
 */
export const downloadMaterial = async (materialId, studentId, studentName) => {
  try {
    const response = await materialsApi.get(
      `/materials.php?download=${materialId}&student_id=${studentId}&student_name=${encodeURIComponent(studentName)}`,
      {
        responseType: 'blob', // Important for file downloads
      }
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Get material statistics (admin/teacher)
 * @param {number} materialId - The material ID
 * @returns {Promise} - Promise with statistics data
 */
export const getMaterialStats = async (materialId) => {
  return await materialsApiGet(`/materials.php?stats=${materialId}`);
};

/**
 * Get all materials for a teacher
 * @param {string} teacherId - The teacher ID
 * @returns {Promise} - Promise with materials data
 */
export const getMaterialsByTeacher = async (teacherId) => {
  return await materialsApiGet(`/materials.php?teacher_id=${teacherId}`);
};

export default {
  getMaterialsByClass,
  uploadMaterial,
  deleteMaterial,
  downloadMaterial,
  getMaterialStats,
  getMaterialsByTeacher,
};

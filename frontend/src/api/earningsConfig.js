// frontend/src/api/earningsConfig.js
// API service for class earnings configuration

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8090/routes.php';

/**
 * Get earnings configuration for a specific class
 * @param {number} classId - The class ID
 * @returns {Promise} - Promise resolving to earnings config data
 */
export const getClassEarningsConfig = async (classId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/earnings-config/${classId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching class earnings config:', error);
    throw error;
  }
};

/**
 * Get all earnings configurations for all classes
 * @returns {Promise} - Promise resolving to all earnings configs
 */
export const getAllEarningsConfigs = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/earnings-config`);
    return response.data;
  } catch (error) {
    console.error('Error fetching all earnings configs:', error);
    throw error;
  }
};

/**
 * Save or update earnings configuration for a class
 * @param {number} classId - The class ID
 * @param {object} config - The earnings configuration object
 * @returns {Promise} - Promise resolving to save result
 */
export const saveClassEarningsConfig = async (classId, config) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/earnings-config/${classId}`, config);
    return response.data;
  } catch (error) {
    console.error('Error saving class earnings config:', error);
    throw error;
  }
};

/**
 * Save multiple class earnings configurations at once
 * @param {object} configsMap - Object with classId as key and config as value
 * @returns {Promise} - Promise resolving when all saves complete
 */
export const saveMultipleEarningsConfigs = async (configsMap) => {
  try {
    const promises = Object.entries(configsMap).map(([classId, config]) =>
      saveClassEarningsConfig(parseInt(classId), config)
    );
    const results = await Promise.all(promises);
    return {
      success: true,
      data: results
    };
  } catch (error) {
    console.error('Error saving multiple earnings configs:', error);
    throw error;
  }
};

export default {
  getClassEarningsConfig,
  getAllEarningsConfigs,
  saveClassEarningsConfig,
  saveMultipleEarningsConfigs
};

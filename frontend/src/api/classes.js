import { handleApiError } from './apiUtils';
import axios from 'axios';

const classApi = axios.create({
  baseURL: process.env.REACT_APP_CLASS_API_BASE_URL || 'http://localhost:8087',
  timeout: 15000, // Increased timeout to 15 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
});

const classApiGet = async (endpoint) => {
  try {
    const response = await classApi.get(endpoint);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const classApiPost = async (endpoint, data) => {
  try {
    const response = await classApi.post(endpoint, data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const classApiPut = async (endpoint, data) => {
  try {
    const response = await classApi.put(endpoint, data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const classApiDelete = async (endpoint) => {
  try {
    const response = await classApi.delete(endpoint);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getAllClasses = async () => {
  return await classApiGet('/routes.php/get_all_classes');
};

export const getActiveClasses = async () => {
  return await classApiGet('/routes.php/get_active_classes');
};

export const getClassById = async (id) => {
  return await classApiGet(`/routes.php/get_class_by_id?id=${id}`);
};

export const getClassesByType = async (courseType) => {
  return await classApiGet(`/routes.php/get_classes_by_type?courseType=${courseType}`);
};

export const getClassesByDeliveryMethod = async (deliveryMethod) => {
  return await classApiGet(`/routes.php/get_classes_by_delivery?deliveryMethod=${deliveryMethod}`);
};

export const getClassesByTeacher = async (teacherId) => {
  return await classApiGet(`/routes.php/get_classes_by_teacher?teacherId=${teacherId}`);
};

// Session Schedule API functions
export const getSessionSchedulesByTeacher = async (teacherId) => {
  return await classApiGet(`/routes.php/get_session_schedules_by_teacher?teacherId=${teacherId}`);
};

export const getAllSessionSchedules = async () => {
  return await classApiGet('/routes.php/get_all_session_schedules');
};

export const createSessionSchedule = async (scheduleData) => {
  return await classApiPost('/routes.php/create_session_schedule', scheduleData);
};

export const updateSessionSchedule = async (id, scheduleData) => {
  return await classApiPut(`/routes.php/session_schedules/${id}`, scheduleData);
};

export const deleteSessionSchedule = async (id) => {
  return await classApiDelete(`/routes.php/session_schedules/${id}`);
};

export const createClass = async (classData) => {
  return await classApiPost('/routes.php/create_class', classData);
};

export const updateClass = async (id, classData) => {
  return await classApiPut(`/routes.php/update_class/${id}`, classData);
};

export const deleteClass = async (id) => {
  return await classApiDelete(`/routes.php/delete_class/${id}`);
}; 
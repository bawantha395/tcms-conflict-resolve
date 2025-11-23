import axios from 'axios';

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/exam.php/api';

const API_BASE_URL =
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE_URL) ||
  (typeof window !== 'undefined' && window.__ENV && window.__ENV.API_BASE_URL) ||
  // last-resort hardcoded default
  'http://localhost:8088/exam.php/api';


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const examAPI = {
  getAll: () => api.get('/exams'),
  getById: (id) => api.get(`/exams/${id}`),
  create: (data) => api.post('/exams', data),
  delete: (id) => api.delete(`/exams/${id}`),
};

export const questionAPI = {
  getByExamId: (examId) => api.get(`/exams/${examId}/questions`),
  create: (examId, data) => api.post(`/exams/${examId}/questions`, data),
  update: (examId, partId, data) => api.put(`/exams/${examId}/questions/${partId}`, data),
  delete: (examId, partId) => api.delete(`/exams/${examId}/questions/${partId}`),
};

export const markAPI = {
  getResults: (examId) => api.get(`/exams/${examId}/results`),
  saveMarks: (examId, data) => api.post(`/exams/${examId}/marks`, data),
  getByStudent: (studentIdentifier) => api.get(`/marks/student/${studentIdentifier}`),
};

export default api;
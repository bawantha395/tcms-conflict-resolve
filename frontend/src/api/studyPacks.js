import axios from 'axios';
import { handleApiError } from './apiUtils';

const studyPackApi = axios.create({
  baseURL: process.env.REACT_APP_TEACHER_API_BASE_URL || 'http://localhost:8088',
  timeout: 30000,
  headers: { 'Accept': 'application/json' },
});

export const downloadStudyPackDocument = async (documentId, studentId, studentName) => {
  try {
    const res = await studyPackApi.get(
      `/routes.php/study_pack_download_document?document_id=${encodeURIComponent(documentId)}&student_id=${encodeURIComponent(studentId)}&student_name=${encodeURIComponent(studentName || '')}`,
      { responseType: 'blob' }
    );
    return res.data; // Blob
  } catch (error) {
    throw handleApiError(error);
  }
};

export default {
  downloadStudyPackDocument,
};

import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import teacherSidebarSections from '../TeacherDashboardSidebar';

const TEACHER_API = process.env.REACT_APP_TEACHER_API_BASE_URL || 'http://localhost:8088';

const TeacherStudyPackDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pack, setPack] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${TEACHER_API}/routes.php/study_pack`, { params: { id } });
        if (data?.success) {
          setPack(data.data);
          setStatus('');
        } else {
          setStatus(data?.message || 'Failed to load study pack.');
        }
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message;
        setStatus(msg || 'Error loading study pack.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetail();
  }, [id]);

  const fileUrl = (relativePath) => {
    if (!relativePath) return '#';
    // Ensure absolute URL to teacher backend for serving files
    return `${TEACHER_API}${relativePath}`;
  };

  return (
    <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Study Pack Details</h1>
          <Link to="/teacher/study-pack" className="text-sm text-blue-600 hover:underline">Back to list</Link>
        </div>

        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : status ? (
          <div className="text-red-600 text-sm">{status}</div>
        ) : !pack ? (
          <div className="text-gray-500">Study pack not found.</div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-md shadow border border-gray-100 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{pack.title}</h2>
                  <div className="text-xs text-gray-500 mt-1">Created {new Date(pack.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Price</div>
                  <div className="text-xl font-bold">LKR {Number(pack.price || 0).toLocaleString()}</div>
                </div>
              </div>
              {pack.description ? (
                <p className="text-gray-700 mt-4 whitespace-pre-line">{pack.description}</p>
              ) : null}
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              <div className="bg-white rounded-md shadow border border-gray-100 p-4">
                <h3 className="font-medium text-gray-800 mb-3">Links</h3>
                {Array.isArray(pack.links) && pack.links.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {pack.links.map(l => (
                      <li key={l.id} className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-green-500 inline-block"/>
                        <a className="text-blue-600 hover:underline break-all" href={l.link_url} target="_blank" rel="noreferrer">
                          {l.link_title || l.link_url}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : <div className="text-gray-500 text-sm">No links.</div>}
              </div>

              <div className="bg-white rounded-md shadow border border-gray-100 p-4">
                <h3 className="font-medium text-gray-800 mb-3">Videos</h3>
                {Array.isArray(pack.videos) && pack.videos.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {pack.videos.map(v => (
                      <li key={v.id} className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500 inline-block"/>
                        <a className="text-blue-600 hover:underline break-all" href={fileUrl(v.file_path)} target="_blank" rel="noreferrer">
                          {v.title || v.file_path}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : <div className="text-gray-500 text-sm">No videos.</div>}
              </div>

              <div className="bg-white rounded-md shadow border border-gray-100 p-4">
                <h3 className="font-medium text-gray-800 mb-3">Documents</h3>
                {Array.isArray(pack.documents) && pack.documents.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {pack.documents.map(d => (
                      <li key={d.id} className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-yellow-500 inline-block"/>
                        <a className="text-blue-600 hover:underline break-all" href={fileUrl(d.file_path)} target="_blank" rel="noreferrer">
                          {d.title || d.file_path}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : <div className="text-gray-500 text-sm">No documents.</div>}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => navigate(`/teacher/study-pack/${id}/edit`)}
                className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
              >
                Edit Study Pack
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherStudyPackDetail;

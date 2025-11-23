import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import teacherSidebarSections from '../TeacherDashboardSidebar';

const TEACHER_API = process.env.REACT_APP_TEACHER_API_BASE_URL || 'http://localhost:8088';

const TeacherStudyPackEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', price: 0 });
  const [videos, setVideos] = useState([]);
  const [docs, setDocs] = useState([]);
  const [links, setLinks] = useState([]);
  const [newVideo, setNewVideo] = useState({ title: '', file: null });
  const [newDoc, setNewDoc] = useState({ title: '', file: null });
  const [newLink, setNewLink] = useState({ link_title: '', link_url: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${TEACHER_API}/routes.php/study_pack`, { params: { id } });
        if (data?.success && data.data) {
          setForm({
            title: data.data.title || '',
            description: data.data.description || '',
            price: Number(data.data.price || 0)
          });
          setVideos(Array.isArray(data.data.videos) ? data.data.videos : []);
          setDocs(Array.isArray(data.data.documents) ? data.data.documents : []);
          setLinks(Array.isArray(data.data.links) ? data.data.links : []);
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
    if (id) load();
  }, [id]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: name === 'price' ? Number(value) : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setStatus('');
      const payload = {
        title: form.title,
        description: form.description,
        price: Number(form.price || 0)
      };
      const { data } = await axios.put(`${TEACHER_API}/routes.php/update_study_pack/${id}`, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (data?.success) {
        navigate(`/teacher/study-pack/${id}`);
      } else {
        setStatus(data?.message || 'Failed to update.');
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message;
      setStatus(msg || 'Error updating study pack.');
    } finally {
      setSaving(false);
    }
  };

  const updateVideoTitle = async (vidId, title) => {
    try {
      const { data } = await axios.put(`${TEACHER_API}/routes.php/study_pack_video/${vidId}`, { title });
      if (data?.success) {
        setVideos((list) => list.map((v) => (v.id === vidId ? { ...v, title } : v)));
      } else {
        setStatus(data?.message || 'Failed to update video');
      }
    } catch (e) {
      setStatus(e?.response?.data?.message || e.message || 'Error updating video');
    }
  };

  const deleteVideo = async (vidId) => {
    try {
      const { data } = await axios.delete(`${TEACHER_API}/routes.php/study_pack_video/${vidId}`);
      if (data?.success) {
        setVideos((list) => list.filter((v) => v.id !== vidId));
      } else {
        setStatus(data?.message || 'Failed to delete video');
      }
    } catch (e) {
      setStatus(e?.response?.data?.message || e.message || 'Error deleting video');
    }
  };

  const updateDocTitle = async (docId, title) => {
    try {
      const { data } = await axios.put(`${TEACHER_API}/routes.php/study_pack_document/${docId}`, { title });
      if (data?.success) {
        setDocs((list) => list.map((d) => (d.id === docId ? { ...d, title } : d)));
      } else {
        setStatus(data?.message || 'Failed to update document');
      }
    } catch (e) {
      setStatus(e?.response?.data?.message || e.message || 'Error updating document');
    }
  };

  const deleteDoc = async (docId) => {
    try {
      const { data } = await axios.delete(`${TEACHER_API}/routes.php/study_pack_document/${docId}`);
      if (data?.success) {
        setDocs((list) => list.filter((d) => d.id !== docId));
      } else {
        setStatus(data?.message || 'Failed to delete document');
      }
    } catch (e) {
      setStatus(e?.response?.data?.message || e.message || 'Error deleting document');
    }
  };

  const addNewVideo = async (e) => {
    e.preventDefault();
    if (!newVideo.file) {
      setStatus('Select a video file');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('study_pack_id', id);
      formData.append('title', newVideo.title || '');
      formData.append('file', newVideo.file);
      const { data } = await axios.post(`${TEACHER_API}/routes.php/study_pack_upload_video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data?.success && data.data) {
        setVideos((list) => [...list, { id: data.data.id, title: data.data.title, file_path: data.data.file_path }]);
        setNewVideo({ title: '', file: null });
      } else {
        setStatus(data?.message || 'Failed to upload video');
      }
    } catch (e) {
      setStatus(e?.response?.data?.message || e.message || 'Error uploading video');
    }
  };

  const addNewDoc = async (e) => {
    e.preventDefault();
    if (!newDoc.file) {
      setStatus('Select a document file');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('study_pack_id', id);
      formData.append('title', newDoc.title || '');
      formData.append('file', newDoc.file);
      const { data } = await axios.post(`${TEACHER_API}/routes.php/study_pack_upload_document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data?.success && data.data) {
        setDocs((list) => [...list, { id: data.data.id, title: data.data.title, file_path: data.data.file_path }]);
        setNewDoc({ title: '', file: null });
      } else {
        setStatus(data?.message || 'Failed to upload document');
      }
    } catch (e) {
      setStatus(e?.response?.data?.message || e.message || 'Error uploading document');
    }
  };

  const updateLink = async (linkId, payload) => {
    try {
      const { data } = await axios.put(`${TEACHER_API}/routes.php/study_pack_link/${linkId}`, payload);
      if (data?.success) {
        setLinks((list) => list.map((l) => (l.id === linkId ? { ...l, ...payload } : l)));
      } else {
        setStatus(data?.message || 'Failed to update link');
      }
    } catch (e) {
      setStatus(e?.response?.data?.message || e.message || 'Error updating link');
    }
  };

  const deleteLink = async (linkId) => {
    try {
      const { data } = await axios.delete(`${TEACHER_API}/routes.php/study_pack_link/${linkId}`);
      if (data?.success) {
        setLinks((list) => list.filter((l) => l.id !== linkId));
      } else {
        setStatus(data?.message || 'Failed to delete link');
      }
    } catch (e) {
      setStatus(e?.response?.data?.message || e.message || 'Error deleting link');
    }
  };

  const addNewLink = async (e) => {
    e.preventDefault();
    if (!newLink.link_url) {
      setStatus('Enter link URL');
      return;
    }
    try {
      const payload = {
        study_pack_id: Number(id),
        link_url: newLink.link_url,
        link_title: newLink.link_title || ''
      };
      const { data } = await axios.post(`${TEACHER_API}/routes.php/study_pack_add_link`, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (data?.success) {
        setLinks((list) => [...list, { id: data.link_id || data.data?.link_id || Date.now(), link_url: payload.link_url, link_title: payload.link_title }]);
        setNewLink({ link_title: '', link_url: '' });
      } else {
        setStatus(data?.message || 'Failed to add link');
      }
    } catch (e) {
      setStatus(e?.response?.data?.message || e.message || 'Error adding link');
    }
  };

  return (
    <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
  <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Edit Study Pack</h1>
          <Link to={`/teacher/study-pack/${id}`} className="text-sm text-blue-600 hover:underline">Back to details</Link>
        </div>

        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Study pack core details form */}
            <form onSubmit={onSubmit} className="bg-white rounded-md shadow border border-gray-100 p-8 min-h-100 space-y-4">
            {status ? <div className="text-red-600 text-sm">{status}</div> : null}

            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                name="title"
                value={form.title}
                onChange={onChange}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Study pack title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={onChange}
                rows={5}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Price (LKR)</label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={onChange}
                min="0"
                step="0.01"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="px-4 py-2 bg-white rounded border text-sm" onClick={() => navigate(-1)}>Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>

            {/* Media/link management panels (each may contain its own form) */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-md shadow border border-gray-100 p-5">
                <h3 className="font-medium text-gray-800 mb-3">Links</h3>
                {links.length === 0 ? (
                  <div className="text-sm text-gray-500">No links.</div>
                ) : (
                  <ul className="space-y-3">
                    {links.map((l) => (
                      <li key={l.id} className="space-y-2">
                        <input
                          className="w-full border rounded px-2 py-1 text-sm"
                          value={l.link_title || ''}
                          onChange={(e) => setLinks((list) => list.map((x) => (x.id === l.id ? { ...x, link_title: e.target.value } : x)))}
                          onBlur={(e) => updateLink(l.id, { link_title: e.target.value })}
                          placeholder="Link title (optional)"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            className="flex-1 border rounded px-2 py-1 text-sm truncate min-w-0"
                            value={l.link_url || ''}
                            onChange={(e) => setLinks((list) => list.map((x) => (x.id === l.id ? { ...x, link_url: e.target.value } : x)))}
                            onBlur={(e) => updateLink(l.id, { link_url: e.target.value })}
                            placeholder="https://..."
                          />
                          <button type="button" className="text-red-600 text-xs" onClick={() => deleteLink(l.id)}>Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <form onSubmit={addNewLink} className="mt-4 space-y-2">
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="New link title (optional)"
                    value={newLink.link_title}
                    onChange={(e) => setNewLink((s) => ({ ...s, link_title: e.target.value }))}
                  />
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="New link URL (https://...)"
                    value={newLink.link_url}
                    onChange={(e) => setNewLink((s) => ({ ...s, link_url: e.target.value }))}
                  />
                  <button className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs" type="submit">Add Link</button>
                </form>
              </div>
              <div className="bg-white rounded-md shadow border border-gray-100 p-5">
                <h3 className="font-medium text-gray-800 mb-3">Videos</h3>
                {videos.length === 0 ? (
                  <div className="text-sm text-gray-500">No videos.</div>
                ) : (
                  <ul className="space-y-3">
                    {videos.map((v) => (
                      <li key={v.id} className="flex items-center gap-2">
                        <input
                          className="flex-1 border rounded px-2 py-1 text-sm"
                          value={v.title || ''}
                          onChange={(e) => setVideos((list) => list.map((x) => (x.id === v.id ? { ...x, title: e.target.value } : x)))}
                          onBlur={(e) => updateVideoTitle(v.id, e.target.value)}
                          placeholder={v.file_path}
                        />
                        <button type="button" className="text-red-600 text-xs" onClick={() => deleteVideo(v.id)}>Delete</button>
                      </li>
                    ))}
                  </ul>
                )}

                <form onSubmit={addNewVideo} className="mt-4 space-y-2">
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="New video title (optional)"
                    value={newVideo.title}
                    onChange={(e) => setNewVideo((s) => ({ ...s, title: e.target.value }))}
                  />
                  <input type="file" accept="video/*" onChange={(e) => setNewVideo((s) => ({ ...s, file: e.target.files?.[0] || null }))} />
                  <button className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs" type="submit">Add Video</button>
                </form>
              </div>

              <div className="bg-white rounded-md shadow border border-gray-100 p-5">
                <h3 className="font-medium text-gray-800 mb-3">Documents</h3>
                {docs.length === 0 ? (
                  <div className="text-sm text-gray-500">No documents.</div>
                ) : (
                  <ul className="space-y-3">
                    {docs.map((d) => (
                      <li key={d.id} className="flex items-center gap-2">
                        <input
                          className="flex-1 border rounded px-2 py-1 text-sm"
                          value={d.title || ''}
                          onChange={(e) => setDocs((list) => list.map((x) => (x.id === d.id ? { ...x, title: e.target.value } : x)))}
                          onBlur={(e) => updateDocTitle(d.id, e.target.value)}
                          placeholder={d.file_path}
                        />
                        <button type="button" className="text-red-600 text-xs" onClick={() => deleteDoc(d.id)}>Delete</button>
                      </li>
                    ))}
                  </ul>
                )}

                <form onSubmit={addNewDoc} className="mt-4 space-y-2">
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="New document title (optional)"
                    value={newDoc.title}
                    onChange={(e) => setNewDoc((s) => ({ ...s, title: e.target.value }))}
                  />
                  <input type="file" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*" onChange={(e) => setNewDoc((s) => ({ ...s, file: e.target.files?.[0] || null }))} />
                  <button className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs" type="submit">Add Document</button>
                </form>
                
              </div>
            </div>
          </div>
          
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherStudyPackEdit;

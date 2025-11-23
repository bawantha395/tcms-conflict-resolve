import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import teacherSidebarSections from '../TeacherDashboardSidebar';
import axios from 'axios';
import { getUserData } from '../../../../api/apiUtils';

const TEACHER_API = process.env.REACT_APP_TEACHER_API_BASE_URL || 'http://localhost:8088';

const CreateStudyPack = () => {
  const user = getUserData();
  const navigate = useNavigate();
  const [pack, setPack] = useState({ title: '', description: '', price: '' });
  const [link, setLink] = useState({ url: '', title: '' });
  const [createdPack, setCreatedPack] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [teacherCode, setTeacherCode] = useState(null);

  // Allow clicking for validation; only block while busy
  const canCreate = !busy;

  // Resolve teacher numeric id from stored userData or teacher backend
  useEffect(() => {
    const resolve = async () => {
      try {
        // If user object already has a numeric id, use it
        // We now store teacher_id as the string teacherId (e.g., T001)
        const code = user?.teacherId || user?.userid || null;
        if (typeof code === 'string' && /^T\d+$/i.test(code)) {
          setTeacherCode(code);
          return;
        }
      } catch (e) {
        // Non-fatal; keep UI usable and show validation if missing
        console.warn('Failed to resolve teacher numeric id:', e?.message || e);
      }
      setTeacherCode(null);
    };
    resolve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createPack = async () => {
    // Validate required fields
  const teacherIdStr = teacherCode;
  if (!pack.title || !teacherIdStr) {
      setMsg('teacher_id and title are required');
      return;
    }

    try {
      setBusy(true); setMsg('Creating pack...');
      const payload = {
        teacher_id: teacherIdStr,
        title: pack.title,
        description: pack.description || '',
        price: isNaN(Number(pack.price)) ? 0 : Number(pack.price)
      };
      const { data } = await axios.post(`${TEACHER_API}/routes.php/create_study_pack`, payload);
      if (data?.success) {
        setCreatedPack({ id: data.study_pack_id, ...payload });
        setMsg('Study pack created. You can now upload content.');
      } else {
        // Show backend message or a fallback
        setMsg(data?.message || 'Failed to create study pack.');
      }
    } catch (e) {
      const apiMsg = e?.response?.data?.message || e?.message;
      setMsg(apiMsg ? `Error creating study pack: ${apiMsg}` : 'Error creating study pack.');
    } finally {
      setBusy(false);
    }
  };

  const addLink = async () => {
    if (!createdPack?.id || !link.url) return;
    try {
      setBusy(true); setMsg('Adding link...');
      const payload = {
        study_pack_id: Number(createdPack.id),
        link_url: link.url,
        link_title: link.title || ''
      };
      const { data } = await axios.post(`${TEACHER_API}/routes.php/study_pack_add_link`, payload);
      if (data?.success) {
        setMsg('Link added');
        setLink({ url: '', title: '' });
      } else {
        setMsg(data?.message || 'Failed to add link');
      }
    } catch (e) {
      setMsg('Error adding link');
    } finally {
      setBusy(false);
    }
  };

  const upload = async (type, file, title) => {
    if (!createdPack?.id || !file) return;
    const endpoint = type === 'video' ? 'study_pack_upload_video' : 'study_pack_upload_document';
    try {
      setBusy(true); setMsg(`Uploading ${type}...`);
      const form = new FormData();
      form.append('study_pack_id', String(createdPack.id));
      if (title) form.append('title', title);
      form.append('file', file);

      const { data } = await axios.post(`${TEACHER_API}/routes.php/${endpoint}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data?.success) {
        setMsg(`${type === 'video' ? 'Video' : 'Document'} uploaded`);
        return data.data;
      } else {
        setMsg(data?.message || `Failed to upload ${type}`);
      }
    } catch (e) {
      const apiMsg = e?.response?.data?.message || e?.message;
      setMsg(apiMsg ? `Error uploading ${type}: ${apiMsg}` : `Error uploading ${type}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Create Study Pack</h1>
          <button
            onClick={() => navigate('/teacher/study-pack')}
            className="px-3 py-2 rounded border text-sm hover:bg-gray-50"
          >
            Back
          </button>
        </div>

        {/* Create pack */}
        <div className="bg-white rounded-md shadow p-4 mb-6">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Title</label>
              <input className="w-full border rounded px-3 py-2" value={pack.title} onChange={e=>setPack(p=>({...p,title:e.target.value}))} placeholder="e.g. Physics 2025 Full Pack" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Price (LKR)</label>
              <div className="flex items-center gap-3">
                {/* <input
                  type="range"
                  min="0"
                  max="50000"
                  step="100"
                  className="w-full"
                  value={Number(pack.price) || 0}
                  onChange={(e)=>setPack(p=>({...p, price: Number(e.target.value)}))}
                /> */}
                <input
                  type="number"
                  min="0"
                  step="100"
                  className="w-28 border rounded px-3 py-2"
                  value={pack.price}
                  onChange={(e)=>setPack(p=>({...p, price: e.target.value}))}
                />
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Description</label>
              <textarea className="w-full border rounded px-3 py-2" rows={3} value={pack.description} onChange={e=>setPack(p=>({...p,description:e.target.value}))} placeholder="Short description" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button disabled={!canCreate} onClick={createPack} className={`px-4 py-2 rounded text-white ${canCreate? 'bg-blue-600 hover:bg-blue-700':'bg-gray-400 cursor-not-allowed'}`}>Create Pack</button>
            {msg && <div className={`text-sm self-center ${msg.includes('required')? 'text-red-600':'text-gray-600'}`}>{msg}</div>}
          </div>
        </div>

        {/* After create: upload content */}
        {createdPack?.id && (
          <div className="space-y-6">
            <div className="bg-white rounded-md shadow p-4">
              <h2 className="font-medium mb-3">Add Link</h2>
              <div className="grid md:grid-cols-2 gap-3">
                <input className="border rounded px-3 py-2" placeholder="Link title (optional)" value={link.title} onChange={e=>setLink(s=>({...s,title:e.target.value}))} />
                <input className="border rounded px-3 py-2" placeholder="https://..." value={link.url} onChange={e=>setLink(s=>({...s,url:e.target.value}))} />
              </div>
              <button disabled={busy || !link.url} onClick={addLink} className="mt-3 px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white">Add Link</button>
            </div>

            <div className="bg-white rounded-md shadow p-4">
              <h2 className="font-medium mb-3">Upload Video</h2>
              <UploadRow disabled={busy} onUpload={(file, title)=>upload('video', file, title)} />
            </div>

            <div className="bg-white rounded-md shadow p-4">
              <h2 className="font-medium mb-3">Upload Document (PDF)</h2>
              <UploadRow disabled={busy} onUpload={(file, title)=>upload('document', file, title)} accept="application/pdf" />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

const UploadRow = ({ onUpload, disabled, accept }) => {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  return (
    <div>
      <div className="grid md:grid-cols-3 gap-3">
        <input className="border rounded px-3 py-2" placeholder="Title (optional)" value={title} onChange={e=>setTitle(e.target.value)} />
        <input type="file" accept={accept} className="border rounded px-3 py-2" onChange={e=>setFile(e.target.files?.[0]||null)} />
        <button disabled={disabled || !file} onClick={()=>onUpload(file, title)} className={`px-4 py-2 rounded text-white ${(!disabled && file)?'bg-indigo-600 hover:bg-indigo-700':'bg-gray-400 cursor-not-allowed'}`}>Upload</button>
      </div>
    </div>
  );
};

export default CreateStudyPack;

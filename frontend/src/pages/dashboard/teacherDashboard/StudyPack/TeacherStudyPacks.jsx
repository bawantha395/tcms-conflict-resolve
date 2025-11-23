import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import teacherSidebarSections from '../TeacherDashboardSidebar';
import { getUserData } from '../../../../api/apiUtils';
import BasicCard from '../../../../components/BasicCard';

const TEACHER_API = process.env.REACT_APP_TEACHER_API_BASE_URL || 'http://localhost:8088';

// Show only first two words with an ellipsis of eight dots if description is long
const truncateToTwoWords = (text) => {
  if (!text || typeof text !== 'string') return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= 2) return text;
  return `${words.slice(0, 2).join(' ')} ........`;
};

const TeacherStudyPacks = () => {
  const user = getUserData();
  const navigate = useNavigate();
  const [packs, setPacks] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const teacherCode = user?.teacherId || user?.userid || '';
    if (!teacherCode) {
      setStatus('Teacher ID not found.');
      setLoading(false);
      return;
    }

    const fetchPacks = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${TEACHER_API}/routes.php/study_packs_by_teacher`, {
          params: { teacherId: teacherCode }
        });
        if (data?.success) {
          const base = Array.isArray(data.data) ? data.data : [];
          // Enrich with counts of videos/documents by fetching details per pack
          const withCounts = await Promise.all(
            base.map(async (p) => {
              try {
                const { data: d } = await axios.get(`${TEACHER_API}/routes.php/study_pack`, { params: { id: p.id } });
                if (d?.success && d.data) {
                  return {
                    ...p,
                    videoCount: Array.isArray(d.data.videos) ? d.data.videos.length : 0,
                    documentCount: Array.isArray(d.data.documents) ? d.data.documents.length : 0,
                    linkCount: Array.isArray(d.data.links) ? d.data.links.length : 0
                  };
                }
              } catch (_) {
                // default counts to 0 on failure
              }
              return { ...p, videoCount: 0, documentCount: 0, linkCount: 0 };
            })
          );
          setPacks(withCounts);
          setStatus('');
        } else {
          setStatus(data?.message || 'Failed to load study packs.');
        }
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message;
        setStatus(msg || 'Error loading study packs.');
      } finally {
        setLoading(false);
      }
    };

    fetchPacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Study Packs</h1>
          <Link to="/teacher/study-pack/create" className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm">Create Study Pack</Link>
        </div>

        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : status ? (
          <div className="text-red-600 text-sm">{status}</div>
        ) : packs.length === 0 ? (
          <div className="text-gray-500">No study packs found.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packs.map((p, idx) => (
              <BasicCard
                key={p.id || idx}
                title={
                  <div>
                    <span className="text-sm">{p.title}</span>
                    {/* <div className="text-xs text-gray-500 mt-1">{p.teacher_name || p.teacher_id || '—'}</div> */}
                  </div>
                }
                price={<span className="text-xs">LKR {Number(p.price || 0).toLocaleString()}</span>}
                image={'/assets/nfts/Nft3.png'}
                description={truncateToTwoWords(p.description) || 'No description.'}
                buttonText="View detail"
                onButtonClick={() => navigate(`/teacher/study-pack/${p.id}`)}
              >
                <div className="mt-2 flex items-center gap-4 text-[11px] sm:text-xs text-gray-600">
                  <span>Videos: <span className="font-semibold">{p.videoCount ?? 0}</span></span>
                  <span>Documents: <span className="font-semibold">{p.documentCount ?? 0}</span></span>
                  <span>Link: <span className="font-semibold">{p.linkCount ?? 0}</span></span>

                </div>
              </BasicCard>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherStudyPacks;

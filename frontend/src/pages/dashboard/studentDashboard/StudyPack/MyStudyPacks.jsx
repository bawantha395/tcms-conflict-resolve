import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import studentSidebarSections from '../StudentDashboardSidebar';
import BasicCard from '../../../../components/BasicCard';
import { useNavigate } from 'react-router-dom';
import { getUserData } from '../../../../api/apiUtils';
import axios from 'axios';

const MyStudyPacks = () => {
  const [myStudyPacks, setMyStudyPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const PAYMENT_API = process.env.REACT_APP_PAYMENT_API_BASE_URL || 'http://localhost:8090';
  const TEACHER_API = process.env.REACT_APP_TEACHER_API_BASE_URL || 'http://localhost:8088';

  useEffect(() => {
    const load = async () => {
      // Prefer server data; fallback to localStorage
      try {
        setLoading(true);
        setError('');
        const user = getUserData();
        if (!user || !user.userid) {
          setError('No logged-in student');
          setLoading(false);
          return;
        }
        // Try to get numeric student_id from student backend to match server expectations
        let numericStudentId = null;
        try {
          const profileRes = await fetch(`http://localhost:8086/routes.php/get_with_id/${user.userid}`);
          const profile = await profileRes.json();
          if (profile && profile.user_id) {
            numericStudentId = profile.user_id; // numeric
          }
        } catch (_) {}

        const queryStudentId = encodeURIComponent(numericStudentId ?? user.userid);
        const res = await fetch(`${PAYMENT_API}/routes.php/get_student_purchases?studentId=${queryStudentId}`);
        const json = await res.json();

        if (json?.success && Array.isArray(json.data)) {
          const purchases = json.data.filter(p => (p.category === 'study_pack') || p.study_pack_id);

          // If no purchases, reflect empty state and clear cache, do not fallback
          if (purchases.length === 0) {
            setMyStudyPacks([]);
            localStorage.setItem('myStudyPacks', JSON.stringify([]));
            setLoading(false);
            return;
          }

          // Fetch each pack details from Teacher API
          const packs = await Promise.all(
            purchases.map(async (p) => {
              const packId = p.study_pack_id || p.class_id;
              if (!packId) return null;
              try {
                const { data } = await axios.get(`${TEACHER_API}/routes.php/study_pack`, { params: { id: packId } });
                return data?.success ? data.data : null;
              } catch (_) {
                return null;
              }
            })
          );

          const unique = [];
          const seen = new Set();
          for (const pk of packs.filter(Boolean)) {
            const uid = pk.id;
            if (!seen.has(uid)) { seen.add(uid); unique.push(pk); }
          }

          // Even if unique is empty, reflect server truth and clear cache
          setMyStudyPacks(unique);
          localStorage.setItem('myStudyPacks', JSON.stringify(unique));
          setLoading(false);
          return;
        }

        // fallback to local storage
        const stored = localStorage.getItem('myStudyPacks');
        setMyStudyPacks(stored ? JSON.parse(stored) : []);
      } catch (e) {
        // fallback on error
        const stored = localStorage.getItem('myStudyPacks');
        setMyStudyPacks(stored ? JSON.parse(stored) : []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
      <div className="p-2 sm:p-4 md:p-6">
        <h1 className="text-lg font-bold mb-6 text-center">My Study Packs</h1>
        {loading ? (
          <div className="text-center text-gray-500 mt-8">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-500 mt-8">{error}</div>
        ) : myStudyPacks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 gap-y-8">
            {myStudyPacks.map((pack, idx) => (
              <BasicCard
                key={idx}
                title={<div><span className="text-sm">{pack.title}</span><div className="text-xs text-gray-500 mt-1">{pack.teacher_name || pack.teacher_id}</div></div>}
                price={<span className="text-xs">LKR {Number(pack.price || 0).toLocaleString()}</span>}
                image={pack.image || '/assets/nfts/Nft3.png'}
                description={pack.description}
                buttonText="View Course"
                onButtonClick={() => navigate(`/student/studypacks/${pack.id}`, { state: { pack } })}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-8">You have not purchased any study packs yet.</div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyStudyPacks; 
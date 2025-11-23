import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import studentSidebarSections from './StudentDashboardSidebar';
import { FaFilePdf, FaPlayCircle } from 'react-icons/fa';

const dummyContent = [
  { title: '2027 Theory | DAY 01 - Recording', type: 'video', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  { title: '2027 Theory | DAY 02 - Recording', type: 'video', videoUrl: 'https://www.w3schools.com/html/movie.mp4' },
  { title: '2027 Theory | DAY 03 - Recording', type: 'video', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  { title: '2027 Theory | DAY 04 - Recording', type: 'video', videoUrl: 'https://www.w3schools.com/html/movie.mp4' },
];

const dummyTutes = [
  { name: 'Unit 1A Workbook - SM', url: '/dummy/unit1a-workbook-sm.pdf' },
  { name: 'Unit 1A Theory Book - EM', url: '/dummy/unit1a-theorybook-em.pdf' },
  { name: 'Unit 1A Past Paper MCQ 1 - SM', url: '/dummy/unit1a-mcq1-sm.pdf' },
];

const loginId = '25076340';

const StudyPackDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pack = location.state && location.state.pack;
  const [tab, setTab] = useState('content');
  const [videoModal, setVideoModal] = useState({ open: false, videoUrl: '' });

  if (!pack) {
    return (
      <DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
        <div className="p-8 text-center text-gray-500">Study Pack not found. Please go back to <span className='text-blue-600 underline cursor-pointer' onClick={() => navigate('/student/studypacks')}>My Study Packs</span>.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          <img src={pack.image} alt={pack.title} className="w-64 h-64 object-cover rounded-xl border" />
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-2xl font-bold mb-2">{pack.title}</h1>
            <div className="text-gray-600 mb-2">By {pack.teacher}</div>
            <div className="text-gray-700 mb-4">{pack.description}</div>
            <div className="text-cyan-700 font-bold text-lg">{pack.price}</div>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            className={`px-4 py-2 font-semibold rounded-t ${tab === 'content' ? 'bg-cyan-700 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setTab('content')}
          >
            Course Content
          </button>
          <button
            className={`px-4 py-2 font-semibold rounded-t ${tab === 'tutes' ? 'bg-cyan-700 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setTab('tutes')}
          >
            Tutes
          </button>
        </div>
        {/* Tab Content */}
        {tab === 'content' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dummyContent.map((item, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow p-4 flex flex-col gap-2 relative">
                <div className="flex items-center gap-2 font-semibold text-base">
                  <FaPlayCircle className="text-cyan-600" />
                  {idx + 1}. {item.title}
                </div>
                <button
                  className="border border-cyan-600 text-cyan-700 rounded px-4 py-2 text-xs w-max flex items-center gap-2 hover:bg-cyan-50"
                  onClick={() => setVideoModal({ open: true, videoUrl: item.videoUrl })}
                >
                  <FaPlayCircle /> Start Learning
                </button>
                <span className="absolute top-4 right-4 bg-red-100 text-red-600 rounded-full px-2 py-1 text-xs flex items-center gap-1"><svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#f87171" strokeWidth="2" /><path d="M12 8v4" stroke="#f87171" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="16" r="1" fill="#f87171" /></svg> 0</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dummyTutes.map((tute, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 font-semibold text-base">
                  <FaFilePdf className="text-red-600" />
                  {tute.name}
                </div>
                <div className="bg-blue-50 rounded p-2 text-xs text-blue-900 mb-2 flex items-center gap-2">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-7V7a1 1 0 112 0v6a1 1 0 01-2 0zm1 4a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" fill="#2563eb"/></svg>
                  Document Password is: <span className="font-mono font-bold">{loginId}</span>
                </div>
                <a href={tute.url} target="_blank" rel="noopener noreferrer" className="bg-cyan-700 text-white rounded px-4 py-2 text-xs w-max flex items-center gap-2"><FaFilePdf /> Download Tute</a>
              </div>
            ))}
          </div>
        )}
        {/* Video Modal */}
        {videoModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl flex flex-col items-center relative">
              <button
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl"
                onClick={() => setVideoModal({ open: false, videoUrl: '' })}
                aria-label="Close"
              >
                &times;
              </button>
              <video src={videoModal.videoUrl} controls className="w-full rounded-lg" style={{ maxHeight: 400 }} />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudyPackDetail; 
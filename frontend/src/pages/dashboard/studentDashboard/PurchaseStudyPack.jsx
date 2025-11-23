import React, { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import studentSidebarSections from './StudentDashboardSidebar';
import BasicCard from '../../../components/BasicCard';
import { useNavigate } from 'react-router-dom';
import studyPacks from './PurchaseStudyPackData';

const PurchaseStudyPack = () => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const filteredPacks = studyPacks.filter(
    pack =>
      pack.title.toLowerCase().includes(search.toLowerCase()) ||
      pack.teacher.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
      <div className="p-2 sm:p-4 md:p-6">
        <h1 className="text-lg font-bold mb-6 text-center">All Study Packs</h1>
        <div className="flex justify-center mb-6">
          <input
            type="text"
            placeholder="Search by pack or teacher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 w-full max-w-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 gap-y-8">
          {filteredPacks.map((pack, idx) => {
            // Find the index in the original studyPacks for navigation
            const packIdx = studyPacks.findIndex(p => p.title === pack.title && p.teacher === pack.teacher);
            return (
              <BasicCard
                key={idx}
                title={<div><span className="text-sm">{pack.title}</span><div className="text-xs text-gray-500 mt-1">{pack.teacher}</div></div>}
                price={<span className="text-xs">{pack.price}</span>}
                image={pack.image}
                buttonText="Buy Now"
                onButtonClick={() => navigate(`/student/checkout/${packIdx}`, { state: { type: 'studyPack' } })}
              />
            );
          })}
        </div>
        {filteredPacks.length === 0 && (
          <div className="text-center text-gray-500 mt-8">No study packs found.</div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PurchaseStudyPack; 
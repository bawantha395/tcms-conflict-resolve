import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import studentSidebarSections from './StudentDashboardSidebar';
import BasicCard from '../../../components/BasicCard';
import { useNavigate } from 'react-router-dom';

const MyStudyPacks = () => {
  const [myStudyPacks, setMyStudyPacks] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('myStudyPacks');
    setMyStudyPacks(stored ? JSON.parse(stored) : []);
  }, []);

  return (
    <DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
      <div className="p-2 sm:p-4 md:p-6">
        <h1 className="text-lg font-bold mb-6 text-center">My Study Packs</h1>
        {myStudyPacks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 gap-y-8">
            {myStudyPacks.map((pack, idx) => (
              <BasicCard
                key={idx}
                title={<div><span className="text-sm">{pack.title}</span><div className="text-xs text-gray-500 mt-1">{pack.teacher}</div></div>}
                price={<span className="text-xs">{pack.price}</span>}
                image={pack.image}
                description={pack.description}
                buttonText="View Course"
                onButtonClick={() => navigate(`/student/studypacks/${idx}`, { state: { pack } })}
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
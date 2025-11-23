import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import studentSidebarSections from '../StudentDashboardSidebar';
import BasicCard from '../../../../components/BasicCard';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getStudentPurchasedStudyPacks } from '../../../../api/payments';
import { getUserData } from '../../../../api/apiUtils';
import { FaCheckCircle } from 'react-icons/fa';

const TEACHER_API = process.env.REACT_APP_TEACHER_API_BASE_URL || 'http://localhost:8088';

const PurchaseStudyPack = () => {
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState('all'); // Add tab state
  const [packs, setPacks] = useState([]);
  const [purchasedPacks, setPurchasedPacks] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        
        // Load all study packs
        const { data } = await axios.get(`${TEACHER_API}/routes.php/study_packs`);
        if (data?.success) {
          const list = Array.isArray(data.data) ? data.data : [];
          console.log('🔍 All study packs:', list);
          setPacks(list);
          setStatus('');
        } else {
          setStatus(data?.message || 'Failed to load study packs.');
        }
        
        // Load student's purchased study packs
        const userData = getUserData();
        if (userData && userData.userid) {
          try {
            const purchasedResponse = await getStudentPurchasedStudyPacks(userData.userid);
            console.log('🔍 Purchased study packs response:', purchasedResponse);
            if (purchasedResponse?.success) {
              const purchasedList = Array.isArray(purchasedResponse.data) ? purchasedResponse.data : [];
              console.log('🔍 Purchased packs list:', purchasedList);
              setPurchasedPacks(purchasedList);
            }
          } catch (err) {
            console.error('Error loading purchased study packs:', err);
            // Don't show error to user, just continue without purchased data
          }
        }
        
      } catch (e) {
        setStatus(e?.response?.data?.message || e?.message || 'Error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Check if student already owns a study pack (defined before useMemo)
  const isPackPurchased = (packId) => {
    const isPurchased = purchasedPacks.some(purchase => {
      const purchaseId = purchase.study_pack_id || purchase.studyPackId;
      console.log(`🔍 Comparing pack ${packId} with purchase ${purchaseId}:`, purchaseId == packId);
      return purchaseId == packId; // Use loose equality to handle string/number mismatch
    });
    console.log(`🔍 Pack ${packId} purchased status:`, isPurchased);
    return isPurchased;
  };

  const filteredPacks = useMemo(() => {
    const term = search.trim().toLowerCase();
    
    // Filter by tab first
    let tabFiltered = packs;
    
    if (selectedTab === 'purchased') {
      // Show only purchased study packs
      tabFiltered = packs.filter(p => isPackPurchased(p.id));
    } else if (selectedTab === 'all') {
      // Show all study packs (both purchased and unpurchased)
      tabFiltered = packs;
    }
    
    // Then filter by search term
    if (!term) return tabFiltered;
    
    return tabFiltered.filter((p) =>
      (p.title || '').toLowerCase().includes(term) ||
      (p.teacher_name || p.teacher_id || '').toLowerCase().includes(term)
    );
  }, [packs, purchasedPacks, search, selectedTab]);

  // Get purchase status for a study pack
  const getPurchaseStatus = (pack) => {
    const alreadyOwned = isPackPurchased(pack.id);

    if (alreadyOwned) {
      return {
        status: 'owned',
        text: 'Already Purchased',
        color: 'text-green-600',
        icon: <FaCheckCircle />,
        buttonText: 'View in My Study Packs',
        buttonAction: 'view',
        buttonClassName: 'bg-green-600 hover:bg-green-700'
      };
    }

    return {
      status: 'available',
      text: 'Available for Purchase',
      color: 'text-gray-600',
      buttonText: 'Buy Now',
      buttonAction: 'purchase',
      buttonClassName: 'bg-[#1a365d] hover:bg-[#13294b]'
    };
  };

  // Handle button actions
  const handleButtonAction = (pack, action) => {
    if (action === 'view') {
      // Navigate to MyStudyPacks page to show all purchased packs
      navigate('/student/studypacks');
    } else if (action === 'purchase') {
      navigate(`/student/studypack/checkout/${pack.id}`, { state: { pack } });
    }
  };

  const tabOptions = [
    { key: 'all', label: 'All Study Packs' },
    { key: 'purchased', label: 'Purchased Study Packs' }
  ];

  const truncateToTwoWords = (text) => {
  if (!text || typeof text !== 'string') return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= 2) return text;
  return `${words.slice(0, 2).join(' ')} ........`;
};

  return (
    <DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
      <div className="p-2 sm:p-4 md:p-6">
        <h1 className="text-lg font-bold mb-6 text-center">All Study Packs</h1>
        {/* <h1 className="text-lg font-bold mb-6 text-center">
          {selectedTab === 'purchased' ? 'Purchased Study Packs' : 'All Study Packs'}
        </h1> */}
        
        
        {/* <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {tabOptions.map(tab => (
            <button
              key={tab.key}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-150 border-2
                ${selectedTab === tab.key
                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-md'
                  : 'bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50'}
              `}
              onClick={() => setSelectedTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div> */}
        
        <div className="flex justify-center mb-6">
          {/* <input
            type="text"
            placeholder={selectedTab === 'purchased' ? 
              "Search your purchased study packs..." : 
              "Search by pack or teacher..."
            }
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 w-full max-w-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          /> */}
        </div>
        {loading ? (
          <div className="text-gray-500 text-center">Loading...</div>
        ) : status ? (
          <div className="text-red-600 text-center text-sm">{status}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 gap-y-8">
            {filteredPacks.map((pack) => {
              const purchaseStatus = getPurchaseStatus(pack);
              
              return (
                <BasicCard
                  key={pack.id}
                  title={
                    <div>
                      <span className="text-sm">{pack.title}</span>
                      <div className="text-xs text-gray-500 mt-1">
                        {pack.teacher_name || pack.teacher_id}
                      </div>
                    </div>
                  }
                  price={<span className="text-xs">LKR {Number(pack.price || 0).toLocaleString()}</span>}
                  image={'/assets/nfts/Nft3.png'}
                  description={
                    <div className="text-xs text-gray-600">
                      <div className="mb-2">{truncateToTwoWords(pack.description) || 'No description.'}</div>
                      
                      {/* Purchase Status */}
                      <div className="flex items-center gap-1 mt-2 p-2 bg-gray-50 rounded">
                        <span className={purchaseStatus.color}>{purchaseStatus.icon}</span>
                        <span className={`text-xs font-semibold ${purchaseStatus.color}`}>
                          {purchaseStatus.text}
                        </span>
                      </div>
                    </div>
                  }
                  buttonText={purchaseStatus.buttonText}
                  onButtonClick={() => handleButtonAction(pack, purchaseStatus.buttonAction)}
                  buttonClassName={purchaseStatus.buttonClassName}
                />
              );
            })}
          </div>
        )}
        {!loading && !status && filteredPacks.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            {selectedTab === 'purchased' 
              ? 'You have not purchased any study packs yet.' 
              : 'No study packs found.'}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PurchaseStudyPack; 
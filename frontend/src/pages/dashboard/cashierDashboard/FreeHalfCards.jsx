import React, { useEffect, useState, useMemo } from 'react';
import { FaUser, FaBook, FaTicketAlt, FaCalendar, FaEdit, FaTrash, FaSearch } from 'react-icons/fa';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import cashierSidebarSections from './CashierDashboardSidebar';
import { getUserData, logout as authLogout } from '../../../api/apiUtils';
import { getStudentById, getAllStudents, getStudentCards, updateStudentCard, deleteStudentCard } from '../../../api/students';
import { getCardTypeInfo, getCardStatus } from '../../../utils/cardUtils';

const FreeHalfCards = () => {
  const [user, setUser] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingCard, setEditingCard] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, cardId: null });
  const studentCache = React.useRef({});

  useEffect(() => {
    setUser(getUserData());
  }, []);

  const handleLogout = async () => {
    try {
      await authLogout();
    } catch (e) {
      // ignore
    }
    window.location.href = '/login';
  };

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    setLoading(true);
    try {
      // Fetch all students, then fetch cards for each student and aggregate
      const studentsResp = await getAllStudents();
      const studentsArray = Array.isArray(studentsResp) ? studentsResp : (studentsResp.students || []);

      const aggregated = [];
      for (const st of studentsArray) {
        const sid = st.user_id || st.userid || st.studentId || st.student_id;
        if (!sid) continue;

        try {
          const cardsResp = await getStudentCards(sid);
          const cardsArray = Array.isArray(cardsResp) ? cardsResp : (cardsResp.cards || cardsResp.data || []);

          const transformed = (cardsArray || []).map(card => ({
            id: card.id || card.card_id || `${sid}_${card.classId || card.class_id || 'unknown'}`,
            studentId: sid,
            studentName: card.studentName || `${st.first_name || st.firstName || ''} ${st.last_name || st.lastName || ''}`.trim(),
            classId: card.classId || card.class_id || card.classId,
            className: card.className || card.class_name || card.class || '',
            subject: card.subject || '',
            teacher: card.teacher || '',
            cardType: card.cardType || card.card_type || card.type || 'free',
            reason: card.reason || '',
            validFrom: card.validFrom || card.valid_from || card.start_date || '',
            validUntil: card.validUntil || card.valid_until || card.end_date || '',
            isActive: card.isActive !== undefined ? card.isActive : (card.is_active !== undefined ? card.is_active : true),
          }));

          aggregated.push(...transformed);
        } catch (e) {
          // ignore errors per-student
          console.debug('Failed to load cards for student', sid, e.message || e);
        }
      }

      // If backend returned no cards, fall back to client-side storage (some flows create cards locally)
      if (!aggregated || aggregated.length === 0) {
        try {
          const stored = localStorage.getItem('studentCards');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.info('Using localStorage studentCards as fallback (backend returned none)');
              setCards(parsed);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.debug('Fallback read from localStorage failed', err);
        }
      }

      setCards(aggregated);
    } catch (e) {
      console.error('Failed to load cards from backend', e);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const resolveStudentName = async (studentId) => {
    if (!studentId) return studentId;
    if (studentCache.current[studentId]) return studentCache.current[studentId];
    try {
      const s = await getStudentById(studentId);
      const name = `${s.firstName || ''} ${s.lastName || ''}`.trim() || studentId;
      studentCache.current[studentId] = name;
      return name;
    } catch (e) {
      // fallback to id
      studentCache.current[studentId] = studentId;
      return studentId;
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return cards;
    const q = search.toLowerCase();
    return cards.filter(c => (
      (c.studentName && c.studentName.toLowerCase().includes(q)) ||
      (c.studentId && c.studentId.toLowerCase().includes(q)) ||
      (c.className && c.className.toLowerCase().includes(q)) ||
      (c.cardType && c.cardType.toLowerCase().includes(q))
    ));
  }, [cards, search]);

  const openEdit = (card) => {
    setEditingCard({ ...card });
    setShowEditModal(true);
  };

  const handleEditChange = (key, value) => {
    setEditingCard(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editingCard) return;
    try {
      const res = await updateStudentCard(editingCard.id, editingCard);
      // assume API returns the updated card or success flag
      if (res && (res.success === false)) {
        throw new Error(res.message || 'Update failed');
      }

      // update local state using returned data when available
      const updated = (res && res.data) ? res.data : editingCard;
      setCards(prev => prev.map(c => c.id === editingCard.id ? ({ ...c, ...updated }) : c));
      setShowEditModal(false);
      setEditingCard(null);
    } catch (e) {
      console.error('Error updating card:', e);
      alert('Failed to update card: ' + (e.message || 'unknown'));
    }
  };

  const handleDelete = (cardId) => {
    setConfirmDelete({ open: true, cardId });
  };

  const confirmDeleteCard = async () => {
    const { cardId } = confirmDelete;
    if (!cardId) return;
    try {
      const res = await deleteStudentCard(cardId);
      if (res && res.success === false) throw new Error(res.message || 'Delete failed');
      setCards(prev => prev.filter(c => c.id !== cardId));
      setConfirmDelete({ open: false, cardId: null });
    } catch (e) {
      console.error('Error deleting card:', e);
      alert('Failed to delete card: ' + (e.message || 'unknown'));
    }
  };

  return (
    <DashboardLayout
      {...(user?.role === 'cashier' ? {
        userRole: 'Cashier',
        sidebarItems: cashierSidebarSections,
        onLogout: handleLogout,
        customTitle: 'TCMS',
        customSubtitle: `Cashier Dashboard - ${user?.name || 'Cashier'}`
      } : {
        userRole: 'Administrator',
        sidebarItems: [],
        onLogout: handleLogout,
      })}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Free & Half Cards</h1>
            <p className="text-gray-600">Manage free/half cards issued to students. Edit validity or remove cards.</p>
          </div>
          <div className="w-80">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by student, id, class or type..."
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">Loading...</div>
          ) : (
            <table className="min-w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Student</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Class</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Card Type</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Valid Until</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-gray-500">No cards found</td></tr>
                )}
                {filtered.map(card => {
                  const cardTypeInfo = getCardTypeInfo(card.cardType);
                  const status = getCardStatus(card);
                  return (
                    <tr key={card.id} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium">{card.studentName || card.studentId}</div>
                        <div className="text-sm text-gray-500">ID: {card.studentId}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium">{card.className || card.classId}</div>
                        <div className="text-sm text-gray-500">{card.subject || ''}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${cardTypeInfo.color}`}>{cardTypeInfo.label}</span>
                      </td>
                      <td className="px-4 py-3 align-top">{card.validUntil ? new Date(card.validUntil).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3 align-top"><span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span></td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex gap-3">
                          <button title="Edit" onClick={() => openEdit(card)} className="text-blue-600 hover:text-blue-800"><FaEdit /></button>
                          <button title="Delete" onClick={() => handleDelete(card.id)} className="text-red-600 hover:text-red-800"><FaTrash /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Edit Modal */}
        {showEditModal && editingCard && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Edit Card</h3>
                <button onClick={() => { setShowEditModal(false); setEditingCard(null); }} className="text-gray-600">✕</button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600">Student</label>
                  <div className="mt-1 text-sm text-gray-800">{editingCard.studentName || editingCard.studentId}</div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600">Card Type</label>
                  <select value={editingCard.cardType} onChange={e => handleEditChange('cardType', e.target.value)} className="w-full mt-1 p-2 border rounded">
                    <option value="free">Free</option>
                    <option value="half">Half</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600">Valid Until</label>
                  <input type="date" value={editingCard.validUntil ? editingCard.validUntil.split('T')[0] : ''} onChange={e => handleEditChange('validUntil', e.target.value)} className="w-full mt-1 p-2 border rounded" />
                </div>

                <div>
                  <label className="inline-flex items-center">
                    <input type="checkbox" checked={editingCard.isActive !== false} onChange={e => handleEditChange('isActive', e.target.checked)} className="mr-2" />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => { setShowEditModal(false); setEditingCard(null); }} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                  <button onClick={handleSaveEdit} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {confirmDelete.open && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Delete Card</h3>
              <p className="text-sm text-gray-700">Are you sure you want to delete this card? This action cannot be undone.</p>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setConfirmDelete({ open: false, cardId: null })} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <button onClick={confirmDeleteCard} className="px-4 py-2 bg-red-600 text-white rounded">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FreeHalfCards;

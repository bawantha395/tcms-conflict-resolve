import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode';
import { FaBarcode, FaCamera, FaUpload, FaCheckCircle, FaTimesCircle, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { getAllClasses } from '../../api/classes';

const BarcodeAttendanceScanner = () => {
  // UI mode: camera = continuous camera scanning; image = single-image upload with confirm
  const [mode, setMode] = useState('image'); // default to image-first (mobile friendly)

  const [scannedData, setScannedData] = useState(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [message, setMessage] = useState(null);
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState([]);
  const [todayName, setTodayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentDetails, setStudentDetails] = useState(null);
  const [studentEnrollmentsPreview, setStudentEnrollmentsPreview] = useState([]);
  const [isEnrolledPreview, setIsEnrolledPreview] = useState(null);
  const [prevAttendances, setPrevAttendances] = useState([]);
  const [prevAttendancesLoading, setPrevAttendancesLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState('today'); // 'today', 'manual-single', 'manual-multiple'
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [scanningActive, setScanningActive] = useState(false);
  const [counters, setCounters] = useState(() => {
    // Load counters from localStorage on mount
    try {
      const saved = localStorage.getItem('attendance_counters');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [panelOpen, setPanelOpen] = useState(true);

  // Recent attendance log state
  const [recentAttendance, setRecentAttendance] = useState(() => {
    try {
      const saved = localStorage.getItem('recent_attendance_log');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [imageProcessing, setImageProcessing] = useState(false);
  const [imageReadyToMark, setImageReadyToMark] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [hwListening, setHwListening] = useState(true);
  const [autoMark, setAutoMark] = useState(true);
  const [imageAutoConfirm, setImageAutoConfirm] = useState(() => {
    try {
      const v = localStorage.getItem('imageAutoConfirm');
      return v === null ? true : v === 'true';
    } catch (e) { return true; }
  });
  const [lastMethodUsed, setLastMethodUsed] = useState('');
  const [autoClearDelay, setAutoClearDelay] = useState(0); // ms; 0 = immediate
  const [successPattern, setSuccessPattern] = useState('single');

  // Offline Support State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [cachedStudents, setCachedStudents] = useState({});
  const [cachedEnrollments, setCachedEnrollments] = useState({});

  const lastScannedRef = useRef(null);
  const lastDecodedRef = useRef(null);
  const inFlightAutoConfirmRef = useRef(false);
  const selectionModeRef = useRef(selectionMode);
  const selectedClassesRef = useRef(selectedClasses);
  const classIdRef = useRef(classId);
  const scanningActiveRef = useRef(scanningActive);
  const recentScansRef = useRef({}); // { barcode -> timestampMillis }
  const successfullyMarkedRef = useRef({}); // { barcode: Set(classId) }
  const scanBufferRef = useRef('');
  const lastCharTsRef = useRef(0);
  const successBeep = useRef(typeof Window !== 'undefined' ? new window.Audio('/assets/success-beep.mp3') : { play: () => {} });
  const [toasts, setToasts] = useState([]);
  const [flashSuccess, setFlashSuccess] = useState(false);
  // network logging removed

  // Server-backed session helpers
  const sessionIdRef = useRef(null);
  const getSessionId = () => {
    if (!sessionIdRef.current) {
      try { sessionIdRef.current = localStorage.getItem('scannerSessionId') || (`scanner-${window.location.hostname}`); localStorage.setItem('scannerSessionId', sessionIdRef.current); } catch (e) { sessionIdRef.current = `scanner-${Date.now()}`; }
    }
    return sessionIdRef.current;
  };

  const saveSessionToServer = async () => {
    try {
      const sid = getSessionId();
      // serialize successfullyMarked (Sets -> arrays)
      const serializableMarked = {};
      try {
        const sm = successfullyMarkedRef.current || {};
        Object.keys(sm).forEach(k => {
          const s = sm[k];
          if (s && typeof s === 'object' && typeof s.has === 'function') serializableMarked[k] = Array.from(s);
          else if (Array.isArray(s)) serializableMarked[k] = s.slice();
          else serializableMarked[k] = [];
        });
      } catch (e) { /* ignore */ }
      const payload = { sessionId: sid, data: { counters, selectedClasses, successfullyMarked: serializableMarked } };
      const res = await fetch(`${process.env.REACT_APP_ATTENDANCE_BACKEND_URL}/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      return res.ok;
  } catch (e) { console.warn('saveSessionToServer failed', e); return false; }
  };

  const loadSessionFromServer = async () => {
    try {
      const sid = getSessionId();
  const res = await fetch(`${process.env.REACT_APP_ATTENDANCE_BACKEND_URL}/session/${sid}`);
  if (!res.ok) return null;
  const data = await res.json(); if (data && data.success && data.data) {
    const d = data.data;
    // reconstruct successfullyMarked Sets from arrays
    if (d.successfullyMarked) {
      try {
        const obj = {};
        Object.entries(d.successfullyMarked).forEach(([k, v]) => { obj[k] = new Set(Array.isArray(v) ? v : (v ? Object.keys(v) : [])); });
        d.successfullyMarked = obj;
      } catch (e) { /* ignore */ }
    }
    return d;
  }
  return null;
  } catch (e) { console.warn('loadSessionFromServer failed', e); return null; }
  };

  // Ensure session is persisted when the user refreshes/closes the page — use sendBeacon if available
  useEffect(() => {
    const handler = () => {
      try {
        const sid = getSessionId();
        const sm = successfullyMarkedRef.current || {};
        const serializableMarked = {};
        Object.keys(sm).forEach(k => { const s = sm[k]; serializableMarked[k] = (s && typeof s.has === 'function') ? Array.from(s) : (Array.isArray(s) ? s.slice() : []); });
        const payload = { sessionId: sid, data: { counters: counters || {}, selectedClasses: selectedClasses || [], successfullyMarked: serializableMarked } };
        const body = JSON.stringify(payload);
        if (navigator && typeof navigator.sendBeacon === 'function') {
          const blob = new Blob([body], { type: 'application/json' });
          navigator.sendBeacon(`${process.env.REACT_APP_ATTENDANCE_BACKEND_URL}/session`, blob);
        } else {
          // best-effort: synchronous XHR is deprecated; skip if not supported
        }
      } catch (e) { /* ignore */ }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [counters, selectedClasses]);

  // helper: toggle class selection
  const toggleClassSelection = (id, checked) => {
    setSelectedClasses(prev => {
      const cur = Array.isArray(prev) ? prev.slice() : [];
      if (checked) {
        if (!cur.includes(id)) cur.push(id);
      } else {
        const idx = cur.indexOf(id);
        if (idx >= 0) cur.splice(idx, 1);
      }
      return cur;
    });
  };

  const addToast = (type, text) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, type, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  };

  // Add to recent attendance log
  const addToRecentLog = (studentId, studentName, classId, className, method = 'barcode') => {
    const timestamp = new Date();
    const entry = {
      id: Date.now() + Math.random(),
      studentId,
      studentName: studentName || studentId,
      classId,
      className: className || getClassName(classId),
      method,
      timestamp: timestamp.toISOString(),
      displayTime: timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      displayDate: timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
    
    setRecentAttendance(prev => {
      const newLog = [entry, ...prev];
      // Keep only last 50 entries
      return newLog.slice(0, 50);
    });
  };

  const playSuccessPattern = async (pattern) => {
    try {
      if (!successBeep.current || typeof successBeep.current.play !== 'function') return;
      if (pattern === 'single') {
        await successBeep.current.play().catch(() => {});
      } else if (pattern === 'double') {
        await successBeep.current.play().catch(() => {});
        setTimeout(() => { successBeep.current.play().catch(() => {}); }, 180);
      }
    } catch (e) { /* ignore */ }
  };

  const getClassName = (cid) => {
    const found = classes.find(x => String(x.id) === String(cid));
    return found ? (found.className || found.name) : String(cid);
  };

  // ============ OFFLINE SUPPORT FUNCTIONS ============
  
  // Initialize IndexedDB for offline storage
  const initOfflineDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AttendanceOfflineDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Store for pending attendance records
        if (!db.objectStoreNames.contains('pendingAttendance')) {
          const attendanceStore = db.createObjectStore('pendingAttendance', { keyPath: 'id', autoIncrement: true });
          attendanceStore.createIndex('timestamp', 'timestamp', { unique: false });
          attendanceStore.createIndex('studentId', 'studentId', { unique: false });
        }
        
        // Store for cached student data
        if (!db.objectStoreNames.contains('cachedStudents')) {
          const studentStore = db.createObjectStore('cachedStudents', { keyPath: 'id' });
          studentStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }
        
        // Store for cached enrollment data
        if (!db.objectStoreNames.contains('cachedEnrollments')) {
          const enrollmentStore = db.createObjectStore('cachedEnrollments', { keyPath: 'key' });
          enrollmentStore.createIndex('studentId', 'studentId', { unique: false });
        }
        
        // Store for cached classes
        if (!db.objectStoreNames.contains('cachedClasses')) {
          db.createObjectStore('cachedClasses', { keyPath: 'id' });
        }
      };
    });
  };

  // Save attendance record to offline queue
  const saveToOfflineQueue = async (attendanceData) => {
    try {
      const db = await initOfflineDB();
      const transaction = db.transaction(['pendingAttendance'], 'readwrite');
      const store = transaction.objectStore('pendingAttendance');
      
      const record = {
        ...attendanceData,
        timestamp: new Date().toISOString(),
        synced: false
      };
      
      await store.add(record);
      
      // Update UI queue
      setOfflineQueue(prev => [...prev, record]);
      addToast('info', `📴 Saved offline (${offlineQueue.length + 1} pending)`);
      
      return true;
    } catch (error) {
      console.error('Failed to save to offline queue:', error);
      addToast('error', 'Failed to save offline record');
      return false;
    }
  };

  // Cache student data for offline access
  const cacheStudentData = async (studentId, studentData) => {
    try {
      const db = await initOfflineDB();
      const transaction = db.transaction(['cachedStudents'], 'readwrite');
      const store = transaction.objectStore('cachedStudents');
      
      await store.put({
        id: studentId,
        data: studentData,
        lastUpdated: new Date().toISOString()
      });
      
      setCachedStudents(prev => ({ ...prev, [studentId]: studentData }));
    } catch (error) {
      console.error('Failed to cache student data:', error);
    }
  };

  // Get cached student data
  const getCachedStudentData = async (studentId) => {
    try {
      const db = await initOfflineDB();
      const transaction = db.transaction(['cachedStudents'], 'readonly');
      const store = transaction.objectStore('cachedStudents');
      
      return new Promise((resolve, reject) => {
        const request = store.get(studentId);
        request.onsuccess = () => resolve(request.result?.data || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get cached student:', error);
      return null;
    }
  };

  // Cache enrollment data
  const cacheEnrollmentData = async (studentId, classId, enrollmentData) => {
    try {
      const db = await initOfflineDB();
      const transaction = db.transaction(['cachedEnrollments'], 'readwrite');
      const store = transaction.objectStore('cachedEnrollments');
      
      const key = `${studentId}_${classId}`;
      await store.put({
        key,
        studentId,
        classId,
        data: enrollmentData,
        lastUpdated: new Date().toISOString()
      });
      
      setCachedEnrollments(prev => ({ ...prev, [key]: enrollmentData }));
    } catch (error) {
      console.error('Failed to cache enrollment:', error);
    }
  };

  // Get cached enrollment data
  const getCachedEnrollmentData = async (studentId, classId) => {
    try {
      const db = await initOfflineDB();
      const transaction = db.transaction(['cachedEnrollments'], 'readonly');
      const store = transaction.objectStore('cachedEnrollments');
      
      const key = `${studentId}_${classId}`;
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.data || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get cached enrollment:', error);
      return null;
    }
  };

  // Sync offline queue when back online
  const syncOfflineQueue = async () => {
    if (!isOnline || syncInProgress) return;
    
    try {
      setSyncInProgress(true);
      const db = await initOfflineDB();
      const transaction = db.transaction(['pendingAttendance'], 'readwrite');
      const store = transaction.objectStore('pendingAttendance');
      
      const allRecords = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      const unsynced = allRecords.filter(r => !r.synced);
      
      if (unsynced.length === 0) {
        setSyncInProgress(false);
        return;
      }
      
      addToast('info', `🔄 Syncing ${unsynced.length} offline records...`);
      
      let successCount = 0;
      let failCount = 0;
      
      for (const record of unsynced) {
        try {
          const response = await fetch(`${process.env.REACT_APP_ATTENDANCE_BACKEND_URL}/mark-attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record.payload)
          });
          
          if (response.ok) {
            // Mark as synced
            const updateTx = db.transaction(['pendingAttendance'], 'readwrite');
            const updateStore = updateTx.objectStore('pendingAttendance');
            record.synced = true;
            record.syncedAt = new Date().toISOString();
            await updateStore.put(record);
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error('Sync failed for record:', record.id, error);
          failCount++;
        }
      }
      
      // Update UI queue
      const remainingTx = db.transaction(['pendingAttendance'], 'readonly');
      const remainingStore = remainingTx.objectStore('pendingAttendance');
      const remaining = await new Promise((resolve) => {
        const req = remainingStore.getAll();
        req.onsuccess = () => resolve(req.result.filter(r => !r.synced));
      });
      
      setOfflineQueue(remaining);
      
      if (successCount > 0) {
        addToast('success', `✅ Synced ${successCount} records`);
      }
      if (failCount > 0) {
        addToast('error', `❌ Failed to sync ${failCount} records`);
      }
      
    } catch (error) {
      console.error('Sync failed:', error);
      addToast('error', 'Sync failed - will retry later');
    } finally {
      setSyncInProgress(false);
    }
  };

  // Load offline queue on mount
  const loadOfflineQueue = async () => {
    try {
      const db = await initOfflineDB();
      const transaction = db.transaction(['pendingAttendance'], 'readonly');
      const store = transaction.objectStore('pendingAttendance');
      
      const allRecords = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      const pending = allRecords.filter(r => !r.synced);
      setOfflineQueue(pending);
      
      if (pending.length > 0) {
        addToast('info', `📴 ${pending.length} offline records pending sync`);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  };

  // ============ END OFFLINE SUPPORT FUNCTIONS ============

  // Unified attendance marking with offline support
  const markAttendanceWithOffline = async (classId, studentId, attendanceData) => {
    const payload = {
      classId,
      studentId,
      attendanceData: {
        ...attendanceData,
        join_time: attendanceData.join_time || new Date().toLocaleString('sv-SE', { 
          timeZone: 'Asia/Colombo', 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        }).replace('T', ' ')
      }
    };

    // If offline, save to queue and return optimistic success
    if (!isOnline) {
      const saved = await saveToOfflineQueue({ payload, studentId, classId });
      if (saved) {
        // Optimistic update for counters
        setCounters(prev => {
          const key = String(classId);
          const next = { ...prev };
          next[key] = (next[key] || 0) + 1;
          return next;
        });
        
        // Mark as successfully processed
        if (!successfullyMarkedRef.current[studentId]) {
          successfullyMarkedRef.current[studentId] = new Set();
        }
        successfullyMarkedRef.current[studentId].add(String(classId));
        
        // Add to recent log (get student name from studentDetails if available)
        const studentName = studentDetails?.name || studentId;
        addToRecentLog(studentId, studentName, classId, null, attendanceData.method || 'barcode');
        
        return { ok: true, offline: true, message: 'Saved offline' };
      }
      return { ok: false, offline: true, message: 'Failed to save offline' };
    }

    // Online - attempt server request
    try {
      const response = await fetch(`${process.env.REACT_APP_ATTENDANCE_BACKEND_URL}/mark-attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setCounters(prev => {
          const key = String(classId);
          const next = { ...prev };
          next[key] = (next[key] || 0) + 1;
          return next;
        });
        
        if (!successfullyMarkedRef.current[studentId]) {
          successfullyMarkedRef.current[studentId] = new Set();
        }
        successfullyMarkedRef.current[studentId].add(String(classId));
        
        // Add to recent log
        const studentName = studentDetails?.name || studentId;
        addToRecentLog(studentId, studentName, classId, null, attendanceData.method || 'barcode');
        
        return { ok: true, offline: false, message: 'Marked' };
      }
      
      return { ok: false, offline: false, message: 'Server error' };
    } catch (error) {
      // Network error while supposedly online - save offline instead
      console.warn('Network error, saving offline:', error);
      const saved = await saveToOfflineQueue({ payload, studentId, classId });
      if (saved) {
        setCounters(prev => {
          const key = String(classId);
          const next = { ...prev };
          next[key] = (next[key] || 0) + 1;
          return next;
        });
        
        if (!successfullyMarkedRef.current[studentId]) {
          successfullyMarkedRef.current[studentId] = new Set();
        }
        successfullyMarkedRef.current[studentId].add(String(classId));
        
        // Add to recent log even when offline
        const studentName = studentDetails?.name || studentId;
        addToRecentLog(studentId, studentName, classId, null, attendanceData.method || 'barcode');
        
        return { ok: true, offline: true, message: 'Network error - saved offline' };
      }
      return { ok: false, offline: true, message: 'Network error' };
    }
  };

  // Robustly interpret various shapes returned by /is-enrolled endpoints
  const parseEnrolled = (enrollData) => {
    try {
      if (!enrollData && enrollData !== false) return false;
      // direct boolean
      if (typeof enrollData === 'boolean') return enrollData;
      // common explicit fields
      if (typeof enrollData.enrolled !== 'undefined') return !!enrollData.enrolled;
      if (typeof enrollData.isEnrolled !== 'undefined') return !!enrollData.isEnrolled;
      if (typeof enrollData.success !== 'undefined' && typeof enrollData.enrolled !== 'undefined') return !!enrollData.enrolled;
      // sometimes the API returns { data: { enrolled: true } }
      if (enrollData.data && typeof enrollData.data.enrolled !== 'undefined') return !!enrollData.data.enrolled;
      // last resort: truthy fields
      if (enrollData.enrolled === true || enrollData.isEnrolled === true) return true;
      return false;
    } catch (e) { return false; }
  };

  // Wrapper to call /is-enrolled and push the raw request/response to networkLog
  const fetchIsEnrolled = async (studentId, cid) => {
    const url = `${process.env.REACT_APP_ATTENDANCE_BACKEND_URL}/is-enrolled/${encodeURIComponent(studentId)}/${cid}`;
    try {
      const res = await fetch(url);
      let text = null; try { text = await res.clone().text(); } catch (e) { text = null; }
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
      return { enrolled: parseEnrolled(data), raw: data, ok: res.ok, status: res.status };
    } catch (err) {
      return { enrolled: false, raw: null, ok: false, status: 0 };
    }
  };

  // fetch last 3 attendances for a student (best-effort; backend may return different shape)
  const fetchPrevAttendances = async (studentId) => {
    if (!studentId) { setPrevAttendances([]); return; }
    setPrevAttendancesLoading(true);
    try {
      // Resolve backend base URL with safe fallbacks
      let base = process.env.REACT_APP_ATTENDANCE_BACKEND_URL || (typeof window !== 'undefined' && window._env && window._env.REACT_APP_ATTENDANCE_BACKEND_URL) || '';
      if (!base) {
        // fallback to same origin (useful for dev without env set)
        try { base = (typeof window !== 'undefined' && window.location && window.location.origin) || ''; } catch (e) { base = ''; }
      }
      // strip trailing slash for consistent concatenation
      if (base && base.endsWith('/')) base = base.slice(0, -1);

      const tryPaths = [
        `/student-attendance/${encodeURIComponent(studentId)}?limit=3`,
        `/recent-attendance/${encodeURIComponent(studentId)}?limit=3`,
        `/attendances/${encodeURIComponent(studentId)}?limit=3`,
        `/students/${encodeURIComponent(studentId)}/attendances?limit=3`
      ];
      let success = false;
      for (const p of tryPaths) {
        const url = base ? `${base}${p}` : p; // if no base, try relative path
        try {
          const res = await fetch(url);
          if (!res.ok) {
            if (res.status === 404) continue; // try next fallback
            else continue;
          }
          let data = null;
          try { data = await res.json(); } catch (parseErr) { continue; }
          // common shapes: { success: true, data: [...] } OR { records: [...] } OR raw array
          const normalizeRecord = (r) => {
            try {
              const cid = r.classId || r.class_id || (r.class && (r.class.id || r.class.classId)) || r.class || null;
              const className = r.className || r.class_name || (r.class && (r.class.className || r.class.name)) || (cid ? getClassName(cid) : undefined);
              const timestamp = r.timestamp || r.time || r.join_time || r.created_at || r.createdAt || r.date || null;
              return Object.assign({}, r, { classId: cid, className, timestamp });
            } catch (e) { return r; }
          };
          if (data && data.success && Array.isArray(data.data)) { setPrevAttendances(data.data.map(normalizeRecord).slice(0,3)); success = true; break; }
          if (data && Array.isArray(data.records)) { setPrevAttendances(data.records.map(normalizeRecord).slice(0,3)); success = true; break; }
          if (Array.isArray(data)) { setPrevAttendances(data.map(normalizeRecord).slice(0,3)); success = true; break; }
          // unknown shape, try next
        } catch (inner) {
          // network or CORS error — try next fallback
          continue;
        }
      }
      if (!success) {
        setPrevAttendances([]);
        addToast('error', 'Could not load recent attendance (no endpoint responded)');
      }
    } catch (err) { setPrevAttendances([]); addToast('error', 'Error fetching recent attendance'); }
    finally { setPrevAttendancesLoading(false); }
  };

  useEffect(() => {
    try { localStorage.setItem('imageAutoConfirm', imageAutoConfirm); } catch (e) {}
  }, [imageAutoConfirm]);

  useEffect(() => {
    try { setTodayName(new Date().toLocaleDateString('en-US', { weekday: 'long' })); } catch (e) { setTodayName(''); }
    // Collapse right panel by default on small screens for a mobile-first layout
    try { if (typeof window !== 'undefined' && window.innerWidth < 900) setPanelOpen(false); } catch (e) {}

    const computeDefaultSelection = (list) => {
      try {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const todays = (list || []).filter(c => ((c.schedule_day || c.scheduleDay || '')).toString().toLowerCase() === today.toString().toLowerCase());
        if (todays && todays.length) {
          const now = new Date();
          const parseTime = (timeStr) => {
            if (!timeStr) return null;
            const parts = timeStr.split(':').map(p => parseInt(p, 10));
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), parts[0] || 0, parts[1] || 0, parts[2] || 0);
          };
          let chosen = null;
          for (const c of todays) {
            const s = parseTime(c.schedule_start_time || (c.schedule && c.schedule.startTime) || '');
            const e = parseTime(c.schedule_end_time || (c.schedule && c.schedule.endTime) || '');
            if (s && e && now >= s && now <= e) { chosen = c; break; }
          }
          if (!chosen) {
            let best = null; let bestDiff = Number.POSITIVE_INFINITY;
            for (const c of todays) {
              const s = parseTime(c.schedule_start_time || (c.schedule && c.schedule.startTime) || '');
              if (!s) continue;
              const diff = Math.abs(s - now);
              if (diff < bestDiff) { bestDiff = diff; best = c; }
            }
            chosen = best;
          }
          if (chosen) {
            const idStr = String(chosen.id);
            if (selectionModeRef.current === 'today') setSelectedClasses([idStr]);
            setClassId(idStr);
          }
        }
      } catch (err) { /* ignore */ }
    };

    getAllClasses().then(data => {
      let allClasses = [];
      if (data && Array.isArray(data.data)) { allClasses = data.data; }
      else if (Array.isArray(data)) { allClasses = data; }
      
      // Filter to only show physical and hybrid classes (not online-only)
      const physicalClasses = allClasses.filter(c => {
        const method = (c.delivery_method || c.deliveryMethod || '').toLowerCase();
        return method === 'physical' || method.startsWith('hybrid');
      });
      
      setClasses(physicalClasses);
      computeDefaultSelection(physicalClasses);
    }).catch(() => setClasses([]));
  }, []);

  // Load saved session on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await loadSessionFromServer();
        if (!mounted) return;
        if (s) {
          if (s.counters) setCounters(s.counters);
          if (Array.isArray(s.selectedClasses)) setSelectedClasses(s.selectedClasses);
          if (s.successfullyMarked) {
            try { successfullyMarkedRef.current = s.successfullyMarked; } catch (e) {}
          }
        }
      } catch (e) {}
    })();
    return () => { mounted = false; };
  }, []);

  // Auto-save session when counters or selectedClasses change (debounced)
  useEffect(() => {
    const iv = setTimeout(() => { saveSessionToServer().catch(() => {}); }, 600);
    return () => clearTimeout(iv);
  }, [counters, selectedClasses]);

  // Camera scanner lifecycle (only active in camera mode)
  useEffect(() => {
    if (mode !== 'camera') return undefined;
    // when entering camera mode auto-start scanning for cashier flow
    try { setScanningActive(true); scanningActiveRef.current = true; } catch (e) {}
    // use a slightly higher FPS for faster detection and ensure the preview area is flexible
    const scanner = new Html5QrcodeScanner('barcode-reader', { fps: 15, qrbox: { width: 300, height: 90 } }, false);
    scanner.render(async (decodedText) => {
      const normalized = (decodedText || '').toString().trim();
      if (!scanningActiveRef.current) return;
      const nowTs = Date.now(); const DEDUPE_MS = 3000; // 1 seconds (was 30000)
      const prev = recentScansRef.current[normalized];
      if (prev && (nowTs - prev) < DEDUPE_MS) { 
        setMessage({ type: 'error', text: '⚠️ Duplicate scan ignored (wait 3s)' }); 
        return; 
      }
      recentScansRef.current[normalized] = nowTs;
      // camera mode behaves as before: auto-mark for selected classes
      const targetClassIds = selectionModeRef.current === 'manual-single'
        ? (classIdRef.current ? [classIdRef.current] : [])
        : selectionModeRef.current === 'manual-multiple'
        ? (selectedClassesRef.current && selectedClassesRef.current.length ? selectedClassesRef.current : [])
        : (selectedClassesRef.current && selectedClassesRef.current.length ? selectedClassesRef.current : []);
      const hasSelection = Array.isArray(targetClassIds) && targetClassIds.length > 0;
      if (!hasSelection) { setMessage({ type: 'error', text: '⚠️ Please select at least one class first' }); return; }
      if (normalized !== lastScannedRef.current) {
        lastScannedRef.current = normalized; setScannedData(normalized); setLoading(true);
        const markedSet = successfullyMarkedRef.current[normalized] || new Set();
        const toProcess = targetClassIds.filter(cid => !markedSet.has(String(cid)));
        if (toProcess.length === 0) { setLoading(false); setMessage({ type: 'error', text: '⚠️ Already marked for selected classes' }); return; }
        try {
          const detailsRes = await fetch(`${process.env.REACT_APP_ATTENDANCE_BACKEND_URL}/student-details/${encodeURIComponent(normalized)}`);
          const detailsData = await detailsRes.json();
          if (!detailsData.success) { setMessage({ type: 'error', text: `❌ Invalid student barcode: ${normalized}` }); setStudentDetails(null); setStudentEnrollmentsPreview([]); setLoading(false); return; }
          setStudentDetails(detailsData.student);
            fetchPrevAttendances(normalized);
          // if autoMark enabled, use unified routine; else proceed with inline marking
          if (autoMark) {
            await processAutoMark(normalized, toProcess, 'barcode');
          } else {
            const results = [];
            for (const cid of toProcess) {
              try {
                const enrollRes = await fetch(`${process.env.REACT_APP_ATTENDANCE_BACKEND_URL}/is-enrolled/${encodeURIComponent(normalized)}/${cid}`);
                const enrollData = await enrollRes.json();
                const enrolled = parseEnrolled(enrollData);
                if (!enrolled) { results.push({ classId: cid, ok: false, message: 'Not enrolled' }); continue; }
                
                // Use offline-aware marking function
                const result = await markAttendanceWithOffline(cid, normalized, { 
                  method: 'barcode', 
                  status: 'present' 
                });
                
                if (result.ok) {
                  const msg = result.offline ? 'Saved offline' : 'Marked';
                  results.push({ classId: cid, ok: true, message: msg, offline: result.offline });
                  // persist session after successful mark
                  if (!result.offline) {
                    saveSessionToServer().catch(() => {});
                  }
                } else {
                  results.push({ classId: cid, ok: false, message: result.message });
                }
              } catch (err) { 
                results.push({ classId: cid, ok: false, message: 'Network error' }); 
              }
            }
            setLoading(false); const allOk = results.length > 0 && results.every(r => r.ok);
            const hasOffline = results.some(r => r.offline);
            const successMsg = hasOffline ? '✅ Saved (will sync when online):' : '✅ Attendance updated for:';
            setMessage({ type: allOk ? 'success' : 'error', text: allOk ? successMsg : '⚠️ Results:', summary: results });
            setLastMethodUsed('camera');
            if (results.some(r => r.ok)) { successBeep.current.play().catch(() => {}); }
          }
        } catch (error) { setLoading(false); setMessage({ type: 'error', text: '⚠️ Network error' }); }
      }
    }, () => {});

  return () => { scanner.clear().catch(() => {}); try { setScanningActive(false); scanningActiveRef.current = false; } catch (e) {} };
  }, [mode]);

  // sync refs
  useEffect(() => { selectionModeRef.current = selectionMode; }, [selectionMode]);
  useEffect(() => { selectedClassesRef.current = selectedClasses; }, [selectedClasses]);
  useEffect(() => { classIdRef.current = classId; }, [classId]);
  useEffect(() => { scanningActiveRef.current = scanningActive; }, [scanningActive]);

  // prune recent scans
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now(); const DEDUPE_MS = 3000; // Match camera scan dedupe time
      Object.keys(recentScansRef.current).forEach(k => { if ((now - recentScansRef.current[k]) > (DEDUPE_MS * 2)) delete recentScansRef.current[k]; });
    }, 10000); // Clean up every 10 seconds
    return () => clearInterval(iv);
  }, []);

  // Save counters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('attendance_counters', JSON.stringify(counters));
    } catch (e) {
      console.error('Failed to save counters:', e);
    }
  }, [counters]);

  // Save recent attendance log to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('recent_attendance_log', JSON.stringify(recentAttendance));
    } catch (e) {
      console.error('Failed to save recent attendance:', e);
    }
  }, [recentAttendance]);

  useEffect(() => {
  return () => {};
  }, []);

  useEffect(() => { if (selectionMode === 'manual-single' && selectedClasses && selectedClasses.length) setClassId(selectedClasses[0]); }, [selectionMode, selectedClasses]);

  // ============ OFFLINE SUPPORT HOOKS ============
  
  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addToast('success', '🌐 Back online - syncing...');
      syncOfflineQueue();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      addToast('warning', '📴 Offline mode - data will sync later');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Initialize offline DB and load pending queue on mount
  useEffect(() => {
    const initOffline = async () => {
      try {
        await initOfflineDB();
        await loadOfflineQueue();
        console.log('Offline support initialized');
      } catch (error) {
        console.error('Failed to initialize offline support:', error);
      }
    };
    
    initOffline();
  }, []);
  
  // Auto-sync when online and queue has items
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0 && !syncInProgress) {
      const timer = setTimeout(() => {
        syncOfflineQueue();
      }, 2000); // Wait 2 seconds after coming online before syncing
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, offlineQueue.length, syncInProgress]);
  
  // ============ END OFFLINE SUPPORT HOOKS ============

  // Filter classes for today with better matching and debugging
  const todaysClasses = React.useMemo(() => {
    if (!todayName || !classes || !classes.length) {
      console.log('BarcodeScanner: No todayName or classes', { todayName, classesCount: classes?.length });
      return [];
    }
    
    const today = todayName.toLowerCase().trim();
    const filtered = classes.filter(c => {
      const scheduleDay = (c.schedule_day || c.scheduleDay || '').toString().toLowerCase().trim();
      const matches = scheduleDay === today;
      
      // Debug: log first few classes
      if (classes.indexOf(c) < 3) {
        console.log(`Class ${c.id}: schedule_day="${scheduleDay}", today="${today}", matches=${matches}`);
      }
      
      return matches;
    });
    
    console.log(`BarcodeScanner: Found ${filtered.length} classes for ${todayName} out of ${classes.length} total`);
    return filtered;
  }, [classes, todayName]);

  // Process a scanned barcode for preview (used by image flow and hardware scanner)
  const processScannedBarcodeForPreview = async (rawBarcode) => {
    if (!rawBarcode) return;
    const normalized = (rawBarcode || '').toString().trim();
    setScannedData(normalized);
    setImageReadyToMark(false);
    setMessage(null);
    setStudentEnrollmentsPreview([]);
    try {
      setImageProcessing(true);
      const detailsRes = await fetch(`${process.env.REACT_APP_ATTENDANCE_BACKEND_URL}/student-details/${encodeURIComponent(normalized)}`);
      const detailsData = await detailsRes.json();
      if (!detailsData.success) { setMessage({ type: 'error', text: `❌ Invalid barcode: ${normalized}` }); setStudentDetails(null); setImageProcessing(false); return; }
      setStudentDetails(detailsData.student);
  fetchPrevAttendances(normalized);
      const targetClassIds = selectionMode === 'manual-single'
        ? (classId ? [classId] : [])
        : selectionMode === 'manual-multiple'
        ? (selectedClasses && selectedClasses.length ? selectedClasses : [])
        : (selectedClasses && selectedClasses.length ? selectedClasses : []);
      const preview = [];
      for (const cid of targetClassIds) {
        try {
          const r = await fetchIsEnrolled(normalized, cid);
          preview.push({ classId: cid, enrolled: r.enrolled, markedInSession: (successfullyMarkedRef.current[normalized] || new Set()).has(String(cid)), enrollRaw: r.raw });
        } catch (err) { preview.push({ classId: cid, enrolled: false, markedInSession: false }); }
      }
      setStudentEnrollmentsPreview(preview);
      setImageReadyToMark(true);
      // if autoMark is enabled, proceed to mark immediately using 'hardware' method
      if (autoMark) {
        const toMark = targetClassIds;
        // when auto-marking from an image flow, pass method='image' so the routine
        // will reset the image preview UI after marking.
        if (toMark && toMark.length) await processAutoMark(normalized, toMark, 'image');
      }
    } catch (err) {
      setMessage({ type: 'error', text: '⚠️ Network or decode error' });
    } finally { setImageProcessing(false); }
  };

  // unified auto-mark routine
  const processAutoMark = async (normalized, targetClassIds, method) => {
    if (!normalized || !targetClassIds || !targetClassIds.length) return;
    setLoading(true);
    const results = [];
    for (const cid of targetClassIds) {
      try {
        const markedSet = successfullyMarkedRef.current[normalized] || new Set();
        if (markedSet.has(String(cid))) { results.push({ classId: cid, ok: false, message: 'Already marked (session)' }); continue; }
                const r = await fetchIsEnrolled(normalized, cid);
                if (!r.enrolled) { 
                  const reason = r.raw?.reason || 'unknown';
                  let message = 'Not enrolled';
                  
                  // Match MyClasses.jsx payment logic
                  if (reason === 'free_card') {
                    message = 'Free Card - Access granted';
                    // Allow access even though enrolled=false (this shouldn't happen, but handle it)
                  } else if (reason === 'half_card_paid') {
                    message = 'Half Card - Paid';
                  } else if (reason === 'half_payment_required') {
                    message = 'Half Card - 50% payment required';
                  } else if (reason === 'grace_period_expired') {
                    message = 'Payment required - grace period expired';
                  } else if (reason === 'payment_required') {
                    message = 'Payment required';
                  } else if (reason === 'not_enrolled') {
                    message = 'Not enrolled';
                  }
                  
                  results.push({ classId: cid, ok: false, message, raw: r.raw }); 
                  continue; 
                }
        
        // Use offline-aware marking function
        const result = await markAttendanceWithOffline(cid, normalized, { 
          method, 
          status: 'present' 
        });
        
        if (result.ok) {
          const msg = result.offline ? 'Saved offline' : 'Marked';
          results.push({ classId: cid, ok: true, message: msg, className: getClassName(cid), offline: result.offline });
        } else {
          results.push({ classId: cid, ok: false, message: result.message });
        }
      } catch (err) { results.push({ classId: cid, ok: false, message: 'Network error' }); }
    }
    setLoading(false);
    const allOk = results.length > 0 && results.every(r => r.ok);
    const hasOffline = results.some(r => r.offline);
    // translate classIds to class names in summary and schedule retries for failures
    const summary = results.map(r => ({ ...r, className: r.className || getClassName(r.classId) }));
    const successMsg = hasOffline ? '✅ Saved (will sync when online):' : '✅ Attendance updated for:';
    setMessage({ type: allOk ? 'success' : 'error', text: allOk ? successMsg : '⚠️ Results:', summary });
    if (results.some(r => r.ok)) {
      playSuccessPattern(successPattern); setFlashSuccess(true); setTimeout(() => setFlashSuccess(false), 700); addToast('success', `Marked ${summary.filter(s=>s.ok).map(s=>s.className).join(', ')}`);
      // prepare UI for next scan: immediate clear when autoClearDelay === 0, otherwise wait
      if (method === 'image') {
        if (autoClearDelay <= 0) resetForNextImage(); else setTimeout(() => { resetForNextImage(); }, autoClearDelay);
      } else {
        if (autoClearDelay <= 0) { setScannedData(null); setStudentDetails(null); setStudentEnrollmentsPreview([]); } else setTimeout(() => { setScannedData(null); setStudentDetails(null); setStudentEnrollmentsPreview([]); }, autoClearDelay);
      }
    }
    if (results.some(r => !r.ok)) {
      addToast('error', `Some marks failed: ${summary.filter(s=>!s.ok).map(s=>`${s.className}:${s.message}`).join(', ')}`);
    }

    // Always prepare UI for the next scan (no manual retry). Honor autoClearDelay.
    const clearForNext = () => {
      if (method === 'image') resetForNextImage();
      else { setScannedData(null); setStudentDetails(null); setStudentEnrollmentsPreview([]); }
    };
    if (autoClearDelay <= 0) clearForNext(); else setTimeout(() => clearForNext(), autoClearDelay);

    setLastMethodUsed(method);
    // Emit a global event so other parts of the app (dashboard) can refresh immediately
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('attendance:updated', { detail: { studentId: normalized, classes: targetClassIds, results: summary } }));
      }
    } catch (e) { /* ignore */ }
  };

  // Hardware/USB keyboard HID scanner capture (timing-based)
  useEffect(() => {
    if (!hwListening) return undefined;
    const SCAN_CHAR_MAX_GAP = 40; // ms
    const SCAN_END_TIMEOUT = 80; // ms
    let timer = null;

    const onKey = (e) => {
      // ignore modifier keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
      const now = Date.now();
      if (e.key.length === 1) {
        const gap = now - (lastCharTsRef.current || 0);
        if (gap > SCAN_CHAR_MAX_GAP) scanBufferRef.current = '';
        lastCharTsRef.current = now;
        scanBufferRef.current += e.key;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          const barcode = scanBufferRef.current.trim();
          scanBufferRef.current = '';
          lastCharTsRef.current = 0;
          if (barcode) processScannedBarcodeForPreview(barcode);
        }, SCAN_END_TIMEOUT);
      } else if (e.key === 'Enter') {
        if (timer) { clearTimeout(timer); timer = null; }
        const barcode = scanBufferRef.current.trim();
        scanBufferRef.current = '';
        lastCharTsRef.current = 0;
        if (barcode) processScannedBarcodeForPreview(barcode);
      }
    };

    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); if (timer) clearTimeout(timer); };
  }, [hwListening, selectionMode, selectedClasses, classId]);

  // When an image is decoded and ready, auto-run the mark flow using the last decoded
  // value if the relevant toggles are enabled. Use a ref guard to avoid duplicate runs.
  useEffect(() => {
    const run = async () => {
      if (!imageReadyToMark) return;
      const val = lastDecodedRef.current;
      if (!val) return;
      if (!imageAutoConfirm && !autoMark) return;
      if (inFlightAutoConfirmRef.current) return;
      inFlightAutoConfirmRef.current = true;
      try {
        const targetClassIds = selectionMode === 'manual-single'
          ? (classId ? [classId] : [])
          : selectionMode === 'manual-multiple'
          ? (selectedClasses && selectedClasses.length ? selectedClasses : [])
          : (selectedClasses && selectedClasses.length ? selectedClasses : []);
        if (!targetClassIds || !targetClassIds.length) {
          setMessage({ type: 'error', text: '⚠️ No class selected — cannot auto-mark.' });
          return;
        }
        if (autoMark) {
          // If we're in image mode, attribute the method as 'image' so
          // processAutoMark will execute image-specific reset behavior.
          const method = (mode === 'image') ? 'image' : 'barcode';
          await processAutoMark(val, targetClassIds, method);
        } else if (imageAutoConfirm) {
          await markAttendanceForImage(val);
        }
      } catch (e) {
        console.error('Auto-confirm effect failed', e);
      } finally { inFlightAutoConfirmRef.current = false; }
    };
    run();
  }, [imageReadyToMark, imageAutoConfirm, autoMark, selectionMode, selectedClasses, classId]);

  // ----- Image upload -> preview (no mark) flow -----
  const handleImageFile = async (file) => {
    if (!file) return;
    setImageProcessing(true); setImageReadyToMark(false); setMessage(null); setPreviewFileName(file.name || 'image');
    try {
      // provide a quick local preview for the user while we decode
      try {
        if (previewImageUrl) { URL.revokeObjectURL(previewImageUrl); }
      } catch (e) {}
      const url = URL.createObjectURL(file);
      setPreviewImageUrl(url);
      // use html5-qrcode's scanFile if available
      const tempId = 'barcode-temp';
      // create offscreen element required by library
      let tempEl = document.getElementById(tempId);
      if (!tempEl) { tempEl = document.createElement('div'); tempEl.id = tempId; tempEl.style.display = 'none'; document.body.appendChild(tempEl); }
      const html5Qr = new Html5Qrcode(tempId);
      // scanFile returns decodedText on success
      const res = await html5Qr.scanFile(file, /* showImage= */ false);
      await html5Qr.clear();
      const normalized = (res || '').toString().trim();
      // If decode returned nothing, treat as decode failure and bail out so UI doesn't get stuck
      if (!normalized) {
        setImageProcessing(false);
        setMessage({ type: 'error', text: '⚠️ No barcode decoded from image' });
        // keep preview visible for user to re-check image
        try { await html5Qr.clear(); } catch (e) {}
        return;
      }
      // keep a non-react ref of the last decoded value so debug UI can show it immediately
      lastDecodedRef.current = normalized;
      setScannedData(normalized);
      // fetch student preview details and enrollment status for selected classes
      const detailsRes = await fetch(`${process.env.REACT_APP_ATTENDANCE_BACKEND_URL}/student-details/${encodeURIComponent(normalized)}`);
      const detailsData = await detailsRes.json();
      if (!detailsData.success) { setMessage({ type: 'error', text: `❌ Invalid barcode in image: ${normalized}` }); setStudentDetails(null); setStudentEnrollmentsPreview([]); setImageProcessing(false); return; }
      setStudentDetails(detailsData.student);
  fetchPrevAttendances(normalized);
      // check enrollment for preview target classes (respect selectionMode)
      const targetClassIds = selectionMode === 'manual-single'
        ? (classId ? [classId] : [])
        : selectionMode === 'manual-multiple'
        ? (selectedClasses && selectedClasses.length ? selectedClasses : [])
        : (selectedClasses && selectedClasses.length ? selectedClasses : []);
      const preview = [];
      for (const cid of targetClassIds) {
        try {
          const enrollRes = await fetch(`${process.env.REACT_APP_ATTENDANCE_BACKEND_URL}/is-enrolled/${encodeURIComponent(normalized)}/${cid}`);
          const enrollData = await enrollRes.json();
          const enrolled = parseEnrolled(enrollData);
          preview.push({ classId: cid, enrolled, markedInSession: (successfullyMarkedRef.current[normalized] || new Set()).has(String(cid)) });
        } catch (err) { preview.push({ classId: cid, enrolled: false, markedInSession: false }); }
      }
      setStudentEnrollmentsPreview(preview);
  setImageReadyToMark(true);
  // show a visible UI message when decoding succeeds so user doesn't rely on console
  try { setMessage({ type: 'info', text: `Decoded barcode: ${normalized}` }); } catch (e) {}
      setImageProcessing(false);
      // We intentionally do NOT call the marking routines directly here. Instead we
      // rely on the effect that watches `imageReadyToMark` to perform auto-mark or
      // auto-confirm using `lastDecodedRef` and `inFlightAutoConfirmRef` as guards.
      // Calling processAutoMark/markAttendanceForImage here and also relying on the
      // effect caused duplicate POSTs in some runs (state update + immediate call).
      // If neither autoMark nor imageAutoConfirm is enabled, the user will press
      // Confirm manually. If an auto flow is enabled, the effect will schedule it.
      if (autoMark || imageAutoConfirm) {
        try { setMessage({ type: 'info', text: `Scheduling auto flow for ${normalized}` }); } catch (e) {}
      }
    } catch (err) {
      setImageProcessing(false); setMessage({ type: 'error', text: '⚠️ Could not decode image (no barcode found or unsupported format)' });
  // keep preview visible so user can re-check image
    }
  };

  const onDropFile = (e) => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handleImageFile(f); };

  const onPickFile = (e) => { const f = e.target.files && e.target.files[0]; if (f) handleImageFile(f); };
  // Prevent selecting a new file while current image is awaiting confirmation
  const safeOnPickFile = (e) => {
    if (imageReadyToMark || imageProcessing) return; const f = e.target.files && e.target.files[0]; if (f) handleImageFile(f);
  };

  const markAttendanceForImage = async (barcodeParam = null) => {
  const normalized = barcodeParam || scannedData;
  // If called from the auto-confirm path we pass barcodeParam; allow proceeding even if
  // imageReadyToMark state hasn't flushed yet (setImageReadyToMark is async).
  const canProceed = barcodeParam ? true : imageReadyToMark;
  if (!normalized || !canProceed) return;
    setLoading(true);
    const targetClassIds = selectionMode === 'manual-single'
      ? (classId ? [classId] : [])
      : selectionMode === 'manual-multiple'
      ? (selectedClasses && selectedClasses.length ? selectedClasses : [])
      : (selectedClasses && selectedClasses.length ? selectedClasses : []);
    // If there are no target classes selected, inform the user and reset the image UI so it
    // doesn't remain stuck in 'Waiting to confirm'. This commonly happens when neither a
    // manual class nor today's classes are selected.
    if (!Array.isArray(targetClassIds) || targetClassIds.length === 0) {
      setLoading(false);
      setImageReadyToMark(false);
      setMessage({ type: 'error', text: '⚠️ No class selected — please select at least one class to mark attendance.' });
      // Reset preview so user can pick another image immediately
      setTimeout(() => { try { resetForNextImage(); } catch (e) {} }, 300);
      return;
    }
    const results = [];
  for (const cid of targetClassIds) {
      try {
        // skip if already marked in session
        const markedSet = successfullyMarkedRef.current[normalized] || new Set();
        if (markedSet.has(String(cid))) { results.push({ classId: cid, ok: false, message: 'Already marked (session)' }); continue; }
  const r = await fetchIsEnrolled(normalized, cid);
  if (!r.enrolled) { 
    const reason = r.raw?.reason || 'unknown';
    let message = 'Not enrolled';
    
    // Match MyClasses.jsx payment logic
    if (reason === 'free_card') {
      message = 'Free Card - Access granted';
      // Allow access even though enrolled=false (this shouldn't happen, but handle it)
    } else if (reason === 'half_card_paid') {
      message = 'Half Card - Paid';
    } else if (reason === 'half_payment_required') {
      message = 'Half Card - 50% payment required';
    } else if (reason === 'grace_period_expired') {
      message = 'Payment required - grace period expired';
    } else if (reason === 'payment_required') {
      message = 'Payment required';
    } else if (reason === 'not_enrolled') {
      message = 'Not enrolled';
    }
    
    results.push({ classId: cid, ok: false, message, raw: r.raw }); 
    continue; 
  }
        
        // Use offline-aware marking function
        const result = await markAttendanceWithOffline(cid, normalized, { 
          method: 'barcode', 
          status: 'present' 
        });
        
        if (result.ok) {
          const msg = result.offline ? 'Saved offline' : 'Marked';
          results.push({ classId: cid, ok: true, message: msg, offline: result.offline });
          // persist session after successful mark (skip if offline)
          if (!result.offline) {
            saveSessionToServer().catch(() => {});
          }
        } else {
          results.push({ classId: cid, ok: false, message: result.message });
        }
      } catch (err) { results.push({ classId: cid, ok: false, message: 'Network error' }); }
    }
    setLoading(false);
    const allOk = results.length > 0 && results.every(r => r.ok);
    const hasOffline = results.some(r => r.offline);
    const successMsg = hasOffline ? '✅ Saved (will sync when online):' : '✅ Attendance updated for:';
    setMessage({ type: allOk ? 'success' : 'error', text: allOk ? successMsg : '⚠️ Results:', summary: results });
    if (results.some(r => r.ok)) { successBeep.current.play().catch(() => {}); }
    setImageReadyToMark(false); // require new upload before marking again
    const autoTriggered = !!barcodeParam || !!imageAutoConfirm;
    if (results.some(r => r.ok)) {
      playSuccessPattern(successPattern);
      addToast('success', `Marked ${results.filter(r=>r.ok).map(r=>getClassName(r.classId)).join(', ')}`);
      // If this was an auto-confirm/auto-mark flow, reset immediately so user can upload next image.
      if (autoTriggered) {
        try { resetForNextImage(); } catch (e) {}
      } else {
        setTimeout(() => { resetForNextImage(); }, autoClearDelay);
      }
    }
  setLastMethodUsed('image');
  // Notify other parts of the app
  try {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('attendance:updated', { detail: { studentId: normalized, classes: targetClassIds, results } }));
    }
  } catch (e) {}
  };

  const resetForNextImage = () => {
    setScannedData(null);
    setPreviewFileName('');
    setStudentDetails(null);
    setStudentEnrollmentsPreview([]);
    setMessage(null);
    setImageReadyToMark(false);
    setImageProcessing(false);
    try {
      if (previewImageUrl) { URL.revokeObjectURL(previewImageUrl); }
    } catch (e) {}
    setPreviewImageUrl(null);
  try { lastDecodedRef.current = null; } catch (e) {}
    // Clear the file input so selecting the same file again will fire change event
    try {
      const inp = document.getElementById('file-input');
      if (inp) inp.value = '';
    } catch (e) {}
  };

  return (
    <div className="barcode-page">
  <style>{`
        /* ============ Modern Mobile-First Glassmorphism Design ============ */
        
        /* Base Layout */
        .barcode-page { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; 
          min-height: 100vh;
          background: linear-gradient(135deg, 
            rgba(250, 251, 252, 1) 0%,
            rgba(241, 245, 249, 1) 15%,
            rgba(226, 232, 240, 1) 35%,
            rgba(203, 213, 225, 1) 55%,
            rgba(226, 232, 240, 1) 75%,
            rgba(241, 245, 249, 1) 90%,
            rgba(250, 251, 252, 1) 100%
          );
          background-size: 400% 400%;
          animation: gradientFlow 20s ease infinite;
          position: relative;
          overflow-x: hidden;
        }
        
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        /* Glass Container */
        .glass-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px;
          min-height: 100vh;
        }
        
        /* Layout */
        .layout { 
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          align-items: start;
        }
        
        /* Header with glassmorphism */
        .app-header {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(40px) saturate(150%);
          -webkit-backdrop-filter: blur(40px) saturate(150%);
          border-radius: 24px;
          padding: 20px 24px;
          margin-bottom: 20px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 
            0 8px 32px rgba(148, 163, 184, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }
        
        .app-title {
          font-size: 28px;
          font-weight: 800;
          color: #1e293b;
          text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .app-subtitle {
          font-size: 14px;
          color: #475569;
          margin-top: 6px;
        }

        /* Scanner Card with Enhanced Glass Effect */
        .scanner-card {
          background: rgba(255, 255, 255, 0.55);
          backdrop-filter: blur(40px) saturate(150%);
          -webkit-backdrop-filter: blur(40px) saturate(150%);
          border-radius: 28px;
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 
            0 8px 32px rgba(148, 163, 184, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            0 16px 64px rgba(148, 163, 184, 0.08);
          position: relative;
          overflow: hidden;
        }
        
        .scanner-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          animation: shimmer 3s infinite;
        }
        
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        /* Scanner Area */
        .scanner { 
          width: 100%;
          height: 500px;
          min-height: 400px;
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background: rgba(255, 255, 255, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.7);
          box-shadow: 
            0 8px 32px rgba(148, 163, 184, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }
        
        .scanner.flash-success {
          animation: successFlash 0.6s ease;
        }
        
        @keyframes successFlash {
          0%, 100% { background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05)); }
          50% { background: linear-gradient(135deg, rgba(34, 197, 94, 0.4), rgba(34, 197, 94, 0.2)); }
        }

        /* Upload Drop Zone */
        .upload-drop { 
          border-radius: 20px;
          padding: 32px 24px;
          text-align: center;
          background: rgba(255, 255, 255, 0.35);
          border: 2px dashed rgba(148, 163, 184, 0.4);
          transition: all 0.3s ease;
        }
        
        .upload-drop:hover {
          background: rgba(255, 255, 255, 0.55);
          border-color: rgba(100, 116, 139, 0.6);
          transform: translateY(-2px);
        }
        
        .upload-drop img { 
          max-height: 400px !important;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        /* Modern Buttons */
        .btn { 
          padding: 16px 24px;
          border-radius: 16px;
          font-size: 16px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        
        .btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }
        
        .btn:active::before {
          width: 300px;
          height: 300px;
        }
        
        .btn-prim { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 
            0 8px 24px rgba(102, 126, 234, 0.4),
            0 4px 12px rgba(118, 75, 162, 0.3);
        }
        
        .btn-prim:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 12px 32px rgba(102, 126, 234, 0.5),
            0 6px 16px rgba(118, 75, 162, 0.4);
        }
        
        .btn-prim:active {
          transform: translateY(0);
        }
        
        .btn-muted { 
          background: rgba(255, 255, 255, 0.45);
          color: #334155;
          border: 1px solid rgba(148, 163, 184, 0.3);
        }
        
        .btn-muted:hover {
          background: rgba(255, 255, 255, 0.65);
          border-color: rgba(100, 116, 139, 0.5);
          transform: translateY(-1px);
        }
        
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        /* Floating Action Button */
        .fab {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          cursor: pointer;
          box-shadow: 
            0 8px 32px rgba(102, 126, 234, 0.5),
            0 4px 16px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1000;
        }
        
        .fab:hover {
          transform: scale(1.1) rotate(90deg);
          box-shadow: 
            0 12px 48px rgba(102, 126, 234, 0.6),
            0 6px 24px rgba(0, 0, 0, 0.3);
        }
        
        .fab:active {
          transform: scale(0.95) rotate(90deg);
        }

        /* Top Controls */
        .top-controls { 
          display: flex;
          gap: 12px;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        
        .top-controls .btn { 
          min-width: 140px;
          font-size: 15px;
        }

        /* Class List */
        .class-list { 
          max-height: 500px;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 8px;
        }
        
        .class-list::-webkit-scrollbar {
          width: 8px;
        }
        
        .class-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        
        .class-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 10px;
        }
        
        .class-list::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        
        .class-row { 
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-radius: 16px;
          margin-bottom: 12px;
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          transition: all 0.3s ease;
          cursor: pointer;
        }
        
        .class-row:hover {
          background: rgba(255, 255, 255, 0.7);
          transform: translateX(4px);
          box-shadow: 0 4px 16px rgba(148, 163, 184, 0.15);
        }
        
        .class-row .meta { 
          font-size: 13px;
          color: #64748b;
        }

        /* Info Cards */
        .info-card {
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border-radius: 20px;
          padding: 20px;
          margin-top: 16px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 4px 24px rgba(148, 163, 184, 0.1);
        }

        /* Toast Notifications */
        .toast-container {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 400px;
        }
        
        .toast {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 16px;
          padding: 16px 20px;
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.2),
            0 2px 8px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 12px;
          animation: slideInRight 0.3s ease, fadeOut 0.3s ease 4.2s;
          border-left: 4px solid;
        }
        
        .toast.success { border-left-color: #22c55e; }
        .toast.error { border-left-color: #ef4444; }
        .toast.info { border-left-color: #3b82f6; }
        
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        /* Spinner */
        .spinner { 
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid rgba(255, 255, 255, 0.2);
          border-top-color: white;
          animation: spin 0.8s linear infinite;
          display: inline-block;
          vertical-align: middle;
        }
        
        @keyframes spin { 
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .small { 
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
        }

        /* Camera/Video Elements */
        .scanner .camera,
        .scanner video,
        .scanner canvas { 
          width: 100% !important;
          height: 100% !important;
          object-fit: cover;
          border-radius: 18px;
        }

        /* Badge */
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        
        .badge.success {
          background: rgba(34, 197, 94, 0.2);
          border-color: rgba(34, 197, 94, 0.4);
          color: #22c55e;
        }
        
        .badge.warning {
          background: rgba(251, 191, 36, 0.2);
          border-color: rgba(251, 191, 36, 0.4);
          color: #fbbf24;
        }
        
        .badge.error {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
          color: #ef4444;
        }

        /* Mobile-First Responsive Design */
        @media (min-width: 768px) {
          .layout {
            grid-template-columns: 1fr 380px;
          }
          
          .glass-container {
            padding: 24px;
          }
        }

        @media (max-width: 767px) {
          .app-title {
            font-size: 22px;
            flex-wrap: wrap;
            gap: 8px;
          }
          
          /* Make offline badges stack on mobile */
          .app-title span {
            font-size: 12px !important;
            padding: 4px 10px !important;
            margin-left: 0 !important;
            white-space: nowrap;
          }
          
          .scanner {
            height: 70vh;
            min-height: 400px;
          }
          
          .btn {
            width: 100%;
            padding: 18px 24px;
          }
          
          .top-controls .btn {
            min-width: 100%;
          }
          
          .toast-container {
            left: 16px;
            right: 16px;
            max-width: none;
          }
          
          .fab {
            bottom: 16px;
            right: 16px;
            width: 56px;
            height: 56px;
          }
        }

        @media (max-width: 420px) {
          .app-title {
            font-size: 18px;
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          /* Even smaller badges on very small screens */
          .app-title span {
            font-size: 11px !important;
            padding: 3px 8px !important;
          }
          
          .scanner {
            height: 60vh;
            min-height: 350px;
          }
          
          .scanner-card {
            padding: 16px;
            border-radius: 20px;
          }
          
          .btn {
            padding: 16px 20px;
            font-size: 15px;
          }
        }

        /* Pulse Animation for Live Scanning */
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
        
        .scanning-indicator {
          position: absolute;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(34, 197, 94, 0.95);
          color: white;
          padding: 10px 20px;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 10;
          animation: pulse 2s ease-in-out infinite;
          box-shadow: 0 4px 20px rgba(34, 197, 94, 0.5);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        
        .scanning-dot {
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }

        /* Summary List */
        .summary-list {
          margin-top: 12px;
        }
        
        .summary-item {
          background: rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 10px;
          border: 1px solid rgba(255, 255, 255, 0.7);
          transition: all 0.3s ease;
        }
        
        .summary-item:hover {
          background: rgba(255, 255, 255, 0.65);
          transform: translateX(4px);
        }
  `}</style>

      {/* Flash overlay for success */}
      {flashSuccess && (
        <div 
          style={{ 
            position: 'fixed', 
            left: 0, 
            right: 0, 
            top: 0, 
            bottom: 0, 
            background: 'rgba(34, 197, 94, 0.15)', 
            pointerEvents: 'none', 
            zIndex: 9999,
            animation: 'fadeOut 0.8s ease'
          }} 
        />
      )}

      {/* Toast Container */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast ${t.type}`}>
              <span style={{ fontSize: 20 }}>
                {t.type === 'success' && '✓'}
                {t.type === 'error' && '✕'}
                {t.type === 'info' && 'ℹ'}
              </span>
              <span style={{ flex: 1, fontWeight: 600, color: '#1f2937' }}>{t.text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="glass-container">
        {/* Header */}
        <div className="app-header">
          <h1 className="app-title">
            <FaBarcode />
            TCMS Attendance Tracker
            {/* Offline/Sync Status Indicators */}
            {!isOnline && (
              <span style={{ 
                marginLeft: 16, 
                fontSize: 14, 
                fontWeight: 500,
                padding: '6px 12px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.2), rgba(249, 115, 22, 0.2))',
                border: '1px solid rgba(251, 146, 60, 0.3)',
                color: '#ea580c',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}>
                📴 Offline Mode
              </span>
            )}
            {syncInProgress && (
              <span style={{ 
                marginLeft: 16, 
                fontSize: 14, 
                fontWeight: 500,
                padding: '6px 12px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2))',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#2563eb',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}>
                🔄 Syncing...
              </span>
            )}
            {isOnline && offlineQueue.length > 0 && !syncInProgress && (
              <span style={{ 
                marginLeft: 16, 
                fontSize: 14, 
                fontWeight: 500,
                padding: '6px 12px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.2))',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#16a34a',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
              onClick={syncOfflineQueue}
              title="Click to sync now">
                📤 {offlineQueue.length} pending
              </span>
            )}
          </h1>
          <div className="app-subtitle">
            To start new session tap on the Reset Session | Today Session : {todayName || 'Loading...'}
          </div>
        </div>

        {/* Mode Toggle & Controls */}
        <div className="top-controls">
          <button 
            className={`btn ${mode === 'camera' ? 'btn-prim' : 'btn-muted'}`} 
            onClick={() => setMode('camera')}
            aria-pressed={mode === 'camera'}
          >
            <FaCamera style={{ display: 'inline', marginRight: 8 }} />
            Camera Scan
          </button>
          <button 
            className={`btn ${mode === 'image' ? 'btn-prim' : 'btn-muted'}`} 
            onClick={() => setMode('image')}
            aria-pressed={mode === 'image'}
          >
            <FaUpload style={{ display: 'inline', marginRight: 8 }} />
            Upload Image
          </button>
          <button 
            className="btn"
            onClick={() => { 
              setCounters({}); 
              successfullyMarkedRef.current = {}; 
              setMessage(null); 
              setRecentAttendance([]); // Clear recent log
              localStorage.removeItem('attendance_counters'); // Clear from storage
              localStorage.removeItem('recent_attendance_log'); // Clear from storage
              resetForNextImage(); 
              addToast('info', 'Session reset - counters and log cleared');
            }}
            style={{ 
              background: 'linear-gradient(135deg, #fb923c, #f97316)', 
              color: 'white',
              border: 'none'
            }}
          >
            Reset Session
          </button>
        </div>

        {/* Advanced Controls */}
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          justifyContent: 'center', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          marginBottom: 20,
          padding: '12px 16px',
          background: 'rgba(255, 255, 255, 0.04)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <button 
            className={`btn ${autoMark ? 'btn-prim' : 'btn-muted'}`} 
            onClick={() => setAutoMark(a => !a)} 
            aria-pressed={autoMark} 
            title="Toggle Auto-Mark"
            style={{ minWidth: 'auto', padding: '10px 16px', fontSize: 14 }}
          >
            Auto-Mark: {autoMark ? 'ON' : 'OFF'}
          </button>
          <button 
            className={`btn ${hwListening ? 'btn-prim' : 'btn-muted'}`} 
            onClick={() => setHwListening(h => !h)} 
            aria-pressed={hwListening} 
            title="Toggle hardware scanner listening"
            style={{ minWidth: 'auto', padding: '10px 16px', fontSize: 14 }}
          >
            HW Scanner: {hwListening ? 'ON' : 'OFF'}
          </button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label className="small" style={{ color: '#475569', fontWeight: 600 }}>Auto-clear:</label>
            <select 
              value={autoClearDelay} 
              onChange={e => setAutoClearDelay(parseInt(e.target.value, 10))} 
              style={{ 
                padding: '8px 12px', 
                borderRadius: 10,
                border: '1px solid rgba(148, 163, 184, 0.3)',
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: '#1e293b',
                fontWeight: 600
              }}
            >
              <option value={0}>Immediate</option>
              <option value={300}>300ms</option>
              <option value={600}>600ms</option>
              <option value={1000}>1s</option>
              <option value={1500}>1.5s</option>
            </select>
          </div>
          {/* <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label className="small" style={{ color: '#475569', fontWeight: 600 }}>Beep:</label>
            <select 
              value={successPattern} 
              onChange={e => setSuccessPattern(e.target.value)} 
              style={{ 
                padding: '8px 12px', 
                borderRadius: 10,
                border: '1px solid rgba(148, 163, 184, 0.3)',
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: '#1e293b',
                fontWeight: 600
              }}
            >
              <option value="single">Single</option>
              <option value="double">Double</option>
            </select>
          </div> */}
        </div>

        <div className="layout">
          {/* Left: Scanner Area */}
          <div className="left">
            <div className="scanner-card">
              <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 12, flex: 1 }} role="tablist" aria-label="Selection mode">
                  <button 
                    className={`btn ${selectionMode === 'today' ? 'btn-prim' : 'btn-muted'}`} 
                    onClick={() => setSelectionMode('today')} 
                    aria-pressed={selectionMode === 'today'}
                    style={{ flex: 1 }}
                  >
                    Today's Classes
                  </button>
                  <button 
                    className={`btn ${selectionMode === 'manual-single' ? 'btn-prim' : 'btn-muted'}`} 
                    onClick={() => setSelectionMode('manual-single')} 
                    aria-pressed={selectionMode === 'manual-single'}
                    style={{ flex: 1 }}
                  >
                    Manual Single
                  </button>
                  <button 
                    className={`btn ${selectionMode === 'manual-multiple' ? 'btn-prim' : 'btn-muted'}`} 
                    onClick={() => setSelectionMode('manual-multiple')} 
                    aria-pressed={selectionMode === 'manual-multiple'}
                    style={{ flex: 1 }}
                  >
                    Manual Multiple
                  </button>
                </div>
              </div>

              {selectionMode === 'manual-single' && (
                <div style={{ marginBottom: 16 }}>
                  <select 
                    value={classId} 
                    onChange={e => setClassId(e.target.value)} 
                    style={{ 
                      width: '100%', 
                      padding: 14, 
                      fontSize: 16, 
                      borderRadius: 14,
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      background: 'rgba(255, 255, 255, 0.5)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      color: '#1e293b',
                      fontWeight: 600
                    }} 
                    aria-label="Manual class select"
                  >
                    <option value="" style={{ background: '#667eea', color: 'white' }}>Select a class</option>
                    {classes.map(c => (
                      <option 
                        key={c.id} 
                        value={c.id}
                        style={{ background: '#667eea', color: 'white' }}
                      >
                        {c.id} - {c.className || c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectionMode === 'manual-multiple' && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ 
                    padding: 14, 
                    borderRadius: 14,
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    background: 'rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    maxHeight: 300,
                    overflowY: 'auto'
                  }}>
                    <div style={{ marginBottom: 8, fontWeight: 600, color: '#1e293b' }}>
                      Select Classes:
                    </div>
                    {classes.map(c => (
                      <label 
                        key={c.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '8px 0',
                          cursor: 'pointer',
                          color: '#334155'
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={selectedClasses.includes(String(c.id))}
                          onChange={e => {
                            const cid = String(c.id);
                            if (e.target.checked) {
                              setSelectedClasses([...selectedClasses, cid]);
                            } else {
                              setSelectedClasses(selectedClasses.filter(id => id !== cid));
                            }
                          }}
                          style={{ 
                            width: 18, 
                            height: 18, 
                            marginRight: 10,
                            cursor: 'pointer'
                          }}
                        />
                        <span style={{ fontWeight: 500 }}>
                          {c.id} - {c.className || c.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className={`scanner ${flashSuccess ? 'flash-success' : ''}`} aria-live="polite">
                {scanningActive && mode === 'camera' && (
                  <div className="scanning-indicator">
                    <div className="scanning-dot" />
                    <span>LIVE SCANNING</span>
                  </div>
                )}

                {mode === 'camera' ? (
                  <div id="barcode-reader" style={{ width: '100%', height: '100%' }} className="camera" />
                ) : (
                  <div 
                    onDrop={onDropFile} 
                    onDragOver={e => { e.preventDefault(); }} 
                    className="upload-drop"
                  >
                    <div style={{ fontWeight: 700, marginBottom: 12, color: '#1e293b', fontSize: 18 }}>
                      {previewFileName || '📸 Drop image or tap to upload'}
                    </div>
                    <div className="small" style={{ marginBottom: 16, color: '#475569' }}>
                      Upload a barcode image for quick attendance marking
                    </div>
                    <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}> 
                      <label 
                        htmlFor="file-input" 
                        className="btn btn-prim" 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: 10, 
                          cursor: (imageReadyToMark && !(imageAutoConfirm || autoMark)) ? 'not-allowed' : 'pointer', 
                          opacity: (imageReadyToMark && !(imageAutoConfirm || autoMark)) ? 0.6 : 1 
                        }} 
                        aria-disabled={imageReadyToMark && !(imageAutoConfirm || autoMark)}
                      >
                        <FaUpload /> 
                        {(imageReadyToMark && !(imageAutoConfirm || autoMark)) ? 'Waiting to confirm' : (imageProcessing ? 'Decoding…' : 'Choose Image')}
                      </label>
                      <input 
                        id="file-input" 
                        accept="image/png,image/jpeg,image/jpg" 
                        type="file" 
                        onChange={safeOnPickFile} 
                        style={{ display: 'none' }} 
                        disabled={(imageReadyToMark && !(imageAutoConfirm || autoMark)) || imageProcessing} 
                      />
                    </div>
                    {previewImageUrl && (
                      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
                        <img 
                          src={previewImageUrl} 
                          alt="preview" 
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: 300, 
                            borderRadius: 16, 
                            objectFit: 'cover', 
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
                            border: '2px solid rgba(255, 255, 255, 0.3)'
                          }} 
                        />
                      </div>
                    )}
                    {/* show info messages */}
                    {message && message.type === 'info' && (
                      <div className="badge" style={{ 
                        marginTop: 12, 
                        padding: '10px 16px', 
                        background: 'rgba(59, 130, 246, 0.2)', 
                        color: '#60a5fa',
                        display: 'inline-flex'
                      }}>
                        ℹ {message.text}
                      </div>
                    )}
                    {imageProcessing && (
                      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                        <span className="spinner" />
                        <span className="small" style={{ color: 'white' }}>Decoding barcode...</span>
                      </div>
                    )}
                    {message && message.type === 'error' && (
                      <div className="badge error" style={{ marginTop: 12, padding: '10px 16px', display: 'inline-flex' }}>
                        ✕ {message.text}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Student Info Card */}
              <div className="info-card">
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                  {scannedData || 'No scan yet'}
                </div>
                {studentDetails && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 18 }}>
                      {studentDetails.name || studentDetails.fullname || studentDetails.username || ''} 
                      <small style={{ color: '#64748b', marginLeft: 10, fontSize: 14 }}>
                        {studentDetails.id || studentDetails.userid || ''}
                      </small>
                    </div>
                    
                    {/* Recent attendance records */}
                    <div style={{ 
                      marginTop: 16, 
                      padding: 16, 
                      borderRadius: 16, 
                      background: 'rgba(255, 255, 255, 0.4)',
                      border: '1px solid rgba(148, 163, 184, 0.3)'
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: 12, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FaCheckCircle /> Recent Attendance 
                        {prevAttendancesLoading && <span className="spinner" aria-hidden="true" />}
                      </div>
                      <div className="summary-list">
                        {prevAttendancesLoading ? (
                          <div className="small">Loading...</div>
                        ) : prevAttendances && prevAttendances.length > 0 ? (
                          prevAttendances.slice(0, 3).map((r, idx) => (
                            <div 
                              key={idx} 
                              className="summary-item"
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                                {r.className || getClassName(r.classId) || `Class ${r.classId}`}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748b' }}>
                                {r.timestamp ? new Date(r.timestamp).toLocaleString() : (r.time || r.join_time || '')}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="small">No recent records</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview enrollment statuses for image mode */}
                {mode === 'image' && studentEnrollmentsPreview && studentEnrollmentsPreview.length > 0 && (
                  <div style={{ marginTop:10 }}>
                    <div style={{ fontWeight:700 }}>Preview</div>
                    <div className="summary-list">
                      {studentEnrollmentsPreview.map((p) => {
                        const found = classes.find(x => String(x.id) === String(p.classId));
                        const paymentStatus = p.enrollRaw?.payment_status;
                        const reason = p.enrollRaw?.reason;
                        
                        let statusText = 'Not enrolled';
                        let statusColor = '#b91c1c';
                        let statusDetail = '';
                        
                        if (p.enrolled) {
                          // Successfully enrolled cases
                          if (reason === 'free_card') {
                            statusText = 'Free Card';
                            statusColor = '#9333ea'; // Purple
                            statusDetail = 'No payment required';
                          } else if (reason === 'half_card_paid') {
                            statusText = 'Half Card';
                            statusColor = '#2563eb'; // Blue
                            statusDetail = '50% paid';
                          } else if (reason === 'within_grace_period') {
                            statusText = 'Enrolled & Paid';
                            statusColor = '#059669'; // Green
                            const daysRemaining = p.enrollRaw?.days_remaining;
                            statusDetail = daysRemaining ? `${daysRemaining} days grace` : 'Within grace period';
                          } else {
                            statusText = 'Enrolled & Paid';
                            statusColor = '#059669'; // Green
                          }
                        } else {
                          // Blocked cases
                          if (reason === 'half_payment_required') {
                            statusText = 'Half Card';
                            statusColor = '#ea580c'; // Orange
                            statusDetail = '50% payment required';
                          } else if (reason === 'grace_period_expired') {
                            statusText = 'Grace Period Expired';
                            statusColor = '#dc2626'; // Red
                            statusDetail = 'Payment required';
                          } else if (reason === 'payment_required') {
                            statusText = 'Payment Required';
                            statusColor = '#d97706'; // Amber
                          } else if (reason === 'not_enrolled') {
                            statusText = 'Not Enrolled';
                            statusColor = '#b91c1c'; // Red
                          }
                        }
                        
                        return (
                          <div key={p.classId} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0' }}>
                            <div>
                              <div style={{ fontWeight:700 }}>{found ? (found.className || found.name) : `Class ${p.classId}`}</div>
                              <div className="small">{found ? `${found.schedule_start_time || ''} - ${found.schedule_end_time || ''}` : ''}</div>
                            </div>
                            <div style={{ textAlign:'right' }}>
                              <div style={{ color: statusColor, fontWeight:700 }}>{statusText}</div>
                              {statusDetail && <div className="small" style={{ color: '#6b7280' }}>{statusDetail}</div>}
                              {paymentStatus && <div className="small" style={{ color: '#9ca3af', fontSize: '11px' }}>Status: {paymentStatus}</div>}
                              <div className="small">{p.markedInSession ? 'Marked (session)' : 'Not marked'}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop:10, display:'flex', gap:8, alignItems:'center' }}>
                      {!autoMark ? (
                        <button className="btn btn-prim" onClick={() => markAttendanceForImage()} disabled={!imageReadyToMark || imageProcessing || loading} aria-disabled={!imageReadyToMark || imageProcessing || loading}>{loading ? 'Marking…' : 'Confirm & Mark'}</button>
                      ) : (
                        <div style={{ padding: '8px 12px', borderRadius:8, background:'#ecfeff', color:'#065f46', fontWeight:700 }}>Auto‑Mark is ON — will mark automatically</div>
                      )}
                      <button className="btn btn-muted" onClick={resetForNextImage}>Reset</button>
                    </div>
                  </div>
                )}

                {message && (message.type === 'success' || message.type === 'error') && (
                  <div style={{ marginTop:10, color: message.type === 'success' ? '#059669' : '#b91c1c' }}>
                    <div style={{ fontWeight:700 }}>{message.text}</div>
                    {message.summary && <div className="summary-list">{message.summary.map((r, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', padding:'6px 0' }}>
                        <div>{r.className || getClassName(r.classId)}: <strong style={{ marginLeft:6 }}>{r.ok ? 'OK' : r.message}</strong></div>
                      </div>
                    ))}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Today's Classes */}
        <div className="right">
          <div className="scanner-card" style={{ padding: 20, marginTop: 32 }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: 16 
            }}>
              <div style={{ fontWeight: 700, fontSize: 20, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
                <FaCheckCircle />
                Today's Classes
              </div>
              <button 
                className="btn btn-muted" 
                onClick={() => setPanelOpen(p => !p)} 
                aria-expanded={panelOpen}
                style={{ 
                  minWidth: 'auto', 
                  padding: '10px 14px',
                  display: selectionMode === 'manual-single' ? 'none' : 'block'
                }}
              >
                {panelOpen ? <FaChevronUp /> : <FaChevronDown />}
              </button>
            </div>
            
            {selectionMode === 'today' && (
              <>
                <div className="badge" style={{ 
                  marginBottom: 12, 
                  fontSize: 12,
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  display: 'block',
                  width: '100%'
                }}>
                  ℹ Showing only physical & hybrid classes
                </div>
                
                {/* Debug Info */}
                <div className="badge" style={{ 
                  marginBottom: 16, 
                  fontSize: 11,
                  background: 'rgba(251, 191, 36, 0.2)',
                  color: '#fbbf24',
                  display: 'block',
                  width: '100%',
                  textAlign: 'left'
                }}>
                  <div>Today: <strong>{todayName || 'Loading...'}</strong></div>
                  <div>Total Classes: <strong>{classes.length}</strong></div>
                  <div>Today's Classes: <strong>{todaysClasses.length}</strong></div>
                </div>
              </>
            )}

            {panelOpen && selectionMode === 'today' && (
              <div className="class-list">
                {todaysClasses.length === 0 && (
                  <div style={{ 
                    color: '#64748b', 
                    textAlign: 'center',
                    padding: '32px 16px',
                    fontSize: 14
                  }}>
                    No classes scheduled for today
                  </div>
                )}
                {todaysClasses.map(c => (
                  <div 
                    key={c.id} 
                    className="class-row" 
                    onClick={() => toggleClassSelection(String(c.id), !selectedClasses.includes(String(c.id)))} 
                    role="button" 
                    tabIndex={0} 
                    onKeyDown={e => { 
                      if (e.key === 'Enter' || e.key === ' ') {
                        toggleClassSelection(String(c.id), !selectedClasses.includes(String(c.id)));
                      }
                    }}
                  >
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 14, 
                      cursor: 'pointer', 
                      flex: 1 
                    }}>
                      <input 
                        type="checkbox" 
                        checked={selectedClasses.includes(String(c.id))} 
                        onChange={e => toggleClassSelection(String(c.id), e.target.checked)} 
                        aria-label={`Select class ${c.name}`}
                        style={{
                          width: 20,
                          height: 20,
                          cursor: 'pointer',
                          accentColor: '#667eea'
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>
                          {c.className || c.name}
                        </div>
                        <div className="meta" style={{ color: '#64748b' }}>
                          {c.schedule_start_time} - {c.schedule_end_time}
                        </div>
                      </div>
                    </label>
                    <div style={{ textAlign: 'right' }}>
                      <div className="badge success" style={{ 
                        fontWeight: 700, 
                        fontSize: 18,
                        minWidth: 40,
                        justifyContent: 'center'
                      }}>
                        {counters[String(c.id)] || 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Classes for Manual Multiple Mode */}
            {selectionMode === 'manual-multiple' && (
              <>
                <div className="badge" style={{ 
                  marginBottom: 12, 
                  fontSize: 12,
                  background: 'rgba(139, 92, 246, 0.2)',
                  color: '#8b5cf6',
                  padding: 10,
                  textAlign: 'center'
                }}>
                  ℹ Selected Classes: {selectedClasses.length}
                </div>
                
                <div style={{ marginBottom: 16 }}>
                  {selectedClasses.length === 0 ? (
                    <div style={{ 
                      padding: 20, 
                      textAlign: 'center', 
                      color: '#64748b',
                      fontStyle: 'italic'
                    }}>
                      No classes selected. Use checkboxes above.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {selectedClasses.map(cid => {
                        const cls = classes.find(c => String(c.id) === cid);
                        if (!cls) return null;
                        const count = counters[cid] || 0;
                        return (
                          <div key={cid} style={{
                            padding: 16,
                            background: 'rgba(255, 255, 255, 0.6)',
                            borderRadius: 14,
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>
                                {cls.className || cls.name}
                              </div>
                              <div className="meta" style={{ color: '#64748b' }}>
                                {cls.schedule_start_time} - {cls.schedule_end_time}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div className="badge success" style={{ 
                                fontWeight: 700, 
                                fontSize: 20,
                                padding: '10px 16px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                borderRadius: 12
                              }}>
                                {count}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Recent Attendance Log */}
            {panelOpen && recentAttendance.length > 0 && (
              <div style={{ 
                marginTop: 32,
                padding: 20,
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                borderRadius: 20,
                border: '1px solid rgba(148, 163, 184, 0.2)',
                boxShadow: '0 8px 32px rgba(100, 116, 139, 0.12)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12, 
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: '2px solid rgba(148, 163, 184, 0.2)'
                }}>
                  <span style={{ fontSize: 22 }}>📊</span>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: 18, 
                    fontWeight: 800, 
                    color: '#1e293b' 
                  }}>
                    Recent Attendance
                  </h3>
                  <span style={{ 
                    marginLeft: 'auto',
                    fontSize: 13,
                    color: '#64748b',
                    fontWeight: 600
                  }}>
                    Last {recentAttendance.length} scans
                  </span>
                </div>

                <div style={{ 
                  maxHeight: 400, 
                  overflowY: 'auto',
                  overflowX: 'hidden'
                }}>
                  {recentAttendance.map((entry, idx) => {
                    const isToday = entry.displayDate === new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return (
                      <div 
                        key={entry.id} 
                        style={{
                          padding: '12px 16px',
                          marginBottom: idx < recentAttendance.length - 1 ? 8 : 0,
                          background: isToday 
                            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(22, 163, 74, 0.05))'
                            : 'rgba(255, 255, 255, 0.4)',
                          borderRadius: 12,
                          border: isToday 
                            ? '1px solid rgba(34, 197, 94, 0.2)'
                            : '1px solid rgba(148, 163, 184, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: isToday ? '#22c55e' : '#94a3b8',
                          flexShrink: 0
                        }}></div>
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontWeight: 700, 
                            color: '#1e293b', 
                            fontSize: 14,
                            marginBottom: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {entry.studentName}
                          </div>
                          <div style={{ 
                            fontSize: 12, 
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap'
                          }}>
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {entry.className}
                            </span>
                            <span>•</span>
                            <span>{entry.method === 'barcode' ? '📸' : '🖼️'} {entry.method}</span>
                          </div>
                        </div>

                        <div style={{ 
                          textAlign: 'right',
                          flexShrink: 0
                        }}>
                          <div style={{ 
                            fontSize: 13, 
                            fontWeight: 700, 
                            color: '#475569' 
                          }}>
                            {entry.displayTime}
                          </div>
                          <div style={{ 
                            fontSize: 11, 
                            color: '#94a3b8',
                            marginTop: 2
                          }}>
                            {entry.displayDate}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {recentAttendance.length >= 50 && (
                  <div style={{
                    marginTop: 12,
                    textAlign: 'center',
                    fontSize: 12,
                    color: '#94a3b8',
                    fontStyle: 'italic'
                  }}>
                    Showing last 50 entries
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeAttendanceScanner;

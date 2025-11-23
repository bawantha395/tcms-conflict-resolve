import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import studentSidebarSections from '../StudentDashboardSidebar';
import { getUserData } from '../../../../api/apiUtils';
import { downloadStudyPackDocument } from '../../../../api/studyPacks';

const TEACHER_API = process.env.REACT_APP_TEACHER_API_BASE_URL || 'http://localhost:8088';

const normalizeArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
};

const StudyPackDetail = () => {
  // Dynamic watermark video component
  const WatermarkedVideo = ({ src, studentId }) => {
    const [t, setT] = useState(0); // 0..1 progress along perimeter
    const vidRef = useRef(null);
    const intervalRef = useRef(null);
    const containerRef = useRef(null);
    const [isFs, setIsFs] = useState(false);

    const start = () => {
      if (intervalRef.current) return; // already running 
      intervalRef.current = setInterval(() => {
        setT((prev) => (prev + 0.02) % 1); // full loop ~10s (0.02 step at 200ms)
      }, 200);
    };
    const stop = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    useEffect(() => {
      const v = vidRef.current;
      if (!v) return;
      const handlePlay = () => start();
      const handlePause = () => stop();
      const handleEnded = () => stop();
      v.addEventListener('play', handlePlay);
      v.addEventListener('pause', handlePause);
      v.addEventListener('ended', handleEnded);
      const onFsChange = () => {
        setIsFs(document.fullscreenElement === containerRef.current);
      };
      document.addEventListener('fullscreenchange', onFsChange);
      return () => {
        stop();
        v.removeEventListener('play', handlePlay);
        v.removeEventListener('pause', handlePause);
        v.removeEventListener('ended', handleEnded);
        document.removeEventListener('fullscreenchange', onFsChange);
      };
    }, []);

    // Compute position along border with asymmetric padding (extra right side space)
    const computePos = (tt) => {
      const padTop = 6;
      const padBottom = 6;
      const padLeft = 6;
      const padRight = 20; // extra padding on right edge
      const spanTop = 100 - padLeft - padRight; // horizontal travel length along top/bottom
      const spanSide = 100 - padTop - padBottom; // vertical travel length along sides
      const u = ((tt % 1) + 1) % 1;
      const seg = Math.floor(u * 4); // 0 top,1 right,2 bottom,3 left
      const segT = (u * 4) - seg;
      let top, left;
      switch (seg) {
        case 0: // top L->R
          top = padTop;
          left = padLeft + segT * spanTop;
          break;
        case 1: // right T->B
          top = padTop + segT * spanSide;
          left = 100 - padRight;
          break;
        case 2: // bottom R->L
          top = 100 - padBottom;
          left = 100 - padRight - segT * spanTop;
          break;
        default: // left B->T
          top = 100 - padBottom - segT * spanSide;
          left = padLeft;
      }
      return { top: `${top}%`, left: `${left}%` };
    };

    const pos = computePos(t);

    const toggleFullscreen = async () => {
      try {
        if (!document.fullscreenElement && containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch (_) {}
    };

    return (
      <div
        ref={containerRef}
        className={isFs ? 'relative group bg-black flex items-center justify-center' : 'relative group'}
      >
        <video
          ref={vidRef}
          controls
          className={isFs ? 'w-full h-screen max-h-screen object-contain' : 'w-full rounded border'}
          src={src}
          controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
        />
        {/* Custom Fullscreen Toggle */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute top-2 right-2 z-20 px-2 py-1 text-[11px] bg-black/50 text-white rounded hover:bg-black/70"
        >
          {isFs ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
        <div
          className="pointer-events-none select-none absolute text-xs sm:text-sm md:text-base font-semibold text-white/70 drop-shadow-md tracking-wider"
          style={{
            top: pos.top,
            left: pos.left,
            transition: 'top 0.2s linear,left 0.2s linear',
            opacity: 0.9,
            transform: 'rotate(-12deg)'
          }}
        >
          {studentId}
        </div>
        {/* Large faint tiled background watermark layer */}
        <div className="pointer-events-none absolute inset-0 opacity-5 flex flex-wrap content-center justify-center">
          <span className="text-4xl md:text-6xl font-black text-white/60 mix-blend-overlay" style={{transform:'rotate(-25deg)'}}>{studentId}</span>
        </div>
      </div>
    );
  };

  // removed external fullscreen overlay (we fullscreen the container instead)
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [pack, setPack] = useState(location.state?.pack || null);
  const [loading, setLoading] = useState(!location.state?.pack);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id) { setError('Missing study pack id'); setLoading(false); return; }
      try {
        setLoading(true);
        const res = await fetch(`${TEACHER_API}/routes.php/study_pack?id=${encodeURIComponent(id)}`);
        const json = await res.json();
        if (json?.success && json?.data) {
          setPack(json.data);
        } else {
          setError(json?.message || 'Failed to load study pack');
        }
      } catch (e) {
        setError(e?.message || 'Network error');
      } finally {
        setLoading(false);
      }
    };
    if (!pack) load();
  }, [id]);

  const videos = useMemo(() => normalizeArray(pack?.videos), [pack]);
  const documents = useMemo(() => normalizeArray(pack?.documents), [pack]);
  const links = useMemo(() => normalizeArray(pack?.links), [pack]);

  const fileUrl = (p) => {
    if (!p) return '#';
    // If backend returns absolute URL, use as-is; else prefix teacher API origin
    return /^(http|https):\/\//i.test(p) ? p : `${TEACHER_API}${p}`;
  };

  const userData = getUserData();
  const studentIdForWatermark = userData?.userid || userData?.userId || 'STUDENT';

  const handleDownload = async (path, name) => {
    if (!path) return;
    const url = fileUrl(path);
    const targetOrigin = new URL(url, window.location.origin).origin;
    const sameOrigin = targetOrigin === window.location.origin;

    // Cross-origin: open in a new tab (no CORS needed)
    if (!sameOrigin) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }

    // Same-origin: fetch and force a download filename
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
      const extGuess = path.split('.').pop().split('?')[0];
  const baseName = (name || 'file');
  const safeName = `${baseName}_SID_${studentIdForWatermark}` + (extGuess && !baseName.toLowerCase().endsWith(extGuess.toLowerCase()) ? `.${extGuess}` : '');
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    } catch (e) {
      console.error('Download failed, opening in new tab as fallback:', e);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  // Study pack PDF download (server-side security may be applied; client no longer injects watermark)
  const handleSecurePdfDownload = async (doc) => {
    const user = getUserData();
    if (!user || !user.userid) {
      alert('Please log in to download documents');
      return;
    }
    try {
      // Backend should embed watermark and set open password = studentId
      const studentName = user.fullname || user.fullName || user.name || user.firstName || user.username || 'Student';
      const blob = await downloadStudyPackDocument(doc.id, user.userid, studentName);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (doc.title || 'document') + '.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download secured PDF:', e);
      // Fallback: download the original PDF without watermark/password
      try {
        if (!doc.file_path) throw new Error('Missing file path for document');
        await handleDownload(doc.file_path, doc.title || 'document');
      } catch (fallbackErr) {
        console.error('Fallback download failed:', fallbackErr);
        alert('Download failed. Please try again later.');
      }
    }
  };

  return (
    <DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
      <div className="p-2 sm:p-4 md:p-6 max-w-6xl mx-auto">
        {loading ? (
          <div className="text-center text-gray-500 mt-10">Loading study pack...</div>
        ) : error ? (
          <div className="text-center text-red-600 mt-10">{error}</div>
        ) : !pack ? (
          <div className="text-center text-gray-500 mt-10">Study pack not found.</div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <img src={pack.image || '/assets/nfts/Nft3.png'} alt={pack.title} className="w-24 h-24 rounded object-cover border" />
              <div className="flex-1">
                <h1 className="text-xl font-bold">{pack.title}</h1>
                <div className="text-sm text-gray-600 mt-1">{pack.teacher_name || pack.teacher_id}</div>
                <div className="text-sm text-gray-500 mt-1">{pack.subject || 'Study Pack'}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">LKR {Number(pack.price || 0).toLocaleString()}</div>
                <button
                  onClick={() => navigate('/student/studypacks')}
                  className="mt-2 px-4 py-2 text-sm bg-gray-800 text-white rounded hover:bg-black"
                >
                  Back to My Study Packs
                </button>
              </div>
            </div>

            {/* Description */}
            {pack.description && (
              <div className="bg-white rounded border p-4 mb-6">
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{pack.description}</div>
              </div>
            )}

            {/* Videos */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-3">Videos</h2>
              {videos.length === 0 ? (
                <div className="text-sm text-gray-500">No videos uploaded.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {videos.map((v) => (
                    <div key={v.id} className="bg-white border rounded p-3 relative overflow-hidden">
                      <div className="font-medium mb-2 text-sm">{v.title || 'Video'}</div>
                      <WatermarkedVideo src={fileUrl(v.file_path)} studentId={studentIdForWatermark} />
                      <div className="mt-2 flex justify-end">
                        {/* <button
                          type="button"
                          onClick={() => handleDownload(v.file_path, v.title || 'video')}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Download
                        </button> */}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documents */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-3">Documents</h2>
              {documents.length === 0 ? (
                <div className="text-sm text-gray-500">No documents uploaded.</div>
              ) : (
                <div className="bg-white border rounded">
                  {documents.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-3 border-b last:border-b-0 relative">
                      <div className="text-sm z-10">{d.title || 'Document'}</div>
                      {/* Watermark background
                      <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center opacity-5">
                        <span className="text-4xl font-bold text-gray-700" style={{transform:'rotate(-30deg)'}}>{studentIdForWatermark}</span>
                      </div> */}
                      <div className="z-10 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSecurePdfDownload(d)}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          title="Download PDF"
                        >
                          Download
                        </button>
                        {/* <button
                          type="button"
                          onClick={() => handleDownload(d.file_path, d.title || 'document')}
                          className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                          title="Open original file (no password)"
                        >
                          Open Original
                        </button> */}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Links */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-3">Links</h2>
              {links.length === 0 ? (
                <div className="text-sm text-gray-500">No links added.</div>
              ) : (
                <div className="bg-white border rounded">
                  {links.map((l) => (
                    <a
                      key={l.id}
                      href={l.link_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50"
                    >
                      <div className="text-sm truncate mr-3">{l.link_title || l.link_url}</div>
                      <div className="text-xs text-blue-600">Open</div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudyPackDetail;

import React, { useState, useRef, useEffect } from 'react';
import { FaTimes, FaStop, FaPlay, FaBarcode } from 'react-icons/fa';
import Quagga from '@ericblade/quagga2';

// Modern scanner component using html5-qrcode. Falls back to HID (keyboard) input.
// Props: onScan(decodedText), onClose(), className (label), classId (used for display only)
const BarcodeScanner = ({ onScan, onClose, className, classId }) => {
  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const containerIdRef = useRef(`barcode-reader-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef(null);
  const lastScannedRef = useRef('');
  const lastScanTimeRef = useRef(0);
  const inputRef = useRef(null);
  const [detailedError, setDetailedError] = useState('');
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [manualInput, setManualInput] = useState('');
  const SCAN_COOLDOWN_MS = 1500;

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.06, ctx.currentTime);
      o.start();
      o.stop(ctx.currentTime + 0.12);
    } catch {}
  };

  useEffect(() => {}, []);

  // Auto-focus the manual input field when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 500); // Small delay to ensure modal is fully rendered
    return () => clearTimeout(timer);
  }, []);

  // Load available cameras
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vids = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(vids);
        if (!selectedDeviceId && vids.length > 0) {
          setSelectedDeviceId(vids[0].deviceId);
        }
      } catch {}
    };
    loadDevices();
  }, []);

  // Start/stop camera scanner with Quagga (Code128/QR capable)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isScanning) return;
      try {
        // Ask for permission early to present prompt
        try {
          const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
          tmp.getTracks().forEach(t => t.stop());
        } catch (permErr) {
          setError('Camera permission denied. Please allow access and retry.');
          setDetailedError(String(permErr?.message || permErr || ''));
          return;
        }
        if (cancelled) return;
        const target = document.getElementById(containerIdRef.current);
        if (!target) return;
        target.innerHTML = '';
        const config = {
          inputStream: {
            name: 'Live',
            type: 'LiveStream',
            target,
            constraints: selectedDeviceId ? { deviceId: selectedDeviceId } : { facingMode: 'environment' }
          },
          locator: { patchSize: 'medium', halfSample: true },
          numOfWorkers: navigator.hardwareConcurrency || 2,
          decoder: {
            readers: [ 'code_128_reader', 'ean_reader', 'ean_8_reader', 'code_39_reader', 'upc_reader' ]
          },
          locate: true
        };
        await Quagga.init(config);
        if (cancelled) return;
        Quagga.start();
        scannerRef.current = Quagga;
        Quagga.onDetected((data) => {
          const code = data?.codeResult?.code;
          const now = Date.now();
          if (!code) return;
          if (code === lastScannedRef.current && now - lastScanTimeRef.current < SCAN_COOLDOWN_MS) return;
          if (now - lastScanTimeRef.current < SCAN_COOLDOWN_MS) return;
          lastScannedRef.current = code;
          lastScanTimeRef.current = now;
          setScanResult(code);
          playBeep();
          if (typeof onScan === 'function') onScan(code);
        });
        // Keep HID input focused for wedge scanners
        setTimeout(() => { try { inputRef.current?.focus(); } catch {} }, 0);
      } catch (e) {
        setError('Camera initialization failed. Check permissions or use manual input.');
        setDetailedError(String(e?.message || e || ''));
      }
    })();
    return () => {
      cancelled = true;
      try {
        Quagga.offDetected();
        Quagga.stop();
      } catch {}
      scannerRef.current = null;
    };
  }, [isScanning, selectedDeviceId]);

  const handleManualInput = (e) => {
    if (e.key !== 'Enter') return;
    const value = manualInput.trim();
    if (!value) return;
    setScanResult(value);
    playBeep();
    if (typeof onScan === 'function') onScan(value);
    setManualInput('');
  };

  return (
    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <style>{`
        @keyframes scanline { 0% { top: 5%; } 50% { top: 85%; } 100% { top: 5%; } }
      `}</style>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Barcode Scanner</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <FaTimes />
        </button>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Class: <strong>{className}</strong>
      </p>

      <div id={containerIdRef.current} className="w-full relative h-60 overflow-hidden rounded bg-black">
        {/* animated scan line */}
        <div style={{ position: 'absolute', left: '5%', right: '5%', height: '2px', background: 'rgba(255,0,0,0.7)', animation: 'scanline 2.2s linear infinite', zIndex: 2 }} />
        {!isScanning && (
          <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
            <div className="text-center text-gray-500"><FaBarcode className="mx-auto mb-2"/>Camera not active</div>
          </div>
        )}
      </div>

      <div className="mt-3">
        {videoDevices.length > 0 && (
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Camera</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                // restart if currently scanning
                if (isScanning) {
                  setIsScanning(false);
                  setTimeout(() => setIsScanning(true), 50);
                }
              }}
            >
              {videoDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(-4)}`}</option>
              ))}
            </select>
          </div>
        )}
        <label className="block text-sm font-medium text-gray-700 mb-2">Or enter barcode manually:</label>
        <input
          type="text"
          placeholder="Enter barcode data and press Enter"
          className="w-full border rounded px-3 py-2"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={handleManualInput}
          ref={inputRef}
        />
      </div>

      <div className="flex gap-2 mt-4">
        {!isScanning ? (
          <button onClick={() => { setError(null); setIsScanning(true); }} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2">
            <FaPlay /> Start Scanning
          </button>
        ) : (
          <button onClick={() => setIsScanning(false)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-2">
            <FaStop /> Stop Scanning
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-100 text-red-800 rounded">
          {error}
          {detailedError && (
            <div className="mt-1 text-xs text-red-700 break-all">{detailedError}</div>
          )}
          <div className="mt-2 flex gap-2">
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => { setError(null); setDetailedError(''); setIsScanning(true); }}
            >
              Retry Camera
            </button>
            <a
              href="https://support.google.com/chrome/answer/2693767"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-gray-800"
            >
              Camera Permission Help
            </a>
          </div>
        </div>
      )}

      {scanResult && (
        <div className="mt-3 p-3 bg-green-100 text-green-800 rounded">
          <strong>Last scanned:</strong> {scanResult}
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner; 
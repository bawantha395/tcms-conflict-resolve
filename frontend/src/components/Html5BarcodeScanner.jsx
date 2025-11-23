import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { FaTimes } from 'react-icons/fa';

// Minimal Html5 Qrcode scanner wrapper for barcode scanning
// Props: onScan(code), onClose()
const Html5BarcodeScanner = ({ onScan, onClose, width = 320 }) => {
  const containerRef = useRef(null);
  const scannerRef = useRef(null);
  const successBeep = useRef(typeof window !== 'undefined' ? new window.Audio('/assets/success-beep.mp3') : { play: () => {} });
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const elementId = `html5-scanner-${Math.random().toString(36).slice(2)}`;
    if (!containerRef.current) return;
    containerRef.current.id = elementId;

    const config = {
      fps: 10,
      qrbox: { width: Math.min(width, 360), height: Math.min(width, 160) },
      // verbose: false,
    };

    let initTimeout = null;
    let pollInterval = null;
    const initScanner = () => {
      if (!mounted || !containerRef.current) return;
      try {
        const scanner = new Html5QrcodeScanner(elementId, config, /* verbose */ false);
        scannerRef.current = scanner;
        scanner.render((decodedText, decodedResult) => {
          if (!mounted) return;
          try {
            // play beep (best-effort) like attendance scanner
            try {
              if (successBeep.current && typeof successBeep.current.play === 'function') {
                successBeep.current.play().catch(() => {});
              }
            } catch (be) {
              // ignore
            }
            if (typeof onScan === 'function') onScan(decodedText);
          } catch (e) {
            console.warn('onScan handler failed', e);
          }
        }, (err) => {
          // per-frame scan errors are expected; ignore
        });
      } catch (e) {
        console.error('Html5BarcodeScanner initialization failed', e);
        setError(String(e?.message || e));
      }
    };

    // Wait until the container is visible / has size before initializing the scanner.
    // This helps when the scanner is rendered inside a modal which may not be immediately
    // measured by the browser.
    const waitForVisibleAndInit = () => {
      try {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && el.offsetParent !== null) {
          initScanner();
        } else {
          // poll for visibility for up to ~1s
          let elapsed = 0;
          pollInterval = setInterval(() => {
            if (!mounted) return;
            const r = el.getBoundingClientRect();
            elapsed += 50;
            if (r.width > 0 && r.height > 0 && el.offsetParent !== null) {
              clearInterval(pollInterval); pollInterval = null;
              initScanner();
            } else if (elapsed >= 1000) {
              clearInterval(pollInterval); pollInterval = null;
              // fallback: try initializing once anyway
              initScanner();
            }
          }, 50);
        }
      } catch (e) {
        // fallback to immediate init on unexpected errors
        initScanner();
      }
    };

    // small delay to allow parent modal render/animation to complete
    initTimeout = setTimeout(waitForVisibleAndInit, 80);

    return () => {
      mounted = false;
      try {
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
        if (initTimeout) { clearTimeout(initTimeout); initTimeout = null; }
        if (scannerRef.current) {
          // Html5QrcodeScanner#clear returns a promise
          scannerRef.current.clear().catch((err) => { console.warn('Failed to clear scanner', err); });
          scannerRef.current = null;
        }
      } catch (e) { console.warn('Error during scanner cleanup', e); }
    };
  }, [onScan, width]);

  return (
    <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold">Camera Scanner</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><FaTimes /></button>
      </div>
      {error && <div className="p-3 bg-red-100 text-red-800 rounded mb-3">{error}</div>}
      <div ref={containerRef} style={{ width: '100%' }} />
      <div className="text-sm text-slate-600 mt-3">Point the camera at a barcode. Scanner will auto-detect and return the code.</div>
    </div>
  );
};

export default Html5BarcodeScanner;

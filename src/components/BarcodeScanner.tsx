import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Loader2, CheckCircle2, AlertCircle, Zap, ZapOff } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  scanResult: { type: 'success' | 'error'; message: string } | null;
  onClearResult: () => void;
}

export default function BarcodeScanner({ onScan, onClose, scanResult, onClearResult }: BarcodeScannerProps) {
  const [error, setError] = useState<string>('');
  const [isStarting, setIsStarting] = useState(true);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const isMountedRef = useRef(true);
  const onScanRef = useRef(onScan);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioCtx = audioCtxRef.current;
      
      const play = () => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        // Supermarket style: Higher frequency (1200Hz - 1500Hz)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); 
        
        // Louder volume
        gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.08);
      };

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(play);
      } else {
        play();
      }
    } catch (e) {
      console.warn("Could not play beep sound", e);
    }
  }, []);

  const toggleFlash = async () => {
    if (!scannerRef.current || !hasFlash) return;
    
    try {
      const newFlashState = !isFlashOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: newFlashState } as any]
      });
      setIsFlashOn(newFlashState);
    } catch (err) {
      console.error("Error toggling flash", err);
    }
  };

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    isProcessingRef.current = !!scanResult;
  }, [scanResult]);

  useEffect(() => {
    isMountedRef.current = true;
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      // Small delay to allow modal transition to complete
      await new Promise(resolve => setTimeout(resolve, 400));
      if (!isMountedRef.current) return;

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 15, // Slightly lower FPS for better stability on mobile
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdge * 0.75);
              return {
                width: qrboxSize,
                height: qrboxSize * 0.55 // Optimized for barcodes
              };
            },
            aspectRatio: 1.0,
            disableFlip: true // Barcodes don't need flipping
          },
          (decodedText) => {
            if (!isProcessingRef.current && isMountedRef.current) {
              isProcessingRef.current = true;
              playBeep();
              onScanRef.current(decodedText);
            }
          },
          () => {} // Ignore errors
        );
        if (isMountedRef.current) {
          setIsStarting(false);
          
          // Check for flash support
          try {
            const track = (html5QrCode as any).getRunningTrack();
            if (track) {
              const capabilities = track.getCapabilities() as any;
              if (capabilities.torch) {
                setHasFlash(true);
              }
            }
          } catch (e) {
            console.warn("Flash capability check failed", e);
          }
        }
      } catch (err) {
        if (isMountedRef.current) {
          console.error("Error starting camera", err);
          setError("Không thể khởi động camera. Vui lòng cấp quyền truy cập camera.");
          setIsStarting(false);
        }
      }
    };

    startScanner();

    return () => {
      isMountedRef.current = false;
      if (scannerRef.current) {
        const currentScanner = scannerRef.current;
        // Immediate stop attempt
        if (currentScanner.isScanning) {
          currentScanner.stop().then(() => {
            currentScanner.clear();
          }).catch(e => {
            console.warn("Scanner stop error (expected if already stopped):", e);
          });
        }
      }
    };
  }, []); // Empty dependency array means it only runs once on mount

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative border border-white/20">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
            <h3 className="text-lg font-bold text-slate-800">Quét mã vạch</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 relative min-h-[350px] flex flex-col items-center justify-center bg-slate-50">
          {isStarting && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 rounded-b-3xl">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                </div>
              </div>
              <p className="text-sm font-medium text-slate-600">Đang tối ưu camera...</p>
              <p className="text-xs text-slate-400 mt-1">Vui lòng đợi trong giây lát</p>
            </div>
          )}
          
          {scanResult && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md p-8 text-center rounded-b-3xl animate-in fade-in zoom-in duration-300">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${scanResult.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {scanResult.type === 'success' ? (
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-12 h-12 text-red-500" />
                )}
              </div>
              <h4 className={`text-2xl font-bold mb-3 ${scanResult.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                {scanResult.type === 'success' ? 'Đã nhận diện!' : 'Không nhận diện được'}
              </h4>
              <p className="text-slate-600 mb-10 font-medium text-lg leading-relaxed">{scanResult.message}</p>
              <div className="flex gap-4 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 px-6 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                >
                  Đóng
                </button>
                <button
                  onClick={onClearResult}
                  className="flex-1 py-4 px-6 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                >
                  Quét tiếp
                </button>
              </div>
            </div>
          )}

          {error ? (
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-slate-800 font-bold mb-2">Lỗi Camera</p>
              <p className="text-slate-500 text-sm mb-8">{error}</p>
              <button 
                onClick={onClose} 
                className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
              >
                Quay lại
              </button>
            </div>
          ) : (
            <div className="w-full relative">
              <div id="reader" className="w-full overflow-hidden rounded-2xl border-2 border-slate-200 bg-black shadow-inner"></div>
              
              {/* Custom Scanner Overlay */}
              {!scanResult && !isStarting && (
                <>
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[75%] h-[45%] border-2 border-white/20 rounded-3xl relative overflow-hidden bg-indigo-500/5 backdrop-blur-[1px]">
                      {/* Corner accents - Modern Indigo style */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-[6px] border-l-[6px] border-indigo-600 rounded-tl-2xl" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-[6px] border-r-[6px] border-indigo-600 rounded-tr-2xl" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[6px] border-l-[6px] border-indigo-600 rounded-bl-2xl" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[6px] border-r-[6px] border-indigo-600 rounded-br-2xl" />
                      
                      {/* Scanning line animation - Professional Glow */}
                      <div className="absolute left-0 w-full h-1 z-10 animate-scan-line">
                        <div className="w-full h-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_25px_rgba(99,102,241,1),0_0_10px_rgba(99,102,241,0.8)]" />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[40px] bg-gradient-to-b from-indigo-500/20 to-transparent blur-md" />
                      </div>

                      {/* Subtle grid pattern for high-tech feel */}
                      <div className="absolute inset-0 opacity-10 pointer-events-none" 
                           style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                    </div>
                  </div>

                  {/* Flashlight Button */}
                  {hasFlash && (
                    <button
                      onClick={toggleFlash}
                      className={`absolute bottom-4 right-4 p-3 rounded-full shadow-lg transition-all active:scale-90 ${
                        isFlashOn ? 'bg-yellow-400 text-white' : 'bg-black/50 text-white/80'
                      } pointer-events-auto`}
                    >
                      {isFlashOn ? <Zap className="w-6 h-6" /> : <ZapOff className="w-6 h-6" />}
                    </button>
                  )}
                </>
              )}

              <div className="mt-6 flex flex-col items-center gap-2">
                <p className="text-center text-sm font-medium text-slate-600">
                  Đưa mã vạch vào khung hình
                </p>
                <div className="flex items-center gap-1.5 py-1 px-3 bg-indigo-50 rounded-full">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Auto Focus Active</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scan-line {
          0% { top: 0%; opacity: 0.5; }
          50% { opacity: 1; }
          100% { top: 100%; opacity: 0.5; }
        }
        .animate-scan-line {
          animation: scan-line 2.5s ease-in-out infinite alternate;
        }
        #reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
          border-radius: 1rem;
        }
      `}</style>
    </div>
  );
}


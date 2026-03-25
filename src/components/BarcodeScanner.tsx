import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Loader2, CheckCircle2, AlertCircle, Zap, ZapOff, Camera, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); 
        
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

      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
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
      await new Promise(resolve => setTimeout(resolve, 300));
      if (!isMountedRef.current) return;

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 20,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const width = viewfinderWidth * 0.8;
              const height = width * 0.5;
              return { width, height };
            },
            aspectRatio: 1.0,
            disableFlip: true
          },
          (decodedText) => {
            if (!isProcessingRef.current && isMountedRef.current) {
              isProcessingRef.current = true;
              playBeep();
              onScanRef.current(decodedText);
            }
          },
          () => {} 
        );
        if (isMountedRef.current) {
          setIsStarting(false);
          
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
        if (currentScanner.isScanning) {
          currentScanner.stop().then(() => {
            currentScanner.clear();
          }).catch(e => {
            console.warn("Scanner stop error:", e);
          });
        }
      }
    };
  }, [playBeep]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden">
      {/* Camera Viewport */}
      <div className="relative flex-1 bg-black overflow-hidden">
        <div id="reader" className="absolute inset-0 w-full h-full"></div>
        
        {/* Overlay Masks */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="absolute inset-0 bg-black/60" style={{
            maskImage: 'radial-gradient(ellipse 80% 40% at 50% 50%, transparent 100%, black 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 40% at 50% 50%, transparent 100%, black 100%)',
          }} />
          
          {/* Scanning Frame */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[80%] aspect-[2/1] relative">
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl" />
              
              {/* Scanning Line */}
              {!scanResult && !isStarting && (
                <motion.div 
                  initial={{ top: '0%' }}
                  animate={{ top: '100%' }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-0.5 bg-indigo-400 shadow-[0_0_15px_rgba(99,102,241,1)] z-20"
                />
              )}
            </div>
          </div>
        </div>

        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-30 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">Quét mã vạch</h3>
              <p className="text-white/60 text-xs font-medium">Căn chỉnh mã vào khung hình</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 text-white active:scale-90 transition-transform"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Loading State */}
        {isStarting && !error && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
            <p className="text-white font-medium">Đang khởi động camera...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 p-8 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h4 className="text-white text-xl font-bold mb-2">Lỗi Camera</h4>
            <p className="text-white/60 mb-8">{error}</p>
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-white text-black rounded-full font-bold active:scale-95 transition-transform"
            >
              Quay lại
            </button>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-8 z-30 pb-[env(safe-area-inset-bottom)]">
          {hasFlash && (
            <button
              onClick={toggleFlash}
              className={`w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all active:scale-90 ${
                isFlashOn 
                  ? 'bg-yellow-400 border-yellow-300 text-black shadow-[0_0_30px_rgba(250,204,21,0.4)]' 
                  : 'bg-white/10 border-white/20 text-white'
              }`}
            >
              {isFlashOn ? <Zap className="w-8 h-8 fill-current" /> : <ZapOff className="w-8 h-8" />}
            </button>
          )}
          
          <div className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Auto-Focus Active</span>
          </div>
        </div>
      </div>

      {/* Result Modal */}
      <AnimatePresence>
        {scanResult && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-x-0 bottom-0 z-50 bg-white rounded-t-[2.5rem] p-8 shadow-[0_-20px_50px_rgba(0,0,0,0.3)]"
          >
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
            
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                scanResult.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
              }`}>
                {scanResult.type === 'success' ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900 leading-tight">
                  {scanResult.type === 'success' ? 'Đã nhận diện' : 'Lỗi nhận diện'}
                </h4>
                <p className="text-slate-500 text-sm font-medium">Kết quả quét mã vạch</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-100">
              <p className="text-slate-800 font-bold text-lg break-all">{scanResult.message}</p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-4 px-6 bg-slate-100 text-slate-600 rounded-2xl font-bold active:scale-95 transition-transform"
              >
                Đóng
              </button>
              <button
                onClick={onClearResult}
                className="flex-[2] py-4 px-6 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Quét tiếp
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        #reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
        #reader {
          background: black;
        }
      `}</style>
    </div>
  );
}


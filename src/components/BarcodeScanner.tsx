import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Loader2, CheckCircle2, AlertCircle, Zap, ZapOff, Scan, Maximize, Minimize, RefreshCw } from 'lucide-react';
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
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [cameraInfo, setCameraInfo] = useState<string>('');
  const [cameras, setCameras] = useState<any[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
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

        // Professional beep: 1000Hz, short decay
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); 
        
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
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

  const restartScanner = useCallback(async (cameraIndex?: number) => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.warn("Stop error during restart:", e);
      }
    }
    
    setIsStarting(true);
    setError('');
    setIsFlashOn(false);
    setHasFlash(false);
    
    const html5QrCode = scannerRef.current || new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    try {
      let backCameras = cameras;
      if (cameras.length === 0) {
        const allCameras = await Html5Qrcode.getCameras();
        // Filter for back/rear cameras only
        backCameras = allCameras.filter(c => 
          c.label.toLowerCase().includes('back') || 
          c.label.toLowerCase().includes('rear') ||
          c.label.toLowerCase().includes('camera 0') ||
          c.label.toLowerCase().includes('environment')
        );
        
        // Fallback to all cameras if no "back" label found (some browsers don't provide labels until permission)
        if (backCameras.length === 0) backCameras = allCameras;
        setCameras(backCameras);
      }

      // Optimized configuration for barcodes - focus on performance
      const config = {
        fps: 15, // Lower FPS reduces CPU load and lag on mobile
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // Narrower box for barcodes to focus processing power
          const width = Math.floor(viewfinderWidth * 0.8);
          const height = Math.floor(width / 2.5);
          return { width, height };
        },
        aspectRatio: 1.7777777778, // 16:9
        disableFlip: true,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        // Request a reasonable resolution to avoid lag from high-res processing
        videoConstraints: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          facingMode: "environment"
        }
      };

      const targetIndex = cameraIndex !== undefined ? cameraIndex : currentCameraIndex;
      const cameraSource = backCameras.length > 0 
        ? { deviceId: backCameras[targetIndex].id } 
        : { facingMode: "environment" };

      await html5QrCode.start(
        cameraSource,
        config,
        (decodedText) => {
          if (!isProcessingRef.current && isMountedRef.current) {
            isProcessingRef.current = true;
            playBeep();
            if ('vibrate' in navigator) {
              navigator.vibrate(50);
            }
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
            if (capabilities.torch) setHasFlash(true);
            
            // Critical for barcode: Continuous focus
            if (capabilities.focusMode?.includes('continuous')) {
              await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
            }
            
            const settings = track.getSettings();
            setCameraInfo(`${settings.width}x${settings.height}`);
          }
        } catch (e) {
          console.warn("Capability optimization failed", e);
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error("Error starting camera", err);
        setError("Không thể khởi động camera sau. Vui lòng kiểm tra quyền truy cập.");
        setIsStarting(false);
      }
    }
  }, [playBeep, cameras, currentCameraIndex]);

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    restartScanner(nextIndex);
  };

  useEffect(() => {
    isMountedRef.current = true;
    restartScanner();

    return () => {
      isMountedRef.current = false;
      if (scannerRef.current) {
        const currentScanner = scannerRef.current;
        if (currentScanner.isScanning) {
          currentScanner.stop().catch(e => console.warn("Scanner stop error:", e));
        }
      }
    };
  }, []); // Only run once on mount

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 sm:p-4 md:p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`bg-slate-900 ${isFullScreen ? 'w-full h-full sm:rounded-[2.5rem]' : 'w-full max-w-md rounded-[2.5rem]'} overflow-hidden shadow-2xl relative flex flex-col border border-white/5`}
      >
        {/* Success Flash Effect */}
        <AnimatePresence>
          {scanResult?.type === 'success' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0] }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-white z-40 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Header - Glassmorphism */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-[2px]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 backdrop-blur-xl rounded-2xl border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
              <Scan className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Jelly Scoop</h3>
              <div className="flex items-center gap-1.5">
                <motion.div 
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]" 
                />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">AI Engine Active</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="hidden sm:flex p-3 bg-white/5 backdrop-blur-xl text-white/70 hover:text-white hover:bg-white/15 rounded-2xl transition-all active:scale-90 border border-white/10"
            >
              {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-3 bg-white/5 backdrop-blur-xl text-white/70 hover:text-white hover:bg-white/15 rounded-2xl transition-all active:scale-90 border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scanner Area */}
        <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
          {isStarting && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-10">
              <div className="relative mb-8">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-t-2 border-r-2 border-indigo-500 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Scan className="w-6 h-6 text-indigo-400 animate-pulse" />
                </div>
              </div>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-bold text-white/80 tracking-widest uppercase"
              >
                Đang tối ưu hóa...
              </motion.p>
              <p className="text-[10px] text-white/30 mt-2 font-medium uppercase tracking-widest">Vui lòng cấp quyền camera</p>
            </div>
          )}
          
          <AnimatePresence mode="wait">
            {scanResult && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 p-8 text-center"
              >
                <motion.div 
                  initial={{ y: 40, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ type: "spring", damping: 20, stiffness: 200 }}
                  className={`w-28 h-28 rounded-[2rem] flex items-center justify-center mb-10 shadow-2xl ${
                    scanResult.type === 'success' 
                      ? 'bg-emerald-500/20 border-2 border-emerald-500/30 text-emerald-400 shadow-emerald-500/20' 
                      : 'bg-red-500/20 border-2 border-red-500/30 text-red-400 shadow-red-500/20'
                  }`}
                >
                  {scanResult.type === 'success' ? (
                    <CheckCircle2 className="w-14 h-14" />
                  ) : (
                    <AlertCircle className="w-14 h-14" />
                  )}
                </motion.div>
                
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <h4 className={`text-3xl font-black mb-4 tracking-tight uppercase ${
                    scanResult.type === 'success' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {scanResult.type === 'success' ? 'Đã Nhận Diện' : 'Lỗi Nhận Diện'}
                  </h4>
                  
                  <p className="text-white/90 mb-14 font-bold text-2xl max-w-xs leading-tight tracking-tight">
                    {scanResult.message}
                  </p>
                </motion.div>
                
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col gap-4 w-full max-w-xs"
                >
                  <button
                    onClick={onClearResult}
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-500 shadow-2xl shadow-indigo-600/30 transition-all active:scale-95 border border-indigo-400/30 group"
                  >
                    <span className="flex items-center justify-center gap-2">
                      Quét Tiếp <Scan className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </span>
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full py-4 bg-white/5 text-white/50 rounded-2xl font-bold hover:bg-white/10 transition-all active:scale-95 border border-white/5"
                  >
                    Đóng
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {error ? (
            <div className="text-center p-12 max-w-xs">
              <div className="w-24 h-24 bg-red-500/10 border-2 border-red-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-red-500/10">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
              <h4 className="text-white font-black text-2xl mb-4 tracking-tight">Lỗi Camera</h4>
              <p className="text-white/40 text-sm mb-12 leading-relaxed font-medium">{error}</p>
              <div className="flex flex-col gap-4 w-full">
                <button 
                  onClick={() => restartScanner()} 
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-500 transition-all active:scale-95 border border-indigo-400/30 shadow-xl shadow-indigo-600/20"
                >
                  Thử lại
                </button>
                <button 
                  onClick={onClose} 
                  className="w-full py-5 bg-white/10 text-white rounded-2xl font-black hover:bg-white/20 transition-all active:scale-95 border border-white/10"
                >
                  Quay lại
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full relative flex items-center justify-center">
              <div id="reader" className="w-full h-full"></div>
              
              {/* Professional Scanner Overlay */}
              {!scanResult && !isStarting && (
                <>
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    {/* Viewfinder - Optimized for Barcodes */}
                    <div className="w-[85%] aspect-[2.2/1] relative overflow-hidden">
                      {/* Scanning Line */}
                      <motion.div
                        className="absolute left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] z-10"
                        style={{ willChange: 'top' }}
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      />
                      {/* Corner Brackets */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                    </div>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] mt-8">Đưa mã vạch vào khung hình</p>
                  </div>

                  {/* Controls - Bottom Floating */}
                  <div className="absolute bottom-14 left-0 right-0 flex justify-center gap-6 px-8 pointer-events-none">
                    {hasFlash && (
                      <button
                        onClick={toggleFlash}
                        className={`p-6 rounded-[2rem] shadow-2xl transition-all active:scale-90 pointer-events-auto backdrop-blur-2xl border-2 ${
                          isFlashOn 
                            ? 'bg-yellow-400 text-black border-yellow-300 shadow-yellow-400/20' 
                            : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {isFlashOn ? <Zap className="w-8 h-8" /> : <ZapOff className="w-8 h-8" />}
                      </button>
                    )}
                    {cameras.length > 1 && (
                      <button
                        onClick={switchCamera}
                        className="p-6 rounded-[2rem] shadow-2xl transition-all active:scale-90 pointer-events-auto backdrop-blur-2xl border-2 bg-white/5 text-white border-white/10 hover:bg-white/10"
                      >
                        <RefreshCw className="w-8 h-8" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        {!scanResult && !isStarting && !error && (
          <div className="p-8 bg-slate-950 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3 text-white/30">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                Neural Link Stable {cameraInfo && `• ${cameraInfo}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/5">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">v2.5.0-PRO</span>
            </div>
          </div>
        )}
      </motion.div>

      <style>{`
        #reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
        #reader {
          background: #000 !important;
        }
        /* Hide html5-qrcode internal UI */
        #reader__dashboard, #reader__status_span {
          display: none !important;
        }
      `}</style>
    </motion.div>
  );
}


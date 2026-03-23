import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  scanResult: { type: 'success' | 'error'; message: string } | null;
  onClearResult: () => void;
}

export default function BarcodeScanner({ onScan, onClose, scanResult, onClearResult }: BarcodeScannerProps) {
  const [error, setError] = useState<string>('');
  const [isStarting, setIsStarting] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    isProcessingRef.current = !!scanResult;
  }, [scanResult]);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    // Automatically start scanning using the rear camera
    html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.0
      },
      (decodedText) => {
        if (!isProcessingRef.current) {
          isProcessingRef.current = true;
          onScan(decodedText);
        }
      },
      (errorMessage) => {
        // Ignore normal scanning errors (e.g., no barcode found in the current frame)
      }
    ).then(() => {
      setIsStarting(false);
    }).catch((err) => {
      console.error("Error starting camera", err);
      setError("Không thể khởi động camera. Vui lòng cấp quyền truy cập camera.");
      setIsStarting(false);
    });

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
          }).catch(console.error);
        } catch (e) {
          console.error("Error stopping scanner", e);
        }
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Quét mã vạch</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 relative min-h-[300px] flex flex-col items-center justify-center">
          {isStarting && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 rounded-b-2xl">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-sm text-slate-500">Đang bật camera sau...</p>
            </div>
          )}
          
          {scanResult && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm p-6 text-center rounded-b-2xl">
              {scanResult.type === 'success' ? (
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
              ) : (
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
              )}
              <h4 className={`text-xl font-bold mb-2 ${scanResult.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                {scanResult.type === 'success' ? 'Thành công!' : 'Lỗi!'}
              </h4>
              <p className="text-slate-700 mb-8 font-medium">{scanResult.message}</p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Đóng
                </button>
                <button
                  onClick={onClearResult}
                  className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  Quét tiếp
                </button>
              </div>
            </div>
          )}

          {error ? (
            <div className="text-center p-4">
              <p className="text-red-500 mb-4">{error}</p>
              <button 
                onClick={onClose} 
                className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
              >
                Đóng
              </button>
            </div>
          ) : (
            <div className="w-full">
              <div id="reader" className="w-full overflow-hidden rounded-lg"></div>
              <p className="text-center text-sm text-slate-500 mt-4">
                Đưa mã vạch sản phẩm vào khung hình để quét
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

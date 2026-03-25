import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import { Printer, X, Download, Plus, Minus, Settings, Layout, Type, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { formatCurrency } from '../lib/format';

interface BarcodeDesignerProps {
  product: Product;
  onClose: () => void;
}

export default function BarcodeDesigner({ product, onClose }: BarcodeDesignerProps) {
  const [quantity, setQuantity] = useState(1);
  const [showName, setShowName] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [fontSize, setFontSize] = useState(12);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    // Add a small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 800));

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [40, 30] // Standard label size
    });

    for (let i = 0; i < quantity; i++) {
      if (i > 0) doc.addPage();
      
      // Draw content
      let y = 5;
      if (showName) {
        doc.setFontSize(fontSize);
        doc.text(product.name, 20, y, { align: 'center' });
        y += 5;
      }

      if (showBarcode) {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, product.barcode || product.id, { format: 'CODE128', displayValue: false });
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', 5, y, 30, 10);
        y += 12;
      }

      if (showPrice) {
        doc.setFontSize(fontSize);
        doc.text(formatCurrency(product.retailPrice || 0) + 'đ', 20, y, { align: 'center' });
      }
    }
    doc.save(`barcode_${product.name}.pdf`);
    setIsGenerating(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[100] p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 rounded-2xl text-indigo-600">
                <Layout className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Thiết Kế Tem Nhãn</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{product.name}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-8">
            {/* Preview Section */}
            <div className="p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
              <div className="absolute top-3 left-3 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest">Preview 40x30mm</div>
              
              <div className="bg-white p-4 shadow-sm border border-slate-200 rounded-lg w-40 aspect-[4/3] flex flex-col items-center justify-center gap-2">
                {showName && <p className="text-[10px] font-bold text-slate-900 text-center truncate w-full">{product.name}</p>}
                {showBarcode && (
                  <div className="w-full h-8 bg-slate-100 rounded flex items-center justify-center overflow-hidden">
                    <div className="flex gap-0.5 items-end h-full py-1">
                      {[...Array(20)].map((_, i) => (
                        <div key={i} className="bg-slate-300 w-0.5" style={{ height: `${Math.random() * 80 + 20}%` }} />
                      ))}
                    </div>
                  </div>
                )}
                {showPrice && <p className="text-[10px] font-black text-indigo-600">{formatCurrency(product.retailPrice || 0)}đ</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-1">
                  <Settings className="w-4 h-4 text-indigo-500" />
                  <span>Cấu hình hiển thị</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: 'name', label: 'Tên SP', state: showName, setter: setShowName },
                    { id: 'barcode', label: 'Mã vạch', state: showBarcode, setter: setShowBarcode },
                    { id: 'price', label: 'Giá bán', state: showPrice, setter: setShowPrice },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => item.setter(!item.state)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        item.state 
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-200' 
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-1">
                  <Type className="w-4 h-4 text-indigo-500" />
                  <span>Cỡ chữ: {fontSize}px</span>
                </div>
                <input 
                  type="range" 
                  min="8" 
                  max="20" 
                  value={fontSize} 
                  onChange={e => setFontSize(Number(e.target.value))} 
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-1">
                  <Plus className="w-4 h-4 text-indigo-500" />
                  <span>Số lượng bản in</span>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                    className="p-3 bg-white text-slate-600 rounded-xl shadow-sm hover:text-indigo-600 transition-all active:scale-90"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="font-black text-xl w-12 text-center text-slate-900">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)} 
                    className="p-3 bg-white text-slate-600 rounded-xl shadow-sm hover:text-indigo-600 transition-all active:scale-90"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={generatePDF} 
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-5 rounded-3xl font-black text-lg hover:bg-slate-800 shadow-2xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Đang tạo file...
                </>
              ) : (
                <>
                  <Printer className="w-6 h-6" /> 
                  Xuất File In PDF
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

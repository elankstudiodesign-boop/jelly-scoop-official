import React, { useState } from 'react';
import { X, Printer, List, Download, Trash2 } from 'lucide-react';
import { formatCurrency, generateBarcodeNumber } from '../lib/format';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';

export interface PrintItem {
  id: string;
  name: string;
  price: number;
  barcode: string;
  quantity: number;
}

interface BarcodePrintModalProps {
  initialItems: PrintItem[];
  onClose: () => void;
}

const generateLabelCanvas = (item: PrintItem): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  // Standard label size: 40x30mm at 300 DPI (472x354)
  canvas.width = 472;
  canvas.height = 354;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Optional: Draw rounded border for the whole label
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(2, 2, canvas.width - 4, canvas.height - 4, 20);
    ctx.stroke();
  } else {
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  }

  // Top Left: Product Name
  ctx.fillStyle = '#1e293b'; // slate-800
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  let fontSize = 28;
  ctx.font = `bold ${fontSize}px "Inter", Arial, sans-serif`;
  let name = item.name;
  
  // Truncate product name if too long
  while (ctx.measureText(name + '...').width > 412 && name.length > 0) {
    name = name.slice(0, -1);
  }
  if (name !== item.name) name += '...';
  
  ctx.fillText(name, 30, 25);

  // Middle: White Block with Black Border
  const boxY = 70;
  const boxHeight = 130;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(20, boxY, 432, boxHeight, 16);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(20, boxY, 432, boxHeight);
    ctx.strokeRect(20, boxY, 432, boxHeight);
  }

  // Price
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const priceText = item.price > 0 ? `${formatCurrency(item.price)} VNĐ` : 'Liên hệ';
  
  let priceFontSize = 80;
  ctx.font = `bold ${priceFontSize}px "Inter", Arial, sans-serif`;
  while (ctx.measureText(priceText).width > 382 && priceFontSize > 20) {
    priceFontSize -= 2;
    ctx.font = `bold ${priceFontSize}px "Inter", Arial, sans-serif`;
  }
  ctx.fillText(priceText, canvas.width / 2, boxY + boxHeight / 2);

  // Bottom: Barcode
  const barcodeCanvas = document.createElement('canvas');
  const barcodeValue = item.barcode || generateBarcodeNumber(item.id);
  JsBarcode(barcodeCanvas, barcodeValue, {
    format: "CODE128",
    width: 3,
    height: 80,
    displayValue: true,
    fontSize: 24,
    textMargin: 6,
    margin: 0,
    font: '"Inter", Arial, sans-serif'
  });

  const bcWidth = barcodeCanvas.width;
  const bcHeight = barcodeCanvas.height;
  
  let scale = 1;
  if (bcWidth > 412) {
    scale = 412 / bcWidth;
  }
  
  const drawWidth = bcWidth * scale;
  const drawHeight = bcHeight * scale;
  
  const x = (canvas.width - drawWidth) / 2;
  const y = 220;
  
  ctx.drawImage(barcodeCanvas, x, y, drawWidth, drawHeight);

  return canvas;
};

export default function BarcodePrintModal({ initialItems, onClose }: BarcodePrintModalProps) {
  const [items, setItems] = useState<PrintItem[]>(initialItems);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentItemName, setCurrentItemName] = useState('');

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    setProgress(0);
    try {
      const width = 40;
      const height = 30;
      
      const doc = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: [width, height]
      });

      let isFirstPage = true;
      const totalToPrint = items.reduce((sum, item) => sum + item.quantity, 0);
      let printedCount = 0;

      for (const item of items) {
        if (item.quantity <= 0) continue;
        setCurrentItemName(item.name);
        
        for (let i = 0; i < item.quantity; i++) {
          if (!isFirstPage) {
            doc.addPage([width, height], 'l');
          }
          isFirstPage = false;

          const canvas = generateLabelCanvas(item);
          const imgData = canvas.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', 0, 0, width, height);
          
          printedCount++;
          setProgress(Math.round((printedCount / totalToPrint) * 100));
        }
      }

      doc.save('barcodes.pdf');
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Có lỗi xảy ra khi tạo PDF.");
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setCurrentItemName('');
    }
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    setItems(prev => prev.map(item => 
      item.id === productId ? { ...item, quantity: Math.max(0, quantity) } : item
    ));
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(item => item.id !== productId));
  };

  const totalLabels = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-0 md:p-4">
      <div className="bg-white rounded-none md:rounded-2xl shadow-2xl w-full max-w-5xl h-full md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-5 md:p-6 pt-[calc(env(safe-area-inset-top)+1.25rem)] md:pt-6 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-900">In Mã Vạch</h2>
              <p className="text-xs text-slate-500 hidden md:block">Tùy chỉnh số lượng và xuất file PDF để in.</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50/50 px-5 md:px-6 overflow-x-auto no-scrollbar">
          <button
            className="px-4 py-4 font-bold text-xs md:text-sm border-b-2 transition-colors flex items-center gap-2 border-indigo-600 text-indigo-600 whitespace-nowrap"
          >
            <List className="w-4 h-4" />
            Danh sách in ({items.length} SP)
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/30">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-600">Sản phẩm</th>
                  <th className="px-6 py-4 font-bold text-slate-600">Mã Barcode</th>
                  <th className="px-6 py-4 font-bold text-slate-600 text-center w-40">Số lượng in</th>
                  <th className="px-6 py-4 font-bold text-slate-600 text-right w-20">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                      Chưa có sản phẩm nào để in.
                    </td>
                  </tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{formatCurrency(item.price || 0)}đ</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {item.barcode || generateBarcodeNumber(item.id)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            -
                          </button>
                          <input 
                            type="number" 
                            min="0"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-center font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                          />
                          <button 
                            onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile List View */}
          <div className="md:hidden space-y-3">
            {items.length === 0 ? (
              <div className="py-12 text-center text-slate-400 italic bg-white rounded-xl border border-slate-200">
                Chưa có sản phẩm nào để in.
              </div>
            ) : (
              items.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 truncate">{item.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{formatCurrency(item.price || 0)}đ</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-1">
                        {item.barcode || generateBarcodeNumber(item.id)}
                      </div>
                    </div>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <span className="text-xs font-medium text-slate-600">Số lượng in:</span>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 active:bg-slate-100"
                      >
                        -
                      </button>
                      <input 
                        type="number" 
                        min="0"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                        className="w-14 h-10 border border-slate-300 rounded-xl text-center font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                      />
                      <button 
                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 active:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer with Progress */}
        <div className="p-5 md:p-6 border-t border-slate-100 bg-white sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          {isGenerating && (
            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span className="truncate max-w-[70%]">Đang xử lý: {currentItemName}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-slate-600 text-center md:text-left">
              Tổng số lượng nhãn sẽ in: <span className="font-black text-indigo-600 text-xl">{totalLabels}</span>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={onClose}
                className="flex-1 md:flex-none px-6 py-3 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleGeneratePDF}
                disabled={isGenerating || totalLabels === 0}
                className="flex-[2] md:flex-none px-8 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Xuất file PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

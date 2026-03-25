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

export default function BarcodePrintModal({ initialItems, onClose }: BarcodePrintModalProps) {
  const [items, setItems] = useState<PrintItem[]>(initialItems);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      // Fixed layout: 40x30 mm
      const width = 40;
      const height = 30;
      
      const doc = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: [width, height]
      });

      let isFirstPage = true;

      for (const item of items) {
        for (let i = 0; i < item.quantity; i++) {
          if (!isFirstPage) {
            doc.addPage([width, height], 'l');
          }
          isFirstPage = false;

          // Draw rounded border
          doc.setDrawColor(220, 220, 220); // Light gray border like the image
          doc.setLineWidth(0.3);
          doc.roundedRect(1, 1, 38, 28, 2, 2);

          // Draw Product Name
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59); // slate-800
          
          // Truncate name if too long
          const maxWidth = 36;
          let nameText = item.name;
          if (doc.getTextWidth(nameText) > maxWidth) {
            while (nameText.length > 0 && doc.getTextWidth(nameText + '...') > maxWidth) {
              nameText = nameText.slice(0, -1);
            }
            nameText += '...';
          }
          doc.text(nameText, 2.5, 4, { baseline: 'top' });

          // Draw Price Box
          const boxY = 8;
          const boxHeight = 11;
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.6);
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(2.5, boxY, 35, boxHeight, 2, 2, 'FD');

          // Draw Price Text
          const priceText = item.price > 0 ? `${formatCurrency(item.price)} VNĐ` : "Liên hệ";
          let fontSize = 20;
          doc.setFontSize(fontSize);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          
          // Scale down font size if text is too wide
          while (doc.getTextWidth(priceText) > 33 && fontSize > 8) {
            fontSize -= 1;
            doc.setFontSize(fontSize);
          }
          
          doc.text(priceText, 20, boxY + 5.5, { align: 'center', baseline: 'middle' });

          // Draw Barcode
          const barcodeValue = item.barcode || generateBarcodeNumber(item.id);
          const bcCanvas = document.createElement('canvas');
          try {
            JsBarcode(bcCanvas, barcodeValue, {
              format: "CODE128",
              width: 2, // scale up
              height: 35,
              displayValue: true,
              fontSize: 18,
              textMargin: 2,
              margin: 0,
              fontOptions: "bold"
            });
            
            const imgData = bcCanvas.toDataURL('image/png');
            
            const imgProps = doc.getImageProperties(imgData);
            const pdfHeight = 9.5; // height in mm
            const pdfWidth = (imgProps.width * pdfHeight) / imgProps.height;
            
            const x = 20 - (pdfWidth / 2);
            const y = 20;
            
            doc.addImage(imgData, 'PNG', x, y, pdfWidth, pdfHeight);
          } catch (e) {
            console.error("Barcode generation error", e);
          }
        }
      }

      doc.save('barcodes.pdf');
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Có lỗi xảy ra khi tạo PDF.");
    } finally {
      setIsGenerating(false);
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Printer className="w-6 h-6 text-indigo-600" />
            In Mã Vạch (Barcode)
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          <button
            className="px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 border-indigo-600 text-indigo-600"
          >
            <List className="w-4 h-4" />
            Danh sách in ({items.length} SP)
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold text-slate-600">Sản phẩm</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Mã Barcode</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-center w-40">Số lượng in</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-right w-20">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      Chưa có sản phẩm nào để in.
                    </td>
                  </tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500">{formatCurrency(item.price || 0)}đ</div>
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-slate-600">
                        {item.barcode || generateBarcodeNumber(item.id)}
                      </td>
                      <td className="px-6 py-3">
                        <input 
                          type="number" 
                          min="0"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded text-center focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center">
          <div className="text-sm text-slate-600">
            Tổng số lượng nhãn sẽ in: <span className="font-bold text-indigo-600 text-lg">{totalLabels}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleGeneratePDF}
              disabled={isGenerating || totalLabels === 0}
              className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Đang tạo PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Xuất file PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

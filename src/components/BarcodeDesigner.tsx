import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import { Printer, X, Download, Plus, Minus } from 'lucide-react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generatePDF = () => {
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
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Thiết kế Barcode: {product.name}</h2>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={showName} onChange={e => setShowName(e.target.checked)} /> Tên</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={showBarcode} onChange={e => setShowBarcode(e.target.checked)} /> Barcode</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} /> Giá</label>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Cỡ chữ</label>
            <input type="range" min="8" max="20" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-full" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Số lượng in</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 bg-slate-100 rounded"><Minus className="w-4 h-4" /></button>
              <span className="font-bold w-8 text-center">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="p-2 bg-slate-100 rounded"><Plus className="w-4 h-4" /></button>
            </div>
          </div>

          <button onClick={generatePDF} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700">
            <Printer className="w-5 h-5" /> Xuất PDF
          </button>
        </div>
      </div>
    </div>
  );
}

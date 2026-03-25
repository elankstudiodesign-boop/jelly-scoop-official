import React, { useState, useEffect } from 'react';
import { X, Printer, Minus, Plus } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency, generateBarcodeNumber } from '../lib/format';
import JsBarcode from 'jsbarcode';

interface BulkBarcodeModalProps {
  products: Product[];
  onClose: () => void;
}

export default function BulkBarcodeModal({ products, onClose }: BulkBarcodeModalProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    const initial: Record<string, number> = {};
    products.forEach(p => {
      initial[p.id] = p.warehouseQuantity || 1;
    });
    setQuantities(initial);
  }, [products]);

  const updateQuantity = (id: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let html = `
      <html>
        <head>
          <title>In mã vạch</title>
          <style>
            @page { margin: 0; size: 50mm 30mm; }
            body { margin: 0; padding: 0; font-family: "Inter", Arial, sans-serif; }
            .label {
              width: 50mm;
              height: 30mm;
              box-sizing: border-box;
              page-break-after: always;
              position: relative;
              background: white;
              overflow: hidden;
              padding: 2mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .name {
              font-size: 10px;
              font-weight: bold;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              color: #1e293b;
            }
            .price-block {
              text-align: center;
              margin: 1mm 0;
            }
            .price-label {
              font-size: 7px;
              text-align: right;
              color: #1e293b;
              margin-bottom: 1px;
            }
            .price-value {
              font-size: 16px;
              font-weight: bold;
              color: #1e293b;
            }
            .barcode-container {
              text-align: center;
              display: flex;
              justify-content: center;
            }
            .barcode-container img {
              max-width: 100%;
              height: 10mm;
            }
          </style>
        </head>
        <body>
    `;

    products.forEach(p => {
      const qty = quantities[p.id] || 0;
      if (qty <= 0) return;

      const barcodeValue = p.isCombo && p.barcode ? p.barcode : generateBarcodeNumber(p.id);
      
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, barcodeValue, {
        format: "CODE128",
        width: 2,
        height: 40,
        displayValue: true,
        fontSize: 14,
        margin: 0,
        textMargin: 2
      });
      const barcodeDataUrl = canvas.toDataURL('image/png');

      const priceText = p.retailPrice ? `${formatCurrency(p.retailPrice)} VNĐ` : 'Liên hệ';

      for (let i = 0; i < qty; i++) {
        html += `
          <div class="label">
            <div class="name">${p.name}</div>
            <div class="price-block">
              <div class="price-label">Giá bán lẻ</div>
              <div class="price-value">${priceText}</div>
            </div>
            <div class="barcode-container">
              <img src="${barcodeDataUrl}" />
            </div>
          </div>
        `;
      }
    });

    html += `
        </body>
        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 500);
          };
        </script>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Danh sách in mã vạch</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Sản phẩm</th>
                <th className="px-4 py-3 text-right">Giá bán lẻ</th>
                <th className="px-4 py-3 text-center rounded-r-lg w-40">Số lượng in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map(p => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {p.retailPrice ? `${formatCurrency(p.retailPrice)}đ` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => updateQuantity(p.id, -1)}
                        className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={quantities[p.id] || 0}
                        onChange={(e) => setQuantities(prev => ({ ...prev, [p.id]: parseInt(e.target.value) || 0 }))}
                        className="w-16 text-center border border-slate-200 rounded py-1"
                      />
                      <button
                        onClick={() => updateQuantity(p.id, 1)}
                        className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Printer className="w-5 h-5" />
            In mã vạch
          </button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Supplier, Product } from '../../types';

interface AssignSupplierModalProps {
  productId: string;
  products: Product[];
  suppliers: Supplier[];
  modalSupplierId: string;
  setModalSupplierId: (id: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export const AssignSupplierModal: React.FC<AssignSupplierModalProps> = ({
  productId,
  products,
  suppliers,
  modalSupplierId,
  setModalSupplierId,
  onClose,
  onSave
}) => {
  const product = products.find(p => p.id === productId);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-2">Gán nhà cung cấp</h3>
        <p className="text-slate-600 text-sm mb-6">
          Chọn nhà cung cấp cho sản phẩm: <span className="font-bold text-slate-900">
            {product?.name}
          </span>
        </p>
        
        <div className="space-y-4">
          <select
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            value={modalSupplierId}
            onChange={(e) => setModalSupplierId(e.target.value)}
          >
            <option value="">-- Chưa gán --</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

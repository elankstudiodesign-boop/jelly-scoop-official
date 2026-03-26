import React from 'react';
import { X, PackagePlus, Upload, ImageIcon } from 'lucide-react';
import { Supplier, Product, Transaction } from '../../types';
import { formatCurrency } from '../../lib/format';

interface SupplierDetailModalProps {
  supplier: Supplier;
  products: Product[];
  transactions: Transaction[];
  onClose: () => void;
}

export const SupplierDetailModal: React.FC<SupplierDetailModalProps> = ({
  supplier,
  products,
  transactions,
  onClose
}) => {
  const supplierProducts = products.filter(p => p.supplierId === supplier.id);
  const supplierTransactions = transactions.filter(t => 
    t.category === 'IMPORT' && 
    (t.supplierId === supplier.id || 
     (t.items && t.items.some(item => products.find(p => p.id === item.productId)?.supplierId === supplier.id)))
  );

  const totalImportAmount = supplierTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{supplier.name}</h3>
            <p className="text-slate-500 text-sm mt-1">Chi tiết nhập hàng từ nhà cung cấp</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <div className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">Tổng tiền đã nhập</div>
              <div className="text-2xl font-black text-indigo-900">
                {formatCurrency(totalImportAmount)}đ
              </div>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <div className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">Số loại sản phẩm</div>
              <div className="text-2xl font-black text-emerald-900">
                {supplierProducts.length}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <section>
              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-indigo-600" />
                Sản phẩm cung cấp
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {supplierProducts.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    Chưa có sản phẩm nào được gán cho nhà cung cấp này.
                  </div>
                ) : (
                  supplierProducts.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <ImageIcon className="w-5 h-5 m-2.5 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 truncate text-sm">{p.name}</div>
                        <div className="text-[10px] text-slate-500">Tồn kho: {p.warehouseQuantity || 0}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-indigo-600">{formatCurrency(p.cost)}đ</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section>
              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-600" />
                Lịch sử nhập hàng
              </h4>
              
              <div className="space-y-3">
                {supplierTransactions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    Chưa có giao dịch nhập hàng nào.
                  </div>
                ) : (
                  supplierTransactions
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(t => (
                      <div key={t.id} className="p-3 rounded-lg border border-slate-100 bg-white hover:border-indigo-100 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-xs font-medium text-slate-500">
                            {new Date(t.date).toLocaleDateString('vi-VN', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="text-sm font-bold text-red-600">-{formatCurrency(t.amount)}đ</div>
                        </div>
                        <div className="text-sm text-slate-700 font-medium">{t.description}</div>
                        {t.items && t.items.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {t.items.map((item, idx) => {
                              const p = products.find(prod => prod.id === item.productId);
                              return (
                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600">
                                  {p?.name || 'Sản phẩm ẩn'}: {item.quantity}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </section>
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

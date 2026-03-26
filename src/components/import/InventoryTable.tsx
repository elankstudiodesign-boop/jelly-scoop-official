import React from 'react';
import { Product, Supplier } from '../../types';
import { Search, Barcode, Trash2, Edit2, AlertCircle, Truck, X, ImageIcon } from 'lucide-react';
import { formatCurrency } from '../../lib/format';
import { downloadBarcode } from '../../lib/barcodeUtils';

export function InventoryTable({ manager, products, suppliers }: { manager: any, products: any[], suppliers: any[] }) {
  const {
    inventorySearchTerm, setInventorySearchTerm,
    inventoryTab, setInventoryTab,
    isSelectionMode, setIsSelectionMode,
    selectedIds, setSelectedIds,
    handlePrintBarcodes,
    setDeleteConfirmIds,
    setAssigningSupplierForProductId,
    setModalSupplierId
  } = manager;

  const filteredInventoryProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
      (p.note && p.note.toLowerCase().includes(inventorySearchTerm.toLowerCase()));
    
    const matchesTab = inventoryTab === 'all' 
      ? true 
      : inventoryTab === 'combo' 
        ? p.isCombo 
        : !p.isCombo;
        
    return matchesSearch && matchesTab;
  });

  const allSelected = filteredInventoryProducts.length > 0 && selectedIds.size === filteredInventoryProducts.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelected = (id: string) => {
    setSelectedIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInventoryProducts.map(p => p.id)));
    }
  };

  const openAssignModal = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setModalSupplierId(product?.supplierId || '');
    setAssigningSupplierForProductId(productId);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
      <div className="p-3 md:p-6 border-b border-slate-100 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900">Tồn kho hiện tại</h2>
          
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
            {isSelectionMode ? (
              <div className="flex items-center gap-2 w-full md:w-auto whitespace-nowrap">
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handlePrintBarcodes}
                    className="flex-none flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                  >
                    <Barcode className="w-4 h-4" />
                    <span>In ({selectedIds.size})</span>
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className={`flex-none flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all border shadow-sm ${
                    allSelected 
                      ? 'bg-slate-900 text-white border-slate-900' 
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <span>{allSelected ? 'Bỏ chọn hết' : 'Chọn tất cả'}</span>
                </button>

                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmIds(Array.from(selectedIds))}
                    className="flex-none flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all bg-red-50 text-red-600 border border-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xoá ({selectedIds.size})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsSelectionMode(false)}
                  className="flex-none flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all bg-white text-slate-500 border border-slate-200"
                >
                  <X className="w-4 h-4" />
                  <span>Hủy</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSelectionMode(true)}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all bg-white text-slate-700 border border-slate-200 shadow-sm hover:border-indigo-500 hover:text-indigo-600 group"
              >
                <Edit2 className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                Quản lý kho
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={inventorySearchTerm}
            onChange={(e) => setInventorySearchTerm(e.target.value)}
            placeholder="Tìm kiếm sản phẩm theo tên hoặc ghi chú..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
          {inventorySearchTerm && (
            <button
              onClick={() => setInventorySearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          {(['all', 'single', 'combo'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setInventoryTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                inventoryTab === tab 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab === 'all' ? 'Tất cả' : tab === 'single' ? 'Sản phẩm lẻ' : 'Combo'}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              {isSelectionMode && <th className="px-6 py-4 w-12"></th>}
              <th className="px-6 py-4 w-16">Ảnh</th>
              <th className="px-6 py-4">Sản phẩm</th>
              <th className="px-6 py-4 text-right">Giá vốn</th>
              <th className="px-6 py-4 text-right">Tồn kho</th>
              <th className="px-6 py-4 text-right">Nhà cung cấp</th>
              <th className="px-6 py-4 text-right">Trạng thái</th>
              <th className="px-6 py-4 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInventoryProducts.length === 0 ? (
              <tr>
                <td colSpan={isSelectionMode ? 8 : 7} className="px-6 py-8 text-center text-slate-500">
                  {inventorySearchTerm ? 'Không tìm thấy sản phẩm phù hợp' : 'Kho hàng trống'}
                </td>
              </tr>
            ) : (
              filteredInventoryProducts.map(p => {
                const wq = p.warehouseQuantity || 0;
                const checked = selectedIds.has(p.id);
                const supplier = suppliers.find(s => s.id === p.supplierId);
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    {isSelectionMode && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelected(p.id)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-100 border border-slate-200">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <ImageIcon className="w-5 h-5 m-2.5 text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{p.name}</div>
                      {p.note && <div className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{p.note}</div>}
                    </td>
                    <td className="px-6 py-4 text-right">{formatCurrency(p.cost)}đ</td>
                    <td className="px-6 py-4 text-right font-medium">{wq}</td>
                    <td className="px-6 py-4 text-right">
                      {supplier ? (
                        <div className="flex flex-col items-end">
                          <span className="text-slate-900 font-medium">{supplier.name}</span>
                          <span className="text-xs text-slate-500">{supplier.phone}</span>
                          <button 
                            onClick={() => openAssignModal(p.id)}
                            className="text-[10px] text-indigo-600 hover:underline mt-1"
                          >
                            Thay đổi
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-slate-400 italic">Chưa gán</span>
                          <button 
                            onClick={() => openAssignModal(p.id)}
                            className="text-[10px] text-indigo-600 hover:underline mt-1"
                          >
                            Gán ngay
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {wq === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <AlertCircle className="w-3 h-3" />
                          Hết hàng
                        </span>
                      ) : wq < 4 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                          <AlertCircle className="w-3 h-3" />
                          Sắp hết
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Còn hàng
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => downloadBarcode(p)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Tải mã vạch"
                        >
                          <Barcode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmIds([p.id])}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xoá sản phẩm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-slate-100">
        {filteredInventoryProducts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">
              {inventorySearchTerm ? 'Không tìm thấy sản phẩm phù hợp' : 'Kho hàng trống'}
            </p>
          </div>
        ) : (
          filteredInventoryProducts.map(p => {
            const wq = p.warehouseQuantity || 0;
            const checked = selectedIds.has(p.id);
            const supplier = suppliers.find(s => s.id === p.supplierId);
            
            return (
              <div key={p.id} className={`p-3 transition-all ${checked ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                <div className="flex items-start gap-4">
                  {isSelectionMode && (
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelected(p.id)}
                        className="h-5 w-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  )}
                  
                  <div className="relative group flex-shrink-0">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-slate-300" />
                        </div>
                      )}
                    </div>
                    {wq < 4 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-slate-900 leading-tight truncate pr-2">{p.name}</h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => downloadBarcode(p)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                        >
                          <Barcode className="w-4 h-4" />
                        </button>
                        {!isSelectionMode && (
                          <button
                            onClick={() => setDeleteConfirmIds([p.id])}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm font-black text-indigo-600">{formatCurrency(p.cost)}đ</span>
                      <span className="text-slate-300">•</span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <Truck className="w-3 h-3" />
                        <span className="truncate max-w-[100px]">{supplier?.name || 'Chưa gán'}</span>
                        <button 
                          onClick={() => openAssignModal(p.id)}
                          className="text-indigo-600 hover:text-indigo-700 ml-0.5"
                        >
                          {p.supplierId ? 'Sửa' : 'Gán'}
                        </button>
                      </div>
                    </div>

                    {p.note && (
                      <p className="mt-2 text-[11px] text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                        {p.note}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">Tồn kho:</span>
                        <span className={`text-sm font-black ${wq === 0 ? 'text-red-600' : wq < 4 ? 'text-orange-600' : 'text-slate-900'}`}>
                          {wq}
                        </span>
                      </div>
                      
                      <div>
                        {wq === 0 ? (
                          <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
                            Hết hàng
                          </span>
                        ) : wq < 4 ? (
                          <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-100">
                            Sắp hết
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                            Còn hàng
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

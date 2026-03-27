import React from 'react';
import { Product, Supplier } from '../../types';
import { Search, Barcode, Trash2, Edit2, AlertCircle, Truck, X, ImageIcon, Filter, Grid, List, ChevronDown, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../lib/format';
import { downloadBarcode } from '../../lib/barcodeUtils';

export function InventoryTable({ manager, products, suppliers }: { manager: any, products: any[], suppliers: any[] }) {
  const {
    inventorySearchTerm, setInventorySearchTerm,
    inventoryTab, setInventoryTab,
    inventoryStockFilter, setInventoryStockFilter,
    viewMode, setViewMode,
    isSelectionMode, setIsSelectionMode,
    selectedIds, setSelectedIds,
    handlePrintBarcodes,
    setDeleteConfirmIds,
    setAssigningSupplierForProductId,
    setModalSupplierId
  } = manager;

  const [showFilters, setShowFilters] = React.useState(false);

  const filteredInventoryProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
      (p.note && p.note.toLowerCase().includes(inventorySearchTerm.toLowerCase()));
    
    const matchesTab = inventoryTab === 'all' 
      ? true 
      : inventoryTab === 'combo' 
        ? p.isCombo 
        : !p.isCombo;

    const wq = p.warehouseQuantity || 0;
    const matchesStock = inventoryStockFilter === 'all'
      ? true
      : inventoryStockFilter === 'low'
        ? wq > 0 && wq < 4
        : wq === 0;
        
    return matchesSearch && matchesTab && matchesStock;
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

  const renderProductStatus = (wq: number) => {
    if (wq === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-100">
          <AlertCircle className="w-3 h-3" />
          Hết hàng
        </span>
      );
    } else if (wq < 4) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-100">
          <AlertCircle className="w-3 h-3" />
          Sắp hết
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
          Còn hàng
        </span>
      );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-8">
      <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Tồn kho hiện tại</h2>
            <p className="text-slate-500 text-xs font-medium mt-0.5">Hiển thị {filteredInventoryProducts.length} sản phẩm</p>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
            {isSelectionMode ? (
              <div className="flex items-center gap-2 w-full md:w-auto whitespace-nowrap">
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handlePrintBarcodes}
                    className="flex-none flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95"
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
                    className="flex-none flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xoá ({selectedIds.size})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsSelectionMode(false)}
                  className="flex-none flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                >
                  <X className="w-4 h-4" />
                  <span>Hủy</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="p-2.5 text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:text-indigo-600 hover:border-indigo-200 transition-all"
                  title={viewMode === 'grid' ? 'Chế độ danh sách' : 'Chế độ lưới'}
                >
                  {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
                </button>
                
                <button
                  type="button"
                  onClick={() => setIsSelectionMode(true)}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all bg-white text-slate-700 border border-slate-200 shadow-sm hover:border-indigo-500 hover:text-indigo-600 group"
                >
                  <Edit2 className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  Quản lý kho
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={inventorySearchTerm}
              onChange={(e) => setInventorySearchTerm(e.target.value)}
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
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

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                showFilters || inventoryStockFilter !== 'all'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Lọc
              {inventoryStockFilter !== 'all' && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              )}
            </button>

            <div className="flex bg-slate-100 p-1 rounded-xl">
              {(['all', 'single', 'combo'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setInventoryTab(tab)}
                  className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                    inventoryTab === tab 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab === 'all' ? 'Tất cả' : tab === 'single' ? 'Lẻ' : 'Combo'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Tình trạng kho</label>
              <select
                value={inventoryStockFilter}
                onChange={(e) => setInventoryStockFilter(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="low">Sắp hết hàng (&lt; 4)</option>
                <option value="out">Hết hàng (0)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
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
                    <td colSpan={isSelectionMode ? 8 : 7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                          <Search className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium">
                          {inventorySearchTerm || inventoryStockFilter !== 'all' 
                            ? 'Không tìm thấy sản phẩm phù hợp' 
                            : 'Kho hàng trống'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInventoryProducts.map(p => {
                    const wq = p.warehouseQuantity || 0;
                    const checked = selectedIds.has(p.id);
                    const supplier = suppliers.find(s => s.id === p.supplierId);
                    return (
                      <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${checked ? 'bg-indigo-50/30' : ''}`}>
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
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <ImageIcon className="w-5 h-5 m-2.5 text-slate-400" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          {p.note && <div className="text-[10px] text-slate-500 mt-0.5 whitespace-pre-wrap line-clamp-1 italic">{p.note}</div>}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-900">{formatCurrency(p.cost)}đ</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-sm font-black ${wq === 0 ? 'text-red-600' : wq < 4 ? 'text-orange-600' : 'text-slate-900'}`}>
                            {wq}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {supplier ? (
                            <div className="flex flex-col items-end">
                              <span className="text-slate-900 font-bold text-xs">{supplier.name}</span>
                              <button 
                                onClick={() => openAssignModal(p.id)}
                                className="text-[10px] text-indigo-600 hover:underline mt-0.5"
                              >
                                Thay đổi
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className="text-slate-400 italic text-xs">Chưa gán</span>
                              <button 
                                onClick={() => openAssignModal(p.id)}
                                className="text-[10px] text-indigo-600 hover:underline mt-0.5"
                              >
                                Gán ngay
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {renderProductStatus(wq)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => downloadBarcode(p)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                              title="Tải mã vạch"
                            >
                              <Barcode className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmIds([p.id])}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
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

          {/* Mobile List View */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredInventoryProducts.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium">
                  {inventorySearchTerm || inventoryStockFilter !== 'all' 
                    ? 'Không tìm thấy sản phẩm phù hợp' 
                    : 'Kho hàng trống'}
                </p>
              </div>
            ) : (
              filteredInventoryProducts.map(p => {
                const wq = p.warehouseQuantity || 0;
                const checked = selectedIds.has(p.id);
                const supplier = suppliers.find(s => s.id === p.supplierId);
                
                return (
                  <div key={p.id} className={`p-4 transition-all ${checked ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                    <div className="flex items-start gap-4">
                      {isSelectionMode && (
                        <div className="pt-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelected(p.id)}
                            className="h-5 w-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      )}
                      
                      <div className="relative flex-shrink-0">
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
                          <div>
                            <h3 className="font-black text-slate-900 text-sm leading-tight truncate pr-1">{p.name}</h3>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => downloadBarcode(p)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all border border-slate-200"
                            >
                              <Barcode className="w-4 h-4" />
                            </button>
                            {!isSelectionMode && (
                              <button
                                onClick={() => setDeleteConfirmIds([p.id])}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl transition-all border border-slate-200"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-base font-black text-indigo-600">{formatCurrency(p.cost)}đ</span>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-lg">
                            <Truck className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate max-w-[80px]">{supplier?.name || 'Chưa gán'}</span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tồn kho:</span>
                            <span className={`text-base font-black ${wq === 0 ? 'text-red-600' : wq < 4 ? 'text-orange-600' : 'text-slate-900'}`}>
                              {wq}
                            </span>
                          </div>
                          
                          <div>
                            {renderProductStatus(wq)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* Grid View */
        <div className="p-4 md:p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredInventoryProducts.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium">Không tìm thấy sản phẩm phù hợp</p>
              </div>
            </div>
          ) : (
            filteredInventoryProducts.map(p => {
              const wq = p.warehouseQuantity || 0;
              const checked = selectedIds.has(p.id);
              const supplier = suppliers.find(s => s.id === p.supplierId);
              
              return (
                <div 
                  key={p.id} 
                  className={`relative group bg-white rounded-2xl border transition-all duration-200 ${
                    checked 
                      ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-lg' 
                      : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
                  }`}
                >
                  {isSelectionMode && (
                    <div className="absolute top-3 left-3 z-10">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelected(p.id)}
                        className="h-5 w-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 shadow-sm"
                      />
                    </div>
                  )}

                  <div className="aspect-square relative overflow-hidden rounded-t-2xl bg-slate-50">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-slate-200" />
                      </div>
                    )}
                    
                    <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                      <button
                        onClick={() => downloadBarcode(p)}
                        className="p-2 bg-white/90 backdrop-blur-sm text-slate-600 hover:text-indigo-600 rounded-xl shadow-sm transition-all hover:scale-110"
                      >
                        <Barcode className="w-4 h-4" />
                      </button>
                      {!isSelectionMode && (
                        <button
                          onClick={() => setDeleteConfirmIds([p.id])}
                          className="p-2 bg-white/90 backdrop-blur-sm text-slate-600 hover:text-red-600 rounded-xl shadow-sm transition-all hover:scale-110"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="absolute bottom-3 left-3 right-3">
                      {renderProductStatus(wq)}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2 min-h-[2.5rem] leading-tight mb-2">{p.name}</h3>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giá vốn</span>
                        <span className="text-sm font-black text-slate-900">{formatCurrency(p.cost)}đ</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tồn kho</span>
                        <span className={`text-sm font-black ${wq === 0 ? 'text-red-600' : wq < 4 ? 'text-orange-600' : 'text-slate-900'}`}>
                          {wq}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Truck className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                          {supplier?.name || 'Chưa gán'}
                        </span>
                      </div>
                      <button 
                        onClick={() => openAssignModal(p.id)}
                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-wider whitespace-nowrap"
                      >
                        {p.supplierId ? 'Sửa' : 'Gán'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

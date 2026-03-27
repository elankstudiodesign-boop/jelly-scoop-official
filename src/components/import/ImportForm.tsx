import React from 'react';
import { Product, Supplier } from '../../types';
import { PackagePlus, Search, X, Image as ImageIcon } from 'lucide-react';

export function ImportForm({ manager, products, suppliers }: { manager: any, products: Product[], suppliers: Supplier[] }) {
  const {
    searchTerm, setSearchTerm,
    showDropdown, setShowDropdown,
    filteredProducts,
    setSelectedProductId,
    setUnitCost,
    setNote,
    setCategory,
    setSelectedSupplierId,
    setImageUrl,
    selectedSupplierId,
    imageProcessing,
    imageUrl,
    imageDropzoneRef,
    fileInputRef,
    handleImageUpload,
    quantity, handleQuantityChange,
    unitCost, handleUnitCostChange,
    totalCost, handleTotalCostChange,
    note,
    category,
    description, setDescription,
    handleImport,
    handleClipboardPaste,
    handlePaste
  } = manager;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Nhập hàng vào kho</h2>
        <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">Tìm sản phẩm hoặc nhập tên mới để bắt đầu.</p>
      </div>
      <div className="p-4 md:p-8">
        <form onSubmit={handleImport} className="space-y-4 md:space-y-6">
          {/* Product Search/Name */}
          <div className="space-y-2 relative">
            <label className="block text-sm font-bold text-slate-700 ml-1">Tên sản phẩm</label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                required
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                placeholder="Nhập tên sản phẩm..."
              />
            </div>
            
            {showDropdown && filteredProducts.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-72 overflow-y-auto p-2 animate-in fade-in zoom-in-95 duration-200">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSearchTerm(p.name);
                      setSelectedProductId(p.id);
                      setUnitCost(p.cost.toString());
                      setNote(p.note || '');
                      setCategory(p.category || '');
                      setSelectedSupplierId(p.supplierId || '');
                      setImageUrl(p.imageUrl || '');
                      setShowDropdown(false);
                    }}
                    className="w-full text-left p-3 hover:bg-indigo-50 rounded-xl flex justify-between items-center transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <ImageIcon className="w-5 h-5 m-2.5 text-slate-400" />
                        )}
                      </div>
                      <span className="font-bold text-slate-900 group-hover:text-indigo-700">{p.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full uppercase tracking-wider">Kho: {p.warehouseQuantity || 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 ml-1">Danh mục sản phẩm</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-900 appearance-none cursor-pointer text-sm sm:text-base"
              >
                <option value="">-- Chọn danh mục --</option>
                {['Kẹo dẻo', 'Kẹo cứng', 'Socola', 'Snack', 'Đồ chơi', 'Khác'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 ml-1">Nhà cung cấp (Tùy chọn)</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-900 appearance-none cursor-pointer text-sm sm:text-base"
              >
                <option value="">-- Chọn nhà cung cấp --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {suppliers.length === 0 && (
                <p className="text-[10px] text-slate-400 font-medium ml-1">Chưa có nhà cung cấp nào.</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 ml-1">Hình ảnh sản phẩm</label>
              <div 
                ref={imageDropzoneRef}
                tabIndex={0}
                onClick={() => imageDropzoneRef.current?.focus()}
                onPaste={handlePaste}
                className="flex items-center gap-4 p-3 bg-slate-50 border-2 border-slate-200 border-dashed rounded-xl hover:border-indigo-500 hover:bg-indigo-50/30 transition-all cursor-pointer group focus:outline-none focus:ring-4 focus:ring-indigo-500/10 min-h-[64px]"
              >
                {imageProcessing ? (
                  <div className="flex items-center gap-3 w-full justify-center py-1">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Đang xử lý...</p>
                  </div>
                ) : imageUrl ? (
                  <div className="flex items-center gap-4 w-full">
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover rounded-lg shadow-sm border border-slate-200" referrerPolicy="no-referrer" />
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageUrl('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1 hover:bg-red-50 transition-colors shadow-md border border-red-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">Đã tải ảnh lên</p>
                      <p className="text-[10px] text-slate-500 font-medium">Nhấn để thay đổi</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 w-full">
                    <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center group-hover:border-indigo-200 transition-colors">
                      <ImageIcon className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <div className="flex-1 text-left">
                      <label htmlFor="file-upload" className="block text-xs font-bold text-slate-900 cursor-pointer">Tải ảnh lên</label>
                      <p className="text-[10px] text-slate-500 font-medium">Hoặc dán Ctrl+V tại đây</p>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*, .heic, .heif" onChange={handleImageUpload} ref={fileInputRef} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quantity & Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 ml-1">Số lượng nhập</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={handleQuantityChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-900 text-sm sm:text-base"
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 ml-1">Giá vốn / 1 SP (VNĐ)</label>
              <input
                type="text"
                required
                min="0"
                value={unitCost}
                onChange={handleUnitCostChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-900 text-sm sm:text-base"
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-bold text-slate-700 ml-1">Tổng chi phí (VNĐ)</label>
              <input
                type="text"
                required
                min="0"
                value={totalCost}
                onChange={handleTotalCostChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-900 text-sm sm:text-base"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 ml-1">Ghi chú sản phẩm</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-900 text-sm sm:text-base"
                placeholder="Ghi chú về sản phẩm này..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 ml-1">Mô tả giao dịch</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-900 text-sm sm:text-base"
                placeholder="Ghi chú thêm về lô hàng này..."
                rows={2}
              />
            </div>
          </div>

          <div className="pt-4 md:pt-6 border-t border-slate-100">
            <button
              type="submit"
              className="w-full px-8 py-3.5 md:py-4 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs md:text-sm rounded-2xl hover:bg-indigo-700 active:scale-[0.98] focus:ring-4 focus:ring-indigo-500/20 transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-200"
            >
              <PackagePlus className="w-5 h-5" />
              Xác nhận nhập kho
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { Product, PriceGroup } from '../types';
import { AlertCircle, ArrowDownToLine, Package, RotateCcw } from 'lucide-react';
import { formatCurrency, parseCurrency } from '../lib/format';

interface ProductsProps {
  products: Product[];
  addProduct: (p: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
}

export default function Products({ products, updateProduct, deleteProduct }: ProductsProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [margin, setMargin] = useState('50'); // Default 50%
  const [retailPrice, setRetailPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [priceGroup, setPriceGroup] = useState<PriceGroup>('Thấp');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const product = products.find(p => p.id === id);
    if (product) {
      // Auto-calculate retail price based on current margin and product cost
      const c = product.cost;
      const m = Number(margin);
      if (c > 0) {
        setRetailPrice(formatCurrency(Math.round(c * (1 + m / 100))));
      }
      setPriceGroup(product.priceGroup || 'Thấp');
    }
  };

  const handleMarginChange = (val: string) => {
    setMargin(val);
    if (selectedProduct) {
      const c = selectedProduct.cost;
      const m = Number(val);
      if (c > 0) {
        setRetailPrice(formatCurrency(Math.round(c * (1 + m / 100))));
      }
    }
  };

  const handleRetailPriceChange = (val: string) => {
    const formatted = formatCurrency(val);
    setRetailPrice(formatted);
    if (selectedProduct) {
      const c = selectedProduct.cost;
      const p = parseCurrency(formatted);
      if (c > 0 && p > 0) {
        setMargin(((p - c) / c * 100).toFixed(1));
      }
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !retailPrice || !quantity) return;

    const numQuantity = Number(quantity);
    if (numQuantity <= 0) {
      alert('Số lượng phải lớn hơn 0');
      return;
    }

    if (numQuantity > (selectedProduct.warehouseQuantity || 0)) {
      alert('Số lượng đổ vào bể không được vượt quá số lượng trong kho!');
      return;
    }

    const newPoolQuantity = (selectedProduct.quantity || 0) + numQuantity;
    const newWarehouseQuantity = (selectedProduct.warehouseQuantity || 0) - numQuantity;

    updateProduct(selectedProduct.id, {
      retailPrice: parseCurrency(retailPrice),
      margin: Number(margin),
      priceGroup,
      quantity: newPoolQuantity,
      warehouseQuantity: newWarehouseQuantity
    });

    setSelectedProductId('');
    setMargin('50');
    setRetailPrice('');
    setQuantity('');
    alert('Đã thêm vào bể thành công!');
  };

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    updateProduct(id, { quantity: newQuantity });
  };

  const totalItems = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalCost = products.reduce((sum, p) => sum + (p.cost * (p.quantity || 0)), 0);
  const avgCost = totalItems > 0 ? totalCost / totalItems : 0;

  // Only show products that are in the pool or have been configured for the pool
  const poolProducts = products.filter(p => (p.quantity || 0) > 0 || p.retailPrice !== undefined);

  const [filterGroup, setFilterGroup] = useState<'Tất cả' | PriceGroup>('Tất cả');

  const filteredPoolProducts = filterGroup === 'Tất cả' 
    ? poolProducts 
    : poolProducts.filter(p => p.priceGroup === filterGroup);

  const visibleIds = filteredPoolProducts.map(p => p.id);
  const selectedVisibleCount = visibleIds.filter(id => selectedIds.has(id)).length;
  const allSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const someSelected = selectedVisibleCount > 0 && !allSelected;

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach(id => next.delete(id));
      } else {
        visibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleReturnToWarehouse = (ids: string[]) => {
    const selectedProducts = ids
      .map(id => products.find(p => p.id === id))
      .filter((p): p is Product => Boolean(p));

    const actionable = selectedProducts
      .map(p => {
        const poolQty = Math.max(0, p.quantity || 0);
        if (poolQty <= 0) return null;
        const warehouseQty = Math.max(0, p.warehouseQuantity || 0);
        return { id: p.id, nextWarehouseQuantity: warehouseQty + poolQty, retailPrice: p.retailPrice ?? 0 };
      })
      .filter((x): x is { id: string; nextWarehouseQuantity: number; retailPrice: number } => Boolean(x));

    if (actionable.length === 0) {
      setNotification({ type: 'error', message: 'Không có sản phẩm nào có số lượng trong bể để hoàn kho.' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    actionable.forEach(({ id, nextWarehouseQuantity, retailPrice }) => {
      updateProduct(id, { quantity: 0, warehouseQuantity: nextWarehouseQuantity, retailPrice });
    });

    setSelectedIds(prev => {
      const next = new Set(prev);
      actionable.forEach(({ id }) => next.delete(id));
      return next;
    });

    setNotification({
      type: 'success',
      message: actionable.length === 1 ? 'Đã hoàn kho thành công!' : `Đã hoàn kho ${actionable.length} sản phẩm!`
    });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const allowed = new Set(visibleIds);
    setSelectedIds(prev => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach(id => {
        if (allowed.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [products, filterGroup]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const groupStats = {
    Thấp: poolProducts.filter(p => p.priceGroup === 'Thấp').reduce((sum, p) => sum + (p.quantity || 0), 0),
    Trung: poolProducts.filter(p => p.priceGroup === 'Trung').reduce((sum, p) => sum + (p.quantity || 0), 0),
    Cao: poolProducts.filter(p => p.priceGroup === 'Cao').reduce((sum, p) => sum + (p.quantity || 0), 0),
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span className="font-medium text-sm">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bể</h1>
          <p className="text-slate-500 mt-1 text-sm">Quản lý sản phẩm và số lượng hiện có trong bể.</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-6">
          <div>
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Tổng SP trong bể</p>
            <p className="text-xl font-bold text-indigo-900">{formatCurrency(totalItems)}</p>
          </div>
          <div className="w-px bg-indigo-200"></div>
          <div>
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Giá vốn TB / Món</p>
            <p className="text-xl font-bold text-indigo-900">{formatCurrency(Math.round(avgCost))}đ</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Đổ hàng vào bể
        </h2>
        
        <form onSubmit={handleAdd} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Chọn sản phẩm từ kho</label>
              <select 
                value={selectedProductId} 
                onChange={e => handleProductSelect(e.target.value)} 
                className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm text-slate-900" 
                required
              >
                <option value="" disabled>-- Chọn sản phẩm --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id} disabled={(p.warehouseQuantity || 0) === 0}>
                    {p.name} (Tồn kho: {p.warehouseQuantity || 0})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Nhóm giá (Scoop)</label>
              <select value={priceGroup} onChange={e => setPriceGroup(e.target.value as PriceGroup)} className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm text-slate-900">
                <option value="Thấp">Thấp</option>
                <option value="Trung">Trung</option>
                <option value="Cao">Cao</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Số lượng đổ vào bể</label>
              <input 
                type="number" 
                min="1"
                max={selectedProduct?.warehouseQuantity || 0}
                value={quantity} 
                onChange={e => setQuantity(e.target.value)} 
                className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm text-slate-900" 
                placeholder="0" 
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Giá vốn (VNĐ)</label>
              <input 
                type="text" 
                value={selectedProduct ? formatCurrency(selectedProduct.cost) : '0'} 
                className="w-full border border-slate-200 rounded-md px-3 py-2 bg-slate-100 text-sm text-slate-500 cursor-not-allowed" 
                disabled 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">% Lợi nhuận</label>
              <input type="number" step="0.1" value={margin} onChange={e => handleMarginChange(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm text-slate-900" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Giá bán lẻ (VNĐ)</label>
              <input type="text" value={retailPrice} onChange={e => handleRetailPriceChange(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm text-slate-900" required placeholder="0" />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={!selectedProduct} className="bg-indigo-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4" />
              Đổ vào bể
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm w-fit">
            {(['Tất cả', 'Thấp', 'Trung', 'Cao'] as const).map((group) => (
              <button
                key={group}
                onClick={() => setFilterGroup(group)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  filterGroup === group
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {group}
              </button>
            ))}
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-1 sm:pb-0">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-medium text-slate-600">Thấp: <span className="text-slate-900">{groupStats.Thấp}</span></span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-xs font-medium text-slate-600">Trung: <span className="text-slate-900">{groupStats.Trung}</span></span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-xs font-medium text-slate-600">Cao: <span className="text-slate-900">{groupStats.Cao}</span></span>
            </div>
          </div>
        </div>

        {filteredPoolProducts.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600 select-none">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Chọn tất cả
            </label>
            <button
              type="button"
              onClick={() => handleReturnToWarehouse(visibleIds.filter(id => selectedIds.has(id)))}
              disabled={selectedVisibleCount === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              Hoàn kho {selectedVisibleCount > 0 ? `(${selectedVisibleCount})` : ''}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredPoolProducts.map(product => {
            const poolQty = product.quantity || 0;
            const isLowInPool = poolQty <= 10;
            
            return (
              <div key={product.id} className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 flex flex-row sm:flex-col">
                <div className="w-1/3 sm:w-full aspect-square bg-slate-50 relative p-2 sm:p-3 flex-shrink-0">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg border border-slate-200" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
                      <Package className="w-6 h-6 sm:w-8 sm:h-8 opacity-50" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-white/90 backdrop-blur-sm px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md border border-slate-200 shadow-sm">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleSelected(product.id)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white/90 backdrop-blur-sm px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold text-slate-700 border border-slate-200 shadow-sm">
                    {product.priceGroup}
                  </div>
                </div>
                <div className="w-2/3 sm:w-full p-3 sm:p-4 flex-1 flex flex-col bg-white min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-slate-900 truncate mb-2 sm:mb-3">{product.name}</h3>
                  
                  {isLowInPool && (
                    <div className="mb-1.5 sm:mb-2 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium text-amber-700 bg-amber-50 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md border border-amber-100">
                      <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                      <span className="truncate">Sắp hết trong bể!</span>
                    </div>
                  )}

                  {(product.warehouseQuantity || 0) <= 10 && (
                    <div className="mb-2 sm:mb-3 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium text-red-700 bg-red-50 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md border border-red-100">
                      <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                      <span className="truncate">Kho sắp hết!</span>
                    </div>
                  )}

                  <div className="mt-auto space-y-1 sm:space-y-1.5 text-xs sm:text-sm bg-slate-50 p-2 sm:p-3 rounded-lg border border-slate-100">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-medium text-indigo-700">Trong bể:</span>
                      <input 
                        type="number" 
                        value={poolQty} 
                        onChange={(e) => handleUpdateQuantity(product.id, Number(e.target.value))}
                        className="w-14 sm:w-20 text-right border border-indigo-200 rounded px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold text-indigo-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                      />
                    </div>
                    <div className="flex justify-between text-slate-600 pt-1 sm:pt-1.5 border-t border-slate-200 mt-1 sm:mt-1.5">
                      <span>Trong kho:</span>
                      <span className="font-medium">{product.warehouseQuantity || 0}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 pt-1 sm:pt-1.5 border-t border-slate-200 mt-1 sm:mt-1.5">
                      <span>Giá vốn:</span>
                      <span className="font-medium">{formatCurrency(product.cost)}đ</span>
                    </div>
                    <div className="flex justify-between text-slate-600 pt-1 sm:pt-1.5 border-t border-slate-200 mt-1 sm:mt-1.5">
                      <span>Giá bán lẻ:</span>
                      <span className="font-medium text-emerald-600">{formatCurrency(product.retailPrice || 0)}đ</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

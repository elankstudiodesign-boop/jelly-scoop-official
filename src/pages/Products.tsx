import React, { useState } from 'react';
import { Product, PriceGroup } from '../types';
import { AlertCircle, ArrowDownToLine, Package } from 'lucide-react';

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

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const product = products.find(p => p.id === id);
    if (product) {
      // Auto-calculate retail price based on current margin and product cost
      const c = product.cost;
      const m = Number(margin);
      if (c > 0) {
        setRetailPrice(Math.round(c * (1 + m / 100)).toString());
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
        setRetailPrice(Math.round(c * (1 + m / 100)).toString());
      }
    }
  };

  const handleRetailPriceChange = (val: string) => {
    setRetailPrice(val);
    if (selectedProduct) {
      const c = selectedProduct.cost;
      const p = Number(val);
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
      retailPrice: Number(retailPrice),
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
  const poolProducts = products.filter(p => (p.quantity || 0) > 0 || p.retailPrice);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bể</h1>
          <p className="text-slate-500 mt-1 text-sm">Quản lý sản phẩm và số lượng hiện có trong bể.</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-6">
          <div>
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Tổng SP trong bể</p>
            <p className="text-xl font-bold text-indigo-900">{totalItems.toLocaleString()}</p>
          </div>
          <div className="w-px bg-indigo-200"></div>
          <div>
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Giá vốn TB / Món</p>
            <p className="text-xl font-bold text-indigo-900">{Math.round(avgCost).toLocaleString()}đ</p>
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
                value={selectedProduct ? selectedProduct.cost.toLocaleString() : '0'} 
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
              <input type="number" value={retailPrice} onChange={e => handleRetailPriceChange(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm text-slate-900" required placeholder="0" />
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {poolProducts.map(product => {
          const poolQty = product.quantity || 0;
          const isLowInPool = poolQty <= 10;
          
          return (
            <div key={product.id} className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col">
              <div className="aspect-square bg-slate-50 relative p-3">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg border border-slate-200" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
                    <Package className="w-8 h-8 opacity-50" />
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 border border-slate-200 shadow-sm">
                  {product.priceGroup}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col bg-white">
                <h3 className="font-semibold text-base text-slate-900 truncate mb-3">{product.name}</h3>
                
                {isLowInPool && (
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1.5 rounded-md border border-amber-100">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Sắp hết trong bể, cần refill!
                  </div>
                )}

                {(product.warehouseQuantity || 0) <= 10 && (
                  <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 px-2 py-1.5 rounded-md border border-red-100">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Kho sắp hết, cần nhập thêm!
                  </div>
                )}

                <div className="mt-auto space-y-1.5 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-medium text-indigo-700">Trong bể:</span>
                    <input 
                      type="number" 
                      value={poolQty} 
                      onChange={(e) => handleUpdateQuantity(product.id, Number(e.target.value))}
                      className="w-20 text-right border border-indigo-200 rounded px-2 py-1 text-xs font-bold text-indigo-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                    />
                  </div>
                  <div className="flex justify-between text-slate-600 pt-1.5 border-t border-slate-200 mt-1.5">
                    <span>Trong kho:</span>
                    <span className="font-medium">{product.warehouseQuantity || 0}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-1.5 border-t border-slate-200 mt-1.5">
                    <span>Giá vốn:</span>
                    <span className="font-medium">{product.cost.toLocaleString()}đ</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-1.5 border-t border-slate-200 mt-1.5">
                    <span>Giá bán lẻ:</span>
                    <span className="font-medium text-emerald-600">{(product.retailPrice || 0).toLocaleString()}đ</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

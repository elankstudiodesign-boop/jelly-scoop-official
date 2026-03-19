import React, { useState, useRef } from 'react';
import { Product, PriceGroup } from '../types';
import { v4 as uuidv4 } from 'uuid';

export default function Products({ products, addProduct, updateProduct, deleteProduct }: { products: Product[], addProduct: (p: Product) => void, updateProduct: (id: string, updates: Partial<Product>) => void, deleteProduct: (id: string) => void }) {
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [margin, setMargin] = useState('50'); // Default 50%
  const [retailPrice, setRetailPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [priceGroup, setPriceGroup] = useState<PriceGroup>('Thấp');
  const [quantity, setQuantity] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCostChange = (val: string) => {
    setCost(val);
    const c = Number(val);
    const m = Number(margin);
    if (c > 0) {
      setRetailPrice(Math.round(c * (1 + m / 100)).toString());
    } else {
      setRetailPrice('');
    }
  };

  const handleMarginChange = (val: string) => {
    setMargin(val);
    const c = Number(cost);
    const m = Number(val);
    if (c > 0) {
      setRetailPrice(Math.round(c * (1 + m / 100)).toString());
    }
  };

  const handleRetailPriceChange = (val: string) => {
    setRetailPrice(val);
    const c = Number(cost);
    const p = Number(val);
    if (c > 0 && p > 0) {
      setMargin(((p - c) / c * 100).toFixed(1));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cost || !retailPrice) return;
    const newProduct: Product = {
      id: uuidv4(),
      name,
      cost: Number(cost),
      retailPrice: Number(retailPrice),
      margin: Number(margin),
      imageUrl: imageUrl || 'https://picsum.photos/seed/' + encodeURIComponent(name) + '/200/200',
      priceGroup,
      quantity: Number(quantity) || 0
    };
    addProduct(newProduct);
    setName('');
    setCost('');
    setMargin('50');
    setRetailPrice('');
    setImageUrl('');
    setQuantity('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
  };

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    updateProduct(id, { quantity: newQuantity });
  };

  const totalItems = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalCost = products.reduce((sum, p) => sum + (p.cost * (p.quantity || 0)), 0);
  const avgCost = totalItems > 0 ? totalCost / totalItems : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kho sản phẩm</h1>
          <p className="text-slate-500 mt-1 text-sm">Quản lý danh mục sản phẩm, giá vốn và số lượng trong bể.</p>
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
          Thêm sản phẩm mới
        </h2>
        
        <form onSubmit={handleAdd} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Tên sản phẩm</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm text-slate-900" required placeholder="VD: Kẹo dẻo gấu..." />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Hình ảnh</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                ref={fileInputRef}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:rounded-md file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-colors cursor-pointer border border-slate-300 rounded-md bg-white" 
              />
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
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm text-slate-900" placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Giá vốn (VNĐ)</label>
              <input type="number" value={cost} onChange={e => handleCostChange(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm text-slate-900" required placeholder="0" />
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
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors">
              Thêm vào kho
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {products.map(product => (
          <div key={product.id} className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col">
            <div className="aspect-square bg-slate-50 relative p-3">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg border border-slate-200" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
                  <span className="text-sm">Không có ảnh</span>
                </div>
              )}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 border border-slate-200 shadow-sm">
                {product.priceGroup}
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col bg-white">
              <h3 className="font-semibold text-base text-slate-900 truncate mb-3">{product.name}</h3>
              <div className="mt-auto space-y-1.5 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Trong bể:</span>
                  <input 
                    type="number" 
                    value={product.quantity || 0} 
                    onChange={(e) => handleUpdateQuantity(product.id, Number(e.target.value))}
                    className="w-20 text-right border border-slate-300 rounded px-2 py-1 text-xs font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="flex justify-between text-slate-600 pt-1.5 border-t border-slate-200 mt-1.5">
                  <span>Giá vốn:</span>
                  <span className="font-medium">{product.cost.toLocaleString()}đ</span>
                </div>
                <div className="flex justify-between text-slate-900 font-medium">
                  <span>Giá bán:</span>
                  <span>{(product.retailPrice || 0).toLocaleString()}đ</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => handleDelete(product.id)}
              className="absolute top-4 left-4 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-red-600 text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm border border-red-100 hover:bg-red-50"
            >
              Xóa
            </button>
          </div>
        ))}
        {products.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            <p className="font-medium text-base">Kho sản phẩm đang trống</p>
            <p className="text-sm mt-1">Hãy thêm sản phẩm đầu tiên.</p>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Product, ScoopConfig, Transaction, LiveSession } from '../types';
import { useSupabaseConfigs } from '../hooks/useSupabase';
import { defaultConfigs } from './Simulator';
import { v4 as uuidv4 } from 'uuid';
import { CheckCircle, Trash2 } from 'lucide-react';
import { formatCurrency } from '../lib/format';

interface OrderItem {
  product: Product;
  quantity: number;
}

interface LiveProps {
  products: Product[];
  updateProduct: (id: string, updates: Partial<Product>) => void;
  addTransaction: (transaction: Transaction) => void;
  addSession: (session: LiveSession) => void;
}

export default function Live({ products, updateProduct, addTransaction, addSession }: LiveProps) {
  const { configs, loading } = useSupabaseConfigs(defaultConfigs);
  
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (configs.length > 0 && !selectedConfigId) {
      setSelectedConfigId(configs[0].id);
    }
  }, [configs, selectedConfigId]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Đang tải cấu hình...</div>;
  }

  const selectedConfig = configs.find(c => c.id === selectedConfigId);
  const scoopPrice = selectedConfig?.price || 0;
  const packagingCost = 10000;

  const totalCost = orderItems.reduce((sum, item) => sum + (item.product.cost * item.quantity), 0);
  const totalRetail = orderItems.reduce((sum, item) => sum + ((item.product.retailPrice || item.product.cost) * item.quantity), 0);
  const totalItemsCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const netProfit = scoopPrice - totalCost - packagingCost;
  const profitMargin = scoopPrice > 0 ? (netProfit / scoopPrice) * 100 : 0;

  const handleAddProduct = () => {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    setOrderItems(prev => {
      const existing = prev.find(item => item.product.id === selectedProductId);
      if (existing) {
        return prev.map(item => 
          item.product.id === selectedProductId 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSelectedProductId('');
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setOrderItems(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const toggleSelectedItem = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allItemIds = orderItems.map(item => item.product.id);
  const allSelected = allItemIds.length > 0 && selectedItemIds.size === allItemIds.length;
  const someSelected = selectedItemIds.size > 0 && !allSelected;

  const toggleSelectAllItems = () => {
    setSelectedItemIds(prev => {
      if (allSelected) return new Set();
      const next = new Set(prev);
      allItemIds.forEach(id => next.add(id));
      return next;
    });
  };

  const handleDeleteSelectedItems = () => {
    setOrderItems(prev => prev.filter(item => !selectedItemIds.has(item.product.id)));
    setSelectedItemIds(new Set());
  };

  const handleClearOrder = () => {
    setOrderItems([]);
    setSelectedItemIds(new Set());
  };

  const handleCompleteOrder = () => {
    if (orderItems.length === 0) return;

    const now = new Date().toISOString();

    // 1. Deduct inventory
    orderItems.forEach(item => {
      const currentQty = item.product.quantity || 0;
      updateProduct(item.product.id, { quantity: Math.max(0, currentQty - item.quantity) });
    });

    // 2. Add Income Transaction (Revenue)
    addTransaction({
      id: uuidv4(),
      type: 'IN',
      category: 'ORDER',
      amount: scoopPrice,
      description: `Đơn hàng ${selectedConfig?.name} (${totalItemsCount} món)`,
      date: now
    });

    // 3. Add Expense Transaction (Packaging)
    if (packagingCost > 0) {
      addTransaction({
        id: uuidv4(),
        type: 'OUT',
        category: 'PACKAGING',
        amount: packagingCost,
        description: `Chi phí bao bì đơn hàng ${selectedConfig?.name}`,
        date: now
      });
    }

    // 4. Record Session (Analytics)
    addSession({
      id: uuidv4(),
      date: now,
      scoopsSold: 1,
      revenue: scoopPrice,
      tiktokFeePercent: 0,
      packagingCostPerScoop: packagingCost,
      averageScoopCost: totalCost
    });

    alert('Hoàn tất đơn hàng thành công!');
    handleClearOrder();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Đơn hàng</h1>
        <p className="text-slate-500 mt-1 text-sm">Tạo đơn hàng, chọn sản phẩm và tính toán lợi nhuận thực tế.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Order Creation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Tạo đơn hàng mới</h2>
              <button 
                onClick={handleClearOrder}
                className="text-sm text-slate-500 hover:text-red-600 font-medium transition-colors"
              >
                Làm mới
              </button>
            </div>
            
            <div className="space-y-5">
              {/* Select Scoop Size */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Chọn Size Scoop</label>
                <select 
                  value={selectedConfigId}
                  onChange={e => setSelectedConfigId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                >
                  {configs.map(config => (
                    <option key={config.id} value={config.id}>
                      {config.name} - {formatCurrency(config.price)}đ
                    </option>
                  ))}
                </select>
              </div>

              {/* Add Product */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Thêm sản phẩm vào đơn</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select 
                    value={selectedProductId}
                    onChange={e => setSelectedProductId(e.target.value)}
                    className="flex-1 min-w-0 border border-slate-300 rounded-lg px-4 py-2.5 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                  >
                    <option value="">-- Chọn sản phẩm từ kho --</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.priceGroup}) - Vốn: {formatCurrency(product.cost)}đ
                      </option>
                    ))}
                  </select>
                  <button 
                    onClick={handleAddProduct}
                    disabled={!selectedProductId}
                    className="flex-shrink-0 whitespace-nowrap bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    Thêm
                  </button>
                </div>
              </div>

              {/* Order Items List */}
              {orderItems.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-700">Danh sách sản phẩm trong đơn ({totalItemsCount} món)</h3>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-slate-500 select-none cursor-pointer">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAllItems}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Chọn tất cả
                      </label>
                      <button
                        type="button"
                        onClick={handleDeleteSelectedItems}
                        disabled={selectedItemIds.size === 0}
                        className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Xoá {selectedItemIds.size > 0 ? `(${selectedItemIds.size})` : ''}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {orderItems.map((item) => (
                      <div key={item.product.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${selectedItemIds.has(item.product.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedItemIds.has(item.product.id)}
                            onChange={() => toggleSelectedItem(item.product.id)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <img src={item.product.imageUrl} alt={item.product.name} className="w-10 h-10 rounded object-cover border border-slate-200" />
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{item.product.name}</p>
                            <p className="text-xs text-slate-500">Vốn: {formatCurrency(item.product.cost)}đ</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-white border border-slate-200 rounded-md">
                            <button 
                              onClick={() => handleUpdateQuantity(item.product.id, -1)}
                              className="px-2.5 py-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-slate-900">{item.quantity}</span>
                            <button 
                              onClick={() => handleUpdateQuantity(item.product.id, 1)}
                              className="px-2.5 py-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Financial Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-6">
            <h3 className="text-base font-semibold text-slate-800 mb-5">Tổng kết đơn hàng</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600 font-medium text-sm">Giá bán Scoop</span>
                <span className="font-bold text-slate-900">{formatCurrency(scoopPrice)}đ</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600 font-medium text-sm">Tổng giá bán lẻ</span>
                <span className="font-bold text-slate-900">{formatCurrency(totalRetail)}đ</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600 font-medium text-sm">Tổng giá vốn (COGS)</span>
                <span className="font-bold text-slate-900">{formatCurrency(totalCost)}đ</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600 font-medium text-sm">Chi phí bao bì</span>
                <span className="font-bold text-slate-900">{formatCurrency(packagingCost)}đ</span>
              </div>
              
              <div className="border-t border-slate-200 pt-4 mt-2 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-semibold text-sm uppercase tracking-wider">Biên lợi nhuận</span>
                  <span className={`font-bold text-lg ${profitMargin >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {profitMargin.toFixed(1)}%
                  </span>
                </div>
                <div className={`flex justify-between items-center p-4 rounded-xl border ${netProfit > 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-red-50 border-red-100'}`}>
                  <span className={`font-bold text-lg ${netProfit > 0 ? 'text-indigo-900' : 'text-red-900'}`}>Lợi nhuận</span>
                  <div className="text-right">
                    <span className={`font-black text-2xl ${netProfit > 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                      {formatCurrency(netProfit)}đ
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning/Status Message */}
              {orderItems.length > 0 && (
                <div className={`mt-4 p-3 rounded-lg border text-sm font-medium text-center ${
                  profitMargin >= 50 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                    : 'bg-red-50 border-red-100 text-red-700'
                }`}>
                  {profitMargin >= 50 
                    ? 'Đơn hàng có lợi nhuận tốt, an toàn!' 
                    : 'Biên lợi nhuận thấp, cân nhắc giảm bớt món VIP hoặc thêm món rẻ.'}
                </div>
              )}

              {/* Complete Order Button */}
              <div className="pt-4 border-t border-slate-200 mt-6">
                <button
                  onClick={handleCompleteOrder}
                  disabled={orderItems.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <CheckCircle className="w-5 h-5" />
                  Hoàn tất đơn hàng
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

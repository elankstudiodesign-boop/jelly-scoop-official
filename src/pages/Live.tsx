import React, { useState, useEffect } from 'react';
import { Product, ScoopConfig, Transaction, LiveSession } from '../types';
import { useSupabaseConfigs } from '../hooks/useSupabase';
import { defaultConfigs } from './Simulator';
import { v4 as uuidv4 } from 'uuid';
import { CheckCircle, ChevronDown } from 'lucide-react';
import { formatCurrency, parseCurrency } from '../lib/format';

interface OrderItem {
  product: Product;
  quantity: number;
  retailPrice?: number;
}

interface LiveProps {
  products: Product[];
  updateProduct: (id: string, updates: Partial<Product>) => void;
  addTransaction: (transaction: Transaction) => void;
  addSession: (session: LiveSession) => void;
}

export default function Live({ products, updateProduct, addTransaction, addSession }: LiveProps) {
  const { configs, loading } = useSupabaseConfigs(defaultConfigs);
  
  const [orderType, setOrderType] = useState<'SCOOP' | 'RETAIL'>('SCOOP');
  const [selectedConfigId, setSelectedConfigId] = useState<string>(defaultConfigs[0]?.id || '');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemRetailPrice, setItemRetailPrice] = useState<string>('');
  const [retailPackagingCost, setRetailPackagingCost] = useState<string>('');

  useEffect(() => {
    if (configs.length > 0 && !selectedConfigId) {
      setSelectedConfigId(configs[0].id);
    }
  }, [configs, selectedConfigId]);

  useEffect(() => {
    if (selectedProductId && orderType === 'RETAIL') {
      const product = products.find(p => p.id === selectedProductId);
      if (product) {
        setItemRetailPrice(formatCurrency(product.retailPrice || product.cost));
      }
    } else {
      setItemRetailPrice('');
    }
  }, [selectedProductId, orderType, products]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Đang tải cấu hình...</div>;
  }

  const selectedConfig = configs.find(c => c.id === selectedConfigId);
  const scoopPrice = selectedConfig?.price || 0;
  const packagingCost = 10000;

  const totalCost = orderItems.reduce((sum, item) => sum + (item.product.cost * item.quantity), 0);
  const totalRetail = orderItems.reduce((sum, item) => sum + ((item.retailPrice ?? item.product.retailPrice ?? item.product.cost) * item.quantity), 0);
  const totalItemsCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const currentRevenue = orderType === 'SCOOP' ? scoopPrice : totalRetail;
  const currentPackagingCost = orderType === 'SCOOP' ? packagingCost : parseCurrency(retailPackagingCost);

  const netProfit = currentRevenue - totalCost - currentPackagingCost;
  const profitMargin = currentRevenue > 0 ? (netProfit / currentRevenue) * 100 : 0;

  const handleAddProduct = () => {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const availableQty = orderType === 'RETAIL' ? (product.warehouseQuantity || 0) : (product.quantity || 0);
    const parsedRetailPrice = orderType === 'RETAIL' && itemRetailPrice ? parseCurrency(itemRetailPrice) : undefined;

    setOrderItems(prev => {
      const existing = prev.find(item => item.product.id === selectedProductId);
      if (existing) {
        if (existing.quantity >= availableQty) {
          alert(`Chỉ còn ${availableQty} sản phẩm trong ${orderType === 'RETAIL' ? 'kho' : 'bể'}`);
          return prev;
        }
        return prev.map(item => 
          item.product.id === selectedProductId 
            ? { ...item, quantity: item.quantity + 1, retailPrice: parsedRetailPrice ?? item.retailPrice } 
            : item
        );
      }
      if (availableQty <= 0) {
        alert(`Sản phẩm đã hết trong ${orderType === 'RETAIL' ? 'kho' : 'bể'}`);
        return prev;
      }
      return [...prev, { product, quantity: 1, retailPrice: parsedRetailPrice }];
    });
    setSelectedProductId('');
    setItemRetailPrice('');
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setOrderItems(prev => prev.map(item => {
      if (item.product.id === productId) {
        const availableQty = orderType === 'RETAIL' ? (item.product.warehouseQuantity || 0) : (item.product.quantity || 0);
        let newQuantity = Math.max(0, item.quantity + delta);
        if (newQuantity > availableQty) {
          alert(`Chỉ còn ${availableQty} sản phẩm trong ${orderType === 'RETAIL' ? 'kho' : 'bể'}`);
          newQuantity = availableQty;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleClearOrder = () => {
    setOrderItems([]);
    setItemRetailPrice('');
    setRetailPackagingCost('');
  };

  const handleCompleteOrder = () => {
    if (orderItems.length === 0) return;

    const now = new Date().toISOString();

    // 1. Deduct inventory
    orderItems.forEach(item => {
      if (orderType === 'RETAIL') {
        const currentWarehouseQty = item.product.warehouseQuantity || 0;
        updateProduct(item.product.id, { warehouseQuantity: Math.max(0, currentWarehouseQty - item.quantity) });
      } else {
        const currentQty = item.product.quantity || 0;
        updateProduct(item.product.id, { quantity: Math.max(0, currentQty - item.quantity) });
      }
    });

    if (orderType === 'SCOOP') {
      // 2. Add Income Transaction (Revenue)
      addTransaction({
        id: uuidv4(),
        type: 'IN',
        category: 'ORDER',
        amount: scoopPrice,
        description: `Đơn hàng ${selectedConfig?.name} (${totalItemsCount} món)`,
        date: now,
        items: orderItems.map(item => ({ productId: item.product.id, quantity: item.quantity }))
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
    } else {
      // 2. Add Income Transaction (Revenue)
      addTransaction({
        id: uuidv4(),
        type: 'IN',
        category: 'ORDER',
        amount: currentRevenue,
        description: `Đơn hàng lẻ (${totalItemsCount} món)`,
        date: now,
        items: orderItems.map(item => ({ productId: item.product.id, quantity: item.quantity }))
      });

      // 3. Add Expense Transaction (Packaging)
      if (currentPackagingCost > 0) {
        addTransaction({
          id: uuidv4(),
          type: 'OUT',
          category: 'PACKAGING',
          amount: currentPackagingCost,
          description: `Chi phí bao bì đơn hàng lẻ`,
          date: now
        });
      }
    }

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
            
            <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
              <button
                onClick={() => {
                  setOrderType('SCOOP');
                  handleClearOrder();
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${orderType === 'SCOOP' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Đơn Scoop
              </button>
              <button
                onClick={() => {
                  setOrderType('RETAIL');
                  handleClearOrder();
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${orderType === 'RETAIL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Đơn Lẻ
              </button>
            </div>

            <div className="space-y-5">
              {orderType === 'SCOOP' ? (
                /* Select Scoop Size */
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Chọn Size Scoop</label>
                  <div className="relative">
                    <select 
                      value={selectedConfigId}
                      onChange={e => setSelectedConfigId(e.target.value)}
                      className="w-full appearance-none border border-slate-300 rounded-lg px-4 pr-10 py-2.5 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                    >
                      {configs.map(config => (
                        <option key={config.id} value={config.id}>
                          {config.name} - {formatCurrency(config.price)}đ
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ) : (
                /* Retail Order Inputs */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Chi phí bao bì (đ)</label>
                    <input
                      type="text"
                      value={retailPackagingCost}
                      onChange={e => setRetailPackagingCost(formatCurrency(parseCurrency(e.target.value)))}
                      placeholder="VD: 5,000 (Tùy chọn)"
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Add Product */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Thêm sản phẩm vào đơn</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 min-w-0">
                    <select 
                      value={selectedProductId}
                      onChange={e => setSelectedProductId(e.target.value)}
                      className="w-full appearance-none border border-slate-300 rounded-lg px-4 pr-10 py-2.5 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                    >
                      <option value="">-- Chọn sản phẩm từ kho --</option>
                      {products.map(product => {
                        const availableQty = orderType === 'RETAIL' ? (product.warehouseQuantity || 0) : (product.quantity || 0);
                        return (
                          <option key={product.id} value={product.id} disabled={availableQty <= 0}>
                            {product.name} ({product.priceGroup}) - Vốn: {formatCurrency(product.cost)}đ - Sẵn có: {availableQty}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                  {orderType === 'RETAIL' && (
                    <div className="w-full sm:w-40 flex-shrink-0">
                      <input
                        type="text"
                        value={itemRetailPrice}
                        onChange={e => setItemRetailPrice(formatCurrency(parseCurrency(e.target.value)))}
                        placeholder="Giá bán (đ)"
                        className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                      />
                    </div>
                  )}
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
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Danh sách sản phẩm trong đơn ({totalItemsCount} món)</h3>
                  <div className="space-y-3">
                    {orderItems.map((item) => (
                      <div key={item.product.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3">
                          <img src={item.product.imageUrl} alt={item.product.name} className="w-10 h-10 rounded object-cover border border-slate-200" />
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{item.product.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-slate-500">Vốn: {formatCurrency(item.product.cost)}đ</p>
                              {orderType === 'RETAIL' && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <p className="text-xs font-medium text-emerald-600">
                                    Bán: {formatCurrency(item.retailPrice ?? item.product.retailPrice ?? item.product.cost)}đ
                                  </p>
                                </>
                              )}
                            </div>
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
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:sticky lg:top-6">
            <h3 className="text-base font-semibold text-slate-800 mb-5">Tổng kết đơn hàng</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600 font-medium text-sm">Giá bán {orderType === 'SCOOP' ? 'Scoop' : 'Lẻ'}</span>
                <span className="font-bold text-slate-900">{formatCurrency(currentRevenue)}đ</span>
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
                <span className="font-bold text-slate-900">{formatCurrency(currentPackagingCost)}đ</span>
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
                  disabled={orderItems.length === 0 || (orderType === 'RETAIL' && currentRevenue <= 0)}
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


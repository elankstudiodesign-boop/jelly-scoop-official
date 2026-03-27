import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product, ScoopConfig, Transaction, LiveSession, OrderItem, PackagingItem } from '../types';
import { useSupabaseConfigs, executeOrderTransaction, mapTransactionToDB, mapSessionToDB } from '../hooks/useSupabase';
import { addOfflineOrder } from '../lib/syncQueue';
import { useDraftOrderSync, DraftOrderState } from '../hooks/useDraftOrderSync';
import { defaultConfigs } from './Simulator';
import { v4 as uuidv4 } from 'uuid';
import { CheckCircle, ChevronDown, Barcode, ShoppingBag, Package, RefreshCw, Search, X } from 'lucide-react';
import { formatCurrency, parseCurrency, generateBarcodeNumber } from '../lib/format';
import { toast } from 'sonner';
import { hasSupabaseConfig } from '../lib/supabase';

import OrderList from '../components/OrderList';
import BarcodeScanner from '../components/BarcodeScanner';

interface LiveProps {
  products: Product[];
  updateProduct: (id: string, updates: Partial<Product>, localOnly?: boolean) => Promise<void>;
  addTransaction: (transaction: Transaction, localOnly?: boolean) => Promise<void>;
  addSession: (session: LiveSession, localOnly?: boolean) => Promise<void>;
  transactions: Transaction[];
  deleteTransaction: (id: string) => Promise<void>;
  packagingItems: PackagingItem[];
  updatePackagingItem: (id: string, updates: Partial<PackagingItem>, localOnly?: boolean) => Promise<void>;
}

export default function Live({ 
  products, 
  updateProduct, 
  addTransaction, 
  addSession, 
  transactions, 
  deleteTransaction,
  packagingItems,
  updatePackagingItem
}: LiveProps) {
  const { configs, loading } = useSupabaseConfigs(defaultConfigs);
  
  const [activeTab, setActiveTab] = useState<'CREATE' | 'LIST'>('CREATE');
  const [orderType, setOrderType] = useState<'SCOOP' | 'RETAIL'>('SCOOP');
  const [selectedConfigId, setSelectedConfigId] = useState<string>(defaultConfigs[0]?.id || '');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemRetailPrice, setItemRetailPrice] = useState<string>('');
  const [retailPackagingCost, setRetailPackagingCost] = useState<string>('');
  const [scannedPackagingItems, setScannedPackagingItems] = useState<{ item: PackagingItem, quantity: number }[]>([]);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [shippingCost, setShippingCost] = useState<string>('0');
  const [discount, setDiscount] = useState<string>('0');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStateChange = useCallback((newState: Partial<DraftOrderState>) => {
    if (newState.orderType !== undefined) setOrderType(newState.orderType);
    if (newState.selectedConfigId !== undefined) setSelectedConfigId(newState.selectedConfigId);
    if (newState.orderItems !== undefined) setOrderItems(newState.orderItems);
    if (newState.retailPackagingCost !== undefined) setRetailPackagingCost(newState.retailPackagingCost);
    if (newState.customerName !== undefined) setCustomerName(newState.customerName);
    if (newState.customerPhone !== undefined) setCustomerPhone(newState.customerPhone);
    if (newState.customerAddress !== undefined) setCustomerAddress(newState.customerAddress);
    if (newState.scannedPackagingItems !== undefined) setScannedPackagingItems(newState.scannedPackagingItems);
    if (newState.shippingCost !== undefined) setShippingCost(newState.shippingCost);
    if (newState.discount !== undefined) setDiscount(newState.discount);
  }, []);

  const handleOrderCompleted = useCallback(() => {
    setOrderItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setRetailPackagingCost('');
    setScannedPackagingItems([]);
    setSelectedProductId('');
    setProductSearch('');
    setIsProductDropdownOpen(false);
    setItemRetailPrice('');
    setShippingCost('0');
    setDiscount('0');
    setScanResult(null);
    setIsScanning(false);
  }, []);

  const { broadcastStateUpdate, broadcastOrderCompleted, isLocalUpdateRef } = useDraftOrderSync(
    handleStateChange,
    handleOrderCompleted
  );

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  useEffect(() => {
    if (!isLocalUpdateRef.current) {
      broadcastStateUpdate({
        orderType,
        selectedConfigId,
        orderItems,
        retailPackagingCost,
        customerName,
        customerPhone,
        customerAddress,
        scannedPackagingItems,
        shippingCost,
        discount,
      });
    }
  }, [
    orderType,
    selectedConfigId,
    orderItems,
    retailPackagingCost,
    customerName,
    customerPhone,
    customerAddress,
    scannedPackagingItems,
    shippingCost,
    discount,
    broadcastStateUpdate,
  ]);

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

  const addProductToOrder = useCallback((product: Product, customRetailPrice?: number) => {
    const availableQty = orderType === 'RETAIL' ? (product.warehouseQuantity || 0) : (product.quantity || 0);
    
    let parsedRetailPrice: number | undefined;
    if (orderType === 'RETAIL') {
      if (customRetailPrice !== undefined) {
        parsedRetailPrice = customRetailPrice;
      }
    }

    setOrderItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= availableQty) {
          alert(`Chỉ còn ${availableQty} sản phẩm trong ${orderType === 'RETAIL' ? 'kho' : 'bể'}`);
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id 
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
  }, [orderType]);

  const handleScan = useCallback((decodedText: string) => {
    // Check if it's a product or combo
    const product = products.find(p => 
      (p.barcode === decodedText) || 
      (generateBarcodeNumber(p.id) === decodedText)
    );
    
    if (product) {
      let scannedPrice: number | undefined;
      if (orderType === 'RETAIL') {
        scannedPrice = product.retailPrice || product.cost;
        setItemRetailPrice(formatCurrency(scannedPrice));
      }
      addProductToOrder(product, scannedPrice);
      setScanResult({ 
        type: 'success', 
        message: `Đã thêm ${product.isCombo ? 'combo' : 'sản phẩm'}: ${product.name}` 
      });
      return;
    }

    // Check if it's a packaging item
    const packagingItem = packagingItems.find(pi => pi.barcode === decodedText);
    if (packagingItem) {
      setScannedPackagingItems(prev => {
        const existing = prev.find(p => p.item.id === packagingItem.id);
        if (existing) {
          return prev.map(p => p.item.id === packagingItem.id ? { ...p, quantity: p.quantity + 1 } : p);
        }
        return [...prev, { item: packagingItem, quantity: 1 }];
      });
      setScanResult({ type: 'success', message: `Đã thêm bao bì: ${packagingItem.name}` });
      return;
    }

    setScanResult({ type: 'error', message: 'Không tìm thấy sản phẩm hoặc bao bì với mã vạch này!' });
  }, [products, packagingItems, orderType, addProductToOrder]);

  // Derived state
  const selectedConfig = configs.find(c => c.id === selectedConfigId);
  const scoopPrice = selectedConfig?.price || 0;
  const totalItemsCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = orderItems.reduce((sum, item) => sum + (item.product.cost * item.quantity), 0);
  const totalRetail = orderItems.reduce((sum, item) => sum + ((item.retailPrice ?? item.product.retailPrice ?? item.product.cost) * item.quantity), 0);
  
  const currentRevenue = orderType === 'SCOOP' ? scoopPrice : totalRetail;
  
  // Calculate packaging cost from scanned items
  const scannedPackagingCost = scannedPackagingItems.reduce((sum, p) => sum + (p.item.price * p.quantity), 0);
  
  const currentPackagingCost = scannedPackagingCost + (orderType === 'RETAIL' ? parseCurrency(retailPackagingCost) : 0);
  
  const totalAmount = currentRevenue + parseCurrency(shippingCost) - parseCurrency(discount);
  
  const netProfit = currentRevenue - totalCost - currentPackagingCost;
  const profitMargin = currentRevenue > 0 ? (netProfit / currentRevenue) * 100 : 0;

  const handleAddProduct = useCallback(() => {
    const product = products.find(p => p.id === selectedProductId);
    if (product) {
      addProductToOrder(product, orderType === 'RETAIL' ? parseCurrency(itemRetailPrice) : undefined);
    }
  }, [products, selectedProductId, addProductToOrder, orderType, itemRetailPrice]);

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
    handleOrderCompleted();
  };

  const handleCompleteOrder = async () => {
    if (orderItems.length === 0) return;

    const now = new Date().toISOString();

    const description = orderType === 'SCOOP' 
      ? `Đơn hàng ${selectedConfig?.name} (${totalItemsCount} món)` 
      : `Đơn hàng lẻ: ${orderItems.map(i => `${i.product.name} x${i.quantity}`).join(', ')}`;

    const incomeTx: Transaction = {
      id: uuidv4(),
      type: 'IN',
      category: 'ORDER',
      amount: totalAmount,
      description,
      date: now,
      items: orderItems.map(item => ({ productId: item.product.id, quantity: item.quantity, retailPrice: item.retailPrice })),
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined
    };

    const expenseTx: Transaction | null = scannedPackagingCost > 0 ? {
      id: uuidv4(),
      type: 'OUT',
      category: 'PACKAGING',
      amount: scannedPackagingCost,
      description: orderType === 'SCOOP' ? `Chi phí bao bì đơn hàng ${selectedConfig?.name}` : `Chi phí bao bì đơn hàng lẻ`,
      date: now
    } : null;

    const sessionObj: LiveSession | null = orderType === 'SCOOP' ? {
      id: uuidv4(),
      date: now,
      scoopsSold: 1,
      revenue: scoopPrice,
      tiktokFeePercent: 0,
      packagingCostPerScoop: currentPackagingCost,
      averageScoopCost: totalCost
    } : null;

    // 1. Cập nhật giao diện ngay lập tức (Optimistic UI)
    for (const item of orderItems) {
      if (orderType === 'RETAIL') {
        const currentWarehouseQty = item.product.warehouseQuantity || 0;
        await updateProduct(item.product.id, { warehouseQuantity: Math.max(0, currentWarehouseQty - item.quantity) }, true);
      } else {
        const currentQty = item.product.quantity || 0;
        await updateProduct(item.product.id, { quantity: Math.max(0, currentQty - item.quantity) }, true);
      }
    }

    for (const p of scannedPackagingItems) {
      const currentQty = p.item.quantity || 0;
      await updatePackagingItem(p.item.id, { quantity: Math.max(0, currentQty - p.quantity) }, true);
    }

    await addTransaction(incomeTx, true);
    if (expenseTx) await addTransaction(expenseTx, true);
    if (sessionObj) await addSession(sessionObj, true);

    const rpcPayload = {
      p_order_type: orderType,
      p_items: orderItems.map(item => ({ id: item.product.id, quantity: item.quantity })),
      p_packaging_items: scannedPackagingItems.map(p => ({ id: p.item.id, quantity: p.quantity })),
      p_income_transaction: mapTransactionToDB(incomeTx),
      p_expense_transaction: expenseTx ? mapTransactionToDB(expenseTx) : null,
      p_session: sessionObj ? mapSessionToDB(sessionObj) : null
    };

    if (hasSupabaseConfig) {
      if (!navigator.onLine) {
        addOfflineOrder(rpcPayload);
        toast.success('Đã lưu đơn hàng offline. Sẽ đồng bộ khi có mạng!');
      } else {
        try {
          await executeOrderTransaction(rpcPayload);
          toast.success('Hoàn tất đơn hàng thành công!');
        } catch (error: any) {
          console.error('RPC Error:', error);
          if (error.message === 'Failed to fetch' || error.message?.includes('network')) {
            addOfflineOrder(rpcPayload);
            toast.success('Lỗi mạng. Đã lưu đơn hàng offline!');
          } else if (error.message?.includes('Could not find the function') || error.code === 'PGRST202') {
            toast.warning('Chưa cài đặt Database Transaction. Đang dùng phương thức tuần tự...');
            // Fallback: Gọi lại các hàm không có localOnly để lưu lên Supabase
            try {
              for (const item of orderItems) {
                if (orderType === 'RETAIL') {
                  const currentWarehouseQty = item.product.warehouseQuantity || 0;
                  await updateProduct(item.product.id, { warehouseQuantity: Math.max(0, currentWarehouseQty - item.quantity) });
                } else {
                  const currentQty = item.product.quantity || 0;
                  await updateProduct(item.product.id, { quantity: Math.max(0, currentQty - item.quantity) });
                }
              }
              for (const p of scannedPackagingItems) {
                const currentQty = p.item.quantity || 0;
                await updatePackagingItem(p.item.id, { quantity: Math.max(0, currentQty - p.quantity) });
              }
              await addTransaction(incomeTx);
              if (expenseTx) await addTransaction(expenseTx);
              if (sessionObj) await addSession(sessionObj);
            } catch (fallbackError: any) {
              if (fallbackError.message?.includes('column') && fallbackError.message?.includes('does not exist')) {
                toast.error('Lỗi: Thiếu cột dữ liệu trong Supabase. Vui lòng chạy file supabase/update.sql trong SQL Editor.');
              } else {
                toast.error('Lỗi khi lưu đơn hàng tuần tự: ' + fallbackError.message);
              }
            }
          } else if (error.message?.includes('column') && error.message?.includes('does not exist')) {
            toast.error('Lỗi: Thiếu cột dữ liệu trong Supabase. Vui lòng copy nội dung file supabase/update.sql và chạy trong SQL Editor của Supabase.');
          } else {
            toast.error('Lỗi khi hoàn tất đơn hàng: ' + error.message);
          }
        }
      }
    } else {
      toast.success('Hoàn tất đơn hàng (Chế độ Local)!');
    }

    broadcastOrderCompleted();
    handleClearOrder();
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Đang tải cấu hình...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Đơn hàng</h1>
        <p className="text-slate-500 mt-1 text-sm">Quản lý và tạo đơn hàng mới.</p>
      </div>

      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('CREATE')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'CREATE' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Tạo đơn hàng
        </button>
        <button
          onClick={() => setActiveTab('LIST')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'LIST' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Danh sách đơn hàng
        </button>
      </div>

      {activeTab === 'CREATE' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Order Creation */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-4 sm:p-6 rounded-xl border-2 shadow-sm transition-all duration-300 overflow-hidden relative" style={{ borderColor: orderType === 'SCOOP' ? '#e0e7ff' : '#d1fae5' }}>
              {/* Mode Indicator Badge */}
              <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-bl-lg ${
                orderType === 'SCOOP' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
              }`}>
                {orderType === 'SCOOP' ? 'Chế độ Scoop' : 'Chế độ Bán lẻ'}
              </div>

              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  {orderType === 'SCOOP' ? <Package className="w-5 h-5 text-indigo-600" /> : <ShoppingBag className="w-5 h-5 text-emerald-600" />}
                  Tạo đơn hàng
                </h2>
                <button 
                  onClick={handleClearOrder}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 font-semibold transition-colors bg-slate-100 px-2 py-1 rounded-md"
                >
                  <RefreshCw className="w-3 h-3" />
                  Làm mới
                </button>
              </div>
              
              <div className="flex bg-slate-100 p-1.5 rounded-xl mb-8 shadow-inner">
                <button
                  onClick={() => {
                    setOrderType('SCOOP');
                    handleClearOrder();
                  }}
                  className={`flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-all duration-200 ${
                    orderType === 'SCOOP' 
                      ? 'bg-indigo-600 text-white shadow-md transform scale-[1.02]' 
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className="text-sm sm:text-base font-bold">Đơn Scoop</span>
                  <span className={`text-[10px] mt-0.5 opacity-80 hidden sm:inline ${orderType === 'SCOOP' ? 'text-indigo-100' : 'text-slate-500'}`}>
                    Bán theo bể/size
                  </span>
                </button>
                <button
                  onClick={() => {
                    setOrderType('RETAIL');
                    handleClearOrder();
                  }}
                  className={`flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-all duration-200 ${
                    orderType === 'RETAIL' 
                      ? 'bg-emerald-600 text-white shadow-md transform scale-[1.02]' 
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className="text-sm sm:text-base font-bold">Đơn Lẻ</span>
                  <span className={`text-[10px] mt-0.5 opacity-80 hidden sm:inline ${orderType === 'RETAIL' ? 'text-emerald-100' : 'text-slate-500'}`}>
                    Bán lẻ từng món
                  </span>
                </button>
              </div>

              <div className="space-y-6">
                {orderType === 'SCOOP' ? (
                  /* Select Scoop Size */
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                    <div className="space-y-2 sm:col-span-1">
                      <label className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Chọn Size Scoop</label>
                      <div className="relative">
                        <select 
                          value={selectedConfigId}
                          onChange={e => setSelectedConfigId(e.target.value)}
                          className="w-full appearance-none border border-indigo-200 rounded-lg px-4 pr-10 py-3 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-900 font-medium"
                        >
                          {configs.map(config => (
                            <option key={config.id} value={config.id}>
                              {config.name} - {formatCurrency(config.price)}đ
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                      </div>
                    </div>
                    <div className="space-y-2 sm:col-span-1">
                      <label className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Vận chuyển (đ)</label>
                      <input
                        type="text"
                        min="0"
                        value={shippingCost}
                        onChange={e => setShippingCost(formatCurrency(parseCurrency(e.target.value)))}
                        placeholder="0"
                        className="w-full border border-indigo-200 rounded-lg px-4 py-3 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-900 font-medium"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-1">
                      <label className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Giảm giá (đ)</label>
                      <input
                        type="text"
                        min="0"
                        value={discount}
                        onChange={e => setDiscount(formatCurrency(parseCurrency(e.target.value)))}
                        placeholder="0"
                        className="w-full border border-indigo-200 rounded-lg px-4 py-3 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-900 font-medium"
                      />
                    </div>
                  </div>
                ) : (
                  /* Retail Order Inputs */
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Bao bì (đ)</label>
                      <input
                        type="text"
                        min="0"
                        value={retailPackagingCost}
                        onChange={e => setRetailPackagingCost(formatCurrency(parseCurrency(e.target.value)))}
                        placeholder="0"
                        className="w-full border border-emerald-200 rounded-lg px-4 py-3 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-slate-900 font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Vận chuyển (đ)</label>
                      <input
                        type="text"
                        min="0"
                        value={shippingCost}
                        onChange={e => setShippingCost(formatCurrency(parseCurrency(e.target.value)))}
                        placeholder="0"
                        className="w-full border border-emerald-200 rounded-lg px-4 py-3 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-slate-900 font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Giảm giá (đ)</label>
                      <input
                        type="text"
                        min="0"
                        value={discount}
                        onChange={e => setDiscount(formatCurrency(parseCurrency(e.target.value)))}
                        placeholder="0"
                        className="w-full border border-emerald-200 rounded-lg px-4 py-3 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-slate-900 font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* Add Product */}
                <div className={`p-4 rounded-xl border ${orderType === 'SCOOP' ? 'bg-indigo-50/30 border-indigo-100' : 'bg-emerald-50/30 border-emerald-100'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-slate-700">Thêm sản phẩm</label>
                    <button
                      onClick={() => setIsScanning(true)}
                      className="flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-sm"
                    >
                      <Barcode className="w-4 h-4" />
                      Quét mã
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="relative w-full" ref={productDropdownRef}>
                      <div 
                        onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                        className={`w-full border rounded-xl px-4 pr-10 py-3 bg-white outline-none transition-all text-slate-900 font-medium cursor-pointer flex items-center justify-between ${
                          isProductDropdownOpen 
                            ? (orderType === 'SCOOP' ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-emerald-500 ring-2 ring-emerald-100') 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className={selectedProductId ? "text-slate-900" : "text-slate-400"}>
                          {selectedProductId ? products.find(p => p.id === selectedProductId)?.name : "-- Chọn sản phẩm --"}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isProductDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>

                      {isProductDropdownOpen && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type="text"
                                autoFocus
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                placeholder="Tìm tên sản phẩm..."
                                className={`w-full pl-9 pr-8 py-2.5 text-sm border rounded-xl focus:outline-none transition-all ${
                                  orderType === 'SCOOP' ? 'border-indigo-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100' : 'border-emerald-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              />
                              {productSearch && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setProductSearch(''); }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-200 rounded-full transition-colors"
                                >
                                  <X className="w-3.5 h-3.5 text-slate-400" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                            {filteredProducts.length > 0 ? (
                              filteredProducts.map(product => {
                                const availableQty = orderType === 'RETAIL' ? (product.warehouseQuantity || 0) : (product.quantity || 0);
                                const isDisabled = availableQty <= 0;
                                return (
                                  <button
                                    key={product.id}
                                    disabled={isDisabled}
                                    onClick={() => {
                                      setSelectedProductId(product.id);
                                      setIsProductDropdownOpen(false);
                                      setProductSearch('');
                                    }}
                                    className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-all ${
                                      selectedProductId === product.id 
                                        ? (orderType === 'SCOOP' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'bg-emerald-50 text-emerald-700 font-bold') 
                                        : 'hover:bg-slate-50 text-slate-700'
                                    } ${isDisabled ? 'opacity-40 cursor-not-allowed grayscale' : 'active:scale-[0.99]'}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      {product.imageUrl && (
                                        <img src={product.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-100" />
                                      )}
                                      <span className="truncate max-w-[180px]">{product.name}</span>
                                    </div>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                                      availableQty > 10 ? 'bg-emerald-100 text-emerald-700' : availableQty > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                      {availableQty}
                                    </span>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="px-4 py-10 text-center">
                                <Search className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                <p className="text-sm text-slate-400 font-bold italic">Không tìm thấy sản phẩm nào</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {orderType === 'RETAIL' && (
                        <div className="flex-1">
                          <input
                            type="text"
                            value={itemRetailPrice}
                            onChange={e => setItemRetailPrice(formatCurrency(parseCurrency(e.target.value)))}
                            placeholder="Giá bán (đ)"
                            className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-slate-900 font-medium"
                          />
                        </div>
                      )}
                      <button 
                        onClick={handleAddProduct}
                        disabled={!selectedProductId}
                        className={`flex-1 sm:flex-none whitespace-nowrap px-8 py-3 rounded-lg font-bold transition-all shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed ${
                          orderType === 'SCOOP' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        Thêm
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items List */}
              {orderItems.length > 0 && (
                <div className={`mt-8 pt-6 border-t ${orderType === 'SCOOP' ? 'border-indigo-100' : 'border-emerald-100'}`}>
                  <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <div className={`w-1.5 h-4 rounded-full ${orderType === 'SCOOP' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                    Sản phẩm trong đơn ({totalItemsCount})
                  </h3>
                  <div className="space-y-3">
                    {orderItems.map((item) => (
                      <div key={item.product.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        orderType === 'SCOOP' ? 'bg-indigo-50/30 border-indigo-100' : 'bg-emerald-50/30 border-emerald-100'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img src={item.product.imageUrl} alt={item.product.name} className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-sm" />
                            <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${
                              orderType === 'SCOOP' ? 'bg-indigo-600' : 'bg-emerald-600'
                            }`}>
                              {item.quantity}
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm leading-tight">{item.product.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase">Vốn: {formatCurrency(item.product.cost)}đ</p>
                              {orderType === 'RETAIL' && (
                                <p className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded uppercase">
                                  Bán: {formatCurrency(item.retailPrice ?? item.product.retailPrice ?? item.product.cost)}đ
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                          <button 
                            onClick={() => handleUpdateQuantity(item.product.id, -1)}
                            className={`px-3 py-1.5 text-lg font-bold transition-colors ${
                              orderType === 'SCOOP' ? 'text-indigo-600 hover:bg-indigo-50' : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-slate-900">{item.quantity}</span>
                          <button 
                            onClick={() => handleUpdateQuantity(item.product.id, 1)}
                            className={`px-3 py-1.5 text-lg font-bold transition-colors ${
                              orderType === 'SCOOP' ? 'text-indigo-600 hover:bg-indigo-50' : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scanned Packaging Items */}
              {scannedPackagingItems.length > 0 && (
                <div className={`mt-8 pt-6 border-t ${orderType === 'SCOOP' ? 'border-indigo-100' : 'border-emerald-100'}`}>
                  <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-4 rounded-full bg-slate-400"></div>
                    Bao bì đã quét ({scannedPackagingItems.reduce((sum, p) => sum + p.quantity, 0)})
                  </h3>
                  <div className="space-y-3">
                    {scannedPackagingItems.map((p) => (
                      <div key={p.item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-200 shadow-sm">
                            <Barcode className="w-5 h-5 text-slate-500" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{p.item.name}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Giá: {formatCurrency(p.item.price)}đ</p>
                          </div>
                        </div>
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                          <button 
                            onClick={() => {
                              setScannedPackagingItems(prev => prev.map(item => 
                                item.item.id === p.item.id ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item
                              ).filter(item => item.quantity > 0));
                            }}
                            className="px-3 py-1.5 text-lg font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-slate-900">{p.quantity}</span>
                          <button 
                            onClick={() => {
                              setScannedPackagingItems(prev => prev.map(item => 
                                item.item.id === p.item.id ? { ...item, quantity: item.quantity + 1 } : item
                              ));
                            }}
                            className="px-3 py-1.5 text-lg font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Info */}
              <div className={`mt-8 pt-6 border-t ${orderType === 'SCOOP' ? 'border-indigo-100' : 'border-emerald-100'}`}>
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <div className={`w-1.5 h-4 rounded-full ${orderType === 'SCOOP' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                  Thông tin khách hàng
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Tên khách hàng</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Họ và tên..."
                      className={`w-full border rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all ${
                        orderType === 'SCOOP' 
                          ? 'border-indigo-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100' 
                          : 'border-emerald-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                      }`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Số điện thoại</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="09xx xxx xxx..."
                      className={`w-full border rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all ${
                        orderType === 'SCOOP' 
                          ? 'border-indigo-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100' 
                          : 'border-emerald-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                      }`}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Địa chỉ giao hàng</label>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Số nhà, tên đường, phường/xã..."
                      className={`w-full border rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all ${
                        orderType === 'SCOOP' 
                          ? 'border-indigo-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100' 
                          : 'border-emerald-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Right Column: Financial Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className={`bg-white p-6 rounded-xl border-2 shadow-sm lg:sticky lg:top-6 transition-all duration-300 ${
            orderType === 'SCOOP' ? 'border-indigo-100' : 'border-emerald-100'
          }`}>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <div className={`w-2 h-6 rounded-full ${orderType === 'SCOOP' ? 'bg-indigo-600' : 'bg-emerald-600'}`}></div>
              Tổng kết đơn hàng
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600 font-bold text-xs uppercase tracking-wide">Giá bán {orderType === 'SCOOP' ? 'Scoop' : 'Lẻ'}</span>
                <span className="font-black text-slate-900">{formatCurrency(currentRevenue)}đ</span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600 font-bold text-xs uppercase tracking-wide">Vận chuyển</span>
                <span className="font-black text-indigo-600">+{formatCurrency(parseCurrency(shippingCost))}đ</span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600 font-bold text-xs uppercase tracking-wide">Giảm giá</span>
                <span className="font-black text-red-600">-{formatCurrency(parseCurrency(discount))}đ</span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600 font-bold text-xs uppercase tracking-wide">Tổng giá vốn (COGS)</span>
                <span className="font-black text-slate-900">{formatCurrency(totalCost)}đ</span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600 font-bold text-xs uppercase tracking-wide">Chi phí bao bì</span>
                <span className="font-black text-slate-900">{formatCurrency(currentPackagingCost)}đ</span>
              </div>
              
              <div className={`border-t-2 pt-6 mt-4 space-y-4 ${orderType === 'SCOOP' ? 'border-indigo-50' : 'border-emerald-50'}`}>
                <div className="flex justify-between items-center px-1">
                  <span className="text-slate-500 font-bold text-xs uppercase tracking-widest">Biên lợi nhuận</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${profitMargin >= 50 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    <span className={`font-black text-xl ${profitMargin >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {profitMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div className={`flex flex-col p-5 rounded-2xl border-2 shadow-sm transition-all ${
                  netProfit > 0 
                    ? (orderType === 'SCOOP' ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-emerald-600 border-emerald-700 text-white') 
                    : 'bg-red-600 border-red-700 text-white'
                }`}>
                  <span className="font-bold text-xs uppercase tracking-widest opacity-80 mb-1">Tổng cộng thanh toán</span>
                  <span className="font-black text-3xl tracking-tight">
                    {formatCurrency(totalAmount)}đ
                  </span>
                </div>
              </div>

              {/* Warning/Status Message */}
              {orderItems.length > 0 && (
                <div className={`mt-4 p-4 rounded-xl border-2 text-xs font-bold text-center leading-relaxed shadow-sm ${
                  profitMargin >= 50 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                    : 'bg-red-50 border-red-100 text-red-700'
                }`}>
                  {profitMargin >= 50 
                    ? '✨ Đơn hàng có lợi nhuận tốt, an toàn!' 
                    : '⚠️ Biên lợi nhuận thấp, cân nhắc điều chỉnh món!'}
                </div>
              )}

              {/* Complete Order Button */}
              <div className="pt-6">
                <button
                  onClick={handleCompleteOrder}
                  disabled={orderItems.length === 0 || (orderType === 'RETAIL' && currentRevenue <= 0)}
                  className={`w-full py-5 rounded-2xl font-black text-lg uppercase tracking-widest shadow-lg transform active:scale-[0.98] transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:active:scale-100 ${
                    orderType === 'SCOOP' 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200' 
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle className="w-6 h-6" />
                    <span>Hoàn tất đơn hàng</span>
                  </div>
                </button>
                <p className="text-[10px] text-center text-slate-400 mt-4 font-bold uppercase tracking-tighter">
                  Vui lòng kiểm tra kỹ thông tin trước khi hoàn tất
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      ) : (
        <OrderList transactions={transactions} products={products} deleteTransaction={deleteTransaction} />
      )}
      {isScanning && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => {
            setIsScanning(false);
            setScanResult(null);
          }}
          scanResult={scanResult}
          onClearResult={() => setScanResult(null)}
        />
      )}
    </div>
  );
}


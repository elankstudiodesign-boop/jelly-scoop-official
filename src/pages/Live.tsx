import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product, ScoopConfig, Transaction, LiveSession, OrderItem, PackagingItem } from '../types';
import { useSupabaseConfigs, executeOrderTransaction, mapTransactionToDB, mapSessionToDB } from '../hooks/useSupabase';
import { addOfflineOrder } from '../lib/syncQueue';
import { useDraftOrderSync, DraftOrderState } from '../hooks/useDraftOrderSync';
import { defaultConfigs } from './Simulator';
import { v4 as uuidv4 } from 'uuid';
import { CheckCircle, ChevronDown, Barcode } from 'lucide-react';
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

    const incomeTx: Transaction = {
      id: uuidv4(),
      type: 'IN',
      category: 'ORDER',
      amount: totalAmount,
      description: orderType === 'SCOOP' ? `Đơn hàng ${selectedConfig?.name} (${totalItemsCount} món)` : `Đơn hàng lẻ (${totalItemsCount} món)`,
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2 sm:col-span-1">
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
                  <div className="space-y-2 sm:col-span-1">
                    <label className="text-sm font-semibold text-slate-700">Vận chuyển (đ)</label>
                    <input
                      type="text"
                      value={shippingCost}
                      onChange={e => setShippingCost(formatCurrency(parseCurrency(e.target.value)))}
                      placeholder="0"
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-1">
                    <label className="text-sm font-semibold text-slate-700">Giảm giá (đ)</label>
                    <input
                      type="text"
                      value={discount}
                      onChange={e => setDiscount(formatCurrency(parseCurrency(e.target.value)))}
                      placeholder="0"
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                    />
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
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Vận chuyển (đ)</label>
                    <input
                      type="text"
                      value={shippingCost}
                      onChange={e => setShippingCost(formatCurrency(parseCurrency(e.target.value)))}
                      placeholder="0"
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Giảm giá (đ)</label>
                    <input
                      type="text"
                      value={discount}
                      onChange={e => setDiscount(formatCurrency(parseCurrency(e.target.value)))}
                      placeholder="0"
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Add Product */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">Thêm sản phẩm vào đơn</label>
                  <button
                    onClick={() => setIsScanning(true)}
                    className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    <Barcode className="w-4 h-4" />
                    Quét mã vạch
                  </button>
                </div>
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

              {/* Scanned Packaging Items */}
              {scannedPackagingItems.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Bao bì đã quét ({scannedPackagingItems.reduce((sum, p) => sum + p.quantity, 0)} món)</h3>
                  <div className="space-y-3">
                    {scannedPackagingItems.map((p) => (
                      <div key={p.item.id} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-indigo-100 flex items-center justify-center border border-indigo-200">
                            <Barcode className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-indigo-900 text-sm">{p.item.name}</p>
                            <p className="text-xs text-indigo-500">Giá: {formatCurrency(p.item.price)}đ</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-white border border-indigo-200 rounded-md">
                            <button 
                              onClick={() => {
                                setScannedPackagingItems(prev => prev.map(item => 
                                  item.item.id === p.item.id ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item
                                ).filter(item => item.quantity > 0));
                              }}
                              className="px-2.5 py-1 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-indigo-900">{p.quantity}</span>
                            <button 
                              onClick={() => {
                                setScannedPackagingItems(prev => prev.map(item => 
                                  item.item.id === p.item.id ? { ...item, quantity: item.quantity + 1 } : item
                                ));
                              }}
                              className="px-2.5 py-1 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
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

              {/* Customer Info */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Thông tin khách hàng (Tùy chọn)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Tên khách hàng</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nhập tên..."
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Số điện thoại</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Nhập SĐT..."
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Địa chỉ</label>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Nhập địa chỉ..."
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
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
                <span className="text-slate-600 font-medium text-sm">Vận chuyển</span>
                <span className="font-bold text-slate-900">+{formatCurrency(parseCurrency(shippingCost))}đ</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600 font-medium text-sm">Giảm giá</span>
                <span className="font-bold text-slate-900">-{formatCurrency(parseCurrency(discount))}đ</span>
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
                  <span className={`font-bold text-lg ${netProfit > 0 ? 'text-indigo-900' : 'text-red-900'}`}>Tổng cộng</span>
                  <div className="text-right">
                    <span className={`font-black text-2xl ${netProfit > 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                      {formatCurrency(totalAmount)}đ
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


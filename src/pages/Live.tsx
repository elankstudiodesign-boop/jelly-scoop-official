import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product, ScoopConfig, Transaction, LiveSession, OrderItem, PackagingItem } from '../types';
import { useSupabaseConfigs, executeOrderTransaction, mapTransactionToDB, mapSessionToDB } from '../hooks/useSupabase';
import { addOfflineOrder } from '../lib/syncQueue';
import { useDraftOrderSync, DraftOrderState } from '../hooks/useDraftOrderSync';
import { defaultConfigs } from '../constants';
import { v4 as uuidv4 } from 'uuid';
import { CheckCircle, ChevronDown, Barcode, ShoppingBag, Package, RefreshCw, Search, X, Printer, Download, Truck, Tag, Coins, Hash, FileText, Store } from 'lucide-react';
import { formatCurrency, parseCurrency, generateBarcodeNumber } from '../lib/format';
import { toast } from 'sonner';
import { hasSupabaseConfig } from '../lib/supabase';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

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
  const [mobileView, setMobileView] = useState<'PRODUCTS' | 'CART'>('PRODUCTS');
  const [orderType, setOrderType] = useState<'SCOOP' | 'RETAIL'>('SCOOP');
  const [retailPricingMode, setRetailPricingMode] = useState<'ITEM' | 'SCOOP'>('ITEM');
  const [selectedConfigId, setSelectedConfigId] = useState<string>(defaultConfigs[0]?.id || '');
  const [scoopQuantity, setScoopQuantity] = useState<string>('1');
  const [scoopNotes, setScoopNotes] = useState<string>('');
  const [customScoopPrice, setCustomScoopPrice] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemRetailPrice, setItemRetailPrice] = useState<string>('');
  const [retailPackagingCost, setRetailPackagingCost] = useState<string>('');
  const [scannedPackagingItems, setScannedPackagingItems] = useState<{ item: PackagingItem, quantity: number }[]>([]);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [invoiceDisplayMode, setInvoiceDisplayMode] = useState<'RETAIL_TOTAL' | 'SCOOP_TOTAL'>('SCOOP_TOTAL');
  const [shippingCost, setShippingCost] = useState<string>('0');
  const [discount, setDiscount] = useState<string>('0');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'CUSTOMER' | 'INTERNAL' | null>(null);
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
    if (newState.retailPricingMode !== undefined) setRetailPricingMode(newState.retailPricingMode);
    if (newState.selectedConfigId !== undefined) setSelectedConfigId(newState.selectedConfigId);
    if (newState.orderItems !== undefined) setOrderItems(newState.orderItems);
    if (newState.retailPackagingCost !== undefined) setRetailPackagingCost(newState.retailPackagingCost);
    if (newState.customerName !== undefined) setCustomerName(newState.customerName);
    if (newState.customerPhone !== undefined) setCustomerPhone(newState.customerPhone);
    if (newState.customerAddress !== undefined) setCustomerAddress(newState.customerAddress);
    if (newState.scannedPackagingItems !== undefined) setScannedPackagingItems(newState.scannedPackagingItems);
    if (newState.shippingCost !== undefined) setShippingCost(newState.shippingCost);
    if (newState.discount !== undefined) setDiscount(newState.discount);
    if (newState.customScoopPrice !== undefined) setCustomScoopPrice(newState.customScoopPrice);
    if (newState.scoopQuantity !== undefined) setScoopQuantity(newState.scoopQuantity);
    if (newState.scoopNotes !== undefined) setScoopNotes(newState.scoopNotes);
  }, []);

  const handleOrderCompleted = useCallback(() => {
    setOrderItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setRetailPackagingCost('');
    setRetailPricingMode('ITEM');
    setScannedPackagingItems([]);
    setSelectedProductId('');
    setProductSearch('');
    setIsProductDropdownOpen(false);
    setItemRetailPrice('');
    setShippingCost('0');
    setDiscount('0');
    setCustomScoopPrice('');
    setScoopQuantity('1');
    setScoopNotes('');
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
        retailPricingMode,
        selectedConfigId,
        orderItems,
        retailPackagingCost,
        customerName,
        customerPhone,
        customerAddress,
        scannedPackagingItems,
        shippingCost,
        discount,
        customScoopPrice,
        scoopQuantity,
        scoopNotes,
      });
    }
  }, [
    orderType,
    retailPricingMode,
    selectedConfigId,
    orderItems,
    retailPackagingCost,
    customerName,
    customerPhone,
    customerAddress,
    scannedPackagingItems,
    shippingCost,
    discount,
    customScoopPrice,
    scoopQuantity,
    scoopNotes,
    broadcastStateUpdate,
  ]);

  useEffect(() => {
    if (configs.length > 0 && !selectedConfigId) {
      setSelectedConfigId(configs[0].id);
    }
  }, [configs, selectedConfigId]);

  useEffect(() => {
    if (selectedConfigId) {
      const config = configs.find(c => c.id === selectedConfigId);
      if (config) {
        setCustomScoopPrice(formatCurrency(config.price));
      }
    }
  }, [selectedConfigId, configs]);

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
        const updatedItem = { ...existing, quantity: existing.quantity + 1, retailPrice: parsedRetailPrice ?? existing.retailPrice };
        return [updatedItem, ...prev.filter(item => item.product.id !== product.id)];
      }
      if (availableQty <= 0) {
        alert(`Sản phẩm đã hết trong ${orderType === 'RETAIL' ? 'kho' : 'bể'}`);
        return prev;
      }
      return [{ product, quantity: 1, retailPrice: parsedRetailPrice }, ...prev];
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
  const scoopPrice = customScoopPrice ? parseCurrency(customScoopPrice) : (selectedConfig?.price || 0);
  const numScoopQuantity = Number(scoopQuantity) || 0;
  const totalItemsCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = orderItems.reduce((sum, item) => sum + (item.product.cost * item.quantity), 0);
  const totalRetail = orderItems.reduce((sum, item) => sum + ((item.retailPrice ?? item.product.retailPrice ?? item.product.cost) * item.quantity), 0);
  
  const isScoopPricing = orderType === 'SCOOP' || (orderType === 'RETAIL' && retailPricingMode === 'SCOOP');
  const currentRevenue = isScoopPricing ? (scoopPrice * numScoopQuantity) : totalRetail;
  
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
    if (orderItems.length === 0 && orderType !== 'SCOOP') return;

    const now = new Date().toISOString();
    const numScoopQuantity = Number(scoopQuantity) || 0;
    const isScoopPricing = orderType === 'SCOOP' || (orderType === 'RETAIL' && retailPricingMode === 'SCOOP');

    let description = isScoopPricing 
      ? `Đơn hàng Scoop x${numScoopQuantity} (${totalItemsCount} món)` 
      : `Đơn hàng lẻ: ${orderItems.map(i => `${i.product.name} x${i.quantity}`).join(', ')}`;
      
    if (isScoopPricing && scoopNotes.trim()) {
      description += ` - Ghi chú: ${scoopNotes.trim()}`;
    }

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
      customerAddress: customerAddress.trim() || undefined,
      metadata: {
        shippingCost: parseCurrency(shippingCost),
        discount: parseCurrency(discount),
        totalRetail,
        isScoopPricing,
        scoopQuantity: numScoopQuantity,
        scoopPrice,
        invoiceDisplayMode
      }
    };

    const expenseTx: Transaction | null = scannedPackagingCost > 0 ? {
      id: uuidv4(),
      type: 'OUT',
      category: 'PACKAGING',
      amount: scannedPackagingCost,
      description: isScoopPricing ? `Chi phí bao bì đơn hàng Scoop x${numScoopQuantity}` : `Chi phí bao bì đơn hàng lẻ`,
      date: now
    } : null;

    const sessionObj: LiveSession | null = isScoopPricing ? {
      id: uuidv4(),
      date: now,
      scoopsSold: numScoopQuantity,
      revenue: scoopPrice * numScoopQuantity,
      tiktokFeePercent: 0,
      packagingCostPerScoop: numScoopQuantity > 0 ? currentPackagingCost / numScoopQuantity : 0,
      averageScoopCost: numScoopQuantity > 0 ? totalCost / numScoopQuantity : 0
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

  const handleDownloadCustomerPDF = async () => {
    setPrintMode('CUSTOMER');
    // Wait for the overlay to render
    setTimeout(async () => {
      const element = document.getElementById('print-content');
      if (element) {
        try {
          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          const imgData = canvas.toDataURL('image/png');
          
          // Use a temporary jsPDF instance just to get image properties
          const tempPdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 100] });
          const imgProps = tempPdf.getImageProperties(imgData);
          const pdfWidth = 80;
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          
          // Create a new PDF with dynamic height based on content
          const finalPdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, Math.max(100, pdfHeight)]
          });

          finalPdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          finalPdf.save(`HoaDon_JellyScoop_${new Date().getTime()}.pdf`);
          toast.success('Đã tải hoá đơn PDF!');
        } catch (error) {
          console.error('PDF Error:', error);
          toast.error('Lỗi khi tạo PDF');
        } finally {
          setPrintMode(null);
        }
      }
    }, 500);
  };

  const handlePrintInternal = () => {
    setPrintMode('INTERNAL');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  useEffect(() => {
    const handleAfterPrint = async () => {
      if (printMode === 'INTERNAL') {
        await handleCompleteOrder();
      }
      setPrintMode(null);
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [printMode]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Đang tải cấu hình...</div>;
  }

  return (
    <div className="flex-1 flex flex-col gap-4 lg:gap-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">Đơn hàng</h1>
        <p className="text-slate-500 mt-1 text-sm">Quản lý và tạo đơn hàng mới.</p>
      </div>

      <div className="flex border-b border-slate-200 shrink-0">
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
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          {/* Mobile View Toggle */}
          {orderType !== 'SCOOP' && (
            <div className="lg:hidden flex bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setMobileView('PRODUCTS')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mobileView === 'PRODUCTS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Sản phẩm
              </button>
              <button
                onClick={() => setMobileView('CART')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mobileView === 'CART' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Giỏ hàng
                {orderItems.length > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full">{orderItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                )}
              </button>
            </div>
          )}

          {/* Left Column: Product Grid (POS) */}
          {orderType !== 'SCOOP' && (
            <div className={`flex-1 flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-0 ${mobileView === 'PRODUCTS' ? 'flex' : 'hidden lg:flex'}`}>
              {/* Search & Scanner Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-3 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Tìm tên sản phẩm..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
                {productSearch && (
                  <button 
                    onClick={() => setProductSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsScanning(true)}
                className="flex items-center justify-center w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors shrink-0"
              >
                <Barcode className="w-5 h-5" />
              </button>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredProducts.map(product => {
                    const availableQty = orderType === 'RETAIL' ? (product.warehouseQuantity || 0) : (product.quantity || 0);
                    const isDisabled = availableQty <= 0;
                    return (
                      <button
                        key={product.id}
                        disabled={isDisabled}
                        onClick={() => addProductToOrder(product, orderType === 'RETAIL' ? (product.retailPrice || product.cost) : undefined)}
                        className={`flex flex-col text-left bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98] ${isDisabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                      >
                        <div className="h-24 w-full bg-slate-100 relative">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <Package className="w-8 h-8" />
                            </div>
                          )}
                          <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                            availableQty > 10 ? 'bg-emerald-500 text-white' : availableQty > 0 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                          }`}>
                            {availableQty}
                          </div>
                        </div>
                        <div className="p-2.5 flex-1 flex flex-col justify-between">
                          <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight mb-1">{product.name}</p>
                          <p className="text-xs font-black text-indigo-600">
                            {formatCurrency(orderType === 'RETAIL' ? (product.retailPrice || product.cost) : product.cost)}đ
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Search className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-bold">Không tìm thấy sản phẩm</p>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Right Column: Cart Panel */}
          <div className={`w-full ${orderType === 'SCOOP' ? 'max-w-2xl mx-auto' : 'lg:w-[400px] xl:w-[450px]'} flex-1 lg:flex-none flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0 min-h-0 lg:h-full ${mobileView === 'CART' || orderType === 'SCOOP' ? 'flex' : 'hidden lg:flex'}`}>
            
            {/* Header: Order Type Toggle & Clear */}
            <div className="p-3 sm:p-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex bg-slate-100 p-1.5 rounded-xl flex-1">
                <button
                  onClick={() => { setOrderType('SCOOP'); handleClearOrder(); }}
                  className={`flex-1 py-2.5 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                    orderType === 'SCOOP' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  Đơn Scoop
                </button>
                <button
                  onClick={() => { setOrderType('RETAIL'); handleClearOrder(); }}
                  className={`flex-1 py-2.5 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                    orderType === 'RETAIL' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  Đơn Lẻ
                </button>
              </div>
              <button 
                onClick={handleClearOrder}
                className="p-2.5 sm:p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                title="Làm mới đơn hàng"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Cart Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50/30 flex flex-col relative">
              <div className="p-2 sm:p-4 space-y-4 sm:space-y-6 flex-1 lg:flex-none">
              
              {/* Scoop Mode Banner */}
              {orderType === 'SCOOP' && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-start gap-3">
                  <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-indigo-900">Chế độ Đơn Scoop</h3>
                    <p className="text-xs text-indigo-700 mt-0.5">Chỉ tạo hoá đơn PDF, không trừ kho sản phẩm.</p>
                  </div>
                </div>
              )}

              {/* Retail Mode Banner */}
              {orderType === 'RETAIL' && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600 shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-900">Chế độ Đơn Lẻ</h3>
                    <p className="text-xs text-emerald-700 mt-0.5">Bán lẻ sản phẩm, trừ trực tiếp vào kho.</p>
                  </div>
                </div>
              )}

              {/* Order Items List */}
              {orderType !== 'SCOOP' && (
                orderItems.length > 0 ? (
                  <div className="space-y-2">
                    {orderItems.map((item) => (
                      <div key={item.product.id} className="flex gap-2 sm:gap-3 p-2 sm:p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <img src={item.product.imageUrl} alt={item.product.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-slate-100 shrink-0" />
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <p className="font-bold text-slate-800 text-xs leading-tight line-clamp-2 pr-2">{item.product.name}</p>
                            <button onClick={() => handleUpdateQuantity(item.product.id, -item.quantity)} className="text-slate-300 hover:text-red-500">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs font-black text-indigo-600">
                              {formatCurrency(item.retailPrice ?? item.product.retailPrice ?? item.product.cost)}đ
                            </p>
                            <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden">
                              <button onClick={() => handleUpdateQuantity(item.product.id, -1)} className="px-2.5 sm:px-3 py-1 text-slate-600 hover:bg-slate-200 font-bold">-</button>
                              <span className="w-6 sm:w-8 text-center text-xs font-bold text-slate-900">{item.quantity}</span>
                              <button onClick={() => handleUpdateQuantity(item.product.id, 1)} className="px-2.5 sm:px-3 py-1 text-slate-600 hover:bg-slate-200 font-bold">+</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400">
                    <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-bold">Chưa có sản phẩm</p>
                  </div>
                )
              )}

              {/* Scanned Packaging Items */}
              {orderType !== 'SCOOP' && scannedPackagingItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Bao bì đã quét</h4>
                  {scannedPackagingItems.map((p) => (
                    <div key={p.item.id} className="flex gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-200 shrink-0">
                        <Package className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-slate-800 text-xs leading-tight line-clamp-1 pr-2">{p.item.name}</p>
                          <button onClick={() => setScannedPackagingItems(prev => prev.filter(item => item.item.id !== p.item.id))} className="text-slate-300 hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[10px] font-bold text-slate-500">{formatCurrency(p.item.price)}đ</p>
                          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
                            <button onClick={() => setScannedPackagingItems(prev => prev.map(item => item.item.id === p.item.id ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item).filter(item => item.quantity > 0))} className="px-2 py-0.5 text-slate-600 hover:bg-slate-50 font-bold">-</button>
                            <span className="w-6 text-center text-[10px] font-bold text-slate-900">{p.quantity}</span>
                            <button onClick={() => setScannedPackagingItems(prev => prev.map(item => item.item.id === p.item.id ? { ...item, quantity: item.quantity + 1 } : item))} className="px-2 py-0.5 text-slate-600 hover:bg-slate-50 font-bold">+</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Order Settings (Scoop / Retail) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                  <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Cấu hình đơn hàng</h4>
                </div>
                
                {orderType === 'SCOOP' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số lượng Scoop</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={scoopQuantity}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '') { setScoopQuantity(''); return; }
                            const num = parseInt(val.replace(/[^0-9]/g, ''));
                            if (!isNaN(num)) setScoopQuantity(Math.min(10000, num).toString());
                          }}
                          onBlur={() => { if (scoopQuantity === '' || Number(scoopQuantity) < 1) setScoopQuantity('1'); }}
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giá Scoop</label>
                        <input
                          type="text"
                          value={customScoopPrice}
                          onChange={e => setCustomScoopPrice(formatCurrency(parseCurrency(e.target.value)))}
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ghi chú</label>
                      <textarea
                        value={scoopNotes}
                        onChange={e => setScoopNotes(e.target.value)}
                        placeholder="Ghi chú hoá đơn..."
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300 resize-none h-20"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex bg-slate-100/80 p-1 rounded-xl">
                      <button
                        onClick={() => setRetailPricingMode('ITEM')}
                        className={`flex-1 py-2 px-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          retailPricingMode === 'ITEM' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Tính theo món
                      </button>
                      <button
                        onClick={() => setRetailPricingMode('SCOOP')}
                        className={`flex-1 py-2 px-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          retailPricingMode === 'SCOOP' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Tính theo Scoop
                      </button>
                    </div>
                    {retailPricingMode === 'SCOOP' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số lượng Scoop</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={scoopQuantity}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '') { setScoopQuantity(''); return; }
                              const num = parseInt(val.replace(/[^0-9]/g, ''));
                              if (!isNaN(num)) setScoopQuantity(Math.min(10000, num).toString());
                            }}
                            onBlur={() => { if (scoopQuantity === '' || Number(scoopQuantity) < 1) setScoopQuantity('1'); }}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giá Scoop</label>
                          <input
                            type="text"
                            value={customScoopPrice}
                            onChange={e => setCustomScoopPrice(formatCurrency(parseCurrency(e.target.value)))}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                          />
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bao bì (đ)</label>
                        <input
                          type="text"
                          value={retailPackagingCost}
                          onChange={e => setRetailPackagingCost(formatCurrency(parseCurrency(e.target.value)))}
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vận chuyển (đ)</label>
                        <input
                          type="text"
                          value={shippingCost}
                          onChange={e => setShippingCost(formatCurrency(parseCurrency(e.target.value)))}
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giảm giá (đ)</label>
                        <input
                          type="text"
                          value={discount}
                          onChange={e => setDiscount(formatCurrency(parseCurrency(e.target.value)))}
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Customer Info */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                  <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Thông tin khách hàng</h4>
                </div>
                <div className="space-y-3">
                  <div className="relative group">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Tên khách hàng"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                    />
                  </div>
                  <div className="relative group">
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Số điện thoại"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                    />
                  </div>
                  <div className="relative group">
                    <textarea
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Địa chỉ giao hàng"
                      rows={2}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300 resize-none"
                    />
                  </div>
                </div>
              </div>
              </div>

            {/* Sticky Footer: Summary & Pay */}
            <div className="sticky bottom-0 lg:static p-5 lg:p-6 lg:mx-4 lg:mb-6 border-t lg:border border-slate-200 bg-white lg:rounded-2xl shadow-[0_-8px_30px_rgb(0,0,0,0.04)] lg:shadow-sm z-10 mt-auto lg:mt-0">
              {isScoopPricing && orderType === 'RETAIL' && (
                <div className="mb-4 flex items-center gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-100 backdrop-blur-sm">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      id="invoiceDisplayMode"
                      checked={invoiceDisplayMode === 'RETAIL_TOTAL'}
                      onChange={(e) => setInvoiceDisplayMode(e.target.checked ? 'RETAIL_TOTAL' : 'SCOOP_TOTAL')}
                      className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500/20 transition-all cursor-pointer"
                    />
                  </div>
                  <label htmlFor="invoiceDisplayMode" className="text-[11px] font-bold text-slate-600 cursor-pointer select-none uppercase tracking-tight">
                    In hoá đơn theo giá bán lẻ (ẩn giá Scoop)
                  </label>
                </div>
              )}

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tổng giá vốn</span>
                  <span className="text-sm font-bold text-slate-500 tabular-nums">
                    {formatCurrency(totalCost)}đ
                  </span>
                </div>
                <div className="flex justify-between items-end pt-2 border-t border-slate-50">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest pb-1">Tổng thanh toán</span>
                  <div className="text-right">
                    <span className={`text-3xl font-black tracking-tighter tabular-nums ${orderType === 'SCOOP' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                      {formatCurrency(totalAmount)}
                    </span>
                    <span className={`text-sm font-black ml-1 ${orderType === 'SCOOP' ? 'text-indigo-400' : 'text-emerald-400'}`}>đ</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                {orderType === 'SCOOP' ? (
                  <button
                    onClick={handleDownloadCustomerPDF}
                    disabled={Number(scoopQuantity) <= 0}
                    className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 shadow-[0_4px_12px_rgba(79,70,229,0.3)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.4)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Tải PDF đơn hàng
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleDownloadCustomerPDF}
                      disabled={orderItems.length === 0}
                      className="py-4 rounded-xl font-black text-xs uppercase tracking-widest border-2 border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Tải PDF
                    </button>
                    <button
                      onClick={handlePrintInternal}
                      disabled={orderItems.length === 0}
                      className="py-4 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-[0_4px_12px_rgba(5,150,105,0.3)] hover:shadow-[0_6px_20px_rgba(5,150,105,0.4)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Printer className="w-4 h-4" />
                      In & Hoàn tất
                    </button>
                  </div>
                )}
                
                {orderType === 'RETAIL' && (
                  <button
                    onClick={handleCompleteOrder}
                    disabled={orderItems.length === 0 || currentRevenue <= 0}
                    className="w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Chỉ hoàn tất (Không in hoá đơn)
                  </button>
                )}
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

      {/* Print Area Overlay */}
      {printMode && (
        <div id="print-area" className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center p-4 overflow-y-auto">
          <button 
            onClick={() => setPrintMode(null)}
            className="absolute top-6 right-6 p-3 bg-white rounded-full hover:bg-slate-100 shadow-xl transition-all print:hidden"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>

          <div id="print-content" style={{ backgroundColor: '#ffffff', color: '#0f172a', width: '80mm' }} className="mx-auto p-3 shadow-2xl rounded-sm border-t-2 border-[#4f46e5] print:border-none print:shadow-none print:m-0">
            <div className="text-center mb-3">
              <h1 style={{ color: '#4f46e5' }} className="text-xl font-black uppercase tracking-tighter mb-1">
                Jelly Scoop
              </h1>
              <div style={{ backgroundColor: '#4f46e5' }} className="h-0.5 w-8 mx-auto"></div>
              <h2 style={{ color: '#0f172a' }} className="text-[10px] font-bold uppercase tracking-tight mt-2">
                {printMode === 'CUSTOMER' ? 'Hoá đơn khách hàng' : 'Hoá đơn nội bộ'}
              </h2>
              <p style={{ color: '#94a3b8' }} className="text-[7px] font-bold mt-0.5 uppercase tracking-widest">{new Date().toLocaleDateString('vi-VN')}</p>
            </div>

            <div style={{ borderColor: '#cbd5e1' }} className="border-t border-b border-dashed py-2 mb-2">
              <div style={{ color: '#94a3b8' }} className="grid grid-cols-12 font-black text-[7px] uppercase tracking-widest mb-1">
                <div className="col-span-5">Sản phẩm</div>
                <div className="col-span-3 text-right">Đơn giá</div>
                <div className="col-span-1 text-center">SL</div>
                <div className="col-span-3 text-right">T.Tiền</div>
              </div>
              
              <div className="space-y-1">
                {/* Always show items for Retail orders or Internal mode */}
                {(orderType === 'RETAIL' || printMode === 'INTERNAL') && orderItems.map((item, idx) => (
                  <div key={idx} style={{ color: '#1e293b' }} className="grid grid-cols-12 text-[9px] font-bold leading-normal py-0.5">
                    <div className="col-span-5 break-words">{item.product.name}</div>
                    <div className="col-span-3 text-right">{formatCurrency(item.retailPrice ?? item.product.retailPrice ?? item.product.cost)}</div>
                    <div className="col-span-1 text-center">x{item.quantity}</div>
                    <div className="col-span-3 text-right">{formatCurrency((item.retailPrice ?? item.product.retailPrice ?? item.product.cost) * item.quantity)}đ</div>
                  </div>
                ))}
                
                {/* Scoop item row for Scoop orders */}
                {orderType === 'SCOOP' && (
                  <div style={{ color: '#1e293b' }} className="grid grid-cols-12 text-[9px] font-bold leading-normal py-0.5">
                    <div className="col-span-5 break-words">Scoop</div>
                    <div className="col-span-3 text-right">{formatCurrency(scoopPrice)}</div>
                    <div className="col-span-1 text-center">x{Number(scoopQuantity) || 0}</div>
                    <div className="col-span-3 text-right">{formatCurrency(scoopPrice * (Number(scoopQuantity) || 0))}đ</div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              {/* Summary Section */}
              <div style={{ color: '#64748b' }} className="flex justify-between text-[8px] font-bold pt-1">
                <span>Tổng số lượng sản phẩm:</span>
                <span>{orderType === 'SCOOP' ? (Number(scoopQuantity) || 0) : totalItemsCount} món</span>
              </div>

              {isScoopPricing && orderType === 'RETAIL' && invoiceDisplayMode === 'SCOOP_TOTAL' && (
                <>
                  <div style={{ color: '#64748b' }} className="flex justify-between text-[8px] font-bold">
                    <span>Tổng đơn hàng (giá lẻ):</span>
                    <span>{formatCurrency(totalRetail)}đ</span>
                  </div>
                  <div style={{ color: '#4f46e5' }} className="flex justify-between text-[9px] font-black">
                    <span>Giá ưu đãi Scoop:</span>
                    <span>{formatCurrency(currentRevenue)}đ</span>
                  </div>
                  {totalRetail > currentRevenue && (
                    <div style={{ color: '#059669' }} className="flex justify-between text-[9px] font-black italic">
                      <span>Tiết kiệm được:</span>
                      <span>{formatCurrency(totalRetail - currentRevenue)}đ</span>
                    </div>
                  )}
                </>
              )}

              {!(isScoopPricing && orderType === 'RETAIL' && invoiceDisplayMode === 'RETAIL_TOTAL') && (printMode === 'INTERNAL' || (printMode === 'CUSTOMER' && (parseCurrency(shippingCost) > 0 || parseCurrency(discount) > 0))) && (
                <div className="space-y-0.5 pt-1 border-t border-slate-100 mt-1">
                  <div style={{ color: '#64748b' }} className="flex justify-between text-[8px] font-bold">
                    <span>Tạm tính:</span>
                    <span>{formatCurrency(currentRevenue)}đ</span>
                  </div>
                  {parseCurrency(shippingCost) > 0 && (
                    <div style={{ color: '#64748b' }} className="flex justify-between text-[8px] font-bold">
                      <span>Vận chuyển:</span>
                      <span>+{formatCurrency(parseCurrency(shippingCost))}đ</span>
                    </div>
                  )}
                  {parseCurrency(discount) > 0 && (
                    <div style={{ color: '#64748b' }} className="flex justify-between text-[8px] font-bold">
                      <span>Giảm giá:</span>
                      <span>-{formatCurrency(parseCurrency(discount))}đ</span>
                    </div>
                  )}
                </div>
              )}
              
              {scoopNotes && (
                <div style={{ borderTopColor: '#f1f5f9', borderBottomColor: '#f1f5f9' }} className="py-1 border-t border-b my-1">
                  <p style={{ color: '#94a3b8' }} className="text-[7px] font-black uppercase tracking-widest mb-0.5">Ghi chú:</p>
                  <p style={{ color: '#1e293b' }} className="text-[9px] font-medium whitespace-pre-wrap leading-tight">{scoopNotes}</p>
                </div>
              )}

              <div style={{ borderTopColor: '#0f172a', color: '#0f172a' }} className="flex justify-between text-base font-black pt-1 border-t mt-1">
                <span>TỔNG CỘNG:</span>
                <span>{formatCurrency(invoiceDisplayMode === 'RETAIL_TOTAL' && isScoopPricing && orderType === 'RETAIL' ? totalRetail : totalAmount)}đ</span>
              </div>
            </div>

            <div style={{ borderTopColor: '#f1f5f9' }} className="mt-4 text-center border-t pt-2">
              <p style={{ color: '#475569' }} className="text-[9px] font-bold italic">Cảm ơn quý khách đã ủng hộ!</p>
              <div className="mt-2 space-y-0.5">
                <p style={{ color: '#1e293b' }} className="text-[10px] font-black flex items-center justify-center gap-1">
                  <span style={{ color: '#4f46e5' }}>Zalo:</span> 0886 849 783
                </p>
                <p style={{ color: '#1e293b' }} className="text-[10px] font-black flex items-center justify-center gap-1">
                  <span style={{ color: '#4f46e5' }}>Instagram:</span> jellystore.official
                </p>
                <p style={{ color: '#1e293b' }} className="text-[10px] font-black flex items-center justify-center gap-1">
                  <span style={{ color: '#4f46e5' }}>TikTok:</span> jellyscoop
                </p>
              </div>
              <p style={{ color: '#94a3b8' }} className="text-[7px] mt-2 uppercase tracking-tighter">Hệ thống quản lý Live Order</p>
            </div>
          </div>

          <div className="mt-8 text-white font-bold text-sm animate-pulse flex items-center gap-2 print:hidden">
            <Printer className="w-4 h-4" />
            Đang mở hộp thoại in...
          </div>
        </div>
      )}
    </div>
  );
}


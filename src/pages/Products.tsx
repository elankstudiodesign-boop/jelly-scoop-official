import React, { useEffect, useRef, useState } from 'react';
import { Product, PriceGroup, Supplier } from '../types';
import { 
  AlertCircle, 
  ArrowDownToLine, 
  Package, 
  RotateCcw, 
  Edit2, 
  Truck, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  LayoutGrid, 
  List,
  Info,
  TrendingUp,
  Box,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { formatCurrency, parseCurrency } from '../lib/format';
import EditProductModal from '../components/EditProductModal';
import { motion, AnimatePresence } from 'motion/react';

interface ProductsProps {
  products: Product[];
  addProduct: (p: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  suppliers: Supplier[];
}

type TabType = 'all' | 'in-pool' | 'in-warehouse' | 'low-stock';

export default function Products({ products, updateProduct, deleteProduct, suppliers }: ProductsProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [margin, setMargin] = useState('50');
  const [retailPrice, setRetailPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [priceGroup, setPriceGroup] = useState<PriceGroup>('Thấp');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriceGroup, setFilterPriceGroup] = useState<'Tất cả' | PriceGroup>('Tất cả');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const product = products.find(p => p.id === id);
    if (product) {
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

  const handleAdd = async (e: React.FormEvent) => {
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

    setIsSubmitting(true);
    try {
      const newPoolQuantity = (selectedProduct.quantity || 0) + numQuantity;
      const newWarehouseQuantity = (selectedProduct.warehouseQuantity || 0) - numQuantity;

      await updateProduct(selectedProduct.id, {
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
      setNotification({ type: 'success', message: 'Đã thêm vào bể thành công!' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error adding to pool:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    updateProduct(id, { quantity: newQuantity });
  };

  // Filtering logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriceGroup = filterPriceGroup === 'Tất cả' || p.priceGroup === filterPriceGroup;
    
    let matchesTab = true;
    if (activeTab === 'in-pool') matchesTab = (p.quantity || 0) > 0;
    else if (activeTab === 'in-warehouse') matchesTab = (p.warehouseQuantity || 0) > 0;
    else if (activeTab === 'low-stock') matchesTab = (p.warehouseQuantity || 0) < 5 || (p.quantity || 0) < 5;

    return matchesSearch && matchesPriceGroup && matchesTab;
  });

  const totalPoolItems = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalWarehouseItems = products.reduce((sum, p) => sum + (p.warehouseQuantity || 0), 0);
  const lowStockCount = products.filter(p => (p.warehouseQuantity || 0) < 5 || (p.quantity || 0) < 5).length;

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

    setSelectedIds(new Set());
    setIsSelectionMode(false);

    setNotification({
      type: 'success',
      message: actionable.length === 1 ? 'Đã hoàn kho thành công!' : `Đã hoàn kho ${actionable.length} sản phẩm!`
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredProducts.map(p => p.id);
    const allSelected = visibleIds.every(id => selectedIds.has(id));
    
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border ${
              notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <Info className="w-5 h-5" />
            <span className="font-medium text-sm">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 text-slate-400 hover:text-slate-600">
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Package className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Kho Hàng Hoá</h1>
          </div>
          <p className="text-slate-500 font-medium text-lg ml-1">Quản lý tồn kho và phân phối sản phẩm thông minh.</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full lg:w-auto">
          <div className="group bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-indigo-50 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                <TrendingUp className="w-5 h-5 text-indigo-600 group-hover:text-white" />
              </div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Trong bể</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-900 tracking-tight">{totalPoolItems}</span>
              <span className="text-xs font-bold text-slate-400 uppercase">Món</span>
            </div>
          </div>

          <div className="group bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <Box className="w-5 h-5 text-emerald-600 group-hover:text-white" />
              </div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Trong kho</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-900 tracking-tight">{totalWarehouseItems}</span>
              <span className="text-xs font-bold text-slate-400 uppercase">Món</span>
            </div>
          </div>

          <div className="group bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-rose-100 transition-all duration-300 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-rose-50 rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300">
                <AlertTriangle className="w-5 h-5 text-rose-600 group-hover:text-white" />
              </div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Cần nhập</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-900 tracking-tight">{lowStockCount}</span>
              <span className="text-xs font-bold text-slate-400 uppercase">Sản phẩm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add to Pool Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button 
          onClick={() => setIsAddFormOpen(!isAddFormOpen)}
          className="w-full flex items-center justify-between p-4 md:p-6 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-slate-800">Đổ hàng vào bể</h2>
              <p className="text-xs text-slate-500">Chuyển sản phẩm từ kho vào bể để bán lẻ (Scoop)</p>
            </div>
          </div>
          {isAddFormOpen ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
        </button>

        <AnimatePresence>
          {isAddFormOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-slate-100"
            >
              <form onSubmit={handleAdd} className="p-4 md:p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chọn sản phẩm từ kho</label>
                    <select 
                      value={selectedProductId} 
                      onChange={e => handleProductSelect(e.target.value)} 
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-900" 
                      required
                    >
                      <option value="" disabled>-- Chọn sản phẩm --</option>
                      {products.filter(p => (p.warehouseQuantity || 0) > 0).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Kho: {p.warehouseQuantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nhóm giá (Scoop)</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['Thấp', 'Trung', 'Cao', 'Cao cấp'] as PriceGroup[]).map(group => (
                        <button
                          key={group}
                          type="button"
                          onClick={() => setPriceGroup(group)}
                          className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                            priceGroup === group 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                              : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                          }`}
                        >
                          {group}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Số lượng đổ vào bể</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        min="0"
                        max={selectedProduct?.warehouseQuantity || 0}
                        value={quantity} 
                        onChange={e => setQuantity(e.target.value)} 
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-900" 
                        placeholder="0" 
                        required
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">MÓN</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Giá vốn (VNĐ)</label>
                    <div className="px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-400">
                      {selectedProduct ? formatCurrency(selectedProduct.cost) : '0'}đ
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">% Lợi nhuận</label>
                    <div className="relative">
                      <input type="number" min="0" step="0.1" value={margin} onChange={e => handleMarginChange(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-900" required />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Giá bán lẻ (VNĐ)</label>
                    <div className="relative">
                      <input type="text" min="0" value={retailPrice} onChange={e => handleRetailPriceChange(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-emerald-600" required placeholder="0" />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">VNĐ</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsAddFormOpen(false)}
                    className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit" 
                    disabled={!selectedProduct || isSubmitting} 
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      'Xác nhận đổ bể'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Inventory Section */}
      <div className="space-y-5">
        {/* Tabs & Filters Header */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Segmented Control Tabs */}
            <div className="relative flex bg-slate-200/40 p-1.5 rounded-[20px] border border-slate-200/50 w-full lg:w-auto overflow-x-auto no-scrollbar shadow-inner backdrop-blur-sm">
              <div className="flex min-w-full lg:min-w-0 gap-1">
                {[
                  { id: 'all', label: 'Tất cả', icon: Package },
                  { id: 'in-pool', label: 'Trong bể', icon: TrendingUp },
                  { id: 'in-warehouse', label: 'Trong kho', icon: Box },
                  { id: 'low-stock', label: 'Sắp hết', icon: AlertTriangle },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`relative flex items-center justify-center gap-2.5 px-5 py-2.5 text-xs md:text-sm font-extrabold rounded-2xl transition-all whitespace-nowrap z-10 flex-1 lg:flex-none ${
                      activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                    <tab.icon className={`relative w-4 h-4 z-20 ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`} />
                    <span className="relative z-20">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* View Mode & Actions Group */}
            <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto">
              <div className="flex bg-slate-200/40 p-1.5 rounded-[20px] border border-slate-200/50 shadow-inner backdrop-blur-sm">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 rounded-2xl transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Chế độ lưới"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 rounded-2xl transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Chế độ danh sách"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 flex-1 lg:flex-none">
                <button
                  onClick={() => setIsSelectionMode(!isSelectionMode)}
                  className={`flex-1 lg:flex-none px-5 py-3 rounded-[20px] text-xs md:text-sm font-black transition-all border shadow-sm ${
                    isSelectionMode 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {isSelectionMode ? 'Hủy chọn' : 'Chọn nhiều'}
                </button>
                {isSelectionMode && (
                  <button
                    onClick={() => handleReturnToWarehouse(Array.from(selectedIds))}
                    disabled={selectedIds.size === 0}
                    className="px-5 py-3 bg-rose-600 text-white rounded-[20px] text-xs md:text-sm font-black shadow-xl shadow-rose-200 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline">Hoàn kho</span> ({selectedIds.size})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Tìm tên sản phẩm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-[22px] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-sm font-bold transition-all shadow-sm placeholder:text-slate-400"
              />
            </div>

            <div className="relative w-full sm:w-72">
              <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                value={filterPriceGroup} 
                onChange={e => setFilterPriceGroup(e.target.value as any)}
                className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-[22px] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-sm font-bold transition-all appearance-none cursor-pointer shadow-sm"
              >
                <option value="Tất cả">Tất cả nhóm giá</option>
                <option value="Thấp">Nhóm Thấp</option>
                <option value="Trung">Nhóm Trung</option>
                <option value="Cao">Nhóm Cao</option>
                <option value="Cao cấp">Nhóm Cao cấp</option>
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Product List/Grid */}
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
          : "space-y-3"
        }>
          {filteredProducts.map(product => (
            <ProductCard 
              key={product.id}
              product={product}
              viewMode={viewMode}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.has(product.id)}
              onToggleSelect={() => toggleSelected(product.id)}
              onEdit={() => setEditingProduct(product)}
              onUpdateQuantity={handleUpdateQuantity}
              suppliers={suppliers}
            />
          ))}
          
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="inline-flex p-6 bg-slate-100 rounded-full text-slate-400">
                <Search className="w-12 h-12" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Không tìm thấy sản phẩm</h3>
                <p className="text-slate-500">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={(id, updates) => {
            updateProduct(id, updates);
            setNotification({ type: 'success', message: 'Đã cập nhật sản phẩm thành công!' });
            setTimeout(() => setNotification(null), 3000);
          }}
        />
      )}
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  viewMode: 'grid' | 'list';
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  suppliers: Supplier[];
}

function ProductCard({ product, viewMode, isSelectionMode, isSelected, onToggleSelect, onEdit, onUpdateQuantity, suppliers }: ProductCardProps) {
  const poolQty = product.quantity || 0;
  const warehouseQty = product.warehouseQuantity || 0;
  const isLowInPool = poolQty < 5;
  const isLowInWarehouse = warehouseQty < 5;
  const supplier = suppliers.find(s => s.id === product.supplierId);

  if (viewMode === 'list') {
    return (
      <div className={`group relative bg-white border rounded-2xl p-4 flex items-center gap-4 transition-all hover:shadow-md hover:border-indigo-200 ${isSelected ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-200'}`}>
        {isSelectionMode && (
          <div className="flex-shrink-0">
            <input 
              type="checkbox" 
              checked={isSelected} 
              onChange={onToggleSelect}
              className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        )}
        
        <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200 group-hover:border-indigo-200 transition-colors">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <Package className="w-6 h-6" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{product.name}</h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              product.priceGroup === 'Thấp' ? 'bg-emerald-100 text-emerald-700' :
              product.priceGroup === 'Trung' ? 'bg-amber-100 text-amber-700' :
              product.priceGroup === 'Cao' ? 'bg-rose-100 text-rose-700' :
              'bg-indigo-100 text-indigo-700'
            }`}>
              {product.priceGroup}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Bể: <b className="text-indigo-600 font-extrabold">{poolQty}</b></span>
            <span className="flex items-center gap-1.5"><Box className="w-3.5 h-3.5 text-emerald-400" /> Kho: <b className="text-emerald-600 font-extrabold">{warehouseQty}</b></span>
            {supplier && <span className="flex items-center gap-1.5 text-slate-400"><Truck className="w-3.5 h-3.5" /> {supplier.name}</span>}
          </div>
        </div>

        <div className="hidden md:flex flex-col items-end gap-1 px-6 border-l border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giá bán lẻ</span>
          <span className="text-lg font-black text-emerald-600">{formatCurrency(product.retailPrice || 0)}đ</span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onEdit} 
            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            title="Chỉnh sửa"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative bg-white border rounded-[32px] overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-2 flex flex-col ${isSelected ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-200'}`}>
      {/* Image Area */}
      <div className="aspect-square bg-slate-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-200">
            <Package className="w-16 h-16" />
          </div>
        )}
        
        {/* Badges Overlay */}
        <div className="absolute inset-0 p-5 flex flex-col justify-between pointer-events-none z-20">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-2 pointer-events-auto">
              {isSelectionMode && (
                <input 
                  type="checkbox" 
                  checked={isSelected} 
                  onChange={onToggleSelect}
                  className="w-6 h-6 rounded-xl border-white/50 bg-white/80 backdrop-blur-md text-indigo-600 focus:ring-indigo-500 shadow-lg cursor-pointer transition-transform hover:scale-110"
                />
              )}
              <span className={`px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg backdrop-blur-md border border-white/20 ${
                product.priceGroup === 'Thấp' ? 'bg-emerald-500/90 text-white' :
                product.priceGroup === 'Trung' ? 'bg-amber-500/90 text-white' :
                product.priceGroup === 'Cao' ? 'bg-rose-500/90 text-white' :
                'bg-indigo-500/90 text-white'
              }`}>
                {product.priceGroup}
              </span>
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }} 
              className="p-3 bg-white/80 backdrop-blur-md text-slate-600 hover:text-indigo-600 rounded-2xl shadow-lg border border-white/20 transition-all pointer-events-auto hover:scale-110 active:scale-95 group/edit"
            >
              <Edit2 className="w-4 h-4 transition-transform group-hover:rotate-12" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {isLowInPool && (
              <div className="bg-amber-500/90 backdrop-blur-md text-white px-3 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 shadow-lg border border-white/10 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" /> BỂ SẮP HẾT
              </div>
            )}
            {isLowInWarehouse && (
              <div className="bg-rose-500/90 backdrop-blur-md text-white px-3 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 shadow-lg border border-white/10">
                <AlertTriangle className="w-3.5 h-3.5" /> KHO SẮP HẾT
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 flex-1 flex flex-col space-y-6">
        <div>
          <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2 min-h-[3rem]">{product.name}</h3>
          <div className="flex items-center gap-2 mt-2">
            <div className="p-1.5 bg-slate-100 rounded-lg">
              <Truck className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate">
              {supplier?.name || 'Chưa gán NCC'}
            </span>
          </div>
        </div>

        {product.note && (
          <div className="relative group/note">
            <p className="text-[11px] text-slate-500 line-clamp-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 italic leading-relaxed">
              "{product.note}"
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-indigo-50/30 rounded-[28px] p-5 border border-indigo-100/50 group-hover:border-indigo-200 transition-all duration-300 group-hover:bg-indigo-50/50">
            <span className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Trong bể</span>
            <div className="flex items-center justify-between">
              <input 
                type="number" 
                min="0"
                value={poolQty} 
                onChange={(e) => onUpdateQuantity(product.id, Number(e.target.value))}
                className="w-full bg-transparent border-none p-0 text-3xl font-black text-indigo-700 focus:ring-0 outline-none hover:text-indigo-800 transition-colors tabular-nums"
              />
              <TrendingUp className="w-5 h-5 text-indigo-300 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="bg-emerald-50/30 rounded-[28px] p-5 border border-emerald-100/50 group-hover:border-emerald-200 transition-all duration-300 group-hover:bg-emerald-50/50">
            <span className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">Trong kho</span>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-emerald-700 tabular-nums">{warehouseQty}</span>
              <Box className="w-5 h-5 text-emerald-300 group-hover:scale-110 transition-transform" />
            </div>
          </div>
        </div>

        <div className="pt-5 border-t border-slate-100 flex items-center justify-between mt-auto">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Giá bán lẻ</span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-black text-emerald-600 tracking-tighter tabular-nums">{formatCurrency(product.retailPrice || 0)}</span>
              <span className="text-xs font-black text-emerald-400">đ</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Giá vốn</span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-base font-black text-slate-600 tabular-nums">{formatCurrency(product.cost)}</span>
              <span className="text-[10px] font-black text-slate-400">đ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

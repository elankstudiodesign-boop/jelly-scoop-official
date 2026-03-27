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
  AlertTriangle
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
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriceGroup, setFilterPriceGroup] = useState<'Tất cả' | PriceGroup>('Tất cả');
  const [filterCategory, setFilterCategory] = useState('Tất cả');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];

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
    setNotification({ type: 'success', message: 'Đã thêm vào bể thành công!' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    updateProduct(id, { quantity: newQuantity });
  };

  // Filtering logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriceGroup = filterPriceGroup === 'Tất cả' || p.priceGroup === filterPriceGroup;
    const matchesCategory = filterCategory === 'Tất cả' || p.category === filterCategory;
    
    let matchesTab = true;
    if (activeTab === 'in-pool') matchesTab = (p.quantity || 0) > 0;
    else if (activeTab === 'in-warehouse') matchesTab = (p.warehouseQuantity || 0) > 0;
    else if (activeTab === 'low-stock') matchesTab = (p.warehouseQuantity || 0) < 5 || (p.quantity || 0) < 5;

    return matchesSearch && matchesPriceGroup && matchesCategory && matchesTab;
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
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">KHO HÀNG HOÁ</h1>
          <p className="text-slate-500 font-medium">Quản lý tồn kho, danh mục và phân phối sản phẩm.</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full lg:w-auto">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Trong bể</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-indigo-600">{totalPoolItems}</span>
              <div className="p-2 bg-indigo-50 rounded-lg">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Trong kho</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-emerald-600">{totalWarehouseItems}</span>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Box className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Cần nhập</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-rose-600">{lowStockCount}</span>
              <div className="p-2 bg-rose-50 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
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
                    disabled={!selectedProduct} 
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    Xác nhận đổ bể
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Inventory Section */}
      <div className="space-y-4">
        {/* Tabs & Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between overflow-x-auto no-scrollbar pb-2 sm:pb-0">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
              {[
                { id: 'all', label: 'Tất cả', icon: Package },
                { id: 'in-pool', label: 'Trong bể', icon: TrendingUp },
                { id: 'in-warehouse', label: 'Trong kho', icon: Box },
                { id: 'low-stock', label: 'Sắp hết', icon: AlertTriangle },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="hidden md:flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm ml-4">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-slate-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Tìm tên sản phẩm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium shadow-sm"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                value={filterPriceGroup} 
                onChange={e => setFilterPriceGroup(e.target.value as any)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium shadow-sm appearance-none cursor-pointer"
              >
                <option value="Tất cả">Tất cả nhóm giá</option>
                <option value="Thấp">Nhóm Thấp</option>
                <option value="Trung">Nhóm Trung</option>
                <option value="Cao">Nhóm Cao</option>
                <option value="Cao cấp">Nhóm Cao cấp</option>
              </select>
            </div>

            <div className="relative">
              <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                value={filterCategory} 
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium shadow-sm appearance-none cursor-pointer"
              >
                <option value="Tất cả">Tất cả danh mục</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSelectionMode(!isSelectionMode)}
                className={`flex-1 px-4 py-3 rounded-2xl text-sm font-bold transition-all border ${
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
                  className="px-4 py-3 bg-rose-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-rose-100 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Hoàn kho ({selectedIds.size})
                </button>
              )}
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
      <div className={`group relative bg-white border rounded-2xl p-4 flex items-center gap-4 transition-all hover:shadow-md ${isSelected ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-200'}`}>
        {isSelectionMode && (
          <input 
            type="checkbox" 
            checked={isSelected} 
            onChange={onToggleSelect}
            className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
        )}
        
        <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
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
            <h3 className="font-bold text-slate-900 truncate">{product.name}</h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              product.priceGroup === 'Thấp' ? 'bg-emerald-100 text-emerald-700' :
              product.priceGroup === 'Trung' ? 'bg-amber-100 text-amber-700' :
              product.priceGroup === 'Cao' ? 'bg-rose-100 text-rose-700' :
              'bg-indigo-100 text-indigo-700'
            }`}>
              {product.priceGroup}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Bể: <b className="text-indigo-600">{poolQty}</b></span>
            <span className="flex items-center gap-1"><Box className="w-3 h-3" /> Kho: <b className="text-emerald-600">{warehouseQty}</b></span>
            {product.category && <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">{product.category}</span>}
          </div>
        </div>

        <div className="hidden md:flex flex-col items-end gap-1 px-4 border-l border-slate-100">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Giá bán</span>
          <span className="text-lg font-black text-emerald-600">{formatCurrency(product.retailPrice || 0)}đ</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative bg-white border rounded-3xl overflow-hidden transition-all hover:shadow-xl flex flex-col ${isSelected ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
      {/* Image Area */}
      <div className="aspect-square bg-slate-50 relative overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Package className="w-12 h-12" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isSelectionMode && (
            <input 
              type="checkbox" 
              checked={isSelected} 
              onChange={onToggleSelect}
              className="w-6 h-6 rounded-xl border-white/50 bg-white/80 backdrop-blur-sm text-indigo-600 focus:ring-indigo-500 shadow-sm"
            />
          )}
          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md ${
            product.priceGroup === 'Thấp' ? 'bg-emerald-500/90 text-white' :
            product.priceGroup === 'Trung' ? 'bg-amber-500/90 text-white' :
            product.priceGroup === 'Cao' ? 'bg-rose-500/90 text-white' :
            'bg-indigo-500/90 text-white'
          }`}>
            {product.priceGroup}
          </span>
        </div>

        {product.category && (
          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-1 bg-white/80 backdrop-blur-md rounded-xl text-[10px] font-bold text-slate-700 shadow-sm border border-white/50">
              {product.category}
            </span>
          </div>
        )}

        {/* Status Overlay */}
        {(isLowInPool || isLowInWarehouse) && (
          <div className="absolute bottom-3 left-3 right-3 flex gap-2">
            {isLowInPool && (
              <div className="flex-1 bg-amber-500/90 backdrop-blur-md text-white px-2 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1 shadow-sm">
                <AlertCircle className="w-3 h-3" /> BỂ SẮP HẾT
              </div>
            )}
            {isLowInWarehouse && (
              <div className="flex-1 bg-rose-500/90 backdrop-blur-md text-white px-2 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1 shadow-sm">
                <AlertTriangle className="w-3 h-3" /> KHO SẮP HẾT
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 flex-1 flex flex-col space-y-4">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h3 className="font-black text-slate-900 leading-tight truncate group-hover:text-indigo-600 transition-colors">{product.name}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
              {supplier?.name || 'Chưa gán NCC'}
            </p>
          </div>
          <button onClick={onEdit} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex-shrink-0">
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {product.note && (
          <p className="text-[11px] text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded-xl border border-slate-100 italic">
            "{product.note}"
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-indigo-50 rounded-2xl p-3 border border-indigo-100">
            <span className="block text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Trong bể</span>
            <div className="flex items-center justify-between">
              <input 
                type="number" 
                min="0"
                value={poolQty} 
                onChange={(e) => onUpdateQuantity(product.id, Number(e.target.value))}
                className="w-full bg-transparent border-none p-0 text-lg font-black text-indigo-700 focus:ring-0 outline-none"
              />
              <TrendingUp className="w-3 h-3 text-indigo-300" />
            </div>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100">
            <span className="block text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Trong kho</span>
            <div className="flex items-center justify-between">
              <span className="text-lg font-black text-emerald-700">{warehouseQty}</span>
              <Box className="w-3 h-3 text-emerald-300" />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Giá bán lẻ</span>
            <span className="text-lg font-black text-emerald-600">{formatCurrency(product.retailPrice || 0)}đ</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Giá vốn</span>
            <span className="text-xs font-bold text-slate-600">{formatCurrency(product.cost)}đ</span>
          </div>
        </div>
      </div>
    </div>
  );
}

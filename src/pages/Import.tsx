import React from 'react';
import { motion } from 'motion/react';
import { Package, Truck, Box, Layers, AlertCircle, CheckCircle2, RefreshCw, X, TrendingUp, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { Product, Transaction, Supplier, PackagingItem } from '../types';
import { useImportManager } from '../hooks/useImportManager';
import { ImportForm } from '../components/import/ImportForm';
import { SupplierForm } from '../components/import/SupplierForm';
import { PackagingForm } from '../components/import/PackagingForm';
import { InventoryTable } from '../components/import/InventoryTable';
import { SupplierDetailModal } from '../components/import/SupplierDetailModal';
import { AssignSupplierModal } from '../components/import/AssignSupplierModal';
import EditProductModal from '../components/EditProductModal';
import BarcodePrintModal from '../components/BarcodePrintModal';
import ComboTab from '../components/ComboTab';

interface ImportProps {
  products: Product[];
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  suppliers: Supplier[];
  addSupplier: (supplier: Supplier) => Promise<void>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  packagingItems: PackagingItem[];
  addPackagingItem: (item: PackagingItem) => Promise<void>;
  updatePackagingItem: (id: string, updates: Partial<PackagingItem>) => Promise<void>;
  deletePackagingItem: (id: string) => Promise<void>;
  transactions: Transaction[];
}

export default function Import({
  products,
  addProduct,
  updateProduct,
  addTransaction,
  deleteProduct,
  suppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
  packagingItems,
  addPackagingItem,
  updatePackagingItem,
  deletePackagingItem,
  transactions
}: ImportProps) {
  const manager = useImportManager({
    products,
    addProduct,
    updateProduct,
    addTransaction,
    deleteProduct,
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    packagingItems,
    addPackagingItem,
    updatePackagingItem,
    deletePackagingItem
  });

  const {
    activeTab, setActiveTab,
    notification,
    selectedSupplierForDetail, setSelectedSupplierForDetail,
    assigningSupplierForProductId, setAssigningSupplierForProductId,
    modalSupplierId, setModalSupplierId,
    showBarcodeModal, setShowBarcodeModal,
    printItems,
    inventoryStockFilter, setInventoryStockFilter
  } = manager;

  const handleSync = () => {
    window.location.reload();
  };

  const warehouseStats = {
    totalItems: products.reduce((sum, p) => sum + (p.warehouseQuantity || 0), 0),
    lowStock: products.filter(p => (p.warehouseQuantity || 0) < 4 && (p.warehouseQuantity || 0) > 0).length,
    outOfStock: products.filter(p => (p.warehouseQuantity || 0) === 0).length,
    totalValue: products.reduce((sum, p) => sum + ((p.warehouseQuantity || 0) * p.cost), 0)
  };

  return (
    <div className="w-full px-2 sm:px-4 lg:px-4 py-2 sm:py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Quản Lý Kho Hàng</h1>
          </div>
          <p className="text-slate-500 font-medium text-lg ml-1">Theo dõi tồn kho, nhập hàng và in mã vạch chuyên nghiệp.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          {/* Segmented Control Tabs */}
          <div className="relative flex bg-slate-200/40 p-1.5 rounded-[24px] border border-slate-200/50 w-full sm:w-auto overflow-x-auto no-scrollbar shadow-inner backdrop-blur-sm">
            <div className="flex min-w-full sm:min-w-0 gap-1">
              {[
                { id: 'import', label: 'Nhập kho', icon: Package },
                { id: 'suppliers', label: 'Nhà cung cấp', icon: Truck },
                { id: 'packaging', label: 'Bao bì', icon: Box },
                { id: 'combo', label: 'Combo', icon: Layers },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative flex items-center justify-center gap-2.5 px-6 py-3 text-xs md:text-sm font-black rounded-2xl transition-all whitespace-nowrap z-10 flex-1 sm:flex-none ${
                    activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="importActiveTab"
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

          <button 
            onClick={handleSync}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-[22px] transition-all border border-slate-200 font-black text-sm shadow-sm active:scale-95 w-full sm:w-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Đồng bộ dữ liệu</span>
            <span className="sm:hidden">Đồng bộ</span>
          </button>
        </div>
      </div>

      {/* Warehouse Stats - Only on Import Tab */}
      {activeTab === 'import' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
          <div 
            onClick={() => setInventoryStockFilter('all')}
            className={`group p-5 sm:p-6 rounded-3xl border transition-all duration-300 cursor-pointer hover:shadow-xl active:scale-95 ${
              inventoryStockFilter === 'all' 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' 
                : 'bg-white border-slate-200 shadow-sm hover:border-indigo-100'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-2xl transition-colors duration-300 ${
                inventoryStockFilter === 'all' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
              }`}>
                <Package className="w-5 h-5" />
              </div>
              <span className={`text-[11px] font-black uppercase tracking-widest ${
                inventoryStockFilter === 'all' ? 'text-indigo-100' : 'text-slate-400'
              }`}>Tổng tồn kho</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-black tracking-tight ${
                inventoryStockFilter === 'all' ? 'text-white' : 'text-slate-900'
              }`}>{warehouseStats.totalItems}</span>
              <span className={`text-xs font-bold uppercase ${
                inventoryStockFilter === 'all' ? 'text-indigo-200' : 'text-slate-400'
              }`}>Món</span>
            </div>
          </div>

          <div 
            onClick={() => setInventoryStockFilter('low')}
            className={`group p-5 sm:p-6 rounded-3xl border transition-all duration-300 cursor-pointer hover:shadow-xl active:scale-95 ${
              inventoryStockFilter === 'low' 
                ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200' 
                : 'bg-white border-slate-200 shadow-sm hover:border-orange-100'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-2xl transition-colors duration-300 ${
                inventoryStockFilter === 'low' ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white'
              }`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className={`text-[11px] font-black uppercase tracking-widest ${
                inventoryStockFilter === 'low' ? 'text-orange-100' : 'text-slate-400'
              }`}>Sắp hết hàng</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-black tracking-tight ${
                inventoryStockFilter === 'low' ? 'text-white' : 'text-slate-900'
              }`}>{warehouseStats.lowStock}</span>
              <span className={`text-xs font-bold uppercase ${
                inventoryStockFilter === 'low' ? 'text-orange-200' : 'text-slate-400'
              }`}>Mã hàng</span>
            </div>
          </div>

          <div 
            onClick={() => setInventoryStockFilter('out')}
            className={`group p-5 sm:p-6 rounded-3xl border transition-all duration-300 cursor-pointer hover:shadow-xl active:scale-95 ${
              inventoryStockFilter === 'out' 
                ? 'bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-200' 
                : 'bg-white border-slate-200 shadow-sm hover:border-rose-100'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-2xl transition-colors duration-300 ${
                inventoryStockFilter === 'out' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white'
              }`}>
                <X className="w-5 h-5" />
              </div>
              <span className={`text-[11px] font-black uppercase tracking-widest ${
                inventoryStockFilter === 'out' ? 'text-rose-100' : 'text-slate-400'
              }`}>Hết hàng</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-black tracking-tight ${
                inventoryStockFilter === 'out' ? 'text-white' : 'text-slate-900'
              }`}>{warehouseStats.outOfStock}</span>
              <span className={`text-xs font-bold uppercase ${
                inventoryStockFilter === 'out' ? 'text-rose-200' : 'text-slate-400'
              }`}>Mã hàng</span>
            </div>
          </div>

          <div className="group bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <Box className="w-5 h-5 text-emerald-600 group-hover:text-white" />
              </div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Giá trị kho</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{new Intl.NumberFormat('vi-VN').format(warehouseStats.totalValue)}</span>
              <span className="text-xs font-bold text-slate-400 uppercase">đ</span>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in fade-in slide-in-from-top-4 duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-red-50 border-red-100 text-red-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          ) : (
            <AlertCircle className="w-6 h-6 text-red-500" />
          )}
          <p className="font-bold">{notification.message}</p>
        </div>
      )}

      {/* Main Content */}
      {activeTab === 'import' ? (
        <div className="space-y-8">
          <ImportForm manager={manager} products={products} suppliers={suppliers} />
          <InventoryTable manager={manager} products={products} suppliers={suppliers} />
        </div>
      ) : activeTab === 'suppliers' ? (
        <SupplierForm manager={manager} products={products} suppliers={suppliers} deleteSupplier={deleteSupplier} />
      ) : activeTab === 'packaging' ? (
        <PackagingForm manager={manager} packagingItems={packagingItems} deletePackagingItem={deletePackagingItem} />
      ) : activeTab === 'combo' ? (
        <ComboTab
          products={products}
          packagingItems={packagingItems}
          addProduct={addProduct}
          updateProduct={updateProduct}
          deleteProduct={deleteProduct}
          updatePackagingItem={updatePackagingItem}
          addTransaction={addTransaction}
          setNotification={(notif) => manager.setNotification(notif)}
        />
      ) : null}

      {/* Modals */}
      {selectedSupplierForDetail && (
        <SupplierDetailModal
          supplier={selectedSupplierForDetail}
          products={products}
          transactions={transactions}
          onClose={() => setSelectedSupplierForDetail(null)}
        />
      )}

      {assigningSupplierForProductId && (
        <AssignSupplierModal
          productId={assigningSupplierForProductId}
          products={products}
          suppliers={suppliers}
          modalSupplierId={modalSupplierId}
          setModalSupplierId={setModalSupplierId}
          onClose={() => setAssigningSupplierForProductId(null)}
          onSave={async () => {
            try {
              await updateProduct(assigningSupplierForProductId, { supplierId: modalSupplierId || null });
              setAssigningSupplierForProductId(null);
              manager.setNotification({ type: 'success', message: 'Đã cập nhật nhà cung cấp cho sản phẩm.' });
              setTimeout(() => manager.setNotification(null), 3000);
            } catch (err) {
              console.error('Lỗi cập nhật nhà cung cấp:', err);
              manager.setNotification({ type: 'error', message: 'Lỗi khi cập nhật nhà cung cấp. Vui lòng thử lại.' });
              setTimeout(() => manager.setNotification(null), 3000);
            }
          }}
        />
      )}

      {showBarcodeModal && (
        <BarcodePrintModal
          initialItems={printItems}
          onClose={() => setShowBarcodeModal(false)}
        />
      )}
      
      {manager.editingProductId && (
        <EditProductModal
          product={products.find(p => p.id === manager.editingProductId)!}
          onClose={() => manager.setEditingProductId(null)}
          onSave={async (id, updates) => {
            try {
              await updateProduct(id, updates);
              manager.setEditingProductId(null);
              manager.setNotification({ type: 'success', message: 'Cập nhật sản phẩm thành công!' });
              setTimeout(() => manager.setNotification(null), 3000);
            } catch (err) {
              console.error('Lỗi cập nhật sản phẩm:', err);
              manager.setNotification({ type: 'error', message: 'Lỗi khi cập nhật sản phẩm. Vui lòng thử lại.' });
              setTimeout(() => manager.setNotification(null), 3000);
            }
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {manager.deleteConfirmIds && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Xác nhận xóa sản phẩm</h3>
              <p className="text-slate-500">
                Bạn có chắc chắn muốn xóa {manager.deleteConfirmIds.length === 1 ? 'sản phẩm này' : `${manager.deleteConfirmIds.length} sản phẩm`} không? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => manager.setDeleteConfirmIds(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => manager.handleDeleteMany(manager.deleteConfirmIds!)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
              >
                Xóa {manager.deleteConfirmIds.length === 1 ? 'sản phẩm' : `${manager.deleteConfirmIds.length} sản phẩm`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

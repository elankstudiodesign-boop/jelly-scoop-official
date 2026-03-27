import React from 'react';
import { Package, Truck, Box, Layers, AlertCircle, CheckCircle2, RefreshCw, X, TrendingUp, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { Product, Transaction, Supplier, PackagingItem } from '../types';
import { useImportManager } from '../hooks/useImportManager';
import { ImportForm } from '../components/import/ImportForm';
import { SupplierForm } from '../components/import/SupplierForm';
import { PackagingForm } from '../components/import/PackagingForm';
import { InventoryTable } from '../components/import/InventoryTable';
import { SupplierDetailModal } from '../components/import/SupplierDetailModal';
import { AssignSupplierModal } from '../components/import/AssignSupplierModal';
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
    <div className="w-full px-0 sm:px-6 lg:px-8 py-2 sm:py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-4 sm:px-0">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">QUẢN LÝ KHO HÀNG</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">Theo dõi tồn kho, nhập hàng và in mã vạch</p>
          </div>
          <button 
            onClick={handleSync}
            className="md:hidden p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-slate-200"
            title="Đồng bộ lại"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl self-start overflow-x-auto no-scrollbar max-w-full scroll-smooth flex-1 md:flex-none">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'import' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Nhập kho
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'suppliers' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Nhà cung cấp
          </button>
          <button
            onClick={() => setActiveTab('packaging')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'packaging' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Box className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Bao bì
          </button>
          <button
            onClick={() => setActiveTab('combo')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'combo' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Combo
          </button>
          <button 
            onClick={handleSync}
            className="hidden md:flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-slate-200 font-bold text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Đồng bộ
          </button>
        </div>
      </div>
    </div>

      {/* Warehouse Stats - Only on Import Tab */}
      {activeTab === 'import' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 px-4 sm:px-0">
          <div 
            onClick={() => setInventoryStockFilter('all')}
            className={`p-4 sm:p-6 rounded-2xl border transition-all cursor-pointer hover:shadow-md active:scale-95 ${
              inventoryStockFilter === 'all' 
                ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100' 
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                inventoryStockFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'
              }`}>
                <Package className="w-4 h-4" />
              </div>
              <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                inventoryStockFilter === 'all' ? 'text-indigo-700' : 'text-slate-500'
              }`}>Tổng tồn kho</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl sm:text-2xl font-black ${
                inventoryStockFilter === 'all' ? 'text-indigo-700' : 'text-slate-900'
              }`}>{warehouseStats.totalItems}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Sản phẩm</span>
            </div>
          </div>

          <div 
            onClick={() => setInventoryStockFilter('low')}
            className={`p-4 sm:p-6 rounded-2xl border transition-all cursor-pointer hover:shadow-md active:scale-95 ${
              inventoryStockFilter === 'low' 
                ? 'bg-orange-50 border-orange-200 ring-2 ring-orange-100' 
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                inventoryStockFilter === 'low' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600'
              }`}>
                <AlertCircle className="w-4 h-4" />
              </div>
              <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                inventoryStockFilter === 'low' ? 'text-orange-700' : 'text-slate-500'
              }`}>Sắp hết hàng</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl sm:text-2xl font-black ${
                inventoryStockFilter === 'low' ? 'text-orange-700' : 'text-orange-600'
              }`}>{warehouseStats.lowStock}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Mã hàng</span>
            </div>
          </div>

          <div 
            onClick={() => setInventoryStockFilter('out')}
            className={`p-4 sm:p-6 rounded-2xl border transition-all cursor-pointer hover:shadow-md active:scale-95 ${
              inventoryStockFilter === 'out' 
                ? 'bg-red-50 border-red-200 ring-2 ring-red-100' 
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                inventoryStockFilter === 'out' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'
              }`}>
                <X className="w-4 h-4" />
              </div>
              <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                inventoryStockFilter === 'out' ? 'text-red-700' : 'text-slate-500'
              }`}>Hết hàng</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl sm:text-2xl font-black ${
                inventoryStockFilter === 'out' ? 'text-red-700' : 'text-red-600'
              }`}>{warehouseStats.outOfStock}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Mã hàng</span>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Box className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Giá trị kho</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900">{new Intl.NumberFormat('vi-VN').format(warehouseStats.totalValue)}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">đ</span>
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

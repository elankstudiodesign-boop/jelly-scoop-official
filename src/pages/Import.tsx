import React from 'react';
import { Package, Truck, Box, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
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
    printItems
  } = manager;

  return (
    <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 px-4 sm:px-0">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">NHẬP KHO & QUẢN LÝ</h1>
          <p className="text-slate-500 mt-1 font-medium">Quản lý sản phẩm, nhà cung cấp và bao bì</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl self-start overflow-x-auto no-scrollbar max-w-full">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'import' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            Nhập kho
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'suppliers' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            Nhà cung cấp
          </button>
          <button
            onClick={() => setActiveTab('packaging')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'packaging' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Box className="w-4 h-4" />
            Bao bì
          </button>
          <button
            onClick={() => setActiveTab('combo')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'combo' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Combo
          </button>
        </div>
      </div>

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
    </div>
  );
}

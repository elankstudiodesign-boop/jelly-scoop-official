import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Sidebar from './components/Sidebar';
import Analytics from './pages/Analytics';
import Products from './pages/Products';
import PoolDistribution from './pages/PoolDistribution';
import Live from './pages/Live';
import Import from './pages/Import';
import Finance from './pages/Finance';
import Settings from './pages/Settings';
import { useSupabaseProducts, useSupabaseSessions, useSupabaseTransactions, useSupabaseSuppliers, useSupabasePackagingItems } from './hooks/useSupabase';
import { useAutoBackup } from './hooks/useAutoBackup';
import { processOfflineOrders } from './lib/syncQueue';
import { hasSupabaseConfig } from './lib/supabase';
import { Product, Supplier, Transaction, LiveSession, PackagingItem } from './types';

export default function App() {
  const { products, addProduct, updateProduct, deleteProduct, loading: productsLoading } = useSupabaseProducts();
  const { sessions, addSession, deleteSession, loading: sessionsLoading } = useSupabaseSessions();
  const { transactions, addTransaction, deleteTransaction, loading: transactionsLoading } = useSupabaseTransactions();
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, loading: suppliersLoading } = useSupabaseSuppliers();

  const { packagingItems, addPackagingItem, updatePackagingItem, deletePackagingItem, loading: packagingLoading } = useSupabasePackagingItems();

  // Automatic weekly backup on desktop
  useAutoBackup({
    products,
    suppliers,
    transactions,
    sessions,
    packagingItems
  });

  React.useEffect(() => {
    // Process offline orders on initial load if online
    if (navigator.onLine) {
      processOfflineOrders();
    }
  }, []);

  const handleImportData = async (data: {
    products?: Product[];
    suppliers?: Supplier[];
    transactions?: Transaction[];
    sessions?: LiveSession[];
    packagingItems?: PackagingItem[];
  }) => {
    // Basic implementation: loop through and add
    // In a real app, you'd want bulk upsert
    if (data.suppliers) {
      for (const s of data.suppliers) {
        await addSupplier(s);
      }
    }
    if (data.products) {
      for (const p of data.products) {
        await addProduct(p);
      }
    }
    if (data.packagingItems) {
      for (const pi of data.packagingItems) {
        await addPackagingItem(pi);
      }
    }
    if (data.transactions) {
      for (const t of data.transactions) {
        await addTransaction(t);
      }
    }
    if (data.sessions) {
      for (const s of data.sessions) {
        await addSession(s);
      }
    }
  };

  if (productsLoading || sessionsLoading || transactionsLoading || suppliersLoading || packagingLoading) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-slate-50">
        <div className="text-indigo-600 font-medium">Đang tải dữ liệu từ Supabase...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen min-h-[100dvh] bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
        <Toaster position="top-right" richColors />
        <Sidebar />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto mt-16 md:mt-0 pb-8">
          <div className="w-full">
            {!hasSupabaseConfig && (
              <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
                <h2 className="text-amber-800 font-bold text-lg mb-2">Chưa kết nối Supabase!</h2>
                <p className="text-amber-700 text-sm mb-3">
                  Dữ liệu hiện tại chỉ lưu tạm thời trên trình duyệt và sẽ bị mất khi tải lại trang. Để lưu trữ dữ liệu vĩnh viễn, vui lòng:
                </p>
                <ol className="list-decimal list-inside text-sm text-amber-700 space-y-1 ml-2">
                  <li>Tạo dự án trên Supabase.</li>
                  <li>Chạy mã SQL trong file <code>supabase/schema.sql</code> ở mục SQL Editor.</li>
                  <li>Thêm <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_ANON_KEY</code> vào môi trường (Settings &gt; Secrets).</li>
                </ol>
              </div>
            )}
            <Routes>
              <Route path="/" element={<Analytics products={products} transactions={transactions} />} />
              <Route path="/products" element={<Products products={products} addProduct={addProduct} updateProduct={updateProduct} deleteProduct={deleteProduct} suppliers={suppliers} />} />
              <Route path="/pool-distribution" element={<PoolDistribution products={products} />} />
              <Route path="/import" element={<Import products={products} transactions={transactions} addProduct={addProduct} updateProduct={updateProduct} addTransaction={addTransaction} deleteProduct={deleteProduct} suppliers={suppliers} addSupplier={addSupplier} updateSupplier={updateSupplier} deleteSupplier={deleteSupplier} packagingItems={packagingItems} addPackagingItem={addPackagingItem} updatePackagingItem={updatePackagingItem} deletePackagingItem={deletePackagingItem} />} />
              <Route path="/live" element={<Live products={products} updateProduct={updateProduct} addTransaction={addTransaction} addSession={addSession} transactions={transactions} deleteTransaction={deleteTransaction} packagingItems={packagingItems} updatePackagingItem={updatePackagingItem} />} />
              <Route path="/finance" element={<Finance transactions={transactions} deleteTransaction={deleteTransaction} addTransaction={addTransaction} products={products} updateProduct={updateProduct} />} />
              <Route path="/settings" element={<Settings products={products} suppliers={suppliers} transactions={transactions} sessions={sessions} onImportData={handleImportData} />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

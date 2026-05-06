import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Sidebar from './components/Sidebar';
import AccessGuard from './components/AccessGuard';
import Analytics from './pages/Analytics';
import Live from './pages/Live';
import Import from './pages/Import';
import Finance from './pages/Finance';
import Settings from './pages/Settings';
import { useSupabaseProducts, useSupabaseSessions, useSupabaseTransactions, useSupabaseSuppliers, useSupabasePackagingItems, useSupabaseAuth } from './hooks/useSupabase';
import { useAutoBackup } from './hooks/useAutoBackup';
import { processOfflineOrders } from './lib/syncQueue';
import { hasSupabaseConfig } from './lib/supabase';
import { Product, Supplier, Transaction, LiveSession, PackagingItem } from './types';

function AppContent() {
  const { products, addProduct, updateProduct, deleteProduct, recalculateCombos, loading: productsLoading } = useSupabaseProducts();
  const { sessions, addSession, deleteSession, loading: sessionsLoading } = useSupabaseSessions();
  const { transactions, addTransaction, deleteTransaction, loading: transactionsLoading } = useSupabaseTransactions();
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, loading: suppliersLoading } = useSupabaseSuppliers();
  const { packagingItems, addPackagingItem, updatePackagingItem, deletePackagingItem, loading: packagingLoading } = useSupabasePackagingItems();
  const { currentRole } = useSupabaseAuth();

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
    if (data.suppliers) for (const s of data.suppliers) await addSupplier(s);
    if (data.products) for (const p of data.products) await addProduct(p);
    if (data.packagingItems) for (const pi of data.packagingItems) await addPackagingItem(pi);
    if (data.transactions) for (const t of data.transactions) await addTransaction(t);
    if (data.sessions) for (const s of data.sessions) await addSession(s);
  };

  if (productsLoading || sessionsLoading || transactionsLoading || suppliersLoading || packagingLoading) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-slate-50">
        <div className="text-indigo-600 font-medium">Đang tải dữ liệu từ Supabase...</div>
      </div>
    );
  }

  const isAdmin = currentRole === 'ADMIN';
  const isStaff = currentRole === 'STAFF';

  return (
    <div className="flex min-h-screen min-h-[100dvh] bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <Toaster position="top-right" richColors />
      <Sidebar />
      <main className="flex-1 flex flex-col p-3 sm:p-4 lg:p-6 overflow-y-auto mt-16 md:mt-0">
        <div className="w-full flex-1 flex flex-col">
          {!hasSupabaseConfig && (
            <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-amber-800 font-bold text-lg mb-2">Chưa kết nối Supabase!</h2>
              <p className="text-amber-700 text-sm mb-3">
                Dữ liệu hiện tại chỉ lưu tạm thời trên trình duyệt và sẽ bị mất khi tải lại trang.
              </p>
            </div>
          )}
          <Routes>
            <Route path="/" element={(isAdmin || isStaff) ? <Analytics products={products} transactions={transactions} /> : <Navigate to="/live" replace />} />
            <Route path="/import" element={(isAdmin || isStaff) ? <Import products={products} transactions={transactions} addProduct={addProduct} updateProduct={updateProduct} addTransaction={addTransaction} deleteProduct={deleteProduct} suppliers={suppliers} addSupplier={addSupplier} updateSupplier={updateSupplier} deleteSupplier={deleteSupplier} packagingItems={packagingItems} addPackagingItem={addPackagingItem} updatePackagingItem={updatePackagingItem} deletePackagingItem={deletePackagingItem} recalculateCombos={recalculateCombos} /> : <Navigate to="/live" replace />} />
            <Route path="/live" element={<Live products={products} updateProduct={updateProduct} addTransaction={addTransaction} addSession={addSession} transactions={transactions} deleteTransaction={deleteTransaction} packagingItems={packagingItems} updatePackagingItem={updatePackagingItem} />} />
            <Route path="/finance" element={(isAdmin || isStaff) ? <Finance transactions={transactions} deleteTransaction={deleteTransaction} addTransaction={addTransaction} products={products} updateProduct={updateProduct} /> : <Navigate to="/live" replace />} />
            <Route path="/settings" element={isAdmin ? <Settings products={products} suppliers={suppliers} transactions={transactions} sessions={sessions} onImportData={handleImportData} /> : <Navigate to="/live" replace />} />
            <Route path="*" element={<Navigate to={isAdmin ? "/" : "/live"} replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AccessGuard>
        <AppContent />
      </AccessGuard>
    </BrowserRouter>
  );
}

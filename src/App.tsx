import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Analytics from './pages/Analytics';
import Products from './pages/Products';
import PoolDistribution from './pages/PoolDistribution';
import Simulator from './pages/Simulator';
import Live from './pages/Live';
import Import from './pages/Import';
import Finance from './pages/Finance';
import { useSupabaseProducts, useSupabaseSessions, useSupabaseTransactions, useSupabaseSuppliers } from './hooks/useSupabase';
import { hasSupabaseConfig } from './lib/supabase';

export default function App() {
  const { products, addProduct, updateProduct, deleteProduct, loading: productsLoading } = useSupabaseProducts();
  const { sessions, addSession, deleteSession, loading: sessionsLoading } = useSupabaseSessions();
  const { transactions, addTransaction, deleteTransaction, loading: transactionsLoading } = useSupabaseTransactions();
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, loading: suppliersLoading } = useSupabaseSuppliers();

  if (productsLoading || sessionsLoading || transactionsLoading || suppliersLoading) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-slate-50">
        <div className="text-indigo-600 font-medium">Đang tải dữ liệu từ Supabase...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen min-h-[100dvh] bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
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
              <Route path="/" element={<Analytics sessions={sessions} addSession={addSession} deleteSession={deleteSession} />} />
              <Route path="/products" element={<Products products={products} addProduct={addProduct} updateProduct={updateProduct} deleteProduct={deleteProduct} suppliers={suppliers} />} />
              <Route path="/pool-distribution" element={<PoolDistribution products={products} />} />
              <Route path="/import" element={<Import products={products} transactions={transactions} addProduct={addProduct} updateProduct={updateProduct} addTransaction={addTransaction} deleteProduct={deleteProduct} suppliers={suppliers} addSupplier={addSupplier} updateSupplier={updateSupplier} deleteSupplier={deleteSupplier} />} />
              <Route path="/simulator" element={<Simulator products={products} />} />
              <Route path="/live" element={<Live products={products} updateProduct={updateProduct} addTransaction={addTransaction} addSession={addSession} transactions={transactions} deleteTransaction={deleteTransaction} />} />
              <Route path="/finance" element={<Finance transactions={transactions} deleteTransaction={deleteTransaction} addTransaction={addTransaction} products={products} updateProduct={updateProduct} />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

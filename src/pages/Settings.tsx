import React, { useState } from 'react';
import { Database, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSupabaseProducts, useSupabaseSessions, useSupabaseTransactions, useSupabaseSuppliers, useSupabaseConfigs } from '../hooks/useSupabase';
import { format } from 'date-fns';

export default function Settings() {
  const { products } = useSupabaseProducts();
  const { sessions } = useSupabaseSessions();
  const { transactions } = useSupabaseTransactions();
  const { suppliers } = useSupabaseSuppliers();
  const { configs } = useSupabaseConfigs([]);
  const [isExporting, setIsExporting] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const escapeSqlString = (str: string | undefined | null) => {
    if (str === undefined || str === null) return 'NULL';
    return `'${str.replace(/'/g, "''")}'`;
  };

  const escapeSqlNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return 'NULL';
    return num;
  };

  const handleExportSql = () => {
    setIsExporting(true);
    try {
      let sql = `-- Backup Data - ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\n\n`;

      // Products
      if (products.length > 0) {
        sql += `-- Table: products\n`;
        products.forEach(p => {
          sql += `INSERT INTO products (id, name, cost, retail_price, margin, image_url, price_group, quantity, warehouse_quantity, note, supplier_id) VALUES (${escapeSqlString(p.id)}, ${escapeSqlString(p.name)}, ${escapeSqlNumber(p.cost)}, ${escapeSqlNumber(p.retailPrice)}, ${escapeSqlNumber(p.margin)}, ${escapeSqlString(p.imageUrl)}, ${escapeSqlString(p.priceGroup)}, ${escapeSqlNumber(p.quantity)}, ${escapeSqlNumber(p.warehouseQuantity)}, ${escapeSqlString(p.note)}, ${escapeSqlString(p.supplierId)}) ON CONFLICT (id) DO NOTHING;\n`;
        });
        sql += `\n`;
      }

      // Suppliers
      if (suppliers.length > 0) {
        sql += `-- Table: suppliers\n`;
        suppliers.forEach(s => {
          sql += `INSERT INTO suppliers (id, name, phone, address, note, created_at) VALUES (${escapeSqlString(s.id)}, ${escapeSqlString(s.name)}, ${escapeSqlString(s.phone)}, ${escapeSqlString(s.address)}, ${escapeSqlString(s.note)}, ${escapeSqlString(s.createdAt)}) ON CONFLICT (id) DO NOTHING;\n`;
        });
        sql += `\n`;
      }

      // Transactions
      if (transactions.length > 0) {
        sql += `-- Table: transactions\n`;
        transactions.forEach(t => {
          let description = t.description || '';
          if (t.items && t.items.length > 0) {
            description = `${description}|||__ITEMS__|||${JSON.stringify(t.items)}`;
          }
          sql += `INSERT INTO transactions (id, type, category, amount, description, date, customer_name, customer_phone, customer_address, supplier_id) VALUES (${escapeSqlString(t.id)}, ${escapeSqlString(t.type)}, ${escapeSqlString(t.category)}, ${escapeSqlNumber(t.amount)}, ${escapeSqlString(description)}, ${escapeSqlString(t.date)}, ${escapeSqlString(t.customerName)}, ${escapeSqlString(t.customerPhone)}, ${escapeSqlString(t.customerAddress)}, ${escapeSqlString(t.supplierId)}) ON CONFLICT (id) DO NOTHING;\n`;
        });
        sql += `\n`;
      }

      // Sessions
      if (sessions.length > 0) {
        sql += `-- Table: sessions\n`;
        sessions.forEach(s => {
          sql += `INSERT INTO sessions (id, date, scoops_sold, revenue, tiktok_fee_percent, packaging_cost_per_scoop, average_scoop_cost) VALUES (${escapeSqlString(s.id)}, ${escapeSqlString(s.date)}, ${escapeSqlNumber(s.scoopsSold)}, ${escapeSqlNumber(s.revenue)}, ${escapeSqlNumber(s.tiktokFeePercent)}, ${escapeSqlNumber(s.packagingCostPerScoop)}, ${escapeSqlNumber(s.averageScoopCost)}) ON CONFLICT (id) DO NOTHING;\n`;
        });
        sql += `\n`;
      }

      // Scoop Configs
      if (configs.length > 0) {
        sql += `-- Table: scoop_configs\n`;
        configs.forEach(c => {
          sql += `INSERT INTO scoop_configs (id, name, price, total_items, ratio_low, ratio_medium, ratio_high) VALUES (${escapeSqlString(c.id)}, ${escapeSqlString(c.name)}, ${escapeSqlNumber(c.price)}, ${escapeSqlNumber(c.totalItems)}, ${escapeSqlNumber(c.ratioLow)}, ${escapeSqlNumber(c.ratioMedium)}, ${escapeSqlNumber(c.ratioHigh)}) ON CONFLICT (id) DO NOTHING;\n`;
        });
        sql += `\n`;
      }

      const blob = new Blob([sql], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jellyscoop_backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setNotification({ type: 'success', message: 'Đã xuất file SQL sao lưu thành công!' });
    } catch (error) {
      console.error('Export error:', error);
      setNotification({ type: 'error', message: 'Có lỗi xảy ra khi xuất file SQL.' });
    } finally {
      setIsExporting(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`fixed top-[calc(env(safe-area-inset-top)+1rem)] left-4 right-4 md:top-4 md:left-auto md:right-4 md:max-w-md z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <span className="font-medium text-sm">{notification.message}</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cài đặt & Sao lưu</h1>
        <p className="text-slate-500 mt-1 text-sm">Quản lý dữ liệu và cấu hình hệ thống.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            Sao lưu dữ liệu (SQL)
          </h2>
          <p className="text-slate-600 text-sm mb-6">
            Tính năng này giúp bạn xuất toàn bộ dữ liệu hiện tại (Sản phẩm, Nhà cung cấp, Giao dịch, Phiên live, Cấu hình) ra một file <code>.sql</code>. Bạn có thể sử dụng file này để sao lưu lên Cloud hoặc phục hồi dữ liệu vào Supabase.
          </p>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleExportSql}
              disabled={isExporting}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              {isExporting ? 'Đang xuất...' : 'Tải xuống file SQL'}
            </button>
            <div className="text-sm text-slate-500">
              Tổng cộng: {products.length} sản phẩm, {suppliers.length} nhà cung cấp, {transactions.length} giao dịch.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Transaction, Product } from '../types';
import { Wallet, TrendingUp, TrendingDown, Trash2, AlertTriangle, X, Plus, ChevronDown, Calendar, BarChart3 } from 'lucide-react';
import { formatCurrency, parseCurrency } from '../lib/format';
import { v4 as uuidv4 } from 'uuid';
import { useSupabaseFinancialSummaries } from '../hooks/useSupabase';

interface FinanceProps {
  transactions: Transaction[];
  deleteTransaction: (id: string) => void;
  addTransaction: (transaction: Transaction) => void;
  products: Product[];
  updateProduct: (id: string, updates: Partial<Product>) => void;
}

export default function Finance({ transactions, deleteTransaction, addTransaction, products, updateProduct }: FinanceProps) {
  const { dailySummaries, monthlySummaries, loading: summariesLoading } = useSupabaseFinancialSummaries();
  const [deleteConfirmIds, setDeleteConfirmIds] = useState<string[] | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const selectAllRef = useRef<HTMLInputElement>(null);
  
  // Form state for new transaction
  const [newTxType, setNewTxType] = useState<'IN' | 'OUT'>('OUT');
  const [newTxCategory, setNewTxCategory] = useState<Transaction['category']>('PACKAGING');
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxDescription, setNewTxDescription] = useState('');

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseCurrency(newTxAmount);
    if (amount <= 0 || !newTxDescription) {
      alert('Vui lòng nhập số tiền lớn hơn 0 và mô tả giao dịch');
      return;
    }

    addTransaction({
      id: uuidv4(),
      type: newTxType,
      category: newTxCategory,
      amount,
      description: newTxDescription,
      date: new Date().toISOString()
    });

    // Reset form and close modal
    setNewTxType('OUT');
    setNewTxCategory('PACKAGING');
    setNewTxAmount('');
    setNewTxDescription('');
    setIsAddModalOpen(false);
  };

  const { totalRevenue, totalExpense, netProfit } = useMemo(() => {
    let rev = 0;
    let exp = 0;
    monthlySummaries.forEach(m => {
      rev += m.total_revenue;
      exp += m.total_expense;
    });
    return {
      totalRevenue: rev,
      totalExpense: exp,
      netProfit: rev - exp
    };
  }, [monthlySummaries]);

  const expenseByCategory = useMemo(() => {
    const totals = new Map<Transaction['category'], number>();
    let total = 0;

    transactions.forEach(t => {
      if (t.type !== 'OUT') return;
      total += t.amount;
      totals.set(t.category, (totals.get(t.category) || 0) + t.amount);
    });

    const items = Array.from(totals.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percent: total > 0 ? (amount / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return { total, items };
  }, [transactions]);

  const sortedTransactions = [...transactions]
    .filter(t => {
      const matchesTab = activeTab === 'ALL' || t.type === activeTab;
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const allIds = sortedTransactions.map(t => t.id);
  const allSelected = allIds.length > 0 && selectedIds.size === allIds.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (allSelected) return new Set();
      const next = new Set(prev);
      allIds.forEach(id => next.add(id));
      return next;
    });
  };

  useEffect(() => {
    const allowed = new Set(allIds);
    setSelectedIds(prev => new Set([...prev].filter(id => allowed.has(id))));
  }, [transactions]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'ORDER': return 'Đơn hàng';
      case 'REFUND': return 'Hoàn tiền';
      case 'IMPORT': return 'Nhập kho';
      case 'PACKAGING': return 'Đóng gói (Hộp, mộc...)';
      case 'MARKETING': return 'Marketing / Quảng cáo';
      case 'SHIPPING': return 'Phí vận chuyển';
      case 'PLATFORM_FEE': return 'Phí sàn';
      case 'TOOL': return 'Dụng cụ / Thiết bị';
      case 'FEE': return 'Chi phí phát sinh';
      default: return 'Khác';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Báo cáo tài chính</h1>
        <p className="text-slate-500 mt-1 text-sm">Theo dõi doanh thu, chi phí và lợi nhuận tổng thể.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Tổng doanh thu (Toàn thời gian)</p>
            <p className="text-2xl font-bold text-emerald-600">{summariesLoading ? '...' : formatCurrency(totalRevenue)}đ</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Tổng chi phí (Toàn thời gian)</p>
            <p className="text-2xl font-bold text-rose-600">{summariesLoading ? '...' : formatCurrency(totalExpense)}đ</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Lợi nhuận ròng (Toàn thời gian)</p>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
              {summariesLoading ? '...' : formatCurrency(netProfit)}đ
            </p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${netProfit >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Summary Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Doanh thu theo ngày (30 ngày)</h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                  <th className="p-3 font-medium text-slate-600">Ngày</th>
                  <th className="p-3 font-medium text-slate-600 text-right">Doanh thu</th>
                  <th className="p-3 font-medium text-slate-600 text-right">Chi phí</th>
                  <th className="p-3 font-medium text-slate-600 text-right">Lợi nhuận</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {dailySummaries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-500">
                      {summariesLoading ? 'Đang tải...' : 'Chưa có dữ liệu'}
                    </td>
                  </tr>
                ) : (
                  dailySummaries.map((day) => (
                    <tr key={day.summary_date} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-slate-900 font-medium">
                        {new Date(day.summary_date).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="p-3 text-right text-emerald-600 font-medium">{formatCurrency(day.total_revenue)}đ</td>
                      <td className="p-3 text-right text-rose-600 font-medium">{formatCurrency(day.total_expense)}đ</td>
                      <td className={`p-3 text-right font-bold ${day.net_profit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                        {formatCurrency(day.net_profit)}đ
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Doanh thu theo tháng</h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                  <th className="p-3 font-medium text-slate-600">Tháng</th>
                  <th className="p-3 font-medium text-slate-600 text-right">Doanh thu</th>
                  <th className="p-3 font-medium text-slate-600 text-right">Chi phí</th>
                  <th className="p-3 font-medium text-slate-600 text-right">Lợi nhuận</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {monthlySummaries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-500">
                      {summariesLoading ? 'Đang tải...' : 'Chưa có dữ liệu'}
                    </td>
                  </tr>
                ) : (
                  monthlySummaries.map((month) => {
                    const date = new Date(month.summary_month);
                    return (
                      <tr key={month.summary_month} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-slate-900 font-medium">
                          Tháng {date.getMonth() + 1}/{date.getFullYear()}
                        </td>
                        <td className="p-3 text-right text-emerald-600 font-medium">{formatCurrency(month.total_revenue)}đ</td>
                        <td className="p-3 text-right text-rose-600 font-medium">{formatCurrency(month.total_expense)}đ</td>
                        <td className={`p-3 text-right font-bold ${month.net_profit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                          {formatCurrency(month.net_profit)}đ
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h2 className="text-lg font-bold text-slate-900">Chi phí theo danh mục (30 ngày gần nhất)</h2>
          <div className="text-sm text-slate-500">Tổng: {formatCurrency(expenseByCategory.total)}đ</div>
        </div>
        {expenseByCategory.items.length === 0 ? (
          <div className="text-sm text-slate-500">Chưa có dữ liệu chi phí.</div>
        ) : (
          <div className="space-y-3">
            {expenseByCategory.items.map(item => (
              <div key={item.category} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{getCategoryLabel(item.category)}</div>
                    <div className="text-xs text-slate-500">{item.percent.toFixed(1)}%</div>
                  </div>
                  <div className="text-sm font-bold text-rose-600 whitespace-nowrap">{formatCurrency(item.amount)}đ</div>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-rose-500"
                    style={{ width: `${Math.max(2, Math.min(100, item.percent))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
            <h2 className="text-lg font-bold text-slate-900 whitespace-nowrap">Lịch sử giao dịch</h2>
            <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setActiveTab('IN')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'IN' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Thu
              </button>
              <button
                onClick={() => setActiveTab('OUT')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'OUT' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Chi
              </button>
            </div>
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Tìm kiếm theo mô tả..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
            {isSelectionMode ? (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600 select-none">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Chọn tất cả
                </label>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmIds(Array.from(selectedIds))}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Xóa đã chọn {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedIds(new Set());
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Hủy chọn
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSelectionMode(true)}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Chọn
              </button>
            )}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Thêm giao dịch
            </button>
          </div>
        </div>
        
        {/* Mobile View */}
        <div className="block md:hidden divide-y divide-slate-100">
          {sortedTransactions.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              Chưa có giao dịch nào
            </div>
          ) : (
            sortedTransactions.map((t) => (
              <div key={t.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {isSelectionMode && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelected(t.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    )}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      t.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {t.type === 'IN' ? 'Thu' : 'Chi'}
                    </span>
                    <span className="text-sm font-medium text-slate-900">{getCategoryLabel(t.category)}</span>
                  </div>
                  <span className={`font-bold ${t.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'IN' ? '+' : '-'}{formatCurrency(t.amount)}đ
                  </span>
                </div>
                <div className="text-sm text-slate-600 mb-3 line-clamp-2">
                  {t.description}
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>
                    {new Date(t.date).toLocaleDateString('vi-VN')} {new Date(t.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={() => setDeleteConfirmIds([t.id])}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Xóa giao dịch"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                {isSelectionMode && <th className="px-6 py-4 w-12"></th>}
                <th className="px-6 py-4">Ngày</th>
                <th className="px-6 py-4">Loại</th>
                <th className="px-6 py-4">Danh mục</th>
                <th className="px-6 py-4">Mô tả</th>
                <th className="px-6 py-4 text-right">Số tiền</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={isSelectionMode ? 7 : 6} className="px-6 py-8 text-center text-slate-500">
                    Chưa có giao dịch nào
                  </td>
                </tr>
              ) : (
                sortedTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    {isSelectionMode && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(t.id)}
                          onChange={() => toggleSelected(t.id)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString('vi-VN')} {new Date(t.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        t.type === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {t.type === 'IN' ? 'Thu' : 'Chi'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {getCategoryLabel(t.category)}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate" title={t.description}>
                      {t.description}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${
                      t.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {t.type === 'IN' ? '+' : '-'}{formatCurrency(t.amount)}đ
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setDeleteConfirmIds([t.id])}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Xóa giao dịch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmIds && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-600 mb-4 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
                {deleteConfirmIds.length === 1 ? 'Xóa giao dịch' : `Xóa ${deleteConfirmIds.length} giao dịch`}
              </h3>
              <p className="text-slate-500 text-center mb-6">
                {deleteConfirmIds.length === 1
                  ? 'Bạn có chắc chắn muốn xóa giao dịch này không? Hành động này không thể hoàn tác.'
                  : 'Bạn có chắc chắn muốn xóa các giao dịch đang chọn không? Hành động này không thể hoàn tác.'
                }
                <br />
                <span className="text-emerald-600 font-medium mt-2 block">
                  Số lượng sản phẩm trong kho sẽ được tự động hoàn lại.
                </span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmIds(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    const ids = deleteConfirmIds;
                    
                    // Restore inventory for each transaction
                    const productUpdates: Record<string, number> = {};
                    
                    ids.forEach(id => {
                      const tx = transactions.find(t => t.id === id);
                      if (tx && tx.items && tx.items.length > 0) {
                        tx.items.forEach(item => {
                          // If it's an IN transaction (e.g., ORDER), we sold items, so deleting it means we add them back.
                          // If it's an OUT transaction (e.g., IMPORT), we bought items, so deleting it means we remove them.
                          const quantityChange = tx.type === 'IN' ? item.quantity : -item.quantity;
                          productUpdates[item.productId] = (productUpdates[item.productId] || 0) + quantityChange;
                        });
                      }
                      deleteTransaction(id);
                    });

                    // Apply updates
                    Object.entries(productUpdates).forEach(([productId, change]) => {
                      const product = products.find(p => p.id === productId);
                      if (product) {
                        const newQuantity = Math.max(0, (product.warehouseQuantity || 0) + change);
                        updateProduct(product.id, { warehouseQuantity: newQuantity });
                      }
                    });

                    setSelectedIds(prev => {
                      const next = new Set(prev);
                      ids.forEach(id => next.delete(id));
                      return next;
                    });
                    setDeleteConfirmIds(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Add Transaction Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Thêm giao dịch mới</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Loại giao dịch</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTxType('IN');
                      setNewTxCategory('ORDER');
                    }}
                    className={`py-2 px-4 rounded-lg border font-medium text-sm transition-colors ${
                      newTxType === 'IN' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Thu (Income)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewTxType('OUT');
                      setNewTxCategory('PACKAGING');
                    }}
                    className={`py-2 px-4 rounded-lg border font-medium text-sm transition-colors ${
                      newTxType === 'OUT' 
                        ? 'bg-rose-50 border-rose-200 text-rose-700' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Chi (Expense)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Danh mục</label>
                <div className="relative">
                  <select
                    value={newTxCategory}
                    onChange={(e) => setNewTxCategory(e.target.value as any)}
                    className="w-full appearance-none px-4 pr-10 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {newTxType === 'IN' ? (
                      <>
                        <option value="ORDER">Đơn hàng (Doanh thu bán hàng)</option>
                        <option value="REFUND">Hoàn tiền (Nhận lại tiền)</option>
                        <option value="OTHER">Thu nhập khác</option>
                      </>
                    ) : (
                      <>
                        <option value="PACKAGING">Chi phí đóng gói (Hộp, mộc, giấy gói...)</option>
                        <option value="IMPORT">Nhập kho (Mua hàng hóa)</option>
                        <option value="SHIPPING">Phí vận chuyển (Giao hàng)</option>
                        <option value="PLATFORM_FEE">Phí sàn (TikTok, Shopee...)</option>
                        <option value="MARKETING">Marketing / Quảng cáo</option>
                        <option value="TOOL">Dụng cụ / Thiết bị</option>
                        <option value="FEE">Chi phí phát sinh khác</option>
                        <option value="OTHER">Chi phí khác</option>
                      </>
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Số tiền (VNĐ)</label>
                <input
                  type="text"
                  value={newTxAmount}
                  onChange={(e) => setNewTxAmount(formatCurrency(e.target.value))}
                  placeholder="Ví dụ: 50.000"
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả chi tiết</label>
                <textarea
                  value={newTxDescription}
                  onChange={(e) => setNewTxDescription(e.target.value)}
                  placeholder="Ví dụ: Mua 100 hộp carton"
                  rows={3}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                >
                  Lưu giao dịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

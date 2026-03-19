import React, { useMemo, useState } from 'react';
import { Transaction } from '../types';
import { Wallet, TrendingUp, TrendingDown, Trash2, AlertTriangle, X, Plus } from 'lucide-react';
import { formatCurrency, parseCurrency } from '../lib/format';
import { v4 as uuidv4 } from 'uuid';

interface FinanceProps {
  transactions: Transaction[];
  deleteTransaction: (id: string) => void;
  addTransaction: (transaction: Transaction) => void;
}

export default function Finance({ transactions, deleteTransaction, addTransaction }: FinanceProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
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
    transactions.forEach(t => {
      if (t.type === 'IN') rev += t.amount;
      else if (t.type === 'OUT') exp += t.amount;
    });
    return {
      totalRevenue: rev,
      totalExpense: exp,
      netProfit: rev - exp
    };
  }, [transactions]);

  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
            <p className="text-sm font-medium text-slate-500 mb-1">Tổng doanh thu</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}đ</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Tổng chi phí</p>
            <p className="text-2xl font-bold text-rose-600">{formatCurrency(totalExpense)}đ</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Lợi nhuận ròng</p>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
              {formatCurrency(netProfit)}đ
            </p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${netProfit >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">Lịch sử giao dịch</h2>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Thêm giao dịch
          </button>
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
                    onClick={() => setDeleteConfirmId(t.id)}
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
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Chưa có giao dịch nào
                  </td>
                </tr>
              ) : (
                sortedTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
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
                        onClick={() => setDeleteConfirmId(t.id)}
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
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-600 mb-4 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Xóa giao dịch</h3>
              <p className="text-slate-500 text-center mb-6">
                Bạn có chắc chắn muốn xóa giao dịch này không? Hành động này không thể hoàn tác.
                Lưu ý: Việc xóa giao dịch sẽ không tự động hoàn lại số lượng tồn kho.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    deleteTransaction(deleteConfirmId);
                    setDeleteConfirmId(null);
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
                <select
                  value={newTxCategory}
                  onChange={(e) => setNewTxCategory(e.target.value as any)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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

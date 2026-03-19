import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { Wallet, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';

interface FinanceProps {
  transactions: Transaction[];
  deleteTransaction: (id: string) => void;
}

export default function Finance({ transactions, deleteTransaction }: FinanceProps) {
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
      case 'IMPORT': return 'Nhập kho';
      case 'FEE': return 'Chi phí';
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
            <p className="text-2xl font-bold text-emerald-600">{totalRevenue.toLocaleString()}đ</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Tổng chi phí</p>
            <p className="text-2xl font-bold text-rose-600">{totalExpense.toLocaleString()}đ</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Lợi nhuận ròng</p>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
              {netProfit.toLocaleString()}đ
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
        </div>
        
        <div className="overflow-x-auto">
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
                      {t.type === 'IN' ? '+' : '-'}{t.amount.toLocaleString()}đ
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          if (window.confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
                            deleteTransaction(t.id);
                          }
                        }}
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
    </div>
  );
}

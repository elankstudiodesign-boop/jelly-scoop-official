import React, { useEffect, useRef, useState } from 'react';
import { LiveSession, Product, Transaction } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency, parseCurrency } from '../lib/format';
import PoolDistribution from './PoolDistribution';
import Simulator from './Simulator';
import { BarChart3, Droplets, Calculator, Trash2, PlusCircle, Calendar as CalendarIcon, Loader2, TrendingUp, TrendingDown, DollarSign, ShoppingBag, Package, Percent } from 'lucide-react';
import CurrencyInput from '../components/CurrencyInput';
import ConfirmModal from '../components/ConfirmModal';

export default function Analytics({ products, transactions }: { products: Product[], transactions: Transaction[] }) {
  const [activeTab, setActiveTab] = useState<'stats' | 'pool' | 'simulator'>('stats');

  // Calculate stats from transactions
  const chartData = React.useMemo(() => {
    const dailyData: { [date: string]: { revenue: number, totalCost: number, totalPackaging: number, totalPlatformFee: number, totalOtherExpenses: number, scoopsSold: number } } = {};

    transactions.forEach(tx => {
      const dateStr = new Date(tx.date).toISOString().split('T')[0];
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { revenue: 0, totalCost: 0, totalPackaging: 0, totalPlatformFee: 0, totalOtherExpenses: 0, scoopsSold: 0 };
      }

      if (tx.type === 'IN') {
        if (tx.category === 'ORDER') {
          dailyData[dateStr].revenue += tx.amount;
          if (tx.items) {
            tx.items.forEach(item => {
              const product = products.find(p => p.id === item.productId);
              if (product) {
                dailyData[dateStr].totalCost += (product.cost || 0) * item.quantity;
                dailyData[dateStr].scoopsSold += item.quantity;
              }
            });
          }
        } else {
          // Other income
          dailyData[dateStr].revenue += tx.amount;
        }
      } else {
        // Expenses
        if (tx.category === 'PACKAGING') {
          dailyData[dateStr].totalPackaging += tx.amount;
        } else if (tx.category === 'PLATFORM_FEE') {
          dailyData[dateStr].totalPlatformFee += tx.amount;
        } else if (tx.category === 'IMPORT') {
          // Import costs are usually handled via product cost, but if it's a direct expense:
          // We don't double count if it's already in product.cost
        } else {
          dailyData[dateStr].totalOtherExpenses += tx.amount;
        }
      }
    });

    return Object.entries(dailyData).map(([date, data]) => {
      const netProfit = data.revenue - data.totalCost - data.totalPackaging - data.totalPlatformFee - data.totalOtherExpenses;
      const margin = data.revenue > 0 ? (netProfit / data.revenue) * 100 : 0;
      return {
        id: date,
        date,
        displayDate: new Date(date).toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' }),
        revenue: data.revenue,
        netProfit,
        margin,
        scoopsSold: data.scoopsSold,
        totalCost: data.totalCost,
        totalPackaging: data.totalPackaging,
        totalPlatformFee: data.totalPlatformFee,
        totalOtherExpenses: data.totalOtherExpenses
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, products]);

  const totalRevenue = chartData.reduce((sum, s) => sum + s.revenue, 0);
  const totalProfit = chartData.reduce((sum, s) => sum + s.netProfit, 0);
  const totalExpenses = totalRevenue - totalProfit;
  const totalScoops = chartData.reduce((sum, s) => sum + s.scoopsSold, 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Thống kê Doanh thu</h1>
          <p className="text-slate-500 mt-1 text-sm">Theo dõi lợi nhuận thực tế sau mỗi phiên Live.</p>
        </div>
        
        {/* Mobile Tabs */}
        <div className="flex md:hidden bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'stats' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <BarChart3 className="w-4 h-4" />
            Thống kê
          </button>
          <button
            onClick={() => setActiveTab('pool')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'pool' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Droplets className="w-4 h-4" />
            Phân bổ
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'simulator' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Calculator className="w-4 h-4" />
            Mô phỏng
          </button>
        </div>
      </div>

      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Main Financial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Tổng doanh thu (Toàn thời gian)</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}đ</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Tổng chi phí (Toàn thời gian)</p>
                <p className="text-2xl font-bold text-rose-600">{formatCurrency(totalExpenses)}đ</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Lợi nhuận ròng (Toàn thời gian)</p>
                <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                  {formatCurrency(totalProfit)}đ
                </p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${totalProfit >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center group hover:border-amber-200 transition-colors">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Số Món Đã Bán</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalScoops)}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center group hover:border-indigo-200 transition-colors">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Percent className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Biên Lợi Nhuận TB</p>
              <p className="text-2xl font-bold text-indigo-600">{avgMargin.toFixed(1)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[450px] flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-slate-800">Biểu đồ Lợi nhuận & Doanh thu</h3>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                      <span className="text-slate-500">Doanh thu</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                      <span className="text-slate-500">Lợi nhuận</span>
                    </div>
                  </div>
                </div>
                {chartData.length > 0 ? (
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b', fontWeight: 500}} dy={10} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b', fontWeight: 500}} tickFormatter={(val) => `${val / 1000000}M`} dx={-10} />
                        <Tooltip 
                          cursor={{fill: '#f8fafc'}}
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontWeight: 600, padding: '12px'}}
                          formatter={(value: number) => [`${formatCurrency(value)}đ`, '']}
                        />
                        <Bar yAxisId="left" dataKey="revenue" name="Doanh thu" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar yAxisId="left" dataKey="netProfit" name="Lợi nhuận ròng" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <p className="font-medium">Chưa có dữ liệu đơn hàng nào</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
                <h3 className="text-base font-semibold text-slate-800 mb-5">Thông tin Thống kê</h3>
                <div className="space-y-4 flex-1">
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <h4 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                      <Calculator className="w-4 h-4" />
                      Cách tính toán
                    </h4>
                    <ul className="text-xs text-indigo-700 space-y-2 list-disc list-inside">
                      <li>Dữ liệu được lấy tự động từ các đơn hàng bạn đã hoàn tất trong trang <b>Live</b>.</li>
                      <li><b>Doanh thu:</b> Tổng số tiền khách thanh toán (bao gồm ship, trừ giảm giá).</li>
                      <li><b>Giá vốn:</b> Tính theo giá vốn của từng sản phẩm trong đơn hàng.</li>
                      <li><b>Chi phí khác:</b> Bao gồm phí bao bì, phí sàn TikTok và các chi tiêu khác bạn nhập trong mục <b>Tài chính</b>.</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <h4 className="text-sm font-bold text-emerald-900 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Mục tiêu lợi nhuận
                    </h4>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      Hệ thống đánh giá đơn hàng có lợi nhuận tốt khi biên lợi nhuận đạt từ <b>50% trở lên</b>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-800">Bảng tổng hợp theo ngày</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-600 font-semibold">
                  <tr>
                    <th className="p-4">Ngày</th>
                    <th className="p-4 text-right">Số món</th>
                    <th className="p-4 text-right">Doanh thu</th>
                    <th className="p-4 text-right">Giá vốn</th>
                    <th className="p-4 text-right">Bao bì</th>
                    <th className="p-4 text-right">Phí sàn</th>
                    <th className="p-4 text-right">Chi phí khác</th>
                    <th className="p-4 text-right">Lợi nhuận ròng</th>
                    <th className="p-4 text-right">Biên LN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chartData.map(day => {
                    return (
                      <tr key={day.id} className="hover:bg-slate-50 transition-colors text-slate-900">
                        <td className="p-4 font-medium">{new Date(day.date).toLocaleDateString('vi-VN')}</td>
                        <td className="p-4 text-right">{day.scoopsSold}</td>
                        <td className="p-4 text-right font-medium">{formatCurrency(day.revenue)}đ</td>
                        <td className="p-4 text-right text-slate-500">{formatCurrency(day.totalCost)}đ</td>
                        <td className="p-4 text-right text-slate-500">{formatCurrency(day.totalPackaging)}đ</td>
                        <td className="p-4 text-right text-slate-500">{formatCurrency(day.totalPlatformFee)}đ</td>
                        <td className="p-4 text-right text-slate-500">{formatCurrency(day.totalOtherExpenses)}đ</td>
                        <td className="p-4 text-right font-semibold text-indigo-600">{formatCurrency(day.netProfit)}đ</td>
                        <td className="p-4 text-right">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${day.margin >= 50 ? 'bg-emerald-100 text-emerald-700' : day.margin > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {day.margin.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {chartData.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        Chưa có dữ liệu đơn hàng
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pool' && (
        <div className="md:hidden">
          <PoolDistribution products={products} />
        </div>
      )}

      {activeTab === 'simulator' && (
        <div className="md:hidden">
          <Simulator products={products} />
        </div>
      )}
    </div>
  );
}

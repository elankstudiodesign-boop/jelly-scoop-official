import React, { useState } from 'react';
import { LiveSession } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, parseCurrency } from '../lib/format';

export default function Analytics({ sessions, addSession, deleteSession }: { sessions: LiveSession[], addSession: (s: LiveSession) => void, deleteSession: (id: string) => void }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [scoopsSold, setScoopsSold] = useState('');
  const [revenue, setRevenue] = useState('');
  const [tiktokFeePercent, setTiktokFeePercent] = useState('4');
  const [packagingCost, setPackagingCost] = useState('5000');
  const [averageScoopCost, setAverageScoopCost] = useState('45000');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !scoopsSold || !revenue) return;
    
    const newSession: LiveSession = {
      id: uuidv4(),
      date,
      scoopsSold: Number(scoopsSold),
      revenue: parseCurrency(revenue),
      tiktokFeePercent: Number(tiktokFeePercent),
      packagingCostPerScoop: parseCurrency(packagingCost),
      averageScoopCost: parseCurrency(averageScoopCost)
    };
    
    addSession(newSession);
    
    setScoopsSold('');
    setRevenue('');
  };

  const handleDelete = (id: string) => {
    deleteSession(id);
  };

  const chartData = sessions.map(s => {
    const platformFee = s.revenue * (s.tiktokFeePercent / 100);
    const totalPackaging = s.scoopsSold * s.packagingCostPerScoop;
    const totalGoodsCost = s.scoopsSold * s.averageScoopCost;
    const netProfit = s.revenue - platformFee - totalPackaging - totalGoodsCost;
    const margin = s.revenue > 0 ? (netProfit / s.revenue) * 100 : 0;
    
    return {
      ...s,
      netProfit,
      margin,
      displayDate: new Date(s.date).toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' })
    };
  });

  const totalRevenue = chartData.reduce((sum, s) => sum + s.revenue, 0);
  const totalProfit = chartData.reduce((sum, s) => sum + s.netProfit, 0);
  const totalScoops = chartData.reduce((sum, s) => sum + s.scoopsSold, 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Thống kê Doanh thu</h1>
        <p className="text-slate-500 mt-1 text-sm">Theo dõi lợi nhuận thực tế sau mỗi phiên Live.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Tổng Doanh Thu</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalRevenue)}đ</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Lợi Nhuận Ròng</p>
          <p className="text-2xl font-bold text-indigo-600">{formatCurrency(totalProfit)}đ</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Số Scoop Đã Bán</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalScoops)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Biên Lợi Nhuận TB</p>
          <p className="text-2xl font-bold text-emerald-600">{avgMargin.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[450px] flex flex-col">
            <h3 className="text-base font-semibold text-slate-800 mb-5">Biểu đồ Lợi nhuận & Doanh thu</h3>
            {chartData.length > 0 ? (
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b', fontWeight: 500}} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b', fontWeight: 500}} tickFormatter={(val) => `${val / 1000000}M`} dx={-10} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontWeight: 500, color: '#0f172a'}}
                      formatter={(value: number) => [`${formatCurrency(value)}đ`, '']}
                    />
                    <Bar yAxisId="left" dataKey="revenue" name="Doanh thu" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar yAxisId="left" dataKey="netProfit" name="Lợi nhuận ròng" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <p className="font-medium">Chưa có dữ liệu phiên Live nào</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-semibold text-slate-800 mb-5">Thêm phiên Live</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Ngày</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm font-medium text-slate-900" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tổng Scoop đã bán</label>
                <input type="number" value={scoopsSold} onChange={e => setScoopsSold(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm font-medium text-slate-900" required placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tổng doanh thu (VNĐ)</label>
                <input type="text" value={revenue} onChange={e => setRevenue(formatCurrency(e.target.value))} className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm font-medium text-slate-900" required placeholder="0" />
              </div>
              
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Phí sàn TikTok (%)</label>
                  <input type="number" step="0.1" value={tiktokFeePercent} onChange={e => setTiktokFeePercent(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm font-medium text-slate-900" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Chi phí bao bì / Scoop (VNĐ)</label>
                  <input type="text" value={packagingCost} onChange={e => setPackagingCost(formatCurrency(e.target.value))} className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm font-medium text-slate-900" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Giá vốn TB / Scoop (VNĐ)</label>
                  <input type="text" value={averageScoopCost} onChange={e => setAverageScoopCost(formatCurrency(e.target.value))} className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm font-medium text-slate-900" required />
                </div>
              </div>

              <button type="submit" className="w-full mt-5 bg-indigo-600 text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors">
                Lưu phiên Live
              </button>
            </form>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-600 font-semibold">
              <tr>
                <th className="p-4">Ngày</th>
                <th className="p-4 text-right">Scoops</th>
                <th className="p-4 text-right">Doanh thu</th>
                <th className="p-4 text-right">Chi phí</th>
                <th className="p-4 text-right">Lợi nhuận ròng</th>
                <th className="p-4 text-right">Biên LN</th>
                <th className="p-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chartData.map(session => {
                const totalCost = session.revenue - session.netProfit;
                return (
                  <tr key={session.id} className="hover:bg-slate-50 transition-colors text-slate-900">
                    <td className="p-4">{new Date(session.date).toLocaleDateString('vi-VN')}</td>
                    <td className="p-4 text-right">{session.scoopsSold}</td>
                    <td className="p-4 text-right font-medium">{formatCurrency(session.revenue)}đ</td>
                    <td className="p-4 text-right text-slate-500">{formatCurrency(totalCost)}đ</td>
                    <td className="p-4 text-right font-semibold text-indigo-600">{formatCurrency(session.netProfit)}đ</td>
                    <td className="p-4 text-right">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${session.margin >= 20 ? 'bg-emerald-100 text-emerald-700' : session.margin > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {session.margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => handleDelete(session.id)} className="text-xs font-medium text-red-600 hover:text-red-800 transition-colors">
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })}
              {chartData.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Chưa có dữ liệu phiên Live
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

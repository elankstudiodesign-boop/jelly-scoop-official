import React, { useMemo } from 'react';
import { Product, ScoopConfig } from '../types';
import { useSupabaseConfigs } from '../hooks/useSupabase';
import { formatCurrency, parseCurrency } from '../lib/format';

export const defaultConfigs: ScoopConfig[] = [
  { id: '3', name: 'Scoop Lớn', price: 299000, totalItems: 35, ratioLow: 12, ratioMedium: 11, ratioHigh: 12 },
];

export default function Simulator({ products }: { products: Product[] }) {
  const { configs, updateConfig, loading } = useSupabaseConfigs(defaultConfigs);

  const averages = useMemo(() => {
    const getAvg = (group: 'Thấp' | 'Trung' | 'Cao' | 'Cao cấp') => {
      const items = products.filter(p => p.priceGroup === group);
      if (!items.length) return { cost: 0, retail: 0 };
      const totalCost = items.reduce((sum, p) => sum + p.cost, 0);
      const totalRetail = items.reduce((sum, p) => sum + (p.retailPrice || p.cost), 0);
      return {
        cost: totalCost / items.length,
        retail: totalRetail / items.length
      };
    };
    const highItems = products.filter(p => p.priceGroup === 'Cao' || p.priceGroup === 'Cao cấp');
    const highAvg = (() => {
      if (!highItems.length) return { cost: 0, retail: 0 };
      const totalCost = highItems.reduce((sum, p) => sum + p.cost, 0);
      const totalRetail = highItems.reduce((sum, p) => sum + (p.retailPrice || p.cost), 0);
      return { cost: totalCost / highItems.length, retail: totalRetail / highItems.length };
    })();
    return {
      low: getAvg('Thấp'),
      medium: getAvg('Trung'),
      high: highAvg
    };
  }, [products]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Đang tải cấu hình...</div>;
  }

  const handleUpdateConfig = (id: string, field: keyof ScoopConfig, value: any) => {
    if (field === 'totalItems') {
      const numValue = Number(value) || 0;
      const base = Math.floor(numValue / 3);
      const remainder = numValue % 3;
      updateConfig(id, {
        totalItems: numValue,
        ratioLow: base + remainder,
        ratioMedium: base,
        ratioHigh: base
      });
    } else {
      updateConfig(id, { [field]: value });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mô phỏng Scoop</h1>
        <p className="text-slate-500 mt-1 text-sm">Tính toán giá vốn, tổng giá bán lẻ và lợi nhuận cho Scoop.</p>
      </div>

      {/* Thông tin trung bình từ kho */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-5">
          Dữ liệu trung bình từ kho
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="md:px-5 first:px-0 pt-3 md:pt-0 first:pt-0">
            <h3 className="text-base font-semibold text-slate-800 mb-3">Nhóm Thấp</h3>
            <div className="space-y-2 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex justify-between"><span className="text-slate-500">Giá vốn TB:</span><span className="font-medium text-slate-900">{formatCurrency(Math.round(averages.low.cost))}đ</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Giá bán lẻ TB:</span><span className="font-medium text-slate-900">{formatCurrency(Math.round(averages.low.retail))}đ</span></div>
            </div>
          </div>
          <div className="md:px-5 pt-3 md:pt-0">
            <h3 className="text-base font-semibold text-slate-800 mb-3">Nhóm Trung</h3>
            <div className="space-y-2 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex justify-between"><span className="text-slate-500">Giá vốn TB:</span><span className="font-medium text-slate-900">{formatCurrency(Math.round(averages.medium.cost))}đ</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Giá bán lẻ TB:</span><span className="font-medium text-slate-900">{formatCurrency(Math.round(averages.medium.retail))}đ</span></div>
            </div>
          </div>
          <div className="md:px-5 pt-3 md:pt-0">
            <h3 className="text-base font-semibold text-slate-800 mb-3">Nhóm Cao</h3>
            <div className="space-y-2 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex justify-between"><span className="text-slate-500">Giá vốn TB:</span><span className="font-medium text-slate-900">{formatCurrency(Math.round(averages.high.cost))}đ</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Giá bán lẻ TB:</span><span className="font-medium text-slate-900">{formatCurrency(Math.round(averages.high.retail))}đ</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {configs.map(config => {
          const totalRatio = config.ratioLow + config.ratioMedium + config.ratioHigh;
          const countLow = totalRatio > 0 ? (config.ratioLow / totalRatio) * config.totalItems : 0;
          const countMedium = totalRatio > 0 ? (config.ratioMedium / totalRatio) * config.totalItems : 0;
          const countHigh = totalRatio > 0 ? (config.ratioHigh / totalRatio) * config.totalItems : 0;

          const totalCost = (countLow * averages.low.cost) + (countMedium * averages.medium.cost) + (countHigh * averages.high.cost);
          const totalRetail = (countLow * averages.low.retail) + (countMedium * averages.medium.retail) + (countHigh * averages.high.retail);
          
          const packagingCost = 10000;
          const profit = config.price - totalCost - packagingCost;
          const margin = config.price > 0 ? (profit / config.price) * 100 : 0;
          const isWarning = margin < 50;

          return (
            <div key={config.id} className={`bg-white rounded-xl border ${isWarning ? 'border-red-200 shadow-sm' : 'border-slate-200 shadow-sm'} flex flex-col overflow-hidden`}>
              {/* Header */}
              <div className={`p-5 border-b ${isWarning ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                <input 
                  type="text" 
                  value={config.name} 
                  onChange={e => handleUpdateConfig(config.id, 'name', e.target.value)}
                  className={`text-xl font-bold bg-transparent focus:outline-none w-full mb-3 text-center ${isWarning ? 'text-red-900' : 'text-slate-900'}`}
                />
                <div className="flex items-center justify-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isWarning ? 'text-red-600' : 'text-slate-500'}`}>Giá bán:</span>
                  <input 
                    type="text" 
                    value={formatCurrency(config.price)} 
                    onChange={e => handleUpdateConfig(config.id, 'price', parseCurrency(e.target.value))}
                    className={`text-lg font-bold bg-transparent focus:outline-none border-b ${isWarning ? 'border-red-300 focus:border-red-500 text-red-700' : 'border-slate-300 focus:border-indigo-500 text-slate-800'} w-28 text-center`}
                  />
                  <span className={`text-xs font-medium ${isWarning ? 'text-red-500' : 'text-slate-500'}`}>VNĐ</span>
                </div>
              </div>

              {/* Inputs */}
              <div className="p-5 space-y-5 flex-1 bg-white">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tổng số món / Scoop</label>
                  <input 
                    type="number" 
                    value={config.totalItems} 
                    onChange={e => handleUpdateConfig(config.id, 'totalItems', Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-base font-medium text-slate-900 text-center" 
                  />
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-3">Tỉ lệ múc (Thấp : Trung : Cao)</label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="flex flex-col justify-between bg-slate-50 p-2 sm:p-2.5 rounded-lg border border-slate-200">
                      <div className="text-center mb-2">
                        <div className="text-xs sm:text-sm font-semibold text-slate-700">Thấp</div>
                        <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-0.5">({countLow.toFixed(1)} món)</div>
                      </div>
                      <input type="number" value={config.ratioLow} onChange={e => handleUpdateConfig(config.id, 'ratioLow', Number(e.target.value))} className="w-full border border-slate-300 rounded-md px-2 py-1.5 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm sm:text-base font-bold text-slate-900 text-center" />
                    </div>
                    <div className="flex flex-col justify-between bg-slate-50 p-2 sm:p-2.5 rounded-lg border border-slate-200">
                      <div className="text-center mb-2">
                        <div className="text-xs sm:text-sm font-semibold text-slate-700">Trung</div>
                        <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-0.5">({countMedium.toFixed(1)} món)</div>
                      </div>
                      <input type="number" value={config.ratioMedium} onChange={e => handleUpdateConfig(config.id, 'ratioMedium', Number(e.target.value))} className="w-full border border-slate-300 rounded-md px-2 py-1.5 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm sm:text-base font-bold text-slate-900 text-center" />
                    </div>
                    <div className="flex flex-col justify-between bg-slate-50 p-2 sm:p-2.5 rounded-lg border border-slate-200">
                      <div className="text-center mb-2">
                        <div className="text-xs sm:text-sm font-semibold text-slate-700">Cao</div>
                        <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-0.5">({countHigh.toFixed(1)} món)</div>
                      </div>
                      <input type="number" value={config.ratioHigh} onChange={e => handleUpdateConfig(config.id, 'ratioHigh', Number(e.target.value))} className="w-full border border-slate-300 rounded-md px-2 py-1.5 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm sm:text-base font-bold text-slate-900 text-center" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className={`p-5 ${isWarning ? 'bg-red-50' : 'bg-slate-50'} space-y-4 border-t ${isWarning ? 'border-red-100' : 'border-slate-200'}`}>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-md border border-slate-200 shadow-sm">
                    <span className={`text-xs font-medium ${isWarning ? 'text-red-700' : 'text-slate-600'}`}>Tổng giá vốn:</span>
                    <span className={`font-semibold text-sm ${isWarning ? 'text-red-900' : 'text-slate-900'}`}>{formatCurrency(Math.round(totalCost))}đ</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-md border border-slate-200 shadow-sm">
                    <span className={`text-xs font-medium ${isWarning ? 'text-red-700' : 'text-slate-600'}`}>Tổng giá bán lẻ:</span>
                    <span className={`font-semibold text-sm ${isWarning ? 'text-red-600' : 'text-slate-700'}`}>{formatCurrency(Math.round(totalRetail))}đ</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-md border border-slate-200 shadow-sm">
                    <span className={`text-xs font-medium ${isWarning ? 'text-red-700' : 'text-slate-600'}`}>Chi phí bao bì:</span>
                    <span className={`font-semibold text-sm ${isWarning ? 'text-red-900' : 'text-slate-900'}`}>{formatCurrency(packagingCost)}đ</span>
                  </div>
                </div>
                
                <div className={`pt-4 border-t ${isWarning ? 'border-red-200' : 'border-slate-200'} space-y-1.5`}>
                  <div className="flex justify-between items-end">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${isWarning ? 'text-red-800' : 'text-slate-600'}`}>Lợi nhuận:</span>
                    <span className={`text-xl font-bold ${profit > 0 ? (isWarning ? 'text-red-600' : 'text-indigo-600') : 'text-red-500'}`}>
                      {formatCurrency(Math.round(profit))}đ
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${isWarning ? 'text-red-800' : 'text-slate-600'}`}>Biên lợi nhuận:</span>
                    <span className={`text-lg font-bold ${isWarning ? 'text-red-600' : 'text-indigo-600'}`}>
                      {margin.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {isWarning && (
                  <div className="mt-4 text-red-700 text-xs bg-red-100 p-3 rounded-md border border-red-200">
                    <p className="font-medium">Biên lợi nhuận dưới 50%. Hãy điều chỉnh giá bán hoặc số lượng món.</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

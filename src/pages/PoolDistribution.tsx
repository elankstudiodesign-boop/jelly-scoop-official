import { useMemo, useState } from 'react';
import { Product, PriceGroup } from '../types';
import { formatCurrency } from '../lib/format';
import { Info, TrendingUp, Package, Droplets } from 'lucide-react';

interface CategoryConfig {
  group: PriceGroup;
  productCount: number;
  ratio: number; // Tỉ lệ phần trăm (%) của tổng số hạt trong bể
}

export default function PoolDistribution({ products }: { products: Product[] }) {
  const [totalBeadsInPool, setTotalBeadsInPool] = useState<number>(1000);

  // Cấu hình tỉ lệ phần trăm mặc định cho các danh mục
  const [categoryConfigs, setCategoryConfigs] = useState<CategoryConfig[]>([
    { group: 'Thấp', productCount: 20, ratio: 66.7 }, // ~ 2/3
    { group: 'Trung', productCount: 7, ratio: 20 },
    { group: 'Cao', productCount: 2, ratio: 10 },
    { group: 'Cao cấp', productCount: 1, ratio: 3.3 },
  ]);

  // Phân loại sản phẩm từ kho
  const groupedProducts = useMemo(() => {
    const groups: Record<PriceGroup, Product[]> = {
      'Thấp': [],
      'Trung': [],
      'Cao': [],
      'Cao cấp': [],
    };
    products.forEach(p => {
      if (groups[p.priceGroup]) {
        groups[p.priceGroup].push(p);
      }
    });
    return groups;
  }, [products]);

  // Tính toán phân bổ hạt
  const distribution = useMemo(() => {
    let currentTotalCost = 0;
    let currentTotalBeads = 0;

    const categoryResults = categoryConfigs.map(config => {
      // Tổng số hạt cho cả danh mục này
      const totalBeadsForCategory = (config.ratio / 100) * totalBeadsInPool;
      
      // Lấy danh sách sản phẩm thực tế trong nhóm này
      const actualProducts = groupedProducts[config.group];
      const productCount = actualProducts.length;
      
      // Số hạt dự kiến cho mỗi sản phẩm trong danh mục này
      const beadsPerProductRaw = productCount > 0 ? totalBeadsForCategory / productCount : 0;
      
      // Tính toán cho từng sản phẩm (giới hạn bởi số lượng nhập/kho)
      const productDetails = actualProducts.map(p => {
        const beadsInPool = Math.min(Math.round(beadsPerProductRaw), p.warehouseQuantity || 9999);
        return {
          ...p,
          beadsInPool
        };
      });

      const categoryBeads = productDetails.reduce((sum, p) => sum + p.beadsInPool, 0);
      const categoryCost = productDetails.reduce((sum, p) => sum + (p.beadsInPool * p.cost), 0);

      currentTotalCost += categoryCost;
      currentTotalBeads += categoryBeads;

      return {
        ...config,
        totalBeadsForCategory: Math.round(totalBeadsForCategory),
        beadsPerProduct: Math.round(beadsPerProductRaw),
        actualBeads: categoryBeads,
        actualCost: categoryCost,
        products: productDetails
      };
    });

    return {
      categories: categoryResults,
      totalCost: currentTotalCost,
      totalBeads: currentTotalBeads
    };
  }, [categoryConfigs, totalBeadsInPool, groupedProducts]);

  // Tính toán giá vốn trung bình
  const stats = useMemo(() => {
    if (distribution.totalBeads === 0) return { avgCostPerBead: 0 };
    const avgCostPerBead = distribution.totalCost / distribution.totalBeads;
    return {
      avgCostPerBead
    };
  }, [distribution]);

  const handleRatioChange = (group: PriceGroup, value: number) => {
    setCategoryConfigs(prev => prev.map(c => c.group === group ? { ...c, ratio: value } : c));
  };

  const resetRatios = () => {
    setCategoryConfigs([
      { group: 'Thấp', productCount: 20, ratio: 66.7 },
      { group: 'Trung', productCount: 7, ratio: 20 },
      { group: 'Cao', productCount: 2, ratio: 10 },
      { group: 'Cao cấp', productCount: 1, ratio: 3.3 },
    ]);
  };

  const totalConfiguredRatio = categoryConfigs.reduce((sum, c) => sum + c.ratio, 0);

  return (
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Droplets className="text-indigo-500 w-5 h-5 md:w-6 md:h-6" />
            Phân bổ hạt vào bể
          </h1>
          <p className="text-slate-500 mt-0.5 text-xs md:text-sm">Tính toán tỉ lệ hạt cho từng sản phẩm và danh mục.</p>
        </div>
        <button 
          onClick={resetRatios}
          className="text-[10px] md:text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors self-start md:self-center"
        >
          Đặt lại tỉ lệ mặc định
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Cấu hình bể */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xs md:text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 md:mb-6 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-500" />
              Thông số bể hạt
            </h2>
            
            <div className="space-y-2">
              <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Tổng số hạt trong bể</label>
              <div className="relative">
                <input 
                  type="number" 
                  min="0"
                  value={totalBeadsInPool} 
                  onChange={e => setTotalBeadsInPool(Number(e.target.value))}
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-lg"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">hạt</span>
              </div>
            </div>
          </div>

          {/* Cấu hình tỉ lệ danh mục */}
          <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-xs md:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                Tỉ lệ phân bổ
              </h2>
              <div className={`text-[10px] md:text-xs font-bold px-2 md:px-3 py-1 rounded-full border ${Math.abs(totalConfiguredRatio - 100) < 0.1 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
                Tổng: {totalConfiguredRatio.toFixed(1)}%
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {categoryConfigs.map(config => {
                const catResult = distribution.categories.find(c => c.group === config.group);
                return (
                  <div key={config.group} className="p-3 md:p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-2 md:space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase truncate mr-1">{config.group}</span>
                      <span className="text-[8px] md:text-[10px] font-bold bg-white px-1 md:px-2 py-0.5 rounded-full border border-slate-200 text-slate-600 shrink-0">
                        {catResult?.products.length || 0} SP
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="relative">
                        <input 
                          type="number" 
                          min="0"
                          step="0.1"
                          value={config.ratio} 
                          onChange={e => handleRatioChange(config.group, Number(e.target.value))}
                          className="w-full px-2 py-1.5 md:py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-center pr-5 md:pr-8 text-sm md:text-base"
                        />
                        <span className="absolute right-1.5 md:right-3 top-1/2 -translate-y-1/2 text-[8px] md:text-[10px] font-bold text-slate-400">%</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-200 space-y-1">
                      <div className="flex justify-between text-[9px] md:text-[11px]">
                        <span className="text-slate-500">Tổng:</span>
                        <span className="font-bold text-slate-700">{catResult?.totalBeadsForCategory}</span>
                      </div>
                      <div className="flex justify-between text-[9px] md:text-[11px]">
                        <span className="text-slate-500">Mỗi SP:</span>
                        <span className="font-bold text-indigo-600">~{catResult?.beadsPerProduct}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 md:mt-6 p-3 md:p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-start gap-2 md:gap-3">
              <Info className="w-4 h-4 md:w-5 md:h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="text-[10px] md:text-xs text-indigo-700 leading-relaxed">
                <p className="font-bold mb-0.5 md:mb-1">Cách tính phân bổ:</p>
                <p>1. Tổng hạt danh mục = (Tỉ lệ % / 100) × Tổng số hạt trong bể.</p>
                <p>2. Số hạt mỗi sản phẩm = Tổng hạt danh mục / Số lượng sản phẩm trong danh mục.</p>
                <p className="mt-1">Hệ thống sẽ tự động giới hạn số hạt thực tế không vượt quá số lượng nhập trong kho của từng sản phẩm.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Kết quả & Thống kê */}
        <div className="space-y-4 md:space-y-6">
          <div className="bg-indigo-600 p-5 md:p-6 rounded-xl md:rounded-2xl shadow-lg text-white space-y-4 md:space-y-6">
            <h2 className="text-xs md:text-sm font-bold uppercase tracking-widest opacity-80">Thống kê chi phí bể</h2>
            
            <div className="space-y-1">
              <span className="text-[10px] md:text-xs opacity-70 uppercase font-bold">Tổng giá vốn bể</span>
              <div className="text-2xl md:text-4xl font-black tracking-tight">
                {formatCurrency(Math.round(distribution.totalCost))}đ
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 md:pt-6 border-t border-white/20">
              <div className="space-y-0.5">
                <span className="text-[9px] md:text-[10px] opacity-70 uppercase font-bold">Giá vốn TB 1 hạt</span>
                <div className="text-sm md:text-lg font-bold">{formatCurrency(Math.round(stats.avgCostPerBead))}đ</div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] md:text-[10px] opacity-70 uppercase font-bold">Tổng hạt thực tế</span>
                <div className="text-sm md:text-lg font-bold">{distribution.totalBeads.toLocaleString()}</div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] md:text-[10px] opacity-70 uppercase font-bold">Số lượng SP</span>
                <div className="text-sm md:text-lg font-bold">{products.length}</div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] md:text-[10px] opacity-70 uppercase font-bold">Hiệu suất hạt</span>
                <div className="text-sm md:text-lg font-bold">
                  {((distribution.totalBeads / (totalBeadsInPool || 1)) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Chi tiết danh mục */}
          <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm space-y-3 md:space-y-4">
            <h2 className="text-xs md:text-sm font-bold text-slate-800 uppercase tracking-wider">Chi tiết thực tế</h2>
            <div className="space-y-3 md:space-y-4">
              {distribution.categories.map(cat => (
                <div key={cat.group} className="space-y-1.5">
                  <div className="flex justify-between text-[10px] md:text-xs font-bold">
                    <span className="text-slate-600">{cat.group}</span>
                    <span className="text-slate-900">{cat.actualBeads.toLocaleString()} hạt</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-500" 
                      style={{ width: `${distribution.totalBeads > 0 ? (cat.actualBeads / distribution.totalBeads) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] md:text-[10px] text-slate-400 font-medium">
                    <span>{cat.productCount} sản phẩm</span>
                    <span>Vốn: {formatCurrency(Math.round(cat.actualCost))}đ</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

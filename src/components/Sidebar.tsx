import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, Package, Calculator, ShoppingCart, ArrowDownToLine, Wallet, Droplets } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { path: '/', label: 'Thống kê', icon: <BarChart3 className="w-5 h-5" /> },
    { path: '/products', label: 'Bể', icon: <Package className="w-5 h-5" /> },
    { path: '/import', label: 'Nhập kho', icon: <ArrowDownToLine className="w-5 h-5" /> },
    { path: '/pool', label: 'Phân bổ bể', icon: <Droplets className="w-5 h-5" /> },
    { path: '/simulator', label: 'Mô phỏng', icon: <Calculator className="w-5 h-5" /> },
    { path: '/live', label: 'Đơn hàng', icon: <ShoppingCart className="w-5 h-5" /> },
    { path: '/finance', label: 'Tài chính', icon: <Wallet className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 h-screen sticky top-0 flex-col z-10 shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            JellyScoop
          </h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="text-xs text-slate-500 text-center">
            &copy; {new Date().getFullYear()} JellyScoop
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around items-center pb-safe">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full py-3 text-[10px] font-medium transition-colors ${
                isActive 
                  ? 'text-indigo-700' 
                  : 'text-slate-500 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`mb-1 ${isActive ? 'scale-110 transition-transform' : ''}`}>
                  {item.icon}
                </div>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

import React from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowDownToLine, ShoppingCart, Package } from 'lucide-react';

export default function BottomNav() {
  const navItems = [
    { path: '/import', label: 'Nhập kho', icon: <ArrowDownToLine className="w-6 h-6" /> },
    { path: '/live', label: 'Đơn hàng', icon: <ShoppingCart className="w-6 h-6" /> },
    { path: '/products', label: 'Bể', icon: <Package className="w-6 h-6" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[60] pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${
                isActive 
                  ? 'text-indigo-600' 
                  : 'text-slate-500 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
                  {item.icon}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider transition-opacity ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 w-8 h-1 bg-indigo-600 rounded-b-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

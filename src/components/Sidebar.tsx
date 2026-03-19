import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const navItems = [
    { path: '/', label: 'Thống kê' },
    { path: '/products', label: 'Kho sản phẩm' },
    { path: '/simulator', label: 'Mô phỏng Scoop' },
    { path: '/live', label: 'Đơn hàng' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col z-10 shadow-sm">
      <div className="p-6 border-b border-slate-100 flex items-center">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          JellyScoop
        </h1>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `block px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
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
  );
}

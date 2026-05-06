import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BarChart3, Package, Calculator, ShoppingCart, ArrowDownToLine, Wallet, Droplets, Settings, Menu, X, LogOut } from 'lucide-react';
import { useSupabaseAuth } from '../hooks/useSupabase';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentRole } = useSupabaseAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('scoop_app_access_granted');
    localStorage.removeItem('scoop_app_role');
    window.location.reload();
  };

  const navItems = [
    { path: '/', label: 'Thống kê', icon: <BarChart3 className="w-5 h-5" />, roles: ['ADMIN', 'STAFF'] },
    { path: '/import', label: 'Nhập kho', icon: <ArrowDownToLine className="w-5 h-5" />, roles: ['ADMIN', 'STAFF'] },
    { path: '/live', label: 'Đơn hàng', icon: <ShoppingCart className="w-5 h-5" />, roles: ['ADMIN', 'STAFF'] },
    { path: '/finance', label: 'Tài chính', icon: <Wallet className="w-5 h-5" />, roles: ['ADMIN', 'STAFF'] },
    { path: '/settings', label: 'Cài đặt', icon: <Settings className="w-5 h-5" />, roles: ['ADMIN'] },
  ].filter(item => !currentRole || item.roles.includes(currentRole));

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 h-screen sticky top-0 flex-col z-10 shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            JellyScoop
          </h1>
          {currentRole === 'STAFF' && (
            <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Staff</span>
          )}
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

        <div className="p-4 border-t border-slate-100 space-y-2">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Đăng xuất
          </button>
          <div className="text-[10px] text-slate-400 text-center uppercase font-bold tracking-widest pt-2">
            JellyScoop Management
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-[60] flex items-center justify-between px-4 pt-safe">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            JellyScoop
          </h1>
          {currentRole === 'STAFF' && (
            <span className="bg-slate-100 text-slate-500 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase">Staff</span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          aria-label="Toggle Menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] transition-opacity"
          onClick={toggleSidebar}
        />
      )}

      {/* Mobile Sidebar Menu */}
      <aside 
        className={`md:hidden fixed top-0 right-0 bottom-0 w-72 bg-white z-[80] shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } pt-safe`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Menu</h2>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-4 text-base font-semibold rounded-xl transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 translate-x-1' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={isActive ? 'text-white' : 'text-slate-400'}>
                    {item.icon}
                  </div>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-4">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 w-full px-4 py-4 text-base font-bold text-red-600 hover:bg-red-100 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            Đăng xuất
          </button>
          <div className="text-xs text-slate-500 font-medium text-center">
            &copy; {new Date().getFullYear()} JellyScoop
          </div>
        </div>
      </aside>
    </>
  );
}

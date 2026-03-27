import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ArrowDownToLine, ShoppingCart, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function BottomNav() {
  const location = useLocation();
  const navItems = [
    { path: '/import', label: 'Nhập kho', icon: ArrowDownToLine },
    { path: '/live', label: 'Đơn hàng', icon: ShoppingCart },
    { path: '/products', label: 'Kho hàng hoá', icon: Package },
  ];

  return (
    <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-[60] pb-[env(safe-area-inset-bottom)]">
      <nav className="bg-white/90 backdrop-blur-2xl border border-white/40 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] px-3 py-2">
        <div className="flex items-center justify-between relative">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center justify-center py-2.5 px-2 flex-1 transition-all duration-300"
              >
                <div className="relative z-10 flex flex-col items-center gap-1.5">
                  <motion.div
                    animate={{
                      scale: isActive ? 1.15 : 1,
                      y: isActive ? -3 : 0,
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className={isActive ? 'text-indigo-600' : 'text-slate-400'}
                  >
                    <Icon className="w-6 h-6 stroke-[2.5px]" />
                  </motion.div>
                  
                  <span className={`text-[10px] font-extrabold tracking-tight transition-all duration-300 ${
                    isActive ? 'text-indigo-600 opacity-100' : 'text-slate-400 opacity-60'
                  }`}>
                    {item.label}
                  </span>
                </div>

                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-x-1 inset-y-1 bg-indigo-50/90 rounded-2xl z-0"
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                  />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

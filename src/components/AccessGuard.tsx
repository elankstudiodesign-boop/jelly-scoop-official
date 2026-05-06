import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '../hooks/useSupabase';
import { Lock, Key as KeyIcon, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AccessGuardProps {
  children: React.ReactNode;
}

const ACCESS_KEY = 'scoop_app_access_granted';

export default function AccessGuard({ children }: AccessGuardProps) {
  const [password, setPassword] = useState('');
  const [isGranted, setIsGranted] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const { adminPassword, staffPassword, isLoading } = useSupabaseAuth();

  useEffect(() => {
    const granted = localStorage.getItem(ACCESS_KEY);
    if (granted === 'true') {
      setIsGranted(true);
    } else {
      setIsGranted(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLoading) return;

    if (!adminPassword && !staffPassword) {
      setError('Hệ thống chưa tìm thấy cấu hình mật khẩu. Hãy chắc chắn bạn đã thêm "admin_password" hoặc "staff_password" vào bảng app_settings.');
      return;
    }

    const inputPwd = password.trim();

    if (adminPassword && inputPwd === adminPassword.trim()) {
      localStorage.setItem(ACCESS_KEY, 'true');
      localStorage.setItem('scoop_app_role', 'ADMIN');
      setIsGranted(true);
    } else if (staffPassword && inputPwd === staffPassword.trim()) {
      localStorage.setItem(ACCESS_KEY, 'true');
      localStorage.setItem('scoop_app_role', 'STAFF');
      setIsGranted(true);
    } else {
      setError('Mật khẩu không chính xác. Vui lòng thử lại.');
      setPassword('');
    }
  };

  if (isGranted === null) return null; // Wait for initial check

  if (isGranted) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
      >
        <div className="p-8 sm:p-12">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center relative">
              <Lock className="w-10 h-10 text-indigo-600" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg transform rotate-12">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-3">
              Yêu cầu truy cập
            </h1>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              Vui lòng nhập mật khẩu được cấp để truy cập vào hệ thống quản lý. Mật khẩu sẽ được ghi nhớ trên thiết bị này.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyIcon className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold tracking-widest"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
              <AnimatePresence>
                {error && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-600 text-[11px] font-bold pl-2 leading-relaxed bg-red-50 p-2 rounded-lg border border-red-100 mt-2"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Đang tải...
                </div>
              ) : (
                <>
                  Xác thực truy cập
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-12 text-center">
            <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest">
              Jelly Scoop Order Management System
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

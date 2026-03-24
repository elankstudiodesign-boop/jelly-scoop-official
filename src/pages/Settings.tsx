import React, { useState, useRef } from 'react';
import { Database, Download, Upload, AlertTriangle, CheckCircle2, Trash2, Info } from 'lucide-react';
import { Product, Transaction, LiveSession, Supplier } from '../types';
import { formatCurrency } from '../lib/format';

interface SettingsProps {
  products: Product[];
  suppliers: Supplier[];
  transactions: Transaction[];
  sessions: LiveSession[];
  onImportData: (data: {
    products?: Product[];
    suppliers?: Supplier[];
    transactions?: Transaction[];
    sessions?: LiveSession[];
  }) => Promise<void>;
}

export default function Settings({ products, suppliers, transactions, sessions, onImportData }: SettingsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(localStorage.getItem('jellyscoop_last_backup'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    setIsExporting(true);
    try {
      const now = new Date().toISOString();
      const backupData = {
        version: '1.0',
        timestamp: now,
        data: {
          products,
          suppliers,
          transactions,
          sessions
        }
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `jellyscoop_backup_${now.split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      localStorage.setItem('jellyscoop_last_backup', now);
      setLastBackup(now);
      setImportSuccess('Xuất dữ liệu thành công!');
      setTimeout(() => setImportSuccess(null), 3000);
    } catch (error) {
      console.error('Export error:', error);
      setImportError('Lỗi khi xuất dữ liệu.');
      setTimeout(() => setImportError(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const backup = JSON.parse(content);

        if (!backup.data || (!backup.data.products && !backup.data.suppliers && !backup.data.transactions && !backup.data.sessions)) {
          throw new Error('Định dạng file không hợp lệ.');
        }

        if (window.confirm('CẢNH BÁO: Việc nhập dữ liệu sẽ ghi đè hoặc bổ sung vào dữ liệu hiện tại. Bạn có chắc chắn muốn tiếp tục?')) {
          await onImportData(backup.data);
          setImportSuccess('Nhập dữ liệu thành công!');
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Import error:', error);
        setImportError('Lỗi khi nhập dữ liệu. Vui lòng kiểm tra lại file backup.');
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cài đặt hệ thống</h1>
        <p className="text-slate-500 mt-2">Quản lý dữ liệu và cấu hình ứng dụng.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Sao lưu & Phục hồi</h2>
              <p className="text-xs text-slate-500">Bảo vệ dữ liệu của bạn</p>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-bold mb-1">Lưu ý quan trọng</p>
                <p>Bạn nên thực hiện sao lưu dữ liệu định kỳ (hàng tuần hoặc hàng tháng) để tránh mất mát thông tin khách hàng và lịch sử giao dịch trong trường hợp có sự cố hệ thống.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                    <Download className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-900">Xuất dữ liệu (Backup)</div>
                    <div className="text-xs text-slate-500">Tải về file JSON chứa toàn bộ dữ liệu</div>
                    {lastBackup && (
                      <div className="text-[10px] text-green-600 font-medium mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Lần cuối: {new Date(lastBackup).toLocaleString('vi-VN')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-slate-300 group-hover:text-indigo-400">
                  {isExporting ? 'Đang xử lý...' : 'Tải về'}
                </div>
              </button>

              <button
                onClick={handleImportClick}
                disabled={isImporting}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-900">Nhập dữ liệu (Restore)</div>
                    <div className="text-xs text-slate-500">Khôi phục dữ liệu từ file backup đã lưu</div>
                  </div>
                </div>
                <div className="text-slate-300 group-hover:text-emerald-400">
                  {isImporting ? 'Đang xử lý...' : 'Chọn file'}
                </div>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
            </div>

            {(importError || importSuccess) && (
              <div className={`p-4 rounded-xl flex items-center gap-3 ${importError ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                {importError ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                <span className="text-sm font-medium">{importError || importSuccess}</span>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Thông tin dữ liệu</h2>
              <p className="text-xs text-slate-500">Tổng quan hệ thống</p>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-slate-600">Sản phẩm:</span>
                <span className="font-bold text-slate-900">{products.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-slate-600">Nhà cung cấp:</span>
                <span className="font-bold text-slate-900">{suppliers.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-slate-600">Giao dịch:</span>
                <span className="font-bold text-slate-900">{transactions.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-slate-600">Phiên bán hàng:</span>
                <span className="font-bold text-slate-900">{sessions.length}</span>
              </div>
              <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Dữ liệu của bạn được lưu trữ an toàn trên Supabase Cloud. Việc sao lưu thủ công giúp bạn có thêm một bản sao dự phòng trên máy tính cá nhân để an tâm tuyệt đối.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

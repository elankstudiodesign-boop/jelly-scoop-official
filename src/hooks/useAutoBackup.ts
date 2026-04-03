import { useEffect, useRef } from 'react';
import { Product, Supplier, Transaction, LiveSession, PackagingItem } from '../types';
import { toast } from 'sonner';

interface AutoBackupProps {
  products: Product[];
  suppliers: Supplier[];
  transactions: Transaction[];
  sessions: LiveSession[];
  packagingItems: PackagingItem[];
}

export function useAutoBackup({
  products,
  suppliers,
  transactions,
  sessions,
  packagingItems
}: AutoBackupProps) {
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    // Only run on desktop
    const isDesktop = !/Mobi|Android/i.test(navigator.userAgent);
    if (!isDesktop || hasAttemptedRef.current) return;

    const lastBackup = localStorage.getItem('last_auto_backup');
    const now = Date.now();
    const weekInMs = 7 * 24 * 60 * 60 * 1000;

    if (!lastBackup || now - parseInt(lastBackup) > weekInMs) {
      hasAttemptedRef.current = true;
      
      // Small delay to ensure data is stable and not to interrupt initial render
      const timer = setTimeout(() => {
        const backupData = {
          products,
          suppliers,
          transactions,
          sessions,
          packagingItems,
          backupDate: new Date().toISOString(),
          version: '1.0'
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `jelly_scoop_backup_${new Date().toISOString().split('T')[0]}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        localStorage.setItem('last_auto_backup', Date.now().toString());
        toast.success('Đã tự động sao lưu dữ liệu hàng tuần!', {
          description: 'Tệp sao lưu đã được tải về máy tính của bạn.'
        });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [products, suppliers, transactions, sessions, packagingItems]);
}

import { executeOrderTransaction } from '../hooks/useSupabase';
import { toast } from 'sonner';

const QUEUE_KEY = 'scoop_offline_orders';

export const getOfflineOrders = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

export const addOfflineOrder = (payload: any) => {
  const orders = getOfflineOrders();
  orders.push({ id: crypto.randomUUID(), payload, timestamp: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(orders));
  window.dispatchEvent(new Event('offline_queue_updated'));
};

let isProcessing = false;

export const processOfflineOrders = async () => {
  if (!navigator.onLine || isProcessing) return;
  const orders = getOfflineOrders();
  if (orders.length === 0) return;

  isProcessing = true;
  toast.info(`Đang đồng bộ ${orders.length} đơn hàng offline...`);
  const remaining = [];
  let successCount = 0;

  for (const order of orders) {
    try {
      await executeOrderTransaction(order.payload);
      successCount++;
    } catch (error: any) {
      console.error('Failed to sync order', order, error);
      // Giữ lại trong hàng đợi nếu là lỗi mạng
      if (error.message === 'Failed to fetch' || error.message?.includes('network')) {
        remaining.push(order);
      } else {
        // Bỏ qua nếu là lỗi logic/SQL để tránh kẹt hàng đợi vĩnh viễn
        console.error('Discarding invalid offline order:', order);
      }
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  window.dispatchEvent(new Event('offline_queue_updated'));
  isProcessing = false;

  if (successCount > 0) {
    toast.success(`Đã đồng bộ thành công ${successCount} đơn hàng!`);
  }
};

// Tự động đồng bộ khi có mạng trở lại
window.addEventListener('online', processOfflineOrders);

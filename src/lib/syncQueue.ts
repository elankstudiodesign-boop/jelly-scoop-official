import { executeOrderTransaction } from '../hooks/useSupabase';
import { supabase, hasSupabaseConfig } from './supabase';
import { toast } from 'sonner';

const QUEUE_KEY = 'scoop_offline_queue';

export type MutationAction = 
  | { type: 'ORDER'; payload: any }
  | { type: 'INSERT'; table: string; payload: any }
  | { type: 'UPDATE'; table: string; id: string; payload: any }
  | { type: 'DELETE'; table: string; id: string };

export interface QueuedMutation {
  id: string;
  action: MutationAction;
  timestamp: number;
}

export const getOfflineQueue = (): QueuedMutation[] => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

export const addToOfflineQueue = (action: MutationAction) => {
  const queue = getOfflineQueue();
  queue.push({ id: crypto.randomUUID(), action, timestamp: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event('offline_queue_updated'));
};

let isProcessing = false;

export const processOfflineQueue = async () => {
  if (!navigator.onLine || isProcessing || !hasSupabaseConfig) return;
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  isProcessing = true;
  toast.info(`Đang đồng bộ ${queue.length} thao tác offline...`);
  const remaining: QueuedMutation[] = [];
  let successCount = 0;

  for (const item of queue) {
    try {
      if (item.action.type === 'ORDER') {
        await executeOrderTransaction(item.action.payload);
      } else if (item.action.type === 'INSERT') {
        const { error } = await supabase.from(item.action.table).upsert([item.action.payload]);
        if (error) throw error;
      } else if (item.action.type === 'UPDATE') {
        const { error } = await supabase.from(item.action.table).update(item.action.payload).eq('id', item.action.id);
        if (error) throw error;
      } else if (item.action.type === 'DELETE') {
        const { error } = await supabase.from(item.action.table).delete().eq('id', item.action.id);
        if (error) throw error;
      }
      successCount++;
    } catch (error: any) {
      console.error('Failed to sync item', item, error);
      if (error.message === 'Failed to fetch' || error.message?.includes('network')) {
        remaining.push(item);
      } else {
        console.error('Discarding invalid offline mutation:', item);
      }
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  window.dispatchEvent(new Event('offline_queue_updated'));
  isProcessing = false;

  if (successCount > 0) {
    toast.success(`Đã đồng bộ thành công ${successCount} thao tác!`);
  }
};

// Auto sync when online
window.addEventListener('online', processOfflineQueue);

// Backward compatibility for old offline orders
export const addOfflineOrder = (payload: any) => {
  addToOfflineQueue({ type: 'ORDER', payload });
};

export const processOfflineOrders = processOfflineQueue;

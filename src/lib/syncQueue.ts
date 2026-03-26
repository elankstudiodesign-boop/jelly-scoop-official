import { executeOrderTransaction } from '../hooks/useSupabase';
import { supabase, hasSupabaseConfig } from './supabase';
import { toast } from 'sonner';
import { offlineStorage } from './offlineStorage';

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

export const getOfflineQueue = async (): Promise<QueuedMutation[]> => {
  return await offlineStorage.getAll();
};

export const addToOfflineQueue = async (action: MutationAction) => {
  const mutation: QueuedMutation = { 
    id: crypto.randomUUID(), 
    action, 
    timestamp: Date.now() 
  };
  await offlineStorage.save(mutation);
  window.dispatchEvent(new Event('offline_queue_updated'));
};

let isProcessing = false;

export const processOfflineQueue = async () => {
  if (!navigator.onLine || isProcessing || !hasSupabaseConfig) return;
  const queue = await getOfflineQueue();
  if (queue.length === 0) return;

  isProcessing = true;
  toast.info(`Đang đồng bộ ${queue.length} thao tác offline...`);
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
      
      // Remove from IndexedDB after successful sync
      await offlineStorage.remove(item.id);
      successCount++;
    } catch (error: any) {
      console.error('Failed to sync item', item, error);
      // If it's a network error, we keep it in the queue for next time
      if (error.message === 'Failed to fetch' || error.message?.includes('network')) {
        // Stop processing the rest of the queue if network is down
        break;
      } else {
        // For other errors (e.g. data validation), we might want to remove it to avoid blocking the queue
        console.error('Discarding invalid offline mutation:', item);
        await offlineStorage.remove(item.id);
      }
    }
  }

  window.dispatchEvent(new Event('offline_queue_updated'));
  isProcessing = false;

  if (successCount > 0) {
    toast.success(`Đã đồng bộ thành công ${successCount} thao tác!`);
  }
};

// Auto sync when online
window.addEventListener('online', processOfflineQueue);

// Backward compatibility for old offline orders
export const addOfflineOrder = async (payload: any) => {
  await addToOfflineQueue({ type: 'ORDER', payload });
};

export const processOfflineOrders = processOfflineQueue;

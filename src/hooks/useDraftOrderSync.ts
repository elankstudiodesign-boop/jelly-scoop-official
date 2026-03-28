import { useEffect, useCallback, useRef } from 'react';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { OrderItem, PackagingItem } from '../types';

export interface DraftOrderState {
  orderType: 'SCOOP' | 'RETAIL';
  selectedConfigId: string;
  orderItems: OrderItem[];
  retailPackagingCost: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  scannedPackagingItems: { item: PackagingItem, quantity: number }[];
  shippingCost: string;
  discount: string;
  customScoopPrice: string;
  scoopQuantity: number;
  scoopNotes: string;
}

export function useDraftOrderSync(
  onStateChange: (newState: Partial<DraftOrderState>) => void,
  onOrderCompleted: () => void
) {
  const channelRef = useRef<any>(null);
  const isLocalUpdateRef = useRef(false);

  useEffect(() => {
    if (!hasSupabaseConfig) return;

    const channel = supabase.channel('draft_order_sync');
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'state_update' }, (payload) => {
        isLocalUpdateRef.current = true;
        onStateChange(payload.payload as Partial<DraftOrderState>);
        // Reset the flag after a short delay to allow React to process the state update
        setTimeout(() => {
          isLocalUpdateRef.current = false;
        }, 50);
      })
      .on('broadcast', { event: 'order_completed' }, () => {
        isLocalUpdateRef.current = true;
        onOrderCompleted();
        setTimeout(() => {
          isLocalUpdateRef.current = false;
        }, 50);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onStateChange, onOrderCompleted]); // Depend on callbacks

  const broadcastStateUpdate = useCallback((partialState: Partial<DraftOrderState>) => {
    if (!hasSupabaseConfig || !channelRef.current || isLocalUpdateRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'state_update',
      payload: partialState,
    });
  }, []);

  const broadcastOrderCompleted = useCallback(() => {
    if (!hasSupabaseConfig || !channelRef.current || isLocalUpdateRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'order_completed',
    });
  }, []);

  return { broadcastStateUpdate, broadcastOrderCompleted, isLocalUpdateRef };
}

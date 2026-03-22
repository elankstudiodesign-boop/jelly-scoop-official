import { useState, useEffect } from 'react';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { Product, LiveSession, ScoopConfig, Transaction } from '../types';
import { useLocalStorage } from './useLocalStorage';

function upsertById<T extends { id: string }>(items: T[], next: T, sortFn?: (a: T, b: T) => number) {
  const idx = items.findIndex(x => x.id === next.id);
  const out = idx === -1 ? [...items, next] : items.map(x => (x.id === next.id ? next : x));
  return sortFn ? [...out].sort(sortFn) : out;
}

function removeById<T extends { id: string }>(items: T[], id: string) {
  return items.filter(x => x.id !== id);
}

function bindAutoRefresh(refetch: () => Promise<void> | void, intervalMs: number) {
  let running = false;
  const run = () => {
    if (running) return;
    running = true;
    Promise.resolve(refetch()).finally(() => {
      running = false;
    });
  };

  const onFocus = () => run();
  const onVisibility = () => {
    if (document.visibilityState === 'visible') run();
  };

  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);
  const timer = intervalMs > 0 ? window.setInterval(run, intervalMs) : null;

  return () => {
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
    if (timer) window.clearInterval(timer);
  };
}

export function useSupabaseProducts() {
  const [products, setProducts] = useLocalStorage<Product[]>('scoop_products', []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setLoading(false);
      return;
    }
    fetchProducts();

    const channel = supabase
      .channel('realtime:products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload: any) => {
          if (payload.eventType === 'DELETE') {
            const id = payload.old?.id;
            if (typeof id === 'string') setProducts(prev => removeById(prev, id));
            return;
          }
          const row = payload.new;
          if (!row) return;
          const mapped = mapProductFromDB(row);
          setProducts(prev => upsertById(prev, mapped, (a, b) => a.name.localeCompare(b.name)));
        }
      )
      .subscribe();

    const stopAutoRefresh = bindAutoRefresh(fetchProducts, 8000);

    return () => {
      supabase.removeChannel(channel);
      stopAutoRefresh();
    };
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching products:', error);
    } else if (data) {
      setProducts(data.map(mapProductFromDB));
    }
    setLoading(false);
  };

  const addProduct = async (product: Product) => {
    setProducts(prev => [...prev, product]);
    if (!hasSupabaseConfig) return;
    const { error } = await supabase.from('products').insert([mapProductToDB(product)]);
    if (error) {
      console.error('Error adding product:', error);
      fetchProducts();
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    if (!hasSupabaseConfig) return;
    const { error } = await supabase.from('products').update(mapProductToDB(updates)).eq('id', id);
    if (error) {
      console.error('Error updating product:', error);
      fetchProducts();
    }
  };

  const deleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    if (!hasSupabaseConfig) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('Error deleting product:', error);
      fetchProducts();
    }
  };

  return { products, addProduct, updateProduct, deleteProduct, loading };
}

export function useSupabaseSessions() {
  const [sessions, setSessions] = useLocalStorage<LiveSession[]>('scoop_sessions', []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setLoading(false);
      return;
    }
    fetchSessions();

    const channel = supabase
      .channel('realtime:sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        (payload: any) => {
          if (payload.eventType === 'DELETE') {
            const id = payload.old?.id;
            if (typeof id === 'string') setSessions(prev => removeById(prev, id));
            return;
          }
          const row = payload.new;
          if (!row) return;
          const mapped = mapSessionFromDB(row);
          setSessions(prev => upsertById(prev, mapped, (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        }
      )
      .subscribe();

    const stopAutoRefresh = bindAutoRefresh(fetchSessions, 15000);

    return () => {
      supabase.removeChannel(channel);
      stopAutoRefresh();
    };
  }, []);

  const fetchSessions = async () => {
    const { data, error } = await supabase.from('sessions').select('*').order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching sessions:', error);
    } else if (data) {
      setSessions(data.map(mapSessionFromDB));
    }
    setLoading(false);
  };

  const addSession = async (session: LiveSession) => {
    setSessions(prev => [...prev, session].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    if (!hasSupabaseConfig) return;
    const { error } = await supabase.from('sessions').insert([mapSessionToDB(session)]);
    if (error) {
      console.error('Error adding session:', error);
      fetchSessions();
    }
  };

  const deleteSession = async (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (!hasSupabaseConfig) return;
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) {
      console.error('Error deleting session:', error);
      fetchSessions();
    }
  };

  return { sessions, addSession, deleteSession, loading };
}

export function useSupabaseConfigs(defaultConfigs: ScoopConfig[]) {
  const [configs, setConfigs] = useLocalStorage<ScoopConfig[]>('scoop_configs', defaultConfigs);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      if (defaultConfigs.length === 1) {
        const wantedId = defaultConfigs[0]?.id;
        const wantedNameLower = (defaultConfigs[0]?.name || '').toLowerCase();
        setConfigs(prev => {
          const preferred = prev.find(c => c.id === wantedId) || prev.find(c => c.name.toLowerCase() === wantedNameLower) || prev.find(c => c.name.toLowerCase().includes('lớn')) || prev[0];
          return preferred ? [preferred] : defaultConfigs;
        });
      }
      setLoading(false);
      return;
    }
    fetchConfigs();

    const channel = supabase
      .channel('realtime:scoop_configs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scoop_configs' },
        (payload: any) => {
          if (payload.eventType === 'DELETE') {
            const id = payload.old?.id;
            if (typeof id === 'string') {
              setConfigs(prev => {
                const next = removeById(prev, id);
                if (defaultConfigs.length === 1) {
                  const wantedId = defaultConfigs[0]?.id;
                  const preferred = next.find(c => c.id === wantedId) || next.find(c => (c.name || '').toLowerCase().includes('lớn')) || next[0];
                  return preferred ? [preferred] : defaultConfigs;
                }
                return next;
              });
            }
            return;
          }
          const row = payload.new;
          if (!row) return;
          const mapped = mapConfigFromDB(row);
          setConfigs(prev => {
            const next = upsertById(prev, mapped, (a, b) => a.id.localeCompare(b.id));
            if (defaultConfigs.length === 1) {
              const wantedId = defaultConfigs[0]?.id;
              const preferred = next.find(c => c.id === wantedId) || next.find(c => (c.name || '').toLowerCase().includes('lớn')) || next[0];
              return preferred ? [preferred] : defaultConfigs;
            }
            return next;
          });
        }
      )
      .subscribe();

    const stopAutoRefresh = bindAutoRefresh(fetchConfigs, 15000);

    return () => {
      supabase.removeChannel(channel);
      stopAutoRefresh();
    };
  }, []);

  const fetchConfigs = async () => {
    const { data, error } = await supabase.from('scoop_configs').select('*').order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching configs:', error);
    } else if (data && data.length > 0) {
      const mapped = data.map(mapConfigFromDB);
      if (defaultConfigs.length === 1) {
        const wantedId = defaultConfigs[0]?.id;
        const wantedNameLower = (defaultConfigs[0]?.name || '').toLowerCase();
        const preferred = mapped.find(c => c.id === wantedId) || mapped.find(c => c.name.toLowerCase() === wantedNameLower) || mapped.find(c => c.name.toLowerCase().includes('lớn')) || mapped[0];
        const keep = preferred ? [preferred] : [];
        setConfigs(keep.length > 0 ? keep : defaultConfigs);
        const keepId = preferred?.id;
        if (keepId) {
          for (const cfg of mapped) {
            if (cfg.id !== keepId) {
              await supabase.from('scoop_configs').delete().eq('id', cfg.id);
            }
          }
        }
      } else {
        setConfigs(mapped);
      }
    } else {
      // Insert defaults if empty
      for (const config of defaultConfigs) {
        await supabase.from('scoop_configs').insert([mapConfigToDB(config)]);
      }
    }
    setLoading(false);
  };

  const updateConfig = async (id: string, updates: Partial<ScoopConfig>) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    if (!hasSupabaseConfig) return;
    const { error } = await supabase.from('scoop_configs').update(mapConfigToDB(updates)).eq('id', id);
    if (error) {
      console.error('Error updating config:', error);
      fetchConfigs();
    }
  };

  return { configs, updateConfig, loading };
}

// Mappers to handle camelCase to snake_case
function mapProductToDB(p: Partial<Product>) {
  const res: any = { ...p };
  if (p.retailPrice !== undefined) { res.retail_price = p.retailPrice; delete res.retailPrice; }
  if (p.imageUrl !== undefined) { res.image_url = p.imageUrl; delete res.imageUrl; }
  if (p.priceGroup !== undefined) { res.price_group = p.priceGroup; delete res.priceGroup; }
  if (p.warehouseQuantity !== undefined) { res.warehouse_quantity = p.warehouseQuantity; delete res.warehouseQuantity; }
  if (p.note !== undefined) { res.note = p.note; }
  return res;
}

function mapProductFromDB(p: any): Product {
  return {
    id: p.id,
    name: p.name,
    cost: Number(p.cost),
    retailPrice: Number(p.retail_price),
    margin: Number(p.margin),
    imageUrl: p.image_url,
    priceGroup: p.price_group,
    quantity: Number(p.quantity),
    warehouseQuantity: Number(p.warehouse_quantity || 0),
    note: p.note
  };
}

function mapSessionToDB(s: Partial<LiveSession>) {
  const res: any = { ...s };
  if (s.scoopsSold !== undefined) { res.scoops_sold = s.scoopsSold; delete res.scoopsSold; }
  if (s.tiktokFeePercent !== undefined) { res.tiktok_fee_percent = s.tiktokFeePercent; delete res.tiktokFeePercent; }
  if (s.packagingCostPerScoop !== undefined) { res.packaging_cost_per_scoop = s.packagingCostPerScoop; delete res.packagingCostPerScoop; }
  if (s.averageScoopCost !== undefined) { res.average_scoop_cost = s.averageScoopCost; delete res.averageScoopCost; }
  return res;
}

function mapSessionFromDB(s: any): LiveSession {
  return {
    id: s.id,
    date: s.date,
    scoopsSold: Number(s.scoops_sold),
    revenue: Number(s.revenue),
    tiktokFeePercent: Number(s.tiktok_fee_percent),
    packagingCostPerScoop: Number(s.packaging_cost_per_scoop),
    averageScoopCost: Number(s.average_scoop_cost)
  };
}

function mapConfigToDB(c: Partial<ScoopConfig>) {
  const res: any = { ...c };
  if (c.totalItems !== undefined) { res.total_items = c.totalItems; delete res.totalItems; }
  if (c.ratioLow !== undefined) { res.ratio_low = c.ratioLow; delete res.ratioLow; }
  if (c.ratioMedium !== undefined) { res.ratio_medium = c.ratioMedium; delete res.ratioMedium; }
  if (c.ratioHigh !== undefined) { res.ratio_high = c.ratioHigh; delete res.ratioHigh; }
  return res;
}

function mapConfigFromDB(c: any): ScoopConfig {
  return {
    id: c.id,
    name: c.name,
    price: Number(c.price),
    totalItems: Number(c.total_items),
    ratioLow: Number(c.ratio_low),
    ratioMedium: Number(c.ratio_medium),
    ratioHigh: Number(c.ratio_high)
  };
}

export function useSupabaseTransactions() {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('scoop_transactions', []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setLoading(false);
      return;
    }
    fetchTransactions();

    const channel = supabase
      .channel('realtime:transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload: any) => {
          if (payload.eventType === 'DELETE') {
            const id = payload.old?.id;
            if (typeof id === 'string') setTransactions(prev => removeById(prev, id));
            return;
          }
          const row = payload.new;
          if (!row) return;
          const mapped = mapTransactionFromDB(row);
          setTransactions(prev => upsertById(prev, mapped, (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
      )
      .subscribe();

    const stopAutoRefresh = bindAutoRefresh(fetchTransactions, 8000);

    return () => {
      supabase.removeChannel(channel);
      stopAutoRefresh();
    };
  }, []);

  const fetchTransactions = async () => {
    const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching transactions:', error);
    } else if (data) {
      setTransactions(data.map(mapTransactionFromDB));
    }
    setLoading(false);
  };

  const addTransaction = async (transaction: Transaction) => {
    setTransactions(prev => [transaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    if (!hasSupabaseConfig) return;
    const { error } = await supabase.from('transactions').insert([mapTransactionToDB(transaction)]);
    if (error) {
      console.error('Error adding transaction:', error);
      fetchTransactions();
    }
  };

  const deleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    if (!hasSupabaseConfig) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      console.error('Error deleting transaction:', error);
      fetchTransactions();
    }
  };

  return { transactions, addTransaction, deleteTransaction, loading };
}

function mapTransactionToDB(t: Partial<Transaction>) {
  const res: any = { ...t };
  if (t.items && t.items.length > 0) {
    res.description = `${t.description || ''}|||__ITEMS__|||${JSON.stringify(t.items)}`;
  }
  delete res.items;
  return res;
}

function mapTransactionFromDB(t: any): Transaction {
  let description = t.description || '';
  let items: { productId: string; quantity: number }[] | undefined = undefined;

  if (description.includes('|||__ITEMS__|||')) {
    const parts = description.split('|||__ITEMS__|||');
    description = parts[0];
    try {
      items = JSON.parse(parts[1]);
    } catch (e) {
      // ignore
    }
  } else if (description.includes('|||')) {
    const parts = description.split('|||');
    description = parts[0];
    try {
      items = JSON.parse(parts[1]);
    } catch (e) {
      // ignore
    }
  }

  return {
    id: t.id,
    type: t.type,
    category: t.category,
    amount: Number(t.amount),
    description,
    date: t.date,
    items
  };
}

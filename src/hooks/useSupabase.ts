import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { Product, LiveSession, ScoopConfig, Transaction, Supplier, PackagingItem } from '../types';
import { addToOfflineQueue } from '../lib/syncQueue';

const EMPTY_ARRAY: any[] = [];

function upsertById<T extends { id: string }>(items: T[], next: T, sortFn?: (a: T, b: T) => number) {
  const idx = items.findIndex(x => x.id === next.id);
  const out = idx === -1 ? [...items, next] : items.map(x => (x.id === next.id ? next : x));
  return sortFn ? [...out].sort(sortFn) : out;
}

function removeById<T extends { id: string }>(items: T[], id: string) {
  return items.filter(x => x.id !== id);
}

function createSupabaseHook<T extends { id: string }>(
  tableName: string,
  queryKey: string,
  mapFromDB: (row: any) => T,
  mapToDB: (item: Partial<T>, existing?: T) => any,
  sortFn?: (a: T, b: T) => number,
  fetchQuery?: (query: any) => any
) {
  return function useHook() {
    const queryClient = useQueryClient();

    const { data = EMPTY_ARRAY, isLoading: loading } = useQuery({
      queryKey: [queryKey],
      queryFn: async () => {
        if (!hasSupabaseConfig) return EMPTY_ARRAY;
        let query = supabase.from(tableName).select('*');
        if (fetchQuery) {
          query = fetchQuery(query);
        }
        const { data, error } = await query;
        if (error) throw error;
        const mapped = data.map(mapFromDB);
        return sortFn ? mapped.sort(sortFn) : mapped;
      }
    });

    useEffect(() => {
      localStorage.setItem(`scoop_${queryKey}`, JSON.stringify(data));
    }, [data]);

    useEffect(() => {
      if (!hasSupabaseConfig) return;
      const channel = supabase
        .channel(`realtime:${tableName}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: tableName },
          () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }, [queryClient]);

    const addMutation = useMutation({
      mutationFn: async ({ item, localOnly }: { item: T, localOnly?: boolean }) => {
        if (localOnly || !hasSupabaseConfig) return;
        const { error } = await supabase.from(tableName).upsert([mapToDB(item)]);
        if (error) throw error;
      },
      onMutate: async ({ item }) => {
        await queryClient.cancelQueries({ queryKey: [queryKey] });
        const previous = queryClient.getQueryData<T[]>([queryKey]);
        queryClient.setQueryData<T[]>([queryKey], old => upsertById(old || [], item, sortFn));
        return { previous };
      },
      onError: (err, { item }, context) => {
        if (!navigator.onLine) {
          addToOfflineQueue({ type: 'INSERT', table: tableName, payload: mapToDB(item) });
        } else {
          queryClient.setQueryData([queryKey], context?.previous);
          console.error(`Error adding ${tableName}:`, err);
          toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
        }
      },
      onSettled: () => {
        if (navigator.onLine) queryClient.invalidateQueries({ queryKey: [queryKey] });
      }
    });

    const updateMutation = useMutation({
      mutationFn: async ({ id, updates, localOnly }: { id: string, updates: Partial<T>, localOnly?: boolean }) => {
        if (localOnly || !hasSupabaseConfig) return;
        const existing = data.find(p => p.id === id);
        const { error } = await supabase.from(tableName).update(mapToDB(updates, existing)).eq('id', id);
        if (error) throw error;
      },
      onMutate: async ({ id, updates }) => {
        await queryClient.cancelQueries({ queryKey: [queryKey] });
        const previous = queryClient.getQueryData<T[]>([queryKey]);
        queryClient.setQueryData<T[]>([queryKey], old => {
          const ex = old?.find(p => p.id === id);
          if (!ex) return old || [];
          return upsertById(old || [], { ...ex, ...updates }, sortFn);
        });
        return { previous };
      },
      onError: (err, { id, updates }, context) => {
        if (!navigator.onLine) {
          const existing = context?.previous?.find(p => p.id === id);
          addToOfflineQueue({ type: 'UPDATE', table: tableName, id, payload: mapToDB(updates, existing) });
        } else {
          queryClient.setQueryData([queryKey], context?.previous);
          console.error(`Error updating ${tableName}:`, err);
          toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
        }
      },
      onSettled: () => {
        if (navigator.onLine) queryClient.invalidateQueries({ queryKey: [queryKey] });
      }
    });

    const deleteMutation = useMutation({
      mutationFn: async (id: string) => {
        if (!hasSupabaseConfig) return;
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        if (error) throw error;
      },
      onMutate: async (id) => {
        await queryClient.cancelQueries({ queryKey: [queryKey] });
        const previous = queryClient.getQueryData<T[]>([queryKey]);
        queryClient.setQueryData<T[]>([queryKey], old => removeById(old || [], id));
        return { previous };
      },
      onError: (err, id, context) => {
        if (!navigator.onLine) {
          addToOfflineQueue({ type: 'DELETE', table: tableName, id });
        } else {
          queryClient.setQueryData([queryKey], context?.previous);
          console.error(`Error deleting ${tableName}:`, err);
          toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
        }
      },
      onSettled: () => {
        if (navigator.onLine) queryClient.invalidateQueries({ queryKey: [queryKey] });
      }
    });

    return {
      data,
      loading,
      add: async (item: T, localOnly = false) => addMutation.mutateAsync({ item, localOnly }),
      update: async (id: string, updates: Partial<T>, localOnly = false) => updateMutation.mutateAsync({ id, updates, localOnly }),
      delete: async (id: string) => deleteMutation.mutateAsync(id)
    };
  };
}

// Mappers
export function mapProductToDB(p: Partial<Product>, existing?: Product) {
  const res: any = { ...p };
  if (p.retailPrice !== undefined) { res.retail_price = p.retailPrice; delete res.retailPrice; }
  if (p.imageUrl !== undefined) { res.image_url = p.imageUrl; delete res.imageUrl; }
  if (p.priceGroup !== undefined) { res.price_group = p.priceGroup; delete res.priceGroup; }
  if (p.warehouseQuantity !== undefined) { res.warehouse_quantity = p.warehouseQuantity; delete res.warehouseQuantity; }
  if (p.barcode !== undefined) { res.barcode = p.barcode; }
  
  // Strip old combo marker from note if present
  if (p.note !== undefined) {
    res.note = p.note.split('|||__COMBO__|||')[0].trim();
  } else if (existing?.note) {
    res.note = existing.note.split('|||__COMBO__|||')[0].trim();
  }
  
  // Use explicit values if provided, otherwise fallback to existing
  if (p.isCombo !== undefined) {
    res.is_combo = p.isCombo;
    delete res.isCombo;
  }
  if (p.comboItems !== undefined) {
    res.combo_items = p.comboItems;
    delete res.comboItems;
  }
  
  if ('supplierId' in p) { res.supplier_id = p.supplierId; delete res.supplierId; }
  return res;
}

export function mapProductFromDB(p: any): Product {
  let note = p.note || '';
  let isCombo = p.is_combo || false;
  let comboItems: any[] | undefined = p.combo_items || undefined;

  // Fallback for old data format stored in note
  if (!isCombo && note.includes('|||__COMBO__|||')) {
    const parts = note.split('|||__COMBO__|||');
    note = parts[0].trim();
    isCombo = true;
    try {
      comboItems = JSON.parse(parts[1]);
    } catch (e) {
      // ignore
    }
  }

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
    note,
    supplierId: p.supplier_id,
    isCombo,
    comboItems,
    barcode: p.barcode
  };
}

export function mapSessionToDB(s: Partial<LiveSession>) {
  const res: any = { ...s };
  if (s.scoopsSold !== undefined) { res.scoops_sold = s.scoopsSold; delete res.scoopsSold; }
  if (s.tiktokFeePercent !== undefined) { res.tiktok_fee_percent = s.tiktokFeePercent; delete res.tiktokFeePercent; }
  if (s.packagingCostPerScoop !== undefined) { res.packaging_cost_per_scoop = s.packagingCostPerScoop; delete res.packagingCostPerScoop; }
  if (s.averageScoopCost !== undefined) { res.average_scoop_cost = s.averageScoopCost; delete s.averageScoopCost; }
  return res;
}

export function mapSessionFromDB(s: any): LiveSession {
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

export function mapConfigToDB(c: Partial<ScoopConfig>) {
  const res: any = { ...c };
  if (c.totalItems !== undefined) { res.total_items = c.totalItems; delete res.totalItems; }
  if (c.ratioLow !== undefined) { res.ratio_low = c.ratioLow; delete res.ratioLow; }
  if (c.ratioMedium !== undefined) { res.ratio_medium = c.ratioMedium; delete res.ratioMedium; }
  if (c.ratioHigh !== undefined) { res.ratio_high = c.ratioHigh; delete res.ratioHigh; }
  return res;
}

export function mapConfigFromDB(c: any): ScoopConfig {
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

export function mapSupplierToDB(s: Partial<Supplier>) {
  const res: any = { ...s };
  if (s.createdAt !== undefined) { res.created_at = s.createdAt; delete res.createdAt; }
  return res;
}

export function mapSupplierFromDB(s: any): Supplier {
  return {
    id: s.id,
    name: s.name,
    phone: s.phone || '',
    address: s.address || '',
    note: s.note,
    createdAt: s.created_at
  };
}

export function mapPackagingItemToDB(p: Partial<PackagingItem>) {
  const res: any = { ...p };
  if (p.createdAt !== undefined) { res.created_at = p.createdAt; delete res.createdAt; }
  return res;
}

export function mapPackagingItemFromDB(p: any): PackagingItem {
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price),
    quantity: Number(p.quantity),
    barcode: p.barcode,
    createdAt: p.created_at
  };
}

export function mapTransactionToDB(t: Partial<Transaction>) {
  const res: any = { ...t };
  if (t.items !== undefined) {
    res.items = t.items;
  }
  
  // Strip old items marker from description if present
  if (t.description !== undefined) {
    res.description = t.description.split('|||__ITEMS__|||')[0].split('|||__METADATA__|||')[0].trim();
    if (t.metadata) {
      res.description = `${res.description} |||__METADATA__||| ${JSON.stringify(t.metadata)}`;
    }
  }
  
  if (t.customerName !== undefined) { res.customer_name = t.customerName; delete res.customerName; }
  if (t.customerPhone !== undefined) { res.customer_phone = t.customerPhone; delete res.customerPhone; }
  if (t.customerAddress !== undefined) { res.customer_address = t.customerAddress; delete res.customerAddress; }
  if ('supplierId' in t) { res.supplier_id = t.supplierId; delete res.supplierId; }
  
  return res;
}

export function mapTransactionFromDB(t: any): Transaction {
  let description = t.description || '';
  let items: { productId: string; quantity: number, retailPrice?: number }[] | undefined = t.items || undefined;
  let metadata: any = undefined;

  // Extract metadata if present
  if (description.includes('|||__METADATA__|||')) {
    const parts = description.split('|||__METADATA__|||');
    description = parts[0].trim();
    try {
      metadata = JSON.parse(parts[1]);
    } catch (e) {
      console.error('Failed to parse metadata from description', e);
    }
  }

  // Fallback for old data format stored in description
  if ((!items || items.length === 0) && description.includes('|||__ITEMS__|||')) {
    const parts = description.split('|||__ITEMS__|||');
    description = parts[0].trim();
    try {
      items = JSON.parse(parts[1]);
    } catch (e) {
      // ignore
    }
  } else if ((!items || items.length === 0) && description.includes('|||')) {
    const parts = description.split('|||');
    description = parts[0].trim();
    try {
      items = JSON.parse(parts[1]);
    } catch (e) {
      // ignore
    }
  }

  return {
    id: t.id,
    date: t.date,
    type: t.type,
    amount: Number(t.amount),
    description,
    category: t.category,
    items,
    customerName: t.customer_name,
    customerPhone: t.customer_phone,
    customerAddress: t.customer_address,
    supplierId: t.supplier_id,
    metadata
  };
}

const useProductsBase = createSupabaseHook<Product>(
  'products',
  'products',
  mapProductFromDB,
  mapProductToDB,
  (a, b) => a.name.localeCompare(b.name),
  (query) => query.order('name', { ascending: true })
);

export function useSupabaseProducts() {
  const { data: products, loading, add, update, delete: del } = useProductsBase();
  return { products, loading, addProduct: add, updateProduct: update, deleteProduct: del };
}

const useSuppliersBase = createSupabaseHook<Supplier>(
  'suppliers',
  'suppliers',
  mapSupplierFromDB,
  mapSupplierToDB,
  (a, b) => a.name.localeCompare(b.name),
  (query) => query.order('name', { ascending: true })
);

export function useSupabaseSuppliers() {
  const { data: suppliers, loading, add, update, delete: del } = useSuppliersBase();
  return { suppliers, loading, addSupplier: add, updateSupplier: update, deleteSupplier: del };
}

const useSessionsBase = createSupabaseHook<LiveSession>(
  'sessions',
  'sessions',
  mapSessionFromDB,
  mapSessionToDB,
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  (query) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return query.gte('date', thirtyDaysAgo.toISOString()).order('date', { ascending: false });
  }
);

export function useSupabaseSessions() {
  const { data: sessions, loading, add, update, delete: del } = useSessionsBase();
  return { sessions, loading, addSession: add, updateSession: update, deleteSession: del };
}

export function useSupabaseConfigs(defaultConfigs: ScoopConfig[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!hasSupabaseConfig) return;

    const channel = supabase
      .channel('realtime:scoop_configs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scoop_configs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['scoop_configs'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: configs, isLoading } = useQuery({
    queryKey: ['scoop_configs'],
    queryFn: async () => {
      if (!hasSupabaseConfig) return defaultConfigs;

      const { data, error } = await supabase.from('scoop_configs').select('*').order('created_at', { ascending: true });
      if (error) throw error;

      if (data && data.length > 0) {
        const mapped = data.map(mapConfigFromDB);
        if (defaultConfigs.length === 1) {
          const wantedId = defaultConfigs[0]?.id;
          const wantedNameLower = (defaultConfigs[0]?.name || '').toLowerCase();
          const preferred = mapped.find(c => c.id === wantedId) || mapped.find(c => c.name.toLowerCase() === wantedNameLower) || mapped.find(c => c.name.toLowerCase().includes('lớn')) || mapped[0];
          
          if (preferred) {
            // Cleanup other configs if needed
            for (const cfg of mapped) {
              if (cfg.id !== preferred.id) {
                supabase.from('scoop_configs').delete().eq('id', cfg.id).then();
              }
            }
            return [preferred];
          }
          return defaultConfigs;
        }
        return mapped;
      } else {
        // Insert defaults if empty
        for (const config of defaultConfigs) {
          await supabase.from('scoop_configs').insert([mapConfigToDB(config)]);
        }
        return defaultConfigs;
      }
    },
    initialData: defaultConfigs,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<ScoopConfig> }) => {
      if (!hasSupabaseConfig) return;
      const { error } = await supabase.from('scoop_configs').update(mapConfigToDB(updates)).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['scoop_configs'] });
      const previous = queryClient.getQueryData<ScoopConfig[]>(['scoop_configs']);
      if (previous) {
        queryClient.setQueryData<ScoopConfig[]>(['scoop_configs'], prev => 
          (prev || []).map(c => c.id === id ? { ...c, ...updates } : c)
        );
      }
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['scoop_configs'], context.previous);
      }
      console.error('Error updating config:', err);
    },
    onSettled: () => {
      if (navigator.onLine) queryClient.invalidateQueries({ queryKey: ['scoop_configs'] });
    }
  });

  const updateConfig = async (id: string, updates: Partial<ScoopConfig>) => {
    return updateMutation.mutateAsync({ id, updates });
  };

  return { configs: configs || defaultConfigs, updateConfig, loading: isLoading };
}



const useTransactionsBase = createSupabaseHook<Transaction>(
  'transactions',
  'transactions',
  mapTransactionFromDB,
  mapTransactionToDB,
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  (query) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return query.gte('date', thirtyDaysAgo.toISOString()).order('date', { ascending: false }).limit(2000);
  }
);

export function useSupabaseTransactions() {
  const { data: transactions, loading, add, update, delete: del } = useTransactionsBase();
  return { transactions, loading, addTransaction: add, updateTransaction: update, deleteTransaction: del };
}

export async function executeOrderTransaction(payload: any) {
  if (!hasSupabaseConfig) throw new Error('No Supabase config');
  const { data, error } = await supabase.rpc('complete_order', payload);
  if (error) throw error;
  return data;
}

const usePackagingItemsBase = createSupabaseHook<PackagingItem>(
  'packaging_items',
  'packaging_items',
  mapPackagingItemFromDB,
  mapPackagingItemToDB,
  (a, b) => a.name.localeCompare(b.name),
  (query) => query.order('name', { ascending: true })
);

export function useSupabasePackagingItems() {
  const { data: packagingItems, loading, add, update, delete: del } = usePackagingItemsBase();
  return { packagingItems, loading, addPackagingItem: add, updatePackagingItem: update, deletePackagingItem: del };
}

export interface DailyFinancialSummary {
  summary_date: string;
  total_revenue: number;
  total_expense: number;
  net_profit: number;
  transaction_count: number;
}

export interface MonthlyFinancialSummary {
  summary_month: string;
  total_revenue: number;
  total_expense: number;
  net_profit: number;
  transaction_count: number;
}

export function useSupabaseFinancialSummaries() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!hasSupabaseConfig) return;

    const channel = supabase
      .channel('realtime:financial_summaries')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['financial_summaries'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['financial_summaries'],
    queryFn: async () => {
      if (!hasSupabaseConfig) return { daily: EMPTY_ARRAY, monthly: EMPTY_ARRAY };
      const [dailyRes, monthlyRes] = await Promise.all([
        supabase.from('daily_financial_summary').select('*').order('summary_date', { ascending: false }).limit(30),
        supabase.from('monthly_financial_summary').select('*').order('summary_month', { ascending: false })
      ]);

      if (dailyRes.error) throw dailyRes.error;
      if (monthlyRes.error) throw monthlyRes.error;

      return {
        daily: dailyRes.data as DailyFinancialSummary[],
        monthly: monthlyRes.data as MonthlyFinancialSummary[]
      };
    }
  });

  return { 
    dailySummaries: data?.daily || EMPTY_ARRAY, 
    monthlySummaries: data?.monthly || EMPTY_ARRAY, 
    loading: isLoading, 
    refetch 
  };
}

export function usePaginatedTransactions(page: number, limit: number, searchTerm: string, typeFilter: 'ALL' | 'IN' | 'OUT') {
  const queryClient = useQueryClient();
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    const channel = supabase
      .channel('realtime:paginated_transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['paginated_transactions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['paginated_transactions', page, limit, debouncedSearch, typeFilter],
    queryFn: async () => {
      if (!hasSupabaseConfig) return { data: EMPTY_ARRAY, count: 0 };
      
      let query = supabase.from('transactions').select('*', { count: 'exact' });
      
      if (typeFilter !== 'ALL') {
        query = query.eq('type', typeFilter);
      }
      if (debouncedSearch) {
        query = query.ilike('description', `%${debouncedSearch}%`);
      }
      
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      const { data: resData, count, error } = await query.order('date', { ascending: false }).range(from, to);
      
      if (error) throw error;
      
      return {
        data: resData && resData.length > 0 ? resData.map(mapTransactionFromDB) : EMPTY_ARRAY,
        count: count || 0
      };
    }
  });

  return { 
    data: data?.data || EMPTY_ARRAY, 
    totalCount: data?.count || 0, 
    loading: isLoading, 
    refetch 
  };
}


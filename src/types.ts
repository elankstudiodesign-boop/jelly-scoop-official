export type PriceGroup = 'Thấp' | 'Trung' | 'Cao' | 'Cao cấp';

export interface ComboItem {
  type: 'product' | 'packaging';
  id: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  cost: number;
  retailPrice?: number;
  margin?: number;
  imageUrl: string;
  priceGroup: PriceGroup;
  quantity?: number;
  warehouseQuantity?: number;
  note?: string;
  category?: string;
  supplierId?: string | null;
  isCombo?: boolean;
  comboItems?: ComboItem[];
  barcode?: string;
}

export interface OrderItem {
  product: Product;
  quantity: number;
  retailPrice?: number;
}

export interface LiveSession {
  id: string;
  date: string;
  scoopsSold: number;
  revenue: number;
  tiktokFeePercent: number;
  packagingCostPerScoop: number;
  averageScoopCost: number;
}

export interface ScoopConfig {
  id: string;
  name: string;
  price: number;
  totalItems: number;
  ratioLow: number;
  ratioMedium: number;
  ratioHigh: number;
}

export interface Transaction {
  id: string;
  type: 'IN' | 'OUT';
  category: 'ORDER' | 'IMPORT' | 'FEE' | 'PACKAGING' | 'MARKETING' | 'SHIPPING' | 'PLATFORM_FEE' | 'TOOL' | 'REFUND' | 'OTHER';
  amount: number;
  description: string;
  date: string;
  items?: { productId: string; quantity: number; retailPrice?: number }[];
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  supplierId?: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  note?: string;
  createdAt: string;
  productsCount?: number;
}

export interface PackagingItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  barcode: string;
  createdAt: string;
}

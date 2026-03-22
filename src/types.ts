export type PriceGroup = 'Thấp' | 'Trung' | 'Cao' | 'Cao cấp';

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
}

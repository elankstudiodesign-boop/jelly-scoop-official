export type PriceGroup = 'Thấp' | 'Trung' | 'Cao';

export interface Product {
  id: string;
  name: string;
  cost: number;
  retailPrice?: number;
  margin?: number;
  imageUrl: string;
  priceGroup: PriceGroup;
  quantity?: number;
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

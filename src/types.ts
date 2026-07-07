export interface AppSettings {
  trendyolSellerId: string;
  trendyolApiKey: string;
  trendyolApiSecret: string;
  geminiApiKey: string;
  defaultCommissionRate: number; // Varsayılan Komisyon Oranı (%)
  
  // Barem 1 (örn: 0 - 250 TL arası)
  barem1Limit: number; 
  barem1Price: number; 
  
  // Barem 2 (örn: 250 TL - 400 TL arası)
  barem2Limit: number; 
  barem2Price: number; 
  
  cargoBaremUstuPrice: number; // Barem Üstü Kargo (örn: 400 TL üstü)
}

export interface Order {
  id: string; // Order Number
  productName: string;
  salePrice: number;
  commission: number;
  shippingCost: number;
  supplyCost: number; // Tedarik Maliyeti (manuel)
  date: number;
  status: string;
  isExact?: boolean;
}

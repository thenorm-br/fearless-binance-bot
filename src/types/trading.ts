// Trading Bot Types
export interface TradingPair {
  symbol: string;
  price: number;
  priceChangePercent: string;
  lastBuyPrice?: number;
  quantity?: number;
  isMonitoring: boolean;
  status: 'idle' | 'buying' | 'selling' | 'monitoring';
}

export interface GridConfig {
  triggerPercentage: number;
  stopPricePercentage: number;
  limitPricePercentage: number;
  maxPurchaseAmount?: number;
  sellQuantityPercentage?: number;
}

export interface TradingConfig {
  symbol: string;
  enabled: boolean;
  buyGrids: GridConfig[];
  sellGrids: GridConfig[];
  stopLossPercentage?: number;
  maxBuyAmount: number;
  minProfitPercentage: number;
}

export interface OpenOrder {
  symbol: string;
  orderId: string;
  type: 'BUY' | 'SELL';
  side: 'BUY' | 'SELL';
  amount: number;
  price: number;
  status: string;
  timestamp: number;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  amount: number;
  price: number;
  fee: number;
  profit?: number;
  timestamp: number;
}

export interface AccountBalance {
  asset: string;
  free: string;
  locked: string;
  total: number;
  usdValue: number;
}

export interface BotStats {
  totalProfit: number;
  totalTrades: number;
  winRate: number;
  isRunning: boolean;
  startTime: number;
  monitoredPairs: number;
}

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}
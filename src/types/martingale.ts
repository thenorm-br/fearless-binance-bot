// Martingale Trading Types
export interface MartingaleConfig {
  symbol: string;
  initialStake: number;
  galeFactor: number;
  maxAttempts: number;
  minProbability: number;
  victoryCooldown: number;
  defeatCooldown: number;
  contractDuration: number;
  maxDailyLoss: number;
  capitalTotal: number;
  maxRiskPerCycle: number;
}

export interface TechnicalIndicators {
  rsi: number;
  ma5: number;
  ma10: number;
  volatility: number;
  priceChange: number;
}

export interface TradingSignal {
  type: 'BUY' | 'SELL';
  strength: number;
  timestamp: number;
  indicators: TechnicalIndicators;
}

export interface MartingaleContract {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  stake: number;
  quantity: number;
  timestamp: number;
  expiresAt: number;
  status: 'PENDING' | 'WIN' | 'LOSS' | 'CANCELLED';
  finalPrice?: number;
  profit?: number;
  attempt: number;
}

export interface MartingaleCycle {
  id: string;
  symbol: string;
  startTime: number;
  endTime?: number;
  totalStake: number;
  finalProfit: number;
  attempts: number;
  status: 'ACTIVE' | 'WIN' | 'LOSS';
  contracts: MartingaleContract[];
}

export interface MartingaleStats {
  totalCycles: number;
  winCycles: number;
  lossCycles: number;
  totalProfit: number;
  dailyProfit: number;
  currentStreak: number;
  maxWinStreak: number;
  maxLossStreak: number;
  currentAttempt: number;
  currentCycleStake: number;
  isInCooldown: boolean;
  cooldownUntil?: number;
  isRunning: boolean;
  startBalance: number;
  dailyLossLimit: number;
}

export interface PriceHistory {
  symbol: string;
  prices: number[];
  volumes: number[];
  timestamps: number[];
  maxHistory: number;
}

export interface MartingaleBotState {
  config: MartingaleConfig;
  stats: MartingaleStats;
  currentContract?: MartingaleContract;
  currentCycle?: MartingaleCycle;
  priceHistory: PriceHistory;
  lastSignal?: TradingSignal;
  emergencyStop: boolean;
}
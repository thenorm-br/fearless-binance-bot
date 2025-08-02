import { binanceApi } from './binanceApi';
import { TradingConfig, TradingPair, PriceData, BotStats } from '@/types/trading';

class TradingBotService {
  private isRunning = false;
  private monitoredPairs: TradingPair[] = [];
  private tradingConfigs: TradingConfig[] = [];
  private stats: BotStats = {
    totalProfit: 0,
    totalTrades: 0,
    winRate: 0,
    isRunning: false,
    startTime: 0,
    monitoredPairs: 0
  };
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs() {
    this.tradingConfigs = [
      {
        symbol: 'BTCUSDT',
        enabled: true,
        buyGrids: [
          { triggerPercentage: 1, stopPricePercentage: 1.05, limitPricePercentage: 1.051, maxPurchaseAmount: 50 },
          { triggerPercentage: 0.8, stopPricePercentage: 1.03, limitPricePercentage: 1.031, maxPurchaseAmount: 100 }
        ],
        sellGrids: [
          { triggerPercentage: 1.05, stopPricePercentage: 0.97, limitPricePercentage: 0.969, sellQuantityPercentage: 0.5, maxPurchaseAmount: 0 },
          { triggerPercentage: 1.08, stopPricePercentage: 0.95, limitPricePercentage: 0.949, sellQuantityPercentage: 1, maxPurchaseAmount: 0 }
        ],
        maxBuyAmount: 500,
        minProfitPercentage: 1.5,
        stopLossPercentage: 5
      },
      {
        symbol: 'ETHUSDT',
        enabled: true,
        buyGrids: [
          { triggerPercentage: 1, stopPricePercentage: 1.04, limitPricePercentage: 1.041, maxPurchaseAmount: 40 },
          { triggerPercentage: 0.85, stopPricePercentage: 1.02, limitPricePercentage: 1.021, maxPurchaseAmount: 80 }
        ],
        sellGrids: [
          { triggerPercentage: 1.04, stopPricePercentage: 0.98, limitPricePercentage: 0.979, sellQuantityPercentage: 0.5, maxPurchaseAmount: 0 },
          { triggerPercentage: 1.07, stopPricePercentage: 0.96, limitPricePercentage: 0.959, sellQuantityPercentage: 1, maxPurchaseAmount: 0 }
        ],
        maxBuyAmount: 400,
        minProfitPercentage: 1.2,
        stopLossPercentage: 4
      }
    ];
  }

  async startBot(): Promise<void> {
    if (this.isRunning) {
      console.log('Bot is already running');
      return;
    }

    console.log('Starting trading bot...');
    this.isRunning = true;
    this.stats.isRunning = true;
    this.stats.startTime = Date.now();

    // Initialize monitored pairs
    await this.initializeMonitoredPairs();

    // Start monitoring loop
    this.monitoringInterval = setInterval(async () => {
      await this.monitorMarkets();
    }, 2000); // Monitor every 2 seconds

    console.log('Trading bot started successfully');
  }

  async stopBot(): Promise<void> {
    if (!this.isRunning) {
      console.log('Bot is not running');
      return;
    }

    console.log('Stopping trading bot...');
    this.isRunning = false;
    this.stats.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Trading bot stopped');
  }

  private async initializeMonitoredPairs(): Promise<void> {
    try {
      const symbols = this.tradingConfigs.filter(c => c.enabled).map(c => c.symbol);
      const priceData = binanceApi.getMockPrices(); // Use mock data for development
      
      this.monitoredPairs = priceData.map(data => ({
        symbol: data.symbol,
        price: data.price,
        priceChangePercent: data.change24h.toFixed(2),
        isMonitoring: true,
        status: 'monitoring' as const
      }));

      this.stats.monitoredPairs = this.monitoredPairs.length;
      console.log(`Initialized ${this.monitoredPairs.length} trading pairs`);
    } catch (error) {
      console.error('Error initializing monitored pairs:', error);
    }
  }

  private async monitorMarkets(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Update prices
      const priceData = binanceApi.getMockPrices(); // Use mock data for development
      
      for (const data of priceData) {
        const pair = this.monitoredPairs.find(p => p.symbol === data.symbol);
        if (pair) {
          pair.price = data.price;
          pair.priceChangePercent = data.change24h.toFixed(2);
          
          // Check trading signals
          await this.checkTradingSignals(pair, data);
        }
      }
    } catch (error) {
      console.error('Error monitoring markets:', error);
    }
  }

  private async checkTradingSignals(pair: TradingPair, priceData: PriceData): Promise<void> {
    const config = this.tradingConfigs.find(c => c.symbol === pair.symbol);
    if (!config || !config.enabled) return;

    // Check buy signals
    if (!pair.lastBuyPrice) {
      await this.checkBuySignals(pair, config, priceData);
    }

    // Check sell signals
    if (pair.lastBuyPrice && pair.quantity && pair.quantity > 0) {
      await this.checkSellSignals(pair, config, priceData);
    }
  }

  private async checkBuySignals(pair: TradingPair, config: TradingConfig, priceData: PriceData): Promise<void> {
    // Simulate grid trading buy logic
    for (const grid of config.buyGrids) {
      const triggerPrice = priceData.low24h * grid.triggerPercentage;
      
      if (priceData.price <= triggerPrice && pair.status === 'monitoring') {
        console.log(`Buy signal detected for ${pair.symbol} at ${priceData.price}`);
        
        // Simulate buy order
        pair.status = 'buying';
        pair.lastBuyPrice = priceData.price;
        pair.quantity = (grid.maxPurchaseAmount || 50) / priceData.price;
        
        // Update stats
        this.stats.totalTrades++;
        
        setTimeout(() => {
          pair.status = 'monitoring';
          console.log(`Buy order executed for ${pair.symbol}`);
        }, 1000);
        
        break;
      }
    }
  }

  private async checkSellSignals(pair: TradingPair, config: TradingConfig, priceData: PriceData): Promise<void> {
    if (!pair.lastBuyPrice) return;

    // Check for profit signals
    for (const grid of config.sellGrids) {
      const triggerPrice = pair.lastBuyPrice * grid.triggerPercentage;
      
      if (priceData.price >= triggerPrice && pair.status === 'monitoring') {
        console.log(`Sell signal detected for ${pair.symbol} at ${priceData.price}`);
        
        const profit = (priceData.price - pair.lastBuyPrice) * (pair.quantity || 0);
        
        // Simulate sell order
        pair.status = 'selling';
        
        setTimeout(() => {
          pair.status = 'monitoring';
          pair.lastBuyPrice = undefined;
          pair.quantity = undefined;
          
          // Update stats
          this.stats.totalProfit += profit;
          this.stats.totalTrades++;
          
          console.log(`Sell order executed for ${pair.symbol}, profit: $${profit.toFixed(2)}`);
        }, 1000);
        
        break;
      }
    }
  }

  getMonitoredPairs(): TradingPair[] {
    return this.monitoredPairs;
  }

  getBotStats(): BotStats {
    // Calculate win rate
    if (this.stats.totalTrades > 0) {
      this.stats.winRate = this.stats.totalProfit > 0 ? 75 : 0; // Simulated win rate
    }
    return this.stats;
  }

  getTradingConfigs(): TradingConfig[] {
    return this.tradingConfigs;
  }

  updateTradingConfig(symbol: string, config: Partial<TradingConfig>): void {
    const index = this.tradingConfigs.findIndex(c => c.symbol === symbol);
    if (index !== -1) {
      this.tradingConfigs[index] = { ...this.tradingConfigs[index], ...config };
    }
  }

  addTradingConfig(config: TradingConfig): void {
    const existingIndex = this.tradingConfigs.findIndex(c => c.symbol === config.symbol);
    if (existingIndex !== -1) {
      this.tradingConfigs[existingIndex] = config;
    } else {
      this.tradingConfigs.push(config);
    }
  }
}

export const tradingBot = new TradingBotService();
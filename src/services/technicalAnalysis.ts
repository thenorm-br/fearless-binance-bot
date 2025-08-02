import { TechnicalIndicators, TradingSignal, PriceHistory } from '@/types/martingale';

export class TechnicalAnalysisService {
  private lastSignalTime: number = 0;
  private signalCooldown: number = 10000; // 10 seconds

  calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) {
      return 50.0;
    }

    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains.push(change);
        losses.push(0);
      } else {
        gains.push(0);
        losses.push(Math.abs(change));
      }
    }

    if (gains.length < period) {
      return 50.0;
    }

    const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;

    if (avgLoss === 0) {
      return 100;
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    return rsi;
  }

  calculateMovingAverages(prices: number[]): { ma5: number; ma10: number } {
    if (prices.length < 10) {
      return { ma5: 0, ma10: 0 };
    }

    const ma5 = prices.slice(-5).reduce((sum, price) => sum + price, 0) / 5;
    const ma10 = prices.slice(-10).reduce((sum, price) => sum + price, 0) / 10;

    return { ma5, ma10 };
  }

  calculateVolatility(prices: number[]): number {
    if (prices.length < 10) {
      return 0;
    }

    const recent = prices.slice(-10);
    const max = Math.max(...recent);
    const min = Math.min(...recent);
    
    return (max - min) / min * 100;
  }

  calculatePriceChange(prices: number[], periods: number = 5): number {
    if (prices.length < periods + 1) {
      return 0;
    }

    const current = prices[prices.length - 1];
    const previous = prices[prices.length - 1 - periods];
    
    return (current - previous) / previous * 100;
  }

  getTechnicalIndicators(priceHistory: PriceHistory): TechnicalIndicators {
    const { prices } = priceHistory;
    
    const rsi = this.calculateRSI(prices);
    const { ma5, ma10 } = this.calculateMovingAverages(prices);
    const volatility = this.calculateVolatility(prices);
    const priceChange = this.calculatePriceChange(prices);

    return {
      rsi,
      ma5,
      ma10,
      volatility,
      priceChange
    };
  }

  generateTradingSignal(priceHistory: PriceHistory): TradingSignal {
    const now = Date.now();
    
    // Check signal cooldown
    if (now - this.lastSignalTime < this.signalCooldown) {
      return {
        type: 'BUY',
        strength: 30,
        timestamp: now,
        indicators: this.getTechnicalIndicators(priceHistory)
      };
    }

    const indicators = this.getTechnicalIndicators(priceHistory);
    const { rsi, ma5, ma10, volatility, priceChange } = indicators;
    
    let signalStrength = 50;
    let signalType: 'BUY' | 'SELL' = 'BUY';

    // Strong RSI signals (adjusted for crypto volatility)
    if (rsi < 30) {
      signalType = 'BUY';
      signalStrength = 85;
    } else if (rsi > 70) {
      signalType = 'SELL';
      signalStrength = 85;
    }
    // MA crossover with momentum
    else if (ma5 > ma10 && rsi < 70 && rsi > 40 && priceChange > 0.1) {
      signalType = 'BUY';
      signalStrength = 75 + Math.min(10, volatility * 2);
    } else if (ma5 < ma10 && rsi > 30 && rsi < 60 && priceChange < -0.1) {
      signalType = 'SELL';
      signalStrength = 75 + Math.min(10, volatility * 2);
    }

    // Reduce strength for low volatility
    if (volatility < 0.5) {
      signalStrength = Math.max(signalStrength - 20, 30);
    }

    // Cap maximum strength
    signalStrength = Math.min(signalStrength, 90);

    // Update last signal time if strong enough
    if (signalStrength >= 75) {
      this.lastSignalTime = now;
    }

    return {
      type: signalType,
      strength: signalStrength,
      timestamp: now,
      indicators
    };
  }

  addPriceData(priceHistory: PriceHistory, price: number, volume: number = 0): void {
    priceHistory.prices.push(price);
    priceHistory.volumes.push(volume);
    priceHistory.timestamps.push(Date.now());

    // Keep only max history
    if (priceHistory.prices.length > priceHistory.maxHistory) {
      priceHistory.prices.shift();
      priceHistory.volumes.shift();
      priceHistory.timestamps.shift();
    }
  }

  createPriceHistory(symbol: string, maxHistory: number = 50): PriceHistory {
    return {
      symbol,
      prices: [],
      volumes: [],
      timestamps: [],
      maxHistory
    };
  }
}

export const technicalAnalysis = new TechnicalAnalysisService();

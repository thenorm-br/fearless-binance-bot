import { TradingPair, AccountBalance, OpenOrder, Trade, PriceData } from '@/types/trading';

// Mock Binance API Service for Browser Compatibility
class BinanceApiService {
  private isInitialized = true;
  private mockPrices: { [key: string]: number } = {
    'BTCUSDT': 43250.50,
    'ETHUSDT': 2680.25,
    'BNBUSDT': 315.80,
    'ADAUSDT': 0.4850,
    'SOLUSDT': 98.45
  };

  constructor() {
    console.log('Mock Binance API initialized successfully');
    // Simulate price fluctuations
    this.startPriceSimulation();
  }

  private startPriceSimulation() {
    setInterval(() => {
      Object.keys(this.mockPrices).forEach(symbol => {
        // Simulate price changes (-2% to +2%)
        const change = (Math.random() - 0.5) * 0.04;
        this.mockPrices[symbol] *= (1 + change);
      });
    }, 3000);
  }

  async getAccountBalances(): Promise<AccountBalance[]> {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    // Mock account balances
    const mockBalances = [
      { asset: 'USDT', free: '1250.50', locked: '0.00', total: 1250.50, usdValue: 1250.50 },
      { asset: 'BTC', free: '0.05432100', locked: '0.00', total: 0.054321, usdValue: this.mockPrices['BTCUSDT'] * 0.054321 },
      { asset: 'ETH', free: '0.85647200', locked: '0.00', total: 0.856472, usdValue: this.mockPrices['ETHUSDT'] * 0.856472 },
      { asset: 'BNB', free: '3.25000000', locked: '0.00', total: 3.25, usdValue: this.mockPrices['BNBUSDT'] * 3.25 },
      { asset: 'ADA', free: '2580.00000000', locked: '0.00', total: 2580, usdValue: this.mockPrices['ADAUSDT'] * 2580 },
      { asset: 'SOL', free: '12.45000000', locked: '0.00', total: 12.45, usdValue: this.mockPrices['SOLUSDT'] * 12.45 }
    ];

    return mockBalances;
  }

  async getCurrentPrices(symbols: string[]): Promise<PriceData[]> {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    return symbols.map(symbol => {
      const price = this.mockPrices[symbol] || 0;
      const change24h = (Math.random() - 0.5) * 10; // Random change -5% to +5%
      
      return {
        symbol,
        price,
        change24h,
        volume24h: Math.random() * 50000 + 10000,
        high24h: price * (1 + Math.random() * 0.05),
        low24h: price * (1 - Math.random() * 0.05),
        timestamp: Date.now()
      };
    });
  }

  async getOpenOrders(): Promise<OpenOrder[]> {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    // Mock open orders
    const mockOrders: OpenOrder[] = [
      {
        symbol: 'BTCUSDT',
        orderId: '12345',
        type: 'BUY',
        side: 'BUY',
        amount: 0.001,
        price: 42800,
        status: 'NEW',
        timestamp: Date.now() - 300000
      }
    ];
    
    return mockOrders;
  }

  async placeBuyOrder(symbol: string, quantity: number, price: number): Promise<any> {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    // Mock buy order
    const mockOrder = {
      symbol,
      orderId: Math.random().toString(36).substr(2, 9),
      side: 'BUY',
      type: 'STOP_LOSS_LIMIT',
      quantity: quantity.toString(),
      price: price.toString(),
      status: 'NEW',
      timestamp: Date.now()
    };
    
    console.log(`Mock buy order placed for ${symbol}:`, mockOrder);
    return mockOrder;
  }

  async placeSellOrder(symbol: string, quantity: number, price: number): Promise<any> {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    // Mock sell order
    const mockOrder = {
      symbol,
      orderId: Math.random().toString(36).substr(2, 9),
      side: 'SELL',
      type: 'STOP_LOSS_LIMIT',
      quantity: quantity.toString(),
      price: price.toString(),
      status: 'NEW',
      timestamp: Date.now()
    };
    
    console.log(`Mock sell order placed for ${symbol}:`, mockOrder);
    return mockOrder;
  }

  async cancelOrder(symbol: string, orderId: string): Promise<any> {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    // Mock cancel order
    const result = {
      symbol,
      orderId,
      status: 'CANCELED',
      timestamp: Date.now()
    };
    
    console.log(`Mock order cancelled for ${symbol}:`, result);
    return result;
  }

  async getRecentTrades(symbol: string, limit: number = 50): Promise<Trade[]> {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    // Mock recent trades
    const mockTrades: Trade[] = [];
    for (let i = 0; i < Math.min(limit, 10); i++) {
      mockTrades.push({
        id: Math.random().toString(36).substr(2, 9),
        symbol,
        side: Math.random() > 0.5 ? 'BUY' : 'SELL',
        amount: Math.random() * 0.1,
        price: this.mockPrices[symbol] || 0,
        fee: Math.random() * 0.001,
        timestamp: Date.now() - (i * 3600000) // Each trade 1 hour apart
      });
    }
    
    return mockTrades;
  }

  // Real-time price data simulation
  getPriceData(): PriceData[] {
    return Object.keys(this.mockPrices).map(symbol => ({
      symbol,
      price: this.mockPrices[symbol],
      change24h: (Math.random() - 0.5) * 10,
      volume24h: Math.random() * 50000 + 10000,
      high24h: this.mockPrices[symbol] * (1 + Math.random() * 0.05),
      low24h: this.mockPrices[symbol] * (1 - Math.random() * 0.05),
      timestamp: Date.now()
    }));
  }
}

export const binanceApi = new BinanceApiService();
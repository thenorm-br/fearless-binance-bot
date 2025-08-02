import Binance from 'binance-api-node';
import { TradingPair, AccountBalance, OpenOrder, Trade, PriceData } from '@/types/trading';

// Trading Bot API Service
class BinanceApiService {
  private client: any;
  private isInitialized = false;

  constructor() {
    // Initialize with provided keys - IMPORTANT: In production, store securely
    this.initializeClient();
  }

  private initializeClient() {
    try {
      this.client = Binance({
        apiKey: '0l8qhpPxxCHrzUtPTFE2ARGyJr6cCVOsGZQJQtJufEH41L6DUJFiXvn12VXjZj0I',
        apiSecret: '0dn8rqx5wNnc3EajennmSZrXGDqeNupKKwCPOdnMxnvOkMAFQFe1VpTLRqvaP6hO'
        // Note: Using test net is recommended for development
      });
      this.isInitialized = true;
      console.log('Binance API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Binance API:', error);
    }
  }

  async getAccountBalances(): Promise<AccountBalance[]> {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    try {
      const account = await this.client.accountInfo();
      const prices = await this.client.prices();
      
      return account.balances
        .filter((balance: any) => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0)
        .map((balance: any) => {
          const total = parseFloat(balance.free) + parseFloat(balance.locked);
          const price = balance.asset === 'USDT' ? 1 : (prices[`${balance.asset}USDT`] || 0);
          
          return {
            asset: balance.asset,
            free: balance.free,
            locked: balance.locked,
            total,
            usdValue: total * parseFloat(price)
          };
        });
    } catch (error) {
      console.error('Error fetching account balances:', error);
      throw error;
    }
  }

  async getCurrentPrices(symbols: string[]): Promise<PriceData[]> {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    try {
      const ticker24hr = await this.client.dailyStats();
      
      return symbols.map(symbol => {
        const tickerData = ticker24hr.find((t: any) => t.symbol === symbol);
        
        if (!tickerData) {
          return {
            symbol,
            price: 0,
            change24h: 0,
            volume24h: 0,
            high24h: 0,
            low24h: 0,
            timestamp: Date.now()
          };
        }

        return {
          symbol,
          price: parseFloat(tickerData.lastPrice),
          change24h: parseFloat(tickerData.priceChangePercent),
          volume24h: parseFloat(tickerData.volume),
          high24h: parseFloat(tickerData.highPrice),
          low24h: parseFloat(tickerData.lowPrice),
          timestamp: Date.now()
        };
      });
    } catch (error) {
      console.error('Error fetching current prices:', error);
      throw error;
    }
  }

  async getOpenOrders(): Promise<OpenOrder[]> {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    try {
      const orders = await this.client.openOrders();
      
      return orders.map((order: any) => ({
        symbol: order.symbol,
        orderId: order.orderId,
        type: order.type,
        side: order.side,
        amount: parseFloat(order.origQty),
        price: parseFloat(order.price),
        status: order.status,
        timestamp: order.time
      }));
    } catch (error) {
      console.error('Error fetching open orders:', error);
      throw error;
    }
  }

  async placeBuyOrder(symbol: string, quantity: number, price: number): Promise<any> {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    try {
      const order = await this.client.order({
        symbol,
        side: 'BUY',
        type: 'STOP_LOSS_LIMIT',
        quantity: quantity.toString(),
        price: price.toString(),
        stopPrice: (price * 0.995).toString(), // 0.5% below price
        timeInForce: 'GTC'
      });
      
      console.log(`Buy order placed for ${symbol}:`, order);
      return order;
    } catch (error) {
      console.error(`Error placing buy order for ${symbol}:`, error);
      throw error;
    }
  }

  async placeSellOrder(symbol: string, quantity: number, price: number): Promise<any> {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    try {
      const order = await this.client.order({
        symbol,
        side: 'SELL',
        type: 'STOP_LOSS_LIMIT',
        quantity: quantity.toString(),
        price: price.toString(),
        stopPrice: (price * 1.005).toString(), // 0.5% above price
        timeInForce: 'GTC'
      });
      
      console.log(`Sell order placed for ${symbol}:`, order);
      return order;
    } catch (error) {
      console.error(`Error placing sell order for ${symbol}:`, error);
      throw error;
    }
  }

  async cancelOrder(symbol: string, orderId: string): Promise<any> {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    try {
      const result = await this.client.cancelOrder({
        symbol,
        orderId
      });
      
      console.log(`Order cancelled for ${symbol}:`, result);
      return result;
    } catch (error) {
      console.error(`Error cancelling order for ${symbol}:`, error);
      throw error;
    }
  }

  async getRecentTrades(symbol: string, limit: number = 50): Promise<Trade[]> {
    if (!this.isInitialized) throw new Error('API not initialized');
    
    try {
      const trades = await this.client.myTrades({ symbol, limit });
      
      return trades.map((trade: any) => ({
        id: trade.id,
        symbol: trade.symbol,
        side: trade.isBuyer ? 'BUY' : 'SELL',
        amount: parseFloat(trade.qty),
        price: parseFloat(trade.price),
        fee: parseFloat(trade.commission),
        timestamp: trade.time
      }));
    } catch (error) {
      console.error(`Error fetching recent trades for ${symbol}:`, error);
      throw error;
    }
  }

  // Mock data for development - remove in production
  getMockPrices(): PriceData[] {
    return [
      { symbol: 'BTCUSDT', price: 43250.50, change24h: 2.45, volume24h: 25000, high24h: 44000, low24h: 42800, timestamp: Date.now() },
      { symbol: 'ETHUSDT', price: 2680.25, change24h: -1.23, volume24h: 15000, high24h: 2720, low24h: 2650, timestamp: Date.now() },
      { symbol: 'BNBUSDT', price: 315.80, change24h: 0.85, volume24h: 8500, high24h: 320, low24h: 310, timestamp: Date.now() },
      { symbol: 'ADAUSDT', price: 0.4850, change24h: 3.20, volume24h: 12000, high24h: 0.495, low24h: 0.470, timestamp: Date.now() },
      { symbol: 'SOLUSDT', price: 98.45, change24h: -2.10, volume24h: 9800, high24h: 102, low24h: 96.5, timestamp: Date.now() }
    ];
  }
}

export const binanceApi = new BinanceApiService();
import { supabase } from '@/integrations/supabase/client';
import { AccountBalance, PriceData, OpenOrder, Trade } from '@/types/trading';

class RealBinanceApiService {
  async getAccountBalances(): Promise<AccountBalance[]> {
    try {
      const { data, error } = await supabase.functions.invoke('get-account-balance');
      
      if (error) throw error;
      
      return data.balances.map((balance: any) => ({
        asset: balance.asset,
        free: balance.free.toString(),
        locked: balance.locked.toString(),
        total: balance.total,
        usdValue: balance.usd_value
      }));
    } catch (error) {
      console.error('Error fetching account balances:', error);
      throw error;
    }
  }

  async getCurrentPrices(symbols: string[]): Promise<PriceData[]> {
    try {
      const { data, error } = await supabase.functions.invoke('get-market-prices', {
        body: { symbols }
      });
      
      if (error) throw error;
      
      return data.data;
    } catch (error) {
      console.error('Error fetching current prices:', error);
      throw error;
    }
  }

  async getOpenOrders(symbol?: string): Promise<OpenOrder[]> {
    try {
      const { data, error } = await supabase.functions.invoke('get-open-orders', {
        body: { symbol }
      });
      
      if (error) throw error;
      
      return data.orders.map((order: any) => ({
        symbol: order.symbol,
        orderId: order.orderId.toString(),
        type: order.side,
        side: order.side,
        amount: parseFloat(order.origQty),
        price: parseFloat(order.price),
        status: order.status,
        timestamp: new Date(order.time).getTime()
      }));
    } catch (error) {
      console.error('Error fetching open orders:', error);
      throw error;
    }
  }

  async placeBuyOrder(symbol: string, quantity: number, price: number): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('place-order', {
        body: {
          symbol,
          side: 'BUY',
          type: 'LIMIT',
          quantity,
          price
        }
      });
      
      if (error) throw error;
      
      return data.order;
    } catch (error) {
      console.error('Error placing buy order:', error);
      throw error;
    }
  }

  async placeSellOrder(symbol: string, quantity: number, price: number): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('place-order', {
        body: {
          symbol,
          side: 'SELL',
          type: 'LIMIT',
          quantity,
          price
        }
      });
      
      if (error) throw error;
      
      return data.order;
    } catch (error) {
      console.error('Error placing sell order:', error);
      throw error;
    }
  }

  async cancelOrder(symbol: string, orderId: string): Promise<any> {
    // Implementation would require another edge function for canceling orders
    throw new Error('Cancel order not implemented yet');
  }

  async getRecentTrades(symbol: string, limit: number = 100): Promise<Trade[]> {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('symbol', symbol)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return data.map((trade: any) => ({
        id: trade.id,
        symbol: trade.symbol,
        side: trade.side,
        amount: parseFloat(trade.quantity),
        price: parseFloat(trade.price),
        fee: parseFloat(trade.fee || 0),
        profit: parseFloat(trade.profit || 0),
        timestamp: new Date(trade.executed_at).getTime()
      }));
    } catch (error) {
      console.error('Error fetching recent trades:', error);
      throw error;
    }
  }

  // Get cached price data from API (doesn't require authentication)
  getPriceData(): PriceData[] {
    // This would be called from a cached state or separate service
    // For now, return empty array as fallback
    return [];
  }
}

export const realBinanceApi = new RealBinanceApiService();
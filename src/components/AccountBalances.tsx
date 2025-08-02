import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AccountBalance } from '@/types/trading';
import { binanceApi } from '@/services/binanceApi';
import { Wallet, DollarSign, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AccountBalances() {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalValue, setTotalValue] = useState(0);

  // Mock data for development
  const mockBalances: AccountBalance[] = [
    { asset: 'USDT', free: '1250.50', locked: '0.00', total: 1250.50, usdValue: 1250.50 },
    { asset: 'BTC', free: '0.05432100', locked: '0.00', total: 0.054321, usdValue: 2347.85 },
    { asset: 'ETH', free: '0.85647200', locked: '0.00', total: 0.856472, usdValue: 2295.14 },
    { asset: 'BNB', free: '3.25000000', locked: '0.00', total: 3.25, usdValue: 1026.35 },
    { asset: 'ADA', free: '2580.00000000', locked: '0.00', total: 2580, usdValue: 1251.30 },
    { asset: 'SOL', free: '12.45000000', locked: '0.00', total: 12.45, usdValue: 1225.73 }
  ];

  const fetchBalances = async () => {
    setIsLoading(true);
    try {
      // Use mock data for development
      setBalances(mockBalances);
      setTotalValue(mockBalances.reduce((sum, balance) => sum + balance.usdValue, 0));
    } catch (error) {
      console.error('Error fetching balances:', error);
      // Fallback to mock data
      setBalances(mockBalances);
      setTotalValue(mockBalances.reduce((sum, balance) => sum + balance.usdValue, 0));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  const formatBalance = (balance: AccountBalance) => {
    if (balance.asset === 'USDT') {
      return parseFloat(balance.free).toFixed(2);
    }
    return parseFloat(balance.free).toFixed(8);
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Wallet className="w-5 h-5 mr-2" />
              Portfolio Overview
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBalances}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <DollarSign className="w-6 h-6 mx-auto mb-2 text-profit" />
              <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total Value</p>
            </div>
            
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-info" />
              <p className="text-2xl font-bold">{balances.length}</p>
              <p className="text-sm text-muted-foreground">Assets</p>
            </div>
            
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <Wallet className="w-6 h-6 mx-auto mb-2 text-warning" />
              <p className="text-2xl font-bold">+2.4%</p>
              <p className="text-sm text-muted-foreground">24h Change</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Details */}
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader className="pb-4">
          <CardTitle>Asset Balances</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {balances.map((balance, index) => (
              <div
                key={balance.asset}
                className={`p-4 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors ${
                  index % 2 === 0 ? 'bg-background/50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary text-sm">
                        {balance.asset.substring(0, 2)}
                      </span>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg">{balance.asset}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatBalance(balance)} {balance.asset}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold">
                      ${balance.usdValue.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {((balance.usdValue / totalValue) * 100).toFixed(1)}% of portfolio
                    </p>
                  </div>
                </div>

                {balance.locked !== '0.00' && parseFloat(balance.locked) > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Locked in Orders</span>
                      <Badge variant="outline" className="text-warning border-warning">
                        {parseFloat(balance.locked).toFixed(8)} {balance.asset}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {balances.length === 0 && !isLoading && (
            <div className="p-8 text-center text-muted-foreground">
              <Wallet className="w-8 h-8 mx-auto mb-2" />
              <p>No balances found</p>
              <p className="text-sm">Connect your account to view balances</p>
            </div>
          )}

          {isLoading && (
            <div className="p-8 text-center text-muted-foreground">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
              <p>Loading balances...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
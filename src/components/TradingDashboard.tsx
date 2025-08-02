import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TradingPairsGrid } from './TradingPairsGrid';
import { BotControls } from './BotControls';
import { TradingStats } from './TradingStats';
import { AccountBalances } from './AccountBalances';
import { TradingHero } from './TradingHero';
import { tradingBot } from '@/services/tradingBot';
import { TradingPair, BotStats } from '@/types/trading';
import { Activity, DollarSign, TrendingUp, Zap } from 'lucide-react';

export function TradingDashboard() {
  const [monitoredPairs, setMonitoredPairs] = useState<TradingPair[]>([]);
  const [botStats, setBotStats] = useState<BotStats>({
    totalProfit: 0,
    totalTrades: 0,
    winRate: 0,
    isRunning: false,
    startTime: 0,
    monitoredPairs: 0
  });

  useEffect(() => {
    // Update data every 2 seconds
    const interval = setInterval(() => {
      setMonitoredPairs(tradingBot.getMonitoredPairs());
      setBotStats(tradingBot.getBotStats());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const totalValue = monitoredPairs.reduce((sum, pair) => {
    return sum + ((pair.quantity || 0) * pair.price);
  }, 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Section */}
        <TradingHero />
        
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant={botStats.isRunning ? "default" : "secondary"} className="px-3 py-1">
              {botStats.isRunning ? (
                <>
                  <Activity className="w-3 h-3 mr-1 animate-pulse" />
                  Active
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3 mr-1" />
                  Stopped
                </>
              )}
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-card border-border/50 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Profit</p>
                  <p className={`text-2xl font-bold ${botStats.totalProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                    ${botStats.totalProfit.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-profit" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Portfolio Value</p>
                  <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-info" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="text-2xl font-bold">{botStats.totalTrades}</p>
                </div>
                <Activity className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold text-profit">{botStats.winRate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-profit" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-md">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trading">Trading</TabsTrigger>
            <TabsTrigger value="balances">Balances</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TradingPairsGrid pairs={monitoredPairs} />
              </div>
              <div className="space-y-6">
                <BotControls isRunning={botStats.isRunning} />
                <TradingStats stats={botStats} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trading">
            <TradingPairsGrid pairs={monitoredPairs} showDetails />
          </TabsContent>

          <TabsContent value="balances">
            <AccountBalances />
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle>Bot Configuration</CardTitle>
                <CardDescription>
                  Configure trading parameters and risk management settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Settings panel coming soon. Bot is currently running with default grid trading configuration.
                  </p>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p><strong>Active Pairs:</strong> BTC/USDT, ETH/USDT, BNB/USDT, ADA/USDT, SOL/USDT</p>
                    <p><strong>Grid Strategy:</strong> 2-level buy/sell grids</p>
                    <p><strong>Risk Management:</strong> Stop-loss enabled</p>
                    <p><strong>Monitoring Interval:</strong> 2 seconds</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default TradingDashboard;
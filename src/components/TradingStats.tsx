import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BotStats } from '@/types/trading';
import { BarChart3, Target, TrendingUp, Clock } from 'lucide-react';

interface TradingStatsProps {
  stats: BotStats;
}

export function TradingStats({ stats }: TradingStatsProps) {
  const formatUptime = (startTime: number) => {
    if (!startTime) return 'Not started';
    
    const uptime = Date.now() - startTime;
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const profitPercentage = stats.totalProfit > 0 ? Math.min((stats.totalProfit / 1000) * 100, 100) : 0;

  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Performance Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profit Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Profit</span>
            <span className={`text-sm font-medium ${stats.totalProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
              ${stats.totalProfit.toFixed(2)}
            </span>
          </div>
          <Progress 
            value={profitPercentage} 
            className="h-2"
          />
        </div>

        {/* Win Rate */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Win Rate</span>
            <span className="text-sm font-medium text-profit">
              {stats.winRate.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={stats.winRate} 
            className="h-2"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/20 rounded-lg">
            <Target className="w-5 h-5 mx-auto mb-1 text-info" />
            <p className="text-lg font-bold">{stats.totalTrades}</p>
            <p className="text-xs text-muted-foreground">Total Trades</p>
          </div>
          
          <div className="text-center p-3 bg-muted/20 rounded-lg">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-warning" />
            <p className="text-lg font-bold">{stats.monitoredPairs}</p>
            <p className="text-xs text-muted-foreground">Active Pairs</p>
          </div>
        </div>

        {/* Uptime */}
        {stats.isRunning && (
          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Uptime</span>
            </div>
            <span className="text-sm font-mono font-medium">
              {formatUptime(stats.startTime)}
            </span>
          </div>
        )}

        {/* Additional Metrics */}
        <div className="space-y-3 pt-3 border-t border-border/50">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Avg Trade Size</span>
            <span>$75.00</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Best Trade</span>
            <span className="text-profit">+$12.45</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Worst Trade</span>
            <span className="text-loss">-$3.21</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Risk Score</span>
            <span className="text-warning">Medium</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
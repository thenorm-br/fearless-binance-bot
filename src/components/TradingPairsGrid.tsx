import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TradingPair } from '@/types/trading';
import { TrendingUp, TrendingDown, Activity, Pause, MoreHorizontal } from 'lucide-react';

interface TradingPairsGridProps {
  pairs: TradingPair[];
  showDetails?: boolean;
}

export function TradingPairsGrid({ pairs, showDetails = false }: TradingPairsGridProps) {
  const getStatusColor = (status: TradingPair['status']) => {
    switch (status) {
      case 'buying': return 'text-info';
      case 'selling': return 'text-profit';
      case 'monitoring': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: TradingPair['status']) => {
    switch (status) {
      case 'buying': return <TrendingDown className="w-3 h-3" />;
      case 'selling': return <TrendingUp className="w-3 h-3" />;
      case 'monitoring': return <Activity className="w-3 h-3" />;
      default: return <Pause className="w-3 h-3" />;
    }
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          Trading Pairs
          <Badge variant="secondary" className="px-2 py-1">
            {pairs.length} Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-0">
          {pairs.map((pair, index) => (
            <div
              key={pair.symbol}
              className={`p-4 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors ${
                index % 2 === 0 ? 'bg-background/50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="font-semibold text-lg">{pair.symbol}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className={`${getStatusColor(pair.status)} border-current`}>
                        {getStatusIcon(pair.status)}
                        <span className="ml-1 capitalize">{pair.status}</span>
                      </Badge>
                      {pair.lastBuyPrice && (
                        <Badge variant="secondary" className="text-xs">
                          Last Buy: ${pair.lastBuyPrice.toFixed(4)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold">
                    ${pair.price.toFixed(pair.symbol.includes('USD') ? 2 : 4)}
                  </div>
                  <div className="flex items-center justify-end space-x-2 mt-1">
                    <span
                      className={`text-sm font-medium ${
                        parseFloat(pair.priceChangePercent) >= 0 ? 'text-profit' : 'text-loss'
                      }`}
                    >
                      {parseFloat(pair.priceChangePercent) >= 0 ? '+' : ''}
                      {pair.priceChangePercent}%
                    </span>
                    {parseFloat(pair.priceChangePercent) >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-profit" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-loss" />
                    )}
                  </div>
                </div>

                {showDetails && (
                  <div className="ml-4">
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {showDetails && pair.quantity && (
                <div className="mt-3 pt-3 border-t border-border/30">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Holdings</p>
                      <p className="font-medium">{pair.quantity.toFixed(6)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Value</p>
                      <p className="font-medium">${(pair.quantity * pair.price).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">P&L</p>
                      {pair.lastBuyPrice && (
                        <p
                          className={`font-medium ${
                            pair.price > pair.lastBuyPrice ? 'text-profit' : 'text-loss'
                          }`}
                        >
                          {pair.price > pair.lastBuyPrice ? '+' : ''}
                          {(((pair.price - pair.lastBuyPrice) / pair.lastBuyPrice) * 100).toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {pairs.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2" />
            <p>No trading pairs active</p>
            <p className="text-sm">Start the bot to begin monitoring</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
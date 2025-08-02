import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Square, Settings, TrendingUp, TrendingDown } from 'lucide-react';
import { martingaleBot } from '@/services/martingaleBot';
import { MartingaleStats, TradingSignal } from '@/types/martingale';
import { useToast } from '@/hooks/use-toast';

const MartingaleControls: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<MartingaleStats | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [lastSignal, setLastSignal] = useState<TradingSignal | null>(null);
  const [remainingCooldown, setRemainingCooldown] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const updateData = () => {
      setIsRunning(martingaleBot.isRunning());
      setStats(martingaleBot.getStats());
      setCurrentPrice(martingaleBot.getCurrentPricePublic());
      setLastSignal(martingaleBot.getLastSignal() || null);
      setRemainingCooldown(martingaleBot.getRemainingCooldown());
    };

    updateData();
    const interval = setInterval(updateData, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleStartBot = async () => {
    try {
      await martingaleBot.startBot();
      setIsRunning(true);
      toast({
        title: "Bot Iniciado",
        description: "Martingale Bot SOLUSDT iniciado com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao iniciar o bot",
        variant: "destructive"
      });
    }
  };

  const handleStopBot = async () => {
    try {
      await martingaleBot.stopBot();
      setIsRunning(false);
      toast({
        title: "Bot Parado",
        description: "Martingale Bot SOLUSDT parado com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao parar o bot",
        variant: "destructive"
      });
    }
  };

  const formatCooldownTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const getNextStakeAmount = (): number => {
    if (!stats) return 0;
    const config = martingaleBot.getConfig();
    if (stats.currentAttempt === 0) {
      return config.initialStake;
    }
    return config.initialStake * Math.pow(config.galeFactor, stats.currentAttempt);
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Martingale Bot SOLUSDT
            <Badge variant={isRunning ? "default" : "secondary"}>
              {isRunning ? "Ativo" : "Parado"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {!isRunning ? (
              <Button onClick={handleStartBot} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Iniciar Bot
              </Button>
            ) : (
              <Button 
                onClick={handleStopBot} 
                variant="destructive" 
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Parar Bot
              </Button>
            )}
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </Button>
          </div>

          {/* Current Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Preço SOL</p>
              <p className="text-lg font-semibold">
                {currentPrice ? `$${currentPrice.toFixed(4)}` : 'N/A'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Tentativa Atual</p>
              <p className="text-lg font-semibold">
                {stats ? `${stats.currentAttempt}/4` : '0/4'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Próximo Stake</p>
              <p className="text-lg font-semibold">
                ${getNextStakeAmount().toFixed(2)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Lucro Diário</p>
              <p className={`text-lg font-semibold ${stats && stats.dailyProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats ? `$${stats.dailyProfit.toFixed(2)}` : '$0.00'}
              </p>
            </div>
          </div>

          {/* Cooldown Progress */}
          {remainingCooldown > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Cooldown</span>
                <span>{formatCooldownTime(remainingCooldown)}</span>
              </div>
              <Progress value={Math.max(0, 100 - (remainingCooldown / 120000) * 100)} />
            </div>
          )}

          {/* Last Signal */}
          {lastSignal && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                {lastSignal.type === 'BUY' ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium">Último Sinal: {lastSignal.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={lastSignal.strength >= 80 ? "default" : "secondary"}>
                  {lastSignal.strength.toFixed(0)}%
                </Badge>
                <span className="text-sm text-muted-foreground">
                  RSI: {lastSignal.indicators.rsi.toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Ciclos</p>
                <p className="text-xl font-bold">{stats.totalCycles}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Ciclos Vencedores</p>
                <p className="text-xl font-bold text-green-600">{stats.winCycles}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Taxa de Vitória</p>
                <p className="text-xl font-bold">
                  {stats.totalCycles > 0 ? ((stats.winCycles / stats.totalCycles) * 100).toFixed(1) : '0'}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Sequência Atual</p>
                <p className={`text-xl font-bold ${stats.currentStreak >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.currentStreak}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Melhor Sequência</p>
                <p className="text-xl font-bold text-green-600">{stats.maxWinStreak}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Lucro Total</p>
                <p className={`text-xl font-bold ${stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${stats.totalProfit.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MartingaleControls;
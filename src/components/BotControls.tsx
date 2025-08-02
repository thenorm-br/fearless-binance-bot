import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { tradingBot } from '@/services/tradingBot';
import { Play, Square, AlertTriangle, Settings, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BotControlsProps {
  isRunning: boolean;
}

export function BotControls({ isRunning }: BotControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleStart = async () => {
    setIsLoading(true);
    try {
      await tradingBot.startBot();
      toast({
        title: "Bot Started",
        description: "Trading bot is now active and monitoring markets",
      });
    } catch (error) {
      toast({
        title: "Error Starting Bot",
        description: "Failed to start trading bot. Check configuration.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      await tradingBot.stopBot();
      toast({
        title: "Bot Stopped",
        description: "Trading bot has been stopped safely",
      });
    } catch (error) {
      toast({
        title: "Error Stopping Bot",
        description: "Failed to stop trading bot properly",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Bot Controls
        </CardTitle>
        <CardDescription>
          Start, stop, and monitor trading bot status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning Alert */}
        <Alert className="border-warning/20 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            <strong>Test Mode:</strong> Bot is currently using test API keys. 
            No real trades will be executed.
          </AlertDescription>
        </Alert>

        {/* Security Status */}
        <div className="flex items-center space-x-2 p-3 bg-muted/20 rounded-lg">
          <Shield className="w-4 h-4 text-profit" />
          <div className="text-sm">
            <p className="font-medium">API Connection</p>
            <p className="text-muted-foreground">Secure connection established</p>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex space-x-2">
          {!isRunning ? (
            <Button
              onClick={handleStart}
              disabled={isLoading}
              className="flex-1 bg-profit hover:bg-profit/90 text-profit-foreground"
            >
              <Play className="w-4 h-4 mr-2" />
              {isLoading ? 'Starting...' : 'Start Bot'}
            </Button>
          ) : (
            <Button
              onClick={handleStop}
              disabled={isLoading}
              variant="destructive"
              className="flex-1"
            >
              <Square className="w-4 h-4 mr-2" />
              {isLoading ? 'Stopping...' : 'Stop Bot'}
            </Button>
          )}
          
          <Button variant="outline" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Status Information */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            <span className={isRunning ? 'text-profit' : 'text-muted-foreground'}>
              {isRunning ? 'Active' : 'Stopped'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Strategy:</span>
            <span>Grid Trading</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Risk Level:</span>
            <span className="text-warning">Medium</span>
          </div>
          
          {isRunning && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uptime:</span>
              <span>00:45:32</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
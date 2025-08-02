import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, Wifi, WifiOff, RefreshCw, Clock } from 'lucide-react';
import { ConnectivityValidator } from '@/services/connectivityValidator';
import { supabase } from '@/integrations/supabase/client';

interface HealthStatus {
  binanceConnection: boolean;
  credentials: boolean;
  lastIpCheck?: string;
  lastSuccessfulCall?: Date;
  consecutiveFailures: number;
  status: 'healthy' | 'warning' | 'critical';
}

export function ApiHealthMonitor() {
  const [health, setHealth] = useState<HealthStatus>({
    binanceConnection: false,
    credentials: false,
    consecutiveFailures: 0,
    status: 'critical'
  });
  const [isChecking, setIsChecking] = useState(false);
  const [autoCheck, setAutoCheck] = useState(true);

  const checkHealth = async () => {
    setIsChecking(true);
    
    try {
      // Test Binance connection
      const connectionResult = await ConnectivityValidator.validateBinanceConnection();
      const credentialsResult = await ConnectivityValidator.validateCredentials();
      
      // Get current IP for monitoring
      let currentIp = '';
      try {
        const { data: ipData } = await supabase.functions.invoke('get-public-ip');
        currentIp = ipData?.ipResults?.[0]?.ip || '';
      } catch (error) {
        console.warn('Could not get current IP:', error);
      }

      const newHealth: HealthStatus = {
        binanceConnection: connectionResult.success,
        credentials: credentialsResult.success,
        lastIpCheck: currentIp,
        consecutiveFailures: connectionResult.success && credentialsResult.success 
          ? 0 
          : health.consecutiveFailures + 1,
        lastSuccessfulCall: connectionResult.success && credentialsResult.success 
          ? new Date() 
          : health.lastSuccessfulCall,
        status: getHealthStatus(connectionResult.success, credentialsResult.success, health.consecutiveFailures)
      };

      setHealth(newHealth);
      
      // Store health data for persistence
      localStorage.setItem('binance-health', JSON.stringify(newHealth));
      
    } catch (error) {
      console.error('Health check failed:', error);
      setHealth(prev => ({
        ...prev,
        consecutiveFailures: prev.consecutiveFailures + 1,
        status: 'critical'
      }));
    }
    
    setIsChecking(false);
  };

  const getHealthStatus = (connection: boolean, credentials: boolean, failures: number): HealthStatus['status'] => {
    if (connection && credentials) return 'healthy';
    if (failures < 3) return 'warning';
    return 'critical';
  };

  const getStatusColor = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
    }
  };

  const getStatusIcon = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy': return <Wifi className="h-4 w-4 text-green-600" />;
      case 'warning': return <Activity className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <WifiOff className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusBadge = (isOnline: boolean) => {
    return (
      <Badge variant={isOnline ? "default" : "destructive"}>
        {isOnline ? 'Online' : 'Offline'}
      </Badge>
    );
  };

  // Auto-check every 30 seconds if enabled
  useEffect(() => {
    if (!autoCheck) return;
    
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [autoCheck]);

  // Initial check and load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('binance-health');
    if (stored) {
      try {
        const parsedHealth = JSON.parse(stored);
        setHealth({
          ...parsedHealth,
          lastSuccessfulCall: parsedHealth.lastSuccessfulCall 
            ? new Date(parsedHealth.lastSuccessfulCall)
            : undefined
        });
      } catch (error) {
        console.error('Failed to parse stored health data:', error);
      }
    }
    
    checkHealth();
  }, []);

  const timeSinceLastSuccess = health.lastSuccessfulCall 
    ? Math.floor((Date.now() - health.lastSuccessfulCall.getTime()) / 1000 / 60)
    : null;

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(health.status)}
            Status da API Binance
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAutoCheck(!autoCheck)}
            >
              Auto: {autoCheck ? 'ON' : 'OFF'}
            </Button>
            <Button
              size="sm"
              onClick={checkHealth}
              disabled={isChecking}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Verificando...' : 'Verificar'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Overall Status */}
        <Alert className={`border-l-4 ${
          health.status === 'healthy' ? 'border-l-green-500 bg-green-50 dark:bg-green-950' :
          health.status === 'warning' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950' :
          'border-l-red-500 bg-red-50 dark:bg-red-950'
        }`}>
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span className={`font-semibold ${getStatusColor(health.status)}`}>
                {health.status === 'healthy' && '✅ Sistema Operacional'}
                {health.status === 'warning' && '⚠️ Problemas Detectados'}
                {health.status === 'critical' && '🚨 Sistema Crítico'}
              </span>
              {timeSinceLastSuccess !== null && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timeSinceLastSuccess === 0 
                    ? 'Agora mesmo' 
                    : `${timeSinceLastSuccess}min atrás`
                  }
                </span>
              )}
            </div>
          </AlertDescription>
        </Alert>

        {/* Service Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <p className="font-medium text-sm">Conexão Binance</p>
              <p className="text-xs text-muted-foreground">Conectividade básica</p>
            </div>
            {getStatusBadge(health.binanceConnection)}
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <p className="font-medium text-sm">Credenciais</p>
              <p className="text-xs text-muted-foreground">Autenticação API</p>
            </div>
            {getStatusBadge(health.credentials)}
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          {health.lastIpCheck && (
            <p>🌐 IP Atual: <code className="bg-muted px-1 rounded">{health.lastIpCheck}</code></p>
          )}
          {health.consecutiveFailures > 0 && (
            <p className="text-red-600">
              ⚠️ Falhas consecutivas: {health.consecutiveFailures}
            </p>
          )}
          <p className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Verificação automática: {autoCheck ? 'Ativada (30s)' : 'Desativada'}
          </p>
        </div>

        {/* Recommendations */}
        {health.status !== 'healthy' && (
          <Alert>
            <AlertDescription>
              <div className="text-sm">
                <p className="font-medium mb-2">💡 Ações Recomendadas:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {!health.binanceConnection && (
                    <li>Verificar se o IP do Supabase está na whitelist da Binance</li>
                  )}
                  {!health.credentials && (
                    <li>Verificar se as credenciais BINANCE_API_KEY e BINANCE_SECRET_KEY estão corretas</li>
                  )}
                  {health.consecutiveFailures > 5 && (
                    <li>Considerar recriar a API Key na Binance</li>
                  )}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
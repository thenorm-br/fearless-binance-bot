import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { realBinanceApi } from '@/services/realBinanceApi';
import { supabase } from '@/integrations/supabase/client';

export function DebugPanel() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [publicIp, setPublicIp] = useState<any>(null);
  const [ipLoading, setIpLoading] = useState(false);

  const getPublicIp = async () => {
    setIpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-public-ip');
      if (error) {
        console.error('Error getting public IP:', error);
        setPublicIp({ success: false, error: error.message });
      } else {
        setPublicIp(data);
      }
    } catch (error) {
      console.error('Error calling get-public-ip function:', error);
      setPublicIp({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
    setIpLoading(false);
  };

  const runDiagnostics = async () => {
    setIsLoading(true);
    const info: any = {};

    try {
      // Check auth status
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      info.auth = {
        isAuthenticated: !!user,
        userId: user?.id,
        email: user?.email,
        error: authError?.message
      };

      // Check if we can call the edge function
      try {
        const { data, error } = await supabase.functions.invoke('get-account-balance');
        info.edgeFunction = {
          success: !error,
          data: data,
          error: error?.message
        };
      } catch (error) {
        info.edgeFunction = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      // Check database access
      try {
        const { data, error } = await supabase
          .from('account_balances')
          .select('*')
          .limit(5);
        
        info.database = {
          canRead: !error,
          recordCount: data?.length || 0,
          error: error?.message
        };
      } catch (error) {
        info.database = {
          canRead: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      // Test API service
      try {
        await realBinanceApi.getAccountBalances();
        info.apiService = { success: true };
      } catch (error) {
        info.apiService = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      // Test Binance connection directly
      try {
        const { data, error } = await supabase.functions.invoke('test-binance-connection');
        info.binanceConnection = {
          success: !error && data?.success,
          data: data,
          error: error?.message
        };
      } catch (error) {
        info.binanceConnection = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

    } catch (error) {
      info.generalError = error instanceof Error ? error.message : 'Unknown error';
    }

    setDebugInfo(info);
    setIsLoading(false);
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Debug Panel
          <div className="flex gap-2">
            <Button onClick={getPublicIp} disabled={ipLoading} size="sm" variant="outline">
              {ipLoading ? 'Getting IP...' : 'Get Public IP'}
            </Button>
            <Button onClick={runDiagnostics} disabled={isLoading} size="sm">
              {isLoading ? 'Running...' : 'Run Diagnostics'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {publicIp && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border">
            <h4 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">🌐 IP Público para Binance</h4>
            {publicIp.success ? (
              <div className="space-y-3">
                {publicIp.ipResults?.map((result: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                    <span className="text-sm font-mono text-green-700 dark:text-green-300 text-lg">
                      {result.ip}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {result.service}
                    </Badge>
                  </div>
                ))}
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                    ✅ Use qualquer um destes IPs na configuração da Binance
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Recomendamos usar o primeiro IP da lista
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-red-600 dark:text-red-400">
                <p className="font-medium">❌ Erro ao obter IP público</p>
                <p className="text-sm mt-1">{publicIp.error}</p>
              </div>
            )}
          </div>
        )}
        
        {debugInfo && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Authentication</h4>
              <Badge variant={debugInfo.auth.isAuthenticated ? "default" : "destructive"}>
                {debugInfo.auth.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
              </Badge>
              {debugInfo.auth.error && (
                <p className="text-sm text-red-500 mt-1">Error: {debugInfo.auth.error}</p>
              )}
              {debugInfo.auth.userId && (
                <p className="text-xs text-muted-foreground mt-1">User ID: {debugInfo.auth.userId}</p>
              )}
            </div>

            <div>
              <h4 className="font-semibold mb-2">Edge Function</h4>
              <Badge variant={debugInfo.edgeFunction.success ? "default" : "destructive"}>
                {debugInfo.edgeFunction.success ? 'Working' : 'Failed'}
              </Badge>
              {debugInfo.edgeFunction.error && (
                <p className="text-sm text-red-500 mt-1">Error: {debugInfo.edgeFunction.error}</p>
              )}
            </div>

            <div>
              <h4 className="font-semibold mb-2">Database Access</h4>
              <Badge variant={debugInfo.database.canRead ? "default" : "destructive"}>
                {debugInfo.database.canRead ? 'Can Read' : 'Cannot Read'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                Records: {debugInfo.database.recordCount}
              </p>
              {debugInfo.database.error && (
                <p className="text-sm text-red-500 mt-1">Error: {debugInfo.database.error}</p>
              )}
            </div>

            <div>
              <h4 className="font-semibold mb-2">API Service</h4>
              <Badge variant={debugInfo.apiService.success ? "default" : "destructive"}>
                {debugInfo.apiService.success ? 'Working' : 'Failed'}
              </Badge>
              {debugInfo.apiService.error && (
                <p className="text-sm text-red-500 mt-1">Error: {debugInfo.apiService.error}</p>
              )}
            </div>

            <div>
              <h4 className="font-semibold mb-2">Binance Connection Test</h4>
              <Badge variant={debugInfo.binanceConnection?.success ? "default" : "destructive"}>
                {debugInfo.binanceConnection?.success ? 'Connected' : 'Failed'}
              </Badge>
              {debugInfo.binanceConnection?.error && (
                <p className="text-sm text-red-500 mt-1">Error: {debugInfo.binanceConnection.error}</p>
              )}
              {debugInfo.binanceConnection?.data && (
                <div className="text-xs text-muted-foreground mt-1">
                  <pre className="whitespace-pre-wrap bg-muted p-2 rounded mt-2">
                    {JSON.stringify(debugInfo.binanceConnection.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
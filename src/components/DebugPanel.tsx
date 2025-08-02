import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { realBinanceApi } from '@/services/realBinanceApi';
import { supabase } from '@/integrations/supabase/client';

export function DebugPanel() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

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
          <Button onClick={runDiagnostics} disabled={isLoading} size="sm">
            {isLoading ? 'Running...' : 'Run Diagnostics'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function CredentialsTest() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testCredentials = async () => {
    setTesting(true);
    setResult(null);

    try {
      console.log('🔍 Testando credenciais Binance...');
      
      const { data, error } = await supabase.functions.invoke('test-martingale');
      
      if (error) {
        throw new Error(error.message);
      }
      
      setResult(data);
      
      if (data.success) {
        toast({
          title: "✅ Credenciais OK",
          description: "Binance API configurada corretamente",
        });
      } else {
        toast({
          title: "❌ Credenciais Faltando",
          description: data.error,
          variant: "destructive"
        });
      }
      
    } catch (error: any) {
      console.error('Erro no teste:', error);
      setResult({ error: error.message });
      toast({
        title: "❌ Erro no Teste",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔑 Teste de Credenciais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testCredentials} 
          disabled={testing}
          className="w-full"
        >
          {testing ? 'Testando...' : 'Testar Credenciais Binance'}
        </Button>
        
        {result && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            {result.success ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="default">✅ Sucesso</Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div><strong>API Key:</strong> {result.credentials?.apiKeyConfigured ? '✅ Configurada' : '❌ Faltando'}</div>
                  <div><strong>API Secret:</strong> {result.credentials?.apiSecretConfigured ? '✅ Configurada' : '❌ Faltando'}</div>
                  
                  {result.testCalculation && (
                    <div className="mt-3 p-3 bg-background rounded border">
                      <div className="font-medium mb-2">Teste de Cálculo SHIB:</div>
                      <div><strong>Stake:</strong> ${result.testCalculation.stake}</div>
                      <div><strong>Preço:</strong> ${result.testCalculation.price}</div>
                      <div><strong>Quantidade:</strong> {result.testCalculation.quantity.toLocaleString()} SHIB</div>
                      <div><strong>Valor da Ordem:</strong> ${result.testCalculation.orderValue.toFixed(2)}</div>
                      <div>
                        <strong>Mínimo OK:</strong> {result.testCalculation.minimumMet ? '✅ Sim' : '❌ Não'}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">❌ Erro</Badge>
                </div>
                
                <div className="text-sm">
                  <div><strong>Erro:</strong> {result.error}</div>
                  {result.details && <div><strong>Detalhes:</strong> {result.details}</div>}
                  
                  {result.hasApiKey !== undefined && (
                    <div className="mt-2">
                      <div>API Key: {result.hasApiKey ? '✅ Presente' : '❌ Faltando'}</div>
                      <div>API Secret: {result.hasApiSecret ? '✅ Presente' : '❌ Faltando'}</div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          Este teste verifica se as credenciais da Binance estão configuradas no Supabase.
        </div>
      </CardContent>
    </Card>
  );
}
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, ExternalLink, Copy, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ConnectivityValidator } from '@/services/connectivityValidator';
import { useToast } from '@/hooks/use-toast';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  data?: any;
}

export function BinanceApiSetup() {
  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: 'get-ip',
      title: '1. Obter IP Público do Supabase',
      description: 'Identificar o IP que precisa ser configurado na Binance',
      status: 'pending'
    },
    {
      id: 'configure-binance',
      title: '2. Configurar Whitelist na Binance',
      description: 'Adicionar o IP na configuração da API Key',
      status: 'pending'
    },
    {
      id: 'verify-permissions',
      title: '3. Verificar Permissões',
      description: 'Confirmar permissões necessárias na API Key',
      status: 'pending'
    },
    {
      id: 'test-connection',
      title: '4. Testar Conexão',
      description: 'Validar se a configuração está funcionando',
      status: 'pending'
    }
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [publicIp, setPublicIp] = useState<any>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const { toast } = useToast();

  const updateStepStatus = (stepId: string, status: SetupStep['status'], data?: any) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, data } : step
    ));
  };

  const getPublicIp = async () => {
    updateStepStatus('get-ip', 'in-progress');
    try {
      const { data, error } = await supabase.functions.invoke('get-public-ip');
      
      if (error) {
        updateStepStatus('get-ip', 'failed', { error: error.message });
        return null;
      }
      
      setPublicIp(data);
      updateStepStatus('get-ip', 'completed', data);
      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      updateStepStatus('get-ip', 'failed', { error: errorMsg });
      return null;
    }
  };

  const testConnection = async () => {
    updateStepStatus('test-connection', 'in-progress');
    try {
      const result = await ConnectivityValidator.validateAll();
      
      if (result.success) {
        updateStepStatus('test-connection', 'completed', result);
        updateStepStatus('configure-binance', 'completed');
        updateStepStatus('verify-permissions', 'completed');
        toast({
          title: "✅ Configuração Concluída",
          description: "API Binance configurada com sucesso!",
        });
      } else {
        updateStepStatus('test-connection', 'failed', result);
        toast({
          title: "❌ Teste Falhou",
          description: `Erros encontrados: ${result.errors.join(', ')}`,
          variant: "destructive",
        });
      }
      
      setLastCheck(new Date());
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      updateStepStatus('test-connection', 'failed', { error: errorMsg });
    }
  };

  const runFullSetup = async () => {
    setIsLoading(true);
    
    // Step 1: Get IP
    const ipData = await getPublicIp();
    
    if (ipData) {
      // Auto mark step 2 and 3 as in-progress (manual steps)
      updateStepStatus('configure-binance', 'in-progress');
      updateStepStatus('verify-permissions', 'in-progress');
      
      // Wait a bit before testing (give time for manual config)
      setTimeout(() => {
        testConnection();
      }, 2000);
    }
    
    setIsLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "IP copiado para a área de transferência",
    });
  };

  const getStepIcon = (status: SetupStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getBadgeVariant = (status: SetupStep['status']) => {
    switch (status) {
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      case 'in-progress': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          🔧 Configuração da API Binance
          <div className="flex gap-2">
            <Button 
              onClick={testConnection} 
              size="sm" 
              variant="outline"
              disabled={isLoading}
            >
              Testar Agora
            </Button>
            <Button 
              onClick={runFullSetup} 
              size="sm"
              disabled={isLoading}
            >
              {isLoading ? 'Configurando...' : 'Iniciar Configuração'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* IP Information */}
        {publicIp && (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                  🌐 IPs para Configurar na Binance
                </h4>
                {publicIp.ipResults?.map((result: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border">
                    <div className="flex items-center gap-3">
                      <code className="text-lg font-mono text-green-700 dark:text-green-300">
                        {result.ip}
                      </code>
                      <Badge variant="outline" className="text-xs">
                        {result.service}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(result.ip)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Setup Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="flex-shrink-0 mt-1">
                {getStepIcon(step.status)}
              </div>
              
              <div className="flex-grow">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{step.title}</h4>
                  <Badge variant={getBadgeVariant(step.status)}>
                    {step.status === 'pending' && 'Pendente'}
                    {step.status === 'in-progress' && 'Em Progresso'}
                    {step.status === 'completed' && 'Concluído'}
                    {step.status === 'failed' && 'Falhou'}
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {step.description}
                </p>

                {/* Step-specific content */}
                {step.id === 'configure-binance' && step.status !== 'pending' && (
                  <div className="text-sm space-y-2">
                    <p className="font-medium">📋 Instruções:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                      <li>Acesse <a href="https://www.binance.com/en/my/settings/api-management" target="_blank" className="text-blue-600 hover:underline inline-flex items-center gap-1">Binance API Management <ExternalLink className="h-3 w-3" /></a></li>
                      <li>Localize sua API Key atual</li>
                      <li>Clique em "Edit restrictions"</li>
                      <li>Adicione o(s) IP(s) listado(s) acima na whitelist</li>
                      <li>Salve as alterações</li>
                    </ol>
                  </div>
                )}

                {step.id === 'verify-permissions' && step.status !== 'pending' && (
                  <div className="text-sm space-y-2">
                    <p className="font-medium">🔑 Permissões Necessárias:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                      <li>✅ Read Info (Habilitado)</li>
                      <li>✅ Spot & Margin Trading (Habilitado)</li>
                      <li>❌ Futures (Desabilitado)</li>
                      <li>❌ Withdrawals (Desabilitado)</li>
                    </ul>
                  </div>
                )}

                {/* Error display */}
                {step.status === 'failed' && step.data?.error && (
                  <Alert variant="destructive" className="mt-3">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>Erro:</strong> {step.data.error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Success data */}
                {step.status === 'completed' && step.data && step.id === 'test-connection' && (
                  <Alert className="mt-3 border-green-200 bg-green-50 dark:bg-green-950">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>✅ Teste bem-sucedido!</strong> Sua API Binance está configurada corretamente.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Last check info */}
        {lastCheck && (
          <div className="text-xs text-muted-foreground text-center pt-4 border-t">
            Última verificação: {lastCheck.toLocaleString('pt-BR')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
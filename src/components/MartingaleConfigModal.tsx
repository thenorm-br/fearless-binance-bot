import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { MartingaleConfig } from '@/types/martingale';
import { useToast } from '@/hooks/use-toast';

interface MartingaleConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: MartingaleConfig;
  onSave: (config: MartingaleConfig) => void;
}

export function MartingaleConfigModal({ isOpen, onClose, config, onSave }: MartingaleConfigModalProps) {
  const [localConfig, setLocalConfig] = useState<MartingaleConfig>(config);
  const { toast } = useToast();

  const handleSave = () => {
    // Validate configuration
    if (localConfig.initialStake <= 0) {
      toast({
        title: "Erro de Configuração",
        description: "Stake inicial deve ser maior que 0",
        variant: "destructive"
      });
      return;
    }

    if (localConfig.galeFactor <= 1) {
      toast({
        title: "Erro de Configuração", 
        description: "Fator Gale deve ser maior que 1",
        variant: "destructive"
      });
      return;
    }

    if (localConfig.maxAttempts < 1 || localConfig.maxAttempts > 10) {
      toast({
        title: "Erro de Configuração",
        description: "Máximo de tentativas deve estar entre 1 e 10",
        variant: "destructive"
      });
      return;
    }

    if (localConfig.maxDailyLoss <= 0) {
      toast({
        title: "Erro de Configuração",
        description: "Limite de perda diária deve ser maior que 0",
        variant: "destructive"
      });
      return;
    }

    onSave(localConfig);
    onClose();
    toast({
      title: "Configuração Salva",
      description: "Configurações do Martingale atualizadas com sucesso"
    });
  };

  const updateConfig = (field: keyof MartingaleConfig, value: number) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações do Martingale Bot</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="initialStake">Stake Inicial (USDT)</Label>
            <Input
              id="initialStake"
              type="number"
              step="0.1"
              min="0.1"
              value={localConfig.initialStake}
              onChange={(e) => updateConfig('initialStake', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <Label htmlFor="galeFactor">Fator Gale (Multiplicador)</Label>
            <Input
              id="galeFactor"
              type="number"
              step="0.1"
              min="1.1"
              value={localConfig.galeFactor}
              onChange={(e) => updateConfig('galeFactor', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <Label htmlFor="maxAttempts">Máximo de Tentativas</Label>
            <Input
              id="maxAttempts"
              type="number"
              min="1"
              max="10"
              value={localConfig.maxAttempts}
              onChange={(e) => updateConfig('maxAttempts', parseInt(e.target.value) || 0)}
            />
          </div>

          <div>
            <Label htmlFor="minProbability">Probabilidade Mínima (%)</Label>
            <Input
              id="minProbability"
              type="number"
              min="50"
              max="95"
              value={localConfig.minProbability}
              onChange={(e) => updateConfig('minProbability', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <Label htmlFor="victoryCooldown">Cooldown Vitória (segundos)</Label>
            <Input
              id="victoryCooldown"
              type="number"
              min="5"
              max="300"
              value={localConfig.victoryCooldown / 1000}
              onChange={(e) => updateConfig('victoryCooldown', (parseInt(e.target.value) || 0) * 1000)}
            />
          </div>

          <div>
            <Label htmlFor="defeatCooldown">Cooldown Derrota (segundos)</Label>
            <Input
              id="defeatCooldown"
              type="number"
              min="10"
              max="600"
              value={localConfig.defeatCooldown / 1000}
              onChange={(e) => updateConfig('defeatCooldown', (parseInt(e.target.value) || 0) * 1000)}
            />
          </div>

          <div>
            <Label htmlFor="contractDuration">Duração do Contrato (segundos)</Label>
            <Input
              id="contractDuration"
              type="number"
              min="30"
              max="300"
              value={localConfig.contractDuration / 1000}
              onChange={(e) => updateConfig('contractDuration', (parseInt(e.target.value) || 0) * 1000)}
            />
          </div>

          <div>
            <Label htmlFor="maxDailyLoss">Limite de Perda Diária (USDT)</Label>
            <Input
              id="maxDailyLoss"
              type="number"
              step="1"
              min="1"
              value={localConfig.maxDailyLoss}
              onChange={(e) => updateConfig('maxDailyLoss', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
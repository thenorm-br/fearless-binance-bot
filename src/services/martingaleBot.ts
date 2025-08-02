import { supabase } from '@/integrations/supabase/client';
import { 
  MartingaleConfig, 
  MartingaleBotState, 
  MartingaleContract, 
  MartingaleCycle,
  MartingaleStats,
  TradingSignal 
} from '@/types/martingale';
import { technicalAnalysis, TechnicalAnalysisService } from './technicalAnalysis';
import { realBinanceApi } from './realBinanceApi';
import { ConnectivityValidator } from './connectivityValidator';

export class MartingaleBotService {
  private state: MartingaleBotState;
  private wsConnection: WebSocket | null = null;
  private statusInterval: NodeJS.Timeout | null = null;
  private contractCheckInterval: NodeJS.Timeout | null = null;
  private technicalAnalysis: TechnicalAnalysisService;

  constructor() {
    this.technicalAnalysis = technicalAnalysis;
    this.state = this.createInitialState();
  }

  private createInitialState(): MartingaleBotState {
    const defaultConfig: MartingaleConfig = {
      symbol: 'SHIBUSDT',
      initialStake: 5.0,
      galeFactor: 1.5,
      maxAttempts: 3,
      minProbability: 65.0,
      victoryCooldown: 120000, // 2 minutes in ms
      defeatCooldown: 600000, // 10 minutes in ms
      contractDuration: 1800000, // 30 minutes in ms
      maxDailyLoss: 20.0,
      capitalTotal: 100.0,
      maxRiskPerCycle: 35.0
    };

    const defaultStats: MartingaleStats = {
      totalCycles: 0,
      winCycles: 0,
      lossCycles: 0,
      totalProfit: 0,
      dailyProfit: 0,
      currentStreak: 0,
      maxWinStreak: 0,
      maxLossStreak: 0,
      currentAttempt: 0,
      currentCycleStake: 0,
      isInCooldown: false,
      isRunning: false,
      startBalance: 0,
      dailyLossLimit: defaultConfig.maxDailyLoss
    };

    return {
      config: defaultConfig,
      stats: defaultStats,
      priceHistory: this.technicalAnalysis.createPriceHistory(defaultConfig.symbol),
      emergencyStop: false
    };
  }

  async startBot(): Promise<void> {
    if (this.state.stats.isRunning) {
      throw new Error('Bot já está rodando');
    }

    console.log('🚀 Iniciando Martingale Bot SHIBUSDT');
    
    // Validate all requirements before starting
    const validation = await ConnectivityValidator.validateAll('SHIBUSDT', this.state.config.maxDailyLoss);
    
    if (!validation.success) {
      const errorMsg = `Falha nas validações: ${validation.errors.join(', ')}`;
      console.error('❌', errorMsg);
      await this.logBotActivity('VALIDATION_ERROR', { 
        errors: validation.errors,
        details: validation.details 
      }, 'error');
      throw new Error(errorMsg);
    }
    
    try {
      // Initialize daily tracking
      const balance = validation.details.balance || await this.getUsdtBalance();
      this.state.stats.startBalance = balance;
      this.state.stats.isRunning = true;
      this.state.emergencyStop = false;

      // Initialize price history with real data
      await this.initializePriceHistory();

      // Start WebSocket for real-time prices
      this.startWebSocket();
      
      // Start main trading loop
      this.startTradingLoop();

      // Log bot start
      await this.logBotActivity('BOT_STARTED', {
        symbol: this.state.config.symbol,
        startBalance: balance,
        config: this.state.config,
        validation: validation.details
      }, 'success');
      
    } catch (error) {
      this.state.stats.isRunning = false;
      await this.logBotActivity('BOT_START_ERROR', { error: error.message }, 'error');
      throw error;
    }
  }

  private async initializePriceHistory(): Promise<void> {
    try {
      // Get real price data from Binance to initialize history
      const prices = await realBinanceApi.getCurrentPrices([this.state.config.symbol]);
      if (prices.length > 0) {
        const currentPrice = prices[0].price;
        
        // Initialize with some historical-like data (simulate recent prices)
        for (let i = 49; i >= 0; i--) {
          const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
          const historicalPrice = currentPrice * (1 + variation * i * 0.1);
          this.technicalAnalysis.addPriceData(this.state.priceHistory, historicalPrice);
        }
        
        await this.logBotActivity('PRICE_HISTORY_INITIALIZED', { 
          dataPoints: this.state.priceHistory.prices.length,
          currentPrice 
        }, 'info');
      }
    } catch (error) {
      await this.logBotActivity('PRICE_HISTORY_ERROR', { error: error.message }, 'error');
    }
  }

  async stopBot(): Promise<void> {
    console.log('🛑 Parando Martingale Bot');
    
    this.state.stats.isRunning = false;
    
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }

    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }

    if (this.contractCheckInterval) {
      clearInterval(this.contractCheckInterval);
      this.contractCheckInterval = null;
    }

    await this.logBotActivity('BOT_STOPPED', {
      finalStats: this.state.stats
    });
  }

  private startWebSocket(): void {
    const wsUrl = `wss://stream.binance.com:9443/ws/shibusdt@ticker`;
    
    this.wsConnection = new WebSocket(wsUrl);

    this.wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const price = parseFloat(data.c);
        const volume = parseFloat(data.v);
        
        this.technicalAnalysis.addPriceData(this.state.priceHistory, price, volume);
      } catch (error) {
        console.error('Erro no WebSocket SHIB:', error);
      }
    };

    this.wsConnection.onclose = () => {
      console.log('WebSocket SHIB fechado');
      // Reconnect if bot is still running
      if (this.state.stats.isRunning) {
        setTimeout(() => this.startWebSocket(), 5000);
      }
    };

    this.wsConnection.onerror = (error) => {
      console.error('Erro WebSocket SHIB:', error);
    };
  }

  private startTradingLoop(): void {
    this.statusInterval = setInterval(async () => {
      if (!this.state.stats.isRunning || this.state.emergencyStop) {
        return;
      }

      try {
        await this.executeTradingCycle();
      } catch (error) {
        console.error('Erro no ciclo de trading:', error);
        await this.logBotActivity('ERROR', { error: error.message }, 'error');
      }
    }, 5000); // Check every 5 seconds

    // Start contract monitoring
    this.contractCheckInterval = setInterval(async () => {
      if (this.state.currentContract) {
        await this.checkContractResult();
      }
    }, 1000); // Check every second
  }

  private async executeTradingCycle(): Promise<void> {
    // Check daily loss limit
    if (await this.checkDailyLossLimit()) {
      this.state.emergencyStop = true;
      await this.stopBot();
      return;
    }

    // Check if in cooldown
    if (this.isInCooldown()) {
      return;
    }

    // Check if already has active contract
    if (this.state.currentContract) {
      return;
    }

    // Get trading signal
    const signal = this.technicalAnalysis.generateTradingSignal(this.state.priceHistory);
    this.state.lastSignal = signal;

    // Check if signal meets minimum probability
    if (signal.strength < this.state.config.minProbability) {
      return;
    }

    // Calculate next stake
    const nextStake = this.calculateNextStake();
    
    // Check balance
    const balance = await this.getUsdtBalance();
    if (balance < nextStake) {
      console.warn('⚠️ Saldo insuficiente para próximo trade');
      return;
    }

    // Execute trade
    await this.executeContract(signal, nextStake);
  }

  private async executeContract(signal: TradingSignal, stake: number): Promise<void> {
    const currentPrice = this.getCurrentPrice();
    if (!currentPrice) {
      console.error('Preço atual não disponível');
      return;
    }

    console.log(`🎯 Executando contrato SHIB: ${signal.type} | $${stake} | Prob: ${signal.strength}%`);

    try {
      // Place order through Edge Function
      const response = await supabase.functions.invoke('crypto-martingale-trade', {
        body: {
          symbol: this.state.config.symbol,
          side: signal.type,
          stake: stake,
          price: currentPrice
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const order = response.data;
      
      // Create contract
      const contract: MartingaleContract = {
        id: crypto.randomUUID(),
        symbol: this.state.config.symbol,
        side: signal.type,
        entryPrice: currentPrice,
        stake: stake,
        quantity: order.quantity,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.state.config.contractDuration,
        status: 'PENDING',
        attempt: this.state.stats.currentAttempt + 1
      };

      this.state.currentContract = contract;
      this.state.stats.currentAttempt += 1;
      this.state.stats.currentCycleStake += stake;

      // Create or update cycle
      if (!this.state.currentCycle) {
        this.state.currentCycle = {
          id: crypto.randomUUID(),
          symbol: this.state.config.symbol,
          startTime: Date.now(),
          totalStake: stake,
          finalProfit: 0,
          attempts: 1,
          status: 'ACTIVE',
          contracts: [contract]
        };
      } else {
        this.state.currentCycle.contracts.push(contract);
        this.state.currentCycle.totalStake += stake;
        this.state.currentCycle.attempts += 1;
      }

      await this.logBotActivity('CONTRACT_CREATED', { contract });

    } catch (error) {
      console.error('Erro ao executar contrato:', error);
      await this.logBotActivity('CONTRACT_ERROR', { error: error.message, signal, stake }, 'error');
    }
  }

  private async checkContractResult(): Promise<void> {
    if (!this.state.currentContract) {
      return;
    }

    const contract = this.state.currentContract;
    const now = Date.now();

    // Check if contract expired
    if (now >= contract.expiresAt) {
      const currentPrice = this.getCurrentPrice();
      if (!currentPrice) {
        console.error('Não foi possível obter preço final do contrato');
        return;
      }

      // Determine win/loss
      const isWin = contract.side === 'BUY' 
        ? currentPrice > contract.entryPrice 
        : currentPrice < contract.entryPrice;

      contract.finalPrice = currentPrice;
      contract.status = isWin ? 'WIN' : 'LOSS';

      if (isWin) {
        contract.profit = contract.stake * 0.85; // 85% profit
        await this.handleContractWin(contract);
      } else {
        contract.profit = -contract.stake;
        await this.handleContractLoss(contract);
      }

      this.state.currentContract = undefined;
      await this.logBotActivity('CONTRACT_COMPLETED', { contract });
    }
  }

  private async handleContractWin(contract: MartingaleContract): Promise<void> {
    const profit = contract.profit!;
    
    this.state.stats.winCycles += 1;
    this.state.stats.totalProfit += profit;
    this.state.stats.dailyProfit += profit;
    this.state.stats.currentStreak = Math.max(0, this.state.stats.currentStreak + 1);
    this.state.stats.maxWinStreak = Math.max(this.state.stats.maxWinStreak, this.state.stats.currentStreak);

    console.log(`🎉 VITÓRIA SHIB! Lucro: $${profit.toFixed(2)} | Total: $${this.state.stats.totalProfit.toFixed(2)}`);

    // Complete cycle
    if (this.state.currentCycle) {
      this.state.currentCycle.status = 'WIN';
      this.state.currentCycle.endTime = Date.now();
      this.state.currentCycle.finalProfit = profit;
      this.state.stats.totalCycles += 1;
    }

    this.resetMartingaleCycle();
    this.startCooldown(this.state.config.victoryCooldown);

    await this.logBotActivity('CYCLE_WIN', { profit, cycle: this.state.currentCycle }, 'success');
  }

  private async handleContractLoss(contract: MartingaleContract): Promise<void> {
    const loss = Math.abs(contract.profit!);
    
    this.state.stats.lossCycles += 1;
    this.state.stats.totalProfit -= loss;
    this.state.stats.dailyProfit -= loss;
    this.state.stats.currentStreak = Math.min(0, this.state.stats.currentStreak - 1);
    this.state.stats.maxLossStreak = Math.max(this.state.stats.maxLossStreak, Math.abs(this.state.stats.currentStreak));

    console.log(`💔 DERROTA SHIB! Perda: $${loss.toFixed(2)} | Total: $${this.state.stats.totalProfit.toFixed(2)}`);

    // Check if reached max attempts
    if (this.state.stats.currentAttempt >= this.state.config.maxAttempts) {
      if (this.state.currentCycle) {
        this.state.currentCycle.status = 'LOSS';
        this.state.currentCycle.endTime = Date.now();
        this.state.currentCycle.finalProfit = -this.state.currentCycle.totalStake;
                this.state.stats.totalCycles += 1;
      }

      console.log(`🛑 Ciclo completo. Perda total: $${this.state.stats.currentCycleStake.toFixed(2)}`);
      this.resetMartingaleCycle();
      this.startCooldown(this.state.config.defeatCooldown);

      await this.logBotActivity('CYCLE_LOSS', { totalLoss: this.state.stats.currentCycleStake });
    }
  }

  private resetMartingaleCycle(): void {
    this.state.stats.currentAttempt = 0;
    this.state.stats.currentCycleStake = 0;
    this.state.currentCycle = undefined;
  }

  private startCooldown(milliseconds: number): void {
    this.state.stats.isInCooldown = true;
    this.state.stats.cooldownUntil = Date.now() + milliseconds;
    console.log(`⏸️ Cooldown iniciado: ${Math.round(milliseconds/1000)}s`);
  }

  private isInCooldown(): boolean {
    if (!this.state.stats.isInCooldown || !this.state.stats.cooldownUntil) {
      return false;
    }

    if (Date.now() >= this.state.stats.cooldownUntil) {
      this.state.stats.isInCooldown = false;
      this.state.stats.cooldownUntil = undefined;
      console.log('▶️ Cooldown finalizado');
      return false;
    }

    return true;
  }

  private calculateNextStake(): number {
    if (this.state.stats.currentAttempt === 0) {
      return this.state.config.initialStake;
    }

    const nextStake = this.state.config.initialStake * Math.pow(this.state.config.galeFactor, this.state.stats.currentAttempt);
    
    // Check risk limits
    const totalCycleRisk = this.state.stats.currentCycleStake + nextStake;
    const maxCycleRisk = this.state.config.capitalTotal * (this.state.config.maxRiskPerCycle / 100);

    if (totalCycleRisk > maxCycleRisk) {
      console.warn('⚠️ Risco do ciclo excederia limite');
      return Math.max(0, maxCycleRisk - this.state.stats.currentCycleStake);
    }

    return nextStake;
  }

  private async checkDailyLossLimit(): Promise<boolean> {
    const currentBalance = await this.getUsdtBalance();
    const dailyLoss = this.state.stats.startBalance - currentBalance;

    if (dailyLoss >= this.state.config.maxDailyLoss) {
      console.error(`🛑 STOP LOSS DIÁRIO ATINGIDO! Perda: $${dailyLoss.toFixed(2)}`);
      await this.logBotActivity('DAILY_STOP_LOSS', { dailyLoss, startBalance: this.state.stats.startBalance });
      return true;
    }

    return false;
  }

  private getCurrentPrice(): number | null {
    const prices = this.state.priceHistory.prices;
    return prices.length > 0 ? prices[prices.length - 1] : null;
  }

  private async getUsdtBalance(): Promise<number> {
    try {
      const balances = await realBinanceApi.getAccountBalances();
      const usdtBalance = balances.find(b => b.asset === 'USDT');
      return usdtBalance ? parseFloat(usdtBalance.free) : 0;
    } catch (error) {
      console.error('Erro ao obter saldo USDT:', error);
      return 0;
    }
  }

  private async logBotActivity(type: string, data: any, level: 'info' | 'warn' | 'error' | 'debug' | 'success' = 'info'): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('bot_logs').insert({
          user_id: user.id,
          level,
          message: `Martingale Bot: ${type}`,
          data: { type, ...data }
        });
        
        // Also log to console for debugging
        console.log(`[Martingale Bot ${level.toUpperCase()}] ${type}`, data);
      }
    } catch (error) {
      console.error('Erro ao salvar log:', error);
    }
  }

  // Public getters
  getState(): MartingaleBotState {
    return { ...this.state };
  }

  getStats(): MartingaleStats {
    return { ...this.state.stats };
  }

  getConfig(): MartingaleConfig {
    return { ...this.state.config };
  }

  async updateConfig(newConfig: Partial<MartingaleConfig>): Promise<void> {
    this.state.config = { ...this.state.config, ...newConfig };
    await this.logBotActivity('CONFIG_UPDATED', { newConfig });
  }

  isRunning(): boolean {
    return this.state.stats.isRunning;
  }

  getCurrentPricePublic(): number | null {
    return this.getCurrentPrice();
  }

  getLastSignal(): TradingSignal | undefined {
    return this.state.lastSignal;
  }

  getRemainingCooldown(): number {
    if (!this.state.stats.isInCooldown || !this.state.stats.cooldownUntil) {
      return 0;
    }
    return Math.max(0, this.state.stats.cooldownUntil - Date.now());
  }
}

export const martingaleBot = new MartingaleBotService();
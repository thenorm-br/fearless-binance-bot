import heroImage from '@/assets/trading-hero.jpg';

export function TradingHero() {
  return (
    <div 
      className="relative h-32 md:h-48 bg-cover bg-center bg-no-repeat rounded-lg overflow-hidden shadow-card"
      style={{ backgroundImage: `url(${heroImage})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-background/20" />
      <div className="relative h-full flex items-center p-6">
        <div className="max-w-md">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Binance Trading Bot
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Automated Grid Trading & Risk Management System
          </p>
        </div>
      </div>
    </div>
  );
}
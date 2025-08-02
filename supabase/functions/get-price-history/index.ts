import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, interval = '1m', limit = 50 } = await req.json();
    
    if (!symbol) {
      throw new Error('Symbol is required');
    }

    // Get kline/candlestick data from Binance
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const klineData = await response.json();
    
    // Format data for our application
    const priceHistory = {
      symbol,
      prices: klineData.map((kline: any) => parseFloat(kline[4])), // Close prices
      volumes: klineData.map((kline: any) => parseFloat(kline[5])), // Volumes
      timestamps: klineData.map((kline: any) => parseInt(kline[0])), // Timestamps
      maxHistory: limit
    };

    console.log(`Fetched ${priceHistory.prices.length} price points for ${symbol}`);

    return new Response(JSON.stringify({ data: priceHistory }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-price-history:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
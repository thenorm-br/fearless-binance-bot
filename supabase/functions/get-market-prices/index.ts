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
    const { symbols } = await req.json();
    
    // Get 24hr ticker statistics
    let url = 'https://api.binance.com/api/v3/ticker/24hr';
    if (symbols && symbols.length > 0) {
      url += `?symbols=${JSON.stringify(symbols)}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const tickerData = await response.json();
    
    // Format data for our application
    const priceData = (Array.isArray(tickerData) ? tickerData : [tickerData]).map((ticker: any) => ({
      symbol: ticker.symbol,
      price: parseFloat(ticker.lastPrice),
      change24h: parseFloat(ticker.priceChangePercent),
      volume24h: parseFloat(ticker.volume),
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
      timestamp: Date.now()
    }));

    console.log(`Fetched prices for ${priceData.length} symbols`);

    return new Response(JSON.stringify({ data: priceData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-market-prices:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
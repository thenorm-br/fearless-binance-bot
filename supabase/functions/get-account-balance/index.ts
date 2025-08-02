import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      console.error('Unauthorized access attempt');
      throw new Error('Unauthorized');
    }

    console.log(`Fetching account balance for user: ${user.id}`);

    const binanceApiKey = Deno.env.get('BINANCE_API_KEY');
    const binanceSecret = Deno.env.get('BINANCE_SECRET_KEY');

    if (!binanceApiKey || !binanceSecret) {
      console.error('Binance API keys not configured');
      throw new Error('Binance API keys not configured');
    }

    console.log('Binance API keys found, creating signature...');

    // Create signature for Binance API
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(binanceSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(queryString)
    );
    
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    console.log('Signature created, calling Binance API...');

    // Call Binance API
    const response = await fetch(
      `https://api.binance.com/api/v3/account?${queryString}&signature=${signatureHex}`,
      {
        headers: {
          'X-MBX-APIKEY': binanceApiKey,
        },
      }
    );

    console.log(`Binance API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Binance API error: ${response.status} - ${errorText}`);
      throw new Error(`Binance API error: ${response.status} - ${errorText}`);
    }

    const accountData = await response.json();
    console.log(`Account data received. Balances count: ${accountData.balances?.length || 0}`);

    // Get current prices for USD conversion
    const pricesResponse = await fetch('https://api.binance.com/api/v3/ticker/price');
    const pricesData = await pricesResponse.json();
    const priceMap = new Map();
    
    pricesData.forEach((price: any) => {
      priceMap.set(price.symbol, parseFloat(price.price));
    });
    
    console.log(`Price data loaded for ${pricesData.length} symbols`);

    // Update account balances in database with USD conversion
    const balances = accountData.balances
      .filter((balance: any) => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0)
      .map((balance: any) => {
        const total = parseFloat(balance.free) + parseFloat(balance.locked);
        let usdValue = 0;
        
        // Calculate USD value
        if (balance.asset === 'USDT' || balance.asset === 'BUSD' || balance.asset === 'USDC') {
          usdValue = total; // Stablecoins are 1:1 with USD
        } else {
          // Try to find price in USDT pair first, then BTC pair
          const usdtSymbol = `${balance.asset}USDT`;
          const btcSymbol = `${balance.asset}BTC`;
          
          if (priceMap.has(usdtSymbol)) {
            usdValue = total * priceMap.get(usdtSymbol);
          } else if (priceMap.has(btcSymbol) && priceMap.has('BTCUSDT')) {
            const btcPrice = priceMap.get(btcSymbol);
            const btcUsdPrice = priceMap.get('BTCUSDT');
            usdValue = total * btcPrice * btcUsdPrice;
          }
        }
        
        console.log(`Asset: ${balance.asset}, Total: ${total}, USD Value: ${usdValue}`);
        
        return {
          user_id: user.id,
          asset: balance.asset,
          free: parseFloat(balance.free),
          locked: parseFloat(balance.locked),
          total: total,
          usd_value: usdValue,
          last_updated: new Date().toISOString()
        };
      });

    // Upsert balances
    for (const balance of balances) {
      await supabaseClient
        .from('account_balances')
        .upsert(balance, { onConflict: 'user_id,asset' });
    }

    console.log(`Updated ${balances.length} account balances for user ${user.id}`);

    return new Response(JSON.stringify({ balances }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-account-balance:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
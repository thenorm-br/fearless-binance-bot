import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TradeRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  stake: number;
  price: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { symbol, side, stake, price }: TradeRequest = await req.json();

    console.log(`Crypto Martingale Trade: ${side} ${symbol} $${stake} @ $${price}`);

    // Get Binance API credentials
    const apiKey = Deno.env.get('BINANCE_API_KEY');
    const apiSecret = Deno.env.get('BINANCE_SECRET_KEY');

    console.log('API Key configured:', !!apiKey);
    console.log('API Secret configured:', !!apiSecret);

    if (!apiKey || !apiSecret) {
      console.error('Missing Binance credentials');
      throw new Error('Binance API credentials not configured. Please add BINANCE_API_KEY and BINANCE_SECRET_KEY to Supabase secrets.');
    }

    // Calculate quantity based on stake amount
    let quantity = stake / price;
    
    // For SHIB, handle proper decimal precision
    if (symbol === 'SHIBUSDT') {
      // SHIB minimum order on Binance is typically 1 USDT
      // SHIB uses whole numbers for quantity, no decimals
      quantity = Math.round(quantity); // Round to whole SHIB tokens
      
      // Ensure minimum 1 USDT worth of SHIB
      if (quantity * price < 1.0) {
        quantity = Math.ceil(1.0 / price); // At least 1 USDT worth
      }
    } else {
      quantity = parseFloat(quantity.toFixed(8)); // Standard crypto precision
    }
    
    console.log(`Calculated quantity: ${quantity} ${symbol} for stake $${stake} at price $${price}`);
    console.log(`Order value: $${(quantity * price).toFixed(2)} USDT`);
    
    if (quantity <= 0 || (quantity * price) < 1.0) {
      throw new Error(`Invalid quantity calculated: ${quantity} for ${symbol}. Order value: $${(quantity * price).toFixed(2)} (min: $1.00)`);
    }

    // Create timestamp and signature for Binance API
    const timestamp = Date.now();
    const params = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
    
    // Create HMAC signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(params));
    const hexSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Place order on Binance (MAINNET)
    const binanceResponse = await fetch(
      `https://api.binance.com/api/v3/order?${params}&signature=${hexSignature}`,
      {
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const orderResult = await binanceResponse.json();

    if (!binanceResponse.ok) {
      console.error('Binance API error:', orderResult);
      throw new Error(orderResult.msg || 'Failed to place order');
    }

    console.log(`${symbol} order placed successfully:`, orderResult.orderId);

    // Log trade to database
    try {
      await supabaseClient.from('trades').insert({
        user_id: user.id,
        symbol: symbol,
        side: side,
        quantity: quantity,
        price: price,
        total_amount: stake,
        order_id: orderResult.orderId,
        status: 'COMPLETED'
      });

      // Log bot activity
      await supabaseClient.from('bot_logs').insert({
        user_id: user.id,
        level: 'info',
        message: `${symbol} Martingale trade executed: ${side} ${quantity} @ $${price}`,
        data: {
          type: 'MARTINGALE_TRADE',
          symbol,
          side,
          quantity,
          price,
          stake,
          orderId: orderResult.orderId
        }
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Don't fail the trade if DB logging fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: orderResult.orderId,
        symbol: symbol,
        side: side,
        quantity: quantity,
        price: price,
        stake: stake
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Crypto Martingale trade error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
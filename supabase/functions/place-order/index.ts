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
    if (!user) throw new Error('Unauthorized');

    const { symbol, side, type, quantity, price, timeInForce = 'GTC' } = await req.json();

    const binanceApiKey = Deno.env.get('BINANCE_API_KEY');
    const binanceSecret = Deno.env.get('BINANCE_SECRET_KEY');

    if (!binanceApiKey || !binanceSecret) {
      throw new Error('Binance API keys not configured');
    }

    // Create query parameters
    const timestamp = Date.now();
    const params = new URLSearchParams({
      symbol,
      side,
      type,
      quantity: quantity.toString(),
      timestamp: timestamp.toString(),
      timeInForce
    });

    if (type === 'LIMIT') {
      params.append('price', price.toString());
    }

    const queryString = params.toString();

    // Create signature
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

    // Place order on Binance
    const response = await fetch(
      `https://api.binance.com/api/v3/order?${queryString}&signature=${signatureHex}`,
      {
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': binanceApiKey,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Binance API error: ${response.status} - ${errorData}`);
    }

    const orderData = await response.json();

    // Log the trade
    await supabaseClient.from('trades').insert({
      user_id: user.id,
      symbol: orderData.symbol,
      side: orderData.side,
      quantity: parseFloat(orderData.executedQty || orderData.origQty),
      price: parseFloat(orderData.price || orderData.fills?.[0]?.price || '0'),
      total_amount: parseFloat(orderData.cummulativeQuoteQty || '0'),
      order_id: orderData.orderId.toString(),
      status: orderData.status,
      executed_at: new Date().toISOString()
    });

    // Add to active orders if not filled
    if (orderData.status !== 'FILLED') {
      await supabaseClient.from('active_orders').insert({
        user_id: user.id,
        symbol: orderData.symbol,
        order_id: orderData.orderId.toString(),
        side: orderData.side,
        type: orderData.type,
        quantity: parseFloat(orderData.origQty),
        price: parseFloat(orderData.price || '0'),
        status: orderData.status
      });
    }

    // Log the action
    await supabaseClient.from('bot_logs').insert({
      user_id: user.id,
      level: 'INFO',
      message: `${side} order placed for ${symbol}`,
      data: { orderData }
    });

    console.log(`Order placed successfully for user ${user.id}: ${orderData.orderId}`);

    return new Response(JSON.stringify({ order: orderData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in place-order:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
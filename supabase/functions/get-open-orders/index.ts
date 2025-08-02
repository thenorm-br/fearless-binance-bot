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

    const binanceApiKey = Deno.env.get('BINANCE_API_KEY');
    const binanceSecret = Deno.env.get('BINANCE_SECRET_KEY');

    if (!binanceApiKey || !binanceSecret) {
      throw new Error('Binance API keys not configured');
    }

    const { symbol } = await req.json();

    // Create signature for Binance API
    const timestamp = Date.now();
    let queryString = `timestamp=${timestamp}`;
    if (symbol) {
      queryString = `symbol=${symbol}&${queryString}`;
    }
    
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

    // Get open orders from Binance
    const response = await fetch(
      `https://api.binance.com/api/v3/openOrders?${queryString}&signature=${signatureHex}`,
      {
        headers: {
          'X-MBX-APIKEY': binanceApiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const ordersData = await response.json();

    // Update our active orders table
    const activeOrders = ordersData.map((order: any) => ({
      user_id: user.id,
      symbol: order.symbol,
      order_id: order.orderId.toString(),
      side: order.side,
      type: order.type,
      quantity: parseFloat(order.origQty),
      price: parseFloat(order.price),
      status: order.status,
      updated_at: new Date().toISOString()
    }));

    // Sync with database
    for (const order of activeOrders) {
      await supabaseClient
        .from('active_orders')
        .upsert(order, { onConflict: 'user_id,order_id' });
    }

    console.log(`Synced ${activeOrders.length} open orders for user ${user.id}`);

    return new Response(JSON.stringify({ orders: ordersData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-open-orders:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
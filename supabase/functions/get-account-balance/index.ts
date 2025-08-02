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

    // Call Binance API
    const response = await fetch(
      `https://api.binance.com/api/v3/account?${queryString}&signature=${signatureHex}`,
      {
        headers: {
          'X-MBX-APIKEY': binanceApiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const accountData = await response.json();

    // Update account balances in database
    const balances = accountData.balances
      .filter((balance: any) => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0)
      .map((balance: any) => ({
        user_id: user.id,
        asset: balance.asset,
        free: parseFloat(balance.free),
        locked: parseFloat(balance.locked),
        total: parseFloat(balance.free) + parseFloat(balance.locked),
        usd_value: 0, // Will be calculated separately
        last_updated: new Date().toISOString()
      }));

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
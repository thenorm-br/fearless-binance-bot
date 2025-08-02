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
    console.log('Testing Binance API connection...');

    const binanceApiKey = Deno.env.get('BINANCE_API_KEY');
    const binanceSecret = Deno.env.get('BINANCE_SECRET_KEY');

    if (!binanceApiKey || !binanceSecret) {
      const errorMsg = 'Binance API keys not configured';
      console.error(errorMsg);
      return new Response(JSON.stringify({ 
        success: false, 
        error: errorMsg,
        details: {
          hasApiKey: !!binanceApiKey,
          hasSecret: !!binanceSecret
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('API keys found, testing connection...');

    // Test 1: Check server time (no auth required)
    console.log('Test 1: Checking server time...');
    const timeResponse = await fetch('https://api.binance.com/api/v3/time');
    if (!timeResponse.ok) {
      throw new Error(`Binance server time check failed: ${timeResponse.status}`);
    }
    const timeData = await timeResponse.json();
    console.log('Server time check successful:', timeData);

    // Test 2: Check account info with authentication
    console.log('Test 2: Testing authenticated request...');
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

    const accountResponse = await fetch(
      `https://api.binance.com/api/v3/account?${queryString}&signature=${signatureHex}`,
      {
        headers: {
          'X-MBX-APIKEY': binanceApiKey,
        },
      }
    );

    let accountResult = {};
    if (accountResponse.ok) {
      const accountData = await accountResponse.json();
      accountResult = {
        success: true,
        balanceCount: accountData.balances?.length || 0,
        nonZeroBalances: accountData.balances?.filter((b: any) => 
          parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
        ).length || 0
      };
      console.log('Account check successful:', accountResult);
    } else {
      const errorText = await accountResponse.text();
      console.error(`Account check failed: ${accountResponse.status} - ${errorText}`);
      accountResult = {
        success: false,
        status: accountResponse.status,
        error: errorText
      };
    }

    return new Response(JSON.stringify({
      success: true,
      serverTime: timeData,
      accountTest: accountResult,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in test-binance-connection:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
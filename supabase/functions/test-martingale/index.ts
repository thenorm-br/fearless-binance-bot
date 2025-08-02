import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Testing Martingale Trade Function...');

    // Test credentials
    const apiKey = Deno.env.get('BINANCE_API_KEY');
    const apiSecret = Deno.env.get('BINANCE_SECRET_KEY');
    
    console.log('API Key exists:', !!apiKey);
    console.log('API Secret exists:', !!apiSecret);
    console.log('API Key length:', apiKey?.length || 0);
    console.log('API Secret length:', apiSecret?.length || 0);

    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ 
          error: 'Binance API credentials not configured',
          details: 'BINANCE_API_KEY and BINANCE_SECRET_KEY must be set in Supabase secrets',
          hasApiKey: !!apiKey,
          hasApiSecret: !!apiSecret
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Test a simple calculation
    const testData = {
      symbol: 'SHIBUSDT',
      stake: 5,
      price: 0.00001211
    };

    const quantity = Math.round(testData.stake / testData.price);
    const orderValue = quantity * testData.price;

    console.log('Test calculation:');
    console.log('- Stake:', testData.stake);
    console.log('- Price:', testData.price);
    console.log('- Quantity:', quantity);
    console.log('- Order Value:', orderValue);

    return new Response(
      JSON.stringify({
        success: true,
        credentials: {
          apiKeyConfigured: true,
          apiSecretConfigured: true,
          apiKeyLength: apiKey.length,
          apiSecretLength: apiSecret.length
        },
        testCalculation: {
          ...testData,
          quantity,
          orderValue,
          minimumMet: orderValue >= 1.0
        },
        message: 'Credentials are configured correctly'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Test error:', error);
    
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
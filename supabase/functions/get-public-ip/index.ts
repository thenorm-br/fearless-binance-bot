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
    console.log('Getting public IP...');

    // Verificar IP usando múltiplos serviços
    const ipServices = [
      'https://api.ipify.org?format=json',
      'https://httpbin.org/ip',
      'https://api.myip.com'
    ];

    const ipResults = [];

    for (const service of ipServices) {
      try {
        console.log(`Checking IP from: ${service}`);
        const response = await fetch(service);
        const data = await response.json();
        
        let ip = '';
        if (data.ip) {
          ip = data.ip;
        } else if (data.origin) {
          ip = data.origin;
        }
        
        if (ip) {
          ipResults.push({ service, ip });
          console.log(`IP from ${service}: ${ip}`);
        }
      } catch (error) {
        console.error(`Error getting IP from ${service}:`, error);
      }
    }

    // Também verificar headers da requisição
    const headers = {
      'x-forwarded-for': req.headers.get('x-forwarded-for'),
      'x-real-ip': req.headers.get('x-real-ip'),
      'cf-connecting-ip': req.headers.get('cf-connecting-ip'),
      'x-client-ip': req.headers.get('x-client-ip')
    };

    console.log('Request headers:', headers);

    return new Response(JSON.stringify({
      success: true,
      ipResults,
      headers,
      timestamp: new Date().toISOString(),
      message: 'Use o IP mais consistente para configurar na Binance'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-public-ip:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
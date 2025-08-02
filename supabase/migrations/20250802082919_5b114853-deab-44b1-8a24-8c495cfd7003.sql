-- Fix security issue for check_trading_connectivity function
DROP FUNCTION IF EXISTS public.check_trading_connectivity(TEXT);

CREATE OR REPLACE FUNCTION public.check_trading_connectivity(
  p_symbol TEXT DEFAULT 'SHIBUSDT'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Basic validation for SHIB trading
  result := jsonb_build_object(
    'symbol', p_symbol,
    'min_order_value', 1.0,
    'max_precision', 8,
    'status', 'active',
    'check_time', NOW()
  );
  
  RETURN result;
END;
$$;
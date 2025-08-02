-- Fix the bot_logs level constraint to allow proper log levels
ALTER TABLE public.bot_logs DROP CONSTRAINT IF EXISTS bot_logs_level_check;

-- Add the correct constraint with proper log levels
ALTER TABLE public.bot_logs ADD CONSTRAINT bot_logs_level_check 
CHECK (level IN ('info', 'warn', 'error', 'debug', 'success'));

-- Also ensure the table has proper indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bot_logs_user_id_created_at ON public.bot_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_logs_level ON public.bot_logs(level);
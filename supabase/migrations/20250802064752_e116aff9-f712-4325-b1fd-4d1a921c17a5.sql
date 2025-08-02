-- Add unique constraint to account_balances to prevent conflicts
ALTER TABLE account_balances ADD CONSTRAINT unique_user_asset UNIQUE (user_id, asset);
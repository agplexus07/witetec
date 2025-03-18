/*
  # Add PIX expiration tracking

  1. Changes
    - Add expiration tracking to transactions table
    - Add expired status to transaction status options
    - Add function to automatically update expired transactions
*/

-- Add expires_at column to transactions
ALTER TABLE transactions 
ADD COLUMN expires_at TIMESTAMPTZ;

-- Update status check constraint to include expired status
ALTER TABLE transactions 
DROP CONSTRAINT transactions_status_check,
ADD CONSTRAINT transactions_status_check 
CHECK (status IN ('pending', 'completed', 'failed', 'chargeback', 'expired'));

-- Create function to update expired transactions
CREATE OR REPLACE FUNCTION update_expired_transactions()
RETURNS void AS $$
BEGIN
  UPDATE transactions
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a cron job to run every minute (requires pg_cron extension)
-- Note: This needs to be executed by a superuser or rds_superuser
-- SELECT cron.schedule('update_expired_transactions', '* * * * *', 'SELECT update_expired_transactions()');
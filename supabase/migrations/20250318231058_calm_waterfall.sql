/*
  # Add updated_at column to transactions table

  1. Changes
    - Add updated_at column to transactions table
    - Add trigger to automatically update the column
*/

-- Add updated_at column
ALTER TABLE transactions
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

-- Add trigger for updated_at
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
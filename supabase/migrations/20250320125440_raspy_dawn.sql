/*
  # Fix Merchant RLS Policies

  1. Changes
    - Drop existing merchant policies
    - Create new policies with proper update permissions
    - Add function to handle merchant status updates
    - Fix automatic field updates

  2. Security
    - Maintain basic security while allowing proper field updates
    - Ensure admin access is preserved
    - Allow merchants to view their own data
*/

-- Drop existing merchant policies
DROP POLICY IF EXISTS "Merchants can view own data" ON merchants;

-- Create new merchant policies
CREATE POLICY "Merchants can view and update own data"
  ON merchants
  FOR ALL
  TO authenticated
  USING (
    auth.uid()::text = id::text
    OR 
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid()::text = id::text
    OR 
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- Create function to handle merchant status updates
CREATE OR REPLACE FUNCTION handle_merchant_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o status for alterado para 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.can_generate_api_key := TRUE;
    NEW.can_withdraw := TRUE;
  -- Se o status for alterado para 'rejected'
  ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    NEW.can_generate_api_key := FALSE;
    NEW.can_withdraw := FALSE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS merchant_status_update_trigger ON merchants;

-- Create new trigger
CREATE TRIGGER merchant_status_update_trigger
  BEFORE UPDATE OF status
  ON merchants
  FOR EACH ROW
  EXECUTE FUNCTION handle_merchant_status_update();

-- Create function to update merchant capabilities
CREATE OR REPLACE FUNCTION update_merchant_capabilities(
  merchant_id uuid,
  can_generate_api_key boolean,
  can_withdraw boolean
) RETURNS void AS $$
BEGIN
  UPDATE merchants
  SET 
    can_generate_api_key = $2,
    can_withdraw = $3,
    updated_at = NOW()
  WHERE id = $1;
END;
$$ LANGUAGE plpgsql;
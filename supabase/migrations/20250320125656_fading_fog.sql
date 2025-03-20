/*
  # Fix merchant capabilities update

  1. Changes
    - Remove automatic reversion of capability fields
    - Allow manual updates to persist
    - Keep status-based updates only for initial approval/rejection
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS merchant_status_update_trigger ON merchants;
DROP FUNCTION IF EXISTS handle_merchant_status_update();

-- Create new function with improved logic
CREATE OR REPLACE FUNCTION handle_merchant_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Só atualizar capabilities se for a primeira mudança para approved/rejected
  IF NEW.status != OLD.status THEN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
      -- Primeira aprovação
      IF OLD.can_generate_api_key = FALSE AND OLD.can_withdraw = FALSE THEN
        NEW.can_generate_api_key := TRUE;
        NEW.can_withdraw := TRUE;
      END IF;
    ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
      -- Primeira rejeição
      NEW.can_generate_api_key := FALSE;
      NEW.can_withdraw := FALSE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger that only fires on status change
CREATE TRIGGER merchant_status_update_trigger
  BEFORE UPDATE OF status
  ON merchants
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION handle_merchant_status_update();

-- Update existing merchants that should have capabilities
UPDATE merchants
SET 
  can_generate_api_key = TRUE,
  can_withdraw = TRUE
WHERE 
  status = 'approved' 
  AND (can_generate_api_key = FALSE OR can_withdraw = FALSE);
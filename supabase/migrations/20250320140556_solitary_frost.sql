/*
  # Fix merchant status trigger and document verification

  1. Changes
    - Drop and recreate merchant status trigger
    - Update document verification logic
    - Fix status update handling

  2. Security
    - Maintain existing security policies
    - Ensure proper status transitions
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS merchant_status_update_trigger ON merchants;
DROP FUNCTION IF EXISTS handle_merchant_status_update();

-- Create new function with fixed logic
CREATE OR REPLACE FUNCTION handle_merchant_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar campos de verificação quando o status muda para approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.documents_verified := TRUE;
    NEW.documents_verified_at := NOW();
    NEW.documents_verified_by := auth.uid();
    NEW.documents_status := 'approved';
  -- Limpar campos de verificação quando o status muda para rejected
  ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    NEW.documents_verified := FALSE;
    NEW.documents_verified_at := NULL;
    NEW.documents_verified_by := NULL;
    NEW.documents_status := 'rejected';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER merchant_status_update_trigger
  BEFORE UPDATE OF status
  ON merchants
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION handle_merchant_status_update();

-- Update existing merchants to ensure consistency
UPDATE merchants
SET 
  documents_verified = (status = 'approved'),
  documents_verified_at = CASE WHEN status = 'approved' THEN NOW() ELSE NULL END,
  documents_status = status
WHERE status IN ('approved', 'rejected');
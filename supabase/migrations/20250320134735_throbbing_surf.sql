/*
  # Fix document status logic

  1. Changes
    - Add function to properly check document status
    - Update merchants table to include documents_status
    - Add trigger to automatically update documents_status
*/

-- Add documents_status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'merchants' AND column_name = 'documents_status'
  ) THEN
    ALTER TABLE merchants ADD COLUMN documents_status text DEFAULT 'pending';
  END IF;
END $$;

-- Function to check document status
CREATE OR REPLACE FUNCTION check_documents_status(doc_urls jsonb)
RETURNS text AS $$
DECLARE
  doc record;
  all_approved boolean := true;
  any_rejected boolean := false;
BEGIN
  -- Se não há documentos, retorna pending
  IF doc_urls IS NULL OR doc_urls = '{}'::jsonb THEN
    RETURN 'pending';
  END IF;

  -- Verifica o status de cada documento
  FOR doc IN SELECT * FROM jsonb_each(doc_urls)
  LOOP
    IF (doc.value->>'status')::text = 'rejected' THEN
      any_rejected := true;
    ELSIF (doc.value->>'status')::text != 'approved' THEN
      all_approved := false;
    END IF;
  END LOOP;

  -- Determina o status final
  IF any_rejected THEN
    RETURN 'rejected';
  ELSIF all_approved THEN
    RETURN 'approved';
  ELSE
    RETURN 'pending';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update documents_status
CREATE OR REPLACE FUNCTION update_documents_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.documents_submitted THEN
    NEW.documents_status := check_documents_status(NEW.document_urls);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_documents_status_trigger ON merchants;
CREATE TRIGGER update_documents_status_trigger
  BEFORE INSERT OR UPDATE OF documents_submitted, document_urls
  ON merchants
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_status();

-- Update existing records
UPDATE merchants 
SET documents_status = check_documents_status(document_urls)
WHERE documents_submitted = true;
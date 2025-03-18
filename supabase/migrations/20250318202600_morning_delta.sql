/*
  # Remove merchant documents functionality

  1. Changes
    - Drop merchant_documents table
    - Drop related storage bucket
*/

-- Drop the merchant_documents table
DROP TABLE IF EXISTS merchant_documents;

-- Remove the storage bucket
DO $$
BEGIN
  DELETE FROM storage.buckets WHERE id = 'merchant-documents';
  DELETE FROM storage.objects WHERE bucket_id = 'merchant-documents';
END $$;
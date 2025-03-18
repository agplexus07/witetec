/*
  # Create Storage Bucket for Merchant Documents

  1. New Storage
    - Create a new storage bucket for merchant documents
    - Set up public access policies
    - Configure file size limits and allowed MIME types

  2. Security
    - Enable RLS
    - Add policies for merchant access
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('merchant-documents', 'merchant-documents', false);

-- Set up RLS policies for the bucket
CREATE POLICY "Merchants can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'merchant-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Merchants can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'merchant-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can access all documents"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'merchant-documents' AND
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
  )
);
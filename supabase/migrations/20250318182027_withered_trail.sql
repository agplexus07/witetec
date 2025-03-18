/*
  # Correção do bucket de armazenamento de documentos

  1. Alterações
    - Reconfigurar bucket existente
    - Ajustar configurações de tamanho e tipos de arquivo
    - Garantir acesso público correto

  2. Segurança
    - Manter políticas existentes
    - Ajustar permissões públicas
*/

-- Atualizar configurações do bucket existente
UPDATE storage.buckets
SET 
  public = true,
  file_size_limit = 5242880, -- 5MB em bytes
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'application/pdf'
  ]::text[]
WHERE id = 'merchant-documents';

-- Garantir que as políticas estejam ativas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Merchants can upload their own documents'
  ) THEN
    CREATE POLICY "Merchants can upload their own documents"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'merchant-documents' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Merchants can view their own documents'
  ) THEN
    CREATE POLICY "Merchants can view their own documents"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'merchant-documents' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Admins can access all documents'
  ) THEN
    CREATE POLICY "Admins can access all documents"
    ON storage.objects
    FOR ALL
    TO authenticated
    USING (
      bucket_id = 'merchant-documents' AND
      EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;
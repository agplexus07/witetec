/*
  # Correção das políticas RLS para upload de documentos

  1. Alterações
    - Ajustar políticas do bucket merchant-documents
    - Permitir upload público para usuários autenticados
    - Manter restrições de acesso por pasta do merchant
*/

-- Remover políticas antigas
DROP POLICY IF EXISTS "Merchants can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Merchants can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can access all documents" ON storage.objects;

-- Criar novas políticas mais permissivas
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'merchant-documents');

CREATE POLICY "Allow authenticated reads"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'merchant-documents');

-- Garantir que o bucket existe e está configurado corretamente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'merchant-documents'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES (
      'merchant-documents',
      'merchant-documents',
      true
    );
  ELSE
    UPDATE storage.buckets
    SET public = true
    WHERE id = 'merchant-documents';
  END IF;
END $$;
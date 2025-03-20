/*
  # Correção das políticas de storage para uploads

  1. Alterações
    - Remover todas as políticas existentes
    - Criar novas políticas sem restrições de pasta
    - Garantir acesso público ao bucket
*/

-- Remover todas as políticas existentes do bucket
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;

-- Criar política que permite qualquer upload autenticado
CREATE POLICY "Enable all access for authenticated users"
ON storage.objects
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Atualizar configurações do bucket
UPDATE storage.buckets
SET public = true,
    file_size_limit = 5242880, -- 5MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf']
WHERE id = 'merchant-documents';
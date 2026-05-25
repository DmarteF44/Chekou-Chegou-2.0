# Imagens do catalogo

O app usa somente a chave publica configurada em `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
Nunca use `service_role` no aplicativo.

## Configuracao

1. Execute `supabase/migrations/003_storage_policies.sql` no SQL Editor depois da migration inicial e de `002_admin_settings.sql`.
2. Confirme em Storage que o bucket publico `chekou-images` existe.
3. O bucket aceita apenas `image/jpeg`, `image/png` e `image/webp`, com limite de 5 MB.
4. A leitura publica permite que cards de produtos e lojas exibam as imagens.
5. As policies de `insert`, `update` e `delete` exigem usuario autenticado cujo profile satisfaca `public.is_admin()`, incluindo `admin` e `super_admin`.

## Teste

1. Entre com um usuario Admin ou Super Admin.
2. Em `Estabelecimentos` ou `Produtos`, toque em `Selecionar imagem`.
3. Selecione uma imagem JPG, PNG ou WEBP e salve o registro.
4. Verifique o arquivo em `stores/{id}/...` ou `products/{id}/...` no bucket e a URL publica gravada no registro.
5. Abra o catalogo do cliente e confira a imagem no card.

## Modo local

Sem configuracao Supabase valida, o app nao acessa Storage. A imagem escolhida fica como URI
local temporaria no registro salvo no AsyncStorage; se o arquivo nao estiver mais disponivel,
os cards exibem o placeholder seguro sem encerrar o aplicativo.

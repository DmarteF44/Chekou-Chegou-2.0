# Configuração Supabase

1. No SQL Editor do projeto Supabase, execute `migrations/001_initial_schema.sql`.
2. Depois execute `seed.sql`.
3. Configure apenas as variáveis públicas no desenvolvimento ou EAS:

```env
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL
```

A URL deve terminar em `.supabase.co`, sem `/rest/v1/`.

Para o build EAS, crie as mesmas variáveis no ambiente usado pelo perfil `preview`. Não inclua `.env` real no Git e nunca utilize `service_role` no aplicativo.

Enquanto essas variáveis não existirem, o app permanece no fallback local com AsyncStorage.

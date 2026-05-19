# Admin master

1. Crie uma conta pelo app ou diretamente no Supabase Auth.
2. Depois rode no SQL Editor:

```sql
update public.profiles
set role = 'super_admin',
    driver_status = 'none',
    is_blocked = false
where lower(email) = lower('Filhosamuel679@gmail.com');
```

3. Confirme:

```sql
select id, email, role
from public.profiles
where lower(email) = lower('Filhosamuel679@gmail.com');
```

Nunca coloque senha, `service_role key`, token de pagamento ou chave privada no app.

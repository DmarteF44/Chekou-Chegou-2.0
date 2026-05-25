create table if not exists public.app_settings (
  id text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.promotions (
  id text primary key,
  title text not null,
  store_name text not null,
  description text,
  image_url text,
  discount_label text,
  active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists complement_declined_at timestamptz;

drop trigger if exists touch_app_settings_updated_at on public.app_settings;
create trigger touch_app_settings_updated_at before update on public.app_settings
for each row execute function public.touch_updated_at();

drop trigger if exists touch_promotions_updated_at on public.promotions;
create trigger touch_promotions_updated_at before update on public.promotions
for each row execute function public.touch_updated_at();

insert into public.app_settings (id, value)
values (
  'checkout_settings',
  '{
    "platformFeePercent": 7,
    "platformMinimumFee": 0,
    "defaultDeliveryFee": 8,
    "safetyMarginPercent": 15,
    "minimumSafetyMargin": 10,
    "actualValueMinTolerancePercent": -40,
    "actualValueMaxTolerancePercent": 40,
    "minimumOrderValue": 15,
    "driverInitialLimitsByLevel": {"1": 50, "2": 150, "3": 300, "4": 500}
  }'::jsonb
)
on conflict (id) do nothing;

insert into public.promotions (id, title, store_name, description, image_url, discount_label, active)
values (
  'promo-eletronicos-jatai',
  'Acessórios em destaque',
  'Eletrônicos Jataí',
  'Cabos, carregadores e fones com preços especiais para teste.',
  null,
  'Teste',
  true
)
on conflict (id) do update set
  title = excluded.title,
  store_name = excluded.store_name,
  description = excluded.description,
  discount_label = excluded.discount_label,
  active = excluded.active;

alter table public.app_settings enable row level security;
alter table public.promotions enable row level security;

drop policy if exists "app_settings_authenticated_read" on public.app_settings;
create policy "app_settings_authenticated_read" on public.app_settings
for select using (auth.uid() is not null);

drop policy if exists "app_settings_admin_manage" on public.app_settings;
create policy "app_settings_admin_manage" on public.app_settings
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "promotions_authenticated_read_active" on public.promotions;
create policy "promotions_authenticated_read_active" on public.promotions
for select using ((auth.uid() is not null and active = true) or public.is_admin());

drop policy if exists "promotions_admin_manage" on public.promotions;
create policy "promotions_admin_manage" on public.promotions
for all using (public.is_admin()) with check (public.is_admin());

-- Historical custom rows remain readable. New client purchases accept only
-- catalog products tied to an active establishment.
drop policy if exists "orders_client_create" on public.orders;
create policy "orders_client_create" on public.orders
for insert with check (
  auth.uid() = client_id
  and coalesce(custom_subtotal, 0) = 0
  and coalesce(subtotal, 0) >= 0
);

drop policy if exists "order_items_client_insert" on public.order_items;
create policy "order_items_client_insert" on public.order_items
for insert with check (
  product_id is not null
  and coalesce(custom, false) = false
  and exists (
    select 1
    from public.orders o
    join public.products p on p.id = product_id
    join public.establishments e on e.id = p.establishment_id
    where o.id = order_id
      and o.client_id = auth.uid()
      and p.establishment_id = o.establishment_id
      and p.active = true
      and e.active = true
  )
);

create or replace function public.driver_progress_order(
  p_order_id uuid,
  p_status text default null,
  p_actual_value numeric default null,
  p_invoice_photo_sent boolean default null,
  p_goods_photo_sent boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.orders;
  configured_max_tolerance numeric := 40;
  max_allowed numeric;
begin
  if not public.is_approved_driver() then
    raise exception 'Entregador nao aprovado.';
  end if;

  select * into target
  from public.orders
  where id = p_order_id and driver_id = auth.uid();

  if not found then
    raise exception 'Pedido nao pertence ao entregador.';
  end if;

  select coalesce((value->>'actualValueMaxTolerancePercent')::numeric, 40)
  into configured_max_tolerance
  from public.app_settings
  where id = 'checkout_settings';
  configured_max_tolerance := coalesce(configured_max_tolerance, 40);
  max_allowed := target.subtotal * (1 + configured_max_tolerance / 100);

  if p_actual_value is not null then
    if p_actual_value <= 0 or target.subtotal <= 0 or p_actual_value > max_allowed * 2 then
      p_status := 'Aguardando revisão do Admin';
    elsif p_actual_value > max_allowed then
      p_status := 'Aguardando complemento do cliente';
    elsif target.status in ('Aguardando complemento do cliente', 'Aguardando revisão do Admin') then
      p_status := coalesce(p_status, 'Comprando produtos');
    end if;
  end if;

  if p_status is not null and p_status not in (
    'Entregador aceitou',
    'Indo ao estabelecimento',
    'Comprando produtos',
    'Aguardando complemento do cliente',
    'Aguardando revisão do Admin',
    'A caminho do cliente'
  ) then
    raise exception 'Status nao permitido para entregador.';
  end if;

  update public.orders
  set status = coalesce(p_status, status),
      actual_value = coalesce(p_actual_value, actual_value),
      invoice_photo_sent = coalesce(p_invoice_photo_sent, invoice_photo_sent),
      goods_photo_sent = coalesce(p_goods_photo_sent, goods_photo_sent)
  where id = p_order_id and driver_id = auth.uid();
end;
$$;

create or replace function public.decline_order_complement(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set status = 'Cancelado',
      complement_declined_at = now()
  where id = p_order_id
    and client_id = auth.uid()
    and status = 'Aguardando complemento do cliente';

  if not found then
    raise exception 'Complemento indisponivel para recusa.';
  end if;
end;
$$;

create or replace function public.complete_delivery(p_order_id uuid, p_confirmation_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_approved_driver() then
    raise exception 'Entregador nao aprovado.';
  end if;

  update public.orders
  set status = 'Entregue'
  where id = p_order_id
    and driver_id = auth.uid()
    and status not in ('Aguardando complemento do cliente', 'Aguardando revisão do Admin')
    and confirmation_code = p_confirmation_code;

  if not found then
    raise exception 'Codigo invalido ou entrega indisponivel.';
  end if;
end;
$$;

revoke all on function public.decline_order_complement(uuid) from public;
grant execute on function public.decline_order_complement(uuid) to authenticated;

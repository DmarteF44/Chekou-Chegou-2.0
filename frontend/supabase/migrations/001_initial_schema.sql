create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique,
  phone text,
  role text default 'client' check (role in ('client', 'driver', 'admin', 'super_admin')),
  driver_status text default 'none' check (driver_status in ('none', 'pending', 'approved', 'rejected', 'blocked')),
  driver_level int default 1,
  is_blocked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.establishments (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  branch text not null,
  type text default 'teste',
  address text,
  phone text,
  base_fee numeric default 8,
  active boolean default true,
  image_url text,
  notes text,
  delivery_time text default '30–45 min',
  rating numeric default 4.7,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references public.establishments(id) on delete cascade,
  name text not null,
  branch text not null,
  category text not null,
  price numeric not null default 0,
  promo_price numeric,
  active boolean default true,
  confirm_in_store boolean default true,
  image_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles(id),
  driver_id uuid references public.profiles(id),
  establishment_id uuid references public.establishments(id),
  status text default 'Aguardando entregador',
  subtotal numeric default 0,
  custom_subtotal numeric default 0,
  safety_margin numeric default 0,
  authorized_purchase_limit numeric default 0,
  delivery_fee numeric default 0,
  platform_fee numeric default 0,
  discount numeric default 0,
  total numeric default 0,
  actual_value numeric,
  confirmation_code text,
  coupon_code text,
  notes text,
  paid boolean default false,
  invoice_photo_sent boolean default false,
  goods_photo_sent boolean default false,
  complement_amount numeric,
  complement_approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  name text not null,
  quantity numeric default 1,
  unit_price numeric default 0,
  total numeric default 0,
  custom boolean default false,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  discount numeric default 0,
  type text default 'order',
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.driver_wallets (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.profiles(id),
  pending_balance numeric default 0,
  available_balance numeric default 0,
  operational_limit numeric default 50,
  created_at timestamptz default now()
);

create table if not exists public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  status text not null,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.driver_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  full_name text not null,
  cpf text,
  phone text,
  email text,
  vehicle_type text,
  plate text,
  cnh text,
  region text,
  pix_key text,
  accepted_terms boolean default false,
  submitted_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  order_id uuid references public.orders(id),
  subject text,
  message text,
  status text default 'open',
  created_at timestamptz default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists touch_establishments_updated_at on public.establishments;
create trigger touch_establishments_updated_at before update on public.establishments
for each row execute function public.touch_updated_at();

drop trigger if exists touch_products_updated_at on public.products;
create trigger touch_products_updated_at before update on public.products
for each row execute function public.touch_updated_at();

drop trigger if exists touch_orders_updated_at on public.orders;
create trigger touch_orders_updated_at before update on public.orders
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone, role, driver_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1), 'Cliente'),
    new.raw_user_meta_data->>'phone',
    'client',
    'none'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'super_admin')
      and is_blocked = false
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
      and is_blocked = false
  );
$$;

create or replace function public.is_approved_driver()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'driver'
      and driver_status = 'approved'
      and is_blocked = false
  );
$$;

alter table public.profiles enable row level security;
alter table public.establishments enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.coupons enable row level security;
alter table public.driver_wallets enable row level security;
alter table public.order_status_events enable row level security;
alter table public.driver_applications enable row level security;
alter table public.support_tickets enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles
for select using (auth.uid() = id or public.is_admin());

create policy "profiles_update_own_basic" on public.profiles
for update using (auth.uid() = id)
with check (
  auth.uid() = id
  and role = (select role from public.profiles where id = auth.uid())
);

create policy "profiles_update_admin" on public.profiles
for update using (public.is_admin())
with check ((public.is_super_admin()) or role <> 'super_admin');

create policy "profiles_super_admin_roles" on public.profiles
for all using (public.is_super_admin())
with check (public.is_super_admin());

create policy "establishments_public_active" on public.establishments
for select using (active = true or public.is_admin());

create policy "establishments_admin_manage" on public.establishments
for all using (public.is_admin()) with check (public.is_admin());

create policy "products_public_active" on public.products
for select using (
  active = true
  and exists (select 1 from public.establishments e where e.id = establishment_id and e.active = true)
  or public.is_admin()
);

create policy "products_admin_manage" on public.products
for all using (public.is_admin()) with check (public.is_admin());

create policy "coupons_authenticated_read_active" on public.coupons
for select using (active = true or public.is_admin());

create policy "coupons_admin_manage" on public.coupons
for all using (public.is_admin()) with check (public.is_admin());

create policy "orders_client_create" on public.orders
for insert with check (auth.uid() = client_id);

create policy "orders_client_read" on public.orders
for select using (auth.uid() = client_id or auth.uid() = driver_id or public.is_admin());

create policy "orders_client_limited_update" on public.orders
for update using (auth.uid() = client_id)
with check (auth.uid() = client_id and status in ('Aguardando complemento do cliente', 'Comprando produtos', 'Cancelado'));

create policy "orders_driver_available_read" on public.orders
for select using (public.is_approved_driver() and (driver_id = auth.uid() or (driver_id is null and status = 'Aguardando entregador')));

create policy "orders_driver_update_own" on public.orders
for update using (public.is_approved_driver() and (driver_id = auth.uid() or driver_id is null))
with check (public.is_approved_driver() and (driver_id = auth.uid() or driver_id is null));

create policy "orders_admin_manage" on public.orders
for all using (public.is_admin()) with check (public.is_admin());

create policy "order_items_follow_order_select" on public.order_items
for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.client_id = auth.uid() or o.driver_id = auth.uid() or public.is_admin())
  )
);

create policy "order_items_client_insert" on public.order_items
for insert with check (
  exists (select 1 from public.orders o where o.id = order_id and o.client_id = auth.uid())
);

create policy "order_items_admin_manage" on public.order_items
for all using (public.is_admin()) with check (public.is_admin());

create policy "driver_wallets_driver_or_admin_read" on public.driver_wallets
for select using (driver_id = auth.uid() or public.is_admin());

create policy "driver_wallets_admin_manage" on public.driver_wallets
for all using (public.is_admin()) with check (public.is_admin());

create policy "order_status_events_follow_order" on public.order_status_events
for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.client_id = auth.uid() or o.driver_id = auth.uid() or public.is_admin())
  )
);

create policy "order_status_events_insert_related" on public.order_status_events
for insert with check (
  actor_id = auth.uid()
  and exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.client_id = auth.uid() or o.driver_id = auth.uid() or public.is_admin())
  )
);

create policy "driver_applications_own_or_admin_read" on public.driver_applications
for select using (user_id = auth.uid() or public.is_admin());

create policy "driver_applications_own_insert" on public.driver_applications
for insert with check (user_id = auth.uid());

create policy "driver_applications_own_update" on public.driver_applications
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "driver_applications_admin_manage" on public.driver_applications
for all using (public.is_admin()) with check (public.is_admin());

create policy "support_tickets_own_or_admin" on public.support_tickets
for select using (user_id = auth.uid() or public.is_admin());

create policy "support_tickets_own_insert" on public.support_tickets
for insert with check (user_id = auth.uid());

create policy "support_tickets_admin_manage" on public.support_tickets
for all using (public.is_admin()) with check (public.is_admin());

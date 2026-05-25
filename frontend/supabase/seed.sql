insert into public.establishments (slug, name, branch, type, address, phone, base_fee, active, delivery_time, rating, description, notes)
values
  ('tosta-2', 'Supermercado Tosta 2', 'Mercado', 'principal', 'Av. Rio Claro, Jataí-GO', '(64) 3636-0000', 8, true, '30–45 min', 4.8, 'Hortifruti, mercearia e bebidas com preço justo.', 'Mercado principal para demonstração.'),
  ('farmacia-parceira', 'Farmácia Parceira', 'Farmácia', 'parceiro', 'R. das Flores, Jataí-GO', '(64) 3636-0000', 8, true, '20–30 min', 4.9, 'Medicamentos, perfumaria e cuidados pessoais.', 'Itens sem retenção de receita.'),
  ('eletronicos-jatai', 'Eletrônicos Jataí', 'Eletrônicos', 'teste', 'Av. Goiás, Centro, Jataí-GO', '(64) 3636-0000', 8, true, '30–50 min', 4.7, 'Acessórios, carregadores, cabos, fones e itens eletrônicos para o dia a dia.', 'Loja para apresentação.')
on conflict (slug) do update set
  name = excluded.name,
  branch = excluded.branch,
  type = excluded.type,
  address = excluded.address,
  phone = excluded.phone,
  base_fee = excluded.base_fee,
  active = excluded.active,
  delivery_time = excluded.delivery_time,
  rating = excluded.rating,
  description = excluded.description,
  notes = excluded.notes;

with stores as (
  select id, slug from public.establishments
)
insert into public.products (establishment_id, name, branch, category, price, promo_price, active, confirm_in_store, notes)
values
  ((select id from stores where slug = 'tosta-2'), 'Arroz tipo 1 5kg', 'Mercado', 'Mercearia', 28.90, null, true, true, null),
  ((select id from stores where slug = 'tosta-2'), 'Feijão carioca 1kg', 'Mercado', 'Mercearia', 7.50, null, true, true, null),
  ((select id from stores where slug = 'tosta-2'), 'Leite integral 1L', 'Mercado', 'Mercearia', 5.20, 4.50, true, true, null),
  ((select id from stores where slug = 'tosta-2'), 'Coca-Cola 2L', 'Mercado', 'Bebidas', 9.90, null, true, true, null),
  ((select id from stores where slug = 'farmacia-parceira'), 'Dipirona 500mg', 'Farmácia', 'Medicamentos sem receita', 12.00, null, true, true, 'Apenas itens sem retenção de receita.'),
  ((select id from stores where slug = 'farmacia-parceira'), 'Álcool 70% 500ml', 'Farmácia', 'Higiene', 8.50, null, true, true, null),
  ((select id from stores where slug = 'farmacia-parceira'), 'Curativo', 'Farmácia', 'Curativos', 6.90, null, true, true, null),
  ((select id from stores where slug = 'farmacia-parceira'), 'Sabonete líquido', 'Farmácia', 'Higiene', 11.90, null, true, true, null),
  ((select id from stores where slug = 'eletronicos-jatai'), 'Cabo USB-C 1m', 'Eletrônicos', 'Cabos', 19.90, null, true, true, null),
  ((select id from stores where slug = 'eletronicos-jatai'), 'Carregador Turbo USB-C', 'Eletrônicos', 'Carregadores', 49.90, null, true, true, null),
  ((select id from stores where slug = 'eletronicos-jatai'), 'Fone de ouvido P2', 'Eletrônicos', 'Fones', 29.90, null, true, true, null),
  ((select id from stores where slug = 'eletronicos-jatai'), 'Película de vidro', 'Eletrônicos', 'Acessórios', 15.00, null, true, true, null),
  ((select id from stores where slug = 'eletronicos-jatai'), 'Mouse sem fio', 'Eletrônicos', 'Informática', 39.90, null, true, true, null)
on conflict (establishment_id, name) do update set
  branch = excluded.branch,
  category = excluded.category,
  price = excluded.price,
  promo_price = excluded.promo_price,
  active = excluded.active,
  confirm_in_store = excluded.confirm_in_store,
  notes = excluded.notes;

insert into public.coupons (code, description, discount, type, active)
values
  ('PRIMEIRA10', 'R$10 off no primeiro pedido', 10, 'order', true),
  ('CHEKOU5', 'R$5 off em qualquer pedido', 5, 'order', true),
  ('ENTREGAOFF', 'Entrega grátis', 8, 'delivery', true),
  ('JATAI10', 'R$10 off para apresentação em Jataí', 10, 'order', true)
on conflict (code) do update set
  description = excluded.description,
  discount = excluded.discount,
  type = excluded.type,
  active = excluded.active;

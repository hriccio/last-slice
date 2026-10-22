create extension if not exists pgcrypto;

create table if not exists public.demo_menu (
  id text primary key,
  display_name text not null,
  descriptions jsonb not null,
  ingredients jsonb not null,
  prices_brl_cents jsonb not null,
  available boolean not null default true
);

create table if not exists public.demo_orders (
  order_code text primary key,
  idempotency_key text not null unique,
  payload text not null,
  order_data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.demo_menu enable row level security;
alter table public.demo_orders enable row level security;

insert into public.demo_menu (id,display_name,descriptions,ingredients,prices_brl_cents) values
('mussarela','Mussarela','{"pt-BR":"Muçarela derretida, molho de tomate e orégano.","en-US":"Melted mozzarella, tomato sauce, and oregano."}','["mozzarella","tomato_sauce","oregano"]','{"broto":3200,"media":4600,"grande":5900}'),
('calabresa','Calabresa','{"pt-BR":"Calabresa fatiada, muçarela, cebola e orégano.","en-US":"Sliced calabresa sausage, mozzarella, onion, and oregano."}','["calabresa","mozzarella","onion","oregano"]','{"broto":3500,"media":4900,"grande":6400}'),
('portuguesa','Portuguesa','{"pt-BR":"Presunto, muçarela, ovo, cebola, ervilha e azeitonas.","en-US":"Ham, mozzarella, egg, onion, peas, and olives."}','["ham","mozzarella","egg","onion","peas","olives"]','{"broto":3800,"media":5300,"grande":6900}'),
('frango_catupiry','Frango com Catupiry','{"pt-BR":"Frango desfiado, Catupiry e muçarela.","en-US":"Shredded chicken, Catupiry-style cream cheese, and mozzarella."}','["chicken","catupiry","mozzarella"]','{"broto":3800,"media":5300,"grande":6900}'),
('quatro_queijos','Quatro Queijos','{"pt-BR":"Muçarela, provolone, parmesão e gorgonzola.","en-US":"Mozzarella, provolone, parmesan, and gorgonzola."}','["mozzarella","provolone","parmesan","gorgonzola"]','{"broto":4000,"media":5600,"grande":7300}')
on conflict (id) do nothing;

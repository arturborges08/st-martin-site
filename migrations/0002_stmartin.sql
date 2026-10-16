create table if not exists services (
  id text primary key,
  name text not null,
  description text not null,
  duration_min integer not null,
  price_label text not null,
  sort_order integer not null,
  active boolean not null default true
);

create table if not exists professionals (
  id text primary key,
  name text not null,
  specialty text not null,
  bio text not null,
  demo boolean not null default true,
  active boolean not null default true,
  sort_order integer not null
);

create table if not exists professional_days (
  professional_id text not null references professionals (id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  primary key (professional_id, weekday)
);

create table if not exists week_hours (
  weekday integer primary key check (weekday between 0 and 6),
  is_open boolean not null,
  open_min integer not null,
  close_min integer not null
);

create table if not exists closures (
  id text primary key,
  day date not null,
  professional_id text,
  note text not null default ''
);

create table if not exists gallery_items (
  id text primary key,
  src text not null,
  alt text not null,
  caption text not null,
  fit text not null default 'cover',
  sort_order integer not null,
  visible boolean not null default true
);

create table if not exists shop_profile (
  id integer primary key check (id = 1),
  phone_display text not null,
  phone_note text not null,
  whatsapp_display text not null,
  whatsapp_note text not null,
  city text not null,
  address_line text not null,
  maps_query text not null,
  instagram text not null,
  hours_disclaimer text not null,
  slot_minutes integer not null default 30
);

create table if not exists slot_holds (
  id text primary key,
  professional_id text not null,
  service_id text not null,
  day date not null,
  start_min integer not null,
  end_min integer not null,
  created_at timestamptz not null default now()
);

create index if not exists slot_holds_day_idx on slot_holds (day, professional_id);

insert into services (id, name, description, duration_min, price_label, sort_order, active)
values
  ('corte', 'Corte masculino', 'Corte sob medida, do clássico ao contemporâneo.', 45, 'Valor a confirmar', 1, true),
  ('barba', 'Barba', 'Desenho, alinhamento e cuidado da barba.', 30, 'Valor a confirmar', 2, true),
  ('corte-barba', 'Corte + barba', 'Corte e barba no mesmo atendimento.', 75, 'Valor a confirmar', 3, true),
  ('acabamento', 'Acabamento e finalização', 'Ajuste de contorno, nuca e finalização.', 20, 'Valor a confirmar', 4, true)
on conflict (id) do nothing;

insert into professionals (id, name, specialty, bio, demo, active, sort_order)
values
  (
    'demo-1',
    'Perfil demonstrativo 1',
    'Corte — exemplo',
    'Perfil ilustrativo para a prévia. O nome e a foto reais entram quando a casa confirmar.',
    true,
    true,
    1
  ),
  (
    'demo-2',
    'Perfil demonstrativo 2',
    'Barba — exemplo',
    'Segundo perfil ilustrativo. Não representa uma pessoa da equipe.',
    true,
    true,
    2
  )
on conflict (id) do nothing;

insert into professional_days (professional_id, weekday)
select id, day
from professionals
cross join (values (2), (3), (4), (5), (6)) as days (day)
where id in ('demo-1', 'demo-2')
on conflict do nothing;

insert into week_hours (weekday, is_open, open_min, close_min)
values
  (0, false, 540, 1140),
  (1, false, 540, 1140),
  (2, true, 540, 1140),
  (3, true, 540, 1140),
  (4, true, 540, 1140),
  (5, true, 540, 1140),
  (6, true, 540, 1020)
on conflict (weekday) do nothing;

insert into gallery_items (id, src, alt, caption, fit, sort_order, visible)
values
  (
    'fachada',
    '/media/fachada.jpg',
    'Fachada da St. Martin Bar e Barbearia, com o nome da marca e um retrato na vitrine.',
    'Fachada da casa. O telefone da placa está no contato, ainda para confirmar.',
    'cover',
    1,
    true
  ),
  (
    'equipe',
    '/media/equipe.jpg',
    'Equipe reunida na barbearia, ao redor da cadeira com o logotipo. Nomes não identificados.',
    'Registro interno. Foto: Guido Santuci. Nomes da equipe pendentes de confirmação.',
    'cover',
    2,
    true
  ),
  (
    'cadeira',
    '/media/cadeira.png',
    'Peça gráfica da marca com a cadeira e os dizeres barba, cabelo, bigode e cerveja.',
    'Peça da marca: barba, cabelo, bigode e cerveja.',
    'contain',
    3,
    true
  ),
  (
    'contratando',
    '/media/contratando.jpg',
    'Anúncio da St. Martin contratando barbeiros em Araçatuba.',
    'Anúncio de contratação publicado pela casa.',
    'cover',
    4,
    false
  )
on conflict (id) do nothing;

insert into shop_profile (
  id,
  phone_display,
  phone_note,
  whatsapp_display,
  whatsapp_note,
  city,
  address_line,
  maps_query,
  instagram,
  hours_disclaimer,
  slot_minutes
)
values (
  1,
  'F 3301 0077',
  'Número visível na fachada. Confirmar DDD e se vale para agendamento.',
  '18 9 8116 2669',
  'Número publicado no anúncio de contratação. Confirmar se também atende clientes.',
  'Araçatuba/SP',
  '',
  'St. Martin Barbearia Araçatuba',
  '',
  'Horário ilustrativo, pendente de confirmação da casa.',
  30
)
on conflict (id) do nothing;

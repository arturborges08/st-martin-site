-- Agenda real, contas de cliente, equipe administradora, notificações e candidaturas.

-- Agendamentos: o slot_holds passa a guardar o cliente e o status.
alter table slot_holds add column if not exists customer_name text not null default '';
alter table slot_holds add column if not exists customer_whatsapp text not null default '';
alter table slot_holds add column if not exists user_id text;
alter table slot_holds add column if not exists status text not null default 'confirmado';
alter table slot_holds add column if not exists note text not null default '';
alter table slot_holds add column if not exists updated_at timestamptz not null default now();

create index if not exists slot_holds_user_idx on slot_holds (user_id);
create index if not exists slot_holds_status_idx on slot_holds (status);

-- Fotos e preço nos serviços/profissionais.
alter table professionals add column if not exists photo_url text not null default '';

update services set price_label = 'Consulte' where price_label in ('Valor a confirmar', '');

update professionals
set bio = 'Perfil de exemplo. Troque pelo nome e foto reais no painel.'
where demo = true;

-- Quem administra o painel.
create table if not exists staff (
  user_id text primary key,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

-- Dados extras do cliente logado.
create table if not exists customer_profiles (
  user_id text primary key,
  whatsapp text not null default '',
  updated_at timestamptz not null default now()
);

-- Avisos dentro do site.
create table if not exists notifications (
  id text primary key,
  user_id text not null,
  title text not null,
  body text not null default '',
  link text not null default '',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

-- Candidaturas do "Trabalhe conosco".
create table if not exists applications (
  id text primary key,
  created_at timestamptz not null default now(),
  name text not null,
  whatsapp text not null,
  email text not null default '',
  role text not null,
  experience text not null default '',
  about text not null default '',
  portfolio text not null default '',
  status text not null default 'recebida',
  note text not null default ''
);

create index if not exists applications_created_idx on applications (created_at desc);

-- Telefone da fachada com o DDD de Araçatuba (18). Editável no painel.
update shop_profile set phone_display = '(18) 3301-0077' where id = 1 and phone_display = 'F 3301 0077';
update shop_profile set hours_disclaimer = 'Horários em confirmação com a casa.' where id = 1
  and hours_disclaimer = 'Horário ilustrativo, pendente de confirmação da casa.';
update gallery_items set caption = 'Fachada da casa.' where id = 'fachada'
  and caption like 'Fachada da casa. O telefone%';
update gallery_items set caption = 'A equipe. Foto: Guido Santuci.' where id = 'equipe'
  and caption like 'Registro interno.%';

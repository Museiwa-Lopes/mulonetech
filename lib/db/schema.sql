create table if not exists admin_profile (
  id integer primary key,
  display_name text,
  role text,
  bio text,
  avatar_url text
);

create table if not exists admin_users (
  id bigserial primary key,
  email text not null unique,
  password_hash text not null,
  role text not null default 'admin',
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists hero_content (
  id integer primary key,
  badge text,
  title text,
  subtitle text,
  cta_primary_label text,
  cta_primary_href text,
  cta_secondary_label text,
  cta_secondary_href text
);

create table if not exists hero_stats (
  id integer primary key,
  value text,
  label text,
  sort_order integer not null default 0
);

create table if not exists services_section (
  id integer primary key,
  eyebrow text,
  title text,
  description text
);

create table if not exists services (
  id integer primary key,
  icon text,
  title text,
  image_url text,
  description text,
  sort_order integer not null default 0
);

create table if not exists projects_section (
  id integer primary key,
  eyebrow text,
  title text,
  description text
);

create table if not exists projects (
  id integer primary key,
  title text,
  tag text,
  image_url text,
  description text,
  sort_order integer not null default 0
);

create table if not exists testimonials_section (
  id integer primary key,
  eyebrow text,
  title text,
  description text
);

create table if not exists testimonials (
  id integer primary key,
  name text,
  role text,
  quote text,
  sort_order integer not null default 0
);

create table if not exists contact_section (
  id integer primary key,
  eyebrow text,
  title text,
  description text,
  badges text[] not null default '{}'
);

create table if not exists messages (
  id bigserial primary key,
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text default 'pendente',
  reply text,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_created_at on messages (created_at desc);
create index if not exists idx_messages_status on messages (status);

create table if not exists companies (
  id text primary key,
  name text not null,
  owner_id text not null,
  member_ids jsonb not null default '[]',
  created_at timestamptz not null
);

create table if not exists users (
  id text primary key,
  tag text not null unique,
  username text not null unique,
  password text not null,
  pin text not null,
  role text not null,
  avatar text not null default '',
  created_at timestamptz not null
);

create table if not exists subcontractors (
  id text primary key,
  company_name text not null,
  representative_name text not null,
  phone text not null,
  email text not null,
  workers_comp text not null default '',
  w9 text not null default '',
  business_license text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists job_categories (
  id int primary key default 1,
  categories jsonb not null default '[]',
  constraint job_categories_single_row check (id = 1)
);

create table if not exists projects (
  id text primary key,
  company_id text not null default '',
  member_ids jsonb not null default '[]',
  updated_at timestamptz not null,
  data jsonb not null
);
create index if not exists projects_company_id_idx on projects (company_id);

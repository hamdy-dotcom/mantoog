create table if not exists mantoog_wallets (
  id          uuid    primary key default gen_random_uuid(),
  label       text    not null,
  wallet_type text    not null,
  number      text    not null,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_mantoog_wallets_active on mantoog_wallets(is_active);
create index if not exists idx_mantoog_wallets_sort   on mantoog_wallets(sort_order);

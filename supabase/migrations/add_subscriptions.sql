-- Merchant subscriptions for Creatives Engine and TikTok Management tools
create table if not exists subscriptions (
  id                   uuid        primary key default gen_random_uuid(),
  merchant_id          uuid        not null references auth.users(id) on delete cascade,
  plan                 text        not null check (plan in ('creatives', 'tiktok', 'both')),
  status               text        not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  price_egp            numeric     not null,
  current_period_start timestamptz not null default now(),
  current_period_end   timestamptz not null default (now() + interval '30 days'),
  payment_method       text,
  payment_reference    text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_subscriptions_merchant_id on subscriptions(merchant_id);
create index if not exists idx_subscriptions_status      on subscriptions(status);

alter table subscriptions enable row level security;

create policy "merchants_select_own_subscriptions"
  on subscriptions for select
  using (auth.uid() = merchant_id);

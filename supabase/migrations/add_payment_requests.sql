-- Payment requests submitted by merchants (pending admin review)
create table if not exists payment_requests (
  id               uuid        primary key default gen_random_uuid(),
  merchant_id      uuid        not null references auth.users(id) on delete cascade,

  -- What the merchant is buying
  item_type        text        not null check (item_type in ('credits', 'subscription')),
  credits_amount   integer,            -- number of orders (if item_type='credits')
  bundle_id        text,               -- 'custom' | 'bundle_1000' | 'bundle_2500'
  sub_plan         text,               -- 'creatives' | 'tiktok' | 'both'
  amount_egp       numeric     not null,

  -- Payment proof
  payment_method   text        not null check (payment_method in ('vodafone', 'instapay', 'fawry', 'orange', 'etisalat')),
  sender_phone     text,               -- merchant's wallet number they sent from
  proof_url        text,               -- Supabase Storage public URL
  merchant_notes   text,

  -- Admin processing
  status           text        not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes      text,
  processed_by     text,
  processed_at     timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_payment_requests_merchant_id on payment_requests(merchant_id);
create index if not exists idx_payment_requests_status      on payment_requests(status);
create index if not exists idx_payment_requests_created_at  on payment_requests(created_at desc);

alter table payment_requests enable row level security;

-- Merchants can submit and view their own requests
create policy "merchants_select_own_payment_requests"
  on payment_requests for select
  using (auth.uid() = merchant_id);

create policy "merchants_insert_own_payment_requests"
  on payment_requests for insert
  with check (auth.uid() = merchant_id);

-- ─────────────────────────────────────────────
-- Supabase Storage: create the bucket manually in the dashboard
-- (or via CLI: supabase storage create payment-proofs)
-- Then add these storage policies:
--
-- Policy 1 — merchants upload their own proofs:
--   bucket = 'payment-proofs', operation = INSERT
--   using: (auth.uid()::text = split_part(name, '/', 1))
--
-- Policy 2 — merchants read their own proofs:
--   bucket = 'payment-proofs', operation = SELECT
--   using: (auth.uid()::text = split_part(name, '/', 1))
-- ─────────────────────────────────────────────

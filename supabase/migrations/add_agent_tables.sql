-- AI Agents: deployments (which agent watches which campaign, with what config)
-- and an append-only audit log of every action an agent takes.
create table if not exists agent_deployments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  merchant_id uuid not null,
  campaign_id text not null,
  campaign_name text,
  smart_plus boolean not null default true,
  agent text not null check (agent in ('guardian','reporter','scaler','auditor','pnl','creative')),
  status text not null default 'active' check (status in ('active','paused','done')),
  -- config: { targetCpa, maxSpendNoOrders, alertEmail, currency }
  config jsonb not null default '{}'::jsonb,
  -- observe mode: until this timestamp the agent only logs/alerts, never acts
  observe_until timestamptz,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, agent)
);

create table if not exists agent_actions (
  id uuid primary key default gen_random_uuid(),
  deployment_id uuid references agent_deployments(id) on delete cascade,
  store_id uuid not null,
  campaign_id text not null,
  agent text not null,
  -- pause | would_pause | alert | report | error
  action text not null,
  reason text,
  data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_deployments_active on agent_deployments (agent, status);
create index if not exists idx_agent_actions_store_time on agent_actions (store_id, created_at desc);

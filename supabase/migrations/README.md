# Migrations

Two naming conventions live here, and the split is deliberate.

## `<timestamp>_name.sql` — managed by the Supabase CLI

Everything created from 2026-08-15 onward. Create them with:

```bash
npx supabase migration new some_change
```

These are tracked in `supabase_migrations.schema_migrations` on the remote
database and applied automatically on every Elastic Beanstalk deploy by
`scripts/eb-migrate.sh` (wired up in `.ebextensions/01_migrate.config`).

## `add_*.sql` — legacy, already applied

The 21 files without a timestamp prefix predate CLI adoption. They were applied
by hand through the Supabase SQL editor and are **all live in production**.

The CLI ignores them — it only reads files matching `<timestamp>_name.sql` — so
`db push` prints a "Skipping migration" line for each one and moves on. That is
expected, not a warning to fix.

They were left un-renamed on purpose:

- Renaming them would make `db push` treat them as pending, and two of them
  (`add_subscriptions.sql`, `add_payment_requests.sql`) contain bare
  `create policy` statements. PostgreSQL has no `CREATE POLICY IF NOT EXISTS`,
  so re-running them raises `42710: policy already exists` and aborts the push.
- Renaming would also require a `supabase migration repair --status applied`
  call for each, reconciling history that nothing actually needs.

## This directory cannot rebuild the database

`stores`, `orders`, `products`, and `tiktok_connections` are `ALTER`ed here but
never created — the base schema was built in the Supabase dashboard and exists
only in that project's history. `supabase db reset` will not reproduce
production. Treat this directory as a forward-only change log, not a source of
truth for the full schema.

#!/bin/bash
# Applies pending Supabase migrations during an Elastic Beanstalk deploy.
#
# Invoked from .ebextensions/01_migrate.config as a leader_only container
# command, so it runs exactly once per deploy no matter how many instances the
# environment has — and does not re-run when autoscaling launches an instance.
#
# Only files named <timestamp>_name.sql are considered. The 21 legacy
# add_*.sql files are already applied and are skipped by the CLI on purpose;
# see supabase/migrations/README.md.
#
# No `set -x` — SUPABASE_DB_URL contains the database password.
set -euo pipefail

SUPABASE_CLI_VERSION=2.114.0

# EB environment properties are not in this shell by default; they live in this
# file during a deploy, and in env.bak once one has completed.
EB_ENV=/opt/elasticbeanstalk/deployment/env
[ -f "$EB_ENV" ] || EB_ENV=/opt/elasticbeanstalk/deployment/env.bak
if [ -f "$EB_ENV" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$EB_ENV"
  set +a
fi

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "SUPABASE_DB_URL is not set — refusing to deploy with unknown schema state." >&2
  echo "Set it as an EB environment property (session pooler, port 5432)." >&2
  exit 1
fi

npx --yes "supabase@${SUPABASE_CLI_VERSION}" db push --db-url "$SUPABASE_DB_URL"

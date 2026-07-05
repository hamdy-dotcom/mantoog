#!/bin/bash
set -euxo pipefail

# EB's AL2023 Node platform does not run `next build` and installs prod deps
# only. Next.js needs devDependencies (tailwind, typescript) at build time, so
# install everything and build the app here, before it is started.
APP_DIR=/var/app/staging
[ -d "$APP_DIR" ] || APP_DIR=/var/app/current
cd "$APP_DIR"

npm install --include=dev
npm run build

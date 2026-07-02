#!/usr/bin/env bash
# Runs on the EC2 box (via SSH from GitHub Actions, or manually) to redeploy the backend.
# Assumes: repo already cloned, .env already present (this script never touches secrets),
# Node 20 + PM2 already installed (see deploy/setup-ec2.sh for first-time provisioning).
set -euo pipefail
cd "$(dirname "$0")/.."

git pull --ff-only
npm ci
npm run build

# First deploy: registers both apps with PM2. Subsequent deploys: reloads them with
# zero-downtime (pm2 reload restarts one at a time instead of killing then starting).
pm2 startOrReload ecosystem.config.js
pm2 save

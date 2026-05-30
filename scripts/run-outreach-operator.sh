#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/bigo/Desktop/agent-ready"
cd "$ROOT"

mkdir -p .agent-ready/outreach

{
  printf '\n[%s] outreach operator start\n' "$(date -Iseconds)"
  node scripts/outreach-operator.mjs \
    --max-candidates 8 \
    --max-drafts 3 \
    --report .agent-ready/outreach/inbox.md \
    --ledger .agent-ready/outreach/ledger.json
  printf '[%s] outreach operator done\n' "$(date -Iseconds)"
} >> .agent-ready/outreach/outreach.log 2>&1

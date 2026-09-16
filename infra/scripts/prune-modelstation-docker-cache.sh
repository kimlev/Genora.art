#!/usr/bin/env bash
set -euo pipefail

# Remove only unused Docker build cache older than three days. Running
# containers, images used by containers, volumes and application data remain
# untouched. Cache created during the last 72 hours stays available for deploys.
/usr/bin/docker builder prune --all --force --filter "until=72h"

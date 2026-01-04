#!/bin/bash
set -euo pipefail

# MyCampusCard Gatekeeper helper (CLI)
# Usage:
#   ./unquarantine.sh /path/to/MyCampusCard.app

APP_PATH="${1:-}"
if [ -z "$APP_PATH" ]; then
  echo "Usage: $0 /path/to/MyCampusCard.app" >&2
  exit 2
fi

if [ ! -d "$APP_PATH" ]; then
  echo "Not found: $APP_PATH" >&2
  exit 2
fi

echo "Removing quarantine attribute from: $APP_PATH"
xattr -dr com.apple.quarantine "$APP_PATH"

echo "Done. You can now open the app normally." 

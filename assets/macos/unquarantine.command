#!/bin/bash
set -euo pipefail

# MyCampusCard Gatekeeper helper
# Removes the quarantine attribute from MyCampusCard.app in the same directory as this script.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_PATH="$SCRIPT_DIR/../MacOS/../../MyCampusCard.app"

# Fallback: if the path above doesn't resolve (layout can differ), try common locations.
if [ ! -d "$APP_PATH" ]; then
  if [ -d "$SCRIPT_DIR/../../MyCampusCard.app" ]; then
    APP_PATH="$SCRIPT_DIR/../../MyCampusCard.app"
  fi
fi

if [ ! -d "$APP_PATH" ]; then
  echo "Could not locate MyCampusCard.app automatically."
  echo "Please run this instead (replace path as needed):"
  echo "  xattr -dr com.apple.quarantine /path/to/MyCampusCard.app"
  exit 1
fi

echo "Removing quarantine attribute from: $APP_PATH"
xattr -dr com.apple.quarantine "$APP_PATH"

echo "Done. Launching app..."
open "$APP_PATH"

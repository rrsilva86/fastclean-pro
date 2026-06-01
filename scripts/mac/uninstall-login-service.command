#!/bin/zsh
set -e

PLIST="$HOME/Library/LaunchAgents/com.fastcleanpro.local.plist"

if [ -f "$PLIST" ]; then
  launchctl unload "$PLIST" >/dev/null 2>&1 || true
  rm -f "$PLIST"
fi

echo "FastClean Pro nao vai mais iniciar automaticamente com o Mac."

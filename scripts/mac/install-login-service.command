#!/bin/zsh
set -e

PLIST="$HOME/Library/LaunchAgents/com.fastcleanpro.local.plist"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$HOME/Library/Logs/FastCleanPro"
NODE_BIN="$APP_DIR/.local-tools/node-v24.16.0-darwin-arm64/bin/node"

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"

PIDS="$(lsof -tiTCP:3000 -sTCP:LISTEN || true)"
if [ -n "$PIDS" ]; then
  echo "$PIDS" | xargs kill >/dev/null 2>&1 || true
fi

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.fastcleanpro.local</string>
  <key>WorkingDirectory</key>
  <string>$APP_DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$APP_DIR/.local-tools/node-v24.16.0-darwin-arm64/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>cd "$APP_DIR" && "$NODE_BIN" "$APP_DIR/node_modules/next/dist/bin/next" start -p 3000</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/launch-agent.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/launch-agent-error.log</string>
</dict>
</plist>
PLIST

launchctl unload "$PLIST" >/dev/null 2>&1 || true
launchctl load "$PLIST"

echo "FastClean Pro agora inicia junto com o Mac."
open "http://localhost:3000/pt/dashboard"

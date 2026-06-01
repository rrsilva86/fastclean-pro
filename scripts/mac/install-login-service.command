#!/bin/zsh
set -e

PLIST="$HOME/Library/LaunchAgents/com.fastcleanpro.local.plist"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$HOME/Library/Logs/FastCleanPro"

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"

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
    <string>/Applications/Codex.app/Contents/Resources:/Users/rafaelsilva/Documents/Codex/2026-05-30/files-mentioned-by-the-user-pasted/work/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>ProgramArguments</key>
  <array>
    <string>/Applications/Codex.app/Contents/Resources/node</string>
    <string>$APP_DIR/node_modules/next/dist/bin/next</string>
    <string>start</string>
    <string>-p</string>
    <string>3000</string>
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

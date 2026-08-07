#!/bin/zsh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PORT="${FASTCLEAN_PORT:-3000}"
LOG_DIR="$HOME/Library/Logs/FastCleanPro"
PID_FILE="$LOG_DIR/fastclean-pro.pid"
URL="http://localhost:$PORT/pt/dashboard"

mkdir -p "$LOG_DIR"
cd "$APP_DIR"

export PATH="/Applications/Codex.app/Contents/Resources:/Users/rafaelsilva/Documents/Codex/2026-05-30/files-mentioned-by-the-user-pasted/work/bin:$PATH"
LOCAL_NODE="$APP_DIR/.local-tools/node-v24.16.0-darwin-arm64/bin/node"
NODE_BIN="$LOCAL_NODE"

if [ ! -x "$NODE_BIN" ]; then
  NODE_BIN="$(command -v node)"
fi

if lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "FastClean Pro ja esta aberto em $URL"
  open "$URL"
  exit 0
fi

if [ ! -d "node_modules" ]; then
  echo "Preparando dependencias do FastClean Pro..."
  pnpm install
fi

echo "Iniciando FastClean Pro em $URL"
"$NODE_BIN" "$SCRIPT_DIR/start-server.js"

sleep 2
open "$URL"
echo "Pronto. Pode fechar esta janela. O app continua rodando."

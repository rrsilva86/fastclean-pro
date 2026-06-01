#!/bin/zsh
set -e

PORT="${FASTCLEAN_PORT:-3000}"
LOG_DIR="$HOME/Library/Logs/FastCleanPro"
PID_FILE="$LOG_DIR/fastclean-pro.pid"

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE")"
  if kill -0 "$PID" >/dev/null 2>&1; then
    kill "$PID" >/dev/null 2>&1 || true
  fi
  rm -f "$PID_FILE"
fi

PIDS="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN || true)"
if [ -n "$PIDS" ]; then
  echo "$PIDS" | xargs kill >/dev/null 2>&1 || true
fi

echo "FastClean Pro foi parado."

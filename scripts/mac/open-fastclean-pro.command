#!/bin/zsh
set -e

PORT="${FASTCLEAN_PORT:-3000}"
URL="http://localhost:$PORT/pt/dashboard"

if ! lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  "$SCRIPT_DIR/start-fastclean-pro.command"
  exit 0
fi

open "$URL"

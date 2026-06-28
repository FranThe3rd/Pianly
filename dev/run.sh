#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.dev"
BACKEND_PID="$PID_DIR/backend.pid"
FRONTEND_PID="$PID_DIR/frontend.pid"
BACKEND_LOG="$PID_DIR/backend.log"
FRONTEND_LOG="$PID_DIR/frontend.log"

mkdir -p "$PID_DIR"

is_running() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] || return 1
  local pid
  pid="$(cat "$pid_file")"
  kill -0 "$pid" 2>/dev/null
}

if is_running "$BACKEND_PID" || is_running "$FRONTEND_PID"; then
  echo "Dev servers already running. Use ./dev/down.sh to stop them first."
  exit 1
fi

echo "Starting backend (Spring Boot)..."
(
  cd "$ROOT_DIR/backend"
  ./mvnw spring-boot:run
) >"$BACKEND_LOG" 2>&1 &
echo $! >"$BACKEND_PID"

echo "Starting frontend (Vite)..."
(
  cd "$ROOT_DIR/frontend"
  npm run dev
) >"$FRONTEND_LOG" 2>&1 &
echo $! >"$FRONTEND_PID"

sleep 2

echo ""
echo "Pianly dev servers started"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8080"
echo ""
echo "Logs:"
echo "  tail -f .dev/backend.log"
echo "  tail -f .dev/frontend.log"
echo ""
echo "Stop with: ./dev/down.sh"

#!/bin/bash

set -euo pipefail

command -v docker >/dev/null 2>&1 && command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 || {
  command -v brew >/dev/null 2>&1 || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  command -v docker >/dev/null 2>&1 || brew install docker
  command -v node   >/dev/null 2>&1 || brew install node
}

kp() {
  local port="$1"
  local pids
  pids="$(lsof -ti :"$port" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    kill -9 $pids || true
  fi
}

kp 3000
kp 3010

unset NODE_OPTIONS

echo "Installing dependencies..."
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "Starting frontend and backend..."

# Start backend (nodemon)
npm run back &

# Start frontend
npm run front


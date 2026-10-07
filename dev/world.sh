#!/bin/zsh
# Screenshots every challenge of one world file on a phone-sized screen and reports problems.
# usage: dev/world.sh <world file, e.g. zoo/add.js> <output folder> [challenge index or index/level]
cd "$(dirname "$0")/.."
free() { python3 -c "import socket; s=socket.socket(); s.bind(('127.0.0.1', 0)); print(s.getsockname()[1])"; }
PORT=$(free)
mkdir -p "$2"
python3 -c "import server; server.serve('.', $PORT)" >/dev/null 2>&1 &
SRV=$!
trap "kill $SRV 2>/dev/null" EXIT
sleep 0.7
CDP_PORT=$(free) BASE="http://127.0.0.1:$PORT" FILE="$1" ONLY="${3:-}" SHOT_DIR="$2" python3 dev/cdp.py dev/world-shots.py

#!/bin/zsh
# Runs the generator self-test in headless Chrome and prints the result.
# usage: dev/check.sh [rounds-per-level] [world file, e.g. zoo/add.js]
cd "$(dirname "$0")/.."
PORT=$(python3 -c "import socket; s=socket.socket(); s.bind(('127.0.0.1', 0)); print(s.getsockname()[1])")
python3 -c "import server; server.serve('.', $PORT)" >/dev/null 2>&1 &
SRV=$!
trap "kill $SRV 2>/dev/null" EXIT
sleep 0.7
python3 dev/dump.py "http://127.0.0.1:$PORT/dev/test.html?n=${1:-60}&file=${2:-}" 120000

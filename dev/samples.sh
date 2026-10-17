#!/bin/zsh
# Prints generated questions as text for proofreading.
# usage: dev/samples.sh <world file, e.g. zoo/add.js> [challenge index] [level] [rounds per level]
cd "$(dirname "$0")/.."
PORT=$(python3 -c "import socket; s=socket.socket(); s.bind(('127.0.0.1', 0)); print(s.getsockname()[1])")
python3 -c "import server; server.serve('.', $PORT)" >/dev/null 2>&1 &
SRV=$!
trap "kill $SRV 2>/dev/null" EXIT
sleep 0.7
python3 dev/dump.py "http://127.0.0.1:$PORT/dev/samples.html?file=$1&ch=${2:-}&level=${3:-}&n=${4:-8}" 120000

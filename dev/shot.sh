#!/bin/zsh
# Screenshot one screen of the running game: dev/shot.sh <name> <hash-route> [width] [height]
OUT="${SHOT_DIR:-/tmp}/$1.png"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --no-first-run --hide-scrollbars \
  --virtual-time-budget=6000 --window-size=${3:-820},${4:-1100} --screenshot="$OUT" "http://127.0.0.1:8787/?dev$2" >/dev/null 2>&1
echo "$OUT"

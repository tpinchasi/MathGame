#!/bin/zsh
# Runs the click-through test in headless Chrome and prints the result.
cd "$(dirname "$0")/.."
PORT=8798
python3 -m http.server $PORT --bind 127.0.0.1 >/dev/null 2>&1 &
SRV=$!
trap "kill $SRV 2>/dev/null" EXIT
sleep 0.7
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --no-first-run \
  --virtual-time-budget=20000 --dump-dom "http://127.0.0.1:$PORT/dev/e2e.html" 2>/dev/null \
  | python3 -c "import sys,re,html; s=sys.stdin.read(); m=re.search(r'<pre id=\"out\"[^>]*>(.*?)</pre>', s, re.S); print(html.unescape(m.group(1)) if m else 'NO OUTPUT\n'+s[:800])"

#!/bin/zsh
# Starts the game server and a Cloudflare quick tunnel, then prints the public link.
# The link changes every time this is restarted (quick tunnels have no fixed address).
cd "$(dirname "$0")"
export PORT=${PORT:-8787}
python3 server.py &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT INT TERM
caffeinate -i -w $SERVER &   # keep the Mac awake while the server runs
echo "local link:  http://127.0.0.1:$PORT"
echo "public link (appears in a few seconds):"
cloudflared tunnel --url http://127.0.0.1:$PORT 2>&1 | tee tunnel.log | grep --line-buffered -o 'https://[a-z0-9-]*\.trycloudflare\.com'

#!/usr/bin/env python3
"""Tiny Chrome DevTools client (stdlib only) for driving the game with real touch input.

usage: python3 dev/cdp.py <script.py>   -- the script gets `page` (see Page below)
"""
import base64, json, os, socket, struct, subprocess, sys, tempfile, time, urllib.request

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9333


class WS:
    def __init__(self, url):
        host, path = url[5:].split("/", 1)
        h, p = host.split(":")
        self.s = socket.create_connection((h, int(p)))
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall((f"GET /{path} HTTP/1.1\r\nHost: {host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                        f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n").encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += self.s.recv(4096)

    def send(self, text):
        data = text.encode()
        head = bytes([0x81])
        n = len(data)
        head += bytes([0x80 | n]) if n < 126 else bytes([0x80 | 126]) + struct.pack(">H", n) if n < 65536 else bytes([0x80 | 127]) + struct.pack(">Q", n)
        mask = os.urandom(4)
        self.s.sendall(head + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def _read(self, n):
        out = b""
        while len(out) < n:
            chunk = self.s.recv(n - len(out))
            if not chunk:
                raise EOFError
            out += chunk
        return out

    def recv(self):
        data = b""
        while True:
            b0, b1 = self._read(2)
            n = b1 & 0x7F
            if n == 126:
                n = struct.unpack(">H", self._read(2))[0]
            elif n == 127:
                n = struct.unpack(">Q", self._read(8))[0]
            data += self._read(n)
            if b0 & 0x80:
                return data.decode("utf-8", "replace")


class Page:
    def __init__(self, ws):
        self.ws, self.id, self.logs = ws, 0, []

    def cmd(self, method, **params):
        self.id += 1
        self.ws.send(json.dumps({"id": self.id, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.id:
                return msg.get("result", msg)
            if msg.get("method") == "Runtime.exceptionThrown":
                self.logs.append("EXCEPTION " + json.dumps(msg["params"]["exceptionDetails"], ensure_ascii=False)[:600])
            elif msg.get("method") == "Runtime.consoleAPICalled":
                self.logs.append("console: " + " ".join(str(a.get("value", a.get("description", ""))) for a in msg["params"]["args"]))

    def js(self, expr):
        r = self.cmd("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True)
        return r.get("result", {}).get("value")

    def phone(self, w=390, h=780, ua="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"):
        self.cmd("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=2, mobile=True)
        self.cmd("Emulation.setTouchEmulationEnabled", enabled=True, maxTouchPoints=5)
        self.cmd("Emulation.setUserAgentOverride", userAgent=ua)

    def goto(self, url):
        self.cmd("Page.navigate", url=url)
        time.sleep(1.5)

    def tap(self, sel, text=None, wait=0.5):
        """Real touch tap on the centre of the first matching (optionally text-containing) visible element."""
        pt = self.js("""(() => { const els = [...document.querySelectorAll(%s)].filter(e => e.offsetParent !== null || e.getClientRects().length);
          const e = %s; if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()"""
                     % (json.dumps(sel), "els.find(e => e.textContent.includes(%s))" % json.dumps(text) if text else "els[0]"))
        if not pt:
            return False
        self.touch(pt[0], pt[1], wait)
        return True

    def touch(self, x, y, wait=0.5):
        self.cmd("Input.dispatchTouchEvent", type="touchStart", touchPoints=[{"x": x, "y": y}])
        self.cmd("Input.dispatchTouchEvent", type="touchEnd", touchPoints=[])
        time.sleep(wait)

    def shot(self, path):
        data = self.cmd("Page.captureScreenshot", format="png")["data"]
        with open(path, "wb") as f:
            f.write(base64.b64decode(data))
        return path

    def state(self):
        return self.js("""JSON.stringify({hash: location.hash, modal: document.querySelector('.modal') ? (document.querySelector('.modal h2,.modal h3')||{}).textContent : null,
          screen: document.querySelector('.play') ? 'play' : document.querySelector('.path') ? 'world' : document.querySelector('.galaxy') ? 'map' : document.querySelector('.result') ? 'result' : '?',
          prompt: (document.querySelector('.prompt')||{}).textContent, feedback: (document.querySelector('.feedback')||{}).textContent})""")


def main():
    prof = tempfile.mkdtemp(prefix="cdp-")
    proc = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--no-first-run", f"--remote-debugging-port={PORT}", f"--user-data-dir={prof}", "about:blank"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(40):
            try:
                tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json"))
                break
            except Exception:
                time.sleep(0.25)
        page = Page(WS([t for t in tabs if t["type"] == "page"][0]["webSocketDebuggerUrl"]))
        page.cmd("Page.enable")
        page.cmd("Runtime.enable")
        exec(open(sys.argv[1]).read(), {"page": page, "time": time, "json": json, "SHOTS": os.environ.get("SHOT_DIR", tempfile.gettempdir())})
        for line in page.logs:
            print(line)
    finally:
        proc.terminate()


if __name__ == "__main__":
    main()

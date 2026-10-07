#!/usr/bin/env python3
"""Loads a test page in headless Chrome and prints the text of its <pre id="out">.

Newer Chrome versions keep running after --dump-dom, so this stops Chrome as soon as the
page has been printed.  usage: dev/dump.py <url> [virtual-time-budget-ms]
"""
import html, re, shutil, subprocess, sys, tempfile

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
url, budget = sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "120000"
profile = tempfile.mkdtemp(prefix="dump-")
proc = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--no-first-run", f"--user-data-dir={profile}",
                         f"--virtual-time-budget={budget}", "--dump-dom", url], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
out = ""
try:
    for line in proc.stdout:
        out += line
        if "</html>" in line:
            break
finally:
    proc.kill()
    shutil.rmtree(profile, ignore_errors=True)
m = re.search(r'<pre id="out"[^>]*>(.*?)</pre>', out, re.S)
print(html.unescape(m.group(1)) if m else "NO OUTPUT\n" + out[:800])

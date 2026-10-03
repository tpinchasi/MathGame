# Run with: python3 dev/cdp.py dev/icon.py   (game server must be running on :8787)
# Renders the app icon foreground (the accountant robot on a transparent 432px square,
# kept inside the adaptive-icon safe zone) from the game's own artwork.
import base64
page.goto("http://127.0.0.1:8787/?dev")
svg = page.js("import('/js/art.js').then(m => m.accountant('#c7cdf0'))")
page.cmd("Emulation.setDeviceMetricsOverride", width=432, height=432, deviceScaleFactor=1, mobile=False)
page.cmd("Emulation.setDefaultBackgroundColorOverride", color={"r": 0, "g": 0, "b": 0, "a": 0})
page.js("document.documentElement.innerHTML = '<body style=\"margin:0;background:transparent;display:grid;place-items:center;width:432px;height:432px\"><div style=\"width:212px\">' + %s + '</div></body>'" % json.dumps(svg))
time.sleep(0.3)
out = "android/app/src/main/res/drawable-xxxhdpi/ic_launcher_fg.png"
data = page.cmd("Page.captureScreenshot", format="png", clip={"x": 0, "y": 0, "width": 432, "height": 432, "scale": 1})["data"]
open(out, "wb").write(base64.b64decode(data))
print("wrote", out)

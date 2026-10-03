# Run with: python3 dev/cdp.py dev/store-assets.py   (game server must be running on :8787)
# Renders the Google Play listing graphics from the real game into fastlane/metadata/android/iw-IL/images:
# the 512px icon, the 1024x500 feature graphic and screenshots for phones and tablets.
import base64, os

BASE = "http://127.0.0.1:8787/?dev"
OUT = "fastlane/metadata/android/iw-IL/images"
# a believable saved game, so the map and the station are not empty
PROGRESS = {"story": True, "mute": True, "intro": {}, "st": {}, "lv": {
    "frac-pizza": 3, "frac-equiv": 3, "frac-line": 2, "frac-compare": 2, "frac-mixed": 2, "frac-add": 1, "frac-part": 1,
    "order-first": 3, "order-brackets": 2, "order-long": 1, "sq-build": 2, "sq-spot": 1,
    "geo-rect": 2, "geo-same": 1, "geo-laser": 1, "puz-seq": 2, "puz-pyramid": 1}}

def size(w, h, dpr):
    page.cmd("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=dpr, mobile=True)

def save(path, w=None, h=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    args = {"format": "png"}
    if w:
        args["clip"] = {"x": 0, "y": 0, "width": w, "height": h, "scale": 1}
    open(path, "wb").write(base64.b64decode(page.cmd("Page.captureScreenshot", **args)["data"]))

def go(route):
    page.js("location.hash = '#/x'; location.hash = %s" % json.dumps(route))
    time.sleep(0.5)

def solve(check=True):
    page.js("import('/js/engine.js').then(m => { const c = m.play.current; c.widget.set(c.round.answer); })")
    if check:
        page.js("[...document.querySelectorAll('.p-foot button')].find(b => b.textContent.includes('בדיקה')).click()")
    time.sleep(0.3)

def hint():
    page.js("[...document.querySelectorAll('.p-foot button')].find(b => b.textContent.includes('רמז')).click()")
    time.sleep(0.3)

# each screen: a route and what to do once it is open
SCREENS = [
    ("#/", None),
    ("#/play/frac/0/1", solve),
    ("#/play/geo/2/1", solve),
    ("#/play/frac/5/2", hint),
    ("#/play/puz/5/2", solve),
    ("#/play/geo/5/3", lambda: solve(False)),
    ("#/world/frac", None),
    ("#/station", None),
]

page.goto(BASE)
page.js("localStorage.setItem('nekamat-hacheshbonaim-v1', %s)" % json.dumps(json.dumps(PROGRESS)))

for folder, w, h, dpr in [("phoneScreenshots", 360, 720, 3), ("sevenInchScreenshots", 600, 960, 2), ("tenInchScreenshots", 800, 1280, 2)]:
    size(w, h, dpr)
    page.goto(BASE)
    for n, (route, act) in enumerate(SCREENS, 1):
        go(route)
        if act:
            act()
        save("%s/%s/%d.png" % (OUT, folder, n))
    print(folder, len(SCREENS), "screens at %dx%d" % (w * dpr, h * dpr))

# icon: the robot on the game's gold, full square (Play rounds the corners itself)
size(512, 512, 1)
page.goto(BASE)
robot = page.js("import('/js/art.js').then(m => m.accountant('#c7cdf0'))")
page.js("document.body.innerHTML = '<div style=\"width:512px;height:512px;background:#ffd166;display:grid;place-items:center\"><div style=\"width:300px\">' + %s + '</div></div>'; document.body.style.cssText = 'margin:0;background:#ffd166'" % json.dumps(robot))
time.sleep(0.3)
save(OUT + "/icon.png", 512, 512)

# feature graphic: title, robot and the five planets on the space background
size(1024, 500, 1)
page.goto(BASE)
page.js("""import('/js/art.js').then(m => {
  const planets = ['frac', 'order', 'sq', 'geo', 'puz'].map(p => '<span style="width:118px">' + m.planet(p) + '</span>').join('');
  document.body.style.cssText = 'margin:0;width:1024px;height:500px;overflow:hidden;position:relative';
  document.body.innerHTML = '<div id="stars"></div><div style="position:absolute;top:0;left:0;width:1024px;height:500px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px">'
    + '<div style="display:flex;align-items:center;gap:22px"><span style="width:112px">' + m.accountant() + '</span>'
    + '<h1 style="margin:0;font-size:88px;font-weight:900;color:#ffd166;text-shadow:0 6px 0 #9b5d00">נקמת החשבונאים</h1></div>'
    + '<div style="display:flex;gap:30px">' + planets + '</div>'
    + '<div style="font-size:32px;font-weight:700;color:#f4f6ff">הרפתקת חשבון בחלל</div></div>';
  m.starfield(document.getElementById('stars'));
})""")
time.sleep(0.4)
save(OUT + "/featureGraphic.png", 1024, 500)
print("icon and feature graphic written")

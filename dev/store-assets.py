# Run with: python3 dev/cdp.py dev/store-assets.py   (game server must be running on :8787)
# Renders the Google Play listing graphics from the real game into fastlane/metadata/android/iw-IL/images:
# the 512px icon, the 1024x500 feature graphic and screenshots for phones and tablets.
import base64, os

BASE = "http://127.0.0.1:8787/?dev"
OUT = "fastlane/metadata/android/iw-IL/images"
# a believable saved game, so the maps and prize rooms are not empty: in every world the first few
# challenges have stars (built from the game list, so it follows the real challenge ids)
PROGRESS_JS = """import('/js/games.js').then(m => {
  const lv = {};
  m.GAMES.forEach((g, gi) => g.worlds.forEach((w, wi) => w.challenges.slice(0, Math.max(1, 6 - wi - gi)).forEach((c, ci) => (lv[c.id] = Math.max(1, 3 - ci % 3)))));
  return JSON.stringify({ story: true, 'story-zoo': true, 'story-lab': true, mute: true, intro: {}, st: {}, lv });
})"""

def size(w, h, dpr):
    page.cmd("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=dpr, mobile=True)

def save(path, w=None, h=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    args = {"format": "png"}
    if w:
        args["clip"] = {"x": 0, "y": 0, "width": w, "height": h, "scale": 1}
    open(path, "wb").write(base64.b64decode(page.cmd("Page.captureScreenshot", **args)["data"]))

# Android shows Google's Noto emoji (free licence); a Mac would draw Apple's, which may not be used
# in store images. Load Noto Color Emoji from Google Fonts and put it before the system emoji font.
def noto():
    page.js("""(() => {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=block';
      document.head.append(l);
      const st = document.createElement('style');
      st.textContent = "body, body * { font-family: 'Rubik', 'Noto Color Emoji', sans-serif !important; } .badge text { font-family: 'Noto Color Emoji' !important; }";
      document.head.append(st);
      return new Promise(r => l.onload = r).then(() => document.fonts.load('48px "Noto Color Emoji"', '🦁🐒🧪')).then(() => document.fonts.ready).then(() => 'ok');
    })()""")

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
    ("#/grades", None),
    ("#/play/zpuz/2/1", None),
    ("#/play/zgeo/3/1", None),
    ("#/play/frac/0/1", solve),
    ("#/play/geo/2/1", solve),
    ("#/play/lalg/0/1", None),
    ("#/play/lnum/2/2", lambda: solve(False)),
    ("#/hub/zoo", None),
]

page.goto(BASE)
noto()
progress = page.js(PROGRESS_JS)
assert progress, "could not build the saved game"
page.js("localStorage.setItem('nekamat-hacheshbonaim-v1', %s)" % json.dumps(progress))

for folder, w, h, dpr in [("phoneScreenshots", 360, 720, 3), ("sevenInchScreenshots", 600, 960, 2), ("tenInchScreenshots", 800, 1280, 2)]:
    size(w, h, dpr)
    page.goto(BASE)
    noto()
    for n, (route, act) in enumerate(SCREENS, 1):
        go(route)
        if act:
            act()
        save("%s/%s/%d.png" % (OUT, folder, n))
    print(folder, len(SCREENS), "screens at %dx%d" % (w * dpr, h * dpr))

# icon: the robot on the game's gold, full square (Play rounds the corners itself)
size(512, 512, 1)
page.goto(BASE)
noto()
robot = page.js("import('/js/art.js').then(m => m.accountant('#c7cdf0'))")
page.js("document.body.innerHTML = '<div style=\"width:512px;height:512px;background:#ffd166;display:grid;place-items:center\"><div style=\"width:300px\">' + %s + '</div></div>'; document.body.style.cssText = 'margin:0;background:#ffd166'" % json.dumps(robot))
time.sleep(0.3)
save(OUT + "/icon.png", 512, 512)

# feature graphic: title, robot and the three games on the space background
size(1024, 500, 1)
page.goto(BASE)
noto()
page.js("""Promise.all([import('/js/art.js'), import('/js/games.js')]).then(([m, g]) => {
  const cards = g.GAMES.map(x => '<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><span style="width:120px">' + x.cover() + '</span>'
    + '<b style="font-size:30px;color:#f4f6ff">' + x.grades + '</b></div>').join('');
  document.body.dataset.theme = 'space';
  document.body.style.cssText = 'margin:0;width:1024px;height:500px;overflow:hidden;position:relative';
  document.body.innerHTML = '<div id="stars"></div><div style="position:absolute;top:0;left:0;width:1024px;height:500px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px">'
    + '<div style="display:flex;align-items:center;gap:22px"><span style="width:112px">' + m.accountant() + '</span>'
    + '<h1 style="margin:0;font-size:88px;font-weight:900;color:#ffd166;text-shadow:0 6px 0 #9b5d00">נקמת החשבונאים</h1></div>'
    + '<div style="display:flex;gap:70px">' + cards + '</div></div>';
  m.starfield(document.getElementById('stars'));
})""")
time.sleep(0.4)
save(OUT + "/featureGraphic.png", 1024, 500)
print("icon and feature graphic written")

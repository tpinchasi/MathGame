# Run with: python3 dev/cdp.py dev/touch-test.py   (game server must be running on :8787)
# Drives the game with real touch events on a phone-sized screen.
BASE = "http://127.0.0.1:8787/"
results = []
def ok(cond, msg):
    results.append(("ok   " if cond else "FAIL ") + msg)
def st():
    return json.loads(page.state())
def answer():
    return page.js("import('/js/engine.js').then(m => JSON.stringify(m.play.current.round.answer))")
def good():
    return page.js("!!document.querySelector('.feedback.good')")

page.phone()

# A. the explanation opened from the level picker leads into the game
page.goto(BASE)
page.tap(".modal button", "יוצאים")
page.tap(".planet-card")
page.tap(".node button")
page.tap(".picker .btn.ghost")
ok(st()["modal"] is not None and st()["screen"] == "world", "explanation opens from the level picker")
page.tap(".modal .btn.primary")
s = st()
ok(s["screen"] == "play" and s["modal"] is None, "'got it' starts the game (no second explanation): " + s["hash"])

# B. pizza: cut and colour by touch
a = json.loads(answer())
for _ in range(a["d"] - 2):
    page.tap(".fb-ctl .round:last-child", wait=0.15)
for _ in range(a["n"]):
    page.tap(".slice:not(.on)", wait=0.15)
page.tap(".p-foot .btn.primary", "בדיקה")
ok(good(), "pizza answered by touch (%d/%d)" % (a["n"], a["d"]))

# C. keypad
page.goto(BASE + "?dev#/play/frac/6/1")
a = json.loads(answer())
for digit in str(a["a"]):
    page.tap(".keypad button", digit, wait=0.15)
page.tap(".p-foot .btn.primary", "בדיקה")
ok(good(), "keypad answer by touch (%s)" % a["a"])

# D. number line
page.goto(BASE + "?dev#/play/frac/2/1")
k = json.loads(answer())
page.tap('.hit[data-k="%d"]' % k)
page.tap(".p-foot .btn.primary", "בדיקה")
ok(good(), "number line by touch")

# E. grid: paint a rectangle by dragging along each row
page.goto(BASE + "?dev#/play/geo/0/2")
cells = json.loads(answer())
rows = sorted(set(int(c.split(",")[0]) for c in cells))
cols = sorted(set(int(c.split(",")[1]) for c in cells))
def centre(r, c):
    return page.js("(() => { const b = document.querySelector('.gcell[data-k=\"%d,%d\"]').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()" % (r, c))
for r in rows:
    x, y = centre(r, cols[0])
    page.cmd("Input.dispatchTouchEvent", type="touchStart", touchPoints=[{"x": x, "y": y}])
    for c in cols[1:]:
        x, y = centre(r, c)
        page.cmd("Input.dispatchTouchEvent", type="touchMove", touchPoints=[{"x": x, "y": y}])
    page.cmd("Input.dispatchTouchEvent", type="touchEnd", touchPoints=[])
time.sleep(0.3)
painted = page.js("document.querySelectorAll('.gcell.on').length")
ok(painted == len(cells), "grid painted by dragging: %s of %d cells" % (painted, len(cells)))
page.shot(SHOTS + "/t-grid.png")
page.tap(".p-foot .btn.primary", "בדיקה")
ok(good(), "grid rectangle accepted")

# F. laser: drag to the angle
page.goto(BASE + "?dev#/play/geo/2/1")
target = json.loads(answer())
pt = page.js("(() => { const b = document.querySelector('svg.angle').getBoundingClientRect(), k = b.width / 356, a = %d * Math.PI / 180; return [b.left + (178 + 128 * Math.cos(a)) * k, b.top + (178 - 128 * Math.sin(a)) * k]; })()" % target)
page.touch(pt[0], pt[1])
page.shot(SHOTS + "/t-angle.png")
page.tap(".p-foot .btn.primary", "בדיקה")
ok(good(), "laser aimed by touch at %d degrees" % target)

print("\n".join(results))

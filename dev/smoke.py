# Run with: python3 dev/cdp.py dev/smoke.py   (game server must be running on :8787)
# Opens every challenge at every level in the real engine on a phone-sized screen and reports
# script errors, empty screens and content wider than the screen.
page.phone()
page.goto("http://127.0.0.1:8787/?dev")
worlds = json.loads(page.js("import('/js/games.js').then(m => JSON.stringify(m.GAMES.flatMap(g => g.worlds).map(w => [w.id, w.challenges.length])))"))
bad, n = [], 0
for wid, count in worlds:
    for i in range(count):
        for lvl in (1, 2, 3):
            for rep in range(2):
                n += 1
                page.logs.clear()
                page.js("location.hash = '#/x'; location.hash = '#/play/%s/%d/%d'" % (wid, i, lvl))
                time.sleep(0.12)
                info = json.loads(page.js("""JSON.stringify({play: !!document.querySelector('.play'), prompt: (document.querySelector('.prompt') || {}).textContent || '',
                  widget: !!document.querySelector('.wbox > *'), over: document.documentElement.scrollWidth - window.innerWidth,
                  wide: (() => { const b = document.querySelector('.p-body'); if (!b) return 0; const c = b.getBoundingClientRect(); return [...document.querySelectorAll('.p-body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > c.right + 1 || r.left < c.left - 1); }).length; })()})"""))
                problems = [l for l in page.logs if l.startswith("EXCEPTION")]
                if not info["play"] or not info["prompt"] or not info["widget"]:
                    problems.append("empty screen")
                if info["over"] > 0 or info["wide"]:
                    problems.append("overflow: page +%dpx, %d elements stick out of the card" % (info["over"], info["wide"]))
                if problems:
                    bad.append("%s/%d/%d: %s" % (wid, i, lvl, "; ".join(problems)[:400]))
print("screens opened: %d, with problems: %d" % (n, len(bad)))
print("\n".join(sorted(set(bad))))

# Run through dev/world.sh. Opens every challenge of one world file at every level on a phone-sized
# screen, saves a screenshot of the question and one of the revealed solution, and reports script
# errors, empty screens and content wider than the screen.
import os
base, file, out = os.environ["BASE"], os.environ["FILE"], SHOTS
page.phone()
page.goto(f"{base}/dev/one.html?file={file}#0/1")
count = page.js("world.challenges.length")
only = os.environ.get("ONLY")  # e.g. "3" or "3/2" to limit the run
bad, n = [], 0
for i in range(count):
    for lvl in (1, 2, 3):
        if only and not (f"{i}/{lvl}" == only or str(i) == only):
            continue
        n += 1
        page.logs.clear()
        page.js(f"location.hash = '#{i}/{lvl}'")
        time.sleep(0.25)
        info = json.loads(page.js("""JSON.stringify({prompt: (document.querySelector('.prompt') || {}).textContent || '',
          widget: !!document.querySelector('.wbox > *'), over: document.documentElement.scrollWidth - window.innerWidth,
          wide: (() => { const b = document.querySelector('.p-body'); if (!b) return 0; const c = b.getBoundingClientRect(); return [...document.querySelectorAll('.p-body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > c.right + 1 || r.left < c.left - 1); }).length; })()})"""))
        page.shot(f"{out}/{i}-{lvl}-a.png")
        # reveal the solution: hint until the button turns into "show me the solution", then press it
        for _ in range(8):
            if not page.js("(() => { const b = [...document.querySelectorAll('.p-foot button')].find(b => !b.hidden && /רמז|הפתרון/.test(b.textContent)); if (!b) return false; b.click(); return true; })()"):
                break
            time.sleep(0.05)
        time.sleep(0.15)
        page.js("document.querySelector('.feedback') && document.querySelector('.feedback').scrollIntoView({block: 'end'})")
        page.shot(f"{out}/{i}-{lvl}-b.png")
        problems = [l for l in page.logs if l.startswith("EXCEPTION")]
        if not info["prompt"] or not info["widget"]:
            problems.append("empty screen")
        if info["over"] > 0 or info["wide"]:
            problems.append("overflow: page +%dpx, %d elements stick out of the card" % (info["over"], info["wide"]))
        if problems:
            bad.append("%d/%d: %s" % (i, lvl, "; ".join(problems)[:400]))
print("screens: %d, with problems: %d, screenshots in %s (<challenge>-<level>-a = question, -b = solution)" % (n, len(bad), out))
print("\n".join(bad))

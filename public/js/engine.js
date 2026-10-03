// Runs one challenge: five rounds, hints, checking and feedback.
// A round is { prompt, visual?, widget, check?, answer?, hints, explain, tries?, wrongMsg? }.
// widget is either a widget object (checked with the button) or a factory taking ctx (judges itself).
import { h, pick, range } from './util.js';
import { sfx } from './sound.js';

export const ROUNDS = 5, PASS = 4;
const PRAISE = ['נכון!', 'מעולה!', 'בול!', 'יפה מאוד!', 'כל הכבוד!', 'מדויק!'];

export function play(root, { ch, level, onExit, onDone, onHelp }) {
  let idx = 0, correct = 0, round, widget, tries, hintIdx, open = false, exitArmed = false;
  const seen = new Set();

  const dots = range(ROUNDS, () => h('i'));
  const exitBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'יציאה', onclick: exit }, '✕');
  const prompt = h('div', { class: 'prompt' }), visual = h('div', { class: 'visual' }), wbox = h('div', { class: 'wbox' });
  const fb = h('div', { class: 'feedback', 'aria-live': 'polite' });
  const hintBtn = h('button', { type: 'button', class: 'btn ghost', onclick: hint });
  const checkBtn = h('button', { type: 'button', class: 'btn primary', onclick: check }, 'בדיקה');
  const nextBtn = h('button', { type: 'button', class: 'btn primary', onclick: next });

  root.innerHTML = '';
  root.append(
    h('header', { class: 'p-head' },
      exitBtn,
      h('div', { class: 'p-title' }, h('b', {}, ch.title), h('span', { class: 'lv' }, '★'.repeat(level))),
      h('div', { class: 'dots' }, dots),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'הסבר', onclick: () => onHelp && onHelp() }, '?')),
    h('section', { class: 'p-body' }, prompt, visual, wbox, fb),
    h('footer', { class: 'p-foot' }, hintBtn, checkBtn, nextBtn));

  function exit() {
    if (!exitArmed && idx > 0) {
      exitArmed = true;
      exitBtn.textContent = 'לצאת?';
      exitBtn.classList.add('armed');
      return setTimeout(() => {
        exitArmed = false;
        exitBtn.textContent = '✕';
        exitBtn.classList.remove('armed');
      }, 2500);
    }
    onExit();
  }

  const ctx = { mistake: msg => open && miss(msg), solved: () => open && win() };

  function start() {
    let r;
    for (let t = 0; t < 12; t++) {
      r = ch.gen(level);
      const sig = r.prompt + (r.visual || '') + (typeof r.widget === 'function' ? r.sig || '' : r.widget.el.textContent) + JSON.stringify(r.answer || '');
      if (!seen.has(sig) || t === 11) {
        seen.add(sig);
        break;
      }
    }
    round = r;
    tries = hintIdx = 0;
    open = true;
    prompt.innerHTML = r.prompt;
    visual.innerHTML = r.visual || '';
    widget = typeof r.widget === 'function' ? r.widget(ctx) : r.widget;
    wbox.innerHTML = '';
    wbox.append(widget.el);
    play.current = { round, widget }; // read by dev/e2e.html
    fb.className = 'feedback';
    fb.innerHTML = '';
    checkBtn.hidden = typeof r.widget === 'function';
    nextBtn.hidden = true;
    hintBtn.hidden = false;
    labelHint();
    dots.forEach((d, i) => d.classList.toggle('now', i === idx));
  }

  const hints = () => round.hints || [];
  const labelHint = () => (hintBtn.textContent = hintIdx < hints().length ? '💡 רמז' : 'הראו לי את הפתרון');
  const shownHints = () => hints().slice(0, hintIdx).map(t => `<div class="hint">💡 ${t}</div>`).join('');

  function hint() {
    if (!open) return;
    if (hintIdx >= hints().length) return lose();
    hintIdx++;
    fb.className = 'feedback info';
    fb.innerHTML = shownHints();
    labelHint();
  }

  function check() {
    if (!open || typeof round.widget === 'function') return;
    const v = widget.value();
    if (v == null) {
      fb.className = 'feedback info';
      fb.innerHTML = '<b>עוד לא סיימתם לענות.</b>' + shownHints();
      return;
    }
    if (round.check(v)) return win();
    miss(round.wrongMsg && round.wrongMsg(v));
  }

  function miss(msg) {
    tries++;
    sfx('bad');
    wbox.classList.remove('shake');
    void wbox.offsetWidth;
    wbox.classList.add('shake');
    if (tries >= (round.tries || 2)) return lose();
    if (hintIdx < hints().length) hintIdx++;
    fb.className = 'feedback warn';
    fb.innerHTML = `<b>לא בדיוק, נסו שוב.</b> ${msg || ''}${shownHints()}`;
    labelHint();
  }

  function finish(ok) {
    open = false;
    if (widget.lock) widget.lock();
    dots[idx].classList.remove('now');
    dots[idx].classList.add(ok ? 'ok' : 'bad');
    checkBtn.hidden = hintBtn.hidden = true;
    nextBtn.hidden = false;
    nextBtn.textContent = idx === ROUNDS - 1 ? 'סיום' : 'הבא';
    nextBtn.focus({ preventScroll: true });
  }

  function win() {
    correct++;
    sfx('ok');
    fb.className = 'feedback good';
    fb.innerHTML = `<b>${pick(PRAISE)}</b>`;
    finish(true);
  }

  function lose() {
    if (round.answer != null && widget.set) widget.set(round.answer);
    fb.className = 'feedback bad';
    fb.innerHTML = `<b>הפתרון:</b> ${round.explain || ''}`;
    finish(false);
  }

  function next() {
    if (open) return;
    idx++;
    if (idx >= ROUNDS) return onDone(correct);
    start();
  }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!open) {
      if (e.key === 'Enter') {
        e.preventDefault();
        next();
      }
      return;
    }
    if (widget.key && widget.key(e)) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      check();
    }
  }
  document.addEventListener('keydown', onKey);
  start();
  return () => document.removeEventListener('keydown', onKey);
}

// Interactive answer widgets. Each returns { el, value(), set(answer), lock(), key?(event) }.
// Widgets that judge themselves (exprTap, targetBuilder) are factories taking the engine's ctx
// and call ctx.mistake() / ctx.solved() instead of exposing value().
import { h, SYM, M } from './util.js';
import { validOps, applyOp, nextOp, calc, tokHTML } from './expr.js';

// kind: 'd' allows a decimal point, 'n' a minus sign, 'dn' both. len counts those signs too.
export const box = (key, len = 3, opt = false, kind = '') =>
  `<b class="inbox" data-key="${key}" data-len="${len}"${opt ? ' data-opt="1"' : ''}${kind ? ` data-kind="${kind}"` : ''}></b>`;
export const fbox = (n = 'n', d = 'd', len = 3) => `<span class="frac fin">${box(n, len)}${box(d, len)}</span>`;

function keypad(type, multi, onOk, { dec = false, neg = false } = {}) {
  const kp = h('div', { class: 'keypad', dir: 'ltr' });
  const key = (label, k, cls, aria) =>
    h('button', { type: 'button', class: cls, 'aria-label': aria, onclick: () => (typeof k === 'function' ? k() : type(k)) }, label);
  for (const k of '12345') kp.append(key(k, k));
  kp.append(key('⌫', 'del', 'k-fn', 'מחיקה'));
  for (const k of '67890') kp.append(key(k, k));
  if (onOk) kp.append(key('✓', onOk, 'k-fn k-ok', 'אישור'));
  else if (multi) kp.append(key('⇥', 'next', 'k-fn', 'התיבה הבאה'));
  if (dec) kp.append(key('.', '.', 'k-fn k-wide', 'נקודה עשרונית'));
  if (neg) kp.append(key('−', '-', 'k-fn k-wide', 'סימן מינוס'));
  return kp;
}

// Any HTML with box() placeholders becomes a set of number fields with an on-screen keypad.
export function inputs(html, { onOk } = {}) {
  const body = h('div', { class: 'w-body', html });
  const boxes = [...body.querySelectorAll('.inbox')];
  const vals = boxes.map(() => '');
  const kinds = boxes.map(b => b.dataset.kind || '');
  let cur = 0, locked = false;
  const paint = () =>
    boxes.forEach((b, i) => {
      b.textContent = vals[i];
      b.classList.toggle('on', !locked && i === cur);
    });
  const type = k => {
    if (locked || !boxes.length) return;
    const len = +boxes[cur].dataset.len;
    if (k === 'del') {
      if (!vals[cur] && cur > 0) cur--;
      vals[cur] = vals[cur].slice(0, -1);
    } else if (k === 'next') cur = (cur + 1) % boxes.length;
    else if (k === '.') {
      if (kinds[cur].includes('d') && !vals[cur].includes('.') && vals[cur].length < len) vals[cur] += '.';
    } else if (k === '-') {
      if (kinds[cur].includes('n')) vals[cur] = vals[cur].startsWith('−') ? vals[cur].slice(1) : '−' + vals[cur];
    } else if (len === 1) {
      vals[cur] = k;
      const nx = vals.findIndex((v, i) => i > cur && v === '');
      if (nx >= 0) cur = nx;
    } else if (vals[cur].length < len) vals[cur] += k;
    paint();
  };
  boxes.forEach((b, i) =>
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (locked) return;
      cur = i;
      paint();
    })
  );
  const el = h('div', { class: 'w-inputs' }, body, keypad(type, boxes.length > 1, onOk, { dec: kinds.some(k => k.includes('d')), neg: kinds.some(k => k.includes('n')) }));
  paint();
  return {
    el,
    value() {
      const o = {};
      for (let i = 0; i < boxes.length; i++) {
        const d = boxes[i].dataset;
        if (vals[i] === '' && !d.opt) return null;
        const v = Number(vals[i].replace('−', '-'));
        if (vals[i] !== '' && !Number.isFinite(v)) return null; // a lone '.' or '−'
        o[d.key] = v;
      }
      return o;
    },
    set(a) {
      boxes.forEach((b, i) => (vals[i] = a[b.dataset.key] != null ? String(a[b.dataset.key]).replace('-', '−') : ''));
      paint();
    },
    clear() {
      vals.fill('');
      cur = 0;
      paint();
    },
    key(e) {
      if (/^\d$/.test(e.key) || e.key === '.' || e.key === '-') type(e.key);
      else if (e.key === 'Backspace') type('del');
      else if (e.key === 'Tab' || e.key === ' ') type('next');
      else if (e.key === 'Enter') {
        const empty = vals.findIndex((v, i) => v === '' && !boxes[i].dataset.opt);
        if (empty < 0) return false;
        cur = empty;
        paint();
      } else return false;
      e.preventDefault();
      return true;
    },
    lock() {
      locked = true;
      el.classList.add('locked');
      paint();
    },
  };
}

export function choice(options, { multi = false, cols = 0, cls = '' } = {}) {
  const sel = new Set();
  let locked = false;
  const el = h('div', { class: `w-choice ${cls}`, style: cols ? `grid-template-columns:repeat(${cols},1fr)` : null });
  const btns = options.map((o, i) =>
    h('button', {
      type: 'button', class: 'opt', html: o,
      onclick: () => {
        if (locked) return;
        if (multi) sel.has(i) ? sel.delete(i) : sel.add(i);
        else {
          sel.clear();
          sel.add(i);
        }
        paint();
      },
    })
  );
  const paint = () => btns.forEach((b, i) => b.classList.toggle('sel', sel.has(i)));
  el.append(...btns);
  const sorted = () => [...sel].sort((a, b) => a - b);
  return {
    el,
    value: () => (multi ? sorted() : sel.size ? sorted()[0] : null),
    set(a) {
      sel.clear();
      [].concat(a).forEach(i => sel.add(i));
      paint();
    },
    lock() {
      locked = true;
      el.classList.add('locked');
    },
  };
}

// A pizza the player cuts into slices and colours.
export function fracBuilder({ den = 2, fixed = false, min = 2, max = 12 } = {}) {
  let d = den, locked = false;
  const on = new Set();
  const pie = h('div', { class: 'fb-pie' });
  const count = h('b', {}, String(d));
  const draw = () => {
    let s = '<svg viewBox="-106 -106 212 212"><circle r="104" class="crust"/>';
    for (let i = 0; i < d; i++) {
      const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / d, a1 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / d;
      const p = a => `${(96 * Math.cos(a)).toFixed(2)} ${(96 * Math.sin(a)).toFixed(2)}`;
      s += `<path data-i="${i}" class="slice${on.has(i) ? ' on' : ''}" d="M0 0L${p(a0)}A96 96 0 0 1 ${p(a1)}Z"/>`;
    }
    pie.innerHTML = s + '</svg>';
    count.textContent = String(d);
  };
  pie.addEventListener('click', e => {
    const i = e.target.dataset && e.target.dataset.i;
    if (locked || i == null) return;
    on.has(+i) ? on.delete(+i) : on.add(+i);
    draw();
  });
  const step = by => () => {
    if (locked) return;
    d = Math.min(max, Math.max(min, d + by));
    on.clear();
    draw();
  };
  const ctl = fixed ? null : h('div', { class: 'fb-ctl' },
    h('button', { type: 'button', class: 'round', 'aria-label': 'פחות פרוסות', onclick: step(-1) }, '−'),
    h('span', {}, 'פרוסות: ', count),
    h('button', { type: 'button', class: 'round', 'aria-label': 'עוד פרוסות', onclick: step(1) }, '+'));
  draw();
  return {
    el: h('div', { class: 'w-frac' }, pie, ctl),
    value: () => ({ n: on.size, d }),
    set(a) {
      d = a.d;
      on.clear();
      for (let i = 0; i < a.n; i++) on.add(i);
      draw();
    },
    lock() {
      locked = true;
    },
  };
}

export function lineSVG({ max, div, mark = null, hits = false }) {
  const n = max * div, x = k => 30 + (k * 580) / n;
  let s = '<svg viewBox="0 0 640 100" class="nline"><line x1="14" y1="52" x2="626" y2="52" class="axis"/>';
  for (let k = 0; k <= n; k++) {
    const major = k % div === 0;
    s += `<line x1="${x(k)}" y1="${major ? 32 : 41}" x2="${x(k)}" y2="${major ? 72 : 63}" class="tick${major ? ' major' : ''}"/>`;
    if (major) s += `<text x="${x(k)}" y="94" class="tlabel">${k / div}</text>`;
  }
  if (mark != null) s += `<g transform="translate(${x(mark)} 52)" class="marker"><path d="M0 -12L-9 -30L9 -30Z"/><circle r="9"/></g>`;
  // tap zones reach halfway to the next tick, but never past the picture's edges
  if (hits)
    for (let k = 0; k <= n; k++) {
      const l = Math.max(0, x(k) - 290 / n), r = Math.min(640, x(k) + 290 / n);
      s += `<rect data-k="${k}" x="${l.toFixed(1)}" y="4" width="${(r - l).toFixed(1)}" height="92" class="hit"/>`;
    }
  return s + '</svg>';
}

export function numLine({ max = 1, div = 4 } = {}) {
  let k = null, locked = false;
  const el = h('div', { class: 'w-line', dir: 'ltr' });
  const draw = () => (el.innerHTML = lineSVG({ max, div, mark: k, hits: true }));
  el.addEventListener('click', e => {
    const v = e.target.dataset && e.target.dataset.k;
    if (locked || v == null) return;
    k = +v;
    draw();
  });
  draw();
  return { el, value: () => k, set(a) { k = a; draw(); }, lock() { locked = true; } };
}

// A grid of cells the player paints by tapping or dragging. Cells are "row,col" strings.
export function gridPaint({ rows, cols, locked = [], mirror = null } = {}) {
  const lock = new Set(locked), on = new Set();
  let frozen = false, mode = null;
  const grid = h('div', { class: 'grid', dir: 'ltr', style: `grid-template-columns:repeat(${cols},1fr);max-width:${cols * 46}px` });
  const cells = {};
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const k = `${r},${c}`;
      grid.append((cells[k] = h('i', { class: 'gcell' + (lock.has(k) ? ' lock' : ''), 'data-k': k })));
    }
  if (mirror) {
    const ln = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    const lines = (mirror === 'v' || mirror === 'both' ? ln(cols / 2, 0, cols / 2, rows) : '') +
      (mirror === 'h' || mirror === 'both' ? ln(0, rows / 2, cols, rows / 2) : '') +
      (mirror === 'diag' ? ln(0, 0, cols, rows) : '');
    grid.append(h('div', { class: 'g-over', html: `<svg viewBox="0 0 ${cols} ${rows}" preserveAspectRatio="none">${lines}</svg>` }));
  }
  const paint = k => {
    if (lock.has(k)) return;
    mode ? on.add(k) : on.delete(k);
    cells[k].classList.toggle('on', mode);
  };
  const at = e => {
    const t = document.elementFromPoint(e.clientX, e.clientY);
    const c = t && t.closest && t.closest('.gcell');
    return c && grid.contains(c) ? c.dataset.k : null;
  };
  grid.addEventListener('pointerdown', e => {
    const k = at(e);
    if (frozen || !k || lock.has(k)) return;
    e.preventDefault();
    mode = !on.has(k);
    paint(k);
    if (grid.setPointerCapture) try { grid.setPointerCapture(e.pointerId); } catch {}
  });
  grid.addEventListener('pointermove', e => {
    if (mode == null || frozen) return;
    const k = at(e);
    if (k) paint(k);
  });
  const stop = () => (mode = null);
  grid.addEventListener('pointerup', stop);
  grid.addEventListener('pointercancel', stop);
  const clear = () => {
    on.forEach(k => cells[k].classList.remove('on'));
    on.clear();
  };
  const el = h('div', { class: 'w-grid' }, grid,
    h('button', { type: 'button', class: 'btn tiny', onclick: () => !frozen && clear() }, '↺ ניקוי'));
  return {
    el,
    value: () => [...on].sort(),
    set(a) {
      clear();
      a.forEach(k => {
        on.add(k);
        cells[k].classList.add('on');
      });
    },
    lock() {
      frozen = true;
    },
  };
}

const rc = k => k.split(',').map(Number);
export function rectOf(keys) {
  if (!keys.length) return null;
  const rs = keys.map(k => rc(k)[0]), cs = keys.map(k => rc(k)[1]);
  const hgt = Math.max(...rs) - Math.min(...rs) + 1, w = Math.max(...cs) - Math.min(...cs) + 1;
  return hgt * w === keys.length ? { w, h: hgt } : null;
}
export function perimOf(keys) {
  const s = new Set(keys);
  let p = 0;
  for (const k of keys) {
    const [r, c] = rc(k);
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!s.has(`${r + dr},${c + dc}`)) p++;
  }
  return p;
}
export function connected(keys) {
  if (!keys.length) return false;
  const s = new Set(keys), seen = new Set([keys[0]]), q = [keys[0]];
  while (q.length) {
    const [r, c] = rc(q.pop());
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${r + dr},${c + dc}`;
      if (s.has(k) && !seen.has(k)) {
        seen.add(k);
        q.push(k);
      }
    }
  }
  return seen.size === s.size;
}

// The player taps the operation to perform next; with compute they also type its result.
export function exprTap(tokens, { compute = false } = {}) {
  return ctx => {
    let T = tokens, locked = false, pend = null, mini = null;
    const hist = h('div', { class: 'chain', dir: 'ltr' }), line = h('div', { class: 'expr', dir: 'ltr' }), sub = h('div', { class: 'expr-sub' });
    const el = h('div', { class: 'w-expr' }, hist, line, sub);
    const draw = () => {
      line.innerHTML = '';
      if (hist.children.length) line.append(h('span', { class: 'tk o' }, '='));
      T.forEach((t, i) => {
        const hot = pend && i >= pend.r.from && i <= pend.r.to ? ' hot' : '';
        if (t.t === 'o' || t.t === 'p')
          line.append(h('button', { type: 'button', class: `tk ${t.t} tap${hot}`, onclick: () => tap(i) }, t.t === 'o' ? SYM[t.v] : t.v === 2 ? '²' : '³'));
        else line.append(h('span', { class: `tk ${t.t === 'n' ? 'n' : 'b'}${hot}` }, t.t === 'n' ? String(t.v) : t.t));
      });
    };
    const commit = r => {
      hist.append(h('div', { class: 'chain-line', html: (hist.children.length ? '<span class="tk o">=</span>' : '') + tokHTML(T) }));
      T = r.tokens;
      pend = mini = null;
      sub.innerHTML = '';
      draw();
      if (T.length === 1) {
        locked = true;
        line.classList.add('final');
        ctx.solved();
      }
    };
    const submit = () => {
      const v = mini && mini.value();
      if (!v || locked) return;
      if (v.v === pend.r.res) return commit(pend.r);
      mini.clear();
      ctx.mistake('החישוב לא מדויק.');
    };
    const tap = i => {
      if (locked || pend) return;
      if (!validOps(T).includes(i)) return ctx.mistake('הפעולה הזאת עוד לא בתור.');
      const r = applyOp(T, i), t = T[i];
      if (!compute) return commit(r);
      pend = { r };
      draw();
      const q = t.t === 'p' ? `${T[i - 1].v}<sup>${t.v}</sup>` : `${T[i - 1].v} ${SYM[t.v]} ${T[i + 1].v}`;
      mini = inputs(M(`${q} = ${box('v', 4)}`), { onOk: submit });
      sub.innerHTML = '';
      sub.append(mini.el);
    };
    draw();
    return {
      el,
      // plays the textbook solution; used by the self-test
      auto() {
        while (!locked) {
          tap(nextOp(T));
          if (compute) {
            mini.set({ v: pend.r.res });
            submit();
          }
        }
      },
      key(e) {
        if (!mini) return false;
        if (e.key === 'Enter') {
          submit();
          return true;
        }
        return mini.key(e);
      },
      lock() {
        locked = true;
        if (mini) mini.lock();
      },
    };
  };
}

// Tap two numbers to wrap everything between them in parentheses.
export function parenPlace(nums, ops, target) {
  let a = null, b = null, locked = false;
  const line = h('div', { class: 'expr', dir: 'ltr' });
  const span = () => (a != null && b != null ? [Math.min(a, b), Math.max(a, b)] : null);
  const tap = k => {
    if (locked) return;
    if (a == null || b != null) [a, b] = [k, null];
    else if (k !== a) b = k;
    else a = null;
    draw();
  };
  const draw = () => {
    line.innerHTML = '';
    const sp = span();
    nums.forEach((v, k) => {
      if (sp && k === sp[0]) line.append(h('span', { class: 'tk b add' }, '('));
      line.append(h('button', { type: 'button', class: 'tk n tap' + (k === a || k === b ? ' sel' : ''), onclick: () => tap(k) }, String(v)));
      if (sp && k === sp[1]) line.append(h('span', { class: 'tk b add' }, ')'));
      if (k < ops.length) line.append(h('span', { class: 'tk o' }, SYM[ops[k]]));
    });
    line.append(h('span', { class: 'tk o' }, '='), h('span', { class: 'tk n res' }, String(target)));
  };
  draw();
  return {
    el: h('div', { class: 'w-expr' }, line, h('p', { class: 'tip' }, 'לחצו על המספר הראשון ועל המספר האחרון שבתוך הסוגריים.')),
    value: span,
    set(v) {
      [a, b] = v;
      draw();
    },
    lock() {
      locked = true;
    },
  };
}

// An expression with missing operators; each blank cycles through the allowed ones.
export function opFill(T, target, allowed = '+-*/') {
  const blanks = T.map((t, i) => (t.t === 'o' && t.v == null ? i : -1)).filter(i => i >= 0);
  const vals = blanks.map(() => null);
  let locked = false;
  const line = h('div', { class: 'expr', dir: 'ltr' });
  const draw = () => {
    line.innerHTML = '';
    T.forEach((t, i) => {
      const bi = blanks.indexOf(i);
      if (bi < 0) return line.append(h('span', { html: tokHTML([t]) }).firstChild);
      line.append(h('button', {
        type: 'button', class: 'tk o blank' + (vals[bi] ? ' set' : ''),
        onclick: () => {
          if (locked) return;
          vals[bi] = allowed[(allowed.indexOf(vals[bi]) + 1) % allowed.length];
          draw();
        },
      }, vals[bi] ? SYM[vals[bi]] : '?'));
    });
    line.append(h('span', { class: 'tk o' }, '='), h('span', { class: 'tk n res' }, String(target)));
  };
  draw();
  return {
    el: h('div', { class: 'w-expr' }, line, h('p', { class: 'tip' }, 'לחצו על עיגול כדי להחליף את הפעולה.')),
    value: () => (vals.includes(null) ? null : [...vals]),
    set(v) {
      v.forEach((o, i) => (vals[i] = o));
      draw();
    },
    lock() {
      locked = true;
    },
  };
}
export const fillOps = (T, vals) => {
  let k = 0;
  return T.map(t => (t.t === 'o' && t.v == null ? { t: 'o', v: vals[k++] } : t));
};

// Combine number tiles two at a time until one tile equals the target.
export function targetBuilder(nums, target, solution = []) {
  return ctx => {
    let tiles, selA = null, op = null, locked = false, timer;
    const msg = h('div', { class: 'tb-msg' }), log = h('div', { class: 'tb-log', dir: 'ltr' });
    const tilesEl = h('div', { class: 'tb-tiles', dir: 'ltr' }), opsEl = h('div', { class: 'tb-ops', dir: 'ltr' });
    const draw = () => {
      tilesEl.innerHTML = '';
      tiles.forEach((v, i) => tilesEl.append(h('button', { type: 'button', class: 'tile' + (i === selA ? ' sel' : ''), onclick: () => tapTile(i) }, String(v))));
      opsEl.innerHTML = '';
      for (const o of '+-*/')
        opsEl.append(h('button', {
          type: 'button', class: 'tk o tap' + (o === op ? ' sel' : ''),
          onclick: () => {
            if (locked) return;
            if (selA == null) return (msg.textContent = 'קודם בוחרים מספר.');
            op = o;
            draw();
          },
        }, SYM[o]));
    };
    const reset = () => {
      clearTimeout(timer);
      tiles = [...nums];
      selA = op = null;
      log.innerHTML = '';
      draw();
    };
    const tapTile = i => {
      if (locked) return;
      msg.textContent = '';
      if (i === selA) selA = op = null;
      else if (selA == null || op == null) selA = i;
      else {
        const a = tiles[selA], b = tiles[i], r = calc(a, op, b);
        if (r == null) {
          msg.textContent = op === '-' ? 'התוצאה יוצאת שלילית. נסו סדר אחר.' : 'החילוק הזה לא יוצא מספר שלם.';
          return;
        }
        log.append(h('span', {}, `${a} ${SYM[op]} ${b} = ${r}`));
        tiles[selA] = r;
        tiles.splice(i, 1);
        selA = op = null;
        if (tiles.length === 1) {
          if (r === target) {
            locked = true;
            draw();
            return ctx.solved();
          }
          msg.textContent = `יצא ${r}, והמטרה היא ${target}. מנסים שוב!`;
          timer = setTimeout(() => !locked && reset(), 1500);
        }
      }
      draw();
    };
    reset();
    return {
      el: h('div', { class: 'w-target' },
        h('div', { class: 'tb-goal' }, 'המטרה: ', h('b', {}, String(target))),
        tilesEl, opsEl, log, msg,
        h('button', { type: 'button', class: 'btn tiny', onclick: () => !locked && reset() }, '↺ מהתחלה')),
      // plays the known solution ([a, op, b] steps); used by the self-test
      auto() {
        for (const [a, o, b] of solution) {
          const i = tiles.indexOf(a);
          tapTile(i);
          op = o;
          tapTile(tiles.findIndex((v, k) => v === b && k !== i));
        }
      },
      lock() {
        locked = true;
        clearTimeout(timer);
      },
    };
  };
}

// A laser the player rotates to a given angle. marks: 'full' shows a protractor, 'axes' only 0/90/180.
export function angleAim({ full = false, marks = 'full' } = {}) {
  let a = 0, locked = false, moved = false, drag = false;
  const R = 128, rad = d => (d * Math.PI) / 180;
  const stage = h('div', { class: 'aim-stage' });
  const draw = () => {
    const x = R * Math.cos(rad(a)), y = -R * Math.sin(rad(a));
    let s = `<svg viewBox="-178 -178 356 ${full ? 356 : 204}" class="angle">`;
    s += full ? '<circle r="136" class="dial"/>' : '<path d="M-136 0A136 136 0 0 1 136 0Z" class="dial"/>';
    for (let t = 0; t < (full ? 360 : 181); t += 10) {
      const major = t % 90 === 0;
      if (marks !== 'full' && !major) continue;
      const c = Math.cos(rad(t)), sn = -Math.sin(rad(t)), r2 = major ? 152 : t % 30 === 0 ? 148 : 143;
      s += `<line x1="${136 * c}" y1="${136 * sn}" x2="${r2 * c}" y2="${r2 * sn}" class="ptick"/>`;
      if ((marks === 'full' && t % 30 === 0) || major) s += `<text x="${166 * c}" y="${166 * sn + 5}" class="plabel">${t}°</text>`;
    }
    s += `<line x1="0" y1="0" x2="${R}" y2="0" class="base"/>`;
    if (a > 0) s += `<path d="M34 0A34 34 0 ${a > 180 ? 1 : 0} 0 ${34 * Math.cos(rad(a))} ${-34 * Math.sin(rad(a))}" class="arc"/>`;
    s += `<line x1="0" y1="0" x2="${x}" y2="${y}" class="beam"/><circle r="11" class="cannon"/><circle cx="${x}" cy="${y}" r="15" class="handle"/></svg>`;
    stage.innerHTML = s;
  };
  const aim = e => {
    const svg = stage.firstChild;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    let d = Math.round((Math.atan2(-p.y, p.x) * 180) / Math.PI);
    if (d < 0) d += 360;
    if (!full && d > 180) d = d > 270 ? 0 : 180;
    a = d;
    moved = true;
    draw();
  };
  stage.addEventListener('pointerdown', e => {
    if (locked) return;
    e.preventDefault();
    drag = true;
    try { stage.setPointerCapture(e.pointerId); } catch {}
    aim(e);
  });
  stage.addEventListener('pointermove', e => drag && !locked && aim(e));
  const stop = () => (drag = false);
  stage.addEventListener('pointerup', stop);
  stage.addEventListener('pointercancel', stop);
  const nudge = by => () => {
    if (locked) return;
    a = Math.min(full ? 359 : 180, Math.max(0, a + by));
    moved = true;
    draw();
  };
  draw();
  return {
    el: h('div', { class: 'w-angle' }, stage,
      h('div', { class: 'fb-ctl', dir: 'ltr' },
        h('button', { type: 'button', class: 'round', 'aria-label': 'מעלה אחת פחות', onclick: nudge(-1) }, '−'),
        h('span', {}, 'כיוון עדין'),
        h('button', { type: 'button', class: 'round', 'aria-label': 'מעלה אחת יותר', onclick: nudge(1) }, '+'))),
    value: () => (moved ? a : null),
    set(v) {
      a = v;
      moved = true;
      draw();
    },
    lock() {
      locked = true;
    },
  };
}

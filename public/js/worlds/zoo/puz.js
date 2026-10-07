// מתחם הינשופים: puzzles for grades 2–3 (level 3 is for gifted children).
import { rnd, pick, shuffle, range, M, h } from '../../util.js';
import { inputs, box, choice } from '../../widgets.js';
import { num, nums } from '../../kit.js';

const sumOf = a => a.reduce((s, x) => s + x, 0);
const digitsOf = n => String(n).split('').map(Number);
const isEven = n => n % 2 === 0;
// Hebrew number words are avoided: digits only, short sentences.

// ---------- shared little widgets ----------

// + and − buttons that put animals on a pan, one at a time. value() is { n } or null while empty.
function counter(icon, max = 20) {
  let n = 0, locked = false;
  const row = h('div', { class: 'zpuz-cnt-row', dir: 'ltr' });
  const shown = h('b', { class: 'zpuz-cnt-n' });
  const btn = (label, d, aria) => h('button', { type: 'button', class: 'zpuz-round', 'aria-label': aria, onclick: () => change(d) }, label);
  const change = d => {
    if (locked) return;
    n = Math.max(0, Math.min(max, n + d));
    paint();
  };
  const paint = () => {
    row.innerHTML = n ? range(n, () => `<span>${icon}</span>`).join('') : '<span class="zpuz-cnt-empty">לחצו + כדי להוסיף</span>';
    shown.textContent = n;
  };
  const el = h('div', { class: 'zpuz-cnt' }, row, h('div', { class: 'zpuz-cnt-ctl', dir: 'ltr' }, btn('−', -1, 'פחות'), shown, btn('+', 1, 'עוד')));
  paint();
  return {
    el,
    value: () => (n ? { n } : null),
    set(a) {
      n = a.n;
      paint();
    },
    key(e) {
      if (e.key === '+' || e.key === 'ArrowUp') change(1);
      else if (e.key === '-' || e.key === 'ArrowDown' || e.key === 'Backspace') change(-1);
      else return false;
      e.preventDefault();
      return true;
    },
    lock() {
      locked = true;
      el.classList.add('locked');
    },
  };
}

// A 3×3 square: tap a number tile, then tap an empty cell (or the other way round).
// Tapping a placed tile sends it back. value() maps 'm<cell>' to the number placed there.
function tileSquare(cells, tiles) {
  const place = cells.map(() => -1); // tile index in each blank cell
  let selTile = -1, selCell = -1, locked = false;
  const cellEls = cells.map((v, i) =>
    v != null ? h('span', { class: 'zpuz-sq giv' }, String(v)) : h('button', { type: 'button', class: 'zpuz-sq slot', onclick: () => tapCell(i) }));
  const tileEls = tiles.map((v, t) => h('button', { type: 'button', class: 'zpuz-tile', onclick: () => tapTile(t) }, String(v)));
  const where = t => place.indexOf(t);
  const put = (t, i) => {
    const old = where(t);
    if (old >= 0) place[old] = -1;
    place[i] = t;
    selTile = selCell = -1;
  };
  function tapTile(t) {
    if (locked) return;
    if (where(t) >= 0) return;
    if (selCell >= 0) put(t, selCell);
    else selTile = selTile === t ? -1 : t;
    paint();
  }
  function tapCell(i) {
    if (locked) return;
    if (selTile >= 0) put(selTile, i);
    else if (place[i] >= 0) place[i] = -1;
    else selCell = selCell === i ? -1 : i;
    paint();
  }
  function paint() {
    cells.forEach((v, i) => {
      if (v != null) return;
      cellEls[i].textContent = place[i] >= 0 ? tiles[place[i]] : '';
      cellEls[i].classList.toggle('full', place[i] >= 0);
      cellEls[i].classList.toggle('sel', selCell === i);
    });
    tileEls.forEach((b, t) => {
      b.classList.toggle('used', where(t) >= 0);
      b.classList.toggle('sel', selTile === t);
    });
  }
  const el = h('div', { class: 'zpuz-tsq' },
    h('div', { class: 'zpuz-sqgrid', dir: 'ltr' }, cellEls),
    h('div', { class: 'zpuz-tiles', dir: 'ltr' }, tileEls));
  paint();
  return {
    el,
    value() {
      const o = {};
      for (let i = 0; i < cells.length; i++) {
        if (cells[i] != null) continue;
        if (place[i] < 0) return null;
        o['m' + i] = tiles[place[i]];
      }
      return o;
    },
    set(a) {
      place.fill(-1);
      const free = tiles.map((_, t) => t);
      cells.forEach((v, i) => {
        if (v != null) return;
        const t = free.find(t => tiles[t] === a['m' + i] && where(t) < 0);
        if (t != null) place[i] = t;
      });
      selTile = selCell = -1;
      paint();
    },
    lock() {
      locked = true;
      selTile = selCell = -1;
      paint();
      el.classList.add('locked');
    },
  };
}

// ---------- 1. patterns ----------
const ANI = ['🐒', '🦁', '🐘', '🦒', '🐧', '🦉', '🐢', '🐰', '🐻', '🐸', '🐟', '🦓'];
const UNITS = { 1: ['AB', 'ABC', 'AAB', 'ABB'], 2: ['AABB', 'ABCD', 'ABAC', 'AABC', 'ABBC', 'ABCC'], 3: ['ABC', 'AAB', 'ABCD', 'AABC', 'ABBC', 'AABB'] };
const strip = items => `<div class="zpuz-strip" dir="ltr">${items.map(x => (x === '?' ? '<span class="zpuz-q">?</span>' : x === '…' ? '<span class="zpuz-dots">…</span>' : `<span>${x}</span>`)).join('')}</div>`;
function picturePattern(L) {
  const unit = pick(UNITS[L]), syms = shuffle(ANI), letters = [...new Set(unit)], map = Object.fromEntries(letters.map((c, i) => [c, syms[i]]));
  const at = i => map[unit[i % unit.length]];
  const opts = shuffle([...letters.map(c => map[c]), syms[letters.length]]);
  const mk = (prompt, visual, ans, hints, explain) => ({
    prompt, visual, hints, explain,
    widget: choice(opts.map(e => `<span class="zpuz-big">${e}</span>`), { cols: opts.length, cls: 'zpuz-emo' }),
    answer: opts.indexOf(ans), check: v => v === opts.indexOf(ans),
  });
  const part = `${range(unit.length, at).join(' ')}`;
  if (L === 1) {
    const n = unit.length * (unit.length === 2 ? 3 : 2) + rnd(0, unit.length - 1);
    return mk('החיות עומדות בתור לפי חוקיות. מי מסתתר מאחורי סימן השאלה?', strip([...range(n, at), '?']), at(n),
      ['מצאו את החלק שחוזר על עצמו שוב ושוב.', `החלק שחוזר הוא: ${part}`], `החלק ${part} חוזר שוב ושוב, ולכן הבא בתור הוא ${at(n)}.`);
  }
  if (L === 2) {
    const n = unit.length * 3, q = unit.length + rnd(0, unit.length - 1);
    return mk('החיות עומדות בתור לפי חוקיות, ואחת מהן התחבאה. מי מסתתר מאחורי סימן השאלה?', strip(range(n, i => (i === q ? '?' : at(i)))), at(q),
      ['מצאו את החלק שחוזר על עצמו. בדקו מה עומד באותו מקום בחלק הקודם.', `החלק שחוזר הוא: ${part}`], `החלק ${part} חוזר שוב ושוב. במקום של סימן השאלה עומד ${at(q)}.`);
  }
  // level 3: far ahead in the line
  const len = unit.length, K = rnd(12, 30), r = (K - 1) % len, full = Math.floor((K - 1) / len);
  return mk(`החיות עומדות בתור ארוך מאוד, וכל הזמן לפי אותה חוקיות. מי עומד במקום ה־${K} בתור?`, strip([...range(2 * len, at), '…']), at(K - 1),
    [`החוקיות חוזרת כל ${len} חיות. המקומות ${len}, ${2 * len}, ${3 * len}... הם תמיד סוף של חלק.`, `${M(`${full} × ${len} = ${full * len}`)}, כלומר במקום ה־${full * len} נגמר חלק שלם. מה בא ${r + 1 === 1 ? 'מיד אחריו' : `${r + 1} מקומות אחריו`}?`],
    `החלק ${part} חוזר כל ${len} חיות. ${M(`${full} × ${len} = ${full * len}`)}, ולכן מקום ${K} הוא המקום ה־${r + 1} בחלק: ${at(K - 1)}.`);
}

// number sequences: each rule returns [term(i), why]
const SEQ = {
  1: [
    () => { const a = rnd(0, 30), d = pick([2, 5, 10]); return [i => a + d * i, `מוסיפים ${d} בכל צעד.`]; },
    () => { const a = rnd(60, 99); return [i => a - 10 * i, 'מורידים 10 בכל צעד.']; },
    () => { const a = rnd(20, 60); return [i => a - 2 * i, 'מורידים 2 בכל צעד.']; },
    () => { const a = rnd(0, 20); return [i => a + 3 * i, 'מוסיפים 3 בכל צעד.']; },
    () => { const a = rnd(1, 4) * 5 + 50; return [i => a - 5 * i, 'מורידים 5 בכל צעד.']; },
  ],
  2: [
    () => { const a = rnd(1, 20), d = pick([3, 4, 6, 7, 8, 9]); return [i => a + d * i, `מוסיפים ${d} בכל צעד.`]; },
    () => { const d = pick([3, 4, 6]), a = rnd(40, 80); return [i => a - d * i, `מורידים ${d} בכל צעד.`]; },
    () => { const a = rnd(0, 6) * 5; return [i => a + 25 * i, 'מוסיפים 25 בכל צעד.']; },
    () => { const a = rnd(10, 40) * 10 + rnd(0, 9), d = pick([50, 100]); return [i => a + d * i, `מוסיפים ${d} בכל צעד.`]; },
    () => { const a = rnd(1, 3); return [i => a * 2 ** i, 'מכפילים ב־2 בכל צעד (כל מספר הוא כפול מהקודם).']; },
    () => { const a = rnd(700, 999); return [i => a - 100 * i, 'מורידים 100 בכל צעד.']; },
  ],
  3: [
    () => { const p = rnd(3, 9), q = rnd(1, p - 1), a = rnd(1, 20); return [i => a + Math.ceil(i / 2) * p - Math.floor(i / 2) * q, `לסירוגין: מוסיפים ${p}, ואחר כך מורידים ${q}.`]; },
    () => { const a = rnd(1, 20), k = rnd(1, 2); return [i => a + (k * i * (i + 1)) / 2, `מה שמוסיפים גדל בכל צעד: ${k}, ${2 * k}, ${3 * k}, ${4 * k}...`]; },
    () => { const t = [rnd(1, 3), rnd(1, 4)]; for (let i = 2; i < 7; i++) t.push(t[i - 1] + t[i - 2]); return [i => t[i], 'כל מספר הוא הסכום של שני המספרים שלפניו.']; },
    () => { const a = rnd(1, 3); return [i => a * 3 ** i, 'מכפילים ב־3 בכל צעד.']; },
    () => { const a = rnd(1, 9), b = rnd(40, 60), d = rnd(2, 5), e = rnd(2, 5); return [i => (i % 2 ? b - (e * (i - 1)) / 2 : a + (d * i) / 2), `שתי סדרות שזורות זו בזו: במקומות הראשון, השלישי, החמישי... מוסיפים ${d}, ובמקומות השני, הרביעי... מורידים ${e}.`]; },
    () => { const s = rnd(1, 3); return [i => (i + s) * (i + s), `מספר כפול עצמו: ${M(`${s} × ${s}`)}, ${M(`${s + 1} × ${s + 1}`)}, ${M(`${s + 2} × ${s + 2}`)}...`]; },
  ],
};
function numberSeq(L) {
  const [term, why] = pick(SEQ[L])(), n = 6, t = range(n, term);
  const gaps = L === 1 ? [pick([2, 3, 5])] : L === 2 ? [rnd(1, 3), 5] : pick([[1, 4], [2, 5], [0, 5], [3, 4]]);
  const html = t.map((v, i) => (gaps.includes(i) ? box('g' + gaps.indexOf(i), String(v).length + 1) : `<span>${v}</span>`)).join('<span class="c">,</span>');
  const answer = Object.fromEntries(gaps.map((g, k) => ['g' + k, t[g]]));
  return {
    prompt: gaps.length > 1 ? 'גלו את החוקיות והשלימו את המספרים החסרים.' : 'גלו את החוקיות והשלימו את המספר החסר.',
    widget: inputs(`<div class="seq zpuz-seq">${html}</div>`), answer, check: v => gaps.every((g, k) => v['g' + k] === t[g]),
    hints: L === 1 ? ['בדקו בכמה המספר גדל או קטן מצעד לצעד.', why] : ['חשבו את ההפרש בין כל שני מספרים שכנים. האם הוא תמיד אותו דבר? ואם לא, איך הוא משתנה?', why],
    explain: `${why} הסדרה המלאה: ${M(t.join(', '))}.`,
  };
}

// growing patterns: the picture at steps 1, 2, 3
const GROW_EMO = ['🐾', '🥚', '🍌', '🐟', '🌸'];
function growPattern(L) {
  const e = pick(GROW_EMO);
  const kind = L === 2 ? 'lin' : pick(['lin', 'lin', 'back', 'sq', 'tri']);
  const a = rnd(1, 4), d = rnd(2, 4);
  const shape = {
    lin: k => [a, ...range(k - 1, () => d)],
    back: k => [a, ...range(k - 1, () => d)],
    sq: k => range(k, () => k),
    tri: k => range(k, i => i + 1),
  }[kind];
  const count = k => sumOf(shape(k));
  const pic = range(3, i => i + 1).map(k => `<div class="zpuz-gstep"><div class="zpuz-gpic">${shape(k).map(n => `<div>${e.repeat(n)}</div>`).join('')}</div><small>שלב ${k}</small></div>`).join('');
  const visual = `<div class="zpuz-grow">${pic}</div>`;
  if (kind === 'back') {
    const K = rnd(6, 12), N = count(K);
    return num({
      prompt: `בכל שלב הציור גדל לפי אותה חוקיות. באיזה שלב יהיו בדיוק ${N} ${e}?`, visual, answer: K,
      hints: [`בשלב 1 יש ${a}, ובכל שלב נוספים ${d}.`, `כמה פעמים צריך להוסיף ${d} כדי להגיע מ־${a} ל־${N}? ${M(`${N} − ${a} = ${N - a}`)}.`],
      explain: `${M(`${N - a} ÷ ${d} = ${K - 1}`)} תוספות אחרי שלב 1, כלומר שלב ${K}. בדיקה: ${M(`${a} + ${K - 1} × ${d} = ${N}`)}.`,
    });
  }
  const K = kind === 'lin' ? (L === 2 ? rnd(4, 6) : rnd(9, 12)) : rnd(5, 6), N = count(K);
  const why = { lin: `בשלב 1 יש ${a}, ובכל שלב נוספים ${d}.`, sq: `בכל שלב יש ריבוע: בשלב 2 יש 2 שורות של 2, בשלב 3 יש 3 שורות של 3.`, tri: 'בכל שלב נוספת שורה חדשה, ארוכה באחד מהשורה שמעליה: 1, 2, 3...' }[kind];
  const how = {
    lin: `${M(`${a} + ${K - 1} × ${d} = ${N}`)}`,
    sq: M(`${K} × ${K} = ${N}`),
    tri: M(`${range(K, i => i + 1).join(' + ')} = ${N}`),
  }[kind];
  return num({
    prompt: `בכל שלב הציור גדל לפי אותה חוקיות. כמה ${e} יהיו בשלב ${K}?`, visual, answer: N,
    hints: kind === 'lin' ? [why, `משלב 1 עד שלב ${K} מוסיפים ${d} בדיוק ${K - 1} פעמים.`] : [why, kind === 'sq' ? `בשלב ${K} יש ${K} שורות של ${K}.` : `בשלב ${K} יש ${K} שורות: ${range(K, i => i + 1).join(', ')}.`],
    explain: `${why} בשלב ${K}: ${how}.`,
  });
}
const patterns = {
  id: 'zpuz-seq', title: 'סדרות ודפוסים',
  intro: `<p>בכל סדרה מסתתרת חוקיות: משהו שחוזר שוב ושוב, או מספר שמוסיפים או מורידים בכל צעד. מגלים את החוקיות וממשיכים.</p>
    <div class="ex">🐒 🦁 🐒 🦁 🐒 ← אחרי הקוף בא האריה 🦁.<br>${M('5, 10, 15, 20, ?')} ← מוסיפים 5 בכל צעד, אז החסר הוא 25.</div>
    <p>יש גם ציורים שגדלים משלב לשלב. בודקים כמה נוסף בכל שלב.</p>`,
  gen(L) {
    const r = Math.random();
    if (L === 1) return r < 0.5 ? picturePattern(1) : numberSeq(1);
    if (L === 2) return r < 0.3 ? picturePattern(2) : r < 0.55 ? growPattern(2) : numberSeq(2);
    return r < 0.3 ? picturePattern(3) : r < 0.6 ? growPattern(3) : numberSeq(3);
  },
};

// ---------- 2. balance scales with animals ----------
const BEASTS = {
  big: [['🐘', 'פיל', 'פילים']],
  mid: [['🦁', 'אריה', 'אריות'], ['🐻', 'דוב', 'דובים'], ['🐯', 'נמר', 'נמרים']],
  small: [['🐒', 'קוף', 'קופים'], ['🐧', 'פינגווין', 'פינגווינים'], ['🐰', 'ארנב', 'ארנבים'], ['🐢', 'צב', 'צבים']],
};
const anyBeast = () => pick([...BEASTS.big, ...BEASTS.mid, ...BEASTS.small]);
// items: an emoji string, a number (a weight) or '?' (an empty place to fill)
function zscale(left, right, ask = false) {
  const pan = (items, cx) => {
    let s = `<path d="M${cx - 84} 150L${cx + 84} 150L${cx + 66} 164L${cx - 66} 164Z" class="zpuz-pan"/><line x1="${cx}" y1="164" x2="${cx}" y2="178" class="zpuz-rod"/>`;
    items.forEach((it, i) => {
      const row = Math.floor(i / 5), inRow = Math.min(5, items.length - row * 5);
      const x = cx + ((i % 5) - (inRow - 1) / 2) * 33, y = 149 - row * 33;
      if (typeof it === 'number') s += `<g transform="translate(${x} ${y})"><rect x="-14" y="-26" width="28" height="26" rx="5" class="zpuz-wt"/><text y="-7" class="zpuz-wtt">${it}</text></g>`;
      else if (it === '?') s += `<g transform="translate(${x} ${y})"><circle cy="-14" r="13" class="zpuz-qc"/><text y="-7" class="zpuz-qt">?</text></g>`;
      else s += `<text x="${x}" y="${y - 3}" class="zpuz-em">${it}</text>`;
    });
    return s;
  };
  const top = 112 - 33 * (Math.ceil(Math.max(left.length, right.length, 1) / 5) - 1);
  const mark = ask ? '<circle cx="210" cy="150" r="17" class="zpuz-ask"/><text x="210" y="158" class="zpuz-askt">?</text>' : '';
  return `<svg viewBox="0 ${top} 420 ${210 - top}" class="zpuz-scale" style="max-width:420px">${pan(left, 110)}${pan(right, 310)}<line x1="110" y1="178" x2="310" y2="178" class="zpuz-beam"/><path d="M210 178L192 206L228 206Z" class="zpuz-base"/>${mark}</svg>`;
}
const reps = (e, n) => range(n, () => e);
const scales = {
  id: 'zpuz-scale', title: 'מאזניים עם חיות',
  intro: `<p>המאזניים מאוזנים כשמה שבצד אחד שוקל בדיוק כמו מה שבצד השני. כל החיות מאותו סוג שוקלות אותו דבר.</p>
    <div class="ex">🐘 = 🐒🐒🐒: פיל שוקל כמו 3 קופים.<br>לכן 2 פילים שוקלים כמו ${M('3 + 3 = 6')} קופים.</div>
    <p>טריק: מותר להוריד אותו דבר משני הצדדים, והמאזניים נשארים מאוזנים. כשצריך להניח חיות על המאזניים, לחצו + ו־−.</p>`,
  gen(L) {
    const t = rnd(0, 2);
    if (L === 1) {
      if (t === 0) {
        const [e, s] = anyBeast(), k = rnd(2, 4), x = rnd(2, 10);
        return num({
          prompt: `המאזניים מאוזנים. כמה שוקל ${s} ${e} אחד?`, visual: zscale(reps(e, k), [k * x]), answer: x,
          hints: [`${k} ${e} שוקלים יחד ${k * x}. חלקו את המשקל שווה בשווה.`, `איזה מספר כפול ${k} נותן ${k * x}?`], explain: `${M(`${k * x} ÷ ${k} = ${x}`)}, כי ${M(`${k} × ${x} = ${k * x}`)}.`,
        });
      }
      if (t === 1) {
        const [e, s] = anyBeast(), w = rnd(2, 9), x = rnd(3, 15);
        return num({
          prompt: `המאזניים מאוזנים. כמה שוקל ${s} ${e}?`, visual: zscale([e, w], [x + w]), answer: x,
          hints: [`הורידו ${w} משני הצדדים.`, `נשאר: ${e} שוקל כמו ${M(`${x + w} − ${w}`)}.`], explain: M(`${x + w} − ${w} = ${x}`),
        });
      }
      const [E, s1, p1] = pick([...BEASTS.big, ...BEASTS.mid]), [e, , p2] = pick(BEASTS.small), m = rnd(2, 4), n = rnd(2, 3);
      return {
        prompt: `${s1} ${E} אחד שוקל כמו ${m} ${p2}. כמה ${p2} ${e} צריך כדי לאזן ${n} ${p1}?`, visual: zscale([E], reps(e, m)) + zscale(reps(E, n), ['?']),
        widget: counter(e), answer: { n: m * n }, check: v => v.n === m * n,
        hints: [`כל ${s1} מאוזן על ידי ${m} ${p2}.`, `${n} ${p1}: ${range(n, () => m).join(' + ')}.`], explain: `${M(`${range(n, () => m).join(' + ')} = ${m * n}`)} ${p2}.`,
      };
    }
    if (L === 2) {
      if (t === 0) {
        const [E, s1] = BEASTS.big[0], [D, s2, p2] = pick(BEASTS.mid), [e, , p3] = pick(BEASTS.small), a = rnd(2, 3), b = rnd(2, a === 2 ? 4 : 3);
        return {
          prompt: `שני המאזניים מאוזנים. כמה ${p3} ${e} שוקלים כמו ${s1} ${E} אחד?`, visual: zscale([E], reps(D, a)) + zscale([D], reps(e, b)),
          widget: counter(e), answer: { n: a * b }, check: v => v.n === a * b,
          hints: [`החליפו כל ${D} ב־${b} ${p3}.`, `${s1} שוקל כמו ${a} ${p2}, וכל אחד מהם כמו ${b} ${p3}.`], explain: `${E} = ${a} ${D}, ו־${D} = ${b} ${e}. לכן ${M(`${a} × ${b} = ${a * b}`)} ${p3}.`,
        };
      }
      if (t === 1) {
        const [e, s] = anyBeast(), a = rnd(2, 4), b = rnd(1, a - 1), x = rnd(2, 9), w1 = rnd(1, 8), w2 = (a - b) * x + w1;
        return num({
          prompt: `המאזניים מאוזנים. כמה שוקל ${s} ${e} אחד?`, visual: zscale([...reps(e, a), w1], [...reps(e, b), w2]), answer: x,
          hints: [`הורידו ${b === 1 ? `${e} אחד` : `${b} ${e}`} משני הצדדים, וגם ${w1} משני הצדדים.`, `נשאר: ${a - b === 1 ? `${e} אחד שוקל` : `${a - b} ${e} שוקלים`} ${M(`${w2} − ${w1} = ${w2 - w1}`)}.`],
          explain: a - b === 1 ? M(`${w2} − ${w1} = ${x}`) : `${M(`${w2} − ${w1} = ${w2 - w1}`)}, ו־${M(`${w2 - w1} ÷ ${a - b} = ${x}`)}.`,
        });
      }
      const [D, s2] = pick([...BEASTS.big, ...BEASTS.mid]), [e, s3, p3] = pick(BEASTS.small), m = rnd(2, 5), w = rnd(2, 9);
      return num({
        prompt: `${s3} ${e} אחד שוקל ${w}. המאזניים מאוזנים. כמה שוקל ${s2} ${D}?`, visual: zscale([D], reps(e, m)) + zscale([e], [w]), answer: m * w,
        hints: [`${s2} שוקל כמו ${m} ${p3}.`, `כל אחד מהם שוקל ${w}: ${range(m, () => w).join(' + ')}.`], explain: M(`${m} × ${w} = ${m * w}`),
      });
    }
    if (t === 0) {
      const [E, s1] = pick([...BEASTS.big, ...BEASTS.mid]), [e, s2] = pick(BEASTS.small), x = rnd(2, 8), useW = Math.random() < 0.5;
      const m = useW ? 1 : rnd(2, 4), d = useW ? rnd(2, 9) : 0, big = m * x + d, S = big + x;
      return nums({
        prompt: 'שני המאזניים מאוזנים. כמה שוקלת כל חיה?', visual: zscale([E, e], [S]) + zscale([E], useW ? [e, d] : reps(e, m)),
        fields: [[`${s2} ${e}:`, x], [`${s1} ${E}:`, big]],
        hints: [`במאזניים הראשונים, החליפו את ${E} במה שהוא שוקל לפי המאזניים השניים.`, useW ? `יוצא ש־2 ${e} ועוד ${d} שוקלים ${S}.` : `יוצא ש־${m + 1} ${e} שוקלים יחד ${S}.`],
        explain: useW ? `${M(`${S} − ${d} = ${2 * x}`)}, אז ${e} שוקל ${x}, ו־${E} שוקל ${M(`${x} + ${d} = ${big}`)}.` : `${M(`${S} ÷ ${m + 1} = ${x}`)}, אז ${e} שוקל ${x}, ו־${E} שוקל ${M(`${m} × ${x} = ${big}`)}.`,
      });
    }
    if (t === 1) {
      // which side goes down?
      const [E] = BEASTS.big[0], [D] = pick(BEASTS.mid), [e, , p3] = pick(BEASTS.small), a = rnd(4, 6), b = rnd(2, a - 1);
      let p, q, r, LW, RW;
      do {
        p = rnd(1, 2);
        q = rnd(1, 3);
        r = rnd(0, 4);
        LW = p * a;
        RW = q * b + r;
      } while (Math.abs(LW - RW) > 2 || q + r > 5);
      const res = LW > RW ? 0 : LW < RW ? 1 : 2, opts = ['הצד השמאלי יורד', 'הצד הימני יורד', 'המאזניים מאוזנים'];
      return {
        prompt: `שני המאזניים הראשונים מאוזנים. מה יקרה במאזניים השלישיים?`, visual: zscale([E], reps(e, a)) + zscale([D], reps(e, b)) + zscale(reps(E, p), [...reps(D, q), ...reps(e, r)], true),
        widget: choice(opts, { cols: 1 }), answer: res, check: v => v === res,
        hints: [`חשבו כמה ${p3} ${e} שוקל כל צד במאזניים השלישיים.`, `צד שמאל שוקל כמו ${LW} ${p3}.`],
        explain: `צד שמאל: ${M(`${p} × ${a} = ${LW}`)} ${p3}. צד ימין: ${M(`${q} × ${b}${r ? ` + ${r}` : ''} = ${RW}`)} ${p3}. ${res === 2 ? 'המשקל שווה, אז המאזניים מאוזנים.' : `הצד ה${res === 0 ? 'שמאלי' : 'ימני'} כבד יותר ולכן יורד.`}`,
      };
    }
    const [E, s1] = BEASTS.big[0], [D, , p2] = pick(BEASTS.mid), [e, s3, p3] = pick(BEASTS.small), a = rnd(2, 3), b = rnd(2, 4), w = rnd(2, 6), ask = pick(['E', 'ED']);
    const ans = ask === 'E' ? a * b * w : a * b * w + b * w;
    return num({
      prompt: `${s3} ${e} אחד שוקל ${w}. כל המאזניים מאוזנים. ${ask === 'E' ? `כמה שוקל ${s1} ${E}?` : `כמה שוקלים יחד ${E} ו־${D}?`}`,
      visual: zscale([E], reps(D, a)) + zscale([D], reps(e, b)), answer: ans,
      hints: [`קודם מצאו כמה שוקל ${D}: הוא שוקל כמו ${b} ${p3}.`, `${D} שוקל ${M(`${b} × ${w} = ${b * w}`)}, ו־${E} שוקל כמו ${a} ${p2}.`],
      explain: `${D} שוקל ${M(`${b} × ${w} = ${b * w}`)}. ${E} שוקל ${M(`${a} × ${b * w} = ${a * b * w}`)}.${ask === 'E' ? '' : ` יחד: ${M(`${a * b * w} + ${b * w} = ${ans}`)}.`}`,
    });
  },
};

// ---------- 3. 4×4 sudoku ----------
const SUD_UNITS = [
  ...range(4, r => range(4, c => r * 4 + c)),
  ...range(4, c => range(4, r => r * 4 + c)),
  ...[0, 2, 8, 10].map(s => [s, s + 1, s + 4, s + 5]),
];
const PEERS = range(16, i => [...new Set(SUD_UNITS.filter(u => u.includes(i)).flat())].filter(j => j !== i));
let SUDOKUS = null;
function allSudokus() {
  if (SUDOKUS) return SUDOKUS;
  const out = [], g = Array(16).fill(0);
  const rec = i => {
    if (i === 16) return out.push([...g]);
    for (let v = 1; v <= 4; v++)
      if (PEERS[i].every(j => g[j] !== v)) {
        g[i] = v;
        rec(i + 1);
        g[i] = 0;
      }
  };
  rec(0);
  return (SUDOKUS = out);
}
const countSol = giv => allSudokus().filter(s => giv.every((v, i) => !v || s[i] === v)).length;
// can it be filled one sure step at a time (one candidate left in a cell, or one place left for a number)?
function bySingles(giv) {
  const g = [...giv], cands = i => [1, 2, 3, 4].filter(v => PEERS[i].every(j => g[j] !== v));
  for (;;) {
    let moved = false;
    for (let i = 0; i < 16; i++)
      if (!g[i]) {
        const c = cands(i);
        if (c.length === 1) {
          g[i] = c[0];
          moved = true;
        }
      }
    for (const u of SUD_UNITS)
      for (let v = 1; v <= 4; v++) {
        if (u.some(i => g[i] === v)) continue;
        const spots = u.filter(i => !g[i] && cands(i).includes(v));
        if (spots.length === 1) {
          g[spots[0]] = v;
          moved = true;
        }
      }
    if (g.every(Boolean)) return true;
    if (!moved) return false;
  }
}
function makeSudoku(blanks, easy) {
  for (let tries = 0; ; tries++) {
    const sol = pick(allSudokus()), giv = [...sol];
    let removed = 0;
    for (const i of shuffle(range(16))) {
      if (removed === blanks) break;
      giv[i] = 0;
      if (countSol(giv) === 1 && (!easy || bySingles(giv))) removed++;
      else giv[i] = sol[i];
    }
    if (removed === blanks || (tries > 30 && removed >= blanks - 1)) return { sol, giv };
  }
}
function sudokuWidget(giv, sym) {
  const vals = [...giv];
  let cur = vals.indexOf(0), locked = false;
  const cells = range(16, i => {
    const r = Math.floor(i / 4), c = i % 4, cls = `zpuz-sc${giv[i] ? ' giv' : ''}${c === 1 ? ' bR' : ''}${r === 1 ? ' bB' : ''}`;
    return giv[i] ? h('span', { class: cls }, sym[giv[i]]) : h('button', { type: 'button', class: cls, onclick: () => { if (!locked) { cur = i; paint(); } } });
  });
  const fill = v => {
    if (locked || cur < 0) return;
    vals[cur] = v;
    if (v) {
      const nx = range(16, k => (cur + 1 + k) % 16).find(k => !vals[k]);
      if (nx != null) cur = nx;
    }
    paint();
  };
  const pad = h('div', { class: 'zpuz-spad', dir: 'ltr' },
    [1, 2, 3, 4].map(v => h('button', { type: 'button', class: 'zpuz-sk', onclick: () => fill(v) }, sym[v])),
    h('button', { type: 'button', class: 'zpuz-sk fn', 'aria-label': 'מחיקה', onclick: () => fill(0) }, '⌫'));
  function paint() {
    cells.forEach((el, i) => {
      if (giv[i]) return;
      el.textContent = vals[i] ? sym[vals[i]] : '';
      el.classList.toggle('on', !locked && i === cur);
    });
  }
  const el = h('div', { class: 'zpuz-sud' }, h('div', { class: 'zpuz-sgrid', dir: 'ltr' }, cells), pad);
  paint();
  return {
    el,
    value: () => (vals.every(Boolean) ? { g: vals.join('') } : null),
    set(a) {
      a.g.split('').forEach((d, i) => (vals[i] = +d));
      paint();
    },
    key(e) {
      if (/^[1-4]$/.test(e.key)) fill(+e.key);
      else if (e.key === 'Backspace') fill(0);
      else return false;
      e.preventDefault();
      return true;
    },
    lock() {
      locked = true;
      paint();
      el.classList.add('locked');
    },
  };
}
const sudOK = s => SUD_UNITS.every(u => new Set(u.map(i => s[i])).size === 4);
const miniGrid = (g, sym) => `<div class="zpuz-mini" dir="ltr">${g.map((v, i) => `<span class="${i % 4 === 1 ? 'bR' : ''}${Math.floor(i / 4) === 1 ? ' bB' : ''}">${sym[v]}</span>`).join('')}</div>`;
const NUMSYM = ['', '1', '2', '3', '4'];
const sudoku = {
  id: 'zpuz-sudoku', title: 'סודוקו 4 על 4',
  intro: `<p>בלוח יש 4 שורות, 4 עמודות ו־4 ריבועים קטנים (מוקפים בקו עבה). בכל שורה, בכל עמודה ובכל ריבוע קטן, כל אחד מהמספרים 1, 2, 3, 4 מופיע <b>פעם אחת בדיוק</b>. לפעמים במקום מספרים יש חיות.</p>
    <div class="ex">בשורה יש כבר ${M('1, 3, 4')}? אז במשבצת הריקה חייב להיות 2.</div>
    <p>לחצו על משבצת ריקה, ואחר כך על המספר שמתאים לה.</p>`,
  gen(L) {
    const animals = Math.random() < (L === 1 ? 0.5 : L === 2 ? 0.3 : 0.2);
    const sym = animals ? ['', ...shuffle(['🐒', '🦁', '🐘', '🦒', '🐧', '🐢', '🦉']).slice(0, 4)] : NUMSYM;
    const { sol, giv } = makeSudoku(L === 1 ? rnd(5, 6) : L === 2 ? rnd(8, 9) : 11, L < 3);
    const what = animals ? 'חיה' : 'מספר';
    const top = range(4, c => sym[sol[c]]).join(' ');
    return {
      prompt: animals ? 'מלאו את הלוח. בכל שורה, בכל עמודה ובכל ריבוע קטן, כל חיה מופיעה פעם אחת.' : 'מלאו את הלוח במספרים 1 עד 4. בכל שורה, בכל עמודה ובכל ריבוע קטן, כל מספר מופיע פעם אחת.',
      widget: sudokuWidget(giv, sym), answer: { g: sol.join('') }, tries: 3,
      check: v => {
        const s = v.g.split('').map(Number);
        return sudOK(s) && giv.every((x, i) => !x || s[i] === x);
      },
      hints: [
        L === 1 ? `חפשו שורה, עמודה או ריבוע קטן שחסר בהם רק ${what} ${animals ? 'אחת' : 'אחד'}.` : `בחרו ${what} ובדקו: באיזה מקום ${animals ? 'היא יכולה' : 'הוא יכול'} להופיע בשורה הזאת, בלי לחזור על עצמו בעמודה או בריבוע?`,
        ...(L === 3 ? ['כשאין צעד בטוח, הסתכלו על ריבוע קטן ובדקו איזה מקום נשאר בו לכל אחד מהחסרים.'] : []),
        `השורה העליונה היא: ${M(top)}`,
      ],
      explain: `הלוח הפתור:${miniGrid(sol, sym)}`,
    };
  },
};

// ---------- 4. magic square ----------
const LO_SHU = [2, 7, 6, 9, 5, 1, 4, 3, 8];
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const OPPOSITE = [[0, 8], [1, 7], [2, 6], [3, 5]];
function loShu() {
  let q = [...LO_SHU];
  for (let k = rnd(0, 3); k > 0; k--) q = [6, 3, 0, 7, 4, 1, 8, 5, 2].map(i => q[i]);
  if (Math.random() < 0.5) q = [2, 1, 0, 5, 4, 3, 8, 7, 6].map(i => q[i]);
  return q;
}
const sqGrid = (q, mark = []) => `<div class="zpuz-sqgrid" dir="ltr">${q.map((v, i) => `<span class="zpuz-sq ${mark.includes(i) ? 'new' : 'giv'}">${v}</span>`).join('')}</div>`;
const magicLinesOK = (at, S) => {
  const sums = LINES.map(l => sumOf(l.map(at)));
  return sums.every(x => x === sums[0]) && (S == null || sums[0] === S);
};
// a line with exactly one empty cell, to point at in the last hint
function oneGapHint(q, given, S) {
  const l = LINES.find(l => l.filter(i => !given.includes(i)).length === 1);
  if (!l) return `במרכז נמצא ${q[4]}.`;
  const gap = l.find(i => !given.includes(i)), known = l.filter(i => i !== gap).map(i => q[i]);
  return `יש קו שחסר בו מספר אחד: ${M(`${known[0]} + ${known[1]} + ? = ${S}`)}. החסר הוא ${q[gap]}.`;
}
const oneOfEach = n => shuffle(OPPOSITE).slice(0, n).map(p => pick(p));
const magic = {
  id: 'zpuz-magic', title: 'ריבוע קסם',
  intro: `<p>בריבוע קסם, הסכום של כל שורה, כל עמודה ושני האלכסונים הוא <b>אותו מספר</b>.</p>
    <div class="ex">בשורה יש 8 ו־1, והסכום צריך להיות 15: ${M('8 + 1 = 9')}, ו־${M('15 − 9 = 6')}. אז חסר 6.</div>
    <p>מתחילים מקו (שורה, עמודה או אלכסון) שחסר בו רק מספר אחד. כשהמספרים מחכים למטה, לחצו על מספר ואחר כך על המשבצת שלו.</p>`,
  gen(L) {
    if (L === 1) {
      const k = rnd(0, 5), q = loShu().map(v => v + k), S = 3 * q[4], given = [4, ...oneOfEach(4)];
      const cells = q.map((v, i) => (given.includes(i) ? v : null)), missing = q.filter((_, i) => !given.includes(i));
      return {
        prompt: `השלימו את ריבוע הקסם בעזרת המספרים שלמטה. בכל שורה, עמודה ואלכסון הסכום הוא ${S}.`,
        widget: tileSquare(cells, shuffle(missing)), answer: Object.fromEntries(q.map((v, i) => ['m' + i, v]).filter((_, i) => !given.includes(i))),
        check: v => magicLinesOK(i => (given.includes(i) ? q[i] : v['m' + i]), S), tries: 3,
        hints: [`חפשו שורה, עמודה או אלכסון שחסר בהם רק מספר אחד. כמה חסר כדי להגיע ל־${S}?`, oneGapHint(q, given, S)],
        explain: `הסכום בכל כיוון הוא ${S}:${sqGrid(q, range(9).filter(i => !given.includes(i)))}`,
      };
    }
    if (L === 2) {
      const m = rnd(1, 2), k = rnd(0, 10), q = loShu().map(v => m * v + k), S = 3 * q[4];
      const given = Math.random() < 0.6 ? [4, ...oneOfEach(3)] : oneOfEach(4), answer = {};
      const html = `<div class="zpuz-sqgrid" dir="ltr">${q.map((v, i) => (given.includes(i) ? `<span class="zpuz-sq giv">${v}</span>` : ((answer['m' + i] = v), box('m' + i, 2)))).join('')}</div>`;
      return {
        prompt: `השלימו את ריבוע הקסם. בכל שורה, עמודה ואלכסון הסכום הוא ${S}.`,
        widget: inputs(html), answer, tries: 3,
        check: v => magicLinesOK(i => (given.includes(i) ? q[i] : v['m' + i]), S),
        hints: given.includes(4) ? ['חפשו קו שחסר בו רק מספר אחד. אחרי שממלאים אותו, מופיעים קווים חדשים כאלה.', oneGapHint(q, given, S)]
          : ['כאן אין קו שחסר בו רק מספר אחד. סוד: בריבוע קסם של 3 על 3, המספר שבאמצע הוא תמיד שליש מהסכום.', `באמצע נמצא ${M(`${S} ÷ 3 = ${q[4]}`)}. עכשיו יש קווים שחסר בהם רק מספר אחד.`],
        explain: `הסכום בכל כיוון הוא ${S}:${sqGrid(q, range(9).filter(i => !given.includes(i)))}`,
      };
    }
    if (Math.random() < 0.5) {
      // the numbers 1 to 9, only a corner and a neighbouring edge given
      const q = loShu(), corner = pick([0, 2, 6, 8]), edge = pick({ 0: [1, 3], 2: [1, 5], 6: [3, 7], 8: [5, 7] }[corner]), given = [corner, edge];
      const cells = q.map((v, i) => (given.includes(i) ? v : null));
      return {
        prompt: 'שבצו את המספרים 1 עד 9 בריבוע, כך שבכל שורה, עמודה ואלכסון הסכום יהיה 15.',
        widget: tileSquare(cells, range(9, i => i + 1).filter(v => !given.map(i => q[i]).includes(v))),
        answer: Object.fromEntries(q.map((v, i) => ['m' + i, v]).filter((_, i) => !given.includes(i))), tries: 3,
        check: v => magicLinesOK(i => (given.includes(i) ? q[i] : v['m' + i]), 15),
        hints: ['המספר 5 נמצא בכמה שהכי הרבה קווים, ולכן מקומו באמצע. מה שמול כל מספר, מעבר לאמצע, משלים אותו ל־10.', `באמצע 5. מול ${q[corner]} נמצא ${10 - q[corner]}, ומול ${q[edge]} נמצא ${10 - q[edge]}. בפינות יש רק מספרים זוגיים.`],
        explain: `באמצע 5, וכל שני מספרים זה מול זה משלימים ל־10:${sqGrid(q, range(9).filter(i => !given.includes(i)))}`,
      };
    }
    const m = rnd(1, 2), k = rnd(0, 6), q = loShu().map(v => m * v + k), S = 3 * q[4], answer = {};
    const given = Math.random() < 0.5 ? [4, ...oneOfEach(2)] : pick([[0, 1, 2], [6, 7, 8], [0, 3, 6], [2, 5, 8]]);
    const html = `<div class="zpuz-sqgrid" dir="ltr">${q.map((v, i) => (given.includes(i) ? `<span class="zpuz-sq giv">${v}</span>` : ((answer['m' + i] = v), box('m' + i, 2)))).join('')}</div>`;
    return {
      prompt: 'השלימו את ריבוע הקסם. הסכום בכל שורה, עמודה ואלכסון שווה, אבל הפעם לא מגלים לכם מהו.',
      widget: inputs(html), answer, tries: 3,
      check: v => magicLinesOK(i => (given.includes(i) ? q[i] : v['m' + i])),
      hints: [given.includes(4) ? 'סוד: המספר שבאמצע הוא תמיד שליש מהסכום. אז מהו הסכום?' : 'יש קו שלם! הוא מגלה את הסכום. והמספר שבאמצע הוא תמיד שליש מהסכום.', `הסכום הוא ${S}, ובאמצע נמצא ${q[4]}.`],
      explain: `הסכום בכל כיוון הוא ${S}:${sqGrid(q, range(9).filter(i => !given.includes(i)))}`,
    };
  },
};

// ---------- 5. even and odd ----------
const PAR = ['זוגי', 'אי־זוגי'];
const mathIn = text => text.replace(/\d+ [+×] \d+ = \d+/g, x => M(x));
const parityExplain = n => (isEven(n) ? `${n} זוגי: ספרת האחדות ${n % 10} זוגית.` : `${n} אי־זוגי: ספרת האחדות ${n % 10} אי־זוגית.`);
function pickNums(k, lo, hi) {
  for (;;) {
    const s = new Set();
    while (s.size < k) s.add(rnd(lo, hi));
    const a = [...s], ev = a.filter(isEven).length;
    if (ev >= 2 && ev <= k - 2) return a;
  }
}
const parity = {
  id: 'zpuz-parity', title: 'זוגי ואי־זוגי',
  intro: `<p>מספר <b>זוגי</b> אפשר לחלק לזוגות, בלי שאף אחד יישאר לבד: 2, 4, 6, 8, 10... מספר <b>אי־זוגי</b> משאיר אחד לבד: 1, 3, 5, 7, 9...</p>
    <div class="ex">מספיק להסתכל על ספרת האחדות: 58 זוגי (8 זוגי), 73 אי־זוגי (3 אי־זוגי).</div>
    <p>עוד סוד: זוגי ועוד זוגי נותן זוגי, אי־זוגי ועוד אי־זוגי נותן זוגי, וזוגי ועוד אי־זוגי נותן אי־זוגי.</p>`,
  gen(L) {
    const t = rnd(0, 2);
    const pickAll = (lo, hi) => {
      const a = pickNums(8, lo, hi), want = rnd(0, 1), ans = a.map((n, i) => (n % 2 === want ? i : -1)).filter(i => i >= 0);
      return {
        prompt: `לחצו על כל המספרים ה${PAR[want]}ים.`,
        widget: choice(a.map(String), { multi: true, cols: 4, cls: 'nums zpuz-chips' }), answer: ans,
        check: v => v.length === ans.length && v.every((x, i) => x === ans[i]),
        hints: ['הסתכלו רק על ספרת האחדות. ספרות זוגיות: 0, 2, 4, 6, 8.', `יש ${ans.length} מספרים ${PAR[want]}ים.`],
        explain: `המספרים ה${PAR[want]}ים: ${M(ans.map(i => a[i]).join(', '))}.`,
      };
    };
    if (L === 1) {
      if (t === 0) return pickAll(1, 60);
      if (t === 1) {
        const [e, , p] = pick([['🐧', 'פינגווין', 'פינגווינים'], ['🦆', 'ברווז', 'ברווזים'], ['🐰', 'ארנב', 'ארנבים'], ['🐒', 'קוף', 'קופים']]), n = rnd(5, 15), ev = isEven(n) ? 0 : 1;
        return {
          prompt: `ה${p} יוצאים לטייל בזוגות. האם מספר ה${p} זוגי או אי־זוגי?`, visual: `<div class="zpuz-herd">${range(n, () => `<span>${e}</span>`).join('')}</div>`,
          widget: choice(PAR, { cols: 2, cls: 'zpuz-two' }), answer: ev, check: v => v === ev,
          hints: ['ספרו אותם, או חברו אותם בראש לזוגות.', `יש ${n} ${p}.`],
          explain: ev ? `יש ${n}: ${(n - 1) / 2} זוגות, ואחד נשאר לבד. לכן ${n} אי־זוגי.` : `יש ${n}: ${n / 2} זוגות בדיוק. לכן ${n} זוגי.`,
        };
      }
      const n = rnd(11, 89), want = rnd(0, 1), up = Math.random() < 0.6, ans = up ? (n % 2 === want ? n + 2 : n + 1) : n % 2 === want ? n - 2 : n - 1;
      return num({
        prompt: `מה המספר ה${PAR[want]} ${up ? 'הבא אחרי' : 'שבא לפני'} ${n}?`, answer: ans,
        hints: [`המספרים ה${PAR[want]}ים באים אחד כן ואחד לא. ${parityExplain(n)}`, `${up ? 'ספרו קדימה' : 'ספרו אחורה'} מ־${n}: ${up ? `${n + 1}, ${n + 2}` : `${n - 1}, ${n - 2}`}.`],
        explain: `${parityExplain(n)} ${up ? 'אחריו' : 'לפניו'}, המספר ה${PAR[want]} הקרוב הוא ${ans}.`,
      });
    }
    if (L === 2) {
      if (t === 0) return pickAll(100, 999);
      if (t === 1) {
        const op = pick(['+', '+', '-', '×']), a = op === '×' ? rnd(2, 9) : rnd(21, 99), b = op === '×' ? rnd(2, 9) : op === '-' ? rnd(11, a - 5) : rnd(11, 99);
        const res = op === '+' ? a + b : op === '-' ? a - b : a * b, ev = isEven(res) ? 0 : 1, sym = op === '-' ? '−' : op;
        const rule = op === '×' ? 'בכפל: אם יש לפחות מספר זוגי אחד, התוצאה זוגית. רק אי־זוגי כפול אי־זוגי נותן אי־זוגי.' : 'שני מספרים מאותו סוג (שניהם זוגיים או שניהם אי־זוגיים) נותנים תוצאה זוגית. מספרים מסוגים שונים נותנים אי־זוגית.';
        return {
          prompt: `בלי לחשב עד הסוף: האם התוצאה של ${M(`${a} ${sym} ${b}`)} זוגית או אי־זוגית?`,
          widget: choice(PAR, { cols: 2, cls: 'zpuz-two' }), answer: ev, check: v => v === ev,
          hints: [`${a} ${PAR[a % 2]}, ו־${b} ${PAR[b % 2]}.`, rule],
          explain: `${a} ${PAR[a % 2]} ו־${b} ${PAR[b % 2]}, לכן התוצאה ${PAR[ev]}ת. בדיקה: ${M(`${a} ${sym} ${b} = ${res}`)}.`,
        };
      }
      const A = rnd(11, 70), B = A + rnd(8, 20), want = rnd(0, 1), list = range(B - A + 1, i => A + i).filter(n => n % 2 === want);
      return num({
        prompt: `כמה מספרים ${PAR[want]}ים יש מ־${A} עד ${B}? (כולל ${A} ו־${B})`, answer: list.length,
        hints: [`ה${PAR[want]} הראשון הוא ${list[0]}, והאחרון הוא ${list[list.length - 1]}. מכאן קופצים ב־2.`, `התחילו לספור: ${list.slice(0, 3).join(', ')}...`],
        explain: `${M(list.join(', '))}: ${list.length} מספרים.`,
      });
    }
    if (t === 0) {
      if (Math.random() < 0.5) {
        const n = rnd(3, 9), ev = isEven(n) ? 0 : 1;
        return {
          prompt: `בגן יש ${n} כלובים של קופים, ובכל כלוב מספר אי־זוגי של קופים. האם מספר כל הקופים יחד זוגי או אי־זוגי?`,
          widget: choice(PAR, { cols: 2, cls: 'zpuz-two' }), answer: ev, check: v => v === ev,
          hints: ['שני מספרים אי־זוגיים יחד נותנים מספר זוגי. חברו את הכלובים לזוגות.', ev ? `${n} כלובים: ${n / 2} זוגות של כלובים.` : `${n} כלובים: ${(n - 1) / 2} זוגות של כלובים, וכלוב אחד נשאר לבד.`],
          explain: ev ? 'כל זוג כלובים נותן מספר זוגי, אבל נשאר כלוב אחד עם מספר אי־זוגי. לכן הסכום אי־זוגי.' : 'כל זוג כלובים נותן מספר זוגי, וכל הכלובים מתחלקים לזוגות. לכן הסכום זוגי.',
        };
      }
      const k = rnd(3, 6), S = rnd(15, 40), yes = S % 2 === k % 2, ex = yes ? M(`${range(k - 1, () => 1).join(' + ')} + ${S - k + 1} = ${S}`) : '';
      return {
        prompt: `האם אפשר למצוא ${k} מספרים אי־זוגיים שהסכום שלהם הוא ${S}?`,
        widget: choice(['כן', 'לא'], { cols: 2, cls: 'zpuz-two' }), answer: yes ? 0 : 1, check: v => v === (yes ? 0 : 1),
        hints: ['שני אי־זוגיים יחד נותנים זוגי. מה קורה כשמחברים 3, 4, 5 אי־זוגיים?', `סכום של ${k} מספרים אי־זוגיים הוא תמיד ${PAR[k % 2]}.`],
        explain: yes ? `כן. סכום של ${k} אי־זוגיים הוא ${PAR[k % 2]}, כמו ${S}. למשל: ${ex}.` : `לא. סכום של ${k} אי־זוגיים הוא תמיד ${PAR[k % 2]}, אבל ${S} ${PAR[S % 2]}.`,
      };
    }
    if (t === 1) {
      const T = pick([
        ['כופל אותו ב־2', 0, 'כל מספר כפול 2 הוא זוגי.'],
        ['כופל אותו ב־2 ומוסיף 1', 1, 'מספר כפול 2 הוא זוגי, ועוד 1 נותן אי־זוגי.'],
        ['כופל אותו ב־2 ומוסיף 3', 1, 'מספר כפול 2 הוא זוגי, ועוד 3 (אי־זוגי) נותן אי־זוגי.'],
        ['מוסיף לו את עצמו', 0, 'מספר ועוד עצמו הוא כמו מספר כפול 2, ולכן זוגי.'],
        ['מוסיף לו את המספר שבא אחריו', 1, 'מספר והמספר שאחריו הם תמיד זוגי ואי־זוגי, והסכום שלהם אי־זוגי. למשל 4 + 5 = 9.'],
        ['כופל אותו במספר שבא אחריו', 0, 'מבין מספר והמספר שאחריו, אחד תמיד זוגי, ולכן המכפלה זוגית. למשל 3 × 4 = 12.'],
        ['מוסיף לו 1', 2, 'אם המספר זוגי התוצאה אי־זוגית, ואם הוא אי־זוגי התוצאה זוגית. למשל 4 + 1 = 5, אבל 5 + 1 = 6.'],
        ['כופל אותו ב־3', 2, 'למשל 2 × 3 = 6 (זוגי), אבל 3 × 3 = 9 (אי־זוגי).'],
      ]);
      const opts = ['תמיד זוגית', 'תמיד אי־זוגית', 'תלוי במספר'];
      return {
        prompt: `🦉 הינשוף בוחר מספר כלשהו, ו${T[0]}. האם התוצאה זוגית?`,
        widget: choice(opts, { cols: 1 }), answer: T[1], check: v => v === T[1],
        hints: ['נסו עם כמה מספרים: למשל 3, 4 ו־7.', mathIn(T[2].split('.')[0] + '.')],
        explain: `${opts[T[1]]}. ${mathIn(T[2])}`,
      };
    }
    const N = rnd(31, 199), want = rnd(0, 1), cnt = want ? Math.ceil(N / 2) : Math.floor(N / 2);
    return num({
      prompt: `כמה מספרים ${PAR[want]}ים יש מ־1 עד ${N}?`, answer: cnt,
      hints: ['בכל זוג של מספרים 1 ו־2, 3 ו־4, 5 ו־6... יש אחד זוגי ואחד אי־זוגי.', isEven(N) ? `מ־1 עד ${N} יש ${N / 2} זוגות כאלה בדיוק.` : `מ־1 עד ${N - 1} יש ${(N - 1) / 2} זוגות כאלה, ועוד המספר ${N} לבד.`],
      explain: isEven(N) ? `${N / 2} זוגות, ובכל זוג ${PAR[want]} אחד: ${cnt}.` : `${(N - 1) / 2} זוגות, ועוד ${N} שהוא אי־זוגי. ${want ? `לכן יש ${M(`${(N - 1) / 2} + 1 = ${cnt}`)} אי־זוגיים.` : `לכן יש ${cnt} זוגיים.`}`,
    });
  },
};

// ---------- 6. number pyramid ----------
// givens are "row,col" with row 0 at the bottom; every pattern has exactly one solution
const PYR = {
  1: [[3, ['0,0', '0,1', '0,2']], [3, ['0,0', '0,1', '0,2']], [3, ['0,0', '0,1', '1,1']], [3, ['0,1', '0,2', '1,0']]],
  2: [[3, ['0,0', '1,0', '1,1']], [3, ['2,0', '1,0', '0,2']], [3, ['1,0', '0,1', '2,0']], [3, ['1,1', '0,1', '2,0']], [4, ['0,0', '0,1', '0,2', '0,3']], [4, ['0,0', '1,0', '1,1', '1,2']]],
  3: [[3, ['2,0', '0,0', '0,2']], [4, ['3,0', '0,0', '0,1', '0,3']], [4, ['2,0', '2,1', '0,0', '0,3']], [4, ['3,0', '2,0', '1,2', '0,3']], [4, ['2,0', '1,2', '0,1', '3,0']]],
};
const pyramid = {
  id: 'zpuz-pyramid', title: 'פירמידת מספרים',
  intro: `<p>הקופים בנו מגדל מארגזים. כל ארגז שווה ל<b>סכום שני הארגזים שמתחתיו</b>.</p>
    <div class="ex">אם למטה יש 3 ו־5, הארגז שמעליהם הוא ${M('3 + 5 = 8')}.</div>
    <p>אפשר לעבוד גם הפוך: אם למעלה 8 ולמטה 3, אז השני הוא ${M('8 − 3 = 5')}.</p>`,
  gen(L) {
    const [n, given] = pick(PYR[L]), top = L === 1 ? 10 : n === 4 ? (L === 2 ? 6 : 8) : L === 2 ? 25 : 15;
    const g = [range(n, () => rnd(1, top))];
    for (let r = 1; r < n; r++) g.push(range(n - r, c => g[r - 1][c] + g[r - 1][c + 1]));
    const rowsHTML = fill => range(n, i => n - 1 - i).map(r => `<div class="prow">${g[r].map((v, c) => fill(r, c, v)).join('')}</div>`).join('');
    const cell = v => `<span class="pcell">${v}</span>`, answer = {};
    const html = rowsHTML((r, c, v) => {
      if (given.includes(`${r},${c}`)) return cell(v);
      answer[`p${r}_${c}`] = v;
      return box(`p${r}_${c}`, String(v).length + 1);
    });
    const bottomKnown = range(n).every(c => given.includes(`0,${c}`)), blankBottom = range(n).find(c => !given.includes(`0,${c}`));
    return {
      prompt: 'השלימו את מגדל הארגזים. כל ארגז שווה לסכום שני הארגזים שמתחתיו.',
      widget: inputs(`<div class="pyr zpuz-pyr">${html}</div>`), answer, tries: 3,
      // any filling that obeys the rule is accepted
      check: v => {
        const at = (r, c) => (given.includes(`${r},${c}`) ? g[r][c] : v[`p${r}_${c}`]);
        return range(n - 1, r => r + 1).every(r => g[r].every((_, c) => at(r, c) === at(r - 1, c) + at(r - 1, c + 1)));
      },
      hints: [
        bottomKnown ? 'התחילו מהשורה התחתונה ועלו למעלה. כל פעם חברו שני ארגזים שכנים.' : L < 3 ? 'חפשו שלושה ארגזים (ארגז ושניים שמתחתיו) שכבר ידועים בהם שניים. את השלישי מוצאים בחיבור או בחיסור.' : 'כאן אי אפשר להתקדם ישר. נחשו מספר לארגז ריק בשורה התחתונה, מלאו את השאר ובדקו אם הארגז העליון מסתדר. אם לא, תקנו את הניחוש.',
        bottomKnown ? `בשורה השנייה מלמטה: ${M(`${g[0][0]} + ${g[0][1]} = ${g[1][0]}`)}.` : `בשורה התחתונה, הארגז ה־${blankBottom + 1} משמאל הוא ${g[0][blankBottom]}.`,
      ],
      explain: `<div class="pyr zpuz-pyr">${rowsHTML((r, c, v) => cell(v))}</div>`,
    };
  },
};

// ---------- 7. multi-step word problems ----------
const steps = {
  id: 'zpuz-steps', title: 'בעיות בשלבים',
  intro: `<p>בבעיה של כמה שלבים, פותרים שאלה קטנה, ואת התשובה שלה משתמשים בשאלה הבאה.</p>
    <div class="ex">לשומר יש 30 דגים. הוא נותן 12 לפינגווינים ו־8 לכלבי הים. כמה נשארו?<br>שלב 1: ${M('30 − 12 = 18')}. שלב 2: ${M('18 − 8 = 10')}. נשארו 10 דגים.</div>
    <p>טיפ: קראו את השאלה עד הסוף, ושאלו את עצמכם מה צריך לדעת קודם.</p>`,
  gen(L) {
    const t = rnd(0, 5);
    if (L === 1) {
      const two = ({ prompt, s1, a1, a2, hints, explain }) => nums({ prompt, fields: [[`<span class="zpuz-lbl">שלב 1: ${s1}</span>`, a1], ['<span class="zpuz-lbl">התשובה:</span>', a2]], hints, explain });
      if (t === 0) {
        const A = rnd(30, 90), B = rnd(5, 25), C = rnd(3, Math.min(25, A - B - 2));
        return two({ prompt: `לשומר יש ${A} דגים. הוא נותן ${B} דגים לפינגווינים, ו־${C} דגים לכלבי הים. כמה דגים נשארו לו?`, s1: 'אחרי הפינגווינים נשארו:', a1: A - B, a2: A - B - C, hints: ['שלב 1: כמה דגים נשארו אחרי שנתן לפינגווינים?', `${M(`${A} − ${B} = ${A - B}`)}. עכשיו הורידו את הדגים של כלבי הים.`], explain: `${M(`${A} − ${B} = ${A - B}`)}, ואחר כך ${M(`${A - B} − ${C} = ${A - B - C}`)}.` });
      }
      if (t === 1) {
        const A = rnd(10, 40), B = rnd(5, 30), C = rnd(3, A + B - 2);
        return two({ prompt: `על העץ ישבו ${A} קופים. עוד ${B} קופים טיפסו לעץ, ואחר כך ${C} קופים קפצו למטה. כמה קופים יש עכשיו על העץ?`, s1: 'אחרי שטיפסו היו:', a1: A + B, a2: A + B - C, hints: ['שלב 1: כמה קופים היו על העץ אחרי שעוד קופים טיפסו?', `${M(`${A} + ${B} = ${A + B}`)}. עכשיו הורידו את מי שקפץ.`], explain: `${M(`${A} + ${B} = ${A + B}`)}, ואחר כך ${M(`${A + B} − ${C} = ${A + B - C}`)}.` });
      }
      if (t === 2) {
        const A = rnd(10, 35), B = rnd(3, 15);
        return two({ prompt: `ג'ירפה אחת אכלה ${A} עלים. ג'ירפה שנייה אכלה ${B} עלים יותר ממנה. כמה עלים אכלו שתיהן יחד?`, s1: 'הג׳ירפה השנייה אכלה:', a1: A + B, a2: 2 * A + B, hints: ['שלב 1: כמה עלים אכלה הג׳ירפה השנייה?', `השנייה אכלה ${M(`${A} + ${B} = ${A + B}`)}. עכשיו חברו את שתיהן.`], explain: `השנייה: ${M(`${A} + ${B} = ${A + B}`)}. יחד: ${M(`${A} + ${A + B} = ${2 * A + B}`)}.` });
      }
      if (t === 3) {
        const P = pick([50, 100]), A = rnd(8, P === 50 ? 25 : 45), B = rnd(5, P === 50 ? 20 : 40);
        return two({ prompt: `בחנות של הגן, נועה קנתה כובע ב־${A} שקלים ובקבוק מים ב־${B} שקלים. היא שילמה בשטר של ${P} שקלים. כמה עודף קיבלה?`, s1: 'יחד הם עלו:', a1: A + B, a2: P - A - B, hints: ['שלב 1: כמה עלו הכובע והבקבוק יחד?', `יחד: ${M(`${A} + ${B} = ${A + B}`)}. כמה חסר מזה עד ${P}?`], explain: `יחד: ${M(`${A} + ${B} = ${A + B}`)}. עודף: ${M(`${P} − ${A + B} = ${P - A - B}`)}.` });
      }
      if (t === 4) {
        const A = rnd(15, 40), B = rnd(3, 12);
        return two({ prompt: `בבריכה יש ${A} פינגווינים. על הסלע יש ${B} פינגווינים פחות מאשר בבריכה. כמה פינגווינים יש בסך הכול?`, s1: 'על הסלע יש:', a1: A - B, a2: 2 * A - B, hints: ['שלב 1: כמה פינגווינים יש על הסלע?', `על הסלע: ${M(`${A} − ${B} = ${A - B}`)}. עכשיו חברו.`], explain: `על הסלע: ${M(`${A} − ${B} = ${A - B}`)}. בסך הכול: ${M(`${A} + ${A - B} = ${2 * A - B}`)}.` });
      }
      const A = rnd(20, 50), B = rnd(5, 15), C = rnd(5, 30);
      return two({ prompt: `בלול היו ${A} ביצים. מ־${B} ביצים בקעו אפרוחים. אחר כך השומר הביא עוד ${C} ביצים. כמה ביצים יש עכשיו בלול?`, s1: 'אחרי שהאפרוחים בקעו נשארו:', a1: A - B, a2: A - B + C, hints: ['שלב 1: כמה ביצים נשארו אחרי שהאפרוחים בקעו?', `${M(`${A} − ${B} = ${A - B}`)}. עכשיו הוסיפו את הביצים החדשות.`], explain: `${M(`${A} − ${B} = ${A - B}`)}, ואחר כך ${M(`${A - B} + ${C} = ${A - B + C}`)}.` });
    }
    if (L === 2) {
      if (t === 0) {
        const A = rnd(3, 6), B = rnd(4, 9), C = rnd(3, A * B - 4);
        return num({ prompt: `בגן יש ${A} כלובים של תוכים, ובכל כלוב ${B} תוכים. ${C} תוכים עפו לכלוב הגדול. כמה תוכים נשארו בכלובים הקטנים?`, answer: A * B - C, hints: ['שלב 1: כמה תוכים היו בכל הכלובים יחד?', `${M(`${A} × ${B} = ${A * B}`)} תוכים. עכשיו הורידו את מי שעף.`], explain: `${M(`${A} × ${B} = ${A * B}`)}, ואחר כך ${M(`${A * B} − ${C} = ${A * B - C}`)}.` });
      }
      if (t === 1) {
        let A, B, C;
        do [A, B, C] = [rnd(2, 6), rnd(4, 10), rnd(2, 6)]; while ((A * B) % C || (A * B) / C > 12 || (A * B) / C < 2);
        return num({ prompt: `השומר קנה ${A} שקים, ובכל שק ${B} תפוחים. הוא חילק את כל התפוחים שווה בשווה בין ${C} פילים. כמה תפוחים קיבל כל פיל?`, answer: (A * B) / C, hints: ['שלב 1: כמה תפוחים יש בכל השקים יחד?', `${M(`${A} × ${B} = ${A * B}`)} תפוחים. עכשיו חלקו ל־${C}.`], explain: `${M(`${A} × ${B} = ${A * B}`)}, ואחר כך ${M(`${A * B} ÷ ${C} = ${(A * B) / C}`)}.` });
      }
      if (t === 2) {
        const P = rnd(4, 8) * 5, Q = rnd(2, P / 5 - 1) * 5, p = rnd(1, 3), q = rnd(1, 4);
        return num({ prompt: `כרטיס כניסה לגן החיות למבוגר עולה ${P} שקלים, ולילד ${Q} שקלים. משפחה של ${p === 1 ? 'מבוגר אחד' : `${p} מבוגרים`} ו־${q === 1 ? 'ילד אחד' : `${q} ילדים`} קנתה כרטיסים. כמה שילמה המשפחה?`, answer: p * P + q * Q, hints: ['חשבו בנפרד: כמה עלו הכרטיסים של המבוגרים, וכמה של הילדים?', `מבוגרים: ${M(`${p} × ${P} = ${p * P}`)}. ילדים: ${M(`${q} × ${Q} = ${q * Q}`)}.`], explain: `${M(`${p} × ${P} = ${p * P}`)}, ${M(`${q} × ${Q} = ${q * Q}`)}, ויחד ${M(`${p * P} + ${q * Q} = ${p * P + q * Q}`)} שקלים.` });
      }
      if (t === 3) {
        const A = rnd(3, 9), k = rnd(2, 4), B = rnd(4, (k + 1) * A - 2);
        return num({ prompt: `לקוף יש ${A} בננות, ולגורילה יש פי ${k} יותר. הם אכלו יחד ${B} בננות. כמה בננות נשארו לשניהם יחד?`, answer: (k + 1) * A - B, hints: ['שלב 1: כמה בננות יש לגורילה?', `לגורילה ${M(`${k} × ${A} = ${k * A}`)}, ויחד ${M(`${A} + ${k * A} = ${(k + 1) * A}`)}.`], explain: `לגורילה ${M(`${k} × ${A} = ${k * A}`)}. יחד ${(k + 1) * A}. נשארו ${M(`${(k + 1) * A} − ${B} = ${(k + 1) * A - B}`)}.` });
      }
      if (t === 4) {
        const A = rnd(3, 12), B = rnd(2, 9);
        return num({ prompt: `בפינת החי יש ${A} תרנגולות ו־${B} ארנבים. כמה רגליים יש לכולם יחד?`, answer: 2 * A + 4 * B, hints: ['לתרנגולת יש 2 רגליים, ולארנב יש 4.', `תרנגולות: ${M(`${A} × 2 = ${2 * A}`)}. ארנבים: ${M(`${B} × 4 = ${4 * B}`)}.`], explain: `${M(`${A} × 2 + ${B} × 4 = ${2 * A} + ${4 * B} = ${2 * A + 4 * B}`)}.` });
      }
      const A = rnd(2, 4), B = rnd(3, 9) * 5, P = A * B < 100 ? 100 : 200;
      return num({ prompt: `השומר קנה ${A} שקים של אוכל לזברות. כל שק עולה ${B} שקלים. הוא שילם בשטר של ${P} שקלים. כמה עודף קיבל?`, answer: P - A * B, hints: ['שלב 1: כמה עלו כל השקים?', `${M(`${A} × ${B} = ${A * B}`)}. כמה חסר מזה עד ${P}?`], explain: `${M(`${A} × ${B} = ${A * B}`)}, ועודף ${M(`${P} − ${A * B} = ${P - A * B}`)} שקלים.` });
    }
    if (t === 0) {
      const R = rnd(3, 15), C = rnd(2, 10), half = R + C;
      return num({ prompt: `השומר חילק דגים. חצי מכל הדגים נתן לפינגווינים. אחר כך נתן ${C} דגים לכלב הים, ונשארו לו ${R} דגים. כמה דגים היו לו בהתחלה?`, answer: 2 * half, hints: ['עבדו מהסוף להתחלה. כמה היו לו רגע לפני שנתן לכלב הים?', `לפני כלב הים היו לו ${M(`${R} + ${C} = ${half}`)}, וזה חצי מכל הדגים.`], explain: `${M(`${R} + ${C} = ${half}`)} זה החצי שנשאר, אז בהתחלה היו ${M(`${half} × 2 = ${2 * half}`)}. בדיקה: חצי מ־${2 * half} הוא ${half}, ${M(`${half} − ${C} = ${R}`)}.` });
    }
    if (t === 1) {
      const m = rnd(6, 20), d = rnd(2, 5);
      return num({ prompt: `לשלושה קופים יש יחד ${3 * m} בננות. לקוף הגדול יש ${d} בננות יותר מלקוף האמצעי, ולקוף האמצעי יש ${d} בננות יותר מלקוף הקטן. כמה בננות יש לקוף הגדול?`, answer: m + d, hints: [`אם הגדול ייתן ${d} בננות לקטן, לשלושתם יהיה אותו מספר.`, `לכל אחד יהיו ${M(`${3 * m} ÷ 3 = ${m}`)}, וזה בדיוק מה שיש לאמצעי.`], explain: `לאמצעי ${m}, לקטן ${m - d}, לגדול ${M(`${m} + ${d} = ${m + d}`)}. בדיקה: ${M(`${m - d} + ${m} + ${m + d} = ${3 * m}`)}.` });
    }
    if (t === 2) {
      const c = rnd(2, 6), r = rnd(2, 6), H = c + r, Lg = 2 * c + 4 * r;
      return num({ prompt: `בחצר יש תרנגולות וארנבים. יש להם יחד ${H} ראשים ו־${Lg} רגליים. כמה ארנבים יש?`, answer: r, hints: [`נניח שכולם תרנגולות: אז היו ${M(`${H} × 2 = ${2 * H}`)} רגליים.`, `חסרות ${M(`${Lg} − ${2 * H} = ${Lg - 2 * H}`)} רגליים, וכל ארנב מוסיף עוד 2.`], explain: `${M(`(${Lg} − ${2 * H}) ÷ 2 = ${r}`)} ארנבים, ו־${c} תרנגולות. בדיקה: ${M(`${c} × 2 + ${r} × 4 = ${Lg}`)}.` });
    }
    if (t === 3) {
      let N, T, k;
      do [N, T, k] = [rnd(15, 35), rnd(2, 4), pick([4, 5, 6])]; while ((N + T) % k === 0);
      const cars = Math.ceil((N + T) / k);
      return num({ prompt: `לגן החיות הגיעו ${N} ילדים ו־${T} מורים. בכל קרון של הרכבת הקטנה יש ${k} מקומות. כמה קרונות צריך כדי שכולם ייסעו יחד?`, answer: cars, hints: [`שלב 1: כמה אנשים יש בסך הכול? ${M(`${N} + ${T} = ${N + T}`)}.`, `${M(`${cars - 1} × ${k} = ${(cars - 1) * k}`)} מקומות זה לא מספיק. מה עושים עם מי שנשאר?`], explain: `${N + T} אנשים. ${M(`${cars - 1} × ${k} = ${(cars - 1) * k}`)}, ונשארו עוד ${N + T - (cars - 1) * k}, אז צריך עוד קרון: ${cars} קרונות.` });
    }
    if (t === 4) {
      const d = pick([2, 3, 4, 5]), parts = rnd(4, 9), Lw = d * parts;
      return num({ prompt: `לאורך שביל באורך ${Lw} מטרים שותלים עצים: עץ אחד בכל ${d} מטרים, כולל עץ בהתחלה ועץ בסוף. כמה עצים שותלים?`, answer: parts + 1, hints: [`יש ${M(`${Lw} ÷ ${d} = ${parts}`)} רווחים בין העצים.`, 'ציירו שביל קצר: ל־2 רווחים צריך 3 עצים. תמיד יש עץ אחד יותר מרווחים.'], explain: `${parts} רווחים, ולכן ${M(`${parts} + 1 = ${parts + 1}`)} עצים.` });
    }
    const B = rnd(5, 30), D = rnd(2, 10) * 2, A = B + D;
    return num({ prompt: `לשומר אחד יש ${A} דגים, ולשומר השני יש ${B}. כמה דגים צריך הראשון לתת לשני, כדי שלשניהם יהיה אותו מספר?`, answer: D / 2, hints: [`ההפרש ביניהם הוא ${M(`${A} − ${B} = ${D}`)}.`, `אם הראשון ייתן את כל ההפרש, יהיה לשני יותר! צריך לתת רק חצי מההפרש.`], explain: `ההפרש ${D}, וחציו ${D / 2}. בדיקה: ${M(`${A} − ${D / 2} = ${A - D / 2}`)} ו־${M(`${B} + ${D / 2} = ${B + D / 2}`)}.` });
  },
};

// ---------- 8. the secret number ----------
// each clue is { text, pred, fact }; fact is the one-line check shown in the solution
function secretPool(s, L) {
  const ds = digitsOf(s), pool = [], add = (text, pred, fact) => pool.push({ text, pred, fact });
  const [t, u] = ds.length === 2 ? ds : [ds[1], ds[2]];
  add(isEven(s) ? 'אני מספר זוגי.' : 'אני מספר אי־זוגי.', n => n % 2 === s % 2, `${s} ${isEven(s) ? 'זוגי' : 'אי־זוגי'}.`);
  const sd = sumOf(ds);
  add(`סכום הספרות שלי הוא ${sd}.`, n => sumOf(digitsOf(n)) === sd, M(`${ds.join(' + ')} = ${sd}`) + '.');
  const cmp = Math.sign(t - u);
  if (L < 3) add(cmp > 0 ? 'ספרת העשרות שלי גדולה מספרת האחדות.' : cmp < 0 ? 'ספרת האחדות שלי גדולה מספרת העשרות.' : 'ספרת העשרות וספרת האחדות שלי שוות.',
    n => Math.sign(Math.floor(n / 10) % 10 - (n % 10)) === cmp, `ספרת העשרות ${t}, ספרת האחדות ${u}.`);
  if (s % 10 === 0) add('ספרת האחדות שלי היא 0.', n => n % 10 === 0, `${s} נגמר ב־0.`);
  else if (s % 5 === 0) add('אני מופיע כשסופרים בקפיצות של 5.', n => n % 5 === 0, `${s} נגמר ב־5.`);
  if (L === 1) {
    if (Math.random() < 0.5) add(`ספרת העשרות שלי היא ${t}.`, n => Math.floor(n / 10) === t, `ספרת העשרות ${t}.`);
    else add(`ספרת האחדות שלי היא ${u}.`, n => n % 10 === u, `ספרת האחדות ${u}.`);
    const a = Math.max(9, s - rnd(2, 15)), b = Math.min(100, s + rnd(2, 15));
    add(`אני גדול מ־${a}.`, n => n > a, M(`${s} > ${a}`) + '.');
    add(`אני קטן מ־${b}.`, n => n < b, M(`${s} < ${b}`) + '.');
  } else if (L === 2) {
    const H = ds[0];
    add(`ספרת המאות שלי היא ${H}.`, n => Math.floor(n / 100) === H, `ספרת המאות ${H}.`);
    if (Math.random() < 0.5) add(`ספרת העשרות שלי היא ${t}.`, n => Math.floor(n / 10) % 10 === t, `ספרת העשרות ${t}.`);
    else add(`ספרת האחדות שלי היא ${u}.`, n => n % 10 === u, `ספרת האחדות ${u}.`);
    const lo = H * 100 + (t >= 5 ? 50 : 0);
    add(`אני בין ${lo} ל־${lo + 50}.`, n => n > lo && n < lo + 50, `${s} בין ${lo} ל־${lo + 50}.`);
    const distinct = new Set(ds).size;
    add(distinct === 3 ? 'כל הספרות שלי שונות זו מזו.' : distinct === 1 ? 'כל הספרות שלי זהות.' : 'יש לי בדיוק שתי ספרות זהות.', n => new Set(digitsOf(n)).size === distinct, `הספרות: ${ds.join(', ')}.`);
    if (ds[0] === ds[2]) add('ספרת המאות שלי שווה לספרת האחדות.', n => Math.floor(n / 100) === n % 10, `${ds[0]} ו־${ds[2]}.`);
  } else {
    const d = Math.abs(t - u);
    add(d === 0 ? 'שתי הספרות שלי זהות.' : `ההפרש בין שתי הספרות שלי הוא ${d}.`, n => Math.abs(Math.floor(n / 10) - (n % 10)) === d, d === 0 ? `${t} ו־${u}.` : M(`${Math.max(t, u)} − ${Math.min(t, u)} = ${d}`) + '.');
    add(`מכפלת הספרות שלי היא ${t * u}.`, n => Math.floor(n / 10) * (n % 10) === t * u, M(`${t} × ${u} = ${t * u}`) + '.');
    if (u && t === 2 * u) add('ספרת העשרות שלי היא פי 2 מספרת האחדות.', n => Math.floor(n / 10) === 2 * (n % 10), M(`${t} = 2 × ${u}`) + '.');
    if (t && u === 2 * t) add('ספרת האחדות שלי היא פי 2 מספרת העשרות.', n => n % 10 === 2 * Math.floor(n / 10), M(`${u} = 2 × ${t}`) + '.');
    if (u && u !== t) add(u > t ? 'כשהופכים את סדר הספרות שלי, מקבלים מספר גדול ממני.' : 'כשהופכים את סדר הספרות שלי, מקבלים מספר קטן ממני.',
      n => n % 10 > 0 && Math.sign((n % 10) * 10 + Math.floor(n / 10) - n) === Math.sign(u - t), `ההפוך הוא ${u * 10 + t}.`);
    for (const k of [3, 4, 6, 7, 8, 9]) if (s % k === 0 && s <= 10 * k) add(`אני בלוח הכפל של ${k}.`, n => n % k === 0 && n <= 10 * k, M(`${s / k} × ${k} = ${s}`) + '.');
    const r = Math.round(Math.sqrt(s));
    if (r * r === s) add('אני מספר כפול עצמו.', n => Number.isInteger(Math.sqrt(n)), M(`${r} × ${r} = ${s}`) + '.');
    add(s > 50 ? 'אני גדול מ־50.' : 'אני קטן מ־50.', n => (s > 50 ? n > 50 : n < 50), M(`${s} ${s > 50 ? '>' : '<'} 50`) + '.');
  }
  return pool;
}
function makeSecret(L) {
  const [lo, hi] = L === 2 ? [100, 999] : [10, 99], all = range(hi - lo + 1, i => lo + i), [mn, mx] = L === 1 ? [3, 4] : [3, 5];
  for (;;) {
    const s = rnd(lo, hi);
    if (L === 3 && s % 10 === 0) continue;
    let cands = all, clues = [];
    for (const cl of shuffle(secretPool(s, L))) {
      const next = cands.filter(cl.pred);
      if (next.length < cands.length) {
        clues.push(cl);
        cands = next;
      }
      if (cands.length === 1) break;
    }
    if (cands.length !== 1) continue;
    for (let i = clues.length - 1; i >= 0; i--) {
      const rest = clues.filter((_, j) => j !== i);
      if (all.filter(n => rest.every(c => c.pred(n))).length === 1) clues = rest;
    }
    if (clues.length >= mn && clues.length <= mx) return { s, clues, all };
  }
}
const secret = {
  id: 'zpuz-secret', title: 'המספר הסודי',
  intro: `<p>הינשוף החכם חושב על מספר, ונותן רמזים. רק מספר אחד מתאים לכל הרמזים יחד.</p>
    <div class="ex">"אני בין 20 ל־30. אני אי־זוגי. סכום הספרות שלי הוא 9." ← בין 20 ל־30, סכום הספרות 9 רק ב־27. והוא באמת אי־זוגי. המספר הוא 27.</div>
    <p>טיפ: התחילו מהרמז שמשאיר הכי מעט מספרים, ובדקו אותם לפי שאר הרמזים.</p>`,
  gen(L) {
    const { s, clues, all } = makeSecret(L);
    const visual = `<ul class="zpuz-clues">${clues.map(c => `<li>${c.text}</li>`).join('')}</ul>`;
    const explain = `המספר הוא ${s}.<br>${clues.map(c => '✔ ' + c.fact).join('<br>')}`;
    const ds = digitsOf(s);
    if (L === 1) {
      const near = shuffle(all.filter(n => n !== s && clues.filter(c => !c.pred(n)).length === 1));
      const opts = [s, ...near.slice(0, 5)];
      while (opts.length < 6) {
        const n = rnd(10, 99);
        if (!opts.includes(n)) opts.push(n);
      }
      opts.sort((a, b) => a - b);
      const wrong = opts.find(n => n !== s), why = clues.find(c => !c.pred(wrong));
      return {
        prompt: '🦉 הינשוף חושב על מספר. מי מהמספרים מתאים לכל הרמזים?', visual,
        widget: choice(opts.map(String), { cols: 3, cls: 'nums' }), answer: opts.indexOf(s), check: v => v === opts.indexOf(s),
        hints: ['בדקו כל מספר לפי כל הרמזים. מספר שלא מתאים אפילו לרמז אחד, יוצא מהמשחק.', `${wrong} לא מתאים לרמז: "${why.text}"`],
        explain,
      };
    }
    return num({
      prompt: `🦉 הינשוף חושב על מספר בין ${L === 2 ? '100 ל־999' : '10 ל־99'}. מי המספר?`, visual, answer: s,
      hints: ['התחילו מהרמז שמשאיר הכי מעט אפשרויות. רשמו את המספרים שמתאימים לו, ומחקו לפי שאר הרמזים.', L === 2 ? `ספרת המאות היא ${ds[0]}, וספרת העשרות היא ${ds[1]}.` : `ספרת העשרות היא ${ds[0]}.`],
      explain,
    });
  },
};

// ---------- 9. boss: puzzles of every kind ----------
const kinds = [patterns, scales, sudoku, magic, parity, pyramid, steps, secret];
let lastKind = -1;
const boss = {
  id: 'zpuz-boss', title: 'בוס: החשבונאי חידון',
  intro: `<p>החשבונאי חידון נעל את הינשוף הזקן והחכם ביותר בכלוב, ושם עליו חמישה מנעולים. בכל מנעול חידה אחרת: סדרות, מאזניים, סודוקו, ריבועי קסם, זוגי ואי־זוגי, פירמידות, בעיות ומספרים סודיים. לפעמים החידה קשה קצת יותר ממה שהתרגלתם.</p>
    <div class="ex">פתחו לפחות 4 מנעולים, והינשוף יוצא לחופשי. 🦉</div>
    <p>קחו את הזמן. אין שעון.</p>`,
  gen(L) {
    let k;
    do k = rnd(0, kinds.length - 1); while (k === lastKind);
    lastKind = k;
    const lvl = L < 3 && Math.random() < 0.35 ? L + 1 : L, r = kinds[k].gen(lvl);
    return { ...r, prompt: `<span class="zpuz-lock">🔒 ${kinds[k].title}</span> ${r.prompt}` };
  },
};

export default {
  id: 'zpuz', name: 'מתחם הינשופים', icon: '🦉', color: '#c084fc', boss: 'החשבונאי חידון',
  tagline: 'הינשופים הם החכמים ביותר בגן, ולכן החשבונאים נעלו אותם מאחורי חידות. כאן מנצח מי שחושב ובודק.',
  challenges: [patterns, scales, sudoku, magic, parity, pyramid, steps, secret, boss],
};

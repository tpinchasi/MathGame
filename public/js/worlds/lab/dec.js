// מעבדת העשרוניים
import { rnd, pick, shuffle, range, gcd, near, nf, M, fr, F, showFrac, h } from '../../util.js';
import { inputs, box, choice, gridPaint } from '../../widgets.js';
import { num, fracAns } from '../../kit.js';
import { areaModel, bar } from '../../visuals.js';

// ---------- helpers ----------
const cl = x => Math.round(x * 1e9) / 1e9;
const N = x => M(nf(x));
const dec = (k, p) => cl(k / 10 ** p); // integer k scaled by 10^−p
// k·10^−p written with exactly p decimals, trailing zeros kept: fx(340, 2) = '3.40'
const fx = (k, p) => {
  const s = String(k).padStart(p + 1, '0');
  return p ? `${s.slice(0, -p)}.${s.slice(-p)}` : s;
};
const placesOf = x => (nf(x).split('.')[1] || '').length;
// a written decimal padded with zeros to P decimals ('2.3' → '2.300')
const pad = (s, P) => {
  const [a, b = ''] = String(s).split('.');
  return P ? `${a}.${b.padEnd(P, '0')}` : a;
};
const andList = parts => (parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} ו־⁠${parts[parts.length - 1]}`);
const places = n => (n === 1 ? 'מקום אחד' : `${M(n)} מקומות`);
const afterPt = n => (n === 1 ? 'ספרה אחת' : n === 0 ? 'אפס ספרות' : `${M(n)} ספרות`);
const EQ = '<span class="eq">=</span>';
const pctS = p => M(`${nf(p)}%`);

// a decimal typed into one box; line(B) lays out the answer line (default: math, left to right)
const dAns = ({ prompt, visual, pre = '', line, ans, hints, explain, tries, wrongMsg }) => {
  const B = box('a', Math.max(3, nf(ans).length + 1), false, 'd');
  return {
    prompt, visual, hints, explain, tries,
    widget: inputs(`<div class="ans-line">${line ? line(B) : M(pre + B)}</div>`),
    answer: { a: ans }, check: v => near(v.a, ans),
    wrongMsg: wrongMsg || (v => ([10, 100, 1000, 0.1, 0.01, 0.001].some(f => near(cl(v.a * f), ans)) ? 'הספרות נכונות, אבל הנקודה העשרונית לא במקום.' : '')),
  };
};

// a whole-number answer whose expression sits in the same left-to-right line as the box
const wAns = ({ prompt, visual, pre = '', ans, hints, explain, tries }) => ({
  prompt, visual, hints, explain, tries,
  widget: inputs(`<div class="ans-line">${M(pre + box('a', String(ans).length + 1))}</div>`),
  answer: { a: ans }, check: v => v.a === ans,
});

// an answer that is a whole number, a fraction or a mixed number (any equivalent form)
const ratAns = ({ prompt, visual, pre = '', tpl, n: n0, d: d0, hints, explain, tries }) => {
  const g = gcd(n0, d0), n = n0 / g, d = d0 / g, w = Math.floor(n / d), r = n % d;
  const B = `${box('w', 2, true)}${fr(box('n', 3, true), box('d', 3, true))}`;
  const inp = inputs(`<div class="ans-line">${M(tpl ? tpl(B) : pre + B)}</div>`);
  const widget = { ...inp, value: () => ([...inp.el.querySelectorAll('.inbox')].every(b => b.textContent === '') ? null : inp.value()) };
  return {
    prompt, visual, hints, explain, tries, widget,
    answer: r ? (w ? { w, n: r, d } : { n: r, d }) : { w },
    check: v => (v.d ? (v.w * v.d + v.n) * d === n * v.d : !v.n && v.w * d === n),
  };
};

// numbers one under the other with the decimal points aligned; missing zeros are shown faint
function columns(rows, op, res) {
  const all = res == null ? rows : [...rows, res], sp = s => [s.split('.')[0], s.split('.')[1] || ''];
  const W = Math.max(...all.map(s => sp(s)[0].length)), P = Math.max(...all.map(s => sp(s)[1].length));
  const row = (s, sign) => {
    const [a, b] = sp(s);
    return `<i class="ldec-op">${sign}</i>${range(W - a.length, () => '<i></i>').join('')}${[...a].map(c => `<i>${c}</i>`).join('')}` +
      (P ? `<i class="${b ? 'ldec-p' : 'ldec-p z'}">.</i>${range(P, j => (j < b.length ? `<i>${b[j]}</i>` : '<i class="z">0</i>')).join('')}` : '');
  };
  return `<div class="ldec-colw"><div class="ldec-cols" dir="ltr" style="grid-template-columns:repeat(${1 + W + (P ? P + 1 : 0)},auto)">` +
    `${rows.map((s, i) => row(s, i ? op : '')).join('')}<b class="ldec-rule"></b>${res == null ? '' : row(res, '')}</div></div>`;
}

// ---------- 1. place value ----------
const PL = { 1: 'עשרות', 0: 'יחידות', '-1': 'עשיריות', '-2': 'מאיות', '-3': 'אלפיות' };
const thou = T => cl(T / 1000); // integer thousandths → number
const digitAt = (T, e) => Math.floor(T / 10 ** (e + 3)) % 10;
const PL1 = { 1: 'עשרת אחת', 0: 'יחידה אחת', '-1': 'עשירית אחת', '-2': 'מאית אחת', '-3': 'אלפית אחת' };
const units = (d, e) => (d === 1 ? PL1[e] : `${M(d)} ${PL[e]}`); // "3 מאיות", "מאית אחת"
const spell = T => andList([1, 0, -1, -2, -3].filter(e => digitAt(T, e)).map(e => units(digitAt(T, e), e)));

// one dial per place; ▲/▼ turn the digit
function dials(exps) {
  const dg = exps.map(() => 0);
  let touched = false, locked = false;
  const read = h('div', { class: 'ldec-read', dir: 'ltr' });
  const T = () => exps.reduce((s, e, i) => s + dg[i] * 10 ** (e + 3), 0);
  const cols = exps.map((e, i) => {
    const d = h('b', { class: 'ldec-dg' }, '0');
    const step = by => () => {
      if (locked) return;
      dg[i] = (dg[i] + by + 10) % 10;
      touched = true;
      paint();
    };
    const el = h('div', { class: 'ldec-dial' + (e < 0 ? ' fr' : '') },
      h('small', {}, PL[e]),
      h('button', { type: 'button', class: 'ldec-arr', 'aria-label': `עוד ${PL[e]}`, onclick: step(1) }, '▲'), d,
      h('button', { type: 'button', class: 'ldec-arr', 'aria-label': `פחות ${PL[e]}`, onclick: step(-1) }, '▼'));
    return { e, d, el };
  });
  const row = h('div', { class: 'ldec-dials', dir: 'ltr' });
  cols.forEach(c => {
    row.append(c.el);
    if (c.e === 0) row.append(h('b', { class: 'ldec-dot', 'aria-label': 'נקודה עשרונית' }));
  });
  const paint = () => {
    cols.forEach((c, i) => (c.d.textContent = dg[i]));
    read.textContent = touched ? nf(thou(T())) : '';
  };
  paint();
  return {
    el: h('div', { class: 'ldec-dialw' }, row, read),
    value: () => (touched ? thou(T()) : null),
    set(a) {
      const k = Math.round(a * 1000);
      exps.forEach((e, i) => (dg[i] = digitAt(k, e)));
      touched = true;
      paint();
    },
    lock() {
      locked = true;
    },
  };
}

const dialRound = (T, exps, prompt, hints, explain) => {
  const t = thou(T);
  return { prompt, widget: dials(exps), answer: t, check: v => near(v, t), hints, explain };
};
const digits4 = () => shuffle(range(9, i => i + 1)).slice(0, 4); // ones, tenths, hundredths, thousandths
const fromDigits = ds => ds.reduce((s, d, i) => s + d * 10 ** (3 - i), 0);

const place = {
  id: 'ldec-place', title: 'ערך המקום',
  intro: `<p>במספר עשרוני, כל מקום מימין לנקודה קטן פי 10 מהמקום שלפניו: <b>עשיריות</b>, <b>מאיות</b>, <b>אלפיות</b>.</p>
    <div class="ex">${N(3.47)} = 3 יחידות, 4 עשיריות ו־7 מאיות.<br>${N(0.305)} = 3 עשיריות ו־5 אלפיות (אין מאיות, לכן יש 0 במקום שלהן).</div>
    <p>10 עשיריות הן יחידה אחת, ו־10 מאיות הן עשירית אחת: ${M('23')} מאיות = ${N(0.23)}.</p>
    <p>במכשיר החוגות לוחצים על ▲ ועל ▼ כדי לשנות כל ספרה.</p>`,
  gen(L) {
    const t = rnd(0, 2);
    if (L === 1) {
      const ex = [0, -1, -2, -3];
      if (t === 0) {
        const ps = [0, ...shuffle([-1, -2, -3]).slice(0, rnd(2, 3))];
        const T = ps.reduce((s, e) => s + rnd(2, 9) * 10 ** (e + 3), 0);
        return dialRound(T, ex, `כוונו את החוגות למספר שיש בו ${spell(T)}.`,
          ['כל חוגה היא מקום אחד. הנקודה באה אחרי היחידות. מקום שלא הוזכר נשאר 0.', `המספר הוא ${N(thou(T))}.`],
          `${spell(T)}: ${N(thou(T))}`);
      }
      if (t === 1) {
        const ds = digits4(), i = rnd(0, 3), d = ds[i], x = thou(fromDigits(ds));
        return {
          prompt: `מה הערך של הספרה ${M(d)} במספר ${N(x)}?`,
          widget: choice([0, 1, 2, 3].map(j => N(dec(d, j))), { cols: 2, cls: 'nums' }), answer: i, check: v => v === i,
          hints: ['באיזה מקום נמצאת הספרה? יחידות, עשיריות, מאיות או אלפיות?', `הספרה ${M(d)} נמצאת במקום ה${PL[-i]}.`],
          explain: `הספרה ${M(d)} נמצאת במקום ה${PL[-i]}, לכן הערך שלה ${N(dec(d, i))}.`,
        };
      }
      const p = rnd(1, 3), den = 10 ** p;
      let k;
      do k = rnd(1, den * 10 - 1); while (k % 10 === 0);
      const T = k * 10 ** (3 - p);
      return dialRound(T, ex, `כוונו את החוגות למספר ${F(k, den)}.`,
        [`${F(k, den)} הם ${units(k, -p)}.`, `כלומר ${spell(T)}.`],
        `${M(`${fr(k, den)} = ${nf(thou(T))}`)}: ${spell(T)}.`);
    }
    const ex = [1, 0, -1, -2, -3];
    if (L === 2) {
      if (t === 0) {
        const ps = shuffle(ex).slice(0, rnd(3, 4)), T = ps.reduce((s, e) => s + rnd(2, 9) * 10 ** (e + 3), 0);
        const words = ps.map(e => `${M(digitAt(T, e))} ${PL[e]}`);
        return dialRound(T, ex, `כוונו את החוגות למספר שיש בו ${andList(words)}. שימו לב לסדר!`,
          ['מצאו לכל חלק את החוגה שלו. העשרות והיחידות משמאל לנקודה.', `המספר הוא ${N(thou(T))}.`],
          `${spell(T)}: ${N(thou(T))}`);
      }
      if (t === 1) {
        const [e1, e2] = pick([[0, -2], [0, -3], [-1, -3], [1, -1], [1, -2]]), d = rnd(2, 9), c = rnd(2, 9) * 10 + rnd(2, 9);
        const T = d * 10 ** (e1 + 3) + c * 10 ** (e2 + 3), parts = shuffle([`${M(d)} ${PL[e1]}`, `${M(c)} ${PL[e2]}`]);
        return dialRound(T, ex, `כוונו את החוגות למספר שיש בו ${andList(parts)}.`,
          [`על חוגה אפשר לשים רק ספרה אחת. ${M(c)} ${PL[e2]} הם ${M(Math.floor(c / 10))} ${PL[e2 + 1]} ו־⁠${M(c % 10)} ${PL[e2]}.`, `המספר הוא ${N(thou(T))}.`],
          `${M(c)} ${PL[e2]} = ${N(thou(c * 10 ** (e2 + 3)))}, ועוד ${M(d)} ${PL[e1]}: ${N(thou(T))}`);
      }
      const p = rnd(1, 2), e = -rnd(p, 3);
      let K;
      do K = rnd(p === 1 ? 11 : 101, p === 1 ? 99 : 999); while (K % 10 === 0);
      const x = dec(K, p), ans = K * 10 ** (-e - p);
      return num({
        prompt: `כמה ${PL[e]} יש ב־⁠${N(x)}?`, answer: ans,
        hints: [`ביחידה אחת יש ${M(10 ** -e)} ${PL[e]}.`, `כפלו את ${N(x)} ב־⁠${M(10 ** -e)}.`],
        explain: `${M(`${nf(x)} × ${10 ** -e} = ${ans}`)}, לכן ב־⁠${N(x)} יש ${M(ans)} ${PL[e]}.`,
      });
    }
    if (t === 0) {
      const ps = shuffle([0, -1, -2, -3]).slice(0, 3).sort((a, b) => b - a);
      let cs;
      do cs = ps.map((e, i) => (i && Math.random() < 0.6 ? rnd(11, 49) : rnd(2, 9))); while (cs.every(c => c < 10) || cs.some(c => c % 10 === 0));
      const T = ps.reduce((s, e, i) => s + cs[i] * 10 ** (e + 3), 0), dParts = ps.map((e, i) => nf(thou(cs[i] * 10 ** (e + 3))));
      return dialRound(T, ex, `כוונו את החוגות למספר שיש בו ${andList(ps.map((e, i) => `${M(cs[i])} ${PL[e]}`))}.`,
        ['כתבו כל חלק כמספר עשרוני. למשל 15 עשיריות הן 1.5, ו־34 מאיות הן 0.34.', `חברו: ${M(dParts.join(' + '))}.`],
        `${M(`${dParts.join(' + ')} = ${nf(thou(T))}`)}`);
    }
    if (t === 1) {
      const ds = digits4(), i = rnd(1, 3), a = ds[i];
      let b;
      do b = rnd(1, 9); while (b === a);
      const nds = [...ds];
      nds[i] = b;
      const x = thou(fromDigits(ds)), y = thou(fromDigits(nds)), ans = dec(Math.abs(b - a), i);
      return dAns({
        prompt: `במספר ${N(x)} מחליפים את הספרה ${M(a)} בספרה ${M(b)}. ב${b > a ? 'כמה יגדל' : 'כמה יקטן'} המספר?`, ans,
        hints: [`באיזה מקום נמצאת הספרה ${M(a)}? כמה שווה כל צעד במקום הזה?`, `הספרה נמצאת במקום ה${PL[-i]}, והיא משתנה ב־⁠${M(Math.abs(b - a))}.`],
        explain: `${N(x)} הופך ל־⁠${N(y)}. השינוי הוא ${units(Math.abs(b - a), -i)}, כלומר ${N(ans)}.`,
      });
    }
    const d = rnd(1, 9), [i, j] = pick([[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]]);
    const others = shuffle(range(9, k => k + 1).filter(k => k !== d)), ds = range(4, k => (k === i || k === j ? d : others.pop()));
    const x = thou(fromDigits(ds)), v1 = dec(d, i), v2 = dec(d, j), ans = 10 ** (j - i);
    return num({
      prompt: `במספר ${N(x)} הספרה ${M(d)} מופיעה פעמיים. פי כמה גדול הערך של ה־⁠${M(d)} השמאלית מהערך של ה־⁠${M(d)} הימנית?`, answer: ans,
      hints: ['כל מקום גדול פי 10 מהמקום שמימינו.', `השמאלית שווה ${N(v1)}, והימנית שווה ${N(v2)}.`],
      explain: `${N(v1)} גדול פי ${M(ans)} מ־⁠${N(v2)}, כי ${M(`${nf(v2)} × ${ans} = ${nf(v1)}`)}.`,
    });
  },
};

// ---------- 2. compare and order ----------
// tap the tubes in order; they line up in the rack with < (or >) between them
function tubeSort(labels, values, { desc = false } = {}) {
  const n = labels.length;
  let order = [], locked = false;
  const shelf = h('div', { class: 'ldec-shelf', dir: 'ltr' }), rack = h('div', { class: 'ldec-rack', dir: 'ltr' });
  const draw = () => {
    shelf.innerHTML = '';
    rack.innerHTML = '';
    labels.forEach((l, i) => shelf.append(h('button', {
      type: 'button', class: 'ldec-tube' + (order.includes(i) ? ' gone' : ''), html: `<span>${l}</span>`,
      onclick: () => {
        if (locked || order.includes(i)) return;
        order.push(i);
        draw();
      },
    })));
    for (let k = 0; k < n; k++) {
      if (k) rack.append(h('span', { class: 'ldec-sgn', html: desc ? '&gt;' : '&lt;' }));
      const i = order[k];
      rack.append(i == null ? h('span', { class: 'ldec-slot' }) : h('button', {
        type: 'button', class: 'ldec-slot full', html: labels[i],
        onclick: () => {
          if (locked) return;
          order.splice(k, 1);
          draw();
        },
      }));
    }
  };
  draw();
  return {
    el: h('div', { class: 'ldec-sort' }, shelf, rack, h('p', { class: 'tip' }, 'לחצו על המבחנות לפי הסדר. לחיצה על מבחנה במדף התחתון מחזירה אותה.')),
    value: () => (order.length === n ? [...order] : null),
    set(a) {
      order = [...a];
      draw();
    },
    lock() {
      locked = true;
    },
    check: v => v.every((i, k) => !k || (desc ? values[v[k - 1]] > values[i] : values[v[k - 1]] < values[i])),
  };
}
const sortRound = ({ prompt, labels, values, desc = false, hints, explain }) => {
  const w = tubeSort(labels, values, { desc });
  return { prompt, widget: w, answer: range(values.length).sort((a, b) => (desc ? values[b] - values[a] : values[a] - values[b])), check: w.check, hints, explain };
};

// a measuring scale from lo to lo + n·st (integers in units of 10^−p); labels at the ticks in lab
function scaleSVG({ lo, st, n, p, lab, mark = null, hits = false }) {
  const x = k => 34 + (k * 412) / n;
  let s = `<svg viewBox="0 0 480 118" class="ldec-scale"><rect x="6" y="4" width="468" height="78" rx="10" class="ldec-ruler"/>`;
  for (let k = 0; k <= n; k++) {
    const big = lab.includes(k), mid = !big && n % 2 === 0 && k === n / 2;
    s += `<line x1="${x(k)}" y1="4" x2="${x(k)}" y2="${big ? 42 : mid ? 34 : 26}" class="ldec-tk${big ? ' big' : ''}"/>`;
    if (big) s += `<text x="${x(k)}" y="70" class="ldec-tl">${nf(dec(lo + k * st, p))}</text>`;
  }
  if (mark != null) s += `<line x1="${x(mark)}" y1="4" x2="${x(mark)}" y2="82" class="ldec-ml"/><path d="M${x(mark)} 84l-11 19h22z" class="ldec-mk"/><circle cx="${x(mark)}" cy="106" r="9" class="ldec-mk"/>`;
  if (hits) for (let k = 0; k <= n; k++) s += `<rect data-k="${k}" x="${x(k) - 206 / n}" y="0" width="${412 / n}" height="118" class="hit"/>`;
  return s + '</svg>';
}
function scaleTap(o) {
  let k = null, locked = false;
  const el = h('div', { class: 'ldec-scalew', dir: 'ltr' });
  const draw = () => (el.innerHTML = scaleSVG({ ...o, mark: k, hits: true }));
  el.addEventListener('click', e => {
    const v = e.target.dataset && e.target.dataset.k;
    if (locked || v == null) return;
    k = +v;
    draw();
  });
  draw();
  return { el, value: () => k, set(a) { k = a; draw(); }, lock() { locked = true; } };
}
const scaleRound = ({ lo, st, n, p, lab, k, read, hints, explain }) => {
  const target = dec(lo + k * st, p);
  if (read)
    return dAns({
      prompt: 'איזה מספר מראה החץ על הסרגל?', visual: `<div dir="ltr">${scaleSVG({ lo, st, n, p, lab, mark: k })}</div>`, ans: target,
      line: B => M(B), hints, explain,
    });
  return { prompt: `סמנו על הסרגל את ${N(target)}: לחצו על השנתה המתאימה.`, widget: scaleTap({ lo, st, n, p, lab }), answer: k, check: v => v === k, hints, explain };
};

const signRound = (a, b, L) => {
  const va = Number(a), vb = Number(b), idx = Math.sign(va - vb) + 1, sign = ['&lt;', '=', '&gt;'][idx];
  const P = Math.max(placesOf(va), placesOf(vb), (a.split('.')[1] || '').length, (b.split('.')[1] || '').length), pa = pad(a, P), pb = pad(b, P);
  return {
    prompt: 'איזה סימן מתאים בין שני המספרים?',
    visual: M(`<span class="big">${a}<span class="qm">?</span>${b}</span>`),
    widget: choice(['&lt;', '=', '&gt;'], { cols: 3, cls: 'signs' }), answer: idx, check: v => v === idx, tries: 1,
    hints: [L === 1 ? 'משווים קודם את השלמים, ואחר כך ספרה אחרי ספרה: עשיריות, אחר כך מאיות.' : 'אורך המספר לא קובע! משווים מקום אחרי מקום, משמאל לימין.', `הוסיפו אפסים בסוף כדי שיהיה אותו מספר ספרות: ${M(pa)} ו־⁠${M(pb)}.`],
    explain: `${M(`${pa} ${sign} ${pb}`)}, לכן ${M(`${a} ${sign} ${b}`)}.`,
  };
};
const sortedText = (labels, values, desc) => M(range(values.length).sort((a, b) => (desc ? values[b] - values[a] : values[a] - values[b])).map(i => labels[i]).join(desc ? ' &gt; ' : ' &lt; '));
const SC3 = [[0, 50, 20], [1000, 20, 10], [2000, 50, 10], [300, 5, 20], [600, 25, 8], [1500, 25, 20], [0, 250, 8], [4000, 20, 10], [700, 10, 10]];

const order = {
  id: 'ldec-order', title: 'משווים ומסדרים',
  intro: `<p>כדי להשוות מספרים עשרוניים משווים קודם את השלמים, ואחר כך מקום אחרי מקום: עשיריות, מאיות, אלפיות. <b>אורך המספר לא קובע!</b></p>
    <div class="ex">${M('0.5 &gt; 0.45')}, כי ${M('0.5 = 0.50')} ו־50 מאיות יותר מ־45 מאיות.</div>
    <p>על סרגל מדידה בודקים קודם כמה שווה כל שנתה: מחלקים את ההפרש בין שני מספרים כתובים במספר הקטעים שביניהם.</p>
    <p>בשאלות הסימנים (&lt;, =, &gt;) יש ניסיון אחד בלבד.</p>`,
  gen(L) {
    const w = rnd(0, 9);
    if (L === 1) {
      const t = rnd(0, 2);
      if (t === 0) {
        const d = rnd(1, 9), u = rnd(0, 3);
        let pr;
        if (u === 0) {
          let e;
          do e = rnd(11, 99); while (e % 10 === 0);
          pr = [fx(w * 10 + d, 1), fx(w * 100 + e, 2)];
        } else if (u === 1) pr = [fx(w * 10 + d, 1), fx(w * 100 + d * 10, 2)];
        else if (u === 2) pr = [fx(w * 100 + d, 2), fx(w * 10 + d, 1)];
        else {
          let a, b;
          do [a, b] = [rnd(1, 99), rnd(1, 99)]; while (a === b);
          pr = [fx(w * 100 + a, 2), fx(w * 100 + b, 2)];
        }
        if (Math.random() < 0.5) pr.reverse();
        return signRound(pr[0], pr[1], 1);
      }
      if (t === 1) {
        let vs;
        do vs = shuffle(range(99, i => i + 1)).slice(0, 4); while (!vs.some(v => v % 10 === 0) || vs.every(v => v % 10 === 0));
        const values = vs.map(v => dec(w * 100 + v, 2)), labels = values.map(nf);
        return sortRound({
          prompt: 'סדרו את המבחנות מהמספר הקטן ביותר לגדול ביותר.', labels, values,
          hints: ['הוסיפו אפס בסוף למספרים שיש להם ספרה אחת אחרי הנקודה, ואז השוו.', `עם אותו מספר ספרות: ${M(labels.map(l => pad(l, 2)).join(', '))}.`],
          explain: sortedText(labels, values),
        });
      }
      const k = pick([2, 3, 4, 6, 7, 8, 9]);
      return scaleRound({
        lo: w * 10, st: 1, n: 10, p: 1, lab: [0, 5, 10], k,
        hints: ['בין שני מספרים שלמים יש 10 קטעים. כל שנתה היא עשירית.', `${N(dec(w * 10 + k, 1))} נמצא ${M(k)} שנתות אחרי ${M(w)}.`],
        explain: `כל שנתה שווה ${N(0.1)}, ו־⁠${N(dec(w * 10 + k, 1))} נמצא ${M(k)} שנתות אחרי ${M(w)}.`,
      });
    }
    if (L === 2) {
      const t = rnd(0, 3);
      if (t === 0) {
        const tt = rnd(1, 7), gens = [() => tt * 100, () => (tt + 1) * 100, () => tt * 100 + 10 * rnd(1, 9), () => tt * 100 + rnd(1, 9), () => tt * 100 + rnd(11, 99), () => rnd(1, 9) * 10 + rnd(0, 9)];
        const set = new Set();
        while (set.size < 5) set.add(pick(gens)());
        const values = [...set].map(v => dec(w * 1000 + v, 3)), labels = values.map(nf);
        return sortRound({
          prompt: 'סדרו את המבחנות מהמספר הקטן ביותר לגדול ביותר.', labels, values,
          hints: ['הוסיפו אפסים בסוף כך שלכל המספרים יהיו 3 ספרות אחרי הנקודה.', `עם 3 ספרות אחרי הנקודה: ${M(labels.map(l => pad(l, 3)).join(', '))}.`],
          explain: sortedText(labels, values),
        });
      }
      if (t === 3) {
        let x;
        do x = w * 1000 + rnd(1, 999); while (x % 10 === 0);
        const q = rnd(1, 2), y = Math.round(x / 10 ** (3 - q)) + pick([-1, 0, 0, 1]), pr = shuffle([fx(x, 3), fx(Math.max(y, 1), q)]);
        return signRound(pr[0], pr[1], 2);
      }
      const b = rnd(0, 9), lo = w * 100 + b * 10, k = rnd(1, 9), target = dec(lo + k, 2);
      return scaleRound({
        lo, st: 1, n: 10, p: 2, lab: [0, 10], k, read: t === 2,
        hints: [`בין ${N(dec(lo, 2))} ל־⁠${N(dec(lo + 10, 2))} יש 10 קטעים. כמה שווה כל שנתה?`, `כל שנתה שווה ${N(0.01)}. ${N(target)} נמצא ${M(k)} שנתות אחרי ${N(dec(lo, 2))}.`],
        explain: `כל שנתה שווה ${N(0.01)}, לכן ${M(k)} שנתות אחרי ${N(dec(lo, 2))} נמצא ${N(target)}.`,
      });
    }
    const t = rnd(0, 3);
    if (t <= 1) {
      const [lo, st, n] = pick(SC3), lab = n === 20 ? [0, 10, 20] : [0, n];
      let k;
      do k = rnd(1, n - 1); while (lab.includes(k) || k * 2 === n);
      const target = dec(lo + k * st, 3);
      return scaleRound({
        lo, st, n, p: 3, lab, k, read: t === 1,
        hints: [`ההפרש בין ${N(dec(lo, 3))} ל־⁠${N(dec(lo + n * st, 3))} הוא ${N(dec(n * st, 3))}, והוא מחולק ל־⁠${M(n)} קטעים. כמה שווה כל שנתה?`, `כל שנתה שווה ${N(dec(st, 3))}, ו־⁠${N(target)} נמצא ${M(k)} שנתות אחרי ${N(dec(lo, 3))}.`],
        explain: `כל שנתה שווה ${M(`${nf(dec(n * st, 3))} ÷ ${n} = ${nf(dec(st, 3))}`)}.<br>${N(target)} נמצא ${M(k)} שנתות אחרי ${N(dec(lo, 3))}, כי ${M(`${nf(dec(lo, 3))} + ${k} × ${nf(dec(st, 3))} = ${nf(target)}`)}.`,
      });
    }
    if (t === 2) {
      const q = rnd(1, 2);
      let A;
      do A = w * 10 ** q + rnd(1, 10 ** q - 2); while (A % 10 === 0 && q === 2);
      const a = dec(A, q), b = dec(A + 1, q), mid = dec(A * 10 + 5, q + 1), pa = fx(A * 10, q + 1), pb = fx((A + 1) * 10, q + 1);
      return {
        ...dAns({
          prompt: `כתבו מספר שגדול מ־⁠${N(a)} וקטן מ־⁠${N(b)}.`, ans: mid, line: B => M(`${nf(a)} &lt; ${B} &lt; ${nf(b)}`),
          hints: ['נראה שאין ביניהם כלום? הוסיפו אפס בסוף לשני המספרים.', `${N(a)} = ${M(pa)} ו־⁠${N(b)} = ${M(pb)}. איזה מספר נמצא ביניהם?`],
          explain: `למשל ${N(mid)}, כי ${M(`${pa} &lt; ${fx(A * 10 + 5, q + 1)} &lt; ${pb}`)}. יש עוד הרבה תשובות נכונות, למשל ${N(dec(A * 100 + 37, q + 2))}.`,
        }),
        check: v => v.a > a + 1e-12 && v.a < b - 1e-12,
        wrongMsg: v => (v.a <= a + 1e-12 ? `${N(v.a)} לא גדול מ־⁠${N(a)}.` : `${N(v.a)} לא קטן מ־⁠${N(b)}.`),
      };
    }
    const d = rnd(1, 9), set = shuffle([100, 10, 1, 110, 11, 101, 111]).slice(0, 5), w3 = rnd(0, 3);
    const values = set.map(v => dec(w3 * 1000 + v * d, 3)), labels = values.map(nf);
    return sortRound({
      prompt: 'סדרו את המבחנות הפעם מהמספר <b>הגדול</b> ביותר לקטן ביותר.', labels, values, desc: true,
      hints: ['הוסיפו אפסים בסוף כך שלכולם יהיו 3 ספרות אחרי הנקודה, ואז השוו.', `עם 3 ספרות אחרי הנקודה: ${M(labels.map(l => pad(l, 3)).join(', '))}.`],
      explain: sortedText(labels, values, true),
    });
  },
};

// ---------- 3. add and subtract ----------
const randDec = (p, lo, hi) => { // a number with exactly p decimals, between lo and hi (in whole units)
  let K;
  do K = rnd(lo * 10 ** p + 1, hi * 10 ** p - 1); while (p && K % 10 === 0);
  return K;
};
const addSub = {
  id: 'ldec-add', title: 'חיבור וחיסור',
  intro: `<p>מחברים ומחסרים עשרוניים בטור: <b>נקודה מתחת לנקודה</b>, ואז מחשבים כמו במספרים שלמים, מימין לשמאל. אם חסרות ספרות, מוסיפים אפסים בסוף.</p>
    <div class="ex">${columns(['12.5', '3.86'], '+', '16.36')}</div>
    <div class="ex">${M('8 − 2.35 = 8.00 − 2.35 = 5.65')}</div>`,
  gen(L) {
    if (L === 1) {
      const p = rnd(1, 2), plus = Math.random() < 0.5;
      let A = randDec(p, 1, 60), B = randDec(p, 1, 40);
      if (!plus && A < B) [A, B] = [B, A];
      if (A === B) A += 10 ** p;
      const sa = fx(A, p), sb = fx(B, p), R = plus ? A + B : A - B, op = plus ? '+' : '−', res = dec(R, p);
      return dAns({
        prompt: `${plus ? 'חברו' : 'חסרו'} בטור. הנקודות כבר מסודרות זו מתחת לזו.`, visual: columns([sa, sb], op), ans: res, pre: `${sa} ${op} ${sb}${EQ}`,
        hints: ['מחשבים כמו במספרים שלמים, מימין לשמאל, והנקודה בתוצאה יורדת בדיוק מתחת לנקודות.', `בלי הנקודה: ${M(`${A} ${op} ${B} = ${R}`)}. בתוצאה יש ${afterPt(p)} אחרי הנקודה.`],
        explain: columns([sa, sb], op, fx(R, p)),
      });
    }
    if (L === 2) {
      const t = rnd(0, 2);
      if (t === 2) {
        const pb = rnd(1, 3), B = randDec(pb, 1, 9), b = dec(B, pb), c = dec(rnd(Math.ceil(b) * 10 + 1, 150), 1) , ans = cl(c - b), sb = nf(b), sc = nf(c);
        return dAns({
          prompt: 'איזה מספר חסר?', ans, line: X => M(`${sb} + ${X} = ${sc}`),
          hints: ['כמה צריך להוסיף? זה תרגיל חיסור.', `חשבו ${M(`${sc} − ${sb}`)} בטור, נקודה מתחת לנקודה.`],
          explain: `${columns([sc, sb], '−', nf(ans))}`,
        });
      }
      let pa, pb;
      do [pa, pb] = [rnd(0, 3), rnd(1, 3)]; while (pa === pb || Math.max(pa, pb) < 2);
      const plus = t === 0;
      let a = dec(randDec(pa, 1, 40), pa), b = dec(randDec(pb, 1, 30), pb);
      if (!plus && a < b) [a, b] = [b, a];
      if (near(a, b)) a = cl(a + 1);
      const sa = nf(a), sb = nf(b), op = plus ? '+' : '−', ans = cl(plus ? a + b : a - b);
      return dAns({
        prompt: `פתרו. שימו לב שלמספרים יש מספר שונה של ספרות אחרי הנקודה.`, ans, pre: `${sa} ${op} ${sb}${EQ}`,
        hints: ['כתבו את המספרים זה מתחת לזה, נקודה מתחת לנקודה, והשלימו אפסים בסוף.', columns([sa, sb], op)],
        explain: columns([sa, sb], op, nf(ans)),
      });
    }
    const t = rnd(0, 2);
    if (t === 0) {
      const ps = shuffle([0, 1, 2, 3]).slice(0, 3);
      let a, b, c;
      do [a, b, c] = [dec(randDec(ps[0] || 0, 2, 30), ps[0]), dec(randDec(ps[1], 1, 20), ps[1]), dec(randDec(ps[2], 1, 30), ps[2])]; while (a + b - c < 0.5);
      const ab = cl(a + b), ans = cl(ab - c);
      return dAns({
        prompt: 'פתרו את התרגיל.', ans, pre: `${nf(a)} + ${nf(b)} − ${nf(c)}${EQ}`,
        hints: ['פתרו משמאל לימין: קודם את החיבור ואחר כך את החיסור. בכל שלב: נקודה מתחת לנקודה.', `${M(`${nf(a)} + ${nf(b)} = ${nf(ab)}`)}`],
        explain: `${M(`${nf(a)} + ${nf(b)} = ${nf(ab)}`)}, ואז ${M(`${nf(ab)} − ${nf(c)} = ${nf(ans)}`)}.`,
      });
    }
    if (t === 1) {
      let A, b, c, d;
      do [A, b, c, d] = [dec(rnd(30, 95), 1), dec(randDec(2, 0, 3), 2), dec(randDec(3, 0, 2), 3), dec(randDec(1, 0, 3), 1)]; while (A - b - c < 0.4);
      const ans = cl(A - b - c + d);
      return dAns({
        prompt: `במבחנה גדולה היו ${N(A)} ליטר תמיסה. מזגו ממנה ${N(b)} ליטר לכוס אחת ו־⁠${N(c)} ליטר לכוס שנייה, ואז הוסיפו לה ${N(d)} ליטר מים. כמה ליטר יש עכשיו במבחנה?`,
        ans, line: B => `${B} ליטר`,
        hints: ['כתבו תרגיל: מה שהיה, פחות מה שמזגו, ועוד מה שהוסיפו.', `${M(`${nf(A)} − ${nf(b)} − ${nf(c)} + ${nf(d)}`)}`],
        explain: `${M(`${nf(A)} − ${nf(b)} = ${nf(cl(A - b))}`)}, ${M(`${nf(cl(A - b))} − ${nf(c)} = ${nf(cl(A - b - c))}`)}, ${M(`${nf(cl(A - b - c))} + ${nf(d)} = ${nf(ans)}`)} ליטר.`,
      });
    }
    const set = new Set(), base = rnd(1, 6) * 1000 + rnd(1, 8) * 100;
    while (set.size < 4) {
      const v = base + pick([rnd(-9, 9) * 10, rnd(-99, 99), rnd(-5, 5) * 100]);
      if (v > 0) set.add(v);
    }
    const values = [...set].map(v => dec(v, 3)), mx = Math.max(...values), mn = Math.min(...values), ans = cl(mx - mn);
    return dAns({
      prompt: 'ארבעה ניסויים מדדו את המסה של אותו גביש, בגרם. מה ההפרש בין המדידה הגדולה ביותר למדידה הקטנה ביותר?',
      visual: `<div class="ldec-chips" dir="ltr">${shuffle(values).map(v => `<span>${nf(v)}</span>`).join('')}</div>`,
      ans, line: B => `${B} גרם`,
      hints: ['מצאו קודם את המדידה הגדולה ביותר ואת הקטנה ביותר. השלימו אפסים כדי להשוות.', `הגדולה: ${N(mx)}, הקטנה: ${N(mn)}. עכשיו חסרו.`],
      explain: `הגדולה ${N(mx)} והקטנה ${N(mn)}:${columns([nf(mx), nf(mn)], '−', nf(ans))}`,
    });
  },
};

// ---------- 4. × and ÷ by 10, 100, 1000 ----------
// digits stay in their cells; the player moves the decimal point with arrows or by tapping a gap
function pointMover(x, shift) {
  let s = nf(x), K, p;
  if (s.includes('.')) {
    p = s.split('.')[1].length;
    K = Number(s.replace('.', ''));
  } else [K, p] = [x, 0];
  while (K > 0 && K % 10 === 0) [K, p] = [K / 10, p - 1];
  const dg = String(K), L = dg.length, pt0 = L - p, lo = Math.min(-1, pt0 - 5), hi = Math.max(L - 1, pt0 + 3);
  let pt = pt0, moved = false, locked = false;
  const strip = h('div', { class: 'ldec-strip', dir: 'ltr' });
  const cell = i => {
    if (i >= 0 && i < L) return [dg[i], ''];
    if (pt <= 0 && (i === pt - 1 || (i >= pt && i < 0))) return ['0', ' z'];
    if (pt > L && i >= L && i < pt) return ['0', ' z'];
    return ['', ' e'];
  };
  const written = () => {
    const ip = pt <= 0 ? '0' : pt >= L ? dg + '0'.repeat(pt - L) : dg.slice(0, pt), fp = pt <= 0 ? '0'.repeat(-pt) + dg : pt >= L ? '' : dg.slice(pt);
    return fp ? `${ip}.${fp}` : ip;
  };
  const go = k => {
    if (locked || k < pt0 - 4 || k > pt0 + 4) return;
    pt = k;
    moved = true;
    draw();
  };
  const draw = () => {
    strip.innerHTML = '';
    for (let i = lo; i <= hi + 1; i++) {
      if (i > lo) strip.append(h('button', { type: 'button', class: 'ldec-gap' + (i === pt ? ' on' : ''), 'aria-label': 'נקודה כאן', onclick: () => go(i) }));
      if (i <= hi) {
        const [c, cls] = cell(i);
        strip.append(h('span', { class: 'ldec-cell' + cls }, c));
      }
    }
  };
  draw();
  const arrow = (by, label, aria) => h('button', { type: 'button', class: 'round', 'aria-label': aria, onclick: () => go(pt + by) }, label);
  return {
    el: h('div', { class: 'ldec-mover' }, strip,
      h('div', { class: 'fb-ctl', dir: 'ltr' }, arrow(-1, '◀', 'הנקודה שמאלה'), h('span', {}, 'הזיזו את הנקודה'), arrow(1, '▶', 'הנקודה ימינה')),
      h('p', { class: 'tip' }, 'אפשר גם ללחוץ ישר על הרווח שבין שתי משבצות.')),
    value: () => (moved ? Number(written()) : null),
    set(a) {
      pt = a;
      moved = true;
      draw();
    },
    lock() {
      locked = true;
    },
    target: pt0 + shift,
  };
}
const moverRound = ({ x, shift, prompt, hints, explain }) => {
  const w = pointMover(x, shift), y = cl(x * 10 ** shift);
  return { prompt, widget: w, answer: w.target, check: v => near(v, y), hints, explain };
};
const opOf = s => (s > 0 ? `× ${10 ** s}` : `÷ ${10 ** -s}`);
const dirOf = s => `${places(Math.abs(s))} ${s > 0 ? 'ימינה' : 'שמאלה'}`;
const UNITS = [['מ״ל', 'ליטר', -3], ['ליטר', 'מ״ל', 3], ['גרם', 'ק״ג', -3], ['ק״ג', 'גרם', 3], ['ס״מ', 'מטר', -2], ['מטר', 'ס״מ', 2], ['מ״מ', 'ס״מ', -1], ['ס״מ', 'מ״מ', 1], ['מ״ג', 'גרם', -3]];
const someDec = (pMin, pMax, max) => {
  const p = rnd(pMin, pMax);
  let K;
  do K = rnd(p ? 10 ** (p - 1) + 1 : 2, max * 10 ** p); while (p ? K % 10 === 0 : false);
  return dec(K, p);
};

const shift = {
  id: 'ldec-shift', title: 'הנקודה זזה',
  intro: `<p>בכפל ב־10, ב־100 או ב־1000 הנקודה העשרונית זזה <b>ימינה</b> מקום אחד, שניים או שלושה (כמספר האפסים). בחילוק היא זזה <b>שמאלה</b>. אם חסרות ספרות, משלימים אפסים.</p>
    <div class="ex">${M('3.47 × 100 = 347')}<br>${M('5.2 ÷ 1000 = 0.0052')}</div>
    <p>במכשיר הנקודה לוחצים על החצים כדי להזיז את הנקודה. האפסים שצריך להשלים מופיעים לבד.</p>`,
  gen(L) {
    const t = rnd(0, 2);
    if (L === 1) {
      const x = someDec(0, 2, 60), s = pick([1, 1, 2, 2, 3, -1, -1, -2, -2, -3].filter(s => s > 0 || x >= 1)), y = cl(x * 10 ** s);
      if (t === 2) {
        return dAns({
          prompt: 'פתרו.', ans: y, pre: `${nf(x)} ${opOf(s)}${EQ}`,
          hints: [`ב${s > 0 ? 'כפל' : 'חילוק'} הנקודה זזה ${s > 0 ? 'ימינה' : 'שמאלה'}.`, `ב־⁠${M(10 ** Math.abs(s))} יש ${M(Math.abs(s))} אפסים, לכן הנקודה זזה ${dirOf(s)}.`],
          explain: `${M(`${nf(x)} ${opOf(s)} = ${nf(y)}`)}: הנקודה זזה ${dirOf(s)}.`,
        });
      }
      return moverRound({
        x, shift: s, prompt: `הזיזו את הנקודה כדי לקבל את התוצאה של ${M(`${nf(x)} ${opOf(s)}`)}.`,
        hints: [`ב${s > 0 ? 'כפל' : 'חילוק'} הנקודה זזה ${s > 0 ? 'ימינה' : 'שמאלה'}.`, `ב־⁠${M(10 ** Math.abs(s))} יש ${M(Math.abs(s))} אפסים, לכן הנקודה זזה ${dirOf(s)}.`],
        explain: `${M(`${nf(x)} ${opOf(s)} = ${nf(y)}`)}: הנקודה זזה ${dirOf(s)}.`,
      });
    }
    if (L === 2) {
      if (t === 0) {
        const x = someDec(0, 3, 90), s = pick([1, 2, 3, -1, -2, -3]), y = cl(x * 10 ** s), opts = [1, 2, 3, -1, -2, -3], i = opts.indexOf(s);
        return {
          prompt: `באיזו פעולה הפכו את ${N(x)} ל־⁠${N(y)}?`,
          widget: choice(opts.map(o => M(opOf(o))), { cols: 3, cls: 'nums' }), answer: i, check: v => v === i,
          hints: ['המספר גדל או קטן? אם הוא גדל, זה כפל. אם הוא קטן, זה חילוק.', `הנקודה זזה ${dirOf(s)}.`],
          explain: `${M(`${nf(x)} ${opOf(s)} = ${nf(y)}`)}: הנקודה זזה ${dirOf(s)}.`,
        };
      }
      if (t === 1) {
        const s = pick([3, 3, 2, -3, -3, -2]), x = s > 0 ? dec(pick([rnd(1, 9), rnd(11, 99)]), pick([2, 3])) : someDec(0, 1, 9), y = cl(x * 10 ** s);
        return moverRound({
          x, shift: s, prompt: `הזיזו את הנקודה כדי לקבל את התוצאה של ${M(`${nf(x)} ${opOf(s)}`)}.`,
          hints: ['זהירות: כאן צריך להשלים אפסים. בדקו בכל צעד שהנקודה זזה מקום אחד.', `הנקודה זזה ${dirOf(s)}.`],
          explain: `${M(`${nf(x)} ${opOf(s)} = ${nf(y)}`)}: הנקודה זזה ${dirOf(s)}${placesOf(y) > placesOf(x) || y >= 10 * Math.max(1, x) ? ', ומשלימים אפסים' : ''}.`,
        });
      }
      const [u1, u2, s] = pick(UNITS), x = s > 0 ? someDec(1, 2, 9) : someDec(0, 1, s === -1 ? 90 : 2500), y = cl(x * 10 ** s);
      const [big, small] = s > 0 ? [u1, u2] : [u2, u1];
      return dAns({
        prompt: `המירו את המדידה במעבדה: כמה ${u2} הם ${N(x)} ${u1}?`, ans: y, line: B => `${N(x)} ${u1} = ${B} ${u2}`,
        hints: [`ב־⁠${M(1)} ${big} יש ${M(10 ** Math.abs(s))} ${small}.`, `לכן ${s > 0 ? 'כופלים' : 'מחלקים'} ב־⁠${M(10 ** Math.abs(s))}: הנקודה זזה ${dirOf(s)}.`],
        explain: `${M(`${nf(x)} ${opOf(s)} = ${nf(y)}`)}, לכן ${N(x)} ${u1} = ${N(y)} ${u2}.`,
      });
    }
    if (t === 0) {
      let x, s1, s2;
      do [x, s1, s2] = [someDec(0, 2, 90), pick([1, 2, 3]), -pick([1, 2, 3])]; while (s1 + s2 === 0 || placesOf(x) - s1 - s2 > 4);
      if (Math.random() < 0.5) [s1, s2] = [s2, s1];
      const m = cl(x * 10 ** s1), y = cl(m * 10 ** s2);
      return dAns({
        prompt: 'פתרו משמאל לימין.', ans: y, pre: `${nf(x)} ${opOf(s1)} ${opOf(s2)}${EQ}`,
        hints: ['בצעו את הפעולות לפי הסדר, ובכל פעם הזיזו את הנקודה.', `אחרי הפעולה הראשונה: ${M(`${nf(x)} ${opOf(s1)} = ${nf(m)}`)}.`],
        explain: `${M(`${nf(x)} ${opOf(s1)} = ${nf(m)}`)}, ואז ${M(`${nf(m)} ${opOf(s2)} = ${nf(y)}`)}. בסך הכול הנקודה זזה ${dirOf(s1 + s2)}.`,
      });
    }
    if (t === 1) {
      const s = pick([1, 2, 3, -1, -2, -3]), x = someDec(0, 2, 90), y = cl(x * 10 ** s), op = s > 0 ? `÷ ${nf(10 ** -s)}` : `× ${nf(10 ** s)}`;
      return moverRound({
        x, shift: s, prompt: `הזיזו את הנקודה כדי לקבל את התוצאה של ${M(`${nf(x)} ${op}`)}.`,
        hints: [`כפל ב־⁠${N(0.1)} הוא לקחת עשירית מהמספר, כלומר חילוק ב־10. וחילוק ב־⁠${N(0.1)} שואל כמה עשיריות יש במספר, כלומר כפל ב־10.`, `${M(op)} זה כמו ${M(opOf(s))}, לכן הנקודה זזה ${dirOf(s)}.`],
        explain: `${M(`${nf(x)} ${op} = ${nf(x)} ${opOf(s)} = ${nf(y)}`)}`,
      });
    }
    let x, s1, s2;
    do [x, s1, s2] = [someDec(0, 2, 90), pick([1, 2, 3]), -pick([1, 2, 3])]; while (s1 + s2 === 0 || placesOf(x) - s1 - s2 > 4);
    if (Math.random() < 0.5) [s1, s2] = [s2, s1];
    const m = cl(x * 10 ** s1), y = cl(m * 10 ** s2), opName = s => (s > 0 ? `כפל אותו ב־⁠${M(10 ** s)}` : `חילק אותו ב־⁠${M(10 ** -s)}`);
    return dAns({
      prompt: `החשבונאי נקודה לקח מספר, ${opName(s1)}, ואחר כך ${opName(s2).replace('אותו ', 'את התוצאה ')}. יצא ${N(y)}. מאיזה מספר הוא התחיל?`, ans: x, line: B => B,
      hints: ['עבדו מהסוף להתחלה, עם הפעולות ההפוכות: במקום כפל חילוק, ובמקום חילוק כפל.', `לפני הפעולה השנייה היה ${M(`${nf(y)} ${opOf(-s2)} = ${nf(m)}`)}.`],
      explain: `${M(`${nf(y)} ${opOf(-s2)} = ${nf(m)}`)}, ${M(`${nf(m)} ${opOf(-s1)} = ${nf(x)}`)}. בדיקה: ${M(`${nf(x)} ${opOf(s1)} ${opOf(s2)} = ${nf(y)}`)}.`,
    });
  },
};

// ---------- 5. multiplying decimals ----------
const decK = (p, lo, hi) => { // integer K with K % 10 ≠ 0, so K·10^−p has exactly p decimals
  let K;
  do K = rnd(lo, hi); while (K % 10 === 0);
  return K;
};
const mulExplain = (Kx, px, Ky, py) => {
  const P = Kx * Ky, s = fx(P, px + py), v = dec(P, px + py);
  return `בלי הנקודות: ${M(`${Kx} × ${Ky} = ${P}`)}. יחד יש ${afterPt(px + py)} אחרי הנקודה: ${M(s)}${s !== nf(v) ? ` = ${N(v)}` : ''}.`;
};
const mulDec = {
  id: 'ldec-mul', title: 'כפל עשרוניים',
  intro: `<p>כופלים עשרוניים כאילו אין נקודות. אחר כך סופרים כמה ספרות יש אחרי הנקודה <b>בשני המספרים יחד</b>, ושמים את הנקודה בתוצאה כך שיהיו אחריה אותו מספר ספרות.</p>
    <div class="ex">${M('2.4 × 1.5')}: ${M('24 × 15 = 360')}. יחד יש 2 ספרות אחרי הנקודה, לכן ${M('2.4 × 1.5 = 3.60 = 3.6')}.</div>
    <p>בדיקה מהירה באומדן: ${M('2.4 × 1.5')} הוא בערך ${M('2 × 1.5 = 3')}, אז ${N(3.6)} הגיוני.</p>`,
  gen(L) {
    const t = rnd(0, 2);
    if (L === 1) {
      if (t === 0) {
        const a = rnd(1, 9), c = rnd(1, 9), ans = dec(a * c, 2);
        return dAns({
          prompt: `המלבן הגדול הוא 1 שלם. הכחול הוא ${N(a / 10)} ממנו, והצהוב הוא ${N(c / 10)} ממנו. כמה זה ${M(`0.${a} × 0.${c}`)}? הירוק הוא התשובה.`,
          visual: `<div class="ldec-area">${areaModel(a, 10, c, 10)}</div>`, ans, pre: `0.${a} × 0.${c}${EQ}`,
          hints: [`השלם מחולק ל־100 משבצות. כל משבצת היא מאית (${N(0.01)}).`, `הירוק הוא מלבן של ${M(`${a} × ${c} = ${a * c}`)} משבצות.`],
          explain: `${M(`${a} × ${c} = ${a * c}`)} משבצות ירוקות, כלומר ${M(a * c)} מאיות: ${M(`0.${a} × 0.${c} = ${nf(ans)}`)}.`,
        });
      }
      if (t === 1) {
        const p = rnd(1, 2), K = decK(p, p === 1 ? 2 : 101, p === 1 ? 99 : 999), x = dec(K, p), k = rnd(2, 9), ans = dec(K * k, p), story = Math.random() < 0.5;
        return dAns({
          prompt: story ? `בכל מבחנה יש ${N(x)} גרם מלח. כמה גרם מלח יש ב־⁠${M(k)} מבחנות?` : 'פתרו.', ans,
          ...(story ? { line: B => `${B} גרם` } : { pre: `${nf(x)} × ${k}${EQ}` }),
          hints: [`חשבו בלי הנקודה: ${M(`${K} × ${k}`)}.`, `${M(`${K} × ${k} = ${K * k}`)}. ב־⁠${N(x)} יש ${afterPt(p)} אחרי הנקודה, וגם בתוצאה.`],
          explain: `${story ? `התרגיל הוא ${M(`${nf(x)} × ${k}`)}. ` : ''}${mulExplain(K, p, k, 0)}`,
        });
      }
      const A = decK(0, 11, 99), B = rnd(2, 19), i = rnd(1, 2), x = dec(A, i), ans = dec(A * B, i), swap = Math.random() < 0.5;
      const ex = swap ? `${B} × ${nf(x)}` : `${nf(x)} × ${B}`;
      return dAns({
        prompt: `ידוע ש־⁠${M(`${A} × ${B} = ${A * B}`)}. היעזרו בזה ופתרו:`, ans, pre: `${ex}${EQ}`,
        hints: [`${N(x)} קטן פי ${M(10 ** i)} מ־⁠${M(A)}. מה זה אומר על התוצאה?`, `גם התוצאה קטנה פי ${M(10 ** i)} מ־⁠${M(A * B)}.`],
        explain: `${M(`${ex} = ${A * B} ÷ ${10 ** i} = ${nf(ans)}`)}`,
      });
    }
    if (L === 2) {
      let px, py;
      do [px, py] = [rnd(1, 2), rnd(1, 2)]; while (px + py > 3);
      const Kx = decK(px, 11, px === 1 ? 99 : 400), Ky = decK(py, 2, py === 1 ? 49 : 99), x = dec(Kx, px), y = dec(Ky, py), ans = dec(Kx * Ky, px + py);
      if (t === 0)
        return dAns({
          prompt: 'פתרו.', ans, pre: `${nf(x)} × ${nf(y)}${EQ}`,
          hints: ['כופלים כאילו אין נקודות, ואז סופרים כמה ספרות יש אחרי הנקודה בשני המספרים יחד.', `${M(`${Kx} × ${Ky} = ${Kx * Ky}`)}, ובתוצאה צריכות להיות ${afterPt(px + py)} אחרי הנקודה.`],
          explain: mulExplain(Kx, px, Ky, py),
        });
      if (t === 1) {
        const sorted = [...shuffle([cl(ans * 100), cl(ans * 10), cl(ans / 10), cl(ans / 100)]).slice(0, 3), ans].sort((a, b) => a - b), i = sorted.indexOf(ans), ex = Number(x.toPrecision(1)), ey = Number(y.toPrecision(1));
        return {
          prompt: `מה התוצאה של ${M(`${nf(x)} × ${nf(y)}`)}? נסו להעריך לפני שמחשבים.`,
          widget: choice(sorted.map(v => N(v)), { cols: 2, cls: 'nums' }), answer: i, check: v => v === i,
          hints: [`אומדן: ${N(x)} הוא בערך ${N(ex)}, ו־⁠${N(y)} הוא בערך ${N(ey)}. כמה זה ${M(`${nf(ex)} × ${nf(ey)}`)}?`, `${M(`${Kx} × ${Ky} = ${Kx * Ky}`)}, ויש ${afterPt(px + py)} אחרי הנקודה.`],
          explain: `${mulExplain(Kx, px, Ky, py)} האומדן ${M(`${nf(ex)} × ${nf(ey)} = ${nf(cl(ex * ey))}`)} מראה שזה הגיוני.`,
        };
      }
      const Kp = decK(1, 2, 49), Kq = decK(1, 11, 99), a = dec(Kp, 1), b = dec(Kq, 1), r = dec(Kp * Kq, 2), oil = Math.random() < 0.5;
      return dAns({
        prompt: oil ? `סמ״ק אחד של נוזל כחול שוקל ${N(a)} גרם. כמה גרם שוקלים ${N(b)} סמ״ק מהנוזל?` : `מטר אחד של צינורית זכוכית עולה ${N(a)} ש״ח. כמה עולים ${N(b)} מטר צינורית?`,
        ans: r, line: B => `${B} ${oil ? 'גרם' : 'ש״ח'}`,
        hints: [`זה תרגיל כפל: ${M(`${nf(a)} × ${nf(b)}`)}.`, `${M(`${Kp} × ${Kq} = ${Kp * Kq}`)}, ויש ${afterPt(2)} אחרי הנקודה.`],
        explain: `התרגיל הוא ${M(`${nf(a)} × ${nf(b)}`)}. ${mulExplain(Kp, 1, Kq, 1)}`,
      });
    }
    if (t === 0) {
      const A = decK(0, 11, 99), B = decK(0, 11, 99), P = A * B;
      let i, j;
      do [i, j] = [rnd(0, 2), rnd(0, 3)]; while (i + j < 2);
      const x = dec(A, i), y = dec(B, j), r = dec(P, i + j);
      if (Math.random() < 0.5)
        return dAns({
          prompt: `ידוע ש־⁠${M(`${A} × ${B} = ${P}`)}. היעזרו בזה ופתרו:`, ans: r, pre: `${nf(x)} × ${nf(y)}${EQ}`,
          hints: ['כמה ספרות יש אחרי הנקודה בשני הגורמים יחד?', `יחד יש ${afterPt(i + j)} אחרי הנקודה.`],
          explain: `${M(`${P} ÷ ${10 ** (i + j)} = ${nf(r)}`)}, כי יש ${afterPt(i + j)} אחרי הנקודה בשני הגורמים יחד.`,
        });
      return dAns({
        prompt: `ידוע ש־⁠${M(`${A} × ${B} = ${P}`)}. איזה מספר חסר?`, ans: y, line: X => M(`${nf(x)} × ${X} = ${nf(r)}`),
        hints: [`הספרות של הגורם החסר הן הספרות של ${M(B)}. נשאר לקבוע איפה הנקודה.`, `בגורם הראשון ${afterPt(i)} אחרי הנקודה, ובתוצאה ${M(fx(P, i + j))} יש ${afterPt(i + j)}. לגורם החסר יש ${afterPt(j)} אחרי הנקודה.`],
        explain: `${M(`${nf(x)} × ${nf(y)} = ${nf(r)}`)}: ב־⁠${M(fx(P, i + j))} יש ${afterPt(i + j)} אחרי הנקודה, ${i ? `${M(i)} מהן מהגורם הראשון` : 'ובגורם הראשון אין בכלל'}, אז לחסר יש ${afterPt(j)} אחרי הנקודה.`,
      });
    }
    if (t === 1) {
      const [K, p, e] = pick([[3, 1, 2], [2, 1, 2], [4, 1, 2], [5, 1, 2], [6, 1, 2], [7, 1, 2], [8, 1, 2], [9, 1, 2], [11, 1, 2], [12, 1, 2], [15, 1, 2], [25, 1, 2], [5, 2, 2], [3, 2, 2], [12, 2, 2], [2, 1, 3], [3, 1, 3], [1, 1, 3], [11, 1, 3], [5, 1, 3], [12, 1, 3], [4, 1, 3]]);
      const x = dec(K, p), ans = dec(K ** e, p * e), sup = `${nf(x)}<sup>${e}</sup>`;
      return dAns({
        prompt: 'חשבו את החזקה.', ans, pre: `${sup}${EQ}`,
        hints: [`${M(`${sup} = ${range(e, () => nf(x)).join(' × ')}`)}`, `${M(`${range(e, () => K).join(' × ')} = ${K ** e}`)}, ויש ${afterPt(p * e)} אחרי הנקודה.`],
        explain: `${M(`${sup} = ${range(e, () => nf(x)).join(' × ')} = ${nf(ans)}`)}: ${M(`${K ** e}`)} עם ${afterPt(p * e)} אחרי הנקודה.`,
      });
    }
    const x = dec(decK(1, 21, 99), 1), lo = dec(rnd(91, 99), 2), hi = dec(rnd(101, 109), 2), half = pick([0.5, 0.25, 0.8, 0.75]);
    const opts = shuffle([['lo', `${nf(x)} × ${nf(lo)}`], ['hi', `${nf(x)} × ${nf(hi)}`], ['eq', `${nf(cl(x / 10))} × 10`], ['half', `${nf(x)} × ${nf(half)}`]]), i = opts.findIndex(o => o[0] === 'hi');
    return {
      prompt: `בלי לחשב: איזה תרגיל תוצאתו <b>גדולה</b> מ־⁠${N(x)}?`,
      widget: choice(opts.map(o => M(o[1])), { cols: 1, cls: 'nums' }), answer: i, check: v => v === i,
      hints: ['כפל במספר קטן מ־1 מקטין את המספר. כפל במספר גדול מ־1 מגדיל אותו.', `רק ${N(hi)} גדול מ־1. ומה עם ${M(`${nf(cl(x / 10))} × 10`)}? זה בדיוק ${N(x)}.`],
      explain: `${M(`${nf(x)} × ${nf(hi)}`)} גדול מ־⁠${N(x)}, כי ${N(hi)} גדול מ־1. ${M(`${nf(cl(x / 10))} × 10 = ${nf(x)}`)} שווה לו, והשאר קטנים ממנו.`,
    };
  },
};

// ---------- 6. fraction, decimal, percent ----------
const NICE = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10], [1, 20], [3, 20], [7, 20], [9, 20], [11, 20], [13, 20], [17, 20], [1, 25], [4, 25], [6, 25], [12, 25], [1, 50], [3, 50], [7, 50], [21, 50]];
const HARD = [[1, 8], [3, 8], [5, 8], [7, 8], [3, 40], [7, 40], [9, 40], [11, 40], [1, 16], [3, 16], [5, 16], [3, 80], [7, 125], [12, 125], [3, 200], [7, 200], [1, 200], [9, 80]];
const pow10For = d => { // smallest power of 10 that d divides
  let m = 1;
  while (m % d) m *= 10;
  return m;
};
// mixed forms of values given in thousandths
const formOf = (v, kind) => {
  if (kind === 'p') return `${nf(v / 10)}%`;
  if (kind === 'd') return nf(dec(v, 3));
  const g = gcd(v, 1000);
  return fr(v / g, 1000 / g);
};
const fracNear = () => { // a value with a short fraction, and 3 other values close to it
  const [n, d] = pick([[1, 4], [3, 4], [1, 8], [3, 8], [5, 8], [7, 8], [2, 5], [3, 5], [1, 5], [4, 5], [7, 20], [9, 20], [13, 20], [3, 25]]);
  const v0 = (1000 * n) / d, set = new Set([v0]);
  while (set.size < 4) {
    const v = v0 + pick([-1, 1]) * pick([5, 10, 20, 25, 30, 50, 15, 2]);
    if (v > 0 && v < 1000) set.add(v);
  }
  const vals = shuffle([...set]), kinds = vals.map(v => (v === v0 ? 'f' : null));
  const rest = shuffle(['d', 'p', pick(['d', 'p'])]);
  return { vals, kinds: kinds.map(k => k || rest.pop()) };
};

const convert = {
  id: 'ldec-conv', title: 'שבר, עשרוני, אחוז',
  intro: `<p>אותו מספר אפשר לכתוב בשלוש דרכים. <b>אחוז</b> פירושו "מתוך 100".</p>
    <div class="ex">${M(`${fr(3, 4)} = ${fr(75, 100)} = 0.75 = 75%`)}</div>
    <p>מעשרוני לאחוז: כופלים ב־100 (${M('0.4 = 40%')}). משבר לעשרוני: מרחיבים למכנה 10, 100 או 1000, או מחלקים את המונה במכנה (${M(`${fr(3, 8)} = 0.375`)}).</p>
    <p>בלוח המשבצות לוחצים או גוררים כדי לצבוע.</p>`,
  gen(L) {
    const t = rnd(0, 2);
    if (L === 1) {
      if (t === 0) {
        const kind = rnd(0, 2);
        let k, form, why;
        if (kind === 0) {
          const [n, d] = pick(NICE);
          k = (100 * n) / d;
          form = F(n, d);
          why = `${M(`${fr(n, d)} = ${fr(k, 100)}`)}`;
        } else {
          k = rnd(3, 97);
          form = kind === 1 ? pctS(k) : N(k / 100);
          why = kind === 1 ? `${pctS(k)} הם ${M(k)} מתוך 100` : `${N(k / 100)} הם ${M(k)} מאיות`;
        }
        const g = gridPaint({ rows: 10, cols: 10 }), count = h('div', { class: 'ldec-count' });
        const upd = () => (count.textContent = `צבועות: ${g.value().length} משבצות`);
        const el = h('div', { class: 'ldec-paint', onpointerup: upd, onclick: upd }, g.el, count);
        upd();
        return {
          prompt: `צבעו ${form} מהלוח.`,
          widget: { el, value: () => (g.value().length ? g.value() : null), set: a => (g.set(a), upd()), lock: g.lock }, answer: range(k, i => `${Math.floor(i / 10)},${i % 10}`),
          check: v => v.length === k,
          wrongMsg: v => `צבעתם ${M(v.length)} משבצות.`,
          hints: [`בלוח 100 משבצות. כל משבצת היא ${M('1%')}, כלומר ${N(0.01)}.`, `${why}. צריך לצבוע ${M(k)} משבצות.`],
          explain: `${why}, לכן צובעים ${M(k)} משבצות מתוך 100.`,
        };
      }
      if (t === 1) {
        const [n, d] = pick(NICE), k = (100 * n) / d, x = k / 100;
        return {
          prompt: 'כתבו את השבר כמספר עשרוני וכאחוז.',
          widget: inputs(`<div class="ans-line">${M(`${fr(n, d)}${EQ}${box('x', 5, false, 'd')}${EQ}${box('p', 4, false, 'd')}%`)}</div>`),
          answer: { x, p: k }, check: v => near(v.x, x) && near(v.p, k),
          wrongMsg: v => (near(v.x, x) ? 'השבר העשרוני נכון. בדקו את האחוז.' : near(v.p, k) ? 'האחוז נכון. בדקו את השבר העשרוני.' : ''),
          hints: ['הרחיבו את השבר למכנה 100.', `${M(`${fr(n, d)} = ${fr(k, 100)}`)}.`],
          explain: `${M(`${fr(n, d)} = ${fr(k, 100)} = ${nf(x)} = ${k}%`)}`,
        };
      }
      const k = pick([rnd(1, 9), rnd(11, 99), rnd(1, 9) * 10]), x = k / 100;
      if (Math.random() < 0.5)
        return dAns({
          prompt: 'כתבו את האחוז כמספר עשרוני.', ans: x, line: B => M(`${k}%${EQ}${B}`),
          hints: [`${pctS(k)} הם ${M(k)} מתוך 100, כלומר ${F(k, 100)}.`, `${M(`${k} ÷ 100`)}: הנקודה זזה 2 מקומות שמאלה.`],
          explain: `${M(`${k}% = ${fr(k, 100)} = ${nf(x)}`)}`,
        });
      return dAns({
        prompt: 'כתבו את המספר העשרוני כאחוז.', ans: k, line: B => M(`${nf(x)}${EQ}${B}%`),
        hints: ['כדי לעבור מעשרוני לאחוז כופלים ב־100.', `${M(`${nf(x)} × 100`)}: הנקודה זזה 2 מקומות ימינה.`],
        explain: `${M(`${nf(x)} = ${fr(k, 100)} = ${k}%`)}`,
      });
    }
    if (L === 2) {
      if (t === 0) {
        const [n, d] = pick(HARD), m = pow10For(d), top = (n * m) / d, x = cl(n / d), p = cl((100 * n) / d);
        return {
          prompt: 'כתבו את השבר כמספר עשרוני וכאחוז.',
          widget: inputs(`<div class="ans-line">${M(`${fr(n, d)}${EQ}${box('x', 6, false, 'd')}${EQ}${box('p', 5, false, 'd')}%`)}</div>`),
          answer: { x, p }, check: v => near(v.x, x) && near(v.p, p),
          wrongMsg: v => (near(v.x, x) ? 'השבר העשרוני נכון. בדקו את האחוז.' : near(v.p, p) ? 'האחוז נכון. בדקו את השבר העשרוני.' : ''),
          hints: [`אי אפשר להרחיב ל־100, אבל אפשר להרחיב ל־⁠${M(m)}. (או לחלק ${M(`${n} ÷ ${d}`)}.)`, `${M(`${fr(n, d)} = ${fr(top, m)} = ${nf(x)}`)}. עכשיו כפלו ב־100 כדי לקבל אחוזים.`],
          explain: `${M(`${fr(n, d)} = ${fr(top, m)} = ${nf(x)} = ${nf(p)}%`)}`,
        };
      }
      if (t === 1) {
        const k = pick([rnd(2, 98), rnd(2, 98), pick([12.5, 37.5, 62.5, 87.5, 2.5, 7.5, 0.5, 22.5])]), n = Math.round(k * 10);
        const g = gcd(n, 1000);
        return fracAns({
          prompt: `כתבו את ${pctS(k)} כשבר. (כדאי לצמצם.)`, pre: `${nf(k)}%${EQ}`, n, d: 1000,
          hints: [`${pctS(k)} הם ${M(nf(k))} מתוך 100: ${M(fr(nf(k), 100))}.${Number.isInteger(k) ? '' : ` כדי להיפטר מהנקודה, הרחיבו ל־⁠${M(fr(n, 1000))}.`}`, (Number.isInteger(k) ? gcd(k, 100) : g) > 1 ? `צמצמו: חלקו את המונה והמכנה ב־⁠${M(Number.isInteger(k) ? gcd(k, 100) : g)}.` : 'השבר הזה כבר מצומצם.'],
          explain: `${M(`${nf(k)}% = ${Number.isInteger(k) ? fr(k, 100) : fr(n, 1000)}${(Number.isInteger(k) ? 100 : 1000) !== 1000 / g ? ` = ${fr(n / g, 1000 / g)}` : ''}`)}`,
        });
      }
      const p = rnd(2, 3), K = decK(p, 2, 10 ** p - 1), g = gcd(K, 10 ** p), x = dec(K, p);
      return fracAns({
        prompt: `כתבו את ${N(x)} כשבר. (כדאי לצמצם.)`, pre: `${nf(x)}${EQ}`, n: K, d: 10 ** p,
        hints: [`${N(x)} הם ${M(K)} ${p === 2 ? 'מאיות' : 'אלפיות'}: ${F(K, 10 ** p)}.`, g > 1 ? `צמצמו: חלקו את המונה והמכנה ב־⁠${M(g)}.` : 'השבר הזה כבר מצומצם.'],
        explain: `${M(`${nf(x)} = ${fr(K, 10 ** p)}${g > 1 ? ` = ${fr(K / g, 10 ** p / g)}` : ''}`)}`,
      });
    }
    if (t === 0) {
      const { vals, kinds } = fracNear(), big = Math.random() < 0.5, target = big ? Math.max(...vals) : Math.min(...vals), i = vals.indexOf(target);
      return {
        prompt: `איזה מספר הוא ה<b>${big ? 'גדול' : 'קטן'}</b> ביותר?`,
        widget: choice(vals.map((v, k) => M(formOf(v, kinds[k]))), { cols: 2, cls: 'nums' }), answer: i, check: v => v === i,
        hints: ['כתבו את כולם באותה צורה, למשל כמספרים עשרוניים עם 3 ספרות אחרי הנקודה.', `בעשרוניים: ${M(vals.map(v => pad(nf(dec(v, 3)), 3)).join(', '))}.`],
        explain: `מהקטן לגדול:<br>${range(4).sort((a, b) => vals[a] - vals[b]).map(k => M(kinds[k] === 'd' ? nf(dec(vals[k], 3)) : `${formOf(vals[k], kinds[k])} = ${nf(dec(vals[k], 3))}`)).join('<br>')}<br>${big ? 'הגדול' : 'הקטן'} ביותר: ${M(formOf(target, kinds[i]))}.`,
      };
    }
    if (t === 1) {
      const { vals, kinds } = fracNear(), labels = vals.map((v, k) => formOf(v, kinds[k]));
      return sortRound({
        prompt: 'סדרו את המבחנות מהמספר הקטן ביותר לגדול ביותר.', labels, values: vals,
        hints: ['כתבו את כולם כמספרים עשרוניים, ואז השוו.', `בעשרוניים: ${M(vals.map(v => pad(nf(dec(v, 3)), 3)).join(', '))}.`],
        explain: `${M(range(4).sort((a, b) => vals[a] - vals[b]).map(k => labels[k]).join(' &lt; '))}<br>${M(vals.map(v => dec(v, 3)).sort((a, b) => a - b).map(nf).join(' &lt; '))}`,
      });
    }
    const u = rnd(0, 2);
    if (u === 0) {
      const [n, d] = pick([[3, 2], [5, 4], [7, 4], [9, 8], [11, 8], [6, 5], [9, 5], [11, 10], [21, 20], [27, 20], [1, 200], [3, 400], [1, 500], [1, 1000], [9, 4], [5, 2]]), p = cl((100 * n) / d);
      return dAns({
        prompt: `כתבו את השבר ${F(n, d)} באחוזים.`, ans: p, line: B => M(`${fr(n, d)}${EQ}${B}%`),
        hints: [n > d ? 'השבר גדול מ־1, לכן התשובה יותר מ־100%.' : 'השבר קטן מאוד, לכן התשובה פחות מ־1%.', `${M(`${fr(n, d)} = ${nf(cl(n / d))}`)}. כפלו ב־100.`],
        explain: `${M(`${fr(n, d)} = ${nf(cl(n / d))} = ${nf(p)}%`)}`,
      });
    }
    if (u === 1) {
      const p = pick([rnd(101, 350), rnd(11, 35) * 10, pick([0.1, 0.2, 0.4, 0.5, 0.8, 0.25, 0.75, 1.5, 2.5])]), x = cl(p / 100);
      return dAns({
        prompt: 'כתבו את האחוז כמספר עשרוני.', ans: x, line: B => M(`${nf(p)}%${EQ}${B}`),
        hints: [p > 100 ? `${pctS(100)} הם שלם אחד, לכן ${pctS(p)} זה יותר מ־1.` : `${pctS(p)} זה פחות מ־⁠${pctS(1)}, ו־⁠${pctS(1)} הוא ${N(0.01)}.`, `מחלקים ב־100: הנקודה זזה 2 מקומות שמאלה.`],
        explain: `${M(`${nf(p)}% = ${nf(p)} ÷ 100 = ${nf(x)}`)}`,
      });
    }
    const x = pick([dec(decK(2, 101, 399), 2), dec(rnd(1, 9), 3), dec(decK(3, 1, 99), 3), dec(rnd(11, 40), 1)]), p = cl(x * 100);
    return dAns({
      prompt: 'כתבו את המספר העשרוני כאחוז.', ans: p, line: B => M(`${nf(x)}${EQ}${B}%`),
      hints: ['כופלים ב־100: הנקודה זזה 2 מקומות ימינה.', x > 1 ? `${N(1)} הוא ${pctS(100)}, לכן התשובה יותר מ־100.` : `${N(0.01)} הוא ${pctS(1)}, לכן התשובה קטנה מ־1.`],
      explain: `${M(`${nf(x)} × 100 = ${nf(p)}`)}, לכן ${M(`${nf(x)} = ${nf(p)}%`)}`,
    });
  },
};

// ---------- 7. percent of a quantity ----------
function pctBar(p, Q) {
  const W = 300, x0 = 20, fill = (W * p) / 100;
  let s = `<svg viewBox="0 0 340 84" class="ldec-pbar" style="max-width:360px"><rect x="${x0}" y="22" width="${W}" height="30" rx="6" class="ldec-pb-off"/>`;
  s += `<rect x="${x0}" y="22" width="${fill}" height="30" rx="6" class="ldec-pb-on"/>`;
  for (let i = 1; i < 10; i++) s += `<line x1="${x0 + i * 30}" y1="22" x2="${x0 + i * 30}" y2="52" class="ldec-pb-tk"/>`;
  s += `<rect x="${x0}" y="22" width="${W}" height="30" rx="6" class="ldec-pb-frame"/>`;
  s += `<text x="${x0 - 6}" y="74" class="ldec-pb-t" text-anchor="start">0%</text><text x="${x0 + W + 6}" y="74" class="ldec-pb-t" text-anchor="end">100% = ${Q}</text>`;
  s += `<text x="${Math.min(Math.max(x0 + fill / 2, 48), 292)}" y="16" class="ldec-pb-t on">${p}% = ?</text>`;
  return `<div dir="ltr">${s}</svg></div>`;
}
const CTX = [
  (Q, p) => [`בבקבוק יש ${M(Q)} מ״ל תמיסה, ו־⁠${pctS(p)} ממנה הם מים. כמה מ״ל מים יש בבקבוק?`, 'מ״ל'],
  (Q, p) => [`בצלחת גידול יש ${M(Q)} חיידקים, ו־⁠${pctS(p)} מהם זוהרים. כמה חיידקים זוהרים?`, 'חיידקים'],
  (Q, p) => [`שק אבקה שוקל ${M(Q)} גרם, ו־⁠${pctS(p)} ממנו הם סוכר. כמה גרם סוכר יש בשק?`, 'גרם'],
  (Q, p) => [`במחסן המעבדה יש ${M(Q)} מבחנות, ו־⁠${pctS(p)} מהן סדוקות. כמה מבחנות סדוקות?`, 'מבחנות'],
];
// first steps for the friendly percents
const pctHints = (p, Q) => ({
  50: [`${pctS(50)} הם חצי.`, `חצי מ־⁠${M(Q)}.`],
  25: [`${pctS(25)} הם רבע.`, `${M(`${Q} ÷ 4`)}`],
  75: [`${pctS(75)} הם שלושה רבעים.`, `רבע מ־⁠${M(Q)} הוא ${N(Q / 4)}. כמה הם שלושה רבעים?`],
  1: [`${pctS(1)} הוא חלק אחד מתוך 100.`, `${M(`${Q} ÷ 100`)}`],
  5: [`${pctS(5)} הם חצי מ־⁠${pctS(10)}.`, `${pctS(10)} מ־⁠${M(Q)} הם ${N(Q / 10)}.`],
}[p] || [`מצאו קודם ${pctS(10)}: מחלקים ב־10.`, `${pctS(10)} מ־⁠${M(Q)} הם ${N(Q / 10)}. כמה הם ${pctS(p)}?`]);
const pctOf = {
  id: 'ldec-pct', title: 'אחוז מכמות',
  intro: `<p>כדי למצוא אחוז מכמות, מוצאים קודם ${M('1%')} (מחלקים ב־100) או ${M('10%')} (מחלקים ב־10), ואז כופלים.</p>
    <div class="ex">${M('35%')} מ־⁠${M('240')}: ${M('10%')} הם ${M('24')}, אז ${M('30%')} הם ${M('72')}. ${M('5%')} הם חצי מ־⁠${M('10%')}, כלומר ${M('12')}. יחד: ${M('72 + 12 = 84')}.</div>
    <p>אפשר גם לכפול בשבר העשרוני: ${M('240 × 0.35 = 84')}.</p>
    <p>וכדי לבדוק <b>כמה אחוזים</b> הם חלק מתוך שלם: מחלקים את החלק בשלם וכופלים ב־100.</p>`,
  gen(L) {
    const t = rnd(0, 2);
    if (L === 1) {
      if (t === 2) {
        const Q = pick([10, 20, 25, 50, 200, 300, 400, 500]);
        let k;
        do k = rnd(1, 99); while ((Q * k) % 100 || k === 50);
        const part = (Q * k) / 100;
        return dAns({
          prompt: `מתוך ${M(Q)} מבחנות בניסוי, ב־⁠${M(part)} מבחנות הנוזל הפך לירוק. כמה אחוזים מהמבחנות הפכו לירוקות?`, ans: k, line: B => M(`${B}%`),
          hints: [`כמה זה מתוך 100? הרחיבו את ${F(part, Q)} למכנה 100.`, `${M(`${fr(part, Q)} = ${fr(k, 100)}`)}.`],
          explain: `${M(`${fr(part, Q)} = ${fr(k, 100)} = ${k}%`)}`,
        });
      }
      const p = pick([10, 20, 25, 50, 75, 5, 1, 30, 40, 60, 90]), unit = 100 / gcd(p, 100), Q = unit * rnd(Math.ceil(20 / unit) + (p === 1 ? 1 : 0), Math.floor(800 / unit)), ans = (Q * p) / 100;
      const [prompt, u] = pick(CTX)(Q, p);
      return dAns({
        prompt, visual: pctBar(p, Q), ans, line: B => `${B} ${u}`,
        hints: pctHints(p, Q),
        explain: `${M(`${Q} ÷ 100 × ${p} = ${nf(ans)}`)}`,
      });
    }
    if (L === 2) {
      if (t === 0) {
        let p;
        do p = rnd(2, 98); while (p % 5 === 0 && Math.random() < 0.7);
        const Q = rnd(2, 50) * pick([2, 4, 5, 10]), ans = cl((Q * p) / 100), [prompt, u] = pick(CTX.slice(0, 3))(Q, p);
        return dAns({
          prompt, ans, line: B => `${B} ${u}`,
          hints: [`מצאו ${pctS(1)}: ${M(`${Q} ÷ 100 = ${nf(Q / 100)}`)}.`, `עכשיו כפלו ב־⁠${M(p)}: ${M(`${nf(Q / 100)} × ${p}`)}.`],
          explain: `${M(`${Q} × ${nf(p / 100)} = ${nf(ans)}`)}`,
        });
      }
      if (t === 1) {
        const Q = rnd(4, 90) * 10, p = pick([10, 15, 20, 25, 30, 35, 40, 12, 5]), up = Math.random() < 0.4, d = cl((Q * p) / 100), ans = cl(up ? Q + d : Q - d);
        return dAns({
          prompt: up ? `מחיר של מיקרוסקופ היה ${M(Q)} ש״ח, והוא עלה ב־⁠${pctS(p)}. מה המחיר החדש?` : `מחיר של מיקרוסקופ הוא ${M(Q)} ש״ח, ויש עליו הנחה של ${pctS(p)}. כמה ש״ח צריך לשלם?`,
          ans, line: B => `${B} ש״ח`,
          hints: [`מצאו קודם כמה הם ${pctS(p)} מ־⁠${M(Q)}.`, `${pctS(p)} מ־⁠${M(Q)} הם ${N(d)}. עכשיו ${up ? 'הוסיפו' : 'החסירו'}.`],
          explain: `${M(`${Q} × ${nf(p / 100)} = ${nf(d)}`)}, ${M(`${Q} ${up ? '+' : '−'} ${nf(d)} = ${nf(ans)}`)} ש״ח. (או בקיצור: ${M(`${Q} × ${nf((100 + (up ? p : -p)) / 100)} = ${nf(ans)}`)})`,
        });
      }
      let Q, part, k;
      do {
        Q = pick([8, 16, 40, 80, 125, 250, 400, 200, 60, 20, 32]);
        part = rnd(1, Q - 1);
        k = cl((part * 100) / Q);
      } while (!Number.isInteger(cl(k * 10)));
      return dAns({
        prompt: `בניסוי נבטו ${M(part)} זרעים מתוך ${M(Q)}. כמה אחוזים מהזרעים נבטו?`, ans: k, line: B => M(`${B}%`),
        hints: [`חלקו את החלק בשלם: ${M(`${part} ÷ ${Q}`)}, וכפלו ב־100.`, `${M(`${fr(part, Q)} = ${nf(cl(part / Q))}`)}.`],
        explain: `${M(`${part} ÷ ${Q} = ${nf(cl(part / Q))} = ${nf(k)}%`)}`,
      });
    }
    const u = rnd(0, 3);
    if (u === 0) {
      const p = pick([20, 25, 30, 40, 60, 75, 15, 35, 45, 12, 80]), unit = 100 / gcd(p, 100), X = unit * rnd(Math.ceil(40 / unit), Math.floor(900 / unit)), A = (X * p) / 100;
      return dAns({
        prompt: `${pctS(p)} מהתמיסה במבחנה הם חומצה, ויש בה ${M(A)} מ״ל חומצה. כמה מ״ל תמיסה יש במבחנה?`, ans: X, line: B => `${B} מ״ל`,
        hints: [`${pctS(p)} הם ${M(A)}. כמה הם ${pctS(1)}?`, `${pctS(1)} הם ${M(`${A} ÷ ${p} = ${nf(cl(A / p))}`)}, ו־⁠${pctS(100)} הם פי 100.`],
        explain: `${pctS(1)} מהתמיסה: ${M(`${A} ÷ ${p} = ${nf(cl(A / p))}`)} מ״ל.<br>${pctS(100)}, כל התמיסה: ${M(`${nf(cl(A / p))} × 100 = ${X}`)} מ״ל.`,
      });
    }
    if (u === 1) {
      const Q = rnd(2, 15) * 100, a = pick([10, 20, 25, 50, 40]), b = pick([10, 20, 25, 50, 40]), upFirst = Math.random() < 0.5;
      const m = cl(upFirst ? (Q * (100 + a)) / 100 : (Q * (100 - a)) / 100), ans = cl(upFirst ? (m * (100 - b)) / 100 : (m * (100 + b)) / 100);
      return dAns({
        prompt: `מחיר של משקפי מגן היה ${M(Q)} ש״ח. המחיר ${upFirst ? 'עלה' : 'ירד'} ב־⁠${pctS(a)}, ואחר כך ${upFirst ? 'ירד' : 'עלה'} ב־⁠${pctS(b)} מהמחיר החדש. מה המחיר עכשיו?`,
        ans, line: B => `${B} ש״ח`,
        hints: ['פתרו בשני שלבים. האחוז השני נלקח מהמחיר <b>החדש</b>, לא מהמקורי!', `אחרי השינוי הראשון המחיר הוא ${N(m)} ש״ח.`],
        explain: `${M(`${Q} × ${nf((100 + (upFirst ? a : -a)) / 100)} = ${nf(m)}`)}, ואז ${M(`${nf(m)} × ${nf((100 + (upFirst ? -b : b)) / 100)} = ${nf(ans)}`)} ש״ח.`,
      });
    }
    if (u === 2) {
      const a = pick([20, 40, 50, 60, 30, 80, 25, 75]), b = pick([10, 20, 25, 50, 40, 30, 15, 5]), ans = cl((a * b) / 100);
      return dAns({
        prompt: `${pctS(a)} מתלמידי בית הספר משתתפים בחוג המדע, ו־⁠${pctS(b)} ממשתתפי החוג בונים רובוטים. כמה אחוזים מכל תלמידי בית הספר בונים רובוטים?`,
        ans, line: B => M(`${B}%`),
        hints: [`זה ${pctS(b)} מתוך ${pctS(a)}. נסו לחשוב על 100 תלמידים.`, `מתוך 100 תלמידים, ${M(a)} בחוג. כמה הם ${pctS(b)} מ־⁠${M(a)}?`],
        explain: `נניח שיש 100 תלמידים: ${M(a)} בחוג, ו־⁠${pctS(b)} מהם: ${M(`${a} × ${nf(b / 100)} = ${nf(ans)}`)}. לכן ${pctS(ans)} מכל התלמידים.`,
      });
    }
    const p = pick([10, 20, 25, 40, 15, 30, 60, 35, 12]), unit = 100 / gcd(100 - p, 100), X = unit * rnd(Math.ceil(40 / unit), Math.floor(900 / unit)), R = (X * (100 - p)) / 100;
    return dAns({
      prompt: `מתמיסה במבחנה התאדו ${pctS(p)}, ונשארו ${M(R)} מ״ל. כמה מ״ל היו במבחנה בהתחלה?`, ans: X, line: B => `${B} מ״ל`,
      hints: [`אם התאדו ${pctS(p)}, כמה אחוזים נשארו?`, `נשארו ${pctS(100 - p)}, והם ${M(R)} מ״ל. כמה הם ${pctS(1)}?`],
      explain: `נשארו ${pctS(100 - p)}, והם ${M(R)} מ״ל.<br>${pctS(1)}: ${M(`${R} ÷ ${100 - p} = ${nf(cl(R / (100 - p)))}`)} מ״ל.<br>בהתחלה (${pctS(100)}): ${M(`${nf(cl(R / (100 - p)))} × 100 = ${X}`)} מ״ל.`,
    });
  },
};

// ---------- 8. dividing fractions ----------
const red = (max, min = 2) => {
  let n, d;
  do {
    d = rnd(min, max);
    n = rnd(1, d - 1);
  } while (gcd(n, d) > 1);
  return [n, d];
};
const fracEq = (n, d) => (gcd(n, d) > 1 || n > d ? ` = ${showFrac(n, d)}` : '');
const fdiv = {
  id: 'ldec-fdiv', title: 'חילוק שברים',
  intro: `<p>"כמה פעמים ${F(1, 4)} נכנס ב־3?" זה תרגיל חילוק: ${M(`3 ÷ ${fr(1, 4)} = 12`)}, כי בכל שלם יש 4 רבעים.</p>
    <p>הכלל: <b>חילוק בשבר הוא כפל בשבר ההפוך</b> (מחליפים בין המונה למכנה).</p>
    <div class="ex">${M(`${fr(2, 3)} ÷ ${fr(4, 5)} = ${fr(2, 3)} × ${fr(5, 4)} = ${fr(10, 12)} = ${fr(5, 6)}`)}</div>
    <p>אפשר לענות במספר שלם, בשבר או במספר מעורב, וכל צורה ששווה לתשובה תתקבל. משאירים ריקות תיבות שלא צריך.</p>`,
  gen(L) {
    const t = rnd(0, 2);
    if (L === 1) {
      if (t === 0) {
        const n = rnd(2, 4), d = rnd(2, 6);
        return num({
          prompt: `כמה מנות של ${F(1, d)} ליטר אפשר למזוג מ־⁠${M(n)} ליטרים של תמיסה?`, visual: `<div class="ldec-bars">${range(n, () => bar(0, d)).join('')}</div>`, answer: n * d,
          hints: [`בכל ליטר יש ${M(d)} מנות של ${F(1, d)}.`, `${M(n)} ליטרים, ובכל אחד ${M(d)} מנות: ${M(`${n} × ${d}`)}.`],
          explain: `${M(`${n} ÷ ${fr(1, d)} = ${n} × ${d} = ${n * d}`)} מנות.`,
        });
      }
      if (t === 1) {
        const [a, b] = red(9), k = rnd(2, 5);
        return ratAns({
          prompt: `מחלקים ${F(a, b)} ליטר תמיסה שווה בשווה ל־⁠${M(k)} מבחנות. כמה ליטר יש בכל מבחנה?`, pre: `${fr(a, b)} ÷ ${k}${EQ}`, n: a, d: b * k,
          hints: [`לחלק ל־⁠${M(k)} זה לקחת ${F(1, k)} מהכמות, כלומר לכפול ב־⁠${F(1, k)}.`, `${M(`${fr(a, b)} × ${fr(1, k)}`)}: כופלים מונה במונה ומכנה במכנה.`],
          explain: `${M(`${fr(a, b)} ÷ ${k} = ${fr(a, b)} × ${fr(1, k)} = ${fr(a, b * k)}`)}${fracEq(a, b * k)}`,
        });
      }
      const [p, q] = pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [3, 8], [5, 6], [2, 7], [3, 7], [5, 8]]), m = rnd(1, 4), n = p * m;
      return wAns({
        prompt: 'פתרו.', pre: `${n} ÷ ${fr(p, q)}${EQ}`, ans: m * q,
        hints: [`חילוק בשבר הוא כפל בשבר ההפוך: ${M(`÷ ${fr(p, q)}`)} זה כמו ${M(`× ${fr(q, p)}`)}.`, `${M(`${n} × ${fr(q, p)} = ${fr(n * q, p)}`)}`],
        explain: `${M(`${n} ÷ ${fr(p, q)} = ${n} × ${fr(q, p)} = ${fr(n * q, p)} = ${m * q}`)}`,
      });
    }
    if (L === 2) {
      if (t === 0) {
        let a, b, c, d;
        do [[a, b], [c, d]] = [red(9), red(9)]; while (a * d === b * c);
        return ratAns({
          prompt: 'פתרו.', pre: `${fr(a, b)} ÷ ${fr(c, d)}${EQ}`, n: a * d, d: b * c,
          hints: ['כופלים בשבר ההפוך של המחלק.', `${M(`${fr(a, b)} × ${fr(d, c)}`)}`],
          explain: `${M(`${fr(a, b)} ÷ ${fr(c, d)} = ${fr(a, b)} × ${fr(d, c)} = ${fr(a * d, b * c)}`)}${fracEq(a * d, b * c)}`,
        });
      }
      if (t === 1) {
        const [a, b] = red(5), [c, d] = red(6), w = rnd(1, 4), top = w * b + a;
        return ratAns({
          prompt: 'פתרו. הפכו קודם את המספר המעורב לשבר.', pre: `${w}${fr(a, b)} ÷ ${fr(c, d)}${EQ}`, n: top * d, d: b * c,
          hints: [`${M(`${w}${fr(a, b)} = ${fr(top, b)}`)}`, `${M(`${fr(top, b)} × ${fr(d, c)}`)}`],
          explain: `${M(`${w}${fr(a, b)} ÷ ${fr(c, d)} = ${fr(top, b)} × ${fr(d, c)} = ${fr(top * d, b * c)}`)}${fracEq(top * d, b * c)}`,
        });
      }
      let c, d, k;
      do [[c, d], k] = [red(8), rnd(3, 12)]; while ((k * c) % d === 0 || c < 2);
      return num({
        prompt: `בבקבוק יש ${showFrac(k * c, d)} ליטר תמיסה. כל מבחנה מכילה ${F(c, d)} ליטר. כמה מבחנות אפשר למלא?`, answer: k,
        hints: [`זה תרגיל חילוק: ${M(`${showFrac(k * c, d)} ÷ ${fr(c, d)}`)}. הפכו קודם את המספר המעורב לשבר.`, `${M(`${fr(k * c, d)} × ${fr(d, c)}`)}`],
        explain: `${M(`${fr(k * c, d)} ÷ ${fr(c, d)} = ${fr(k * c, d)} × ${fr(d, c)} = ${k}`)} מבחנות. (בעצם: ${M(k * c)} חלקים של ${F(1, d)}, ובכל מבחנה ${M(c)} חלקים.)`,
      });
    }
    if (t === 0) {
      let a, b, e, f;
      do [[a, b], [e, f]] = [red(9), red(9)]; while (a * f === b * e || a * f > 6 * b * e);
      const n = a * f, d = b * e;
      return ratAns({
        prompt: 'איזה מספר חסר?', tpl: B => `${fr(a, b)} ÷ ${B} = ${fr(e, f)}`, n, d,
        hints: [`אם ${M(`${fr(a, b)} ÷ ? = ${fr(e, f)}`)}, אז ${M(`? = ${fr(a, b)} ÷ ${fr(e, f)}`)}. (כמו ש־⁠${M('12 ÷ 3 = 4')} ולכן ${M('3 = 12 ÷ 4')}.)`, `${M(`${fr(a, b)} × ${fr(f, e)}`)}`],
        explain: `${M(`${fr(a, b)} ÷ ${fr(e, f)} = ${fr(a, b)} × ${fr(f, e)} = ${fr(n, d)}`)}${fracEq(n, d)}. בדיקה: ${M(`${fr(a, b)} ÷ ${showFrac(n, d)} = ${fr(e, f)}`)}.`,
      });
    }
    if (t === 1) {
      let n, p, q;
      do [n, [p, q]] = [rnd(3, 9), pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [3, 8], [5, 8], [3, 7], [4, 7], [5, 6], [7, 10]])]; while ((n * q) % p === 0);
      const full = Math.floor((n * q) / p), rest = (n * q) % p;
      return ratAns({
        prompt: `מ־⁠${M(n)} ליטר מיץ ממלאים כוסות של ${F(p, q)} ליטר. כמה כוסות אפשר למלא? (כוסות מלאות, ועוד חלק מכוס.)`, pre: `${n} ÷ ${fr(p, q)}${EQ}`, n: n * q, d: p,
        hints: [`${M(`${n} ÷ ${fr(p, q)} = ${n} × ${fr(q, p)}`)}`, `${M(`${n} × ${fr(q, p)} = ${fr(n * q, p)}`)}. הפכו למספר מעורב.`],
        explain: `${M(`${n} × ${fr(q, p)} = ${fr(n * q, p)}`)} = ${showFrac(n * q, p)}.<br>כלומר ${M(full)} כוסות מלאות, ועוד ${showFrac(rest, p)} כוס.`,
      });
    }
    const x = rnd(2, 9), [p, q] = pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [3, 8], [5, 8], [5, 6], [4, 7]]);
    const opts = shuffle([['big', `${x} ÷ ${fr(p, q)}`], ['a', `${x} × ${fr(p, q)}`], ['b', `${x} ÷ ${fr(q, p)}`], ['c', `${x} − ${fr(p, q)}`]]), i = opts.findIndex(o => o[0] === 'big');
    return {
      prompt: 'בלי לחשב עד הסוף: לאיזה תרגיל יש התוצאה <b>הגדולה</b> ביותר?',
      widget: choice(opts.map(o => M(o[1])), { cols: 2, cls: 'nums' }), answer: i, check: v => v === i,
      hints: [`חילוק במספר קטן מ־1 מגדיל: כמה פעמים ${F(p, q)} נכנס ב־⁠${M(x)}? יותר מ־⁠${M(x)} פעמים!`, `כפל ב־⁠${F(p, q)} וחילוק ב־⁠${F(q, p)} נותנים את אותה תוצאה, והיא קטנה מ־⁠${M(x)}.`],
      explain: `${M(`${x} ÷ ${fr(p, q)} = ${x} × ${fr(q, p)} = ${fr(x * q, p)}`)}${fracEq(x * q, p)}, יותר מ־⁠${M(x)}. כל השאר קטנים מ־⁠${M(x)}.`,
    };
  },
};

// ---------- 9. boss ----------
const boss = {
  id: 'ldec-boss', title: 'בוס: החשבונאי נקודה',
  intro: `<p>החשבונאי נקודה הזיז את הנקודה העשרונית בכל מכשירי המעבדה, ועכשיו אף מדידה לא נכונה. הוא מחכה לכם בחדר הניסויים עם בעיות שמערבבות את כל מה שלמדתם: עשרוניים, אחוזים ושברים.</p>
    <p>קראו כל שאלה פעמיים, פתרו שלב אחרי שלב, ובדקו באומדן שהתשובה הגיונית. כשתנצחו, הנקודות יחזרו למקום!</p>`,
  gen(L) {
    const t = rnd(0, 4);
    if (L === 1) {
      if (t === 0) {
        const pa = rnd(1, 2), pb = rnd(1, 3), a = dec(randDec(pa, 0, 5), pa), b = dec(randDec(pb, 0, 5), pb), ans = cl(a + b);
        return dAns({
          prompt: `בניסוי הראשון השתמשו ב־⁠${N(a)} ליטר מים, ובניסוי השני ב־⁠${N(b)} ליטר. כמה ליטר מים השתמשו בסך הכול?`, ans, line: B => `${B} ליטר`,
          hints: ['חברו בטור, נקודה מתחת לנקודה.', columns([nf(a), nf(b)], '+')],
          explain: columns([nf(a), nf(b)], '+', nf(ans)),
        });
      }
      if (t === 1) {
        const p = pick([10, 20, 25, 50, 75]), Q = (100 / gcd(p, 100)) * rnd(2, 20), ans = (Q * p) / 100;
        return dAns({
          prompt: `החשבונאי נקודה שפך ${pctS(p)} מ־⁠${M(Q)} מ״ל תמיסה. כמה מ״ל הוא שפך?`, ans, line: B => `${B} מ״ל`,
          hints: pctHints(p, Q),
          explain: `${M(`${Q} ÷ 100 × ${p} = ${ans}`)} מ״ל.`,
        });
      }
      if (t === 2) {
        const [u1, u2, s] = pick(UNITS), x = s > 0 ? someDec(1, 2, 9) : someDec(0, 1, s === -1 ? 90 : 2500), y = cl(x * 10 ** s), [big, small] = s > 0 ? [u1, u2] : [u2, u1];
        return dAns({
          prompt: `על המשקל כתוב ${N(x)} ${u1}, אבל החשבונאי מחק את הנקודה. כמה ${u2} זה?`, ans: y, line: B => `${N(x)} ${u1} = ${B} ${u2}`,
          hints: [`ב־⁠${M(1)} ${big} יש ${M(10 ** Math.abs(s))} ${small}.`, `${s > 0 ? 'כופלים' : 'מחלקים'} ב־⁠${M(10 ** Math.abs(s))}.`],
          explain: `${M(`${nf(x)} ${opOf(s)} = ${nf(y)}`)}`,
        });
      }
      if (t === 3) {
        const K = decK(1, 2, 49), x = dec(K, 1), k = rnd(3, 9), ans = dec(K * k, 1);
        return dAns({
          prompt: `כל מבחנה מכילה ${N(x)} מ״ל צבע. כמה מ״ל צבע יש ב־⁠${M(k)} מבחנות?`, ans, line: B => `${B} מ״ל`,
          hints: [`${M(`${nf(x)} × ${k}`)}`, `${M(`${K} × ${k} = ${K * k}`)}, ויש ספרה אחת אחרי הנקודה.`],
          explain: `${M(`${nf(x)} × ${k} = ${nf(ans)}`)} מ״ל.`,
        });
      }
      const n = rnd(2, 5), d = pick([2, 3, 4, 5, 8]);
      return num({
        prompt: `החשבונאי נקודה רוצה לחלק ${M(n)} ק״ג אבקה לשקיות של ${F(1, d)} ק״ג. כמה שקיות יצאו?`, answer: n * d,
        hints: [`בכל ק״ג יש ${M(d)} שקיות של ${F(1, d)} ק״ג.`, `${M(`${n} × ${d}`)}`],
        explain: `${M(`${n} ÷ ${fr(1, d)} = ${n} × ${d} = ${n * d}`)} שקיות.`,
      });
    }
    if (L === 2) {
      if (t === 0) {
        const n = rnd(3, 8), K = decK(1, 12, 95), price = dec(K, 1), S = Math.ceil((n * price) / 50) * 50 + pick([0, 50, 100]), ans = cl(S - n * price);
        return dAns({
          prompt: `קנו ${M(n)} משקפי מגן במחיר ${N(price)} ש״ח כל אחד, ושילמו בשטרות של ${M(S)} ש״ח. כמה עודף קיבלו?`, ans, line: B => `${B} ש״ח`,
          hints: ['קודם מצאו כמה עלו כל המשקפיים, ואחר כך חסרו מהסכום ששילמו.', `${M(`${n} × ${nf(price)} = ${nf(cl(n * price))}`)}`],
          explain: `${M(`${n} × ${nf(price)} = ${nf(cl(n * price))}`)}, ${M(`${S} − ${nf(cl(n * price))} = ${nf(ans)}`)} ש״ח.`,
        });
      }
      if (t === 1) {
        const Q = rnd(5, 60) * 10, p = pick([15, 35, 45, 12, 8, 24]), ans = cl((Q * (100 - p)) / 100);
        return dAns({
          prompt: `החשבונאי נקודה הוריד ${pctS(p)} ממשקל של גביש ששקל ${M(Q)} גרם. כמה גרם נשארו?`, ans, line: B => `${B} גרם`,
          hints: [`אם ירדו ${pctS(p)}, נשארו ${pctS(100 - p)}.`, `${M(`${Q} × ${nf((100 - p) / 100)}`)}`],
          explain: `${M(`${Q} × ${nf((100 - p) / 100)} = ${nf(ans)}`)} גרם.`,
        });
      }
      if (t === 2) {
        let a, b, c, d, k;
        do [[a, b], [c, d], k] = [red(6), red(8), rnd(2, 6)]; while (b === d);
        // k bottles of a/b litre are poured into cups of c/d litre: (k·a/b) ÷ (c/d)
        const n = k * a * d, dd = b * c;
        return ratAns({
          prompt: `בכל אחד מ־⁠${M(k)} בקבוקים יש ${F(a, b)} ליטר. את כל הנוזל מוזגים לכוסות של ${F(c, d)} ליטר. כמה כוסות מתמלאות? (אפשר מספר מעורב.)`, pre: '', n, d: dd,
          hints: [`קודם כמה ליטר יש בסך הכול: ${M(`${k} × ${fr(a, b)} = ${fr(k * a, b)}`)}.`, `עכשיו חלקו: ${M(`${fr(k * a, b)} ÷ ${fr(c, d)} = ${fr(k * a, b)} × ${fr(d, c)}`)}.`],
          explain: `${M(`${fr(k * a, b)} × ${fr(d, c)} = ${fr(n, dd)}`)}${fracEq(n, dd)} כוסות.`,
        });
      }
      if (t === 3) {
        const Ka = decK(1, 11, 60), Kb = decK(1, 11, 60), a = dec(Ka, 1), b = dec(Kb, 1), ans = dec(Ka * Kb, 2);
        return dAns({
          prompt: `החשבונאי נקודה ציפה בזהב משטח מלבני באורך ${N(a)} ס״מ וברוחב ${N(b)} ס״מ. מה שטח המשטח?`, ans, line: B => `${B} סמ״ר`,
          hints: ['שטח מלבן: אורך כפול רוחב.', `${M(`${Ka} × ${Kb} = ${Ka * Kb}`)}, ויש 2 ספרות אחרי הנקודה.`],
          explain: `${M(`${nf(a)} × ${nf(b)} = ${nf(ans)}`)} סמ״ר.`,
        });
      }
      let Q, part, k;
      do {
        Q = pick([40, 80, 250, 125, 400, 25, 50, 200]);
        part = rnd(1, Q - 1);
        k = cl((part * 100) / Q);
      } while (!Number.isInteger(cl(k * 10)));
      return dAns({
        prompt: `מתוך ${M(Q)} מדידות של החשבונאי, ${M(part)} היו שגויות. כמה אחוזים מהמדידות שגויות?`, ans: k, line: B => M(`${B}%`),
        hints: [`${M(`${part} ÷ ${Q}`)}, ואז כפול 100.`, `${M(`${part} ÷ ${Q} = ${nf(cl(part / Q))}`)}`],
        explain: `${M(`${part} ÷ ${Q} = ${nf(cl(part / Q))} = ${nf(k)}%`)}`,
      });
    }
    if (t === 0) {
      const V = dec(rnd(15, 50), 1), p = pick([20, 25, 30, 40, 35, 15, 60]), u = dec(rnd(2, Math.floor(V * 10) - 5), 1), ans = cl(((V - u) * p) / 100);
      return dAns({
        prompt: `בכלי יש ${N(V)} ליטר תמיסה, ו־⁠${pctS(p)} ממנה חומצה (החומצה מעורבבת בכל התמיסה באופן שווה). החשבונאי שפך ${N(u)} ליטר מהתמיסה. כמה ליטר חומצה נשארו בכלי?`, ans, line: B => `${B} ליטר`,
        hints: ['כמה ליטר תמיסה נשארו? גם בה החומצה היא אותו אחוז.', `נשארו ${M(`${nf(V)} − ${nf(u)} = ${nf(cl(V - u))}`)} ליטר תמיסה. כמה הם ${pctS(p)} מזה?`],
        explain: `${M(`${nf(V)} − ${nf(u)} = ${nf(cl(V - u))}`)}, ${M(`${nf(cl(V - u))} × ${nf(p / 100)} = ${nf(ans)}`)} ליטר חומצה.`,
      });
    }
    if (t === 1) {
      const a = pick([10, 20, 25, 50, 40, 30]), b = pick([10, 20, 25, 50, 40, 30]), ans = cl(((100 + a) * (100 - b)) / 100);
      return dAns({
        prompt: `החשבונאי נקודה העלה את מחיר הציוד ב־⁠${pctS(a)}, ואחר כך הוריד את המחיר החדש ב־⁠${pctS(b)}. המחיר הסופי הוא כמה אחוזים מהמחיר המקורי?`, ans, line: B => M(`${B}%`),
        hints: ['נסו מחיר מקורי של 100 ש״ח.', `אחרי העלייה: ${M(100 + a)} ש״ח. עכשיו הורידו ${pctS(b)} מ־⁠${M(100 + a)}.`],
        explain: `100 ש״ח הופכים ל־⁠${M(100 + a)}, ואז ל־⁠${M(`${100 + a} × ${nf((100 - b) / 100)} = ${nf(ans)}`)}. כלומר ${pctS(ans)} מהמקורי${a === b ? ` (פחות ממה שהיה, למרות שהעלייה והירידה היו באותו אחוז: הירידה נלקחה ממחיר גדול יותר!)` : ''}.`,
      });
    }
    if (t === 2) {
      const [a, b] = pick([[3, 4], [2, 3], [1, 2], [3, 5], [2, 5], [4, 5], [5, 6], [1, 4]]), V = b * rnd(2, 6), used = (V * a) / b, q = pick([0.25, 0.5, 0.4, 0.75, 0.2, 0.3]);
      const cups = Math.floor(cl(used / q));
      return num({
        prompt: `בבקבוק היו ${M(V)} ליטר מים מזוקקים. השתמשו ב־⁠${F(a, b)} מהבקבוק כדי למלא מבחנות של ${N(q)} ליטר. כמה מבחנות <b>מלאות</b> אפשר למלא?`, answer: cups,
        hints: [`קודם: כמה ליטר הם ${F(a, b)} מ־⁠${M(V)}?`, `${M(`${V} ÷ ${b} × ${a} = ${used}`)} ליטר. כמה פעמים ${N(q)} נכנס בזה?`],
        explain: `${F(a, b)} מ־⁠${M(V)} הם ${M(used)} ליטר. ${M(`${used} ÷ ${nf(q)} = ${nf(cl(used / q))}`)}, לכן ${M(cups)} מבחנות מלאות.`,
      });
    }
    if (t === 3) {
      let x, y, a, b, ans;
      do {
        [x, y, a, b] = [rnd(1, 5), rnd(1, 5), pick([10, 20, 30, 40, 50, 60]), pick([5, 10, 15, 20, 25, 35, 70, 80])];
        ans = cl((x * a + y * b) / (x + y));
      } while (a === b || !Number.isInteger(cl(ans * 10)));
      return dAns({
        prompt: `מערבבים ${M(x)} ליטר תמיסה שיש בה ${pctS(a)} מלח עם ${M(y)} ליטר תמיסה שיש בה ${pctS(b)} מלח. כמה אחוזים מלח יש בתערובת?`, ans, line: B => M(`${B}%`),
        hints: ['חשבו כמה ליטר מלח יש בכל תמיסה, וכמה ליטר יש בתערובת כולה.', `מלח: ${M(`${x} × ${nf(a / 100)} + ${y} × ${nf(b / 100)} = ${nf(cl((x * a + y * b) / 100))}`)} ליטר, מתוך ${M(x + y)} ליטר.`],
        explain: `מלח: ${M(`${nf(cl((x * a) / 100))} + ${nf(cl((y * b) / 100))} = ${nf(cl((x * a + y * b) / 100))}`)} ליטר מתוך ${M(x + y)}. ${M(`${nf(cl((x * a + y * b) / 100))} ÷ ${x + y} = ${nf(cl(ans / 100))} = ${nf(ans)}%`)}`,
      });
    }
    const f = pick([10, 100, 1000]), c = dec(rnd(1, 99), rnd(1, 2)), x = dec(decK(2, 11, 999), pick([2, 3])), y = cl(x * f + c);
    return dAns({
      prompt: `החשבונאי נקודה חשב על מספר, כפל אותו ב־⁠${M(f)}, הוסיף ${N(c)} וקיבל ${N(y)}. על איזה מספר הוא חשב?`, ans: x, line: B => B,
      hints: ['עבדו מהסוף להתחלה: קודם בטלו את החיבור, ואחר כך את הכפל.', `לפני החיבור היה ${M(`${nf(y)} − ${nf(c)} = ${nf(cl(y - c))}`)}.`],
      explain: `${M(`${nf(y)} − ${nf(c)} = ${nf(cl(y - c))}`)}, ${M(`${nf(cl(y - c))} ÷ ${f} = ${nf(x)}`)}. בדיקה: ${M(`${nf(x)} × ${f} + ${nf(c)} = ${nf(y)}`)}.`,
    });
  },
};

// keeps a word that ends in a maqaf on the same line as the number after it ("ל־3")
function glue(html) {
  if (typeof html !== 'string' || !html.includes('\u2060')) return html;
  const re = /[^\s<>]*־\u2060(?=<span)/g;
  let out = '', from = 0, m;
  while ((m = re.exec(html))) {
    let j = m.index + m[0].length, depth = 0;
    do {
      const open = html.indexOf('<span', j), close = html.indexOf('</span>', j);
      if (close < 0) return html;
      if (open >= 0 && open < close) {
        depth++;
        j = open + 5;
      } else {
        depth--;
        j = close + 7;
      }
    } while (depth > 0);
    out += `${html.slice(from, m.index)}<span class="ldec-nw">${html.slice(m.index, j)}</span>`;
    from = re.lastIndex = j;
  }
  return out + html.slice(from);
}
const glued = ch => ({
  ...ch, intro: glue(ch.intro),
  gen(L) {
    const r = ch.gen(L);
    return { ...r, prompt: glue(r.prompt), hints: r.hints.map(glue), explain: glue(r.explain) };
  },
});

export default {
  id: 'ldec', name: 'מעבדת העשרוניים', icon: '🧪', color: '#22d3ee', boss: 'החשבונאי נקודה',
  tagline: 'החשבונאים הזיזו את הנקודה העשרונית בכל מכשירי המעבדה. בלי עשרוניים מדויקים אף ניסוי לא יצליח.',
  challenges: [place, order, addSub, shift, mulDec, convert, pctOf, fdiv, boss].map(glued),
};

// מעבדת הנוסחאות
import { rnd, pick, shuffle, range, gcd, lcm, near, nf, h, M, F, fr } from '../../util.js';
import { inputs, box, choice } from '../../widgets.js';
import { nums, fracAns } from '../../kit.js';

// ---------- shared helpers ----------
const it = s => s.replace(/[a-z]/g, '<i class="lalg-v">$&</i>');
// a plain algebra string shown as maths: letters in italics, real minus and times signs
const A = s => M(it(s).replace(/ - /g, ' − ').replace(/\*/g, '×'));
const X = it('x');
const sum = a => a.reduce((s, v) => s + v, 0);
const uniq = a => [...new Set(a)];
const f1 = v => v.toFixed(1);
const term = (k, v = 'x') => (k === 1 ? v : `${k}${v}`);
const side = (k, w, v = 'x') => [k ? term(k, v) : '', w ? String(w) : ''].filter(Boolean).join(' + ') || '0';
const steps = lines => `<div class="lalg-steps" dir="ltr">${lines.filter((l, i) => l !== lines[i - 1]).map(l => `<div>${l}</div>`).join('')}</div>`;
const frx = (n, d) => (gcd(n, d) > 1 ? M(`${fr(n, d)} = ${fr(n / gcd(n, d), d / gcd(n, d))}`) : F(n, d));
const isPrime = n => n > 1 && range(n - 2, i => i + 2).every(d => d * d > n || n % d);
const fact = n => (n <= 1 ? 1 : n * fact(n - 1));
const choose = (n, k) => fact(n) / (fact(k) * fact(n - k));

// One number answer. pre/post are maths around the box; unit is a Hebrew word after it.
const one = ({ prompt, visual, answer, pre = '', post = '', unit = '', kind = '', hints, explain, tries, wrongMsg }) => {
  const b = box('a', Math.max(String(answer).length + 1, kind ? 4 : 2), false, kind);
  return {
    prompt, visual, hints, explain, tries, wrongMsg,
    widget: inputs(`<div class="ans-line">${pre || post ? M(`${pre}${b}${post}`) : b}${unit ? ' ' + unit : ''}</div>`),
    answer: { a: answer }, check: v => near(v.a, answer),
  };
};

// ---------- expressions: tokens, a tiny parser, and an equivalence test ----------
const tok = s => s.match(/\d+(?:\.\d+)?|[a-z]|[-+*/()²]/g);
const isNumT = t => /^\d/.test(t), isVarT = t => /^[a-z]$/.test(t);
function parse(T) {
  let i = 0;
  const atom = () => {
    const t = T[i++];
    let f;
    if (t == null) throw new Error('end');
    if (isNumT(t)) {
      const v = +t;
      f = () => v;
    } else if (isVarT(t)) f = e => e[t];
    else if (t === '(') {
      f = expr();
      if (T[i++] !== ')') throw new Error(')');
    } else throw new Error(t);
    while (T[i] === '²') {
      i++;
      const g = f;
      f = e => g(e) ** 2;
    }
    return f;
  };
  const termP = () => {
    let f = atom();
    for (;;) {
      const t = T[i], g = f;
      if (t === '*' || t === '/') {
        i++;
        const k = atom();
        f = t === '*' ? e => g(e) * k(e) : e => g(e) / k(e);
      } else if (t != null && (isVarT(t) || t === '(')) {
        const k = atom(); // 3x, 2(x + 1), ab
        f = e => g(e) * k(e);
      } else return f;
    }
  };
  const expr = () => {
    let f = termP();
    while (T[i] === '+' || T[i] === '-') {
      const o = T[i++], g = f, k = termP();
      f = o === '+' ? e => g(e) + k(e) : e => g(e) - k(e);
    }
    return f;
  };
  const f = expr();
  if (i !== T.length) throw new Error('extra');
  return f;
}
const tryParse = T => {
  try {
    return parse(T);
  } catch {
    return null;
  }
};
const SAMPLES = [2.37, 5.13, 0.71, 8.9].map((v, i) => ({ x: v, n: v, a: v + 1.3 * i + 0.4, b: 3.7 - 0.6 * i }));
function same(T, U) {
  const f = tryParse(T), g = tryParse(U);
  return !!f && !!g && SAMPLES.every(e => {
    const p = f(e), q = g(e);
    return Number.isFinite(p) && Math.abs(p - q) < 1e-7 * Math.max(1, Math.abs(q));
  });
}
const OPS = { '+': '+', '-': '−', '*': '×', '/': '÷' };
const fmt = T => T.map((t, j) => (OPS[t] ? ` ${OPS[t]} ` : isVarT(t) ? it(t) : isNumT(t) && j && isNumT(T[j - 1]) ? ' ' + t : t)).join('');
const E = s => M(fmt(tok(s)));
// a formula with numbers put in place of the letters: 3x + 2 → 3 × 4 + 2
const subst = (txt, vals) =>
  txt.replace(/(\d|\)|²)\s*(?=[a-z(])/g, '$1 × ').replace(/([a-z])(?=[a-z(])/g, '$1 × ').replace(/\//g, ' ÷ ').replace(/[a-z]/g, c => vals[c]);

// Build an expression from tiles. Any expression equal to the answer is accepted.
function tiles({ vars = ['x'], numbers, square = false }) {
  let T = [], locked = false;
  const out = h('div', { class: 'lalg-out', dir: 'ltr' });
  const draw = () => (out.innerHTML = T.length ? M(fmt(T)) : '<span class="lalg-ph">?</span>');
  const add = t => {
    if (locked || T.length >= 24) return;
    T.push(t);
    draw();
  };
  const del = () => {
    if (locked) return;
    T.pop();
    draw();
  };
  const tile = (label, t, cls) => h('button', { type: 'button', class: 'lalg-tile ' + cls, html: label, onclick: () => add(t) });
  const el = h('div', { class: 'lalg-tb' }, out,
    h('div', { class: 'lalg-pal', dir: 'ltr' }, vars.map(v => tile(it(v), v, 'v')), numbers.map(n => tile(String(n), String(n), 'n')),
      h('button', { type: 'button', class: 'lalg-tile f', 'aria-label': 'מחיקה', onclick: del }, '⌫')),
    h('div', { class: 'lalg-pal', dir: 'ltr' }, ['+', '-', '*', '/', '(', ')', ...(square ? ['²'] : [])].map(o => tile(OPS[o] || o, o, 'o'))));
  draw();
  return {
    el,
    value: () => (T.length && tryParse(T) ? [...T] : null), // an unfinished expression is not an answer yet
    set(a) {
      T = [...a];
      draw();
    },
    key(e) {
      if (locked) return false;
      if (e.key === 'Backspace') del();
      else if (vars.includes(e.key) || '+-*/()'.includes(e.key) || numbers.map(String).includes(e.key)) add(e.key);
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
// A round built with tiles: the check accepts every equivalent expression.
function tileRound({ prompt, visual, answer, vars = ['x'], numbers, square, hints, explain }) {
  const ansT = tok(answer);
  return {
    prompt, visual, hints, explain, tries: 3,
    widget: tiles({ vars, numbers: shuffle(uniq(numbers.map(Number))), square }),
    answer: ansT,
    check: v => same(v, ansT),
    wrongMsg: v => {
      const f = tryParse(v);
      if (!f) return 'הביטוי עוד לא שלם או לא תקין. בדקו את הפעולות ואת הסוגריים.';
      const g = parse(ansT);
      for (const p of [10, 6, 4, 12, 3, 5, 7]) {
        const e = { x: p, n: p, a: p, b: p + 1 }, mine = f(e), want = g(e);
        if (Number.isFinite(mine) && Math.abs(mine - want) > 1e-9)
          return `בדיקה: כש־${vars.map(k => M(`${it(k)} = ${e[k]}`)).join(' ו־')}, הביטוי שלכם נותן ${M(nf(Math.round(mine * 100) / 100))}, אבל צריך לצאת ${M(nf(want))}.`;
      }
      return '';
    },
  };
}

// ---------- pictures ----------
const tubeSVG = (x, y, k) =>
  `<g transform="translate(${x} ${y})" class="lalg-tube ${k}"><path d="M-8 -32h16v22a8 8 0 0 1-16 0z" class="glass"/><path d="M-8 -21h16v11a8 8 0 0 1-16 0z" class="liq"/><rect x="-10.5" y="-37" width="21" height="6" rx="2.5" class="cork"/></g>`;
const tubeIcon = k => `<svg viewBox="-12 -39 24 39" class="lalg-ico">${tubeSVG(0, 0, k)}</svg>`;
const wSVG = (n, x, y) => {
  const w = n >= 10 ? 19 : 15;
  return `<g transform="translate(${x} ${y})"><path d="M-${w} 0L-${w - 4} -27L${w - 4} -27L${w} 0Z" class="lalg-wt"/><text y="-8" class="lalg-wtt">${n}</text></g>`;
};
// Balance scale. Items: {k:'x'} green tube, {k:'y'} orange tube, {k:'w', n} weight.
function scaleSVG(left, right, tap = false) {
  const pan = (items, cx, sd) => {
    let s = `<path d="M${cx - 92} 150H${cx + 92}L${cx + 72} 164H${cx - 72}Z" class="lalg-pan"/><line x1="${cx}" y1="164" x2="${cx}" y2="178" class="lalg-rod"/>`;
    const ws = items.map(o => (o.k === 'w' ? (o.n >= 10 ? 44 : 36) : 25));
    let x = cx - sum(ws) / 2;
    items.forEach((o, i) => {
      const c = x + ws[i] / 2;
      x += ws[i];
      const g = o.k === 'w' ? wSVG(o.n, c, 149) : tubeSVG(c, 149, o.k);
      s += tap ? `<g data-act="${o.k}" data-side="${sd}" class="lalg-hit"><rect x="${c - ws[i] / 2}" y="100" width="${ws[i]}" height="64" class="hitbox"/>${g}</g>` : g;
    });
    return s;
  };
  return `<svg viewBox="0 98 420 112" class="lalg-scale">${pan(left, 105, 'L')}${pan(right, 315, 'R')}<line x1="105" y1="178" x2="315" y2="178" class="lalg-rod"/><path d="M210 178L192 206L228 206Z" class="lalg-pan"/></svg>`;
}

// ---------- 1. balance scales ----------
const other = sd => (sd === 'L' ? 'R' : 'L');
// The player removes the same thing from both pans until one tube is alone, then types its weight.
function balance(eq, x) {
  return ctx => {
    const s = { L: [...eq.L], R: [...eq.R] }, past = [];
    let locked = false, mini = null;
    const stage = h('div', { class: 'lalg-stage' }), hist = h('div', { class: 'lalg-hist', dir: 'ltr' });
    const sub = h('div', { class: 'lalg-sub' }, h('p', { class: 'lalg-tip' }, 'לחצו על מבחנה או על משקולת כדי להוריד אותה משני הצדדים.'));
    const items = sd => [...range(s[sd][0], () => ({ k: 'x' })), ...(s[sd][1] ? [{ k: 'w', n: s[sd][1] }] : [])];
    const text = () => A(`${side(...s.L)} = ${side(...s.R)}`);
    const alone = () => ['L', 'R'].find(sd => s[sd][0] && !s[sd][1] && !s[other(sd)][0]);
    const submit = () => {
      const v = mini && mini.value(), sd = alone();
      if (!v || locked) return;
      if (v.v === x) {
        locked = true;
        mini.lock();
        return ctx.solved();
      }
      const k = s[sd][0], W = s[other(sd)][1];
      mini.clear();
      ctx.mistake(k > 1 ? `${k} מבחנות של ${v.v} שוקלות ${M(`${k} × ${v.v} = ${k * v.v}`)}, ולא ${W}.` : `המבחנה מאוזנת מול ${W}.`);
    };
    const draw = () => {
      stage.innerHTML = scaleSVG(items('L'), items('R'), !mini && !locked);
      hist.innerHTML = [...past.map(l => `<div>${l}</div>`), `<div><b>${text()}</b></div>`].join('');
      const sd = alone();
      if (sd && !mini) {
        const k = s[sd][0], W = s[other(sd)][1];
        mini = inputs(M(`${X} = ${box('v', 3)}`), { onOk: submit });
        sub.innerHTML = '';
        sub.append(h('p', { class: 'lalg-tip' }, k === 1 ? `מבחנה אחת לבד מול ${W}. כמה היא שוקלת?` : `${k} מבחנות שוקלות יחד ${W}. כמה שוקלת מבחנה אחת?`), mini.el);
        stage.innerHTML = scaleSVG(items('L'), items('R'));
      }
    };
    const act = (kind, sd) => {
      if (locked || mini) return;
      const o = other(sd);
      if (kind === 'x') {
        if (!s[o][0]) return ctx.mistake('בצד השני אין מבחנה. מה שמורידים מצד אחד, חייבים להוריד גם מהצד השני.');
        past.push(text());
        s.L[0]--;
        s.R[0]--;
      } else {
        const w = s[sd][1];
        if (s[o][1] < w) return ctx.mistake(s[o][1] ? `בצד השני יש רק ${s[o][1]}, אז אי אפשר להוריד ממנו ${w}. נסו את המשקולת השנייה.` : `בצד השני אין משקולת, אז אי אפשר להוריד ממנו ${w}.`);
        past.push(text());
        s.L[1] -= w;
        s.R[1] -= w;
      }
      draw();
    };
    stage.addEventListener('click', e => {
      const g = e.target.closest && e.target.closest('[data-act]');
      if (g) act(g.dataset.act, g.dataset.side);
    });
    draw();
    return {
      el: h('div', { class: 'lalg-bal' }, stage, hist, sub),
      // the textbook path: tubes first, then the smaller weight; used by the self-test
      auto() {
        while (!mini) {
          if (s.L[0] && s.R[0]) act('x', 'L');
          else act('w', s.L[1] <= s.R[1] ? 'L' : 'R');
        }
        mini.set({ v: x });
        submit();
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
        else {
          sub.innerHTML = '';
          draw();
        }
      },
    };
  };
}
const scales = {
  id: 'lalg-scale', title: 'מאזניים עם נעלם',
  intro: `<p>המאזניים מאוזנים, וכל המבחנות הירוקות שוקלות אותו דבר. את המשקל של מבחנה אחת נסמן ב־${X}.</p>
    <p>הכלל החשוב: מותר להוריד <b>אותו דבר משני הצדדים</b>, והמאזניים נשארים מאוזנים. לחצו על מבחנה או על משקולת כדי להוריד אותה משני הצדדים, ומתחת למאזניים תראו איך המשוואה משתנה.</p>
    <div class="ex">${A('3x + 4 = x + 12')}<br>מורידים מבחנה משני הצדדים: ${A('2x + 4 = 12')}<br>מורידים 4 משני הצדדים: ${A('2x = 8')}<br>לכן ${A('x = 4')}.</div>`,
  gen(L) {
    if (L < 3) {
      let a, b, c, d, x;
      if (L === 1) {
        x = rnd(2, 12);
        a = rnd(1, 4);
        c = 0;
        b = pick([0, rnd(1, 15), rnd(1, 15), rnd(1, 15)]);
        if (a === 1 && !b) b = rnd(2, 9);
      } else {
        x = rnd(2, 9);
        a = rnd(2, 5);
        c = rnd(1, a - 1);
        b = rnd(0, 10);
      }
      d = (a - c) * x + b;
      const flip = Math.random() < 0.5, eq = flip ? { L: [c, d], R: [a, b] } : { L: [a, b], R: [c, d] }, k = a - c;
      const lines = [A(`${side(a, b)} = ${side(c, d)}`)];
      if (c) lines.push(A(`${side(k, b)} = ${d}`));
      if (b && k > 1) lines.push(A(`${term(k)} = ${d - b}`));
      lines.push(A(`x = ${x}`));
      return {
        prompt: 'המאזניים מאוזנים, וכל המבחנות שוקלות אותו דבר. הורידו דברים משני הצדדים עד שתגלו כמה שוקלת מבחנה אחת.',
        widget: balance(eq, x), sig: JSON.stringify(eq), tries: 3,
        hints: [
          c ? `קודם הורידו ${c === 1 ? 'מבחנה אחת' : c + ' מבחנות'} משני הצדדים${b ? `, ואחר כך את המשקולת ${b}` : ''}.` : b ? `לחצו על המשקולת ${b}: כך מורידים ${b} משני הצדדים.` : `${a} מבחנות שוקלות ${d}. כמה שוקלת אחת?`,
          k > 1 ? `נשאר ${A(`${term(k)} = ${d - b}`)}. מחלקים ב־${k}: ${M(`${d - b} ÷ ${k}`)}.` : `נשאר ${A(`x = ${d - b}`)}.`,
        ],
        explain: steps(lines),
      };
    }
    // two kinds of tubes on two scales
    const G = { k: 'x' }, O = { k: 'y' }, Wt = n => ({ k: 'w', n }), t = rnd(0, 3);
    let x, y, s1, s2, hints;
    if (t === 0) {
      y = rnd(2, 9);
      x = 2 * y;
      s1 = [[G, O], [Wt(x + y)]];
      s2 = [[G], [O, O]];
      hints = ['במאזניים השניים רואים שמבחנה ירוקה שוקלת כמו שתי כתומות. החליפו בדמיון את הירוקה שבמאזניים הראשונים בשתי כתומות.', `אז שלוש מבחנות כתומות שוקלות ${x + y}.`];
    } else if (t === 1) {
      do [x, y] = [rnd(2, 9), rnd(1, 9)]; while (x === y);
      s1 = [[G, G, O], [Wt(2 * x + y)]];
      s2 = [[G, O, O], [Wt(x + 2 * y)]];
      hints = ['שימו בדמיון את כל מה שבשני המאזניים על מאזניים אחד גדול. כמה ירוקות, כמה כתומות וכמה משקל יש בו?', `יחד: 3 ירוקות ו־3 כתומות שוקלות ${3 * (x + y)}, אז ירוקה אחת וכתומה אחת שוקלות יחד ${x + y}.`];
    } else if (t === 2) {
      const w = rnd(2, 9);
      x = rnd(2, 9);
      y = x + w;
      s1 = [[G, G, O], [Wt(2 * x + y)]];
      s2 = [[G, Wt(w)], [O]];
      hints = [`במאזניים השניים רואים שכתומה שוקלת כמו ירוקה ועוד ${w}. החליפו בדמיון את הכתומה שבמאזניים הראשונים.`, `אז שלוש ירוקות ועוד ${w} שוקלות ${2 * x + y}.`];
    } else {
      const k = rnd(2, 6);
      x = 2 * k;
      y = 3 * k;
      s1 = [[G, O], [Wt(5 * k)]];
      s2 = [[G, G, G], [O, O]];
      hints = ['במאזניים השניים: 3 ירוקות שוקלות כמו 2 כתומות. אם ירוקה היא 2 "חלקים", כמה חלקים היא כתומה?', `ירוקה היא 2 חלקים וכתומה 3 חלקים. יחד 5 חלקים ששוקלים ${5 * k}, אז חלק אחד שוקל ${k}.`];
    }
    if (Math.random() < 0.5) [s1, s2] = [s2, s1];
    return nums({
      prompt: 'שני המאזניים מאוזנים. כמה שוקלת כל מבחנה?', visual: scaleSVG(...s1) + scaleSVG(...s2),
      fields: [[`ירוקה ${tubeIcon('x')}`, x], [`כתומה ${tubeIcon('y')}`, y]], tries: 3, hints,
      explain: `ירוקה שוקלת ${x} וכתומה שוקלת ${y}. ${t === 1 || t === 2 ? `בדיקה: ${M(`2 × ${x} + ${y} = ${2 * x + y}`)}.` : `בדיקה: ${M(`${x} + ${y} = ${x + y}`)}.`}`,
    });
  },
};

// ---------- 2. substitution ----------
const board = html => `<div class="lalg-board" dir="ltr">${html}</div>`;
const machine = (parts, out = '?') => `<div class="lalg-mach" dir="ltr">${parts.map(p => (p.rule ? `<span class="lalg-mbox">${p.rule}</span>` : `<span class="lalg-io">${p}</span>`)).join('<span class="lalg-arr">➜</span>')}<span class="lalg-arr">➜</span><span class="lalg-io">${out}</span></div>`;
const LIN = [
  () => { const a = rnd(2, 9), b = rnd(1, 20); return `${a}x + ${b}`; },
  () => { const a = rnd(3, 9), b = rnd(1, 2 * a - 1); return `${a}x - ${b}`; },
  () => { const a = rnd(2, 6), b = rnd(1, 9); return `${a}(x + ${b})`; },
];
const valOf = (txt, vals) => parse(tok(txt))(vals);
const FORM2 = [
  () => ({ y: 'P', txt: '2(a + b)', vals: { a: rnd(2, 20), b: rnd(2, 20) }, what: 'היקף מלבן' }),
  () => ({ y: 'y', txt: 'a² + b', vals: { a: rnd(2, 9), b: rnd(1, 30) } }),
  () => { const a = rnd(2, 9), b = rnd(2, 9); return { y: 'y', txt: 'ab - c', vals: { a, b, c: rnd(1, a * b - 1) } }; },
  () => { const b = rnd(1, 9); return { y: 'y', txt: '3(a - b) + c', vals: { a: b + rnd(1, 9), b, c: rnd(1, 20) } }; },
  () => { const t = rnd(2, 6), v = rnd(3, 15); return { y: 'v', txt: 'd/t', disp: fr(it('d'), it('t')), vals: { d: v * t, t }, what: 'מהירות' }; },
  () => { let a, b, c; do [a, b, c] = [rnd(5, 30), rnd(5, 30), rnd(5, 30)]; while ((a + b + c) % 3); return { y: 'm', txt: '(a + b + c)/3', disp: fr(it('a + b + c'), 3), vals: { a, b, c }, what: 'ממוצע' }; },
  () => { let a, b, k; do [a, b, k] = [rnd(2, 12), rnd(2, 12), rnd(2, 8)]; while (((a + b) * k) % 2); return { y: 'S', txt: '(a + b)h/2', disp: fr(it('(a + b)h'), 2), vals: { a, b, h: k }, what: 'שטח טרפז' }; },
  () => { const a = rnd(3, 12), b = rnd(2, 9); return { y: 'y', txt: '2a + 3b - c', vals: { a, b, c: rnd(1, 2 * a + 3 * b - 1) } }; },
];
const QUAD = [
  ['x² - 3x + 2', 4, 12], ['2x² - 5x', 3, 9], ['(x - 2)² + x', 3, 12], ['x² + x', 4, 12], ['3x² - x - 4', 2, 8], ['x(x + 1)/2', 4, 15],
];
const subst2 = {
  id: 'lalg-subst', title: 'הצבה בנוסחה',
  intro: `<p><b>הצבה</b> פירושה לכתוב מספר במקום האות, ולחשב לפי סדר פעולות החשבון.</p>
    <div class="ex">הנוסחה ${A('y = 3x + 5')}. כש־${A('x = 4')}:<br>${M('y = 3 × 4 + 5 = 12 + 5 = 17')}</div>
    <p>זכרו: ${A('3x')} פירושו ${A('3 × x')}, ו־${A('ab')} פירושו ${A('a × b')}.</p>`,
  gen(L) {
    if (L === 1) {
      const txt = pick(LIN)(), vis = board(A(`y = ${txt}`));
      if (Math.random() < 0.5) {
        const x = rnd(2, 12), y = valOf(txt, { x }), sx = subst(txt, { x });
        return one({
          prompt: `על הלוח במעבדה כתובה נוסחה. מה ${A('y')} כאשר ${A(`x = ${x}`)}?`, visual: vis, answer: y, pre: `${it('y')} = `,
          hints: [`כתבו ${x} במקום ${X}, ואל תשכחו את הכפל שמסתתר בנוסחה: ${A(`y = ${subst(txt, { x: 'x' })}`)}.`, `${A(`y = ${sx}`)}`],
          explain: A(`y = ${sx} = ${y}`),
        });
      }
      const xs = shuffle(range(11)).slice(0, 3).sort((p, q) => p - q), ys = xs.map(x => valOf(txt, { x }));
      if (ys.some(v => v < 0)) xs.forEach((_, i) => (xs[i] += 2));
      const Y = xs.map(x => valOf(txt, { x }));
      return {
        prompt: 'השלימו את הטבלה לפי הנוסחה שעל הלוח.', visual: vis,
        widget: inputs(`<table class="lalg-tbl" dir="ltr"><tr><th>${X}</th>${xs.map(v => `<td>${v}</td>`).join('')}</tr><tr><th>${it('y')}</th>${xs.map((_, i) => `<td>${box('t' + i, 3)}</td>`).join('')}</tr></table>`),
        answer: Object.fromEntries(Y.map((v, i) => ['t' + i, v])), check: v => Y.every((y, i) => v['t' + i] === y),
        hints: ['בכל עמודה, כתבו את המספר של העמודה במקום ' + X + ' וחשבו.', `למשל בעמודה הראשונה: ${A(`y = ${subst(txt, { x: xs[0] })}`)}.`],
        explain: steps(xs.map((x, i) => A(`${subst(txt, { x })} = ${Y[i]}`))),
      };
    }
    if (L === 2) {
      const f = pick(FORM2)(), y = valOf(f.txt, f.vals), names = Object.keys(f.vals), sx = subst(f.txt, f.vals);
      return one({
        prompt: `${f.what ? `על הלוח כתובה הנוסחה של ${f.what}. ` : 'על הלוח במעבדה כתובה נוסחה. '}הציבו ${names.map(k => A(`${k} = ${f.vals[k]}`)).join(', ')}. מה ${A(f.y)}?`,
        visual: board(M(`${it(f.y)} = ${f.disp || it(f.txt.replace(/ - /g, ' − '))}`)), answer: y, pre: `${it(f.y)} = `,
        hints: ['כתבו כל מספר במקום האות שלו. אחר כך חשבו לפי סדר פעולות: סוגריים, חזקה, כפל וחילוק, ובסוף חיבור וחיסור.', A(`${f.y} = ${sx}`)],
        explain: A(`${f.y} = ${sx} = ${y}`),
      });
    }
    const t = rnd(0, 3);
    if (t === 0) {
      const [txt, lo, hi] = pick(QUAD), x = rnd(lo, hi), y = valOf(txt, { x }), sx = subst(txt, { x });
      const disp = txt.endsWith('/2') ? M(`${it('y')} = ${fr(it(txt.slice(0, -2)), 2)}`) : A(`y = ${txt}`);
      return one({
        prompt: `מה ${A('y')} כאשר ${A(`x = ${x}`)}? שימו לב: ${X} מופיע בנוסחה יותר מפעם אחת.`, visual: board(disp), answer: y, pre: `${it('y')} = `,
        hints: [`כתבו ${x} בכל מקום שבו מופיע ${X}. החזקה באה לפני הכפל.`, A(`y = ${sx}`)],
        explain: A(`y = ${sx} = ${y}`),
      });
    }
    if (t === 1) {
      const v = pick([
        () => { const c = 5 * rnd(1, 8); return { txt: '1.8c + 32', vals: { c }, y: 'F', what: `הנוסחה הופכת מעלות צלזיוס (${A('c')}) למעלות פרנהייט (${M('F')}).` }; },
        () => ({ txt: '0.5x + 3', vals: { x: 2 * rnd(2, 15) + 1 }, y: 'y' }),
        () => ({ txt: '4x - 1', vals: { x: rnd(1, 9) + pick([0.5, 0.25, 0.75]) }, y: 'y' }),
        () => ({ txt: '2x + 1.5', vals: { x: rnd(1, 9) + 0.5 }, y: 'y' }),
        () => ({ txt: '10x - 2.5', vals: { x: rnd(1, 9) / 10 + rnd(1, 5) }, y: 'y' }),
      ])();
      const y = Math.round(valOf(v.txt, v.vals) * 1000) / 1000, k = Object.keys(v.vals)[0], sx = subst(v.txt, v.vals);
      return one({
        prompt: `${v.what || 'על הלוח במעבדה כתובה נוסחה.'} הציבו ${A(`${k} = ${nf(v.vals[k])}`)}. מה ${A(v.y)}?`, visual: board(M(`${it(v.y)} = ${it(v.txt.replace(/ - /g, ' − '))}`)),
        answer: y, pre: `${it(v.y)} = `, kind: 'd',
        hints: [v.y === 'F' ? 'כפל במספר עשרוני אפשר לפרק. למשל ' + M('1.8 × 20 = 20 + 0.8 × 20 = 36') + '.' : 'כתבו את המספר במקום האות, וחשבו בזהירות עם הנקודה העשרונית.', A(`${v.y} = ${sx}`)],
        explain: A(`${v.y} = ${sx} = ${nf(y)}`),
      });
    }
    if (t === 2) {
      let r1, r2, x0, y1, y2;
      do [r1, r2, x0] = [pick(LIN)(), pick(LIN)(), rnd(2, 6)], y1 = valOf(r1, { x: x0 }), y2 = valOf(r2, { x: y1 }); while (y1 < 2 || y2 < 1);
      return one({
        prompt: `מכניסים את ${x0} למכונה הראשונה, ואת מה שיוצא ממנה מכניסים למכונה השנייה. כל מכונה מציבה את מה שנכנס אליה במקום ${X}. מה יוצא בסוף?`,
        visual: machine([x0, { rule: A(r1) }, { rule: A(r2) }]), answer: y2,
        hints: [`קודם המכונה הראשונה: ${A(subst(r1, { x: x0 }))}.`, `מהמכונה הראשונה יוצא ${y1}. עכשיו הציבו ${y1} במכונה השנייה.`],
        explain: steps([A(`${subst(r1, { x: x0 })} = ${y1}`), A(`${subst(r2, { x: y1 })} = ${y2}`)]),
      });
    }
    const r = pick(LIN)(), x = rnd(2, 15), y = valOf(r, { x });
    return one({
      prompt: `מהמכונה יצא ${y}. איזה מספר הכניסו אליה?`, visual: machine(['?', { rule: A(r) }], y), answer: x, pre: `${X} = `,
      hints: ['עבדו מהסוף להתחלה, עם הפעולות ההפוכות.', `כתבו משוואה: ${A(`${r} = ${y}`)}.`],
      explain: `${A(`${r} = ${y}`)}, ולכן ${A(`x = ${x}`)}. בדיקה: ${A(`${subst(r, { x })} = ${y}`)}.`,
    });
  },
};

// ---------- 3. an expression for a story ----------
const STORY1 = [
  () => { const k = rnd(3, 30); return { s: `במבחנה היו ${X} מ״ל מים, והוסיפו לה עוד ${k} מ״ל. כמה מ״ל יש בה עכשיו?`, a: `x + ${k}`, w: [`${k}x`, `x - ${k}`, `${k} - x`, `x/${k}`] }; },
  () => { const k = rnd(2, 9); return { s: `על המדף ${X} קופסאות, ובכל קופסה ${k} מבחנות. כמה מבחנות יש בסך הכול?`, a: `${k}x`, w: [`x + ${k}`, `x/${k}`, `${k}/x`, `x - ${k}`] }; },
  () => { const k = rnd(2, 8); return { s: `${X} עכברי מעבדה מתחלקים שווה בשווה בין ${k} כלובים. כמה עכברים יש בכל כלוב?`, a: `x/${k}`, w: [`${k}/x`, `${k}x`, `x - ${k}`, `x + ${k}`], tv: 6 * k }; },
  () => { const k = rnd(2, 12); return { s: `בארון היו ${X} מבחנות, ו־${k} מהן נשברו. כמה מבחנות שלמות נשארו?`, a: `x - ${k}`, w: [`${k} - x`, `x + ${k}`, `${k}x`, `x/${k}`], tv: 20 }; },
  () => { const k = rnd(2, 6), m = rnd(1, 9); return { s: `חשבו על מספר ${X}. הכפילו אותו ב־${k}, ואז הוסיפו ${m}.`, a: `${k}x + ${m}`, w: [`${k}(x + ${m})`, `${m}x + ${k}`, `x + ${k} + ${m}`, `${k}x - ${m}`] }; },
  () => { const k = rnd(2, 6), m = rnd(1, 9); return { s: `חשבו על מספר ${X}. הוסיפו לו ${m}, ואת התוצאה הכפילו ב־${k}.`, a: `${k}(x + ${m})`, w: [`${k}x + ${m}`, `x + ${k * m}`, `${m}(x + ${k})`, `${k} + x + ${m}`] }; },
  () => { const k = rnd(3, 9), m = rnd(2, 9); return { s: `מחברת מעבדה עולה ${k} שקלים, ועט עולה ${m} שקלים. כמה עולות ${X} מחברות ועט אחד?`, a: `${k}x + ${m}`, w: [`${k}(x + ${m})`, `${m}x + ${k}`, `x + ${k} + ${m}`, `${k + m}x`] }; },
  () => { const m = rnd(1, 9); return { s: `חצי מהמספר ${X}, פחות ${m}.`, a: `x/2 - ${m}`, w: [`(x - ${m})/2`, `2x - ${m}`, `${m} - x/2`, `2(x - ${m})`], tv: 30 }; },
];
const STORY2 = [
  () => { const k = rnd(2, 9), m = rnd(5, 40); return { s: `בכל אחת מ־${k} מבחנות יש ${X} מ״ל תמיסה, ובבקבוק יש עוד ${m} מ״ל. כמה מ״ל תמיסה יש בסך הכול?`, a: `${k}x + ${m}`, n: [k, m] }; },
  () => { const k = rnd(2, 9), m = rnd(2, 6); return { s: `במעבדה היו ${X} צלוחיות, ו־${m} מהן נשברו. בכל צלוחית שנשארה שמו ${k} זרעים. כמה זרעים שמו בסך הכול?`, a: `${k}(x - ${m})`, n: [k, m], tv: 10 }; },
  () => { const k = rnd(2, 6), m = rnd(2, 9); return { s: `${X} גרם אבקה חולקו שווה בשווה בין ${k} צלוחיות, ואחר כך הוסיפו לכל צלוחית ${m} גרם. כמה גרם יש בכל צלוחית?`, a: `x/${k} + ${m}`, n: [k, m], tv: 10 * k }; },
  () => { const k = rnd(2, 5), m = rnd(2, 9); return { s: `לנועה יש ${X} מדבקות. לאחיה יש ${m} מדבקות פחות ממנה, ולאחותה יש פי ${k} מדבקות מאשר לאח. כמה מדבקות יש לאחות?`, a: `${k}(x - ${m})`, n: [k, m], tv: 20 }; },
  () => { const k = rnd(2, 5), m = rnd(10, 25); return { s: `בהתחלה הטמפרטורה של התמיסה ${m} מעלות, ובכל דקה היא עולה ב־${k} מעלות. מה הטמפרטורה אחרי ${X} דקות?`, a: `${m} + ${k}x`, n: [k, m] }; },
  () => { const k = rnd(15, 40), m = rnd(10, 50); return { s: `כרטיס למוזיאון המדע עולה ${k} שקלים לתלמיד. כיתה של ${X} תלמידים קיבלה הנחה של ${m} שקלים על כל ההזמנה. כמה שילמה הכיתה?`, a: `${k}x - ${m}`, n: [k, m], tv: 30 }; },
  () => { const k = rnd(2, 5), m = rnd(3, 9); return { s: `לחוקר היו ${X} שקלים. הוא קנה ${k} משקפי מגן, כל אחד ב־${m} שקלים. כמה כסף נשאר לו?`, a: `x - ${k}*${m}`, n: [k, m], tv: 100 }; },
];
const rectPic = k => `<svg viewBox="-64 -10 256 124" class="lalg-rect" style="max-width:210px"><rect x="0" y="0" width="180" height="90" class="shape"/><text x="90" y="112" class="glabel"><tspan font-style="italic">x</tspan></text><text x="-8" y="50" class="glabel lalg-end"><tspan font-style="italic">x</tspan> − ${k}</text></svg>`;
const STORY3 = [
  () => { const k = rnd(2, 6); return { s: `אורך המלבן ${X} ס״מ, והרוחב שלו קצר מהאורך ב־${k} ס״מ. כתבו ביטוי להיקף המלבן.`, a: `2(x + x - ${k})`, alt: `4x - ${2 * k}`, n: [2, k, 4], tv: 10, pic: rectPic(k) }; },
  () => ({ s: `שלושה מספרים עוקבים, והקטן מהם הוא ${it('n')}. כתבו ביטוי לסכום של שלושתם.`, a: 'n + (n + 1) + (n + 2)', alt: '3n + 3', n: [1, 2, 3], vars: ['n'], tv: 10 }),
  () => { const m = rnd(5, 30); return { s: `בבוקר מדדו ${X} מעלות, ובערב ${m} מעלות. כתבו ביטוי לממוצע של שתי המדידות.`, a: `(x + ${m})/2`, n: [m, 2], tv: 20 }; },
  () => { const k = rnd(4, 12), m = rnd(2, 9); return { s: `מחברת עולה ${k} שקלים ועט עולה ${m} שקלים. כתבו ביטוי למחיר של ${it('a')} מחברות ו־${it('b')} עטים.`, a: `${k}a + ${m}b`, n: [k, m], vars: ['a', 'b'] }; },
  () => ({ s: `במספר דו־ספרתי, ספרת העשרות היא ${it('a')} וספרת האחדות היא ${it('b')}. כתבו ביטוי למספר. (למשל 47 הוא ${M('4 × 10 + 7')}.)`, a: '10a + b', n: [10, 1, 100], vars: ['a', 'b'] }),
  () => { const k = rnd(2, 4), m = rnd(2, 9); return { s: `דנה בת ${X}. אמא שלה מבוגרת ממנה פי ${k}. כתבו ביטוי לסכום הגילים של שתיהן בעוד ${m} שנים.`, a: `x + ${m} + ${k}x + ${m}`, alt: `${k + 1}x + ${2 * m}`, n: [k, m, 2], tv: 10 }; },
  () => { const k = rnd(3, 9); return { s: `בכל קופסה ${k} מבחנות. במעבדה ${X} קופסאות מלאות ועוד קופסה אחת שחסרות בה 2 מבחנות. כתבו ביטוי למספר המבחנות.`, a: `${k}x + ${k} - 2`, alt: `${k}(x + 1) - 2`, n: [k, 2, 1], tv: 10 }; },
];
const story = {
  id: 'lalg-story', title: 'ביטוי לסיפור',
  intro: `<p>ביטוי אלגברי הוא "נוסחה" שמספרת את הסיפור במספרים ובאותיות.</p>
    <div class="ex">"פי 3 מ־${X}" ← ${A('3x')}<br>"${X} ועוד 5" ← ${A('x + 5')}<br>"${X} ועוד 5, והכול פי 3" ← ${A('3(x + 5)')}<br>"${X} מתחלק ל־4" ← ${E('x/4')}</div>
    <p>ברמות הגבוהות בונים את הביטוי בעצמכם: לחצו על הכפתורים לפי הסדר, ו־⌫ מוחק. כל ביטוי ששווה לנכון יתקבל.</p>
    <p>טיפ לבדיקה: הציבו מספר, למשל ${A('x = 10')}, ובדקו שהסיפור והביטוי נותנים אותה תוצאה.</p>`,
  gen(L) {
    if (L === 1) {
      const st = pick(STORY1)(), aT = tok(st.a), opts = [st.a];
      for (const w of shuffle(st.w)) if (opts.length < 4 && !opts.some(o => same(tok(o), tok(w)))) opts.push(w);
      const order = shuffle(range(opts.length)), ans = order.indexOf(0), tv = st.tv || 10, val = parse(aT)({ x: tv });
      return {
        prompt: `${st.s} איזה ביטוי מתאים?`,
        widget: choice(order.map(i => E(opts[i])), { cls: 'lalg-opts', cols: 2 }), answer: ans, check: v => v === ans,
        hints: ['תרגמו מילים לפעולות: "הוסיפו" זה חיבור, "פי" זה כפל, "מתחלקים" זה חילוק.', `נסו מספר: כש־${A(`x = ${tv}`)}, לפי הסיפור יוצא ${nf(val)}. איזה ביטוי נותן ${nf(val)}?`],
        explain: `${E(st.a)}. בדיקה: כש־${A(`x = ${tv}`)}, ${A(`${subst(st.a, { x: tv })} = ${nf(val)}`)}.`,
      };
    }
    const st = pick(L === 2 ? STORY2 : STORY3)(), vars = st.vars || ['x'], tv = st.tv || 10;
    const env = { x: tv, n: tv, a: 4, b: 7 }, val = parse(tok(st.a))(env);
    const extra = pick(range(8, i => i + 2).filter(n => !st.n.includes(n)));
    return tileRound({
      prompt: `${st.s}${L === 2 ? ' בנו את הביטוי.' : ''}`, visual: st.pic, answer: st.a, vars, numbers: [...st.n, extra],
      hints: [L === 2 ? 'מה קורה ל־' + X + ' קודם? כשפעולה צריכה לחול על תוצאה שלמה, שימו אותה בסוגריים.' : 'כתבו קודם במילים מה מחברים למה, ורק אחר כך בנו את הביטוי.',
        `בדקו את עצמכם: כש־${vars.map(k => M(`${it(k)} = ${env[k]}`)).join(' ו־')}, לפי הסיפור יוצא ${nf(val)}.`],
      explain: `ביטוי מתאים: ${E(st.a)}${st.alt ? `, או בקיצור ${E(st.alt)}` : ''}. כל ביטוי ששווה לו נכון.`,
    });
  },
};

// ---------- 4. two-step equations ----------
const eq2 = {
  id: 'lalg-eq2', title: 'משוואה בשני שלבים',
  intro: `<p>כדי לפתור משוואה, "מקלפים" את מה שנעשה ל־${X} בסדר הפוך, ובכל שלב עושים <b>אותו דבר לשני הצדדים</b>.</p>
    <div class="ex">${A('2x + 3 = 11')}<br>מורידים 3 משני הצדדים: ${A('2x = 8')}<br>מחלקים את שני הצדדים ב־2: ${A('x = 4')}</div>
    <p>בסוף כדאי לבדוק: ${M('2 × 4 + 3 = 11')}. ✓</p>`,
  gen(L) {
    if (L === 1) {
      const f = rnd(0, 3);
      let a = rnd(2, 9), x = rnd(2, 12), b, c, top, midL, mid;
      if (f === 0 || f === 3) {
        b = rnd(1, 20);
        c = a * x + b;
        top = f === 0 ? A(`${a}x + ${b} = ${c}`) : A(`${b} + ${a}x = ${c}`);
        midL = A(`${a}x`);
        mid = c - b;
      } else if (f === 1) {
        b = rnd(1, Math.min(20, a * x - 1));
        c = a * x - b;
        top = A(`${a}x - ${b} = ${c}`);
        midL = A(`${a}x`);
        mid = c + b;
      } else {
        a = rnd(2, 5);
        x = a * rnd(1, 6);
        b = rnd(1, 15);
        c = x / a + b;
        top = M(`${fr(X, a)} + ${b} = ${c}`);
        midL = M(fr(X, a));
        mid = c - b;
      }
      return {
        prompt: 'פתרו את המשוואה שלב אחרי שלב.',
        widget: inputs(`<div class="lalg-solve" dir="ltr"><div>${top}</div><div>${M(`${midL} = ${box('m', 3)}`)}</div><div>${M(`${X} = ${box('x', 3)}`)}</div></div>`),
        answer: { m: mid, x }, check: v => v.m === mid && v.x === x,
        wrongMsg: v => (v.m !== mid ? 'השורה השנייה עוד לא נכונה.' : 'השורה השנייה נכונה! בדקו את השורה האחרונה.'),
        hints: [f === 1 ? `הוסיפו ${b} לשני הצדדים.` : `הורידו ${b} משני הצדדים.`, f === 2 ? `${M(`${fr(X, a)} = ${mid}`)}, כלומר ${X} גדול פי ${a} מ־${mid}.` : `${A(`${a}x = ${mid}`)}. עכשיו חלקו ב־${a}.`],
        explain: steps([top, M(`${midL} = ${mid}`), A(`x = ${x}`)]),
      };
    }
    if (L === 2) {
      const f = rnd(0, 5);
      let a = rnd(2, 6), b = rnd(1, 9), x = rnd(2, 12), c, top, hints, lines;
      if (f === 0 || f === 1) {
        if (f === 1) x = b + rnd(1, 10);
        const inner = f === 0 ? x + b : x - b, s = f === 0 ? '+' : '-';
        c = a * inner;
        top = A(`${a}(x ${s} ${b}) = ${c}`);
        hints = [`אפשר לחלק את שני הצדדים ב־${a}.`, A(`x ${s} ${b} = ${inner}`)];
        lines = [top, A(`x ${s} ${b} = ${inner}`)];
      } else if (f === 2) {
        c = rnd(2, 12);
        c = rnd(Math.ceil((b + 1) / a), 12);
        x = a * c - b;
        top = M(`${fr(it(`x + ${b}`), a)} = ${c}`);
        hints = [`כפלו את שני הצדדים ב־${a}.`, A(`x + ${b} = ${a * c}`)];
        lines = [top, A(`x + ${b} = ${a * c}`)];
      } else if (f === 3) {
        c = rnd(1, 9);
        x = a * (c + b);
        top = M(`${fr(X, a)} − ${b} = ${c}`);
        hints = [`קודם הוסיפו ${b} לשני הצדדים.`, M(`${fr(X, a)} = ${c + b}`)];
        lines = [top, M(`${fr(X, a)} = ${c + b}`)];
      } else {
        if (f === 5) [a, x, b] = [rnd(11, 25), rnd(3, 15), rnd(10, 99)];
        c = a * x + b;
        top = f === 4 ? A(`${c} = ${a}x + ${b}`) : A(`${a}x + ${b} = ${c}`);
        hints = [f === 4 ? `זו אותה משוואה כמו ${A(`${a}x + ${b} = ${c}`)}, רק שהצדדים הפוכים.` : `הורידו ${b} משני הצדדים.`, A(`${a}x = ${c - b}`)];
        lines = [top, A(`${a}x = ${c - b}`)];
      }
      return one({ prompt: 'פתרו את המשוואה.', visual: `<div class="lalg-eqbig">${top}</div>`, answer: x, pre: `${X} = `, hints, explain: steps([...lines, A(`x = ${x}`)]) });
    }
    const f = rnd(0, 4);
    let x, top, lines, hints;
    if (f === 0) {
      const a = rnd(3, 9), c = rnd(1, a - 1), b = rnd(1, 20);
      x = rnd(2, 12);
      const d = (a - c) * x + b;
      top = A(`${a}x + ${b} = ${c === 1 ? 'x' : c + 'x'} + ${d}`);
      lines = [top, A(`${term(a - c)} + ${b} = ${d}`), A(`${term(a - c)} = ${d - b}`)];
      hints = [`${X} מופיע בשני הצדדים. קודם הורידו ${A(term(c))} משני הצדדים.`, A(`${term(a - c)} + ${b} = ${d}`)];
    } else if (f === 1) {
      const a = rnd(2, 5), c = rnd(1, a - 1), b = rnd(1, 6);
      x = rnd(1, 10);
      const d = a * (x + b) - c * x;
      top = A(`${a}(x + ${b}) = ${term(c)} + ${d}`);
      lines = [top, A(`${a}x + ${a * b} = ${term(c)} + ${d}`), A(`${term(a - c)} = ${d - a * b}`)];
      hints = ['קודם פתחו את הסוגריים: כופלים את כל מה שבתוכם.', A(`${a}x + ${a * b} = ${term(c)} + ${d}`)];
    } else if (f === 2) {
      const [p, q] = pick([[2, 3], [2, 4], [3, 6], [2, 6], [3, 4], [4, 12], [2, 5]]), l = lcm(p, q);
      x = l * rnd(1, 4);
      const c = x / p + x / q;
      top = M(`${fr(X, p)} + ${fr(X, q)} = ${c}`);
      lines = [top, M(`${fr(it(`${term(l / p)} + ${term(l / q)}`), l)} = ${c}`), A(`${term(l / p + l / q)} = ${c * l}`)];
      hints = [`הביאו את השברים למכנה משותף ${l}.`, `${M(`${fr(X, p)} + ${fr(X, q)} = ${fr(it(term(l / p + l / q)), l)}`)}. כפלו את שני הצדדים ב־${l}.`];
    } else if (f === 3) {
      const a = pick([2, 4, 6]), b = rnd(1, 15);
      x = rnd(1, 9) + (a === 4 ? pick([0.5, 0.25, 0.75]) : 0.5);
      const c = a * x + b;
      top = A(`${a}x + ${b} = ${c}`);
      lines = [top, A(`${a}x = ${c - b}`)];
      hints = [`הורידו ${b} משני הצדדים.`, `${A(`${a}x = ${c - b}`)}. כאן החילוק לא יוצא שלם, והתשובה היא מספר עשרוני.`];
    } else {
      const p = rnd(3, 6), r = rnd(1, p - 1), q = rnd(1, 5), s = rnd(1, 5);
      x = s + rnd(1, 10);
      const t = (p - r) * x + p * q + r * s;
      top = A(`${p}(x + ${q}) - ${r === 1 ? '' : r}(x - ${s}) = ${t}`);
      lines = [top, A(`${p}x + ${p * q} - ${term(r)} + ${r * s} = ${t}`), A(`${term(p - r)} + ${p * q + r * s} = ${t}`)];
      hints = [`פתחו את שני הסוגריים. זהירות: מינוס לפני סוגריים הופך את הסימן של ${s}: ${A(`-${r === 1 ? '' : r}(x - ${s}) = -${term(r)} + ${r * s}`).replace(/-/g, '−')}.`, A(`${term(p - r)} + ${p * q + r * s} = ${t}`)];
    }
    return one({ prompt: 'פתרו את המשוואה.', visual: `<div class="lalg-eqbig">${top}</div>`, answer: x, pre: `${X} = `, kind: 'd', hints, explain: steps([...lines, A(`x = ${nf(x)}`)]) });
  },
};

// ---------- 5. the rule of a sequence ----------
function stickEdges(kind, n) {
  const E2 = new Map(), add = (p, q) => E2.set([p.join(), q.join()].sort().join('|'), [p, q]);
  const sq = (x, y) => {
    add([x, y], [x + 1, y]);
    add([x + 1, y], [x + 1, y + 1]);
    add([x, y + 1], [x + 1, y + 1]);
    add([x, y], [x, y + 1]);
  };
  for (let i = 0; i < n; i++) {
    if (kind === 'sq') sq(i, 0);
    if (kind === 'lad') sq(i, 0), sq(i, 1);
    if (kind === 'house') sq(i, 1), add([i, 1], [i + 0.5, 0.2]), add([i + 0.5, 0.2], [i + 1, 1]);
    if (kind === 'tri') {
      const j = Math.floor(i / 2);
      if (i % 2 === 0) add([j, 1], [j + 1, 1]), add([j, 1], [j + 0.5, 0]), add([j + 0.5, 0], [j + 1, 1]);
      else add([j + 0.5, 0], [j + 1.5, 0]), add([j + 1, 1], [j + 1.5, 0]), add([j + 0.5, 0], [j + 1, 1]);
    }
  }
  return [...E2.values()];
}
const sticks = (kind, n) => stickEdges(kind, n).length;
const STICK_NAME = { sq: 'ריבועים', tri: 'משולשים', house: 'בתים', lad: 'סולם של ריבועים' };
function stickFigs(kind) {
  const u = 26, gap = 30, H = kind === 'house' || kind === 'lad' ? 2 : 1;
  let x0 = 0, s = '';
  for (let n = 1; n <= 3; n++) {
    const Es = stickEdges(kind, n), w = Math.max(...Es.flat().map(p => p[0]));
    s += Es.map(([p, q]) => `<line x1="${f1(x0 + p[0] * u)}" y1="${f1(p[1] * u)}" x2="${f1(x0 + q[0] * u)}" y2="${f1(q[1] * u)}" class="lalg-stk"/>`).join('');
    s += `<circle cx="${f1(x0 + (w * u) / 2)}" cy="${H * u + 20}" r="11" class="lalg-fc"/><text x="${f1(x0 + (w * u) / 2)}" y="${H * u + 25}" class="lalg-fl">${n}</text>`;
    x0 += w * u + gap;
  }
  const W = x0 - gap + 12;
  return `<svg viewBox="-6 -6 ${f1(W)} ${H * u + 44}" class="lalg-figs" style="max-width:${Math.round(W * 1.25)}px">${s}</svg>`;
}
const seqTable = vals => `<table class="lalg-tbl" dir="ltr"><tr><th>מקום</th>${vals.map((_, i) => `<td>${i + 1}</td>`).join('')}</tr><tr><th>ערך</th>${vals.map(v => `<td>${v}</td>`).join('')}</tr></table>`;
const linRule = (a1, d) => (a1 === d ? `${d}n` : a1 > d ? `${d}n + ${a1 - d}` : `${d}n - ${d - a1}`);
const QSEQ = [
  () => ({ r: 'n²', n: [1, 2] }),
  () => { const c = rnd(1, 6); return { r: `n² + ${c}`, n: [c, 1] }; },
  () => ({ r: 'n² - 1', n: [1, 2] }),
  () => ({ r: 'n(n + 1)', alt: 'n² + n', n: [1, 2] }),
  () => ({ r: '2n²', n: [2, 1] }),
  () => { const c = rnd(1, 4); return { r: `2n² + ${c}`, n: [2, c] }; },
  () => ({ r: 'n(n - 1)', alt: 'n² - n', n: [1, 2] }),
];
const rule = {
  id: 'lalg-rule', title: 'כלל של סדרה',
  intro: `<p>אפשר לתאר סדרה בעזרת <b>כלל</b>: נוסחה שנותנת את הערך שנמצא במקום ${it('n')}.</p>
    <div class="ex">בסדרה ${M('5, 8, 11, 14, …')} מוסיפים 3 בכל צעד, לכן בכלל יש ${A('3n')}. במקום 1: ${M('3 × 1 = 3')}, וצריך 5, אז מוסיפים 2.<br>הכלל: ${A('3n + 2')}. במקום ה־10: ${M('3 × 10 + 2 = 32')}.</div>
    <p>כשבונים כלל, לחצו על הכפתורים לפי הסדר. כל כלל ששווה לנכון יתקבל.</p>`,
  gen(L) {
    const kind = pick(['sq', 'tri', 'house', 'lad']), useFig = Math.random() < 0.45;
    let a1 = rnd(1, 15), d = rnd(2, 9);
    if (useFig) [a1, d] = [sticks(kind, 1), sticks(kind, 2) - sticks(kind, 1)];
    const vals = range(4, i => a1 + d * i), at = n => a1 + d * (n - 1);
    const figText = `ממשיכים לבנות צורות של ${STICK_NAME[kind]} מגפרורים, באותה דרך.`;
    const vis = useFig ? stickFigs(kind) : seqTable(vals);
    if (L === 1 || (L === 2 && Math.random() < 0.3)) {
      const N = L === 1 ? (useFig ? rnd(6, 12) : pick([10, 12, 15, 20, 25, 30])) : pick([50, 100]);
      return one({
        prompt: useFig ? `${figText} כמה גפרורים יהיו בצורה מספר ${N}?` : `מה הערך במקום ה־${N} בסדרה?`, visual: vis, answer: at(N),
        hints: [useFig ? `ספרו את הגפרורים בכל צורה: ${vals.slice(0, 3).join(', ')}. בכמה המספר גדל בכל צעד?` : `בכל צעד הערך גדל ב־${d}. ממקום 1 עד מקום ${N} יש ${N - 1} צעדים.`,
          `${M(`${a1} + ${N - 1} × ${d}`)}`],
        explain: `${useFig ? `בצורה 1 יש ${a1} גפרורים, ובכל צורה נוספים ${d}. ` : ''}${M(`${a1} + ${N - 1} × ${d} = ${at(N)}`)}${L > 1 ? `, או לפי הכלל ${A(`${linRule(a1, d)}`)}.` : ''}`,
      });
    }
    if (L === 2) {
      const r = linRule(a1, d);
      return tileRound({
        prompt: useFig ? `${figText} כתבו כלל: כמה גפרורים יש בצורה מספר ${it('n')}?` : `כתבו כלל לסדרה: מה הערך במקום ${it('n')}?`, visual: vis, answer: r, vars: ['n'],
        numbers: [d, a1, 1, Math.abs(a1 - d) || d].filter(Boolean),
        hints: [`בכל צעד הערך גדל ב־${d}, לכן בכלל יש ${A(`${d}n`)}.`, a1 === d ? `במקום 1: ${M(`${d} × 1 = ${d}`)}, בדיוק הערך שבמקום 1. בדקו גם את מקום 2.` : `במקום 1: ${M(`${d} × 1 = ${d}`)}, אבל הערך הוא ${a1}. ${a1 > d ? `צריך להוסיף ${a1 - d}.` : `צריך להחסיר ${d - a1}.`}`],
        explain: `הכלל: ${A(r)}. בדיקה: במקום 1 יוצא ${a1}, ובמקום 2 יוצא ${a1 + d}.`,
      });
    }
    const t = rnd(0, 2);
    if (t === 0) {
      const P = rnd(15, 60), D = useFig ? d : rnd(3, 12), V = a1 + D * (P - 1);
      return one({
        prompt: useFig ? `${figText} באיזו צורה יהיו בדיוק ${V} גפרורים?` : `באיזה מקום בסדרה נמצא המספר ${V}?`, visual: useFig ? vis : seqTable(range(4, i => a1 + D * i)), answer: P,
        hints: [`מצאו כלל: ${A(linRule(a1, D))}.`, `פתרו את המשוואה ${A(`${linRule(a1, D)} = ${V}`)}.`],
        explain: `${A(`${linRule(a1, D)} = ${V}`)}, ולכן ${A(`${D}n = ${V - (a1 - D)}`)} ו־${A(`n = ${P}`)}.`,
      });
    }
    const q = pick(QSEQ)(), qv = range(5, i => parse(tok(q.r))({ n: i + 1 }));
    return tileRound({
      prompt: `כתבו כלל לסדרה: מה הערך במקום ${it('n')}? (אפשר להשתמש בכפתור ²)`, visual: seqTable(qv), answer: q.r, vars: ['n'], numbers: q.n, square: true,
      hints: ['ההפרשים בין השכנים לא קבועים, לכן הכלל לא מהצורה ' + A('an + b') + '. השוו את הערכים למספרים הריבועיים 1, 4, 9, 16, 25.', `במקום 3 הערך ${qv[2]}, ו־${M('3² = 9')}. מה הקשר בין ${qv[2]} ל־9? בדקו את אותו קשר גם במקום 4.`],
      explain: `הכלל: ${A(q.r)}${q.alt ? `, או ${A(q.alt)}` : ''}. בדיקה: במקום 5, ${A(`${subst(q.r.replace(/n/g, 'x'), { x: 5 })} = ${qv[4]}`)}.`,
    });
  },
};

// ---------- 6. the mean ----------
// Tubes of liquid; tap one tube and then another to pour one unit across.
function levelTubes(hs0, cap = 10) {
  let hs = [...hs0], sel = null, locked = false;
  const n = hs.length, W = 66, U = 15, top = 34, yb = top + cap * U;
  const stage = h('div', { class: 'lalg-lv' });
  const draw = () => {
    let s = `<svg viewBox="0 0 ${n * W} ${yb + 16}">`;
    hs.forEach((v, i) => {
      const cx = i * W + W / 2, x0 = cx - 18;
      s += `<g data-i="${i}" class="lalg-lt${i === sel ? ' sel' : ''}"><rect x="${i * W + 2}" y="0" width="${W - 4}" height="${yb + 16}" class="hitbox"/>`;
      for (let k = 0; k < v; k++) s += `<rect x="${x0 + 3}" y="${yb - (k + 1) * U + 1}" width="30" height="${U - 2}" rx="3" class="u"/>`;
      s += `<path d="M${x0} ${top - 6}V${yb}q0 12 12 12h12q12 0 12-12V${top - 6}" class="tb"/><text x="${cx}" y="22" class="lbl">${v}</text></g>`;
    });
    stage.innerHTML = s + '</svg>';
  };
  stage.addEventListener('click', e => {
    const g = e.target.closest && e.target.closest('[data-i]');
    if (locked || !g) return;
    const i = +g.dataset.i;
    if (sel == null) sel = hs[i] ? i : null;
    else if (i === sel) sel = null;
    else if (hs[i] < cap) {
      hs[sel]--;
      hs[i]++;
      if (!hs[sel]) sel = null;
    }
    draw();
  });
  draw();
  return {
    el: h('div', { class: 'lalg-lvw' }, stage,
      h('p', { class: 'lalg-tip' }, 'לחצו על מבחנה כדי לבחור אותה, ואז על מבחנה אחרת כדי למזוג אליה יחידה אחת.'),
      h('button', { type: 'button', class: 'btn tiny', onclick: () => { if (!locked) { hs = [...hs0]; sel = null; draw(); } } }, '↺ מהתחלה')),
    value: () => [...hs],
    set(a) {
      hs = [...a];
      sel = null;
      draw();
    },
    lock() {
      locked = true;
      sel = null;
      draw();
    },
  };
}
const dataRow = vals => `<div class="lalg-data" dir="ltr">${vals.map(v => `<span>${v}</span>`).join('')}</div>`;
const MEAS = ['גובה הצמחים בניסוי, בס״מ:', 'הטמפרטורה שנמדדה בכל שעה, במעלות:', 'מספר הזרעים שנבטו בכל צלוחית:', 'הזמן שלקח לכל תגובה, בשניות:', 'המשקל של כל דגימה, בגרם:'];
function spread(n, m, r) {
  for (;;) {
    const v = range(n - 1, () => m + rnd(-r, r));
    v.push(n * m - sum(v));
    if (v[n - 1] >= 1 && Math.abs(v[n - 1] - m) <= r + 2 && new Set(v).size >= 3) return v;
  }
}
const mean = {
  id: 'lalg-mean', title: 'ממוצע',
  intro: `<p>ה<b>ממוצע</b> הוא הגובה שהיה לכולם אילו חילקו הכול שווה בשווה. מחברים את כל הערכים, ומחלקים במספר הערכים.</p>
    <div class="ex">הממוצע של 4, 7 ו־10: ${M('(4 + 7 + 10) ÷ 3 = 21 ÷ 3 = 7')}</div>
    <p>יש שאלות שבהן מוזגים נוזל בין מבחנות: לחצו על מבחנה ואחר כך על מבחנה אחרת, ויחידה אחת עוברת. כשהגבהים שווים, הגובה הוא הממוצע.</p>
    <p>טיפ: אם יודעים את הממוצע ואת מספר הערכים, יודעים גם את הסכום: ממוצע × מספר הערכים.</p>`,
  gen(L) {
    if (L === 1 && Math.random() < 0.5) {
      const n = rnd(4, 5), m = rnd(3, 7);
      let hs;
      do {
        hs = Array(n).fill(m);
        for (let k = 0; k < 8; k++) {
          const i = rnd(0, n - 1), j = rnd(0, n - 1);
          if (i !== j && hs[i] > 1 && hs[j] < 10) hs[i]--, hs[j]++;
        }
      } while (hs.every(v => v === m));
      const S = sum(hs);
      return {
        prompt: 'מזגו בין המבחנות עד שבכולן יהיה אותו גובה. הגובה המשותף הוא הממוצע!',
        widget: levelTubes(hs), answer: Array(n).fill(m), check: v => v.every(x => x === m), wrongMsg: () => 'הגבהים עוד לא שווים. המשיכו למזוג.',
        hints: [`בסך הכול יש ${S} יחידות נוזל ב־${n} מבחנות.`, `בסוף בכל מבחנה יהיו ${M(`${S} ÷ ${n} = ${m}`)} יחידות.`],
        explain: `סכום הגבהים: ${M(`${hs.join(' + ')} = ${S}`)}.<br>הממוצע: ${M(`${S} ÷ ${n} = ${m}`)}, ולכן בכל מבחנה ${m} יחידות.`,
      };
    }
    if (L === 1) {
      const n = rnd(4, 6), m = rnd(8, 30), v = spread(n, m, 7);
      return one({
        prompt: `${pick(MEAS)} מה הממוצע?`, visual: dataRow(v), answer: m,
        hints: [`חברו את כל ${n} הערכים, וחלקו ב־${n}.`, `הסכום הוא ${n * m}.`],
        explain: `${M(`${v.join(' + ')} = ${n * m}`)}<br>${M(`${n * m} ÷ ${n} = ${m}`)}`,
      });
    }
    if (L === 2) {
      const t = rnd(0, 2);
      if (t === 0) {
        const n = rnd(4, 5), m = rnd(10, 30), v = spread(n, m, 8), miss = v.pop();
        return one({
          prompt: `הממוצע של ${n} מדידות הוא ${m}. ${n - 1} מהן מופיעות כאן. מה המדידה החסרה?`, visual: dataRow([...v, '?']), answer: miss,
          hints: [`ממוצע ${m} של ${n} מדידות פירושו שהסכום של כולן הוא ${M(`${n} × ${m}`)}.`, `הסכום הוא ${n * m}, והמדידות שרואים מסתכמות ל־${sum(v)}.`],
          explain: `הסכום: ${M(`${n} × ${m} = ${n * m}`)}. חסר: ${M(`${n * m} − ${sum(v)} = ${miss}`)}.`,
        });
      }
      if (t === 1) {
        const n = pick([4, 5]);
        let v;
        do v = range(n, () => rnd(5, 40)); while (sum(v) % n === 0);
        const ans = sum(v) / n;
        return one({
          prompt: `${pick(MEAS)} מה הממוצע? (התשובה יכולה להיות מספר עשרוני.)`, visual: dataRow(v), answer: ans, kind: 'd',
          hints: [`חברו את כל ${n} הערכים, וחלקו ב־${n}.`, `הסכום הוא ${sum(v)}. עכשיו ${M(`${sum(v)} ÷ ${n}`)}.`],
          explain: `${M(`${v.join(' + ')} = ${sum(v)}`)}<br>${M(`${sum(v)} ÷ ${n} = ${nf(ans)}`)}`,
        });
      }
      let n, m, k, m2, add;
      do [n, m, k] = [rnd(3, 6), rnd(10, 30), rnd(1, 3) * pick([1, -1])], m2 = m + k, add = (n + 1) * m2 - n * m; while (add < 2);
      return one({
        prompt: `הממוצע של ${n} מדידות היה ${m}. הוסיפו עוד מדידה אחת, והממוצע ${k > 0 ? 'עלה' : 'ירד'} ל־${m2}. מה הייתה המדידה החדשה?`, answer: add,
        hints: [`הסכום של ${n} המדידות הראשונות: ${M(`${n} × ${m}`)}. מה הסכום של כל ${n + 1} המדידות?`, `קודם הסכום היה ${n * m}, ועכשיו ${M(`${n + 1} × ${m2} = ${(n + 1) * m2}`)}.`],
        explain: `${M(`${(n + 1) * m2} − ${n * m} = ${add}`)}`,
      });
    }
    const t = rnd(0, 4);
    if (t === 0) {
      let n1, n2, m1, m2;
      do [n1, n2, m1, m2] = [rnd(2, 8), rnd(2, 8), rnd(10, 40), rnd(10, 40)]; while (n1 === n2 || m1 === m2 || (n1 * m1 + n2 * m2) % (n1 + n2));
      const ans = (n1 * m1 + n2 * m2) / (n1 + n2);
      return one({
        prompt: `בקבוצה א יש ${n1} מבחנות, ובהן בממוצע ${m1} מ״ל. בקבוצה ב יש ${n2} מבחנות, ובהן בממוצע ${m2} מ״ל. מה הממוצע של כל המבחנות יחד?`, answer: ans,
        hints: ['זהירות: הממוצע של שני הממוצעים הוא לא התשובה, כי בקבוצות יש מספר שונה של מבחנות. חשבו כמה מ״ל יש בכל קבוצה.', `בקבוצה א ${M(`${n1} × ${m1} = ${n1 * m1}`)}, ובקבוצה ב ${M(`${n2} × ${m2} = ${n2 * m2}`)}.`],
        explain: `${M(`(${n1 * m1} + ${n2 * m2}) ÷ ${n1 + n2} = ${n1 * m1 + n2 * m2} ÷ ${n1 + n2} = ${ans}`)}`,
      });
    }
    if (t === 1) {
      const n = rnd(5, 8), m = rnd(12, 30);
      let dl, r;
      do {
        dl = pick([-3, -2, -1, 1, 2, 3]);
        r = m - (n - 1) * dl;
      } while (r <= 0);
      return one({
        prompt: `הממוצע של ${n} מדידות הוא ${m}. מחקו מדידה אחת שגויה, והממוצע של ${n - 1} המדידות שנשארו הוא ${m + dl}. מה הייתה המדידה שנמחקה?`, answer: r,
        hints: ['חשבו את הסכום לפני המחיקה ואחריה.', `לפני: ${M(`${n} × ${m} = ${n * m}`)}. אחרי: ${M(`${n - 1} × ${m + dl} = ${(n - 1) * (m + dl)}`)}.`],
        explain: `${M(`${n * m} − ${(n - 1) * (m + dl)} = ${r}`)}`,
      });
    }
    if (t === 2) {
      const k = rnd(4, 6), m = rnd(8, 20), ans = k * m - (k * (k - 1)) / 2;
      return one({
        prompt: `ל־${k} מספרים שלמים וחיוביים, שכולם שונים זה מזה, יש ממוצע ${m}. מה הערך הגדול ביותר שיכול להיות לאחד מהם?`, answer: ans,
        hints: [`הסכום של כל ${k} המספרים הוא ${k * m}. כדי שאחד יהיה הכי גדול, האחרים צריכים להיות הכי קטנים שאפשר.`, `האחרים הם ${range(k - 1, i => i + 1).join(', ')}.`],
        explain: `הסכום ${M(`${k} × ${m} = ${k * m}`)}. האחרים הכי קטנים: ${M(`${range(k - 1, i => i + 1).join(' + ')} = ${(k * (k - 1)) / 2}`)}. נשאר ${M(`${k * m} − ${(k * (k - 1)) / 2} = ${ans}`)}.`,
      });
    }
    if (t === 3) {
      const odd = Math.random() < 0.5, E2 = 2 * rnd(6, 30), list = odd ? [E2 - 3, E2 - 1, E2 + 1, E2 + 3] : [E2 - 4, E2 - 2, E2, E2 + 2, E2 + 4];
      return one({
        prompt: `הממוצע של ${odd ? 'ארבעה מספרים אי־זוגיים עוקבים' : 'חמישה מספרים זוגיים עוקבים'} הוא ${E2}. מה הגדול מביניהם?`, answer: list[list.length - 1],
        hints: ['במספרים שהמרווחים ביניהם שווים, הממוצע נמצא בדיוק באמצע.', odd ? `שני המספרים האמצעיים הם ${E2 - 1} ו־${E2 + 1}.` : `המספר האמצעי הוא ${E2}.`],
        explain: `המספרים: ${list.join(', ')}.`,
      });
    }
    const n = pick([4, 5, 10]), m = rnd(12, 30), p = rnd(10, 60);
    let q;
    do q = rnd(10, 60); while (q === p || (q - p) % n === 0);
    const ans = Math.round((m + (q - p) / n) * 1000) / 1000;
    return one({
      prompt: `הממוצע של ${n} מדידות חושב ויצא ${m}. אחר כך גילו שמדידה אחת נרשמה בטעות כ־${p}, והערך הנכון שלה ${q}. מה הממוצע הנכון?`, answer: ans, kind: 'd',
      hints: [`הסכום השגוי היה ${M(`${n} × ${m} = ${n * m}`)}. איך הוא משתנה כשמתקנים את הטעות?`, `הסכום הנכון: ${M(`${n * m} ${q > p ? '+' : '−'} ${Math.abs(q - p)} = ${n * m + q - p}`)}.`],
      explain: `${M(`${n * m + q - p} ÷ ${n} = ${nf(ans)}`)}`,
    });
  },
};

// ---------- 7. probability ----------
const COL = { r: ['אדום', 'אדומים'], b: ['כחול', 'כחולים'], g: ['ירוק', 'ירוקים'], y: ['צהוב', 'צהובים'] };
function jar(groups, per = 6) {
  const balls = shuffle(groups.flatMap(([c, n]) => range(n, () => c))), D = 24, rows = Math.ceil(balls.length / per);
  const Wd = per * D + 14, Ht = rows * D + 22;
  let s = `<svg viewBox="-8 -8 ${Wd + 16} ${Ht + 16}" class="lalg-jar" style="max-width:${Math.round((Wd + 16) * 1.15)}px"><path d="M-4 0H${Wd + 4}M0 0V${Ht - 10}q0 10 10 10H${Wd - 10}q10 0 10-10V0" class="lalg-glass"/>`;
  balls.forEach((c, i) => (s += `<circle cx="${7 + D / 2 + (i % per) * D}" cy="${Ht - 4 - D / 2 - Math.floor(i / per) * D}" r="10.5" class="lalg-ball ${c}"/>`));
  return s + '</svg>';
}
function spinner(cols) {
  const n = cols.length, R = 80, P = a => `${f1(R * Math.cos(a))} ${f1(R * Math.sin(a))}`;
  let s = '<svg viewBox="-90 -90 180 180" class="lalg-spin" style="max-width:190px">';
  cols.forEach((c, i) => {
    const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / n, a1 = a0 + (2 * Math.PI) / n;
    s += `<path d="M0 0L${P(a0)}A${R} ${R} 0 0 1 ${P(a1)}Z" class="lalg-sl ${c}"/>`;
  });
  return s + `<circle r="${R}" class="lalg-rim"/><g transform="rotate(${rnd(10, 80)})"><path d="M-6 0L0 -64L6 0Z" class="lalg-needle"/></g><circle r="8" class="lalg-hub"/></svg>`;
}
const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
const diceRow = () => `<svg viewBox="-20 -20 250 40" class="lalg-dice" style="max-width:270px">${range(6, i => `<g transform="translate(${i * 42} 0)"><rect x="-17" y="-17" width="34" height="34" rx="7" class="lalg-die"/>${PIPS[i + 1].map(([a, b]) => `<circle cx="${a * 9}" cy="${b * 9}" r="3.4" class="lalg-pip"/>`).join('')}</g>`).join('')}</svg>`;
const cards = N => `<div class="lalg-cards" dir="ltr">${range(N, i => `<span>${i + 1}</span>`).join('')}</div>`;
// two dice as a 6×6 table, with the outcomes of the event marked
const diceGrid = (lab, pred) => `<table class="lalg-dg" dir="ltr"><tr><th></th>${range(6, j => `<th>${j + 1}</th>`).join('')}</tr>${range(6, i => `<tr><th>${i + 1}</th>${range(6, j => `<td${pred(i + 1, j + 1) ? ' class="on"' : ''}>${lab(i + 1, j + 1)}</td>`).join('')}</tr>`).join('')}</table>`;
const DIE1 = [['מספר זוגי', v => v % 2 === 0], ['מספר אי־זוגי', v => v % 2 === 1], ['מספר גדול מ־4', v => v > 4], ['מספר קטן מ־3', v => v < 3], ['המספר 6', v => v === 6], ['מספר שמתחלק ב־3', v => v % 3 === 0], ['מספר גדול מ־1', v => v > 1]];
const partition = (n, k) => {
  for (;;) {
    const cut = shuffle(range(n - 1, i => i + 1)).slice(0, k - 1).sort((a, b) => a - b), p = [...cut, n].map((c, i) => c - (i ? cut[i - 1] : 0));
    if (p.every(x => x > 0)) return p;
  }
};
const prob = {
  id: 'lalg-prob', title: 'הסתברות',
  intro: `<p>כשכל התוצאות סיכוייהן שווים, ה<b>הסתברות</b> (הסיכוי) של מאורע היא שבר:</p>
    <div class="ex">מספר התוצאות המתאימות ÷ מספר כל התוצאות<br>בצנצנת 3 כדורים אדומים ו־5 כחולים. הסיכוי להוציא אדום הוא ${F(3, 8)}.</div>
    <p>הסתברות היא תמיד בין 0 (בלתי אפשרי) ל־1 (בטוח). כל שבר ששווה לתשובה יתקבל.</p>`,
  gen(L) {
    const t = rnd(0, L === 2 ? 3 : 2);
    if (L === 1) {
      if (t === 0) {
        const cs = shuffle(Object.keys(COL)).slice(0, rnd(2, 3)), ns = cs.map(() => rnd(1, 5)), c = rnd(0, cs.length - 1), T = sum(ns);
        return fracAns({
          prompt: `בצנצנת כדורים צבעוניים. מוציאים כדור אחד בלי להסתכל. מה הסיכוי שהוא ${COL[cs[c]][0]}?`, visual: jar(cs.map((k, i) => [k, ns[i]])), n: ns[c], d: T,
          hints: [`כמה כדורים יש בסך הכול? וכמה מהם ${COL[cs[c]][1]}?`, `יש ${T} כדורים, ו־${ns[c]} מהם ${COL[cs[c]][1]}.`],
          explain: `${ns[c]} כדורים ${COL[cs[c]][1]} מתוך ${T}: ${frx(ns[c], T)}.`,
        });
      }
      if (t === 1) {
        const n = pick([4, 5, 6, 8]), cs = shuffle(Object.keys(COL)).slice(0, rnd(2, 3)), ns = partition(n, cs.length), c = rnd(0, cs.length - 1);
        return fracAns({
          prompt: `מסובבים את החץ. כל החלקים שווים בגודלם. מה הסיכוי שהחץ ייעצר על ${COL[cs[c]][0]}?`, visual: spinner(shuffle(cs.flatMap((k, i) => range(ns[i], () => k)))), n: ns[c], d: n,
          hints: ['לכמה חלקים שווים מחולק העיגול? כמה מהם בצבע הזה?', `העיגול מחולק ל־${n} חלקים, ו־${ns[c]} מהם בצבע ${COL[cs[c]][0]}.`],
          explain: `${ns[c]} חלקים מתוך ${n}: ${frx(ns[c], n)}.`,
        });
      }
      const [name, p] = pick(DIE1), ok = range(6, i => i + 1).filter(p);
      return fracAns({
        prompt: `מטילים קובייה רגילה. מה הסיכוי שייצא ${name}?`, visual: diceRow(), n: ok.length, d: 6,
        hints: ['בקובייה יש 6 תוצאות אפשריות, וסיכוייהן שווים. אילו מהן מתאימות?', `התוצאות המתאימות: ${ok.join(', ')}.`],
        explain: `${ok.length === 1 ? 'תוצאה אחת מתאימה' : `${ok.length} תוצאות מתאימות (${ok.join(', ')})`} מתוך 6: ${frx(ok.length, 6)}.`,
      });
    }
    if (L === 2) {
      if (t === 0) {
        const cs = shuffle(Object.keys(COL)).slice(0, 3), ns = cs.map(() => rnd(1, 6)), T = sum(ns), not = Math.random() < 0.5;
        const [c1, c2] = shuffle([0, 1, 2]), good = not ? T - ns[c1] : ns[c1] + ns[c2];
        return fracAns({
          prompt: `מוציאים כדור אחד בלי להסתכל. מה הסיכוי ${not ? `שהוא <b>לא</b> ${COL[cs[c1]][0]}` : `שהוא ${COL[cs[c1]][0]} או ${COL[cs[c2]][0]}`}?`, visual: jar(cs.map((k, i) => [k, ns[i]])), n: good, d: T,
          hints: [not ? `ספרו את כל הכדורים שאינם ${COL[cs[c1]][1]}.` : `ספרו יחד את הכדורים ה${COL[cs[c1]][1]} וה${COL[cs[c2]][1]}.`, `${good} כדורים מתאימים מתוך ${T}.`],
          explain: `${good} מתוך ${T}: ${frx(good, T)}.${not ? ` אפשר גם כך: ${M(`1 − ${fr(ns[c1], T)} = ${fr(good, T)}`)}.` : ''}`,
        });
      }
      if (t === 1) {
        const N = rnd(10, 20), ev = pick([
          ['מספר זוגי', v => v % 2 === 0], ...[3, 4, 5].map(k => [`מספר שמתחלק ב־${k}`, v => v % k === 0]), ['מספר ראשוני', isPrime], ['מספר דו־ספרתי', v => v > 9],
          ...[0].map(() => { const m = rnd(4, N - 3); return [`מספר גדול מ־${m}`, v => v > m]; }),
        ]), ok = range(N, i => i + 1).filter(ev[1]);
        return fracAns({
          prompt: `על הקלפים כתובים המספרים 1 עד ${N}. מערבבים ושולפים קלף אחד. מה הסיכוי שעליו ${ev[0]}?`, visual: cards(N), n: ok.length, d: N,
          hints: ['רשמו את כל הקלפים שמתאימים, וספרו אותם.', `המתאימים: ${ok.join(', ')}.`],
          explain: `${ok.length} קלפים מתאימים (${ok.join(', ')}) מתוך ${N}: ${frx(ok.length, N)}.`,
        });
      }
      if (t === 2) {
        const n = pick([8, 10, 12]), cs = shuffle(Object.keys(COL)).slice(0, 3), ns = partition(n, 3), c = rnd(0, 2);
        return fracAns({
          prompt: `מסובבים את החץ. כל החלקים שווים בגודלם. מה הסיכוי שהחץ <b>לא</b> ייעצר על ${COL[cs[c]][0]}?`, visual: spinner(shuffle(cs.flatMap((k, i) => range(ns[i], () => k)))), n: n - ns[c], d: n,
          hints: [`לכמה חלקים מחולק העיגול? כמה מהם לא בצבע ${COL[cs[c]][0]}?`, `${ns[c]} חלקים בצבע ${COL[cs[c]][0]} מתוך ${n}, אז ${n - ns[c]} חלקים בצבעים אחרים.`],
          explain: `${n - ns[c]} חלקים מתוך ${n}: ${frx(n - ns[c], n)}.`,
        });
      }
      // which jar gives the better chance?
      let r1, t1, r2, t2;
      if (Math.random() < 0.25) {
        const [p, q] = pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5]]), [k1, k2] = shuffle([1, 2, 3]).slice(0, 2);
        [r1, t1, r2, t2] = [p * k1, q * k1, p * k2, q * k2];
      } else do [t1, t2] = [rnd(4, 12), rnd(4, 12)], [r1, r2] = [rnd(1, t1 - 1), rnd(1, t2 - 1)]; while (t1 === t2 || r1 * t2 === r2 * t1 || Math.abs(r1 / t1 - r2 / t2) < 0.04);
      const ans = r1 * t2 > r2 * t1 ? 0 : r1 * t2 < r2 * t1 ? 1 : 2;
      return {
        prompt: 'מוציאים כדור אחד בלי להסתכל. מאיזו צנצנת הסיכוי להוציא כדור <b>אדום</b> גדול יותר?',
        visual: `<div class="lalg-two"><div>${jar([['r', r1], ['b', t1 - r1]], 4)}<b>א</b></div><div>${jar([['r', r2], ['b', t2 - r2]], 4)}<b>ב</b></div></div>`,
        widget: choice(['צנצנת א', 'צנצנת ב', 'הסיכוי שווה'], { cls: 'lalg-opts3' }), answer: ans, check: v => v === ans, tries: 1,
        hints: ['לא מספיק לספור כדורים אדומים. חשבו בכל צנצנת איזה חלק מהכדורים אדום.', `בצנצנת א ${F(r1, t1)} מהכדורים אדומים, ובצנצנת ב ${F(r2, t2)}. השוו את השברים.`],
        explain: `בצנצנת א: ${F(r1, t1)}. בצנצנת ב: ${F(r2, t2)}. במכנה משותף: ${M(`${fr(r1 * t2, t1 * t2)}`)} ו־${M(`${fr(r2 * t1, t1 * t2)}`)}, לכן ${ans === 2 ? 'הסיכוי שווה' : `הסיכוי גדול יותר בצנצנת ${ans ? 'ב' : 'א'}`}.`,
      };
    }
    const u = rnd(0, 3);
    if (u === 0) {
      const ev = pick([
        ...[0].map(() => { const s = pick([3, 4, 5, 6, 7, 8, 9, 10, 11]); return [`שסכום המספרים יהיה ${s}`, (a, b) => a + b === s, (a, b) => a + b]; }),
        ...[0].map(() => { const s = rnd(9, 11); return [`שסכום המספרים יהיה ${s} או יותר`, (a, b) => a + b >= s, (a, b) => a + b]; }),
        ['שייצא אותו מספר בשתי הקוביות', (a, b) => a === b, (a, b) => a + b],
        ['שמכפלת המספרים תהיה זוגית', (a, b) => (a * b) % 2 === 0, (a, b) => a * b],
        ...[0].map(() => { const k = rnd(1, 3); return [`שההפרש בין המספרים יהיה ${k}`, (a, b) => Math.abs(a - b) === k, (a, b) => Math.abs(a - b)]; }),
      ]);
      const ok = range(36, i => [Math.floor(i / 6) + 1, (i % 6) + 1]).filter(([a, b]) => ev[1](a, b)).length;
      return fracAns({
        prompt: `מטילים שתי קוביות, אדומה וכחולה. מה הסיכוי ${ev[0]}?`, visual: diceRow(), n: ok, d: 36,
        hints: [`יש ${M('6 × 6 = 36')} תוצאות אפשריות (אדומה 2 וכחולה 5 היא תוצאה אחרת מאשר אדומה 5 וכחולה 2). ציירו טבלה של 6 על 6.`, `${ok} תוצאות מתאימות.`],
        explain: `${ok} תוצאות מתוך 36: ${frx(ok, 36)}.${diceGrid(ev[2], ev[1])}`,
      });
    }
    if (u === 1) {
      const n = pick([2, 3]), outs = range(2 ** n, i => range(n, j => ((i >> j) & 1 ? 'פ' : 'ע')).join(''));
      const ev = pick(n === 2
        ? [['שייצא עץ בדיוק פעם אחת', o => o.split('ע').length - 1 === 1], ['ששני המטבעות יראו עץ', o => o === 'עע'], ['ששני המטבעות יראו אותו צד', o => o[0] === o[1]]]
        : [['שייצא עץ לפחות פעם אחת', o => o.includes('ע')], ['שייצא עץ בדיוק פעמיים', o => o.split('ע').length - 1 === 2], ['שכל המטבעות יראו אותו צד', o => new Set(o).size === 1], ['שייצא פלי בדיוק פעם אחת', o => o.split('פ').length - 1 === 1]]);
      const ok = outs.filter(ev[1]);
      return fracAns({
        prompt: `מטילים ${n === 2 ? 'שני מטבעות' : 'שלושה מטבעות'}. בכל מטבע יכול לצאת עץ או פלי. מה הסיכוי ${ev[0]}?`, n: ok.length, d: outs.length,
        hints: [`רשמו את כל התוצאות. יש ${M(n === 2 ? '2 × 2 = 4' : '2 × 2 × 2 = 8')} תוצאות, למשל ${outs.slice(0, 2).map(o => `"${o.split('').map(c => (c === 'ע' ? 'עץ' : 'פלי')).join('־')}"`).join(', ')}...`, `${ok.length} תוצאות מתאימות.`],
        explain: `התוצאות המתאימות: ${ok.map(o => o.split('').map(c => (c === 'ע' ? 'עץ' : 'פלי')).join('־')).join(', ')}. ${ok.length} מתוך ${outs.length}: ${frx(ok.length, outs.length)}.`,
      });
    }
    if (u === 2) {
      const r = rnd(2, 5), b = rnd(2, 5), T = r + b;
      return fracAns({
        prompt: `בצנצנת ${r} כדורים אדומים ו־${b} כחולים. מוציאים כדור, <b>לא מחזירים אותו</b>, ומוציאים עוד כדור. מה הסיכוי ששני הכדורים אדומים?`, visual: jar([['r', r], ['b', b]]), n: r * (r - 1), d: T * (T - 1),
        hints: [`הסיכוי שהראשון אדום הוא ${F(r, T)}. אם הוא באמת אדום, כמה כדורים, וכמה אדומים, נשארים?`, `אחרי זה נשארים ${T - 1} כדורים ו־${r - 1} אדומים. כופלים את שני הסיכויים.`],
        explain: (() => { const N = r * (r - 1), D = T * (T - 1), g = gcd(N, D); return M(`${fr(r, T)} × ${fr(r - 1, T - 1)} = ${fr(N, D)}${g > 1 ? ` = ${fr(N / g, D / g)}` : ''}`); })(),
      });
    }
    const r = rnd(2, 6), k = rnd(3, 5), b = rnd(1, (k - 1) * r - 1), add = k * r - r - b;
    return one({
      prompt: `בצנצנת ${r} כדורים אדומים ו־${b} כחולים. כמה כדורים כחולים צריך להוסיף, כדי שהסיכוי להוציא כדור אדום יהיה ${F(1, k)}?`, visual: jar([['r', r], ['b', b]]), answer: add,
      hints: [`אם הסיכוי לאדום הוא ${F(1, k)}, כמה כדורים צריכים להיות בצנצנת בסך הכול?`, `צריך ${M(`${r} × ${k} = ${k * r}`)} כדורים בסך הכול.`],
      explain: `סך הכול ${k * r} כדורים, מהם ${r} אדומים, לכן ${k * r - r} כחולים. עכשיו יש ${b}, אז מוסיפים ${M(`${k * r - r} − ${b} = ${add}`)}.`,
    });
  },
};

// ---------- 8. how many ways? ----------
const TC = ['x', 'y', 'b', 'p', 'r'];
const tubesRow = n => range(n, i => `<svg viewBox="-12 -39 24 39" class="lalg-ico">${tubeSVG(0, 0, TC[i])}</svg>`).join('');
const chips = (n, cls) => range(n, i => `<i class="lalg-chip ${cls} c${i}"></i>`).join('');
const optRows = rows => `<div class="lalg-orows">${rows.map(([lab, html]) => `<div><b>${lab}</b><span>${html}</span></div>`).join('')}</div>`;
const digitCards = ds => `<div class="lalg-cards big" dir="ltr">${ds.map(d => `<span>${d}</span>`).join('')}</div>`;
const threeDigit = (ds, pred = () => true) => {
  let c = 0;
  for (const a of ds) for (const b of ds) for (const e of ds) if (a !== 0 && a !== b && a !== e && b !== e && pred(100 * a + 10 * b + e)) c++;
  return c;
};
function pathGrid(a, b, counts = false) {
  const u = 40;
  let s = `<svg viewBox="-24 -24 ${a * u + 48} ${b * u + 48}" class="lalg-pg" style="max-width:${a * u + 70}px">`;
  for (let i = 0; i <= a; i++) s += `<line x1="${i * u}" y1="0" x2="${i * u}" y2="${b * u}" class="lalg-gl"/>`;
  for (let j = 0; j <= b; j++) s += `<line x1="0" y1="${j * u}" x2="${a * u}" y2="${j * u}" class="lalg-gl"/>`;
  if (counts)
    for (let i = 0; i <= a; i++) for (let j = 0; j <= b; j++) s += `<circle cx="${i * u}" cy="${(b - j) * u}" r="12" class="lalg-pc"/><text x="${i * u}" y="${(b - j) * u + 5}" class="lalg-pt">${choose(i + j, i)}</text>`;
  else s += `<circle cx="0" cy="${b * u}" r="9" class="lalg-ps"/><circle cx="${a * u}" cy="0" r="9" class="lalg-pe"/>`;
  return s + '</svg>';
}
const count = {
  id: 'lalg-count', title: 'כמה אפשרויות יש?',
  intro: `<p><b>עיקרון הכפל:</b> אם בשלב הראשון יש 3 אפשרויות, ולכל אחת מהן יש 4 אפשרויות בשלב השני, אז יש ${M('3 × 4 = 12')} אפשרויות בסך הכול.</p>
    <div class="ex">3 צבעי מבחנות ו־4 צבעי פקקים: ${M('3 × 4 = 12')} מבחנות שונות.<br>3 מבחנות שונות בשורה: למקום הראשון 3 אפשרויות, לשני 2, לשלישי 1. ${M('3 × 2 × 1 = 6')} סדרים.</div>
    <p>שימו לב אם הסדר חשוב (ראש צוות וסגן) או לא (זוג חוקרים), ואם מותר לחזור על אותו דבר.</p>`,
  gen(L) {
    const t = rnd(0, 3);
    if (L === 1) {
      if (t === 0) {
        const a = rnd(2, 5), b = rnd(2, 4);
        return one({
          prompt: `יש מבחנות ב־${a} צבעים ופקקים ב־${b} צבעים. בוחרים מבחנה אחת ופקק אחד. כמה צירופים שונים אפשר להרכיב?`,
          visual: optRows([['מבחנות:', tubesRow(a)], ['פקקים:', chips(b, 'sq')]]), answer: a * b,
          hints: ['לכל מבחנה אפשר להתאים כל אחד מהפקקים.', `לכל אחת מ־${a} המבחנות יש ${b} פקקים: ${M(`${a} × ${b}`)}.`], explain: M(`${a} × ${b} = ${a * b}`),
        });
      }
      if (t === 1) {
        const a = rnd(2, 4), b = rnd(2, 3), c = rnd(2, 3);
        return one({
          prompt: `לחוקרת יש ${a} חלוקים, ${b} זוגות משקפי מגן ו־${c} זוגות כפפות. היא לובשת חלוק אחד, משקפיים אחד וכפפות אחד. כמה לבושים שונים אפשריים?`,
          visual: optRows([['חלוקים:', chips(a, 'coat')], ['משקפיים:', chips(b, 'gl')], ['כפפות:', chips(c, 'sq')]]), answer: a * b * c,
          hints: ['עיקרון הכפל עובד גם עם שלושה שלבים.', `${M(`${a} × ${b} × ${c}`)}`], explain: M(`${a} × ${b} × ${c} = ${a * b * c}`),
        });
      }
      if (t === 2) {
        const k = rnd(3, 6);
        return one({
          prompt: `לארון המעבדה יש מנעול עם קוד של 2 ספרות. כל ספרה יכולה להיות ${range(k, i => i + 1).join(', ')}, ומותר שהספרות יחזרו (למשל 11). כמה קודים אפשריים?`,
          answer: k * k, hints: [`לספרה הראשונה ${k} אפשרויות. וכמה לשנייה?`, `גם לשנייה ${k} אפשרויות: ${M(`${k} × ${k}`)}.`], explain: M(`${k} × ${k} = ${k * k}`),
        });
      }
      const a = rnd(2, 5), b = rnd(2, 5);
      return one({
        prompt: `במזנון של המעבדה ${a} סוגי כריכים ו־${b} סוגי שתייה. ארוחה היא כריך אחד ושתייה אחת. כמה ארוחות שונות אפשר להרכיב?`,
        answer: a * b, hints: ['לכל כריך אפשר לבחור כל אחת מהשתיות.', M(`${a} × ${b}`)], explain: M(`${a} × ${b} = ${a * b}`),
      });
    }
    if (L === 2) {
      if (t === 0) {
        const n = rnd(3, 5);
        return one({
          prompt: `בכמה סדרים שונים אפשר להעמיד ${n} מבחנות בצבעים שונים בשורה?`, visual: optRows([['', tubesRow(n)]]), answer: fact(n),
          hints: [`למקום הראשון יש ${n} אפשרויות. כמה נשארות למקום השני?`, M(range(n, i => n - i).join(' × '))], explain: M(`${range(n, i => n - i).join(' × ')} = ${fact(n)}`),
        });
      }
      if (t === 1) {
        const k = rnd(4, 6), ds = shuffle(range(9, i => i + 1)).slice(0, k).sort((p, q) => p - q);
        return one({
          prompt: `כמה מספרים תלת־ספרתיים אפשר לבנות מהספרות שבכרטיסים, אם כל ספרה מופיעה במספר פעם אחת לכל היותר?`, visual: digitCards(ds), answer: k * (k - 1) * (k - 2),
          hints: [`לספרת המאות ${k} אפשרויות. כמה נשארות לספרת העשרות?`, M(`${k} × ${k - 1} × ${k - 2}`)], explain: M(`${k} × ${k - 1} × ${k - 2} = ${k * (k - 1) * (k - 2)}`),
        });
      }
      const n = rnd(4, 9), ordered = t === 3;
      return one({
        prompt: ordered ? `בצוות ${n} חוקרים. בוחרים מהם ראש צוות וסגן (שני אנשים שונים). כמה אפשרויות יש?` : `בצוות ${n} חוקרים. בוחרים מהם זוג שיעבוד יחד על ניסוי. כמה זוגות שונים אפשר לבחור?`,
        answer: ordered ? n * (n - 1) : (n * (n - 1)) / 2,
        hints: [`לבחירה הראשונה ${n} אפשרויות, ולשנייה ${n - 1}.`, ordered ? 'כאן הסדר חשוב: דנה ראש צוות ויואב סגן זה לא כמו יואב ראש צוות ודנה סגנית.' : `אבל בזוג הסדר לא חשוב: "דנה ויואב" זה אותו זוג כמו "יואב ודנה", אז ${M(`${n} × ${n - 1}`)} סופר כל זוג פעמיים.`],
        explain: ordered ? M(`${n} × ${n - 1} = ${n * (n - 1)}`) : M(`${n} × ${n - 1} ÷ 2 = ${(n * (n - 1)) / 2}`),
      });
    }
    const u = rnd(0, 5);
    if (u === 0 || u === 1) {
      const zero = u === 0 || Math.random() < 0.5, ds = [...(zero ? [0] : []), ...shuffle(range(9, i => i + 1)).slice(0, zero ? 3 : 4)].sort((p, q) => p - q);
      const even = u === 1, c = threeDigit(ds, even ? v => v % 2 === 0 : undefined);
      if (!c) return count.gen(L);
      return one({
        prompt: `כמה מספרים תלת־ספרתיים${even ? ' <b>זוגיים</b>' : ''} אפשר לבנות מהספרות שבכרטיסים, אם כל ספרה מופיעה פעם אחת לכל היותר?`, visual: digitCards(ds), answer: c,
        hints: [even ? `מספר זוגי נגמר בספרה זוגית. התחילו מספרת האחדות${zero ? ', ושימו לב לאפס' : ''}.` : 'מספר לא יכול להתחיל ב־0. התחילו מספרת המאות.', even && zero ? 'חלקו למקרים: מספרים שנגמרים ב־0, ומספרים שנגמרים בספרה זוגית אחרת.' : zero ? `לספרת המאות ${ds.length - 1} אפשרויות (כל ספרה חוץ מ־0). כמה לעשרות?` : 'בחרו קודם את ספרת האחדות מבין הספרות הזוגיות, ואחר כך את השאר.'],
        explain: even
          ? `${ds.filter(e => e % 2 === 0).map(e => { const hh = ds.filter(d => d !== e && d !== 0).length; return `נגמרים ב־${e}: ${M(`${hh} × ${ds.length - 2} = ${hh * (ds.length - 2)}`)}`; }).join('<br>')}<br>(לספרת המאות אסור 0, ולעשרות נשארות ${ds.length - 2} ספרות.) יחד: ${c}.`
          : `לספרת המאות ${ds.length - 1} אפשרויות (בלי 0), לעשרות ${ds.length - 1} (עכשיו מותר 0), ולאחדות ${ds.length - 2}: ${M(`${ds.length - 1} × ${ds.length - 1} × ${ds.length - 2} = ${c}`)}.`,
      });
    }
    if (u === 2) {
      const n = rnd(5, 8);
      return one({
        prompt: `ב־${n} מבחנות יש תמיסות שונות. בוחרים 3 מבחנות לניסוי (הסדר לא חשוב). כמה בחירות שונות יש?`, answer: choose(n, 3),
        hints: [`אם הסדר היה חשוב: ${M(`${n} × ${n - 1} × ${n - 2} = ${n * (n - 1) * (n - 2)}`)}. אבל כל שלישייה נספרה כאן כמה פעמים?`, `כל שלישייה נספרה 6 פעמים, כי אפשר לסדר 3 מבחנות ב־${M('3 × 2 × 1 = 6')} סדרים.`],
        explain: M(`${n * (n - 1) * (n - 2)} ÷ 6 = ${choose(n, 3)}`),
      });
    }
    if (u === 3) {
      const a = rnd(2, 4), b = rnd(2, 3);
      return one({
        prompt: `רובוט המעבדה נע על הקווים מהנקודה הירוקה לנקודה האדומה. בכל צעד הוא זז ימינה או למעלה בלבד. כמה מסלולים שונים יש?`, visual: pathGrid(a, b), answer: choose(a + b, a),
        hints: ['כתבו ליד כל נקודה בכמה דרכים אפשר להגיע אליה. לנקודות בשורה התחתונה ובטור השמאלי יש רק דרך אחת.', 'לכל נקודה אחרת מגיעים משמאל או מלמטה, אז המספר שלה הוא סכום שני המספרים האלה.'],
        explain: `${choose(a + b, a)} מסלולים:${pathGrid(a, b, true)}`,
      });
    }
    if (u === 4) {
      const k = rnd(3, 6);
      return one({
        prompt: `קוד של 3 ספרות, וכל ספרה היא אחת מ־${range(k, i => i + 1).join(', ')}. בכמה קודים יש ספרה שמופיעה יותר מפעם אחת?`, answer: k ** 3 - k * (k - 1) * (k - 2),
        hints: ['קל יותר לספור את ההפך: כמה קודים יש בסך הכול, וכמה מהם עם שלוש ספרות שונות?', `בסך הכול ${M(`${k}³ = ${k ** 3}`)}. עם ספרות שונות: ${M(`${k} × ${k - 1} × ${k - 2} = ${k * (k - 1) * (k - 2)}`)}.`],
        explain: M(`${k ** 3} − ${k * (k - 1) * (k - 2)} = ${k ** 3 - k * (k - 1) * (k - 2)}`),
      });
    }
    const n = rnd(4, 5);
    return one({
      prompt: `מעמידים ${n} מבחנות שונות בשורה, אבל המבחנה הירוקה והמבחנה הכתומה חייבות לעמוד זו ליד זו. בכמה סדרים אפשר להעמיד אותן?`, visual: optRows([['', tubesRow(n)]]), answer: 2 * fact(n - 1),
      hints: [`"הדביקו" את הירוקה והכתומה לחבילה אחת. עכשיו מסדרים ${n - 1} דברים.`, `${M(`${range(n - 1, i => n - 1 - i).join(' × ')} = ${fact(n - 1)}`)} סדרים, ובתוך החבילה אפשר להחליף את שתיהן.`],
      explain: M(`${fact(n - 1)} × 2 = ${2 * fact(n - 1)}`),
    });
  },
};

// ---------- 9. boss ----------
const boss = {
  id: 'lalg-boss', title: 'בוס: החשבונאי איקס',
  intro: `<p>החשבונאי איקס הסתתר במעבדה, וכל דבר אצלו הוא נעלם: הוא נעל את הדלת בחידות שמערבבות משוואות, נוסחאות, ממוצעים, הסתברות וספירה.</p>
    <p>הדרך לנצח אותו: לסמן את מה שלא יודעים ב־${X}, לכתוב משוואה, ולפתור אותה שלב אחרי שלב. בסוף, תמיד בודקים.</p>`,
  gen(L) {
    const t = rnd(0, 4);
    if (L === 1) {
      if (t === 0) {
        const k = rnd(2, 6), m = rnd(1, 15), x = rnd(2, 15), V = k * x + m;
        return one({
          prompt: `החשבונאי איקס חשב על מספר. הוא הכפיל אותו ב־${k}, הוסיף ${m}, וקיבל ${V}. מה המספר?`, answer: x, pre: `${X} = `,
          hints: [`כתבו משוואה: ${A(`${k}x + ${m} = ${V}`)}.`, A(`${k}x = ${V - m}`)], explain: steps([A(`${k}x + ${m} = ${V}`), A(`${k}x = ${V - m}`), A(`x = ${x}`)]),
        });
      }
      if (t === 1) {
        const n = rnd(3, 4), m = rnd(10, 25), v = spread(n, m, 6), miss = v.pop();
        return one({
          prompt: `החשבונאי מחק תוצאה אחת מהטבלה. הממוצע של ${n} התוצאות היה ${m}. מה התוצאה שנמחקה?`, visual: dataRow([...v, '?']), answer: miss,
          hints: [`סכום כל התוצאות: ${M(`${n} × ${m}`)}.`, `${M(`${n * m} − ${sum(v)}`)}`], explain: M(`${n} × ${m} − ${sum(v)} = ${n * m} − ${sum(v)} = ${miss}`),
        });
      }
      if (t === 2) {
        const r = rnd(4, 8), b = rnd(2, 6), q = rnd(1, r - 1);
        return fracAns({
          prompt: `בצנצנת ${r} כדורים אדומים ו־${b} כחולים. החשבונאי הוציא ${q === 1 ? 'כדור אדום אחד ולקח אותו' : `${q} כדורים אדומים ולקח אותם`}. עכשיו מוציאים כדור אחד בלי להסתכל. מה הסיכוי שהוא אדום?`,
          visual: jar([['r', r], ['b', b]]), n: r - q, d: r + b - q,
          hints: ['כמה כדורים, וכמה אדומים, נשארו בצנצנת?', `נשארו ${r + b - q} כדורים, ומהם ${r - q} אדומים.`], explain: `${r - q} מתוך ${r + b - q}: ${frx(r - q, r + b - q)}.`,
        });
      }
      if (t === 3) {
        const a = rnd(3, 15), b = rnd(2, 12), P = 2 * a + 2 * b;
        return one({
          prompt: `היקף מלבן: ${A('P = 2a + 2b')}. היקף המלבן ${P} ס״מ, והצלע ${A(`a = ${a}`)}. מה ${A('b')}?`, answer: b, pre: `${it('b')} = `,
          hints: [`הציבו: ${A(`${P} = 2 × ${a} + 2b`)}.`, A(`${P} = ${2 * a} + 2b`)], explain: steps([A(`${P} = ${2 * a} + 2b`), A(`2b = ${P - 2 * a}`), A(`b = ${b}`)]),
        });
      }
      const k = rnd(2, 5), d = pick([3, 4]);
      return one({
        prompt: `למנעול של החשבונאי קוד של ${d === 3 ? '3' : '4'} ספרות, וכל ספרה היא אחת מ־${range(k, i => i + 1).join(', ')} (מותר לחזור על ספרות). כמה קודים אפשריים?`, answer: k ** d,
        hints: [`לכל ספרה ${k} אפשרויות.`, M(range(d, () => k).join(' × '))], explain: M(`${range(d, () => k).join(' × ')} = ${k ** d}`),
      });
    }
    if (L === 2) {
      if (t === 0) {
        let x, p;
        do [x, p] = [rnd(3, 20), rnd(1, 12)]; while ((4 * x + p) % 3);
        const Mn = (4 * x + p) / 3;
        return one({
          prompt: `הממוצע של שלוש המדידות ${A('x')}, ${A(`x + ${p}`)} ו־${A('2x')} הוא ${Mn}. מה ${X}?`, answer: x, pre: `${X} = `,
          hints: [`הסכום של שלוש המדידות הוא ${M(`3 × ${Mn} = ${3 * Mn}`)}.`, `${A(`x + x + ${p} + 2x = ${3 * Mn}`)}, כלומר ${A(`4x + ${p} = ${3 * Mn}`)}.`],
          explain: steps([A(`4x + ${p} = ${3 * Mn}`), A(`4x = ${3 * Mn - p}`), A(`x = ${x}`)]),
        });
      }
      if (t === 1) {
        const [a, b] = pick([[1, 3], [2, 5], [3, 4], [1, 4], [2, 3], [3, 5], [3, 8], [5, 6]]), k = rnd(2, 6), T = b * k;
        return one({
          prompt: `בצנצנת ${T} כדורים, אדומים וכחולים. הסיכוי להוציא כדור אדום הוא ${F(a, b)}. כמה כדורים כחולים יש בצנצנת?`, answer: T - a * k,
          hints: [`${F(a, b)} מהכדורים אדומים. כמה זה ${F(1, b)} מ־${T}?`, `${F(1, b)} מ־${T} הוא ${k}, אז יש ${a * k} אדומים.`], explain: `אדומים: ${M(`${T} ÷ ${b} × ${a} = ${a * k}`)}. כחולים: ${M(`${T} − ${a * k} = ${T - a * k}`)}.`,
        });
      }
      if (t === 2) {
        const a1 = rnd(2, 15), d = rnd(3, 9), P = rnd(12, 40), V = a1 + d * (P - 1);
        return one({
          prompt: `החשבונאי מסדר מבחנות בשורות: ${range(4, i => a1 + d * i).join(', ')}, ... באיזו שורה יהיו בדיוק ${V} מבחנות?`, answer: P,
          hints: [`הכלל: ${A(linRule(a1, d))}.`, `פתרו: ${A(`${linRule(a1, d)} = ${V}`)}.`], explain: `${A(`${linRule(a1, d)} = ${V}`)}, ולכן ${A(`n = ${P}`)}.`,
        });
      }
      if (t === 3) {
        const x = rnd(3, 20), k = rnd(2, 9), P = 4 * x + 2 * k;
        return one({
          prompt: `הצלעות של מלבן הן ${A('x')} ו־${A(`x + ${k}`)} ס״מ, וההיקף שלו ${P} ס״מ. מה ${X}?`, answer: x, pre: `${X} = `,
          hints: [`ההיקף: ${A(`x + x + ${k} + x + x + ${k}`)}.`, A(`4x + ${2 * k} = ${P}`)], explain: steps([A(`4x + ${2 * k} = ${P}`), A(`4x = ${P - 2 * k}`), A(`x = ${x}`)]),
        });
      }
      const k = rnd(4, 6), N = k * (k - 1) * (k - 2);
      return fracAns({
        prompt: `הקוד של החשבונאי הוא 3 ספרות <b>שונות</b> מבין ${range(k, i => i + 1).join(', ')}. מנחשים קוד אחד באקראי. מה הסיכוי לנחש נכון?`, n: 1, d: N,
        hints: ['קודם ספרו כמה קודים אפשריים יש.', `יש ${M(`${k} × ${k - 1} × ${k - 2} = ${N}`)} קודים, ורק אחד נכון.`], explain: `קוד אחד מתוך ${N}: ${F(1, N)}.`,
      });
    }
    const u = rnd(0, 5);
    if (u === 0) {
      const k = rnd(2, 6);
      return one({
        prompt: `בצנצנת כדורים אדומים וכחולים, והסיכוי להוציא אדום הוא ${F(1, 3)}. החשבונאי הוסיף ${k} כדורים אדומים, ועכשיו הסיכוי הוא ${F(1, 2)}. כמה כדורים היו בצנצנת בהתחלה?`, answer: 3 * k,
        hints: [`נסמן ב־${X} את מספר האדומים בהתחלה. אז בהתחלה היו ${A('3x')} כדורים, ומהם ${A('2x')} כחולים.`, `אחרי ההוספה: ${A(`x + ${k}`)} אדומים ו־${A('2x')} כחולים, ובחצי מהכדורים אדומים, כלומר ${A(`x + ${k} = 2x`)}.`],
        explain: `${A(`x + ${k} = 2x`)}, ולכן ${A(`x = ${k}`)}. בהתחלה: ${k} אדומים ו־${2 * k} כחולים, כלומר ${3 * k} כדורים.`,
      });
    }
    if (u === 1) {
      const a1 = rnd(1, 10), d2 = rnd(1, 5), d1 = d2 + rnd(1, 4), P = rnd(4, 15), b1 = a1 + (d1 - d2) * (P - 1);
      const A1 = range(4, i => a1 + d1 * i), B1 = range(4, i => b1 + d2 * i);
      return one({
        prompt: 'בשתי מבחנות גדלות מושבות של חיידקים, וכל יום סופרים אותן. באיזה יום יהיה אותו מספר חיידקים בשתי המבחנות?',
        visual: `<table class="lalg-tbl" dir="ltr"><tr><th>יום</th>${range(4, i => `<td>${i + 1}</td>`).join('')}<td>…</td></tr><tr><th>א</th>${A1.map(v => `<td>${v}</td>`).join('')}<td>…</td></tr><tr><th>ב</th>${B1.map(v => `<td>${v}</td>`).join('')}<td>…</td></tr></table>`, answer: P,
        hints: [`בכל יום א גדלה ב־${d1} ו־ב גדלה ב־${d2}. אז הפער ביניהן קטן ב־${d1 - d2} בכל יום.`, `ביום 1 הפער הוא ${b1 - a1}. אחרי כמה ימים הוא ייסגר?`],
        explain: `הפער ${b1 - a1} נסגר אחרי ${M(`${b1 - a1} ÷ ${d1 - d2} = ${P - 1}`)} ימים, כלומר ביום ${P}. אז בשתיהן ${a1 + d1 * (P - 1)}.`,
      });
    }
    if (u === 2) {
      const s = rnd(8, 11), ok = range(36, i => [Math.floor(i / 6) + 1, (i % 6) + 1]).filter(([a, b]) => a + b >= s).length;
      return fracAns({
        prompt: `כדי לפתוח את הדלת צריך להטיל שתי קוביות ולקבל סכום של ${s} לפחות. מה הסיכוי להצליח בהטלה אחת?`, n: ok, d: 36,
        hints: ['יש 36 תוצאות אפשריות. ספרו את אלה שהסכום שלהן מספיק גדול.', `${ok} תוצאות מתאימות.`],
        explain: `${ok} מתוך 36: ${frx(ok, 36)}.${diceGrid((a, b) => a + b, (a, b) => a + b >= s)}`,
      });
    }
    if (u === 3) {
      let a, b, c, x;
      do [a, b, c, x] = [rnd(2, 6), rnd(1, 20), rnd(2, 5), rnd(2, 15)]; while ((a * x + b) % c);
      const R = (a * x + b) / c;
      return one({
        prompt: `מספר נכנס למכונות של החשבונאי: קודם כופלים אותו ב־${a}, אחר כך מוסיפים ${b}, ובסוף מחלקים ב־${c}. יצא ${R}. איזה מספר נכנס?`, visual: machine(['?', { rule: `×${a}` }, { rule: `+${b}` }, { rule: `÷${c}` }], R), answer: x,
        hints: ['עבדו מהסוף להתחלה, עם הפעולות ההפוכות ובסדר הפוך.', `${M(`${R} × ${c} = ${R * c}`)}, ואחר כך ${M(`${R * c} − ${b} = ${R * c - b}`)}.`],
        explain: M(`(${R} × ${c} − ${b}) ÷ ${a} = ${x}`),
      });
    }
    if (u === 4) {
      const n = pick([4, 5]), odd = n === 4, E2 = 2 * rnd(6, 30), list = odd ? [E2 - 3, E2 - 1, E2 + 1, E2 + 3] : [E2 - 4, E2 - 2, E2, E2 + 2, E2 + 4];
      return one({
        prompt: `על הלוח ${n} מספרים ${odd ? 'אי־זוגיים' : 'זוגיים'} עוקבים, והממוצע שלהם ${E2}. מה הקטן מביניהם?`, answer: list[0],
        hints: [`נסמן את הקטן ב־${X}. המספרים הם ${A(range(n, i => (i ? `x + ${2 * i}` : 'x')).join(', '))}.`, `הסכום ${A(`${n}x + ${n * (n - 1)}`)} שווה ${M(`${n} × ${E2} = ${n * E2}`)}.`],
        explain: `${A(`${n}x + ${n * (n - 1)} = ${n * E2}`)}, ולכן ${A(`x = ${list[0]}`)}. המספרים: ${list.join(', ')}.`,
      });
    }
    const x = rnd(5, 20), k = 4 * rnd(1, 4), m = (4 * x + k) / 4;
    return one({
      prompt: `הממוצע של 4 מדידות הוא ${m}. שלוש מהן שוות זו לזו, והרביעית גדולה מכל אחת מהן ב־${k}. מה ערכה של אחת משלוש המדידות השוות?`, answer: x, pre: `${X} = `,
      hints: [`נסמן את המדידה החוזרת ב־${X}. הרביעית היא ${A(`x + ${k}`)}.`, `הסכום: ${A(`4x + ${k} = ${4 * m}`)}.`],
      explain: steps([A(`4x + ${k} = ${4 * m}`), A(`4x = ${4 * m - k}`), A(`x = ${x}`)]),
    });
  },
};

export default {
  id: 'lalg', name: 'מעבדת הנוסחאות', icon: '🧬', color: '#34d399', boss: 'החשבונאי איקס',
  tagline: 'על הלוח במעבדה נשארו נוסחאות עם נעלמים. פתרו אותן ותגלו מה החשבונאים מתכננים.',
  challenges: [scales, subst2, story, eq2, rule, mean, prob, count, boss],
};

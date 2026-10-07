// מעבדת התמיסות: יחס ופרופורציה (כיתה ו)
import { rnd, pick, shuffle, range, gcd, lcm, near, nf, M, F, h, showFrac } from '../../util.js';
import { inputs, box, choice } from '../../widgets.js';

// ---------- helpers ----------
const sum = a => a.reduce((s, x) => s + x, 0);
const clean = x => Math.round(x * 1e6) / 1e6;
const big = n => (Number.isInteger(n) && Math.abs(n) >= 1000 ? n.toLocaleString('en-US') : nf(n));
const R = (...v) => M(v.map(big).join(' : '));
const money = x => (near(x, Math.round(x)) ? String(Math.round(x)) : (Math.round(x * 100) / 100).toFixed(2));
const ils = x => `${money(x)} ש״ח`;
const pct = x => M(`${nf(x)}%`);
const hasCents = x => near(Math.round(x * 100), x * 100);
const parts = n => (n === 1 ? 'חלק אחד' : `${n} חלקים`);
// two different whole numbers with no common factor
const coprime = (max, min = 1) => {
  let p, q;
  do {
    p = rnd(min, max);
    q = rnd(min, max);
  } while (p === q || gcd(p, q) > 1);
  return [p, q];
};

// Labelled number answers: fields = [[label, answer, unit]]. Decimals are always allowed when dec is set.
const fieldsRound = ({ prompt, visual, fields, hints, explain, tries, wrongMsg, dec = false }) => ({
  prompt, visual, hints, explain, tries, wrongMsg,
  widget: inputs(fields.map(([label, a, unit = ''], i) => {
    const b = box('f' + i, Math.max(3, nf(a).length + 1), false, dec || !Number.isInteger(a) ? 'd' : '');
    return `<div class="ans-line">${label ? label + ' ' : ''}${unit === '%' ? M(`${b}%`) : b + (unit ? ' ' + unit : '')}</div>`;
  }).join('')),
  answer: Object.fromEntries(fields.map(([, a], i) => ['f' + i, a])),
  check: v => fields.every(([, a], i) => near(v['f' + i], a)),
});
const wrong = (v, a) => v && near(v.f0, a);

// ---------- colours, test tubes and the ratio input ----------
const COL = [
  { n: 'כחול', h: 'הכחול', l: 'לכחול', f: 'כחולות', s: 'כחולה', c: 'lratio-cb' },
  { n: 'צהוב', h: 'הצהוב', l: 'לצהוב', f: 'צהובות', s: 'צהובה', c: 'lratio-cy' },
  { n: 'אדום', h: 'האדום', l: 'לאדום', f: 'אדומות', s: 'אדומה', c: 'lratio-cr' },
  { n: 'ירוק', h: 'הירוק', l: 'לירוק', f: 'ירוקות', s: 'ירוקה', c: 'lratio-cg' },
];
const dr = (n, C) => (n === 1 ? `טיפה ${C.s} אחת` : `${n} טיפות ${C.f}`);
const andDr = (n, C) => (n === 1 ? `וטיפה ${C.s} אחת` : `ו־${n} טיפות ${C.f}`);

let uid = 0;
const TUBE = 24;
// A test tube filled with layers of equal drops, first colour at the bottom.
function tubeSVG(counts, cols, max = TUBE) {
  const H = 200, u = H / max, id = `lratio-clip${++uid}`, bottom = H + 24;
  let s = `<svg viewBox="0 0 76 ${H + 30}" class="lratio-tsvg" style="width:80px">` +
    `<defs><clipPath id="${id}"><rect x="16" y="14" width="44" height="${H + 10}" rx="13"/></clipPath></defs>` +
    `<rect x="16" y="14" width="44" height="${H + 10}" rx="13" class="lratio-glass"/><g clip-path="url(#${id})">`;
  let k = 0;
  counts.forEach((n, i) => {
    for (let j = 0; j < n; j++, k++) s += `<rect x="16" y="${(bottom - (k + 1) * u).toFixed(2)}" width="44" height="${u.toFixed(2)}" class="lratio-u ${cols[i].c}"/>`;
  });
  s += `</g><rect x="16" y="14" width="44" height="${H + 10}" rx="13" class="lratio-glassline"/><rect x="9" y="6" width="58" height="11" rx="5.5" class="lratio-rim"/>`;
  return s + '</svg>';
}
const tubePic = (counts, cols) =>
  `<div class="lratio-tube">${tubeSVG(counts, cols, Math.max(12, sum(counts) + 2))}<div class="lratio-ctls">${cols.map(c => `<span class="lratio-chip ${c.c}">${c.n}</span>`).join('')}</div></div>`;

// The player adds and removes drops of each colour. fixed drops are already in the tube and cannot be removed.
function tubeW({ cols, fixed = cols.map(() => 0), add = cols.map(() => true), max = TUBE }) {
  const cnt = [...fixed], nums = [];
  let locked = false;
  const pic = h('div', { class: 'lratio-tpic' }), full = h('div', { class: 'lratio-full' });
  const draw = () => {
    pic.innerHTML = tubeSVG(cnt, cols, max);
    cnt.forEach((v, i) => (nums[i].textContent = String(v)));
  };
  const rows = cols.map((c, i) => {
    const n = h('b', {}, '0');
    nums.push(n);
    const chip = h('span', { class: `lratio-chip ${c.c}` }, c.n, ' ', n);
    if (!add[i]) return h('div', { class: 'lratio-ctl' }, chip);
    const step = by => () => {
      if (locked) return;
      full.textContent = '';
      if (by > 0 && sum(cnt) >= max) return (full.textContent = 'המבחנה מלאה.');
      cnt[i] = Math.max(fixed[i], cnt[i] + by);
      draw();
    };
    return h('div', { class: 'lratio-ctl' },
      h('button', { type: 'button', class: 'round', 'aria-label': `טיפה ${c.s} פחות`, onclick: step(-1) }, '−'), chip,
      h('button', { type: 'button', class: 'round', 'aria-label': `עוד טיפה ${c.s}`, onclick: step(1) }, '+'));
  });
  draw();
  return {
    el: h('div', { class: 'lratio-tube' }, pic, h('div', { class: 'lratio-ctls' }, rows, full)),
    value: () => (sum(cnt) === sum(fixed) ? null : [...cnt]),
    set(a) {
      a.forEach((v, i) => (cnt[i] = v));
      draw();
    },
    lock() {
      locked = true;
    },
  };
}

// a : b (: c) with a small caption over each box
const ratioIn = labels =>
  inputs(`<div class="lratio-rin" dir="ltr">${labels.map((l, i) => `<span class="lratio-rc"><small>${l}</small>${box('abc'[i], 2)}</span>`).join('<b class="lratio-colon">:</b>')}</div>`);
// accepts only the fully reduced ratio equal to target
const reducedOf = target => v => {
  const keys = target.map((_, i) => 'abc'[i]), vals = keys.map(k => v[k]);
  if (vals.some(x => !(x > 0) || !Number.isInteger(x))) return false;
  return vals.every((x, i) => x * target[0] === vals[0] * target[i]) && vals.reduce(gcd) === 1;
};
const sameRatio = (v, target) => target.every((t, i) => v['abc'[i]] * target[0] === v.a * t) && v.a > 0;

// ---------- 1. ratio in a test tube ----------
const tube = {
  id: 'lratio-tube', title: 'יחס במבחנה',
  intro: `<p><b>יחס</b> משווה בין שתי כמויות. יחס של ${R(2, 3)} בין כחול לצהוב אומר: על כל 2 טיפות כחולות יש 3 טיפות צהובות.</p>
    <div class="ex">במבחנה 6 טיפות כחולות ו־9 צהובות. היחס הוא ${R(6, 9)}. מחלקים את שני המספרים ב־3 ומקבלים יחס מצומצם: ${R(2, 3)}.</div>
    <p>כמו בשברים, כופלים או מחלקים את כל המספרים ביחס באותו מספר, והיחס לא משתנה. הסדר חשוב: הכמות שנאמרת ראשונה נכתבת ראשונה.</p>
    <p>במבחנה: לחצו על + ועל − כדי להוסיף או להוציא טיפות מכל צבע.</p>`,
  gen(L) {
    const t = rnd(0, 1);
    if (L === 1 && t === 0) {
      const [A, B] = shuffle(COL);
      let p, q, g;
      do {
        [p, q] = coprime(5);
        g = pick([1, 2, 2, 3, 3, 4]);
      } while ((p + q) * g > 18 || Math.min(p, q) * g < 2);
      const a = p * g, b = q * g;
      return {
        prompt: `ספרו את הטיפות במבחנה. מה היחס בין ${A.h} ${B.l}? כתבו אותו בצורה המצומצמת ביותר.`,
        visual: tubePic([a, b], [A, B]),
        widget: ratioIn([A.n, B.n]), answer: { a: p, b: q }, check: reducedOf([a, b]),
        wrongMsg: v => (sameRatio(v, [a, b]) ? 'היחס נכון, אבל אפשר עוד לצמצם אותו.' : v.a > 0 && v.a * a === v.b * b ? `שימו לב לסדר: ${A.h} נכתב ראשון.` : ''),
        hints: ['ספרו כמה טיפות יש מכל צבע.', `יש ${a} טיפות ${A.f} ו־${b} ${B.f}, כלומר ${R(a, b)}. ${g > 1 ? `שני המספרים מתחלקים ב־${g}.` : 'אין מספר גדול מ־1 שמחלק את שניהם.'}`],
        explain: `${a} טיפות ${A.f} ו־${b} ${B.f}: ${g > 1 ? `${R(a, b)}. מחלקים את שני המספרים ב־${g} ומקבלים ${R(p, q)}.` : `${R(p, q)}, והיחס כבר מצומצם.`}`,
      };
    }
    if (L === 1) {
      const [A, B] = shuffle(COL);
      let p, q, k;
      do {
        [p, q] = coprime(5);
        k = rnd(2, 4);
      } while ((p + q) * k > 20);
      const w = rnd(0, 1), C = w ? B : A, given = (w ? q : p) * k, fin = [p * k, q * k];
      return {
        prompt: `בנו במבחנה תערובת שבה היחס בין ${A.h} ${B.l} הוא ${R(p, q)}, ויש בה ${dr(given, C)}.`,
        widget: tubeW({ cols: [A, B] }), answer: fin, check: v => v[0] === fin[0] && v[1] === fin[1],
        wrongMsg: v => (v[0] * q === v[1] * p ? `היחס נכון, אבל צריך בדיוק ${dr(given, C)}.` : v[0] * p === v[1] * q ? `שימו לב לסדר: המספר הראשון ביחס שייך ל${A.n}.` : ''),
        hints: [`${R(p, q)} פירושו: על כל ${dr(p, A)} יש ${dr(q, B)}.`, `${given} הוא פי ${k} מ־${w ? q : p}. כפלו גם את הצבע השני ב־${k}.`],
        explain: `${R(p, q)} = ${R(fin[0], fin[1])} (כופלים את שני המספרים ב־${k}): ${dr(fin[0], A)} ${andDr(fin[1], B)}.`,
      };
    }
    if (L === 2) {
      const r = rnd(0, 2), [A, B, C] = shuffle(COL);
      if (r === 0) {
        let p, q, k;
        do {
          [p, q] = coprime(5);
          k = rnd(2, 4);
        } while ((p + q) * k > 22);
        const fin = [p * k, q * k], w = rnd(0, 1), o = 1 - w, start = [...fin], W = w ? B : A, O = o ? B : A;
        start[w] = rnd(1, fin[w] - 1);
        return {
          prompt: `במבחנה יש ${dr(start[0], A)} ${andDr(start[1], B)}. הוסיפו טיפות ${W.f} כך שהיחס בין ${A.h} ${B.l} יהיה ${R(p, q)}.`,
          widget: tubeW({ cols: [A, B], fixed: start, add: [w === 0, w === 1] }), answer: fin, check: v => v[0] * q === v[1] * p,
          hints: [`מספר הטיפות ה${O.f} לא משתנה: ${start[o]}. כמה טיפות ${W.f} מתאימות לו לפי היחס?`, `${start[o]} הוא פי ${k} מ־${o ? q : p}, לכן צריך ${fin[w]} טיפות ${W.f} בסך הכול. כבר יש ${start[w]}.`],
          explain: `${R(p, q)} = ${R(fin[0], fin[1])}, לכן ל־${start[o]} טיפות ${O.f} מתאימות ${fin[w]} טיפות ${W.f}. היו ${start[w]}, אז מוסיפים ${fin[w] - start[w]}.`,
        };
      }
      if (r === 1) {
        let p, q, g;
        do {
          [p, q] = coprime(5);
          g = rnd(1, 3);
        } while ((p + q) * g > 18 || Math.min(p, q) * g < 2);
        const a = p * g, b = q * g, T = a + b;
        return {
          prompt: `מה היחס בין מספר הטיפות ה${A.f} למספר <b>כל</b> הטיפות במבחנה? כתבו אותו בצורה המצומצמת ביותר.`,
          visual: tubePic([a, b], [A, B]),
          widget: ratioIn([A.n, 'הכול']), answer: { a: p, b: p + q }, check: reducedOf([a, T]),
          wrongMsg: v => (sameRatio(v, [a, b]) ? 'זה היחס בין שני הצבעים. השאלה היא על היחס לכל הטיפות יחד.' : sameRatio(v, [a, T]) ? 'היחס נכון, אבל אפשר עוד לצמצם אותו.' : ''),
          hints: ['ספרו את הטיפות מכל צבע, ואז חברו כדי לדעת כמה טיפות יש בסך הכול.', `${a} טיפות ${A.f} מתוך ${T} טיפות בסך הכול: ${R(a, T)}.`],
          explain: `${a} טיפות ${A.f} מתוך ${M(`${a} + ${b} = ${T}`)} טיפות: ${R(a, T)}${g > 1 ? ` = ${R(p, p + q)}` : ''}.`,
        };
      }
      let p, q, s, g;
      do {
        [p, q, s] = [rnd(1, 5), rnd(1, 5), rnd(1, 5)];
        g = rnd(1, 3);
      } while ([p, q, s].reduce(gcd) > 1 || (p + q + s) * g > 20 || Math.min(p, q, s) * g < 2);
      const c = [p * g, q * g, s * g];
      return {
        prompt: `מה היחס בין ${A.h}, ${B.h} ו${C.h} במבחנה? כתבו אותו בצורה המצומצמת ביותר.`,
        visual: tubePic(c, [A, B, C]),
        widget: ratioIn([A.n, B.n, C.n]), answer: { a: p, b: q, c: s }, check: reducedOf(c),
        wrongMsg: v => (sameRatio(v, c) ? 'היחס נכון, אבל אפשר עוד לצמצם אותו.' : ''),
        hints: ['ספרו כמה טיפות יש מכל צבע, וכתבו אותן לפי הסדר שבשאלה.', `${R(...c)}. ${g > 1 ? `כל שלושת המספרים מתחלקים ב־${g}.` : 'אין מספר גדול מ־1 שמחלק את שלושתם.'}`],
        explain: `${R(...c)}${g > 1 ? ` = ${R(p, q, s)} (מחלקים ב־${g})` : ', והיחס כבר מצומצם'}.`,
      };
    }
    const [A, B, C] = shuffle(COL);
    if (t === 0) {
      let p, q, r, s, m, x, y, z;
      do {
        [p, q] = coprime(5);
        [r, s] = coprime(5);
        m = lcm(q, r);
        [x, y, z] = [(p * m) / q, m, (s * m) / r];
      } while (q === r || Math.min(q, r) < 2 || x + y + z > TUBE || x + y + z < 6);
      return {
        prompt: `בנו תערובת של שלושה צבעים: היחס בין ${A.h} ${B.l} הוא ${R(p, q)}, והיחס בין ${B.h} ${C.l} הוא ${R(r, s)}. אפשר לבנות כל כמות שמתאימה לשני היחסים.`,
        widget: tubeW({ cols: [A, B, C] }), answer: [x, y, z], check: v => v[1] > 0 && v[0] * y === v[1] * x && v[2] * y === v[1] * z,
        hints: [`${B.h} מופיע בשני היחסים. הרחיבו את שני היחסים כך שמספר הטיפות ה${B.f} יהיה זהה.`, `מספר שמתחלק ב־${q} וגם ב־${r}: ${m}. ${R(p, q)} = ${R(x, m)}, ו־${R(r, s)} = ${R(m, z)}.`],
        explain: `${R(p, q)} = ${R(x, y)} ו־${R(r, s)} = ${R(y, z)}, לכן היחס בין שלושת הצבעים (${A.n} : ${B.n} : ${C.n}) הוא ${R(x, y, z)}. למשל: ${dr(x, A)}, ${dr(y, B)} ${andDr(z, C)}.`,
      };
    }
    let p, q, r, s, l, Bn, A0, A1;
    do {
      [p, q] = coprime(5);
      [r, s] = coprime(5);
      l = lcm(q, s);
      Bn = l * rnd(1, 3);
      A0 = (p * Bn) / q;
      A1 = (r * Bn) / s;
    } while (l < 2 || A0 < 2 || A1 <= A0 || A1 - A0 > 16 || Bn > 30 || A1 > 30);
    const d = A1 - A0;
    return fieldsRound({
      prompt: `במבחנה היו טיפות ${A.f} וטיפות ${B.f} ביחס ${R(p, q)}. הלבורנטית הוסיפה ${dr(d, A)}, ועכשיו היחס בין ${A.h} ${B.l} הוא ${R(r, s)}. כמה טיפות מכל צבע היו במבחנה בהתחלה?`,
      fields: [[`${A.n}:`, A0, 'טיפות'], [`${B.n}:`, Bn, 'טיפות']],
      hints: [`מספר הטיפות ה${B.f} לא השתנה, והוא מתאים לשני היחסים. לכן הוא מתחלק ב־${l}.`, `נסו ${l}, ${2 * l}, ${3 * l}... טיפות ${B.f}. בכל ניסיון חשבו כמה ${A.f} היו לפני ההוספה ואחריה, ובדקו אם ההפרש הוא ${d}.`],
      explain: `טיפות ${B.f}: ${Bn}. לפני ההוספה: ${M(`${Bn} ÷ ${q} × ${p} = ${A0}`)} טיפות ${A.f}. אחרי ההוספה: ${M(`${Bn} ÷ ${s} × ${r} = ${A1}`)}, ובאמת ${M(`${A1} − ${A0} = ${d}`)}.`,
    });
  },
};

// ---------- 2. scaling a recipe ----------
const ING = [['צבע מאכל', 'מ״ל'], ['מים', 'מ״ל'], ['מלח', 'גרם'], ['סוכר', 'גרם'], ['סודה לשתייה', 'גרם'], ['מיץ לימון', 'מ״ל'], ['חומץ', 'מ״ל']];
const POTIONS = ['שיקוי סגול', 'תמיסת בועות', 'ג׳לי זוהר', 'לבה מבעבעת', 'דיו סודי'];
const recipeTable = (name, cols, rows) =>
  `<table class="lratio-recipe"><caption>📋 ${name}</caption><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr>${rows.map(([nm, u, ...cells]) => `<tr><th>${nm} <small>(${u})</small></th>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
const forN = n => `ל־${n} מבחנות`;

const recipe = {
  id: 'lratio-recipe', title: 'מגדילים מתכון',
  intro: `<p>במתכון, כל החומרים נמצאים ביחס קבוע זה לזה. כשמכינים יותר (או פחות) מבחנות, כופלים (או מחלקים) <b>את כל הכמויות באותו מספר</b>.</p>
    <div class="ex">ל־4 מבחנות: 6 מ״ל צבע ו־10 מ״ל מים. ל־12 מבחנות (פי 3): ${M('6 × 3 = 18')} מ״ל צבע ו־${M('10 × 3 = 30')} מ״ל מים.</div>
    <p>כשאין מספר שלם מתאים, מוצאים קודם כמה צריך <b>למבחנה אחת</b>: ל־6 מבחנות לפי אותו מתכון צריך ${M('6 ÷ 4 × 6 = 9')} מ״ל צבע.</p>`,
  gen(L) {
    const name = pick(POTIONS);
    if (L === 1) {
      const B = pick([2, 3, 4, 5]), m = rnd(2, 4), down = Math.random() < 0.35, [from, to] = down ? [B * m, B] : [B, B * m];
      const ings = shuffle(ING).slice(0, 2).map(([nm, u]) => [nm, u, rnd(1, 6)]);
      return {
        prompt: `השלימו את המתכון ${forN(to)}.`,
        widget: inputs(recipeTable(name, [forN(from), forN(to)], ings.map(([nm, u, p], i) => [nm, u, p * from, box('f' + i, 3)]))),
        answer: Object.fromEntries(ings.map(([, , p], i) => ['f' + i, p * to])),
        check: v => ings.every(([, , p], i) => v['f' + i] === p * to),
        hints: down ? [`מספר המבחנות קטן פי ${m}: מ־${from} ל־${to}.`, `מחלקים כל כמות ב־${m}.`] : [`מספר המבחנות גדל פי ${m}: מ־${from} ל־${to}.`, `כופלים כל כמות ב־${m}.`],
        explain: ings.map(([nm, u, p]) => `${nm}: ${M(`${p * from} ${down ? '÷' : '×'} ${m} = ${p * to}`)} ${u}`).join('<br>'),
      };
    }
    if (L === 2) {
      let B, N;
      do {
        B = rnd(2, 6);
        N = rnd(2, 15);
      } while (N % B === 0 || B % N === 0);
      const ings = shuffle(ING).slice(0, 3).map(([nm, u], i) => [nm, u, rnd(i ? 1 : 2, 5)]);
      const per = `למבחנה אחת: ${ings.map(([nm, u, p]) => `${nm} ${p} ${u}`).join(', ')}`;
      if (Math.random() < 0.6)
        return {
          prompt: `השלימו את המתכון ${forN(N)}.`,
          widget: inputs(recipeTable(name, [forN(B), forN(N)], ings.map(([nm, u, p], i) => [nm, u, p * B, box('f' + i, 3)]))),
          answer: Object.fromEntries(ings.map(([, , p], i) => ['f' + i, p * N])),
          check: v => ings.every(([, , p], i) => v['f' + i] === p * N),
          hints: [`אין מספר שלם שכופלים בו את ${B} ומקבלים ${N}. מצאו קודם כמה צריך למבחנה אחת: מחלקים כל כמות ב־${B}.`, `${per}. עכשיו כפלו ב־${N}.`],
          explain: ings.map(([nm, u, p]) => `${nm}: ${M(`${p * B} ÷ ${B} × ${N} = ${p * N}`)} ${u}`).join('<br>'),
        };
      const [n0, u0, p0] = ings[0];
      return {
        prompt: `הלבורנטית הכינה ${name} לפי המתכון, והשתמשה ב־${p0 * N} ${u0} ${n0}. לכמה מבחנות הספיק המתכון, וכמה היא צריכה משאר החומרים?`,
        widget: inputs(recipeTable(name, [forN(B), `ל־${box('n', 3)} מבחנות`], ings.map(([nm, u, p], i) => [nm, u, p * B, i ? box('f' + i, 3) : p * N]))),
        answer: { n: N, f1: ings[1][2] * N, f2: ings[2][2] * N },
        check: v => v.n === N && v.f1 === ings[1][2] * N && v.f2 === ings[2][2] * N,
        hints: [`בדקו את ה${n0}: למבחנה אחת צריך ${M(`${p0 * B} ÷ ${B} = ${p0}`)} ${u0}. לכמה מבחנות מספיקים ${p0 * N} ${u0}?`, `${M(`${p0 * N} ÷ ${p0} = ${N}`)} מבחנות. ${per}.`],
        explain: `${n0}: ${M(`${p0 * N} ÷ ${p0} = ${N}`)} מבחנות.<br>${ings.slice(1).map(([nm, u, p]) => `${nm}: ${M(`${p} × ${N} = ${p * N}`)} ${u}`).join('<br>')}`,
      };
    }
    if (Math.random() < 0.5) {
      // the ingredient that runs out first decides
      let B, ings, Ms, Mx;
      do {
        B = pick([2, 4, 5]);
        ings = shuffle(ING).slice(0, 3).map(([nm, u]) => {
          const a = rnd(B + 1, 4 * B), per = a / B, S = Math.ceil(rnd(6, 20) * per) + rnd(0, 3);
          return [nm, u, a, per, S, Math.floor((S * B) / a + 1e-9)];
        });
        Ms = ings.map(x => x[5]);
        Mx = Math.min(...Ms);
      } while (Ms.filter(x => x === Mx).length > 1 || ings.every(x => x[2] % B === 0) || Math.min(...ings.map(x => x[4])) === ings[Ms.indexOf(Mx)][4] && Math.random() < 0.6);
      const lim = ings[Ms.indexOf(Mx)];
      return fieldsRound({
        prompt: `אפשר להכין לפי המתכון כל מספר של מבחנות. במחסן נשארו: ${ings.map(([nm, u, , , S]) => `${S} ${u} ${nm}`).join(', ')}. כמה מבחנות לכל היותר אפשר להכין?`,
        visual: `<div class="lratio-card-wrap">${recipeTable(name, [forN(B)], ings.map(([nm, u, a]) => [nm, u, a]))}</div>`,
        fields: [['', Mx, 'מבחנות']],
        hints: ['בדקו כל חומר בנפרד: לכמה מבחנות הוא מספיק? החומר שנגמר ראשון קובע.', `למבחנה אחת צריך: ${ings.map(([nm, u, , per]) => `${nm} ${nf(per)} ${u}`).join(', ')}.`, `ה${lim[0]} מספיק רק ל־${Mx} מבחנות.`],
        explain: ings.map(([nm, u, , per, S, k]) => `${nm}: ${S} ${u} מספיקים ל־${k} מבחנות (${k + 1} מבחנות כבר צריכות ${nf((k + 1) * per)} ${u}).`).join('<br>') + `<br>לכן לכל היותר ${Mx} מבחנות.`,
      });
    }
    const [B, N] = pick([[4, 6], [4, 10], [6, 9], [6, 15], [8, 12], [8, 20], [10, 15], [10, 25], [4, 14], [8, 6], [10, 4], [4, 3], [8, 10], [10, 6], [2, 5], [2, 3]]);
    const f = N / B;
    let ings;
    do
      ings = shuffle(ING).slice(0, 3).map(([nm, u]) => {
        let a;
        do a = pick([1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 9, 10, 12]); while (!hasCents(a * f));
        return [nm, u, a, clean(a * f)];
      });
    while (ings.every(x => Number.isInteger(x[3])));
    return {
      prompt: `השלימו את המתכון ${forN(N)}. אפשר לכתוב מספרים עשרוניים.`,
      widget: inputs(recipeTable(name, [forN(B), forN(N)], ings.map(([nm, u, a, x], i) => [nm, u, nf(a), box('f' + i, Math.max(4, nf(x).length + 1), false, 'd')]))),
      answer: Object.fromEntries(ings.map(x => ['f' + ings.indexOf(x), x[3]])),
      check: v => ings.every((x, i) => near(v['f' + i], x[3])),
      hints: [`פי כמה גדל (או קטן) מספר המבחנות? ${M(`${N} ÷ ${B} = ${nf(f)}`)}.`, `כופלים כל כמות ב־${nf(f)}. למשל: ${M(`${nf(ings[0][2])} × ${nf(f)} = ${nf(ings[0][3])}`)}.`],
      explain: ings.map(([nm, u, a, x]) => `${nm}: ${M(`${nf(a)} × ${nf(f)} = ${nf(x)}`)} ${u}`).join('<br>'),
    };
  },
};

// ---------- 3. sharing by a ratio ----------
const LIQ = ['מים', 'תרכיז', 'צבע כחול', 'צבע צהוב', 'מיץ לימון', 'חומץ', 'סירופ'];
const TAPE = ['lratio-cb', 'lratio-cy', 'lratio-cr'];
// bar model: one row of equal units per liquid; dif marks the units that make up a difference
function tapeSVG(rows, dif = 0) {
  const maxN = Math.max(...rows.map(r => r.n)), uw = Math.min(30, 210 / maxN), x0 = 226, H = rows.length * 40 + 6;
  let s = `<svg viewBox="0 0 320 ${H}" class="lratio-tape" style="max-width:340px;direction:ltr">`;
  rows.forEach((r, i) => {
    const y = 6 + i * 40;
    s += `<text x="316" y="${y + 20}" class="lratio-tl">${r.label}</text>`;
    for (let j = 0; j < r.n; j++)
      s += `<rect x="${(x0 - (j + 1) * uw).toFixed(1)}" y="${y}" width="${uw.toFixed(1)}" height="28" rx="4" class="lratio-tu ${i === 0 && j >= r.n - dif ? 'lratio-dif' : TAPE[i]}"/>`;
  });
  return s + '</svg>';
}
const tapeVis = (rows, cap, dif) => `${tapeSVG(rows, dif)}<div class="lratio-cap">${cap}</div>`;
const shareIntro = `<p>כדי לחלק כמות לפי יחס, חושבים על <b>חלקים שווים</b>. יחס ${R(3, 5)} מחלק את הכמות ל־${M('3 + 5 = 8')} חלקים שווים.</p>
    <div class="ex">40 מ״ל ביחס ${R(3, 5)}: כל חלק הוא ${M('40 ÷ 8 = 5')} מ״ל, לכן ${M('3 × 5 = 15')} מ״ל ו־${M('5 × 5 = 25')} מ״ל.</div>
    <p>אם יודעים את ההפרש במקום הסכום, ההפרש הוא ${M('5 − 3 = 2')} חלקים.</p>`;

const share = {
  id: 'lratio-share', title: 'חלוקה לפי יחס',
  intro: shareIntro,
  gen(L) {
    const [X, Y, Z] = shuffle(LIQ);
    if (L === 1) {
      let p, q, k;
      do {
        [p, q] = coprime(7);
        k = pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20]);
      } while (p + q > 10 || p + q < 3);
      const T = (p + q) * k;
      return fieldsRound({
        prompt: `בבקבוק ${T} מ״ל תערובת של ${X} ו${Y}. היחס בין ${X} ל${Y} הוא ${R(p, q)}. כמה מ״ל יש מכל אחד?`,
        visual: tapeVis([{ label: X, n: p }, { label: Y, n: q }], `סך הכול: ${T} מ״ל`),
        fields: [[`${X}:`, p * k, 'מ״ל'], [`${Y}:`, q * k, 'מ״ל']],
        hints: [`היחס מחלק את התערובת ל־${M(`${p} + ${q} = ${p + q}`)} חלקים שווים: ${parts(p)} של ${X}, ${parts(q)} של ${Y}.`, `כל חלק הוא ${M(`${T} ÷ ${p + q} = ${k}`)} מ״ל.`],
        explain: `${p + q} חלקים, כל חלק ${M(`${T} ÷ ${p + q} = ${k}`)} מ״ל.<br>${X}: ${M(`${p} × ${k} = ${p * k}`)} מ״ל. ${Y}: ${M(`${q} × ${k} = ${q * k}`)} מ״ל.`,
      });
    }
    const t = rnd(0, 2);
    if (L === 2) {
      if (t === 0) {
        let p, q, k;
        do {
          [p, q] = coprime(8);
          k = rnd(2, 12);
        } while (p - q < 2 || p > 9 || (p + q) * k > 200);
        const D = (p - q) * k;
        return fieldsRound({
          prompt: `בתערובת של ${X} ו${Y}, היחס בין ${X} ל${Y} הוא ${R(p, q)}. יש בה ${D} מ״ל ${X} יותר מ${Y}. כמה מ״ל יש מכל אחד?`,
          visual: tapeVis([{ label: X, n: p }, { label: Y, n: q }], `ההפרש (המשבצות המקווקוות): ${D} מ״ל`, p - q),
          fields: [[`${X}:`, p * k, 'מ״ל'], [`${Y}:`, q * k, 'מ״ל']],
          hints: [`ההפרש בין הכמויות הוא ${M(`${p} − ${q} = ${p - q}`)} חלקים.`, `${parts(p - q)} = ${D} מ״ל, לכן כל חלק הוא ${M(`${D} ÷ ${p - q} = ${k}`)} מ״ל.`],
          explain: `ההפרש הוא ${parts(p - q)}, וכל חלק ${M(`${D} ÷ ${p - q} = ${k}`)} מ״ל.<br>${X}: ${M(`${p} × ${k} = ${p * k}`)} מ״ל. ${Y}: ${M(`${q} × ${k} = ${q * k}`)} מ״ל.`,
        });
      }
      if (t === 1) {
        let p, q, r, k;
        do {
          [p, q, r] = [rnd(1, 6), rnd(1, 6), rnd(1, 6)];
          k = rnd(2, 12);
        } while ([p, q, r].reduce(gcd) > 1 || p + q + r > 13 || p + q + r < 5 || (p + q + r) * k > 240);
        const T = (p + q + r) * k;
        return fieldsRound({
          prompt: `מכינים ${T} מ״ל תערובת של ${X}, ${Y} ו${Z} ביחס ${R(p, q, r)} (לפי הסדר הזה). כמה מ״ל צריך מכל אחד?`,
          visual: tapeVis([{ label: X, n: p }, { label: Y, n: q }, { label: Z, n: r }], `סך הכול: ${T} מ״ל`),
          fields: [[`${X}:`, p * k, 'מ״ל'], [`${Y}:`, q * k, 'מ״ל'], [`${Z}:`, r * k, 'מ״ל']],
          hints: [`כמה חלקים שווים יש בסך הכול? ${M(`${p} + ${q} + ${r} = ${p + q + r}`)}.`, `כל חלק הוא ${M(`${T} ÷ ${p + q + r} = ${k}`)} מ״ל.`],
          explain: `כל חלק ${M(`${T} ÷ ${p + q + r} = ${k}`)} מ״ל.<br>${X}: ${M(`${p} × ${k} = ${p * k}`)}, ${Y}: ${M(`${q} × ${k} = ${q * k}`)}, ${Z}: ${M(`${r} × ${k} = ${r * k}`)} מ״ל.`,
        });
      }
      let p, q, k;
      do {
        [p, q] = coprime(7);
        k = rnd(2, 15);
      } while (p + q > 11 || q < 2 || q * k > 90);
      return fieldsRound({
        prompt: `מתכון לתמיסה: ${X} ו${Y} ביחס ${R(p, q)}. בכוס המדידה יש ${q * k} מ״ל ${Y}. כמה ${X} צריך להוסיף, וכמה מ״ל תהיה כל התמיסה?`,
        visual: tapeVis([{ label: X, n: p }, { label: Y, n: q }], `${Y}: ${q * k} מ״ל`),
        fields: [[`${X}:`, p * k, 'מ״ל'], ['כל התמיסה:', (p + q) * k, 'מ״ל']],
        hints: [`ל${Y} יש ${parts(q)} שווים. כמה מ״ל בכל חלק?`, `כל חלק הוא ${M(`${q * k} ÷ ${q} = ${k}`)} מ״ל. ל${X} יש ${parts(p)}, ובכל התמיסה ${M(`${p} + ${q} = ${p + q}`)} חלקים.`],
        explain: `כל חלק ${M(`${q * k} ÷ ${q} = ${k}`)} מ״ל. ${X}: ${M(`${p} × ${k} = ${p * k}`)} מ״ל. כל התמיסה: ${M(`${p + q} × ${k} = ${(p + q) * k}`)} מ״ל.`,
      });
    }
    if (t === 0) {
      // pouring between two tubes keeps the total
      let p, q, r, s, Lc, a0, a1, m;
      do {
        [p, q] = coprime(7);
        [r, s] = coprime(7);
        Lc = lcm(p + q, r + s);
        a0 = (p * Lc) / (p + q);
        a1 = (r * Lc) / (r + s);
        m = rnd(1, 6);
      } while (a0 < 2 || a1 <= a0 || Lc > 40 || Lc * m > 240 || p + q === r + s);
      const x = (a1 - a0) * m, A = a0 * m, Bv = (Lc - a0) * m;
      return fieldsRound({
        prompt: `בשתי מבחנות יש תמיסה. היחס בין הכמות במבחנה א לכמות במבחנה ב הוא ${R(p, q)}. מזגו ${x} מ״ל ממבחנה ב למבחנה א, ועכשיו היחס ביניהן הוא ${R(r, s)}. כמה מ״ל היו בכל מבחנה בהתחלה?`,
        fields: [['מבחנה א:', A, 'מ״ל'], ['מבחנה ב:', Bv, 'מ״ל']],
        hints: [`הכמות הכוללת לא משתנה כשמוזגים. לפני המזיגה היא מחולקת ל־${p + q} חלקים, ואחריה ל־${r + s} חלקים.`, `חלקו את הכמות הכוללת ל־${Lc} חלקים קטנים. במבחנה א היו ${a0} חלקים, ואחרי המזיגה ${a1} חלקים. ההפרש (${a1 - a0} ${a1 - a0 === 1 ? 'חלק' : 'חלקים'}) הוא ${x} מ״ל.`],
        explain: `נחלק את הכמות הכוללת ל־${Lc} חלקים קטנים. מבחנה א עברה מ־${a0} חלקים ל־${a1} חלקים, כלומר ${parts(a1 - a0)} = ${x} מ״ל, וכל חלק ${M(`${x} ÷ ${a1 - a0} = ${m}`)} מ״ל.<br>בהתחלה: מבחנה א ${M(`${a0} × ${m} = ${A}`)} מ״ל, מבחנה ב ${M(`${Lc - a0} × ${m} = ${Bv}`)} מ״ל.`,
      });
    }
    if (t === 1) {
      let p, q, r, s, m, x, y, z, k;
      do {
        [p, q] = coprime(5);
        [r, s] = coprime(5);
        m = lcm(q, r);
        [x, y, z] = [(p * m) / q, m, (s * m) / r];
        k = rnd(2, 10);
      } while (q === r || x + y + z > 30 || (x + y + z) * k > 300);
      const T = (x + y + z) * k;
      return fieldsRound({
        prompt: `בתמיסה של ${T} מ״ל יש ${X}, ${Y} ו${Z}. היחס בין ${X} ל${Y} הוא ${R(p, q)}, והיחס בין ${Y} ל${Z} הוא ${R(r, s)}. כמה מ״ל יש מכל אחד?`,
        fields: [[`${X}:`, x * k, 'מ״ל'], [`${Y}:`, y * k, 'מ״ל'], [`${Z}:`, z * k, 'מ״ל']],
        hints: [`${Y} מופיע בשני היחסים. הרחיבו אותם כך שלו יהיה אותו מספר חלקים, ותקבלו יחס אחד של שלושה מספרים.`, `${R(p, q)} = ${R(x, y)} ו־${R(r, s)} = ${R(y, z)}, לכן ${R(x, y, z)}, כלומר ${x + y + z} חלקים בסך הכול.`],
        explain: `${R(x, y, z)}: ${x + y + z} חלקים, כל חלק ${M(`${T} ÷ ${x + y + z} = ${k}`)} מ״ל.<br>${X}: ${M(`${x} × ${k} = ${x * k}`)}, ${Y}: ${M(`${y} × ${k} = ${y * k}`)}, ${Z}: ${M(`${z} × ${k} = ${z * k}`)} מ״ל.`,
      });
    }
    let p, q, r, k;
    do {
      [p, q, r] = [rnd(1, 7), rnd(1, 7), rnd(1, 7)];
      k = rnd(2, 12);
    } while ([p, q, r].reduce(gcd) > 1 || new Set([p, q, r]).size < 3 || p + q + r > 15 || (p + q + r) * k > 300);
    const lo = Math.min(p, q, r), hi = Math.max(p, q, r), D = (hi - lo) * k, nm = [X, Y, Z], v = [p, q, r];
    return fieldsRound({
      prompt: `${X}, ${Y} ו${Z} מעורבבים ביחס ${R(p, q, r)} (לפי הסדר הזה). מהחומר שיש ממנו הכי הרבה יש ${D} מ״ל יותר מאשר מהחומר שיש ממנו הכי מעט. כמה מ״ל יש מכל חומר?`,
      fields: nm.map((n, i) => [`${n}:`, v[i] * k, 'מ״ל']),
      hints: [`הכי הרבה: ${nm[v.indexOf(hi)]} (${parts(hi)}). הכי מעט: ${nm[v.indexOf(lo)]} (${parts(lo)}). ההפרש הוא ${hi - lo} חלקים.`, `${parts(hi - lo)} = ${D} מ״ל, לכן כל חלק ${M(`${D} ÷ ${hi - lo} = ${k}`)} מ״ל.`],
      explain: `ההפרש הוא ${M(`${hi} − ${lo} = ${hi - lo}`)} חלקים = ${D} מ״ל, וכל חלק ${k} מ״ל.<br>${nm.map((n, i) => `${n}: ${M(`${v[i]} × ${k} = ${v[i] * k}`)}`).join(', ')} מ״ל.`,
    });
  },
};

// ---------- 4. map scale ----------
const PLACES = ['מעבדה', 'מחסן', 'חממה', 'ספרייה', 'מצפה', 'באר', 'גשר', 'שער'];
const S = n => M(`1 : ${big(n)}`);
const realTxt = cm => (cm >= 100000 && cm % 10000 === 0 ? `${nf(cm / 100000)} ק״מ` : `${big(cm / 100)} מטרים`);
// A map of the lab campus with a centimetre ruler under it; x0, x1 in cm (0..7)
function mapSVG(x0, x1, [na, nb]) {
  const X = c => 20 + c * 40;
  let s = '<svg viewBox="0 0 320 200" class="lratio-map" style="max-width:360px;direction:ltr">';
  s += '<rect x="2" y="2" width="316" height="112" rx="12" class="lratio-land"/>';
  s += '<ellipse cx="270" cy="24" rx="30" ry="11" class="lratio-pond"/><ellipse cx="44" cy="24" rx="22" ry="9" class="lratio-pond"/>';
  for (const tx of [60, 130, 190, 250]) if (Math.abs(tx - X(x0)) > 18 && Math.abs(tx - X(x1)) > 18) s += `<circle cx="${tx}" cy="98" r="8" class="lratio-tree"/>`;
  s += `<line x1="${X(x0)}" y1="70" x2="${X(x1)}" y2="70" class="lratio-path"/>`;
  [[x0, na], [x1, nb]].forEach(([x, n]) => {
    s += `<line x1="${X(x)}" y1="70" x2="${X(x)}" y2="128" class="lratio-drop"/><circle cx="${X(x)}" cy="70" r="7" class="lratio-pin"/><text x="${X(x)}" y="54" class="lratio-mlabel">${n}</text>`;
  });
  s += '<rect x="6" y="128" width="308" height="44" rx="4" class="lratio-ruler"/>';
  for (let k = 0; k <= 14; k++) {
    const x = X(k / 2), major = k % 2 === 0;
    s += `<line x1="${x}" y1="128" x2="${x}" y2="${major ? 146 : 139}" class="lratio-rtick"/>`;
    if (major) s += `<text x="${x}" y="164" class="lratio-rlabel">${k / 2}</text>`;
  }
  return s + '<text x="160" y="192" class="lratio-rlabel">ס״מ</text></svg>';
}
const kmOrM = (d, n) => {
  const m = clean((d * n) / 100);
  return m >= 1000 && m % 100 === 0 ? { v: clean(m / 1000), u: 'ק״מ', m } : { v: m, u: 'מטרים', m };
};
const scaleHints = (d, n, r) => [
  `${S(n)} פירושו: כל ס״מ אחד במפה הוא ${big(n)} ס״מ במציאות.`,
  `${nf(d)} ס״מ במפה הם ${M(`${nf(d)} × ${big(n)} = ${big(d * n)}`)} ס״מ במציאות. המירו: 100 ס״מ הם מטר אחד${r.u === 'ק״מ' ? ', ו־1,000 מטרים הם ק״מ אחד' : ''}.`,
];
const scaleExplain = (d, n, r) => `${M(`${nf(d)} × ${big(n)} = ${big(d * n)}`)} ס״מ = ${big(r.m)} מטרים${r.u === 'ק״מ' ? ` = ${nf(r.v)} ק״מ` : ''}.`;

const mapScale = {
  id: 'lratio-map', title: 'קנה מידה במפה',
  intro: `<p><b>קנה מידה</b> הוא היחס בין מרחק במפה למרחק האמיתי. ${S(50000)} פירושו: ס״מ אחד במפה הוא 50,000 ס״מ במציאות.</p>
    <div class="ex">במפה ${S(50000)}, מרחק של 4 ס״מ הוא ${M('4 × 50,000 = 200,000')} ס״מ = 2,000 מטרים = 2 ק״מ.</div>
    <p>כדאי לזכור: 100 ס״מ הם מטר, ו־1,000 מטרים הם ק״מ. לכן במפה ${S(100000)}, כל ס״מ הוא בדיוק ק״מ אחד.</p>`,
  gen(L) {
    const [na, nb] = shuffle(PLACES), t = rnd(0, 2);
    if (L === 1) {
      const n = pick([1000, 2000, 5000, 10000, 20000, 25000, 50000, 100000]), d = rnd(2, 7), r = kmOrM(d, n);
      if (Math.random() < 0.6)
        return fieldsRound({
          prompt: `זו מפה של קריית המעבדות בקנה מידה ${S(n)}. מדדו בסרגל את המרחק בין ה${na} ל${nb}, ומצאו את המרחק האמיתי.`,
          visual: mapSVG(0, d, [na, nb]), fields: [['', r.v, r.u]], dec: true,
          hints: [`קראו בסרגל: ה${na} על 0, ומה מתחת ל${nb}?`, ...scaleHints(d, n, r)],
          explain: `במפה: ${d} ס״מ. ${scaleExplain(d, n, r)}`,
        });
      return fieldsRound({
        prompt: `על מפה בקנה מידה ${S(n)}, המרחק בין ה${na} ל${nb} הוא ${d} ס״מ. מה המרחק האמיתי?`,
        fields: [['', r.v, r.u]], dec: true, hints: scaleHints(d, n, r), explain: scaleExplain(d, n, r),
      });
    }
    if (L === 2) {
      if (t === 0) {
        const n = pick([10000, 20000, 25000, 50000, 100000, 200000]), d = rnd(4, 24) / 2;
        return fieldsRound({
          prompt: `המרחק האמיתי בין ה${na} ל${nb} הוא ${realTxt(d * n)}. כמה ס״מ יהיה המרחק הזה על מפה בקנה מידה ${S(n)}?`,
          fields: [['', d, 'ס״מ']], dec: true,
          hints: ['המירו קודם את המרחק האמיתי לס״מ.', `${realTxt(d * n)} = ${big(d * n)} ס״מ. כל ס״מ במפה מייצג ${big(n)} ס״מ, אז מחלקים.`],
          explain: `${realTxt(d * n)} = ${big(d * n)} ס״מ, ו־${M(`${big(d * n)} ÷ ${big(n)} = ${nf(d)}`)} ס״מ במפה.`,
        });
      }
      if (t === 1) {
        const n = pick([2000, 5000, 10000, 20000, 25000, 40000, 50000, 200000]), d = rnd(2, 9);
        return {
          prompt: `על מפה, המרחק בין ה${na} ל${nb} הוא ${d} ס״מ. המרחק האמיתי הוא ${realTxt(d * n)}. מה קנה המידה של המפה?`,
          widget: inputs(M(`1 : ${box('a', 7)}`)), answer: { a: n }, check: v => v.a === n,
          hints: ['המירו את המרחק האמיתי לס״מ.', `${d} ס״מ במפה הם ${big(d * n)} ס״מ במציאות. כמה ס״מ במציאות מתאימים לס״מ אחד במפה?`],
          explain: `${realTxt(d * n)} = ${big(d * n)} ס״מ, ו־${M(`${big(d * n)} ÷ ${d} = ${big(n)}`)}, לכן קנה המידה ${S(n)}.`,
        };
      }
      const n = pick([2000, 5000, 10000, 20000, 25000, 50000]), x0 = rnd(1, 4) / 2;
      let d;
      do d = rnd(4, 12) / 2; while (x0 + d > 7 || Number.isInteger(d) && Math.random() < 0.6);
      const r = kmOrM(d, n);
      return fieldsRound({
        prompt: `זו מפה בקנה מידה ${S(n)}. מדדו בסרגל את המרחק בין ה${na} ל${nb}, ומצאו את המרחק האמיתי.`,
        visual: mapSVG(x0, x0 + d, [na, nb]), fields: [['', r.v, r.u]], dec: true,
        hints: [`שימו לב: הנקודה של ה${na} לא נמצאת על 0. המרחק במפה הוא ההפרש בין שתי הקריאות בסרגל.`, ...scaleHints(d, n, r)],
        explain: `במפה: ${M(`${nf(x0 + d)} − ${nf(x0)} = ${nf(d)}`)} ס״מ. ${scaleExplain(d, n, r)}`,
      });
    }
    if (t === 0) {
      const n = pick([200, 500, 1000, 2000, 5000]);
      let w, hh;
      do [w, hh] = [rnd(2, 6), rnd(2, 5)]; while (w === hh);
      const rw = clean((w * n) / 100), rh = clean((hh * n) / 100), A = clean(rw * rh);
      return fieldsRound({
        prompt: `על מפה בקנה מידה ${S(n)} מצוירת חלקת ניסוי מלבנית, ${w} ס״מ על ${hh} ס״מ. מה השטח האמיתי של החלקה?`,
        visual: `<svg viewBox="0 0 220 ${hh * 24 + 40}" style="max-width:240px;direction:ltr"><rect x="${125 - w * 12}" y="10" width="${w * 24}" height="${hh * 24}" class="lratio-field"/><text x="125" y="${hh * 24 + 32}" class="lratio-rlabel" style="direction:rtl">${w} ס״מ</text><text x="${119 - w * 12}" y="${10 + hh * 12 + 5}" class="lratio-rlabel" style="direction:rtl;text-anchor:start">${hh} ס״מ</text></svg>`,
        fields: [['', A, 'מ״ר']], dec: true,
        wrongMsg: v => (wrong(v, (w * hh * n) / 10000) ? 'נראה שהשטח הוגדל רק פעם אחת. שימו לב שגם האורך וגם הרוחב גדלים.' : ''),
        hints: ['לא מכפילים את השטח בקנה המידה! מצאו קודם את האורך והרוחב האמיתיים.', `${w} ס״מ במפה הם ${nf(rw)} מטרים, ו־${hh} ס״מ הם ${nf(rh)} מטרים.`],
        explain: `אורך: ${M(`${w} × ${big(n)} = ${big(w * n)}`)} ס״מ = ${nf(rw)} מ׳. רוחב: ${M(`${hh} × ${big(n)} = ${big(hh * n)}`)} ס״מ = ${nf(rh)} מ׳.<br>שטח: ${M(`${nf(rw)} × ${nf(rh)} = ${big(A)}`)} מ״ר.`,
      });
    }
    if (t === 1) {
      let n1, n2, d1, d2;
      do {
        [n1, n2] = pick([[50000, 20000], [20000, 50000], [25000, 10000], [10000, 25000], [100000, 25000], [25000, 100000], [50000, 10000], [10000, 50000], [20000, 5000], [200000, 50000], [40000, 25000]]);
        d1 = rnd(2, 16);
        d2 = clean((d1 * n1) / n2);
      } while (!near(Math.round(d2 * 10), d2 * 10) || d2 > 30 || d2 < 1.5);
      return fieldsRound({
        prompt: `על מפה בקנה מידה ${S(n1)}, המרחק בין ה${na} ל${nb} הוא ${d1} ס״מ. כמה ס״מ יהיה אותו מרחק על מפה בקנה מידה ${S(n2)}?`,
        fields: [['', d2, 'ס״מ']], dec: true,
        hints: ['מצאו קודם את המרחק האמיתי בס״מ.', `המרחק האמיתי: ${M(`${d1} × ${big(n1)} = ${big(d1 * n1)}`)} ס״מ. כמה ס״מ זה במפה השנייה?`],
        explain: `מרחק אמיתי: ${M(`${d1} × ${big(n1)} = ${big(d1 * n1)}`)} ס״מ. במפה השנייה: ${M(`${big(d1 * n1)} ÷ ${big(n2)} = ${nf(d2)}`)} ס״מ.`,
      });
    }
    const [c, km] = pick([[2, 1], [4, 1], [5, 1], [2, 0.5], [4, 2], [5, 2], [2, 5], [3, 1.5], [4, 5], [5, 10], [4, 3], [2, 3]]), n = clean((km * 100000) / c);
    let d;
    do d = rnd(2, 9); while (d === c);
    const real = clean((d * km) / c);
    return {
      prompt: `בפינת המפה מצויר קטע באורך ${c} ס״מ, ולידו כתוב "${nf(km)} ק״מ". על המפה, המרחק בין ה${na} ל${nb} הוא ${d} ס״מ. מה קנה המידה, ומה המרחק האמיתי?`,
      widget: inputs(`<div class="ans-line">קנה מידה: ${M(`1 : ${box('s', 7)}`)}</div><div class="ans-line">מרחק: ${box('k', 5, false, 'd')} ק״מ</div>`),
      answer: { s: n, k: real }, check: v => v.s === n && near(v.k, real),
      hints: [`המירו ${nf(km)} ק״מ לס״מ: ${big(km * 100000)} ס״מ.`, `${c} ס״מ במפה הם ${big(km * 100000)} ס״מ במציאות, אז ס״מ אחד הוא ${big(n)} ס״מ. ועכשיו המרחק: כל ${c} ס״מ במפה הם ${nf(km)} ק״מ.`],
      explain: `${M(`${big(km * 100000)} ÷ ${c} = ${big(n)}`)}, לכן קנה המידה ${S(n)}.<br>מרחק: ${M(`${d} × ${big(n)} = ${big(d * n)}`)} ס״מ = ${nf(real)} ק״מ.`,
    };
  },
};

// ---------- 5. distance, speed and time ----------
// distance-time graph through the origin with a marked point on the grid
function graphSVG({ tMax, dStep, dMax, v, pt }) {
  const X = t => 50 + (t / tMax) * 250, Y = d => 186 - (d / dMax) * 166;
  let s = '<svg viewBox="0 0 320 232" class="lratio-graph" style="max-width:380px;direction:ltr">';
  for (let t = 0; t <= tMax; t++) s += `<line x1="${X(t)}" y1="${Y(0)}" x2="${X(t)}" y2="${Y(dMax)}" class="lratio-grid"/><text x="${X(t)}" y="${Y(0) + 18}" class="lratio-gl">${t}</text>`;
  for (let d = 0; d <= dMax; d += dStep) s += `<line x1="${X(0)}" y1="${Y(d)}" x2="${X(tMax)}" y2="${Y(d)}" class="lratio-grid"/><text x="${X(0) - 6}" y="${Y(d) + 4}" class="lratio-gl" style="text-anchor:end">${d}</text>`;
  s += `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(tMax) + 6}" y2="${Y(0)}" class="lratio-axis"/><line x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(dMax) - 6}" class="lratio-axis"/>`;
  const tEnd = Math.min(tMax, dMax / v);
  s += `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(tEnd)}" y2="${Y(v * tEnd)}" class="lratio-line"/><circle cx="${X(pt)}" cy="${Y(v * pt)}" r="5.5" class="lratio-dot"/>`;
  s += `<text x="${X(tMax)}" y="226" class="lratio-gt" style="text-anchor:end">זמן (דקות)</text><text x="${X(0) - 4}" y="10" class="lratio-gt" style="text-anchor:start">מרחק (מטרים)</text>`;
  return s + '</svg>';
}
const FORMULA = '<div class="ex">דרך = מהירות × זמן<br>מהירות = דרך ÷ זמן<br>זמן = דרך ÷ מהירות</div>';

const speed = {
  id: 'lratio-speed', title: 'דרך, מהירות וזמן',
  intro: `<p><b>מהירות</b> היא יחס בין דרך לזמן: כמה עוברים ביחידת זמן אחת. רחפן שטס 60 קמ״ש עובר 60 ק״מ בכל שעה.</p>
    ${FORMULA}
    <div class="ex">רובוט נסע 120 מטרים ב־8 דקות: ${M('120 ÷ 8 = 15')} מטרים לדקה.</div>
    <p>שימו לב ליחידות: אם המהירות בקמ״ש, הזמן צריך להיות בשעות. 30 דקות הן חצי שעה.</p>`,
  gen(L) {
    const t = rnd(0, 2);
    if (L === 1) {
      if (t === 0) {
        const v = pick([20, 30, 40, 45, 50, 60, 70, 80, 90]), hrs = rnd(2, 5);
        return fieldsRound({
          prompt: `רחפן המעבדה טס במהירות קבועה של ${v} קמ״ש. כמה קילומטרים הוא יעבור ב־${hrs} שעות?`,
          fields: [['', v * hrs, 'ק״מ']], dec: true,
          hints: [`בכל שעה הרחפן עובר ${v} ק״מ.`, `דרך = מהירות × זמן: ${M(`${v} × ${hrs}`)}.`],
          explain: `${M(`${v} × ${hrs} = ${v * hrs}`)} ק״מ.`,
        });
      }
      if (t === 1) {
        const v = rnd(3, 25), tt = rnd(3, 12);
        return fieldsRound({
          prompt: `רובוט השליח נסע ${v * tt} מטרים ב־${tt} דקות, באותה מהירות כל הזמן. מה המהירות שלו?`,
          fields: [['', v, 'מטרים לדקה']], dec: true,
          hints: ['מהירות = דרך ÷ זמן. כמה מטרים הוא עובר בדקה אחת?', `${M(`${v * tt} ÷ ${tt}`)}.`],
          explain: `${M(`${v * tt} ÷ ${tt} = ${v}`)} מטרים לדקה.`,
        });
      }
      const v = pick([2, 3, 4, 5, 6, 8, 10, 12, 15]), tt = rnd(3, 15);
      return fieldsRound({
        prompt: `חילזון הניסוי זוחל ${v} ס״מ בכל דקה. כמה דקות ייקח לו לזחול ${v * tt} ס״מ?`,
        fields: [['', tt, 'דקות']], dec: true,
        hints: ['זמן = דרך ÷ מהירות: כמה פעמים נכנס המרחק של דקה אחת בכל הדרך?', `${M(`${v * tt} ÷ ${v}`)}.`],
        explain: `${M(`${v * tt} ÷ ${v} = ${tt}`)} דקות.`,
      });
    }
    if (L === 2) {
      if (t === 0) {
        let v, m;
        do {
          v = pick([30, 40, 45, 48, 60, 72, 80, 90, 120]);
          m = pick([10, 15, 20, 30, 40, 45, 50, 75, 90]);
        } while ((v * gcd(m, 60)) % 60 !== 0);
        const g = gcd(m, 60), d = (v * m) / 60, back = Math.random() < 0.5;
        const hint1 = `בשעה (60 דקות) עוברים ${v} ק״מ, לכן ב־${g} דקות עוברים ${M(`${v} ÷ ${60 / g} = ${(v * g) / 60}`)} ק״מ.`;
        if (back)
          return fieldsRound({
            prompt: `רחפן טס ${d} ק״מ ב־${m} דקות, במהירות קבועה. מה המהירות שלו בקמ״ש?`,
            fields: [['', v, 'קמ״ש']], dec: true,
            hints: ['קמ״ש = כמה ק״מ עוברים בשעה שלמה, כלומר ב־60 דקות.', `${m} דקות הן ${showFrac(m, 60)} שעה. ${m === g ? '' : `ב־${g} דקות הרחפן עובר ${M(`${d} ÷ ${m / g} = ${(v * g) / 60}`)} ק״מ. `}בשעה יש ${60 / g} פעמים ${g} דקות.`],
            explain: `${m === g ? '' : `ב־${g} דקות: ${M(`${d} ÷ ${m / g} = ${(v * g) / 60}`)} ק״מ. `}בשעה: ${M(`${(v * g) / 60} × ${60 / g} = ${v}`)} קמ״ש.`,
          });
        return fieldsRound({
          prompt: `רחפן טס במהירות ${v} קמ״ש. כמה ק״מ יעבור ב־${m} דקות?`,
          fields: [['', d, 'ק״מ']], dec: true,
          hints: [`המהירות בקמ״ש, והזמן בדקות. ${m} דקות הן ${showFrac(m, 60)} שעה.`, m === g ? hint1 : `${hint1} ב־${m} דקות יש ${m / g} פעמים ${g} דקות.`],
          explain: `${M(`${v} × ${m} ÷ 60 = ${d}`)} ק״מ.`,
        });
      }
      if (t === 1) {
        let v, dStep, pt, k;
        for (;;) {
          v = pick([12, 15, 18, 25, 30, 35, 40, 45, 60, 75, 80]);
          dStep = pick([20, 25, 50, 100]);
          pt = rnd(2, 5);
          k = (v * pt) / dStep;
          if (v % dStep !== 0 && Number.isInteger(k) && k >= 3 && k <= 8) break;
        }
        const dMax = dStep * Math.max(k, Math.min(8, Math.ceil((v * (pt + 1)) / dStep))), tMax = Math.min(8, pt + rnd(1, 3));
        return fieldsRound({
          prompt: 'הגרף מתאר את הנסיעה של רובוט השליח במהירות קבועה. מה המהירות שלו?',
          visual: graphSVG({ tMax, dStep, dMax, v, pt }), fields: [['', v, 'מטרים לדקה']], dec: true,
          hints: ['חפשו נקודה על הקו שיושבת בדיוק על קווי הרשת, למשל הנקודה המודגשת.', `ב־${pt} דקות הרובוט עבר ${v * pt} מטרים. כמה זה בדקה אחת?`],
          explain: `בנקודה המודגשת: ${v * pt} מטרים ב־${pt} דקות. ${M(`${v * pt} ÷ ${pt} = ${v}`)} מטרים לדקה.`,
        });
      }
      const v = pick([20, 30, 40, 50, 60, 80]), tt = pick([0.5, 1.5, 2.5, 3.5, 1.25, 0.75]), d = v * tt;
      if (!Number.isInteger(d) || Math.random() < 0.5) {
        const v2 = pick([20, 40, 60, 80]), t2 = pick([0.5, 1.5, 2.5, 3.5]);
        return fieldsRound({
          prompt: `עגלת הדגימות נוסעת במהירות ${v2} קמ״ש. כמה שעות תיסע ${v2 * t2} ק״מ? (אפשר לענות במספר עשרוני.)`,
          fields: [['', t2, 'שעות']], dec: true,
          hints: ['זמן = דרך ÷ מהירות.', `${M(`${v2 * t2} ÷ ${v2}`)}: התוצאה לא שלמה. בחצי שעה העגלה עוברת ${v2 / 2} ק״מ.`],
          explain: `${M(`${v2 * t2} ÷ ${v2} = ${nf(t2)}`)} שעות.`,
        });
      }
      return fieldsRound({
        prompt: `עגלת הדגימות נוסעת במהירות ${v} קמ״ש במשך ${nf(tt)} שעות. כמה ק״מ היא עוברת?`,
        fields: [['', d, 'ק״מ']], dec: true,
        hints: ['דרך = מהירות × זמן.', `${M(`${v} × ${nf(tt)}`)}. ${tt >= 1 ? `ב${tt < 2 ? 'שעה אחת' : `־${Math.floor(tt)} שעות`}: ${v * Math.floor(tt)} ק״מ, ו` : ''}ב־${nf(tt % 1)} שעה: ${M(`${v} × ${nf(tt % 1)} = ${nf(v * (tt % 1))}`)} ק״מ.`],
        explain: `${M(`${v} × ${nf(tt)} = ${nf(d)}`)} ק״מ.`,
      });
    }
    if (t === 0) {
      let v1, v2, tt, D;
      do {
        v1 = pick([20, 30, 40, 50, 60, 70, 80]);
        v2 = pick([20, 30, 40, 50, 60, 70, 80, 90]);
        tt = pick([0.5, 0.75, 1.25, 1.5, 2, 2.5]);
        D = (v1 + v2) * tt;
      } while (v1 === v2 || !Number.isInteger(D));
      return fieldsRound({
        prompt: `שני רחפנים יוצאים באותו רגע משתי מעבדות שהמרחק ביניהן ${D} ק״מ, וטסים זה לקראת זה. רחפן א טס ${v1} קמ״ש, ורחפן ב טס ${v2} קמ״ש. אחרי כמה דקות ייפגשו, ובאיזה מרחק מהמעבדה של רחפן א?`,
        fields: [['ייפגשו אחרי', tt * 60, 'דקות'], ['במרחק', clean(v1 * tt), 'ק״מ ממעבדה א']], dec: true,
        hints: [`בכל שעה המרחק ביניהם קטן ב־${M(`${v1} + ${v2} = ${v1 + v2}`)} ק״מ.`, `הזמן: ${M(`${D} ÷ ${v1 + v2} = ${nf(tt)}`)} שעות. המירו לדקות, וחשבו כמה טס רחפן א בזמן הזה.`],
        explain: `יחד הם מתקרבים ב־${v1 + v2} ק״מ בשעה, לכן ${M(`${D} ÷ ${v1 + v2} = ${nf(tt)}`)} שעות = ${tt * 60} דקות.<br>רחפן א טס בזמן הזה ${M(`${v1} × ${nf(tt)} = ${nf(v1 * tt)}`)} ק״מ.`,
      });
    }
    if (t === 1) {
      let v1, v2, k, T;
      do {
        v1 = rnd(6, 20);
        v2 = v1 + rnd(2, 10);
        k = rnd(2, 12);
        T = (v1 * k) / (v2 - v1);
      } while (!Number.isInteger(T) || T > 40 || T < 2);
      return fieldsRound({
        prompt: `רובוט א יצא מהמעבדה במהירות ${v1} מטרים לדקה. ${k} דקות אחריו יצא מאותו מקום רובוט ב, באותו כיוון, במהירות ${v2} מטרים לדקה. כמה דקות אחרי שיצא ישיג רובוט ב את רובוט א, ובאיזה מרחק מהמעבדה?`,
        fields: [['ישיג אחרי', T, 'דקות'], ['במרחק', v2 * T, 'מטרים']], dec: true,
        hints: [`כשרובוט ב יוצא, רובוט א כבר רחוק ${M(`${v1} × ${k} = ${v1 * k}`)} מטרים.`, `בכל דקה רובוט ב מצמצם את הפער ב־${M(`${v2} − ${v1} = ${v2 - v1}`)} מטרים.`],
        explain: `פער התחלתי: ${v1 * k} מטרים. מצמצמים ${v2 - v1} מטרים בדקה: ${M(`${v1 * k} ÷ ${v2 - v1} = ${T}`)} דקות.<br>המרחק: ${M(`${v2} × ${T} = ${v2 * T}`)} מטרים (ובדיקה: רובוט א נסע ${M(`${v1} × ${T + k} = ${v1 * (T + k)}`)}).`,
      });
    }
    const [a, b] = shuffle(pick([[30, 60], [40, 60], [60, 90], [20, 30], [10, 15], [60, 120], [30, 70], [40, 120], [45, 90], [50, 75], [12, 6]]));
    const l = lcm(a, b), D = l * (l < Math.max(a, b) * 2 ? 2 : l <= 180 ? rnd(1, 2) : 1), avg = (2 * a * b) / (a + b);
    return fieldsRound({
      prompt: `רחפן טס ממעבדה א למעבדה ב, מרחק של ${D} ק״מ, במהירות ${a} קמ״ש. בחזרה, באותה דרך, הוא טס במהירות ${b} קמ״ש. מה המהירות הממוצעת שלו בכל הטיסה, הלוך וחזור?`,
      fields: [['', avg, 'קמ״ש']], dec: true,
      wrongMsg: v => (wrong(v, (a + b) / 2) ? 'זה הממוצע של שתי המהירויות, אבל הרחפן טס יותר זמן במהירות האיטית. חשבו: כל הדרך ÷ כל הזמן.' : ''),
      hints: ['מהירות ממוצעת = כל הדרך ÷ כל הזמן.', `הלוך: ${M(`${D} ÷ ${a} = ${D / a}`)} שעות. חזור: ${M(`${D} ÷ ${b} = ${D / b}`)} שעות. כל הדרך: ${2 * D} ק״מ.`],
      explain: `כל הדרך: ${M(`${D} × 2 = ${2 * D}`)} ק״מ. כל הזמן: ${M(`${D / a} + ${D / b} = ${D / a + D / b}`)} שעות.<br>ממוצע: ${M(`${2 * D} ÷ ${D / a + D / b} = ${avg}`)} קמ״ש (ולא ${nf((a + b) / 2)}).`,
    });
  },
};

// ---------- 6. which is the better buy? ----------
const PROD = [
  { e: '🧴', what: 'תמיסת ניקוי', u: 'מ״ל', big: 'ליטר', base: 100, small: [200, 250, 300, 500], mid: [200, 300, 400, 500, 600, 750, 1000, 1500, 2000] },
  { e: '🧂', what: 'מלח מעבדה', u: 'גרם', big: 'ק״ג', base: 100, small: [200, 250, 500], mid: [200, 250, 400, 500, 750, 1000, 1500, 2000] },
  { e: '🧪', what: 'מבחנות', u: 'מבחנות', base: 1, small: [4, 5, 6, 10], mid: [4, 5, 6, 8, 10, 12, 15, 20, 24] },
];
const sizeTxt = (q, P) => (P.big && q >= 1000 ? `${nf(q / 1000)} ${P.big}` : `${q} ${P.u}`);
const baseTxt = P => (P.base === 1 ? 'מבחנה אחת' : `100 ${P.u}`);
const card = (q, p, P) => `<span class="lratio-card"><span class="lratio-emo">${P.e}</span><b>${sizeTxt(q, P)}</b><span class="lratio-price">${ils(p)}</span></span>`;
const unitTxt = x => (hasCents(x) ? `= ${money(x)}` : `≈ ${x.toFixed(2)}`);

const buy = {
  id: 'lratio-buy', title: 'מה משתלם יותר?',
  intro: `<p>כדי לדעת איזו אריזה משתלמת יותר, משווים את המחיר של <b>אותה כמות</b>: למשל מחיר של 100 מ״ל, או של מבחנה אחת. זה <b>מחיר ליחידה</b>.</p>
    <div class="ex">500 מ״ל ב־${ils(6)} ו־1 ליטר ב־${ils(11)}. ליטר הוא פי 2 מ־500 מ״ל: שני בקבוקים קטנים עולים ${ils(12)}, לכן הבקבוק הגדול משתלם יותר.</div>
    <p>הגדול לא תמיד משתלם יותר! תמיד בודקים. שימו לב: כשיש רק שתי אפשרויות, יש ניסיון אחד בלבד.</p>`,
  gen(L) {
    const P = pick(PROD);
    if (L === 1) {
      let s, m, ps, pb, delta;
      do {
        s = pick(P.small);
        m = rnd(2, 4);
        ps = rnd(3, 12);
        delta = rnd(1, Math.max(1, Math.floor((m * ps) / 5))) * pick([-1, 1]);
        pb = m * ps + delta;
      } while (pb <= ps + 1 || (P.base === 1 && s * m > 30));
      const opts = shuffle([[s, ps], [s * m, pb]]), bigBetter = delta < 0, ans = opts.findIndex(o => o[0] === (bigBetter ? s * m : s));
      return {
        prompt: `בחנות ציוד המעבדה מוכרים ${P.what} בשתי אריזות. איזו אריזה משתלמת יותר?`,
        widget: choice(opts.map(([q, p]) => card(q, p, P)), { cols: 2, cls: 'lratio-cards' }), answer: ans, check: v => v === ans, tries: 1,
        hints: ['השוו את המחירים של אותה כמות.', `${sizeTxt(s * m, P)} הם פי ${m} מ־${sizeTxt(s, P)}. כמה יעלו ${m} אריזות קטנות?`],
        explain: `${m} אריזות קטנות (${sizeTxt(s * m, P)}) עולות ${M(`${m} × ${ps} = ${m * ps}`)} ש״ח, והאריזה הגדולה עולה ${ils(pb)}. לכן ${bigBetter ? 'האריזה הגדולה' : 'האריזה הקטנה'} משתלמת יותר.`,
      };
    }
    if (L === 2) {
      let qs, ps, us, best;
      for (;;) {
        qs = shuffle(P.mid).slice(0, 3);
        const u0 = P.base === 1 ? rnd(5, 30) / 10 : rnd(8, 40) / 10;
        ps = qs.map(q => Math.max(1, Math.round((q / P.base) * u0 * (0.8 + Math.random() * 0.45) * 2) / 2));
        us = ps.map((p, i) => p / (qs[i] / P.base));
        const sorted = [...us].sort((a, b) => a - b);
        best = us.indexOf(sorted[0]);
        if (sorted[1] / sorted[0] > 1.04) break;
      }
      const lines = qs.map((q, i) => `${sizeTxt(q, P)}: ${M(`${money(ps[i])} ÷ ${nf(q / P.base)} ${unitTxt(us[i])}`)} ש״ח`);
      return {
        prompt: `איזו אריזה של ${P.what} הכי משתלמת?`,
        widget: choice(qs.map((q, i) => card(q, ps[i], P)), { cols: 3, cls: 'lratio-cards' }), answer: best, check: v => v === best, tries: 2,
        hints: [`חשבו לכל אריזה כמה ${P.base === 1 ? 'עולה' : 'עולים'} ${baseTxt(P)}.${P.big ? ` שימו לב: 1 ${P.big} = 1,000 ${P.u}.` : ''}`, `מחיר של ${baseTxt(P)}: ${lines[0]}. עשו את אותו החישוב לשתי האריזות האחרות.`],
        explain: `מחיר של ${baseTxt(P)}:<br>${lines.join('<br>')}<br>הכי זול: ${sizeTxt(qs[best], P)}.`,
      };
    }
    if (Math.random() < 0.55) {
      const DEALS = [
        { t: p => `${ils(p)} לבקבוק`, tot: p => 6 * p, why: p => M(`6 × ${money(p)} = ${money(6 * p)}`) },
        { t: p => `${ils(p)} לבקבוק. מבצע: קונים 2, מקבלים עוד 1 חינם`, tot: p => 4 * p, why: p => `משלמים רק על 4: ${M(`4 × ${money(p)} = ${money(4 * p)}`)}` },
        { t: p => `${ils(p)} לבקבוק. מבצע: השני בחצי מחיר`, tot: p => 4.5 * p, why: p => `3 זוגות, כל זוג ${M(`${money(p)} + ${money(p / 2)} = ${money(1.5 * p)}`)}, סך הכול ${M(`3 × ${money(1.5 * p)} = ${money(4.5 * p)}`)}` },
        { t: p => `מארז של 3 בקבוקים ב־${ils(p)}`, tot: p => 2 * p, why: p => `2 מארזים: ${M(`2 × ${money(p)} = ${money(2 * p)}`)}` },
        { t: p => `מארז של 2 בקבוקים ב־${ils(p)}`, tot: p => 3 * p, why: p => `3 מארזים: ${M(`3 × ${money(p)} = ${money(3 * p)}`)}` },
      ];
      let ds, ps, tots, best;
      for (;;) {
        ds = shuffle(DEALS).slice(0, 3);
        const U = rnd(4, 12);
        ps = ds.map(d => Math.max(2, Math.round((6 * U * (0.85 + Math.random() * 0.3)) / d.tot(1))));
        tots = ds.map((d, i) => d.tot(ps[i]));
        const sorted = [...tots].sort((a, b) => a - b);
        best = tots.indexOf(sorted[0]);
        if (sorted[1] - sorted[0] >= 1) break;
      }
      const names = ['חנות א', 'חנות ב', 'חנות ג'];
      return {
        prompt: 'לניסוי צריך בדיוק 6 בקבוקי תמיסה. בשלוש חנויות יש מבצעים שונים. איפה הכי זול לקנות 6 בקבוקים?',
        widget: choice(ds.map((d, i) => `<span class="lratio-deal"><b>${names[i]}</b> ${d.t(ps[i])}</span>`), { cols: 1 }), answer: best, check: v => v === best, tries: 1,
        hints: ['חשבו לכל חנות כמה יעלו בדיוק 6 בקבוקים, לפי המבצע שלה.', `${names[0]}: ${ds[0].why(ps[0])} ש״ח.`],
        explain: ds.map((d, i) => `${names[i]}: ${d.why(ps[i])} ש״ח`).join('<br>') + `<br>הכי זול: ${names[best]}.`,
      };
    }
    const Q = pick(P.base === 1 ? [12, 20, 24, 30] : [1000, 1500, 2000]);
    let q, pr, x;
    do {
      q = pick(P.base === 1 ? [3, 4, 5, 6, 8, 10] : [200, 250, 300, 400, 500, 750]);
      pr = rnd(6, 40);
      x = clean((pr * q) / Q);
    } while (Q % q === 0 && Math.random() < 0.5 || !hasCents(x) || q >= Q);
    const g = gcd(q, Q), unit = P.base === 1 ? `${g === 1 ? 'מבחנה אחת' : `${g} מבחנות`}` : `${g} ${P.u}`, cost = P.base === 1 ? (g === 1 ? 'עולה' : 'עולות') : 'עולים';
    const what = P.base === 1 ? '' : ' ' + P.what;
    return fieldsRound({
      prompt: `אריזה של ${sizeTxt(Q, P)}${what} עולה ${ils(pr)}. כמה צריכה לעלות אריזה של ${sizeTxt(q, P)}, כדי ששתי האריזות ישתלמו בדיוק באותה מידה?`,
      fields: [['', x, 'ש״ח']], dec: true,
      hints: [`חשבו את המחיר של ${unit} באריזה הגדולה: ב־${sizeTxt(Q, P)} יש ${Q / g} פעמים ${unit}.`, q === g ? `${unit} ${cost} ${M(`${pr} ÷ ${Q / g}`)} ש״ח, וזה בדיוק גודל האריזה הקטנה.` : `${unit} ${cost} ${M(`${pr} ÷ ${Q / g}`)} ש״ח, ובאריזה הקטנה יש ${q / g} פעמים ${unit}.`],
      explain: `${M(q === g ? `${pr} ÷ ${Q / g} = ${money(x)}` : `${pr} ÷ ${Q / g} × ${q / g} = ${money(x)}`)} ש״ח.`,
    });
  },
};

// ---------- 7. concentration ----------
function beaker(lines, fill = 0.55) {
  const top = 22 + (1 - fill) * 92;
  const svg = `<svg viewBox="0 0 110 130" style="width:96px"><rect x="18" y="${top.toFixed(1)}" width="74" height="${(114 - top).toFixed(1)}" class="lratio-liq"/>` +
    range(9, i => `<rect x="${26 + (i * 7) % 58}" y="${108 - (i % 3) * 4}" width="4" height="4" class="lratio-salt"/>`).join('') +
    '<path d="M12 10L18 16V114Q18 122 26 122H84Q92 122 92 114V16L98 10" class="lratio-glassline"/>' +
    range(4, i => `<line x1="78" y1="${40 + i * 20}" x2="92" y2="${40 + i * 20}" class="lratio-glassline"/>`).join('') + '</svg>';
  return `<div class="lratio-beak">${svg}<div class="lratio-blist">${lines.join('<br>')}</div></div>`;
}
const SOLUTE = ['מלח', 'סוכר'];
const concDef = s => `ריכוז = כמות ה${s} ÷ כמות כל התמיסה (${s} ועוד מים) × 100.`;

const conc = {
  id: 'lratio-conc', title: 'ריכוז של תמיסה',
  intro: `<p><b>ריכוז</b> של תמיסה אומר איזה חלק מהתמיסה הוא החומר המומס, באחוזים. מחלקים את כמות החומר בכמות <b>כל</b> התמיסה (החומר ועוד המים), וכופלים ב־100.</p>
    <div class="ex">20 גרם מלח ו־80 גרם מים: כל התמיסה שוקלת ${M('20 + 80 = 100')} גרם, והריכוז ${M('20 ÷ 100 × 100 = 20%')}.</div>
    <p>וכיוון הפוך: ב־300 גרם תמיסה בריכוז ${pct(10)} יש ${M('300 × 10 ÷ 100 = 30')} גרם מלח.</p>`,
  gen(L) {
    const sol = pick(SOLUTE), t = rnd(0, 2);
    if (L === 1) {
      let p, T;
      do {
        p = pick([5, 10, 15, 20, 25, 30, 40, 50]);
        T = pick([50, 100, 200, 250, 300, 400, 500]);
      } while ((p * T) % 100 !== 0);
      const s = (p * T) / 100, w = T - s;
      if (t === 0)
        return fieldsRound({
          prompt: `המיסו ${s} גרם ${sol} ב־${w} גרם מים. מה הריכוז של ה${sol} בתמיסה?`,
          visual: beaker([`${sol}: ${s} גרם`, `מים: ${w} גרם`]), fields: [['', p, '%']], dec: true,
          wrongMsg: v => (wrong(v, (s / w) * 100) ? `חילקתם במשקל המים. צריך לחלק במשקל כל התמיסה: מים ועוד ${sol}.` : ''),
          hints: [concDef(sol), `כל התמיסה: ${M(`${s} + ${w} = ${T}`)} גרם. עכשיו ${M(`${s} ÷ ${T} × 100`)}.`],
          explain: `כל התמיסה ${M(`${s} + ${w} = ${T}`)} גרם. ${M(`${s} ÷ ${T} × 100 = ${p}%`)}.`,
        });
      if (t === 1)
        return fieldsRound({
          prompt: `ב־${T} גרם תמיסה מומסים ${s} גרם ${sol}. מה הריכוז של התמיסה?`,
          visual: beaker([`${sol}: ${s} גרם`, `כל התמיסה: ${T} גרם`]), fields: [['', p, '%']], dec: true,
          hints: [concDef(sol), `${M(`${s} ÷ ${T} × 100`)}. ${T === 100 ? '' : `אפשר גם לחשוב: כמה ${sol} יש ב־100 גרם תמיסה?`}`],
          explain: `${M(`${s} ÷ ${T} × 100 = ${p}%`)}.`,
        });
      return fieldsRound({
        prompt: `בבקבוק יש ${T} גרם תמיסת ${sol} בריכוז ${pct(p)}. כמה גרם ${sol} יש בבקבוק?`,
        visual: beaker([`כל התמיסה: ${T} גרם`, `ריכוז: ${pct(p)}`]), fields: [['', s, 'גרם']], dec: true,
        hints: [`${pct(p)} פירושו ${p} גרם ${sol} בכל 100 גרם תמיסה.`, `${M(`${T} × ${p} ÷ 100`)}.`],
        explain: `${M(`${T} × ${p} ÷ 100 = ${s}`)} גרם ${sol}.`,
      });
    }
    if (L === 2) {
      if (t === 0) {
        let p, T, W, q, s;
        do {
          p = pick([10, 20, 25, 30, 40, 50]);
          T = pick([100, 200, 300, 400, 500]);
          W = pick([50, 100, 150, 200, 300, 500]);
          s = (p * T) / 100;
          q = (100 * s) / (T + W);
        } while (!Number.isInteger(s) || !Number.isInteger(q));
        return fieldsRound({
          prompt: `בכוס ${T} גרם תמיסת ${sol} בריכוז ${pct(p)}. מוסיפים לכוס ${W} גרם מים. מה הריכוז החדש?`,
          visual: beaker([`${T} גרם תמיסה, ${pct(p)}`, `+ ${W} גרם מים`], 0.45), fields: [['', q, '%']], dec: true,
          wrongMsg: v => (wrong(v, p) ? 'הוספנו מים, אז הריכוז חייב לרדת.' : ''),
          hints: [`כמות ה${sol} לא משתנה כשמוסיפים מים. כמה ${sol} יש? ${M(`${T} × ${p} ÷ 100`)}.`, `יש ${s} גרם ${sol}, וכל התמיסה עכשיו ${M(`${T} + ${W} = ${T + W}`)} גרם.`],
          explain: `${sol}: ${M(`${T} × ${p} ÷ 100 = ${s}`)} גרם. תמיסה חדשה: ${T + W} גרם. ריכוז: ${M(`${s} ÷ ${T + W} × 100 = ${q}%`)}.`,
        });
      }
      if (t === 1) {
        let s, p, T;
        do {
          s = pick([5, 10, 12, 15, 20, 24, 30, 40, 45, 60]);
          p = pick([4, 5, 8, 10, 12, 15, 20, 25, 30, 40]);
          T = (100 * s) / p;
        } while (!Number.isInteger(T) || T > 600);
        return fieldsRound({
          prompt: `יש לנו ${s} גרם ${sol}. כמה גרם מים צריך להוסיף כדי לקבל תמיסה בריכוז ${pct(p)}?`,
          fields: [['', T - s, 'גרם מים']], dec: true,
          wrongMsg: v => (wrong(v, T) ? `זה המשקל של כל התמיסה. כמה מזה הם מים?` : ''),
          hints: [`${pct(p)} פירושו שה${sol} הוא ${p} מכל 100 גרם תמיסה. כמה תשקול כל התמיסה?`, `כל התמיסה: ${M(`${s} ÷ ${p} × 100 = ${T}`)} גרם. חלק מזה הוא ה${sol} עצמו.`],
          explain: `כל התמיסה: ${M(`${s} ÷ ${p} × 100 = ${T}`)} גרם. מים: ${M(`${T} − ${s} = ${T - s}`)} גרם.`,
        });
      }
      let p, T;
      do {
        p = pick([4, 6, 8, 12, 15, 35, 45, 60]);
        T = pick([150, 200, 250, 300, 350, 400, 450, 600, 800]);
      } while ((p * T) % 100 !== 0);
      const s = (p * T) / 100;
      return fieldsRound({
        prompt: `צריך להכין ${T} גרם תמיסת ${sol} בריכוז ${pct(p)}. כמה גרם ${sol} וכמה גרם מים צריך?`,
        fields: [[`${sol}:`, s, 'גרם'], ['מים:', T - s, 'גרם']], dec: true,
        hints: [`${pct(p)} מ־${T} גרם הם ה${sol}.`, `${sol}: ${M(`${T} × ${p} ÷ 100 = ${s}`)} גרם. כל השאר מים.`],
        explain: `${sol}: ${M(`${T} × ${p} ÷ 100 = ${s}`)} גרם. מים: ${M(`${T} − ${s} = ${T - s}`)} גרם.`,
      });
    }
    if (t === 0) {
      let T1, p1, T2, p2, r;
      do {
        T1 = pick([100, 200, 300, 400, 500]);
        T2 = pick([100, 200, 300, 400, 500]);
        p1 = pick([5, 10, 15, 20, 30, 40]);
        p2 = pick([5, 10, 15, 20, 30, 40]);
        r = (T1 * p1 + T2 * p2) / (T1 + T2);
      } while (p1 === p2 || T1 === T2 || !near(Math.round(r * 10), r * 10));
      const s1 = (T1 * p1) / 100, s2 = (T2 * p2) / 100;
      return fieldsRound({
        prompt: `מערבבים ${T1} גרם תמיסת ${sol} בריכוז ${pct(p1)} עם ${T2} גרם תמיסת ${sol} בריכוז ${pct(p2)}. מה הריכוז של התערובת?`,
        fields: [['', clean(r), '%']], dec: true,
        wrongMsg: v => (wrong(v, (p1 + p2) / 2) ? 'זה הממוצע של שני הריכוזים, אבל הכמויות שונות. חשבו כמה גרם ' + sol + ' יש בכל תמיסה.' : ''),
        hints: [`חשבו כמה גרם ${sol} יש בכל תמיסה, וכמה שוקלת התערובת כולה.`, `${sol}: ${M(`${nf(s1)} + ${nf(s2)} = ${nf(s1 + s2)}`)} גרם, בתוך ${T1 + T2} גרם תמיסה.`],
        explain: `${sol}: ${M(`${T1} × ${p1} ÷ 100 = ${nf(s1)}`)} ו־${M(`${T2} × ${p2} ÷ 100 = ${nf(s2)}`)}, יחד ${nf(s1 + s2)} גרם.<br>ריכוז: ${M(`${nf(s1 + s2)} ÷ ${T1 + T2} × 100 = ${nf(r)}%`)}.`,
      });
    }
    if (t === 1) {
      let T, p, q, s, T2;
      do {
        T = pick([200, 300, 400, 500, 600, 800]);
        p = pick([5, 10, 12, 15, 20, 25]);
        q = pick([20, 25, 30, 40, 50]);
        s = (T * p) / 100;
        T2 = (100 * s) / q;
      } while (q <= p || !Number.isInteger(s) || !Number.isInteger(T2));
      return fieldsRound({
        prompt: `מחממים ${T} גרם תמיסת ${sol} בריכוז ${pct(p)}, וחלק מהמים מתאדים. ה${sol} לא מתאדה. כמה גרם מים צריכים להתאדות כדי שהריכוז יעלה ל־${pct(q)}?`,
        fields: [['', T - T2, 'גרם']], dec: true,
        hints: [`כמות ה${sol} נשארת: ${M(`${T} × ${p} ÷ 100 = ${s}`)} גרם.`, `בריכוז ${pct(q)}, ${s} גרם ${sol} הם ${q} מכל 100. כל התמיסה תשקול ${M(`${s} ÷ ${q} × 100 = ${T2}`)} גרם.`],
        explain: `${sol}: ${s} גרם. תמיסה בריכוז ${pct(q)}: ${M(`${s} ÷ ${q} × 100 = ${T2}`)} גרם. מתאדים ${M(`${T} − ${T2} = ${T - T2}`)} גרם מים.`,
      });
    }
    let T, p, q, x;
    do {
      T = pick([90, 100, 150, 180, 200, 240, 300, 400]);
      p = pick([5, 10, 15, 20]);
      q = pick([20, 25, 40, 50]);
      x = (T * (q - p)) / (100 - q);
    } while (q <= p || !Number.isInteger(x) || !Number.isInteger((T * p) / 100) || x > 300);
    const s = (T * p) / 100;
    return fieldsRound({
      prompt: `בכוס ${T} גרם תמיסת ${sol} בריכוז ${pct(p)}. כמה גרם ${sol} צריך להוסיף כדי שהריכוז יהיה ${pct(q)}?`,
      fields: [['', x, 'גרם']], dec: true,
      hints: [`שימו לב: כשמוסיפים ${sol}, גם התמיסה כולה נעשית כבדה יותר. כמות המים לא משתנה.`, `מים: ${M(`${T} − ${s} = ${T - s}`)} גרם. בריכוז ${pct(q)}, המים הם ${pct(100 - q)} מהתמיסה. כמה תשקול כל התמיסה?`],
      explain: `יש ${s} גרם ${sol} ו־${T - s} גרם מים. המים יהיו ${pct(100 - q)} מהתמיסה החדשה: ${M(`${T - s} ÷ ${100 - q} × 100 = ${T + x}`)} גרם. ${sol} בתמיסה החדשה: ${M(`${T + x} − ${T - s} = ${s + x}`)}, לכן מוסיפים ${M(`${s + x} − ${s} = ${x}`)} גרם.`,
    });
  },
};

// ---------- 8. proportion tables ----------
const CTX = [
  ['מבחנות', 'מ״ל תמיסה', 'מבחנה אחת', 'מ״ל'],
  ['דקות', 'טיפות', 'דקה אחת', 'טיפות'],
  ['שקיות', 'גרם מלח', 'שקית אחת', 'גרם'],
  ['ניסויים', 'כפפות', 'ניסוי אחד', 'כפפות'],
  ['ליטרים', 'גרם סוכר', 'ליטר אחד', 'גרם'],
];
const INV = [['רובוטים', 'שעות עבודה'], ['ברזים', 'דקות מילוי'], ['משאבות', 'דקות ריקון']];
const tableHTML = (labels, xs, ys) =>
  `<table class="lratio-tab"><tr><th>${labels[0]}</th>${xs.map(c => `<td>${c}</td>`).join('')}</tr><tr><th>${labels[1]}</th>${ys.map(c => `<td>${c}</td>`).join('')}</tr></table>`;
// hide some cells; given = the index of the full column
function tableRound({ labels, xs, ys, given, hideX, prompt, hints, explain, tries }) {
  const ans = {}, dec = [...xs, ...ys].some(v => !Number.isInteger(v));
  const cell = (v, k, hide) => {
    if (!hide) return nf(v);
    ans[k] = v;
    return box(k, Math.max(3, nf(v).length + 1), false, dec ? 'd' : '');
  };
  const hx = i => i === hideX, hy = i => i !== given && i !== hideX;
  return {
    prompt, hints, tries,
    widget: inputs(tableHTML(labels, xs.map((v, i) => cell(v, 'x' + i, hx(i))), ys.map((v, i) => cell(v, 'y' + i, hy(i))))),
    answer: ans, check: v => Object.keys(ans).every(k => near(v[k], ans[k])),
    explain: `${explain}<div class="lratio-tabx">${tableHTML(labels, xs.map(nf), ys.map(nf))}</div>`,
  };
}
const pickXs = (n, from) => shuffle(from).slice(0, n).sort((a, b) => a - b);

const table = {
  id: 'lratio-table', title: 'טבלת פרופורציה',
  intro: `<p>בטבלת <b>פרופורציה ישרה</b>, כשכמות אחת גדלה פי 2, גם השנייה גדלה פי 2. המנה בין המספר התחתון לעליון זהה בכל העמודות.</p>
    <div class="ex">${tableHTML(['מבחנות', 'מ״ל'], [2, 3, 5], [8, 12, 20])}בכל עמודה מ״ל ÷ מבחנות = 4, כלומר 4 מ״ל לכל מבחנה.</div>
    <p>טיפ: מצאו כמה מתאים ל־1, ומשם קל להגיע לכל מספר. לפעמים יש גם פרופורציה <b>הפוכה</b>: פי 2 רובוטים מסיימים בחצי מהזמן.</p>`,
  gen(L) {
    const [X, Y, one, yu] = pick(CTX), given = rnd(0, 3);
    let hideX;
    do hideX = rnd(0, 3); while (hideX === given);
    if (L === 1) {
      const k = rnd(2, 9), xs = pickXs(4, range(12, i => i + 1)), ys = xs.map(x => x * k);
      return tableRound({
        labels: [X, Y], xs, ys, given, hideX, prompt: `זו טבלת פרופורציה ישרה. השלימו את המספרים החסרים.`,
        hints: [`מצאו מה מתאים ל${one}: ${M(`${ys[given]} ÷ ${xs[given]}`)}.`, `ל${one}: ${k} ${yu}. כדי לרדת בטבלה כופלים ב־${k}, וכדי לעלות מחלקים ב־${k}.`],
        explain: `${M(`${ys[given]} ÷ ${xs[given]} = ${k}`)}, לכן בכל עמודה המספר התחתון הוא פי ${k} מהעליון.`,
      });
    }
    if (L === 2) {
      const [a, b] = pick([[3, 2], [5, 2], [9, 4], [3, 4], [5, 4], [2, 5], [6, 5], [7, 2], [3, 5], [8, 5]]), k = a / b;
      const xs = pickXs(4, range(Math.floor(40 / b), i => (i + 1) * b).filter(x => x <= 30)), ys = xs.map(x => clean(x * k));
      return tableRound({
        labels: [X, Y], xs, ys, given, hideX, prompt: `זו טבלת פרופורציה ישרה. השלימו את המספרים החסרים.`,
        hints: [`מה מתאים ל${one}? ${M(`${ys[given]} ÷ ${xs[given]} = ${nf(k)}`)}. אפשר גם לעבוד עם ${b} ${X}.`, `לכל ${b} ${X} מתאימים ${a} ${yu}. כפלו או חלקו בהתאם.`],
        explain: `${M(`${ys[given]} ÷ ${xs[given]} = ${nf(k)}`)}: המספר התחתון הוא תמיד ${nf(k)} פעמים העליון (ולהפך, העליון הוא התחתון ÷ ${nf(k)}).`,
      });
    }
    const t = rnd(0, 2);
    if (t === 0) {
      const C = pick([24, 36, 48, 60, 72, 120]), [IX, IY] = pick(INV), divs = range(C, i => i + 1).filter(d => C % d === 0 && d >= 2 && d <= 12 && C / d >= 2);
      const xs = pickXs(4, divs), ys = xs.map(x => C / x);
      return tableRound({
        labels: [IX, IY], xs, ys, given, hideX,
        prompt: `כמה ${IX} זהים עובדים יחד על אותה משימה. ככל שיש יותר ${IX}, המשימה נגמרת מהר יותר. השלימו את הטבלה.`,
        hints: ['זו פרופורציה הפוכה: פי 2 יותר ' + IX + ', פי 2 פחות זמן. כאן המכפלה של שני המספרים בכל עמודה קבועה.', `${M(`${xs[given]} × ${ys[given]} = ${C}`)}: זו כמות העבודה. בכל עמודה המכפלה צריכה להיות ${C}.`],
        explain: `${M(`${xs[given]} × ${ys[given]} = ${C}`)}. בכל עמודה, מספר ה${IX} כפול מספר ה${IY} שווה ${C}, אז מחלקים את ${C} במספר הידוע.`,
      });
    }
    if (t === 1) {
      const k = rnd(2, 6), xs = pickXs(4, range(10, i => i + 1)), c = rnd(1, 6);
      const prop = xs.map(x => x * k), add = xs.map(x => x + c), off = [...prop], j = rnd(1, 3);
      off[j] += pick([-1, 1]);
      const opts = shuffle([[prop, 'p'], [add, 'a'], [off, 'o']]), ans = opts.findIndex(o => o[1] === 'p');
      const why = { a: `המנה משתנה: ${M(`${add[0]} ÷ ${xs[0]}`)} שונה מ־${M(`${add[3]} ÷ ${xs[3]}`)} (כאן מוסיפים ${c}, לא כופלים)`, o: `כמעט! אבל בעמודה של ${xs[j]}, ${M(`${off[j]} ÷ ${xs[j]}`)} לא שווה ${k}` };
      return {
        prompt: 'רק טבלה אחת מתארת פרופורציה ישרה. איזו?',
        widget: choice(opts.map(([ys]) => tableHTML([X, Y], xs, ys)), { cols: 1, cls: 'lratio-tabs' }), answer: ans, check: v => v === ans, tries: 1,
        hints: ['חלקו בכל עמודה את המספר התחתון בעליון. בטבלת פרופורציה יוצא תמיד אותו מספר.', 'בדקו את כל העמודות, לא רק את הראשונה.'],
        explain: opts.map(([ys, kind], i) => `טבלה ${i + 1}: ${kind === 'p' ? `בכל עמודה המנה היא ${k}. זו הפרופורציה` : why[kind]}.`).join('<br>'),
      };
    }
    // decimals only where the bottom quantity can be split (no half drops or gloves)
    const [cX, cY] = pick(CTX.filter(c => c[3] !== 'טיפות' && c[3] !== 'כפפות'));
    let k, xs, ys;
    do {
      k = pick([0.4, 0.6, 1.2, 1.25, 1.5, 2.5, 0.75, 3.5, 2.4]);
      xs = pickXs(5, [2, 3, 4, 5, 6, 8, 10, 12, 14, 15, 16, 20, 25]);
      ys = xs.map(x => clean(x * k));
    } while (!ys.every(hasCents) || ys.filter(y => !Number.isInteger(y)).length < 1 || ys.filter(y => !Number.isInteger(y)).length > 3);
    const g5 = rnd(0, 4);
    let hx;
    do hx = rnd(0, 4); while (hx === g5);
    const r = tableRound({
      labels: [cX, cY], xs, ys, given: g5, hideX: hx, prompt: 'זו טבלת פרופורציה ישרה. השלימו את המספרים החסרים (חלקם עשרוניים).',
      hints: [`מצאו את המנה הקבועה: ${M(`${nf(ys[g5])} ÷ ${xs[g5]}`)}.`, `המנה היא ${nf(k)}: תחתון = עליון × ${nf(k)}, ועליון = תחתון ÷ ${nf(k)}.`],
      explain: `${M(`${nf(ys[g5])} ÷ ${xs[g5]} = ${nf(k)}`)}, לכן התחתון = העליון כפול ${nf(k)}.`,
    });
    return r;
  },
};

// ---------- 9. boss ----------
const boss = {
  id: 'lratio-boss', title: 'בוס: החשבונאית מנה',
  intro: `<p>החשבונאית מנה נעלה את ארון התמיסות הגדול, ועל כל מנעול כתבה חידה של יחסים: מתכונים, מפות, מהירויות, מחירים וריכוזים. רק מי שיודע לחשוב ביחס ובפרופורציה יפתח את כל המנעולים.</p>
    <div class="ex">טיפ: לפני שמחשבים, כתבו לעצמכם מה ידוע, מה שואלים, ואיזה יחס מקשר ביניהם.</div>`,
  gen(L) {
    const t = rnd(0, 3);
    if (L === 1) {
      if (t === 0) {
        const [A, B] = shuffle(COL), [p, T] = pick([[25, 12], [25, 16], [25, 20], [50, 10], [20, 10], [20, 15], [20, 20], [75, 12], [40, 10], [40, 20], [60, 10], [30, 20], [10, 20], [75, 16], [50, 18]]);
        const a = (p * T) / 100;
        return {
          prompt: `בנו במבחנה ${T} טיפות של ${A.n} ו${B.n}, כך ש־${pct(p)} מהטיפות יהיו ${A.f}.`,
          widget: tubeW({ cols: [A, B] }), answer: [a, T - a], check: v => v[0] === a && v[1] === T - a,
          wrongMsg: v => (v[0] + v[1] !== T ? `צריך בדיוק ${T} טיפות בסך הכול.` : ''),
          hints: [`${pct(p)} מתוך ${T}: ${M(`${T} × ${p} ÷ 100`)}.`, `${a} טיפות ${A.f}, וכל השאר ${B.f}.`],
          explain: `${M(`${T} × ${p} ÷ 100 = ${a}`)} טיפות ${A.f}, ו־${M(`${T} − ${a} = ${T - a}`)} טיפות ${B.f}.`,
        };
      }
      if (t === 1) {
        let p, q, k;
        do {
          [p, q] = coprime(9);
          k = rnd(2, 9);
        } while (p >= q || p < 2);
        return fieldsRound({
          prompt: `החשבונאית ערבבה תרכיז ומים ביחס ${R(p, q)}. היא השתמשה ב־${p * k} מ״ל תרכיז. כמה מ״ל יש בכל התערובת?`,
          fields: [['', (p + q) * k, 'מ״ל']],
          hints: [`${p * k} מ״ל תרכיז הם ${parts(p)}. כמה מ״ל בכל חלק?`, `כל חלק ${M(`${p * k} ÷ ${p} = ${k}`)} מ״ל, ובכל התערובת ${M(`${p} + ${q} = ${p + q}`)} חלקים.`],
          explain: `חלק אחד: ${M(`${p * k} ÷ ${p} = ${k}`)} מ״ל. כל התערובת: ${M(`${p + q} × ${k} = ${(p + q) * k}`)} מ״ל.`,
        });
      }
      if (t === 2) {
        let v, m;
        do {
          v = pick([30, 40, 60, 80, 90, 120]);
          m = pick([15, 20, 30, 40, 45, 90]);
        } while (!Number.isInteger((v * m) / 60));
        const d = (v * m) / 60;
        return fieldsRound({
          prompt: `הרחפן של מנה טס ${v} קמ״ש. כמה דקות ייקח לו לטוס ${d} ק״מ?`,
          fields: [['', m, 'דקות']], dec: true,
          hints: [`בשעה (60 דקות) הוא טס ${v} ק״מ. כמה דקות לוקח ק״מ אחד? או: איזה חלק מ־${v} ק״מ הם ${d} ק״מ?`, `${d} ק״מ הם ${F(d / gcd(d, v), v / gcd(d, v))} מהדרך של שעה שלמה.`],
          explain: `${d} ק״מ הם ${F(d / gcd(d, v), v / gcd(d, v))} מהדרך של שעה שלמה, לכן ${M(`60 ÷ ${v / gcd(d, v)} × ${d / gcd(d, v)} = ${m}`)} דקות.`,
        });
      }
      const n1 = pick([4, 5, 6, 8]), unit = pick([2, 2.5, 3, 4, 1.5]), n2 = n1 + pick([2, 3, 4, 6]), p1 = n1 * unit, p2 = clean(n2 * unit);
      return fieldsRound({
        prompt: `${n1} מבחנות עולות ${ils(p1)}. כמה יעלו ${n2} מבחנות כאלה?`,
        fields: [['', p2, 'ש״ח']], dec: true,
        hints: ['מצאו קודם כמה עולה מבחנה אחת.', `מבחנה אחת: ${M(`${money(p1)} ÷ ${n1} = ${money(unit)}`)} ש״ח.`],
        explain: `מבחנה אחת: ${M(`${money(p1)} ÷ ${n1} = ${money(unit)}`)} ש״ח. ${n2} מבחנות: ${M(`${n2} × ${money(unit)} = ${money(p2)}`)} ש״ח.`,
      });
    }
    if (L === 2) {
      if (t === 0) {
        let n, d, v, km, min;
        do {
          n = pick([25000, 50000, 100000, 20000]);
          d = rnd(2, 12);
          v = pick([4, 5, 6, 10, 12, 15, 20]);
          km = (d * n) / 100000;
          min = (km / v) * 60;
        } while (!Number.isInteger(min) || min < 10);
        return fieldsRound({
          prompt: `על מפה בקנה מידה ${S(n)}, הדרך מהמעבדה לארון של מנה היא ${d} ס״מ. רובוט נוסע בה במהירות ${v} קמ״ש. כמה דקות תימשך הנסיעה?`,
          fields: [['', min, 'דקות']], dec: true,
          hints: ['שני שלבים: קודם המרחק האמיתי בק״מ, ואז הזמן.', `המרחק: ${M(`${d} × ${big(n)} = ${big(d * n)}`)} ס״מ = ${nf(km)} ק״מ. הזמן בשעות הוא ${M(`${nf(km)} ÷ ${v}`)}, ובדקות: כפול 60.`],
          explain: `מרחק: ${M(`${d} × ${big(n)} = ${big(d * n)}`)} ס״מ = ${nf(km)} ק״מ. זמן: ${M(`${nf(km)} ÷ ${v} × 60 = ${min}`)} דקות.`,
        });
      }
      if (t === 1) {
        const [p, q] = pick([[1, 4], [1, 3], [1, 9], [3, 7], [1, 1], [2, 3], [1, 19], [3, 17], [1, 7], [3, 5], [2, 8]]), c = (p / (p + q)) * 100, sol = pick(SOLUTE);
        return fieldsRound({
          prompt: `בתמיסה של מנה, היחס בין ה${sol} למים הוא ${R(p, q)}. מה הריכוז של התמיסה?`,
          fields: [['', clean(c), '%']], dec: true,
          wrongMsg: v => (wrong(v, (p / q) * 100) ? 'הריכוז הוא חלק מכל התמיסה, לא מהמים בלבד.' : ''),
          hints: [`על כל ${p} גרם ${sol} יש ${q} גרם מים. כמה שוקלת כל התמיסה?`, `${p} מתוך ${p + q}: ${M(`${p} ÷ ${p + q} × 100`)}.`],
          explain: `${p} גרם ${sol} מתוך ${M(`${p} + ${q} = ${p + q}`)} גרם תמיסה: ${M(`${p} ÷ ${p + q} × 100 = ${nf(c)}%`)}.`,
        });
      }
      if (t === 2) {
        let p, q, k;
        do {
          [p, q] = coprime(9);
          k = rnd(2, 12);
        } while (p >= q || (q - p) % 2 !== 0 && k % 2 !== 0 || (p + q) * k > 200);
        const T = (p + q) * k, x = ((q - p) * k) / 2;
        return fieldsRound({
          prompt: `בשתי מבחנות יש יחד ${T} מ״ל, ביחס ${R(p, q)}. כמה מ״ל צריך למזוג מהמבחנה המלאה יותר לשנייה, כדי שבשתיהן תהיה אותה כמות?`,
          fields: [['', x, 'מ״ל']], dec: true,
          hints: [`מצאו קודם כמה יש בכל מבחנה: ${p + q} חלקים, כל חלק ${M(`${T} ÷ ${p + q} = ${k}`)} מ״ל.`, `יש ${p * k} ו־${q * k} מ״ל. בסוף בכל אחת יהיה ${M(`${T} ÷ 2 = ${nf(T / 2)}`)}.`],
          explain: `במבחנות ${M(`${p} × ${k} = ${p * k}`)} ו־${M(`${q} × ${k} = ${q * k}`)} מ״ל. בסוף בכל אחת ${nf(T / 2)} מ״ל, לכן מוזגים ${M(`${q * k} − ${nf(T / 2)} = ${nf(x)}`)} מ״ל.`,
        });
      }
      const n1 = pick([3, 4, 5, 6]), unit = pick([1.5, 2.5, 3.5, 4.5, 1.2, 0.8]), n2 = pick([7, 9, 10, 11, 14]), p1 = clean(n1 * unit), p2 = clean(n2 * unit), budget = Math.ceil(p2) + rnd(0, 3);
      const most = Math.floor(budget / unit + 1e-9);
      return fieldsRound({
        prompt: `${n1} שקיות מלח עולות ${ils(p1)}. למנה יש ${ils(budget)}. כמה שקיות לכל היותר היא יכולה לקנות?`,
        fields: [['', most, 'שקיות']],
        hints: [`מחיר שקית אחת: ${M(`${money(p1)} ÷ ${n1}`)}.`, `שקית עולה ${ils(unit)}. כמה פעמים נכנס ${money(unit)} ב־${budget}?`],
        explain: `שקית אחת: ${M(`${money(p1)} ÷ ${n1} = ${money(unit)}`)} ש״ח. ${most} שקיות עולות ${ils(most * unit)}, ו־${most + 1} כבר עולות ${ils((most + 1) * unit)}, יותר מ־${budget}.`,
      });
    }
    if (t === 0) {
      let a, b, v;
      do {
        [a, b] = coprime(6);
        v = rnd(4, 30);
      } while (a >= b || a < 2 || !Number.isInteger((v * a) / b));
      return fieldsRound({
        prompt: `שני רובוטים נוסעים את אותה הדרך. היחס בין הזמנים שלהם הוא ${R(a, b)} (המהיר : האיטי). המהיר נוסע ${v} מטרים לדקה. מה המהירות של האיטי?`,
        fields: [['', (v * a) / b, 'מטרים לדקה']], dec: true,
        wrongMsg: x => (wrong(x, (v * b) / a) ? 'יצאה מהירות גבוהה יותר מהמהיר. מי שנוסע יותר זמן באותה דרך, איטי יותר.' : ''),
        hints: ['באותה דרך, פי 2 זמן פירושו חצי מהירות: היחס בין המהירויות הפוך ליחס בין הזמנים.', `היחס בין המהירויות (המהיר : האיטי) הוא ${R(b, a)}.`],
        explain: `נניח שהמהיר נוסע ${a} דקות והאיטי ${b} דקות. הדרך: ${M(`${v} × ${a} = ${v * a}`)} מטרים. מהירות האיטי: ${M(`${v * a} ÷ ${b} = ${nf((v * a) / b)}`)} מטרים לדקה.`,
      });
    }
    if (t === 1) {
      let a, b, p1, p2, r;
      do {
        [a, b] = coprime(4);
        p1 = pick([5, 10, 15, 20, 30, 40]);
        p2 = pick([5, 10, 15, 20, 30, 40]);
        r = (a * p1 + b * p2) / (a + b);
      } while (p1 === p2 || !near(Math.round(r * 10), r * 10));
      const sol = pick(SOLUTE);
      return fieldsRound({
        prompt: `מנה מערבבת תמיסת ${sol} בריכוז ${pct(p1)} עם תמיסת ${sol} בריכוז ${pct(p2)}, ביחס ${R(a, b)} (לפי הסדר הזה). מה הריכוז של התערובת?`,
        fields: [['', clean(r), '%']], dec: true,
        wrongMsg: x => (wrong(x, (p1 + p2) / 2) ? 'הכמויות לא שוות, אז אי אפשר פשוט לחשב ממוצע של הריכוזים.' : ''),
        hints: [`נסו מספרים: ${a * 100} גרם מהראשונה ו־${b * 100} גרם מהשנייה.`, `${sol}: ${M(`${a * p1} + ${b * p2} = ${a * p1 + b * p2}`)} גרם, מתוך ${(a + b) * 100} גרם תמיסה.`],
        explain: `ב־${a * 100} גרם מהראשונה יש ${a * p1} גרם ${sol}, וב־${b * 100} גרם מהשנייה יש ${b * p2}. יחד: ${M(`${a * p1 + b * p2} ÷ ${(a + b) * 100} × 100 = ${nf(r)}%`)}.`,
      });
    }
    if (t === 2) {
      let p, q, r, s, d, k;
      do {
        [p, q] = coprime(7);
        [r, s] = coprime(7);
        d = pick([4, 5, 6, 8, 10, 12, 15, 20]);
        k = (d * (r - s)) / (p * s - q * r);
      } while (p >= q || r >= s || p * s >= q * r || !Number.isInteger(k) || k < 1 || q * k > 150);
      return fieldsRound({
        prompt: `במבחנה א ובמבחנה ב יש תמיסה ביחס ${R(p, q)}. מנה הוסיפה ${d} מ״ל לכל אחת מהן, ועכשיו היחס הוא ${R(r, s)}. כמה מ״ל היו בכל מבחנה בהתחלה?`,
        fields: [['מבחנה א:', p * k, 'מ״ל'], ['מבחנה ב:', q * k, 'מ״ל']],
        hints: [`ההפרש בין המבחנות לא משתנה כשמוסיפים לשתיהן אותה כמות.`, `לפני: ההפרש הוא ${parts(q - p)} (ביחס ${R(p, q)}). אחרי: ${parts(s - r)} (ביחס ${R(r, s)}). חפשו גודל חלק שמתאים לשני המצבים.`],
        explain: `ההפרש בין המבחנות קבוע. בהתחלה הוא ${parts(q - p)} של ${k} מ״ל, ואחרי ההוספה ${parts(s - r)} של ${(q * k + d) / s} מ״ל: ${M(`${(q - p) * k} = ${(s - r) * ((q * k + d) / s)}`)}.<br>בהתחלה: ${M(`${p} × ${k} = ${p * k}`)} ו־${M(`${q} × ${k} = ${q * k}`)} מ״ל. בדיקה: ${R(p * k + d, q * k + d)} = ${R(r, s)}.`,
      });
    }
    const n = pick([500, 1000, 2000, 5000]), side = rnd(3, 8), realSide = (side * n) / 100;
    let A2;
    do A2 = pick([4, 9, 16, 25, 36]); while (A2 === side * side);
    const rs2 = Math.sqrt(A2), n2 = (realSide * 100) / rs2;
    if (Number.isInteger(n2) && Math.random() < 0.4)
      return {
        prompt: `חלקת ניסוי ריבועית שאורך הצלע שלה ${realSide} מטרים. על מפה, השטח שלה הוא ${A2} סמ״ר. מה קנה המידה של המפה?`,
        widget: inputs(M(`1 : ${box('a', 7)}`)), answer: { a: n2 }, check: v => v.a === n2,
        hints: [`ריבוע ששטחו ${A2} סמ״ר: מה אורך הצלע שלו במפה?`, `הצלע במפה ${rs2} ס״מ, ובמציאות ${realSide} מטרים = ${big(realSide * 100)} ס״מ.`],
        explain: `צלע במפה: ${rs2} ס״מ (כי ${M(`${rs2} × ${rs2} = ${A2}`)}). ${M(`${big(realSide * 100)} ÷ ${rs2} = ${big(n2)}`)}, לכן ${S(n2)}.`,
      };
    return fieldsRound({
      prompt: `על מפה בקנה מידה ${S(n)} מצוירת חלקת ניסוי ריבועית, שאורך הצלע שלה במפה ${side} ס״מ. על מפה אחרת, בקנה מידה ${S(n * 2)}, מה יהיה השטח של החלקה בסמ״ר?`,
      fields: [['', clean((side / 2) ** 2), 'סמ״ר']], dec: true,
      wrongMsg: v => (wrong(v, (side * side) / 2) ? 'האורך קטן פי 2, אבל השטח קטן פי יותר. גם האורך וגם הרוחב קטנים.' : ''),
      hints: [`במפה השנייה כל אורך קטן פי 2, כי ${big(n * 2)} הוא פי 2 מ־${big(n)}.`, `הצלע במפה השנייה: ${M(`${side} ÷ 2 = ${nf(side / 2)}`)} ס״מ.`],
      explain: `הצלע במפה השנייה: ${nf(side / 2)} ס״מ, והשטח: ${M(`${nf(side / 2)} × ${nf(side / 2)} = ${nf((side / 2) ** 2)}`)} סמ״ר (רבע מ־${side * side}).`,
    });
  },
};

export default {
  id: 'lratio', name: 'מעבדת התמיסות', icon: '⚗️', color: '#f472b6', boss: 'החשבונאית מנה',
  tagline: 'החשבונאים ערבבו את כל התמיסות. רק יחס נכון יחזיר לכל מבחנה את הצבע שלה.',
  challenges: [tube, recipe, share, mapScale, speed, buy, conc, table, boss],
};

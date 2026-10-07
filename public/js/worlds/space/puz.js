// ערפילית החידות
import { rnd, pick, shuffle, range, M, SYM } from '../../util.js';
import { inputs, box } from '../../widgets.js';
import { num, nums } from '../../kit.js';
import { scale, rep, W, critterIcon } from '../../visuals.js';

const sumOf = a => a.reduce((s, x) => s + x, 0);
const digitsOf = n => String(n).split('').map(Number);
const isSq = n => Number.isInteger(Math.sqrt(n));
const isPrime = n => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};

// ---------- 1. sequences ----------
// each rule returns [term(i), explanation]
const RULES = {
  1: [
    () => { const a = rnd(1, 20), d = rnd(2, 9); return [i => a + d * i, `מוסיפים ${d} בכל צעד.`]; },
    () => { const d = rnd(2, 9), a = d * 7 + rnd(1, 20); return [i => a - d * i, `מחסירים ${d} בכל צעד.`]; },
    () => { const a = rnd(1, 5); return [i => a * 2 ** i, 'מכפילים ב־2 בכל צעד.']; },
    () => { const a = rnd(1, 9), d = pick([11, 15, 20, 25]); return [i => a + d * i, `מוסיפים ${d} בכל צעד.`]; },
  ],
  2: [
    () => { const a = rnd(1, 9), k = rnd(1, 3); return [i => a + (k * i * (i + 1)) / 2, `ההפרשים גדלים בכל צעד: ${k}, ${2 * k}, ${3 * k}, ${4 * k}...`]; },
    () => { const s = rnd(1, 4); return [i => (i + s) ** 2, `מספרים ריבועיים לפי הסדר: ${s}², ${s + 1}², ${s + 2}²...`]; },
    () => { const a = rnd(1, 4); return [i => a * 3 ** i, 'מכפילים ב־3 בכל צעד.']; },
    () => { const p = rnd(4, 9), q = rnd(1, p - 1), a = rnd(5, 20); return [i => a + Math.ceil(i / 2) * p - Math.floor(i / 2) * q, `לסירוגין: מוסיפים ${p}, ואז מחסירים ${q}.`]; },
    () => { const t = [rnd(1, 4), rnd(2, 6)]; for (let i = 2; i < 7; i++) t.push(t[i - 1] + t[i - 2]); return [i => t[i], 'כל מספר הוא הסכום של שני המספרים שלפניו.']; },
    () => { const a = rnd(1, 9), b = rnd(30, 50), d = rnd(2, 5), e = rnd(2, 5); return [i => (i % 2 ? b - (e * (i - 1)) / 2 : a + (d * i) / 2), `שתי סדרות שזורות זו בזו: אחת עולה ב־${d}, והשנייה יורדת ב־${e}.`]; },
  ],
  3: [
    () => { const s = rnd(1, 4); return [i => ((i + s) * (i + s + 1)) / 2, `ההפרשים גדלים ב־1 בכל צעד: ${s + 1}, ${s + 2}, ${s + 3}... (מספרים משולשיים)`]; },
    () => { const c = pick([1, 2, 3, -1]); return [i => (i + 1) ** 2 + c, `כל מספר הוא מספר ריבועי ${c > 0 ? `ועוד ${c}` : 'פחות 1'}: 1², 2², 3²...`]; },
    () => { const c = pick([1, -1, 3]), t = [rnd(2, 5)]; for (let i = 1; i < 7; i++) t.push(2 * t[i - 1] + c); return [i => t[i], `מכפילים ב־2 ואז ${c > 0 ? `מוסיפים ${c}` : 'מחסירים 1'}.`]; },
    () => [i => (i + 1) ** 3, 'חזקות שלישיות לפי הסדר: 1³, 2³, 3³...'],
    () => { const a = rnd(1, 9), d = rnd(1, 4), e = rnd(2, 4); return [i => a + d * i + (e * i * (i - 1)) / 2, `ההפרשים עצמם גדלים ב־${e} בכל צעד: ${d}, ${d + e}, ${d + 2 * e}...`]; },
    () => { const p = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31], s = rnd(0, 4); return [i => p[i + s], 'מספרים ראשוניים לפי הסדר.']; },
    () => { const s = rnd(1, 3); return [i => (i + s) * (i + s + 1), `מכפלות של מספרים עוקבים: ${M(`${s} × ${s + 1}`)}, ${M(`${s + 1} × ${s + 2}`)}...`]; },
  ],
};
const sequences = {
  id: 'puz-seq', title: 'סדרות',
  intro: `<p>בכל סדרה מסתתרת חוקיות. מגלים אותה, וממשיכים את הסדרה.</p>
    <div class="ex">${M('3, 7, 11, 15, …')} מוסיפים 4 בכל צעד, לכן ההמשך הוא 19 ו־23.</div>
    <p>טיפ: רשמו את ההפרשים בין מספרים שכנים. אם ההפרשים לא קבועים, אולי גם בהם יש חוקיות, ואולי מדובר בכפל.</p>`,
  gen(L) {
    const [term, why] = pick(RULES[L])(), shown = L === 1 ? 4 : 5, t = range(shown + 2, term);
    // at level 3 the gaps are sometimes in the middle
    const gaps = L === 3 && Math.random() < 0.4 ? [2, shown + 1] : [shown, shown + 1];
    const html = t.map((v, i) => (gaps.includes(i) ? box('g' + gaps.indexOf(i), String(v).length + 1) : `<span>${v}</span>`)).join('<span>,</span>');
    return {
      prompt: 'גלו את החוקיות והשלימו את המספרים החסרים.',
      widget: inputs(`<div class="seq">${html}</div>`), answer: { g0: t[gaps[0]], g1: t[gaps[1]] }, check: v => v.g0 === t[gaps[0]] && v.g1 === t[gaps[1]],
      hints: ['חשבו את ההפרש בין כל שני מספרים שכנים. האם הוא קבוע? ואם לא, איך הוא משתנה?', why],
      explain: `${why} המספרים החסרים: ${t[gaps[0]]} ו־${t[gaps[1]]}.`,
    };
  },
};

// ---------- 2. number pyramid ----------
// givens are "row,col" with row 0 at the bottom; every pattern has exactly one solution
const PYR = {
  1: [[3, ['0,0', '0,1', '0,2']]],
  2: [[3, ['0,0', '1,0', '1,1']], [3, ['2,0', '1,0', '0,2']], [3, ['1,0', '0,1', '2,0']], [3, ['1,1', '0,1', '2,0']], [4, ['0,0', '1,0', '1,1', '1,2']], [4, ['3,0', '2,0', '1,2', '0,3']], [4, ['2,0', '1,2', '0,1', '3,0']]],
  3: [[3, ['2,0', '0,0', '0,2']], [4, ['3,0', '0,0', '0,1', '0,3']], [4, ['2,0', '2,1', '0,0', '0,3']]],
};
const pyramid = {
  id: 'puz-pyramid', title: 'פירמידת מספרים',
  intro: `<p>בפירמידת מספרים, כל לבנה שווה ל<b>סכום שתי הלבנות שמתחתיה</b>.</p>
    <div class="ex">אם למטה יש 3 ו־5, הלבנה שמעליהן היא 8.</div>
    <p>לפעמים צריך לעבוד גם הפוך: אם הלבנה העליונה היא 8 ואחת מהתחתונות היא 3, השנייה היא ${M('8 − 3 = 5')}.</p>`,
  gen(L) {
    const [n, given] = pick(PYR[L]), g = [range(n, () => rnd(1, L === 1 ? 12 : n === 4 ? 9 : 15))];
    for (let r = 1; r < n; r++) g.push(range(n - r, c => g[r - 1][c] + g[r - 1][c + 1]));
    const rowsHTML = fill => range(n, i => n - 1 - i).map(r => `<div class="prow">${g[r].map((v, c) => fill(r, c, v)).join('')}</div>`).join('');
    const cell = v => `<span class="pcell">${v}</span>`, answer = {};
    const html = rowsHTML((r, c, v) => {
      if (given.includes(`${r},${c}`)) return cell(v);
      answer[`p${r}_${c}`] = v;
      return box(`p${r}_${c}`, String(v).length + (L === 1 ? 1 : 0) || 1);
    });
    const blankBottom = range(n).find(c => !given.includes(`0,${c}`));
    return {
      prompt: 'השלימו את הפירמידה. כל לבנה שווה לסכום שתי הלבנות שמתחתיה.',
      widget: inputs(`<div class="pyr">${html}</div>`), answer, tries: 3,
      // any filling that obeys the rule is accepted
      check: v => {
        const at = (r, c) => (given.includes(`${r},${c}`) ? g[r][c] : v[`p${r}_${c}`]);
        return range(n - 1, r => r + 1).every(r => g[r].every((_, c) => at(r, c) === at(r - 1, c) + at(r - 1, c + 1)));
      },
      hints: [L === 1 ? 'התחילו מהשורה התחתונה ועלו למעלה.' : L === 2 ? 'חפשו שלישייה (לבנה ושתיים שמתחתיה) שכבר ידועות בה שתי לבנות. את השלישית מוצאים בחיבור או בחיסור.' : 'כאן אי אפשר להתקדם ישר. נחשו מספר ללבנה ריקה בשורה התחתונה, מלאו את השאר ובדקו אם הקודקוד מסתדר. אם לא, תקנו את הניחוש.',
        blankBottom == null ? 'כל לבנה בשורה השנייה היא סכום של שתי לבנות מהשורה התחתונה.' : `בשורה התחתונה, הלבנה ה־${blankBottom + 1} משמאל היא ${g[0][blankBottom]}.`],
      explain: `<div class="pyr">${rowsHTML((r, c, v) => cell(v))}</div>`,
    };
  },
};

// ---------- 3. magic square ----------
const LO_SHU = [2, 7, 6, 9, 5, 1, 4, 3, 8];
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const OPPOSITE = [[0, 8], [1, 7], [2, 6], [3, 5]];
const magic = {
  id: 'puz-magic', title: 'ריבוע קסם',
  intro: `<p>בריבוע קסם, הסכום של כל שורה, כל עמודה ושני האלכסונים הוא <b>אותו מספר</b>.</p>
    <p>סוד שימושי לריבוע קסם של 3 על 3: המספר שבאמצע הוא תמיד <b>שליש</b> מהסכום. למשל, אם הסכום 15, באמצע חייב להיות 5.</p>
    <p>ועוד סוד: שני מספרים שנמצאים זה מול זה, משני צידי האמצע, משלימים תמיד לאותו סכום.</p>`,
  gen(L) {
    // a random symmetry of the Lo Shu square, stretched and shifted
    let q = [...LO_SHU];
    for (let k = rnd(0, 3); k > 0; k--) q = [6, 3, 0, 7, 4, 1, 8, 5, 2].map(i => q[i]);
    if (Math.random() < 0.5) q = [2, 1, 0, 5, 4, 3, 8, 7, 6].map(i => q[i]);
    const m = rnd(1, L), k = rnd(0, L === 1 ? 5 : 10);
    q = q.map(v => m * v + k);
    const S = 3 * q[4], oneOfEach = n => shuffle(OPPOSITE).slice(0, n).map(p => pick(p));
    const given = L === 1 ? [4, ...oneOfEach(4)] : L === 2 ? oneOfEach(3) : Math.random() < 0.5 ? [4, ...oneOfEach(2)] : pick([[0, 1, 2], [6, 7, 8], [0, 3, 6], [2, 5, 8]]);
    const answer = {}, grid = fill => `<div class="mgrid">${q.map((v, i) => fill(i, v)).join('')}</div>`, cell = v => `<span class="pcell">${v}</span>`;
    const html = grid((i, v) => {
      if (given.includes(i)) return cell(v);
      answer['m' + i] = v;
      return box('m' + i, 2);
    });
    return {
      prompt: L < 3 ? `השלימו את ריבוע הקסם. הסכום בכל שורה, בכל עמודה ובשני האלכסונים הוא ${S}.` : 'השלימו את ריבוע הקסם. הסכום בכל שורה, בכל עמודה ובשני האלכסונים שווה, אבל הפעם לא מגלים לכם מהו.',
      widget: inputs(html), answer, tries: 3,
      check: v => {
        const at = i => (given.includes(i) ? q[i] : v['m' + i]), sums = LINES.map(l => sumOf(l.map(at)));
        return sums.every(x => x === sums[0]) && (L === 3 || sums[0] === S);
      },
      hints: [L === 1 ? 'חפשו שורה, עמודה או אלכסון שחסר בהם רק מספר אחד.' : 'בריבוע קסם של 3 על 3, המספר שבאמצע הוא תמיד שליש מהסכום.', L === 1 ? `כל שלישייה צריכה להסתכם ל־${S}.` : `הסכום הוא ${S}, ובאמצע נמצא ${q[4]}.`],
      explain: `הסכום בכל כיוון הוא ${S}:<br>${grid((i, v) => cell(v))}`,
    };
  },
};

// ---------- 4. balance scales ----------
const scales = {
  id: 'puz-scales', title: 'מאזניים',
  intro: `<p>המאזניים מאוזנים: מה שיש בצד אחד שוקל בדיוק כמו מה שיש בצד השני. כל החייזרים מאותו צבע שוקלים אותו דבר.</p>
    <p>הטריק: מותר להוריד <b>אותו דבר משני הצדדים</b>, והמאזניים נשארים מאוזנים.</p>
    <div class="ex">שני חייזרים ומשקולת 3 שוקלים כמו משקולת 11. מורידים 3 משני הצדדים: שני חייזרים שוקלים 8, אז כל אחד שוקל 4.</div>`,
  gen(L) {
    const x = rnd(2, 9), A = critterIcon('A'), B = critterIcon('B');
    if (L === 1) {
      const k = rnd(2, 4), w = rnd(1, 9);
      return num({
        prompt: `המאזניים מאוזנים. כמה שוקל חייזר ירוק ${A} אחד?`, visual: scale([...rep('A', k), W(w)], [W(k * x + w)]), answer: x,
        hints: [`הורידו ${w} משני הצדדים. מה נשאר?`, `${k} חייזרים שוקלים יחד ${M(`${k * x + w} − ${w} = ${k * x}`)}.`], explain: M(`${k * x} ÷ ${k} = ${x}`),
      });
    }
    if (L === 2) {
      const b = rnd(1, 2), a = b + rnd(1, 3), w1 = rnd(1, 8), w2 = (a - b) * x + w1;
      return num({
        prompt: `המאזניים מאוזנים. כמה שוקל חייזר ירוק ${A} אחד?`, visual: scale([...rep('A', a), W(w1)], [...rep('A', b), W(w2)]), answer: x,
        hints: [`הורידו ${b === 1 ? 'חייזר אחד' : b + ' חייזרים'} משני הצדדים, וגם ${w1} משני הצדדים.`, `נשאר: ${a - b === 1 ? 'חייזר אחד שוקל' : a - b + ' חייזרים שוקלים'} ${M(`${w2} − ${w1} = ${w2 - w1}`)}.`],
        explain: M(`${w2 - w1} ÷ ${a - b} = ${x}`),
      });
    }
    let y;
    do y = rnd(1, 9); while (y === x);
    const t = rnd(0, 1), big = Math.max(x, y), small = Math.min(x, y), bigK = x > y ? 'A' : 'B', smallK = x > y ? 'B' : 'A';
    const second = t === 0 ? scale([{ k: bigK }], [{ k: smallK }, W(big - small)]) : scale([...rep('A', 2), { k: 'B' }], [W(2 * x + y)]);
    return nums({
      prompt: 'שני המאזניים מאוזנים. כמה שוקל כל חייזר?', visual: scale([{ k: 'A' }, { k: 'B' }], [W(x + y)]) + second,
      fields: [[`ירוק ${A}:`, x], [`סגול ${B}:`, y]],
      hints: [t === 0 ? 'במאזניים הראשונים, החליפו את החייזר הכבד במה שכתוב שהוא שווה לו במאזניים השניים.' : 'השוו בין שני המאזניים: מה נוסף במאזניים השניים, ובכמה גדל המשקל?',
        t === 0 ? `שני חייזרים קלים ועוד ${big - small} שוקלים ${x + y}.` : `במאזניים השניים נוסף חייזר ירוק אחד, והמשקל גדל ב־${M(`${2 * x + y} − ${x + y} = ${x}`)}.`],
      explain: `ירוק שוקל ${x} וסגול שוקל ${y}. בדיקה: ${M(`${x} + ${y} = ${x + y}`)}.`,
    });
  },
};

// ---------- 5. cryptarithms ----------
const LETTERS = 'אבגדהוזחטי';
function solveCrypt(words, letters) {
  const lead = new Set(words.map(w => w[0])), out = [], used = Array(10).fill(false), asg = {};
  const val = w => w.reduce((s, l) => s * 10 + asg[l], 0);
  const rec = i => {
    if (out.length > 60) return;
    if (i === letters.length) {
      if (val(words[0]) + val(words[1]) === val(words[2])) out.push({ ...asg });
      return;
    }
    for (let d = 0; d < 10; d++) {
      if (used[d] || (d === 0 && lead.has(letters[i]))) continue;
      used[d] = true;
      asg[letters[i]] = d;
      rec(i + 1);
      used[d] = false;
    }
  };
  rec(0);
  return out;
}
// A letter sum with exactly one solution, revealing as few letters as possible (two at most).
function makeCrypt(len) {
  for (;;) {
    const x = rnd(10 ** (len - 1), 10 ** len - 1), y = rnd(10 ** (len - 1), 10 ** len - 1), digits = [...new Set(`${x}${y}${x + y}`)];
    if (digits.length > 5 || digits.length < 3) continue;
    const map = Object.fromEntries(shuffle(digits).map((d, i) => [d, LETTERS[i]])), enc = n => [...String(n)].map(d => map[d]);
    const words = [enc(x), enc(y), enc(x + y)], letters = digits.map(d => map[d]), truth = Object.fromEntries(digits.map(d => [map[d], +d]));
    let sols = solveCrypt(words, letters);
    if (sols.length > 60) continue;
    const given = [];
    for (const l of shuffle(letters)) {
      if (sols.length === 1 || given.length === 2) break;
      given.push(l);
      sols = sols.filter(s => s[l] === truth[l]);
    }
    if (sols.length === 1 && letters.length - given.length >= 2) return { words, letters, given, truth, x, y };
  }
}
const SHAPES = ['★', '▲', '●'];
const crypt = {
  id: 'puz-crypt', title: 'חשבון מוצפן',
  intro: `<p>בחשבון מוצפן, כל סימן או אות מסתירים מספר. אותו סימן הוא תמיד אותו מספר.</p>
    <div class="ex">${M('★ + ★ = 10')} ← ★ הוא 5.<br>${M('★ + ▲ = 8')} ← ▲ הוא 3.</div>
    <p>ברמות הגבוהות יש תרגיל חיבור שבו כל ספרה הוחלפה באות. אותיות שונות הן ספרות שונות, ומספר אף פעם לא מתחיל ב־0.</p>`,
  gen(L) {
    if (L === 1) {
      const [a, b, c] = shuffle(range(8, i => i + 2)), [s1, s2, s3] = SHAPES;
      const rows = [
        pick([`${s1} + ${s1} = ${2 * a}`, `${s1} + ${s1} + ${s1} = ${3 * a}`, `${s1} × ${s1} = ${a * a}`]),
        pick([`${s1} + ${s2} = ${a + b}`, `${s1} × ${s2} = ${a * b}`]),
        pick([`${s2} + ${s3} = ${b + c}`, `${s2} × ${s3} = ${b * c}`, `${s1} + ${s2} + ${s3} = ${a + b + c}`]),
      ];
      return {
        prompt: 'כל צורה מסתירה מספר. גלו את שלושת המספרים.', visual: `<div class="eqs" dir="ltr">${rows.map(r => `<div>${r}</div>`).join('')}</div>`,
        widget: inputs(`<div class="crypt-in">${SHAPES.map((s, i) => M(`${s} = ${box('s' + i, 2)}`)).join('')}</div>`),
        answer: { s0: a, s1: b, s2: c }, check: v => v.s0 === a && v.s1 === b && v.s2 === c,
        hints: ['התחילו מהשורה שיש בה רק צורה אחת.', `${M(`${s1} = ${a}`)}. עכשיו הציבו אותו בשורה השנייה.`],
        explain: M(`${s1} = ${a}, ${s2} = ${b}, ${s3} = ${c}`),
      };
    }
    const { words, letters, given, truth, x, y } = makeCrypt(L), cols = words[2].length + 1, ask = letters.filter(l => !given.includes(l));
    const row = (w, sign = '') => `<span>${sign}</span>${range(cols - 1 - w.length, () => '<span></span>').join('')}${w.map(l => `<span>${l}</span>`).join('')}`;
    const sheet = `<div class="crypt big" style="grid-template-columns:repeat(${cols},auto)">${row(words[0])}${row(words[1], '+')}<span class="rule"></span>${row(words[2])}</div>`;
    return {
      prompt: `כל אות מסתירה ספרה. אותיות שונות הן ספרות שונות, ומספר לא מתחיל ב־0.${given.length ? ` ידוע ש: ${given.map(l => M(`${l} = ${truth[l]}`)).join(', ')}.` : ''}`,
      visual: sheet,
      widget: inputs(`<div class="crypt-in">${ask.map(l => M(`${l} = ${box(l, 1)}`)).join('')}</div>`), answer: Object.fromEntries(ask.map(l => [l, truth[l]])), tries: 3,
      check: v => {
        const asg = { ...truth, ...v }, val = w => w.reduce((s, l) => s * 10 + asg[l], 0);
        return new Set(letters.map(l => asg[l])).size === letters.length && words.every(w => asg[w[0]] !== 0) && val(words[0]) + val(words[1]) === val(words[2]);
      },
      hints: [words[2].length > words[0].length ? 'התוצאה ארוכה בספרה אחת מהמחוברים. הספרה השמאלית שלה חייבת להיות 1.' : 'התחילו מעמודת האחדות: איזו ספרה ועוד איזו ספרה נותנות את ספרת האחדות של התוצאה?', M(`${ask[0]} = ${truth[ask[0]]}`)],
      explain: M(`${x} + ${y} = ${x + y}`),
    };
  },
};

// ---------- 6. KenKen ----------
const LATIN = {};
function latins(n) {
  if (LATIN[n]) return LATIN[n];
  const out = [], g = range(n, () => Array(n).fill(0));
  const rec = k => {
    if (k === n * n) return out.push(g.map(r => [...r]));
    const r = Math.floor(k / n), c = k % n;
    for (let v = 1; v <= n; v++) {
      if (g[r].includes(v) || g.some(row => row[c] === v)) continue;
      g[r][c] = v;
      rec(k + 1);
      g[r][c] = 0;
    }
  };
  rec(0);
  return (LATIN[n] = out);
}
const cageOK = (cg, v) => {
  const hi = Math.max(...v), lo = Math.min(...v);
  return cg.op === '' ? v[0] === cg.target : cg.op === '+' ? sumOf(v) === cg.target : cg.op === '*' ? v.reduce((s, x) => s * x, 1) === cg.target : cg.op === '-' ? hi - lo === cg.target : hi === lo * cg.target;
};
// A grid split into cages whose clues allow exactly one Latin square.
function makeKen(n, ops, maxCage) {
  const all = latins(n);
  for (;;) {
    const sol = pick(all), cage = range(n, () => Array(n).fill(-1)), cages = [];
    for (const k of shuffle(range(n * n))) {
      const r = Math.floor(k / n), c = k % n;
      if (cage[r][c] >= 0) continue;
      const cellsIn = [[r, c]], size = pick(maxCage === 2 ? [1, 2, 2, 2] : [1, 2, 2, 2, 3, 3]);
      cage[r][c] = cages.length;
      while (cellsIn.length < size) {
        const free = cellsIn.flatMap(([a, b]) => [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]]).filter(([a, b]) => a >= 0 && a < n && b >= 0 && b < n && cage[a][b] < 0);
        if (!free.length) break;
        const [a, b] = pick(free);
        cage[a][b] = cages.length;
        cellsIn.push([a, b]);
      }
      const v = cellsIn.map(([a, b]) => sol[a][b]), hi = Math.max(...v), lo = Math.min(...v);
      const can = v.length === 1 ? [''] : [...ops].filter(o => o === '+' || o === '*' || (v.length === 2 && (o === '-' || hi % lo === 0)));
      const op = pick(can);
      cages.push({ cells: cellsIn, op, target: op === '' ? v[0] : op === '+' ? sumOf(v) : op === '*' ? v.reduce((s, x) => s * x, 1) : op === '-' ? hi - lo : hi / lo });
    }
    const fits = g => cages.every(cg => cageOK(cg, cg.cells.map(([a, b]) => g[a][b])));
    if (cages.filter(cg => cg.cells.length === 1).length <= n - 1 && all.filter(fits).length === 1) return { sol, cage, cages, fits };
  }
}
const kenken = {
  id: 'puz-kenken', title: 'קנקן',
  intro: `<p>קנקן הוא סודוקו עם חשבון. בלוח של 3 על 3 משתמשים במספרים 1, 2, 3, ובכל שורה ובכל עמודה כל מספר מופיע <b>פעם אחת בדיוק</b>.</p>
    <p>הלוח מחולק לאזורים עם קו עבה. בפינה של כל אזור כתובים מספר ופעולה: המספרים שבאזור צריכים לתת את המספר הזה בעזרת הפעולה.</p>
    <div class="ex">"${M('3+')}" בשתי משבצות: חייבים להיות 1 ו־2.<br>"${M('2−')}" בשתי משבצות: שני מספרים שההפרש ביניהם 2.<br>מספר בלי פעולה: זה המספר שבמשבצת.</div>`,
  gen(L) {
    const n = L === 1 ? 3 : L === 2 ? pick([3, 4]) : 4, ops = L === 1 || (L === 2 && n === 4) ? '+' : '+-*/';
    const { sol, cage, cages, fits } = makeKen(n, ops, L === 1 ? 2 : 3), answer = {};
    let html = '';
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        const cg = cages[cage[r][c]], first = cg.cells.reduce((m, p) => (p[0] * n + p[1] < m[0] * n + m[1] ? p : m));
        const cls = (r && cage[r - 1][c] !== cage[r][c] ? ' bt' : '') + (c && cage[r][c - 1] !== cage[r][c] ? ' bl' : '');
        answer[`k${r}${c}`] = sol[r][c];
        html += `<div class="kcell${cls}">${first[0] === r && first[1] === c ? `<small>${cg.target}${cg.op ? SYM[cg.op] : ''}</small>` : ''}${box(`k${r}${c}`, 1)}</div>`;
      }
    const single = cages.find(cg => cg.cells.length === 1);
    return {
      prompt: `מלאו את הלוח במספרים 1 עד ${n}. בכל שורה ובכל עמודה כל מספר מופיע פעם אחת, ובכל אזור המספרים נותנים את התוצאה שכתובה בפינה.`,
      widget: inputs(`<div class="kk" style="grid-template-columns:repeat(${n},auto)">${html}</div>`), answer, tries: 3,
      check: v => {
        const g = range(n, r => range(n, c => v[`k${r}${c}`])), full = a => new Set(a).size === n && a.every(x => x >= 1 && x <= n);
        return g.every(full) && range(n, c => g.map(row => row[c])).every(full) && fits(g);
      },
      hints: [single ? 'התחילו ממשבצת שיש בה מספר בלי פעולה, ומאזורים שיש להם רק אפשרות אחת.' : 'חפשו אזור שיש לו רק אפשרות אחת. למשל, סכום 3 בשתי משבצות חייב להיות 1 ו־2.', `במשבצת השמאלית העליונה נמצא ${sol[0][0]}.`],
      explain: `<div class="eqs" dir="ltr">${sol.map(r => `<div>${r.join(' &nbsp; ')}</div>`).join('')}</div>`,
    };
  },
};

// ---------- 7. word problems ----------
const words = {
  id: 'puz-words', title: 'בעיות מילוליות',
  intro: `<p>חידות מהסוג הזה נפתרות בעזרת מחשבה מסודרת, לא בעזרת ניחושים.</p>
    <div class="ex"><b>טריק "נניח ש...":</b> בחווה יש תרנגולות וארנבות, 5 ראשים ו־14 רגליים. נניח שכולן תרנגולות: היו 10 רגליים. חסרות 4, וכל ארנבת מוסיפה 2. לכן יש 2 ארנבות.</div>
    <p>עוד כלים: לעבוד מהסוף להתחלה, ולצייר את הבעיה.</p>`,
  gen(L) {
    const t = rnd(0, 5);
    if (L === 1) {
      if (t < 2) {
        const two = rnd(2, 6), four = rnd(2, 6), H = two + four, legs = 2 * two + 4 * four;
        return num({
          prompt: `בחוות החלל יש חייזרים עם 2 רגליים וחייזרים עם 4 רגליים. יחד יש להם ${H} ראשים ו־${legs} רגליים. כמה חייזרים עם 4 רגליים יש?`, answer: four,
          hints: ['נניח שלכל החייזרים יש 2 רגליים. כמה רגליים היו אז?', `היו ${2 * H} רגליים. חסרות ${legs - 2 * H}, וכל חייזר עם 4 רגליים מוסיף 2.`], explain: M(`(${legs} − ${2 * H}) ÷ 2 = ${four}`),
        });
      }
      if (t < 4) {
        const y = rnd(3, 15), d = rnd(1, 5) * 2, S = 2 * y + d;
        return num({
          prompt: `לזופי ולבלופ יש יחד ${S} כוכבים. לזופי יש ${d} כוכבים יותר מאשר לבלופ. כמה כוכבים יש לזופי?`, answer: y + d,
          hints: [`אם מורידים מזופי ${d} כוכבים, לשניהם יש אותו מספר.`, `${M(`${S} − ${d} = ${S - d}`)}, וחצי מזה (${y}) יש לבלופ.`], explain: `לבלופ ${y}, ולזופי ${M(`${y} + ${d} = ${y + d}`)}.`,
        });
      }
      const n = rnd(2, 12), a = rnd(2, 5), b = rnd(1, 20);
      return num({
        prompt: `חושבים על מספר. מכפילים אותו ב־${a}, מוסיפים ${b}, ומקבלים ${a * n + b}. מה המספר?`, answer: n,
        hints: ['עבדו מהסוף להתחלה, עם הפעולות ההפוכות.', `קודם מחסירים ${b} ומקבלים ${a * n}. עכשיו מחלקים ב־${a}.`], explain: M(`(${a * n + b} − ${b}) ÷ ${a} = ${n}`),
      });
    }
    if (L === 2) {
      if (t < 2) {
        const three = rnd(2, 7), five = rnd(2, 7), H = three + five, legs = 3 * three + 5 * five;
        return num({
          prompt: `על כוכב רחוק חיים חייזרים עם 3 רגליים וחייזרים עם 5 רגליים. בקבוצה יש ${H} חייזרים ו־${legs} רגליים. כמה חייזרים עם 5 רגליים יש?`, answer: five,
          hints: ['נניח שלכולם יש 3 רגליים. כמה רגליים היו אז?', `היו ${3 * H} רגליים. חסרות ${legs - 3 * H}, וכל חייזר עם 5 רגליים מוסיף 2.`], explain: M(`(${legs} − ${3 * H}) ÷ 2 = ${five}`),
        });
      }
      if (t === 2) {
        const n2 = rnd(2, 8), n5 = rnd(2, 8), N = n2 + n5, T = 2 * n2 + 5 * n5;
        return num({
          prompt: `בארנק יש ${N} מטבעות. חלקם של 2 שקלים וחלקם של 5 שקלים, ויחד הם שווים ${T} שקלים. כמה מטבעות של 5 שקלים יש?`, answer: n5,
          hints: ['נניח שכל המטבעות הם של 2 שקלים. כמה כסף היה אז?', `היו ${2 * N} שקלים. חסרים ${T - 2 * N}, וכל מטבע של 5 מוסיף 3.`], explain: M(`(${T} − ${2 * N}) ÷ 3 = ${n5}`),
        });
      }
      if (t === 3) {
        const B = rnd(6, 12), x = rnd(3, 10), A = 2 * B + x;
        return num({
          prompt: `אבא בן ${A} ובנו בן ${B}. בעוד כמה שנים אבא יהיה מבוגר מבנו פי 2 בדיוק?`, answer: x,
          hints: ['הפרש הגילים בין אבא לבן לא משתנה אף פעם.', `ההפרש הוא ${A - B}. כשאבא מבוגר פי 2, גיל הבן שווה בדיוק להפרש.`], explain: `הבן יהיה בן ${A - B}, וזה יקרה בעוד ${M(`${A - B} − ${B} = ${x}`)} שנים.`,
        });
      }
      const m = rnd(5, 40);
      return num({
        prompt: `הסכום של שלושה מספרים עוקבים הוא ${3 * m}. מה המספר הגדול מביניהם?`, answer: m + 1,
        hints: ['המספר האמצעי הוא בדיוק שליש מהסכום.', `האמצעי: ${M(`${3 * m} ÷ 3 = ${m}`)}.`], explain: `המספרים הם ${m - 1}, ${m}, ${m + 1}.`,
      });
    }
    if (t === 0) {
      const n = rnd(5, 12);
      return num({
        prompt: `במסיבה יש ${n} חייזרים. כל אחד לוחץ יד לכל אחד מהאחרים, פעם אחת. כמה לחיצות ידיים יש בסך הכול?`, answer: (n * (n - 1)) / 2,
        hints: [`כל חייזר לוחץ ${n - 1} ידיים. אבל שימו לב: כל לחיצה שייכת לשני חייזרים.`, `${M(`${n} × ${n - 1} = ${n * (n - 1)}`)} סופר כל לחיצה פעמיים.`], explain: M(`${n} × ${n - 1} ÷ 2 = ${(n * (n - 1)) / 2}`),
      });
    }
    if (t === 1) {
      const u = rnd(3, 5), d = rnd(1, u - 1), D = rnd(10, 20), days = Math.ceil((D - u) / (u - d)) + 1;
      return num({
        prompt: `חילזון חלל נמצא בתחתית של בור שעומקו ${D} מטרים. בכל יום הוא מטפס ${u} מטרים, ובכל לילה הוא מחליק ${d} ${d === 1 ? 'מטר' : 'מטרים'} למטה. ביום הכמה הוא יוצא מהבור?`, answer: days,
        hints: [`ביממה שלמה הוא מתקדם רק ${u - d}. אבל ביום האחרון הוא יוצא ולא מחליק חזרה!`, `ביום האחרון מספיק שיתחיל מגובה ${D - u} לפחות.`],
        explain: `אחרי ${days - 1} יממות הוא בגובה ${(days - 1) * (u - d)}, וביום ה־${days} הוא מטפס ${u} ויוצא.`,
      });
    }
    if (t === 2) {
      const b = rnd(4, 12), k = rnd(2, 8);
      return num({
        prompt: `לשלושה חברים יש יחד ${4 * b + k} קלפים. לזופי יש פי 2 קלפים מאשר לבלופ, ולקיקי יש ${k} קלפים יותר מאשר לבלופ. כמה קלפים יש לבלופ?`, answer: b,
        hints: ['חשבו על הקלפים של בלופ כעל "חלק אחד". כמה חלקים יש לכל אחד?', `בלופ: חלק. זופי: 2 חלקים. קיקי: חלק ועוד ${k}. יחד: 4 חלקים ועוד ${k}.`], explain: M(`(${4 * b + k} − ${k}) ÷ 4 = ${b}`),
      });
    }
    if (t === 3) {
      const x = pick([6, 8, 10, 12, 16]);
      return num({
        prompt: `לפני ${x} שנים אמא הייתה מבוגרת מבתה פי 4. היום היא מבוגרת ממנה פי 2. בת כמה הבת היום?`, answer: 1.5 * x,
        hints: ['הפרש הגילים לא משתנה. היום ההפרש שווה לגיל הבת. מה היה ההפרש לפני, ביחס לגיל הבת אז?', `לפני ${x} שנים ההפרש היה פי 3 מגיל הבת. כלומר גיל הבת היום הוא פי 3 מגילה אז, והיא גדלה ב־${x} שנים.`],
        explain: `אז הבת הייתה בת ${x / 2}, והיום היא בת ${1.5 * x}. אמא: אז ${2 * x}, היום ${3 * x}.`,
      });
    }
    if (t === 4) {
      const a = rnd(1, 7), b = rnd(a + 1, 9);
      return num({
        prompt: `במספר דו־ספרתי, סכום הספרות הוא ${a + b}. כשהופכים את סדר הספרות, המספר גדל ב־${9 * (b - a)}. מה המספר המקורי?`, answer: 10 * a + b,
        hints: ['כשהופכים ספרות, המספר משתנה ב־9 כפול ההפרש בין הספרות.', `ההפרש בין הספרות הוא ${M(`${9 * (b - a)} ÷ 9 = ${b - a}`)}, והסכום שלהן ${a + b}.`], explain: `הספרות הן ${a} ו־${b}. המספר ${10 * a + b}, וההפוך ${10 * b + a}.`,
      });
    }
    let p, n;
    do [p, n] = [rnd(2, 6), rnd(3, 9)]; while (p === n);
    return num({
      prompt: `3 עטים ו־2 מחברות עולים יחד ${3 * p + 2 * n} שקלים. 2 עטים ו־3 מחברות עולים יחד ${2 * p + 3 * n} שקלים. כמה עולים יחד עט אחד ומחברת אחת?`, answer: p + n,
      hints: ['מה קורה אם קונים את שתי החבילות יחד? כמה עטים וכמה מחברות יש אז?', `יחד: 5 עטים ו־5 מחברות, שעולים ${5 * (p + n)} שקלים.`], explain: M(`${5 * (p + n)} ÷ 5 = ${p + n}`),
    });
  },
};

// ---------- 8. the secret number ----------
function makeSecret(L) {
  const [lo, hi] = [[10, 50], [10, 99], [100, 999]][L - 1], all = range(hi - lo + 1, i => lo + i);
  for (;;) {
    const s = rnd(lo, hi), ds = digitsOf(s), pool = [], add = (text, pred) => pool.push([text, pred]);
    add(s % 2 ? 'אני מספר אי־זוגי.' : 'אני מספר זוגי.', n => n % 2 === s % 2);
    for (const k of [3, 4, 5, 6, 7, 9, 11]) if (s % k === 0) add(`אני מתחלק ב־${k} בלי שארית.`, n => n % k === 0);
    if (L > 1) {
      const k = pick([3, 4, 5, 7]);
      if (s % k) add(`כשמחלקים אותי ב־${k}, נשארת שארית ${s % k}.`, n => n % k === s % k);
      if (isPrime(s)) add('אני מספר ראשוני.', isPrime);
      const prod = ds.reduce((a, b) => a * b, 1);
      add(`מכפלת הספרות שלי היא ${prod}.`, n => digitsOf(n).reduce((a, b) => a * b, 1) === prod);
    }
    if (isSq(s)) add('אני מספר ריבועי.', isSq);
    add(`סכום הספרות שלי הוא ${sumOf(ds)}.`, n => sumOf(digitsOf(n)) === sumOf(ds));
    if (L < 3) {
      const cmp = Math.sign(ds[0] - ds[1]);
      add(cmp > 0 ? 'ספרת העשרות שלי גדולה מספרת האחדות.' : cmp < 0 ? 'ספרת האחדות שלי גדולה מספרת העשרות.' : 'שתי הספרות שלי זהות.', n => Math.sign(Math.floor(n / 10) - (n % 10)) === cmp);
      const a = Math.floor(s / 10) * 10 - (L === 2 ? 10 * rnd(0, 1) : 0);
      add(`אני בין ${a} ל־${a + (L === 2 ? 20 : 10)}.`, n => n >= a && n <= a + (L === 2 ? 20 : 10));
    } else {
      const a = Math.floor(s / 100) * 100, distinct = new Set(ds).size;
      add(`אני בין ${a} ל־${a + 100}.`, n => n >= a && n <= a + 100);
      add(`ספרת האחדות שלי היא ${ds[2]}.`, n => n % 10 === ds[2]);
      add(distinct === 3 ? 'כל הספרות שלי שונות זו מזו.' : 'יש לי ספרה שמופיעה יותר מפעם אחת.', n => (new Set(digitsOf(n)).size === 3) === (distinct === 3));
      if (ds[0] === ds[2]) add('אני נקרא אותו דבר משמאל לימין ומימין לשמאל.', n => digitsOf(n)[0] === n % 10);
    }
    // keep adding clues that narrow the field, then drop any clue the others make unnecessary
    let cands = all, clues = [];
    for (const cl of shuffle(pool)) {
      const next = cands.filter(cl[1]);
      if (next.length < cands.length) {
        clues.push(cl);
        cands = next;
      }
      if (cands.length === 1) break;
    }
    if (cands.length !== 1) continue;
    for (let i = clues.length - 1; i >= 0; i--) {
      const rest = clues.filter((_, j) => j !== i);
      if (all.filter(n => rest.every(c => c[1](n))).length === 1) clues = rest;
    }
    if (clues.length >= 3 && clues.length <= 5) return { s, clues: clues.map(c => c[0]), lo, hi };
  }
}
const secret = {
  id: 'puz-secret', title: 'המספר הסודי',
  intro: `<p>מספר סודי נותן לכם רמזים על עצמו. רק מספר אחד מתאים לכל הרמזים יחד.</p>
    <div class="ex">"אני בין 10 ל־50. אני מספר ריבועי. אני אי־זוגי. סכום הספרות שלי 13." ← המספר הוא 49.</div>
    <p>מילון קצר: מספר <b>ריבועי</b> הוא מספר כפול עצמו (16, 25, 36...). מספר <b>ראשוני</b> מתחלק רק ב־1 ובעצמו (2, 3, 5, 7, 11...).</p>`,
  gen(L) {
    const { s, clues, lo, hi } = makeSecret(L), ten = Math.floor(s / 10) * 10;
    return num({
      prompt: `אני מספר שלם בין ${lo} ל־${hi}. מי אני?`, visual: `<ul class="clues" dir="rtl" style="text-align:start">${clues.map(c => `<li>${c}</li>`).join('')}</ul>`, answer: s,
      hints: ['התחילו מהרמז שמשאיר הכי מעט אפשרויות. רשמו את המספרים שמתאימים לו, ומחקו לפי שאר הרמזים.', `המספר נמצא בין ${ten} ל־${ten + 9}.`],
      explain: `המספר הוא ${s}. הוא היחיד שמתאים לכל הרמזים.`,
    });
  },
};

// ---------- 9. boss: one puzzle of each kind, at random ----------
const kinds = [sequences, pyramid, magic, scales, crypt, kenken, words, secret];
const boss = {
  id: 'puz-boss', title: 'בוס: החשבונאי הראשי',
  intro: `<p>הגעתם לחדר הכספות של החשבונאי הראשי. חמישה מנעולים שומרים עליו, ובכל מנעול חידה מסוג אחר מכל מה שפגשתם בערפילית: סדרות, פירמידות, ריבועי קסם, מאזניים, חשבון מוצפן, קנקן, בעיות מילוליות ומספרים סודיים.</p>
    <p>קחו את הזמן. אין שעון.</p>`,
  gen: L => pick(kinds).gen(L),
};

export default {
  id: 'puz', name: 'ערפילית החידות', color: '#f472b6', boss: 'החשבונאי הראשי',
  tagline: 'בערפילית הזאת שום דבר לא פשוט כמו שהוא נראה. כאן צריך לחשוב, לנסות ולבדוק.',
  challenges: [sequences, pyramid, magic, scales, crypt, kenken, words, secret, boss],
};

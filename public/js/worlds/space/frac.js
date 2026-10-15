// כוכב השברים
import { rnd, pick, gcd, lcm, M, fr, F, MX, showFrac } from '../../util.js';
import { inputs, box, choice, fracBuilder, numLine, lineSVG } from '../../widgets.js';
import { num, fracAns } from '../../kit.js';
import { pies, areaModel } from '../../visuals.js';

// random proper fraction in lowest terms
const red = (max, min = 2) => {
  let n, d;
  do {
    d = rnd(min, max);
    n = rnd(1, d - 1);
  } while (gcd(n, d) > 1);
  return [n, d];
};
const sameVal = (v, n, d) => v.d > 0 && v.n * d === v.d * n;

const pizza = {
  id: 'frac-pizza', title: 'חותכים פיצה',
  intro: `<p>שבר מתאר חלק מתוך שלם. ה<b>מכנה</b> (למטה) אומר לכמה חלקים שווים חתכנו, וה<b>מונה</b> (למעלה) אומר כמה חלקים לקחנו.</p>
    <div class="ex">${F(3, 4)} מהפיצה: חותכים ל־4 פרוסות שוות וצובעים 3.</div>
    <p>לחצו על + ועל − כדי לשנות את מספר הפרוסות, ולחצו על פרוסה כדי לצבוע אותה.</p>`,
  gen(L) {
    if (L === 1) {
      const [n, d] = red(8);
      return {
        prompt: `חתכו את הפיצה וצבעו ${F(n, d)} ממנה.`,
        widget: fracBuilder({ den: 2 }), answer: { n, d }, check: v => sameVal(v, n, d),
        hints: ['המכנה אומר לכמה פרוסות שוות לחתוך, והמונה אומר כמה לצבוע.', `חתכו ל־${d} פרוסות וצבעו ${n} מהן.`],
        explain: `חותכים ל־${d} פרוסות שוות וצובעים ${n} מהן.`,
      };
    }
    let n, d, m, shown;
    if (L === 2) {
      [n, d] = red(6);
      m = d * rnd(2, d <= 3 ? 4 : 2);
      shown = F(n, d);
    } else {
      const [a, b, s] = pick([[6, 8, 12], [4, 6, 9], [10, 15, 6], [9, 12, 8], [2, 8, 12], [6, 9, 12], [8, 12, 9], [4, 10, 5], [6, 10, 5], [3, 12, 8], [10, 12, 6], [12, 16, 12], [15, 20, 8], [6, 8, 4]]);
      const g = gcd(a, b);
      [n, d, m, shown] = [a / g, b / g, s, F(a, b)];
    }
    const k = m / d;
    return {
      prompt: `הפיצה כבר חתוכה ל־${m} פרוסות. צבעו ${shown} ממנה.`,
      widget: fracBuilder({ den: m, fixed: true }), answer: { n: n * k, d: m }, check: v => sameVal(v, n, d),
      hints: [L === 2 ? `כמה פרוסות הן ${F(1, d)} מהפיצה?` : `צמצמו קודם את השבר: ${shown} = ${F(n, d)}.`, `${F(1, d)} מהפיצה הוא ${k} פרוסות, כי ${M(`${m} ÷ ${d} = ${k}`)}.`],
      explain: `${shown} = ${F(n * k, m)}, לכן צובעים ${n * k} פרוסות.`,
    };
  },
};

const equiv = {
  id: 'frac-equiv', title: 'שברים שווי ערך',
  intro: `<p>אם מכפילים את המונה ואת המכנה <b>באותו מספר</b>, מקבלים שבר שנראה אחרת אבל שווה בדיוק לאותו חלק. זו <b>הרחבה</b>. אם מחלקים את שניהם באותו מספר, זה <b>צמצום</b>.</p>
    <div class="ex">${M(`${fr(2, 3)} = ${fr(4, 6)} = ${fr(6, 9)}`)}</div>`,
  gen(L) {
    let left, right, k, hint, explain;
    if (L === 1) {
      const [n, d] = red(6);
      k = rnd(2, 5);
      [left, right] = [[n, d], [n * k, d * k]];
      hint = 'במה הכפילו? הכפילו את המונה ואת המכנה באותו מספר.';
      explain = `מכפילים מונה ומכנה ב־${k}: ${M(`${fr(n, d)} = ${fr(n * k, d * k)}`)}`;
    } else if (L === 2) {
      const [n, d] = red(7);
      k = rnd(2, 6);
      [left, right] = [[n * k, d * k], [n, d]];
      hint = 'במה חילקו? חלקו את המונה ואת המכנה באותו מספר.';
      explain = `מחלקים מונה ומכנה ב־${k}: ${M(`${fr(n * k, d * k)} = ${fr(n, d)}`)}`;
    } else {
      const [n, d] = red(5), [k1, k2] = pick([[2, 3], [3, 2], [3, 4], [4, 3], [2, 5], [5, 2], [4, 6], [6, 4], [3, 5], [5, 3]]);
      [left, right] = [[n * k1, d * k1], [n * k2, d * k2]];
      hint = 'אי אפשר לעבור ישר משבר אחד לשני. צמצמו קודם את השבר השמאלי עד הסוף.';
      explain = `מצמצמים ואז מרחיבים: ${M(`${fr(...left)} = ${fr(n, d)} = ${fr(...right)}`)}`;
    }
    const top = Math.random() < 0.5, ans = top ? right[0] : right[1];
    const rhs = top ? fr(box('a', 3), right[1]) : fr(right[0], box('a', 3));
    return {
      prompt: 'השלימו את המספר החסר, כך שהשברים יהיו שווים.',
      widget: inputs(M(`${fr(...left)}<span class="eq">=</span>${rhs}`)), answer: { a: ans }, check: v => v.a === ans,
      hints: [hint, `השוו את ${top ? 'המכנים' : 'המונים'}: איך עוברים מ־${top ? left[1] : left[0]} ל־${top ? right[1] : right[0]}?`],
      explain,
    };
  },
};

const line = {
  id: 'frac-line', title: 'שבר על ישר המספרים',
  intro: `<p>כל שבר הוא גם נקודה על ישר המספרים. מחלקים את הקטע שבין 0 ל־1 לחלקים שווים לפי המכנה, וסופרים צעדים לפי המונה.</p>
    <div class="ex">${F(5, 4)} נמצא צעד אחד אחרי 1, כי ${M(`${fr(5, 4)} = 1${fr(1, 4)}`)}.</div>
    <p>לחצו על הקו במקום המתאים.</p>`,
  gen(L) {
    if (L === 3 && Math.random() < 0.5) {
      const div = pick([4, 6, 8, 10, 12]);
      let k;
      do k = rnd(1, 2 * div - 1); while (k % div === 0);
      return fracAns({
        prompt: 'איזה שבר מסומן על ישר המספרים? (אפשר לכתוב גם שבר גדול מ־1.)',
        visual: `<div dir="ltr">${lineSVG({ max: 2, div, mark: k })}</div>`, n: k, d: div,
        hints: ['ספרו לכמה חלקים שווים מחולק הקטע שבין 0 ל־1. זה המכנה.', `כל שלם מחולק ל־${div} חלקים. ספרו כמה צעדים יש מ־0 עד הסימון.`],
        explain: `כל שלם מחולק ל־${div} חלקים והסימון נמצא ${k} צעדים מ־0, כלומר ${F(k, div)}${gcd(k, div) > 1 || k > div ? ` = ${showFrac(k, div)}` : ''}.`,
      });
    }
    let max, div, k, label, d;
    if (L === 1) {
      d = div = rnd(2, 8);
      max = pick([1, 1, 2]);
      do k = rnd(1, max * d - 1); while (k % d === 0);
      label = k < d || Math.random() < 0.5 ? F(k, d) : MX(1, k - d, d);
    } else if (L === 2) {
      const [n, dd] = red(6), mult = rnd(2, dd <= 3 ? 4 : 2), w = rnd(0, 1);
      [d, max, div, k, label] = [dd, 2, dd * mult, (w * dd + n) * mult, w ? MX(w, n, dd) : F(n, dd)];
    } else {
      d = pick([2, 3, 4, 6]);
      max = 3;
      div = d * pick([1, 2]);
      let n;
      do n = rnd(d + 1, 3 * d - 1); while (n % d === 0);
      k = n * (div / d);
      label = F(n, d);
    }
    return {
      prompt: `סמנו את ${label} על ישר המספרים.`,
      widget: numLine({ max, div }), answer: k, check: v => v === k,
      hints: [div === d ? `כל שלם מחולק כאן ל־${d} חלקים שווים. ספרו צעדים מ־0.` : `כל שלם מחולק כאן ל־${div} חלקים, אז ${F(1, d)} הוא ${div / d} צעדים.`, `צריך להתקדם ${k} צעדים מ־0.`],
      explain: `${label} נמצא ${k} צעדים מ־0, כשכל שלם מחולק ל־${div} חלקים.`,
    };
  },
};

const compare = {
  id: 'frac-compare', title: 'מי גדול יותר?',
  intro: `<p>כדי להשוות שברים מביאים אותם ל<b>מכנה משותף</b>, ואז משווים מונים.</p>
    <div class="ex">${M(`${fr(2, 3)} = ${fr(8, 12)}`)} ו־${M(`${fr(3, 4)} = ${fr(9, 12)}`)}, לכן ${M(`${fr(2, 3)} &lt; ${fr(3, 4)}`)}.</div>
    <p>קיצורי דרך: כשהמכנים שווים, מונה גדול יותר פירושו שבר גדול יותר. כשהמונים שווים, מכנה <b>קטן</b> יותר פירושו שבר גדול יותר.</p>
    <p>שימו לב: באתגר הזה יש ניסיון אחד בלבד לכל שאלה.</p>`,
  gen(L) {
    let a, b, c, d;
    if (L === 1) {
      const t = rnd(0, 2);
      if (t === 0) {
        b = d = rnd(3, 10);
        a = rnd(1, b - 1);
        do c = rnd(1, b - 1); while (c === a);
      } else if (t === 1) {
        a = c = rnd(1, 4);
        b = rnd(a + 1, 10);
        do d = rnd(a + 1, 10); while (d === b);
      } else {
        const k = rnd(2, 5);
        [a, b, c, d] = Math.random() < 0.5 ? [1, 2, k, 2 * k] : [k, 2 * k, 1, 2];
      }
    } else if (L === 2) {
      const [n, dd] = red(6), k = rnd(2, 3), eq = Math.random() < 0.25;
      let m = n * k + (eq ? 0 : pick([-1, 1]));
      if (m < 1 || m >= dd * k) m = n * k + 1 < dd * k ? n * k + 1 : n * k - 1;
      [a, b, c, d] = Math.random() < 0.5 ? [n, dd, m, dd * k] : [m, dd * k, n, dd];
    } else {
      do {
        [a, b] = red(12, 3);
        [c, d] = red(12, 3);
      } while (b === d || a === c || b % d === 0 || d % b === 0 || Math.abs(a / b - c / d) > 0.12);
    }
    const cmp = Math.sign(a * d - c * b), idx = cmp + 1, sign = ['&lt;', '=', '&gt;'][idx], l = lcm(b, d);
    return {
      prompt: 'איזה סימן מתאים בין שני השברים?',
      visual: M(`<span class="big">${fr(a, b)}<span class="qm">?</span>${fr(c, d)}</span>`),
      widget: choice(['&lt;', '=', '&gt;'], { cols: 3, cls: 'signs' }), answer: idx, check: v => v === idx, tries: 1,
      hints: [L === 1 ? 'מכנים שווים: משווים מונים. מונים שווים: המכנה הקטן יותר נותן חלקים גדולים יותר.' : 'הביאו את שני השברים לאותו מכנה, ואז השוו מונים.', `מכנה משותף מתאים: ${l}.`],
      explain: `במכנה משותף ${l}: ${M(`${fr(a, b)} = ${fr((a * l) / b, l)}`)} ו־${M(`${fr(c, d)} = ${fr((c * l) / d, l)}`)}, לכן ${M(`${fr(a, b)} ${sign} ${fr(c, d)}`)}.`,
    };
  },
};

const mixedNum = {
  id: 'frac-mixed', title: 'מספר מעורב',
  intro: `<p><b>מספר מעורב</b> הוא שלמים ועוד שבר. אפשר לכתוב אותו גם כשבר אחד שהמונה שלו גדול מהמכנה.</p>
    <div class="ex">${M(`2${fr(1, 3)} = ${fr(7, 3)}`)}, כי בשני שלמים יש 6 שלישים, ועוד שליש אחד.</div>
    <p>ובכיוון ההפוך: מחלקים את המונה במכנה. המנה היא השלמים, והשארית היא המונה של השבר.</p>`,
  gen(L) {
    if (L === 3) {
      const [n, d] = red(7), w = rnd(1, 5), g = rnd(2, 4), N = (w * d + n) * g, D = d * g;
      return {
        prompt: 'כתבו כמספר מעורב. נסו לצמצם את השבר.',
        widget: inputs(M(`${fr(N, D)}<span class="eq">=</span>${box('w', 2)}${fr(box('n', 2), box('d', 2))}`)),
        answer: { w, n, d }, check: v => v.d > 0 && v.n < v.d && (v.w * v.d + v.n) * D === N * v.d,
        hints: [`כמה פעמים שלמות נכנס ${D} בתוך ${N}?`, `${M(`${N} ÷ ${D}`)} הם ${w} שלמים, ונשארים ${N - w * D} חלקים מתוך ${D}.`],
        explain: `${M(`${fr(N, D)} = ${w}${fr(N - w * D, D)} = ${w}${fr(n, d)}`)}`,
      };
    }
    const d = rnd(2, L === 1 ? 6 : 9), w = rnd(1, L === 1 ? 3 : 6), n = rnd(1, d - 1), N = w * d + n;
    if (L === 1 || Math.random() < 0.4)
      return {
        prompt: 'כתבו את המספר המעורב כשבר אחד.',
        visual: L === 1 ? pies(w, n, d) : '',
        widget: inputs(M(`${w}${fr(n, d)}<span class="eq">=</span>${fr(box('a', 3), d)}`)), answer: { a: N }, check: v => v.a === N,
        hints: [`בכל שלם יש ${d} חלקים. כמה חלקים יש ב־${w} שלמים?`, `${M(`${w} × ${d} = ${w * d}`)}, ועוד ${n} חלקים.`],
        explain: `${M(`${w} × ${d} + ${n} = ${N}`)}, לכן ${M(`${w}${fr(n, d)} = ${fr(N, d)}`)}`,
      };
    return {
      prompt: 'כתבו את השבר כמספר מעורב.',
      widget: inputs(M(`${fr(N, d)}<span class="eq">=</span>${box('w', 2)}${fr(box('n', 2), d)}`)), answer: { w, n }, check: v => v.w === w && v.n === n,
      hints: [`כמה פעמים שלמות נכנס ${d} בתוך ${N}?`, `${M(`${N} ÷ ${d}`)} הם ${w}, והשארית ${n}.`],
      explain: `${M(`${N} = ${w} × ${d} + ${n}`)}, לכן ${M(`${fr(N, d)} = ${w}${fr(n, d)}`)}`,
    };
  },
};

const addSub = {
  id: 'frac-add', title: 'חיבור וחיסור שברים',
  intro: `<p>מחברים ומחסרים רק חלקים <b>מאותו גודל</b>. לכן מביאים קודם את השברים למכנה משותף, ואז מחברים או מחסרים את המונים. המכנה נשאר.</p>
    <div class="ex">${M(`${fr(1, 2)} + ${fr(1, 3)} = ${fr(3, 6)} + ${fr(2, 6)} = ${fr(5, 6)}`)}</div>
    <p>כל שבר ששווה לתשובה יתקבל, גם בלי צמצום.</p>`,
  gen(L) {
    if (L === 3) {
      let w1, a, b, w2, c, d, minus;
      do {
        [a, b] = red(6);
        [c, d] = red(6);
        w1 = rnd(1, 4);
        w2 = rnd(1, 3);
        minus = Math.random() < 0.5;
      } while (b === d || (minus && (w1 * b + a) * d <= (w2 * d + c) * b));
      const l = lcm(b, d), N = (w1 * b + a) * (l / b) + (minus ? -1 : 1) * (w2 * d + c) * (l / d), g = gcd(N, l);
      return {
        prompt: 'פתרו. אפשר לענות במספר מעורב, או להשאיר את השלמים ריקים ולכתוב שבר אחד.',
        widget: inputs(M(`${w1}${fr(a, b)} ${minus ? '−' : '+'} ${w2}${fr(c, d)}<span class="eq">=</span>${box('w', 2, true)}${fr(box('n', 3, true), box('d', 3, true))}`)),
        answer: N % l === 0 ? { w: N / l } : { w: Math.floor(N / l), n: (N % l) / g, d: l / g },
        check: v => (v.w * (v.d || 1) + v.n) * l === N * (v.d || 1),
        hints: ['אפשר להפוך כל מספר מעורב לשבר אחד, ואז להביא למכנה משותף.', `מכנה משותף: ${l}. ${M(`${w1}${fr(a, b)} = ${fr((w1 * b + a) * (l / b), l)}`)} ו־${M(`${w2}${fr(c, d)} = ${fr((w2 * d + c) * (l / d), l)}`)}.`],
        explain: `${M(`${fr((w1 * b + a) * (l / b), l)} ${minus ? '−' : '+'} ${fr((w2 * d + c) * (l / d), l)} = ${fr(N, l)}`)} = ${showFrac(N, l)}`,
      };
    }
    let a, b, c, d, minus;
    do {
      if (L === 1) {
        b = rnd(2, 6);
        d = b * rnd(1, 3);
        a = rnd(1, b - 1);
        c = rnd(1, d - 1);
        if (Math.random() < 0.5) [a, b, c, d] = [c, d, a, b];
      } else {
        b = rnd(2, 8);
        d = rnd(2, 8);
        a = rnd(1, b - 1);
        c = rnd(1, d - 1);
      }
      minus = Math.random() < 0.5;
    } while ((L === 2 && (b % d === 0 || d % b === 0)) || gcd(a, b) > 1 || gcd(c, d) > 1 || (minus && a * d <= c * b));
    const l = lcm(b, d), x = a * (l / b), y = c * (l / d), n = minus ? x - y : x + y, op = minus ? '−' : '+';
    return fracAns({
      prompt: 'פתרו את התרגיל.', pre: `${fr(a, b)} ${op} ${fr(c, d)}<span class="eq">=</span>`, n, d: l,
      hints: [b === d ? 'המכנים שווים, אז מחברים או מחסרים רק את המונים.' : 'הביאו את שני השברים למכנה משותף.', `מכנה משותף: ${l}. ${M(`${fr(a, b)} = ${fr(x, l)}`)} ו־${M(`${fr(c, d)} = ${fr(y, l)}`)}.`],
      explain: `${M(`${fr(x, l)} ${op} ${fr(y, l)} = ${fr(n, l)}`)}${gcd(n, l) > 1 || n > l ? ` = ${showFrac(n, l)}` : ''}`,
    });
  },
};

const THINGS = [
  ['בחללית יש', 'חייזרים', 'מהם ירוקים', 'חייזרים ירוקים', 'מהחייזרים ירוקים'],
  ['במחסן יש', 'מכלי דלק', 'מהם מלאים', 'מכלים מלאים', 'ממכלי הדלק מלאים'],
  ['בצי יש', 'חלליות', 'מהן מהירות', 'חלליות מהירות', 'מהחלליות מהירות'],
  ['בשקית יש', 'עוגיות ירח', 'מהן עם שוקולד', 'עוגיות עם שוקולד', 'מעוגיות הירח הן עם שוקולד'],
];
const partOf = {
  id: 'frac-part', title: 'חלק מכמות',
  intro: `<p>כדי למצוא שבר מתוך כמות, מחלקים את הכמות במכנה ומכפילים במונה.</p>
    <div class="ex">${F(3, 4)} מתוך 24: רבע אחד הוא ${M('24 ÷ 4 = 6')}, ושלושה רבעים הם ${M('3 × 6 = 18')}.</div>`,
  gen(L) {
    const [n, d] = red(L === 1 ? 6 : 8), k = rnd(2, L === 1 ? 6 : 9), [where, what, which, whichFull, ofAll] = pick(THINGS);
    if (L === 1)
      return num({
        prompt: `${where} ${d * k} ${what}. ${F(n, d)} ${which}. כמה ${whichFull} יש?`, answer: n * k,
        hints: [`מצאו קודם כמה זה ${F(1, d)} מתוך ${d * k}.`, `${M(`${d * k} ÷ ${d} = ${k}`)}. עכשיו הכפילו ב־${n}.`],
        explain: `${M(`${d * k} ÷ ${d} = ${k}`)}, ואז ${M(`${n} × ${k} = ${n * k}`)}.`,
      });
    if (L === 2)
      return num({
        prompt: `${F(n, d)} ${ofAll}, ויש ${n * k} ${whichFull}. כמה ${what} יש בסך הכול?`, answer: d * k,
        hints: [`${n * k} הם ${n} חלקים מתוך ${d}. כמה שווה חלק אחד?`, `חלק אחד שווה ${M(`${n * k} ÷ ${n} = ${k}`)}. בשלם יש ${d} חלקים כאלה.`],
        explain: `חלק אחד: ${M(`${n * k} ÷ ${n} = ${k}`)}. השלם: ${M(`${d} × ${k} = ${d * k}`)}.`,
      });
    const t = rnd(0, 2), [c, e] = red(5);
    if (t === 0) {
      const q = rnd(1, 3), total = d * e * q, green = n * e * q;
      return num({
        prompt: `בחללית יש ${total} חייזרים. ${F(n, d)} מהם ירוקים, ו־${F(c, e)} מהירוקים חובשים קסדה. כמה חייזרים ירוקים חובשים קסדה?`, answer: n * c * q,
        hints: ['פתרו בשני שלבים: קודם מצאו כמה ירוקים יש.', `יש ${green} ירוקים. עכשיו מצאו ${F(c, e)} מתוך ${green}.`],
        explain: `ירוקים: ${M(`${total} ÷ ${d} × ${n} = ${green}`)}. עם קסדה: ${M(`${green} ÷ ${e} × ${c} = ${n * c * q}`)}.`,
      });
    }
    if (t === 1)
      return num({
        prompt: `החללית שרפה ${F(n, d)} מהדלק שלה, ונשארו ${(d - n) * k} ליטרים. כמה ליטרים היו בהתחלה?`, answer: d * k,
        hints: [`אם נשרפו ${F(n, d)}, איזה חלק מהדלק נשאר?`, `נשארו ${F(d - n, d)} מהדלק, והם ${(d - n) * k} ליטרים. כמה שווה ${F(1, d)}?`],
        explain: `נשארו ${F(d - n, d)}, כלומר ${d - n} חלקים ששווים ${(d - n) * k}. חלק אחד שווה ${k}, והכול: ${M(`${d} × ${k} = ${d * k}`)}.`,
      });
    const q = rnd(1, 3), left = (d - n) * (e - c) * q;
    return num({
      prompt: `ביום הראשון אכלו החייזרים ${F(n, d)} מהעוגיות. ביום השני אכלו ${F(c, e)} ממה שנשאר. בסוף נשארו ${left} עוגיות. כמה עוגיות היו בהתחלה?`, answer: d * e * q,
      hints: ['עבדו מהסוף להתחלה: כמה עוגיות היו בתחילת היום השני?', `אחרי היום השני נשארו ${F(e - c, e)} ממה שהיה בתחילתו. בתחילת היום השני היו ${(d - n) * e * q} עוגיות.`],
      explain: `בתחילת היום השני: ${M(`${left} ÷ ${e - c} × ${e} = ${(d - n) * e * q}`)}. אלה ${F(d - n, d)} מההתחלה, ולכן בהתחלה: ${M(`${(d - n) * e * q} ÷ ${d - n} × ${d} = ${d * e * q}`)}.`,
    });
  },
};

const mult = {
  id: 'frac-mult', title: 'שבר של שבר',
  intro: `<p>"חצי של שליש" הוא תרגיל כפל: ${M(`${fr(1, 2)} × ${fr(1, 3)}`)}. מכפילים מונה במונה ומכנה במכנה.</p>
    <div class="ex">${M(`${fr(2, 3)} × ${fr(4, 5)} = ${fr(8, 15)}`)}</div>
    <p>בציור: הכחול מסמן את השבר הראשון, הצהוב את השני, והירוק הוא החלק ששייך לשניהם. זו התשובה.</p>`,
  gen(L) {
    if (L === 1 && Math.random() < 0.5) {
      const [n, d] = red(7), k = rnd(2, 5);
      return fracAns({
        prompt: 'פתרו את התרגיל.', pre: `${k} × ${fr(n, d)}<span class="eq">=</span>`, n: k * n, d,
        hints: [`${k} פעמים ${F(n, d)}: זה כמו לחבר את ${F(n, d)} שוב ושוב.`, 'מכפילים רק את המונה. המכנה לא משתנה.'],
        explain: `${M(`${k} × ${fr(n, d)} = ${fr(k * n, d)}`)}${k * n >= d ? ` = ${showFrac(k * n, d)}` : ''}`,
      });
    }
    if (L === 3) {
      const [a, b] = red(4), [c, d] = red(6), w = rnd(1, 3), N = (w * b + a) * c, D = b * d;
      return fracAns({
        prompt: 'פתרו את התרגיל. רמז קטן: הפכו קודם את המספר המעורב לשבר.', pre: `${w}${fr(a, b)} × ${fr(c, d)}<span class="eq">=</span>`, n: N, d: D,
        hints: [`${M(`${w}${fr(a, b)} = ${fr(w * b + a, b)}`)}`, 'עכשיו מכפילים מונה במונה ומכנה במכנה.'],
        explain: `${M(`${fr(w * b + a, b)} × ${fr(c, d)} = ${fr(N, D)}`)} = ${showFrac(N, D)}`,
      });
    }
    const [a, b] = L === 1 ? [1, rnd(2, 4)] : red(5), [c, d] = L === 1 ? [1, rnd(2, 4)] : red(5);
    return fracAns({
      prompt: `כמה זה ${F(a, b)} של ${F(c, d)}? הציור יכול לעזור.`, visual: areaModel(a, b, c, d),
      pre: `${fr(a, b)} × ${fr(c, d)}<span class="eq">=</span>`, n: a * c, d: b * d,
      hints: [`לכמה משבצות קטנות מחולק המלבן כולו? כמה מהן ירוקות?`, `המלבן מחולק ל־${M(`${b} × ${d} = ${b * d}`)} משבצות, ו־${a * c} מהן ירוקות.`],
      explain: `${M(`${fr(a, b)} × ${fr(c, d)} = ${fr(a * c, b * d)}`)}${gcd(a * c, b * d) > 1 ? ` = ${showFrac(a * c, b * d)}` : ''}`,
    });
  },
};

const boss = {
  id: 'frac-boss', title: 'בוס: החשבונאי חצי־חצי',
  intro: `<p>החשבונאי חצי־חצי שומר על כוכב השברים עם בעיות מילוליות. כדאי לקרוא כל שאלה פעמיים, ולפתור שלב אחרי שלב.</p>
    <p>כשהתשובה היא שבר, כל שבר ששווה לה יתקבל.</p>`,
  gen(L) {
    const t = rnd(0, 3);
    if (L === 1) {
      if (t === 0) {
        const b = rnd(4, 10), a = rnd(3, b - 1), c = rnd(1, a - 1);
        return fracAns({
          prompt: `במכל הדלק יש ${F(a, b)} מכל. החללית השתמשה ב־${F(c, b)} מכל. איזה חלק מהמכל נשאר מלא?`, n: a - c, d: b,
          hints: ['זו בעיית חיסור. המכנים שווים.', `${M(`${fr(a, b)} − ${fr(c, b)}`)}`], explain: `${M(`${fr(a, b)} − ${fr(c, b)} = ${fr(a - c, b)}`)}`,
        });
      }
      if (t === 1) {
        const d = rnd(2, 6), k = rnd(2, 6);
        return num({
          prompt: `כל חייזר אוכל ${F(1, d)} פיצה. כמה פיצות שלמות צריך בשביל ${d * k} חייזרים?`, answer: k,
          hints: [`כמה חייזרים אוכלים יחד פיצה אחת שלמה?`, `${d} חייזרים אוכלים פיצה אחת.`], explain: `${d} חייזרים אוכלים פיצה אחת, לכן צריך ${M(`${d * k} ÷ ${d} = ${k}`)} פיצות.`,
        });
      }
      if (t === 2) {
        const [n, d] = red(6), k = rnd(2, 6);
        return num({
          prompt: `בצוות יש ${d * k} חייזרים. ${F(n, d)} מהם טייסים, וכל השאר מכונאים. כמה מכונאים יש?`, answer: (d - n) * k,
          hints: ['איזה חלק מהצוות הם המכונאים?', `המכונאים הם ${F(d - n, d)} מהצוות.`], explain: `מכונאים: ${F(d - n, d)} מתוך ${d * k}, כלומר ${M(`${d * k} ÷ ${d} × ${d - n} = ${(d - n) * k}`)}.`,
        });
      }
      const b = rnd(5, 10), a = rnd(1, b - 3), c = rnd(1, b - a - 1);
      return fracAns({
        prompt: `זופי קרא ${F(a, b)} מהספר בבוקר ועוד ${F(c, b)} מהספר בערב. איזה חלק מהספר קרא היום?`, n: a + c, d: b,
        hints: ['זו בעיית חיבור. המכנים שווים.', `${M(`${fr(a, b)} + ${fr(c, b)}`)}`], explain: `${M(`${fr(a, b)} + ${fr(c, b)} = ${fr(a + c, b)}`)}`,
      });
    }
    if (L === 2) {
      if (t === 0) {
        const [a, b] = pick([[2, 3], [2, 4], [3, 4], [2, 5], [3, 5], [3, 6], [4, 5], [2, 6], [4, 6]]), l = lcm(a, b), n = l - l / a - l / b;
        return fracAns({
          prompt: `זופי קרא ${F(1, a)} מהספר ביום ראשון ו־${F(1, b)} מהספר ביום שני. איזה חלק מהספר נשאר לו לקרוא?`, n, d: l,
          hints: ['קודם חברו את שני החלקים שקרא. צריך מכנה משותף.', `קרא ${M(`${fr(l / a, l)} + ${fr(l / b, l)} = ${fr(l / a + l / b, l)}`)}. כמה חסר עד ספר שלם?`],
          explain: `קרא ${F(l / a + l / b, l)}, ונשאר ${M(`1 − ${fr(l / a + l / b, l)} = ${fr(n, l)}`)}.`,
        });
      }
      if (t === 1) {
        const [n, d] = red(8), k = rnd(3, 12);
        return num({
          prompt: `מכל הדלק של החללית מכיל ${d * k} ליטרים כשהוא מלא. כרגע הוא מלא ב־${F(n, d)}. כמה ליטרים חסרים כדי למלא אותו?`, answer: (d - n) * k,
          hints: ['איזה חלק מהמכל ריק?', `ריק: ${F(d - n, d)} מתוך ${d * k} ליטרים.`], explain: `חסרים ${F(d - n, d)} מהמכל: ${M(`${d * k} ÷ ${d} × ${d - n} = ${(d - n) * k}`)} ליטרים.`,
        });
      }
      if (t === 2) {
        const [n, d] = red(5), k = rnd(2, 4);
        return num({
          prompt: `כבל באורך ${n * k} מטרים נחתך לחתיכות שאורך כל אחת ${F(n, d)} מטר. כמה חתיכות מתקבלות?`, answer: d * k,
          hints: [`כמה חתיכות של ${F(n, d)} מטר נכנסות ב־${n} מטרים?`, `ב־${n} מטרים יש ${d} חתיכות, כי ${M(`${d} × ${fr(n, d)} = ${n}`)}.`],
          explain: `ב־${n} מטרים יש ${d} חתיכות, ובכבל יש ${k} פעמים ${n} מטרים: ${M(`${k} × ${d} = ${d * k}`)}.`,
        });
      }
      const [a, b, c, d] = pick([[1, 2, 1, 3], [1, 2, 1, 4], [1, 3, 1, 4], [1, 2, 1, 5], [2, 5, 1, 2], [1, 3, 1, 2], [1, 4, 2, 3], [3, 8, 1, 2]]), l = lcm(b, d), k = rnd(1, 3), rest = l - a * (l / b) - c * (l / d);
      return num({
        prompt: `${F(a, b)} מהחייזרים בתחנה ירוקים, ${F(c, d)} כחולים, וכל השאר, ${rest * k} חייזרים, סגולים. כמה חייזרים יש בתחנה?`, answer: l * k,
        hints: ['איזה חלק מהחייזרים סגולים? חברו קודם את הירוקים והכחולים.', `ירוקים וכחולים יחד: ${F(a * (l / b) + c * (l / d), l)}. הסגולים הם ${F(rest, l)}.`],
        explain: `הסגולים הם ${F(rest, l)} מהתחנה, והם ${rest * k}. לכן ${F(1, l)} שווה ${k}, ובתחנה ${M(`${l} × ${k} = ${l * k}`)} חייזרים.`,
      });
    }
    if (t === 0) {
      const [a, b] = pick([[3, 6], [4, 12], [6, 12], [10, 15], [12, 4], [20, 5], [6, 3], [12, 6], [20, 30], [15, 10]]), ans = (a * b) / (a + b);
      return num({
        prompt: `משאבה א ממלאת את מכל הדלק ב־${a} שעות. משאבה ב ממלאת אותו ב־${b} שעות. בכמה שעות ימלאו את המכל שתי המשאבות יחד?`, answer: ans,
        hints: ['איזה חלק מהמכל ממלאת כל משאבה בשעה אחת?', `בשעה אחת: ${M(`${fr(1, a)} + ${fr(1, b)} = ${fr(a + b, a * b)}`)} = ${showFrac(a + b, a * b)} מהמכל.`],
        explain: `יחד הן ממלאות ${showFrac(a + b, a * b)} מהמכל בשעה, לכן צריך ${ans} שעות.`,
      });
    }
    if (t === 1) {
      const [p, q, top, bot] = pick([[2, 3, 5, 6], [3, 4, 7, 12], [2, 4, 3, 4], [2, 5, 7, 10], [3, 6, 1, 2]]), k = rnd(2, 9);
      return num({
        prompt: `חושבים על מספר. ${F(1, p)} ממנו ועוד ${F(1, q)} ממנו הם יחד ${top * k}. מה המספר?`, answer: bot * k,
        hints: [`איזה חלק מהמספר הם ${F(1, p)} ועוד ${F(1, q)}?`, `${M(`${fr(1, p)} + ${fr(1, q)} = ${fr(top, bot)}`)}. כלומר ${F(top, bot)} מהמספר שווים ${top * k}.`],
        explain: `${F(top, bot)} מהמספר שווים ${top * k}, לכן ${F(1, bot)} שווה ${k}, והמספר הוא ${M(`${bot} × ${k} = ${bot * k}`)}.`,
      });
    }
    if (t === 2) {
      const [lo, hi, D, ans] = pick([[[1, 3], [1, 2], 12, 5], [[1, 4], [1, 3], 24, 7], [[1, 2], [2, 3], 12, 7], [[2, 3], [3, 4], 24, 17], [[1, 5], [1, 4], 40, 9], [[3, 4], [5, 6], 24, 19]]);
      return {
        prompt: `מצאו שבר שהמכנה שלו ${D}, והוא גדול מ־${F(...lo)} וקטן מ־${F(...hi)}.`,
        widget: inputs(M(fr(box('a', 3), D))), answer: { a: ans }, check: v => v.a === ans,
        hints: [`הרחיבו את שני השברים למכנה ${D}.`, `${M(`${fr(...lo)} = ${fr((lo[0] * D) / lo[1], D)}`)} ו־${M(`${fr(...hi)} = ${fr((hi[0] * D) / hi[1], D)}`)}. איזה מונה נמצא ביניהם?`],
        explain: `${M(`${fr((lo[0] * D) / lo[1], D)} &lt; ${fr(ans, D)} &lt; ${fr((hi[0] * D) / hi[1], D)}`)}`,
      };
    }
    const [n, d] = red(5), [c, e] = red(4), q = rnd(2, 5), left = (d - n) * (e - c) * q;
    return num({
      prompt: `בלופ בזבז ${F(n, d)} מהמטבעות שלו בחנות הראשונה, ואז ${F(c, e)} ממה שנשאר לו בחנות השנייה. נשארו לו ${left} מטבעות. כמה מטבעות היו לו בהתחלה?`, answer: d * e * q,
      hints: ['עבדו מהסוף להתחלה: כמה מטבעות היו לו כשנכנס לחנות השנייה?', `אחרי החנות השנייה נשארו ${F(e - c, e)} ממה שהיה לו כשנכנס אליה, כלומר נכנס עם ${(d - n) * e * q} מטבעות.`],
      explain: `לפני החנות השנייה: ${M(`${left} ÷ ${e - c} × ${e} = ${(d - n) * e * q}`)}. אלה ${F(d - n, d)} מההתחלה, לכן בהתחלה היו ${M(`${(d - n) * e * q} ÷ ${d - n} × ${d} = ${d * e * q}`)}.`,
    });
  },
};

export default {
  id: 'frac', name: 'כוכב השברים', color: '#ffb020', boss: 'החשבונאי חצי־חצי',
  tagline: 'החשבונאים חתכו את הכוכב לחתיכות. רק מי ששולט בשברים יכול להרכיב אותו מחדש.',
  challenges: [pizza, equiv, line, compare, mixedNum, addSub, partOf, mult, boss],
};

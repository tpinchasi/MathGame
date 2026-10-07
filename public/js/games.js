// The three games, one per age group. Each has its own worlds, look, story and prizes;
// the challenge engine, levels and stars are shared.
import { WORLDS as SPACE } from './worlds/space/index.js';
import { WORLDS as ZOO } from './worlds/zoo/index.js';
import { WORLDS as LAB } from './worlds/lab/index.js';
import { planet, alien, alienName, ship, starfield } from './art.js';
import { range } from './util.js';

// An emoji on a coloured disc, for world cards and prizes.
export const badge = (emoji, color, locked = false) => `<svg viewBox="-50 -50 100 100" class="badge${locked ? ' locked' : ''}">
  <circle r="46" fill="${locked ? '#2c3a4a' : color}"/><circle r="46" fill="url(#bshade)"/>
  <defs><radialGradient id="bshade" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></radialGradient></defs>
  <text y="17" text-anchor="middle" font-size="48">${locked ? '' : emoji}</text>
  ${locked ? '<text y="16" text-anchor="middle" font-size="44" font-weight="900" fill="#6b7f95">?</text>' : ''}</svg>`;

// Background decoration drawn into #stars.
const scatter = (el, n, f) => (el.innerHTML = range(n, f).join(''));
const r = (a, b) => (a + Math.random() * (b - a)).toFixed(1);
const decor = {
  space: starfield,
  zoo: el => scatter(el, 26, () => `<i style="left:${r(0, 100)}%;top:${r(0, 100)}%;--s:${r(14, 34)}px;--rot:${r(-60, 60)}deg;animation-delay:${r(-6, 0)}s"></i>`),
  lab: el => scatter(el, 22, () => `<i style="left:${r(0, 100)}%;--s:${r(8, 26)}px;animation-duration:${r(9, 20)}s;animation-delay:${r(-20, 0)}s"></i>`),
};

// Freed animals (zoo) — emoji up to Unicode 11 so older phones show them.
const ANIMALS = [
  ['🐒', 'קוף'], ['🦍', 'גורילה'], ['🦁', 'אריה'], ['🐯', 'נמר'], ['🦒', 'ג׳ירפה'], ['🐘', 'פיל'], ['🦛', 'היפופוטם'], ['🦏', 'קרנף'],
  ['🐪', 'גמל'], ['🦘', 'קנגורו'], ['🐨', 'קואלה'], ['🐼', 'פנדה'], ['🐻', 'דוב'], ['🦝', 'דביבון'], ['🦔', 'קיפוד'], ['🦇', 'עטלף'],
  ['🐧', 'פינגווין'], ['🦜', 'תוכי'], ['🦚', 'טווס'], ['🦢', 'ברבור'], ['🦅', 'עיט'], ['🦆', 'ברווז'], ['🐊', 'תנין'], ['🐢', 'צב'],
  ['🐍', 'נחש'], ['🦎', 'לטאה'], ['🐸', 'צפרדע'], ['🐬', 'דולפין'], ['🐙', 'תמנון'], ['🦈', 'כריש'], ['🐠', 'דג טרופי'], ['🦀', 'סרטן'],
  ['🦋', 'פרפר'], ['🐝', 'דבורה'], ['🦌', 'אייל'], ['🦊', 'שועל'], ['🦙', 'לאמה'], ['🐺', 'זאב'], ['🦡', 'גירית'], ['🐆', 'ברדלס'],
];

// Discovered elements (lab): the first 40 of the periodic table.
const ELEMENTS = [
  ['H', 'מימן'], ['He', 'הליום'], ['Li', 'ליתיום'], ['Be', 'בריליום'], ['B', 'בור'], ['C', 'פחמן'], ['N', 'חנקן'], ['O', 'חמצן'],
  ['F', 'פלואור'], ['Ne', 'ניאון'], ['Na', 'נתרן'], ['Mg', 'מגנזיום'], ['Al', 'אלומיניום'], ['Si', 'צורן'], ['P', 'זרחן'], ['S', 'גופרית'],
  ['Cl', 'כלור'], ['Ar', 'ארגון'], ['K', 'אשלגן'], ['Ca', 'סידן'], ['Sc', 'סקנדיום'], ['Ti', 'טיטניום'], ['V', 'ונדיום'], ['Cr', 'כרום'],
  ['Mn', 'מנגן'], ['Fe', 'ברזל'], ['Co', 'קובלט'], ['Ni', 'ניקל'], ['Cu', 'נחושת'], ['Zn', 'אבץ'], ['Ga', 'גליום'], ['Ge', 'גרמניום'],
  ['As', 'ארסן'], ['Se', 'סלניום'], ['Br', 'ברום'], ['Kr', 'קריפטון'], ['Rb', 'רובידיום'], ['Sr', 'סטרונציום'], ['Y', 'איטריום'], ['Zr', 'זירקוניום'],
];
const element = (i, locked) => {
  const [sym] = ELEMENTS[i % ELEMENTS.length];
  return `<svg viewBox="0 0 100 100" class="element${locked ? ' locked' : ''}">
    <rect x="4" y="4" width="92" height="92" rx="12" fill="${locked ? '#123044' : `hsl(${(i * 47) % 360} 65% 58%)`}" stroke="${locked ? '#2a5670' : '#0b2233'}" stroke-width="3"/>
    <text x="14" y="26" font-size="17" font-weight="700" fill="${locked ? '#2a5670' : '#0b2233'}">${locked ? '' : i + 1}</text>
    <text x="50" y="72" text-anchor="middle" font-size="${sym.length > 1 ? 40 : 46}" font-weight="900" fill="${locked ? '#2a5670' : '#0b2233'}" font-family="Rubik, sans-serif">${locked ? '?' : sym}</text></svg>`;
};

export const GAMES = [
  {
    id: 'zoo', grades: 'כיתות ב–ג', name: 'גן החיות', worlds: ZOO, color: '#3fbf6f', icon: '🦁', theme: '#0d2a1d',
    decor: decor.zoo,
    cover: () => badge('🦁', '#f5b83d'),
    worldArt: w => badge(w.icon, w.color),
    worldWord: 'מתחם', mapWord: 'מפת גן החיות', backToWorld: 'חזרה למתחם',
    story: [
      'החשבונאים הגיעו לגן החיות ונעלו את כל הכלובים במנעולי חשבון. החיות לא יכולות לצאת לטייל, והמטפלים לא יודעים מה לעשות.',
      'רק מי שפותר את האתגרים יכול לפתוח את המנעולים, לשחרר את החיות ולאסוף כוכבים.',
      'בכל מתחם מחכים 8 אתגרים ובוס אחד. מוכנים?',
    ],
    storyBtn: 'פותחים את השער!',
    hub: { name: 'מרכז המבקרים', btn: '🎟️ מרכז המבקרים' },
    prize: i => ({ art: badge(ANIMALS[i % ANIMALS.length][0], '#fff3c4'), name: ANIMALS[i % ANIMALS.length][1] }),
    lockedPrize: () => badge('', '', true),
    prizeLine: name => `שחררתם חיה חדשה: ${name}! היא מחכה לכם במרכז המבקרים.`,
    bossLine: w => `${w.boss} הובס! ${w.name} פתוח לגמרי.`,
    hubIntro: (n, of) => `מתחמים שנפתחו: ${n} מתוך ${of}. כל בוס שמובס פותח מתחם שלם.`,
  },
  {
    id: 'space', grades: 'כיתות ד–ה', name: 'מסע בחלל', worlds: SPACE, color: '#7c5cff', icon: '🚀', theme: '#0b1030',
    decor: decor.space,
    cover: () => planet('order'),
    worldArt: w => planet(w.id),
    worldWord: 'כוכב', mapWord: 'מפת הגלקסיה', backToWorld: 'חזרה לכוכב',
    story: [
      'לחשבונאי החלל נמאס שכולם אומרים שחשבון זה משעמם. אז הם נעלו את כל הגלקסיה במנעולי חשבון, ולקחו את החייזרים בשבי.',
      'רק מי שפותר את האתגרים שלהם יכול לשחרר את החייזרים, לאסוף כוכבים ולשדרג את החללית.',
      'בכל כוכב לכת מחכים 8 אתגרים ובוס אחד. מוכנים?',
    ],
    storyBtn: 'יוצאים לדרך!',
    hub: { name: 'תחנת החלל', btn: '🚀 תחנת החלל' },
    prize: i => ({ art: alien(i), name: alienName(i) }),
    lockedPrize: i => alien(i, true),
    prizeLine: name => `שחררתם את ${name}! מחכה לכם בתחנת החלל.`,
    bossLine: w => `${w.boss} הובס! קיבלתם שדרוג לחללית.`,
    hubArt: parts => ship(parts),
    hubIntro: (n, of) => `שדרוגי חללית: ${n} מתוך ${of}. כל בוס שמובס מוסיף חלק.`,
  },
  {
    id: 'lab', grades: 'כיתה ו', name: 'המעבדה המדעית', worlds: LAB, color: '#14b8a6', icon: '🧪', theme: '#071a26',
    decor: decor.lab,
    cover: () => badge('🧪', '#2dd4bf'),
    worldArt: w => badge(w.icon, w.color),
    worldWord: 'מעבדה', mapWord: 'מפת המעבדה', backToWorld: 'חזרה למעבדה',
    story: [
      'החשבונאים פרצו למעבדה המדעית בלילה. הם ערבבו את התמיסות, שברו את מכשירי המדידה ונעלו כל ארון במנעול חשבון.',
      'רק מי שפותר את האתגרים יחזיר את המעבדה לעבודה, יגלה יסודות חדשים לטבלה המחזורית ויאסוף כוכבים.',
      'בכל מעבדה מחכים 8 אתגרים ובוס אחד. מוכנים?',
    ],
    storyBtn: 'לובשים חלוק ומתחילים!',
    hub: { name: 'ארון הציוד', btn: '🔬 ארון הציוד' },
    prize: i => ({ art: element(i), name: ELEMENTS[i % ELEMENTS.length][1] }),
    lockedPrize: i => element(i, true),
    prizeLine: name => `גיליתם יסוד חדש: ${name}! הוא נוסף לטבלה בארון הציוד.`,
    bossLine: w => `${w.boss} הובס! ${w.name} חזרה לעבודה.`,
    hubIntro: (n, of) => `מעבדות שחזרו לעבודה: ${n} מתוך ${of}. כל בוס שמובס מחזיר מעבדה שלמה.`,
  },
];

export const gameOf = world => GAMES.find(g => g.worlds.includes(world));
export const findWorld = id => GAMES.flatMap(g => g.worlds).find(w => w.id === id);

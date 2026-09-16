// Cardio: Herzfrequenzzonen und Wochenplanung.
import { clamp } from './util.js';
import { healthFlags } from './health.js';

// Aktivitäten mit MET-Werten (Compendium of Physical Activities, Ainsworth et al. 2011), Zone-2-Intensität.
// kcal/min = MET × 3,5 × kg / 200
const A = (id, name, met, group) => ({ id, name, met, group });
export const CARDIO_ACTIVITIES = [
  // Laufen & Gehen
  A('laufen', 'Laufen (locker, 8–9 km/h)', 8.8, 'Laufen & Gehen'),
  A('laufen_zuegig', 'Laufen (zügig, 10–11 km/h)', 10.5, 'Laufen & Gehen'),
  A('trailrunning', 'Trailrunning', 9.5, 'Laufen & Gehen'),
  A('walken', 'Zügiges Gehen (5–6 km/h)', 4.3, 'Laufen & Gehen'),
  A('wandern', 'Wandern', 6.0, 'Laufen & Gehen'),
  A('nordic_walking', 'Nordic Walking', 5.5, 'Laufen & Gehen'),
  A('treppensteigen', 'Treppensteigen', 8.0, 'Laufen & Gehen'),
  A('laufband_steigung', 'Laufband mit Steigung (gehen)', 6.5, 'Laufen & Gehen'),
  A('stairmaster', 'Stairmaster', 9.0, 'Laufen & Gehen'),
  // Rad
  A('rad', 'Radfahren (locker, 16–19 km/h)', 6.8, 'Rad'),
  A('rad_zuegig', 'Radfahren (zügig, 20–25 km/h)', 8.5, 'Rad'),
  A('rennrad', 'Rennrad', 10.0, 'Rad'),
  A('mtb', 'Mountainbike', 8.5, 'Rad'),
  A('ergometer', 'Ergometer / Indoor Bike', 6.8, 'Rad'),
  A('spinning', 'Spinning-Kurs', 8.5, 'Rad'),
  A('gravel', 'Gravelbike', 8.0, 'Rad'),
  // Studio-Geräte
  A('rudern', 'Rudern (Ergometer)', 7.0, 'Studio'),
  A('crosstrainer', 'Crosstrainer', 5.0, 'Studio'),
  A('skierg', 'SkiErg', 7.0, 'Studio'),
  A('assault_bike', 'Assault / Air Bike', 8.0, 'Studio'),
  A('seilspringen', 'Seilspringen', 11.0, 'Studio'),
  A('circuit', 'Zirkeltraining', 8.0, 'Studio'),
  A('hiit_kurs', 'HIIT-Kurs', 8.5, 'Studio'),
  A('aerobic', 'Aerobic / Step', 7.3, 'Studio'),
  A('battle_ropes', 'Battle Ropes', 8.0, 'Studio'),
  A('kettlebell_cardio', 'Kettlebell-Zirkel', 8.0, 'Studio'),
  // Wasser
  A('schwimmen', 'Schwimmen (locker)', 6.0, 'Wasser'),
  A('schwimmen_kraul', 'Schwimmen (Kraul, zügig)', 9.8, 'Wasser'),
  A('aquajogging', 'Aquajogging', 9.8, 'Wasser'),
  A('sup', 'Stand-up-Paddling', 6.0, 'Wasser'),
  A('kajak', 'Kajak / Kanu', 5.0, 'Wasser'),
  A('rudern_boot', 'Rudern (Boot)', 7.0, 'Wasser'),
  A('surfen', 'Surfen / Windsurfen', 5.0, 'Wasser'),
  // Winter & Berg
  A('skilanglauf', 'Skilanglauf', 9.0, 'Winter & Berg'),
  A('skitour', 'Skitour / Bergsteigen', 9.0, 'Winter & Berg'),
  A('ski_alpin', 'Ski alpin', 5.3, 'Winter & Berg'),
  A('snowboard', 'Snowboard', 5.3, 'Winter & Berg'),
  A('schneeschuh', 'Schneeschuhwandern', 7.5, 'Winter & Berg'),
  A('klettern', 'Klettern / Bouldern', 7.5, 'Winter & Berg'),
  A('eislaufen', 'Eislaufen', 7.0, 'Winter & Berg'),
  // Ball & Rückschlag
  A('fussball', 'Fußball', 8.0, 'Ball & Rückschlag'),
  A('basketball', 'Basketball', 6.5, 'Ball & Rückschlag'),
  A('volleyball', 'Volleyball', 4.0, 'Ball & Rückschlag'),
  A('beachvolleyball', 'Beachvolleyball', 8.0, 'Ball & Rückschlag'),
  A('handball', 'Handball', 8.0, 'Ball & Rückschlag'),
  A('tennis', 'Tennis', 7.3, 'Ball & Rückschlag'),
  A('padel', 'Padel', 6.5, 'Ball & Rückschlag'),
  A('badminton', 'Badminton', 5.5, 'Ball & Rückschlag'),
  A('squash', 'Squash', 9.0, 'Ball & Rückschlag'),
  A('tischtennis', 'Tischtennis', 4.0, 'Ball & Rückschlag'),
  A('eishockey', 'Eishockey / Unihockey', 8.0, 'Ball & Rückschlag'),
  A('golf', 'Golf (zu Fuß)', 4.8, 'Ball & Rückschlag'),
  // Kampf & Tanz
  A('boxen', 'Boxen (Sack / Pratzen)', 7.8, 'Kampf & Tanz'),
  A('kickboxen', 'Kickboxen / Muay Thai', 9.0, 'Kampf & Tanz'),
  A('judo', 'Judo / BJJ / Ringen', 10.0, 'Kampf & Tanz'),
  A('karate', 'Karate / Taekwondo', 10.0, 'Kampf & Tanz'),
  A('tanzen', 'Tanzen (Zumba, Hip-Hop)', 6.5, 'Kampf & Tanz'),
  A('yoga_power', 'Power Yoga / Vinyasa', 4.0, 'Kampf & Tanz'),
  A('pilates', 'Pilates', 3.0, 'Kampf & Tanz'),
  // Alltag & Outdoor
  A('inline', 'Inlineskaten', 7.5, 'Alltag & Outdoor'),
  A('skateboard', 'Skateboard / Longboard', 5.0, 'Alltag & Outdoor'),
  A('reiten', 'Reiten', 5.5, 'Alltag & Outdoor'),
  A('gartenarbeit', 'Gartenarbeit (schwer)', 4.0, 'Alltag & Outdoor'),
  A('trampolin', 'Trampolin', 3.5, 'Alltag & Outdoor'),
  A('ruckmarsch', 'Rucking (Gehen mit Gewicht)', 6.5, 'Alltag & Outdoor'),
];

export const ACTIVITY_BY_ID = Object.fromEntries(CARDIO_ACTIVITIES.map((a) => [a.id, a]));

// Maximalpuls nach Tanaka et al. (2001): 208 − 0,7 × Alter – Streuung ca. ±10 Schläge, gemessener Wert geht vor.
// Zonen optional nach Karvonen (mit Ruhepuls).
export function heartRateZones(age, restingHr, maxHr = 0) {
  const max = maxHr ? Math.round(maxHr) : Math.round(208 - 0.7 * age);
  const z = (lo, hi) => {
    if (restingHr) {
      const r = max - restingHr;
      return [Math.round(restingHr + r * lo), Math.round(restingHr + r * hi)];
    }
    return [Math.round(max * lo), Math.round(max * hi)];
  };
  return {
    max,
    measured: !!maxHr,
    method: restingHr ? 'Karvonen (Herzfrequenzreserve)' : '% der maximalen Herzfrequenz',
    zones: [
      { id: 1, name: 'Zone 1 – Regeneration', range: z(0.5, 0.6), feel: 'Sehr locker, Unterhaltung mühelos' },
      { id: 2, name: 'Zone 2 – Grundlage', range: z(0.6, 0.7), feel: 'Locker, ganze Sätze sprechen möglich' },
      { id: 3, name: 'Zone 3 – Tempo', range: z(0.7, 0.8), feel: 'Zügig, nur kurze Sätze' },
      { id: 4, name: 'Zone 4 – Schwelle', range: z(0.8, 0.9), feel: 'Hart, nur einzelne Worte' },
      { id: 5, name: 'Zone 5 – Maximal', range: z(0.9, 1.0), feel: 'Sprint, nur Sekunden bis wenige Minuten' },
    ],
  };
}

const TEMPLATES = {
  zone2: { type: 'zone2', name: 'Grundlagenausdauer (Zone 2)', zone: 2, desc: 'Gleichmäßig locker – du könntest dich dabei unterhalten. Baut die aerobe Basis und stört den Muskelaufbau nicht.' },
  schwelle: { type: 'schwelle', name: 'Schwellen-Intervalle (Zone 4)', zone: 4, desc: '10 min locker einlaufen, dann 3 min zügig-hart (nur einzelne Worte möglich) im Wechsel mit 2 min locker, 5 min auslaufen. Hebt die Schwelle, ohne dich für den nächsten Tag leer zu machen.', intervals: { work: 180, rest: 120, start: 3, max: 5 } },
  vo2max: { type: 'vo2max', name: 'VO₂max-Intervalle (Zone 5)', zone: 5, desc: '10 min locker, dann 4 min sehr hart (Helgerud et al. 2007: 4×4) im Wechsel mit 3 min locker, 5 min auslaufen. Die wirksamste Einheit für die Sauerstoffaufnahme – nicht am Tag vor dem Beintraining.', intervals: { work: 240, rest: 180, start: 3, max: 4 } },
  lang: { type: 'lang', name: 'Lange lockere Einheit', zone: 2, desc: 'Längste Einheit der Woche, ruhig und gleichmäßig. Steigert sich von Woche zu Woche.' },
  tempo: { type: 'tempo', name: 'Tempo-Einheit (Zone 3)', zone: 3, desc: '10 min locker, dann zügig aber kontrolliert, 5 min locker ausklingen.' },
};

// Minuten pro Woche: linear steigend (max. +80 %), letzte Woche Deload.
function progression(base, step, weeks = 5, deload = 0.7) {
  const out = [];
  for (let i = 0; i < weeks - 1; i++) out.push(Math.min(base + i * step, Math.round(base * 1.8)));
  out.push(Math.round((base + step) * deload));
  return out;
}

// Intervall-Runden pro Woche: von start bis max bis zur letzten Aufbauwoche, Deload wieder start.
function roundsProgression(start, max, weeks = 5) {
  const out = [];
  const build = Math.max(1, weeks - 2);
  for (let i = 0; i < weeks - 1; i++) out.push(Math.min(max, start + Math.floor((i * (max - start)) / build + 1e-9)));
  out.push(start);
  return out;
}

const GOAL_PLANS = {
  muskelaufbau: { sessions: 2, list: [['zone2', 20, 5], ['zone2', 20, 5], ['schwelle', 25, 3], ['zone2', 25, 5]] },
  fettabbau: { sessions: 3, list: [['zone2', 30, 5], ['schwelle', 25, 3], ['zone2', 30, 5], ['lang', 45, 5], ['vo2max', 30, 3]] },
  kraft: { sessions: 1, list: [['zone2', 20, 5], ['zone2', 20, 5], ['zone2', 25, 5]] },
  ausdauer: { sessions: 4, list: [['lang', 40, 8], ['vo2max', 30, 3], ['zone2', 30, 5], ['schwelle', 30, 3], ['zone2', 30, 5]] },
  fitness: { sessions: 2, list: [['zone2', 30, 5], ['zone2', 30, 5], ['schwelle', 25, 3], ['lang', 40, 5]] },
};

export function defaultCardioSessions(goal) {
  return (GOAL_PLANS[goal] || GOAL_PLANS.fitness).sessions;
}

export function isIntervalType(type) {
  return !!TEMPLATES[type]?.intervals || type === 'intervall';
}

// Cardio-Wochentage: zuerst trainingsfreie Tage, dann Oberkörpertage; Intervalle nicht am Tag vor einem Beintag
// und nicht am Beintag selbst (Interferenz, Schumann et al. 2022). Ergebnis: Wochentag oder null (flexibel).
export function assignCardioWeekdays(sessions, strengthDays = []) {
  const taken = new Set(strengthDays.map((d) => d.weekday).filter((x) => x != null));
  const lower = new Set(strengthDays.filter((d) => d.lower).map((d) => d.weekday));
  const upper = strengthDays.filter((d) => !d.lower && d.weekday != null).map((d) => d.weekday);
  const free = [0, 1, 2, 3, 4, 5, 6].filter((wd) => !taken.has(wd));
  // Freie Tage möglichst verteilt: erst der Tag nach der längsten Trainingsstrecke, dann der Rest.
  const order = [...free.sort((a, b) => a - b), ...upper];
  const usedDays = new Set();
  const beforeLower = (wd) => lower.has((wd + 1) % 7);
  const pickDay = (interval) => {
    const ok = (wd) => !usedDays.has(wd) && (!interval || (!beforeLower(wd) && !lower.has(wd)));
    let wd = order.find(ok);
    if (wd == null && interval) wd = order.find((x) => !usedDays.has(x) && !lower.has(x));
    if (wd == null) wd = order.find((x) => !usedDays.has(x));
    if (wd != null) usedDays.add(wd);
    return wd ?? null;
  };
  // Intervalle zuerst (am stärksten eingeschränkt), dann der Rest in Planreihenfolge.
  const intervalIdx = sessions.map((s, i) => (s.intervals ? i : -1)).filter((i) => i >= 0);
  const restIdx = sessions.map((s, i) => (s.intervals ? -1 : i)).filter((i) => i >= 0);
  const out = sessions.map(() => null);
  for (const i of intervalIdx) out[i] = pickDay(true);
  for (const i of restIdx) out[i] = pickDay(false);
  return out;
}

export function buildCardioPlan(profile, opts = {}) {
  const weeks = opts.weeks ?? 5;
  const gp = GOAL_PLANS[profile.goal] || GOAL_PLANS.fitness;
  const n = clamp(profile.cardioSessions ?? gp.sessions, 0, 5);
  const activities = profile.cardio?.length ? profile.cardio : ['walken'];
  const zones = heartRateZones(profile.age || 30, profile.restingHr || 0, profile.maxHr || 0);
  const flags = healthFlags(profile);
  const sessions = [];
  for (let i = 0; i < n; i++) {
    let [type, base, step] = gp.list[i % gp.list.length];
    // Positives Gesundheits-Screening oder Schwangerschaft: keine harten Intervalle, dafür lockere Grundlage.
    if (flags.noIntervals && TEMPLATES[type].intervals) [type, base, step] = ['zone2', Math.max(base, 25), 5];
    const t = TEMPLATES[type];
    const activity = t.intervals ? activities.find((a) => a !== 'walken') || activities[0] : activities[i % activities.length];
    sessions.push({
      id: `c${i + 1}`,
      type,
      name: t.name,
      zone: t.zone,
      desc: t.desc,
      activity,
      weekday: null,
      minutesByWeek: progression(base, step, weeks),
      intervals: t.intervals ? { work: t.intervals.work, rest: t.intervals.rest, roundsByWeek: roundsProgression(t.intervals.start, t.intervals.max, weeks) } : null,
    });
  }
  const weekdays = assignCardioWeekdays(sessions, opts.strengthDays || []);
  sessions.forEach((s, i) => (s.weekday = weekdays[i]));
  const weeklyMinutes = sessions.map((s) => s.minutesByWeek);
  let hint = n === 0
    ? 'Kein Cardio geplant. Für Herz-Kreislauf-Gesundheit empfiehlt die WHO 150–300 min moderate Aktivität pro Woche.'
    : 'Cardio liegt auf trainingsfreien Tagen oder nach Oberkörpertagen; Intervalle nicht am Tag vor dem Beintraining. Die Tage sind Vorschläge – wichtig ist, dass sie stattfinden.';
  if (n > 0 && flags.noIntervals) hint += ' Wegen deiner Gesundheitsangaben sind alle Einheiten locker (Zone 2) geplant – Intervalle erst nach ärztlicher Freigabe.';
  return {
    sessionsPerWeek: n,
    sessions,
    zones,
    weeks,
    weeklyMinutesByWeek: Array.from({ length: weeks }, (_, w) => weeklyMinutes.reduce((a, m) => a + (m[w] || 0), 0)),
    hint,
  };
}

// Netto-Energie: MET enthält den Ruheumsatz (1 MET), der im Grundumsatz schon steckt → (MET − 1).
export function cardioKcal(activityId, minutes, weightKg) {
  const a = ACTIVITY_BY_ID[activityId] || ACTIVITY_BY_ID.walken;
  return Math.round((((a.met - 1) * 3.5 * weightKg) / 200) * minutes);
}

export const CARDIO_GROUPS = [...new Set(CARDIO_ACTIVITIES.map((a) => a.group))];

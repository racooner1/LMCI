// Cardio: Herzfrequenzzonen und Wochenplanung.
import { clamp } from './util.js';

export const CARDIO_ACTIVITIES = [
  { id: 'laufen', name: 'Laufen', kcalPerKgMin: 0.16 },
  { id: 'walken', name: 'Zügiges Gehen / Wandern', kcalPerKgMin: 0.08 },
  { id: 'rad', name: 'Radfahren / Ergometer', kcalPerKgMin: 0.12 },
  { id: 'rudern', name: 'Rudern (Ergometer)', kcalPerKgMin: 0.14 },
  { id: 'crosstrainer', name: 'Crosstrainer', kcalPerKgMin: 0.11 },
  { id: 'schwimmen', name: 'Schwimmen', kcalPerKgMin: 0.13 },
  { id: 'seilspringen', name: 'Seilspringen', kcalPerKgMin: 0.18 },
];

export const ACTIVITY_BY_ID = Object.fromEntries(CARDIO_ACTIVITIES.map((a) => [a.id, a]));

// Maximalpuls nach Tanaka et al. (2001): 208 − 0,7 × Alter. Zonen optional nach Karvonen (mit Ruhepuls).
export function heartRateZones(age, restingHr) {
  const max = Math.round(208 - 0.7 * age);
  const z = (lo, hi) => {
    if (restingHr) {
      const r = max - restingHr;
      return [Math.round(restingHr + r * lo), Math.round(restingHr + r * hi)];
    }
    return [Math.round(max * lo), Math.round(max * hi)];
  };
  return {
    max,
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
  intervall: { type: 'intervall', name: 'Intervalle (HIIT)', zone: 4, desc: '5 min locker einlaufen, dann Intervalle hart / locker, 5 min auslaufen. Kurz und intensiv – möglichst nicht direkt vor dem Beintraining.' },
  lang: { type: 'lang', name: 'Lange lockere Einheit', zone: 2, desc: 'Längste Einheit der Woche, ruhig und gleichmäßig. Steigert sich von Woche zu Woche.' },
  tempo: { type: 'tempo', name: 'Tempo-Einheit (Zone 3)', zone: 3, desc: '10 min locker, dann zügig aber kontrolliert, 5 min locker ausklingen.' },
};

// Wochenminuten pro Vorlage: [Wo1, Wo2, Wo3, Wo4, Deload]
function progression(base, step, deload = 0.7) {
  return [base, base + step, base + 2 * step, base + 3 * step, Math.round((base + step) * deload)];
}

const GOAL_PLANS = {
  muskelaufbau: { sessions: 2, list: [['zone2', 20, 5], ['zone2', 20, 5], ['zone2', 25, 5], ['intervall', 16, 2]] },
  fettabbau: { sessions: 3, list: [['zone2', 30, 5], ['zone2', 30, 5], ['intervall', 18, 2], ['zone2', 35, 5], ['lang', 45, 5]] },
  kraft: { sessions: 1, list: [['zone2', 20, 5], ['zone2', 20, 5], ['zone2', 25, 5]] },
  ausdauer: { sessions: 3, list: [['lang', 40, 8], ['intervall', 22, 3], ['zone2', 30, 5], ['tempo', 30, 4], ['zone2', 30, 5]] },
  fitness: { sessions: 2, list: [['zone2', 30, 5], ['zone2', 30, 5], ['intervall', 18, 2], ['lang', 40, 5]] },
};

export function defaultCardioSessions(goal) {
  return (GOAL_PLANS[goal] || GOAL_PLANS.fitness).sessions;
}

export function buildCardioPlan(profile) {
  const gp = GOAL_PLANS[profile.goal] || GOAL_PLANS.fitness;
  const n = clamp(profile.cardioSessions ?? gp.sessions, 0, 5);
  const activities = profile.cardio?.length ? profile.cardio : ['walken'];
  const zones = heartRateZones(profile.age || 30, profile.restingHr || 0);
  const sessions = [];
  for (let i = 0; i < n; i++) {
    const [type, base, step] = gp.list[i % gp.list.length];
    const t = TEMPLATES[type];
    const activity = type === 'intervall' ? activities.find((a) => a !== 'walken') || activities[0] : activities[i % activities.length];
    sessions.push({
      id: `c${i + 1}`,
      type,
      name: t.name,
      zone: t.zone,
      desc: t.desc,
      activity,
      minutesByWeek: progression(base, step),
      intervals: type === 'intervall' ? { work: 60, rest: 90, roundsByWeek: [6, 7, 8, 8, 5] } : null,
    });
  }
  const weeklyMinutes = sessions.map((s) => s.minutesByWeek);
  return {
    sessionsPerWeek: n,
    sessions,
    zones,
    weeklyMinutesByWeek: [0, 1, 2, 3, 4].map((w) => weeklyMinutes.reduce((a, m) => a + m[w], 0)),
    hint: n === 0 ? 'Kein Cardio geplant. Für Herz-Kreislauf-Gesundheit empfiehlt die WHO 150–300 min moderate Aktivität pro Woche.' : 'Cardio am besten an trainingsfreien Tagen oder nach dem Krafttraining – nicht davor.',
  };
}

export function cardioKcal(activityId, minutes, weightKg) {
  const a = ACTIVITY_BY_ID[activityId] || CARDIO_ACTIVITIES[1];
  return Math.round(a.kcalPerKgMin * weightKg * minutes);
}

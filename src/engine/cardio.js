// Cardio: Herzfrequenzzonen und Wochenplanung.
import { clamp } from './util.js';

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
  const a = ACTIVITY_BY_ID[activityId] || ACTIVITY_BY_ID.walken;
  return Math.round(((a.met * 3.5 * weightKg) / 200) * minutes);
}

export const CARDIO_GROUPS = [...new Set(CARDIO_ACTIVITIES.map((a) => a.group))];

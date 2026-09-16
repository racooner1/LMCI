// Herausforderungen: jede Woche drei, jeden Monat eine – aus den Daten berechnet, mit XP-Belohnung.
import { toISODate, startOfWeek, addDays, seededRandom } from './util.js';
import { totalSets, totalTonnage, personalRecords } from './analytics.js';
import { getExercise } from '../data/exercises.js';
import { isPerfectDay } from './goals.js';

const LEGS = new Set(['quadrizeps', 'beinbeuger', 'gesaess', 'waden']);

// Kennzahlen für einen Zeitraum [from, to] (ISO-Daten, inklusive).
export function periodMetrics(s, from, to) {
  const inP = (d) => d >= from && d <= to;
  const workouts = s.workouts.filter((w) => inP(w.date));
  const cardio = s.cardioLogs.filter((c) => inP(c.date));
  const earlier = s.workouts.filter((w) => w.date < from);
  let prs = 0;
  // Bestleistungen im Zeitraum: chronologisch gegen alles davor vergleichen
  const sorted = [...workouts].sort((a, b) => (a.date < b.date ? -1 : 1));
  const history = [...earlier];
  for (const w of sorted) {
    const before = Object.fromEntries(personalRecords(history).map((r) => [r.exId, r]));
    for (const e of w.entries) {
      const best = personalRecords([w]).find((r) => r.exId === e.exId);
      if (!best) continue;
      const prev = before[e.exId];
      if (best.e1rm > 0 ? !prev || best.e1rm > prev.e1rm + 0.05 : !prev || best.reps > prev.reps) prs += 1;
    }
    history.push(w);
  }
  let legSets = 0;
  const ex = new Set();
  for (const w of workouts) {
    for (const e of w.entries) {
      ex.add(e.exId);
      const x = getExercise(e.exId);
      if (x && x.primary.some((m) => LEGS.has(m))) legSets += e.sets.filter((st) => st.reps > 0).length;
    }
  }
  const days = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return {
    workouts: workouts.length,
    sets: workouts.reduce((a, w) => a + totalSets(w), 0),
    tonnage: workouts.reduce((a, w) => a + totalTonnage(w), 0),
    cardioMin: cardio.reduce((a, c) => a + (c.minutes || 0), 0),
    cardioSessions: cardio.length,
    checkins: (s.checkins || []).filter((c) => inP(c.date)).length,
    foodDays: days.filter((d) => (s.foodLog?.[d] || []).length >= 3).length,
    waterDays: days.filter((d) => (s.waterLog?.[d] || 0) >= 1500).length,
    mobility: (s.mobilityLogs || []).filter((d) => inP(d)).length,
    weights: s.bodyLogs.filter((b) => inP(b.date)).length,
    perfectDays: days.filter((d) => d <= toISODate() && isPerfectDay(s, d)).length,
    prs,
    legSets,
    quick: workouts.filter((w) => w.dayId === 'schnell').length,
    early: workouts.filter((w) => w.finishedAt && new Date(w.finishedAt).getHours() < 9).length,
    variety: ex.size,
    activeDays: days.filter((d) => workouts.some((w) => w.date === d) || cardio.some((c) => c.date === d) || (s.mobilityLogs || []).includes(d)).length,
  };
}

const C = (id, name, icon, metric, target, xp, desc, only = null) => ({ id, name, icon, metric, target, xp, desc, only });

export const WEEKLY_POOL = [
  C('kraft_all', 'Alle Krafteinheiten', 'dumbbell', 'workouts', (p) => Math.max(2, p.strengthDays || 3), 60, (t) => `${t} Krafteinheiten diese Woche`),
  C('cardio_min', 'Ausdauer', 'run', 'cardioMin', (p) => Math.max(60, (p.cardioSessions || 2) * 30), 50, (t) => `${t} Cardio-Minuten`, (p) => (p.cardioSessions ?? 1) > 0),
  C('checkins', 'Selbstcheck', 'sun', 'checkins', () => 5, 40, (t) => `${t} Check-ins`),
  C('food_days', 'Ernährung im Blick', 'food', 'foodDays', () => 5, 50, (t) => `An ${t} Tagen Ernährung erfassen`),
  C('water_days', 'Hydriert', 'drop', 'waterDays', () => 5, 30, (t) => `An ${t} Tagen 1,5 l trinken`),
  C('mobility', 'Beweglich', 'stretch', 'mobility', () => 3, 40, (t) => `${t} Mobilitäts-Routinen`),
  C('sets', 'Volumen', 'list', 'sets', (p) => Math.max(20, (p.strengthDays || 3) * 14), 60, (t) => `${t} Arbeitssätze`),
  C('tonnage', 'Tonnen bewegen', 'weight', 'tonnage', (p) => Math.round(((p.weightKg || 75) * 120) / 1000) * 1000, 60, (t) => `${t.toLocaleString('de-DE')} kg bewegen`),
  C('pr', 'Bestleistung', 'trophy', 'prs', () => 1, 50, (t) => `${t} neue Bestleistung${t > 1 ? 'en' : ''}`),
  C('perfect', 'Perfekte Tage', 'star', 'perfectDays', () => 2, 70, (t) => `${t} perfekte Tage`),
  C('legs', 'Beintag', 'bolt', 'legSets', () => 12, 40, (t) => `${t} Sätze für Beine und Gesäß`),
  C('quick', 'Spontan', 'zap', 'quick', () => 1, 30, () => 'Ein Schnelltraining'),
  C('weigh', 'Waage', 'scale', 'weights', () => 4, 25, (t) => `${t}× wiegen`),
  C('early', 'Frühstart', 'sun', 'early', () => 1, 30, () => 'Ein Training vor 9 Uhr beenden'),
  C('variety', 'Abwechslung', 'refresh', 'variety', () => 15, 40, (t) => `${t} verschiedene Übungen`),
  C('active_days', 'Jeden Tag etwas', 'flame', 'activeDays', () => 5, 60, (t) => `An ${t} Tagen aktiv (Training, Cardio oder Mobilität)`),
];

export const MONTHLY_POOL = [
  C('m_workouts', 'Trainingsmonat', 'dumbbell', 'workouts', (p) => Math.max(8, (p.strengthDays || 3) * 4), 200, (t) => `${t} Trainings in diesem Monat`),
  C('m_cardio', 'Ausdauermonat', 'run', 'cardioMin', (p) => Math.max(240, (p.cardioSessions || 2) * 100), 180, (t) => `${t} Cardio-Minuten im Monat`, (p) => (p.cardioSessions ?? 1) > 0),
  C('m_perfect', 'Zehn perfekte Tage', 'star', 'perfectDays', () => 10, 250, (t) => `${t} perfekte Tage im Monat`),
  C('m_tonnage', 'Schwerlast', 'weight', 'tonnage', (p) => Math.round(((p.weightKg || 75) * 500) / 5000) * 5000, 200, (t) => `${t.toLocaleString('de-DE')} kg im Monat bewegen`),
  C('m_active', 'Zwanzig aktive Tage', 'flame', 'activeDays', () => 20, 220, (t) => `An ${t} Tagen im Monat aktiv`),
  C('m_checkins', 'Achtsam', 'sun', 'checkins', () => 20, 150, (t) => `${t} Check-ins im Monat`),
];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function pick(pool, profile, seedStr, n) {
  const rnd = seededRandom(hash(seedStr));
  const eligible = pool.filter((c) => !c.only || c.only(profile));
  const out = [];
  const bag = [...eligible];
  while (out.length < n && bag.length) out.push(bag.splice(Math.floor(rnd() * bag.length), 1)[0]);
  return out;
}

function materialize(c, profile, metrics) {
  const target = c.target(profile);
  const value = Math.min(target, metrics[c.metric] || 0);
  return { id: c.id, name: c.name, icon: c.icon, desc: c.desc(target), target, value, xp: c.xp, done: value >= target, progress: target ? value / target : 0 };
}

export function weeklyChallenges(s, weekStart = startOfWeek(toISODate())) {
  const m = periodMetrics(s, weekStart, addDays(weekStart, 6));
  return pick(WEEKLY_POOL, s.profile || {}, `w:${weekStart}:${s.meta?.createdAt || ''}`, 3).map((c) => materialize(c, s.profile || {}, m));
}

export function monthlyChallenge(s, monthKey = toISODate().slice(0, 7)) {
  const from = `${monthKey}-01`;
  const d = new Date(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)), 0);
  const to = toISODate(d);
  const m = periodMetrics(s, from, to);
  return materialize(pick(MONTHLY_POOL, s.profile || {}, `m:${monthKey}:${s.meta?.createdAt || ''}`, 1)[0], s.profile || {}, m);
}

// XP aus allen abgeschlossenen Herausforderungen seit Kontoerstellung.
export function challengeXP(s, today = toISODate()) {
  const first = s.meta?.createdAt || today;
  let xp = 0;
  let ws = startOfWeek(first);
  const cur = startOfWeek(today);
  let guard = 0;
  while (ws <= cur && guard++ < 520) {
    for (const c of weeklyChallenges(s, ws)) if (c.done) xp += c.xp;
    ws = addDays(ws, 7);
  }
  let mk = first.slice(0, 7);
  const curMk = today.slice(0, 7);
  guard = 0;
  while (mk <= curMk && guard++ < 120) {
    const c = monthlyChallenge(s, mk);
    if (c.done) xp += c.xp;
    const [y, mo] = mk.split('-').map(Number);
    mk = `${mo === 12 ? y + 1 : y}-${String(mo === 12 ? 1 : mo + 1).padStart(2, '0')}`;
  }
  return xp;
}

// Anzahl abgeschlossener Herausforderungen (für Abzeichen).
export function completedChallenges(s, today = toISODate()) {
  const first = s.meta?.createdAt || today;
  let n = 0;
  let ws = startOfWeek(first);
  const cur = startOfWeek(today);
  let guard = 0;
  while (ws <= cur && guard++ < 520) {
    n += weeklyChallenges(s, ws).filter((c) => c.done).length;
    ws = addDays(ws, 7);
  }
  let mk = first.slice(0, 7);
  const curMk = today.slice(0, 7);
  guard = 0;
  while (mk <= curMk && guard++ < 120) {
    if (monthlyChallenge(s, mk).done) n += 1;
    const [y, mo] = mk.split('-').map(Number);
    mk = `${mo === 12 ? y + 1 : y}-${String(mo === 12 ? 1 : mo + 1).padStart(2, '0')}`;
  }
  return n;
}

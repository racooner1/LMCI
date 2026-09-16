// Belohnungssystem: XP, Level, Tagesziele, perfekte Tage. Alles wird aus den Logs berechnet – nichts doppelt gespeichert.
import { toISODate } from './util.js';
import { totalSets } from './analytics.js';
import { nextSession } from './plan.js';
import { dayTotals } from './food.js';

export const XP = { workoutBase: 50, perSet: 8, pr: 25, cardioPerMin: 2, checkin: 10, food: 15, water: 5, weight: 5, mobility: 15, perfectDay: 40 };

export const LEVEL_TITLES = [
  [1, 'Neuling'], [3, 'Einsteiger'], [5, 'Dranbleiber'], [8, 'Stammgast'], [12, 'Athlet'], [16, 'Kraftpaket'], [20, 'Maschine'], [25, 'Legende'],
];

export function xpForWorkout(w, prCount = 0) {
  return XP.workoutBase + totalSets(w) * XP.perSet + prCount * XP.pr;
}

export function xpForCardio(c) {
  return Math.round(Math.min(120, c.minutes || 0) * XP.cardioPerMin);
}

// Tagesziele für ein Datum. Rückgabe: [{ id, label, hint, xp, done, href }]
export function dailyGoals(s, today = toISODate()) {
  const goals = [];
  const plan = s.plan;
  const workoutToday = s.workouts.some((w) => w.date === today);
  const cardioToday = s.cardioLogs.some((c) => c.date === today);
  const mobilityToday = (s.mobilityLogs || []).includes(today);
  const checkin = (s.checkins || []).some((c) => c.date === today);
  const food = dayTotals(s.foodLog?.[today] || []);
  const entries = (s.foodLog?.[today] || []).length;
  const water = s.waterLog?.[today] || 0;
  const weight = s.bodyLogs.some((b) => b.date === today);

  goals.push({ id: 'checkin', label: 'Check-in machen', hint: 'Schlaf, Stress, Energie', xp: XP.checkin, done: checkin, href: '#/heute', act: 'checkin' });
  const next = plan ? nextSession(plan, s.workouts, today) : null;
  if (next && (next.kind === 'heute' || next.kind === 'nachholen')) {
    goals.push({ id: 'training', label: `Training: ${next.day.name}`, hint: `${next.day.exercises.length} Übungen`, xp: XP.workoutBase, done: workoutToday, href: `#/workout/${next.day.id}` });
  } else {
    goals.push({ id: 'bewegung', label: 'Bewegung heute', hint: 'Cardio, Mobilität oder Schnelltraining', xp: XP.mobility, done: workoutToday || cardioToday || mobilityToday, href: '#/schnell' });
  }
  goals.push({ id: 'food', label: 'Ernährung erfassen', hint: 'mindestens 3 Einträge', xp: XP.food, done: entries >= 3 || food.kcal >= 800, href: '#/ernaehrung' });
  goals.push({ id: 'water', label: 'Genug trinken', hint: '6 Gläser (1,5 l)', xp: XP.water, done: water >= 1500, href: '#/ernaehrung' });
  goals.push({ id: 'mobility', label: 'Mobilität', hint: '10 Minuten', xp: XP.mobility, done: mobilityToday, href: '#/heute', act: 'mobility' });
  goals.push({ id: 'weight', label: 'Wiegen', hint: 'morgens, nüchtern', xp: XP.weight, done: weight, href: '#/heute', act: 'weight', optional: true });
  return goals;
}

export function isPerfectDay(s, date) {
  const g = dailyGoals(s, date).filter((x) => !x.optional);
  return g.length > 0 && g.every((x) => x.done);
}

// Gesamt-XP aus allen Daten.
export function totalXP(s) {
  let xp = 0;
  for (const w of s.workouts) xp += w.xp ?? xpForWorkout(w);
  for (const c of s.cardioLogs) xp += xpForCardio(c);
  xp += (s.checkins || []).length * XP.checkin;
  for (const list of Object.values(s.foodLog || {})) if (list.length >= 3) xp += XP.food;
  for (const ml of Object.values(s.waterLog || {})) if (ml >= 1500) xp += XP.water;
  xp += s.bodyLogs.length * XP.weight;
  xp += (s.mobilityLogs || []).length * XP.mobility;
  const days = new Set([...s.workouts.map((w) => w.date), ...(s.checkins || []).map((c) => c.date)]);
  for (const d of days) if (isPerfectDay(s, d)) xp += XP.perfectDay;
  return xp;
}

export function levelInfo(xp) {
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const start = 100 * (level - 1) ** 2;
  const next = 100 * level ** 2;
  const title = LEVEL_TITLES.filter(([l]) => level >= l).pop()[1];
  return { level, title, xp, start, next, progress: (xp - start) / (next - start), toNext: next - xp };
}

// XP eines Tages (für die Tagesanzeige).
export function xpToday(s, today = toISODate()) {
  const sub = {
    ...s,
    workouts: s.workouts.filter((w) => w.date === today),
    cardioLogs: s.cardioLogs.filter((c) => c.date === today),
    checkins: (s.checkins || []).filter((c) => c.date === today),
    foodLog: { [today]: s.foodLog?.[today] || [] },
    waterLog: { [today]: s.waterLog?.[today] || 0 },
    bodyLogs: s.bodyLogs.filter((b) => b.date === today),
    mobilityLogs: (s.mobilityLogs || []).filter((d) => d === today),
  };
  return totalXP(sub);
}

// Motivations-Text je nach Lage.
export function motivation(s, { streak, goals, today = toISODate() }) {
  const done = goals.filter((g) => !g.optional && g.done).length;
  const total = goals.filter((g) => !g.optional).length;
  const hour = new Date().getHours();
  if (done === total) return 'Perfekter Tag. Alles erledigt – mehr geht nicht.';
  if (streak >= 7 && done === 0 && hour >= 18) return `${streak} Tage Serie – ein kleiner Schritt heute reicht, um sie zu halten.`;
  if (streak >= 3 && done === 0) return `${streak} Tage in Folge. Heute weitermachen?`;
  if (done === 0) return 'Ein Häkchen reicht für den Anfang. Der Check-in dauert 30 Sekunden.';
  if (done >= total - 1) return 'Nur noch eins – dann ist der Tag perfekt.';
  return `${done} von ${total} Zielen geschafft. Weiter so.`;
}

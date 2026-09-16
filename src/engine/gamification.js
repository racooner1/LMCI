// Belohnungssystem: XP, Level, Tagesziele, perfekte Tage, Herausforderungen. Alles aus den Logs berechnet.
import { toISODate } from './util.js';
import { totalSets } from './analytics.js';
import { XP, dailyGoals, isPerfectDay } from './goals.js';
import { challengeXP, completedChallenges } from './challenges.js';
import { routineXP } from './routines.js';

export { XP, dailyGoals, isPerfectDay };

export const LEVEL_TITLES = [
  [1, 'Neuling'], [3, 'Einsteiger'], [5, 'Dranbleiber'], [8, 'Stammgast'], [12, 'Athlet'], [16, 'Kraftpaket'], [20, 'Maschine'], [25, 'Legende'],
];

export function xpForWorkout(w, prCount = 0, rankUps = 0) {
  return XP.workoutBase + totalSets(w) * XP.perSet + prCount * XP.pr + rankUps * XP.rankUp;
}

export function xpForCardio(c) {
  return Math.round(Math.min(120, c.minutes || 0) * XP.cardioPerMin);
}

// XP ohne Herausforderungen (für Tagesanzeige und Teil-Zustände).
export function baseXP(s) {
  let xp = 0;
  for (const w of s.workouts) xp += w.xp ?? xpForWorkout(w);
  for (const c of s.cardioLogs) xp += xpForCardio(c);
  xp += (s.checkins || []).length * XP.checkin;
  for (const list of Object.values(s.foodLog || {})) if (list.length >= 3) xp += XP.food;
  for (const ml of Object.values(s.waterLog || {})) if (ml >= 1500) xp += XP.water;
  xp += s.bodyLogs.length * XP.weight;
  xp += (s.mobilityLogs || []).length * XP.mobility;
  xp += routineXP(s);
  const days = new Set([...s.workouts.map((w) => w.date), ...(s.checkins || []).map((c) => c.date), ...Object.keys(s.routineLog || {})]);
  for (const d of days) if (isPerfectDay(s, d)) xp += XP.perfectDay;
  return xp;
}

// Gesamt-XP inkl. Herausforderungen.
export function totalXP(s, today = toISODate()) {
  return baseXP(s) + (s.meta ? challengeXP(s, today) : 0);
}

export function levelInfo(xp) {
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const start = 100 * (level - 1) ** 2;
  const next = 100 * level ** 2;
  const title = LEVEL_TITLES.filter(([l]) => level >= l).pop()[1];
  return { level, title, xp, start, next, progress: (xp - start) / (next - start), toNext: next - xp };
}

// XP eines Tages (für die Tagesanzeige, ohne Herausforderungen).
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
    routineLog: { [today]: s.routineLog?.[today] || [] },
  };
  return baseXP(sub);
}

// Motivations-Text je nach Lage.
export function motivation(s, { streak, goals, today = toISODate() }) {
  const done = goals.filter((g) => !g.optional && g.done).length;
  const total = goals.filter((g) => !g.optional).length;
  const hour = new Date().getHours();
  if (!total) return 'Heute ist nichts Pflicht – jedes Häkchen ist trotzdem ein Plus.';
  if (done === total) return 'Perfekter Tag. Alles erledigt – mehr geht nicht.';
  if (streak >= 7 && done === 0 && hour >= 18) return `${streak} Tage Serie – ein kleiner Schritt heute reicht, um sie zu halten.`;
  if (streak >= 3 && done === 0) return `${streak} Tage in Folge. Heute weitermachen?`;
  if (done === 0) return 'Ein Häkchen reicht für den Anfang. Der Check-in dauert 30 Sekunden.';
  if (done >= total - 1) return 'Nur noch eins – dann ist der Tag perfekt.';
  return `${done} von ${total} Zielen geschafft. Weiter so.`;
}

// Zusatzkontext für Abzeichen (Level, Herausforderungen, perfekte Tage).
export function badgeExtra(s, today = toISODate()) {
  return { level: levelInfo(totalXP(s, today)).level, challengesDone: s.meta ? completedChallenges(s, today) : 0, isPerfectDay };
}

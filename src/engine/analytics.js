// Auswertungen für Fortschritt und Dashboard.
import { getExercise } from '../data/exercises.js';
import { MUSCLES } from '../data/muscles.js';
import { bestE1RM } from './progression.js';
import { bestSet } from './records.js';
import { startOfWeek, addDays, toISODate } from './util.js';
import { isQuickLog } from './quicklog.js';

export function workoutsInWeek(workouts, weekStart) {
  const end = addDays(weekStart, 7);
  return workouts.filter((w) => w.date >= weekStart && w.date < end);
}

// Harte Sätze pro Muskel in einer Woche (Nebenmuskeln halb).
export function weeklyVolume(workouts, weekStart) {
  const vol = Object.fromEntries(MUSCLES.map((m) => [m.id, 0]));
  for (const w of workoutsInWeek(workouts, weekStart)) {
    for (const e of w.entries) {
      const ex = getExercise(e.exId);
      if (!ex) continue;
      const n = e.sets.filter((s) => s.reps > 0).length;
      for (const m of ex.primary) vol[m] += n;
      for (const m of ex.secondary) vol[m] += n * 0.5;
    }
  }
  return vol;
}

export function totalTonnage(workout) {
  let t = 0;
  for (const e of workout.entries) for (const s of e.sets) if (s.reps > 0) t += (s.weight || 0) * s.reps;
  return Math.round(t);
}

export function totalSets(workout) {
  return workout.entries.reduce((a, e) => a + e.sets.filter((s) => s.reps > 0).length, 0);
}

// Verlauf des geschätzten 1RM je Übung: [{date, e1rm}]
export function e1rmHistory(workouts, exId) {
  const out = [];
  for (const w of [...workouts].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    const e = w.entries.find((x) => x.exId === exId);
    if (!e) continue;
    const v = bestE1RM(e);
    if (v > 0) out.push({ date: w.date, e1rm: v });
  }
  return out;
}

// Frühere Einträge einer Übung (ältester zuerst), für die Progression.
export function historyFor(workouts, exId, limit = 6) {
  const list = [];
  for (const w of [...workouts].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    const e = w.entries.find((x) => x.exId === exId && x.sets.some((s) => s.reps > 0));
    if (e) list.push({ date: w.date, sets: e.sets });
  }
  return list.slice(-limit);
}

// Beste Leistung je Übung: bei Gewicht der Satz mit dem höchsten geschätzten 1RM, ohne Gewicht die meisten Wiederholungen.
export function personalRecords(workouts) {
  const best = {};
  for (const w of workouts) {
    for (const e of w.entries) {
      const b = bestSet(e);
      if (!b) continue;
      const cur = best[e.exId];
      const better = !cur || b.e1rm > cur.e1rm || (b.e1rm === cur.e1rm && (b.weight > cur.weight || (b.e1rm === 0 && b.reps > cur.reps)));
      if (better) best[e.exId] = { exId: e.exId, e1rm: b.e1rm, weight: b.weight, reps: b.reps, date: w.date };
    }
  }
  return Object.values(best).sort((a, b) => b.e1rm - a.e1rm || b.reps - a.reps);
}

// Neue Rekorde in einem Workout im Vergleich zu allen früheren.
export function newRecords(workout, previousWorkouts) {
  const prev = Object.fromEntries(personalRecords(previousWorkouts).map((r) => [r.exId, r]));
  const out = [];
  for (const e of workout.entries) {
    const v = bestE1RM(e);
    const ex = getExercise(e.exId);
    if (!ex) continue;
    if (v > 0 && (!prev[e.exId] || v > prev[e.exId].e1rm + 0.05)) out.push({ exId: e.exId, e1rm: v, name: ex.name });
    else if (v === 0) {
      const reps = Math.max(0, ...e.sets.map((s) => s.reps || 0));
      if (reps > 0 && (!prev[e.exId] || reps > prev[e.exId].reps)) out.push({ exId: e.exId, reps, name: ex.name });
    }
  }
  return out;
}

export function adherence(plan, workouts, weekStart) {
  const done = workoutsInWeek(workouts, weekStart).filter((w) => w.planId === plan.id);
  return { done: done.length, planned: plan.days.length, dayIds: new Set(done.map((w) => w.dayId)) };
}

export function streakWeeks(plan, workouts, today = toISODate()) {
  let streak = 0;
  let ws = startOfWeek(today);
  for (let i = 0; i < 52; i++) {
    const a = adherence(plan, workouts, ws);
    if (a.done >= Math.max(1, a.planned - 1)) streak++;
    else if (i > 0) break;
    else if (a.done === 0) break;
    ws = addDays(ws, -7);
  }
  return streak;
}

export function weeklySeries(workouts, cardioLogs, weeks = 8, today = toISODate()) {
  const out = [];
  let ws = addDays(startOfWeek(today), -7 * (weeks - 1));
  for (let i = 0; i < weeks; i++) {
    const end = addDays(ws, 7);
    const wk = workouts.filter((w) => w.date >= ws && w.date < end);
    const cl = cardioLogs.filter((c) => c.date >= ws && c.date < end);
    out.push({ weekStart: ws, sessions: wk.filter((w) => !isQuickLog(w)).length, sets: wk.reduce((a, w) => a + totalSets(w), 0), tonnage: wk.reduce((a, w) => a + totalTonnage(w), 0), cardioMin: cl.reduce((a, c) => a + (c.minutes || 0), 0) });
    ws = end;
  }
  return out;
}

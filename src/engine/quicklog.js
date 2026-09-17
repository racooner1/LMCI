// Schnelleintrag: einzelne Sätze festhalten, ohne ein Training zu starten
// („eben 10 Liegestütze gemacht“). Solche Einträge sind Workouts mit dayId 'log':
// Sie zählen für Volumen, Bestleistungen, XP und Streak – aber nicht als geplante Einheit.
import { toISODate, uid, clamp } from './util.js';
import { XP } from './xp.js';

export const LOG_DAY_ID = 'log';
export const LOG_DAY_NAME = 'Schnelleintrag';
export const MAX_SETS_PER_LOG = 20;
export const MAX_REPS = 999;

export const isQuickLog = (w) => w?.dayId === LOG_DAY_ID;

// Zahlen aus Eingabefeldern (auch mit Komma) robust lesen.
const toNum = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

// Nur echte Einheiten (für „Trainings gesamt“, Abzeichen und Wochenzählungen).
export const sessionWorkouts = (workouts) => (workouts || []).filter((w) => !isQuickLog(w));

export const quickLogWorkouts = (workouts) => (workouts || []).filter(isQuickLog);

export const quickLogFor = (s, date = toISODate()) => (s.workouts || []).find((w) => isQuickLog(w) && w.date === date) || null;

export const countSets = (w) => (w?.entries || []).reduce((a, e) => a + e.sets.filter((x) => x.reps > 0).length, 0);

// XP eines Schnelleintrag-Tages: pro Satz, plus Bonus für Bestleistungen. Kein Grundbetrag wie bei einer Einheit.
export const quickLogXP = (w) => countSets(w) * XP.perSet + (w.prs || 0) * XP.pr;

// Sätze eintragen. Wird innerhalb von store.update(...) aufgerufen und gibt den Tages-Eintrag zurück.
export function addQuickSets(st, { exId, reps, weight = 0, sets = 1, date = toISODate(), rir = null, records = 0 }) {
  const n = clamp(Math.round(toNum(sets) || 1), 1, MAX_SETS_PER_LOG);
  const r = clamp(Math.round(toNum(reps)), 1, MAX_REPS);
  const kg = Math.max(0, toNum(weight));
  st.workouts ||= [];
  const now = new Date().toISOString();
  let w = st.workouts.find((x) => isQuickLog(x) && x.date === date);
  if (!w) {
    w = { id: uid(), planId: null, dayId: LOG_DAY_ID, date, startedAt: now, finishedAt: now, entries: [], prs: 0 };
    st.workouts.push(w);
  }
  w.finishedAt = now;
  let entry = w.entries.find((e) => e.exId === exId);
  if (!entry) {
    entry = { exId, sets: [] };
    w.entries.push(entry);
  }
  for (let i = 0; i < n; i++) entry.sets.push({ weight: kg, reps: r, rir });
  w.prs = (w.prs || 0) + Math.max(0, Math.round(records));
  w.xp = quickLogXP(w);
  return w;
}

// Letzten Satz einer Übung zurücknehmen. Gibt true zurück, wenn etwas entfernt wurde.
export function undoQuickSet(st, date, exId) {
  const w = (st.workouts || []).find((x) => isQuickLog(x) && x.date === date);
  const entry = w?.entries.find((e) => e.exId === exId);
  if (!entry) return false;
  entry.sets.pop();
  cleanup(st, w, entry);
  return true;
}

// Eine Übung komplett aus dem Tages-Eintrag entfernen.
export function removeQuickEntry(st, date, exId) {
  const w = (st.workouts || []).find((x) => isQuickLog(x) && x.date === date);
  const entry = w?.entries.find((e) => e.exId === exId);
  if (!entry) return false;
  entry.sets = [];
  cleanup(st, w, entry);
  return true;
}

function cleanup(st, w, entry) {
  if (!entry.sets.length) w.entries = w.entries.filter((e) => e !== entry);
  if (!w.entries.length) {
    st.workouts = st.workouts.filter((x) => x !== w);
    return;
  }
  w.prs = Math.min(w.prs || 0, countSets(w));
  w.xp = quickLogXP(w);
}

// Übersicht eines Tages: [{ exId, sets, reps, weight, totalReps }] – reps ist die höchste Satzleistung.
export function quickLogSummary(s, date = toISODate()) {
  const w = quickLogFor(s, date);
  if (!w) return [];
  return w.entries.map((e) => {
    const sets = e.sets.filter((x) => x.reps > 0);
    return {
      exId: e.exId,
      sets: sets.length,
      reps: Math.max(0, ...sets.map((x) => x.reps)),
      weight: Math.max(0, ...sets.map((x) => x.weight || 0)),
      totalReps: sets.reduce((a, x) => a + x.reps, 0),
      equal: sets.every((x) => x.reps === sets[0]?.reps && (x.weight || 0) === (sets[0]?.weight || 0)),
    };
  });
}

// Wiederholungen einer Übung in einem Zeitraum (alle Einträge, nicht nur Schnelleinträge).
export function repsInPeriod(s, exId, from, to = toISODate()) {
  let reps = 0;
  for (const w of s.workouts || []) {
    if (w.date < from || w.date > to) continue;
    for (const e of w.entries) if (e.exId === exId) for (const x of e.sets) reps += x.reps > 0 ? x.reps : 0;
  }
  return reps;
}

// Zuletzt per Schnelleintrag genutzte Übungen (neueste zuerst).
export function recentQuickExercises(s, limit = 6) {
  const seen = [];
  for (const w of quickLogWorkouts(s.workouts).sort((a, b) => (a.date < b.date ? 1 : -1))) {
    for (const e of w.entries) if (!seen.includes(e.exId)) seen.push(e.exId);
    if (seen.length >= limit) break;
  }
  return seen.slice(0, limit);
}

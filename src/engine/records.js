// Bestleistungen als Spiel: Rekord-Chronik, Rekord-Serie (Wochen in Folge stärker), Ränge von Bronze bis Diamant
// und die nächsten Ziele. Alles wird aus den Trainings-Logs berechnet, nichts wird doppelt gespeichert.
import { toISODate, startOfWeek, addDays, daysBetween, estimate1RM, clamp } from './util.js';
import { getExercise } from '../data/exercises.js';
import { referenceE1RM, estimateStartReps } from './plan.js';

// Ränge nach Kraftwert: 100 Punkte = Referenz eines Fortgeschrittenen mit deinem Körpergewicht, Geschlecht und Alter.
export const RANKS = [
  { id: 'bronze', name: 'Bronze', min: 0, emoji: '🥉' },
  { id: 'silber', name: 'Silber', min: 55, emoji: '🥈' },
  { id: 'gold', name: 'Gold', min: 80, emoji: '🥇' },
  { id: 'platin', name: 'Platin', min: 105, emoji: '💠' },
  { id: 'diamant', name: 'Diamant', min: 130, emoji: '💎' },
];

export const RECORD_STREAK_MILESTONES = [3, 5, 8, 12, 20, 30];

const KG_CLUBS = [20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200, 220, 250, 300];
const BW_MULTIPLES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const REP_CLUBS = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];
const round1 = (v) => Math.round(v * 10) / 10;

// Bester Satz eines Eintrags: bei Gewicht der Satz mit dem höchsten geschätzten 1RM, sonst die meisten Wiederholungen.
export function bestSet(entry) {
  const sets = (entry?.sets || []).filter((s) => s && s.reps > 0);
  if (!sets.length) return null;
  let best = null;
  for (const s of sets) {
    if (!s.weight) continue;
    const e1rm = estimate1RM(s.weight, Math.min(s.reps, 12));
    if (!best || e1rm > best.e1rm + 1e-9 || (Math.abs(e1rm - best.e1rm) < 1e-9 && s.weight > best.weight)) best = { e1rm, weight: s.weight, reps: s.reps };
  }
  if (best) return { ...best, e1rm: round1(best.e1rm) };
  return { e1rm: 0, weight: 0, reps: Math.max(...sets.map((s) => s.reps)) };
}

// Referenz-Wiederholungen (Fortgeschritten) für Körpergewichts-, Zeit- und Bandübungen.
export function referenceReps(ex, profile) {
  if (!ex?.bwReps || !profile) return 0;
  return estimateStartReps(ex, { ...profile, experience: 'fortgeschritten' }) || 0;
}

// Kraftwert (Punkte) einer Leistung für eine Übung. null, wenn kein Vergleichswert bekannt ist.
export function strengthScore(ex, perf, profile) {
  if (!ex || !perf || !profile) return null;
  if (['bw', 'time', 'band'].includes(ex.load)) {
    const ref = referenceReps(ex, profile);
    return ref && perf.reps > 0 ? Math.round((perf.reps / ref) * 100) : null;
  }
  const ref = referenceE1RM(ex, profile);
  return ref && perf.e1rm > 0 ? Math.round((perf.e1rm / ref) * 100) : null;
}

export function rankInfo(score) {
  if (score == null || Number.isNaN(score)) return null;
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (score >= RANKS[i].min) idx = i;
  const rank = RANKS[idx];
  const next = RANKS[idx + 1] || null;
  const progress = next ? clamp((score - rank.min) / (next.min - rank.min), 0, 1) : 1;
  return { ...rank, idx, next, progress, score, toNext: next ? next.min - score : 0 };
}

// Alle Rekord-Momente chronologisch: erster Eintrag einer Übung ('first') und jede Steigerung ('improve').
export function recordEvents(workouts, profile = null) {
  const sorted = [...workouts].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.finishedAt || '') < (b.finishedAt || '') ? -1 : 1));
  const best = {};
  const events = [];
  for (const w of sorted) {
    for (const e of w.entries || []) {
      const ex = getExercise(e.exId);
      if (!ex) continue;
      const cur = bestSet(e);
      if (!cur) continue;
      const prev = best[e.exId];
      const kg = cur.e1rm > 0;
      const better = kg ? !prev || cur.e1rm > (prev.e1rm || 0) + 0.05 : !prev || (!(prev.e1rm > 0) && cur.reps > prev.reps);
      if (!better) continue;
      const scoreBefore = prev ? strengthScore(ex, prev, profile) : null;
      const score = strengthScore(ex, cur, profile);
      const rankBefore = scoreBefore == null ? null : rankInfo(scoreBefore);
      const rank = rankInfo(score);
      events.push({
        date: w.date,
        workoutId: w.id || null,
        exId: e.exId,
        name: ex.name,
        kind: prev ? 'improve' : 'first',
        mode: kg ? 'kg' : 'reps',
        e1rm: cur.e1rm,
        weight: cur.weight,
        reps: cur.reps,
        delta: prev ? (kg ? round1(cur.e1rm - (prev.e1rm || 0)) : cur.reps - prev.reps) : 0,
        prev: prev ? { e1rm: prev.e1rm, weight: prev.weight, reps: prev.reps, date: prev.date } : null,
        score,
        rank,
        rankUp: !!(prev && rank && rankBefore && rank.idx > rankBefore.idx),
        rankBefore,
      });
      best[e.exId] = { ...cur, date: w.date };
    }
  }
  return events;
}

// Rekord-Momente eines einzelnen (neuen) Trainings im Vergleich zu allen früheren.
export function newRecordEvents(workout, previousWorkouts, profile = null) {
  const id = workout.id || '__neu__';
  return recordEvents([...previousWorkouts, { ...workout, id }], profile).filter((ev) => ev.workoutId === id);
}

// Rekord-Serie: Wochen in Folge mit mindestens einer Steigerung. Die laufende Woche darf noch fehlen.
export function recordStreak(events, today = toISODate()) {
  const weeks = new Set(events.filter((e) => e.kind === 'improve').map((e) => startOfWeek(e.date)));
  const cur = startOfWeek(today);
  let ws = weeks.has(cur) ? cur : addDays(cur, -7);
  let streak = 0;
  while (weeks.has(ws) && streak < 520) {
    streak += 1;
    ws = addDays(ws, -7);
  }
  let best = 0;
  let run = 0;
  let prev = null;
  for (const w of [...weeks].sort()) {
    run = prev && addDays(prev, 7) === w ? run + 1 : 1;
    best = Math.max(best, run);
    prev = w;
  }
  const thisWeek = weeks.has(cur);
  return { weeks: streak, best: Math.max(best, streak), thisWeek, atRisk: streak > 0 && !thisWeek, daysLeft: 6 - ((new Date(today).getDay() + 6) % 7) };
}

// Die letzten n Wochen: wie viele Steigerungen je Woche (für den Wochenstreifen).
export function recordWeeks(events, today = toISODate(), n = 8) {
  const cur = startOfWeek(today);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const ws = addDays(cur, -7 * i);
    const end = addDays(ws, 7);
    out.push({ weekStart: ws, count: events.filter((e) => e.kind === 'improve' && e.date >= ws && e.date < end).length, current: i === 0 });
  }
  return out;
}

const fmtMult = (m) => `${String(m).replace('.', ',')}× Körpergewicht`;

// Nächste Ziele für eine Bestleistung: nächster Rang, runde Zahl (Club), Körpergewicht-Vielfaches.
export function nextTargets(ex, rec, profile) {
  if (!ex || !rec) return [];
  const out = [];
  const push = (kind, label, target, current, unit) => {
    if (target > current) out.push({ kind, label, target: round1(target), current, gap: round1(target - current), gapPct: (target - current) / Math.max(1, current), progress: current / target, unit });
  };
  if (rec.mode === 'kg') {
    const cur = rec.e1rm;
    const ref = profile ? referenceE1RM(ex, profile) : 0;
    const rank = ref ? rankInfo(strengthScore(ex, rec, profile)) : null;
    if (rank?.next) push('rank', rank.next.name, (rank.next.min / 100) * ref, cur, 'kg');
    const club = KG_CLUBS.find((c) => c > cur);
    if (club) push('club', `${club}-kg-Club`, club, cur, 'kg');
    if (ex.load === 'barbell' && profile?.weightKg) {
      const m = BW_MULTIPLES.find((x) => x * profile.weightKg > cur);
      if (m) push('bw', fmtMult(m), m * profile.weightKg, cur, 'kg');
    }
  } else {
    const cur = rec.reps;
    const ref = profile ? referenceReps(ex, profile) : 0;
    const rank = ref ? rankInfo(strengthScore(ex, rec, profile)) : null;
    if (rank?.next) push('rank', rank.next.name, Math.ceil((rank.next.min / 100) * ref), cur, ex.load === 'time' ? 's' : 'Wdh.');
    const club = REP_CLUBS.find((c) => c > cur);
    if (club) push('club', `${club} ${ex.load === 'time' ? 'Sekunden' : 'Wiederholungen'}`, club, cur, ex.load === 'time' ? 's' : 'Wdh.');
  }
  return out.sort((a, b) => a.gapPct - b.gapPct);
}

// Gesamt-Kraftrang: beste Übung je Bewegungsmuster, Mittel der bis zu fünf besten.
export function overallRank(records) {
  const byPattern = {};
  for (const r of records) {
    if (r.score == null) continue;
    if (!byPattern[r.pattern] || r.score > byPattern[r.pattern].score) byPattern[r.pattern] = r;
  }
  const basis = Object.values(byPattern).sort((a, b) => b.score - a.score).slice(0, 5);
  if (!basis.length) return null;
  const score = Math.round(basis.reduce((a, r) => a + r.score, 0) / basis.length);
  return { ...rankInfo(score), basis: basis.map((r) => ({ exId: r.exId, name: r.name, pattern: r.pattern, score: r.score })) };
}

// Die komplette Rekord-Übersicht für Ansichten und Abzeichen.
export function recordBoard(s, today = toISODate()) {
  const profile = s.profile || null;
  const events = recordEvents(s.workouts || [], profile);
  const byEx = new Map();
  for (const ev of events) {
    if (!byEx.has(ev.exId)) byEx.set(ev.exId, []);
    byEx.get(ev.exId).push(ev);
  }
  const records = [];
  for (const [exId, list] of byEx) {
    const ex = getExercise(exId);
    const last = list[list.length - 1];
    const perf = { e1rm: last.e1rm, weight: last.weight, reps: last.reps };
    const score = strengthScore(ex, perf, profile);
    records.push({
      exId,
      name: ex.name,
      pattern: ex.pattern,
      tier: ex.tier,
      load: ex.load,
      mode: last.mode,
      e1rm: last.e1rm,
      weight: last.weight,
      reps: last.reps,
      date: last.date,
      firstDate: list[0].date,
      improvements: list.length - 1,
      lastDelta: last.delta,
      score,
      rank: rankInfo(score),
      targets: nextTargets(ex, { mode: last.mode, e1rm: last.e1rm, reps: last.reps }, profile),
      events: list,
      isNew: daysBetween(last.date, today) <= 7,
    });
  }
  records.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.e1rm - a.e1rm || b.reps - a.reps);
  const improvements = events.filter((e) => e.kind === 'improve');
  const ws = startOfWeek(today);
  const lastImprovement = improvements.length ? improvements[improvements.length - 1] : null;
  const perWorkout = {};
  for (const e of improvements) perWorkout[e.workoutId || e.date] = (perWorkout[e.workoutId || e.date] || 0) + 1;
  return {
    records,
    events,
    improvements: improvements.length,
    thisWeek: improvements.filter((e) => e.date >= ws).length,
    streak: recordStreak(events, today),
    weeks: recordWeeks(events, today),
    overall: overallRank(records),
    lastImprovement,
    daysSince: lastImprovement ? daysBetween(lastImprovement.date, today) : null,
    bestDay: Math.max(0, ...Object.values(perWorkout)),
    rankUps: events.filter((e) => e.rankUp).length,
    targets: records
      .filter((r) => r.targets.length)
      .map((r) => ({ ...r.targets[0], exId: r.exId, name: r.name, mode: r.mode }))
      .sort((a, b) => a.gapPct - b.gapPct)
      .slice(0, 3),
  };
}

// Kleinste Wiederholungszahl, mit der ein Gewicht ein e1RM übertrifft (Epley, ab 12 Wdh. zählt nicht mehr). null = unerreichbar.
export function repsToBeat(e1rm, weight) {
  if (!weight || weight <= 0) return null;
  for (let r = 1; r <= 12; r++) if (estimate1RM(weight, r) > e1rm + 0.05) return r;
  return null;
}

// Kleinstes Gewicht in Schritten von inc, das bei reps Wiederholungen ein e1RM übertrifft.
export function weightToBeat(e1rm, reps, inc = 2.5) {
  const r = Math.min(12, Math.max(1, reps || 1));
  const step = inc || 0.5;
  const w = Math.ceil(((e1rm + 0.05) / (1 + r / 30)) / step) * step;
  return Math.round(w * 100) / 100;
}

// Wie knackt man heute den Rekord? Vorschläge mit dem geplanten Gewicht (mehr Wdh.) und mit mehr Gewicht (geplante Wdh.).
// rec: Bestleistung {mode, e1rm, reps}; plan: {weight, reps, repMax, inc}; target: optionales Ziel-e1RM (z. B. nächster Rang).
export function recordAttempts(rec, plan, target = null) {
  if (!rec) return null;
  if (rec.mode === 'reps') return { reps: rec.reps + 1, target: target && target > rec.reps + 1 ? Math.ceil(target) : null };
  const out = { sameWeight: null, moreWeight: null, target: null };
  const w = plan.weight;
  const maxReps = (plan.repMax || 12) + 2;
  if (w > 0) {
    const r = repsToBeat(rec.e1rm, w);
    if (r && r <= maxReps) out.sameWeight = { weight: w, reps: r };
  }
  const reps = plan.reps || rec.reps || 8;
  const inc = plan.inc || 2.5;
  const mw = weightToBeat(rec.e1rm, reps, inc);
  if (mw > (w || 0)) out.moreWeight = { weight: mw, reps };
  if (target && target > rec.e1rm) {
    const tw = w > 0 ? w : mw;
    const tr = repsToBeat(target - 0.1, tw);
    if (tr && tr <= maxReps) out.target = { weight: tw, reps: tr };
    else out.target = { weight: weightToBeat(target - 0.1, reps, inc), reps };
  }
  return out;
}

// Rangleiter einer Übung: die Schwelle jedes Rangs in kg bzw. Wiederholungen.
export function rankLadder(ex, profile) {
  if (!ex || !profile) return [];
  const isReps = ['bw', 'time', 'band'].includes(ex.load);
  const ref = isReps ? referenceReps(ex, profile) : referenceE1RM(ex, profile);
  if (!ref) return [];
  return RANKS.map((r) => ({ ...r, threshold: isReps ? Math.ceil((r.min / 100) * ref) : round1((r.min / 100) * ref), unit: isReps ? (ex.load === 'time' ? 's' : 'Wdh.') : 'kg' }));
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LOG_DAY_ID, isQuickLog, sessionWorkouts, addQuickSets, quickLogFor, quickLogSummary, quickLogXP,
  undoQuickSet, removeQuickEntry, repsInPeriod, recentQuickExercises, countSets,
} from '../src/engine/quicklog.js';
import { dailyGoals, XP } from '../src/engine/goals.js';
import { baseXP, xpToday } from '../src/engine/gamification.js';
import { dailyStreak, badgeStatus } from '../src/engine/achievements.js';
import { periodMetrics } from '../src/engine/challenges.js';
import { weeklyVolume, personalRecords, weeklySeries } from '../src/engine/analytics.js';
import { getExercise } from '../src/data/exercises.js';
import { generatePlan } from '../src/engine/plan.js';
import { addDays } from '../src/engine/util.js';

const profile = { sex: 'm', age: 30, heightCm: 180, weightKg: 80, goal: 'muskelaufbau', experience: 'fortgeschritten', strengthDays: 3, sessionMinutes: 60, equipment: 'gym', gear: [], limitations: [], priorities: [], cardioSessions: 2, cardio: ['laufen'] };
const plan = generatePlan(profile, { startDate: '2026-09-14' });
const base = () => ({
  profile, plan, workouts: [], cardioLogs: [], checkins: [], foodLog: {}, waterLog: {}, bodyLogs: [], mobilityLogs: [],
  routines: [], routineLog: {}, settings: { focus: 'training' }, meta: { createdAt: '2026-09-07', celebrated: {} },
});

test('Liegestütze gibt es breit, schulterbreit und eng', () => {
  for (const id of ['liegestuetze', 'liegestuetze_breit', 'liegestuetze_eng', 'diamant_liegestuetze']) {
    const ex = getExercise(id);
    assert.ok(ex, id);
    assert.equal(ex.load, 'bw');
    assert.ok(ex.bwReps?.length === 3);
  }
  assert.match(getExercise('liegestuetze').name, /schulterbreit/);
  assert.ok(getExercise('liegestuetze_eng').primary.includes('trizeps'));
  assert.ok(getExercise('liegestuetze_breit').primary.includes('brust'));
});

test('Sätze eintragen: ein Tages-Eintrag, Sätze werden angehängt', () => {
  const s = base();
  addQuickSets(s, { exId: 'liegestuetze', reps: 10, date: '2026-09-16' });
  assert.equal(s.workouts.length, 1);
  const w = quickLogFor(s, '2026-09-16');
  assert.equal(w.dayId, LOG_DAY_ID);
  assert.equal(isQuickLog(w), true);
  assert.equal(w.planId, null);
  assert.equal(countSets(w), 1);
  // Gleiche Übung später am Tag: neuer Satz im selben Eintrag
  addQuickSets(s, { exId: 'liegestuetze', reps: 12, date: '2026-09-16' });
  assert.equal(s.workouts.length, 1);
  assert.equal(countSets(quickLogFor(s, '2026-09-16')), 2);
  // Andere Übung, mehrere Sätze auf einmal
  addQuickSets(s, { exId: 'kniebeuge_bw', reps: 20, sets: 3, date: '2026-09-16' });
  assert.equal(quickLogFor(s, '2026-09-16').entries.length, 2);
  assert.equal(countSets(quickLogFor(s, '2026-09-16')), 5);
  // Anderer Tag: eigener Eintrag
  addQuickSets(s, { exId: 'liegestuetze', reps: 10, date: '2026-09-17' });
  assert.equal(s.workouts.length, 2);
});

test('Eingaben werden begrenzt und bereinigt', () => {
  const s = base();
  addQuickSets(s, { exId: 'liegestuetze', reps: '10,4', sets: 99, date: '2026-09-16' });
  const w = quickLogFor(s, '2026-09-16');
  assert.equal(countSets(w), 20); // Deckel bei 20 Sätzen
  assert.equal(w.entries[0].sets[0].reps, 10);
  assert.equal(w.entries[0].sets[0].weight, 0);
});

test('XP: pro Satz, kein Grundbetrag, Bestleistung extra', () => {
  const s = base();
  addQuickSets(s, { exId: 'liegestuetze', reps: 10, sets: 2, date: '2026-09-16', records: 1 });
  const w = quickLogFor(s, '2026-09-16');
  assert.equal(w.xp, 2 * XP.perSet + XP.pr);
  assert.equal(quickLogXP(w), w.xp);
  assert.equal(baseXP(s), w.xp);
  assert.equal(xpToday(s, '2026-09-16'), w.xp);
  // Deutlich weniger als eine echte Einheit mit Grundbetrag
  assert.ok(w.xp < XP.workoutBase + 2 * XP.perSet + XP.pr);
});

test('Rückgängig: letzter Satz, ganze Übung, leerer Tag verschwindet', () => {
  const s = base();
  addQuickSets(s, { exId: 'liegestuetze', reps: 10, sets: 2, date: '2026-09-16' });
  addQuickSets(s, { exId: 'kniebeuge_bw', reps: 20, date: '2026-09-16' });
  assert.equal(undoQuickSet(s, '2026-09-16', 'liegestuetze'), true);
  assert.equal(countSets(quickLogFor(s, '2026-09-16')), 2);
  assert.equal(removeQuickEntry(s, '2026-09-16', 'liegestuetze'), true);
  assert.equal(quickLogFor(s, '2026-09-16').entries.length, 1);
  assert.equal(quickLogFor(s, '2026-09-16').xp, XP.perSet);
  assert.equal(removeQuickEntry(s, '2026-09-16', 'kniebeuge_bw'), true);
  assert.equal(quickLogFor(s, '2026-09-16'), null);
  assert.equal(s.workouts.length, 0);
  assert.equal(removeQuickEntry(s, '2026-09-16', 'liegestuetze'), false);
});

test('Übersicht, Wiederholungen und zuletzt genutzte Übungen', () => {
  const s = base();
  addQuickSets(s, { exId: 'liegestuetze', reps: 10, sets: 3, date: '2026-09-15' });
  addQuickSets(s, { exId: 'liegestuetze', reps: 12, date: '2026-09-16' });
  addQuickSets(s, { exId: 'klimmzuege', reps: 5, date: '2026-09-16' });
  const sum = quickLogSummary(s, '2026-09-15');
  assert.deepEqual(sum, [{ exId: 'liegestuetze', sets: 3, reps: 10, weight: 0, totalReps: 30, equal: true }]);
  assert.equal(repsInPeriod(s, 'liegestuetze', '2026-09-15', '2026-09-16'), 42);
  assert.deepEqual(recentQuickExercises(s, 5), ['liegestuetze', 'klimmzuege']);
});

test('Schnelleinträge zählen für Volumen, Bestleistungen und Streak – aber nicht als Einheit', () => {
  const s = base();
  addQuickSets(s, { exId: 'liegestuetze', reps: 20, sets: 2, date: '2026-09-16' });
  assert.equal(weeklyVolume(s.workouts, '2026-09-14').brust, 2);
  assert.equal(personalRecords(s.workouts)[0].reps, 20);
  assert.equal(dailyStreak(s, '2026-09-16'), 1);
  assert.equal(sessionWorkouts(s.workouts).length, 0);
  assert.equal(periodMetrics(s, '2026-09-14', '2026-09-20').workouts, 0);
  assert.equal(periodMetrics(s, '2026-09-14', '2026-09-20').sets, 2);
  assert.equal(weeklySeries(s.workouts, [], 1, '2026-09-16')[0].sessions, 0);
  assert.equal(weeklySeries(s.workouts, [], 1, '2026-09-16')[0].sets, 2);
  // Abzeichen „Erster Schritt“ gibt es erst für eine echte Einheit
  const badge = (st) => badgeStatus(st, '2026-09-16').find((b) => b.id === 'erstes_training').earned;
  assert.equal(badge(s), false);
  s.workouts.push({ id: 'w1', planId: plan.id, dayId: plan.days[0].id, date: '2026-09-16', entries: [{ exId: 'bankdruecken_lh', sets: [{ weight: 60, reps: 8 }] }] });
  assert.equal(badge(s), true);
  assert.equal(sessionWorkouts(s.workouts).length, 1);
});

test('Tagesziele: Schnelleintrag ist Bewegung, ersetzt aber keine geplante Einheit', () => {
  const s = base();
  const dateFor = (weekday) => addDays('2026-09-14', weekday); // 2026-09-14 ist ein Montag
  const trainingDay = dateFor(plan.days[0].weekday);
  const restWeekday = [6, 5, 4, 3, 2, 1, 0].find((wd) => !plan.days.some((d) => d.weekday === wd));
  const restDay = dateFor(restWeekday);

  // Trainingstag: das Ziel „Training“ bleibt offen, auch mit Schnelleintrag
  addQuickSets(s, { exId: 'liegestuetze', reps: 10, date: trainingDay });
  const onTraining = dailyGoals(s, trainingDay);
  assert.equal(onTraining.find((g) => g.id === 'training')?.done, false);
  assert.equal(onTraining.find((g) => g.id === 'bewegung'), undefined);

  // Freier Tag (alle Einheiten der Woche erledigt): „Bewegung heute“ wird vom Schnelleintrag abgehakt
  for (const d of plan.days) s.workouts.push({ id: `w-${d.id}`, planId: plan.id, dayId: d.id, date: dateFor(d.weekday), entries: [{ exId: 'bankdruecken_lh', sets: [{ weight: 60, reps: 8 }] }] });
  assert.equal(dailyGoals(s, restDay).find((g) => g.id === 'bewegung').done, false);
  addQuickSets(s, { exId: 'liegestuetze', reps: 10, date: restDay });
  assert.equal(dailyGoals(s, restDay).find((g) => g.id === 'bewegung').done, true);
});

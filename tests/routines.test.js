import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeRoutine, scheduledOn, routinesForDay, routineDayStatus, routineStreak, routineRate, routineStats,
  toggleRoutine, routineXP, routineCompletions, routinePerfectDays, routineRemindersDue, scheduleLabel, ROUTINE_TEMPLATES,
} from '../src/engine/routines.js';
import { dailyGoals, isPerfectDay } from '../src/engine/goals.js';
import { baseXP, xpToday } from '../src/engine/gamification.js';
import { periodMetrics } from '../src/engine/challenges.js';
import { dailyStreak } from '../src/engine/achievements.js';
import { generatePlan } from '../src/engine/plan.js';

const profile = { sex: 'm', age: 30, heightCm: 180, weightKg: 80, goal: 'muskelaufbau', experience: 'fortgeschritten', strengthDays: 3, sessionMinutes: 60, equipment: 'gym', gear: [], limitations: [], priorities: [], cardioSessions: 2, cardio: ['laufen'] };
const plan = generatePlan(profile, { startDate: '2026-09-14' });
// 2026-09-14 ist ein Montag.
const base = () => ({
  profile, plan, workouts: [], cardioLogs: [], checkins: [], foodLog: {}, waterLog: {}, bodyLogs: [], mobilityLogs: [],
  routines: [], routineLog: {}, settings: { focus: 'training', reminders: { enabled: true, time: '18:00', lastFired: null, routineFired: {} } }, meta: { createdAt: '2026-09-07', celebrated: {} },
});

test('Gewohnheiten werden in einheitliche Form gebracht', () => {
  const r = makeRoutine({ name: '  Zähne putzen  ', xp: 'abc', daypart: 'quatsch', schedule: { type: 'weekdays', days: [9, 1, 1, 3] }, reminder: '07:15' });
  assert.equal(r.name, 'Zähne putzen');
  assert.equal(r.xp, 10);
  assert.equal(r.daypart, 'tag');
  assert.deepEqual(r.schedule, { type: 'weekdays', days: [1, 3] });
  assert.equal(r.reminder, '07:15');
  assert.equal(r.counts, true);
  assert.ok(r.id && r.createdAt);
  // Wochentage ohne Auswahl fallen auf „täglich“ zurück
  assert.deepEqual(makeRoutine({ schedule: { type: 'weekdays', days: [] } }).schedule, { type: 'daily' });
  assert.deepEqual(makeRoutine({ schedule: { type: 'times', times: 99 } }).schedule, { type: 'times', times: 7 });
  assert.equal(scheduleLabel(makeRoutine({ schedule: { type: 'times', times: 3 } })), '3× pro Woche');
  assert.equal(scheduleLabel(makeRoutine({ schedule: { type: 'weekdays', days: [0, 1, 2, 3, 4] } })), 'Mo–Fr');
  for (const t of ROUTINE_TEMPLATES) assert.ok(makeRoutine(t).name.length > 2);
});

test('Planung: täglich, Wochentage und erst ab dem Anlegedatum', () => {
  const daily = makeRoutine({ name: 'Wasser', createdAt: '2026-09-14' });
  const wed = makeRoutine({ name: 'Woche planen', createdAt: '2026-09-14', schedule: { type: 'weekdays', days: [2] } });
  assert.equal(scheduledOn(daily, '2026-09-14'), true);
  assert.equal(scheduledOn(daily, '2026-09-13'), false); // vor dem Anlegen
  assert.equal(scheduledOn(wed, '2026-09-16'), true); // Mittwoch
  assert.equal(scheduledOn(wed, '2026-09-17'), false);
  assert.equal(scheduledOn({ ...daily, archived: true }, '2026-09-15'), false);
});

test('Tagesliste, Abhaken und Tagesbilanz', () => {
  const s = base();
  s.routines = [makeRoutine({ id: 'a', name: 'Zähne putzen', createdAt: '2026-09-14' }), makeRoutine({ id: 'b', name: 'Lesen', createdAt: '2026-09-14', daypart: 'abend' })];
  assert.equal(routinesForDay(s, '2026-09-15').length, 2);
  assert.equal(routineDayStatus(s, '2026-09-15').all, false);
  assert.equal(toggleRoutine(s, 'a', '2026-09-15'), true);
  assert.equal(toggleRoutine(s, 'b', '2026-09-15'), true);
  const st = routineDayStatus(s, '2026-09-15');
  assert.equal(st.done, 2);
  assert.equal(st.all, true);
  // Nochmal antippen entfernt den Haken und räumt leere Tage auf
  assert.equal(toggleRoutine(s, 'a', '2026-09-15'), false);
  assert.equal(toggleRoutine(s, 'b', '2026-09-15'), false);
  assert.equal(s.routineLog['2026-09-15'], undefined);
});

test('„x-mal pro Woche“ verschwindet, sobald das Wochenziel erreicht ist', () => {
  const s = base();
  s.routines = [makeRoutine({ id: 'c', name: 'Anrufen', createdAt: '2026-09-14', schedule: { type: 'times', times: 2 } })];
  assert.equal(routinesForDay(s, '2026-09-16').length, 1);
  toggleRoutine(s, 'c', '2026-09-14');
  assert.equal(routinesForDay(s, '2026-09-16')[0].weekDone, 1);
  toggleRoutine(s, 'c', '2026-09-15');
  assert.equal(routinesForDay(s, '2026-09-16').length, 0); // Ziel erreicht
  assert.equal(routinesForDay(s, '2026-09-15').length, 1); // an erledigten Tagen weiter sichtbar
  assert.equal(routinesForDay(s, '2026-09-21').length, 1); // neue Woche
});

test('Serien: Tage in Folge, freie Tage werden übersprungen, Wochen bei „x-mal“', () => {
  const s = base();
  const r = makeRoutine({ id: 'a', createdAt: '2026-09-01' });
  s.routines = [r];
  for (const d of ['2026-09-14', '2026-09-15', '2026-09-16']) toggleRoutine(s, 'a', d);
  assert.equal(routineStreak(s, r, '2026-09-16'), 3);
  // Heute noch offen: die Serie von gestern bleibt bestehen
  assert.equal(routineStreak(s, r, '2026-09-17'), 3);
  // Ein Tag ausgelassen: Serie beginnt neu
  assert.equal(routineStreak(s, r, '2026-09-18'), 0);

  const mw = makeRoutine({ id: 'w', createdAt: '2026-09-01', schedule: { type: 'weekdays', days: [0, 2] } }); // Mo + Mi
  s.routines.push(mw);
  toggleRoutine(s, 'w', '2026-09-14');
  toggleRoutine(s, 'w', '2026-09-16');
  assert.equal(routineStreak(s, mw, '2026-09-17'), 2); // Dienstag & Donnerstag zählen nicht

  const tm = makeRoutine({ id: 't', createdAt: '2026-09-07', schedule: { type: 'times', times: 2 } });
  s.routines.push(tm);
  toggleRoutine(s, 't', '2026-09-08');
  toggleRoutine(s, 't', '2026-09-10');
  toggleRoutine(s, 't', '2026-09-14');
  assert.equal(routineStreak(s, tm, '2026-09-16'), 1); // Vorwoche geschafft, laufende Woche noch nicht
  toggleRoutine(s, 't', '2026-09-16');
  assert.equal(routineStreak(s, tm, '2026-09-16'), 2);
});

test('Quote, Statistik und XP', () => {
  const s = base();
  const r = makeRoutine({ id: 'a', createdAt: '2026-09-10', xp: 5 });
  s.routines = [r];
  for (const d of ['2026-09-14', '2026-09-15', '2026-09-16']) toggleRoutine(s, 'a', d);
  const rate = routineRate(s, r, '2026-09-16', 7);
  assert.equal(rate.planned, 7);
  assert.equal(rate.done, 3);
  const stats = routineStats(s, r, '2026-09-16');
  assert.equal(stats.total, 3);
  assert.equal(stats.streak, 3);
  assert.equal(stats.xp, 15);
  assert.equal(routineXP(s), 15);
  // Gelöschte Gewohnheiten zählen mit Standardwert weiter
  s.routines = [];
  assert.equal(routineXP(s), 30);
});

test('Routine zählt für XP, Tagesziele und Streak', () => {
  const s = base();
  s.routines = [makeRoutine({ id: 'a', name: 'Zähne putzen', createdAt: '2026-09-14', xp: 5 })];
  const goalsBefore = dailyGoals(s, '2026-09-15');
  const quest = goalsBefore.find((g) => g.routineId === 'a');
  assert.ok(quest);
  assert.equal(quest.done, false);
  assert.equal(quest.optional, false);
  toggleRoutine(s, 'a', '2026-09-15');
  assert.equal(dailyGoals(s, '2026-09-15').find((g) => g.routineId === 'a').done, true);
  assert.equal(baseXP(s), 5);
  assert.equal(xpToday(s, '2026-09-15'), 5);
  assert.equal(dailyStreak(s, '2026-09-15'), 1); // abgehakte Gewohnheit macht den Tag aktiv
  // Nicht zählende Gewohnheiten blockieren den perfekten Tag nicht
  s.routines.push(makeRoutine({ id: 'b', name: 'Extra', createdAt: '2026-09-14', counts: false }));
  assert.equal(dailyGoals(s, '2026-09-15').find((g) => g.routineId === 'b').optional, true);
});

test('Gewohnheiten gelten erst ab dem Anlegedatum – alte perfekte Tage bleiben perfekt', () => {
  const s = base();
  const day = '2026-09-15';
  // Alle Standardziele an diesem Tag erfüllen
  s.checkins.push({ date: day, sleep: 8, sleepQuality: 4, stress: 2, energy: 4, sore: [] });
  s.workouts.push({ id: 'w', planId: plan.id, dayId: plan.days[0].id, date: day, entries: [{ exId: 'bankdruecken_lh', sets: [{ weight: 60, reps: 8 }] }] });
  s.cardioLogs.push({ date: day, minutes: 20 });
  s.foodLog[day] = [{ kcal: 500, protein: 30, carbs: 50, fat: 15 }, { kcal: 500, protein: 30, carbs: 50, fat: 15 }, { kcal: 500, protein: 30, carbs: 50, fat: 15 }];
  s.waterLog[day] = 2000;
  s.mobilityLogs.push(day);
  assert.equal(isPerfectDay(s, day), true);
  // Neue Gewohnheit von heute darf den alten Tag nicht entwerten
  s.routines = [makeRoutine({ id: 'neu', createdAt: '2026-09-20' })];
  assert.equal(isPerfectDay(s, day), true);
  // Ab dem Anlegedatum zählt sie mit
  s.routines = [makeRoutine({ id: 'alt', createdAt: '2026-09-01' })];
  assert.equal(isPerfectDay(s, day), false);
  toggleRoutine(s, 'alt', day);
  assert.equal(isPerfectDay(s, day), true);
});

test('Fokus „routine“: Trainingsziele werden optional, Gewohnheiten sind Pflicht', () => {
  const s = base();
  s.settings.focus = 'routine';
  s.routines = [makeRoutine({ id: 'a', createdAt: '2026-09-01' })];
  const goals = dailyGoals(s, '2026-09-15');
  for (const id of ['checkin', 'food', 'water', 'mobility']) assert.equal(goals.find((g) => g.id === id).optional, true, id);
  const required = goals.filter((g) => !g.optional);
  assert.deepEqual(required.map((g) => g.routineId), ['a']);
  assert.equal(isPerfectDay(s, '2026-09-15'), false);
  toggleRoutine(s, 'a', '2026-09-15');
  assert.equal(isPerfectDay(s, '2026-09-15'), true);
});

test('Kennzahlen für Herausforderungen', () => {
  const s = base();
  s.routines = [makeRoutine({ id: 'a', createdAt: '2026-09-01' }), makeRoutine({ id: 'b', createdAt: '2026-09-01' })];
  toggleRoutine(s, 'a', '2026-09-14');
  toggleRoutine(s, 'b', '2026-09-14');
  toggleRoutine(s, 'a', '2026-09-15');
  assert.equal(routineCompletions(s, '2026-09-14', '2026-09-20'), 3);
  assert.equal(routinePerfectDays(s, '2026-09-14', '2026-09-20', '2026-09-16'), 1);
  const m = periodMetrics(s, '2026-09-14', '2026-09-20');
  assert.equal(m.routineDone, 3);
  assert.ok(m.routinePerfect >= 1);
});

test('Erinnerungen an Gewohnheiten', () => {
  const s = base();
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  s.routines = [
    makeRoutine({ id: 'a', name: 'Vitamin D', createdAt: iso, reminder: '07:00' }),
    makeRoutine({ id: 'b', name: 'Lesen', createdAt: iso, reminder: '22:30' }),
    makeRoutine({ id: 'c', name: 'Ohne Erinnerung', createdAt: iso }),
  ];
  const at = (h, m = 0) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m);
  assert.deepEqual(routineRemindersDue(s, at(6)).map((r) => r.id), []);
  assert.deepEqual(routineRemindersDue(s, at(8)).map((r) => r.id), ['a']);
  assert.deepEqual(routineRemindersDue(s, at(23)).map((r) => r.id), ['a', 'b']);
  // Erledigte und bereits gemeldete Gewohnheiten erinnern nicht erneut
  toggleRoutine(s, 'a', iso);
  s.settings.reminders.routineFired = { b: iso };
  assert.deepEqual(routineRemindersDue(s, at(23)).map((r) => r.id), []);
});

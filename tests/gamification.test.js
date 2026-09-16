import { test } from 'node:test';
import assert from 'node:assert/strict';
import { totalXP, levelInfo, dailyGoals, isPerfectDay, xpForWorkout, xpToday, XP } from '../src/engine/gamification.js';
import { generatePlan } from '../src/engine/plan.js';

const profile = { sex: 'm', age: 30, heightCm: 180, weightKg: 80, goal: 'muskelaufbau', experience: 'fortgeschritten', strengthDays: 3, sessionMinutes: 60, equipment: 'gym', gear: [], limitations: [], priorities: [], cardioSessions: 1, cardio: ['laufen'] };
const plan = generatePlan(profile, { startDate: '2026-09-14' });
const base = () => ({ plan, workouts: [], cardioLogs: [], checkins: [], foodLog: {}, waterLog: {}, bodyLogs: [], mobilityLogs: [] });

test('Level-Kurve', () => {
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(99).level, 1);
  assert.equal(levelInfo(100).level, 2);
  assert.equal(levelInfo(400).level, 3);
  assert.equal(levelInfo(400).title, 'Einsteiger');
  const l = levelInfo(250);
  assert.equal(l.start, 100);
  assert.equal(l.next, 400);
  assert.equal(l.toNext, 150);
});

test('XP aus Daten', () => {
  const s = base();
  assert.equal(totalXP(s), 0);
  const w = { date: '2026-09-14', entries: [{ exId: 'x', sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] }] };
  assert.equal(xpForWorkout(w, 1), 50 + 24 + 25);
  s.workouts.push({ ...w, xp: 99 });
  s.cardioLogs.push({ date: '2026-09-15', minutes: 30 });
  s.checkins.push({ date: '2026-09-14' });
  s.foodLog['2026-09-14'] = [{}, {}, {}];
  s.waterLog['2026-09-14'] = 1750;
  s.bodyLogs.push({ date: '2026-09-14', weightKg: 80 });
  s.mobilityLogs.push('2026-09-14');
  const xp = totalXP(s);
  assert.equal(xp, 99 + 60 + XP.checkin + XP.food + XP.water + XP.weight + XP.mobility + XP.perfectDay);
  assert.ok(isPerfectDay(s, '2026-09-14'));
  assert.equal(xpToday(s, '2026-09-15'), 60);
});

test('Tagesziele je nach Plan-Tag', () => {
  const s = base();
  const mon = dailyGoals(s, '2026-09-14'); // Trainingstag
  assert.ok(mon.some((g) => g.id === 'training' && !g.done));
  s.workouts.push({ id: 'w1', planId: plan.id, dayId: 'd1', date: '2026-09-14', entries: [] });
  const tue = dailyGoals(s, '2026-09-15'); // Ruhetag bei Mo/Mi/Fr, Montag erledigt
  assert.ok(tue.some((g) => g.id === 'bewegung'));
  s.cardioLogs.push({ date: '2026-09-15', minutes: 20 });
  assert.ok(dailyGoals(s, '2026-09-15').find((g) => g.id === 'bewegung').done);
  assert.ok(!isPerfectDay(s, '2026-09-15'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weeklyChallenges, monthlyChallenge, periodMetrics, challengeXP, WEEKLY_POOL } from '../src/engine/challenges.js';
import { totalXP, baseXP } from '../src/engine/gamification.js';
import { generatePlan } from '../src/engine/plan.js';

const profile = { sex: 'm', age: 30, heightCm: 180, weightKg: 80, goal: 'muskelaufbau', experience: 'fortgeschritten', strengthDays: 3, sessionMinutes: 60, equipment: 'gym', gear: [], limitations: [], priorities: [], cardioSessions: 2, cardio: ['laufen'] };
const plan = generatePlan(profile, { startDate: '2026-09-14' });
const base = () => ({ profile, plan, workouts: [], cardioLogs: [], checkins: [], foodLog: {}, waterLog: {}, bodyLogs: [], mobilityLogs: [], meta: { createdAt: '2026-09-07' } });

test('Wöchentliche Herausforderungen: drei, stabil pro Woche, unterschiedlich zwischen Wochen', () => {
  const s = base();
  const a = weeklyChallenges(s, '2026-09-14');
  const b = weeklyChallenges(s, '2026-09-14');
  assert.equal(a.length, 3);
  assert.deepEqual(a.map((c) => c.id), b.map((c) => c.id));
  assert.equal(new Set(a.map((c) => c.id)).size, 3);
  const ids = new Set();
  for (let w = 0; w < 6; w++) weeklyChallenges(s, `2026-0${w % 2 ? 9 : 8}-${String(7 + w * 3).padStart(2, '0')}`).forEach((c) => ids.add(c.id));
  assert.ok(ids.size > 3);
  for (const c of a) {
    assert.ok(c.target > 0 && c.xp > 0 && typeof c.desc === 'string');
    assert.equal(c.done, false);
  }
});

test('Kennzahlen und Fortschritt', () => {
  const s = base();
  s.workouts.push({ id: 'w1', planId: plan.id, dayId: 'd1', date: '2026-09-14', finishedAt: '2026-09-14T07:30:00', entries: [{ exId: 'kniebeuge_lh', sets: [{ weight: 80, reps: 6 }, { weight: 80, reps: 6 }] }, { exId: 'bankdruecken_lh', sets: [{ weight: 60, reps: 8 }] }] });
  s.workouts.push({ id: 'w2', planId: plan.id, dayId: 'schnell', date: '2026-09-16', finishedAt: '2026-09-16T18:00:00', entries: [{ exId: 'bankdruecken_lh', sets: [{ weight: 62.5, reps: 8 }] }] });
  s.cardioLogs.push({ date: '2026-09-15', minutes: 40 });
  s.mobilityLogs.push('2026-09-15');
  const m = periodMetrics(s, '2026-09-14', '2026-09-20');
  assert.equal(m.workouts, 2);
  assert.equal(m.sets, 4);
  assert.equal(m.tonnage, 80 * 12 + 60 * 8 + 62.5 * 8);
  assert.equal(m.legSets, 2);
  assert.equal(m.prs, 3); // 2 erste Einträge + 1 Steigerung
  assert.equal(m.quick, 1);
  assert.equal(m.early, 1);
  assert.equal(m.variety, 2);
  assert.equal(m.activeDays, 3);
  assert.equal(m.cardioMin, 40);
});

test('Monatliche Herausforderung und XP-Summe', () => {
  const s = base();
  const mc = monthlyChallenge(s, '2026-09');
  assert.ok(mc.target > 0 && mc.xp >= 150);
  assert.equal(challengeXP(s, '2026-09-16'), 0);
  // Wöchentliche „Waage“-Challenge erzwingen: viele Gewichtseinträge erfüllen jede wählbare Waage-Challenge
  for (let i = 0; i < 7; i++) s.bodyLogs.push({ date: `2026-09-${14 + i}`, weightKg: 80 });
  for (let i = 0; i < 7; i++) s.checkins.push({ date: `2026-09-${14 + i}`, sleep: 7 });
  const s2 = { ...s, meta: { createdAt: '2026-09-14' } };
  const weekly = weeklyChallenges(s2, '2026-09-14');
  const done = weekly.filter((c) => c.done);
  const expected = done.reduce((a, c) => a + c.xp, 0) + (monthlyChallenge(s2, '2026-09').done ? monthlyChallenge(s2, '2026-09').xp : 0);
  assert.equal(challengeXP(s2, '2026-09-16'), expected);
  assert.equal(totalXP(s, '2026-09-16'), baseXP(s) + challengeXP(s, '2026-09-16'));
});

test('Pool: Cardio-Challenges nur mit Cardio im Profil', () => {
  const s = base();
  s.profile = { ...profile, cardioSessions: 0 };
  for (let w = 0; w < 10; w++) {
    const list = weeklyChallenges(s, `2026-1${w % 2}-0${(w % 7) + 1}`);
    assert.ok(!list.some((c) => c.id === 'cardio_min'));
  }
  assert.ok(WEEKLY_POOL.length >= 15);
});

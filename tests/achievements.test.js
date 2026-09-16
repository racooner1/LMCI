import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyStreak, badgeStatus, goalProjection, activeDays } from '../src/engine/achievements.js';

const empty = { workouts: [], cardioLogs: [], checkins: [], foodLog: {}, bodyLogs: [], planHistory: [] };

test('Tages-Streak zählt aufeinanderfolgende aktive Tage', () => {
  const s = { ...empty, workouts: [{ date: '2026-09-14', entries: [] }], cardioLogs: [{ date: '2026-09-15', minutes: 20 }], foodLog: { '2026-09-16': [{}] } };
  assert.equal(dailyStreak(s, '2026-09-16'), 3);
  assert.equal(dailyStreak(s, '2026-09-17'), 3);
  assert.equal(dailyStreak(s, '2026-09-18'), 0);
  assert.equal(activeDays(s).size, 3);
});

test('Abzeichen', () => {
  const none = badgeStatus(empty, '2026-09-16');
  assert.ok(none.every((b) => !b.earned));
  const s = { ...empty, workouts: [{ date: '2026-09-16', finishedAt: '2026-09-16T06:30:00', entries: [{ exId: 'x', sets: [{ weight: 50, reps: 5 }] }] }] };
  const st = badgeStatus(s, '2026-09-16');
  assert.ok(st.find((b) => b.id === 'erstes_training').earned);
  assert.ok(st.find((b) => b.id === 'frueh').earned);
  assert.ok(!st.find((b) => b.id === 'zehn_trainings').earned);
});

test('Zielgewicht-Prognose', () => {
  const p = goalProjection({ targetWeightKg: 75, weightKg: 80 }, [{ date: '2026-09-01', weightKg: 82 }, { date: '2026-09-16', weightKg: 80 }], { current: 80, perWeek: -0.5 });
  assert.equal(p.start, 82);
  assert.equal(p.remaining, -5);
  assert.equal(p.etaWeeks, 10);
  assert.ok(p.progress > 0.25 && p.progress < 0.3);
  assert.equal(goalProjection({ weightKg: 80 }, [], null), null);
  const wrongDir = goalProjection({ targetWeightKg: 75, weightKg: 80 }, [{ date: '2026-09-16', weightKg: 80 }], { current: 80, perWeek: 0.3 });
  assert.equal(wrongDir.etaWeeks, null);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQuickWorkout, quickPool } from '../src/engine/quick.js';
import { getExercise } from '../src/data/exercises.js';

const profile = { sex: 'm', age: 30, weightKg: 80, experience: 'fortgeschritten', limitations: [] };

test('Schnelltraining nur mit Körpergewicht', () => {
  const r = buildQuickWorkout({ gear: [], focus: ['ganzkoerper'], minutes: 20, profile, seed: 1 });
  assert.ok(r.tasks.length >= 3 && r.tasks.length <= 4, `${r.tasks.length} Aufgaben`);
  assert.ok(r.minutes <= 21, `${r.minutes} min`);
  for (const t of r.tasks) {
    const ex = getExercise(t.exId);
    assert.ok(ex.ctx.includes('home') && ex.gear.length === 0, t.exId);
    assert.ok(t.sets >= 2 && t.sets <= 5);
  }
  const ids = r.tasks.map((t) => t.exId);
  assert.equal(new Set(ids).size, ids.length);
});

test('Schnelltraining mit Studio und Fokus Push, hart, 45 min', () => {
  const r = buildQuickWorkout({ gear: ['studio'], focus: ['push'], minutes: 45, intensity: 'hart', profile, seed: 7 });
  assert.ok(r.tasks.length >= 5);
  assert.ok(r.tasks.every((t) => ['brust', 'schultern', 'trizeps'].includes(t.muscle)));
  assert.ok(r.tasks[0].tier <= r.tasks[r.tasks.length - 1].tier);
  assert.equal(r.rir, 1);
  assert.ok(r.tasks.some((t) => t.weight > 0));
  assert.ok(r.minutes <= 46);
});

test('Zirkel-Stil nutzt kurze Pausen und hohe Wiederholungen', () => {
  const r = buildQuickWorkout({ gear: ['kurzhantel', 'band'], focus: ['unterkoerper'], muscles: ['bauch'], minutes: 30, style: 'zirkel', profile, seed: 3 });
  assert.ok(r.tasks.every((t) => t.restSec <= 60));
  assert.ok(r.tasks.some((t) => t.muscle === 'bauch'));
  assert.ok(r.tasks.filter((t) => t.load !== 'time').every((t) => t.repMin >= 12));
});

test('Seed macht das Ergebnis reproduzierbar, anderer Seed variiert', () => {
  const a = buildQuickWorkout({ gear: ['studio'], focus: ['oberkoerper'], minutes: 45, profile, seed: 11 });
  const b = buildQuickWorkout({ gear: ['studio'], focus: ['oberkoerper'], minutes: 45, profile, seed: 11 });
  assert.deepEqual(a.tasks.map((t) => t.exId), b.tasks.map((t) => t.exId));
  const seeds = new Set();
  for (let s = 0; s < 6; s++) seeds.add(buildQuickWorkout({ gear: ['studio'], focus: ['oberkoerper'], minutes: 45, profile, seed: s }).tasks.map((t) => t.exId).join(','));
  assert.ok(seeds.size > 1);
});

test('Einschränkungen und leere Auswahl', () => {
  const pool = quickPool({ gear: ['langhantel'], limitations: ['ruecken_unten'] });
  assert.ok(!pool.some((e) => e.id === 'kreuzheben'));
  const r = buildQuickWorkout({ gear: [], focus: [], muscles: [], minutes: 15, profile });
  assert.ok(r.tasks.length >= 2);
});

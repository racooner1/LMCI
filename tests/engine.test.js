import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePlan, volumeTargets, availableExercises, planWeek, effectiveSets, alternativesFor, isMesoFinished, estimateStartWeight, estimateStartReps, warmupSets, shortenDay, nextSession, dayDuration } from '../src/engine/plan.js';
import { suggestNext, plates, volumeDeltaFromFeedback, muscleDeltasFromFeedback } from '../src/engine/progression.js';
import { readinessScore, readinessAdvice } from '../src/engine/recovery.js';
import { computeNutrition, weightTrend, trendAdvice, bmrMifflin } from '../src/engine/nutrition.js';
import { heartRateZones, buildCardioPlan } from '../src/engine/cardio.js';
import { weeklyVolume, personalRecords, newRecords, historyFor } from '../src/engine/analytics.js';
import { MUSCLES } from '../src/data/muscles.js';
import { EXERCISES, getExercise } from '../src/data/exercises.js';

const base = {
  name: 'Test', sex: 'm', age: 28, heightCm: 180, weightKg: 80,
  goal: 'muskelaufbau', experience: 'fortgeschritten', strengthDays: 4, sessionMinutes: 60,
  equipment: 'gym', gear: [], cardio: ['laufen'], cardioSessions: 2, limitations: [], priorities: [], activityLevel: 'leicht',
};

test('Übungsdatenbank ist konsistent', () => {
  const ids = new Set();
  for (const e of EXERCISES) {
    assert.ok(!ids.has(e.id), `doppelte id ${e.id}`);
    ids.add(e.id);
    for (const m of [...e.primary, ...e.secondary]) assert.ok(MUSCLES.some((x) => x.id === m), `${e.id}: unbekannter Muskel ${m}`);
    assert.ok([1, 2, 3].includes(e.tier));
  }
});

test('Plan: jede Tageskonfiguration liefert vollständige Tage im Zeitbudget', () => {
  for (const days of [2, 3, 4, 5, 6]) {
    for (const minutes of [30, 45, 60, 90]) {
      const plan = generatePlan({ ...base, strengthDays: days, sessionMinutes: minutes });
      assert.equal(plan.days.length, days);
      for (const d of plan.days) {
        assert.ok(d.exercises.length >= 3, `Tag ${d.name} bei ${minutes} min hat zu wenige Übungen`);
        assert.ok(d.minutes <= minutes + 1, `Tag ${d.name}: ${d.minutes} min > Budget ${minutes}`);
        for (const pe of d.exercises) {
          assert.ok(getExercise(pe.exId));
          assert.ok(pe.sets >= 2 && pe.sets <= 5);
          assert.ok(pe.repMin < pe.repMax);
        }
      }
      assert.equal(plan.cardio.sessions.length, 2);
    }
  }
});

test('Plan: Volumen erreicht bei 4×60 min die Zielbereiche der großen Muskeln', () => {
  const plan = generatePlan(base);
  for (const m of ['brust', 'ruecken', 'quadrizeps']) {
    const v = plan.volume[m];
    assert.ok(v.planned >= v.min, `${m}: ${v.planned} < min ${v.min}`);
    assert.ok(v.planned <= v.max + 2, `${m}: ${v.planned} > max ${v.max}`);
  }
});

test('Plan: Prioritäten erhöhen das Zielvolumen', () => {
  const a = volumeTargets(base);
  const b = volumeTargets({ ...base, priorities: ['brust'] });
  assert.ok(b.brust.target > a.brust.target);
  assert.ok(b.ruecken.target < a.ruecken.target);
});

test('Plan: Einschränkungen und Ausrüstung filtern Übungen', () => {
  const homePool = availableExercises({ ...base, equipment: 'home', gear: [] });
  assert.ok(homePool.every((e) => e.ctx.includes('home') && e.gear.length === 0));
  assert.ok(homePool.length >= 15);
  const plan = generatePlan({ ...base, equipment: 'home', gear: [], strengthDays: 3 });
  assert.equal(plan.days.length, 3);
  const withBack = availableExercises({ ...base, limitations: ['ruecken_unten'] });
  assert.ok(!withBack.some((e) => e.id === 'kreuzheben'));
  const p2 = generatePlan({ ...base, limitations: ['schulter', 'knie', 'ruecken_unten'] });
  for (const d of p2.days) for (const pe of d.exercises) assert.ok(!getExercise(pe.exId).contra.some((c) => ['schulter', 'knie', 'ruecken_unten'].includes(c)));
});

test('Plan: Kraft-Ziel nutzt niedrige Wiederholungen bei Hauptübungen', () => {
  const plan = generatePlan({ ...base, goal: 'kraft', strengthDays: 3 });
  const mains = plan.days.flatMap((d) => d.exercises.filter((e) => e.main && getExercise(e.exId).tier === 1 && getExercise(e.exId).load !== 'bw'));
  assert.ok(mains.length > 0);
  for (const m of mains) assert.deepEqual([m.repMin, m.repMax], [3, 5]);
  assert.ok(plan.days.some((d) => d.exercises.some((e) => e.exId === 'kniebeuge_lh')));
});

test('Plan: Rotation über Mesozyklen wechselt Übungen bei Erfahrenen', () => {
  const p0 = generatePlan({ ...base, experience: 'erfahren' }, { mesoIndex: 0 });
  const p1 = generatePlan({ ...base, experience: 'erfahren' }, { mesoIndex: 1 });
  const ids0 = p0.days.flatMap((d) => d.exercises.map((e) => e.exId)).join(',');
  const ids1 = p1.days.flatMap((d) => d.exercises.map((e) => e.exId)).join(',');
  assert.notEqual(ids0, ids1);
});

test('Plan: Wochenlogik, Deload und Anpassung', () => {
  const plan = generatePlan(base, { startDate: '2026-09-14' });
  assert.equal(planWeek(plan, '2026-09-14'), 1);
  assert.equal(planWeek(plan, '2026-09-21'), 2);
  assert.equal(planWeek(plan, '2026-10-12'), 5);
  assert.equal(planWeek(plan, '2026-10-26'), 5);
  assert.ok(isMesoFinished(plan, '2026-10-19'));
  const day = plan.days[0];
  const pe = day.exercises[0];
  assert.equal(effectiveSets(plan, day, pe, 1), pe.sets);
  assert.equal(effectiveSets(plan, day, pe, 5), Math.ceil(pe.sets / 2));
  plan.muscleAdjust[pe.muscle] = 1;
  assert.equal(effectiveSets(plan, day, pe, 2), pe.sets + 1);
  assert.ok(alternativesFor('bankdruecken_lh', base).length > 3);
});

test('Progression: doppelte Progression', () => {
  const pe = { exId: 'bankdruecken_lh', repMin: 6, repMax: 10 };
  const start = suggestNext(pe, [], 2);
  assert.equal(start.kind, 'start');
  const up = suggestNext(pe, [{ date: '2026-09-01', sets: [{ weight: 60, reps: 10, rir: 2 }, { weight: 60, reps: 10, rir: 2 }, { weight: 60, reps: 10, rir: 1 }] }], 2);
  assert.equal(up.kind, 'up');
  assert.equal(up.weight, 62.5);
  const reps = suggestNext(pe, [{ date: '2026-09-01', sets: [{ weight: 60, reps: 8, rir: 2 }, { weight: 60, reps: 7, rir: 1 }] }], 2);
  assert.equal(reps.kind, 'reps');
  assert.equal(reps.weight, 60);
  const hold = suggestNext(pe, [{ date: '2026-09-01', sets: [{ weight: 60, reps: 5, rir: 0 }] }], 2);
  assert.equal(hold.kind, 'hold');
  const down = suggestNext(pe, [
    { date: '2026-08-25', sets: [{ weight: 60, reps: 5, rir: 0 }] },
    { date: '2026-09-01', sets: [{ weight: 60, reps: 4, rir: 0 }] },
  ], 2);
  assert.equal(down.kind, 'down');
  assert.ok(down.weight < 60);
  const deload = suggestNext(pe, [{ date: '2026-09-01', sets: [{ weight: 60, reps: 9, rir: 1 }] }], 4, true);
  assert.equal(deload.kind, 'deload');
  assert.equal(deload.weight, 55);
  const bw = suggestNext({ exId: 'klimmzuege', repMin: 6, repMax: 10 }, [{ date: '2026-09-01', sets: [{ weight: 0, reps: 10, rir: 2 }] }], 2);
  assert.equal(bw.kind, 'up');
});

test('Progression: Scheibenrechner und Feedback', () => {
  assert.deepEqual(plates(100).perSide, [25, 15]);
  assert.deepEqual(plates(100, 20, [20, 10, 5]).perSide, [20, 20]);
  assert.deepEqual(plates(62.5).perSide, [20, 1.25]);
  assert.equal(volumeDeltaFromFeedback({ rpe: 7, soreness: 'keine', performance: 'besser' }), 1);
  assert.equal(volumeDeltaFromFeedback({ rpe: 9, soreness: 'nicht_erholt', performance: 'schlechter' }), -1);
  assert.equal(volumeDeltaFromFeedback({ rpe: 8, soreness: 'leicht', performance: 'gleich' }), 0);
});

test('Ernährung: Mifflin-St Jeor und Zielkalorien', () => {
  assert.equal(Math.round(bmrMifflin({ sex: 'm', weightKg: 80, heightCm: 180, age: 28 })), 1790);
  const plan = generatePlan(base);
  const n = computeNutrition(base, plan);
  assert.ok(n.tdee > 2400 && n.tdee < 3000, `tdee ${n.tdee}`);
  assert.equal(n.adjustment, 250);
  assert.equal(n.protein, 145);
  assert.ok(n.carbs > 200);
  const cut = computeNutrition({ ...base, goal: 'fettabbau' }, plan);
  assert.ok(cut.target < cut.tdee);
  assert.equal(cut.protein, 175);
});

test('Ernährung: Gewichtstrend', () => {
  const logs = [];
  for (let i = 0; i < 21; i++) logs.push({ date: `2026-09-${String(i + 1).padStart(2, '0')}`, weightKg: 80 + i * 0.05 });
  const t = weightTrend(logs);
  assert.ok(t.perWeek > 0.3 && t.perWeek < 0.4, `perWeek ${t.perWeek}`);
  assert.equal(trendAdvice(t, { ...base, experience: 'anfaenger' }).level, 'ok');
  assert.equal(trendAdvice(t, base).level, 'warn');
  assert.equal(trendAdvice(t, { ...base, goal: 'fettabbau' }).level, 'warn');
});

test('Cardio: Zonen und Plan', () => {
  const z = heartRateZones(30);
  assert.equal(z.max, 187);
  assert.deepEqual(z.zones[1].range, [112, 131]);
  const zk = heartRateZones(30, 60);
  assert.deepEqual(zk.zones[1].range, [136, 149]);
  const c = buildCardioPlan({ ...base, goal: 'fettabbau', cardioSessions: 4 });
  assert.equal(c.sessions.length, 4);
  assert.ok(c.sessions.some((s) => s.type === 'intervall'));
  assert.equal(c.sessions[0].minutesByWeek.length, 5);
});

test('Analytics: Volumen, Rekorde, Historie', () => {
  const plan = generatePlan(base);
  const w1 = { id: 'a', date: '2026-09-14', planId: plan.id, dayId: 'd1', entries: [{ exId: 'bankdruecken_lh', sets: [{ weight: 60, reps: 8, rir: 2 }, { weight: 60, reps: 8, rir: 1 }] }] };
  const w2 = { id: 'b', date: '2026-09-16', planId: plan.id, dayId: 'd1', entries: [{ exId: 'bankdruecken_lh', sets: [{ weight: 62.5, reps: 8, rir: 2 }] }] };
  const vol = weeklyVolume([w1, w2], '2026-09-14');
  assert.equal(vol.brust, 3);
  assert.equal(vol.trizeps, 1.5);
  const pr = personalRecords([w1, w2]);
  assert.equal(pr[0].weight, 62.5);
  assert.equal(newRecords(w2, [w1]).length, 1);
  assert.equal(historyFor([w2, w1], 'bankdruecken_lh').length, 2);
  assert.equal(historyFor([w2, w1], 'bankdruecken_lh')[0].date, '2026-09-14');
});

test('Startgewichte und Aufwärmsätze', () => {
  const bench = getExercise('bankdruecken_lh');
  const w = estimateStartWeight(bench, base, 6, 2, { barWeight: 20 });
  assert.ok(w >= 50 && w <= 65, `bench ${w}`);
  const wAnf = estimateStartWeight(bench, { ...base, experience: 'anfaenger' }, 8, 3, { barWeight: 20 });
  assert.ok(wAnf < w && wAnf >= 20, `anf ${wAnf}`);
  const wF = estimateStartWeight(bench, { ...base, sex: 'w', weightKg: 62 }, 6, 2, {});
  assert.ok(wF < wAnf + 10 && wF >= 20, `w ${wF}`);
  assert.equal(estimateStartWeight(getExercise('klimmzuege'), base, 6, 2), null);
  assert.equal(estimateStartReps(getExercise('liegestuetze'), base), 15);
  assert.equal(estimateStartReps(getExercise('liegestuetze'), { ...base, sex: 'w' }), 11);
  const wu = warmupSets(bench, 80, 20, 'voll');
  assert.ok(wu.length >= 3 && wu[0].weight === 20 && wu[wu.length - 1].weight < 80);
  assert.equal(warmupSets(bench, 80, 20, 'kurz').length, 1);
  assert.equal(warmupSets(getExercise('seitheben_kh'), 10, 20, 'voll').length, 1);
  const s = suggestNext({ exId: 'bankdruecken_lh', repMin: 6, repMax: 10 }, [], 2, false, { profile: base, settings: { barWeight: 20 } });
  assert.equal(s.kind, 'start');
  assert.ok(s.estimated && s.weight > 20);
  const sb = suggestNext({ exId: 'liegestuetze', repMin: 8, repMax: 12 }, [], 2, false, { profile: base });
  assert.ok(sb.estimated && sb.reps >= 8 && sb.reps <= 12);
});

test('Kurzversion und nächste Einheit', () => {
  const plan = generatePlan(base, { startDate: '2026-09-14' });
  const day = plan.days[0];
  const full = dayDuration(plan, day, 1, base);
  const short = shortenDay(plan, day, 1, 30, base);
  assert.ok(short.minutes <= 31, `short ${short.minutes}`);
  assert.ok(short.exercises.length < day.exercises.length || short.exercises.reduce((a, e) => a + e.sets, 0) < day.exercises.reduce((a, e) => a + e.sets, 0));
  assert.ok(short.exercises.some((e) => e.main));
  assert.ok(full > short.minutes);
  // Mo: Tag 1 heute; Di ohne Training → Tag 1 nachholen, wenn Mo verpasst
  assert.equal(nextSession(plan, [], '2026-09-14').kind, 'heute');
  const tue = nextSession(plan, [], '2026-09-16'); // Mittwoch, Plan 4 Tage: Mo Di Do Fr → Mi frei, Mo/Di verpasst
  assert.equal(tue.kind, 'nachholen');
  assert.equal(tue.day.id, 'd1');
  const done = [{ id: 'x', planId: plan.id, dayId: 'd1', date: '2026-09-14', entries: [] }, { id: 'y', planId: plan.id, dayId: 'd2', date: '2026-09-15', entries: [] }];
  assert.equal(nextSession(plan, done, '2026-09-16').kind, 'naechste');
  assert.equal(nextSession(plan, done, '2026-09-14').kind, 'erledigt');
});

test('Autoregulation pro Muskel und Readiness', () => {
  const d = muscleDeltasFromFeedback({ rpe: 8, performance: 'gleich', sore: ['brust'], more: ['ruecken'] }, ['brust', 'ruecken', 'schultern']);
  assert.deepEqual(d, { brust: -1, ruecken: 1, schultern: 0 });
  const d2 = muscleDeltasFromFeedback({ rpe: 10, performance: 'schlechter' }, ['brust']);
  assert.equal(d2.brust, -1);
  const r = readinessScore({ sleep: 8, sleepQuality: 5, stress: 1, energy: 5 });
  assert.equal(r.level, 'gut');
  const low = readinessScore({ sleep: 5, sleepQuality: 1, stress: 5, energy: 1 });
  assert.equal(low.level, 'niedrig');
  assert.equal(readinessAdvice(low).mode, 'leicht');
  assert.equal(readinessAdvice(null).mode, 'normal');
});

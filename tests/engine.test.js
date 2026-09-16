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

test('Plan: Kraft-Ziel nutzt 3–5 Wiederholungen nur bei Langhantel-Hauptübungen', () => {
  const plan = generatePlan({ ...base, goal: 'kraft', strengthDays: 3 });
  const mains = plan.days.flatMap((d) => d.exercises.filter((e) => e.main && getExercise(e.exId).tier === 1 && getExercise(e.exId).load !== 'bw'));
  assert.ok(mains.length > 0);
  const heavy = mains.filter((m) => getExercise(m.exId).load === 'barbell' && ['squat', 'hpush', 'hinge', 'vpush'].includes(getExercise(m.exId).pattern));
  assert.ok(heavy.length >= 3);
  for (const m of heavy) assert.deepEqual([m.repMin, m.repMax], [3, 5]);
  // Maschinen, Kurzhanteln und Rudern bleiben bei 5–8 – dort sind 3er-Sätze weder praktisch noch spezifisch.
  for (const m of mains.filter((m) => !heavy.includes(m))) assert.deepEqual([m.repMin, m.repMax], [5, 8]);
  assert.ok(plan.days.some((d) => d.exercises.some((e) => e.exId === 'kniebeuge_lh')));
  // Kein Rudern mit 3–5
  for (const d of plan.days) for (const e of d.exercises) if (getExercise(e.exId).pattern === 'hpull') assert.ok(e.repMin >= 5, e.exId);
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
  assert.equal(deload.weight, 60); // Deload senkt die Sätze, nicht zusätzlich das Gewicht
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
  assert.ok(c.sessions.some((s) => s.intervals));
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

// ---------------------------------------------------------------- Review-Umsetzung (siehe docs/REVIEW-Trainingsmethoden.md)
import { isFeasibleFor, rirForExercise, rirForWeek, mesoWeeks, adjustmentFor, muscleAdjustCap, minDirectSets, rawStartWeight } from '../src/engine/plan.js';
import { healthFlags } from '../src/engine/health.js';
import { currentWeight, expectedWeeklyRate } from '../src/engine/nutrition.js';
import { assignCardioWeekdays, cardioKcal } from '../src/engine/cardio.js';
import { bestE1RM, muscleDeltasFromFeedback as deltas2 } from '../src/engine/progression.js';

const homeBeginner = { ...base, experience: 'anfaenger', equipment: 'home', gear: [], strengthDays: 3, sessionMinutes: 45 };

test('Machbarkeit: Anfänger bekommen keine Körpergewichtsübungen, die sie nicht ausführen können', () => {
  for (const p of [homeBeginner, { ...homeBeginner, gear: ['klimmzugstange', 'band'] }, { ...base, experience: 'anfaenger', strengthDays: 3 }, { ...base, experience: 'anfaenger', strengthDays: 4 }]) {
    const plan = generatePlan(p);
    for (const d of plan.days) for (const pe of d.exercises) {
      const ex = getExercise(pe.exId);
      if (!ex.bwReps || ['invertiertes_rudern', 'bank_dips'].includes(ex.id)) continue; // einzige Zug-/Trizepsoption ohne Gerät
      assert.ok(estimateStartReps(ex, p) >= pe.repMin, `${ex.name}: ${estimateStartReps(ex, p)} < ${pe.repMin}`);
    }
    const ids = plan.days.flatMap((d) => d.exercises.map((e) => e.exId));
    for (const bad of ['pistol_squat', 'handstand_liegestuetze', 'klimmzuege', 'chin_ups', 'toes_to_bar', 'dragon_flag']) assert.ok(!ids.includes(bad), `${bad} im Anfängerplan`);
  }
  // Schwere Übungen haben eigene Bereiche, in die Fortgeschrittene passen
  assert.deepEqual(getExercise('nordic_curl').reps, [3, 8]);
  assert.ok(isFeasibleFor(getExercise('pistol_squat'), 3, { ...base, experience: 'fortgeschritten' }));
  assert.ok(!isFeasibleFor(getExercise('pistol_squat'), 3, { ...base, experience: 'anfaenger' }));
  // Langhantel unter Stangengewicht → nicht machbar, Kurzhantelvariante wird gewählt
  const woman = { ...base, sex: 'w', weightKg: 58, experience: 'anfaenger', equipment: 'gym', strengthDays: 3 };
  assert.ok(rawStartWeight(getExercise('schulterdruecken_lh'), woman, 8, 2) < 20);
  assert.ok(!isFeasibleFor(getExercise('schulterdruecken_lh'), 8, woman, { barWeight: 20 }));
  const wp = generatePlan(woman);
  assert.ok(!wp.days.some((d) => d.exercises.some((e) => e.exId === 'schulterdruecken_lh')));
});

test('Rücken: ohne Klimmzugstange kein Superman als Hauptübung, dafür Hinweis', () => {
  const plan = generatePlan(homeBeginner);
  const ids = plan.days.flatMap((d) => d.exercises.map((e) => ({ id: e.exId, muscle: e.muscle, main: e.main })));
  assert.ok(!ids.some((x) => x.id === 'superman' && x.muscle === 'ruecken'));
  assert.ok(plan.notes.some((n) => n.includes('vertikalen Zug')));
  assert.deepEqual(getExercise('superman').primary, ['bauch']);
  assert.deepEqual(getExercise('rack_pull').primary, ['beinbeuger']);
});

test('Kraftziel: Hauptübungen bleiben über Blöcke fest, RIR-Untergrenze bei schwerem Kreuzheben/Kniebeuge', () => {
  const p = { ...base, goal: 'kraft', experience: 'erfahren', strengthDays: 4 };
  // Langhantel-Hauptübungen bleiben fest (Körpergewichts-Züge dürfen je nach Restauswahl wechseln).
  const mains = (i) => generatePlan(p, { mesoIndex: i }).days.flatMap((d) => d.exercises.filter((e) => e.main && getExercise(e.exId).load === 'barbell').map((e) => e.exId)).join(',');
  assert.equal(mains(0), mains(1));
  assert.equal(mains(0), mains(3));
  assert.ok(mains(0).includes('kniebeuge_lh') && mains(0).includes('bankdruecken_lh') && mains(0).includes('kreuzheben'));
  const plan = generatePlan(p);
  assert.equal(rirForWeek(plan, 4), 0);
  assert.equal(rirForExercise(plan, 4, getExercise('kreuzheben')), 1);
  assert.equal(rirForExercise(plan, 4, getExercise('kniebeuge_lh')), 1);
  assert.equal(rirForExercise(plan, 4, getExercise('bankdruecken_lh')), 0);
  assert.equal(rirForExercise(plan, 1, getExercise('kreuzheben')), 3);
});

test('Gesundheits-Screening: keine Intervalle, RIR ≥ 2, keine 3–5er-Sätze, Schwangerschaft ohne Rückenlage und Defizit', () => {
  const flagged = { ...base, goal: 'kraft', experience: 'erfahren', health: ['herz'] };
  assert.ok(healthFlags(flagged).cautious);
  const plan = generatePlan({ ...flagged, cardioSessions: 4, goal: 'ausdauer' });
  assert.ok(plan.cardio.sessions.every((s) => !s.intervals));
  assert.ok(plan.rir.slice(0, -1).every((r) => r >= 2));
  assert.ok(plan.notes.some((n) => n.includes('ärztlich')));
  const kraft = generatePlan(flagged);
  for (const d of kraft.days) for (const e of d.exercises) if (!getExercise(e.exId).reps) assert.ok(e.repMin >= 5, e.exId);
  const preg = { ...base, sex: 'w', goal: 'fettabbau', health: ['schwangerschaft'] };
  const pp = generatePlan(preg);
  const ids = pp.days.flatMap((d) => d.exercises.map((e) => e.exId));
  for (const bad of ['crunches', 'kreuzheben', 'haengendes_beinheben', 'hip_thrust', 'ab_wheel']) assert.ok(!ids.includes(bad), bad);
  const n = computeNutrition(preg, pp);
  assert.equal(n.adjustment, 0);
  assert.ok(n.noDeficit);
  // Ohne Angaben ändert sich nichts
  assert.ok(!healthFlags(base).cautious);
  assert.ok(generatePlan({ ...base, goal: 'ausdauer', cardioSessions: 4 }).cardio.sessions.some((s) => s.intervals));
});

test('Progression: RIR-Überschuss steigert, Obergrenze ohne Reserve hält, Backoff-Sätze werden erkannt, Anfänger linear', () => {
  const pe = { exId: 'bankdruecken_lh', repMin: 6, repMax: 10 };
  const tooEasy = suggestNext(pe, [{ date: '2026-09-01', sets: [{ weight: 60, reps: 8, rir: 5 }, { weight: 60, reps: 8, rir: 4 }] }], 2);
  assert.equal(tooEasy.kind, 'up');
  assert.equal(tooEasy.weight, 62.5);
  const grind = suggestNext(pe, [{ date: '2026-09-01', sets: [{ weight: 60, reps: 10, rir: 0 }, { weight: 60, reps: 10, rir: 0 }] }], 2);
  assert.equal(grind.kind, 'hold');
  assert.ok(grind.note.includes('zu nah am Versagen'));
  const backoff = suggestNext(pe, [{ date: '2026-09-01', sets: [{ weight: 80, reps: 6, rir: 2 }, { weight: 70, reps: 10, rir: 2 }, { weight: 70, reps: 10, rir: 2 }] }], 2);
  assert.equal(backoff.kind, 'up');
  assert.equal(backoff.weight, 72.5);
  const beginner = suggestNext({ exId: 'kniebeuge_lh', repMin: 8, repMax: 12 }, [{ date: '2026-09-01', sets: [{ weight: 40, reps: 8, rir: 3 }, { weight: 40, reps: 8, rir: 3 }, { weight: 40, reps: 8, rir: 3 }] }], 3, false, { profile: { ...base, experience: 'anfaenger' } });
  assert.equal(beginner.kind, 'up');
  assert.equal(beginner.weight, 45);
  const beginnerNoRir = suggestNext({ exId: 'kniebeuge_lh', repMin: 8, repMax: 12 }, [{ date: '2026-09-01', sets: [{ weight: 40, reps: 9 }, { weight: 40, reps: 8 }] }], 3, false, { profile: { ...base, experience: 'anfaenger' } });
  assert.equal(beginnerNoRir.kind, 'reps');
  // e1RM berücksichtigt die Reserve
  assert.ok(bestE1RM({ sets: [{ weight: 100, reps: 5, rir: 3 }] }) > bestE1RM({ sets: [{ weight: 100, reps: 5, rir: 0 }] }));
  // Startgewicht unter Stange → Hinweis
  const w = suggestNext({ exId: 'schulterdruecken_lh', repMin: 8, repMax: 12 }, [], 3, false, { profile: { ...base, sex: 'w', weightKg: 58, experience: 'anfaenger' }, settings: { barWeight: 20 } });
  assert.ok(w.belowBar && w.note.includes('Stange'));
});

test('Autoregulation: Wochen-Delta wird auf die Übungen verteilt, Deckel und Bereitschaft', () => {
  const plan = generatePlan(base);
  const day = plan.days.find((d) => d.exercises.some((e) => e.muscle === 'brust'));
  const chest = plan.days.flatMap((d) => d.exercises.filter((e) => e.muscle === 'brust').map((e) => ({ d, e })));
  assert.ok(chest.length >= 2);
  plan.muscleAdjust.brust = 1;
  const total = (adj) => {
    plan.muscleAdjust.brust = adj;
    return chest.reduce((a, { d, e }) => a + adjustmentFor(plan, d, e), 0);
  };
  assert.equal(total(1), 1);
  assert.equal(total(2), 2);
  assert.equal(total(-2), -2);
  // Plus zuerst an der Hauptübung, Minus zuerst an Isolation
  plan.muscleAdjust.brust = 1;
  const plusOn = chest.find(({ d, e }) => adjustmentFor(plan, d, e) === 1).e;
  assert.ok(plusOn.main);
  assert.ok(muscleAdjustCap(plan, 'brust') >= 2 && muscleAdjustCap(plan, 'brust') <= Math.round(plan.volume.brust.target * 0.3) + 1);
  assert.equal(effectiveSets(plan, day, day.exercises[0], 1), day.exercises[0].sets + adjustmentFor(plan, day, day.exercises[0]));
  const d = deltas2({ rpe: 6, performance: 'besser', more: ['brust'] }, ['brust', 'ruecken'], { lowReadiness: true });
  assert.deepEqual(d, { brust: 0, ruecken: 0 });
});

test('Anfänger: 6+1 Wochen, Cardio-Progression passt zur Blocklänge; direkte Mindestsätze für Arme und Schultern', () => {
  const p = { ...base, experience: 'anfaenger' };
  assert.equal(mesoWeeks(p), 7);
  const plan = generatePlan(p, { startDate: '2026-09-14' });
  assert.equal(plan.weeks, 7);
  assert.equal(plan.deloadWeek, 7);
  assert.equal(plan.rir.length, 7);
  assert.equal(planWeek(plan, '2026-10-26'), 7);
  for (const c of plan.cardio.sessions) assert.equal(c.minutesByWeek.length, 7);
  assert.equal(generatePlan(base).weeks, 5);
  // Direkte Sätze
  const adv = generatePlan(base);
  const direct = (m, iso = false) => adv.days.flatMap((d) => d.exercises).filter((e) => e.muscle === m && getExercise(e.exId).primary.includes(m) && (!iso || getExercise(e.exId).pattern === 'iso')).reduce((a, e) => a + e.sets, 0);
  assert.ok(direct('bizeps') >= minDirectSets(4), `Bizeps ${direct('bizeps')}`);
  assert.ok(direct('trizeps') >= minDirectSets(4), `Trizeps ${direct('trizeps')}`);
  assert.ok(direct('schultern', true) >= minDirectSets(4), `Schultern iso ${direct('schultern', true)}`);
  // Schulterdrücken zählt für die Schultern halb
  const vol = weeklyVolume([{ date: '2026-09-14', entries: [{ exId: 'schulterdruecken_lh', sets: [{ reps: 8 }, { reps: 8 }] }, { exId: 'seitheben_kh', sets: [{ reps: 12 }, { reps: 12 }] }] }], '2026-09-14');
  assert.equal(vol.schultern, 3);
});

test('Ernährung: aktuelles Gewicht, Trendfenster, Fett-Untergrenze, Abnahmerate, Netto-Cardio', () => {
  const logs = [];
  for (let i = 0; i < 90; i++) logs.push({ date: new Date(2026, 5, 1 + i).toISOString().slice(0, 10), weightKg: i < 69 ? 85 - (i / 7) * 0.5 : 80.1 });
  assert.equal(currentWeight({ weightKg: 92 }, logs), 80.1);
  const t = weightTrend(logs);
  assert.ok(Math.abs(t.perWeek) < 0.15, `Plateau nicht erkannt: ${t.perWeek}`);
  assert.ok(t.days <= 28);
  const woman = { ...base, sex: 'w', weightKg: 65, heightCm: 168, goal: 'fettabbau', targetWeightKg: 58 };
  const n = computeNutrition(woman, null);
  assert.ok(n.fat >= 65, `Fett ${n.fat}`);
  assert.equal(n.proteinRefKg, 58);
  const n2 = computeNutrition(woman, null, { weightKg: 60 });
  assert.ok(n2.target < n.target);
  assert.deepEqual(expectedWeeklyRate({ ...woman, heightCm: 175 }, 60), [-0.7, -0.25]);
  assert.deepEqual(expectedWeeklyRate({ ...base, goal: 'fettabbau', weightKg: 95 }), [-1.0, -0.5]);
  assert.equal(cardioKcal('laufen', 30, 78), Math.round(((8.8 - 1) * 3.5 * 78 / 200) * 30));
});

test('Cardio: Vorlagen, Wochentage und gemessener Maximalpuls', () => {
  const days = [{ weekday: 0, lower: false }, { weekday: 1, lower: true }, { weekday: 3, lower: false }, { weekday: 4, lower: true }];
  const c = buildCardioPlan({ ...base, goal: 'fettabbau', cardioSessions: 3 }, { weeks: 5, strengthDays: days });
  assert.ok(c.sessions.some((s) => s.type === 'schwelle' && s.zone === 4));
  for (const s of c.sessions) {
    assert.ok(s.weekday != null);
    assert.ok(![1, 4].includes(s.weekday), 'Cardio nicht am Beintag');
    if (s.intervals) assert.ok(![0, 3].includes(s.weekday), 'Intervalle nicht am Tag vor dem Beintag');
  }
  assert.equal(new Set(c.sessions.map((s) => s.weekday)).size, c.sessions.length);
  const wd = assignCardioWeekdays([{ intervals: true }, { intervals: null }], [{ weekday: 0, lower: true }, { weekday: 2, lower: true }, { weekday: 4, lower: true }]);
  assert.equal(wd[0], 5);
  assert.equal(buildCardioPlan({ ...base, goal: 'ausdauer', cardioSessions: undefined }).sessionsPerWeek, 4);
  assert.equal(heartRateZones(30, 60, 190).max, 190);
  assert.ok(heartRateZones(30, 60, 190).measured);
});

test('Deload hält das Gewicht, Aufwärmen beim Kreuzheben ohne leere Stange', () => {
  const wu = warmupSets(getExercise('kreuzheben'), 140, 20, 'voll');
  assert.ok(wu.every((s) => s.weight >= 40));
  assert.ok(!wu.some((s) => s.note === 'leere Stange'));
  const bench = warmupSets(getExercise('bankdruecken_lh'), 80, 20, 'voll');
  assert.equal(bench[0].weight, 20);
});

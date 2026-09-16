import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestSet, recordEvents, newRecordEvents, recordStreak, recordWeeks, strengthScore, rankInfo, nextTargets, overallRank, recordBoard, rankLadder, RANKS, repsToBeat, weightToBeat, recordAttempts } from '../src/engine/records.js';
import { personalRecords, newRecords } from '../src/engine/analytics.js';
import { badgeStatus } from '../src/engine/achievements.js';
import { getExercise } from '../src/data/exercises.js';
import { referenceE1RM } from '../src/engine/plan.js';

const profile = { sex: 'm', age: 30, heightCm: 180, weightKg: 80, experience: 'fortgeschritten' };
const W = (id, date, entries, finishedAt = null) => ({ id, date, finishedAt, entries });
const E = (exId, ...sets) => ({ exId, sets: sets.map(([weight, reps]) => ({ weight, reps })) });
const empty = { workouts: [], cardioLogs: [], checkins: [], foodLog: {}, waterLog: {}, bodyLogs: [], planHistory: [], profile };

test('bestSet: bei Gewicht zählt der Satz mit dem höchsten e1RM, ohne Gewicht die meisten Wiederholungen', () => {
  const b = bestSet(E('bankdruecken_lh', [60, 12], [100, 5]));
  assert.equal(b.weight, 100);
  assert.equal(b.reps, 5);
  assert.equal(b.e1rm, 116.7);
  const bw = bestSet(E('liegestuetze', [0, 12], [0, 18]));
  assert.deepEqual(bw, { e1rm: 0, weight: 0, reps: 18 });
  assert.equal(bestSet({ sets: [] }), null);
  // personalRecords nutzt dieselbe Auswahl (Gewicht × Wdh. des besten Satzes, nicht Maximalwerte aus verschiedenen Sätzen)
  const pr = personalRecords([W('a', '2026-09-01', [E('bankdruecken_lh', [60, 12], [100, 5])])]);
  assert.equal(pr[0].reps, 5);
  const prBw = personalRecords([W('a', '2026-09-01', [E('liegestuetze', [0, 10])]), W('b', '2026-09-03', [E('liegestuetze', [0, 14])])]);
  assert.equal(prBw[0].reps, 14);
  assert.equal(newRecords(W('c', '2026-09-05', [E('liegestuetze', [0, 12])]), [W('a', '2026-09-01', [E('liegestuetze', [0, 10])]), W('b', '2026-09-03', [E('liegestuetze', [0, 14])])]).length, 0);
});

test('Rekord-Chronik: erster Eintrag, Steigerungen mit Delta, kein Ereignis ohne Steigerung', () => {
  const workouts = [
    W('w1', '2026-08-03', [E('bankdruecken_lh', [60, 8]), E('liegestuetze', [0, 12])]),
    W('w2', '2026-08-10', [E('bankdruecken_lh', [62.5, 8]), E('liegestuetze', [0, 12])]),
    W('w3', '2026-08-17', [E('bankdruecken_lh', [62.5, 7])]),
    W('w4', '2026-08-24', [E('bankdruecken_lh', [65, 8]), E('liegestuetze', [0, 15])]),
  ];
  const ev = recordEvents(workouts, profile);
  assert.deepEqual(ev.map((e) => [e.exId, e.kind, e.delta]), [
    ['bankdruecken_lh', 'first', 0], ['liegestuetze', 'first', 0], ['bankdruecken_lh', 'improve', 3.2], ['bankdruecken_lh', 'improve', 3.1], ['liegestuetze', 'improve', 3],
  ]);
  assert.equal(ev[2].prev.e1rm, 76);
  assert.equal(ev[2].mode, 'kg');
  assert.equal(ev[4].mode, 'reps');
  const fresh = newRecordEvents(W('w5', '2026-08-31', [E('bankdruecken_lh', [65, 10]), E('liegestuetze', [0, 15])]), workouts, profile);
  assert.equal(fresh.length, 1);
  assert.equal(fresh[0].exId, 'bankdruecken_lh');
  assert.equal(fresh[0].workoutId, 'w5');
});

test('Rekord-Serie zählt Wochen in Folge mit Steigerung; laufende Woche darf fehlen', () => {
  const workouts = [
    W('w1', '2026-08-03', [E('kniebeuge_lh', [80, 5])]),
    W('w2', '2026-08-12', [E('kniebeuge_lh', [85, 5])]), // KW 10.8.
    W('w3', '2026-08-19', [E('kniebeuge_lh', [90, 5])]), // KW 17.8.
    W('w4', '2026-08-26', [E('kniebeuge_lh', [90, 5])]), // keine Steigerung, KW 24.8.
    W('w5', '2026-09-08', [E('kniebeuge_lh', [92.5, 5])]), // KW 7.9.
    W('w6', '2026-09-15', [E('kniebeuge_lh', [95, 5])]), // KW 14.9.
  ];
  const ev = recordEvents(workouts, profile);
  const s1 = recordStreak(ev, '2026-09-16');
  assert.equal(s1.weeks, 2);
  assert.equal(s1.thisWeek, true);
  assert.equal(s1.atRisk, false);
  assert.equal(s1.best, 2);
  const s2 = recordStreak(ev, '2026-09-22'); // neue Woche ohne Steigerung: Serie lebt, aber in Gefahr
  assert.equal(s2.weeks, 2);
  assert.equal(s2.atRisk, true);
  assert.equal(s2.daysLeft, 5);
  const s3 = recordStreak(ev, '2026-09-29'); // eine Woche ausgelassen: Serie gerissen
  assert.equal(s3.weeks, 0);
  assert.equal(s3.best, 2);
  const weeks = recordWeeks(ev, '2026-09-16', 4);
  assert.deepEqual(weeks.map((w) => w.count), [0, 0, 1, 1]);
  assert.equal(weeks[3].current, true);
});

test('Kraftwert und Ränge: 100 Punkte = Referenz Fortgeschritten, Schwellen 55/80/105/130', () => {
  const bench = getExercise('bankdruecken_lh');
  const ref = referenceE1RM(bench, profile);
  assert.equal(ref, 80); // ratio 1.0 × 80 kg, Mann, 30 Jahre
  assert.equal(strengthScore(bench, { e1rm: 80 }, profile), 100);
  assert.equal(strengthScore(bench, { e1rm: 40 }, profile), 50);
  assert.equal(rankInfo(50).id, 'bronze');
  assert.equal(rankInfo(55).id, 'silber');
  assert.equal(rankInfo(100).id, 'gold');
  assert.equal(rankInfo(100).next.id, 'platin');
  assert.equal(rankInfo(100).toNext, 5);
  assert.equal(rankInfo(130).id, 'diamant');
  assert.equal(rankInfo(200).next, null);
  assert.equal(rankInfo(200).progress, 1);
  assert.equal(rankInfo(null), null);
  assert.equal(RANKS.length, 5);
  // Frauen und Ältere haben eine niedrigere Referenz – gleiche Leistung, höherer Rang
  assert.ok(strengthScore(bench, { e1rm: 60 }, { ...profile, sex: 'w', weightKg: 62 }) > strengthScore(bench, { e1rm: 60 }, profile));
  assert.ok(strengthScore(bench, { e1rm: 60 }, { ...profile, age: 65 }) > strengthScore(bench, { e1rm: 60 }, profile));
  // Körpergewichtsübungen: Wiederholungen gegen den Fortgeschrittenen-Wert (Liegestütze 15), unabhängig von der eigenen Erfahrung
  const push = getExercise('liegestuetze');
  assert.equal(strengthScore(push, { e1rm: 0, reps: 15 }, { ...profile, experience: 'anfaenger' }), 100);
  assert.equal(strengthScore(getExercise('beinstrecker'), { e1rm: 0, reps: 15 }, profile), null); // Maschine ohne Gewicht: kein Vergleichswert
  assert.equal(strengthScore(bench, { e1rm: 80 }, null), null);
  const ladder = rankLadder(bench, profile);
  assert.deepEqual(ladder.map((l) => l.threshold), [0, 44, 64, 84, 104]);
});

test('Nächste Ziele: nächster Rang, runde Zahl und Körpergewicht-Vielfaches, nach Nähe sortiert', () => {
  const bench = getExercise('bankdruecken_lh');
  const t = nextTargets(bench, { mode: 'kg', e1rm: 78 }, profile);
  const kinds = Object.fromEntries(t.map((x) => [x.kind, x]));
  assert.equal(kinds.rank.label, 'Platin'); // 78 kg = 98 Punkte (Gold), Platin ab 105 Punkten = 84 kg
  assert.equal(kinds.rank.target, 84);
  assert.equal(kinds.club.target, 80);
  assert.equal(kinds.bw.label, '1× Körpergewicht');
  assert.equal(kinds.bw.target, 80);
  assert.ok(t[0].gap <= t[t.length - 1].gap);
  const r = nextTargets(getExercise('liegestuetze'), { mode: 'reps', reps: 17 }, profile);
  assert.equal(r.find((x) => x.kind === 'club').target, 20);
  assert.equal(r.find((x) => x.kind === 'rank').label, 'Diamant'); // 17 von 15 Referenz-Wdh. = 113 Punkte (Platin)
  assert.equal(nextTargets(getExercise('beinpresse'), { mode: 'kg', e1rm: 150 }, profile).some((x) => x.kind === 'bw'), false);
});

test('Rekord-Übersicht: Ränge je Übung, Gesamt-Kraftrang, Ziele, Rangaufstieg-Ereignisse', () => {
  const s = {
    ...empty,
    workouts: [
      W('w1', '2026-09-01', [E('bankdruecken_lh', [60, 5]), E('kniebeuge_lh', [100, 5]), E('liegestuetze', [0, 10])]),
      W('w2', '2026-09-08', [E('bankdruecken_lh', [70, 5]), E('kniebeuge_lh', [100, 8])]),
      W('w3', '2026-09-15', [E('bankdruecken_lh', [80, 5]), E('kreuzheben', [140, 5])]),
    ],
  };
  const b = recordBoard(s, '2026-09-16');
  assert.equal(b.records.length, 4);
  assert.equal(b.improvements, 3);
  assert.equal(b.thisWeek, 1);
  assert.equal(b.streak.weeks, 2); // erste Einträge (KW 31.8.) zählen nicht als Steigerung
  assert.equal(b.daysSince, 1);
  const bench = b.records.find((r) => r.exId === 'bankdruecken_lh');
  assert.equal(bench.e1rm, 93.3);
  assert.equal(bench.rank.id, 'platin');
  assert.equal(bench.improvements, 2);
  assert.equal(bench.isNew, true);
  assert.ok(bench.targets.length >= 2);
  const push = b.records.find((r) => r.exId === 'liegestuetze');
  assert.equal(push.mode, 'reps');
  assert.equal(push.rank.id, 'silber');
  assert.ok(b.overall && ['gold', 'platin', 'diamant'].includes(b.overall.id), b.overall?.id);
  assert.equal(b.overall.basis.length, 3); // hpush, squat, hinge – Liegestütze zählen als zweites hpush nicht doppelt
  assert.equal(b.records[0].score >= b.records[1].score, true);
  // Rangaufstieg: Bankdrücken 60→70→80 kg × 5 = e1RM 70 → 81,7 → 93,3, Referenz 80 → 88 → 102 → 117 Punkte: Gold → Gold → Platin
  const ups = b.events.filter((e) => e.rankUp);
  assert.equal(ups.length, 1);
  assert.equal(ups[0].rank.id, 'platin');
  assert.equal(ups[0].date, '2026-09-15');
  assert.equal(b.rankUps, 1);
  assert.equal(b.targets.length, 3);
  // ohne Profil: Chronik und Serie funktionieren, Ränge fehlen
  const noProfile = recordBoard({ ...s, profile: null }, '2026-09-16');
  assert.equal(noProfile.overall, null);
  assert.equal(noProfile.records.every((r) => r.rank === null), true);
  assert.equal(noProfile.streak.weeks, 2);
  assert.equal(overallRank([]), null);
});

test('Abzeichen für Bestleistungen: Ränge, Clubs, Rekord-Serie, Rekordtag', () => {
  const s = {
    ...empty,
    workouts: [
      W('w0', '2026-07-27', [E('bankdruecken_lh', [65, 5]), E('kniebeuge_lh', [95, 5]), E('kreuzheben', [110, 5])]),
      W('w1', '2026-08-03', [E('bankdruecken_lh', [70, 5]), E('kniebeuge_lh', [100, 5]), E('kreuzheben', [120, 5])]),
      W('w2', '2026-08-10', [E('bankdruecken_lh', [75, 5]), E('kniebeuge_lh', [110, 5]), E('kreuzheben', [130, 5])]),
      W('w3', '2026-08-17', [E('bankdruecken_lh', [80, 5]), E('kniebeuge_lh', [115, 5]), E('kreuzheben', [140, 5])]),
      W('w4', '2026-08-24', [E('bankdruecken_lh', [82.5, 5]), E('kniebeuge_lh', [120, 5]), E('kreuzheben', [150, 5])]),
    ],
  };
  const st = Object.fromEntries(badgeStatus(s, '2026-08-25').map((b) => [b.id, b.earned]));
  assert.equal(st.pr_10, true); // 4 Wochen × 3 Steigerungen
  assert.equal(st.pr_50, false);
  assert.equal(st.pr_day_3, true);
  assert.equal(st.pr_streak_4, true);
  assert.equal(st.pr_streak_8, false);
  assert.equal(st.club_100, true); // Kniebeuge e1RM 140
  assert.equal(st.bw_bench, true); // 82,5 × 5 → e1RM 96 ≥ 80 kg
  assert.equal(st.bw_squat, true); // 120 × 5 → 140 ≥ 120
  assert.equal(st.bw_hinge, true); // 150 × 5 → 175 ≥ 160
  assert.equal(st.rank_gold, true);
  assert.equal(st.rank_platin, true);
  assert.equal(st.kraft_gold, true);
  const none = Object.fromEntries(badgeStatus({ ...empty, profile: null }, '2026-08-25').map((b) => [b.id, b.earned]));
  assert.equal(Object.values(none).some(Boolean), false);
});

test('Rekord knacken: nötige Wiederholungen bzw. Gewicht nach Epley', () => {
  // Rekord 70 × 8 → e1RM 88,7
  assert.equal(repsToBeat(88.7, 70), 9);
  assert.equal(repsToBeat(88.7, 72.5), 7);
  assert.equal(repsToBeat(88.7, 60), null); // 60 × 12 = 84 < 88,7
  assert.equal(repsToBeat(88.7, 0), null);
  assert.equal(weightToBeat(88.7, 8, 2.5), 72.5);
  assert.equal(weightToBeat(88.7, 8, 1), 71); // 70 × 8 wäre nur Gleichstand
  assert.ok(weightToBeat(88.7, 8, 1) * (1 + 8 / 30) > 88.7);
  const a = recordAttempts({ mode: 'kg', e1rm: 88.7, reps: 8 }, { weight: 70, reps: 8, repMax: 10, inc: 2.5 }, 96);
  assert.deepEqual(a.sameWeight, { weight: 70, reps: 9 });
  assert.deepEqual(a.moreWeight, { weight: 72.5, reps: 8 });
  assert.deepEqual(a.target, { weight: 70, reps: 12 }); // 70 × 12 = 98 ≥ 96
  const far = recordAttempts({ mode: 'kg', e1rm: 88.7, reps: 8 }, { weight: 70, reps: 8, repMax: 10, inc: 2.5 }, 120);
  assert.equal(far.target.weight, 95); // 90 × 8 = 114 < 120, also 95 kg
  const bw = recordAttempts({ mode: 'reps', reps: 15 }, { weight: 0, reps: 12 }, 20);
  assert.deepEqual(bw, { reps: 16, target: 20 });
  assert.equal(recordAttempts(null, {}), null);
  const noWeight = recordAttempts({ mode: 'kg', e1rm: 50, reps: 5 }, { weight: 0, reps: 5, inc: 2.5 });
  assert.equal(noWeight.sameWeight, null);
  assert.equal(noWeight.moreWeight.weight, 45);
});

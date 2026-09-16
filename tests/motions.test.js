// Bewegungsfiguren: jede Übung hat eine Animation, jede Animation liefert sinnvolle Gelenkpunkte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISES } from '../src/data/exercises.js';
import { MOBILITY } from '../src/data/mobility.js';
import { MOTIONS, motionFor, motionForMobility } from '../src/data/motions.js';
import { _internals } from '../src/ui/figure.js';

const { getMotion, poseAt, joints } = _internals;

test('jede Übung ist einer vorhandenen Bewegung zugeordnet', () => {
  for (const ex of EXERCISES) {
    const id = motionFor(ex);
    assert.ok(id && MOTIONS[id], `${ex.id} ohne Bewegung`);
  }
});

test('Mobilitätsübungen: Zuordnung zeigt nur auf vorhandene Bewegungen', () => {
  for (const m of MOBILITY) {
    const id = motionForMobility(m);
    if (id) assert.ok(MOTIONS[id], `${m.id} → ${id} fehlt`);
  }
});

test('jede Bewegung hat Schritte, Tempo und eine Phasenbeschriftung', () => {
  for (const [id, m] of Object.entries(MOTIONS)) {
    assert.ok(m.steps?.length >= 3, `${id}: zu wenige Schritte`);
    assert.ok(m.tempo, `${id}: kein Tempo`);
    assert.ok(m.frames.length >= 2, `${id}: zu wenige Posen`);
    assert.ok(m.frames.some((f) => f.label), `${id}: keine Beschriftung`);
    assert.equal(m.frames[0].t ?? 0, 0, `${id}: erste Pose nicht bei t=0`);
    for (let i = 1; i < m.frames.length; i++) assert.ok(m.frames[i].t > m.frames[i - 1].t, `${id}: Zeiten nicht aufsteigend`);
  }
});

test('alle Gelenkpunkte sind endlich und bleiben im Bild', () => {
  for (const id of Object.keys(MOTIONS)) {
    const cm = getMotion(id);
    const box = cm.box || [0, 0, 200, 200];
    for (const t of [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 0.999]) {
      const p = poseAt(cm, t);
      const J = joints(cm, p);
      for (const [name, pt] of Object.entries(J)) {
        assert.ok(Number.isFinite(pt[0]) && Number.isFinite(pt[1]), `${id}@${t} ${name} nicht endlich`);
        assert.ok(pt[0] >= box[0] - 12 && pt[0] <= box[0] + box[2] + 12, `${id}@${t} ${name} x=${pt[0].toFixed(1)} außerhalb`);
        assert.ok(pt[1] >= box[1] - 12 && pt[1] <= box[1] + box[3] + 12, `${id}@${t} ${name} y=${pt[1].toFixed(1)} außerhalb`);
      }
    }
  }
});

test('Füße stehender Übungen bleiben am Boden', () => {
  for (const id of ['squat_bar', 'deadlift', 'rdl', 'curl', 'lunge', 'ohp', 'lateral_raise']) {
    const cm = getMotion(id);
    for (const t of [0, 0.3, 0.5, 0.8]) {
      const J = joints(cm, poseAt(cm, t));
      const ankles = cm.view === 'side' ? [J.ankleN] : [J.ankleL, J.ankleR];
      for (const a of ankles) assert.ok(Math.abs(a[1] - 172) < 4, `${id}@${t}: Knöchel bei y=${a[1].toFixed(1)}`);
    }
  }
});

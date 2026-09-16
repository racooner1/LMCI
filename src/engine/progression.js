// Progression: Doppelte Progression (erst Wiederholungen, dann Gewicht) + Autoregulation über Feedback.
import { getExercise } from '../data/exercises.js';
import { round, estimate1RM } from './util.js';
import { estimateStartWeight, estimateStartReps } from './plan.js';

const UPPER = new Set(['brust', 'ruecken', 'schultern', 'bizeps', 'trizeps']);

// Sinnvolle Gewichtssteigerung für eine Übung.
export function incrementFor(ex) {
  if (ex.inc) return ex.inc;
  if (ex.load === 'barbell') return ex.primary.some((m) => UPPER.has(m)) ? 2.5 : 5;
  if (ex.load === 'dumbbell') return 2;
  if (ex.load === 'machine' || ex.load === 'cable') return 2.5;
  return 0;
}

function roundToInc(weight, inc) {
  if (!inc) return Math.round(weight * 2) / 2;
  return round(weight, inc);
}

function workingSets(entry) {
  return (entry?.sets || []).filter((s) => s && s.reps > 0);
}

export function summarizeEntry(entry, ex) {
  const sets = workingSets(entry);
  if (!sets.length) return '';
  const unit = ex.load === 'time' ? 's' : '';
  const w = sets[0].weight || 0;
  const reps = sets.map((s) => `${s.reps}${unit}`).join(', ');
  if (ex.load === 'bw' || ex.load === 'time' || ex.load === 'band') {
    return w ? `+${w} kg × ${reps}` : reps;
  }
  return `${w} kg × ${reps}`;
}

/**
 * Vorschlag für die nächste Einheit.
 * @param {object} pe   Übung aus dem Plan { exId, repMin, repMax, ... }
 * @param {Array}  history  frühere Einträge für diese Übung, ältester zuerst: [{ date, sets:[{weight,reps,rir}] }]
 * @param {number} rirTarget  RIR-Vorgabe der Woche
 * @param {boolean} deload
 */
export function suggestNext(pe, history, rirTarget, deload = false, ctx = {}) {
  const ex = getExercise(pe.exId);
  const inc = incrementFor(ex);
  const last = history.length ? history[history.length - 1] : null;
  const sets = workingSets(last);
  const isLoadable = !['bw', 'time', 'band'].includes(ex.load);
  const unitLabel = ex.load === 'time' ? 'Sekunden' : 'Wdh.';

  if (!sets.length) {
    const est = ctx.profile ? estimateStartWeight(ex, ctx.profile, pe.repMin, rirTarget, ctx.settings || {}) : null;
    const estReps = ctx.profile ? estimateStartReps(ex, ctx.profile) : null;
    if (isLoadable && est) {
      return {
        kind: 'start',
        weight: est,
        reps: pe.repMin,
        estimated: true,
        note: `Startgewicht geschätzt: ${est} kg für ${pe.repMin}–${pe.repMax} ${unitLabel} mit ${rirTarget} in Reserve. Zu leicht oder zu schwer? Einfach anpassen – ab dem 2. Mal zählt nur noch dein Log.`,
        prev: '',
      };
    }
    if (!isLoadable && estReps) {
      const r = Math.max(pe.repMin, Math.min(pe.repMax, estReps));
      return {
        kind: 'start',
        weight: ex.load === 'bw' ? 0 : null,
        reps: r,
        estimated: true,
        note: `Schätzung: ca. ${estReps} ${unitLabel} schaffst du vermutlich. Ziel ${pe.repMin}–${pe.repMax} bei ${rirTarget} in Reserve${estReps > pe.repMax ? ' – wähle eine schwerere Variante oder Zusatzgewicht' : estReps < pe.repMin ? ' – notfalls leichtere Variante' : ''}.`,
        prev: '',
      };
    }
    return {
      kind: 'start',
      weight: null,
      reps: pe.repMin,
      note: isLoadable
        ? `Erste Einheit: Wähle ein Gewicht, mit dem du ${pe.repMin}–${pe.repMax} saubere ${unitLabel} mit ${rirTarget} Wiederholungen Reserve schaffst.`
        : `Erste Einheit: So viele saubere ${unitLabel} wie möglich bei ${rirTarget} in Reserve – Ziel ${pe.repMin}–${pe.repMax}.`,
      prev: '',
    };
  }

  const w = sets[0].weight || 0;
  const minReps = Math.min(...sets.map((s) => s.reps));
  const avgRir = sets.every((s) => s.rir != null) ? sets.reduce((a, s) => a + s.rir, 0) / sets.length : null;
  const prev = summarizeEntry(last, ex);

  if (deload) {
    return {
      kind: 'deload',
      weight: isLoadable ? roundToInc(w * 0.9, inc) : w,
      reps: pe.repMin,
      note: `Deload: ca. 10 % weniger Gewicht, halbe Satzzahl, locker bleiben (${rirTarget}+ in Reserve).`,
      prev,
    };
  }

  const hitTop = minReps >= pe.repMax && (avgRir == null || avgRir >= rirTarget - 0.5);
  if (hitTop) {
    if (isLoadable) {
      const nw = roundToInc(w + inc, inc);
      return { kind: 'up', weight: nw, reps: pe.repMin, note: `Alle Sätze am oberen Ende – Gewicht erhöhen auf ${nw} kg, zurück auf ${pe.repMin} ${unitLabel}.`, prev };
    }
    return {
      kind: 'up',
      weight: w,
      reps: pe.repMax,
      note: w || ex.load === 'time'
        ? `Oberes Ende erreicht – ${ex.load === 'time' ? 'Zeit' : 'Zusatzgewicht'} erhöhen oder schwerere Variante wählen.`
        : 'Oberes Ende erreicht – schwerere Variante, Zusatzgewicht (Rucksack) oder langsameres Tempo.',
      prev,
    };
  }

  // Zweimal in Folge das Minimum verfehlt → Gewicht reduzieren.
  const before = history.length > 1 ? workingSets(history[history.length - 2]) : [];
  const failedTwice = minReps < pe.repMin && before.length && Math.min(...before.map((s) => s.reps)) < pe.repMin && (before[0].weight || 0) === w;
  if (failedTwice && isLoadable) {
    const nw = roundToInc(w * 0.92, inc);
    return { kind: 'down', weight: nw, reps: pe.repMin, note: `Zweimal unter ${pe.repMin} ${unitLabel} – Gewicht auf ${nw} kg reduzieren und neu aufbauen.`, prev };
  }
  if (minReps < pe.repMin) {
    return { kind: 'hold', weight: w, reps: pe.repMin, note: `Letztes Mal unter ${pe.repMin} ${unitLabel} – Gewicht halten, Technik und Pausen prüfen.`, prev };
  }
  return { kind: 'reps', weight: w, reps: Math.min(pe.repMax, minReps + 1), note: `Gewicht halten, pro Satz eine Wiederholung mehr anpeilen (Ziel ${pe.repMax}).`, prev };
}

/**
 * Autoregulation nach dem Feedback einer Einheit.
 * feedback: { rpe: 1–10, soreness: 'keine'|'leicht'|'stark'|'nicht_erholt', performance: 'besser'|'gleich'|'schlechter' }
 * Rückgabe: -1 (weniger Sätze), 0, +1 (mehr Sätze) für diesen Trainingstag.
 */
export function volumeDeltaFromFeedback(fb) {
  if (!fb) return 0;
  const s = fb.soreness;
  if (s === 'nicht_erholt' || (s === 'stark' && fb.performance === 'schlechter')) return -1;
  if (fb.rpe >= 9.5 && fb.performance === 'schlechter') return -1;
  if ((s === 'keine' || !s) && fb.performance !== 'schlechter' && (fb.rpe ?? 8) <= 7.5) return 1;
  return 0;
}

/**
 * Autoregulation pro Muskel.
 * feedback: { rpe, performance, sore: [muskeln, die vor der Einheit noch nicht erholt waren], more: [muskeln, die mehr vertragen] }
 * trained: Muskeln, die in der Einheit als Hauptmuskel trainiert wurden.
 * Rückgabe: { muskel: -1 | 0 | +1 }
 */
export function muscleDeltasFromFeedback(fb, trained) {
  const out = {};
  if (!fb) return out;
  const sore = new Set(fb.sore || []);
  const more = new Set(fb.more || []);
  const globalDown = (fb.rpe ?? 8) >= 9.5 && fb.performance === 'schlechter';
  const globalUp = (fb.rpe ?? 8) <= 7 && fb.performance === 'besser';
  for (const m of trained) {
    if (sore.has(m) || globalDown) out[m] = -1;
    else if (more.has(m) || globalUp) out[m] = 1;
    else out[m] = 0;
  }
  return out;
}

export function feedbackMessage(delta) {
  if (delta > 0) return 'Gute Erholung und Leistung – Volumen für diesen Tag um 1 Satz pro Übung erhöht.';
  if (delta < 0) return 'Erholung noch nicht ausreichend – Volumen für diesen Tag um 1 Satz pro Übung reduziert.';
  return 'Volumen bleibt – passt.';
}

// Bestes geschätztes 1RM aus einem Eintrag.
export function bestE1RM(entry) {
  let best = 0;
  for (const s of workingSets(entry)) {
    if (!s.weight) continue;
    best = Math.max(best, estimate1RM(s.weight, Math.min(s.reps, 12)));
  }
  return Math.round(best * 10) / 10;
}

// Scheibenrechner: welche Scheiben pro Seite auf die Stange.
export function plates(targetWeight, barWeight = 20, available = [25, 20, 15, 10, 5, 2.5, 1.25]) {
  let perSide = (targetWeight - barWeight) / 2;
  if (perSide < 0) return { perSide: [], rest: perSide };
  const out = [];
  for (const p of [...available].sort((a, b) => b - a)) {
    while (perSide >= p - 1e-9) {
      out.push(p);
      perSide -= p;
    }
  }
  return { perSide: out, rest: Math.round(perSide * 100) / 100 };
}

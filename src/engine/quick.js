// Schnelltraining: Ausrüstung + Fokus + Zeit → fertige Aufgabenliste, ohne Plan.
import { EXERCISES } from '../data/exercises.js';
import { MUSCLES } from '../data/muscles.js';
import { seededRandom, clamp } from './util.js';
import { estimateStartWeight, estimateStartReps, isFeasibleFor } from './plan.js';

export const QUICK_GEAR = [
  { id: 'studio', name: 'Fitnessstudio (alles da)' },
  { id: 'kurzhantel', name: 'Kurzhanteln' },
  { id: 'langhantel', name: 'Langhantel' },
  { id: 'kettlebell', name: 'Kettlebell' },
  { id: 'bank', name: 'Bank / Erhöhung' },
  { id: 'klimmzugstange', name: 'Klimmzugstange' },
  { id: 'band', name: 'Bänder' },
  { id: 'schlingentrainer', name: 'Schlingentrainer' },
];

export const QUICK_FOCUS = [
  { id: 'ganzkoerper', name: 'Ganzkörper', muscles: ['quadrizeps', 'brust', 'ruecken', 'beinbeuger', 'schultern', 'bauch', 'gesaess'] },
  { id: 'oberkoerper', name: 'Oberkörper', muscles: ['brust', 'ruecken', 'schultern', 'trizeps', 'bizeps'] },
  { id: 'unterkoerper', name: 'Unterkörper', muscles: ['quadrizeps', 'beinbeuger', 'gesaess', 'waden'] },
  { id: 'push', name: 'Push (Brust, Schultern, Trizeps)', muscles: ['brust', 'schultern', 'trizeps'] },
  { id: 'pull', name: 'Pull (Rücken, Bizeps)', muscles: ['ruecken', 'bizeps', 'schultern'] },
  { id: 'core', name: 'Bauch & Rumpf', muscles: ['bauch'] },
  { id: 'arme', name: 'Arme', muscles: ['bizeps', 'trizeps', 'schultern'] },
  { id: 'beine_po', name: 'Beine & Gesäß', muscles: ['gesaess', 'quadrizeps', 'beinbeuger'] },
];

export const QUICK_STYLES = [
  { id: 'kraft', name: 'Kraft & Muskeln', desc: 'Klassische Sätze mit Pausen' },
  { id: 'zirkel', name: 'Zirkel / Kondition', desc: 'Kurze Pausen, mehr Wiederholungen, schweißtreibend' },
];

const EX_PER_MINUTES = [[15, 3], [20, 4], [30, 5], [45, 7], [60, 8], [90, 10]];
// Erleichterte Varianten – nur für Anfänger, wenn es Alternativen gibt
const EASY = new Set(['liegestuetze_knie', 'klimmzuege_negativ', 'klimmzuege_band', 'klimmzuege_maschine', 'knieheben_haengend', 'sissy_squat', 'glute_bridge', 'crunches', 'wadenheben_einbeinig']);

// Wiederholungsbereich und Pause je Übung und Stil. Eigene Bereiche (ex.reps) gelten immer.
export function quickReps(ex, style, profile = {}) {
  if (ex.load === 'time') return ex.reps ? [ex.reps[0], ex.reps[1], style === 'zirkel' ? 30 : 60] : [30, 60, style === 'zirkel' ? 30 : 60];
  if (ex.reps) return [ex.reps[0], ex.reps[1], style === 'zirkel' ? 45 : ex.tier === 1 ? 120 : 90];
  if (style === 'zirkel') return ex.tier === 3 ? [15, 20, 30] : [12, 15, 45];
  let [repMin, repMax, rest] = ex.tier === 1 ? [6, 10, 120] : ex.tier === 2 ? [8, 12, 90] : [10, 15, 60];
  if (profile.experience === 'anfaenger' && ex.tier === 1) [repMin, repMax] = [8, 12];
  // Körpergewichts- und Bandübungen brauchen kürzere Pausen
  if (['bw', 'band'].includes(ex.load)) rest = ex.tier === 3 ? 45 : 60;
  return [repMin, repMax, rest];
}
// Zeit pro Satz: Ausführung (~40 s) + Pause
const setCost = (t) => (t.restSec + 40) / 60;

export function quickPool({ gear = [], limitations = [] }) {
  const studio = gear.includes('studio');
  return EXERCISES.filter((e) => {
    if (e.contra.some((c) => limitations.includes(c))) return false;
    if (studio && e.ctx.includes('gym')) return true;
    return e.ctx.includes('home') && e.gear.every((g) => gear.includes(g));
  });
}

/**
 * opts: { gear, focus (ids), muscles (zusätzliche Muskel-ids), minutes, intensity: 'leicht'|'normal'|'hart', style: 'kraft'|'zirkel', profile, seed }
 */
export function buildQuickWorkout(opts) {
  const { profile = {}, minutes = 30, intensity = 'normal', style = 'kraft' } = opts;
  const rnd = seededRandom(opts.seed ?? Date.now());
  const pool = quickPool({ gear: opts.gear || [], limitations: profile.limitations || [] });
  // Zielmuskeln in Reihenfolge, ohne Doppelte – gezielt gewählte Muskeln zuerst, damit sie sicher vorkommen
  const muscles = [];
  for (const m of opts.muscles || []) if (!muscles.includes(m)) muscles.push(m);
  for (const f of opts.focus || []) for (const m of QUICK_FOCUS.find((x) => x.id === f)?.muscles || []) if (!muscles.includes(m)) muscles.push(m);
  if (!muscles.length) muscles.push(...QUICK_FOCUS[0].muscles);

  const maxEx = EX_PER_MINUTES.reduce((acc, [min, n]) => (minutes >= min ? n : acc), 3);
  const sets = intensity === 'leicht' ? 2 : intensity === 'hart' ? 4 : 3;
  const rir = intensity === 'leicht' ? 3 : intensity === 'hart' ? 1 : 2;
  const used = new Set();
  const usedPatterns = new Set(); // "muskel:pattern", damit nicht zweimal dieselbe Bewegung für denselben Muskel
  const picks = [];
  const beginner = profile.experience === 'anfaenger';
  const pick = (muscle, tiers) => {
    const base = pool.filter((e) => e.primary.includes(muscle) && !used.has(e.id));
    let cands = base.filter((e) => tiers.includes(e.tier));
    if (!cands.length) cands = base;
    // Machbarkeit: geschätzte Wiederholungen bzw. Startgewicht müssen zum Bereich passen (sonst Notnagel ohne Prüfung)
    const feasible = cands.filter((e) => isFeasibleFor(e, quickReps(e, style, profile)[0], profile, { barWeight: opts.barWeight ?? 20 }));
    // Nichts Machbares mehr: lieber keine zweite Übung für den Muskel als eine unmögliche.
    if (!feasible.length && picks.some((pk) => pk.muscle === muscle)) return null;
    if (feasible.length) cands = feasible;
    if (!beginner && cands.some((e) => !EASY.has(e.id))) cands = cands.filter((e) => !EASY.has(e.id));
    if (cands.some((e) => !usedPatterns.has(`${muscle}:${e.pattern}`))) cands = cands.filter((e) => !usedPatterns.has(`${muscle}:${e.pattern}`));
    if (!cands.length) return null;
    // Bessere Übungen (frühere Listenposition) wahrscheinlicher, aber mit Abwechslung
    cands.sort((a, b) => pool.indexOf(a) - pool.indexOf(b));
    const r = rnd();
    const idx = Math.min(cands.length - 1, r < 0.55 ? 0 : r < 0.85 ? 1 : 2);
    const ex = cands[idx];
    used.add(ex.id);
    usedPatterns.add(`${muscle}:${ex.pattern}`);
    return ex;
  };
  // Runde 1: je Muskel eine Grund-/Mehrgelenksübung; Runde 2: Isolation, bis maxEx erreicht.
  const rounds = [[1, 2], [3, 2, 1]];
  for (const tiers of rounds) {
    for (const m of muscles) {
      if (picks.length >= maxEx) break;
      const ex = pick(m, tiers);
      if (ex) picks.push({ ex, muscle: m });
    }
    if (picks.length >= maxEx) break;
  }
  if (!picks.length) return { tasks: [], minutes: 0, note: 'Mit dieser Ausrüstung und Auswahl finde ich keine Übungen – wähle mehr Ausrüstung oder einen anderen Fokus.' };

  // Reihenfolge: Grundübungen zuerst
  picks.sort((a, b) => a.ex.tier - b.ex.tier);

  const tasks = picks.map(({ ex, muscle }) => {
    const [repMin, repMax, rest] = quickReps(ex, style, profile);
    const weight = estimateStartWeight(ex, profile, repMin, rir, { barWeight: opts.barWeight ?? 20 });
    const reps = ex.bwReps ? estimateStartReps(ex, profile) : null;
    return { exId: ex.id, muscle, tier: ex.tier, sets, repMin, repMax, restSec: rest, rir, weight, estReps: reps, load: ex.load };
  });

  // Zeitbudget: erst Sätze auf 2 reduzieren, dann Übungen von hinten (Isolation) streichen
  const warm = minutes <= 20 ? 4 : 6;
  const total = () => warm + tasks.reduce((a, t) => a + setCost(t) * t.sets, 0);
  let guard = 0;
  while (total() > minutes + 1 && guard++ < 50) {
    // Zuerst bei Isolationsübungen kürzen, Grundübungen behalten ihre Sätze am längsten
    const cand = [...tasks].sort((a, b) => b.tier - a.tier || b.sets - a.sets)[0];
    if (cand && cand.sets > 2) cand.sets -= 1;
    else if (tasks.length > 2) tasks.pop();
    else break;
  }
  // Restzeit sinnvoll nutzen: Sätze bei Grundübungen auffüllen (max 5)
  guard = 0;
  while (guard++ < 20) {
    const cand = [...tasks].filter((t) => t.sets < 5).sort((a, b) => a.tier - b.tier || a.sets - b.sets)[0];
    if (!cand || total() + setCost(cand) > minutes + 1) break;
    cand.sets += 1;
  }
  return { tasks, minutes: Math.round(total()), style, intensity, rir, note: '' };
}

export function muscleName(id) {
  return MUSCLES.find((m) => m.id === id)?.short || id;
}

export function clampMinutes(m) {
  return clamp(Math.round(m / 5) * 5, 10, 120);
}

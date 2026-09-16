// Plangenerator: erstellt aus dem Profil einen Mesozyklus (Aufbauwochen + 1 Deload-Woche).
// Alle Regeln sind bewusst einfach, nachvollziehbar und evidenzbasiert (siehe README, Abschnitt „Wissenschaft“).
import { EXERCISES, primaryVolumeWeight } from '../data/exercises.js';
import { MUSCLES } from '../data/muscles.js';
import { MOBILITY } from '../data/mobility.js';
import { clamp, uid, toISODate } from './util.js';
import { buildCardioPlan } from './cardio.js';
import { healthFlags, healthNotes } from './health.js';

export const MESO_WEEKS = 5;
// Anfänger vertragen längere Aufbauphasen und brauchen seltener einen Deload (Bell et al. 2023): 6 + 1 statt 4 + 1.
export const MESO_WEEKS_BY_EXPERIENCE = { anfaenger: 7, fortgeschritten: 5, erfahren: 5 };

export function mesoWeeks(profile) {
  return MESO_WEEKS_BY_EXPERIENCE[profile?.experience] ?? MESO_WEEKS;
}

export const GOALS = {
  muskelaufbau: { name: 'Muskelaufbau', desc: 'Mehr Muskelmasse, leichter Kalorienüberschuss.' },
  fettabbau: { name: 'Fettabbau', desc: 'Körperfett reduzieren, Muskeln erhalten – Kaloriendefizit plus Cardio.' },
  kraft: { name: 'Kraft', desc: 'Stärker werden in den Grundübungen – schwere, niedrige Wiederholungen.' },
  ausdauer: { name: 'Ausdauer', desc: 'Kondition verbessern, Kraft als Ergänzung.' },
  fitness: { name: 'Allgemeine Fitness', desc: 'Gesund, beweglich und fit – ausgewogene Mischung.' },
};

export const EXPERIENCE = {
  anfaenger: { name: 'Anfänger', desc: 'Weniger als 1 Jahr regelmäßiges Krafttraining' },
  fortgeschritten: { name: 'Fortgeschritten', desc: '1–3 Jahre konsequentes Training' },
  erfahren: { name: 'Erfahren', desc: 'Mehr als 3 Jahre, Technik sitzt' },
};

// RIR (Reps in Reserve) pro Woche: früh locker, zum Ende nah ans Versagen, letzte Woche Deload.
export const RIR_SCHEDULE = {
  anfaenger: [3, 3, 3, 2, 2, 2, 4],
  fortgeschritten: [3, 2, 1, 1, 4],
  erfahren: [3, 2, 1, 0, 4],
};

// RIR-Verlauf für ein Profil. Bei positivem Gesundheits-Screening bleiben mindestens 2 in Reserve.
export function rirSchedule(profile) {
  const base = RIR_SCHEDULE[profile?.experience] || RIR_SCHEDULE.fortgeschritten;
  if (!healthFlags(profile).cautious) return base.slice();
  return base.map((r, i) => (i === base.length - 1 ? r : Math.max(r, 2)));
}

// Ziel-Satzzahl pro Woche und Muskel (harte Sätze, Nebenmuskeln zählen halb).
const BASE_TARGET = { anfaenger: 10, fortgeschritten: 14, erfahren: 16 };
const MUSCLE_FACTOR = { quadrizeps: 1, beinbeuger: 0.8, gesaess: 0.7, waden: 0.6, brust: 1, ruecken: 1.1, schultern: 0.9, bizeps: 0.6, trizeps: 0.6, bauch: 0.5 };
const GOAL_FACTOR = { muskelaufbau: 1, fettabbau: 0.9, kraft: 0.8, ausdauer: 0.7, fitness: 0.8 };

// Zeitkosten pro Satz inkl. Pause (Minuten).
const SET_MINUTES = { main: 3.5, 1: 2.75, 2: 2.25, 3: 1.6 };
const WARMUP_MINUTES = 8;

// Bevorzugte Übungen je Ziel (werden innerhalb der Kandidaten nach vorn gezogen).
const GOAL_PREFER = {
  kraft: { beinbeuger: ['kreuzheben', 'rdl_lh'], quadrizeps: ['kniebeuge_lh'], brust: ['bankdruecken_lh'], schultern: ['schulterdruecken_lh'] },
  default: { beinbeuger: ['rdl_lh', 'rdl_kh'] },
};

// Wenn ein Bewegungsmuster nicht verfügbar ist (z. B. kein vertikaler Zug ohne Klimmzugstange), erst das verwandte Muster nehmen.
const PATTERN_FALLBACK = { vpull: ['hpull'], hpull: ['vpull'], squat: ['lunge'], lunge: ['squat'], vpush: ['hpush'], hpush: ['vpush'] };

// Schwere Grundübungen, für die beim Kraftziel 3–5 Wiederholungen sinnvoll sind (nur Langhantel).
const HEAVY_PATTERNS = new Set(['squat', 'hpush', 'hinge', 'vpush']);
// Übungen, bei denen der letzte Versuch der technisch riskanteste ist: hier nie RIR 0.
const RIR_FLOOR_PATTERNS = new Set(['hinge', 'squat']);

// Direkte Mindestsätze pro Woche für Muskeln, die sonst nur über Nebenmuskel-Hälften „gefüllt“ werden.
const MIN_DIRECT_MUSCLES = ['bizeps', 'trizeps', 'waden', 'schultern'];

const T = (muscle, patterns, tiers, extra = {}) => ({ muscle, patterns, tiers, ...extra });
const REAR_DELT = ['face_pulls', 'reverse_flys_kh', 'band_pull_aparts'];

const GK_A = [
  T('quadrizeps', ['squat'], [1, 2], { main: true }),
  T('brust', ['hpush'], [1, 2], { main: true }),
  T('ruecken', ['hpull'], [1, 2]),
  T('beinbeuger', ['hinge'], [1, 2]),
  T('schultern', ['vpush'], [1, 2]),
  T('bizeps', ['iso'], [3], { optional: true }),
  T('trizeps', ['iso'], [3], { optional: true }),
  T('bauch', ['core'], [3], { optional: true }),
];
const GK_B = [
  T('beinbeuger', ['hinge'], [1, 2], { main: true }),
  T('ruecken', ['vpull'], [1, 2], { main: true }),
  T('brust', ['hpush'], [1, 2]),
  T('quadrizeps', ['lunge', 'squat'], [2, 1]),
  T('schultern', ['iso'], [3]),
  T('gesaess', ['hinge', 'iso'], [1, 2, 3], { optional: true }),
  T('trizeps', ['iso'], [3], { optional: true }),
  T('waden', ['iso'], [3], { optional: true }),
  T('bauch', ['core'], [3], { optional: true }),
];
const GK_C = [
  T('quadrizeps', ['squat'], [1, 2], { main: true }),
  T('brust', ['hpush'], [1, 2], { main: true }),
  T('ruecken', ['hpull', 'vpull'], [1, 2]),
  T('beinbeuger', ['iso', 'hinge'], [3, 2, 1]),
  T('schultern', ['vpush'], [1, 2]),
  T('bizeps', ['iso'], [3], { optional: true }),
  T('waden', ['iso'], [3], { optional: true }),
  T('bauch', ['core'], [3], { optional: true }),
];
const OK_A = [
  T('brust', ['hpush'], [1, 2], { main: true }),
  T('ruecken', ['hpull'], [1, 2], { main: true }),
  T('schultern', ['vpush'], [1, 2]),
  T('ruecken', ['vpull'], [1, 2]),
  T('schultern', ['iso'], [3]),
  T('brust', ['iso'], [3], { optional: true }),
  T('trizeps', ['iso'], [3], { optional: true }),
  T('bizeps', ['iso'], [3], { optional: true }),
];
const UK_A = [
  T('quadrizeps', ['squat'], [1, 2], { main: true }),
  T('beinbeuger', ['hinge'], [1, 2], { main: true }),
  T('quadrizeps', ['lunge'], [2], { optional: true }),
  T('beinbeuger', ['iso'], [3]),
  T('gesaess', ['hinge', 'iso'], [1, 2, 3], { optional: true }),
  T('waden', ['iso'], [3]),
  T('bauch', ['core'], [3], { optional: true }),
];
const OK_B = [
  T('ruecken', ['vpull'], [1, 2], { main: true }),
  T('brust', ['hpush'], [1, 2], { main: true }),
  T('schultern', ['vpush'], [1, 2]),
  T('ruecken', ['hpull'], [1, 2]),
  T('schultern', ['iso'], [3], { prefer: REAR_DELT }),
  T('brust', ['iso'], [3], { optional: true }),
  T('bizeps', ['iso'], [3]),
  T('trizeps', ['iso'], [3]),
];
const UK_B = [
  T('beinbeuger', ['hinge'], [1, 2], { main: true }),
  T('quadrizeps', ['squat'], [1, 2], { main: true }),
  T('gesaess', ['hinge', 'iso'], [1, 2, 3]),
  T('quadrizeps', ['iso'], [3], { optional: true }),
  T('beinbeuger', ['iso'], [3], { optional: true }),
  T('waden', ['iso'], [3]),
  T('bauch', ['core'], [3], { optional: true }),
];
const PUSH = [
  T('brust', ['hpush'], [1, 2], { main: true }),
  T('schultern', ['vpush'], [1, 2], { main: true }),
  T('brust', ['hpush'], [1, 2]),
  T('schultern', ['iso'], [3]),
  T('brust', ['iso'], [3], { optional: true }),
  T('trizeps', ['iso'], [3]),
  T('trizeps', ['iso'], [3], { optional: true }),
];
const PULL = [
  T('ruecken', ['vpull'], [1, 2], { main: true }),
  T('ruecken', ['hpull'], [1, 2], { main: true }),
  T('ruecken', ['hpull', 'vpull'], [1, 2]),
  T('schultern', ['iso'], [3], { prefer: REAR_DELT }),
  T('bizeps', ['iso'], [3]),
  T('bizeps', ['iso'], [3], { optional: true }),
  T('bauch', ['core'], [3], { optional: true }),
];
const LEGS = [
  T('quadrizeps', ['squat'], [1, 2], { main: true }),
  T('beinbeuger', ['hinge'], [1, 2], { main: true }),
  T('quadrizeps', ['lunge', 'squat'], [2, 1]),
  T('beinbeuger', ['iso'], [3]),
  T('gesaess', ['hinge', 'iso'], [1, 2, 3], { optional: true }),
  T('waden', ['iso'], [3]),
  T('bauch', ['core'], [3], { optional: true }),
];

export const SPLITS = {
  2: { id: 'ganzkoerper', name: 'Ganzkörper 2×', days: [['Ganzkörper A', GK_A], ['Ganzkörper B', GK_B]] },
  3: { id: 'ganzkoerper', name: 'Ganzkörper 3×', days: [['Ganzkörper A', GK_A], ['Ganzkörper B', GK_B], ['Ganzkörper C', GK_C]] },
  4: { id: 'oberunter', name: 'Oberkörper / Unterkörper', days: [['Oberkörper A', OK_A], ['Unterkörper A', UK_A], ['Oberkörper B', OK_B], ['Unterkörper B', UK_B]] },
  5: { id: 'ok_uk_ppl', name: 'Ober/Unter + Push/Pull/Beine', days: [['Oberkörper', OK_A], ['Unterkörper', UK_A], ['Push', PUSH], ['Pull', PULL], ['Beine', LEGS]] },
  6: { id: 'ppl', name: 'Push / Pull / Beine 2×', days: [['Push A', PUSH], ['Pull A', PULL], ['Beine A', LEGS], ['Push B', PUSH], ['Pull B', PULL], ['Beine B', LEGS]] },
};

const DEFAULT_WEEKDAYS = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 3, 4, 5], 6: [0, 1, 2, 3, 4, 5] };

// Tage, an denen der Unterkörper schwer trainiert wird (für die Cardio-Platzierung).
export function isLowerBodyDay(name) {
  return /Unterkörper|Beine|Ganzkörper/.test(name || '');
}

// ---------------------------------------------------------------- Verfügbarkeit
export function isAvailable(ex, profile) {
  const ctx = profile.equipment === 'gym' ? 'gym' : 'home';
  if (!ex.ctx.includes(ctx)) return false;
  if (ctx === 'home' && !ex.gear.every((g) => (profile.gear || []).includes(g))) return false;
  const lim = [...(profile.limitations || [])];
  if (healthFlags(profile).pregnant) lim.push('schwangerschaft');
  if (ex.contra.some((c) => lim.includes(c))) return false;
  return true;
}

export function availableExercises(profile) {
  return EXERCISES.filter((e) => isAvailable(e, profile));
}

// Alternativen für eine Übung (gleiche Hauptmuskeln, bevorzugt gleiches Bewegungsmuster).
export function alternativesFor(exId, profile) {
  const ex = EXERCISES.find((e) => e.id === exId);
  if (!ex) return [];
  const pool = availableExercises(profile).filter((e) => e.id !== exId);
  const same = pool.filter((e) => e.pattern === ex.pattern && e.primary.some((m) => ex.primary.includes(m)));
  const other = pool.filter((e) => !same.includes(e) && e.primary.some((m) => ex.primary.includes(m)));
  return [...same, ...other];
}

// ---------------------------------------------------------------- Machbarkeit
// Kann die Person die Übung im geplanten Wiederholungsbereich überhaupt ausführen?
// Körpergewicht: geschätzte Wiederholungen ≥ untere Grenze. Langhantel: rechnerisches Startgewicht ≥ Stange.
export function isFeasibleFor(ex, repMin, profile, opts = {}) {
  if (ex.bwReps && ex.load !== 'time') {
    const r = estimateStartReps(ex, profile);
    if (r != null && r < repMin) return false;
  }
  if (ex.bwReps && ex.load === 'time') {
    const r = estimateStartReps(ex, profile);
    if (r != null && r < repMin) return false;
  }
  if (ex.load === 'barbell' && ex.ratio) {
    const raw = rawStartWeight(ex, profile, repMin, 2);
    if (raw != null && raw < (opts.barWeight ?? 20)) return false;
  }
  return true;
}

export function isFeasible(ex, slot, profile, opts = {}) {
  return isFeasibleFor(ex, repRange(ex, slot, profile)[0], profile, opts);
}

// ---------------------------------------------------------------- Volumenziele
// Mehr Trainingstage erlauben etwas mehr Wochenvolumen (bessere Verteilung, bessere Erholung pro Einheit).
const FREQUENCY_FACTOR = { 2: 0.9, 3: 1, 4: 1.05, 5: 1.15, 6: 1.15 };

export function volumeTargets(profile) {
  const base = BASE_TARGET[profile.experience] ?? 12;
  const gf = (GOAL_FACTOR[profile.goal] ?? 1) * (FREQUENCY_FACTOR[clamp(profile.strengthDays || 3, 2, 6)] ?? 1);
  const prios = profile.priorities || [];
  const out = {};
  for (const m of MUSCLES) {
    let t = base * MUSCLE_FACTOR[m.id] * gf;
    if (prios.includes(m.id)) t = Math.max(t * 1.3, t + 3);
    else if (prios.length) t *= 0.85;
    t = Math.round(t);
    out[m.id] = { target: t, min: Math.max(2, Math.round(t * 0.7)), max: Math.round(t * 1.35) };
  }
  return out;
}

// Direkte Mindestsätze pro Woche (nur Übungen mit dem Muskel als Hauptmuskel; Schultern: nur Isolation).
export function minDirectSets(days) {
  return days >= 5 ? 6 : days >= 4 ? 4 : days === 3 ? 3 : 2;
}

// ---------------------------------------------------------------- Wiederholungen / Pausen
// Schwerer Hauptsatz beim Kraftziel: Langhantel-Grundübung, kein positives Gesundheits-Screening.
export function isHeavyMain(ex, slot, profile) {
  return profile.goal === 'kraft' && !!slot?.main && ex.tier === 1 && ex.load === 'barbell' && HEAVY_PATTERNS.has(ex.pattern) && !healthFlags(profile).cautious;
}

export function repRange(ex, slot, profile) {
  if (ex.reps) return ex.reps.slice();
  const goal = profile.goal;
  if (ex.load === 'time') return [30, 60];
  if (goal === 'kraft') {
    if (isHeavyMain(ex, slot, profile)) return [3, 5];
    if (ex.tier === 1) return [5, 8];
    if (ex.tier === 2) return [6, 10];
    return [8, 12];
  }
  if (goal === 'ausdauer') {
    if (ex.tier === 1) return [8, 12];
    if (ex.tier === 2) return [10, 15];
    return [12, 20];
  }
  if (profile.experience === 'anfaenger' && ex.tier === 1) return [8, 12];
  if (ex.tier === 1) return [6, 10];
  if (ex.tier === 2) return [8, 12];
  return [10, 15];
}

export function restSeconds(ex, slot, profile) {
  if (isHeavyMain(ex, slot, profile)) return 180;
  if (ex.tier === 1) return profile.experience === 'anfaenger' ? 120 : 150;
  if (ex.tier === 2) return 105;
  return 75;
}

function setMinutes(ex, slot, profile) {
  if (isHeavyMain(ex, slot, profile)) return SET_MINUTES.main;
  return SET_MINUTES[ex.tier];
}

// ---------------------------------------------------------------- Übungsauswahl
function pickExercise(slot, pool, used, usedInDay, rotation, profile, opts) {
  const prefer = [...(slot.prefer || []), ...((GOAL_PREFER[profile.goal] || GOAL_PREFER.default)[slot.muscle] || [])];
  const tierRank = (e) => {
    const i = slot.tiers.indexOf(e.tier);
    return i < 0 ? 9 : i;
  };
  const prefRank = (e) => {
    const i = prefer.indexOf(e.id);
    return i < 0 ? 99 : i;
  };
  const choose = (cands, viaSecondary) => {
    const sorted = [...cands].sort((a, b) => tierRank(a) - tierRank(b) || prefRank(a) - prefRank(b) || pool.indexOf(a) - pool.indexOf(b));
    // Rotation über Mesozyklen: innerhalb der besten Tier-Gruppe versetzt starten.
    // Beim Kraftziel bleiben die Hauptübungen fest – Kraft ist übungsspezifisch.
    const topRank = tierRank(sorted[0]);
    const top = sorted.filter((e) => tierRank(e) === topRank);
    const rest = sorted.filter((e) => tierRank(e) !== topRank);
    const r = profile.goal === 'kraft' && slot.main ? 0 : rotation % top.length;
    const rotated = [...top.slice(r), ...top.slice(0, r), ...rest];
    // Nie zweimal dieselbe Übung am selben Tag; über Nebenmuskeln nur ergänzen, wenn die Übung noch nicht im Plan ist.
    return rotated.find((e) => !used.has(e.id)) || (viaSecondary ? null : rotated.find((e) => !usedInDay.has(e.id)) || null);
  };
  const feasible = (list) => list.filter((e) => isFeasible(e, slot, profile, opts));
  const altPatterns = slot.patterns.flatMap((p) => PATTERN_FALLBACK[p] || []);
  const primaryPattern = pool.filter((e) => e.primary.includes(slot.muscle) && slot.patterns.includes(e.pattern));
  const primaryAlt = pool.filter((e) => e.primary.includes(slot.muscle) && altPatterns.includes(e.pattern));
  const primaryAny = pool.filter((e) => e.primary.includes(slot.muscle));
  const secondaryAny = pool.filter((e) => e.secondary.includes(slot.muscle));
  const stages = [
    [feasible(primaryPattern), false],
    [feasible(primaryAlt), false],
    [feasible(primaryAny), false],
    [feasible(secondaryAny), true],
  ];
  for (const [cands, viaSecondary] of stages) {
    if (!cands.length) continue;
    const ex = choose(cands, viaSecondary);
    if (ex) return ex;
  }
  // Notnagel: nichts ist machbar – dann die am wenigsten unmachbare Übung (geschätzte Wdh. im Verhältnis zur Untergrenze),
  // nicht die schwerste. Besser eine zu schwere Übung mit Hinweis als gar keine.
  const softness = (e) => {
    const r = estimateStartReps(e, profile);
    const [min] = repRange(e, slot, profile);
    return r != null && min ? r / min : 1;
  };
  for (const [cands, viaSecondary] of [[primaryPattern, false], [primaryAlt, false], [primaryAny, false], [secondaryAny, true]]) {
    const sorted = [...cands].sort((a, b) => softness(b) - softness(a) || pool.indexOf(a) - pool.indexOf(b));
    // Im Notfall darf eine Übung auch an einem zweiten Tag vorkommen – lieber die machbarere zweimal als eine unmögliche einmal.
    const ex = sorted.find((e) => !usedInDay.has(e.id) && (!viaSecondary || !used.has(e.id))) || null;
    if (ex) return ex;
  }
  return null;
}

// ---------------------------------------------------------------- Satzverteilung
function plannedVolume(days) {
  const vol = Object.fromEntries(MUSCLES.map((m) => [m.id, 0]));
  for (const d of days) {
    for (const pe of d.exercises) {
      const ex = pe.ex;
      for (const m of ex.primary) vol[m] += pe.sets * primaryVolumeWeight(ex, m);
      for (const m of ex.secondary) vol[m] += pe.sets * 0.5;
    }
  }
  return vol;
}

// Direkte Sätze: Übung gehört zum Slot des Muskels und hat ihn als Hauptmuskel; Schultern zählen nur Isolation.
function isDirect(pe, m) {
  return pe.slot.muscle === m && pe.ex.primary.includes(m) && (m !== 'schultern' || pe.ex.pattern === 'iso');
}

function directVolume(days, m) {
  let n = 0;
  for (const d of days) for (const pe of d.exercises) if (isDirect(pe, m)) n += pe.sets;
  return n;
}

function dayMinutes(day, profile) {
  return WARMUP_MINUTES + day.exercises.reduce((acc, pe) => acc + pe.sets * setMinutes(pe.ex, pe.slot, profile), 0);
}

function allocateSets(days, targets, profile) {
  const budget = profile.sessionMinutes;
  const notes = [];
  const maxSetsFor = (ex) => (profile.experience === 'anfaenger' ? 4 : ex.tier === 3 ? 4 : 5);
  // 1) Start: 2 Sätze pro Übung. Passt das nicht ins Zeitbudget, optionale Übungen streichen.
  for (const d of days) {
    for (const pe of d.exercises) pe.sets = 2;
    while (dayMinutes(d, profile) > budget && d.exercises.some((pe) => pe.slot.optional)) {
      const idx = d.exercises.map((pe) => pe.slot.optional).lastIndexOf(true);
      d.exercises.splice(idx, 1);
    }
    while (dayMinutes(d, profile) > budget && d.exercises.length > 3) d.exercises.pop();
  }
  // 2) Direkte Mindestsätze für Arme, Waden und Schulter-Isolation zuerst – Nebenmuskel-Hälften allein reichen nicht,
  //    und nach dem Greedy wäre das Zeitbudget dafür oft schon aufgebraucht.
  const minDirect = minDirectSets(days.length);
  for (const m of MIN_DIRECT_MUSCLES) {
    for (let guard = 0; guard < 20 && directVolume(days, m) < minDirect; guard++) {
      let cand = null;
      for (const d of days) {
        for (const pe of d.exercises) {
          if (!isDirect(pe, m) || pe.sets >= maxSetsFor(pe.ex)) continue;
          if (dayMinutes(d, profile) + setMinutes(pe.ex, pe.slot, profile) > budget + 0.5) continue;
          if (!cand || pe.sets < cand.sets) cand = pe;
        }
      }
      if (!cand) break;
      cand.sets += 1;
    }
  }
  // 3) Greedy: Sätze dort ergänzen, wo der Muskel am weitesten unter dem Ziel liegt.
  for (let guard = 0; guard < 400; guard++) {
    const vol = plannedVolume(days);
    let best = null;
    for (const d of days) {
      if (dayMinutes(d, profile) >= budget) continue;
      for (const pe of d.exercises) {
        if (pe.sets >= maxSetsFor(pe.ex)) continue;
        if (dayMinutes(d, profile) + setMinutes(pe.ex, pe.slot, profile) > budget + 0.5) continue;
        const m = pe.slot.muscle;
        const deficit = targets[m].target - vol[m];
        if (deficit <= 0) continue;
        // Grundübungen zuerst auffüllen; Überschreitung des Maximums bei einem Hauptmuskel vermeiden.
        const overflow = ex_overflow(pe.ex, vol, targets);
        const tierBonus = pe.ex.tier === 1 ? 1.5 : pe.ex.tier === 2 ? 0.75 : 0;
        const score = deficit + tierBonus - overflow;
        if (!best || score > best.score) best = { pe, score };
      }
    }
    if (!best) break;
    best.pe.sets += 1;
  }
  const vol = plannedVolume(days);
  const low = MUSCLES.filter((m) => vol[m.id] < targets[m.id].min).map((m) => m.name);
  if (low.length) notes.push(`Zeitbudget knapp: ${low.join(', ')} liegen unter dem Minimum. Längere Einheiten oder ein zusätzlicher Trainingstag würden helfen.`);
  return notes;
}

// Entfernt pro Durchlauf eine optionale 2-Satz-Übung, deren Muskel auch ohne sie mindestens auf Zielniveau bleibt.
function consolidate(days, targets) {
  const vol = plannedVolume(days);
  for (const d of days) {
    for (let i = d.exercises.length - 1; i >= 0; i--) {
      const pe = d.exercises[i];
      if (!pe.slot.optional || pe.sets > 2 || d.exercises.length <= 4) continue;
      const m = pe.slot.muscle;
      const sameMuscleElsewhere = days.some((x) => x.exercises.some((y) => y !== pe && y.slot.muscle === m));
      if (!sameMuscleElsewhere) continue;
      // Einzige direkte Übung eines Arm-/Waden-/Schultermuskels bleibt im Plan.
      if (MIN_DIRECT_MUSCLES.includes(m) && isDirect(pe, m) && directVolume(days, m) - pe.sets <= 0) continue;
      if (vol[m] - pe.sets >= targets[m].target - 0.5) {
        d.exercises.splice(i, 1);
        return true;
      }
    }
  }
  return false;
}

function ex_overflow(ex, vol, targets) {
  let o = 0;
  for (const m of ex.primary) if (vol[m] >= targets[m].max) o += 1;
  return o;
}

// ---------------------------------------------------------------- Mobilität
export function buildMobilityPlan(profile) {
  const lim = profile.limitations || [];
  const pick = (focus, n) => {
    const scored = MOBILITY.map((m) => ({ m, s: m.focus.filter((f) => focus.includes(f)).length + (m.focus.some((f) => lim.includes(f)) ? 2 : 0) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    return scored.slice(0, n).map((x) => x.m.id);
  };
  return {
    unterkoerper: pick(['squat', 'hinge', 'huefte', 'knie'], 6),
    oberkoerper: pick(['push', 'pull', 'schulter', 'handgelenk'], 6),
    ruhetag: pick(['allgemein', 'huefte', 'schulter', 'squat', 'push'], 7),
  };
}

// ---------------------------------------------------------------- Hauptfunktion
export function generatePlan(profile, opts = {}) {
  const mesoIndex = opts.mesoIndex ?? 0;
  const startDate = opts.startDate || toISODate();
  const feasOpts = { barWeight: opts.barWeight ?? 20 };
  const days = clamp(profile.strengthDays || 3, 2, 6);
  const split = SPLITS[days];
  const pool = availableExercises(profile);
  const targets = volumeTargets(profile);
  const rotation = profile.experience === 'anfaenger' ? 0 : mesoIndex;
  const used = new Set();
  const notes = [];
  let vpullMissing = false;

  const planDays = split.days.map(([name, slots], i) => {
    const exercises = [];
    const usedInDay = new Set();
    for (const slot of slots) {
      const ex = pickExercise(slot, pool, used, usedInDay, rotation, profile, feasOpts);
      if (!ex) continue;
      if (slot.patterns.includes('vpull') && !slot.patterns.includes(ex.pattern)) vpullMissing = true;
      used.add(ex.id);
      usedInDay.add(ex.id);
      exercises.push({ ex, slot });
    }
    return { id: `d${i + 1}`, name, exercises };
  });

  // Sätze verteilen; danach Übungen mit nur 2 Sätzen streichen, wenn das Volumen auch ohne sie reicht,
  // und neu verteilen – so bekommt jede Übung genug Sätze für echte Progression.
  notes.push(...allocateSets(planDays, targets, profile));
  for (let round = 0; round < 6; round++) {
    if (!consolidate(planDays, targets)) break;
    notes.length = 0;
    notes.push(...allocateSets(planDays, targets, profile));
  }

  // Wochentage zuweisen
  const chosen = (profile.trainingWeekdays || []).slice().sort((a, b) => a - b);
  const weekdays = chosen.length === days ? chosen : DEFAULT_WEEKDAYS[days];

  const finalDays = planDays.map((d, i) => ({
    id: d.id,
    name: d.name,
    weekday: weekdays[i],
    exercises: d.exercises.map((pe) => {
      const [repMin, repMax] = repRange(pe.ex, pe.slot, profile);
      return {
        exId: pe.ex.id,
        muscle: pe.slot.muscle,
        main: !!pe.slot.main,
        optional: !!pe.slot.optional,
        tier: pe.ex.tier,
        sets: pe.sets,
        repMin,
        repMax,
        restSec: restSeconds(pe.ex, pe.slot, profile),
      };
    }),
    minutes: Math.round(dayMinutes(d, profile)),
  }));

  const vol = plannedVolume(planDays);
  const volume = {};
  for (const m of MUSCLES) volume[m.id] = { ...targets[m.id], planned: Math.round(vol[m.id] * 10) / 10 };

  if (pool.length < 20) notes.push('Mit sehr wenig Ausrüstung ist die Übungsauswahl klein – Progression läuft dann über Wiederholungen, Tempo und schwerere Varianten.');
  if (vpullMissing) notes.push('Für einen vertikalen Zug (Klimmzüge, Latzug) fehlt Klimmzugstange oder Band – der Rücken wird über Ruderbewegungen abgedeckt.');
  if (profile.limitations?.length) notes.push('Übungen, die deine angegebenen Beschwerden belasten könnten, wurden ausgelassen. Bei Schmerzen bitte ärztlich abklären.');
  notes.push(...healthNotes(profile));

  const weeks = mesoWeeks(profile);
  const strengthDays = finalDays.map((d) => ({ weekday: d.weekday, lower: isLowerBodyDay(d.name) }));

  return {
    id: uid(),
    createdAt: toISODate(),
    startDate,
    mesoIndex,
    weeks,
    deloadWeek: weeks,
    rir: rirSchedule(profile),
    goal: profile.goal,
    experience: profile.experience,
    split: { id: split.id, name: split.name },
    days: finalDays,
    volume,
    cardio: buildCardioPlan(profile, { weeks, strengthDays }),
    mobility: buildMobilityPlan(profile),
    muscleAdjust: {},
    notes,
  };
}

// Aktuelle Woche des Plans (1-basiert), abhängig vom Datum. Nach der letzten Woche bleibt es dort → neuer Mesozyklus fällig.
export function planWeek(plan, todayIso = toISODate()) {
  const diff = Math.floor((new Date(todayIso) - new Date(plan.startDate)) / (7 * 24 * 3600 * 1000));
  return clamp(diff + 1, 1, plan.weeks);
}

export function isMesoFinished(plan, todayIso = toISODate()) {
  const diff = Math.floor((new Date(todayIso) - new Date(plan.startDate)) / (7 * 24 * 3600 * 1000));
  return diff + 1 > plan.weeks;
}

// ---------------------------------------------------------------- Autoregulation
// muscleAdjust[m] ist ein Wochen-Satzdelta für den Muskel (RP-Prinzip: ±1–2 Sätze pro Muskel und Woche),
// das auf die Übungen des Muskels verteilt wird – bei Plus zuerst Hauptübungen, bei Minus zuerst Isolation.
export function muscleAdjustCap(plan, muscle) {
  const t = plan?.volume?.[muscle]?.target ?? 10;
  return Math.max(2, Math.round(t * 0.3));
}

export function adjustmentFor(plan, day, pe) {
  const adj = plan.muscleAdjust?.[pe.muscle] ?? 0;
  if (!adj) return plan.volumeAdjust?.[day?.id] ?? 0;
  const list = [];
  for (const d of plan.days) for (const x of d.exercises) if (x.muscle === pe.muscle) list.push({ dayId: d.id, x });
  if (!list.length) return 0;
  const rank = (o) => (o.x.main ? 0 : 10) + (o.x.tier ?? 2) + (o.x.optional ? 5 : 0);
  list.sort((a, b) => (adj > 0 ? rank(a) - rank(b) : rank(b) - rank(a)));
  const idx = list.findIndex((o) => o.dayId === day?.id && o.x.exId === pe.exId);
  if (idx < 0) return 0;
  const n = Math.abs(adj);
  const each = Math.floor(n / list.length);
  const extra = n % list.length;
  return Math.sign(adj) * (each + (idx < extra ? 1 : 0));
}

// Effektive Satzzahl für eine Übung in einer Woche (Deload + Autoregulation pro Muskel).
export function effectiveSets(plan, day, pe, week) {
  let sets = clamp(pe.sets + adjustmentFor(plan, day, pe), 1, 6);
  if (week === plan.deloadWeek) sets = Math.max(1, Math.ceil(sets / 2));
  return sets;
}

// Zeitbedarf einer Einheit in Minuten (mit effektiven Sätzen).
export function dayDuration(plan, day, week, profile) {
  let min = WARMUP_MINUTES;
  for (const pe of day.exercises) {
    const ex = EXERCISES.find((e) => e.id === pe.exId);
    if (!ex) continue;
    const cost = profile && isHeavyMain(ex, pe, profile) ? SET_MINUTES.main : SET_MINUTES[ex.tier];
    min += effectiveSets(plan, day, pe, week) * cost;
  }
  return Math.round(min);
}

// Kurzversion einer Einheit: Hauptübungen behalten, optionale zuerst streichen, dann Sätze kürzen, bis das Zeitbudget passt.
export function shortenDay(plan, day, week, minutes, profile) {
  const cost = (pe) => {
    const ex = EXERCISES.find((e) => e.id === pe.exId);
    return ex && profile && isHeavyMain(ex, pe, profile) ? SET_MINUTES.main : SET_MINUTES[ex?.tier || 3];
  };
  let list = day.exercises.map((pe) => ({ ...pe, sets: effectiveSets(plan, day, pe, week) }));
  const total = () => WARMUP_MINUTES + list.reduce((a, pe) => a + pe.sets * cost(pe), 0);
  // 1) optionale Übungen von hinten streichen
  while (total() > minutes && list.some((pe) => pe.optional) && list.length > 2) {
    const idx = list.map((pe) => pe.optional).lastIndexOf(true);
    list.splice(idx, 1);
  }
  // 2) Isolation streichen, dann Sätze reduzieren (nie unter 2 bei Hauptübungen, 1 sonst)
  while (total() > minutes && list.length > 2 && list.some((pe) => !pe.main && pe.tier === 3)) {
    const idx = list.map((pe) => !pe.main && pe.tier === 3).lastIndexOf(true);
    list.splice(idx, 1);
  }
  for (let guard = 0; guard < 60 && total() > minutes; guard++) {
    const cand = [...list].sort((a, b) => b.sets - a.sets || (a.main ? 1 : -1))[0];
    const floor = cand.main ? 2 : 1;
    if (!cand || cand.sets <= floor) {
      if (list.length > 2) list.pop();
      else break;
      continue;
    }
    cand.sets -= 1;
  }
  return { exercises: list, minutes: total() };
}

// ---------------------------------------------------------------- Startgewichte
// 1RM-Verhältnis zum Körpergewicht, skaliert nach Erfahrung, Geschlecht (getrennt Ober-/Unterkörper) und Alter.
const EXP_FACTOR = { anfaenger: 0.6, fortgeschritten: 1.0, erfahren: 1.3 };
const SEX_FACTOR = { m: { upper: 1.0, lower: 1.0 }, w: { upper: 0.55, lower: 0.75 }, d: { upper: 0.75, lower: 0.85 } };
const LOWER_MUSCLES = new Set(['quadrizeps', 'beinbeuger', 'gesaess', 'waden']);

function estimatedE1RM(ex, profile) {
  if (!ex.ratio) return null;
  const bw = clamp(profile.weightKg || 75, 45, 110);
  const region = ex.primary.some((m) => LOWER_MUSCLES.has(m)) ? 'lower' : 'upper';
  const sf = (SEX_FACTOR[profile.sex] || SEX_FACTOR.d)[region];
  let e1rm = ex.ratio * bw * (EXP_FACTOR[profile.experience] ?? 1) * sf;
  if (profile.age > 60) e1rm *= 0.75;
  else if (profile.age > 50) e1rm *= 0.85;
  else if (profile.age < 18) e1rm *= 0.8;
  return e1rm;
}

// Rechnerisches Startgewicht ohne Untergrenzen (für Machbarkeit und den Hinweis „unter Stangengewicht“).
export function rawStartWeight(ex, profile, reps, rir = 2) {
  if (!ex.ratio || ['bw', 'time', 'band'].includes(ex.load)) return null;
  const w = estimatedE1RM(ex, profile) / (1 + (reps + rir) / 30);
  const inc = ex.inc || 2.5;
  return Math.floor(w / inc) * inc;
}

export function estimateStartWeight(ex, profile, reps, rir = 2, settings = {}) {
  let w = rawStartWeight(ex, profile, reps, rir);
  if (w == null) return null;
  if (ex.load === 'barbell') w = Math.max(settings.barWeight ?? 20, w);
  if (ex.load === 'dumbbell' || ex.load === 'kettlebell') w = Math.max(2, w);
  return Math.round(w * 10) / 10;
}

export function estimateStartReps(ex, profile) {
  if (!ex.bwReps) return null;
  const i = { anfaenger: 0, fortgeschritten: 1, erfahren: 2 }[profile.experience] ?? 1;
  let r = ex.bwReps[i];
  if (profile.sex === 'w' && ex.load !== 'time') r = Math.max(1, Math.round(r * 0.7));
  return r;
}

// Aufwärmsätze für eine Arbeitslast. level: 'voll' (erste schwere Übung), 'kurz' (weitere Grundübung), null.
const FLOOR_PULLS = new Set(['kreuzheben', 'sumo_kreuzheben', 'kreuzheben_trap_bar', 'rack_pull']);
export function warmupSets(ex, weight, barWeight = 20, level = 'voll') {
  if (!weight || ['bw', 'time', 'band'].includes(ex.load)) return level === 'voll' && ex.load === 'bw' ? [{ weight: 0, reps: 5, note: 'leichte Variante' }] : [];
  const inc = ex.load === 'dumbbell' || ex.load === 'kettlebell' ? 1 : 2.5;
  const floorPull = FLOOR_PULLS.has(ex.id);
  // Beim Kreuzheben liegt die leere Stange zu tief – Aufwärmen beginnt mit Scheiben (ab 40 kg).
  const minW = floorPull ? Math.min(40, weight) : ex.load === 'barbell' ? barWeight : inc;
  const r = (x) => Math.max(minW, Math.round(x / inc) * inc);
  if (level === 'kurz') return [{ weight: r(weight * 0.6), reps: 5 }];
  const sets = [];
  if (ex.load === 'barbell' && !floorPull && weight > barWeight * 1.5) sets.push({ weight: barWeight, reps: 10, note: 'leere Stange' });
  if (floorPull && weight > 60) sets.push({ weight: r(weight * 0.4), reps: 8, note: 'locker, Technik' });
  if (weight >= 30) sets.push({ weight: r(weight * 0.5), reps: 6 });
  sets.push({ weight: r(weight * 0.7), reps: 4 });
  if (weight >= 60) sets.push({ weight: r(weight * 0.85), reps: 2 });
  return sets.filter((s, i, arr) => i === 0 || s.weight > arr[i - 1].weight);
}

// Welche Einheit steht an? Heutiger Plantag, sonst eine verpasste Einheit dieser Woche, sonst die nächste.
export function nextSession(plan, workouts, todayIso = toISODate()) {
  const wd = (new Date(todayIso).getDay() + 6) % 7;
  const weekStart = addDaysIso(todayIso, -wd);
  const doneIds = new Set(workouts.filter((w) => w.planId === plan.id && w.date >= weekStart && w.date <= todayIso).map((w) => w.dayId));
  const today = plan.days.find((d) => d.weekday === wd);
  if (today && !doneIds.has(today.id)) return { day: today, kind: 'heute' };
  // Verpasst = Plantag lag diese Woche vor heute, aber nicht vor dem Planstart.
  const missed = plan.days.find((d) => d.weekday != null && d.weekday < wd && !doneIds.has(d.id) && addDaysIso(weekStart, d.weekday) >= plan.startDate);
  if (missed) return { day: missed, kind: 'nachholen' };
  if (today) return { day: today, kind: 'erledigt' };
  for (let i = 1; i <= 7; i++) {
    const d = plan.days.find((x) => x.weekday === (wd + i) % 7);
    if (d) return { day: d, kind: 'naechste', inDays: i };
  }
  return { day: plan.days[0], kind: 'naechste', inDays: 1 };
}

function addDaysIso(iso, n) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function rirForWeek(plan, week) {
  return plan.rir[clamp(week, 1, plan.rir.length) - 1];
}

// RIR für eine konkrete Übung: bei schweren Langhantel-Hinge/Squat-Übungen nie unter 1 – dort ist der letzte Versuch
// der technisch riskanteste (Refalo et al. 2023, Robinson et al. 2024: für Kraft nicht nötig).
export function rirForExercise(plan, week, ex, base = rirForWeek(plan, week)) {
  if (ex && ex.tier === 1 && ex.load === 'barbell' && RIR_FLOOR_PATTERNS.has(ex.pattern)) return Math.max(base, 1);
  return base;
}

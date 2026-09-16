// Plangenerator: erstellt aus dem Profil einen Mesozyklus (4 Aufbauwochen + 1 Deload-Woche).
// Alle Regeln sind bewusst einfach, nachvollziehbar und evidenzbasiert (siehe README, Abschnitt „Wissenschaft“).
import { EXERCISES } from '../data/exercises.js';
import { MUSCLES } from '../data/muscles.js';
import { MOBILITY } from '../data/mobility.js';
import { clamp, uid, toISODate } from './util.js';
import { buildCardioPlan } from './cardio.js';

export const MESO_WEEKS = 5;

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

// RIR (Reps in Reserve) pro Woche: Woche 1 locker, Woche 4 nah ans Versagen, Woche 5 Deload.
export const RIR_SCHEDULE = {
  anfaenger: [3, 3, 2, 2, 4],
  fortgeschritten: [3, 2, 1, 1, 4],
  erfahren: [3, 2, 1, 0, 4],
};

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

// ---------------------------------------------------------------- Verfügbarkeit
export function isAvailable(ex, profile) {
  const ctx = profile.equipment === 'gym' ? 'gym' : 'home';
  if (!ex.ctx.includes(ctx)) return false;
  if (ctx === 'home' && !ex.gear.every((g) => (profile.gear || []).includes(g))) return false;
  if (ex.contra.some((c) => (profile.limitations || []).includes(c))) return false;
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

// ---------------------------------------------------------------- Volumenziele
// Mehr Trainingstage erlauben etwas mehr Wochenvolumen (bessere Verteilung, bessere Erholung pro Einheit).
const FREQUENCY_FACTOR = { 2: 0.9, 3: 1, 4: 1.05, 5: 1.15, 6: 1.25 };

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

// ---------------------------------------------------------------- Wiederholungen / Pausen
export function repRange(ex, slot, profile) {
  const goal = profile.goal;
  if (ex.load === 'time') return [30, 60];
  if (goal === 'kraft') {
    if (slot.main && ex.tier === 1 && ex.load !== 'bw') return [3, 5];
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
  if (profile.goal === 'kraft' && slot.main && ex.tier === 1) return 180;
  if (ex.tier === 1) return profile.experience === 'anfaenger' ? 120 : 150;
  if (ex.tier === 2) return 105;
  return 75;
}

function setMinutes(ex, slot, profile) {
  if (profile.goal === 'kraft' && slot.main && ex.tier === 1) return SET_MINUTES.main;
  return SET_MINUTES[ex.tier];
}

// ---------------------------------------------------------------- Übungsauswahl
function pickExercise(slot, pool, used, usedInDay, rotation, profile) {
  const prefer = [...(slot.prefer || []), ...((GOAL_PREFER[profile.goal] || GOAL_PREFER.default)[slot.muscle] || [])];
  let fallback = false;
  let cands = pool.filter((e) => e.primary.includes(slot.muscle) && slot.patterns.includes(e.pattern));
  if (!cands.length) cands = pool.filter((e) => e.primary.includes(slot.muscle));
  if (!cands.length) {
    cands = pool.filter((e) => e.secondary.includes(slot.muscle));
    fallback = true;
  }
  if (!cands.length) return null;
  const tierRank = (e) => {
    const i = slot.tiers.indexOf(e.tier);
    return i < 0 ? 9 : i;
  };
  const prefRank = (e) => {
    const i = prefer.indexOf(e.id);
    return i < 0 ? 99 : i;
  };
  cands.sort((a, b) => tierRank(a) - tierRank(b) || prefRank(a) - prefRank(b) || pool.indexOf(a) - pool.indexOf(b));
  // Rotation über Mesozyklen: innerhalb der besten Tier-Gruppe versetzt starten.
  const topRank = tierRank(cands[0]);
  const top = cands.filter((e) => tierRank(e) === topRank);
  const rest = cands.filter((e) => tierRank(e) !== topRank);
  const r = rotation % top.length;
  const rotated = [...top.slice(r), ...top.slice(0, r), ...rest];
  // Nie zweimal dieselbe Übung am selben Tag; über Nebenmuskeln nur ergänzen, wenn die Übung noch nicht im Plan ist.
  return rotated.find((e) => !used.has(e.id)) || (fallback ? null : rotated.find((e) => !usedInDay.has(e.id)) || null);
}

// ---------------------------------------------------------------- Satzverteilung
function plannedVolume(days) {
  const vol = Object.fromEntries(MUSCLES.map((m) => [m.id, 0]));
  for (const d of days) {
    for (const pe of d.exercises) {
      const ex = pe.ex;
      for (const m of ex.primary) vol[m] += pe.sets;
      for (const m of ex.secondary) vol[m] += pe.sets * 0.5;
    }
  }
  return vol;
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
  // 2) Greedy: Sätze dort ergänzen, wo der Muskel am weitesten unter dem Ziel liegt.
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
  const days = clamp(profile.strengthDays || 3, 2, 6);
  const split = SPLITS[days];
  const pool = availableExercises(profile);
  const targets = volumeTargets(profile);
  const rotation = profile.experience === 'anfaenger' ? 0 : mesoIndex;
  const used = new Set();
  const notes = [];

  const planDays = split.days.map(([name, slots], i) => {
    const exercises = [];
    const usedInDay = new Set();
    for (const slot of slots) {
      const ex = pickExercise(slot, pool, used, usedInDay, rotation, profile);
      if (!ex) continue;
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
  if (profile.limitations?.length) notes.push('Übungen, die deine angegebenen Beschwerden belasten könnten, wurden ausgelassen. Bei Schmerzen bitte ärztlich abklären.');

  return {
    id: uid(),
    createdAt: toISODate(),
    startDate,
    mesoIndex,
    weeks: MESO_WEEKS,
    deloadWeek: MESO_WEEKS,
    rir: RIR_SCHEDULE[profile.experience] || RIR_SCHEDULE.fortgeschritten,
    goal: profile.goal,
    experience: profile.experience,
    split: { id: split.id, name: split.name },
    days: finalDays,
    volume,
    cardio: buildCardioPlan(profile),
    mobility: buildMobilityPlan(profile),
    muscleAdjust: {},
    notes,
  };
}

// Aktuelle Woche des Plans (1-basiert), abhängig vom Datum. Nach Woche 5 bleibt es bei 5 → neuer Mesozyklus fällig.
export function planWeek(plan, todayIso = toISODate()) {
  const diff = Math.floor((new Date(todayIso) - new Date(plan.startDate)) / (7 * 24 * 3600 * 1000));
  return clamp(diff + 1, 1, plan.weeks);
}

export function isMesoFinished(plan, todayIso = toISODate()) {
  const diff = Math.floor((new Date(todayIso) - new Date(plan.startDate)) / (7 * 24 * 3600 * 1000));
  return diff + 1 > plan.weeks;
}

// Effektive Satzzahl für eine Übung in einer Woche (Deload + Autoregulation pro Muskel).
export function effectiveSets(plan, day, pe, week) {
  const adj = plan.muscleAdjust?.[pe.muscle] ?? plan.volumeAdjust?.[day.id] ?? 0;
  let sets = clamp(pe.sets + adj, 1, 6);
  if (week === plan.deloadWeek) sets = Math.max(1, Math.ceil(sets / 2));
  return sets;
}

// Zeitbedarf einer Einheit in Minuten (mit effektiven Sätzen).
export function dayDuration(plan, day, week, profile) {
  let min = WARMUP_MINUTES;
  for (const pe of day.exercises) {
    const ex = EXERCISES.find((e) => e.id === pe.exId);
    if (!ex) continue;
    const cost = profile?.goal === 'kraft' && pe.main && ex.tier === 1 ? SET_MINUTES.main : SET_MINUTES[ex.tier];
    min += effectiveSets(plan, day, pe, week) * cost;
  }
  return Math.round(min);
}

// Kurzversion einer Einheit: Hauptübungen behalten, optionale zuerst streichen, dann Sätze kürzen, bis das Zeitbudget passt.
export function shortenDay(plan, day, week, minutes, profile) {
  const cost = (pe) => {
    const ex = EXERCISES.find((e) => e.id === pe.exId);
    return profile?.goal === 'kraft' && pe.main && ex?.tier === 1 ? SET_MINUTES.main : SET_MINUTES[ex?.tier || 3];
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

// Startgewicht schätzen: 1RM-Verhältnis zum Körpergewicht, skaliert nach Erfahrung, Geschlecht und Alter.
const EXP_FACTOR = { anfaenger: 0.6, fortgeschritten: 1.0, erfahren: 1.3 };
const SEX_FACTOR = { m: 1.0, w: 0.65, d: 0.8 };
export function estimateStartWeight(ex, profile, reps, rir = 2, settings = {}) {
  if (!ex.ratio || ['bw', 'time', 'band'].includes(ex.load)) return null;
  const bw = clamp(profile.weightKg || 75, 45, 110);
  let e1rm = ex.ratio * bw * (EXP_FACTOR[profile.experience] ?? 1) * (SEX_FACTOR[profile.sex] ?? 0.8);
  if (profile.age > 60) e1rm *= 0.75;
  else if (profile.age > 50) e1rm *= 0.85;
  else if (profile.age < 18) e1rm *= 0.8;
  // Arbeitsgewicht für reps + rir Wiederholungen (Epley), konservativ abgerundet
  let w = e1rm / (1 + (reps + rir) / 30);
  const inc = ex.inc || 2.5;
  w = Math.floor(w / inc) * inc;
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
export function warmupSets(ex, weight, barWeight = 20, level = 'voll') {
  if (!weight || ['bw', 'time', 'band'].includes(ex.load)) return level === 'voll' && ex.load === 'bw' ? [{ weight: 0, reps: 5, note: 'leichte Variante' }] : [];
  const inc = ex.load === 'dumbbell' || ex.load === 'kettlebell' ? 1 : 2.5;
  const r = (x) => Math.max(ex.load === 'barbell' ? barWeight : inc, Math.round(x / inc) * inc);
  if (level === 'kurz') return [{ weight: r(weight * 0.6), reps: 5 }];
  const sets = [];
  if (ex.load === 'barbell' && weight > barWeight * 1.5) sets.push({ weight: barWeight, reps: 10, note: 'leere Stange' });
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

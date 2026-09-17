// Streaks und Abzeichen – berechnet aus den vorhandenen Daten, nichts wird doppelt gespeichert.
import { addDays, toISODate } from './util.js';
import { personalRecords, totalSets } from './analytics.js';
import { recordBoard } from './records.js';
import { routineActiveDays, activeRoutines, routineStreak, routineDayStatus } from './routines.js';
import { sessionWorkouts } from './quicklog.js';

// Tage mit irgendeiner Aktivität (Training, Cardio, Check-in, Ernährung, Gewicht).
export function activeDays(s) {
  const days = new Set();
  for (const w of s.workouts) days.add(w.date);
  for (const c of s.cardioLogs) days.add(c.date);
  for (const c of s.checkins || []) days.add(c.date);
  for (const [d, list] of Object.entries(s.foodLog || {})) if (list.length) days.add(d);
  for (const b of s.bodyLogs) days.add(b.date);
  for (const d of routineActiveDays(s)) days.add(d);
  return days;
}

// Tages-Streak: aufeinanderfolgende aktive Tage bis heute (heute darf noch fehlen).
export function dailyStreak(s, today = toISODate()) {
  const days = activeDays(s);
  let streak = 0;
  let d = days.has(today) ? today : addDays(today, -1);
  while (days.has(d) && streak < 3650) {
    streak += 1;
    d = addDays(d, -1);
  }
  return streak;
}

import { getExercise } from '../data/exercises.js';
import { MUSCLES } from '../data/muscles.js';

const tonnage = (s) => s.workouts.reduce((a, w) => a + w.entries.reduce((b, e) => b + e.sets.reduce((c, x) => c + (x.weight || 0) * (x.reps || 0), 0), 0), 0);
const sets = (s) => s.workouts.reduce((a, w) => a + totalSets(w), 0);
const cardioMin = (s) => s.cardioLogs.reduce((a, c) => a + (c.minutes || 0), 0);
const cardioKm = (s) => s.cardioLogs.reduce((a, c) => a + (c.km || 0), 0);
const foodDays = (s) => Object.values(s.foodLog || {}).filter((l) => l.length >= 3).length;
const waterDays = (s) => Object.values(s.waterLog || {}).filter((ml) => ml >= 1500).length;
// Steigerungen der Bestleistung über die gesamte Historie (die allererste Leistung zählt nicht als Steigerung).
const prCount = (s, ctx) => ctx.board.improvements;
// Bestes Verhältnis e1RM zu Körpergewicht bei den klassischen Langhantel-Übungen.
const BIG_LIFTS = { bench: ['bankdruecken_lh'], squat: ['kniebeuge_lh', 'frontkniebeuge'], hinge: ['kreuzheben', 'sumo_kreuzheben', 'kreuzheben_trap_bar'] };
const bwRatio = (s, ctx, lift) => {
  const bw = s.profile?.weightKg;
  if (!bw) return 0;
  return Math.max(0, ...ctx.board.records.filter((r) => r.mode === 'kg' && BIG_LIFTS[lift].includes(r.exId)).map((r) => r.e1rm / bw));
};
const bestRankIdx = (ctx) => Math.max(-1, ...ctx.board.records.map((r) => r.rank?.idx ?? -1));
const distinctExercises = (s) => new Set(s.workouts.flatMap((w) => w.entries.map((e) => e.exId))).size;
const allMusclesInWeek = (s) => {
  const byWeek = {};
  for (const w of s.workouts) {
    const ws = addDays(w.date, -((new Date(w.date).getDay() + 6) % 7));
    byWeek[ws] ||= new Set();
    for (const e of w.entries) for (const m of getExercise(e.exId)?.primary || []) byWeek[ws].add(m);
  }
  return Object.values(byWeek).some((set) => MUSCLES.every((m) => set.has(m.id)));
};
const weekendWarrior = (s) => {
  const days = new Set(sessionWorkouts(s.workouts).map((w) => w.date));
  return [...days].some((d) => new Date(d).getDay() === 6 && days.has(addDays(d, 1)));
};
const comeback = (s) => {
  const dates = [...new Set(sessionWorkouts(s.workouts).map((w) => w.date))].sort();
  for (let i = 1; i < dates.length; i++) if ((new Date(dates[i]) - new Date(dates[i - 1])) / 86400000 >= 14) return true;
  return false;
};
const doubleDay = (s) => {
  const counts = {};
  for (const w of sessionWorkouts(s.workouts)) counts[w.date] = (counts[w.date] || 0) + 1;
  return Object.values(counts).some((c) => c >= 2);
};
const perfectDays = (s, ctx) => ctx.perfectDays;
const fullWeeks = (s, ctx) => ctx.fullWeeks;

export const BADGE_GROUPS = [
  ['training', 'Training'], ['kraft', 'Kraft & Volumen'], ['streak', 'Konstanz'], ['cardio', 'Ausdauer'], ['routine', 'Routine & Gewohnheiten'], ['alltag', 'Alltag & Erholung'], ['special', 'Besondere Momente'], ['level', 'Level'],
];

const B = (id, group, name, desc, icon, check) => ({ id, group, name, desc, icon, check });

export const BADGES = [
  // Training
  B('erstes_training', 'training', 'Erster Schritt', 'Erstes Training gespeichert', '🏁', (s) => sessionWorkouts(s.workouts).length >= 1),
  B('zehn_trainings', 'training', 'Zehn im Kasten', '10 Trainings', '🔟', (s) => sessionWorkouts(s.workouts).length >= 10),
  B('25_trainings', 'training', 'Viertelhundert', '25 Trainings', '🎯', (s) => sessionWorkouts(s.workouts).length >= 25),
  B('fuenfzig_trainings', 'training', 'Halbes Hundert', '50 Trainings', '🏋️', (s) => sessionWorkouts(s.workouts).length >= 50),
  B('hundert_trainings', 'training', 'Hundert', '100 Trainings', '💯', (s) => sessionWorkouts(s.workouts).length >= 100),
  B('250_trainings', 'training', 'Eisenroutine', '250 Trainings', '🛡️', (s) => sessionWorkouts(s.workouts).length >= 250),
  B('500_trainings', 'training', 'Unaufhaltsam', '500 Trainings', '👑', (s) => sessionWorkouts(s.workouts).length >= 500),
  B('meso_fertig', 'training', 'Block abgeschlossen', 'Ersten Mesozyklus beendet', '📦', (s) => (s.planHistory || []).length >= 1 && sessionWorkouts(s.workouts).length >= 8),
  B('meso_3', 'training', 'Drei Blöcke', 'Drei Mesozyklen beendet', '📚', (s) => (s.planHistory || []).length >= 3 && sessionWorkouts(s.workouts).length >= 24),
  B('quick_5', 'training', 'Improvisiert', '5 Schnelltrainings', '⚡', (s) => s.workouts.filter((w) => w.dayId === 'schnell').length >= 5),
  B('variety_25', 'training', 'Vielseitig', '25 verschiedene Übungen', '🧩', (s) => distinctExercises(s) >= 25),
  B('variety_60', 'training', 'Bewegungsbibliothek', '60 verschiedene Übungen', '📖', (s) => distinctExercises(s) >= 60),
  B('alle_muskeln', 'training', 'Ganzkörper', 'Alle 10 Muskelgruppen in einer Woche', '🫀', (s) => allMusclesInWeek(s)),
  // Kraft & Volumen
  B('erster_rekord', 'kraft', 'Neue Bestleistung', 'Erste persönliche Bestleistung', '🥇', (s) => sessionWorkouts(s.workouts).length >= 2 && personalRecords(s.workouts).length >= 1),
  B('pr_10', 'kraft', 'Rekordjäger', '10 Steigerungen der Bestleistung', '🏆', (s, ctx) => prCount(s, ctx) >= 10),
  B('pr_50', 'kraft', 'Stärker als gestern', '50 Steigerungen der Bestleistung', '🚀', (s, ctx) => prCount(s, ctx) >= 50),
  B('pr_day_3', 'kraft', 'Rekordtag', '3 Steigerungen in einem Training', '🎆', (s, ctx) => ctx.board.bestDay >= 3),
  B('pr_streak_4', 'kraft', 'Vier Wochen stärker', 'Rekord-Serie: 4 Wochen in Folge eine Steigerung', '🪜', (s, ctx) => ctx.board.streak.best >= 4),
  B('pr_streak_8', 'kraft', 'Acht Wochen stärker', 'Rekord-Serie: 8 Wochen in Folge eine Steigerung', '🧗', (s, ctx) => ctx.board.streak.best >= 8),
  B('rank_gold', 'kraft', 'Goldstandard', 'Gold-Rang in einer Übung', '🏵️', (s, ctx) => bestRankIdx(ctx) >= 2),
  B('rank_platin', 'kraft', 'Platin', 'Platin-Rang in einer Übung', '🔷', (s, ctx) => bestRankIdx(ctx) >= 3),
  B('rank_diamant', 'kraft', 'Diamant', 'Diamant-Rang in einer Übung', '💎', (s, ctx) => bestRankIdx(ctx) >= 4),
  B('kraft_gold', 'kraft', 'Rundum stark', 'Kraft-Rang Gold über alle Bewegungsmuster', '🦁', (s, ctx) => (ctx.board.overall?.idx ?? -1) >= 2),
  B('club_100', 'kraft', '100-kg-Club', 'Geschätztes 1RM von 100 kg in einer Übung', '💪', (s, ctx) => ctx.board.records.some((r) => r.mode === 'kg' && r.e1rm >= 100)),
  B('bw_bench', 'kraft', 'Körpergewicht gedrückt', 'Bankdrücken (Langhantel): e1RM mindestens dein Körpergewicht', '🎽', (s, ctx) => bwRatio(s, ctx, 'bench') >= 1),
  B('bw_squat', 'kraft', 'Anderthalbfach', 'Kniebeuge (Langhantel): e1RM 1,5× Körpergewicht', '🦵', (s, ctx) => bwRatio(s, ctx, 'squat') >= 1.5),
  B('bw_hinge', 'kraft', 'Doppelt so schwer', 'Kreuzheben: e1RM 2× Körpergewicht', '🐂', (s, ctx) => bwRatio(s, ctx, 'hinge') >= 2),
  B('hundert_saetze', 'kraft', '100 Sätze', '100 Arbeitssätze insgesamt', '🧱', (s) => sets(s) >= 100),
  B('tausend_saetze', 'kraft', '1000 Sätze', '1000 Arbeitssätze insgesamt', '🏗️', (s) => sets(s) >= 1000),
  B('5000_saetze', 'kraft', '5000 Sätze', '5000 Arbeitssätze insgesamt', '🏛️', (s) => sets(s) >= 5000),
  B('tonnage_10t', 'kraft', '10 Tonnen', '10.000 kg bewegt', '🚛', (s) => tonnage(s) >= 10000),
  B('tonnage_100t', 'kraft', '100 Tonnen', '100.000 kg bewegt', '🚚', (s) => tonnage(s) >= 100000),
  B('tonnage_500t', 'kraft', 'Halbe Million', '500.000 kg bewegt', '🚂', (s) => tonnage(s) >= 500000),
  B('tonnage_1000t', 'kraft', 'Eine Million', '1.000.000 kg bewegt', '🌍', (s) => tonnage(s) >= 1000000),
  // Konstanz
  B('streak_3', 'streak', 'Angefangen', '3 Tage in Folge aktiv', '✨', (s, ctx) => ctx.streak >= 3),
  B('streak_7', 'streak', 'Eine Woche dran', '7 Tage in Folge aktiv', '🔥', (s, ctx) => ctx.streak >= 7),
  B('streak_14', 'streak', 'Zwei Wochen', '14 Tage in Folge aktiv', '🔥', (s, ctx) => ctx.streak >= 14),
  B('streak_30', 'streak', 'Ein Monat dran', '30 Tage in Folge aktiv', '🌋', (s, ctx) => ctx.streak >= 30),
  B('streak_60', 'streak', 'Gewohnheit', '60 Tage in Folge aktiv', '💎', (s, ctx) => ctx.streak >= 60),
  B('streak_100', 'streak', 'Hundert Tage', '100 Tage in Folge aktiv', '🏔️', (s, ctx) => ctx.streak >= 100),
  B('perfect_1', 'streak', 'Perfekter Tag', 'Alle Tagesziele an einem Tag', '⭐', (s, ctx) => perfectDays(s, ctx) >= 1),
  B('perfect_7', 'streak', 'Perfekte Woche', '7 perfekte Tage', '🌟', (s, ctx) => perfectDays(s, ctx) >= 7),
  B('perfect_30', 'streak', 'Perfektionist', '30 perfekte Tage', '💫', (s, ctx) => perfectDays(s, ctx) >= 30),
  B('wochen_4', 'streak', 'Vier volle Wochen', '4 Wochen in Folge alle Einheiten', '📅', (s, ctx) => fullWeeks(s, ctx) >= 4),
  B('wochen_12', 'streak', 'Ein Quartal', '12 Wochen in Folge alle Einheiten', '🗓️', (s, ctx) => fullWeeks(s, ctx) >= 12),
  // Ausdauer
  B('cardio_1', 'cardio', 'Warmgelaufen', 'Erste Cardio-Einheit', '👟', (s) => s.cardioLogs.length >= 1),
  B('cardio_10', 'cardio', 'Ausdauer', '10 Cardio-Einheiten', '🏃', (s) => s.cardioLogs.length >= 10),
  B('cardio_50', 'cardio', 'Läufernatur', '50 Cardio-Einheiten', '🏃‍♂️', (s) => s.cardioLogs.length >= 50),
  B('cardio_600', 'cardio', 'Zehn Stunden', '600 Cardio-Minuten', '⏱️', (s) => cardioMin(s) >= 600),
  B('cardio_3000', 'cardio', 'Fünfzig Stunden', '3000 Cardio-Minuten', '⌛', (s) => cardioMin(s) >= 3000),
  B('km_100', 'cardio', 'Hundert Kilometer', '100 km erfasst', '🗺️', (s) => cardioKm(s) >= 100),
  B('km_1000', 'cardio', 'Tausend Kilometer', '1000 km erfasst', '🧭', (s) => cardioKm(s) >= 1000),
  // Alltag & Erholung
  B('checkin_7', 'alltag', 'Selbstkenntnis', '7 Check-ins', '🧭', (s) => (s.checkins || []).length >= 7),
  B('checkin_30', 'alltag', 'Achtsam', '30 Check-ins', '🧘', (s) => (s.checkins || []).length >= 30),
  B('checkin_100', 'alltag', 'Innenschau', '100 Check-ins', '🔮', (s) => (s.checkins || []).length >= 100),
  B('food_7', 'alltag', 'Ernährung im Blick', '7 Tage Ernährung erfasst', '🥗', (s) => foodDays(s) >= 7),
  B('food_30', 'alltag', 'Küchenmeister', '30 Tage Ernährung erfasst', '👨‍🍳', (s) => foodDays(s) >= 30),
  B('food_100', 'alltag', 'Ernährungsprofi', '100 Tage Ernährung erfasst', '🥇', (s) => foodDays(s) >= 100),
  B('water_7', 'alltag', 'Gut hydriert', '7 Tage 1,5 l getrunken', '💧', (s) => waterDays(s) >= 7),
  B('water_30', 'alltag', 'Wasserfall', '30 Tage 1,5 l getrunken', '🌊', (s) => waterDays(s) >= 30),
  B('gewicht_14', 'alltag', 'Trendwächter', '14 Gewichtseinträge', '⚖️', (s) => s.bodyLogs.length >= 14),
  B('gewicht_60', 'alltag', 'Datenfreund', '60 Gewichtseinträge', '📈', (s) => s.bodyLogs.length >= 60),
  B('mobility_10', 'alltag', 'Geschmeidig', '10 Mobilitäts-Routinen', '🤸', (s) => (s.mobilityLogs || []).length >= 10),
  B('mobility_50', 'alltag', 'Gummiband', '50 Mobilitäts-Routinen', '🧘‍♂️', (s) => (s.mobilityLogs || []).length >= 50),
  // Routine & Gewohnheiten
  B('routine_start', 'routine', 'Routine gestartet', 'Erste eigene Gewohnheit abgehakt', '🌱', (s, ctx) => ctx.routine.done >= 1),
  B('routine_50', 'routine', 'Fünfzig Haken', '50 Gewohnheiten abgehakt', '✅', (s, ctx) => ctx.routine.done >= 50),
  B('routine_250', 'routine', 'Alltagsheld', '250 Gewohnheiten abgehakt', '🧹', (s, ctx) => ctx.routine.done >= 250),
  B('routine_1000', 'routine', 'Tausend kleine Schritte', '1000 Gewohnheiten abgehakt', '🪜', (s, ctx) => ctx.routine.done >= 1000),
  B('routine_streak_7', 'routine', 'Eine Woche Routine', 'Eine Gewohnheit 7 Tage in Folge', '📿', (s, ctx) => ctx.routine.streak >= 7),
  B('routine_streak_30', 'routine', 'Gewohnheit verankert', 'Eine Gewohnheit 30 Tage in Folge', '⚓', (s, ctx) => ctx.routine.streak >= 30),
  B('routine_streak_66', 'routine', 'Automatisch', 'Eine Gewohnheit 66 Tage in Folge', '🧲', (s, ctx) => ctx.routine.streak >= 66),
  B('routine_perfect_1', 'routine', 'Routine komplett', 'Einen Tag die ganze Routine geschafft', '🗂️', (s, ctx) => ctx.routine.perfectDays >= 1),
  B('routine_perfect_10', 'routine', 'Zehn runde Tage', '10 Tage die ganze Routine geschafft', '🎛️', (s, ctx) => ctx.routine.perfectDays >= 10),
  B('routine_perfect_50', 'routine', 'Uhrwerk', '50 Tage die ganze Routine geschafft', '⏰', (s, ctx) => ctx.routine.perfectDays >= 50),
  B('routine_five', 'routine', 'Fünf Gewohnheiten', 'Fünf aktive Gewohnheiten in der Routine', '🖐️', (s) => activeRoutines(s).length >= 5),
  B('masse_5', 'alltag', 'Maßband', '5 Messungen der Körpermaße', '📏', (s) => (s.measurements || []).length >= 5),
  // Besondere Momente
  B('frueh', 'special', 'Frühaufsteher', 'Training vor 8 Uhr beendet', '🌅', (s) => sessionWorkouts(s.workouts).some((w) => w.finishedAt && new Date(w.finishedAt).getHours() < 8)),
  B('nachteule', 'special', 'Nachteule', 'Training nach 21 Uhr beendet', '🦉', (s) => sessionWorkouts(s.workouts).some((w) => w.finishedAt && new Date(w.finishedAt).getHours() >= 21)),
  B('wochenende', 'special', 'Wochenendkrieger', 'Samstag und Sonntag trainiert', '🛡️', (s) => weekendWarrior(s)),
  B('comeback', 'special', 'Comeback', 'Nach 2 Wochen Pause zurück', '🔁', (s) => comeback(s)),
  B('doppelschicht', 'special', 'Doppelschicht', 'Zwei Trainings an einem Tag', '⚡⚡', (s) => doubleDay(s)),
  B('leicht_ok', 'special', 'Klug gesteuert', 'Eine leichte Version trainiert statt auszulassen', '🧠', (s) => s.workouts.some((w) => w.mode === 'leicht')),
  B('challenge_1', 'special', 'Herausforderer', 'Erste Herausforderung geschafft', '🎖️', (s, ctx) => ctx.challengesDone >= 1),
  B('challenge_10', 'special', 'Serientäter', '10 Herausforderungen geschafft', '🏅', (s, ctx) => ctx.challengesDone >= 10),
  // Level
  B('level_5', 'level', 'Level 5', 'Dranbleiber erreicht', '5️⃣', (s, ctx) => ctx.level >= 5),
  B('level_10', 'level', 'Level 10', 'Zweistellig', '🔟', (s, ctx) => ctx.level >= 10),
  B('level_20', 'level', 'Level 20', 'Maschine erreicht', '🤖', (s, ctx) => ctx.level >= 20),
];

// Kontextwerte, die mehrere Abzeichen brauchen (einmal berechnet).
export function badgeContext(s, today = toISODate(), extra = {}) {
  const ctx = { streak: dailyStreak(s, today), perfectDays: 0, fullWeeks: 0, level: extra.level || 1, challengesDone: extra.challengesDone || 0, board: recordBoard(s, today), routine: routineContext(s, today) };
  if (extra.isPerfectDay) {
    const days = new Set([...s.workouts.map((w) => w.date), ...(s.checkins || []).map((c) => c.date), ...Object.keys(s.routineLog || {})]);
    ctx.perfectDays = [...days].filter((d) => extra.isPerfectDay(s, d)).length;
  }
  if (s.plan) {
    // Wochen in Folge (bis zur Vorwoche) mit allen geplanten Einheiten
    let ws = addDays(today, -((new Date(today).getDay() + 6) % 7) - 7);
    let n = 0;
    for (let i = 0; i < 60; i++) {
      const end = addDays(ws, 7);
      const done = new Set(s.workouts.filter((w) => w.date >= ws && w.date < end && w.dayId !== 'frei' && w.dayId !== 'schnell').map((w) => w.dayId));
      if (done.size >= s.plan.days.length && s.plan.days.length > 0) n += 1;
      else break;
      ws = addDays(ws, -7);
    }
    ctx.fullWeeks = n;
  }
  return ctx;
}

// Kennzahlen der Routine für die Abzeichen (einmal je Aufruf berechnet).
function routineContext(s, today) {
  const log = s.routineLog || {};
  const done = Object.values(log).reduce((a, l) => a + (l?.length || 0), 0);
  const streak = Math.max(0, ...activeRoutines(s).map((r) => routineStreak(s, r, today)), 0);
  const perfectDays = Object.keys(log).filter((d) => d <= today && routineDayStatus(s, d).all).length;
  return { done, streak, perfectDays };
}

export function badgeStatus(s, today = toISODate(), extra = {}) {
  const ctx = badgeContext(s, today, extra);
  return BADGES.map((b) => ({ ...b, earned: !!b.check(s, ctx) }));
}

// Zielgewicht: Fortschritt und Prognose.
export function goalProjection(profile, bodyLogs, trend) {
  const target = profile.targetWeightKg;
  if (!target) return null;
  const sorted = [...bodyLogs].sort((a, b) => (a.date < b.date ? -1 : 1));
  const start = profile.startWeightKg || sorted[0]?.weightKg || profile.weightKg;
  const current = trend?.current ?? sorted[sorted.length - 1]?.weightKg ?? profile.weightKg;
  const total = target - start;
  const done = current - start;
  const progress = total === 0 ? 1 : Math.max(0, Math.min(1, done / total));
  const remaining = target - current;
  let etaWeeks = null;
  if (trend && Math.abs(trend.perWeek) > 0.05 && Math.sign(trend.perWeek) === Math.sign(remaining)) etaWeeks = Math.round(Math.abs(remaining / trend.perWeek));
  const safe = Math.abs(remaining) < 0.3 ? 0 : Math.sign(remaining) * (remaining < 0 ? 0.0075 : 0.003) * current;
  const safeWeeks = safe ? Math.round(Math.abs(remaining / safe)) : 0;
  return { start, current: Math.round(current * 10) / 10, target, remaining: Math.round(remaining * 10) / 10, progress, etaWeeks, safeWeeks, targetDate: profile.targetDate || null };
}

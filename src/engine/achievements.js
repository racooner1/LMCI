// Streaks und Abzeichen – berechnet aus den vorhandenen Daten, nichts wird doppelt gespeichert.
import { addDays, toISODate } from './util.js';
import { personalRecords, totalSets } from './analytics.js';

// Tage mit irgendeiner Aktivität (Training, Cardio, Check-in, Ernährung, Gewicht).
export function activeDays(s) {
  const days = new Set();
  for (const w of s.workouts) days.add(w.date);
  for (const c of s.cardioLogs) days.add(c.date);
  for (const c of s.checkins || []) days.add(c.date);
  for (const [d, list] of Object.entries(s.foodLog || {})) if (list.length) days.add(d);
  for (const b of s.bodyLogs) days.add(b.date);
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

export const BADGES = [
  { id: 'erstes_training', name: 'Erster Schritt', desc: 'Erstes Training gespeichert', icon: '🏁', check: (s) => s.workouts.length >= 1 },
  { id: 'zehn_trainings', name: 'Zehn im Kasten', desc: '10 Trainings', icon: '🔟', check: (s) => s.workouts.length >= 10 },
  { id: 'fuenfzig_trainings', name: 'Halbes Hundert', desc: '50 Trainings', icon: '🏋️', check: (s) => s.workouts.length >= 50 },
  { id: 'hundert_trainings', name: 'Hundert', desc: '100 Trainings', icon: '💯', check: (s) => s.workouts.length >= 100 },
  { id: 'erster_rekord', name: 'Neue Bestleistung', desc: 'Erste persönliche Bestleistung', icon: '🥇', check: (s) => s.workouts.length >= 2 && personalRecords(s.workouts).length >= 1 },
  { id: 'tausend_saetze', name: '1000 Sätze', desc: '1000 Arbeitssätze insgesamt', icon: '🧱', check: (s) => s.workouts.reduce((a, w) => a + totalSets(w), 0) >= 1000 },
  { id: 'streak_7', name: 'Eine Woche dran', desc: '7 Tage in Folge aktiv', icon: '🔥', check: (s, ctx) => ctx.streak >= 7 },
  { id: 'streak_30', name: 'Ein Monat dran', desc: '30 Tage in Folge aktiv', icon: '🌋', check: (s, ctx) => ctx.streak >= 30 },
  { id: 'meso_fertig', name: 'Block abgeschlossen', desc: 'Ersten Mesozyklus beendet', icon: '📦', check: (s) => (s.planHistory || []).length >= 1 && s.workouts.length >= 8 },
  { id: 'cardio_10', name: 'Ausdauer', desc: '10 Cardio-Einheiten', icon: '🏃', check: (s) => s.cardioLogs.length >= 10 },
  { id: 'cardio_600', name: 'Zehn Stunden', desc: '600 Cardio-Minuten', icon: '⏱️', check: (s) => s.cardioLogs.reduce((a, c) => a + (c.minutes || 0), 0) >= 600 },
  { id: 'checkin_7', name: 'Selbstkenntnis', desc: '7 Check-ins', icon: '🧭', check: (s) => (s.checkins || []).length >= 7 },
  { id: 'food_7', name: 'Ernährung im Blick', desc: '7 Tage Ernährung erfasst', icon: '🥗', check: (s) => Object.values(s.foodLog || {}).filter((l) => l.length).length >= 7 },
  { id: 'gewicht_14', name: 'Trendwächter', desc: '14 Gewichtseinträge', icon: '⚖️', check: (s) => s.bodyLogs.length >= 14 },
  { id: 'frueh', name: 'Frühaufsteher', desc: 'Training vor 8 Uhr beendet', icon: '🌅', check: (s) => s.workouts.some((w) => w.finishedAt && new Date(w.finishedAt).getHours() < 8) },
  { id: 'tonnage_100t', name: '100 Tonnen', desc: '100.000 kg bewegt', icon: '🚚', check: (s) => s.workouts.reduce((a, w) => a + w.entries.reduce((b, e) => b + e.sets.reduce((c, x) => c + (x.weight || 0) * (x.reps || 0), 0), 0), 0) >= 100000 },
];

export function badgeStatus(s, today = toISODate()) {
  const ctx = { streak: dailyStreak(s, today) };
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

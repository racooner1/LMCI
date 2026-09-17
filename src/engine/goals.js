// Tagesziele und XP-Werte. Bewusst ohne Abhängigkeit zu Herausforderungen, damit keine Import-Zyklen entstehen.
import { toISODate } from './util.js';
import { nextSession } from './plan.js';
import { dayTotals } from './food.js';
import { routinesForDay, DAYPART_BY_ID } from './routines.js';
import { isQuickLog } from './quicklog.js';
import { XP } from './xp.js';

export { XP };

// Tagesziele für ein Datum. Rückgabe: [{ id, label, hint, xp, done, href, act?, optional?, routineId? }]
// Im Fokus „routine“ zählen nur die eigenen Gewohnheiten als Pflicht – Training und Ernährung werden optional.
export function dailyGoals(s, today = toISODate()) {
  const goals = [];
  const routineOnly = s.settings?.focus === 'routine';
  const plan = s.plan;
  // Ein Schnelleintrag (einzelne Sätze) ist Bewegung, ersetzt aber keine geplante Einheit.
  const workoutToday = s.workouts.some((w) => w.date === today && !isQuickLog(w));
  const quickToday = s.workouts.some((w) => w.date === today && isQuickLog(w));
  const cardioToday = s.cardioLogs.some((c) => c.date === today);
  const mobilityToday = (s.mobilityLogs || []).includes(today);
  const checkin = (s.checkins || []).some((c) => c.date === today);
  const food = dayTotals(s.foodLog?.[today] || []);
  const entries = (s.foodLog?.[today] || []).length;
  const water = s.waterLog?.[today] || 0;
  const weight = s.bodyLogs.some((b) => b.date === today);

  goals.push({ id: 'checkin', label: 'Check-in machen', hint: 'Schlaf, Stress, Energie', xp: XP.checkin, done: checkin, href: '#/heute', act: 'checkin', optional: routineOnly });
  const next = plan ? nextSession(plan, s.workouts, today) : null;
  if (next && (next.kind === 'heute' || next.kind === 'nachholen')) {
    goals.push({ id: 'training', label: `Training: ${next.day.name}`, hint: `${next.day.exercises.length} Übungen`, xp: XP.workoutBase, done: workoutToday, href: `#/workout/${next.day.id}`, optional: routineOnly });
  } else {
    goals.push({ id: 'bewegung', label: 'Bewegung heute', hint: 'Cardio, Mobilität, Schnelltraining oder ein paar Sätze', xp: XP.mobility, done: workoutToday || cardioToday || mobilityToday || quickToday, href: '#/schnell', optional: routineOnly });
  }
  goals.push({ id: 'food', label: 'Ernährung erfassen', hint: 'mindestens 3 Einträge', xp: XP.food, done: entries >= 3 || food.kcal >= 800, href: '#/ernaehrung', optional: routineOnly });
  goals.push({ id: 'water', label: 'Genug trinken', hint: '6 Gläser (1,5 l)', xp: XP.water, done: water >= 1500, href: '#/ernaehrung', optional: routineOnly });
  goals.push({ id: 'mobility', label: 'Mobilität', hint: '10 Minuten', xp: XP.mobility, done: mobilityToday, href: '#/heute', act: 'mobility', optional: routineOnly });
  goals.push({ id: 'weight', label: 'Wiegen', hint: 'morgens, nüchtern', xp: XP.weight, done: weight, href: '#/heute', act: 'weight', optional: true });
  // Eigene Gewohnheiten (Quests) als vollwertige Tagesziele.
  for (const r of routinesForDay(s, today)) {
    goals.push({
      id: `routine:${r.id}`,
      routineId: r.id,
      icon: r.icon,
      daypart: r.daypart,
      label: r.name,
      hint: r.weekTarget ? `${r.weekDone}/${r.weekTarget} diese Woche` : DAYPART_BY_ID[r.daypart]?.name || 'Routine',
      xp: r.xp,
      done: r.done,
      href: '#/routine',
      act: 'routine',
      optional: !r.counts,
    });
  }
  return goals;
}

export function isPerfectDay(s, date) {
  const g = dailyGoals(s, date).filter((x) => !x.optional);
  return g.length > 0 && g.every((x) => x.done);
}

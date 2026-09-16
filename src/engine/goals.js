// Tagesziele und XP-Werte. Bewusst ohne Abhängigkeit zu Herausforderungen, damit keine Import-Zyklen entstehen.
import { toISODate } from './util.js';
import { nextSession } from './plan.js';
import { dayTotals } from './food.js';

export const XP = { workoutBase: 50, perSet: 8, pr: 25, rankUp: 40, cardioPerMin: 2, checkin: 10, food: 15, water: 5, weight: 5, mobility: 15, perfectDay: 40 };

// Tagesziele für ein Datum. Rückgabe: [{ id, label, hint, xp, done, href, act?, optional? }]
export function dailyGoals(s, today = toISODate()) {
  const goals = [];
  const plan = s.plan;
  const workoutToday = s.workouts.some((w) => w.date === today);
  const cardioToday = s.cardioLogs.some((c) => c.date === today);
  const mobilityToday = (s.mobilityLogs || []).includes(today);
  const checkin = (s.checkins || []).some((c) => c.date === today);
  const food = dayTotals(s.foodLog?.[today] || []);
  const entries = (s.foodLog?.[today] || []).length;
  const water = s.waterLog?.[today] || 0;
  const weight = s.bodyLogs.some((b) => b.date === today);

  goals.push({ id: 'checkin', label: 'Check-in machen', hint: 'Schlaf, Stress, Energie', xp: XP.checkin, done: checkin, href: '#/heute', act: 'checkin' });
  const next = plan ? nextSession(plan, s.workouts, today) : null;
  if (next && (next.kind === 'heute' || next.kind === 'nachholen')) {
    goals.push({ id: 'training', label: `Training: ${next.day.name}`, hint: `${next.day.exercises.length} Übungen`, xp: XP.workoutBase, done: workoutToday, href: `#/workout/${next.day.id}` });
  } else {
    goals.push({ id: 'bewegung', label: 'Bewegung heute', hint: 'Cardio, Mobilität oder Schnelltraining', xp: XP.mobility, done: workoutToday || cardioToday || mobilityToday, href: '#/schnell' });
  }
  goals.push({ id: 'food', label: 'Ernährung erfassen', hint: 'mindestens 3 Einträge', xp: XP.food, done: entries >= 3 || food.kcal >= 800, href: '#/ernaehrung' });
  goals.push({ id: 'water', label: 'Genug trinken', hint: '6 Gläser (1,5 l)', xp: XP.water, done: water >= 1500, href: '#/ernaehrung' });
  goals.push({ id: 'mobility', label: 'Mobilität', hint: '10 Minuten', xp: XP.mobility, done: mobilityToday, href: '#/heute', act: 'mobility' });
  goals.push({ id: 'weight', label: 'Wiegen', hint: 'morgens, nüchtern', xp: XP.weight, done: weight, href: '#/heute', act: 'weight', optional: true });
  return goals;
}

export function isPerfectDay(s, date) {
  const g = dailyGoals(s, date).filter((x) => !x.optional);
  return g.length > 0 && g.every((x) => x.done);
}

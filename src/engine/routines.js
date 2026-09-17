// Routine & Quests: eigene Gewohnheiten (Zähne putzen, Lesen, Wasser trinken …) planen, abhaken und Serien zählen.
// Alles wird aus zwei Feldern im Zustand berechnet: `routines` (die Gewohnheiten) und `routineLog` (Datum → erledigte IDs).
import { toISODate, addDays, startOfWeek, weekdayIndex, uid, clamp, WEEKDAYS, WEEKDAYS_LONG } from './util.js';

export const DEFAULT_ROUTINE_XP = 10;
export const ROUTINE_XP_CHOICES = [5, 10, 15, 20, 30];
export const MAX_ROUTINES = 40;

// Tagesabschnitte – nur zur Gliederung, keine feste Uhrzeit.
export const DAYPARTS = [
  { id: 'morgen', name: 'Morgen', hint: 'Start in den Tag', icon: 'sun' },
  { id: 'tag', name: 'Tagsüber', hint: 'irgendwann am Tag', icon: 'list' },
  { id: 'abend', name: 'Abend', hint: 'Ausklang', icon: 'moon' },
];
export const DAYPART_BY_ID = Object.fromEntries(DAYPARTS.map((d) => [d.id, d]));

// Vorlagen für den schnellen Start. Frei anpassbar, nichts davon ist Pflicht.
export const ROUTINE_TEMPLATES = [
  { name: 'Zähne putzen (morgens)', icon: 'tooth', daypart: 'morgen', xp: 5 },
  { name: 'Glas Wasser nach dem Aufstehen', icon: 'drop', daypart: 'morgen', xp: 5 },
  { name: 'Bett machen', icon: 'bed', daypart: 'morgen', xp: 5 },
  { name: 'Vitamin D / Supplement', icon: 'pill', daypart: 'morgen', xp: 5 },
  { name: '10 Minuten Tageslicht', icon: 'sun', daypart: 'morgen', xp: 10 },
  { name: 'Kalt duschen', icon: 'drop', daypart: 'morgen', xp: 10 },
  { name: 'Proteinreiches Frühstück', icon: 'food', daypart: 'morgen', xp: 10 },
  { name: 'Spaziergang / 8.000 Schritte', icon: 'run', daypart: 'tag', xp: 15 },
  { name: 'Nacken & Rücken am Schreibtisch', icon: 'stretch', daypart: 'tag', xp: 5 },
  { name: '15 Minuten lernen', icon: 'book', daypart: 'tag', xp: 15 },
  { name: 'Bei Familie oder Freunden melden', icon: 'chat', daypart: 'tag', xp: 10, schedule: { type: 'times', times: 3 } },
  { name: 'Kein Zucker heute', icon: 'heart', daypart: 'tag', xp: 10 },
  { name: '20 Minuten lesen', icon: 'book', daypart: 'abend', xp: 10 },
  { name: 'Meditation / Atemübung', icon: 'leaf', daypart: 'abend', xp: 10 },
  { name: 'Tagebuch: 3 gute Dinge', icon: 'note', daypart: 'abend', xp: 10 },
  { name: 'Zähne putzen (abends)', icon: 'tooth', daypart: 'abend', xp: 5 },
  { name: '5 Minuten dehnen', icon: 'stretch', daypart: 'abend', xp: 10 },
  { name: '10 Minuten aufräumen', icon: 'home', daypart: 'abend', xp: 5 },
  { name: 'Handy weg, 1 h vor dem Schlafen', icon: 'phone', daypart: 'abend', xp: 10 },
  { name: 'Pünktlich ins Bett', icon: 'moon', daypart: 'abend', xp: 10 },
  { name: 'Woche planen', icon: 'calendar', daypart: 'abend', xp: 20, schedule: { type: 'weekdays', days: [6] } },
];

function normalizeSchedule(sc) {
  const type = ['daily', 'weekdays', 'times'].includes(sc?.type) ? sc.type : 'daily';
  if (type === 'weekdays') {
    const days = [...new Set((sc.days || []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b);
    return days.length ? { type: 'weekdays', days } : { type: 'daily' };
  }
  if (type === 'times') return { type: 'times', times: clamp(Math.round(Number(sc.times) || 3), 1, 7) };
  return { type: 'daily' };
}

// Eine Gewohnheit in einheitliche Form bringen (auch für importierte oder alte Daten).
export function makeRoutine(input = {}) {
  const xp = Number(input.xp);
  return {
    id: input.id || uid(),
    name: String(input.name || 'Neue Gewohnheit').trim().slice(0, 60) || 'Neue Gewohnheit',
    icon: input.icon || 'check',
    daypart: DAYPART_BY_ID[input.daypart] ? input.daypart : 'tag',
    xp: clamp(Number.isFinite(xp) && xp > 0 ? Math.round(xp) : DEFAULT_ROUTINE_XP, 1, 50),
    schedule: normalizeSchedule(input.schedule),
    reminder: /^\d{1,2}:\d{2}$/.test(input.reminder || '') ? input.reminder : null,
    counts: input.counts !== false,
    note: String(input.note || '').slice(0, 140),
    archived: !!input.archived,
    createdAt: input.createdAt || toISODate(),
  };
}

export function scheduleLabel(r) {
  const sc = r.schedule || { type: 'daily' };
  if (sc.type === 'times') return `${sc.times}× pro Woche`;
  if (sc.type === 'weekdays') {
    if (sc.days.length === 7) return 'täglich';
    if (sc.days.length === 5 && sc.days.every((d) => d < 5)) return 'Mo–Fr';
    if (sc.days.length === 2 && sc.days.includes(5) && sc.days.includes(6)) return 'Wochenende';
    if (sc.days.length === 1) return `jeden ${WEEKDAYS_LONG[sc.days[0]]}`;
    return sc.days.map((d) => WEEKDAYS[d]).join(', ');
  }
  return 'täglich';
}

export const activeRoutines = (s) => (s.routines || []).filter((r) => !r.archived);

export const routineById = (s, id) => (s.routines || []).find((r) => r.id === id) || null;

export const doneOn = (s, id, date) => (s.routineLog?.[date] || []).includes(id);

// Ist die Gewohnheit an diesem Tag laut Plan vorgesehen? (Vor dem Anlegen zählt sie nie.)
export function scheduledOn(r, date) {
  if (r.archived) return false;
  if (r.createdAt && date < r.createdAt) return false;
  const sc = r.schedule || { type: 'daily' };
  if (sc.type === 'weekdays') return sc.days.includes(weekdayIndex(date));
  return true;
}

// Erledigungen einer Woche (für „3× pro Woche“).
export function weekCount(s, r, date) {
  const ws = startOfWeek(date);
  let n = 0;
  for (let i = 0; i < 7; i++) if (doneOn(s, r.id, addDays(ws, i))) n += 1;
  return n;
}

// Alle Gewohnheiten eines Tages mit Status. `due` = heute offen oder erledigt, `open` = noch zu tun.
export function routinesForDay(s, date = toISODate()) {
  return activeRoutines(s)
    .filter((r) => scheduledOn(r, date))
    .map((r) => {
      const done = doneOn(s, r.id, date);
      const times = r.schedule?.type === 'times' ? r.schedule.times : 0;
      const wk = times ? weekCount(s, r, date) : 0;
      return { ...r, done, due: times ? done || wk < times : true, weekDone: wk, weekTarget: times };
    })
    .filter((r) => r.due)
    .sort((a, b) => DAYPARTS.findIndex((d) => d.id === a.daypart) - DAYPARTS.findIndex((d) => d.id === b.daypart));
}

// Tagesbilanz der Routine: wie viele der anstehenden Gewohnheiten sind erledigt?
export function routineDayStatus(s, date = toISODate()) {
  const items = routinesForDay(s, date);
  const done = items.filter((r) => r.done).length;
  return { items, done, total: items.length, all: items.length > 0 && done === items.length, progress: items.length ? done / items.length : 0 };
}

// Serie: aufeinanderfolgende geplante Tage (bzw. Wochen bei „x× pro Woche“) mit Erledigung.
export function routineStreak(s, r, today = toISODate()) {
  const sc = r.schedule || { type: 'daily' };
  if (sc.type === 'times') {
    let ws = startOfWeek(today);
    let n = 0;
    for (let i = 0; i < 260; i++) {
      if (weekCount(s, r, ws) >= sc.times) n += 1;
      else if (i > 0) break;
      ws = addDays(ws, -7);
      if (r.createdAt && ws < startOfWeek(r.createdAt)) break;
    }
    return n;
  }
  let d = today;
  if (scheduledOn(r, today) && !doneOn(s, r.id, today)) d = addDays(today, -1);
  let n = 0;
  for (let guard = 0; guard < 1100; guard++) {
    if (r.createdAt && d < r.createdAt) break;
    if (!scheduledOn(r, d)) {
      d = addDays(d, -1);
      continue;
    }
    if (!doneOn(s, r.id, d)) break;
    n += 1;
    d = addDays(d, -1);
  }
  return n;
}

// Quote der letzten `days` Tage (nur geplante Tage zählen).
export function routineRate(s, r, today = toISODate(), days = 30) {
  let planned = 0;
  let done = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i);
    if (!scheduledOn(r, d)) continue;
    planned += 1;
    if (doneOn(s, r.id, d)) done += 1;
  }
  return { planned, done, rate: planned ? done / planned : 0 };
}

export function routineStats(s, r, today = toISODate()) {
  const total = Object.entries(s.routineLog || {}).filter(([, list]) => list.includes(r.id)).length;
  return { total, streak: routineStreak(s, r, today), ...routineRate(s, r, today), xp: total * (r.xp || DEFAULT_ROUTINE_XP) };
}

// Tage, an denen mindestens eine Gewohnheit erledigt wurde (zählt für Streak und Abzeichen).
export function routineActiveDays(s) {
  return Object.entries(s.routineLog || {}).filter(([, list]) => Array.isArray(list) && list.length).map(([d]) => d);
}

// Erledigungen in einem Zeitraum (inklusive Grenzen).
export function routineCompletions(s, from, to) {
  let n = 0;
  for (const [d, list] of Object.entries(s.routineLog || {})) if (d >= from && d <= to) n += (list || []).length;
  return n;
}

// Tage im Zeitraum, an denen die komplette Routine erledigt wurde.
export function routinePerfectDays(s, from, to, today = toISODate()) {
  let n = 0;
  for (let d = from; d <= to && d <= today; d = addDays(d, 1)) if (routineDayStatus(s, d).all) n += 1;
  return n;
}

// Gesamt-XP aus der Routine. Gelöschte Gewohnheiten zählen mit einem Standardwert weiter.
export function routineXP(s) {
  const xpById = Object.fromEntries((s.routines || []).map((r) => [r.id, r.xp || DEFAULT_ROUTINE_XP]));
  let xp = 0;
  for (const list of Object.values(s.routineLog || {})) for (const id of list || []) xp += xpById[id] ?? DEFAULT_ROUTINE_XP;
  return xp;
}

// Abhaken / Haken entfernen. Wird innerhalb von store.update(...) aufgerufen.
export function toggleRoutine(st, id, date = toISODate()) {
  st.routineLog ||= {};
  const list = st.routineLog[date] || [];
  const has = list.includes(id);
  const next = has ? list.filter((x) => x !== id) : [...list, id];
  if (next.length) st.routineLog[date] = next;
  else delete st.routineLog[date];
  return !has;
}

// Fällige Erinnerungen für Gewohnheiten (nur solche mit Uhrzeit, heute geplant und noch offen).
export function routineRemindersDue(s, now = new Date()) {
  const today = toISODate(now);
  const fired = s.settings?.reminders?.routineFired || {};
  const minutes = now.getHours() * 60 + now.getMinutes();
  return routinesForDay(s, today).filter((r) => {
    if (!r.reminder || r.done || fired[r.id] === today) return false;
    const [hh, mm] = r.reminder.split(':').map(Number);
    return minutes >= hh * 60 + mm;
  });
}

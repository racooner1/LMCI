// Erinnerungen: lokale Benachrichtigung bei geöffneter App und Kalender-Export (.ics).
import { toISODate, weekdayIndex, addDays } from './util.js';

export function reminderDue(s, now = new Date()) {
  const r = s.settings?.reminders;
  if (!r?.enabled || !s.plan) return null;
  const today = toISODate(now);
  if (r.lastFired === today) return null;
  const [hh, mm] = (r.time || '18:00').split(':').map(Number);
  if (now.getHours() < hh || (now.getHours() === hh && now.getMinutes() < mm)) return null;
  const wd = weekdayIndex(today);
  const day = s.plan.days.find((d) => d.weekday === wd);
  if (!day) return null;
  if (s.workouts.some((w) => w.date === today)) return null;
  return { day, text: `Heute steht „${day.name}“ an – ${day.exercises.length} Übungen, ca. ${day.minutes} min.` };
}

export function startReminderLoop(store) {
  if (typeof window === 'undefined') return;
  const tick = () => {
    const s = store.get();
    const due = reminderDue(s);
    if (!due) return;
    store.update((st) => (st.settings.reminders.lastFired = toISODate()), { silent: true });
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const n = new Notification('LMCI – Training heute', { body: due.text, tag: 'lmci-training' });
        n.onclick = () => {
          window.focus();
          location.hash = `#/workout/${due.day.id}`;
        };
      }
    } catch { /* Benachrichtigungen nicht verfügbar */ }
  };
  tick();
  setInterval(tick, 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tick();
  });
}

// iCalendar-Export der Trainingstage für den laufenden Block.
export function buildICS(plan, { time = '18:00', durationMin = 60, weeks = 5, startDate = plan.startDate } = {}) {
  const [hh, mm] = time.split(':').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = (iso, h, m) => `${iso.replace(/-/g, '')}T${pad(h)}${pad(m)}00`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LMCI//Trainingsplan//DE', 'CALSCALE:GREGORIAN'];
  const first = addDays(startDate, -weekdayIndex(startDate));
  for (let w = 0; w < weeks; w++) {
    for (const d of plan.days) {
      if (d.weekday == null) continue;
      const iso = addDays(first, w * 7 + d.weekday);
      if (iso < startDate) continue;
      const endM = mm + durationMin;
      const endH = hh + Math.floor(endM / 60);
      const desc = d.exercises.map((pe) => pe.exId).join(', ');
      lines.push('BEGIN:VEVENT', `UID:lmci-${plan.id}-${d.id}-${iso}@lmci`, `DTSTAMP:${stamp(toISODate(), 0, 0)}Z`, `DTSTART:${stamp(iso, hh, mm)}`, `DTEND:${stamp(iso, endH, endM % 60)}`, `SUMMARY:LMCI: ${d.name}${w === weeks - 1 ? ' (Deload)' : ''}`, `DESCRIPTION:${desc}`, 'END:VEVENT');
    }
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

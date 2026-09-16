// Kleine Hilfsfunktionen ohne Abhängigkeiten – im Browser und in Node nutzbar.

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const round = (v, step = 1) => Math.round(v / step) * step;

export const sum = (arr) => arr.reduce((a, b) => a + b, 0);

export const avg = (arr) => (arr.length ? sum(arr) / arr.length : 0);

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// Deterministischer Zufall (Mulberry32), damit Pläne reproduzierbar sind.
export function seededRandom(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Datum ----
export const DAY_MS = 24 * 60 * 60 * 1000;

export function toISODate(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function daysBetween(isoA, isoB) {
  return Math.round((fromISODate(isoB) - fromISODate(isoA)) / DAY_MS);
}

// Montag = 0 … Sonntag = 6
export function weekdayIndex(iso) {
  const d = fromISODate(iso);
  return (d.getDay() + 6) % 7;
}

export function startOfWeek(iso) {
  return addDays(iso, -weekdayIndex(iso));
}

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const WEEKDAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

export function formatDate(iso, opts = {}) {
  const d = fromISODate(iso);
  const wd = WEEKDAYS[weekdayIndex(iso)];
  const s = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
  return opts.weekday === false ? s : `${wd} ${s}`;
}

// Epley-Formel: geschätztes 1RM aus Gewicht und Wiederholungen.
export function estimate1RM(weight, reps) {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// Umkehrung: Gewicht für n Wiederholungen bei gegebenem 1RM.
export function weightForReps(oneRM, reps) {
  return oneRM / (1 + reps / 30);
}

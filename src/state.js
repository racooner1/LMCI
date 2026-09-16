// Zentraler Zustand der App. Alles liegt lokal im Browser (localStorage) – kein Server, kein Konto.
import { toISODate } from './engine/util.js';

export const STORAGE_KEY = 'lmci.v1';
const SCHEMA = 1;

const EMPTY = () => ({
  schema: SCHEMA,
  profile: null,
  plan: null,
  planHistory: [],
  workouts: [],
  cardioLogs: [],
  bodyLogs: [],
  checkins: [],
  activeWorkout: null,
  settings: { barWeight: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25], restTimer: true, sound: true },
  meta: { createdAt: toISODate(), lastOpened: toISODate() },
});

let state = EMPTY();
const listeners = new Set();
let saveTimer = null;

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function load() {
  const raw = safeGet(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      state = migrate({ ...EMPTY(), ...parsed });
    } catch {
      state = EMPTY();
    }
  }
  state.meta.lastOpened = toISODate();
  return state;
}

function migrate(s) {
  if (!s.settings) s.settings = EMPTY().settings;
  if (!s.settings.plates) s.settings.plates = EMPTY().settings.plates;
  if (!Array.isArray(s.planHistory)) s.planHistory = [];
  if (!Array.isArray(s.cardioLogs)) s.cardioLogs = [];
  if (!Array.isArray(s.bodyLogs)) s.bodyLogs = [];
  if (!Array.isArray(s.workouts)) s.workouts = [];
  if (!Array.isArray(s.checkins)) s.checkins = [];
  if (s.plan && !s.plan.muscleAdjust) s.plan.muscleAdjust = {};
  for (const d of s.plan?.days || []) for (const pe of d.exercises) if (pe.tier == null) pe.tier = 1;
  s.schema = SCHEMA;
  return s;
}

export function get() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Änderungen immer über update(); speichert verzögert und benachrichtigt die UI.
export function update(mutator, { silent = false } = {}) {
  mutator(state);
  scheduleSave();
  if (!silent) for (const fn of listeners) fn(state);
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 150);
}

export function saveNow() {
  clearTimeout(saveTimer);
  return safeSet(STORAGE_KEY, JSON.stringify(state));
}

export function exportJSON() {
  return JSON.stringify({ app: 'LMCI', exportedAt: new Date().toISOString(), data: state }, null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  const data = parsed?.data && parsed.app === 'LMCI' ? parsed.data : parsed;
  if (!data || typeof data !== 'object' || !('profile' in data)) throw new Error('Das ist keine LMCI-Sicherung.');
  state = migrate({ ...EMPTY(), ...data });
  saveNow();
  for (const fn of listeners) fn(state);
}

export function resetAll() {
  state = EMPTY();
  saveNow();
  for (const fn of listeners) fn(state);
}

export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* ignorieren */
  }
  return false;
}

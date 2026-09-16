// Trainings-Logging: Sätze eintragen, Aufwärmsätze, Pausentimer, Kurz-/Leichtversion, Feedback, Autoregulation.
import { html, raw, esc, toast, openModal, closeModal, confirmDialog, num, fmtMin } from './dom.js';
import * as store from '../state.js';
import { planWeek, effectiveSets, rirForWeek, alternativesFor, shortenDay, warmupSets, availableExercises } from '../engine/plan.js';
import { suggestNext, muscleDeltasFromFeedback, plates, incrementFor } from '../engine/progression.js';
import { historyFor, newRecords, totalSets, totalTonnage } from '../engine/analytics.js';
import { readinessScore } from '../engine/recovery.js';
import { getExercise } from '../data/exercises.js';
import { MUSCLE_BY_ID } from '../data/muscles.js';
import { toISODate, uid, clamp } from '../engine/util.js';
import { openExerciseInfo } from './uebungen.js';
import { icon } from './icons.js';
import { figureForExercise } from './figure.js';
import { showCelebration, pop } from './celebrate.js';
import { totalXP, levelInfo, xpForWorkout, badgeExtra } from '../engine/gamification.js';
import { badgeStatus } from '../engine/achievements.js';

let timer = { end: 0, total: 0, handle: null };

export function renderWorkout(root, dayId) {
  const s = store.get();
  const { plan } = s;
  const free = dayId === 'frei' || dayId === 'schnell';
  const day = dayId === 'frei' ? { id: 'frei', name: 'Freies Training', exercises: [] } : dayId === 'schnell' ? { id: 'schnell', name: 'Schnelltraining', exercises: [] } : plan.days.find((d) => d.id === dayId);
  if (!day) {
    location.hash = '#/heute';
    return;
  }
  if (dayId === 'schnell' && (!s.activeWorkout || s.activeWorkout.dayId !== 'schnell')) {
    location.hash = '#/schnell';
    return;
  }
  if (!s.activeWorkout || s.activeWorkout.dayId !== dayId) {
    if (s.activeWorkout && s.activeWorkout.entries.some((e) => e.sets.some((x) => x.done))) {
      const runningName = s.activeWorkout.dayId === 'frei' ? 'Freies Training' : s.activeWorkout.dayId === 'schnell' ? 'Schnelltraining' : plan.days.find((d) => d.id === s.activeWorkout.dayId)?.name;
      confirmDialog(`Es läuft bereits „${runningName}“. Verwerfen und „${day.name}“ starten?`, { ok: 'Verwerfen & starten', danger: true }).then((ok) => {
        if (ok) {
          store.update((st) => (st.activeWorkout = buildWorkout(st, day)));
          renderWorkout(root, dayId);
        } else location.hash = `#/workout/${s.activeWorkout.dayId}`;
      });
      return;
    }
    store.update((st) => (st.activeWorkout = buildWorkout(st, day)), { silent: true });
  }
  const aw = store.get().activeWorkout;
  const week = aw.week;
  const rir = (dayId === 'schnell' ? aw.rir ?? 2 : rirForWeek(plan, week)) + (aw.mode === 'leicht' ? 1 : 0);
  const deload = dayId !== 'schnell' && week === plan.deloadWeek;
  const today = toISODate();
  const checkin = s.checkins.find((c) => c.date === today);
  const readiness = readinessScore(checkin);

  const allSets = aw.entries.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = aw.entries.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0);
  root.innerHTML = String(html`
    <section class="page workout">
      <div class="workout-progress"><div class="bar"><div id="wp-fill" style="width:${allSets ? ((doneSets / allSets) * 100).toFixed(0) : 0}%"></div></div><div class="meta"><span id="wp-text">Satz ${doneSets} von ${allSets}</span><span id="wp-xp">+${50 + doneSets * 8} XP bisher</span></div></div>
      <header class="page-head">
        <div><h1>${day.name}</h1><p class="muted">${free ? '' : `Woche ${week} · `}${rir} Wdh. in Reserve${deload ? ' · Deload' : ''}${aw.mode === 'leicht' ? ' · leichte Version' : ''}${aw.shortMinutes ? ` · Kurzversion ${aw.shortMinutes} min` : ''} · seit ${aw.startedAt.slice(11, 16)}</p></div>
        <button class="btn btn-small" data-act="abort">Abbrechen</button>
      </header>
      ${!free && !aw.entries.some((e) => e.sets.some((x) => x.done)) ? html`<div class="row gap wrap options">
        <button class="btn btn-small ${aw.shortMinutes ? 'active' : ''}" data-act="short">Wenig Zeit? Kurzversion</button>
        <button class="btn btn-small ${aw.mode === 'leicht' ? 'active' : ''}" data-act="light">${aw.mode === 'leicht' ? 'Normale Version' : 'Leichte Version'}</button>
        ${readiness && readiness.level === 'niedrig' && aw.mode !== 'leicht' ? html`<span class="muted small">Check-in: niedrige Bereitschaft – leichte Version empfohlen.</span>` : ''}
      </div>` : ''}
      <div class="note small">Aufwärmen: 5 min locker, dann die Aufwärmsätze der ersten Übung. Arbeitssätze abhaken – der Pausentimer startet automatisch.</div>
      ${aw.entries.map((e, ei) => renderEntry(e, ei, s, plan, rir, deload, aw.entries.length))}
      ${aw.entries.length === 0 ? html`<div class="card"><p class="muted">Noch keine Übung. Füge Übungen hinzu – Vorschläge und Historie kommen automatisch.</p></div>` : ''}
      <div class="row gap wrap">
        <button class="btn" data-act="add-ex">Übung hinzufügen</button>
        <button class="btn btn-primary btn-big" data-act="finish">Training abschließen</button>
      </div>
    </section>
    <div id="rest-bar" class="rest-bar" hidden>
      <div class="rest-fill"></div>
      <div class="rest-content"><span class="rest-label">Pause</span><span class="rest-time">0:00</span><button class="btn btn-small" data-act="rest-add">+30 s</button><button class="btn btn-small" data-act="rest-skip">Weiter</button></div>
    </div>`);

  bind(root, dayId);
  if (timer.end > Date.now()) tickRest();
}

function bind(root, dayId) {
  root.querySelectorAll('input[data-field]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const { ei, si, field } = inp.dataset;
      store.update((st) => {
        const set = st.activeWorkout.entries[ei].sets[si];
        set[field] = num(inp.value, null);
      }, { silent: true });
    });
  });
  root.querySelectorAll('select[data-field]').forEach((sel) => {
    sel.addEventListener('change', () => {
      const { ei, si } = sel.dataset;
      store.update((st) => (st.activeWorkout.entries[ei].sets[si].rir = sel.value === '' ? null : num(sel.value)), { silent: true });
    });
  });
  root.querySelectorAll('[data-act="done"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const { ei, si } = btn.dataset;
      let startRest = false;
      let ok = true;
      store.update((st) => {
        const e = st.activeWorkout.entries[ei];
        const set = e.sets[si];
        if (!set.done) {
          const row = btn.closest('.set-row');
          const w = row.querySelector('[data-field="weight"]');
          const r = row.querySelector('[data-field="reps"]');
          if (w && w.value === '' && w.placeholder) w.value = w.placeholder;
          if (r && r.value === '' && r.placeholder) r.value = r.placeholder;
          set.weight = w ? num(w.value, 0) : 0;
          set.reps = num(r.value, 0);
          if (!set.reps) {
            ok = false;
            return;
          }
          set.done = true;
          startRest = true;
        } else set.done = false;
      }, { silent: true });
      if (!ok) return toast('Bitte Wiederholungen eintragen.', 'warn');
      const set = store.get().activeWorkout.entries[ei].sets[si];
      btn.closest('.set-row').classList.toggle('done', !!set.done);
      btn.setAttribute('aria-pressed', String(!!set.done));
      if (set.done) pop(btn);
      const entries = store.get().activeWorkout.entries;
      const all = entries.reduce((a, e) => a + e.sets.length, 0);
      const done = entries.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0);
      const fill = document.getElementById('wp-fill');
      if (fill) fill.style.width = `${all ? (done / all) * 100 : 0}%`;
      const txt = document.getElementById('wp-text');
      if (txt) txt.textContent = `Satz ${done} von ${all}`;
      const xpEl = document.getElementById('wp-xp');
      if (xpEl) xpEl.textContent = `+${50 + done * 8} XP bisher`;
      const card = btn.closest('.ex-card');
      const e = entries[ei];
      card?.classList.toggle('complete', e.sets.every((x) => x.done));
      if (startRest && store.get().settings.restTimer) startRestTimer(store.get().activeWorkout.entries[ei].restSec);
    });
  });
  const rerender = () => renderWorkout(root, dayId);
  root.querySelectorAll('[data-act="add-set"]').forEach((b) => b.addEventListener('click', () => {
    store.update((st) => {
      const e = st.activeWorkout.entries[b.dataset.ei];
      const last = e.sets[e.sets.length - 1];
      e.sets.push({ weight: last?.weight ?? null, reps: null, rir: null, done: false });
    }, { silent: true });
    rerender();
  }));
  root.querySelectorAll('[data-act="remove-set"]').forEach((b) => b.addEventListener('click', () => {
    store.update((st) => {
      const e = st.activeWorkout.entries[b.dataset.ei];
      if (e.sets.length > 1) e.sets.pop();
    }, { silent: true });
    rerender();
  }));
  root.querySelectorAll('[data-act="move"]').forEach((b) => b.addEventListener('click', () => {
    const ei = Number(b.dataset.ei);
    const dir = Number(b.dataset.dir);
    store.update((st) => {
      const arr = st.activeWorkout.entries;
      const j = ei + dir;
      if (j < 0 || j >= arr.length) return;
      [arr[ei], arr[j]] = [arr[j], arr[ei]];
    }, { silent: true });
    rerender();
  }));
  root.querySelectorAll('[data-act="swap"]').forEach((b) => b.addEventListener('click', () => openSwap(root, dayId, Number(b.dataset.ei))));
  root.querySelectorAll('[data-act="remove-ex"]').forEach((b) => b.addEventListener('click', async () => {
    if (await confirmDialog('Übung aus diesem Training entfernen?')) {
      store.update((st) => st.activeWorkout.entries.splice(Number(b.dataset.ei), 1), { silent: true });
      rerender();
    }
  }));
  root.querySelectorAll('[data-act="plates"]').forEach((b) => b.addEventListener('click', () => openPlates(Number(b.dataset.ei))));
  root.querySelectorAll('[data-act="note"]').forEach((b) => b.addEventListener('click', () => openNote(root, dayId, Number(b.dataset.ei))));
  root.querySelectorAll('[data-act="info"]').forEach((b) => b.addEventListener('click', () => openExerciseInfo(b.dataset.ex)));
  root.querySelectorAll('[data-act="warmup-toggle"]').forEach((b) => b.addEventListener('click', () => {
    const box = b.closest('.ex-card').querySelector('.warmup-list');
    box.hidden = !box.hidden;
    b.textContent = box.hidden ? 'Aufwärmsätze anzeigen' : 'Aufwärmsätze ausblenden';
  }));
  root.querySelector('[data-act="add-ex"]').addEventListener('click', () => openAddExercise(root, dayId));
  root.querySelector('[data-act="short"]')?.addEventListener('click', () => openShort(root, dayId));
  root.querySelector('[data-act="light"]')?.addEventListener('click', () => {
    store.update((st) => {
      const aw = st.activeWorkout;
      const toLight = aw.mode !== 'leicht';
      aw.mode = toLight ? 'leicht' : 'normal';
      for (const e of aw.entries) {
        const target = Math.max(1, e.baseSets + (toLight ? -1 : 0));
        while (e.sets.length > target) e.sets.pop();
        while (e.sets.length < target) e.sets.push({ weight: e.sets[0]?.weight ?? null, reps: null, rir: null, done: false });
      }
    }, { silent: true });
    toast(store.get().activeWorkout.mode === 'leicht' ? 'Leichte Version: ein Satz weniger, eine Wiederholung mehr in Reserve.' : 'Normale Version.');
    rerender();
  });
  root.querySelector('[data-act="abort"]').addEventListener('click', async () => {
    if (await confirmDialog('Training abbrechen? Eingetragene Sätze gehen verloren.', { ok: 'Abbrechen & verwerfen', danger: true })) {
      stopRestTimer();
      store.update((st) => (st.activeWorkout = null));
      location.hash = '#/heute';
    }
  });
  root.querySelector('[data-act="finish"]').addEventListener('click', () => finishWorkout(root));
  root.querySelector('[data-act="rest-skip"]').addEventListener('click', stopRestTimer);
  root.querySelector('[data-act="rest-add"]').addEventListener('click', () => {
    timer.end += 30000;
    timer.total += 30000;
  });
}

function makeEntry(st, pe, sets, week, deload, rir, warmLevel) {
  const ex = getExercise(pe.exId);
  const sug = suggestNext(pe, historyFor(st.workouts, pe.exId), rir, deload, { profile: st.profile, settings: st.settings });
  return {
    exId: pe.exId,
    muscle: pe.muscle || ex.primary[0],
    repMin: pe.repMin,
    repMax: pe.repMax,
    restSec: pe.restSec,
    main: !!pe.main,
    baseSets: sets,
    suggestion: sug,
    warmup: warmLevel ? warmupSets(ex, sug.weight, st.settings.barWeight, warmLevel) : [],
    note: '',
    sets: Array.from({ length: sets }, () => ({ weight: sug.weight, reps: null, rir: null, done: false })),
  };
}

function buildWorkout(st, day) {
  const week = planWeek(st.plan);
  const deload = week === st.plan.deloadWeek;
  const rir = rirForWeek(st.plan, week);
  let firstHeavy = true;
  return {
    id: uid(),
    planId: st.plan.id,
    dayId: day.id,
    week,
    mode: 'normal',
    shortMinutes: null,
    date: toISODate(),
    startedAt: new Date().toISOString(),
    entries: day.exercises.map((pe) => {
      const ex = getExercise(pe.exId);
      let level = null;
      if (ex.tier === 1 && !deload) {
        level = firstHeavy ? 'voll' : 'kurz';
        firstHeavy = false;
      } else if (ex.tier === 1) level = 'kurz';
      return makeEntry(st, pe, effectiveSets(st.plan, day, pe, week), week, deload, rir, level);
    }),
  };
}

function renderEntry(e, ei, s, plan, rir, deload, count) {
  const ex = getExercise(e.exId);
  const loadable = !['bw', 'time', 'band'].includes(ex.load);
  const sug = e.suggestion || {};
  const unit = ex.load === 'time' ? 's' : 'Wdh.';
  const fig = figureForExercise(ex, { size: 62, cls: 'thumb' });
  return html`<div class="card ex-card" data-ei="${ei}">
    <div class="row between top">
      <div class="ex-thumb-row">
        ${fig ? html`<button class="fig-btn" type="button" data-act="info" data-ex="${ex.id}" aria-label="Ausführung ansehen">${raw(fig)}</button>` : ''}
        <div>
          <div class="ex-title">${ex.name}</div>
          <div class="muted small">${ex.primary.map((m) => MUSCLE_BY_ID[m].short).join(', ')} · Ziel ${e.sets.length} × ${e.repMin}–${e.repMax} ${unit} · ${rir} RIR · Pause ${Math.round(e.restSec / 60 * 10) / 10} min</div>
        </div>
      </div>
      <div class="ex-tools">
        <button class="btn-icon" data-act="move" data-ei="${ei}" data-dir="-1" title="Nach oben" aria-label="Nach oben" ${ei === 0 ? 'disabled' : ''}>${raw(icon('up', { size: 18 }))}</button>
        <button class="btn-icon" data-act="move" data-ei="${ei}" data-dir="1" title="Nach unten" aria-label="Nach unten" ${ei === count - 1 ? 'disabled' : ''}>${raw(icon('down', { size: 18 }))}</button>
        <button class="btn-icon" data-act="info" data-ex="${ex.id}" title="Info" aria-label="Übungsinfo">${raw(icon('info', { size: 18 }))}</button>
        ${ex.load === 'barbell' ? html`<button class="btn-icon" data-act="plates" data-ei="${ei}" title="Scheiben" aria-label="Scheibenrechner">${raw(icon('weight', { size: 18 }))}</button>` : ''}
        <button class="btn-icon" data-act="note" data-ei="${ei}" title="Notiz" aria-label="Notiz">${raw(icon('note', { size: 18 }))}</button>
        <button class="btn-icon" data-act="swap" data-ei="${ei}" title="Tauschen" aria-label="Übung tauschen">${raw(icon('swap', { size: 18 }))}</button>
        <button class="btn-icon" data-act="remove-ex" data-ei="${ei}" title="Entfernen" aria-label="Übung entfernen">${raw(icon('close', { size: 18 }))}</button>
      </div>
    </div>
    ${sug.note ? html`<div class="suggestion ${sug.kind}">${sug.estimated ? html`<span class="badge">Schätzung</span>` : ''}<span>${sug.note}</span>${sug.prev ? html`<span class="muted">Letztes Mal: ${sug.prev}</span>` : ''}</div>` : ''}
    ${e.warmup?.length ? html`<button class="link small muted" data-act="warmup-toggle">Aufwärmsätze anzeigen</button>
      <div class="warmup-list" hidden>${e.warmup.map((w, i) => html`<div class="warmup-row"><span>Aufwärmen ${i + 1}</span><span>${w.weight ? `${w.weight} kg × ${w.reps}` : `${w.reps} × ${w.note || 'leicht'}`}</span>${w.note && w.weight ? html`<span class="muted small">${w.note}</span>` : ''}</div>`)}</div>` : ''}
    ${e.note ? html`<div class="muted small">Notiz: ${e.note}</div>` : ''}
    <div class="set-table">
      <div class="set-head"><span>Satz</span>${loadable || ex.load === 'bw' ? html`<span>${ex.load === 'bw' ? '+kg' : 'kg'}</span>` : html`<span></span>`}<span>${unit}</span><span>RIR</span><span></span></div>
      ${e.sets.map((set, si) => html`<div class="set-row ${set.done ? 'done' : ''}">
        <span class="set-idx">${si + 1}</span>
        ${loadable || ex.load === 'bw'
          ? html`<input type="number" inputmode="decimal" step="${ex.load === 'bw' ? 1 : incrementFor(ex) >= 2.5 ? 2.5 : 0.5}" min="0" data-field="weight" data-ei="${ei}" data-si="${si}" value="${set.weight ?? ''}" placeholder="${sug.weight ?? ''}" aria-label="Gewicht Satz ${si + 1}">`
          : html`<span class="muted small">–</span>`}
        <input type="number" inputmode="numeric" min="0" data-field="reps" data-ei="${ei}" data-si="${si}" value="${set.reps ?? ''}" placeholder="${sug.reps ?? e.repMin}" aria-label="Wiederholungen Satz ${si + 1}">
        <select data-field="rir" data-ei="${ei}" data-si="${si}" aria-label="RIR Satz ${si + 1}"><option value="">–</option>${[0, 1, 2, 3, 4].map((r) => html`<option value="${r}" ${set.rir === r ? 'selected' : ''}>${r}${r === 4 ? '+' : ''}</option>`)}</select>
        <button class="set-done" data-act="done" data-ei="${ei}" data-si="${si}" aria-pressed="${!!set.done}" aria-label="Satz ${si + 1} abhaken">${raw(icon('check', { size: 22 }))}</button>
      </div>`)}
    </div>
    <div class="row gap-s"><button class="btn btn-small" data-act="add-set" data-ei="${ei}">+ Satz</button><button class="btn btn-small btn-ghost" data-act="remove-set" data-ei="${ei}">− Satz</button></div>
  </div>`;
}

// ---------------- Pausentimer
function startRestTimer(sec) {
  timer.end = Date.now() + sec * 1000;
  timer.total = sec * 1000;
  tickRest();
}

function tickRest() {
  clearInterval(timer.handle);
  const bar = document.getElementById('rest-bar');
  if (!bar) return;
  bar.hidden = false;
  const update = () => {
    const left = Math.max(0, timer.end - Date.now());
    bar.querySelector('.rest-time').textContent = fmtMin(Math.ceil(left / 1000));
    bar.querySelector('.rest-fill').style.width = `${(1 - left / timer.total) * 100}%`;
    if (left <= 0) {
      stopRestTimer();
      notifyRestDone();
    }
  };
  update();
  timer.handle = setInterval(update, 250);
}

function stopRestTimer() {
  clearInterval(timer.handle);
  timer.end = 0;
  const bar = document.getElementById('rest-bar');
  if (bar) bar.hidden = true;
}

function notifyRestDone() {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch { /* ignorieren */ }
  if (!store.get().settings.sound) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.value = 0.15;
    o.start();
    o.stop(ctx.currentTime + 0.35);
    setTimeout(() => ctx.close?.(), 600);
  } catch { /* kein Audio verfügbar */ }
}

// ---------------- Dialoge
function openShort(root, dayId) {
  const m = openModal(
    `<p class="small">Wie viel Zeit hast du? Hauptübungen bleiben, optionale Übungen und Sätze werden gekürzt.</p>
     <div class="row gap wrap">${[20, 30, 45].map((n) => `<button class="btn" data-min="${n}">${n} min</button>`).join('')}<button class="btn btn-ghost" data-min="0">Volle Einheit</button></div>`,
    { title: 'Kurzversion' },
  );
  m.querySelectorAll('[data-min]').forEach((b) => b.addEventListener('click', () => {
    const minutes = Number(b.dataset.min);
    store.update((st) => {
      const day = st.plan.days.find((d) => d.id === dayId);
      const aw = st.activeWorkout;
      const week = aw.week;
      const deload = week === st.plan.deloadWeek;
      const rir = rirForWeek(st.plan, week) + (aw.mode === 'leicht' ? 1 : 0);
      let list;
      if (minutes) {
        list = shortenDay(st.plan, day, week, minutes, st.profile).exercises;
        aw.shortMinutes = minutes;
      } else {
        list = day.exercises.map((pe) => ({ ...pe, sets: effectiveSets(st.plan, day, pe, week) }));
        aw.shortMinutes = null;
      }
      let firstHeavy = true;
      aw.entries = list.map((pe) => {
        const ex = getExercise(pe.exId);
        let level = null;
        if (ex.tier === 1) {
          level = firstHeavy && !deload ? 'voll' : 'kurz';
          firstHeavy = false;
        }
        // Kurzversion ist bereits reduziert – „leicht“ senkt dann nur noch die Intensität (RIR), nicht die Sätze.
        const sets = Math.max(1, pe.sets - (aw.mode === 'leicht' && !minutes ? 1 : 0));
        return makeEntry(st, pe, sets, week, deload, rir, level);
      });
    }, { silent: true });
    closeModal();
    renderWorkout(root, dayId);
  }));
}

function openSwap(root, dayId, ei) {
  const s = store.get();
  const e = s.activeWorkout.entries[ei];
  const m = openExerciseInfo(e.exId, {
    pickLabel: 'Tauschen gegen',
    onPick: (newId) => {
      const perm = m.querySelector('#swap-perm')?.checked;
      store.update((st) => {
        const entry = st.activeWorkout.entries[ei];
        const week = st.activeWorkout.week;
        const pe = { exId: newId, repMin: entry.repMin, repMax: entry.repMax };
        entry.exId = newId;
        entry.suggestion = suggestNext(pe, historyFor(st.workouts, newId), rirForWeek(st.plan, week), week === st.plan.deloadWeek, { profile: st.profile, settings: st.settings });
        entry.warmup = entry.warmup?.length ? warmupSets(getExercise(newId), entry.suggestion.weight, st.settings.barWeight, 'kurz') : [];
        entry.sets = entry.sets.map((x) => ({ ...x, weight: x.done ? x.weight : entry.suggestion.weight }));
        if (perm && !free) {
          const d = st.plan.days.find((x) => x.id === dayId);
          const ppe = d?.exercises.find((x) => x.exId === e.exId);
          if (ppe) ppe.exId = newId;
        }
      }, { silent: true });
      closeModal();
      renderWorkout(root, dayId);
    },
  });
  if (m && dayId !== 'frei' && dayId !== 'schnell') {
    const box = document.createElement('label');
    box.className = 'chip';
    box.innerHTML = '<input type="checkbox" id="swap-perm"><span>Auch dauerhaft im Plan ersetzen</span>';
    m.querySelector('.modal-body').appendChild(box);
  }
}

function openAddExercise(root, dayId) {
  const s = store.get();
  const pool = availableExercises(s.profile).filter((x) => !s.activeWorkout.entries.some((e) => e.exId === x.id));
  const m = openModal(
    `<input id="add-search" class="search" placeholder="Suchen…" aria-label="Übung suchen">
     <ul class="list tappable" id="add-list">${pool.map((a) => `<li data-name="${esc((a.name + ' ' + a.en).toLowerCase())}"><button class="link" data-add="${a.id}"><strong>${esc(a.name)}</strong><div class="muted small">${a.primary.map((x) => MUSCLE_BY_ID[x].short).join(', ')}</div></button></li>`).join('')}</ul>`,
    { title: 'Übung hinzufügen' },
  );
  m.querySelector('#add-search').addEventListener('input', (ev) => {
    const q = ev.target.value.toLowerCase();
    m.querySelectorAll('#add-list li').forEach((li) => (li.hidden = !li.dataset.name.includes(q)));
  });
  m.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
    store.update((st) => {
      const ex = getExercise(b.dataset.add);
      const week = st.activeWorkout.week;
      const deload = week === st.plan.deloadWeek;
      const rir = rirForWeek(st.plan, week);
      const pe = { exId: ex.id, muscle: ex.primary[0], repMin: ex.tier === 3 ? 10 : 8, repMax: ex.tier === 3 ? 15 : 12, restSec: ex.tier === 1 ? 150 : ex.tier === 2 ? 105 : 75, main: false };
      st.activeWorkout.entries.push(makeEntry(st, pe, 3, week, deload, rir, ex.tier === 1 ? 'kurz' : null));
    }, { silent: true });
    closeModal();
    renderWorkout(root, dayId);
  }));
}

function openPlates(ei) {
  const s = store.get();
  const e = s.activeWorkout.entries[ei];
  const w = e.sets.find((x) => !x.done)?.weight ?? e.sets[0]?.weight ?? e.suggestion?.weight ?? 60;
  const m = openModal(
    `<label class="field"><span>Zielgewicht (kg, inkl. Stange ${s.settings.barWeight} kg)</span><input id="pl-w" type="number" step="0.5" inputmode="decimal" value="${w || ''}"></label>
     <div id="pl-out" class="plates"></div>`,
    { title: 'Scheibenrechner' },
  );
  const render = () => {
    const v = num(m.querySelector('#pl-w').value);
    const r = plates(v, s.settings.barWeight, s.settings.plates);
    const out = m.querySelector('#pl-out');
    if (v < s.settings.barWeight) out.innerHTML = '<p class="muted">Weniger als die leere Stange.</p>';
    else out.innerHTML = `<p>Pro Seite:</p><div class="plate-row">${r.perSide.map((p) => `<span class="plate p${String(p).replace('.', '_')}">${p}</span>`).join('') || '<span class="muted">leere Stange</span>'}</div>${r.rest ? `<p class="muted small">Rest ${r.rest} kg pro Seite nicht abbildbar – Scheiben in den Einstellungen anpassen.</p>` : ''}`;
  };
  m.querySelector('#pl-w').addEventListener('input', render);
  render();
}

function openNote(root, dayId, ei) {
  const e = store.get().activeWorkout.entries[ei];
  const m = openModal(`<textarea id="note-text" rows="3" class="textarea" placeholder="z. B. Griff, Sitzhöhe, Gefühl">${esc(e.note || '')}</textarea><div class="row end"><button class="btn btn-primary" id="note-save">Speichern</button></div>`, { title: 'Notiz' });
  m.querySelector('#note-save').addEventListener('click', () => {
    const v = m.querySelector('#note-text').value.trim();
    store.update((st) => (st.activeWorkout.entries[ei].note = v), { silent: true });
    closeModal();
    renderWorkout(root, dayId);
  });
}

// ---------------- Abschluss
function finishWorkout(root) {
  const s = store.get();
  const aw = s.activeWorkout;
  const entries = aw.entries
    .map((e) => ({ exId: e.exId, note: e.note, sets: e.sets.filter((x) => x.done && x.reps > 0).map((x) => ({ weight: x.weight || 0, reps: x.reps, rir: x.rir })) }))
    .filter((e) => e.sets.length);
  if (!entries.length) return toast('Noch kein Satz abgehakt.', 'warn');
  const trained = [...new Set(entries.flatMap((e) => getExercise(e.exId)?.primary || []))];
  const today = toISODate();
  const checkin = s.checkins.find((c) => c.date === today);
  const preSore = new Set(checkin?.sore || []);
  const m = openModal(
    `<form id="fb-form" class="form">
      <label class="field"><span>Wie anstrengend war die Einheit insgesamt? <strong id="rpe-val">8</strong>/10</span><input type="range" id="fb-rpe" name="rpe" min="5" max="10" step="0.5" value="8"></label>
      <fieldset class="field"><legend>Leistung im Vergleich zum letzten Mal</legend>
        <div class="chips">${[['besser', 'Besser'], ['gleich', 'Gleich'], ['schlechter', 'Schlechter']].map(([v, l], i) => `<label class="chip"><input type="radio" name="performance" value="${v}" ${i === 1 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
      <fieldset class="field"><legend>Welche Muskeln waren vor der Einheit noch nicht erholt?</legend>
        <div class="chips">${trained.map((mu) => `<label class="chip"><input type="checkbox" name="sore[]" value="${mu}" ${preSore.has(mu) ? 'checked' : ''}><span>${MUSCLE_BY_ID[mu].short}</span></label>`).join('')}</div></fieldset>
      <fieldset class="field"><legend>Wo hättest du heute mehr vertragen?</legend>
        <div class="chips">${trained.map((mu) => `<label class="chip"><input type="checkbox" name="more[]" value="${mu}"><span>${MUSCLE_BY_ID[mu].short}</span></label>`).join('')}</div></fieldset>
      <p class="hint">Daraus passt LMCI das Volumen pro Muskel an: nicht erholt → ein Satz weniger, mehr vertragen → ein Satz mehr.</p>
      <div class="row end"><button class="btn btn-primary" type="submit">Speichern</button></div>
    </form>`,
    { title: 'Kurzes Feedback' },
  );
  m.querySelector('#fb-rpe').addEventListener('input', (e) => (m.querySelector('#rpe-val').textContent = e.target.value));
  m.querySelector('#fb-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = ev.target;
    const feedback = {
      rpe: num(f.rpe.value),
      performance: f.performance.value,
      sore: [...m.querySelectorAll('input[name="sore[]"]:checked')].map((x) => x.value),
      more: [...m.querySelectorAll('input[name="more[]"]:checked')].map((x) => x.value),
    };
    const deltas = aw.dayId === 'frei' || aw.dayId === 'schnell' ? {} : muscleDeltasFromFeedback(feedback, trained);
    const workout = { id: aw.id, planId: aw.planId, dayId: aw.dayId, week: aw.week, date: aw.date, startedAt: aw.startedAt, finishedAt: new Date().toISOString(), mode: aw.mode, entries, feedback };
    const records = newRecords(workout, s.workouts);
    workout.xp = xpForWorkout(workout, records.length);
    const xpBefore = totalXP(s);
    const badgesBefore = new Set(badgeStatus(s, aw.date, badgeExtra(s, aw.date)).filter((b) => b.earned).map((b) => b.id));
    stopRestTimer();
    let applied = [];
    store.update((st) => {
      st.workouts.push(workout);
      st.activeWorkout = null;
      if (aw.week && aw.week !== st.plan.deloadWeek && st.plan.id === aw.planId) {
        st.plan.muscleAdjust ||= {};
        for (const [mu, d] of Object.entries(deltas)) {
          if (!d) continue;
          const before = st.plan.muscleAdjust[mu] || 0;
          const after = clamp(before + d, -2, 2);
          if (after !== before) applied.push(`${MUSCLE_BY_ID[mu].short} ${d > 0 ? '+1' : '−1'}`);
          st.plan.muscleAdjust[mu] = after;
        }
      }
    });
    closeModal();
    const after = store.get();
    const xpAfter = totalXP(after);
    const lvlBefore = levelInfo(xpBefore);
    const lvlAfter = levelInfo(xpAfter);
    const newBadges = badgeStatus(after, aw.date, badgeExtra(after, aw.date)).filter((b) => b.earned && !badgesBefore.has(b.id));
    if (lvlAfter.level > lvlBefore.level || newBadges.length) {
      store.update((st) => {
        st.meta.celebrated.level = lvlAfter.level;
        st.meta.celebrated.badges = [...new Set([...(st.meta.celebrated.badges || []), ...newBadges.map((b) => b.id)])];
        st.meta.badgeDates ||= {};
        for (const b of newBadges) st.meta.badgeDates[b.id] ||= aw.date;
      }, { silent: true });
    }
    const mins = Math.round((new Date(workout.finishedAt) - new Date(workout.startedAt)) / 60000);
    window.__lmci.afterRoute(() => showCelebration({
      title: lvlAfter.level > lvlBefore.level ? 'Level up!' : records.length ? 'Neue Bestleistung!' : 'Training geschafft!',
      subtitle: `${totalSets(workout)} Sätze · ${totalTonnage(workout).toLocaleString('de-DE')} kg bewegt · ${mins} min`,
      xp: xpAfter - xpBefore,
      level: lvlAfter,
      levelUp: lvlAfter.level > lvlBefore.level,
      records: records.map((r) => `${r.name}: ${r.e1rm ? `geschätztes 1RM ${r.e1rm} kg` : `${r.reps} Wiederholungen`}`),
      badges: newBadges,
      note: applied.length ? `Volumen angepasst (Sätze pro Übung): ${applied.join(', ')}.` : aw.dayId === 'frei' || aw.dayId === 'schnell' ? '' : 'Volumen bleibt – passt.',
    }));
    location.hash = '#/heute';
  });
}

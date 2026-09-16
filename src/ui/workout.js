// Trainings-Logging: Sätze eintragen, Pausentimer, Feedback, Autoregulation.
import { html, raw, esc, toast, openModal, closeModal, confirmDialog, num, fmtMin } from './dom.js';
import * as store from '../state.js';
import { planWeek, effectiveSets, rirForWeek, alternativesFor } from '../engine/plan.js';
import { suggestNext, volumeDeltaFromFeedback, feedbackMessage, plates, incrementFor } from '../engine/progression.js';
import { historyFor, newRecords, totalSets, totalTonnage } from '../engine/analytics.js';
import { getExercise } from '../data/exercises.js';
import { MUSCLE_BY_ID } from '../data/muscles.js';
import { toISODate, uid, clamp } from '../engine/util.js';

let timer = { end: 0, total: 0, handle: null };

export function renderWorkout(root, dayId) {
  const s = store.get();
  const { plan } = s;
  const day = plan.days.find((d) => d.id === dayId);
  if (!day) {
    location.hash = '#/heute';
    return;
  }
  if (!s.activeWorkout || s.activeWorkout.dayId !== dayId) {
    if (s.activeWorkout && s.activeWorkout.entries.some((e) => e.sets.some((x) => x.done))) {
      // Es läuft bereits ein anderes Training mit Daten – erst entscheiden.
      confirmDialog(`Es läuft bereits „${plan.days.find((d) => d.id === s.activeWorkout.dayId)?.name}“. Verwerfen und „${day.name}“ starten?`, { ok: 'Verwerfen & starten', danger: true }).then((ok) => {
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
  const rir = rirForWeek(plan, week);
  const deload = week === plan.deloadWeek;

  root.innerHTML = String(html`
    <section class="page workout">
      <header class="page-head">
        <div><h1>${day.name}</h1><p class="muted">Woche ${week} · ${rir} Wdh. in Reserve${deload ? ' · Deload' : ''} · begonnen ${aw.startedAt.slice(11, 16)}</p></div>
        <button class="btn btn-small" data-act="abort">Abbrechen</button>
      </header>
      <div class="note small">Aufwärmen: 5 min locker, dann 2–3 leichte Sätze der ersten Übung (40 / 60 / 80 %). Erst dann die Arbeitssätze eintragen.</div>
      ${aw.entries.map((e, ei) => renderEntry(e, ei, s, plan, rir, deload))}
      <div class="row gap wrap">
        <button class="btn" data-act="add-ex">Übung hinzufügen</button>
        <button class="btn btn-primary btn-big" data-act="finish">Training abschließen</button>
      </div>
    </section>
    <div id="rest-bar" class="rest-bar" hidden>
      <div class="rest-fill"></div>
      <div class="rest-content"><span class="rest-label">Pause</span><span class="rest-time">0:00</span><button class="btn btn-small" data-act="rest-add">+30 s</button><button class="btn btn-small" data-act="rest-skip">Weiter</button></div>
    </div>`);

  // Eingaben ohne Re-Render speichern (Fokus bleibt erhalten).
  root.querySelectorAll('input[data-field]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const { ei, si, field } = inp.dataset;
      store.update((st) => {
        const set = st.activeWorkout.entries[ei].sets[si];
        set[field] = field === 'rir' ? (inp.value === '' ? null : num(inp.value)) : num(inp.value, null);
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
      store.update((st) => {
        const e = st.activeWorkout.entries[ei];
        const set = e.sets[si];
        if (!set.done) {
          // Leere Felder aus dem Vorschlag übernehmen
          const row = btn.closest('.set-row');
          const w = row.querySelector('[data-field="weight"]');
          const r = row.querySelector('[data-field="reps"]');
          if (w && w.value === '' && w.placeholder) w.value = w.placeholder;
          if (r && r.value === '' && r.placeholder) r.value = r.placeholder;
          set.weight = w ? num(w.value, 0) : 0;
          set.reps = num(r.value, 0);
          if (!set.reps) {
            toast('Bitte Wiederholungen eintragen.', 'warn');
            return;
          }
          set.done = true;
          startRest = true;
        } else set.done = false;
      }, { silent: true });
      const set = store.get().activeWorkout.entries[ei].sets[si];
      btn.closest('.set-row').classList.toggle('done', !!set.done);
      btn.textContent = set.done ? '✓' : '○';
      btn.setAttribute('aria-pressed', String(!!set.done));
      if (startRest && store.get().settings.restTimer) startRestTimer(store.get().activeWorkout.entries[ei].restSec);
    });
  });
  root.querySelectorAll('[data-act="add-set"]').forEach((b) => b.addEventListener('click', () => {
    store.update((st) => {
      const e = st.activeWorkout.entries[b.dataset.ei];
      const last = e.sets[e.sets.length - 1];
      e.sets.push({ weight: last?.weight ?? null, reps: null, rir: null, done: false });
    }, { silent: true });
    renderWorkout(root, dayId);
  }));
  root.querySelectorAll('[data-act="remove-set"]').forEach((b) => b.addEventListener('click', () => {
    store.update((st) => {
      const e = st.activeWorkout.entries[b.dataset.ei];
      if (e.sets.length > 1) e.sets.pop();
    }, { silent: true });
    renderWorkout(root, dayId);
  }));
  root.querySelectorAll('[data-act="swap"]').forEach((b) => b.addEventListener('click', () => openSwap(root, dayId, Number(b.dataset.ei))));
  root.querySelectorAll('[data-act="remove-ex"]').forEach((b) => b.addEventListener('click', async () => {
    if (await confirmDialog('Übung aus diesem Training entfernen?')) {
      store.update((st) => st.activeWorkout.entries.splice(Number(b.dataset.ei), 1), { silent: true });
      renderWorkout(root, dayId);
    }
  }));
  root.querySelectorAll('[data-act="plates"]').forEach((b) => b.addEventListener('click', () => openPlates(Number(b.dataset.ei))));
  root.querySelectorAll('[data-act="note"]').forEach((b) => b.addEventListener('click', () => openNote(root, dayId, Number(b.dataset.ei))));
  root.querySelectorAll('[data-act="cue"]').forEach((b) => b.addEventListener('click', () => {
    const ex = getExercise(b.dataset.ex);
    openModal(`<p class="cue">${esc(ex.cue || 'Keine Hinweise hinterlegt.')}</p>`, { title: ex.name });
  }));
  root.querySelector('[data-act="add-ex"]').addEventListener('click', () => openAddExercise(root, dayId));
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
  if (timer.end > Date.now()) tickRest();
}

function buildWorkout(st, day) {
  const week = planWeek(st.plan);
  const deload = week === st.plan.deloadWeek;
  const rir = rirForWeek(st.plan, week);
  return {
    id: uid(),
    planId: st.plan.id,
    dayId: day.id,
    week,
    date: toISODate(),
    startedAt: new Date().toISOString(),
    entries: day.exercises.map((pe) => {
      const n = effectiveSets(st.plan, day, pe, week);
      const sug = suggestNext(pe, historyFor(st.workouts, pe.exId), rir, deload);
      return {
        exId: pe.exId,
        repMin: pe.repMin,
        repMax: pe.repMax,
        restSec: pe.restSec,
        suggestion: sug,
        note: '',
        sets: Array.from({ length: n }, () => ({ weight: sug.weight, reps: null, rir: null, done: false })),
      };
    }),
  };
}

function renderEntry(e, ei, s, plan, rir, deload) {
  const ex = getExercise(e.exId);
  const loadable = !['bw', 'time', 'band'].includes(ex.load);
  const sug = e.suggestion || {};
  const unit = ex.load === 'time' ? 's' : 'Wdh.';
  return html`<div class="card ex-card" data-ei="${ei}">
    <div class="row between top">
      <div>
        <div class="ex-title">${ex.name}</div>
        <div class="muted small">${ex.primary.map((m) => MUSCLE_BY_ID[m].short).join(', ')} · Ziel ${e.sets.length} × ${e.repMin}–${e.repMax} ${unit} · ${rir} RIR · Pause ${Math.round(e.restSec / 60 * 10) / 10} min</div>
      </div>
      <div class="row gap-s">
        ${ex.cue ? html`<button class="btn-icon" data-act="cue" data-ex="${ex.id}" title="Technik" aria-label="Technik-Hinweise">i</button>` : ''}
        ${ex.load === 'barbell' ? html`<button class="btn-icon" data-act="plates" data-ei="${ei}" title="Scheiben" aria-label="Scheibenrechner">⚖</button>` : ''}
        <button class="btn-icon" data-act="note" data-ei="${ei}" title="Notiz" aria-label="Notiz">✎</button>
        <button class="btn-icon" data-act="swap" data-ei="${ei}" title="Tauschen" aria-label="Übung tauschen">⇄</button>
        <button class="btn-icon" data-act="remove-ex" data-ei="${ei}" title="Entfernen" aria-label="Übung entfernen">✕</button>
      </div>
    </div>
    ${sug.note ? html`<div class="suggestion ${sug.kind}"><span>${sug.note}</span>${sug.prev ? html`<span class="muted">Letztes Mal: ${sug.prev}</span>` : ''}</div>` : ''}
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
        <button class="set-done" data-act="done" data-ei="${ei}" data-si="${si}" aria-pressed="${!!set.done}" aria-label="Satz ${si + 1} abhaken">${set.done ? '✓' : '○'}</button>
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
function openSwap(root, dayId, ei) {
  const s = store.get();
  const e = s.activeWorkout.entries[ei];
  const alts = alternativesFor(e.exId, s.profile).slice(0, 10);
  const m = openModal(
    `${alts.length ? `<ul class="list tappable">${alts.map((a) => `<li><button class="link" data-alt="${a.id}"><strong>${esc(a.name)}</strong><div class="muted small">${esc(a.en)}</div></button></li>`).join('')}</ul>` : '<p class="muted">Keine Alternative mit deiner Ausrüstung.</p>'}
     <label class="chip"><input type="checkbox" id="swap-perm"><span>Auch dauerhaft im Plan ersetzen</span></label>`,
    { title: 'Übung tauschen' },
  );
  m.querySelectorAll('[data-alt]').forEach((b) => b.addEventListener('click', () => {
    const perm = m.querySelector('#swap-perm').checked;
    const newId = b.dataset.alt;
    store.update((st) => {
      const entry = st.activeWorkout.entries[ei];
      const week = st.activeWorkout.week;
      const pe = { exId: newId, repMin: entry.repMin, repMax: entry.repMax };
      entry.exId = newId;
      entry.suggestion = suggestNext(pe, historyFor(st.workouts, newId), rirForWeek(st.plan, week), week === st.plan.deloadWeek);
      entry.sets = entry.sets.map((x) => ({ ...x, weight: x.done ? x.weight : entry.suggestion.weight }));
      if (perm) {
        const d = st.plan.days.find((x) => x.id === dayId);
        const ppe = d?.exercises.find((x) => x.exId === e.exId);
        if (ppe) ppe.exId = newId;
      }
    }, { silent: true });
    closeModal();
    renderWorkout(root, dayId);
  }));
}

function openAddExercise(root, dayId) {
  const s = store.get();
  const { availableExercises } = window.__lmci;
  const pool = availableExercises(s.profile).filter((x) => !s.activeWorkout.entries.some((e) => e.exId === x.id));
  const m = openModal(
    `<input id="add-search" class="search" placeholder="Suchen…" aria-label="Übung suchen">
     <ul class="list tappable" id="add-list">${pool.map((a) => `<li data-name="${esc(a.name.toLowerCase())}"><button class="link" data-add="${a.id}"><strong>${esc(a.name)}</strong><div class="muted small">${a.primary.map((x) => MUSCLE_BY_ID[x].short).join(', ')}</div></button></li>`).join('')}</ul>`,
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
      const pe = { exId: ex.id, repMin: ex.tier === 3 ? 10 : 8, repMax: ex.tier === 3 ? 15 : 12 };
      const sug = suggestNext(pe, historyFor(st.workouts, ex.id), rirForWeek(st.plan, week), week === st.plan.deloadWeek);
      st.activeWorkout.entries.push({ exId: ex.id, repMin: pe.repMin, repMax: pe.repMax, restSec: ex.tier === 1 ? 150 : ex.tier === 2 ? 105 : 75, suggestion: sug, note: '', sets: [1, 2, 3].map(() => ({ weight: sug.weight, reps: null, rir: null, done: false })) });
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
  const m = openModal(
    `<form id="fb-form" class="form">
      <label class="field"><span>Wie anstrengend war die Einheit insgesamt? <strong id="rpe-val">8</strong>/10</span><input type="range" id="fb-rpe" name="rpe" min="5" max="10" step="0.5" value="8"></label>
      <fieldset class="field"><legend>Muskelkater / Erholung vor dieser Einheit</legend>
        <div class="chips">${[['keine', 'Voll erholt'], ['leicht', 'Leichter Muskelkater'], ['stark', 'Deutlicher Muskelkater'], ['nicht_erholt', 'Noch nicht erholt']].map(([v, l], i) => `<label class="chip"><input type="radio" name="soreness" value="${v}" ${i === 0 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
      <fieldset class="field"><legend>Leistung im Vergleich zum letzten Mal</legend>
        <div class="chips">${[['besser', 'Besser'], ['gleich', 'Gleich'], ['schlechter', 'Schlechter']].map(([v, l], i) => `<label class="chip"><input type="radio" name="performance" value="${v}" ${i === 1 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
      <p class="hint">Aus diesen Antworten passt LMCI das Volumen dieses Trainingstags an (Autoregulation).</p>
      <div class="row end"><button class="btn btn-primary" type="submit">Speichern</button></div>
    </form>`,
    { title: 'Kurzes Feedback' },
  );
  m.querySelector('#fb-rpe').addEventListener('input', (e) => (m.querySelector('#rpe-val').textContent = e.target.value));
  m.querySelector('#fb-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = ev.target;
    const feedback = { rpe: num(f.rpe.value), soreness: f.soreness.value, performance: f.performance.value };
    const delta = volumeDeltaFromFeedback(feedback);
    const workout = { id: aw.id, planId: aw.planId, dayId: aw.dayId, week: aw.week, date: aw.date, startedAt: aw.startedAt, finishedAt: new Date().toISOString(), entries, feedback };
    const records = newRecords(workout, s.workouts);
    stopRestTimer();
    store.update((st) => {
      st.workouts.push(workout);
      st.activeWorkout = null;
      if (aw.week !== st.plan.deloadWeek && st.plan.id === aw.planId) {
        st.plan.volumeAdjust[aw.dayId] = clamp((st.plan.volumeAdjust[aw.dayId] || 0) + delta, -2, 2);
      }
    });
    closeModal();
    const mins = Math.round((new Date(workout.finishedAt) - new Date(workout.startedAt)) / 60000);
    window.__lmci.afterRoute(() => openModal(
      `<div class="summary">
        <div class="stat"><span class="stat-num">${totalSets(workout)}</span><span class="stat-unit">Sätze</span></div>
        <div class="stat"><span class="stat-num">${totalTonnage(workout).toLocaleString('de-DE')}</span><span class="stat-unit">kg bewegt</span></div>
        <div class="stat"><span class="stat-num">${mins}</span><span class="stat-unit">min</span></div>
      </div>
      ${records.length ? `<h3>Neue Bestleistungen</h3><ul class="bullets">${records.map((r) => `<li>${esc(r.name)}: ${r.e1rm ? `geschätztes 1RM ${r.e1rm} kg` : `${r.reps} Wiederholungen`}</li>`).join('')}</ul>` : ''}
      <p class="${delta ? 'note' : 'muted'}">${esc(feedbackMessage(aw.week === s.plan.deloadWeek ? 0 : delta))}</p>
      <div class="row end"><a class="btn btn-primary" href="#/heute" data-close-modal>Fertig</a></div>`,
      { title: 'Stark – Training gespeichert' },
    ));
    location.hash = '#/heute';
  });
}

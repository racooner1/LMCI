// Schnelltraining: Ausrüstung + Fokus + Zeit wählen → Aufgabenliste → direkt loggen.
import { html, raw, toast } from './dom.js';
import * as store from '../state.js';
import { buildQuickWorkout, QUICK_GEAR, QUICK_FOCUS, QUICK_STYLES, muscleName } from '../engine/quick.js';
import { MUSCLES } from '../data/muscles.js';
import { getExercise } from '../data/exercises.js';
import { suggestNext, incrementFor } from '../engine/progression.js';
import { historyFor } from '../engine/analytics.js';
import { warmupSets } from '../engine/plan.js';
import { toISODate, uid } from '../engine/util.js';
import { openExerciseInfo } from './uebungen.js';

let form = null;
let result = null;
let seed = 1;

function defaults(s) {
  const p = s.profile || {};
  const gear = p.equipment === 'gym' ? ['studio'] : [...(p.gear || [])];
  return { gear, focus: ['ganzkoerper'], muscles: [], minutes: 30, intensity: 'normal', style: 'kraft' };
}

export function renderSchnell(root) {
  const s = store.get();
  if (!form) form = s.quickPrefs ? { ...defaults(s), ...s.quickPrefs } : defaults(s);
  const chip = (name, id, label, checked) => html`<label class="chip"><input type="checkbox" name="${name}" value="${id}" ${checked ? 'checked' : ''}><span>${label}</span></label>`;
  const radio = (name, id, label, checked) => html`<label class="chip"><input type="radio" name="${name}" value="${id}" ${checked ? 'checked' : ''}><span>${label}</span></label>`;

  root.innerHTML = String(html`
    <section class="page">
      <header class="page-head"><div><h1>Schnelltraining</h1><p class="muted">Sag, was du hast und was du trainieren willst – du bekommst eine fertige Aufgabenliste.</p></div></header>
      <form id="q-form" class="card">
        <h3>Was hast du gerade?</h3>
        <p class="muted small">Nichts ausgewählt = nur Körpergewicht.</p>
        <div class="chips">${QUICK_GEAR.map((g) => chip('gear', g.id, g.name, form.gear.includes(g.id)))}</div>
        <h3>Was willst du trainieren?</h3>
        <div class="chips">${QUICK_FOCUS.map((f) => chip('focus', f.id, f.name, form.focus.includes(f.id)))}</div>
        <p class="muted small">Oder gezielt einzelne Muskeln dazu:</p>
        <div class="chips">${MUSCLES.map((m) => chip('muscles', m.id, m.short, form.muscles.includes(m.id)))}</div>
        <h3>Wie viel Zeit und wie hart?</h3>
        <div class="chips">${[15, 20, 30, 45, 60].map((n) => radio('minutes', n, `${n} min`, form.minutes === n))}</div>
        <div class="chips">${[['leicht', 'Leicht'], ['normal', 'Normal'], ['hart', 'Hart']].map(([id, n]) => radio('intensity', id, n, form.intensity === id))}</div>
        <div class="chips">${QUICK_STYLES.map((st) => radio('style', st.id, `${st.name} – ${st.desc}`, form.style === st.id))}</div>
        <div class="row gap wrap"><button class="btn btn-primary" type="submit">Aufgaben erstellen</button>${result ? html`<button class="btn" type="button" data-act="reroll">Neu mischen</button>` : ''}</div>
      </form>
      ${result ? renderResult(result, s) : ''}
    </section>`);

  const read = () => {
    const f = root.querySelector('#q-form');
    const vals = (n) => [...f.querySelectorAll(`input[name="${n}"]:checked`)].map((x) => x.value);
    form = { gear: vals('gear'), focus: vals('focus'), muscles: vals('muscles'), minutes: Number(vals('minutes')[0] || 30), intensity: vals('intensity')[0] || 'normal', style: vals('style')[0] || 'kraft' };
    store.update((st) => (st.quickPrefs = form), { silent: true });
  };
  root.querySelector('#q-form').addEventListener('submit', (e) => {
    e.preventDefault();
    read();
    seed = Date.now();
    result = buildQuickWorkout({ ...form, profile: s.profile, seed });
    if (result.note) toast(result.note, 'warn');
    renderSchnell(root);
    root.querySelector('#q-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  root.querySelector('[data-act="reroll"]')?.addEventListener('click', () => {
    read();
    seed += 1;
    result = buildQuickWorkout({ ...form, profile: s.profile, seed });
    renderSchnell(root);
  });
  root.querySelector('[data-act="start"]')?.addEventListener('click', () => startQuick(result));
  root.querySelectorAll('[data-info]').forEach((b) => b.addEventListener('click', () => openExerciseInfo(b.dataset.info)));
  root.querySelectorAll('[data-swap]').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.swap);
    openExerciseInfo(result.tasks[i].exId, {
      pickLabel: 'Ersetzen durch',
      onPick: (altId) => {
        const ex = getExercise(altId);
        result.tasks[i] = { ...result.tasks[i], exId: altId, tier: ex.tier, load: ex.load };
        document.getElementById('modal')?.remove();
        document.body.classList.remove('modal-open');
        renderSchnell(root);
      },
    });
  }));
}

function renderResult(r, s) {
  const unit = (t) => (t.load === 'time' ? 's' : 'Wdh.');
  return html`<div class="card card-accent" id="q-result">
    <div class="row between"><div class="card-title">Deine Aufgaben</div><span class="muted small">ca. ${r.minutes} min · ${r.rir} Wdh. in Reserve</span></div>
    <ol class="task-list">
      <li class="task"><span class="task-num">0</span><div><strong>Aufwärmen</strong><div class="muted small">4–6 min locker bewegen (Gehen, Rad, Seil, Hampelmänner), dann ein leichter Satz der ersten Übung.</div></div></li>
      ${r.tasks.map((t, i) => {
        const ex = getExercise(t.exId);
        return html`<li class="task"><span class="task-num">${i + 1}</span><div>
          <strong>${ex.name}</strong> <span class="muted small">· ${muscleName(t.muscle)}</span>
          <div class="small">${t.sets} × ${t.repMin}–${t.repMax} ${unit(t)}${t.weight ? ` · ca. ${t.weight} kg` : t.estReps ? ` · du schaffst vermutlich ~${t.estReps}` : ''} · Pause ${t.restSec} s</div>
          ${ex.cue ? html`<div class="muted small">${ex.cue}</div>` : ''}
          <div class="row gap-s"><button type="button" class="btn btn-small btn-ghost" data-info="${ex.id}">Info</button><button type="button" class="btn btn-small btn-ghost" data-swap="${i}">Andere Übung</button></div>
        </div></li>`;
      })}
      <li class="task"><span class="task-num">✓</span><div><strong>Cool-down</strong><div class="muted small">2–3 min locker ausgehen, die trainierten Muskeln kurz dehnen.</div></div></li>
    </ol>
    <div class="row gap wrap"><button class="btn btn-primary btn-big" data-act="start">Training starten & loggen</button></div>
    <p class="muted small">Beim Start wird jede Aufgabe zum Eintragen vorbereitet – mit Pausentimer, Vorschlägen aus deiner Historie und Feedback am Ende. Ohne Plan, ohne Verpflichtung.</p>
  </div>`;
}

function startQuick(r) {
  const s = store.get();
  let firstHeavy = true;
  const rirTarget = r.rir;
  store.update((st) => {
    st.activeWorkout = {
      id: uid(),
      planId: st.plan?.id || null,
      dayId: 'schnell',
      week: 0,
      rir: rirTarget,
      mode: 'normal',
      shortMinutes: null,
      date: toISODate(),
      startedAt: new Date().toISOString(),
      entries: r.tasks.map((t) => {
        const ex = getExercise(t.exId);
        const pe = { exId: t.exId, muscle: t.muscle, repMin: t.repMin, repMax: t.repMax, restSec: t.restSec, main: t.tier === 1 };
        const sug = suggestNext(pe, historyFor(st.workouts, t.exId), rirTarget, false, { profile: st.profile, settings: st.settings });
        if (sug.kind === 'start' && t.weight && !sug.weight) sug.weight = t.weight;
        let level = null;
        if (ex.tier === 1) {
          level = firstHeavy ? 'voll' : 'kurz';
          firstHeavy = false;
        }
        return {
          exId: t.exId,
          muscle: t.muscle,
          repMin: t.repMin,
          repMax: t.repMax,
          restSec: t.restSec,
          main: t.tier === 1,
          baseSets: t.sets,
          suggestion: sug,
          warmup: level ? warmupSets(ex, sug.weight, st.settings.barWeight, level) : [],
          note: '',
          sets: Array.from({ length: t.sets }, () => ({ weight: sug.weight ?? null, reps: null, rir: null, done: false })),
        };
      }),
    };
  });
  location.hash = '#/workout/schnell';
}

export function resetQuick() {
  result = null;
}

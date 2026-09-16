// Übungsbibliothek: suchen, filtern, Details mit Körperkarte, Alternativen, Videolink, eigene Historie.
import { html, raw, esc, openModal, fmtKg } from './dom.js';
import * as store from '../state.js';
import { EXERCISES, getExercise, videoSearchUrl } from '../data/exercises.js';
import { MUSCLES, MUSCLE_BY_ID, GEAR_BY_ID } from '../data/muscles.js';
import { isAvailable, alternativesFor } from '../engine/plan.js';
import { historyFor, e1rmHistory, personalRecords } from '../engine/analytics.js';
import { bodyMap } from './bodymap.js';
import { figureForExercise, motionText } from './figure.js';
import { formatDate } from '../engine/util.js';

const LOAD_NAMES = { barbell: 'Langhantel', dumbbell: 'Kurzhantel', machine: 'Maschine', cable: 'Kabelzug', bw: 'Körpergewicht', band: 'Band', time: 'Zeit', kettlebell: 'Kettlebell' };
const TIER_NAMES = { 1: 'Grundübung', 2: 'Mehrgelenkig', 3: 'Isolation' };

let filter = { q: '', muscle: '', onlyAvailable: true, load: '' };

export function renderUebungen(root, exId) {
  const s = store.get();
  const profile = s.profile;
  const list = EXERCISES.filter((e) => {
    if (filter.onlyAvailable && !isAvailable(e, profile)) return false;
    if (filter.muscle && !e.primary.includes(filter.muscle) && !e.secondary.includes(filter.muscle)) return false;
    if (filter.load && e.load !== filter.load) return false;
    if (filter.q) {
      const q = filter.q.toLowerCase();
      if (!e.name.toLowerCase().includes(q) && !e.en.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const grouped = {};
  for (const e of list) (grouped[e.primary[0]] ||= []).push(e);

  root.innerHTML = String(html`
    <section class="page">
      <header class="page-head"><div><h1>Übungen</h1><p class="muted">${EXERCISES.length} Übungen · ${list.length} angezeigt</p></div></header>
      <div class="card filters">
        <input id="ex-q" class="search" placeholder="Suchen (deutsch oder englisch)…" value="${filter.q}" aria-label="Übung suchen">
        <div class="row gap wrap">
          <select id="ex-muscle" class="select auto" aria-label="Muskel"><option value="">Alle Muskeln</option>${MUSCLES.map((m) => html`<option value="${m.id}" ${filter.muscle === m.id ? 'selected' : ''}>${m.name}</option>`)}</select>
          <select id="ex-load" class="select auto" aria-label="Gerät"><option value="">Alle Geräte</option>${Object.entries(LOAD_NAMES).map(([id, n]) => html`<option value="${id}" ${filter.load === id ? 'selected' : ''}>${n}</option>`)}</select>
          <label class="chip"><input type="checkbox" id="ex-avail" ${filter.onlyAvailable ? 'checked' : ''}><span>Nur mit meiner Ausrüstung</span></label>
        </div>
      </div>
      ${MUSCLES.filter((m) => grouped[m.id]).map((m) => html`<div class="card">
        <div class="card-title">${m.name}</div>
        <ul class="list tappable">${grouped[m.id].map((e) => html`<li><button class="link" data-ex="${e.id}"><div class="ex-thumb-row">${raw(figureForExercise(e, { size: 46, cls: 'thumb' }))}<div><strong>${e.name}</strong><div class="muted small">${e.en} · ${LOAD_NAMES[e.load]} · ${TIER_NAMES[e.tier]}${e.secondary.length ? ` · auch ${e.secondary.map((x) => MUSCLE_BY_ID[x].short).join(', ')}` : ''}</div></div></div></button></li>`)}</ul>
      </div>`)}
      ${list.length ? '' : html`<div class="card"><p class="muted">Nichts gefunden. Filter lockern oder „Nur mit meiner Ausrüstung“ abwählen.</p></div>`}
    </section>`);

  root.querySelector('#ex-q').addEventListener('input', (e) => {
    filter.q = e.target.value;
    const val = e.target.value;
    renderUebungen(root);
    const inp = root.querySelector('#ex-q');
    inp.focus();
    inp.setSelectionRange(val.length, val.length);
  });
  root.querySelector('#ex-muscle').addEventListener('change', (e) => {
    filter.muscle = e.target.value;
    renderUebungen(root);
  });
  root.querySelector('#ex-load').addEventListener('change', (e) => {
    filter.load = e.target.value;
    renderUebungen(root);
  });
  root.querySelector('#ex-avail').addEventListener('change', (e) => {
    filter.onlyAvailable = e.target.checked;
    renderUebungen(root);
  });
  root.querySelectorAll('[data-ex]').forEach((b) => b.addEventListener('click', () => openExerciseInfo(b.dataset.ex)));
  if (exId && getExercise(exId)) openExerciseInfo(exId);
}

// Detail-Modal für eine Übung (auch aus Plan und Training nutzbar). onPick(altId) macht Alternativen wählbar.
export function openExerciseInfo(exId, { onPick = null, pickLabel = 'Alternativen' } = {}) {
  const s = store.get();
  const ex = getExercise(exId);
  if (!ex) return null;
  const hist = historyFor(s.workouts, exId, 5);
  const e1 = e1rmHistory(s.workouts, exId);
  const pr = personalRecords(s.workouts).find((r) => r.exId === exId);
  const alts = alternativesFor(exId, s.profile).slice(0, 8);
  const gear = ex.gear.map((g) => GEAR_BY_ID[g]?.name || g).join(', ');
  const mt = motionText(ex);
  const m = openModal(
    `<p class="muted small">${esc(ex.en)} · ${LOAD_NAMES[ex.load]} · ${TIER_NAMES[ex.tier]}${gear ? ` · Zuhause: ${esc(gear)}` : ''}</p>
     ${mt ? `<div class="figure-hero">${figureForExercise(ex, { size: 260, interactive: true, label: true })}
       <div class="figure-controls"><button class="btn btn-small btn-ghost" data-fig-act="slow" aria-pressed="false">Zeitlupe</button><span class="muted small">Tippen = Pause · ${mt.view === 'front' ? 'Ansicht von vorn' : 'Ansicht von der Seite'}</span></div></div>
       <h3>So geht's</h3>
       <ol class="steps">${mt.steps.map((st) => `<li>${esc(st)}</li>`).join('')}</ol>
       ${mt.tempo ? `<p class="muted small">Tempo: ${esc(mt.tempo)}</p>` : ''}` : ''}
     ${bodyMap(ex.primary, ex.secondary)}
     <p class="small"><strong>${ex.primary.map((x) => MUSCLE_BY_ID[x].name).join(', ')}</strong>${ex.secondary.length ? `<span class="muted"> · Nebenmuskeln: ${ex.secondary.map((x) => MUSCLE_BY_ID[x].name).join(', ')}</span>` : ''}</p>
     ${ex.cue ? `<p class="cue">${esc(ex.cue)}</p>` : ''}
     ${ex.contra.length ? `<p class="muted small">Vorsicht bei: ${ex.contra.map((c) => ({ knie: 'Knie', schulter: 'Schulter', ruecken_unten: 'unterer Rücken', handgelenk: 'Handgelenk', huefte: 'Hüfte' })[c] || c).join(', ')}</p>` : ''}
     <a class="btn btn-small" href="${videoSearchUrl(ex)}" target="_blank" rel="noopener">Technik-Videos ansehen ↗</a>
     ${pr ? `<h3>Deine Bestleistung</h3><p>${pr.e1rm ? `${fmtKg(pr.weight)} × ${pr.reps} (geschätztes 1RM ${pr.e1rm} kg)` : `${pr.reps} Wiederholungen`} · ${formatDate(pr.date)}</p>` : ''}
     ${hist.length ? `<h3>Letzte Einheiten</h3><ul class="bullets small">${hist.slice().reverse().map((h) => `<li>${formatDate(h.date)}: ${h.sets.map((x) => `${x.weight ? `${x.weight} kg × ` : ''}${x.reps}${x.rir != null ? ` @${x.rir}` : ''}`).join(', ')}</li>`).join('')}</ul>` : ''}
     ${e1.length > 1 ? `<p class="muted small">Entwicklung geschätztes 1RM: ${e1[0].e1rm} → ${e1[e1.length - 1].e1rm} kg</p>` : ''}
     <h3>${esc(pickLabel)}</h3>
     ${alts.length ? `<ul class="list tappable">${alts.map((a) => `<li><button class="link" data-alt="${a.id}"><strong>${esc(a.name)}</strong><div class="muted small">${esc(a.en)} · ${LOAD_NAMES[a.load]}</div></button></li>`).join('')}</ul>` : '<p class="muted">Keine passende Alternative mit deiner Ausrüstung.</p>'}`,
    { title: ex.name },
  );
  m.querySelectorAll('[data-alt]').forEach((b) => b.addEventListener('click', () => {
    if (onPick) onPick(b.dataset.alt);
    else openExerciseInfo(b.dataset.alt);
  }));
  return m;
}

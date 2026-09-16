// Planansicht: Kraft-Tage, Volumen, Cardio, Mobilität.
import { html, raw, openModal, closeModal, toast, confirmDialog } from './dom.js';
import * as store from '../state.js';
import { planWeek, effectiveSets, rirForWeek, isMesoFinished, GOALS, EXPERIENCE, dayDuration } from '../engine/plan.js';
import { openExerciseInfo } from './uebungen.js';
import { getExercise } from '../data/exercises.js';
import { MUSCLES, MUSCLE_BY_ID } from '../data/muscles.js';
import { MOBILITY_BY_ID } from '../data/mobility.js';
import { ACTIVITY_BY_ID } from '../engine/cardio.js';
import { volumeBars } from './charts.js';
import { toISODate, WEEKDAYS_LONG, addDays, formatDate } from '../engine/util.js';
import { startNewMeso } from './heute.js';

let tab = 'kraft';

export function renderPlan(root) {
  const s = store.get();
  const { plan, profile } = s;
  const today = toISODate();
  const week = planWeek(plan, today);
  const rir = rirForWeek(plan, week);
  const deload = week === plan.deloadWeek;
  const endDate = addDays(plan.startDate, plan.weeks * 7 - 1);

  root.innerHTML = String(html`
    <section class="page">
      <header class="page-head">
        <div>
          <h1>Dein Plan</h1>
          <p class="muted">${plan.split.name} · ${GOALS[plan.goal]?.name} · ${EXPERIENCE[plan.experience]?.name}</p>
        </div>
        <div class="week-chip ${deload ? 'deload' : ''}"><span class="week-chip-label">${deload ? 'Deload' : 'Aufbau'}</span><span class="week-chip-week">Woche ${week}/${plan.weeks}</span></div>
      </header>
      <p class="muted small">Block ${plan.mesoIndex + 1} · ${formatDate(plan.startDate)} bis ${formatDate(endDate)} · diese Woche ${rir} Wiederholung${rir === 1 ? '' : 'en'} in Reserve${deload ? ', halbe Satzzahl, ca. 10 % weniger Gewicht' : ''}</p>
      ${plan.notes.map((n) => html`<div class="note">${n}</div>`)}
      ${isMesoFinished(plan, today) ? html`<div class="banner"><strong>Block abgeschlossen.</strong> <button class="btn btn-primary" data-act="new-meso">Neuen Mesozyklus starten</button></div>` : ''}

      <nav class="tabs" role="tablist">
        ${[['kraft', 'Kraft'], ['volumen', 'Volumen'], ['cardio', 'Cardio'], ['mobilitaet', 'Mobilität']].map(([id, n]) => html`<button role="tab" class="tab ${tab === id ? 'active' : ''}" data-tab="${id}" aria-selected="${tab === id}">${n}</button>`)}
      </nav>

      <div class="tab-panel">${raw(renderTab(tab, plan, profile, week))}</div>

      <div class="row gap wrap">
        <a class="btn" href="#/uebungen">Übungsbibliothek</a>
        <a class="btn" href="#/onboarding/edit">Profil & Vorgaben ändern</a>
        <button class="btn btn-ghost" data-act="regen">Plan neu berechnen</button>
      </div>
    </section>`);

  root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    tab = b.dataset.tab;
    renderPlan(root);
  }));
  root.querySelector('[data-act="new-meso"]')?.addEventListener('click', startNewMeso);
  root.querySelector('[data-act="regen"]').addEventListener('click', async () => {
    if (await confirmDialog('Plan mit denselben Vorgaben neu berechnen? Deine Trainingslogs bleiben erhalten, manuelle Übungstausche gehen verloren.')) {
      startNewMesoKeepIndex();
    }
  });
  root.querySelectorAll('[data-ex]').forEach((el) => el.addEventListener('click', () => openExerciseDetail(el.dataset.day, el.dataset.ex, root)));
}

function startNewMesoKeepIndex() {
  store.update((st) => {
    const { generatePlan } = window.__lmci;
    st.plan = generatePlan(st.profile, { mesoIndex: st.plan.mesoIndex, startDate: st.plan.startDate });
  });
  toast('Plan neu berechnet.', 'ok');
}

function renderTab(t, plan, profile, week) {
  if (t === 'kraft') {
    return plan.days.map((d) => html`<div class="card day-card">
      <div class="row between">
        <div><div class="card-title">${d.name}</div><div class="muted small">${d.weekday != null ? WEEKDAYS_LONG[d.weekday] : ''} · ca. ${dayDuration(plan, d, week, profile)} min</div></div>
        <a class="btn btn-small" href="#/workout/${d.id}">Starten</a>
      </div>
      <table class="ex-table">
        <thead><tr><th>Übung</th><th>Sätze</th><th>Wdh.</th><th>Pause</th></tr></thead>
        <tbody>${d.exercises.map((pe) => {
          const ex = getExercise(pe.exId);
          return html`<tr class="tappable" data-day="${d.id}" data-ex="${pe.exId}" tabindex="0">
            <td><div class="ex-name">${ex.name}</div><div class="muted small">${MUSCLE_BY_ID[pe.muscle]?.short}${pe.main ? ' · Hauptübung' : ''}</div></td>
            <td class="num">${effectiveSets(plan, d, pe, week)}</td>
            <td class="num">${pe.repMin}–${pe.repMax}${ex.load === 'time' ? ' s' : ''}</td>
            <td class="num">${Math.round(pe.restSec / 60 * 10) / 10} min</td></tr>`;
        })}</tbody>
      </table>
      ${Object.entries(plan.muscleAdjust || {}).filter(([m, v]) => v && d.exercises.some((pe) => pe.muscle === m)).length ? html`<div class="muted small">Autoregulation: ${Object.entries(plan.muscleAdjust).filter(([m, v]) => v && d.exercises.some((pe) => pe.muscle === m)).map(([m, v]) => `${MUSCLE_BY_ID[m]?.short} ${v > 0 ? '+' : ''}${v}`).join(', ')} Satz/Übung (aus deinem Feedback).</div>` : ''}
    </div>`).map(String).join('') + `<div class="card"><div class="card-title">So liest du den Plan</div><ul class="bullets">
      <li><strong>Sätze × Wdh.</strong> – Arbeitssätze nach dem Aufwärmen. Erreichst du in allen Sätzen die obere Wiederholungszahl, wird beim nächsten Mal das Gewicht erhöht (doppelte Progression).</li>
      <li><strong>Wiederholungen in Reserve (RIR)</strong> – wie viele saubere Wiederholungen du noch schaffen würdest. Woche 1 locker (3), bis Woche 4 nah ans Versagen, Woche 5 Deload.</li>
      <li><strong>Aufwärmen</strong> – 5 min locker (Rad, Seil, Gehen), dann bei der ersten Übung 2–3 Sätze mit 40 / 60 / 80 % des Arbeitsgewichts.</li>
      <li><strong>Tausch</strong> – tippe auf eine Übung, um Technik-Hinweise und Alternativen zu sehen.</li>
    </ul></div>`;
  }
  if (t === 'volumen') {
    const rows = MUSCLES.map((m) => ({ label: m.short, value: plan.volume[m.id].planned, min: plan.volume[m.id].min, max: plan.volume[m.id].max, target: plan.volume[m.id].target }));
    return `<div class="card"><div class="card-title">Harte Sätze pro Woche und Muskel</div>
      ${volumeBars(rows)}
      <p class="muted small">Balken = geplante Sätze (Nebenmuskeln zählen halb), heller Bereich = sinnvoller Zielbereich. Meta-Analysen zeigen: ab ca. 10 Sätzen pro Woche und Muskel wächst der Muskel deutlich besser als mit weniger; darüber steigt der Ertrag nur noch langsam. Woche 5 halbiert alles (Deload).</p>
      </div>`;
  }
  if (t === 'cardio') {
    const c = plan.cardio;
    return `<div class="card"><div class="card-title">Cardio-Einheiten</div>
      ${c.sessions.length ? `<table class="ex-table"><thead><tr><th>Einheit</th>${[1, 2, 3, 4, 5].map((w) => `<th class="num ${w === week ? 'now' : ''}">W${w}</th>`).join('')}</tr></thead>
      <tbody>${c.sessions.map((s) => `<tr><td><div class="ex-name">${s.name}</div><div class="muted small">${ACTIVITY_BY_ID[s.activity]?.name} · Zone ${s.zone}${s.intervals ? ` · ${s.intervals.work}s hart / ${s.intervals.rest}s locker` : ''}</div></td>${s.minutesByWeek.map((m, i) => `<td class="num ${i + 1 === week ? 'now' : ''}">${m}${s.intervals ? `<div class="muted small">${s.intervals.roundsByWeek[i]}×</div>` : ''}</td>`).join('')}</tr>`).join('')}</tbody></table>
      <p class="muted small">Minuten pro Einheit und Woche. ${c.hint}</p>
      ${c.sessions.map((s) => `<p class="small"><strong>${s.name}:</strong> ${s.desc}</p>`).join('')}` : `<p class="muted">${c.hint}</p>`}
      </div>
      <div class="card"><div class="card-title">Deine Pulszonen</div>
      <p class="muted small">Maximalpuls geschätzt ${c.zones.max} (208 − 0,7 × Alter). Methode: ${c.zones.method}.${profile.restingHr ? '' : ' Trage deinen Ruhepuls im Profil ein für genauere Zonen.'}</p>
      <table class="ex-table"><tbody>${c.zones.zones.map((z) => `<tr><td><div class="ex-name">${z.name}</div><div class="muted small">${z.feel}</div></td><td class="num">${z.range[0]}–${z.range[1]}</td></tr>`).join('')}</tbody></table>
      </div>`;
  }
  const names = { unterkoerper: 'Nach Bein-/Ganzkörpertagen', oberkoerper: 'Nach Oberkörpertagen', ruhetag: 'Ruhetage' };
  return Object.entries(plan.mobility).map(([k, ids]) => `<div class="card"><div class="card-title">${names[k]}</div>
    <ol class="mob-list">${ids.map((id) => MOBILITY_BY_ID[id]).filter(Boolean).map((m) => `<li><div><strong>${m.name}</strong><div class="muted">${m.cue}</div></div><span class="pill">${m.seconds}s${m.perSide ? ' / Seite' : ''}</span></li>`).join('')}</ol></div>`).join('') +
    `<div class="card"><p class="small muted">Beweglichkeit verbessert sich durch regelmäßiges, entspanntes Dehnen und aktive Endpositionen – 5–10 Minuten an den meisten Tagen genügen. Krafttraining über die volle Bewegungsamplitude ist selbst ein wirksames Beweglichkeitstraining.</p></div>`;
}

export function openExerciseDetail(dayId, exId, root) {
  openExerciseInfo(exId, {
    pickLabel: 'Im Plan ersetzen durch',
    onPick: (altId) => {
      store.update((st) => {
        const d = st.plan.days.find((x) => x.id === dayId);
        const pe = d?.exercises.find((x) => x.exId === exId);
        if (pe) {
          pe.exId = altId;
          pe.tier = getExercise(altId)?.tier ?? pe.tier;
        }
      });
      closeModal();
      toast('Übung im Plan ersetzt.', 'ok');
      if (root) renderPlan(root);
    },
  });
}

// Fortschritt: Verlauf, Rekorde, Volumen, Gewicht.
import { html, raw, esc, openModal, closeModal, confirmDialog, toast, fmtKg } from './dom.js';
import * as store from '../state.js';
import { lineChart, barChart, volumeBars } from './charts.js';
import { weeklySeries, weeklyVolume, e1rmHistory, personalRecords, totalSets, totalTonnage } from '../engine/analytics.js';
import { weightTrend } from '../engine/nutrition.js';
import { getExercise } from '../data/exercises.js';
import { MUSCLES } from '../data/muscles.js';
import { toISODate, startOfWeek, formatDate, fromISODate, uid } from '../engine/util.js';
import { badgeStatus, dailyStreak } from '../engine/achievements.js';
import { num } from './dom.js';

const MEASURES = [['taille', 'Taille'], ['huefte', 'Hüfte'], ['brust', 'Brust'], ['arm', 'Oberarm'], ['oberschenkel', 'Oberschenkel'], ['schulter', 'Schulterumfang']];
let selectedMeasure = 'taille';

let selectedEx = null;

export function renderFortschritt(root) {
  const s = store.get();
  const { plan, workouts, cardioLogs, bodyLogs } = s;
  const today = toISODate();
  const series = weeklySeries(workouts, cardioLogs, 8, today);
  const wk = (w) => {
    const d = fromISODate(w.weekStart);
    return `${d.getDate()}.${d.getMonth() + 1}.`;
  };
  const vol = weeklyVolume(workouts, startOfWeek(today));
  const volRows = MUSCLES.map((m) => ({ label: m.short, value: Math.round(vol[m.id] * 10) / 10, min: plan.volume[m.id].min, max: plan.volume[m.id].max, target: plan.volume[m.id].target }));
  const exIds = [...new Set(workouts.flatMap((w) => w.entries.map((e) => e.exId)))].filter((id) => e1rmHistory(workouts, id).length);
  if (!selectedEx || !exIds.includes(selectedEx)) selectedEx = exIds[0] || null;
  const e1 = selectedEx ? e1rmHistory(workouts, selectedEx) : [];
  const sortedBody = [...bodyLogs].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-60);
  const avg7 = sortedBody.map((_, i) => {
    const win = sortedBody.slice(Math.max(0, i - 6), i + 1);
    return { y: Math.round((win.reduce((a, b) => a + b.weightKg, 0) / win.length) * 10) / 10 };
  });
  const trend = weightTrend(bodyLogs);
  const records = personalRecords(workouts).slice(0, 10);
  const recent = [...workouts].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 20);
  const badges = badgeStatus(s, today);
  const earned = badges.filter((b) => b.earned);
  const streak = dailyStreak(s, today);
  const measures = [...s.measurements].sort((a, b) => (a.date < b.date ? -1 : 1));
  const latestM = measures[measures.length - 1];
  const mSeries = measures.filter((m) => m[selectedMeasure] != null).map((m) => ({ label: formatDate(m.date, { weekday: false }), y: m[selectedMeasure] }));

  root.innerHTML = String(html`
    <section class="page">
      <header class="page-head"><div><h1>Fortschritt</h1><p class="muted">${workouts.length} Trainings · ${cardioLogs.length} Cardio-Einheiten · Streak ${streak} Tag${streak === 1 ? '' : 'e'}</p></div><a class="btn btn-small" href="#/kalender">Kalender</a></header>

      <div class="card">
        <div class="row between"><div class="card-title">Abzeichen</div><span class="muted small">${earned.length} / ${badges.length}</span></div>
        <div class="badges">${badges.map((b) => html`<div class="badge-tile ${b.earned ? 'earned' : ''}" title="${b.desc}"><span class="badge-icon">${b.icon}</span><span class="badge-name">${b.name}</span><span class="muted small">${b.desc}</span></div>`)}</div>
      </div>

      <div class="card">
        <div class="row between"><div class="card-title">Körpermaße</div><button class="btn btn-small" data-act="measure">Eintragen</button></div>
        ${latestM ? html`<p class="small">${formatDate(latestM.date)}: ${MEASURES.filter(([k]) => latestM[k] != null).map(([k, n]) => `${n} ${latestM[k]} cm`).join(' · ')}</p>
        <select id="measure-select" class="select">${MEASURES.map(([k, n]) => html`<option value="${k}" ${k === selectedMeasure ? 'selected' : ''}>${n}</option>`)}</select>
        ${raw(lineChart(mSeries, { unit: ' cm' }))}` : html`<p class="muted small">Umfänge sagen oft mehr als die Waage – vor allem beim Muskelaufbau. Alle 2–4 Wochen messen, morgens, gleiche Stelle.</p>`}
      </div>

      <div class="card">
        <div class="card-title">Harte Sätze diese Woche</div>
        ${raw(volumeBars(volRows))}
        <p class="muted small">Ist-Volumen aus deinen Logs gegenüber dem Zielbereich des Plans.</p>
      </div>

      <div class="card">
        <div class="card-title">Wochenverlauf</div>
        ${raw(barChart(series.map((w) => ({ label: wk(w), y: w.sets })), { unit: '' }))}
        <p class="muted small">Arbeitssätze pro Woche (letzte 8 Wochen).</p>
        ${raw(barChart(series.map((w) => ({ label: wk(w), y: w.cardioMin, cls: 'secondary' })), { unit: '' }))}
        <p class="muted small">Cardio-Minuten pro Woche.</p>
      </div>

      <div class="card">
        <div class="row between"><div class="card-title">Kraftentwicklung (geschätztes 1RM)</div></div>
        ${exIds.length ? html`<select id="ex-select" class="select">${exIds.map((id) => html`<option value="${id}" ${id === selectedEx ? 'selected' : ''}>${getExercise(id)?.name || id}</option>`)}</select>` : ''}
        ${raw(lineChart(e1.map((p) => ({ label: formatDate(p.date, { weekday: false }), y: p.e1rm })), { unit: ' kg' }))}
        <p class="muted small">Geschätztes Maximalgewicht für eine Wiederholung (Epley-Formel aus Gewicht × Wiederholungen). Trainiere nie tatsächlich ein 1RM ohne Erfahrung.</p>
      </div>

      <div class="card">
        <div class="card-title">Körpergewicht</div>
        ${raw(lineChart(sortedBody.map((b) => ({ label: formatDate(b.date, { weekday: false }), y: b.weightKg })), { unit: ' kg', secondary: avg7 }))}
        ${trend ? html`<p class="muted small">7-Tage-Schnitt ${fmtKg(Math.round(trend.current * 10) / 10)} · Trend ${trend.perWeek > 0 ? '+' : ''}${(Math.round(trend.perWeek * 100) / 100).toString().replace('.', ',')} kg/Woche über ${trend.days} Tage</p>` : html`<p class="muted small">Trage dein Gewicht regelmäßig auf „Heute“ ein.</p>`}
      </div>

      <div class="card">
        <div class="card-title">Bestleistungen</div>
        ${records.length ? html`<table class="ex-table"><tbody>${records.map((r) => html`<tr><td><div class="ex-name">${getExercise(r.exId)?.name || r.exId}</div><div class="muted small">${formatDate(r.date)}</div></td><td class="num">${r.e1rm ? html`${fmtKg(r.weight)} × ${r.reps}<div class="muted small">e1RM ${r.e1rm} kg</div>` : html`${r.reps} Wdh.`}</td></tr>`)}</tbody></table>` : html`<p class="muted">Noch keine Trainings gespeichert.</p>`}
      </div>

      <div class="card">
        <div class="card-title">Letzte Trainings</div>
        ${recent.length ? html`<ul class="list tappable">${recent.map((w) => html`<li><button class="link" data-w="${w.id}"><strong>${w.dayId === 'frei' ? 'Freies Training' : w.dayId === 'schnell' ? 'Schnelltraining' : plan.days.find((d) => d.id === w.dayId)?.name || s.planHistory.flatMap((p) => p.days).find((d) => d.id === w.dayId && p.id === w.planId)?.name || 'Training'}</strong><div class="muted small">${formatDate(w.date)} · ${totalSets(w)} Sätze · ${totalTonnage(w).toLocaleString('de-DE')} kg${w.feedback ? ` · RPE ${w.feedback.rpe}` : ''}</div></button></li>`)}</ul>` : html`<p class="muted">Noch nichts geloggt – starte auf „Heute“.</p>`}
      </div>
    </section>`);

  root.querySelector('[data-act="measure"]').addEventListener('click', () => openMeasure(root));
  root.querySelector('#measure-select')?.addEventListener('change', (e) => {
    selectedMeasure = e.target.value;
    renderFortschritt(root);
  });
  root.querySelector('#ex-select')?.addEventListener('change', (e) => {
    selectedEx = e.target.value;
    renderFortschritt(root);
  });
  root.querySelectorAll('[data-w]').forEach((b) => b.addEventListener('click', () => openWorkoutDetail(root, b.dataset.w)));
}

function openWorkoutDetail(root, id) {
  const s = store.get();
  const w = s.workouts.find((x) => x.id === id);
  if (!w) return;
  const m = openModal(
    `<p class="muted small">${formatDate(w.date)} · Woche ${w.week}${w.feedback ? ` · RPE ${w.feedback.rpe} · ${esc(w.feedback.soreness)} · ${esc(w.feedback.performance)}` : ''}</p>
     ${w.entries.map((e) => `<div class="detail-ex"><strong>${esc(getExercise(e.exId)?.name || e.exId)}</strong><div class="muted small">${e.sets.map((x) => `${x.weight ? `${x.weight} kg × ` : ''}${x.reps}${x.rir != null ? ` @${x.rir}` : ''}`).join(' · ')}</div>${e.note ? `<div class="small">Notiz: ${esc(e.note)}</div>` : ''}</div>`).join('')}
     <div class="row end"><button class="btn btn-danger btn-small" id="del-w">Training löschen</button></div>`,
    { title: 'Training' },
  );
  m.querySelector('#del-w').addEventListener('click', async () => {
    closeModal();
    if (await confirmDialog('Dieses Training endgültig löschen?', { ok: 'Löschen', danger: true })) {
      store.update((st) => (st.workouts = st.workouts.filter((x) => x.id !== id)));
      toast('Training gelöscht.');
      renderFortschritt(root);
    }
  });
}

function openMeasure(root) {
  const s = store.get();
  const last = [...s.measurements].sort((a, b) => (a.date < b.date ? 1 : -1))[0] || {};
  const m = openModal(
    `<form id="ms-form" class="form">
      <label class="field"><span>Datum</span><input id="ms-date" type="date" value="${toISODate()}"></label>
      <p class="muted small">Umfänge in cm – leer lassen, was du nicht misst.</p>
      <div class="grid2">${MEASURES.map(([k, n]) => `<label class="field"><span>${n}</span><input id="ms-${k}" type="number" step="0.5" min="10" max="250" inputmode="decimal" placeholder="${last[k] ?? ''}"></label>`).join('')}</div>
      <div class="row end"><button class="btn btn-primary" type="submit">Speichern</button></div>
    </form>`,
    { title: 'Körpermaße' },
  );
  m.querySelector('#ms-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const entry = { id: uid(), date: m.querySelector('#ms-date').value || toISODate() };
    let any = false;
    for (const [k] of MEASURES) {
      const v = num(m.querySelector(`#ms-${k}`).value);
      if (v) {
        entry[k] = v;
        any = true;
      }
    }
    if (!any) return toast('Bitte mindestens einen Wert eintragen.', 'warn');
    store.update((st) => {
      st.measurements = st.measurements.filter((x) => x.date !== entry.date);
      st.measurements.push(entry);
    });
    closeModal();
    toast('Maße gespeichert.', 'ok');
    renderFortschritt(root);
  });
}

// Schnelleintrag: „eben 10 Liegestütze gemacht“ – Sätze festhalten, ohne ein Training zu starten.
import { esc, toast, openModal, closeModal, confirmDialog, num, fmtKg } from './dom.js';
import * as store from '../state.js';
import { EXERCISES, getExercise } from '../data/exercises.js';
import { isAvailable } from '../engine/plan.js';
import { toISODate, addDays } from '../engine/util.js';
import { XP } from '../engine/xp.js';
import { addQuickSets, quickLogSummary, removeQuickEntry, recentQuickExercises, repsInPeriod } from '../engine/quicklog.js';
import { personalRecords } from '../engine/analytics.js';
import { bestSet } from '../engine/records.js';
import { icon } from './icons.js';
import { confetti } from './celebrate.js';

// Vorschläge, wenn noch nichts eingetragen wurde: Klassiker, die man „mal eben“ macht.
const SUGGESTIONS = ['liegestuetze', 'liegestuetze_breit', 'liegestuetze_eng', 'klimmzuege', 'kniebeuge_bw', 'plank', 'crunches', 'dips'];
const REP_CHIPS = [5, 10, 15, 20, 25, 30];
const TIME_CHIPS = [20, 30, 45, 60, 90, 120];

const isTime = (ex) => ex?.load === 'time';
const needsWeight = (ex) => !['bw', 'band', 'time'].includes(ex?.load);
const unitLabel = (ex) => (isTime(ex) ? 'Sekunden' : 'Wiederholungen');

// Schlägt der neue Satz die bisherige Bestleistung? (Gleiche Logik wie im Training.)
export function isNewRecord(s, exId, set) {
  const best = bestSet({ sets: [set] });
  if (!best) return false;
  const prev = personalRecords(s.workouts).find((r) => r.exId === exId);
  if (!prev) return true;
  return best.e1rm > 0 ? best.e1rm > prev.e1rm + 0.05 : prev.e1rm === 0 && best.reps > prev.reps;
}

export function openQuickLog({ exId = null, date = toISODate(), after = () => {} } = {}) {
  const view = { exId, date, q: '' };
  const m = openModal('<div id="ql-body"></div>', { title: 'Schnell eintragen' });

  const render = () => {
    m.querySelector('#ql-body').innerHTML = view.exId ? formHTML(view) : pickerHTML(view);
    bind();
    if (view.exId) m.querySelector('#ql-reps')?.focus();
  };

  const bind = () => {
    m.querySelector('#ql-q')?.addEventListener('input', (e) => {
      view.q = e.target.value;
      const v = e.target.value;
      render();
      const inp = m.querySelector('#ql-q');
      inp.focus();
      inp.setSelectionRange(v.length, v.length);
    });
    m.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => {
      view.exId = b.dataset.pick;
      render();
    }));
    m.querySelector('[data-act="change"]')?.addEventListener('click', () => {
      view.exId = null;
      view.q = '';
      render();
    });
    m.querySelectorAll('[data-reps]').forEach((b) => b.addEventListener('click', () => {
      m.querySelector('#ql-reps').value = b.dataset.reps;
      updateXpHint();
    }));
    m.querySelectorAll('[data-sets]').forEach((b) => b.addEventListener('click', () => {
      m.querySelector('#ql-sets').value = b.dataset.sets;
      updateXpHint();
    }));
    m.querySelector('#ql-sets')?.addEventListener('input', updateXpHint);
    m.querySelector('#ql-form')?.addEventListener('submit', submit);
  };

  const updateXpHint = () => {
    const sets = Math.max(1, Math.min(20, num(m.querySelector('#ql-sets')?.value, 1)));
    const el = m.querySelector('#ql-xp');
    if (el) el.textContent = `+${sets * XP.perSet}`;
  };

  const submit = (e) => {
    e.preventDefault();
    const s = store.get();
    const ex = getExercise(view.exId);
    const reps = num(m.querySelector('#ql-reps').value);
    const sets = Math.max(1, Math.min(20, num(m.querySelector('#ql-sets').value, 1)));
    const weight = num(m.querySelector('#ql-weight')?.value);
    const day = m.querySelector('#ql-date').value || toISODate();
    if (!reps || reps < 1) return toast(`Bitte ${unitLabel(ex)} eintragen.`, 'warn');
    if (needsWeight(ex) && !weight) return toast('Bitte das Gewicht eintragen.', 'warn');
    const record = day === toISODate() && isNewRecord(s, view.exId, { weight, reps });
    store.update((st) => addQuickSets(st, { exId: view.exId, reps, weight, sets, date: day, records: record ? 1 : 0 }));
    store.saveNow();
    closeModal();
    const what = `${sets > 1 ? `${sets} × ` : ''}${reps}${weight ? ` × ${fmtKg(weight)}` : ''} ${ex.name}`;
    if (record) {
      confetti({ count: 90 });
      toast(`Bestleistung! ${what} · +${sets * XP.perSet + XP.pr} XP`, 'ok');
    } else {
      toast(`${what} eingetragen · +${sets * XP.perSet} XP`, 'ok');
    }
    after();
  };

  render();
  return m;
}

function pickerHTML(view) {
  const s = store.get();
  const q = view.q.trim().toLowerCase();
  const recent = recentQuickExercises(s, 6).map((id) => getExercise(id)).filter(Boolean);
  const quick = [...recent, ...SUGGESTIONS.map((id) => getExercise(id)).filter(Boolean)]
    .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
    .slice(0, 8);
  const results = q
    ? EXERCISES.filter((e) => e.name.toLowerCase().includes(q) || e.en.toLowerCase().includes(q))
      .sort((a, b) => Number(isAvailable(b, s.profile)) - Number(isAvailable(a, s.profile)))
      .slice(0, 25)
    : [];
  return `<p class="muted small">Einzelne Sätze festhalten, ohne ein Training zu starten. Zählt für Volumen, Bestleistungen, XP und deine Serie.</p>
    <div class="chips">${quick.map((e) => `<button class="chip-btn" data-pick="${e.id}">${icon('bolt', { size: 15 })} ${esc(e.name)}</button>`).join('')}</div>
    <label class="field"><span>Andere Übung suchen</span><input id="ql-q" class="search" placeholder="z. B. Liegestütze, Kniebeuge …" value="${esc(view.q)}" autocomplete="off"></label>
    ${q ? (results.length
      ? `<ul class="list tappable">${results.map((e) => `<li><button class="link" data-pick="${e.id}"><strong>${esc(e.name)}</strong><div class="muted small">${esc(e.en)}${e.load === 'bw' ? ' · Körpergewicht' : ''}</div></button></li>`).join('')}</ul>`
      : '<p class="muted">Nichts gefunden.</p>') : ''}`;
}

function formHTML(view) {
  const s = store.get();
  const ex = getExercise(view.exId);
  const today = toISODate();
  const chips = isTime(ex) ? TIME_CHIPS : REP_CHIPS;
  const pr = personalRecords(s.workouts).find((r) => r.exId === view.exId);
  const lastEntry = quickLogSummary(s, view.date).find((e) => e.exId === view.exId);
  const week = repsInPeriod(s, view.exId, addDays(today, -6), today);
  return `<div class="ql-head">
      <div><strong>${esc(ex.name)}</strong><div class="muted small">${esc(ex.en)}${pr ? ` · Bestleistung ${pr.e1rm ? `${fmtKg(pr.weight)} × ${pr.reps}` : `${pr.reps} ${isTime(ex) ? 'Sekunden' : 'Wdh.'}`}` : ''}</div></div>
      <button class="btn btn-small btn-ghost" type="button" data-act="change">Ändern</button>
    </div>
    <form id="ql-form" class="form">
      <label class="field"><span>${unitLabel(ex)}</span><input id="ql-reps" type="number" inputmode="numeric" min="1" max="999" required value="${lastEntry?.reps || ''}" placeholder="z. B. 10"></label>
      <div class="chips">${chips.map((n) => `<button type="button" class="chip-btn" data-reps="${n}">${n}</button>`).join('')}</div>
      <div class="grid2">
        <label class="field"><span>Sätze</span><input id="ql-sets" type="number" inputmode="numeric" min="1" max="20" value="1"></label>
        ${needsWeight(ex)
          ? `<label class="field"><span>Gewicht (kg)</span><input id="ql-weight" type="number" inputmode="decimal" step="0.5" min="0" value="${lastEntry?.weight || ''}"></label>`
          : isTime(ex) ? '' : `<label class="field"><span>Zusatzgewicht (kg, optional)</span><input id="ql-weight" type="number" inputmode="decimal" step="0.5" min="0" value="${lastEntry?.weight || ''}"></label>`}
      </div>
      <div class="chips">${[1, 2, 3, 4].map((n) => `<button type="button" class="chip-btn" data-sets="${n}">${n} ${n > 1 ? 'Sätze' : 'Satz'}</button>`).join('')}</div>
      <label class="field"><span>Datum</span><input id="ql-date" type="date" value="${view.date}" max="${today}"></label>
      <div class="row end"><button class="btn btn-primary btn-big" type="submit">${icon('check', { size: 18 })} Eintragen · <span id="ql-xp">+${XP.perSet}</span> XP</button></div>
      ${lastEntry ? `<p class="hint">Heute schon eingetragen: ${lastEntry.sets} × ${lastEntry.reps}${lastEntry.weight ? ` × ${fmtKg(lastEntry.weight)}` : ''} (${lastEntry.totalReps} gesamt).</p>` : ''}
      ${week ? `<p class="hint">Letzte 7 Tage: ${week} ${isTime(ex) ? 'Sekunden' : 'Wiederholungen'} insgesamt.</p>` : ''}
    </form>`;
}

// Karte „Heute eingetragen“ für die Startseite. Leerer String, wenn nichts eingetragen wurde.
export function quickLogCardHTML(s, date = toISODate()) {
  const items = quickLogSummary(s, date);
  if (!items.length) return '';
  const total = items.reduce((a, e) => a + e.totalReps, 0);
  return `<div class="card">
    <div class="row between"><div class="card-title">${icon('bolt', { size: 16 })} Heute eingetragen</div><button class="btn btn-small btn-ghost" data-act="quicklog">${icon('plus', { size: 16 })} Mehr</button></div>
    <ul class="ql-list">
      ${items.map((e) => {
        const ex = getExercise(e.exId);
        const time = ex?.load === 'time';
        return `<li>
          <span class="ql-name"><strong>${esc(ex?.name || e.exId)}</strong><span class="muted small">${e.equal ? `${e.sets} × ${e.reps}` : `${e.sets} Sätze`}${e.weight ? ` × ${fmtKg(e.weight)}` : ''} · ${e.totalReps} ${time ? 'Sekunden' : 'Wdh.'} gesamt</span></span>
          <button class="btn-icon" data-ql-del="${esc(e.exId)}" aria-label="${esc(ex?.name || e.exId)} löschen">${icon('trash', { size: 16 })}</button>
        </li>`;
      }).join('')}
    </ul>
    <p class="muted small">${total} Wiederholungen gesamt · zählt für Volumen, Bestleistungen und XP.</p>
  </div>`;
}

// Klick-Handler für die Karte (Löschen + „Mehr“), gemeinsam genutzt von Heute und anderen Seiten.
export function bindQuickLogCard(root, { date = toISODate(), after = () => {} } = {}) {
  root.querySelectorAll('[data-act="quicklog"]').forEach((b) => b.addEventListener('click', () => openQuickLog({ date, after })));
  root.querySelectorAll('[data-ql-del]').forEach((b) => b.addEventListener('click', async () => {
    const ex = getExercise(b.dataset.qlDel);
    if (!(await confirmDialog(`„${ex?.name || b.dataset.qlDel}“ aus dem heutigen Schnelleintrag entfernen?`, { ok: 'Entfernen', danger: true }))) return;
    store.update((st) => removeQuickEntry(st, date, b.dataset.qlDel));
    store.saveNow();
    toast('Eintrag entfernt.');
    after();
  }));
}

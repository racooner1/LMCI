// Bestleistungen: Kraft-Rang, Rekord-Serie, nächste Ziele, Rangliste je Übung, Chronik und Detail-Ansicht.
import { html, raw, esc, openModal, fmtKg } from './dom.js';
import * as store from '../state.js';
import { lineChart } from './charts.js';
import { e1rmHistory } from '../engine/analytics.js';
import { getExercise } from '../data/exercises.js';
import { formatDate, fromISODate, toISODate } from '../engine/util.js';
import { RANKS, rankLadder, recordBoard } from '../engine/records.js';
import { XP } from '../engine/goals.js';
import { icon } from './icons.js';
import { medal } from './celebrate.js';
import { openExerciseInfo } from './uebungen.js';

let sortMode = 'rang';
let showAll = false;

const fmt1 = (v) => (Math.round(v * 10) / 10).toString().replace('.', ',');
const fmtVal = (t) => (t.unit === 'kg' ? `${fmt1(t.target)} kg` : `${t.target} ${t.unit}`);
const fmtGap = (t) => (t.unit === 'kg' ? `${fmt1(t.gap)} kg` : `${t.gap} ${t.unit}`);
const pct = (t) => Math.min(99, Math.floor(Math.min(1, t.progress) * 100));
// Beschreibung eines Ziels: „noch 0,7 kg e1RM bis zum 140-kg-Club“, „Rang Gold ab 64 kg e1RM · noch 6,1 kg“
const targetText = (t) => {
  const e1 = t.unit === 'kg' ? ' e1RM' : '';
  if (t.kind === 'rank') return `Rang ${t.label} ab ${fmtVal(t)}${e1} · noch ${fmtGap(t)}`;
  if (t.kind === 'bw') return `${t.label} (${fmtVal(t)}${e1}) · noch ${fmtGap(t)}`;
  return `noch ${fmtGap(t)}${e1} bis ${t.unit === 'kg' ? 'zum' : 'zu'} ${t.label}`;
};
const perfText = (r) => (r.mode === 'kg' ? `${fmtKg(r.weight)} × ${r.reps}` : `${r.reps} ${getExercise(r.exId)?.load === 'time' ? 's' : 'Wdh.'}`);
const deltaText = (ev) => (ev.mode === 'kg' ? `+${fmt1(ev.delta)} kg e1RM` : `+${ev.delta} ${getExercise(ev.exId)?.load === 'time' ? 's' : 'Wdh.'}`);

function weekLabel(iso) {
  const d = fromISODate(iso);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

// Karte „Bestleistungen“ auf der Erfolge-Seite. Gibt HTML zurück; bind() hängt die Events an.
export function recordsCard(board, s) {
  const { overall, streak, records, targets, events } = board;
  const hasProfile = !!s.profile;
  const recent = events.filter((e) => e.kind === 'improve').slice(-6).reverse();
  const sorted = sortMode === 'neu' ? [...records].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)) : records;
  const shown = showAll ? sorted : sorted.slice(0, 8);
  const streakText = streak.weeks === 0
    ? 'Noch keine Serie – eine Steigerung diese Woche startet sie.'
    : streak.atRisk
      ? `Serie läuft – noch ${streak.daysLeft === 0 ? 'heute' : `${streak.daysLeft} Tag${streak.daysLeft === 1 ? '' : 'e'}`} Zeit für eine Steigerung, sonst reißt sie.`
      : `Diese Woche schon gesichert. Beste Serie: ${streak.best} Woche${streak.best === 1 ? '' : 'n'}.`;

  return html`
    <div class="card records-card">
      <div class="row between"><div class="card-title">Bestleistungen</div><span class="muted small">${records.length} Übung${records.length === 1 ? '' : 'en'} · ${board.improvements} Steigerung${board.improvements === 1 ? '' : 'en'}</span></div>

      ${records.length ? html`
      <div class="records-hero ${overall ? overall.id : 'none'}">
        <div class="records-hero-top">
          ${raw(medal(overall, { size: 'l' }))}
          <div class="records-hero-text">
            <div class="records-hero-label">Kraft-Rang</div>
            <div class="records-hero-rank">${overall ? overall.name : 'Ohne Rang'}</div>
            <div class="small">${overall ? html`${overall.score} Punkte${overall.next ? ` · ${overall.next.name} ab ${overall.next.min}` : ' · höchster Rang'}` : hasProfile ? 'Noch keine Übung mit Vergleichswert – Grundübungen mit Gewicht loggen.' : 'Profil anlegen, dann gibt es Ränge.'}</div>
          </div>
          ${overall?.next ? html`<div class="records-hero-next"><span class="records-hero-label">Nächster</span>${raw(medal(overall.next, { size: 's' }))}</div>` : ''}
        </div>
        ${overall ? html`<div class="rank-bar big"><div class="${overall.id}" style="width:${(overall.progress * 100).toFixed(0)}%"></div></div>
        <div class="small">${overall.next ? `Noch ${overall.toNext} Punkte bis ${overall.next.name}` : 'Diamant – stärker geht es in dieser Skala nicht.'} · 100 Punkte = Fortgeschritten bei deinem Körpergewicht</div>` : ''}
        <div class="records-stats">
          <div class="records-stat ${streak.weeks > 0 && !streak.atRisk ? 'hot' : streak.atRisk ? 'risk' : ''}">${raw(icon('flame', { size: 22 }))}<strong data-count="${streak.weeks}">${streak.weeks}</strong><span>Wochen Serie</span></div>
          <div class="records-stat">${raw(icon('up', { size: 22 }))}<strong data-count="${board.thisWeek}">${board.thisWeek}</strong><span>diese Woche</span></div>
          <div class="records-stat">${raw(icon('timer', { size: 22 }))}<strong>${board.daysSince == null ? '–' : board.daysSince === 0 ? 'heute' : `${board.daysSince} T.`}</strong><span>seit letzter</span></div>
        </div>
      </div>
      <div class="record-weeks" aria-label="Steigerungen je Woche">
        ${board.weeks.map((w) => html`<div class="record-week ${w.count ? 'hit' : ''} ${w.current ? 'current' : ''}" title="Woche ab ${weekLabel(w.weekStart)}: ${w.count} Steigerung${w.count === 1 ? '' : 'en'}"><i>${w.count ? raw(icon('trophy', { size: 12 })) : ''}</i><span>${weekLabel(w.weekStart)}</span></div>`)}
      </div>
      <p class="small ${streak.atRisk ? 'warn-text' : 'muted'}">${streakText} Zählt jede Woche, in der du eine Bestleistung schlägst.</p>

      ${targets.length ? html`<div class="card-title" style="margin-top:6px">Nächste Ziele</div>
      <div class="targets">${targets.map((t) => html`<button class="target" data-rec="${t.exId}">
        <span class="target-icon">${raw(icon(t.kind === 'rank' ? 'trophy' : t.kind === 'bw' ? 'scale' : 'weight', { size: 18 }))}</span>
        <span class="target-text"><strong>${t.name}</strong><span>${targetText(t)}</span><span class="target-bar"><div style="width:${pct(t)}%"></div></span></span>
        <span class="target-pct">${pct(t)}%</span>
      </button>`)}</div>` : ''}

      <div class="row between" style="margin-top:6px"><div class="card-title">Rangliste</div>
        <div class="tabs mini"><button class="tab ${sortMode === 'rang' ? 'active' : ''}" data-sort="rang">Stärkste</button><button class="tab ${sortMode === 'neu' ? 'active' : ''}" data-sort="neu">Neueste</button></div></div>
      <div class="record-list">${shown.map((r) => recordRow(r))}</div>
      ${sorted.length > 8 ? html`<button class="btn btn-small btn-ghost" data-act="toggle-all">${showAll ? 'Weniger anzeigen' : `Alle ${sorted.length} anzeigen`}</button>` : ''}

      ${recent.length ? html`<div class="card-title" style="margin-top:6px">Chronik</div>
      <ul class="chronicle">${recent.map((ev) => html`<li><span class="chronicle-date">${formatDate(ev.date)}</span><span class="chronicle-text"><strong>${ev.name}</strong> ${deltaText(ev)}${ev.rankUp ? html` <span class="rankup-tag ${ev.rank.id}">↑ ${ev.rank.name}</span>` : ''}</span><span class="chronicle-val">${perfText(ev)}</span></li>`)}</ul>` : ''}
      <p class="muted small">Ränge vergleichen dein geschätztes 1RM (Epley aus Gewicht × Wiederholungen) mit dem Referenzwert eines Fortgeschrittenen bei deinem Körpergewicht, Geschlecht und Alter: Bronze, ab 55 Punkten Silber, 80 Gold, 105 Platin, 130 Diamant. Körpergewichtsübungen zählen Wiederholungen. Jede Steigerung bringt +${XP.pr} XP, jeder Rangaufstieg +${XP.rankUp} XP.</p>
      ` : html`<div class="records-empty">${raw(medal(null, { size: 'l' }))}<div><strong>Noch keine Bestleistung.</strong><p class="muted small">Nach dem ersten Training erscheinen hier Ränge von Bronze bis Diamant, eine Rekord-Serie wie bei der Flamme und deine nächsten Ziele.</p></div></div>`}
    </div>`;
}

function recordRow(r) {
  return html`<button class="record ${r.isNew ? 'new' : ''}" data-rec="${r.exId}">
    ${raw(medal(r.rank))}
    <span class="record-text">
      <strong>${r.name}${r.isNew ? html` <span class="new-tag static">NEU</span>` : ''}</strong>
      <span>${r.rank ? `${r.rank.name} · ${r.score} P.` : 'Ohne Rang'} · ${formatDate(r.date)}${r.improvements ? ` · ${r.improvements}× gesteigert` : ' · erster Eintrag'}</span>
      ${r.rank ? html`<span class="rank-bar"><div class="${r.rank.id}" style="width:${(r.rank.progress * 100).toFixed(0)}%"></div></span>` : ''}
    </span>
    <span class="record-val"><strong>${perfText(r)}</strong>${r.mode === 'kg' ? html`<span class="muted small">e1RM ${fmt1(r.e1rm)} kg</span>` : ''}${r.lastDelta ? html`<span class="delta">+${r.mode === 'kg' ? `${fmt1(r.lastDelta)} kg` : r.lastDelta}</span>` : ''}</span>
  </button>`;
}

export function bindRecordsCard(root, rerender) {
  root.querySelectorAll('[data-sort]').forEach((b) => b.addEventListener('click', () => {
    sortMode = b.dataset.sort;
    rerender();
  }));
  root.querySelector('[data-act="toggle-all"]')?.addEventListener('click', () => {
    showAll = !showAll;
    rerender();
  });
  root.querySelectorAll('[data-rec]').forEach((b) => b.addEventListener('click', () => openRecordDetail(b.dataset.rec)));
}

// Detail einer Bestleistung: Rang, Rangleiter, Ziele, 1RM-Verlauf, Chronik.
export function openRecordDetail(exId) {
  const s = store.get();
  const board = recordBoard(s, toISODate());
  const r = board.records.find((x) => x.exId === exId);
  const ex = getExercise(exId);
  if (!r || !ex) return;
  const ladder = rankLadder(ex, s.profile);
  const cur = r.mode === 'kg' ? r.e1rm : r.reps;
  const e1 = e1rmHistory(s.workouts, exId);
  const m = openModal(
    `<div class="record-detail">
      <div class="records-hero ${r.rank ? r.rank.id : 'none'}">
        <div class="records-hero-top">
          ${medal(r.rank, { size: 'l' })}
          <div class="records-hero-text">
            <div class="records-hero-label">${r.rank ? `Rang · ${r.score} Punkte` : 'Ohne Rang'}</div>
            <div class="records-hero-rank">${r.rank ? esc(r.rank.name) : esc(perfText(r))}</div>
            <div class="small">${esc(perfText(r))}${r.mode === 'kg' ? ` · e1RM ${fmt1(r.e1rm)} kg` : ''} · ${formatDate(r.date)}</div>
          </div>
        </div>
        ${r.rank ? `<div class="rank-bar big"><div class="${r.rank.id}" style="width:${(r.rank.progress * 100).toFixed(0)}%"></div></div><div class="small">${r.rank.next ? `Noch ${r.rank.toNext} Punkte bis ${esc(r.rank.next.name)}` : 'Höchster Rang erreicht'}</div>` : `<div class="small">${s.profile ? 'Für diese Übung gibt es keinen Vergleichswert – die Bestleistung zählt trotzdem.' : 'Ohne Profil keine Ränge.'}</div>`}
      </div>
      ${ladder.length ? `<div class="card-title">Rangleiter</div><ol class="ladder">${ladder.map((l) => `<li class="${cur >= l.threshold ? 'reached' : ''} ${r.rank?.id === l.id ? 'current' : ''}">${medal(l, { size: 's' })}<span class="ladder-name">${esc(l.name)}</span><span class="ladder-val">${l.unit === 'kg' ? `${fmt1(l.threshold)} kg` : `${l.threshold} ${l.unit}`}</span><span class="ladder-check">${cur >= l.threshold ? icon('check', { size: 16 }) : ''}</span></li>`).join('')}</ol>` : ''}
      ${r.targets.length ? `<div class="card-title">Nächste Ziele</div><div class="targets">${r.targets.map((t) => `<div class="target static"><span class="target-icon">${icon(t.kind === 'rank' ? 'trophy' : t.kind === 'bw' ? 'scale' : 'weight', { size: 18 })}</span><span class="target-text"><strong>${t.kind === 'rank' ? `Rang ${esc(t.label)}` : esc(t.label)}</strong><span>${esc(targetText(t))}</span><span class="target-bar"><div style="width:${pct(t)}%"></div></span></span><span class="target-pct">${pct(t)}%</span></div>`).join('')}</div>` : ''}
      ${e1.length > 1 ? `<div class="card-title">Verlauf geschätztes 1RM</div>${lineChart(e1.map((p) => ({ label: formatDate(p.date, { weekday: false }), y: p.e1rm })), { unit: ' kg' })}` : ''}
      <div class="card-title">Chronik</div>
      <ul class="chronicle">${[...r.events].reverse().map((ev) => `<li><span class="chronicle-date">${formatDate(ev.date)}</span><span class="chronicle-text">${ev.kind === 'first' ? 'Erster Eintrag' : esc(deltaText(ev))}${ev.rankUp ? ` <span class="rankup-tag ${ev.rank.id}">↑ ${esc(ev.rank.name)}</span>` : ''}</span><span class="chronicle-val">${esc(perfText(ev))}</span></li>`).join('')}</ul>
      <div class="row gap"><button class="btn btn-small" data-act="ex-info">${icon('info', { size: 16 })} Übung ansehen</button><a class="btn btn-small btn-ghost" href="#/uebungen/${esc(exId)}" data-close-modal>Bibliothek</a></div>
    </div>`,
    { title: ex.name },
  );
  m.querySelector('[data-act="ex-info"]').addEventListener('click', () => openExerciseInfo(exId));
  return m;
}

// Kurzzeile für die Startseite („Diese Woche“).
export function recordsWeekLine(board) {
  if (!board.records.length) return '';
  const { streak } = board;
  const n = board.thisWeek;
  const serie = streak.weeks ? `Rekord-Serie ${streak.weeks} Woche${streak.weeks === 1 ? '' : 'n'}` : 'keine Rekord-Serie';
  if (n) return `${n} Steigerung${n === 1 ? '' : 'en'} diese Woche · ${serie}`;
  if (streak.atRisk) return `${serie} – diese Woche noch keine Steigerung${streak.daysLeft <= 1 ? ', letzte Chance' : ''}`;
  return `Noch keine Steigerung diese Woche · ${serie}`;
}

export { RANKS };

// Routine: eigene Quests/Gewohnheiten planen, abhaken und Serien verfolgen.
import { html, raw, esc, toast, openModal, closeModal, confirmDialog, num, haptic } from './dom.js';
import * as store from '../state.js';
import { toISODate, addDays, startOfWeek, weekdayIndex, formatDate, WEEKDAYS, WEEKDAYS_LONG } from '../engine/util.js';
import {
  DAYPARTS, DAYPART_BY_ID, ROUTINE_TEMPLATES, ROUTINE_XP_CHOICES, MAX_ROUTINES,
  makeRoutine, scheduleLabel, activeRoutines, routinesForDay, routineDayStatus, routineStreak, routineStats, toggleRoutine,
} from '../engine/routines.js';
import { icon } from './icons.js';
import { confetti } from './celebrate.js';
import { animateAll } from './motion.js';
import { ring } from './charts.js';

const ICON_CHOICES = ['check', 'tooth', 'drop', 'bed', 'pill', 'sun', 'moon', 'food', 'run', 'stretch', 'book', 'note', 'leaf', 'phone', 'home', 'chat', 'heart', 'target', 'smile', 'star', 'calendar', 'timer', 'bolt', 'repeat', 'dumbbell', 'trophy'];
const HISTORY_DAYS = 14;

let selected = null; // angezeigter Tag (nie in der Zukunft)

export function currentDate() {
  const today = toISODate();
  if (!selected || selected > today) selected = today;
  return selected;
}

// Eine Gewohnheit für einen Tag abhaken – ohne die Seite neu zu bauen (Scrollposition bleibt).
export function toggleQuest(id, date, { silent = true } = {}) {
  const s = store.get();
  const r = (s.routines || []).find((x) => x.id === id);
  let nowDone = false;
  haptic();
  store.update((st) => (nowDone = toggleRoutine(st, id, date)), { silent });
  store.saveNow();
  if (nowDone) toast(`${r?.name || 'Erledigt'} · +${r?.xp || 0} XP`, 'ok');
  return nowDone;
}

// Ganze Routine des Tages geschafft: einmal pro Tag feiern.
export function celebrateRoutineDay(s, date) {
  const st = routineDayStatus(s, date);
  if (!st.all || date !== toISODate()) return;
  if (s.meta?.celebrated?.routineDay === date) return;
  store.update((x) => {
    x.meta.celebrated ||= {};
    x.meta.celebrated.routineDay = date;
  }, { silent: true });
  store.saveNow();
  confetti({ count: 90 });
  toast('Routine komplett – alles abgehakt!', 'ok');
}

export function questRow(r, { date, showStreak = true } = {}) {
  const s = store.get();
  const streak = showStreak ? routineStreak(s, r, date) : 0;
  return `<button class="quest ${r.done ? 'done' : ''}" data-quest="${esc(r.id)}" aria-pressed="${r.done}">
    <span class="quest-check">${icon('check', { size: 20 })}</span>
    <span class="quest-icon">${icon(r.icon, { size: 20 })}</span>
    <span class="quest-text"><strong>${esc(r.name)}</strong><span>${esc(r.weekTarget ? `${r.weekDone}/${r.weekTarget} diese Woche` : scheduleLabel(r))}${r.reminder ? ` · ${esc(r.reminder)} Uhr` : ''}${r.counts ? '' : ' · zählt nicht für den perfekten Tag'}</span></span>
    <span class="quest-right">${streak >= 2 ? `<span class="quest-streak">${icon('flame', { size: 14 })}${streak}</span>` : ''}<span class="xp-chip">+${r.xp}</span></span>
  </button>`;
}

export function renderRoutine(root) {
  const s = store.get();
  const today = toISODate();
  const date = currentDate();
  const ws = startOfWeek(date);
  const routines = activeRoutines(s);
  const day = routineDayStatus(s, date);
  const byPart = DAYPARTS.map((p) => ({ ...p, items: day.items.filter((r) => r.daypart === p.id) })).filter((p) => p.items.length);
  const focusRoutine = s.settings?.focus === 'routine';
  const bestStreak = Math.max(0, ...routines.map((r) => routineStreak(s, r, today)), 0);
  const doneTotal = Object.values(s.routineLog || {}).reduce((a, l) => a + (l?.length || 0), 0);

  root.innerHTML = String(html`
    <section class="page">
      <header class="page-head">
        <div><h1>Routine</h1><p class="muted">${routines.length ? `${routines.length} Gewohnheit${routines.length === 1 ? '' : 'en'} · ${doneTotal} mal erledigt${bestStreak >= 2 ? ` · längste Serie aktuell ${bestStreak} Tage` : ''}` : 'Deine Quests für den Alltag – Zähne putzen, lesen, trinken …'}</p></div>
        <button class="btn btn-primary" data-act="add">${raw(icon('plus', { size: 18 }))} Gewohnheit</button>
      </header>

      ${routines.length ? html`
      <div class="card card-hero routine-hero">
        <div class="routine-hero-main">
          ${raw(ring(day.done, Math.max(1, day.total), { label: date === today ? 'heute' : formatDate(date, { weekday: false }) }))}
          <div>
            <h2>${day.total === 0 ? 'Heute frei' : day.all ? 'Alles abgehakt' : `${day.total - day.done} offen`}</h2>
            <p class="small">${date === today ? WEEKDAYS_LONG[weekdayIndex(date)] : formatDate(date)} · ${day.done} von ${day.total} erledigt</p>
            <p class="muted small">${focusRoutine ? 'Fokus: Routine – deine Gewohnheiten zählen für den perfekten Tag, Training ist optional.' : 'Fokus: Training & Routine – beides zählt für den perfekten Tag.'}</p>
          </div>
        </div>
        <div class="week-picker" role="group" aria-label="Woche">
          <button class="btn-icon" data-week="-1" aria-label="Woche zurück">${raw(icon('left', { size: 18 }))}</button>
          ${WEEKDAYS.map((n, i) => {
            const d = addDays(ws, i);
            const st = routineDayStatus(s, d);
            const future = d > today;
            return html`<button class="wp-day ${d === date ? 'sel' : ''} ${d === today ? 'today' : ''} ${future ? 'future' : ''} ${st.total && st.all ? 'all' : st.done ? 'part' : ''}" data-date="${d}" ${future ? 'disabled' : ''}>
              <span>${n}</span><i style="--p:${Math.round(st.progress * 100)}%"></i><span class="wp-num">${st.total ? `${st.done}/${st.total}` : '–'}</span>
            </button>`;
          })}
          <button class="btn-icon" data-week="1" aria-label="Woche vor" ${addDays(ws, 7) > today ? 'disabled' : ''}>${raw(icon('right', { size: 18 }))}</button>
        </div>
        ${date !== today ? html`<p class="small"><button class="btn btn-small btn-ghost" data-act="today">Zurück zu heute</button> Du trägst gerade für ${formatDate(date)} nach.</p>` : ''}
      </div>

      ${byPart.map((p) => html`<div class="card">
        <div class="row between"><div class="card-title">${raw(icon(p.icon, { size: 18 }))} ${p.name}</div><span class="muted small">${p.items.filter((r) => r.done).length}/${p.items.length}</span></div>
        <div class="quests">${raw(p.items.map((r) => questRow(r, { date })).join(''))}</div>
      </div>`)}

      ${day.total === 0 ? html`<div class="card"><p class="muted">Für diesen Tag ist nichts geplant. Genieß die Pause – oder plane eine Gewohnheit für heute ein.</p></div>` : ''}

      <div class="card">
        <div class="row between"><div class="card-title">Letzte ${HISTORY_DAYS} Tage</div><span class="muted small">Tippen zum Nachtragen</span></div>
        <div class="habit-grid" style="--cols:${HISTORY_DAYS}">
          ${routines.map((r) => html`<div class="habit-row">
            <span class="habit-name">${raw(icon(r.icon, { size: 16 }))} ${r.name}</span>
            <span class="habit-cells">${Array.from({ length: HISTORY_DAYS }, (_, k) => {
              const d = addDays(today, -(HISTORY_DAYS - 1 - k));
              const planned = routinesForDay(s, d).some((x) => x.id === r.id);
              const done = (s.routineLog?.[d] || []).includes(r.id);
              return html`<button class="habit-cell ${done ? 'done' : planned ? 'open' : 'off'}" data-cell="${r.id}" data-cell-date="${d}" title="${formatDate(d)} · ${r.name}" aria-label="${r.name} am ${formatDate(d)}"></button>`;
            })}</span>
          </div>`)}
        </div>
        <div class="habit-legend"><span><i class="done"></i> erledigt</span><span><i class="open"></i> geplant, offen</span><span><i class="off"></i> nicht geplant</span></div>
      </div>

      <div class="card">
        <div class="card-title">Meine Gewohnheiten</div>
        <ul class="routine-manage">
          ${routines.map((r, i) => {
            const st = routineStats(s, r, today);
            return html`<li>
              <span class="rm-icon">${raw(icon(r.icon, { size: 18 }))}</span>
              <span class="rm-text"><strong>${r.name}</strong><span class="muted small">${scheduleLabel(r)} · ${DAYPART_BY_ID[r.daypart]?.name} · +${r.xp} XP${r.reminder ? ` · ${r.reminder} Uhr` : ''}</span>
                <span class="rm-stats">${raw(icon('flame', { size: 13 }))} ${st.streak} · ${Math.round(st.rate * 100)} % (30 T.) · ${st.total}× gesamt</span></span>
              <span class="rm-actions">
                <button class="btn-icon" data-move="${r.id}" data-dir="-1" aria-label="Nach oben" ${i === 0 ? 'disabled' : ''}>${raw(icon('up', { size: 16 }))}</button>
                <button class="btn-icon" data-move="${r.id}" data-dir="1" aria-label="Nach unten" ${i === routines.length - 1 ? 'disabled' : ''}>${raw(icon('down', { size: 16 }))}</button>
                <button class="btn-icon" data-edit="${r.id}" aria-label="Bearbeiten">${raw(icon('note', { size: 16 }))}</button>
              </span>
            </li>`;
          })}
        </ul>
        <div class="row gap wrap"><button class="btn" data-act="add">${raw(icon('plus', { size: 16 }))} Gewohnheit hinzufügen</button><button class="btn btn-ghost" data-act="focus">${raw(icon('settings', { size: 16 }))} Fokus: ${focusRoutine ? 'nur Routine' : 'Training & Routine'}</button></div>
      </div>` : html`
      <div class="card card-accent">
        <div class="card-title">Mach LMCI zu deiner Routine-App</div>
        <p>Lege Gewohnheiten an – Zähne putzen, Wasser trinken, lesen, früh ins Bett. Sie erscheinen als Quests auf „Heute“, geben XP, zählen für Serien, Abzeichen und den perfekten Tag.</p>
        <div class="row gap wrap"><button class="btn btn-primary btn-big" data-act="add">${raw(icon('plus', { size: 18 }))} Erste Gewohnheit</button><button class="btn" data-act="starter">Starter-Set übernehmen</button></div>
        <p class="muted small">Starter-Set: Zähne putzen (morgens & abends), Glas Wasser nach dem Aufstehen, 20 Minuten lesen, pünktlich ins Bett.</p>
      </div>
      <div class="card">
        <div class="card-title">Beliebte Vorlagen</div>
        <div class="chips">${ROUTINE_TEMPLATES.slice(0, 12).map((t) => html`<button class="chip-btn" data-tpl="${t.name}">${raw(icon(t.icon, { size: 16 }))} ${t.name}</button>`)}</div>
      </div>`}
    </section>`);

  const refresh = () => {
    const y = window.scrollY;
    renderRoutine(root);
    window.scrollTo({ top: y });
  };

  root.querySelectorAll('[data-quest]').forEach((b) => b.addEventListener('click', () => {
    toggleQuest(b.dataset.quest, date);
    celebrateRoutineDay(store.get(), date);
    refresh();
  }));
  root.querySelectorAll('[data-cell]').forEach((b) => b.addEventListener('click', () => {
    toggleQuest(b.dataset.cell, b.dataset.cellDate);
    celebrateRoutineDay(store.get(), b.dataset.cellDate);
    refresh();
  }));
  root.querySelectorAll('[data-date]').forEach((b) => b.addEventListener('click', () => {
    selected = b.dataset.date;
    refresh();
  }));
  root.querySelectorAll('[data-week]').forEach((b) => b.addEventListener('click', () => {
    const next = addDays(date, Number(b.dataset.week) * 7);
    selected = next > today ? today : next;
    refresh();
  }));
  root.querySelector('[data-act="today"]')?.addEventListener('click', () => {
    selected = today;
    refresh();
  });
  root.querySelectorAll('[data-act="add"]').forEach((b) => b.addEventListener('click', () => openQuestPicker(refresh)));
  root.querySelector('[data-act="starter"]')?.addEventListener('click', () => {
    const names = ['Zähne putzen (morgens)', 'Glas Wasser nach dem Aufstehen', '20 Minuten lesen', 'Zähne putzen (abends)', 'Pünktlich ins Bett'];
    addRoutines(ROUTINE_TEMPLATES.filter((t) => names.includes(t.name)));
    toast('Starter-Set angelegt. Jederzeit anpassbar.', 'ok');
    refresh();
  });
  root.querySelectorAll('[data-tpl]').forEach((b) => b.addEventListener('click', () => {
    const tpl = ROUTINE_TEMPLATES.find((t) => t.name === b.dataset.tpl);
    if (tpl) {
      addRoutines([tpl]);
      toast(`„${tpl.name}“ hinzugefügt.`, 'ok');
      refresh();
    }
  }));
  root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openQuestForm(store.get().routines.find((r) => r.id === b.dataset.edit), refresh)));
  root.querySelectorAll('[data-move]').forEach((b) => b.addEventListener('click', () => {
    moveRoutine(b.dataset.move, Number(b.dataset.dir));
    refresh();
  }));
  root.querySelector('[data-act="focus"]')?.addEventListener('click', () => openFocusDialog(refresh));
  animateAll(root);
}

export function addRoutines(list) {
  store.update((st) => {
    st.routines ||= [];
    for (const t of list) {
      if (st.routines.filter((r) => !r.archived).length >= MAX_ROUTINES) break;
      st.routines.push(makeRoutine(t));
    }
  });
}

function moveRoutine(id, dir) {
  store.update((st) => {
    const i = st.routines.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= st.routines.length) return;
    [st.routines[i], st.routines[j]] = [st.routines[j], st.routines[i]];
  });
}

// Auswahl: Vorlage nehmen oder eigene Gewohnheit anlegen.
export function openQuestPicker(after = () => {}) {
  const m = openModal(
    `<p class="muted small">Vorlage antippen – oder unten eine eigene Gewohnheit anlegen. Alles lässt sich danach anpassen.</p>
     ${DAYPARTS.map((p) => `<h3 class="tpl-head">${icon(p.icon, { size: 16 })} ${p.name}</h3>
       <div class="chips">${ROUTINE_TEMPLATES.filter((t) => t.daypart === p.id).map((t) => `<button class="chip-btn" data-tpl="${esc(t.name)}">${icon(t.icon, { size: 16 })} ${esc(t.name)}</button>`).join('')}</div>`).join('')}
     <div class="row end gap" style="margin-top:14px"><button class="btn btn-primary" data-act="custom">${icon('plus', { size: 16 })} Eigene Gewohnheit</button></div>`,
    { title: 'Gewohnheit hinzufügen' },
  );
  m.querySelectorAll('[data-tpl]').forEach((b) => b.addEventListener('click', () => {
    const tpl = ROUTINE_TEMPLATES.find((t) => t.name === b.dataset.tpl);
    closeModal();
    openQuestForm(makeRoutine(tpl), after, { isNew: true });
  }));
  m.querySelector('[data-act="custom"]').addEventListener('click', () => {
    closeModal();
    openQuestForm(makeRoutine({ name: '' }), after, { isNew: true });
  });
}

// Formular zum Anlegen und Bearbeiten.
export function openQuestForm(routine, after = () => {}, { isNew = false } = {}) {
  const r = makeRoutine(routine || {});
  const sc = r.schedule;
  const m = openModal(
    `<form id="q-form" class="form">
      <label class="field"><span>Name</span><input id="q-name" value="${esc(r.name === 'Neue Gewohnheit' ? '' : r.name)}" placeholder="z. B. Zähne putzen" maxlength="60" required></label>
      <fieldset class="field"><legend>Symbol</legend>
        <div class="icon-picker">${ICON_CHOICES.map((n) => `<label class="icon-choice"><input type="radio" name="icon" value="${n}" ${n === r.icon ? 'checked' : ''}><span>${icon(n, { size: 20 })}</span></label>`).join('')}</div>
      </fieldset>
      <fieldset class="field"><legend>Wann am Tag?</legend>
        <div class="chips">${DAYPARTS.map((p) => `<label class="chip"><input type="radio" name="daypart" value="${p.id}" ${p.id === r.daypart ? 'checked' : ''}><span>${p.name}</span></label>`).join('')}</div>
      </fieldset>
      <label class="field"><span>Rhythmus</span>
        <select id="q-type">
          <option value="daily" ${sc.type === 'daily' ? 'selected' : ''}>jeden Tag</option>
          <option value="weekdays" ${sc.type === 'weekdays' ? 'selected' : ''}>an bestimmten Wochentagen</option>
          <option value="times" ${sc.type === 'times' ? 'selected' : ''}>x-mal pro Woche</option>
        </select></label>
      <fieldset class="field" id="q-days" ${sc.type === 'weekdays' ? '' : 'hidden'}><legend>Wochentage</legend>
        <div class="chips">${WEEKDAYS.map((n, i) => `<label class="chip"><input type="checkbox" name="days[]" value="${i}" ${sc.days?.includes(i) ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>
      </fieldset>
      <label class="field" id="q-times" ${sc.type === 'times' ? '' : 'hidden'}><span>Wie oft pro Woche?</span><input id="q-times-val" type="number" min="1" max="7" value="${sc.times || 3}"></label>
      <div class="grid2">
        <label class="field"><span>Belohnung</span><select id="q-xp">${ROUTINE_XP_CHOICES.map((x) => `<option value="${x}" ${x === r.xp ? 'selected' : ''}>+${x} XP</option>`).join('')}</select></label>
        <label class="field"><span>Erinnerung (optional)</span><input id="q-rem" type="time" value="${r.reminder || ''}"></label>
      </div>
      <label class="chip"><input type="checkbox" id="q-counts" ${r.counts ? 'checked' : ''}><span>Zählt für den perfekten Tag</span></label>
      <div class="row between gap wrap">
        ${isNew ? '<span></span>' : '<button class="btn btn-danger btn-small" type="button" data-act="del">Löschen</button>'}
        <button class="btn btn-primary" type="submit">${isNew ? 'Hinzufügen' : 'Speichern'}</button>
      </div>
      <p class="hint">Erinnerungen erscheinen nur, wenn Benachrichtigungen unter „Mehr“ aktiviert sind und die App im Hintergrund läuft.</p>
    </form>`,
    { title: isNew ? 'Neue Gewohnheit' : 'Gewohnheit bearbeiten' },
  );
  const type = m.querySelector('#q-type');
  const sync = () => {
    m.querySelector('#q-days').hidden = type.value !== 'weekdays';
    m.querySelector('#q-times').hidden = type.value !== 'times';
  };
  type.addEventListener('change', sync);
  sync();
  m.querySelector('[data-act="del"]')?.addEventListener('click', async () => {
    closeModal();
    if (await confirmDialog(`„${r.name}“ wirklich löschen? Die bisherigen Haken bleiben in deiner Statistik erhalten.`, { ok: 'Löschen', danger: true })) {
      store.update((st) => (st.routines = st.routines.filter((x) => x.id !== r.id)));
      toast('Gewohnheit gelöscht.');
      after();
    }
  });
  m.querySelector('#q-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = m.querySelector('#q-name').value.trim();
    if (!name) return toast('Bitte einen Namen angeben.', 'warn');
    const t = type.value;
    const days = [...m.querySelectorAll('input[name="days[]"]:checked')].map((x) => Number(x.value));
    if (t === 'weekdays' && !days.length) return toast('Bitte mindestens einen Wochentag wählen.', 'warn');
    const next = makeRoutine({
      ...r,
      name,
      icon: m.querySelector('input[name="icon"]:checked')?.value || r.icon,
      daypart: m.querySelector('input[name="daypart"]:checked')?.value || r.daypart,
      xp: num(m.querySelector('#q-xp').value, 10),
      reminder: m.querySelector('#q-rem').value || null,
      counts: m.querySelector('#q-counts').checked,
      schedule: t === 'weekdays' ? { type: 'weekdays', days } : t === 'times' ? { type: 'times', times: num(m.querySelector('#q-times-val').value, 3) } : { type: 'daily' },
    });
    store.update((st) => {
      st.routines ||= [];
      const i = st.routines.findIndex((x) => x.id === next.id);
      if (i >= 0) st.routines[i] = next;
      else if (st.routines.filter((x) => !x.archived).length < MAX_ROUTINES) st.routines.push(next);
      else toast(`Mehr als ${MAX_ROUTINES} Gewohnheiten sind zu viel des Guten.`, 'warn');
    });
    closeModal();
    toast(isNew ? `„${next.name}“ ist jetzt Teil deiner Routine.` : 'Gespeichert.', 'ok');
    after();
  });
}

// Fokus umschalten: Training & Routine oder nur Routine.
export function openFocusDialog(after = () => {}) {
  const cur = store.get().settings?.focus === 'routine' ? 'routine' : 'training';
  const m = openModal(
    `<div class="choices">
      <label class="choice ${cur === 'training' ? 'selected' : ''}"><input type="radio" name="focus" value="training" ${cur === 'training' ? 'checked' : ''}><span><strong>Training & Routine</strong><span class="muted small">Standard: Trainingsplan, Ernährung und deine Gewohnheiten zählen gemeinsam für den perfekten Tag.</span></span></label>
      <label class="choice ${cur === 'routine' ? 'selected' : ''}"><input type="radio" name="focus" value="routine" ${cur === 'routine' ? 'checked' : ''}><span><strong>Nur Routine</strong><span class="muted small">LMCI wird zur Routine-App: Nur deine Gewohnheiten sind Pflicht, Training und Ernährung bleiben optional verfügbar.</span></span></label>
    </div>
    <div class="row end"><button class="btn btn-primary" data-act="save">Übernehmen</button></div>`,
    { title: 'Fokus wählen' },
  );
  m.querySelector('[data-act="save"]').addEventListener('click', () => {
    const v = m.querySelector('input[name="focus"]:checked')?.value === 'routine' ? 'routine' : 'training';
    store.update((st) => (st.settings.focus = v));
    closeModal();
    toast(v === 'routine' ? 'Fokus: nur Routine.' : 'Fokus: Training & Routine.', 'ok');
    after();
  });
}

// Dashboard „Heute“.
import { html, raw, toast, openModal, closeModal, num, fmtKg } from './dom.js';
import * as store from '../state.js';
import { planWeek, isMesoFinished, effectiveSets, rirForWeek, generatePlan } from '../engine/plan.js';
import { computeNutrition } from '../engine/nutrition.js';
import { adherence, streakWeeks } from '../engine/analytics.js';
import { getExercise } from '../data/exercises.js';
import { MOBILITY_BY_ID } from '../data/mobility.js';
import { ACTIVITY_BY_ID, CARDIO_ACTIVITIES } from '../engine/cardio.js';
import { toISODate, weekdayIndex, startOfWeek, WEEKDAYS, WEEKDAYS_LONG, formatDate, uid } from '../engine/util.js';

export function renderHeute(root) {
  const s = store.get();
  const { profile, plan } = s;
  const today = toISODate();
  const week = planWeek(plan, today);
  const finished = isMesoFinished(plan, today);
  const deload = week === plan.deloadWeek;
  const wd = weekdayIndex(today);
  const ws = startOfWeek(today);
  const ad = adherence(plan, s.workouts, ws);
  const todayDay = plan.days.find((d) => d.weekday === wd);
  const doneToday = s.workouts.find((w) => w.date === today && w.planId === plan.id);
  const nextDay = nextPlannedDay(plan, wd);
  const nutrition = computeNutrition(profile, plan);
  const streak = streakWeeks(plan, s.workouts, today);
  const lastWeight = [...s.bodyLogs].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const cardioThisWeek = s.cardioLogs.filter((c) => c.date >= ws);
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend';

  root.innerHTML = String(html`
    <section class="page">
      <header class="page-head">
        <div>
          <h1>${greet}${profile.name ? `, ${profile.name}` : ''}</h1>
          <p class="muted">${WEEKDAYS_LONG[wd]}, ${formatDate(today, { weekday: false })}${new Date().getFullYear()}</p>
        </div>
        <div class="week-chip ${deload ? 'deload' : ''}">
          <span class="week-chip-label">${deload ? 'Deload' : 'Aufbau'}</span>
          <span class="week-chip-week">Woche ${week}/${plan.weeks}</span>
        </div>
      </header>

      ${finished ? html`<div class="banner">
        <strong>Mesozyklus abgeschlossen.</strong> Zeit für den nächsten Block: neue Übungsvarianten, Volumen anhand deines Feedbacks angepasst.
        <button class="btn btn-primary" data-act="new-meso">Neuen Mesozyklus starten</button>
      </div>` : ''}

      <div class="week-dots" aria-label="Einheiten diese Woche">
        ${WEEKDAYS.map((n, i) => {
          const d = plan.days.find((x) => x.weekday === i);
          const done = d && ad.dayIds.has(d.id);
          return html`<div class="dot-day ${i === wd ? 'today' : ''} ${done ? 'done' : d ? 'planned' : ''}"><span>${n}</span><i></i></div>`;
        })}
        <div class="dot-sum">${ad.done}/${ad.planned}</div>
      </div>

      ${s.activeWorkout ? html`<div class="card card-accent">
        <div class="card-title">Laufendes Training</div>
        <p>${dayName(plan, s.activeWorkout.dayId)} – begonnen ${s.activeWorkout.startedAt.slice(11, 16)} Uhr</p>
        <div class="row gap"><a class="btn btn-primary" href="#/workout/${s.activeWorkout.dayId}">Weitermachen</a><button class="btn" data-act="discard">Verwerfen</button></div>
      </div>` : todayDay ? html`<div class="card card-accent">
        <div class="card-title">${doneToday ? 'Heute erledigt ✓' : 'Heute'}</div>
        <h2 class="session-name">${todayDay.name}</h2>
        <p class="muted">${todayDay.exercises.length} Übungen · ca. ${todayDay.minutes} min · ${rirForWeek(plan, week)} Wdh. in Reserve${deload ? ' · halbe Satzzahl' : ''}</p>
        <ul class="ex-preview">${todayDay.exercises.map((pe) => html`<li><span>${getExercise(pe.exId).name}</span><span class="muted">${effectiveSets(plan, todayDay, pe, week)} × ${pe.repMin}–${pe.repMax}</span></li>`)}</ul>
        <div class="row gap">
          <a class="btn btn-primary" href="#/workout/${todayDay.id}">${doneToday ? 'Nochmal trainieren' : 'Training starten'}</a>
          <button class="btn" data-act="other">Andere Einheit</button>
        </div>
      </div>` : html`<div class="card">
        <div class="card-title">Heute</div>
        <p>Kein Krafttraining geplant – ein guter Tag für Cardio oder Mobilität.</p>
        ${nextDay ? html`<p class="muted">Nächste Einheit: ${WEEKDAYS_LONG[nextDay.weekday]} – ${nextDay.name}</p>` : ''}
        <button class="btn" data-act="other">Trotzdem trainieren</button>
      </div>`}

      <div class="grid2">
        <div class="card">
          <div class="card-title">Cardio diese Woche</div>
          ${plan.cardio.sessions.length ? html`<ul class="list">${plan.cardio.sessions.map((c, i) => {
            const done = cardioThisWeek[i];
            return html`<li class="${done ? 'done' : ''}"><div><strong>${c.name}</strong><div class="muted">${ACTIVITY_BY_ID[c.activity]?.name || c.activity} · ${c.minutesByWeek[week - 1]} min${c.intervals ? ` · ${c.intervals.roundsByWeek[week - 1]} × ${c.intervals.work}s hart / ${c.intervals.rest}s locker` : ''}</div></div><span class="check">${done ? '✓' : ''}</span></li>`;
          })}</ul>` : html`<p class="muted">Kein Cardio geplant.</p>`}
          <p class="muted small">${cardioThisWeek.length} Einheit${cardioThisWeek.length === 1 ? '' : 'en'} eingetragen</p>
          <button class="btn" data-act="log-cardio">Cardio eintragen</button>
        </div>
        <div class="card">
          <div class="card-title">Mobilität · 10 min</div>
          <p class="muted">${todayDay ? 'Nach dem Training oder abends.' : 'Ruhetag-Routine für Hüfte, Schultern und Brustwirbelsäule.'}</p>
          <button class="btn" data-act="mobility">Routine anzeigen</button>
        </div>
        <div class="card">
          <div class="card-title">Ernährung heute</div>
          <div class="stat"><span class="stat-num">${nutrition.target}</span><span class="stat-unit">kcal</span></div>
          <p class="muted">Protein ${nutrition.protein} g · Fett ${nutrition.fat} g · Kohlenhydrate ${nutrition.carbs} g</p>
          <a class="btn btn-ghost" href="#/ernaehrung">Details</a>
        </div>
        <div class="card">
          <div class="card-title">Gewicht</div>
          <div class="stat"><span class="stat-num">${lastWeight ? fmtKg(lastWeight.weightKg).replace(' kg', '') : '–'}</span><span class="stat-unit">kg${lastWeight ? ` · ${formatDate(lastWeight.date)}` : ''}</span></div>
          <form class="row gap" id="weight-form"><input id="weight-input" type="number" step="0.1" inputmode="decimal" placeholder="Heute in kg" aria-label="Gewicht heute" value="${lastWeight?.date === today ? lastWeight.weightKg : ''}"><button class="btn" type="submit">Speichern</button></form>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Konstanz</div>
        <p><strong>${streak}</strong> Woche${streak === 1 ? '' : 'n'} in Folge mit fast allen geplanten Einheiten · <strong>${s.workouts.length}</strong> Trainings gesamt</p>
        <p class="muted small">Die Wissenschaft ist eindeutig: Regelmäßigkeit schlägt jedes perfekte Programm. Zwei Drittel der Einheiten reichen, damit der Fortschritt weiterläuft.</p>
      </div>
    </section>`);

  root.querySelector('[data-act="new-meso"]')?.addEventListener('click', startNewMeso);
  root.querySelector('[data-act="discard"]')?.addEventListener('click', () => {
    store.update((st) => (st.activeWorkout = null));
    toast('Training verworfen.');
  });
  root.querySelectorAll('[data-act="other"]').forEach((b) => b.addEventListener('click', () => pickOtherSession(plan)));
  root.querySelector('[data-act="log-cardio"]').addEventListener('click', () => openCardioLog(plan, week));
  root.querySelector('[data-act="mobility"]').addEventListener('click', () => openMobility(plan, todayDay));
  root.querySelector('#weight-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = num(root.querySelector('#weight-input').value);
    if (v < 30 || v > 250) return toast('Bitte ein plausibles Gewicht eingeben.', 'warn');
    store.update((st) => {
      st.bodyLogs = st.bodyLogs.filter((b) => b.date !== today);
      st.bodyLogs.push({ date: today, weightKg: v });
      st.profile.weightKg = v;
    });
    toast('Gewicht gespeichert.', 'ok');
  });
}

function dayName(plan, dayId) {
  return plan.days.find((d) => d.id === dayId)?.name || 'Einheit';
}

function nextPlannedDay(plan, wd) {
  for (let i = 1; i <= 7; i++) {
    const d = plan.days.find((x) => x.weekday === (wd + i) % 7);
    if (d) return d;
  }
  return null;
}

export function startNewMeso() {
  const s = store.get();
  const fb = mesoFeedbackAdjust(s);
  store.update((st) => {
    st.planHistory.push(st.plan);
    const prof = { ...st.profile };
    st.plan = generatePlan(prof, { mesoIndex: st.plan.mesoIndex + 1 });
    st.plan.volumeAdjust = fb;
  });
  toast('Neuer Mesozyklus erstellt – viel Erfolg!', 'ok');
  location.hash = '#/plan';
}

// Volumenanpassung aus dem alten Block mitnehmen (gedämpft), damit sich das Volumen langsam einpendelt.
function mesoFeedbackAdjust(s) {
  const out = {};
  for (const [dayId, v] of Object.entries(s.plan.volumeAdjust || {})) {
    if (v >= 2) out[dayId] = 1;
    else if (v <= -2) out[dayId] = -1;
  }
  return out;
}

function pickOtherSession(plan) {
  openModal(
    `<ul class="list tappable">${plan.days.map((d) => `<li><a href="#/workout/${d.id}" data-close-modal><strong>${d.name}</strong><div class="muted">${d.exercises.length} Übungen · ca. ${d.minutes} min</div></a></li>`).join('')}</ul>`,
    { title: 'Einheit wählen' },
  );
}

export function openCardioLog(plan, week) {
  const s = store.get();
  const activities = (s.profile.cardio?.length ? s.profile.cardio : CARDIO_ACTIVITIES.map((a) => a.id)).map((id) => ACTIVITY_BY_ID[id]).filter(Boolean);
  const m = openModal(
    `<form id="cardio-form" class="form">
      <label class="field"><span>Einheit</span><select id="c-session" name="sessionId"><option value="">Freies Cardio</option>${plan.cardio.sessions.map((c) => `<option value="${c.id}">${c.name} (${c.minutesByWeek[week - 1]} min)</option>`).join('')}</select></label>
      <div class="grid2">
        <label class="field"><span>Aktivität</span><select id="c-activity" name="activity">${activities.map((a) => `<option value="${a.id}">${a.name}</option>`).join('')}</select></label>
        <label class="field"><span>Dauer (min)</span><input id="c-min" name="minutes" type="number" inputmode="numeric" min="1" max="600" required></label>
        <label class="field"><span>Ø Puls (optional)</span><input id="c-hr" name="avgHr" type="number" inputmode="numeric" min="40" max="230"></label>
        <label class="field"><span>Distanz km (optional)</span><input id="c-km" name="km" type="number" inputmode="decimal" step="0.1" min="0"></label>
      </div>
      <label class="field"><span>Datum</span><input id="c-date" name="date" type="date" value="${toISODate()}"></label>
      <div class="row end"><button class="btn btn-primary" type="submit">Speichern</button></div>
    </form>`,
    { title: 'Cardio eintragen' },
  );
  const sel = m.querySelector('#c-session');
  sel.addEventListener('change', () => {
    const c = plan.cardio.sessions.find((x) => x.id === sel.value);
    if (c) {
      m.querySelector('#c-min').value = c.minutesByWeek[week - 1];
      m.querySelector('#c-activity').value = c.activity;
    }
  });
  m.querySelector('#cardio-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const minutes = num(f.minutes.value);
    if (!minutes) return toast('Bitte die Dauer angeben.', 'warn');
    store.update((st) => {
      st.cardioLogs.push({ id: uid(), date: f.date.value || toISODate(), sessionId: f.sessionId.value || null, activity: f.activity.value, minutes, avgHr: num(f.avgHr.value) || null, km: num(f.km.value) || null });
    });
    closeModal();
    toast('Cardio gespeichert.', 'ok');
  });
}

export function openMobility(plan, todayDay) {
  const lower = todayDay && /Unterkörper|Beine|Ganzkörper/.test(todayDay.name);
  const upper = todayDay && /Oberkörper|Push|Pull/.test(todayDay.name);
  const key = lower ? 'unterkoerper' : upper ? 'oberkoerper' : 'ruhetag';
  const titles = { unterkoerper: 'Unterkörper-Routine', oberkoerper: 'Oberkörper-Routine', ruhetag: 'Ruhetag-Routine' };
  const items = (plan.mobility[key] || []).map((id) => MOBILITY_BY_ID[id]).filter(Boolean);
  openModal(
    `<ol class="mob-list">${items.map((m) => `<li><div><strong>${m.name}</strong><div class="muted">${m.cue}</div></div><span class="pill">${m.seconds}s${m.perSide ? ' / Seite' : ''}</span></li>`).join('')}</ol>
     <p class="hint">Ruhig atmen, nichts erzwingen. Regelmäßigkeit (mehrmals pro Woche) zählt mehr als Dauer.</p>`,
    { title: titles[key] },
  );
}

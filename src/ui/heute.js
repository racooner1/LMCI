// Dashboard „Heute“.
import { html, raw, toast, openModal, closeModal, num, fmtKg } from './dom.js';
import * as store from '../state.js';
import { planWeek, isMesoFinished, effectiveSets, rirForWeek, generatePlan, nextSession, dayDuration } from '../engine/plan.js';
import { adherence, streakWeeks } from '../engine/analytics.js';
import { readinessScore, readinessAdvice } from '../engine/recovery.js';
import { getExercise } from '../data/exercises.js';
import { MUSCLES, MUSCLE_BY_ID } from '../data/muscles.js';
import { MOBILITY_BY_ID } from '../data/mobility.js';
import { ACTIVITY_BY_ID, CARDIO_ACTIVITIES, CARDIO_GROUPS } from '../engine/cardio.js';
import { toISODate, weekdayIndex, startOfWeek, WEEKDAYS, WEEKDAYS_LONG, formatDate, uid } from '../engine/util.js';
import { openIntervalTimer } from './timer.js';
import { dayTotals } from '../engine/food.js';
import { dailyTargets } from './ernaehrung.js';

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
  const next = nextSession(plan, s.workouts, today);
  const nutrition = dailyTargets(s);
  const eaten = dayTotals(s.foodLog[today] || []);
  const streak = streakWeeks(plan, s.workouts, today);
  const lastWeight = [...s.bodyLogs].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const cardioThisWeek = s.cardioLogs.filter((c) => c.date >= ws);
  const checkin = s.checkins.find((c) => c.date === today);
  const readiness = readinessScore(checkin);
  const advice = readinessAdvice(readiness, checkin?.sore?.length || 0);
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend';
  const sessionTitle = { heute: 'Heute', nachholen: 'Nachholen', erledigt: 'Heute erledigt ✓', naechste: 'Nächste Einheit' }[next.kind];

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

      <div class="card ${checkin ? '' : 'card-accent'} checkin-card">
        <div class="row between">
          <div class="card-title">Check-in</div>
          ${readiness ? html`<span class="readiness ${readiness.level}">Bereitschaft ${readiness.score} %</span>` : ''}
        </div>
        <p class="small">${advice.text}</p>
        ${checkin ? html`<p class="muted small">Schlaf ${checkin.sleep} h · Qualität ${checkin.sleepQuality}/5 · Stress ${checkin.stress}/5 · Energie ${checkin.energy}/5${checkin.sore?.length ? ` · Muskelkater: ${checkin.sore.map((m) => MUSCLE_BY_ID[m]?.short).join(', ')}` : ''}</p>` : ''}
        <button class="btn ${checkin ? 'btn-ghost btn-small' : ''}" data-act="checkin">${checkin ? 'Check-in ändern' : 'Check-in ausfüllen (30 Sekunden)'}</button>
      </div>

      ${s.activeWorkout ? html`<div class="card card-accent">
        <div class="card-title">Laufendes Training</div>
        <p>${s.activeWorkout.dayId === 'frei' ? 'Freies Training' : dayName(plan, s.activeWorkout.dayId)} – begonnen ${s.activeWorkout.startedAt.slice(11, 16)} Uhr</p>
        <div class="row gap"><a class="btn btn-primary" href="#/workout/${s.activeWorkout.dayId}">Weitermachen</a><button class="btn" data-act="discard">Verwerfen</button></div>
      </div>` : html`<div class="card ${next.kind === 'erledigt' ? '' : 'card-accent'}">
        <div class="card-title">${sessionTitle}${next.kind === 'naechste' ? ` · ${WEEKDAYS_LONG[next.day.weekday]}` : ''}</div>
        <h2 class="session-name">${next.day.name}</h2>
        <p class="muted">${next.day.exercises.length} Übungen · ca. ${dayDuration(plan, next.day, week, profile)} min · ${rirForWeek(plan, week)} Wdh. in Reserve${deload ? ' · Deload: halbe Satzzahl' : ''}</p>
        ${next.kind === 'nachholen' ? html`<p class="small">Diese Einheit ist diese Woche noch offen. Nachholen ist besser als auslassen – die Reihenfolge wird automatisch fortgesetzt.</p>` : ''}
        ${next.kind === 'naechste' ? html`<p class="small">Heute kein Krafttraining geplant – guter Tag für Cardio oder Mobilität. Du kannst die Einheit trotzdem vorziehen.</p>` : ''}
        <ul class="ex-preview">${next.day.exercises.map((pe) => html`<li><span>${getExercise(pe.exId)?.name || pe.exId}</span><span class="muted">${effectiveSets(plan, next.day, pe, week)} × ${pe.repMin}–${pe.repMax}</span></li>`)}</ul>
        <div class="row gap wrap">
          <a class="btn btn-primary" href="#/workout/${next.day.id}">${next.kind === 'erledigt' ? 'Nochmal trainieren' : next.kind === 'naechste' ? 'Vorziehen' : 'Training starten'}</a>
          <button class="btn" data-act="other">Andere Einheit</button>
          <a class="btn btn-ghost" href="#/workout/frei">Freies Training</a>
        </div>
      </div>`}

      <div class="grid2">
        <div class="card">
          <div class="card-title">Cardio diese Woche</div>
          ${plan.cardio.sessions.length ? html`<ul class="list">${plan.cardio.sessions.map((c, i) => {
            const done = cardioThisWeek[i];
            return html`<li class="${done ? 'done' : ''}"><div><strong>${c.name}</strong><div class="muted">${ACTIVITY_BY_ID[c.activity]?.name || c.activity} · ${c.minutesByWeek[week - 1]} min${c.intervals ? ` · ${c.intervals.roundsByWeek[week - 1]} × ${c.intervals.work}s hart / ${c.intervals.rest}s locker` : ''}</div></div><div class="row gap-s">${done ? html`<span class="check">✓</span>` : ''}<button class="btn-icon" data-timer="${c.id}" title="Timer" aria-label="Timer starten">▶</button></div></li>`;
          })}</ul>` : html`<p class="muted">Kein Cardio geplant.</p>`}
          <p class="muted small">${cardioThisWeek.length} Einheit${cardioThisWeek.length === 1 ? '' : 'en'} eingetragen</p>
          <button class="btn" data-act="log-cardio">Cardio eintragen</button>
        </div>
        <div class="card">
          <div class="card-title">Mobilität · 10 min</div>
          <p class="muted">${next.kind === 'heute' || next.kind === 'nachholen' ? 'Nach dem Training oder abends.' : 'Ruhetag-Routine für Hüfte, Schultern und Brustwirbelsäule.'}</p>
          <button class="btn" data-act="mobility">Routine anzeigen</button>
        </div>
        <div class="card">
          <div class="card-title">Ernährung heute</div>
          <div class="stat"><span class="stat-num">${eaten.kcal}</span><span class="stat-unit">/ ${nutrition.target} kcal</span></div>
          <div class="mini-bar"><div style="width:${Math.min(100, (eaten.kcal / nutrition.target) * 100).toFixed(0)}%"></div></div>
          <p class="muted">Protein ${eaten.protein} / ${nutrition.protein} g · ${nutrition.target - eaten.kcal > 0 ? `${nutrition.target - eaten.kcal} kcal übrig` : `${eaten.kcal - nutrition.target} kcal über dem Ziel`}</p>
          <a class="btn btn-ghost" href="#/ernaehrung">Tagebuch</a>
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
        <p class="muted small">Regelmäßigkeit schlägt jedes perfekte Programm. Zwei Drittel der Einheiten reichen, damit der Fortschritt weiterläuft.</p>
      </div>
    </section>`);

  root.querySelector('[data-act="new-meso"]')?.addEventListener('click', startNewMeso);
  root.querySelector('[data-act="checkin"]').addEventListener('click', () => openCheckin(checkin));
  root.querySelector('[data-act="discard"]')?.addEventListener('click', () => {
    store.update((st) => (st.activeWorkout = null));
    toast('Training verworfen.');
  });
  root.querySelectorAll('[data-act="other"]').forEach((b) => b.addEventListener('click', () => pickOtherSession(plan)));
  root.querySelector('[data-act="log-cardio"]').addEventListener('click', () => openCardioLog(plan, week));
  root.querySelector('[data-act="mobility"]').addEventListener('click', () => openMobility(plan, next.kind === 'heute' || next.kind === 'nachholen' ? next.day : null));
  root.querySelectorAll('[data-timer]').forEach((b) => b.addEventListener('click', () => {
    const c = plan.cardio.sessions.find((x) => x.id === b.dataset.timer);
    if (c) openIntervalTimer(c, week);
  }));
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

export function startNewMeso() {
  const s = store.get();
  const carry = {};
  for (const [m, v] of Object.entries(s.plan.muscleAdjust || {})) {
    if (v >= 2) carry[m] = 1;
    else if (v <= -2) carry[m] = -1;
  }
  store.update((st) => {
    st.planHistory.push(st.plan);
    st.plan = generatePlan({ ...st.profile }, { mesoIndex: st.plan.mesoIndex + 1 });
    st.plan.muscleAdjust = carry;
  });
  toast('Neuer Mesozyklus erstellt – viel Erfolg!', 'ok');
  location.hash = '#/plan';
}

function pickOtherSession(plan) {
  openModal(
    `<ul class="list tappable">${plan.days.map((d) => `<li><a href="#/workout/${d.id}" data-close-modal><strong>${d.name}</strong><div class="muted">${d.exercises.length} Übungen · ca. ${d.minutes} min</div></a></li>`).join('')}<li><a href="#/workout/frei" data-close-modal><strong>Freies Training</strong><div class="muted">Ohne Vorgabe – Übungen selbst zusammenstellen</div></a></li></ul>`,
    { title: 'Einheit wählen' },
  );
}

const SLIDER = (id, label, min, max, step, val, fmt) => `<label class="field slider"><span>${label}: <strong id="${id}-val">${fmt(val)}</strong></span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;

export function openCheckin(existing) {
  const c = existing || { sleep: 7, sleepQuality: 3, stress: 3, energy: 3, sore: [] };
  const m = openModal(
    `<form id="ci-form" class="form">
      ${SLIDER('ci-sleep', 'Schlaf letzte Nacht', 3, 11, 0.5, c.sleep, (v) => `${v} h`)}
      ${SLIDER('ci-sq', 'Schlafqualität', 1, 5, 1, c.sleepQuality, (v) => ['', 'sehr schlecht', 'schlecht', 'okay', 'gut', 'sehr gut'][v])}
      ${SLIDER('ci-stress', 'Stress heute', 1, 5, 1, c.stress, (v) => ['', 'entspannt', 'gering', 'mittel', 'hoch', 'sehr hoch'][v])}
      ${SLIDER('ci-energy', 'Energie', 1, 5, 1, c.energy, (v) => ['', 'leer', 'wenig', 'okay', 'gut', 'voll da'][v])}
      <fieldset class="field"><legend>Muskelkater / noch nicht erholt</legend>
        <div class="chips">${MUSCLES.map((mu) => `<label class="chip"><input type="checkbox" name="sore[]" value="${mu.id}" ${c.sore?.includes(mu.id) ? 'checked' : ''}><span>${mu.short}</span></label>`).join('')}</div></fieldset>
      <div class="row end"><button class="btn btn-primary" type="submit">Speichern</button></div>
    </form>`,
    { title: 'Check-in' },
  );
  const fmts = { 'ci-sleep': (v) => `${v} h`, 'ci-sq': (v) => ['', 'sehr schlecht', 'schlecht', 'okay', 'gut', 'sehr gut'][v], 'ci-stress': (v) => ['', 'entspannt', 'gering', 'mittel', 'hoch', 'sehr hoch'][v], 'ci-energy': (v) => ['', 'leer', 'wenig', 'okay', 'gut', 'voll da'][v] };
  for (const id of Object.keys(fmts)) m.querySelector(`#${id}`).addEventListener('input', (e) => (m.querySelector(`#${id}-val`).textContent = fmts[id](e.target.value)));
  m.querySelector('#ci-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const today = toISODate();
    const entry = {
      date: today,
      sleep: num(m.querySelector('#ci-sleep').value),
      sleepQuality: num(m.querySelector('#ci-sq').value),
      stress: num(m.querySelector('#ci-stress').value),
      energy: num(m.querySelector('#ci-energy').value),
      sore: [...m.querySelectorAll('input[name="sore[]"]:checked')].map((x) => x.value),
    };
    store.update((st) => {
      st.checkins = st.checkins.filter((x) => x.date !== today);
      st.checkins.push(entry);
    });
    closeModal();
    toast('Check-in gespeichert.', 'ok');
  });
}

export function openCardioLog(plan, week) {
  const s = store.get();
  const mine = (s.profile.cardio?.length ? s.profile.cardio : []).map((id) => ACTIVITY_BY_ID[id]).filter(Boolean);
  const options = `${mine.length ? `<optgroup label="Meine Aktivitäten">${mine.map((a) => `<option value="${a.id}">${a.name}</option>`).join('')}</optgroup>` : ''}${CARDIO_GROUPS.map((g) => `<optgroup label="${g}">${CARDIO_ACTIVITIES.filter((a) => a.group === g).map((a) => `<option value="${a.id}">${a.name}</option>`).join('')}</optgroup>`).join('')}`;
  const m = openModal(
    `<form id="cardio-form" class="form">
      <label class="field"><span>Einheit</span><select id="c-session" name="sessionId"><option value="">Freies Cardio</option>${plan.cardio.sessions.map((c) => `<option value="${c.id}">${c.name} (${c.minutesByWeek[week - 1]} min)</option>`).join('')}</select></label>
      <div class="grid2">
        <label class="field"><span>Aktivität</span><select id="c-activity" name="activity">${options}</select></label>
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
  const items = (plan.mobility[key] || []).map((m) => MOBILITY_BY_ID[m]).filter(Boolean);
  openModal(
    `<ol class="mob-list">${items.map((m) => `<li><div><strong>${m.name}</strong><div class="muted">${m.cue}</div></div><span class="pill">${m.seconds}s${m.perSide ? ' / Seite' : ''}</span></li>`).join('')}</ol>
     <p class="hint">Ruhig atmen, nichts erzwingen. Regelmäßigkeit (mehrmals pro Woche) zählt mehr als Dauer.</p>`,
    { title: titles[key] },
  );
}

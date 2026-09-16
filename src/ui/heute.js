// Dashboard „Heute“: Hero mit Streak & Level, Tagesziele, Wochenring, Training, Schnellaktionen.
import { html, raw, toast, openModal, closeModal, num, fmtKg } from './dom.js';
import * as store from '../state.js';
import { planWeek, isMesoFinished, effectiveSets, rirForWeek, generatePlan, nextSession, dayDuration } from '../engine/plan.js';
import { adherence, streakWeeks } from '../engine/analytics.js';
import { readinessScore, readinessAdvice } from '../engine/recovery.js';
import { getExercise } from '../data/exercises.js';
import { MUSCLES, MUSCLE_BY_ID } from '../data/muscles.js';
import { MOBILITY_BY_ID } from '../data/mobility.js';
import { figureForMobility } from './figure.js';
import { ACTIVITY_BY_ID, CARDIO_ACTIVITIES, CARDIO_GROUPS } from '../engine/cardio.js';
import { toISODate, weekdayIndex, startOfWeek, WEEKDAYS, WEEKDAYS_LONG, formatDate, uid } from '../engine/util.js';
import { openIntervalTimer } from './timer.js';
import { dayTotals } from '../engine/food.js';
import { dailyTargets } from './ernaehrung.js';
import { dailyStreak } from '../engine/achievements.js';
import { totalXP, levelInfo, dailyGoals, xpToday, motivation, XP, badgeExtra } from '../engine/gamification.js';
import { weeklyChallenges } from '../engine/challenges.js';
import { badgeStatus } from '../engine/achievements.js';
import { icon } from './icons.js';
import { confetti, pop } from './celebrate.js';
import { animateAll } from './motion.js';

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365];

export function challengeRow(c, { monthly = false } = {}) {
  return `<div class="challenge ${c.done ? 'done' : ''} ${monthly ? 'monthly' : ''}">
    <span class="challenge-icon">${icon(c.done ? 'check' : c.icon, { size: 20 })}</span>
    <span class="challenge-text"><strong>${c.name}${monthly ? ' · Monat' : ''}</strong><span>${c.desc}</span><span class="challenge-bar"><div style="width:${(c.progress * 100).toFixed(0)}%"></div></span></span>
    <span class="challenge-right"><span class="xp-chip">+${c.xp}</span><span>${typeof c.value === 'number' && c.value >= 1000 ? c.value.toLocaleString('de-DE') : c.value} / ${c.target >= 1000 ? c.target.toLocaleString('de-DE') : c.target}</span></span>
    ${c.done ? '<span class="done-stamp">GESCHAFFT</span>' : ''}
  </div>`;
}

// Neue Abzeichen mit Datum versehen (für „NEU“-Marker) – gibt neu erkannte Abzeichen zurück.
export function noteNewBadges(s, today) {
  const earned = badgeStatus(s, today, badgeExtra(s, today)).filter((b) => b.earned);
  const fresh = earned.filter((b) => !s.meta.badgeDates?.[b.id]);
  if (fresh.length) {
    store.update((st) => {
      st.meta.badgeDates ||= {};
      for (const b of fresh) st.meta.badgeDates[b.id] = today;
    }, { silent: true });
  }
  return fresh;
}

export function ring(value, max, { label = '', cls = '' } = {}) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const p = max ? Math.min(1, value / max) : 0;
  return `<div class="ring ${cls} ${p >= 1 ? 'ok' : ''}"><svg viewBox="0 0 84 84"><circle class="track" cx="42" cy="42" r="${r}"/><circle class="fill" cx="42" cy="42" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - p)).toFixed(1)}"/></svg><div class="ring-label"><strong>${value}<span style="font-size:.7em;color:var(--muted)">/${max}</span></strong><span>${label}</span></div></div>`;
}

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
  const lastWeight = [...s.bodyLogs].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const cardioThisWeek = s.cardioLogs.filter((c) => c.date >= ws);
  const checkin = s.checkins.find((c) => c.date === today);
  const readiness = readinessScore(checkin);
  const advice = readinessAdvice(readiness, checkin?.sore?.length || 0);
  const streak = dailyStreak(s, today);
  const activeToday = streak > 0 && [...s.workouts, ...s.cardioLogs, ...s.checkins].some((x) => x.date === today);
  const xp = totalXP(s);
  const lvl = levelInfo(xp);
  const goals = dailyGoals(s, today);
  const required = goals.filter((g) => !g.optional);
  const doneCount = required.filter((g) => g.done).length;
  const perfect = doneCount === required.length;
  const todayXp = xpToday(s, today);
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend';
  const sessionTitle = { heute: 'Heute dran', nachholen: 'Nachholen', erledigt: 'Heute erledigt', naechste: 'Nächste Einheit' }[next.kind];
  const challenges = weeklyChallenges(s, ws);
  let prevXp = xp;
  try {
    prevXp = Number(sessionStorage.getItem('lmci.xpShown') || xp);
  } catch { /* Speicher gesperrt, z. B. in Sandboxes */ }

  root.innerHTML = String(html`
    <section class="page">
      <div class="card card-hero hero">
        <div class="hero-top">
          <div>
            <div class="small">${WEEKDAYS_LONG[wd]}, ${formatDate(today, { weekday: false })}${new Date().getFullYear()}</div>
            <h1>${greet}${profile.name ? `, ${profile.name}` : ''}</h1>
          </div>
          <div class="streak-pill ${activeToday ? '' : 'cold'}" title="Tage in Folge aktiv">${raw(icon('flame', { size: 22 }))} ${streak}</div>
        </div>
        <div class="level-row"><span>Level ${lvl.level} · ${lvl.title}</span><span class="xp-chip">${raw(icon('bolt', { size: 14 }))} <span data-count="${xp}" data-from="${Math.min(prevXp, xp)}">${xp}</span> XP</span></div>
        <div class="xp-bar"><div style="width:${(lvl.progress * 100).toFixed(0)}%"></div></div>
        <div class="small">${lvl.toNext} XP bis Level ${lvl.level + 1}${todayXp ? ` · heute schon +${todayXp} XP` : ''}</div>
      </div>

      ${finished ? html`<div class="banner">
        <strong>Block geschafft!</strong> Zeit für den nächsten: neue Übungen, Volumen aus deinem Feedback.
        <button class="btn btn-primary" data-act="new-meso">Neuen Block starten</button>
      </div>` : ''}

      <div class="card">
        <div class="row between"><div class="card-title">Tagesziele</div><span class="xp-chip">${raw(icon('bolt', { size: 14 }))} +${XP.perfectDay} XP für alle</span></div>
        <div class="goals-progress"><div class="xp-bar"><div style="width:${((doneCount / required.length) * 100).toFixed(0)}%"></div></div><strong>${doneCount}/${required.length}</strong></div>
        <ul class="goals">
          ${goals.map((g) => html`<li><button class="goal ${g.done ? 'done' : ''} ${g.optional ? 'optional' : ''}" data-goal="${g.id}" data-href="${g.href}" data-goal-act="${g.act || ''}">
            <span class="goal-check">${raw(icon('check', { size: 20 }))}</span>
            <span class="goal-text"><strong>${g.label}</strong><span>${g.hint}${g.optional ? ' · optional' : ''}</span></span>
            <span class="xp-chip">+${g.xp}</span>
          </button></li>`)}
        </ul>
        <p class="small ${perfect ? '' : 'muted'}">${perfect ? raw(`${icon('star', { size: 16 })} `) : ''}${motivation(s, { streak, goals, today })}</p>
      </div>

      <div class="card">
        <div class="row between"><div class="card-title">Herausforderungen der Woche</div><a class="btn btn-small btn-ghost" href="#/fortschritt">${raw(icon('trophy', { size: 16 }))} Alle</a></div>
        <div class="challenges">${raw(challenges.map((c) => challengeRow(c)).join(''))}</div>
        <p class="muted small">${challenges.filter((c) => c.done).length} von 3 geschafft · jede Woche drei neue, dazu eine im Monat.</p>
      </div>

      ${s.activeWorkout ? html`<div class="card card-accent">
        <div class="card-title">Laufendes Training</div>
        <p><strong>${s.activeWorkout.dayId === 'frei' ? 'Freies Training' : s.activeWorkout.dayId === 'schnell' ? 'Schnelltraining' : dayName(plan, s.activeWorkout.dayId)}</strong> – begonnen ${s.activeWorkout.startedAt.slice(11, 16)} Uhr</p>
        <div class="row gap"><a class="btn btn-primary" href="#/workout/${s.activeWorkout.dayId}">${raw(icon('play', { size: 18 }))} Weitermachen</a><button class="btn" data-act="discard">Verwerfen</button></div>
      </div>` : html`<div class="card ${next.kind === 'erledigt' ? '' : 'card-accent'}">
        <div class="row between top">
          <div>
            <div class="card-title">${sessionTitle}${next.kind === 'naechste' ? ` · ${WEEKDAYS_LONG[next.day.weekday]}` : ''}</div>
            <h2 class="session-name">${next.day.name}</h2>
            <p class="muted">${next.day.exercises.length} Übungen · ca. ${dayDuration(plan, next.day, week, profile)} min · ${rirForWeek(plan, week)} Wdh. in Reserve${deload ? ' · Deload' : ''}</p>
          </div>
          <div class="week-chip ${deload ? 'deload' : ''}"><span class="week-chip-label">${deload ? 'Deload' : 'Woche'}</span><span class="week-chip-week">${week}/${plan.weeks}</span></div>
        </div>
        ${next.kind === 'nachholen' ? html`<p class="small">Noch offen von dieser Woche. Nachholen schlägt auslassen.</p>` : ''}
        ${next.kind === 'naechste' ? html`<p class="small">Heute ist frei – ein guter Tag für Cardio oder Mobilität. Vorziehen geht auch.</p>` : ''}
        <ul class="ex-preview">${next.day.exercises.slice(0, 5).map((pe) => html`<li><span>${getExercise(pe.exId)?.name || pe.exId}</span><span class="muted">${effectiveSets(plan, next.day, pe, week)} × ${pe.repMin}–${pe.repMax}</span></li>`)}${next.day.exercises.length > 5 ? html`<li class="muted">+ ${next.day.exercises.length - 5} weitere</li>` : ''}</ul>
        <div class="row gap wrap">
          <a class="btn btn-primary btn-big" href="#/workout/${next.day.id}">${raw(icon('play', { size: 18 }))} ${next.kind === 'erledigt' ? 'Nochmal' : next.kind === 'naechste' ? 'Vorziehen' : 'Training starten'}</a>
          <button class="btn" data-act="other">Andere</button>
        </div>
      </div>`}

      <div class="actions">
        <a class="action" href="#/schnell">${raw(icon('zap', { size: 26 }))}Schnell­training</a>
        <button class="action flame" data-act="log-cardio">${raw(icon('run', { size: 26 }))}Cardio</button>
        <button class="action ok" data-act="mobility">${raw(icon('stretch', { size: 26 }))}Mobilität</button>
        <a class="action xp" href="#/coach">${raw(icon('chat', { size: 26 }))}Coach</a>
      </div>

      <div class="card">
        <div class="row between"><div class="card-title">Diese Woche</div><a class="btn btn-small btn-ghost" href="#/kalender">${raw(icon('calendar', { size: 16 }))} Kalender</a></div>
        <div class="week-row">
          ${raw(ring(ad.done, ad.planned, { label: 'Kraft' }))}
          <div class="week-dots" aria-label="Einheiten diese Woche">
            ${WEEKDAYS.map((n, i) => {
              const d = plan.days.find((x) => x.weekday === i);
              const done = d && ad.dayIds.has(d.id);
              return html`<div class="dot-day ${i === wd ? 'today' : ''} ${done ? 'done' : d ? 'planned' : ''}"><span>${n}</span><i></i></div>`;
            })}
          </div>
        </div>
        <div class="row between wrap gap">
          <span class="small">${raw(icon('run', { size: 16 }))} Cardio ${cardioThisWeek.length}/${plan.cardio.sessionsPerWeek}${plan.cardio.sessions.length ? html` · nächste: ${plan.cardio.sessions[cardioThisWeek.length % plan.cardio.sessions.length]?.name} ${plan.cardio.sessions[cardioThisWeek.length % plan.cardio.sessions.length]?.minutesByWeek[week - 1]} min` : ''}</span>
          ${plan.cardio.sessions.length ? html`<button class="btn btn-small" data-timer="${plan.cardio.sessions[cardioThisWeek.length % plan.cardio.sessions.length].id}">${raw(icon('timer', { size: 16 }))} Timer</button>` : ''}
        </div>
        <p class="muted small">${streakWeeks(plan, s.workouts, today)} Woche${streakWeeks(plan, s.workouts, today) === 1 ? '' : 'n'} in Folge dran · ${s.workouts.length} Trainings gesamt</p>
      </div>

      <div class="grid2">
        <div class="card">
          <div class="row between"><div class="card-title">Check-in</div>${readiness ? html`<span class="readiness ${readiness.level}">${readiness.score} %</span>` : ''}</div>
          <p class="small">${advice.text}</p>
          <button class="btn ${checkin ? 'btn-ghost btn-small' : 'btn-primary'}" data-act="checkin">${raw(icon('sun', { size: 16 }))} ${checkin ? 'Check-in ändern' : 'Check-in (30 Sekunden)'}</button>
        </div>
        <div class="card">
          <div class="card-title">Ernährung heute</div>
          <div class="stat"><span class="stat-num">${eaten.kcal}</span><span class="stat-unit">/ ${nutrition.target} kcal</span></div>
          <div class="mini-bar"><div style="width:${Math.min(100, (eaten.kcal / nutrition.target) * 100).toFixed(0)}%"></div></div>
          <p class="muted small">Protein ${eaten.protein} / ${nutrition.protein} g · ${nutrition.target - eaten.kcal > 0 ? `${nutrition.target - eaten.kcal} kcal übrig` : `${eaten.kcal - nutrition.target} kcal drüber`}</p>
          <a class="btn btn-ghost btn-small" href="#/ernaehrung">${raw(icon('food', { size: 16 }))} Tagebuch</a>
        </div>
        <div class="card">
          <div class="card-title">Gewicht</div>
          <div class="stat"><span class="stat-num">${lastWeight ? fmtKg(lastWeight.weightKg).replace(' kg', '') : '–'}</span><span class="stat-unit">kg${lastWeight ? ` · ${formatDate(lastWeight.date)}` : ''}</span></div>
          <form class="row gap" id="weight-form"><input id="weight-input" type="number" step="0.1" inputmode="decimal" placeholder="Heute in kg" aria-label="Gewicht heute" value="${lastWeight?.date === today ? lastWeight.weightKg : ''}"><button class="btn" type="submit">${raw(icon('check', { size: 16 }))}</button></form>
        </div>
      </div>
    </section>`);

  root.querySelector('[data-act="new-meso"]')?.addEventListener('click', startNewMeso);
  root.querySelector('[data-act="checkin"]').addEventListener('click', () => openCheckin(checkin));
  root.querySelector('[data-act="discard"]')?.addEventListener('click', () => {
    store.update((st) => (st.activeWorkout = null));
    toast('Training verworfen.');
  });
  root.querySelectorAll('[data-act="other"]').forEach((b) => b.addEventListener('click', () => pickOtherSession(plan)));
  root.querySelectorAll('[data-act="log-cardio"]').forEach((b) => b.addEventListener('click', () => openCardioLog(plan, week)));
  root.querySelectorAll('[data-act="mobility"]').forEach((b) => b.addEventListener('click', () => openMobility(plan, next.kind === 'heute' || next.kind === 'nachholen' ? next.day : null)));
  root.querySelectorAll('[data-timer]').forEach((b) => b.addEventListener('click', () => {
    const c = plan.cardio.sessions.find((x) => x.id === b.dataset.timer);
    if (c) openIntervalTimer(c, week);
  }));
  root.querySelectorAll('[data-goal]').forEach((b) => b.addEventListener('click', () => {
    const act = b.dataset.goalAct;
    if (act === 'checkin') return openCheckin(checkin);
    if (act === 'mobility') return openMobility(plan, next.kind === 'heute' || next.kind === 'nachholen' ? next.day : null);
    if (act === 'weight') return root.querySelector('#weight-input')?.focus();
    location.hash = b.dataset.href;
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
    toast(`Gewicht gespeichert · +${XP.weight} XP`, 'ok');
  });
  celebrateIfPerfect(s, today, perfect);
  celebrateChallenges(s, ws, challenges);
  celebrateStreak(s, streak);
  noteNewBadges(s, today);
  try {
    sessionStorage.setItem('lmci.xpShown', String(xp));
  } catch { /* egal */ }
  animateAll(root);
}

// Abgeschlossene Herausforderungen einmalig feiern.
function celebrateChallenges(s, ws, challenges) {
  const done = challenges.filter((c) => c.done).map((c) => `${ws}:${c.id}`);
  const known = new Set(s.meta.celebrated?.challenges || []);
  const fresh = done.filter((k) => !known.has(k));
  if (!fresh.length) return;
  store.update((st) => {
    st.meta.celebrated.challenges = [...known, ...fresh].slice(-200);
  }, { silent: true });
  store.saveNow();
  confetti({ count: 110 });
  const names = challenges.filter((c) => fresh.includes(`${ws}:${c.id}`));
  toast(`Herausforderung geschafft: ${names.map((c) => c.name).join(', ')} · +${names.reduce((a, c) => a + c.xp, 0)} XP`, 'ok');
}

// Streak-Meilensteine einmalig feiern.
function celebrateStreak(s, streak) {
  const reached = STREAK_MILESTONES.filter((m) => streak >= m).pop();
  if (!reached) return;
  if ((s.meta.celebrated?.streak || 0) >= reached) return;
  store.update((st) => (st.meta.celebrated.streak = reached), { silent: true });
  store.saveNow();
  confetti({ count: 80 });
  toast(`${reached} Tage in Folge! Die Flamme brennt.`, 'ok');
}

// Perfekter Tag: einmal pro Tag Konfetti.
function celebrateIfPerfect(s, today, perfect) {
  if (!perfect) return;
  if (s.meta.celebrated?.perfectDay === today) return;
  store.update((st) => (st.meta.celebrated.perfectDay = today), { silent: true });
  store.saveNow();
  confetti({ count: 90 });
  toast(`Perfekter Tag! +${XP.perfectDay} XP`, 'ok');
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
  confetti();
  toast('Neuer Block erstellt – viel Erfolg!', 'ok');
  location.hash = '#/plan';
}

function pickOtherSession(plan) {
  openModal(
    `<ul class="list tappable">${plan.days.map((d) => `<li><a href="#/workout/${d.id}" data-close-modal><strong>${d.name}</strong><div class="muted">${d.exercises.length} Übungen · ca. ${d.minutes} min</div></a></li>`).join('')}<li><a href="#/schnell" data-close-modal><strong>Schnelltraining</strong><div class="muted">Ausrüstung und Fokus wählen – Aufgaben bekommen</div></a></li><li><a href="#/workout/frei" data-close-modal><strong>Freies Training</strong><div class="muted">Ohne Vorgabe – Übungen selbst zusammenstellen</div></a></li></ul>`,
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
      <div class="row end"><button class="btn btn-primary" type="submit">Speichern · +${XP.checkin} XP</button></div>
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
    const first = !store.get().checkins.some((x) => x.date === today);
    store.update((st) => {
      st.checkins = st.checkins.filter((x) => x.date !== today);
      st.checkins.push(entry);
    });
    closeModal();
    toast(first ? `Check-in gespeichert · +${XP.checkin} XP` : 'Check-in aktualisiert.', 'ok');
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
    toast(`Cardio gespeichert · +${Math.round(Math.min(120, minutes) * XP.cardioPerMin)} XP`, 'ok');
  });
}

export function openMobility(plan, todayDay) {
  const lower = todayDay && /Unterkörper|Beine|Ganzkörper/.test(todayDay.name);
  const upper = todayDay && /Oberkörper|Push|Pull/.test(todayDay.name);
  const key = lower ? 'unterkoerper' : upper ? 'oberkoerper' : 'ruhetag';
  const titles = { unterkoerper: 'Unterkörper-Routine', oberkoerper: 'Oberkörper-Routine', ruhetag: 'Ruhetag-Routine' };
  const items = (plan.mobility[key] || []).map((m) => MOBILITY_BY_ID[m]).filter(Boolean);
  const today = toISODate();
  const done = (store.get().mobilityLogs || []).includes(today);
  const m = openModal(
    `<ol class="mob-list">${items.map((it) => `<li>${figureForMobility(it, { size: 50, cls: 'thumb' })}<div><strong>${it.name}</strong><div class="muted">${it.cue}</div></div><span class="pill">${it.seconds}s${it.perSide ? ' / Seite' : ''}</span></li>`).join('')}</ol>
     <p class="hint">Ruhig atmen, nichts erzwingen. Regelmäßigkeit zählt mehr als Dauer.</p>
     <button class="btn ${done ? 'btn-ghost' : 'btn-ok'} btn-big" id="mob-done">${done ? 'Heute schon erledigt ✓' : `Erledigt · +${XP.mobility} XP`}</button>`,
    { title: titles[key] },
  );
  m.querySelector('#mob-done').addEventListener('click', () => {
    if (!done) {
      store.update((st) => {
        if (!st.mobilityLogs.includes(today)) st.mobilityLogs.push(today);
      });
      toast(`Mobilität erledigt · +${XP.mobility} XP`, 'ok');
    }
    closeModal();
  });
}

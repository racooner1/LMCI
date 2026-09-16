// Onboarding: 5 Schritte → Profil → Plan.
import { html, raw, formData, num, toast } from './dom.js';
import { GOALS, EXPERIENCE, generatePlan } from '../engine/plan.js';
import { defaultCardioSessions, CARDIO_ACTIVITIES, CARDIO_GROUPS } from '../engine/cardio.js';
import { ACTIVITY_LEVELS } from '../engine/nutrition.js';
import { LIMITATIONS, GEAR, PRIORITY_OPTIONS, MUSCLE_BY_ID } from '../data/muscles.js';
import { WEEKDAYS_LONG } from '../engine/util.js';
import * as store from '../state.js';

const STEPS = ['Über dich', 'Ziel', 'Training', 'Ausrüstung', 'Cardio & Fokus'];

export const DEMO_PROFILE = {
  name: 'Beispiel', sex: 'm', age: 29, heightCm: 180, weightKg: 79, activityLevel: 'leicht',
  goal: 'muskelaufbau', experience: 'fortgeschritten', strengthDays: 4, sessionMinutes: 60, trainingWeekdays: [0, 1, 3, 4],
  equipment: 'gym', gear: [], limitations: [], cardio: ['laufen', 'rad'], cardioSessions: 2, priorities: ['brust'], restingHr: 58,
};

let step = 0;
let draft = {};

export function renderOnboarding(root, { edit = false } = {}) {
  const s = store.get();
  if (edit && s.profile && !draft.__edit) {
    draft = { ...s.profile, __edit: true };
  } else if (!edit && !draft.__started) {
    draft = { __started: true, sex: 'm', activityLevel: 'leicht', goal: 'muskelaufbau', experience: 'anfaenger', strengthDays: 3, sessionMinutes: 60, equipment: 'gym', gear: [], limitations: [], cardio: ['walken'], priorities: [] };
  }
  root.innerHTML = String(html`
    <section class="onb">
      <header class="onb-head">
        <div class="brand">LMCI</div>
        <p class="lede">${edit ? 'Profil anpassen – danach wird dein Plan neu berechnet.' : 'Dein Trainingsplan, auf dich zugeschnitten. Ohne Abo, ohne Konto – alles bleibt auf deinem Gerät.'}</p>
        <ol class="steps">${STEPS.map((t, i) => html`<li class="${i === step ? 'active' : i < step ? 'done' : ''}"><span>${i + 1}</span>${t}</li>`)}</ol>
      </header>
      <form id="onb-form" class="card onb-card" novalidate>${raw(renderStep(step, draft))}</form>
      <div class="row gap between onb-nav">
        <button type="button" class="btn" data-act="back" ${step === 0 ? 'disabled' : ''}>Zurück</button>
        ${step === 0 && !edit ? html`<button type="button" class="btn btn-ghost" data-act="demo">Mit Beispielprofil ausprobieren</button>` : ''}
        <button type="button" class="btn btn-primary" data-act="next">${step === STEPS.length - 1 ? 'Plan erstellen' : 'Weiter'}</button>
      </div>
    </section>`);

  root.querySelector('[data-act="back"]').onclick = () => {
    collect(root);
    step = Math.max(0, step - 1);
    renderOnboarding(root, { edit });
  };
  root.querySelector('[data-act="next"]').onclick = () => {
    const err = collect(root);
    if (err) return toast(err, 'warn');
    if (step < STEPS.length - 1) {
      step++;
      renderOnboarding(root, { edit });
    } else finish(edit);
  };
  root.querySelector('[data-act="demo"]')?.addEventListener('click', () => {
    draft = { ...DEMO_PROFILE };
    finish(false);
  });
  // Ziel → sinnvolle Cardio-Vorgabe übernehmen
  root.querySelectorAll('input[name="goal"]').forEach((el) => el.addEventListener('change', (e) => {
    draft.cardioSessions = defaultCardioSessions(e.target.value);
  }));
  root.querySelectorAll('input[name="equipment"]').forEach((el) => el.addEventListener('change', (e) => {
    root.querySelector('#gear-box').hidden = e.target.value === 'gym';
  }));
  root.querySelector('#f-strengthDays')?.addEventListener('change', (e) => {
    const n = Number(e.target.value);
    const boxes = [...root.querySelectorAll('input[name="trainingWeekdays[]"]')];
    boxes.forEach((b) => (b.checked = false));
    const def = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 3, 4, 5], 6: [0, 1, 2, 3, 4, 5] }[n] || [];
    def.forEach((i) => (boxes[i].checked = true));
  });
  window.scrollTo({ top: 0 });
}

function collect(root) {
  const form = root.querySelector('#onb-form');
  const d = formData(form);
  if (step === 0) {
    draft.name = (d.name || '').trim();
    draft.sex = d.sex;
    draft.age = num(d.age);
    draft.heightCm = num(d.heightCm);
    draft.weightKg = num(d.weightKg);
    draft.activityLevel = d.activityLevel;
    draft.restingHr = num(d.restingHr, 0) || undefined;
    if (!draft.age || draft.age < 14 || draft.age > 99) return 'Bitte ein Alter zwischen 14 und 99 angeben.';
    if (!draft.heightCm || draft.heightCm < 120 || draft.heightCm > 230) return 'Bitte eine Körpergröße in cm angeben (120–230).';
    if (!draft.weightKg || draft.weightKg < 30 || draft.weightKg > 250) return 'Bitte ein Körpergewicht in kg angeben (30–250).';
  }
  if (step === 1) {
    draft.goal = d.goal;
    draft.experience = d.experience;
    if (draft.cardioSessions == null) draft.cardioSessions = defaultCardioSessions(d.goal);
  }
  if (step === 2) {
    draft.strengthDays = num(d.strengthDays, 3);
    draft.sessionMinutes = num(d.sessionMinutes, 60);
    draft.trainingWeekdays = (d.trainingWeekdays || []).map(Number);
    if (draft.trainingWeekdays.length && draft.trainingWeekdays.length !== draft.strengthDays) {
      return `Bitte genau ${draft.strengthDays} Wochentage wählen (oder keinen – dann verteile ich sie).`;
    }
  }
  if (step === 3) {
    draft.equipment = d.equipment;
    draft.gear = d.equipment === 'gym' ? [] : d.gear || [];
    draft.limitations = d.limitations || [];
  }
  if (step === 4) {
    draft.cardio = d.cardio || [];
    draft.cardioSessions = num(d.cardioSessions, 2);
    draft.priorities = (d.priorities || []).slice(0, 2);
    if (draft.cardioSessions > 0 && !draft.cardio.length) return 'Bitte mindestens eine Cardio-Aktivität wählen (oder Cardio auf 0 setzen).';
  }
  return '';
}

function finish(edit) {
  const profile = { ...draft };
  delete profile.__edit;
  delete profile.__started;
  const s = store.get();
  const keepPlan = edit && s.plan && samePlanInputs(s.profile, profile);
  store.update((st) => {
    st.profile = profile;
    if (!keepPlan) {
      if (st.plan) st.planHistory.push(st.plan);
      st.plan = generatePlan(profile, { mesoIndex: st.plan ? st.plan.mesoIndex + 1 : 0 });
    }
    if (profile.weightKg && !st.bodyLogs.some((b) => b.date === st.meta.lastOpened)) {
      st.bodyLogs.push({ date: st.meta.lastOpened, weightKg: profile.weightKg });
    }
  });
  draft = {};
  step = 0;
  toast(keepPlan ? 'Profil gespeichert.' : 'Dein Plan ist fertig.', 'ok');
  location.hash = keepPlan ? '#/mehr' : '#/plan';
}

const PLAN_KEYS = ['goal', 'experience', 'strengthDays', 'sessionMinutes', 'equipment', 'gear', 'limitations', 'cardio', 'cardioSessions', 'priorities', 'trainingWeekdays'];
function samePlanInputs(a, b) {
  if (!a) return false;
  return PLAN_KEYS.every((k) => JSON.stringify(a[k] ?? null) === JSON.stringify(b[k] ?? null));
}

function radioCards(name, options, selected, { desc = true } = {}) {
  return options.map(
    ([id, o]) => html`<label class="choice ${selected === id ? 'selected' : ''}">
      <input type="radio" name="${name}" value="${id}" ${selected === id ? 'checked' : ''}>
      <span class="choice-title">${o.name}</span>${desc && o.desc ? html`<span class="choice-desc">${o.desc}</span>` : ''}
    </label>`,
  );
}

function checkChips(name, options, selected) {
  return options.map(
    ([id, label]) => html`<label class="chip"><input type="checkbox" name="${name}[]" value="${id}" ${selected.includes(id) ? 'checked' : ''}><span>${label}</span></label>`,
  );
}

function renderStep(i, d) {
  if (i === 0) {
    return html`
      <h2>Über dich</h2>
      <p class="muted">Für Kalorienbedarf, Pulszonen und die Wahl des richtigen Volumens.</p>
      <div class="grid2">
        <label class="field"><span>Vorname (optional)</span><input id="f-name" name="name" value="${d.name || ''}" autocomplete="given-name"></label>
        <label class="field"><span>Geschlecht</span><select id="f-sex" name="sex"><option value="m" ${d.sex === 'm' ? 'selected' : ''}>männlich</option><option value="w" ${d.sex === 'w' ? 'selected' : ''}>weiblich</option><option value="d" ${d.sex === 'd' ? 'selected' : ''}>divers</option></select></label>
        <label class="field"><span>Alter</span><input id="f-age" name="age" type="number" inputmode="numeric" min="14" max="99" value="${d.age || ''}" required></label>
        <label class="field"><span>Größe (cm)</span><input id="f-height" name="heightCm" type="number" inputmode="numeric" min="120" max="230" value="${d.heightCm || ''}" required></label>
        <label class="field"><span>Gewicht (kg)</span><input id="f-weight" name="weightKg" type="number" inputmode="decimal" step="0.1" min="30" max="250" value="${d.weightKg || ''}" required></label>
        <label class="field"><span>Ruhepuls (optional)</span><input id="f-rhr" name="restingHr" type="number" inputmode="numeric" min="30" max="110" value="${d.restingHr || ''}" placeholder="z. B. 60"></label>
      </div>
      <h3>Alltag außerhalb des Trainings</h3>
      <div class="choices">${radioCards('activityLevel', Object.entries(ACTIVITY_LEVELS), d.activityLevel)}</div>`;
  }
  if (i === 1) {
    return html`
      <h2>Was willst du erreichen?</h2>
      <div class="choices">${radioCards('goal', Object.entries(GOALS), d.goal)}</div>
      <h3>Trainingserfahrung</h3>
      <div class="choices">${radioCards('experience', Object.entries(EXPERIENCE), d.experience)}</div>`;
  }
  if (i === 2) {
    const wd = d.trainingWeekdays || [];
    return html`
      <h2>Wie viel Zeit hast du?</h2>
      <div class="grid2">
        <label class="field"><span>Krafttraining pro Woche</span>
          <select id="f-strengthDays" name="strengthDays">${[2, 3, 4, 5, 6].map((n) => html`<option value="${n}" ${d.strengthDays === n ? 'selected' : ''}>${n} Einheiten</option>`)}</select></label>
        <label class="field"><span>Dauer pro Einheit</span>
          <select id="f-sessionMinutes" name="sessionMinutes">${[30, 45, 60, 75, 90].map((n) => html`<option value="${n}" ${d.sessionMinutes === n ? 'selected' : ''}>${n} Minuten</option>`)}</select></label>
      </div>
      <h3>An welchen Tagen? <span class="muted">(optional)</span></h3>
      <div class="chips">${checkChips('trainingWeekdays', WEEKDAYS_LONG.map((n, idx) => [idx, n]), wd)}</div>
      <p class="hint">2–3 Einheiten: Ganzkörper · 4: Ober-/Unterkörper · 5–6: Push/Pull/Beine. Jede Muskelgruppe wird so mindestens 2× pro Woche trainiert.</p>`;
  }
  if (i === 3) {
    return html`
      <h2>Wo trainierst du?</h2>
      <div class="choices">
        <label class="choice ${d.equipment === 'gym' ? 'selected' : ''}"><input type="radio" id="f-equipment" name="equipment" value="gym" ${d.equipment === 'gym' ? 'checked' : ''}><span class="choice-title">Fitnessstudio</span><span class="choice-desc">Langhanteln, Maschinen, Kabelzug, Kurzhanteln</span></label>
        <label class="choice ${d.equipment === 'home' ? 'selected' : ''}"><input type="radio" name="equipment" value="home" ${d.equipment === 'home' ? 'checked' : ''}><span class="choice-title">Zuhause / unterwegs</span><span class="choice-desc">Körpergewicht plus das, was du hast</span></label>
      </div>
      <div id="gear-box" ${d.equipment === 'gym' ? 'hidden' : ''}>
        <h3>Was hast du zuhause?</h3>
        <div class="chips">${checkChips('gear', GEAR.map((g) => [g.id, g.name]), d.gear || [])}</div>
      </div>
      <h3>Beschwerden / Einschränkungen</h3>
      <div class="chips">${checkChips('limitations', LIMITATIONS.map((l) => [l.id, l.name]), d.limitations || [])}</div>
      <p class="hint">Betroffene Übungen werden ausgelassen. Das ersetzt keine ärztliche Abklärung.</p>`;
  }
  return html`
    <h2>Cardio & Schwerpunkte</h2>
    <label class="field"><span>Cardio-Einheiten pro Woche</span>
      <select id="f-cardioSessions" name="cardioSessions">${[0, 1, 2, 3, 4, 5].map((n) => html`<option value="${n}" ${(d.cardioSessions ?? 2) === n ? 'selected' : ''}>${n === 0 ? 'Kein Cardio' : `${n} Einheit${n > 1 ? 'en' : ''}`}</option>`)}</select></label>
    <h3>Welche Aktivitäten magst du?</h3>
    <p class="muted small">Mehrfachauswahl. Die erste Gruppe ist geöffnet, die anderen aufklappen.</p>
    ${CARDIO_GROUPS.map((g, i) => html`<details class="group" ${i === 0 || CARDIO_ACTIVITIES.some((a) => a.group === g && (d.cardio || []).includes(a.id)) ? 'open' : ''}><summary>${g} <span class="muted small">(${CARDIO_ACTIVITIES.filter((a) => a.group === g).length})</span></summary><div class="chips">${checkChips('cardio', CARDIO_ACTIVITIES.filter((a) => a.group === g).map((a) => [a.id, a.name]), d.cardio || [])}</div></details>`)}
    <h3>Muskelgruppen mit Vorrang <span class="muted">(max. 2, optional)</span></h3>
    <div class="chips">${checkChips('priorities', PRIORITY_OPTIONS.map((m) => [m, MUSCLE_BY_ID[m].short]), d.priorities || [])}</div>
    <p class="hint">Vorrang bedeutet ca. 30 % mehr Sätze für diese Muskeln, der Rest wird leicht reduziert.</p>`;
}

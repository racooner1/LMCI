// Optionaler KI-Coach: Fragen zu Plan, Fortschritt und Ernährung – mit eigenem Anthropic-API-Schlüssel.
import { html, raw, esc, toast, openModal, closeModal, confirmDialog } from './dom.js';
import * as store from '../state.js';
import { GOALS, EXPERIENCE, planWeek, effectiveSets } from '../engine/plan.js';
import { getExercise } from '../data/exercises.js';
import { MUSCLE_BY_ID } from '../data/muscles.js';
import { personalRecords, totalSets, totalTonnage, weeklyVolume } from '../engine/analytics.js';
import { weightTrend } from '../engine/nutrition.js';
import { weeklyReview } from '../engine/food.js';
import { dailyTargets } from './ernaehrung.js';
import { toISODate, startOfWeek, formatDate } from '../engine/util.js';
import { dailyStreak } from '../engine/achievements.js';

export const COACH_MODELS = [
  { id: 'claude-opus-5', name: 'Claude Opus 5 (Standard, am besten)' },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5 (günstiger)' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5 (am günstigsten)' },
];

const QUICK = [
  ['Wochen-Review', 'Mach ein kurzes Wochen-Review: Was lief gut, was nicht, und was sind die 2–3 wichtigsten Punkte für nächste Woche?'],
  ['Ist mein Plan richtig?', 'Passt mein aktueller Plan zu meinem Ziel und meiner Erholung? Wo würdest du etwas ändern und warum?'],
  ['Ernährung', 'Wie sieht meine Ernährung im Vergleich zum Ziel aus? Gib mir 3 konkrete, einfache Anpassungen.'],
  ['Motivation', 'Ich habe gerade wenig Motivation. Was ist die kleinste sinnvolle Einheit, die ich heute machen kann?'],
];

const SYSTEM = `Du bist der persönliche Trainings- und Ernährungscoach in der App LMCI. Du antwortest auf Deutsch, per Du, kurz und konkret (meist unter 200 Wörtern), ohne Floskeln. Du stützt dich auf die aktuelle Trainingswissenschaft (Volumen 10–20 Sätze pro Muskel und Woche, 0–3 Wiederholungen in Reserve, doppelte Progression, Deloads, Protein 1,6–2,2 g/kg, Gewichtstrend statt Tageswerte). Du kennst den Plan, die Logs und die Ernährung des Nutzers aus dem Kontext und beziehst dich darauf mit konkreten Zahlen. Du stellst keine medizinischen Diagnosen; bei Schmerzen oder Beschwerden empfiehlst du eine ärztliche Abklärung. Wenn Daten fehlen, sagst du das und fragst nach. Formatiere sparsam: kurze Absätze oder wenige Stichpunkte, keine Überschriften.`;

function buildContext(s) {
  const { profile, plan } = s;
  const today = toISODate();
  const week = planWeek(plan, today);
  const lines = [];
  lines.push(`Datum: ${today}. Nutzer: ${profile.name || 'ohne Namen'}, ${profile.sex === 'w' ? 'weiblich' : profile.sex === 'm' ? 'männlich' : 'divers'}, ${profile.age} Jahre, ${profile.heightCm} cm, ${profile.weightKg} kg. Ziel: ${GOALS[profile.goal]?.name}. Erfahrung: ${EXPERIENCE[profile.experience]?.name}. ${profile.strengthDays}× Kraft à ${profile.sessionMinutes} min, ${profile.cardioSessions ?? 0}× Cardio. Ausrüstung: ${profile.equipment === 'gym' ? 'Studio' : `Zuhause (${(profile.gear || []).join(', ') || 'nur Körpergewicht'})`}. Einschränkungen: ${(profile.limitations || []).join(', ') || 'keine'}. Prioritäten: ${(profile.priorities || []).join(', ') || 'keine'}.${profile.targetWeightKg ? ` Zielgewicht ${profile.targetWeightKg} kg.` : ''}`);
  lines.push(`Plan: ${plan.split.name}, Block ${plan.mesoIndex + 1}, Woche ${week}/${plan.weeks}${week === plan.deloadWeek ? ' (Deload)' : ''}, RIR-Vorgabe ${plan.rir[week - 1]}. Start ${plan.startDate}.`);
  for (const d of plan.days) lines.push(`- ${d.name} (${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][d.weekday] || '?'}): ${d.exercises.map((pe) => `${getExercise(pe.exId)?.name || pe.exId} ${effectiveSets(plan, d, pe, week)}×${pe.repMin}–${pe.repMax}`).join('; ')}`);
  const adj = Object.entries(plan.muscleAdjust || {}).filter(([, v]) => v);
  if (adj.length) lines.push(`Autoregulation (Sätze/Übung): ${adj.map(([m, v]) => `${MUSCLE_BY_ID[m]?.short} ${v > 0 ? '+' : ''}${v}`).join(', ')}`);
  const vol = weeklyVolume(s.workouts, startOfWeek(today));
  lines.push(`Sätze diese Woche pro Muskel: ${Object.entries(vol).filter(([, v]) => v).map(([m, v]) => `${MUSCLE_BY_ID[m]?.short} ${v}`).join(', ') || 'noch keine'}. Ziele: ${Object.entries(plan.volume).map(([m, v]) => `${MUSCLE_BY_ID[m]?.short} ${v.target}`).join(', ')}.`);
  const recent = [...s.workouts].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  lines.push(`Letzte Trainings (${s.workouts.length} gesamt, Streak ${dailyStreak(s, today)} Tage):`);
  for (const w of recent) {
    const name = w.dayId === 'frei' ? 'Frei' : plan.days.find((x) => x.id === w.dayId)?.name || 'Training';
    lines.push(`- ${w.date} ${name}${w.mode === 'leicht' ? ' (leicht)' : ''}: ${totalSets(w)} Sätze, ${totalTonnage(w)} kg${w.feedback ? `, RPE ${w.feedback.rpe}, Leistung ${w.feedback.performance}${w.feedback.sore?.length ? `, nicht erholt: ${w.feedback.sore.join(',')}` : ''}` : ''}. ${w.entries.slice(0, 5).map((e) => `${getExercise(e.exId)?.name || e.exId} ${e.sets.map((x) => `${x.weight ? `${x.weight}×` : ''}${x.reps}${x.rir != null ? `@${x.rir}` : ''}`).join(',')}`).join('; ')}`);
  }
  const prs = personalRecords(s.workouts).slice(0, 6);
  if (prs.length) lines.push(`Bestleistungen (e1RM): ${prs.map((r) => `${getExercise(r.exId)?.name || r.exId} ${r.e1rm || `${r.reps} Wdh`}`).join(', ')}`);
  const cardio = s.cardioLogs.filter((c) => c.date >= startOfWeek(today));
  lines.push(`Cardio diese Woche: ${cardio.length} Einheiten, ${cardio.reduce((a, c) => a + c.minutes, 0)} min (Plan: ${plan.cardio.sessionsPerWeek}).`);
  const ci = (s.checkins || []).slice(-7);
  if (ci.length) lines.push(`Check-ins (letzte ${ci.length}): ${ci.map((c) => `${c.date.slice(5)} Schlaf ${c.sleep}h/${c.sleepQuality} Stress ${c.stress} Energie ${c.energy}${c.sore?.length ? ` Kater ${c.sore.join(',')}` : ''}`).join('; ')}`);
  const t = dailyTargets(s);
  const rv = weeklyReview({ foodLog: s.foodLog, bodyLogs: s.bodyLogs, target: t.target, protein: t.protein, profile, today });
  lines.push(`Ernährung: Ziel ${t.target} kcal, ${t.protein} g Protein. Letzte 7 Tage: ${rv.loggedDays} Tage erfasst, Ø ${rv.avgKcal} kcal, Ø ${rv.avgProtein} g Protein.`);
  const tr = weightTrend(s.bodyLogs);
  if (tr) lines.push(`Gewichtstrend: ${tr.current.toFixed(1)} kg, ${tr.perWeek > 0 ? '+' : ''}${tr.perWeek.toFixed(2)} kg/Woche (${tr.perWeekPct.toFixed(2)} %/Woche) über ${tr.days} Tage.`);
  return lines.join('\n');
}

let busy = false;

export function renderCoach(root) {
  const s = store.get();
  const coach = s.coach || { apiKey: '', model: 'claude-opus-5', history: [] };
  const hasKey = !!coach.apiKey;
  root.innerHTML = String(html`
    <section class="page coach">
      <header class="page-head"><div><h1>KI-Coach</h1><p class="muted">Optional · nutzt deinen eigenen Anthropic-Schlüssel, Abrechnung nach Verbrauch statt Abo</p></div><button class="btn btn-small" data-act="settings">Einstellungen</button></header>
      ${!hasKey ? html`<div class="card card-accent">
        <div class="card-title">Einrichten</div>
        <p class="small">Der Coach kennt deinen Plan, deine Logs und deine Ernährung und beantwortet Fragen dazu. Er läuft über die Anthropic-API mit deinem eigenen Schlüssel – der Schlüssel bleibt in diesem Browser. Eine Antwort kostet typischerweise wenige Cent.</p>
        <ol class="bullets small"><li>Auf console.anthropic.com einen API-Schlüssel erstellen.</li><li>Hier unter „Einstellungen“ einfügen.</li><li>Fragen stellen.</li></ol>
        <button class="btn btn-primary" data-act="settings">Schlüssel eintragen</button>
      </div>` : ''}
      <div class="chat" id="chat">
        ${coach.history.length ? coach.history.map((m) => html`<div class="msg ${m.role}">${raw(formatText(m.content))}</div>`) : html`<p class="muted small">Noch keine Unterhaltung. Stell eine Frage oder nimm eine Vorlage.</p>`}
      </div>
      <div class="chips">${QUICK.map(([label, q], i) => html`<button class="chip" data-quick="${i}" ${!hasKey || busy ? 'disabled' : ''}>${label}</button>`)}</div>
      <form id="chat-form" class="row gap"><input id="chat-input" class="search" placeholder="Frag deinen Coach…" autocomplete="off" ${!hasKey || busy ? 'disabled' : ''}><button class="btn btn-primary" type="submit" ${!hasKey || busy ? 'disabled' : ''}>Senden</button></form>
      ${coach.history.length ? html`<button class="btn btn-ghost btn-small" data-act="clear">Verlauf löschen</button>` : ''}
      <p class="muted small">Der Coach ersetzt keine ärztliche Beratung. Deine Daten werden nur für die jeweilige Anfrage an die Anthropic-API gesendet.</p>
    </section>`);

  root.querySelectorAll('[data-act="settings"]').forEach((b) => b.addEventListener('click', openCoachSettings));
  root.querySelectorAll('[data-quick]').forEach((b) => b.addEventListener('click', () => send(root, QUICK[Number(b.dataset.quick)][1])));
  root.querySelector('#chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = root.querySelector('#chat-input').value.trim();
    if (v) send(root, v);
  });
  root.querySelector('[data-act="clear"]')?.addEventListener('click', async () => {
    if (await confirmDialog('Verlauf löschen?')) {
      store.update((st) => (st.coach.history = []));
      renderCoach(root);
    }
  });
  const chat = root.querySelector('#chat');
  chat.scrollTop = chat.scrollHeight;
}

function formatText(t) {
  const safe = esc(t);
  return safe
    .split(/\n{2,}/)
    .map((p) => {
      const lines = p.split('\n');
      if (lines.every((l) => /^\s*[-•*]\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${l.replace(/^\s*[-•*]\s+/, '')}</li>`).join('')}</ul>`;
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    })
    .join('')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

async function send(root, text) {
  if (busy) return;
  const s = store.get();
  const coach = s.coach;
  busy = true;
  store.update((st) => {
    st.coach.history.push({ role: 'user', content: text, at: new Date().toISOString() });
    st.coach.history = st.coach.history.slice(-30);
  }, { silent: true });
  renderCoach(root);
  const chat = root.querySelector('#chat');
  const bubble = document.createElement('div');
  bubble.className = 'msg assistant streaming';
  bubble.textContent = '…';
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
  let answer = '';
  try {
    const { default: Anthropic } = await import('../../vendor/anthropic-sdk.js');
    const client = new Anthropic({ apiKey: coach.apiKey, dangerouslyAllowBrowser: true });
    const history = store.get().coach.history.map((m) => ({ role: m.role, content: m.content }));
    const stream = client.messages.stream({
      model: coach.model || 'claude-opus-5',
      max_tokens: 4096,
      system: [
        { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `Kontext des Nutzers:\n${buildContext(store.get())}` },
      ],
      messages: history,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
    });
    stream.on('text', (delta) => {
      answer += delta;
      bubble.innerHTML = formatText(answer);
      chat.scrollTop = chat.scrollHeight;
    });
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') {
      answer = answer || 'Diese Anfrage kann ich nicht beantworten.';
    } else if (!answer) {
      answer = final.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n') || '(keine Antwort)';
    }
    store.update((st) => st.coach.history.push({ role: 'assistant', content: answer, at: new Date().toISOString() }), { silent: true });
  } catch (err) {
    const msg = err?.status === 401 ? 'Schlüssel ungültig – bitte in den Einstellungen prüfen.' : err?.status === 429 ? 'Zu viele Anfragen – kurz warten.' : err?.message || String(err);
    store.update((st) => st.coach.history.pop(), { silent: true });
    toast(`Coach nicht erreichbar: ${msg}`, 'warn');
  } finally {
    busy = false;
    store.saveNow();
    renderCoach(root);
  }
}

export function openCoachSettings() {
  const s = store.get();
  const c = s.coach || { apiKey: '', model: 'claude-opus-5' };
  const m = openModal(
    `<form id="cs-form" class="form">
      <label class="field"><span>Anthropic API-Schlüssel</span><input id="cs-key" type="password" autocomplete="off" value="${esc(c.apiKey || '')}" placeholder="sk-ant-…"></label>
      <label class="field"><span>Modell</span><select id="cs-model">${COACH_MODELS.map((mo) => `<option value="${mo.id}" ${c.model === mo.id ? 'selected' : ''}>${mo.name}</option>`).join('')}</select></label>
      <p class="muted small">Der Schlüssel wird nur lokal gespeichert und direkt an api.anthropic.com gesendet. Kosten entstehen pro Anfrage über dein Anthropic-Konto.</p>
      <div class="row between gap"><button type="button" class="btn btn-danger btn-small" id="cs-remove">Schlüssel entfernen</button><button class="btn btn-primary" type="submit">Speichern</button></div>
    </form>`,
    { title: 'KI-Coach einrichten' },
  );
  m.querySelector('#cs-remove').addEventListener('click', () => {
    store.update((st) => { st.coach.apiKey = ''; });
    closeModal();
    toast('Schlüssel entfernt.');
  });
  m.querySelector('#cs-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const key = m.querySelector('#cs-key').value.trim();
    const model = m.querySelector('#cs-model').value;
    store.update((st) => {
      st.coach ||= { apiKey: '', model: 'claude-opus-5', history: [] };
      st.coach.apiKey = key;
      st.coach.model = model;
    });
    closeModal();
    toast(key ? 'Coach eingerichtet.' : 'Gespeichert.', 'ok');
  });
}

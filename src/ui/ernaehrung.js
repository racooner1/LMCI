// Ernährung: Kalorien, Makros, Gewichtstrend.
import { html, raw, toast, num } from './dom.js';
import * as store from '../state.js';
import { computeNutrition, weightTrend, trendAdvice, ACTIVITY_LEVELS } from '../engine/nutrition.js';
import { GOALS } from '../engine/plan.js';
import { toISODate } from '../engine/util.js';

export function renderErnaehrung(root) {
  const s = store.get();
  const { profile, plan } = s;
  const n = computeNutrition(profile, plan);
  const trend = weightTrend(s.bodyLogs);
  const advice = trendAdvice(trend, profile);
  const pct = (g, kcalPerG) => Math.round(((g * kcalPerG) / n.target) * 100);
  const [lo, hi] = n.expectedRate;
  const goalName = GOALS[profile.goal]?.name;

  root.innerHTML = String(html`
    <section class="page">
      <header class="page-head"><div><h1>Ernährung</h1><p class="muted">Ziel: ${goalName} · ${profile.weightKg} kg</p></div></header>

      <div class="card card-accent">
        <div class="card-title">Tagesziel</div>
        <div class="stat big"><span class="stat-num">${n.target}</span><span class="stat-unit">kcal</span></div>
        <div class="macros">
          <div class="macro"><span class="macro-num">${n.protein} g</span><span class="macro-label">Protein</span><span class="muted small">${pct(n.protein, 4)} % · ${n.proteinPerKg} g/kg</span></div>
          <div class="macro"><span class="macro-num">${n.carbs} g</span><span class="macro-label">Kohlenhydrate</span><span class="muted small">${pct(n.carbs, 4)} %</span></div>
          <div class="macro"><span class="macro-num">${n.fat} g</span><span class="macro-label">Fett</span><span class="muted small">${pct(n.fat, 9)} %</span></div>
        </div>
        <p class="muted small">Dazu ca. ${n.fiber} g Ballaststoffe und ${(n.waterMl / 1000).toFixed(1).replace('.', ',')} l Flüssigkeit. Das sind Richtwerte – Protein ist die wichtigste Zahl, der Rest darf flexibel sein.</p>
      </div>

      <div class="card">
        <div class="card-title">So kommt die Zahl zustande</div>
        <table class="ex-table"><tbody>
          <tr><td>Grundumsatz (Mifflin-St Jeor)</td><td class="num">${n.bmr} kcal</td></tr>
          <tr><td>× Alltagsaktivität „${ACTIVITY_LEVELS[profile.activityLevel]?.name}“ (${n.activityFactor})</td><td class="num">${n.baseTdee} kcal</td></tr>
          <tr><td>+ Training (${n.strengthMinutesWeek} min Kraft, ${n.cardioMinutesWeek} min Cardio pro Woche, auf den Tag umgelegt)</td><td class="num">+${n.trainingPerDay} kcal</td></tr>
          <tr><td><strong>Erhaltungsbedarf</strong></td><td class="num"><strong>${n.tdee} kcal</strong></td></tr>
          <tr><td>${n.adjustment >= 0 ? 'Überschuss' : 'Defizit'} für „${goalName}“</td><td class="num">${n.adjustment >= 0 ? '+' : ''}${n.adjustment} kcal</td></tr>
        </tbody></table>
        <p class="muted small">Formeln schätzen ±10 %. Entscheidend ist der Gewichtstrend unten – danach wird nachjustiert. Erwartet: ${lo > 0 ? '+' : ''}${lo} bis ${hi > 0 ? '+' : ''}${hi} % Körpergewicht pro Woche.</p>
        <label class="field"><span>Alltagsaktivität ändern</span><select id="act-select">${Object.entries(ACTIVITY_LEVELS).map(([id, a]) => html`<option value="${id}" ${profile.activityLevel === id ? 'selected' : ''}>${a.name} – ${a.desc}</option>`)}</select></label>
      </div>

      <div class="card">
        <div class="card-title">Gewichtstrend</div>
        <div class="advice ${advice.level}">${advice.text}</div>
        <form class="row gap" id="weight-form"><input id="weight-input" type="number" step="0.1" inputmode="decimal" placeholder="Gewicht heute (kg)" aria-label="Gewicht heute"><button class="btn" type="submit">Speichern</button></form>
        <p class="muted small">Am besten morgens nach dem Toilettengang, vor dem Frühstück. Tagesschwankungen von 1–2 kg sind normal; deshalb zählt nur der 7-Tage-Schnitt.</p>
      </div>

      <div class="card">
        <div class="card-title">Praktische Regeln</div>
        <ul class="bullets">
          <li><strong>Protein auf 3–5 Mahlzeiten verteilen</strong> (je 0,4–0,5 g/kg): Magerquark, Skyr, Hähnchen, Fisch, Eier, Tofu, Hülsenfrüchte, Whey.</li>
          <li><strong>Um das Training herum</strong> Kohlenhydrate einplanen – Leistung im Training zählt mehr als das genaue Timing.</li>
          <li><strong>Fett nicht unter 0,7 g/kg</strong> – wichtig für Hormone; Olivenöl, Nüsse, fetter Fisch.</li>
          <li><strong>Gemüse und Obst</strong> zu jeder Mahlzeit – Sättigung, Ballaststoffe, Mikronährstoffe.</li>
          <li><strong>Schlaf 7–9 h.</strong> Zu wenig Schlaf senkt den Muskelaufbau und erhöht den Fettanteil beim Abnehmen messbar.</li>
          ${profile.goal === 'fettabbau' ? html`<li><strong>Diätpause:</strong> Nach 6–8 Wochen Defizit 1–2 Wochen auf Erhaltungskalorien – gut für Psyche, Hormone und Training.</li>` : ''}
          ${profile.goal === 'muskelaufbau' ? html`<li><strong>Nicht übertreiben:</strong> Ein Überschuss von 200–300 kcal reicht. Mehr wird vor allem Fett.</li>` : ''}
        </ul>
      </div>
    </section>`);

  root.querySelector('#act-select').addEventListener('change', (e) => {
    store.update((st) => (st.profile.activityLevel = e.target.value));
    toast('Aktivitätslevel gespeichert.', 'ok');
  });
  root.querySelector('#weight-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = num(root.querySelector('#weight-input').value);
    if (v < 30 || v > 250) return toast('Bitte ein plausibles Gewicht eingeben.', 'warn');
    const today = toISODate();
    store.update((st) => {
      st.bodyLogs = st.bodyLogs.filter((b) => b.date !== today);
      st.bodyLogs.push({ date: today, weightKg: v });
      st.profile.weightKg = v;
    });
    toast('Gewicht gespeichert.', 'ok');
  });
}

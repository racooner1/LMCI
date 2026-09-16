// Ernährung: Tagebuch, Ziele, Wochenrückblick.
import { html, raw, esc, toast, num, openModal, closeModal, confirmDialog } from './dom.js';
import * as store from '../state.js';
import { animateAll } from './motion.js';
import { computeNutrition, weightTrend, trendAdvice, ACTIVITY_LEVELS } from '../engine/nutrition.js';
import { MEALS, dayTotals, macrosFor, weeklyReview } from '../engine/food.js';
import { GOALS } from '../engine/plan.js';
import { toISODate, addDays, formatDate, uid } from '../engine/util.js';
import { openFoodPicker, openPortion, openCustomFood, openRecipe } from './foodpicker.js';
import { goalProjection } from '../engine/achievements.js';

let viewDate = toISODate();

// Tagesziele inkl. Wochen-Anpassung und manueller Vorgabe.
export function dailyTargets(s) {
  const n = computeNutrition(s.profile, s.plan);
  const o = s.settings.targetOverride;
  const adjust = s.settings.kcalAdjust || 0;
  if (o?.kcal) {
    const protein = o.protein || n.protein;
    const fat = o.fat || n.fat;
    const carbs = o.carbs || Math.max(0, Math.round((o.kcal - protein * 4 - fat * 9) / 4 / 5) * 5);
    return { ...n, target: o.kcal, protein, fat, carbs, computed: n.target, override: true, adjust };
  }
  const target = Math.max(1200, Math.round((n.target + adjust) / 10) * 10);
  const carbs = Math.max(0, Math.round((target - n.protein * 4 - n.fat * 9) / 4 / 5) * 5);
  return { ...n, target, carbs, computed: n.target, override: false, adjust };
}

export function renderErnaehrung(root) {
  const s = store.get();
  const { profile } = s;
  const n = dailyTargets(s);
  const today = toISODate();
  if (viewDate > today) viewDate = today;
  const entries = s.foodLog[viewDate] || [];
  const totals = dayTotals(entries);
  const remaining = n.target - totals.kcal;
  const water = s.waterLog[viewDate] || 0;
  const glasses = Math.round(water / 250);
  const waterGoal = Math.max(6, Math.round(n.waterMl / 250));
  const review = weeklyReview({ foodLog: s.foodLog, bodyLogs: s.bodyLogs, target: n.target, protein: n.protein, profile, today });
  const trend = weightTrend(s.bodyLogs);
  const advice = trendAdvice(trend, profile);
  const [lo, hi] = n.expectedRate;
  const yesterday = addDays(viewDate, -1);
  const pct = (v, t) => Math.min(100, t ? (v / t) * 100 : 0).toFixed(0);
  const maxDay = Math.max(n.target, ...review.days.map((d) => d.kcal));
  const goal = goalProjection(profile, s.bodyLogs, trend);

  root.innerHTML = String(html`
    <section class="page">
      <header class="page-head"><div><h1>Ernährung</h1><p class="muted">Ziel: ${GOALS[profile.goal]?.name} · ${profile.weightKg} kg</p></div></header>

      <div class="date-nav">
        <button class="btn" data-act="prev" aria-label="Vorheriger Tag">◀</button>
        <strong>${viewDate === today ? 'Heute' : viewDate === yesterday ? 'Gestern' : formatDate(viewDate)}</strong>
        <button class="btn" data-act="next" aria-label="Nächster Tag" ${viewDate >= today ? 'disabled' : ''}>▶</button>
        ${viewDate !== today ? html`<button class="btn btn-small" data-act="today">Heute</button>` : ''}
      </div>

      <div class="card card-accent">
        <div class="kcal-head"><span class="stat-num">${totals.kcal}</span><span class="muted">von ${n.target} kcal</span><span class="muted">·</span><strong class="${remaining < 0 ? 'danger-text' : ''}">${remaining >= 0 ? `${remaining} übrig` : `${-remaining} drüber`}</strong></div>
        <div class="kcal-bar"><div class="${remaining < 0 ? 'over' : ''}" style="width:${pct(totals.kcal, n.target)}%"></div></div>
        <div class="macro-bars">
          <div class="mbar protein"><span class="mbar-label">Protein</span><span><span class="mbar-num">${totals.protein}</span> / ${n.protein} g</span><div class="mbar-track"><div style="width:${pct(totals.protein, n.protein)}%"></div></div></div>
          <div class="mbar carbs"><span class="mbar-label">Kohlenhydrate</span><span><span class="mbar-num">${totals.carbs}</span> / ${n.carbs} g</span><div class="mbar-track"><div style="width:${pct(totals.carbs, n.carbs)}%"></div></div></div>
          <div class="mbar fat"><span class="mbar-label">Fett</span><span><span class="mbar-num">${totals.fat}</span> / ${n.fat} g</span><div class="mbar-track"><div style="width:${pct(totals.fat, n.fat)}%"></div></div></div>
        </div>
        <p class="muted small">Ballaststoffe ${totals.fiber} / ${n.fiber} g. Protein ist die wichtigste Zahl – Kohlenhydrate und Fett dürfen flexibel sein.</p>
      </div>

      ${MEALS.map((meal) => {
        const list = entries.filter((e) => e.meal === meal.id);
        const t = dayTotals(list);
        return html`<div class="card meal-card">
          <div class="meal-head"><div class="card-title">${meal.name}</div><span class="muted small">${t.kcal} kcal · P ${t.protein} g</span></div>
          ${list.map((e) => {
            const mac = macrosFor(e.per100, e.grams);
            return html`<div class="entry-row" data-entry="${e.id}" tabindex="0" role="button"><div><div>${e.name}</div><div class="muted">${e.grams} g${e.brand ? ` · ${e.brand}` : ''} · P ${mac.protein} · KH ${mac.carbs} · F ${mac.fat}</div></div><span class="entry-kcal">${mac.kcal} kcal</span></div>`;
          })}
          <button class="btn btn-small" data-add="${meal.id}">+ Lebensmittel</button>
        </div>`;
      })}

      <div class="row gap wrap">
        ${!entries.length && (s.foodLog[yesterday] || []).length ? html`<button class="btn btn-small" data-act="copy-yesterday">Gestern kopieren</button>` : ''}
        ${entries.length ? html`<button class="btn btn-small btn-ghost" data-act="clear-day">Tag leeren</button>` : ''}
      </div>

      <div class="card">
        <div class="card-title">Trinken</div>
        <div class="water-row">
          <div class="glasses">${Array.from({ length: waterGoal }, (_, i) => html`<span class="glass ${i < glasses ? 'full' : ''}"></span>`)}</div>
          <span class="muted small">${(water / 1000).toFixed(2).replace('.', ',')} l von ${(waterGoal * 0.25).toFixed(1).replace('.', ',')} l</span>
          <div class="row gap-s"><button class="btn btn-small" data-water="-250">−</button><button class="btn btn-small" data-water="250">+ Glas (250 ml)</button><button class="btn btn-small" data-water="500">+ 500 ml</button></div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Wochenrückblick</div>
        <div class="review-days">${review.days.map((d) => html`<div class="review-day ${!d.logged ? 'none' : d.kcal > n.target * 1.1 ? 'over' : ''}" title="${d.date}: ${d.kcal} kcal"><i style="height:${d.logged ? Math.max(4, (d.kcal / maxDay) * 60) : 3}px"></i><span>${formatDate(d.date).slice(0, 2)}</span></div>`)}</div>
        <p class="small">${review.loggedDays} von 7 Tagen erfasst · Ø <strong>${review.avgKcal}</strong> kcal (Ziel ${n.target}) · Ø Protein <strong>${review.avgProtein}</strong> g${review.proteinOk === false ? html` <span class="warn-text">– unter 90 % des Ziels</span>` : ''}</p>
        <div class="advice ${review.suggestion.level}">${review.suggestion.text}${review.suggestion.deltaKcal ? html` <button class="btn btn-small" data-act="apply-delta" data-delta="${review.suggestion.deltaKcal}">Ziel um ${review.suggestion.deltaKcal > 0 ? '+' : ''}${review.suggestion.deltaKcal} kcal anpassen</button>` : ''}</div>
        <div class="advice ${advice.level}">${advice.text}</div>
        <form class="row gap" id="weight-form"><input id="weight-input" type="number" step="0.1" inputmode="decimal" placeholder="Gewicht heute (kg)" aria-label="Gewicht heute"><button class="btn" type="submit">Speichern</button></form>
      </div>

      <div class="card">
        <div class="row between"><div class="card-title">Zielgewicht</div><button class="btn btn-small" data-act="goal">${goal ? 'Ändern' : 'Setzen'}</button></div>
        ${goal ? html`<div class="row between"><span class="muted small">Start ${goal.start} kg</span><strong>${goal.current} kg</strong><span class="muted small">Ziel ${goal.target} kg</span></div>
          <div class="kcal-bar"><div style="width:${(goal.progress * 100).toFixed(0)}%"></div></div>
          <p class="small">${Math.abs(goal.remaining) < 0.3 ? 'Ziel erreicht – jetzt halten.' : html`Noch ${Math.abs(goal.remaining).toFixed(1).replace('.', ',')} kg. ${goal.etaWeeks ? `Bei deinem aktuellen Trend etwa ${goal.etaWeeks} Wochen.` : 'Trend zeigt noch nicht in Richtung Ziel.'} Gesund erreichbar in ca. ${goal.safeWeeks} Wochen${goal.targetDate ? ` · Wunschtermin ${formatDate(goal.targetDate)}` : ''}.`}</p>` : html`<p class="muted small">Ein Zielgewicht macht den Fortschritt sichtbar und zeigt, ob dein Tempo realistisch ist.</p>`}
      </div>

      <div class="card">
        <div class="card-title">Ziele</div>
        <p>${n.override ? html`<strong>Manuell:</strong> ${n.target} kcal (berechnet wären ${n.computed})` : html`<strong>${n.target} kcal</strong> · berechnet ${n.computed}${n.adjust ? html` · Anpassung aus Wochenrückblick ${n.adjust > 0 ? '+' : ''}${n.adjust}` : ''}`}<br><span class="muted">Protein ${n.protein} g · Kohlenhydrate ${n.carbs} g · Fett ${n.fat} g · erwartet ${lo > 0 ? '+' : ''}${lo} bis ${hi > 0 ? '+' : ''}${hi} % Körpergewicht/Woche</span></p>
        <div class="row gap wrap">
          <button class="btn btn-small" data-act="override">${n.override ? 'Manuelle Ziele ändern' : 'Ziele manuell setzen'}</button>
          ${n.override ? html`<button class="btn btn-small btn-ghost" data-act="override-off">Wieder berechnen lassen</button>` : ''}
          ${n.adjust ? html`<button class="btn btn-small btn-ghost" data-act="reset-adjust">Anpassung zurücksetzen</button>` : ''}
          <button class="btn btn-small btn-ghost" data-act="manage">Eigene Lebensmittel & Rezepte</button>
        </div>
        <details class="group"><summary>So kommt die Zahl zustande</summary>
        <table class="ex-table"><tbody>
          <tr><td>Grundumsatz (Mifflin-St Jeor)</td><td class="num">${n.bmr} kcal</td></tr>
          <tr><td>× Alltagsaktivität „${ACTIVITY_LEVELS[profile.activityLevel]?.name}“ (${n.activityFactor})</td><td class="num">${n.baseTdee} kcal</td></tr>
          <tr><td>+ Training (${n.strengthMinutesWeek} min Kraft, ${n.cardioMinutesWeek} min Cardio pro Woche, auf den Tag umgelegt)</td><td class="num">+${n.trainingPerDay} kcal</td></tr>
          <tr><td><strong>Erhaltungsbedarf</strong></td><td class="num"><strong>${n.tdee} kcal</strong></td></tr>
          <tr><td>${n.adjustment >= 0 ? 'Überschuss' : 'Defizit'} für „${GOALS[profile.goal]?.name}“</td><td class="num">${n.adjustment >= 0 ? '+' : ''}${n.adjustment} kcal</td></tr>
        </tbody></table>
        <label class="field"><span>Alltagsaktivität ändern</span><select id="act-select">${Object.entries(ACTIVITY_LEVELS).map(([id, a]) => html`<option value="${id}" ${profile.activityLevel === id ? 'selected' : ''}>${a.name} – ${a.desc}</option>`)}</select></label>
        <p class="muted small">Formeln schätzen ±10 %. Der Wochenrückblick justiert anhand deines Gewichtstrends nach.</p>
        </details>
      </div>

      <div class="card">
        <div class="card-title">Praktische Regeln</div>
        <ul class="bullets small">
          <li><strong>Protein auf 3–5 Mahlzeiten verteilen</strong> (je 0,4–0,5 g/kg): Magerquark, Skyr, Hähnchen, Fisch, Eier, Tofu, Hülsenfrüchte, Whey.</li>
          <li><strong>Grob statt gar nicht:</strong> Portionen schätzen ist okay. Regelmäßig erfassen schlägt perfekt erfassen.</li>
          <li><strong>Fett nicht unter 0,7 g/kg</strong> – wichtig für Hormone; Olivenöl, Nüsse, fetter Fisch.</li>
          <li><strong>Gemüse und Obst</strong> zu jeder Mahlzeit – Sättigung, Ballaststoffe, Mikronährstoffe.</li>
          <li><strong>Schlaf 7–9 h.</strong> Zu wenig Schlaf senkt den Muskelaufbau und erhöht den Fettanteil beim Abnehmen messbar.</li>
          ${profile.goal === 'fettabbau' ? html`<li><strong>Diätpause:</strong> Nach 6–8 Wochen Defizit 1–2 Wochen auf Erhaltungskalorien.</li>` : ''}
          ${profile.goal === 'muskelaufbau' ? html`<li><strong>Nicht übertreiben:</strong> Ein Überschuss von 200–300 kcal reicht. Mehr wird vor allem Fett.</li>` : ''}
        </ul>
      </div>
    </section>`);

  animateAll(root);
  const rerender = () => renderErnaehrung(root);
  root.querySelector('[data-act="prev"]').addEventListener('click', () => { viewDate = addDays(viewDate, -1); rerender(); });
  root.querySelector('[data-act="next"]').addEventListener('click', () => { viewDate = addDays(viewDate, 1); rerender(); });
  root.querySelector('[data-act="today"]')?.addEventListener('click', () => { viewDate = today; rerender(); });
  root.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => openFoodPicker({ date: viewDate, meal: b.dataset.add, onDone: rerender })));
  root.querySelectorAll('[data-entry]').forEach((el) => {
    const open = () => {
      const e = entries.find((x) => x.id === el.dataset.entry);
      if (e) openPortion({ key: e.key, name: e.name, brand: e.brand, per100: e.per100, source: e.source, portion: null }, { date: viewDate, meal: e.meal, existing: e, onDone: rerender });
    };
    el.addEventListener('click', open);
    el.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') open(); });
  });
  root.querySelector('[data-act="copy-yesterday"]')?.addEventListener('click', () => {
    store.update((st) => {
      st.foodLog[viewDate] = (st.foodLog[yesterday] || []).map((e) => ({ ...e, id: uid(), at: new Date().toISOString() }));
    });
    toast('Gestern übernommen – Mengen anpassen, wo nötig.', 'ok');
  });
  root.querySelector('[data-act="clear-day"]')?.addEventListener('click', async () => {
    if (await confirmDialog('Alle Einträge dieses Tages löschen?', { ok: 'Löschen', danger: true })) store.update((st) => { st.foodLog[viewDate] = []; });
  });
  root.querySelectorAll('[data-water]').forEach((b) => b.addEventListener('click', () => {
    store.update((st) => { st.waterLog[viewDate] = Math.max(0, (st.waterLog[viewDate] || 0) + Number(b.dataset.water)); });
  }));
  root.querySelector('[data-act="apply-delta"]')?.addEventListener('click', (e) => {
    const d = Number(e.currentTarget.dataset.delta);
    store.update((st) => { st.settings.kcalAdjust = Math.max(-600, Math.min(600, (st.settings.kcalAdjust || 0) + d)); });
    toast(`Kalorienziel um ${d > 0 ? '+' : ''}${d} kcal angepasst.`, 'ok');
  });
  root.querySelector('[data-act="reset-adjust"]')?.addEventListener('click', () => store.update((st) => { st.settings.kcalAdjust = 0; }));
  root.querySelector('[data-act="override"]').addEventListener('click', () => openOverride(n));
  root.querySelector('[data-act="override-off"]')?.addEventListener('click', () => store.update((st) => { st.settings.targetOverride = null; }));
  root.querySelector('[data-act="manage"]').addEventListener('click', openManage);
  root.querySelector('[data-act="goal"]').addEventListener('click', openGoal);
  root.querySelector('#act-select').addEventListener('change', (e) => {
    store.update((st) => (st.profile.activityLevel = e.target.value));
    toast('Aktivitätslevel gespeichert.', 'ok');
  });
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

function openOverride(n) {
  const s = store.get();
  const o = s.settings.targetOverride || {};
  const m = openModal(
    `<form id="ov-form" class="form">
      <p class="muted small">Leer lassen = berechneter Wert. Kohlenhydrate füllen automatisch auf, wenn nur kcal, Protein und Fett gesetzt sind.</p>
      <div class="grid2">
        <label class="field"><span>Kalorien</span><input id="ov-kcal" type="number" min="1000" max="6000" step="10" value="${o.kcal || n.target}"></label>
        <label class="field"><span>Protein (g)</span><input id="ov-protein" type="number" min="40" max="400" step="5" value="${o.protein || n.protein}"></label>
        <label class="field"><span>Fett (g)</span><input id="ov-fat" type="number" min="20" max="300" step="5" value="${o.fat || n.fat}"></label>
        <label class="field"><span>Kohlenhydrate (g, optional)</span><input id="ov-carbs" type="number" min="0" max="800" step="5" value="${o.carbs || ''}"></label>
      </div>
      <div class="row end"><button class="btn btn-primary" type="submit">Speichern</button></div>
    </form>`,
    { title: 'Ziele manuell setzen' },
  );
  m.querySelector('#ov-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const g = (id) => num(m.querySelector(id).value) || null;
    const kcal = g('#ov-kcal');
    if (!kcal || kcal < 1000) return toast('Bitte mindestens 1000 kcal.', 'warn');
    store.update((st) => { st.settings.targetOverride = { kcal, protein: g('#ov-protein'), fat: g('#ov-fat'), carbs: g('#ov-carbs') }; });
    closeModal();
    toast('Ziele gespeichert.', 'ok');
  });
}

function openManage() {
  const s = store.get();
  const m = openModal(
    `<h3>Rezepte</h3>
     ${s.recipes.length ? `<ul class="list tappable">${s.recipes.map((r) => `<li><button class="link" data-recipe="${r.id}"><strong>${esc(r.name)}</strong><div class="muted small">${r.servings} Portionen · ${Math.round((r.per100.kcal * r.totalGrams) / r.servings / 100)} kcal pro Portion</div></button></li>`).join('')}</ul>` : '<p class="muted small">Noch keine Rezepte.</p>'}
     <button class="btn btn-small" id="mg-new-recipe">Neues Rezept</button>
     <h3>Eigene Lebensmittel</h3>
     ${s.customFoods.length ? `<ul class="list tappable">${s.customFoods.map((c) => `<li><button class="link" data-food="${c.id}"><strong>${esc(c.name)}</strong><div class="muted small">${c.per100.kcal} kcal · P ${c.per100.protein} g je 100 g${c.barcode ? ` · ${esc(c.barcode)}` : ''}</div></button></li>`).join('')}</ul>` : '<p class="muted small">Noch keine eigenen Lebensmittel.</p>'}
     <button class="btn btn-small" id="mg-new-food">Neues Lebensmittel</button>`,
    { title: 'Eigene Lebensmittel & Rezepte' },
  );
  m.querySelectorAll('[data-recipe]').forEach((b) => b.addEventListener('click', () => openRecipe(s.recipes.find((r) => r.id === b.dataset.recipe), openManage)));
  m.querySelectorAll('[data-food]').forEach((b) => b.addEventListener('click', () => openCustomFood(s.customFoods.find((c) => c.id === b.dataset.food), openManage)));
  m.querySelector('#mg-new-recipe').addEventListener('click', () => openRecipe(null, openManage));
  m.querySelector('#mg-new-food').addEventListener('click', () => openCustomFood(null, openManage));
}

function openGoal() {
  const s = store.get();
  const p = s.profile;
  const m = openModal(
    `<form id="goal-form" class="form">
      <div class="grid2">
        <label class="field"><span>Zielgewicht (kg)</span><input id="goal-kg" type="number" step="0.5" min="30" max="250" inputmode="decimal" value="${p.targetWeightKg || ''}"></label>
        <label class="field"><span>Wunschtermin (optional)</span><input id="goal-date" type="date" value="${p.targetDate || ''}"></label>
      </div>
      <p class="muted small">Gesundes Tempo: Fettabbau 0,5–1 % Körpergewicht pro Woche, Aufbau 0,25–0,5 %. Ein zu knapper Termin kostet Muskeln oder setzt Fett an.</p>
      <div class="row between gap"><button type="button" class="btn btn-ghost btn-small" id="goal-clear">Kein Ziel</button><button class="btn btn-primary" type="submit">Speichern</button></div>
    </form>`,
    { title: 'Zielgewicht' },
  );
  m.querySelector('#goal-clear').addEventListener('click', () => {
    store.update((st) => { delete st.profile.targetWeightKg; delete st.profile.targetDate; delete st.profile.startWeightKg; });
    closeModal();
  });
  m.querySelector('#goal-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const kg = num(m.querySelector('#goal-kg').value);
    if (kg < 30 || kg > 250) return toast('Bitte ein plausibles Zielgewicht.', 'warn');
    store.update((st) => {
      st.profile.targetWeightKg = kg;
      st.profile.targetDate = m.querySelector('#goal-date').value || null;
      if (!st.profile.startWeightKg) st.profile.startWeightKg = st.profile.weightKg;
    });
    closeModal();
    toast('Zielgewicht gespeichert.', 'ok');
  });
}

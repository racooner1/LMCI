// Kalender: Monatsansicht mit Trainings, Cardio, Check-ins und Ernährung.
import { html, raw, esc, openModal } from './dom.js';
import * as store from '../state.js';
import { toISODate, fromISODate, WEEKDAYS, formatDate } from '../engine/util.js';
import { totalSets, totalTonnage } from '../engine/analytics.js';
import { dayTotals } from '../engine/food.js';
import { ACTIVITY_BY_ID } from '../engine/cardio.js';
import { dailyStreak } from '../engine/achievements.js';
import { getExercise } from '../data/exercises.js';
import { recordEvents } from '../engine/records.js';
import { isQuickLog, LOG_DAY_NAME } from '../engine/quicklog.js';

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
let view = null; // { y, m }

export function renderKalender(root) {
  const s = store.get();
  const today = toISODate();
  if (!view) {
    const d = fromISODate(today);
    view = { y: d.getFullYear(), m: d.getMonth() };
  }
  const first = new Date(view.y, view.m, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toISODate(new Date(view.y, view.m, d)));
  while (cells.length % 7) cells.push(null);
  const prByDay = {};
  for (const ev of recordEvents(s.workouts, s.profile)) if (ev.kind === 'improve') (prByDay[ev.date] ||= []).push(ev);
  const byDay = (iso) => ({
    prs: prByDay[iso] || [],
    workouts: s.workouts.filter((w) => w.date === iso),
    cardio: s.cardioLogs.filter((c) => c.date === iso),
    checkin: (s.checkins || []).find((c) => c.date === iso),
    food: (s.foodLog?.[iso] || []).length,
    weight: s.bodyLogs.find((b) => b.date === iso),
  });
  const monthWorkouts = s.workouts.filter((w) => w.date.startsWith(`${view.y}-${String(view.m + 1).padStart(2, '0')}`));
  const monthCardio = s.cardioLogs.filter((c) => c.date.startsWith(`${view.y}-${String(view.m + 1).padStart(2, '0')}`));
  const plannedWeekdays = new Set(s.plan.days.map((d) => d.weekday));

  root.innerHTML = String(html`
    <section class="page">
      <header class="page-head"><div><h1>Kalender</h1><p class="muted">Streak: ${dailyStreak(s, today)} Tag${dailyStreak(s, today) === 1 ? '' : 'e'} in Folge aktiv</p></div></header>
      <div class="date-nav">
        <button class="btn" data-act="prev" aria-label="Vorheriger Monat">◀</button>
        <strong>${MONTHS[view.m]} ${view.y}</strong>
        <button class="btn" data-act="next" aria-label="Nächster Monat">▶</button>
      </div>
      <div class="card">
        <div class="cal-grid">
          ${WEEKDAYS.map((w) => html`<div class="cal-head">${w}</div>`)}
          ${cells.map((iso) => {
            if (!iso) return html`<div class="cal-cell empty"></div>`;
            const d = byDay(iso);
            const planned = plannedWeekdays.has((fromISODate(iso).getDay() + 6) % 7) && iso >= s.plan.startDate;
            const any = d.workouts.length || d.cardio.length || d.checkin || d.food || d.weight;
            const trained = d.workouts.some((w) => !isQuickLog(w));
            return html`<button class="cal-cell ${iso === today ? 'today' : ''} ${iso > today ? 'future' : ''} ${planned && !trained && iso < today ? 'missed' : ''}" data-day="${iso}" ${any ? '' : 'data-empty="1"'}>
              <span class="cal-num">${Number(iso.slice(8))}</span>
              <span class="cal-dots">${d.workouts.length ? html`<i class="d-strength" title="Krafttraining"></i>` : ''}${d.cardio.length ? html`<i class="d-cardio" title="Cardio"></i>` : ''}${d.food ? html`<i class="d-food" title="Ernährung"></i>` : ''}${d.checkin ? html`<i class="d-checkin" title="Check-in"></i>` : ''}${d.prs.length ? html`<i class="d-pr" title="Bestleistung"></i>` : ''}</span>
            </button>`;
          })}
        </div>
        <div class="cal-legend"><span><i class="d-strength"></i> Kraft</span><span><i class="d-cardio"></i> Cardio</span><span><i class="d-food"></i> Ernährung</span><span><i class="d-checkin"></i> Check-in</span><span><i class="d-pr"></i> Rekord</span><span class="missed-legend">Rahmen = geplant, nicht trainiert</span></div>
      </div>
      <div class="card">
        <div class="card-title">${MONTHS[view.m]} in Zahlen</div>
        <p><strong>${monthWorkouts.length}</strong> Trainings · <strong>${monthWorkouts.reduce((a, w) => a + totalSets(w), 0)}</strong> Sätze · <strong>${monthWorkouts.reduce((a, w) => a + totalTonnage(w), 0).toLocaleString('de-DE')}</strong> kg · <strong>${monthCardio.reduce((a, c) => a + (c.minutes || 0), 0)}</strong> Cardio-Minuten · <strong>${Object.entries(prByDay).filter(([d]) => d.startsWith(`${view.y}-${String(view.m + 1).padStart(2, '0')}`)).reduce((a, [, l]) => a + l.length, 0)}</strong> Bestleistungen</p>
      </div>
    </section>`);

  root.querySelector('[data-act="prev"]').addEventListener('click', () => {
    view = view.m === 0 ? { y: view.y - 1, m: 11 } : { y: view.y, m: view.m - 1 };
    renderKalender(root);
  });
  root.querySelector('[data-act="next"]').addEventListener('click', () => {
    view = view.m === 11 ? { y: view.y + 1, m: 0 } : { y: view.y, m: view.m + 1 };
    renderKalender(root);
  });
  root.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', () => openDay(b.dataset.day, byDay(b.dataset.day), s)));
}

function openDay(iso, d, s) {
  const dayName = (w) => (w.dayId === 'frei' ? 'Freies Training' : w.dayId === 'schnell' ? 'Schnelltraining' : isQuickLog(w) ? LOG_DAY_NAME : s.plan.days.find((x) => x.id === w.dayId)?.name || s.planHistory.flatMap((p) => p.days).find((x) => x.id === w.dayId)?.name || 'Training');
  const food = dayTotals(s.foodLog?.[iso] || []);
  openModal(
    `${d.workouts.length ? `<h3>${d.workouts.every((w) => isQuickLog(w)) ? LOG_DAY_NAME : 'Krafttraining'}</h3>${d.workouts.map((w) => `<p><strong>${esc(dayName(w))}</strong> · ${totalSets(w)} Sätze${totalTonnage(w) ? ` · ${totalTonnage(w).toLocaleString('de-DE')} kg` : ''}${w.feedback ? ` · RPE ${w.feedback.rpe}` : ''}</p><ul class="bullets small">${w.entries.map((e) => `<li>${esc(getExercise(e.exId)?.name || e.exId)}: ${e.sets.map((x) => `${x.weight ? `${x.weight}×` : ''}${x.reps}`).join(', ')}</li>`).join('')}</ul>`).join('')}` : ''}
     ${d.prs.length ? `<h3>Bestleistungen</h3><ul class="bullets small">${d.prs.map((ev) => `<li>${esc(ev.name)}: ${ev.mode === 'kg' ? `e1RM ${String(ev.e1rm).replace('.', ',')} kg (+${String(ev.delta).replace('.', ',')} kg)` : `${ev.reps} Wdh. (+${ev.delta})`}${ev.rankUp ? ` · Aufstieg auf ${esc(ev.rank.name)}` : ''}</li>`).join('')}</ul>` : ''}
     ${d.cardio.length ? `<h3>Cardio</h3><ul class="bullets small">${d.cardio.map((c) => `<li>${esc(ACTIVITY_BY_ID[c.activity]?.name || c.activity)} · ${c.minutes} min${c.km ? ` · ${c.km} km` : ''}${c.avgHr ? ` · Ø ${c.avgHr} bpm` : ''}</li>`).join('')}</ul>` : ''}
     ${d.checkin ? `<h3>Check-in</h3><p class="small">Schlaf ${d.checkin.sleep} h · Qualität ${d.checkin.sleepQuality}/5 · Stress ${d.checkin.stress}/5 · Energie ${d.checkin.energy}/5</p>` : ''}
     ${d.food ? `<h3>Ernährung</h3><p class="small">${food.kcal} kcal · Protein ${food.protein} g · KH ${food.carbs} g · Fett ${food.fat} g</p>` : ''}
     ${d.weight ? `<h3>Gewicht</h3><p class="small">${d.weight.weightKg} kg</p>` : ''}
     ${!d.workouts.length && !d.cardio.length && !d.checkin && !d.food && !d.weight ? '<p class="muted">Keine Einträge an diesem Tag.</p>' : ''}`,
    { title: formatDate(iso) },
  );
}

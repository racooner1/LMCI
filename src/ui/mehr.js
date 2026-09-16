// Mehr: Profil, Einstellungen, Daten, Wissenschaft, Installation.
import { html, raw, toast, confirmDialog, openModal, num } from './dom.js';
import * as store from '../state.js';
import { GOALS, EXPERIENCE } from '../engine/plan.js';

export const APP_VERSION = '1.0.0';

export function renderMehr(root) {
  const s = store.get();
  const p = s.profile;
  root.innerHTML = String(html`
    <section class="page">
      <header class="page-head"><div><h1>Mehr</h1><p class="muted">LMCI ${APP_VERSION} · alles lokal, kein Abo</p></div></header>

      <div class="card">
        <div class="card-title">Profil</div>
        <p>${p.name || 'Ohne Namen'} · ${p.age} Jahre · ${p.heightCm} cm · ${p.weightKg} kg<br><span class="muted">${GOALS[p.goal]?.name} · ${EXPERIENCE[p.experience]?.name} · ${p.strengthDays}× Kraft à ${p.sessionMinutes} min · ${p.cardioSessions ?? 0}× Cardio · ${p.equipment === 'gym' ? 'Studio' : 'Zuhause'}</span></p>
        <a class="btn" href="#/onboarding/edit">Profil & Plan-Vorgaben ändern</a>
      </div>

      <div class="card">
        <div class="card-title">Einstellungen</div>
        <div class="grid2">
          <label class="field"><span>Stangengewicht (kg)</span><input id="set-bar" type="number" step="0.5" value="${s.settings.barWeight}"></label>
          <label class="field"><span>Verfügbare Scheiben (kg, Komma-getrennt)</span><input id="set-plates" value="${s.settings.plates.join(', ')}"></label>
        </div>
        <label class="chip"><input type="checkbox" id="set-rest" ${s.settings.restTimer ? 'checked' : ''}><span>Pausentimer nach jedem Satz starten</span></label>
        <label class="chip"><input type="checkbox" id="set-sound" ${s.settings.sound ? 'checked' : ''}><span>Ton am Ende der Pause</span></label>
      </div>

      <div class="card">
        <div class="card-title">Deine Daten</div>
        <p class="muted small">Alles liegt nur in diesem Browser. Sichere regelmäßig eine Kopie – z. B. vor einem Handywechsel.</p>
        <div class="row gap wrap">
          <button class="btn" data-act="export">Sicherung exportieren</button>
          <label class="btn">Sicherung importieren<input type="file" accept="application/json,.json" id="import-file" hidden></label>
          <button class="btn btn-danger" data-act="reset">Alles löschen</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Auf dem Handy installieren</div>
        <ul class="bullets small">
          <li><strong>iPhone (Safari):</strong> Teilen-Symbol → „Zum Home-Bildschirm“. Danach startet LMCI wie eine App, auch offline.</li>
          <li><strong>Android (Chrome):</strong> Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.</li>
          <li><strong>Wichtig:</strong> Die Daten gehören zu dieser Adresse in diesem Browser. Beim Wechsel Sicherung exportieren und importieren.</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-title">Woher die Regeln kommen</div>
        <ul class="bullets small">
          <li><strong>Volumen:</strong> 10–20 harte Sätze pro Muskel und Woche, mind. 2× pro Woche pro Muskel (Schoenfeld et al. 2017; Baz-Valle et al. 2022).</li>
          <li><strong>Intensität:</strong> 6–15 Wiederholungen, 0–3 Wiederholungen in Reserve; Muskelaufbau funktioniert über einen breiten Lastbereich, solange die Sätze hart sind (Schoenfeld et al. 2017; Refalo et al. 2023).</li>
          <li><strong>Pausen:</strong> 2–3 Minuten bei Grundübungen bringen mehr als kurze Pausen (Schoenfeld et al. 2016).</li>
          <li><strong>Progression:</strong> Doppelte Progression und geplante Deload-Wochen zur Ermüdungssteuerung; Anpassung des Volumens über Erholungs-Feedback (Helms et al., Israetel et al.).</li>
          <li><strong>Cardio:</strong> WHO empfiehlt 150–300 min moderat pro Woche; Intervalle verbessern die VO₂max effizient; Interferenz mit Muskelaufbau ist gering, wenn Cardio nach dem Kraftraining oder an anderen Tagen stattfindet (Schumann et al. 2022).</li>
          <li><strong>Ernährung:</strong> Grundumsatz nach Mifflin-St Jeor (1990); Protein 1,6–2,2 g/kg (Morton et al. 2018); Gewichtsverlust 0,5–1 % pro Woche, Aufbau 0,25–0,5 % (Helms et al. 2014).</li>
          <li><strong>Pulszonen:</strong> Maximalpuls 208 − 0,7 × Alter (Tanaka et al. 2001), Zonen nach Karvonen mit Ruhepuls.</li>
        </ul>
        <p class="muted small">LMCI ersetzt keine ärztliche oder physiotherapeutische Beratung. Bei Schmerzen, Vorerkrankungen oder Schwangerschaft bitte vorher abklären.</p>
      </div>
    </section>`);

  root.querySelector('#set-bar').addEventListener('change', (e) => store.update((st) => (st.settings.barWeight = num(e.target.value, 20))));
  root.querySelector('#set-plates').addEventListener('change', (e) => {
    const list = e.target.value.split(/[,;\s]+/).map((x) => num(x)).filter((x) => x > 0).sort((a, b) => b - a);
    if (!list.length) return toast('Bitte mindestens eine Scheibe angeben.', 'warn');
    store.update((st) => (st.settings.plates = list));
    toast('Scheiben gespeichert.', 'ok');
  });
  root.querySelector('#set-rest').addEventListener('change', (e) => store.update((st) => (st.settings.restTimer = e.target.checked)));
  root.querySelector('#set-sound').addEventListener('change', (e) => store.update((st) => (st.settings.sound = e.target.checked)));
  root.querySelector('[data-act="export"]').addEventListener('click', exportBackup);
  root.querySelector('#import-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (await confirmDialog('Import ersetzt alle aktuellen Daten in dieser App. Fortfahren?', { ok: 'Importieren', danger: true })) {
        store.importJSON(text);
        toast('Sicherung importiert.', 'ok');
        location.hash = '#/heute';
      }
    } catch (err) {
      toast(`Import fehlgeschlagen: ${err.message}`, 'warn');
    }
    e.target.value = '';
  });
  root.querySelector('[data-act="reset"]').addEventListener('click', async () => {
    if (await confirmDialog('Wirklich alle Daten löschen? Profil, Plan und alle Trainingslogs werden entfernt.', { ok: 'Alles löschen', danger: true })) {
      store.resetAll();
      location.hash = '#/onboarding';
    }
  });
}

function exportBackup() {
  const json = store.exportJSON();
  const name = `lmci-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch {
    /* Fallback unten */
  }
  // Fallback für Umgebungen, die Downloads blockieren: Text zum Kopieren anzeigen.
  const m = openModal(`<p class="muted small">Falls kein Download gestartet ist: Text kopieren und als <code>${name}</code> speichern.</p><textarea class="textarea" rows="8" readonly id="exp-text">${json.replace(/</g, '&lt;')}</textarea><div class="row end"><button class="btn" id="exp-copy">In Zwischenablage kopieren</button></div>`, { title: 'Sicherung' });
  m.querySelector('#exp-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(json);
      toast('Kopiert.', 'ok');
    } catch {
      m.querySelector('#exp-text').select();
      toast('Bitte manuell kopieren (Strg/Cmd + C).', 'warn');
    }
  });
}

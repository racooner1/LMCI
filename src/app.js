// Einstieg: Router, Navigation, Service Worker.
import * as store from './state.js';
import { renderOnboarding } from './ui/onboarding.js';
import { renderHeute } from './ui/heute.js';
import { renderPlan } from './ui/planview.js';
import { renderWorkout } from './ui/workout.js';
import { renderFortschritt } from './ui/fortschritt.js';
import { renderErnaehrung } from './ui/ernaehrung.js';
import { renderMehr } from './ui/mehr.js';
import { renderUebungen } from './ui/uebungen.js';
import { renderKalender } from './ui/kalender.js';
import { renderCoach } from './ui/coach.js';
import { renderSchnell } from './ui/schnell.js';
import { startReminderLoop } from './engine/reminders.js';
import { generatePlan, availableExercises } from './engine/plan.js';
import { closeModal } from './ui/dom.js';
import { icon } from './ui/icons.js';
import { autoMountFigures } from './ui/figure.js';

// Für Views, die Engine-Funktionen ohne zyklische Importe brauchen.
let afterRoute = null;
window.__lmci = { generatePlan, availableExercises, afterRoute: (fn) => (afterRoute = fn) };

const NAV = [
  ['#/heute', 'Heute', 'home'],
  ['#/plan', 'Plan', 'plan'],
  ['#/fortschritt', 'Erfolge', 'trophy'],
  ['#/ernaehrung', 'Ernährung', 'food'],
  ['#/mehr', 'Mehr', 'more'],
];

const root = document.getElementById('app');
const nav = document.getElementById('nav');

function route() {
  const s = store.get();
  const hash = location.hash || '#/heute';
  const [path, arg] = hash.replace(/^#\/?/, '').split('/');
  closeModal();
  if (!s.profile || !s.plan) {
    nav.hidden = true;
    renderOnboarding(root, { edit: false });
    return;
  }
  nav.hidden = false;
  switch (path) {
    case 'onboarding':
      nav.hidden = true;
      renderOnboarding(root, { edit: arg === 'edit' });
      break;
    case 'plan':
      renderPlan(root);
      break;
    case 'workout':
      renderWorkout(root, arg);
      break;
    case 'fortschritt':
      renderFortschritt(root);
      break;
    case 'ernaehrung':
      renderErnaehrung(root);
      break;
    case 'mehr':
      renderMehr(root);
      break;
    case 'uebungen':
      renderUebungen(root, arg);
      break;
    case 'kalender':
      renderKalender(root);
      break;
    case 'coach':
      renderCoach(root);
      break;
    case 'schnell':
      renderSchnell(root);
      break;
    default:
      renderHeute(root);
  }
  nav.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#/${path}` || (path === '' && a.getAttribute('href') === '#/heute')));
  window.scrollTo({ top: 0 });
  if (afterRoute) {
    const fn = afterRoute;
    afterRoute = null;
    fn();
  }
}

function renderNav() {
  nav.innerHTML = NAV.map(([href, label, name]) => `<a href="${href}" aria-label="${label}">${icon(name, { size: 24 })}<span>${label}</span></a>`).join('');
}

// Radio-Karten: „selected“-Klasse mitführen.
document.addEventListener('change', (e) => {
  const input = e.target;
  if (input.type === 'radio' && input.closest('.choices')) {
    input.closest('.choices').querySelectorAll('.choice').forEach((c) => c.classList.toggle('selected', c.querySelector('input').checked));
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

store.load();
window.__lmciBooted = true;
autoMountFigures();
store.subscribe(() => {
  // Nach Zustandsänderungen die aktuelle Seite neu zeichnen – außer im laufenden Training (dort wird gezielt aktualisiert).
  if (!location.hash.startsWith('#/workout')) route();
});
renderNav();
window.addEventListener('hashchange', route);
route();
store.requestPersistentStorage();
startReminderLoop(store);

// In der Einzeldatei-Variante (dist/) gibt es keinen Service Worker.
const SINGLE_FILE = typeof __LMCI_SINGLE__ !== 'undefined' && __LMCI_SINGLE__;
if (!SINGLE_FILE && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      // Beim Öffnen nach Updates suchen und einen Hinweis zeigen, sobald eine neue Version bereitsteht.
      reg.update().catch(() => {});
      const offer = (worker) => {
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner(reg);
        });
      };
      if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner(reg);
      reg.addEventListener('updatefound', () => offer(reg.installing));
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return;
        reloading = true;
        // Neue Version ist aktiv: Zustand sichern und einmal sauber neu laden.
        store.saveNow();
        location.reload();
      });
    } catch {
      /* Offline-Modus dann nicht verfügbar */
    }
  });
}

function showUpdateBanner(reg) {
  if (document.getElementById('update-banner')) return;
  const el = document.createElement('div');
  el.id = 'update-banner';
  el.className = 'update-banner';
  el.innerHTML = `<span>Neue Version von LMCI ist da.</span><button class="btn btn-small btn-primary" id="update-now">Jetzt aktualisieren</button>`;
  document.body.appendChild(el);
  el.querySelector('#update-now').addEventListener('click', () => {
    el.remove();
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    else location.reload();
  });
}

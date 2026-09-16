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

// Für Views, die Engine-Funktionen ohne zyklische Importe brauchen.
let afterRoute = null;
window.__lmci = { generatePlan, availableExercises, afterRoute: (fn) => (afterRoute = fn) };

const NAV = [
  ['#/heute', 'Heute', 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  ['#/plan', 'Plan', 'M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm3 5h8M8 12h8M8 16h5'],
  ['#/fortschritt', 'Fortschritt', 'M4 19h16M6 16V9m6 7V5m6 11v-6'],
  ['#/ernaehrung', 'Ernährung', 'M6 3v7a3 3 0 0 0 6 0V3M9 3v18M17 3c-2 2-2 6-2 9h2v9'],
  ['#/mehr', 'Mehr', 'M5 12h.01M12 12h.01M19 12h.01'],
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
  nav.innerHTML = NAV.map(([href, label, d]) => `<a href="${href}" aria-label="${label}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg><span>${label}</span></a>`).join('');
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
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline-Modus dann nicht verfügbar */ });
  });
}

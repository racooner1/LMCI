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
import { renderRoutine } from './ui/routine.js';
import { startReminderLoop } from './engine/reminders.js';
import { generatePlan, availableExercises } from './engine/plan.js';
import { closeModal } from './ui/dom.js';
import { openQuickLog } from './ui/quicklog.js';
import { icon } from './ui/icons.js';

// Für Views, die Engine-Funktionen ohne zyklische Importe brauchen.
let afterRoute = null;
window.__lmci = { generatePlan, availableExercises, afterRoute: (fn) => (afterRoute = fn) };

// Navigation. Im Fokus „Routine“ rückt die Routine an die Stelle des Trainingsplans (Plan bleibt über „Mehr“ erreichbar).
function navItems(s) {
  const routineFocus = s.settings?.focus === 'routine';
  return [
    ['#/heute', 'Heute', 'home'],
    ...(routineFocus ? [] : [['#/plan', 'Plan', 'plan']]),
    ['#/routine', 'Routine', 'check'],
    ['#/fortschritt', 'Erfolge', 'trophy'],
    ['#/ernaehrung', 'Essen', 'food'],
    ['#/mehr', 'Mehr', 'more'],
  ];
}

const root = document.getElementById('app');
const nav = document.getElementById('nav');
const topbar = document.getElementById('topbar');
const topbarTitle = document.getElementById('topbar-title');

// Titel für die eingeblendete Kopfzeile (wie bei nativen Apps beim Scrollen).
const TITLES = { plan: 'Plan', workout: 'Training', fortschritt: 'Erfolge', ernaehrung: 'Ernährung', mehr: 'Mehr', uebungen: 'Übungen', kalender: 'Kalender', coach: 'Coach', schnell: 'Schnelltraining', routine: 'Routine', heute: 'Heute' };

let lastRoute = null;

function route() {
  const s = store.get();
  const hash = location.hash || '#/heute';
  const [path, arg] = hash.replace(/^#\/?/, '').split('/');
  const changed = `${path}/${arg || ''}` !== lastRoute;
  lastRoute = `${path}/${arg || ''}`;
  closeModal();
  if (!s.profile || !s.plan) {
    nav.hidden = true;
    renderOnboarding(root, { edit: false });
    return;
  }
  nav.hidden = false;
  renderNav(s);
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
    case 'routine':
      renderRoutine(root);
      break;
    case 'eintragen':
      // Startbildschirm-Kurzbefehl: „Satz eintragen“ öffnet direkt den Dialog.
      renderHeute(root);
      openQuickLog({ after: () => (location.hash = '#/heute') });
      break;
    default:
      renderHeute(root);
  }
  const navPath = path === 'eintragen' ? 'heute' : path;
  nav.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#/${navPath}` || (navPath === '' && a.getAttribute('href') === '#/heute')));
  if (changed) {
    // Nur beim echten Seitenwechsel nach oben springen und die Seite einblenden –
    // ein Neuzeichnen nach einer Eingabe soll die Scrollposition behalten.
    window.scrollTo({ top: 0 });
    root.classList.remove('route-enter');
    void root.offsetWidth;
    root.classList.add('route-enter');
  }
  updateTopbar(navPath);
  if (afterRoute) {
    const fn = afterRoute;
    afterRoute = null;
    fn();
  }
}

// Kopfzeile: Titel setzen und beim Scrollen einblenden.
function updateTopbar(path) {
  // Auf „Heute“ steht in der großen Überschrift eine Begrüßung – in der Leiste ist der Seitenname klarer.
  const heading = path === 'heute' || path === '' ? '' : (root.querySelector('h1')?.textContent || '').trim();
  const title = heading || TITLES[path] || 'LMCI';
  topbarTitle.textContent = title;
  syncTopbar();
}

function syncTopbar() {
  topbar.classList.toggle('show', !nav.hidden && window.scrollY > 24);
}

let topbarTicking = false;
window.addEventListener('scroll', () => {
  if (topbarTicking) return;
  topbarTicking = true;
  requestAnimationFrame(() => {
    syncTopbar();
    topbarTicking = false;
  });
}, { passive: true });

let navMarkup = '';
function renderNav(s = store.get()) {
  const items = navItems(s);
  const markup = items.map(([href, label, name]) => `<a href="${href}" aria-label="${label}">${icon(name, { size: 24 })}<span>${label}</span></a>`).join('');
  if (markup === navMarkup) return;
  navMarkup = markup;
  nav.innerHTML = markup;
  nav.classList.toggle('compact', items.length > 5);
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

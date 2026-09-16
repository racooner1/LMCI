// Bewegung: Zahlen hochzählen, Balken und Ringe einlaufen lassen – mit Rücksicht auf reduzierte Bewegung.
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Balken: Zielbreite steht im Inline-Style; wir starten bei 0 und lassen die CSS-Transition laufen.
export function animateBars(root, selector = '.xp-bar > div, .kcal-bar > div, .mini-bar > div, .mbar-track > div, .vol-fill, .goals-progress .xp-bar > div, .challenge-bar > div, .itimer-fill, .workout-progress .bar > div') {
  if (reduced()) return;
  const els = [...root.querySelectorAll(selector)];
  for (const el of els) {
    const target = el.style.width;
    if (!target) continue;
    el.style.transition = 'none';
    el.style.width = '0%';
    el.dataset.target = target;
  }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    for (const el of els) {
      if (!el.dataset.target) continue;
      el.style.transition = '';
      el.style.width = el.dataset.target;
    }
  }));
}

export function animateRings(root) {
  if (reduced()) return;
  const els = [...root.querySelectorAll('.ring .fill')];
  for (const el of els) {
    const target = el.getAttribute('stroke-dashoffset');
    const full = el.getAttribute('stroke-dasharray');
    el.dataset.target = target;
    el.style.transition = 'none';
    el.setAttribute('stroke-dashoffset', full);
  }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    for (const el of els) {
      el.style.transition = '';
      el.setAttribute('stroke-dashoffset', el.dataset.target);
    }
  }));
}

// Zahlen hochzählen: <span data-count="830">830</span>
export function animateCounts(root, duration = 900) {
  const els = [...root.querySelectorAll('[data-count]')];
  if (reduced() || !els.length) return;
  const start = performance.now();
  const items = els.map((el) => ({ el, to: Number(el.dataset.count) || 0, from: Number(el.dataset.from ?? 0), suffix: el.dataset.suffix || '' }));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const frame = (now) => {
    const p = Math.min(1, (now - start) / duration);
    for (const it of items) it.el.textContent = Math.round(it.from + (it.to - it.from) * ease(p)).toLocaleString('de-DE') + it.suffix;
    if (p < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

export function animateAll(root) {
  animateBars(root);
  animateRings(root);
  animateCounts(root);
}

// Kleiner Stempel-Effekt (z. B. „Geschafft“) auf einem Element
export function stamp(el) {
  if (!el || reduced()) return;
  el.classList.remove('stamp');
  void el.offsetWidth;
  el.classList.add('stamp');
}

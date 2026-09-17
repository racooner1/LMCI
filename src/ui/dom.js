// DOM-Hilfen: HTML-Escaping, Templates, Toasts, Modale.

export function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Tagged Template: Werte werden escaped, außer sie sind mit raw() markiert.
export function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) out += renderValue(values[i]);
  });
  return raw(out);
}

class Raw {
  constructor(s) {
    this.s = s;
  }
  toString() {
    return this.s;
  }
}

export const raw = (s) => new Raw(String(s));

function renderValue(v) {
  if (v == null || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(renderValue).join('');
  return esc(v);
}

export function fmtKg(v) {
  if (v == null || v === '' || Number.isNaN(Number(v))) return '–';
  const n = Number(v);
  return (Number.isInteger(n) ? n.toString() : n.toFixed(1).replace(/\.0$/, '')).replace('.', ',') + ' kg';
}

export function fmtNum(v, digits = 0) {
  return Number(v).toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function fmtMin(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Kurzes haptisches Feedback, wo das Gerät es kann (Android). iOS ignoriert es still.
export function haptic(ms = 8) {
  try {
    if (navigator.vibrate && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) navigator.vibrate(ms);
  } catch { /* nicht verfügbar */ }
}

let toastTimer = null;
export function toast(msg, kind = 'info') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = `toast toast-${kind} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// Einfaches Modal. content: Raw/HTML-String. Gibt das Element zurück; close() schließt.
export function openModal(content, { title = '', onClose } = {}) {
  closeModal();
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.id = 'modal';
  wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true" ${title ? `aria-label="${esc(title)}"` : ''}>
    <div class="modal-head"><h2 class="modal-title">${esc(title)}</h2><button class="btn-icon" data-close-modal aria-label="Schließen">✕</button></div>
    <div class="modal-body">${String(content)}</div>
  </div>`;
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap || e.target.closest('[data-close-modal]')) {
      closeModal();
      onClose?.();
    }
  });
  document.body.appendChild(wrap);
  document.body.classList.add('modal-open');
  enableSheetDrag(wrap, onClose);
  const first = wrap.querySelector('input, select, button:not([data-close-modal])');
  first?.focus?.();
  return wrap;
}

// Blatt nach unten wischen schließt es – wie in nativen Apps.
function enableSheetDrag(wrap, onClose) {
  const sheet = wrap.querySelector('.modal');
  if (!sheet || typeof window === 'undefined' || !('ontouchstart' in window)) return;
  let startY = 0;
  let dy = 0;
  let dragging = false;

  sheet.addEventListener('touchstart', (e) => {
    // Nur von oben ziehen, und nicht auf Eingaben (Schieberegler, Felder).
    if (sheet.scrollTop > 0 || e.touches.length !== 1) return;
    if (e.target.closest('input, select, textarea, .slider, .chips, .icon-picker')) return;
    startY = e.touches[0].clientY;
    dy = 0;
    dragging = true;
  }, { passive: true });

  sheet.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    dy = e.touches[0].clientY - startY;
    if (dy <= 0) {
      sheet.style.transform = '';
      return;
    }
    sheet.classList.add('dragging');
    sheet.style.transform = `translateY(${dy}px)`;
    wrap.style.opacity = String(Math.max(0.4, 1 - dy / 420));
  }, { passive: true });

  const release = () => {
    if (!dragging) return;
    dragging = false;
    sheet.classList.remove('dragging');
    sheet.style.transform = '';
    wrap.style.opacity = '';
    if (dy > 110) {
      closeModal();
      onClose?.();
    }
  };
  sheet.addEventListener('touchend', release);
  sheet.addEventListener('touchcancel', release);
}

export function closeModal() {
  document.getElementById('modal')?.remove();
  document.body.classList.remove('modal-open');
}

export function confirmDialog(text, { ok = 'Ja', cancel = 'Abbrechen', danger = false } = {}) {
  return new Promise((resolve) => {
    const m = openModal(
      `<p class="modal-text">${esc(text)}</p><div class="row gap end"><button class="btn" data-act="cancel">${esc(cancel)}</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${esc(ok)}</button></div>`,
      { title: 'Bestätigen', onClose: () => resolve(false) },
    );
    m.querySelector('[data-act="ok"]').addEventListener('click', () => {
      closeModal();
      resolve(true);
    });
    m.querySelector('[data-act="cancel"]').addEventListener('click', () => {
      closeModal();
      resolve(false);
    });
  });
}

// Formularwerte als Objekt.
export function formData(form) {
  const out = {};
  const fd = new FormData(form);
  for (const [k, v] of fd.entries()) {
    if (k.endsWith('[]')) {
      const key = k.slice(0, -2);
      (out[key] ||= []).push(v);
    } else out[k] = v;
  }
  return out;
}

export function num(v, fallback = 0) {
  if (v === '' || v == null) return fallback;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

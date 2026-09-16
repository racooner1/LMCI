// Intervall-Timer für Cardio-Einheiten (Aufwärmen → Intervalle → Auslaufen).
import { openModal, closeModal, fmtMin } from './dom.js';

let t = null;

function beep(freq = 880, ms = 250) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = freq;
    g.gain.value = 0.2;
    o.start();
    o.stop(ctx.currentTime + ms / 1000);
    setTimeout(() => ctx.close?.(), ms + 200);
  } catch { /* kein Audio */ }
  try {
    navigator.vibrate?.(150);
  } catch { /* ignorieren */ }
}

export function openIntervalTimer(session, week) {
  const w = Math.max(0, Math.min(session.minutesByWeek.length - 1, week - 1));
  const phases = [];
  if (session.intervals) {
    const rounds = session.intervals.roundsByWeek[w];
    phases.push({ name: 'Aufwärmen', sec: session.intervals.work >= 180 ? 600 : 300, kind: 'easy' });
    for (let i = 1; i <= rounds; i++) {
      phases.push({ name: `Intervall ${i}/${rounds} – hart`, sec: session.intervals.work, kind: 'hard' });
      if (i < rounds) phases.push({ name: `Locker`, sec: session.intervals.rest, kind: 'easy' });
    }
    phases.push({ name: 'Auslaufen', sec: 300, kind: 'easy' });
  } else {
    const total = session.minutesByWeek[w] * 60;
    phases.push({ name: session.name, sec: total, kind: 'steady' });
  }
  const totalSec = phases.reduce((a, p) => a + p.sec, 0);
  stop();
  t = { phases, idx: 0, left: phases[0].sec, running: false, handle: null, elapsed: 0 };

  const m = openModal(
    `<div class="itimer">
      <div class="itimer-phase" id="it-phase">${phases[0].name}</div>
      <div class="itimer-time" id="it-time">${fmtMin(phases[0].sec)}</div>
      <div class="itimer-bar"><div class="itimer-fill" id="it-fill"></div></div>
      <div class="muted small" id="it-total">Gesamt ${fmtMin(totalSec)} · ${phases.length} Abschnitte</div>
      <div class="row gap center">
        <button class="btn btn-primary btn-big" id="it-start">Start</button>
        <button class="btn" id="it-skip">Abschnitt überspringen</button>
      </div>
      <ol class="itimer-list" id="it-list">${phases.map((p, i) => `<li class="${i === 0 ? 'now' : ''} ${p.kind}"><span>${p.name}</span><span>${fmtMin(p.sec)}</span></li>`).join('')}</ol>
    </div>`,
    { title: session.name, onClose: stop },
  );
  const el = {
    phase: m.querySelector('#it-phase'),
    time: m.querySelector('#it-time'),
    fill: m.querySelector('#it-fill'),
    start: m.querySelector('#it-start'),
    list: m.querySelector('#it-list'),
    wrap: m.querySelector('.itimer'),
  };
  const render = () => {
    const p = t.phases[t.idx];
    el.phase.textContent = p.name;
    el.time.textContent = fmtMin(t.left);
    el.fill.style.width = `${(1 - t.left / p.sec) * 100}%`;
    el.wrap.dataset.kind = p.kind;
    el.list.querySelectorAll('li').forEach((li, i) => li.classList.toggle('now', i === t.idx));
  };
  const tick = () => {
    t.left -= 1;
    if (t.left <= 0) {
      if (t.idx < t.phases.length - 1) {
        t.idx += 1;
        t.left = t.phases[t.idx].sec;
        beep(t.phases[t.idx].kind === 'hard' ? 1100 : 660, 350);
      } else {
        stop();
        beep(880, 600);
        el.phase.textContent = 'Fertig – stark!';
        el.time.textContent = '0:00';
        el.start.textContent = 'Nochmal';
        t.idx = 0;
        t.left = t.phases[0].sec;
        return;
      }
    } else if (t.left <= 3) beep(500, 120);
    render();
  };
  el.start.addEventListener('click', () => {
    if (t.running) {
      clearInterval(t.handle);
      t.running = false;
      el.start.textContent = 'Weiter';
    } else {
      t.running = true;
      t.handle = setInterval(tick, 1000);
      el.start.textContent = 'Pause';
      beep(660, 150);
    }
  });
  m.querySelector('#it-skip').addEventListener('click', () => {
    if (t.idx < t.phases.length - 1) {
      t.idx += 1;
      t.left = t.phases[t.idx].sec;
      render();
    }
  });
  render();
}

function stop() {
  if (t?.handle) clearInterval(t.handle);
  if (t) t.running = false;
}

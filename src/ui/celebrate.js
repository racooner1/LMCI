// Feier-Momente: Konfetti, XP-Anzeige, Level-up.
import { esc, openModal } from './dom.js';
import { icon } from './icons.js';
import { animateCounts, animateBars } from './motion.js';

const COLORS = ['#2F6BFF', '#F5A623', '#22C55E', '#FF6A3D', '#7C3AED', '#06B6D4'];

export function confetti({ duration = 1800, count = 140 } = {}) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  c.className = 'confetti';
  document.body.appendChild(c);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const resize = () => {
    c.width = window.innerWidth * dpr;
    c.height = window.innerHeight * dpr;
  };
  resize();
  const ctx = c.getContext('2d');
  const parts = Array.from({ length: count }, () => ({
    x: Math.random() * c.width,
    y: -Math.random() * c.height * 0.3,
    w: (6 + Math.random() * 6) * dpr,
    h: (8 + Math.random() * 8) * dpr,
    vx: (Math.random() - 0.5) * 2 * dpr,
    vy: (2 + Math.random() * 3) * dpr,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.2,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));
  const start = performance.now();
  const frame = (t) => {
    const p = (t - start) / duration;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.globalAlpha = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;
    for (const q of parts) {
      q.x += q.vx;
      q.y += q.vy;
      q.vy += 0.02 * dpr;
      q.rot += q.vr;
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(q.rot);
      ctx.fillStyle = q.color;
      ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h);
      ctx.restore();
    }
    if (p < 1) requestAnimationFrame(frame);
    else c.remove();
  };
  requestAnimationFrame(frame);
}

// Medaille für einen Rang (null = ohne Rang).
export function medal(rank, { size = 'm' } = {}) {
  const cls = rank ? rank.id : 'none';
  return `<span class="medal ${cls} ${size}" title="${rank ? esc(rank.name) : 'Ohne Rang'}" aria-label="${rank ? esc(rank.name) : 'Ohne Rang'}">${icon(rank ? 'trophy' : 'dumbbell', { size: size === 'l' ? 26 : size === 's' ? 12 : 16 })}</span>`;
}

/**
 * Feier-Dialog nach einer Einheit.
 * data: { title, subtitle, xp, level: {level,title,progress,toNext}, levelUp, stats: [{num, unit}], highlights: [{icon, text}],
 *         records: [string | {title, text, sub, rank, rankUp}], badges: [], note, href }
 */
export function showCelebration(data) {
  confetti();
  const m = openModal(
    `<div class="celebrate">
      <div class="celebrate-hero ${data.levelUp ? 'levelup' : ''}">
        <div class="celebrate-icon">${icon(data.levelUp ? 'trophy' : 'star', { size: 40 })}</div>
        <div class="celebrate-xp">+<span data-count="${data.xp}" data-from="0">${data.xp}</span> XP</div>
        <div class="celebrate-sub">${esc(data.subtitle || '')}</div>
      </div>
      ${data.levelUp ? `<div class="levelup-banner">${icon('bolt', { size: 18 })} Level ${data.level.level} erreicht – ${esc(data.level.title)}!</div>` : `<div class="level-row"><span>Level ${data.level.level} · ${esc(data.level.title)}</span><span class="muted small">${data.level.toNext} XP bis Level ${data.level.level + 1}</span></div><div class="xp-bar"><div style="width:${(data.level.progress * 100).toFixed(0)}%"></div></div>`}
      ${data.stats?.length ? `<div class="summary center">${data.stats.map((s) => `<div class="stat"><span class="stat-num">${esc(s.num)}</span><span class="stat-unit">${esc(s.unit)}</span></div>`).join('')}</div>` : ''}
      ${data.highlights?.length ? `<div class="reward-list">${data.highlights.map((h) => `<div class="reward highlight ${esc(h.cls || '')}">${icon(h.icon || 'star', { size: 18 })}<span>${esc(h.text)}</span></div>`).join('')}</div>` : ''}
      ${data.records?.length ? `<div class="reward-list"><div class="card-title">Neue Bestleistungen</div>${data.records.map((r) => (typeof r === 'string' ? `<div class="reward">${icon('trophy', { size: 18 })}<span>${esc(r)}</span></div>` : `<div class="reward ${r.rankUp ? 'rankup' : ''}">${medal(r.rank)}<span><strong>${esc(r.title)}</strong> ${esc(r.text)}${r.sub ? `<br><span class="small muted">${esc(r.sub)}</span>` : ''}</span></div>`)).join('')}</div>` : ''}
      ${data.badges?.length ? `<div class="reward-list"><div class="card-title">Neue Abzeichen</div>${data.badges.map((b) => `<div class="reward"><span class="badge-icon">${b.icon}</span><span><strong>${esc(b.name)}</strong> · ${esc(b.desc)}</span></div>`).join('')}</div>` : ''}
      ${data.note ? `<p class="small muted">${esc(data.note)}</p>` : ''}
      <a class="btn btn-primary btn-big" href="${data.href || '#/heute'}" data-close-modal>Weiter</a>
    </div>`,
    { title: data.title || 'Geschafft!' },
  );
  animateCounts(m, 1100);
  animateBars(m);
  return m;
}

// Kleiner Effekt auf einem Element (z. B. Häkchen)
export function pop(el) {
  if (!el) return;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

// Kleine SVG-Diagramme ohne Bibliothek. Farben kommen aus den CSS-Variablen.
import { esc } from './dom.js';

const W = 640;
const H = 220;
const PAD = { l: 44, r: 16, t: 16, b: 34 };

function scale(domain, range) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (v) => r0 + ((v - d0) / span) * (r1 - r0);
}

function niceTicks(min, max, n = 4) {
  const span = max - min || 1;
  const raw = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const start = Math.floor(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 0.01; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}

export function lineChart(points, { yLabel = '', secondary = null, unit = '', minZero = false } = {}) {
  if (!points.length) return `<div class="chart-empty">Noch keine Daten.</div>`;
  const ys = points.map((p) => p.y).concat(secondary ? secondary.map((p) => p.y) : []);
  let yMin = minZero ? 0 : Math.min(...ys);
  let yMax = Math.max(...ys);
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  const padY = (yMax - yMin) * 0.1;
  yMin = minZero ? 0 : yMin - padY;
  yMax += padY;
  const x = scale([0, Math.max(1, points.length - 1)], [PAD.l, W - PAD.r]);
  const y = scale([yMin, yMax], [H - PAD.b, PAD.t]);
  const ticks = niceTicks(yMin, yMax);
  const path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  const area = `${path(points)} L${x(points.length - 1).toFixed(1)},${H - PAD.b} L${PAD.l},${H - PAD.b} Z`;
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));
  const last = points[points.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(yLabel)}">
    ${ticks.map((t) => `<g><line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}" class="grid"/><text x="${PAD.l - 6}" y="${(y(t) + 4).toFixed(1)}" class="tick" text-anchor="end">${esc(t)}</text></g>`).join('')}
    <path d="${area}" class="area"/>
    ${secondary ? `<path d="${path(secondary)}" class="line-secondary"/>` : ''}
    <path d="${path(points)}" class="line"/>
    ${points.map((p, i) => (i % labelEvery === 0 || i === points.length - 1 ? `<text x="${x(i).toFixed(1)}" y="${H - 10}" class="tick" text-anchor="middle">${esc(p.label)}</text>` : '')).join('')}
    <circle cx="${x(points.length - 1).toFixed(1)}" cy="${y(last.y).toFixed(1)}" r="4" class="dot"/>
    <text x="${Math.min(x(points.length - 1), W - PAD.r - 40).toFixed(1)}" y="${(y(last.y) - 10).toFixed(1)}" class="tick strong" text-anchor="middle">${esc(last.y)}${esc(unit)}</text>
  </svg>`;
}

export function barChart(bars, { unit = '', target = null } = {}) {
  if (!bars.length) return `<div class="chart-empty">Noch keine Daten.</div>`;
  const max = Math.max(1, ...bars.map((b) => b.y), target || 0) * 1.15;
  const y = scale([0, max], [H - PAD.b, PAD.t]);
  const n = bars.length;
  const bw = (W - PAD.l - PAD.r) / n;
  const ticks = niceTicks(0, max, 4);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">
    ${ticks.map((t) => `<g><line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}" class="grid"/><text x="${PAD.l - 6}" y="${(y(t) + 4).toFixed(1)}" class="tick" text-anchor="end">${esc(t)}</text></g>`).join('')}
    ${target ? `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(target).toFixed(1)}" y2="${y(target).toFixed(1)}" class="target"/>` : ''}
    ${bars.map((b, i) => {
      const bx = PAD.l + i * bw + bw * 0.15;
      const w = bw * 0.7;
      const top = y(b.y);
      return `<g><rect x="${bx.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${(H - PAD.b - top).toFixed(1)}" rx="3" class="bar ${b.cls || ''}"/>
        ${b.y ? `<text x="${(bx + w / 2).toFixed(1)}" y="${(top - 5).toFixed(1)}" class="tick" text-anchor="middle">${esc(b.y)}${esc(unit)}</text>` : ''}
        <text x="${(bx + w / 2).toFixed(1)}" y="${H - 10}" class="tick" text-anchor="middle">${esc(b.label)}</text></g>`;
    }).join('')}
  </svg>`;
}

// Horizontale Balken: Volumen pro Muskel vs. Zielbereich.
export function volumeBars(rows) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.value, r.max)));
  return `<div class="vol-list">${rows
    .map((r) => {
      const pct = (v) => `${Math.min(100, (v / max) * 100).toFixed(1)}%`;
      const state = r.value < r.min ? 'low' : r.value > r.max ? 'high' : 'ok';
      return `<div class="vol-row">
        <div class="vol-label">${esc(r.label)}</div>
        <div class="vol-track"><div class="vol-range" style="left:${pct(r.min)};width:calc(${pct(r.max)} - ${pct(r.min)})"></div><div class="vol-fill ${state}" style="width:${pct(r.value)}"></div></div>
        <div class="vol-num">${esc(r.value)}<span class="muted">/${esc(r.target)}</span></div>
      </div>`;
    })
    .join('')}</div>`;
}

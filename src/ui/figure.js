// Bewegungsfiguren: eine gezeichnete Figur (Seiten- oder Vorderansicht) führt die Übung als Schleife vor.
// Posen sind Gelenkwinkel oder Zielpunkte (dann löst eine kleine inverse Kinematik den Winkel), zwischen
// Schlüsselposen wird weich interpoliert. Ausrüstung (Hantel, Bank, Kabelzug …) hängt an den Gelenken.
import { MOTIONS, motionFor, motionForMobility } from '../data/motions.js';

// Segmentlängen (Einheiten im viewBox 200×200, Boden bei y = 178)
const L = { torso: 42, uarm: 26, farm: 24, thigh: 40, shin: 38, foot: 13, neck: 14, head: 9, shW: 15, hipW: 8 };
const FLOOR = 178;
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
// Richtung eines Winkels: 0 = nach unten, 90 = nach rechts (vorn), 180 = nach oben
const dir = (a) => [Math.sin(rad(a)), Math.cos(rad(a))];
const add = (p, d, len) => [p[0] + d[0] * len, p[1] + d[1] * len];
const angleTo = (from, to) => deg(Math.atan2(to[0] - from[0], to[1] - from[1]));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, u) => a + (b - a) * u;
function lerpAngle(a, b, u) {
  let d = ((((b - a) % 360) + 540) % 360) - 180;
  return a + d * u;
}
const smooth = (u) => u * u * (3 - 2 * u);
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Zwei-Gelenk-IK: Winkel beider Segmente, damit das Ende den Zielpunkt erreicht. bend wählt die Seite des Mittelgelenks.
function ik(O, T, l1, l2, bend = '+x') {
  let dx = T[0] - O[0];
  let dy = T[1] - O[1];
  let d = Math.hypot(dx, dy);
  if (d < 0.01) {
    dx = 0;
    dy = 1;
    d = 1;
  }
  const phi = deg(Math.atan2(dx, dy));
  const max = l1 + l2 - 0.01;
  const min = Math.abs(l1 - l2) + 0.01;
  if (d >= max) return [phi, phi];
  const dc = Math.max(d, min);
  const A = deg(Math.acos(clamp((l1 * l1 + dc * dc - l2 * l2) / (2 * l1 * dc), -1, 1)));
  const c1 = add(O, dir(phi + A), l1);
  const c2 = add(O, dir(phi - A), l1);
  let pick;
  if (bend === '+x') pick = c1[0] >= c2[0];
  else if (bend === '-x') pick = c1[0] < c2[0];
  else if (bend === '+y') pick = c1[1] >= c2[1];
  else pick = c1[1] < c2[1];
  const a1 = pick ? phi + A : phi - A;
  const J = pick ? c1 : c2;
  const Tc = add(O, dir(phi), dc);
  return [a1, angleTo(J, Tc)];
}

// ---------- Posen normalisieren ----------
const LIMBS = { side: ['aN', 'aF', 'lN', 'lF'], front: ['aL', 'aR', 'lL', 'lR'] };
const KEYS = ['hip', 'torso', 'head', 'shrug', 'len', 'foot', 'arm', 'armN', 'armF', 'armL', 'armR', 'leg', 'legN', 'legF', 'legL', 'legR'];

function limbSpec(v) {
  if (!v) return null;
  if (Array.isArray(v)) return { a: v };
  return v;
}

// Wurzelpunkte einer Pose (Hüfte, Schultern) – ohne Gliedmaßen.
function roots(view, p) {
  const hip = p.hip;
  const torsoDir = dir(p.torso);
  const shC = add(hip, torsoDir, L.torso);
  shC[1] -= p.shrug || 0;
  if (view === 'side') return { hip, shoulder: shC, aN: shC, aF: [shC[0] - 2, shC[1]], lN: hip, lF: [hip[0] - 3, hip[1]] };
  const perp = dir(p.torso + 90); // zeigt zur Bildschirm-Linken der Figur
  return {
    hip,
    shoulder: shC,
    aL: add(shC, perp, L.shW),
    aR: add(shC, perp, -L.shW),
    lL: add(hip, perp, L.hipW),
    lR: add(hip, perp, -L.hipW),
  };
}

const isArm = (k) => k[0] === 'a';
const lens = (k, len) => (isArm(k) ? [L.uarm * (len.uarm ?? 1), L.farm * (len.farm ?? 1)] : [L.thigh * (len.thigh ?? 1), L.shin * (len.shin ?? 1)]);

// Ein Motion-Objekt in interpolierbare Schlüsselposen übersetzen.
function compile(m) {
  const view = m.view || 'side';
  const frames = [];
  let prev = {};
  for (const f of m.frames) {
    const spec = { ...prev };
    for (const k of KEYS) if (f[k] !== undefined) spec[k] = f[k];
    prev = spec;
    const p = {
      t: f.t ?? 0,
      label: f.label || null,
      ease: f.ease || 'inout',
      hip: spec.hip || [100, 94],
      torso: spec.torso ?? 180,
      head: spec.head ?? 0,
      shrug: spec.shrug ?? 0,
      len: spec.len || {},
      foot: spec.foot,
      limbs: {},
    };
    const R = roots(view, p);
    const pick = (k) => {
      if (view === 'side') {
        if (k === 'aN') return limbSpec(spec.armN) || limbSpec(spec.arm);
        if (k === 'aF') return limbSpec(spec.armF) || limbSpec(spec.arm);
        if (k === 'lN') return limbSpec(spec.legN) || limbSpec(spec.leg);
        return limbSpec(spec.legF) || limbSpec(spec.leg);
      }
      if (k === 'aL') return limbSpec(spec.armL) || limbSpec(spec.arm);
      if (k === 'aR') return limbSpec(spec.armR) || limbSpec(spec.arm);
      if (k === 'lL') return limbSpec(spec.legL) || limbSpec(spec.leg);
      return limbSpec(spec.legR) || limbSpec(spec.leg);
    };
    for (const k of LIMBS[view]) {
      const s = pick(k) || (isArm(k) ? { a: [0, 0] } : { a: [0, 0] });
      const [l1, l2] = lens(k, p.len);
      let a;
      let t = null;
      if (s.t) {
        t = { p: s.t, bend: s.bend || (isArm(k) ? '-x' : '+x') };
        a = ik(R[k], s.t, l1, l2, t.bend);
      } else if (s.ar) {
        // relativ zum Rumpf notiert
        a = [p.torso + s.ar[0], p.torso + s.ar[1]];
      } else {
        a = s.a.slice();
        // Vorderansicht: Winkel der linken Seite sind gespiegelt notiert (positiv = nach außen).
        if (view === 'front' && (k === 'aL' || k === 'lL')) a = [-a[0], -a[1]];
      }
      p.limbs[k] = { a, t, mirror: s.mirror || false };
    }
    frames.push(p);
  }
  if (frames.length && frames[frames.length - 1].t < 1) frames.push({ ...frames[0], t: 1, label: null });
  return { ...m, view, frames, dur: m.dur || 3000 };
}

const compiled = new Map();
function getMotion(id) {
  if (!compiled.has(id)) {
    const m = MOTIONS[id];
    if (!m) return null;
    compiled.set(id, compile({ id, ...m }));
  }
  return compiled.get(id);
}

// Pose zum Zeitpunkt t (0..1) – Winkel interpoliert, Zielpunkte pro Bild neu gelöst.
function poseAt(cm, t) {
  const fr = cm.frames;
  let i = 0;
  while (i < fr.length - 2 && t >= fr[i + 1].t) i++;
  const k0 = fr[i];
  const k1 = fr[i + 1] || fr[i];
  const span = Math.max(1e-6, k1.t - k0.t);
  let u = clamp((t - k0.t) / span, 0, 1);
  if (k0.ease !== 'linear') u = smooth(u);
  const p = {
    hip: [lerp(k0.hip[0], k1.hip[0], u), lerp(k0.hip[1], k1.hip[1], u)],
    torso: lerpAngle(k0.torso, k1.torso, u),
    head: lerp(k0.head, k1.head, u),
    shrug: lerp(k0.shrug, k1.shrug, u),
    len: {},
    label: k0.label,
    seg: i,
  };
  for (const key of ['thigh', 'shin', 'uarm', 'farm']) {
    const a = k0.len[key] ?? 1;
    const b = k1.len[key] ?? 1;
    if (a !== 1 || b !== 1) p.len[key] = lerp(a, b, u);
  }
  const R = roots(cm.view, p);
  p.limbs = {};
  for (const k of LIMBS[cm.view]) {
    const A = k0.limbs[k];
    const B = k1.limbs[k];
    const [l1, l2] = lens(k, p.len);
    if (A.t && B.t) {
      const T = [lerp(A.t.p[0], B.t.p[0], u), lerp(A.t.p[1], B.t.p[1], u)];
      p.limbs[k] = ik(R[k], T, l1, l2, u < 0.5 ? A.t.bend : B.t.bend);
    } else {
      p.limbs[k] = [lerpAngle(A.a[0], B.a[0], u), lerpAngle(A.a[1], B.a[1], u)];
    }
  }
  const footOf = (kf, side) => (kf.foot == null ? null : typeof kf.foot === 'number' ? kf.foot : kf.foot[side]);
  p.foot = {};
  for (const side of ['N', 'F']) {
    const a = footOf(k0, side);
    const b = footOf(k1, side);
    p.foot[side] = a == null || b == null ? (a ?? b) : lerpAngle(a, b, u);
  }
  return p;
}

// Gelenkpunkte aus einer interpolierten Pose.
function joints(cm, p) {
  const R = roots(cm.view, p);
  const J = { hip: R.hip, shoulder: R.shoulder, head: add(R.shoulder, dir(p.torso + p.head), L.neck) };
  const [ua, fa] = [L.uarm * (p.len.uarm ?? 1), L.farm * (p.len.farm ?? 1)];
  const [th, sh] = [L.thigh * (p.len.thigh ?? 1), L.shin * (p.len.shin ?? 1)];
  for (const k of LIMBS[cm.view]) {
    const [a1, a2] = p.limbs[k];
    const s = k.slice(1);
    if (isArm(k)) {
      const elbow = add(R[k], dir(a1), ua);
      const wrist = add(elbow, dir(a2), fa);
      J['sh' + s] = R[k];
      J['elbow' + s] = elbow;
      J['wrist' + s] = wrist;
      J['hand' + s] = add(wrist, dir(a2), 5);
    } else {
      const knee = add(R[k], dir(a1), th);
      const ankle = add(knee, dir(a2), sh);
      J['hipJ' + s] = R[k];
      J['knee' + s] = knee;
      J['ankle' + s] = ankle;
      if (cm.view === 'side') {
        const fa2 = p.foot[s] ?? a2 + 90;
        J['toe' + s] = add(ankle, dir(fa2), L.foot);
      } else {
        J['toe' + s] = [ankle[0] + (s === 'L' ? -5 : 5), ankle[1] + 2];
        J['heel' + s] = [ankle[0] + (s === 'L' ? 4 : -4), ankle[1] + 2];
      }
    }
  }
  return J;
}

// ---------- Zeichnen ----------
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs = {}, cls = '') {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (cls) e.setAttribute('class', cls);
  return e;
}
function setLine(e, a, b) {
  e.setAttribute('x1', a[0].toFixed(1));
  e.setAttribute('y1', a[1].toFixed(1));
  e.setAttribute('x2', b[0].toFixed(1));
  e.setAttribute('y2', b[1].toFixed(1));
}

function staticProps(g, props = []) {
  for (const p of props) {
    if (p.t === 'rect') {
      const r = el('rect', { x: p.x, y: p.y, width: p.w, height: p.h, rx: p.r ?? 3 }, `fig-prop fp-${p.cls || 'pad'}`);
      if (p.rot) r.setAttribute('transform', `rotate(${p.rot} ${p.x + p.w / 2} ${p.y + p.h / 2})`);
      g.appendChild(r);
    } else if (p.t === 'line') {
      const l = el('line', { x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2 }, `fig-prop fp-${p.cls || 'bar'}`);
      if (p.w) l.setAttribute('stroke-width', p.w);
      g.appendChild(l);
    } else if (p.t === 'circle') {
      g.appendChild(el('circle', { cx: p.x, cy: p.y, r: p.r }, `fig-prop fp-${p.cls || 'pulley'}`));
    } else if (p.t === 'bench') {
      // Polster mit zwei Füßen
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      const grp = el('g', p.tilt ? { transform: `rotate(${p.tilt} ${cx} ${cy})` } : {});
      grp.appendChild(el('rect', { x: p.x, y: p.y, width: p.w, height: p.h, rx: 4 }, 'fig-prop fp-pad'));
      if (!p.noLegs) {
        grp.appendChild(el('line', { x1: p.x + 10, y1: p.y + p.h, x2: p.x + 10, y2: FLOOR }, 'fig-prop fp-bar'));
        grp.appendChild(el('line', { x1: p.x + p.w - 10, y1: p.y + p.h, x2: p.x + p.w - 10, y2: FLOOR }, 'fig-prop fp-bar'));
      }
      g.appendChild(grp);
    } else if (p.t === 'box') {
      g.appendChild(el('rect', { x: p.x, y: p.y, width: p.w, height: p.h, rx: 3 }, 'fig-prop fp-box'));
    } else if (p.t === 'text') {
      const t = el('text', { x: p.x, y: p.y }, 'fig-prop fp-text');
      t.textContent = p.text;
      g.appendChild(t);
    }
  }
}

const SIDE_SEGS = [
  ['far', 'F', ['thigh', 'shin', 'foot', 'uarm', 'farm']],
  ['near', 'N', ['thigh', 'shin', 'foot', 'uarm', 'farm']],
];
const FRONT_SEGS = [
  ['L', 'L', ['thigh', 'shin', 'foot', 'uarm', 'farm']],
  ['R', 'R', ['thigh', 'shin', 'foot', 'uarm', 'farm']],
];

function build(svg, cm, muscles) {
  svg.innerHTML = '';
  svg.setAttribute('viewBox', (cm.box || [0, 0, 200, 200]).join(' '));
  const parts = { seg: {}, dots: [] };
  const gStatic = el('g', {}, 'fig-static');
  staticProps(gStatic, cm.props);
  svg.appendChild(gStatic);
  if (!cm.noFloor) svg.appendChild(el('line', { x1: 4, y1: FLOOR, x2: 196, y2: FLOOR }, 'fig-floor'));
  parts.cable = el('g', {}, 'fig-cable');
  svg.appendChild(parts.cable);
  const hl = new Set(muscles || []);
  const segCls = (name, side) => {
    const m = SEG_MUSCLE[name] || [];
    const on = m.some((x) => hl.has(x));
    return `fig-seg ${name}${on ? ' hl' : ''}`;
  };
  const groups = cm.view === 'side' ? SIDE_SEGS : FRONT_SEGS;
  const mk = (gname, side, names) => {
    const g = el('g', {}, `fig-${gname}`);
    for (const n of names) {
      const e = el('line', {}, segCls(n, side));
      parts.seg[n + side] = e;
      g.appendChild(e);
    }
    return g;
  };
  // Reihenfolge: hintere Gliedmaßen, Rumpf, Kopf, vordere Gliedmaßen
  const [g0, g1] = groups;
  const legsFirst = (g) => {
    const legs = mk(g[0], g[1], g[2].slice(0, 3));
    const arms = mk(g[0], g[1], g[2].slice(3));
    return [legs, arms];
  };
  const [legs0, arms0] = legsFirst(g0);
  const [legs1, arms1] = legsFirst(g1);
  if (cm.view === 'side') {
    svg.appendChild(legs0);
    svg.appendChild(arms0);
  } else {
    svg.appendChild(legs0);
    svg.appendChild(legs1);
  }
  const torsoOn = ['brust', 'ruecken', 'bauch'].some((x) => hl.has(x));
  parts.torso = cm.view === 'side' ? el('line', {}, `fig-torso${torsoOn ? ' hl' : ''}`) : el('path', {}, `fig-torso front${torsoOn ? ' hl' : ''}`);
  svg.appendChild(parts.torso);
  parts.head = el('circle', { r: L.head }, 'fig-head');
  svg.appendChild(parts.head);
  if (cm.view === 'side') {
    svg.appendChild(legs1);
    svg.appendChild(arms1);
  } else {
    svg.appendChild(arms0);
    svg.appendChild(arms1);
  }
  parts.hold = el('g', {}, 'fig-hold');
  svg.appendChild(parts.hold);
  parts.hl = el('g', {}, 'fig-hl');
  svg.appendChild(parts.hl);
  for (const m of hl) {
    const n = MUSCLE_DOTS[m]?.n || 1;
    for (let i = 0; i < n; i++) {
      const d = el('circle', { r: 5 }, 'fig-dot');
      parts.dots.push({ m, i, el: d });
      parts.hl.appendChild(d);
    }
  }
  return parts;
}

// Welche Segmente zu welchem Muskel gehören (für die Einfärbung).
const SEG_MUSCLE = {
  thigh: ['quadrizeps', 'beinbeuger', 'gesaess'],
  shin: ['waden'],
  uarm: ['schultern', 'bizeps', 'trizeps'],
  farm: ['unterarm'],
};

// Leuchtpunkte: Position entlang eines Segments plus Versatz zur Vorder- (+) oder Rückseite (−).
const MUSCLE_DOTS = {
  brust: { seg: 'torso', f: 0.78, off: 7, n: 1 },
  ruecken: { seg: 'torso', f: 0.6, off: -7, n: 1 },
  bauch: { seg: 'torso', f: 0.3, off: 6, n: 1 },
  schultern: { seg: 'uarm', f: 0.08, off: 0, n: 1 },
  bizeps: { seg: 'uarm', f: 0.5, off: 5, n: 1 },
  trizeps: { seg: 'uarm', f: 0.5, off: -5, n: 1 },
  unterarm: { seg: 'farm', f: 0.5, off: 0, n: 1 },
  quadrizeps: { seg: 'thigh', f: 0.5, off: 5, n: 1 },
  beinbeuger: { seg: 'thigh', f: 0.5, off: -5, n: 1 },
  gesaess: { seg: 'thigh', f: 0.05, off: -7, n: 1 },
  waden: { seg: 'shin', f: 0.45, off: -5, n: 1 },
};

function dotPos(cm, J, m) {
  const d = MUSCLE_DOTS[m];
  if (!d) return null;
  const side = cm.view === 'side' ? 'N' : 'R';
  let A;
  let B;
  let frontSign = 1;
  if (d.seg === 'torso') {
    A = J.hip;
    B = J.shoulder;
    frontSign = -1; // Rumpf zeigt nach oben: Vorderseite = rechts
  } else if (d.seg === 'uarm') {
    A = J['sh' + side];
    B = J['elbow' + side];
  } else if (d.seg === 'farm') {
    A = J['elbow' + side];
    B = J['wrist' + side];
  } else if (d.seg === 'thigh') {
    A = J['hipJ' + side];
    B = J['knee' + side];
  } else {
    A = J['knee' + side];
    B = J['ankle' + side];
  }
  if (!A || !B) return null;
  const dx = B[0] - A[0];
  const dy = B[1] - A[1];
  const len = Math.hypot(dx, dy) || 1;
  // Normale, die bei stehender Figur nach vorn (rechts) zeigt
  const nx = frontSign * (dy / len);
  const ny = frontSign * (-dx / len);
  const off = cm.view === 'front' ? 0 : d.off;
  return [A[0] + dx * d.f + nx * off, A[1] + dy * d.f + ny * off];
}

function draw(f, t) {
  const { cm, parts } = f;
  const p = poseAt(cm, t);
  const J = joints(cm, p);
  const seg = parts.seg;
  const sides = cm.view === 'side' ? ['F', 'N'] : ['L', 'R'];
  for (const s of sides) {
    setLine(seg['thigh' + s], J['hipJ' + s], J['knee' + s]);
    setLine(seg['shin' + s], J['knee' + s], J['ankle' + s]);
    if (cm.view === 'side') setLine(seg['foot' + s], J['ankle' + s], J['toe' + s]);
    else setLine(seg['foot' + s], J['heel' + s], J['toe' + s]);
    setLine(seg['uarm' + s], J['sh' + s], J['elbow' + s]);
    setLine(seg['farm' + s], J['elbow' + s], J['hand' + s]);
  }
  if (cm.view === 'side') setLine(parts.torso, J.hip, J.shoulder);
  else {
    const perp = dir(p.torso + 90);
    const sl = add(J.shoulder, perp, L.shW - 3);
    const sr = add(J.shoulder, perp, -(L.shW - 3));
    const hl = add(J.hip, perp, L.hipW);
    const hr = add(J.hip, perp, -L.hipW);
    parts.torso.setAttribute('d', `M${sl[0].toFixed(1)} ${sl[1].toFixed(1)}L${sr[0].toFixed(1)} ${sr[1].toFixed(1)}L${hr[0].toFixed(1)} ${hr[1].toFixed(1)}L${hl[0].toFixed(1)} ${hl[1].toFixed(1)}Z`);
  }
  parts.head.setAttribute('cx', J.head[0].toFixed(1));
  parts.head.setAttribute('cy', J.head[1].toFixed(1));
  drawHold(f, J, p);
  for (const d of parts.dots) {
    const pos = dotPos(cm, J, d.m);
    if (!pos) continue;
    d.el.setAttribute('cx', pos[0].toFixed(1));
    d.el.setAttribute('cy', pos[1].toFixed(1));
  }
  if (f.labelEl && p.seg !== f.lastSeg) {
    f.lastSeg = p.seg;
    const label = p.label || cm.frames.slice(0, p.seg + 1).reverse().find((x) => x.label)?.label || '';
    f.labelEl.textContent = label;
  }
}

// Gehaltene Ausrüstung und Kabel/Bänder – folgen den Händen.
function drawHold(f, J, p) {
  const { cm, parts } = f;
  const g = parts.hold;
  const c = parts.cable;
  g.innerHTML = '';
  c.innerHTML = '';
  const side = cm.view === 'side';
  const armsOf = (spec) => {
    if (side) return spec === 'both' ? ['N', 'F'] : spec === 'F' ? ['F'] : ['N'];
    return spec === 'both' || !spec ? ['L', 'R'] : [spec];
  };
  const anchorOf = (k, at) => {
    if (at === 'shoulder') return [J.shoulder[0] - 4, J.shoulder[1] + 3];
    if (at === 'shoulderFront') return [J.shoulder[0] + 5, J.shoulder[1] + 4];
    if (at === 'hip') return [J.hip[0] + 4, J.hip[1] - 6];
    return J['wrist' + k];
  };
  if (cm.hold) {
    const arms = armsOf(cm.holdArms || (side ? 'N' : 'both'));
    const kind = cm.hold;
    if (!side && (kind === 'bar' || kind === 'rope')) {
      // Vorderansicht: Stange zwischen den Händen
      const a = anchorOf('L', cm.holdAt);
      const b = anchorOf('R', cm.holdAt);
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      const ext = kind === 'bar' ? (cm.barExt ?? 26) : 4;
      const ux = dx / len;
      const uy = dy / len;
      const p1 = [a[0] - ux * ext, a[1] - uy * ext];
      const p2 = [b[0] + ux * ext, b[1] + uy * ext];
      const line = el('line', {}, 'fig-prop fp-bar');
      setLine(line, p1, p2);
      g.appendChild(line);
      if (kind === 'bar' && cm.plates !== false) {
        for (const pt of [p1, p2]) {
          const r = el('rect', { x: pt[0] - 3, y: pt[1] - 9, width: 6, height: 18, rx: 2 }, 'fig-prop fp-plate');
          r.setAttribute('transform', `rotate(${deg(Math.atan2(uy, ux))} ${pt[0]} ${pt[1]})`);
          g.appendChild(r);
        }
      }
    } else {
      for (const k of arms) {
        const w = anchorOf(k, cm.holdAt);
        if (kind === 'bar') {
          g.appendChild(el('circle', { cx: w[0], cy: w[1], r: cm.plateR ?? 9 }, 'fig-prop fp-plate'));
          g.appendChild(el('circle', { cx: w[0], cy: w[1], r: 2 }, 'fig-prop fp-bar-end'));
        } else if (kind === 'plate') {
          g.appendChild(el('circle', { cx: w[0], cy: w[1], r: 9 }, 'fig-prop fp-plate'));
          g.appendChild(el('circle', { cx: w[0], cy: w[1], r: 3 }, 'fig-prop fp-hole'));
        } else if (kind === 'db') {
          if (side) {
            // Seitenansicht: Hantelscheibe von vorn (Griff zeigt zum Betrachter)
            g.appendChild(el('circle', { cx: w[0], cy: w[1], r: 5.5 }, 'fig-prop fp-plate'));
            g.appendChild(el('circle', { cx: w[0], cy: w[1], r: 1.6 }, 'fig-prop fp-bar-end'));
          } else {
            g.appendChild(el('rect', { x: w[0] - 8, y: w[1] - 3.5, width: 16, height: 7, rx: 2 }, 'fig-prop fp-plate'));
          }
        } else if (kind === 'kb') {
          g.appendChild(el('path', { d: `M${w[0] - 5} ${w[1]}a5 5 0 0 1 10 0` }, 'fig-prop fp-bar'));
          g.appendChild(el('circle', { cx: w[0], cy: w[1] + 9, r: 6.5 }, 'fig-prop fp-plate'));
        } else if (kind === 'handle') {
          g.appendChild(el('circle', { cx: w[0], cy: w[1], r: 3.5 }, 'fig-prop fp-handle'));
        } else if (kind === 'wheel') {
          g.appendChild(el('circle', { cx: w[0], cy: w[1] + 6, r: 7 }, 'fig-prop fp-plate'));
        } else if (kind === 'band') {
          g.appendChild(el('circle', { cx: w[0], cy: w[1], r: 3 }, 'fig-prop fp-handle'));
        }
      }
    }
  }
  for (const cab of cm.cables || []) {
    const from = cab.from;
    if (cab.pulley !== false) c.appendChild(el('circle', { cx: from[0], cy: from[1], r: 3 }, 'fig-prop fp-pulley'));
    if (cab.to === 'mid') {
      const a = J.wristL || J.wristN;
      const b = J.wristR || J.wristF;
      const line = el('line', {}, `fig-prop fp-${cab.cls || 'cable'}`);
      setLine(line, from, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
      c.appendChild(line);
      continue;
    }
    const arms = armsOf(cab.to);
    for (const k of arms) {
      const to = cab.at === 'ankle' ? J['ankle' + k] : cab.at === 'knee' ? J['knee' + k] : J['wrist' + k];
      const line = el('line', {}, `fig-prop fp-${cab.cls || 'cable'}`);
      setLine(line, from, to);
      c.appendChild(line);
    }
  }
  for (const lk of cm.links || []) {
    const a = J[lk.a];
    const b = J[lk.b];
    if (!a || !b) continue;
    const line = el('line', {}, `fig-prop fp-${lk.cls || 'band'}`);
    setLine(line, a, b);
    c.appendChild(line);
  }
  for (const att of cm.attach || []) {
    // Platte/Polster am Gelenk (z. B. Beinpresse, Beinstrecker)
    const k = att.at.slice(-1);
    const base = att.at.startsWith('ankle') ? J['ankle' + k] : att.at.startsWith('knee') ? J['knee' + k] : J['wrist' + k];
    const pos = [base[0] + (att.dx || 0), base[1] + (att.dy || 0)];
    if (att.t === 'plate') {
      const r = el('rect', { x: pos[0] - att.w / 2, y: pos[1] - att.h / 2, width: att.w, height: att.h, rx: 3 }, 'fig-prop fp-pad');
      if (att.rot) r.setAttribute('transform', `rotate(${att.rot} ${pos[0]} ${pos[1]})`);
      g.appendChild(r);
    } else if (att.t === 'roll') {
      g.appendChild(el('circle', { cx: pos[0], cy: pos[1], r: att.r || 5 }, 'fig-prop fp-pad'));
    }
  }
}

// ---------- Öffentliche API ----------
const mounted = new WeakSet();
const active = new Set();
let rafId = 0;
let io = null;

function tick(now) {
  for (const f of active) {
    if (!f.svg.isConnected) {
      active.delete(f);
      io?.unobserve(f.svg);
      continue;
    }
    if (f.paused || !f.visible) continue;
    const t = (((now - f.start) * f.speed) % f.cm.dur) / f.cm.dur;
    draw(f, t);
  }
  rafId = active.size ? requestAnimationFrame(tick) : 0;
}

function ensureLoop() {
  if (!rafId && active.size) rafId = requestAnimationFrame(tick);
}

function observer() {
  if (io || typeof IntersectionObserver === 'undefined') return io;
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const f = e.target.__fig;
      if (f) f.visible = e.isIntersecting;
    }
  }, { rootMargin: '40px' });
  return io;
}

// HTML für eine Figur. motion: Motion-ID, muscles: hervorzuhebende Muskeln.
export function figureHTML(motionId, { size = 120, cls = '', interactive = false, label = false, muscles = [], title = '' } = {}) {
  if (!motionId || !MOTIONS[motionId]) return '';
  const m = MOTIONS[motionId];
  const box = m.box || [0, 0, 200, 200];
  const ratio = box[3] / box[2];
  const h = Math.round(size * ratio);
  return `<div class="figure-wrap ${cls}${interactive ? ' interactive' : ''}" style="--fig-size:${size}px"><svg class="figure${m.view === 'front' ? ' front' : ''}" width="${size}" height="${h}" viewBox="${box.join(' ')}" data-motion="${motionId}" data-muscles="${muscles.join(',')}" role="img" aria-label="${title ? title.replace(/"/g, '&quot;') + ' – ' : ''}Bewegungsablauf"></svg>${label ? '<div class="figure-phase" aria-live="polite"></div>' : ''}</div>`;
}

export function figureForExercise(ex, opts = {}) {
  const id = motionFor(ex);
  if (!id) return '';
  return figureHTML(id, { muscles: ex.primary, title: ex.name, ...opts });
}

export function figureForMobility(mob, opts = {}) {
  const id = motionForMobility(mob);
  if (!id) return '';
  return figureHTML(id, { title: mob.name, ...opts });
}

// Alle noch nicht aktiven Figuren in root aufbauen und animieren.
export function mountFigures(root = document) {
  const svgs = root.querySelectorAll ? root.querySelectorAll('svg.figure[data-motion]') : [];
  for (const svg of svgs) {
    if (mounted.has(svg)) continue;
    const cm = getMotion(svg.dataset.motion);
    if (!cm) continue;
    mounted.add(svg);
    const muscles = (svg.dataset.muscles || '').split(',').filter(Boolean);
    const parts = build(svg, cm, muscles);
    const wrap = svg.closest('.figure-wrap');
    const f = { svg, cm, parts, start: performance.now(), speed: 1, paused: false, visible: true, labelEl: wrap?.querySelector('.figure-phase') || null, lastSeg: -1, kf: 0 };
    svg.__fig = f;
    draw(f, 0);
    if (reduced()) {
      // Ohne Bewegung: Tippen zeigt die nächste Schlüsselpose.
      f.paused = true;
      if (wrap?.classList.contains('interactive')) {
        wrap.addEventListener('click', () => {
          f.kf = (f.kf + 1) % Math.max(1, cm.frames.length - 1);
          draw(f, cm.frames[f.kf].t);
        });
        if (f.labelEl) f.labelEl.textContent = 'Tippen für die nächste Position';
      }
      continue;
    }
    if (wrap?.classList.contains('interactive')) {
      wrap.addEventListener('click', (e) => {
        if (e.target.closest('[data-fig-act]')) return;
        f.paused = !f.paused;
        wrap.classList.toggle('paused', f.paused);
        if (!f.paused) {
          f.start = performance.now() - f.offset;
          ensureLoop();
        } else f.offset = (performance.now() - f.start) % (cm.dur / f.speed);
      });
      const scope = wrap.closest('.figure-hero') || wrap;
      scope.querySelectorAll('[data-fig-act]').forEach((b) =>
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (b.dataset.figAct === 'slow') {
            const wasSlow = f.speed < 1;
            const elapsed = (performance.now() - f.start) * f.speed;
            f.speed = wasSlow ? 1 : 0.45;
            f.start = performance.now() - elapsed / f.speed;
            b.classList.toggle('active', !wasSlow);
            b.setAttribute('aria-pressed', String(!wasSlow));
          }
        }),
      );
    }
    active.add(f);
    const o = observer();
    if (o) {
      f.visible = false;
      o.observe(svg);
      // Erstes Bild sofort zeichnen, sonst kurz leer bis der Observer meldet.
      f.visible = true;
    }
  }
  ensureLoop();
}

// Neue Figuren automatisch aufbauen, sobald sie ins Dokument kommen (Seitenwechsel, Modale, Neuzeichnen).
let observing = false;
export function autoMountFigures() {
  if (observing || typeof MutationObserver === 'undefined') return;
  observing = true;
  let scheduled = false;
  const mo = new MutationObserver((records) => {
    // Änderungen innerhalb einer Figur (jedes Animationsbild) ignorieren.
    if (records.every((r) => r.target.nodeType === 1 && r.target.closest('svg.figure'))) return;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      mountFigures(document);
    });
  });
  mo.observe(document.body, { childList: true, subtree: true });
  mountFigures(document);
}

// Beschreibung (Schritte, Tempo) zu einer Übung.
export function motionText(ex) {
  const id = motionFor(ex);
  const m = id && MOTIONS[id];
  if (!m) return null;
  return { steps: m.steps || [], tempo: m.tempo || '', view: m.view || 'side', id };
}

export { MOTIONS };
export const _internals = { getMotion, poseAt, joints };

// Standbild zu einem Zeitpunkt (für Vorschau und Tests) – ohne Animationsschleife.
export function drawStatic(svg, t = 0) {
  const cm = getMotion(svg.dataset.motion);
  if (!cm) return false;
  const muscles = (svg.dataset.muscles || '').split(',').filter(Boolean);
  const parts = build(svg, cm, muscles);
  draw({ svg, cm, parts, labelEl: svg.closest('.figure-wrap')?.querySelector('.figure-phase') || null, lastSeg: -1 }, t);
  return true;
}

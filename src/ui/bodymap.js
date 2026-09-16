// Stilisierte Körperkarte (Vorder- und Rückansicht) als SVG. Muskeln werden per Klasse hervorgehoben.
import { esc } from './dom.js';

// Regionen: [muscle, seite ('f' vorn / 'b' hinten), Pfad/Shape]
const FRONT = [
  ['brust', '<path d="M54 50h52l4 30-30 12-30-12z"/>'],
  ['schultern', '<ellipse cx="40" cy="52" rx="12" ry="9"/><ellipse cx="120" cy="52" rx="12" ry="9"/>'],
  ['bizeps', '<rect x="27" y="58" width="12" height="32" rx="6"/><rect x="121" y="58" width="12" height="32" rx="6"/>'],
  ['bauch', '<rect x="64" y="96" width="32" height="44" rx="6"/>'],
  ['quadrizeps', '<rect x="57" y="148" width="18" height="60" rx="8"/><rect x="85" y="148" width="18" height="60" rx="8"/>'],
  ['waden', '<rect x="59" y="216" width="14" height="40" rx="7"/><rect x="87" y="216" width="14" height="40" rx="7"/>'],
];
const BACK = [
  ['schultern', '<ellipse cx="40" cy="52" rx="12" ry="9"/><ellipse cx="120" cy="52" rx="12" ry="9"/>'],
  ['ruecken', '<path d="M52 50h56l2 66-30 10-30-10z"/>'],
  ['trizeps', '<rect x="27" y="58" width="12" height="32" rx="6"/><rect x="121" y="58" width="12" height="32" rx="6"/>'],
  ['gesaess', '<path d="M52 130h56v16a28 14 0 0 1-56 0z"/>'],
  ['beinbeuger', '<rect x="57" y="156" width="18" height="54" rx="8"/><rect x="85" y="156" width="18" height="54" rx="8"/>'],
  ['waden', '<rect x="59" y="216" width="14" height="40" rx="7"/><rect x="87" y="216" width="14" height="40" rx="7"/>'],
];

const SILHOUETTE = `<g class="silhouette">
  <circle cx="80" cy="20" r="13"/>
  <rect x="74" y="31" width="12" height="12"/>
  <path d="M44 44h72l6 100H38z"/>
  <rect x="24" y="46" width="18" height="80" rx="9"/>
  <rect x="118" y="46" width="18" height="80" rx="9"/>
  <rect x="54" y="140" width="24" height="122" rx="11"/>
  <rect x="82" y="140" width="24" height="122" rx="11"/>
</g>`;

function view(regions, primary, secondary, label) {
  const shapes = regions
    .map(([m, svg]) => {
      const cls = primary.includes(m) ? 'm-primary' : secondary.includes(m) ? 'm-secondary' : 'm-none';
      return `<g class="${cls}" data-muscle="${m}">${svg}</g>`;
    })
    .join('');
  return `<svg viewBox="0 0 160 270" class="bodymap" role="img" aria-label="${esc(label)}">${SILHOUETTE}${shapes}<text x="80" y="266" text-anchor="middle" class="bodymap-label">${esc(label)}</text></svg>`;
}

export function bodyMap(primary = [], secondary = []) {
  return `<div class="bodymap-wrap">${view(FRONT, primary, secondary, 'vorn')}${view(BACK, primary, secondary, 'hinten')}</div>`;
}

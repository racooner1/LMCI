// Muskelgruppen, die für die Volumensteuerung gezählt werden.
// Reihenfolge = Anzeige-Reihenfolge.
export const MUSCLES = [
  { id: 'quadrizeps', name: 'Quadrizeps', short: 'Quads' },
  { id: 'beinbeuger', name: 'Beinbeuger', short: 'Hamstr.' },
  { id: 'gesaess', name: 'Gesäß', short: 'Gesäß' },
  { id: 'waden', name: 'Waden', short: 'Waden' },
  { id: 'brust', name: 'Brust', short: 'Brust' },
  { id: 'ruecken', name: 'Rücken (Lat & oberer Rücken)', short: 'Rücken' },
  { id: 'schultern', name: 'Schultern', short: 'Schultern' },
  { id: 'bizeps', name: 'Bizeps', short: 'Bizeps' },
  { id: 'trizeps', name: 'Trizeps', short: 'Trizeps' },
  { id: 'bauch', name: 'Bauch / Rumpf', short: 'Bauch' },
];

export const MUSCLE_BY_ID = Object.fromEntries(MUSCLES.map((m) => [m.id, m]));

// Muskelgruppen, die im Onboarding als Priorität wählbar sind.
export const PRIORITY_OPTIONS = ['brust', 'ruecken', 'schultern', 'bizeps', 'trizeps', 'quadrizeps', 'beinbeuger', 'gesaess', 'waden', 'bauch'];

export const LIMITATIONS = [
  { id: 'knie', name: 'Knie', hint: 'Keine tiefen Ausfallschritte / Bulgarian Split Squats, keine Nordic Curls' },
  { id: 'schulter', name: 'Schulter', hint: 'Kein schweres Überkopfdrücken, keine Dips, kein Langhantel-Bankdrücken' },
  { id: 'ruecken_unten', name: 'Unterer Rücken', hint: 'Kein Kreuzheben / Langhantel-Rudern / Langhantel-Kniebeuge, kein Ab-Wheel' },
  { id: 'handgelenk', name: 'Handgelenk', hint: 'Keine Liegestütze auf den Handflächen, keine Frontkniebeuge' },
  { id: 'huefte', name: 'Hüfte', hint: 'Keine tiefen Kniebeugen, kein Hip Thrust mit Langhantel' },
];

export const GEAR = [
  { id: 'kurzhantel', name: 'Kurzhanteln (verstellbar oder Satz)' },
  { id: 'bank', name: 'Hantelbank (oder stabile Erhöhung)' },
  { id: 'klimmzugstange', name: 'Klimmzugstange' },
  { id: 'band', name: 'Widerstandsbänder' },
];

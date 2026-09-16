// Täglicher Check-in → Bereitschaft (Readiness) und Empfehlung für die heutige Einheit.
// checkin: { date, sleep: Stunden, sleepQuality: 1–5, stress: 1–5 (5 = sehr gestresst), energy: 1–5, sore: [muskeln] }

export function readinessScore(c) {
  if (!c) return null;
  let s = 0;
  const sleepH = c.sleep ?? 7;
  s += sleepH >= 7.5 ? 3 : sleepH >= 6.5 ? 2 : sleepH >= 5.5 ? 1 : 0;
  s += ((c.sleepQuality ?? 3) - 1) * 0.75; // 0..3
  s += (5 - (c.stress ?? 3)) * 0.75; // 0..3
  s += ((c.energy ?? 3) - 1) * 0.75; // 0..3
  const score = Math.round((s / 12) * 100);
  const level = score >= 65 ? 'gut' : score >= 40 ? 'mittel' : 'niedrig';
  return { score, level };
}

export function readinessAdvice(r, soreCount = 0) {
  if (!r) return { text: 'Kurzer Check-in: Schlaf, Stress, Energie – dann passt LMCI die heutige Einheit an.', mode: 'normal' };
  if (r.level === 'gut' && soreCount === 0) return { text: 'Gute Bereitschaft – heute darf es schwer werden. Wenn die Vorgaben leicht wirken: eine Wiederholung mehr.', mode: 'normal' };
  if (r.level === 'niedrig') return { text: 'Niedrige Bereitschaft. Empfehlung: leichte Version (ein Satz weniger pro Übung, eine Wiederholung mehr in Reserve) oder Ruhetag mit Mobilität.', mode: 'leicht' };
  if (soreCount >= 2) return { text: 'Mehrere Muskeln noch nicht erholt. Trainiere normal, aber halte 1–2 Wiederholungen mehr in Reserve.', mode: 'leicht' };
  return { text: 'Mittlere Bereitschaft – normal trainieren, Technik vor Gewicht.', mode: 'normal' };
}

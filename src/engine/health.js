// Gesundheits-Screening vor dem Training (angelehnt an PAR-Q+, Warburton et al. 2011).
// Kein Ersatz für ärztliche Beratung – aber die App weiß so, wann sie bremsen muss.

export const HEALTH_QUESTIONS = [
  { id: 'herz', text: 'Hat ein Arzt bei dir eine Herzerkrankung oder Bluthochdruck festgestellt?' },
  { id: 'brustschmerz', text: 'Hast du Brustschmerzen in Ruhe oder bei körperlicher Belastung?' },
  { id: 'schwindel', text: 'Hattest du in den letzten 12 Monaten Schwindel mit Gleichgewichtsverlust oder bist ohnmächtig geworden?' },
  { id: 'chronisch', text: 'Hast du eine andere chronische Erkrankung (z. B. Diabetes, Asthma, Nieren- oder Krebserkrankung)?' },
  { id: 'medikamente', text: 'Nimmst du regelmäßig Medikamente wegen einer chronischen Erkrankung?' },
  { id: 'gelenk', text: 'Hast du ein Knochen-, Gelenk- oder Weichteilproblem, das sich durch mehr Bewegung verschlechtern könnte?' },
  { id: 'aufsicht', text: 'Hat dir ein Arzt gesagt, dass du nur unter medizinischer Aufsicht trainieren solltest?' },
  { id: 'schwangerschaft', text: 'Bist du schwanger oder in den ersten Monaten nach einer Geburt?' },
];

export const HEALTH_BY_ID = Object.fromEntries(HEALTH_QUESTIONS.map((q) => [q.id, q]));

/**
 * Ableitungen aus den Antworten.
 * positive: mindestens eine PAR-Q+-Frage mit Ja (ohne Schwangerschaft)
 * pregnant: Schwangerschaft / Wochenbett
 * cautious: irgendetwas davon → keine Intervalle, RIR mindestens 2, kein 3–5-Wiederholungsbereich
 * noDeficit: kein Kaloriendefizit
 */
export function healthFlags(profile) {
  const h = new Set(profile?.health || []);
  const pregnant = h.has('schwangerschaft');
  const positive = HEALTH_QUESTIONS.some((q) => q.id !== 'schwangerschaft' && h.has(q.id));
  const cautious = positive || pregnant;
  return { positive, pregnant, cautious, noIntervals: cautious, noDeficit: pregnant, list: [...h] };
}

export function healthNotes(profile) {
  const f = healthFlags(profile);
  const notes = [];
  if (f.positive) notes.push('Du hast mindestens eine Gesundheitsfrage mit Ja beantwortet. Bitte lass dir das Training ärztlich freigeben. Bis dahin plant LMCI ohne Intervalle, mit mindestens 2 Wiederholungen in Reserve und ohne sehr schwere 3–5er-Sätze.');
  if (f.pregnant) notes.push('Schwangerschaft / Wochenbett: keine Übungen in Rückenlage am Boden, kein Hängen, kein schweres Kreuzheben und keine Pressatmung. Kein Kaloriendefizit. Bitte mit Ärztin oder Hebamme abstimmen.');
  return notes;
}

// Ernährung: Grundumsatz (Mifflin-St Jeor 1990), Gesamtumsatz, Zielkalorien, Makros.
import { round } from './util.js';
import { cardioKcal } from './cardio.js';
import { healthFlags } from './health.js';

export const ACTIVITY_LEVELS = {
  sitzend: { name: 'Sitzend', desc: 'Bürojob, wenig Bewegung im Alltag', factor: 1.2 },
  leicht: { name: 'Leicht aktiv', desc: 'Viel zu Fuß / stehend, leichte Arbeit', factor: 1.375 },
  moderat: { name: 'Moderat aktiv', desc: 'Körperlich aktiver Job oder viel Alltagsbewegung', factor: 1.5 },
  hoch: { name: 'Sehr aktiv', desc: 'Schwere körperliche Arbeit', factor: 1.7 },
};

// Aktuelles Körpergewicht: Mittel der Wiegungen aus den letzten 7 Tagen vor der jüngsten Wiegung, sonst Profilwert.
export function currentWeight(profile, bodyLogs = []) {
  const logs = [...bodyLogs].filter((b) => b?.weightKg > 0).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!logs.length) return profile?.weightKg || 0;
  const last = new Date(logs[logs.length - 1].date).getTime();
  const win = logs.filter((b) => last - new Date(b.date).getTime() <= 7 * 86400000);
  return Math.round((win.reduce((a, b) => a + b.weightKg, 0) / win.length) * 10) / 10;
}

export function bmrMifflin({ sex, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === 'm') return base + 5;
  if (sex === 'w') return base - 161;
  return base - 78; // divers: Mittelwert
}

const GOAL_ADJ = {
  muskelaufbau: { anfaenger: 300, fortgeschritten: 250, erfahren: 150 },
  fettabbau: -0.2, // Anteil vom Gesamtumsatz
  kraft: 150,
  ausdauer: 0,
  fitness: 0,
};

export function computeNutrition(profile, plan, opts = {}) {
  const w = opts.weightKg || profile.weightKg;
  const flags = healthFlags(profile);
  const bmr = bmrMifflin({ ...profile, weightKg: w });
  const act = ACTIVITY_LEVELS[profile.activityLevel] || ACTIVITY_LEVELS.leicht;
  const baseTdee = bmr * act.factor;

  // Trainingsenergie separat (Krafttraining ≈ 5 kcal/min, Cardio je Aktivität), auf den Tag umgelegt.
  const strengthMin = (profile.strengthDays || 0) * (profile.sessionMinutes || 60);
  const strengthKcal = strengthMin * 5;
  let cardioMinutes = 0;
  let cardioKcalWeek = 0;
  if (plan?.cardio?.sessions) {
    for (const s of plan.cardio.sessions) {
      const m = s.minutesByWeek[1];
      cardioMinutes += m;
      cardioKcalWeek += cardioKcal(s.activity, m, w);
    }
  }
  const trainingPerDay = (strengthKcal + cardioKcalWeek) / 7;
  const tdee = baseTdee + trainingPerDay;

  let adj = GOAL_ADJ[profile.goal] ?? 0;
  if (typeof adj === 'object') adj = adj[profile.experience] ?? 250;
  if (adj < 0 && adj > -1) adj = Math.max(-600, Math.round(tdee * adj));
  // Schwangerschaft / Wochenbett: kein Defizit.
  if (flags.noDeficit && adj < 0) adj = 0;
  let target = tdee + adj;
  const floor = profile.sex === 'w' ? 1300 : 1500;
  if (target < floor) target = floor;

  const proteinPerKg = profile.goal === 'fettabbau' ? 2.2 : profile.goal === 'ausdauer' ? 1.6 : 1.8;
  // Beim Fettabbau bezieht sich Protein auf das Zielgewicht (mindestens 85 % des aktuellen), nicht auf das Fett, das weg soll.
  const proteinRef = profile.goal === 'fettabbau' && profile.targetWeightKg && profile.targetWeightKg < w ? Math.max(profile.targetWeightKg, w * 0.85) : w;
  const protein = round(proteinRef * proteinPerKg, 5);
  // Fett mindestens 0,8 g/kg, bei Frauen 1,0 g/kg (Hormonhaushalt), sonst 25 % der Kalorien.
  const fatFloor = profile.sex === 'w' ? 1.0 : 0.8;
  const fat = round(Math.max(fatFloor * w, (target * 0.25) / 9), 5);
  const carbs = round(Math.max(0, (target - protein * 4 - fat * 9) / 4), 5);

  return {
    bmr: Math.round(bmr),
    activityFactor: act.factor,
    baseTdee: Math.round(baseTdee),
    trainingPerDay: Math.round(trainingPerDay),
    strengthMinutesWeek: strengthMin,
    cardioMinutesWeek: cardioMinutes,
    tdee: Math.round(tdee),
    adjustment: Math.round(adj),
    target: round(target, 10),
    weightKg: w,
    protein,
    proteinPerKg,
    proteinRefKg: Math.round(proteinRef),
    fat,
    fatPerKg: fatFloor,
    noDeficit: flags.noDeficit,
    carbs,
    fiber: Math.round((target / 1000) * 14),
    waterMl: Math.round(w * 35 + cardioMinutes * 5),
    expectedRate: expectedWeeklyRate(profile, w),
  };
}

// Erwartete Gewichtsveränderung pro Woche in % des Körpergewichts.
export function expectedWeeklyRate(profile, weightKg = 0) {
  const w = weightKg || profile.weightKg || 0;
  const bmi = w && profile.heightCm ? w / (profile.heightCm / 100) ** 2 : 25;
  const nearTarget = profile.targetWeightKg && w ? (w - profile.targetWeightKg) / w < 0.05 : false;
  switch (profile.goal) {
    case 'muskelaufbau':
      return profile.experience === 'anfaenger' ? [0.25, 0.5] : profile.experience === 'fortgeschritten' ? [0.15, 0.35] : [0.1, 0.25];
    case 'fettabbau':
      // Schlanke Personen und die letzten Kilos: langsamer, sonst geht Muskelmasse mit (Garthe et al. 2011).
      return bmi < 22 || nearTarget ? [-0.7, -0.25] : [-1.0, -0.5];
    case 'kraft':
      return [0, 0.3];
    default:
      return [-0.25, 0.25];
  }
}

// 7-Tage-Trend aus Gewichtseinträgen [{date, weightKg}], sortiert. Nur die letzten windowDays vor der jüngsten Wiegung,
// sonst dominiert nach Monaten die Vergangenheit und die Anzeige reagiert nicht mehr auf ein Plateau.
export function weightTrend(bodyLogs, windowDays = 28) {
  const all = [...bodyLogs].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!all.length) return null;
  const lastTs = new Date(all[all.length - 1].date).getTime();
  const logs = all.filter((b) => lastTs - new Date(b.date).getTime() <= windowDays * 86400000);
  if (logs.length < 2) return null;
  const avgOf = (arr) => arr.reduce((a, b) => a + b.weightKg, 0) / arr.length;
  const last = logs.slice(-7);
  const first = logs.slice(0, 7);
  const meanTime = (arr) => arr.reduce((a, b) => a + new Date(b.date).getTime(), 0) / arr.length;
  // Abstand zwischen den Mittelpunkten der beiden Fenster (sonst wird der Trend unterschätzt).
  const days = Math.max(1, (meanTime(last) - meanTime(first)) / 86400000);
  const span = (new Date(last[last.length - 1].date) - new Date(first[0].date)) / 86400000;
  const lastAvg = avgOf(last);
  const firstAvg = avgOf(first);
  const perWeek = ((lastAvg - firstAvg) / days) * 7;
  return { current: lastAvg, perWeek, perWeekPct: (perWeek / lastAvg) * 100, days: Math.round(span), n: logs.length };
}

export function trendAdvice(trend, profile) {
  if (!trend || trend.days < 10) return { level: 'info', text: 'Wiege dich möglichst täglich morgens. Nach ca. 2 Wochen gibt es hier eine Einschätzung.' };
  const [lo, hi] = expectedWeeklyRate(profile, trend.current);
  const p = trend.perWeekPct;
  const fmt = (x) => `${x > 0 ? '+' : ''}${x.toFixed(2)} %/Woche`;
  if (p < lo - 0.05) {
    return profile.goal === 'fettabbau'
      ? { level: 'warn', text: `Du verlierst schneller als geplant (${fmt(p)}). Etwa 150 kcal mehr pro Tag, um Muskeln zu schützen.` }
      : { level: 'warn', text: `Trend ${fmt(p)} liegt unter dem Ziel. Erhöhe die Kalorien um ca. 150 kcal/Tag.` };
  }
  if (p > hi + 0.05) {
    return profile.goal === 'fettabbau'
      ? { level: 'warn', text: `Kein Gewichtsverlust (${fmt(p)}). Reduziere um ca. 150 kcal/Tag oder erhöhe die Schritte.` }
      : { level: 'warn', text: `Trend ${fmt(p)} liegt über dem Ziel – mehr davon wäre vor allem Fett. Reduziere um ca. 150 kcal/Tag.` };
  }
  return { level: 'ok', text: `Trend ${fmt(p)} liegt im Zielbereich (${lo} bis ${hi} %). Weiter so.` };
}

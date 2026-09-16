// Ernährungstagebuch: Makros, Suche (Basis, eigene, Rezepte, Open Food Facts), Wochenrückblick.
import { FOODS, FOOD_CATEGORIES } from '../data/foods.js';
import { weightTrend, expectedWeeklyRate } from './nutrition.js';

export const MEALS = [
  { id: 'fruehstueck', name: 'Frühstück' },
  { id: 'mittag', name: 'Mittagessen' },
  { id: 'abend', name: 'Abendessen' },
  { id: 'snack', name: 'Snacks' },
];

const r1 = (x) => Math.round(x * 10) / 10;

export function macrosFor(per100, grams) {
  const f = grams / 100;
  return {
    kcal: Math.round((per100.kcal || 0) * f),
    protein: r1((per100.protein || 0) * f),
    carbs: r1((per100.carbs || 0) * f),
    fat: r1((per100.fat || 0) * f),
    fiber: r1((per100.fiber || 0) * f),
  };
}

export function dayTotals(entries = []) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const e of entries) {
    const m = macrosFor(e.per100, e.grams);
    for (const k of Object.keys(t)) t[k] += m[k];
  }
  for (const k of Object.keys(t)) t[k] = Math.round(t[k]);
  return t;
}

// Normalisierte Lebensmittel-Objekte: { key, name, brand, per100, portion, source, barcode }
export function baseFoodItem(f) {
  return { key: `basis:${f.id}`, name: f.name, brand: FOOD_CATEGORIES[f.cat], per100: f.per100, portion: f.portion, source: 'basis' };
}

export function customFoodItem(c) {
  return { key: `eigen:${c.id}`, name: c.name, brand: c.brand || 'Eigenes Lebensmittel', per100: c.per100, portion: c.portion || null, source: 'eigen', barcode: c.barcode || null };
}

export function recipeItem(rc) {
  return { key: `rezept:${rc.id}`, name: rc.name, brand: `Rezept · ${rc.servings} Portion${rc.servings === 1 ? '' : 'en'}`, per100: rc.per100, portion: { name: 'Portion', grams: Math.round(rc.totalGrams / rc.servings) }, source: 'rezept' };
}

function normalize(s) {
  return (s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
}

// Lokale Suche: Basisliste + eigene + Rezepte. Präfix-Treffer zuerst.
export function searchLocal(q, { custom = [], recipes = [] } = {}, limit = 40) {
  const items = [...recipes.map(recipeItem), ...custom.map(customFoodItem), ...FOODS.map(baseFoodItem)];
  const nq = normalize(q.trim());
  if (!nq) return items.slice(0, limit);
  const terms = nq.split(/\s+/);
  const scored = [];
  for (const it of items) {
    const name = normalize(it.name);
    if (!terms.every((t) => name.includes(t))) continue;
    let score = name.startsWith(nq) ? 0 : name.split(' ').some((w) => w.startsWith(terms[0])) ? 1 : 2;
    if (it.source === 'eigen' || it.source === 'rezept') score -= 0.5;
    scored.push({ it, score, len: name.length });
  }
  scored.sort((a, b) => a.score - b.score || a.len - b.len);
  return scored.slice(0, limit).map((x) => x.it);
}

// ---------- Open Food Facts
const OFF_FIELDS = 'code,product_name,product_name_de,brands,nutriments,serving_size,serving_quantity,quantity';

export function normalizeOff(p) {
  if (!p) return null;
  const n = p.nutriments || {};
  const kcal = n['energy-kcal_100g'] ?? (n.energy_100g ? n.energy_100g / 4.184 : null);
  if (kcal == null || Number.isNaN(Number(kcal))) return null;
  const name = p.product_name_de || p.product_name;
  if (!name) return null;
  const sq = Number(p.serving_quantity);
  return {
    key: `off:${p.code}`,
    name: String(name).trim(),
    brand: (p.brands || '').split(',')[0].trim() || 'Open Food Facts',
    per100: { kcal: Math.round(Number(kcal)), protein: r1(Number(n.proteins_100g) || 0), carbs: r1(Number(n.carbohydrates_100g) || 0), fat: r1(Number(n.fat_100g) || 0), fiber: r1(Number(n.fiber_100g) || 0) },
    portion: sq > 0 ? { name: p.serving_size ? `Portion (${p.serving_size})` : 'Portion', grams: Math.round(sq) } : null,
    source: 'off',
    barcode: p.code,
  };
}

export async function offSearch(q, { signal } = {}) {
  const url = `https://de.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=25&fields=${OFF_FIELDS}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Open Food Facts antwortet nicht (${res.status})`);
  const data = await res.json();
  return (data.products || []).map(normalizeOff).filter(Boolean);
}

export async function offBarcode(code) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts antwortet nicht (${res.status})`);
  const data = await res.json();
  if (data.status === 0 || !data.product) return null;
  return normalizeOff(data.product);
}

// ---------- Rezepte
export function recipeTotals(items) {
  const totalGrams = items.reduce((a, it) => a + (it.grams || 0), 0);
  const sum = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const it of items) {
    const m = macrosFor(it.per100, it.grams || 0);
    for (const k of Object.keys(sum)) sum[k] += m[k];
  }
  const per100 = {};
  for (const k of Object.keys(sum)) per100[k] = totalGrams ? r1((sum[k] / totalGrams) * 100) : 0;
  per100.kcal = Math.round(per100.kcal);
  return { totalGrams, per100, total: sum };
}

// ---------- Wochenrückblick
export function weeklyReview({ foodLog = {}, bodyLogs = [], target, protein, profile, today }) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const entries = foodLog[iso] || [];
    days.push({ date: iso, logged: entries.length > 0, ...dayTotals(entries) });
  }
  const logged = days.filter((d) => d.logged);
  const avg = (k) => (logged.length ? Math.round(logged.reduce((a, d) => a + d[k], 0) / logged.length) : 0);
  const avgKcal = avg('kcal');
  const avgProtein = avg('protein');
  const recent = bodyLogs.filter((b) => {
    const d = new Date(today);
    d.setDate(d.getDate() - 21);
    return b.date >= d.toISOString().slice(0, 10);
  });
  const trend = weightTrend(recent);
  const [lo, hi] = expectedWeeklyRate(profile);
  let suggestion = { deltaKcal: 0, level: 'info', text: '' };
  if (logged.length < 4) {
    suggestion.text = `Erst ${logged.length} von 7 Tagen erfasst. Ab 4 Tagen gibt es eine Empfehlung – lieber grob jeden Tag als perfekt an zweien.`;
  } else if (Math.abs(avgKcal - target) > 250) {
    suggestion.level = 'warn';
    suggestion.text = avgKcal > target
      ? `Du liegst im Schnitt ${avgKcal - target} kcal über dem Ziel. Bevor das Ziel angepasst wird: erst eine Woche das Ziel treffen.`
      : `Du liegst im Schnitt ${target - avgKcal} kcal unter dem Ziel. Zu wenig bremst Leistung und Muskelaufbau – iss näher am Ziel.`;
  } else if (!trend || trend.days < 10) {
    suggestion.text = 'Kalorien passen zum Ziel. Für die Feinjustierung brauche ich noch etwa zwei Wochen Gewichtsdaten.';
  } else {
    const p = trend.perWeekPct;
    if (p > hi + 0.1) {
      suggestion = { deltaKcal: -150, level: 'warn', text: profile.goal === 'fettabbau' ? `Gewicht geht nicht runter (${p.toFixed(2)} %/Woche). Empfehlung: Ziel um 150 kcal senken.` : `Zu schneller Zuwachs (${p.toFixed(2)} %/Woche) – das wird vor allem Fett. Empfehlung: Ziel um 150 kcal senken.` };
    } else if (p < lo - 0.1) {
      suggestion = { deltaKcal: 150, level: 'warn', text: profile.goal === 'fettabbau' ? `Schneller Verlust (${p.toFixed(2)} %/Woche) – Muskelschutz. Empfehlung: Ziel um 150 kcal erhöhen.` : `Kein Zuwachs (${p.toFixed(2)} %/Woche). Empfehlung: Ziel um 150 kcal erhöhen.` };
    } else {
      suggestion = { deltaKcal: 0, level: 'ok', text: `Trend ${p > 0 ? '+' : ''}${p.toFixed(2)} %/Woche liegt im Zielbereich. Ziel beibehalten.` };
    }
  }
  const proteinOk = logged.length ? avgProtein >= protein * 0.9 : null;
  return { days, loggedDays: logged.length, avgKcal, avgProtein, target, protein, proteinOk, trend, suggestion };
}

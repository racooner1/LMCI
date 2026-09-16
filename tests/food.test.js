import { test } from 'node:test';
import assert from 'node:assert/strict';
import { macrosFor, dayTotals, searchLocal, normalizeOff, recipeTotals, weeklyReview, MEALS } from '../src/engine/food.js';
import { FOODS } from '../src/data/foods.js';

test('Lebensmittel-Basisliste ist plausibel', () => {
  const ids = new Set();
  for (const f of FOODS) {
    assert.ok(!ids.has(f.id));
    ids.add(f.id);
    const { kcal, protein, carbs, fat } = f.per100;
    const calc = protein * 4 + carbs * 4 + fat * 9;
    assert.ok(kcal >= 0 && kcal <= 900, f.id);
    // Alkohol liefert Kalorien außerhalb der Makros
    if (kcal > 30 && !['bier', 'wein', 'radler'].includes(f.id)) assert.ok(Math.abs(calc - kcal) / kcal < 0.35, `${f.id}: ${kcal} vs ${calc}`);
    assert.ok(f.portion.grams > 0);
  }
  assert.ok(FOODS.length >= 240);
  assert.equal(MEALS.length, 4);
});

test('Makros und Tagessumme', () => {
  const m = macrosFor({ kcal: 155, protein: 13, carbs: 1, fat: 11 }, 116);
  assert.equal(m.kcal, 180);
  assert.equal(m.protein, 15.1);
  const t = dayTotals([{ per100: { kcal: 100, protein: 10, carbs: 10, fat: 2 }, grams: 200 }, { per100: { kcal: 50, protein: 5, carbs: 5, fat: 1 }, grams: 100 }]);
  assert.deepEqual(t, { kcal: 250, protein: 25, carbs: 25, fat: 5, fiber: 0 });
});

test('Lokale Suche findet Präfix-Treffer zuerst und eigene Lebensmittel', () => {
  const r = searchLocal('hähn');
  assert.ok(r.length > 3);
  assert.ok(r[0].name.startsWith('Hähnchen'));
  const r2 = searchLocal('quark beeren');
  assert.ok(r2.some((x) => x.name.includes('Magerquark mit Beeren')));
  const custom = [{ id: 'c1', name: 'Mein Shake', per100: { kcal: 100, protein: 20, carbs: 2, fat: 1 } }];
  const r3 = searchLocal('shake', { custom });
  assert.equal(r3[0].source, 'eigen');
  assert.equal(searchLocal('').length, 40);
});

test('Open Food Facts normalisieren', () => {
  const p = { code: '4000417025005', product_name: 'Nutella', brands: 'Ferrero, Nutella', serving_size: '15 g', serving_quantity: '15', nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9, fiber_100g: 0 } };
  const n = normalizeOff(p);
  assert.equal(n.key, 'off:4000417025005');
  assert.equal(n.brand, 'Ferrero');
  assert.equal(n.per100.kcal, 539);
  assert.equal(n.portion.grams, 15);
  assert.equal(normalizeOff({ code: '1', product_name: 'x', nutriments: {} }), null);
  const kj = normalizeOff({ code: '2', product_name_de: 'Test', nutriments: { energy_100g: 418.4 } });
  assert.equal(kj.per100.kcal, 100);
});

test('Rezept berechnen', () => {
  const r = recipeTotals([{ per100: { kcal: 100, protein: 10, carbs: 5, fat: 3 }, grams: 300 }, { per100: { kcal: 400, protein: 0, carbs: 100, fat: 0 }, grams: 100 }]);
  assert.equal(r.totalGrams, 400);
  assert.equal(r.per100.kcal, 175);
  assert.equal(r.per100.protein, 7.5);
});

test('Wochenrückblick', () => {
  const profile = { goal: 'fettabbau', experience: 'fortgeschritten' };
  const today = '2026-09-16';
  const foodLog = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    foodLog[d.toISOString().slice(0, 10)] = [{ per100: { kcal: 2000, protein: 150, carbs: 200, fat: 60 }, grams: 100 }];
  }
  const few = weeklyReview({ foodLog: { [today]: foodLog[today] }, bodyLogs: [], target: 2000, protein: 150, profile, today });
  assert.equal(few.loggedDays, 1);
  assert.equal(few.suggestion.deltaKcal, 0);
  const over = weeklyReview({ foodLog, bodyLogs: [], target: 1600, protein: 150, profile, today });
  assert.equal(over.suggestion.level, 'warn');
  assert.equal(over.suggestion.deltaKcal, 0);
  const bodyLogs = [];
  for (let i = 20; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    bodyLogs.push({ date: d.toISOString().slice(0, 10), weightKg: 80 });
  }
  const flat = weeklyReview({ foodLog, bodyLogs, target: 2000, protein: 150, profile, today });
  assert.equal(flat.suggestion.deltaKcal, -150);
  assert.equal(flat.proteinOk, true);
  const losing = weeklyReview({ foodLog, bodyLogs: bodyLogs.map((b, i) => ({ ...b, weightKg: 82 - i * 0.1 })), target: 2000, protein: 150, profile, today });
  assert.equal(losing.suggestion.level, 'ok');
});

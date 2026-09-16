// Lebensmittel auswählen: Suche (lokal + Open Food Facts), Barcode, Portion, eigene Lebensmittel, Rezepte.
import { esc, openModal, closeModal, toast, num, confirmDialog } from './dom.js';
import * as store from '../state.js';
import { MEALS, macrosFor, searchLocal, offSearch, offBarcode, recipeTotals, customFoodItem, recipeItem } from '../engine/food.js';
import { uid } from '../engine/util.js';

let tab = 'zuletzt';
let offTimer = null;
let offAbort = null;

export function openFoodPicker({ date, meal, onDone }) {
  const m = openModal(
    `<div class="row gap">
      <input id="fp-q" class="search" placeholder="Lebensmittel suchen…" autocomplete="off" aria-label="Lebensmittel suchen">
      <button class="btn-icon" id="fp-scan" title="Barcode scannen" aria-label="Barcode scannen">▦</button>
    </div>
    <nav class="picker-tabs" role="tablist">${[['zuletzt', 'Zuletzt'], ['favoriten', 'Favoriten'], ['alle', 'Alle'], ['online', 'Online'], ['eigene', 'Eigene & Rezepte']].map(([id, n]) => `<button class="tab ${tab === id ? 'active' : ''}" data-tab="${id}" role="tab">${n}</button>`).join('')}</nav>
    <div id="fp-status" class="muted small" hidden></div>
    <ul class="food-list" id="fp-list"></ul>
    <div class="row gap wrap"><button class="btn btn-small" id="fp-custom">Eigenes Lebensmittel</button><button class="btn btn-small" id="fp-recipe">Rezept anlegen</button></div>`,
    { title: `Hinzufügen · ${MEALS.find((x) => x.id === meal)?.name || ''}` },
  );
  const q = m.querySelector('#fp-q');
  const list = m.querySelector('#fp-list');
  const status = m.querySelector('#fp-status');

  const pick = (item) => openPortion(item, { date, meal, onDone: () => { onDone?.(); } });
  const renderList = (items, emptyText) => {
    if (!items.length) {
      list.innerHTML = `<li class="muted small" style="padding:12px 6px">${esc(emptyText)}</li>`;
      return;
    }
    list.innerHTML = items.map((it, i) => {
      const per = it.portion ? macrosFor(it.per100, it.portion.grams) : null;
      return `<li><button class="link" data-i="${i}"><span><strong>${esc(it.name)}</strong><div class="muted small">${esc(it.brand || '')}${it.portion ? ` · ${esc(it.portion.name)} ${it.portion.grams} g` : ''}</div></span><span class="food-kcal"><strong>${per ? per.kcal : it.per100.kcal} kcal</strong>${per ? `${it.per100.kcal} / 100 g` : 'pro 100 g'} · P ${it.per100.protein} g</span></button></li>`;
    }).join('');
    list.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => pick(items[Number(b.dataset.i)])));
  };

  const refresh = () => {
    const s = store.get();
    const text = q.value.trim();
    status.hidden = true;
    if (tab === 'online') {
      clearTimeout(offTimer);
      if (text.length < 2) return renderList([], 'Mindestens 2 Zeichen eingeben – Suche in Open Food Facts (Internet nötig).');
      status.hidden = false;
      status.textContent = 'Suche in Open Food Facts…';
      offTimer = setTimeout(async () => {
        offAbort?.abort();
        offAbort = new AbortController();
        try {
          const items = await offSearch(text, { signal: offAbort.signal });
          status.hidden = true;
          renderList(items, 'Nichts gefunden. Anders schreiben oder Marke weglassen.');
        } catch (err) {
          if (err.name === 'AbortError') return;
          status.hidden = false;
          status.textContent = `Online-Suche nicht möglich (${err.message}). Offline-Liste unter „Alle“ nutzen oder eigenes Lebensmittel anlegen.`;
          renderList([], '');
        }
      }, 400);
      return;
    }
    if (tab === 'zuletzt' && !text) return renderList(s.recents, 'Noch nichts eingetragen – suche oben oder wähle „Alle“.');
    if (tab === 'favoriten' && !text) return renderList(s.favorites, 'Noch keine Favoriten. Beim Eintragen den Stern antippen.');
    if (tab === 'eigene') {
      const items = [...s.recipes.map(recipeItem), ...s.customFoods.map(customFoodItem)].filter((it) => !text || it.name.toLowerCase().includes(text.toLowerCase()));
      return renderList(items, 'Noch keine eigenen Lebensmittel oder Rezepte.');
    }
    const items = searchLocal(text, { custom: s.customFoods, recipes: s.recipes });
    const filtered = tab === 'zuletzt' || tab === 'favoriten' ? [...(tab === 'zuletzt' ? s.recents : s.favorites).filter((it) => it.name.toLowerCase().includes(text.toLowerCase())), ...items] : items;
    renderList(filtered, 'Nichts gefunden – „Online“ probieren oder eigenes Lebensmittel anlegen.');
  };

  q.addEventListener('input', refresh);
  m.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    tab = b.dataset.tab;
    m.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('active', x === b));
    refresh();
  }));
  m.querySelector('#fp-scan').addEventListener('click', () => openBarcodeScanner(async (code) => {
    status.hidden = false;
    status.textContent = `Suche Barcode ${code}…`;
    try {
      const item = await offBarcode(code);
      const s = store.get();
      const own = s.customFoods.find((c) => c.barcode === code);
      if (item) pick(item);
      else if (own) pick(customFoodItem(own));
      else {
        toast('Produkt nicht gefunden – lege es als eigenes Lebensmittel an.', 'warn');
        openCustomFood({ barcode: code }, () => { openFoodPicker({ date, meal, onDone }); });
      }
    } catch (err) {
      toast(`Barcode-Suche nicht möglich: ${err.message}`, 'warn');
    }
    status.hidden = true;
  }));
  m.querySelector('#fp-custom').addEventListener('click', () => openCustomFood(null, (c) => pick(customFoodItem(c))));
  m.querySelector('#fp-recipe').addEventListener('click', () => openRecipe(null, (rc) => pick(recipeItem(rc))));
  refresh();
  q.focus();
}

export function openPortion(item, { date, meal, existing = null, onDone }) {
  const s = store.get();
  const isFav = s.favorites.some((f) => f.key === item.key);
  const defaultGrams = existing?.grams ?? item.portion?.grams ?? 100;
  const m = openModal(
    `<div class="row between"><div><strong>${esc(item.name)}</strong><div class="muted small">${esc(item.brand || '')} · ${item.per100.kcal} kcal / 100 g</div></div><button class="star ${isFav ? 'on' : ''}" id="po-fav" title="Favorit" aria-label="Favorit">★</button></div>
     <div class="grid2">
       <label class="field"><span>Menge (g / ml)</span><input id="po-grams" type="number" inputmode="decimal" min="1" step="1" value="${defaultGrams}"></label>
       <label class="field"><span>Mahlzeit</span><select id="po-meal">${MEALS.map((x) => `<option value="${x.id}" ${(existing?.meal || meal) === x.id ? 'selected' : ''}>${x.name}</option>`).join('')}</select></label>
     </div>
     <div class="quick">${item.portion ? `<button class="btn btn-small" data-g="${item.portion.grams}">${esc(item.portion.name)} (${item.portion.grams} g)</button>` : ''}${[50, 100, 150, 200, 250].map((g) => `<button class="btn btn-small" data-g="${g}">${g} g</button>`).join('')}${item.portion ? `<button class="btn btn-small" data-g="${item.portion.grams * 2}">2 × ${esc(item.portion.name)}</button>` : ''}</div>
     <div class="portion-preview" id="po-preview"></div>
     <div class="row ${existing ? 'between' : 'end'} gap">${existing ? '<button class="btn btn-danger btn-small" id="po-delete">Löschen</button>' : ''}<button class="btn btn-primary" id="po-save">${existing ? 'Speichern' : 'Hinzufügen'}</button></div>`,
    { title: existing ? 'Eintrag bearbeiten' : 'Portion' },
  );
  const gramsInput = m.querySelector('#po-grams');
  const preview = () => {
    const g = num(gramsInput.value);
    const mac = macrosFor(item.per100, g);
    m.querySelector('#po-preview').innerHTML = `<div><span>kcal</span><strong>${mac.kcal}</strong></div><div><span>Protein</span><strong>${mac.protein}</strong></div><div><span>KH</span><strong>${mac.carbs}</strong></div><div><span>Fett</span><strong>${mac.fat}</strong></div>`;
  };
  gramsInput.addEventListener('input', preview);
  m.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => {
    gramsInput.value = b.dataset.g;
    preview();
  }));
  m.querySelector('#po-fav').addEventListener('click', (e) => {
    store.update((st) => {
      const i = st.favorites.findIndex((f) => f.key === item.key);
      if (i >= 0) st.favorites.splice(i, 1);
      else st.favorites.unshift(item);
    }, { silent: true });
    e.currentTarget.classList.toggle('on');
  });
  m.querySelector('#po-delete')?.addEventListener('click', () => {
    store.update((st) => {
      st.foodLog[date] = (st.foodLog[date] || []).filter((x) => x.id !== existing.id);
    });
    closeModal();
    toast('Eintrag gelöscht.');
    onDone?.();
  });
  m.querySelector('#po-save').addEventListener('click', () => {
    const g = num(gramsInput.value);
    if (!g || g <= 0) return toast('Bitte eine Menge angeben.', 'warn');
    const mealId = m.querySelector('#po-meal').value;
    store.update((st) => {
      st.foodLog[date] ||= [];
      if (existing) {
        const e = st.foodLog[date].find((x) => x.id === existing.id);
        if (e) Object.assign(e, { grams: g, meal: mealId });
      } else {
        st.foodLog[date].push({ id: uid(), meal: mealId, key: item.key, name: item.name, brand: item.brand || '', grams: g, per100: { ...item.per100 }, source: item.source, barcode: item.barcode || null, at: new Date().toISOString() });
      }
      st.recents = [{ ...item, portion: { name: 'zuletzt', grams: g } }, ...st.recents.filter((r) => r.key !== item.key)].slice(0, 30);
    });
    closeModal();
    toast(existing ? 'Gespeichert.' : `${item.name} hinzugefügt.`, 'ok');
    onDone?.();
  });
  preview();
  gramsInput.focus();
  gramsInput.select();
}

export function openCustomFood(existing, onSaved) {
  const c = existing || {};
  const m = openModal(
    `<form id="cf-form" class="form">
      <label class="field"><span>Name</span><input id="cf-name" value="${esc(c.name || '')}" required></label>
      <div class="grid2">
        <label class="field"><span>Marke (optional)</span><input id="cf-brand" value="${esc(c.brand || '')}"></label>
        <label class="field"><span>Barcode (optional)</span><input id="cf-barcode" inputmode="numeric" value="${esc(c.barcode || '')}"></label>
      </div>
      <p class="muted small">Nährwerte je 100 g / 100 ml (von der Packung):</p>
      <div class="grid2">
        <label class="field"><span>kcal</span><input id="cf-kcal" type="number" inputmode="decimal" min="0" value="${c.per100?.kcal ?? ''}" required></label>
        <label class="field"><span>Protein (g)</span><input id="cf-protein" type="number" inputmode="decimal" min="0" step="0.1" value="${c.per100?.protein ?? ''}"></label>
        <label class="field"><span>Kohlenhydrate (g)</span><input id="cf-carbs" type="number" inputmode="decimal" min="0" step="0.1" value="${c.per100?.carbs ?? ''}"></label>
        <label class="field"><span>Fett (g)</span><input id="cf-fat" type="number" inputmode="decimal" min="0" step="0.1" value="${c.per100?.fat ?? ''}"></label>
        <label class="field"><span>Ballaststoffe (g)</span><input id="cf-fiber" type="number" inputmode="decimal" min="0" step="0.1" value="${c.per100?.fiber ?? ''}"></label>
        <label class="field"><span>Portion (g, optional)</span><input id="cf-portion" type="number" inputmode="decimal" min="1" value="${c.portion?.grams ?? ''}"></label>
      </div>
      <div class="row ${existing?.id ? 'between' : 'end'} gap">${existing?.id ? '<button type="button" class="btn btn-danger btn-small" id="cf-delete">Löschen</button>' : ''}<button class="btn btn-primary" type="submit">Speichern</button></div>
    </form>`,
    { title: existing?.id ? 'Lebensmittel bearbeiten' : 'Eigenes Lebensmittel' },
  );
  m.querySelector('#cf-delete')?.addEventListener('click', async () => {
    if (await confirmDialog('Lebensmittel löschen? Bestehende Tagebucheinträge bleiben erhalten.', { ok: 'Löschen', danger: true })) {
      store.update((st) => (st.customFoods = st.customFoods.filter((x) => x.id !== existing.id)));
      closeModal();
    }
  });
  m.querySelector('#cf-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const g = (id) => num(m.querySelector(id).value);
    const item = {
      id: existing?.id || uid(),
      name: m.querySelector('#cf-name').value.trim(),
      brand: m.querySelector('#cf-brand').value.trim(),
      barcode: m.querySelector('#cf-barcode').value.trim() || null,
      per100: { kcal: g('#cf-kcal'), protein: g('#cf-protein'), carbs: g('#cf-carbs'), fat: g('#cf-fat'), fiber: g('#cf-fiber') },
      portion: g('#cf-portion') > 0 ? { name: 'Portion', grams: g('#cf-portion') } : null,
    };
    if (!item.name) return toast('Bitte einen Namen angeben.', 'warn');
    store.update((st) => {
      const i = st.customFoods.findIndex((x) => x.id === item.id);
      if (i >= 0) st.customFoods[i] = item;
      else st.customFoods.unshift(item);
    });
    closeModal();
    toast('Lebensmittel gespeichert.', 'ok');
    onSaved?.(item);
  });
}

export function openRecipe(existing, onSaved) {
  const rc = existing ? JSON.parse(JSON.stringify(existing)) : { id: uid(), name: '', servings: 4, items: [] };
  const m = openModal(
    `<div class="form">
      <div class="grid2">
        <label class="field"><span>Name</span><input id="rc-name" value="${esc(rc.name)}"></label>
        <label class="field"><span>Portionen</span><input id="rc-servings" type="number" min="1" value="${rc.servings}"></label>
      </div>
      <label class="field"><span>Zutat suchen</span><input id="rc-q" class="search" placeholder="z. B. Reis, Hähnchen…" autocomplete="off"></label>
      <ul class="food-list" id="rc-results" style="max-height:30vh"></ul>
      <h3>Zutaten</h3>
      <div id="rc-items"></div>
      <div class="portion-preview" id="rc-preview"></div>
      <div class="row ${existing ? 'between' : 'end'} gap">${existing ? '<button class="btn btn-danger btn-small" id="rc-delete">Löschen</button>' : ''}<button class="btn btn-primary" id="rc-save">Rezept speichern</button></div>
    </div>`,
    { title: existing ? 'Rezept bearbeiten' : 'Rezept anlegen' },
  );
  const renderItems = () => {
    const box = m.querySelector('#rc-items');
    box.innerHTML = rc.items.length ? rc.items.map((it, i) => `<div class="ingredient-row"><span>${esc(it.name)}<div class="muted small">${macrosFor(it.per100, it.grams).kcal} kcal</div></span><input type="number" min="1" value="${it.grams}" data-ri="${i}" aria-label="Gramm"><button class="btn-icon" data-rm="${i}" aria-label="Entfernen">✕</button></div>`).join('') : '<p class="muted small">Noch keine Zutaten.</p>';
    box.querySelectorAll('[data-ri]').forEach((inp) => inp.addEventListener('change', () => {
      rc.items[Number(inp.dataset.ri)].grams = num(inp.value);
      renderItems();
    }));
    box.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => {
      rc.items.splice(Number(b.dataset.rm), 1);
      renderItems();
    }));
    const t = recipeTotals(rc.items);
    const servings = Math.max(1, num(m.querySelector('#rc-servings').value, 1));
    const per = macrosFor(t.per100, t.totalGrams / servings);
    m.querySelector('#rc-preview').innerHTML = `<div><span>pro Portion</span><strong>${per.kcal}</strong></div><div><span>Protein</span><strong>${per.protein}</strong></div><div><span>KH</span><strong>${per.carbs}</strong></div><div><span>Fett</span><strong>${per.fat}</strong></div>`;
  };
  const q = m.querySelector('#rc-q');
  q.addEventListener('input', () => {
    const s = store.get();
    const text = q.value.trim();
    const res = m.querySelector('#rc-results');
    if (!text) return (res.innerHTML = '');
    const items = searchLocal(text, { custom: s.customFoods }, 12);
    res.innerHTML = items.map((it, i) => `<li><button class="link" data-add="${i}"><span><strong>${esc(it.name)}</strong><div class="muted small">${esc(it.brand || '')}</div></span><span class="food-kcal">${it.per100.kcal} kcal/100 g</span></button></li>`).join('');
    res.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
      const it = items[Number(b.dataset.add)];
      rc.items.push({ name: it.name, grams: it.portion?.grams || 100, per100: { ...it.per100 } });
      q.value = '';
      res.innerHTML = '';
      renderItems();
    }));
  });
  m.querySelector('#rc-servings').addEventListener('input', renderItems);
  m.querySelector('#rc-delete')?.addEventListener('click', async () => {
    if (await confirmDialog('Rezept löschen?', { ok: 'Löschen', danger: true })) {
      store.update((st) => (st.recipes = st.recipes.filter((x) => x.id !== rc.id)));
      closeModal();
    }
  });
  m.querySelector('#rc-save').addEventListener('click', () => {
    rc.name = m.querySelector('#rc-name').value.trim();
    rc.servings = Math.max(1, num(m.querySelector('#rc-servings').value, 1));
    if (!rc.name) return toast('Bitte einen Namen angeben.', 'warn');
    if (!rc.items.length) return toast('Bitte mindestens eine Zutat hinzufügen.', 'warn');
    const t = recipeTotals(rc.items);
    rc.per100 = t.per100;
    rc.totalGrams = t.totalGrams;
    store.update((st) => {
      const i = st.recipes.findIndex((x) => x.id === rc.id);
      if (i >= 0) st.recipes[i] = rc;
      else st.recipes.unshift(rc);
    });
    closeModal();
    toast('Rezept gespeichert.', 'ok');
    onSaved?.(rc);
  });
  renderItems();
}

// Barcode: native BarcodeDetector, sonst ZXing (online), sonst manuelle Eingabe.
export function openBarcodeScanner(onCode) {
  let stream = null;
  let running = true;
  let zxing = null;
  const stop = () => {
    running = false;
    try {
      zxing?.stop?.();
    } catch { /* ignorieren */ }
    stream?.getTracks().forEach((t) => t.stop());
  };
  const m = openModal(
    `<video id="bc-video" class="bc-video" autoplay playsinline muted></video>
     <p class="muted small" id="bc-status">Kamera wird gestartet…</p>
     <form id="bc-manual" class="row gap"><input id="bc-code" inputmode="numeric" placeholder="Barcode manuell eingeben" aria-label="Barcode"><button class="btn">Suchen</button></form>`,
    { title: 'Barcode scannen', onClose: stop },
  );
  const status = m.querySelector('#bc-status');
  const video = m.querySelector('#bc-video');
  const found = (code) => {
    if (!running) return;
    stop();
    closeModal();
    onCode(String(code).trim());
  };
  m.querySelector('#bc-manual').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = m.querySelector('#bc-code').value.trim();
    if (code) found(code);
  });
  (async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Keine Kamera verfügbar');
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = stream;
      await video.play();
      if ('BarcodeDetector' in window) {
        const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
        status.textContent = 'Barcode vor die Kamera halten.';
        const loop = async () => {
          if (!running) return;
          try {
            const codes = await det.detect(video);
            if (codes.length) return found(codes[0].rawValue);
          } catch { /* Frame übersprungen */ }
          setTimeout(loop, 250);
        };
        loop();
      } else {
        status.textContent = 'Lade Scanner…';
        const mod = await import('https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm');
        const reader = new mod.BrowserMultiFormatReader();
        status.textContent = 'Barcode vor die Kamera halten.';
        zxing = await reader.decodeFromVideoElement(video, (result) => {
          if (result) found(result.getText());
        });
      }
    } catch (err) {
      status.textContent = `Kamera-Scan nicht verfügbar (${err.message}). Barcode unten eingeben.`;
      video.hidden = true;
    }
  })();
}

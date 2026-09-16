# LMCI – dein eigener Trainingsplan, ohne Abo

LMCI ist eine persönliche Trainings-App nach dem Vorbild von „MCI – Personal Training AI“, aber **ohne Abo, ohne Konto und ohne Server**. Sie erstellt aus deinen Angaben einen individuellen Plan für Kraft, Cardio, Mobilität und Ernährung, passt ihn Woche für Woche an dein Feedback an und läuft komplett auf deinem Gerät (Handy, Tablet oder PC).

Alle Regeln sind bewusst einfach, nachvollziehbar und aus der Trainingswissenschaft abgeleitet (siehe unten).

## Was die App kann

- **Onboarding in 5 Schritten:** Ziel (Muskelaufbau, Fettabbau, Kraft, Ausdauer, Fitness), Erfahrung, Trainingstage, Dauer, Ausrüstung (Studio oder Zuhause mit dem, was du hast), Beschwerden, Cardio-Vorlieben, Muskel-Schwerpunkte.
- **Kraftplan als Mesozyklus:** 4 Aufbauwochen + 1 Deload-Woche. Split je nach Tagen (Ganzkörper, Ober-/Unterkörper, Push/Pull/Beine), Volumen pro Muskel nach Erfahrung, Wiederholungsbereiche nach Ziel, RIR-Steuerung pro Woche, Zeitbudget pro Einheit.
- **Trainings-Logging:** Sätze mit Gewicht, Wiederholungen und RIR eintragen, Pausentimer mit Ton/Vibration, Scheibenrechner, Technik-Hinweise, Übungen tauschen oder ergänzen.
- **Progression:** Doppelte Progression (erst Wiederholungen, dann Gewicht), Deload-Vorgaben, Rückstufung nach zwei verfehlten Einheiten.
- **Autoregulation:** Nach jeder Einheit kurzes Feedback (Anstrengung, Erholung, Leistung) – daraus wird das Volumen des Trainingstags um ±1 Satz pro Übung angepasst. Der nächste Mesozyklus übernimmt das gedämpft und rotiert Übungen.
- **Cardio:** Einheiten nach Ziel (Zone 2, Intervalle, lange Einheit, Tempo) mit Wochenprogression und persönlichen Pulszonen (Tanaka / Karvonen).
- **Mobilität:** 10-Minuten-Routinen für Unterkörper-, Oberkörper- und Ruhetage, abgestimmt auf Beschwerden.
- **Ernährung:** Grundumsatz, Gesamtumsatz, Zielkalorien, Makros, Wasser, Ballaststoffe – plus Gewichtstrend mit konkreten Anpassungsempfehlungen.
- **Fortschritt:** Wochenvolumen je Muskel vs. Ziel, Sätze und Cardio-Minuten pro Woche, geschätztes 1RM je Übung, Körpergewicht mit 7-Tage-Schnitt, Bestleistungen, Trainingshistorie.
- **Daten gehören dir:** Alles liegt im Browser (localStorage). Export/Import als JSON-Sicherung.
- **PWA:** Auf dem Handy installierbar, offline nutzbar.

## Nutzen

### Variante A – online (empfohlen)

1. Im Repository **Settings → Pages → Source: „GitHub Actions“** wählen (einmalig).
2. Den Workflow „Auf GitHub Pages veröffentlichen“ laufen lassen (automatisch bei Push auf `main`, oder unter *Actions* manuell starten).
3. Die App ist dann unter `https://<dein-github-name>.github.io/LMCI/` erreichbar.
4. Auf dem Handy öffnen und **zum Home-Bildschirm hinzufügen** (iPhone: Teilen → „Zum Home-Bildschirm“; Android: Menü → „App installieren“).

### Variante B – Einzeldatei

`dist/lmci.html` ist die komplette App in einer Datei. Herunterladen, im Browser öffnen, fertig – auch ohne Internet. (Die Schriftarten werden nur online geladen; offline nutzt die App die Systemschrift.)

### Variante C – lokal entwickeln

```bash
npm start          # startet einen lokalen Server auf http://localhost:4173
npm test           # Unit-Tests für die Trainings-Engine
npm run build:single   # baut dist/lmci.html neu (benötigt: npm install)
npm run icons      # erzeugt die App-Icons neu
```

Kein Build nötig: `index.html` lädt die ES-Module direkt.

> **Wichtig:** Die Daten sind an die Adresse und den Browser gebunden. Vor einem Handywechsel unter *Mehr → Sicherung exportieren* eine Kopie ziehen.

## Wie der Plan entsteht (Kurzfassung)

| Baustein | Regel | Quelle |
| --- | --- | --- |
| Split | 2–3 Tage Ganzkörper, 4 Tage Ober/Unter, 5 Tage Ober/Unter + Push/Pull/Beine, 6 Tage PPL×2 – jeder Muskel mind. 2×/Woche | Schoenfeld et al. 2016 (Frequenz) |
| Volumen | Basis 10 / 14 / 16 harte Sätze pro Muskel und Woche (Anfänger / Fortgeschritten / Erfahren), skaliert nach Ziel, Muskel, Prioritäten und Trainingstagen; Nebenmuskeln zählen halb | Schoenfeld et al. 2017, Baz-Valle et al. 2022 |
| Intensität | Grundübungen 6–10, Zusatzübungen 8–12, Isolation 10–15 Wdh.; Kraftziel 3–5 Wdh. bei Hauptübungen; RIR 3 → 2 → 1 → 0–1, Deload 4+ | Schoenfeld et al. 2017 (Last), Refalo et al. 2023 (Nähe zum Versagen) |
| Pausen | 2–3 min bei Grundübungen, 75–105 s bei Isolation | Schoenfeld et al. 2016 |
| Progression | Doppelte Progression; Deload jede 5. Woche mit halben Sätzen und −10 % Gewicht | Helms, Israetel u. a. |
| Autoregulation | Erholung gut + Leistung stabil → +1 Satz/Übung; nicht erholt oder Leistung schlechter bei sehr hoher Anstrengung → −1 | RP-Prinzip MEV/MAV/MRV |
| Cardio | Zone 2 als Basis, Intervalle für VO₂max; nach dem Krafttraining oder an anderen Tagen | WHO 2020, Schumann et al. 2022 |
| Pulszonen | HFmax = 208 − 0,7 × Alter; mit Ruhepuls nach Karvonen | Tanaka et al. 2001 |
| Ernährung | Mifflin-St Jeor + Aktivitätsfaktor + Trainingsenergie; Protein 1,6–2,2 g/kg; Fett ≥ 0,7 g/kg; Muskelaufbau +150–300 kcal, Fettabbau −20 % (max. −600) | Mifflin et al. 1990, Morton et al. 2018, Helms et al. 2014 |
| Gewichtstrend | 7-Tage-Schnitt; erwartet +0,1–0,5 %/Woche (Aufbau) bzw. −0,5–1 %/Woche (Fettabbau); sonst ±150 kcal | Helms et al. 2014 |

Die App ersetzt keine ärztliche oder physiotherapeutische Beratung.

## Aufbau des Codes

```
index.html, styles.css        App-Shell und Gestaltung (hell/dunkel)
manifest.webmanifest, sw.js   PWA (Installation, Offline-Cache)
src/app.js                    Router und Start
src/state.js                  Zustand, Speicherung, Export/Import
src/data/exercises.js         83 Übungen mit Muskeln, Ausrüstung, Kontraindikationen, Technik-Hinweisen
src/data/mobility.js          Mobilitätsübungen
src/engine/plan.js            Plangenerator (Split, Volumen, Übungswahl, Zeitbudget, Deload, RIR)
src/engine/progression.js     Doppelte Progression, Autoregulation, Scheibenrechner
src/engine/cardio.js          Pulszonen, Cardio-Planung
src/engine/nutrition.js       Kalorien, Makros, Gewichtstrend
src/engine/analytics.js       Auswertungen (Volumen, 1RM, Rekorde, Konstanz)
src/ui/*.js                   Ansichten: Onboarding, Heute, Plan, Training, Fortschritt, Ernährung, Mehr
tests/engine.test.js          Unit-Tests (node --test)
scripts/                      Icon-Generator, Einzeldatei-Build
.github/workflows/pages.yml   Tests + Veröffentlichung auf GitHub Pages
```

Die Engine ist reines JavaScript ohne Abhängigkeiten und lässt sich leicht anpassen – z. B. eigene Übungen in `src/data/exercises.js` ergänzen oder die Volumenziele in `src/engine/plan.js` verschieben.

## Lizenz

MIT

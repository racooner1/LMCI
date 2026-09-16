# LMCI – dein eigener Trainingsplan, ohne Abo

LMCI ist eine persönliche Trainings-App nach dem Vorbild von „MCI – Personal Training AI“, aber **ohne Abo, ohne Konto und ohne Server**. Sie erstellt aus deinen Angaben einen individuellen Plan für Kraft, Cardio, Mobilität und Ernährung, passt ihn Woche für Woche an dein Feedback an und läuft komplett auf deinem Gerät (Handy, Tablet oder PC).

Alle Regeln sind bewusst einfach, nachvollziehbar und aus der Trainingswissenschaft abgeleitet (siehe unten).

## Was die App kann

**Training**
- Onboarding in 5 Schritten: Ziel (Muskelaufbau, Fettabbau, Kraft, Ausdauer, Fitness), Erfahrung, Zielgewicht, Trainingstage, Dauer, Ausrüstung (Studio oder Zuhause mit Kurzhanteln, Langhantel, Kettlebell, Bank, Klimmzugstange, Bändern, Schlingentrainer), Beschwerden, Cardio-Vorlieben aus 65 Aktivitäten, Muskel-Schwerpunkte.
- Kraftplan als Mesozyklus (4 Aufbauwochen + Deload): Split je nach Tagen, Volumen pro Muskel nach Erfahrung und Trainingsfrequenz, Wiederholungsbereiche nach Ziel, RIR-Steuerung pro Woche, Zeitbudget pro Einheit, Übungsrotation pro Block.
- 233 Übungen mit Technik-Hinweisen, Körperkarte, Alternativen und Technik-Videolinks; Bibliothek mit Suche und Filtern.
- Startgewichte werden aus Körpergewicht, Erfahrung, Geschlecht und Alter geschätzt; Aufwärmsätze werden automatisch berechnet.
- Trainings-Logging: Sätze mit Gewicht, Wiederholungen und RIR, Pausentimer mit Ton und Vibration, Scheibenrechner, Übungen tauschen, ergänzen und verschieben, freies Training ohne Plan.
- Kurzversion (20/30/45 min) und leichte Version, wenn Zeit oder Bereitschaft fehlen; verpasste Einheiten werden nachgeholt.
- Progression: doppelte Progression (erst Wiederholungen, dann Gewicht), Deload-Vorgaben, Rückstufung nach zwei verfehlten Einheiten.
- Autoregulation pro Muskel: nach jeder Einheit kurzes Feedback (Anstrengung, Leistung, welche Muskeln nicht erholt waren, wo mehr ging) – daraus ±1 Satz pro Übung. Der nächste Block übernimmt das gedämpft.
- Täglicher Check-in (Schlaf, Stress, Energie, Muskelkater) mit Bereitschafts-Score und Empfehlung.
- Cardio: Einheiten nach Ziel (Zone 2, Intervalle, lange Einheit, Tempo) mit Wochenprogression, persönlichen Pulszonen und Intervall-Timer.
- Mobilität: 10-Minuten-Routinen für Unterkörper-, Oberkörper- und Ruhetage, abgestimmt auf Beschwerden.

**Ernährung**
- Kalorien- und Makroziel aus Grundumsatz, Alltagsaktivität, Trainingsenergie und Ziel; manuell überschreibbar.
- Ernährungstagebuch mit Mahlzeiten, Portionen, Makro-Balken und Trinken.
- Offline-Basisliste mit 254 Lebensmitteln, Online-Suche und Barcode-Abfrage über Open Food Facts, Barcode-Scan per Kamera.
- Eigene Lebensmittel und Rezepte, Favoriten, Zuletzt-Liste, „Gestern kopieren“.
- Wochenrückblick: Ø Kalorien und Protein gegen Ziel, Gewichtstrend, konkrete Zielanpassung per Klick.
- Zielgewicht mit Fortschrittsbalken, realistischer Prognose und gesundem Tempo.

**Fortschritt & Motivation**
- Wochenvolumen je Muskel gegen Ziel, Sätze und Cardio-Minuten pro Woche, geschätztes 1RM je Übung, Körpergewicht mit 7-Tage-Schnitt, Körpermaße, Bestleistungen, Trainingshistorie.
- Kalender mit Training, Cardio, Ernährung und Check-ins; Tages-Streak; 16 Abzeichen.
- Erinnerungen an Trainingstagen (bei geöffneter App) und Kalender-Export (.ics) für zuverlässige Termine.

**Optional: KI-Coach**
- Fragen zu Plan, Fortschritt und Ernährung an einen Coach, der deinen Plan, deine Logs und dein Tagebuch kennt. Läuft über die Anthropic-API mit **deinem eigenen API-Schlüssel** (Abrechnung pro Anfrage, wenige Cent, kein Abo). Schlüssel bleibt im Browser und wird nicht exportiert.

**Daten gehören dir:** Alles liegt im Browser (localStorage). Export/Import als JSON-Sicherung. PWA: auf dem Handy installierbar, offline nutzbar.

## Nutzen

### Variante A – online (empfohlen)

1. Im Repository **Settings → Pages → Source: „GitHub Actions“** wählen (einmalig).
2. Den Workflow „Auf GitHub Pages veröffentlichen“ laufen lassen (automatisch bei Push auf `main`, oder unter *Actions* manuell starten).
3. Die App ist dann unter `https://<dein-github-name>.github.io/LMCI/` erreichbar.
4. Auf dem Handy öffnen und **zum Home-Bildschirm hinzufügen** (iPhone: Teilen → „Zum Home-Bildschirm“; Android: Menü → „App installieren“).

Online-Suche in Open Food Facts, Barcode-Scan und KI-Coach brauchen Internet; alles andere funktioniert offline.

### Variante B – Einzeldatei

`dist/lmci.html` ist die komplette App in einer Datei. Herunterladen, im Browser öffnen, fertig. (Schriftarten werden nur online geladen; offline nutzt die App die Systemschrift.)

### Variante C – lokal entwickeln

```bash
npm start              # lokaler Server auf http://localhost:4173
npm test               # Unit-Tests für die Engine
npm install            # einmalig, für die Build-Skripte
npm run build:single   # baut dist/lmci.html neu
npm run build:vendor   # bündelt das Anthropic-SDK für den Coach neu (vendor/anthropic-sdk.js)
npm run icons          # erzeugt die App-Icons neu
```

Kein Build nötig: `index.html` lädt die ES-Module direkt.

> **Wichtig:** Die Daten sind an die Adresse und den Browser gebunden. Vor einem Handywechsel unter *Mehr → Sicherung exportieren* eine Kopie ziehen.

### KI-Coach einrichten

1. Auf [console.anthropic.com](https://console.anthropic.com) einen API-Schlüssel erstellen.
2. In LMCI unter *Mehr → KI-Coach → Schlüssel & Modell* eintragen. Standardmodell ist Claude Opus 5; Sonnet 5 und Haiku 4.5 sind günstigere Alternativen.
3. Unter *Coach* Fragen stellen oder Vorlagen nutzen (Wochen-Review, Planprüfung, Ernährung, Motivation).

## Wie der Plan entsteht (Kurzfassung)

| Baustein | Regel | Quelle |
| --- | --- | --- |
| Split | 2–3 Tage Ganzkörper, 4 Tage Ober/Unter, 5 Tage Ober/Unter + Push/Pull/Beine, 6 Tage PPL×2 – jeder Muskel mind. 2×/Woche | Schoenfeld et al. 2016 (Frequenz) |
| Volumen | Basis 10 / 14 / 16 harte Sätze pro Muskel und Woche (Anfänger / Fortgeschritten / Erfahren), skaliert nach Ziel, Muskel, Prioritäten und Trainingstagen; Nebenmuskeln zählen halb | Schoenfeld et al. 2017, Baz-Valle et al. 2022 |
| Intensität | Grundübungen 6–10, Zusatzübungen 8–12, Isolation 10–15 Wdh.; Kraftziel 3–5 Wdh. bei Hauptübungen; RIR 3 → 2 → 1 → 0–1, Deload 4+ | Schoenfeld et al. 2017 (Last), Refalo et al. 2023 (Nähe zum Versagen) |
| Pausen | 2–3 min bei Grundübungen, 75–105 s bei Isolation | Schoenfeld et al. 2016 |
| Startgewichte | 1RM-Verhältnis zum Körpergewicht je Übung, skaliert nach Erfahrung, Geschlecht, Alter; Arbeitsgewicht über Epley für Wiederholungen + RIR | Praxiswerte, Epley 1985 |
| Progression | Doppelte Progression; Deload jede 5. Woche mit halben Sätzen und −10 % Gewicht | Helms, Israetel u. a. |
| Autoregulation | Muskel nicht erholt → −1 Satz; „mehr vertragen“ → +1 Satz; Check-in steuert leichte Tage | RP-Prinzip MEV/MAV/MRV |
| Cardio | Zone 2 als Basis, Intervalle für VO₂max; Kalorien über MET-Werte | WHO 2020, Schumann et al. 2022, Ainsworth et al. 2011 |
| Pulszonen | HFmax = 208 − 0,7 × Alter; mit Ruhepuls nach Karvonen | Tanaka et al. 2001 |
| Ernährung | Mifflin-St Jeor + Aktivitätsfaktor + Trainingsenergie; Protein 1,6–2,2 g/kg; Fett ≥ 0,7 g/kg; Muskelaufbau +150–300 kcal, Fettabbau −20 % (max. −600) | Mifflin et al. 1990, Morton et al. 2018, Helms et al. 2014 |
| Gewichtstrend | 7-Tage-Schnitt; erwartet +0,1–0,5 %/Woche (Aufbau) bzw. −0,5–1 %/Woche (Fettabbau); Wochenrückblick schlägt ±150 kcal vor | Helms et al. 2014 |

Die App ersetzt keine ärztliche oder physiotherapeutische Beratung.

## Was LMCI bewusst nicht nachbaut

- 3D-Animationen der Übungen (lizenzierte Assets) – stattdessen Körperkarte, Technik-Hinweise und Videolinks.
- Schrittzähler und Pulsdaten aus Apple Health / Health Connect – eine Web-App hat darauf keinen Zugriff. Dafür wäre eine native Hülle (z. B. Capacitor) nötig.
- Community und menschliches Coaching – ersetzt durch den optionalen KI-Coach.
- Echte Push-Erinnerungen – die App erinnert bei geöffneter App und exportiert Trainingstage als Kalenderdatei.

## Aufbau des Codes

```
index.html, styles.css        App-Shell und Gestaltung (hell/dunkel)
manifest.webmanifest, sw.js   PWA (Installation, Offline-Cache)
src/app.js                    Router, Start, Erinnerungsschleife
src/state.js                  Zustand, Speicherung, Export/Import
src/data/exercises.js         233 Übungen (Muskeln, Ausrüstung, Kontraindikationen, 1RM-Verhältnis, Technik)
src/data/mobility.js          Mobilitätsübungen
src/data/foods.js             254 Basis-Lebensmittel
src/engine/plan.js            Plangenerator, Startgewichte, Aufwärmsätze, Kurzversion, nächste Einheit
src/engine/progression.js     Doppelte Progression, Autoregulation pro Muskel, Scheibenrechner
src/engine/recovery.js        Check-in → Bereitschaft
src/engine/cardio.js          65 Aktivitäten mit MET, Pulszonen, Cardio-Planung
src/engine/nutrition.js       Kalorien, Makros, Gewichtstrend
src/engine/food.js            Tagebuch-Makros, Suche, Open Food Facts, Rezepte, Wochenrückblick
src/engine/analytics.js       Auswertungen (Volumen, 1RM, Rekorde, Konstanz)
src/engine/achievements.js    Streaks, Abzeichen, Zielgewicht-Prognose
src/engine/reminders.js       Erinnerungen, iCalendar-Export
src/ui/*.js                   Ansichten: Onboarding, Heute, Plan, Training, Übungen, Fortschritt, Kalender, Ernährung, Coach, Mehr
src/ui/foodpicker.js          Lebensmittel-Auswahl, Portionen, eigene Lebensmittel, Rezepte, Barcode
src/ui/bodymap.js, timer.js   Körperkarte, Intervall-Timer
vendor/anthropic-sdk.js       Gebündeltes Anthropic-SDK (nur für den Coach, wird bei Bedarf geladen)
tests/*.test.js               Unit-Tests (node --test)
scripts/                      Icon-Generator, Einzeldatei-Build, SDK-Bündelung
.github/workflows/pages.yml   Tests + Veröffentlichung auf GitHub Pages
```

Die Engine ist reines JavaScript ohne Laufzeit-Abhängigkeiten und lässt sich leicht anpassen – z. B. eigene Übungen in `src/data/exercises.js` ergänzen oder die Volumenziele in `src/engine/plan.js` verschieben.

## Lizenz

MIT

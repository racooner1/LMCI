# Sportwissenschaftlicher Review: Trainingsmethoden, Cardio und Ernährung in LMCI

Stand: Branch `claude/mci-training-app-no-subscription-v5zglx`, Commit `c9d372d` (16.09.2026).
Geprüft wurden die Engine (`src/engine/*`), die Übungsdatenbank, das Onboarding, der Coach-Prompt und die Stellen im UI, an denen die Regeln angewendet werden. Alle Zahlen unten stammen aus tatsächlich generierten Plänen (Simulation über `generatePlan`, `computeNutrition`, `suggestNext`), nicht aus dem README.

## Status der Umsetzung

Alle Befunde dieses Reviews sind im Folge-Commit auf demselben Branch umgesetzt (Version 1.5.0). Die Tests in `tests/engine.test.js` (Abschnitt „Review-Umsetzung“) stellen die Simulationen aus dem Review nach; die Suite umfasst 50 Tests.

| Befund | Umsetzung |
| --- | --- |
| 1 Machbarkeit Körpergewicht | `isFeasibleFor` in `plan.js` prüft geschätzte Wiederholungen ≥ Untergrenze und Startgewicht ≥ Stange; Notnagel wählt die am wenigsten unmachbare Übung. 25 schwere Übungen haben eigene Bereiche (`reps` in `exercises.js`). Schnelltraining nutzt dasselbe Gate. |
| 2 Gesundheits-Screening | `engine/health.js` mit 8 PAR-Q+-Fragen im Onboarding (Schritt 4). Bei „Ja“: keine Intervalle, RIR ≥ 2, keine 3–5er-Sätze, Plan-Notiz, Toast. Schwangerschaft: Kontraindikation für 24 Übungen, kein Defizit. |
| 3 RIR 0 auf schweren Grundübungen | `rirForExercise`: Langhantel-Hinge/Squat Tier 1 nie unter RIR 1. 3–5 Wdh. nur bei Langhantel-Hauptübungen in squat/hpush/hinge/vpush. |
| 4 Rückenkategorie | Superman → Rumpf (`bauch`), Rack Pull → Beinbeuger; Pattern-Fallback vpull → hpull mit Plan-Notiz. |
| 5 Kraft-Rotation | Hauptübungen rotieren beim Kraftziel nicht mehr. |
| 6 Progression | Häufigstes Gewicht statt Satz 1; RIR ≥ Ziel + 2 → steigern; Obergrenze ohne Reserve → halten mit korrekter Meldung; Anfänger linear an Tier 1; e1RM mit Reserve. |
| 7 Anfänger | Block 6 + 1 Wochen, RIR 3/3/3/2/2/2; lineare Progression; Cardio-Progression auf Blocklänge. |
| 8 Autoregulation | `muscleAdjust` ist ein Wochen-Satzdelta, verteilt über `adjustmentFor`; Deckel max(2, 30 % Ziel); kein Plus bei niedriger Bereitschaft; Blockwechsel halbiert; Check-in-Muskelkater → heute −1 Satz. |
| 9 Arme/Schultern | Direkte Mindestsätze (2/3/4/6 je nach Tagen) vor dem Greedy; Schulterdrücken zählt für Schultern 0,5; Frequenzfaktor 6 Tage 1,15. |
| 10 Trendfenster | `weightTrend` standardmäßig 28 Tage, in allen Ansichten und im Coach. |
| 11 Ernährung | `currentWeight` (7-Tage-Mittel) in `dailyTargets`; Fett ≥ 0,8 g/kg (Frauen 1,0); Protein-Referenz Zielgewicht; Abnahmerate −0,25…−0,7 % bei BMI < 22 oder kurz vor dem Ziel; Cardio-kcal netto (MET − 1). |
| 12 Cardio | Vorlagen Schwelle (Zone 4, 3–5 × 3 min) und VO₂max (Zone 5, 4 × 4); Wochentage über `assignCardioWeekdays`; Ausdauer-Default 4 Einheiten; Cardio-Tage in Tageszielen, Heute, Kalender, Erinnerungen, ICS. |
| 13 Startgewichte | Geschlechtsfaktor nach Körperregion; Hinweis und Alternative, wenn der Rechenwert unter der Stange liegt; Stangengewicht 10/15/20 kg wählbar. |
| 14 Deload | Halbe Sätze, Gewicht halten (kein −10 %). |
| 15 Coach | Kontext mit Einschränkungen, Screening-Flags, aktuellem Gewicht und Cardio-Tagen; Systemprompt mit Warnzeichen-Regel. |
| 16 Gamification | „Nachteule“ und „Doppelschicht“ ersetzt durch „Ausgeschlafen“ und „Deload durchgezogen“. |
| 17 Kleinigkeiten | Kreuzheben-Aufwärmen ab 40 kg ohne leere Stange; HFmax manuell im Profil, Streuungshinweis; Timer für lange Intervalle mit 10 min Einlaufen. |

Nicht umgesetzt: eine eigene Muskelgruppe „unterer Rücken“ (hätte Körperkarte, Abzeichen und Volumenziele mitgezogen; die Umklassifizierung von Superman und Rack Pull löst das eigentliche Problem) und der responsive Deload für Anfänger (der längere Block deckt den Fall ab). Shrugs bleiben als oberer Rücken klassifiziert.

## Kurzfassung

Das Fundament ist solide. Split, Frequenz, Volumenbereiche, Wiederholungsbereiche, Pausen, RIR-Verlauf, doppelte Progression, Deload, Ernährungsformeln und der Gewichtstrend liegen im Rahmen der aktuellen Evidenz und sind sauber umgesetzt. Die Tests laufen durch (40/40).

Die wesentlichen Probleme liegen nicht in den Parametern, sondern darin, **wie die Regeln auf einzelne Nutzer treffen**:

1. Die Übungsauswahl prüft nicht, ob eine Körpergewichtsübung für die Person machbar ist. Anfänger bekommen Pistol Squats, Handstand-Liegestütze, Nordic Curls und 4×8–12 Klimmzüge als Hauptübungen.
2. Es gibt kein Gesundheits-Screening. Ein 62-Jähriger mit Ziel „Ausdauer“ bekommt ohne Rückfrage HIIT-Intervalle in Zone 4 und RIR 0 in Woche 4.
3. Beim Ziel „Kraft“ ersetzt die Übungsrotation ab Block 2 die Langhantel-Grundübungen durch Beinpresse, Kurzhantel-Bankdrücken, Hackenschmidt und Multipresse, jeweils mit 5×3–5.
4. Ernährungsziele rechnen dauerhaft mit dem Onboarding-Gewicht, und der Gewichtstrend in Ernährung, Fortschritt und Coach läuft über die gesamte Historie statt über die letzten Wochen.
5. Die Progression nutzt die geloggten RIR-Werte nur zum Bremsen, nie zum Beschleunigen, und gibt in zwei Fällen eine unsinnige Empfehlung aus.

Die Befunde sind unten nach Priorität sortiert, jeweils mit Fundstelle, Begründung und konkretem Änderungsvorschlag. Am Ende steht eine Positivliste und eine empfohlene Reihenfolge.

---

## Bewertung der Bausteine gegen die Evidenz

| Baustein | Umsetzung in LMCI | Evidenz | Urteil |
| --- | --- | --- | --- |
| Frequenz / Split | 2–3 Tage Ganzkörper, 4 Ober/Unter, 5 OK/UK+PPL, 6 PPL×2; jeder Muskel ≥ 2×/Woche | Schoenfeld, Ogborn & Krieger 2016: ≥ 2×/Woche pro Muskel vorteilhaft bei gleichem Volumen | passt |
| Volumen | 10 / 14 / 16 harte Sätze × Muskelfaktor × Zielfaktor × Frequenzfaktor (0,9–1,25); Nebenmuskeln zählen halb | Schoenfeld et al. 2017: Dosis-Wirkung bis ≥ 10 Sätze; Baz-Valle et al. 2022: 12–20 Sätze pro Woche als sinnvoller Bereich, darüber flacher Zugewinn | passt; 6-Tage-Pläne für Erfahrene liegen mit 20–22 gezählten Sätzen für Quads/Rücken am oberen Rand |
| Wiederholungen | Grund 6–10, Zusatz 8–12, Isolation 10–15; Anfänger Grund 8–12; Kraft 3–5 / 5–8 / 6–10 / 8–12; Ausdauer 8–12 / 10–15 / 12–20 | Schoenfeld et al. 2017 (Last): Hypertrophie über ein breites Spektrum ähnlich; Kraft spezifisch bei schweren Lasten | passt |
| Nähe zum Versagen | RIR 3→3→2→2 (Anfänger), 3→2→1→1, 3→2→1→0; Deload RIR 4 | Refalo et al. 2023, Robinson et al. 2024: näher am Versagen etwas besser für Hypertrophie, für Kraft nicht nötig; RIR 0 erhöht Ermüdung und Verletzungsrisiko bei schweren Grundübungen | passt für Hypertrophie; RIR 0 auf Kreuzheben/Kniebeuge mit 3–5 Wdh. ist zu aggressiv (Befund 3) |
| Pausen | 150–180 s Grundübungen, 105 s Zusatz, 75 s Isolation | Schoenfeld et al. 2016 (JSCR), Grgic et al. 2018: ≥ 2 min bei Mehrgelenksübungen vorteilhaft | passt |
| Progression | Doppelte Progression, +1 Wdh. bis Obergrenze, dann +Inkrement; Rückstufung −8 % nach zwei Fehlversuchen | ACSM 2009 Position Stand; Praxisstandard | passt, aber RIR-Werte werden nicht genutzt (Befund 6); Anfänger könnten schneller steigern (Befund 7) |
| Mesozyklus / Deload | Fix 4 + 1 für alle; Deload = halbe Sätze, −10 % Last, RIR 4 | Bell et al. 2023 (Delphi-Konsens): Deloads alle 4–8 Wochen, primär Volumen senken; Coleman et al. 2024: bei Trainierten über 9 Wochen kein Nachteil ohne Deload | vertretbar; für Anfänger zu früh (Befund 7); dreifache Reduktion (Sätze, Last und RIR) ist mehr als nötig |
| Autoregulation | ±1 Satz pro Übung und Muskel nach Feedback, gedeckelt auf ±2 | RP-Prinzip MEV/MAV/MRV; RIR-basierte RPE nach Zourdos et al. 2016 | Idee gut, Schrittweite zu groß (Befund 8) |
| Startgewichte | 1RM-Verhältnis × Erfahrung (0,6 / 1,0 / 1,3) × Geschlecht (1,0 / 0,65 / 0,8) × Alter, Epley für reps + RIR | Praxiswerte, Epley 1985 | plausibel für Männer 70–90 kg; Untergrenze 20 kg macht bei Frauen alles gleich schwer (Befund 13) |
| Cardio | Zone 2 als Basis, Intervalle 60/90 s in Zone 4, lange Einheit, Tempo; +5 min/Woche; MET-Kalorien | WHO 2020: 150–300 min moderat; Schumann et al. 2022: Interferenz gering, wenn Cardio nicht direkt vor Beinen und Volumen moderat | passt; Intervall-Vorlage ist eher Schwellen- als HIIT-Training, Tage werden nicht geplant (Befund 12) |
| Pulszonen | HFmax = 208 − 0,7 × Alter; Zonen in 10-%-Schritten ab 50 %, mit Ruhepuls nach Karvonen | Tanaka et al. 2001 | passt; Hinweis auf ±10 Schläge Streuung fehlt |
| Ernährung | Mifflin-St Jeor + Aktivitätsfaktor + Trainingsenergie; Aufbau +150…300, Fettabbau −20 % (max. −600), Untergrenze 1300/1500; Protein 1,6–2,2 g/kg; Fett ≥ 0,7 g/kg; Faser 14 g/1000 kcal | Mifflin 1990; Morton et al. 2018; Helms et al. 2014; Iraki et al. 2019 | passt; Fett-Untergrenze für Frauen im Defizit eher 0,8–1,0 g/kg (Befund 11) |
| Gewichtstrend | 7-Tage-Mittel, Zielkorridor +0,1…0,5 % bzw. −0,5…1 %/Woche, ±150 kcal Stellschraube, erst ab 4 erfassten Tagen und 10 Tagen Trend | Helms et al. 2014; Garthe et al. 2011 (langsamer Verlust schont Muskelmasse) | Regeln passen; Zeitfenster falsch (Befund 10) |
| Check-in / Bereitschaft | Schlaf, Schlafqualität, Stress, Energie gleichgewichtet, Muskelkater als Modifikator | Praxis (Wellness-Fragebögen, Hooper-Index) | passt für den Zweck |
| Mobilität | 10 min, gezielt nach Einschränkungen | keine Kontraindikation | passt |

---

## Befunde nach Priorität

### Hoch: Sicherheit oder der Plan funktioniert für die Zielgruppe nicht

#### 1. Körpergewichtsübungen ohne Machbarkeitsprüfung

**Fundstelle:** `src/engine/plan.js:233-260` (`pickExercise`), Übungsreihenfolge in `src/data/exercises.js:36` (Pistol Squat vor Kniebeuge BW), `:65` (Nordic Curl), `:126` (Klimmzüge), `:174` (Handstand-Liegestütze), `:239-241` (Toes to Bar, Ab-Wheel).

**Was passiert:** Die Auswahl sortiert nach Tier und Listenposition. Ob die Person die Übung überhaupt im geplanten Wiederholungsbereich ausführen kann, wird nicht geprüft. Die Datenbank kennt zwar `bwReps` pro Erfahrungsstufe und `estimateStartReps` nutzt sie für den Hinweis in der Trainingsansicht, der Plangenerator ignoriert sie aber.

Simulation für einen Anfänger (Mann, 78 kg, 3 Tage, 45 min, nur Körpergewicht):

| Tag | Geplant | Geschätzt machbar |
| --- | --- | --- |
| A | Pistol Squat 4×8–12 (Hauptübung) | ≈ 2 Wdh. |
| A | Handstand-Liegestütze 2×8–12 | ≈ 1 Wdh. |
| A | Nordic Hamstring Curl 2×10–15 | ≈ 3 Wdh. |
| A | Ab-Wheel Rollouts 2×10–15 | ≈ 5 Wdh. |
| B | Superman 2×10–15 als Hauptübung „Rücken“ | siehe Befund 4 |

Im Studio bekommt derselbe Anfänger Klimmzüge 4×8–12 als Hauptübung (≈ 2 machbar) und Chin-ups 3×8–12. Für eine 62-kg-Anfängerin zuhause sind Pistol Squats (≈ 1 Wdh.), Handstand-Liegestütze und Liegestütze 3×8–12 (≈ 6 machbar) im Plan. Selbst „Fortgeschritten“ erhält Pistol Squats 4×8–12 bei ≈ 5 machbaren Wiederholungen.

**Warum das zählt:** Der Nutzer sieht in der ersten Einheit eine Übung, die er nicht kann. Das ist das Gegenteil von „Technik vor Gewicht“ und für Anfänger ein Abbruchgrund. Pistol Squats und Handstand-Liegestütze sind zudem Übungen mit relevantem Verletzungsrisiko für Ungeübte.

**Vorschlag:**
- In `pickExercise` Kandidaten mit `bwReps` filtern: `estimateStartReps(ex, profile) >= repMin` (oder ≥ repMin − 2, damit die Progression eine Zielzone hat). Erst wenn nichts übrig bleibt, Filter lockern.
- Für harte Übungen einen eigenen Wiederholungsbereich in der Datenbank erlauben (`reps: [3, 8]` für Nordic Curl, Pistol, HSPU, Toes to Bar, Dragon Flag), der `repRange` überschreibt. Sonst wird Nordic Curl 10–15 auch für Erfahrene nie erreichbar.
- Für Anfänger die Progressionsleitern bevorzugen: Kniebeuge BW → Split Squat → Bulgarian → Pistol; Liegestütze Knie → Liegestütze → erhöht → Archer; Pike → erhöhter Pike → HSPU; negative Klimmzüge → Band → Klimmzüge. Die `EASY`-Menge aus `src/engine/quick.js:36` ist ein Anfang, aber sie ist nur im Schnelltraining aktiv und wirkt in die falsche Richtung (schließt leichte Varianten für Nicht-Anfänger aus, statt schwere für Anfänger).
- Klimmzüge im Studio für Anfänger hinter Latzug und unterstützte Klimmzüge einordnen, z. B. über einen `minExperience`-Schlüssel oder das bwReps-Gate oben.

#### 2. Kein Gesundheits-Screening vor Plan, HIIT und schwerem Training

**Fundstelle:** `src/ui/onboarding.js:90-133` (`collect`), `src/data/muscles.js:247-253` (`LIMITATIONS`).

**Was passiert:** Das Onboarding fragt Alter (14–99), Größe, Gewicht, Ruhepuls und fünf Gelenkbeschwerden. Es gibt keine Frage nach Herz-Kreislauf-Erkrankungen, Bluthochdruck, Schwangerschaft, Medikamenten, Diabetes, Schwindel oder Brustschmerz bei Belastung. Ein 62-Jähriger mit Ziel „Ausdauer“ bekommt drei Cardio-Einheiten inklusive Intervallen in Zone 4 (ab Woche 1) und, wenn er „erfahren“ wählt, RIR 0 in Woche 4.

**Warum das zählt:** Jede seriöse Trainingsempfehlung beginnt mit einem Pre-Participation-Screening (PAR-Q+, Warburton et al. 2011; ACSM Guidelines). Die App ersetzt keine ärztliche Beratung, sagt das auch, aber sie sollte zumindest wissen, wann sie bremsen muss.

**Vorschlag:**
- Sieben PAR-Q+-Kernfragen im Onboarding (Ja/Nein). Bei mindestens einem „Ja“: deutlicher Hinweis auf ärztliche Freigabe, Intervalle deaktivieren (nur Zone 1–2), RIR-Untergrenze 2, kein Kraftziel mit 3–5 Wdh.
- Zusätzlich abfragen: Schwangerschaft / Wochenbett (Ernährungsdefizit deaktivieren, keine Bauchübungen in Rückenlage nach dem 1. Trimester, kein Valsalva), Bluthochdruck (kein Valsalva-lastiges Maximalkrafttraining ohne Freigabe).
- Diese Flags in das Profil aufnehmen und an den Coach weitergeben (Befund 15).

#### 3. RIR 0 auf schweren Grundübungen mit 3–5 Wiederholungen

**Fundstelle:** `src/engine/plan.js:26-30` (`RIR_SCHEDULE.erfahren` endet bei 0), `:203-208` (`repRange` Kraft), `src/ui/workout.js:47`.

**Was passiert:** Ein Erfahrener mit Ziel „Kraft“ macht in Woche 4 Kreuzheben, Kniebeuge, Bankdrücken und Langhantelrudern mit 5×3–5 bei RIR 0, also fünf Sätze bis zum Versagen bei 85–90 % 1RM.

**Warum das zählt:** Für Kraft ist Training bis zum Versagen nicht nötig (Refalo 2023, Robinson 2024) und bei Kreuzheben und Kniebeuge mit hoher Last ist der letzte Versuch der mit dem höchsten Technikverlust. Auch Rudern mit 3–5 Wdh. und RIR 0 ist keine sinnvolle Übung. Praxisprogramme (5/3/1, Texas Method, RTS) arbeiten bei schweren Sätzen mit RIR 1–2.

**Vorschlag:**
- `rirForWeek` für Tier-1-Übungen mit `pattern in ['hinge','squat']` und `load === 'barbell'` auf mindestens 1 begrenzen. Alternativ: RIR 0 nur bei Isolationen und Maschinen erlauben.
- Den 3–5-Bereich nur für `load === 'barbell'` und `pattern in ['squat','hpush','hinge','vpush']` vergeben. Rudern bleibt bei 5–8, Kurzhantel- und Maschinenvarianten bei 5–8 oder 6–10.

#### 4. Rückenkategorie mischt Lat/oberen Rücken mit Rückenstrecker und Trapez

**Fundstelle:** `src/data/exercises.js:156-160` (Rack Pull, Shrugs, Superman mit `primary: ['ruecken']`), `src/engine/plan.js:236-241` (Fallback über Nebenmuskel und Pattern).

**Was passiert:** Ohne Klimmzugstange oder Band existiert zuhause kein vertikaler Zug. Der Generator fällt für den `vpull`-Hauptslot auf „irgendeine Übung mit primary ruecken“ zurück und wählt Superman, eine Rückenstrecker-Übung, als Hauptübung „Rücken“ (Ganzkörper B im BW-Plan). Shrugs und Rack Pulls zählen als Rückenvolumen, obwohl sie Trapez bzw. Rückenstrecker treffen. Umgekehrt zählen Kreuzheben und RDL nur zur Hälfte auf „Rücken“, obwohl sie den Rückenstrecker voll belasten, was für die Ermüdungssteuerung relevant wäre.

**Vorschlag:**
- Eigene Muskelgruppe `ruecken_unten` (Rückenstrecker) und `trapez` oder zumindest Superman / Hyperextension / Rack Pull als `primary: ['ruecken_unten']` und Shrugs als `secondary` behandeln. Die Volumenziele für `ruecken_unten` niedrig halten (Nebenwirkung von Kreuzheben/Kniebeuge).
- Wenn kein `vpull` verfügbar ist: zweiten horizontalen Zug (Invertiertes Rudern, Handtuch-Rudern an der Tür) wählen und im Plan die Notiz „Für vertikalen Zug fehlt Klimmzugstange oder Band“ ausgeben. Die Notiz `pool.length < 20` in `plan.js:424` greift hier nicht (Pool hat 46 Übungen).

### Mittel: Trainingsqualität und Zielgenauigkeit

#### 5. Kraftziel verliert die Grundübungen durch Rotation

**Fundstelle:** `src/engine/plan.js:252-257` (Rotation innerhalb der besten Tier-Gruppe), `:369` (`rotation = mesoIndex` für alle außer Anfänger), `:42-45` (`GOAL_PREFER`).

**Was passiert:** `GOAL_PREFER` zieht Kniebeuge, Kreuzheben, Bankdrücken und Schulterdrücken beim Kraftziel nach vorn, aber die Rotation läuft danach und versetzt den Startpunkt pro Block. Simulation Kraft, erfahren, 4 Tage:

| Block | Hauptübungen |
| --- | --- |
| 1 | Bankdrücken LH, LH-Rudern, Kniebeuge LH, Kreuzheben, Chin-ups, Bankdrücken KH, RDL, Beinpresse |
| 2 | Bankdrücken KH 5×3–5, Pendlay, Beinpresse 5×3–5, RDL 4×3–5, Schrägbank LH, Sumo, Hackenschmidt 3×3–5 |
| 3 | Schrägbank LH, LH-Rudern Untergriff, Hackenschmidt 5×3–5, Sumo, Schrägbank KH 4×3–5, RDL KH, Frontkniebeuge |
| 4 | Schrägbank KH 4×3–5, T-Bar, Frontkniebeuge, RDL KH 4×3–5, unterstützte Klimmzüge 4×3–5, Bankdrücken Multipresse, RDL Kettlebell 2×3–5, Multipresse-Kniebeuge |

Kraft ist übungsspezifisch. Wer in der Kniebeuge stärker werden will, muss Kniebeugen machen. Kurzhantel-Bankdrücken oder Kettlebell-RDL mit 3–5 Wdh. sind zudem praktisch unsinnig (Hanteln in Position bringen, Kettlebell-Inkremente von 4 kg).

**Vorschlag:** Bei `goal === 'kraft'` die Rotation für `slot.main` deaktivieren (`rotation = 0` für Hauptslots) und nur Zusatz- und Isolationsübungen rotieren. Zusätzlich Befund 3 (3–5 nur Langhantel).

#### 6. Progression nutzt RIR nur zum Bremsen und liefert zwei unsinnige Meldungen

**Fundstelle:** `src/engine/progression.js:88` (nur Gewicht aus Satz 1), `:103` (`hitTop` verlangt RIR ≥ Ziel − 0,5), `:130` (`reps`-Zweig).

Verifiziert per Simulation, Bereich 6–10, RIR-Ziel 2:

| Log | Empfehlung | Problem |
| --- | --- | --- |
| 60 kg × 10, 10, 10 bei RIR 0 | „Gewicht halten, pro Satz eine Wiederholung mehr anpeilen (Ziel 10)“ | 10 ist schon erreicht; sinnvoll wäre „Gewicht halten, bis 10 Wdh. mit 2 RIR sauber sind“ |
| 60 kg × 8, 8, 8 bei RIR 5 | „eine Wiederholung mehr anpeilen“ | Last ist offensichtlich zu leicht; bis zur Steigerung dauert es zwei weitere Einheiten |
| 80×6, 70×9, 70×9 (Top-Set + Backoff) | rechnet mit 80 kg für alle Sätze | Backoff-Sätze werden so bewertet, als wären sie mit 80 kg gemacht |

**Vorschlag:**
- Wenn `avgRir >= rirTarget + 2` und alle Sätze ≥ repMin: Gewicht sofort um ein Inkrement erhöhen (autoregulierte Steigerung). Das ist die eigentliche Stärke von RIR-Logging.
- Wenn `minReps >= repMax`, aber `avgRir < rirTarget − 0,5`: eigene Meldung „Obergrenze erreicht, aber zu nah am Versagen. Gewicht halten, RIR-Ziel erreichen, dann steigern.“
- Gewicht pro Satz auswerten (Median oder häufigstes Gewicht statt `sets[0].weight`), oder Top-Set/Backoff explizit erkennen.
- Für Anfänger in Tier 1: lineare Progression zulassen (Steigerung, sobald alle Sätze ≥ repMin bei RIR ≥ Ziel), siehe Befund 7.

#### 7. Anfänger: Deload nach 4 Wochen und langsame Progression

**Fundstelle:** `src/engine/plan.js:9` (`MESO_WEEKS = 5` für alle), `:26-30`, `src/engine/progression.js:103-118`.

**Was passiert:** Ein Anfänger, der in Woche 1–4 jede Einheit sauber steigert, bekommt in Woche 5 halbe Sätze, −10 % Last und RIR 4, obwohl er weit von seiner Erholungsgrenze entfernt ist. Danach startet Block 2 mit denselben Übungen (Rotation ist für Anfänger korrekt aus), aber die Progression läuft über doppelte Progression 8–12: Steigerung erst, wenn alle Sätze 12 Wiederholungen bei RIR 3 erreichen.

**Warum das zählt:** Anfänger adaptieren neural sehr schnell und vertragen lineare Progression über 8–12 Wochen (ACSM 2009). Ein geplanter Deload ist bei ihnen selten nötig; er wird erst sinnvoll, wenn die Leistung stagniert (Bell et al. 2023). Vier Wochen Aufbau sind für Anfänger auch zu kurz, um überhaupt in den Bereich 12 Wdh. zu kommen.

**Vorschlag:**
- Für `anfaenger`: `MESO_WEEKS = 7` oder 9 (6+1 bzw. 8+1), oder Deload nur auslösen, wenn in zwei Einheiten hintereinander `performance === 'schlechter'` oder die Bereitschaft niedrig war (responsiver Deload).
- Für Anfänger und Tier 1: Steigerung des Gewichts, sobald alle Sätze ≥ repMin bei RIR ≥ Ziel erreicht wurden (Inkrement 2,5 kg oben, 5 kg unten). Der 8–12-Bereich bleibt als Korridor, aber die Steigerung wartet nicht auf 12.

#### 8. Autoregulation: Schrittweite zu groß, Deltas addieren sich über Übungen

**Fundstelle:** `src/engine/progression.js:153-166` (`muscleDeltasFromFeedback`), `src/ui/workout.js:531-539` (Deckel ±2, Anwendung pro Muskel), `src/engine/plan.js:459-464` (`effectiveSets` addiert pro Übung).

**Was passiert:** Ein Delta von +1 auf „Brust“ erhöht jede Brustübung in jedem Trainingstag um einen Satz. Im 4-Tage-Plan „Fortgeschritten“ sind das vier Übungen, also +4 Sätze pro Woche (+27 %) nach einem einzigen Feedback. Beim Deckel +2 sind es +8 Sätze (+53 %). Das globale „RPE ≤ 7 und Leistung besser“ vergibt +1 gleichzeitig auf alle trainierten Muskeln. Mit zwei Einheiten pro Muskel und Woche kann ein Muskel in einer Woche von 0 auf +2 springen. Beim Blockwechsel wird ±2 auf ±1 gedämpft, was gut ist, aber die Wochenschwankung bleibt.

**Warum das zählt:** RP-Vorgehen ist +1 bis +2 Sätze pro Muskel und Woche, verteilt, nicht pro Übung. Sonst überschreitet der Plan das MRV schneller, als das Feedback es melden kann.

**Vorschlag:** `muscleAdjust` in Sätzen pro Woche führen und auf die Übungen des Muskels verteilen (erst Hauptübungen), Deckel auf +30 % des Wochenziels. Oder einfacher: +1 nur auf die erste Übung des Muskels an jedem Tag. Zusätzlich das globale Up nur vergeben, wenn kein Muskel als „nicht erholt“ markiert war (ist aktuell so) **und** die Bereitschaft des Check-ins nicht niedrig war.

#### 9. Direktes Armvolumen sehr niedrig, Schultern als eine Gruppe

**Fundstelle:** `src/engine/plan.js:263-273` (`plannedVolume`, Nebenmuskel 0,5), `:34` (`MUSCLE_FACTOR`), `src/data/muscles.js:229-240`.

**Was passiert (4 Tage, fortgeschritten, Muskelaufbau):** Trizeps-Ziel 9 gezählte Sätze wird mit 2 direkten Sätzen (Seil-Trizepsdrücken 2×) plus Hälften aus Bank- und Schulterdrücken erfüllt; Bizeps ebenso 2 direkte Sätze (SZ-Curls 2×). Schultern zählen Schulterdrücken voll, obwohl es vor allem die vordere Schulter trainiert; seitliche und hintere Schulter bekommen je 2 Sätze pro Woche.

**Einordnung:** Das Anrechnen indirekter Arbeit ist vertretbar (Bank drückt den Trizeps nahe ans Versagen), aber 2 direkte Sätze pro Woche liegen unter jeder Empfehlung für Trainierte mit Ziel Muskelaufbau. Bei den Schultern fehlt die Differenzierung, die die Priorität „Schultern“ eigentlich meint (Breite = seitliche Schulter).

**Vorschlag:**
- Mindestanzahl direkter Sätze pro Muskel bei ≥ 4 Tagen: Bizeps, Trizeps, seitliche Schulter, Waden je ≥ 4–6.
- `schultern` in `schultern_seit` und `schultern_hinten` aufteilen (vordere Schulter braucht bei Drückübungen kein Ziel) oder vertikales Drücken nur zu 0,5 auf „Schultern“ zählen und für Isolation ein Minimum setzen.

#### 10. Gewichtstrend über die gesamte Historie statt über die letzten Wochen

**Fundstelle:** `src/engine/nutrition.js:263-277` (`weightTrend` vergleicht erste 7 und letzte 7 Einträge der übergebenen Liste), Aufrufe mit allen Logs in `src/ui/ernaehrung.js:43`, `src/ui/fortschritt.js:42`, `src/ui/coach.js:56`. Nur der Wochenrückblick filtert auf 21 Tage (`src/engine/food.js:141`).

**Verifiziert:** 90 Tage Historie, erst −0,5 kg/Woche, letzte drei Wochen Plateau bei 80,1 kg. Die Ernährungsseite meldet „Trend −0,49 %/Woche liegt im Zielbereich. Weiter so.“ Mit 21-Tage-Fenster kommt korrekt „Kein Gewichtsverlust. Reduziere um ca. 150 kcal.“ Je länger jemand die App nutzt, desto weniger reagiert die Anzeige.

**Vorschlag:** In `weightTrend` immer nur die letzten 21–28 Tage betrachten (Parameter mit Default), oder alle Aufrufer auf das gefilterte Fenster umstellen. Coach und Wochenrückblick sollten dieselbe Zahl sehen.

#### 11. Ernährungsziele rechnen mit dem Onboarding-Gewicht

**Fundstelle:** `src/engine/nutrition.js:195-246` (`computeNutrition(profile, plan)` nutzt `profile.weightKg`), `src/ui/ernaehrung.js:15-28` (`dailyTargets`).

**Was passiert:** Wer mit 92 kg startet und nach vier Monaten 84 kg wiegt, behält BMR, Kalorienziel, Protein (1,8–2,2 g × 92) und Wasser für 92 kg, bis er das Profil manuell ändert. Beim Fettabbau bedeutet das ein schrumpfendes reales Defizit und ein überhöhtes Proteinziel.

**Vorschlag:** In `dailyTargets` das aktuelle Gewicht aus dem 7-Tage-Mittel der `bodyLogs` einsetzen (Fallback Profil). Beim Fettabbau Protein auf Zielgewicht oder geschätzte fettfreie Masse beziehen (Helms 2014: 2,3–3,1 g/kg FFM), sonst ist 2,2 g/kg bei hohem Körperfett unnötig hoch.

Ergänzend zur Ernährung:
- **Fett-Untergrenze 0,7 g/kg** (`nutrition.js:225`): Für eine 65-kg-Frau im Defizit ergibt das 50 g bei 1770 kcal (25 %). Das ist am unteren Rand. Iraki et al. 2019 nennen 0,5–1,5 g/kg, für Frauen und hormonelle Gesundheit sind ≥ 0,8–1,0 g/kg die verbreitete Praxisempfehlung. Vorschlag: Untergrenze 0,8 g/kg, bei `sex === 'w'` 1,0 g/kg.
- **Erwartete Abnahme −0,5 bis −1 %/Woche** (`nutrition.js:254`): Für leichte oder bereits schlanke Personen ist −1 % zu schnell (Garthe et al. 2011: ~0,7 %/Woche erhält Muskelmasse besser als 1,4 %). Vorschlag: bei BMI < 22 oder Zielgewicht < 5 % entfernt den Korridor auf −0,25 bis −0,7 % setzen.
- **Cardio-Kalorien brutto** (`cardio.js:163-166`): MET-Werte enthalten den Ruheumsatz. 30 min Laufen bei 78 kg werden mit 360 kcal auf den Tagesbedarf addiert, netto sind es ~320 kcal (MET − 1). Kleine Doppelzählung von 10–15 %, die bei drei Einheiten pro Woche ~50 kcal/Tag ausmacht. Vorschlag: `(a.met - 1)` verwenden.

#### 12. Cardio: Intervall-Vorlage und Platzierung

**Fundstelle:** `src/engine/cardio.js:108-113` (`TEMPLATES`), `:150` (60 s hart / 90 s locker, 6–8 Runden), `:159` (Hinweis statt Planung).

**Einordnung:** 60/90-Intervalle in Zone 4 (80–90 % HFmax) sind ein solides Schwellentraining, aber kein HIIT im Sinne von Zone 5. Die Bezeichnung „Intervalle (HIIT)“ und der Zielpuls passen nicht zusammen. Für VO₂max sind längere Intervalle (4×4 min, Helgerud et al. 2007) oder kurze 30/30 in Zone 5 die Standardprotokolle. Zudem werden Cardio-Einheiten keinem Wochentag zugeordnet. Bei 6 Krafttagen plus 2 Cardio muss der Nutzer doppeln, und der Interferenz-Hinweis („nicht vor dem Beintraining“) bleibt Text.

**Vorschlag:**
- Zwei Vorlagen: „Schwelle (Zone 4)“ mit 3–5 × 3–4 min und „VO₂max (Zone 5)“ mit 4×4 oder 8–12 × 30/30, letztere nur ohne Screening-Flags (Befund 2).
- Cardio-Tage im Plan setzen: bevorzugt trainingsfreie Tage, sonst Oberkörper-Tage, Intervalle nicht am Tag vor einem Beintag. Damit werden auch die Erinnerungen und der Kalender vollständig.
- Bei Ziel „Ausdauer“ liegt die Voreinstellung mit drei Einheiten (92–140 min) am WHO-Minimum; vier Einheiten als Default wären konsistenter mit dem Ziel.

#### 13. Startgewichte: 20-kg-Stange als Untergrenze nivelliert Frauen und leichte Anfänger

**Fundstelle:** `src/engine/plan.js:510-526` (`estimateStartWeight`), `:523` (`Math.max(barWeight, w)`), `:511` (`SEX_FACTOR`).

**Simulation, Anfängerin 60 kg, 8 Wdh., RIR 3:** Kniebeuge 20, Kreuzheben 25, Bankdrücken 20, Schulterdrücken 20, Rudern 20, RDL 20, Hip Thrust 20. Rechnerisch lägen Schulterdrücken bei ~10 kg und Bankdrücken bei ~13 kg. Die Untergrenze macht daraus überall die leere Stange, und 20 kg Schulterdrücken × 8 bei RIR 3 schaffen viele untrainierte Frauen nicht.

**Vorschlag:**
- Wenn `w < barWeight`: Hinweis „berechnet ~10 kg, unter Stangengewicht“ und automatisch die Kurzhantel- oder Maschinenvariante der Übung vorschlagen (Alternativen sind über `alternativesFor` vorhanden).
- Stangengewicht in den Einstellungen mit Optionen 10 / 15 / 20 kg (Technik-, Frauen-, Männerstange).
- `SEX_FACTOR` nach Körperregion: Unterkörper ~0,75, Oberkörper ~0,55 statt pauschal 0,65.

### Niedrig: Feinschliff

#### 14. Deload dreifach reduziert

`plan.js:462` halbiert die Sätze, `progression.js:96` nimmt 10 % Last, `RIR_SCHEDULE` fordert RIR 4. Jede Maßnahme allein reicht; alle drei zusammen ergeben eine Woche mit ~25 % der Belastung, was Trainierte als Rückschritt spüren. Vorschlag: Sätze halbieren, Last halten (RIR ergibt sich dann automatisch bei 3–4), oder Last −10 % bei voller Satzzahl.

#### 15. Coach kennt die Einschränkungen nicht

`src/ui/coach.js:29-59` (`buildContext`) überträgt Profil, Plan, Logs, Ernährung, aber nicht `profile.limitations`. Der Coach kann bei „Was kann ich statt Bankdrücken machen?“ eine kontraindizierte Übung empfehlen. Vorschlag: Einschränkungen und die Screening-Flags aus Befund 2 in den Kontext, und im `SYSTEM`-Prompt ergänzen: Warnzeichen (Brustschmerz, Atemnot, Schwindel, plötzliche Gelenkschmerzen) heißen Abbruch und ärztliche Abklärung, keine Trainingstipps.

#### 16. Gamification belohnt Verhalten gegen die Erholung

`src/engine/achievements.js:151` („Nachteule“, Training nach 21 Uhr) und `:154` („Doppelschicht“, zwei Trainings an einem Tag) setzen Anreize, die Schlaf und Regeneration widersprechen, während die App gleichzeitig Schlaf im Check-in bewertet. Vorschlag: durch „Ausgeschlafen“ (7 Check-ins mit ≥ 7,5 h) und „Deload durchgezogen“ (alle Einheiten der Deload-Woche in leichter Version) ersetzen.

#### 17. Kleinere Punkte

- `progression.js:179`: e1RM ignoriert RIR. Mit `reps + rir` in der Epley-Formel werden Bestleistungen aus submaximalen Sätzen realistischer, und die PR-Erkennung reagiert nicht mehr auf reines „härter reingehen“.
- `plan.js:543`: Aufwärmen beim Kreuzheben mit leerer Stange × 10 ist unpraktisch (Stange liegt zu tief). Für `pattern === 'hinge'` und Kreuzheben-Varianten mit 40–60 kg starten.
- `cardio.js:86`: Die Zonen sollten den Hinweis tragen, dass Formeln für HFmax eine Streuung von ±10–12 Schlägen haben. Wer einen Laktattest oder einen Feldtest hat, sollte HFmax manuell setzen können.
- `recovery.js:203-207`: Der Check-in gewichtet Schlafdauer 3 Punkte, Qualität 3, Stress 3, Energie 3. Muskelkater geht nur in den Text. Optional: markierte Muskeln im Check-in für die heutige Einheit um einen Satz reduzieren (ist über `muscleAdjust` schon möglich, nur nicht angebunden).
- `plan.js:182`: `FREQUENCY_FACTOR` 1,25 bei 6 Tagen treibt Erfahrene auf 110 direkte Sätze pro Woche. 1,15 wäre näher am Bereich, in dem Baz-Valle 2022 noch Zugewinn zeigt.

---

## Was gut umgesetzt ist

- Split nach Trainingstagen mit garantierter Frequenz ≥ 2 pro Muskel.
- Volumenziele mit Untergrenze/Obergrenze pro Muskel und Warnung, wenn das Zeitbudget nicht reicht.
- RIR-Wochenverlauf nach Erfahrung; Anfänger bleiben bei RIR 2–3.
- Pausen nach Übungstyp; Zeitkosten pro Satz realistisch (2,25–3,5 min).
- Doppelte Progression mit Rückstufung nach zwei Fehlversuchen bei gleichem Gewicht.
- Aufwärmrampe (leer × 10, 50 % × 6, 70 % × 4, 85 % × 2) und Kurzaufwärmen für weitere Grundübungen.
- Leichte Version (−1 Satz, +1 RIR) und Kurzversion, die Hauptübungen schützt.
- Mifflin-St Jeor, Aktivitätsfaktor ohne Training plus getrennte Trainingsenergie; Untergrenzen 1300/1500 kcal; Faser 14 g/1000 kcal.
- Gewichtstrend als 7-Tage-Mittel mit Korridor und ±150-kcal-Stellschraube, die erst ab 4 erfassten Tagen und 10 Tagen Trend greift, und die Kalorienabweichung > 250 kcal vor der Zielanpassung prüft.
- Bereitschafts-Score mit klarer Handlungsempfehlung statt roher Zahl.
- Coach-Prompt mit Evidenzrahmen, Verweis auf ärztliche Abklärung und Prompt-Caching des Systemteils.

---

## Empfohlene Reihenfolge der Umsetzung

| # | Änderung | Dateien | Aufwand |
| --- | --- | --- | --- |
| 1 | Machbarkeits-Gate für Körpergewichtsübungen, eigene Rep-Bereiche für harte Übungen, Progressionsleitern für Anfänger | `plan.js`, `exercises.js` | klein |
| 2 | Rückenstrecker/Trapez aus „Rücken“ herauslösen, Fallback ohne vertikalen Zug | `exercises.js`, `muscles.js`, `plan.js` | klein |
| 3 | PAR-Q+-Kurzscreening im Onboarding, Flags an Plan (kein HIIT, RIR ≥ 2) und Coach | `onboarding.js`, `cardio.js`, `plan.js`, `coach.js` | mittel |
| 4 | Kraft: keine Rotation der Hauptübungen, 3–5 Wdh. nur Langhantel, RIR ≥ 1 bei schweren Hinge/Squat | `plan.js` | klein |
| 5 | Progression: RIR-Überschuss → Steigerung, korrekte Meldung bei RIR-Unterschreitung, Gewicht pro Satz | `progression.js` | klein |
| 6 | Ernährung: aktuelles Gewicht aus Logs, Trendfenster 21–28 Tage überall, Fett ≥ 0,8 g/kg | `nutrition.js`, `ernaehrung.js`, `fortschritt.js`, `coach.js` | klein |
| 7 | Autoregulation pro Muskel und Woche statt pro Übung | `progression.js`, `plan.js`, `workout.js` | mittel |
| 8 | Anfänger: längerer Block oder responsiver Deload, lineare Progression Tier 1 | `plan.js`, `progression.js` | mittel |
| 9 | Direkte Mindestsätze Arme/Schultern, Schultern differenzieren | `plan.js`, `muscles.js`, `exercises.js` | mittel |
| 10 | Cardio-Tage planen, Intervall-Vorlagen trennen | `cardio.js`, `planview.js`, `kalender.js` | mittel |

Für jede Änderung an `plan.js` sollten die bestehenden Tests in `tests/engine.test.js` um einen Fall erweitert werden, der die Simulationen aus diesem Review nachstellt (z. B. „Anfänger BW-Plan enthält keine Übung mit `estimateStartReps < repMin`“).

---

## Quellen

- ACSM (2009). Progression models in resistance training for healthy adults. Position Stand. *Med Sci Sports Exerc*.
- Ainsworth BE et al. (2011). Compendium of Physical Activities: a second update of codes and MET values. *Med Sci Sports Exerc*.
- Baz-Valle E, Balsalobre-Fernández C, Alix-Fages C, Santos-Concejero J (2022). A systematic review of the effects of different resistance training volumes on muscle hypertrophy. *J Hum Kinet*.
- Bell L et al. (2023). Integrating deloading into strength and physique sports training programmes: an international Delphi consensus. *Sports Med Open*.
- Coleman M et al. (2024). Gaining more from doing less? The effects of a one-week deload period during supervised resistance training on muscular adaptations. *PeerJ*.
- Garthe I et al. (2011). Effect of two different weight-loss rates on body composition and strength and power-related performance in elite athletes. *Int J Sport Nutr Exerc Metab*.
- Grgic J et al. (2018). Effects of rest interval duration in resistance training on measures of muscular strength: a systematic review. *Sports Med*.
- Helgerud J et al. (2007). Aerobic high-intensity intervals improve VO₂max more than moderate training. *Med Sci Sports Exerc*.
- Helms ER, Aragon AA, Fitschen PJ (2014). Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation. *J Int Soc Sports Nutr*.
- Iraki J, Fitschen P, Espinar S, Helms E (2019). Nutrition recommendations for bodybuilders in the off-season: a narrative review. *Sports*.
- Mifflin MD et al. (1990). A new predictive equation for resting energy expenditure in healthy individuals. *Am J Clin Nutr*.
- Morton RW et al. (2018). A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength. *Br J Sports Med*.
- Refalo MC et al. (2023). Influence of resistance training proximity-to-failure on skeletal muscle hypertrophy: a systematic review with meta-analysis. *Sports Med*.
- Robinson ZP et al. (2024). Exploring the dose-response relationship between estimated resistance training proximity to failure, strength gain, and muscle hypertrophy: a series of meta-regressions. *Sports Med*.
- Schoenfeld BJ, Ogborn D, Krieger JW (2016). Effects of resistance training frequency on measures of muscle hypertrophy: a systematic review and meta-analysis. *Sports Med*.
- Schoenfeld BJ et al. (2016). Longer interset rest periods enhance muscle strength and hypertrophy in resistance-trained men. *J Strength Cond Res*.
- Schoenfeld BJ, Ogborn D, Krieger JW (2017). Dose-response relationship between weekly resistance training volume and increases in muscle mass. *J Sports Sci*.
- Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW (2017). Strength and hypertrophy adaptations between low- vs. high-load resistance training: a systematic review and meta-analysis. *J Strength Cond Res*.
- Schumann M et al. (2022). Compatibility of concurrent aerobic and strength training for skeletal muscle size and function: an updated systematic review and meta-analysis. *Sports Med*.
- Tanaka H, Monahan KD, Seals DR (2001). Age-predicted maximal heart rate revisited. *J Am Coll Cardiol*.
- Warburton DER et al. (2011). The Physical Activity Readiness Questionnaire for Everyone (PAR-Q+) and electronic Physical Activity Readiness Medical Examination (ePARmed-X+). *Health Fit J Can*.
- WHO (2020). Guidelines on physical activity and sedentary behaviour.
- Zourdos MC et al. (2016). Novel resistance training-specific rating of perceived exertion scale measuring repetitions in reserve. *J Strength Cond Res*.

// Übungsdatenbank.
// pattern: squat | lunge | hinge | hpush | vpush | hpull | vpull | iso | core
// tier: 1 = Grundübung (mehrgelenkig, schwer), 2 = leichtere Mehrgelenksübung, 3 = Isolation
// ctx: wo verfügbar ('gym' = Studio, 'home' = Zuhause). gear: für 'home' benötigte Ausrüstung.
// load: barbell | dumbbell | machine | cable | bw | band | time   (bw = Körpergewicht, time = Sekunden)
// inc: sinnvolle Gewichtssteigerung in kg (bei dumbbell pro Hantel)
// contra: Einschränkungen, bei denen die Übung ausgelassen wird.
// Reihenfolge innerhalb einer Muskelgruppe = Präferenz (beste Option zuerst).

const ex = (o) => ({ secondary: [], ctx: ['gym'], gear: [], contra: [], inc: 2.5, cue: '', ...o });

export const EXERCISES = [
  // ---------- Quadrizeps ----------
  ex({ id: 'kniebeuge_lh', name: 'Kniebeuge (Langhantel)', en: 'Barbell Back Squat', pattern: 'squat', tier: 1, primary: ['quadrizeps'], secondary: ['gesaess', 'beinbeuger'], load: 'barbell', inc: 5, contra: ['ruecken_unten', 'huefte'], cue: 'Stange auf dem oberen Rücken, Füße schulterbreit, Knie folgen den Zehen, so tief wie sauber möglich.' }),
  ex({ id: 'beinpresse', name: 'Beinpresse', en: 'Leg Press', pattern: 'squat', tier: 1, primary: ['quadrizeps'], secondary: ['gesaess'], load: 'machine', inc: 10, cue: 'Unterer Rücken bleibt am Polster, Knie nicht durchstrecken.' }),
  ex({ id: 'hackenschmidt', name: 'Hackenschmidt-Kniebeuge (Maschine)', en: 'Hack Squat', pattern: 'squat', tier: 1, primary: ['quadrizeps'], secondary: ['gesaess'], load: 'machine', inc: 10, contra: ['knie'], cue: 'Fersen fest auf der Plattform, kontrolliert tief.' }),
  ex({ id: 'frontkniebeuge', name: 'Frontkniebeuge', en: 'Front Squat', pattern: 'squat', tier: 1, primary: ['quadrizeps'], secondary: ['gesaess', 'bauch'], load: 'barbell', inc: 2.5, contra: ['handgelenk', 'knie'], cue: 'Ellbogen hoch, Oberkörper aufrecht, Stange liegt auf den Schultern.' }),
  ex({ id: 'goblet_squat', name: 'Goblet Squat (Kurzhantel)', en: 'Goblet Squat', pattern: 'squat', tier: 1, primary: ['quadrizeps'], secondary: ['gesaess'], ctx: ['gym', 'home'], gear: ['kurzhantel'], load: 'dumbbell', inc: 2, cue: 'Hantel vor der Brust, Ellbogen zwischen die Knie, Brust raus.' }),
  ex({ id: 'bulgarian_split_squat', name: 'Bulgarian Split Squat', en: 'Bulgarian Split Squat', pattern: 'lunge', tier: 2, primary: ['quadrizeps'], secondary: ['gesaess'], ctx: ['gym', 'home'], gear: [], load: 'dumbbell', inc: 2, contra: ['knie'], cue: 'Hinterer Fuß auf Bank/Stuhl, vorderes Schienbein bleibt fast senkrecht.' }),
  ex({ id: 'ausfallschritte', name: 'Ausfallschritte (gehend)', en: 'Walking Lunges', pattern: 'lunge', tier: 2, primary: ['quadrizeps'], secondary: ['gesaess'], ctx: ['gym', 'home'], gear: [], load: 'dumbbell', inc: 2, contra: ['knie'], cue: 'Lange Schritte, Knie zeigt über den Fuß, Oberkörper aufrecht.' }),
  ex({ id: 'step_ups', name: 'Step-ups', en: 'Step-ups', pattern: 'lunge', tier: 2, primary: ['quadrizeps'], secondary: ['gesaess'], ctx: ['gym', 'home'], gear: [], load: 'dumbbell', inc: 2, cue: 'Kniehohe Stufe, ganz aus dem vorderen Bein hochdrücken.' }),
  ex({ id: 'kniebeuge_bw', name: 'Kniebeuge (Körpergewicht)', en: 'Bodyweight Squat', pattern: 'squat', tier: 2, primary: ['quadrizeps'], secondary: ['gesaess'], ctx: ['home'], gear: [], load: 'bw', inc: 0, cue: 'Tempo langsam (3 s runter), Pause unten – so wird es auch ohne Gewicht schwer.' }),
  ex({ id: 'beinstrecker', name: 'Beinstrecker (Maschine)', en: 'Leg Extension', pattern: 'iso', tier: 3, primary: ['quadrizeps'], load: 'machine', inc: 5, cue: 'Oben kurz anspannen, langsam ablassen.' }),
  ex({ id: 'sissy_squat', name: 'Sissy Squat / Wandsitz', en: 'Sissy Squat', pattern: 'iso', tier: 3, primary: ['quadrizeps'], ctx: ['home'], gear: [], load: 'time', inc: 0, contra: ['knie'], cue: 'Wandsitz: 90° im Knie, Rücken an der Wand – Zeit steigern.' }),

  // ---------- Beinbeuger / Hinge ----------
  ex({ id: 'kreuzheben', name: 'Kreuzheben (konventionell)', en: 'Conventional Deadlift', pattern: 'hinge', tier: 1, primary: ['beinbeuger'], secondary: ['gesaess', 'ruecken', 'quadrizeps'], load: 'barbell', inc: 5, contra: ['ruecken_unten'], cue: 'Stange nah am Schienbein, Rücken neutral, Hüfte und Schultern gleichzeitig hoch.' }),
  ex({ id: 'rdl_lh', name: 'Rumänisches Kreuzheben (Langhantel)', en: 'Romanian Deadlift', pattern: 'hinge', tier: 1, primary: ['beinbeuger'], secondary: ['gesaess'], load: 'barbell', inc: 5, contra: ['ruecken_unten'], cue: 'Hüfte nach hinten schieben, Knie leicht gebeugt, Stange am Bein entlang bis zur Dehnung.' }),
  ex({ id: 'rdl_kh', name: 'Rumänisches Kreuzheben (Kurzhantel)', en: 'Dumbbell RDL', pattern: 'hinge', tier: 1, primary: ['beinbeuger'], secondary: ['gesaess'], ctx: ['gym', 'home'], gear: ['kurzhantel'], load: 'dumbbell', inc: 2, contra: ['ruecken_unten'], cue: 'Hüfte zurück, Rücken gerade, Hanteln nah am Bein.' }),
  ex({ id: 'hip_thrust', name: 'Hip Thrust (Langhantel)', en: 'Barbell Hip Thrust', pattern: 'hinge', tier: 1, primary: ['gesaess'], secondary: ['beinbeuger'], load: 'barbell', inc: 5, contra: ['huefte'], cue: 'Schulterblätter auf der Bank, Kinn zur Brust, oben Gesäß maximal anspannen.' }),
  ex({ id: 'glute_bridge', name: 'Glute Bridge (Boden)', en: 'Glute Bridge', pattern: 'hinge', tier: 2, primary: ['gesaess'], secondary: ['beinbeuger'], ctx: ['gym', 'home'], gear: [], load: 'dumbbell', inc: 2, cue: 'Fersen nah am Gesäß, Hüfte strecken, oben 1 s halten. Einbeinig als Steigerung.' }),
  ex({ id: 'single_leg_rdl', name: 'Einbeiniges RDL (Kurzhantel)', en: 'Single-leg RDL', pattern: 'hinge', tier: 2, primary: ['beinbeuger'], secondary: ['gesaess'], ctx: ['gym', 'home'], gear: ['kurzhantel'], load: 'dumbbell', inc: 2, cue: 'Hüfte gerade halten, langsam und kontrolliert.' }),
  ex({ id: 'beinbeuger_liegend', name: 'Beinbeuger liegend (Maschine)', en: 'Lying Leg Curl', pattern: 'iso', tier: 3, primary: ['beinbeuger'], load: 'machine', inc: 5, cue: 'Hüfte am Polster lassen, unten voll strecken.' }),
  ex({ id: 'beinbeuger_sitzend', name: 'Beinbeuger sitzend (Maschine)', en: 'Seated Leg Curl', pattern: 'iso', tier: 3, primary: ['beinbeuger'], load: 'machine', inc: 5, cue: 'Oberkörper leicht nach vorn – mehr Dehnung im Beinbeuger.' }),
  ex({ id: 'nordic_curl', name: 'Nordic Hamstring Curl', en: 'Nordic Curl', pattern: 'iso', tier: 3, primary: ['beinbeuger'], ctx: ['gym', 'home'], gear: [], load: 'bw', inc: 0, contra: ['knie'], cue: 'Füße fixieren, so langsam wie möglich nach vorn ablassen, mit den Händen abfangen.' }),
  ex({ id: 'hyperextension', name: 'Rückenstrecker (Hyperextension)', en: 'Back Extension', pattern: 'iso', tier: 3, primary: ['gesaess'], secondary: ['beinbeuger'], load: 'bw', inc: 0, contra: ['ruecken_unten'], cue: 'Aus der Hüfte beugen, nicht überstrecken, Gesäß anspannen.' }),
  ex({ id: 'abduktion', name: 'Abduktion (Maschine)', en: 'Hip Abduction', pattern: 'iso', tier: 3, primary: ['gesaess'], load: 'machine', inc: 5, cue: 'Oberkörper leicht nach vorn, außen kurz halten.' }),
  ex({ id: 'band_walks', name: 'Seitliche Schritte mit Band', en: 'Banded Lateral Walks', pattern: 'iso', tier: 3, primary: ['gesaess'], ctx: ['gym', 'home'], gear: ['band'], load: 'band', inc: 0, cue: 'Band über den Knien, leicht in der Hocke, Spannung halten.' }),

  // ---------- Waden ----------
  ex({ id: 'wadenheben_stehend', name: 'Wadenheben stehend (Maschine)', en: 'Standing Calf Raise', pattern: 'iso', tier: 3, primary: ['waden'], load: 'machine', inc: 5, cue: 'Unten 2 s dehnen, oben 1 s halten – volle Bewegung.' }),
  ex({ id: 'wadenheben_beinpresse', name: 'Wadenheben an der Beinpresse', en: 'Leg Press Calf Raise', pattern: 'iso', tier: 3, primary: ['waden'], load: 'machine', inc: 10, cue: 'Nur der Fußballen auf der Plattform, volle Dehnung unten.' }),
  ex({ id: 'wadenheben_sitzend', name: 'Wadenheben sitzend', en: 'Seated Calf Raise', pattern: 'iso', tier: 3, primary: ['waden'], load: 'machine', inc: 5, cue: 'Langsam, volle Dehnung.' }),
  ex({ id: 'wadenheben_einbeinig', name: 'Wadenheben einbeinig (Stufe)', en: 'Single-leg Calf Raise', pattern: 'iso', tier: 3, primary: ['waden'], ctx: ['gym', 'home'], gear: [], load: 'dumbbell', inc: 2, cue: 'Auf einer Stufe, Ferse tief absenken, Kurzhantel in der Hand als Steigerung.' }),

  // ---------- Brust ----------
  ex({ id: 'bankdruecken_lh', name: 'Bankdrücken (Langhantel)', en: 'Barbell Bench Press', pattern: 'hpush', tier: 1, primary: ['brust'], secondary: ['trizeps', 'schultern'], load: 'barbell', inc: 2.5, contra: ['schulter'], cue: 'Schulterblätter zusammen und nach unten, Stange zum unteren Brustbein, Ellbogen ca. 45°.' }),
  ex({ id: 'bankdruecken_kh', name: 'Bankdrücken (Kurzhantel)', en: 'Dumbbell Bench Press', pattern: 'hpush', tier: 1, primary: ['brust'], secondary: ['trizeps', 'schultern'], ctx: ['gym', 'home'], gear: ['kurzhantel', 'bank'], load: 'dumbbell', inc: 2, cue: 'Hanteln leicht nach innen gedreht, tief absenken, oben nicht zusammenschlagen.' }),
  ex({ id: 'schraegbank_lh', name: 'Schrägbankdrücken (Langhantel)', en: 'Incline Barbell Press', pattern: 'hpush', tier: 1, primary: ['brust'], secondary: ['schultern', 'trizeps'], load: 'barbell', inc: 2.5, contra: ['schulter'], cue: 'Bank 30°, Stange zum oberen Brustbereich.' }),
  ex({ id: 'schraegbank_kh', name: 'Schrägbankdrücken (Kurzhantel)', en: 'Incline Dumbbell Press', pattern: 'hpush', tier: 1, primary: ['brust'], secondary: ['schultern', 'trizeps'], ctx: ['gym', 'home'], gear: ['kurzhantel', 'bank'], load: 'dumbbell', inc: 2, cue: 'Bank 30°, volle Dehnung unten.' }),
  ex({ id: 'brustpresse', name: 'Brustpresse (Maschine)', en: 'Machine Chest Press', pattern: 'hpush', tier: 1, primary: ['brust'], secondary: ['trizeps'], load: 'machine', inc: 5, cue: 'Griffe auf Höhe der Brustmitte, Schulterblätter am Polster.' }),
  ex({ id: 'dips', name: 'Dips', en: 'Dips', pattern: 'hpush', tier: 1, primary: ['brust', 'trizeps'], ctx: ['gym'], load: 'bw', inc: 0, contra: ['schulter'], cue: 'Oberkörper leicht nach vorn, bis der Oberarm parallel ist. Zusatzgewicht als Steigerung.' }),
  ex({ id: 'liegestuetze', name: 'Liegestütze', en: 'Push-ups', pattern: 'hpush', tier: 2, primary: ['brust'], secondary: ['trizeps', 'schultern'], ctx: ['gym', 'home'], gear: [], load: 'bw', inc: 0, contra: ['handgelenk'], cue: 'Körper als Linie, Ellbogen ca. 45°, Brust bis kurz über den Boden. Zu leicht? Füße erhöhen oder Rucksack.' }),
  ex({ id: 'liegestuetze_kh', name: 'Liegestütze auf Kurzhanteln (Füße erhöht)', en: 'Deficit Push-ups', pattern: 'hpush', tier: 2, primary: ['brust'], secondary: ['trizeps', 'schultern'], ctx: ['gym', 'home'], gear: ['kurzhantel'], load: 'bw', inc: 0, cue: 'Griffe erlauben mehr Tiefe, Füße auf Stuhl/Bank erhöhen für mehr Last.' }),
  ex({ id: 'fliegende_kabel', name: 'Fliegende am Kabelzug', en: 'Cable Fly', pattern: 'iso', tier: 3, primary: ['brust'], load: 'cable', inc: 2.5, cue: 'Leicht gebeugte Arme, in der Dehnung 1 s halten.' }),
  ex({ id: 'fliegende_kh', name: 'Fliegende (Kurzhantel)', en: 'Dumbbell Fly', pattern: 'iso', tier: 3, primary: ['brust'], ctx: ['gym', 'home'], gear: ['kurzhantel', 'bank'], load: 'dumbbell', inc: 1, cue: 'Nicht zu schwer, Fokus auf Dehnung, Ellbogen leicht gebeugt.' }),
  ex({ id: 'butterfly', name: 'Butterfly (Maschine)', en: 'Pec Deck', pattern: 'iso', tier: 3, primary: ['brust'], load: 'machine', inc: 5, cue: 'Ellbogen leicht gebeugt, vorne 1 s anspannen.' }),
  ex({ id: 'band_fliegende', name: 'Fliegende mit Band', en: 'Band Fly', pattern: 'iso', tier: 3, primary: ['brust'], ctx: ['home'], gear: ['band'], load: 'band', inc: 0, cue: 'Band hinter dem Rücken fixieren, Arme im Bogen vor der Brust zusammenführen.' }),

  // ---------- Rücken ----------
  ex({ id: 'klimmzuege', name: 'Klimmzüge', en: 'Pull-ups', pattern: 'vpull', tier: 1, primary: ['ruecken'], secondary: ['bizeps'], ctx: ['gym', 'home'], gear: ['klimmzugstange'], load: 'bw', inc: 0, cue: 'Aus dem hängenden Zustand starten, Brust zur Stange. Zu schwer? Band als Unterstützung. Zu leicht? Zusatzgewicht.' }),
  ex({ id: 'latzug', name: 'Latzug', en: 'Lat Pulldown', pattern: 'vpull', tier: 1, primary: ['ruecken'], secondary: ['bizeps'], load: 'machine', inc: 5, cue: 'Leicht zurücklehnen, Ellbogen zur Hüfte ziehen, oben Schultern lang lassen.' }),
  ex({ id: 'chin_ups', name: 'Klimmzüge im Untergriff (Chin-ups)', en: 'Chin-ups', pattern: 'vpull', tier: 1, primary: ['ruecken'], secondary: ['bizeps'], ctx: ['gym', 'home'], gear: ['klimmzugstange'], load: 'bw', inc: 0, cue: 'Handflächen zu dir, Ellbogen nach unten ziehen.' }),
  ex({ id: 'band_latzug', name: 'Latzug mit Band', en: 'Band Pulldown', pattern: 'vpull', tier: 2, primary: ['ruecken'], secondary: ['bizeps'], ctx: ['home'], gear: ['band'], load: 'band', inc: 0, cue: 'Band oben fixieren (Tür), Ellbogen zur Hüfte ziehen.' }),
  ex({ id: 'lh_rudern', name: 'Langhantelrudern', en: 'Barbell Row', pattern: 'hpull', tier: 1, primary: ['ruecken'], secondary: ['bizeps', 'beinbeuger'], load: 'barbell', inc: 2.5, contra: ['ruecken_unten'], cue: 'Oberkörper ca. 45°, Rücken neutral, Stange zum Bauch ziehen.' }),
  ex({ id: 'kh_rudern', name: 'Kurzhantelrudern (einarmig)', en: 'One-arm Dumbbell Row', pattern: 'hpull', tier: 1, primary: ['ruecken'], secondary: ['bizeps'], ctx: ['gym', 'home'], gear: ['kurzhantel'], load: 'dumbbell', inc: 2, cue: 'Eine Hand abstützen, Ellbogen nah am Körper zur Hüfte ziehen.' }),
  ex({ id: 'kabelrudern', name: 'Kabelrudern sitzend', en: 'Seated Cable Row', pattern: 'hpull', tier: 1, primary: ['ruecken'], secondary: ['bizeps'], load: 'cable', inc: 5, cue: 'Oberkörper stabil, Schulterblätter zusammenziehen.' }),
  ex({ id: 'rudern_maschine', name: 'Rudern brustgestützt (Maschine)', en: 'Chest-supported Row', pattern: 'hpull', tier: 1, primary: ['ruecken'], secondary: ['bizeps'], load: 'machine', inc: 5, cue: 'Brust am Polster, Ellbogen weit nach hinten.' }),
  ex({ id: 'invertiertes_rudern', name: 'Invertiertes Rudern (Tisch / tiefe Stange)', en: 'Inverted Row', pattern: 'hpull', tier: 2, primary: ['ruecken'], secondary: ['bizeps'], ctx: ['gym', 'home'], gear: [], load: 'bw', inc: 0, cue: 'Körper als Linie, Brust zur Stange/Tischkante. Füße erhöhen = schwerer.' }),
  ex({ id: 'band_rudern', name: 'Rudern mit Band', en: 'Band Row', pattern: 'hpull', tier: 2, primary: ['ruecken'], secondary: ['bizeps'], ctx: ['home'], gear: ['band'], load: 'band', inc: 0, cue: 'Band um die Füße, Ellbogen nach hinten, Schulterblätter zusammen.' }),
  ex({ id: 'ueberzuege_kabel', name: 'Überzüge am Kabel (gestreckte Arme)', en: 'Straight-arm Pulldown', pattern: 'iso', tier: 3, primary: ['ruecken'], load: 'cable', inc: 2.5, cue: 'Arme fast gestreckt, Bogen bis zur Hüfte, Lat spüren.' }),

  // ---------- Schultern ----------
  ex({ id: 'schulterdruecken_lh', name: 'Schulterdrücken (Langhantel, stehend)', en: 'Overhead Press', pattern: 'vpush', tier: 1, primary: ['schultern'], secondary: ['trizeps'], load: 'barbell', inc: 2.5, contra: ['schulter'], cue: 'Gesäß und Bauch anspannen, Stange in einer Linie über Kopf, Kopf am Ende leicht nach vorn.' }),
  ex({ id: 'schulterdruecken_kh', name: 'Schulterdrücken (Kurzhantel)', en: 'Dumbbell Shoulder Press', pattern: 'vpush', tier: 1, primary: ['schultern'], secondary: ['trizeps'], ctx: ['gym', 'home'], gear: ['kurzhantel'], load: 'dumbbell', inc: 2, contra: ['schulter'], cue: 'Sitzend oder stehend, Hanteln bis auf Ohrhöhe absenken.' }),
  ex({ id: 'schulterpresse', name: 'Schulterpresse (Maschine)', en: 'Machine Shoulder Press', pattern: 'vpush', tier: 1, primary: ['schultern'], secondary: ['trizeps'], load: 'machine', inc: 5, contra: ['schulter'], cue: 'Griffe auf Schulterhöhe, nicht ganz ablassen wenn es zwickt.' }),
  ex({ id: 'pike_liegestuetze', name: 'Pike-Liegestütze', en: 'Pike Push-ups', pattern: 'vpush', tier: 2, primary: ['schultern'], secondary: ['trizeps'], ctx: ['gym', 'home'], gear: [], load: 'bw', inc: 0, contra: ['schulter', 'handgelenk'], cue: 'Hüfte hoch (umgekehrtes V), Kopf Richtung Boden zwischen die Hände. Füße erhöhen = schwerer.' }),
  ex({ id: 'seitheben_kh', name: 'Seitheben (Kurzhantel)', en: 'Dumbbell Lateral Raise', pattern: 'iso', tier: 3, primary: ['schultern'], ctx: ['gym', 'home'], gear: ['kurzhantel'], load: 'dumbbell', inc: 1, cue: 'Leicht nach vorn gelehnt, Ellbogen führen, bis Schulterhöhe – kein Schwung.' }),
  ex({ id: 'seitheben_kabel', name: 'Seitheben am Kabel', en: 'Cable Lateral Raise', pattern: 'iso', tier: 3, primary: ['schultern'], load: 'cable', inc: 2.5, cue: 'Kabel auf Hüfthöhe, konstante Spannung über den ganzen Weg.' }),
  ex({ id: 'seitheben_band', name: 'Seitheben mit Band', en: 'Band Lateral Raise', pattern: 'iso', tier: 3, primary: ['schultern'], ctx: ['home'], gear: ['band'], load: 'band', inc: 0, cue: 'Auf das Band stellen, Arme seitlich bis Schulterhöhe.' }),
  ex({ id: 'face_pulls', name: 'Face Pulls (Kabel)', en: 'Face Pulls', pattern: 'iso', tier: 3, primary: ['schultern'], secondary: ['ruecken'], load: 'cable', inc: 2.5, cue: 'Seil zum Gesicht ziehen, Ellbogen hoch und weit, Schulterblätter zusammen.' }),
  ex({ id: 'reverse_flys_kh', name: 'Reverse Flys (Kurzhantel)', en: 'Rear Delt Fly', pattern: 'iso', tier: 3, primary: ['schultern'], secondary: ['ruecken'], ctx: ['gym', 'home'], gear: ['kurzhantel'], load: 'dumbbell', inc: 1, cue: 'Vorgebeugt, Arme seitlich öffnen, kein Schwung.' }),
  ex({ id: 'band_pull_aparts', name: 'Band Pull-aparts', en: 'Band Pull-aparts', pattern: 'iso', tier: 3, primary: ['schultern'], secondary: ['ruecken'], ctx: ['gym', 'home'], gear: ['band'], load: 'band', inc: 0, cue: 'Band auf Brusthöhe auseinanderziehen, Schulterblätter zusammen.' }),

  // ---------- Bizeps ----------
  ex({ id: 'lh_curls', name: 'Langhantel-Curls', en: 'Barbell Curl', pattern: 'iso', tier: 3, primary: ['bizeps'], load: 'barbell', inc: 2.5, cue: 'Ellbogen am Körper, kein Schwung aus dem Rücken.' }),
  ex({ id: 'kh_curls', name: 'Kurzhantel-Curls', en: 'Dumbbell Curl', pattern: 'iso', tier: 3, primary: ['bizeps'], ctx: ['gym', 'home'], gear: ['kurzhantel'], load: 'dumbbell', inc: 1, cue: 'Handfläche beim Hochgehen nach außen drehen, langsam ablassen.' }),
  ex({ id: 'hammer_curls', name: 'Hammer-Curls', en: 'Hammer Curl', pattern: 'iso', tier: 3, primary: ['bizeps'], ctx: ['gym', 'home'], gear: ['kurzhantel'], load: 'dumbbell', inc: 1, cue: 'Neutraler Griff (Daumen oben), trainiert auch den Unterarm.' }),
  ex({ id: 'kabel_curls', name: 'Kabel-Curls', en: 'Cable Curl', pattern: 'iso', tier: 3, primary: ['bizeps'], load: 'cable', inc: 2.5, cue: 'Konstante Spannung, Ellbogen fixiert.' }),
  ex({ id: 'schraegbank_curls', name: 'Schrägbank-Curls (Kurzhantel)', en: 'Incline Dumbbell Curl', pattern: 'iso', tier: 3, primary: ['bizeps'], ctx: ['gym', 'home'], gear: ['kurzhantel', 'bank'], load: 'dumbbell', inc: 1, cue: 'Bank 45–60°, Arme hängen lassen – starke Dehnung des Bizeps.' }),
  ex({ id: 'scott_curls', name: 'Scott-Curls (Maschine / SZ)', en: 'Preacher Curl', pattern: 'iso', tier: 3, primary: ['bizeps'], load: 'machine', inc: 2.5, cue: 'Oberarme fest auf dem Polster, unten nicht ganz strecken.' }),
  ex({ id: 'band_curls', name: 'Curls mit Band', en: 'Band Curl', pattern: 'iso', tier: 3, primary: ['bizeps'], ctx: ['home'], gear: ['band'], load: 'band', inc: 0, cue: 'Auf das Band stellen, Ellbogen fixiert.' }),

  // ---------- Trizeps ----------
  ex({ id: 'trizeps_kabel', name: 'Trizepsdrücken am Kabel', en: 'Cable Pushdown', pattern: 'iso', tier: 3, primary: ['trizeps'], load: 'cable', inc: 2.5, cue: 'Ellbogen am Körper, unten voll strecken.' }),
  ex({ id: 'trizeps_ueberkopf_kh', name: 'Trizepsdrücken über Kopf (Kurzhantel)', en: 'Overhead DB Extension', pattern: 'iso', tier: 3, primary: ['trizeps'], ctx: ['gym', 'home'], gear: ['kurzhantel'], load: 'dumbbell', inc: 2, contra: ['schulter'], cue: 'Ellbogen zeigen nach vorn, tief hinter den Kopf absenken – langer Trizepskopf.' }),
  ex({ id: 'french_press', name: 'French Press (SZ-Stange)', en: 'Skull Crusher', pattern: 'iso', tier: 3, primary: ['trizeps'], load: 'barbell', inc: 2.5, cue: 'Stange zur Stirn oder leicht dahinter, Ellbogen bleiben eng.' }),
  ex({ id: 'enges_bankdruecken', name: 'Enges Bankdrücken', en: 'Close-grip Bench Press', pattern: 'hpush', tier: 2, primary: ['trizeps'], secondary: ['brust', 'schultern'], load: 'barbell', inc: 2.5, contra: ['schulter'], cue: 'Griff schulterbreit, Ellbogen eng am Körper.' }),
  ex({ id: 'diamant_liegestuetze', name: 'Diamant-Liegestütze', en: 'Diamond Push-ups', pattern: 'iso', tier: 3, primary: ['trizeps'], secondary: ['brust'], ctx: ['gym', 'home'], gear: [], load: 'bw', inc: 0, contra: ['handgelenk'], cue: 'Hände bilden ein Dreieck unter der Brust, Ellbogen eng.' }),
  ex({ id: 'bank_dips', name: 'Bank-Dips', en: 'Bench Dips', pattern: 'iso', tier: 3, primary: ['trizeps'], ctx: ['gym', 'home'], gear: [], load: 'bw', inc: 0, contra: ['schulter'], cue: 'Hände auf Stuhl/Bank, Beine gestreckt = schwerer.' }),
  ex({ id: 'band_trizeps', name: 'Trizepsdrücken mit Band', en: 'Band Pushdown', pattern: 'iso', tier: 3, primary: ['trizeps'], ctx: ['home'], gear: ['band'], load: 'band', inc: 0, cue: 'Band oben fixieren, Ellbogen am Körper.' }),

  // ---------- Bauch / Rumpf ----------
  ex({ id: 'kabel_crunch', name: 'Kabel-Crunch', en: 'Cable Crunch', pattern: 'core', tier: 3, primary: ['bauch'], load: 'cable', inc: 2.5, cue: 'Kniend, Wirbelsäule einrollen, Hüfte bleibt still.' }),
  ex({ id: 'haengendes_beinheben', name: 'Hängendes Beinheben', en: 'Hanging Leg Raise', pattern: 'core', tier: 3, primary: ['bauch'], ctx: ['gym', 'home'], gear: ['klimmzugstange'], load: 'bw', inc: 0, cue: 'Kein Schwung, Becken nach oben kippen. Knie angewinkelt als leichtere Variante.' }),
  ex({ id: 'ab_wheel', name: 'Ab-Wheel Rollouts', en: 'Ab Wheel Rollout', pattern: 'core', tier: 3, primary: ['bauch'], ctx: ['gym', 'home'], gear: [], load: 'bw', inc: 0, contra: ['ruecken_unten'], cue: 'Aus dem Kniestand, Rumpf angespannt, nur so weit wie der untere Rücken neutral bleibt.' }),
  ex({ id: 'beinheben_liegend', name: 'Beinheben liegend', en: 'Lying Leg Raise', pattern: 'core', tier: 3, primary: ['bauch'], ctx: ['gym', 'home'], gear: [], load: 'bw', inc: 0, cue: 'Unterer Rücken bleibt am Boden, Beine nicht ganz ablegen.' }),
  ex({ id: 'crunches', name: 'Crunches', en: 'Crunches', pattern: 'core', tier: 3, primary: ['bauch'], ctx: ['gym', 'home'], gear: [], load: 'bw', inc: 0, cue: 'Langsam einrollen, oben 1 s halten, Kinn nicht zur Brust ziehen.' }),
  ex({ id: 'plank', name: 'Plank (Unterarmstütz)', en: 'Plank', pattern: 'core', tier: 3, primary: ['bauch'], ctx: ['gym', 'home'], gear: [], load: 'time', inc: 0, cue: 'Gesäß anspannen, Becken leicht nach hinten kippen, Körper als Linie.' }),
  ex({ id: 'dead_bug', name: 'Dead Bug', en: 'Dead Bug', pattern: 'core', tier: 3, primary: ['bauch'], ctx: ['gym', 'home'], gear: [], load: 'bw', inc: 0, cue: 'Rücken flach auf den Boden pressen, gegenüberliegenden Arm und Bein langsam strecken.' }),
  ex({ id: 'pallof_press', name: 'Pallof Press (Kabel / Band)', en: 'Pallof Press', pattern: 'core', tier: 3, primary: ['bauch'], ctx: ['gym', 'home'], gear: ['band'], load: 'cable', inc: 2.5, cue: 'Seitlich zum Kabel, Arme nach vorn strecken und gegen die Rotation halten.' }),
  ex({ id: 'seitstuetz', name: 'Seitstütz', en: 'Side Plank', pattern: 'core', tier: 3, primary: ['bauch'], ctx: ['gym', 'home'], gear: [], load: 'time', inc: 0, cue: 'Hüfte hoch, Körper als Linie, beide Seiten.' }),
];

export const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id) {
  return EXERCISE_BY_ID[id];
}

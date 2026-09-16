// Bewegungsmuster für die animierte Figur.
// Seitenansicht: Figur schaut nach rechts. Winkel: 0 = nach unten, 90 = nach vorn (rechts), 180 = nach oben, 270 = nach hinten.
// Vorderansicht: Winkel der linken Seite positiv = nach außen. Gliedmaßen als [Oberarm/Oberschenkel, Unterarm/Unterschenkel]
// oder als Zielpunkt { t: [x, y], bend } (inverse Kinematik). Boden bei y = 178, stehende Hüfte bei [100, 94], Knöchel bei y = 172.
const STAND = { hip: [100, 94], torso: 180, leg: { t: [100, 172], bend: '+x' }, arm: [0, 0] };
const FLAT_BENCH = [{ t: 'bench', x: 36, y: 128, w: 106, h: 12 }];
const SEAT = [{ t: 'rect', x: 58, y: 138, w: 50, h: 10 }, { t: 'rect', x: 54, y: 76, w: 10, h: 64 }, { t: 'line', x1: 83, y1: 148, x2: 83, y2: 178 }];
const SEATED = { hip: [84, 134], torso: 184, leg: [90, 0], foot: 90 };

export const MOTIONS = {
  // ======================================================= Beine
  squat_bar: {
    view: 'side', dur: 3200, hold: 'bar', holdAt: 'shoulder',
    frames: [
      { t: 0, ...STAND, arm: [-40, 143], label: 'Absenken' },
      { t: 0.42, hip: [88, 128], torso: 152, arm: [-68, 115], label: 'Unten kurz halten' },
      { t: 0.55, label: 'Hochdrücken' },
    ],
    steps: ['Stange auf dem oberen Rücken, Füße schulterbreit, Blick nach vorn.', 'Hüfte nach hinten und unten, Knie folgen den Zehen.', 'So tief wie sauber möglich, Oberschenkel mindestens parallel.', 'Mit dem ganzen Fuß hochdrücken, Hüfte oben ganz strecken.'],
    tempo: '2–3 s runter · 1 s hoch',
  },
  squat_front: {
    view: 'side', dur: 3200, hold: 'bar', holdAt: 'shoulderFront',
    frames: [
      { t: 0, ...STAND, arm: [95, 261], label: 'Absenken' },
      { t: 0.42, hip: [92, 130], torso: 166, arm: [81, 247], label: 'Unten kurz halten' },
      { t: 0.55, label: 'Hochdrücken' },
    ],
    steps: ['Gewicht vorn auf den Schultern, Ellbogen hoch.', 'Aufrecht in die Hocke, Knie folgen den Zehen.', 'Ellbogen bleiben oben, Brust raus.', 'Kraftvoll hochdrücken.'],
    tempo: '2–3 s runter · 1 s hoch',
  },
  squat_goblet: {
    view: 'side', dur: 3200, hold: 'kb',
    frames: [
      { t: 0, ...STAND, arm: { t: [108, 72], bend: '+y' }, label: 'Absenken' },
      { t: 0.42, hip: [90, 128], torso: 160, arm: { t: [112, 108], bend: '+y' }, label: 'Ellbogen zwischen die Knie' },
      { t: 0.55, label: 'Hochdrücken' },
    ],
    steps: ['Gewicht vor der Brust halten, Ellbogen nach unten.', 'Tief in die Hocke, Ellbogen zwischen die Knie.', 'Brust raus, Fersen bleiben unten.', 'Kraftvoll hochdrücken.'],
    tempo: '2–3 s runter · 1 s hoch',
  },
  squat_bw: {
    view: 'side', dur: 3000,
    frames: [
      { t: 0, ...STAND, label: 'Absenken' },
      { t: 0.42, hip: [88, 128], torso: 152, arm: [90, 90], label: 'Unten kurz halten' },
      { t: 0.55, label: 'Hochdrücken' },
    ],
    steps: ['Füße schulterbreit, Arme nach vorn zum Ausgleich.', 'Langsam absenken (3 s), Knie folgen den Zehen.', 'Unten kurz halten.', 'Hochdrücken, oben nicht ganz durchstrecken.'],
    tempo: '3 s runter · Pause · 1 s hoch',
  },
  squat_sumo_db: {
    view: 'front', dur: 3200, hold: 'db', holdArms: 'R',
    frames: [
      { t: 0, hip: [100, 94], torso: 180, legL: { t: [68, 172], bend: '-x' }, legR: { t: [132, 172], bend: '+x' }, armL: { t: [98, 104], bend: '-x' }, armR: { t: [102, 104], bend: '+x' }, label: 'Absenken' },
      { t: 0.42, hip: [100, 126], armL: { t: [98, 136], bend: '-x' }, armR: { t: [102, 136], bend: '+x' }, label: 'Knie nach außen' },
      { t: 0.55, label: 'Hochdrücken' },
    ],
    steps: ['Breiter Stand, Zehen leicht nach außen, Gewicht zwischen den Beinen.', 'Absenken, Knie aktiv nach außen drücken.', 'Oberkörper aufrecht.', 'Hochdrücken, Gesäß anspannen.'],
    tempo: '2 s runter · 1 s hoch',
  },
  leg_press: {
    view: 'side', dur: 3000, foot: 135,
    props: [{ t: 'rect', x: 45, y: 86, w: 12, h: 60, rot: -35 }, { t: 'rect', x: 50, y: 126, w: 30, h: 10, rot: 55 }],
    attach: [{ t: 'plate', at: 'ankleN', w: 10, h: 44, rot: 45, dx: 5, dy: -5 }],
    frames: [
      { t: 0, hip: [70, 128], torso: 215, foot: 135, leg: { t: [124, 72], bend: '-y' }, arm: { t: [82, 120], bend: '+y' }, label: 'Langsam absenken' },
      { t: 0.45, leg: { t: [100, 96], bend: '-y' }, label: 'Knie Richtung Brust' },
      { t: 0.52, label: 'Wegdrücken' },
    ],
    steps: ['Füße hüftbreit mittig auf der Platte, Rücken am Polster.', 'Langsam absenken bis die Knie etwa 90° haben.', 'Unterer Rücken bleibt am Polster.', 'Wegdrücken, Knie oben nicht durchstrecken.'],
    tempo: '2–3 s runter · 1 s hoch',
  },
  hack_squat: {
    view: 'side', dur: 3200,
    props: [{ t: 'rect', x: 94, y: 25, w: 12, h: 150, rot: -20 }],
    frames: [
      { t: 0, hip: [104, 92], torso: 200, leg: { t: [118, 172], bend: '+x' }, arm: [-30, 150], label: 'Absenken' },
      { t: 0.42, hip: [117, 130], label: 'Unten kurz halten' },
      { t: 0.55, label: 'Hochdrücken' },
    ],
    steps: ['Rücken am Polster, Füße etwas vor dem Körper.', 'Kontrolliert tief absenken.', 'Fersen bleiben auf der Plattform.', 'Hochdrücken, oben nicht einrasten.'],
    tempo: '2–3 s runter · 1 s hoch',
  },
  deadlift: {
    view: 'side', dur: 3400, hold: 'bar',
    frames: [
      { t: 0, hip: [70, 136], torso: 120, head: 30, leg: { t: [100, 172], bend: '+x' }, arm: { t: [104, 166], bend: '-x' }, label: 'Ziehen: Beine drücken, Rücken bleibt fest' },
      { t: 0.5, ...STAND, head: 0, label: 'Oben Hüfte strecken' },
      { t: 0.62, label: 'Kontrolliert ablassen' },
    ],
    steps: ['Stange über der Fußmitte, Schienbeine fast dran, Rücken gerade.', 'Brust raus, Spannung aufbauen, dann Beine in den Boden drücken.', 'Stange dicht am Körper, Hüfte und Knie strecken gleichzeitig.', 'Oben aufrecht, dann kontrolliert zurück.'],
    tempo: '1 s hoch · 2 s runter',
  },
  deadlift_sumo: {
    view: 'front', dur: 3400, hold: 'bar', barExt: 22,
    frames: [
      { t: 0, hip: [100, 130], torso: 180, legL: { t: [62, 172], bend: '-x' }, legR: { t: [138, 172], bend: '+x' }, armL: { t: [96, 160], bend: '-x' }, armR: { t: [104, 160], bend: '+x' }, label: 'Knie nach außen, ziehen' },
      { t: 0.5, hip: [100, 94], armL: { t: [92, 104], bend: '-x' }, armR: { t: [108, 104], bend: '+x' }, label: 'Oben strecken' },
      { t: 0.62, label: 'Kontrolliert ablassen' },
    ],
    steps: ['Breiter Stand, Zehen nach außen, Griff innerhalb der Beine.', 'Knie nach außen drücken, Brust hoch.', 'Beine in den Boden drücken, Hüfte nach vorn.', 'Kontrolliert zurück.'],
    tempo: '1 s hoch · 2 s runter',
  },
  rack_pull: {
    view: 'side', dur: 3000, hold: 'bar',
    props: [{ t: 'line', x1: 126, y1: 142, x2: 126, y2: 178 }],
    frames: [
      { t: 0, hip: [84, 114], torso: 140, head: 20, leg: { t: [100, 172], bend: '+x' }, arm: { t: [106, 140], bend: '-x' }, label: 'Ziehen' },
      { t: 0.5, ...STAND, head: 0, label: 'Oben strecken' },
      { t: 0.62, label: 'Ablassen' },
    ],
    steps: ['Stange auf Kniehöhe im Rack.', 'Rücken fest, Hüfte nach vorn strecken.', 'Oben Schulterblätter zusammen.', 'Kontrolliert ablassen.'],
    tempo: '1 s hoch · 2 s runter',
  },
  rdl: {
    view: 'side', dur: 3400, hold: 'bar',
    frames: [
      { t: 0, ...STAND, label: 'Hüfte nach hinten schieben' },
      { t: 0.45, hip: [86, 100], torso: 105, leg: { t: [100, 172], bend: '+x' }, label: 'Dehnung hinten spüren' },
      { t: 0.55, label: 'Hüfte nach vorn strecken' },
    ],
    steps: ['Aufrecht, Gewicht vor den Oberschenkeln, Knie leicht gebeugt.', 'Hüfte nach hinten schieben, Rücken bleibt gerade.', 'Gewicht dicht an den Beinen bis unter das Knie.', 'Mit dem Gesäß nach vorn strecken.'],
    tempo: '3 s runter · 1 s hoch',
  },
  good_morning: {
    view: 'side', dur: 3400, hold: 'bar', holdAt: 'shoulder',
    frames: [
      { t: 0, ...STAND, arm: [-40, 143], label: 'Hüfte nach hinten' },
      { t: 0.45, hip: [84, 102], torso: 112, arm: [-108, 75], leg: { t: [100, 172], bend: '+x' }, label: 'Rücken bleibt gerade' },
      { t: 0.55, label: 'Aufrichten' },
    ],
    steps: ['Stange auf dem oberen Rücken, Knie leicht gebeugt.', 'Hüfte nach hinten, Oberkörper bis fast waagerecht.', 'Rücken durchgehend gerade.', 'Mit dem Gesäß aufrichten.'],
    tempo: '3 s runter · 1 s hoch',
  },
  single_leg_rdl: {
    view: 'side', dur: 3600, hold: 'db',
    frames: [
      { t: 0, ...STAND, legF: [0, 0], label: 'Vorbeugen, Bein nach hinten' },
      { t: 0.45, hip: [90, 100], torso: 100, legN: { t: [100, 172], bend: '+x' }, legF: [-98, -98], label: 'Hüfte bleibt gerade' },
      { t: 0.55, label: 'Aufrichten' },
    ],
    steps: ['Auf einem Bein stehen, Knie leicht gebeugt.', 'Oberkörper vorbeugen, freies Bein nach hinten strecken.', 'Hüfte gerade halten, nicht aufdrehen.', 'Kontrolliert aufrichten.'],
    tempo: '3 s runter · 1 s hoch',
  },
  kb_swing: {
    view: 'side', dur: 1700, hold: 'kb',
    frames: [
      { t: 0, hip: [84, 104], torso: 108, leg: { t: [100, 172], bend: '+x' }, arm: { t: [100, 148], bend: '-x' }, label: 'Hüfte explosiv strecken' },
      { t: 0.5, ...STAND, torso: 182, arm: [92, 92], label: 'Zurück durch die Beine' },
    ],
    steps: ['Kettlebell zwischen den Beinen zurückschwingen, Rücken gerade.', 'Hüfte explosiv nach vorn strecken, Gesäß anspannen.', 'Arme bleiben locker, die Hüfte macht die Arbeit.', 'Kettlebell schwingt bis Brusthöhe, dann zurück.'],
    tempo: 'explosiv hoch · schwungvoll zurück',
  },
  pull_through: {
    view: 'side', dur: 2600, hold: 'handle', cables: [{ from: [14, 162], to: 'N' }],
    frames: [
      { t: 0, hip: [84, 104], torso: 108, leg: { t: [100, 172], bend: '+x' }, arm: { t: [100, 148], bend: '-x' }, label: 'Hüfte nach vorn strecken' },
      { t: 0.5, ...STAND, arm: [60, 60], label: 'Hüfte nach hinten' },
    ],
    steps: ['Mit dem Rücken zum Kabelzug, Seil zwischen den Beinen greifen.', 'Hüfte nach vorn strecken, Gesäß anspannen.', 'Oben aufrecht, nicht überstrecken.', 'Hüfte zurück, Rücken bleibt gerade.'],
    tempo: '1 s hoch · 2 s runter',
  },
  hip_thrust: {
    view: 'side', dur: 3000, hold: 'bar', holdAt: 'hip',
    props: [{ t: 'bench', x: 26, y: 116, w: 44, h: 14 }],
    frames: [
      { t: 0, hip: [92, 148], torso: 225, head: 0, leg: { t: [122, 172], bend: '-y' }, arm: { t: [94, 140], bend: '+y' }, label: 'Hüfte hochdrücken' },
      { t: 0.45, hip: [104, 120], torso: 267, head: -45, arm: { t: [104, 112], bend: '+y' }, label: 'Oben 1 s anspannen' },
      { t: 0.6, label: 'Langsam absenken' },
    ],
    steps: ['Schulterblätter auf der Bank, Füße hüftbreit, Gewicht auf der Hüfte.', 'Fersen in den Boden, Hüfte nach oben drücken.', 'Oben: Kinn zur Brust, Gesäß fest, Schienbeine senkrecht.', 'Langsam absenken.'],
    tempo: '1 s hoch · 1 s halten · 2 s runter',
  },
  glute_bridge: {
    view: 'side', dur: 3000,
    frames: [
      { t: 0, hip: [100, 170], torso: 270, head: 0, leg: { t: [122, 172], bend: '-y' }, arm: [88, 88], label: 'Fersen in den Boden' },
      { t: 0.45, hip: [96, 150], torso: 298, head: -28, label: 'Oben 1 s halten' },
      { t: 0.6, label: 'Langsam absenken' },
    ],
    steps: ['Rückenlage, Füße hüftbreit aufgestellt.', 'Fersen in den Boden, Hüfte nach oben drücken.', 'Oben Gesäß fest, Rippen nicht rausschieben.', 'Langsam absenken.'],
    tempo: '1 s hoch · 1 s halten · 2 s runter',
  },
  glute_bridge_single: {
    view: 'side', dur: 3000,
    frames: [
      { t: 0, hip: [100, 170], torso: 270, head: 0, legN: { t: [122, 172], bend: '-y' }, legF: [60, 60], arm: [88, 88], label: 'Mit einem Bein hochdrücken' },
      { t: 0.45, hip: [96, 150], torso: 298, head: -28, label: 'Oben 1 s halten' },
      { t: 0.6, label: 'Langsam absenken' },
    ],
    steps: ['Rückenlage, ein Fuß aufgestellt, das andere Bein gestreckt.', 'Mit der Ferse hochdrücken, Hüfte gerade halten.', 'Oben Gesäß fest.', 'Langsam absenken.'],
    tempo: '1 s hoch · 1 s halten · 2 s runter',
  },
  lunge: {
    view: 'side', dur: 3000, hold: 'db', holdArms: 'both',
    frames: [
      { t: 0, hip: [100, 104], torso: 180, legN: { t: [132, 172], bend: '+x' }, legF: { t: [58, 166], bend: '+y' }, foot: { N: 90, F: 60 }, arm: [0, 0], label: 'Absenken' },
      { t: 0.45, hip: [102, 126], legF: { t: [56, 160], bend: '+y' }, foot: { N: 90, F: 27 }, label: 'Hinteres Knie Richtung Boden' },
      { t: 0.55, label: 'Aus dem vorderen Bein hochdrücken' },
    ],
    steps: ['Langer Schritt, Oberkörper aufrecht.', 'Hinteres Knie Richtung Boden absenken.', 'Vorderes Knie zeigt über den Fuß.', 'Aus dem vorderen Bein hochdrücken.'],
    tempo: '2 s runter · 1 s hoch',
  },
  lunge_bar: {
    view: 'side', dur: 3000, hold: 'bar', holdAt: 'shoulder',
    frames: [
      { t: 0, hip: [100, 104], torso: 180, legN: { t: [132, 172], bend: '+x' }, legF: { t: [58, 166], bend: '+y' }, foot: { N: 90, F: 60 }, arm: [-40, 143], label: 'Absenken' },
      { t: 0.45, hip: [102, 126], legF: { t: [56, 160], bend: '+y' }, foot: { N: 90, F: 27 }, label: 'Hinteres Knie Richtung Boden' },
      { t: 0.55, label: 'Hochdrücken' },
    ],
    steps: ['Stange auf dem Rücken, langer Schritt.', 'Rumpf fest, hinteres Knie Richtung Boden.', 'Vorderes Knie über dem Fuß.', 'Kontrolliert hochdrücken.'],
    tempo: '2 s runter · 1 s hoch',
  },
  bulgarian: {
    view: 'side', dur: 3000, hold: 'db', holdArms: 'both',
    props: [{ t: 'box', x: 30, y: 140, w: 34, h: 38 }],
    frames: [
      { t: 0, hip: [104, 102], torso: 180, legN: { t: [132, 172], bend: '+x' }, legF: { t: [48, 136], bend: '+y' }, foot: { N: 90, F: -50 }, arm: [0, 0], label: 'Absenken' },
      { t: 0.45, hip: [104, 128], torso: 172, label: 'Vorderes Schienbein bleibt senkrecht' },
      { t: 0.55, label: 'Hochdrücken' },
    ],
    steps: ['Hinterer Fuß auf Bank oder Stuhl, vorderes Bein weit vorn.', 'Gerade absenken, hinteres Knie Richtung Boden.', 'Vorderes Schienbein fast senkrecht.', 'Aus dem vorderen Bein hochdrücken.'],
    tempo: '2 s runter · 1 s hoch',
  },
  step_up: {
    view: 'side', dur: 3000, box: [0, -16, 200, 216], hold: 'db', holdArms: 'both',
    props: [{ t: 'box', x: 118, y: 148, w: 46, h: 30 }],
    frames: [
      { t: 0, hip: [92, 94], torso: 180, legN: { t: [132, 142], bend: '-y' }, legF: { t: [92, 172], bend: '+x' }, foot: { N: 90, F: 90 }, arm: [0, 0], label: 'Aus dem vorderen Bein hochdrücken' },
      { t: 0.5, hip: [132, 64], legN: { t: [132, 142], bend: '+x' }, legF: { t: [128, 142], bend: '+x' }, label: 'Oben ganz strecken' },
      { t: 0.62, label: 'Langsam zurück' },
    ],
    steps: ['Fuß komplett auf der Stufe, Oberkörper aufrecht.', 'Nur aus dem vorderen Bein hochdrücken, nicht abspringen.', 'Oben Hüfte strecken.', 'Langsam zurück, das hintere Bein bremst.'],
    tempo: '1 s hoch · 2 s runter',
  },
  leg_extension: {
    view: 'side', dur: 3000, props: SEAT, attach: [{ t: 'roll', at: 'ankleN', r: 5, dx: 3, dy: -3 }],
    frames: [
      { t: 0, ...SEATED, torso: 186, arm: { t: [98, 140], bend: '-x' }, label: 'Strecken' },
      { t: 0.45, leg: [90, 92], foot: 180, label: 'Oben kurz anspannen' },
      { t: 0.55, label: 'Langsam ablassen' },
    ],
    steps: ['Kniegelenk auf Höhe der Drehachse, Polster über dem Knöchel.', 'Beine strecken, oben kurz anspannen.', 'Langsam ablassen (2–3 s).', 'Unten nicht ablegen, Spannung halten.'],
    tempo: '1 s hoch · 1 s halten · 2–3 s runter',
  },
  leg_extension_single: {
    view: 'side', dur: 3000, props: SEAT, attach: [{ t: 'roll', at: 'ankleN', r: 5, dx: 3, dy: -3 }],
    frames: [
      { t: 0, ...SEATED, torso: 186, legF: [90, 0], arm: { t: [98, 140], bend: '-x' }, label: 'Ein Bein strecken' },
      { t: 0.45, legN: [90, 92], foot: { N: 180, F: 90 }, label: 'Oben kurz anspannen' },
      { t: 0.55, label: 'Langsam ablassen' },
    ],
    steps: ['Ein Bein arbeitet, das andere bleibt hängen.', 'Strecken, oben anspannen.', 'Langsam ablassen.', 'Seite wechseln.'],
    tempo: '1 s hoch · 2–3 s runter',
  },
  leg_curl_seated: {
    view: 'side', dur: 3000, props: [...SEAT, { t: 'rect', x: 100, y: 118, w: 28, h: 8 }], attach: [{ t: 'roll', at: 'ankleN', r: 5, dx: -2, dy: 4 }],
    frames: [
      { t: 0, ...SEATED, leg: [90, 92], foot: 180, arm: { t: [98, 140], bend: '-x' }, label: 'Fersen nach unten ziehen' },
      { t: 0.45, leg: [90, 10], foot: 100, label: 'Unten kurz anspannen' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Polster über dem Knöchel, Oberschenkel fixiert.', 'Fersen kraftvoll nach unten ziehen.', 'Unten kurz anspannen.', 'Langsam zurück (3 s).'],
    tempo: '1 s runter · 3 s hoch',
  },
  leg_curl_lying: {
    view: 'side', dur: 3000, props: [{ t: 'bench', x: 34, y: 104, w: 100, h: 12 }], attach: [{ t: 'roll', at: 'ankleN', r: 5, dx: -2, dy: -4 }],
    frames: [
      { t: 0, hip: [94, 98], torso: 90, head: -20, leg: [270, 270], foot: 340, arm: { t: [150, 130], bend: '+x' }, label: 'Fersen zum Gesäß ziehen' },
      { t: 0.45, leg: [270, 170], foot: 250, label: 'Oben kurz anspannen' },
      { t: 0.55, label: 'Langsam ablassen' },
    ],
    steps: ['Bauchlage, Polster knapp über der Ferse.', 'Fersen Richtung Gesäß ziehen.', 'Hüfte bleibt auf dem Polster.', 'Langsam ablassen (3 s).'],
    tempo: '1 s hoch · 3 s runter',
  },
  leg_curl_standing: {
    view: 'side', dur: 2800, props: [{ t: 'line', x1: 126, y1: 80, x2: 126, y2: 178 }], attach: [{ t: 'roll', at: 'ankleN', r: 5, dx: -4, dy: 0 }],
    frames: [
      { t: 0, ...STAND, legN: [0, 0], arm: { t: [124, 100], bend: '-x' }, label: 'Ferse zum Gesäß' },
      { t: 0.45, legN: [0, -110], label: 'Oben anspannen' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Aufrecht stehen, festhalten.', 'Ferse Richtung Gesäß ziehen, Oberschenkel bleibt still.', 'Oben anspannen.', 'Langsam zurück.'],
    tempo: '1 s hoch · 3 s runter',
  },
  nordic_curl: {
    view: 'side', dur: 4200, props: [{ t: 'rect', x: 40, y: 158, w: 22, h: 12 }],
    frames: [
      { t: 0, hip: [100, 128], torso: 180, leg: [0, 270], foot: 270, arm: { t: [110, 74], bend: '+y' }, label: 'Langsam nach vorn sinken' },
      { t: 0.3, hip: [125.7, 137.4], torso: 140, arm: { t: [162, 116], bend: '+y' } },
      { t: 0.55, hip: [135.3, 149.2], torso: 118, arm: { t: [190, 172], bend: '-x' }, label: 'Mit den Händen abfangen' },
      { t: 0.68, label: 'Zurückziehen' },
    ],
    steps: ['Kniend, Fersen fixiert, Körper von Knie bis Kopf gerade.', 'So langsam wie möglich nach vorn sinken.', 'Mit den Händen abfangen, kurz drücken.', 'Mit den Beinbeugern zurückziehen (oder mit den Armen helfen).'],
    tempo: 'so langsam wie möglich runter',
  },
  hyperextension: {
    view: 'side', dur: 3200,
    props: [{ t: 'rect', x: 82, y: 118, w: 22, h: 14 }, { t: 'line', x1: 93, y1: 132, x2: 93, y2: 178 }, { t: 'rect', x: 34, y: 164, w: 14, h: 10 }],
    frames: [
      { t: 0, hip: [96, 116], torso: 125, leg: [-46, -46], foot: 0, arm: { ar: [-150, 90] }, len: { farm: 0.5 }, label: 'Langsam absenken' },
      { t: 0.45, torso: 70, label: 'Unten kurz halten' },
      { t: 0.55, label: 'Hochkommen bis zur geraden Linie' },
    ],
    steps: ['Hüfte auf dem Polster, Füße fixiert, Arme vor der Brust.', 'Oberkörper langsam absenken.', 'Mit Gesäß und Rücken hochkommen.', 'Oben nur bis zur geraden Linie, nicht überstrecken.'],
    tempo: '2 s runter · 1 s hoch',
  },
  reverse_hyper: {
    view: 'side', dur: 3000, props: [{ t: 'bench', x: 40, y: 100, w: 64, h: 14 }],
    frames: [
      { t: 0, hip: [96, 96], torso: 90, head: -15, leg: [0, 0], arm: { t: [150, 120], bend: '+x' }, label: 'Beine anheben' },
      { t: 0.45, leg: [-88, -88], label: 'Oben Gesäß anspannen' },
      { t: 0.55, label: 'Langsam ablassen' },
    ],
    steps: ['Bauchlage auf dem Polster, Beine hängen frei.', 'Beine gestreckt bis zur Waagerechten anheben.', 'Oben Gesäß anspannen.', 'Langsam ablassen, nicht schwingen.'],
    tempo: '1 s hoch · 2 s runter',
  },
  superman: {
    view: 'side', dur: 3200,
    frames: [
      { t: 0, hip: [100, 170], torso: 90, head: -20, arm: [90, 90], leg: [270, 270], foot: 0, label: 'Arme und Beine anheben' },
      { t: 0.4, arm: [110, 110], leg: [250, 250], head: -35, label: '2 s halten' },
      { t: 0.65, label: 'Langsam ablegen' },
    ],
    steps: ['Bauchlage, Arme nach vorn gestreckt.', 'Arme, Brust und Beine gleichzeitig anheben.', '2 s halten, Blick zum Boden.', 'Langsam ablegen.'],
    tempo: '1 s hoch · 2 s halten',
  },
  kickback_cable: {
    view: 'side', dur: 2800, props: [{ t: 'line', x1: 128, y1: 60, x2: 128, y2: 178 }], cables: [{ from: [128, 172], to: 'N', at: 'ankle' }],
    frames: [
      { t: 0, hip: [96, 94], torso: 165, legF: { t: [100, 172], bend: '+x' }, legN: [5, 5], arm: { t: [126, 92], bend: '-x' }, label: 'Bein nach hinten strecken' },
      { t: 0.45, legN: [-60, -50], label: 'Oben Gesäß anspannen' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Manschette am Knöchel, festhalten, leicht vorbeugen.', 'Bein gestreckt nach hinten führen.', 'Oben Gesäß anspannen, Rücken nicht überstrecken.', 'Langsam zurück.'],
    tempo: '1 s hoch · 2 s runter',
  },
  donkey_kick: {
    view: 'side', dur: 2600,
    frames: [
      { t: 0, hip: [80, 126], torso: 90, head: 25, arm: [0, 0], legF: [0, 270], legN: [0, 270], foot: 300, label: 'Ferse zur Decke' },
      { t: 0.45, legN: [-110, 180], foot: { N: 270, F: 300 }, label: 'Oben anspannen' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Vierfüßlerstand, Hände unter den Schultern.', 'Ein Bein gebeugt nach oben, Ferse zur Decke.', 'Oben Gesäß anspannen, Rücken bleibt neutral.', 'Langsam zurück.'],
    tempo: '1 s hoch · 2 s runter',
  },
  hip_abduction: {
    view: 'front', dur: 2600, props: [{ t: 'line', x1: 66, y1: 60, x2: 66, y2: 178 }],
    frames: [
      { t: 0, hip: [100, 94], torso: 180, legL: [2, 0], legR: [2, 0], armL: { t: [68, 100], bend: '-x' }, armR: [0, 0], label: 'Bein zur Seite anheben' },
      { t: 0.45, legR: [38, 38], label: 'Oben kurz halten' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Aufrecht stehen, festhalten.', 'Bein gestreckt zur Seite anheben.', 'Oberkörper bleibt gerade, nicht zur Seite lehnen.', 'Langsam zurück.'],
    tempo: '1 s hoch · 2 s runter',
  },
  hip_abduction_band: {
    view: 'front', dur: 2600, links: [{ a: 'ankleL', b: 'ankleR', cls: 'band' }],
    frames: [
      { t: 0, hip: [100, 94], torso: 180, legL: [4, 0], legR: [4, 0], arm: { t: [100, 96], bend: '-x' }, armL: { t: [96, 96], bend: '-x' }, armR: { t: [104, 96], bend: '+x' }, label: 'Gegen das Band nach außen' },
      { t: 0.45, legR: [36, 36], label: 'Kurz halten' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Band um die Knöchel, leicht in den Knien.', 'Bein gegen den Widerstand nach außen.', 'Oberkörper ruhig.', 'Langsam zurück.'],
    tempo: '1 s hoch · 2 s runter',
  },
  band_walk: {
    view: 'front', dur: 1800, links: [{ a: 'ankleL', b: 'ankleR', cls: 'band' }],
    frames: [
      { t: 0, hip: [100, 100], torso: 180, legL: { t: [86, 172], bend: '-x' }, legR: { t: [114, 172], bend: '+x' }, armL: { t: [96, 100], bend: '-x' }, armR: { t: [104, 100], bend: '+x' }, label: 'Seitwärts schreiten, Band gespannt' },
      { t: 0.5, legR: { t: [146, 172], bend: '+x' } },
    ],
    steps: ['Band über den Knien oder Knöcheln, leichte Kniebeuge.', 'Seitwärts schreiten, Band bleibt gespannt.', 'Füße zeigen nach vorn, Oberkörper ruhig.', 'Hin und zurück.'],
    tempo: 'ruhig, gleichmäßig',
  },
  hip_adduction: {
    view: 'front', dur: 2600, cables: [{ from: [190, 176], to: 'R', at: 'ankle' }], props: [{ t: 'line', x1: 66, y1: 60, x2: 66, y2: 178 }],
    frames: [
      { t: 0, hip: [100, 94], torso: 180, legL: [2, 0], legR: [40, 40], armL: { t: [68, 100], bend: '-x' }, armR: [0, 0], label: 'Bein nach innen ziehen' },
      { t: 0.45, legR: [4, 4], label: 'Innen kurz anspannen' },
      { t: 0.55, label: 'Langsam nach außen' },
    ],
    steps: ['Manschette am Knöchel, festhalten.', 'Bein gegen den Zug nach innen führen.', 'Oberkörper ruhig, Hüfte gerade.', 'Langsam zurück nach außen.'],
    tempo: '1 s rein · 2 s raus',
  },
  calf_raise: {
    view: 'side', dur: 2600, hold: 'db',
    frames: [
      { t: 0, ...STAND, foot: 82, label: 'Auf die Zehenspitzen' },
      { t: 0.4, hip: [100, 84], leg: { t: [100, 162], bend: '+x' }, foot: 46, label: 'Oben 1 s halten' },
      { t: 0.55, label: 'Langsam ab, Ferse tief' },
    ],
    steps: ['Fußballen auf einer Kante, Ferse hängt tief.', 'Kraftvoll auf die Zehenspitzen.', 'Oben 1 s halten.', 'Langsam absenken, unten die Dehnung spüren.'],
    tempo: '1 s hoch · 1 s halten · 2 s runter',
  },
  calf_raise_bar: {
    view: 'side', dur: 2600, hold: 'bar', holdAt: 'shoulder',
    frames: [
      { t: 0, ...STAND, arm: [-40, 143], foot: 82, label: 'Auf die Zehenspitzen' },
      { t: 0.4, hip: [100, 84], leg: { t: [100, 162], bend: '+x' }, foot: 46, label: 'Oben 1 s halten' },
      { t: 0.55, label: 'Langsam ab, Ferse tief' },
    ],
    steps: ['Polster auf den Schultern, Fußballen auf der Kante.', 'Auf die Zehenspitzen drücken.', 'Oben 1 s halten.', 'Langsam absenken, Ferse tief.'],
    tempo: '1 s hoch · 1 s halten · 2 s runter',
  },
  calf_raise_seated: {
    view: 'side', dur: 2600, props: [{ t: 'rect', x: 60, y: 138, w: 48, h: 10 }, { t: 'line', x1: 84, y1: 148, x2: 84, y2: 178 }], attach: [{ t: 'plate', at: 'kneeN', w: 26, h: 7, dy: -8 }],
    frames: [
      { t: 0, hip: [84, 134], torso: 184, leg: [90, 0], foot: 82, arm: { t: [110, 128], bend: '-x' }, label: 'Fersen hochdrücken' },
      { t: 0.4, leg: [101, 0], foot: 46, label: 'Oben 1 s halten' },
      { t: 0.55, label: 'Langsam ab' },
    ],
    steps: ['Polster auf den Oberschenkeln, Fußballen auf der Kante.', 'Fersen so hoch wie möglich drücken.', 'Oben 1 s halten.', 'Langsam absenken, unten dehnen.'],
    tempo: '1 s hoch · 1 s halten · 2 s runter',
  },
  tibialis: {
    view: 'side', dur: 2200, props: [{ t: 'line', x1: 86, y1: 40, x2: 86, y2: 178 }],
    frames: [
      { t: 0, hip: [96, 94], torso: 186, leg: { t: [116, 172], bend: '+x' }, foot: 90, arm: [0, 0], label: 'Zehen anheben' },
      { t: 0.45, foot: 124, label: 'Oben halten' },
      { t: 0.55, label: 'Langsam ab' },
    ],
    steps: ['Rücken an der Wand, Füße einen Schritt vor.', 'Zehen so weit wie möglich anheben, Fersen bleiben.', 'Oben kurz halten.', 'Langsam ab.'],
    tempo: '1 s hoch · 2 s runter',
  },
  pistol_squat: {
    view: 'side', dur: 3600,
    frames: [
      { t: 0, ...STAND, legF: [90, 90], arm: [90, 90], label: 'Langsam absenken' },
      { t: 0.45, hip: [84, 140], torso: 150, legN: { t: [100, 172], bend: '+x' }, legF: [92, 92], label: 'Ferse bleibt unten' },
      { t: 0.55, label: 'Hochdrücken' },
    ],
    steps: ['Auf einem Bein, das andere nach vorn gestreckt, Arme vor.', 'Langsam absenken, Ferse bleibt am Boden.', 'So tief wie möglich, festhalten erlaubt.', 'Hochdrücken.'],
    tempo: '3 s runter · 1 s hoch',
  },
  sissy_squat: {
    view: 'side', dur: 3400, props: [{ t: 'line', x1: 60, y1: 70, x2: 60, y2: 178 }],
    frames: [
      { t: 0, ...STAND, arm: { t: [64, 100], bend: '-x' }, foot: 90, label: 'Knie nach vorn, Oberkörper zurück' },
      { t: 0.45, hip: [112, 116], torso: 214, leg: { t: [100, 172], bend: '+x' }, foot: 73, label: 'Eine Linie von Knie bis Schulter' },
      { t: 0.55, label: 'Zurück nach oben' },
    ],
    steps: ['Festhalten, Füße hüftbreit.', 'Knie nach vorn schieben, Oberkörper zurücklehnen, Fersen heben sich.', 'Körper von Knie bis Schulter gerade.', 'Über den Quadrizeps zurück.'],
    tempo: '3 s runter · 1 s hoch',
  },
  spanish_squat: {
    view: 'side', dur: 3200, cables: [{ from: [180, 140], to: 'N', at: 'knee', cls: 'band', pulley: false }],
    frames: [
      { t: 0, hip: [94, 96], torso: 180, leg: { t: [100, 172], bend: '+x' }, arm: [90, 90], label: 'Hüfte nach hinten setzen' },
      { t: 0.45, hip: [62, 132], torso: 178, label: 'Schienbeine bleiben senkrecht' },
      { t: 0.55, label: 'Hochdrücken' },
    ],
    steps: ['Band hinter den Knien an einem Pfosten, Zug nach vorn.', 'Hüfte nach hinten setzen, Schienbeine senkrecht.', 'Oberkörper aufrecht, Spannung im Quadrizeps.', 'Hochdrücken.'],
    tempo: '3 s runter · 1 s hoch',
  },
};

// ======================================================= Drücken
Object.assign(MOTIONS, {
  bench_press: {
    view: 'side', dur: 3000, hold: 'bar', props: FLAT_BENCH,
    frames: [
      { t: 0, hip: [110, 122], torso: 270, leg: { t: [140, 172], bend: '-y' }, arm: { t: [76, 72], bend: '+x' }, label: 'Kontrolliert absenken' },
      { t: 0.45, arm: { t: [84, 104], bend: '+x' }, label: 'Zur Brust, Ellbogen leicht angelegt' },
      { t: 0.52, label: 'Kraftvoll hochdrücken' },
    ],
    steps: ['Schulterblätter zusammen, Füße fest am Boden, Griff etwas breiter als schulterbreit.', 'Stange kontrolliert zur unteren Brust, Ellbogen etwa 45° vom Körper.', 'Kurz berühren, nicht abprallen.', 'Kraftvoll hochdrücken, Stange über die Schulter.'],
    tempo: '2 s runter · 1 s hoch',
  },
  bench_press_db: {
    view: 'side', dur: 3000, hold: 'db', holdArms: 'both', props: FLAT_BENCH,
    frames: [
      { t: 0, hip: [110, 122], torso: 270, leg: { t: [140, 172], bend: '-y' }, arm: { t: [76, 72], bend: '+x' }, label: 'Kontrolliert absenken' },
      { t: 0.45, arm: { t: [84, 106], bend: '+x' }, label: 'Tief absenken, Dehnung spüren' },
      { t: 0.52, label: 'Hochdrücken' },
    ],
    steps: ['Kurzhanteln über der Brust, Schulterblätter zusammen.', 'Kontrolliert absenken, Ellbogen etwa 45° vom Körper.', 'Etwas tiefer als mit der Stange.', 'Hochdrücken, oben leicht zusammenführen.'],
    tempo: '2 s runter · 1 s hoch',
  },
  incline_press: {
    view: 'side', dur: 3000, hold: 'bar', props: [{ t: 'bench', x: 40, y: 128, w: 100, h: 12, tilt: 28 }],
    frames: [
      { t: 0, hip: [112, 132], torso: 242, leg: { t: [146, 172], bend: '-y' }, arm: { t: [98, 68], bend: '+x' }, label: 'Absenken zur oberen Brust' },
      { t: 0.45, arm: { t: [84, 95], bend: '+x' }, label: 'Kurz berühren' },
      { t: 0.52, label: 'Hochdrücken' },
    ],
    steps: ['Bank auf 30°, Schulterblätter zusammen.', 'Zur oberen Brust absenken.', 'Ellbogen leicht angelegt.', 'Hochdrücken über die Schulter.'],
    tempo: '2 s runter · 1 s hoch',
  },
  incline_press_db: {
    view: 'side', dur: 3000, hold: 'db', holdArms: 'both', props: [{ t: 'bench', x: 40, y: 128, w: 100, h: 12, tilt: 28 }],
    frames: [
      { t: 0, hip: [112, 132], torso: 242, leg: { t: [146, 172], bend: '-y' }, arm: { t: [98, 68], bend: '+x' }, label: 'Absenken' },
      { t: 0.45, arm: { t: [84, 96], bend: '+x' }, label: 'Dehnung spüren' },
      { t: 0.52, label: 'Hochdrücken' },
    ],
    steps: ['Bank auf 30°, Kurzhanteln über der oberen Brust.', 'Kontrolliert absenken.', 'Ellbogen etwa 45° vom Körper.', 'Hochdrücken, oben leicht zusammen.'],
    tempo: '2 s runter · 1 s hoch',
  },
  decline_press: {
    view: 'side', dur: 3000, hold: 'bar', props: [{ t: 'bench', x: 40, y: 124, w: 100, h: 12, tilt: -16 }],
    frames: [
      { t: 0, hip: [106, 118], torso: 292, leg: { t: [148, 156], bend: '-y' }, arm: { t: [70, 82], bend: '+x' }, label: 'Absenken' },
      { t: 0.45, arm: { t: [82, 112], bend: '+x' }, label: 'Zur unteren Brust' },
      { t: 0.52, label: 'Hochdrücken' },
    ],
    steps: ['Bank leicht negativ, Füße eingehakt.', 'Zur unteren Brust absenken.', 'Ellbogen leicht angelegt.', 'Hochdrücken.'],
    tempo: '2 s runter · 1 s hoch',
  },
  floor_press: {
    view: 'side', dur: 3000, hold: 'bar',
    frames: [
      { t: 0, hip: [110, 170], torso: 270, leg: { t: [140, 172], bend: '-y' }, arm: { t: [76, 120], bend: '+x' }, label: 'Absenken bis der Ellbogen den Boden berührt' },
      { t: 0.45, arm: { t: [86, 148], bend: '+x' }, label: 'Kurz halten' },
      { t: 0.55, label: 'Hochdrücken' },
    ],
    steps: ['Rückenlage am Boden, Knie angewinkelt.', 'Absenken bis die Oberarme den Boden berühren.', 'Kurz halten, nicht abprallen.', 'Hochdrücken.'],
    tempo: '2 s runter · 1 s hoch',
  },
  chest_press_machine: {
    view: 'side', dur: 3000, hold: 'handle', props: SEAT,
    frames: [
      { t: 0, ...SEATED, arm: { t: [104, 96], bend: '-x' }, label: 'Nach vorn drücken' },
      { t: 0.45, arm: { t: [130, 94], bend: '-x' }, label: 'Kurz halten' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Griffe auf Brusthöhe, Rücken am Polster.', 'Nach vorn drücken, Ellbogen nicht ganz durchstrecken.', 'Kurz halten.', 'Langsam zurück, Brust dehnen.'],
    tempo: '1 s hoch · 2 s runter',
  },
  cable_press_standing: {
    view: 'side', dur: 3000, hold: 'handle', cables: [{ from: [20, 40], to: 'N' }],
    frames: [
      { t: 0, hip: [100, 94], torso: 176, legN: { t: [116, 172], bend: '+x' }, legF: { t: [84, 172], bend: '+x' }, arm: { t: [104, 62], bend: '-x' }, label: 'Nach vorn drücken' },
      { t: 0.45, arm: { t: [150, 64], bend: '-x' }, label: 'Vorn zusammenführen' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Schrittstellung, Griffe auf Brusthöhe, leicht vorgelehnt.', 'Nach vorn drücken und die Hände zusammenführen.', 'Brust anspannen.', 'Langsam zurück.'],
    tempo: '1 s hoch · 2 s runter',
  },
  landmine_press: {
    view: 'side', dur: 3000, hold: 'bar', plateR: 4, cables: [{ from: [40, 176], to: 'N', cls: 'barline', pulley: false }],
    frames: [
      { t: 0, hip: [100, 94], torso: 176, legN: { t: [116, 172], bend: '+x' }, legF: { t: [84, 172], bend: '+x' }, arm: { t: [112, 62], bend: '-x' }, label: 'Schräg nach vorn oben drücken' },
      { t: 0.45, arm: { t: [148, 30], bend: '-x' }, label: 'Oben strecken' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Stangenende vor der Schulter, Schrittstellung.', 'Schräg nach vorn oben drücken.', 'Rumpf fest, nicht ins Hohlkreuz.', 'Langsam zurück.'],
    tempo: '1 s hoch · 2 s runter',
  },
  dips: {
    view: 'side', dur: 3000, props: [{ t: 'line', x1: 100, y1: 92, x2: 100, y2: 178 }, { t: 'circle', x: 100, y: 92, r: 4, cls: 'handle' }],
    frames: [
      { t: 0, hip: [107, 83], torso: 190, leg: [-20, -120], arm: { t: [100, 92], bend: '-x' }, label: 'Langsam absenken' },
      { t: 0.45, hip: [114, 106], torso: 200, head: -10, label: 'Oberarme etwa parallel' },
      { t: 0.52, label: 'Hochdrücken' },
    ],
    steps: ['Gestreckte Arme auf den Holmen, leicht vorgelehnt.', 'Langsam absenken bis die Oberarme etwa parallel sind.', 'Schultern nicht hochziehen.', 'Hochdrücken.'],
    tempo: '2 s runter · 1 s hoch',
  },
  bench_dip: {
    view: 'side', dur: 3000, props: [{ t: 'bench', x: 20, y: 130, w: 44, h: 12 }],
    frames: [
      { t: 0, hip: [80, 118], torso: 180, leg: { t: [144, 168], bend: '-y' }, arm: { t: [60, 128], bend: '-x' }, label: 'Absenken' },
      { t: 0.45, hip: [80, 140], label: 'Ellbogen zeigen nach hinten' },
      { t: 0.52, label: 'Hochdrücken' },
    ],
    steps: ['Hände auf der Bankkante, Beine nach vorn.', 'Absenken, Ellbogen zeigen nach hinten.', 'Nicht tiefer als 90°, Schultern entspannt.', 'Hochdrücken.'],
    tempo: '2 s runter · 1 s hoch',
  },
  pushup: {
    view: 'side', dur: 2800,
    frames: [
      { t: 0, hip: [85, 136], torso: 70, leg: [290, 290], foot: 0, arm: { t: [124, 172], bend: '-x' }, label: 'Absenken, Ellbogen nah am Körper' },
      { t: 0.45, hip: [88, 152], torso: 82, leg: [278, 278], label: 'Brust knapp über dem Boden' },
      { t: 0.52, label: 'Hochdrücken' },
    ],
    steps: ['Hände unter den Schultern, Körper eine Linie, Gesäß fest.', 'Absenken, Ellbogen etwa 45° vom Körper.', 'Brust knapp über dem Boden.', 'Hochdrücken, oben Schulterblätter auseinander.'],
    tempo: '2 s runter · 1 s hoch',
  },
  pushup_knee: {
    view: 'side', dur: 2800,
    frames: [
      { t: 0, hip: [87.7, 137.4], torso: 70, leg: [-40, 270], foot: 300, arm: { t: [131, 172], bend: '-x' }, label: 'Absenken' },
      { t: 0.45, hip: [94.8, 145.1], torso: 82, leg: [-55, 270], label: 'Brust Richtung Boden' },
      { t: 0.52, label: 'Hochdrücken' },
    ],
    steps: ['Knie am Boden, Körper von Knie bis Kopf eine Linie.', 'Absenken, Ellbogen etwa 45° vom Körper.', 'Brust Richtung Boden.', 'Hochdrücken.'],
    tempo: '2 s runter · 1 s hoch',
  },
  pushup_incline: {
    view: 'side', dur: 2800, props: [{ t: 'box', x: 122, y: 138, w: 48, h: 40 }],
    frames: [
      { t: 0, hip: [74, 118], torso: 125, leg: [305, 305], foot: 0, arm: { t: [137, 135], bend: '-x' }, label: 'Absenken' },
      { t: 0.45, hip: [82, 126], torso: 115, leg: [295, 295], label: 'Brust zur Kante' },
      { t: 0.52, label: 'Hochdrücken' },
    ],
    steps: ['Hände auf einer Erhöhung, Körper eine Linie.', 'Absenken, Ellbogen leicht angelegt.', 'Brust zur Kante.', 'Hochdrücken.'],
    tempo: '2 s runter · 1 s hoch',
  },
  pike_pushup: {
    view: 'side', dur: 2800,
    frames: [
      { t: 0, hip: [85, 102], torso: 40, leg: [-35, -35], foot: 10, arm: { t: [144, 172], bend: '-x' }, label: 'Kopf Richtung Boden' },
      { t: 0.45, hip: [96, 116], torso: 55, leg: { t: [40, 166], bend: '-y' }, label: 'Ellbogen nach hinten' },
      { t: 0.52, label: 'Hochdrücken' },
    ],
    steps: ['Umgekehrtes V: Hüfte hoch, Hände schulterbreit.', 'Kopf Richtung Boden zwischen die Hände.', 'Ellbogen zeigen nach hinten.', 'Hochdrücken.'],
    tempo: '2 s runter · 1 s hoch',
  },
  pike_pushup_box: {
    view: 'side', dur: 2800, props: [{ t: 'box', x: 20, y: 140, w: 40, h: 38 }],
    frames: [
      { t: 0, hip: [98.5, 85.5], torso: 20, leg: { t: [40, 134], bend: '-y' }, foot: 10, arm: { t: [130, 172], bend: '-x' }, label: 'Kopf Richtung Boden' },
      { t: 0.45, hip: [104, 96], torso: 32, label: 'Ellbogen nach hinten' },
      { t: 0.52, label: 'Hochdrücken' },
    ],
    steps: ['Füße auf einer Erhöhung, Hüfte hoch, Oberkörper fast senkrecht.', 'Kopf Richtung Boden absenken.', 'Ellbogen zeigen nach hinten.', 'Hochdrücken.'],
    tempo: '2 s runter · 1 s hoch',
  },
  handstand_pushup: {
    view: 'side', dur: 3000, box: [0, -24, 200, 224], props: [{ t: 'line', x1: 114, y1: -24, x2: 114, y2: 178 }],
    frames: [
      { t: 0, hip: [100, 80], torso: 0, leg: [180, 180], foot: 90, arm: { t: [100, 172], bend: '-x' }, label: 'Kopf Richtung Boden' },
      { t: 0.45, hip: [104, 104], label: 'Kurz vor dem Boden' },
      { t: 0.52, label: 'Hochdrücken' },
    ],
    steps: ['Handstand an der Wand, Hände schulterbreit.', 'Kontrolliert absenken, Kopf Richtung Boden.', 'Rumpf fest, kein Hohlkreuz.', 'Hochdrücken.'],
    tempo: '2 s runter · 1 s hoch',
  },
  ohp: {
    view: 'front', dur: 3000, box: [0, -22, 200, 222], hold: 'bar',
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [5, 5], armL: { t: [80, 60], bend: '+y' }, armR: { t: [120, 60], bend: '+y' }, label: 'Über den Kopf drücken' },
      { t: 0.45, armL: { t: [90, 2], bend: '+y' }, armR: { t: [110, 2], bend: '+y' }, label: 'Oben ganz strecken' },
      { t: 0.55, label: 'Langsam zurück zur Schulter' },
    ],
    steps: ['Stange auf der Schulter, Griff etwas breiter als schulterbreit, Gesäß fest.', 'Gerade nach oben drücken, Kopf leicht zurück.', 'Oben ganz strecken, Kopf durch.', 'Langsam zurück zur Schulter.'],
    tempo: '1 s hoch · 2 s runter',
  },
  ohp_db: {
    view: 'front', dur: 3000, box: [0, -22, 200, 222], hold: 'db',
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [5, 5], armL: { t: [76, 58], bend: '+y' }, armR: { t: [124, 58], bend: '+y' }, label: 'Über den Kopf drücken' },
      { t: 0.45, armL: { t: [92, 2], bend: '+y' }, armR: { t: [108, 2], bend: '+y' }, label: 'Oben zusammenführen' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Kurzhanteln auf Schulterhöhe, Rumpf fest.', 'Nach oben drücken, Hanteln oben leicht zusammen.', 'Nicht ins Hohlkreuz.', 'Langsam zurück.'],
    tempo: '1 s hoch · 2 s runter',
  },
  ohp_seated: {
    view: 'front', dur: 3000, box: [0, -22, 200, 222], hold: 'db', props: [{ t: 'rect', x: 78, y: 132, w: 44, h: 10 }, { t: 'rect', x: 82, y: 80, w: 36, h: 6 }],
    frames: [
      { t: 0, hip: [100, 126], torso: 180, leg: [14, 0], len: { thigh: 0.3 }, armL: { t: [76, 58], bend: '+y' }, armR: { t: [124, 58], bend: '+y' }, label: 'Über den Kopf drücken' },
      { t: 0.45, armL: { t: [92, 2], bend: '+y' }, armR: { t: [108, 2], bend: '+y' }, label: 'Oben strecken' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Sitzend, Rücken am Polster, Gewicht auf Schulterhöhe.', 'Gerade nach oben drücken.', 'Oben strecken, nicht einrasten.', 'Langsam zurück.'],
    tempo: '1 s hoch · 2 s runter',
  },
  ohp_single: {
    view: 'front', dur: 3000, box: [0, -22, 200, 222], hold: 'db', holdArms: 'R',
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [5, 5], armL: { t: [88, 100], bend: '-x' }, armR: { t: [124, 58], bend: '+y' }, label: 'Einarmig nach oben drücken' },
      { t: 0.45, armR: { t: [106, 2], bend: '+y' }, label: 'Oben strecken' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Ein Gewicht auf Schulterhöhe, andere Hand an der Hüfte.', 'Nach oben drücken, Rumpf gegen das Kippen anspannen.', 'Oben strecken.', 'Langsam zurück, dann Seite wechseln.'],
    tempo: '1 s hoch · 2 s runter',
  },
  push_press: {
    view: 'front', dur: 2400, box: [0, -22, 200, 222], hold: 'bar',
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [5, 5], armL: { t: [80, 60], bend: '+y' }, armR: { t: [120, 60], bend: '+y' }, label: 'Kurzer Dip' },
      { t: 0.25, hip: [100, 106], legL: { t: [90, 172], bend: '-x' }, legR: { t: [110, 172], bend: '+x' }, armL: { t: [80, 72], bend: '+y' }, armR: { t: [120, 72], bend: '+y' }, label: 'Explosiv hochdrücken' },
      { t: 0.5, hip: [100, 94], legL: [5, 5], legR: [5, 5], armL: { t: [90, 2], bend: '+y' }, armR: { t: [110, 2], bend: '+y' }, label: 'Oben strecken' },
      { t: 0.62, label: 'Kontrolliert zurück' },
    ],
    steps: ['Stange auf der Schulter, Füße hüftbreit.', 'Kurzer, schneller Dip aus den Knien.', 'Beine explosiv strecken und die Stange nach oben treiben.', 'Oben strecken, dann kontrolliert zurück.'],
    tempo: 'explosiv hoch · 2 s runter',
  },
  fly: {
    view: 'front', dur: 3000, hold: 'db',
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [4, 4], armL: { t: [50, 52], bend: '+y' }, armR: { t: [150, 52], bend: '+y' }, label: 'Bögen nach vorn zusammenführen' },
      { t: 0.45, armL: { t: [95, 64], bend: '+y' }, armR: { t: [105, 64], bend: '+y' }, label: 'Brust anspannen' },
      { t: 0.55, label: 'Weit öffnen, leichte Beugung im Ellbogen' },
    ],
    steps: ['Arme leicht gebeugt, Ellbogenwinkel bleibt gleich.', 'In einem weiten Bogen vor der Brust zusammenführen.', 'Brust anspannen.', 'Kontrolliert öffnen, Dehnung spüren.'],
    tempo: '1 s zusammen · 2 s öffnen',
  },
  fly_cable_high: {
    view: 'front', dur: 3000, hold: 'handle', cables: [{ from: [10, 30], to: 'L' }, { from: [190, 30], to: 'R' }],
    frames: [
      { t: 0, hip: [100, 94], torso: 178, leg: [8, 8], armL: { t: [50, 52], bend: '+y' }, armR: { t: [150, 52], bend: '+y' }, label: 'Von oben nach vorn unten ziehen' },
      { t: 0.45, armL: { t: [95, 92], bend: '+y' }, armR: { t: [105, 92], bend: '+y' }, label: 'Hände vor der Hüfte zusammen' },
      { t: 0.55, label: 'Kontrolliert öffnen' },
    ],
    steps: ['Züge oben, leicht vorgelehnt, Arme leicht gebeugt.', 'In einem Bogen nach vorn unten ziehen.', 'Hände vor der Hüfte zusammen, Brust anspannen.', 'Kontrolliert öffnen.'],
    tempo: '1 s zusammen · 2 s öffnen',
  },
  fly_cable_low: {
    view: 'front', dur: 3000, hold: 'handle', cables: [{ from: [10, 176], to: 'L' }, { from: [190, 176], to: 'R' }],
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [8, 8], armL: { t: [56, 96], bend: '+y' }, armR: { t: [144, 96], bend: '+y' }, label: 'Von unten nach vorn oben ziehen' },
      { t: 0.45, armL: { t: [95, 44], bend: '+y' }, armR: { t: [105, 44], bend: '+y' }, label: 'Hände auf Augenhöhe zusammen' },
      { t: 0.55, label: 'Kontrolliert öffnen' },
    ],
    steps: ['Züge unten, Arme leicht gebeugt.', 'In einem Bogen nach vorn oben ziehen.', 'Hände auf Augenhöhe zusammen, obere Brust anspannen.', 'Kontrolliert öffnen.'],
    tempo: '1 s zusammen · 2 s öffnen',
  },
  fly_cable: {
    view: 'front', dur: 3000, hold: 'handle', cables: [{ from: [10, 60], to: 'L' }, { from: [190, 60], to: 'R' }],
    frames: [
      { t: 0, hip: [100, 94], torso: 178, leg: [8, 8], armL: { t: [50, 56], bend: '+y' }, armR: { t: [150, 56], bend: '+y' }, label: 'Nach vorn zusammenführen' },
      { t: 0.45, armL: { t: [95, 66], bend: '+y' }, armR: { t: [105, 66], bend: '+y' }, label: 'Brust anspannen' },
      { t: 0.55, label: 'Kontrolliert öffnen' },
    ],
    steps: ['Züge auf Brusthöhe, Arme leicht gebeugt.', 'In einem Bogen vor der Brust zusammenführen.', 'Brust anspannen.', 'Kontrolliert öffnen.'],
    tempo: '1 s zusammen · 2 s öffnen',
  },
  fly_machine: {
    view: 'front', dur: 3000, hold: 'handle', props: [{ t: 'rect', x: 78, y: 132, w: 44, h: 10 }],
    frames: [
      { t: 0, hip: [100, 126], torso: 180, leg: [14, 0], len: { thigh: 0.3 }, armL: { t: [46, 86], bend: '+y' }, armR: { t: [154, 86], bend: '+y' }, label: 'Zusammenführen' },
      { t: 0.45, armL: { t: [95, 94], bend: '+y' }, armR: { t: [105, 94], bend: '+y' }, label: 'Brust anspannen' },
      { t: 0.55, label: 'Kontrolliert öffnen' },
    ],
    steps: ['Sitzend, Griffe auf Brusthöhe.', 'Arme vor der Brust zusammenführen.', 'Kurz anspannen.', 'Kontrolliert öffnen, nicht überdehnen.'],
    tempo: '1 s zusammen · 2 s öffnen',
  },
  reverse_fly: {
    view: 'front', dur: 3000, hold: 'db',
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [4, 4], armL: { t: [94, 66], bend: '+y' }, armR: { t: [106, 66], bend: '+y' }, label: 'Arme nach außen öffnen' },
      { t: 0.45, armL: { t: [46, 54], bend: '+y' }, armR: { t: [154, 54], bend: '+y' }, label: 'Schulterblätter zusammen' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Arme leicht gebeugt vor dem Körper.', 'Nach außen öffnen, Ellbogen führen.', 'Hinten Schulterblätter zusammen.', 'Langsam zurück.'],
    tempo: '1 s auf · 2 s zurück',
  },
  reverse_fly_cable: {
    view: 'front', dur: 3000, hold: 'handle', cables: [{ from: [190, 50], to: 'L' }, { from: [10, 50], to: 'R' }],
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [4, 4], armL: { t: [104, 60], bend: '+y' }, armR: { t: [96, 60], bend: '+y' }, label: 'Über Kreuz nach außen ziehen' },
      { t: 0.45, armL: { t: [46, 52], bend: '+y' }, armR: { t: [154, 52], bend: '+y' }, label: 'Hinten anspannen' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Züge über Kreuz greifen, Arme vor der Brust.', 'Nach außen ziehen, Ellbogen leicht gebeugt.', 'Hintere Schulter anspannen.', 'Langsam zurück.'],
    tempo: '1 s auf · 2 s zurück',
  },
  band_pull_apart: {
    view: 'front', dur: 2600, links: [{ a: 'wristL', b: 'wristR', cls: 'band' }],
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [4, 4], armL: { t: [88, 54], bend: '+y' }, armR: { t: [112, 54], bend: '+y' }, label: 'Band auseinanderziehen' },
      { t: 0.45, armL: { t: [40, 52], bend: '+y' }, armR: { t: [160, 52], bend: '+y' }, label: 'Schulterblätter zusammen' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Band schulterbreit vor der Brust, Arme gestreckt.', 'Auseinanderziehen bis das Band die Brust berührt.', 'Schulterblätter zusammen, Schultern unten.', 'Langsam zurück.'],
    tempo: '1 s auf · 2 s zurück',
  },
  rear_delt_fly_bent: {
    view: 'side', dur: 3000, hold: 'db', holdArms: 'both',
    frames: [
      { t: 0, hip: [88, 106], torso: 100, leg: { t: [100, 172], bend: '+x' }, arm: [0, 0], label: 'Arme seitlich anheben' },
      { t: 0.45, arm: [-30, -30], len: { uarm: 0.4, farm: 0.4 }, label: 'Hinten anspannen' },
      { t: 0.55, label: 'Langsam ablassen' },
    ],
    steps: ['Vorgebeugt, Rücken gerade, Hanteln hängen unter der Brust.', 'Arme seitlich anheben, leicht gebeugt.', 'Hintere Schulter anspannen, nicht schwingen.', 'Langsam ablassen.'],
    tempo: '1 s hoch · 2 s runter',
  },
  y_raise: {
    view: 'front', dur: 3000, hold: 'db',
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [4, 4], arm: [8, 8], label: 'Arme im Y nach oben' },
      { t: 0.45, arm: [150, 150], label: 'Oben halten, Schultern unten' },
      { t: 0.55, label: 'Langsam ab' },
    ],
    steps: ['Leichte Gewichte, Daumen zeigen nach oben.', 'Arme schräg nach oben im Y anheben.', 'Schultern bleiben unten.', 'Langsam ablassen.'],
    tempo: '1 s hoch · 2 s runter',
  },
  external_rotation: {
    view: 'front', dur: 2800, hold: 'handle', holdArms: 'R', cables: [{ from: [8, 78], to: 'R' }],
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [4, 4], armL: [0, 0], armR: [0, -85], label: 'Unterarm nach außen drehen' },
      { t: 0.45, armR: [0, 70], label: 'Ellbogen bleibt am Körper' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Ellbogen am Körper, 90° gebeugt, Unterarm vor dem Bauch.', 'Unterarm nach außen drehen.', 'Ellbogen bleibt fest an der Seite.', 'Langsam zurück.'],
    tempo: '1 s raus · 2 s zurück',
  },
  lateral_raise: {
    view: 'front', dur: 2800, hold: 'db',
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [4, 4], arm: [8, 8], label: 'Seitlich anheben' },
      { t: 0.45, arm: [90, 84], label: 'Bis Schulterhöhe' },
      { t: 0.55, label: 'Langsam ab' },
    ],
    steps: ['Aufrecht, Hanteln seitlich, Ellbogen leicht gebeugt.', 'Seitlich bis Schulterhöhe anheben, Ellbogen führen.', 'Oben kurz halten, nicht schwingen.', 'Langsam ablassen (2 s).'],
    tempo: '1 s hoch · 2 s runter',
  },
  lateral_raise_cable: {
    view: 'front', dur: 2800, hold: 'handle', holdArms: 'R', cables: [{ from: [10, 178], to: 'R' }],
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [4, 4], armL: { t: [88, 100], bend: '-x' }, armR: [6, -10], label: 'Seitlich anheben' },
      { t: 0.45, armR: [90, 84], label: 'Bis Schulterhöhe' },
      { t: 0.55, label: 'Langsam ab' },
    ],
    steps: ['Zug unten auf der Gegenseite, Griff vor dem Körper.', 'Arm seitlich bis Schulterhöhe anheben.', 'Oben kurz halten.', 'Langsam ab.'],
    tempo: '1 s hoch · 2 s runter',
  },
  front_raise: {
    view: 'side', dur: 2800, hold: 'db', holdArms: 'both',
    frames: [
      { t: 0, ...STAND, arm: [4, 4], label: 'Nach vorn anheben' },
      { t: 0.45, arm: [96, 96], label: 'Bis Schulterhöhe' },
      { t: 0.55, label: 'Langsam ab' },
    ],
    steps: ['Aufrecht, Gewicht vor den Oberschenkeln.', 'Gestreckt nach vorn bis Schulterhöhe.', 'Nicht schwingen, Rumpf fest.', 'Langsam ablassen.'],
    tempo: '1 s hoch · 2 s runter',
  },
  upright_row: {
    view: 'front', dur: 2800, hold: 'rope', cables: [{ from: [100, 178], to: 'mid' }],
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [4, 4], armL: { t: [94, 104], bend: '-x' }, armR: { t: [106, 104], bend: '+x' }, label: 'Ellbogen nach oben außen ziehen' },
      { t: 0.45, armL: { t: [90, 62], bend: '-x' }, armR: { t: [110, 62], bend: '+x' }, label: 'Bis Brusthöhe' },
      { t: 0.55, label: 'Langsam ab' },
    ],
    steps: ['Griff eng vor dem Körper.', 'Ellbogen nach oben außen ziehen.', 'Nur bis Brusthöhe, Schultern nicht hochziehen.', 'Langsam ab.'],
    tempo: '1 s hoch · 2 s runter',
  },
  shrug: {
    view: 'front', dur: 2400, hold: 'db',
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [4, 4], arm: [3, 3], shrug: 0, label: 'Schultern gerade nach oben' },
      { t: 0.4, shrug: 8, label: 'Oben 1 s halten' },
      { t: 0.55, label: 'Langsam ab' },
    ],
    steps: ['Aufrecht, Arme gestreckt, Gewichte seitlich.', 'Schultern gerade nach oben zu den Ohren ziehen.', 'Oben 1 s halten, nicht kreisen.', 'Langsam ab.'],
    tempo: '1 s hoch · 1 s halten · 2 s runter',
  },
  shrug_bar: {
    view: 'front', dur: 2400, hold: 'bar',
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [4, 4], arm: [3, 3], shrug: 0, label: 'Schultern gerade nach oben' },
      { t: 0.4, shrug: 8, label: 'Oben 1 s halten' },
      { t: 0.55, label: 'Langsam ab' },
    ],
    steps: ['Stange vor dem Körper, Arme gestreckt.', 'Schultern gerade nach oben ziehen.', 'Oben 1 s halten.', 'Langsam ab.'],
    tempo: '1 s hoch · 1 s halten · 2 s runter',
  },
  face_pull: {
    view: 'side', dur: 2800, hold: 'handle', cables: [{ from: [188, 46], to: 'N' }],
    frames: [
      { t: 0, hip: [100, 94], torso: 178, legN: { t: [112, 172], bend: '+x' }, legF: { t: [88, 172], bend: '+x' }, arm: { t: [150, 48], bend: '-x' }, label: 'Zum Gesicht ziehen, Ellbogen hoch' },
      { t: 0.45, arm: { t: [108, 44], bend: '-x' }, label: 'Hinten anspannen' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Seil auf Augenhöhe, Schrittstellung, Arme gestreckt.', 'Zum Gesicht ziehen, Ellbogen hoch und nach außen.', 'Hände neben die Ohren, Schulterblätter zusammen.', 'Langsam zurück.'],
    tempo: '1 s ziehen · 2 s zurück',
  },
});

// ======================================================= Ziehen
Object.assign(MOTIONS, {
  pullup: {
    view: 'front', dur: 3400, box: [0, 0, 200, 210],
    props: [{ t: 'line', x1: 30, y1: 30, x2: 170, y2: 30, w: 4 }, { t: 'line', x1: 30, y1: 0, x2: 30, y2: 30 }, { t: 'line', x1: 170, y1: 0, x2: 170, y2: 30 }],
    frames: [
      { t: 0, hip: [100, 122], torso: 180, leg: [3, -4], armL: { t: [78, 32], bend: '-x' }, armR: { t: [122, 32], bend: '+x' }, label: 'Hochziehen, Brust zur Stange' },
      { t: 0.45, hip: [100, 78], label: 'Kinn über der Stange' },
      { t: 0.55, label: 'Langsam ablassen (2–3 s)' },
    ],
    steps: ['Griff etwas breiter als schulterbreit, Schultern nach unten ziehen.', 'Ellbogen nach unten ziehen, Brust zur Stange.', 'Kinn über der Stange, kein Schwung.', 'Langsam ablassen bis die Arme gestreckt sind.'],
    tempo: '1 s hoch · 2–3 s runter',
  },
  pullup_wide: {
    view: 'front', dur: 3400, box: [0, 0, 200, 210],
    props: [{ t: 'line', x1: 30, y1: 30, x2: 170, y2: 30, w: 4 }, { t: 'line', x1: 30, y1: 0, x2: 30, y2: 30 }, { t: 'line', x1: 170, y1: 0, x2: 170, y2: 30 }],
    frames: [
      { t: 0, hip: [100, 118], torso: 180, leg: [3, -4], armL: { t: [62, 32], bend: '-x' }, armR: { t: [138, 32], bend: '+x' }, label: 'Ellbogen nach unten ziehen' },
      { t: 0.45, hip: [100, 78], label: 'Kinn über der Stange' },
      { t: 0.55, label: 'Langsam ablassen' },
    ],
    steps: ['Breiter Griff, Schultern nach unten.', 'Ellbogen nach unten außen ziehen.', 'Kinn über der Stange.', 'Langsam ablassen.'],
    tempo: '1 s hoch · 2–3 s runter',
  },
  chinup: {
    view: 'front', dur: 3400, box: [0, 0, 200, 210],
    props: [{ t: 'line', x1: 30, y1: 30, x2: 170, y2: 30, w: 4 }, { t: 'line', x1: 30, y1: 0, x2: 30, y2: 30 }, { t: 'line', x1: 170, y1: 0, x2: 170, y2: 30 }],
    frames: [
      { t: 0, hip: [100, 124], torso: 180, leg: [3, -4], armL: { t: [88, 32], bend: '-x' }, armR: { t: [112, 32], bend: '+x' }, label: 'Hochziehen' },
      { t: 0.45, hip: [100, 78], label: 'Kinn über der Stange' },
      { t: 0.55, label: 'Langsam ablassen' },
    ],
    steps: ['Untergriff, schulterbreit.', 'Hochziehen, Ellbogen nach unten und hinten.', 'Kinn über der Stange, Bizeps anspannen.', 'Langsam ablassen.'],
    tempo: '1 s hoch · 2–3 s runter',
  },
  pullup_assisted: {
    view: 'front', dur: 3400, box: [0, 0, 200, 210],
    props: [{ t: 'line', x1: 30, y1: 30, x2: 170, y2: 30, w: 4 }, { t: 'line', x1: 30, y1: 0, x2: 30, y2: 30 }, { t: 'line', x1: 170, y1: 0, x2: 170, y2: 30 }],
    attach: [{ t: 'plate', at: 'kneeL', w: 46, h: 8, dx: 8, dy: 2 }],
    frames: [
      { t: 0, hip: [100, 122], torso: 180, leg: [3, -4], armL: { t: [78, 32], bend: '-x' }, armR: { t: [122, 32], bend: '+x' }, label: 'Hochziehen' },
      { t: 0.45, hip: [100, 78], label: 'Kinn über der Stange' },
      { t: 0.55, label: 'Langsam ablassen' },
    ],
    steps: ['Knie auf dem Polster, Griff schulterbreit.', 'Hochziehen wie beim Klimmzug.', 'Kinn über der Stange.', 'Langsam ablassen, Gegengewicht mit der Zeit verringern.'],
    tempo: '1 s hoch · 2–3 s runter',
  },
  pullup_band: {
    view: 'front', dur: 3400, box: [0, 0, 200, 210],
    props: [{ t: 'line', x1: 30, y1: 30, x2: 170, y2: 30, w: 4 }, { t: 'line', x1: 30, y1: 0, x2: 30, y2: 30 }, { t: 'line', x1: 170, y1: 0, x2: 170, y2: 30 }],
    cables: [{ from: [100, 30], to: 'R', at: 'ankle', cls: 'band', pulley: false }],
    frames: [
      { t: 0, hip: [100, 122], torso: 180, leg: [3, -4], armL: { t: [78, 32], bend: '-x' }, armR: { t: [122, 32], bend: '+x' }, label: 'Hochziehen' },
      { t: 0.45, hip: [100, 78], label: 'Kinn über der Stange' },
      { t: 0.55, label: 'Langsam ablassen' },
    ],
    steps: ['Band an der Stange, Fuß oder Knie in die Schlaufe.', 'Hochziehen, Brust zur Stange.', 'Kinn über der Stange.', 'Langsam ablassen, dünneres Band mit der Zeit.'],
    tempo: '1 s hoch · 2–3 s runter',
  },
  lat_pulldown: {
    view: 'front', dur: 3000, box: [0, -10, 200, 210], hold: 'bar', barExt: 22, cables: [{ from: [100, -8], to: 'mid' }],
    props: [{ t: 'rect', x: 80, y: 130, w: 40, h: 10 }, { t: 'rect', x: 74, y: 118, w: 52, h: 6 }],
    frames: [
      { t: 0, hip: [100, 124], torso: 180, leg: [14, 0], len: { thigh: 0.3 }, armL: { t: [72, 36], bend: '-x' }, armR: { t: [128, 36], bend: '+x' }, label: 'Ellbogen nach unten ziehen, Brust raus' },
      { t: 0.45, armL: { t: [80, 80], bend: '-x' }, armR: { t: [120, 80], bend: '+x' }, label: 'Stange zur oberen Brust' },
      { t: 0.55, label: 'Langsam nach oben' },
    ],
    steps: ['Oberschenkel unter dem Polster, Griff etwas breiter als schulterbreit.', 'Ellbogen nach unten ziehen, Stange zur oberen Brust.', 'Brust raus, leicht zurücklehnen, Schulterblätter zusammen.', 'Langsam nach oben, Schultern mit hochkommen lassen.'],
    tempo: '1 s ziehen · 2 s zurück',
  },
  lat_pulldown_close: {
    view: 'front', dur: 3000, box: [0, -10, 200, 210], hold: 'rope', cables: [{ from: [100, -8], to: 'mid' }],
    props: [{ t: 'rect', x: 80, y: 130, w: 40, h: 10 }, { t: 'rect', x: 74, y: 118, w: 52, h: 6 }],
    frames: [
      { t: 0, hip: [100, 124], torso: 180, leg: [14, 0], len: { thigh: 0.3 }, armL: { t: [92, 34], bend: '-x' }, armR: { t: [108, 34], bend: '+x' }, label: 'Ellbogen nach unten ziehen' },
      { t: 0.45, armL: { t: [90, 82], bend: '-x' }, armR: { t: [110, 82], bend: '+x' }, label: 'Zur Brust' },
      { t: 0.55, label: 'Langsam nach oben' },
    ],
    steps: ['Enger Griff, leicht zurücklehnen.', 'Ellbogen nach unten und hinten ziehen.', 'Griff zur Brust, Schulterblätter zusammen.', 'Langsam nach oben.'],
    tempo: '1 s ziehen · 2 s zurück',
  },
  lat_pulldown_single: {
    view: 'front', dur: 3000, box: [0, -10, 200, 210], hold: 'handle', holdArms: 'R', cables: [{ from: [110, -8], to: 'R' }],
    props: [{ t: 'rect', x: 80, y: 130, w: 40, h: 10 }, { t: 'rect', x: 74, y: 118, w: 52, h: 6 }],
    frames: [
      { t: 0, hip: [100, 124], torso: 180, leg: [14, 0], len: { thigh: 0.3 }, armL: { t: [88, 110], bend: '-x' }, armR: { t: [124, 36], bend: '+x' }, label: 'Ellbogen zur Hüfte ziehen' },
      { t: 0.45, armR: { t: [120, 84], bend: '+x' }, label: 'Unten anspannen' },
      { t: 0.55, label: 'Langsam nach oben' },
    ],
    steps: ['Ein Griff, Arm gestreckt nach oben.', 'Ellbogen zur Hüfte ziehen.', 'Unten den Lat anspannen.', 'Langsam nach oben, dann Seite wechseln.'],
    tempo: '1 s ziehen · 2 s zurück',
  },
  band_pulldown: {
    view: 'front', dur: 3000, box: [0, -10, 200, 210], cables: [{ from: [100, -8], to: 'both', cls: 'band', pulley: false }],
    frames: [
      { t: 0, hip: [100, 126], torso: 180, leg: [0, 270], len: { thigh: 1, shin: 0.4 }, armL: { t: [76, 36], bend: '-x' }, armR: { t: [124, 36], bend: '+x' }, label: 'Ellbogen nach unten ziehen' },
      { t: 0.45, armL: { t: [82, 80], bend: '-x' }, armR: { t: [118, 80], bend: '+x' }, label: 'Zur Brust' },
      { t: 0.55, label: 'Langsam nach oben' },
    ],
    steps: ['Band oben befestigt, kniend oder sitzend.', 'Ellbogen nach unten ziehen.', 'Hände zur Brust, Schulterblätter zusammen.', 'Langsam nach oben.'],
    tempo: '1 s ziehen · 2 s zurück',
  },
  barbell_row: {
    view: 'side', dur: 3000, hold: 'bar',
    frames: [
      { t: 0, hip: [86, 110], torso: 122, leg: { t: [100, 172], bend: '+x' }, arm: { t: [122, 140], bend: '-x' }, label: 'Zur Hüfte ziehen, Ellbogen nach hinten' },
      { t: 0.45, arm: { t: [108, 110], bend: '-x' }, label: 'Schulterblätter zusammen' },
      { t: 0.55, label: 'Kontrolliert ablassen' },
    ],
    steps: ['Vorgebeugt, Rücken gerade, Knie leicht gebeugt, Stange hängt unter der Schulter.', 'Zur Hüfte ziehen, Ellbogen nach hinten.', 'Oben Schulterblätter zusammen, Oberkörper bleibt still.', 'Kontrolliert ablassen.'],
    tempo: '1 s ziehen · 2 s runter',
  },
  barbell_row_db: {
    view: 'side', dur: 3000, hold: 'db', holdArms: 'both',
    frames: [
      { t: 0, hip: [86, 110], torso: 122, leg: { t: [100, 172], bend: '+x' }, arm: { t: [122, 140], bend: '-x' }, label: 'Zur Hüfte ziehen' },
      { t: 0.45, arm: { t: [108, 110], bend: '-x' }, label: 'Schulterblätter zusammen' },
      { t: 0.55, label: 'Kontrolliert ablassen' },
    ],
    steps: ['Vorgebeugt, Rücken gerade, Hanteln hängen unter der Schulter.', 'Zur Hüfte ziehen, Ellbogen nach hinten.', 'Oben Schulterblätter zusammen.', 'Kontrolliert ablassen.'],
    tempo: '1 s ziehen · 2 s runter',
  },
  pendlay_row: {
    view: 'side', dur: 2800, hold: 'bar',
    frames: [
      { t: 0, hip: [78, 122], torso: 108, head: 20, leg: { t: [100, 172], bend: '+x' }, arm: { t: [122, 166], bend: '-x' }, label: 'Explosiv zur Brust ziehen' },
      { t: 0.4, arm: { t: [106, 116], bend: '-x' }, label: 'Kurz anspannen' },
      { t: 0.5, label: 'Zurück auf den Boden' },
    ],
    steps: ['Oberkörper waagerecht, Stange auf dem Boden.', 'Explosiv zur unteren Brust ziehen.', 'Oberkörper bleibt waagerecht.', 'Zurück auf den Boden, jede Wiederholung aus dem Stand.'],
    tempo: 'explosiv hoch · kontrolliert runter',
  },
  t_bar_row: {
    view: 'side', dur: 3000, hold: 'bar', plateR: 6, cables: [{ from: [30, 176], to: 'N', cls: 'barline', pulley: false }],
    frames: [
      { t: 0, hip: [86, 110], torso: 122, leg: { t: [100, 172], bend: '+x' }, arm: { t: [122, 140], bend: '-x' }, label: 'Zur Brust ziehen' },
      { t: 0.45, arm: { t: [108, 108], bend: '-x' }, label: 'Schulterblätter zusammen' },
      { t: 0.55, label: 'Kontrolliert ablassen' },
    ],
    steps: ['Über der Stange, Rücken gerade, Griff eng.', 'Zur Brust ziehen, Ellbogen nah am Körper.', 'Schulterblätter zusammen.', 'Kontrolliert ablassen.'],
    tempo: '1 s ziehen · 2 s runter',
  },
  band_row: {
    view: 'side', dur: 3000, hold: 'band', cables: [{ from: [100, 178], to: 'N', cls: 'band', pulley: false }],
    frames: [
      { t: 0, hip: [86, 110], torso: 122, leg: { t: [100, 172], bend: '+x' }, arm: { t: [122, 140], bend: '-x' }, label: 'Zur Hüfte ziehen' },
      { t: 0.45, arm: { t: [108, 110], bend: '-x' }, label: 'Schulterblätter zusammen' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Band unter den Füßen, vorgebeugt, Rücken gerade.', 'Zur Hüfte ziehen, Ellbogen nach hinten.', 'Schulterblätter zusammen.', 'Langsam zurück.'],
    tempo: '1 s ziehen · 2 s runter',
  },
  db_row: {
    view: 'side', dur: 3000, hold: 'db', props: [{ t: 'bench', x: 106, y: 128, w: 66, h: 12 }],
    frames: [
      { t: 0, hip: [92, 106], torso: 96, head: 15, legF: [64, 270], legN: { t: [88, 172], bend: '+x' }, foot: { N: 90, F: 300 }, armF: { t: [175, 128], bend: '-x' }, armN: { t: [134, 150], bend: '-x' }, label: 'Zur Hüfte ziehen' },
      { t: 0.45, armN: { t: [128, 110], bend: '-x' }, label: 'Ellbogen nach hinten, Schulterblatt zusammen' },
      { t: 0.55, label: 'Langsam ablassen' },
    ],
    steps: ['Eine Hand und ein Knie auf der Bank, Rücken gerade.', 'Hantel zur Hüfte ziehen, Ellbogen nah am Körper.', 'Oben Schulterblatt zusammenziehen, nicht aufdrehen.', 'Langsam ablassen, Schulter unten lang machen.'],
    tempo: '1 s ziehen · 2 s runter',
  },
  incline_row: {
    view: 'side', dur: 3000, hold: 'db', holdArms: 'both', props: [{ t: 'bench', x: 50, y: 118, w: 90, h: 12, tilt: -40 }],
    frames: [
      { t: 0, hip: [72, 134], torso: 130, leg: { t: [58, 172], bend: '+x' }, arm: { t: [104, 156], bend: '-x' }, label: 'Zur Hüfte ziehen' },
      { t: 0.45, arm: { t: [100, 120], bend: '-x' }, label: 'Schulterblätter zusammen' },
      { t: 0.55, label: 'Langsam ablassen' },
    ],
    steps: ['Brust auf der Schrägbank, Hanteln hängen.', 'Zur Hüfte ziehen, Ellbogen nach hinten.', 'Schulterblätter zusammen, kein Schwung möglich.', 'Langsam ablassen.'],
    tempo: '1 s ziehen · 2 s runter',
  },
  cable_row: {
    view: 'side', dur: 3000, hold: 'handle', cables: [{ from: [176, 100], to: 'N' }],
    props: [{ t: 'rect', x: 44, y: 138, w: 52, h: 10 }, { t: 'line', x1: 70, y1: 148, x2: 70, y2: 178 }, { t: 'rect', x: 150, y: 140, w: 8, h: 38 }],
    frames: [
      { t: 0, hip: [72, 134], torso: 186, leg: { t: [144, 150], bend: '-y' }, foot: 180, arm: { t: [122, 100], bend: '-x' }, label: 'Ellbogen nach hinten ziehen' },
      { t: 0.45, torso: 190, arm: { t: [84, 104], bend: '-x' }, label: 'Schulterblätter zusammen' },
      { t: 0.55, label: 'Arme lang, Schultern nach vorn lassen' },
    ],
    steps: ['Sitzend, Füße auf der Platte, Knie leicht gebeugt, Rücken gerade.', 'Griff zum Bauch ziehen, Ellbogen nach hinten.', 'Schulterblätter zusammen, Oberkörper bleibt aufrecht.', 'Arme lang, Schultern nach vorn kommen lassen.'],
    tempo: '1 s ziehen · 2 s zurück',
  },
  machine_row: {
    view: 'side', dur: 3000, hold: 'handle', props: [...SEAT, { t: 'rect', x: 108, y: 84, w: 8, h: 44 }],
    frames: [
      { t: 0, ...SEATED, torso: 180, arm: { t: [140, 100], bend: '-x' }, label: 'Ellbogen nach hinten ziehen' },
      { t: 0.45, arm: { t: [96, 104], bend: '-x' }, label: 'Schulterblätter zusammen' },
      { t: 0.55, label: 'Langsam nach vorn' },
    ],
    steps: ['Brust am Polster, Arme gestreckt.', 'Griffe nach hinten ziehen, Ellbogen nah am Körper.', 'Schulterblätter zusammen.', 'Langsam nach vorn, Schultern lang.'],
    tempo: '1 s ziehen · 2 s zurück',
  },
  inverted_row: {
    view: 'side', dur: 3000, props: [{ t: 'line', x1: 20, y1: 70, x2: 130, y2: 70, w: 4 }, { t: 'line', x1: 24, y1: 70, x2: 24, y2: 178 }],
    frames: [
      { t: 0, hip: [109.5, 134], torso: 253, head: 20, leg: { t: [150, 172], bend: '-y' }, arm: { t: [70, 72], bend: '+x' }, label: 'Brust zur Stange ziehen' },
      { t: 0.45, hip: [113.5, 106], label: 'Oben halten, Körper gerade' },
      { t: 0.55, label: 'Langsam ablassen' },
    ],
    steps: ['Unter der Stange hängen, Körper eine Linie, Fersen am Boden.', 'Brust zur Stange ziehen, Ellbogen nach hinten.', 'Oben Schulterblätter zusammen.', 'Langsam ablassen.'],
    tempo: '1 s ziehen · 2 s runter',
  },
  trx_row: {
    view: 'side', dur: 3000, hold: 'handle', cables: [{ from: [70, 0], to: 'N', cls: 'strap', pulley: false }],
    frames: [
      { t: 0, hip: [109.5, 134], torso: 253, head: 20, leg: { t: [150, 172], bend: '-y' }, arm: { t: [70, 72], bend: '+x' }, label: 'Brust zu den Griffen ziehen' },
      { t: 0.45, hip: [113.5, 106], label: 'Oben halten' },
      { t: 0.55, label: 'Langsam ablassen' },
    ],
    steps: ['Griffe fassen, zurücklehnen, Körper eine Linie.', 'Brust zu den Griffen ziehen.', 'Schulterblätter zusammen.', 'Langsam ablassen; je flacher, desto schwerer.'],
    tempo: '1 s ziehen · 2 s runter',
  },
  pullover: {
    view: 'side', dur: 3400, hold: 'db', props: FLAT_BENCH,
    frames: [
      { t: 0, hip: [110, 122], torso: 270, leg: { t: [140, 172], bend: '-y' }, arm: [178, 178], label: 'Hinter den Kopf absenken' },
      { t: 0.45, arm: [258, 258], label: 'Dehnung spüren' },
      { t: 0.55, label: 'Zurück über die Brust' },
    ],
    steps: ['Rückenlage, Hantel mit beiden Händen über der Brust.', 'Arme fast gestreckt hinter den Kopf absenken.', 'Dehnung in Lat und Brust spüren, Rippen unten.', 'Zurück über die Brust.'],
    tempo: '2 s runter · 1 s hoch',
  },
  straight_arm_pulldown: {
    view: 'side', dur: 3000, hold: 'handle', cables: [{ from: [190, 16], to: 'N' }],
    frames: [
      { t: 0, hip: [100, 94], torso: 168, legN: { t: [112, 172], bend: '+x' }, legF: { t: [88, 172], bend: '+x' }, arm: [130, 130], label: 'Mit gestreckten Armen nach unten' },
      { t: 0.45, arm: [22, 22], label: 'Unten Lat anspannen' },
      { t: 0.55, label: 'Langsam nach oben' },
    ],
    steps: ['Leicht vorgebeugt, Arme fast gestreckt am hohen Zug.', 'In einem Bogen zu den Oberschenkeln ziehen.', 'Unten den Lat anspannen.', 'Langsam nach oben, Dehnung spüren.'],
    tempo: '1 s runter · 2 s hoch',
  },
});

// ======================================================= Arme
Object.assign(MOTIONS, {
  curl: {
    view: 'side', dur: 2800, hold: 'bar',
    frames: [
      { t: 0, ...STAND, arm: [6, 6], label: 'Beugen, Ellbogen bleiben am Körper' },
      { t: 0.45, arm: [6, 152], label: 'Oben anspannen' },
      { t: 0.55, label: 'Langsam strecken' },
    ],
    steps: ['Aufrecht, Ellbogen seitlich am Körper.', 'Beugen ohne Schwung, Oberarme bleiben still.', 'Oben kurz anspannen.', 'Langsam strecken (2–3 s).'],
    tempo: '1 s hoch · 2–3 s runter',
  },
  curl_db: {
    view: 'side', dur: 2800, hold: 'db', holdArms: 'both',
    frames: [
      { t: 0, ...STAND, arm: [6, 6], label: 'Beugen, Ellbogen bleiben am Körper' },
      { t: 0.45, arm: [6, 152], label: 'Oben anspannen' },
      { t: 0.55, label: 'Langsam strecken' },
    ],
    steps: ['Aufrecht, Ellbogen seitlich am Körper.', 'Beide Hanteln beugen, Oberarme still.', 'Oben kurz anspannen.', 'Langsam strecken.'],
    tempo: '1 s hoch · 2–3 s runter',
  },
  curl_alternating: {
    view: 'side', dur: 3200, hold: 'db', holdArms: 'both',
    frames: [
      { t: 0, ...STAND, armN: [6, 6], armF: [6, 6], label: 'Im Wechsel beugen' },
      { t: 0.25, armN: [6, 152] },
      { t: 0.5, armN: [6, 6] },
      { t: 0.75, armF: [6, 152] },
    ],
    steps: ['Aufrecht, Hanteln seitlich.', 'Einen Arm beugen, Oberarm bleibt still.', 'Oben anspannen, langsam strecken.', 'Dann den anderen Arm.'],
    tempo: '1 s hoch · 2 s runter',
  },
  curl_cable: {
    view: 'side', dur: 2800, hold: 'handle', cables: [{ from: [178, 176], to: 'N' }],
    frames: [
      { t: 0, ...STAND, arm: [8, 8], label: 'Beugen gegen den Zug' },
      { t: 0.45, arm: [8, 150], label: 'Oben anspannen' },
      { t: 0.55, label: 'Langsam strecken' },
    ],
    steps: ['Zug unten, Ellbogen am Körper.', 'Beugen, Oberarme still.', 'Oben anspannen, Spannung bleibt konstant.', 'Langsam strecken.'],
    tempo: '1 s hoch · 2–3 s runter',
  },
  curl_bayesian: {
    view: 'side', dur: 2800, hold: 'handle', cables: [{ from: [14, 176], to: 'N' }],
    frames: [
      { t: 0, ...STAND, arm: [-15, -15], label: 'Arm bleibt leicht hinter dem Körper' },
      { t: 0.45, arm: [-15, 130], label: 'Oben anspannen' },
      { t: 0.55, label: 'Langsam strecken' },
    ],
    steps: ['Mit dem Rücken zum Zug, Arm leicht hinter dem Körper.', 'Beugen, Oberarm bleibt hinten.', 'Oben anspannen.', 'Langsam strecken, Dehnung im Bizeps.'],
    tempo: '1 s hoch · 2–3 s runter',
  },
  preacher_curl: {
    view: 'side', dur: 2800, hold: 'db', props: [{ t: 'rect', x: 86, y: 86, w: 12, h: 40, rot: -55 }, { t: 'line', x1: 100, y1: 122, x2: 100, y2: 178 }, { t: 'rect', x: 60, y: 138, w: 46, h: 10 }, { t: 'line', x1: 82, y1: 148, x2: 82, y2: 178 }],
    frames: [
      { t: 0, ...SEATED, hip: [84, 134], torso: 184, arm: [55, 55], label: 'Beugen, Oberarm bleibt auf dem Polster' },
      { t: 0.45, arm: [55, 175], label: 'Oben anspannen' },
      { t: 0.55, label: 'Langsam strecken, nicht ganz durch' },
    ],
    steps: ['Oberarm liegt komplett auf dem Polster.', 'Beugen ohne dass der Oberarm abhebt.', 'Oben anspannen.', 'Langsam strecken, unten nicht ganz durchstrecken.'],
    tempo: '1 s hoch · 3 s runter',
  },
  triceps_pushdown: {
    view: 'side', dur: 2800, hold: 'handle', cables: [{ from: [150, 6], to: 'N' }],
    frames: [
      { t: 0, ...STAND, torso: 176, arm: [8, 128], label: 'Nach unten drücken, Ellbogen bleiben' },
      { t: 0.45, arm: [8, 8], label: 'Unten strecken' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Ellbogen am Körper, Unterarme etwa waagerecht.', 'Nach unten drücken, Oberarme bleiben still.', 'Unten ganz strecken, Trizeps anspannen.', 'Langsam zurück bis die Unterarme waagerecht sind.'],
    tempo: '1 s runter · 2 s hoch',
  },
  triceps_pushdown_band: {
    view: 'side', dur: 2800, hold: 'band', cables: [{ from: [104, 0], to: 'N', cls: 'band', pulley: false }],
    frames: [
      { t: 0, ...STAND, torso: 176, arm: [8, 128], label: 'Nach unten drücken' },
      { t: 0.45, arm: [8, 8], label: 'Unten strecken' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Band oben befestigt, Ellbogen am Körper.', 'Nach unten drücken, Oberarme still.', 'Unten strecken.', 'Langsam zurück.'],
    tempo: '1 s runter · 2 s hoch',
  },
  triceps_machine: {
    view: 'side', dur: 2800, hold: 'handle', props: [...SEAT, { t: 'rect', x: 96, y: 108, w: 26, h: 6 }],
    frames: [
      { t: 0, ...SEATED, arm: [50, 150], label: 'Nach unten drücken' },
      { t: 0.45, arm: [50, 50], label: 'Unten strecken' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Oberarme auf dem Polster, Griffe fassen.', 'Nach unten drücken bis die Arme gestreckt sind.', 'Trizeps anspannen.', 'Langsam zurück.'],
    tempo: '1 s runter · 2 s hoch',
  },
  overhead_extension: {
    view: 'side', dur: 3000, box: [0, -16, 200, 216], hold: 'db',
    frames: [
      { t: 0, ...STAND, arm: [172, 300], label: 'Über dem Kopf strecken' },
      { t: 0.45, arm: [172, 176], label: 'Oben anspannen' },
      { t: 0.55, label: 'Langsam hinter den Kopf' },
    ],
    steps: ['Gewicht hinter dem Kopf, Ellbogen zeigen nach vorn oben.', 'Strecken, Oberarme bleiben neben dem Kopf.', 'Oben anspannen.', 'Langsam hinter den Kopf, Dehnung spüren.'],
    tempo: '1 s hoch · 2 s runter',
  },
  overhead_extension_cable: {
    view: 'side', dur: 3000, box: [0, -16, 200, 216], hold: 'handle', cables: [{ from: [10, 178], to: 'N' }],
    frames: [
      { t: 0, hip: [100, 94], torso: 172, legN: { t: [114, 172], bend: '+x' }, legF: { t: [86, 172], bend: '+x' }, arm: [165, 296], label: 'Nach vorn oben strecken' },
      { t: 0.45, arm: [165, 170], label: 'Oben anspannen' },
      { t: 0.55, label: 'Langsam zurück' },
    ],
    steps: ['Mit dem Rücken zum Zug, Schrittstellung, leicht vorgelehnt.', 'Arme nach vorn oben strecken, Oberarme still.', 'Oben anspannen.', 'Langsam zurück, Dehnung spüren.'],
    tempo: '1 s hoch · 2 s runter',
  },
  overhead_extension_seated: {
    view: 'side', dur: 3000, box: [0, -16, 200, 216], hold: 'bar', props: [{ t: 'rect', x: 60, y: 138, w: 48, h: 10 }, { t: 'line', x1: 84, y1: 148, x2: 84, y2: 178 }],
    frames: [
      { t: 0, ...SEATED, torso: 182, arm: [172, 300], label: 'Über dem Kopf strecken' },
      { t: 0.45, arm: [172, 176], label: 'Oben anspannen' },
      { t: 0.55, label: 'Langsam hinter den Kopf' },
    ],
    steps: ['Sitzend, Stange hinter dem Kopf, Ellbogen nach vorn.', 'Strecken, Oberarme bleiben still.', 'Oben anspannen.', 'Langsam hinter den Kopf.'],
    tempo: '1 s hoch · 2 s runter',
  },
  skull_crusher: {
    view: 'side', dur: 3000, hold: 'bar', props: FLAT_BENCH,
    frames: [
      { t: 0, hip: [110, 122], torso: 270, leg: { t: [140, 172], bend: '-y' }, arm: [188, 188], label: 'Ellbogen beugen, Stange zur Stirn' },
      { t: 0.45, arm: [188, 265], label: 'Oberarme bleiben senkrecht' },
      { t: 0.55, label: 'Strecken' },
    ],
    steps: ['Rückenlage, Arme senkrecht über der Schulter.', 'Nur den Ellbogen beugen, Stange zur Stirn oder hinter den Kopf.', 'Oberarme bleiben senkrecht.', 'Strecken, oben anspannen.'],
    tempo: '2 s runter · 1 s hoch',
  },
  bw_skull_crusher: {
    view: 'side', dur: 3000, props: [{ t: 'circle', x: 150, y: 92, r: 4, cls: 'handle' }, { t: 'line', x1: 150, y1: 92, x2: 150, y2: 178 }],
    frames: [
      { t: 0, hip: [77, 95], torso: 130, leg: [-8, -8], arm: { t: [150, 92], bend: '-y' }, label: 'Ellbogen beugen, Kopf unter die Stange' },
      { t: 0.45, hip: [90, 98], torso: 112, leg: [-18, -18], label: 'Oberarme bleiben ruhig' },
      { t: 0.55, label: 'Strecken' },
    ],
    steps: ['Hände auf einer Stange auf Hüfthöhe, Körper gerade, vorgelehnt.', 'Nur die Ellbogen beugen, Kopf unter die Stange.', 'Oberarme bleiben ruhig.', 'Zurück strecken.'],
    tempo: '2 s runter · 1 s hoch',
  },
  triceps_kickback: {
    view: 'side', dur: 2800, hold: 'db',
    frames: [
      { t: 0, hip: [86, 108], torso: 112, legN: { t: [100, 172], bend: '+x' }, legF: { t: [80, 172], bend: '+x' }, armN: [-75, 0], armF: { t: [110, 128], bend: '-x' }, label: 'Oberarm bleibt fest' },
      { t: 0.45, armN: [-75, -78], label: 'Arm ganz strecken' },
      { t: 0.55, label: 'Langsam beugen' },
    ],
    steps: ['Vorgebeugt, Oberarm parallel zum Boden am Körper.', 'Unterarm nach hinten strecken.', 'Oben kurz anspannen, Oberarm bleibt.', 'Langsam beugen.'],
    tempo: '1 s hoch · 2 s runter',
  },
  triceps_kickback_cable: {
    view: 'side', dur: 2800, hold: 'handle', cables: [{ from: [182, 176], to: 'N' }],
    frames: [
      { t: 0, hip: [86, 108], torso: 112, legN: { t: [100, 172], bend: '+x' }, legF: { t: [80, 172], bend: '+x' }, armN: [-75, 0], armF: { t: [110, 128], bend: '-x' }, label: 'Oberarm bleibt fest' },
      { t: 0.45, armN: [-75, -78], label: 'Arm ganz strecken' },
      { t: 0.55, label: 'Langsam beugen' },
    ],
    steps: ['Vorgebeugt, Griff vom tiefen Zug, Oberarm am Körper.', 'Unterarm nach hinten strecken.', 'Oben anspannen.', 'Langsam beugen.'],
    tempo: '1 s hoch · 2 s runter',
  },
});

// ======================================================= Rumpf
Object.assign(MOTIONS, {
  crunch: {
    view: 'side', dur: 2800,
    frames: [
      { t: 0, hip: [100, 170], torso: 270, head: 0, leg: { t: [136, 172], bend: '-y' }, arm: { ar: [-45, 20] }, label: 'Schultern anheben' },
      { t: 0.45, torso: 238, head: 15, label: 'Oben kurz halten' },
      { t: 0.55, label: 'Langsam ablegen' },
    ],
    steps: ['Rückenlage, Füße aufgestellt, Hände an den Schläfen.', 'Schultern vom Boden anheben, Blick zur Decke.', 'Oben kurz halten, unterer Rücken bleibt am Boden.', 'Langsam ablegen.'],
    tempo: '1 s hoch · 2 s runter',
  },
  situp: {
    view: 'side', dur: 3000,
    frames: [
      { t: 0, hip: [100, 170], torso: 270, leg: { t: [136, 172], bend: '-y' }, arm: { ar: [-180, -90] }, len: { farm: 0.35 }, label: 'Aufrollen' },
      { t: 0.45, torso: 168, label: 'Oben kurz halten' },
      { t: 0.55, label: 'Langsam abrollen' },
    ],
    steps: ['Rückenlage, Knie gebeugt, Arme vor der Brust.', 'Wirbel für Wirbel aufrollen.', 'Oben kurz halten.', 'Langsam abrollen.'],
    tempo: '1 s hoch · 2 s runter',
  },
  v_up: {
    view: 'side', dur: 2600,
    frames: [
      { t: 0, hip: [100, 168], torso: 270, leg: [90, 90], arm: [262, 262], label: 'Beine und Oberkörper gleichzeitig anheben' },
      { t: 0.45, torso: 205, leg: [130, 130], arm: [120, 120], label: 'Hände zu den Füßen' },
      { t: 0.55, label: 'Langsam ablegen' },
    ],
    steps: ['Rückenlage, Arme über dem Kopf, Beine gestreckt.', 'Beine und Oberkörper gleichzeitig anheben.', 'Hände zu den Füßen, Körper wird zum V.', 'Langsam ablegen.'],
    tempo: '1 s hoch · 2 s runter',
  },
  bicycle: {
    view: 'side', dur: 1800,
    frames: [
      { t: 0, hip: [100, 170], torso: 250, head: 10, arm: { ar: [-45, 20] }, legN: [140, 70], legF: [105, 105], label: 'Ellbogen zum gegenüberliegenden Knie' },
      { t: 0.5, legN: [105, 105], legF: [140, 70] },
    ],
    steps: ['Rückenlage, Hände an den Schläfen, Schultern angehoben.', 'Ein Knie zur Brust, gegenüberliegender Ellbogen dazu.', 'Anderes Bein gestreckt über dem Boden.', 'Im Wechsel, ohne Schwung.'],
    tempo: 'ruhig im Wechsel',
  },
  cable_crunch: {
    view: 'side', dur: 2800, hold: 'handle', cables: [{ from: [172, 8], to: 'N' }],
    frames: [
      { t: 0, hip: [96, 128], torso: 170, leg: [0, 270], foot: 300, arm: { ar: [20, -90] }, label: 'Einrollen, Ellbogen zu den Knien' },
      { t: 0.45, torso: 112, label: 'Unten anspannen' },
      { t: 0.55, label: 'Langsam aufrichten' },
    ],
    steps: ['Kniend, Seil an den Schläfen, Hüfte bleibt still.', 'Oberkörper einrollen, Ellbogen Richtung Knie.', 'Bauch anspannen, nicht mit der Hüfte arbeiten.', 'Langsam aufrichten.'],
    tempo: '1 s runter · 2 s hoch',
  },
  leg_raise_lying: {
    view: 'side', dur: 3000,
    frames: [
      { t: 0, hip: [96, 170], torso: 270, arm: [95, 95], leg: [90, 90], label: 'Beine gestreckt anheben' },
      { t: 0.45, leg: [178, 178], label: 'Oben halten' },
      { t: 0.55, label: 'Langsam senken, nicht ablegen' },
    ],
    steps: ['Rückenlage, Hände unter dem Gesäß, Beine gestreckt.', 'Beine bis zur Senkrechten anheben.', 'Unterer Rücken bleibt am Boden.', 'Langsam senken, kurz über dem Boden stoppen.'],
    tempo: '1 s hoch · 2–3 s runter',
  },
  reverse_crunch: {
    view: 'side', dur: 2800,
    frames: [
      { t: 0, hip: [96, 170], torso: 270, arm: [95, 95], leg: [150, 60], label: 'Knie zur Brust, Hüfte anheben' },
      { t: 0.45, hip: [90, 158], leg: [195, 100], label: 'Oben einrollen' },
      { t: 0.55, label: 'Langsam ablegen' },
    ],
    steps: ['Rückenlage, Knie gebeugt über der Hüfte.', 'Knie zur Brust ziehen, Hüfte vom Boden abheben.', 'Unteren Bauch anspannen.', 'Langsam ablegen.'],
    tempo: '1 s hoch · 2 s runter',
  },
  flutter_kick: {
    view: 'side', dur: 900,
    frames: [
      { t: 0, hip: [96, 170], torso: 262, arm: [95, 95], legN: [100, 100], legF: [118, 118], label: 'Beine im Wechsel, Rücken am Boden' },
      { t: 0.5, legN: [118, 118], legF: [100, 100] },
    ],
    steps: ['Rückenlage, Beine gestreckt knapp über dem Boden.', 'Beine im Wechsel auf und ab.', 'Unterer Rücken bleibt am Boden.', 'Ruhig atmen.'],
    tempo: 'gleichmäßig',
  },
  hollow_hold: {
    view: 'side', dur: 3000,
    frames: [
      { t: 0, hip: [96, 170], torso: 250, arm: [235, 235], leg: [105, 105], label: 'Halten, unterer Rücken am Boden' },
      { t: 0.5, leg: [102, 102], arm: [238, 238] },
    ],
    steps: ['Rückenlage, Arme über dem Kopf, Beine gestreckt.', 'Schultern und Beine anheben, Körper wie eine Banane.', 'Unterer Rücken fest am Boden.', 'Halten, ruhig atmen.'],
    tempo: 'halten',
  },
  dead_bug: {
    view: 'side', dur: 3200,
    frames: [
      { t: 0, hip: [100, 170], torso: 270, leg: [180, 90], arm: [180, 180], label: 'Gegenüberliegenden Arm und Bein strecken' },
      { t: 0.45, legN: [100, 100], armF: [262, 262], label: 'Rücken bleibt am Boden' },
      { t: 0.55, label: 'Zurück, dann Seite wechseln' },
    ],
    steps: ['Rückenlage, Arme senkrecht, Knie über der Hüfte.', 'Einen Arm hinter den Kopf und das gegenüberliegende Bein strecken.', 'Unterer Rücken bleibt am Boden.', 'Zurück, Seite wechseln.'],
    tempo: '2 s raus · 2 s zurück',
  },
  dragon_flag: {
    view: 'side', dur: 4000, props: [{ t: 'box', x: 0, y: 150, w: 16, h: 28 }],
    frames: [
      { t: 0, hip: [88, 140], torso: 315, arm: [255, 255], leg: [135, 135], label: 'Körper gerade absenken' },
      { t: 0.5, hip: [98, 164], torso: 278, leg: [96, 96], label: 'Knapp über dem Boden halten' },
      { t: 0.6, label: 'Wieder anheben' },
    ],
    steps: ['Hinter dem Kopf festhalten, Körper auf den Schultern aufrichten.', 'Körper als gerade Linie absenken, nur die Schultern berühren den Boden.', 'Knapp über dem Boden halten.', 'Wieder anheben, kein Knick in der Hüfte.'],
    tempo: '3 s runter · 1 s hoch',
  },
  hanging_leg_raise: {
    view: 'side', dur: 3000, box: [0, 0, 200, 214], props: [{ t: 'line', x1: 70, y1: 20, x2: 130, y2: 20, w: 4 }, { t: 'circle', x: 100, y: 20, r: 3, cls: 'handle' }],
    frames: [
      { t: 0, hip: [100, 114], torso: 180, arm: { t: [100, 22], bend: '-x' }, leg: [3, 3], label: 'Beine anheben, Rumpf fest' },
      { t: 0.45, leg: [92, 92], label: 'Oben kurz halten' },
      { t: 0.55, label: 'Langsam senken, nicht schwingen' },
    ],
    steps: ['An der Stange hängen, Schultern aktiv nach unten.', 'Beine gestreckt bis zur Waagerechten anheben.', 'Becken leicht einrollen, oben halten.', 'Langsam senken, nicht schwingen.'],
    tempo: '1 s hoch · 2 s runter',
  },
  hanging_knee_raise: {
    view: 'side', dur: 2800, box: [0, 0, 200, 214], props: [{ t: 'line', x1: 70, y1: 20, x2: 130, y2: 20, w: 4 }, { t: 'circle', x: 100, y: 20, r: 3, cls: 'handle' }],
    frames: [
      { t: 0, hip: [100, 114], torso: 180, arm: { t: [100, 22], bend: '-x' }, leg: [3, 3], label: 'Knie anziehen' },
      { t: 0.45, leg: [110, 10], label: 'Knie zur Brust' },
      { t: 0.55, label: 'Langsam senken' },
    ],
    steps: ['An der Stange hängen, Schultern aktiv.', 'Knie zur Brust ziehen, Becken einrollen.', 'Oben kurz halten.', 'Langsam senken.'],
    tempo: '1 s hoch · 2 s runter',
  },
  toes_to_bar: {
    view: 'side', dur: 3000, box: [0, 0, 200, 214], props: [{ t: 'line', x1: 70, y1: 20, x2: 130, y2: 20, w: 4 }, { t: 'circle', x: 100, y: 20, r: 3, cls: 'handle' }],
    frames: [
      { t: 0, hip: [100, 114], torso: 180, arm: { t: [100, 22], bend: '-x' }, leg: [3, 3], label: 'Zehen zur Stange' },
      { t: 0.45, hip: [98, 108], leg: [160, 160], label: 'Oben berühren' },
      { t: 0.55, label: 'Kontrolliert senken' },
    ],
    steps: ['An der Stange hängen, Schultern aktiv.', 'Beine gestreckt bis zur Stange anheben.', 'Zehen berühren die Stange.', 'Kontrolliert senken.'],
    tempo: '1 s hoch · 2 s runter',
  },
  captains_chair: {
    view: 'side', dur: 2800, props: [{ t: 'rect', x: 84, y: 40, w: 8, h: 80 }, { t: 'rect', x: 96, y: 94, w: 36, h: 6 }],
    frames: [
      { t: 0, hip: [100, 110], torso: 180, arm: [0, 90], leg: [3, 3], label: 'Beine anheben' },
      { t: 0.45, leg: [92, 92], label: 'Oben kurz halten' },
      { t: 0.55, label: 'Langsam senken' },
    ],
    steps: ['Unterarme auf den Polstern, Rücken am Polster.', 'Beine gestreckt oder gebeugt anheben.', 'Becken einrollen, oben halten.', 'Langsam senken.'],
    tempo: '1 s hoch · 2 s runter',
  },
  l_sit: {
    view: 'side', dur: 3000, props: [{ t: 'circle', x: 104, y: 132, r: 4, cls: 'handle' }, { t: 'line', x1: 104, y1: 132, x2: 104, y2: 178 }],
    frames: [
      { t: 0, hip: [100, 124], torso: 180, arm: { t: [104, 132], bend: '-x' }, leg: [90, 90], label: 'Halten, Beine gestreckt' },
      { t: 0.5, leg: [88, 88] },
    ],
    steps: ['Auf den Griffen abstützen, Schultern nach unten drücken.', 'Beine gestreckt bis zur Waagerechten anheben.', 'Halten, Knie durchgedrückt.', 'Zur Not mit angewinkelten Knien beginnen.'],
    tempo: 'halten',
  },
  plank: {
    view: 'side', dur: 3200,
    frames: [
      { t: 0, hip: [108, 152], torso: 82, leg: [278, 278], foot: 0, arm: [0, 90], label: 'Halten: Körper eine Linie, Gesäß fest' },
      { t: 0.5, hip: [108, 151] },
    ],
    steps: ['Unterarme am Boden, Ellbogen unter den Schultern.', 'Körper eine gerade Linie von Kopf bis Ferse.', 'Gesäß und Bauch fest, Blick zum Boden.', 'Ruhig atmen und halten.'],
    tempo: 'halten',
  },
  plank_taps: {
    view: 'side', dur: 2600,
    frames: [
      { t: 0, hip: [85, 136], torso: 70, leg: [290, 290], foot: 0, armF: { t: [124, 172], bend: '-x' }, armN: { t: [124, 172], bend: '-x' }, label: 'Hand zur gegenüberliegenden Schulter' },
      { t: 0.25, armN: { t: [116, 118], bend: '+y' } },
      { t: 0.5, armN: { t: [124, 172], bend: '-x' } },
      { t: 0.75, armF: { t: [116, 118], bend: '+y' } },
    ],
    steps: ['Hohe Plank, Füße etwas breiter.', 'Eine Hand zur gegenüberliegenden Schulter tippen.', 'Hüfte bleibt ruhig, nicht drehen.', 'Im Wechsel.'],
    tempo: 'ruhig im Wechsel',
  },
  mountain_climber: {
    view: 'side', dur: 1000,
    frames: [
      { t: 0, hip: [85, 136], torso: 70, arm: { t: [124, 172], bend: '-x' }, legN: [290, 290], legF: [61, -33], label: 'Knie im Wechsel zur Brust' },
      { t: 0.25, legN: [345, 255], legF: [345, 255] },
      { t: 0.5, legN: [61, -33], legF: [290, 290] },
      { t: 0.75, legN: [345, 255], legF: [345, 255] },
    ],
    steps: ['Hohe Plank, Hände unter den Schultern.', 'Ein Knie zur Brust ziehen.', 'Im schnellen Wechsel, Hüfte bleibt tief.', 'Rumpf fest.'],
    tempo: 'zügig',
  },
  side_plank: {
    view: 'front', dur: 3200,
    frames: [
      { t: 0, hip: [92, 148], torso: 102, legL: { t: [14, 171], bend: '-y' }, legR: { t: [16, 171], bend: '-y' }, armR: [0, 90], armL: [180, 180], label: 'Halten: Hüfte oben, Körper gerade' },
      { t: 0.5, hip: [92, 147] },
    ],
    steps: ['Seitlich auf dem Unterarm, Ellbogen unter der Schulter.', 'Hüfte anheben bis der Körper eine Linie ist.', 'Oberer Arm nach oben oder an die Hüfte.', 'Halten, dann Seite wechseln.'],
    tempo: 'halten',
  },
  copenhagen_plank: {
    view: 'front', dur: 3200, props: [{ t: 'bench', x: 4, y: 112, w: 40, h: 12 }],
    frames: [
      { t: 0, hip: [92, 144], torso: 102, legL: { t: [22, 118], bend: '-y' }, legR: { t: [44, 160], bend: '-y' }, armR: [0, 90], armL: [180, 180], label: 'Halten: oberes Bein auf der Bank' },
      { t: 0.5, hip: [92, 143] },
    ],
    steps: ['Seitstütz, oberes Bein liegt auf einer Bank.', 'Hüfte anheben, Körper gerade.', 'Unteres Bein hängt frei oder stützt leicht.', 'Halten, Seite wechseln.'],
    tempo: 'halten',
  },
  ab_wheel: {
    view: 'side', dur: 3400, hold: 'wheel',
    frames: [
      { t: 0, hip: [92, 128], torso: 165, leg: [0, 270], foot: 300, arm: { t: [124, 170], bend: '-x' }, label: 'Langsam ausrollen, Rumpf fest' },
      { t: 0.5, hip: [117.7, 137.4], torso: 112, leg: [-40, 270], arm: { t: [182, 166], bend: '-x' }, label: 'So weit wie sauber möglich' },
      { t: 0.6, label: 'Zurückziehen' },
    ],
    steps: ['Kniend, Rad unter den Schultern, Gesäß fest.', 'Langsam nach vorn ausrollen, Hüfte bleibt gestreckt.', 'Kein Hohlkreuz, nur so weit wie sauber möglich.', 'Mit dem Bauch zurückziehen.'],
    tempo: '2 s raus · 2 s zurück',
  },
  bird_dog: {
    view: 'side', dur: 3200,
    frames: [
      { t: 0, hip: [80, 126], torso: 90, head: 25, armN: [0, 0], armF: [0, 0], legN: [0, 270], legF: [0, 270], foot: 300, label: 'Gegenüberliegenden Arm und Bein strecken' },
      { t: 0.45, armF: [92, 92], legN: [-92, -92], foot: { N: 0, F: 300 }, label: '2 s halten, Hüfte gerade' },
      { t: 0.6, label: 'Zurück, Seite wechseln' },
    ],
    steps: ['Vierfüßlerstand, Rücken neutral.', 'Einen Arm nach vorn und das gegenüberliegende Bein nach hinten strecken.', 'Hüfte bleibt gerade, 2 s halten.', 'Zurück, Seite wechseln.'],
    tempo: '2 s raus · halten · zurück',
  },
  pallof: {
    view: 'front', dur: 3000, hold: 'handle', holdArms: 'R', cables: [{ from: [6, 84], to: 'R' }],
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [8, 8], armL: { t: [98, 84], bend: '-x' }, armR: { t: [102, 84], bend: '+x' }, label: 'Arme nach vorn strecken, nicht drehen lassen' },
      { t: 0.45, armL: { t: [98, 72], bend: '-x' }, armR: { t: [102, 72], bend: '+x' }, len: { uarm: 0.3, farm: 0.3 }, label: 'Halten, Rumpf fest' },
      { t: 0.6, label: 'Zurück zur Brust' },
    ],
    steps: ['Seitlich zum Zug, Griff vor der Brust, Füße hüftbreit.', 'Arme gerade nach vorn strecken.', 'Rumpf hält gegen die Drehung, 2 s halten.', 'Zurück zur Brust.'],
    tempo: '1 s raus · 2 s halten · zurück',
  },
  woodchop: {
    view: 'front', dur: 2800, hold: 'handle', holdArms: 'L', cables: [{ from: [6, 20], to: 'L' }],
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [10, 10], armL: { t: [58, 44], bend: '+y' }, armR: { t: [62, 46], bend: '+y' }, label: 'Diagonal nach unten ziehen, Rumpf dreht mit' },
      { t: 0.45, torso: 170, armL: { t: [140, 142], bend: '+y' }, armR: { t: [144, 144], bend: '+y' }, label: 'Unten anspannen' },
      { t: 0.55, label: 'Kontrolliert zurück' },
    ],
    steps: ['Seitlich zum hohen Zug, beide Hände am Griff.', 'Diagonal zur gegenüberliegenden Hüfte ziehen.', 'Rumpf dreht mit, Arme bleiben fast gestreckt.', 'Kontrolliert zurück.'],
    tempo: '1 s runter · 2 s zurück',
  },
  woodchop_band: {
    view: 'front', dur: 2800, hold: 'band', holdArms: 'L', cables: [{ from: [6, 20], to: 'L', cls: 'band', pulley: false }],
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [10, 10], armL: { t: [58, 44], bend: '+y' }, armR: { t: [62, 46], bend: '+y' }, label: 'Diagonal nach unten ziehen' },
      { t: 0.45, torso: 170, armL: { t: [140, 142], bend: '+y' }, armR: { t: [144, 144], bend: '+y' }, label: 'Unten anspannen' },
      { t: 0.55, label: 'Kontrolliert zurück' },
    ],
    steps: ['Band oben seitlich befestigt, beide Hände am Band.', 'Diagonal zur gegenüberliegenden Hüfte ziehen.', 'Rumpf dreht mit.', 'Kontrolliert zurück.'],
    tempo: '1 s runter · 2 s zurück',
  },
  russian_twist: {
    view: 'front', dur: 1800, hold: 'db', holdArms: 'R',
    frames: [
      { t: 0, hip: [100, 142], torso: 172, leg: [12, 0], len: { thigh: 0.4, shin: 0.55 }, armL: { t: [60, 120], bend: '+y' }, armR: { t: [64, 122], bend: '+y' }, label: 'Zur Seite drehen' },
      { t: 0.5, armL: { t: [136, 120], bend: '+y' }, armR: { t: [140, 122], bend: '+y' }, label: 'Zur anderen Seite' },
    ],
    steps: ['Sitzend, leicht zurückgelehnt, Füße angehoben oder am Boden.', 'Gewicht mit beiden Händen zur Seite drehen.', 'Der Oberkörper dreht, nicht nur die Arme.', 'Zur anderen Seite.'],
    tempo: 'kontrolliert im Wechsel',
  },
  side_bend: {
    view: 'front', dur: 2600, hold: 'db', holdArms: 'R',
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [4, 4], armR: [2, 2], armL: { t: [86, 98], bend: '-x' }, label: 'Zur Seite neigen' },
      { t: 0.45, torso: 166, label: 'Dehnung spüren' },
      { t: 0.55, label: 'Aufrichten' },
    ],
    steps: ['Aufrecht, Gewicht in einer Hand, andere Hand an der Hüfte.', 'Zur Gewichtsseite neigen, nicht nach vorn beugen.', 'Dehnung in der anderen Flanke spüren.', 'Mit der seitlichen Bauchmuskulatur aufrichten.'],
    tempo: '2 s runter · 1 s hoch',
  },
  suitcase_carry: {
    view: 'front', dur: 1200, hold: 'db', holdArms: 'R',
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [4, 4], armR: [2, 2], armL: [10, 10], label: 'Aufrecht gehen, nicht zur Seite kippen' },
      { t: 0.5, hip: [100, 91], leg: [7, 7] },
    ],
    steps: ['Schweres Gewicht in einer Hand.', 'Aufrecht gehen, Schultern auf gleicher Höhe.', 'Rumpf hält gegen das Kippen.', 'Seite wechseln.'],
    tempo: 'ruhig gehen',
  },
  farmers_walk: {
    view: 'side', dur: 1400, hold: 'db', holdArms: 'both',
    frames: [
      { t: 0, hip: [100, 93], torso: 180, legN: [22, 12], legF: [-18, -34], foot: { N: 90, F: 120 }, arm: [0, 0], label: 'Aufrecht gehen, Schultern hinten' },
      { t: 0.25, hip: [100, 92], legN: [0, 0], legF: [0, 0], foot: { N: 90, F: 90 } },
      { t: 0.5, hip: [100, 93], legN: [-18, -34], legF: [22, 12], foot: { N: 120, F: 90 } },
      { t: 0.75, hip: [100, 92], legN: [0, 0], legF: [0, 0], foot: { N: 90, F: 90 } },
    ],
    steps: ['Schwere Gewichte in beiden Händen.', 'Aufrecht gehen, Schultern hinten und unten.', 'Kleine, zügige Schritte.', 'Rumpf fest, ruhig atmen.'],
    tempo: 'ruhig gehen',
  },
});

// ======================================================= Mobilität
Object.assign(MOTIONS, {
  deep_squat_hold: {
    view: 'side', dur: 3000,
    frames: [
      { t: 0, hip: [88, 132], torso: 158, leg: { t: [100, 172], bend: '+x' }, arm: { t: [120, 120], bend: '+y' }, label: 'Halten, Fersen am Boden, Ellbogen drücken die Knie auseinander' },
      { t: 0.5, hip: [88, 134] },
    ],
    steps: ['Füße schulterbreit, tief in die Hocke.', 'Fersen bleiben am Boden.', 'Ellbogen drücken die Knie nach außen.', 'Ruhig atmen und halten.'],
    tempo: 'halten',
  },
  cat_cow: {
    view: 'side', dur: 4000,
    frames: [
      { t: 0, hip: [80, 126], torso: 90, head: 40, arm: [0, 0], leg: [0, 270], foot: 300, label: 'Kuh: Rücken durchhängen, Blick nach vorn' },
      { t: 0.5, hip: [80, 120], torso: 84, head: -50, label: 'Katze: Rücken rund, Kinn zur Brust' },
    ],
    steps: ['Vierfüßlerstand, Hände unter den Schultern.', 'Einatmen: Rücken durchhängen lassen, Blick nach vorn.', 'Ausatmen: Rücken rund machen, Kinn zur Brust.', 'Langsam im Wechsel.'],
    tempo: 'mit dem Atem',
  },
  wall_slide: {
    view: 'front', dur: 3200,
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [4, 4], armL: [90, 180], armR: [90, 180], label: 'Arme an der Wand nach oben schieben' },
      { t: 0.5, armL: [160, 180], armR: [160, 180], label: 'Unterarme bleiben an der Wand' },
    ],
    steps: ['Rücken und Unterarme an der Wand, Ellbogen 90°.', 'Arme langsam nach oben schieben.', 'Unterarme und Handrücken bleiben an der Wand.', 'Langsam zurück.'],
    tempo: 'langsam',
  },
  shoulder_circle: {
    view: 'front', dur: 5000,
    frames: [
      { t: 0, hip: [100, 94], torso: 180, leg: [4, 4], armL: [0, 0], armR: [0, 0], label: 'Große, langsame Kreise', ease: 'linear' },
      { t: 0.25, armR: [90, 90], ease: 'linear' },
      { t: 0.5, armR: [180, 180], ease: 'linear' },
      { t: 0.75, armR: [270, 270], ease: 'linear' },
      { t: 1, armR: [360, 360] },
    ],
    steps: ['Aufrecht, Arm gestreckt.', 'Größtmögliche, langsame Kreise.', 'Rumpf bleibt still, nichts ausweichen.', 'Beide Richtungen.'],
    tempo: 'sehr langsam',
  },
  ankle_rock: {
    view: 'side', dur: 2600, props: [{ t: 'line', x1: 150, y1: 40, x2: 150, y2: 178 }],
    frames: [
      { t: 0, hip: [104, 100], torso: 176, legN: { t: [126, 172], bend: '+x' }, legF: { t: [72, 172], bend: '+x' }, foot: { N: 90, F: 110 }, arm: { t: [148, 70], bend: '-x' }, label: 'Knie zur Wand, Ferse bleibt unten' },
      { t: 0.5, hip: [118, 108] },
    ],
    steps: ['Fuß etwa 10 cm von der Wand, Hände an der Wand.', 'Knie über die Zehen Richtung Wand schieben.', 'Ferse bleibt am Boden.', 'Zurück und wiederholen.'],
    tempo: 'langsam',
  },
  couch_stretch: {
    view: 'side', dur: 3000, props: [{ t: 'line', x1: 60, y1: 60, x2: 60, y2: 178 }],
    frames: [
      { t: 0, hip: [100, 130], torso: 180, legN: { t: [140, 172], bend: '+x' }, legF: [0, 180], foot: { N: 90, F: 0 }, arm: { t: [140, 130], bend: '+y' }, label: 'Halten: Gesäß anspannen, Oberkörper aufrecht' },
      { t: 0.5, hip: [104, 130] },
    ],
    steps: ['Hinteres Knie am Boden vor der Wand, Schienbein an der Wand.', 'Vorderer Fuß aufgestellt.', 'Gesäß anspannen, Oberkörper aufrichten.', 'Halten, ruhig atmen.'],
    tempo: 'halten',
  },
});

// ======================================================= Zuordnung Übung → Bewegung
const MAP = {
  kniebeuge_lh: 'squat_bar', kniebeuge_smith: 'squat_bar', kniebeuge_band: 'squat_bw', ausfallschritte_lh: 'lunge_bar',
  frontkniebeuge: 'squat_front', front_squat_kb: 'squat_front', landmine_squat: 'squat_goblet',
  goblet_squat: 'squat_goblet', goblet_squat_kb: 'squat_goblet', sumo_squat_kh: 'squat_sumo_db',
  kniebeuge_bw: 'squat_bw', belt_squat: 'squat_bw', pistol_squat: 'pistol_squat', spanish_squat: 'spanish_squat', sissy_squat: 'sissy_squat', sissy_squat_echt: 'sissy_squat',
  beinpresse: 'leg_press', beinpresse_einbeinig: 'leg_press', hackenschmidt: 'hack_squat', pendulum_squat: 'hack_squat',
  kreuzheben_trap_bar: 'deadlift', kreuzheben: 'deadlift', kreuzheben_kh: 'deadlift', sumo_kreuzheben: 'deadlift_sumo', rack_pull: 'rack_pull',
  rdl_lh: 'rdl', rdl_kh: 'rdl', rdl_kettlebell: 'rdl', rdl_band: 'rdl', good_morning: 'good_morning', single_leg_rdl: 'single_leg_rdl',
  kettlebell_swing: 'kb_swing', kabel_pull_through: 'pull_through',
  hip_thrust: 'hip_thrust', hip_thrust_maschine: 'hip_thrust', hip_thrust_kh: 'hip_thrust', glute_bridge: 'glute_bridge', glute_bridge_einbeinig: 'glute_bridge_single',
  bulgarian_split_squat: 'bulgarian', split_squat: 'lunge', ausfallschritte: 'lunge', ausfallschritte_rueckwaerts: 'lunge', step_ups: 'step_up',
  beinstrecker: 'leg_extension', beinstrecker_einbeinig: 'leg_extension_single',
  beinbeuger_liegend: 'leg_curl_lying', beinbeuger_sitzend: 'leg_curl_seated', beinbeuger_stehend: 'leg_curl_standing', nordic_curl: 'nordic_curl', sliding_leg_curl: 'glute_bridge',
  hyperextension: 'hyperextension', reverse_hyper: 'reverse_hyper', superman: 'superman',
  kickback_kabel: 'kickback_cable', donkey_kicks: 'donkey_kick',
  abduktion: 'hip_abduction', abduktion_kabel: 'hip_abduction', band_walks: 'band_walk', clamshell: 'hip_abduction_band', adduktion: 'hip_adduction',
  wadenheben_stehend: 'calf_raise_bar', wadenheben_smith: 'calf_raise_bar', wadenheben_beinpresse: 'leg_press', wadenheben_sitzend: 'calf_raise_seated', wadenheben_sitzend_kh: 'calf_raise_seated',
  wadenheben_einbeinig: 'calf_raise', wadenheben_kh_stehend: 'calf_raise', tibialis_raises: 'tibialis',
  // Drücken
  bankdruecken_lh: 'bench_press', bankdruecken_smith: 'bench_press', enges_bankdruecken: 'bench_press', jm_press: 'bench_press',
  bankdruecken_kh: 'bench_press_db', bankdruecken_kh_neutral: 'bench_press_db', squeeze_press: 'bench_press_db',
  schraegbank_lh: 'incline_press', schraegbank_smith: 'incline_press', brustpresse_schraeg: 'incline_press', schraegbank_kh: 'incline_press_db',
  negativbank_lh: 'decline_press', negativbank_kh: 'decline_press', floor_press_kh: 'floor_press', floor_press_lh: 'floor_press',
  brustpresse: 'chest_press_machine', brustpresse_kabel: 'cable_press_standing', landmine_press: 'landmine_press',
  dips: 'dips', dips_maschine: 'dips', bank_dips: 'bench_dip',
  liegestuetze: 'pushup', liegestuetze_kh: 'pushup', liegestuetze_band: 'pushup', liegestuetze_archer: 'pushup', liegestuetze_trx: 'pushup', diamant_liegestuetze: 'pushup',
  liegestuetze_knie: 'pushup_knee', liegestuetze_erhoeht: 'pushup_incline', pike_liegestuetze: 'pike_pushup', pike_liegestuetze_erhoeht: 'pike_pushup_box', handstand_liegestuetze: 'handstand_pushup',
  fliegende_kh: 'fly', fliegende_schraeg_kh: 'fly', fliegende_boden_kh: 'fly', butterfly: 'fly_machine', band_fliegende: 'fly_cable', fliegende_trx: 'fly',
  fliegende_kabel: 'fly_cable', fliegende_kabel_tief: 'fly_cable_low', fliegende_kabel_hoch: 'fly_cable_high',
  schulterdruecken_lh: 'ohp', schulterdruecken_sitzend_lh: 'ohp_seated', push_press: 'push_press', schulterdruecken_kh: 'ohp_db', arnold_press: 'ohp_db', schulterdruecken_kettlebell: 'ohp_db',
  schulterdruecken_einarmig_kh: 'ohp_single', schulterpresse: 'ohp_seated', schulterdruecken_band: 'ohp_db',
  seitheben_kh: 'lateral_raise', seitheben_maschine: 'lateral_raise', seitheben_band: 'lateral_raise', seitheben_kabel: 'lateral_raise_cable',
  frontheben_kh: 'front_raise', frontheben_scheibe: 'front_raise', upright_row_kabel: 'upright_row', shrugs_kh: 'shrug', shrugs_lh: 'shrug_bar',
  face_pulls: 'face_pull', face_pulls_band: 'face_pull',
  reverse_flys_kh: 'rear_delt_fly_bent', reverse_flys_liegend: 'rear_delt_fly_bent', reverse_flys_maschine: 'reverse_fly', reverse_flys_kabel: 'reverse_fly_cable', band_pull_aparts: 'band_pull_apart', y_raises: 'y_raise',
  aussenrotation_kabel: 'external_rotation', aussenrotation_band: 'external_rotation',
  // Ziehen
  klimmzuege: 'pullup', klimmzuege_neutral: 'pullup', klimmzuege_negativ: 'pullup', klimmzuege_breit: 'pullup_wide', chin_ups: 'chinup', klimmzuege_band: 'pullup_band', klimmzuege_maschine: 'pullup_assisted',
  latzug: 'lat_pulldown', latzug_eng: 'lat_pulldown_close', latzug_untergriff: 'lat_pulldown_close', latzug_einarmig: 'lat_pulldown_single', band_latzug: 'band_pulldown',
  lh_rudern: 'barbell_row', lh_rudern_untergriff: 'barbell_row', pendlay_rudern: 'pendlay_row', t_bar_rudern: 't_bar_row', meadows_row: 't_bar_row',
  kh_rudern: 'db_row', kh_rudern_beidarmig: 'barbell_row_db', kettlebell_rudern: 'barbell_row_db', kh_rudern_brustgestuetzt: 'incline_row',
  kabelrudern: 'cable_row', kabelrudern_breit: 'cable_row', kabelrudern_einarmig: 'cable_row', rudern_maschine: 'machine_row', rudern_maschine_hoch: 'machine_row',
  invertiertes_rudern: 'inverted_row', trx_rudern: 'trx_row', band_rudern: 'band_row', band_rudern_einarmig: 'band_row',
  ueberzuege_kh: 'pullover', ueberzuege_kabel: 'straight_arm_pulldown',
  // Arme
  lh_curls: 'curl', sz_curls: 'curl', reverse_curls: 'curl', kh_curls: 'curl_db', hammer_curls: 'curl_db', zottman_curls: 'curl_db', curls_kettlebell: 'curl_db', band_curls: 'curl_db',
  kh_curls_abwechselnd: 'curl_alternating', kabel_curls: 'curl_cable', hammer_curls_seil: 'curl_cable', bayesian_curls: 'curl_bayesian',
  scott_curls: 'preacher_curl', schraegbank_curls: 'preacher_curl', spider_curls: 'preacher_curl', konzentrations_curls: 'preacher_curl', maschinen_curls: 'preacher_curl', trx_curls: 'trx_row',
  trizeps_kabel: 'triceps_pushdown', trizeps_seil: 'triceps_pushdown', trizeps_kabel_einarmig: 'triceps_pushdown', band_trizeps: 'triceps_pushdown_band', trizeps_maschine: 'triceps_machine',
  trizeps_ueberkopf_kabel: 'overhead_extension_cable', trizeps_ueberkopf_kh: 'overhead_extension', band_trizeps_ueberkopf: 'overhead_extension', french_press_sitzend: 'overhead_extension_seated',
  french_press: 'skull_crusher', french_press_kh: 'skull_crusher', bodyweight_skull_crusher: 'bw_skull_crusher', trx_trizeps: 'bw_skull_crusher',
  kickbacks_kh: 'triceps_kickback', kickbacks_kabel: 'triceps_kickback_cable',
  // Rumpf
  crunches: 'crunch', sit_ups: 'situp', v_ups: 'v_up', bicycle_crunches: 'bicycle', kabel_crunch: 'cable_crunch', crunch_maschine: 'cable_crunch',
  beinheben_liegend: 'leg_raise_lying', reverse_crunches: 'reverse_crunch', flutter_kicks: 'flutter_kick', hollow_hold: 'hollow_hold', dead_bug: 'dead_bug', dragon_flag: 'dragon_flag',
  haengendes_beinheben: 'hanging_leg_raise', knieheben_haengend: 'hanging_knee_raise', toes_to_bar: 'toes_to_bar', beinheben_dipstation: 'captains_chair', l_sit: 'l_sit',
  plank: 'plank', plank_shoulder_taps: 'plank_taps', mountain_climbers: 'mountain_climber', seitstuetz: 'side_plank', copenhagen_plank: 'copenhagen_plank',
  ab_wheel: 'ab_wheel', bird_dog: 'bird_dog', pallof_press: 'pallof', woodchop_kabel: 'woodchop', woodchop_band: 'woodchop_band', russian_twist: 'russian_twist',
  seitbeugen_kh: 'side_bend', suitcase_carry: 'suitcase_carry', farmers_walk: 'farmers_walk',
};

const MOBILITY_MAP = {
  deep_squat_hold: 'deep_squat_hold', glute_bridge_mob: 'glute_bridge', cat_cow: 'cat_cow', wall_slides: 'wall_slide', shoulder_cars: 'shoulder_circle', ankle_rocks: 'ankle_rock', couch_stretch: 'couch_stretch',
};

// Fallback nach Bewegungsmuster, falls eine Übung nicht direkt zugeordnet ist.
const PATTERN_FALLBACK = { squat: 'squat_bw', lunge: 'lunge', hinge: 'rdl', hpush: 'pushup', vpush: 'ohp_db', hpull: 'barbell_row_db', vpull: 'pullup', core: 'plank' };

export function motionFor(ex) {
  if (!ex) return null;
  const id = typeof ex === 'string' ? ex : ex.id;
  if (MAP[id] && MOTIONS[MAP[id]]) return MAP[id];
  if (typeof ex !== 'string' && PATTERN_FALLBACK[ex.pattern]) return PATTERN_FALLBACK[ex.pattern];
  return null;
}

export function motionForMobility(m) {
  const id = typeof m === 'string' ? m : m?.id;
  return MOBILITY_MAP[id] || null;
}

export const EXERCISE_MOTION_MAP = MAP;

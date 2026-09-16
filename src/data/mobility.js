// Mobilitätsübungen. focus: welche Bereiche sie adressieren.
export const MOBILITY = [
  { id: 'hip_9090', name: '90/90-Hüftwechsel', focus: ['huefte', 'squat'], seconds: 60, cue: 'Sitzend, beide Knie 90°, langsam von Seite zu Seite wechseln.' },
  { id: 'couch_stretch', name: 'Couch Stretch (Hüftbeuger)', focus: ['huefte', 'squat', 'hinge'], seconds: 45, perSide: true, cue: 'Knie an die Wand, Gesäß anspannen, Oberkörper aufrecht.' },
  { id: 'deep_squat_hold', name: 'Tiefe Hocke halten', focus: ['squat', 'knie', 'huefte'], seconds: 60, cue: 'Fersen am Boden, Ellbogen drücken die Knie nach außen, aktiv atmen.' },
  { id: 'ankle_rocks', name: 'Sprunggelenk-Mobilisation (Knie zur Wand)', focus: ['squat', 'knie'], seconds: 45, perSide: true, cue: 'Fuß ca. 10 cm von der Wand, Knie zur Wand ohne dass die Ferse abhebt.' },
  { id: 'hamstring_floss', name: 'Beinbeuger-Flossing', focus: ['hinge'], seconds: 45, perSide: true, cue: 'Bein auf Erhöhung, Knie abwechselnd beugen und strecken, Rücken gerade.' },
  { id: 'cat_cow', name: 'Katze-Kuh', focus: ['ruecken_unten', 'hinge', 'allgemein'], seconds: 60, cue: 'Im Vierfüßlerstand langsam die ganze Wirbelsäule runden und strecken.' },
  { id: 'open_book', name: 'Open Book (BWS-Rotation)', focus: ['schulter', 'push', 'pull', 'allgemein'], seconds: 45, perSide: true, cue: 'Seitlich liegend, oberen Arm wie ein Buch aufklappen, Blick folgt der Hand.' },
  { id: 'wall_slides', name: 'Wall Slides', focus: ['schulter', 'push'], seconds: 60, cue: 'Rücken und Unterarme an der Wand, Arme nach oben schieben ohne dass die Unterarme abheben.' },
  { id: 'shoulder_cars', name: 'Schulterkreise (CARs)', focus: ['schulter', 'push', 'pull'], seconds: 45, perSide: true, cue: 'Größtmögliche, langsame Kreise mit gestrecktem Arm, Rumpf bleibt still.' },
  { id: 'pigeon', name: 'Taube (Gesäßdehnung)', focus: ['huefte', 'squat', 'hinge'], seconds: 45, perSide: true, cue: 'Vorderes Bein angewinkelt, Oberkörper langsam nach vorn.' },
  { id: 'thoracic_ext', name: 'BWS-Streckung über Rolle/Stuhl', focus: ['schulter', 'push', 'allgemein'], seconds: 60, cue: 'Hände hinter dem Kopf, oberen Rücken über die Kante strecken.' },
  { id: 'wrist_circles', name: 'Handgelenk-Mobilisation', focus: ['handgelenk', 'push'], seconds: 45, cue: 'Kreise in beide Richtungen, dann Handflächen am Boden sanft belasten.' },
  { id: 'lat_stretch', name: 'Lat-Dehnung an der Stange/Tür', focus: ['pull', 'schulter'], seconds: 45, perSide: true, cue: 'Festhalten, Hüfte nach hinten sinken lassen, seitlich dehnen.' },
  { id: 'pec_stretch', name: 'Brustdehnung im Türrahmen', focus: ['push', 'schulter'], seconds: 45, perSide: true, cue: 'Unterarm am Rahmen, Oberkörper leicht nach vorn drehen.' },
  { id: 'glute_bridge_mob', name: 'Glute Bridge (Aktivierung)', focus: ['hinge', 'squat', 'ruecken_unten'], seconds: 45, cue: '12–15 langsame Wiederholungen, oben 2 s halten.' },
];

export const MOBILITY_BY_ID = Object.fromEntries(MOBILITY.map((m) => [m.id, m]));

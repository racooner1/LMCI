// Baut zwei Einzeldatei-Varianten:
//   dist/lmci.html      – komplette, eigenständige HTML-Datei (offline nutzbar, per Doppelklick öffnen)
//   dist/artifact.html  – Fragment ohne <html>/<head>/<body> für Hosting-Umgebungen, die das Gerüst selbst liefern
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as esbuild from 'esbuild';

const result = await esbuild.build({
  entryPoints: ['src/app.js'],
  bundle: true,
  format: 'iife',
  minify: false,
  write: false,
  target: ['es2020'],
  define: { __LMCI_SINGLE__: 'true' },
  legalComments: 'none',
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('styles.css', 'utf8');
const html = readFileSync('index.html', 'utf8');

const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&display=swap">';
const bodyMarkup = html.match(/<body>([\s\S]*?)<script/)[1].trim();

const standalone = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>LMCI</title>
<meta name="description" content="LMCI – deine eigene, abofreie Trainings-App. Alles bleibt auf deinem Gerät.">
<meta name="theme-color" content="#1E56C8">
${fonts}
<style>
${css}
</style>
</head>
<body>
${bodyMarkup}
<script>
${js}
</script>
</body>
</html>
`;

const fragment = `<title>LMCI</title>
${fonts}
<style>
${css}
</style>
${bodyMarkup}
<script>
${js}
</script>
`;

mkdirSync('dist', { recursive: true });
writeFileSync('dist/lmci.html', standalone);
writeFileSync('dist/artifact.html', fragment);
console.log(`dist/lmci.html (${Math.round(standalone.length / 1024)} kB) und dist/artifact.html geschrieben.`);

// Bündelt das offizielle Anthropic-SDK für den Browser (für den optionalen KI-Coach).
// Ergebnis: vendor/anthropic-sdk.js (ES-Modul, wird nur bei Nutzung des Coaches geladen).
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';

mkdirSync('vendor', { recursive: true });
await esbuild.build({
  stdin: { contents: "export { default } from '@anthropic-ai/sdk'; export * from '@anthropic-ai/sdk';", resolveDir: process.cwd() },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  outfile: 'vendor/anthropic-sdk.js',
  legalComments: 'none',
  logLevel: 'info',
});

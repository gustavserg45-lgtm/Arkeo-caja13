/* Contratos estáticos para la publicación de Arqueo Express desde una subcarpeta. */
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

for (const asset of ['icon.svg', 'manifest.webmanifest', 'styles.css', 'cashier.css', 'cashier-v2.css', 'reconciliation.js', 'app.js', 'cashier-v2.js']) {
  assert.match(html, new RegExp('(?:href|src)="' + asset.replace('.', '\\.') + '"'), 'index.html debe cargar ' + asset);
}

assert.equal(manifest.start_url, './', 'La PWA debe iniciar de forma relativa');
assert.equal(manifest.scope, './', 'El scope de la PWA debe ser relativo');
assert.match(serviceWorker, /'\.\/index\.html'/, 'El service worker debe usar rutas relativas');
assert.match(serviceWorker, /'\.\/cashier-v2\.css'/, 'El cache offline debe incluir la vista Mi caja');
assert.match(serviceWorker, /'\.\/reconciliation\.js'/, 'El cache offline debe incluir la utilidad de conciliación');
assert.match(html, /cashier-v2\.css/, 'La vista Mi caja debe cargar sus estilos');

console.log('PASS: contrato estático de rutas relativas y assets de Mi caja');

// Pulso · extrae de OpenStreetMap (extracto de Geofabrik filtrado con osmium) las instalaciones industriales de España.
// Uso: node scripts/industrias.mjs industrias.geojsonseq
// Salida: data/industrias-osm-es.json → { t, n, tipos:[...], i:[[lat, lon, tipoIdx, nombre|null], ...] }
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { tipoDe, TIPOS_NOMBRES } from './tipos-industria.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entrada = process.argv[2];
if (!entrada) throw new Error('Falta el fichero geojsonseq');

// Centroide aproximado (media de vértices del anillo exterior); suficiente para radios de 1-2 km
function centro(g) {
  if (!g) return null;
  if (g.type === 'Point') return g.coordinates;
  const anillo = g.type === 'Polygon' ? g.coordinates[0] : g.type === 'MultiPolygon' ? g.coordinates[0][0] : g.type === 'LineString' ? g.coordinates : null;
  if (!anillo?.length) return null;
  const s = anillo.reduce((a, [x, y]) => [a[0] + x, a[1] + y], [0, 0]);
  return [s[0] / anillo.length, s[1] / anillo.length];
}

const salida = [];
const vistos = new Set();
const rl = readline.createInterface({ input: fs.createReadStream(entrada), crlfDelay: Infinity });
let leidos = 0;
for await (let linea of rl) {
  linea = linea.replace(/^\x1e/, '').trim();
  if (!linea) continue;
  leidos++;
  let f; try { f = JSON.parse(linea); } catch { continue; }
  const t = f.properties ?? {};
  const ti = tipoDe(t);
  if (!ti) continue;
  // Solo tipos con calor, más polígonos industriales con nombre (sirven para dar nombre y contexto)
  if (!ti.calor && !(ti.tipo === 'Polígono industrial' && t.name)) continue;
  const c = centro(f.geometry); if (!c) continue;
  const nombre = t.name ?? t.operator ?? t.brand ?? null;
  const lat = Math.round(c[1] * 1e4) / 1e4, lon = Math.round(c[0] * 1e4) / 1e4;
  const clave = `${lat},${lon},${ti.tipo}`;
  if (vistos.has(clave)) continue; vistos.add(clave);
  salida.push([lat, lon, TIPOS_NOMBRES.indexOf(ti.tipo), nombre]);
}
fs.writeFileSync(path.join(ROOT, 'data', 'industrias-osm-es.json'), JSON.stringify({ t: new Date().toISOString(), fuente: 'OpenStreetMap (Geofabrik)', n: salida.length, tipos: TIPOS_NOMBRES, i: salida }));
const porTipo = TIPOS_NOMBRES.map((n, k) => `${n}: ${salida.filter(x => x[2] === k).length}`).join(' · ');
console.log(`[industrias] ${leidos} elementos leídos → ${salida.length} guardados · ${porTipo}`);

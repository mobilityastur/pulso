// Pulso · agua. Procesa la BD-Embalses del MITECO (exportada a CSV con mdb-export) y genera data/agua.json.
// Uso: node scripts/agua.mjs /ruta/embalses.csv
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = process.argv[2];
if (!csvPath) throw new Error('Falta la ruta del CSV');

// ---------- CSV (mdb-export: comas, comillas dobles, decimales con coma) ----------
function* filasCSV(txt) {
  let campo = '', fila = [], q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) {
      if (c === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else q = false; }
      else campo += c;
    } else if (c === '"') q = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n') { fila.push(campo.replace(/\r$/, '')); yield fila; fila = []; campo = ''; }
    else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); yield fila; }
}
const num = s => { s = String(s).trim(); return Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s); };
function fecha(s) { // admite 2026-11-10, 11/10/26 00:00:00 (mm/dd/aa) y 10/11/2026
  s = String(s).trim();
  let m;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))) {
    const y = m[3].length === 2 ? (Number(m[3]) > 80 ? '19' : '20') + m[3] : m[3];
    return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`; // mdb-export usa mm/dd/aa
  }
  return null;
}

const txt = fs.readFileSync(csvPath, 'utf8');
const it = filasCSV(txt);
const cab = it.next().value.map(x => x.toLowerCase());
// Busca la primera columna que cumpla alguno de los patrones, por orden de preferencia
const col = (res, def) => { for (const re of res) { const i = cab.findIndex(c => re.test(c)); if (i >= 0) return i; } return def; };
const iAmb = col([/mbito/, /cuenca/, /demarc/], 0), iEmb = col([/embalse/], 1), iFec = col([/fecha/], 2),
  iCap = col([/capacidad/, /total/], 3), iAct = col([/actual/, /reserva/, /volumen/], 4), iEle = col([/el[eé]ctric/], 5);
console.log(`[agua] columnas: ${cab.join(' | ')} → ámbito=${iAmb} embalse=${iEmb} fecha=${iFec} cap=${iCap} act=${iAct} eléctrico=${iEle}`);

// porFecha: fecha -> { amb -> {cap, act}, emb -> {...} }
const registros = [];
for (const f of it) {
  if (f.length < 5) continue;
  const fe = fecha(f[iFec]); const cap = num(f[iCap]), act = num(f[iAct]);
  if (!fe || !Number.isFinite(cap) || !Number.isFinite(act) || cap <= 0) continue;
  registros.push({ amb: f[iAmb].trim(), emb: f[iEmb].trim(), fe, cap, act, ele: /^(1|-1|true|s)/i.test(String(f[iEle] ?? '').trim()) });
}
if (!registros.length) throw new Error('El CSV no tiene registros válidos');

// "Barca, La" -> "La Barca"; "Miño - Sil" -> "Miño-Sil"
const nombre = n => n.replace(/^(.+?),\s*(La|El|Los|Las|O|A|Os|As)$/i, '$2 $1').replace(/\s+-\s+/g, '-').replace(/\s+/g, ' ').trim();
for (const r of registros) { r.emb = nombre(r.emb); r.amb = nombre(r.amb); }

const fechas = [...new Set(registros.map(r => r.fe))].sort();
const ultima = fechas.at(-1);
const porFecha = new Map(fechas.map(f => [f, []]));
for (const r of registros) porFecha.get(r.fe).push(r);
console.log(`[agua] ${registros.length} registros · ${fechas.length} semanas · última ${ultima}`);

const suma = (rs, filtro = () => true) => rs.filter(filtro).reduce((a, r) => ({ cap: a.cap + r.cap, act: a.act + r.act }), { cap: 0, act: 0 });
const pct = s => s.cap ? Math.round(1000 * s.act / s.cap) / 10 : null;
const dias = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) / 86400e3;
const fechaCercana = (objetivo, max = 5) => {
  let mejor = null;
  for (const f of fechas) { const d = dias(f, objetivo); if (d <= max && (!mejor || d < mejor.d)) mejor = { f, d }; }
  return mejor?.f ?? null;
};
const restaAños = (f, n) => `${Number(f.slice(0, 4)) - n}${f.slice(4)}`;
const restaDias = (f, n) => new Date(Date.parse(f) - n * 86400e3).toISOString().slice(0, 10);

// Porcentaje (total o filtrado) en una fecha, y media de los 10 años anteriores en la misma semana
function pctEn(f, filtro) { const rs = f && porFecha.get(f); return rs ? pct(suma(rs, filtro)) : null; }
function media10(f, filtro) {
  const vals = [];
  for (let n = 1; n <= 10; n++) { const v = pctEn(fechaCercana(restaAños(f, n)), filtro); if (v != null) vals.push(v); }
  return vals.length >= 5 ? Math.round(10 * vals.reduce((a, b) => a + b, 0) / vals.length) / 10 : null;
}

const actuales = porFecha.get(ultima);
const fSemana = fechaCercana(restaDias(ultima, 7), 3);
const fAño = fechaCercana(restaAños(ultima, 1));

function resumen(filtro) {
  const s = suma(actuales, filtro), p = pct(s);
  const sem = fSemana ? suma(porFecha.get(fSemana), filtro) : null;
  return {
    capacidad: Math.round(s.cap), actual: Math.round(s.act), pct: p,
    var_semana_hm3: sem ? Math.round(s.act - sem.act) : null,
    var_semana_pts: sem ? Math.round(10 * (p - pct(sem))) / 10 : null,
    pct_hace_1_año: pctEn(fAño, filtro),
    pct_media_10: media10(ultima, filtro),
  };
}

const total = resumen();
const hidro = resumen(r => r.ele);
const ambitos = [...new Set(actuales.map(r => r.amb))]
  .map(nombre => ({ nombre, ...resumen(r => r.amb === nombre) }))
  .sort((a, b) => b.capacidad - a.capacidad);

// Serie de 52 semanas: este año, año anterior y media de 10 años
const ultimas = fechas.slice(-53);
const serie = ultimas.map(f => ({ f, pct: pctEn(f), anterior: pctEn(fechaCercana(restaAños(f, 1))), media10: media10(f) }));

// Embalses: dato actual y variación semanal
const semPrev = fSemana ? new Map(porFecha.get(fSemana).map(r => [r.amb + '|' + r.emb, r])) : new Map();
const embalses = actuales.map(r => {
  const p = semPrev.get(r.amb + '|' + r.emb);
  return { nombre: r.emb, ambito: r.amb, capacidad: Math.round(r.cap * 10) / 10, actual: Math.round(r.act * 10) / 10,
    pct: Math.round(1000 * r.act / r.cap) / 10, var_hm3: p ? Math.round((r.act - p.act) * 10) / 10 : null, electrico: r.ele };
}).sort((a, b) => a.ambito.localeCompare(b.ambito, 'es') || b.capacidad - a.capacidad);

const out = {
  actualizado: new Date().toISOString(),
  fuente: 'MITECO · Boletín Hidrológico (BD-Embalses)',
  ambito: 'Embalses peninsulares de más de 5 hm³',
  fecha: ultima,
  total, hidro, ambitos, serie, embalses,
};
fs.writeFileSync(path.join(ROOT, 'data', 'agua.json'), JSON.stringify(out) + '\n');
console.log(`[agua] ok · ${ultima} · total ${total.pct}% (media 10 años ${total.pct_media_10}%) · hidroeléctricos ${hidro.pct}% · ${ambitos.length} ámbitos · ${embalses.length} embalses`);

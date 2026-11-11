// Pulso · actualización de datos
// Descarga luz (REData, Red Eléctrica) y fuego (NASA FIRMS) y los guarda en /data.
// Uso: FIRMS_MAP_KEY=xxxx node scripts/update.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const TZ = 'Europe/Madrid';
const UA = 'Pulso/1.0 (+https://github.com/mobilityastur/pulso)';

// ---------- utilidades ----------
const readJSON = (f, def) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return def; } };
const writeJSON = (f, obj) => fs.writeFileSync(path.join(DATA, f), JSON.stringify(obj, null, 1) + '\n');

// Fecha local de Madrid en formato YYYY-MM-DDTHH:MM
function madridLocal(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

async function getJSON(url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': UA } });
      if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}\n${(await r.text()).slice(0, 300)}`);
      return await r.json();
    } catch (e) { last = e; await new Promise(s => setTimeout(s, 2000 * (i + 1))); }
  }
  throw last;
}

async function getText(url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error(`HTTP ${r.status} en ${url.replace(/\/api\/area\/csv\/[^/]+/, '/api/area/csv/***')}`);
      return await r.text();
    } catch (e) { last = e; await new Promise(s => setTimeout(s, 2000 * (i + 1))); }
  }
  throw last;
}

// ---------- LUZ (REData) ----------
const REE = 'https://apidatos.ree.es/es/datos';
const RENOVABLES = /hidr|e[oó]lica|solar|renovable|hidroe[oó]lica/i;
const NO_RENOVABLE_EXPL = /no renovable|residuos no renovables/i;

// Agrupa tecnologías en familias legibles con color fijo
const FAMILIAS = [
  { id: 'solar', nombre: 'Solar', test: /solar/i },
  { id: 'eolica', nombre: 'Eólica', test: /e[oó]lica/i },
  { id: 'hidraulica', nombre: 'Hidráulica', test: /hidr|turbinaci[oó]n bombeo/i },
  { id: 'nuclear', nombre: 'Nuclear', test: /nuclear/i },
  { id: 'gas', nombre: 'Gas', test: /ciclo combinado|cogeneraci[oó]n|turbina de gas/i },
  { id: 'carbon', nombre: 'Carbón', test: /carb[oó]n/i },
  { id: 'otras', nombre: 'Otras', test: /./ },
];
const familiaDe = t => FAMILIAS.find(f => f.test.test(t)).id;

function parseIncluded(json) {
  const inc = Array.isArray(json?.included) ? json.included : [];
  return inc.map(x => ({
    id: x.id,
    titulo: x.attributes?.title ?? x.type,
    tipo: x.attributes?.type ?? null, // "Renovable" / "No-Renovable" cuando existe
    color: x.attributes?.color ?? null,
    valores: (x.attributes?.values ?? []).map(v => ({ t: v.datetime, v: Number(v.value) })).filter(v => Number.isFinite(v.v)),
  }));
}

const esRenovable = s => s.tipo
  ? /^renovable/i.test(s.tipo)
  : (RENOVABLES.test(s.titulo) && !NO_RENOVABLE_EXPL.test(s.titulo) && !/bombeo/i.test(s.titulo));

// Servicio de tiempo real de REE (el que usa su web de demanda): generación por tecnología cada 5-10 min, península.
const REE_TR = 'https://demanda.ree.es/WSvisionaMovilesPeninsulaRest/resources/demandaGeneracionPeninsula';
// clave del servicio -> [nombre, familia, renovable]
const TR = {
  nuc: ['Nuclear', 'nuclear', false], eol: ['Eólica', 'eolica', true], hid: ['Hidráulica', 'hidraulica', true],
  solFot: ['Solar fotovoltaica', 'solar', true], solTer: ['Solar térmica', 'solar', true], sol: ['Solar', 'solar', true],
  cc: ['Ciclo combinado', 'gas', false], cogenResto: ['Cogeneración y residuos', 'gas', false], cogen: ['Cogeneración', 'gas', false],
  car: ['Carbón', 'carbon', false], gf: ['Fuel y gas', 'otras', false], termRenov: ['Térmica renovable', 'otras', true],
  aut: ['Autoproductores', 'otras', false], rsu: ['Residuos', 'otras', false],
  bio: ['Biomasa', 'otras', true], turb: ['Turbinación bombeo', 'hidraulica', false],
  bat: ['Baterías', 'otras', false], vap: ['Turbina de vapor', 'otras', false],
};
const CURVAS = ['DEMANDAAU', 'DEMANDA'];
const NO_GEN = new Set(['ts', 'dem', 'inter', 'icb', 'conb', 'consBat', 'dif', 'gnhd',
  'expAnd', 'expMar', 'expPor', 'expFra', 'expTot', 'impFra', 'impPor', 'impMar', 'impAnd', 'impTot']);

function offsetMadrid(d) {
  const tz = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' }).formatToParts(d).find(p => p.type === 'timeZoneName').value;
  return tz.replace('GMT', '') || '+00:00';
}

async function luzTiempoReal() {
  const ahora = new Date();
  const dias = [new Date(ahora.getTime() - 86400e3), ahora].map(d => madridLocal(d).slice(0, 10));
  const filas = [];
  for (const fecha of dias) {
    let ok = false;
    for (const curva of CURVAS) {
      const txt = await getText(`${REE_TR}?callback=cb&curva=${curva}&fecha=${fecha}`);
      const a = txt.indexOf('{'), b = txt.lastIndexOf('}');
      let json = null;
      try { json = JSON.parse(txt.slice(a, b + 1)); } catch {}
      if (json?.valoresHorariosGeneracion?.length) {
        filas.push(...json.valoresHorariosGeneracion); ok = true;
        if (curva !== CURVAS[0]) console.log(`[luz] curva válida: ${curva}`);
        break;
      }
      console.warn(`[luz] curva ${curva} ${fecha}: ${txt.slice(0, 160).replace(/\s+/g, ' ')}`);
    }
    if (!ok && fecha === dias[1]) throw new Error('el servicio de tiempo real no devolvió datos');
  }
  if (!filas.length) throw new Error('sin valoresHorariosGeneracion');
  const desconocidas = Object.keys(filas[0]).filter(k => !TR[k] && !NO_GEN.has(k));
  console.log(`[luz] tiempo real · claves: ${Object.keys(filas[0]).join(',')}${desconocidas.length ? ` · sin mapear: ${desconocidas.join(',')}` : ''}`);

  const off = offsetMadrid(ahora);
  const puntos = filas
    .map(f => ({ ...f, t: `${String(f.ts).replace(' ', 'T')}:00${off}` }))
    .filter(f => Date.parse(f.t) <= ahora.getTime() && ahora.getTime() - Date.parse(f.t) <= 24 * 3600e3)
    .map(f => {
      const fam = Object.fromEntries(FAMILIAS.map(x => [x.id, 0]));
      let total = 0, renov = 0;
      const tec = {};
      for (const [k, [nombre, familia, ren]] of Object.entries(TR)) {
        if (k === 'sol' && ('solFot' in f)) continue; // evita contar la solar dos veces
        const v = Number(f[k]);
        if (!Number.isFinite(v) || v <= 0) continue;
        fam[familia] += v; total += v; if (ren) renov += v; tec[k] = v;
      }
      return { t: f.t, total: Math.round(total), renovable: total ? Math.round(1000 * renov / total) / 10 : null,
        mix: Object.fromEntries(Object.entries(fam).map(([k, v]) => [k, Math.round(v)])), _tec: tec, _dem: Number(f.dem) };
    })
    .filter(p => p.total > 0 && Object.keys(p._tec).length >= 3)
    .sort((a, b) => a.t.localeCompare(b.t));
  if (puntos.length < 3) throw new Error('muy pocos puntos en tiempo real');

  // Reduce a un punto cada 20 minutos para que la gráfica sea ligera
  const serie = puntos.filter((p, i) => i === puntos.length - 1 || new Date(p.t).getMinutes() % 20 === 0);
  const ultimo = puntos.at(-1);
  const tecnologias = Object.entries(ultimo._tec)
    .map(([k, v]) => ({ titulo: TR[k][0], renovable: TR[k][2], familia: TR[k][1], valor: Math.round(v) }))
    .sort((a, b) => b.valor - a.valor);
  const clean = ({ _tec, _dem, ...p }) => p;
  return { resolucion: 'realtime', unidad: 'MW', ambito: 'Península', ultimo: clean(ultimo), serie: serie.map(clean), tecnologias,
    fuente: 'Red Eléctrica · tiempo real (península)' };
}

async function luzDiaria() {
  const fin = new Date();
  const qq = `start_date=${madridLocal(new Date(fin.getTime() - 7 * 86400e3)).slice(0, 10)}T00:00&end_date=${madridLocal(fin)}`;
  const j = await getJSON(`${REE}/generacion/estructura-generacion?${qq}&time_trunc=day`);
  const gen = parseIncluded(j).filter(s => !/generaci[oó]n total/i.test(s.titulo));
  if (!gen.some(s => s.valores.length)) throw new Error('REData no devolvió generación');
  const instantes = [...new Set(gen.flatMap(s => s.valores.map(v => v.t)))].sort();
  const serie = instantes.map(t => {
    const fam = Object.fromEntries(FAMILIAS.map(f => [f.id, 0]));
    let total = 0, renov = 0;
    for (const s of gen) {
      const v = s.valores.find(x => x.t === t)?.v ?? 0;
      if (v <= 0) continue;
      fam[familiaDe(s.titulo)] += v; total += v;
      if (esRenovable(s)) renov += v;
    }
    return { t, total: Math.round(total), renovable: total ? Math.round(1000 * renov / total) / 10 : null, mix: Object.fromEntries(Object.entries(fam).map(([k, v]) => [k, Math.round(v)])) };
  }).filter(p => p.total > 0);
  const ultimo = serie.at(-1);
  const tecnologias = gen
    .map(s => ({ titulo: s.titulo, renovable: esRenovable(s), familia: familiaDe(s.titulo), valor: Math.round(s.valores.find(v => v.t === ultimo.t)?.v ?? 0) }))
    .filter(x => x.valor > 0).sort((a, b) => b.valor - a.valor);
  return { resolucion: 'day', unidad: 'MWh', ambito: 'España', ultimo, serie, tecnologias, fuente: 'Red Eléctrica · REData (diario)' };
}

async function luz() {
  let g;
  try { g = await luzTiempoReal(); }
  catch (e) { console.warn(`[luz] tiempo real falló, uso el diario: ${e.message}`); g = await luzDiaria(); }

  // Demanda en tiempo real (REData). Opcional.
  let demanda = null;
  try {
    const fin = new Date(), ini = new Date(fin.getTime() - 24 * 3600e3);
    const j = await getJSON(`${REE}/demanda/demanda-tiempo-real?start_date=${madridLocal(ini)}&end_date=${madridLocal(fin)}&time_trunc=hour`);
    const s = parseIncluded(j);
    const reduce = arr => arr.filter((v, i) => i === arr.length - 1 || new Date(v.t).getMinutes() % 20 === 0).map(v => ({ t: v.t, v: Math.round(v.v) }));
    const real = s.find(x => /real/i.test(x.titulo)), prev = s.find(x => /prevista/i.test(x.titulo));
    if (real?.valores.length) demanda = { actual: Math.round(real.valores.at(-1).v), t: real.valores.at(-1).t, real: reduce(real.valores), prevista: prev ? reduce(prev.valores) : [] };
  } catch (e) { console.warn(`[luz] demanda falló: ${e.message}`); }

  const u = g.ultimo;
  const out = {
    actualizado: new Date().toISOString(),
    fuente: g.fuente, resolucion: g.resolucion, unidad: g.unidad, ambito: g.ambito,
    ahora: { t: u.t, total: u.total, renovable: u.renovable, mix: u.mix },
    tecnologias: g.tecnologias, serie: g.serie, demanda,
  };
  writeJSON('luz.json', out);
  console.log(`[luz] ok · ${g.serie.length} puntos (${g.resolucion}) · ${u.renovable}% renovable`);
  return out;
}

// ---------- FUEGO (NASA FIRMS) ----------
const FIRMS = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';
const SATELITES = ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT'];
const AREAS = ['-9.6,35.8,4.6,44.0', '-18.4,27.5,-13.3,29.6']; // Península+Baleares, Canarias

const ESPANA = JSON.parse(fs.readFileSync(path.join(DATA, 'espana.geojson'), 'utf8')).geometry;
function enAnillo([x, y], anillo) {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i], [xj, yj] = anillo[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}
const enEspana = p => ESPANA.coordinates.some(([ext, ...huecos]) => enAnillo(p, ext) && !huecos.some(h => enAnillo(p, h)));

function parseCSV(txt) {
  const [cab, ...filas] = txt.trim().split(/\r?\n/);
  if (!cab || !cab.includes('latitude')) {
    if (/invalid|error/i.test(txt)) throw new Error(`FIRMS respondió: ${txt.slice(0, 200)}`);
    return [];
  }
  const cols = cab.split(',');
  return filas.map(l => Object.fromEntries(l.split(',').map((v, i) => [cols[i], v])));
}

// Fuentes industriales fijas (antorchas, hornos, refinerías): el satélite las ve casi a diario.
// Semillas conocidas + aprendizaje: una celda de ~2 km con focos en 5 días distintos del último mes se marca como fija.
const FIJAS_SEMILLA = [
  { nombre: 'ArcelorMittal Gijón (Veriña)', lat: 43.5232, lon: -5.727 },
  { nombre: 'ArcelorMittal Avilés', lat: 43.5394, lon: -5.8286 },
];
const RADIO_FIJA_KM = 2, DIAS_FIJA = 5;
const distKm = (a, b) => Math.hypot((a.lat - b.lat) * 111.2, (a.lon - b.lon) * 111.2 * Math.cos(a.lat * Math.PI / 180));
const celda = f => `${(Math.round(f.lat / 0.02) * 0.02).toFixed(2)},${(Math.round(f.lon / 0.02) * 0.02).toFixed(2)}`;

async function fuego() {
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) throw new Error('Falta FIRMS_MAP_KEY');

  const brutos = [];
  for (const sat of SATELITES) for (const area of AREAS) {
    try { brutos.push(...parseCSV(await getText(`${FIRMS}/${key}/${sat}/${area}/2`)).map(r => ({ ...r, _sat: sat }))); }
    catch (e) { console.warn(`[fuego] ${sat} ${area}: ${e.message}`); }
  }

  const ahora = Date.now();
  const focos = brutos.map(r => {
    const hhmm = String(r.acq_time).padStart(4, '0');
    const t = new Date(`${r.acq_date}T${hhmm.slice(0, 2)}:${hhmm.slice(2)}:00Z`);
    return {
      lat: +(+r.latitude).toFixed(4), lon: +(+r.longitude).toFixed(4),
      t: t.toISOString(),
      frp: +(+r.frp || 0).toFixed(1), // potencia radiativa (MW)
      conf: { l: 'baja', n: 'nominal', h: 'alta' }[r.confidence] ?? r.confidence,
      sat: r._sat.replace('VIIRS_', '').replace('_NRT', ''),
      dn: r.daynight === 'N' ? 'noche' : 'día',
    };
  })
    .filter(f => ahora - Date.parse(f.t) <= 24 * 3600e3)
    .filter(f => f.conf !== 'baja')
    .filter(f => enEspana([f.lon, f.lat]))
    .sort((a, b) => b.t.localeCompare(a.t));

  // Agrupa detecciones muy cercanas (~1,5 km) en un mismo foco: varios satélites ven el mismo fuego
  const grupos = [];
  for (const f of focos) {
    const g = grupos.find(g => Math.hypot((g.lat - f.lat) * 111, (g.lon - f.lon) * 85) < 1.5);
    if (g) { g.n++; g.frp = Math.max(g.frp, f.frp); if (f.t > g.t) g.t = f.t; if (f.conf === 'alta') g.conf = 'alta'; }
    else grupos.push({ ...f, n: 1 });
  }
  grupos.sort((a, b) => b.frp - a.frp);

  // Separa fuentes industriales fijas
  const hoy = madridLocal(new Date()).slice(0, 10);
  const memoria = readJSON('fuego-fijos.json', { celdas: {} });
  const limite = madridLocal(new Date(Date.now() - 30 * 86400e3)).slice(0, 10);
  for (const g of grupos) {
    const c = (memoria.celdas[celda(g)] ??= { dias: [] });
    if (!c.dias.includes(hoy)) c.dias.push(hoy);
  }
  for (const [k, c] of Object.entries(memoria.celdas)) {
    c.dias = c.dias.filter(d => d >= limite).sort();
    if (!c.dias.length) delete memoria.celdas[k];
  }
  writeJSON('fuego-fijos.json', memoria);

  const focos_ = [], industriales = [];
  for (const g of grupos) {
    const semilla = FIJAS_SEMILLA.find(x => distKm(x, g) <= RADIO_FIJA_KM);
    const dias = memoria.celdas[celda(g)]?.dias.length ?? 0;
    if (semilla || dias >= DIAS_FIJA) industriales.push({ ...g, nombre: semilla?.nombre ?? null, dias_mes: dias });
    else focos_.push(g);
  }

  // Histórico diario (para tendencias): solo focos no industriales, máximo visto en el día
  const hist = readJSON('fuego-historico.json', { dias: {} });
  hist.dias[hoy] = Math.max(hist.dias[hoy] ?? 0, focos_.length);
  const claves = Object.keys(hist.dias).sort().slice(-800);
  hist.dias = Object.fromEntries(claves.map(k => [k, hist.dias[k]]));
  writeJSON('fuego-historico.json', hist);

  const out = {
    actualizado: new Date().toISOString(),
    fuente: 'NASA FIRMS · VIIRS (Suomi NPP, NOAA-20, NOAA-21)',
    ventana_h: 24,
    total: focos_.length,
    detecciones: focos.length,
    mayor: focos_[0] ?? null,
    focos: focos_,
    industriales,
  };
  writeJSON('fuego.json', out);
  console.log(`[fuego] ok · ${focos.length} detecciones → ${focos_.length} focos + ${industriales.length} industriales`);
  return out;
}


// ---------- TIERRA (EMSC + nombres del IGN) ----------
const EMSC = 'https://www.seismicportal.eu/fdsnws/event/1/query';
const IGN_RSS = 'https://www.ign.es/ign/RssTools/sismologia.xml';
// Zona de interés: España, sus mares y Canarias
const ZONAS = [[35.0, 44.5, -10.5, 5.0], [27.0, 30.0, -19.0, -13.0]]; // [latMin, latMax, lonMin, lonMax]
const enZona = (la, lo) => ZONAS.some(([a, b, c, d]) => la >= a && la <= b && lo >= c && lo <= d);
const PROV = { A: 'Alicante', AB: 'Albacete', AL: 'Almería', AV: 'Ávila', B: 'Barcelona', BA: 'Badajoz', BI: 'Bizkaia', BU: 'Burgos',
  C: 'A Coruña', CA: 'Cádiz', CC: 'Cáceres', CE: 'Ceuta', CO: 'Córdoba', CR: 'Ciudad Real', CS: 'Castellón', CU: 'Cuenca', GC: 'Las Palmas',
  GI: 'Girona', GR: 'Granada', GU: 'Guadalajara', H: 'Huelva', HU: 'Huesca', J: 'Jaén', L: 'Lleida', LE: 'León', LO: 'La Rioja', LU: 'Lugo',
  M: 'Madrid', MA: 'Málaga', ML: 'Melilla', MU: 'Murcia', NA: 'Navarra', O: 'Asturias', OR: 'Ourense', P: 'Palencia', PM: 'Baleares',
  PO: 'Pontevedra', S: 'Cantabria', SA: 'Salamanca', SE: 'Sevilla', SG: 'Segovia', SO: 'Soria', SS: 'Gipuzkoa', T: 'Tarragona', TE: 'Teruel',
  TF: 'Santa Cruz de Tenerife', TO: 'Toledo', V: 'Valencia', VA: 'Valladolid', VI: 'Álava', Z: 'Zaragoza', ZA: 'Zamora',
  FRA: 'Francia', POR: 'Portugal', MAR: 'Marruecos', ARG: 'Argelia', AND: 'Andorra' };
const DIR = { N: 'N', S: 'S', E: 'E', W: 'O', NE: 'NE', NW: 'NO', SE: 'SE', SW: 'SO' };
const titulo = t => t.toLowerCase().replace(/(^|[\s\-(/'])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())
  .replace(/\b(De|Del|La|Las|Los|El|Y|D')\b/g, x => x.toLowerCase()).replace(/^(\p{L})/u, x => x.toUpperCase());
function lugarIGN(raw) {
  // "E PLIEGO.MU" -> "E de Pliego (Murcia)"; "ALBORÁN NORTE" -> "Alborán Norte"; "GOLFO DE CÁDIZ" -> "Golfo de Cádiz"
  const m = raw.trim().match(/^(?:(N|S|E|W|NE|NW|SE|SW)\s+)?(.+?)(?:\.([A-Z]{1,3}))?$/);
  if (!m) return titulo(raw);
  const [, dir, sitio, prov] = m;
  const base = titulo(sitio);
  return `${dir ? DIR[dir] + ' de ' : ''}${base}${prov ? ` (${PROV[prov] ?? prov})` : ''}`;
}

async function nombresIGN() {
  try {
    const xml = await getText(IGN_RSS);
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => {
      const d = it.match(/magnitud\s+([\d.]+)\s+en\s+(.+?)\s+en la fecha/i);
      const la = Number(it.match(/<geo:lat>([^<]+)/)?.[1]), lo = Number(it.match(/<geo:long>([^<]+)/)?.[1]);
      const id = it.match(/evid=([\w]+)/)?.[1];
      return d && Number.isFinite(la) ? { mag: Number(d[1]), lugar: lugarIGN(d[2]), lat: la, lon: lo, id } : null;
    }).filter(Boolean);
  } catch (e) { console.warn(`[tierra] RSS IGN falló: ${e.message}`); return []; }
}

async function tierra() {
  const desde = new Date(Date.now() - 10 * 86400e3).toISOString().slice(0, 19);
  const consultas = ZONAS.map(([a, b, c, d]) => `${EMSC}?format=json&minlat=${a}&maxlat=${b}&minlon=${c}&maxlon=${d}&start=${desde}&minmag=1.5&limit=2000&orderby=time`);
  const [ign, ...emsc] = await Promise.all([nombresIGN(), ...consultas.map(u => getJSON(u))]);
  const feats = emsc.flatMap(j => j?.features ?? []);
  if (!feats.length && !ign.length) throw new Error('Sin datos de EMSC ni del IGN');

  const vistos = new Set();
  const eventos = feats.map(f => {
    const p = f.properties;
    const lat = +p.lat, lon = +p.lon;
    const n = ign.find(x => Math.abs(x.lat - lat) < 0.06 && Math.abs(x.lon - lon) < 0.06 && Math.abs(x.mag - p.mag) <= 0.4);
    return {
      id: p.unid, t: new Date(p.time).toISOString(), lat: +lat.toFixed(4), lon: +lon.toFixed(4),
      prof: Number.isFinite(+p.depth) ? Math.round(Math.abs(+p.depth)) : null,
      mag: Math.round(+p.mag * 10) / 10, tipo_mag: p.magtype ?? null,
      lugar: n?.lugar ?? null, region: titulo(p.flynn_region ?? ''), autor: p.auth ?? null,
      ign: n?.id ? `https://www.ign.es/web/ign/portal/sis-catalogo-terremotos/-/catalogo-terremotos/detailTerremoto?evid=${n.id}` : null,
    };
  }).filter(e => enZona(e.lat, e.lon) && !vistos.has(e.id) && vistos.add(e.id))
    .sort((a, b) => b.t.localeCompare(a.t));

  const h24 = eventos.filter(e => Date.now() - Date.parse(e.t) <= 24 * 3600e3);
  const mayor24 = h24.reduce((m, e) => (!m || e.mag > m.mag ? e : m), null);
  const out = {
    actualizado: new Date().toISOString(),
    fuente: 'EMSC (datos de la Red Sísmica Nacional del IGN y otras redes) · nombres del IGN',
    ventana_dias: 10,
    h24: { total: h24.length, sentibles: h24.filter(e => e.mag >= 2.5).length, mayor: mayor24 },
    eventos,
  };
  writeJSON('tierra.json', out);
  console.log(`[tierra] ok · ${eventos.length} sismos en 10 días · ${h24.length} en 24 h · mayor ${mayor24?.mag ?? '-'} ${mayor24?.lugar ?? mayor24?.region ?? ''}`);
  return out;
}

// ---------- principal ----------
fs.mkdirSync(DATA, { recursive: true });
const res = await Promise.allSettled([luz(), fuego(), tierra()]);
const estado = readJSON('estado.json', {});
['luz', 'fuego', 'tierra'].forEach((k, i) => {
  estado[k] = res[i].status === 'fulfilled'
    ? { ok: true, t: new Date().toISOString() }
    : { ok: false, t: new Date().toISOString(), error: String(res[i].reason?.message ?? res[i].reason).slice(0, 300), ultimo_ok: estado[k]?.ok ? estado[k].t : estado[k]?.ultimo_ok ?? null };
  if (res[i].status === 'rejected') console.error(`[${k}] ERROR: ${res[i].reason?.message ?? res[i].reason}`);
});
writeJSON('estado.json', estado);
if (res.every(r => r.status === 'rejected')) process.exit(1);

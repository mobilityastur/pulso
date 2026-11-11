'use strict';
// Pulso · app web. Lee los JSON de /data generados por la GitHub Action.

const FAM = {
  solar:      { n: 'Solar',      c: '#F2B33D' },
  eolica:     { n: 'Eólica',     c: '#3DBBA0' },
  hidraulica: { n: 'Hidráulica', c: '#4A90E2' },
  nuclear:    { n: 'Nuclear',    c: '#9B7FE0' },
  gas:        { n: 'Gas',        c: '#E07A5F' },
  carbon:     { n: 'Carbón',     c: '#6E6A66' },
  otras:      { n: 'Otras',      c: '#A9ADB5' },
};
const ORDEN = ['solar', 'eolica', 'hidraulica', 'nuclear', 'gas', 'carbon', 'otras'];

// Ciudades de referencia para describir dónde está un foco
const CIUDADES = [
  ['A Coruña',43.362,-8.411],['Ferrol',43.484,-8.233],['Santiago',42.878,-8.544],['Lugo',43.012,-7.556],['Ourense',42.336,-7.864],['Pontevedra',42.431,-8.644],['Vigo',42.240,-8.720],
  ['Oviedo',43.361,-5.849],['Gijón',43.532,-5.661],['Avilés',43.556,-5.924],['Santander',43.462,-3.810],['Bilbao',43.263,-2.935],['Vitoria',42.847,-2.672],['San Sebastián',43.318,-1.981],
  ['Pamplona',42.812,-1.645],['Logroño',42.465,-2.445],['Zaragoza',41.649,-0.889],['Huesca',42.136,-0.408],['Teruel',40.345,-1.106],['Lleida',41.617,0.620],['Girona',41.979,2.821],
  ['Barcelona',41.385,2.173],['Manresa',41.729,1.823],['Tarragona',41.118,1.245],['Tortosa',40.812,0.521],['Castellón',39.986,-0.051],['Valencia',39.470,-0.376],['Alicante',38.345,-0.481],
  ['Benidorm',38.541,-0.123],['Murcia',37.992,-1.131],['Cartagena',37.606,-0.986],['Lorca',37.677,-1.700],['Almería',36.834,-2.463],['Granada',37.177,-3.599],['Jaén',37.779,-3.785],
  ['Linares',38.093,-3.636],['Córdoba',37.888,-4.779],['Sevilla',37.389,-5.984],['Huelva',37.261,-6.945],['Cádiz',36.527,-6.288],['Jerez',36.686,-6.136],['Algeciras',36.131,-5.454],
  ['Málaga',36.721,-4.421],['Ronda',36.742,-5.167],['Badajoz',38.879,-6.970],['Mérida',38.916,-6.344],['Cáceres',39.475,-6.372],['Plasencia',40.030,-6.088],['Toledo',39.863,-4.027],
  ['Talavera',39.963,-4.830],['Ciudad Real',38.985,-3.927],['Albacete',38.994,-1.858],['Cuenca',40.070,-2.137],['Guadalajara',40.633,-3.167],['Madrid',40.417,-3.704],['Segovia',40.943,-4.109],
  ['Ávila',40.656,-4.700],['Salamanca',40.970,-5.664],['Zamora',41.503,-5.745],['Valladolid',41.652,-4.724],['Palencia',42.010,-4.533],['Burgos',42.344,-3.697],['Soria',41.764,-2.465],
  ['León',42.599,-5.567],['Ponferrada',42.546,-6.598],['Palma',39.570,2.650],['Ibiza',38.907,1.432],['Mahón',39.889,4.265],['Las Palmas',28.124,-15.430],['Santa Cruz de Tenerife',28.464,-16.251],
  ['Arrecife',28.963,-13.548],['Puerto del Rosario',28.500,-13.862],['Santa Cruz de La Palma',28.684,-17.765],['San Sebastián de La Gomera',28.093,-17.111],['Valverde',27.809,-17.915],
  ['Ceuta',35.889,-5.321],['Melilla',35.292,-2.938],
];
const RUMBOS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
function cercaDe(lat, lon) {
  let best = null;
  for (const [n, la, lo] of CIUDADES) {
    const dy = (lat - la) * 111.2, dx = (lon - lo) * 111.2 * Math.cos(la * Math.PI / 180);
    const d = Math.hypot(dx, dy);
    if (!best || d < best.d) best = { n, d, dx, dy };
  }
  if (best.d < 4) return `En ${best.n}`;
  const ang = (Math.atan2(best.dx, best.dy) * 180 / Math.PI + 360) % 360;
  return `${Math.round(best.d)} km al ${RUMBOS[Math.round(ang / 45) % 8]} de ${best.n}`;
}

// ---------- formato ----------
const nf = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const horaFmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
const diaFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' });
const hora = t => horaFmt.format(new Date(t));
function hace(t) {
  const m = Math.round((Date.now() - new Date(t)) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
}
const $ = id => document.getElementById(id);
const el = (tag, attrs = {}, html = '') => Object.assign(document.createElement(tag), attrs, html ? { innerHTML: html } : {});

// ---------- datos ----------
const estado = { luz: null, fuego: null, hist: null, st: null };
async function cargar(f) {
  const r = await fetch(`data/${f}?v=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(f);
  return r.json();
}
async function actualizar() {
  const b = $('refrescar'); b.classList.add('girando');
  const [luz, fuego, hist, st] = await Promise.allSettled(['luz.json', 'fuego.json', 'fuego-historico.json', 'estado.json'].map(cargar));
  estado.luz = luz.value ?? estado.luz;
  estado.fuego = fuego.value ?? estado.fuego;
  estado.hist = hist.value ?? estado.hist;
  estado.st = st.value ?? estado.st;
  b.classList.remove('girando');
  pintar();
}

// ---------- pintado ----------
function pintar() {
  const { luz, fuego } = estado;
  const ts = [luz?.actualizado, fuego?.actualizado].filter(Boolean).sort().at(-1);
  $('refrescar').textContent = ts ? `Actualizado ${hace(ts)}` : 'Sin datos aún';
  pintarLuz(luz);
  pintarFuego(fuego);
  pintarConexiones();
  pintarMapas();
}

function mixPct(mix) {
  const tot = ORDEN.reduce((s, k) => s + (mix[k] || 0), 0) || 1;
  return ORDEN.map(k => ({ k, p: 100 * (mix[k] || 0) / tot })).filter(x => x.p > 0);
}

function pintarLuz(luz) {
  if (!luz) { $('c-luz-pie').textContent = 'Esperando datos'; return; }
  const a = luz.ahora;
  $('c-luz-val').textContent = `${nf.format(a.renovable)} %`;
  $('c-luz-mix').innerHTML = mixPct(a.mix).map(x => `<span style="width:${x.p}%;background:${FAM[x.k].c}"></span>`).join('');
  $('c-luz-pie').textContent = luz.resolucion === 'hour' ? `renovable · ${hora(a.t)}` : `renovable · ${diaFmt.format(new Date(a.t))}`;

  $('l-renov').textContent = `${nf.format(a.renovable)} %`;
  $('grafica-mix').innerHTML = graficaMix(luz.serie, luz.resolucion);
  $('leyenda-mix').innerHTML = ORDEN.filter(k => luz.serie.some(p => p.mix[k] > 0))
    .map(k => `<span><i style="background:${FAM[k].c}"></i>${FAM[k].n}</span>`).join('');

  const tot = luz.tecnologias.reduce((s, t) => s + t.valor, 0) || 1;
  $('tecnos').innerHTML = luz.tecnologias.map(t => {
    const p = 100 * t.valor / tot;
    return `<li><span>${t.titulo}${t.renovable ? ' <small style="color:var(--aire)">●</small>' : ''}</span><span class="v">${nf1.format(p)} %</span>
      <div class="barra"><span style="width:${p}%;background:${FAM[t.familia].c}"></span></div></li>`;
  }).join('');

  if (luz.demanda?.real?.length) {
    $('panel-demanda').hidden = false;
    $('grafica-demanda').innerHTML = graficaLineas([
      { pts: luz.demanda.prevista, c: 'var(--tx3)', dash: '3 3' },
      { pts: luz.demanda.real, c: 'var(--luz)' },
    ], 'MW');
  }
  $('l-fuente').textContent = `Fuente: ${luz.fuente}. Datos provisionales. ${luz.resolucion === 'hour' ? 'Energía por hora.' : 'Energía por día.'}`;
}

function pintarFuego(f) {
  if (!f) { $('c-fuego-pie').textContent = 'Esperando datos'; return; }
  $('c-fuego-val').textContent = f.total === 1 ? '1 foco' : `${nf.format(f.total)} focos`;
  $('c-fuego-pie').textContent = f.total ? `Mayor: ${cercaDe(f.mayor.lat, f.mayor.lon)}` : 'Últimas 24 h, sin focos';
  $('f-total').textContent = nf.format(f.total);

  const lista = $('focos');
  if (!f.focos.length) { lista.innerHTML = '<li class="vacio">Ningún foco de calor en las últimas 24 horas.</li>'; }
  else {
    lista.innerHTML = '';
    f.focos.slice(0, 40).forEach(x => {
      const li = el('li', {}, `<div class="punto">${x.frp >= 100 ? nf.format(x.frp) : nf1.format(x.frp)}</div>
        <div class="info"><div class="lugar">${cercaDe(x.lat, x.lon)}</div>
        <div class="det">${hora(x.t)} · ${x.dn} · confianza ${x.conf}${x.n > 1 ? ` · ${x.n} detecciones` : ''}</div></div>`);
      li.onclick = () => { location.hash = '#mapa'; setTimeout(() => mapas.grande?.setView([x.lat, x.lon], 11), 80); };
      lista.append(li);
    });
    if (f.focos.length > 40) lista.append(el('li', { className: 'vacio' }, `Y ${f.focos.length - 40} focos más en el mapa.`));
  }
  $('f-fuente').textContent = `Fuente: ${f.fuente}. El número del círculo es la potencia radiativa del fuego (MW).`;

  const dias = Object.entries(estado.hist?.dias ?? {}).slice(-30);
  $('grafica-fuego').innerHTML = dias.length > 1 ? graficaBarras(dias) : '<p class="vacio">El histórico se irá llenando con los días.</p>';
}

function pintarConexiones() {
  const { luz, fuego, hist } = estado, li = [];
  const add = (e, h) => li.push(`<li><span class="e">${e}</span><span>${h}</span></li>`);
  if (luz?.serie?.length) {
    const s = luz.serie, a = luz.ahora;
    const max = s.reduce((m, p) => p.renovable > m.renovable ? p : m);
    const lider = mixPct(a.mix).sort((x, y) => y.p - x.p)[0];
    add('⚡', `<b>${FAM[lider.k].n}</b> es la primera fuente ahora, con el <b>${nf.format(lider.p)} %</b> de la generación.`);
    if (luz.resolucion === 'hour' && max.t !== a.t)
      add('📈', `El pico renovable de las últimas 24 h fue del <b>${nf.format(max.renovable)} %</b> a las ${hora(max.t)}.`);
    const hid = mixPct(a.mix).find(x => x.k === 'hidraulica');
    if (hid) add('💧', `La hidráulica aporta el <b>${nf.format(hid.p)} %</b>. Cuando llegue la capa de agua, se cruzará con la reserva de los embalses.`);
  }
  if (fuego) {
    const dias = Object.values(hist?.dias ?? {}).slice(-31, -1);
    const media = dias.length >= 5 ? dias.reduce((a, b) => a + b, 0) / dias.length : null;
    if (!fuego.total) add('🔥', 'Ningún foco de calor detectado por satélite en las últimas 24 h.');
    else {
      add('🔥', `El foco más intenso está <b>${cercaDe(fuego.mayor.lat, fuego.mayor.lon).replace(/^En /, 'en ')}</b> (${nf.format(fuego.mayor.frp)} MW).`);
      if (media !== null) {
        const r = fuego.total / Math.max(media, 0.5);
        add('📊', r > 1.5 ? `Hoy hay <b>más focos de lo habitual</b>: ${fuego.total} frente a una media de ${nf.format(media)} en el último mes.`
          : r < 0.67 ? `Hoy hay <b>menos focos de lo habitual</b>: ${fuego.total} frente a una media de ${nf.format(media)}.`
          : `Actividad de fuego en la media del último mes (${nf.format(media)} focos al día).`);
      }
    }
  }
  const st = estado.st ?? {};
  ['luz', 'fuego'].forEach(k => { if (st[k] && !st[k].ok) add('⚠️', `La última descarga de ${k} falló; se muestran los datos anteriores.`); });
  $('conexiones').innerHTML = li.join('') || '<li class="cargando">Aún no hay datos. Lanza la Action «Actualizar datos» en GitHub.</li>';
}

// ---------- gráficas SVG ----------
const W = 640, H = 220, PL = 52, PR = 8, PT = 8, PB = 28;
function ejes(n, maxY, etqX, unidad = '') {
  const y = v => PT + (H - PT - PB) * (1 - v / maxY);
  let g = '';
  for (let i = 0; i <= 2; i++) {
    const v = maxY * i / 2;
    g += `<line x1="${PL}" x2="${W - PR}" y1="${y(v)}" y2="${y(v)}" stroke="var(--bd)"/>`;
    g += `<text x="${PL - 6}" y="${y(v) + 3}" text-anchor="end">${v >= 1000 ? nf.format(v / 1000) + 'k' : nf.format(v)}${i === 2 ? unidad : ''}</text>`;
  }
  etqX.forEach(([i, t]) => { g += `<text x="${PL + (W - PL - PR) * i / Math.max(n - 1, 1)}" y="${H - 6}" text-anchor="middle">${t}</text>`; });
  return g;
}
function etiquetasX(pts, porDia) {
  const n = pts.length, paso = Math.max(1, Math.round(n / 5));
  const out = [];
  for (let i = 0; i < n; i += paso) out.push([i, porDia ? diaFmt.format(new Date(pts[i].t)) : hora(pts[i].t)]);
  return out;
}
function graficaMix(serie, res) {
  if (!serie?.length) return '';
  const n = serie.length, maxY = Math.max(...serie.map(p => p.total)) * 1.05;
  const x = i => PL + (W - PL - PR) * i / Math.max(n - 1, 1);
  const y = v => PT + (H - PT - PB) * (1 - v / maxY);
  const base = new Array(n).fill(0);
  let capas = '';
  for (const k of ORDEN) {
    if (!serie.some(p => p.mix[k] > 0)) continue;
    const top = serie.map((p, i) => base[i] + (p.mix[k] || 0));
    const d = `M${top.map((v, i) => `${x(i)},${y(v)}`).join('L')}L${[...base].reverse().map((v, j) => `${x(n - 1 - j)},${y(v)}`).join('L')}Z`;
    capas += `<path d="${d}" fill="${FAM[k].c}" opacity=".9"/>`;
    top.forEach((v, i) => base[i] = v);
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mix de generación">${ejes(n, maxY, etiquetasX(serie, res !== 'hour'), ' MWh')}${capas}</svg>`;
}
function graficaLineas(series, unidad) {
  const todas = series.flatMap(s => s.pts);
  if (!todas.length) return '';
  const ref = series.reduce((a, s) => s.pts.length > a.length ? s.pts : a, []);
  const t0 = Date.parse(ref[0].t), t1 = Date.parse(ref.at(-1).t);
  const maxY = Math.max(...todas.map(p => p.v)) * 1.08;
  const x = t => PL + (W - PL - PR) * (Date.parse(t) - t0) / Math.max(t1 - t0, 1);
  const y = v => PT + (H - PT - PB) * (1 - v / maxY);
  const lineas = series.map(s => s.pts.length ? `<path d="M${s.pts.map(p => `${x(p.t)},${y(p.v)}`).join('L')}" fill="none" stroke="${s.c}" stroke-width="2" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''}/>` : '').join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Demanda">${ejes(ref.length, maxY, etiquetasX(ref), ' ' + unidad)}${lineas}</svg>`;
}
function graficaBarras(dias) {
  const n = dias.length, maxY = Math.max(5, ...dias.map(d => d[1])) * 1.1;
  const bw = (W - PL - PR) / n;
  const y = v => PT + (H - PT - PB) * (1 - v / maxY);
  const barras = dias.map(([d, v], i) => `<rect x="${PL + i * bw + 1}" y="${y(v)}" width="${Math.max(bw - 2, 1)}" height="${y(0) - y(v)}" rx="2" fill="var(--fuego)" opacity="${i === n - 1 ? 1 : .55}"><title>${d}: ${v}</title></rect>`).join('');
  const et = dias.map((d, i) => [i, d[0]]).filter((_, i) => i % Math.max(1, Math.round(n / 5)) === 0)
    .map(([i, d]) => `<text x="${PL + (i + .5) * bw}" y="${H - 6}" text-anchor="middle">${diaFmt.format(new Date(d + 'T12:00:00'))}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Focos por día">${ejes(2, maxY, [])}${et}${barras}</svg>`;
}

// ---------- mapas ----------
const oscuro = matchMedia('(prefers-color-scheme: dark)');
const teselas = () => `https://{s}.basemaps.cartocdn.com/${oscuro.matches ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`;
const mapas = { grande: null, mini: null, capas: {} };
function crearMapa(id, interactivo) {
  const m = L.map(id, { zoomControl: interactivo, attributionControl: interactivo, dragging: interactivo, scrollWheelZoom: interactivo,
    doubleClickZoom: interactivo, touchZoom: interactivo, boxZoom: interactivo, keyboard: interactivo, zoomSnap: 0.25 });
  L.tileLayer(teselas(), { maxZoom: 18, subdomains: 'abcd',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>' }).addTo(m);
  m.fitBounds([[35.9, -9.4], [43.9, 4.4]], { padding: [6, 6] });
  return m;
}
function iconoFoco(frp) {
  const s = Math.round(Math.min(26, 8 + Math.sqrt(frp) * 2));
  return L.divIcon({ className: '', html: `<div class="pulso-foco" style="width:${s}px;height:${s}px"></div>`, iconSize: [s, s], iconAnchor: [s / 2, s / 2] });
}
function capaFuego(conPopups) {
  const g = L.layerGroup();
  (estado.fuego?.focos ?? []).forEach(f => {
    const mk = L.marker([f.lat, f.lon], { icon: iconoFoco(f.frp), keyboard: false });
    if (conPopups) mk.bindPopup(`<b>${cercaDe(f.lat, f.lon)}</b><br>${hora(f.t)} (${hace(f.t)}) · ${f.dn}<br>Potencia: ${nf1.format(f.frp)} MW · confianza ${f.conf}<br>Satélite ${f.sat}${f.n > 1 ? ` · ${f.n} detecciones` : ''}`);
    mk.addTo(g);
  });
  return g;
}
function pintarMapas() {
  if (typeof L === 'undefined') return;
  if (!mapas.mini) mapas.mini = crearMapa('mapa-mini', false);
  mapas.capas.mini?.remove(); mapas.capas.mini = capaFuego(false).addTo(mapas.mini);
  if (mapas.grande) { mapas.capas.grande?.remove(); mapas.capas.grande = capaFuego(true).addTo(mapas.grande); }
  $('leyenda-mapa').innerHTML = `<i style="background:var(--fuego)"></i>Focos de calor 24 h (${estado.fuego?.total ?? 0}) · tamaño = intensidad`;
}

// ---------- navegación ----------
function ir() {
  const v = (location.hash.slice(1) || 'inicio');
  const vista = ['inicio', 'mapa', 'luz', 'fuego'].includes(v) ? v : 'inicio';
  document.querySelectorAll('.vista').forEach(s => s.classList.toggle('activa', s.id === `v-${vista}`));
  document.querySelectorAll('.tabs a').forEach(a => a.classList.toggle('activa', a.dataset.v === vista));
  if (vista === 'mapa' && typeof L !== 'undefined') {
    if (!mapas.grande) { mapas.grande = crearMapa('mapa', true); mapas.capas.grande = capaFuego(true).addTo(mapas.grande); }
    setTimeout(() => mapas.grande.invalidateSize(), 50);
  }
  if (vista !== 'mapa') scrollTo({ top: 0 });
}
addEventListener('hashchange', ir);
$('refrescar').onclick = actualizar;
document.addEventListener('visibilitychange', () => { if (!document.hidden) actualizar(); });
setInterval(actualizar, 5 * 60e3);

ir();
actualizar();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

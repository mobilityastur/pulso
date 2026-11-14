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
// Cuenca hidrográfica (como la nombra el MITECO) de cada ciudad de referencia; sin dato en islas, Ceuta y Melilla
const CUENCA = {
  'A Coruña': 'Galicia Costa', 'Ferrol': 'Galicia Costa', 'Santiago': 'Galicia Costa', 'Pontevedra': 'Galicia Costa', 'Vigo': 'Galicia Costa',
  'Lugo': 'Miño-Sil', 'Ourense': 'Miño-Sil', 'Ponferrada': 'Miño-Sil',
  'Oviedo': 'Cantábrico Occidental', 'Gijón': 'Cantábrico Occidental', 'Avilés': 'Cantábrico Occidental', 'Santander': 'Cantábrico Occidental',
  'Bilbao': 'Cuencas Internas del País Vasco', 'San Sebastián': 'Cuencas Internas del País Vasco',
  'Vitoria': 'Ebro', 'Pamplona': 'Ebro', 'Logroño': 'Ebro', 'Zaragoza': 'Ebro', 'Huesca': 'Ebro', 'Lleida': 'Ebro', 'Tortosa': 'Ebro',
  'Girona': 'Cuencas Internas de Cataluña', 'Barcelona': 'Cuencas Internas de Cataluña', 'Manresa': 'Cuencas Internas de Cataluña', 'Tarragona': 'Cuencas Internas de Cataluña',
  'Teruel': 'Júcar', 'Castellón': 'Júcar', 'Valencia': 'Júcar', 'Alicante': 'Júcar', 'Benidorm': 'Júcar', 'Albacete': 'Júcar', 'Cuenca': 'Júcar',
  'Murcia': 'Segura', 'Cartagena': 'Segura', 'Lorca': 'Segura',
  'Almería': 'Cuenca Mediterránea Andaluza', 'Málaga': 'Cuenca Mediterránea Andaluza', 'Algeciras': 'Cuenca Mediterránea Andaluza', 'Ronda': 'Cuenca Mediterránea Andaluza',
  'Granada': 'Guadalquivir', 'Jaén': 'Guadalquivir', 'Linares': 'Guadalquivir', 'Córdoba': 'Guadalquivir', 'Sevilla': 'Guadalquivir',
  'Huelva': 'Tinto, Odiel y Piedras', 'Cádiz': 'Guadalete-Barbate', 'Jerez': 'Guadalete-Barbate',
  'Badajoz': 'Guadiana', 'Mérida': 'Guadiana', 'Ciudad Real': 'Guadiana',
  'Cáceres': 'Tajo', 'Plasencia': 'Tajo', 'Toledo': 'Tajo', 'Talavera': 'Tajo', 'Guadalajara': 'Tajo', 'Madrid': 'Tajo',
  'Segovia': 'Duero', 'Ávila': 'Duero', 'Salamanca': 'Duero', 'Zamora': 'Duero', 'Valladolid': 'Duero', 'Palencia': 'Duero', 'Burgos': 'Duero', 'Soria': 'Duero', 'León': 'Duero',
};
const ciudadMasCercana = (lat, lon) => CIUDADES.reduce((m, [n, la, lo]) => { const d = Math.hypot((lat - la) * 111.2, (lon - lo) * 111.2 * Math.cos(la * Math.PI / 180)); return !m || d < m.d ? { n, d } : m; }, null);
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
const estado = { luz: null, fuego: null, hist: null, st: null, agua: null, tierra: null, aire: null, reg: null };
async function cargar(f) {
  const r = await fetch(`data/${f}?v=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(f);
  return r.json();
}
async function actualizar() {
  const b = $('refrescar'); b.classList.add('girando');
  const [luz, fuego, hist, st, agua, tierra, aire] = await Promise.allSettled(['luz.json', 'fuego.json', 'fuego-historico.json', 'estado.json', 'agua.json', 'tierra.json', 'aire.json'].map(cargar));
  estado.aire = aire.value ?? estado.aire;
  try { estado.reg = await cargar('industrias-registro.json'); } catch {}
  estado.agua = agua.value ?? estado.agua;
  estado.tierra = tierra.value ?? estado.tierra;
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
  pintarAgua(estado.agua);
  pintarTierra(estado.tierra);
  pintarAire(estado.aire);
  pintarRegistro();
  pintarZona();
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
  const diario = luz.resolucion === 'day';
  $('c-luz-pie').textContent = diario ? `renovable · día ${diaFmt.format(new Date(a.t))}` : `renovable · ${hora(a.t)}`;

  $('l-renov').textContent = `${nf.format(a.renovable)} %`;
  $('grafica-mix').innerHTML = graficaMix(luz.serie, luz.resolucion, luz.unidad);
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
  $('l-fuente').textContent = `Fuente: ${luz.fuente}. Datos provisionales.${diario ? ' Energía por día: el tiempo real no estaba disponible.' : ''}`;
}

function pintarFuego(f) {
  if (!f) { $('c-fuego-pie').textContent = 'Esperando datos'; return; }
  $('c-fuego-val').textContent = f.total === 1 ? '1 foco' : `${nf.format(f.total)} focos`;
  const ind = f.industriales ?? [];
  $('c-fuego-pie').textContent = f.total ? `Mayor: ${cercaDe(f.mayor.lat, f.mayor.lon)}`
    : ind.length ? `Sin incendios · ${ind.length} industrial${ind.length > 1 ? 'es' : ''}` : 'Últimas 24 h, sin focos';
  $('f-total').textContent = nf.format(f.total);

  const lista = $('focos');
  if (!f.focos.length) { lista.innerHTML = '<li class="vacio">Ningún foco de calor fuera de instalaciones industriales en las últimas 24 horas.</li>'; }
  else {
    lista.innerHTML = '';
    f.focos.slice(0, 40).forEach(x => {
      const li = el('li', {}, `<div class="punto">${x.frp >= 100 ? nf.format(x.frp) : nf1.format(x.frp)}</div>
        <div class="info"><div class="lugar">${cercaDe(x.lat, x.lon)}</div>
        <div class="det">${hora(x.t)} · ${x.dn} · confianza ${x.conf}${x.n > 1 ? ` · ${x.n} detecciones` : ''}${x.contexto ? `<br>Cerca de ${x.contexto}` : ''}</div></div>`);
      li.onclick = () => { location.hash = '#mapa'; setTimeout(() => mapas.grande?.setView([x.lat, x.lon], 11), 80); };
      lista.append(li);
    });
    if (f.focos.length > 40) lista.append(el('li', { className: 'vacio' }, `Y ${f.focos.length - 40} focos más en el mapa.`));
  }
  $('industriales').innerHTML = ind.length ? ind.map(x => `<li data-lat="${x.lat}" data-lon="${x.lon}"><div class="punto gris">${nf1.format(x.frp)}</div>
    <div class="info"><div class="lugar">${x.nombre ?? x.tipo}</div>
    <div class="det">${x.nombre ? x.tipo + ' · ' : ''}${x.zona ? 'en ' + x.zona + ' · ' : ''}${cercaDe(x.lat, x.lon)} · ${hora(x.t)}</div></div></li>`).join('')
    : '<li class="vacio">Ninguna en las últimas 24 horas.</li>';
  document.querySelectorAll('#industriales li[data-lat]').forEach(li => li.onclick = () => { location.hash = '#mapa'; setTimeout(() => mapas.grande?.setView([+li.dataset.lat, +li.dataset.lon], 13), 80); });
  const nreg = Object.keys(estado.reg?.instalaciones ?? {}).length;
  $('ir-registro').textContent = nreg ? `Registro (${nreg}) ›` : 'Registro ›';
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
    const cuando = luz.resolucion === 'day' ? 'hoy' : 'ahora';
    add('⚡', `<b>${FAM[lider.k].n}</b> es la primera fuente ${cuando}, con el <b>${nf.format(lider.p)} %</b> de la generación.`);
    if (luz.resolucion !== 'day' && max.t !== a.t)
      add('📈', `El pico renovable de las últimas 24 h fue del <b>${nf.format(max.renovable)} %</b> a las ${hora(max.t)}.`);
    const hid = mixPct(a.mix).find(x => x.k === 'hidraulica');
    const ag = estado.agua;
    if (hid && ag?.hidro?.pct != null) {
      const dm = ag.hidro.pct_media_10 != null ? Math.round(ag.hidro.pct - ag.hidro.pct_media_10) : null;
      add('💧', `La hidráulica aporta el <b>${nf.format(hid.p)} %</b> de la luz, con los embalses hidroeléctricos al <b>${nf.format(ag.hidro.pct)} %</b>${dm != null ? ` (${dm >= 0 ? `${dm} puntos por encima` : `${-dm} puntos por debajo`} de su media de 10 años)` : ''}.`);
    } else if (hid) add('💧', `La hidráulica aporta el <b>${nf.format(hid.p)} %</b> de la generación.`);
  }
  if (fuego) {
    const dias = Object.values(hist?.dias ?? {}).slice(-31, -1);
    const media = dias.length >= 5 ? dias.reduce((a, b) => a + b, 0) / dias.length : null;
    const ni = fuego.industriales?.length ?? 0;
    if (!fuego.total) add('🔥', `Ningún foco de calor fuera de instalaciones industriales en las últimas 24 h.${ni ? ` El satélite sí ve ${ni} fuente${ni > 1 ? 's' : ''} industrial${ni > 1 ? 'es' : ''} fija${ni > 1 ? 's' : ''}.` : ''}`);
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
  const ag = estado.agua;
  if (ag?.total) {
    const T = ag.total, top = [...ag.ambitos].sort((x, y) => y.pct - x.pct), alto = top[0], bajo = top.at(-1);
    add('🏞️', `Los embalses están al <b>${nf1.format(T.pct)} %</b>${T.var_semana_pts != null ? ` (${fmtPts(T.var_semana_pts)} en la semana)` : ''}. La cuenca más llena es ${alto.nombre} (${nf.format(alto.pct)} %) y la más baja, ${bajo.nombre} (${nf.format(bajo.pct)} %).`);
  }
  const ai = estado.aire;
  if (ai?.puntos?.length) {
    const malas = ai.reparto.slice(3).reduce((a, b) => a + b, 0), p = ai.peor[0];
    add('🌬️', malas ? `<b>${malas} ciudad${malas > 1 ? 'es' : ''}</b> con aire desfavorable o peor. La peor, ${p.n} (calidad ${ICA[p.cat].toLowerCase()}${p.dom ? `, por ${p.dom}` : ''}).`
      : `Aire bueno o razonable en casi toda España. El valor más alto está en ${p.n} (${ICA[p.cat].toLowerCase()}${p.dom && p.cat >= 2 ? `, por ${p.dom}` : ''}).`);
  }
  const ti = estado.tierra;
  if (ti?.h24) {
    const m = ti.h24.mayor;
    if (m && m.mag >= 2.5) add('🌍', `El terremoto más fuerte de las últimas 24 h fue de magnitud <b>${nf1.format(m.mag)}</b> ${m.lugar ? `en ${m.lugar}` : `(${lugarSismo(m).replace(/^En /, 'en ')})`}, ${hace(m.t)}.`);
    else add('🌍', `Ningún terremoto de magnitud 2,5 o más en 24 h${ti.h24.total ? `; ${ti.h24.total} microsismos registrados` : ''}.`);
  }
  const st = estado.st ?? {};
  ['luz', 'fuego', 'tierra', 'aire'].forEach(k => { if (st[k] && !st[k].ok) add('⚠️', `La última descarga de ${k} falló; se muestran los datos anteriores.`); });
  $('conexiones').innerHTML = li.join('') || '<li class="cargando">Aún no hay datos. Lanza la Action «Actualizar datos» en GitHub.</li>';
}


const fmtPct = v => v == null ? '—' : `${nf1.format(v)} %`;
const fmtPts = v => v == null ? '' : `${v > 0 ? '+' : v < 0 ? '−' : '±'}${nf1.format(Math.abs(v))} pts`;
const fechaLarga = f => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(new Date(f + 'T12:00:00'));
let cuencaSel = (() => { try { return JSON.parse(localStorage.getItem('pulso.cuenca')); } catch { return null; } })();
const guardarCuenca = () => { try { localStorage.setItem('pulso.cuenca', JSON.stringify(cuencaSel)); } catch {} };

function pintarAgua(a) {
  if (!a) { $('c-agua-val').textContent = '—'; $('c-agua-pie').textContent = 'Esperando datos'; return; }
  const T = a.total;
  $('c-agua-val').textContent = fmtPct(T.pct);
  $('c-agua-pie').textContent = T.pct_media_10 != null ? `${fmtPts(Math.round(10 * (T.pct - T.pct_media_10)) / 10)} vs. media 10 años` : `${fmtPts(T.var_semana_pts)} en la semana`;
  $('a-pct').textContent = fmtPct(T.pct);
  $('a-txt').textContent = `de capacidad en los embalses peninsulares · ${fechaLarga(a.fecha)}`;
  $('a-cifras').innerHTML = [
    [fmtPts(T.var_semana_pts) || '—', `en la semana (${T.var_semana_hm3 > 0 ? '+' : ''}${nf.format(T.var_semana_hm3 ?? 0)} hm³)`],
    [fmtPct(T.pct_hace_1_año), 'hace un año'],
    [fmtPct(T.pct_media_10), 'media 10 años'],
  ].map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('');
  $('grafica-agua').innerHTML = graficaAgua(a.serie);

  $('cuencas').innerHTML = a.ambitos.map(x => {
    const d = x.pct_media_10 != null ? Math.round(10 * (x.pct - x.pct_media_10)) / 10 : null;
    return `<li data-c="${x.nombre}"><div class="fila"><span>${x.nombre}</span><span><b>${fmtPct(x.pct)}</b></span></div>
      <div class="barra"><span style="width:${Math.min(100, x.pct)}%"></span>${x.pct_media_10 != null ? `<i style="left:${Math.min(100, x.pct_media_10)}%" title="Media 10 años"></i>` : ''}</div>
      ${d != null ? `<div class="dif ${d >= 0 ? 'mas' : 'menos'}">${fmtPts(d)} sobre la media</div>` : ''}</li>`;
  }).join('');
  document.querySelectorAll('#cuencas li').forEach(li => li.onclick = () => { cuencaSel = li.dataset.c; guardarCuenca(); pintarEmbalses(); $('sel-cuenca').scrollIntoView({ behavior: 'smooth', block: 'center' }); });

  const sel = $('sel-cuenca');
  const nombres = a.ambitos.map(x => x.nombre);
  if (!cuencaSel || !nombres.includes(cuencaSel)) cuencaSel = (typeof cuencaDeZona === 'function' && cuencaDeZona()) || nombres[0];
  sel.innerHTML = nombres.map(n => `<option${n === cuencaSel ? ' selected' : ''}>${n}</option>`).join('');
  sel.onchange = () => { cuencaSel = sel.value; guardarCuenca(); pintarEmbalses(); };
  pintarEmbalses();
  $('a-fuente').textContent = `Fuente: ${a.fuente}. ${a.ambito}. Datos semanales provisionales. La raya vertical de cada cuenca marca su media de 10 años.`;
}
function pintarEmbalses() {
  const a = estado.agua; if (!a) return;
  $('sel-cuenca').value = cuencaSel;
  $('embalses').innerHTML = a.embalses.filter(e => e.ambito === cuencaSel).map(e => `<li>
    <span>${e.nombre}${e.electrico ? ' <small title="Hidroeléctrico">⚡</small>' : ''}</span>
    <span class="v">${fmtPct(e.pct)} · ${nf1.format(e.actual)}/${nf.format(e.capacidad)} hm³</span>
    <div class="barra"><span style="width:${Math.min(100, e.pct)}%;background:var(--agua)"></span></div></li>`).join('');
}

const clasMag = m => m >= 4 ? 'm4' : m >= 3 ? 'm3' : '';
let magMin = 2.5;
const lugarSismo = e => e.lugar ?? cercaDe(e.lat, e.lon);
function pintarTierra(t) {
  if (!t) { $('c-tierra-val').textContent = '—'; $('c-tierra-pie').textContent = 'Esperando datos'; return; }
  const h = t.h24, m = h.mayor;
  $('c-tierra-val').textContent = h.total === 1 ? '1 sismo' : `${nf.format(h.total)} sismos`;
  $('c-tierra-pie').textContent = m ? `Mayor: M${nf1.format(m.mag)} ${lugarSismo(m)}` : 'Sin terremotos en 24 h';
  $('t-total').textContent = nf.format(h.total);
  $('t-txt').textContent = `terremotos en las últimas 24 h${h.total ? ` · ${h.sentibles} de magnitud 2,5 o más` : ''}`;
  const lista = t.eventos.filter(e => e.mag >= magMin);
  $('sismos').innerHTML = lista.length ? lista.slice(0, 80).map(e => `<li data-lat="${e.lat}" data-lon="${e.lon}">
      <div class="punto mag ${clasMag(e.mag)}">${nf1.format(e.mag)}</div>
      <div class="info"><div class="lugar">${lugarSismo(e)}</div>
      <div class="det">${diaFmt.format(new Date(e.t))} ${hora(e.t)} · ${hace(e.t)}${e.prof != null ? ` · ${e.prof} km de profundidad` : ''}</div></div></li>`).join('')
    : `<li class="vacio">Ningún terremoto${magMin ? ' de magnitud 2,5 o más' : ''} en los últimos 10 días.</li>`;
  document.querySelectorAll('#sismos li[data-lat]').forEach(li => li.onclick = () => {
    location.hash = '#mapa'; setTimeout(() => mapas.grande?.setView([+li.dataset.lat, +li.dataset.lon], 9), 80);
  });
  $('t-fuente').textContent = `Fuente: ${t.fuente}. Hora local peninsular.`;
}
document.querySelectorAll('#v-tierra .seg button').forEach(b => b.onclick = () => {
  magMin = Number(b.dataset.m);
  document.querySelectorAll('#v-tierra .seg button').forEach(x => x.classList.toggle('on', x === b));
  pintarTierra(estado.tierra);
});

function graficaAgua(serie) {
  if (!serie?.length) return '';
  const n = serie.length, vals = serie.flatMap(p => [p.pct, p.anterior, p.media10]).filter(v => v != null);
  const minY = Math.max(0, Math.floor((Math.min(...vals) - 5) / 10) * 10), maxY = Math.min(100, Math.ceil((Math.max(...vals) + 5) / 10) * 10);
  const x = i => PL + (W - PL - PR) * i / Math.max(n - 1, 1);
  const y = v => PT + (H - PT - PB) * (1 - (v - minY) / (maxY - minY));
  const linea = (k, c, extra = '') => {
    const pts = serie.map((p, i) => p[k] != null ? `${x(i)},${y(p[k])}` : null).filter(Boolean);
    return pts.length ? `<path d="M${pts.join('L')}" fill="none" stroke="${c}" stroke-width="${k === 'pct' ? 2.6 : 1.6}" ${extra}/>` : '';
  };
  let g = '';
  for (let v = minY; v <= maxY; v += (maxY - minY) / 2) g += `<line x1="${PL}" x2="${W - PR}" y1="${y(v)}" y2="${y(v)}" stroke="var(--bd)"/><text x="${PL - 6}" y="${y(v) + 5}" text-anchor="end">${nf.format(v)} %</text>`;
  const meses = new Intl.DateTimeFormat('es-ES', { month: 'short' });
  serie.forEach((p, i) => { if (i % 9 === 0) g += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${meses.format(new Date(p.f + 'T12:00:00'))}</text>`; });
  const u = serie.at(-1);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Reserva de agua">${g}${linea('media10', 'var(--tx2)', 'stroke-dasharray="5 4"')}${linea('anterior', 'var(--tx3)')}${linea('pct', 'var(--agua)')}<circle cx="${x(n - 1)}" cy="${y(u.pct)}" r="4.5" fill="var(--agua)"/></svg>`;
}


// ---------- AIRE ----------
const ICA = ['Buena', 'Razonablemente buena', 'Regular', 'Desfavorable', 'Muy desfavorable', 'Extremadamente desfavorable'];
const ICA_COL = ['#50C8F0', '#50CCAA', '#F0E641', '#FF5050', '#960032', '#7D2181'];
const repartoHTML = rep => { const tot = rep.reduce((a, b) => a + b, 0) || 1; return rep.map((n, k) => n ? `<span style="width:${100 * n / tot}%;background:${ICA_COL[k]}"></span>` : '').join(''); };
function spark(vals, w = 120, h = 22) {
  if (!vals?.length) return '';
  const max = Math.max(60, ...vals), x = i => i * w / Math.max(vals.length - 1, 1), y = v => h - 2 - (h - 4) * v / max;
  const segs = vals.slice(1).map((v, i) => `<line x1="${x(i)}" y1="${y(vals[i])}" x2="${x(i + 1)}" y2="${y(v)}" stroke="${ICA_COL[Math.min(5, Math.floor(Math.max(0, v - .001) / 20))]}" stroke-width="2.2" stroke-linecap="round"/>`).join('');
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${segs}</svg>`;
}
function pintarAire(a) {
  if (!a) { $('c-aire-val').textContent = '—'; $('c-aire-pie').textContent = 'Esperando datos'; return; }
  const n = a.puntos.length, buenas = a.reparto[0] + a.reparto[1], malas = a.reparto.slice(3).reduce((x, y) => x + y, 0);
  const moda = a.reparto.indexOf(Math.max(...a.reparto));
  $('c-aire-val').textContent = ICA[moda];
  $('c-aire-rep').innerHTML = repartoHTML(a.reparto);
  $('c-aire-pie').textContent = malas ? `${malas} ciudad${malas > 1 ? 'es' : ''} con aire desfavorable o peor · peor: ${a.peor[0].n}` : `${buenas} de ${n} ciudades con aire bueno o razonablemente bueno`;
  $('ai-num').textContent = `${buenas}/${n}`;
  $('ai-rep').innerHTML = repartoHTML(a.reparto);
  $('ai-ley').innerHTML = ICA.map((c, k) => `<li><i style="background:${ICA_COL[k]}"></i>${c}: ${a.reparto[k]}</li>`).join('');
  $('ai-lista').innerHTML = [...a.puntos].sort((x, y) => y.eaqi - x.eaqi).map(p => `<li data-lat="${p.la}" data-lon="${p.lo}">
    <div class="punto ica c${p.cat}" style="background:${ICA_COL[p.cat]}">${p.eaqi}</div>
    <div class="info"><div class="lugar">${p.n}</div>
    <div class="det">${ICA[p.cat]}${p.dom && p.cat >= 2 ? ` · por ${p.dom}` : ''}${p.prev24 && p.prev24.cat > p.cat ? ` · empeora a ${ICA[p.prev24.cat].toLowerCase()} hacia las ${hora(p.prev24.t + ':00')}` : ''}</div>
    ${spark(p.serie)}</div></li>`).join('');
  document.querySelectorAll('#ai-lista li').forEach(li => li.onclick = () => { location.hash = '#mapa'; setTimeout(() => mapas.grande?.setView([+li.dataset.lat, +li.dataset.lon], 9), 80); });
  $('ai-fuente').textContent = `Fuente: ${a.fuente}. Dato de las ${a.hora ? a.hora.slice(11, 16) : '—'}. La línea de color muestra la previsión de las próximas 24 h.`;
}

// ---------- MI ZONA Y AVISOS ----------
const ls = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
let zona = ls.get('pulso.zona');
let zonaOculta = ls.get('pulso.zonaOculta') === true;
function cuencaDeZona() {
  if (!zona) return null;
  const n = zona.fuente === 'ciudad' ? zona.n : ciudadMasCercana(zona.la, zona.lo)?.n;
  const c = CUENCA[n];
  return c && estado.agua?.ambitos?.some(x => x.nombre === c) ? c : null;
}
function ocultarZona(v) { zonaOculta = v; ls.set('pulso.zonaOculta', v ? true : null); pintarZona(); }
const distKm = (a, b) => Math.hypot((a.la - b.la) * 111.2, (a.lo - b.lo) * 111.2 * Math.cos(a.la * Math.PI / 180));
function datosZona() {
  if (!zona) return null;
  const z = { la: zona.la, lo: zona.lo };
  const aire = estado.aire?.puntos?.length ? [...estado.aire.puntos].sort((a, b) => distKm(z, a) - distKm(z, b))[0] : null;
  const focos = (estado.fuego?.focos ?? []).map(f => ({ ...f, d: distKm(z, { la: f.lat, lo: f.lon }) })).filter(f => f.d <= 50).sort((a, b) => a.d - b.d);
  const sismos = (estado.tierra?.eventos ?? []).map(e => ({ ...e, d: distKm(z, { la: e.lat, lo: e.lon }) }))
    .filter(e => e.d <= 100 && Date.now() - Date.parse(e.t) <= 7 * 86400e3).sort((a, b) => b.t.localeCompare(a.t));
  return { aire, aireLejos: aire ? distKm(z, aire) : null, focos, sismos };
}
function pintarZona() {
  const box = $('mizona');
  $('mostrar-zona').hidden = !zonaOculta;
  if (zonaOculta) { box.innerHTML = ''; pintarAvisos(null); return; }
  if (!zona) { box.innerHTML = `<div class="mz-vacio"><span>Elige tu zona para ver el aire, los focos y los sismos cerca de ti.</span><span class="mz-bot"><button id="mz-elegir">Elegir</button><button id="mz-ocultar" aria-label="Ocultar">✕</button></span></div>`;
    $('mz-elegir').onclick = abrirHoja; $('mz-ocultar').onclick = () => ocultarZona(true); pintarAvisos(null); return; }
  const d = datosZona(), filas = [];
  if (d.aire) {
    const p = d.aire, empeora = p.prev24 && p.prev24.cat > p.cat;
    filas.push(['🌬️', `Calidad del aire <b>${ICA[p.cat].toLowerCase()}</b> <span class="dot" style="background:${ICA_COL[p.cat]}"></span>`,
      `${p.n}${d.aireLejos > 5 ? ` (a ${Math.round(d.aireLejos)} km)` : ''}${empeora ? ` · empeora a ${ICA[p.prev24.cat].toLowerCase()} hacia las ${hora(p.prev24.t + ':00')}` : ' · sin empeoramiento previsto en 24 h'}`]);
  }
  filas.push(['🔥', d.focos.length ? `<b>${d.focos.length} foco${d.focos.length > 1 ? 's' : ''}</b> de calor a menos de 50 km` : 'Ningún foco de calor a menos de 50 km',
    d.focos.length ? `El más cercano, ${cercaDe(d.focos[0].lat, d.focos[0].lon).replace(/^En /, 'en ')}, a ${Math.round(d.focos[0].d)} km` : 'Últimas 24 h, sin contar instalaciones industriales']);
  const s = d.sismos, ult = s[0];
  filas.push(['🌍', s.length ? `<b>${s.length} sismo${s.length > 1 ? 's' : ''}</b> a menos de 100 km esta semana` : 'Ningún sismo a menos de 100 km esta semana',
    ult ? `Último: M${nf1.format(ult.mag)} ${lugarSismo(ult)}, ${hace(ult.t)}` : 'Magnitud 1,5 o más, últimos 7 días']);
  const cz = cuencaDeZona();
  if (cz) {
    const c = estado.agua.ambitos.find(x => x.nombre === cz);
    const dm = c.pct_media_10 != null ? Math.round(10 * (c.pct - c.pct_media_10)) / 10 : null;
    filas.push(['💧', `Embalses del ${c.nombre}: <b>${nf1.format(c.pct)} %</b>`, dm != null ? `${fmtPts(Math.abs(dm)).replace(/^[+−±]/, '')} ${dm >= 0 ? 'por encima' : 'por debajo'} de su media de 10 años` : 'Datos semanales del MITECO']);
  }
  box.innerHTML = `<div class="mz"><div class="mz-cab"><b>📍 ${zona.n}</b><span class="mz-bot"><button id="mz-cambiar">Cambiar</button><button id="mz-ocultar" aria-label="Ocultar Mi zona">✕</button></span></div>
    ${filas.map(([e, a, b]) => `<div class="mz-fila"><span class="e">${e}</span><div>${a}<small>${b}</small></div></div>`).join('')}</div>`;
  $('mz-cambiar').onclick = abrirHoja;
  $('mz-ocultar').onclick = () => ocultarZona(true);
  pintarAvisos(d);
}
function pintarAvisos(d) {
  const av = [];
  if (d?.aire) {
    const p = d.aire;
    if (p.cat >= 3) av.push(['', '😷', `Calidad del aire ${ICA[p.cat].toLowerCase()} en ${p.n} (${p.dom ?? 'varios contaminantes'}). Mejor evitar el ejercicio intenso al aire libre.`]);
    else if (p.prev24?.cat >= 3) av.push(['amarillo', '🌬️', `Se prevé calidad del aire ${ICA[p.prev24.cat].toLowerCase()} en ${p.n} hacia las ${hora(p.prev24.t + ':00')}.`]);
  }
  const f = d?.focos?.find(x => x.d <= 25);
  if (f) av.push(['', '🔥', `Foco de calor a ${Math.round(f.d)} km de tu zona (${cercaDe(f.lat, f.lon).replace(/^En /, 'en ')}), ${hace(f.t)}.`]);
  const s = d?.sismos?.find(x => x.mag >= 2.5 && Date.now() - Date.parse(x.t) <= 24 * 3600e3);
  if (s) av.push(['amarillo', '🌍', `Terremoto de magnitud ${nf1.format(s.mag)} a ${Math.round(s.d)} km: ${lugarSismo(s)}, ${hace(s.t)}.`]);
  const m = estado.tierra?.h24?.mayor;
  if (m && m.mag >= 4 && !av.some(x => x[1] === '🌍')) av.push(['amarillo', '🌍', `Terremoto de magnitud ${nf1.format(m.mag)} en ${lugarSismo(m)}, ${hace(m.t)}.`]);
  $('avisos').innerHTML = av.map(([c, e, txt]) => `<div class="aviso ${c}"><span>${e}</span><span>${txt}</span></div>`).join('');
}
function abrirHoja() {
  const sel = $('z-ciudad');
  if (!sel.options.length) sel.innerHTML = `<option value="">Elegir ciudad…</option>` + [...CIUDADES].sort((a, b) => a[0].localeCompare(b[0], 'es')).map(([n]) => `<option>${n}</option>`).join('');
  sel.value = zona?.fuente === 'ciudad' ? zona.n : '';
  $('hoja').hidden = false;
}
const cerrarHoja = () => { $('hoja').hidden = true; };
function fijarZona(z) { zona = z; ls.set('pulso.zona', z); zonaOculta = false; ls.set('pulso.zonaOculta', null); cerrarHoja(); pintarZona(); }
$('z-cerrar').onclick = cerrarHoja;
$('hoja').onclick = e => { if (e.target.id === 'hoja') cerrarHoja(); };
$('z-quitar').onclick = () => fijarZona(null);
$('z-ciudad').onchange = e => { const c = CIUDADES.find(x => x[0] === e.target.value); if (c) fijarZona({ n: c[0], la: c[1], lo: c[2], fuente: 'ciudad' }); };
$('z-geo').onclick = () => {
  const b = $('z-geo'); b.textContent = 'Buscando…';
  navigator.geolocation?.getCurrentPosition(p => {
    b.textContent = '📍 Usar mi ubicación';
    const la = +p.coords.latitude.toFixed(3), lo = +p.coords.longitude.toFixed(3);
    fijarZona({ n: cercaDe(la, lo).replace(/^En /, ''), la, lo, fuente: 'geo' });
  }, () => { b.textContent = 'No se pudo obtener la ubicación'; setTimeout(() => b.textContent = '📍 Usar mi ubicación', 2500); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
};


// ---------- REGISTRO DE INSTALACIONES ----------
let ordenReg = 'ultima';
const fechaHora = t => `${diaFmt.format(new Date(t))} ${hora(t)}`;
function pintarRegistro() {
  const r = estado.reg; const inst = Object.values(r?.instalaciones ?? {});
  $('r-total').textContent = nf.format(inst.length);
  const hoy = new Set((estado.fuego?.industriales ?? []).map(x => `${x.lat},${x.lon}`));
  const lista = [...inst].sort((a, b) => ordenReg === 'dias' ? b.dias.length - a.dias.length || b.ultima_vez.localeCompare(a.ultima_vez) : b.ultima_vez.localeCompare(a.ultima_vez));
  $('registro').innerHTML = lista.length ? lista.map(x => {
    const reciente = Date.now() - Date.parse(x.ultima_vez) <= 24 * 3600e3;
    return `<li data-lat="${x.lat}" data-lon="${x.lon}"><div class="punto gris">${x.dias.length}</div>
      <div class="info"><div class="lugar">${x.nombre ?? x.tipo}${reciente ? '<span class="etq hoy">hoy</span>' : ''}</div>
      <div class="det">${x.nombre ? x.tipo + ' · ' : ''}${x.zona ? 'en ' + x.zona + ' · ' : ''}cerca de ${x.ciudad}<br>Último: ${fechaHora(x.ultima_vez)} (${hace(x.ultima_vez)}) · ${nf1.format(x.ultimo_frp)} MW<br>
      ${x.dias.length} día${x.dias.length === 1 ? '' : 's'} · ${x.detecciones} paso${x.detecciones === 1 ? '' : 's'} · desde ${diaFmt.format(new Date(x.primera_vez))} · máx. ${nf1.format(x.frp_max)} MW</div></div></li>`;
  }).join('') : '<li class="vacio">Aún no se ha registrado ninguna instalación.</li>';
  document.querySelectorAll('#registro li[data-lat]').forEach(li => li.onclick = () => { location.hash = '#mapa'; setTimeout(() => mapas.grande?.setView([+li.dataset.lat, +li.dataset.lon], 13), 80); });
  $('r-fuente').textContent = r?.actualizado ? `Actualizado ${hace(r.actualizado)}. El número del círculo son los días con detección.` : '';
}
document.querySelectorAll('#seg-reg button').forEach(b => b.onclick = () => {
  ordenReg = b.dataset.o;
  document.querySelectorAll('#seg-reg button').forEach(x => x.classList.toggle('on', x === b));
  pintarRegistro();
});

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
function graficaMix(serie, res, unidad = 'MW') {
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
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mix de generación">${ejes(n, maxY, etiquetasX(serie, res === 'day'), ' ' + unidad)}${capas}</svg>`;
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
const teselas = () => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${oscuro.matches ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base'}/MapServer/tile/{z}/{y}/{x}`;
const mapas = { grande: null, mini: null, capas: {} };
function crearMapa(id, interactivo) {
  const m = L.map(id, { zoomControl: interactivo, attributionControl: interactivo, dragging: interactivo, scrollWheelZoom: interactivo,
    doubleClickZoom: interactivo, touchZoom: interactivo, boxZoom: interactivo, keyboard: interactivo, zoomSnap: 0.25 });
  L.tileLayer(teselas(), { maxZoom: 16, attribution: 'Mapa base © Esri, HERE, Garmin, © OpenStreetMap' }).addTo(m);
  m.fitBounds([[35.9, -9.4], [43.9, 4.4]], { padding: [6, 6] });
  return m;
}
function iconoFoco(frp) {
  const s = Math.round(Math.min(26, 8 + Math.sqrt(frp) * 2));
  return L.divIcon({ className: '', html: `<div class="pulso-foco" style="width:${s}px;height:${s}px"></div>`, iconSize: [s, s], iconAnchor: [s / 2, s / 2] });
}
function capaFuego(conPopups) {
  const g = L.layerGroup();
  (estado.fuego?.industriales ?? []).forEach(f => {
    const mk = L.circleMarker([f.lat, f.lon], { radius: 5, color: '#9496A0', weight: 1.5, fillColor: '#9496A0', fillOpacity: .35 });
    if (conPopups) mk.bindPopup(`<b>${f.nombre ?? f.tipo ?? 'Fuente industrial fija'}</b><br>${f.nombre ? f.tipo + '<br>' : ''}${cercaDe(f.lat, f.lon)}<br>${hora(f.t)} (${hace(f.t)}) · ${nf1.format(f.frp)} MW<br><small>Identificada por ${f.origen ?? 'repetición'}. No se cuenta como incendio.</small>`);
    mk.addTo(g);
  });
  (estado.fuego?.focos ?? []).forEach(f => {
    const mk = L.marker([f.lat, f.lon], { icon: iconoFoco(f.frp), keyboard: false });
    if (conPopups) mk.bindPopup(`<b>${cercaDe(f.lat, f.lon)}</b><br>${hora(f.t)} (${hace(f.t)}) · ${f.dn}<br>Potencia: ${nf1.format(f.frp)} MW · confianza ${f.conf}<br>Satélite ${f.sat}${f.n > 1 ? ` · ${f.n} detecciones` : ''}`);
    mk.addTo(g);
  });
  return g;
}
const colMag = m => m >= 4 ? '#E2603D' : m >= 3 ? '#E9A23B' : '#B08A64';
function capaTierra(conPopups) {
  const g = L.layerGroup();
  (estado.tierra?.eventos ?? []).filter(e => e.mag >= 2 && Date.now() - Date.parse(e.t) <= 7 * 86400e3).reverse().forEach(e => {
    const edad = (Date.now() - Date.parse(e.t)) / 86400e3;
    const mk = L.circleMarker([e.lat, e.lon], { radius: 3 + (e.mag - 1.5) * 2.6, color: colMag(e.mag), weight: 1.5, fillColor: colMag(e.mag), fillOpacity: Math.max(.12, .55 - edad * .06), opacity: Math.max(.35, 1 - edad * .1) });
    if (conPopups) mk.bindPopup(`<b>Magnitud ${nf1.format(e.mag)}</b><br>${lugarSismo(e)}<br>${diaFmt.format(new Date(e.t))} ${hora(e.t)} (${hace(e.t)})${e.prof != null ? `<br>Profundidad: ${e.prof} km` : ''}${e.ign ? `<br><a href="${e.ign}" target="_blank" rel="noopener">Ficha del IGN</a>` : ''}`);
    mk.addTo(g);
  });
  return g;
}
function capaAire(conPopups) {
  const g = L.layerGroup();
  (estado.aire?.puntos ?? []).forEach(p => {
    const mk = L.circleMarker([p.la, p.lo], { radius: 7, color: '#fff', weight: 1, fillColor: ICA_COL[p.cat], fillOpacity: .85 });
    if (conPopups) mk.bindPopup(`<b>${p.n}</b><br>Calidad del aire ${ICA[p.cat].toLowerCase()} (índice ${p.eaqi})${p.dom ? `<br>Contaminante dominante: ${p.dom}` : ''}<br><small>PM2,5 ${p.conc.pm25 ?? '–'} · PM10 ${p.conc.pm10 ?? '–'} · NO₂ ${p.conc.no2 ?? '–'} · O₃ ${p.conc.o3 ?? '–'} µg/m³</small>`);
    mk.addTo(g);
  });
  return g;
}
const capasMapa = { mini: {}, grande: {} };
function rellenar(cual, conPopups) {
  const m = mapas[cual]; if (!m) return;
  const c = capasMapa[cual];
  for (const [k, fn] of [['aire', capaAire], ['tierra', capaTierra], ['fuego', capaFuego]]) {
    if (!c[k]) { c[k] = L.layerGroup(); if (cual === 'mini' || k !== 'aire') c[k].addTo(m); }
    c[k].clearLayers(); fn(conPopups).eachLayer(l => c[k].addLayer(l));
  }
  if (cual === 'grande' && !c.control) {
    c.control = L.control.layers(null, { '🌬️ Aire': c.aire, '🔥 Focos de calor': c.fuego, '🌍 Terremotos (7 días)': c.tierra }, { collapsed: true, position: 'topright' }).addTo(m);
  }
}
function pintarMapas() {
  if (typeof L === 'undefined') return;
  if (!mapas.mini) mapas.mini = crearMapa('mapa-mini', false);
  rellenar('mini', false);
  rellenar('grande', true);
  $('leyenda-mapa').innerHTML = `<i style="background:var(--fuego)"></i>Focos de calor 24 h (${estado.fuego?.total ?? 0})<br><i style="background:#9496A0"></i>Fuentes industriales fijas (${estado.fuego?.industriales?.length ?? 0})<br><i style="background:#B08A64"></i>Terremotos M ≥ 2 · 7 días<br><i style="background:${ICA_COL[1]}"></i>Aire (actívalo en el botón de capas)`;
}

// ---------- navegación ----------
function ir() {
  const v = (location.hash.slice(1) || 'inicio');
  const vista = ['inicio', 'mapa', 'luz', 'agua', 'aire', 'fuego', 'tierra', 'industrias'].includes(v) ? v : 'inicio';
  document.querySelectorAll('.vista').forEach(s => s.classList.toggle('activa', s.id === `v-${vista}`));
  document.querySelectorAll('.tabs a').forEach(a => a.classList.toggle('activa', a.dataset.v === (vista === 'industrias' ? 'fuego' : vista)));
  if (vista === 'mapa' && typeof L !== 'undefined') {
    if (!mapas.grande) { mapas.grande = crearMapa('mapa', true); rellenar('grande', true); }
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

$('mostrar-zona').onclick = e => { e.preventDefault(); ocultarZona(false); scrollTo({ top: 0, behavior: 'smooth' }); };

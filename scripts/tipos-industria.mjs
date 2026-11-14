// Pulso · clasificación de instalaciones industriales a partir de etiquetas de OpenStreetMap
export const TIPOS = [ // [prueba sobre etiquetas, tipo legible, ¿genera calor visible?]
  [t => /steel|iron|metal_?works|foundry|smelter|alumin/i.test(t.industrial ?? '') || /blast furnace|coke/i.test(t['plant:source'] ?? ''), 'Siderurgia / metalurgia', true],
  [t => /refinery|oil|petro/i.test(t.industrial ?? '') || t.man_made === 'flare', 'Refinería / petroquímica', true],
  [t => /cement|lime/i.test(`${t.industrial ?? ''} ${t.product ?? ''} ${t.name ?? ''}`) || /ciment|cemento|\bcemex\b|\bholcim\b|\blafarge|cementos? (portland|cosmos|molins|tudela)|portland valderrivas|\bvotorantim\b|\bcimpor\b|\bhisalba\b/i.test(`${t.name ?? ''} ${t.operator ?? ''} ${t.brand ?? ''}`), 'Cementera', true],
  [t => /chemical|fertili/i.test(t.industrial ?? ''), 'Química', true],
  [t => /glass/i.test(`${t.industrial ?? ''} ${t.product ?? ''}`), 'Vidrio', true],
  [t => /brick|ceramic|tile/i.test(`${t.industrial ?? ''} ${t.product ?? ''}`), 'Cerámica', true],
  [t => /paper|pulp|cardboard/i.test(`${t.industrial ?? ''} ${t.product ?? ''}`), 'Papelera', true],
  [t => /incinerat|waste/i.test(`${t.industrial ?? ''} ${t['plant:source'] ?? ''}`), 'Residuos / incineración', true],
  [t => t.power === 'plant' && !/solar|wind|hydro|photovoltaic/i.test(t['plant:source'] ?? ''), 'Central eléctrica', true],
  [t => t.man_made === 'kiln', 'Horno industrial', true],
  [t => /concrete|asphalt/i.test(t.industrial ?? ''), 'Planta de hormigón / asfalto', false],
  [t => t.man_made === 'works' && !/warehouse|logistic|port|depot|storage|distributor|car_repair|wholesale/i.test(t.industrial ?? ''), 'Fábrica', true],
  [t => t.landuse === 'industrial', 'Polígono industrial', false],
];
export const tipoDe = t => { for (const [f, nombre, calor] of TIPOS) if (f(t)) return { tipo: nombre, calor }; return null; };

export const TIPOS_NOMBRES = TIPOS.map(x => x[1]);
export const TIPO_CALOR = Object.fromEntries(TIPOS.map(x => [x[1], x[2]]));

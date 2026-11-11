# Pulso · España ahora

App web que muestra cómo está España en este momento: **luz** (generación eléctrica y su parte renovable), **agua** (embalses), **aire** (índice de calidad del aire), **fuego** (focos de calor detectados por satélite) y **tierra** (terremotos). Incluye «Mi zona» y avisos dentro de la app.

## Cómo funciona

- `scripts/update.mjs` descarga los datos y los guarda en `data/` como JSON.
- La GitHub Action **Actualizar datos** ejecuta el script y sube los cambios. La lanza cron-job.org cada 15 minutos (con un respaldo propio cada hora). El aire se pide como mucho una vez por hora.
- La Action **Actualizar agua** descarga la BD-Embalses del MITECO tres veces al día (se publica los martes) y la procesa con `scripts/agua.mjs`.
- La web (`index.html`, `app.js`, `styles.css`) es estática, la sirve GitHub Pages y se puede instalar en el móvil.

## Fuentes

| Capa | Fuente | Clave |
|---|---|---|
| Luz | Red Eléctrica: servicio de tiempo real (península) y [REData](https://www.ree.es/es/apidatos) | No |
| Agua | [MITECO, Boletín Hidrológico](https://www.miteco.gob.es/es/agua/temas/evaluacion-de-los-recursos-hidricos/boletin-hidrologico.html) (BD-Embalses) | No |
| Aire | [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api), modelo CAMS de Copernicus | No |
| Fuego | [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/), satélites VIIRS | Secret `FIRMS_MAP_KEY` |
| Tierra | [EMSC](https://www.seismicportal.eu/fdsn-wsevent.html) y GeoRSS del [IGN](https://www.ign.es/web/ign/portal/ultimos-terremotos) | No |

Los focos de calor se filtran a territorio español, se descartan los de confianza baja y se agrupan las detecciones a menos de 1,5 km.

## Probar en local

```bash
FIRMS_MAP_KEY=tu_clave node scripts/update.mjs
python3 -m http.server
```

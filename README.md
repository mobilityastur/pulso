# Pulso · España ahora

App web que muestra cómo está España en este momento: **luz** (generación eléctrica y su parte renovable) y **fuego** (focos de calor detectados por satélite). Próximamente: aire, agua (embalses) y tierra (terremotos).

## Cómo funciona

- `scripts/update.mjs` descarga los datos y los guarda en `data/` como JSON.
- La GitHub Action **Actualizar datos** ejecuta el script y sube los cambios. La lanza cron-job.org cada 15 minutos (con un respaldo propio cada hora).
- La web (`index.html`, `app.js`, `styles.css`) es estática, la sirve GitHub Pages y se puede instalar en el móvil.

## Fuentes

| Capa | Fuente | Clave |
|---|---|---|
| Luz | [REData, Red Eléctrica](https://www.ree.es/es/apidatos) | No |
| Fuego | [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/), satélites VIIRS | Secret `FIRMS_MAP_KEY` |

Los focos de calor se filtran a territorio español, se descartan los de confianza baja y se agrupan las detecciones a menos de 1,5 km.

## Probar en local

```bash
FIRMS_MAP_KEY=tu_clave node scripts/update.mjs
python3 -m http.server
```

# InfuCare Pro
PWA offline-first (español, Argentina) de consulta farmacológica, sueroterapia y cálculo de dosis para Enfermería. Uso **educativo y de apoyo**; no reemplaza prescripción, prospecto ANMAT ni protocolo institucional.

## Ejecutar
`python3 -m http.server 8080` → abrir `http://localhost:8080`. Para iPhone: publicar con **GitHub Pages** (Settings → Pages → rama `main`), abrir en Safari → Compartir → *Agregar a pantalla de inicio*.

## Estructura
- `index.html`, `styles.css`, `app.js` (calculadoras, búsqueda, IndexedDB, vistas)
- `data/db.js` base farmacológica (única fuente de datos; ver política)
- `sw.js` caché offline · `manifest.webmanifest` · `icon.svg`

## Política de datos
- Solo se cargan datos verificables. Todo campo sin verificar es `null` y se muestra: *"Información no verificada. Consultar prospecto oficial y protocolo institucional."*
- No hay marcas, laboratorios, registros ANMAT, dosis ni compatibilidades cargadas: **deben ingresarse desde Vademécum Nacional/prospecto, con fuente y fecha**.
- Medicamentos de alto riesgo: sin instrucciones autónomas de administración + confirmación previa.
- Las calculadoras no tienen concentraciones ni factores de goteo por defecto; validan rangos plausibles.

## Pendiente (roadmap)
Más fármacos y sistemas clínicos, exportación PDF propia (hoy: imprimir/guardar PDF), compatibilidad Y-site, PNG para `apple-touch-icon`, tests unitarios de cálculo, revisión por farmacéutico y médico antes de uso asistencial.

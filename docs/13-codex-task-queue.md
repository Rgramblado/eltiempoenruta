# 13 — Cola de tareas para Codex

## Cómo usar este documento

Cada tarea debe ejecutarse como PR pequeño. No mezclar scoring, caché, auth y rediseño visual en el mismo cambio, que luego no lo revisa ni el que lo parió.

## Sprint 1 — Base técnica

### T1 — Crear estructura de dominio backend

Objetivo:

- Crear carpetas `server/src/domain`, `services`, `providers`, `middleware`, `config`.

Aceptación:

- App sigue arrancando.
- No cambia comportamiento.
- Imports limpios.

### T2 — Validación de payloads

Objetivo:

- Añadir validación con Zod o alternativa.

Aceptación:

- `/api/route` valida body.
- `/api/weather` valida body.
- Respuestas 400 claras.

### T3 — CacheService

Objetivo:

- Añadir cache en memoria con interfaz.

Aceptación:

- `get`, `set`, `delete`, `wrap`.
- TTL soportado.
- Tests unitarios.

### T4 — Rate limit

Objetivo:

- Añadir limitación básica en endpoints caros.

Aceptación:

- Límite configurable por env.
- Error 429 claro.
- No afecta `/health`.

## Sprint 2 — Providers

### T5 — RouteProvider

Objetivo:

- Encapsular Google Routes.

Aceptación:

- Controlador no llama directamente Google.
- Tests con mock provider.

### T6 — WeatherProvider

Objetivo:

- Encapsular Google Weather.

Aceptación:

- Servicio de weather usa interfaz.
- Tests con mock provider.

### T7 — GeocodingProvider

Objetivo:

- Sustituir flujo principal de Nominatim por Google.

Aceptación:

- Resolver nombres con Google.
- Fallback opcional controlado.
- Logs de fuente usada.

## Sprint 3 — Motor de riesgo

### T8 — ETA Service

Objetivo:

- Calcular ETA por punto muestreado considerando paradas.

Aceptación:

- Tests con y sin paradas.
- Devuelve hora de paso por punto.

### T9 — Crosswind Service

Objetivo:

- Calcular viento lateral.

Aceptación:

- Tests con viento perpendicular, frontal y trasero.
- Devuelve componente lateral.

### T10 — RideScore

Objetivo:

- Calcular score por segmento y ruta.

Aceptación:

- Tests de escenarios.
- Resumen de razones.

### T11 — Alert Aggregator

Objetivo:

- Crear alertas agrupadas por tramo.

Aceptación:

- No genera duplicados absurdos.
- Une tramos consecutivos.

## Sprint 4 — Producto

### T12 — UI RideScore

Objetivo:

- Mostrar score en pantalla resumen.

Aceptación:

- Score visible.
- Nivel claro.
- Razones principales.

### T13 — Mejor hora de salida

Objetivo:

- Backend calcula opciones.
- Front muestra recomendación.

Aceptación:

- Usuario puede aplicar hora recomendada.
- Reutiliza caché.

### T14 — Equipación recomendada

Objetivo:

- Añadir reglas y UI.

Aceptación:

- Muestra recomendaciones.
- Basado en weather + perfil.

## Sprint 5 — Persistencia y sharing

### T15 — Modelo SavedRoute

Objetivo:

- Crear persistencia inicial.

Aceptación:

- Guardar/cargar/borrar ruta.

### T16 — Share links

Objetivo:

- Crear ruta pública `/r/:shareId`.

Aceptación:

- Enlace público sin login.
- Revocable.

### T17 — Export GPX

Objetivo:

- Exportar ruta seleccionada.

Aceptación:

- Archivo GPX válido.
- Incluye waypoints.

## Sprint 6 — Social ligero

### T18 — Rutas públicas

Objetivo:

- Publicar ruta en listado.

Aceptación:

- Filtros básicos.
- Copiar a mis rutas.

### T19 — Reportes por tramo

Objetivo:

- Crear/ver reportes geolocalizados.

Aceptación:

- Caducidad por tipo.
- Confirmar reporte.

### T20 — Grupos privados

Objetivo:

- Crear salida de grupo.

Aceptación:

- Invitar por enlace.
- Confirmar asistencia.

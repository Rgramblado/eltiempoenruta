# El Tiempo en Ruta — Pack de documentación para CODEX

Este paquete documenta el roadmap completo de **El Tiempo en Ruta**, una app para motoristas que estima el tiempo meteorológico a lo largo de una ruta, no solo en origen y destino.

## Estado actual resumido

Arquitectura actual:

```txt
front/   -> React + Vite
server/  -> Node.js + Express
app/     -> React Native + Expo (Android/iOS, ver app/README.md)
```

Endpoints actuales:

```txt
GET  /health
GET  /api/expand              (valida que sea enlace de Google Maps)
POST /api/route
POST /api/weather             (devuelve weather + rideScore + gear)
POST /api/departure-options   (compara horas de salida alternativas)
```

Variables de entorno del server:

```txt
GOOGLE_KEY              clave de Google (Routes + Weather). Obligatoria.
PORT                    puerto del server (por defecto 3001)
WEATHER_CACHE_TTL_MIN   TTL de la caché de forecast en minutos (por defecto 30)
RATE_LIMIT_WINDOW_MIN   ventana de rate limit en minutos (por defecto 15)
RATE_LIMIT_MAX          peticiones máximas por ventana e IP (por defecto 100)
```

Flujo actual:

```txt
Google Maps URL
-> expandir si es enlace corto
-> parsear origen/destino/paradas
-> resolver coordenadas si hace falta
-> calcular rutas con Google Routes API
-> elegir perfil/alternativa
-> muestrear puntos cada X km
-> calcular ETA por punto
-> consultar Google Weather API
-> pintar mapa + timeline
```

## Objetivo de este pack

Dejar a Codex contexto suficiente para implementar mejoras sin tener que adivinar el producto.

Orden recomendado de lectura:

1. `AGENTS.md`
2. `ROADMAP_COMPLETO.md`
3. `docs/01-product-vision.md`
4. `docs/02-roadmap.md`
5. `docs/03-feature-backlog.md`
6. `docs/04-technical-architecture.md`
7. `docs/05-api-contracts.md`
8. `docs/06-data-model.md`
9. `tasks/`

## Principios de producto

- La app no debe ser "otra app del tiempo".
- La app debe responder a una pregunta concreta: **¿me conviene hacer esta ruta en moto, cuándo y con qué precauciones?**
- El valor diferencial está en cruzar ruta + ETA + meteorología + preferencias moteras.
- La salida final debe ser accionable: mejor hora de salida, tramos críticos, equipación recomendada y nivel de riesgo.
- La capa social debe servir para compartir rutas, reportar estado real de carretera y organizar salidas, no para montar una red social vacía.

## Roadmap macro

1. Web MVP serio y estable.
2. Motor de riesgo meteorológico motero.
3. Rutas guardadas y enlaces compartibles.
4. Mejor hora de salida.
5. Social ligero: rutas públicas, reportes y grupos privados.
6. Preparación React Native.
7. Modo ruta activa con ubicación y alertas.

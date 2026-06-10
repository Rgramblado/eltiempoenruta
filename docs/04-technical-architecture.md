# 04 — Arquitectura técnica propuesta

## Estructura objetivo

```txt
front/
  src/
    app/
    components/
    features/
    domain/
    services/
    hooks/
    utils/

server/
  src/
    app.ts
    server.ts
    config/
    routes/
    controllers/
    services/
    providers/
    domain/
    middleware/
    utils/
    tests/
```

## Backend

### Capas

```txt
routes -> controllers -> services -> providers
                         domain
```

- `routes`: define endpoints Express.
- `controllers`: valida entrada y llama servicios.
- `services`: casos de uso.
- `providers`: APIs externas.
- `domain`: lógica pura.
- `middleware`: errores, rate limit, logs.

## Providers

### RouteProvider

```ts
interface RouteProvider {
  computeRoutes(input: ComputeRouteInput): Promise<ComputedRoute[]>;
}
```

Implementación inicial:

```txt
GoogleRoutesProvider
```

### WeatherProvider

```ts
interface WeatherProvider {
  getHourlyForecast(input: HourlyForecastInput): Promise<HourlyForecast>;
}
```

Implementación inicial:

```txt
GoogleWeatherProvider
```

### GeocodingProvider

```ts
interface GeocodingProvider {
  geocode(query: string): Promise<GeocodedPlace[]>;
}
```

Implementación inicial:

```txt
GoogleGeocodingProvider
```

## Servicios

```txt
routeImportService
routeCalculationService
weatherTimelineService
routeSamplingService
etaService
rideRiskService
departureOptimizerService
shareRouteService
savedRouteService
```

## Dominio puro

Funciones que deben poder testearse sin APIs externas:

- parseo de URL expandida
- normalización de puntos
- interpolación de ruta
- muestreo por distancia
- cálculo de ETA
- cálculo de bearing
- cálculo de viento lateral
- scoring de riesgo
- agrupación de alertas
- comparación de alternativas
- recomendaciones de equipación

## Frontend

Features sugeridas:

```txt
features/
  route-import/
  route-preferences/
  route-alternatives/
  stops-editor/
  weather-timeline/
  route-map/
  ride-score/
  share-route/
  saved-routes/
```

## Estado

Para MVP, puede bastar con estado local + React Query/TanStack Query.

Más adelante:

- Zustand para estado UI ligero.
- TanStack Query para cache de servidor.
- Persistencia local de borradores.

## Seguridad

- API keys solo en backend.
- Validación en servidor.
- Rate limit.
- CORS restrictivo.
- Sanitización de URLs entrantes.
- No confiar en datos del frontend.

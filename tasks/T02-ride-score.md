# T02 — Implementar RideScore

## Objetivo

Crear un score de ruta motera de 0 a 100 basado en meteorología y contexto de ruta.

## Archivos sugeridos

```txt
server/src/domain/risk/rideScore.ts
server/src/domain/risk/riskTypes.ts
server/src/domain/risk/rideScore.test.ts
```

## Entradas

- segmentos con weather
- perfil de piloto
- perfil de moto
- si hay pasajero
- información de noche/opcional

## Salida

```ts
type RideScore = {
  score: number;
  level: "excellent" | "good" | "caution" | "bad" | "avoid";
  mainReasons: string[];
  worstSegments: SegmentRisk[];
  confidence: "high" | "medium" | "low";
};
```

## Reglas iniciales

Penalizaciones configurables:

- lluvia > 60%
- precipitación > 1 mm/h
- sensación térmica < 8ºC
- viento > 30 km/h
- rachas > 45 km/h
- viento lateral > 30 km/h
- tormenta
- niebla
- tramo nocturno

## Criterios de aceptación

- Tests para ruta buena.
- Tests para lluvia fuerte.
- Tests para viento lateral.
- Tests para frío.
- Tests para peor segmento.
- El resultado explica razones.

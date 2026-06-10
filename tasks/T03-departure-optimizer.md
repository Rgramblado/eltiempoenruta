# T03 — Mejor hora de salida

## Objetivo

Comparar distintas horas de salida para recomendar la que reduzca riesgo meteorológico.

## Entrada

```ts
{
  route,
  baseDepartureTime,
  offsetsMinutes: [-120, -60, -30, 0, 30, 60, 120, 180],
  stops,
  riderProfile
}
```

## Proceso

Para cada hora:

1. recalcular ETA
2. obtener weather
3. calcular RideScore
4. calcular minutos bajo lluvia
5. detectar peor alerta

## Salida

```ts
type DepartureOption = {
  departureTime: string;
  arrivalTime: string;
  rideScore: RideScore;
  rainMinutes: number;
  worstAlert?: RouteAlert;
  recommendation: string;
};
```

## Criterios de aceptación

- Devuelve lista ordenada por score.
- Marca una opción recomendada.
- Explica el motivo.
- No duplica llamadas weather innecesarias.

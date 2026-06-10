# 07 — Motor de ruta, ETA y weather

## Objetivo

Convertir una ruta en una línea temporal meteorológica.

## Pipeline

```txt
1. Recibir URL de Google Maps
2. Expandir si es corta
3. Parsear origen/destino/paradas
4. Resolver coordenadas faltantes
5. Calcular rutas con Google Routes
6. Elegir alternativa
7. Decodificar polyline
8. Muestrear puntos cada X km
9. Calcular ETA por punto
10. Consultar weather por punto/hora
11. Calcular riesgo por tramo
12. Agregar resumen
13. Pintar mapa y timeline
```

## Muestreo

No consultar weather en cada punto de polyline. Es caro e innecesario.

Estrategia:

- rutas cortas: cada 5 km
- rutas medias: cada 10 km
- rutas largas: cada 15-25 km
- siempre incluir origen, destino y paradas
- incluir puntos antes/después de cambios importantes si se detectan

## ETA

ETA por punto:

```txt
distanceFromStart / totalDistance * totalDuration
```

Luego ajustar con paradas:

```txt
etaAdjusted = etaBase + sum(stopsBeforePoint.duration)
```

Más adelante se puede mejorar usando duración por tramo si Google la ofrece con suficiente detalle.

## Matching weather por hora

Para cada punto muestreado:

- calcular ETA
- redondear a la hora más cercana o interpolar entre horas
- consultar forecast horario
- devolver dato más cercano

## Optimización

Evitar llamadas duplicadas:

- redondear coordenadas
- agrupar puntos cercanos
- agrupar por hora
- cachear forecast por coordenada aproximada + hora

## Riesgo por tramo

Factores base:

```txt
rainProbability
precipitationMm
apparentTemperature
windSpeed
windGust
crosswind
condition
visibility
forecastConfidence
nightSegment
```

## Pseudocódigo de RideScore

```ts
function calculateSegmentRisk(segment, riderProfile) {
  let penalty = 0;

  penalty += rainPenalty(segment.weather.precipitationProbability, segment.weather.precipitationMm);
  penalty += coldPenalty(segment.weather.apparentTemperatureC, riderProfile.coldTolerance);
  penalty += windPenalty(segment.weather.windKmh, segment.weather.windGustKmh);
  penalty += crosswindPenalty(segment.crosswindKmh);
  penalty += conditionPenalty(segment.weather.condition);
  penalty += nightPenalty(segment.isNight);
  penalty += confidencePenalty(segment.weather.confidence);

  const score = clamp(100 - penalty, 0, 100);

  return {
    score,
    level: scoreToLevel(score),
    reasons: buildReasons(segment)
  };
}
```

## Agregación de ruta

No usar solo media. Una ruta con 90% perfecta y 10% peligrosa no es "buena".

Usar:

```txt
routeScore = weightedAverage(segmentScores) - worstSegmentPenalty
```

Considerar:

- peor segmento
- duración del peor segmento
- alertas danger
- baja confianza

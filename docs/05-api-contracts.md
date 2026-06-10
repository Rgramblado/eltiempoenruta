# 05 — Contratos API propuestos

## GET /health

### Response

```json
{
  "ok": true,
  "version": "0.1.0",
  "timestamp": "2026-06-09T00:00:00.000Z"
}
```

---

## GET /api/expand

Expande enlaces cortos de Google Maps.

### Query

```txt
?url=https://maps.app.goo.gl/...
```

### Response

```json
{
  "originalUrl": "https://maps.app.goo.gl/abc",
  "expandedUrl": "https://www.google.com/maps/dir/...",
  "wasShortUrl": true
}
```

---

## POST /api/route

Calcula rutas con preferencias.

### Request

```json
{
  "originalUrl": "https://www.google.com/maps/dir/...",
  "departureTime": "2026-06-09T09:30:00+02:00",
  "preferences": {
    "avoidHighways": true,
    "avoidTolls": true,
    "avoidFerries": true,
    "routeProfile": "motorcycle_balanced"
  },
  "stops": [
    {
      "placeName": "Aracena",
      "durationMinutes": 45
    }
  ],
  "riderProfile": {
    "bikeType": "naked",
    "experience": "normal",
    "rainTolerance": "medium",
    "coldTolerance": "medium"
  }
}
```

### Response

```json
{
  "routeRequestId": "req_123",
  "alternatives": [
    {
      "id": "fastest",
      "label": "Rápida",
      "distanceMeters": 180000,
      "durationSeconds": 7800,
      "polyline": "...",
      "summary": {
        "distanceText": "180 km",
        "durationText": "2h 10m"
      }
    },
    {
      "id": "motorcycle",
      "label": "Motera",
      "distanceMeters": 205000,
      "durationSeconds": 10500,
      "polyline": "...",
      "summary": {
        "distanceText": "205 km",
        "durationText": "2h 55m"
      }
    }
  ]
}
```

---

## POST /api/weather

Calcula timeline meteorológico para ruta seleccionada.

### Request

```json
{
  "routeId": "motorcycle",
  "polyline": "...",
  "departureTime": "2026-06-09T09:30:00+02:00",
  "stops": [
    {
      "atWaypointIndex": 1,
      "durationMinutes": 45
    }
  ],
  "sampling": {
    "everyKm": 10
  },
  "riderProfile": {
    "bikeType": "naked",
    "experience": "normal",
    "rainTolerance": "medium",
    "coldTolerance": "medium"
  }
}
```

### Response

```json
{
  "summary": {
    "departureTime": "2026-06-09T09:30:00+02:00",
    "arrivalTime": "2026-06-09T12:25:00+02:00",
    "distanceKm": 205,
    "durationMinutes": 175,
    "averageSpeedKmh": 70.2,
    "maxAlertLevel": "warning"
  },
  "rideScore": {
    "score": 82,
    "level": "good",
    "mainReasons": [
      "Lluvia baja en la mayor parte de la ruta",
      "Viento lateral moderado en el tramo final"
    ],
    "confidence": "medium"
  },
  "segments": [
    {
      "index": 0,
      "fromKm": 0,
      "toKm": 10,
      "eta": "2026-06-09T09:38:00+02:00",
      "lat": 37.2614,
      "lng": -6.9447,
      "weather": {
        "temperatureC": 21,
        "apparentTemperatureC": 20,
        "precipitationProbability": 10,
        "precipitationMm": 0,
        "windKmh": 12,
        "windDirectionDegrees": 260,
        "condition": "partly_cloudy"
      },
      "risk": {
        "score": 90,
        "level": "excellent"
      }
    }
  ],
  "alerts": []
}
```

---

## POST /api/departure-options

Calcula mejores horas de salida.

### Request

```json
{
  "routeId": "motorcycle",
  "polyline": "...",
  "baseDepartureTime": "2026-06-09T10:00:00+02:00",
  "offsetsMinutes": [-120, -60, -30, 0, 30, 60, 120, 180],
  "stops": []
}
```

### Response

```json
{
  "recommendedDepartureTime": "2026-06-09T09:00:00+02:00",
  "options": [
    {
      "departureTime": "2026-06-09T09:00:00+02:00",
      "arrivalTime": "2026-06-09T11:55:00+02:00",
      "score": 88,
      "rainMinutes": 5,
      "recommendation": "Mejor opción: evita la lluvia del tramo final."
    }
  ]
}
```

---

## POST /api/routes/save

Guarda ruta.

## GET /api/routes/:id

Carga ruta guardada.

## POST /api/routes/:id/share

Genera enlace público.

## GET /api/shared-routes/:shareId

Carga ruta pública.

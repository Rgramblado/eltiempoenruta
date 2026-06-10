# 12 — Testing y QA

## Tests unitarios prioritarios

Backend/domain:

- parseo de URL de Google Maps
- normalización de lugares
- muestreo de polyline
- cálculo de distancia acumulada
- cálculo de ETA
- aplicación de paradas
- bearing entre puntos
- componente de viento lateral
- RideScore
- agrupación de alertas
- mejor hora de salida

## Tests de integración

- `/api/expand` con URL corta mockeada
- `/api/route` con Google Routes mock
- `/api/weather` con Google Weather mock
- caché hit/miss
- errores de API externa
- payload inválido

## Tests frontend

- formulario de importación
- preferencias de ruta
- selector de alternativas
- editor de paradas
- resumen meteorológico
- timeline
- estados de carga/error

## Casos manuales

### Ruta corta sin paradas

- Huelva -> Punta Umbría
- salida inmediata
- sin preferencias

### Ruta motera con paradas

- Huelva -> Aracena -> Zufre
- evitar autovías
- parada 45 min

### Ruta larga

- Huelva -> Ronda
- varias alternativas
- comparar mejor hora

### Ruta con clima malo

Mock de lluvia, viento y frío.

### Ruta con API fallando

- Google Routes falla
- Weather falla parcialmente
- Geocoding no encuentra lugar

## QA de UX

Comprobar que el usuario siempre entiende:

- qué ruta está viendo
- qué hora de salida se está usando
- qué tramo es peor
- si la previsión tiene baja confianza
- qué acción se recomienda

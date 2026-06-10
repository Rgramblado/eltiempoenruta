# 08 — Social y comunidad

## Principio

La parte social debe estar al servicio de la ruta.

Evitar construir un feed genérico. Eso suele acabar como un cementerio con scroll infinito.

## Niveles de social

## Nivel 1 — Compartir ruta

Sin login obligatorio.

- enlace público
- resumen
- mapa
- weather timeline
- RideScore
- botón "usar esta ruta"

## Nivel 2 — Rutas públicas

Usuarios publican rutas.

Campos:

- título
- descripción
- zona
- distancia
- duración
- dificultad
- tipo de moto
- mejor época
- puntos de parada
- advertencias

## Nivel 3 — Reportes por tramo

Reportes geolocalizados:

- lluvia
- carretera mojada
- niebla
- gravilla
- obras
- asfalto roto
- animales
- corte
- mirador
- parada buena

Caducidad:

```txt
lluvia: 1h
niebla: 1h
gravilla: 24h
obras: 7d
asfalto roto: 30d
mirador/parada: permanente moderable
```

## Nivel 4 — Grupos privados

Para salidas reales.

- crear salida
- invitar por enlace
- confirmar asistencia
- ver ruta y clima
- comentarios
- punto de encuentro
- paradas

## Nivel 5 — Clubs

- calendario de salidas
- rutas privadas
- miembros
- roles
- histórico
- página pública

## Moderación

Necesaria desde el principio si hay contenido público:

- reportar ruta
- reportar comentario
- ocultar reporte
- bloquear usuario
- soft delete
- logs de moderación

## Evitar al inicio

- rankings de velocidad
- competir por tiempos
- "quién llega antes"
- gamificación peligrosa
- app de radares disfrazada

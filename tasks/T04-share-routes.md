# T04 — Compartir rutas

## Objetivo

Crear enlaces públicos de ruta.

## Endpoints

```txt
POST /api/routes/:id/share
GET  /api/shared-routes/:shareId
DELETE /api/shared-routes/:shareId
```

## Página frontend

```txt
/r/:shareId
```

## Debe mostrar

- mapa
- origen/destino
- distancia
- duración
- hora de salida
- llegada
- RideScore
- alertas
- timeline
- botón "usar esta ruta"

## Criterios de aceptación

- Enlace público sin login.
- Share revocable.
- No exponer datos privados.
- Funciona refrescando página.

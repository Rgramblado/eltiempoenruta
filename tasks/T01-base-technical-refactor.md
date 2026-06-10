# T01 — Refactor base backend sin cambiar comportamiento

## Objetivo

Ordenar el backend para poder crecer sin montar un plato de espaguetis.

## Pasos

1. Crear estructura:

```txt
server/src/
  config/
  controllers/
  domain/
  middleware/
  providers/
  routes/
  services/
  utils/
```

2. Mover endpoints actuales a `routes`.
3. Mover lógica de negocio a `services`.
4. Mantener nombres de endpoints actuales.
5. No cambiar contrato externo.

## Criterios de aceptación

- `GET /health` funciona.
- `GET /api/expand` funciona.
- `POST /api/route` funciona.
- `POST /api/weather` funciona.
- La app arranca como antes.
- No hay API keys en frontend.

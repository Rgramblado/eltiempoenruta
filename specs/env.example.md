# Variables de entorno sugeridas

## Backend

```bash
PORT=3001
NODE_ENV=development

GOOGLE_MAPS_API_KEY=
GOOGLE_ROUTES_API_KEY=
GOOGLE_WEATHER_API_KEY=
GOOGLE_GEOCODING_API_KEY=
GOOGLE_PLACES_API_KEY=

CACHE_PROVIDER=memory
REDIS_URL=

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60

PUBLIC_APP_URL=http://localhost:5173
```

## Frontend

```bash
VITE_API_BASE_URL=http://localhost:3001
```

## Notas

- Ninguna clave sensible debe ir al frontend.
- Si se usa una única API key de Google con permisos múltiples, documentar restricciones en Google Cloud Console.
- Limitar dominios/IPs cuando sea posible.

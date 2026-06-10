# AGENTS.md — Instrucciones para Codex

## Contexto

Proyecto: **El Tiempo en Ruta**

App para motoristas que importa rutas desde Google Maps, calcula la ruta real con Google Routes API, estima el paso por cada punto de la ruta y consulta previsión meteorológica horaria con Google Weather API.

Stack actual:

```txt
front/   React + Vite
server/  Node.js + Express
```

## Forma de trabajar

Antes de tocar código:

1. Lee `README.md`.
2. Lee `ROADMAP_COMPLETO.md`.
3. Lee el documento de la tarea en `tasks/`.
4. Revisa estructura real del repo.
5. Propón cambios pequeños y verificables.
6. No reescribas la app entera salvo que la tarea lo pida expresamente.

## Reglas técnicas

- Mantener separación `front/` y `server/`.
- No meter lógica de negocio crítica dentro de componentes React.
- Crear servicios puros siempre que sea razonable.
- Evitar acoplar toda la app a Google directamente:
  - usar interfaces tipo `RouteProvider`, `WeatherProvider`, `GeocodingProvider`.
- Añadir tests unitarios para funciones de cálculo:
  - ETA por punto
  - muestreo de ruta
  - scoring de riesgo
  - comparación de alternativas
- No exponer API keys al frontend.
- No guardar resultados de APIs externas sin revisar restricciones de uso.
- Añadir validación de entrada en endpoints.
- Manejar errores de API de forma explícita.
- Mantener mensajes útiles para usuario final: nada de "Internal Server Error" pelado.

## Convenciones sugeridas

Backend:

```txt
server/src/
  app.ts
  server.ts
  config/
  routes/
  controllers/
  services/
  providers/
  domain/
  utils/
  tests/
```

Frontend:

```txt
front/src/
  app/
  components/
  features/
    route-import/
    route-summary/
    route-map/
    stops/
    weather-timeline/
    share/
  services/
  domain/
  hooks/
  utils/
```

## Definición de terminado

Una tarea está terminada si:

- compila
- no rompe el flujo actual
- tiene manejo de errores
- tiene tests cuando aplique
- documenta variables de entorno nuevas
- deja criterios de aceptación cubiertos
- no introduce claves ni secretos en código

## Prioridad de calidad

1. Correctitud del cálculo.
2. Coste controlado.
3. UX clara.
4. Código mantenible.
5. Social/monetización.

No priorizar florituras visuales antes de fiabilidad. En moto una alerta falsa o una ruta mal calculada no es "un bug simpático"; es una faena.

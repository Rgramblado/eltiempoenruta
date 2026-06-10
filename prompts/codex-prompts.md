# Prompts útiles para Codex

## 1. Refactor base

```txt
Lee README.md, AGENTS.md y tasks/T01-base-technical-refactor.md.
Reestructura el backend siguiendo la tarea T01 sin cambiar el comportamiento externo.
No cambies contratos de API.
Añade comentarios mínimos solo donde ayuden.
Al terminar, resume archivos tocados y cómo probar.
```

## 2. RideScore

```txt
Lee README.md, AGENTS.md, docs/07-routing-weather-engine.md y tasks/T02-ride-score.md.
Implementa el motor de RideScore como lógica pura testeable.
No lo acoples a Express.
Añade tests unitarios.
Expón una función clara para integrarla luego en /api/weather.
```

## 3. Mejor hora de salida

```txt
Lee tasks/T03-departure-optimizer.md.
Implementa un servicio que compare varias horas de salida usando ETA + WeatherProvider + RideScore.
Evita duplicar llamadas de weather si puede reutilizar caché.
Añade tests con providers mock.
```

## 4. Compartir ruta

```txt
Lee tasks/T04-share-routes.md.
Implementa persistencia y endpoints para compartir ruta pública.
No expongas datos privados.
Añade una página frontend /r/:shareId.
```

## 5. Revisión de costes

```txt
Revisa server/ y localiza todos los puntos donde se llama a Google APIs.
Añade logging de número de llamadas por request y cache hit/miss.
Propón límites razonables para evitar coste accidental.
No cambies UX salvo que sea necesario.
```

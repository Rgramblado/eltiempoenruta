# 11 — Riesgos técnicos, legales y de producto

## APIs de Google

### Routes API

Los modificadores de ruta como evitar autovías, peajes o ferris sesgan la ruta, pero no siempre garantizan eliminar esos elementos si no hay alternativa razonable.

Texto recomendado en UI:

> La ruta intentará evitar autovías, peajes o ferris según tus preferencias, pero puede incluirlos si no existe alternativa razonable.

### Weather API

Revisar términos concretos antes de cachear, almacenar o redistribuir información meteorológica.

La app debe posicionarse como:

> planificador de rutas con riesgo meteorológico

No como:

> app genérica de previsión meteorológica

## Seguridad del usuario

Evitar prometer seguridad absoluta.

Textos recomendados:

- "Estimación"
- "Previsión"
- "Riesgo orientativo"
- "Consulta fuentes oficiales en condiciones severas"
- "No sustituye tu criterio ni avisos oficiales"

## Responsabilidad

No dar instrucciones peligrosas.

Evitar:

- gamificación de velocidad
- retos de ruta extrema
- rankings de tiempos
- recomendaciones tipo "se puede hacer" en condiciones claramente malas

## Coste

Riesgos:

- demasiados puntos muestreados
- rutas compartidas recalculándose sin control
- abuso de endpoints
- bots
- usuarios probando 50 salidas alternativas

Mitigaciones:

- rate limit
- caché
- límites por usuario
- truncar rutas enormes
- estimar coste por request
- logs de uso

## Privacidad

Para social/móvil:

- ubicación compartida solo con consentimiento
- caducidad de ubicación
- opción de borrar historial
- rutas privadas por defecto
- enlaces revocables

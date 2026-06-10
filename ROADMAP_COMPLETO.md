# Roadmap completo — El Tiempo en Ruta

## 0. Visión

**El Tiempo en Ruta** debe convertirse en una herramienta de decisión para motoristas.

No se trata de saber si llueve en el destino. Se trata de saber:

- qué tiempo hará en cada tramo
- a qué hora pasaré por allí
- qué tramo será más delicado
- si merece la pena salir antes o después
- qué ruta me conviene según clima, moto y preferencias
- qué equipación debería llevar
- si puedo compartir la ruta con otros motoristas

La frase de venta debería ser:

> Pega tu ruta de Google Maps y descubre qué tiempo tendrás realmente durante el camino.

La frase premium debería ser:

> Sal a las 09:20 en vez de a las 10:00 y evitas 42 minutos de lluvia.

---

# Fase 1 — Consolidación técnica del MVP web

Objetivo: dejar una base seria antes de crecer.

## 1.1 Sustituir geocoding auxiliar por Google Geocoding/Places

### Problema

Actualmente se usa Nominatim/OpenStreetMap como apoyo cuando la URL de Google trae nombres sin coordenadas suficientes. Funciona, pero mezcla fuentes y puede generar incoherencias.

### Solución

Crear `GeocodingProvider` con implementación inicial:

```ts
interface GeocodingProvider {
  geocode(query: string): Promise<GeocodedPlace[]>;
  reverseGeocode(lat: number, lng: number): Promise<GeocodedPlace | null>;
}
```

Implementaciones:

```txt
GoogleGeocodingProvider
NominatimFallbackProvider // opcional, solo fallback controlado
```

### Criterios de aceptación

- El backend puede resolver origen, destino y paradas mediante Google.
- Nominatim queda eliminado del flujo principal.
- Si Google falla, se devuelve error claro.
- Se registra qué fuente resolvió cada punto.
- No se expone ninguna API key en frontend.

---

## 1.2 Caché y control de coste

### Problema

Google Routes, Geocoding, Places y Weather son APIs de coste variable. Sin caché ni límites, cualquier usuario curioso puede convertir el proyecto en una trituradora de euros.

### Solución

Crear sistema de caché en servidor.

Capas sugeridas:

```txt
Memory cache para desarrollo
Redis para producción
DB para rutas guardadas/compartidas
```

Claves de caché:

```txt
expanded-url:{hash(url)}
geocode:{normalizedQuery}
route:{origin,destination,waypoints,preferences}
weather:{roundedLat,roundedLng,hour}
risk:{routeHash,departureTime,stops,profile}
```

### Notas importantes

- Revisar términos de Google antes de cachear datos meteorológicos o mapas.
- Priorizar caché de resultados derivados propios:
  - muestreo
  - ETA
  - risk score
  - resumen
  - configuración de ruta
- Usar TTL conservador para datos meteorológicos.

### Criterios de aceptación

- Existe módulo `cacheService`.
- Puede funcionar sin Redis en local.
- Hay límites de peticiones por IP/usuario.
- Se registra coste estimado por operación.
- Se documentan variables de entorno.

---

## 1.3 Validación de endpoints

### Problema

Los endpoints actuales aceptan entradas complejas. Sin validación, cualquier URL rara o payload corrupto puede romper el flujo.

### Solución

Usar Zod, Valibot o similar.

Endpoints a validar:

```txt
GET  /api/expand?url=
POST /api/route
POST /api/weather
```

### Criterios de aceptación

- Payload inválido devuelve 400 con mensaje útil.
- Payload válido pasa a controlador tipado.
- Tests de casos válidos e inválidos.

---

## 1.4 Observabilidad mínima

Añadir logs estructurados:

- requestId
- endpoint
- duración
- proveedor llamado
- número de puntos muestreados
- número de llamadas weather
- cache hit/miss
- coste estimado
- error normalizado

No hace falta montar un observability stack nuclear. Primero logs decentes. El Prometheus de los pobres es mejor que la nada con camiseta técnica.

---

# Fase 2 — Motor motero de riesgo

Objetivo: convertir datos meteorológicos en decisión.

## 2.1 Ride Score

Crear un índice `RideScore` de 0 a 100.

### Factores

- probabilidad de lluvia
- precipitación estimada
- temperatura aparente
- viento medio
- rachas
- viento lateral estimado
- tormenta
- niebla / visibilidad
- tramo nocturno
- confianza de previsión
- duración total expuesta
- perfil de moto
- tolerancia del piloto

### Salida

```ts
type RideRiskLevel = "excellent" | "good" | "caution" | "bad" | "avoid";

type RideScore = {
  score: number;
  level: RideRiskLevel;
  mainReasons: string[];
  worstSegments: SegmentRisk[];
  confidence: "high" | "medium" | "low";
};
```

### Criterios de aceptación

- Cada tramo tiene score individual.
- La ruta completa tiene score agregado.
- El resumen explica el motivo.
- Hay tests para escenarios:
  - ruta seca
  - lluvia leve
  - lluvia fuerte
  - frío con viento
  - viento lateral fuerte
  - baja confianza

---

## 2.2 Alertas por tramo crítico

Detectar automáticamente tramos peligrosos o incómodos.

Tipos:

```txt
rain
heavy_rain
storm
crosswind
gusts
cold
heat
fog
night
low_confidence
```

Cada alerta debe tener:

```ts
type RouteAlert = {
  type: string;
  severity: "info" | "warning" | "danger";
  fromKm: number;
  toKm: number;
  startEta: string;
  endEta: string;
  title: string;
  description: string;
};
```

### Criterios de aceptación

- Las alertas aparecen en resumen y timeline.
- Se agrupan alertas consecutivas del mismo tipo.
- No se generan 40 alertas repetidas para una misma lluvia.

---

## 2.3 Viento lateral

### Problema

En moto, el viento importante no es solo "viento fuerte". El viento lateral cambia mucho la seguridad y comodidad.

### Solución

Para cada segmento:

1. calcular bearing del tramo
2. obtener dirección del viento
3. calcular ángulo relativo
4. estimar componente lateral

```txt
crosswind = windSpeed * sin(angleDifference)
```

Categorías:

```txt
leve       < 15 km/h
moderado   15-30 km/h
alto        30-45 km/h
peligroso   >45 km/h
```

Los umbrales deben ser configurables.

### Criterios de aceptación

- Cada segmento puede indicar viento frontal/trasero/lateral.
- El resumen destaca rachas laterales relevantes.
- Tests con bearings conocidos.

---

## 2.4 Mejor hora de salida

### Objetivo

Calcular si salir antes o después reduce riesgo.

### Estrategia

Dada una hora de salida base, probar ventanas:

```txt
-2h, -1h, -30m, base, +30m, +1h, +2h, +3h
```

Para cada salida:

- recalcular ETA por punto
- consultar/reutilizar weather
- calcular RideScore
- comparar:
  - score
  - minutos bajo lluvia
  - peor tramo
  - llegada de noche
  - temperatura mínima aparente

### Salida

```ts
type DepartureOption = {
  departureTime: string;
  arrivalTime: string;
  rideScore: RideScore;
  rainMinutes: number;
  worstAlert?: RouteAlert;
  recommendation: string;
};
```

### Criterios de aceptación

- La UI muestra la hora recomendada.
- Explica por qué es mejor.
- Permite aplicar esa hora a la ruta.
- No dispara llamadas weather duplicadas innecesarias.

---

## 2.5 Recomendador de equipación

Generar recomendaciones prácticas.

Ejemplos:

- impermeable
- guantes de invierno
- capa térmica
- pantalla antivaho
- protección solar
- agua extra
- evitar pasajero si el riesgo es alto

### Criterios de aceptación

- Recomendaciones basadas en reglas trazables.
- No hacer recomendaciones médicas.
- Texto claro y motero.

---

# Fase 3 — Rutas guardadas y compartibles

Objetivo: convertir herramienta puntual en producto reutilizable.

## 3.1 Persistencia de rutas

Crear almacenamiento para rutas.

Entidad principal:

```ts
type SavedRoute = {
  id: string;
  userId?: string;
  originalUrl: string;
  title?: string;
  origin: RoutePlace;
  destination: RoutePlace;
  waypoints: RoutePlace[];
  preferences: RoutePreferences;
  stops: RouteStop[];
  selectedAlternativeId: string;
  polyline: string;
  summary: RouteSummary;
  weatherSnapshot?: WeatherSnapshot;
  riskSnapshot?: RideScore;
  createdAt: string;
  updatedAt: string;
};
```

### Criterios de aceptación

- Guardar ruta.
- Cargar ruta.
- Duplicar ruta.
- Editar título.
- Borrar ruta.
- Recalcular ruta con nueva hora de salida.

---

## 3.2 Compartir ruta pública

Crear enlace público:

```txt
/r/:shareId
```

Debe mostrar:

- mapa
- resumen
- hora de salida
- llegada
- distancia
- RideScore
- alertas principales
- timeline
- botón "usar esta ruta"

### Criterios de aceptación

- El enlace funciona sin login.
- No expone datos privados.
- El usuario puede revocar enlace.
- El enlace no contiene payload gigante en querystring.

---

## 3.3 Tarjeta compartible

Crear imagen o preview social:

- título
- distancia
- duración
- score
- mejor hora
- alerta principal
- mini mapa o gradiente climático

Esto puede hacerse más adelante con endpoint que genere imagen OG.

---

# Fase 4 — Social ligero

Objetivo: comunidad útil, no red social vacía.

## 4.1 Rutas públicas

Los usuarios pueden publicar rutas.

Campos:

- título
- descripción
- zona
- dificultad
- tipo de moto recomendado
- duración
- distancia
- mejor época
- etiquetas
- puntos de interés
- advertencias

### Criterios de aceptación

- Listado de rutas públicas.
- Filtro por zona.
- Filtro por distancia.
- Filtro por dificultad.
- Guardar/favorito.
- Copiar ruta a mis rutas.

---

## 4.2 Reportes por tramo

Reportes comunitarios geolocalizados:

```txt
rain_now
wet_road
fog
gravel
roadworks
accident
closed_road
bad_asphalt
animals
nice_viewpoint
good_stop
```

Cada reporte caduca según tipo.

### Criterios de aceptación

- Crear reporte en punto de ruta.
- Ver reportes cercanos.
- Confirmar reporte.
- Ocultar reportes caducados.
- Moderación básica.

---

## 4.3 Grupos privados

Crear salidas compartidas:

- ruta
- fecha/hora
- participantes
- punto de encuentro
- paradas
- comentarios
- confirmación asistencia

### Criterios de aceptación

- Crear grupo de ruta.
- Invitar por enlace.
- Confirmar asistencia.
- Ver versión compartida de ruta.
- Preparado para ubicación en tiempo real futura.

---

## 4.4 Clubs moteros

Más adelante:

- página de club
- calendario de salidas
- rutas privadas
- miembros
- roles
- histórico de rutas

Monetización posible para clubes.

---

# Fase 5 — Preparación React Native

Objetivo: que la web esté preparada para móvil nativo sin rehacer el producto.

## 5.1 Extraer dominio compartible

Mover lógica reusable a paquete común:

```txt
packages/
  domain/
  api-client/
```

Lógica a compartir:

- tipos de ruta
- RideScore
- ETA
- scoring
- recomendaciones
- validaciones
- formateadores

## 5.2 API estable

Antes de React Native, estabilizar:

- contrato de `/api/route`
- contrato de `/api/weather`
- contrato de rutas guardadas
- contrato de share
- auth

## 5.3 Auth

Opciones:

- email magic link
- Google login
- Apple login para móvil
- cuentas anónimas promocionables a cuenta real

Para MVP móvil, lo más razonable:

```txt
usuario anónimo -> guarda rutas localmente
login opcional -> sincroniza
```

---

# Fase 6 — React Native

Objetivo: llevar valor móvil real, no copiar la web en pequeño.

## 6.1 Funciones nativas iniciales

- abrir ruta compartida
- ver mapa
- consultar previsión
- guardar ruta
- recibir notificaciones
- consultar ruta offline parcial

## 6.2 Modo ruta activa

- ubicación actual
- tramo actual
- próxima alerta
- ETA actualizada
- botón "reportar"
- botón "he llegado"
- compartir posición con grupo

## 6.3 Notificaciones

- lluvia próxima
- viento lateral próximo
- parada recomendada
- salida recomendada
- cambio relevante de previsión

---

# Fase 7 — Monetización

## Freemium

Gratis:

- importar ruta
- previsión básica
- una ruta guardada
- compartir enlace básico

Premium:

- rutas ilimitadas
- mejor hora de salida
- RideScore avanzado
- alertas por tramo
- GPX
- grupos
- historial
- plan B
- equipación recomendada

## Clubs

Plan club:

- calendario
- rutas privadas
- miembros
- reportes internos
- enlace de salida
- página pública

## Afiliación

Más adelante:

- equipación
- soportes móvil
- intercomunicadores
- neumáticos
- seguros
- hoteles moteros

---

# Prioridad recomendada real

Si el objetivo es mejorar antes de React Native, el orden debería ser:

1. Geocoding/Places.
2. Caché y rate limiting.
3. Validación de endpoints.
4. RideScore.
5. Alertas por tramo.
6. Mejor hora de salida.
7. Guardar rutas.
8. Compartir rutas.
9. Exportar GPX.
10. Rutas públicas.
11. Reportes comunitarios.
12. Grupos privados.
13. Preparar paquetes compartidos.
14. React Native.

No metería React Native antes de tener rutas guardadas, sharing y scoring. Si no, solo tendrás la misma app en una pantalla más pequeña y más difícil de depurar. Puro deporte de riesgo, pero sin la parte divertida.

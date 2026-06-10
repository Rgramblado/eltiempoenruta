# 09 — Flujos UX

## Flujo principal

```txt
1. Usuario pega URL de Google Maps
2. App expande y parsea
3. App muestra origen/destino/paradas detectadas
4. Usuario confirma preferencias:
   - evitar autovías
   - evitar peajes
   - evitar ferris
   - tipo de ruta
5. App calcula alternativas
6. Usuario compara:
   - rápida
   - motera
   - segura
7. Usuario elige ruta
8. Usuario define hora de salida y paradas
9. App calcula weather timeline
10. App muestra:
   - mapa coloreado
   - resumen
   - RideScore
   - alertas
   - timeline
   - mejor hora alternativa
11. Usuario guarda o comparte
```

## Pantalla resumen

Debe responder arriba del todo:

- ¿Ruta recomendable?
- ¿Cuál es el peor tramo?
- ¿Conviene salir a otra hora?
- ¿Qué equipación llevo?

Ejemplo:

```txt
Ruta recomendable: Sí, con precaución.
Score: 78/100
Peor tramo: km 82-110, viento lateral moderado.
Mejor salida: 09:00 en vez de 10:00.
Equipación: impermeable ligero y guantes de media temporada.
```

## Timeline

Cada tramo:

- hora estimada
- km
- temperatura
- sensación térmica
- lluvia
- viento
- condición
- riesgo

## Mapa

Colores por:

- temperatura aparente
- lluvia
- riesgo
- viento

Selector de capa:

```txt
Temperatura | Lluvia | Viento | Riesgo
```

## Compartir

Opciones:

- copiar enlace
- WhatsApp
- Telegram
- descargar GPX
- duplicar ruta

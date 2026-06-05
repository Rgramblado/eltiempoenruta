# 🏍️ El Tiempo en Ruta

Previsión meteorológica espacio-temporal para motoristas. Pega una ruta de Google Maps, indica la hora de salida, y obtén el tiempo que te espera en cada punto de la ruta **a la hora exacta en que llegarás**.

## ¿Por qué?

Mirar el tiempo ahora no sirve si llevas 3 horas de viaje. Este proyecto calcula dónde estarás en cada momento y consulta la previsión para ese punto y esa hora.

## Features

- ✅ Acepta URLs cortas y largas de Google Maps
- ✅ Ruta real calculada por OSRM (no línea recta)
- ✅ Duración por tramo según tipo de vía (autovía / nacional / pueblo)
- ✅ Paradas configurables con recálculo de ETAs
- ✅ Temperatura aparente (sensación térmica en moto)
- ✅ Probabilidad de lluvia, precipitación, viento
- ✅ Mapa oscuro con ruta coloreada por temperatura
- ✅ Timeline horizontal con alertas por tramo

## Stack

- **Frontend**: React + Vite
- **Routing**: OSRM (gratuito, sin API key)
- **Meteo**: Open-Meteo (gratuito, sin API key)
- **Geocodificación**: Nominatim (OSM)
- **Mapa**: Leaflet.js + CartoDB Dark
- **Deploy**: Vercel (serverless function para expandir URLs cortas)

## Desarrollo

```bash
npm install
npm run dev
```

## Deploy

```bash
npx vercel --prod
```

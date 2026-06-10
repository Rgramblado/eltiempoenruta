import { getGoogleKey } from '../config/index.js';
import { weatherCache } from '../services/cacheService.js';

// Granularidad de la caché: ~1 km. Puntos más cercanos comparten previsión.
const CACHE_COORD_DECIMALS = 2;
// Las horas se agrupan en bloques para que ETAs distintos reutilicen el mismo forecast.
const HOURS_BUCKET = 24;
const MAX_FORECAST_HOURS = 240;

export async function fetchGoogleWeatherForPoint(point) {
  const etaMs = new Date(point.eta).getTime();
  const forecastHours = await getHourlyForecast(point.lat, point.lng, etaMs);
  if (!forecastHours.length) return null;
  const closest = pickClosestHour(forecastHours, etaMs);
  return normalizeGoogleWeather(point, closest, etaMs);
}

async function getHourlyForecast(lat, lng, etaMs) {
  const neededHours = Math.max(1, Math.min(MAX_FORECAST_HOURS, Math.ceil((etaMs - Date.now()) / 3600000) + 2));
  const bucketHours = Math.min(MAX_FORECAST_HOURS, Math.ceil(neededHours / HOURS_BUCKET) * HOURS_BUCKET);
  const cacheKey = `wx:${Number(lat).toFixed(CACHE_COORD_DECIMALS)}:${Number(lng).toFixed(CACHE_COORD_DECIMALS)}:${bucketHours}`;
  return weatherCache.wrap(cacheKey, () => fetchHourlyForecast(lat, lng, bucketHours));
}

async function fetchHourlyForecast(lat, lng, hours) {
  const key = getGoogleKey();
  const url = new URL('https://weather.googleapis.com/v1/forecast/hours:lookup');
  url.searchParams.set('key', key);
  url.searchParams.set('location.latitude', Number(lat).toFixed(5));
  url.searchParams.set('location.longitude', Number(lng).toFixed(5));
  url.searchParams.set('hours', String(hours));
  url.searchParams.set('pageSize', String(Math.min(hours, 24)));
  url.searchParams.set('languageCode', 'es');

  const forecastHours = [];
  let pageToken = '';
  for (let page = 0; page < 10; page++) {
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error?.message || 'Google Weather no respondió correctamente.');
      error.statusCode = response.status;
      throw error;
    }
    forecastHours.push(...(data.forecastHours || []));
    pageToken = data.nextPageToken || '';
    if (!pageToken || forecastHours.length >= hours) break;
  }

  return forecastHours;
}

function pickClosestHour(forecastHours, etaMs) {
  return forecastHours.reduce((best, item) => {
    const diff = Math.abs(new Date(item.interval?.startTime).getTime() - etaMs);
    return !best || diff < best.diff ? { item, diff } : best;
  }, null).item;
}

function normalizeGoogleWeather(point, forecast, etaMs) {
  const precip = forecast.precipitation || {};
  const wind = forecast.wind || {};

  return {
    lat: point.lat,
    lng: point.lng,
    temp: forecast.temperature?.degrees ?? null,
    apparentTemp: forecast.feelsLikeTemperature?.degrees ?? forecast.windChill?.degrees ?? forecast.heatIndex?.degrees ?? null,
    precipProb: precip.probability?.percent ?? 0,
    precip: precip.qpf?.quantity ?? 0,
    precipType: precip.probability?.type || '',
    weatherCode: forecast.weatherCondition?.type || 'UNKNOWN',
    weatherLabel: forecast.weatherCondition?.description?.text || 'Sin datos',
    weatherIcon: forecast.weatherCondition?.iconBaseUri || '',
    windspeed: wind.speed?.value ?? 0,
    windGust: wind.gust?.value ?? null,
    windDirection: wind.direction?.degrees ?? null,
    cloudCover: forecast.cloudCover ?? null,
    humidity: forecast.relativeHumidity ?? null,
    time: forecast.interval?.startTime || null,
    confidence: confidenceForEta(etaMs),
  };
}

function confidenceForEta(etaMs) {
  const hours = Math.max(0, (etaMs - Date.now()) / 3600000);
  if (hours <= 12) return 'alta';
  if (hours <= 48) return 'media';
  return 'variable';
}

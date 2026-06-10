import { fetchGoogleWeatherForPoint } from '../providers/googleWeatherProvider.js';
import { calculateRideScore } from '../domain/risk/rideScore.js';
import { recommendGear } from '../domain/gear/gearRecommendations.js';
import { bearingDegrees } from '../domain/geo/bearing.js';
import { isNightAt } from '../domain/sun/isNight.js';

export async function getWeatherForPoints(points) {
  if (!Array.isArray(points) || !points.length) {
    const error = new Error('No hay puntos meteorológicos que consultar.');
    error.statusCode = 400;
    throw error;
  }

  return Promise.all(points.map(point => fetchGoogleWeatherForPoint(point)));
}

/**
 * Weather por punto + análisis de ruta (RideScore y equipación recomendada).
 * Los puntos deben venir ordenados por distancia, con eta (ISO) y distanceFromStart (m).
 */
export async function analyzeWeatherForPoints(points, riderProfile = {}) {
  const weather = await getWeatherForPoints(points);
  const segments = buildSegments(points, weather);
  const rideScore = segments.length ? calculateRideScore({ segments, riderProfile }) : null;
  const gear = recommendGear({
    conditions: weather,
    hasNightSegment: segments.some(segment => segment.isNight),
  });

  return { weather, rideScore, gear };
}

function buildSegments(points, weather) {
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    const pointWeather = weather[i];
    if (!pointWeather) continue;

    const fromMs = new Date(from.eta).getTime();
    const toMs = new Date(to.eta).getTime();
    const fromKm = numberOr(from.distanceFromStart, i * 15000) / 1000;
    const toKm = numberOr(to.distanceFromStart, (i + 1) * 15000) / 1000;

    segments.push({
      index: i,
      fromKm,
      toKm,
      eta: from.eta,
      durationMinutes: Math.max(1, (toMs - fromMs) / 60000),
      bearingDegrees: bearingDegrees(from, to),
      isNight: isNightAt(from.lat, from.lng, new Date(fromMs)),
      confidence: pointWeather.confidence,
      weather: pointWeather,
    });
  }
  return segments;
}

function numberOr(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

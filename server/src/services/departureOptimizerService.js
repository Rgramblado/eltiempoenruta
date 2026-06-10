import { analyzeWeatherForPoints } from './weatherService.js';

const DEFAULT_OFFSETS = [-120, -60, -30, 0, 30, 60, 120, 180];
const MAX_OPTIONS = 12;
const MAX_OFFSET_MINUTES = 12 * 60;
// Diferencia mínima de score para recomendar cambiar la hora de salida.
const MIN_SCORE_GAIN = 4;

/**
 * Compara horas de salida alternativas desplazando los ETA de los puntos
 * muestreados. Gracias a la caché de forecast por coordenada, los offsets
 * adicionales apenas generan llamadas extra a la API de weather.
 */
export async function computeDepartureOptions({ points, offsetsMinutes, riderProfile } = {}) {
  if (!Array.isArray(points) || points.length < 2) {
    const error = new Error('Se necesitan al menos dos puntos muestreados de la ruta.');
    error.statusCode = 400;
    throw error;
  }

  const offsets = sanitizeOffsets(offsetsMinutes);
  const firstEtaMs = new Date(points[0].eta).getTime();
  if (!Number.isFinite(firstEtaMs)) {
    const error = new Error('Los puntos deben incluir un ETA válido.');
    error.statusCode = 400;
    throw error;
  }

  const now = Date.now();
  const viableOffsets = offsets.filter(offset => firstEtaMs + offset * 60000 > now - 5 * 60000);

  const options = [];
  for (const offset of viableOffsets) {
    const shifted = points.map(point => ({
      ...point,
      eta: new Date(new Date(point.eta).getTime() + offset * 60000).toISOString(),
    }));

    try {
      const { rideScore } = await analyzeWeatherForPoints(shifted, riderProfile);
      if (!rideScore) continue;
      options.push({
        offsetMinutes: offset,
        departureEta: shifted[0].eta,
        arrivalTime: shifted[shifted.length - 1].eta,
        score: rideScore.score,
        level: rideScore.level,
        mainReasons: (rideScore.mainReasons || []).slice(0, 2),
        rainMinutes: computeRainMinutes(rideScore.segments),
      });
    } catch {
      // Un offset que falla (p. ej. fuera del horizonte de forecast) no debe tumbar el resto.
    }
  }

  if (!options.length) {
    const error = new Error('No pude evaluar ninguna hora de salida alternativa.');
    error.statusCode = 502;
    throw error;
  }

  return buildRecommendation(options);
}

export function sanitizeOffsets(offsetsMinutes) {
  const requested = Array.isArray(offsetsMinutes) && offsetsMinutes.length
    ? offsetsMinutes.map(Number).filter(value => Number.isFinite(value) && Math.abs(value) <= MAX_OFFSET_MINUTES)
    : DEFAULT_OFFSETS;
  const unique = [...new Set([0, ...requested])];
  return unique.sort((a, b) => a - b).slice(0, MAX_OPTIONS);
}

export function computeRainMinutes(segments = []) {
  return Math.round(segments.reduce((sum, segment) => {
    const probability = segment.weather?.precipitationProbability ?? 0;
    const mm = segment.weather?.precipitationMm ?? 0;
    const rainy = probability >= 50 || mm >= 0.3;
    return rainy ? sum + (segment.weight || 0) : sum;
  }, 0));
}

export function buildRecommendation(options) {
  const base = options.find(option => option.offsetMinutes === 0);
  const best = options.reduce((currentBest, option) => {
    if (option.score > currentBest.score) return option;
    if (option.score === currentBest.score && Math.abs(option.offsetMinutes) < Math.abs(currentBest.offsetMinutes)) return option;
    return currentBest;
  }, options[0]);

  if (!base) {
    // La hora original ya quedó atrás: solo podemos proponer alternativas futuras.
    return finishRecommendation(options, best, 'Tu hora de salida original ya ha pasado. Esta es la mejor alternativa viable.');
  }

  const worthChanging = best.offsetMinutes !== base.offsetMinutes && best.score - base.score >= MIN_SCORE_GAIN;
  const recommended = worthChanging ? best : base;

  let recommendation;
  if (!worthChanging) {
    recommendation = 'Tu hora de salida actual es la mejor opción.';
  } else {
    const gain = best.score - base.score;
    const rainDiff = base.rainMinutes - best.rainMinutes;
    recommendation = `Saliendo ${formatOffset(best.offsetMinutes)} ganas ${gain} puntos de RideScore`;
    if (rainDiff >= 10) recommendation += ` y evitas ~${rainDiff} min de lluvia`;
    recommendation += '.';
  }

  return finishRecommendation(options, recommended, recommendation);
}

function finishRecommendation(options, recommended, recommendation) {
  return {
    recommendedOffsetMinutes: recommended.offsetMinutes,
    recommendation,
    options: options.map(option => ({
      ...option,
      recommended: option.offsetMinutes === recommended.offsetMinutes,
    })),
  };
}

function formatOffset(minutes) {
  const absolute = Math.abs(minutes);
  const text = absolute >= 60
    ? (absolute % 60 === 0 ? `${absolute / 60}h` : `${Math.floor(absolute / 60)}h ${absolute % 60}min`)
    : `${absolute} min`;
  return minutes < 0 ? `${text} antes` : `${text} después`;
}

const DEFAULT_THRESHOLDS = {
  rainProbabilityCaution: 40,
  rainProbabilityHigh: 60,
  rainProbabilitySevere: 80,
  precipitationCautionMm: 0.3,
  precipitationHighMm: 1,
  precipitationSevereMm: 3,
  apparentColdC: 8,
  apparentVeryColdC: 4,
  windCautionKmh: 30,
  windHighKmh: 45,
  windSevereKmh: 65,
  gustCautionKmh: 45,
  gustHighKmh: 60,
  gustSevereKmh: 80,
  crosswindCautionKmh: 20,
  crosswindHighKmh: 30,
  crosswindSevereKmh: 45,
};

const RISK_LEVELS = {
  excellent: { min: 90, label: 'excellent' },
  good: { min: 75, label: 'good' },
  caution: { min: 55, label: 'caution' },
  bad: { min: 35, label: 'bad' },
  avoid: { min: 0, label: 'avoid' },
};

export function calculateRideScore(input = {}) {
  const segments = Array.isArray(input.segments) ? input.segments : [];
  if (!segments.length) {
    return {
      score: 0,
      level: 'avoid',
      mainReasons: ['No hay segmentos meteorológicos para evaluar.'],
      worstSegments: [],
      confidence: 'low',
      segments: [],
    };
  }

  const context = {
    thresholds: { ...DEFAULT_THRESHOLDS, ...(input.thresholds || {}) },
    riderProfile: normalizeRiderProfile(input.riderProfile),
    bikeProfile: input.bikeProfile || {},
    ridesWithPassenger: Boolean(input.ridesWithPassenger || input.riderProfile?.ridesWithPassenger),
  };

  const segmentRisks = segments.map((segment, index) => calculateSegmentRisk(segment, context, index));
  const weightedAverage = weightedScore(segmentRisks);
  const worst = segmentRisks.reduce((currentWorst, segment) => (
    segment.score < currentWorst.score ? segment : currentWorst
  ), segmentRisks[0]);
  const routeScore = clamp(Math.round(weightedAverage - worstSegmentPenalty(worst)), 0, 100);
  const worstSegments = [...segmentRisks]
    .sort((a, b) => a.score - b.score)
    .slice(0, Math.min(3, segmentRisks.length));

  return {
    score: routeScore,
    level: scoreToLevel(routeScore),
    mainReasons: buildMainReasons(segmentRisks, routeScore),
    worstSegments,
    confidence: aggregateConfidence(segmentRisks),
    segments: segmentRisks,
  };
}

export function calculateSegmentRisk(segment, context = {}, index = 0) {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(context.thresholds || {}) };
  const riderProfile = normalizeRiderProfile(context.riderProfile);
  const normalized = normalizeSegment(segment, index);
  const penalties = [];

  addRainPenalty(penalties, normalized, thresholds, riderProfile);
  addColdPenalty(penalties, normalized, thresholds, riderProfile);
  addWindPenalty(penalties, normalized, thresholds, context);
  addConditionPenalty(penalties, normalized);
  addNightPenalty(penalties, normalized);
  addConfidencePenalty(penalties, normalized);

  const penalty = penalties.reduce((sum, item) => sum + item.points, 0);
  const score = clamp(Math.round(100 - penalty), 0, 100);

  return {
    index,
    fromKm: normalized.fromKm,
    toKm: normalized.toKm,
    eta: normalized.eta,
    score,
    level: scoreToLevel(score),
    reasons: penalties.map(item => item.reason),
    penalty,
    weather: normalized.weather,
    confidence: normalized.confidence,
    weight: normalized.weight,
  };
}

export function calculateCrosswindKmh(windKmh, windDirectionDegrees, bearingDegrees) {
  if (!isFiniteNumber(windKmh) || !isFiniteNumber(windDirectionDegrees) || !isFiniteNumber(bearingDegrees)) return null;
  const diff = Math.abs(normalizeAngle(windDirectionDegrees - bearingDegrees));
  return Math.abs(windKmh * Math.sin(toRadians(diff)));
}

export function scoreToLevel(score) {
  const safeScore = clamp(Math.round(score), 0, 100);
  if (safeScore >= RISK_LEVELS.excellent.min) return RISK_LEVELS.excellent.label;
  if (safeScore >= RISK_LEVELS.good.min) return RISK_LEVELS.good.label;
  if (safeScore >= RISK_LEVELS.caution.min) return RISK_LEVELS.caution.label;
  if (safeScore >= RISK_LEVELS.bad.min) return RISK_LEVELS.bad.label;
  return RISK_LEVELS.avoid.label;
}

function normalizeSegment(segment, index) {
  const weather = segment.weather || segment;
  const fromKm = numberOr(segment.fromKm, numberOr(segment.distanceFromStart, index * 10) / (segment.distanceFromStart ? 1000 : 1));
  const toKm = numberOr(segment.toKm, fromKm + numberOr(segment.lengthKm, 10));
  const windKmh = firstNumber(weather.windKmh, weather.windspeed, weather.windSpeedKmh, weather.windSpeed);
  const windDirectionDegrees = firstNumber(weather.windDirectionDegrees, weather.windDirection);
  const bearingDegrees = firstNumber(segment.bearingDegrees, segment.bearing);
  const explicitCrosswind = firstNumber(segment.crosswindKmh, weather.crosswindKmh);
  const calculatedCrosswind = calculateCrosswindKmh(windKmh, windDirectionDegrees, bearingDegrees);

  return {
    fromKm,
    toKm,
    eta: segment.eta || null,
    isNight: Boolean(segment.isNight || weather.isNight),
    weight: Math.max(1, numberOr(segment.durationMinutes, numberOr(segment.lengthKm, Math.max(1, toKm - fromKm)))),
    confidence: normalizeConfidence(weather.confidence || segment.confidence),
    weather: {
      apparentTemperatureC: firstNumber(weather.apparentTemperatureC, weather.apparentTemp, weather.feelsLikeC, weather.temp),
      precipitationProbability: firstNumber(weather.precipitationProbability, weather.precipProb, weather.rainProbability, 0),
      precipitationMm: firstNumber(weather.precipitationMm, weather.precip, weather.rainMm, 0),
      windKmh,
      windGustKmh: firstNumber(weather.windGustKmh, weather.windGust, weather.gustKmh, weather.gust),
      crosswindKmh: explicitCrosswind ?? calculatedCrosswind,
      condition: String(weather.condition || weather.weatherCode || weather.weatherLabel || '').toLowerCase(),
    },
  };
}

function normalizeRiderProfile(profile = {}) {
  return {
    rainTolerance: profile.rainTolerance || 'medium',
    coldTolerance: profile.coldTolerance || 'medium',
    experience: profile.experience || 'normal',
    bikeType: profile.bikeType || 'naked',
    ridesWithPassenger: Boolean(profile.ridesWithPassenger),
  };
}

function addRainPenalty(penalties, segment, thresholds, riderProfile) {
  const probability = segment.weather.precipitationProbability;
  const mm = segment.weather.precipitationMm;
  const toleranceMultiplier = toleranceMultiplierFor(riderProfile.rainTolerance);

  if (probability >= thresholds.rainProbabilitySevere) {
    penalties.push({ points: 24 * toleranceMultiplier, reason: `Probabilidad de lluvia muy alta (${Math.round(probability)}%).` });
  } else if (probability >= thresholds.rainProbabilityHigh) {
    penalties.push({ points: 16 * toleranceMultiplier, reason: `Lluvia probable (${Math.round(probability)}%).` });
  } else if (probability >= thresholds.rainProbabilityCaution) {
    penalties.push({ points: 8 * toleranceMultiplier, reason: `Posible lluvia (${Math.round(probability)}%).` });
  }

  if (mm >= thresholds.precipitationSevereMm) {
    penalties.push({ points: 26 * toleranceMultiplier, reason: `Precipitación intensa (${formatNumber(mm)} mm/h).` });
  } else if (mm >= thresholds.precipitationHighMm) {
    penalties.push({ points: 16 * toleranceMultiplier, reason: `Precipitación relevante (${formatNumber(mm)} mm/h).` });
  } else if (mm >= thresholds.precipitationCautionMm) {
    penalties.push({ points: 7 * toleranceMultiplier, reason: `Asfalto potencialmente húmedo (${formatNumber(mm)} mm/h).` });
  }
}

function addColdPenalty(penalties, segment, thresholds, riderProfile) {
  const temp = segment.weather.apparentTemperatureC;
  if (!isFiniteNumber(temp)) return;
  const toleranceMultiplier = toleranceMultiplierFor(riderProfile.coldTolerance);

  if (temp <= thresholds.apparentVeryColdC) {
    penalties.push({ points: 22 * toleranceMultiplier, reason: `Sensación térmica muy fría (${Math.round(temp)}°C).` });
  } else if (temp < thresholds.apparentColdC) {
    penalties.push({ points: 14 * toleranceMultiplier, reason: `Sensación térmica fría (${Math.round(temp)}°C).` });
  }
}

function addWindPenalty(penalties, segment, thresholds, context) {
  const wind = segment.weather.windKmh;
  const gust = segment.weather.windGustKmh;
  const crosswind = segment.weather.crosswindKmh;
  const passengerMultiplier = context.ridesWithPassenger ? 1.12 : 1;

  if (wind >= thresholds.windSevereKmh) {
    penalties.push({ points: 24 * passengerMultiplier, reason: `Viento fuerte (${Math.round(wind)} km/h).` });
  } else if (wind >= thresholds.windHighKmh) {
    penalties.push({ points: 15 * passengerMultiplier, reason: `Viento alto (${Math.round(wind)} km/h).` });
  } else if (wind >= thresholds.windCautionKmh) {
    penalties.push({ points: 7 * passengerMultiplier, reason: `Viento moderado (${Math.round(wind)} km/h).` });
  }

  if (gust >= thresholds.gustSevereKmh) {
    penalties.push({ points: 22 * passengerMultiplier, reason: `Rachas muy fuertes (${Math.round(gust)} km/h).` });
  } else if (gust >= thresholds.gustHighKmh) {
    penalties.push({ points: 14 * passengerMultiplier, reason: `Rachas fuertes (${Math.round(gust)} km/h).` });
  } else if (gust >= thresholds.gustCautionKmh) {
    penalties.push({ points: 7 * passengerMultiplier, reason: `Rachas moderadas (${Math.round(gust)} km/h).` });
  }

  if (crosswind >= thresholds.crosswindSevereKmh) {
    penalties.push({ points: 28 * passengerMultiplier, reason: `Viento lateral peligroso (${Math.round(crosswind)} km/h).` });
  } else if (crosswind >= thresholds.crosswindHighKmh) {
    penalties.push({ points: 18 * passengerMultiplier, reason: `Viento lateral fuerte (${Math.round(crosswind)} km/h).` });
  } else if (crosswind >= thresholds.crosswindCautionKmh) {
    penalties.push({ points: 9 * passengerMultiplier, reason: `Viento lateral moderado (${Math.round(crosswind)} km/h).` });
  }
}

function addConditionPenalty(penalties, segment) {
  const condition = segment.weather.condition;
  if (!condition) return;

  if (condition.includes('thunder') || condition.includes('storm') || condition.includes('tormenta')) {
    penalties.push({ points: 35, reason: 'Riesgo de tormenta.' });
  }
  if (condition.includes('fog') || condition.includes('niebla')) {
    penalties.push({ points: 18, reason: 'Niebla o visibilidad reducida.' });
  }
  if (condition.includes('snow') || condition.includes('nieve') || condition.includes('hail') || condition.includes('granizo')) {
    penalties.push({ points: 35, reason: 'Condición invernal peligrosa.' });
  }
  if (condition.includes('heavy_rain') || condition.includes('lluvia intensa')) {
    penalties.push({ points: 18, reason: 'Condición de lluvia intensa.' });
  }
}

function addNightPenalty(penalties, segment) {
  if (segment.isNight) {
    penalties.push({ points: 8, reason: 'Tramo nocturno.' });
  }
}

function addConfidencePenalty(penalties, segment) {
  if (segment.confidence === 'low') {
    penalties.push({ points: 8, reason: 'Previsión de baja confianza.' });
  } else if (segment.confidence === 'medium') {
    penalties.push({ points: 3, reason: 'Previsión de confianza media.' });
  }
}

function weightedScore(segmentRisks) {
  const totalWeight = segmentRisks.reduce((sum, segment) => sum + segment.weight, 0);
  return segmentRisks.reduce((sum, segment) => sum + segment.score * segment.weight, 0) / totalWeight;
}

function worstSegmentPenalty(worst) {
  if (worst.score < 35) return 14;
  if (worst.score < 55) return 9;
  if (worst.score < 75) return 4;
  return 0;
}

function buildMainReasons(segmentRisks, routeScore) {
  const reasons = new Map();
  for (const segment of segmentRisks) {
    for (const reason of segment.reasons) {
      const key = normalizeReasonKey(reason);
      const current = reasons.get(key) || { reason, count: 0, worstScore: 100 };
      current.count += 1;
      current.worstScore = Math.min(current.worstScore, segment.score);
      reasons.set(key, current);
    }
  }

  const mainReasons = [...reasons.values()]
    .sort((a, b) => (b.count - a.count) || (a.worstScore - b.worstScore))
    .slice(0, 4)
    .map(item => item.reason);

  if (!mainReasons.length) {
    return routeScore >= 90
      ? ['Condiciones favorables en toda la ruta.']
      : ['Riesgo bajo sin factores dominantes.'];
  }

  return mainReasons;
}

function aggregateConfidence(segmentRisks) {
  const low = segmentRisks.filter(segment => segment.confidence === 'low').length;
  const medium = segmentRisks.filter(segment => segment.confidence === 'medium').length;
  if (low / segmentRisks.length >= 0.25) return 'low';
  if ((low + medium) / segmentRisks.length >= 0.4) return 'medium';
  return 'high';
}

function normalizeConfidence(value) {
  const normalized = String(value || 'high').toLowerCase();
  if (['low', 'baja', 'variable'].includes(normalized)) return 'low';
  if (['medium', 'media'].includes(normalized)) return 'medium';
  return 'high';
}

function toleranceMultiplierFor(value) {
  if (value === 'low') return 1.18;
  if (value === 'high') return 0.85;
  return 1;
}

function normalizeReasonKey(reason) {
  return reason
    .replace(/\([^)]*\)/g, '')
    .replace(/\d+([.,]\d+)?/g, '')
    .trim()
    .toLowerCase();
}

function firstNumber(...values) {
  for (const value of values) {
    if (isFiniteNumber(value)) return Number(value);
  }
  return null;
}

function numberOr(value, fallback) {
  return isFiniteNumber(value) ? Number(value) : fallback;
}

function isFiniteNumber(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeAngle(angle) {
  return ((angle + 180) % 360 + 360) % 360 - 180;
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

function formatNumber(value) {
  return Number(value).toFixed(1).replace(/\.0$/, '');
}

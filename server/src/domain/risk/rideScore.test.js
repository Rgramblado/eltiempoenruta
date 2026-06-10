import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCrosswindKmh,
  calculateRideScore,
  calculateSegmentRisk,
  scoreToLevel,
} from './rideScore.js';

test('scores a dry comfortable route as excellent', () => {
  const result = calculateRideScore({
    segments: [
      segment({ precipitationProbability: 0, precipitationMm: 0, apparentTemperatureC: 19, windKmh: 10 }),
      segment({ precipitationProbability: 10, precipitationMm: 0, apparentTemperatureC: 22, windKmh: 12 }),
    ],
  });

  assert.equal(result.level, 'excellent');
  assert.ok(result.score >= 90);
  assert.deepEqual(result.mainReasons, ['Condiciones favorables en toda la ruta.']);
});

test('penalizes heavy rain and explains the reason', () => {
  const result = calculateRideScore({
    segments: [
      segment({ precipitationProbability: 85, precipitationMm: 4, apparentTemperatureC: 16, windKmh: 18, condition: 'heavy_rain' }),
      segment({ precipitationProbability: 75, precipitationMm: 2, apparentTemperatureC: 16, windKmh: 20 }),
    ],
  });

  assert.ok(result.score < 55);
  assert.match(result.mainReasons.join(' '), /lluvia|Precipitación|intensa/i);
  assert.equal(result.worstSegments[0].index, 0);
});

test('calculates and penalizes crosswind from wind direction and segment bearing', () => {
  const crosswind = calculateCrosswindKmh(50, 90, 0);
  assert.equal(Math.round(crosswind), 50);

  const risk = calculateSegmentRisk(segment({
    windKmh: 50,
    windDirectionDegrees: 90,
    bearingDegrees: 0,
    apparentTemperatureC: 18,
  }));

  assert.ok(risk.score <= 60);
  assert.match(risk.reasons.join(' '), /lateral/i);
});

test('penalizes cold apparent temperature', () => {
  const result = calculateRideScore({
    riderProfile: { coldTolerance: 'medium' },
    segments: [
      segment({ apparentTemperatureC: 3, windKmh: 15, precipitationProbability: 0 }),
      segment({ apparentTemperatureC: 6, windKmh: 12, precipitationProbability: 0 }),
    ],
  });

  assert.ok(result.score < 85);
  assert.match(result.mainReasons.join(' '), /fría|frío/i);
});

test('worst segment affects route score even when most route is good', () => {
  const result = calculateRideScore({
    segments: [
      segment({ apparentTemperatureC: 20, windKmh: 8, precipitationProbability: 0 }, { fromKm: 0, toKm: 40 }),
      segment({ apparentTemperatureC: 19, windKmh: 10, precipitationProbability: 5 }, { fromKm: 40, toKm: 80 }),
      segment({ apparentTemperatureC: 14, windKmh: 75, windGustKmh: 90, crosswindKmh: 55, precipitationProbability: 80, precipitationMm: 4 }, { fromKm: 80, toKm: 90 }),
    ],
  });

  assert.equal(result.worstSegments[0].index, 2);
  assert.ok(result.score < 85);
  assert.ok(['bad', 'avoid'].includes(result.worstSegments[0].level));
});

test('storm, fog, night and low confidence contribute explicit reasons', () => {
  const result = calculateRideScore({
    segments: [
      segment({ condition: 'thunderstorm', apparentTemperatureC: 12, windKmh: 20, confidence: 'low' }, { isNight: true }),
      segment({ condition: 'fog', apparentTemperatureC: 12, windKmh: 10, confidence: 'medium' }),
    ],
  });

  const reasons = result.mainReasons.join(' ');
  assert.match(reasons, /tormenta|Niebla|nocturno|confianza/i);
  assert.equal(result.confidence, 'low');
});

test('rider tolerance changes rain penalty', () => {
  const cautious = calculateRideScore({
    riderProfile: { rainTolerance: 'low' },
    segments: [segment({ precipitationProbability: 70, precipitationMm: 1.5, apparentTemperatureC: 17, windKmh: 15 })],
  });
  const tolerant = calculateRideScore({
    riderProfile: { rainTolerance: 'high' },
    segments: [segment({ precipitationProbability: 70, precipitationMm: 1.5, apparentTemperatureC: 17, windKmh: 15 })],
  });

  assert.ok(cautious.score < tolerant.score);
});

test('accepts current weather timeline field names', () => {
  const result = calculateRideScore({
    segments: [
      {
        fromKm: 20,
        toKm: 35,
        eta: '2026-06-10T12:00:00.000Z',
        bearingDegrees: 0,
        weather: {
          apparentTemp: 7,
          precipProb: 65,
          precip: 1.2,
          windspeed: 35,
          windGust: 52,
          windDirection: 90,
          weatherCode: 'RAIN',
          confidence: 'media',
        },
      },
    ],
  });

  assert.ok(result.score < 75);
  assert.equal(result.confidence, 'medium');
  assert.match(result.mainReasons.join(' '), /Lluvia|Precipitación|fría|Viento/i);
  assert.match(result.worstSegments[0].reasons.join(' '), /lateral/i);
});

test('empty input returns avoid with useful explanation', () => {
  const result = calculateRideScore({ segments: [] });

  assert.equal(result.score, 0);
  assert.equal(result.level, 'avoid');
  assert.match(result.mainReasons[0], /No hay segmentos/i);
});

test('scoreToLevel boundaries are stable', () => {
  assert.equal(scoreToLevel(95), 'excellent');
  assert.equal(scoreToLevel(80), 'good');
  assert.equal(scoreToLevel(60), 'caution');
  assert.equal(scoreToLevel(40), 'bad');
  assert.equal(scoreToLevel(20), 'avoid');
});

function segment(weather, overrides = {}) {
  return {
    fromKm: overrides.fromKm ?? 0,
    toKm: overrides.toKm ?? 10,
    eta: overrides.eta || '2026-06-10T10:00:00.000Z',
    isNight: overrides.isNight || false,
    bearingDegrees: weather.bearingDegrees,
    crosswindKmh: weather.crosswindKmh,
    weather: {
      apparentTemperatureC: weather.apparentTemperatureC ?? 20,
      precipitationProbability: weather.precipitationProbability ?? 0,
      precipitationMm: weather.precitationMm ?? weather.precipitationMm ?? 0,
      windKmh: weather.windKmh ?? 10,
      windGustKmh: weather.windGustKmh,
      windDirectionDegrees: weather.windDirectionDegrees,
      condition: weather.condition || 'clear',
      confidence: weather.confidence || 'high',
    },
  };
}

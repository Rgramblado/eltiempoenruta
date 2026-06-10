import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeOffsets, computeRainMinutes, buildRecommendation } from './departureOptimizerService.js';

function option(offsetMinutes, score, rainMinutes = 0) {
  return {
    offsetMinutes,
    departureEta: new Date(Date.UTC(2026, 5, 10, 8, 0) + offsetMinutes * 60000).toISOString(),
    arrivalTime: new Date(Date.UTC(2026, 5, 10, 12, 0) + offsetMinutes * 60000).toISOString(),
    score,
    level: 'good',
    mainReasons: [],
    rainMinutes,
  };
}

test('sanitizeOffsets usa los defaults e incluye siempre el 0', () => {
  const offsets = sanitizeOffsets(undefined);
  assert.ok(offsets.includes(0));
  assert.ok(offsets.includes(-120));
  assert.ok(offsets.includes(180));
});

test('sanitizeOffsets descarta valores absurdos y duplica', () => {
  const offsets = sanitizeOffsets([30, 30, 99999, NaN, -60]);
  assert.deepEqual(offsets, [-60, 0, 30]);
});

test('computeRainMinutes suma la duración de segmentos con lluvia', () => {
  const segments = [
    { weight: 20, weather: { precipitationProbability: 80, precipitationMm: 1 } },
    { weight: 15, weather: { precipitationProbability: 10, precipitationMm: 0 } },
    { weight: 10, weather: { precipitationProbability: 20, precipitationMm: 0.5 } },
  ];
  assert.equal(computeRainMinutes(segments), 30);
});

test('no recomienda cambiar por una mejora marginal', () => {
  const result = buildRecommendation([option(0, 80), option(60, 82)]);
  assert.equal(result.recommendedOffsetMinutes, 0);
  assert.match(result.recommendation, /actual es la mejor/);
});

test('recomienda cambiar cuando la mejora es clara', () => {
  const result = buildRecommendation([option(0, 60, 45), option(-60, 85, 5)]);
  assert.equal(result.recommendedOffsetMinutes, -60);
  assert.match(result.recommendation, /1h antes/);
  assert.match(result.recommendation, /min de lluvia/);
  assert.equal(result.options.find(o => o.offsetMinutes === -60).recommended, true);
});

test('sin offset 0 viable avisa de que la hora original pasó', () => {
  const result = buildRecommendation([option(120, 70), option(180, 90)]);
  assert.equal(result.recommendedOffsetMinutes, 180);
  assert.match(result.recommendation, /ya ha pasado/);
});
